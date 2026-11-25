import type { FiscalEvent } from "@/lib/budgets/events";
import { eventLabel } from "@/lib/budgets/events";
import { storyEvents } from "@/lib/story";

const FEATURED = new Set<FiscalEvent["type"]>(["budget", "statement", "emergency", "growth-plan"]);

/** Latest Budget or fiscal statement. The header label is its name, so it changes with the registry. */
export function latestBudgetEvent(events: FiscalEvent[]): FiscalEvent | null {
  const pool = events.filter((event) => FEATURED.has(event.type));
  const rows = pool.length > 0 ? pool : events;
  return [...rows].sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
}

export async function latestBudgetNav(): Promise<{ href: string; label: string } | null> {
  const event = latestBudgetEvent(await storyEvents());
  if (!event) return null;
  return { href: `/budgets/${event.slug}`, label: eventLabel(event) };
}
