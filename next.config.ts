import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // Keep production output separate from the live dev cache. The previous
    // OneDrive-synced output contained invalid reparse-point metadata.
    distDir: process.env.SOLARSMART_NEXT_DIST_DIR?.trim() || (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER ? ".next-build-solarfix" : ".next"),
    async headers() {
      return [{
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      }];
    },
  };
}
