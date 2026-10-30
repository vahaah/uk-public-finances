"use client";

import { useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";

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

function Swatches({ items }: { items: { label: string; className: string; color?: string; diamond?: boolean }[] }) {
  return (
    <p className="mb-2 flex flex-wrap gap-4 text-xs text-neutral-950 dark:text-neutral-50">
      {items.map((item) => (
        <span key={item.label}>
          <span className={`mr-1 inline-block size-2.5 align-middle ${item.diamond ? "rotate-45 scale-75 bg-neutral-900 dark:bg-neutral-50" : ""} ${item.className}`} style={item.color ? { backgroundColor: item.color } : undefined} aria-hidden="true" />
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

/**
 * Stacked bars that split above and below zero (positive parts stack up, negative parts
 * down), with an optional net marker per period. Segment colours are given by the caller.
 */
export function StackedBars({
  points,
  segments,
  unit,
  netKey,
  netName = "Net change",
  height = "h-64",
}: {
  points: Record<string, string | number | null>[];
  segments: { key: string; name: string; color: string; darkColor?: string }[];
  unit: Unit;
  netKey?: string;
  netName?: string;
  height?: string;
}) {
  const theme = useChartTheme();
  const isSm = useIsSm();
  const dark = theme.bar !== "#1d4ed8";
  const values: number[] = [];
  for (const point of points) {
    let up = 0;
    let down = 0;
    for (const segment of segments) {
      const value = Number(point[segment.key] ?? 0);
      if (value > 0) up += value;
      else down += value;
    }
    values.push(up, down);
    if (netKey && point[netKey] != null) values.push(Number(point[netKey]));
  }
  const y = yAxisFor(values, true);
  return (
    <div>
      <Swatches
        items={[
          ...segments.map((segment) => ({ label: segment.name, className: "", color: dark ? (segment.darkColor ?? segment.color) : segment.color })),
          ...(netKey ? [{ label: netName, className: "", diamond: true }] : []),
        ]}
      />
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} stackOffset="sign">
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={0} tickFormatter={isSm ? undefined : shortPeriod} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
            <ReferenceLine y={0} stroke={theme.muted} />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} label={String(label ?? "")} rows={(payload ?? []).filter((item) => item.value != null).map((item) => ({ name: String(item.name), value: formatUnit(Number(item.value), unit) }))} />
              )}
            />
            {segments.map((segment) => (
              <Bar key={segment.key} dataKey={segment.key} name={segment.name} stackId="s" fill={dark ? segment.darkColor ?? segment.color : segment.color} isAnimationActive={false} />
            ))}
            {netKey ? <Scatter dataKey={netKey} name={netName} fill={theme.stroke} shape="diamond" isAnimationActive={false} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Several named lines. Periods from `forecastFrom` on are drawn dashed (plans or projections). */
export function MultiLine({
  points,
  series,
  unit,
  forecastFrom,
  forecastLabel = "Plans",
}: {
  points: Record<string, string | number | null>[];
  series: { key: string; name: string }[];
  unit: Unit;
  forecastFrom?: string | null;
  forecastLabel?: string;
}) {
  const theme = useChartTheme();
  const isSm = useIsSm();
  const dark = theme.bar !== "#1d4ed8";
  const palette = dark ? ["#93c5fd", "#fbbf24", "#a3a3a3", "#c4b5fd", "#6ee7b7"] : ["#1d4ed8", "#d97706", "#525252", "#7c3aed", "#059669"];
  const periods = points.map((point) => String(point.period));
  const joinIndex = forecastFrom ? periods.indexOf(forecastFrom) - 1 : -1;
  const data = points.map((point, index) => {
    const isForecast = forecastFrom ? String(point.period) >= forecastFrom : false;
    const row: Record<string, string | number | null> = { period: point.period };
    for (const item of series) {
      row[item.key] = isForecast ? null : (point[item.key] ?? null);
      row[`${item.key}__f`] = isForecast || index === joinIndex ? (point[item.key] ?? null) : null;
    }
    return row;
  });
  const y = yAxisFor(points.flatMap((point) => series.map((item) => (typeof point[item.key] === "number" ? (point[item.key] as number) : null))), true);
  const every = Math.max(1, Math.ceil(periods.length / (isSm ? 8 : 4)));
  return (
    <div>
      <Swatches items={series.map((item, index) => ({ label: item.name, className: "", color: palette[index % palette.length] }))} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={every - 1} tickFormatter={isSm ? undefined : shortPeriod} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={44} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
            <Tooltip
              cursor={{ stroke: "#a3a3a3", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                const seen = new Set<string>();
                const rows = (payload ?? [])
                  .filter((item) => item.value != null)
                  .map((item) => ({ key: String(item.dataKey).replace(/__f$/, ""), value: Number(item.value) }))
                  .filter((item) => (seen.has(item.key) ? false : (seen.add(item.key), true)))
                  .map((item) => ({ name: series.find((s) => s.key === item.key)?.name ?? item.key, value: formatUnit(item.value, unit) }));
                return <ChartTooltip active={active} label={`${String(label ?? "")}${forecastFrom && String(label) >= forecastFrom ? ` (${forecastLabel.toLowerCase()})` : ""}`} rows={rows} />;
              }}
            />
            {forecastFrom ? <ReferenceLine x={forecastFrom} stroke={theme.grid} label={{ value: forecastLabel, position: "insideTopRight", fontSize: 11, fill: theme.tick }} /> : null}
            {series.map((item, index) => (
              <Line key={item.key} dataKey={item.key} name={item.name} stroke={palette[index % palette.length]} dot={false} strokeWidth={2} isAnimationActive={false} connectNulls={false} />
            ))}
            {forecastFrom
              ? series.map((item, index) => (
                  <Line key={`${item.key}__f`} dataKey={`${item.key}__f`} name={`${item.name} (${forecastLabel.toLowerCase()})`} stroke={palette[index % palette.length]} strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} legendType="none" />
                ))
              : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** One row per year: the range of independent forecasts as a floating bar, their average and median as ticks, and one highlighted forecast as a dot. */
export function RangeCompare({
  points,
  unit,
  dotName,
}: {
  points: { period: string; lowest: number | null; highest: number | null; average: number | null; median: number | null; dot: number | null }[];
  unit: Unit;
  dotName: string;
}) {
  const theme = useChartTheme();
  const data = points.map((point) => ({ ...point, range: point.lowest != null && point.highest != null ? [point.lowest, point.highest] : null }));
  const y = yAxisFor(points.flatMap((point) => [point.lowest, point.highest, point.dot, point.average]), true);
  return (
    <div>
      <Swatches
        items={[
          { label: "Range of independent forecasts", className: "bg-neutral-300 dark:bg-neutral-600" },
          { label: "Independent average", className: "h-0.5 bg-neutral-900 dark:bg-neutral-50" },
          { label: dotName, className: "rounded-full bg-blue-700 dark:bg-blue-300" },
        ]}
      />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 256 }}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="45%">
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval={0} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} ticks={y.ticks} domain={y.domain} tickFormatter={y.tickFormatter} />
            <ReferenceLine y={0} stroke={theme.muted} />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={({ active, label, payload }) => {
                const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
                return (
                  <ChartTooltip
                    active={active}
                    label={String(label ?? "")}
                    rows={row ? [
                      { name: dotName, value: formatUnit(row.dot, unit) },
                      { name: "Independent average", value: formatUnit(row.average, unit) },
                      { name: "Independent median", value: formatUnit(row.median, unit) },
                      { name: "Lowest to highest", value: `${formatUnit(row.lowest, unit)} to ${formatUnit(row.highest, unit)}` },
                    ] : []}
                  />
                );
              }}
            />
            <Bar dataKey="range" name="Range of independent forecasts" fill={theme.surplus} fillOpacity={0.55} isAnimationActive={false} />
            <Scatter dataKey="average" name="Independent average" fill={theme.stroke} shape={(props: { cx?: number; cy?: number }) => <rect x={(props.cx ?? 0) - 18} y={(props.cy ?? 0) - 1} width={36} height={2.5} fill={theme.stroke} />} isAnimationActive={false} />
            <Scatter dataKey="dot" name={dotName} fill={theme.bar} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
