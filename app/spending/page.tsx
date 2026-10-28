import type { Metadata } from "next";

import { ChartFrame, DataTable, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote } from "@/components/blocks";
import { DepartmentChart, SpendingVisuals } from "@/components/charts";
import { formatBillions, formatMillions } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Where it goes",
  description: "PESA spending on services by function, and central government DEL by department.",
  alternates: { canonical: "/spending" },
};

export default async function SpendingPage() {
  const loaded = await readSnapshot("pesa");
  const snapshot = takeSnapshot("pesa", loaded.snapshot);
  const meta = SOURCES.pesa;
  if (!snapshot) return <EmptySource name="PESA" />;
  const { functions, departments, departmentPlans } = snapshot.data;
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "PESA spending by function and department",
          description: `Public sector expenditure on services in ${functions.year} and departmental DEL.`,
          path: "/spending",
          dateModified: snapshot.releaseDate,
          license: meta.licenceUrl,
          publisher: meta.publisher,
          sourceUrl: snapshot.sourceUrl,
        })}
      />
      <PageIntro
        kicker="Spending"
        title="Where it goes"
        lede={`Public sector expenditure on services was ${functions.totalServices == null ? "unpublished" : formatBillions(functions.totalServices)} in ${functions.year}. Total managed expenditure in the same table was ${functions.totalManagedExpenditure == null ? "unpublished" : formatBillions(functions.totalManagedExpenditure)}. Debt interest is inside general public services.`}
      />
      <ChartFrame
        title={`Spending on services by function, ${functions.year}`}
        source={
          <SourceNote
            publisher={meta.publisher}
            title="PESA table 4.2, £ billion"
            url={snapshot.sourceUrl}
            releaseDate={snapshot.releaseDate}
            licenceUrl={meta.licenceUrl}
            extra="Top-level functions only. EU transactions are outside the ten functions and are omitted when negative."
          />
        }
      >
        <SpendingVisuals items={functions.items.filter((item) => item.value > 0)} />
        <DataTable
          columns={["Function", "£ billion"]}
          rows={functions.items.map((item) => [item.name, item.value.toLocaleString("en-GB")])}
        />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame
          title="Central government own expenditure within DEL"
          source={
            <SourceNote
              publisher={meta.publisher}
              title={`PESA table 6.1. Outturn total ${departments.total == null ? "—" : formatMillions(departments.total)}.`}
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
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
