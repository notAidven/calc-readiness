import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/web/src/city/era8To10*.test.ts"],
    maxWorkers: 1,
    testTimeout: 2_100_000,
    hookTimeout: 120_000,
  },
});
