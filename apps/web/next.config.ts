import type { NextConfig } from "next";

// cavetail: monorepo TS-source exports (@funds/core, @funds/db) need transpile + .js->.ts extension aliasing in webpack
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@funds/core", "@funds/db"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;