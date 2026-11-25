import { ogCard } from "@/lib/og";
import { shareCard } from "@/lib/share-card";

export const revalidate = 60;

/** Per-page social card. pageMeta() points og:image and twitter:image here, with a version query so a new snapshot is a new URL. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const path = params.get("p");
  const live = path ? await shareCard(path) : null;
  if (live) {
    return ogCard({ kicker: live.kicker, title: live.sentence });
  }
  return ogCard({
    kicker: params.get("k") || "UK public finances",
    title: params.get("t") || "UK public finances",
    detail: params.get("d") || undefined,
  });
}
