import type { DeflatorId } from "@/lib/prices";

export type ChartTooltipRow = {
  name: string;
  value: string;
  today?: string | null;
  deflator?: DeflatorId | null;
};

/** Shared chart tooltip. A today-prices line is rendered under a nominal money figure when the caller supplies one. */
export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: ChartTooltipRow[];
}) {
  if (!active || rows.length === 0) return null;
  const deflator = rows.find((row) => row.today && row.deflator)?.deflator ?? null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-sm tabular-nums dark:border-neutral-800 dark:bg-black">
      {label ? <p>{label}</p> : null}
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`}>
          <p>
            {row.name} {row.value}
          </p>
          {row.today ? <p data-today-prices>{row.today}</p> : null}
        </div>
      ))}
      {deflator ? <p className="text-neutral-700 dark:text-neutral-300">GDP deflator, {deflator}.</p> : null}
    </div>
  );
}
