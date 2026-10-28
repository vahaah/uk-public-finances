import type { Metadata } from "next";

import { AUTHOR, SITE_NAME, SITE_URL } from "@/lib/site";

export function pageMeta(input: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** Social card text. Defaults to the section name and the page title. */
  og?: { kicker?: string; title?: string; detail?: string };
  keywords?: string[];
}): Metadata {
  const url = input.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${input.path}`;
  const image = ogImageUrl(input.path, input.og?.title ?? input.title, input.og?.kicker, input.og?.detail);
  const images = [{ url: image, width: 1200, height: 630, alt: input.og?.title ?? input.title }];
  return {
    title: input.path === "/" ? { absolute: `${input.title} | ${SITE_NAME}` } : input.title,
    description: input.description,
    ...(input.keywords ? { keywords: input.keywords } : {}),
    authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      creator: "@vahaah",
      images: [image],
    },
  };
}

const SECTIONS: Record<string, string> = {
  borrowing: "Borrowing",
  budgets: "Budgets",
  debt: "Debt",
  forecasts: "Forecasts",
  receipts: "Receipts",
  spending: "Spending",
  taxpayers: "Taxpayers",
  "old-money": "Old money",
  records: "Records",
  faq: "FAQ",
  glossary: "Glossary",
  methodology: "Methodology",
  "data-sources": "Data sources",
  "data-health": "Data health",
  api: "API",
};

export function ogImageUrl(path: string, title: string, kicker?: string, detail?: string): string {
  const section = path.split("/")[1] ?? "";
  const params = new URLSearchParams({ k: kicker ?? SECTIONS[section] ?? "UK public finances", t: title });
  if (detail) params.set("d", detail);
  return `${SITE_URL}/og?${params.toString()}`;
}
