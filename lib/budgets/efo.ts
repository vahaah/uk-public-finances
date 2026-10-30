import type { Cell, Grid } from "@/lib/sheets";

/**
 * Charts and tables from the latest OBR Economic and fiscal outlook and the latest
 * Forecast evaluation report. obr.uk blocks automated downloads, so the workbooks are
 * uploaded by hand to Blob under manual/obr/efo/ (any file names). Sheets are found by
 * chart title, not by sheet number, so a new EFO with renumbered charts still loads.
 * Values are as published by the OBR: per cent, per cent of GDP, or £ billion.
 */
export const EFO_BLOB_PREFIX = "manual/obr/efo/";

export type ComparePoint = { period: string; current: number | null; previous: number | null };
export type Compare = { currentLabel: string; previousLabel: string; points: ComparePoint[] };
export type LinePoint = { period: string; value: number };

export type EfoData = {
  /** For example "October 2026". */
  currentLabel: string | null;
  previousLabel: string | null;
  gdp: Compare | null;
  cpi: Compare | null;
  rhdiGrowth: Compare | null;
  rhdiRolling: LinePoint[];
  psnb: Compare | null;
  psnfl: (Compare & { outturn: LinePoint[] }) | null;
  taxBurden: (Compare & { outturn: LinePoint[] }) | null;
  debtInterest: Compare | null;
  policy: { period: string; total: number | null; currentSpending: number | null; capitalSpending: number | null; receipts: number | null }[];
  packages: { event: string; pctGdp: number }[];
  debtVsOutturn: { vintages: string[]; points: { period: string; values: (number | null)[]; outturn: number | null }[] } | null;
  /** What moved the borrowing forecast since the previous one, from the OBR table "PSNB ... changes since". £ billion; positive adds to borrowing. */
  borrowingChanges: BorrowingChange[];
  found: string[];
};

export type BorrowingChange = {
  period: string;
  total: number | null;
  debtInterest: number | null;
  welfare: number | null;
  otherSpending: number | null;
  receipts: number | null;
  policy: number | null;
};

/**
 * Rows of the OBR "changes since" PSNB table, above the current budget deficit block
 * (which repeats "Difference" and "Capital spending"). Spending sub-rows are summed into
 * debt interest, welfare and other spending; receipts is the receipts total; policy is
 * direct plus indirect effects of policy decisions.
 */
export function parseBorrowingChanges(grid: Grid | null): BorrowingChange[] {
  if (!grid) return [];
  let years: { index: number; period: string }[] = [];
  for (const row of grid) {
    const found = row.map((cell, index) => ({ index, period: periodLabel(cell) })).filter((item): item is { index: number; period: string } => item.period != null);
    if (found.length > years.length) years = found;
  }
  const rows: [string, Cell[]][] = [];
  for (const row of grid) {
    const label = text(row[1]).replace(/\s+/g, " ").replace(/\d+$/, "").trim();
    if (/^(Table|Chart) /.test(label)) continue;
    if (/current budget deficit/i.test(label)) break;
    if (label) rows.push([label, row]);
  }
  const first = (pattern: RegExp) => rows.find(([label]) => pattern.test(label))?.[1];
  const total = first(/^Difference$/i);
  const debtInterest = first(/^Debt interest/i);
  const capital = first(/^Capital spending$/i);
  const welfare = first(/^Welfare$/i);
  const other = first(/^Other spending$/i);
  const receipts = first(/^Receipts$/i);
  const direct = first(/^Direct effects of policy/i);
  const indirect = first(/^Indirect effects of policy/i);
  if (!total || !debtInterest || !receipts || !direct) return [];
  const sum = (...cells: (Cell | undefined)[]) => {
    const values = cells.map(num);
    return values.every((value) => value == null) ? null : round(values.reduce<number>((acc, value) => acc + (value ?? 0), 0));
  };
  return years
    .map(({ index, period }) => ({
      period,
      total: round(num(total[index])),
      debtInterest: round(num(debtInterest[index])),
      welfare: round(num(welfare?.[index])),
      otherSpending: sum(capital?.[index], other?.[index]),
      receipts: round(num(receipts[index])),
      policy: sum(direct[index], indirect?.[index]),
    }))
    .filter((point) => point.debtInterest != null && point.receipts != null && point.policy != null);
}

const text = (cell: Cell | undefined) => (cell == null ? "" : String(cell).trim());
const num = (cell: Cell | undefined): number | null => (typeof cell === "number" && Number.isFinite(cell) ? cell : null);
const round = (value: number | null) => (value == null ? null : Number(value.toFixed(3)));

export function periodLabel(cell: Cell | undefined): string | null {
  if (typeof cell === "number" && Number.isInteger(cell) && cell > 1900 && cell < 2100) return String(cell);
  const raw = text(cell);
  if (/^(19|20)\d{2}$/.test(raw)) return raw;
  const match = /^(\d{4})\s*[-/]\s*(\d{2}|\d{4})$/.exec(raw);
  if (!match?.[1] || !match[2]) return null;
  return `${match[1]}-${match[2].length === 4 ? match[2].slice(2) : match[2]}`;
}

function findSheet(sheets: Record<string, Grid>, title: RegExp): Grid | null {
  for (const [name, grid] of Object.entries(sheets)) {
    if (/:(Contents|Chapter \d+|Executive Summary)$/i.test(name)) continue;
    for (const row of grid.slice(0, 4)) {
      if (row.some((cell) => title.test(text(cell)))) return grid;
    }
  }
  return null;
}

const vintageOf = (cell: Cell | undefined) => /^([A-Z][a-z]+ \d{4}) forecast/.exec(text(cell))?.[1] ?? null;

/** Long tables: period down column B, named columns across. */
function longTable(grid: Grid, from = 0): { header: Cell[]; rows: { period: string; row: Cell[] }[] } {
  const rows: { period: string; row: Cell[] }[] = [];
  let header: Cell[] = [];
  for (const row of grid) {
    if (rows.length === 0 && row.some((cell, index) => index >= from && vintageOf(cell))) header = row;
    const period = periodLabel(row[from + 1]);
    if (period) rows.push({ period, row });
  }
  return { header, rows };
}

function compareFromLong(grid: Grid | null, from = 0): Compare | null {
  if (!grid) return null;
  const { header, rows } = longTable(grid, from);
  const columns = header.map((cell, index) => ({ index, label: vintageOf(cell) })).filter((column) => column.index > from && column.label);
  if (columns.length < 2) return null;
  const [a, b] = columns.slice(0, 2) as { index: number; label: string }[];
  const [current, previous] = isLater(a!.label, b!.label) ? [a!, b!] : [b!, a!];
  return {
    currentLabel: current.label,
    previousLabel: previous.label,
    points: rows.map(({ period, row }) => ({ period, current: round(num(row[current.index])), previous: round(num(row[previous.index])) })),
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthKey(label: string): number {
  const [month, year] = label.split(" ");
  return Number(year) * 12 + MONTHS.indexOf(month ?? "");
}
export function isLater(a: string, b: string) {
  return monthKey(a) > monthKey(b);
}

/** Wide tables: years across one header row, named rows down column B. */
function wideTable(grid: Grid): { years: { index: number; period: string }[]; rows: Map<string, Cell[]> } {
  let years: { index: number; period: string }[] = [];
  for (const row of grid) {
    const found = row.map((cell, index) => ({ index, period: periodLabel(cell) })).filter((item): item is { index: number; period: string } => item.period != null);
    if (found.length > years.length) years = found;
  }
  const rows = new Map<string, Cell[]>();
  for (const row of grid) {
    const label = text(row[1]);
    if (label && !periodLabel(row[1])) rows.set(label.replace(/\s+/g, " "), row);
  }
  return { years, rows };
}

function wideCompare(grid: Grid | null, currentRow: RegExp, previousRow: RegExp, outturnRow?: RegExp) {
  if (!grid) return null;
  const { years, rows } = wideTable(grid);
  const pick = (pattern: RegExp) => [...rows.entries()].find(([label]) => pattern.test(label));
  const current = pick(currentRow);
  const previous = pick(previousRow);
  if (!current || !previous) return null;
  const label = (name: string) => /([A-Z][a-z]+ \d{4})/.exec(name)?.[1] ?? name;
  const outturn = outturnRow ? pick(outturnRow) : undefined;
  return {
    currentLabel: label(current[0]),
    previousLabel: label(previous[0]),
    points: years.map(({ index, period }) => ({ period, current: round(num(current[1][index])), previous: round(num(previous[1][index])) })).filter((point) => point.current != null || point.previous != null),
    outturn: outturn ? years.flatMap(({ index, period }) => (num(outturn[1][index]) == null ? [] : [{ period, value: round(num(outturn[1][index]))! }])) : [],
  };
}

export function parseEfoCharts(workbooks: Record<string, Grid>[]): EfoData {
  const sheets: Record<string, Grid> = {};
  workbooks.forEach((book, bookIndex) => {
    for (const [name, grid] of Object.entries(book)) sheets[`${bookIndex}:${name}`] = grid;
  });
  const found: string[] = [];
  const sheet = (id: string, title: RegExp) => {
    const grid = findSheet(sheets, title);
    if (grid) found.push(id);
    return grid;
  };

  const gdp = compareFromLong(sheet("gdp", /^Chart [\d.A-Z]+: Real GDP growth/));
  const cpi = compareFromLong(sheet("cpi", /^Chart [\d.A-Z]+: CPI inflation$/));
  const rhdiGrowth = compareFromLong(sheet("rhdi", /^Chart [\d.A-Z]+: Real household disposable income per person/));

  const rollingGrid = sheet("rhdiRolling", /^Chart [\d.A-Z]+: Rolling 10-year average growth in RHDI per person/);
  const rhdiRolling = rollingGrid ? longTable(rollingGrid).rows.flatMap(({ period, row }) => (num(row[2]) == null ? [] : [{ period, value: round(num(row[2]))! }])) : [];

  const psnbWide = wideCompare(sheet("psnb", /^Table [\d.A-Z]+: Public sector net borrowing and the current budget deficit: changes since/), /^[A-Z][a-z]+ \d{4} PSNB$/, /^[A-Z][a-z]+ \d{4} PSNB$/);
  let psnb: Compare | null = null;
  const psnbGrid = findSheet(sheets, /^Table [\d.A-Z]+: Public sector net borrowing and the current budget deficit: changes since/);
  if (psnbGrid) {
    const { years, rows } = wideTable(psnbGrid);
    const labelled = [...rows.entries()].filter(([label]) => /^[A-Z][a-z]+ \d{4} PSNB$/.test(label)).map(([label, row]) => ({ label: label.replace(/ PSNB$/, ""), row }));
    if (labelled.length >= 2) {
      labelled.sort((a, b) => monthKey(b.label) - monthKey(a.label));
      const [current, previous] = labelled as [{ label: string; row: Cell[] }, { label: string; row: Cell[] }];
      psnb = {
        currentLabel: current.label,
        previousLabel: previous.label,
        points: years.map(({ index, period }) => ({ period, current: round(num(current.row[index])), previous: round(num(previous.row[index])) })).filter((point) => point.current != null || point.previous != null),
      };
    }
  }
  void psnbWide;
  const borrowingChanges = parseBorrowingChanges(psnbGrid);

  const psnfl = wideCompare(sheet("psnfl", /^Chart [\d.A-Z]+: Public sector net financial liabilities$/), /^[A-Z][a-z]+ \d{4} forecast$/, /^[A-Z][a-z]+ \d{4} forecast$/, /^Outturn$/);
  let psnflOrdered = psnfl;
  if (psnfl) {
    const grid = findSheet(sheets, /^Chart [\d.A-Z]+: Public sector net financial liabilities$/)!;
    const { years, rows } = wideTable(grid);
    const labelled = [...rows.entries()].filter(([label]) => /^[A-Z][a-z]+ \d{4} forecast$/.test(label)).map(([label, row]) => ({ label: label.replace(/ forecast$/, ""), row }));
    labelled.sort((a, b) => monthKey(b.label) - monthKey(a.label));
    const [current, previous] = labelled;
    if (current && previous) {
      psnflOrdered = {
        currentLabel: current.label,
        previousLabel: previous.label,
        points: years.map(({ index, period }) => ({ period, current: round(num(current.row[index])), previous: round(num(previous.row[index])) })).filter((point) => point.current != null || point.previous != null),
        outturn: psnfl.outturn,
      };
    }
  }

  const taxGrid = sheet("taxBurden", /^Chart [\d.A-Z]+: National Accounts taxes as a share of GDP/);
  let taxBurden: EfoData["taxBurden"] = null;
  if (taxGrid) {
    const compare = compareFromLong(taxGrid);
    const { header, rows } = longTable(taxGrid);
    const outCol = header.findIndex((cell) => text(cell) === "Outturn");
    if (compare) {
      taxBurden = {
        ...compare,
        outturn: outCol < 0 ? [] : rows.flatMap(({ period, row }) => (num(row[outCol]) == null ? [] : [{ period, value: round(num(row[outCol]))! }])),
      };
    }
  }

  const debtInterest = compareFromLong(sheet("debtInterest", /^Chart [\d.A-Z]+: Debt interest spending relative to GDP/));

  const policyGrid = sheet("policy", /^Chart [\d.A-Z]+: Direct borrowing impact of policy decisions/);
  const policy: EfoData["policy"] = [];
  if (policyGrid) {
    const { years, rows } = wideTable(policyGrid);
    const row = (pattern: RegExp) => [...rows.entries()].find(([label]) => pattern.test(label))?.[1];
    const total = row(/^Total/i);
    const current = row(/^Current spending/i);
    const capital = row(/^Capital spending/i);
    const receipts = row(/^Receipts/i);
    for (const { index, period } of years) {
      policy.push({
        period,
        total: round(num(total?.[index])),
        currentSpending: round(num(current?.[index])),
        capitalSpending: round(num(capital?.[index])),
        receipts: round(num(receipts?.[index])),
      });
    }
  }

  const packagesGrid = sheet("packages", /^Chart [\d.A-Z]+: Size of fiscal policy packages/);
  const packages = packagesGrid
    ? packagesGrid.flatMap((row) => (/^[A-Z][a-z]+ \d{4}$/.test(text(row[1])) && num(row[2]) != null ? [{ event: text(row[1]), pctGdp: round(num(row[2]))! }] : []))
    : [];

  const evalGrid = sheet("debtVsOutturn", /^Chart [\d.A-Z]+: Debt as a share of GDP$/);
  let debtVsOutturn: EfoData["debtVsOutturn"] = null;
  if (evalGrid) {
    const headerIndex = evalGrid.findIndex((row) => text(row[1]) === "Year");
    const header = evalGrid[headerIndex] ?? [];
    const end = header.findIndex((cell, index) => index > 1 && cell == null);
    const columns = header.slice(2, end < 0 ? undefined : end).map(text);
    const outIndex = columns.indexOf("Outturn");
    const vintageColumns = columns.map((label, index) => ({ label: label.replace(/ forecast$/, ""), index: index + 2 })).filter((column) => column.label !== "Outturn");
    debtVsOutturn = {
      vintages: vintageColumns.map((column) => column.label),
      points: evalGrid.slice(headerIndex + 1).flatMap((row) => {
        const period = periodLabel(row[1]);
        if (!period) return [];
        return [{ period, values: vintageColumns.map((column) => round(num(row[column.index]))), outturn: outIndex < 0 ? null : round(num(row[outIndex + 2])) }];
      }),
    };
  }

  const labels = [gdp, cpi, psnb, psnflOrdered, taxBurden].find((item) => item?.currentLabel);
  return {
    currentLabel: labels?.currentLabel ?? null,
    previousLabel: labels?.previousLabel ?? null,
    gdp,
    cpi,
    rhdiGrowth,
    rhdiRolling,
    psnb,
    psnfl: psnflOrdered,
    taxBurden,
    debtInterest,
    policy,
    packages,
    debtVsOutturn,
    borrowingChanges,
    found,
  };
}

/**
 * The historical forecasts database lags the EFO by months. Until it catches up, the
 * EFO's own "this forecast" columns stand in as the event's vintage. A vintage already in
 * the database for that event wins.
 */
export function efoVintages(
  efo: EfoData,
  eventDate: string,
  existing: { date: string; series: string }[],
): { date: string; precision: "day"; series: "gdp" | "cpi" | "psnb" | "psnfl_pct"; points: { fy: string; value: number }[] }[] {
  const has = (series: string) => existing.some((vintage) => vintage.series === series && vintage.date.slice(0, 7) === eventDate.slice(0, 7));
  const out: ReturnType<typeof efoVintages> = [];
  const add = (series: "gdp" | "cpi" | "psnb" | "psnfl_pct", compare: Compare | null) => {
    if (!compare || has(series)) return;
    const points = compare.points.flatMap((point) => (point.current == null ? [] : [{ fy: point.period, value: point.current }]));
    if (points.length > 0) out.push({ date: eventDate, precision: "day", series, points });
  };
  add("gdp", efo.gdp);
  add("cpi", efo.cpi);
  add("psnb", efo.psnb);
  add("psnfl_pct", efo.psnfl);
  return out;
}
