import { formatBillions } from "@/lib/format";

import { yearAheadFy } from "@/lib/budgets/events";

export type ForecastPoint = { fy: string; value: number };

/**
 * Difference stored for the API and CSV: outturn minus forecast.
 * Below zero, the forecast was too high (over-forecast).
 * Above zero, the forecast was too low (under-forecast).
 * Zero after rounding to 0.1 is a match. There is no wider "close to the outturn" band.
 */
export function forecastDifference(outturn: number, forecast: number): number {
  return outturn - forecast;
}

export function roundDifference(difference: number): number {
  return Number((Math.round(difference / 0.1) * 0.1).toFixed(1));
}

export function formatSignedDifference(difference: number, unit: "bn" | "pp"): string {
  const rounded = roundDifference(difference);
  if (unit === "pp") {
    if (rounded === 0) return "0.0 percentage points";
    return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)} percentage points`;
  }
  const text = formatBillions(Math.abs(rounded));
  if (rounded === 0) return text;
  return rounded > 0 ? `+${text}` : `−${text}`;
}

export function differenceWords(difference: number, unit: "bn" | "pp"): { direction: "over" | "under" | "matched"; label: string; sentence: string } {
  const rounded = roundDifference(difference);
  if (rounded === 0) {
    return { direction: "matched", label: "Matched the outturn", sentence: "Matched the outturn." };
  }
  const amount = unit === "bn" ? formatBillions(Math.abs(rounded)) : `${Math.abs(rounded).toFixed(1)} percentage points`;
  if (rounded < 0) {
    return { direction: "over", label: "Over-forecast", sentence: `The forecast was ${amount} too high.` };
  }
  return { direction: "under", label: "Under-forecast", sentence: `The forecast was ${amount} too low.` };
}

/** @deprecated Use forecastDifference. Kept as the stored field name in older notes. */
export function forecastError(outturn: number, forecast: number): number {
  return forecastDifference(outturn, forecast);
}

/** Drop the financial year already underway on the event date. */
export function withoutPartYear(eventDate: string, points: ForecastPoint[]): ForecastPoint[] {
  const ahead = yearAheadFy(eventDate);
  return points.filter((point) => point.fy >= ahead);
}

export function sumMonths(months: { period: string; value: number }[], fy: string): number | null {
  const wanted = fiscalYearMonths(fy);
  const byPeriod = new Map(months.map((point) => [point.period, point.value]));
  if (wanted.some((period) => !byPeriod.has(period))) return null;
  return wanted.reduce((sum, period) => sum + (byPeriod.get(period) ?? 0), 0);
}

/** March observation of HF6X. The financial year 2024-25 ends in March 2025. */
export function marchDebtRatio(months: { period: string; value: number }[], fy: string): number | null {
  const start = Number(fy.slice(0, 4));
  const period = `${start + 1}-03`;
  return months.find((point) => point.period === period)?.value ?? null;
}

export function fiscalYearMonths(fy: string): string[] {
  const start = Number(fy.slice(0, 4));
  const months: string[] = [];
  for (let month = 4; month <= 12; month += 1) months.push(`${start}-${String(month).padStart(2, "0")}`);
  for (let month = 1; month <= 3; month += 1) months.push(`${start + 1}-${String(month).padStart(2, "0")}`);
  return months;
}
