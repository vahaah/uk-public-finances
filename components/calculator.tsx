"use client";

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useMemo } from "react";

import { coverage, equivalentValue, financialYearMean, type Observation } from "@/lib/prices";

const INDEXES = ["mnf2", "l8gg", "d7bt", "l522", "chaw"] as const;

type IndexId = (typeof INDEXES)[number];

const COPY: Record<IndexId, { label: string; fit: string }> = {
  mnf2: {
    label: "GDP deflator, calendar year",
    fit: "Best for comparing public spending or tax across calendar years. ONS series MNF2.",
  },
  l8gg: {
    label: "GDP deflator, financial year",
    fit: "Use this for a financial year (April to March) of public spending. Each year is the average of ONS series L8GG for Q2, Q3, Q4 and the next Q1. HM Treasury takes its financial-year deflator from L8GG.",
  },
  d7bt: {
    label: "CPI",
    fit: "Use this for household prices of consumer goods and services. It is ONS series D7BT, the CPI all-items index, 2015=100.",
  },
  l522: {
    label: "CPIH",
    fit: "Use this for household prices including owner-occupiers' housing costs. It is ONS series L522, the CPIH all-items index, 2015=100.",
  },
  chaw: {
    label: "RPI",
    fit: "RPI is used for index-linked gilts and some older contracts. ONS series CHAW.",
  },
};

export function OldMoneyCalculator({
  series,
}: {
  series: Record<IndexId, { title: string; releaseDate: string; points: Observation[]; quarters?: Observation[] }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm">Loading the calculator.</p>}>
      <CalculatorInner series={series} />
    </Suspense>
  );
}

function CalculatorInner({
  series,
}: {
  series: Record<IndexId, { title: string; releaseDate: string; points: Observation[]; quarters?: Observation[] }>;
}) {
  const [index, setIndex] = useQueryState("index", parseAsStringLiteral(INDEXES).withDefault("mnf2"));
  const [amountText, setAmount] = useQueryState("amount", parseAsString.withDefault("100"));
  const [from, setFrom] = useQueryState("from", parseAsString.withDefault("2000"));
  const [to, setTo] = useQueryState("to", parseAsString.withDefault("2025"));
  const chosen = series[index];
  const points = useMemo(() => indexPoints(index, chosen), [index, chosen]);
  const span = coverage(points);
  const amount = Number(amountText);
  const result = Number.isFinite(amount)
    ? equivalentValue({ amount, from: from ?? "", to: to ?? "", index: points })
    : { ok: false as const, reason: "Enter an amount.", first: span?.first ?? null, last: span?.last ?? null };
  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {INDEXES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === index}
            className={`h-7 rounded-md border px-2.5 text-xs ${id === index ? "border-neutral-950 bg-neutral-100 font-medium dark:border-white dark:bg-neutral-800" : "border-neutral-300 dark:border-neutral-700"}`}
            onClick={() => setIndex(id)}
          >
            {COPY[id].label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{COPY[index].fit}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Amount, £
          <input
            className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-white px-2 tabular-nums dark:border-neutral-700 dark:bg-neutral-950"
            inputMode="decimal"
            value={amountText ?? ""}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <YearSelect label="Year A" value={from ?? ""} years={points.map((point) => point.period)} onChange={setFrom} />
        <YearSelect label="Year B" value={to ?? ""} years={points.map((point) => point.period)} onChange={setTo} />
      </div>
      <div className="mt-6 border border-neutral-200 p-6 dark:border-neutral-800">
        {result.ok ? (
          <p className="text-sm leading-6">
            <span className="font-sans text-3xl font-semibold tabular-nums tracking-tight">{pounds(result.value)}</span>
            <span className="mt-2 block">
              {pounds(amount)} in {from} is worth {pounds(result.value)} in {to} prices. The index {result.indexTo >= result.indexFrom ? "rose" : "fell"} from {result.indexFrom.toLocaleString("en-GB")} to {result.indexTo.toLocaleString("en-GB")}.
            </span>
          </p>
        ) : (
          <p className="text-sm leading-6">{result.reason}</p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
        {chosen.title}. Published {chosen.releaseDate.slice(0, 10)}.
        {span ? ` Annual observations run from ${span.first} to ${span.last}.` : ""} A year that is not in that list is not estimated.
      </p>
    </div>
  );
}

function YearSelect({
  label,
  value,
  years,
  onChange,
}: {
  label: string;
  value: string;
  years: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <select
        className="mt-1 h-9 w-full rounded-md border border-neutral-300 bg-white px-2 dark:border-neutral-700 dark:bg-neutral-950"
        value={years.includes(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose a year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}

function indexPoints(
  index: IndexId,
  chosen: { points: Observation[]; quarters?: Observation[] },
): Observation[] {
  if (index !== "l8gg") return chosen.points;
  const quarters = chosen.quarters ?? [];
  const starts = new Set<number>();
  for (const quarter of quarters) {
    const year = Number(quarter.period.slice(0, 4));
    if (quarter.period.endsWith("Q2")) starts.add(year);
  }
  return [...starts]
    .sort((left, right) => left - right)
    .flatMap((start) => {
      const value = financialYearMean(quarters, start);
      if (value == null) return [];
      const end = String(start + 1).slice(2);
      return [{ period: `${start}-${end}`, value }];
    });
}

function pounds(value: number): string {
  const formatted = Math.abs(value).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value < 0 ? "−" : ""}£${formatted}`;
}
