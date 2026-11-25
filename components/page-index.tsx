import Link from "next/link";

import { eventLabel } from "@/lib/budgets/events";
import { loadSeedEvents } from "@/lib/budgets/seed";
import { latestStory } from "@/lib/story";
import { FOOTER, NAV } from "@/lib/site";

/** Every indexable page, as a real link. Data health and the API stay out: they are noindex. */
export async function pageIndexLinks(): Promise<{ href: string; label: string }[]> {
  const story = await latestStory();
  const extra = FOOTER.filter((item) => item.href !== "/data-health" && item.href !== "/api");
  const events = loadSeedEvents().map((event) => ({ href: `/budgets/${event.slug}`, label: eventLabel(event) }));
  const explained = story ? [{ href: `/budgets/${story.event.slug}/explained`, label: `${eventLabel(story.event)} explained` }] : [];
  const history = [{ href: "/forecasts/history", label: "Forecast history" }];
  const seen = new Set<string>();
  const links: { href: string; label: string }[] = [];
  for (const link of [...NAV, ...extra, ...history, ...events, ...explained]) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    links.push(link);
  }
  return links;
}

export async function PageIndex({ heading = "All pages" }: { heading?: string }) {
  const links = await pageIndexLinks();
  return (
    <nav aria-label={heading}>
      <h2 className="text-sm font-medium">{heading}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {links.map((link) => (
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
