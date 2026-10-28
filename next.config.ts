import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { withWorkflow } from "workflow/next";

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
};

export default withWorkflow(nextConfig);
