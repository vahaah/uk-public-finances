import type { SnapshotOf } from "@/lib/schema";

type Pesa = SnapshotOf<"pesa">["data"];
type Deflators = NonNullable<Pesa["deflators"]>;

export type RealSeriesPoint = { period: string } & Record<string, number | null | string>;

/** Deflator index for a financial year, or null. */
function indexFor(deflators: Deflators, year: string) {
  return deflators.years.find((point) => point.year === year)?.index ?? null;
}

/** Latest outturn year in the deflator series: the price base for every real-terms figure. */
export function priceBase(deflators: Deflators): string {
  return deflators.years.filter((point) => !point.forecast).at(-1)?.year ?? deflators.years.at(-1)!.year;
}

const FUNCTION_GROUPS = [
  { key: "health", name: "Health", match: /^7\. Health/ },
  { key: "education", name: "Education", match: /^9\. Education/ },
  { key: "defence", name: "Defence", match: /^2\. Defence/ },
  { key: "social", name: "Social protection", match: /^10\. Social protection/ },
] as const;
export const PER_PERSON_SERIES = FUNCTION_GROUPS.map(({ key, name }) => ({ key, name }));

/**
 * PESA spending on services by function (£bn), per person (ONS UKPOP mid-year estimate for the
 * calendar year the financial year starts in), in prices of the latest outturn year (HMT deflator).
 */
export function perPersonByFunction(history: Pesa["functionHistory"], deflators: Deflators, population: { period: string; value: number }[]): RealSeriesPoint[] {
  const base = indexFor(deflators, priceBase(deflators));
  if (base == null) return [];
  const pop = new Map(population.map((point) => [point.period, point.value]));
  return history.flatMap((row) => {
    const index = indexFor(deflators, row.year);
    const people = pop.get(row.year.slice(0, 4));
    if (index == null || people == null) return [];
    const point: RealSeriesPoint = { period: row.year };
    for (const group of FUNCTION_GROUPS) {
      const item = row.items.find((candidate) => group.match.test(candidate.name));
      point[group.key] = item ? Math.round((item.value * 1e9 * (base / index)) / people) : null;
    }
    return [point];
  });
}

const DEPARTMENT_GROUPS = [
  { key: "health", name: "Health and Social Care", match: /^Health and Social Care$/ },
  { key: "defence", name: "Defence", match: /^Defence$/ },
  { key: "education", name: "Education", match: /^Education$/ },
] as const;
export const DEPARTMENT_SERIES = [...DEPARTMENT_GROUPS.map(({ key, name }) => ({ key, name })), { key: "other", name: "All other departments" }];

/** PESA table 6.1 DEL by department (£m), outturn then plans, in £bn at prices of the latest outturn year. */
export function departmentsReal(history: Pesa["departmentHistory"], deflators: Deflators): { points: RealSeriesPoint[]; plansFrom: string | null } {
  const base = indexFor(deflators, priceBase(deflators));
  if (base == null) return { points: [], plansFrom: null };
  const points = history.flatMap((row) => {
    const index = indexFor(deflators, row.year);
    if (index == null || row.total == null) return [];
    const real = (millions: number) => Number(((millions / 1000) * (base / index)).toFixed(1));
    const point: RealSeriesPoint = { period: row.year };
    let named = 0;
    for (const group of DEPARTMENT_GROUPS) {
      const item = row.items.find((candidate) => group.match.test(candidate.name));
      point[group.key] = item ? real(item.value) : null;
      named += item?.value ?? 0;
    }
    point.other = real(row.total - named);
    return [point];
  });
  const plansFrom = history.find((row) => row.basis === "plans")?.year ?? null;
  return { points, plansFrom };
}

/** Real change between two years for each series, per cent. */
export function realChange(points: RealSeriesPoint[], key: string, from: string, to: string): number | null {
  const a = points.find((point) => point.period === from)?.[key];
  const b = points.find((point) => point.period === to)?.[key];
  return typeof a === "number" && typeof b === "number" && a !== 0 ? Number((((b - a) / a) * 100).toFixed(1)) : null;
}
