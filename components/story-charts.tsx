"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useChartTheme } from "@/components/charts";
import { ChartTooltip } from "@/components/chart-tooltip";

import { formatUnit, type Unit } from "@/lib/story-format";

const axis = (value: number) => (Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1));

/** Previous forecast against this forecast, side by side by year. */
export function CompareBars({
  points,
  currentLabel,
  previousLabel,
  unit,
}: {
  points: { period: string; current: number | null; previous: number | null }[];
  currentLabel: string;
  previousLabel: string;
  unit: Unit;
}) {
  const theme = useChartTheme();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
        <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={0} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} tickFormatter={axis} />
          <ReferenceLine y={0} stroke={theme.muted} />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={({ active, payload, label }) => (
              <ChartTooltip active={active} label={String(label ?? "")} rows={(payload ?? []).map((item) => ({ name: String(item.name), value: formatUnit(Number(item.value), unit) }))} />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="previous" name={`${previousLabel} forecast`} fill={theme.surplus} isAnimationActive={false} />
          <Bar dataKey="current" name={`${currentLabel} forecast`} fill={theme.bar} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
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
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={every - 1} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} domain={["auto", "auto"]} tickFormatter={axis} />
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
export function SignedBars({ points, unit, name, positiveLabel, negativeLabel }: { points: { period: string; value: number }[]; unit: Unit; name: string; positiveLabel: string; negativeLabel: string }) {
  const theme = useChartTheme();
  const every = Math.max(1, Math.ceil(points.length / 10));
  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={every - 1} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} tickFormatter={axis} />
            <ReferenceLine y={0} stroke={theme.muted} />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} label={String(label ?? "")} rows={(payload ?? []).map((item) => ({ name, value: formatUnit(Number(item.value), unit) }))} />
              )}
            />
            <Bar dataKey="value" name={name} isAnimationActive={false}>
              {points.map((point) => (
                <Cell key={point.period} fill={point.value >= 0 ? theme.bar : theme.surplus} />
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
  const data = points.map((point) => ({ period: point.period, outturn: point.outturn, ...Object.fromEntries(point.values.map((value, index) => [`v${index}`, value])) }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} domain={["auto", "auto"]} tickFormatter={axis} />
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
