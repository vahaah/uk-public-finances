export type Unit = "pct" | "bn" | "pctGdp" | "pp" | "count";

export function formatUnit(value: number | null | undefined, unit: Unit): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (unit === "bn") return `${sign}£${abs.toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}bn`;
  if (unit === "pctGdp") return `${sign}${abs.toFixed(1)}% of GDP`;
  if (unit === "count") return `${sign}${abs.toFixed(0)}`;
  if (unit === "pp") return `${sign}${abs.toFixed(2)} pp of GDP`;
  return `${sign}${abs.toFixed(1)}%`;
}

