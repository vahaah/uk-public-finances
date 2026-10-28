import { mkdirSync } from "node:fs";

import { expect, test } from "@playwright/test";

const shots = process.env.SCREENSHOT_DIR ?? "test-results/screenshots";
mkdirSync(shots, { recursive: true });

const pages = [
  ["/", "overview", "£24.5bn"],
  ["/receipts", "receipts", "£937.8bn"],
  ["/spending", "spending", "Health"],
  ["/borrowing", "borrowing", "£97.8bn"],
  ["/debt", "debt", "94.0%"],
  ["/taxpayers", "taxpayers", "26.6%"],
  ["/forecasts", "forecasts", "OBR public finances databank"],
  ["/methodology", "methodology", "How the numbers are made"],
  ["/data-sources", "data-sources", "Office for National Statistics"],
  ["/data-health", "data-health", "Data health"],
  ["/glossary", "glossary", "Public sector net borrowing"],
  ["/faq", "faq", "Where do the numbers come from?"],
] as const;

for (const [path, name, text] of pages) {
  test(`${name} renders published figures`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(text).first()).toBeVisible();
    const chart = page.locator(".recharts-surface");
    if ((await chart.count()) > 0) await expect(chart.first()).toBeVisible();
    await page.screenshot({ path: `${shots}/${name}-light.png`, fullPage: true });
    await page.getByRole("button", { name: "Dark" }).click();
    await page.screenshot({ path: `${shots}/${name}-dark.png`, fullPage: true });
  });
}

test("health endpoint reports fixture sources", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.sources.find((source: { source: string }) => source.source === "ons-psf").status).toBe("ok");
  expect(body.sources.find((source: { source: string }) => source.source === "obr-databank").status).toBe("missing");
});
