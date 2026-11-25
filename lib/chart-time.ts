/** One tick per year when the span is short, otherwise every fifth year, plus the ends. */
export function yearTickValues(periods: string[]): string[] {
  const firstOfYear = new Map<string, string>();
  for (const period of periods) {
    const year = period.slice(0, 4);
    if (!/^\d{4}$/.test(year) || firstOfYear.has(year)) continue;
    firstOfYear.set(year, period);
  }
  const entries = [...firstOfYear.entries()];
  if (entries.length <= 12) return entries.map(([, period]) => period);
  return entries.flatMap(([year, period], index) => {
    const numeric = Number(year);
    if (index === 0 || index === entries.length - 1 || numeric % 5 === 0) return [period];
    return [];
  });
}

export function yearLabel(period: string): string {
  return period.slice(0, 4);
}

/** Last observation in each calendar month. Yield charts only label months, and daily points dominate the page HTML. */
export function lastObservationByMonth<T extends { date: string }>(points: T[]): T[] {
  const byMonth = new Map<string, T>();
  for (const point of points) {
    const month = point.date.slice(0, 7);
    const current = byMonth.get(month);
    if (!current || point.date >= current.date) byMonth.set(month, point);
  }
  return [...byMonth.values()].sort((left, right) => (left.date < right.date ? -1 : 1));
}
