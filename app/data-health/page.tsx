import type { Metadata } from "next";

import { PageIntro } from "@/components/blocks";
import { formatRelease } from "@/lib/format";
import { loadHealth } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Data health",
  description: "Whether each public finance snapshot is current, missing, or still the last file that validated.",
  alternates: { canonical: "/data-health" },
};

export default async function DataHealthPage() {
  const health = await loadHealth();
  return (
    <>
      <PageIntro
        kicker={health.ok ? "All critical sources available" : "A source needs attention"}
        title="Data health"
        lede={`Checked ${formatRelease(health.checkedAt)}. A validation failure keeps the last good snapshot and is listed here and at /api/health.`}
      />
      <ul className="divide-y divide-neutral-200 border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {health.sources.map((source) => (
          <li key={source.source} className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[1fr_8rem_auto]">
            <div>
              <p className="font-medium">{SOURCES[source.source].title}</p>
              <p className="text-xs text-neutral-500">
                {SOURCES[source.source].publisher}
                {source.validationError ? ` · ${source.validationError}` : ""}
                {source.usingLastGood ? " · showing last good snapshot" : ""}
              </p>
            </div>
            <p className="text-xs text-neutral-500">Released {formatRelease(source.releaseDate)}</p>
            <p className="font-mono text-xs uppercase">{source.status}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
