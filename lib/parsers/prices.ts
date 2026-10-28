import { readFileSync } from "node:fs";

import { parsePublishedNumber } from "@/lib/numbers";
import { periodFromOns, periodFromQuarter, periodFromYear } from "@/lib/parsers/ons";
import type { priceDataSchema } from "@/lib/schema";
import type { z } from "zod";

type PriceData = z.infer<typeof priceDataSchema>;
type PriceSeries = PriceData["mnf2"];

type RawPoint = { date?: string; value?: string };
type RawSeries = {
  description?: { title?: string; releaseDate?: string; cdid?: string; unit?: string };
  years?: RawPoint[];
  quarters?: RawPoint[];
  months?: RawPoint[];
};

export const PRICE_FILES = ["mnf2", "l8gg", "bktl", "d7bt", "l522", "chaw"] as const;

export function parsePriceRecords(records: Record<string, RawSeries>): PriceData {
  return {
    mnf2: parseOne(records.mnf2, "MNF2"),
    l8gg: parseOne(records.l8gg, "L8GG"),
    bktl: parseOne(records.bktl, "BKTL"),
    d7bt: parseOne(records.d7bt, "D7BT"),
    l522: parseOne(records.l522, "L522"),
    chaw: parseOne(records.chaw, "CHAW"),
  };
}

export function parsePriceDirectory(dir: string): PriceData {
  const records: Record<string, RawSeries> = {};
  for (const code of PRICE_FILES) {
    records[code] = JSON.parse(readFileSync(`${dir}/${code}.json`, "utf8")) as RawSeries;
  }
  return parsePriceRecords(records);
}

function parseOne(raw: RawSeries | undefined, expected: string): PriceSeries {
  if (!raw?.description?.cdid || !raw.description.title || !raw.description.releaseDate) {
    throw new Error(`ONS price series ${expected} is missing its description`);
  }
  if (raw.description.cdid !== expected) {
    throw new Error(`Expected ${expected} and received ${raw.description.cdid}`);
  }
  return {
    cdid: raw.description.cdid,
    title: raw.description.title,
    unit: raw.description.unit ?? "",
    releaseDate: raw.description.releaseDate,
    years: points(raw.years, periodFromYear),
    quarters: points(raw.quarters, periodFromQuarter),
    months: points(raw.months, periodFromOns),
  };
}

function points(
  rows: RawPoint[] | undefined,
  toPeriod: (date: string) => string | null,
): { period: string; value: number }[] {
  const byPeriod = new Map<string, number>();
  for (const row of rows ?? []) {
    const period = toPeriod(row.date ?? "");
    const value = parsePublishedNumber(row.value ?? "");
    if (!period || value == null || value <= 0) continue;
    byPeriod.set(period, value);
  }
  return [...byPeriod.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([period, value]) => ({ period, value }));
}
