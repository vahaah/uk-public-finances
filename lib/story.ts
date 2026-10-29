import type { FiscalEvent } from "@/lib/budgets/events";
import type { ForecastSeriesId } from "@/lib/budgets/forecasts";
import { withSeedEvents } from "@/lib/budgets/seed";
import type { SnapshotOf } from "@/lib/schema";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export type ObrData = SnapshotOf<"budgets-obr">["data"];
export type EfoData = NonNullable<NonNullable<ObrData["efo"]>["data"]>;
type Vintage = ObrData["historical"]["vintages"][number];

export async function loadObr(): Promise<{ data: ObrData | null; releaseDate: string | null }> {
  const loaded = await readSnapshot("budgets-obr");
  const snapshot = takeSnapshot("budgets-obr", loaded.snapshot);
  return { data: snapshot?.data ?? null, releaseDate: snapshot?.releaseDate ?? null };
}

export const SERIES_META: Record<"gdp" | "cpi" | "psnb" | "psnfl_pct" | "psnd_pct", { title: string; unit: "pct" | "bn" | "pctGdp"; short: string }> = {
  gdp: { title: "Real GDP growth", unit: "pct", short: "GDP growth" },
  cpi: { title: "CPI inflation", unit: "pct", short: "Inflation" },
  psnb: { title: "Public sector net borrowing", unit: "bn", short: "Borrowing" },
  psnfl_pct: { title: "Public sector net financial liabilities", unit: "pctGdp", short: "Net financial liabilities" },
  psnd_pct: { title: "Public sector net debt", unit: "pctGdp", short: "Net debt" },
};

const sameEvent = (event: FiscalEvent, vintage: Vintage) =>
  vintage.precision === "month" ? vintage.date.slice(0, 7) === event.date.slice(0, 7) : Math.abs(Date.parse(vintage.date) - Date.parse(event.date)) <= 7 * 86400000;

export type EventCompare = {
  series: keyof typeof SERIES_META;
  currentLabel: string;
  previousLabel: string;
  points: { period: string; current: number | null; previous: number | null }[];
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const vintageMonth = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** This event's OBR forecast against the forecast before it, for each series both carry. */
export function eventComparisons(event: FiscalEvent, vintages: Vintage[]): EventCompare[] {
  const out: EventCompare[] = [];
  for (const series of ["gdp", "cpi", "psnb", "psnfl_pct", "psnd_pct"] as const) {
    const own = vintages.filter((vintage) => vintage.series === series);
    const current = own.find((vintage) => sameEvent(event, vintage));
    if (!current) continue;
    const previous = own.filter((vintage) => vintage.date < current.date && !sameEvent(event, vintage)).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    if (!previous) continue;
    const start = event.date.slice(0, 4);
    const prev = new Map(previous.points.map((point) => [point.fy, point.value]));
    const points = current.points
      .filter((point) => point.fy.slice(0, 4) >= start)
      .slice(0, 6)
      .map((point) => ({ period: point.fy, current: point.value, previous: prev.get(point.fy) ?? null }));
    if (points.filter((point) => point.previous != null).length < 2) continue;
    out.push({ series, currentLabel: vintageMonth(current.date), previousLabel: vintageMonth(previous.date), points });
  }
  if (out.some((item) => item.series === "psnfl_pct")) return out.filter((item) => item.series !== "psnd_pct");
  return out;
}

/** Number of OBR-scored measures at each event, and their average size in the third year, from the OBR policy measures database. */
export function measuresPerEvent(rows: ObrData["measures"]["rows"], events: FiscalEvent[]) {
  const byDate = new Map<string, { count: number; sum: number; valued: number }>();
  for (const row of rows) {
    if (!row.eventDate) continue;
    const entry = byDate.get(row.eventDate) ?? { count: 0, sum: 0, valued: 0 };
    entry.count += 1;
    if (row.year3 != null) {
      entry.sum += Math.abs(row.year3);
      entry.valued += 1;
    }
    byDate.set(row.eventDate, entry);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => {
      const event = events.find((item) => item.date === date);
      return { date, slug: event?.slug ?? null, name: event?.name ?? date, count: entry.count, averageBn: entry.valued ? entry.sum / entry.valued / 1000 : null };
    });
}

export const OBR_SOURCE = {
  publisher: "Office for Budget Responsibility",
  url: "https://obr.uk/data/",
  licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  sourceId: "budgets-obr" as const,
};

export function efoSourceTitle(efo: EfoData): string {
  return `${efo.currentLabel ?? "Latest"} Economic and fiscal outlook: charts and tables`;
}

export type SeriesId = ForecastSeriesId;

export async function storyEvents(): Promise<FiscalEvent[]> {
  const loaded = await readSnapshot("budgets-events");
  return withSeedEvents(takeSnapshot("budgets-events", loaded.snapshot)?.data.events);
}

/** The event whose EFO charts are loaded: the flagship explained story. */
export async function latestStory(): Promise<{ event: FiscalEvent; efo: EfoData; obr: ObrData; releaseDate: string | null } | null> {
  const [{ data, releaseDate }, events] = await Promise.all([loadObr(), storyEvents()]);
  const efo = data?.efo?.data;
  if (!data || !efo?.eventDate) return null;
  const event = events.find((item) => item.date === efo.eventDate);
  return event ? { event, efo, obr: data, releaseDate } : null;
}

export type StoryStep = { href: string; label: string; blurb: string };

/** One reading order for the whole site: the big picture, each part of it, then the fiscal events. */
export function storySteps(latest: { slug: string; label: string } | null): StoryStep[] {
  const steps: StoryStep[] = [
    { href: "/", label: "Overview", blurb: "What the government takes in, spends and borrows" },
    { href: "/borrowing", label: "Borrowing", blurb: "The gap between spending and receipts" },
    { href: "/debt", label: "Debt and interest", blurb: "What past borrowing adds up to, and what it costs" },
    { href: "/receipts", label: "Tax receipts", blurb: "Where the money comes from" },
    { href: "/spending", label: "Spending", blurb: "Where the money goes" },
    { href: "/forecasts", label: "Forecasts", blurb: "What the OBR expects next" },
    { href: "/budgets", label: "Budgets", blurb: "Every fiscal event and how its forecast turned out" },
  ];
  if (latest) {
    steps.push({ href: `/budgets/${latest.slug}`, label: latest.label, blurb: "The numbers from the latest Budget" });
    steps.push({ href: `/budgets/${latest.slug}/explained`, label: `${latest.label} explained`, blurb: "The story in eleven charts" });
  }
  return steps;
}
