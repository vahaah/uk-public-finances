import { yearAheadFy } from "@/lib/budgets/events";

export const NOINDEX_PATHS = ["/api", "/data-health"] as const;

export type SitemapEntry = { path: string; lastModified: Date };

export type SitemapDates = {
  now: Date;
  staticDate: Date;
  ons: string | null;
  hmrc: string | null;
  pesa: string | null;
  tax: string | null;
  boe: string | null;
  dmo: string | null;
  obr: string | null;
  databank: string | null;
  prices: string | null;
  events: { slug: string; date: string }[];
  explained: { slug: string; date: string; modified: string | null } | null;
};

export function parseStamp(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function parseDay(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

/** Later valid timestamp, for a page whose JSON-LD dateModified should match the sitemap. */
export function laterStamp(...values: (string | null | undefined)[]): string | null {
  const stamps = values.filter((value): value is string => typeof value === "string" && !Number.isNaN(new Date(value).getTime()));
  if (stamps.length === 0) return null;
  return stamps.reduce((max, value) => (new Date(value).getTime() > new Date(max).getTime() ? value : max));
}

function latest(...dates: Date[]): Date {
  return dates.reduce((max, date) => (date.getTime() > max.getTime() ? date : max));
}

/**
 * The year-ahead comparison stops moving two years after that financial year ends.
 * 31 March, plus two years. An October 2024 Budget compares 2025-26, so it keeps
 * the latest ONS release until 31 March 2028.
 */
export function outturnSettledAt(eventDate: string): Date {
  const endYear = Number(yearAheadFy(eventDate).slice(0, 4)) + 1;
  return new Date(Date.UTC(endYear + 2, 2, 31, 12, 0, 0));
}

/** A Budget page moves with new ONS or OBR data only while its year-ahead outturn is still being revised. */
export function eventLastModified(date: string, now: Date, moving: Date): Date {
  const held = parseDay(date);
  const settledAt = outturnSettledAt(date);
  if (now.getTime() > settledAt.getTime()) return settledAt;
  return latest(held, moving);
}

export function buildSitemapEntries(input: SitemapDates): SitemapEntry[] {
  const ons = parseStamp(input.ons, input.staticDate);
  const hmrc = parseStamp(input.hmrc, input.staticDate);
  const pesa = parseStamp(input.pesa, input.staticDate);
  const tax = parseStamp(input.tax, input.staticDate);
  const boe = parseStamp(input.boe, input.staticDate);
  const dmo = parseStamp(input.dmo, input.staticDate);
  const obr = parseStamp(input.obr, input.staticDate);
  const databank = parseStamp(input.databank, input.staticDate);
  const prices = parseStamp(input.prices, input.staticDate);
  const moving = latest(ons, obr);
  const pages: SitemapEntry[] = [
    { path: "/", lastModified: ons },
    { path: "/receipts", lastModified: hmrc },
    { path: "/spending", lastModified: pesa },
    { path: "/borrowing", lastModified: ons },
    { path: "/debt", lastModified: latest(ons, boe, dmo) },
    { path: "/taxpayers", lastModified: latest(tax, obr) },
    { path: "/forecasts", lastModified: latest(ons, databank) },
    { path: "/forecasts/history", lastModified: databank },
    { path: "/budgets", lastModified: latest(ons, obr, ...input.events.map((event) => parseDay(event.date))) },
    { path: "/budgets/rules", lastModified: latest(input.staticDate, obr) },
  ];
  if (input.explained) {
    pages.push({
      path: `/budgets/${input.explained.slug}/explained`,
      lastModified: latest(parseDay(input.explained.date), parseStamp(input.explained.modified, parseDay(input.explained.date))),
    });
  }
  for (const event of input.events) {
    pages.push({ path: `/budgets/${event.slug}`, lastModified: eventLastModified(event.date, input.now, moving) });
  }
  pages.push(
    { path: "/old-money", lastModified: prices },
    { path: "/records", lastModified: latest(ons, hmrc) },
    { path: "/methodology", lastModified: input.staticDate },
    { path: "/data-sources", lastModified: input.staticDate },
    { path: "/glossary", lastModified: input.staticDate },
    { path: "/faq", lastModified: latest(input.staticDate, ons, hmrc, databank) },
  );
  return pages;
}
