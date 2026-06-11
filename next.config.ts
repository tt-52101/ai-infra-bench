import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "21.0.22.192",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
