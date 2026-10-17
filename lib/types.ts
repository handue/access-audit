// Shared report contract used by the scanner, API response and client UI.
export type Priority = "High" | "Medium" | "Low";
export type Finding = {
  id: string;
  rule: string;
  title: string;
  priority: Priority;
  confidence: "Detected" | "Review";
  selector: string;
  snippet: string;
  impact: string;
  fix: string;
  example: string;
  reference: string;
  ai?: { impact: string; fix: string; example: string };
};
export type Report = {
  source: string;
  timestamp: string;
  elements: number;
  findings: Finding[];
  total: number;
  truncated: boolean;
  aiStatus: "off" | "enabled" | "unavailable" | "no-findings";
  aiMessage: string;
  duration: number;
};
