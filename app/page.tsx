import { BorrowingChart } from "@/components/charts";
import {
  ChartFrame,
  datasetJsonLd,
  EmptySource,
  JsonLd,
  PageIntro,
  SourceNote,
  Sparkline,
  Stat,
  websiteJsonLd,
} from "@/components/blocks";
import { formatDateLong, formatGbpFromMillions, formatMonthLong, formatPercent } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { priceBundle } from "@/lib/prices";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK public finances: tax, spending, borrowing, debt",
  description:
    "UK borrowing, tax receipts, spending, debt and gilts from the ONS, HMRC, HM Treasury, the DMO and the Bank of England. Every figure is sourced.",
  path: "/",
});

export default async function HomePage() {
  const [loaded, priceLoaded] = await Promise.all([readSnapshot("ons-psf"), readSnapshot("ons-prices")]);
  const snapshot = takeSnapshot("ons-psf", loaded.snapshot);
  const prices = takeSnapshot("ons-prices", priceLoaded.snapshot);
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
      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          wide
          href="/borrowing"
          label={month ? `Borrowing in ${formatMonthLong(month)}` : "Borrowing"}
          value={borrowing == null ? "Not available" : formatGbpFromMillions(Math.abs(borrowing))}
          delta={
            yearBorrowing != null && previous != null
              ? movement(yearBorrowing - previous, "the same months last year")
              : null
          }
          sparkline={<Sparkline values={(data.series.j5ii?.months ?? []).map((point) => -point.value)} />}
          detail={`Public sector net borrowing, excluding public sector banks. ${data.financialYear?.year ?? ""} so far: ${yearBorrowing == null ? "not available" : formatGbpFromMillions(yearBorrowing)}${delta ? `, ${delta.replace("a year earlier", "the same months last year")}` : ""}.`}
        />
        <Stat
          href="/receipts"
          label={receipts ? `Receipts in ${formatMonthLong(receipts.period)}` : "Receipts"}
          value={receipts ? formatGbpFromMillions(receipts.value) : "Not available"}
          delta={monthDelta(data.series.jw2o?.months, receipts?.period, receipts?.value)}
          detail="Mostly taxes, counted when due rather than when paid. Differs from the HMRC cash total."
        />
        <Stat
          href="/spending"
          label={spending ? `Spending in ${formatMonthLong(spending.period)}` : "Spending"}
          value={spending ? formatGbpFromMillions(spending.value) : "Not available"}
          delta={monthDelta(data.series.kx5q?.months, spending?.period, spending?.value)}
          detail="Total managed expenditure (TME): day-to-day spending, depreciation and net investment. Excludes public sector banks."
        />
        <Stat
          href="/debt"
          label={debt ? `Net debt at end of ${formatMonthLong(debt.period)}` : "Net debt"}
          value={debt ? formatGbpFromMillions(debt.value) : "Not available"}
          delta={monthDelta(data.series.kse6?.months, debt?.period, debt?.value)}
          detail={
            ratio
              ? `${formatPercent(ratio.value)} of GDP. Public sector net debt, excluding public sector banks. The latest month is provisional.`
              : "Public sector net debt, excluding public sector banks. The latest month is provisional."
          }
        />
        <Stat
          href="/debt"
          label={interest ? `Net interest payable in ${formatMonthLong(interest.period)}` : "Net interest payable"}
          value={interest ? formatGbpFromMillions(interest.value) : "Not available"}
          delta={monthDelta(data.series.nmfx?.months, interest?.period, interest?.value)}
          detail="Central government interest paid, net of interest received, including inflation uplift on index-linked gilts."
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
          detail="Day-to-day spending, including depreciation, minus receipts. Borrowing for investment is not included."
        />
      </div>
      <div className="mt-3">
        <ChartFrame
          title="Public sector net borrowing by month"
          subtitle="£bn. Bars above zero are borrowing; below zero, a surplus."
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
          <BorrowingChart
            months={data.series.j5ii?.months ?? []}
            quarters={data.series.j5ii?.quarters ?? []}
            years={data.series.j5ii?.years ?? []}
            prices={prices ? priceBundle(prices.data) : null}
          />
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

function movement(gapMillions: number, comparedWith: string): string {
  const amount = formatGbpFromMillions(Math.abs(gapMillions));
  if (gapMillions < 0) return `▼ ${amount} compared with ${comparedWith}`;
  if (gapMillions > 0) return `▲ ${amount} compared with ${comparedWith}`;
  return `Unchanged compared with ${comparedWith}`;
}

function monthDelta(
  months: { period: string; value: number }[] | undefined,
  period: string | undefined,
  current: number | undefined,
): string | null {
  if (!months || !period || current == null) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const earlier = months.find((point) => point.period === `${Number(match[1]) - 1}-${match[2]}`);
  if (!earlier) return null;
  return movement(current - earlier.value, formatMonthLong(earlier.period));
}
