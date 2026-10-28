import { head, list } from "@vercel/blob";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  CRITICAL_SOURCES,
  healthReportSchema,
  snapshotSchemas,
  type AnySnapshot,
  type HealthReport,
  type HealthSource,
  type SnapshotOf,
  type SourceId,
  SOURCE_IDS,
} from "@/lib/schema";
import { SOURCES } from "@/lib/site";

const ROOT = process.cwd();

export function fixturePath(sourceId: SourceId): string {
  return path.join(ROOT, "fixtures", "snapshots", `${sourceId}.json`);
}

export async function readSnapshot(sourceId: SourceId): Promise<{
  snapshot: AnySnapshot | null;
  origin: "blob" | "fixture" | "none";
  validationError: string | null;
  fallbackReason: string | null;
}> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const fixture = readFixture(sourceId);
    const fallbackReason = fixture ? "BLOB_READ_WRITE_TOKEN is not set" : null;
    return { snapshot: fixture, origin: fixture ? "fixture" : "none", validationError: null, fallbackReason };
  }
  const latest = await readLatest(sourceId);
  if (latest.snapshot) return { ...latest, origin: "blob", fallbackReason: null };
  let earlier: AnySnapshot | null = null;
  let listError: string | null = null;
  try {
    earlier = await readNewestValidVersion(sourceId);
  } catch (error) {
    listError = error instanceof Error ? error.message : "Blob list failed";
  }
  if (earlier) {
    return {
      snapshot: earlier,
      origin: "blob",
      validationError: latest.validationError ?? "latest.json failed; using an earlier Blob version",
      fallbackReason: null,
    };
  }
  const fixture = readFixture(sourceId);
  const fallbackReason = [
    latest.validationError ? `latest.json rejected: ${latest.validationError}` : "latest.json is missing",
    listError ? `list failed: ${listError}` : "no earlier Blob version validated",
  ].join("; ");
  logFallback(sourceId, fallbackReason);
  return {
    snapshot: fixture,
    origin: fixture ? "fixture" : "none",
    validationError: latest.validationError,
    fallbackReason,
  };
}

export async function readJournal(sourceId: SourceId): Promise<{
  validationError: string | null;
  usingLastGood: boolean;
  pending: boolean;
} | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const body = await readBlobJson(`health/${sourceId}.json`);
    return {
      validationError: typeof body.validationError === "string" ? body.validationError : null,
      usingLastGood: body.usingLastGood === true,
      pending: body.pending === true,
    };
  } catch {
    return null;
  }
}

export async function loadHealth(now = new Date()): Promise<HealthReport> {
  const sources: HealthSource[] = [];
  for (const source of SOURCE_IDS) {
    const loaded = await readSnapshot(source);
    const journal = await readJournal(source);
    sources.push(toHealthSource(source, loaded, journal, now));
  }
  const report = {
    ok: sources.every(
      (source) => source.status !== "validation_failed" && !(source.critical && source.status === "missing"),
    ),
    checkedAt: now.toISOString(),
    sources,
  };
  return healthReportSchema.parse(report);
}

function toHealthSource(
  source: SourceId,
  loaded: Awaited<ReturnType<typeof readSnapshot>>,
  journal: Awaited<ReturnType<typeof readJournal>>,
  now: Date,
): HealthSource {
  const critical = source === "obr-databank" ? false : CRITICAL_SOURCES.includes(source);
  const validationError = journal?.pending ? null : (journal?.validationError ?? loaded.validationError);
  const usingLastGood = journal?.usingLastGood === true || (validationError != null && loaded.snapshot != null);
  if (!loaded.snapshot) {
    const pending = source === "obr-databank" && (journal?.pending === true || validationError == null);
    return {
      source,
      status: pending ? "pending" : validationError ? "validation_failed" : "missing",
      critical,
      releaseDate: null,
      retrievedAt: null,
      origin: "none",
      validationError: pending ? null : validationError,
      usingLastGood: false,
      stale: false,
      fallbackReason: loaded.fallbackReason,
    };
  }
  const reference = loaded.snapshot.releaseDate ?? loaded.snapshot.retrievedAt;
  const age = now.getTime() - new Date(reference).getTime();
  const stale = Number.isFinite(age) && age > SOURCES[source].staleAfterMs;
  let status: HealthSource["status"] = "ok";
  if (validationError && usingLastGood) status = "validation_failed";
  else if (stale) status = "stale";
  // A fixture served while Blob is configured means ingest never wrote a snapshot. Do not report that as fresh.
  const fixtureFallback = loaded.origin === "fixture" && loaded.fallbackReason != null && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (status === "ok" && fixtureFallback) status = "stale";
  return {
    source,
    status,
    critical,
    releaseDate: loaded.snapshot.releaseDate,
    retrievedAt: loaded.snapshot.retrievedAt,
    origin: loaded.origin,
    validationError: status === "validation_failed" ? validationError : null,
    usingLastGood: status === "validation_failed",
    stale: stale || (status === "stale" && fixtureFallback),
    fallbackReason: loaded.fallbackReason,
  };
}

function logFallback(sourceId: SourceId, reason: string): void {
  console.warn(`snapshot ${sourceId} fell back: ${reason}`);
}

async function readLatest(sourceId: SourceId): Promise<{
  snapshot: AnySnapshot | null;
  validationError: string | null;
}> {
  try {
    const pointer = await readBlobJson(`snapshots/${sourceId}/latest.json`);
    const pathname = typeof pointer.pathname === "string" ? pointer.pathname : null;
    const body = pathname ? await readBlobJson(pathname) : pointer;
    const parsed = snapshotSchemas[sourceId].safeParse(body.snapshot ?? body);
    if (parsed.success) return { snapshot: parsed.data as AnySnapshot, validationError: null };
    return { snapshot: null, validationError: parsed.error.issues.map((issue) => issue.message).join("; ") };
  } catch (error) {
    if (isMissingBlob(error)) return { snapshot: null, validationError: null };
    return { snapshot: null, validationError: error instanceof Error ? error.message : "Blob read failed" };
  }
}

async function readNewestValidVersion(sourceId: SourceId): Promise<AnySnapshot | null> {
  const listed = await list({ prefix: `snapshots/${sourceId}/` });
  const versions = listed.blobs
    .filter((blob) => !blob.pathname.endsWith("/latest.json"))
    .sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime());
  for (const blob of versions) {
    const response = await fetch(blob.url, blobPageFetchInit());
    if (!response.ok) continue;
    const body = (await response.json()) as { snapshot?: unknown };
    const parsed = snapshotSchemas[sourceId].safeParse(body.snapshot ?? body);
    if (parsed.success) return parsed.data as AnySnapshot;
  }
  return null;
}

export function firstValidSnapshot(sourceId: SourceId, candidates: unknown[]): AnySnapshot | null {
  for (const candidate of candidates) {
    const body = candidate as { snapshot?: unknown };
    const parsed = snapshotSchemas[sourceId].safeParse(body.snapshot ?? candidate);
    if (parsed.success) return parsed.data as AnySnapshot;
  }
  return null;
}

function isMissingBlob(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not found|404|BlobNotFound|does not exist/i.test(message);
}

function readFixture(sourceId: SourceId): AnySnapshot | null {
  const file = fixturePath(sourceId);
  if (!existsSync(file)) return null;
  const parsed = snapshotSchemas[sourceId].safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    throw new Error(
      `${sourceId} fixture failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return parsed.data as AnySnapshot;
}

/** Matches the minimum Blob cache on overwritten files. `no-store` opts an ISR page into dynamic rendering. */
export const BLOB_PAGE_REVALIDATE_SECONDS = 60;

export function blobPageFetchInit(): { next: { revalidate: number } } {
  return { next: { revalidate: BLOB_PAGE_REVALIDATE_SECONDS } };
}

async function readBlobJson(pathname: string): Promise<Record<string, unknown>> {
  const blob = await head(pathname);
  const response = await fetch(blob.url, blobPageFetchInit());
  if (!response.ok) throw new Error(`Blob ${pathname} returned ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

export function snapshotUrl(sourceId: SourceId): string {
  return `/api/snapshots/${sourceId}`;
}

export function takeSnapshot<T extends SourceId>(
  sourceId: T,
  snapshot: AnySnapshot | null,
): SnapshotOf<T> | null {
  if (snapshot?.sourceId !== sourceId) return null;
  return snapshot as SnapshotOf<T>;
}
