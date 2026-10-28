"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { yearTickValues } from "@/lib/chart-time";
import { formatBillions } from "@/lib/format";

export type PorcupineLine = {
  id: string;
  name: string;
  highlight: boolean;
  points: { fy: string; value: number }[];
};

export function PorcupineChart({ outturn, vintages }: { outturn: { fy: string; value: number }[]; vintages: PorcupineLine[] }) {
  const years = [...new Set([...outturn.map((point) => point.fy), ...vintages.flatMap((line) => line.points.map((point) => point.fy))])].sort();
  const rows = years.map((fy) => {
    const row: Record<string, string | number | null> = { fy, outturn: outturn.find((point) => point.fy === fy)?.value ?? null };
    for (const line of vintages) row[line.id] = line.points.find((point) => point.fy === fy)?.value ?? null;
    return row;
  });
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 280 }}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="fy" ticks={yearTickValues(years)} interval={0} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={48} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const outturnPoint = payload.find((item) => item.dataKey === "outturn");
              const highlighted = payload.find((item) => vintages.find((line) => line.id === item.dataKey && line.highlight));
              return (
                <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs tabular-nums dark:border-neutral-800 dark:bg-black">
                  <p>{label}</p>
                  {outturnPoint?.value != null ? <p>Outturn {formatBillions(Number(outturnPoint.value))}</p> : <p>Outturn not yet due</p>}
                  {highlighted?.value != null ? <p>{highlighted.name} forecast {formatBillions(Number(highlighted.value))}</p> : null}
                </div>
              );
            }}
          />
          {vintages.map((line) => (
            <Line
              key={line.id}
              type="linear"
              dataKey={line.id}
              name={line.name}
              stroke={line.highlight ? "#1d4ed8" : "#a3a3a3"}
              strokeWidth={line.highlight ? 2 : 1}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          <Line type="linear" dataKey="outturn" name="Outturn" stroke="#111827" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
