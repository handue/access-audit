// Exercise the configured provider with public demo content; never print credentials.
import { audit } from "../lib/audit";
import { demoHtml } from "../lib/demo";
import { explain } from "../lib/explain";
async function main() {
  const findings = audit(demoHtml).findings;
  const start = Date.now();
  const result = await explain(findings, true);
  console.log(
    JSON.stringify(
      {
        ...result,
        detected: findings.length,
        explained: findings.filter((f) => f.ai).length,
        durationMs: Date.now() - start,
      },
      null,
      2,
    ),
  );
  if (result.aiStatus !== "enabled") process.exitCode = 1;
}
main().catch(() => {
  console.error("AI verification could not complete.");
  process.exitCode = 1;
});
