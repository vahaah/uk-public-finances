import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { CopyButton } from "@/components/copy-button";
import { pageMeta } from "@/lib/meta";
import { SOURCE_IDS } from "@/lib/schema";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK public finances API: free JSON",
  description: "Free JSON access to the latest figures on this site. Credit the original publisher when you reuse them.",
  path: "/api",
  noindex: true,
});

const ENDPOINTS: { path: string; detail: string }[] = [
  { path: "/api/health", detail: "status of every source" },
  { path: "/api/snapshots", detail: "list of sources" },
  ...SOURCE_IDS.map((id) => ({ path: `/api/snapshots/${id}`, detail: SOURCES[id].title })),
];

export default function ApiPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("API", "/api")} />
      <Breadcrumb current="API" />
      <PageIntro
        kicker=""
        title="UK public finances API"
        lede="No key needed. Each link returns the latest figures for one source as JSON. Credit the original publisher; calculated figures are CC BY 4.0."
      />
      <ul className="divide-y divide-neutral-200 border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {ENDPOINTS.map((endpoint) => (
          <li key={endpoint.path} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <a className="font-mono text-sm underline decoration-neutral-400 underline-offset-4" href={endpoint.path}>
                {endpoint.path}
              </a>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">{endpoint.detail}</p>
            </div>
            <CopyButton value={endpoint.path} />
          </li>
        ))}
      </ul>
    </>
  );
}
