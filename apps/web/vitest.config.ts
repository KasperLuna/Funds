import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    passWithNoTests: true,
    typecheck: {
      enabled: false, // cavetail: skip typecheck in vitest since these deps come via @funds/db
    },
  },
  resolve: {
    alias: {
      "drizzle-orm": path.resolve(__dirname, "../../node_modules/.pnpm/drizzle-orm@0.44.7_@types+pg@8.23.1_kysely@0.29.5_pg@8.23.0/node_modules/drizzle-orm"),
      "pg": path.resolve(__dirname, "../../node_modules/.pnpm/pg@8.23.0/node_modules/pg"),
    },
  },
});