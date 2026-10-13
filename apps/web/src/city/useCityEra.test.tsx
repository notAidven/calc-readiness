import { ERA_SEQUENCE } from "@cr/skill-graph";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_ERA_ID, ERA_STATE_STORAGE_KEY, loadEraId } from "./eraState";
import {
  advanceCityEra,
  cityEraId,
  resetCityEra,
  setCityEra,
  useCityEra,
} from "./useCityEra";

/**
 * `cityEraId()` — the store's era read from OUTSIDE React, and the seam the economy adapter
 * reaches the live era through.
 *
 * The two mutators were already exported as plain functions for a non-component caller; the
 * read was missing, and its absence is why `economySession.ts` had `CURRENT_ERA_ID` hard-wired
 * and answered era one's material for a learner in era two. So what is worth pinning is not
 * that it returns an era, but that it returns THE SAME era every rendered surface is showing
 * — otherwise it is a second source of truth wearing the store's name.
 */

afterEach(resetCityEra);

/** A surface that renders nothing but the era the hook hands it. */
function EraProbe() {
  return <span data-testid="rendered-era">{useCityEra()}</span>;
}

function renderedEra(): string {
  return screen.getByTestId("rendered-era").textContent ?? "";
}

describe("cityEraId — one era, read two ways", () => {
  it("agrees with what the hook renders through a set, an advance and a reset", () => {
    render(<EraProbe />);
    expect(cityEraId()).toBe(DEFAULT_ERA_ID);
    expect(renderedEra()).toBe(cityEraId());

    const second = ERA_SEQUENCE[1]?.id;
    const third = ERA_SEQUENCE[2]?.id;
    if (second === undefined || third === undefined) {
      throw new Error("expected at least three authored eras to walk");
    }

    act(() => setCityEra(second));
    expect(cityEraId()).toBe(second);
    expect(renderedEra()).toBe(second);

    act(() => {
      advanceCityEra(second);
    });
    expect(cityEraId()).toBe(third);
    expect(renderedEra()).toBe(third);

    act(() => resetCityEra());
    expect(cityEraId()).toBe(DEFAULT_ERA_ID);
    expect(renderedEra()).toBe(DEFAULT_ERA_ID);
  });

  it("follows the STORE, not the storage, which is where the two come apart", () => {
    // The case the docblock argues from, forced: storage that did not take the write.
    // `saveEraId` is a no-op under SSR and in a bare unit test, so a reader built on
    // `loadEraId()` would report the default while every rendered surface showed the era the
    // store was moved to — a disagreement in exactly the environment where it is hardest to
    // see. Removing the key by hand reproduces it without stubbing the platform.
    const second = ERA_SEQUENCE[1]?.id;
    if (second === undefined) {
      throw new Error("expected a second authored era");
    }
    render(<EraProbe />);
    act(() => setCityEra(second));
    localStorage.removeItem(ERA_STATE_STORAGE_KEY);

    expect(loadEraId()).toBe(DEFAULT_ERA_ID);
    expect(loadEraId()).not.toBe(second);
    // The store, the hook and this read are one value regardless.
    expect(cityEraId()).toBe(second);
    expect(renderedEra()).toBe(second);
  });
});
