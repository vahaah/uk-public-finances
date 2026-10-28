import { formatBillions } from "@/lib/format";

import { yearAheadFy } from "@/lib/budgets/events";

export type ForecastPoint = { fy: string; value: number };

/** Stored error is outturn minus forecast. Positive means the outturn was higher. */
export function forecastError(outturn: number, forecast: number): number {
  return outturn - forecast;
}

export function forecastWords(error: number, unit: "bn" | "pp"): string {
  const quantum = 0.05;
  if (Math.abs(error) < quantum) return "in line with the outturn";
  const amount = unit === "bn" ? formatBillions(Math.abs(error)) : `${Math.abs(error).toFixed(1)} percentage points`;
  return error > 0 ? `under-forecast by ${amount}` : `over-forecast by ${amount}`;
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
