import type { Metadata } from "next";

import { ChartFrame, DataTable, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote } from "@/components/blocks";
import { BorrowingChart, CumulativeChart } from "@/components/charts";
import { formatGbpFromMillions, formatMonth } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Borrowing and the deficit",
  description: "Monthly public sector net borrowing and the financial-year cumulative, against the same months a year earlier.",
  alternates: { canonical: "/borrowing" },
};

export default async function BorrowingPage() {
  const loaded = await readSnapshot("ons-psf");
  const snapshot = takeSnapshot("ons-psf", loaded.snapshot);
  const meta = SOURCES["ons-psf"];
  if (!snapshot) return <EmptySource name="ONS public sector finances" />;
  const fy = snapshot.data.financialYear;
  const note = (
    <SourceNote
      publisher={meta.publisher}
      title="J5II. The chart negates the download so it matches the bulletin."
      url={snapshot.sourceUrl}
      releaseDate={snapshot.releaseDate}
      licenceUrl={meta.licenceUrl}
    />
  );
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "UK public sector net borrowing",
          description: "Monthly J5II and the April-to-latest cumulative, with the previous year.",
          path: "/borrowing",
          dateModified: snapshot.releaseDate,
          license: meta.licenceUrl,
          publisher: meta.publisher,
          sourceUrl: snapshot.sourceUrl,
        })}
      />
      <PageIntro
        kicker="Borrowing"
        title="Borrowing and the deficit"
        lede={
          fy && snapshot.data.bulletinSign.financialYearBorrowing != null
            ? `Borrowing in ${fy.year} to ${formatMonth(fy.through)} was ${formatGbpFromMillions(snapshot.data.bulletinSign.financialYearBorrowing)}. The same months a year earlier were ${snapshot.data.bulletinSign.previousFinancialYearBorrowing == null ? "unpublished" : formatGbpFromMillions(snapshot.data.bulletinSign.previousFinancialYearBorrowing)}.`
            : "Monthly public sector net borrowing."
        }
      />
      <ChartFrame title="Monthly borrowing" source={note}>
        <BorrowingChart months={snapshot.data.series.j5ii?.months ?? []} />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame title={`Cumulative borrowing, ${fy?.year ?? ""}`} source={note}>
          {fy ? <CumulativeChart months={fy.months} /> : null}
          {fy ? (
            <DataTable
              columns={["Month", "Cumulative £bn", "A year earlier £bn"]}
              rows={fy.months.map((row) => [
                formatMonth(row.period),
                formatGbpFromMillions(-row.cumulative),
                row.previousCumulative == null ? "—" : formatGbpFromMillions(-row.previousCumulative),
              ])}
            />
          ) : null}
        </ChartFrame>
      </div>
    </>
  );
}
