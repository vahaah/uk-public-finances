import Link from "next/link";

import { ReceiptsChart } from "@/components/charts";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatGbpFromMillions, formatMonth, formatPercent } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Where UK tax comes from: HMRC receipts by tax",
  description:
    "How much tax HMRC collected and from which taxes: income tax, National Insurance, VAT, corporation tax and more, by year and month. Source: HMRC.",
  path: "/receipts",
});

export default async function ReceiptsPage() {
  const loaded = await readSnapshot("hmrc-receipts");
  const snapshot = takeSnapshot("hmrc-receipts", loaded.snapshot);
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
      <PageIntro
        kicker="HMRC tax receipts"
        title="Where UK tax comes from"
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
      <ChartFrame
        title={`Receipts by tax, ${annual.year}`}
        subtitle="£ billion. The chart shows the ten largest taxes and groups the rest as Other."
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
        <ReceiptsChart taxes={annual.taxes} />
        <DataTable
          columns={["Tax", "£bn", "Share"]}
          rows={rows.map((tax) => [tax.name, formatGbpFromMillions(tax.value), formatPercent((tax.value / annual.total) * 100)])}
        />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame
          title="Total HMRC receipts by month, last 18 months"
          subtitle="£ million."
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
          <DataTable
            columns={["Month", "£m"]}
            rows={monthly.slice(-18).map((row) => [formatMonth(row.period), row.total.toLocaleString("en-GB")])}
          />
        </ChartFrame>
      </div>
    </>
  );
}
