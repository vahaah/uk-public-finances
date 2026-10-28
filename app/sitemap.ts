import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const PATHS = [
  "/",
  "/receipts",
  "/spending",
  "/borrowing",
  "/debt",
  "/taxpayers",
  "/forecasts",
  "/methodology",
  "/data-sources",
  "/data-health",
  "/glossary",
  "/faq",
  "/api",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-10-28T06:45:00.000Z");
  return PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" || path === "/borrowing" || path === "/debt" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
