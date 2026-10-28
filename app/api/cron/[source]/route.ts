import { start } from "workflow/api";

import { shouldRunSlot } from "@/lib/clock";
import { DAILY_WORKFLOWS, onsPsfWorkflow } from "@/lib/workflows/sources";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ source: string }> },
): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { source } = await context.params;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const slot = url.searchParams.get("slot") === "release" || source === "ons-psf" ? "release" : "daily";
  if (!force && !shouldRunSlot(slot)) {
    return Response.json({ ok: true, skipped: true, slot });
  }
  if (source === "ons-psf") {
    const run = await start(onsPsfWorkflow, [{ force }]);
    return Response.json({ ok: true, runs: [run.runId] });
  }
  if (source === "daily") {
    const runs = [];
    for (const workflow of DAILY_WORKFLOWS) {
      const run = await start(workflow, [{ force }]);
      runs.push(run.runId);
    }
    return Response.json({ ok: true, runs });
  }
  return Response.json({ ok: false, error: "unknown cron" }, { status: 404 });
}
