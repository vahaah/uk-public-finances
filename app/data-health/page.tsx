import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { formatDateLong, formatRelease } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { loadHealth } from "@/lib/store";
import { SOURCES } from "@/lib/site";
import type { HealthSource } from "@/lib/schema";

export const metadata = pageMeta({
  title: "Data health: snapshot status",
  description: "Whether the data from each source is up to date, with the release date and any failed check.",
  path: "/data-health",
  noindex: true,
});

const LABEL: Record<HealthSource["status"], string> = {
  ok: "Up to date",
  stale: "Out of date",
  missing: "Missing",
  validation_failed: "Check failed",
};

const DOT: Record<HealthSource["status"], string> = {
  ok: "bg-green-700",
  stale: "bg-amber-700",
  missing: "bg-red-700",
  validation_failed: "bg-red-700",
};

export default async function DataHealthPage() {
  const health = await loadHealth();
  const counts = health.sources.reduce(
    (total, source) => {
      total[source.status] += 1;
      return total;
    },
    { ok: 0, stale: 0, missing: 0, validation_failed: 0 },
  );
  const ordered = [...health.sources].sort((left, right) => rank(left.status) - rank(right.status));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Data health", "/data-health")} />
      <Breadcrumb current="Data health" />
      <PageIntro
        kicker={`${counts.ok} up to date · ${counts.stale} out of date · ${counts.missing + counts.validation_failed} missing or failed`}
        title="Data health"
        lede={`Last checked ${formatDateLong(health.checkedAt)}. If a new file fails the checks, the previous figures stay on the site and the problem is listed here.`}
      />
      <ul className="divide-y divide-neutral-200 border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {ordered.map((source) => (
          <li key={source.source} id={source.source} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto]">
            <div>
              <p className="font-medium">{SOURCES[source.source].title}</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {SOURCES[source.source].publisher}
                {source.validationError ? " · Latest file could not be read" : ""}
                {source.usingLastGood ? " · showing the previous release" : ""}
              </p>
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">Published {formatRelease(source.releaseDate)}</p>
            <p className="inline-flex h-6 items-center gap-1.5 self-start rounded-full px-2 text-xs">
              <span className={`size-2 rounded-full ${DOT[source.status]}`} aria-hidden="true" />
              {LABEL[source.status]}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function rank(status: HealthSource["status"]): number {
  if (status === "validation_failed") return 0;
  if (status === "missing") return 1;
  if (status === "stale") return 2;
  return 3;
}
