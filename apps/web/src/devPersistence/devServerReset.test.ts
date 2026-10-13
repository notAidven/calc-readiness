import { afterEach, describe, expect, it, vi } from "vitest";

import { DEV_SERVER_RUN_ID_GLOBAL, devServerRunIdPlugin } from "../../vite.config";
import { MUSIC_KEY, MUTE_KEY, VOLUME_KEY } from "../audio/audioPrefs";
import { DEV_STUDENT_KEY } from "../auth/SessionContext";
import { COACH_SKIP_ALL_KEY, coachMarkKey } from "../city/coachmarks/coachMarksCore";
import { ONBOARDING_DEMO_SEEN_KEY } from "../city/onboarding/useDemoScript";
import { eraBestStreakKey, nodeBestStreakKey } from "../lessons/InfiniteDrill";
import {
  APP_STORAGE_PREFIX,
  DEV_RESET_LOG_TAG,
  DEV_SERVER_RUN_ID_KEY,
  isDevServerResetEnabled,
  type ResettableStorage,
  resetPersistedStateForNewDevServerRun,
} from "./devServerReset";
import { createDevSessionStore } from "./devSession";
import { createEconomyDevStore } from "./economyPersistence";

/** A build env as the local dev server reports it. */
const DEV_ENV = { DEV: true, MODE: "development" } as const;
/** A build env as a `vite build` bundle reports it. */
const PROD_ENV = { DEV: false, MODE: "production" } as const;
/** A build env as Vitest reports it — `DEV` is true here too, which is the trap. */
const TEST_ENV = { DEV: true, MODE: "test" } as const;

/**
 * An enumerable `localStorage` stand-in that records every mutating call, so
 * "touched nothing" is a checkable claim rather than an inferred one.
 */
function fakeStorage(seed: Record<string, string> = {}) {
  const entries = new Map<string, string>(Object.entries(seed));
  const writes: string[] = [];
  const storage: ResettableStorage = {
    get length() {
      return entries.size;
    },
    key(index) {
      return [...entries.keys()][index] ?? null;
    },
    getItem(key) {
      return entries.get(key) ?? null;
    },
    setItem(key, value) {
      writes.push(`setItem:${key}`);
      entries.set(key, value);
    },
    removeItem(key) {
      writes.push(`removeItem:${key}`);
      entries.delete(key);
    },
  };
  return { storage, entries, writes };
}

/**
 * A browser profile dirtied the way a working day dirties it: a saved city, a
 * saved wallet, a dev identity, the first-run reel marked seen, a dismissed coach
 * mark, a per-node and a per-era streak, and the three audio preferences.
 * Plus a Cognito token, which this feature must NOT touch.
 */
const COGNITO_KEY = "CognitoIdentityServiceProvider.abc123.someone.idToken";

function dirtyProfile(): Record<string, string> {
  return {
    [DEV_STUDENT_KEY]: "dev-student-1",
    "cr.devSession.v3.dev-student-1": '{"version":3,"city":{}}',
    "cr.devEconomy.v1.dev-student-1": '{"version":1,"economy":{}}',
    [ONBOARDING_DEMO_SEEN_KEY]: "true",
    [COACH_SKIP_ALL_KEY]: "true",
    [coachMarkKey("place")]: "true",
    [nodeBestStreakKey("NUM.F")]: "17",
    [eraBestStreakKey("prehistoric")]: "42",
    [MUTE_KEY]: "true",
    [VOLUME_KEY]: "0.4",
    [MUSIC_KEY]: "false",
    [COGNITO_KEY]: "eyJraWQ...",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isDevServerResetEnabled", () => {
  it("is on under the local dev server", () => {
    expect(isDevServerResetEnabled(DEV_ENV)).toBe(true);
  });

  it("is OFF in a production build", () => {
    expect(isDevServerResetEnabled(PROD_ENV)).toBe(false);
  });

  it("is OFF under the test runner, which also reports DEV", () => {
    expect(isDevServerResetEnabled(TEST_ENV)).toBe(false);
  });
});

describe("resetPersistedStateForNewDevServerRun — per server run, not per load", () => {
  it("wipes when the run id differs from the stored one (a restarted dev server)", () => {
    const { storage, entries } = fakeStorage({
      ...dirtyProfile(),
      [DEV_SERVER_RUN_ID_KEY]: "run-one",
    });

    const outcome = resetPersistedStateForNewDevServerRun({
      runId: "run-two",
      env: DEV_ENV,
      storage,
      log: () => {},
    });

    expect(outcome.kind).toBe("reset");
    // A floor: the wipe has to have had something to wipe, or "no cr. keys
    // remain" would hold trivially over an empty profile.
    expect(outcome.kind === "reset" && outcome.clearedKeys.length).toBeGreaterThan(10);
    expect([...entries.keys()].filter((k) => k.startsWith(APP_STORAGE_PREFIX))).toEqual([
      DEV_SERVER_RUN_ID_KEY,
    ]);
    expect(entries.get(DEV_SERVER_RUN_ID_KEY)).toBe("run-two");
  });

  it("keeps everything when the run id matches (a plain page reload)", () => {
    const before = { ...dirtyProfile(), [DEV_SERVER_RUN_ID_KEY]: "run-one" };
    const { storage, entries, writes } = fakeStorage(before);

    const outcome = resetPersistedStateForNewDevServerRun({
      runId: "run-one",
      env: DEV_ENV,
      storage,
      log: () => {},
    });

    expect(outcome.kind).toBe("same-run");
    expect(Object.fromEntries(entries)).toEqual(before);
    expect(writes).toEqual([]);
  });

  it("wipes on the first run it has ever seen (no stored run id)", () => {
    const { storage, entries } = fakeStorage(dirtyProfile());

    const outcome = resetPersistedStateForNewDevServerRun({
      runId: "run-one",
      env: DEV_ENV,
      storage,
      log: () => {},
    });

    expect(outcome.kind).toBe("reset");
    expect(outcome.kind === "reset" && outcome.previousRunId).toBeNull();
    expect(entries.get(DEV_SERVER_RUN_ID_KEY)).toBe("run-one");
  });

  it("leaves storage that is not this app's alone (a Cognito token survives)", () => {
    const { storage, entries } = fakeStorage(dirtyProfile());

    resetPersistedStateForNewDevServerRun({
      runId: "run-one",
      env: DEV_ENV,
      storage,
      log: () => {},
    });

    expect(entries.get(COGNITO_KEY)).toBe("eyJraWQ...");
  });

  it("survives a storage that throws on every call", () => {
    const hostile: ResettableStorage = {
      get length(): number {
        throw new Error("blocked");
      },
      key() {
        throw new Error("blocked");
      },
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(() =>
      resetPersistedStateForNewDevServerRun({
        runId: "run-one",
        env: DEV_ENV,
        storage: hostile,
        log: () => {},
      }),
    ).not.toThrow();
  });
});

describe("the production guard", () => {
  /**
   * THE GUARD TEST. Remove the `isDevServerResetEnabled` check from
   * `resetPersistedStateForNewDevServerRun` and this fails: the outcome stops
   * being `disabled` and the profile is emptied. The count assertions are the
   * floor — without them "no key was removed" would also pass over an empty
   * profile, which is the one case this must not be allowed to prove.
   */
  it("touches NOTHING in a production build", () => {
    const before = { ...dirtyProfile(), [DEV_SERVER_RUN_ID_KEY]: "run-one" };
    const { storage, entries, writes } = fakeStorage(before);
    const appKeysBefore = Object.keys(before).filter((k) =>
      k.startsWith(APP_STORAGE_PREFIX),
    ).length;
    expect(appKeysBefore).toBeGreaterThan(10);

    const outcome = resetPersistedStateForNewDevServerRun({
      runId: "run-two",
      env: PROD_ENV,
      storage,
      log: () => {
        throw new Error("a production build must not log a reset");
      },
    });

    expect(outcome).toEqual({ kind: "disabled" });
    expect(writes).toEqual([]);
    expect(Object.fromEntries(entries)).toEqual(before);
    expect(
      [...entries.keys()].filter((k) => k.startsWith(APP_STORAGE_PREFIX)),
    ).toHaveLength(appKeysBefore);
  });

  it("touches NOTHING under the test runner", () => {
    const before = { ...dirtyProfile(), [DEV_SERVER_RUN_ID_KEY]: "run-one" };
    const { storage, entries, writes } = fakeStorage(before);

    const outcome = resetPersistedStateForNewDevServerRun({
      runId: "run-two",
      env: TEST_ENV,
      storage,
      log: () => {},
    });

    expect(outcome).toEqual({ kind: "disabled" });
    expect(writes).toEqual([]);
    expect(Object.fromEntries(entries)).toEqual(before);
  });

  /**
   * SECOND, INDEPENDENT LAYER. The run id only exists because the Vite plugin
   * injects one while SERVING; a built bundle carries the literal `null`. So even
   * a build whose env guard had been defeated still cannot wipe, because it has
   * no run id to compare against.
   */
  it("touches NOTHING without a run id, even with the dev env", () => {
    const before = { ...dirtyProfile(), [DEV_SERVER_RUN_ID_KEY]: "run-one" };
    const { storage, entries, writes } = fakeStorage(before);

    const outcome = resetPersistedStateForNewDevServerRun({
      runId: null,
      env: DEV_ENV,
      storage,
      log: () => {},
    });

    expect(outcome).toEqual({ kind: "no-run-id" });
    expect(writes).toEqual([]);
    expect(Object.fromEntries(entries)).toEqual(before);
  });
});

describe("the wipe is complete", () => {
  /**
   * Every persistence surface the app has, named by importing the REAL constant
   * from the module that owns it rather than by retyping the string. A new
   * surface that forgets the `cr.` prefix fails the prefix test below; a renamed
   * constant fails to compile here.
   */
  function everyKnownAppKey(): readonly string[] {
    const { storage } = fakeStorage({ [DEV_STUDENT_KEY]: "dev-student-1" });
    return [
      // devPersistence: the city and the wallet, keyed through their own stores
      // so the schema version in the key can never drift from this list.
      createDevSessionStore({ storage, enabled: true }).storageKey(),
      createEconomyDevStore({ storage, enabled: true }).storageKey(),
      // auth: the per-browser dev identity that namespaces the two above.
      DEV_STUDENT_KEY,
      // onboarding: the first-run demo reel.
      ONBOARDING_DEMO_SEEN_KEY,
      // coach marks: the skip-all flag and one per-hint seen flag.
      COACH_SKIP_ALL_KEY,
      coachMarkKey("place"),
      // infinite practice: per-node and per-era best-streak high-water marks.
      nodeBestStreakKey("NUM.F"),
      eraBestStreakKey("prehistoric"),
      // audio preferences.
      MUTE_KEY,
      VOLUME_KEY,
      MUSIC_KEY,
      // the reset's own bookkeeping.
      DEV_SERVER_RUN_ID_KEY,
    ];
  }

  it("covers every persistence surface in the app", () => {
    const keys = everyKnownAppKey();
    expect(keys.length).toBeGreaterThanOrEqual(12);

    const seed = Object.fromEntries(keys.map((key) => [key, "x"]));
    const { storage, entries } = fakeStorage({ ...seed, [COGNITO_KEY]: "token" });

    resetPersistedStateForNewDevServerRun({
      runId: "fresh",
      env: DEV_ENV,
      storage,
      log: () => {},
    });

    const survivors = keys.filter(
      (key) => entries.has(key) && key !== DEV_SERVER_RUN_ID_KEY,
    );
    expect(survivors).toEqual([]);
  });

  it("holds every surface to the shared prefix, so the sweep cannot miss one", () => {
    const keys = everyKnownAppKey();
    expect(keys.length).toBeGreaterThanOrEqual(12);
    expect(keys.filter((key) => !key.startsWith(APP_STORAGE_PREFIX))).toEqual([]);
  });
});

describe("the wipe is visible", () => {
  it("logs a tagged line naming the count, both run ids, and every key", () => {
    const lines: string[] = [];
    const { storage } = fakeStorage({
      ...dirtyProfile(),
      [DEV_SERVER_RUN_ID_KEY]: "run-one",
    });

    resetPersistedStateForNewDevServerRun({
      runId: "run-two",
      env: DEV_ENV,
      storage,
      log: (...args) => lines.push(args.map(String).join(" ")),
    });

    const all = lines.join("\n");
    expect(all).toContain(DEV_RESET_LOG_TAG);
    expect(all).toContain("run-one");
    expect(all).toContain("run-two");
    expect(all).toContain(ONBOARDING_DEMO_SEEN_KEY);
    expect(all).toContain(nodeBestStreakKey("NUM.F"));
  });

  it("says so, quietly, when a reload kept its state", () => {
    const lines: string[] = [];
    const { storage } = fakeStorage({
      ...dirtyProfile(),
      [DEV_SERVER_RUN_ID_KEY]: "run-one",
    });

    resetPersistedStateForNewDevServerRun({
      runId: "run-one",
      env: DEV_ENV,
      storage,
      log: (...args) => lines.push(args.map(String).join(" ")),
    });

    expect(lines.join("\n")).toContain(DEV_RESET_LOG_TAG);
    expect(lines.join("\n")).not.toContain("wiped");
  });
});

describe("devServerRunIdPlugin — the run id comes from the dev server's boot", () => {
  function defineFor(
    plugin: ReturnType<typeof devServerRunIdPlugin>,
    env: { command: "serve" | "build"; isPreview?: boolean },
  ): unknown {
    const hook = plugin.config;
    if (typeof hook !== "function") {
      throw new Error("expected a config hook");
    }
    const result = hook.call(
      // biome-ignore lint/suspicious/noExplicitAny: the hook ignores its `this`.
      {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: the hook ignores the user config.
      {} as any,
      // biome-ignore lint/suspicious/noExplicitAny: only `command`/`isPreview` are read.
      { mode: "development", ...env } as any,
    );
    // biome-ignore lint/suspicious/noExplicitAny: narrowing the hook's union return.
    return (result as any)?.define?.[DEV_SERVER_RUN_ID_GLOBAL];
  }

  it("injects a fresh id while SERVING", () => {
    const value = defineFor(devServerRunIdPlugin(), { command: "serve" });
    expect(typeof value).toBe("string");
    expect(JSON.parse(String(value))).toMatch(/\S/);
  });

  it("injects a DIFFERENT id on each server boot", () => {
    const first = defineFor(devServerRunIdPlugin(), { command: "serve" });
    const second = defineFor(devServerRunIdPlugin(), { command: "serve" });
    expect(first).not.toBe(second);
  });

  it("injects the literal null for a production BUILD", () => {
    expect(defineFor(devServerRunIdPlugin(), { command: "build" })).toBe("null");
  });

  it("injects the literal null for `vite preview` of a built bundle", () => {
    expect(defineFor(devServerRunIdPlugin(), { command: "serve", isPreview: true })).toBe(
      "null",
    );
  });
});
