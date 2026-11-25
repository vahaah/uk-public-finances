import Link from "next/link";

import { eventLabel } from "@/lib/budgets/events";
import { latestStory } from "@/lib/story";

/** Crawlable links from a section page to the latest Budget and its explained page. */
export async function RelatedPages({ links }: { links: { href: string; label: string }[] }) {
  const story = await latestStory();
  const budget = story
    ? [
        { href: `/budgets/${story.event.slug}`, label: eventLabel(story.event) },
        { href: `/budgets/${story.event.slug}/explained`, label: `${eventLabel(story.event)} explained` },
      ]
    : [];
  const seen = new Set<string>();
  const all = [...links, ...budget].filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
  return (
    <nav aria-label="Related" className="mt-10">
      <h2 className="text-sm font-medium">Related</h2>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {all.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="underline decoration-neutral-400 underline-offset-4">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
