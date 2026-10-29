import { TopicStory } from "@/components/topic-story";
import Link from "next/link";

import { BudgetCaveats } from "@/components/budget-caveats";
import { BudgetScorecard } from "@/components/budget-scorecard";
import { BudgetTimeline } from "@/components/budget-timeline";
import { Breadcrumb, EmptySource, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { PorcupineChart, type PorcupineLine } from "@/components/porcupine-chart";
import { differenceWords, roundDifference, withoutPartYear } from "@/lib/budgets/compare";
import { eventLabel } from "@/lib/budgets/events";
import { loadSeedEvents, withSeedEvents } from "@/lib/budgets/seed";
import { outcomeLabel } from "@/lib/budgets/rules";
import { outturnByFy, yearAheadComparisons, type YearAheadComparison } from "@/lib/budgets/view";
import { formatDateLong, formatMonthYear } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";
import type { budgetsObrDataSchema } from "@/lib/schema";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import type { z } from "zod";

export const revalidate = 3600;

export const metadata = pageMeta({
  title: "How did each UK Budget turn out?",
  description: "OBR borrowing forecasts at every UK Budget and Statement since 2010, compared with what happened, plus fiscal rules and headroom at each.",
  path: "/budgets",
});

export default async function BudgetsPage() {
  const [eventsLoaded, obrLoaded, onsLoaded] = await Promise.all([
    readSnapshot("budgets-events"),
    readSnapshot("budgets-obr"),
    readSnapshot("ons-psf"),
  ]);
  const events = withSeedEvents(takeSnapshot("budgets-events", eventsLoaded.snapshot)?.data.events);
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const vintages = obr?.data.historical.loaded ? obr.data.historical.vintages : [];
  const rows = yearAheadComparisons(events, vintages, ons?.data.series.j5ii?.months ?? [], "psnb");
  const asOf = obrFreshness(obr?.data, obr?.retrievedAt ?? null);
  const firstVerified = events.find((event) => event.dateStatus === "verified");
  const firstLabel = firstVerified
    ? `the ${eventLabel(firstVerified)}`
    : "the first OBR forecast";
  const lines = porcupineLines(events, vintages);
  const outturn = outturnByFy(
    ons?.data.series.j5ii?.months ?? [],
    "psnb",
    [...new Set(lines.flatMap((line) => line.points.map((point) => point.fy)))],
  ).flatMap((row) => (row.value == null ? [] : [{ fy: row.fy, value: row.value }]));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Budgets", "/budgets")} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "UK Budgets and fiscal events since 2010",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: events.map((event, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: eventLabel(event),
            url: `${SITE_URL}/budgets/${event.slug}`,
          })),
        }}
      />
      <Breadcrumb current="Budgets" />
      <PageIntro kicker="Budgets" title="How did each Budget's plans turn out?" lede={indexCite(rows, firstLabel, asOf)} />
      <p className="mb-6 text-sm text-neutral-800 dark:text-neutral-200">{asOf}</p>
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Fiscal events</h2>
        <BudgetTimeline events={events} />
        <p className="mt-3 text-xs text-neutral-700 dark:text-neutral-300">
          This section covers events from {firstLabel} onwards, when the OBR began producing the official forecast. Earlier Treasury forecasts will be added later. A lighter marker is an OBR outlook with no Budget.{" "}
          <Link className="underline decoration-neutral-400 underline-offset-4" href="/budgets/rules">
            Fiscal rules
          </Link>
        </p>
      </section>
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">OBR borrowing forecasts against what happened</h2>
        {obr?.data.historical.loaded && lines.length > 0 ? (
          <>
            <PorcupineChart outturn={outturn} vintages={lines} />
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
              £bn, borrowing. Each thin line is one OBR forecast. The thick line is borrowing as recorded by the ONS (J5II, financial years, bulletin sign). The blue line is the latest loaded vintage. Debt comparisons on an event page use HF6X. {asOf}
            </p>
          </>
        ) : (
          <EmptySource title="OBR forecasts not loaded yet" name="OBR forecasts" detail="The fiscal events are listed above. Forecast comparisons appear once the OBR files are loaded." />
        )}
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium">Scorecard</h2>
        <BudgetScorecard rows={rows} ruleLabel={outcomeLabel("unreviewed")} />
      </section>
      <BudgetCaveats />
      <TopicStory path="/budgets" figures={["packages", "measures"]} title="Fiscal events compared" />
    </>
  );
}

function indexCite(rows: YearAheadComparison[], firstEvent: string, asOf: string): string {
  const comparable = rows.filter((row) => row.difference != null && row.event.obrForecast === "yes" && !row.basisChanged);
  if (comparable.length === 0) {
    return "The year ahead is the first financial year that starts after the event. A lighter marker is an OBR outlook with no Budget.";
  }
  const over = comparable.filter((row) => roundDifference(row.difference ?? 0) < 0).length;
  const under = comparable.filter((row) => roundDifference(row.difference ?? 0) > 0).length;
  const sorted = comparable.map((row) => row.difference ?? 0).sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const left = sorted[mid - 1];
  const right = sorted[mid];
  const median = sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((left ?? 0) + (right ?? 0)) / 2;
  const medianWords = differenceWords(median, "bn");
  const medianBit = medianWords.direction === "matched" ? "matched the outturn" : `£${Math.abs(roundDifference(median)).toFixed(1)}bn ${medianWords.direction}`;
  return `Across ${comparable.length} fiscal events since ${firstEvent}, the OBR's forecast of borrowing for the year ahead was too high ${over} times and too low ${under} times. The median difference was ${medianBit}. ${asOf} Excludes events with no OBR forecast, years that have not ended and forecasts made on an older statistical basis.`;
}

function obrFreshness(data: z.infer<typeof budgetsObrDataSchema> | undefined, retrievedAt: string | null): string {
  if (!data?.historical.loaded) return "OBR data not loaded.";
  const when = data.historical.asOf ?? retrievedAt;
  return when ? `OBR data as of ${formatMonthYear(when)}.` : "OBR data as of an unknown date.";
}

function porcupineLines(
  events: { date: string; slug: string; name: string; shortName: string | null; obrForecast: string }[],
  vintages: { date: string; precision: "day" | "month"; series: string; points: { fy: string; value: number }[] }[],
): PorcupineLine[] {
  const psnb = vintages.filter((vintage) => vintage.series === "psnb");
  const matched = events.flatMap((event) => {
    if (event.obrForecast === "no") return [];
    const vintage = psnb.find((item) => (item.precision === "month" ? event.date.slice(0, 7) === item.date.slice(0, 7) : Math.abs(Date.parse(event.date) - Date.parse(item.date)) <= 7 * 86400000));
    if (!vintage) return [];
    return [{ id: event.slug, name: eventLabel(event), highlight: false, points: withoutPartYear(event.date, vintage.points) }];
  });
  const last = matched.at(-1);
  if (last) last.highlight = true;
  return matched;
}

