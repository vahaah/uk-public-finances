import { describe, expect, it } from "vitest";

import { ogImageUrl, pageMeta } from "@/lib/meta";

describe("pageMeta", () => {
  it("sets og:image and twitter:image on every page", () => {
    const meta = pageMeta({ title: "Debt", description: "d", path: "/debt" });
    const og = meta.openGraph as { images: { url: string }[] };
    expect(og.images[0]?.url).toContain("/og?");
    expect((meta.twitter as { images: string[] }).images[0]).toBe(og.images[0]?.url);
  });

  it("names the section on the card", () => {
    const url = new URL(ogImageUrl("/budgets/2026-10-budget", "Budget 2026: forecast vs outturn"));
    expect(url.searchParams.get("k")).toBe("Budgets");
    expect(url.searchParams.get("t")).toBe("Budget 2026: forecast vs outturn");
  });
});
