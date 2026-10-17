// Keep provider credentials server-side and adapt each API to one report contract.
export type AIProvider = "openai" | "muse";
export type AIConfig = { provider: AIProvider; model: string; key: string };
export function resolveAIConfig(
  env: Record<string, string | undefined> = process.env,
): AIConfig {
  const preference = env.AI_PROVIDER?.trim() || "auto";
  if (!["auto", "openai", "muse"].includes(preference)) {
    throw new Error("AI_PROVIDER must be auto, openai, or muse.");
  }
  // Auto preserves existing Luna setups while making a Muse key the only new requirement.
  const provider =
    preference === "auto"
      ? env.MODEL_API_KEY?.trim()
        ? "muse"
        : "openai"
      : (preference as AIProvider);
  return provider === "muse"
    ? {
        provider,
        model: env.MUSE_MODEL?.trim() || "muse-spark-1.3",
        key: env.MODEL_API_KEY?.trim() || "",
      }
    : {
        provider,
        model: env.OPENAI_MODEL?.trim() || "gpt-6-luna",
        key: env.OPENAI_API_KEY?.trim() || "",
      };
}
export function providerRequest(
  config: AIConfig,
  instructions: string,
  input: string,
  schema: object,
) {
  if (config.provider === "muse") {
    // Meta Chat Completions uses response_format and max_completion_tokens,
    // unlike the text.format and max_output_tokens fields on OpenAI Responses.
    return {
      url: "https://api.meta.ai/v1/chat/completions",
      body: {
        model: config.model,
        messages: [
          { role: "developer", content: instructions },
          { role: "user", content: input },
        ],
        max_completion_tokens: 5000,
        reasoning_effort: "low",
        response_format: {
          type: "json_schema",
          json_schema: { name: "accessibility_explanations", schema },
        },
      },
    };
  }
  return {
    url: "https://api.openai.com/v1/responses",
    body: {
      model: config.model,
      store: false,
      max_output_tokens: 5000,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "accessibility_explanations",
          strict: true,
          schema,
        },
      },
    },
  };
}
export function providerText(provider: AIProvider, data: unknown): string {
  // Refusals, truncated completions and malformed envelopes must not reach the report.
  if (!data || typeof data !== "object") throw new Error("Invalid AI response");
  const envelope = data as Record<string, unknown>;
  if (provider === "muse") {
    const choices = envelope.choices;
    if (!Array.isArray(choices) || choices.length !== 1)
      throw new Error("Invalid AI choices");
    const choice = choices[0];
    if (
      choice?.finish_reason !== "stop" ||
      choice.message?.refusal ||
      typeof choice.message?.content !== "string"
    )
      throw new Error("Incomplete AI response");
    return choice.message.content;
  }
  if (envelope.status !== "completed" || !Array.isArray(envelope.output))
    throw new Error("Incomplete AI response");
  const content = envelope.output.flatMap((o) =>
    Array.isArray(o?.content) ? o.content : [],
  );
  if (content.some((c) => c?.type === "refusal")) throw new Error("AI refusal");
  const chunks = content.filter((c) => c?.type === "output_text");
  if (!chunks.length || chunks.some((c) => typeof c.text !== "string"))
    throw new Error("Missing AI text");
  return chunks.map((c) => c.text).join("");
}
