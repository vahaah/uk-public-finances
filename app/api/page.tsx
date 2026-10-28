import type { Metadata } from "next";

import { PageIntro } from "@/components/blocks";
import { SOURCE_IDS } from "@/lib/schema";

export const metadata: Metadata = {
  title: "API",
  description: "JSON snapshots and the health check for Budget.",
  alternates: { canonical: "/api" },
};

export default function ApiPage() {
  return (
    <>
      <PageIntro
        kicker="API"
        title="JSON"
        lede="No key. The snapshot routes return the last validated file. Cron routes require CRON_SECRET and are not for public use."
      />
      <ul className="space-y-2 font-mono text-xs">
        <li>
          <a className="underline" href="/api/health">
            /api/health
          </a>
        </li>
        {SOURCE_IDS.map((id) => (
          <li key={id}>
            <a className="underline" href={`/api/snapshots/${id}`}>
              /api/snapshots/{id}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
