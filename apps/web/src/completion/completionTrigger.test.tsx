import { ERA_SEQUENCE } from "@cr/skill-graph";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { hasNextEra, nextEraId } from "../city/eraState";
import { resetCityEra } from "../city/useCityEra";
import { COMPLETION_CEREMONY_STORAGE_KEY } from "./completionState";

/**
 * WHERE THE ENDING HANGS, and that it hangs there over the CITY.
 *
 * Two claims, and they need different evidence.
 *
 * The first is about the seam. `hasNextEra` has been exported and tested since era
 * state landed and had **no production consumer at all** until this work: only its
 * own test read it. `advanceCityEra` returning `null` IS that call, so the ending's
 * condition is read off the advance rather than asked a second time. What that owes
 * is a check that the condition picks out exactly one era, which is asserted over
 * the authored sequence rather than by writing "cyberpunk" down.
 *
 * The second is that the ending mounts INSIDE the city surface rather than as a
 * full-screen takeover, because the subject of the ending is the city. A DOM test
 * can show the two are on screen together; it cannot show that the city is visible
 * around the sheet, which is a spatial claim and is discharged by the frames in
 * `output/completion/` at a named viewport.
 *
 * The `?ending` hatch is how both this test and a reviewer reach the surface at all:
 * the real route needs era ten's progression to finish, and era ten's progression
 * cannot draw a question (O-END5, measured at this tip: 0 pool items against era
 * one's 234).
 */

describe("the ending fires at exactly one era", () => {
  it("the sequence is long enough for the question to mean anything", () => {
    // A floor under the population, because "exactly one era ends the game" is
    // trivially true of a one-era sequence and would say nothing.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  });

  it("every era but the last advances into another one", () => {
    const enders = ERA_SEQUENCE.filter((era) => !hasNextEra(era.id)).map((era) => era.id);
    expect(
      enders,
      "the game-completion condition matched more or fewer than one era, so the ending would fire in the wrong place or never",
    ).toEqual([ERA_SEQUENCE[ERA_SEQUENCE.length - 1]?.id]);
  });

  it("the condition the city reads is the same one, not a second opinion", () => {
    // `completeCeremony` branches on `advanceCityEra(eraId) === null`, which is
    // `nextEraId(eraId) === null`. Pinned so the two cannot drift into disagreeing.
    for (const era of ERA_SEQUENCE) {
      expect(nextEraId(era.id) === null, era.id).toBe(!hasNextEra(era.id));
    }
  });
});

describe("the ending mounts over the live city", () => {
  beforeEach(() => {
    resetCityEra();
    localStorage.removeItem(COMPLETION_CEREMONY_STORAGE_KEY);
    window.history.replaceState({}, "", "/?ending");
  });
  afterEach(() => {
    resetCityEra();
    localStorage.removeItem(COMPLETION_CEREMONY_STORAGE_KEY);
    window.history.replaceState({}, "", "/");
  });

  it("renders the ceremony and the city's own furniture at the same time", async () => {
    render(<CitySurface enableCanvas={false} />);
    // The city is up: its menu button is the surface's own furniture, and it is still
    // in the document with the ending open. A takeover would have replaced it.
    expect(await screen.findByRole("button", { name: "Menu" })).toBeInTheDocument();

    const ending = await screen.findByTestId("completion-ceremony");
    expect(ending).toHaveAttribute("role", "dialog");
    expect(ending).toHaveAttribute("data-beat", "invitation");
    expect(ending.textContent ?? "").toMatch(/The city is finished/);
  });

  it("does not open when the hatch is absent", async () => {
    window.history.replaceState({}, "", "/");
    render(<CitySurface enableCanvas={false} />);
    await screen.findByRole("button", { name: "Menu" });
    expect(screen.queryByTestId("completion-ceremony")).toBeNull();
  });
});
