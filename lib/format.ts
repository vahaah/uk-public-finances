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
