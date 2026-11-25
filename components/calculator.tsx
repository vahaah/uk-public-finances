"use client";

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useMemo } from "react";

import { ChoiceSelect } from "@/components/ui/choice-select";
import { Segmented } from "@/components/ui/segmented";
import { formatRelease } from "@/lib/format";
import { coverage, equivalentValue, financialYearMean, type Observation } from "@/lib/prices";

const INDEXES = ["mnf2", "l8gg", "d7bt", "l522", "chaw"] as const;

type IndexId = (typeof INDEXES)[number];

const COPY: Record<IndexId, { label: string; fit: string }> = {
  mnf2: {
    label: "GDP deflator, calendar year",
    fit: "Best for public spending and the economy as a whole. Uses calendar years.",
  },
  l8gg: {
    label: "GDP deflator, financial year",
    fit: "As above, for April to March years, matching most government figures.",
  },
  d7bt: {
    label: "CPI",
    fit: "The main measure of household prices and the Bank of England's inflation target.",
  },
  l522: {
    label: "CPIH",
    fit: "CPI plus owner occupiers' housing costs. The ONS's lead measure of inflation.",
  },
  chaw: {
    label: "RPI",
    fit: "An older measure, no longer a national statistic. Still used for index-linked gilts and some older contracts.",
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
      <Segmented
        label="Price index"
        value={index}
        options={INDEXES.map((id) => ({ value: id, label: COPY[id].label }))}
        onChange={setIndex}
      />
      <p className="mt-4 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{COPY[index].fit}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Amount, £
          <input
            className="mt-1 h-11 w-full rounded-md border border-neutral-300 bg-white px-2 tabular-nums sm:h-9 dark:border-neutral-700 dark:bg-neutral-950"
            inputMode="decimal"
            value={amountText ?? ""}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <ChoiceSelect stacked label="Year A" value={from} options={points.map((point) => ({ value: point.period, label: point.period }))} onChange={setFrom} />
        <ChoiceSelect stacked label="Year B" value={to} options={points.map((point) => ({ value: point.period, label: point.period }))} onChange={setTo} />
      </div>
      <div className="mt-6 border border-neutral-200 p-6 dark:border-neutral-800">
        {result.ok ? (
          <p className="text-sm leading-6">
            <span className="font-sans text-3xl font-semibold tabular-nums tracking-tight">{pounds(result.value)}</span>
            <span className="mt-2 block">
              {pounds(amount)} in {from} is worth {pounds(result.value)} in {to} prices, using {COPY[index].label}.
            </span>
            <span className="mt-2 block text-sm">The index went from {result.indexFrom.toLocaleString("en-GB")} to {result.indexTo.toLocaleString("en-GB")}.</span>
          </p>
        ) : (
          <p className="text-sm leading-6">{result.reason}</p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
        {chosen.title}. Published {formatRelease(chosen.releaseDate)}.
        {span ? ` Annual observations run from ${span.first} to ${span.last}.` : ""} A year that is not in that list is not estimated.
      </p>
    </div>
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
