import {
  recordPending,
  recordValidationFailure,
  revalidateDashboard,
  runBoe,
  runDmo,
  runHmrc,
  runIncomeTax,
  runBudgetsEvents,
  runBudgetsObr,
  runObr,
  runOns,
  runPesa,
  runPrices,
} from "@/lib/workflows/steps";
import type { SourceId } from "@/lib/schema";

type Input = { force?: boolean };
type Runner = (force: boolean) => Promise<Record<string, unknown>>;

async function settle(sourceId: SourceId, run: Runner, force: boolean): Promise<Record<string, unknown>> {
  try {
    const result = await run(force);
    if (result.status === "pending") await recordPending(sourceId);
    if (result.status === "updated") await revalidateDashboard();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source fetch failed";
    await recordValidationFailure(sourceId, message);
    return { status: "error", error: message };
  }
}

export async function pricesWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("ons-prices", runPrices, Boolean(input.force));
}

export async function onsPsfWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("ons-psf", runOns, Boolean(input.force));
}

export async function hmrcReceiptsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("hmrc-receipts", runHmrc, Boolean(input.force));
}

export async function pesaWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("pesa", runPesa, Boolean(input.force));
}

export async function incomeTaxWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("hmrc-income-tax", runIncomeTax, Boolean(input.force));
}

export async function boeYieldsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("boe-yields", runBoe, Boolean(input.force));
}

export async function dmoGiltsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("dmo-gilts", runDmo, Boolean(input.force));
}

export async function obrDatabankWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("obr-databank", runObr, Boolean(input.force));
}

export async function budgetsEventsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("budgets-events", runBudgetsEvents, Boolean(input.force));
}

export async function budgetsObrWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  return settle("budgets-obr", runBudgetsObr, Boolean(input.force));
}

export const DAILY_WORKFLOWS = [
  onsPsfWorkflow,
  pricesWorkflow,
  hmrcReceiptsWorkflow,
  pesaWorkflow,
  incomeTaxWorkflow,
  boeYieldsWorkflow,
  dmoGiltsWorkflow,
  obrDatabankWorkflow,
  budgetsEventsWorkflow,
  budgetsObrWorkflow,
] as const;
