"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useChartTheme } from "@/components/charts";
import { formatBillions } from "@/lib/format";
import { FY_MONTHS, type DatabankPoint } from "@/lib/forecasts-view";

const QUARTER_TICKS = ["Apr", "Jul", "Oct", "Jan", "Mar"] as const;

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function niceCeil(value: number, step: number): number {
  return Math.max(step, Math.ceil(value / step) * step);
}

export function ForecastTrackChart({
  thisYear,
  lastYear,
  forecast,
  thisLabel,
  lastLabel,
}: {
  thisYear: (number | null)[];
  lastYear: (number | null)[];
  forecast: number | null;
  thisLabel: string;
  lastLabel: string;
}) {
  const theme = useChartTheme();
  const narrow = useNarrow();
  const data = FY_MONTHS.map((month, index) => ({ month, thisYear: thisYear[index] ?? null, lastYear: lastYear[index] ?? null }));
  const max = Math.max(forecast ?? 0, ...lastYear.map((value) => value ?? 0), ...thisYear.map((value) => value ?? 0));
  const step = max > 200 ? 50 : 25;
  const top = niceCeil(max * 1.05, step);
  const ticks = Array.from({ length: top / step + 1 }, (_, index) => index * step);
  return (
    <div className="h-[200px] sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="month" ticks={narrow ? [...QUARTER_TICKS] : [...FY_MONTHS]} interval={0} tick={{ fontSize: 12, fill: theme.tick }} />
          <YAxis domain={[0, top]} ticks={ticks} width={40} tick={{ fontSize: 12, fill: theme.tick }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs tabular-nums dark:border-neutral-800 dark:bg-black">
                  <p>{label}</p>
                  {payload.map((item) =>
                    item.value == null ? null : (
                      <p key={String(item.dataKey)}>
                        {item.name} {formatBillions(Number(item.value))}
                      </p>
                    ),
                  )}
                  {forecast != null ? <p>OBR forecast for the year: {formatBillions(forecast)}</p> : null}
                </div>
              );
            }}
          />
          {forecast != null ? (
            <ReferenceLine
              y={forecast}
              stroke="#a3a3a3"
              strokeDasharray="2 4"
              label={{ value: `OBR forecast for the year: ${formatBillions(forecast)}`, position: "insideTopRight", fontSize: 12, fill: theme.tick }}
            />
          ) : null}
          <Line type="linear" dataKey="lastYear" name={lastLabel} stroke={theme.muted} strokeDasharray="4 4" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
          <Line type="linear" dataKey="thisYear" name={thisLabel} stroke={theme.bar} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SmallSeriesChart({ name, points }: { name: string; points: DatabankPoint[] }) {
  const theme = useChartTheme();
  const lastOutturn = points.reduce((last, point, index) => (point.outturn != null ? index : last), -1);
  const data = points.map((point, index) => ({
    year: point.year,
    outturn: point.outturn,
    // Join the dashed forecast to the last outturn point so the line is continuous.
    forecast: index === lastOutturn ? point.outturn : index > lastOutturn ? point.forecast : null,
  }));
  const first = points[0]?.year;
  const last = points.at(-1)?.year;
  return (
    <figure className="border border-neutral-200 p-3 dark:border-neutral-800">
      <figcaption className="text-xs font-medium">{name}, £bn</figcaption>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 160 }}>
          <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="year" ticks={[first, last].filter((value): value is string => Boolean(value))} interval={0} tick={{ fontSize: 11, fill: theme.tick }} />
            <YAxis width={44} tick={{ fontSize: 11, fill: theme.tick }} tickCount={4} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload.find((item) => item.value != null);
                if (!value) return null;
                return (
                  <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs tabular-nums dark:border-neutral-800 dark:bg-black">
                    {label} {value.dataKey === "forecast" ? "forecast" : "outturn"} {formatBillions(Number(value.value))}
                  </div>
                );
              }}
            />
            <Line type="linear" dataKey="outturn" stroke={theme.bar} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="linear" dataKey="forecast" stroke={theme.bar} strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
