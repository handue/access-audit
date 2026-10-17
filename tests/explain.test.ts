// Mock the provider to test schema and ID handling without paid API requests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { explain } from "../lib/explain";
import { audit } from "../lib/audit";
test("AI output validates ids, attaches explanations, and fails safely", async () => {
  const priorProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "openai";
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
    if (priorProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = priorProvider;
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

// Both transports must enforce the same report contract, including the 12-finding cap.
test("Muse explanations validate the full batch before attaching any output", async () => {
  const keys = [
    "AI_PROVIDER",
    "MODEL_API_KEY",
    "MUSE_MODEL",
    "ENABLE_AI",
    "OPENAI_API_KEY",
  ] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    AI_PROVIDER: "muse",
    MODEL_API_KEY: "test-meta-key",
    MUSE_MODEL: "muse-spark-1.3",
    ENABLE_AI: "true",
    OPENAI_API_KEY: "must-not-use",
  });
  try {
    const findings = audit('<img src="x">'.repeat(14)).findings;
    const before = findings.map(({ id, priority, snippet }) => ({
      id,
      priority,
      snippet,
    }));
    let calls = 0;
    const mock = (async (url, init) => {
      calls++;
      assert.equal(url, "https://api.meta.ai/v1/chat/completions");
      assert.equal(
        new Headers(init!.headers).get("Authorization"),
        "Bearer test-meta-key",
      );
      const body = JSON.parse(init!.body as string);
      const items = JSON.parse(body.messages[1].content);
      assert.equal(items.length, 12);
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                explanations: items.map((f: { id: string }) => ({
                  id: f.id,
                  impact: "Impact",
                  fix: "Fix",
                  example: '<img alt="">',
                })),
              }),
            },
          },
        ],
      });
    }) as typeof fetch;
    const result = await explain(findings, true, mock);
    assert.equal(result.aiStatus, "enabled");
    assert.equal(result.aiProvider, "muse");
    assert.equal(result.aiModel, "muse-spark-1.3");
    assert.equal(findings.filter((f) => f.ai).length, 12);
    assert.equal(calls, 1);
    assert.deepEqual(
      findings.map(({ id, priority, snippet }) => ({ id, priority, snippet })),
      before,
    );
    const invalid = audit("<img><button></button>").findings;
    const reply = (explanations: unknown, finish_reason = "stop") =>
      (async () =>
        Response.json({
          choices: [
            {
              finish_reason,
              message: { content: JSON.stringify({ explanations }) },
            },
          ],
        })) as typeof fetch;
    for (const values of [
      [],
      [{ id: invalid[0].id, impact: "x", fix: "x", example: "x" }],
      [
        { id: invalid[0].id, impact: "x", fix: "x", example: "x" },
        { id: invalid[0].id, impact: "x", fix: "x", example: "x" },
      ],
      [{ id: invalid[0].id, impact: 23, fix: "x", example: "x" }],
    ]) {
      assert.equal(
        (await explain(invalid, true, reply(values))).aiStatus,
        "unavailable",
      );
      assert.ok(invalid.every((f) => !f.ai));
    }
    assert.equal(
      (await explain(invalid, true, reply([], "length"))).aiStatus,
      "unavailable",
    );
    calls = 0;
    const rejected = (async () => {
      calls++;
      return Response.json(
        { error: "must not expose provider body" },
        { status: 401 },
      );
    }) as typeof fetch;
    const failed = await explain(invalid, true, rejected);
    assert.equal(failed.aiStatus, "unavailable");
    assert.match(failed.aiMessage, /401/);
    assert.ok(!failed.aiMessage.includes("must not expose"));
    assert.equal(calls, 1);
    // A timeout should remain distinguishable from a malformed provider reply.
    const timedOut = await explain(invalid, true, (async () => {
      throw new DOMException("Request expired", "TimeoutError");
    }) as typeof fetch);
    assert.equal(timedOut.aiStatus, "unavailable");
    assert.match(timedOut.aiMessage, /45 seconds/);
    assert.ok(invalid.every((finding) => !finding.ai));
    delete process.env.MODEL_API_KEY;
    assert.equal(
      (
        await explain(invalid, true, (async () => {
          throw new Error("must not call");
        }) as typeof fetch)
      ).aiStatus,
      "off",
    );
    process.env.AI_PROVIDER = "typo";
    assert.equal(
      (await explain(invalid, true, rejected)).aiStatus,
      "unavailable",
    );
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
