import type { FiscalEvent } from "@/lib/budgets/events";
import { yearAheadFy } from "@/lib/budgets/events";
import { yearAheadComparisons, type YearAheadComparison } from "@/lib/budgets/view";
import { forecastFor, vintageLabel } from "@/lib/forecasts-view";
import { formatMonthYear } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";

type Databank = {
  round: string | null;
  series: { name: string; points: { year: string; outturn: number | null; forecast: number | null }[] }[];
};

/** The OBR databank carries a new event's forecast before the historical database does. */
export function databankForecast(event: FiscalEvent, data: Databank | undefined): YearAheadComparison | null {
  if (!data || event.obrForecast === "no") return null;
  const round = (vintageLabel(data.round) ?? "").toLowerCase();
  if (!round.startsWith(formatMonthYear(event.date).toLowerCase())) return null;
  const fy = yearAheadFy(event.date);
  const forecast = forecastFor(
    data.series.find((item) => /net borrowing/i.test(item.name)),
    fy,
  );
  if (forecast == null) return null;
  return { event, fy, forecast, outturn: null, difference: null, words: null, direction: null, due: false, basisChanged: false };
}

/** Year-ahead borrowing comparison for one event, and a cache stamp for the files it came from. */
export async function loadYearAhead(event: FiscalEvent): Promise<{ borrowing: YearAheadComparison | null; versionStamp: string | null }> {
  const [obrLoaded, onsLoaded, databankLoaded] = await Promise.all([
    readSnapshot("budgets-obr"),
    readSnapshot("ons-psf"),
    readSnapshot("obr-databank"),
  ]);
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const databank = takeSnapshot("obr-databank", databankLoaded.snapshot);
  const loaded = obr?.data.historical.loaded === true;
  const historical = loaded
    ? (yearAheadComparisons([event], obr?.data.historical.vintages ?? [], ons?.data.series.j5ii?.months ?? [], "psnb")[0] ?? null)
    : null;
  const borrowing = historical?.forecast != null ? historical : (databankForecast(event, databank?.data) ?? historical);
  const versionStamp = obr?.releaseDate ?? obr?.retrievedAt ?? databank?.releaseDate ?? databank?.retrievedAt ?? null;
  return { borrowing, versionStamp };
}
