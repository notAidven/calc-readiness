import { defineConfig } from "vitest/config";

/**
 * Era 7's exporter safety suite launches real Chromium repeatedly. It runs after the browser
 * cache is restored in CI, serialized in one worker so its rollback and temp-root assertions own
 * every exporter process they observe.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/web/src/city/era7ExporterSafety.test.ts"],
    maxWorkers: 1,
    testTimeout: 90_000,
  },
});
