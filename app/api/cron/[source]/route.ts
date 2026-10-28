import { timingSafeEqual } from "node:crypto";

import { head, put } from "@vercel/blob";
import { start } from "workflow/api";

import { evaluateSlot, londonParts, type Slot, type SlotRun } from "@/lib/clock";
import { DAILY_WORKFLOWS, onsPsfWorkflow } from "@/lib/workflows/sources";

export const runtime = "nodejs";

const memory = new Map<Slot, SlotRun>();

export async function GET(
  request: Request,
  context: { params: Promise<{ source: string }> },
): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header || !bearerMatches(header, secret)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { source } = await context.params;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const slot: Slot = url.searchParams.get("slot") === "release" || source === "ons-psf" ? "release" : "daily";
  if (source !== "ons-psf" && source !== "daily") {
    return Response.json({ ok: false, error: "unknown cron", reason: `No cron named ${source}.` }, { status: 404 });
  }
  const decision = force
    ? { run: true as const, londonDate: londonParts().date, reason: "Forced run." }
    : evaluateSlot({ slot, lastRun: await readMarker(slot) });
  if (!decision.run) {
    return Response.json({ ok: true, skipped: true, slot, reason: decision.reason });
  }
  await writeMarker(slot, decision.londonDate);
  if (source === "ons-psf") {
    try {
      const run = await start(onsPsfWorkflow, [{ force }]);
      return Response.json({ ok: true, slot, reason: decision.reason, runs: [{ ok: true, runId: run.runId }] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow failed to start";
      return Response.json({ ok: false, slot, reason: decision.reason, runs: [{ ok: false, error: message }] }, { status: 500 });
    }
  }
  const settled = await Promise.allSettled(DAILY_WORKFLOWS.map((workflow) => start(workflow, [{ force }])));
  const runs = settled.map((result) =>
    result.status === "fulfilled"
      ? { ok: true, runId: result.value.runId }
      : { ok: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
  );
  const failed = runs.some((run) => !run.ok);
  return Response.json({ ok: !failed, slot, reason: decision.reason, runs }, { status: failed ? 500 : 200 });
}

function bearerMatches(header: string, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

async function readMarker(slot: Slot): Promise<SlotRun | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return memory.get(slot) ?? null;
  try {
    const blob = await head(`cron/${slot}.json`);
    const body = (await fetch(blob.url, { cache: "no-store" }).then((response) => response.json())) as {
      londonDate?: string;
    };
    if (!body.londonDate) return null;
    return { londonDate: body.londonDate, slot };
  } catch {
    return memory.get(slot) ?? null;
  }
}

async function writeMarker(slot: Slot, londonDate: string): Promise<void> {
  memory.set(slot, { londonDate, slot });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(`cron/${slot}.json`, JSON.stringify({ londonDate, slot }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json",
  });
}
