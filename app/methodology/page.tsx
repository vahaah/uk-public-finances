import Link from "next/link";

import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { pageMeta } from "@/lib/meta";
import { DERIVED_LICENCE, DERIVED_LICENCE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: "Methodology: how the figures are collected",
  description:
    "How this site collects, checks and presents official UK public finance statistics, including the sign of ONS borrowing and what is not estimated.",
  path: "/methodology",
});

const SECTIONS = [
  ["when", "When figures update"],
  ["checks", "How files are checked"],
  ["signs", "Signs and totals"],
  ["revisions", "Revisions"],
  ["nominal", "Nominal figures"],
  ["not-estimated", "What this site does not estimate"],
  ["licence", "Licence"],
] as const;

export default function MethodologyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Methodology", "/methodology")} />
      <Breadcrumb current="Methodology" />
      <PageIntro
        kicker="Methodology"
        title="How the figures are collected"
        lede="The figures come from official publishers. This site does not produce its own estimates. A new file is shown only after it passes the checks; if it fails, the previous figures stay in place."
      />
      <nav aria-label="On this page" className="mb-8 text-sm">
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a className="underline decoration-neutral-400 underline-offset-4" href={`#${id}`}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="max-w-[68ch] space-y-8 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
        <section id="when">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">When figures update</h2>
          <p className="mt-2">
            The Office for National Statistics usually publishes public sector finances in the third or fourth week of each month. This site checks for that release each morning around 07:05 UK time in that window, and checks every source once a day around 07:30 UK time. The September 2026 release was published on 21 October 2026. The series file names 20 November 2026 as the next release.
          </p>
        </section>
        <section id="checks">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">How files are checked</h2>
          <p className="mt-2">
            Each source is handled separately. GOV.UK workbooks are found through the GOV.UK Content and Search APIs, on official or national statistics pages under <code>/government/statistics/</code>, so the file address is not stored in the site. A file is published only if it parses, the periods and values sit in the ranges seen in the published series, and it keeps at least four fifths of the previous row count. HMRC&apos;s annual tax lines are also checked against the published total. If a check fails, the previous file stays on the pages and the failure is listed on{" "}
            <Link className="underline decoration-neutral-500 underline-offset-4" href="/data-health">
              Data health
            </Link>
            .
          </p>
        </section>
        <section id="signs">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Signs and totals</h2>
          <p className="mt-2">
            In the ONS time series download, public sector net borrowing (J5II) and the current budget deficit (JW2T) are negative in months when the public sector finances bulletin reports borrowing or a deficit. For September 2026 the download is −24,520 for J5II and −15,770 for JW2T, in £ million. The bulletin published on 21 October 2026 reports borrowing of £24.5 billion and a current budget deficit of £15.8 billion for that month. This site stores the download and shows the negation of those two series, so a positive figure matches the bulletin. Receipts, total managed expenditure, debt and central government net interest payable are shown with the sign in the download.
          </p>
          <p className="mt-2">
            A financial-year total adds the published monthly values from April. A missing month is left out. It is not treated as zero. On the receipts chart, lines HMRC describes as included in another tax, and the National Insurance splits, are left out so they are not counted twice.
          </p>
        </section>
        <section id="revisions">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Revisions</h2>
          <p className="mt-2">
            ONS public sector finances are estimates and are revised in later releases. This site shows the latest published figures, so a month&apos;s value can change. The ONS marks the latest debt month as provisional in its bulletin.
          </p>
        </section>
        <section id="nominal">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Nominal figures</h2>
          <p className="mt-2">
            Money figures on this site are nominal: pounds at the time, not adjusted for inflation. PESA also publishes real-terms columns. Those columns are not shown. Definitions of the measures, including total managed expenditure, debt excluding the Bank of England, and central government net interest payable, are in the{" "}
            <Link className="underline decoration-neutral-500 underline-offset-4" href="/glossary">
              glossary
            </Link>
            .
          </p>
        </section>
        <section id="not-estimated">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">What this site does not estimate</h2>
          <p className="mt-2">
            There is no forecast until an Office for Budget Responsibility public finances databank has been read. The forecast vintage is pending. The gilt portfolio totals are the values in the Debt Management Office feed. That feed does not state a unit, so the totals are not rescaled. The index-linked share is the index-linked field divided by the total field. Average maturity is in years, and the yields are percent. A breakdown of gilts by remaining maturity is not in this capture. Departmental plans are the plan columns in PESA table 6.1. They are not OBR forecasts. HMRC&apos;s 2026-27 income tax payer counts are HMRC&apos;s projection, based on the 2023-24 Survey of Personal Incomes and the OBR&apos;s March 2026 Economic and fiscal outlook.
          </p>
        </section>
        <section id="licence">
          <h2 className="text-base font-medium text-neutral-950 dark:text-white">Licence</h2>
          <p className="mt-2">
            Sums, shares and the borrowing presentation on this site are available under{" "}
            <a className="underline decoration-neutral-500 underline-offset-4" href={DERIVED_LICENCE_URL}>
              {DERIVED_LICENCE}
            </a>
            . The underlying statistics keep the publisher&apos;s licence: the Open Government Licence v3.0 for the ONS, HMRC, HM Treasury and the OBR, and the Bank of England and Debt Management Office terms for their own figures. Credit the original publisher, and this site if you use a derived figure.{" "}
            <Link className="underline decoration-neutral-500 underline-offset-4" href="/data-sources">
              Sources and licences
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
