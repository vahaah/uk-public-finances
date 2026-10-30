import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseBoeCsv } from "@/lib/parsers/boe";
import { parseDmoSales } from "@/lib/parsers/dmo";
import { parseHmrcReceipts } from "@/lib/parsers/hmrc";
import { parseOnsDirectory } from "@/lib/parsers/ons";
import { parsePriceDirectory } from "@/lib/parsers/prices";
import { parsePesa } from "@/lib/parsers/pesa";
import { parseDfePerPupil, parseHmtDeflators, parseIndependentForecasts } from "@/lib/parsers/extras";
import { loadSeedEvents } from "@/lib/budgets/seed";
import { parseIncomeTax } from "@/lib/parsers/taxpayers";
import { snapshotSchemas, type SourceId } from "@/lib/schema";
import { buildEnvelope } from "@/lib/snapshot";
import { FIXTURE_RETRIEVED_AT } from "@/lib/site";

const root = process.cwd();
const outDir = path.join(root, "fixtures", "snapshots");

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const ons = parseOnsDirectory(path.join(root, "fixtures/raw/ons"));
  const onsRelease = ons.series.j5ii?.releaseDate ?? null;
  write("ons-psf", buildEnvelope({
    sourceId: "ons-psf",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: onsRelease,
    nextRelease: ons.series.j5ii?.nextRelease || null,
    sourceUrl: "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/j5ii/pusf/data",
    data: ons,
  }));

  const prices = parsePriceDirectory(path.join(root, "fixtures/raw/ons/prices"));
  const priceReleases = [prices.mnf2, prices.l8gg, prices.bktl, prices.d7bt, prices.l522, prices.chaw].map(
    (series) => series.releaseDate,
  );
  write("ons-prices", buildEnvelope({
    sourceId: "ons-prices",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: priceReleases.slice().sort()[0] ?? null,
    nextRelease: null,
    sourceUrl: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/l8gg/qna/data",
    data: prices,
  }));

  const hmrcContent = JSON.parse(readFileSync(path.join(root, "fixtures/raw/govuk/hmrc-receipts-content.json"), "utf8")) as {
    public_updated_at?: string;
    base_path?: string;
    details: { attachments: { url?: string; filename?: string; content_type?: string }[] };
  };
  const hmrcFile = hmrcContent.details.attachments.find((attachment) => attachment.content_type?.includes("spreadsheet"));
  if (!hmrcFile?.url) throw new Error("HMRC fixture content has no spreadsheet");
  write("hmrc-receipts", buildEnvelope({
    sourceId: "hmrc-receipts",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: hmrcContent.public_updated_at ?? null,
    nextRelease: null,
    sourceUrl: `https://www.gov.uk${hmrcContent.base_path}`,
    data: parseHmrcReceipts(readFileSync(path.join(root, "fixtures/raw/hmrc/NS_Table.ods")), {
      contentUrl: `https://www.gov.uk${hmrcContent.base_path}`,
      attachmentUrl: hmrcFile.url,
      attachmentFilename: hmrcFile.filename ?? "NS_Table.ods",
    }),
  }));

  const pesaContent = JSON.parse(readFileSync(path.join(root, "fixtures/raw/govuk/pesa-2026-content.json"), "utf8")) as {
    public_updated_at?: string;
    base_path?: string;
  };
  write("pesa", buildEnvelope({
    sourceId: "pesa",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: pesaContent.public_updated_at ?? null,
    nextRelease: null,
    sourceUrl: `https://www.gov.uk${pesaContent.base_path}`,
    data: {
      ...(await parsePesa(
      readFileSync(path.join(root, "fixtures/raw/pesa/chapter-4.xlsx")),
      readFileSync(path.join(root, "fixtures/raw/pesa/chapter-6.xlsx")),
      `https://www.gov.uk${pesaContent.base_path}`,
    )),
      deflators: {
        ...(await parseHmtDeflators(readFileSync(path.join(root, "fixtures/raw/hmt/gdp-deflators.xlsx")))),
        url: "https://www.gov.uk/government/statistics/gdp-deflators-at-market-prices-and-money-gdp-october-2026-budget",
        releaseDate: "2026-10-29T12:28:09Z",
      },
      independent: {
        title: "Forecasts for the UK economy: October 2026",
        url: "https://www.gov.uk/government/statistics/forecasts-for-the-uk-economy-october-2026",
        releaseDate: "2026-10-21T09:00:03Z",
        years: await parseIndependentForecasts(readFileSync(path.join(root, "fixtures/raw/hmt/independent-forecasts.xlsx"))),
      },
      perPupil: {
        ...parseDfePerPupil(new Uint8Array(readFileSync(path.join(root, "fixtures/raw/dfe/school-funding-tab1.zip")))),
        url: "https://explore-education-statistics.service.gov.uk/find-statistics/school-funding-statistics",
        releaseDate: "2026-10-26",
      },
    },
  }));

  const boe = parseBoeCsv(readFileSync(path.join(root, "fixtures/raw/boe/iadb.csv"), "utf8"));
  write("boe-yields", buildEnvelope({
    sourceId: "boe-yields",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: boe.series.IUDMNPY.latest?.date ?? boe.series.IUDBEDR.latest?.date ?? null,
    nextRelease: null,
    sourceUrl: "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&SeriesCodes=IUDBEDR,IUDMNPY&UsingCodes=Y",
    data: boe,
  }));

  const itlContent = JSON.parse(readFileSync(path.join(root, "fixtures/raw/govuk/income-tax-content.json"), "utf8")) as {
    public_updated_at?: string;
    base_path?: string;
    details: { attachments: { url?: string; filename?: string }[] };
  };
  const itlFile = itlContent.details.attachments[0];
  if (!itlFile?.url) throw new Error("Income tax fixture content has no spreadsheet");
  const itlContentUrl = `https://www.gov.uk${itlContent.base_path}`;
  write("hmrc-income-tax", buildEnvelope({
    sourceId: "hmrc-income-tax",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: itlContent.public_updated_at ?? null,
    nextRelease: null,
    sourceUrl: itlContentUrl,
    data: parseIncomeTax(readFileSync(path.join(root, "fixtures/raw/hmrc/income-tax-liabilities.ods")), {
      contentUrl: itlContentUrl,
      attachmentUrl: itlFile.url,
      attachmentFilename: itlFile.filename ?? "",
    }),
  }));

  const sales = JSON.parse(readFileSync(path.join(root, "fixtures/raw/dmo/sales.json"), "utf8")) as {
    capturedAt: string;
    url: string;
    body: unknown;
  };
  const lastUpdated = typeof (sales.body as { LastUpdated?: string }).LastUpdated === "string"
    ? (sales.body as { LastUpdated: string }).LastUpdated
    : sales.capturedAt;
  write("budgets-events", buildEnvelope({
    sourceId: "budgets-events",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: null,
    nextRelease: null,
    sourceUrl: "https://www.gov.uk/api/search.json",
    data: { events: loadSeedEvents(), checkedAt: null },
  }));
  write("budgets-obr", buildEnvelope({
    sourceId: "budgets-obr",
    retrievedAt: FIXTURE_RETRIEVED_AT,
    releaseDate: null,
    nextRelease: null,
    sourceUrl: "https://obr.uk/data/",
    sourceTitle: "OBR files uploaded to Blob",
    data: {
      historical: { loaded: false, asOf: null, vintages: [] },
      measures: { loaded: false, asOf: null, rows: [] },
      evaluation: { loaded: false, asOf: null, rows: [] },
      headroom: { loaded: false, asOf: null, rows: [] },
    },
  }));

  write("dmo-gilts", buildEnvelope({
    sourceId: "dmo-gilts",
    retrievedAt: lastUpdated,
    releaseDate: lastUpdated,
    nextRelease: null,
    sourceUrl: sales.url,
    data: parseDmoSales(sales.body),
  }));
}

function write(sourceId: SourceId, snapshot: unknown): void {
  const parsed = snapshotSchemas[sourceId].parse(snapshot);
  const file = path.join(outDir, `${sourceId}.json`);
  writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(sourceId, parsed.contentHash.slice(0, 12));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
