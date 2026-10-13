import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { snapshotWithWinterDamage } from "../winter/scarLiveCity";
import { CitySurface } from "./CitySurface";
import { createCityDevSession, D1_NODE_IDS } from "./citySession";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { isTownHall, TOWN_HALL_ID } from "./townHall";

/**
 * **A RUINED BUILDING IS STILL CLICKABLE, AND ITS LESSON IS STILL THERE.**
 *
 * The ruling, verbatim (team lead, 2026-07-30): *"Crises can damage, disable, scar, or reduce
 * capacity, but they cannot undo mastery or permanently remove an earned building."* Always
 * preserved: *"completed lessons, earned skill buildings"*. So the one thing crisis damage may
 * never do is stand between a learner and teaching, and the shortest ways to do it are all
 * one line each: filter the ruin out of the roster, return early in the callout, or add
 * `|| ruined` to the practice gate.
 *
 * The path under test is the real one: the Buildings roster row (the accessible entry — the
 * 3D canvas is `aria-hidden`, and `PlacedBuilding`'s `onClick` opens the same popup through
 * the same `openLessonPopup`) → the anchored `role="dialog"` → `LessonMenu`, whose FIRST card
 * is the lesson and is never gated by anything.
 *
 * ## The population is every building that can be ruined, not one hand-picked node
 *
 * A crisis ruins whatever is on the board, so scoping this to one node would leave five
 * buildings and a hub outside a guard written for exactly their defect. The population is
 * therefore derived from `D1_NODE_IDS` — the same list the session seeds from — plus the hub,
 * which the winter can ruin too.
 *
 * ## And the hub is a NAMED exception, failing both ways
 *
 * `TOWN_HALL_ID` genuinely does not owe "opens a lesson menu": the hall has no lesson (spec
 * §2.2), and clicking it opens the island-hub panel instead. That is a member of the
 * population that does not owe the property, which looks identical from outside a guard to a
 * member that forgot it — so it is listed rather than quietly filtered, and the list is
 * asserted in both directions:
 *
 *  - a listed id that DOES offer a lesson menu fails ("has not quietly grown a lesson"), so
 *    the exemption cannot go on excusing something it has stopped describing;
 *  - an unlisted id must offer one, so an id added to the list to make a failure go away
 *    fails the census below instead.
 */

const RUINABLE_PLACEMENTS: readonly string[] = [...D1_NODE_IDS, TOWN_HALL_ID];

/**
 * Placements that owe NO lesson menu, each with its reason.
 *
 * One entry. `NEVER_HAS_A_LESSON` rather than `EXEMPT` because the reason is a fact about the
 * product and not a concession: the hub is not a skill, has no `student_node_state`, and never
 * appears in the roster's N/6.
 */
const NEVER_HAS_A_LESSON: readonly string[] = [TOWN_HALL_ID];

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** A grid cell for each skill, clear of the hub's reserved 3x2 block at the centre. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

/**
 * A city with every skill built to Complete, then RUINED by a crisis — through the real
 * write path (`snapshotWithWinterDamage`), so nothing here can produce a damage shape the
 * winter could not.
 */
async function ruinedCity(): Promise<ReturnType<typeof withDevPersistence>> {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const session = withDevPersistence(createCityDevSession(), store);
  for (const nodeId of D1_NODE_IDS) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    // Built and mastered, so the practice cards are UNGATED for a reason that has nothing to
    // do with damage — which is what makes "still ungated while ruined" a real claim rather
    // than an accident of a Foundation building.
    await session.advanceMasteryDev(nodeId, 3);
  }
  store.flush();

  // Ruin everything, through the same merge the winter's carry-back uses.
  const saved = store.load();
  if (saved === null) {
    throw new Error("the fixture city did not save");
  }
  store.save(
    snapshotWithWinterDamage(saved, {
      buildings: [...D1_NODE_IDS, TOWN_HALL_ID],
      cells: ["4,0"],
    }),
  );
  store.flush();

  const restored = store.load();
  if (restored === null || restored.crisis_damage === undefined) {
    throw new Error("the fixture damage did not save");
  }
  // The fixture is only worth anything if it really did ruin every placement, so this is a
  // floor under the sweep below rather than a restatement of the line above.
  expect(restored.crisis_damage.ruined_buildings).toHaveLength(RUINABLE_PLACEMENTS.length);
  return withDevPersistence(createCityDevSession(restored), store);
}

function plotButton(nodeId: string): HTMLElement {
  const selector = isTownHall(nodeId)
    ? '[data-testid="town-hall-roster-entry"]'
    : `button.city-plot[data-node-id="${nodeId}"]`;
  const button = document.querySelector<HTMLElement>(selector);
  if (!button) {
    throw new Error(`No roster button for ${nodeId}`);
  }
  return button;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("crisis damage never cuts off access to learning", () => {
  it("sweeps every placement a crisis can ruin, and the population is not a hand-picked one", () => {
    // Floors, because every assertion below is per-node and a sweep over a shortened list
    // would pass by not looking. Era one has six skills plus the hub.
    expect(RUINABLE_PLACEMENTS.length).toBeGreaterThanOrEqual(7);
    expect(D1_NODE_IDS.length).toBeGreaterThanOrEqual(6);
    // Composition, not just size: the skills are what owe the lesson menu, so the population
    // with the exception removed must itself be the whole skill list.
    const owing = RUINABLE_PLACEMENTS.filter((id) => !NEVER_HAS_A_LESSON.includes(id));
    expect([...owing].sort()).toEqual([...D1_NODE_IDS].sort());
    expect(owing.length).toBeGreaterThanOrEqual(6);
    // And the exception list cannot swallow the population.
    expect(NEVER_HAS_A_LESSON).toHaveLength(1);
  });

  it.each(D1_NODE_IDS)(
    "opens %s's lesson menu from its roster row while it is a ruin, with the lesson UNGATED",
    async (nodeId) => {
      const user = userEvent.setup();
      const session = await ruinedCity();
      const onStartLesson = vi.fn();

      render(
        <CitySurface
          enableCanvas={false}
          loadCity={session.load}
          onPlaceSkill={session.placeSkill}
          onMoveSkill={session.moveSkill}
          onStartLesson={onStartLesson}
        />,
      );

      await openBuiltShelf(user);
      const row = plotButton(nodeId);
      // The row is still HERE and still enabled — a ruin is a badge on it, not a removal.
      expect(row.getAttribute("data-ruined")).toBe("true");
      expect(row).toBeEnabled();
      // ...and it still reports the skill's own state, so nothing reads as if the crisis
      // undid the learning.
      expect(row.textContent).toContain("Complete");
      expect(row.textContent).toContain("In ruins");

      await user.click(row);
      const menu = await screen.findByRole("dialog");

      // THE FIRST CARD IS THE LESSON AND IT IS NOT GATED. Read positionally rather than by
      // name, because the label varies with the building's state and the claim is about the
      // card the menu leads with.
      const cards = within(menu).getAllByRole("button", { name: /./ });
      const lessonCard = menu.querySelector<HTMLElement>(".lesson-menu-card");
      expect(cards.length).toBeGreaterThanOrEqual(3);
      if (lessonCard === null) {
        throw new Error("the ruined building's menu has no lesson card");
      }
      expect(lessonCard).toBeEnabled();
      expect(lessonCard.getAttribute("data-disabled")).toBeNull();

      // And the ruin is stated in the menu, so the player knows the building is damaged
      // WITHOUT the damage standing between them and the lesson.
      expect(menu.textContent).toContain("In ruins");

      // Activating it really does step into the lesson, which is the whole point: an enabled
      // button that does nothing would satisfy every assertion above.
      await user.click(lessonCard);
      expect(onStartLesson).toHaveBeenCalledTimes(1);
      expect(onStartLesson.mock.calls[0]?.[0]).toBe(nodeId);
    },
  );

  it("keeps the practice cards ungated on a ruin, so damage is not a second gate", async () => {
    const user = userEvent.setup();
    const session = await ruinedCity();

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onMoveSkill={session.moveSkill}
      />,
    );

    await openBuiltShelf(user);
    await user.click(plotButton("NUM.S"));
    const menu = await screen.findByRole("dialog");

    // Every card, not just the first. The building is Complete and mastered, so the ONLY
    // thing that could gate practice here is the ruin — and `practiceLocked` must still mean
    // "the lesson and CFU are unfinished" and never "this building is damaged".
    const cards = [...menu.querySelectorAll<HTMLButtonElement>(".lesson-menu-card")];
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card, card.textContent ?? "").toBeEnabled();
    }
    expect(menu.querySelector(".advisor-lesson__gate-hint")).toBeNull();
  });

  it("the hub is the ONE declared exception, and it fails both ways", async () => {
    const user = userEvent.setup();
    const session = await ruinedCity();

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onMoveSkill={session.moveSkill}
      />,
    );

    await openBuiltShelf(user);
    // The listed id still exists and is still reachable — an exemption naming something that
    // is no longer there excuses nothing and hides that it excuses nothing.
    const hub = plotButton(TOWN_HALL_ID);
    expect(hub).toBeEnabled();
    await user.click(hub);
    const panel = await screen.findByRole("dialog");

    // It has NOT quietly grown a lesson: this is the island-hub panel, not the lesson menu.
    // If the hub ever gains one, this line fails and the exception must come off the list.
    expect(panel.querySelector(".lesson-menu-card")).toBeNull();
    // ...and it is a real panel rather than nothing at all, so the exemption is not covering
    // for a hub that stopped opening.
    expect(panel.textContent).toContain("skills complete");
  });
});
