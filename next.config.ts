/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    useLightningcss: false,  // ← turn off the Rust-based pipeline
  },
};

module.exports = nextConfig;
