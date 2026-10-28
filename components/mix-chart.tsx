"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { yearTickValues } from "@/lib/chart-time";
import { formatAxis } from "@/lib/format";
import { TAX_GROUPS, TAX_LABELS, type MixRow, type TaxGroup } from "@/lib/mix";

const TAX_COLOR: Record<TaxGroup, string> = {
  income: "var(--chart-tax-income)",
  nics: "var(--chart-tax-nics)",
  vat: "var(--chart-tax-vat)",
  corp: "var(--chart-tax-corp)",
  duties: "var(--chart-tax-duties)",
  other: "var(--chart-tax-other)",
};

const FUNCTION_COLORS = [
  "var(--chart-fn-health)",
  "var(--chart-fn-welfare)",
  "var(--chart-fn-education)",
  "var(--chart-fn-defence)",
  "var(--chart-fn-interest)",
  "var(--chart-fn-other)",
];

export function ReceiptMixChart({ pounds, shares }: { pounds: MixRow[]; shares: MixRow[] }) {
  const [asShare, setAsShare] = useState(false);
  const data = asShare ? shares : pounds;
  return (
    <MixFrame
      asShare={asShare}
      onToggle={() => setAsShare((value) => !value)}
      rows={data}
      keys={TAX_GROUPS}
      label={(key) => TAX_LABELS[key as TaxGroup]}
      color={(key, index) => TAX_COLOR[key as TaxGroup] ?? FUNCTION_COLORS[index] ?? FUNCTION_COLORS[0]}
      unit={asShare ? "%" : "bn"}
    />
  );
}

export function FunctionMixChart({
  pounds,
  shares,
}: {
  pounds: { year: string; series: { key: string; label: string; value: number }[] }[];
  shares: { year: string; series: { key: string; label: string; value: number }[] }[];
}) {
  const [asShare, setAsShare] = useState(false);
  const source = asShare ? shares : pounds;
  const keys = pounds[0]?.series.map((series) => series.key) ?? [];
  const rows = source.map((row) => {
    const flat: Record<string, string | number> = { year: row.year };
    for (const series of row.series) flat[series.key] = series.value;
    return flat;
  });
  return (
    <MixFrame
      asShare={asShare}
      onToggle={() => setAsShare((value) => !value)}
      rows={rows}
      keys={keys}
      label={(key) => key}
      color={(_key, index) => FUNCTION_COLORS[index % FUNCTION_COLORS.length] ?? FUNCTION_COLORS[0]}
      unit={asShare ? "%" : "bn"}
    />
  );
}

function MixFrame({
  asShare,
  onToggle,
  rows,
  keys,
  label,
  color,
  unit,
}: {
  asShare: boolean;
  onToggle: () => void;
  rows: Record<string, string | number>[];
  keys: readonly string[];
  label: (key: string) => string;
  color: (key: string, index: number) => string;
  unit: "%" | "bn";
}) {
  const ticks = yearTickValues(rows.map((row) => String(row.year)));
  return (
    <div>
      <button
        type="button"
        aria-pressed={asShare}
        className={`mb-3 h-8 rounded-md border px-3 text-xs ${asShare ? "bg-neutral-100 font-medium dark:bg-neutral-800" : "border-neutral-300 dark:border-neutral-700"}`}
        onClick={onToggle}
      >
        {asShare ? "Showing shares" : "Show 100%"}
      </button>
      <div className="h-[200px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-grid)" vertical={false} />
            <XAxis dataKey="year" ticks={ticks} interval={0} tick={{ fontSize: 13, fill: "currentColor" }} />
            <YAxis tick={{ fontSize: 13, fill: "currentColor" }} width={48} tickFormatter={formatAxis} />
            <Tooltip
              content={({ active, payload, label: axisLabel }) =>
                active ? (
                  <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs dark:border-neutral-800 dark:bg-black">
                    <p>{axisLabel}</p>
                    {(payload ?? []).map((item) => (
                      <p key={String(item.dataKey)}>
                        {label(String(item.dataKey))} {formatAxis(Number(item.value))}
                        {unit}
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {keys.map((key, index) => (
              <Area
                key={key}
                type="linear"
                dataKey={key}
                stackId="mix"
                stroke={color(key, index)}
                fill={color(key, index)}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {keys.map((key, index) => (
          <li key={key} className="inline-flex items-center gap-1">
            <span className="inline-block size-2" style={{ background: color(key, index) }} />
            {label(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
