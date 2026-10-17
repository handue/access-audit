import { load } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { Finding, Priority } from "./types";
const refs = {
  image: "https://www.w3.org/WAI/tutorials/images/",
  form: "https://www.w3.org/WAI/tutorials/forms/labels/",
  button: "https://www.w3.org/WAI/ARIA/apg/patterns/button/",
  heading: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
  link: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html",
};
// Parse markup without running page scripts; every finding comes from these rules.
export function audit(html: string) {
  const $ = load(html);
  const findings: Finding[] = [];
  let total = 0;
  // Static visibility only: CSS and browser layout still need a separate review.
  const visible = (el: AnyNode) =>
    !$(el).is('[hidden], [aria-hidden="true"], input[type="hidden"]') &&
    !$(el).parents('[hidden], [aria-hidden="true"], script, style, template')
      .length;
  // Collect readable descendants while ignoring content hidden from assistive technology.
  const text = (el: AnyNode): string => {
    if (!visible(el)) return "";
    if (el.type === "text") return el.data;
    if ("name" in el && el.name === "img") return $(el).attr("alt") || "";
    return $(el)
      .contents()
      .toArray()
      .map(text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  };
  // Resolve common naming sources in ARIA-first order. This is a scoped
  // approximation of the browser accessible-name algorithm, not a full implementation.
  const name = (el: Element) => {
    const node = $(el);
    const ids = node.attr("aria-labelledby")?.trim().split(/\s+/) || [];
    const referenced = ids
      .map((id) =>
        $("[id]")
          .toArray()
          .find((e) => $(e).attr("id") === id),
      )
      .filter(Boolean)
      .map((e) => $(e!).text().trim())
      .join(" ")
      .trim();
    if (referenced) return referenced;
    if (node.attr("aria-label")?.trim()) return node.attr("aria-label")!.trim();
    if (el.name === "input" && node.attr("type") === "image")
      return node.attr("alt")?.trim() || "";
    if (
      el.name === "input" &&
      ["submit", "reset"].includes(node.attr("type") || "")
    )
      return (
        node.attr("value")?.trim() ||
        (node.attr("type") === "submit" ? "Submit" : "Reset")
      );
    if (el.name === "input" && node.attr("type") === "button")
      return node.attr("value")?.trim() || "";
    if (["input", "select", "textarea"].includes(el.name)) {
      const id = node.attr("id");
      // Compare IDs as strings so punctuation in IDs cannot change a CSS selector.
      const label = $("label")
        .toArray()
        .filter(
          (l) =>
            (id && $(l).attr("for") === id) ||
            $(l).find("*").toArray().includes(el),
        )
        .map(text)
        .join(" ")
        .trim();
      return label || node.attr("title")?.trim() || "";
    }
    return text(el) || node.attr("title")?.trim() || "";
  };
  function add(
    el: Element,
    rule: string,
    title: string,
    priority: Priority,
    impact: string,
    fix: string,
    example: string,
    reference: string,
    review = false,
  ) {
    // Keep the full count, but bound the report and any later AI input.
    total++;
    if (findings.length >= 100) return;
    // Build a path that remains usable even when the page has no element IDs.
    const parts: string[] = [];
    let current: Element | null = el;
    while (current && parts.length < 8) {
      const p: Element | null =
        current.parent && current.parent.type === "tag"
          ? (current.parent as Element)
          : null;
      const index = p
        ? $(p).children(current.name).toArray().indexOf(current) + 1
        : 1;
      parts.unshift(`${current.name}:nth-of-type(${index})`);
      current = p;
    }
    // Evidence is displayed as text. Strip input values before saving an excerpt.
    const sample = $(el).clone();
    sample.find("script,style").remove();
    sample.find("input").removeAttr("value");
    if (el.name === "input") sample.removeAttr("value");
    findings.push({
      id: `finding-${total}`,
      rule,
      title,
      priority,
      confidence: review ? "Review" : "Detected",
      selector: parts.join(" > "),
      snippet: $.html(sample).slice(0, 600),
      impact,
      fix,
      example,
      reference,
    });
  }
  // A missing alt attribute differs from alt="", which is valid for decoration.
  $("img").each((_, el) => {
    if (
      visible(el) &&
      $(el).attr("alt") === undefined &&
      !["presentation", "none"].includes($(el).attr("role") || "") &&
      !$(el).attr("aria-label")?.trim() &&
      !$(el).attr("aria-labelledby")?.trim()
    )
      add(
        el,
        "image-alt",
        "Image is missing alternative text",
        "High",
        "Screen-reader users may miss the information or purpose of this image.",
        'Describe the image’s purpose. If it is purely decorative, use alt="". Review the actual image before writing its description.',
        '<img src="workshop.jpg" alt="Participants collaborating at a workshop table">',
        refs.image,
      );
  });
  // Placeholder text is deliberately excluded: it is not a persistent label.
  $("input, select, textarea").each((_, el) => {
    if (
      visible(el) &&
      !["hidden", "submit", "reset", "button", "image"].includes(
        $(el).attr("type") || "",
      ) &&
      !name(el)
    )
      add(
        el,
        "form-label",
        "Form control has no accessible label",
        "High",
        "People using assistive technology may not know what information to enter.",
        "Associate a visible label with the control. A placeholder does not replace a label.",
        '<label for="email">Email address</label>\n<input id="email" type="email">',
        refs.form,
      );
  });
  // Include native input buttons and custom elements declaring a button role.
  $(
    'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], input[type="image"]',
  ).each((_, el) => {
    if (visible(el) && !name(el))
      add(
        el,
        "button-name",
        "Button has no accessible name",
        "High",
        "Screen-reader users may hear “button” without knowing what the action does.",
        "Add descriptive button text or an aria-label for an icon-only action.",
        '<button type="submit">Join the workshop</button>',
        refs.button,
      );
  });
  // Only skipped levels are flagged. Moving back up the outline is valid.
  let previous = 0;
  $("h1,h2,h3,h4,h5,h6").each((_, el) => {
    if (!visible(el)) return;
    const level = Number(el.name[1]);
    if ((!previous && level > 1) || (previous && level > previous + 1))
      add(
        el,
        "heading-order",
        "Heading levels skip a step",
        "Medium",
        "People navigating by headings may find the page hierarchy harder to understand.",
        `Review the hierarchy. Consider h${previous ? previous + 1 : 1} for this section; choose levels by structure, not visual size.`,
        `<h${previous ? previous + 1 : 1}>Section title</h${previous ? previous + 1 : 1}>`,
        refs.heading,
        true,
      );
    previous = level;
  });
  // Generic wording depends on context; flag it for review rather than as a failure.
  $("a[href]").each((_, el) => {
    if (!visible(el)) return;
    const label = name(el);
    if (
      !label ||
      /^(click here|here|read more|learn more|more|link|클릭|여기|자세히)[.!…\s]*$/i.test(
        label,
      )
    )
      add(
        el,
        "link-text",
        label ? "Link text needs more context" : "Link has no accessible name",
        label ? "Low" : "High",
        "People browsing a list of links may not know where this link leads.",
        "Describe the destination. Review surrounding programmatic context before deciding whether a generic link needs to change.",
        '<a href="/workshops">Explore upcoming workshops</a>',
        refs.link,
        !!label,
      );
  });
  // Priority is a rule policy; model output never changes the triage order.
  const order = { High: 0, Medium: 1, Low: 2 };
  findings.sort((a, b) => order[a.priority] - order[b.priority]);
  return {
    findings,
    total,
    truncated: total > findings.length,
    elements: $("*").length,
  };
}
