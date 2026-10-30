import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { pickDistributional } from "@/lib/hmt-distributional";
import { hmtDistributionalSchema } from "@/lib/schema";

const body = JSON.parse(readFileSync("fixtures/raw/hmt/distributional/budget-2026.json", "utf8")) as unknown;

describe("HM Treasury distributional analysis", () => {
  it("validates and flags values as read from charts", () => {
    const data = hmtDistributionalSchema.parse(body);
    expect(data.readFromCharts).toBe(true);
    expect(data.figures.map((figure) => figure.figure)).toEqual(["1.A", "1.B", "1.C", "1.D", "1.E"]);
  });
  it("segments add up to the Overall marker", () => {
    const data = hmtDistributionalSchema.parse(body);
    for (const figure of data.figures) {
      const tolerance = figure.unit === "gbp" ? 6 : figure.figure === "1.E" ? 0.3 : 0.02;
      for (const row of figure.rows) expect(Math.abs(row.tax + row.welfare + row.publicServices - row.overall)).toBeLessThanOrEqual(tolerance);
    }
  });
  it("keeps Budget 2026 figures read from the PDF", () => {
    const data = hmtDistributionalSchema.parse(body);
    const a = data.figures.find((figure) => figure.figure === "1.A")!;
    expect(a.rows[0]!.overall).toBeCloseTo(0.57, 2);
    expect(a.rows[9]!.overall).toBeCloseTo(-0.08, 2);
  });
  it("picks the newest valid file and reports invalid ones", () => {
    const older = { ...(body as Record<string, unknown>), published: "2025-11-26", eventSlug: "2025-11-budget" };
    const picked = pickDistributional([
      { pathname: "manual/hmt/distributional/budget-2025.json", body: older },
      { pathname: "manual/hmt/distributional/budget-2026.json", body },
      { pathname: "manual/hmt/distributional/broken.json", body: { version: 1 } },
    ]);
    expect(picked.file).toBe("manual/hmt/distributional/budget-2026.json");
    expect(picked.errors).toHaveLength(1);
  });
});
