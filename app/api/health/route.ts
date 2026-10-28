import { loadHealth } from "@/lib/store";

export async function GET(): Promise<Response> {
  const health = await loadHealth();
  return Response.json(health, {
    status: health.ok ? 200 : 503,
    headers: {
      "cache-control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
