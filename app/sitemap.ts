import type { MetadataRoute } from "next";

import { loadSeedEvents } from "@/lib/budgets/seed";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ons, hmrc, pesa, tax, boe, obr] = await Promise.all([
    readSnapshot("ons-psf"),
    readSnapshot("hmrc-receipts"),
    readSnapshot("pesa"),
    readSnapshot("hmrc-income-tax"),
    readSnapshot("boe-yields"),
    readSnapshot("budgets-obr"),
  ]);
  const onsDate = dateOf(takeSnapshot("ons-psf", ons.snapshot)?.releaseDate);
  const hmrcDate = dateOf(takeSnapshot("hmrc-receipts", hmrc.snapshot)?.releaseDate);
  const pesaDate = dateOf(takeSnapshot("pesa", pesa.snapshot)?.releaseDate);
  const taxDate = dateOf(takeSnapshot("hmrc-income-tax", tax.snapshot)?.releaseDate);
  const boeDate = dateOf(takeSnapshot("boe-yields", boe.snapshot)?.releaseDate);
  const staticDate = dateOf(process.env.BUILD_COMMIT_DATE);
  const obrSnapshot = takeSnapshot("budgets-obr", obr.snapshot);
  const obrDate = dateOf(obrSnapshot?.releaseDate ?? obrSnapshot?.retrievedAt);
  // An event page changes when the event happens, when the OBR files are reloaded, and when ONS outturn arrives.
  const eventDate = (date: string) => new Date(Math.min(Date.now(), Math.max(new Date(`${date}T12:00:00Z`).getTime(), obrDate.getTime(), onsDate.getTime())));
  const pages: { path: string; lastModified: Date; changeFrequency: "daily" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", lastModified: onsDate, changeFrequency: "monthly", priority: 1 },
    { path: "/receipts", lastModified: hmrcDate, changeFrequency: "monthly", priority: 0.8 },
    { path: "/spending", lastModified: pesaDate, changeFrequency: "yearly", priority: 0.8 },
    { path: "/borrowing", lastModified: onsDate, changeFrequency: "monthly", priority: 0.8 },
    { path: "/debt", lastModified: onsDate ?? boeDate, changeFrequency: "monthly", priority: 0.8 },
    { path: "/taxpayers", lastModified: taxDate, changeFrequency: "yearly", priority: 0.7 },
    { path: "/forecasts", lastModified: onsDate, changeFrequency: "monthly", priority: 0.6 },
    { path: "/forecasts/history", lastModified: onsDate, changeFrequency: "monthly", priority: 0.3 },
    { path: "/budgets", lastModified: obrDate > onsDate ? obrDate : onsDate, changeFrequency: "monthly", priority: 0.7 },
    { path: "/budgets/rules", lastModified: staticDate, changeFrequency: "yearly", priority: 0.5 },
    ...loadSeedEvents().map((event) => ({ path: `/budgets/${event.slug}`, lastModified: eventDate(event.date), changeFrequency: "monthly" as const, priority: 0.4 })),
    { path: "/old-money", lastModified: staticDate, changeFrequency: "monthly", priority: 0.6 },
    { path: "/records", lastModified: onsDate, changeFrequency: "monthly", priority: 0.6 },
    { path: "/methodology", lastModified: staticDate, changeFrequency: "yearly", priority: 0.4 },
    { path: "/data-sources", lastModified: staticDate, changeFrequency: "yearly", priority: 0.4 },
    { path: "/glossary", lastModified: staticDate, changeFrequency: "yearly", priority: 0.5 },
    { path: "/faq", lastModified: staticDate, changeFrequency: "yearly", priority: 0.5 },
  ];
  return pages.map((page) => ({
    url: page.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${page.path}`,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

function dateOf(value: string | null | undefined): Date {
  const fallback = new Date(process.env.BUILD_COMMIT_DATE ?? "2026-10-28T00:00:00.000Z");
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}
