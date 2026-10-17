// Keep page metadata and the keyboard skip link outside the interactive audit UI.
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AccessAudit — Build a more open web",
  description:
    "Find accessibility barriers in HTML and understand how to fix them with evidence-based checks and optional AI explanations.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to audit
        </a>
        {children}
      </body>
    </html>
  );
}
