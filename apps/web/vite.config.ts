import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * `amazon-cognito-identity-js` (pulled in by the auth session that the lazy
 * diagnostic "Survey" surface owns) references the Node-only global `global`,
 * which does not exist in the browser. Without this the diagnostic chunk throws
 * `ReferenceError: global is not defined` on evaluation and crashes the whole app
 * the moment Survey is opened. Mapping the bare identifier to the standard
 * `globalThis` is the canonical Vite fix.
 *
 * Exported so the Chromium test harness (root `vitest.browser.config.ts`) applies
 * the EXACT same shim — the diagnostic browser regression test then runs against a
 * faithful copy of the real app environment and can never silently drift from it.
 */
export const browserGlobalDefine = { global: "globalThis" };

/**
 * The global the dev server's per-run id arrives on. Read in exactly one place,
 * `src/devPersistence/devServerReset.ts`, which wipes the app's persisted browser
 * state when this value differs from the one the last load left behind.
 */
export const DEV_SERVER_RUN_ID_GLOBAL = "__CR_DEV_SERVER_RUN_ID__";

/**
 * Mint one id per dev server BOOT and `define` it into the bundle.
 *
 * This is the whole mechanism behind "a new dev server starts from a fresh city".
 * A Vite config is evaluated once per server process, so the value is fixed for the
 * life of that process: it is identical across every page load AND every HMR update
 * within one `vite` run, and different in the next one. That is precisely the
 * distinction wanted — restarting the server resets, refreshing the page does not.
 *
 * It is `null` for anything that is not a live dev server, which is the second of the
 * two guards on a destructive dev-only behaviour (the first being
 * `import.meta.env.DEV` at the read site). `vite build` runs with `command: "build"`,
 * and `vite preview` serves an already-built bundle, so neither can carry an id — a
 * production bundle contains the literal `null` and cannot wipe anything. Always
 * defining the name (rather than defining it only while serving) is deliberate: an
 * undefined `define` would leave a free identifier in the built bundle and turn the
 * read into a `ReferenceError`.
 *
 * `newRunId` is injectable so `src/devPersistence/devServerReset.test.ts` can assert
 * the serve/build split without spawning servers. It defaults to the GLOBAL Web Crypto
 * `randomUUID` rather than `node:crypto`'s, because this workspace's `tsconfig.json`
 * declares no Node types — reaching for the builtin would mean widening a shared
 * compiler config to mint a dev-only string. Node has exposed `globalThis.crypto`
 * since v19 and the repo requires v24+.
 */
export function devServerRunIdPlugin(
  newRunId: () => string = () => crypto.randomUUID(),
): Plugin {
  return {
    name: "cr-dev-server-run-id",
    config(_userConfig, { command, isPreview }) {
      const runId = command === "serve" && isPreview !== true ? newRunId() : null;
      return { define: { [DEV_SERVER_RUN_ID_GLOBAL]: JSON.stringify(runId) } };
    },
  };
}

export default defineConfig({
  plugins: [react(), devServerRunIdPlugin()],
  define: browserGlobalDefine,
  server: {
    port: 5173,
  },
});
