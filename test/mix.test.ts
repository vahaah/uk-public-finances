import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { functionChartRows, functionMix, mixNominal, receiptMix } from "@/lib/mix";
import { parsePriceDirectory } from "@/lib/parsers/prices";
import { chartBaseYear, priceBundle, todayPricesLine } from "@/lib/prices";

const prices = priceBundle(parsePriceDirectory(path.join(process.cwd(), "fixtures/raw/ons/prices")));

describe("mix chart today's prices", () => {
  it("rebases 2006-07 National Insurance from the unrounded total", () => {
    const snapshot = JSON.parse(readFileSync("fixtures/snapshots/hmrc-receipts.json", "utf8")) as {
      data: { annualHistory: { year: string; taxes: { name: string; value: number }[] }[] };
    };
    const rows = receiptMix(snapshot.data.annualHistory, false);
    const row = rows.find((item) => item.year === "2006-07");
    const latest = rows.at(-1)?.year ?? "";
    const nominal = mixNominal(row?.raw, "nics");
    expect(row?.nics).toBe(87.3);
    expect(nominal).toBeCloseTo(87.274, 6);
    const line = todayPricesLine({
      nominal: nominal ?? 0,
      period: "2006-07",
      frequency: "financial",
      unit: "billion",
      prices,
      mode: "nominal",
      baseYear: chartBaseYear(null),
      latestPeriod: latest,
      money: true,
    });
    const rounded = todayPricesLine({
      nominal: row?.nics ?? 0,
      period: "2006-07",
      frequency: "financial",
      unit: "billion",
      prices,
      mode: "nominal",
      baseYear: chartBaseYear(null),
      latestPeriod: latest,
      money: true,
    });
    expect(line?.valueBn).toBe(141.7);
    expect(line?.text).toBe("≈ £141.7bn in 2025 prices");
    expect(rounded?.valueBn).toBe(141.8);
  });

  it("keeps the unrounded spending-mix sum for the same rebase", () => {
    const rows = functionMix(
      [
        {
          year: "2006-07",
          items: [
            { name: "1. Health", value: 87.274 },
            { name: "2. Education", value: 10 },
          ],
        },
        {
          year: "2024-25",
          items: [
            { name: "1. Health", value: 100 },
            { name: "2. Education", value: 20 },
          ],
        },
      ],
      false,
    );
    const health = rows[0]?.series.find((series) => series.key === "Health");
    const nominal = mixNominal(functionChartRows(rows)[0]?.raw, "Health");
    expect(health?.value).toBe(87.3);
    expect(nominal).toBeCloseTo(87.274, 6);
    const line = todayPricesLine({
      nominal: nominal ?? 0,
      period: "2006-07",
      frequency: "financial",
      unit: "billion",
      prices,
      mode: "nominal",
      baseYear: 2025,
      latestPeriod: "2024-25",
      money: true,
    });
    expect(line?.valueBn).toBe(141.7);
  });
});
