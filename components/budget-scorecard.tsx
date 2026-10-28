"use client";

import Link from "next/link";
import { useState } from "react";

import { eventLabel } from "@/lib/budgets/events";
import { formatSignedDifference } from "@/lib/budgets/compare";
import type { YearAheadComparison } from "@/lib/budgets/view";
import { formatBillions } from "@/lib/format";

export function BudgetScorecard({ rows, ruleLabel }: { rows: YearAheadComparison[]; ruleLabel: string }) {
  const [sort, setSort] = useState<"newest" | "error">("newest");
  const ordered = [...rows].sort((left, right) => {
    if (sort === "error") return Math.abs(right.difference ?? -1) - Math.abs(left.difference ?? -1);
    return right.event.date.localeCompare(left.event.date);
  });
  return (
    <div>
      <div className="mb-3 flex gap-2" role="group" aria-label="Sort the scorecard">
        <SortButton on={sort === "newest"} onClick={() => setSort("newest")} label="Newest" />
        <SortButton on={sort === "error"} onClick={() => setSort("error")} label="Largest difference" />
      </div>
      <p className="sr-only" aria-live="polite">
        Sorted by {sort === "newest" ? "newest" : "largest difference"}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm tabular-nums">
          <caption className="sr-only">Year-ahead borrowing forecast and outturn for each fiscal event</caption>
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
              <th scope="col" className="py-2 pr-3">Event</th>
              <th scope="col" className="py-2 pr-3">Date</th>
              <th scope="col" className="py-2 pr-3">Chancellor</th>
              <th scope="col" className="py-2 pr-3">Year ahead</th>
              <th scope="col" className="py-2 pr-3">Forecast £bn</th>
              <th scope="col" className="py-2 pr-3">Outturn £bn</th>
              <th scope="col" className="py-2 pr-3">Difference £bn</th>
              <th scope="col" className="py-2">Main rule</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr key={row.event.slug} className="border-b border-neutral-200 dark:border-neutral-800">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  <Link className="underline decoration-neutral-400 underline-offset-4" href={`/budgets/${row.event.slug}`}>
                    {eventLabel(row.event)}
                  </Link>
                </th>
                <td className="py-2 pr-3">{row.event.dateStatus === "verified" ? row.event.date : "Not confirmed"}</td>
                <td className="py-2 pr-3">{row.event.chancellor}</td>
                <td className="py-2 pr-3">{row.fy}</td>
                {row.event.obrForecast === "no" ? (
                  <td className="py-2 pr-3" colSpan={3}>
                    No OBR forecast
                  </td>
                ) : (
                  <>
                    <td className="py-2 pr-3">{row.forecast == null ? "OBR data not loaded" : formatBillions(row.forecast)}</td>
                    <td className="py-2 pr-3">{row.due ? (row.outturn == null ? "Not yet due" : formatBillions(row.outturn)) : "Not yet due"}</td>
                    <td className="py-2 pr-3">
                      {row.difference == null
                        ? row.forecast == null
                          ? "OBR forecasts not loaded yet"
                          : "Not yet due"
                        : `${formatSignedDifference(row.difference, "bn")} ${row.direction === "over" ? "Over-forecast" : row.direction === "under" ? "Under-forecast" : "Matched the outturn"}`}
                      {row.basisChanged && row.difference != null ? (
                        <span className="ml-2 inline-flex h-5 items-center rounded-full border border-neutral-300 px-2 text-xs dark:border-neutral-700" title="Forecast made before the September 2019 ONS changes to how borrowing is measured. Not like for like.">
                          Basis changed
                        </span>
                      ) : null}
                    </td>
                  </>
                )}
                <td className="py-2">{ruleLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
        Replaced rules are not counted as met or missed. Events with no OBR forecast, years that have not ended and rows marked Basis changed are left out of the median. Basis changed means the forecast was made before the September 2019 ONS changes to how borrowing is measured.
      </p>
    </div>
  );
}

function SortButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={on} className={`h-9 rounded-full border px-3 text-xs ${on ? "border-neutral-950 font-medium dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`} onClick={onClick}>
      {label}
    </button>
  );
}
