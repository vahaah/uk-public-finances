import { z } from "zod";

import { formatBillions } from "@/lib/format";
import type { priceDataSchema } from "@/lib/schema";

/** Same fallback the Real terms control uses when the URL has no base year. */
export const DEFAULT_PRICE_BASE_YEAR = 2025;

export function chartBaseYear(selected: string | null | undefined): number {
  return selected && /^\d{4}$/.test(selected) ? Number(selected) : DEFAULT_PRICE_BASE_YEAR;
}

const positive = z.number().finite().positive();

export const rebaseInputSchema = z.object({
  nominal: z.number().finite(),
  indexThen: positive,
  indexBase: positive,
});

export type Observation = { period: string; value: number };

/** nominal × (index in the base period ÷ index in the original period). */
export function rebase(nominal: number, indexThen: number, indexBase: number): number {
  const parsed = rebaseInputSchema.parse({ nominal, indexThen, indexBase });
  return parsed.nominal * (parsed.indexBase / parsed.indexThen);
}

export function financialYearStart(label: string): number | null {
  const match = /^(\d{4})-\d{2}$/.exec(label);
  if (!match) return null;
  return Number(match[1]);
}

/** Arithmetic mean of L8GG for Q2, Q3, Q4 and the following Q1. Null if any quarter is missing. */
export function financialYearMean(quarters: Observation[], startYear: number): number | null {
  const keys = [`${startYear}-Q2`, `${startYear}-Q3`, `${startYear}-Q4`, `${startYear + 1}-Q1`];
  const values = keys.map((key) => quarters.find((quarter) => quarter.period === key)?.value);
  if (values.some((value) => value == null)) return null;
  const present = values as number[];
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

/** Sum of BKTL for Q2, Q3, Q4 and the following Q1. Null if any quarter is missing. */
export function financialYearSum(quarters: Observation[], startYear: number): number | null {
  const keys = [`${startYear}-Q2`, `${startYear}-Q3`, `${startYear}-Q4`, `${startYear + 1}-Q1`];
  const values = keys.map((key) => quarters.find((quarter) => quarter.period === key)?.value);
  if (values.some((value) => value == null)) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
}

export function calendarYearMean(quarters: Observation[], year: number): number | null {
  const keys = [`${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`];
  const values = keys.map((key) => quarters.find((quarter) => quarter.period === key)?.value);
  if (values.some((value) => value == null)) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0) / 4;
}

export function quarterOfMonth(period: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${match[1]}-Q${quarter}`;
}

export function coverage(points: Observation[]): { first: string; last: string } | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((left, right) => (left.period < right.period ? -1 : 1));
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return null;
  return { first: first.period, last: last.period };
}

export type MoneyFrequency = "month" | "quarter" | "calendar" | "financial";
export type PriceMode = "nominal" | "real" | "gdp";

export type PriceBundle = {
  deflatorYears: Observation[];
  deflatorQuarters: Observation[];
  gdpYears: Observation[];
  gdpQuarters: Observation[];
};

export type AdjustedSeries = {
  points: Observation[];
  unit: "money" | "percent";
  omitted: number;
  note: string | null;
};

export function adjustSeries(input: {
  points: Observation[];
  frequency: MoneyFrequency;
  mode: PriceMode;
  baseYear: number;
  unit: "million" | "billion";
  prices: PriceBundle;
}): AdjustedSeries {
  if (input.mode === "nominal") {
    return { points: input.points, unit: "money", omitted: 0, note: null };
  }
  if (input.mode === "gdp") {
    return toShare(input);
  }
  return toReal(input);
}

function toReal(input: {
  points: Observation[];
  frequency: MoneyFrequency;
  baseYear: number;
  prices: PriceBundle;
}): AdjustedSeries {
  const base = baseIndex(input.frequency, input.baseYear, input.prices);
  if (base == null) {
    return {
      points: [],
      unit: "money",
      omitted: input.points.length,
      note: `Base year ${input.baseYear} is outside this deflator.`,
    };
  }
  const points: Observation[] = [];
  let omitted = 0;
  for (const point of input.points) {
    const indexThen = indexAt(input.frequency, point.period, input.prices);
    if (indexThen == null) {
      omitted += 1;
      continue;
    }
    points.push({ period: point.period, value: rebase(point.value, indexThen, base) });
  }
  return {
    points,
    unit: "money",
    omitted,
    note: omitted > 0 ? `${omitted} periods are outside the deflator.` : null,
  };
}

function toShare(input: {
  points: Observation[];
  frequency: MoneyFrequency;
  unit: "million" | "billion";
  prices: PriceBundle;
}): AdjustedSeries {
  if (input.frequency === "month") {
    return {
      points: [],
      unit: "percent",
      omitted: input.points.length,
      note: "A share of GDP is shown for quarters and years. A single month is not a share of annual GDP.",
    };
  }
  const points: Observation[] = [];
  let omitted = 0;
  for (const point of input.points) {
    const gdp = gdpAt(input.frequency, point.period, input.prices);
    if (gdp == null) {
      omitted += 1;
      continue;
    }
    const millions = input.unit === "billion" ? point.value * 1000 : point.value;
    points.push({ period: point.period, value: (millions / gdp) * 100 });
  }
  return {
    points,
    unit: "percent",
    omitted,
    note: omitted > 0 ? `${omitted} periods have no money GDP observation.` : null,
  };
}

function baseIndex(frequency: MoneyFrequency, year: number, prices: PriceBundle): number | null {
  if (frequency === "calendar") {
    return prices.deflatorYears.find((point) => point.period === String(year))?.value ?? null;
  }
  if (frequency === "financial") return financialYearMean(prices.deflatorQuarters, year);
  return calendarYearMean(prices.deflatorQuarters, year);
}

function indexAt(frequency: MoneyFrequency, period: string, prices: PriceBundle): number | null {
  if (frequency === "calendar") {
    return prices.deflatorYears.find((point) => point.period === period)?.value ?? null;
  }
  if (frequency === "financial") {
    const start = financialYearStart(period);
    if (start == null) return null;
    return financialYearMean(prices.deflatorQuarters, start);
  }
  if (frequency === "quarter") {
    return prices.deflatorQuarters.find((point) => point.period === period)?.value ?? null;
  }
  const quarter = quarterOfMonth(period);
  if (!quarter) return null;
  return prices.deflatorQuarters.find((point) => point.period === quarter)?.value ?? null;
}

function gdpAt(frequency: MoneyFrequency, period: string, prices: PriceBundle): number | null {
  if (frequency === "calendar") {
    return prices.gdpYears.find((point) => point.period === period)?.value ?? null;
  }
  if (frequency === "quarter") {
    return prices.gdpQuarters.find((point) => point.period === period)?.value ?? null;
  }
  if (frequency === "financial") {
    const start = financialYearStart(period);
    if (start == null) return null;
    return financialYearSum(prices.gdpQuarters, start);
  }
  return null;
}

export function equivalentValue(input: {
  amount: number;
  from: string;
  to: string;
  index: Observation[];
}):
  | { ok: true; value: number; indexFrom: number; indexTo: number }
  | { ok: false; reason: string; first: string | null; last: string | null } {
  const span = coverage(input.index);
  const from = input.index.find((point) => point.period === input.from);
  const to = input.index.find((point) => point.period === input.to);
  if (!from || !to || from.value <= 0 || to.value <= 0) {
    const first = span?.first ?? null;
    const last = span?.last ?? null;
    const range = first && last ? ` It runs from ${first} to ${last}.` : "";
    return { ok: false, reason: `Those years are outside this index.${range}`, first, last };
  }
  const parsed = rebaseInputSchema.safeParse({ nominal: input.amount, indexThen: from.value, indexBase: to.value });
  if (!parsed.success) {
    return { ok: false, reason: "The amount or the index value cannot be used.", first: span?.first ?? null, last: span?.last ?? null };
  }
  return { ok: true, value: rebase(parsed.data.nominal, parsed.data.indexThen, parsed.data.indexBase), indexFrom: from.value, indexTo: to.value };
}

export type DeflatorId = "MNF2" | "L8GG";

/**
 * Nominal amount in the latest base year's prices, using the same index as Real terms.
 * Calendar years use MNF2. Months, quarters and financial years use L8GG.
 * Null when the chart is not nominal money, the period is the latest one, or the index has no observation.
 */
export function todayPricesLine(input: {
  nominal: number;
  period: string;
  frequency: MoneyFrequency;
  unit: "million" | "billion";
  prices: PriceBundle;
  mode: PriceMode;
  baseYear: number;
  latestPeriod: string;
  money: boolean;
}): { text: string; deflator: DeflatorId; baseYear: number; valueBn: number } | null {
  if (!input.money || input.mode !== "nominal") return null;
  if (input.period === "" || input.period === input.latestPeriod) return null;
  if (!Number.isFinite(input.nominal)) return null;
  const base = baseIndex(input.frequency, input.baseYear, input.prices);
  const indexThen = indexAt(input.frequency, input.period, input.prices);
  if (base == null || indexThen == null || base <= 0 || indexThen <= 0) return null;
  const rebased = rebase(input.nominal, indexThen, base);
  const scale = input.unit === "million" ? 1000 : 1;
  const valueBn = Number((rebased / scale).toFixed(1));
  const deflator: DeflatorId = input.frequency === "calendar" ? "MNF2" : "L8GG";
  return {
    text: `≈ ${formatBillions(valueBn)} in ${input.baseYear} prices`,
    deflator,
    baseYear: input.baseYear,
    valueBn,
  };
}

export function priceBundle(data: z.infer<typeof priceDataSchema>): PriceBundle {
  return {
    deflatorYears: data.mnf2.years,
    deflatorQuarters: data.l8gg.quarters,
    gdpYears: data.bktl.years,
    gdpQuarters: data.bktl.quarters,
  };
}

export function sliceRange<T extends { period: string }>(points: T[], range: "5" | "10" | "20" | "all"): T[] {
  if (range === "all" || points.length === 0) return points;
  const last = points.at(-1)?.period ?? "0000";
  const year = Number(last.slice(0, 4));
  if (!Number.isFinite(year)) return points;
  const cutoff = year - Number(range);
  return points.filter((point) => Number(point.period.slice(0, 4)) >= cutoff);
}
