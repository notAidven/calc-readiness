import { availableParallelism } from "node:os";
import { defineConfig } from "vitest/config";

/**
 * How many test files run at once. Vitest's own default is
 * `Math.max(availableParallelism() - 1, 1)`, which reserves a core for the main
 * process. That is sensible on a developer machine and degenerate on GitHub's
 * standard runner, which has exactly 2 cores: `2 - 1 = 1`, so CI ran the whole
 * suite one file at a time on a two-core box and left the second core idle.
 *
 * Measured on the runner itself, not just locally. Do not quote a single
 * before/after pair for this: GitHub hands out visibly different hardware per
 * run, and the same tree with the same config measured 198s to 338s of accounted
 * work across runs, so tree-matched pairs came out at 207.4s -> 164.4s, 207.1s
 * -> 183.0s and 207.1s -> 107.6s. What IS stable across all of them, and is the
 * real evidence two workers are live, is the parallelism ratio: vitest's
 * accounted work (transform + setup + import + tests + environment) is 0.92x of
 * wall clock on every serial run measured and 1.84x-1.85x on all three runs with
 * this change, almost exactly double. Test counts are identical either way.
 *
 * Note the gain is smaller than a two-core reproduction predicts: pinning a VM
 * to two REAL cores gave 1.52x, the runner gives 1.26x, because the runner's two
 * vCPUs are hyperthreads sharing execution units. Per-test time inflates 1.80x
 * there under two workers against 1.25x on two real cores. Peak RSS across the
 * whole process tree went 865MB to 1126MB, against the several GB a runner
 * leaves idle.
 *
 * Read it as "vitest's own default, but never below 2, and never above the core
 * count". The floor is what fixes CI; the ceiling is what keeps the floor from
 * oversubscribing a single-core host, where `max(2, 0)` would otherwise ask for
 * two workers on one core. On three or more cores the expression is exactly
 * vitest's default, so only the degenerate two-core case changes behaviour.
 */
const cores = availableParallelism();
const maxWorkers = Math.min(cores, Math.max(2, cores - 1));

/**
 * The node unit run (`npm run test:unit`, and so CI). Four projects:
 *
 *  - `packages`: the pure packages/engines/services suites, collected exactly as before.
 *  - `web-reachability`: the web lane's CROSS-DOMAIN REACHABILITY tests, kept node-only so
 *    they prove a lesson domain is wired into the app without any DOM standing in for it.
 *    They are the guard that no CI-run suite had when D2 shipped unreachable.
 *  - `repo-hygiene`: whole-REPOSITORY invariants, which belong to no workspace because
 *    their subject is the tracked file list itself. Node-only and its own project because
 *    the globs above are all scoped to a package's `src/`, so a root `test/` directory had
 *    nowhere to be collected from.
 *  - `apps/web/vitest.config.ts`: the web lane's jsdom suite, referenced by path so the
 *    harness (react plugin, setup file, timeout, browser-test exclusion) stays defined in
 *    exactly one place and CI cannot drift from `npm test -w @cr/web`. Until now these
 *    tests ran only from that workspace script, which neither CI nor `npm run check`
 *    invokes, so ~313 tests across 30 files were passing unobserved.
 */
export default defineConfig({
  test: {
    maxWorkers,
    projects: [
      {
        test: {
          name: "packages",
          exclude: ["**/*.browser.test.ts"],
          include: [
            "packages/**/src/**/*.test.ts",
            "engines/**/src/**/*.test.ts",
            "services/**/src/**/*.test.ts",
          ],
        },
      },
      {
        test: {
          name: "web-reachability",
          environment: "node",
          include: ["apps/web/src/**/*.reachability.test.ts"],
        },
      },
      {
        test: {
          name: "repo-hygiene",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      "./apps/web/vitest.config.ts",
    ],
  },
});
