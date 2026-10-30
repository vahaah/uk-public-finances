/**
 * Real household disposable income per head (ONS CRXX, chained volume £) by decade:
 * average yearly growth and the £ change per head from the first year of the decade to the
 * first year of the next. The current decade runs to the latest annual outturn and is
 * flagged as partial. Outturn only: no forecast is mixed in.
 */
export type RhdiDecade = { decade: string; from: number; to: number; years: number; growthPct: number; changeGbp: number; partial: boolean };

export function rhdiByDecade(years: { period: string; value: number }[]): RhdiDecade[] {
  const level = new Map(years.map((point) => [Number(point.period), point.value]));
  const last = Math.max(...years.map((point) => Number(point.period)));
  const out: RhdiDecade[] = [];
  for (let start = 1960; start <= last - 1; start += 10) {
    const end = Math.min(start + 10, last);
    const a = level.get(start);
    const b = level.get(end);
    if (a == null || b == null) continue;
    const span = end - start;
    out.push({
      decade: `${start}s`,
      from: start,
      to: end,
      years: span,
      growthPct: Number(((Math.pow(b / a, 1 / span) - 1) * 100).toFixed(2)),
      changeGbp: Math.round(b - a),
      partial: span < 10,
    });
  }
  return out;
}
