import type { Metadata } from "next";

import { ChartFrame, DataTable, datasetJsonLd, EmptySource, JsonLd, PageIntro, SourceNote, Stat } from "@/components/blocks";
import { DebtRatioChart, YieldChart } from "@/components/charts";
import { formatCount, formatGbpFromMillions, formatMonth, formatPercent } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Debt and gilts",
  description: "Public sector net debt, the debt ratio, debt interest, Bank Rate, the 10-year gilt yield and the DMO gilt portfolio.",
  alternates: { canonical: "/debt" },
};

export default async function DebtPage() {
  const onsLoaded = await readSnapshot("ons-psf");
  const boeLoaded = await readSnapshot("boe-yields");
  const dmoLoaded = await readSnapshot("dmo-gilts");
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const boe = takeSnapshot("boe-yields", boeLoaded.snapshot);
  const dmo = takeSnapshot("dmo-gilts", dmoLoaded.snapshot);
  const portfolio = dmo?.data.portfolio ?? null;
  return (
    <>
      <JsonLd
        data={datasetJsonLd({
          name: "UK public debt and gilts",
          description: "PSND, debt interest, Bank Rate, gilt yields and the DMO portfolio split.",
          path: "/debt",
          dateModified: ons?.releaseDate ?? null,
          license: SOURCES["ons-psf"].licenceUrl,
          publisher: "ONS, Bank of England, UK DMO",
          sourceUrl: SOURCES["ons-psf"].page,
        })}
      />
      <PageIntro
        kicker="Debt"
        title="Debt and gilts"
        lede="The debt stock and the debt interest bill are ONS public sector finances. Yields are the Bank of England. The gilt split is the DMO portfolio feed. Instrument-level maturity buckets appear when the D1A export is in the snapshot."
      />
      {ons ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label={ons.data.series.kse6?.latest ? `PSND ex, ${formatMonth(ons.data.series.kse6.latest.period)}` : "PSND ex"}
            value={ons.data.series.kse6?.latest ? formatGbpFromMillions(ons.data.series.kse6.latest.value) : "—"}
            detail="KSE6, £ million in the download."
          />
          <Stat
            label="Share of GDP"
            value={ons.data.series.hf6x?.latest ? formatPercent(ons.data.series.hf6x.latest.value) : "—"}
            detail={`HF6X. Excluding the Bank of England: ${ons.data.series.cpoa?.latest ? formatPercent(ons.data.series.cpoa.latest.value) : "—"} (CPOA).`}
          />
          <Stat
            label={ons.data.series.nmfx?.latest ? `Net interest, ${formatMonth(ons.data.series.nmfx.latest.period)}` : "Net interest"}
            value={ons.data.series.nmfx?.latest ? formatGbpFromMillions(ons.data.series.nmfx.latest.value) : "—"}
            detail={`NMFX. Of which interest ex uplift ${ons.data.series.jnyx?.latest ? formatGbpFromMillions(ons.data.series.jnyx.latest.value) : "—"} (JNYX) and capital uplift ${ons.data.series.jnyy?.latest ? formatGbpFromMillions(ons.data.series.jnyy.latest.value) : "—"} (JNYY).`}
          />
        </div>
      ) : (
        <EmptySource name="ONS debt" />
      )}
      {ons ? (
        <div className="mt-3">
          <ChartFrame
            title="Public sector net debt excluding banks, share of GDP"
            source={
              <SourceNote
                publisher={SOURCES["ons-psf"].publisher}
                title="HF6X"
                url={ons.sourceUrl}
                releaseDate={ons.releaseDate}
                licenceUrl={SOURCES["ons-psf"].licenceUrl}
              />
            }
          >
            <DebtRatioChart points={ons.data.series.hf6x?.months ?? []} />
          </ChartFrame>
        </div>
      ) : null}
      {boe ? (
        <div className="mt-3">
          <ChartFrame
            title="Bank Rate and the 10-year nominal par yield"
            source={
              <SourceNote
                publisher={SOURCES["boe-yields"].publisher}
                title="IUDBEDR and IUDMNPY"
                url={boe.sourceUrl}
                releaseDate={boe.releaseDate}
                licenceUrl={SOURCES["boe-yields"].licenceUrl}
                extra={`Bank Rate latest ${boe.data.series.IUDBEDR.latest?.date ?? "—"}. 10-year latest ${boe.data.series.IUDMNPY.latest?.date ?? "—"}.`}
              />
            }
          >
            <YieldChart bank={boe.data.series.IUDBEDR.points} gilt={boe.data.series.IUDMNPY.points} />
          </ChartFrame>
        </div>
      ) : (
        <div className="mt-3">
          <EmptySource name="Bank of England yields" />
        </div>
      )}
      <div className="mt-3">
        {portfolio ? (
          <ChartFrame
            title="Gilt portfolio"
            source={
              <SourceNote
                publisher={SOURCES["dmo-gilts"].publisher}
                title="GetSalesData"
                url={dmo?.sourceUrl ?? SOURCES["dmo-gilts"].page}
                releaseDate={dmo?.releaseDate ?? null}
                licenceUrl={SOURCES["dmo-gilts"].licenceUrl}
                extra={portfolio.unitNote}
              />
            }
          >
            <DataTable
              columns={["Field", "Published value"]}
              rows={[
                ["Uplifted nominal portfolio", formatCount(portfolio.rawTotal)],
                ["Conventional", formatCount(portfolio.rawConventional)],
                ["Index-linked", formatCount(portfolio.rawIndexLinked)],
                ["Index-linked share", formatPercent(portfolio.indexLinkedShare * 100)],
                ["Average maturity, years", portfolio.averageMaturityYears.toFixed(2)],
              ]}
            />
            {dmo?.data.maturity ? (
              <DataTable
                columns={["Remaining maturity", "Nominal"]}
                rows={dmo.data.maturity.buckets.map((bucket) => [bucket.label, bucket.nominal.toLocaleString("en-GB")])}
              />
            ) : (
              <p className="mt-3 text-xs text-neutral-500">
                No instrument list in this snapshot, so there is no maturity ladder. The workflow still requests DMO report D1A; this capture only kept the portfolio totals that GetSalesData returned in full.
              </p>
            )}
          </ChartFrame>
        ) : (
          <EmptySource name="DMO gilts" />
        )}
      </div>
    </>
  );
}
