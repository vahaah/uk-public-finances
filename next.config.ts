import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { withWorkflow } from "workflow/next";
import {
  PLAUSIBLE_EVENT_PATH,
  PLAUSIBLE_SCRIPT_PATH,
  PLAUSIBLE_UPSTREAM_EVENT,
  PLAUSIBLE_UPSTREAM_SCRIPT,
} from "./lib/plausible";

/** Date of the commit being built, for sitemap lastmod on pages whose content only changes with code. */
function commitDate(): string {
  try {
    return execSync("git log -1 --format=%cI", { encoding: "utf8" }).trim();
  } catch {
    return new Date().toISOString();
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { BUILD_COMMIT_DATE: commitDate() },
  serverExternalPackages: ["exceljs"],
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  outputFileTracingIncludes: {
    "*": ["./fixtures/snapshots/**/*"],
  },
  // First-party Plausible proxy. No CSP is configured; these paths stay on
  // this origin so a future script-src / connect-src 'self' still works.
  async rewrites() {
    return [
      { source: PLAUSIBLE_SCRIPT_PATH, destination: PLAUSIBLE_UPSTREAM_SCRIPT },
      { source: PLAUSIBLE_EVENT_PATH, destination: PLAUSIBLE_UPSTREAM_EVENT },
    ];
  },
};

export default withWorkflow(nextConfig);
