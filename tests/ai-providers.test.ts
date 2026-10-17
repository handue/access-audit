import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAIConfig,
  providerRequest,
  providerText,
} from "../lib/ai-providers";
// Test provider selection without consulting local credentials or making network requests.
test("auto prefers a Muse key and otherwise retains Luna", () => {
  assert.deepEqual(
    resolveAIConfig({
      MODEL_API_KEY: " meta-key ",
      OPENAI_API_KEY: "openai-key",
    }),
    { provider: "muse", model: "muse-spark-1.3", key: "meta-key" },
  );
  assert.equal(
    resolveAIConfig({ OPENAI_API_KEY: "openai-key" }).provider,
    "openai",
  );
  assert.equal(
    resolveAIConfig({
      AI_PROVIDER: "openai",
      MODEL_API_KEY: "meta",
      OPENAI_API_KEY: "openai",
    }).provider,
    "openai",
  );
  assert.equal(
    resolveAIConfig({ AI_PROVIDER: "muse", OPENAI_API_KEY: "openai" }).key,
    "",
  );
  assert.throws(() => resolveAIConfig({ AI_PROVIDER: "typo" }));
});
test("provider request formats and endpoints stay separate", () => {
  const schema = { type: "object" };
  const muse = providerRequest(
    { provider: "muse", model: "muse-spark-1.3", key: "not-in-body" },
    "instructions",
    "input",
    schema,
  );
  assert.equal(muse.url, "https://api.meta.ai/v1/chat/completions");
  const body = muse.body as Record<string, any>;
  assert.equal(body.max_completion_tokens, 5000);
  assert.equal(body.max_output_tokens, undefined);
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.response_format.json_schema.schema, schema);
  assert.equal(body.messages[0].role, "developer");
  assert.equal(body.messages[1].role, "user");
  assert.ok(!JSON.stringify(body).includes("not-in-body"));
  const openai = providerRequest(
    { provider: "openai", model: "gpt-6-luna", key: "x" },
    "instructions",
    "input",
    schema,
  );
  assert.equal(openai.url, "https://api.openai.com/v1/responses");
  assert.equal((openai.body as Record<string, any>).store, false);
});
test("Muse accepts only a complete non-refusal text reply", () => {
  const reply = {
    choices: [
      { finish_reason: "stop", message: { content: '{"explanations":[]}' } },
    ],
  };
  assert.equal(providerText("muse", reply), '{"explanations":[]}');
  for (const finish_reason of ["length", "content_filter", "tool_calls"])
    assert.throws(() =>
      providerText("muse", {
        choices: [{ finish_reason, message: { content: "{}" } }],
      }),
    );
  for (const data of [
    null,
    {},
    { choices: [] },
    {
      choices: [
        { finish_reason: "stop", message: { refusal: "no", content: "{}" } },
      ],
    },
    {
      choices: [
        { finish_reason: "stop", message: { content: [{ text: "{}" }] } },
      ],
    },
  ])
    assert.throws(() => providerText("muse", data));
});
