import { describe, expect, it } from "vitest";

import { overviewSummary } from "@/lib/overview-summary";

describe("overview summary", () => {
  it("describes September 2026 as borrowing and a larger figure than the year before", () => {
    const text = overviewSummary({
      monthLabel: "September 2026",
      monthName: "September",
      receiptsMillions: 99271,
      spendingMillions: 123791,
      borrowingBulletinMillions: 24520,
      earlierBulletinMillions: 22764,
    });
    expect(text.cite).toBe(
      "In September 2026, the public sector received £99.3bn and spent £123.8bn, so it borrowed £24.5bn. That is £1.8bn more than in September last year.",
    );
    expect(text.spoken).toBe(
      "In September 2026, spending of £123.8bn minus receipts of £99.3bn equals borrowing of £24.5bn.",
    );
  });

  it("describes January 2026 as a surplus and less borrowing than January 2025", () => {
    const text = overviewSummary({
      monthLabel: "January 2026",
      monthName: "January",
      receiptsMillions: 143408,
      spendingMillions: 111448,
      borrowingBulletinMillions: -31960,
      earlierBulletinMillions: -14973,
    });
    expect(text.cite).toBe(
      "In January 2026, the public sector received £143.4bn and spent £111.4bn, a surplus of £32.0bn. That is £17.0bn less borrowing than in January last year.",
    );
    expect(text.spoken).toBe(
      "In January 2026, spending of £111.4bn minus receipts of £143.4bn equals a surplus of £32.0bn.",
    );
  });
});
