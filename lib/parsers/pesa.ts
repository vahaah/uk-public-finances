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
  return {
    contentUrl,
    functions: parseFunctions(functionsSheet),
    departments: parseDepartments(departmentSheet, "outturn"),
    departmentPlans: parseDepartments(departmentSheet, "plans"),
  };
}

function parseFunctions(grid: Grid): PesaData["functions"] {
  const located = locateYears(grid);
  const yearColumn = located.years.at(-1);
  if (!yearColumn) throw new Error("PESA table 4.2 has no year columns");
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
  if (items.length < 5) throw new Error("PESA table 4.2 did not yield function rows");
  return {
    year: yearColumn.label,
    unit: "£ billion",
    totalServices,
    totalManagedExpenditure,
    items,
  };
}

function parseDepartments(grid: Grid, basis: "outturn" | "plans"): PesaData["departments"] {
  const located = locateYears(grid);
  const wanted = located.years.filter((year) => year.status === basis);
  const yearColumn = wanted.at(-1) ?? located.years.at(-1);
  if (!yearColumn) throw new Error("PESA table 6.1 has no year columns");
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
  if (items.length < 5) throw new Error("PESA table 6.1 did not yield department rows");
  return {
    year: yearColumn.label,
    basis: basis === "outturn" ? "Central government own expenditure within DEL, outturn" : "Central government own expenditure within DEL, plans",
    unit: "£ million",
    total,
    items,
  };
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
  const statusRow = grid[yearRow + 1] ?? [];
  const statusIsStatus = statusRow.some((cell) => /^(outturn|plans)$/i.test(String(cell ?? "").trim()));
  const years = header.flatMap((cell, column) => {
    const label = String(cell ?? "");
    if (!/^\d{4}-\d{2}$/.test(label)) return [];
    const statusText = String(statusRow[column] ?? "").trim().toLowerCase();
    const status = statusText === "outturn" || statusText === "plans" ? statusText : null;
    const typed: "outturn" | "plans" | null = status;
    return [{ column, label, status: typed }];
  });
  return { labelColumn, dataStart: yearRow + (statusIsStatus ? 2 : 1), years };
}

function cleanLabel(cell: Cell): string {
  return String(cell ?? "")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
