import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { eesAllFilesUrl, parseDfePerPupil, parseHmtDeflators } from "@/lib/parsers/extras";
import { departmentsReal, perPersonByFunction } from "@/lib/spending-real";

describe("HMT GDP deflators", () => {
  it("reads outturn and rolls forecast years forward from the percentage change", async () => {
    const parsed = await parseHmtDeflators(readFileSync("fixtures/raw/hmt/gdp-deflators.xlsx"));
    expect(parsed.base).toBe("2025-26");
    expect(parsed.years.find((y) => y.year === "2025-26")).toEqual({ year: "2025-26", index: 100, forecast: false });
    const next = parsed.years.find((y) => y.year === "2026-27")!;
    expect(next.forecast).toBe(true);
    expect(next.index).toBeCloseTo(102.63, 1);
  });
});

describe("DfE per-pupil funding", () => {
  it("reads the national table and its price year", () => {
    const parsed = parseDfePerPupil(new Uint8Array(readFileSync("fixtures/raw/dfe/school-funding-tab1.zip")));
    expect(parsed.priceYear).toBe("2025-26");
    expect(parsed.rows[0]).toMatchObject({ year: "2010-11", realGbp: 7760, cashGbp: 5190 });
  });
  it("finds the download link on the release page", () => {
    const html = 'href="https://content.explore-education-statistics.service.gov.uk/api/releases/411975aa-f198-46f7-a860-e9e896a4b710/files?fromPage=ReleaseDownloads"';
    expect(eesAllFilesUrl(html)).toBe("https://content.explore-education-statistics.service.gov.uk/api/releases/411975aa-f198-46f7-a860-e9e896a4b710/files");
  });
});

describe("real-terms spending", () => {
  const pesa = JSON.parse(readFileSync("fixtures/snapshots/pesa.json", "utf8")).data;
  const prices = JSON.parse(readFileSync("fixtures/snapshots/ons-prices.json", "utf8")).data;
  it("puts the base year in its own prices", () => {
    const points = perPersonByFunction(pesa.functionHistory, pesa.deflators, prices.ukpop.years);
    const base = points.find((point) => point.period === "2025-26")!;
    const health = pesa.functionHistory.find((row: { year: string }) => row.year === "2025-26").items.find((item: { name: string }) => item.name.startsWith("7.")).value;
    expect(base.health).toBe(Math.round((health * 1e9) / prices.ukpop.years.find((y: { period: string }) => y.period === "2025").value));
  });
  it("splits departments into named groups and the rest, adding to the total", () => {
    const { points, plansFrom } = departmentsReal(pesa.departmentHistory, pesa.deflators);
    expect(plansFrom).toBe("2026-27");
    const row = pesa.departmentHistory.find((r: { year: string }) => r.year === "2025-26");
    const point = points.find((p) => p.period === "2025-26")!;
    const sum = ["health", "defence", "education", "other"].reduce((acc, key) => acc + Number(point[key]), 0);
    expect(sum).toBeCloseTo(row.total / 1000, 0);
  });
});

describe("HMT comparison of independent forecasts", () => {
  it("reads the GDP average, median and range for each year", async () => {
    const { parseIndependentForecasts } = await import("@/lib/parsers/extras");
    const years = await parseIndependentForecasts(readFileSync("fixtures/raw/hmt/independent-forecasts.xlsx"));
    expect(years.map((y) => y.year)).toEqual(["2026", "2027"]);
    expect(years[0]).toMatchObject({ average: 1.31, median: 1.37, highest: 1.58, lowest: 0.9 });
    expect(years[1]).toMatchObject({ average: 1.19, highest: 1.53, lowest: 1 });
  });
});
