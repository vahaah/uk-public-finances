"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";

import { Sparkline } from "@/components/blocks";
import { reconcileSignedDisplay } from "@/lib/display-rounding";

export type EquationTrend = { values: number[]; label: string };
export type EquationTrends = { spending: EquationTrend; receipts: EquationTrend; borrowing: EquationTrend };

export type EquationView = {
  periodLabel: string;
  spendingBn: number;
  receiptsBn: number;
  borrowingBn: number;
  caption: string;
  spoken: string;
};

export function EquationRow({ month, yearToDate, trends }: { month: EquationView; yearToDate: EquationView; trends?: EquationTrends }) {
  return (
    <Suspense fallback={<div className="h-40 border border-neutral-200 dark:border-neutral-800" />}>
      <EquationRowInner month={month} yearToDate={yearToDate} trends={trends} />
    </Suspense>
  );
}

function EquationRowInner({ month, yearToDate, trends }: { month: EquationView; yearToDate: EquationView; trends?: EquationTrends }) {
  const [which, setWhich] = useQueryState("eq", parseAsStringLiteral(["month", "ytd"] as const).withDefault("month"));
  const view = which === "ytd" ? yearToDate : month;
  const rounded = reconcileSignedDisplay([
    { key: "spending", amount: view.spendingBn, sign: 1 },
    { key: "receipts", amount: view.receiptsBn, sign: -1 },
  ]);
  const spending = rounded.displayed.spending ?? 0;
  const receipts = rounded.displayed.receipts ?? 0;
  const borrowing = Number((spending - receipts).toFixed(1));
  return (
    <section className="border border-neutral-200 p-6 dark:border-neutral-800" data-balanced={rounded.balanced ? "true" : "false"}>
      <div className="mb-4 inline-flex rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700" role="group">
        <button type="button" aria-pressed={which === "month"} className={chip(which === "month")} onClick={() => setWhich("month")}>
          {month.periodLabel}
        </button>
        <button type="button" aria-pressed={which === "ytd"} className={chip(which === "ytd")} onClick={() => setWhich("ytd")}>
          Year to date
        </button>
      </div>
      <div className="hidden items-end gap-x-4 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Term label="Spending" value={spending} trend={trends?.spending} />
        <Operator symbol="−" />
        <Term label="Receipts" value={receipts} trend={trends?.receipts} />
        <Operator symbol="=" />
        <Term label="Borrowing" value={borrowing} trend={trends?.borrowing} />
      </div>
      <dl className="divide-y divide-neutral-200 lg:hidden dark:divide-neutral-800">
        <Ledger label="Spending" value={spending} trend={trends?.spending} />
        <Ledger label="Receipts" value={receipts} trend={trends?.receipts} />
        <Ledger label="Borrowing" value={borrowing} trend={trends?.borrowing} />
      </dl>
      <p className="sr-only">{view.spoken}</p>
      <p className="mt-4 text-sm text-neutral-800 dark:text-neutral-200">
        {view.caption}
        {rounded.balanced ? "" : " Rounded figures may not add up exactly."}
      </p>
    </section>
  );
}

function signedBillions(value: number): string {
  const text = Math.abs(value).toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return value < 0 ? `−£${text}` : `£${text}`;
}

function chip(on: boolean): string {
  return `h-11 min-w-11 px-3 text-xs ${on ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-white" : "text-neutral-800 dark:text-neutral-200"}`;
}

function Term({ label, value, trend }: { label: string; value: number; trend?: EquationTrend }) {
  return (
    <div>
      <p className="text-sm text-neutral-800 dark:text-neutral-200">{label}</p>
      <p className="mt-1 font-sans text-4xl font-semibold tabular-nums tracking-tight">
        {signedBillions(value)}
        <span className="ml-1 text-[0.6875rem] font-normal">bn</span>
      </p>
      {trend ? <Sparkline values={trend.values} label={trend.label} className="mt-3" /> : null}
    </div>
  );
}

function Operator({ symbol }: { symbol: string }) {
  return <p className="pb-2 text-2xl text-neutral-900 dark:text-neutral-100">{symbol}</p>;
}

function Ledger({ label, value, trend }: { label: string; value: number; trend?: EquationTrend }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-sm">{label}</dt>
      {trend ? (
        <dd className="w-24 shrink-0">
          <Sparkline values={trend.values} label={trend.label} className="" />
        </dd>
      ) : null}
      <dd className="text-xl font-semibold tabular-nums">
        {signedBillions(value)}bn
      </dd>
    </div>
  );
}
