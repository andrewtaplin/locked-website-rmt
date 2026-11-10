const DEFAULT_HOSTS = "umiami.instructure.com";
const DEFAULT_ORIGINS = "https://andrewtaplin.github.io";

export function parseHostList(value) {
  return String(value || DEFAULT_HOSTS)
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/\.+$/, ""))
    .filter(Boolean);
}

export function isLocalHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.+$/, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function localAuthEnabled(env = {}) {
  const value = String(env.ALLOW_LOCALHOST || "").toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export function validateFeedUrl(rawUrl, env = {}) {
  if (rawUrl == null || String(rawUrl).trim() === "") {
    return { ok: false, status: 400, error: "Missing url parameter" };
  }

  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    return { ok: false, status: 400, error: "Invalid url" };
  }

  const host = String(parsed.hostname || "").toLowerCase().replace(/\.+$/, "");
  const hosts = parseHostList(env.ALLOWED_HOSTS);
  const local = isLocalHost(host);
  const allowLocal = localAuthEnabled(env);

  if (!hosts.includes(host)) {
    return { ok: false, status: 403, error: "Host is not allowed", host };
  }

  if (parsed.protocol === "https:") {
    if (parsed.port && parsed.port !== "443" && !(local && allowLocal)) {
      return { ok: false, status: 403, error: "Host is not allowed", host };
    }
  } else if (parsed.protocol === "http:" && local && allowLocal) {
    // Local development only.
  } else {
    return { ok: false, status: 400, error: "URL must use HTTPS", host };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, status: 400, error: "URL must not include credentials", host };
  }

  const path = parsed.pathname || "";
  if (!path.startsWith("/feeds/calendars/") || !path.toLowerCase().endsWith(".ics") || path.length <= "/feeds/calendars/".length + 4) {
    return { ok: false, status: 400, error: "Path must start with /feeds/calendars/ and end with .ics", host };
  }

  return { ok: true, url: parsed.toString(), host };
}

export function allowedOrigin(origin, env = {}) {
  if (!origin) return "";
  const list = String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (list.includes(origin)) return origin;
  if (localAuthEnabled(env) && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
    return origin;
  }
  return "";
}

export function corsHeaders(origin, env = {}) {
  const allow = allowedOrigin(origin, env);
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}
