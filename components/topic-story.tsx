import Link from "next/link";

import { StoryNav } from "@/components/story-nav";
import * as F from "@/components/story-sections";
import { eventLabel } from "@/lib/budgets/events";
import { latestStory, measuresPerEvent, storyEvents } from "@/lib/story";
import { readSnapshot, takeSnapshot } from "@/lib/store";

type FigureName = "gdp" | "cpi" | "rhdiRolling" | "psnb" | "debtInterest" | "policy" | "taxBurden" | "psnfl" | "debtVsOutturn" | "packages" | "measures" | "borrowingChanges" | "independent";

/** Long-run and latest-forecast charts on a topic page, then the story links. */
export async function TopicStory({ path, figures, title }: { path: string; figures: FigureName[]; title: string }) {
  const story = await latestStory();
  const events = figures.includes("measures") ? await storyEvents() : [];
  const independent = figures.includes("independent") ? takeSnapshot("pesa", (await readSnapshot("pesa")).snapshot)?.data.independent : undefined;
  const body = story
    ? figures.map((name) => {
        const props = { efo: story.efo, path };
        switch (name) {
          case "gdp": return <F.GdpFigure key={name} {...props} />;
          case "cpi": return <F.CpiFigure key={name} {...props} />;
          case "rhdiRolling": return <F.RhdiRollingFigure key={name} {...props} />;
          case "psnb": return <F.PsnbFigure key={name} {...props} />;
          case "debtInterest": return <F.DebtInterestFigure key={name} {...props} />;
          case "policy": return <F.PolicyFigure key={name} {...props} />;
          case "taxBurden": return <F.TaxBurdenFigure key={name} {...props} />;
          case "psnfl": return <F.PsnflFigure key={name} {...props} />;
          case "debtVsOutturn": return <F.DebtVsOutturnFigure key={name} {...props} />;
          case "packages": return <F.PackagesFigure key={name} {...props} />;
          case "independent": return <F.IndependentForecastsFigure key={name} {...props} independent={independent} />;
          case "borrowingChanges": return <F.BorrowingChangesFigure key={name} {...props} />;
          case "measures": return <F.MeasuresFigure key={name} rows={measuresPerEvent(story.obr.measures.rows, events)} path={path} releaseDate={story.obr.measures.asOf} />;
        }
      })
    : [];
  return (
    <>
      {story && figures.length > 0 ? (
        <section className="mt-10" aria-labelledby="topic-story">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="topic-story" className="text-xl font-semibold tracking-tight">{title}</h2>
            <Link className="text-sm underline decoration-neutral-400 underline-offset-4" href={`/budgets/${story.event.slug}/explained`}>
              {eventLabel(story.event)} explained →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">{body}</div>
        </section>
      ) : null}
      <StoryNav current={path} />
    </>
  );
}
