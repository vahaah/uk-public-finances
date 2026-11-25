import type { Metadata } from "next";

import { clampDescription, clampTitle } from "@/lib/page-copy";
import { AUTHOR, SITE_NAME, SITE_URL } from "@/lib/site";

export function pageMeta(input: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** Social card text. `alt` is the live sentence. `version` is the snapshot stamp, so the image URL changes when the data does. */
  og?: { kicker?: string; title?: string; detail?: string; alt?: string; version?: string };
  keywords?: string[];
}): Metadata {
  const title = clampTitle(input.title);
  const description = clampDescription(input.description);
  const url = input.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${input.path}`;
  const alt = input.og?.alt ?? input.og?.title ?? title;
  const image = ogImageUrl(input.path, input.og?.title ?? title, input.og?.kicker, input.og?.detail, input.og?.version);
  const images = [{ url: image, width: 1200, height: 630, alt }];
  return {
    title: input.path === "/" ? { absolute: `${title} | ${SITE_NAME}` } : title,
    description,
    ...(input.keywords ? { keywords: input.keywords } : {}),
    authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@vahaah",
      images: [{ url: image, alt }],
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

export function ogImageUrl(path: string, title: string, kicker?: string, detail?: string, version?: string): string {
  const section = path.split("/")[1] ?? "";
  const params = new URLSearchParams({ k: kicker ?? SECTIONS[section] ?? "UK public finances", t: title, p: path });
  if (detail) params.set("d", detail);
  if (version) params.set("v", version);
  return `${SITE_URL}/og?${params.toString()}`;
}
