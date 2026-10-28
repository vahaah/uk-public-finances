import path from "node:path";

import { describe, expect, it } from "vitest";

import { parsePriceDirectory } from "@/lib/parsers/prices";
import {
  equivalentValue,
  financialYearMean,
  financialYearSum,
  rebase,
  rebaseInputSchema,
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
