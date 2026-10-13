import { afterEach, describe, expect, it, vi } from "vitest";

import { MOCK_CITY_LOAD } from "../city/mockCity";
import { createDevSessionStore, snapshotFromLoad } from "../devPersistence/devSession";
import { demoStorage, runtimeStorage } from "../storage/runtimeStorage";
import { SUCCESSION_QA_STORAGE_PREFIX } from "../succession/successionRoute";
import { createWorkUploadStore, InMemoryWorkUploadStore } from "../work-upload/store";
import {
  clearDemoStorage,
  demoModeEnabled,
  localBrowserPersistenceEnabled,
  resolveDemoApiBaseUrl,
} from "./demoMode";

afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  sessionStorage.clear();
});

describe("the explicit production demo mode", () => {
  it("is false by default and accepts only the literal build-time value true", () => {
    expect(demoModeEnabled({})).toBe(false);
    expect(demoModeEnabled({ VITE_DEMO_MODE: "" })).toBe(false);
    expect(demoModeEnabled({ VITE_DEMO_MODE: "false" })).toBe(false);
    expect(demoModeEnabled({ VITE_DEMO_MODE: "1" })).toBe(false);
    expect(demoModeEnabled({ VITE_DEMO_MODE: "true" })).toBe(true);
  });

  it("enables browser persistence in a production demo but not ordinary production", () => {
    expect(
      localBrowserPersistenceEnabled(
        {
          DEV: false,
          VITE_DEMO_MODE: "true",
          VITE_DIAGNOSTIC_API_URL: "/api/diagnostic",
        },
        "/demo",
      ),
    ).toBe(true);
    expect(
      localBrowserPersistenceEnabled(
        {
          DEV: false,
          VITE_DEMO_MODE: undefined,
          VITE_DIAGNOSTIC_API_URL: undefined,
        },
        "/",
      ),
    ).toBe(false);
    expect(
      localBrowserPersistenceEnabled(
        {
          DEV: false,
          VITE_DEMO_MODE: "true",
          VITE_DIAGNOSTIC_API_URL: "/api/diagnostic",
        },
        "/demo/",
      ),
    ).toBe(false);
  });

  it("cannot call a configured backend from demo mode", () => {
    expect(
      resolveDemoApiBaseUrl(
        {
          VITE_DEMO_MODE: "true",
          VITE_DIAGNOSTIC_API_URL: "https://api.example.test/api/diagnostic",
        },
        "/demo",
      ),
    ).toBeNull();
    expect(
      resolveDemoApiBaseUrl(
        {
          VITE_DEMO_MODE: "true",
          VITE_DIAGNOSTIC_API_URL: "https://api.example.test/api/diagnostic",
        },
        "/",
      ),
    ).toBe("https://api.example.test/api");
  });

  it("uses the plain in-memory work-upload fallback even if backend variables leak in", () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test/api/diagnostic");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "pool");
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client");
    window.history.replaceState(null, "", "/demo");
    expect(createWorkUploadStore()).toBeInstanceOf(InMemoryWorkUploadStore);
  });

  it("clears every app-owned key and leaves unrelated origin storage alone", () => {
    const values = new Map([
      ["cr.demo.devSession.v5.demo", "{}"],
      ["cr.demo.devEconomy.v4.demo", "{}"],
      ["cr.demo.archipelago.v1.demo", "{}"],
      ["cr.account.preference", "keep"],
      ["CognitoIdentityServiceProvider.client.user.accessToken", "keep"],
      ["other-app", "keep"],
    ]);
    const storage = {
      get length() {
        return values.size;
      },
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    expect(clearDemoStorage(storage)).toEqual([
      "cr.demo.devSession.v5.demo",
      "cr.demo.devEconomy.v4.demo",
      "cr.demo.archipelago.v1.demo",
    ]);
    expect([...values]).toEqual([
      ["cr.account.preference", "keep"],
      ["CognitoIdentityServiceProvider.client.user.accessToken", "keep"],
      ["other-app", "keep"],
    ]);
  });

  it("round-trips a city snapshot under the production-demo persistence policy", () => {
    const values = new Map<string, string>();
    const enabled = localBrowserPersistenceEnabled(
      {
        DEV: false,
        VITE_DEMO_MODE: "true",
      },
      "/demo",
    );
    const scoped = demoStorage({
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });
    const first = createDevSessionStore({
      storage: scoped,
      enabled,
      userKey: "amplify-demo",
      debounceMs: 0,
    });
    const snapshot = snapshotFromLoad(MOCK_CITY_LOAD);
    first.save(snapshot);
    first.flush();

    const refreshed = createDevSessionStore({
      storage: scoped,
      enabled,
      userKey: "amplify-demo",
    });
    expect(refreshed.load()).toEqual({
      ...snapshot,
      civic_material_spent: 0,
    });
  });

  it("keeps the Succession QA refresh state out of the ordinary demo namespace", () => {
    localStorage.setItem("cr.demo.devSession.v6.ordinary", "keep");
    window.history.replaceState(null, "", "/demo?succession");

    const first = runtimeStorage();
    first?.setItem("cr.succession.v1", "battle");
    expect(localStorage.getItem("cr.demo.devSession.v6.ordinary")).toBe("keep");
    expect(localStorage.getItem("cr.demo.succession.v1")).toBeNull();
    expect(sessionStorage.getItem(`${SUCCESSION_QA_STORAGE_PREFIX}cr.succession.v1`)).toBe(
      "battle",
    );

    expect(runtimeStorage()?.getItem("cr.succession.v1")).toBe("battle");
    window.history.replaceState(null, "", "/demo");
    expect(runtimeStorage()?.getItem("cr.succession.v1")).toBeNull();
  });

  it("does not give an unrelated city-route parameter the Succession storage namespace", () => {
    window.history.replaceState(null, "", "/demo?future-city-crisis");
    runtimeStorage()?.setItem("cr.route-probe", "ordinary-demo");

    expect(localStorage.getItem("cr.demo.route-probe")).toBe("ordinary-demo");
    expect(
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith(SUCCESSION_QA_STORAGE_PREFIX),
      ),
    ).toEqual([]);
  });
});
