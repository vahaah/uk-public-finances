import type { Metadata } from "next";

import { SITE_NAME, SITE_URL } from "@/lib/site";

export function pageMeta(input: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = input.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${input.path}`;
  return {
    title: input.path === "/" ? { absolute: `${input.title} | ${SITE_NAME}` } : input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      creator: "@vahaah",
    },
  };
}
