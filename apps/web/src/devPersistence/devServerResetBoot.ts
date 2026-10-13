/**
 * The single call site of the dev-server state reset. Imported for its side effect,
 * FIRST, by `src/main.tsx`.
 *
 * WHY A SEPARATE MODULE AND NOT A LINE IN `main.tsx`. ES module imports are hoisted:
 * a statement written at the top of `main.tsx` still runs after `./App` and its entire
 * import subgraph has been evaluated, and parts of that subgraph read storage at
 * module-evaluation time (`audio/audioPrefs.ts` builds the app-wide preferences from
 * `localStorage` as it loads). Evaluation order is source order, so making this the
 * first import is what actually puts the wipe before the first read.
 *
 * It deliberately imports nothing but the reset itself, so being first costs nothing
 * and pulls no app state into existence ahead of the wipe.
 *
 * WHY THE `import.meta.env.DEV` CHECK IS REPEATED HERE. `isDevServerResetEnabled`
 * inside the reset already refuses to run in a build, and that is the check the unit
 * suite proves red when removed. This one is not redundant with it, it is a STRONGER
 * form of the same guarantee: written as a literal condition around the call site,
 * Vite's static replacement turns it into `if (false)` in a production bundle, the
 * block is dropped, and the reset module then has no importer left and is tree-shaken
 * out entirely. So a shipped bundle does not merely decline to wipe — it does not
 * contain the wipe. `output/dev-reset-prod-guard-check.mjs` is the evidence, and it
 * checks a dev bundle DOES contain it first so the absence cannot be vacuous.
 *
 * The `MODE !== "test"` half of the condition stays inside the reset rather than being
 * duplicated here: it is not what makes a production build safe, and keeping this
 * condition down to the single literal Vite replaces is what makes the elimination
 * something a reader can verify at a glance.
 */

import {
  currentDevServerRunId,
  resetPersistedStateForNewDevServerRun,
} from "./devServerReset";

if (import.meta.env.DEV) {
  resetPersistedStateForNewDevServerRun({
    runId: currentDevServerRunId(),
    env: import.meta.env,
  });
}
