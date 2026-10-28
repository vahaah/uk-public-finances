import { CiteShare } from "@/components/cite-share";
import { BorrowingChart, CumulativeChart } from "@/components/charts";
import { EquationRow } from "@/components/equation-row";
import {
  ChartFrame,
  datasetJsonLd,
  EmptySource,
  JsonLd,
  SourceNote,
  Stat,
  websiteJsonLd,
} from "@/components/blocks";
import { formatDateLong, formatGbpFromMillions, formatMonth, formatMonthLong, formatPercent, previousFinancialYear } from "@/lib/format";
import { buildRecords } from "@/lib/records";
import { pageMeta } from "@/lib/meta";
import { priceBundle } from "@/lib/prices";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SITE_URL, SOURCES } from "@/lib/site";

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
  const monthLabel = month ? formatMonthLong(month) : "the latest month";
  const monthName = month ? formatMonthLong(month).replace(/ \d{4}$/, "") : "that month";
  const earlierBorrowing = sameMonthValue(data.series.j5ii?.months, month);
  const cite =
    receipts && spending && borrowing != null
      ? `In ${monthLabel}, the public sector received ${formatGbpFromMillions(receipts.value)} and spent ${formatGbpFromMillions(spending.value)}, so it borrowed ${formatGbpFromMillions(Math.abs(borrowing))}.${
          earlierBorrowing == null
            ? ""
            : ` That is ${formatGbpFromMillions(Math.abs(Math.abs(borrowing) - Math.abs(earlierBorrowing)))} ${Math.abs(borrowing) >= Math.abs(earlierBorrowing) ? "more" : "less"} than in ${monthName} last year.`
        }`
      : "The latest UK public sector finances from the ONS.";
  const citation = `${cite} Source: ${meta.publisher}, JW2O, KX5Q, J5II, published ${formatDateLong(snapshot.releaseDate)}. Via budget.vahaah.com/, accessed ${formatDateLong(new Date().toISOString())}.`;
  const ytdReceipts = sumFiscal(data.series.jw2o?.months ?? [], month);
  const ytdSpending = sumFiscal(data.series.kx5q?.months ?? [], month);
  const equationMonth =
    receipts && spending && borrowing != null
      ? {
          periodLabel: monthLabel,
          spendingBn: spending.value / 1000,
          receiptsBn: receipts.value / 1000,
          borrowingBn: Math.abs(borrowing) / 1000,
          caption: `Spending minus receipts equals borrowing. Figures are for ${monthLabel}, rounded to £0.1bn, from ONS Public sector finances.`,
          spoken: `In ${monthLabel}, spending of ${formatGbpFromMillions(spending.value)} minus receipts of ${formatGbpFromMillions(receipts.value)} equals borrowing of ${formatGbpFromMillions(Math.abs(borrowing))}.`,
        }
      : null;
  const equationYtd =
    ytdReceipts != null && ytdSpending != null && yearBorrowing != null
      ? {
          periodLabel: "Year to date",
          spendingBn: ytdSpending / 1000,
          receiptsBn: ytdReceipts / 1000,
          borrowingBn: Math.abs(yearBorrowing) / 1000,
          caption: `Spending minus receipts equals borrowing, April to ${formatMonth(month)}.`,
          spoken: `From April to ${formatMonth(month)}, spending minus receipts equals borrowing.`,
        }
      : null;
  const interestShare = calendarInterestShare(data.series.nmfx?.years ?? [], data.series.jw2o?.years ?? []);
  const overviewRecords = buildRecords({
    borrowingMonths: data.series.j5ii?.months ?? [],
    debtRatioMonths: data.series.hf6x?.months ?? [],
    interestYears: data.series.nmfx?.years ?? [],
    receiptYears: data.series.jw2o?.years ?? [],
    hmrcMonths: [],
  }).filter((record) => ["largest-monthly-surplus", "largest-monthly-borrowing", "highest-debt-ratio"].includes(record.id));
  const recordOrder = ["largest-monthly-surplus", "largest-monthly-borrowing", "highest-debt-ratio"];
  overviewRecords.sort((left, right) => recordOrder.indexOf(left.id) - recordOrder.indexOf(right.id));
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
      <header className="mb-8 max-w-[68ch]">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Is the government spending more than it takes in?</h1>
        <p id="summary" data-cite className="mt-3 text-base text-neutral-900 dark:text-neutral-100">
          {cite}
        </p>
        <CiteShare sentence={cite} citation={citation} url={`${SITE_URL}/`} />
      </header>
      {equationMonth && equationYtd ? <EquationRow month={equationMonth} yearToDate={equationYtd} /> : null}
      {data.financialYear ? (
        <div className="mt-4">
          <ChartFrame
            title={`Borrowing so far in ${data.financialYear.year}`}
            subtitle="Borrowing added up month by month since April, this financial year against last."
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
            <CumulativeChart
              months={data.financialYear.months}
              prices={prices ? priceBundle(prices.data) : null}
              thisYear={data.financialYear.year}
              lastYear={previousFinancialYear(data.financialYear.year)}
            />
          </ChartFrame>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          href="/debt"
          label={debt ? `Net debt at end of ${formatMonthLong(debt.period)}` : "Net debt"}
          value={debt ? formatGbpFromMillions(debt.value) : "Not available"}
          detail="Public sector net debt, excluding public sector banks. The latest month is provisional."
        />
        <Stat
          href="/debt"
          label={ratio ? `Net debt, ${formatMonthLong(ratio.period)}` : "Net debt as a share of GDP"}
          value={ratio ? `${formatPercent(ratio.value)} of GDP` : "Not available"}
          detail="Share of calendar-year GDP is on the debt page. This month's ratio is HF6X."
        />
        <Stat
          href="/debt"
          label={interest ? `Debt interest in ${formatMonthLong(interest.period)}` : "Debt interest"}
          value={interest ? formatGbpFromMillions(interest.value) : "Not available"}
          detail="Central government interest paid, net of interest received, including inflation uplift on index-linked gilts."
        />
        <Stat
          href="/debt"
          label={interestShare ? `Interest share of receipts, calendar year ${interestShare.year}` : "Interest share of receipts"}
          value={interestShare ? formatPercent(interestShare.share) : "Not available"}
          detail="Debt interest (NMFX) divided by public sector receipts (JW2O). Both annual series are calendar years, not financial years."
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {overviewRecords.map((record) => (
          <a key={record.id} href="/records" className="border border-neutral-200 p-4 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950" title={record.basis}>
            <p className="font-medium">
              {record.kind === "largest" ? "Largest" : "Highest"} {record.metric}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{record.valueLabel}</p>
            <p className="mt-1 text-neutral-800 dark:text-neutral-200">in {formatMonth(record.period)}</p>
          </a>
        ))}
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

function sameMonthValue(months: { period: string; value: number }[] | undefined, period: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match || !months) return null;
  return months.find((point) => point.period === `${Number(match[1]) - 1}-${match[2]}`)?.value ?? null;
}

function sumFiscal(months: { period: string; value: number }[], through: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(through);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const startYear = month >= 4 ? year : year - 1;
  const start = `${startYear}-04`;
  const picked = months.filter((point) => point.period >= start && point.period <= through);
  if (picked.length === 0) return null;
  return picked.reduce((sum, point) => sum + point.value, 0);
}

function calendarInterestShare(
  interest: { period: string; value: number }[],
  receipts: { period: string; value: number }[],
): { year: string; share: number } | null {
  const byYear = new Map(receipts.map((point) => [point.period, point.value]));
  const latest = [...interest].reverse().find((point) => (byYear.get(point.period) ?? 0) > 0);
  if (!latest) return null;
  const base = byYear.get(latest.period) ?? 0;
  return { year: latest.period, share: (latest.value / base) * 100 };
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
