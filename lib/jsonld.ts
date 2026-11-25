import { AUTHOR, SITE_URL } from "@/lib/site";
import type { SourceId } from "@/lib/schema";

/** Place, not Country: Google's Dataset rich result rejects Country for spatialCoverage. */
export const UK_PLACE = { "@type": "Place", name: "United Kingdom" } as const;

const PUBLISHER_URL: Record<string, string> = {
  "Office for National Statistics": "https://www.ons.gov.uk",
  "HM Revenue & Customs": "https://www.gov.uk/government/organisations/hm-revenue-customs",
  "HM Treasury": "https://www.gov.uk/government/organisations/hm-treasury",
  "Office for Budget Responsibility": "https://obr.uk",
  "UK Debt Management Office": "https://www.dmo.gov.uk",
  "Bank of England": "https://www.bankofengland.co.uk",
  Ofgem: "https://www.ofgem.gov.uk",
};

/** Organization, not a subtype. Google's Dataset check rejects GovernmentOrganization for publisher. */
export function organizationJsonLd(name: string): { "@type": "Organization"; name: string; url?: string } {
  const url = PUBLISHER_URL[name];
  return url ? { "@type": "Organization", name, url } : { "@type": "Organization", name };
}

export type DatasetSource = {
  id: SourceId;
  name: string;
  url: string;
  publisher: string;
  licenceUrl: string;
  releaseDate: string | null;
};

/** A source dataset Google will accept when it appears in isBasedOn. */
export function officialDataset(source: { name: string; url: string; publisher: string; licenceUrl?: string; releaseDate?: string | null }) {
  return {
    "@type": "Dataset" as const,
    name: source.name,
    description: `${source.name}. Published by ${source.publisher}.`,
    url: source.url,
    creator: organizationJsonLd(source.publisher),
    publisher: organizationJsonLd(source.publisher),
    ...(source.licenceUrl ? { license: source.licenceUrl } : {}),
    ...(source.releaseDate ? { datePublished: source.releaseDate.slice(0, 10) } : {}),
  };
}

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
    spatialCoverage: UK_PLACE,
    variableMeasured: input.variableMeasured,
    dateModified: input.dateModified ?? undefined,
    creator: AUTHOR_JSON_LD,
    publisher: AUTHOR_JSON_LD,
    includedInDataCatalog: { "@type": "DataCatalog", name: "Budget", url: `${SITE_URL}/` },
    license: allOgl ? "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" : `${SITE_URL}/data-sources`,
    isBasedOn: input.sources.map((source) => officialDataset(source)),
    citation: input.sources.map(
      (source) => `${source.publisher}, ${source.name}${source.releaseDate ? `, released ${source.releaseDate.slice(0, 10)}` : ""}. ${source.url}`,
    ),
    distribution: input.sources.map((source) => ({
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: `${SITE_URL}/api/snapshots/${source.id}`,
      license: source.licenceUrl,
    })),
  };
}

/** The site's author. Matches the "Made by" credit in the footer. */
export const AUTHOR_JSON_LD = { "@type": "Person", "@id": "https://vahaah.com/#person", name: AUTHOR.name, url: AUTHOR.url } as const;

export function articleJsonLd(input: { path: string; headline: string; description: string; datePublished: string; dateModified: string }) {
  const url = `${SITE_URL}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished.slice(0, 10),
    dateModified: input.dateModified.slice(0, 10),
    inLanguage: "en-GB",
    mainEntityOfPage: url,
    url,
    image: `${SITE_URL}/og`,
    author: AUTHOR_JSON_LD,
    publisher: { "@type": "Organization", name: "Budget", url: `${SITE_URL}/` },
  };
}

export function breadcrumbJsonLd(current: string, path: string, parents: { href: string; label: string }[] = []) {
  const crumbs = [
    { name: "UK public finances", item: `${SITE_URL}/` },
    ...parents.map((parent) => ({ name: parent.label, item: parent.href.startsWith("http") ? parent.href : `${SITE_URL}${parent.href}` })),
    { name: current, item: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      AUTHOR_JSON_LD,
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
        description: "Free view of UK public finances from the ONS, HMRC, HM Treasury, the UK Debt Management Office and the Bank of England.",
      },
    ],
  };
}
