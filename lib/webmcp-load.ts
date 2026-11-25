import { commandIndex } from "@/lib/command-index";
import { eventLabel } from "@/lib/budgets/events";
import { loadYearAhead } from "@/lib/budgets/year-ahead";
import { latestBudgetEvent } from "@/lib/nav-event";
import { storyEvents } from "@/lib/story";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { billions, budgetEvent, latestFigures, resolveChart, searchSite, tail, type ChartPayload, type ChartPoint, type ChartRef } from "@/lib/webmcp";

export async function loadLatestFigures() {
  const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
  return latestFigures({
    period: ons?.data.series.j5ii?.latest?.period ?? null,
    releaseDate: ons?.releaseDate ?? null,
    receiptsMillions: ons?.data.series.jw2o?.latest?.value ?? null,
    spendingMillions: ons?.data.series.kx5q?.latest?.value ?? null,
    borrowingMillions: ons?.data.bulletinSign.borrowingLatest ?? null,
    debtMillions: ons?.data.series.kse6?.latest?.value ?? null,
    debtShareOfGdp: ons?.data.series.hf6x?.latest?.value ?? null,
    financialYear: ons?.data.financialYear?.year ?? null,
    financialYearBorrowingMillions: ons?.data.bulletinSign.financialYearBorrowing ?? null,
  });
}

export async function loadSearch(query: string) {
  return searchSite(await commandIndex(), query.slice(0, 80));
}

export async function loadBudgetEvent() {
  const event = latestBudgetEvent(await storyEvents());
  if (!event) return null;
  const { borrowing } = await loadYearAhead(event);
  return budgetEvent({
    label: eventLabel(event),
    slug: event.slug,
    date: event.date,
    fy: borrowing?.fy ?? null,
    forecastBn: borrowing?.forecast ?? null,
  });
}

export async function loadChart(id: string, path?: string | null): Promise<ChartPayload | { error: string; matches: ChartRef[] }> {
  const resolved = resolveChart({ id, path });
  if ("error" in resolved) return resolved;
  const chart = await chartById(resolved);
  return chart ?? { error: "Unknown chart.", matches: [resolved] };
}

async function chartById(ref: ChartRef): Promise<ChartPayload | null> {
  const { id, path } = ref;
  if (id === "borrowing-by-month") {
    const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
    const points = tail(ons?.data.series.j5ii?.months ?? []).map((point) => ({ period: point.period, value: billions(point.value, true) }));
    return seriesChart(id, "Public sector net borrowing by month", "£ billion. Positive is borrowing.", "Office for National Statistics", "J5II", [{ name: "Borrowing", points }]);
  }
  if (id === "so-far" && path === "/borrowing") {
    const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
    const months = ons?.data.financialYear?.months ?? [];
    return seriesChart(id, "Borrowing so far this financial year", "£ billion, running total. Positive is borrowing.", "Office for National Statistics", "J5II", [
      { name: ons?.data.financialYear?.year ?? "This year", points: months.map((point) => ({ period: point.period, value: billions(point.cumulative, true) })) },
      { name: "A year earlier", points: months.flatMap((point) => (point.previousCumulative == null ? [] : [{ period: point.period, value: billions(point.previousCumulative, true) }])) },
    ]);
  }
  if (id === "ratio" && path === "/debt") {
    const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
    const points = tail(ons?.data.series.hf6x?.months ?? []).map((point) => ({ period: point.period, value: Number(point.value.toFixed(1)) }));
    return seriesChart(id, "Public sector net debt as a share of GDP", "Percent of GDP", "Office for National Statistics", "HF6X", [{ name: "Net debt", points }]);
  }
  if (id === "receipts-by-month") {
    const hmrc = takeSnapshot("hmrc-receipts", (await readSnapshot("hmrc-receipts")).snapshot);
    const points = tail(hmrc?.data.monthly ?? []).map((row) => ({ period: row.period, value: billions(row.total) }));
    return seriesChart(id, "Total HMRC receipts by month", "£ billion", "HM Revenue & Customs", "HMRC monthly receipts", [{ name: "HMRC receipts", points }]);
  }
  if (id === "by-tax" && path === "/receipts") {
    const hmrc = takeSnapshot("hmrc-receipts", (await readSnapshot("hmrc-receipts")).snapshot);
    const annual = hmrc?.data.annual;
    const points = (annual?.taxes ?? [])
      .slice()
      .sort((left, right) => right.value - left.value)
      .slice(0, 10)
      .map((tax) => ({ period: tax.name, value: billions(tax.value) }));
    return seriesChart(id, annual ? `Receipts by tax, ${annual.year}` : "Receipts by tax", "£ billion", "HM Revenue & Customs", "HMRC tax receipts", [{ name: "Receipts", points }]);
  }
  if (id === "by-year" && path === "/receipts") {
    const hmrc = takeSnapshot("hmrc-receipts", (await readSnapshot("hmrc-receipts")).snapshot);
    const points = tail(hmrc?.data.annualHistory ?? []).map((row) => ({ period: row.year, value: billions(row.total) }));
    return seriesChart(id, "HMRC receipts by year", "£ billion", "HM Revenue & Customs", "HMRC tax receipts", [{ name: "Total receipts", points }]);
  }
  if (id === "by-function" && path === "/spending") {
    const pesa = takeSnapshot("pesa", (await readSnapshot("pesa")).snapshot);
    const functions = pesa?.data.functions;
    const points = (functions?.items ?? []).map((item) => ({ period: item.name, value: Number(item.value.toFixed(1)) }));
    return seriesChart(id, functions ? `Spending on services by function, ${functions.year}` : "Spending by function", "£ billion", "HM Treasury", "PESA table 4.2", [{ name: "Spending on services", points }]);
  }
  if (id === "yields" && path === "/debt") {
    const boe = takeSnapshot("boe-yields", (await readSnapshot("boe-yields")).snapshot);
    const bank = tail(boe?.data.series.IUDBEDR.points ?? [], 12).map((point) => ({ period: point.date, value: Number(point.value.toFixed(2)) }));
    const gilt = tail(boe?.data.series.IUDMNPY.points ?? [], 12).map((point) => ({ period: point.date, value: Number(point.value.toFixed(2)) }));
    return seriesChart(id, "Bank Rate and the 10-year gilt yield", "Percent", "Bank of England", "IUDBEDR and IUDMNPY", [
      { name: "Bank Rate", points: bank },
      { name: "10-year gilt yield", points: gilt },
    ]);
  }
  return null;
}

function seriesChart(id: string, title: string, unit: string, publisher: string, series: string, rows: { name: string; points: ChartPoint[] }[]): ChartPayload {
  return { id, title, unit, source: { publisher, series }, series: rows };
}
