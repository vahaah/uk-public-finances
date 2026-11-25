import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { allowAgentStep } from "@/lib/agent-allow";
import { mountAgent } from "@/lib/agent-mount";
import { loadChart, loadLatestFigures } from "@/lib/webmcp-load";
import { CHARTS, budgetEvent, latestFigures, resolveChart, searchSite, webmcpTools } from "@/lib/webmcp";
import type { CommandItem } from "@/lib/command-match";

const items: CommandItem[] = [
  { kind: "figure", label: "In September 2026 the public sector borrowed £24.5bn.", href: "/", hint: "Overview" },
  { kind: "page", label: "Borrowing", href: "/borrowing", hint: "Section" },
  { kind: "faq", label: "How much is the UK borrowing?", href: "/faq#how-much-is-the-uk-borrowing", hint: "FAQ" },
  { kind: "glossary", label: "Public sector net borrowing (PSNB ex)", href: "/glossary#psnb", hint: "Glossary" },
];

describe("WebMCP tools", () => {
  it("pins closed schemas and read-only annotations", () => {
    expect(webmcpTools.map((tool) => tool.name)).toEqual(["get_latest_figures", "search_site", "get_budget_event", "get_chart_data"]);
    for (const tool of webmcpTools) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.untrustedContentHint).toBe(true);
      expect(JSON.stringify(tool.inputSchema).length).toBeLessThan(800);
    }
  });

  it("formats September 2026 magnitudes and does not negate debt", () => {
    const figures = latestFigures({
      period: "2026-09",
      releaseDate: "2026-10-20T23:00:00.000Z",
      receiptsMillions: 99271,
      spendingMillions: 123791,
      borrowingMillions: 24520,
      debtMillions: 2_900_000,
      debtShareOfGdp: 94,
      financialYear: "2026-27",
      financialYearBorrowingMillions: 97841,
    });
    expect(figures.receipts?.text).toBe("£99.3bn");
    expect(figures.spending?.text).toBe("£123.8bn");
    expect(figures.borrowing?.text).toBe("£24.5bn");
    expect(figures.borrowing?.series).toBe("J5II");
    expect(figures.debt?.text).toBe("£2,900.0bn");
    expect(figures.debtShareOfGdp?.text).toBe("94.0%");
    expect(figures.financialYearBorrowing?.text).toBe("£97.8bn");
    expect(figures.source.publisher).toBe("Office for National Statistics");
  });

  it("reads the committed ONS snapshot for the latest figures", async () => {
    const figures = await loadLatestFigures();
    const snapshot = JSON.parse(readFileSync("fixtures/snapshots/ons-psf.json", "utf8")) as {
      data: { bulletinSign: { borrowingLatest: number }; series: { hf6x: { latest: { value: number } } } };
    };
    expect(figures.borrowing?.millions).toBe(snapshot.data.bulletinSign.borrowingLatest);
    expect(figures.debtShareOfGdp?.percent).toBe(Number(snapshot.data.series.hf6x.latest.value.toFixed(1)));
    expect(figures.debt?.millions).toBeGreaterThan(0);
  });

  it("searches the palette index and caps the list", () => {
    expect(searchSite(items, "").map((item) => item.kind)).toEqual(["figure", "page"]);
    expect(searchSite(items, "borrowing").map((item) => item.href)).toEqual([
      "/borrowing",
      "/faq#how-much-is-the-uk-borrowing",
      "/glossary#psnb",
    ]);
    expect(searchSite(Array.from({ length: 20 }, (_, index) => items[1]!).map((item, index) => ({ ...item, href: `/p-${index}` })), "section").length).toBeLessThanOrEqual(8);
  });

  it("returns a budget headline without inventing a missing forecast", () => {
    const loaded = budgetEvent({ label: "Budget 2026", slug: "budget-2026", date: "2026-03-03", fy: "2026-27", forecastBn: 80.5 });
    expect(loaded.sentence).toBe("At Budget 2026, the OBR forecast borrowing of £80.5bn in 2026-27.");
    expect(loaded.links.explained).toBe("https://budget.vahaah.com/budgets/budget-2026/explained");
    const missing = budgetEvent({ label: "Budget 2026", slug: "budget-2026", date: "2026-03-03", fy: null, forecastBn: null });
    expect(missing.sentence).toBeNull();
    expect(missing.borrowingForecastBillion).toBeNull();
  });

  it("returns official chart series and refuses an unknown id", async () => {
    const borrowing = await loadChart("borrowing-by-month");
    expect("series" in borrowing).toBe(true);
    if (!("series" in borrowing)) return;
    expect(borrowing.unit).toContain("Positive is borrowing");
    expect(borrowing.source.series).toBe("J5II");
    expect(borrowing.series[0]?.points.length).toBeGreaterThan(0);
    expect(borrowing.series[0]?.points.length).toBeLessThanOrEqual(18);
    const unknown = await loadChart("not-a-chart");
    expect(unknown).toEqual({ error: "Unknown chart.", matches: CHARTS });
  });

  it("does not treat a shared chart id as borrowing", async () => {
    expect(resolveChart({ id: "by-month" })).toEqual({
      error: "This chart id is used on more than one page. Pass path.",
      matches: [
        { id: "by-month", path: "/borrowing" },
        { id: "by-month", path: "/receipts" },
      ],
    });
    const receipts = await loadChart("/receipts#by-month");
    expect("series" in receipts).toBe(true);
    if (!("series" in receipts)) return;
    expect(receipts.source.publisher).toBe("HM Revenue & Customs");
    expect(receipts.source.series).toBe("HMRC monthly receipts");
    const borrowing = await loadChart("by-month", "/borrowing");
    expect("series" in borrowing && borrowing.source.series).toBe("J5II");
  });

  it("does nothing when the browser has no model context", () => {
    const cleanup = mountAgent();
    expect(cleanup()).toBeUndefined();
  });

  it("allows navigation and refuses anything else", () => {
    expect(allowAgentStep({ component: "dialog", action: "setOpen", label: "Search" })).toBe(true);
    expect(allowAgentStep({ component: "segmented-control", action: "setValue", label: "Time range" })).toBe(true);
    expect(allowAgentStep({ component: "accordion", action: "open", label: "How much is the UK borrowing?" })).toBe(true);
    expect(allowAgentStep({ component: "link", action: "press", label: "Borrowing" })).toBe(true);
    expect(allowAgentStep({ component: "button", action: "press", label: "Download PNG" })).toBe(false);
    expect(allowAgentStep({ component: "toggle", action: "setPressed", label: "Switch to dark mode" })).toBe(false);
    expect(allowAgentStep({ component: "input", action: "setValue", label: "Amount, £" })).toBe(false);
    expect(allowAgentStep({ component: "dialog", action: "setOpen", label: "Search", confirm: "Copies a link" })).toBe(false);
  });
});
