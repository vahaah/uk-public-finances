import { z } from "zod";

export const ruleOutcomeSchema = z.enum(["met", "missed", "replaced", "pending", "unreviewed"]);
export type RuleOutcome = z.infer<typeof ruleOutcomeSchema>;

export const fiscalRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  metric: z.string().min(1),
  target: z.string().min(1),
  outcome: ruleOutcomeSchema,
  source: z.string().url(),
  /** £ billion. Null until the reviewed file records a figure. */
  headroomBn: z.number().finite().nullable().optional(),
});

export const ruleRegimeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  source: z.string().url(),
  sourceTitle: z.string().min(1),
  rules: z.array(fiscalRuleSchema).min(1),
});

export type RuleRegime = z.infer<typeof ruleRegimeSchema>;
export type FiscalRule = z.infer<typeof fiscalRuleSchema>;

export function outcomeLabel(outcome: RuleOutcome): string {
  switch (outcome) {
    case "met":
      return "Met";
    case "missed":
      return "Missed";
    case "replaced":
      return "Replaced before target year";
    case "pending":
      return "Not yet due";
    case "unreviewed":
      return "Not assessed";
    default: {
      const neverOutcome: never = outcome;
      return neverOutcome;
    }
  }
}

export function regimesAt(regimes: RuleRegime[], isoDate: string): RuleRegime[] {
  return regimes.filter((regime) => regime.from <= isoDate && (regime.to == null || isoDate < regime.to));
}

/** Headroom from the reviewed rules file. Each row keeps that rule's source. */
export function reviewedHeadroom(regimes: RuleRegime[]): { eventDate: string; rule: string; headroomBn: number | null; source: string }[] {
  return regimes.flatMap((regime) =>
    regime.rules.map((rule) => ({
      eventDate: regime.from,
      rule: rule.name,
      headroomBn: rule.headroomBn ?? null,
      source: rule.source,
    })),
  );
}
