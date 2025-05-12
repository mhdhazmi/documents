// next.config.ts
import type { WebpackConfigContext } from "next/dist/server/config-shared";

/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: { useLightningcss: false },
  webpack: (
    config: WebpackConfigContext["config"],
    { isServer }: { isServer: boolean }
  ) => {
    if (!isServer) {
      config.resolve.alias.canvas = false; // ← make 'require("canvas")' a no-op
    }
    return config;
  },
};

module.exports = nextConfig;
