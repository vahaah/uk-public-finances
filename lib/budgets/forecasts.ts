import { financialYearOf } from "@/lib/budgets/events";
import { readXlsx, type Cell, type Grid } from "@/lib/sheets";

/**
 * Blob paths for the manual OBR uploads. obr.uk blocks automated downloads.
 * Upload the publisher's workbook to the path named here, then run the daily cron.
 *
 * OBR policy measures database sign: a positive number raises money for the Exchequer
 * (a yield) and a negative number costs money (a cost to the Exchequer). Values are £ million.
 * The stored forecast difference is separate: outturn minus forecast.
 *
 * manual/obr/efo-fiscal-rules.xlsx is optional. The March 2026 forecast has no fiscal
 * rules table. A missing file, or a workbook with no headroom column, returns no rows.
 */
export const OBR_BLOB = {
  historical: "manual/obr/historical-official-forecasts.xlsx",
  measures: "manual/obr/policy-measures.xlsx",
  evaluation: "manual/obr/forecast-evaluation.xlsx",
  headroom: "manual/obr/efo-fiscal-rules.xlsx",
} as const;

export type ForecastSeriesId = "psnb" | "receipts" | "tme" | "psnd_pct";

export type ForecastVintage = {
  date: string;
  precision: "day" | "month";
  series: ForecastSeriesId;
  points: { fy: string; value: number }[];
};

export type MeasureRow = {
  eventDate: string | null;
  name: string;
  category: string;
  year3: number | null;
};

export type EvaluationRow = {
  eventDate: string | null;
  fy: string;
  series: string;
  policy: number | null;
  economy: number | null;
  other: number | null;
};

export type HeadroomRow = {
  eventDate: string | null;
  rule: string;
  headroomBn: number | null;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

const HISTORICAL_SHEETS: Record<string, ForecastSeriesId> = {
  "£PSNB": "psnb",
  "£PSCR": "receipts",
  "£TME": "tme",
  PSND: "psnd_pct",
};

const MEASURE_SHEETS = new Set(["Tax Measures", "Spending Measures"]);

/**
 * OBR measure labels that do not match a registry name. "#2" is the second
 * Budget of that calendar year: June 2010 and July 2015.
 * "Autumn 2010" is the November 2010 outlook, the only autumn 2010 event in the registry.
 */
const MEASURE_NAME_ALIASES: Record<string, string> = {
  "Budget 2010 #2": "Emergency Budget",
  "Autumn 2010": "Economic and fiscal outlook",
  "Autumn 2011": "Autumn Statement 2011",
  "Autumn 2012": "Autumn Statement 2012",
  "Autumn 2013": "Autumn Statement 2013",
  "Autumn 2014": "Autumn Statement 2014",
  "Budget 2015 #2": "Summer Budget 2015",
  "Autumn 2015": "Spending Review and Autumn Statement 2015",
  "Autumn 2016": "Autumn Statement 2016",
  "Budget 2017": "Spring Budget 2017",
  "Spring Budget 2021": "Budget 2021",
  "Autumn Budget 2021": "Autumn Budget and Spending Review 2021",
  "Autumn Budget 2025": "Budget 2025",
};

const EVALUATION_SHEETS = new Set(["T3.6", "T3.7"]);

export type MeasureEvent = { name: string; date: string };

export function measureEventDate(label: string, events: MeasureEvent[]): string | null {
  const trimmed = label.trim();
  const canonical = MEASURE_NAME_ALIASES[trimmed] ?? trimmed;
  const matches = events.filter((event) => event.name === canonical);
  if (matches.length !== 1) return null;
  return matches[0]?.date ?? null;
}

export async function parseHistoricalForecasts(buffer: Buffer): Promise<{ asOf: string | null; vintages: ForecastVintage[] }> {
  const sheets = await readXlsx(buffer, 160);
  const vintages: ForecastVintage[] = [];
  for (const [name, grid] of Object.entries(sheets)) {
    if (name.endsWith(" (2)")) continue;
    const series = HISTORICAL_SHEETS[name];
    if (!series) continue;
    vintages.push(...parseVintageSheet(grid, series));
  }
  if (vintages.length === 0) {
    throw new Error("Historical forecasts workbook has no £PSNB, £PSCR, £TME or PSND sheet");
  }
  const asOf = vintages.map((vintage) => vintage.date).sort().at(-1) ?? null;
  return { asOf, vintages };
}

export async function parseMeasuresWorkbook(buffer: Buffer, events: MeasureEvent[] = []): Promise<{ asOf: string | null; rows: MeasureRow[] }> {
  const sheets = await readXlsx(buffer, 80);
  const rows: MeasureRow[] = [];
  for (const [name, grid] of Object.entries(sheets)) {
    if (!MEASURE_SHEETS.has(name)) continue;
    const header = grid[2];
    if (!header || !header.some((cell) => text(cell) === "Measure description")) continue;
    const nameCol = header.findIndex((cell) => text(cell) === "Measure description");
    const eventCol = header.findIndex((cell) => text(cell) === "Event");
    const categoryCol = header.findIndex((cell) => /tax head|spending head/i.test(text(cell)));
    const yearCols = header
      .map((cell, index) => ({ index, fy: fiscalYearLabel(cell) }))
      .filter((column): column is { index: number; fy: string } => column.fy != null);
    for (const row of grid.slice(3)) {
      const measure = text(row[nameCol]);
      if (!measure) continue;
      const eventLabel = eventCol >= 0 ? text(row[eventCol]) : "";
      const eventDate = eventLabel ? measureEventDate(eventLabel, events) : null;
      const target = eventDate ? fiscalYearPlus(financialYearOf(eventDate), 2) : null;
      const yearColumn = target ? yearCols.find((column) => column.fy === target) : undefined;
      rows.push({
        eventDate,
        name: measure,
        category: categoryCol >= 0 ? text(row[categoryCol]) || "other" : "other",
        year3: yearColumn ? numberCell(row[yearColumn.index]) : null,
      });
    }
  }
  if (rows.length === 0) throw new Error("Policy measures workbook has no Tax Measures or Spending Measures sheet");
  return { asOf: rows.map((row) => row.eventDate).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null, rows };
}

export async function parseEvaluationWorkbook(buffer: Buffer): Promise<{ asOf: string | null; rows: EvaluationRow[] }> {
  const sheets = await readXlsx(buffer, 40);
  const rows: EvaluationRow[] = [];
  for (const [name, grid] of Object.entries(sheets)) {
    if (!EVALUATION_SHEETS.has(name)) continue;
    rows.push(...parseEvaluationSheet(grid));
  }
  if (rows.length === 0) throw new Error("Forecast evaluation workbook has no T3.6 or T3.7 table");
  const asOf = rows.map((row) => row.eventDate).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  return { asOf, rows };
}

export async function parseHeadroomWorkbook(buffer: Buffer): Promise<{ asOf: string | null; rows: HeadroomRow[] }> {
  const sheets = await readXlsx(buffer, 20);
  const rows: HeadroomRow[] = [];
  for (const grid of Object.values(sheets)) {
    const header = findHeader(grid, (cells) => cells.some((cell) => /headroom/i.test(text(cell))));
    if (!header) continue;
    const index = (pattern: RegExp) => header.cells.findIndex((cell) => pattern.test(text(cell)));
    const headroom = index(/headroom/i);
    const rule = index(/rule/i);
    const dateCol = index(/date|event/i);
    if (headroom < 0) continue;
    for (const row of grid.slice(header.index + 1)) {
      const ruleName = rule >= 0 ? text(row[rule]) : "";
      if (!ruleName) continue;
      rows.push({
        eventDate: dateCol >= 0 ? parseLooseDate(row[dateCol])?.date ?? null : null,
        rule: ruleName,
        headroomBn: numberCell(row[headroom]),
      });
    }
  }
  const asOf = rows.map((row) => row.eventDate).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  return { asOf, rows };
}

function parseVintageSheet(grid: Grid, series: ForecastSeriesId): ForecastVintage[] {
  const headerIndex = grid.findIndex((row) => text(row[0]).toLowerCase() === "back to contents");
  const header = grid[headerIndex];
  if (!header) return [];
  const years = header
    .map((cell, index) => ({ index, fy: fiscalYearLabel(cell) }))
    .filter((column): column is { index: number; fy: string } => column.index > 0 && column.fy != null);
  const vintages: ForecastVintage[] = [];
  for (const row of grid.slice(headerIndex + 1)) {
    const parsed = parseLooseDate(row[0]);
    if (!parsed) continue;
    const points: { fy: string; value: number }[] = [];
    for (const column of years) {
      const value = numberCell(row[column.index]);
      if (value == null) continue;
      points.push({ fy: column.fy, value });
    }
    if (points.length === 0) continue;
    vintages.push({ date: parsed.date, precision: parsed.precision, series, points });
  }
  return vintages;
}

function parseEvaluationSheet(grid: Grid): EvaluationRow[] {
  const fy = subjectYear(grid);
  if (!fy) return [];
  const rows: EvaluationRow[] = [];
  let columns: { economy: number; policy: number; other: number } | null = null;
  let series: string | null = null;
  for (let index = 0; index < grid.length; index += 1) {
    const row = grid[index];
    const next = grid[index + 1];
    if (row && next && isForecastHeader(row, next)) {
      const labels = mergeHeader(row, next);
      columns = labels.some((label) => /economic/i.test(label))
        ? {
            economy: labels.findIndex((label) => /economic/i.test(label)),
            policy: labels.findIndex((label) => /policy/i.test(label)),
            other: labels.findIndex((label) => /fiscal forecasting/i.test(label)),
          }
        : null;
      index += 1;
      continue;
    }
    const label = text(row?.[1]);
    if (!label || !row) continue;
    const vintage = parseLooseDate(label);
    if (!vintage) {
      const title = seriesTitle(label);
      if (title) series = title;
      continue;
    }
    if (!series || !columns || columns.economy < 0 || columns.policy < 0) continue;
    rows.push({
      eventDate: vintage.date,
      fy,
      series,
      policy: numberCell(row[columns.policy]),
      economy: numberCell(row[columns.economy]),
      other: columns.other >= 0 ? numberCell(row[columns.other]) : null,
    });
  }
  return rows;
}

function isForecastHeader(top: Cell[], sub: Cell[]): boolean {
  const topText = top.map((cell) => text(cell)).join(" ");
  const subText = sub.map((cell) => text(cell)).join(" ");
  return /forecast/i.test(topText) && /forecast/i.test(subText);
}

function mergeHeader(top: Cell[], sub: Cell[]): string[] {
  const width = Math.max(top.length, sub.length);
  const labels: string[] = [];
  for (let index = 0; index < width; index += 1) {
    const upper = text(top[index]);
    const lower = text(sub[index]);
    if (!lower) labels.push(upper);
    else if (!upper || upper.toLowerCase() === lower.toLowerCase()) labels.push(lower);
    else labels.push(`${upper} ${lower}`);
  }
  return labels;
}

function subjectYear(grid: Grid): string | null {
  for (const row of grid) {
    for (const cell of row) {
      const match = /for\s+(\d{4}-\d{2})/i.exec(text(cell));
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

function seriesTitle(label: string): string | null {
  if (/^(table |note:|source:|£ )/i.test(label)) return null;
  if (/^\d/.test(label)) return null;
  const cleaned = label.replace(/([A-Za-z])\d+$/, "$1").trim();
  return cleaned || null;
}

export function fiscalYearPlus(fy: string, years: number): string | null {
  const start = Number(fy.slice(0, 4));
  if (!Number.isFinite(start)) return null;
  const next = start + years;
  return `${next}-${String(next + 1).slice(2)}`;
}

function findHeader(grid: Grid, test: (cells: Cell[]) => boolean): { index: number; cells: Cell[] } | null {
  const index = grid.findIndex((row) => test(row));
  const cells = grid[index];
  if (index < 0 || !cells) return null;
  return { index, cells };
}

export function parseLooseDate(cell: Cell): { date: string; precision: "day" | "month" } | null {
  if (cell == null) return null;
  const textValue = String(cell).trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(textValue);
  if (iso?.[1]) return { date: iso[1], precision: "day" };
  const named = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(textValue);
  if (named?.[1] && named[2] && named[3]) {
    const month = monthNumber(named[2]);
    if (!month) return null;
    return { date: `${named[3]}-${month}-${named[1].padStart(2, "0")}`, precision: "day" };
  }
  const monthYear = /^([A-Za-z]+)[\s-]+(\d{2}|\d{4})$/.exec(textValue);
  if (monthYear?.[1] && monthYear[2]) {
    const month = monthNumber(monthYear[1]);
    if (!month) return null;
    const year = monthYear[2].length === 2 ? expandYear(Number(monthYear[2])) : Number(monthYear[2]);
    return { date: `${year}-${month}-01`, precision: "month" };
  }
  return null;
}

function fiscalYearLabel(cell: Cell): string | null {
  const match = /^(\d{4})\s*[-\/]\s*(\d{2}|\d{4})$/.exec(String(cell ?? "").trim());
  if (!match?.[1] || !match[2]) return null;
  const end = match[2].length === 4 ? match[2].slice(2) : match[2];
  return `${match[1]}-${end}`;
}

function numberCell(cell: Cell): number | null {
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  if (typeof cell !== "string") return null;
  const cleaned = cell.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "–") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function text(cell: Cell | undefined): string {
  return cell == null ? "" : String(cell).trim();
}

function monthNumber(name: string): string | null {
  const index = MONTHS.indexOf(name.slice(0, 3).toLowerCase() as (typeof MONTHS)[number]);
  if (index < 0) return null;
  return String(index + 1).padStart(2, "0");
}

function expandYear(year: number): number {
  return year >= 70 ? 1900 + year : 2000 + year;
}
