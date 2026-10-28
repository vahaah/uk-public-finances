import Link from "next/link";

import { DebtRatioChart, YieldChart } from "@/components/charts";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, Stat, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { formatDateLong, formatGbpFromMillions, formatMonthLong, formatPercent, formatRelease } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { loadHealth, readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK national debt, debt interest and gilts",
  description:
    "UK public sector net debt in pounds and as a share of GDP, debt interest, Bank Rate, the 10-year gilt yield and gilts in issue. From the ONS, the Bank of England and the DMO.",
  path: "/debt",
});

export default async function DebtPage() {
  const [onsLoaded, boeLoaded, dmoLoaded, health] = await Promise.all([
    readSnapshot("ons-psf"),
    readSnapshot("boe-yields"),
    readSnapshot("dmo-gilts"),
    loadHealth(),
  ]);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const boe = takeSnapshot("boe-yields", boeLoaded.snapshot);
  const dmo = takeSnapshot("dmo-gilts", dmoLoaded.snapshot);
  const boeHealth = health.sources.find((source) => source.source === "boe-yields");
  const stale = boeHealth?.stale ? formatRelease(boeHealth.releaseDate) : null;
  const portfolio = dmo?.data.portfolio ?? null;
  const month = ons?.data.series.kse6?.latest?.period;
  const interest = ons?.data.series.nmfx?.latest;
  const exUplift = ons?.data.series.jnyx?.latest;
  const uplift = ons?.data.series.jnyy?.latest;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("UK national debt, debt interest and gilts", "/debt")} />
      <JsonLd
        data={datasetJsonLd({
          path: "/debt",
          name: "UK public sector net debt, debt interest and gilts",
          description:
            "Public sector net debt in pounds and as a share of GDP, central government net interest, Bank Rate, the 10-year gilt yield and the DMO gilt portfolio. Licences differ by publisher.",
          keywords: ["UK national debt", "debt to GDP", "gilt yield", "Bank Rate"],
          temporalCoverage: month ? `1993-01/${month}` : "1993-01/2026-09",
          variableMeasured: ["PSND ex (KSE6, HF6X)", "PSND ex banks ex BoE (CPOA)", "Central government net interest (NMFX)", "Bank Rate", "10-year gilt yield"],
          dateModified: ons?.releaseDate ?? null,
          sources: [
            { id: "ons-psf", name: SOURCES["ons-psf"].title, url: ons?.sourceUrl ?? SOURCES["ons-psf"].page, publisher: SOURCES["ons-psf"].publisher, licenceUrl: SOURCES["ons-psf"].licenceUrl, releaseDate: ons?.releaseDate ?? null },
            { id: "boe-yields", name: SOURCES["boe-yields"].title, url: boe?.sourceUrl ?? SOURCES["boe-yields"].page, publisher: SOURCES["boe-yields"].publisher, licenceUrl: SOURCES["boe-yields"].licenceUrl, releaseDate: boe?.releaseDate ?? null },
            { id: "dmo-gilts", name: SOURCES["dmo-gilts"].title, url: dmo?.sourceUrl ?? SOURCES["dmo-gilts"].page, publisher: SOURCES["dmo-gilts"].publisher, licenceUrl: SOURCES["dmo-gilts"].licenceUrl, releaseDate: dmo?.releaseDate ?? null },
          ],
        })}
      />
      <Breadcrumb current="Debt and gilts" />
      <PageIntro
        kicker="Public sector finances"
        title="UK national debt, debt interest and gilts"
        lede={
          <>
            Public sector net debt and central government net interest come from the ONS. Bank Rate and gilt yields come from the Bank of England. Gilts in issue come from the UK Debt Management Office. Borrowing, which adds to the debt, is on{" "}
            <Link className="underline decoration-neutral-500 underline-offset-4" href="/borrowing">
              borrowing
            </Link>
            .
          </>
        }
      />
      {ons && month ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label={`Net debt at end of ${formatMonthLong(month)}`}
            value={ons.data.series.kse6?.latest ? formatGbpFromMillions(ons.data.series.kse6.latest.value) : "Not available"}
            detail="Public sector net debt, excluding public sector banks. Provisional."
          />
          <Stat
            label="Net debt as a share of GDP"
            value={ons.data.series.hf6x?.latest ? `${formatPercent(ons.data.series.hf6x.latest.value)} of GDP` : "Not available"}
            detail={
              ons.data.series.cpoa?.latest
                ? `Excluding the Bank of England as well: ${formatPercent(ons.data.series.cpoa.latest.value)} of GDP.`
                : "Excluding public sector banks."
            }
          />
          <Stat
            label={interest ? `Net interest payable in ${formatMonthLong(interest.period)}` : "Net interest payable"}
            value={interest ? formatGbpFromMillions(interest.value) : "Not available"}
            detail={
              exUplift && uplift
                ? `Central government net interest payable. Of this, ${formatGbpFromMillions(exUplift.value)} is interest and ${formatGbpFromMillions(uplift.value)} is the inflation uplift on index-linked gilts.`
                : "Central government net interest payable."
            }
          />
        </div>
      ) : (
        <EmptySource name="ONS debt figures" />
      )}
      {ons ? (
        <div className="mt-3">
          <ChartFrame
            title="Public sector net debt excluding public sector banks, % of GDP"
            subtitle="Percentage of GDP."
            source={
              <SourceNote
                publisher={SOURCES["ons-psf"].publisher}
                title="Public sector net debt excluding public sector banks as a percentage of GDP (HF6X)"
                url={ons.sourceUrl}
                releaseDate={ons.releaseDate}
                licenceUrl={SOURCES["ons-psf"].licenceUrl}
                sourceId="ons-psf"
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
            title="Bank Rate and the 10-year gilt yield"
            subtitle="Percent."
            stale={stale}
            source={
              <SourceNote
                publisher={SOURCES["boe-yields"].publisher}
                title="Bank Rate (IUDBEDR) and 10-year nominal par gilt yield (IUDMNPY)"
                url={boe.sourceUrl}
                releaseDate={boe.releaseDate}
                licenceUrl={SOURCES["boe-yields"].licenceUrl}
                sourceId="boe-yields"
                extra={`Latest Bank Rate: ${formatDateLong(boe.data.series.IUDBEDR.latest?.date ?? null)}. Latest gilt yield: ${formatDateLong(boe.data.series.IUDMNPY.latest?.date ?? null)}.`}
              />
            }
          >
            <YieldChart bank={boe.data.series.IUDBEDR.points} gilt={boe.data.series.IUDMNPY.points} />
          </ChartFrame>
        </div>
      ) : (
        <div className="mt-3">
          <EmptySource name="Bank of England interest rates" />
        </div>
      )}
      <div className="mt-3">
        {portfolio ? (
          <ChartFrame
            title="Gilts in issue by type"
            source={
              <SourceNote
                publisher={SOURCES["dmo-gilts"].publisher}
                title="Gilts in issue"
                url={dmo?.sourceUrl ?? SOURCES["dmo-gilts"].page}
                releaseDate={dmo?.releaseDate ?? null}
                licenceUrl={SOURCES["dmo-gilts"].licenceUrl}
                sourceId="dmo-gilts"
                extra="Values are the DMO fields as published. This site does not rescale them, because the unit is not stated in the feed."
              />
            }
          >
            <DataTable
              columns={["Measure", "Published value"]}
              rows={[
                ["Total uplifted nominal portfolio", portfolio.rawTotal.toLocaleString("en-GB", { maximumFractionDigits: 1 })],
                ["Conventional gilts", portfolio.rawConventional.toLocaleString("en-GB", { maximumFractionDigits: 1 })],
                ["Index-linked gilts", portfolio.rawIndexLinked.toLocaleString("en-GB", { maximumFractionDigits: 1 })],
                ["Index-linked share of total", formatPercent(portfolio.indexLinkedShare * 100)],
                ["Average time to maturity, years", portfolio.averageMaturityYears.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })],
                ["Conventional portfolio yield", portfolio.conventionalYield == null ? "—" : formatPercent(portfolio.conventionalYield)],
                ["Index-linked portfolio yield", portfolio.indexLinkedYield == null ? "—" : formatPercent(portfolio.indexLinkedYield)],
              ]}
            />
            <div className="mt-4">
              <EmptySource name="A breakdown of gilts by maturity" />
            </div>
          </ChartFrame>
        ) : (
          <EmptySource name="DMO gilts" />
        )}
      </div>
    </>
  );
}
