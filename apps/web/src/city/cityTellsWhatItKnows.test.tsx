import { EARN } from "@cr/economy";
import { CITIZEN_NODE_CAPACITY, capacityForNode, hardWinterRepairPrices } from "@cr/game";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { snapshotWithWinterDamage } from "../winter/scarLiveCity";
import { cityContributionMessage, skillCompleteMessage } from "./announcements";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { type RepairTarget, repairCrisisDamage } from "./crisisRepair";
import { CURRENT_ERA_ID } from "./eraDressing";
import { MILESTONE_CITY_RECOVERED } from "./milestones";
import { openBuiltShelf } from "./test/openBuiltShelf";

/**
 * **THE TWO THINGS THE CITY NOW SAYS OUT LOUD, driven through the real surface.**
 *
 * `announcements.test.ts` holds the copy and `milestones.test.ts` holds the predicates.
 * Neither is evidence that anything reaches a screen: a pure function returning the right
 * sentence and a component rendering it are different claims, and the second is the one a
 * wiring mistake breaks. So this file presses the real controls on the real `CitySurface`
 * and reads the DOM.
 *
 * The frames are in `cityTellsWhatItKnows.browser.test.tsx`, at 1024x580, because where a
 * line sits and what it covers is a claim only a rendered picture can answer.
 */

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** A grid cell per skill, clear of the hub's reserved block at the island's centre. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

const PRICES = hardWinterRepairPrices();

/** Every node the capacity table authors: the population that owes a contribution line. */
const AUTHORED_NODES = Object.keys(CITIZEN_NODE_CAPACITY);

/**
 * A city with every skill placed and mastered, through the real session.
 *
 * `advanceMasteryDev(nodeId, 3)` is the same path `ruinLessonAccess.test.tsx` uses, so the
 * buildings reach the state a learner reaches rather than a state invented here.
 */
async function masteredCity() {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const session = withDevPersistence(createCityDevSession(), store);
  for (const nodeId of AUTHORED_NODES) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    await session.advanceMasteryDev(nodeId, 3);
  }
  store.flush();
  return session;
}

/**
 * A damaged city, a funded wallet, and the real repair sequence behind the buttons.
 *
 * `cells` is a parameter because the two claims below need two fixtures: a city whose LAST
 * scar is a building, and a city where repairing the building leaves ground standing. A
 * one-shape fixture cannot tell "fires on the transition" from "fires on any repair".
 */
async function damagedCity(material: number, cells: readonly string[]) {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const built = withDevPersistence(createCityDevSession(), store);
  await built.placeSkill("NUM.S", { col: 2, row: 2, rot: 0 });
  await built.advanceMasteryDev("NUM.S", 3);
  await Promise.resolve();
  store.flush();

  const saved = store.load();
  if (saved === null) {
    throw new Error("the fixture city did not save");
  }
  store.save(snapshotWithWinterDamage(saved, { buildings: ["NUM.S"], cells: [...cells] }));
  store.flush();

  const restored = store.load();
  if (restored?.crisis_damage === undefined) {
    throw new Error("the fixture damage did not save");
  }
  // THE FLOOR under every assertion below: the fixture really is a city that has carried
  // exactly one crisis, which is the once-only key the recovery line reads.
  expect(restored.crisis_damage.next_damage_id).toBe(2);

  const session = withDevPersistence(createCityDevSession(restored), store);
  const economy = createInMemoryEconomyClient(null);
  const perSet = EARN.interleaved.material;
  let funded = 0;
  for (let index = 0; funded < material; index += 1) {
    await economy.reportInterleavedClear({ sessionId: `seed-${index}` });
    funded += perSet;
  }

  const onRepairRuin = (target: RepairTarget) =>
    repairCrisisDamage(
      {
        damage: session.crisisDamage,
        economy,
        clearBuilding: session.repairRuinedBuilding,
        clearCell: session.reclaimRuinedCell,
        clearCivic: session.liftSuspendedCivic,
        eraId: CURRENT_ERA_ID,
      },
      target,
    );

  return { session, onRepairRuin, funded };
}

async function openBuildings(user: ReturnType<typeof userEvent.setup>) {
  await openBuiltShelf(user);
}

/**
 * Let every effect the load kicked off flush, so an ABSENCE assertion is a claim about a
 * settled surface rather than about a frame that had not rendered yet.
 *
 * This is load-bearing and it was measured: with the load effect replaced by a read of the
 * current damage — the simplest wrong version of the recovery milestone — the note really is
 * rendered, and *"nothing is there"* still passed, because `findByRole` resolves on the
 * commit that first draws the Buildings button and the note arrives on the next one.
 */
async function settled(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function plotButton(nodeId: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!button) {
    throw new Error(`no roster button for ${nodeId}`);
  }
  return button;
}

describe("a skill building's callout says what it gives the city", () => {
  it("carries the line for every node the capacity table authors", async () => {
    const user = userEvent.setup();
    const session = await masteredCity();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await openBuildings(user);

    // ONE LITERAL, so this file is not only comparing the surface against the function it
    // renders. The Dwellings at full mastery is the headline number in the game.
    await user.click(plotButton("NUM.2"));
    expect(
      (await screen.findByRole("dialog")).querySelector(".building-callout-gives")
        ?.textContent,
    ).toBe("Homes for 30 of your people.");
    await user.keyboard("{Escape}");

    // Then the coverage claim, over the tuning table's own membership and floored, so a
    // table that lost its entries would not satisfy this by having none.
    expect(AUTHORED_NODES.length).toBeGreaterThanOrEqual(6);
    for (const nodeId of AUTHORED_NODES) {
      await openBuildings(user);
      await user.click(plotButton(nodeId));
      const dialog = await screen.findByRole("dialog");
      const gives = dialog.querySelector(".building-callout-gives");
      const expected = cityContributionMessage({
        // The view the surface itself builds for a mastered node.
        node_id: nodeId,
        construction_state: "complete",
        mastery: 3,
      } as never);
      expect(expected, `${nodeId} has no line to render`).not.toBeNull();
      expect(gives, `${nodeId} rendered no contribution line`).not.toBeNull();
      expect(gives?.textContent, nodeId).toBe(expected);
      // It sits ABOVE the lesson cards, so it is read before the actions rather than
      // after them, and it is inside the callout rather than floating beside it.
      const cards = dialog.querySelector(".lesson-menu-card");
      expect(cards, `${nodeId} lost its lesson cards`).not.toBeNull();
      if (gives === null || cards === null) {
        throw new Error(`${nodeId} is missing the pair this ordering claim is about`);
      }
      expect(
        gives.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING,
        `${nodeId}'s contribution line is below its lesson cards`,
      ).toBeTruthy();
      await user.keyboard("{Escape}");
    }
  });

  it("says nothing on a building that holds nobody yet", async () => {
    const user = userEvent.setup();
    const store = createDevSessionStore({
      storage: memStorage(),
      enabled: true,
      debounceMs: 0,
    });
    const session = withDevPersistence(createCityDevSession(), store);
    // Placed and never practised: a foundation, which houses nobody.
    await session.placeSkill("NUM.2", { col: -3, row: 2, rot: 0 });

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await openBuildings(user);
    await user.click(plotButton("NUM.2"));
    const dialog = await screen.findByRole("dialog");

    expect(dialog.querySelector(".building-callout-gives")).toBeNull();
    // And it does not leak the figure some other way: the Dwellings' numbers are simply
    // not on this card yet.
    const capacity = capacityForNode("NUM.2");
    expect(dialog.textContent).not.toContain(
      `${capacity.residence_mastered} of your people`,
    );
  });
});

/**
 * **THE ANNOUNCEMENT, WHICH IS THE HALF THAT MAKES THE JUMP AN EVENT.**
 *
 * §4.5 of the game-feel backlog rules that the gain is announced at the moment it happens
 * as well as being inspectable on click, and calls the announcement *"the more valuable
 * half, because it is the only way the 10-to-26 jump is ever felt as an event rather than
 * noticed later"*. That half was the one with no wiring evidence: `announcements.test.ts`
 * asserts {@link skillCompleteMessage} composes the clause, and this file's own header
 * says why that is not the same claim, but nothing pressed a real mastery crossing and
 * read the live region.
 *
 * ## The crossing is the assertion, not the sentence
 *
 * A `CityBuildingView` is `complete` at `mastery >= 2`, and the completion announcement
 * fires on that boolean going true, so the beat under test only exists in the DIFF between
 * two loads. Mounting an already-mastered city cannot see it: the effect's first ready read
 * seeds a baseline and celebrates nothing, which is exactly the *"no popup for something
 * that happened three sessions ago"* discipline. So the fixture starts the Dwellings at
 * mastery 1 — practised, holding its ten, and NOT yet complete — and the practice control
 * carries it over the bar while the surface is mounted.
 *
 * That is also what makes the figures the interesting part: the callout reads *"Homes for
 * 10 ... and 26 at mastery"* before the click and the announcement says *"Homes for 26"*
 * after it, so the two surfaces are measured against each other across the one beat the
 * tuning table calls the largest in the game.
 */
describe("the mastery beat announces what the building now gives", () => {
  it("speaks the jump to 26 at the moment the Dwellings cross the bar", async () => {
    const user = userEvent.setup();
    const store = createDevSessionStore({
      storage: memStorage(),
      enabled: true,
      debounceMs: 0,
    });
    const session = withDevPersistence(createCityDevSession(), store);
    await session.placeSkill("NUM.2", { col: -3, row: 2, rot: 0 });
    // Mastery 1 is a SCORED set at the worst score: the building is built and practised,
    // so it already holds its ten, and it is one tier below `complete`.
    await session.advanceMasteryDev("NUM.2", 1);
    store.flush();

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onDevAdvanceMastery={session.advanceMasteryDev}
      />,
    );
    await openBuildings(user);
    await settled();

    const capacity = capacityForNode("NUM.2");
    const polite = screen.getByTestId("city-live-polite");
    // NOT BEFORE, and this is the floor under the assertion below: the mastered figure is
    // nowhere in the live region yet, so what arrives there is the crossing and not the
    // load. Without this the test would pass over a surface that announced 26 on mount.
    expect(polite.textContent).not.toContain(
      `Homes for ${capacity.residence_mastered} of your people`,
    );

    // The callout's own figure at mastery 1, which is the before half of the jump.
    await user.click(plotButton("NUM.2"));
    expect(
      (await screen.findByRole("dialog")).querySelector(".building-callout-gives")
        ?.textContent,
    ).toBe(
      `Homes for ${capacity.residence_built} of your people, and ${capacity.residence_mastered} at mastery.`,
    );
    await user.keyboard("{Escape}");

    // THE CROSSING. "Advance mastery" is the practice step that finishes a building, so
    // this is the surface's own control for the beat rather than a state poke: mastery 1
    // becomes 2, `complete` goes true, and the completion effect fires once.
    await user.click(await screen.findByRole("button", { name: /Menu/ }));
    await user.click(await screen.findByRole("button", { name: "Advance mastery" }));

    const expected = skillCompleteMessage({
      node_id: "NUM.2",
      construction_state: "complete",
      mastery: 2,
    } as never);
    // The whole sentence, so this cannot pass on the completion half alone. The clause is
    // the last thing in it, which is the ordering the announcement was given.
    await waitFor(() => expect(polite).toHaveTextContent(expected));
    expect(expected).toContain(`Homes for ${capacity.residence_mastered} of your people.`);
    // And the callout now agrees with what was just spoken, so a learner who inspects the
    // building after hearing the line reads the same figure. The roster is still open
    // behind the dev panel, so this closes the panel rather than toggling the disclosure.
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Advance mastery" })).toBeNull(),
    );
    await openBuildings(user);
    await user.click(plotButton("NUM.2"));
    expect(
      (await screen.findByRole("dialog")).querySelector(".building-callout-gives")
        ?.textContent,
    ).toBe(`Homes for ${capacity.residence_mastered} of your people.`);
  });
});

describe("the city says it is back on its feet", () => {
  it("lands on the repair that clears the last scar", async () => {
    const user = userEvent.setup();
    // One ruined building and NO scarred ground, so the building repair is the last scar.
    const { session, onRepairRuin, funded } = await damagedCity(PRICES.per_building, []);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={funded}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    // NOT BEFORE. A city that loads carrying damage has not just recovered.
    expect(screen.queryByTestId("city-milestone")).toBeNull();

    await user.click(
      within(panel).getByRole("button", {
        name: new RegExp(`Repair for ${PRICES.per_building}`),
      }),
    );

    const note = await screen.findByTestId("city-milestone");
    expect(note.textContent).toBe(MILESTONE_CITY_RECOVERED);
    // The damage panel is gone, so the line is standing in the slot it vacated rather
    // than beside a panel still reporting ruins.
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /Crisis damage/i })).toBeNull();
    });
    // And it is spoken, not only drawn: the 3D view is `aria-hidden`, so a milestone
    // offered to the eye alone would be a beat a screen-reader user never gets.
    expect(document.body.textContent).toContain(MILESTONE_CITY_RECOVERED);
  });

  it("says nothing while a repair leaves damage standing", async () => {
    const user = userEvent.setup();
    // A building AND ground: repairing the building is not a recovery.
    const { session, onRepairRuin, funded } = await damagedCity(PRICES.per_building, [
      "4,0",
    ]);
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={funded}
      />,
    );

    const panel = await screen.findByRole("region", { name: /Crisis damage/i });
    await user.click(
      within(panel).getByRole("button", {
        name: new RegExp(`Repair for ${PRICES.per_building}`),
      }),
    );

    // The repair landed and the panel is still up for the ground.
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Crisis damage/i }).textContent).toContain(
        "Every building came through",
      );
    });
    expect(screen.queryByTestId("city-milestone")).toBeNull();
    expect(document.body.textContent).not.toContain(MILESTONE_CITY_RECOVERED);
  });

  it("says nothing on a city that was never damaged", async () => {
    const session = await masteredCity();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    await settled();
    expect(screen.queryByTestId("city-milestone")).toBeNull();
    expect(document.body.textContent).not.toContain(MILESTONE_CITY_RECOVERED);
  });

  /**
   * **THE ASSERTION WITH TEETH, and it is about the BASELINE rather than the copy.**
   *
   * The simplest wrong implementation of this milestone is a read of the current damage:
   * *"clear, and the mint says one crisis, so say it"*. That version is correct on the
   * repair itself and wrong forever afterwards — the line comes back on every load of an
   * already-repaired city, which is the *"popup for something that happened three sessions
   * ago"* the crisis call's own hook was written against.
   *
   * A test that only ever mounts an UNDAMAGED city cannot tell the two apart, because the
   * once-only mint check refuses a city that has carried no crisis whatever the first
   * conjunct says. So the fixture here is the one state that separates them: a city that
   * carried exactly one crisis and has already had every scar repaired before the surface
   * mounts.
   */
  it("says nothing on a city that loads already repaired", async () => {
    const { session, onRepairRuin, funded } = await damagedCity(PRICES.per_building, []);
    // Repaired BEFORE the mount, through the real sequence, so the fixture is a state a
    // learner reaches by closing the tab after their last repair.
    const cleared = await onRepairRuin({ kind: "building", nodeId: "NUM.S" });
    expect(cleared.repaired, "the fixture did not actually repair the ruin").toBe(true);
    const load = await session.load();
    expect(load.crisis_damage?.next_damage_id, "the mint moved unexpectedly").toBe(2);
    expect(load.crisis_damage?.ruined_buildings).toEqual([]);

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onRepairRuin={onRepairRuin}
        goldAvailable={funded}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    await settled();
    expect(screen.queryByRole("region", { name: /Crisis damage/i })).toBeNull();
    expect(screen.queryByTestId("city-milestone")).toBeNull();
    expect(document.body.textContent).not.toContain(MILESTONE_CITY_RECOVERED);
  });
});
