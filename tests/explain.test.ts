// Mock the provider to test schema and ID handling without paid API requests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { explain } from "../lib/explain";
import { audit } from "../lib/audit";
test("AI output validates ids, attaches explanations, and fails safely", async () => {
  const priorKey = process.env.OPENAI_API_KEY;
  const priorEnable = process.env.ENABLE_AI;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.ENABLE_AI = "true";
  try {
    const findings = audit('<img src="x">').findings;
    const mock = (id: string) =>
      (async (_url, init) => {
        const sent = JSON.parse(init!.body as string);
        assert.equal(sent.store, false);
        assert.equal(sent.text.format.type, "json_schema");
        return Response.json({
          status: "completed",
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    explanations: [
                      {
                        id,
                        impact: "Screen reader impact",
                        fix: "Review image purpose",
                        example: '<img alt="">',
                      },
                    ],
                  }),
                },
              ],
            },
          ],
        });
      }) as typeof fetch;
    assert.equal(
      (await explain(findings, true, mock(findings[0].id))).aiStatus,
      "enabled",
    );
    assert.ok(findings[0].ai);
    const invalid = audit("<button></button>").findings;
    assert.equal(
      (await explain(invalid, true, mock("invented-id"))).aiStatus,
      "unavailable",
    );
    assert.equal(invalid[0].ai, undefined);
    assert.equal(
      (
        await explain(invalid, true, (async () => {
          throw new Error("timeout");
        }) as typeof fetch)
      ).aiStatus,
      "unavailable",
    );
  } finally {
    if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorKey;
    if (priorEnable === undefined) delete process.env.ENABLE_AI;
    else process.env.ENABLE_AI = priorEnable;
  }
});
test("AI off makes no network call", async () => {
  assert.equal(
    (
      await explain(audit("<img>").findings, false, (async () => {
        throw new Error("must not call");
      }) as typeof fetch)
    ).aiStatus,
    "off",
  );
});
