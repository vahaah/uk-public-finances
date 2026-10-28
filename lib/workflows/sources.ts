import {
  revalidateDashboard,
  runBoe,
  runDmo,
  runHmrc,
  runIncomeTax,
  runObr,
  runOns,
  runPesa,
} from "@/lib/workflows/steps";

type Input = { force?: boolean };

export async function onsPsfWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runOns(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export async function hmrcReceiptsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runHmrc(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export async function pesaWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runPesa(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export async function incomeTaxWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runIncomeTax(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export async function boeYieldsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runBoe(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export async function dmoGiltsWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runDmo(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export async function obrDatabankWorkflow(input: Input): Promise<Record<string, unknown>> {
  "use workflow";
  const result = await runObr(Boolean(input.force));
  if (result.status === "updated") await revalidateDashboard();
  return result;
}

export const DAILY_WORKFLOWS = [
  onsPsfWorkflow,
  hmrcReceiptsWorkflow,
  pesaWorkflow,
  incomeTaxWorkflow,
  boeYieldsWorkflow,
  dmoGiltsWorkflow,
  obrDatabankWorkflow,
] as const;
