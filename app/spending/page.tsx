import { TopicStory } from "@/components/topic-story";
import { DepartmentsRealFigure, PerPersonFigure, PerPupilFigure } from "@/components/spending-figures";
import { StoryStepper } from "@/components/story-stepper";
import Link from "next/link";

import { SpendingFunctions } from "@/components/spending-functions";
import { CiteShare } from "@/components/cite-share";
import { DepartmentChart, HistoryChart, FunctionMixChart } from "@/components/lazy-charts";
import { JumpTo } from "@/components/jump-to";
import { RelatedPages } from "@/components/related-pages";
import { WhenVisible } from "@/components/when-visible";
import { Breadcrumb, ChartFrame, DataTable, EmptySource, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd, datasetJsonLd } from "@/components/blocks";
import { fiscalMarkers } from "@/lib/budgets/markers";
import { formatBillions, formatGbpFromMillions, formatPercent } from "@/lib/format";
import { functionMix, realFunctionGrowth } from "@/lib/mix";
import { SITE_URL } from "@/lib/site";
import { PersonalTaxNote } from "@/components/personal-tax-note";
import { pageMeta } from "@/lib/meta";
import { PAGE_COPY } from "@/lib/page-copy";
import { shareCard } from "@/lib/share-card";
import { priceBundle } from "@/lib/prices";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export async function generateMetadata() {
  const card = await shareCard("/spending");
  return pageMeta({
    title: PAGE_COPY.spending.title,
    description: card?.description ?? PAGE_COPY.spending.description,
    path: "/spending",
    og: card ? { kicker: card.kicker, title: card.sentence, alt: card.sentence, version: card.version } : undefined,
  });
}

export default async function SpendingPage() {
  const [loaded, priceLoaded, markers] = await Promise.all([readSnapshot("pesa"), readSnapshot("ons-prices"), fiscalMarkers()]);
  const snapshot = takeSnapshot("pesa", loaded.snapshot);
  const prices = takeSnapshot("ons-prices", priceLoaded.snapshot);
  const bundle = prices ? priceBundle(prices.data) : null;
  const meta = SOURCES.pesa;
  if (!snapshot) return <EmptySource name="PESA spending" />;
  const { functions, departments, departmentPlans, functionHistory } = snapshot.data;
  const growth = bundle ? realFunctionGrowth(functionHistory, bundle.deflatorQuarters) : [];
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
      <JumpTo
        links={[
          { href: "#mix", label: "Mix over time" },
          { href: "#functions", label: "By function" },
          { href: "#growth", label: "Real growth" },
          { href: "#departments", label: "Departments" },
          { href: "#per-person-real", label: "Per person" },
          { href: "#where-it-goes", label: "Your own tax" },
        ]}
      />
      <PageIntro
        kicker="HM Treasury PESA"
        title="What does the UK government spend money on?"
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
      <StoryStepper current="/spending" />
      <CiteShare
        sentence={spendingCite(functions, growth)}
        citation={`${spendingCite(functions, growth)} Source: ${meta.publisher}, PESA, published ${snapshot.releaseDate ?? ""}. Via budget.vahaah.com/spending.`}
        url={`${SITE_URL}/spending`}
      />
      <PersonalTaxNote spend={{ year: functions.year, total: functions.totalServices, items: functions.items }} />
      <div className="mt-6">
        <ChartFrame
          id="mix"
          path="/spending"
          title="Spending on services over time"
          subtitle="Shares of spending on services by function. Switch to 100% to compare the mix. Real terms removes the effect of rising prices, so years can be compared fairly."
          source={
            <SourceNote
              publisher={meta.publisher}
              title="Public Expenditure Statistical Analyses (PESA), table 4.2"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="pesa"
            />
          }
        >
          <WhenVisible>
            <FunctionMixChart
              pounds={functionMix(functionHistory, false)}
              shares={functionMix(functionHistory, true)}
              prices={bundle}
            />
          </WhenVisible>
        </ChartFrame>
      </div>
      <div id="growth" className="mt-3 scroll-mt-28 border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Which functions grew fastest in real terms?</h2>
        <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
          {growth[0]
            ? `Real terms removes the effect of rising prices, so years can be compared fairly. Growth since ${growth[0].from} is worked out after adjusting for inflation with the financial-year GDP deflator (L8GG).`
            : "Real terms removes the effect of rising prices, so years can be compared fairly."}
        </p>
        <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">
          Debt interest sits inside general public services in HM Treasury&apos;s figures. Departmental budgets (DEL) are set in advance at spending reviews. Annually managed spending (AME), such as pensions and debt interest, depends on demand and is forecast each year.
        </p>
        <ol className="mt-4 space-y-2 text-sm">
          {growth.slice(0, 6).map((row, index) => (
            <li key={row.name} className="flex justify-between gap-3">
              <span className={index < 3 ? "font-medium" : ""}>{row.name}</span>
              <span className="tabular-nums">
                {row.change < 0 ? "fallen" : "grown"} {formatPercent(Math.abs(row.change))} since {row.from}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div id="functions" className="mt-3 scroll-mt-28">
      <ChartFrame
        id="by-function"
        path="/spending"
        title={`Spending on services by function, ${functions.year}`}
        subtitle="£bn."
        source={
          <SourceNote
            publisher={meta.publisher}
            title="Public Expenditure Statistical Analyses (PESA), table 4.2"
            url={snapshot.sourceUrl}
            releaseDate={snapshot.releaseDate}
            licenceUrl={meta.licenceUrl}
            extra="Top-level functions only. EU transactions are shown only when positive."
            sourceId="pesa"
          />
        }
      >
        <SpendingFunctions items={functions.items} year={functions.year} total={functions.totalServices ?? null} prices={bundle} />
      </ChartFrame>
      <div className="mt-3">
        <ChartFrame
          id="tme"
          path="/spending"
          title="Total managed expenditure over time"
          subtitle="£bn, by financial year. From PESA table 4.2."
          source={
            <SourceNote
              publisher={meta.publisher}
              title="Public Expenditure Statistical Analyses (PESA), total managed expenditure"
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="pesa"
            />
          }
        >
          <WhenVisible>
            <HistoryChart
              points={functionHistory.flatMap((row) =>
                row.totalManagedExpenditure == null ? [] : [{ period: row.year, value: row.totalManagedExpenditure }],
              )}
              frequency="financial"
              unit="billion"
              prices={bundle}
              name="Total managed expenditure"
              markers={markers}
            />
          </WhenVisible>
        </ChartFrame>
      </div>
      </div>
      <div className="mt-3">
        <ChartFrame
          id="departments"
          path="/spending"
          title="Departmental budgets (DEL) by department"
          subtitle="£bn. Central government spending within departmental expenditure limits."
          source={
            <SourceNote
              publisher={meta.publisher}
              title={`PESA table 6.1. Total spent in ${departments.year}: ${departments.total == null ? "not available" : formatGbpFromMillions(departments.total)}.`}
              url={snapshot.sourceUrl}
              releaseDate={snapshot.releaseDate}
              licenceUrl={meta.licenceUrl}
              sourceId="pesa"
            />
          }
        >
          <WhenVisible>
            <DepartmentChart
              prices={bundle}
              outturn={{ year: departments.year, items: departments.items }}
              plans={{ year: departmentPlans.year, items: departmentPlans.items }}
            />
          </WhenVisible>
        </ChartFrame>
      </div>
      <section id="per-person-real" className="mt-10 scroll-mt-28" aria-labelledby="per-person-title">
        <h2 id="per-person-title" className="text-xl font-semibold tracking-tight">Per person, per pupil and in real terms</h2>
        <p className="mt-1 max-w-[68ch] text-neutral-900 dark:text-neutral-100">Spending adjusted for prices and population, and departmental plans in real terms.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PerPersonFigure pesa={snapshot} population={prices?.data.ukpop?.years} path="/spending" />
          <DepartmentsRealFigure pesa={snapshot} path="/spending" />
          <PerPupilFigure pesa={snapshot} path="/spending" />
        </div>
      </section>
      <RelatedPages
        links={[
          { href: "/receipts", label: "UK tax receipts" },
          { href: "/borrowing", label: "UK government borrowing" },
        ]}
      />
      <TopicStory path="/spending" figures={[]} title="" />
    </>
  );
}

function spendingCite(
  functions: { year: string; totalServices: number | null; items: { name: string; value: number }[] },
  growth: { name: string; from: string; change: number }[],
): string {
  const top = [...functions.items].filter((item) => item.value > 0).sort((left, right) => right.value - left.value)[0];
  if (!top || functions.totalServices == null) return `Spending on services in ${functions.year}.`;
  const name = top.name.replace(/^\d+\.\s*/, "");
  const share = formatPercent((top.value / functions.totalServices) * 100);
  const grown = growth.find((row) => row.name === name);
  const change = grown
    ? grown.change < 0
      ? ` It has fallen ${formatPercent(Math.abs(grown.change))} in real terms since ${grown.from}.`
      : ` It has grown ${formatPercent(grown.change)} in real terms since ${grown.from}.`
    : "";
  return `${name} was the largest area of spending on services in ${functions.year}, at ${formatBillions(top.value)} (${share}).${change}`;
}
