import { differenceWords, forecastDifference, marchDebtRatio, sumMonths, withoutPartYear, type ForecastPoint } from "@/lib/budgets/compare";
import { yearAheadFy, type FiscalEvent } from "@/lib/budgets/events";
import type { ForecastSeriesId, ForecastVintage } from "@/lib/budgets/forecasts";

export type YearAheadComparison = {
  event: FiscalEvent;
  fy: string;
  forecast: number | null;
  outturn: number | null;
  /** Outturn minus forecast. Below zero is over-forecast. Above zero is under-forecast. */
  difference: number | null;
  words: string | null;
  direction: "over" | "under" | "matched" | null;
  due: boolean;
  /** The forecast was made on an older statistical basis than today's outturn, so the difference is not like for like. */
  basisChanged: boolean;
};

/**
 * The first OBR forecast on the current borrowing basis. ONS statistical changes in September 2019
 * (student loans, public service pensions) raised borrowing by about £20bn a year; the OBR's
 * restated March 2019 forecast (obr.uk/restated-march-2019-forecast) shows the size. Budget 2020
 * was the first forecast to include them. Earlier forecasts are compared against latest-basis
 * outturn with no like-for-like series, so they are labelled and left out of the totals.
 */
export const BASIS_CUTOFF = "2020-03-11";

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
    const basisChanged = event.date < BASIS_CUTOFF;
    if (event.obrForecast === "no" || forecast == null || outturnValue == null) {
      return { event, fy, forecast, outturn: outturnValue, difference: null, words: null, direction: null, due, basisChanged };
    }
    const difference = forecastDifference(outturnValue, forecast);
    const words = differenceWords(difference, series === "psnd_pct" ? "pp" : "bn");
    return { event, fy, forecast, outturn: outturnValue, difference, words: words.sentence, direction: words.direction, due, basisChanged };
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
