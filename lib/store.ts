import { head } from "@vercel/blob";
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
}> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const pointer = await readBlobJson(`snapshots/${sourceId}/latest.json`);
      const pathname = typeof pointer.pathname === "string" ? pointer.pathname : null;
      const body = pathname ? await readBlobJson(pathname) : pointer;
      const parsed = snapshotSchemas[sourceId].safeParse(body.snapshot ?? body);
      if (parsed.success) {
        return { snapshot: parsed.data as AnySnapshot, origin: "blob", validationError: null };
      }
      const fixture = readFixture(sourceId);
      return {
        snapshot: fixture,
        origin: fixture ? "fixture" : "none",
        validationError: parsed.error.issues.map((issue) => issue.message).join("; "),
      };
    } catch (error) {
      const fixture = readFixture(sourceId);
      if (isMissingBlob(error)) {
        return { snapshot: fixture, origin: fixture ? "fixture" : "none", validationError: null };
      }
      return {
        snapshot: fixture,
        origin: fixture ? "fixture" : "none",
        validationError: error instanceof Error ? error.message : "Blob read failed",
      };
    }
  }
  const fixture = readFixture(sourceId);
  return { snapshot: fixture, origin: fixture ? "fixture" : "none", validationError: null };
}

export async function readJournal(sourceId: SourceId): Promise<{
  validationError: string | null;
  usingLastGood: boolean;
} | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const body = await readBlobJson(`health/${sourceId}.json`);
    return {
      validationError: typeof body.validationError === "string" ? body.validationError : null,
      usingLastGood: body.usingLastGood === true,
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
    ok: sources.every((source) => source.status !== "validation_failed" && !(source.critical && source.status === "missing")),
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
  const critical = CRITICAL_SOURCES.includes(source);
  const validationError = journal?.validationError ?? loaded.validationError;
  const usingLastGood = journal?.usingLastGood === true || (validationError != null && loaded.snapshot != null);
  if (!loaded.snapshot) {
    return {
      source,
      status: validationError ? "validation_failed" : "missing",
      critical,
      releaseDate: null,
      retrievedAt: null,
      origin: "none",
      validationError,
      usingLastGood: false,
      stale: false,
    };
  }
  const reference = loaded.snapshot.releaseDate ?? loaded.snapshot.retrievedAt;
  const age = now.getTime() - new Date(reference).getTime();
  const stale = Number.isFinite(age) && age > SOURCES[source].staleAfterMs;
  let status: HealthSource["status"] = "ok";
  if (validationError && usingLastGood) status = "validation_failed";
  else if (stale) status = "stale";
  return {
    source,
    status,
    critical,
    releaseDate: loaded.snapshot.releaseDate,
    retrievedAt: loaded.snapshot.retrievedAt,
    origin: loaded.origin,
    validationError: status === "validation_failed" ? validationError : null,
    usingLastGood: status === "validation_failed",
    stale,
  };
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

async function readBlobJson(pathname: string): Promise<Record<string, unknown>> {
  const blob = await head(pathname);
  const response = await fetch(blob.url);
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
