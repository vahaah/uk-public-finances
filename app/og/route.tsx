import { ogCard } from "@/lib/og";

/** Per-page social card. pageMeta() points og:image and twitter:image here. */
export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  return ogCard({
    kicker: params.get("k") || "UK public finances",
    title: params.get("t") || "UK public finances",
    detail: params.get("d") || undefined,
  });
}
