import { describe, expect, it } from "vitest";

import { rhdiByDecade } from "@/lib/rhdi-decades";

describe("rhdiByDecade", () => {
  it("compounds growth over each decade and flags the partial one", () => {
    const years = [
      { period: "2000", value: 100 },
      { period: "2010", value: 121.9 },
      { period: "2020", value: 130 },
      { period: "2023", value: 133 },
    ];
    const rows = rhdiByDecade(years);
    expect(rows.map((row) => row.decade)).toEqual(["2000s", "2010s", "2020s"]);
    expect(rows[0]!.growthPct).toBeCloseTo(2, 1);
    expect(rows[2]).toMatchObject({ from: 2020, to: 2023, years: 3, partial: true, changeGbp: 3 });
  });
});
