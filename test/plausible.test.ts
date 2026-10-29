import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  PLAUSIBLE_DOMAIN,
  PLAUSIBLE_EVENT_PATH,
  PLAUSIBLE_QUEUE_STUB,
  PLAUSIBLE_SCRIPT_PATH,
  PLAUSIBLE_UPSTREAM_EVENT,
  PLAUSIBLE_UPSTREAM_SCRIPT,
  isPlausibleEnabled,
} from "@/lib/plausible";

describe("Plausible", () => {
  it("loads only when VERCEL_ENV is production", () => {
    expect(isPlausibleEnabled("production")).toBe(true);
    expect(isPlausibleEnabled("preview")).toBe(false);
    expect(isPlausibleEnabled("development")).toBe(false);
    expect(isPlausibleEnabled(undefined)).toBe(false);
  });

  it("uses the budget domain and the first-party proxy paths", () => {
    expect(PLAUSIBLE_DOMAIN).toBe("budget.vahaah.com");
    expect(PLAUSIBLE_SCRIPT_PATH).toBe("/js/script.js");
    expect(PLAUSIBLE_EVENT_PATH).toBe("/api/event");
    expect(PLAUSIBLE_UPSTREAM_SCRIPT).toBe(
      "https://plausible.io/js/script.outbound-links.file-downloads.js",
    );
    expect(PLAUSIBLE_UPSTREAM_EVENT).toBe("https://plausible.io/api/event");
  });

  it("queues events until the real script loads", () => {
    const sandbox: { window: { plausible?: ((...a: unknown[]) => void) & { q?: unknown[] } } } = {
      window: {},
    };
    runInNewContext(PLAUSIBLE_QUEUE_STUB, sandbox);
    sandbox.window.plausible?.("pageview");
    expect(sandbox.window.plausible?.q).toHaveLength(1);
  });

  it("wires the layout, rewrites and cookie-stripping proxy", () => {
    const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toContain("isPlausibleEnabled()");
    expect(layout).toContain("data-domain={PLAUSIBLE_DOMAIN}");
    expect(layout).toContain("data-api={PLAUSIBLE_EVENT_PATH}");
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("destination: PLAUSIBLE_UPSTREAM_SCRIPT");
    expect(config).toContain("destination: PLAUSIBLE_UPSTREAM_EVENT");
    const proxy = readFileSync(resolve(process.cwd(), "proxy.ts"), "utf8");
    expect(proxy).toContain('headers.set("cookie", "")');
  });
});
