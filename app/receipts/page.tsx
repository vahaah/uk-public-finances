import Link from "next/link";

import { CiteShare } from "@/components/cite-share";
import { HistoryChart, ReceiptsChart } from "@/components/charts";
import { JumpTo } from "@/components/jump-to";
import { ReceiptMixChart } from "@/components/mix-chart";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { fiscalMarkers } from "@/lib/budgets/markers";
import { formatGbpFromMillions, formatMonth, formatPercent, formatReceiptBn, formatReceiptShare } from "@/lib/format";
import { receiptMix } from "@/lib/mix";
import { SITE_URL } from "@/lib/site";
import { pageMeta } from "@/lib/meta";
import { priceBundle } from "@/lib/prices";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK tax receipts by tax: HMRC figures",
  description:
    "How much tax HMRC collects, by tax and by month: income tax, National Insurance, VAT, corporation tax and more. Cash receipts, from HMRC.",
  path: "/receipts",
});

export default async function ReceiptsPage() {
  const [loaded, priceLoaded, markers] = await Promise.all([readSnapshot("hmrc-receipts"), readSnapshot("ons-prices"), fiscalMarkers()]);
  const snapshot = takeSnapshot("hmrc-receipts", loaded.snapshot);
  const prices = takeSnapshot("ons-prices", priceLoaded.snapshot);
  const bundle = prices ? priceBundle(prices.data) : null;
  const meta = SOURCES["hmrc-receipts"];
  if (!snapshot) return <EmptySource name="HMRC receipts" />;
  const { annual, monthly } = snapshot.data;
  const rows = [...annual.taxes].sort((left, right) => right.value - left.value);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Where UK tax comes from", "/receipts")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/receipts",
          name: "HMRC tax and National Insurance receipts by tax",
          description: `Cash receipts by tax collected by HMRC in ${annual.year}, plus monthly totals. These are not the accrued public sector receipts published by the ONS.`,
          keywords: ["UK tax receipts", "income tax", "VAT", "National Insurance"],
          temporalCoverage: "2006-04/2026-03",
          variableMeasured: ["Total HMRC receipts", "Receipts by tax"],
          dateModified: snapshot.releaseDate,
          sources: [{ id: "hmrc-receipts", name: meta.title, url: snapshot.sourceUrl, publisher: meta.publisher, licenceUrl: meta.licenceUrl, releaseDate: snapshot.releaseDate }],
        })}
      />
      <Breadcrumb current="Tax and receipts" />
      <JumpTo
        links={[
          { href: "#mix", label: "Mix over time" },
          { href: "#by-tax", label: "Receipts by tax" },
          { href: "#by-year", label: "By financial year" },
          { href: "#by-month", label: "By month" },
        ]}
      />
      <PageIntro
        kicker="HMRC tax receipts"
        title="Where does the UK government's money come from?"
        lede={
          <>
            <p>
              HMRC received {formatGbpFromMillions(annual.total)} in tax and National Insurance contributions in {annual.year}, counted when the cash arrived. Lines HMRC already includes inside income tax or National Insurance are not shown again.
            </p>
            <p className="mt-2">
              These are cash receipts. The overview shows ONS accrued receipts for the whole public sector, so the totals differ. Spending is on{" "}
              <Link className="underline decoration-neutral-500 underline-offset-4" href="/spending">
                where the money goes
              </Link>
              . Income taxpayers are on{" "}
              <Link className="underline decoration-neutral-500 underline-offset-4" href="/taxpayers">
                income taxpayers
              </Link>
              .
            </p>
          </>
        }
      />
      <CiteShare
        sentence={receiptCite(annual, rows)}
        citation={`${receiptCite(annual, rows)} Source: ${meta.publisher}, HMRC tax receipts, published ${snapshot.releaseDate ?? ""}. Via budget.vahaah.com/receipts.`}
        url={`${SITE_URL}/receipts`}
      />
      <div id="mix" className="mt-6 scroll-mt-28">
        <ChartFrame
          title="How the mix of receipts has changed"
          subtitle="How HMRC receipts split between the main taxes each year since 2006-07. Switch to 100% to see shares instead of £bn."
          source={
            <SourceNote
              publisher={meta.publisher}
              title="HMRC tax receipts and National Insurance contributions for the UK"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              extra="HMRC figures are cash received in the period. ONS public sector receipts are recorded when the tax is due, so the two do not match month by month."
              sourceId="hmrc-receipts"
            />
          }
        >
          <ReceiptMixChart pounds={receiptMix(snapshot.data.annualHistory, false)} shares={receiptMix(snapshot.data.annualHistory, true)} prices={bundle} />
        </ChartFrame>
      </div>
      <div id="by-tax" className="mt-3 scroll-mt-28">
      <ChartFrame
        title={`Receipts by tax, ${annual.year}`}
        subtitle="£bn. The ten largest taxes, with the rest grouped as Other."
        source={
          <SourceNote
            publisher={meta.publisher}
            title="HMRC tax receipts and National Insurance contributions for the UK"
            url={snapshot.data.attachmentUrl}
            releaseDate={snapshot.releaseDate}
            licenceUrl={meta.licenceUrl}
            sourceId="hmrc-receipts"
          />
        }
      >
        <ReceiptsChart taxes={annual.taxes} year={annual.year} prices={bundle} />
        <DataTable
          columns={["Tax", "£bn", "Share of total"]}
          rows={rows.slice(0, 10).map((tax) => [tax.name, receiptCell(tax.value), formatReceiptShare(tax.value, annual.total)])}
        />
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">All {rows.length} taxes</summary>
          <DataTable
            columns={["Tax", "£bn", "Share of total"]}
            rows={rows.map((tax) => [tax.name, receiptCell(tax.value), formatReceiptShare(tax.value, annual.total)])}
          />
        </details>
      </ChartFrame>
      </div>
      <div id="by-year" className="mt-3 scroll-mt-28">
        <ChartFrame
          title="HMRC receipts by financial year"
          subtitle="£bn. Cash received by HMRC in each financial year. As a share of GDP, each financial year uses GDP for the same April to March year."
          source={
            <SourceNote
              publisher={meta.publisher}
              title="HMRC tax receipts and National Insurance contributions for the UK, annual table"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="hmrc-receipts"
            />
          }
        >
          <HistoryChart
            points={snapshot.data.annualHistory.map((row) => ({ period: row.year, value: row.total }))}
            frequency="financial"
            unit="million"
            prices={bundle}
            name="Total HMRC receipts"
            markers={markers}
          />
        </ChartFrame>
      </div>
      <div id="by-month" className="mt-3 scroll-mt-28">
        <ChartFrame
          title="Total HMRC receipts by month"
          subtitle="The chart shows £bn and the table shows £m. Not adjusted for inflation. Receipts are not spread evenly across the year. Self assessment income tax is mostly paid in January and July, so those months are higher every year."
          source={
            <SourceNote
              publisher={meta.publisher}
              title="HMRC tax receipts and National Insurance contributions for the UK, monthly table"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="hmrc-receipts"
            />
          }
        >
          <HistoryChart
            points={monthly.map((row) => ({ period: row.period, value: row.total }))}
            frequency="month"
            unit="million"
            prices={bundle}
            gdp={false}
            name="HMRC receipts"
            markers={markers}
          />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium">Show table</summary>
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">Last 18 months, £m. Source figures are £ million, so 75,778 is £75.8bn.</p>
            <DataTable
              columns={["Month", "£m"]}
              rows={monthly.slice(-18).map((row) => [formatMonth(row.period), row.total.toLocaleString("en-GB", { maximumFractionDigits: 0 })])}
            />
          </details>
        </ChartFrame>
      </div>
    </>
  );
}

function receiptCite(
  annual: { year: string; total: number; taxes: { name: string; value: number }[] },
  rows: { name: string; value: number }[],
): string {
  const top = rows[0];
  if (!top) return `HMRC receipts in ${annual.year}.`;
  const mix = receiptMix([annual], true)[0];
  const together = mix ? Number((mix.income + mix.nics + mix.vat).toFixed(1)) : 0;
  return `${top.name} raised ${formatGbpFromMillions(top.value)} in ${annual.year}, ${formatReceiptShare(top.value, annual.total)} of HMRC receipts. Income tax, National Insurance and VAT together made up ${formatPercent(together)}.`;
}

function receiptCell(millions: number): string {
  const money = formatReceiptBn(millions);
  return millions < 0 && Math.abs(millions) >= 50 ? `${money}, net repayment` : money;
}
