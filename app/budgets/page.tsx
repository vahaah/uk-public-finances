import Link from "next/link";

import { BudgetScorecard } from "@/components/budget-scorecard";
import { BudgetTimeline } from "@/components/budget-timeline";
import { Breadcrumb, EmptySource, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { PorcupineChart, type PorcupineLine } from "@/components/porcupine-chart";
import { loadSeedEvents } from "@/lib/budgets/seed";
import { outcomeLabel } from "@/lib/budgets/rules";
import { withoutPartYear } from "@/lib/budgets/compare";
import { outturnByFy, yearAheadComparisons } from "@/lib/budgets/view";
import { formatDateLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import type { budgetsObrDataSchema } from "@/lib/schema";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import type { z } from "zod";

export const revalidate = 3600;

export const metadata = pageMeta({
  title: "Budgets: how each plan turned out",
  description: "Fiscal events since June 2010, and how the OBR's year-ahead borrowing forecast compared with the ONS outturn.",
  path: "/budgets",
});

export default async function BudgetsPage() {
  const [eventsLoaded, obrLoaded, onsLoaded] = await Promise.all([
    readSnapshot("budgets-events"),
    readSnapshot("budgets-obr"),
    readSnapshot("ons-psf"),
  ]);
  const events = takeSnapshot("budgets-events", eventsLoaded.snapshot)?.data.events ?? loadSeedEvents();
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const vintages = obr?.data.historical.loaded ? obr.data.historical.vintages : [];
  const rows = yearAheadComparisons(events, vintages, ons?.data.series.j5ii?.months ?? [], "psnb");
  const asOf = obrFreshness(obr?.data, obr?.retrievedAt ?? null);
  const lines = porcupineLines(events, vintages);
  const outturn = outturnByFy(
    ons?.data.series.j5ii?.months ?? [],
    "psnb",
    [...new Set(lines.flatMap((line) => line.points.map((point) => point.fy)))],
  ).flatMap((row) => (row.value == null ? [] : [{ fy: row.fy, value: row.value }]));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Budgets", "/budgets")} />
      <Breadcrumb current="Budgets" />
      <PageIntro
        kicker="Budgets"
        title="How did each Budget's plans turn out?"
        lede="Each marker is a fiscal event since June 2010. The year-ahead forecast is the first financial year that starts after the event. Part-year forecasts are left out. A lighter marker is an OBR outlook with no Budget. Placeholder copy."
      />
      <p className="mb-6 text-sm text-neutral-800 dark:text-neutral-200">{asOf}</p>
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Timeline</h2>
        <BudgetTimeline events={events} />
        <p className="mt-3 text-xs text-neutral-700 dark:text-neutral-300">
          Events before June 2010 are out of scope.{" "}
          <Link className="underline decoration-neutral-400 underline-offset-4" href="/budgets/rules">
            Fiscal rules
          </Link>
        </p>
      </section>
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Forecasts against outturn</h2>
        {obr?.data.historical.loaded && lines.length > 0 ? (
          <>
            <PorcupineChart outturn={outturn} vintages={lines} />
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
              £bn, borrowing. The black line is the ONS outturn for J5II, summed over each financial year and shown with the bulletin sign. Grey lines are OBR vintages from the year ahead. The blue line is the latest loaded vintage. {asOf}
            </p>
          </>
        ) : (
          <EmptySource name="OBR forecasts" pending detail="OBR data not loaded. Upload the historical official forecasts database, then run the daily update." />
        )}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium">Scorecard</h2>
        <BudgetScorecard rows={rows} ruleLabel={outcomeLabel("unreviewed")} />
        <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
          Rule outcomes are not assessed until a reviewed entry says so. The stored difference is outturn minus forecast.
        </p>
      </section>
    </>
  );
}

function obrFreshness(data: z.infer<typeof budgetsObrDataSchema> | undefined, retrievedAt: string | null): string {
  if (!data?.historical.loaded) return "OBR data not loaded.";
  const when = data.historical.asOf ?? retrievedAt;
  return when ? `OBR data as of ${formatDateLong(when)}.` : "OBR data as of an unknown date.";
}

function porcupineLines(
  events: { date: string; slug: string; name: string; obrForecast: string }[],
  vintages: { date: string; precision: "day" | "month"; series: string; points: { fy: string; value: number }[] }[],
): PorcupineLine[] {
  const psnb = vintages.filter((vintage) => vintage.series === "psnb");
  const matched = events.flatMap((event) => {
    if (event.obrForecast === "no") return [];
    const vintage = psnb.find((item) => (item.precision === "month" ? event.date.slice(0, 7) === item.date.slice(0, 7) : Math.abs(Date.parse(event.date) - Date.parse(item.date)) <= 7 * 86400000));
    if (!vintage) return [];
    return [{ id: event.slug, name: event.name, highlight: false, points: withoutPartYear(event.date, vintage.points) }];
  });
  const last = matched.at(-1);
  if (last) last.highlight = true;
  return matched;
}

