import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { formatDateLong, formatRelease } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { loadHealth } from "@/lib/store";
import { SOURCES } from "@/lib/site";
import type { HealthSource } from "@/lib/schema";

export const metadata = pageMeta({
  title: "Data health: is each source up to date?",
  description: "Whether each official source is up to date, when it was last published and any failed check.",
  path: "/data-health",
  noindex: true,
});

const LABEL: Record<HealthSource["status"], string> = {
  ok: "Up to date",
  stale: "Out of date",
  missing: "Missing",
  validation_failed: "Check failed",
  pending: "Pending",
};

const DOT: Record<HealthSource["status"], string> = {
  ok: "bg-green-700",
  stale: "bg-amber-700",
  missing: "bg-red-700",
  validation_failed: "bg-red-700",
  pending: "bg-amber-700",
};

export default async function DataHealthPage() {
  const health = await loadHealth();
  const counts = health.sources.reduce(
    (total, source) => {
      total[source.status] += 1;
      return total;
    },
    { ok: 0, stale: 0, missing: 0, validation_failed: 0, pending: 0 },
  );
  const ordered = [...health.sources].sort((left, right) => rank(left.status) - rank(right.status));
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Data health", "/data-health")} />
      <Breadcrumb current="Data health" />
      <PageIntro
        kicker=""
        title="Data health"
        lede={`Last checked ${formatDateLong(health.checkedAt)}. If a new file fails a check, the previous figures stay and the problem is listed here.`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <CountChip count={counts.ok} label="up to date" dot="bg-green-700" />
        <CountChip count={counts.pending} label="pending" dot="bg-amber-700" />
        <CountChip count={counts.stale} label="out of date" dot="bg-amber-700" />
        <CountChip count={counts.missing + counts.validation_failed} label="failed" dot="bg-red-700" />
      </div>
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
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {source.releaseDate ? `Published ${formatRelease(source.releaseDate)}` : "Not yet published here"}
            </p>
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

function CountChip({ count, label, dot }: { count: number; label: string; dot: string }) {
  return (
    <p className="inline-flex h-6 items-center gap-1.5 rounded-full border border-neutral-200 px-2 text-xs dark:border-neutral-800">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {count} {label}
    </p>
  );
}

function rank(status: HealthSource["status"]): number {
  if (status === "validation_failed") return 0;
  if (status === "missing") return 1;
  if (status === "pending") return 2;
  if (status === "stale") return 3;
  return 4;
}
