import { runtimeStorage } from "../storage/runtimeStorage";

/**
 * DEV-ONLY: a fresh dev server run starts from a fresh city.
 *
 * WHY THIS EXISTS. Everything the app persists survives a browser profile, not a
 * process — a saved city, a saved wallet, dismissed coach marks, the first-run demo
 * reel's "seen" flag, best-streak high-water marks. That is exactly right for a
 * learner and exactly wrong for whoever is authoring era-one content, because there
 * is then no way to see a FIRST RUN again short of clearing site data by hand. This
 * makes "start a dev server" mean "start over".
 *
 * PER SERVER RUN, NOT PER PAGE LOAD. Those are different, and the difference is the
 * whole design. Wiping on every load would cost a developer their state every time
 * they hit refresh to look at something, which is worse than the problem being
 * solved. So the trigger is a value that changes once per `vite` process and not at
 * all in between: `vite.config.ts`'s {@link devServerRunIdPlugin} mints a UUID when
 * the server boots and `define`s it into the served bundle, and this module compares
 * it against the copy it left in `localStorage`. Different means a new server,
 * therefore wipe; equal means a reload, therefore keep. HMR does not change it
 * either, so editing a file mid-session keeps the city too.
 *
 * WHY NOT AN ENDPOINT. The obvious alternative is a dev-only route the client fetches
 * for the current run id. It buys nothing here and costs a network round trip on
 * every boot plus a failure mode (a fetch that errors) that has to decide between
 * wiping and not wiping. A `define` is resolved before the first byte is served, is
 * synchronous, and is statically `null` in anything that is not a dev server.
 *
 * DEV ONLY, TWO INDEPENDENT LAYERS — because the blast radius is a learner's whole
 * progress:
 *
 *  1. {@link isDevServerResetEnabled} reads `import.meta.env`, which Vite replaces
 *     STATICALLY: `DEV` is the literal `false` in a production bundle, so the wipe is
 *     dead code a learner's build cannot reach however it is called. It also excludes
 *     `MODE === "test"`, because Vitest reports `DEV` too — the same reasoning, and
 *     the same shape, as `audio/audioPrefs.ts`'s `resolveDevMusicMute`.
 *  2. There is no run id to compare unless a dev server injected one. `vite build`
 *     and `vite preview` both bake the literal `null`, and the test harness never
 *     applies the plugin at all, so a build whose env guard had somehow been defeated
 *     still has nothing to trigger on.
 *
 * SCOPE OF THE WIPE. Every key under {@link APP_STORAGE_PREFIX} — the whole namespace
 * this app writes, swept by prefix rather than from a hand-maintained list, so a
 * persistence surface added later is covered without anyone having to remember to
 * register it. Storage that is NOT this app's is left alone, deliberately: the
 * Cognito/Amplify tokens on the same origin are somebody's sign-in, not era-one
 * progress, and signing a developer out is a different kind of destruction than the
 * one being asked for.
 *
 * IT IS LOUD. A silent wipe is indistinguishable from a bug when you are debugging
 * something else, so a reset names its count, both run ids, and every key it removed.
 */

/**
 * The namespace every key this app persists lives under. The wipe is a prefix sweep
 * over it; `devServerReset.test.ts` holds every known surface to it, so a new key
 * that forgets the prefix fails there rather than being silently left behind.
 */
export const APP_STORAGE_PREFIX = "cr.";

/**
 * Where the last dev server run id is remembered. Inside the swept namespace on
 * purpose — the sweep removes it and the new id is written straight after, so there
 * is no ordering in which a half-done wipe leaves a marker claiming it finished.
 */
export const DEV_SERVER_RUN_ID_KEY = "cr.devServerRunId";

/** Prefix on every line this module logs, so the wipe is greppable in a console. */
export const DEV_RESET_LOG_TAG = "[cr:dev-reset]";

/** The slice of `import.meta.env` {@link isDevServerResetEnabled} reads. */
export interface BuildEnv {
  /** Vite's dev flag: `true` under `vite dev`, compiled to `false` by `vite build`. */
  readonly DEV: boolean;
  /** `"development"`, `"production"`, or `"test"` under Vitest. */
  readonly MODE: string;
}

/**
 * The `localStorage` surface a sweep needs: enumerable, not just addressable
 * (injectable, so tests can prove "touched nothing" instead of inferring it).
 */
export interface ResettableStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type DevResetOutcome =
  /** The env guard said no: a production build, or the test runner. */
  | { readonly kind: "disabled" }
  /** No usable `localStorage` (private mode, a hardened profile). */
  | { readonly kind: "no-storage" }
  /** Nothing injected a run id, so this is not a dev server. */
  | { readonly kind: "no-run-id" }
  /** Same server run as last time: a page reload, and state was kept. */
  | { readonly kind: "same-run"; readonly runId: string }
  /** A new server run: state was wiped. */
  | {
      readonly kind: "reset";
      readonly runId: string;
      readonly previousRunId: string | null;
      readonly clearedKeys: readonly string[];
    };

/**
 * Whether the reset may run in the process reading this.
 *
 * `import.meta.env.DEV` is the signal because Vite replaces it STATICALLY — a
 * production bundle contains the literal `false` — and `MODE` excludes Vitest, which
 * also reports `DEV`. The suite has to be able to seed and assert on real storage
 * keys without an ambient wipe underneath it.
 */
export function isDevServerResetEnabled(env: BuildEnv): boolean {
  return env.DEV && env.MODE !== "test";
}

/**
 * The run id the dev server injected, or null when nothing did.
 *
 * `typeof` rather than a bare read because the identifier is genuinely absent under
 * the test harness (which does not apply the plugin), where a bare read would be a
 * `ReferenceError` rather than a fallback. A `vite build` bundle carries the literal
 * `null`, which lands on the same branch.
 */
export function currentDevServerRunId(): string | null {
  return typeof __CR_DEV_SERVER_RUN_ID__ === "string" && __CR_DEV_SERVER_RUN_ID__ !== ""
    ? __CR_DEV_SERVER_RUN_ID__
    : null;
}

declare const __CR_DEV_SERVER_RUN_ID__: string | null;

/** `localStorage` when the browser exposes a usable one, else null. */
function defaultResettableStorage(): ResettableStorage | null {
  return runtimeStorage();
}

/** Every key currently in `storage` that belongs to this app. */
function appKeys(storage: ResettableStorage): string[] {
  const found: string[] = [];
  // Snapshot the names BEFORE removing any: `key(i)` is index-based, and deleting
  // while iterating would shift the entries that have not been visited yet.
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      found.push(key);
    }
  }
  return found;
}

export interface DevServerResetOptions {
  /** The dev server's run id; defaults to {@link currentDevServerRunId}. */
  runId?: string | null;
  /** Defaults to `import.meta.env`'s dev flags. */
  env: BuildEnv;
  /** Defaults to `localStorage` when the browser exposes a usable one. */
  storage?: ResettableStorage | null;
  /** Defaults to `console.info`. */
  log?: (...args: unknown[]) => void;
}

/**
 * Wipe this app's persisted state iff the dev server has restarted since it was
 * written. Safe to call unconditionally and exactly once, at boot, before anything
 * reads storage.
 */
export function resetPersistedStateForNewDevServerRun(
  options: DevServerResetOptions,
): DevResetOutcome {
  if (!isDevServerResetEnabled(options.env)) {
    return { kind: "disabled" };
  }
  const runId = options.runId === undefined ? currentDevServerRunId() : options.runId;
  if (runId === null || runId === "") {
    return { kind: "no-run-id" };
  }
  const storage =
    options.storage === undefined ? defaultResettableStorage() : options.storage;
  if (storage === null) {
    return { kind: "no-storage" };
  }
  const log = options.log ?? ((...args: unknown[]) => console.info(...args));

  let previousRunId: string | null;
  let cleared: string[];
  try {
    previousRunId = storage.getItem(DEV_SERVER_RUN_ID_KEY);
    if (previousRunId === runId) {
      log(
        `${DEV_RESET_LOG_TAG} Same dev server run (${runId}); persisted state kept across this load.`,
      );
      return { kind: "same-run", runId };
    }
    cleared = appKeys(storage);
    for (const key of cleared) {
      storage.removeItem(key);
    }
    storage.setItem(DEV_SERVER_RUN_ID_KEY, runId);
  } catch {
    // A storage we cannot enumerate or write is a storage we cannot reason about;
    // dev convenience is never worth taking the app down for.
    return { kind: "no-storage" };
  }

  log(
    `${DEV_RESET_LOG_TAG} New dev server run detected: wiped ${cleared.length} persisted key(s) so this is a first-run city.`,
    `\n${DEV_RESET_LOG_TAG} previous run: ${previousRunId ?? "(none)"} -> this run: ${runId}`,
    `\n${DEV_RESET_LOG_TAG} keys removed: ${cleared.join(", ") || "(none)"}`,
    `\n${DEV_RESET_LOG_TAG} This is DEV ONLY and expected. A plain page reload does NOT wipe; only restarting the dev server does.`,
  );
  return { kind: "reset", runId, previousRunId, clearedKeys: cleared };
}
