import { readFileSync } from "node:fs";

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { differenceWords, forecastDifference, marchDebtRatio, sumMonths, withoutPartYear } from "@/lib/budgets/compare";
import { discoverEvents, eventLabel, yearAheadFy } from "@/lib/budgets/events";
import { measureEventDate, parseEvaluationWorkbook, parseHeadroomWorkbook, parseHistoricalForecasts, parseLooseDate, parseMeasuresWorkbook, stripFootnoteMarker } from "@/lib/budgets/forecasts";
import { outcomeLabel, reviewedHeadroom } from "@/lib/budgets/rules";
import { loadRuleRegimes, loadSeedEvents } from "@/lib/budgets/seed";
import { yearAheadComparisons } from "@/lib/budgets/view";

describe("fiscal events", () => {
  const events = loadSeedEvents();

  it("starts in June 2010 and keeps the November 2010 outlook lighter", () => {
    expect(events[0]).toMatchObject({ date: "2010-06-22", dateStatus: "verified", govukPath: "/government/publications/budget-june-2010" });
    const outlook = events.find((event) => event.slug === "2010-11-obr-outlook");
    expect(outlook).toMatchObject({ weight: "light", dateStatus: "verified", obrForecast: "yes" });
    expect(events.some((event) => event.date < "2010-06-22")).toBe(false);
    expect(events.find((event) => event.slug === "2022-09-growth-plan")?.obrForecast).toBe("no");
    for (const event of events) expect(eventLabel(event).length).toBeLessThanOrEqual(28);
  });

  it("treats a March event as a forecast of the year that starts in April", () => {
    expect(yearAheadFy("2010-06-22")).toBe("2011-12");
    expect(yearAheadFy("2010-11-29")).toBe("2011-12");
    expect(yearAheadFy("2020-03-11")).toBe("2020-21");
    expect(yearAheadFy("2024-03-06")).toBe("2024-25");
    expect(yearAheadFy("2024-10-30")).toBe("2025-26");
  });

  it("adds a later GOV.UK publication as pending and ignores factsheets", () => {
    const found = discoverEvents(events, [
      { title: "Budget 2027: documents", link: "/government/publications/budget-2027-document", public_timestamp: "2027-03-11T00:00:00Z" },
      { title: "Budget 2027: factsheet", link: "/government/publications/budget-2027-factsheet", public_timestamp: "2027-03-11T00:00:00Z" },
      { title: "Budget 2011", link: "/government/publications/budget-2011", public_timestamp: "2011-03-23T00:00:00Z" },
    ]);
    expect(found.map((event) => event.govukPath)).toEqual(["/government/publications/budget-2027-document"]);
    expect(found[0]).toMatchObject({ status: "pending", dateStatus: "discovered", obrForecast: "unknown" });
  });
});

describe("forecast comparison", () => {
  it("stores outturn minus forecast and says whether the forecast was too high or too low", () => {
    expect(forecastDifference(100, 80)).toBe(20);
    expect(differenceWords(20, "bn")).toMatchObject({ direction: "under", sentence: "The forecast was £20.0bn too low." });
    expect(differenceWords(-1.2, "bn")).toMatchObject({ direction: "over", sentence: "The forecast was £1.2bn too high." });
    expect(differenceWords(0.04, "bn").sentence).toBe("Matched the outturn.");
    expect(differenceWords(0.4, "pp").sentence).toBe("The forecast was 0.4 percentage points too low.");
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
    expect(rows[0]?.difference).toBe(20);
    expect(rows[0]?.words).toBe("The forecast was £20.0bn too low.");
  });
});

describe("OBR workbooks", () => {
  const events = loadSeedEvents().map((event) => ({ name: event.name, date: event.date }));

  it("reads the transposed Spring 2026 historical database", async () => {
    const parsed = await parseHistoricalForecasts(readFileSync("fixtures/raw/obr/historical-spring-2026.xlsx"));
    expect(parsed.asOf).toBe("2026-03-01");
    expect(parsed.vintages.map((vintage) => vintage.series).sort()).toEqual(["psnb", "psnb", "psnd_pct", "receipts", "tme"]);
    const april = parsed.vintages.find((vintage) => vintage.series === "psnb" && vintage.date === "1970-04-01");
    expect(april).toMatchObject({ precision: "month" });
    expect(april?.points).toEqual([{ fy: "1970-71", value: -0.2 }]);
    const march = parsed.vintages.find((vintage) => vintage.series === "psnb" && vintage.date === "2026-03-01");
    expect(march?.points.find((point) => point.fy === "2024-25")?.value).toBeCloseTo(152.742, 3);
    expect(march?.points.find((point) => point.fy === "2026-27")?.value).toBeCloseTo(115.461, 3);
    expect(parsed.vintages.find((vintage) => vintage.series === "psnd_pct")?.points.find((point) => point.fy === "2025-26")?.value).toBeCloseTo(95.026, 3);
    expect(parsed.vintages.some((vintage) => vintage.points.some((point) => point.value === 99999 || point.value === 88888))).toBe(false);
    expect(parsed.vintages.some((vintage) => vintage.date.startsWith("2020-03") && vintage.series === "psnb")).toBe(false);
  });

  it("maps measure names, including #2, and takes year 3 from the event's own financial year", async () => {
    expect(measureEventDate("Budget 2010 #2", events)).toBe("2010-06-22");
    expect(measureEventDate("Budget 2015 #2", events)).toBe("2015-07-08");
    expect(measureEventDate("Autumn 2010", events)).toBe("2010-11-29");
    expect(measureEventDate("Budget 2017", events)).toBe("2017-03-08");
    expect(measureEventDate("Spring Budget 2021", events)).toBe("2021-03-03");
    expect(measureEventDate("Autumn Budget 2021", events)).toBe("2021-10-27");
    expect(measureEventDate("Autumn Budget 2025", events)).toBe("2025-11-26");
    expect(measureEventDate("Spring Forecast 2026", events)).toBe("2026-03-03");
    expect(parseLooseDate("22 June 2010")).toEqual({ date: "2010-06-22", precision: "day" });

    const parsed = await parseMeasuresWorkbook(readFileSync("fixtures/raw/obr/policy-measures-march-2026.xlsx"), events);
    expect(parsed.rows).toHaveLength(4);
    expect(parsed.rows.map((row) => row.name)).not.toContain("Junk from notes");
    expect(parsed.rows.map((row) => row.name)).not.toContain("Junk from summary");
    const infected = parsed.rows.find((row) => row.name.startsWith("Compensation Payments"));
    expect(infected).toMatchObject({ eventDate: "2024-10-30", category: "Income tax" });
    expect(infected?.year3).toBeCloseTo(-1123.055, 3);
    const freeze = parsed.rows.find((row) => row.name.startsWith("Council Tax"));
    expect(freeze).toMatchObject({ eventDate: "2010-06-22", year3: 630 });
    expect(parsed.rows.find((row) => row.name.startsWith("Police precept"))?.eventDate).toBe("2026-03-03");
    expect(parsed.rows.find((row) => row.name.startsWith("Police precept"))?.year3).not.toBeUndefined();
  });

  it("reads T3.6 and T3.7 with the economic factors column", async () => {
    const parsed = await parseEvaluationWorkbook(readFileSync("fixtures/raw/obr/forecast-evaluation-june-2026.xlsx"));
    expect(parsed.asOf).toBe("2024-03-01");
    const income = parsed.rows.find((row) => row.series === "Income tax and NICs" && row.eventDate === "2024-03-01");
    expect(income).toMatchObject({ fy: "2024-25" });
    expect(income?.economy).toBeCloseTo(13.301, 3);
    expect(income?.policy).toBeCloseTo(0.133, 3);
    expect(income?.other).toBeCloseTo(-6.975, 3);
    const july = parsed.rows.find((row) => row.series === "Income tax and NICs" && row.eventDate === "2020-07-01");
    expect(july?.economy).toBeNull();
    expect(parsed.rows.some((row) => row.series === "Onshore corporation tax")).toBe(true);
    expect(parsed.rows.some((row) => /debt interest/i.test(row.series))).toBe(false);
    expect(parsed.rows.every((row) => row.fy === "2024-25")).toBe(true);
  });

  it("does not throw when the fiscal rules workbook has no headroom table", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("EFO");
    sheet.addRow(["Economic and fiscal outlook", "March 2026"]);
    sheet.addRow(["This forecast does not reassess the fiscal rules."]);
    const parsed = await parseHeadroomWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(parsed.rows).toEqual([]);
    const reviewed = reviewedHeadroom(loadRuleRegimes());
    expect(reviewed.length).toBeGreaterThan(0);
    for (const row of reviewed) {
      expect(row.source).toMatch(/^https:\/\/www\.gov\.uk\//);
      expect(row.headroomBn).toBeNull();
    }
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

describe("measure footnote markers", () => {
  it("strips a footnote digit after a year or a word", () => {
    expect(stripFootnoteMarker("Fund agreement with EU to join Erasmus+ in 20274")).toBe("Fund agreement with EU to join Erasmus+ in 2027");
    expect(stripFootnoteMarker("Income Tax: reduce basic rate from 20% to 19% from April 20243")).toBe("Income Tax: reduce basic rate from 20% to 19% from April 2024");
    expect(stripFootnoteMarker("Industrial Energy Transformation Fund1")).toBe("Industrial Energy Transformation Fund");
  });
  it("keeps digits that are part of the name", () => {
    expect(stripFootnoteMarker("Pillar 2")).toBe("Pillar 2");
    expect(stripFootnoteMarker("Freeze thresholds to 2028")).toBe("Freeze thresholds to 2028");
    expect(stripFootnoteMarker("Grant of £120000")).toBe("Grant of £120000");
    expect(stripFootnoteMarker("Covid-19")).toBe("Covid-19");
  });
});


describe("EFO fiscal targets table", () => {
  it("reads Table 7.1 margins and maps each forecast to its event", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("T7.1");
    [
      ["Back to contents"],
      ["Table 7.1: Performance against the Government's fiscal targets"],
      [],
      ["", "Per cent of GDP", "£ billion", "Per cent"],
      ["Current budget to be in surplus by 2029-30"],
      ["November 2025 forecast2", 0.62, 21.7, 59],
      ["October 2026 pre-measures forecast ", 0.35, 12.49, 55.4],
      ["October 2026 forecast", 0.41, 14.53, 55.77],
      ["Memo: excluding fuel duty rises3", 0.29, 10.24],
      ["Change in public sector net financial liabilities in 2029-30"],
      ["November 2025 forecast2", 0.68, "-", 52],
      ["October 2026 forecast", 0.68, 24.39, 53.99],
      ["Welfare cap: specified welfare spending in 2029-30"],
      ["October 2026 forecast", 207.03, -2.82],
    ].forEach((row) => sheet.addRow(row));
    const events = [{ name: "Budget 2025", date: "2025-11-26" }, { name: "Budget 2026", date: "2026-10-28" }];
    const parsed = await parseHeadroomWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), events);
    expect(parsed.rows).toEqual([
      { eventDate: "2025-11-26", rule: "Current budget", headroomBn: 21.7 },
      { eventDate: "2026-10-28", rule: "Current budget", headroomBn: 14.5 },
      { eventDate: "2026-10-28", rule: "Net financial debt", headroomBn: 24.4 },
    ]);
    expect(parsed.asOf).toBe("2026-10-28");
  });
});

describe("withSeedEvents", () => {
  it("prefers the registry and keeps newly discovered events", async () => {
    const { loadSeedEvents, withSeedEvents } = await import("@/lib/budgets/seed");
    const seed = loadSeedEvents();
    const stale = { ...seed.find((event) => event.slug === "2022-09-growth-plan")!, name: "Growth Plan" };
    const found = { ...seed[0]!, slug: "2027-03-budget", date: "2027-03-10", govukPath: "/government/publications/budget-2027" };
    const merged = withSeedEvents([stale, found]);
    expect(merged.find((event) => event.slug === "2022-09-growth-plan")?.name).toBe("Growth Plan 2022");
    expect(merged.some((event) => event.slug === "2026-10-budget")).toBe(true);
    expect(merged.at(-1)?.slug).toBe("2027-03-budget");
  });

  it("keeps the ingest's date mismatch when the registered date is unchanged", async () => {
    const { loadSeedEvents, withSeedEvents } = await import("@/lib/budgets/seed");
    const base = loadSeedEvents().find((event) => event.slug === "2022-09-growth-plan")!;
    const checked = { ...base, dateStatus: "mismatch" as const, observedDate: "2022-09-24" };
    const merged = withSeedEvents([checked]).find((event) => event.slug === base.slug)!;
    expect(merged.dateStatus).toBe("mismatch");
    expect(merged.observedDate).toBe("2022-09-24");
    const moved = withSeedEvents([{ ...checked, date: "2022-09-01" }]).find((event) => event.slug === base.slug)!;
    expect(moved.dateStatus).toBe(base.dateStatus);
  });
});
