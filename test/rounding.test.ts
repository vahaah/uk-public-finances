import { describe, expect, it } from "vitest";

import { largestRemainder, reconcileSignedDisplay } from "@/lib/display-rounding";
import { buildRecords } from "@/lib/records";

describe("display rounding", () => {
  it("makes September 2026 spending minus receipts equal the displayed borrowing", () => {
    const rounded = reconcileSignedDisplay([
      { key: "spending", amount: 123.791, sign: 1 },
      { key: "receipts", amount: 99.271, sign: -1 },
    ]);
    expect(rounded.balanced).toBe(true);
    expect(rounded.displayed.spending).toBe(123.8);
    expect(rounded.displayed.receipts).toBe(99.3);
    expect(Number(((rounded.displayed.spending ?? 0) - (rounded.displayed.receipts ?? 0)).toFixed(1))).toBe(24.5);
  });

  it("makes shares add to 100", () => {
    const shares = largestRemainder([326932, 200829, 179861, 95105, 40000, 95036]);
    expect(Number(shares.reduce((sum, share) => sum + share, 0).toFixed(1))).toBe(100);
  });
});

describe("records", () => {
  it("treats a positive J5II month as a surplus and a negative month as borrowing", () => {
    const records = buildRecords({
      borrowingMonths: [
        { period: "1993-01", value: -1000 },
        { period: "2020-05", value: -5000 },
        { period: "2026-01", value: 2000 },
      ],
      debtRatioMonths: [
        { period: "1993-03", value: 40 },
        { period: "2020-09", value: 97.8 },
      ],
      interestYears: [{ period: "2025", value: 10 }],
      receiptYears: [{ period: "2025", value: 100 }],
      hmrcMonths: [{ period: "2017-04", value: 1000 }],
    });
    expect(records.find((record) => record.id === "largest-monthly-borrowing")?.period).toBe("2020-05");
    expect(records.find((record) => record.id === "largest-monthly-surplus")?.period).toBe("2026-01");
    expect(records.find((record) => record.id === "highest-debt-ratio")?.period).toBe("2020-09");
  });
});
