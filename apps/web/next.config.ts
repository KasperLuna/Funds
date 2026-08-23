import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@funds/core", "@funds/db"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    // Force @powersync/web to its standard browser entry. The package's
    // `react-native`/`react-native-web` exports conditions resolve to a
    // React-Native build that requires custom worker URLs and never auto-loads
    // the sync worker, silently breaking sync-down. Prefer `default`.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@powersync/web": require.resolve("@powersync/web"),
    };
    return config;
  },
};

export default withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
