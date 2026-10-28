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
  Sankey,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

import { formatBillions, formatDay, formatMonth, formatPercent } from "@/lib/format";

const ranges = ["2", "5", "10", "all"] as const;

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
    negative: dark ? "#fca5a5" : "#b91c1c",
    muted: dark ? "#e5e5e5" : "#111827",
    second: dark ? "#6ee7b7" : "#047857",
    tick: dark ? "#fafafa" : "#111827",
    grid: dark ? "#404040" : "#e5e5e5",
    fills: ["#1d4ed8", "#047857", "#b45309", "#6d28d9", "#be123c", "#0e7490", "#c2410c", "#0f766e", "#4338ca", "#4d7c0f"],
  };
}

export function BorrowingChart({ months }: { months: { period: string; value: number }[] }) {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <BorrowingChartInner months={months} />
    </Suspense>
  );
}

function BorrowingChartInner({
  months,
}: {
  months: { period: string; value: number }[];
}) {
  const theme = useChartTheme();
  const [range, setRange] = useQueryState("years", parseAsStringLiteral(ranges).withDefault("5"));
  const plotted = sliceYears(months, range).map((point) => ({
    period: formatMonth(point.period),
    borrowing: Number((-(point.value / 1000)).toFixed(1)),
  }));
  return (
    <div>
      <RangeControl value={range} onChange={setRange} />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <BarChart data={plotted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} />
            <Tooltip
              formatter={(value) => [`£${value}bn`, "Borrowing"]}
              contentStyle={{ background: theme.stroke === "#fafafa" ? "#000" : "#fff", borderColor: theme.grid, fontSize: 12 }}
            />
            <Bar dataKey="borrowing" isAnimationActive={false}>
              {plotted.map((point) => (
                <Cell key={point.period} fill={point.borrowing < 0 ? theme.negative : theme.bar} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">£ billion.</p>
    </div>
  );
}

export function CumulativeChart({
  months,
}: {
  months: { period: string; cumulative: number; previousCumulative: number | null }[];
}) {
  const theme = useChartTheme();
  const data = months.map((point) => ({
    period: formatMonth(point.period),
    thisYear: Number((-(point.cumulative / 1000)).toFixed(1)),
    lastYear: point.previousCumulative == null ? null : Number((-(point.previousCumulative / 1000)).toFixed(1)),
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} />
          <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={40} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="thisYear" name="This year" stroke={theme.bar} dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="lastYear" name="A year earlier" stroke={theme.muted} strokeDasharray="4 4" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReceiptsChart({ taxes }: { taxes: { name: string; value: number }[] }) {
  const theme = useChartTheme();
  const sorted = [...taxes].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, 10);
  const other = sorted.slice(10).reduce((sum, tax) => sum + tax.value, 0);
  const data = [...head, ...(other ? [{ name: "Other", value: other }] : [])].map((tax) => ({
    name: shortName(tax.name),
    value: Number((tax.value / 1000).toFixed(1)),
  }));
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: theme.tick }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: theme.tick }} />
          <Tooltip formatter={(value) => [`£${value}bn`, "Receipts"]} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="value" fill={theme.bar} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendingVisuals({
  items,
}: {
  items: { name: string; value: number }[];
}) {
  const theme = useChartTheme();
  const nodes = [{ name: "Spending on services" }, ...items.map((item) => ({ name: shortFunction(item.name) }))];
  const links = items.map((item, index) => ({ source: 0, target: index + 1, value: item.value }));
  const tree = items.map((item, index) => ({
    name: shortFunction(item.name),
    size: item.value,
    fill: theme.fills[index % theme.fills.length],
  }));
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <Treemap
            data={tree}
            dataKey="size"
            nameKey="name"
            stroke={theme.grid}
            fill={theme.stroke}
            isAnimationActive={false}
            content={<TreemapCell />}
          />
        </ResponsiveContainer>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <Sankey
            data={{ nodes, links }}
            nodeWidth={8}
            nodePadding={14}
            margin={{ left: 8, right: 128, top: 18, bottom: 8 }}
            link={{ stroke: theme.muted }}
            node={(props) => <SankeyLabel {...props} fill={theme.bar} ink={theme.tick} />}
          >
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value) => [formatBillions(Number(value)), ""]} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SankeyLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { name?: string };
  fill?: string;
  ink?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload, fill, ink } = props;
  const name = payload?.name ?? "";
  const source = x < 40;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} />
      {source || height > 14 ? (
        <text
          x={source ? x : x + width + 6}
          y={source ? Math.max(10, y - 2) : y + height / 2}
          textAnchor="start"
          dominantBaseline={source ? "auto" : "middle"}
          fill={ink}
          fontSize={11}
        >
          {source ? name : name}
        </text>
      ) : null}
    </g>
  );
}

function lightFill(fill: string | undefined): boolean {
  return fill === "#d4d4d4" || fill === "#a3a3a3" || fill === "#fafafa";
}

function TreemapCell(props: { x?: number; y?: number; width?: number; height?: number; name?: string; fill?: string; value?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill, value } = props;
  if (width < 4 || height < 4) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
      {width > 56 && height > 28 ? (
        <text x={x + 6} y={y + 16} fill={lightFill(fill) ? "#171717" : "#fff"} fontSize={11}>
          {name} {value == null ? "" : formatBillions(value, 0)}
        </text>
      ) : null}
    </g>
  );
}

export function DepartmentChart({
  outturn,
  plans,
}: {
  outturn: { year: string; items: { name: string; value: number }[] };
  plans: { year: string; items: { name: string; value: number }[] };
}) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <DepartmentChartInner outturn={outturn} plans={plans} />
    </Suspense>
  );
}

function DepartmentChartInner({
  outturn,
  plans,
}: {
  outturn: { year: string; items: { name: string; value: number }[] };
  plans: { year: string; items: { name: string; value: number }[] };
}) {
  const theme = useChartTheme();
  const [basis, setBasis] = useQueryState("basis", parseAsStringLiteral(["outturn", "plans"] as const).withDefault("outturn"));
  const selected = basis === "plans" ? plans : outturn;
  const data = [...selected.items].sort((a, b) => b.value - a.value).map((item) => ({
    name: item.name,
    value: Number((item.value / 1000).toFixed(1)),
  }));
  return (
    <div>
      <Segmented
        value={basis}
        options={[
          { value: "outturn", label: `Outturn ${outturn.year}` },
          { value: "plans", label: `Plans ${plans.year}` },
        ]}
        onChange={setBasis}
      />
      <div className="h-[36rem]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke={theme.grid} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: theme.tick }} />
            <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12, fill: theme.tick }} />
            <Tooltip formatter={(value) => [formatBillions(Number(value)), basis === "plans" ? "Plans" : "Outturn"]} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" fill={theme.bar} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
  const [range, setRange] = useQueryState("years", parseAsStringLiteral(ranges).withDefault("2"));
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
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.tick }} minTickGap={48} tickFormatter={(value) => formatDay(String(value))} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={36} unit="%" />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="stepAfter" dataKey="bank" name="Bank Rate" stroke={theme.bar} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="gilt" name="10-year gilt yield" stroke={theme.second} dot={false} strokeWidth={2} connectNulls={false} isAnimationActive={false} />
            <Legend />
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
  const [range, setRange] = useQueryState("debt", parseAsStringLiteral(ranges).withDefault("10"));
  const data = sliceYears(points, range);
  return (
    <div>
      <RangeControl value={range} onChange={setRange} />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: theme.tick }} minTickGap={32} />
            <YAxis tick={{ fontSize: 12, fill: theme.tick }} width={36} domain={["auto", "auto"]} />
            <Tooltip formatter={(value) => [formatPercent(Number(value)), "PSND ex"]} contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="value" name="Net debt, % of GDP" stroke={theme.bar} dot={false} strokeWidth={2} isAnimationActive={false} />
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

function sliceYears<T extends { period: string }>(points: T[], range: (typeof ranges)[number]): T[] {
  if (range === "all" || points.length === 0) return points;
  const last = points.at(-1)?.period ?? "0000-00";
  const [year, month] = last.split("-").map(Number);
  const cutoff = `${year - Number(range)}-${String(month).padStart(2, "0")}`;
  return points.filter((point) => point.period >= cutoff);
}

function rangeStart(range: (typeof ranges)[number]): string {
  if (range === "all") return "0000-00-00";
  const now = new Date();
  return `${now.getUTCFullYear() - Number(range)}-01-01`;
}

function shortName(name: string): string {
  if (name.length <= 28) return name;
  return `${name.slice(0, 26)}…`;
}

function shortFunction(name: string): string {
  return name.replace(/^\d+\.\s*/, "");
}
