import Link from "next/link";

import type { FiscalEvent } from "@/lib/budgets/events";

export function BudgetTimeline({ events }: { events: FiscalEvent[] }) {
  const ordered = [...events].sort((left, right) => left.date.localeCompare(right.date));
  return (
    <div>
      <ol className="hidden gap-3 lg:flex lg:flex-wrap">
        {ordered.map((event) => (
          <li key={event.slug}>
            <Link href={`/budgets/${event.slug}`} className="group flex max-w-40 flex-col gap-1 text-xs" aria-label={`${event.name}, ${event.date}`}>
              <Marker event={event} />
              <span className="text-neutral-700 group-hover:text-neutral-950 dark:text-neutral-300 dark:group-hover:text-white">{event.date.slice(0, 4)}</span>
              <span className="font-medium">{event.name}</span>
            </Link>
          </li>
        ))}
      </ol>
      <ol className="divide-y divide-neutral-200 border border-neutral-200 lg:hidden dark:divide-neutral-800 dark:border-neutral-800">
        {ordered.map((event) => (
          <li key={event.slug}>
            <Link href={`/budgets/${event.slug}`} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
              <Marker event={event} />
              <span>
                <span className="block font-medium">{event.name}</span>
                <span className="text-xs text-neutral-700 dark:text-neutral-300">
                  {event.date} · {event.chancellor}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Marker({ event }: { event: FiscalEvent }) {
  if (event.obrForecast === "no") {
    return <span className="inline-block size-2.5 rounded-full border border-neutral-950 bg-transparent dark:border-white" aria-hidden="true" />;
  }
  if (event.status === "pending") {
    return <span className="inline-block size-2.5 rounded-full border border-dashed border-neutral-950 dark:border-white" aria-hidden="true" />;
  }
  if (event.weight === "light") {
    return <span className="inline-block size-2.5 rounded-full bg-neutral-400" aria-hidden="true" />;
  }
  return <span className="inline-block size-2.5 rounded-full bg-neutral-950 dark:bg-white" aria-hidden="true" />;
}
