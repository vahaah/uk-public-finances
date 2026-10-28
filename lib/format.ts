export function formatGbpFromMillions(value: number, digits = 1): string {
  const billions = value / 1000;
  return `${value < 0 ? "−" : ""}£${Math.abs(billions).toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}bn`;
}

export function formatBillions(value: number, digits = 1): string {
  return `${value < 0 ? "−" : ""}£${Math.abs(value).toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}bn`;
}

export function formatMillions(value: number): string {
  return `${value < 0 ? "−" : ""}£${Math.abs(value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}m`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

export function formatRelease(iso: string | null): string {
  if (!iso) return "Not available";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateLong(iso: string | null): string {
  if (!iso) return "Not available";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDay(period: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  if (!match) return formatMonth(period);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonth(period: string): string {
  return formatMonthStyle(period, "short");
}

export function formatMonthLong(period: string): string {
  return formatMonthStyle(period, "long");
}

function formatMonthStyle(period: string, month: "short" | "long"): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en-GB", { month, year: "numeric", timeZone: "UTC" }).format(date);
}

export function borrowingWords(bulletinMillions: number): string {
  return bulletinMillions < 0 ? "surplus" : "borrowing";
}

/** HMRC publishes monthly and annual receipts in £ million. £75,778 million is £75.8bn. */
export const HMRC_MILLION = 1_000;

export function millionsToBillions(millions: number): number {
  return millions / HMRC_MILLION;
}

export function formatAxis(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-GB", { maximumFractionDigits: 1 });
  return value < 0 ? `−${abs}` : abs;
}

/** Under £0.05bn prints as less than £0.1bn. A negative amount is a repayment, not a share. */
export function formatReceiptBn(millions: number): string {
  if (Math.abs(millions) < 50) return "less than £0.1bn";
  return formatGbpFromMillions(millions);
}

export function formatReceiptShare(millions: number, totalMillions: number): string {
  if (millions < 0 || totalMillions === 0) return "share not shown";
  const share = (millions / totalMillions) * 100;
  if (Math.abs(millions) < 50 || Math.abs(share) < 0.05) return "less than 0.1%";
  return formatPercent(share);
}

export function niceTicks(values: number[]): number[] {
  if (values.length === 0) return [0];
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, Math.abs(max), Math.abs(min), 1);
  const rough = span / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * pow).find((candidate) => candidate >= rough) ?? rough;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 100; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks.length > 0 ? ticks : [0];
}

export function previousFinancialYear(year: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(year);
  if (!match) return "A year earlier";
  const start = Number(match[1]) - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}
