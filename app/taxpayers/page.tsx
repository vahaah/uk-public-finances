import Link from "next/link";

import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, Stat, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatBillions, formatCount, formatPercent } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "How many people pay income tax in the UK?",
  description:
    "Number of UK income tax payers by marginal rate and the share of income tax paid by the top 1% and top 10%, from HMRC income tax liabilities statistics.",
  path: "/taxpayers",
});

export default async function TaxpayersPage() {
  const loaded = await readSnapshot("hmrc-income-tax");
  const snapshot = takeSnapshot("hmrc-income-tax", loaded.snapshot);
  const meta = SOURCES["hmrc-income-tax"];
  if (!snapshot) return <EmptySource name="HMRC income tax liabilities" />;
  const { payers, shares } = snapshot.data;
  const year = payers.yearLabel.replace(" to ", "-").replace(/(\d{4})-(\d{4})/, (_, start: string, end: string) => `${start}-${end.slice(2)}`);
  const totalPeople = payers.total == null ? null : payers.total / 1000;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("UK income taxpayers and tax bands", "/taxpayers")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/taxpayers",
          name: "UK income taxpayers by marginal rate and share of tax",
          description:
            "HMRC projects the number of income taxpayers by marginal rate for tax year 2026-27, and the share of income tax liabilities paid by the top 1% and top 10%. The top 1% projection is indicative.",
          keywords: ["UK income taxpayers", "higher rate taxpayers", "top 1 percent tax"],
          temporalCoverage: "2026-04/2027-04",
          variableMeasured: ["Income taxpayers by marginal rate, thousands", "Top 1% and top 10% share of income tax"],
          dateModified: snapshot.releaseDate,
          sources: [{ id: "hmrc-income-tax", name: meta.title, url: snapshot.sourceUrl, publisher: meta.publisher, licenceUrl: meta.licenceUrl, releaseDate: snapshot.releaseDate }],
        })}
      />
      <Breadcrumb current="Income taxpayers" />
      <PageIntro
        kicker="HMRC income tax"
        title="UK income taxpayers and tax bands"
        lede={
          <>
            <p>
              {totalPeople == null
                ? `The number of income taxpayers for tax year ${year} is not available.`
                : `HMRC projects ${formatCount(payers.total ?? 0)} thousand income taxpayers in tax year ${year}, about ${totalPeople.toLocaleString("en-GB", { maximumFractionDigits: 1 })} million people.`}
              {payers.projected
                ? " Figures for 2026-27 are projections based on the 2023-24 Survey of Personal Incomes and the OBR's March 2026 Economic and fiscal outlook. The top 1% projection is indicative."
                : ""}
            </p>
            <p className="mt-2">
              Cash income tax received is on{" "}
              <Link className="underline decoration-neutral-500 underline-offset-4" href="/receipts">
                tax receipts
              </Link>
              . Shares below are of income tax owed, ranked by income before tax.
            </p>
          </>
        }
      />
      {payers.projected ? (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1 text-xs dark:border-neutral-700">
          <span aria-hidden="true">◐</span> Projection
        </p>
      ) : null}
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Stat label={`Share of income tax paid by the top 1%, tax year ${year}`} value={shares.top1Percent == null ? "Not available" : formatPercent(shares.top1Percent)} detail="Top 1% of income taxpayers by income. Indicative projection." />
        <Stat label={`Share of income tax paid by the top 10%, tax year ${year}`} value={shares.top10Percent == null ? "Not available" : formatPercent(shares.top10Percent)} detail="Top 10% of income taxpayers by income." />
        <Stat label={`Total income tax liabilities, tax year ${year}`} value={shares.totalTaxBillion == null ? "Not available" : formatBillions(shares.totalTaxBillion)} detail="Income tax owed for the year, which differs from cash received." />
      </div>
      <ChartFrame
        title={`Income taxpayers by marginal rate, tax year ${year}`}
        source={<SourceNote publisher={meta.publisher} title="Income Tax liabilities statistics" url={snapshot.data.attachmentUrl} releaseDate={snapshot.releaseDate} licenceUrl={meta.licenceUrl} sourceId="hmrc-income-tax" />}
      >
        <div className="flex h-8 overflow-hidden rounded-sm" aria-hidden="true">
          {payers.bands.map((band, index) => (
            <div
              key={band.name}
              style={{ width: `${payers.total ? (band.value / payers.total) * 100 : 0}%`, background: ["#1d4ed8", "#047857", "#b45309", "#6d28d9"][index % 4] }}
              title={`${band.name} ${formatPercent(payers.total ? (band.value / payers.total) * 100 : 0)}`}
            />
          ))}
        </div>
        <DataTable
          columns={["Marginal rate", "Taxpayers, thousands", "Share"]}
          rows={payers.bands.map((band) => [
            band.name,
            band.value.toLocaleString("en-GB"),
            formatPercent(payers.total ? (band.value / payers.total) * 100 : 0),
          ])}
        />
      </ChartFrame>
    </>
  );
}
