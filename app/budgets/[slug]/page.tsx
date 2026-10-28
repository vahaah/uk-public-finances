import Link from "next/link";
import { notFound } from "next/navigation";

import { BudgetCaveats } from "@/components/budget-caveats";
import { Breadcrumb, DataTable, EmptySource, JsonLd, PageIntro, Stat, breadcrumbJsonLd } from "@/components/blocks";
import { formatSignedDifference, roundDifference } from "@/lib/budgets/compare";
import { eventLabel, financialYearOf, yearAheadFy, type FiscalEvent } from "@/lib/budgets/events";
import { fiscalYearPlus, type ForecastSeriesId } from "@/lib/budgets/forecasts";
import { outcomeLabel, regimesAt } from "@/lib/budgets/rules";
import { loadRuleRegimes, loadSeedEvents } from "@/lib/budgets/seed";
import { seriesPoints, yearAheadComparisons, type YearAheadComparison } from "@/lib/budgets/view";
import { formatBillions, formatDateLong, formatMillions, formatMonthYear, formatPercent } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams(): { slug: string }[] {
  return loadSeedEvents().map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEvent(slug);
  const label = event ? eventLabel(event) : "Budget";
  return pageMeta({
    title: event ? `${label}: forecast and outturn` : "Budget",
    description: event
      ? `What the OBR forecast at ${label} for borrowing, receipts, spending and debt, and what the ONS later recorded.`
      : "Fiscal event",
    path: `/budgets/${slug}`,
  });
}

export default async function BudgetEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEvent(slug);
  if (!event) notFound();
  const [obrLoaded, onsLoaded] = await Promise.all([readSnapshot("budgets-obr"), readSnapshot("ons-psf")]);
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const events = await allEvents();
  const index = events.findIndex((item) => item.slug === event.slug);
  const previous = index > 0 ? events[index - 1] : null;
  const next = index >= 0 && index < events.length - 1 ? events[index + 1] : null;
  const regimes = regimesAt(loadRuleRegimes(), event.date);
  const loaded = obr?.data.historical.loaded === true;
  const label = eventLabel(event);
  const when = event.dateStatus === "verified" ? formatDateLong(event.date) : null;
  const asOf = loaded ? `OBR data as of ${obr?.data.historical.asOf ? formatMonthYear(obr.data.historical.asOf) : "the loaded file"} · loaded ${formatDateLong(obr?.retrievedAt ?? null)}.` : "OBR forecasts not loaded yet.";
  const borrowing = loaded
    ? yearAheadComparisons([event], obr?.data.historical.vintages ?? [], ons?.data.series.j5ii?.months ?? [], "psnb")[0]
    : null;
  const rule = regimes[0]?.rules[0];
  const measureYear = fiscalYearPlus(financialYearOf(event.date), 2) ?? "the third year";
  const measures = (obr?.data.measures.rows ?? [])
    .filter((row) => row.eventDate === event.date && row.year3 != null && row.year3 !== 0)
    .sort((left, right) => Math.abs(right.year3 ?? 0) - Math.abs(left.year3 ?? 0))
    .slice(0, 10);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(label, `/budgets/${event.slug}`)} />
      <Breadcrumb current={label} parents={[{ href: "/budgets", label: "Budgets" }]} />
      <PageIntro kicker="Budgets" title={`What did ${label} forecast, and what happened?`} lede={eventCite(event, label, when, borrowing, rule)} />
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
      ) : event.status === "pending" || !loaded ? (
        <EmptySource title="OBR forecast not loaded yet" name="OBR forecast" detail="Forecast figures appear here once the OBR files are loaded. The HM Treasury documents are linked above." />
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
                rows={measures.map((row) => [row.name, row.category, formatMillions(row.year3 ?? 0)])}
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
  if (event.status === "pending") {
    return `${label} has been announced. Its OBR forecast has not been loaded yet.`;
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
  return takeSnapshot("budgets-events", loaded.snapshot)?.data.events ?? loadSeedEvents();
}

async function findEvent(slug: string): Promise<FiscalEvent | null> {
  return (await allEvents()).find((event) => event.slug === slug) ?? null;
}
