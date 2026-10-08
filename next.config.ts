import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // Keep the production compiler away from the live dev cache (also avoids
    // reparse-point issues when the workspace is hosted in OneDrive).
    distDir: phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER ? ".next-build-presentation" : ".next",
  };
}
