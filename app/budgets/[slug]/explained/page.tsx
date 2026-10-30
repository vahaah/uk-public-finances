import { StoryStepper } from "@/components/story-stepper";
import { ChapterBar } from "@/components/chapter-bar";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb, JsonLd, breadcrumbJsonLd } from "@/components/blocks";
import { StoryNav } from "@/components/story-nav";
import {
  BorrowingChangesFigure,
  CpiFigure,
  EnergyCapFigure,
  DebtInterestFigure,
  DebtVsOutturnFigure,
  GdpFigure,
  IndependentForecastsFigure,
  MeasuresFigure,
  PolicyFigure,
  PsnbFigure,
  PsnflFigure,
  RhdiDecadesFigure,
  RhdiGrowthFigure,
  RhdiRollingFigure,
  TaxBurdenFigure,
} from "@/components/story-sections";
import { eventLabel } from "@/lib/budgets/events";
import { formatDateLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { rhdiByDecade } from "@/lib/rhdi-decades";
import { latestStory, measuresPerEvent, storyEvents } from "@/lib/story";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Without generateStaticParams this nested dynamic route rendered on every
 * request (cache-control: no-store, ~2.5s TTFB). An empty list opts it into
 * ISR: the first request renders, later ones are served from the cache.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await latestStory();
  const label = story && story.event.slug === slug ? eventLabel(story.event) : "Budget";
  return pageMeta({
    title: `${label} explained: what it means for the UK`,
    description: `${label} in charts from OBR data: growth, prices, incomes, borrowing, interest, taxes and debt, against the previous forecast.`,
    path: `/budgets/${slug}/explained`,
    og: { kicker: "Budgets", title: `${label} explained`, detail: "The story in charts, from OBR data" },
  });
}

export default async function ExplainedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await latestStory();
  if (!story || story.event.slug !== slug) notFound();
  const { event, efo, obr } = story;
  const label = eventLabel(event);
  const path = `/budgets/${slug}/explained`;
  const [events, pricesLoaded, pesaLoaded, ofgemLoaded] = await Promise.all([storyEvents(), readSnapshot("ons-prices"), readSnapshot("pesa"), readSnapshot("ofgem-cap")]);
  const cap = takeSnapshot("ofgem-cap", ofgemLoaded.snapshot)?.data;
  const independent = takeSnapshot("pesa", pesaLoaded.snapshot)?.data.independent;
  const measures = measuresPerEvent(obr.measures.rows, events);
  const crxx = takeSnapshot("ons-prices", pricesLoaded.snapshot)?.data.crxx;
  const decades = crxx ? rhdiByDecade(crxx.years) : [];
  const priceYear = crxx ? (/reference year = (\d{4})/.exec(crxx.title)?.[1] ?? null) : null;
  const props = { efo, path };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(`${label} explained`, path)} />
      <Breadcrumb current="Explained" parents={[{ href: "/budgets", label: "Budgets" }, { href: `/budgets/${slug}`, label }]} />
      <header className="mb-8 max-w-[68ch]">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{label} explained</h1>
        <div className="mt-3"><StoryStepper current={path} /></div>
        <p className="mt-3 text-base text-neutral-900 dark:text-neutral-100">
          {formatDateLong(event.date)} · {event.chancellor}. What the OBR&apos;s {efo.currentLabel} forecast says about the economy and the public finances, compared with its{" "}
          {efo.previousLabel} forecast, in four chapters.
        </p>
      </header>
      <ChapterBar
        chapters={[
          { id: "squeeze", label: "1. Growth and incomes" },
          { id: "trap", label: "2. Borrowing and interest" },
          { id: "strategy", label: "3. The Budget's plan" },
          { id: "reality", label: "4. The measures" },
        ]}
      />

      <Chapter id="squeeze" title="1. Growth and incomes" lede="How the forecast for the economy, prices and household incomes has changed.">
        <GdpFigure {...props} />
        <IndependentForecastsFigure {...props} independent={independent} />
        <CpiFigure {...props} />
        <EnergyCapFigure cap={cap} cpi={takeSnapshot("ons-prices", pricesLoaded.snapshot)?.data.d7bt.months} path={path} />
        <RhdiDecadesFigure decades={decades} path={path} releaseDate={crxx?.releaseDate.slice(0, 10) ?? null} priceYear={priceYear} />
        <RhdiGrowthFigure {...props} />
        <RhdiRollingFigure {...props} />
      </Chapter>

      <Chapter id="trap" title="2. Borrowing and interest" lede="How much the government is forecast to borrow, and what its debt costs.">
        <PsnbFigure {...props} />
        <BorrowingChangesFigure {...props} />
        <DebtInterestFigure {...props} />
        <p className="text-sm text-neutral-800 dark:text-neutral-200 lg:col-span-2">
          Past forecasts of borrowing have often differed from what happened.{" "}
          <Link className="underline underline-offset-4" href="/budgets#borrowing-forecasts">
            See every OBR borrowing forecast against the outturn
          </Link>
          .
        </p>
      </Chapter>

      <Chapter id="strategy" title="3. The Budget's plan" lede="What the Budget's decisions do to borrowing, and the forecast for taxes and debt.">
        <PolicyFigure {...props} />
        <TaxBurdenFigure {...props} />
        <PsnflFigure {...props} />
        <p className="text-sm text-neutral-800 dark:text-neutral-200 lg:col-span-2">
          Where the money goes, per person and in real terms, including departmental plans:{" "}
          <Link className="underline underline-offset-4" href="/spending#per-person-real">
            spending per person and departmental budgets
          </Link>
          .
        </p>
        <DebtVsOutturnFigure {...props} />
      </Chapter>

      <Chapter id="reality" title="4. The measures" lede="How many measures each event had, as scored by the OBR.">
        <MeasuresFigure rows={measures} path={path} releaseDate={obr.measures.asOf} />
        <p className="text-sm text-neutral-800 dark:text-neutral-200">
          {obr.distributional?.data?.eventSlug === slug ? (
            <>
              HM Treasury&apos;s estimate of the effect on households by income decile, read from its published charts, is on the{" "}
              <Link className="underline underline-offset-4" href={`/budgets/${slug}#households-by-income`}>
                {label} page
              </Link>
              , beside every scored measure.
            </>
          ) : (
            <>
              HM Treasury&apos;s analysis of the effect on households by income is not loaded here yet. Every scored measure is on the{" "}
              <Link className="underline underline-offset-4" href={`/budgets/${slug}`}>
                {label} page
              </Link>
              .
            </>
          )}
        </p>
      </Chapter>

      <StoryNav current={path} />
    </>
  );
}

function Chapter({ id, title, lede, children }: { id: string; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-40 md:scroll-mt-28" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 max-w-[68ch] text-neutral-900 dark:text-neutral-100">{lede}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}
