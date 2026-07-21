// Type-only re-export of the AuditData shape. Runtime validation (Zod
// schemas) lives in lib/schema.ts — see that file for the source of truth.

export type {
  AIQueryGroup,
  AuditData,
  Category,
  Conclusion,
  FAQ,
  Fix,
  PlanTier,
  PriorityIssue,
  PriorityPage,
} from "@/lib/schema";
