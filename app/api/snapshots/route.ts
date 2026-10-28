import { SOURCE_IDS } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      sources: SOURCE_IDS.map((id) => ({
        id,
        url: `${SITE_URL}/api/snapshots/${id}`,
      })),
    },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=600" } },
  );
}
