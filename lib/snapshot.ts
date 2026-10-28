import { sha256, stableStringify } from "@/lib/numbers";
import type { SourceId } from "@/lib/schema";
import { SOURCES } from "@/lib/site";

export function buildEnvelope<T>(input: {
  sourceId: SourceId;
  retrievedAt: string;
  releaseDate: string | null;
  nextRelease: string | null;
  sourceUrl: string;
  sourceTitle?: string;
  data: T;
}) {
  const meta = SOURCES[input.sourceId];
  return {
    sourceId: input.sourceId,
    schemaVersion: 1 as const,
    retrievedAt: input.retrievedAt,
    releaseDate: input.releaseDate,
    nextRelease: input.nextRelease,
    sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle ?? meta.title,
    publisher: meta.publisher,
    licence: meta.licence,
    licenceUrl: meta.licenceUrl,
    contentHash: sha256(stableStringify(input.data)),
    data: input.data,
  };
}

export type PublishDecision<T> =
  | { action: "write"; snapshot: T }
  | { action: "keep-last-good"; error: string };

/** A failed zod parse must not replace the last good snapshot. */
export function decidePublish<T>(
  result: { ok: true; snapshot: T } | { ok: false; error: string },
): PublishDecision<T> {
  if (result.ok) return { action: "write", snapshot: result.snapshot };
  return { action: "keep-last-good", error: result.error };
}
