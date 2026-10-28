import Link from "next/link";

import { DepartmentChart, SpendingVisuals } from "@/components/charts";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatBillions, formatGbpFromMillions } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK government spending by function and department",
  description:
    "What the UK government spends money on: health, pensions and welfare, education, defence and debt interest, from HM Treasury PESA, with departmental budgets.",
  path: "/spending",
});

export default async function SpendingPage() {
  const loaded = await readSnapshot("pesa");
  const snapshot = takeSnapshot("pesa", loaded.snapshot);
  const meta = SOURCES.pesa;
  if (!snapshot) return <EmptySource name="PESA spending" />;
  const { functions, departments, departmentPlans } = snapshot.data;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("What the UK government spends", "/spending")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/spending",
          name: "UK public spending by function and department (PESA)",
          description: `Public sector expenditure on services in ${functions.year} and central government departmental expenditure limits, from HM Treasury PESA 2026.`,
          keywords: ["UK government spending", "NHS spending", "PESA"],
          temporalCoverage: "2025-04/2026-03",
          variableMeasured: ["Expenditure on services by COFOG function", "DEL by department"],
          dateModified: snapshot.releaseDate,
          sources: [{ id: "pesa", name: meta.title, url: snapshot.sourceUrl, publisher: meta.publisher, licenceUrl: meta.licenceUrl, releaseDate: snapshot.releaseDate }],
        })}
      />
      <Breadcrumb current="Spending" />
      <PageIntro
        kicker="HM Treasury PESA"
        title="What the UK government spends"
        lede={
          <>
            <p>
              In {functions.year}, public sector spending on services was {functions.totalServices == null ? "not available" : formatBillions(functions.totalServices)}. Total managed expenditure, which also includes items not allocated to a function, was {functions.totalManagedExpenditure == null ? "not available" : formatBillions(functions.totalManagedExpenditure)}. Public sector debt interest is counted within general public services.
            </p>
            <p className="mt-2">
              Outturn is money already spent. Plans are amounts set for later years and can change. Receipts are on{" "}
              <Link className="underline decoration-neutral-500 underline-offset-4" href="/receipts">
                where UK tax comes from
              </Link>
              .
            </p>
          </>
        }
      />
      <ChartFrame
        title={`Spending on services by function, ${functions.year}`}
        subtitle="£ billion."
        source={
          <SourceNote
            publisher={meta.publisher}
            title="Public Expenditure Statistical Analyses (PESA), table 4.2"
            url={snapshot.sourceUrl}
            releaseDate={snapshot.releaseDate}
            licenceUrl={meta.licenceUrl}
            extra="Top-level functions only. EU transactions are left out of the chart when they are negative."
            sourceId="pesa"
          />
        }
      >
        <SpendingVisuals items={functions.items.filter((item) => item.value > 0)} />
        <DataTable
          columns={["Function", "£bn"]}
          rows={functions.items.map((item) => [item.name.replace(/^\d+\.\s*/, ""), item.value.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })])}
        />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame
          title="Departmental budgets (DEL) by department"
          subtitle="£ billion. Central government own expenditure within departmental expenditure limits."
          source={
            <SourceNote
              publisher={meta.publisher}
              title={`PESA table 6.1. Outturn total ${departments.total == null ? "not available" : formatGbpFromMillions(departments.total)}.`}
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="pesa"
            />
          }
        >
          <DepartmentChart
            outturn={{ year: departments.year, items: departments.items }}
            plans={{ year: departmentPlans.year, items: departmentPlans.items }}
          />
        </ChartFrame>
      </div>
    </>
  );
}
