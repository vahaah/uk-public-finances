import { readFileSync } from "node:fs";

import { parsePublishedNumber } from "@/lib/numbers";
import type { onsDataSchema } from "@/lib/schema";
import type { z } from "zod";

const MONTH_INDEX: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

export const ONS_FILES = [
  "j5ii",
  "jw2o",
  "kx5q",
  "jw2t",
  "kse6",
  "hf6x",
  "cpoa",
  "nmfx",
  "jnyx",
  "jnyy",
] as const;

type OnsData = z.infer<typeof onsDataSchema>;

type RawSeries = {
  description?: {
    title?: string;
    releaseDate?: string;
    nextRelease?: string;
    cdid?: string;
    unit?: string;
    preUnit?: string;
  };
  months?: { date?: string; value?: string }[];
};

export function parseOnsRecords(records: Record<string, RawSeries>): OnsData {
  const series: OnsData["series"] = {};
  for (const code of ONS_FILES) {
    const raw = records[code];
    if (!raw) throw new Error(`ONS series ${code} is missing`);
    series[code] = parseSeries(raw);
  }
  const borrowing = series.j5ii;
  if (!borrowing) throw new Error("ONS snapshot is missing J5II");
  const financialYear = financialYearCumulative(borrowing.months);
  const deficit = series.jw2t?.latest?.value;
  return {
    series,
    financialYear,
    bulletinSign: {
      note: "J5II and JW2T are negative in the time series download when the ONS bulletin reports borrowing or a current budget deficit. bulletinSign is that value negated. Other series are left as published.",
      borrowingLatest: borrowing.latest ? -borrowing.latest.value : null,
      currentBudgetDeficitLatest: deficit == null ? null : -deficit,
      financialYearBorrowing: financialYear ? -financialYear.borrowing : null,
      previousFinancialYearBorrowing:
        financialYear?.previousYearBorrowing == null ? null : -financialYear.previousYearBorrowing,
    },
  };
}

export function parseOnsDirectory(dir: string): OnsData {
  const records: Record<string, RawSeries> = {};
  for (const code of ONS_FILES) {
    records[code] = JSON.parse(readFileSync(`${dir}/${code}.json`, "utf8")) as RawSeries;
  }
  return parseOnsRecords(records);
}

function parseSeries(raw: RawSeries): OnsData["series"][string] {
  const description = raw.description;
  if (!description?.cdid || !description.title || !description.releaseDate) {
    throw new Error("ONS series is missing its description");
  }
  const months = (raw.months ?? [])
    .map((row) => {
      const period = periodFromOns(row.date ?? "");
      const value = parsePublishedNumber(row.value ?? "");
      if (!period || value == null) return null;
      return { period, value };
    })
    .filter((row): row is { period: string; value: number } => row != null);
  const latest = months.at(-1) ?? null;
  return {
    cdid: description.cdid,
    title: description.title,
    unit: description.unit ?? "",
    preUnit: description.preUnit ?? "",
    releaseDate: description.releaseDate,
    nextRelease: description.nextRelease ?? "",
    latest,
    months,
  };
}

export function periodFromOns(date: string): string | null {
  const match = /^(\d{4})\s+([A-Z]{3})$/.exec(date.trim());
  if (!match) return null;
  const month = MONTH_INDEX[match[2] ?? ""];
  if (!month) return null;
  return `${match[1]}-${month}`;
}

export function financialYearCumulative(
  months: { period: string; value: number }[],
): OnsData["financialYear"] {
  const latest = months.at(-1);
  if (!latest) return null;
  const current = fiscalYearOf(latest.period);
  const byPeriod = new Map(months.map((row) => [row.period, row.value]));
  const points: NonNullable<OnsData["financialYear"]>["months"] = [];
  let cumulative = 0;
  let previousCumulative = 0;
  let previousComplete = true;
  for (let index = 0; index <= current.index; index += 1) {
    const period = periodAt(current.startYear, index);
    const value = byPeriod.get(period);
    if (value == null) break;
    cumulative += value;
    const previousPeriod = periodAt(current.startYear - 1, index);
    const previous = byPeriod.get(previousPeriod);
    if (previous == null) previousComplete = false;
    else previousCumulative += previous;
    points.push({
      period,
      cumulative,
      previousCumulative: previousComplete ? previousCumulative : null,
    });
  }
  const last = points.at(-1);
  if (!last) return null;
  return {
    year: current.label,
    through: last.period,
    borrowing: last.cumulative,
    previousYearBorrowing: last.previousCumulative,
    months: points,
  };
}

function fiscalYearOf(period: string): { startYear: number; index: number; label: string } {
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startYear = month >= 4 ? year : year - 1;
  const index = month >= 4 ? month - 4 : month + 8;
  const end = String(startYear + 1).slice(2);
  return { startYear, index, label: `${startYear}-${end}` };
}

function periodAt(startYear: number, index: number): string {
  const month = index < 9 ? index + 4 : index - 8;
  const year = index < 9 ? startYear : startYear + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}
