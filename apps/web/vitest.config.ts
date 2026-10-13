import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Web-lane test harness (scoped to apps/web): a jsdom + Testing Library environment
// for the React city surface. The root vitest config covers the pure packages/engines
// and pulls THIS FILE IN AS A PROJECT, so `npm run test:unit` (and so CI and
// `npm run check`) runs the suite through the very same harness as
// `npm test -w @cr/web`. Keep it self-contained: it has to work from either root.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [
      // `*.browser.test.*` run in real Chromium (root vitest.browser.config.ts),
      // not this jsdom harness — jsdom defines `global`, so it cannot reproduce the
      // browser-only crashes those tests guard against.
      "src/**/*.browser.test.{ts,tsx}",
      // `*.reachability.test.ts` are deliberately node-only and already run as the
      // root config's `web-reachability` project; collecting them here too would
      // double-run them once this file is a project of that same root config.
      "src/**/*.reachability.test.ts",
      // These exporter suites launch real Chromium. CI runs them once, serialized, after the
      // browser cache is restored; the parallel jsdom unit pool has no browser installation.
      "src/city/era7ExporterSafety.test.ts",
      "src/city/era8To10ExporterContract.test.ts",
      "src/city/era8To10ExporterSafety.test.ts",
    ],
    css: false,
    // The web suite is heavy (jsdom + three/R3F + KaTeX + markdown); the default
    // 5s per-test limit flakes under full-suite parallel load, so give it room.
    testTimeout: 20000,
  },
});
