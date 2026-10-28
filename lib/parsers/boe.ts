import { parsePublishedNumber } from "@/lib/numbers";
import type { boeDataSchema } from "@/lib/schema";
import type { z } from "zod";

type BoeData = z.infer<typeof boeDataSchema>;

const DESCRIPTIONS = {
  IUDBEDR: "Official Bank Rate",
  IUDMNPY: "Yield from British Government Securities - 10 year Nominal Par Yield",
} as const;

export function parseBoeCsv(csv: string): BoeData {
  const lines = csv.trim().split(/\r?\n/).filter((line) => line.trim());
  const header = parseCsvLine(lines[0] ?? "");
  const dateIndex = header.indexOf("DATE");
  const bankIndex = header.indexOf("IUDBEDR");
  const yieldIndex = header.indexOf("IUDMNPY");
  if (dateIndex < 0 || bankIndex < 0 || yieldIndex < 0) {
    throw new Error("Bank of England CSV is missing DATE, IUDBEDR or IUDMNPY");
  }
  const bank: { date: string; value: number }[] = [];
  const gilt: { date: string; value: number }[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const date = isoDate(cells[dateIndex] ?? "");
    if (!date) continue;
    const bankRate = parsePublishedNumber(cells[bankIndex] ?? "");
    const giltYield = parsePublishedNumber(cells[yieldIndex] ?? "");
    if (bankRate != null) bank.push({ date, value: bankRate });
    if (giltYield != null) gilt.push({ date, value: giltYield });
  }
  if (bank.length === 0) throw new Error("Bank Rate series is empty");
  return {
    series: {
      IUDBEDR: { description: DESCRIPTIONS.IUDBEDR, latest: bank.at(-1) ?? null, points: bank },
      IUDMNPY: { description: DESCRIPTIONS.IUDMNPY, latest: gilt.at(-1) ?? null, points: gilt },
    },
  };
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? "";
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        current += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current);
  return cells;
}

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function isoDate(value: string): string | null {
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = MONTHS[match[2] ?? ""];
  if (!month) return null;
  return `${match[3]}-${month}-${(match[1] ?? "").padStart(2, "0")}`;
}
