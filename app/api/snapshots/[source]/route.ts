import { SOURCE_IDS, type SourceId } from "@/lib/schema";
import { readSnapshot } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ source: string }> },
): Promise<Response> {
  const { source } = await context.params;
  if (!SOURCE_IDS.includes(source as SourceId)) {
    return Response.json({ error: "unknown source" }, { status: 404 });
  }
  const loaded = await readSnapshot(source as SourceId);
  if (!loaded.snapshot) return Response.json({ error: "no snapshot" }, { status: 404 });
  return Response.json(loaded.snapshot, {
    headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=86400" },
  });
}
