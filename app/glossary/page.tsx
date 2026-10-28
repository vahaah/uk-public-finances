import type { Metadata } from "next";

import { PageIntro } from "@/components/blocks";
import { GLOSSARY } from "@/lib/content";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Short definitions for the public finance terms used on Budget.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  return (
    <>
      <PageIntro kicker="Glossary" title="Terms" lede="Definitions of the series and budget terms the charts use. Figures themselves stay on the data pages." />
      <dl className="max-w-3xl divide-y divide-neutral-200 dark:divide-neutral-800">
        {GLOSSARY.map((entry) => (
          <div key={entry.term} className="py-4">
            <dt className="text-sm font-medium">{entry.term}</dt>
            <dd className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{entry.body}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
