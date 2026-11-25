import Link from "next/link";

import { BudgetCaveats } from "@/components/budget-caveats";
import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { outcomeLabel, reviewedHeadroom } from "@/lib/budgets/rules";
import { loadRuleRegimes } from "@/lib/budgets/seed";
import { formatBillions, formatDateLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { PAGE_COPY } from "@/lib/page-copy";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;

export const metadata = pageMeta({
  title: PAGE_COPY.rules.title,
  description: PAGE_COPY.rules.description,
  path: "/budgets/rules",
});

export default async function RulesPage() {
  const regimes = loadRuleRegimes();
  const obrLoaded = await readSnapshot("budgets-obr");
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const uploaded = obr?.data.headroom;
  const fromWorkbook = Boolean(uploaded?.loaded && uploaded.rows.length > 0);
  const headroomRows =
    uploaded?.loaded && uploaded.rows.length > 0
      ? uploaded.rows.map((row) => ({ ...row, source: null as string | null }))
      : reviewedHeadroom(regimes);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Fiscal rules", "/budgets/rules", [{ href: "/budgets", label: "Budgets" }])} />
      <Breadcrumb current="Fiscal rules" parents={[{ href: "/budgets", label: "Budgets" }]} />
      <PageIntro
        kicker="Budgets"
        title="What are the UK's fiscal rules, and how much headroom is there?"
        lede={rulesLede(regimes.length, regimes.at(-1)?.name ?? null, headroomRows)}
      />
      <h2 className="mb-3 text-sm font-medium">Fiscal rules over time</h2>
      <ol className="mb-8 space-y-4 border-l border-neutral-300 pl-4 dark:border-neutral-700">
        {regimes.map((regime) => (
          <li key={regime.id} id={regime.id} className="scroll-mt-20">
            <p className="text-sm font-medium">{regime.name}</p>
            <p className="text-xs text-neutral-700 dark:text-neutral-300">
              <time dateTime={regime.from}>{regime.from}</time>
              {regime.to ? ` to ${regime.to}` : " onward"}
            </p>
            <ul className="mt-2 space-y-2">
              {regime.rules.map((rule) => (
                <li key={rule.id} className="text-sm">
                  <span className="font-medium">{rule.name}. </span>
                  {rule.metric} Target: {rule.target}. {outcomeLabel(rule.outcome)}.{" "}
                  <a className="underline decoration-neutral-400 underline-offset-4" href={rule.source}>
                    Source
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <section>
        <h2 className="mb-3 text-sm font-medium">How much room did each Budget leave?</h2>
        {fromWorkbook ? (
          <p className="mb-3 text-sm">Margin against each rule in its target year, from Table 7.1 of the OBR Economic and fiscal outlook. OBR data as of {uploaded?.asOf ? formatDateLong(uploaded.asOf) : "the upload date"}.</p>
        ) : (
          <p className="mb-3 text-sm">
            Headroom comes from the OBR&apos;s fiscal targets table (Table 7.1 of the Economic and fiscal outlook). It is not loaded yet, so no figure is shown.
          </p>
        )}
        <ul className="divide-y divide-neutral-200 border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
          {headroomRows.map((row) => (
            <li key={`${row.eventDate}-${row.rule}`} className="flex justify-between gap-3 px-3 py-2">
              <span>
                {row.eventDate} {row.rule}
                {row.source ? (
                  <>
                    {" "}
                    <a className="underline decoration-neutral-400 underline-offset-4" href={row.source}>
                      Source
                    </a>
                  </>
                ) : null}
              </span>
              <span className="tabular-nums">{row.headroomBn == null ? "Not published" : formatBillions(row.headroomBn)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-700 dark:text-neutral-300">Rules replaced before their target year are not counted as met or missed.</p>
        <BudgetCaveats />
        <p className="mt-4 text-sm">
          <Link className="underline decoration-neutral-400 underline-offset-4" href="/budgets">
            Back to Budgets
          </Link>
        </p>
      </section>
    </>
  );
}

function rulesLede(count: number, current: string | null, rows: { eventDate: string | null; rule: string; headroomBn: number | null }[]): string {
  const latest = [...rows].reverse().find((row) => row.headroomBn != null && row.eventDate);
  const sets = `There have been ${count} sets of UK fiscal rules since June 2010${current ? `. The current set is the ${current}` : ""}.`;
  if (!latest || latest.headroomBn == null || !latest.eventDate) return `${sets} Headroom against each rule is shown when the OBR's fiscal targets table is loaded.`;
  return `At ${latest.eventDate}, the OBR put headroom against the ${latest.rule} rule at ${formatBillions(latest.headroomBn)}. ${sets}`;
}
