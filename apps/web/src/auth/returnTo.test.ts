import { afterEach, describe, expect, it } from "vitest";

import {
  AUTH_SCREEN_PATHS,
  consumePostAuthTarget,
  DEFAULT_POST_AUTH_TARGET,
  isAuthScreenPath,
  rememberIntendedRoute,
  RETURN_TO_STORAGE_KEY,
  safeInternalTarget,
} from "./returnTo";
import { authIntentForPath } from "./AuthGate";

/**
 * **THE HAND-BACK AFTER AUTHENTICATION, AND THE OPEN REDIRECT IT MUST NOT BECOME.**
 *
 * A destination that comes out of a URL is attacker-supplied. `…/sign-in?next=//evil.example`
 * costs nothing to send, and unvalidated it makes this product's own sign-in page the first half
 * of a credential-phishing flow — the learner sees the real origin, types the real password, and
 * is then handed somewhere else entirely.
 *
 * The sweep below is written the way the rest of this tree writes forbidden-input sweeps: each
 * pattern carries the input it exists to catch, and every pattern proves it still catches its own
 * example before it is trusted against the shipped validator. A rule edited into uselessness then
 * fails at its own row rather than reporting the absence it caused.
 */

function memoryStorage(seed: Record<string, string> = {}) {
  const all = new Map(Object.entries(seed));
  return {
    all,
    getItem: (key: string) => all.get(key) ?? null,
    setItem: (key: string, value: string) => {
      all.set(key, value);
    },
    removeItem: (key: string) => {
      all.delete(key);
    },
  };
}

afterEach(() => {
  try {
    sessionStorage.clear();
  } catch {
    // Not every environment has one; the module tolerates its absence.
  }
});

/** Every shape that must never survive validation, with what it would have done. */
const REJECTED: readonly { readonly target: string; readonly because: string }[] = [
  { target: "https://evil.example/harvest", because: "an absolute URL on another origin" },
  {
    target: "//evil.example/harvest",
    because: "protocol-relative, which is another origin",
  },
  { target: "/\\evil.example/harvest", because: "backslash-escaped protocol-relative" },
  { target: "\\\\evil.example", because: "a UNC-looking path several parsers normalise" },
  { target: "javascript:alert(1)", because: "a script URL" },
  { target: "data:text/html,<script>", because: "a data URL" },
  {
    target: "/city\nSet-Cookie: x",
    because: "a control character smuggling a second line",
  },
  {
    target: "sign-in",
    because: "not rooted, so it resolves against wherever we happen to be",
  },
  { target: "", because: "empty" },
  {
    target: "/demo",
    because: "the device-local showcase, which an account must never land in",
  },
  { target: "/demo/anything", because: "the showcase again, by prefix" },
  { target: "/sign-in", because: "a form the learner has just finished with" },
  { target: "/create-account", because: "an account screen, so a loop" },
];

describe("the post-authentication destination", () => {
  it("accepts an in-app path and returns it normalised", () => {
    expect(safeInternalTarget("/")).toBe("/");
    expect(safeInternalTarget("/city")).toBe("/city");
    expect(safeInternalTarget("/city?era=neolithic")).toBe("/city?era=neolithic");
    expect(safeInternalTarget("/city#hall")).toBe("/city#hall");
  });

  it("refuses every off-origin, non-path, or self-defeating destination", () => {
    // Each row first proves it is not already vacuous: a target that is not even a string the
    // validator could accept would make its rejection meaningless.
    const inert = REJECTED.filter((row) => typeof row.target !== "string");
    expect(inert.map((row) => row.because)).toEqual([]);
    expect(REJECTED.length).toBeGreaterThanOrEqual(13);

    const survived = REJECTED.filter((row) => safeInternalTarget(row.target) !== null).map(
      (row) => `${JSON.stringify(row.target)} (${row.because})`,
    );
    expect(survived, "an unsafe redirect target survived validation").toEqual([]);
  });

  it("refuses a target long enough to be hiding something", () => {
    expect(safeInternalTarget(`/${"a".repeat(4096)}`)).toBeNull();
  });

  it("refuses anything that is not a string", () => {
    expect(safeInternalTarget(null)).toBeNull();
    expect(safeInternalTarget(undefined)).toBeNull();
    expect(safeInternalTarget(42 as unknown as string)).toBeNull();
  });

  /**
   * BOTH DIRECTIONS on the account-screen list. A screen missing from it would be a
   * redirect loop after sign-in; a path listed here that `AuthGate` does not actually own
   * would be an in-app address this validator refuses for no reason.
   */
  it("names exactly the screens the auth gate owns", () => {
    expect(AUTH_SCREEN_PATHS.length).toBe(4);
    for (const path of AUTH_SCREEN_PATHS) {
      expect(isAuthScreenPath(path)).toBe(true);
      expect(
        authIntentForPath(path),
        `${path} is refused as a destination but the auth gate does not own it`,
      ).not.toBe("welcome");
    }
    expect(isAuthScreenPath("/")).toBe(false);
    expect(isAuthScreenPath("/city")).toBe(false);
  });
});

describe("parking and consuming the intended route", () => {
  it("remembers a safe explicit next, in preference to the address it arrived on", () => {
    const storage = memoryStorage();
    rememberIntendedRoute({ pathname: "/sign-in", search: "?next=/city" }, storage);
    expect(storage.all.get(RETURN_TO_STORAGE_KEY)).toBe("/city");
    expect(consumePostAuthTarget(storage)).toBe("/city");
    // Consumed, so a later unrelated sign-in in this tab is not redirected by it.
    expect(consumePostAuthTarget(storage)).toBe(DEFAULT_POST_AUTH_TARGET);
  });

  it("falls back to the address an unauthenticated visitor actually asked for", () => {
    const storage = memoryStorage();
    rememberIntendedRoute({ pathname: "/city", search: "?era=neolithic" }, storage);
    expect(consumePostAuthTarget(storage)).toBe("/city?era=neolithic");
  });

  it("parks nothing when the only candidate is unsafe, and lands on the ordinary route", () => {
    const storage = memoryStorage();
    rememberIntendedRoute(
      { pathname: "/sign-in", search: "?next=//evil.example" },
      storage,
    );
    expect(storage.all.has(RETURN_TO_STORAGE_KEY)).toBe(false);
    expect(consumePostAuthTarget(storage)).toBe(DEFAULT_POST_AUTH_TARGET);
  });

  it("re-validates on the way out, so a poisoned parked value cannot be honoured", () => {
    const storage = memoryStorage({ [RETURN_TO_STORAGE_KEY]: "https://evil.example" });
    expect(consumePostAuthTarget(storage)).toBe(DEFAULT_POST_AUTH_TARGET);
    expect(storage.all.has(RETURN_TO_STORAGE_KEY)).toBe(false);
  });

  it("parks nothing for a visitor who is already on the ordinary route", () => {
    const storage = memoryStorage();
    expect(rememberIntendedRoute({ pathname: "/", search: "" }, storage)).toBeNull();
    expect(storage.all.size).toBe(0);
  });

  it("survives a storage that refuses to answer", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() =>
      rememberIntendedRoute({ pathname: "/city", search: "" }, blocked),
    ).not.toThrow();
    expect(consumePostAuthTarget(blocked)).toBe(DEFAULT_POST_AUTH_TARGET);
  });
});
