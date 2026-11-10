import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleRequest } from "./handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const ICS_PATH = process.env.ICS_PATH || path.join(__dirname, "sample.ics");

const env = {
  ALLOWED_HOSTS: process.env.ALLOWED_HOSTS || "umiami.instructure.com,127.0.0.1,localhost",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "https://andrewtaplin.github.io",
  ALLOW_LOCALHOST: process.env.ALLOW_LOCALHOST || "true",
};

const memory = new Map();
const cachesImpl = {
  default: {
    async match(req) {
      const key = typeof req === "string" ? req : req.url;
      const entry = memory.get(key);
      if (!entry) return null;
      if (entry.expires < Date.now()) {
        memory.delete(key);
        return null;
      }
      return new Response(entry.body, { status: entry.status, headers: entry.headers });
    },
    async put(req, res) {
      const key = typeof req === "string" ? req : req.url;
      const body = await res.arrayBuffer();
      memory.set(key, {
        body,
        status: res.status,
        headers: res.headers,
        expires: Date.now() + 15 * 60 * 1000,
      });
    },
  },
};

function nodeToFetchRequest(req) {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  const url = `http://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return new Request(url, { method: req.method, headers });
}

async function writeNodeResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname === "/__flush-cache") {
      memory.clear();
      res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
      res.end("ok");
      return;
    }
    if (url.pathname.startsWith("/feeds/calendars/") && url.pathname.toLowerCase().endsWith(".ics")) {
      const body = fs.readFileSync(ICS_PATH);
      res.writeHead(200, {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(body);
      return;
    }
    const response = await handleRequest(nodeToFetchRequest(req), env, cachesImpl);
    await writeNodeResponse(res, response);
  } catch (err) {
    console.error("dev-server error", err && err.message);
    res.statusCode = 500;
    res.end("Internal error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`locked-canvas-relay dev server on http://127.0.0.1:${PORT}`);
  console.log(`sample feed http://127.0.0.1:${PORT}/feeds/calendars/sample.ics`);
});
