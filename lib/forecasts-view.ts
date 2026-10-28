import { roundBn } from "@/lib/format";

export type DatabankPoint = { year: string; outturn: number | null; forecast: number | null };
export type DatabankSeries = { name: string; points: DatabankPoint[] };

export const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] as const;

/** The databank labels its vintage "Forecast: March 2026 …". Drop the prefix so labels do not double up. */
export function vintageLabel(round: string | null): string | null {
  if (!round) return null;
  return round.replace(/^forecast:\s*/i, "").trim() || null;
}

/** The last `actual` outturn years plus the next `ahead` forecast-only years. */
export function recentWindow(points: DatabankPoint[], actual = 10, ahead = 5): DatabankPoint[] {
  const outturnIndex = points.reduce((last, point, index) => (point.outturn != null ? index : last), -1);
  if (outturnIndex < 0) return points.slice(0, ahead);
  const start = Math.max(0, outturnIndex - actual + 1);
  const forecasts = points.slice(outturnIndex + 1).filter((point) => point.forecast != null).slice(0, ahead);
  return [...points.slice(start, outturnIndex + 1), ...forecasts];
}

export function forecastFor(series: DatabankSeries | undefined, fy: string): number | null {
  const point = series?.points.find((item) => item.year === fy);
  return point?.forecast ?? null;
}

export function outturnFor(series: DatabankSeries | undefined, fy: string): number | null {
  return series?.points.find((item) => item.year === fy)?.outturn ?? null;
}

/** Running totals in £bn (borrowing positive) for one financial year from ONS monthly J5II (£m, bulletin sign). */
export function cumulativeYear(months: { period: string; value: number }[], fy: string): (number | null)[] {
  const start = Number(fy.slice(0, 4));
  let total = 0;
  return FY_MONTHS.map((_, index) => {
    const year = index < 9 ? start : start + 1;
    const month = ((index + 3) % 12) + 1;
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const value = months.find((item) => item.period === period)?.value;
    if (value == null) return null;
    total += -value / 1000;
    return roundBn(total);
  });
}

export function shareOf(part: number | null, whole: number | null): number | null {
  if (part == null || whole == null || whole === 0) return null;
  return (part / whole) * 100;
}

export function seriesCsv(series: DatabankSeries[], vintage: string | null): string {
  const lines = ["series,financial_year,outturn_bn,forecast_bn,vintage"];
  for (const item of series) {
    for (const point of item.points) {
      lines.push([csvCell(item.name), point.year, point.outturn ?? "", point.forecast ?? "", csvCell(vintage ?? "")].join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
