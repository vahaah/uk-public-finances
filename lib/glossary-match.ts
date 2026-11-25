import { GLOSSARY, type Term } from "@/lib/content";

const ALIASES: Record<string, string[]> = {
  psnb: ["public sector net borrowing"],
  psnd: ["public sector net debt"],
  "debt-interest": ["central government net interest"],
  gdp: ["GDP"],
  "bank-rate": ["Bank Rate"],
  receipts: ["public sector current receipts"],
  gilt: ["index-linked gilt"],
  "financial-year": ["financial year"],
  tme: ["total managed expenditure"],
  "public-sector": ["public sector"],
};

export type GlossarySegment = { text: string; term: Term | null };

function needles(entry: Term): string[] {
  const extra = ALIASES[entry.id] ?? [];
  const bare = entry.term.replace(/\s*\([^)]*\)/g, "").trim();
  return [...new Set([entry.term, bare, ...extra])].filter((needle) => needle.length >= 3);
}

function boundary(text: string, start: number, end: number): boolean {
  const before = text[start - 1] ?? "";
  const after = text[end] ?? "";
  return !/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after);
}

/** First in-bounds mention of each glossary term, longest match first, without overlaps. */
export function glossarySegments(text: string): GlossarySegment[] {
  const candidates = GLOSSARY.flatMap((entry) => needles(entry).map((needle) => ({ needle, entry }))).sort(
    (left, right) => right.needle.length - left.needle.length,
  );
  const lower = text.toLowerCase();
  const ranges: { start: number; end: number; entry: Term }[] = [];
  const used = new Set<string>();
  for (const { needle, entry } of candidates) {
    if (used.has(entry.id)) continue;
    const at = lower.indexOf(needle.toLowerCase());
    if (at < 0) continue;
    const end = at + needle.length;
    if (!boundary(text, at, end)) continue;
    if (ranges.some((range) => at < range.end && end > range.start)) continue;
    ranges.push({ start: at, end, entry });
    used.add(entry.id);
  }
  ranges.sort((left, right) => left.start - right.start);
  const segments: GlossarySegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), term: null });
    segments.push({ text: text.slice(range.start, range.end), term: range.entry });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), term: null });
  if (segments.length === 0) segments.push({ text, term: null });
  return segments;
}
