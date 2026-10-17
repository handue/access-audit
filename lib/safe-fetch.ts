import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { Agent, fetch as request } from "undici";
export const MAX_BYTES = 500_000;
// ipaddr normalizes IPv4-mapped IPv6 before checking special-use ranges.
export function publicAddress(address: string) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}
// Validate both the initial target and every redirect destination.
export function validateUrl(raw: string) {
  const url = new URL(raw);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error("Use a public HTTP(S) URL on port 80 or 443.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    (ipaddr.isValid(host) && !publicAddress(host))
  )
    throw new Error("Private and local network URLs are not supported.");
  return url;
}
// Count streamed bytes instead of trusting an optional Content-Length header.
export async function readLimited(
  stream: ReadableStream<Uint8Array> | null,
  limit = MAX_BYTES,
) {
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit)
        throw new Error("Content is too large. Maximum size is 500 KB.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function fetchHtml(raw: string) {
  // Redirects share one timeout budget; each host must pass a fresh DNS check.
  let url = validateUrl(raw);
  const signal = AbortSignal.timeout(10_000);
  for (let hop = 0; hop < 4; hop++) {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await Promise.race([
      dns.lookup(host, { all: true }),
      new Promise<never>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new Error("URL request timed out.")),
          { once: true },
        );
        if (signal.aborted) reject(new Error("URL request timed out."));
      }),
    ]);
    // Reject mixed public/private answers rather than letting the client choose an IP.
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new Error("Private and local network URLs are not supported.");
    const selected = addresses[0];
    // Pin the verified IP at connection time to prevent DNS rebinding.
    const agent = new Agent({
      connect: {
        autoSelectFamily: false,
        lookup: (_hostname, _options, cb) =>
          cb(null, selected.address, selected.family),
      },
    });
    try {
      const response = await request(url, {
        dispatcher: agent,
        signal,
        redirect: "manual",
        headers: {
          "user-agent": "AccessAudit/1.0 (static accessibility review)",
          accept: "text/html",
        },
      });
      // Follow redirects manually so none can escape URL and DNS validation.
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect has no destination.");
        url = validateUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(
          `The page returned HTTP ${response.status}. Try pasting its HTML.`,
        );
      }
      if (
        !/text\/html|application\/xhtml\+xml/i.test(
          response.headers.get("content-type") || "",
        )
      ) {
        await response.body?.cancel();
        throw new Error("The URL must return an HTML page.");
      }
      const html = await readLimited(
        response.body as ReadableStream<Uint8Array>,
      );
      return { html, source: url.href };
    } finally {
      await agent.close();
    }
  }
  throw new Error("Too many redirects. Try the final page URL.");
}
