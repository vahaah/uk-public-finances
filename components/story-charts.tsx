"use client";

import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useChartTheme } from "@/components/charts";
import { ChartTooltip } from "@/components/chart-tooltip";

import { niceTicks, shortPeriod, tickFormatter, yearTicks } from "@/lib/nice-ticks";
import { formatUnit, type Unit } from "@/lib/story-format";

const SM = "(min-width: 640px)";
/** True at Tailwind's `sm` breakpoint and up. Server render assumes desktop. */
export function useIsSm(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(SM);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(SM).matches,
    () => true,
  );
}

function yAxisFor(values: (number | null | undefined)[], zero: boolean) {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
  const ticks = finite.length ? niceTicks(Math.min(...finite), Math.max(...finite), 5, { zero }) : [0, 1];
  return { ticks, domain: [ticks[0]!, ticks.at(-1)!] as [number, number], tickFormatter: tickFormatter(ticks) };
}

function Swatches({ items }: { items: { label: string; className: string; dashed?: boolean }[] }) {
  return (
    <p className="mb-2 flex flex-wrap gap-4 text-xs text-neutral-950 dark:text-neutral-50">
      {items.map((item) => (
        <span key={item.label}>
          <span className={`mr-1 inline-block size-2.5 align-middle ${item.className}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </p>
  );
}

/** Previous forecast against this forecast, side by side by year. */
export function CompareBars({
  points,
  currentLabel,
  previousLabel,
  unit,
  highlight,
  small = false,
}: {
  points: { period: string; current: number | null; previous: number | null }[];
  currentLabel: string;
  previousLabel: string;
  unit: Unit;
  /** The period the title cites: its bars get value labels. */
  highlight?: string;
  /** Small multiple: shorter, no legend. */
  small?: boolean;
}) {
  const theme = useChartTheme();
  const isSm = useIsSm();
  const y = yAxisFor(points.flatMap((point) => [point.current, point.previous]), true);
  const missing = points.filter((point) => point.previous == null && point.current != null).map((point) => point.period);
  const tagged = points.map((point) => ({ ...point, currentTag: point.period === highlight ? point.current : null, previousTag: point.period === highlight ? point.previous : null }));
  const label = (value: unknown) => (value == null ? "" : formatUnit(Number(value), unit).replace(" of GDP", ""));
  return (
    <div>
      {small ? null : <Swatches items={[{ label: `${previousLabel} forecast`, className: "bg-neutral-400 dark:bg-neutral-500" }, { label: `${currentLabel} forecast`, className: "bg-blue-700 dark:bg-blue-300" }]} />}
    <div className={small ? "h-40" : "h-64"}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: small ? 160 : 256 }}>
        <BarChart data={tagged} margin={{ top: highlight ? 18 : 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={0} tickFormatter={isSm && !small ? undefined : shortPeriod} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
          <ReferenceLine y={0} stroke={theme.muted} />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} label={String(label ?? "")} rows={(payload ?? []).map((item) => ({ name: String(item.name), value: formatUnit(Number(item.value), unit) }))} />
            )}
          />
          <Bar dataKey="previous" name={`${previousLabel} forecast`} fill={theme.surplus} isAnimationActive={false}>
            {highlight ? <LabelList dataKey="previousTag" position="top" fontSize={11} fill={theme.tick} formatter={label} /> : null}
          </Bar>
          <Bar dataKey="current" name={`${currentLabel} forecast`} fill={theme.bar} isAnimationActive={false}>
            {highlight ? <LabelList dataKey="currentTag" position="top" fontSize={11} fill={theme.tick} formatter={label} /> : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
      {missing.length && !small ? <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">No {previousLabel} forecast for {missing.join(", ")}.</p> : null}
    </div>
  );
}

/** A long-run line. Points after `forecastFrom` are drawn dashed. Optional second line for the previous forecast. */
export function LongRunLine({
  points,
  unit,
  name,
  forecastFrom,
  previous,
  previousName,
}: {
  points: { period: string; value: number }[];
  unit: Unit;
  name: string;
  forecastFrom?: string | null;
  previous?: { period: string; value: number }[];
  previousName?: string;
}) {
  const theme = useChartTheme();
  const prev = new Map((previous ?? []).map((point) => [point.period, point.value]));
  const periods = [...new Set([...points.map((point) => point.period), ...prev.keys()])].sort();
  const byPeriod = new Map(points.map((point) => [point.period, point.value]));
  const data = periods.map((period) => {
    const value = byPeriod.get(period) ?? null;
    const isForecast = forecastFrom ? period >= forecastFrom : false;
    const joins = forecastFrom ? period === previousPeriod(periods, forecastFrom) : false;
    return { period, outturn: !isForecast ? value : null, forecast: isForecast || joins ? value : null, previous: prev.get(period) ?? null };
  });
  const every = Math.max(1, Math.ceil(periods.length / 8));
  const isSm = useIsSm();
  const y = yAxisFor([...points.map((point) => point.value), ...prev.values()], false);
  const xTicks = isSm ? undefined : yearTicks(periods, 20);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={xTicks ? 0 : every - 1} ticks={xTicks} minTickGap={8} tickFormatter={isSm ? undefined : (value: string) => value.slice(0, 4)} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
          <Tooltip
            cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                label={String(label ?? "")}
                rows={(payload ?? []).filter((item) => item.value != null).map((item) => ({ name: String(item.name), value: formatUnit(Number(item.value), unit) }))}
              />
            )}
          />
          {forecastFrom ? <ReferenceLine x={forecastFrom} stroke={theme.grid} label={{ value: "Forecast", position: "insideTopRight", fontSize: 11, fill: theme.tick }} /> : null}
          <Line dataKey="outturn" name={name} stroke={theme.bar} dot={false} strokeWidth={2} isAnimationActive={false} connectNulls={false} />
          <Line dataKey="forecast" name={`${name} (forecast)`} stroke={theme.bar} strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
          {previous ? <Line dataKey="previous" name={previousName ?? "Previous forecast"} stroke={theme.surplus} strokeDasharray="2 3" dot={false} strokeWidth={2} isAnimationActive={false} /> : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function previousPeriod(periods: string[], from: string): string | null {
  const index = periods.indexOf(from);
  return index > 0 ? (periods[index - 1] ?? null) : null;
}

/** Signed bars, one per period. Positive and negative get different shades. */
export function SignedBars({
  points,
  unit,
  name,
  positiveLabel,
  negativeLabel,
  highlight,
  tickLabel,
  height = "h-64",
  tickEvery,
}: {
  points: { period: string; value: number; label?: string }[];
  unit: Unit;
  name: string;
  positiveLabel: string;
  negativeLabel: string;
  /** Period drawn in the accent colour; the others are gray (used when all bars share a sign). */
  highlight?: string;
  /** "year": show only the year of a YYYY-MM period. */
  tickLabel?: "year";
  height?: string;
  tickEvery?: number;
}) {
  const theme = useChartTheme();
  const isSm = useIsSm();
  const every = tickEvery ?? Math.max(1, Math.ceil(points.length / (isSm ? 10 : 5)));
  const y = yAxisFor(points.map((point) => point.value), true);
  return (
    <div>
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={every - 1} tickFormatter={tickLabel === "year" ? (period: string) => period.slice(0, 4) : isSm ? undefined : shortPeriod} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
            <ReferenceLine y={0} stroke={theme.muted} />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={String((payload?.[0]?.payload as { label?: string } | undefined)?.label ?? label ?? "")}
                  rows={(payload ?? []).map((item) => ({ name, value: formatUnit(Number(item.value), unit) }))}
                />
              )}
            />
            <Bar dataKey="value" name={name} isAnimationActive={false}>
              {points.map((point) => (
                <Cell key={point.period} fill={highlight ? (point.period === highlight ? theme.bar : theme.surplus) : point.value >= 0 ? theme.bar : theme.surplus} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-800 dark:text-neutral-200">
        <span><span className="mr-1 inline-block size-2.5 bg-blue-700 align-middle dark:bg-blue-300" />{positiveLabel}</span>
        {negativeLabel ? (
          <span><span className="mr-1 inline-block size-2.5 bg-neutral-400 align-middle dark:bg-neutral-500" />{negativeLabel}</span>
        ) : null}
      </p>
    </div>
  );
}

/** Several forecast vintages against the outturn. */
export function VintagesLine({ vintages, points, unit }: { vintages: string[]; points: { period: string; values: (number | null)[]; outturn: number | null }[]; unit: Unit }) {
  const theme = useChartTheme();
  const shades = [theme.surplus, "#a78bfa", "#f59e0b", "#10b981", "#ef4444"];
  const isSm = useIsSm();
  const y = yAxisFor(points.flatMap((point) => [...point.values, point.outturn]), false);
  const data = points.map((point) => ({ period: point.period, outturn: point.outturn, ...Object.fromEntries(point.values.map((value, index) => [`v${index}`, value])) }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} tickFormatter={isSm ? undefined : shortPeriod} minTickGap={8} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
          <Tooltip
            cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} label={String(label ?? "")} rows={(payload ?? []).filter((item) => item.value != null).map((item) => ({ name: String(item.name), value: formatUnit(Number(item.value), unit) }))} />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {vintages.map((vintage, index) => (
            <Line key={vintage} dataKey={`v${index}`} name={`${vintage} forecast`} stroke={shades[index % shades.length]} strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
          ))}
          <Line dataKey="outturn" name="Outturn" stroke={theme.stroke} dot={false} strokeWidth={2.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
