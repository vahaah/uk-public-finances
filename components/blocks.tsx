import Link from "next/link";
import type { ReactNode } from "react";

import { formatRelease } from "@/lib/format";
import type { SourceId } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";

export function PageIntro({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: ReactNode;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="text-xs text-neutral-700 dark:text-neutral-300">{kicker}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-3 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{lede}</div>
    </header>
  );
}

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-700 dark:text-neutral-300">
      <Link href="/" className="underline decoration-neutral-400 underline-offset-4">
        UK public finances
      </Link>
      <span aria-hidden="true"> › </span>
      <span>{current}</span>
    </nav>
  );
}

export function Stat({
  label,
  value,
  detail,
  href,
  wide,
  stale,
}: {
  label: string;
  value: string;
  detail: string;
  href?: string;
  wide?: boolean;
  stale?: string | null;
}) {
  const body = (
    <div
      className={`flex h-full flex-col border border-neutral-200 p-6 dark:border-neutral-800 ${wide ? "md:col-span-2" : ""} ${stale ? "border-l-2 border-l-amber-700 pl-3" : ""}`}
    >
      <p className="text-sm text-neutral-800 dark:text-neutral-200">{label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{detail}</p>
      {stale ? <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">Not updated · as of {stale}</p> : null}
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className={`block hover:bg-neutral-50 dark:hover:bg-neutral-950 ${wide ? "md:col-span-2" : ""}`}>
      {body}
    </Link>
  );
}

export function SourceNote({
  publisher,
  title,
  url,
  releaseDate,
  licenceUrl,
  extra,
  sourceId,
}: {
  publisher: string;
  title: string;
  url: string;
  releaseDate: string | null;
  licenceUrl: string;
  extra?: string;
  sourceId?: SourceId;
}) {
  return (
    <p className="mt-3 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
      <a className="underline decoration-neutral-500 underline-offset-4" href={url}>
        {publisher}
      </a>
      {" · "}
      {title}
      {" · Published "}
      {formatRelease(releaseDate)}
      {" · "}
      <a className="underline decoration-neutral-500 underline-offset-4" href={licenceUrl}>
        Licence terms
      </a>
      {" · "}
      <Link className="underline decoration-neutral-500 underline-offset-4" href={sourceId ? `/data-sources#${sourceId}` : "/data-sources"}>
        This source
      </Link>
      {" · "}
      <Link className="underline decoration-neutral-500 underline-offset-4" href="/methodology">
        How figures are checked
      </Link>
      {extra ? ` · ${extra}` : null}
    </p>
  );
}

export function ChartFrame({
  title,
  subtitle,
  children,
  source,
  stale,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  source: ReactNode;
  stale?: string | null;
}) {
  return (
    <section className={`border border-neutral-200 p-6 dark:border-neutral-800 ${stale ? "border-l-2 border-l-amber-700" : ""}`}>
      <h2 className="text-sm font-medium">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{subtitle}</p> : null}
      {stale ? <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Not updated · as of {stale}</p> : null}
      <div className="mt-3" data-ready="true">
        {children}
      </div>
      {source}
    </section>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left font-sans text-sm tabular-nums">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column}
                className={`h-9 border-b border-neutral-200 pr-3 text-xs font-medium text-neutral-900 dark:border-neutral-800 dark:text-neutral-100 ${index === 0 ? "" : "text-right"}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="h-9 border-b border-neutral-200 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900">
              {row.map((cell, index) => (
                <td key={`${columns[index]}-${String(cell)}`} className={`pr-3 ${index === 0 ? "" : "text-right"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptySource({ name, pending }: { name: string; pending?: boolean }) {
  return (
    <div className="border border-dashed border-neutral-300 p-6 text-sm text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
      <p className="font-medium">{pending ? `${name} pending` : `${name} is not available`}</p>
      <p className="mt-2">
        Nothing is shown in place of a missing figure.{" "}
        <Link className="underline decoration-neutral-500 underline-offset-4" href="/data-health">
          Data health
        </Link>
      </p>
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export type DatasetSource = {
  id: SourceId;
  name: string;
  url: string;
  publisher: string;
  licenceUrl: string;
  releaseDate: string | null;
};

export function datasetJsonLd(input: {
  path: string;
  name: string;
  description: string;
  keywords: string[];
  temporalCoverage: string;
  variableMeasured: string[];
  dateModified: string | null;
  sources: DatasetSource[];
}) {
  const url = input.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${input.path}`;
  const allOgl = input.sources.every((source) => source.licenceUrl.includes("open-government-licence"));
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: input.name,
    description: input.description,
    url,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    keywords: input.keywords,
    temporalCoverage: input.temporalCoverage,
    spatialCoverage: { "@type": "Country", name: "United Kingdom" },
    variableMeasured: input.variableMeasured,
    dateModified: input.dateModified ?? undefined,
    creator: { "@id": "https://vahaah.com/#person" },
    publisher: { "@id": "https://vahaah.com/#person" },
    includedInDataCatalog: { "@type": "DataCatalog", name: "Budget", url: `${SITE_URL}/` },
    license: allOgl
      ? "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
      : `${SITE_URL}/data-sources`,
    isBasedOn: input.sources.map((source) => ({
      "@type": "Dataset",
      name: source.name,
      url: source.url,
      license: source.licenceUrl,
      publisher: { "@type": "GovernmentOrganization", name: source.publisher },
    })),
    citation: input.sources.map(
      (source) =>
        `${source.publisher}, ${source.name}${source.releaseDate ? `, released ${source.releaseDate.slice(0, 10)}` : ""}. ${source.url}`,
    ),
    distribution: input.sources.map((source) => ({
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${SITE_URL}/api/snapshots/${source.id}`,
      license: source.licenceUrl,
    })),
    isPartOf: { "@id": `${SITE_URL}/#app` },
  };
}

export function breadcrumbJsonLd(current: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "UK public finances", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: current, item: `${SITE_URL}${path}` },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "Budget",
        alternateName: "UK public finances",
        inLanguage: "en-GB",
        publisher: { "@id": "https://vahaah.com/#person" },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Budget: UK public finances",
        url: `${SITE_URL}/`,
        applicationCategory: "ReferenceApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
        inLanguage: "en-GB",
        creator: { "@id": "https://vahaah.com/#person" },
        description:
          "Free view of UK public finances from the ONS, HMRC, HM Treasury, the UK Debt Management Office and the Bank of England.",
      },
    ],
  };
}
