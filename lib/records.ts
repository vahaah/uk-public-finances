export type FinanceRecord = {
  id: string;
  metric: string;
  kind: "largest" | "highest";
  valueLabel: string;
  period: string;
  firstPeriod: string;
  seriesId: string;
  publisher: string;
  basis: string;
  sinceLabel: string;
};

type Point = { period: string; value: number };

export function buildRecords(input: {
  borrowingMonths: Point[];
  debtRatioMonths: Point[];
  interestYears: Point[];
  receiptYears: Point[];
  hmrcMonths: Point[];
}): FinanceRecord[] {
  const surplus = extreme(input.borrowingMonths, "max");
  const borrowed = extreme(input.borrowingMonths, "min");
  const debt = extreme(input.debtRatioMonths, "max");
  const interest = highestShare(input.interestYears, input.receiptYears);
  const hmrc = extreme(input.hmrcMonths, "max");
  const records: FinanceRecord[] = [];
  if (borrowed) {
    records.push({
      id: "largest-monthly-borrowing",
      metric: "monthly borrowing",
      kind: "largest",
      valueLabel: billions(-borrowed.value),
      period: borrowed.period,
      firstPeriod: input.borrowingMonths[0]?.period ?? "1993-01",
      seriesId: "J5II",
      publisher: "Office for National Statistics",
      basis: "The most borrowed in a single month in ONS records, which start in January 1993. Based on J5II, latest estimates, in cash terms.",
      sinceLabel: "January 1993",
    });
  }
  if (surplus && surplus.value > 0) {
    records.push({
      id: "largest-monthly-surplus",
      metric: "monthly surplus",
      kind: "largest",
      valueLabel: billions(surplus.value),
      period: surplus.period,
      firstPeriod: input.borrowingMonths[0]?.period ?? "1993-01",
      seriesId: "J5II",
      publisher: "Office for National Statistics",
      basis: "The largest monthly surplus in ONS records, which start in January 1993. Based on J5II, latest estimates.",
      sinceLabel: "January 1993",
    });
  }
  if (debt) {
    records.push({
      id: "highest-debt-ratio",
      metric: "debt as a share of GDP",
      kind: "highest",
      valueLabel: `${debt.value.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      period: debt.period,
      firstPeriod: input.debtRatioMonths[0]?.period ?? debt.period,
      seriesId: "HF6X",
      publisher: "Office for National Statistics",
      basis: `Highest debt as a share of GDP since ONS records began in ${input.debtRatioMonths[0]?.period ?? debt.period}. Based on HF6X, latest estimates.`,
      sinceLabel: input.debtRatioMonths[0]?.period ?? debt.period,
    });
  }
  if (interest) {
    records.push({
      id: "highest-interest-share",
      metric: "debt interest as a share of receipts",
      kind: "highest",
      valueLabel: `${interest.share.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      period: interest.period,
      firstPeriod: interest.first,
      seriesId: "NMFX ÷ JW2O",
      publisher: "Office for National Statistics",
      basis: "Highest calendar-year debt interest as a share of calendar-year receipts. NMFX divided by JW2O. Both annual series are calendar years.",
      sinceLabel: interest.first,
    });
  }
  if (hmrc) {
    records.push({
      id: "highest-hmrc-month",
      metric: "monthly HMRC receipts",
      kind: "highest",
      valueLabel: billions(hmrc.value),
      period: hmrc.period,
      firstPeriod: input.hmrcMonths[0]?.period ?? "2017-04",
      seriesId: "HMRC monthly total",
      publisher: "HM Revenue & Customs",
      basis: "Highest monthly HMRC cash receipts in this series, which starts in April 2017. HMRC's own records start earlier.",
      sinceLabel: "2017",
    });
  }
  return records;
}

function extreme(points: Point[], which: "max" | "min"): Point | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) => {
    if (which === "max") return point.value > best.value ? point : best;
    return point.value < best.value ? point : best;
  });
}

function highestShare(interest: Point[], receipts: Point[]): { period: string; share: number; first: string } | null {
  const byYear = new Map(receipts.map((point) => [point.period, point.value]));
  let best: { period: string; share: number } | null = null;
  let first: string | null = null;
  for (const point of interest) {
    const base = byYear.get(point.period);
    if (base == null || base === 0) continue;
    if (!first) first = point.period;
    const share = (point.value / base) * 100;
    if (!best || share > best.share) best = { period: point.period, share };
  }
  if (!best || !first) return null;
  return { ...best, first };
}

function billions(millions: number): string {
  const value = Math.abs(millions) / 1000;
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}bn`;
}
