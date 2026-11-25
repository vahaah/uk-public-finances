import { TopicStory } from "@/components/topic-story";
import { StoryStepper } from "@/components/story-stepper";
import Link from "next/link";

import { BudgetCaveats } from "@/components/budget-caveats";
import { BudgetScorecard } from "@/components/budget-scorecard";
import { BudgetTimeline } from "@/components/budget-timeline";
import { BudgetsChart } from "@/components/budgets-chart";
import { CiteShare } from "@/components/cite-share";
import { Breadcrumb, EmptySource, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { differenceWords, roundDifference } from "@/lib/budgets/compare";
import { eventLabel } from "@/lib/budgets/events";
import { porcupineLines } from "@/lib/budgets/porcupine";
import { withSeedEvents } from "@/lib/budgets/seed";
import { outcomeLabel } from "@/lib/budgets/rules";
import { yearAheadComparisons, type YearAheadComparison } from "@/lib/budgets/view";
import { formatMonthYear } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";
import { PAGE_COPY } from "@/lib/page-copy";
import type { budgetsObrDataSchema } from "@/lib/schema";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import type { z } from "zod";

export const revalidate = 3600;

export const metadata = pageMeta({
  title: PAGE_COPY.budgets.title,
  description: PAGE_COPY.budgets.description,
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
  const hasChart = porcupineLines(events, vintages).length > 0;
  const cite = indexCite(rows, firstLabel, asOf);
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
      <PageIntro kicker="Budgets" title="How did each Budget's plans turn out?" lede={cite} />
      <CiteShare sentence={cite} citation={`${cite} Via budget.vahaah.com/budgets.`} url={`${SITE_URL}/budgets`} />
      <StoryStepper current="/budgets" />
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
      <section id="borrowing-forecasts" className="mb-8 scroll-mt-28">
        <h2 className="mb-3 text-sm font-medium">OBR borrowing forecasts against what happened</h2>
        {obr?.data.historical.loaded && hasChart ? (
          <>
            <BudgetsChart />
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
              £bn, borrowing. Each thin line is one OBR forecast. The thick line is borrowing as recorded by the ONS (J5II, financial years, bulletin sign). The blue line is the latest loaded vintage{latestVintageDate(obr?.data) ? `, ${formatMonthYear(latestVintageDate(obr?.data)!)}` : ""}. Debt comparisons on an event page use HF6X. {asOf}
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
  const newest = latestVintageDate(data);
  if (when && newest && newest.slice(0, 7) > when.slice(0, 7)) {
    return `Scorecard: OBR forecasts database as of ${formatMonthYear(when)}; latest forecast loaded: ${formatMonthYear(newest)}.`;
  }
  return when ? `OBR data as of ${formatMonthYear(when)}.` : "OBR data as of an unknown date.";
}

function latestVintageDate(data: z.infer<typeof budgetsObrDataSchema> | undefined): string | null {
  const dates = (data?.historical.vintages ?? []).filter((vintage) => vintage.series === "psnb").map((vintage) => vintage.date).sort();
  return dates.at(-1) ?? null;
}


