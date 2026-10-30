import { describe, expect, it } from "vitest";

import { parseBorrowingChanges } from "@/lib/budgets/efo";

// Shape of OBR October 2026 EFO table 6.2 (rows trimmed).
const grid = [
  [null, "Table 6.2: Public sector net borrowing and the current budget deficit: changes since March"],
  [null, null, "Outturn", "Forecast ", "2024-25", "2025-26"],
  [null, null, "2025-26", "2026-27", "2027-28"],
  [null, "Difference", 1.55, 17.73, 15.51],
  [null, "Underlying differences", null, 11.45, 8.5],
  [null, "Debt interest spending", null, 15.43, 16.03],
  [null, "Capital spending", null, 11.51, 6.08],
  [null, "Welfare", null, -0.18, 3.97],
  [null, "Other spending ", null, -1.12, 0.25],
  [null, "Receipts", null, -14.2, -17.83],
  [null, "Onshore corporation tax1", null, -5.87, -4.4],
  [null, "Direct effects of policy decisions", null, 7.6, 3.53],
  [null, "Indirect effects of policy decisions ", null, -1.31, 3.48],
  [null, "October 2026 current budget deficit3", 47.39, 40.57, 17.52],
  [null, "Difference", -1.79, 6.65, 12.96],
  [null, "Capital spending", null, -11.75, -4.5],
];

describe("parseBorrowingChanges", () => {
  it("reads the PSNB block and ignores the current budget deficit block", () => {
    const rows = parseBorrowingChanges(grid);
    expect(rows.map((row) => row.period)).toEqual(["2026-27", "2027-28"]);
    expect(rows[0]).toEqual({ period: "2026-27", total: 17.73, debtInterest: 15.43, welfare: -0.18, otherSpending: 10.39, receipts: -14.2, policy: 6.29 });
  });
  it("adds up to the total", () => {
    for (const row of parseBorrowingChanges(grid)) {
      const sum = (row.debtInterest ?? 0) + (row.welfare ?? 0) + (row.otherSpending ?? 0) + (row.receipts ?? 0) + (row.policy ?? 0);
      expect(sum).toBeCloseTo(row.total ?? 0, 1);
    }
  });
});
