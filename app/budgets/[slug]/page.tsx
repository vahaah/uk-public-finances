import { measureHeadLabel } from "@/lib/budgets/measure-heads";
import { StoryStepper } from "@/components/story-stepper";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BudgetCaveats } from "@/components/budget-caveats";
import { StoryNav } from "@/components/story-nav";
import { CompareFigure, PolicyFigure } from "@/components/story-sections";
import { CompareBars } from "@/components/story-charts";
import { SourceNote } from "@/components/blocks";
import { formatUnit } from "@/lib/story-format";
import { eventComparisons, efoSourceTitle, OBR_SOURCE, SERIES_META, type ObrData } from "@/lib/story";
import { AUTHOR_JSON_LD, Breadcrumb, DataTable, EmptySource, JsonLd, PageIntro, Stat, breadcrumbJsonLd } from "@/components/blocks";
import { formatSignedDifference, roundDifference } from "@/lib/budgets/compare";
import { eventLabel, financialYearOf, yearAheadFy, type FiscalEvent } from "@/lib/budgets/events";
import { fiscalYearPlus, type ForecastSeriesId } from "@/lib/budgets/forecasts";
import { outcomeLabel, regimesAt } from "@/lib/budgets/rules";
import { loadRuleRegimes, loadSeedEvents, withSeedEvents } from "@/lib/budgets/seed";
import { seriesPoints, yearAheadComparisons, type YearAheadComparison } from "@/lib/budgets/view";
import { formatBillions, formatDateLong, formatMillions, formatMonthYear, formatPercent } from "@/lib/format";
import { forecastFor, vintageLabel } from "@/lib/forecasts-view";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams(): { slug: string }[] {
  return loadSeedEvents().map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event) return pageMeta({ title: "Budget", description: "Fiscal event", path: `/budgets/${slug}` });
  const label = eventLabel(event);
  const { borrowing } = await loadEventView(event);
  const when = event.dateStatus === "verified" ? formatDateLong(event.date) : null;
  const heading = eventHeading(event, label, borrowing);
  return pageMeta({
    title: hasOutturn(event, borrowing) ? `${label}: forecast and outturn` : heading,
    description: eventDescription(event, label, when, borrowing),
    path: `/budgets/${slug}`,
    og: { kicker: "Budgets", title: hasOutturn(event, borrowing) ? `${label}: forecast vs outturn` : heading, detail: when ? `${when} · ${event.chancellor}` : event.chancellor },
    keywords: eventKeywords(event, label),
  });
}

/** OBR forecast for the year ahead and its outturn. Shared by the page and its metadata. */
async function loadEventView(event: FiscalEvent) {
  const [obrLoaded, onsLoaded, databankLoaded] = await Promise.all([readSnapshot("budgets-obr"), readSnapshot("ons-psf"), readSnapshot("obr-databank")]);
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const databank = takeSnapshot("obr-databank", databankLoaded.snapshot);
  const loaded = obr?.data.historical.loaded === true;
  const historical = loaded
    ? yearAheadComparisons([event], obr?.data.historical.vintages ?? [], ons?.data.series.j5ii?.months ?? [], "psnb")[0]
    : null;
  // A new event's forecast reaches the OBR databank (fetched daily) long before the historical
  // forecasts database. Use the databank when its vintage is this event's month.
  const borrowing = historical?.forecast != null ? historical : (databankForecast(event, databank?.data) ?? historical);
  return { obr, ons, loaded, borrowing };
}

/** True once the year-ahead outturn is known, or when there is no OBR forecast to wait on. */
function hasOutturn(event: FiscalEvent, borrowing: YearAheadComparison | null | undefined): boolean {
  return event.obrForecast === "no" || (borrowing?.outturn != null && borrowing.difference != null);
}

/** Until the outturn exists, ask only what was forecast. */
function eventHeading(event: FiscalEvent, label: string, borrowing: YearAheadComparison | null | undefined): string {
  const name = HEADINGS[event.slug] ?? label;
  return hasOutturn(event, borrowing) ? `What did ${name} forecast, and what happened?` : `What did ${name} forecast?`;
}

/** Popular names people search for, beside the official name. */
const POPULAR_NAMES: Record<string, string[]> = {
  "2022-09-growth-plan": ["mini-budget", "mini-budget 2022", "Kwarteng mini-budget"],
  "2010-06-emergency-budget": ["June 2010 Budget", "Osborne emergency budget"],
  "2010-11-obr-outlook": ["OBR November 2010 forecast"],
};

/** H1 wording where the plain label reads badly. */
const HEADINGS: Record<string, string> = {
  "2010-06-emergency-budget": "the June 2010 Emergency Budget",
  "2010-11-obr-outlook": "the OBR's November 2010 outlook",
  "2022-09-growth-plan": "the Growth Plan 2022 (the mini-budget)",
};

function eventKeywords(event: FiscalEvent, label: string): string[] {
  return [label, event.name, ...(POPULAR_NAMES[event.slug] ?? []), "OBR forecast", "UK borrowing", event.chancellor].filter(
    (item, index, all) => item && all.indexOf(item) === index,
  );
}

function eventDescription(event: FiscalEvent, label: string, when: string | null, borrowing: YearAheadComparison | null | undefined): string {
  const named = /^(Growth Plan|Emergency Budget|OBR outlook)/.test(label) ? `the ${label}` : label;
  const at = `At ${named}${when ? ` (${when})` : ""}`;
  const popular = event.slug === "2022-09-growth-plan" ? " This was the September 2022 'mini-budget'." : "";
  const chancellor = ` Chancellor: ${event.chancellor}.`;
  if (event.obrForecast === "no") return `${at}, the OBR did not publish a forecast. HM Treasury documents and policy measures.${popular}${chancellor}`;
  if (!borrowing || borrowing.forecast == null) {
    return event.status === "pending"
      ? `${at}. The OBR forecast for borrowing, receipts, spending and debt is still to come on this site.${chancellor}`
      : `What the OBR forecast at ${named} for UK borrowing, and what the ONS later recorded.${popular}${chancellor}`;
  }
  if (borrowing.outturn == null || borrowing.difference == null) {
    return `${at}, the OBR forecast ${borrowing.fy} borrowing of ${formatBillions(borrowing.forecast)}. That year has not ended yet.${popular}${chancellor}`;
  }
  const result =
    borrowing.direction === "matched"
      ? "matching the forecast"
      : `${formatBillions(Math.abs(roundDifference(borrowing.difference)))} too ${borrowing.direction === "over" ? "high" : "low"}`;
  return `${at}, the OBR forecast ${borrowing.fy} borrowing of ${formatBillions(borrowing.forecast)}; the outturn was ${formatBillions(borrowing.outturn)}, ${result}.${popular}${chancellor}`;
}

export default async function BudgetEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event) notFound();
  const { obr, ons, loaded, borrowing } = await loadEventView(event);
  const hasForecast = borrowing?.forecast != null;
  const events = await allEvents();
  const index = events.findIndex((item) => item.slug === event.slug);
  const previous = index > 0 ? events[index - 1] : null;
  const next = index >= 0 && index < events.length - 1 ? events[index + 1] : null;
  const regimes = regimesAt(loadRuleRegimes(), event.date);
  const label = eventLabel(event);
  const when = event.dateStatus === "verified" ? formatDateLong(event.date) : null;
  const asOf = loaded ? `OBR data as of ${(obr?.releaseDate ?? obr?.data.historical.asOf) ? formatMonthYear((obr?.releaseDate ?? obr?.data.historical.asOf)!) : "the loaded file"} · loaded ${formatDateLong(obr?.retrievedAt ?? null)}.` : "OBR forecasts not loaded yet.";
  const rule = regimes[0]?.rules[0];
  const measureYear = fiscalYearPlus(financialYearOf(event.date), 2) ?? "the third year";
  const measures = (obr?.data.measures.rows ?? [])
    .filter((row) => row.eventDate === event.date && row.year3 != null && row.year3 !== 0)
    .sort((left, right) => Math.abs(right.year3 ?? 0) - Math.abs(left.year3 ?? 0))
    .slice(0, 10);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(label, `/budgets/${event.slug}`)} />
      <JsonLd data={eventJsonLd(event, label, borrowing)} />
      <Breadcrumb current={label} parents={[{ href: "/budgets", label: "Budgets" }]} />
      <PageIntro kicker="Budgets" title={eventHeading(event, label, borrowing)} lede={eventCite(event, label, when, borrowing, rule)} />
      <StoryStepper current={`/budgets/${event.slug}`} />
      {regimes[0] ? (
        <p className="mb-3 text-sm">
          Fiscal rules in force at this event:{" "}
          <Link className="underline decoration-neutral-500 underline-offset-4" href={`/budgets/rules#${regimes[0].id}`}>
            {regimes[0].name}
          </Link>
          . Every other event is on the{" "}
          <Link className="underline decoration-neutral-500 underline-offset-4" href="/budgets">
            Budgets
          </Link>{" "}
          page.
        </p>
      ) : null}
      <p className="mb-6 text-sm text-neutral-800 dark:text-neutral-200">{event.obrForecast === "no" ? "The OBR did not publish a forecast for this event." : asOf}</p>
      <dl className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Fact label="Chancellor" value={event.chancellor} />
        <Fact label="Government" value={event.government} />
        <Fact label="Type" value={typeLabel(event.type)} />
        <Fact label="Date" value={when ?? "Not confirmed on GOV.UK"} />
      </dl>
      <p className="mb-4 text-sm">
        {event.govukPath ? (
          <a className="underline decoration-neutral-500 underline-offset-4" href={`https://www.gov.uk${event.govukPath}`}>
            HM Treasury documents
          </a>
        ) : (
          "No GOV.UK budget page for this outlook."
        )}
        {event.weight === "light" ? " This is an OBR outlook with no Budget, shown lighter on the timeline." : ""}
      </p>
      <div className="mb-6 flex gap-3 text-sm">
        {previous ? (
          <Link className="underline decoration-neutral-400 underline-offset-4" href={`/budgets/${previous.slug}`}>
            Previous: {eventLabel(previous)}
          </Link>
        ) : null}
        {next ? (
          <Link className="underline decoration-neutral-400 underline-offset-4" href={`/budgets/${next.slug}`}>
            Next: {eventLabel(next)}
          </Link>
        ) : null}
      </div>
      {event.obrForecast === "no" ? (
        <EmptySource title="No OBR forecast" name="OBR forecast" detail={`The OBR did not publish a forecast for ${label}, so there is nothing to compare with the outturn. The HM Treasury documents are linked above.`} />
      ) : !hasForecast ? (
        <EmptySource
          title={event.status === "pending" ? "OBR forecast still to come" : "OBR forecast not loaded yet"}
          name="OBR forecast"
          detail={
            event.status === "pending"
              ? `The OBR publishes its forecast for ${label} in its Economic and fiscal outlook. The figures appear here automatically once its data files are available. The HM Treasury documents are linked above.`
              : "Forecast figures appear here once the OBR files are loaded. The HM Treasury documents are linked above."
          }
        />
      ) : borrowing && borrowing.forecast != null && borrowing.outturn != null && borrowing.difference != null ? (
        <section className="mb-8 border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Forecast against outturn, the year ahead ({borrowing.fy})</h2>
          <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Stat label="Outturn" value={formatBillions(borrowing.outturn)} detail="ONS J5II, financial year, bulletin sign." />
            <p className="pb-6 text-2xl" aria-hidden="true">−</p>
            <Stat label={`Forecast at ${label}`} value={formatBillions(borrowing.forecast)} detail="OBR vintage, £ billion." />
            <p className="pb-6 text-2xl" aria-hidden="true">=</p>
            <Stat label="Difference" value={formatSignedDifference(borrowing.difference, "bn")} detail={borrowing.direction === "over" ? "Over-forecast" : borrowing.direction === "under" ? "Under-forecast" : "Matched the outturn"} />
          </div>
          <p className="sr-only">
            For the year ahead ({borrowing.fy}), outturn of {formatBillions(borrowing.outturn)} minus the forecast of {formatBillions(borrowing.forecast)} made at {label} gives a difference of {formatSignedDifference(borrowing.difference, "bn")}. {borrowing.words}
          </p>
          <p className="mt-4 text-sm text-neutral-800 dark:text-neutral-200">
            Outturn minus forecast. Below zero means the forecast was too high (over-forecast); above zero means it was too low (under-forecast). Rounded to £0.1bn. Debt, % of GDP, uses HF6X.
          </p>
          <SeriesList event={event} vintages={obr?.data.historical.vintages ?? []} ons={ons?.data.series} />
        </section>
      ) : (
        <EmptySource title="Not yet due" name="Outturn" detail={`${borrowing?.fy ?? yearAheadFy(event.date)} has not ended, so there is no outturn to compare yet.`} />
      )}
      <ForecastChanges event={event} label={label} obr={obr?.data ?? null} />
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Fiscal rules at this event</h2>
        <ul className="space-y-3">
          {regimes.flatMap((regime) =>
            regime.rules.map((item) => (
              <li key={item.id} className="border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                <p className="font-medium">{item.name}</p>
                <p className="mt-1">Target: {item.metric}</p>
                <p>Target year: {item.target}</p>
                <p className="mt-2">Outcome: {outcomeLabel(item.outcome)}. {ruleSentence(item)}</p>
                <a className="mt-2 inline-block underline decoration-neutral-400 underline-offset-4" href={item.source}>
                  {regime.sourceTitle}
                </a>
              </li>
            )),
          )}
        </ul>
        <p className="mt-3 text-sm">
          <Link className="underline decoration-neutral-400 underline-offset-4" href="/budgets/rules">
            Headroom at every event
          </Link>
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium">Largest policy measures</h2>
        {event.type === "forecast-only" ? (
          <p className="text-sm">No policy measures at this event. It updated the forecast only.</p>
        ) : obr?.data.measures.loaded ? (
          <>
            <p className="text-sm">
              A positive figure raises money. A negative figure costs money. That is the OBR policy measures database sign: a yield is positive and a cost is negative.
            </p>
            {measures.length > 0 ? (
              <DataTable
                columns={["Measure", "Category", `${measureYear}, £m`]}
                rows={measures.map((row) => [row.name, measureHeadLabel(row.category), formatMillions(row.year3 ?? 0)])}
              />
            ) : (
              <p className="mt-2 text-sm">The OBR database lists no costed measures for this event in {measureYear}.</p>
            )}
          </>
        ) : (
          <EmptySource title="Measures not loaded yet" name="Measures" detail="Measures appear once the OBR policy measures database is loaded." />
        )}
      </section>
      <BudgetCaveats />
      <StoryNav current={`/budgets/${event.slug}`} />
    </>
  );
}

function eventCite(
  event: FiscalEvent,
  label: string,
  when: string | null,
  borrowing: YearAheadComparison | null | undefined,
  rule: { name: string; target: string; outcome: string } | undefined,
): string {
  const onDate = when ? ` on ${when}` : "";
  if (event.obrForecast === "no") {
    return `The OBR did not publish a forecast for ${label}, so there is nothing to compare with the outturn.`;
  }
  if ((!borrowing || borrowing.forecast == null) && event.status === "pending") {
    return `${label} was presented${onDate}. The OBR forecast for it is still to come on this site, and appears here once the OBR data files are available.`;
  }
  if (!borrowing || borrowing.forecast == null) {
    return "Forecast figures appear here once the OBR files are loaded. The HM Treasury documents are linked above.";
  }
  if (borrowing.outturn == null || borrowing.difference == null) {
    return `At ${label}${onDate}, the OBR forecast borrowing of ${formatBillions(borrowing.forecast)} for the year ahead, ${borrowing.fy}. That year has not ended yet.`;
  }
  const ruleSentence = rule ? ` The outcome for ${rule.name} has not been assessed yet.` : "";
  if (borrowing.direction === "matched") {
    return `At ${label}${onDate}, the OBR forecast borrowing of ${formatBillions(borrowing.forecast)} for the year ahead, ${borrowing.fy}. The outturn was ${formatBillions(borrowing.outturn)}, so the forecast matched the outturn.${ruleSentence}`;
  }
  const way = borrowing.direction === "over" ? "high" : "low";
  return `At ${label}${onDate}, the OBR forecast borrowing of ${formatBillions(borrowing.forecast)} for the year ahead, ${borrowing.fy}. The outturn was ${formatBillions(borrowing.outturn)}, so the forecast was ${formatBillions(Math.abs(roundDifference(borrowing.difference)))} too ${way}.${ruleSentence}`;
}

function SeriesList({
  event,
  vintages,
  ons,
}: {
  event: FiscalEvent;
  vintages: { date: string; precision: "day" | "month"; series: ForecastSeriesId; points: { fy: string; value: number }[] }[];
  ons: { j5ii?: { months: { period: string; value: number }[] }; jw2o?: { months: { period: string; value: number }[] }; kx5q?: { months: { period: string; value: number }[] }; hf6x?: { months: { period: string; value: number }[] } } | undefined;
}) {
  const series: { id: ForecastSeriesId; label: string; name: string; months: { period: string; value: number }[] }[] = [
    { id: "psnb", label: "Borrowing, £bn", name: "borrowing", months: ons?.j5ii?.months ?? [] },
    { id: "receipts", label: "Receipts, £bn", name: "receipts", months: ons?.jw2o?.months ?? [] },
    { id: "tme", label: "Spending, £bn", name: "spending", months: ons?.kx5q?.months ?? [] },
    { id: "psnd_pct", label: "Debt, % of GDP", name: "debt", months: ons?.hf6x?.months ?? [] },
  ];
  return (
    <ul className="mt-6 space-y-2 text-sm">
      {series.map((item) => {
        const row = yearAheadComparisons([event], vintages, item.months, item.id)[0];
        const vintage = vintages.find((itemVintage) => itemVintage.series === item.id && (itemVintage.precision === "month" ? event.date.slice(0, 7) === itemVintage.date.slice(0, 7) : Math.abs(Date.parse(event.date) - Date.parse(itemVintage.date)) <= 7 * 86400000));
        const points = seriesPoints(vintage, event.date);
        const text = row?.words ?? (row?.forecast == null ? `No ${item.name} forecast for this event.` : `${row.fy} has not ended, so there is no outturn to compare yet.`);
        return (
          <li key={item.id}>
            {item.label}: {text}
            {item.id === "psnd_pct" && points.length > 0 ? " Outturn is HF6X in the March that ends the financial year." : ""}
            {row?.outturn != null && item.id === "psnd_pct" ? ` ${formatPercent(row.outturn)} of GDP.` : ""}
          </li>
        );
      })}
    </ul>
  );
}

function ruleSentence(rule: { name: string; target: string; outcome: string }): string {
  switch (rule.outcome) {
    case "met":
      return `${rule.name} was met for ${rule.target}.`;
    case "missed":
      return `${rule.name} was not met for ${rule.target}.`;
    case "replaced":
      return `${rule.name} was replaced before its target year.`;
    case "pending":
      return `The target year for ${rule.name}, ${rule.target}, has not ended yet.`;
    case "unreviewed":
      return `The outcome for ${rule.name} has not been assessed yet.`;
    default:
      return `The outcome for ${rule.name} has not been assessed yet.`;
  }
}

function typeLabel(type: FiscalEvent["type"]): string {
  switch (type) {
    case "budget":
      return "Budget";
    case "statement":
      return "Statement";
    case "emergency":
      return "Emergency Budget";
    case "growth-plan":
      return "Growth Plan";
    case "forecast-only":
      return "Forecast only";
    case "spending-review":
      return "Spending Review";
    default: {
      const neverType: never = type;
      return neverType;
    }
  }
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-700 dark:text-neutral-300">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

async function allEvents(): Promise<FiscalEvent[]> {
  const loaded = await readSnapshot("budgets-events");
  return withSeedEvents(takeSnapshot("budgets-events", loaded.snapshot)?.data.events);
}

async function findEvent(slug: string): Promise<FiscalEvent | null> {
  return (await allEvents()).find((event) => event.slug === slug) ?? null;
}

function databankForecast(
  event: FiscalEvent,
  data: { round: string | null; series: { name: string; points: { year: string; outturn: number | null; forecast: number | null }[] }[] } | undefined,
): YearAheadComparison | null {
  if (!data || event.obrForecast === "no") return null;
  const round = (vintageLabel(data.round) ?? "").toLowerCase();
  if (!round.startsWith(formatMonthYear(event.date).toLowerCase())) return null;
  const fy = yearAheadFy(event.date);
  const forecast = forecastFor(data.series.find((item) => /net borrowing/i.test(item.name)), fy);
  if (forecast == null) return null;
  return { event, fy, forecast, outturn: null, difference: null, words: null, direction: null, due: false, basisChanged: false };
}


function eventJsonLd(event: FiscalEvent, label: string, borrowing: YearAheadComparison | null | undefined) {
  const url = `${SITE_URL}/budgets/${event.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: `OBR forecast and ONS outturn: ${label}`,
    description: eventDescription(event, label, event.dateStatus === "verified" ? formatDateLong(event.date) : null, borrowing),
    url,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    keywords: eventKeywords(event, label),
    temporalCoverage: borrowing?.fy ?? yearAheadFy(event.date),
    spatialCoverage: { "@type": "Country", name: "United Kingdom" },
    creator: AUTHOR_JSON_LD,
    license: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    isBasedOn: [
      { "@type": "Dataset", name: "OBR public finances databank and historical forecasts database", url: "https://obr.uk/data/" },
      { "@type": "Dataset", name: "ONS public sector finances, J5II", url: "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance" },
    ],
    about: {
      "@type": "Event",
      name: event.name,
      startDate: event.date,
      eventStatus: "https://schema.org/EventScheduled",
      location: { "@type": "Place", name: "House of Commons, London" },
      organizer: { "@type": "GovernmentOrganization", name: "HM Treasury", url: "https://www.gov.uk/government/organisations/hm-treasury" },
      ...(event.govukPath ? { url: `https://www.gov.uk${event.govukPath}` } : {}),
    },
  };
}

/** This event's OBR forecast against the one before it: growth, inflation, borrowing and debt. */
function ForecastChanges({ event, label, obr }: { event: FiscalEvent; label: string; obr: ObrData | null }) {
  if (!obr || event.obrForecast === "no") return null;
  const compares = eventComparisons(event, obr.historical.vintages);
  const efo = obr.efo?.data && obr.efo.data.eventDate === event.date ? obr.efo.data : null;
  if (compares.length === 0 && !efo) return null;
  const path = `/budgets/${event.slug}`;
  const sourceTitle = efo ? efoSourceTitle(efo) : "Historical official forecasts database";
  const releaseDate = efo ? efo.eventDate : obr.historical.asOf;
  const fy = financialYearOf(event.date);
  const psnbCompare = compares.find((compare) => compare.series === "psnb");
  const thisYear = efo ? psnbCompare?.points.find((point) => point.period === fy) : undefined;
  return (
    <section className="mb-8" aria-labelledby="forecast-changes">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="forecast-changes" className="text-sm font-medium">
          What changed in the forecast at {label}
        </h2>
        {efo ? (
          <Link className="text-sm underline decoration-neutral-400 underline-offset-4" href={`/budgets/${event.slug}/explained`}>
            Read {label} explained →
          </Link>
        ) : null}
      </div>
      <p className="mt-1 mb-3 text-sm text-neutral-800 dark:text-neutral-200">Each chart sets this event&apos;s OBR forecast against the forecast before it.</p>
      {thisYear && thisYear.current != null ? (
        <p className="mb-3 max-w-[68ch] text-sm">
          The figures above use the year ahead, {yearAheadFy(event.date)}, to match every other event. For this year, {fy}, the OBR forecasts borrowing of {formatUnit(thisYear.current, "bn")}
          {thisYear.previous != null && thisYear.previous !== thisYear.current
            ? `, ${thisYear.current > thisYear.previous ? "up" : "down"} from ${formatUnit(thisYear.previous, "bn")} in its ${psnbCompare?.previousLabel} forecast`
            : ""}
          . That is the figure used on the home page and in {label} explained.
        </p>
      ) : null}
      {efo ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {compares.map((compare) => (
              <figure key={compare.series} id={`forecast-${compare.series}`} className="min-w-0 border border-neutral-200 p-3 dark:border-neutral-800">
                <figcaption className="mb-1 text-xs font-medium">{SERIES_META[compare.series].title}</figcaption>
                <CompareBars points={compare.points} currentLabel={compare.currentLabel} previousLabel={compare.previousLabel} unit={SERIES_META[compare.series].unit} small />
              </figure>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
            Gray: {compares[0]?.previousLabel} forecast. Blue: {compares[0]?.currentLabel} forecast. Full charts, with CSV downloads, are in{" "}
            <Link className="underline underline-offset-4" href={`/budgets/${event.slug}/explained`}>
              {label} explained
            </Link>
            .
          </p>
          <SourceNote {...OBR_SOURCE} title={sourceTitle} releaseDate={releaseDate} />
          <div className="mt-4">
            <PolicyFigure efo={efo} path={path} />
          </div>
        </>
      ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {compares.map((compare) => (
          <CompareFigure key={compare.series} id={`forecast-${compare.series}`} compare={compare} path={path} sourceTitle={sourceTitle} releaseDate={releaseDate} />
        ))}
      </div>
      )}
    </section>
  );
}
