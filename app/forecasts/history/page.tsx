import Link from "next/link";

import { AUTHOR_JSON_LD, Breadcrumb, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd } from "@/components/blocks";
import { formatBillions, roundBn } from "@/lib/format";
import { vintageLabel } from "@/lib/forecasts-view";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "OBR databank: full history",
  description: "Public sector net borrowing, net debt, receipts and spending from 1946, with the latest OBR forecast. Download as CSV.",
  path: "/forecasts/history",
});

function anchor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function ForecastHistoryPage() {
  const loaded = await readSnapshot("obr-databank");
  const obr = takeSnapshot("obr-databank", loaded.snapshot);
  const meta = SOURCES["obr-databank"];
  const series = obr?.data.series.slice(0, 4) ?? [];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("OBR databank: full history", "/forecasts/history")} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          "@id": `${SITE_URL}/forecasts/history#dataset`,
          name: "UK borrowing, debt, receipts and spending since 1946: OBR outturn and forecast",
          description: "OBR public finances databank series by financial year in £bn, outturn and the latest forecast.",
          url: `${SITE_URL}/forecasts/history`,
          inLanguage: "en-GB",
          isAccessibleForFree: true,
          temporalCoverage: `1946/${series.flatMap((item) => item.points.map((point) => point.year)).sort().at(-1)?.slice(0, 4) ?? ""}`,
          spatialCoverage: { "@type": "Country", name: "United Kingdom" },
          creator: AUTHOR_JSON_LD,
          license: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
          isBasedOn: { "@type": "Dataset", name: "OBR public finances databank", url: "https://obr.uk/data/" },
          distribution: { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE_URL}/forecasts/history/csv` },
        }}
      />
      <Breadcrumb current="Full history" parents={[{ href: "/forecasts", label: "Forecasts" }]} />
      <PageIntro
        kicker="Office for Budget Responsibility"
        title="How have borrowing, debt, receipts and spending changed since 1946?"
        lede={`Outturn and forecast by financial year, in £bn. Forecast from the ${vintageLabel(obr?.data.round ?? null) ?? "OBR databank, not loaded yet"}.`}
      />
      {series.length === 0 ? (
        <EmptySource name="The OBR databank" pending />
      ) : (
        <>
          <nav aria-label="Jump to series" className="sticky top-14 z-10 flex flex-wrap gap-3 border-b border-neutral-200 bg-white py-2 text-sm dark:border-neutral-800 dark:bg-black">
            {series.map((item) => (
              <a key={item.name} className="underline decoration-neutral-400 underline-offset-4" href={`#${anchor(item.name)}`}>
                {item.name}
              </a>
            ))}
            <a className="ml-auto underline decoration-neutral-400 underline-offset-4" href="/forecasts/history/csv" download>
              Download CSV
            </a>
          </nav>
          {series.map((item) => (
            <section key={item.name} id={anchor(item.name)} className="mt-6 scroll-mt-28">
              <h2 className="text-sm font-medium">{item.name}</h2>
              <DataTable
                columns={["Financial year", "Outturn", "Forecast"]}
                rows={item.points.map((point) => [
                  point.year,
                  point.outturn == null ? "—" : formatBillions(roundBn(point.outturn)),
                  point.forecast == null ? "—" : formatBillions(roundBn(point.forecast)),
                ])}
              />
            </section>
          ))}
          <SourceNote publisher={meta.publisher} title="Public finances databank" url={obr?.sourceUrl ?? meta.page} releaseDate={obr?.releaseDate ?? null} licenceUrl={meta.licenceUrl} sourceId="obr-databank" />
        </>
      )}
      <p className="mt-3 text-sm">
        <Link className="underline decoration-neutral-400 underline-offset-4" href="/forecasts">
          Back to Forecasts
        </Link>
      </p>
    </>
  );
}
