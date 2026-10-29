import Link from "next/link";

import { CiteShare } from "@/components/cite-share";
import { Breadcrumb, JsonLd, breadcrumbJsonLd } from "@/components/blocks";
import { formatMonth } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { buildRecords } from "@/lib/records";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SITE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: "Records in UK public finances",
  description: "The highest and lowest figures in UK public finances since records began, with the date set and the official series behind each.",
  path: "/records",
});

export default async function RecordsPage() {
  const [onsLoaded, hmrcLoaded] = await Promise.all([readSnapshot("ons-psf"), readSnapshot("hmrc-receipts")]);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const hmrc = takeSnapshot("hmrc-receipts", hmrcLoaded.snapshot);
  const records = buildRecords({
    borrowingMonths: ons?.data.series.j5ii?.months ?? [],
    debtRatioMonths: ons?.data.series.hf6x?.months ?? [],
    interestYears: ons?.data.series.nmfx?.years ?? [],
    receiptYears: ons?.data.series.jw2o?.years ?? [],
    hmrcMonths: hmrc?.data.monthly.map((row) => ({ period: row.period, total: row.total })).map((row) => ({ period: row.period, value: row.total })) ?? [],
  });
  const cite = "Each record is worked out from official figures already on this site.";
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Records", "/records")} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Records in UK public finances",
          itemListElement: records.map((record, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${record.kind === "largest" ? "Largest" : "Highest"} ${record.metric} since ${record.id === "highest-hmrc-month" ? "2017" : `records began in ${formatMonth(record.firstPeriod)}`}`,
            url: `${SITE_URL}/records#${record.id}`,
          })),
        }}
      />
      <Breadcrumb current="Records" />
      <header className="mb-8 max-w-[68ch]">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Which records have UK public finances set?</h1>
        <p id="summary" data-cite className="mt-3 text-base">
          Each record is worked out from official figures already on this site. Records use the latest estimates, so they can change when earlier figures are revised.
        </p>
        <CiteShare sentence={cite} citation={`${cite} Via budget.vahaah.com/records.`} url={`${SITE_URL}/records`} />
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {records.map((record) => (
          <article key={record.id} id={record.id} className="border border-neutral-200 p-6 dark:border-neutral-800" title={record.basis}>
            <h2 className="text-sm font-medium">
              {record.kind === "largest" ? "Largest" : "Highest"} {record.metric} since {record.id === "highest-hmrc-month" ? "2017" : `records began in ${formatMonth(record.firstPeriod)}`}
            </h2>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{record.valueLabel}</p>
            <p className="mt-2 text-sm">
              {record.valueLabel} in {formatMonth(record.period)}. Source: {record.publisher}, {record.seriesId}. See{" "}
              <a className="underline decoration-neutral-500 underline-offset-4" href={RECORD_PAGES[record.seriesId]?.href ?? "/borrowing"}>
                {RECORD_PAGES[record.seriesId]?.label ?? "borrowing"}
              </a>
              .
            </p>
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">{record.basis}</p>
          </article>
        ))}
      </div>
      <section className="mt-8 max-w-[68ch] text-sm leading-6">
        <h2 className="font-medium">How records are worked out</h2>
        <p className="mt-2">
          Records compare each value with every earlier value in the same series. Money records are in cash terms, not adjusted for inflation, unless the card says otherwise.
        </p>
        <p className="mt-2">
          <Link className="underline decoration-neutral-400 underline-offset-4" href="/">
            Back to the overview
          </Link>
        </p>
      </section>
    </>
  );
}

/** The page that charts each record's series. */
const RECORD_PAGES: Record<string, { href: string; label: string }> = {
  J5II: { href: "/borrowing", label: "borrowing" },
  HF6X: { href: "/debt", label: "debt" },
  "NMFX ÷ JW2O": { href: "/debt", label: "debt interest" },
  "HMRC monthly total": { href: "/receipts", label: "tax receipts" },
};
