import { ERA_SEQUENCE, getEraOrThrow } from "@cr/skill-graph";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { MOCK_NODE_STATES } from "../city/mockCity";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { canPlayCrisisIn } from "./crisisEra";

/**
 * **THE TOOLTIP MOVED WITH THE BOARD — read out of the rendered chip, not out of the module.**
 *
 * The chip's hover said *"Play era one's mid-era crisis on this island."* The instruction was
 * explicit that if the crisis becomes era-aware then that copy moves with it, and a grep can
 * only prove the old string is gone from a source file. This mounts the real city, opens the
 * real menu, and reads the real `title` — twice, in two eras — because the claim is that the
 * sentence a player hovers is different in the two cases.
 *
 * `crisisEra.test.tsx` owns the resolution; this owns the copy on screen.
 */

function loadWith(nodeStates = MOCK_NODE_STATES) {
  return () => Promise.resolve({ node_states: nodeStates, placements: [] });
}

/** Open the ☰ Menu and hand back the winter chip's hover text. */
async function winterHover(user: ReturnType<typeof userEvent.setup>): Promise<string> {
  await user.click(screen.getByRole("button", { name: "Menu" }));
  const chip = await screen.findByRole("button", { name: /Hard Winter/i });
  return chip.getAttribute("title") ?? "";
}

describe("the winter chip says whose crisis it is", () => {
  beforeEach(() => resetCityEra());
  afterEach(() => resetCityEra());

  it("names no era in the city's own age, and names the board's era when it is pinned", async () => {
    const playable = ERA_SEQUENCE.find((era) => canPlayCrisisIn(era.id));
    const pinnedIn = ERA_SEQUENCE.find((era) => !canPlayCrisisIn(era.id));
    expect(playable, "no era can play a crisis at all").toBeDefined();
    expect(pinnedIn, "every era can play its own crisis").toBeDefined();

    // ERA ONE, whose own winter is built: the crisis IS this age, so nothing is named and the
    // sentence cannot go stale.
    setCityEra(playable?.id ?? "prehistoric");
    const user = userEvent.setup();
    // `onOpenSurface` is what puts the whole "Other places" nav on screen, exactly as
    // `App.tsx` passes it — `winterEntryRoute.test.tsx` mounts it the same way and says why.
    const own = render(
      <CitySurface
        enableCanvas={false}
        loadCity={loadWith()}
        onOpenSurface={() => undefined}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    const ownTitle = await winterHover(user);
    expect(ownTitle).toContain("this age's mid-era crisis");
    // THE OLD COPY IS GONE FROM THE RENDERED ATTRIBUTE, which is what the finding was about.
    expect(ownTitle).not.toMatch(/era one's/i);
    // And the promise it also has to make is unchanged.
    expect(ownTitle).toMatch(/unless you carry the damage back/i);
    own.unmount();

    // AN ERA WITH NO WINTER OF ITS OWN: the board cannot follow the city, so the copy says
    // which age's crisis this actually is rather than letting the player assume it is theirs.
    setCityEra(pinnedIn?.id ?? "bronze_age");
    const pinned = render(
      <CitySurface
        enableCanvas={false}
        loadCity={loadWith()}
        onOpenSurface={() => undefined}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    const pinnedTitle = await winterHover(user);
    expect(pinnedTitle).toContain(getEraOrThrow(playable?.id ?? "prehistoric").name);
    expect(pinnedTitle).toMatch(/only age whose winter is built/i);
    expect(pinnedTitle).not.toBe(ownTitle);
    pinned.unmount();
  });
});
