import Link from "next/link";

import { ForecastTrackChart, SmallSeriesChart } from "@/components/forecast-track";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatBillions, formatMonth, formatMonthYear, formatPercent, roundBn } from "@/lib/format";
import { cumulativeYear, forecastFor, outturnFor, recentWindow, shareOf, vintageLabel } from "@/lib/forecasts-view";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "OBR forecasts against outturn",
  description:
    "UK borrowing so far this financial year from the ONS, against the Office for Budget Responsibility forecast for the full year.",
  path: "/forecasts",
});

function previousFy(fy: string): string {
  const start = Number(fy.slice(0, 4)) - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export default async function ForecastsPage() {
  const [onsLoaded, obrLoaded] = await Promise.all([readSnapshot("ons-psf"), readSnapshot("obr-databank")]);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const obr = takeSnapshot("obr-databank", obrLoaded.snapshot);
  const meta = SOURCES["obr-databank"];
  const onsMeta = SOURCES["ons-psf"];
  const fyData = ons?.data.financialYear ?? null;
  const fy = fyData?.year ?? null;
  const months = ons?.data.series.j5ii?.months ?? [];
  const series = obr?.data.series ?? [];
  const psnb = series.find((item) => /net borrowing/i.test(item.name));
  const vintage = vintageLabel(obr?.data.round ?? null);
  const forecast = fy ? forecastFor(psnb, fy) : null;
  const thisYear = fy ? cumulativeYear(months, fy) : [];
  const lastFy = fy ? previousFy(fy) : null;
  const lastYear = lastFy ? cumulativeYear(months, lastFy) : [];
  const monthsIn = fyData?.months.length ?? 0;
  const ytd = fyData ? roundBn(-fyData.borrowing / 1000) : null;
  const lastYtd = monthsIn > 0 ? (lastYear[monthsIn - 1] ?? null) : null;
  const lastFull = lastYear[11] ?? (lastFy ? outturnFor(psnb, lastFy) : null);
  const share = shareOf(ytd, forecast);
  const lastShare = shareOf(lastYtd, lastFull);
  const asOf = vintage ? `OBR data as of ${vintage.replace(/ Economic and fiscal outlook$/i, "")}.` : obr ? `OBR data as of ${formatMonthYear(obr.releaseDate)}.` : null;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("OBR forecasts against outturn", "/forecasts")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/forecasts",
          name: "ONS borrowing outturn and OBR forecast",
          description: "Public sector net borrowing recorded so far this financial year, from the ONS, against the OBR forecast for the full year.",
          keywords: ["OBR forecast", "UK deficit", "public sector net borrowing"],
          temporalCoverage: fyData ? `${fyData.year.slice(0, 4)}-04/${fyData.through}` : "2026-04/2026-09",
          variableMeasured: ["Public sector net borrowing outturn", "OBR borrowing forecast"],
          dateModified: obr?.releaseDate ?? ons?.releaseDate ?? null,
          sources: [
            { id: "ons-psf", name: onsMeta.title, url: ons?.sourceUrl ?? onsMeta.page, publisher: onsMeta.publisher, licenceUrl: onsMeta.licenceUrl, releaseDate: ons?.releaseDate ?? null },
            { id: "obr-databank", name: meta.title, url: obr?.sourceUrl ?? meta.page, publisher: meta.publisher, licenceUrl: meta.licenceUrl, releaseDate: obr?.releaseDate ?? null },
          ],
        })}
      />
      <Breadcrumb current="Forecasts" />
      <PageIntro
        kicker="Office for Budget Responsibility"
        title="Is borrowing on track with the OBR's forecast?"
        lede="Outturn is what the ONS has recorded so far this financial year. The forecast is the Office for Budget Responsibility's projection for the full year. Borrowing is not spread evenly across the year, so compare the share so far with the same point last year."
      />
      {fyData && fy ? (
        <ChartFrame
          title={`Borrowing so far in ${fy} against the full-year forecast`}
          subtitle="£bn, running total from April."
          source={
            <SourceNote
              publisher={onsMeta.publisher}
              title="Public sector net borrowing excluding public sector banks (J5II), running total from April"
              url={ons?.sourceUrl ?? onsMeta.page}
              releaseDate={ons?.releaseDate ?? null}
              licenceUrl={onsMeta.licenceUrl}
              sourceId="ons-psf"
              extra={asOf ? `Forecast: ${meta.publisher}. ${asOf}` : undefined}
            />
          }
        >
          <dl className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-neutral-700 dark:text-neutral-300">So far</dt>
              <dd className="text-lg font-medium tabular-nums">{ytd != null ? formatBillions(ytd) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-700 dark:text-neutral-300">Forecast for the year</dt>
              <dd className="text-lg font-medium tabular-nums">{forecast != null ? formatBillions(forecast) : "Not loaded"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-700 dark:text-neutral-300">Share after {monthsIn} of 12 months</dt>
              <dd className="text-lg font-medium tabular-nums">{share != null ? formatPercent(share, 0) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-700 dark:text-neutral-300">Same point last year</dt>
              <dd className="text-lg font-medium tabular-nums">{lastShare != null ? formatPercent(lastShare, 0) : "—"}</dd>
            </div>
          </dl>
          <ForecastTrackChart thisYear={thisYear} lastYear={lastYear} forecast={forecast} thisLabel={fy} lastLabel={lastFy ?? "Last year"} />
          <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
            Solid line: {fy} so far. Dashed line: {lastFy}. Dotted guide: the OBR forecast for {fy}. Not adjusted for inflation. The OBR does not publish a monthly path, so only the full-year figure is shown.
          </p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Show table</summary>
            <DataTable
              columns={["Month", `${fy}, £bn`, `${lastFy}, £bn`]}
              rows={fyData.months.map((row, index) => [formatMonth(row.period), formatBillions(roundBn(-row.cumulative / 1000)), lastYear[index] != null ? formatBillions(lastYear[index] ?? 0) : "—"])}
            />
          </details>
        </ChartFrame>
      ) : (
        <EmptySource name="ONS borrowing" />
      )}
      {obr && series.length > 0 ? (
        <div className="mt-3">
          <ChartFrame
            title={`Outturn and forecast, ${vintage ?? "OBR public finances databank"}`}
            subtitle="£bn, by financial year. The last 10 years of outturn, then 5 forecast years (dashed)."
            source={<SourceNote publisher={meta.publisher} title="Public finances databank" url={obr.sourceUrl} releaseDate={obr.releaseDate} licenceUrl={meta.licenceUrl} sourceId="obr-databank" />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {series.slice(0, 4).map((item) => (
                <SmallSeriesChart key={item.name} name={item.name} points={recentWindow(item.points)} />
              ))}
            </div>
            {series.slice(0, 4).map((item) => (
              <details key={item.name} className="mt-3 text-sm">
                <summary className="cursor-pointer">{item.name}: table</summary>
                <DataTable
                  columns={["Financial year", "Outturn", "Forecast"]}
                  rows={recentWindow(item.points).map((point) => [
                    point.year,
                    point.outturn == null ? "—" : formatBillions(roundBn(point.outturn)),
                    point.forecast == null ? "—" : formatBillions(roundBn(point.forecast)),
                  ])}
                />
              </details>
            ))}
            <p className="mt-3 text-sm">
              <Link className="underline decoration-neutral-400 underline-offset-4" href="/forecasts/history">
                Full history from 1946, with CSV download
              </Link>
            </p>
          </ChartFrame>
        </div>
      ) : (
        <div className="mt-3">
          <EmptySource name="The OBR forecast" pending detail="Until it is, this page shows ONS figures only." />
        </div>
      )}
      <p className="mt-3 text-sm">
        <Link className="underline decoration-neutral-400 underline-offset-4" href="/budgets">
          Earlier Budgets and how their forecasts turned out
        </Link>
      </p>
    </>
  );
}
