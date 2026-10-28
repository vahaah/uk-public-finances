import { parsePublishedNumber } from "@/lib/numbers";
import type { obrDataSchema } from "@/lib/schema";
import { readXlsx, type Grid } from "@/lib/sheets";
import type { z } from "zod";

type ObrData = z.infer<typeof obrDataSchema>;

/**
 * The OBR public finances databank is an xlsx whose sheets mix outturn and
 * forecast vintages. This keeps rows that have a fiscal-year label and at
 * least one numeric outturn or forecast cell under those headers.
 */
export async function parseObrWorkbook(
  buffer: Buffer,
  origin: ObrData["origin"],
): Promise<ObrData> {
  const sheets = await readXlsx(buffer);
  const series: ObrData["series"] = [];
  let round: string | null = null;
  for (const [name, grid] of Object.entries(sheets)) {
    const parsed = parseSheet(grid);
    if (!parsed) continue;
    if (!round && parsed.round) round = parsed.round;
    series.push({ name, points: parsed.points });
  }
  if (series.length === 0) {
    throw new Error("OBR workbook has no sheet with outturn and forecast columns");
  }
  return { origin, round, series };
}

function parseSheet(grid: Grid): { round: string | null; points: ObrData["series"][number]["points"] } | null {
  let headerIndex = -1;
  for (let index = 0; index < Math.min(grid.length, 40); index += 1) {
    const row = (grid[index] ?? []).map((cell) => String(cell ?? "").toLowerCase());
    if (row.some((cell) => cell.includes("outturn")) && row.some((cell) => cell.includes("forecast"))) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex < 0) return null;
  const header = grid[headerIndex] ?? [];
  const outturnColumn = header.findIndex((cell) => String(cell ?? "").toLowerCase().includes("outturn"));
  const forecastColumn = header.findIndex((cell) => String(cell ?? "").toLowerCase().includes("forecast"));
  const round = String(header[forecastColumn] ?? "") || null;
  const points = [];
  for (const row of grid.slice(headerIndex + 1)) {
    const year = fiscalYear(String(row[0] ?? ""));
    if (!year) continue;
    const outturn = parsePublishedNumber(row[outturnColumn] ?? null);
    const forecast = parsePublishedNumber(row[forecastColumn] ?? null);
    if (outturn == null && forecast == null) continue;
    points.push({ year, outturn, forecast });
  }
  if (points.length === 0) return null;
  return { round, points };
}

function fiscalYear(label: string): string | null {
  const match = /^(\d{4})[-/](\d{2,4})$/.exec(label.trim());
  if (!match) return null;
  const end = match[2] ?? "";
  return `${match[1]}-${end.slice(-2)}`;
}
