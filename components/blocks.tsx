import Link from "next/link";
import type { ReactNode } from "react";

import { formatRelease } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export function PageIntro({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">{kicker}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{lede}</p>
    </header>
  );
}

export function Stat({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href?: string;
}) {
  const body = (
    <div className="flex h-full flex-col border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-2 font-mono text-xl tracking-tight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-neutral-600 dark:text-neutral-400">{detail}</p>
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block hover:bg-neutral-50 dark:hover:bg-neutral-950">
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
}: {
  publisher: string;
  title: string;
  url: string;
  releaseDate: string | null;
  licenceUrl: string;
  extra?: string;
}) {
  return (
    <p className="mt-3 text-xs leading-5 text-neutral-500">
      <a className="underline decoration-neutral-300 underline-offset-2" href={url}>
        {publisher}
      </a>
      {" · "}
      {title}
      {" · Released "}
      {formatRelease(releaseDate)}
      {" · "}
      <a className="underline decoration-neutral-300 underline-offset-2" href={licenceUrl}>
        Licence
      </a>
      {extra ? ` · ${extra}` : null}
    </p>
  );
}

export function ChartFrame({
  title,
  children,
  source,
}: {
  title: string;
  children: ReactNode;
  source: ReactNode;
}) {
  return (
    <section className="border border-neutral-200 p-3 dark:border-neutral-800">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-3">{children}</div>
      {source}
    </section>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-neutral-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-neutral-200 py-1 pr-3 font-medium dark:border-neutral-800">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-neutral-100 dark:border-neutral-900">
              {row.map((cell, index) => (
                <td key={`${columns[index]}-${cell}`} className="py-1 pr-3 font-mono">
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

export function EmptySource({ name }: { name: string }) {
  return (
    <p className="border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
      No validated snapshot for {name}. The page stays empty rather than showing a stand-in figure.
    </p>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function datasetJsonLd(input: {
  name: string;
  description: string;
  path: string;
  dateModified: string | null;
  license: string;
  publisher: string;
  sourceUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: input.name,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    dateModified: input.dateModified ?? undefined,
    license: input.license,
    creator: { "@type": "Organization", name: "Budget", url: SITE_URL },
    isBasedOn: { "@type": "CreativeWork", name: input.publisher, url: input.sourceUrl },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${SITE_URL}/api/snapshots`,
    },
  };
}
