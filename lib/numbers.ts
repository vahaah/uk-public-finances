import { createHash } from "node:crypto";

/** Parse a published number. Blank, "[X]", "[not …]" and "-" stay null. Never coerce those to zero. */
export function parsePublishedNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "–" || trimmed === "—") return null;
  if (trimmed.startsWith("[")) return null;
  const numeric = trimmed.replace(/,/g, "").replace(/£/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(numeric)) return null;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
  }
  return value;
}
