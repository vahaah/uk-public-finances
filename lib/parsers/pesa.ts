import { parsePublishedNumber } from "@/lib/numbers";
import type { pesaDataSchema } from "@/lib/schema";
import { readXlsx, type Cell, type Grid } from "@/lib/sheets";
import type { z } from "zod";

type PesaData = z.infer<typeof pesaDataSchema>;
type MoneyRow = { name: string; value: number };

export async function parsePesa(chapter4: Buffer, chapter6: Buffer, contentUrl: string): Promise<PesaData> {
  const functionsBook = await readXlsx(chapter4);
  const departmentsBook = await readXlsx(chapter6);
  const functionsSheet = functionsBook["4_2"];
  const departmentSheet = departmentsBook["6_1"];
  if (!functionsSheet || !departmentSheet) {
    throw new Error("PESA chapter 4 sheet 4_2 or chapter 6 sheet 6_1 is missing");
  }
  const functions = parseFunctions(functionsSheet);
  const history = functionHistory(functionsSheet);
  const departments = departmentHistory(departmentSheet);
  const outturn = departments.filter((year) => year.basis === "outturn");
  const plans = departments.filter((year) => year.basis === "plans");
  const latestOutturn = outturn.at(-1);
  const latestPlans = plans.at(-1);
  if (!latestOutturn || !latestPlans) throw new Error("PESA table 6.1 is missing outturn or plans");
  return {
    contentUrl,
    functions,
    departments: {
      year: latestOutturn.year,
      basis: "Central government own expenditure within DEL, outturn",
      unit: "£ million",
      total: latestOutturn.total,
      items: latestOutturn.items,
    },
    departmentPlans: {
      year: latestPlans.year,
      basis: "Central government own expenditure within DEL, plans",
      unit: "£ million",
      total: latestPlans.total,
      items: latestPlans.items,
    },
    functionHistory: history,
    departmentHistory: departments,
  };
}

function parseFunctions(grid: Grid): PesaData["functions"] {
  const history = functionHistory(grid);
  const latest = history.at(-1);
  if (!latest) throw new Error("PESA table 4.2 has no year columns");
  return {
    year: latest.year,
    unit: "£ billion",
    totalServices: latest.totalServices,
    totalManagedExpenditure: latest.totalManagedExpenditure,
    items: latest.items,
  };
}

export function functionHistory(grid: Grid): PesaData["functionHistory"] {
  const located = locateYears(grid);
  const history: PesaData["functionHistory"] = [];
  for (const yearColumn of located.years) {
    const items: MoneyRow[] = [];
    let totalServices: number | null = null;
    let totalManagedExpenditure: number | null = null;
    for (const row of grid.slice(located.dataStart)) {
      const name = cleanLabel(row[located.labelColumn]);
      if (!name) continue;
      const value = parsePublishedNumber(row[yearColumn.column] ?? null);
      if (value == null) continue;
      if (/^public sector expenditure on services/i.test(name)) {
        totalServices = value;
        continue;
      }
      if (/^total managed expenditure/i.test(name)) {
        totalManagedExpenditure = value;
        continue;
      }
      if (!/^\d+\./.test(name)) continue;
      items.push({ name, value });
    }
    if (items.length < 5) continue;
    history.push({
      year: yearColumn.label,
      totalServices,
      totalManagedExpenditure,
      items,
    });
  }
  if (history.length < 1) throw new Error("PESA table 4.2 did not yield function rows");
  return history;
}

function departmentHistory(grid: Grid): PesaData["departmentHistory"] {
  const located = locateYears(grid);
  const history: PesaData["departmentHistory"] = [];
  for (const yearColumn of located.years) {
    const basis = yearColumn.status;
    if (basis !== "outturn" && basis !== "plans") continue;
    const items: MoneyRow[] = [];
    let total: number | null = null;
    let inDel = false;
    for (const row of grid.slice(located.dataStart)) {
      const name = cleanLabel(row[located.labelColumn]);
      if (!name) continue;
      if (/^within del$/i.test(name)) {
        inDel = true;
        continue;
      }
      if (/^total cg own expenditure within del/i.test(name)) {
        total = parsePublishedNumber(row[yearColumn.column] ?? null);
        break;
      }
      if (!inDel) continue;
      const value = parsePublishedNumber(row[yearColumn.column] ?? null);
      if (value == null) continue;
      items.push({ name, value });
    }
    if (items.length < 5) continue;
    history.push({ year: yearColumn.label, basis, total, items });
  }
  if (history.length < 1) throw new Error("PESA table 6.1 did not yield department rows");
  return history;
}

function locateYears(grid: Grid): {
  labelColumn: number;
  dataStart: number;
  years: { column: number; label: string; status: "outturn" | "plans" | null }[];
} {
  let yearRow = -1;
  for (let index = 0; index < grid.length; index += 1) {
    const hits = (grid[index] ?? []).filter((cell) => /^\d{4}-\d{2}$/.test(String(cell ?? ""))).length;
    if (hits >= 4) {
      yearRow = index;
      break;
    }
  }
  if (yearRow < 0) throw new Error("PESA year header was not found");
  const header = grid[yearRow] ?? [];
  const firstYear = header.findIndex((cell) => /^\d{4}-\d{2}$/.test(String(cell ?? "")));
  const labelColumn = Math.max(0, firstYear - 1);
  const below = grid[yearRow + 1] ?? [];
  const above = grid[yearRow - 1] ?? [];
  const statusIsBelow = below.some((cell) => /^(outturn|plans)$/i.test(String(cell ?? "").trim()));
  const years = header.flatMap((cell, column) => {
    const label = String(cell ?? "");
    if (!/^\d{4}-\d{2}$/.test(label)) return [];
    const statusText = String((statusIsBelow ? below : above)[column] ?? "")
      .trim()
      .toLowerCase();
    let status: "outturn" | "plans" | null = null;
    if (statusText === "outturn" || statusText === "plans") status = statusText;
    return [{ column, label, status }];
  });
  return { labelColumn, dataStart: yearRow + (statusIsBelow ? 2 : 1), years };
}

function cleanLabel(cell: Cell): string {
  return String(cell ?? "")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
