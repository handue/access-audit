// Exercise URL restrictions, bounded input and the API boundary without private requests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { publicAddress, validateUrl, readLimited } from "../lib/safe-fetch";
import { POST } from "../app/api/audit/route";
test("only globally routable addresses are accepted", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.0.1",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "0.0.0.0",
    "224.0.0.1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("93.184.216.34"), true);
  assert.equal(publicAddress("2606:4700:4700::1111"), true);
});
test("rejects unsafe schemes, ports, credentials and local hosts", () => {
  for (const url of [
    "file:///etc/passwd",
    "http://localhost",
    "http://127.1",
    "http://[::1]",
    "https://user:pass@example.com",
    "http://example.com:8080",
    "http://a.local",
  ])
    assert.throws(() => validateUrl(url), Error, url);
  assert.equal(validateUrl("https://example.com").hostname, "example.com");
});
test("stream size is bounded", async () => {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(20));
      c.close();
    },
  });
  await assert.rejects(readLimited(stream, 10));
});
test("API rejects malformed inputs and cross-origin requests", async () => {
  const req = (body: string, origin?: string) =>
    new Request("http://localhost/api/audit", {
      method: "POST",
      headers: origin ? { origin } : {},
      body,
    });
  assert.equal((await POST(req("{"))).status, 400);
  assert.equal((await POST(req('{"mode":"html","html":""}'))).status, 400);
  assert.equal((await POST(req("{}", "https://evil.example"))).status, 403);
});
test("API returns a report without AI and does not execute scripts", async () => {
  const r = await POST(
    new Request("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({
        mode: "html",
        html: '<h1>Hello</h1><script>throw new Error("executed")</script><img src="x">',
      }),
    }),
  );
  const data = await r.json();
  assert.equal(r.status, 200);
  assert.equal(data.total, 1);
  assert.equal(data.aiStatus, "off");
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("API accepts same-host browser origin even when runtime URL is canonicalized", async () => {
  const r = await POST(
    new Request("http://localhost:3100/api/audit", {
      method: "POST",
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
      body: JSON.stringify({ mode: "html", html: "<h1>Hi</h1>" }),
    }),
  );
  assert.equal(r.status, 200);
  const invalid = await POST(
    new Request("http://localhost/api/audit", {
      method: "POST",
      headers: { origin: "null" },
      body: "{}",
    }),
  );
  assert.equal(invalid.status, 403);
});
