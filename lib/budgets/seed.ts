import { readFileSync } from "node:fs";
import path from "node:path";

import { fiscalEventSchema, type FiscalEvent } from "@/lib/budgets/events";
import { ruleRegimeSchema, type RuleRegime } from "@/lib/budgets/rules";
import { parseRegistryYaml } from "@/lib/budgets/yaml";
import { z } from "zod";

const seedSchema = z.object({
  events: z.array(
    fiscalEventSchema.omit({ status: true, observedDate: true }).extend({
      status: z.enum(["listed", "pending"]).optional(),
      observedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    }),
  ),
});

export function loadSeedEvents(): FiscalEvent[] {
  const file = path.join(process.cwd(), "lib/budgets/fiscal-events.yaml");
  const parsed = seedSchema.parse(parseRegistryYaml(readFileSync(file, "utf8")));
  return parsed.events.map((event) =>
    fiscalEventSchema.parse({
      ...event,
      status: event.status ?? "listed",
      observedDate: event.observedDate ?? null,
    }),
  );
}

export function loadRuleRegimes(): RuleRegime[] {
  const file = path.join(process.cwd(), "lib/budgets/fiscal-rules.yaml");
  const parsed = z.object({ regimes: z.array(ruleRegimeSchema).min(1) }).parse(parseRegistryYaml(readFileSync(file, "utf8")));
  return parsed.regimes;
}
