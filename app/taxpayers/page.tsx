import type { Metadata } from "next";

import { ChartFrame, DataTable, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote, Stat } from "@/components/blocks";
import { formatCount, formatPercent } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Taxpayers and tax bands",
  description: "Number of income tax payers by marginal rate, and the share of income tax paid by the top 1% and top 10%.",
  alternates: { canonical: "/taxpayers" },
};

export default async function TaxpayersPage() {
  const loaded = await readSnapshot("hmrc-income-tax");
  const snapshot = takeSnapshot("hmrc-income-tax", loaded.snapshot);
  const meta = SOURCES["hmrc-income-tax"];
  if (!snapshot) return <EmptySource name="HMRC income tax liabilities" />;
  const { payers, shares } = snapshot.data;
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "UK income tax payers by band",
          description: "HMRC table 2.1 and table 2.4.",
          path: "/taxpayers",
          dateModified: snapshot.releaseDate,
          license: meta.licenceUrl,
          publisher: meta.publisher,
          sourceUrl: snapshot.sourceUrl,
        })}
      />
      <PageIntro
        kicker="Taxpayers"
        title="Taxpayers and tax bands"
        lede={`${payers.yearLabel}: ${payers.total == null ? "an unpublished number of" : formatCount(payers.total * 1000)} income tax payers. Counts in the table are thousands of people, as HMRC publishes them.${payers.projected ? " HMRC marks this year with notes, which on this release are the projection years." : ""}`}
      />
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Top 1% share of income tax" value={shares.top1Percent == null ? "—" : formatPercent(shares.top1Percent)} detail={`${shares.yearLabel}, table 2.4.`} />
        <Stat label="Top 10% share of income tax" value={shares.top10Percent == null ? "—" : formatPercent(shares.top10Percent)} detail={`${shares.yearLabel}, table 2.4.`} />
        <Stat label="Total income tax" value={shares.totalTaxBillion == null ? "—" : `£${formatCount(shares.totalTaxBillion)}bn`} detail="Published in the share table, already in £ billion." />
      </div>
      <ChartFrame
        title={`Payers by marginal rate, ${payers.yearLabel}`}
        source={
          <SourceNote
            publisher={meta.publisher}
            title={snapshot.data.attachmentFilename}
            url={snapshot.data.attachmentUrl}
            releaseDate={snapshot.releaseDate}
            licenceUrl={meta.licenceUrl}
          />
        }
      >
        <DataTable
          columns={["Band", "Thousands of payers"]}
          rows={payers.bands.map((band) => [band.name, band.value.toLocaleString("en-GB")])}
        />
      </ChartFrame>
    </>
  );
}
