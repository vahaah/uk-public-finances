import type { SourceId } from "@/lib/schema";

export const SITE_URL = "https://budget.vahaah.com";
export const SITE_NAME = "Budget";

export const FIXTURE_RETRIEVED_AT = "2026-10-28T06:45:00.000Z";

export const USER_AGENT = "Budget/0.1 (+https://budget.vahaah.com)";

export const DERIVED_LICENCE = "CC BY 4.0";
export const DERIVED_LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

export const NAV = [
  { href: "/", label: "Overview" },
  { href: "/receipts", label: "Tax and receipts" },
  { href: "/spending", label: "Spending" },
  { href: "/borrowing", label: "Borrowing" },
  { href: "/debt", label: "Debt and gilts" },
  { href: "/taxpayers", label: "Income taxpayers" },
  { href: "/forecasts", label: "Forecasts" },
] as const;

export const FOOTER = [
  { href: "/methodology", label: "Methodology" },
  { href: "/data-sources", label: "Data sources" },
  { href: "/data-health", label: "Data health" },
  { href: "/glossary", label: "Glossary" },
  { href: "/faq", label: "FAQ" },
  { href: "/old-money", label: "Old money vs new" },
  { href: "/api", label: "API" },
] as const;

export const REVALIDATE_PATHS = [
  "/",
  "/receipts",
  "/spending",
  "/borrowing",
  "/debt",
  "/taxpayers",
  "/forecasts",
  "/old-money",
  "/data-health",
  "/llms.txt",
  "/llms-full.txt",
] as const;

export type SourceMeta = {
  id: SourceId;
  title: string;
  publisher: string;
  licence: string;
  licenceUrl: string;
  page: string;
  staleAfterMs: number;
};

export const SOURCES: Record<SourceId, SourceMeta> = {
  "ons-psf": {
    id: "ons-psf",
    title: "Public sector finances time series",
    publisher: "Office for National Statistics",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    page: "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance",
    staleAfterMs: 45 * 24 * 60 * 60 * 1000,
  },
  "ons-prices": {
    id: "ons-prices",
    title: "GDP deflator, money GDP, CPI, CPIH and RPI",
    publisher: "Office for National Statistics",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    page: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/l8gg/qna",
    staleAfterMs: 120 * 24 * 60 * 60 * 1000,
  },
  "hmrc-receipts": {
    id: "hmrc-receipts",
    title: "HMRC tax receipts and National Insurance contributions for the UK",
    publisher: "HM Revenue & Customs",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    page: "https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk",
    staleAfterMs: 45 * 24 * 60 * 60 * 1000,
  },
  pesa: {
    id: "pesa",
    title: "Public Expenditure Statistical Analyses",
    publisher: "HM Treasury",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    page: "https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa",
    staleAfterMs: 400 * 24 * 60 * 60 * 1000,
  },
  "dmo-gilts": {
    id: "dmo-gilts",
    title: "Gilts in issue",
    publisher: "UK Debt Management Office",
    licence: "Crown copyright. Use is subject to the DMO website terms.",
    licenceUrl: "https://www.dmo.gov.uk/help/",
    page: "https://www.dmo.gov.uk/data/gilt-market/gilts-in-issue/",
    staleAfterMs: 14 * 24 * 60 * 60 * 1000,
  },
  "boe-yields": {
    id: "boe-yields",
    title: "Bank Rate and 10-year nominal par gilt yield",
    publisher: "Bank of England",
    licence: "Bank of England terms of use",
    licenceUrl: "https://www.bankofengland.co.uk/legal/terms-and-conditions",
    page: "https://www.bankofengland.co.uk/boeapps/database/",
    staleAfterMs: 5 * 24 * 60 * 60 * 1000,
  },
  "hmrc-income-tax": {
    id: "hmrc-income-tax",
    title: "Income Tax liabilities statistics",
    publisher: "HM Revenue & Customs",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    page: "https://www.gov.uk/government/collections/income-tax-statistics-and-distributions",
    staleAfterMs: 400 * 24 * 60 * 60 * 1000,
  },
  "obr-databank": {
    id: "obr-databank",
    title: "Public finances databank",
    publisher: "Office for Budget Responsibility",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    page: "https://obr.uk/data/",
    staleAfterMs: 200 * 24 * 60 * 60 * 1000,
  },
};

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
