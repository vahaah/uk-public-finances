import Link from "next/link";

import { Breadcrumb, EmptySource, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { outcomeLabel } from "@/lib/budgets/rules";
import { loadRuleRegimes } from "@/lib/budgets/seed";
import { formatBillions, formatDateLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;

export const metadata = pageMeta({
  title: "Fiscal rules",
  description: "The fiscal rule regimes since June 2010, each with a source. Outcomes stay unassessed until a reviewed entry says otherwise.",
  path: "/budgets/rules",
});

export default async function RulesPage() {
  const regimes = loadRuleRegimes();
  const obrLoaded = await readSnapshot("budgets-obr");
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const headroom = obr?.data.headroom;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Fiscal rules", "/budgets/rules")} />
      <Breadcrumb current="Fiscal rules" parents={[{ href: "/budgets", label: "Budgets" }]} />
      <PageIntro
        kicker="Budgets"
        title="What fiscal rules has the government set itself?"
        lede={`${regimes.length} sets of rules are listed since June 2010. An outcome is shown only when the reviewed file marks it. Placeholder copy.`}
      />
      <ol className="mb-8 space-y-4 border-l border-neutral-300 pl-4 dark:border-neutral-700">
        {regimes.map((regime) => (
          <li key={regime.id}>
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
        <h2 className="mb-3 text-sm font-medium">Headroom at each event</h2>
        {headroom?.loaded ? (
          <>
            <p className="mb-3 text-sm">OBR data as of {headroom.asOf ? formatDateLong(headroom.asOf) : "the upload date"}.</p>
            <ul className="divide-y divide-neutral-200 border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
              {headroom.rows.map((row) => (
                <li key={`${row.eventDate}-${row.rule}`} className="flex justify-between gap-3 px-3 py-2">
                  <span>
                    {row.eventDate} {row.rule}
                  </span>
                  <span className="tabular-nums">{row.headroomBn == null ? "Not published" : formatBillions(row.headroomBn)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptySource name="Headroom" pending detail="OBR data not loaded. Upload manual/obr/efo-fiscal-rules.xlsx to show headroom." />
        )}
        <p className="mt-4 text-sm">
          <Link className="underline decoration-neutral-400 underline-offset-4" href="/budgets">
            Back to Budgets
          </Link>
        </p>
      </section>
    </>
  );
}
