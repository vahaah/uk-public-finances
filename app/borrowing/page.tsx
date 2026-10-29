import { TopicStory } from "@/components/topic-story";
import { StoryStepper } from "@/components/story-stepper";
import { BorrowingChart, CumulativeChart } from "@/components/charts";
import { Breadcrumb, ChartFrame, DataTable, breadcrumbJsonLd, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote } from "@/components/blocks";
import { fiscalMarkers } from "@/lib/budgets/markers";
import { formatGbpFromMillions, formatMonth, formatMonthLong, previousFinancialYear } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { priceBundle } from "@/lib/prices";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK government borrowing and the deficit",
  description:
    "Monthly UK government borrowing, and the financial year so far against the same months last year. From the ONS, with the next release date.",
  path: "/borrowing",
});

export default async function BorrowingPage() {
  const [loaded, priceLoaded, markers] = await Promise.all([readSnapshot("ons-psf"), readSnapshot("ons-prices"), fiscalMarkers()]);
  const snapshot = takeSnapshot("ons-psf", loaded.snapshot);
  const prices = takeSnapshot("ons-prices", priceLoaded.snapshot);
  const bundle = prices ? priceBundle(prices.data) : null;
  const meta = SOURCES["ons-psf"];
  if (!snapshot) return <EmptySource name="ONS borrowing" />;
  const fy = snapshot.data.financialYear;
  const sign = snapshot.data.bulletinSign;
  const source = (
    <SourceNote
      publisher={meta.publisher}
      title="Public sector net borrowing excluding public sector banks (J5II)"
      url={snapshot.sourceUrl}
      releaseDate={snapshot.releaseDate}
      licenceUrl={meta.licenceUrl}
      sourceId="ons-psf"
    />
  );
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("UK government borrowing and the deficit", "/borrowing")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/borrowing",
          name: "UK public sector net borrowing, monthly and financial year to date",
          description:
            "Monthly public sector net borrowing excluding public sector banks, and the financial year running total compared with a year earlier, from the ONS.",
          keywords: ["UK government borrowing", "budget deficit", "PSNB"],
          temporalCoverage: "1993-01/2026-09",
          variableMeasured: ["Public sector net borrowing excluding public sector banks (J5II)", "Current budget deficit (JW2T)"],
          dateModified: snapshot.releaseDate,
          sources: [{ id: "ons-psf", name: meta.title, url: snapshot.sourceUrl, publisher: meta.publisher, licenceUrl: meta.licenceUrl, releaseDate: snapshot.releaseDate }],
        })}
      />
      <Breadcrumb current="Borrowing" />
      <PageIntro
        kicker="Public sector finances"
        title="How much is the government borrowing this year?"
        lede={
          <>
            <p>
              {fy && sign.financialYearBorrowing != null
                ? `Public sector net borrowing in the financial year ${fy.year} to date (April to ${formatMonthLong(fy.through)}) was ${formatGbpFromMillions(sign.financialYearBorrowing)}. In the same months of the previous financial year it was ${sign.previousFinancialYearBorrowing == null ? "not available" : formatGbpFromMillions(sign.previousFinancialYearBorrowing)}.`
                : "Monthly public sector net borrowing, excluding public sector banks."}
            </p>
            <p className="mt-2">
              Borrowing is the gap between what the public sector spends and what it receives. Figures are revised in later releases. The running total adds to{" "}
              <a className="underline decoration-neutral-500 underline-offset-4" href="/debt">
                net debt
              </a>
              . Comparison with a forecast is on{" "}
              <a className="underline decoration-neutral-500 underline-offset-4" href="/forecasts">
                forecasts
              </a>
              , and how past forecasts turned out is on{" "}
              <a className="underline decoration-neutral-500 underline-offset-4" href="/budgets">
                Budgets
              </a>
              .
            </p>
          </>
        }
      />
      <StoryStepper current="/borrowing" />
      <ChartFrame title="Public sector net borrowing by month" subtitle="£bn. Bars above zero are borrowing; below zero, a surplus." source={source}>
        <BorrowingChart
          months={snapshot.data.series.j5ii?.months ?? []}
          quarters={snapshot.data.series.j5ii?.quarters ?? []}
          years={snapshot.data.series.j5ii?.years ?? []}
          prices={bundle}
          markers={markers}
        />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame
          title={fy ? `Borrowing so far in ${fy.year} against ${previousFinancialYear(fy.year)}` : "Borrowing so far"}
          subtitle={`£bn, running total. In real terms, only ${fy?.year ?? "this year"} is adjusted. A share of GDP is not shown for part of a year.`}
          source={source}
        >
          {fy ? (
            <CumulativeChart months={fy.months} prices={bundle} thisYear={fy.year} lastYear={previousFinancialYear(fy.year)} />
          ) : null}
          {fy ? (
            <DataTable
              columns={["Month", `${fy.year}, £bn`, `${previousFinancialYear(fy.year)}, £bn`]}
              rows={fy.months.map((row) => [
                formatMonth(row.period),
                formatGbpFromMillions(-row.cumulative),
                row.previousCumulative == null ? "—" : formatGbpFromMillions(-row.previousCumulative),
              ])}
            />
          ) : null}
        </ChartFrame>
      </div>
      <TopicStory path="/borrowing" figures={["psnb", "policy"]} title="Borrowing in the latest forecast" />
    </>
  );
}
