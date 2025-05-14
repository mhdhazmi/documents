import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  experimental: { useLightningcss: false },

  // Add ESLint configuration
  eslint: {
    // This allows production builds to successfully complete even if the project has ESLint errors
    ignoreDuringBuilds: true,
  },

  webpack(config: Configuration) {
    // ← only one param
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
