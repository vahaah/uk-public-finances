import { parsePublishedNumber } from "@/lib/numbers";
import type { hmrcDataSchema } from "@/lib/schema";
import { readOds, type Cell, type Grid } from "@/lib/sheets";
import type { z } from "zod";

type HmrcData = z.infer<typeof hmrcDataSchema>;

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export function parseHmrcReceipts(
  buffer: Buffer,
  source: { contentUrl: string; attachmentUrl: string; attachmentFilename: string },
): HmrcData {
  const sheets = readOds(buffer);
  const annual = sheets.Receipts_Annually;
  const monthly = sheets.Receipts_Monthly;
  if (!annual || !monthly) throw new Error("HMRC workbook is missing receipt sheets");
  const annualTable = readAnnual(annual);
  const monthlyTable = readMonthly(monthly);
  const latest = annualTable.at(-1);
  if (!latest) throw new Error("HMRC annual receipts table has no year");
  return {
    contentUrl: source.contentUrl,
    attachmentUrl: source.attachmentUrl,
    attachmentFilename: source.attachmentFilename,
    annual: {
      year: latest.year,
      total: latest.total,
      taxes: latest.taxes,
    },
    annualHistory: annualTable.map((row) => ({ year: row.year, total: row.total })),
    monthly: monthlyTable,
  };
}

function readAnnual(grid: Grid): { year: string; total: number; taxes: { name: string; value: number }[] }[] {
  const headerIndex = grid.findIndex((row) => row.some((cell) => String(cell).includes("Total HMRC Receipts")));
  if (headerIndex < 0) throw new Error("HMRC annual header was not found");
  const header = grid[headerIndex] ?? [];
  const totalColumn = header.findIndex((cell) => cell === "Total HMRC Receipts");
  if (totalColumn < 0) throw new Error("Total HMRC Receipts column was not found");
  const rows = [];
  for (const row of grid.slice(headerIndex + 1)) {
    const label = String(row[0] ?? "");
    const year = financialYearLabel(label);
    if (!year) continue;
    const total = parsePublishedNumber(row[totalColumn] ?? null);
    if (total == null) continue;
    const taxes = [];
    for (let column = 0; column < header.length; column += 1) {
      const name = String(header[column] ?? "");
      if (!name || name.startsWith("Table ") || /total/i.test(name)) continue;
      if (name.toLowerCase().includes("included within")) continue;
      if (/nic/i.test(name) && name !== "National Insurance Contributions") continue;
      const value = parsePublishedNumber(row[column] ?? null);
      if (value == null) continue;
      taxes.push({ name, value });
    }
    rows.push({ year, total, taxes });
  }
  return rows;
}

function readMonthly(grid: Grid): { period: string; total: number }[] {
  const headerIndex = grid.findIndex((row) => row.some((cell) => String(cell).includes("Total HMRC Receipts")));
  if (headerIndex < 0) throw new Error("HMRC monthly header was not found");
  const header = grid[headerIndex] ?? [];
  const totalColumn = header.findIndex((cell) => cell === "Total HMRC Receipts");
  const points = [];
  for (const row of grid.slice(headerIndex + 1)) {
    const period = monthLabel(String(row[0] ?? ""));
    if (!period) continue;
    const total = parsePublishedNumber(row[totalColumn] ?? null);
    if (total == null) continue;
    points.push({ period, total });
  }
  return points;
}

function financialYearLabel(label: string): string | null {
  const match = /^(\d{4}) to (\d{4})$/.exec(label.trim());
  if (!match) return null;
  return `${match[1]}-${(match[2] ?? "").slice(2)}`;
}

function monthLabel(label: string): string | null {
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(label.trim());
  if (!match) return null;
  const month = MONTHS[(match[1] ?? "").toLowerCase()];
  if (!month) return null;
  return `${match[2]}-${month}`;
}

export function cellText(cell: Cell): string {
  return cell == null ? "" : String(cell);
}
