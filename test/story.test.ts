import { describe, expect, it } from "vitest";

import { efoVintages, isLater, parseEfoCharts, periodLabel } from "@/lib/budgets/efo";
import { eventComparisons, measuresPerEvent } from "@/lib/story";
import type { FiscalEvent } from "@/lib/budgets/events";

describe("EFO charts parser", () => {
  it("reads period labels", () => {
    expect(periodLabel(2026)).toBe("2026");
    expect(periodLabel("2026-27")).toBe("2026-27");
    expect(periodLabel("2026/2027")).toBe("2026-27");
    expect(periodLabel("October 2026")).toBeNull();
    expect(isLater("October 2026", "March 2026")).toBe(true);
  });

  it("finds charts by title, not by sheet number, and orders vintages by date", () => {
    const book = {
      Contents: [[null, "Chart 9.9: CPI inflation"]],
      X1: [
        ["Back to contents"],
        [null, "Chart 9.9: CPI inflation"],
        [null, null, "October 2026 forecast", "March 2026 forecast"],
        [null, 2026, 3.1, 2.3],
        [null, 2027, 3.4, 2.0],
      ],
      X2: [
        ["Back to contents"],
        [null, "Chart 3.1: Direct borrowing impact of policy decisions included in this forecast"],
        [null, null, "2026-27", "2027-28"],
        [null, "Total impact on borrowing", 7.6, -2],
      ],
    };
    const efo = parseEfoCharts([book]);
    expect(efo.cpi?.currentLabel).toBe("October 2026");
    expect(efo.cpi?.points[1]).toEqual({ period: "2027", current: 3.4, previous: 2 });
    expect(efo.policy.map((point) => point.total)).toEqual([7.6, -2]);
    const vintages = efoVintages(efo, "2026-10-28", []);
    expect(vintages).toHaveLength(1);
    expect(vintages[0]?.series).toBe("cpi");
    expect(efoVintages(efo, "2026-10-28", [{ date: "2026-10-01", series: "cpi" }])).toHaveLength(0);
  });
});

describe("story helpers", () => {
  const event = { slug: "e", name: "Budget 2026", date: "2026-10-28" } as FiscalEvent;
  it("compares an event's forecast with the one before it", () => {
    const rows = eventComparisons(event, [
      { date: "2026-03-01", precision: "month", series: "psnb", points: [{ fy: "2026-27", value: 115 }, { fy: "2027-28", value: 96 }] },
      { date: "2026-10-28", precision: "day", series: "psnb", points: [{ fy: "2026-27", value: 133 }, { fy: "2027-28", value: 112 }] },
    ]);
    expect(rows[0]?.previousLabel).toBe("March 2026");
    expect(rows[0]?.points[0]).toEqual({ period: "2026-27", current: 133, previous: 115 });
  });
  it("counts measures per event", () => {
    const rows = measuresPerEvent(
      [
        { eventDate: "2026-10-28", name: "a", category: "x", year3: 1000 },
        { eventDate: "2026-10-28", name: "b", category: "x", year3: -3000 },
        { eventDate: null, name: "c", category: "x", year3: 5 },
      ],
      [event],
    );
    expect(rows).toEqual([{ date: "2026-10-28", slug: "e", name: "Budget 2026", count: 2, averageBn: 2 }]);
  });
});
