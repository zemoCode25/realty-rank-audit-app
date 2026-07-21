// InboundREM RealtyRank — Audit Data Types
// Compressed 3-4 page report format (see AI_Visibility_Audit_PDF_SOP.md for the
// original 10-13 page format this was condensed from).

export interface CategoryScore {
  name: string; // "Crawlability"
  score: number; // 0–100
}

export interface MainIssue {
  title: string;
  text: string;
}

export interface Fix {
  n: number;
  fix: string;
  timeline: "Immediate" | "30 Days" | "60 Days";
}

export interface CoreAnswer {
  q: string;
  a: string; // 40–80 words
}

export interface QueryGroup {
  group: string; // "Branded" | "Local" | "Service" | "Proof"
  items: string[];
}

export interface Roadmap {
  day30: string[];
  day90: string[];
}

export interface Conclusion {
  current: number;
  projected: string; // "65–72"
  text: string;
  agentOwns: string;
  specialistOwns: string;
}

export interface AuditData {
  overall: number;
  client: string; // brand name, or "{Contact} — {Role}" when no distinct brand exists
  contact: string;
  market: string; // "Denver, CO"
  site: string; // naked domain, or "no-personal-website-found"
  date: string;
  potentialRange: string; // "65–72"
  summary: string; // page 1 narrative paragraph
  categories: CategoryScore[]; // scorecard donut grid
  keyStrengths: string[]; // exactly 5
  mainIssues: MainIssue[]; // exactly 5
  fixes: Fix[]; // 7–10
  coreAnswers: CoreAnswer[]; // exactly 3: who / brokerage / areas served
  queryGroups: QueryGroup[]; // Branded / Local / Service / Proof
  roadmap: Roadmap;
  conclusion: Conclusion;
}
