import Link from "next/link";

import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, Stat, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatBillions, formatCount, formatPercent } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "How many people pay income tax in the UK?",
  description:
    "How many people in the UK pay income tax at each rate, and the share paid by the top 1% and top 10%. HMRC projections for 2026-27.",
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
          <span aria-hidden="true">◐</span> Projection: HMRC estimate for {year}
        </p>
      ) : null}
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Share of income tax paid by the top 1%" value={shares.top1Percent == null ? "Not available" : formatPercent(shares.top1Percent)} detail="Top 1% of income taxpayers, ranked by income. HMRC marks this projection as indicative." />
        <Stat label="Share of income tax paid by the top 10%" value={shares.top10Percent == null ? "Not available" : formatPercent(shares.top10Percent)} detail="Top 10% of income taxpayers, ranked by income." />
        <Stat label="Total income tax liabilities" value={shares.totalTaxBillion == null ? "Not available" : formatBillions(shares.totalTaxBillion)} detail="Tax owed for the year. Differs from cash received." />
      </div>
      <ChartFrame
        title={`Income taxpayers by highest rate paid, tax year ${year}`}
        source={<SourceNote publisher={meta.publisher} title="Income Tax liabilities statistics" url={snapshot.data.attachmentUrl} releaseDate={snapshot.releaseDate} licenceUrl={meta.licenceUrl} sourceId="hmrc-income-tax" />}
      >
        <div className="flex h-10 items-stretch overflow-hidden rounded-sm">
          {payers.bands.map((band, index) => {
            const share = payers.total ? (band.value / payers.total) * 100 : 0;
            const outside = share < 4;
            return (
              <div
                key={band.name}
                className="relative bg-blue-700 dark:bg-blue-300"
                style={{ width: `${share}%`, opacity: [0.9, 0.75, 0.6, 0.45][index] ?? 0.45 }}
                title={`${bandLabel(band.name)} ${formatPercent(share)}`}
              >
                {outside ? null : (
                  <span className="absolute inset-0 flex items-center justify-center px-1 text-[11px] text-white dark:text-neutral-950">
                    {bandLabel(band.name)} {formatPercent(share)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-neutral-800 dark:text-neutral-200">
          {payers.bands
            .filter((band) => (payers.total ? (band.value / payers.total) * 100 : 0) < 4)
            .map((band) => `${bandLabel(band.name)} ${formatPercent(payers.total ? (band.value / payers.total) * 100 : 0)}`)
            .join(" · ")}
        </p>
        <DataTable
          columns={["Highest rate paid", "Taxpayers (thousands)", "Share"]}
          rows={payers.bands.map((band) => [
            bandLabel(band.name),
            band.value.toLocaleString("en-GB"),
            formatPercent(payers.total ? (band.value / payers.total) * 100 : 0),
          ])}
        />
      </ChartFrame>
    </>
  );
}

function bandLabel(name: string): string {
  if (name === "Savers") return "Savers rate";
  return name.endsWith("rate") ? name : `${name} rate`;
}
