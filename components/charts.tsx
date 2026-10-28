"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { Suspense, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { yearLabel, yearTickValues } from "@/lib/chart-time";
import { formatAxis, formatBillions, formatMonth, formatPercent, HMRC_MILLION, niceTicks } from "@/lib/format";
import { adjustSeries, sliceRange, type PriceBundle } from "@/lib/prices";
import { PriceControls, RANGES, usePriceView } from "@/components/prices";

const ranges = RANGES;

export function useChartTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return {
    stroke: dark ? "#fafafa" : "#111827",
    bar: dark ? "#93c5fd" : "#1d4ed8",
    surplus: dark ? "#737373" : "#a3a3a3",
    muted: dark ? "#e5e5e5" : "#111827",
    second: dark ? "#93c5fd" : "#1d4ed8",
    tick: dark ? "#fafafa" : "#111827",
    grid: dark ? "#404040" : "#e5e5e5",
    cursor: dark ? "#171717" : "#f5f5f5",
  };
}

export function BorrowingChart({
  months,
  quarters = [],
  years = [],
  prices = null,
}: {
  months: { period: string; value: number }[];
  quarters?: { period: string; value: number }[];
  years?: { period: string; value: number }[];
  prices?: PriceBundle | null;
}) {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <BorrowingChartInner months={months} quarters={quarters} years={years} prices={prices} />
    </Suspense>
  );
}

function BorrowingChartInner({
  months,
  quarters,
  years,
  prices,
}: {
  months: { period: string; value: number }[];
  quarters: { period: string; value: number }[];
  years: { period: string; value: number }[];
  prices: PriceBundle | null;
}) {
  const theme = useChartTheme();
  const view = usePriceView();
  const source = view.freq === "year" ? years : view.freq === "quarter" ? quarters : months;
  const signed = source.map((point) => ({ period: point.period, value: -point.value }));
  const frequency = view.freq === "year" ? "calendar" : view.freq === "quarter" ? "quarter" : "month";
  const baseYear = view.base && /^\d{4}$/.test(view.base) ? Number(view.base) : 2025;
  const adjusted = prices
    ? adjustSeries({ points: signed, frequency, mode: view.mode, baseYear, unit: "million", prices })
    : {
        points: signed,
        unit: "money" as const,
        omitted: 0,
        note: view.mode === "nominal" ? null : "The price index is not loaded, so this chart stays nominal.",
      };
  const plotted = sliceRange(adjusted.points, view.range).map((point) => ({
    period: point.period,
    borrowing: adjusted.unit === "percent" ? Number(point.value.toFixed(2)) : Number((point.value / 1000).toFixed(1)),
  }));
  return (
    <div>
      <PriceControls years={(prices?.deflatorYears ?? []).map((point) => point.period)} frequency gdp />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <BarChart data={plotted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" ticks={yearTickValues(plotted.map((point) => point.period))} interval={0} tick={{ fontSize: 13, fill: theme.tick }} tickFormatter={yearLabel} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={48} tickFormatter={formatAxis} ticks={niceTicks(plotted.map((point) => point.borrowing))} />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={formatPeriod(String(label ?? ""))}
                  rows={(payload ?? []).map((item) => ({
                    name: "Borrowing",
                    value: adjusted.unit === "percent" ? formatPercent(Number(item.value), 2) : `£${formatAxis(Number(item.value))}bn`,
                  }))}
                />
              )}
            />
            <Bar dataKey="borrowing" isAnimationActive={false}>
              {plotted.map((point) => (
                <Cell key={point.period} fill={point.borrowing < 0 ? theme.surplus : theme.bar} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
        {adjusted.unit === "percent" ? "% of GDP." : "£bn. Bars above zero are borrowing; below zero, a surplus."} {priceCaption(view.mode, baseYear)}
        {adjusted.note ? ` ${adjusted.note}` : ""}
      </p>
    </div>
  );
}

export function CumulativeChart({
  months,
  prices = null,
  thisYear = "This year",
  lastYear = "A year earlier",
  compare = true,
}: {
  months: { period: string; cumulative: number; previousCumulative: number | null }[];
  prices?: PriceBundle | null;
  thisYear?: string;
  lastYear?: string;
  compare?: boolean;
}) {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <CumulativeChartInner months={months} prices={prices} thisYear={thisYear} lastYear={lastYear} compare={compare} />
    </Suspense>
  );
}

function CumulativeChartInner({
  months,
  prices,
  thisYear,
  lastYear,
  compare,
}: {
  months: { period: string; cumulative: number; previousCumulative: number | null }[];
  prices: PriceBundle | null;
  thisYear: string;
  lastYear: string;
  compare: boolean;
}) {
  const theme = useChartTheme();
  const view = usePriceView();
  const baseYear = view.base && /^\d{4}$/.test(view.base) ? Number(view.base) : 2025;
  const mode = view.mode === "gdp" ? "nominal" : view.mode;
  const adjusted = prices
    ? adjustSeries({
        points: months.map((point) => ({ period: point.period, value: -point.cumulative })),
        frequency: "month",
        mode,
        baseYear,
        unit: "million",
        prices,
      })
    : { points: months.map((point) => ({ period: point.period, value: -point.cumulative })), unit: "money" as const, note: null as string | null };
  const byPeriod = new Map(adjusted.points.map((point) => [point.period, point.value]));
  const data = months.map((point) => ({
    period: formatMonth(point.period),
    thisYear: Number(((byPeriod.get(point.period) ?? 0) / 1000).toFixed(1)),
    lastYear: point.previousCumulative == null ? null : Number((-(point.previousCumulative / 1000)).toFixed(1)),
  }));
  return (
    <div>
      <PriceControls years={(prices?.deflatorYears ?? []).map((point) => point.period)} gdp={false} showRange={false} />
      <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
        <LineChart data={data} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} tickFormatter={formatAxis} />
          <Tooltip
            cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                label={String(label ?? "")}
                rows={(payload ?? []).map((item) => ({ name: String(item.name), value: `£${formatAxis(Number(item.value))}bn` }))}
              />
            )}
          />
          <Line type="linear" dataKey="thisYear" name={thisYear} stroke={theme.bar} dot={false} activeDot={{ r: 3 }} strokeWidth={2} isAnimationActive={false} />
          {compare ? (
            <Line type="linear" dataKey="lastYear" name={lastYear} stroke={theme.muted} strokeDasharray="4 4" dot={false} activeDot={{ r: 3 }} strokeWidth={2} isAnimationActive={false} />
          ) : null}
          {compare ? <Legend verticalAlign="top" align="left" iconType="plainline" wrapperStyle={{ fontSize: 12 }} /> : null}
        </LineChart>
      </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
        £bn, running total. In real terms, only {thisYear} is adjusted. A share of GDP is not shown for part of a year. {priceCaption(mode, baseYear)}
        {adjusted.note ? ` ${adjusted.note}` : ""}
      </p>
    </div>
  );
}

export function HistoryChart({
  points,
  frequency,
  unit,
  prices = null,
  name,
  gdp = true,
  showRange = true,
}: {
  points: { period: string; value: number }[];
  frequency: "month" | "quarter" | "calendar" | "financial";
  unit: "million" | "billion";
  prices?: PriceBundle | null;
  name: string;
  gdp?: boolean;
  showRange?: boolean;
}) {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <HistoryChartInner points={points} frequency={frequency} unit={unit} prices={prices} name={name} gdp={gdp} showRange={showRange} />
    </Suspense>
  );
}

function HistoryChartInner({
  points,
  frequency,
  unit,
  prices,
  name,
  gdp,
  showRange,
}: {
  points: { period: string; value: number }[];
  frequency: "month" | "quarter" | "calendar" | "financial";
  unit: "million" | "billion";
  prices: PriceBundle | null;
  name: string;
  gdp: boolean;
  showRange: boolean;
}) {
  const theme = useChartTheme();
  const view = usePriceView();
  const baseYear = view.base && /^\d{4}$/.test(view.base) ? Number(view.base) : 2025;
  const mode = !gdp && view.mode === "gdp" ? "nominal" : view.mode;
  const adjusted = prices
    ? adjustSeries({ points, frequency, mode, baseYear, unit, prices })
    : { points, unit: "money" as const, note: null as string | null, omitted: 0 };
  const scale = unit === "million" && adjusted.unit === "money" ? HMRC_MILLION : 1;
  const plotted = sliceRange(adjusted.points, view.range).map((point) => ({
    period: point.period,
    value: Number((point.value / scale).toFixed(adjusted.unit === "percent" ? 2 : 1)),
  }));
  return (
    <div>
      <PriceControls years={(prices?.deflatorYears ?? []).map((point) => point.period)} gdp={gdp} showRange={showRange && points.length > 1} />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <LineChart data={plotted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" ticks={yearTickValues(plotted.map((point) => point.period))} interval={0} tick={{ fontSize: 13, fill: theme.tick }} tickFormatter={yearLabel} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={48} tickFormatter={formatAxis} ticks={niceTicks(plotted.map((point) => point.value))} />
            <Tooltip
              cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={formatPeriod(String(label ?? ""))}
                  rows={(payload ?? []).map(() => ({
                    name,
                    value: adjusted.unit === "percent" ? formatPercent(Number(payload?.[0]?.value), 2) : `£${formatAxis(Number(payload?.[0]?.value))}bn`,
                  }))}
                />
              )}
            />
            <Line type="linear" dataKey="value" name={name} stroke={theme.bar} dot={false} activeDot={{ r: 3 }} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
        {adjusted.unit === "percent" ? "% of GDP." : "£bn."} {priceCaption(mode, baseYear)}
        {adjusted.note ? ` ${adjusted.note}` : ""}
      </p>
    </div>
  );
}

export function ReceiptsChart({
  taxes,
  year,
  prices = null,
}: {
  taxes: { name: string; value: number }[];
  year?: string;
  prices?: PriceBundle | null;
}) {
  return (
    <Suspense fallback={<div className="h-80" />}>
      <ReceiptsChartInner taxes={taxes} year={year} prices={prices} />
    </Suspense>
  );
}

function ReceiptsChartInner({
  taxes,
  year,
  prices,
}: {
  taxes: { name: string; value: number }[];
  year?: string;
  prices: PriceBundle | null;
}) {
  const theme = useChartTheme();
  const view = usePriceView();
  const scaled = scaleGroup(taxes.map((tax) => tax.value), year, "financial", "million", prices, view);
  const sorted = taxes
    .map((tax, index) => ({ name: tax.name, value: scaled.values[index] ?? tax.value }))
    .sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, 10);
  const other = sorted.slice(10).reduce((sum, tax) => sum + tax.value, 0);
  const divisor = scaled.unit === "percent" ? 1 : HMRC_MILLION;
  const data = [...head, ...(other ? [{ name: "Other", value: other }] : [])].map((tax) => ({
    name: taxLabel(tax.name),
    full: tax.name,
    value: Number((tax.value / divisor).toFixed(scaled.unit === "percent" ? 2 : 1)),
  }));
  return (
    <div>
      {year ? <p className="mb-3 text-sm text-neutral-900 dark:text-neutral-100">{year}</p> : null}
      <PriceControls years={(prices?.deflatorYears ?? []).map((point) => point.period)} showRange={false} />
      <CategoryBars data={data} unit={scaled.unit} theme={theme} />
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
        {scaled.unit === "percent" ? "% of GDP." : "£bn. The ten largest taxes, with the rest grouped as Other."} {priceCaption(scaled.mode, scaled.baseYear)}
        {scaled.note ? ` ${scaled.note}` : ""}
      </p>
    </div>
  );
}

export function SpendingVisuals({
  items,
  year,
  prices = null,
}: {
  items: { name: string; value: number }[];
  year?: string;
  prices?: PriceBundle | null;
}) {
  return (
    <Suspense fallback={<div className="h-80" />}>
      <SpendingVisualsInner items={items} year={year} prices={prices} />
    </Suspense>
  );
}

function SpendingVisualsInner({
  items,
  year,
  prices,
}: {
  items: { name: string; value: number }[];
  year?: string;
  prices: PriceBundle | null;
}) {
  const theme = useChartTheme();
  const view = usePriceView();
  const scaled = scaleGroup(items.map((item) => item.value), year, "financial", "billion", prices, view);
  const shown = items.map((item, index) => ({ ...item, value: scaled.values[index] ?? item.value }));
  const data = [...shown]
    .sort((left, right) => right.value - left.value)
    .map((item) => ({
      name: shortFunction(item.name),
      full: shortFunction(item.name),
      value: Number(item.value.toFixed(scaled.unit === "percent" ? 2 : 1)),
    }));
  return (
    <div>
      {year ? <p className="mb-3 text-sm text-neutral-900 dark:text-neutral-100">{year}</p> : null}
      <PriceControls years={(prices?.deflatorYears ?? []).map((point) => point.period)} showRange={false} />
      <CategoryBars data={data} unit={scaled.unit} theme={theme} moneyAlreadyBillions />
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
        {scaled.unit === "percent" ? "% of GDP." : "£bn."} {priceCaption(scaled.mode, scaled.baseYear)}
        {scaled.note ? ` ${scaled.note}` : ""}
      </p>
    </div>
  );
}

export function DepartmentChart({
  outturn,
  plans,
  prices = null,
}: {
  outturn: { year: string; items: { name: string; value: number }[] };
  plans: { year: string; items: { name: string; value: number }[] };
  prices?: PriceBundle | null;
}) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <DepartmentChartInner outturn={outturn} plans={plans} prices={prices} />
    </Suspense>
  );
}

function DepartmentChartInner({
  outturn,
  plans,
  prices,
}: {
  outturn: { year: string; items: { name: string; value: number }[] };
  plans: { year: string; items: { name: string; value: number }[] };
  prices: PriceBundle | null;
}) {
  const theme = useChartTheme();
  const view = usePriceView();
  const [basis, setBasis] = useQueryState("basis", parseAsStringLiteral(["outturn", "plans"] as const).withDefault("outturn"));
  const selected = basis === "plans" ? plans : outturn;
  const scaled = scaleGroup(
    selected.items.map((item) => item.value),
    selected.year,
    "financial",
    "million",
    prices,
    view,
  );
  const divisor = scaled.unit === "percent" ? 1 : HMRC_MILLION;
  const data = selected.items
    .map((item, index) => ({ name: departmentLabel(item.name), full: item.name, value: (scaled.values[index] ?? item.value) / divisor }))
    .sort((left, right) => right.value - left.value)
    .map((item) => ({ ...item, value: Number(item.value.toFixed(scaled.unit === "percent" ? 2 : 1)) }));
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        <Segmented
          value={basis}
          options={[
            { value: "outturn", label: `${outturn.year} (spent)` },
            { value: "plans", label: `${plans.year} (planned)` },
          ]}
          onChange={setBasis}
        />
      </div>
      <PriceControls years={(prices?.deflatorYears ?? []).map((point) => point.period)} showRange={false} />
      <CategoryBars data={data} unit={scaled.unit} theme={theme} />
    </div>
  );
}

export function YieldChart({
  bank,
  gilt,
}: {
  bank: { date: string; value: number }[];
  gilt: { date: string; value: number }[];
}) {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <YieldChartInner bank={bank} gilt={gilt} />
    </Suspense>
  );
}

function YieldChartInner({
  bank,
  gilt,
}: {
  bank: { date: string; value: number }[];
  gilt: { date: string; value: number }[];
}) {
  const theme = useChartTheme();
  const [range, setRange] = useQueryState("years", parseAsStringLiteral(ranges).withDefault("10"));
  const start = rangeStart(range);
  const byDate = new Map<string, { date: string; bank?: number; gilt?: number }>();
  for (const point of bank) {
    if (point.date < start) continue;
    byDate.set(point.date, { date: point.date, bank: point.value });
  }
  for (const point of gilt) {
    if (point.date < start) continue;
    const row = byDate.get(point.date) ?? { date: point.date };
    row.gilt = point.value;
    byDate.set(point.date, row);
  }
  const data = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return (
    <div>
      <RangeControl value={range} onChange={setRange} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <LineChart data={data} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="date" ticks={yearTickValues(data.map((point) => point.date))} interval={0} tick={{ fontSize: 13, fill: theme.tick }} tickFormatter={yearLabel} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={36} tickFormatter={(value) => `${formatAxis(Number(value))}`} />
            <Tooltip
              cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={formatMonth(String(label).slice(0, 7))}
                  rows={(payload ?? []).map((item) => ({ name: String(item.name), value: formatPercent(Number(item.value), 2) }))}
                />
              )}
            />
            <Line type="stepAfter" dataKey="bank" name="Bank Rate" stroke={theme.bar} dot={false} activeDot={{ r: 3 }} strokeWidth={2} connectNulls={false} isAnimationActive={false} />
            <Line type="linear" dataKey="gilt" name="10-year gilt yield" stroke={theme.muted} dot={false} activeDot={{ r: 3 }} strokeWidth={2} connectNulls={false} isAnimationActive={false} />
            <Legend verticalAlign="top" align="left" iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DebtRatioChart({ points }: { points: { period: string; value: number }[] }) {
  return (
    <Suspense fallback={<div className="h-56" />}>
      <DebtRatioChartInner points={points} />
    </Suspense>
  );
}

function DebtRatioChartInner({ points }: { points: { period: string; value: number }[] }) {
  const theme = useChartTheme();
  const [range, setRange] = useQueryState("years", parseAsStringLiteral(ranges).withDefault("10"));
  const data = sliceRange(points, range);
  return (
    <div>
      <RangeControl value={range} onChange={setRange} />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" ticks={yearTickValues(data.map((point) => point.period))} interval={0} tick={{ fontSize: 13, fill: theme.tick }} tickFormatter={yearLabel} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={36} domain={["auto", "auto"]} tickFormatter={formatAxis} />
            <Tooltip
              cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={formatPeriod(String(label ?? ""))}
                  rows={(payload ?? []).map((item) => ({ name: "Net debt", value: formatPercent(Number(item.value)) }))}
                />
              )}
            />
            <Line type="linear" dataKey="value" name="Net debt, % of GDP" stroke={theme.bar} dot={false} activeDot={{ r: 3 }} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RangeControl({
  value,
  onChange,
}: {
  value: (typeof ranges)[number];
  onChange: (value: (typeof ranges)[number]) => void;
}) {
  return (
    <Segmented
      value={value}
      options={ranges.map((option) => ({ value: option, label: option === "all" ? "All" : `${option}y` }))}
      onChange={onChange}
    />
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
    <div className="mb-3 inline-flex rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700" role="group">
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

function formatPeriod(period: string): string {
  if (/^\d{4}-Q[1-4]$/.test(period)) return period.replace("-", " ");
  if (/^\d{4}-\d{2}$/.test(period)) {
    const month = Number(period.slice(5));
    if (month >= 1 && month <= 12) return formatMonth(period);
  }
  return period;
}

function scaleGroup(
  values: number[],
  period: string | undefined,
  frequency: "month" | "quarter" | "calendar" | "financial",
  unit: "million" | "billion",
  prices: PriceBundle | null,
  view: { mode: "nominal" | "real" | "gdp"; base: string | null },
): { values: number[]; unit: "money" | "percent"; note: string | null; mode: "nominal" | "real" | "gdp"; baseYear: number } {
  const baseYear = view.base && /^\d{4}$/.test(view.base) ? Number(view.base) : 2025;
  if (!prices || !period || view.mode === "nominal") {
    return { values, unit: "money", note: null, mode: "nominal", baseYear };
  }
  const adjusted = adjustSeries({
    points: values.map((value) => ({ period, value })),
    frequency,
    mode: view.mode,
    baseYear,
    unit,
    prices,
  });
  if (adjusted.points.length !== values.length) {
    return { values, unit: "money", note: adjusted.note, mode: view.mode, baseYear };
  }
  return { values: adjusted.points.map((point) => point.value), unit: adjusted.unit, note: adjusted.note, mode: view.mode, baseYear };
}

function priceCaption(mode: "nominal" | "real" | "gdp", baseYear: number): string {
  if (mode === "real") return `£bn at ${baseYear} prices, adjusted with the GDP deflator.`;
  if (mode === "gdp") return "Share of GDP at current prices.";
  return "Not adjusted for inflation.";
}


function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: { name: string; value: string }[];
}) {
  if (!active || rows.length === 0) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm tabular-nums dark:border-neutral-800 dark:bg-black">
      {label ? <p>{label}</p> : null}
      {rows.map((row) => (
        <p key={row.name}>
          {row.name} {row.value}
        </p>
      ))}
    </div>
  );
}

function CategoryBars({
  data,
  unit,
  theme,
  moneyAlreadyBillions = false,
}: {
  data: { name: string; full?: string; value: number }[];
  unit: "money" | "percent";
  theme: { bar: string; tick: string; grid: string; cursor: string };
  moneyAlreadyBillions?: boolean;
}) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const label = (value: number) => (unit === "percent" ? formatPercent(value, 1) : moneyAlreadyBillions || unit === "money" ? formatBillions(value) : formatBillions(value));
  if (narrow) {
    const max = Math.max(...data.map((row) => Math.abs(row.value)), 1);
    return (
      <div className="flex flex-col gap-3">
        {data.map((row) => (
          <div key={row.name} className="grid grid-cols-1 gap-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate" title={row.full ?? row.name}>
                {row.name}
              </span>
              <span className="tabular-nums">{label(row.value)}</span>
            </div>
            <div className="h-2 bg-neutral-100 dark:bg-neutral-900">
              <div className="h-2 bg-blue-700 dark:bg-blue-300" style={{ width: `${(Math.abs(row.value) / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ height: Math.max(280, data.length * 28) }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: theme.tick }} tickFormatter={formatAxis} ticks={niceTicks(data.map((row) => row.value))} />
          <YAxis type="category" dataKey="name" width={200} tick={<EllipsisTick fill={theme.tick} />} />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                rows={(payload ?? []).map((item) => ({
                  name: String(item.payload && typeof item.payload === "object" && "full" in item.payload ? item.payload.full : item.name),
                  value: label(Number(item.value)),
                }))}
              />
            )}
          />
          <Bar dataKey="value" fill={theme.bar} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EllipsisTick({
  x = 0,
  y = 0,
  payload,
  fill,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  fill?: string;
}) {
  const full = payload?.value ?? "";
  const shown = full.length > 32 ? `${full.slice(0, 31)}…` : full;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={fill} fontSize={12}>
      <title>{full}</title>
      {shown}
    </text>
  );
}

function rangeStart(range: (typeof ranges)[number]): string {
  if (range === "all") return "0000-00-00";
  const now = new Date();
  return `${now.getUTCFullYear() - Number(range)}-01-01`;
}

const TAX_LABELS: Record<string, string> = {
  "National Insurance Contributions": "National Insurance",
  "Value Added Tax": "VAT",
  "Hydrocarbon Oil (Fuel duties)": "Fuel duties",
  "Stamp Duty Land Tax": "Stamp Duty Land Tax",
  "Insurance Premium Tax": "Insurance Premium Tax",
};

function taxLabel(name: string): string {
  return TAX_LABELS[name] ?? name;
}

function departmentLabel(name: string): string {
  if (name.startsWith("MHCLG")) return "Housing, Communities and Local Government";
  return name;
}

function shortFunction(name: string): string {
  return name.replace(/^\d+\.\s*/, "");
}
