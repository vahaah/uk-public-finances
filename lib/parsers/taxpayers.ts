import { parsePublishedNumber } from "@/lib/numbers";
import type { incomeTaxDataSchema } from "@/lib/schema";
import { readOds, type Grid } from "@/lib/sheets";
import type { z } from "zod";

type IncomeTaxData = z.infer<typeof incomeTaxDataSchema>;

const BANDS = ["Savers rate", "Basic rate", "Higher rate", "Additional rate"] as const;

export function parseIncomeTax(
  buffer: Buffer,
  source: { contentUrl: string; attachmentUrl: string; attachmentFilename: string },
): IncomeTaxData {
  const sheets = readOds(buffer);
  const payers = sheets["2_1_IT_payers_by_demographic"];
  const shares = sheets["2_4_Taxpayer_share_tax"];
  if (!payers || !shares) throw new Error("Income tax workbook is missing table 2.1 or 2.4");
  return {
    contentUrl: source.contentUrl,
    attachmentUrl: source.attachmentUrl,
    attachmentFilename: source.attachmentFilename,
    payers: latestPayers(payers),
    shares: latestShares(shares),
  };
}

function latestPayers(grid: Grid): IncomeTaxData["payers"] {
  const headerIndex = grid.findIndex((row) => String(row[0] ?? "") === "Tax year");
  if (headerIndex < 0) throw new Error("Table 2.1 header was not found");
  const header = (grid[headerIndex] ?? []).map((cell) => String(cell ?? ""));
  const totalColumn = header.indexOf("All Income Tax payers");
  const rows = dataRows(grid, headerIndex);
  const latest = rows.at(-1);
  if (!latest || totalColumn < 0) throw new Error("Table 2.1 has no taxpayer row");
  const bands = BANDS.flatMap((band) => {
    const column = header.findIndex((name) => name.startsWith(band));
    if (column < 0) return [];
    const value = parsePublishedNumber(latest[column] ?? null);
    if (value == null) return [];
    return [{ name: band.replace(" rate", ""), value }];
  });
  return {
    yearLabel: String(latest[0] ?? "").replace(/\s*\[note[^\]]*\]/g, "").trim(),
    projected: /\[note/i.test(String(latest[0] ?? "")),
    unit: "thousands",
    total: parsePublishedNumber(latest[totalColumn] ?? null),
    bands,
  };
}

function latestShares(grid: Grid): IncomeTaxData["shares"] {
  const headerIndex = grid.findIndex((row) => String(row[0] ?? "") === "Tax year");
  if (headerIndex < 0) throw new Error("Table 2.4 header was not found");
  const header = (grid[headerIndex] ?? []).map((cell) => String(cell ?? ""));
  const latest = dataRows(grid, headerIndex).at(-1);
  if (!latest) throw new Error("Table 2.4 has no share row");
  return {
    yearLabel: String(latest[0] ?? "").trim(),
    top1Percent: valueAt(header, latest, "Top 1%"),
    top10Percent: valueAt(header, latest, "Top 10%"),
    totalTaxBillion: valueAt(header, latest, "Total Income Tax"),
  };
}

function dataRows(grid: Grid, headerIndex: number): Grid {
  return grid.slice(headerIndex + 1).filter((row) => /^\d{4}/.test(String(row[0] ?? "")));
}

function valueAt(header: string[], row: Grid[number], prefix: string): number | null {
  const column = header.findIndex((name) => name.startsWith(prefix));
  if (column < 0) return null;
  return parsePublishedNumber(row[column] ?? null);
}
