import { mkdirSync } from "node:fs";

import { expect, test } from "@playwright/test";

const shots = process.env.SCREENSHOT_DIR ?? "test-results/screenshots";
mkdirSync(shots, { recursive: true });

const pages = [
  ["/", "overview", "£24.5bn"],
  ["/receipts", "receipts", "£937.8bn"],
  ["/spending", "spending", "public sector spending on services"],
  ["/borrowing", "borrowing", "£97.8bn"],
  ["/debt", "debt", "94.0%"],
  ["/taxpayers", "taxpayers", "26.6%"],
  ["/forecasts", "forecasts", "The OBR forecast is not available yet"],
  ["/budgets", "budgets", "How did each Budget's plans turn out?"],
  ["/budgets/rules", "rules", "What fiscal rules has the government set itself?"],
  ["/old-money", "old-money", "Best for public spending"],
  ["/methodology", "methodology", "How are the numbers calculated?"],
  ["/data-sources", "data-sources", "Office for National Statistics"],
  ["/data-health", "data-health", "Data health"],
  ["/glossary", "glossary", "Public sector net borrowing"],
  ["/faq", "faq", "Where do the numbers come from?"],
] as const;

for (const [path, name, text] of pages) {
  test(`${name} renders published figures`, async ({ page }, testInfo) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(text).first()).toBeVisible();
    const ready = page.locator("[data-ready]");
    if ((await ready.count()) > 0) await expect(ready.first()).toBeVisible();
    const chart = page.locator(".recharts-surface");
    if ((await chart.count()) > 0) await expect(chart.first()).toBeVisible();
    const width = testInfo.project.name;
    await page.screenshot({ path: `${shots}/${name}-${width}-light.png`, fullPage: true });
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.screenshot({ path: `${shots}/${name}-${width}-dark.png`, fullPage: true });
  });
}

test("health endpoint reports fixture sources", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
  const ons = body.sources.find((source: { source: string }) => source.source === "ons-psf");
  expect(ons.origin).toBe("fixture");
  expect(ons.releaseDate).toBe("2026-10-20T23:00:00.000Z");
  expect(ons.validationError).toBeNull();
  expect(["ok", "stale"]).toContain(ons.status);
  const obr = body.sources.find((source: { source: string }) => source.source === "obr-databank");
  expect(obr.status).toBe("pending");
  expect(obr.origin).toBe("none");
});

test("robots allows snapshots and AI crawlers", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("CCBot");
  expect(body).toContain("Bytespider");
  expect(body).toContain("/api/snapshots/");
  expect(body).toContain("Disallow: /api/cron/");
});
