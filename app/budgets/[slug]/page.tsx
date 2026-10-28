import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb, EmptySource, JsonLd, PageIntro, Stat, breadcrumbJsonLd } from "@/components/blocks";
import { yearAheadFy, type FiscalEvent } from "@/lib/budgets/events";
import type { ForecastSeriesId } from "@/lib/budgets/forecasts";
import { outcomeLabel, regimesAt } from "@/lib/budgets/rules";
import { loadRuleRegimes, loadSeedEvents } from "@/lib/budgets/seed";
import { seriesPoints, yearAheadComparisons } from "@/lib/budgets/view";
import { formatBillions, formatPercent } from "@/lib/format";
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
  return pageMeta({
    title: event ? event.name : "Budget",
    description: event ? `${event.name} on ${event.date}, ${event.chancellor}.` : "Fiscal event",
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
  const asOf = loaded ? `OBR data as of ${obr?.data.historical.asOf ?? obr?.retrievedAt ?? "an unknown date"}.` : "OBR data not loaded.";
  const borrowing = loaded
    ? yearAheadComparisons([event], obr?.data.historical.vintages ?? [], ons?.data.series.j5ii?.months ?? [], "psnb")[0]
    : null;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(event.name, `/budgets/${event.slug}`)} />
      <Breadcrumb current={event.name} parents={[{ href: "/budgets", label: "Budgets" }]} />
      <PageIntro
        kicker={event.date}
        title={`What did ${event.name} forecast, and what actually happened?`}
        lede={event.obrForecast === "no" ? "This event was published without an OBR forecast." : asOf}
      />
      <dl className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Fact label="Chancellor" value={event.chancellor} />
        <Fact label="Government" value={event.government} />
        <Fact label="Type" value={event.type} />
        <Fact label="Year ahead" value={yearAheadFy(event.date)} />
      </dl>
      <p className="mb-6 text-sm">
        {event.govukPath ? (
          <a className="underline decoration-neutral-500 underline-offset-4" href={`https://www.gov.uk${event.govukPath}`}>
            HMT documents
          </a>
        ) : (
          "No GOV.UK budget page for this outlook."
        )}
        {event.dateStatus === "unverified" ? " The date is not confirmed on GOV.UK." : ""}
        {event.weight === "light" ? " This is an OBR outlook with no Budget, shown lighter on the timeline." : ""}
      </p>
      <div className="mb-6 flex gap-3 text-sm">
        {previous ? <Link className="underline decoration-neutral-400 underline-offset-4" href={`/budgets/${previous.slug}`}>Previous</Link> : null}
        {next ? <Link className="underline decoration-neutral-400 underline-offset-4" href={`/budgets/${next.slug}`}>Next</Link> : null}
      </div>
      {event.obrForecast === "no" ? (
        <EmptySource name="OBR forecast" detail="This event has no OBR forecast. It is left out of the porcupine and the averages." />
      ) : !loaded || !borrowing ? (
        <EmptySource name="OBR forecast" pending detail="OBR data not loaded. The event page will show the year-ahead difference once the historical forecasts file is uploaded." />
      ) : (
        <section className="mb-8 border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Year-ahead borrowing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label={`Forecast for ${borrowing.fy}`} value={borrowing.forecast == null ? "Not in the file" : formatBillions(borrowing.forecast)} detail="OBR vintage, £ billion." />
            <Stat label="Outturn" value={!borrowing.due || borrowing.outturn == null ? "Not yet due" : formatBillions(borrowing.outturn)} detail="ONS J5II, financial year, bulletin sign." />
            <Stat label="Difference" value={borrowing.words ?? "Not yet due"} detail="Stored as outturn minus forecast." />
          </div>
          <SeriesList event={event} vintages={obr?.data.historical.vintages ?? []} ons={ons?.data.series} />
        </section>
      )}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium">Rules in force</h2>
        <ul className="space-y-3">
          {regimes.flatMap((regime) =>
            regime.rules.map((rule) => (
              <li key={rule.id} className="border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                <p className="font-medium">{rule.name}</p>
                <p className="mt-1">{rule.metric} Target: {rule.target}.</p>
                <p className="mt-2">{outcomeLabel(rule.outcome)}</p>
                <a className="mt-2 inline-block underline decoration-neutral-400 underline-offset-4" href={rule.source}>
                  {regime.sourceTitle}
                </a>
              </li>
            )),
          )}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium">Measures</h2>
        {obr?.data.measures.loaded ? (
          <p className="text-sm">{obr.data.measures.rows.filter((row) => row.eventDate?.slice(0, 7) === event.date.slice(0, 7)).length} measures in this month. A positive figure is an Exchequer yield and a negative figure is an Exchequer cost, which is the OBR measures database sign.</p>
        ) : (
          <EmptySource name="Measures" pending detail="Measures not loaded yet. Upload manual/obr/policy-measures.xlsx." />
        )}
      </section>
    </>
  );
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
  const series: { id: ForecastSeriesId; label: string; months: { period: string; value: number }[] }[] = [
    { id: "psnb", label: "Borrowing", months: ons?.j5ii?.months ?? [] },
    { id: "receipts", label: "Receipts", months: ons?.jw2o?.months ?? [] },
    { id: "tme", label: "Spending", months: ons?.kx5q?.months ?? [] },
    { id: "psnd_pct", label: "Debt, share of GDP", months: ons?.hf6x?.months ?? [] },
  ];
  return (
    <ul className="mt-6 space-y-2 text-sm">
      {series.map((item) => {
        const row = yearAheadComparisons([event], vintages, item.months, item.id)[0];
        const points = seriesPoints(
          vintages.find((vintage) => vintage.series === item.id && (vintage.precision === "month" ? event.date.slice(0, 7) === vintage.date.slice(0, 7) : Math.abs(Date.parse(event.date) - Date.parse(vintage.date)) <= 7 * 86400000)),
          event.date,
        );
        return (
          <li key={item.id}>
            {item.label}: {row?.words ?? (row?.forecast == null ? "not in the loaded file" : "not yet due")}
            {item.id === "psnd_pct" ? ` Outturn uses HF6X in March. ${points.length} forecast years after the part year is dropped.` : ""}
            {row?.outturn != null && item.id === "psnd_pct" ? ` March ratio ${formatPercent(row.outturn)}.` : ""}
          </li>
        );
      })}
    </ul>
  );
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
