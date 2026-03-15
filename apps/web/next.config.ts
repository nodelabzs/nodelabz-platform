import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@nodelabz/db",
    "@nodelabz/shared-types",
    "@nodelabz/ui",
    "@nodelabz/utils",
  ],
};

export default nextConfig;
