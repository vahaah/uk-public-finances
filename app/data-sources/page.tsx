import type { Metadata } from "next";

import { PageIntro } from "@/components/blocks";
import { SOURCE_IDS } from "@/lib/schema";
import { SOURCES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Data sources",
  description: "Every publisher, licence and page Budget uses.",
  alternates: { canonical: "/data-sources" },
};

export default function DataSourcesPage() {
  return (
    <>
      <PageIntro
        kicker="Sources"
        title="Data sources"
        lede="Contains public sector information licensed under the Open Government Licence where the publisher says so. Bank of England and DMO terms are their own."
      />
      <ul className="divide-y divide-neutral-200 border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {SOURCE_IDS.map((id) => {
          const source = SOURCES[id];
          return (
            <li key={id} className="px-3 py-3 text-sm">
              <a className="font-medium underline decoration-neutral-300 underline-offset-2" href={source.page}>
                {source.publisher}
              </a>
              <p className="mt-1 text-neutral-600 dark:text-neutral-400">{source.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {source.licence} · <a href={source.licenceUrl}>terms</a> · snapshot id {id}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
