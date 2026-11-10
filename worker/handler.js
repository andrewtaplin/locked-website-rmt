import { corsHeaders, validateFeedUrl } from "./url-validator.js";

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_SECONDS = 15 * 60;

function jsonResponse(status, body, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin, env),
    },
  });
}

function safeHostLog(host) {
  return { host: host || "unknown" };
}

export async function handleRequest(request, env = {}, cachesImpl) {
  const origin = request.headers.get("Origin") || "";
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    const headers = corsHeaders(origin, env);
    if (!headers["Access-Control-Allow-Origin"] && origin) {
      return new Response("Origin is not allowed", { status: 403 });
    }
    return new Response(null, { status: 204, headers });
  }

  if (url.pathname !== "/feed") {
    return jsonResponse(404, { error: "Not found" }, origin, env);
  }

  if (request.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" }, origin, env);
  }

  const check = validateFeedUrl(url.searchParams.get("url"), env);
  if (!check.ok) {
    console.log("feed rejected", safeHostLog(check.host), check.status);
    return jsonResponse(check.status, { error: check.error }, origin, env);
  }

  const cors = corsHeaders(origin, env);
  if (origin && !cors["Access-Control-Allow-Origin"]) {
    console.log("feed origin rejected", safeHostLog(check.host));
    return new Response(JSON.stringify({ error: "Origin is not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const refresh = url.searchParams.get("refresh") === "1";
  const cache = cachesImpl && cachesImpl.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete("refresh");
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  if (cache && !refresh) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      console.log("feed cache hit", safeHostLog(check.host));
      const cached = new Response(hit.body, hit);
      Object.entries(cors).forEach(([key, value]) => cached.headers.set(key, value));
      cached.headers.set("X-Feed-Cache", "HIT");
      return cached;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let upstream;
  try {
    console.log("feed fetch", safeHostLog(check.host));
    upstream = await fetch(check.url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
  } catch (err) {
    const timedOut = err && (err.name === "AbortError" || err.name === "TimeoutError");
    console.log("feed upstream error", safeHostLog(check.host), timedOut ? "timeout" : "network");
    return jsonResponse(timedOut ? 504 : 502, { error: timedOut ? "Upstream timed out" : "Upstream request failed" }, origin, env);
  } finally {
    clearTimeout(timer);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    console.log("feed redirect blocked", safeHostLog(check.host), upstream.status);
    return jsonResponse(502, { error: "Upstream redirects are not followed" }, origin, env);
  }

  if (!upstream.ok) {
    console.log("feed upstream status", safeHostLog(check.host), upstream.status);
    return jsonResponse(502, { error: "Upstream returned an error" }, origin, env);
  }

  const declared = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    console.log("feed too large", safeHostLog(check.host));
    return jsonResponse(413, { error: "Calendar is larger than 5 MB" }, origin, env);
  }

  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    console.log("feed too large", safeHostLog(check.host));
    return jsonResponse(413, { error: "Calendar is larger than 5 MB" }, origin, env);
  }

  const headers = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
    "X-Feed-Cache": "MISS",
    ...cors,
  };
  const response = new Response(buffer, { status: 200, headers });
  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch (err) {
      console.log("feed cache write skipped", safeHostLog(check.host));
    }
  }
  return response;
}
