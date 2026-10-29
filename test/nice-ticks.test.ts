import { describe, expect, it } from "vitest";

import { niceTicks, shortPeriod, signedNumber, tickFormatter, yearTicks } from "@/lib/nice-ticks";

describe("niceTicks", () => {
  it("uses round steps and includes zero", () => {
    expect(niceTicks(0.3, 3.6)).toEqual([0, 1, 2, 3, 4]);
    expect(niceTicks(90, 140, 5, { zero: true })).toEqual([0, 50, 100, 150]);
    expect(niceTicks(20, 310)).toEqual([0, 100, 200, 300, 400]);
    expect(niceTicks(-12, 9)).toEqual([-15, -10, -5, 0, 5, 10]);
  });
  it("keeps far-from-zero ranges tight", () => {
    const ticks = niceTicks(72, 108);
    expect(ticks[0]).toBeGreaterThan(0);
    expect(ticks.every((tick) => tick % 10 === 0)).toBe(true);
  });
});

describe("formatting", () => {
  it("uses a true minus and never prints −0", () => {
    expect(signedNumber(-0.04, 1)).toBe("0.0");
    expect(signedNumber(-1, 1)).toBe("\u22121.0");
    expect(tickFormatter([-15, -10, 0, 5])(-10)).toBe("\u221210");
  });
  it("shortens financial years and picks long-run ticks", () => {
    expect(shortPeriod("2026-27")).toBe("26-27");
    expect(shortPeriod("2026")).toBe("2026");
    expect(yearTicks(["1956-57", "1960-61", "1980-81", "2000-01", "2020-21", "2025-26"])).toEqual(["1960-61", "1980-81", "2000-01", "2020-21"]);
  });
});
