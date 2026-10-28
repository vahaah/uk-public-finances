import type { Metadata } from "next";

import { ChartFrame, DataTable, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote } from "@/components/blocks";
import { formatGbpFromMillions, formatMonth } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "OBR forecasts and outturn",
  description: "ONS borrowing outturn against the OBR public finances databank, when that workbook is in the snapshot store.",
  alternates: { canonical: "/forecasts" },
};

export default async function ForecastsPage() {
  const onsLoaded = await readSnapshot("ons-psf");
  const obrLoaded = await readSnapshot("obr-databank");
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const obr = takeSnapshot("obr-databank", obrLoaded.snapshot);
  const meta = SOURCES["obr-databank"];
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "OBR forecasts and ONS outturn",
          description: "Public sector net borrowing outturn, and the OBR databank when it is available.",
          path: "/forecasts",
          dateModified: obr?.releaseDate ?? ons?.releaseDate ?? null,
          license: meta.licenceUrl,
          publisher: meta.publisher,
          sourceUrl: meta.page,
        })}
      />
      <PageIntro
        kicker="Forecasts"
        title="OBR forecasts and outturn"
        lede="Outturn is the ONS financial-year sum of J5II, on the bulletin sign. A forecast column is drawn only from cells in an OBR workbook that passed validation."
      />
      {ons?.data.financialYear ? (
        <ChartFrame
          title={`Outturn, ${ons.data.financialYear.year} to ${formatMonth(ons.data.financialYear.through)}`}
          source={
            <SourceNote
              publisher={SOURCES["ons-psf"].publisher}
              title="Sum of monthly J5II, negated"
              url={ons.sourceUrl}
              releaseDate={ons.releaseDate}
              licenceUrl={SOURCES["ons-psf"].licenceUrl}
            />
          }
        >
          <DataTable
            columns={["Period", "Borrowing"]}
            rows={ons.data.financialYear.months.map((row) => [formatMonth(row.period), formatGbpFromMillions(-row.cumulative)])}
          />
        </ChartFrame>
      ) : (
        <EmptySource name="ONS borrowing" />
      )}
      <div className="mt-3">
        {obr && obr.data.series.length > 0 ? (
          <ChartFrame
            title={obr.data.round ? `OBR ${obr.data.round}` : "OBR databank"}
            source={
              <SourceNote
                publisher={meta.publisher}
                title={obr.data.origin === "blob-manual" ? "Manual Blob upload of the databank" : "Public finances databank"}
                url={obr.sourceUrl}
                releaseDate={obr.releaseDate}
                licenceUrl={meta.licenceUrl}
              />
            }
          >
            {obr.data.series.slice(0, 4).map((series) => (
              <div key={series.name} className="mt-4">
                <h3 className="text-xs font-medium">{series.name}</h3>
                <DataTable
                  columns={["Year", "Outturn", "Forecast"]}
                  rows={series.points.map((point) => [
                    point.year,
                    point.outturn == null ? "—" : point.outturn.toLocaleString("en-GB"),
                    point.forecast == null ? "—" : point.forecast.toLocaleString("en-GB"),
                  ])}
                />
              </div>
            ))}
          </ChartFrame>
        ) : (
          <EmptySource name="the OBR public finances databank" />
        )}
      </div>
    </>
  );
}
