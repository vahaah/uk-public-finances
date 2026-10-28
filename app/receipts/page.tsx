import type { Metadata } from "next";

import { ChartFrame, DataTable, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote } from "@/components/blocks";
import { ReceiptsChart } from "@/components/charts";
import { formatGbpFromMillions, formatMonth } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Where the money comes from",
  description: "HMRC cash receipts by tax for the latest financial year, and monthly totals.",
  alternates: { canonical: "/receipts" },
};

export default async function ReceiptsPage() {
  const loaded = await readSnapshot("hmrc-receipts");
  const snapshot = takeSnapshot("hmrc-receipts", loaded.snapshot);
  const meta = SOURCES["hmrc-receipts"];
  if (!snapshot) return <EmptySource name="HMRC receipts" />;
  const { annual, monthly } = snapshot.data;
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "HMRC tax receipts",
          description: `HMRC receipts by tax, ${annual.year}.`,
          path: "/receipts",
          dateModified: snapshot.releaseDate,
          license: meta.licenceUrl,
          publisher: meta.publisher,
          sourceUrl: snapshot.sourceUrl,
        })}
      />
      <PageIntro
        kicker="Receipts"
        title="Where the money comes from"
        lede={`HMRC received ${formatGbpFromMillions(annual.total)} in ${annual.year}, on a cash basis. Components that sit inside income tax or National Insurance are not drawn again.`}
      />
      <ChartFrame
        title={`Receipts by tax, ${annual.year}`}
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
        <ReceiptsChart taxes={annual.taxes} />
        <DataTable
          columns={["Tax", "£ million", "£ billion"]}
          rows={annual.taxes.map((tax) => [tax.name, tax.value.toLocaleString("en-GB"), formatGbpFromMillions(tax.value)])}
        />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame
          title="Monthly HMRC receipts"
          source={
            <SourceNote
              publisher={meta.publisher}
              title="Receipts_Monthly, total HMRC receipts"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
            />
          }
        >
          <DataTable
            columns={["Month", "£ million"]}
            rows={monthly.slice(-18).map((row) => [formatMonth(row.period), row.total.toLocaleString("en-GB")])}
          />
        </ChartFrame>
      </div>
    </>
  );
}
