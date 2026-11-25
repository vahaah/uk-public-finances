"use client";

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { ChoiceSelect } from "@/components/ui/choice-select";
import { Segmented } from "@/components/ui/segmented";

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
  showRange = true,
}: {
  years: string[];
  frequency?: boolean;
  gdp?: boolean;
  showRange?: boolean;
}) {
  const view = usePriceView();
  const selectedBase = view.base && years.includes(view.base) ? view.base : (years.at(-1) ?? "");
  return (
    <div className="mb-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
      {showRange ? (
        <Segmented
          label="Time range"
          value={view.range}
          options={RANGES.map((option) => ({ value: option, label: option === "all" ? "All" : `${option}y` }))}
          onChange={view.setRange}
        />
      ) : null}
      {frequency ? (
        <Segmented
          label="Frequency"
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
        label="Price basis"
        value={view.mode}
        options={[
          { value: "nominal", label: "Nominal" },
          { value: "real", label: "Real terms" },
          ...(gdp ? [{ value: "gdp" as const, label: "% of GDP" }] : []),
        ]}
        onChange={view.setMode}
      />
      {view.mode === "real" ? (
        <ChoiceSelect
          label="Base year"
          value={selectedBase}
          options={years.map((year) => ({ value: year, label: year }))}
          onChange={view.setBase}
        />
      ) : null}
    </div>
  );
}

