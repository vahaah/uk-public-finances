import { TITLE_SUFFIX, TITLE_TAG_MAX, clampDescription } from "@/lib/page-copy";
import { formatBillions, formatDateLong, formatGbpFromMillions, formatMonthLong, formatPercent } from "@/lib/format";

/** Page title, description, and the one sentence used on the share card and as its alt text. */
export type ShareCopy = {
  kicker: string;
  title: string;
  description: string;
  sentence: string;
  version: string;
};

const TITLE_MAX = TITLE_TAG_MAX - TITLE_SUFFIX.length;

export function fitTitle(preferred: string, fallback: string): string {
  return preferred.length <= TITLE_MAX ? preferred : fallback;
}

/** Stamp for the og:image URL. A new release is a new URL, so the card is not stuck for a day. */
export function cardVersion(...stamps: (string | null | undefined)[]): string {
  const picked = stamps.filter((stamp): stamp is string => Boolean(stamp)).sort();
  return (picked.at(-1) ?? "none").slice(0, 16);
}

export function homeSentence(input: {
  month: string;
  receiptsMillions: number;
  spendingMillions: number;
  /** Bulletin sign: positive is borrowing. */
  borrowingMillions: number;
} | null): string | null {
  if (!input) return null;
  const month = formatMonthLong(input.month);
  const received = formatGbpFromMillions(input.receiptsMillions);
  const spent = formatGbpFromMillions(input.spendingMillions);
  const amount = formatGbpFromMillions(Math.abs(input.borrowingMillions));
  const gap = input.borrowingMillions < 0 ? `ran a surplus of ${amount}` : `borrowed ${amount}`;
  return `In ${month} the public sector received ${received}, spent ${spent} and ${gap}.`;
}

export function homeCard(
  input: { month: string; receiptsMillions: number; spendingMillions: number; borrowingMillions: number } | null,
  version: string,
  fallbackTitle: string,
): ShareCopy | null {
  const sentence = homeSentence(input);
  if (!sentence || !input) return null;
  return {
    kicker: "Overview",
    title: fitTitle(`UK budget breakdown, ${formatMonthLong(input.month)}`, fallbackTitle),
    description: clampDescription(sentence),
    sentence,
    version,
  };
}

export function borrowingSentence(fy: { year: string; through: string } | null, borrowingMillions: number | null): string | null {
  if (!fy || borrowingMillions == null) return null;
  const through = formatMonthLong(fy.through);
  const amount = formatGbpFromMillions(Math.abs(borrowingMillions));
  if (borrowingMillions < 0) return `The public sector ran a surplus of ${amount} so far in ${fy.year} (April to ${through}).`;
  return `Public sector net borrowing so far in ${fy.year} (April to ${through}) was ${amount}.`;
}

export function borrowingCard(
  fy: { year: string; through: string } | null,
  borrowingMillions: number | null,
  version: string,
  fallbackTitle: string,
): ShareCopy | null {
  const sentence = borrowingSentence(fy, borrowingMillions);
  if (!sentence || !fy || borrowingMillions == null) return null;
  const amount = formatGbpFromMillions(Math.abs(borrowingMillions));
  const title = borrowingMillions < 0 ? `UK surplus: ${amount} in ${fy.year}` : `UK borrowing: ${amount} in ${fy.year}`;
  return { kicker: "Borrowing", title: fitTitle(title, fallbackTitle), description: clampDescription(sentence), sentence, version };
}

export function debtSentence(month: string | null, debtMillions: number | null, ratio: number | null): string | null {
  if (!month || debtMillions == null || ratio == null) return null;
  return `Public sector net debt was ${formatGbpFromMillions(debtMillions)} at the end of ${formatMonthLong(month)}, ${formatPercent(ratio)} of GDP.`;
}

export function debtCard(
  month: string | null,
  debtMillions: number | null,
  ratio: number | null,
  version: string,
  fallbackTitle: string,
): ShareCopy | null {
  const sentence = debtSentence(month, debtMillions, ratio);
  if (!sentence || debtMillions == null || ratio == null) return null;
  const title = `UK debt: ${formatGbpFromMillions(debtMillions)}, ${formatPercent(ratio)} of GDP`;
  return { kicker: "Debt", title: fitTitle(title, fallbackTitle), description: clampDescription(sentence), sentence, version };
}

export function receiptsSentence(year: string, totalMillions: number): string {
  return `HMRC received ${formatGbpFromMillions(totalMillions)} in tax and National Insurance in ${year}.`;
}

export function receiptsCard(year: string, totalMillions: number, version: string): ShareCopy {
  const sentence = receiptsSentence(year, totalMillions);
  return { kicker: "Receipts", title: `UK tax receipts, ${year}`, description: clampDescription(sentence), sentence, version };
}

export function spendingSentence(year: string, servicesBn: number | null, totalManagedBn: number | null): string | null {
  if (servicesBn == null) return null;
  const services = formatBillions(servicesBn);
  if (totalManagedBn == null) return `Public spending on services was ${services} in ${year}.`;
  return `In ${year}, public spending on services was ${services} and total managed expenditure was ${formatBillions(totalManagedBn)}.`;
}

export function spendingCard(year: string, servicesBn: number | null, totalManagedBn: number | null, version: string): ShareCopy | null {
  const sentence = spendingSentence(year, servicesBn, totalManagedBn);
  if (!sentence) return null;
  return { kicker: "Spending", title: fitTitle(`UK public spending, ${year}`, "What the UK government spends on"), description: clampDescription(sentence), sentence, version };
}

/** Year-ahead borrowing forecast for one fiscal event. Null when the OBR figure is not loaded. */
export function eventForecastSentence(label: string, fy: string | null, forecastBn: number | null): string | null {
  if (!fy || forecastBn == null) return null;
  return `At ${label}, the OBR forecast borrowing of ${formatBillions(forecastBn)} in ${fy}.`;
}

export function eventCard(label: string, fy: string | null, forecastBn: number | null, version: string): ShareCopy | null {
  const sentence = eventForecastSentence(label, fy, forecastBn);
  if (!sentence || !fy) return null;
  return {
    kicker: "Budgets",
    title: fitTitle(`${label}: ${formatBillions(forecastBn ?? 0)} in ${fy}`, label),
    description: clampDescription(sentence),
    sentence,
    version,
  };
}

/** The explained page's opening sentence. The page adds the date and chancellor after it. */
export function explainedSentence(input: {
  currentLabel: string | null;
  previousLabel: string | null;
  fy: string;
  current: number | null;
  previous: number | null;
  date: string;
}): string {
  const currentLabel = input.currentLabel ?? "latest";
  const previousLabel = input.previousLabel ?? "previous";
  if (input.current != null) {
    const compared =
      input.previous != null ? `, compared with ${formatBillions(input.previous)} in its ${previousLabel} forecast` : "";
    return `The OBR's ${currentLabel} forecast puts UK public sector net borrowing at ${formatBillions(input.current)} in ${input.fy}${compared}.`;
  }
  return `${formatDateLong(input.date)}. What the OBR's ${currentLabel} forecast says about the economy and the public finances, compared with its ${previousLabel} forecast.`;
}

export function explainedCard(
  label: string,
  sentence: string,
  version: string,
): ShareCopy {
  return {
    kicker: "Budgets",
    title: fitTitle(`UK ${label} explained`, "Budget explained"),
    description: clampDescription(sentence),
    sentence,
    version,
  };
}
