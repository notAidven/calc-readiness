/**
 * Runs the browser suite's own file population under the jsdom harness, unedited, for the
 * measurement in `docs/2026-08-05-browser-suite-classification.md`.
 *
 * ONE-OFF MEASUREMENT TOOL. No npm script points here and CI never invokes it; it exists so
 * that the classification in that document rests on an observed pass/fail per test rather
 * than on a regex over the sources. `npm run test:browser` and `npm run test:unit` are
 * untouched by it.
 *
 *   npx vitest run --config scripts/jsdom-trial.vitest.config.mjs \
 *     --reporter=json --outputFile.json=/tmp/jsdom-trial.json
 *
 * IT IS A COPY OF TWO CONFIGS ON PURPOSE, and the copy is what makes the result mean
 * something. The two projects mirror `vitest.browser.config.ts`'s two file populations
 * exactly, and the harness mirrors `apps/web/vitest.config.ts` — react plugin, that
 * suite's own `setupFiles`, `css: false`, its 20s timeout — so a file that passes here is a
 * file that would pass if its name simply lost `.browser`, which is how `fec121a6` migrated
 * `widgetVariantPool` and is the only migration mechanism this document prices.
 *
 * TWO DIFFERENCES FROM THAT HARNESS, both of which make the trial STRICTER rather than
 * kinder, so a pass here is not an artefact of the trial:
 *
 *  1. `vitest/browser` is aliased to `scripts/jsdom-trial-browser-shim.mjs`, which refuses
 *     everything that has no jsdom equivalent. Read its header: screenshots and CDP throw.
 *  2. `document.fonts` is given a resolved `ready` and NOTHING ELSE, because
 *     `await document.fonts.ready` is a settle-before-measuring idiom copied into 71 files
 *     that a migrated test would simply delete. A test that asks the face set anything
 *     still fails.
 *
 * Nothing else is shimmed. In particular `DataTransfer`, `getScreenCTM` and the rest of
 * jsdom's real gaps are left absent, so files that need them fail here and are priced as
 * migrations rather than counted as free.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { browserGlobalDefine } from "../apps/web/vite.config";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browserShim = resolve(repoRoot, "scripts/jsdom-trial-browser-shim.mjs");
const trialSetup = resolve(repoRoot, "scripts/jsdom-trial-setup.mjs");

/**
 * BOTH specifiers, because the lane uses both and one file uses only the older one.
 * `answerRowChrome.browser.test.tsx` imports `@vitest/browser/context`; aliasing
 * `vitest/browser` alone left it erroring at import, i.e. silently outside the measurement.
 */
const browserAlias = {
  "vitest/browser": browserShim,
  "@vitest/browser/context": browserShim,
};

export default defineConfig({
  root: repoRoot,
  resolve: { alias: browserAlias },
  test: {
    projects: [
      {
        root: repoRoot,
        resolve: { alias: browserAlias },
        test: {
          name: "packages-jsdom",
          environment: "jsdom",
          setupFiles: [trialSetup],
          include: [
            "packages/shared-components/src/**/*.browser.test.ts",
            "packages/item-bank/src/**/*.browser.test.ts",
          ],
        },
      },
      {
        root: repoRoot,
        plugins: [react()],
        define: browserGlobalDefine,
        resolve: { alias: browserAlias, dedupe: ["react", "react-dom"] },
        test: {
          name: "web-jsdom",
          environment: "jsdom",
          globals: true,
          setupFiles: [resolve(repoRoot, "apps/web/src/test/setup.ts"), trialSetup],
          css: false,
          testTimeout: 20000,
          include: [
            "apps/web/src/**/*.browser.test.tsx",
            "packages/shared-components/src/**/*.browser.test.tsx",
          ],
        },
      },
    ],
  },
});
