import Link from "next/link";

import { eventLabel } from "@/lib/budgets/events";
import { latestStory, storySteps } from "@/lib/story";

/** Compact "where am I in the story" stepper under a page title. Scrolls sideways on narrow screens. */
export async function StoryStepper({ current }: { current: string }) {
  const latest = await latestStory();
  const label = latest ? eventLabel(latest.event) : null;
  const steps = storySteps(latest ? { slug: latest.event.slug, label: label! } : null);
  const index = steps.findIndex((step) => step.href === current);
  if (index < 0) return null;
  return (
    <nav aria-label="The UK story" className="-mx-1 mb-6 overflow-x-auto px-1 [scrollbar-width:none]">
      <ol className="flex w-max items-center gap-1 text-xs">
        {steps.map((step, i) => {
          const text = label && step.label === `${label} explained` ? "Explained" : step.label;
          const isCurrent = i === index;
          return (
            <li key={step.href} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden="true" className="text-neutral-400 dark:text-neutral-600">›</span> : null}
              <Link
                href={step.href}
                aria-current={isCurrent ? "step" : undefined}
                className={`inline-flex h-7 items-center whitespace-nowrap rounded-md px-2 ${isCurrent ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-900 dark:text-neutral-50" : "text-neutral-700 underline-offset-4 hover:underline dark:text-neutral-300"}`}
              >
                <span className="mr-1 tabular-nums text-neutral-500">{i + 1}</span>
                {text}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
