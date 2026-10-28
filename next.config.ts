import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["exceljs"],
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  outputFileTracingIncludes: {
    "*": ["./fixtures/snapshots/**/*"],
  },
};

export default withWorkflow(nextConfig);
