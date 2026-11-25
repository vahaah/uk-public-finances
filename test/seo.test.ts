import { describe, expect, it } from "vitest";

import { lastObservationByMonth } from "@/lib/chart-time";
import { indexNowUrls } from "@/lib/indexnow";
import { articleJsonLd, breadcrumbJsonLd, datasetJsonLd, officialDataset } from "@/lib/jsonld";
import { DESCRIPTION_MAX, PAGE_COPY, TITLE_SUFFIX, TITLE_TAG_MAX, clampDescription, clampTitle } from "@/lib/page-copy";
import { NOINDEX_PATHS, buildSitemapEntries, laterStamp, outturnSettledAt } from "@/lib/sitemap-entries";
import robots from "@/app/robots";

const source = {
  id: "ons-psf" as const,
  name: "Public sector finances time series",
  url: "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance",
  publisher: "Office for National Statistics",
  licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  releaseDate: "2026-11-20T23:00:00.000Z",
};

describe("dataset JSON-LD", () => {
  const data = datasetJsonLd({
    path: "/",
    name: "UK public sector finances: headline figures",
    description: "Latest monthly UK public sector borrowing, receipts, spending and net debt.",
    keywords: ["UK budget breakdown"],
    temporalCoverage: "1993-01/2026-09",
    variableMeasured: ["Public sector net borrowing (J5II)"],
    dateModified: source.releaseDate,
    sources: [source],
  });

  it("gives the page dataset a description, a Place and no isPartOf", () => {
    expect(data.description.length).toBeGreaterThan(0);
    expect(data.spatialCoverage["@type"]).toBe("Place");
    expect(data).not.toHaveProperty("isPartOf");
    expect(JSON.stringify(data.spatialCoverage)).not.toContain("Country");
  });

  it("gives each nested dataset a description and an Organization creator and publisher", () => {
    expect(data.isBasedOn.length).toBeGreaterThan(0);
    for (const basedOn of data.isBasedOn) {
      expect(basedOn["@type"]).toBe("Dataset");
      expect(basedOn.description.length).toBeGreaterThan(0);
      expect(basedOn.creator["@type"]).toBe("Organization");
      expect(basedOn.publisher["@type"]).toBe("Organization");
      expect(basedOn.publisher.url).toMatch(/^https:\/\//);
    }
    expect(JSON.stringify(data.isBasedOn)).not.toContain("GovernmentOrganization");
  });

  it("builds an official dataset directly", () => {
    const official = officialDataset(source);
    expect(official.datePublished).toBe("2026-11-20");
    expect(official.creator.name).toBe("Office for National Statistics");
  });
});

describe("article and breadcrumb JSON-LD", () => {
  it("puts publication dates on an explained article", () => {
    const article = articleJsonLd({
      path: "/budgets/2026-10-budget/explained",
      headline: "UK Budget 2026 explained",
      description: "The OBR forecast.",
      datePublished: "2026-10-28",
      dateModified: "2026-11-20T23:00:00.000Z",
    });
    expect(article["@type"]).toBe("Article");
    expect(article.datePublished).toBe("2026-10-28");
    expect(article.dateModified).toBe("2026-11-20");
    expect(article.publisher["@type"]).toBe("Organization");
  });

  it("lists parent crumbs as their own items", () => {
    const crumbs = breadcrumbJsonLd("Explained", "/budgets/2026-10-budget/explained", [
      { href: "/budgets", label: "Budgets" },
      { href: "/budgets/2026-10-budget", label: "Budget 2026" },
    ]);
    expect(crumbs.itemListElement.map((item) => item.name)).toEqual(["UK public finances", "Budgets", "Budget 2026", "Explained"]);
  });
});

describe("page copy limits", () => {
  it.each(Object.entries(PAGE_COPY))("%s fits the title and description limits", (_name, copy) => {
    expect(copy.title.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(TITLE_TAG_MAX);
    expect(copy.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("clamps a long description on a word boundary", () => {
    const clamped = clampDescription(`${"word ".repeat(80)}end`);
    expect(clamped.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(clamped.endsWith("…")).toBe(true);
    expect(clampTitle("x".repeat(80)).length).toBeLessThanOrEqual(TITLE_TAG_MAX - TITLE_SUFFIX.length);
  });
});

describe("sitemap dates", () => {
  const entries = buildSitemapEntries({
    now: new Date("2026-11-25T12:00:00.000Z"),
    staticDate: new Date("2026-10-01T00:00:00.000Z"),
    ons: "2026-11-20T23:00:00.000Z",
    hmrc: "2026-10-21T00:00:00.000Z",
    pesa: "2026-07-01T00:00:00.000Z",
    tax: "2026-06-01T00:00:00.000Z",
    boe: "2026-11-24T00:00:00.000Z",
    dmo: "2026-11-01T00:00:00.000Z",
    obr: "2026-10-28T00:00:00.000Z",
    databank: "2026-03-03T00:00:00.000Z",
    prices: "2026-09-01T00:00:00.000Z",
    events: [
      { slug: "2010-06-emergency-budget", date: "2010-06-22" },
      { slug: "2024-10-autumn-budget", date: "2024-10-30" },
      { slug: "2026-10-budget", date: "2026-10-28" },
    ],
    explained: { slug: "2026-10-budget", date: "2026-10-28", modified: "2026-10-28T00:00:00.000Z" },
  });
  const at = (path: string) => entries.find((entry) => entry.path === path);

  it("uses the ONS release for the home page and a later yield date for debt", () => {
    expect(at("/")?.lastModified.toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(at("/borrowing")?.lastModified.toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(at("/debt")?.lastModified.toISOString()).toBe("2026-11-24T00:00:00.000Z");
    expect(at("/receipts")?.lastModified.toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });

  it("keeps a Budget page on the latest release until its year-ahead outturn has settled", () => {
    expect(outturnSettledAt("2024-10-30").toISOString().slice(0, 10)).toBe("2028-03-31");
    expect(outturnSettledAt("2010-06-22").toISOString().slice(0, 10)).toBe("2014-03-31");
    expect(at("/budgets/2010-06-emergency-budget")?.lastModified.toISOString().slice(0, 10)).toBe("2014-03-31");
    expect(at("/budgets/2024-10-autumn-budget")?.lastModified.toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(at("/budgets/2026-10-budget")?.lastModified.toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(at("/budgets/2010-06-emergency-budget")?.lastModified.toISOString()).not.toBe(at("/budgets/2026-10-budget")?.lastModified.toISOString());
  });

  it("does not date an article before it was published", () => {
    expect(laterStamp("2026-10-28", "2024-03-06")).toBe("2026-10-28");
    expect(laterStamp("2026-10-28", "2026-11-20T00:00:00.000Z")).toBe("2026-11-20T00:00:00.000Z");
  });

  it("dates the explained page from the OBR file, not the monthly ONS release", () => {
    expect(at("/budgets/2026-10-budget/explained")?.lastModified.toISOString().slice(0, 10)).toBe("2026-10-28");
  });

  it("lists the indexable sections and leaves out noindex paths", () => {
    for (const path of ["/", "/receipts", "/spending", "/borrowing", "/debt", "/taxpayers", "/forecasts", "/forecasts/history", "/budgets", "/budgets/rules", "/faq", "/glossary", "/methodology", "/data-sources", "/old-money", "/records"]) {
      expect(at(path)).toBeDefined();
    }
    for (const path of NOINDEX_PATHS) expect(at(path)).toBeUndefined();
  });
});

describe("IndexNow targets", () => {
  const events = [{ slug: "2026-10-budget" }];

  it("pings the pages a source changes and never a noindex path", () => {
    const urls = indexNowUrls("ons-psf", events, "/budgets/2026-10-budget/explained");
    expect(urls).toContain("https://budget.vahaah.com/");
    expect(urls).toContain("https://budget.vahaah.com/borrowing");
    expect(urls).toContain("https://budget.vahaah.com/budgets/2026-10-budget");
    expect(urls.join(" ")).not.toContain("/api");
    expect(urls.join(" ")).not.toContain("/data-health");
    expect(indexNowUrls("ofgem-cap", events, null)).toEqual([]);
    expect(indexNowUrls("boe-yields", events, null)).toEqual(["https://budget.vahaah.com/debt"]);
  });
});

describe("robots", () => {
  it("points at the sitemap and blocks the cron", () => {
    const body = JSON.stringify(robots());
    expect(body).toContain("https://budget.vahaah.com/sitemap.xml");
    expect(body).toContain("/api/cron/");
    expect(body).toContain("/api/snapshots/");
  });
});

describe("yield downsample", () => {
  it("keeps the last observation in each month", () => {
    const points = lastObservationByMonth([
      { date: "2026-01-02", value: 1 },
      { date: "2026-01-20", value: 2 },
      { date: "2026-02-01", value: 3 },
    ]);
    expect(points).toEqual([
      { date: "2026-01-20", value: 2 },
      { date: "2026-02-01", value: 3 },
    ]);
  });
});
