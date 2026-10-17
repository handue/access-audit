"use client";
import { useRef, useState } from "react";
import { demoHtml, fixedHtml } from "@/lib/demo";
import type { Report } from "@/lib/types";
export default function Home() {
  const [mode, setMode] = useState<"html" | "url">("html");
  const [html, setHtml] = useState(demoHtml);
  const [url, setUrl] = useState("");
  const [ai, setAi] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const resultRef = useRef<HTMLElement>(null);
  // Both input modes use the same server endpoint and clear stale results on a new run.
  async function run(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "html" ? { mode, html, ai } : { mode, url, ai },
        ),
        signal: AbortSignal.timeout(40_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReport(data);
      setFilter("All");
      setTimeout(() => resultRef.current?.focus(), 0);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "The audit timed out. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  // Export the current report locally; revoke the temporary URL after the click.
  function download() {
    if (!report) return;
    const object = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = object;
    a.download = "accessaudit-report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(object), 1000);
  }
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AccessAudit home">
          <span className="brandmark" aria-hidden="true">
            a<span>↗</span>
          </span>
          AccessAudit<span className="beta">LAB / 01</span>
        </a>
        <a className="navlink" href="#method">
          How it works <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="main">
        <section className="hero">
          <div className="eyebrow">
            <span className="dot" /> A MORE OPEN WEB STARTS HERE
          </div>
          <h1>
            Good design
            <br />
            lets <em>everyone</em> in.
          </h1>
          <p>
            Find the small barriers that make a big difference.
            <br className="desktop" /> Audit your HTML. Understand the impact.
            Know what to fix.
          </p>
          <div className="hero-meta">
            <span>5 focused checks</span>
            <span>Evidence first</span>
            <span>AI assisted</span>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-cross">✳</div>
            <span className="art-label">ACCESS IS FOR EVERYONE</span>
            <span className="art-coordinate">01 — 05 / OPEN WEB</span>
          </div>
        </section>
        <section className="workspace" aria-labelledby="audit-heading">
          <div className="section-head">
            <div>
              <span className="eyebrow">01 / YOUR STARTING POINT</span>
              <h2 id="audit-heading">Let’s look a little closer.</h2>
            </div>
            <span className="small-note">
              No sign-up. No page scripts executed.
            </span>
          </div>
          <form onSubmit={run}>
            <div className="editor-top">
              <div className="mode-group" aria-label="Input method">
                <button
                  type="button"
                  aria-pressed={mode === "html"}
                  onClick={() => setMode("html")}
                >
                  Paste HTML
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "url"}
                  onClick={() => setMode("url")}
                >
                  Enter URL
                </button>
              </div>
              <div className="sample-actions">
                <button
                  type="button"
                  onClick={() => {
                    setMode("html");
                    setHtml(demoHtml);
                    setReport(null);
                  }}
                >
                  Load demo
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("html");
                    setHtml(fixedHtml);
                    setReport(null);
                  }}
                >
                  Try fixed version
                </button>
              </div>
            </div>
            {mode === "html" ? (
              <div className="code-editor">
                <div className="file-label">
                  <span aria-hidden="true">〈/〉</span> index.html{" "}
                  <span>HTML · up to 500 KB</span>
                </div>
                <label className="sr-only" htmlFor="html">
                  HTML source to audit
                </label>
                <textarea
                  id="html"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  required
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="url-editor">
                <label htmlFor="url">Public page URL</label>
                <input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <p>
                  We inspect the server’s HTML. For pages built with JavaScript,
                  paste the rendered HTML instead.
                </p>
              </div>
            )}
            <div className="editor-bottom">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={ai}
                  onChange={(e) => setAi(e.target.checked)}
                />
                <span>
                  Add AI explanations
                  <small>Optional · requires server configuration</small>
                </span>
              </label>
              <button className="primary" disabled={busy} type="submit">
                {busy ? "Auditing your page…" : "Run accessibility audit"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
            {ai && (
              <p className="privacy">
                If enabled on the server, up to 12 finding snippets are sent to
                OpenAI. Only submit content you have permission to share.
              </p>
            )}
            <div role="status" className="sr-only">
              {busy
                ? "Audit in progress."
                : report
                  ? `Audit complete: ${report.total} findings.`
                  : ""}
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        </section>
        {report ? (
          <section
            className="results"
            ref={resultRef}
            tabIndex={-1}
            aria-labelledby="results-heading"
          >
            <div className="section-head">
              <div>
                <span className="eyebrow">02 / A CLEARER PICTURE</span>
                <h2 id="results-heading">
                  {report.total
                    ? "Small fixes. Meaningful impact."
                    : "A stronger starting point."}
                </h2>
              </div>
              <button className="outline" onClick={download}>
                Export JSON ↓
              </button>
            </div>
            <p className="source">
              {report.source} · {report.elements} elements ·{" "}
              {(report.duration / 1000).toFixed(2)}s
            </p>
            <div className="stats">
              <div>
                <strong>{report.total}</strong>
                <span>findings across 5 checks</span>
              </div>
              {(["High", "Medium", "Low"] as const).map((p) => (
                <div key={p}>
                  <strong className={p.toLowerCase()}>
                    {report.findings.filter((f) => f.priority === p).length}
                  </strong>
                  <span>
                    {p} priority{report.truncated ? " (shown)" : ""}
                  </span>
                </div>
              ))}
            </div>
            <p
              className={`ai-notice ${report.aiStatus === "enabled" ? "active" : ""}`}
            >
              <span className="badge">
                {report.aiStatus === "enabled" ? "AI ENHANCED" : "RULE-BASED"}
              </span>
              {report.aiMessage}
            </p>
            {report.truncated && (
              <p className="error">
                Showing the first 100 findings. Narrow the HTML to review the
                remaining issues.
              </p>
            )}
            {report.total > 0 && (
              <div className="filters" aria-label="Filter findings">
                {["All", "High", "Medium", "Low"].map((p) => (
                  <button
                    key={p}
                    aria-pressed={filter === p}
                    onClick={() => setFilter(p)}
                  >
                    {p}
                    {p === "All" ? " findings" : " priority"}
                  </button>
                ))}
              </div>
            )}
            <div className="findings">
              {report.findings
                .filter((f) => filter === "All" || f.priority === filter)
                .map((f, i) => (
                  <article className="finding" key={f.id}>
                    <div className="finding-top">
                      <span className="finding-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="finding-tags">
                          <span
                            className={`priority ${f.priority.toLowerCase()}`}
                          >
                            {f.priority} priority
                          </span>
                          <span>
                            {f.confidence === "Review"
                              ? "Needs context review"
                              : "Rule detected"}{" "}
                            · {f.ai ? "AI explanation" : "Curated guidance"}
                          </span>
                        </div>
                        <h3>{f.title}</h3>
                      </div>
                    </div>
                    <div className="finding-body">
                      <div className="impact">
                        <h4>WHO IT AFFECTS</h4>
                        <p>{f.ai?.impact || f.impact}</p>
                        <h4>HOW TO IMPROVE IT</h4>
                        <p>{f.ai?.fix || f.fix}</p>
                        <a href={f.reference} target="_blank" rel="noreferrer">
                          Read the W3C guidance ↗
                        </a>
                      </div>
                      <div className="evidence">
                        <h4>FOUND IN YOUR HTML</h4>
                        <code className="selector">{f.selector}</code>
                        <pre>
                          <code>{f.snippet}</code>
                        </pre>
                        <details>
                          <summary>See an example fix</summary>
                          <pre className="fix">
                            <code>{f.ai?.example || f.example}</code>
                          </pre>
                          <small>
                            Illustrative example. Adapt it to your content.
                          </small>
                        </details>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
            {report.total === 0 && (
              <div className="empty">
                <span aria-hidden="true">✓</span>
                <h3>No findings in these five checks.</h3>
                <p>
                  Keep going with keyboard navigation, screen-reader and
                  contrast testing.
                  <br />
                  This result does not establish WCAG compliance.
                </p>
              </div>
            )}
            {report.total > 0 &&
              !report.findings.some(
                (f) => filter === "All" || f.priority === filter,
              ) && <p className="empty">No findings at this priority.</p>}
            <p className="limitations">
              A focused static review, not a compliance certification. CSS
              visibility, JavaScript behavior, contrast, keyboard access and
              full accessible-name computation require further testing.
            </p>
          </section>
        ) : (
          <section className="coverage" aria-label="What we check">
            <div className="coverage-intro">
              <span className="eyebrow">
                FIVE CHECKS.
                <br />
                ONE BETTER EXPERIENCE.
              </span>
            </div>
            {[
              ["01", "Image alternatives"],
              ["02", "Form labels"],
              ["03", "Button names"],
              ["04", "Heading structure"],
              ["05", "Link clarity"],
            ].map(([n, label]) => (
              <div key={n}>
                <span>{n}</span>
                <strong>{label}</strong>
              </div>
            ))}
          </section>
        )}
        <section className="method" id="method">
          <div>
            <span className="eyebrow">BUILT ON EVIDENCE</span>
            <h2>
              Rules find the barrier.
              <br />
              AI helps explain the way forward.
            </h2>
          </div>
          <div>
            <p>
              AccessAudit starts with reproducible checks against your HTML.
              Each finding includes the source, its likely impact and a
              practical next step.
            </p>
            <p>
              Optional AI adds context to those findings. It cannot change the
              detected evidence or priority. You stay in control of the fix.
            </p>
            <span className="method-flow">
              HTML <b>→</b> CHECKS <b>→</b> EXPLANATIONS <b>→</b> ACTION
            </span>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          AccessAudit
          <span className="footer-star" aria-hidden="true">
            ✳
          </span>
        </a>
        <p>
          From digital barriers to a more accessible world.
          <br />
          <span>An exploration toward AccessLens.</span>
        </p>
        <span className="footer-note">BUILT FOR HUMAN POSSIBILITY.</span>
      </footer>
    </div>
  );
}
