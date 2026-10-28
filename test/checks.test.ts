import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateSlot } from "@/lib/clock";
import { formatGbpFromMillions, formatReceiptBn, formatReceiptShare, millionsToBillions } from "@/lib/format";
import { shouldWriteSnapshot } from "@/lib/snapshot";
import { pickHmrcReceiptsWorkbook, pickIncomeTaxPublication, pickSearchHit } from "@/lib/govuk";
import { parseCsvLine } from "@/lib/parsers/boe";
import { droppedTooFar } from "@/lib/quality";
import { hmrcDataSchema } from "@/lib/schema";
import { blobPageFetchInit, firstValidSnapshot, loadHealth } from "@/lib/store";
import { boeSnapshot, dmoSnapshot } from "@/lib/workflows/builds";
import { protectBuild } from "@/lib/workflows/guard";

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

describe("parse failures are journaled", () => {
  it("records a malformed Bank of England CSV and DMO payload instead of throwing", async () => {
    const journal: string[] = [];
    const record = async (message: string) => {
      journal.push(message);
    };
    const boe = await protectBuild(() => boeSnapshot("DATE,OTHER\n01 Jan 2024,1", "2026-10-28T00:00:00.000Z"), record);
    const dmo = await protectBuild(() => dmoSnapshot('{"LastUpdated":"2026-10-28"}', "2026-10-28T00:00:00.000Z"), record);
    const broken = await protectBuild(() => dmoSnapshot("not-json", "2026-10-28T00:00:00.000Z"), record);
    expect(boe.ok).toBe(false);
    expect(dmo.ok).toBe(false);
    expect(broken.ok).toBe(false);
    if (!boe.ok) expect(boe.error).toMatch(/IUDBEDR/);
    if (!dmo.ok) expect(dmo.error).toMatch(/portfolio fields/);
    if (!broken.ok) expect(broken.error).toMatch(/JSON/);
    expect(journal).toEqual([boe.ok ? "" : boe.error, dmo.ok ? "" : dmo.error, broken.ok ? "" : broken.error]);
  });

  it("keeps the BoE and DMO parsers inside finish", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/workflows/steps.ts"), "utf8");
    const boe = source.slice(source.indexOf("export async function runBoe"), source.indexOf("export async function runDmo"));
    const dmo = source.slice(source.indexOf("export async function runDmo"), source.indexOf("export async function runObr"));
    expect(boe).not.toContain("parseBoeCsv");
    expect(boe.indexOf("boeSnapshot(")).toBeGreaterThan(boe.indexOf("return finish("));
    expect(dmo).not.toContain("parseDmoSales");
    expect(dmo).not.toContain("response.json");
    expect(dmo.indexOf("dmoSnapshot(")).toBeGreaterThan(dmo.indexOf("return finish("));
  });
});

describe("health age", () => {
  it("keeps a fixture available after it ages past the stale window", async () => {
    const fresh = await loadHealth(new Date("2026-10-28T12:00:00.000Z"));
    const onsFresh = fresh.sources.find((source) => source.source === "ons-psf");
    expect(onsFresh?.origin).toBe("fixture");
    expect(onsFresh?.status).toBe("ok");
    expect(fresh.ok).toBe(true);
    const aged = await loadHealth(new Date("2026-12-20T12:00:00.000Z"));
    const onsAged = aged.sources.find((source) => source.source === "ons-psf");
    expect(onsAged?.status).toBe("stale");
    expect(onsAged?.origin).toBe("fixture");
    expect(onsAged?.releaseDate).toBe("2026-10-20T23:00:00.000Z");
    expect(aged.ok).toBe(true);
    expect(aged.sources.find((source) => source.source === "obr-databank")?.status).toBe("pending");
    expect(aged.ok).toBe(true);
  });
});

describe("Bank of England CSV", () => {
  it("keeps commas inside quoted fields", () => {
    expect(parseCsvLine('02 Jan 2024,"1,234.5",3.5')).toEqual(["02 Jan 2024", "1,234.5", "3.5"]);
  });
});

describe("income tax discovery", () => {
  it("chooses the latest liabilities statistics release from the captured collection", () => {
    const collection = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/raw/govuk/income-tax-collection.json"), "utf8")) as {
      links: { documents: { title?: string; base_path?: string; public_updated_at?: string; withdrawn?: boolean }[] };
    };
    const picked = pickIncomeTaxPublication(collection.links.documents);
    expect(picked.base_path).toBe(
      "/government/statistics/income-tax-liabilities-statistics-tax-year-2023-to-2024-to-tax-year-2026-to-2027",
    );
    expect(picked.title).toMatch(/^Income Tax liabilities statistics:/);
  });

  it("ignores table releases that are not the liabilities statistics publication", () => {
    expect(() =>
      pickIncomeTaxPublication([
        {
          title: "Table 2.5 Income Tax liabilities by income range",
          base_path: "/government/statistics/income-tax-liabilities-by-income-range",
          public_updated_at: "2026-07-15T08:30:13Z",
        },
      ]),
    ).toThrow(/liabilities statistics/);
  });
});

describe("blob publish", () => {
  it("copies a fixture-matching snapshot into Blob and skips a second write", () => {
    expect(shouldWriteSnapshot("fixture", true)).toBe(true);
    expect(shouldWriteSnapshot("none", true)).toBe(true);
    expect(shouldWriteSnapshot("blob", true)).toBe(false);
    expect(shouldWriteSnapshot("blob", false)).toBe(true);
  });
});

describe("page blob reads", () => {
  it("revalidates overwritten Blob files instead of opting the page out of ISR", () => {
    expect(blobPageFetchInit()).toEqual({ next: { revalidate: 60 } });
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

describe("HMRC receipt units", () => {
  it("treats monthly workbook totals as £ million and charts them as £bn", () => {
    const snapshot = JSON.parse(readFileSync("fixtures/snapshots/hmrc-receipts.json", "utf8")) as {
      data: { monthly: { period: string; total: number }[] };
    };
    const september = snapshot.data.monthly.find((row) => row.period === "2026-09");
    expect(september?.total).toBe(75778);
    expect(millionsToBillions(september?.total ?? 0)).toBeCloseTo(75.778);
    expect(formatGbpFromMillions(september?.total ?? 0)).toBe("£75.8bn");
    expect(formatReceiptBn(10)).toBe("less than £0.1bn");
    expect(formatReceiptShare(-400, 1000)).toBe("share not shown");
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
