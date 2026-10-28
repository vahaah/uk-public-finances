import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Budget fetches, checks and publishes UK public finance statistics.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <>
      <PageIntro
        kicker="Method"
        title="How the numbers are made"
        lede="Budget publishes a snapshot only after it parses and validates. A failed file leaves the previous snapshot in place."
      />
      <div className="max-w-3xl space-y-6 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        <section>
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Cadence</h2>
          <p className="mt-2">
            ONS public sector finances are released around the 20th of the month. A cron at 07:05 UK time on the 18th to the 23rd fetches them, and a daily cron at 07:30 UK time fetches every source, including ONS. Vercel cron is UTC, so each route runs at both possible UTC hours and continues only when Europe/London matches.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Pipeline</h2>
          <p className="mt-2">
            Each source has its own workflow. It detects a new release, downloads, parses, checks the result with a schema, writes a versioned JSON snapshot to Vercel Blob, and revalidates the pages. GOV.UK files are found through the Content and Search APIs. Attachment URLs are not stored in code.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Signs and sums</h2>
          <p className="mt-2">
            J5II and JW2T arrive negative when the ONS bulletin reports borrowing or a deficit. Budget keeps the download and stores the negation beside it. Charts use the negation. Financial-year borrowing is the sum of the published monthly values from April, then negated the same way. Missing months are not filled with zero. HMRC columns described as included in another tax, and the National Insurance splits, are left out of the receipts chart so they are not counted twice.
          </p>
        </section>
        <section>
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">What is not estimated</h2>
          <p className="mt-2">
            There is no forecast line until an OBR workbook validates. The DMO maturity ladder is absent until report D1A parses; the portfolio share uses only the fields GetSalesData returned in full. PESA plans are the plan columns in table 6.1, not an OBR projection.
          </p>
        </section>
        <p>
          <Link className="underline" href="/data-sources">
            Sources and licences
          </Link>
          {" · "}
          <Link className="underline" href="/data-health">
            Data health
          </Link>
        </p>
      </div>
    </>
  );
}
