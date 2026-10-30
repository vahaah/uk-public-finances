import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseAnnex9, periodStart, pickAnnex9 } from "@/lib/parsers/ofgem";

describe("Ofgem Annex 9", () => {
  it("reads the dual fuel Direct Debit typical-consumption cap for every period", async () => {
    const { periods } = await parseAnnex9(readFileSync("fixtures/raw/ofgem/annex-9.xlsx"));
    expect(periods[0]).toMatchObject({ start: "2017-04-01" });
    expect(periods.find((p) => p.start === "2026-10-01")?.gbp).toBe(1723);
    expect(periods.find((p) => p.start === "2023-01-01")?.gbp).toBe(3582);
    expect(new Set(periods.map((p) => p.start)).size).toBe(periods.length);
  });
  it("parses period labels", () => {
    expect(periodStart("April 2024 - June 2024")).toBe("2024-04-01");
    expect(periodStart("Jul 2025 - Sept 2025")).toBe("2025-07-01");
  });
  it("picks the Annex 9 link", () => {
    expect(pickAnnex9('<a href="/sites/default/files/2026-08/Annex-9-Levelisation-allowance-methodology-and-levelised-cap-levels-v1.11.xlsx">')).toBe("https://www.ofgem.gov.uk/sites/default/files/2026-08/Annex-9-Levelisation-allowance-methodology-and-levelised-cap-levels-v1.11.xlsx");
  });
});
