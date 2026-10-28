import { formatGbpFromMillions } from "@/lib/format";

export type OverviewSummaryInput = {
  monthLabel: string;
  monthName: string;
  receiptsMillions: number;
  spendingMillions: number;
  /** Bulletin sign: positive is borrowing, negative is a surplus. */
  borrowingBulletinMillions: number;
  /** Same month a year earlier, also in bulletin sign. Null when that month is missing. */
  earlierBulletinMillions: number | null;
};

/** Cite sentence and spoken equation for the latest month. */
export function overviewSummary(input: OverviewSummaryInput): { cite: string; spoken: string } {
  const received = formatGbpFromMillions(input.receiptsMillions);
  const spent = formatGbpFromMillions(input.spendingMillions);
  const magnitude = formatGbpFromMillions(Math.abs(input.borrowingBulletinMillions));
  const surplus = input.borrowingBulletinMillions < 0;
  const outcome = surplus ? `a surplus of ${magnitude}` : `so it borrowed ${magnitude}`;
  const cite = `In ${input.monthLabel}, the public sector received ${received} and spent ${spent}, ${outcome}.${yearOnYear(input)}`;
  const spoken = surplus
    ? `In ${input.monthLabel}, spending of ${spent} minus receipts of ${received} equals a surplus of ${magnitude}.`
    : `In ${input.monthLabel}, spending of ${spent} minus receipts of ${received} equals borrowing of ${magnitude}.`;
  return { cite, spoken };
}

function yearOnYear(input: OverviewSummaryInput): string {
  if (input.earlierBulletinMillions == null) return "";
  const gap = input.borrowingBulletinMillions - input.earlierBulletinMillions;
  if (gap === 0) return ` That is the same as in ${input.monthName} last year.`;
  const amount = formatGbpFromMillions(Math.abs(gap));
  const direction = gap > 0 ? "more" : "less";
  const borrowingWord = input.borrowingBulletinMillions < 0 ? " borrowing" : "";
  return ` That is ${amount} ${direction}${borrowingWord} than in ${input.monthName} last year.`;
}
