import { head, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { parseBoeCsv } from "@/lib/parsers/boe";
import { parseDmoSales } from "@/lib/parsers/dmo";
import {
  pickHmrcReceiptsWorkbook,
  pickIncomeTaxWorkbook,
  pickPesaChapters,
  pickSearchHit,
  type GovukContent,
  type GovukSearchHit,
} from "@/lib/govuk";
import { parseHmrcReceipts } from "@/lib/parsers/hmrc";
import { parseIncomeTax } from "@/lib/parsers/taxpayers";
import { ONS_FILES, parseOnsRecords } from "@/lib/parsers/ons";
import { parseObrWorkbook } from "@/lib/parsers/obr";
import { parsePesa } from "@/lib/parsers/pesa";
import { snapshotSchemas, type SourceId } from "@/lib/schema";
import { buildEnvelope, decidePublish } from "@/lib/snapshot";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { REVALIDATE_PATHS, USER_AGENT } from "@/lib/site";

const ONS_BASE =
  "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries";

export async function revalidateDashboard(): Promise<void> {
  "use step";
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
}

export async function recordValidationFailure(sourceId: SourceId, error: string): Promise<void> {
  "use step";
  await writeJson(`health/${sourceId}.json`, {
    validationError: error,
    usingLastGood: true,
    at: new Date().toISOString(),
  });
}

export async function clearValidationFailure(sourceId: SourceId): Promise<void> {
  "use step";
  await writeJson(`health/${sourceId}.json`, {
    validationError: null,
    usingLastGood: false,
    at: new Date().toISOString(),
  });
}

export async function publishSnapshot(sourceId: SourceId, snapshot: unknown): Promise<void> {
  "use step";
  const hash =
    snapshot && typeof snapshot === "object" && "contentHash" in snapshot
      ? String((snapshot as { contentHash: string }).contentHash)
      : "snapshot";
  const pathname = `snapshots/${sourceId}/${hash}.json`;
  await writeJson(pathname, snapshot);
  await writeJson(`snapshots/${sourceId}/latest.json`, { pathname });
}

export async function runOns(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const probe = await getJson(`${ONS_BASE}/j5ii/pusf/data`);
  const releaseDate = text(probe.description, "releaseDate");
  const current = await readSnapshot("ons-psf");
  if (!force && current.snapshot?.releaseDate === releaseDate) {
    return { status: "unchanged", releaseDate };
  }
  const records: Record<string, unknown> = { j5ii: probe };
  for (const code of ONS_FILES) {
    if (code === "j5ii") continue;
    records[code] = await getJson(`${ONS_BASE}/${code}/pusf/data`);
  }
  return finish("ons-psf", () =>
    buildEnvelope({
      sourceId: "ons-psf",
      retrievedAt: new Date().toISOString(),
      releaseDate,
      nextRelease: text(probe.description, "nextRelease"),
      sourceUrl: `${ONS_BASE}/j5ii/pusf`,
      data: parseOnsRecords(records as never),
    }),
  );
}

export async function runHmrc(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const hit = await findContent(
    "HMRC tax receipts and National Insurance contributions for the UK",
    { filter_organisations: "hm-revenue-customs" },
    (candidate) => /tax receipts/i.test(candidate.title ?? ""),
  );
  const content = await getJson(`https://www.gov.uk/api/content${hit.link}`);
  const workbook = pickHmrcReceiptsWorkbook(content as GovukContent);
  const current = await readSnapshot("hmrc-receipts");
  if (!force && current.snapshot && "data" in current.snapshot) {
    const data = current.snapshot.data as { attachmentUrl?: string };
    if (data.attachmentUrl === workbook.url) return { status: "unchanged", releaseDate: content.public_updated_at };
  }
  const bytes = await getBytes(workbook.url ?? "");
  return finish("hmrc-receipts", () =>
    buildEnvelope({
      sourceId: "hmrc-receipts",
      retrievedAt: new Date().toISOString(),
      releaseDate: content.public_updated_at ?? null,
      nextRelease: null,
      sourceUrl: `https://www.gov.uk${hit.link}`,
      data: parseHmrcReceipts(bytes, {
        contentUrl: `https://www.gov.uk${hit.link}`,
        attachmentUrl: workbook.url ?? "",
        attachmentFilename: workbook.filename ?? "",
      }),
    }),
  );
}

export async function runPesa(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const hit = await findContent(
    "Public Expenditure Statistical Analyses",
    { filter_organisations: "hm-treasury" },
    (candidate) => /^Public Expenditure Statistical Analyses/i.test(candidate.title ?? ""),
  );
  const content = await getJson(`https://www.gov.uk/api/content${hit.link}`);
  const chapters = pickPesaChapters(content as GovukContent);
  const current = await readSnapshot("pesa");
  const releaseDate = content.public_updated_at ?? null;
  if (!force && current.snapshot?.releaseDate === releaseDate) return { status: "unchanged", releaseDate };
  const chapter4 = await getBytes(chapters.chapter4.url ?? "");
  const chapter6 = await getBytes(chapters.chapter6.url ?? "");
  return finish("pesa", () =>
    Promise.resolve(chapter4).then(async () =>
      buildEnvelope({
        sourceId: "pesa",
        retrievedAt: new Date().toISOString(),
        releaseDate,
        nextRelease: null,
        sourceUrl: `https://www.gov.uk${hit.link}`,
        data: await parsePesa(chapter4, chapter6, `https://www.gov.uk${hit.link}`),
      }),
    ),
  );
}

export async function runIncomeTax(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const hit = await findContent(
    "Income Tax liabilities statistics",
    { filter_organisations: "hm-revenue-customs" },
    (candidate) => /^Income Tax liabilities statistics:/i.test(candidate.title ?? ""),
  );
  const content = await getJson(`https://www.gov.uk/api/content${hit.link}`);
  const workbook = pickIncomeTaxWorkbook(content as GovukContent);
  const releaseDate = content.public_updated_at ?? null;
  const current = await readSnapshot("hmrc-income-tax");
  if (!force && current.snapshot?.releaseDate === releaseDate) return { status: "unchanged", releaseDate };
  const bytes = await getBytes(workbook.url ?? "");
  return finish("hmrc-income-tax", () =>
    buildEnvelope({
      sourceId: "hmrc-income-tax",
      retrievedAt: new Date().toISOString(),
      releaseDate,
      nextRelease: null,
      sourceUrl: `https://www.gov.uk${hit.link}`,
      data: parseIncomeTax(bytes, {
        contentUrl: `https://www.gov.uk${hit.link}`,
        attachmentUrl: workbook.url ?? "",
        attachmentFilename: workbook.filename ?? "",
      }),
    }),
  );
}

export async function runBoe(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const url =
    "https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&SeriesCodes=IUDBEDR,IUDMNPY&UsingCodes=Y&CSVF=TN&Datefrom=01/Jan/2016&Dateto=now";
  const csv = await getText(url);
  const data = parseBoeCsv(csv);
  const latest = data.series.IUDBEDR.latest?.date ?? null;
  const current = await readSnapshot("boe-yields");
  const currentLatest = takeSnapshot("boe-yields", current.snapshot)?.data.series.IUDBEDR.latest?.date ?? null;
  if (!force && currentLatest === latest) return { status: "unchanged", releaseDate: latest };
  return finish("boe-yields", () =>
    buildEnvelope({
      sourceId: "boe-yields",
      retrievedAt: new Date().toISOString(),
      releaseDate: latest,
      nextRelease: null,
      sourceUrl: "https://www.bankofengland.co.uk/boeapps/database/",
      data,
    }),
  );
}

export async function runDmo(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const response = await fetch("https://www.dmo.gov.uk/umbraco/surface/TabularData/GetSalesData", {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`DMO GetSalesData returned ${response.status}`);
  }
  const body = (await response.json()) as unknown;
  const data = parseDmoSales(body);
  const marker = data.portfolio ? String(data.portfolio.rawTotal) : null;
  const current = await readSnapshot("dmo-gilts");
  const currentTotal = takeSnapshot("dmo-gilts", current.snapshot)?.data.portfolio?.rawTotal ?? null;
  if (!force && currentTotal != null && String(currentTotal) === marker) {
    return { status: "unchanged", releaseDate: null };
  }
  return finish("dmo-gilts", () =>
    buildEnvelope({
      sourceId: "dmo-gilts",
      retrievedAt: new Date().toISOString(),
      releaseDate: new Date().toISOString(),
      nextRelease: null,
      sourceUrl: "https://www.dmo.gov.uk/umbraco/surface/TabularData/GetSalesData",
      data,
    }),
  );
}

export async function runObr(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const page = await fetch("https://obr.uk/data/", { headers: { "user-agent": USER_AGENT } });
  const html = await page.text();
  const blocked = page.status === 403 || /just a moment|cloudflare/i.test(html);
  if (!blocked) {
    const link = html.match(/href="([^"]+\.xlsx)"/i)?.[1];
    if (link) {
      const url = new URL(link, "https://obr.uk").toString();
      const bytes = await getBytes(url);
      return finish("obr-databank", async () =>
        buildEnvelope({
          sourceId: "obr-databank",
          retrievedAt: new Date().toISOString(),
          releaseDate: null,
          nextRelease: null,
          sourceUrl: url,
          data: await parseObrWorkbook(bytes, "obr"),
        }),
      );
    }
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { status: "missing", detail: blocked ? "obr-blocked" : "obr-link-not-found" };
  }
  try {
    const blob = await readManualObr();
    const current = await readSnapshot("obr-databank");
    const currentObr = takeSnapshot("obr-databank", current.snapshot);
    if (!force && currentObr?.data.origin === "blob-manual") {
      return { status: "unchanged", releaseDate: currentObr?.releaseDate ?? null };
    }
    return finish("obr-databank", async () =>
      buildEnvelope({
        sourceId: "obr-databank",
        retrievedAt: new Date().toISOString(),
        releaseDate: blob.uploadedAt,
        nextRelease: null,
        sourceUrl: "https://obr.uk/data/",
        sourceTitle: "Public finances databank (manual Blob upload)",
        data: await parseObrWorkbook(blob.bytes, "blob-manual"),
      }),
    );
  } catch (error) {
    if (isMissing(error)) {
      return { status: "missing", detail: blocked ? "obr-blocked-no-manual-upload" : "obr-no-manual-upload" };
    }
    throw error;
  }
}

async function finish(
  sourceId: SourceId,
  build: () => Promise<unknown> | unknown,
): Promise<Record<string, unknown>> {
  try {
    const snapshot = await build();
    const schema = snapshotSchemas[sourceId];
    const parsed = schema.safeParse(snapshot);
    const decision = decidePublish(
      parsed.success ? { ok: true as const, snapshot: parsed.data } : { ok: false as const, error: parsed.error.message },
    );
    if (decision.action === "keep-last-good") {
      await writeJson(`health/${sourceId}.json`, {
        validationError: decision.error,
        usingLastGood: true,
        at: new Date().toISOString(),
      });
      return { status: "validation_failed", error: decision.error };
    }
    const hash = decision.snapshot.contentHash;
    const pathname = `snapshots/${sourceId}/${hash}.json`;
    await writeJson(pathname, decision.snapshot);
    await writeJson(`snapshots/${sourceId}/latest.json`, { pathname });
    await writeJson(`health/${sourceId}.json`, {
      validationError: null,
      usingLastGood: false,
      at: new Date().toISOString(),
    });
    return { status: "updated", releaseDate: decision.snapshot.releaseDate };
  } catch (error) {
    const message = error instanceof Error ? error.message : "parse failed";
    await writeJson(`health/${sourceId}.json`, {
      validationError: message,
      usingLastGood: true,
      at: new Date().toISOString(),
    });
    return { status: "validation_failed", error: message };
  }
}

async function findContent(
  query: string,
  filters: Record<string, string>,
  test: (hit: GovukSearchHit) => boolean,
): Promise<GovukSearchHit> {
  const url = new URL("https://www.gov.uk/api/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("order", "-public_timestamp");
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
  const body = await getJson(url.toString());
  const hits = (Array.isArray(body.results) ? body.results : []) as GovukSearchHit[];
  return pickSearchHit(hits, test);
}

async function getJson(url: string): Promise<Record<string, unknown> & GovukContent> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return (await response.json()) as Record<string, unknown> & GovukContent;
}

async function getText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function getBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(pathname, JSON.stringify(value), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readManualObr(): Promise<{ bytes: Buffer; uploadedAt: string | null }> {
  const blob = await head("manual/obr-public-finances.xlsx");
  const response = await fetch(blob.url);
  if (!response.ok) throw new Error(`Manual OBR workbook returned ${response.status}`);
  return { bytes: Buffer.from(await response.arrayBuffer()), uploadedAt: blob.uploadedAt.toISOString() };
}

function text(record: unknown, key: string): string | null {
  if (!record || typeof record !== "object") return null;
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function isMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|404/i.test(message);
}
