import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const fiscalEventSchema = z.object({
  slug: z.string().min(1),
  date,
  name: z.string().min(1),
  shortName: z.string().min(1).max(28).nullable(),
  type: z.enum(["budget", "statement", "emergency", "growth-plan", "forecast-only", "spending-review"]),
  chancellor: z.string().min(1),
  government: z.string().min(1),
  obrForecast: z.enum(["yes", "no", "unknown"]),
  weight: z.enum(["full", "light"]),
  govukPath: z.string().nullable(),
  dateStatus: z.enum(["verified", "unverified", "discovered", "mismatch"]),
  status: z.enum(["listed", "pending"]),
  observedDate: date.nullable(),
});

export type FiscalEvent = z.infer<typeof fiscalEventSchema>;

export const fiscalEventsDataSchema = z.object({
  events: z.array(fiscalEventSchema).min(1),
  checkedAt: z.string().nullable(),
});

export type FiscalEventsData = z.infer<typeof fiscalEventsDataSchema>;

export type GovukHit = { title?: string; link?: string; public_timestamp?: string };

const NOISE = /factsheet|ootlar|deflator|representations|guidance|date confirmed|what it means|regions and nations|overview of tax|libor|policy decisions table|news:/i;
const EVENT_WORD = /\b(budget|autumn statement|spring statement|growth plan|spending review)\b/i;

export function eventLabel(event: { name: string; shortName?: string | null }): string {
  return event.shortName && event.shortName.length > 0 ? event.shortName : event.name;
}

/**
 * First financial year that starts after the event. A year starts on 1 April.
 * A March event is still in the financial year that ends in early April, so the
 * year ahead is the year that starts that April. That matches the OBR's
 * one-year-ahead horizon: a forecast made in the previous financial year for
 * the next one. The year already underway is the in-year forecast and is excluded.
 */
export function yearAheadFy(isoDate: string): string {
  const [yearText, monthText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startYear = month >= 4 ? year + 1 : year;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/** Financial year that contains the date, for placing a marker on an April to March axis. */
export function financialYearOf(isoDate: string): string {
  const [yearText, monthText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

export function discoverEvents(seed: FiscalEvent[], hits: GovukHit[]): FiscalEvent[] {
  const known = new Set(seed.map((event) => event.govukPath).filter((value): value is string => Boolean(value)));
  const found: FiscalEvent[] = [];
  for (const hit of hits) {
    const link = hit.link ?? "";
    const title = hit.title ?? "";
    if (!link.startsWith("/government/publications/") && !link.startsWith("/government/speeches/")) continue;
    if (known.has(link) || found.some((event) => event.govukPath === link)) continue;
    if (NOISE.test(title) || !EVENT_WORD.test(title)) continue;
    if (!/\b(documents|document|speech)\b/i.test(title)) continue;
    const stamp = (hit.public_timestamp ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stamp)) continue;
    const latest = seed.reduce((max, event) => (event.date > max ? event.date : max), "0000-00-00");
    if (stamp <= latest) continue;
    found.push({
      slug: slugFrom(stamp, title),
      date: stamp,
      name: title.replace(/:\s*documents$/i, "").replace(/:\s*document$/i, ""),
      shortName: shortenEventName(title.replace(/:\s*documents$/i, "").replace(/:\s*document$/i, "")),
      type: /growth plan/i.test(title) ? "growth-plan" : /statement/i.test(title) ? "statement" : /spending review/i.test(title) ? "spending-review" : "budget",
      chancellor: "Not confirmed",
      government: "Not confirmed",
      obrForecast: "unknown",
      weight: "full",
      govukPath: link,
      dateStatus: "discovered",
      status: "pending",
      observedDate: stamp,
    });
  }
  return found;
}

export function applyContentDate(event: FiscalEvent, firstPublishedAt: string | null): FiscalEvent {
  if (!firstPublishedAt) return event;
  const observed = firstPublishedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observed) || observed === event.date) return event;
  return { ...event, dateStatus: "mismatch", observedDate: observed };
}

export function markerPeriod(date: string, periods: string[]): string | null {
  const month = date.slice(0, 7);
  if (periods.includes(month)) return month;
  const year = date.slice(0, 4);
  if (periods.includes(year)) return year;
  const fy = financialYearOf(date);
  if (periods.includes(fy)) return fy;
  return null;
}

function shortenEventName(name: string): string | null {
  if (name.length <= 28) return null;
  const cut = name.slice(0, 28);
  const space = cut.lastIndexOf(" ");
  return (space > 12 ? cut.slice(0, space) : cut).trim();
}

function slugFrom(isoDate: string, title: string): string {
  const stem = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${isoDate.slice(0, 7)}-${stem}`;
}
