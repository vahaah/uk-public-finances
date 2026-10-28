import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatGbpFromMillions, formatMonth, formatMonthLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "OBR public finance forecasts vs outturn",
  description:
    "ONS borrowing for the financial year so far, with the Office for Budget Responsibility forecast vintage marked pending until a databank file is loaded.",
  path: "/forecasts",
});

export default async function ForecastsPage() {
  const onsLoaded = await readSnapshot("ons-psf");
  const obrLoaded = await readSnapshot("obr-databank");
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const obr = takeSnapshot("obr-databank", obrLoaded.snapshot);
  const meta = SOURCES["obr-databank"];
  const onsMeta = SOURCES["ons-psf"];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("OBR forecasts against outturn", "/forecasts")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/forecasts",
          name: "ONS borrowing outturn and OBR forecast",
          description:
            "Public sector net borrowing recorded so far this financial year, from the ONS. An OBR forecast is shown only when a databank vintage has been loaded.",
          keywords: ["OBR forecast", "UK deficit", "public sector net borrowing"],
          temporalCoverage: ons?.data.financialYear ? `2026-04/${ons.data.financialYear.through}` : "2026-04/2026-09",
          variableMeasured: ["Public sector net borrowing outturn"],
          dateModified: obr?.releaseDate ?? ons?.releaseDate ?? null,
          sources: [
            {
              id: "ons-psf",
              name: onsMeta.title,
              url: ons?.sourceUrl ?? onsMeta.page,
              publisher: onsMeta.publisher,
              licenceUrl: onsMeta.licenceUrl,
              releaseDate: ons?.releaseDate ?? null,
            },
          ],
        })}
      />
      <Breadcrumb current="Forecasts" />
      <PageIntro
        kicker="Office for Budget Responsibility"
        title="OBR forecasts against outturn"
        lede="Outturn is what the ONS has recorded so far: public sector net borrowing for the financial year to date. A forecast is the Office for Budget Responsibility's projection for the full year, so a part-year outturn is not directly comparable with it."
      />
      <EmptySource name="OBR forecast" pending />
      <p className="mt-3 text-sm text-neutral-800 dark:text-neutral-200">Forecast vintage: pending. No OBR public finances databank has been loaded.</p>
      <div className="mt-6">
        {ons?.data.financialYear ? (
          <ChartFrame
            title={`Borrowing so far in ${ons.data.financialYear.year}, April to ${formatMonthLong(ons.data.financialYear.through)}`}
            subtitle="£ billion, running total."
            source={
              <SourceNote
                publisher={onsMeta.publisher}
                title="Public sector net borrowing excluding public sector banks (J5II), summed from April"
                url={ons.sourceUrl}
                releaseDate={ons.releaseDate}
                licenceUrl={onsMeta.licenceUrl}
                sourceId="ons-psf"
              />
            }
          >
            <DataTable
              columns={["Month", "Running total, £bn"]}
              rows={ons.data.financialYear.months.map((row) => [formatMonth(row.period), formatGbpFromMillions(-row.cumulative)])}
            />
          </ChartFrame>
        ) : (
          <EmptySource name="ONS borrowing" />
        )}
      </div>
      {obr && obr.data.series.length > 0 ? (
        <div className="mt-3">
          <ChartFrame
            title={obr.data.round ?? "OBR public finances databank"}
            source={
              <SourceNote publisher={meta.publisher} title="Public finances databank" url={obr.sourceUrl} releaseDate={obr.releaseDate} licenceUrl={meta.licenceUrl} sourceId="obr-databank" />
            }
          >
            <p className="text-sm">Forecast vintage: {obr.data.round ?? obr.releaseDate ?? "loaded file"}.</p>
            {obr.data.series.slice(0, 4).map((series) => (
              <div key={series.name} className="mt-4">
                <h3 className="text-sm font-medium">{series.name}</h3>
                <DataTable
                  columns={["Financial year", "Outturn", "Forecast"]}
                  rows={series.points.map((point) => [
                    point.year,
                    point.outturn == null ? "—" : point.outturn.toLocaleString("en-GB"),
                    point.forecast == null ? "—" : point.forecast.toLocaleString("en-GB"),
                  ])}
                />
              </div>
            ))}
          </ChartFrame>
        </div>
      ) : null}
    </>
  );
}
