import { describe, expect, it } from "vitest";

import { sortFunctions } from "@/components/spending-functions";
import { formatBillions, formatMonthYear, roundBn } from "@/lib/format";
import { cumulativeYear, recentWindow, seriesCsv, vintageLabel } from "@/lib/forecasts-view";

describe("forecasts view", () => {
  it("rounds before the sign so a tiny negative is not −£0.0bn", () => {
    expect(formatBillions(roundBn(-0.038))).toBe("£0.0bn");
    expect(formatBillions(roundBn(-0.06))).toBe("−£0.1bn");
  });
  it("drops the doubled Forecast prefix and shows month-only freshness", () => {
    expect(vintageLabel("Forecast: March 2026 Economic and fiscal outlook")).toBe("March 2026 Economic and fiscal outlook");
    expect(formatMonthYear("2026-03-01")).toBe("March 2026");
  });
  it("keeps 10 outturn years and 5 forecast years", () => {
    const points = Array.from({ length: 30 }, (_, index) => ({
      year: `${2000 + index}-${String(1 + index).padStart(2, "0")}`,
      outturn: index < 25 ? index : null,
      forecast: index >= 25 ? index : null,
    }));
    const window = recentWindow(points);
    expect(window).toHaveLength(15);
    expect(window.filter((point) => point.outturn != null)).toHaveLength(10);
  });
  it("builds an April to March running total with borrowing positive", () => {
    const totals = cumulativeYear([{ period: "2026-04", value: -1000 }, { period: "2026-05", value: -2500 }], "2026-27");
    expect(totals.slice(0, 3)).toEqual([1, 3.5, null]);
  });
  it("keeps later totals unknown after a missing month", () => {
    const totals = cumulativeYear([{ period: "2026-04", value: -1000 }, { period: "2026-06", value: -2000 }], "2026-27");
    expect(totals.slice(0, 3)).toEqual([1, null, null]);
  });
  it("writes a CSV with one row per point", () => {
    const csv = seriesCsv([{ name: "PSNB", points: [{ year: "2025-26", outturn: 134.3, forecast: null }] }], "March 2026");
    expect(csv).toBe("series,financial_year,outturn_bn,forecast_bn,vintage\nPSNB,2025-26,134.3,,March 2026\n");
  });
});

describe("spending sort", () => {
  const items = [{ name: "1. B", value: 2 }, { name: "2. A", value: 5 }, { name: "3. C", value: 1 }];
  it("sorts by value, largest first, by default", () => {
    expect(sortFunctions(items, "value-desc").map((item) => item.value)).toEqual([5, 2, 1]);
    expect(sortFunctions(items, "value-asc").map((item) => item.value)).toEqual([1, 2, 5]);
  });
  it("sorts by name without the COFOG number", () => {
    expect(sortFunctions(items, "name-asc").map((item) => item.name)).toEqual(["2. A", "1. B", "3. C"]);
  });
});
