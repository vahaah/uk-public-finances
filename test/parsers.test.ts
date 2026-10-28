import { readFileSync } from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { pickHmrcReceiptsWorkbook, pickPesaChapters, pickSearchHit } from "@/lib/govuk";
import { maturityBuckets, parseDmoSales } from "@/lib/parsers/dmo";
import { parseHmrcReceipts } from "@/lib/parsers/hmrc";
import { parseIncomeTax } from "@/lib/parsers/taxpayers";
import { parseOnsDirectory } from "@/lib/parsers/ons";
import { parseObrWorkbook } from "@/lib/parsers/obr";
import { parsePesa } from "@/lib/parsers/pesa";
import { parseBoeCsv } from "@/lib/parsers/boe";
import { decidePublish } from "@/lib/snapshot";
import { loadHealth } from "@/lib/store";

const root = process.cwd();

describe("ONS public sector finances", () => {
  const data = parseOnsDirectory(path.join(root, "fixtures/raw/ons"));

  it("matches the September 2026 bulletin magnitudes", () => {
    expect(data.series.j5ii?.latest).toEqual({ period: "2026-09", value: -24520 });
    expect(data.bulletinSign.borrowingLatest).toBe(24520);
    expect(data.bulletinSign.financialYearBorrowing).toBe(97841);
    expect(data.bulletinSign.previousFinancialYearBorrowing).toBe(102290);
    expect(data.bulletinSign.currentBudgetDeficitLatest).toBe(15770);
    expect(data.series.nmfx?.latest?.value).toBe(10933);
    expect(data.series.kse6?.latest?.value).toBe(3004964);
    expect(data.series.hf6x?.latest?.value).toBe(94);
    expect(data.series.jw2o?.latest?.value).toBe(99271);
    expect(data.series.kx5q?.latest?.value).toBe(123791);
    expect(data.series.j5ii?.years[0]).toEqual({ period: "1946", value: -623 });
    expect(data.series.j5ii?.years.at(-1)?.period).toBe("2025");
    expect(data.series.j5ii?.quarters[0]?.period).toBe("1946-Q1");
    expect(data.series.j5ii?.months[0]?.period).toBe("1993-01");
  });
});

describe("HMRC receipts", () => {
  it("reads the 2025-26 cash total without double counting NIC splits", () => {
    const content = JSON.parse(readFileSync(path.join(root, "fixtures/raw/govuk/hmrc-receipts-content.json"), "utf8"));
    const file = pickHmrcReceiptsWorkbook(content);
    const data = parseHmrcReceipts(readFileSync(path.join(root, "fixtures/raw/hmrc/NS_Table.ods")), {
      contentUrl: "https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk",
      attachmentUrl: file.url ?? "",
      attachmentFilename: file.filename ?? "",
    });
    expect(data.annual.year).toBe("2025-26");
    expect(data.annual.total).toBe(937763);
    expect(data.annual.taxes.find((tax) => tax.name === "Income Tax")?.value).toBe(326932);
    expect(data.annual.taxes.some((tax) => /PAYE NIC/i.test(tax.name))).toBe(false);
    expect(data.monthly.at(-1)).toEqual({ period: "2026-09", total: 75778 });
    expect(data.annualHistory[0]?.year).toBe("2006-07");
    expect(data.annualHistory.at(-1)?.year).toBe("2025-26");
    expect(data.annualHistory[0]?.taxes.length).toBeGreaterThan(0);
    expect(data.monthly[0]?.period).toBe("2017-04");
  });
});

describe("PESA", () => {
  it("reads function and department outturn", async () => {
    const content = JSON.parse(readFileSync(path.join(root, "fixtures/raw/govuk/pesa-2026-content.json"), "utf8"));
    const chapters = pickPesaChapters(content);
    expect(chapters.chapter4.filename).toMatch(/Chapter_4/);
    expect(chapters.chapter6.filename).toMatch(/Chapter_6/);
    const data = await parsePesa(
      readFileSync(path.join(root, "fixtures/raw/pesa/chapter-4.xlsx")),
      readFileSync(path.join(root, "fixtures/raw/pesa/chapter-6.xlsx")),
      "https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2026",
    );
    expect(data.functions.year).toBe("2025-26");
    expect(data.functions.items.find((item) => item.name.startsWith("7."))?.value).toBe(257.5);
    expect(data.functions.totalServices).toBe(1227.6);
    expect(data.functions.totalManagedExpenditure).toBe(1360.1);
    expect(data.departments.items[0]).toEqual({ name: "Health and Social Care", value: 213249 });
    expect(data.departments.total).toBe(489766);
    expect(data.functionHistory[0]?.year).toBe("2003-04");
    expect(data.functionHistory.at(-1)?.year).toBe("2025-26");
    expect(data.functionHistory).toHaveLength(23);
    expect(data.departmentHistory.filter((row) => row.basis === "outturn").map((row) => row.year)).toEqual([
      "2021-22",
      "2022-23",
      "2023-24",
      "2024-25",
      "2025-26",
    ]);
  });
});

describe("Bank of England and DMO", () => {
  it("keeps a blank gilt yield null and reads the last published prints", () => {
    const data = parseBoeCsv(readFileSync(path.join(root, "fixtures/raw/boe/iadb.csv"), "utf8"));
    expect(data.series.IUDBEDR.latest).toEqual({ date: "2026-10-26", value: 3.75 });
    expect(data.series.IUDMNPY.latest).toEqual({ date: "2026-10-23", value: 5.3152 });
  });

  it("computes the index-linked share from the published portfolio fields", () => {
    const raw = JSON.parse(readFileSync(path.join(root, "fixtures/raw/dmo/sales.json"), "utf8"));
    const data = parseDmoSales(raw.body);
    expect(data.portfolio?.averageMaturityYears).toBeCloseTo(13.35378, 4);
    expect(data.portfolio?.indexLinkedShare).toBeCloseTo(715557138.0823275 / 2923087430.7111952, 8);
    expect(data.maturity).toBeNull();
  });
});

describe("income tax liabilities", () => {
  it("reads table 2.1 and table 2.4 for 2026-27", () => {
    const data = parseIncomeTax(readFileSync(path.join(root, "fixtures/raw/hmrc/income-tax-liabilities.ods")), {
      contentUrl: "https://www.gov.uk/government/statistics/income-tax-liabilities-statistics-tax-year-2023-to-2024-to-tax-year-2026-to-2027",
      attachmentUrl: "https://example.test/itl.ods",
      attachmentFilename: "itl.ods",
    });
    expect(data.payers.total).toBe(40800);
    expect(data.payers.bands.find((band) => band.name === "Basic")?.value).toBe(31400);
    expect(data.payers.projected).toBe(true);
    expect(data.shares.top1Percent).toBe(26.6);
    expect(data.shares.top10Percent).toBe(58.4);
  });
});

describe("publish decision and health", () => {
  it("keeps the last good snapshot when validation fails", () => {
    expect(decidePublish({ ok: false, error: "schema" })).toEqual({
      action: "keep-last-good",
      error: "schema",
    });
    expect(decidePublish({ ok: true, snapshot: { id: 1 } }).action).toBe("write");
  });

  it("reports the fixture snapshots as healthy", async () => {
    const health = await loadHealth(new Date("2026-10-28T12:00:00.000Z"));
    expect(health.ok).toBe(true);
    expect(health.sources.find((source) => source.source === "ons-psf")?.status).toBe("ok");
    expect(health.sources.find((source) => source.source === "obr-databank")?.status).toBe("pending");
  });
});

describe("GOV.UK search", () => {
  it("requires a title match", () => {
    expect(() => pickSearchHit([{ title: "Other", link: "/government/statistics/other" }], (hit) => /PESA/.test(hit.title ?? ""))).toThrow();
  });
});

describe("OBR workbook and gilt buckets", () => {
  it("parses an outturn and forecast header and ignores a sheet without one", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Aggregates");
    sheet.addRow(["Public finances databank"]);
    sheet.addRow(["Year", "Outturn", "March 2026 forecast"]);
    sheet.addRow(["2024-25", 120, null]);
    sheet.addRow(["2026-27", null, 90]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseObrWorkbook(buffer, "obr");
    expect(parsed.series[0]?.points).toEqual([
      { year: "2024-25", outturn: 120, forecast: null },
      { year: "2026-27", outturn: null, forecast: 90 },
    ]);
  });

  it("writes the extended data bar that calls uuid", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bars");
    sheet.addRow([1]);
    sheet.addRow([3]);
    sheet.addConditionalFormatting({
      ref: "A1:A2",
      rules: [
        {
          type: "dataBar",
          priority: 1,
          gradient: false,
          cfvo: [
            { type: "num", value: 0 },
            { type: "num", value: 3 },
          ],
        },
      ],
    });
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const xml = Object.entries(unzipSync(new Uint8Array(buffer)))
      .filter(([name]) => name.endsWith(".xml"))
      .map(([, bytes]) => strFromU8(bytes))
      .join("\n");
    expect(xml).toMatch(/id="\{[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\}"/);
    const again = new ExcelJS.Workbook();
    await again.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(again.getWorksheet("Bars")?.getCell("A2").value).toBe(3);
  });

  it("buckets nominal amounts by redemption date", () => {
    const buckets = maturityBuckets(
      [
        { name: "1% 2028", redemption: "2028-01-31", nominal: 10, indexLinked: false },
        { name: "0.125% Index-linked 2045", redemption: "2045-03-22", nominal: 5, indexLinked: true },
      ],
      "2026-10-27",
    );
    expect(buckets.buckets[0]?.nominal).toBe(10);
    expect(buckets.buckets.find((bucket) => bucket.label === "10 to 20 years")?.nominal).toBe(5);
  });
});
