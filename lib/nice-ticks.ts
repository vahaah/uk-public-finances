const MINUS = "\u2212";

/** Round tick values for an axis: steps of 1, 2, 2.5 or 5 × 10ⁿ, always including 0 when the data crosses or touches it. */
export function niceTicks(min: number, max: number, target = 5, { zero = false }: { zero?: boolean } = {}): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  let lo = Math.min(min, max, 0 < min ? min : 0);
  let hi = Math.max(min, max, 0 > max ? max : 0);
  // Positive-only or negative-only data: start the axis at 0 for bars and small ranges.
  if (min >= 0 && (zero || min < (max - min) * 0.5)) lo = 0;
  if (max <= 0 && (zero || -max < (max - min) * 0.5)) hi = 0;
  if (hi === lo) hi = lo + 1;
  const raw = (hi - lo) / Math.max(1, target);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw * 0.999) ?? 10 * power);
  const start = Math.floor(lo / step + 1e-9) * step;
  const end = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 1e-6; v += step) ticks.push(Number(v.toFixed(10)) || 0);
  return ticks;
}

/** Decimals needed so every tick in the set prints distinctly (0, 1 or 2). */
export function tickDecimals(ticks: number[]): number {
  for (const d of [0, 1, 2]) if (ticks.every((t) => Math.abs(t - Number(t.toFixed(d))) < 1e-9)) return d;
  return 2;
}

/** A signed number with a true minus sign and no "−0". Rounds first, then signs. */
export function signedNumber(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return (0).toFixed(decimals);
  return `${rounded < 0 ? MINUS : ""}${Math.abs(rounded).toFixed(decimals)}`;
}

/** Tick formatter with one decimal setting for the whole axis. */
export function tickFormatter(ticks: number[]): (value: number) => string {
  const decimals = tickDecimals(ticks);
  return (value: number) => signedNumber(value, decimals);
}

/** "2026-27" → "26-27" for narrow screens; other labels pass through. */
export function shortPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? `${match[1]!.slice(2)}-${match[2]}` : period;
}

/** Periods whose start year is a multiple of `every` years, for long-run x-axes. */
export function yearTicks(periods: string[], every = 20): string[] {
  const out = periods.filter((period) => Number(period.slice(0, 4)) % every === 0);
  return out.length >= 2 ? out : periods.filter((_, index) => index % Math.max(1, Math.ceil(periods.length / 4)) === 0);
}
