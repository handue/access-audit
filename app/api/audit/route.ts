import { z } from "zod";
import { audit } from "@/lib/audit";
import { explain } from "@/lib/explain";
import { fetchHtml, MAX_BYTES, readLimited } from "@/lib/safe-fetch";
export const runtime = "nodejs";
export const maxDuration = 45;
// Each mode has its own required field; the server never trusts the form state.
const input = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("html"),
    html: z.string().trim().min(1).max(MAX_BYTES),
    ai: z.boolean().default(false),
  }),
  z.object({
    mode: z.literal("url"),
    url: z.string().url().max(2048),
    ai: z.boolean().default(false),
  }),
]);
export async function POST(request: Request) {
  const start = Date.now();
  // Compare against Host because Next may canonicalize the internal request URL.
  const origin = request.headers.get("origin");
  if (
    origin &&
    (!URL.canParse(origin) ||
      !["http:", "https:"].includes(new URL(origin).protocol) ||
      new URL(origin).host !==
        (request.headers.get("host") || new URL(request.url).host))
  )
    return Response.json(
      { error: "Cross-origin requests are not supported." },
      { status: 403 },
    );
  try {
    // Bound the raw request before JSON parsing to avoid buffering arbitrary input.
    const raw = await readLimited(request.body, MAX_BYTES + 10_000);
    const parsed = input.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json(
        { error: "Enter HTML (up to 500 KB) or a valid public URL." },
        { status: 400 },
      );
    const value = parsed.data;
    const { html, source } =
      value.mode === "url"
        ? await fetchHtml(value.url)
        : { html: value.html, source: "Pasted HTML" };
    // Detection finishes first. Optional AI can enrich guidance but cannot add findings.
    const result = audit(html);
    const ai = await explain(result.findings, value.ai);
    // Reports may contain submitted page content, so do not cache them.
    return Response.json(
      {
        ...result,
        ...ai,
        source,
        timestamp: new Date().toISOString(),
        duration: Date.now() - start,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "Invalid JSON request."
        : error instanceof Error &&
            !/fetch failed|ENOTFOUND|ECONN|abort|timeout/i.test(error.message)
          ? error.message
          : "Could not fetch this page. Try pasting its HTML instead.";
    return Response.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
