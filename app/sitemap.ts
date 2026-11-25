import type { MetadataRoute } from "next";

import { loadSeedEvents } from "@/lib/budgets/seed";
import { buildSitemapEntries, parseStamp } from "@/lib/sitemap-entries";
import { SITE_URL } from "@/lib/site";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ons, hmrc, pesa, tax, boe, dmo, prices, obr, databank] = await Promise.all([
    readSnapshot("ons-psf"),
    readSnapshot("hmrc-receipts"),
    readSnapshot("pesa"),
    readSnapshot("hmrc-income-tax"),
    readSnapshot("boe-yields"),
    readSnapshot("dmo-gilts"),
    readSnapshot("ons-prices"),
    readSnapshot("budgets-obr"),
    readSnapshot("obr-databank"),
  ]);
  const obrSnapshot = takeSnapshot("budgets-obr", obr.snapshot);
  const efoDate = obrSnapshot?.data.efo?.data?.eventDate ?? null;
  const efoEvent = efoDate ? loadSeedEvents().find((event) => event.date === efoDate) : undefined;
  const staticDate = parseStamp(process.env.BUILD_COMMIT_DATE, new Date("2026-10-28T00:00:00.000Z"));
  const entries = buildSitemapEntries({
    now: new Date(),
    staticDate,
    ons: takeSnapshot("ons-psf", ons.snapshot)?.releaseDate ?? null,
    hmrc: takeSnapshot("hmrc-receipts", hmrc.snapshot)?.releaseDate ?? null,
    pesa: takeSnapshot("pesa", pesa.snapshot)?.releaseDate ?? null,
    tax: takeSnapshot("hmrc-income-tax", tax.snapshot)?.releaseDate ?? null,
    boe: takeSnapshot("boe-yields", boe.snapshot)?.releaseDate ?? null,
    dmo: takeSnapshot("dmo-gilts", dmo.snapshot)?.releaseDate ?? null,
    prices: takeSnapshot("ons-prices", prices.snapshot)?.releaseDate ?? null,
    obr: obrSnapshot?.releaseDate ?? obrSnapshot?.retrievedAt ?? null,
    databank: takeSnapshot("obr-databank", databank.snapshot)?.releaseDate ?? null,
    events: loadSeedEvents().map((event) => ({ slug: event.slug, date: event.date })),
    explained: efoEvent ? { slug: efoEvent.slug, date: efoEvent.date, modified: obrSnapshot?.releaseDate ?? null } : null,
  });
  return entries.map((entry) => ({
    url: entry.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${entry.path}`,
    lastModified: entry.lastModified,
  }));
}
