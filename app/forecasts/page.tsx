import { CumulativeChart } from "@/components/charts";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatGbpFromMillions, formatMonth, formatMonthLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { priceBundle } from "@/lib/prices";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "OBR forecasts against outturn",
  description:
    "UK borrowing so far this financial year from the ONS, alongside the Office for Budget Responsibility forecast when it is available.",
  path: "/forecasts",
});

export default async function ForecastsPage() {
  const [onsLoaded, obrLoaded, priceLoaded] = await Promise.all([
    readSnapshot("ons-psf"),
    readSnapshot("obr-databank"),
    readSnapshot("ons-prices"),
  ]);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const obr = takeSnapshot("obr-databank", obrLoaded.snapshot);
  const prices = takeSnapshot("ons-prices", priceLoaded.snapshot);
  const bundle = prices ? priceBundle(prices.data) : null;
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
        title="Is borrowing on track with the OBR's forecast?"
        lede="Outturn is what the ONS has recorded so far: public sector net borrowing for the financial year to date. A forecast is the Office for Budget Responsibility's projection for the full year, so a part-year outturn is not directly comparable with it."
      />
      <EmptySource
        name="The OBR forecast"
        pending
        detail="Until it is, this page shows ONS figures only."
      />
      <div className="mt-6">
        {ons?.data.financialYear ? (
          <ChartFrame
            title={`Borrowing so far in ${ons.data.financialYear.year}, April to ${formatMonth(ons.data.financialYear.through).replace(/ \d{4}$/, "")}`}
            subtitle="£bn, running total."
            source={
              <SourceNote
                publisher={onsMeta.publisher}
                title="Public sector net borrowing excluding public sector banks (J5II), running total from April"
                url={ons.sourceUrl}
                releaseDate={ons.releaseDate}
                licenceUrl={onsMeta.licenceUrl}
                sourceId="ons-psf"
              />
            }
          >
            <CumulativeChart
              months={ons.data.financialYear.months}
              thisYear={ons.data.financialYear.year}
              compare={false}
              prices={bundle}
            />
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
