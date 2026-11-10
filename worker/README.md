# Locked Canvas calendar relay

A small Cloudflare Worker that proxies University of Miami Canvas calendar feeds so the Locked website can sync them in the browser. Canvas feed links are private tokens, so the worker allowlists the host and path, caches the calendar for 15 minutes, and never logs the full URL (host only).

This Worker is **not deployed yet**. It needs Drew’s Cloudflare account.

## What it exposes

`GET /feed?url=<urlencoded Canvas .ics link>`

Allowed upstream URLs:

- `https` only (http is allowed for `localhost` / `127.0.0.1` when `ALLOW_LOCALHOST=true` in development)
- Host must be in `ALLOWED_HOSTS` (default `umiami.instructure.com`)
- Path must start with `/feeds/calendars/` and end with `.ics`

Successful responses are `text/calendar` with `Access-Control-Allow-Origin` limited to `https://andrewtaplin.github.io`. When `ALLOW_LOCALHOST=true`, `http://localhost:*` and `http://127.0.0.1:*` are also accepted. The worker times out after 10 seconds and rejects bodies larger than 5 MB.

## Deploy (Drew)

From this `worker/` directory, on a machine signed into Drew’s Cloudflare account:

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

`npx wrangler login` opens a browser to authorize the Wrangler CLI. After `npx wrangler deploy`, Wrangler prints the worker URL, for example:

`https://locked-canvas-relay.<subdomain>.workers.dev`

Then set that origin (no trailing slash) on the Locked site:

```js
// script.js
canvasRelayUrl: "https://locked-canvas-relay.<subdomain>.workers.dev",
```

Commit and push that one-line change so GitHub Pages can start live Canvas feed sync. Leave `ALLOW_LOCALHOST` as `"false"` in `wrangler.toml` for production.

Optional Wrangler vars (already set in `wrangler.toml`):

- `ALLOWED_HOSTS` — comma-separated hostnames
- `ALLOWED_ORIGINS` — exact origin for the live site
- `ALLOW_LOCALHOST` — `"true"` only while developing

## Local development

```bash
npm test
npx wrangler deploy --dry-run
npm run dev
```

`npm run dev` starts a Node shim of the same handler on `http://127.0.0.1:8787`, and also serves `sample.ics` at:

`http://127.0.0.1:8787/feeds/calendars/sample.ics`

In the browser console on a local Locked site you can temporarily point the app at this relay:

```js
window.__LOCKED_RELAY_OVERRIDE = "http://127.0.0.1:8787";
```

Then open Integrations and paste the sample feed URL.
