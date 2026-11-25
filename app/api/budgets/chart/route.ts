import { porcupineLines } from "@/lib/budgets/porcupine";
import { outturnByFy } from "@/lib/budgets/view";
import { withSeedEvents } from "@/lib/budgets/seed";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 60;

/** Porcupine series, loaded when the chart scrolls into view so it is not in the page HTML. */
export async function GET(): Promise<Response> {
  const [eventsLoaded, obrLoaded, onsLoaded] = await Promise.all([
    readSnapshot("budgets-events"),
    readSnapshot("budgets-obr"),
    readSnapshot("ons-psf"),
  ]);
  const events = withSeedEvents(takeSnapshot("budgets-events", eventsLoaded.snapshot)?.data.events);
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const vintages = obr?.data.historical.loaded ? obr.data.historical.vintages : [];
  const lines = porcupineLines(events, vintages);
  const outturn = outturnByFy(
    ons?.data.series.j5ii?.months ?? [],
    "psnb",
    [...new Set(lines.flatMap((line) => line.points.map((point) => point.fy)))],
  ).flatMap((row) => (row.value == null ? [] : [{ fy: row.fy, value: Number(row.value.toFixed(1)) }]));
  return Response.json(
    { lines, outturn },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}
