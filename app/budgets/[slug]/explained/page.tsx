import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb, JsonLd, breadcrumbJsonLd } from "@/components/blocks";
import { StoryNav } from "@/components/story-nav";
import {
  CpiFigure,
  DebtInterestFigure,
  DebtVsOutturnFigure,
  GdpFigure,
  MeasuresFigure,
  PolicyFigure,
  PsnbFigure,
  PsnflFigure,
  RhdiGrowthFigure,
  RhdiRollingFigure,
  TaxBurdenFigure,
} from "@/components/story-sections";
import { eventLabel } from "@/lib/budgets/events";
import { formatDateLong } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { latestStory, measuresPerEvent, storyEvents } from "@/lib/story";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await latestStory();
  const label = story && story.event.slug === slug ? eventLabel(story.event) : "Budget";
  return pageMeta({
    title: `${label} explained: what it means for the UK`,
    description: `${label} in charts from official OBR data: slower growth, higher inflation, squeezed incomes, more borrowing, record taxes and the debt promise.`,
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
  const measures = measuresPerEvent(obr.measures.rows, await storyEvents());
  const props = { efo, path };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(`${label} explained`, path)} />
      <Breadcrumb current="Explained" parents={[{ href: "/budgets", label: "Budgets" }, { href: `/budgets/${slug}`, label }]} />
      <header className="mb-8 max-w-[68ch]">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{label} explained</h1>
        <p className="mt-3 text-base text-neutral-900 dark:text-neutral-100">
          {formatDateLong(event.date)} · {event.chancellor}. The economy is weaker than hoped, prices are rising faster and borrowing is higher. This page follows the
          Budget in four steps, using the OBR&apos;s {efo.currentLabel} forecast and comparing it with {efo.previousLabel}.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            ["#squeeze", "1. The squeeze"],
            ["#trap", "2. The fiscal trap"],
            ["#strategy", "3. The strategy"],
            ["#reality", "4. The reality"],
          ].map(([href, text]) => (
            <li key={href}>
              <a className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 dark:border-neutral-700" href={href}>
                {text}
              </a>
            </li>
          ))}
        </ol>
      </header>

      <Chapter id="squeeze" title="1. The squeeze" lede="Growth is slower, inflation is higher, and incomes after inflation barely move.">
        <GdpFigure {...props} />
        <CpiFigure {...props} />
        <RhdiGrowthFigure {...props} />
        <RhdiRollingFigure {...props} />
      </Chapter>

      <Chapter id="trap" title="2. The fiscal trap" lede="A weaker economy means less tax and more spending, and the cost of past debt keeps climbing.">
        <PsnbFigure {...props} />
        <DebtInterestFigure {...props} />
      </Chapter>

      <Chapter id="strategy" title="3. The strategy" lede="Spend a little more now, raise taxes later, and promise that debt will fall.">
        <PolicyFigure {...props} />
        <TaxBurdenFigure {...props} />
        <PsnflFigure {...props} />
        <DebtVsOutturnFigure {...props} />
      </Chapter>

      <Chapter id="reality" title="4. The reality" lede="Many measures, most of them small.">
        <MeasuresFigure rows={measures} path={path} releaseDate={obr.measures.asOf} />
        <p className="text-sm text-neutral-800 dark:text-neutral-200">
          Who gains and who loses by income decile is in HM Treasury&apos;s distributional analysis, which is not loaded here yet. See the{" "}
          <Link className="underline underline-offset-4" href={`/budgets/${slug}`}>
            {label} page
          </Link>{" "}
          for every scored measure.
        </p>
      </Chapter>

      <StoryNav current={path} />
    </>
  );
}

function Chapter({ id, title, lede, children }: { id: string; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-20" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 max-w-[68ch] text-neutral-900 dark:text-neutral-100">{lede}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}
