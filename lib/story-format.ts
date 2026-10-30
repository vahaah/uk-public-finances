export type Unit = "pct" | "pct2" | "bn" | "pctGdp" | "pp" | "count" | "gbp";

export function formatUnit(value: number | null | undefined, unit: Unit): string {
  if (value == null || !Number.isFinite(value)) return "n/a";
  const decimals = unit === "count" || unit === "gbp" ? 0 : unit === "pp" || unit === "pct2" ? 2 : 1;
  const rounded = Number(value.toFixed(decimals));
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "−" : "";
  if (unit === "bn") return `${sign}£${abs.toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}bn`;
  if (unit === "pctGdp") return `${sign}${abs.toFixed(1)}% of GDP`;
  if (unit === "gbp") return `${sign}£${abs.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  if (unit === "count") return `${sign}${abs.toFixed(0)}`;
  if (unit === "pp") return `${sign}${abs.toFixed(2)} pp of GDP`;
  return `${sign}${abs.toFixed(decimals)}%`;
}

