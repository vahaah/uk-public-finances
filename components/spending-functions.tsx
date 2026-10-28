"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";

import { SpendingVisuals } from "@/components/charts";
import { formatBillions, formatPercent } from "@/lib/format";
import type { PriceBundle } from "@/lib/prices";

const SORTS = ["value-desc", "value-asc", "name-asc", "name-desc"] as const;
type Sort = (typeof SORTS)[number];
type Item = { name: string; value: number };

export function sortFunctions(items: Item[], sort: Sort): Item[] {
  const sorted = [...items];
  if (sort.startsWith("name")) sorted.sort((left, right) => cleanName(left.name).localeCompare(cleanName(right.name), "en-GB"));
  else sorted.sort((left, right) => right.value - left.value);
  if (sort.endsWith("-asc") !== sort.startsWith("name")) sorted.reverse();
  return sorted;
}

function cleanName(name: string): string {
  return name.replace(/^\d+\.\s*/, "");
}

export function SpendingFunctions(props: { items: Item[]; year: string; total: number | null; prices: PriceBundle | null }) {
  return (
    <Suspense fallback={<div className="h-80" />}>
      <SpendingFunctionsInner {...props} />
    </Suspense>
  );
}

function SpendingFunctionsInner({ items, year, total, prices }: { items: Item[]; year: string; total: number | null; prices: PriceBundle | null }) {
  const [sort, setSort] = useQueryState("sort", parseAsStringLiteral(SORTS).withDefault("value-desc"));
  const rows = sortFunctions(items, sort);
  const column = sort.startsWith("name") ? "name" : "value";
  const ariaSort = (key: "name" | "value") =>
    column !== key ? "none" : sort.endsWith("asc") ? "ascending" : "descending";
  const toggle = (key: "name" | "value") => {
    if (column !== key) void setSort(key === "value" ? "value-desc" : "name-asc");
    else void setSort(key === "value" ? (sort === "value-desc" ? "value-asc" : "value-desc") : sort === "name-asc" ? "name-desc" : "name-asc");
  };
  const header = (key: "name" | "value", label: string, right: boolean) => (
    <th
      scope="col"
      aria-sort={ariaSort(key)}
      className={`h-9 border-b border-neutral-200 pr-3 text-xs font-medium text-neutral-900 dark:border-neutral-800 dark:text-neutral-100 ${right ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => toggle(key)}
        className="-mx-2 inline-flex h-11 items-center gap-1 rounded px-2 hover:bg-neutral-100 focus-visible:ring-2 dark:hover:bg-neutral-900"
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {column !== key ? "↕" : sort.endsWith("asc") ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
  return (
    <>
      <SpendingVisuals items={rows.filter((item) => item.value > 0)} year={year} prices={prices} keepOrder />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left font-sans text-sm tabular-nums">
          <thead>
            <tr>
              {header("name", "Function", false)}
              {header("value", "£bn", true)}
              {header("value", "Share of total", true)}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.name} className="h-9 border-b border-neutral-200 dark:border-neutral-800">
                <td className="pr-3">{cleanName(item.name)}</td>
                <td className="pr-3 text-right">{formatBillions(item.value)}</td>
                <td className="pr-3 text-right">{total ? formatPercent((item.value / total) * 100) : "—"}</td>
              </tr>
            ))}
            {total ? (
              <tr className="h-9 border-b border-neutral-200 font-medium dark:border-neutral-800">
                <td className="pr-3">Total</td>
                <td className="pr-3 text-right">{formatBillions(total)}</td>
                <td className="pr-3 text-right">{formatPercent(100)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
