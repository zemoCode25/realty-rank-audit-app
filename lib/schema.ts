// Zod schemas for the rich AuditData shape the `realtyrank-json` skill
// outputs (see chris_hanway_audit.json). Used to validate pasted JSON now,
// and reusable later for the manual "Fill Form" input path (e.g. with
// @hookform/resolvers' zodResolver) since both need the same shape checks.
//
// Per earlier feedback: validate *shape* (correct types), not *counts* —
// don't reject a payload just because it has 4 or 6 severeIssues instead of
// exactly 5. The renderer already tolerates missing/extra items gracefully.

import { z } from "zod";

export const categorySchema = z.object({
  letter: z.string(),
  name: z.string(),
  score: z.number(),
  icon: z.string(), // "crawl" | "entity" | "trust" | "answer" | "local" | "media", but not enforced
  radarLabel: z.string().optional(),
  lead: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  problems: z.array(z.string()).optional(),
  fixes: z.array(z.string()).optional(),
});

export const planTierSchema = z.object({
  name: z.string(),
  tag: z.string(),
  color: z.string(),
  items: z.array(z.string()).optional(),
});

export const priorityIssueSchema = z.object({
  title: z.string().optional(),
  text: z.string(),
  chain: z.string().optional(),
});

export const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const priorityPageSchema = z.object({
  page: z.string(),
  purpose: z.string(),
  priority: z.string().optional(), // "High" | "Medium", but not enforced
});

export const aiQueryGroupSchema = z.object({
  group: z.string(),
  items: z.array(z.string()).optional(),
});

export const fixSchema = z.object({
  number: z.number(),
  description: z.string(),
  scoreLift: z.string().optional(),
  difficulty: z.string().optional(), // "Specialist" | "Medium" | "Agent", but not enforced
});

export const conclusionSchema = z.object({
  currentScore: z.number(),
  projectedScore: z.string(),
  text: z.string(),
  recommendation: z.string().optional(),
  chain: z.string().optional(),
});

export const auditDataSchema = z.object({
  overall: z.number(),
  client: z.string(),
  contact: z.string(),
  market: z.string(),
  site: z.string(),
  date: z.string(),
  overallTier: z.string().optional(),
  categories: z.array(categorySchema).optional(),
  severeIssues: z.array(z.string()).optional(),
  actionPlan: z.array(planTierSchema).optional(),
  priorityIssue: priorityIssueSchema.nullish(),
  faqs: z.array(faqSchema).optional(),
  priorityPages: z.array(priorityPageSchema).optional(),
  aiQueries: z.array(aiQueryGroupSchema).optional(),
  fixes: z.array(fixSchema).optional(),
  conclusion: conclusionSchema.nullish(),
});

export type Category = z.infer<typeof categorySchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type PriorityIssue = z.infer<typeof priorityIssueSchema>;
export type FAQ = z.infer<typeof faqSchema>;
export type PriorityPage = z.infer<typeof priorityPageSchema>;
export type AIQueryGroup = z.infer<typeof aiQueryGroupSchema>;
export type Fix = z.infer<typeof fixSchema>;
export type Conclusion = z.infer<typeof conclusionSchema>;
export type AuditData = z.infer<typeof auditDataSchema>;

// Formats the first Zod issue into a short, user-facing message, e.g.
// "categories[2].score: Invalid input: expected number, received string"
export function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join(".") || "(root)";
  return `${path}: ${issue.message}`;
}
