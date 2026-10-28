import { forecastError, forecastWords, marchDebtRatio, sumMonths, withoutPartYear, type ForecastPoint } from "@/lib/budgets/compare";
import { yearAheadFy, type FiscalEvent } from "@/lib/budgets/events";
import type { ForecastSeriesId, ForecastVintage } from "@/lib/budgets/forecasts";

export type YearAheadComparison = {
  event: FiscalEvent;
  fy: string;
  forecast: number | null;
  outturn: number | null;
  error: number | null;
  words: string | null;
  due: boolean;
};

export function yearAheadComparisons(
  events: FiscalEvent[],
  vintages: ForecastVintage[],
  outturn: { period: string; value: number }[],
  series: ForecastSeriesId,
): YearAheadComparison[] {
  return events.map((event) => {
    const fy = yearAheadFy(event.date);
    const vintage = vintages.find((item) => item.series === series && matches(event.date, item));
    const forecast = vintage ? withoutPartYear(event.date, vintage.points).find((point) => point.fy === fy)?.value ?? null : null;
    const outturnValue = series === "psnd_pct" ? marchDebtRatio(outturn, fy) : bulletinOrLevel(series, outturn, fy);
    const due = outturnValue != null;
    if (event.obrForecast === "no" || forecast == null || outturnValue == null) {
      return { event, fy, forecast, outturn: outturnValue, error: null, words: null, due };
    }
    const error = forecastError(outturnValue, forecast);
    return { event, fy, forecast, outturn: outturnValue, error, words: forecastWords(error, series === "psnd_pct" ? "pp" : "bn"), due };
  });
}

export function seriesPoints(vintage: ForecastVintage | undefined, eventDate: string): ForecastPoint[] {
  if (!vintage) return [];
  return withoutPartYear(eventDate, vintage.points);
}

export function outturnByFy(
  months: { period: string; value: number }[],
  series: ForecastSeriesId,
  years: string[],
): { fy: string; value: number | null }[] {
  return years.map((fy) => ({
    fy,
    value: series === "psnd_pct" ? marchDebtRatio(months, fy) : bulletinOrLevel(series, months, fy),
  }));
}

function bulletinOrLevel(series: ForecastSeriesId, months: { period: string; value: number }[], fy: string): number | null {
  const total = sumMonths(months, fy);
  if (total == null) return null;
  const millions = series === "psnb" ? -total : total;
  return millions / 1000;
}

function matches(eventDate: string, vintage: ForecastVintage): boolean {
  if (vintage.precision === "month") return eventDate.slice(0, 7) === vintage.date.slice(0, 7);
  return Math.abs(Date.parse(eventDate) - Date.parse(vintage.date)) <= 7 * 24 * 60 * 60 * 1000;
}
