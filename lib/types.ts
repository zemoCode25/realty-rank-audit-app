// InboundREM RealtyRank — Audit Data Types
// Matches the canonical JSON schema v2.0

export interface Category {
  letter: string; // "A" – "F"
  name: string; // "AI Crawlability"
  score: number; // 0–100
  icon: "crawl" | "entity" | "trust" | "answer" | "local" | "media";
  radarLabel: string; // "AI\nCrawlability"
  lead: string; // one-sentence summary
  strengths: string[]; // 2–3 bullets
  problems: string[]; // 2–3 bullets
  fixes: string[]; // 3 bullets
}

export interface PlanTier {
  name: string; // "Top Tier"
  tag: string; // "Immediate"
  color: string; // hex
  items: string[]; // exactly 3
}

export interface PriorityIssue {
  title: string;
  text: string;
  chain: string; // "Agent → Brand → … → site.com → Spec · Spec"
}

export interface FAQ {
  question: string;
  answer: string; // 40–80 words
}

export interface PriorityPage {
  page: string;
  purpose: string;
  priority?: "High" | "Medium";
}

export interface AIQueryGroup {
  group: string; // "Branded" | "Local" | "Service & Niche"
  items: string[];
}

export interface Fix {
  number: number;
  description: string;
  scoreLift: string; // "+3 to +5"
  difficulty: "Specialist" | "Medium" | "Agent";
}

export interface Conclusion {
  currentScore: number;
  projectedScore: string; // "88–92"
  text: string;
  recommendation: string;
  chain: string;
}

export interface AuditData {
  overall: number;
  client: string;
  contact: string;
  market: string;
  site: string;
  date: string;
  overallTier?: string;
  categories: Category[];
  severeIssues: string[]; // exactly 5
  actionPlan: PlanTier[]; // exactly 3
  priorityIssue?: PriorityIssue | null;
  faqs?: FAQ[]; // 6–9
  priorityPages?: PriorityPage[]; // 8–14
  aiQueries?: AIQueryGroup[]; // 3+ groups
  fixes?: Fix[]; // 7–10
  conclusion?: Conclusion | null;
}
