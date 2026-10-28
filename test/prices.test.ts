import path from "node:path";

import { describe, expect, it } from "vitest";

import { parsePriceDirectory } from "@/lib/parsers/prices";
import {
  adjustSeries,
  chartBaseYear,
  equivalentValue,
  financialYearMean,
  financialYearSum,
  priceBundle,
  rebase,
  rebaseInputSchema,
  todayPricesLine,
  type MoneyFrequency,
} from "@/lib/prices";
import { priceDataSchema } from "@/lib/schema";

const prices = parsePriceDirectory(path.join(process.cwd(), "fixtures/raw/ons/prices"));

describe("rebasing", () => {
  it("scales a nominal amount by the index ratio", () => {
    expect(rebase(100, 50, 100)).toBe(200);
    expect(rebase(80, 80, 100)).toBe(100);
    expect(rebase(-20, 50, 100)).toBe(-40);
  });

  it("rejects a zero or negative index", () => {
    expect(rebaseInputSchema.safeParse({ nominal: 1, indexThen: 0, indexBase: 100 }).success).toBe(false);
    expect(rebaseInputSchema.safeParse({ nominal: 1, indexThen: -5, indexBase: 100 }).success).toBe(false);
    expect(() => rebase(1, 0, 100)).toThrow();
  });

  it("uses the financial-year mean of L8GG and the sum of BKTL", () => {
    expect(financialYearMean(prices.l8gg.quarters, 2024)).toBeCloseTo(96.757075, 5);
    expect(financialYearMean(prices.l8gg.quarters, 1955)).toBeCloseTo(3.080625, 5);
    expect(financialYearSum(prices.bktl.quarters, 2024)).toBe(2955008);
    expect(financialYearMean(prices.l8gg.quarters, 2026)).toBeNull();
  });

  it("refuses a year the index does not publish", () => {
    const result = equivalentValue({ amount: 100, from: "1900", to: "2025", index: prices.d7bt.years });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/1988/);
      expect(result.first).toBe("1988");
      expect(result.last).toBe("2025");
    }
    const converted = equivalentValue({ amount: 100, from: "2015", to: "2025", index: prices.d7bt.years });
    expect(converted.ok).toBe(true);
    if (converted.ok) {
      const from = prices.d7bt.years.find((point) => point.period === "2015");
      const to = prices.d7bt.years.find((point) => point.period === "2025");
      expect(converted.value).toBeCloseTo(100 * ((to?.value ?? 0) / (from?.value ?? 1)), 6);
    }
  });

  it("accepts the live price extract", () => {
    expect(priceDataSchema.safeParse(prices).success).toBe(true);
    expect(prices.mnf2.cdid).toBe("MNF2");
    expect(prices.mnf2.years.find((point) => point.period === "1955")?.value).toBeCloseTo(3.0569, 4);
    expect(prices.mnf2.years.at(-1)).toEqual({ period: "2025", value: 100 });
    expect(prices.l8gg.quarters[0]?.period).toBe("1955-Q1");
    expect(prices.bktl.years[0]?.period).toBe("1948");
    expect(prices.d7bt.months[0]?.period).toBe("1988-01");
    expect(prices.l522.years[0]?.period).toBe("1988");
    expect(prices.chaw.years[0]?.period).toBe("1987");
  });
});

describe("today's prices tooltip", () => {
  const bundle = priceBundle(prices);
  const cases: { frequency: MoneyFrequency; period: string; latest: string; deflator: "MNF2" | "L8GG" }[] = [
    { frequency: "calendar", period: "2016", latest: "2025", deflator: "MNF2" },
    { frequency: "financial", period: "2016-17", latest: "2025-26", deflator: "L8GG" },
    { frequency: "quarter", period: "2016-Q2", latest: "2026-Q2", deflator: "L8GG" },
    { frequency: "month", period: "2016-06", latest: "2026-09", deflator: "L8GG" },
  ];

  it("matches the real-terms adjustment for each frequency", () => {
    for (const sample of cases) {
      const nominal = 80_000;
      const real = adjustSeries({
        points: [{ period: sample.period, value: nominal }],
        frequency: sample.frequency,
        mode: "real",
        baseYear: 2025,
        unit: "million",
        prices: bundle,
      });
      const line = todayPricesLine({
        nominal,
        period: sample.period,
        frequency: sample.frequency,
        unit: "million",
        prices: bundle,
        mode: "nominal",
        baseYear: chartBaseYear(null),
        latestPeriod: sample.latest,
        money: true,
      });
      expect(real.points).toHaveLength(1);
      expect(line?.valueBn).toBe(Number(((real.points[0]?.value ?? 0) / 1000).toFixed(1)));
      expect(line?.deflator).toBe(sample.deflator);
      expect(line?.text).toBe(`≈ £${line?.valueBn.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}bn in 2025 prices`);
    }
  });

  it("uses the same ratio for amounts stored in £ billion", () => {
    const millions = todayPricesLine({
      nominal: 80_000,
      period: "2016-17",
      frequency: "financial",
      unit: "million",
      prices: bundle,
      mode: "nominal",
      baseYear: 2025,
      latestPeriod: "2025-26",
      money: true,
    });
    const billions = todayPricesLine({
      nominal: 80,
      period: "2016-17",
      frequency: "financial",
      unit: "billion",
      prices: bundle,
      mode: "nominal",
      baseYear: 2025,
      latestPeriod: "2025-26",
      money: true,
    });
    expect(billions?.valueBn).toBe(millions?.valueBn);
  });

  it("keeps the sign of a surplus", () => {
    const line = todayPricesLine({
      nominal: -20_000,
      period: "2016",
      frequency: "calendar",
      unit: "million",
      prices: bundle,
      mode: "nominal",
      baseYear: 2025,
      latestPeriod: "2025",
      money: true,
    });
    const real = adjustSeries({
      points: [{ period: "2016", value: -20_000 }],
      frequency: "calendar",
      mode: "real",
      baseYear: 2025,
      unit: "million",
      prices: bundle,
    });
    expect(line?.valueBn).toBe(Number(((real.points[0]?.value ?? 0) / 1000).toFixed(1)));
    expect(line?.valueBn).toBeLessThan(0);
    expect(line?.text.startsWith("≈ −£")).toBe(true);
  });

  it("omits real terms, shares of GDP, non-money series, the latest period, and a missing index", () => {
    const base = {
      nominal: 80_000,
      period: "2016-06",
      frequency: "month" as const,
      unit: "million" as const,
      prices: bundle,
      baseYear: 2025,
      latestPeriod: "2026-09",
      money: true,
      mode: "nominal" as const,
    };
    expect(todayPricesLine({ ...base, mode: "real" })).toBeNull();
    expect(todayPricesLine({ ...base, mode: "gdp" })).toBeNull();
    expect(todayPricesLine({ ...base, money: false })).toBeNull();
    expect(todayPricesLine({ ...base, period: "2026-09", latestPeriod: "2026-09" })).toBeNull();
    expect(todayPricesLine({ ...base, period: "1900-01" })).toBeNull();
  });
});
