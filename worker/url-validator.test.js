import assert from "node:assert/strict";
import { allowedOrigin, corsHeaders, validateFeedUrl } from "./url-validator.js";

const prod = {
  ALLOWED_HOSTS: "umiami.instructure.com",
  ALLOWED_ORIGINS: "https://andrewtaplin.github.io",
  ALLOW_LOCALHOST: "false",
};

const dev = {
  ...prod,
  ALLOWED_HOSTS: "umiami.instructure.com,127.0.0.1,localhost",
  ALLOW_LOCALHOST: "true",
};

function ok(url, env, host) {
  const result = validateFeedUrl(url, env);
  assert.equal(result.ok, true, `${url} should be allowed: ${result.error}`);
  if (host) assert.equal(result.host, host);
}

function notOk(url, env, status) {
  const result = validateFeedUrl(url, env);
  assert.equal(result.ok, false, `${url} should be rejected`);
  if (status) assert.equal(result.status, status, `${url} status ${result.status}`);
  assert.ok(!JSON.stringify(result).includes("webcal://"));
}

ok("https://umiami.instructure.com/feeds/calendars/user_abc123.ics", prod, "umiami.instructure.com");
ok("https://umiami.instructure.com/feeds/calendars/user_abc123.ics?token=secret", prod, "umiami.instructure.com");
ok("https://UMIAMI.INSTRUCTURE.COM/feeds/calendars/User_ABC.ICS", prod, "umiami.instructure.com");

notOk("", prod, 400);
notOk("not a url", prod, 400);
notOk("http://umiami.instructure.com/feeds/calendars/user.ics", prod, 400);
notOk("ftp://umiami.instructure.com/feeds/calendars/user.ics", prod, 400);
notOk("https://evil.example/feeds/calendars/user.ics", prod, 403);
notOk("https://umiami.instructure.com.evil.com/feeds/calendars/user.ics", prod, 403);
notOk("https://umiami.instructure.com/calendar/user.ics", prod, 400);
notOk("https://umiami.instructure.com/feeds/calendars/user.txt", prod, 400);
notOk("https://umiami.instructure.com/feeds/calendars/.ics", prod, 400);
notOk("https://user:pass@umiami.instructure.com/feeds/calendars/user.ics", prod, 400);
notOk("https://umiami.instructure.com:8443/feeds/calendars/user.ics", prod, 403);
notOk("http://127.0.0.1:8787/feeds/calendars/sample.ics", prod, 403);

ok("http://127.0.0.1:8787/feeds/calendars/sample.ics", dev, "127.0.0.1");
ok("http://localhost:8787/feeds/calendars/sample.ics", dev, "localhost");
notOk("http://example.com/feeds/calendars/sample.ics", dev, 403);

assert.equal(allowedOrigin("https://andrewtaplin.github.io", prod), "https://andrewtaplin.github.io");
assert.equal(allowedOrigin("https://evil.example", prod), "");
assert.equal(allowedOrigin("http://localhost:8770", prod), "");
assert.equal(allowedOrigin("http://localhost:8770", dev), "http://localhost:8770");
assert.equal(allowedOrigin("http://127.0.0.1:8770", dev), "http://127.0.0.1:8770");
assert.equal(corsHeaders("https://andrewtaplin.github.io", prod)["Access-Control-Allow-Origin"], "https://andrewtaplin.github.io");
assert.equal(corsHeaders("http://evil.example", prod)["Access-Control-Allow-Origin"], undefined);

console.log("url-validator tests passed");
