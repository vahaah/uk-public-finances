import { strFromU8, unzipSync } from "fflate";

import { readXlsx, type Cell } from "@/lib/sheets";

/**
 * HM Treasury "GDP deflators at market prices, and money GDP". Outturn years carry an index;
 * forecast years (OBR, flagged with footnotes) carry only the percentage change, so the
 * index is rolled forward from the last outturn year. Base is whatever HMT uses (e.g. 2025-26 = 100).
 */
export type DeflatorYear = { year: string; index: number; forecast: boolean };

const fy = (cell: Cell) => {
  const match = /^(\d{4})-(\d{2})/.exec(String(cell ?? "").trim());
  return match ? `${match[1]}-${match[2]}` : null;
};
const isNum = (cell: Cell): cell is number => typeof cell === "number" && Number.isFinite(cell);

export async function parseHmtDeflators(buffer: Buffer): Promise<{ base: string | null; years: DeflatorYear[] }> {
  const book = await readXlsx(buffer, 12);
  const grid = Object.values(book)[0] ?? [];
  let base: string | null = null;
  const years: DeflatorYear[] = [];
  for (const row of grid) {
    const baseMatch = row.map((cell) => /(\d{4}-\d{2})\s*=\s*100/.exec(String(cell ?? ""))?.[1]).find(Boolean);
    if (baseMatch && !base) base = baseMatch;
    const year = fy(row[1] ?? null);
    if (!year) continue;
    const index = row[2] ?? null;
    const change = row[3] ?? null;
    const flagged = /\(\d\)/.test(String(row[1]));
    if (isNum(index)) years.push({ year, index: Number(index.toFixed(4)), forecast: flagged });
    else if (isNum(change) && years.length > 0) {
      const previous = years.at(-1)!;
      years.push({ year, index: Number((previous.index * (1 + change / 100)).toFixed(4)), forecast: true });
    }
  }
  if (years.length < 10) throw new Error("HMT GDP deflator sheet has too few years");
  return { base, years };
}

/**
 * DfE "School funding statistics": national revenue funding per pupil aged 5-16 in England,
 * cash and real terms. The real-terms column carries its price year in its name
 * (per_pupil_funding_202526terms_gbp), so a new release with a new base still parses.
 */
export type PerPupilRow = { year: string; cashGbp: number; realGbp: number; pupils: number | null };

export function parseDfePerPupil(zip: Uint8Array): { priceYear: string; rows: PerPupilRow[] } {
  const files = unzipSync(zip, { filter: (file) => /\.csv$/i.test(file.name) && !/school_level/i.test(file.name) });
  for (const bytes of Object.values(files)) {
    const lines = strFromU8(bytes).trim().split(/\r?\n/);
    const header = (lines[0] ?? "").split(",");
    const realIndex = header.findIndex((name) => /^per_pupil_funding_\d{6}terms_gbp$/.test(name));
    const cashIndex = header.indexOf("per_pupil_funding_cashterms_gbp");
    const periodIndex = header.indexOf("time_period");
    const levelIndex = header.indexOf("geographic_level");
    if (realIndex < 0 || cashIndex < 0 || periodIndex < 0) continue;
    const priceCode = /(\d{4})(\d{2})terms/.exec(header[realIndex]!)!;
    const pupilsIndex = header.indexOf("pupil_number_fte");
    const rows: PerPupilRow[] = [];
    for (const line of lines.slice(1)) {
      const cells = line.split(",");
      if (levelIndex >= 0 && cells[levelIndex] !== "National") continue;
      const period = /^(\d{4})(\d{2})$/.exec(cells[periodIndex] ?? "");
      const real = Number(cells[realIndex]);
      const cash = Number(cells[cashIndex]);
      if (!period || !Number.isFinite(real) || !Number.isFinite(cash) || real <= 0) continue;
      const pupils = Number(cells[pupilsIndex]);
      rows.push({ year: `${period[1]}-${period[2]}`, cashGbp: cash, realGbp: real, pupils: Number.isFinite(pupils) && pupils > 0 ? pupils : null });
    }
    if (rows.length >= 5) return { priceYear: `${priceCode[1]}-${priceCode[2]}`, rows: rows.sort((a, b) => a.year.localeCompare(b.year)) };
  }
  throw new Error("DfE school funding download has no national per-pupil table");
}

/** The "download all files" link on the latest release page of an EES publication. */
export function eesAllFilesUrl(html: string): string | null {
  const match = /https:\/\/content\.explore-education-statistics\.service\.gov\.uk\/api\/releases\/[0-9a-f-]{36}\/files/.exec(html);
  return match ? match[0] : null;
}
