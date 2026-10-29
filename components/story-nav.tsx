import Link from "next/link";

import { eventLabel } from "@/lib/budgets/events";
import { latestStory, storySteps } from "@/lib/story";

/** Previous and next links along the site-wide story. */
export async function StoryNav({ current }: { current: string }) {
  const latest = await latestStory();
  const steps = storySteps(latest ? { slug: latest.event.slug, label: eventLabel(latest.event) } : null);
  const index = steps.findIndex((step) => step.href === current);
  if (index < 0) return null;
  const previous = steps[index - 1];
  const next = steps[index + 1];
  return (
    <nav aria-label="Follow the story" className="mt-10 grid gap-3 border-t border-neutral-200 pt-6 sm:grid-cols-2 dark:border-neutral-800">
      {previous ? (
        <Link href={previous.href} className="block border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950">
          <span className="text-xs text-neutral-700 dark:text-neutral-300">← Previous · {index} of {steps.length}</span>
          <span className="mt-1 block font-medium">{previous.label}</span>
          <span className="mt-1 block text-sm text-neutral-800 dark:text-neutral-200">{previous.blurb}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="block border border-neutral-200 p-4 text-right hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950">
          <span className="text-xs text-neutral-700 dark:text-neutral-300">Next · {index + 2} of {steps.length} →</span>
          <span className="mt-1 block font-medium">{next.label}</span>
          <span className="mt-1 block text-sm text-neutral-800 dark:text-neutral-200">{next.blurb}</span>
        </Link>
      ) : null}
    </nav>
  );
}
