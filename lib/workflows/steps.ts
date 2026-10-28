import { head, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { boeSnapshot, dmoSnapshot } from "@/lib/workflows/builds";
import { protectBuild } from "@/lib/workflows/guard";
import {
  GOVUK_PATHS,
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
import { droppedTooFar, snapshotRows } from "@/lib/quality";
import { snapshotSchemas, type AnySnapshot, type SourceId } from "@/lib/schema";
import { buildEnvelope, decidePublish } from "@/lib/snapshot";
import { readSnapshot } from "@/lib/store";
import { REVALIDATE_PATHS, USER_AGENT } from "@/lib/site";

const ONS_BASE =
  "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries";

export async function revalidateDashboard(): Promise<void> {
  "use step";
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
}

export async function recordValidationFailure(sourceId: SourceId, error: string): Promise<void> {
  "use step";
  await writeHealth(sourceId, error, true);
}

export async function clearValidationFailure(sourceId: SourceId): Promise<void> {
  "use step";
  await writeHealth(sourceId, null, false);
}

export async function publishSnapshot(sourceId: SourceId, snapshot: unknown): Promise<void> {
  "use step";
  const hash =
    snapshot && typeof snapshot === "object" && "contentHash" in snapshot
      ? String((snapshot as { contentHash: string }).contentHash)
      : "snapshot";
  const pathname = `snapshots/${sourceId}/${hash}.json`;
  await writeJson(pathname, snapshot, false);
  await writeJson(`snapshots/${sourceId}/latest.json`, { pathname }, true);
}

export async function runOns(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const probe = await getJson(`${ONS_BASE}/j5ii/pusf/data`);
  const releaseDate = text(probe.description, "releaseDate");
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
  const content = await getJson(`https://www.gov.uk/api/content${GOVUK_PATHS.hmrcReceipts}`);
  const hit = { link: GOVUK_PATHS.hmrcReceipts };
  const workbook = pickHmrcReceiptsWorkbook(content as GovukContent);
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
    (candidate) =>
      (candidate.link ?? "").startsWith(GOVUK_PATHS.pesaPrefix) &&
      /^Public Expenditure Statistical Analyses 20\d\d$/.test(candidate.title ?? ""),
  );
  const content = await getJson(`https://www.gov.uk/api/content${hit.link}`);
  const chapters = pickPesaChapters(content as GovukContent);
  const releaseDate = content.public_updated_at ?? null;
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
    (candidate) =>
      (candidate.link ?? "").startsWith(GOVUK_PATHS.incomeTaxPrefix) &&
      /^Income Tax liabilities statistics:/i.test(candidate.title ?? ""),
  );
  const content = await getJson(`https://www.gov.uk/api/content${hit.link}`);
  const workbook = pickIncomeTaxWorkbook(content as GovukContent);
  const releaseDate = content.public_updated_at ?? null;
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
  const retrievedAt = new Date().toISOString();
  return finish("boe-yields", () => boeSnapshot(csv, retrievedAt));
}

export async function runDmo(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const response = await fetch("https://www.dmo.gov.uk/umbraco/surface/TabularData/GetSalesData", {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`DMO GetSalesData returned ${response.status}`);
  }
  const raw = await response.text();
  const retrievedAt = new Date().toISOString();
  return finish("dmo-gilts", () => dmoSnapshot(raw, retrievedAt));
}

export async function runObr(force: boolean): Promise<Record<string, unknown>> {
  "use step";
  const page = await fetch("https://obr.uk/data/", { headers: { "user-agent": USER_AGENT } });
  const html = await page.text();
  const blocked = page.status === 403 || /just a moment|cloudflare/i.test(html);
  if (!blocked) {
    const link = [...html.matchAll(/href="([^"]+)"/gi)]
      .map((match) => match[1] ?? "")
      .find((href) => /public-finances-databank/i.test(href) && /\.xlsx(?:$|\?)/i.test(href));
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
    const built = await protectBuild(build, (message) => writeHealth(sourceId, message, true));
    if (!built.ok) return { status: "validation_failed", error: built.error };
    const snapshot = built.value;
    const schema = snapshotSchemas[sourceId];
    const parsed = schema.safeParse(snapshot);
    const decision = decidePublish(
      parsed.success ? { ok: true as const, snapshot: parsed.data } : { ok: false as const, error: parsed.error.message },
    );
    if (decision.action === "keep-last-good") {
      await writeHealth(sourceId, decision.error, true);
      return { status: "validation_failed", error: decision.error };
    }
    return commitSnapshot(decision.snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "parse failed";
    await writeHealth(sourceId, message, true);
    return { status: "validation_failed", error: message };
  }
}

export async function commitSnapshot(snapshot: AnySnapshot): Promise<Record<string, unknown>> {
  "use step";
  const current = await readSnapshot(snapshot.sourceId);
  if (current.snapshot?.contentHash === snapshot.contentHash) {
    return { status: "unchanged", releaseDate: snapshot.releaseDate };
  }
  if (current.snapshot && droppedTooFar(snapshotRows(current.snapshot), snapshotRows(snapshot))) {
    const error = `Row count fell by more than 20% for ${snapshot.sourceId}`;
    await writeHealth(snapshot.sourceId, error, true);
    return { status: "validation_failed", error };
  }
  const pathname = `snapshots/${snapshot.sourceId}/${snapshot.contentHash}.json`;
  await writeJson(pathname, snapshot, false);
  await writeJson(`snapshots/${snapshot.sourceId}/latest.json`, { pathname }, true);
  await writeHealth(snapshot.sourceId, null, false);
  return { status: "updated", releaseDate: snapshot.releaseDate };
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
  url.searchParams.set("filter_content_store_document_type", "national_statistics");
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

async function writeHealth(sourceId: SourceId, validationError: string | null, usingLastGood: boolean): Promise<void> {
  await writeJson(
    `health/${sourceId}.json`,
    { validationError, usingLastGood, at: new Date().toISOString() },
    true,
  );
}

async function writeJson(pathname: string, value: unknown, overwritten: boolean): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(pathname, JSON.stringify(value), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    ...(overwritten ? { cacheControlMaxAge: 60 } : {}),
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
