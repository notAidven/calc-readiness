import { HARD_WINTER } from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { devSessionStore, withDevPersistence } from "../devPersistence/devSession";
import { faceTheWinter } from "../test/faceTheWinter";
import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession, D1_NODE_IDS } from "./citySession";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { resetCityEra, setCityEraForPreview } from "./useCityEra";

/**
 * **THE CARRY-BACK, MEASURED WHERE THE PLAYER LOOKS: THE CITY HE IS RETURNED TO.**
 *
 * The lead, twice: *"also carry this damage back to my city still doesnt work; buildings arent
 * affected and still look the same"*.
 *
 * ## Why the tree was green while the button did nothing
 *
 * Every existing test of this feature stops one seam short of the screen.
 * `liveCityScar.test.tsx` presses the button and reads `localStorage`; the city-side suites
 * (`ruinLessonAccess`, `crisisRepairSurface`, `winterDamageReachesTheCity`) build their
 * fixtures by handing `snapshotWithWinterDamage` a report and then constructing a session
 * FROM the damaged blob. Both halves are true and neither is the product: in the app the city
 * session already exists when the winter is played, and it is the object `CitySurface` renders
 * from. So the pair of them could stay green over a write that reached storage and nothing
 * else, which is exactly what shipped.
 *
 * This file is that missing seam and nothing more. It plays a real winter through the real
 * in-city mount over a session built the way `App.tsx` builds one, presses the real button,
 * and then asks the CITY — not the blob — what it now knows.
 *
 * ## The three claims, and why each one is separate
 *
 *  - **the session the city renders from carries the ruins.** This is the one that was false.
 *    `CitySurface` derives `ruinedNodeIds` from `load.crisis_damage`, and `load` is
 *    `session.load()`, so a write that never reaches the session is a write nothing can draw.
 *  - **the roster says so.** The accessible half of the picture (the canvas is `aria-hidden`),
 *    and the same `data-ruined` attribute `ruinLessonAccess.test.tsx` reads. The RENDERED
 *    building is a spatial claim and is owed a frame instead; `three/winterCarryBackFrames
 *    .browser.test.tsx` is that frame.
 *  - **it survives the next ordinary write.** A snapshot the session does not hold is a
 *    snapshot the session's own next `capture()` overwrites, so a carry-back that only
 *    reached storage would also be UNDONE by the next thing the player did on the island.
 *    That is a second failure hiding behind the first and it needs its own assertion.
 *
 * ## The store is the app's real singleton
 *
 * `scarLiveCity`'s FALLBACK writes through the module-level `devSessionStore`, so a test store
 * handed to `withDevPersistence` would not be the store a broken carry-back writes to and this
 * file would be measuring two different cities — the failure it is here to catch would look
 * like a clean pass. The app's own store over jsdom's `localStorage` is the faithful
 * arrangement; the key is cleared around each case.
 *
 * ## The one thing this file assumes, and where that assumption is checked
 *
 * It wires `onCarryCrisisDamage` itself, the way `App.tsx` wires it. That the COMPOSITION ROOT
 * really passes it is a separate claim and a separate failure — an optional prop nobody hands
 * over is exactly how this defect would come back — so `carryBackComposition.test.tsx` drives
 * the real `App` and asserts it there.
 */

/** A cell for each skill, clear of the hub's reserved block. Mirrors `ruinLessonAccess`. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

let key = "";

beforeEach(() => {
  setCityEraForPreview("prehistoric");
  key = devSessionStore.storageKey();
  window.localStorage.removeItem(key);
});

afterEach(() => {
  window.localStorage.removeItem(key);
  resetCityEra();
});

/**
 * A city built the way `App.tsx` builds one: a dev session wrapped in persistence over the
 * app's own store, with era one placed and mastered.
 *
 * Built through the session's own writes rather than restored from a hand-made blob, because
 * the defect is about a session that already exists when the winter starts. A fixture that
 * constructed the session FROM a damaged snapshot would be assuming away the thing under test.
 */
async function aCityWorthLosing(): Promise<CityDevSession> {
  const session = withDevPersistence(createCityDevSession(), devSessionStore);
  for (const nodeId of D1_NODE_IDS) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    // Mastered, so the roster row below reads "Complete" and the ruin badge is the only
    // thing about it that could have changed.
    await session.advanceMasteryDev(nodeId, 3);
  }
  devSessionStore.flush();
  if (devSessionStore.load() === null) {
    throw new Error("the fixture city did not save");
  }
  return session;
}

function renderCity(session: CityDevSession) {
  return render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onDevAdvanceMastery={session.advanceMasteryDev}
      // THE WIRING UNDER TEST, as `App.tsx` wires it: the crisis's damage goes to the same
      // session `loadCity` reads from. Without it the surface falls back to the saved blob,
      // which is the defect — see this file's head, and `carryBackComposition.test.tsx` for
      // the guard that the real composition root supplies one.
      onCarryCrisisDamage={session.recordCrisisDamage}
      onOpenSurface={() => undefined}
    />,
  );
}

/** ☰ Menu → Hard Winter → the advisor → "Face the winter", the way a player arrives. */
async function openTheWinter(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
  const others = screen.getByRole("navigation", { name: "Other places" });
  await user.click(within(others).getByRole("button", { name: /Hard Winter/i }));
  await faceTheWinter(user);
  return await screen.findByTestId("winter-in-city");
}

/**
 * Play the whole winter with nothing answered right, so the frost takes the settlement.
 *
 * Answers are wrong by construction rather than by looking a key up: what this fixture needs
 * is a `none` tier every round, and the shortest honest way to get one is to answer nothing
 * right. `HardWinterSurface.test.tsx` grades real answers through the real checker; this file
 * is about what happens after the winter ends.
 */
async function loseTheWinter(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
    // Awaited rather than queried: the winter's surface is behind `lazy`, so the mount is on
    // screen a tick before its declare panel is.
    await user.click(
      await screen.findByRole("button", { name: /Light a fire/i }, { timeout: 10_000 }),
    );
    // A corner of the board, so the fire holds nothing that matters. Found by `data-cell`,
    // which is the handle the winter's own suites use and is stable across every layout.
    const cell = document.querySelector<HTMLElement>('[data-cell="0,0"]');
    if (!cell) {
      throw new Error(`no centre cell to light in round ${round}`);
    }
    await user.click(cell);
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    for (let index = 0; index < HARD_WINTER.batch_size; index += 1) {
      const field = await screen.findByRole("textbox");
      await user.clear(field);
      await user.type(field, "999999");
      await user.click(screen.getByRole("button", { name: "Check" }));
      await user.click(
        screen.getByRole("button", {
          name:
            index + 1 >= HARD_WINTER.batch_size ? /See what you earned/i : /Next question/i,
        }),
      );
    }
    await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));
  }
  await screen.findByTestId("hw-conclusion");
}

/** Every roster row the city currently draws as a ruin. */
function ruinedRows(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      'button.city-plot[data-ruined="true"][data-node-id]',
    ),
  ].map((row) => row.dataset.nodeId ?? "");
}

describe("carrying a winter back reaches the city the player is returned to", () => {
  it("marks the buildings the winter took, in the session the island renders from", async () => {
    const user = userEvent.setup();
    const session = await aCityWorthLosing();
    renderCity(session);

    // The roster is opened BEFORE the winter and left open, so `ruinedRows()` is a real
    // reading on both sides of the press. Read off a closed disclosure it would report an
    // empty list either way, and the floor below would be measuring nothing.
    await openBuiltShelf(user);
    expect(
      document.querySelectorAll("button.city-plot[data-node-id]").length,
      "the roster is not listing this city's buildings",
    ).toBeGreaterThanOrEqual(D1_NODE_IDS.length);

    await openTheWinter(user);
    await loseTheWinter(user);

    // FLOORS. Every claim below holds trivially over a winter that ruined nothing, and a
    // winter that ruined nothing is the likeliest way this fixture rots: a retune of the
    // frost's reach or the bite would do it silently.
    const carry = await screen.findByRole("button", {
      name: /Carry this damage back to my city/i,
    });
    expect(session.crisisDamage().ruined_buildings).toEqual([]);
    expect(ruinedRows()).toEqual([]);

    await user.click(carry);

    // THE CITY IS BACK. The button promises both halves and the assertions below are about
    // the island rather than about the winter, so the winter has to be off screen first.
    await waitFor(() => {
      expect(screen.queryByTestId("winter-in-city")).toBeNull();
    });

    /*
     * **THE SEAM.** `CitySurface` draws ruins from `load.crisis_damage`, and `load` is this
     * session — so a carry-back the session never heard about is a carry-back nothing can
     * draw, however correct the blob in storage is.
     *
     * The blob is read into the MESSAGE rather than asserted on its own, because the two
     * numbers together are the diagnosis and either alone is misleading. Before the fix this
     * line read *"storage carries 7 ruins and the live session carries 0"*, which is the whole
     * defect in one sentence; a future regression that ruins nothing reads `0 / 0` and says
     * the fixture rotted instead.
     */
    devSessionStore.flush();
    const stored = devSessionStore.load()?.crisis_damage?.ruined_buildings ?? [];
    const ruined = session.crisisDamage().ruined_buildings.map((b) => b.node_id);
    expect(
      ruined.length,
      `storage carries ${stored.length} ruins and the live session carries ${ruined.length}`,
    ).toBeGreaterThan(0);
    // ...and the two agree, which is the durability half: the city on screen and the city on
    // the next reload are one city.
    expect(stored.map((b) => b.node_id).sort()).toEqual([...ruined].sort());

    // AND THE CITY IS DRAWING THEM. The roster is the accessible half of the picture (the
    // canvas is `aria-hidden`), and it is the same `data-ruined` the 3D layer's `ruinedNodeIds`
    // is derived from one `useMemo` away.
    await waitFor(() => {
      expect(ruinedRows().sort()).toEqual(
        [...ruined].filter((id) => id in CELL_FOR).sort(),
      );
    });
    for (const nodeId of ruined) {
      if (!(nodeId in CELL_FOR)) {
        continue;
      }
      const row = document.querySelector<HTMLElement>(
        `button.city-plot[data-node-id="${nodeId}"]`,
      );
      expect(row?.textContent, `${nodeId} is not reported as a ruin`).toContain("In ruins");
      // ...and the learning is untouched, which is the failure floor at its narrowest.
      expect(row?.textContent).toContain("Complete");
    }

    // The damage panel counts them too, so the player has something to repair rather than a
    // badge with no action behind it.
    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    expect(panel.textContent).toContain(
      `${ruined.length} building${ruined.length === 1 ? "" : "s"} in ruins`,
    );
  }, 180000);

  /**
   * **THE SECOND FAILURE, WHICH HIDES BEHIND THE FIRST.**
   *
   * `withDevPersistence` snapshots what `session.load()` reports after every mutation. A
   * carry-back that only reached storage leaves the session holding an undamaged city, so the
   * next ordinary thing the player does — mastering a skill, laying a road, moving a building
   * — writes that undamaged city straight back over the blob. The damage would then survive
   * exactly until the player touched anything, which is worse than it never landing: it is a
   * feature that works on reload and then quietly un-works.
   */
  it("survives the next ordinary write, rather than being overwritten by it", async () => {
    const user = userEvent.setup();
    const session = await aCityWorthLosing();
    renderCity(session);

    await openTheWinter(user);
    await loseTheWinter(user);
    await user.click(
      await screen.findByRole("button", { name: /Carry this damage back to my city/i }),
    );
    await waitFor(() => {
      expect(screen.queryByTestId("winter-in-city")).toBeNull();
    });

    const recorded = session.crisisDamage().ruined_buildings.map((b) => b.node_id);
    expect(
      recorded.length,
      "nothing was recorded, so nothing can be overwritten",
    ).toBeGreaterThan(0);

    // AN ORDINARY CITY WRITE, through the session's own mutator — the same route a placement,
    // a road or a practice set takes.
    await session.advanceMasteryDev(D1_NODE_IDS[0] as string, 3);
    devSessionStore.flush();

    const saved = devSessionStore.load();
    expect(saved?.crisis_damage?.ruined_buildings.map((b) => b.node_id).sort()).toEqual(
      [...recorded].sort(),
    );
  }, 180000);
});
