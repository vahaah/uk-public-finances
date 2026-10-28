import { readXlsx, type Cell, type Grid } from "@/lib/sheets";

/**
 * Blob paths for the manual OBR uploads. obr.uk blocks automated downloads.
 * Upload the publisher's workbook to the path named here, then run the daily cron.
 *
 * Sign of a policy measure, following the OBR policy measures database: a positive
 * number is an Exchequer yield and a negative number is an Exchequer cost.
 * Forecast error stored on this site is outturn minus forecast, which is separate.
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

export async function parseHistoricalForecasts(buffer: Buffer): Promise<{ asOf: string | null; vintages: ForecastVintage[] }> {
  const sheets = await readXlsx(buffer, 160);
  const vintages: ForecastVintage[] = [];
  for (const [name, grid] of Object.entries(sheets)) {
    const series = seriesId(name);
    if (!series) continue;
    vintages.push(...parseVintageSheet(grid, series));
  }
  if (vintages.length === 0) {
    throw new Error("Historical forecasts workbook has no PSNB, receipts, TME or PSND sheet with financial years and dated columns");
  }
  const asOf = vintages.map((vintage) => vintage.date).sort().at(-1) ?? null;
  return { asOf, vintages };
}

export async function parseMeasuresWorkbook(buffer: Buffer): Promise<{ asOf: string | null; rows: MeasureRow[] }> {
  const sheets = await readXlsx(buffer, 80);
  const rows: MeasureRow[] = [];
  for (const grid of Object.values(sheets)) {
    const header = findHeader(grid, (cells) => cells.some((cell) => /measure/i.test(String(cell ?? ""))));
    if (!header) continue;
    const nameCol = header.cells.findIndex((cell) => /measure/i.test(String(cell ?? "")));
    const dateCol = header.cells.findIndex((cell) => /date|event|budget/i.test(String(cell ?? "")));
    const categoryCol = header.cells.findIndex((cell) => /category|tax|spend/i.test(String(cell ?? "")));
    const yearCols = header.cells
      .map((cell, index) => ({ index, fy: fiscalYearLabel(cell) }))
      .filter((column): column is { index: number; fy: string } => column.fy != null);
    const year3 = yearCols[2] ?? yearCols[0];
    for (const row of grid.slice(header.index + 1)) {
      const name = text(row[nameCol]);
      if (!name) continue;
      rows.push({
        eventDate: dateCol >= 0 ? parseLooseDate(row[dateCol])?.date ?? null : null,
        name,
        category: categoryCol >= 0 ? text(row[categoryCol]) || "other" : "other",
        year3: year3 ? numberCell(row[year3.index]) : null,
      });
    }
  }
  if (rows.length === 0) throw new Error("Policy measures workbook has no measure column");
  return { asOf: rows.map((row) => row.eventDate).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null, rows };
}

export async function parseEvaluationWorkbook(buffer: Buffer): Promise<{ asOf: string | null; rows: EvaluationRow[] }> {
  const sheets = await readXlsx(buffer, 40);
  const rows: EvaluationRow[] = [];
  for (const grid of Object.values(sheets)) {
    const header = findHeader(grid, (cells) => cells.some((cell) => /policy/i.test(String(cell ?? ""))) && cells.some((cell) => /economy/i.test(String(cell ?? ""))));
    if (!header) continue;
    const index = (pattern: RegExp) => header.cells.findIndex((cell) => pattern.test(String(cell ?? "")));
    const policy = index(/policy/i);
    const economy = index(/economy/i);
    const other = index(/other|residual/i);
    const fyCol = index(/year/i);
    const dateCol = index(/date|event/i);
    const seriesCol = index(/series|variable/i);
    for (const row of grid.slice(header.index + 1)) {
      const fy = fiscalYearLabel(row[fyCol]);
      if (!fy) continue;
      rows.push({
        eventDate: dateCol >= 0 ? parseLooseDate(row[dateCol])?.date ?? null : null,
        fy,
        series: seriesCol >= 0 ? text(row[seriesCol]) || "psnb" : "psnb",
        policy: numberCell(row[policy]),
        economy: numberCell(row[economy]),
        other: other >= 0 ? numberCell(row[other]) : null,
      });
    }
  }
  if (rows.length === 0) throw new Error("Forecast evaluation workbook has no policy and economy columns");
  return { asOf: null, rows };
}

export async function parseHeadroomWorkbook(buffer: Buffer): Promise<{ asOf: string | null; rows: HeadroomRow[] }> {
  const sheets = await readXlsx(buffer, 20);
  const rows: HeadroomRow[] = [];
  for (const grid of Object.values(sheets)) {
    const header = findHeader(grid, (cells) => cells.some((cell) => /headroom/i.test(String(cell ?? ""))));
    if (!header) continue;
    const index = (pattern: RegExp) => header.cells.findIndex((cell) => pattern.test(String(cell ?? "")));
    const headroom = index(/headroom/i);
    const rule = index(/rule/i);
    const dateCol = index(/date|event/i);
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
  if (rows.length === 0) throw new Error("Fiscal rules workbook has no headroom column");
  return { asOf: rows.map((row) => row.eventDate).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null, rows };
}

function parseVintageSheet(grid: Grid, series: ForecastSeriesId): ForecastVintage[] {
  const header = grid.slice(0, 20).find((row) => row.some((cell) => parseLooseDate(cell)));
  if (!header) return [];
  const columns = header
    .map((cell, index) => ({ index, parsed: parseLooseDate(cell) }))
    .filter((column): column is { index: number; parsed: NonNullable<ReturnType<typeof parseLooseDate>> } => column.index > 0 && column.parsed != null);
  const vintages = new Map<string, ForecastVintage>();
  for (const row of grid) {
    const fy = fiscalYearLabel(row[0]);
    if (!fy) continue;
    for (const column of columns) {
      const value = numberCell(row[column.index]);
      if (value == null) continue;
      const key = `${column.parsed.date}:${column.parsed.precision}`;
      const vintage = vintages.get(key) ?? { date: column.parsed.date, precision: column.parsed.precision, series, points: [] };
      vintage.points.push({ fy, value });
      vintages.set(key, vintage);
    }
  }
  return [...vintages.values()];
}

function seriesId(name: string): ForecastSeriesId | null {
  const label = name.toLowerCase();
  if (/receipt/.test(label)) return "receipts";
  if (/psnd/.test(label) && /%|gdp|percent/.test(label)) return "psnd_pct";
  if (/\btme\b|total managed/.test(label)) return "tme";
  if (/psnb/.test(label) && !/%|gdp|percent/.test(label)) return "psnb";
  return null;
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
