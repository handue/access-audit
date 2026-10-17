// Check rule coverage and common cases that should not produce false positives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { audit } from "../lib/audit";
import { demoHtml, fixedHtml } from "../lib/demo";
test("demo detects all five categories and fixed demo clears them", () => {
  const r = audit(demoHtml);
  assert.equal(r.total, 5);
  assert.deepEqual(
    r.findings.map((f) => f.priority),
    ["High", "High", "High", "Medium", "Low"],
  );
  assert.equal(new Set(r.findings.map((f) => f.rule)).size, 5);
  assert.equal(audit(fixedHtml).total, 0);
});
test("decorative, hidden, ARIA named and labelled controls are respected", () => {
  const r = audit(
    `<h1>Title</h1><img alt="" src="x"><div hidden><img src="x"><button></button></div><span id="label">Email</span><input aria-labelledby="label"><label>Country<select><option>US</option></select></label><label for="a:b">Name</label><input id="a:b"><button aria-label="Close"><svg aria-hidden="true"></svg></button><a href="/"><img alt="Home" src="x"></a><input type="hidden"><input type="submit">`,
  );
  assert.equal(r.total, 0);
});
test("placeholder and hidden button contents do not count as labels", () => {
  const r = audit(
    '<input placeholder="Email"><button><span aria-hidden="true">X</span></button>',
  );
  assert.equal(r.total, 2);
});
test("unresolved ARIA reference falls through to aria-label", () => {
  assert.equal(
    audit('<button aria-labelledby="missing" aria-label="Close"></button>')
      .total,
    0,
  );
});
test("skipping down is review, returning to a higher level is allowed", () => {
  const r = audit("<h1>A</h1><h3>B</h3><h2>C</h2>");
  assert.equal(r.total, 1);
  assert.equal(r.findings[0].confidence, "Review");
});
test("blank anchors are high priority and generic links need review", () => {
  const r = audit(
    '<a href="/x"></a><a href="/y">Read more</a><a href="/z" aria-label="More about workshops">More</a>',
  );
  assert.equal(r.total, 2);
  assert.equal(r.findings[0].priority, "High");
  assert.equal(r.findings[1].confidence, "Review");
});
test("finding cap reports true total and removes input values from evidence", () => {
  const r = audit('<input value="private">'.repeat(120));
  assert.equal(r.total, 120);
  assert.equal(r.findings.length, 100);
  assert.equal(r.truncated, true);
  assert.ok(!r.findings[0].snippet.includes("private"));
});
