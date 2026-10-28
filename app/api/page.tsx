import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { pageMeta } from "@/lib/meta";
import { SOURCE_IDS } from "@/lib/schema";

export const metadata = pageMeta({
  title: "API: JSON snapshots",
  description: "Free JSON access to the latest figures on this site. Credit the original publisher when you reuse them.",
  path: "/api",
  noindex: true,
});

export default function ApiPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("API", "/api")} />
      <Breadcrumb current="API" />
      <PageIntro
        kicker="Data"
        title="API"
        lede="No key is needed. Each link returns the latest figures for one source as JSON. Credit the original publisher when you reuse them. Derived figures on this site are CC BY 4.0."
      />
      <ul className="space-y-2 font-mono text-xs">
        <li>
          <a className="underline decoration-neutral-500 underline-offset-4" href="/api/health">
            /api/health
          </a>
        </li>
        <li>
          <a className="underline decoration-neutral-500 underline-offset-4" href="/api/snapshots">
            /api/snapshots
          </a>
        </li>
        {SOURCE_IDS.map((id) => (
          <li key={id}>
            <a className="underline decoration-neutral-500 underline-offset-4" href={`/api/snapshots/${id}`}>
              /api/snapshots/{id}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
