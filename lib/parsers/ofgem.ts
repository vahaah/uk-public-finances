import { readXlsx, type Cell, type Grid } from "@/lib/sheets";

/**
 * Ofgem energy price cap, Annex 9 "Levelisation allowance methodology and levelised cap
 * levels", sheet "1c Consumption adjusted levels": the cap for a typical dual fuel household
 * paying by Direct Debit ("Other Payment Method"), for every cap period since April 2017,
 * restated at the latest typical domestic consumption values. That makes periods comparable;
 * the headline figure Ofgem announced at the time used the consumption values then in force.
 * £ per year including VAT, GB average. These are cap levels before any government support.
 */
export type CapPeriod = { period: string; start: string; gbp: number };

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const text = (cell: Cell | undefined) => String(cell ?? "").replace(/\s+/g, " ").trim();

/** "Apr 2017 - Sep 2017" or "April 2024 - June 2024" to the first day of the period. */
export function periodStart(label: string): string | null {
  const match = /^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})\s*-/.exec(label.trim());
  const month = match ? MONTHS[match[1]!.toLowerCase()] : undefined;
  return match && month ? `${match[2]}-${month}-01` : null;
}

export function parseCapLevels(grid: Grid): { consumptionNote: string | null; periods: CapPeriod[] } {
  const sectionRow = grid.findIndex((row) => /^Other Payment Method$/i.test(text(row[1])));
  if (sectionRow < 0) throw new Error("Annex 9: no 'Other Payment Method' section");
  const blockRow = grid.findIndex((row, index) => index > sectionRow && row.some((cell) => /^Dual fuel/i.test(text(cell))));
  if (blockRow < 0) throw new Error("Annex 9: no dual fuel block");
  const column = grid[blockRow]!.findIndex((cell) => /^Dual fuel/i.test(text(cell)));
  const typical = grid.findIndex((row, index) => index > blockRow && /^Typical consumption$/i.test(text(row[column])));
  if (typical < 0) throw new Error("Annex 9: no typical consumption table in the dual fuel block");
  const total = grid.findIndex((row, index) => index > typical && /^Total inc VAT$/i.test(text(row[column])));
  if (total < 0) throw new Error("Annex 9: no 'Total inc VAT' row");
  const header = grid[typical]!;
  const values = grid[total]!;
  const periods: CapPeriod[] = [];
  for (let index = column + 1; index < header.length; index += 1) {
    const label = text(header[index]);
    if (!label) {
      if (periods.length > 0 && !text(header[index + 1])) break;
      continue;
    }
    const start = periodStart(label);
    if (!start) break;
    const value = values[index];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) periods.push({ period: label.replace(/\s*-\s*/, " to "), start, gbp: Math.round(value) });
  }
  const consumption = grid.find((row) => /Defaulted to show latest TDCV/i.test(text(row[2])));
  return { consumptionNote: consumption ? "Restated at Ofgem's latest typical domestic consumption values" : null, periods };
}

/** The newest "Date Published" in the workbook's version control table, as YYYY-MM-DD. */
export function parsePublished(grid: Grid | undefined): string | null {
  if (!grid) return null;
  const headerRow = grid.findIndex((row) => row.some((cell) => /^Date Published$/i.test(text(cell))));
  if (headerRow < 0) return null;
  const column = grid[headerRow]!.findIndex((cell) => /^Date Published$/i.test(text(cell)));
  let latest: string | null = null;
  for (const row of grid.slice(headerRow + 1)) {
    const cell = row[column];
    const raw = text(cell);
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    const day = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : uk ? `${uk[3]}-${uk[2]!.padStart(2, "0")}-${uk[1]!.padStart(2, "0")}` : null;
    if (day && (!latest || day > latest)) latest = day;
  }
  return latest;
}

export async function parseAnnex9(buffer: Buffer): Promise<{ consumptionNote: string | null; published: string | null; periods: CapPeriod[] }> {
  const book = await readXlsx(buffer, 140);
  const grid = book["1c Consumption adjusted levels"];
  if (!grid) throw new Error("Annex 9: sheet '1c Consumption adjusted levels' is missing");
  return { ...parseCapLevels(grid), published: parsePublished(book["Front sheet"]) };
}

/** The newest Annex 9 workbook linked from Ofgem's price cap levels page. */
export function pickAnnex9(html: string): string | null {
  const links = [...html.matchAll(/href="([^"]*Annex-9[^"]*levelised-cap-levels[^"]*\.xlsx)"/gi)].map((match) => match[1]!);
  const first = links[0];
  return first ? new URL(first, "https://www.ofgem.gov.uk").toString() : null;
}
