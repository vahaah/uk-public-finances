import { describe, expect, it } from "vitest";

import { ogImageUrl, pageMeta } from "@/lib/meta";

describe("pageMeta", () => {
  it("sets og:image and twitter:image on every page", () => {
    const meta = pageMeta({ title: "Debt", description: "d", path: "/debt" });
    const og = meta.openGraph as { images: { url: string; alt: string }[] };
    const twitter = meta.twitter as { images: { url: string; alt: string }[] };
    expect(og.images[0]?.url).toContain("/og?");
    expect(og.images[0]?.alt).toBe("Debt");
    expect(twitter.images[0]?.url).toBe(og.images[0]?.url);
    expect(twitter.images[0]?.alt).toBe("Debt");
  });

  it("names the section on the card", () => {
    const url = new URL(ogImageUrl("/budgets/2026-10-budget", "Budget 2026: forecast vs outturn"));
    expect(url.searchParams.get("k")).toBe("Budgets");
    expect(url.searchParams.get("t")).toBe("Budget 2026: forecast vs outturn");
  });
});
