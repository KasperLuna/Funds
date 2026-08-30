import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    passWithNoTests: true,
    globals: true, // enables RTL auto-cleanup + jest-dom matchers
    fileParallelism: false, // cavetail: suites share one test PG; serialize to avoid cleanup races
    setupFiles: ["./src/test/setup.ts"],
    typecheck: {
      enabled: false, // cavetail: skip typecheck in vitest since these deps come via @funds/db
    },
  },
  resolve: {
    alias: {
      "@funds/core": path.resolve(__dirname, "../../packages/core/src"),
      "@funds/db": path.resolve(__dirname, "../../packages/db/src"),
      "@": path.resolve(__dirname, "./src"),
      "drizzle-orm": path.resolve(__dirname, "../../node_modules/.pnpm/drizzle-orm@0.44.7_@types+pg@8.23.1_kysely@0.29.5_pg@8.23.0/node_modules/drizzle-orm"),
      "pg": path.resolve(__dirname, "../../node_modules/.pnpm/pg@8.23.0/node_modules/pg"),
    },
  },
});