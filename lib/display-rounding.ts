/** Round signed parts onto one quantum so the displayed sum matches the displayed total. */
export function reconcileSignedDisplay(
  terms: { key: string; amount: number; sign: 1 | -1 }[],
  quantum = 0.1,
): { displayed: Record<string, number>; balanced: boolean } {
  const exact = terms.reduce((sum, term) => sum + term.sign * term.amount, 0);
  const target = Math.round(exact / quantum);
  const rows = terms.map((term) => ({
    key: term.key,
    sign: term.sign,
    exact: term.amount / quantum,
    rounded: Math.round(term.amount / quantum),
  }));
  let signed = rows.reduce((sum, row) => sum + row.sign * row.rounded, 0);
  let guard = 0;
  while (signed !== target && guard < 100) {
    const delta = target > signed ? 1 : -1;
    let best = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    rows.forEach((row, index) => {
      const next = row.exact - (row.rounded + delta * row.sign);
      const score = -Math.abs(next);
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    const chosen = rows[best];
    if (!chosen) break;
    chosen.rounded += delta * chosen.sign;
    signed += delta;
    guard += 1;
  }
  const displayed: Record<string, number> = {};
  for (const row of rows) displayed[row.key] = Number((row.rounded * quantum).toFixed(1));
  return { displayed, balanced: signed === target };
}

/** Percentages that sum to 100 at the given decimal places. */
export function largestRemainder(weights: number[], digits = 1): number[] {
  const scale = 10 ** digits;
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (weight / total) * 100 * scale);
  const floors = exact.map((value) => Math.floor(value));
  let remain = Math.round(100 * scale) - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - (floors[index] ?? 0) }))
    .sort((left, right) => right.fraction - left.fraction);
  let cursor = 0;
  while (remain > 0 && order.length > 0) {
    const pick = order[cursor % order.length];
    if (!pick) break;
    floors[pick.index] = (floors[pick.index] ?? 0) + 1;
    remain -= 1;
    cursor += 1;
  }
  return floors.map((value) => value / scale);
}
