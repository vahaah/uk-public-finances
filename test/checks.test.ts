import { describe, expect, it } from "vitest";

import { evaluateSlot } from "@/lib/clock";
import { parseCsvLine } from "@/lib/parsers/boe";
import { pickHmrcReceiptsWorkbook, pickSearchHit } from "@/lib/govuk";
import { droppedTooFar } from "@/lib/quality";
import { hmrcDataSchema } from "@/lib/schema";
import { firstValidSnapshot } from "@/lib/store";
import { readFileSync } from "node:fs";

describe("cron window", () => {
  it("runs inside the London window and refuses the UTC twin and a second run the same day", () => {
    const winter = evaluateSlot({ slot: "release", now: new Date("2026-01-20T07:08:00.000Z"), lastRun: null });
    expect(winter.run).toBe(true);
    if (winter.run) expect(winter.londonDate).toBe("2026-01-20");
    const summerTwin = evaluateSlot({ slot: "release", now: new Date("2026-07-20T07:05:00.000Z"), lastRun: null });
    expect(summerTwin.run).toBe(false);
    expect(summerTwin.reason).toMatch(/outside/);
    const summer = evaluateSlot({ slot: "release", now: new Date("2026-07-20T06:05:00.000Z"), lastRun: null });
    expect(summer.run).toBe(true);
    const again = evaluateSlot({
      slot: "release",
      now: new Date("2026-01-20T07:10:00.000Z"),
      lastRun: { londonDate: "2026-01-20", slot: "release" },
    });
    expect(again.run).toBe(false);
    expect(again.reason).toMatch(/Already ran/);
  });
});

describe("Bank of England CSV", () => {
  it("keeps commas inside quoted fields", () => {
    expect(parseCsvLine('02 Jan 2024,"1,234.5",3.5')).toEqual(["02 Jan 2024", "1,234.5", "3.5"]);
  });
});

describe("GOV.UK attachment picking", () => {
  it("refuses the first spreadsheet when the expected file is absent", () => {
    expect(() =>
      pickHmrcReceiptsWorkbook({
        base_path: "/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk",
        details: {
          attachments: [
            {
              filename: "other.ods",
              url: "https://assets.publishing.service.gov.uk/other.ods",
              content_type: "application/vnd.oasis.opendocument.spreadsheet",
            },
          ],
        },
      }),
    ).toThrow(/NS_Table/);
  });

  it("ignores hits outside /government/statistics/", () => {
    expect(() =>
      pickSearchHit([{ title: "Public Expenditure Statistical Analyses 2026", link: "/government/publications/pesa" }], () => true),
    ).toThrow(/no official statistics/);
  });
});

describe("snapshot guards", () => {
  it("rejects a row-count drop above 20%", () => {
    expect(droppedTooFar(100, 79)).toBe(true);
    expect(droppedTooFar(100, 80)).toBe(false);
  });

  it("rejects an HMRC total that the tax lines do not add up to", () => {
    const parsed = hmrcDataSchema.safeParse({
      contentUrl: "https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk",
      attachmentUrl: "https://example.test/a.ods",
      attachmentFilename: "NS_Table.ods",
      annual: { year: "2025-26", total: 1000, taxes: [{ name: "Income Tax", value: 10 }] },
      annualHistory: [{ year: "2025-26", total: 1000 }],
      monthly: [{ period: "2026-09", total: 10 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("uses the newest candidate that validates", () => {
    const good = JSON.parse(readFileSync("fixtures/snapshots/dmo-gilts.json", "utf8"));
    const picked = firstValidSnapshot("dmo-gilts", [{ nope: true }, good]);
    expect(picked?.sourceId).toBe("dmo-gilts");
    expect(firstValidSnapshot("dmo-gilts", [{ nope: true }])).toBeNull();
  });
});
