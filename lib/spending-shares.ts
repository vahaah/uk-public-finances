export type SpendShare = { name: string; billions: number; share: number };

/**
 * Shares of HM Treasury spending on services. Values are the PESA £ billion figures.
 * Tax is not earmarked: these are spending shares, not a split of anyone's tax.
 */
export function spendingShares(items: { name: string; value: number }[], total: number | null): SpendShare[] {
  const denominator = total != null && total > 0 ? total : items.reduce((sum, item) => sum + item.value, 0);
  if (!(denominator > 0)) return [];
  return items
    .filter((item) => item.value > 0)
    .map((item) => ({
      name: item.name.replace(/^\d+\.\s*/, ""),
      billions: item.value,
      share: (item.value / denominator) * 100,
    }))
    .sort((left, right) => right.billions - left.billions);
}
