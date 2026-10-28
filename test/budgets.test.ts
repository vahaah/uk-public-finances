import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { forecastError, forecastWords, marchDebtRatio, sumMonths, withoutPartYear } from "@/lib/budgets/compare";
import { discoverEvents, yearAheadFy } from "@/lib/budgets/events";
import { parseHistoricalForecasts, parseLooseDate, parseMeasuresWorkbook } from "@/lib/budgets/forecasts";
import { outcomeLabel } from "@/lib/budgets/rules";
import { loadRuleRegimes, loadSeedEvents } from "@/lib/budgets/seed";
import { yearAheadComparisons } from "@/lib/budgets/view";

describe("fiscal events", () => {
  const events = loadSeedEvents();

  it("starts in June 2010 and keeps the November 2010 outlook lighter", () => {
    expect(events[0]).toMatchObject({ date: "2010-06-22", dateStatus: "verified", govukPath: "/government/publications/budget-june-2010" });
    const outlook = events.find((event) => event.slug === "2010-11-obr-outlook");
    expect(outlook).toMatchObject({ weight: "light", dateStatus: "unverified", obrForecast: "yes" });
    expect(events.some((event) => event.date < "2010-06-22")).toBe(false);
    expect(events.find((event) => event.slug === "2022-09-growth-plan")?.obrForecast).toBe("no");
  });

  it("treats the first financial year after the event as year-ahead", () => {
    expect(yearAheadFy("2010-06-22")).toBe("2011-12");
    expect(yearAheadFy("2010-11-29")).toBe("2011-12");
    expect(yearAheadFy("2024-03-06")).toBe("2024-25");
    expect(yearAheadFy("2024-10-30")).toBe("2025-26");
  });

  it("adds a later GOV.UK publication as pending and ignores factsheets", () => {
    const found = discoverEvents(events, [
      { title: "Budget 2026: documents", link: "/government/publications/budget-2026-document", public_timestamp: "2026-03-11T00:00:00Z" },
      { title: "Budget 2026: factsheet", link: "/government/publications/budget-2026-factsheet", public_timestamp: "2026-03-11T00:00:00Z" },
      { title: "Budget 2011", link: "/government/publications/budget-2011", public_timestamp: "2011-03-23T00:00:00Z" },
    ]);
    expect(found.map((event) => event.govukPath)).toEqual(["/government/publications/budget-2026-document"]);
    expect(found[0]).toMatchObject({ status: "pending", dateStatus: "discovered", obrForecast: "unknown" });
  });
});

describe("forecast comparison", () => {
  it("stores outturn minus forecast and says which way the forecast missed", () => {
    expect(forecastError(100, 80)).toBe(20);
    expect(forecastWords(20, "bn")).toBe("under-forecast by £20.0bn");
    expect(forecastWords(-1.2, "bn")).toBe("over-forecast by £1.2bn");
    expect(forecastWords(0.4, "pp")).toBe("under-forecast by 0.4 percentage points");
  });

  it("drops the financial year already underway", () => {
    const points = [
      { fy: "2010-11", value: 10 },
      { fy: "2011-12", value: 12 },
    ];
    expect(withoutPartYear("2010-11-29", points).map((point) => point.fy)).toEqual(["2011-12"]);
  });

  it("uses a complete financial year of J5II and the March HF6X ratio", () => {
    const months = [
      ...["04", "05", "06", "07", "08", "09", "10", "11", "12"].map((month) => ({ period: `2023-${month}`, value: -1000 })),
      ...["01", "02", "03"].map((month) => ({ period: `2024-${month}`, value: -1000 })),
    ];
    expect(sumMonths(months, "2023-24")).toBe(-12000);
    expect(sumMonths(months, "2024-25")).toBeNull();
    expect(marchDebtRatio([{ period: "2024-03", value: 90 }, { period: "2024-09", value: 91 }], "2023-24")).toBe(90);
  });

  it("compares a year-ahead vintage with the bulletin borrowing total", () => {
    const events = loadSeedEvents().filter((event) => event.slug === "2010-11-obr-outlook");
    const months = [
      ...["04", "05", "06", "07", "08", "09", "10", "11", "12"].map((month) => ({ period: `2011-${month}`, value: -10000 })),
      ...["01", "02", "03"].map((month) => ({ period: `2012-${month}`, value: -10000 })),
    ];
    const rows = yearAheadComparisons(
      events,
      [{ date: "2010-11-01", precision: "month", series: "psnb", points: [{ fy: "2010-11", value: 140 }, { fy: "2011-12", value: 100 }] }],
      months,
      "psnb",
    );
    expect(rows[0]?.fy).toBe("2011-12");
    expect(rows[0]?.forecast).toBe(100);
    expect(rows[0]?.outturn).toBe(120);
    expect(rows[0]?.error).toBe(20);
    expect(rows[0]?.words).toBe("under-forecast by £20.0bn");
  });
});

describe("OBR workbooks", () => {
  it("reads dated columns and the measures sign columns", async () => {
    const historical = new ExcelJS.Workbook();
    const sheet = historical.addWorksheet("PSNB ex");
    sheet.addRow(["Financial year", "Nov-10", "Mar-11"]);
    sheet.addRow(["2010-11", 149, 140]);
    sheet.addRow(["2011-12", 120, 110]);
    const parsed = await parseHistoricalForecasts(Buffer.from(await historical.xlsx.writeBuffer()));
    expect(parsed.vintages[0]).toMatchObject({ date: "2010-11-01", precision: "month", series: "psnb" });
    expect(withoutPartYear("2010-11-29", parsed.vintages[0]?.points ?? []).map((point) => point.fy)).toEqual(["2011-12"]);

    const measures = new ExcelJS.Workbook();
    const measureSheet = measures.addWorksheet("Measures");
    measureSheet.addRow(["Measure", "Event date", "Category", "2011-12", "2012-13", "2013-14"]);
    measureSheet.addRow(["Bank levy", "2010-06-22", "tax", 1.2, 2, 2.4]);
    measureSheet.addRow(["VAT cut", "2010-06-22", "tax", -3, -1, -1]);
    const rows = await parseMeasuresWorkbook(Buffer.from(await measures.xlsx.writeBuffer()));
    expect(rows.rows[0]?.year3).toBe(2.4);
    expect(rows.rows[1]?.year3).toBe(-1);
    expect(parseLooseDate("22 June 2010")).toEqual({ date: "2010-06-22", precision: "day" });
  });
});

describe("fiscal rules", () => {
  it("keeps every outcome unreviewed and gives each rule a source", () => {
    const regimes = loadRuleRegimes();
    expect(regimes.length).toBeGreaterThan(0);
    for (const regime of regimes) {
      expect(regime.source).toMatch(/^https:\/\/www\.gov\.uk\//);
      for (const rule of regime.rules) {
        expect(rule.outcome).toBe("unreviewed");
        expect(rule.source).toMatch(/^https:\/\/www\.gov\.uk\//);
        expect(outcomeLabel(rule.outcome)).toBe("Not assessed");
      }
    }
  });
});
