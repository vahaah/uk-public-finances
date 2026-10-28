import { financialYearMean, rebase, type Observation } from "@/lib/prices";
import { largestRemainder } from "@/lib/display-rounding";

export const TAX_GROUPS = ["income", "nics", "vat", "corp", "duties", "other"] as const;
export type TaxGroup = (typeof TAX_GROUPS)[number];

export const TAX_LABELS: Record<TaxGroup, string> = {
  income: "Income Tax",
  nics: "National Insurance",
  vat: "VAT",
  corp: "Corporation Tax",
  duties: "Duties",
  other: "Other",
};

export function taxGroup(name: string): TaxGroup {
  if (name === "Income Tax") return "income";
  if (/national insurance/i.test(name)) return "nics";
  if (name === "Value Added Tax") return "vat";
  if (name === "Corporation Tax") return "corp";
  if (/duty|duties|hydrocarbon|tobacco|alcohol|beer|wine|spirits|cider/i.test(name)) return "duties";
  return "other";
}

export type MixRow = { year: string; raw: Record<string, number> } & Record<TaxGroup, number>;

export type FunctionMixRow = { year: string; series: { key: string; label: string; value: number; raw: number }[] };

/** Flat chart rows. `raw` is the amount before rounding to £0.1bn. */
export function functionChartRows(rows: FunctionMixRow[]): { year: string; raw: Record<string, number> }[] {
  return rows.map((row) => {
    const flat: { year: string; raw: Record<string, number> } & Record<string, string | number | Record<string, number>> = {
      year: row.year,
      raw: {},
    };
    for (const series of row.series) {
      flat[series.key] = series.value;
      flat.raw[series.key] = series.raw;
    }
    return flat;
  });
}

/**
 * Unrounded £bn (or the unrounded share) for one mix series.
 * Chart values are already rounded to 0.1, so today's prices must rebase this instead.
 */
export function mixNominal(raw: Record<string, number> | undefined, key: string): number | null {
  const value = raw?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function receiptMix(
  history: { year: string; taxes: { name: string; value: number }[] }[],
  asShare: boolean,
): MixRow[] {
  return history.map((year) => {
    const totals = Object.fromEntries(TAX_GROUPS.map((group) => [group, 0])) as Record<TaxGroup, number>;
    for (const tax of year.taxes) totals[taxGroup(tax.name)] += tax.value;
    const values = TAX_GROUPS.map((group) => totals[group]);
    const shown = asShare ? largestRemainder(values) : values.map((value) => value / 1000);
    const raw: Record<string, number> = {};
    const row = { year: year.year, raw } as MixRow;
    TAX_GROUPS.forEach((group, index) => {
      const exact = shown[index] ?? 0;
      raw[group] = exact;
      row[group] = Number(exact.toFixed(1));
    });
    return row;
  });
}

export function functionMix(
  history: { year: string; items: { name: string; value: number }[] }[],
  asShare: boolean,
): FunctionMixRow[] {
  const latest = history.at(-1);
  const ranked = [...(latest?.items ?? [])].filter((item) => item.value > 0).sort((left, right) => right.value - left.value);
  const kept = ranked.slice(0, 5).map((item) => clean(item.name));
  return history.map((year) => {
    const buckets = new Map<string, number>();
    for (const name of kept) buckets.set(name, 0);
    buckets.set("Other", 0);
    for (const item of year.items) {
      if (item.value <= 0) continue;
      const name = clean(item.name);
      const key = kept.includes(name) ? name : "Other";
      buckets.set(key, (buckets.get(key) ?? 0) + item.value);
    }
    const labels = [...kept, "Other"];
    const values = labels.map((label) => buckets.get(label) ?? 0);
    const shown = asShare ? largestRemainder(values) : values;
    return {
      year: year.year,
      series: labels.map((label, index) => {
        const exact = shown[index] ?? 0;
        return { key: label, label, value: Number(exact.toFixed(1)), raw: exact };
      }),
    };
  });
}

export function realFunctionGrowth(
  history: { year: string; items: { name: string; value: number }[] }[],
  quarters: Observation[],
): { name: string; from: string; to: string; change: number; baseYear: number }[] {
  const usable = history.flatMap((year) => {
    const start = Number(year.year.slice(0, 4));
    const index = financialYearMean(quarters, start);
    if (index == null) return [];
    return [{ year: year.year, start, index, items: year.items }];
  });
  const first = usable[0];
  const last = usable.at(-1);
  if (!first || !last || first.year === last.year) return [];
  const names = new Set([...first.items, ...last.items].map((item) => clean(item.name)));
  const rows = [...names].flatMap((name) => {
    const start = first.items.find((item) => clean(item.name) === name)?.value;
    const end = last.items.find((item) => clean(item.name) === name)?.value;
    if (start == null || end == null || start <= 0) return [];
    const realEnd = rebase(end, last.index, first.index);
    return [{ name, from: first.year, to: last.year, change: ((realEnd - start) / start) * 100, baseYear: first.start }];
  });
  return rows.sort((left, right) => right.change - left.change);
}

function clean(name: string): string {
  return name.replace(/^\d+\.\s*/, "");
}
