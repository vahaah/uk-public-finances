"use client";

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

export const RANGES = ["5", "10", "20", "all"] as const;
export const MODES = ["nominal", "real", "gdp"] as const;
export const FREQS = ["month", "quarter", "year"] as const;

export type RangeKey = (typeof RANGES)[number];
export type PriceModeKey = (typeof MODES)[number];
export type FreqKey = (typeof FREQS)[number];

export function usePriceView() {
  const [range, setRange] = useQueryState("years", parseAsStringLiteral(RANGES).withDefault("10"));
  const [mode, setMode] = useQueryState("prices", parseAsStringLiteral(MODES).withDefault("nominal"));
  const [base, setBase] = useQueryState("base", parseAsString);
  const [freq, setFreq] = useQueryState("freq", parseAsStringLiteral(FREQS).withDefault("month"));
  return { range, setRange, mode, setMode, base, setBase, freq, setFreq };
}

export function PriceControls({
  years,
  frequency = false,
  gdp = true,
}: {
  years: string[];
  frequency?: boolean;
  gdp?: boolean;
}) {
  const view = usePriceView();
  const selectedBase = view.base && years.includes(view.base) ? view.base : (years.at(-1) ?? "");
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Segmented
        value={view.range}
        options={RANGES.map((option) => ({ value: option, label: option === "all" ? "All" : `${option}y` }))}
        onChange={view.setRange}
      />
      {frequency ? (
        <Segmented
          value={view.freq}
          options={[
            { value: "month", label: "Month" },
            { value: "quarter", label: "Quarter" },
            { value: "year", label: "Year" },
          ]}
          onChange={view.setFreq}
        />
      ) : null}
      <Segmented
        value={view.mode}
        options={[
          { value: "nominal", label: "Nominal" },
          { value: "real", label: "Real" },
          ...(gdp ? [{ value: "gdp" as const, label: "% of GDP" }] : []),
        ]}
        onChange={view.setMode}
      />
      {view.mode === "real" ? (
        <label className="inline-flex items-center gap-1 text-xs text-neutral-800 dark:text-neutral-200">
          Base year
          <select
            className="h-7 rounded-md border border-neutral-300 bg-white px-2 dark:border-neutral-700 dark:bg-neutral-950"
            value={selectedBase}
            onChange={(event) => view.setBase(event.target.value)}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={`h-7 px-2.5 text-xs ${option.value === value ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-white" : "text-neutral-800 dark:text-neutral-200"}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
