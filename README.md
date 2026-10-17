# AccessAudit

A small accessibility checker for HTML, with optional AI explanations.

Paste a page's HTML or enter a public URL. AccessAudit checks five common problems, shows the relevant markup, and suggests what to change. The checks run without an API key. When AI is enabled, GPT-6 Luna adds explanations to the findings.

![Example audit results](docs/demo-results.jpg)

## Run it

Use Node.js 24, or at least 22.19.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. If that port is busy, run `npm run dev -- --port 3100`.

For a production build:

```sh
npm run build
npm start
```

If the development server hits a file-watcher limit on your machine, the production build is also a useful way to run the demo locally.

## Add AI explanations

Copy `.env.example` to `.env.local`:

```env
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-6-luna
ENABLE_AI=true
```

Restart the server, then check **Add AI explanations** before running an audit. Keep `.env.local` out of version control; it is already in `.gitignore`.

AI is optional. If the key is missing or the request fails, the report still includes the original findings and rule-based guidance. The model receives up to 12 finding excerpts, not the whole page. It returns structured output, which is checked for valid fields and matching finding IDs before use. It cannot change the findings or their priorities.

Only submit markup you are comfortable sending to the configured provider. Reports are not stored in a database. API requests use `store: false`; that setting does not mean zero provider retention. See [OpenAI's data controls](https://developers.openai.com/api/docs/guides/your-data).

## Checks

| Check                             | Priority   | Notes                                                                        |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Image without alternative text    | High       | An empty `alt` is allowed for decorative images.                             |
| Form control without a label      | High       | Checks labels and common ARIA naming patterns. A placeholder does not count. |
| Button without an accessible name | High       | Includes native input buttons and elements with `role="button"`.             |
| Skipped heading levels            | Medium     | A prompt to review the outline, not an automatic WCAG failure.               |
| Empty or vague link text          | High / Low | Empty names are High; generic phrases need context and are Low.              |

The priorities are a practical order for reviewing issues, not WCAG severity ratings. Each finding includes a CSS path, an HTML excerpt, its likely impact, an example fix, and a W3C reference. You can filter the results or download the report as JSON.

## Try the example

1. Click **Load demo** and run the audit. The example has five findings: three High, one Medium, and one Low.
2. Open a finding's example fix. With AI enabled, compare the explanation against the source.
3. Click **Try fixed version** and run it again. The five checks should return no findings.

The before and after pages are also in [`examples/`](examples/). A clean result only means these checks found nothing; keyboard, screen-reader, and contrast testing still matter.

## How it works

```text
HTML or public URL
  → input and URL validation
  → Cheerio parses static HTML
  → five rules produce findings
  → optional AI explanations
  → report and JSON export
```

The scanner owns detection so that a repeated audit of the same markup produces the same findings. AI handles the explanatory part, where context and plain language are more useful than another detection pass.

The main files are:

- [`lib/audit.ts`](lib/audit.ts): rules, accessible-name helpers, and report evidence.
- [`lib/safe-fetch.ts`](lib/safe-fetch.ts): URL restrictions, DNS checks, redirects, and bounded reads.
- [`lib/explain.ts`](lib/explain.ts): provider request, output validation, and fallback.
- [`app/api/audit/route.ts`](app/api/audit/route.ts): request validation and orchestration.
- [`app/page.tsx`](app/page.tsx): input, results, filters, and export.

URL requests reject local/private addresses and nonstandard ports. DNS answers are checked before connecting, the selected IP is pinned to the connection, and redirect destinations are validated again. Requests have a shared 10-second timeout and a 500 KB response limit. Reports show at most 100 findings while retaining the total count. Submitted markup is displayed as text and is never executed.

## Tests

```sh
npm test
npm run build
npm run typecheck
```

Tests cover the five rules, common false positives, request validation, URL restrictions, and AI output matching/fallback. Provider responses are mocked in the test suite, so tests do not spend API credits. See the [verification notes](docs/VERIFICATION.md) for manual checks.

## Deploy

Import this repository into Vercel as a **Next.js** project with Node **24.x** and the default build settings. There is no database to configure.

For a public demo, leave `ENABLE_AI=false`. For a private AI demo, add the three environment variables above and use deployment access protection. The current version does not have authentication, distributed rate limiting, or per-user quotas. Those controls are needed before exposing paid AI to unrestricted public traffic. A host with outbound-network controls is also preferable for a public URL-fetching service.

## Why accessibility

AccessAudit explores barriers in everyday web interfaces. AccessLens is the next project idea: applying that same interest to physical spaces with multimodal assistance. The scope here stays narrow so the behavior is easy to inspect and demonstrate.

## References

- W3C: [images](https://www.w3.org/WAI/tutorials/images/), [form labels](https://www.w3.org/WAI/tutorials/forms/labels/), [buttons](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [headings](https://www.w3.org/WAI/tutorials/page-structure/headings/), [link purpose](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Cheerio](https://cheerio.js.org/docs/basics/loading/)
- [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

[한국어 실행 안내](docs/QUICKSTART.ko.md) · [MIT license](LICENSE)
