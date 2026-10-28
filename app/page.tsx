import { BorrowingChart } from "@/components/charts";
import {
  ChartFrame,
  datasetJsonLd,
  EmptySource,
  JsonLd,
  PageIntro,
  SourceNote,
  Stat,
  websiteJsonLd,
} from "@/components/blocks";
import { formatDateLong, formatGbpFromMillions, formatMonthLong, formatPercent } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK public finances: tax, spending, borrowing and debt",
  description:
    "Free view of UK public finances from ONS, HMRC, HM Treasury, the DMO and the Bank of England: borrowing, tax receipts, spending, debt and gilts, with sources.",
  path: "/",
});

export default async function HomePage() {
  const loaded = await readSnapshot("ons-psf");
  const snapshot = takeSnapshot("ons-psf", loaded.snapshot);
  const meta = SOURCES["ons-psf"];
  if (!snapshot) return <EmptySource name="ONS public sector finances" />;
  const data = snapshot.data;
  const month = data.series.j5ii?.latest?.period ?? "";
  const borrowing = data.bulletinSign.borrowingLatest;
  const yearBorrowing = data.bulletinSign.financialYearBorrowing;
  const previous = data.bulletinSign.previousFinancialYearBorrowing;
  const receipts = data.series.jw2o?.latest;
  const spending = data.series.kx5q?.latest;
  const debt = data.series.kse6?.latest;
  const ratio = data.series.hf6x?.latest;
  const interest = data.series.nmfx?.latest;
  const deficit = data.bulletinSign.currentBudgetDeficitLatest;
  const delta =
    yearBorrowing != null && previous != null ? versusYearEarlier(yearBorrowing - previous) : null;
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <JsonLd
        data={datasetJsonLd({
          path: "/",
          name: "UK public sector finances: headline figures",
          description:
            "Latest monthly UK public sector borrowing, receipts, spending, net debt and central government net interest from the ONS public sector finances release.",
          keywords: ["UK borrowing", "public sector net debt", "UK deficit"],
          temporalCoverage: month ? `1993-01/${month}` : "1993-01/2026-09",
          variableMeasured: [
            "Public sector net borrowing excluding public sector banks (J5II)",
            "Public sector current receipts (JW2O)",
            "Total managed expenditure (KX5Q)",
            "Public sector net debt (KSE6, HF6X)",
            "Central government net interest payable (NMFX)",
          ],
          dateModified: snapshot.releaseDate,
          sources: [
            {
              id: "ons-psf",
              name: meta.title,
              url: snapshot.sourceUrl,
              publisher: meta.publisher,
              licenceUrl: meta.licenceUrl,
              releaseDate: snapshot.releaseDate,
            },
          ],
        })}
      />
      <PageIntro
        kicker={`ONS data published ${formatDateLong(snapshot.releaseDate)}`}
        title="UK public finances"
        lede={
          borrowing == null || !month
            ? "The latest UK public sector finances from the ONS."
            : borrowing < 0
              ? `The public sector ran a surplus of ${formatGbpFromMillions(Math.abs(borrowing))} in ${formatMonthLong(month)}. The next ONS release is due on ${data.series.j5ii?.nextRelease || "a date not yet announced"}.`
              : `Public sector net borrowing was ${formatGbpFromMillions(borrowing)} in ${formatMonthLong(month)}. The next ONS release is due on ${data.series.j5ii?.nextRelease || "a date not yet announced"}.`
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          wide
          href="/borrowing"
          label={month ? `Borrowing in ${formatMonthLong(month)}` : "Borrowing"}
          value={borrowing == null ? "Not available" : formatGbpFromMillions(Math.abs(borrowing))}
          detail={`Public sector net borrowing, excluding public sector banks. Financial year ${data.financialYear?.year ?? ""} to date: ${yearBorrowing == null ? "not available" : formatGbpFromMillions(yearBorrowing)}.${delta ? ` ${delta}.` : ""}`}
        />
        <Stat
          href="/receipts"
          label={receipts ? `Receipts in ${formatMonthLong(receipts.period)}` : "Receipts"}
          value={receipts ? formatGbpFromMillions(receipts.value) : "Not available"}
          detail="ONS public sector current receipts for the month, mostly taxes, on an accrued basis. This is not the HMRC cash total."
        />
        <Stat
          href="/spending"
          label={spending ? `Spending (TME) in ${formatMonthLong(spending.period)}` : "Spending"}
          value={spending ? formatGbpFromMillions(spending.value) : "Not available"}
          detail="Total managed expenditure in the month: current spending, depreciation and investment. Excludes public sector banks. The annual total is on the spending page."
        />
        <Stat
          href="/debt"
          label={debt ? `Net debt at end of ${formatMonthLong(debt.period)}` : "Net debt"}
          value={debt ? formatGbpFromMillions(debt.value) : "Not available"}
          detail={
            ratio
              ? `Equal to ${formatPercent(ratio.value)} of GDP. Public sector net debt, excluding public sector banks. Provisional.`
              : "Public sector net debt, excluding public sector banks."
          }
        />
        <Stat
          href="/debt"
          label={interest ? `Net interest payable in ${formatMonthLong(interest.period)}` : "Net interest payable"}
          value={interest ? formatGbpFromMillions(interest.value) : "Not available"}
          detail="Central government net interest payable in the month, including the inflation uplift on index-linked gilts."
        />
        <Stat
          href="/borrowing"
          label={
            deficit == null
              ? "Current budget"
              : deficit < 0
                ? `Current budget surplus in ${month ? formatMonthLong(month) : "the month"}`
                : `Current budget deficit in ${month ? formatMonthLong(month) : "the month"}`
          }
          value={deficit == null ? "Not available" : formatGbpFromMillions(Math.abs(deficit))}
          detail="Day-to-day spending minus receipts, after depreciation, so it excludes borrowing for investment."
        />
      </div>
      <div className="mt-3">
        <ChartFrame
          title="Public sector net borrowing by month"
          subtitle="£ billion. Bars above zero are borrowing."
          source={
            <SourceNote
              publisher={meta.publisher}
              title="Public sector net borrowing excluding public sector banks (J5II)"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="ons-psf"
            />
          }
        >
          <BorrowingChart months={data.series.j5ii?.months ?? []} />
        </ChartFrame>
      </div>
    </>
  );
}

function versusYearEarlier(gapMillions: number): string {
  const amount = formatGbpFromMillions(Math.abs(gapMillions));
  if (gapMillions < 0) return `${amount} less than a year earlier`;
  if (gapMillions > 0) return `${amount} more than a year earlier`;
  return "unchanged from a year earlier";
}
