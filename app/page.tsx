import type { Metadata } from "next";

import { ChartFrame, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote, Stat } from "@/components/blocks";
import { BorrowingChart } from "@/components/charts";
import { borrowingWords, formatGbpFromMillions, formatMonth, formatPercent, formatRelease } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "UK public finances",
  description: "Headline borrowing, receipts, spending, debt and debt interest, with the ONS release date.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const ons = await readSnapshot("ons-psf");
  const snapshot = takeSnapshot("ons-psf", ons.snapshot);
  const meta = SOURCES["ons-psf"];
  if (!snapshot) return <EmptySource name="ONS public sector finances" />;
  const data = snapshot.data;
  const borrowing = data.bulletinSign.borrowingLatest;
  const receipts = data.series.jw2o?.latest;
  const spending = data.series.kx5q?.latest;
  const debt = data.series.kse6?.latest;
  const ratio = data.series.hf6x?.latest;
  const interest = data.series.nmfx?.latest;
  const month = data.series.j5ii?.latest?.period;
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "UK public sector finances headlines",
          description: "Latest ONS public sector finances time series used on Budget.",
          path: "/",
          dateModified: snapshot.releaseDate,
          license: meta.licenceUrl,
          publisher: meta.publisher,
          sourceUrl: snapshot.sourceUrl,
        })}
      />
      <PageIntro
        kicker={`Data as of ${formatRelease(snapshot.releaseDate)}`}
        title="UK public finances"
        lede={
          month && borrowing != null
            ? `${formatMonth(month)}: public sector net borrowing was ${formatGbpFromMillions(borrowing)} (${borrowingWords(borrowing)}). Next ONS release: ${data.series.j5ii?.nextRelease || "not stated"}.`
            : "ONS public sector finances."
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          href="/borrowing"
          label={month ? `Borrowing, ${formatMonth(month)}` : "Borrowing"}
          value={borrowing == null ? "—" : formatGbpFromMillions(borrowing)}
          detail={`${borrowingWords(borrowing ?? 0)} · J5II, sign as in the ONS bulletin. Year to ${data.financialYear?.through ? formatMonth(data.financialYear.through) : "—"}: ${data.bulletinSign.financialYearBorrowing == null ? "—" : formatGbpFromMillions(data.bulletinSign.financialYearBorrowing)}.`}
        />
        <Stat
          href="/receipts"
          label={receipts ? `Receipts, ${formatMonth(receipts.period)}` : "Receipts"}
          value={receipts ? formatGbpFromMillions(receipts.value) : "—"}
          detail="Public sector current receipts excluding banks, JW2O, £ million in the download."
        />
        <Stat
          href="/spending"
          label={spending ? `Spending, ${formatMonth(spending.period)}` : "Spending"}
          value={spending ? formatGbpFromMillions(spending.value) : "—"}
          detail="Total managed expenditure excluding banks, KX5Q. This is the month, not the year."
        />
        <Stat
          href="/debt"
          label={debt ? `Debt, end ${formatMonth(debt.period)}` : "Debt"}
          value={debt ? formatGbpFromMillions(debt.value) : "—"}
          detail={ratio ? `${formatPercent(ratio.value)} of GDP (HF6X). Stock is KSE6.` : "PSND ex."}
        />
        <Stat
          href="/debt"
          label={interest ? `Debt interest, ${formatMonth(interest.period)}` : "Debt interest"}
          value={interest ? formatGbpFromMillions(interest.value) : "—"}
          detail="Central government net interest payable, NMFX."
        />
        <Stat
          href="/borrowing"
          label="Current budget deficit"
          value={
            data.bulletinSign.currentBudgetDeficitLatest == null
              ? "—"
              : formatGbpFromMillions(data.bulletinSign.currentBudgetDeficitLatest)
          }
          detail={month ? `${formatMonth(month)}, JW2T on the bulletin sign.` : "JW2T"}
        />
      </div>
      <div className="mt-3">
        <ChartFrame
          title="Monthly borrowing"
          source={
            <SourceNote
              publisher={meta.publisher}
              title="J5II public sector net borrowing excluding banks"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              extra="Negative values in the download are shown as positive borrowing"
            />
          }
        >
          <BorrowingChart months={data.series.j5ii?.months ?? []} />
        </ChartFrame>
      </div>
    </>
  );
}
