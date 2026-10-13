import { describe, expect, it } from "vitest";

import {
  clearPresenterStorage,
  DEMO_STORAGE_PREFIX,
  PRESENTER_STORAGE_PREFIX,
  presenterStorage,
} from "../storage/runtimeStorage";
import {
  PRESENTER_PRESETS,
  type PresenterSurface,
  presenterHref,
  resolvePresenterRequest,
} from "./presenterMode";

describe("presenter mode belongs only to the exact demo path", () => {
  it("accepts the primary presenter URL and rejects account/local lookalikes", () => {
    expect(resolvePresenterRequest("/demo", "?presenter=1")).toMatchObject({
      enabled: true,
      preset: "bronze-city",
      surface: "city",
      eraId: "neolithic",
    });
    expect(resolvePresenterRequest("/demo", "?presenter=1&era=industrial")).toMatchObject({
      eraId: "industrial",
    });
    expect(resolvePresenterRequest("/", "?presenter=1")).toBeNull();
    expect(resolvePresenterRequest("/demo/", "?presenter=1")).toBeNull();
    expect(resolvePresenterRequest("/demo", "?presenter=0")).toBeNull();
    expect(resolvePresenterRequest("/demo", "?presenter=1&surface=age")).toMatchObject({
      surface: "city",
    });
    expect(resolvePresenterRequest("/demo", "?presenter=1&surface=review")).toMatchObject({
      enabled: true,
      surface: "review",
    });
  });

  it("normalizes every retained showcase scenario into a real presenter surface", () => {
    expect(
      resolvePresenterRequest("/demo", "?showcase=v1&scenario=interactive-lesson"),
    ).toMatchObject({
      enabled: true,
      legacy: true,
      surface: "lesson",
    });
    expect(resolvePresenterRequest("/demo", "?showcase=v0")).toBeNull();
  });

  it("builds one canonical URL for every real preset and surface", () => {
    const surfaces: readonly PresenterSurface[] = [
      "city",
      "lesson",
      "practice",
      "review",
      "work",
      "interleaving",
      "diagnostic",
      "bay",
    ];
    for (const preset of PRESENTER_PRESETS) {
      for (const surface of surfaces) {
        const url = new URL(
          presenterHref("https://example.test/demo", {
            preset,
            surface,
            eraId: "bronze_age",
          }),
        );
        expect(url.pathname).toBe("/demo");
        expect(url.searchParams.get("presenter")).toBe("1");
        expect(url.searchParams.get("preset")).toBe(preset);
        expect(url.searchParams.get("surface")).toBe(surface);
        expect(url.searchParams.get("era")).toBe("bronze_age");
        expect(url.searchParams.has("showcase")).toBe(false);
      }
    }
  });

  it("keeps presenter browser writes separate from ordinary demo saves", () => {
    localStorage.clear();
    localStorage.setItem(`${DEMO_STORAGE_PREFIX}sentinel`, "ordinary");
    const scoped = presenterStorage(localStorage);
    scoped.setItem("cr.progress", "presenter");

    expect(localStorage.getItem(`${DEMO_STORAGE_PREFIX}sentinel`)).toBe("ordinary");
    expect(localStorage.getItem(`${PRESENTER_STORAGE_PREFIX}progress`)).toBe("presenter");
    expect(clearPresenterStorage(localStorage)).toEqual([
      `${PRESENTER_STORAGE_PREFIX}progress`,
    ]);
    expect(localStorage.getItem(`${DEMO_STORAGE_PREFIX}sentinel`)).toBe("ordinary");
  });
});
