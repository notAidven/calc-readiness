import { availableParallelism } from "node:os";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { browserGlobalDefine } from "./apps/web/vite.config";

/**
 * How many test files run at once in the browser. The same defect `vitest.config.ts`
 * documents for the node run, with the same fix: floor of 2, capped at the core
 * count, so only GitHub's degenerate 2-core runner changes behaviour. Read that
 * comment for the evidence that the runner has exactly 2 cores.
 *
 * TWO DIFFERENCES from the node run, both deliberate. Do not "unify" this with
 * `vitest.config.ts` by copying its expression over; it is wrong here, and its
 * placement is inert here.
 *
 * 1. THE INNER `min(12, ...)` IS VITEST'S, AND MUST STAY. The browser pool's
 *    default is `max(min(12, cores - 1), 1)` (`createBrowserPool`), not the node
 *    pool's `max(cores - 1, 1)`: it ceilings at 12 on purpose, because past ~12
 *    the main thread chokes (vitest-dev/vitest#7871). Copying the node
 *    expression `min(cores, max(2, cores - 1))` verbatim would read as harmless
 *    and would quietly raise a 16-core machine from 12 workers to 15, removing a
 *    ceiling that is not ours to remove. Keeping vitest's own expression inside
 *    the floor means this is EXACTLY the browser default for cores >= 3, which is
 *    the property that makes the change safe to reason about.
 *
 * 2. IT MUST BE SET PER PROJECT. The two pools disagree about where they look,
 *    which is why the obvious placements are silent no-ops:
 *      - node, `resolveMaxWorkers`: `project.config.maxWorkers`, THEN falls back
 *        to `project.vitest.config.maxWorkers` -- so a root-level `test.maxWorkers`
 *        and `--maxWorkers` both reach it. That is why `vitest.config.ts` sets it
 *        once at the root.
 *      - browser, `getThreadsCount`: `project.config.maxWorkers` and NO root
 *        fallback, so it silently keeps its own `threadsCount` of 1.
 *    Resolved and printed via `createVitest`, not inferred: with `--maxWorkers=2`
 *    and with a root-level `maxWorkers: 2`, `vitest.config.maxWorkers` is 2 while
 *    BOTH projects still report `project.config.maxWorkers === undefined`. Only
 *    the per-project entries below make it 2. A root-level line here would look
 *    correct in review and do nothing.
 *
 * MEMORY WAS THE OPEN QUESTION, because a browser worker is a whole Chromium
 * instance and not a thread, and #208 measured this fix but held it back rather than
 * extrapolate a 47GB dev box to a 7GB runner. It was then measured ON the runner,
 * with a temporary sampler reverted in the same pull request: peak system memory
 * 3588MB of the runner's 7938MB, 45%, leaving 4351MB headroom, with 15 Chromium
 * processes, 0 of 3071MB swap touched and no OOM kill. It fits, with room.
 *
 * Two workers were confirmed live on the runner the same way #208 proved its own
 * fix, by the parallelism ratio rather than by wall clock: vitest's accounted work
 * over wall clock went 0.954x -> 1.883x against a tree-matched serial baseline, an
 * almost exact doubling, and 705 tests over 52 files passed either way. Do not size
 * this from wall clock; #208 measured a 2.6x hardware lottery between runs on this
 * fleet.
 */
const cores = availableParallelism();
const maxWorkers = Math.min(cores, Math.max(2, Math.min(12, cores - 1)));

// Two Chromium projects so the React web-lane browser tests get the plugin +
// `global` shim they need WITHOUT changing the environment of the pure package
// checker tests (which must keep running exactly as before).
export default defineConfig({
  test: {
    /**
     * A COLD VITE OPTIMIZER EATS THE WHOLE CONNECT WINDOW, so a freshly created
     * worktree cannot start browser tests at all: the sessions die with
     * `Failed to connect to the browser session "..." within the timeout` and
     * zero tests run. Measured on this 12-core box over the 38 `city/three`
     * files with `node_modules/.vite` deleted: 25s scanning dependencies, then
     * 60s bundling them, all of it inside the connect window, against a default
     * of 60_000 (`cli-api`: `connectTimeout ?? 6e4`). The whole browser run is
     * four times those files plus a second project, so 300_000 is ~3.5x the
     * measured 85s and the headroom is the point. Oversizing is close to free:
     * the timer is `.unref()`ed and cleared the moment the session reports
     * ready, so a healthy run never waits on it. The only cost is that a
     * genuinely dead browser takes longer to say so.
     *
     * IT MUST BE SET AT THE ROOT, NOT PER PROJECT -- the exact opposite of
     * `maxWorkers` below, so do not "tidy" it into the project entries. The
     * timer reads `project.vitest.config.browser.connectTimeout`, which is the
     * ROOT resolved config, with no per-project fallback. Resolved and printed
     * via `createVitest`, not inferred: with the value in both project `browser`
     * blocks, `project.config.browser.connectTimeout` is set while
     * `project.vitest.config.browser.connectTimeout` is still undefined. Run
     * behaviour agrees -- a per-project `connectTimeout: 1` passes in 12.6s,
     * while the same 1 placed here fails at once with the connect error.
     */
    browser: {
      connectTimeout: 300_000,
    },
    projects: [
      {
        test: {
          name: "packages",
          maxWorkers,
          include: [
            "packages/shared-components/src/**/*.browser.test.ts",
            "packages/item-bank/src/**/*.browser.test.ts",
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        plugins: [react()],
        // Mirror the real app's browser environment (see apps/web/vite.config.ts):
        // amazon-cognito-identity-js references the Node-only `global`.
        define: browserGlobalDefine,
        /*
         * ONE REACT, so a `<Canvas>` can mount here at all.
         *
         * `@react-three/fiber` pre-bundles with its own copy of React, and a component from
         * the pre-bundled copy rendered by the test's `react-dom/client` reads a null
         * dispatcher: `TypeError: Cannot read properties of null (reading 'useMemo')` out of
         * `CanvasImpl`, before a single assertion runs. The real app never hits it because
         * Vite resolves one React for the whole graph there, and `dedupe` is how that is
         * asked for explicitly. Scoped to this project and to the two packages that must be
         * singletons, so no dependency's bundling changes — only which copy it binds to.
         */
        resolve: { dedupe: ["react", "react-dom"] },
        test: {
          name: "web",
          maxWorkers,
          // The `.tsx` globs let React components (the app diagnostic surface and
          // the shared graph widget) render in browser tests with the JSX runtime.
          include: [
            "apps/web/src/**/*.browser.test.tsx",
            "packages/shared-components/src/**/*.browser.test.tsx",
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
