import { parseBoeCsv } from "@/lib/parsers/boe";
import { parseDmoSales } from "@/lib/parsers/dmo";
import { buildEnvelope } from "@/lib/snapshot";

export function boeSnapshot(csv: string, retrievedAt: string) {
  const data = parseBoeCsv(csv);
  return buildEnvelope({
    sourceId: "boe-yields",
    retrievedAt,
    releaseDate: data.series.IUDBEDR.latest?.date ?? null,
    nextRelease: null,
    sourceUrl: "https://www.bankofengland.co.uk/boeapps/database/",
    data,
  });
}

export function dmoSnapshot(raw: string, retrievedAt: string) {
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "parse failed";
    throw new Error(`DMO sales payload is not JSON: ${detail}`);
  }
  const data = parseDmoSales(body);
  return buildEnvelope({
    sourceId: "dmo-gilts",
    retrievedAt,
    releaseDate: retrievedAt,
    nextRelease: null,
    sourceUrl: "https://www.dmo.gov.uk/umbraco/surface/TabularData/GetSalesData",
    data,
  });
}
