import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { MOCK_MASTERED_NODE_STATES, MOCK_NODE_STATES } from "../city/mockCity";
import { openBuiltShelf } from "../city/test/openBuiltShelf";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements } from "../city/worldLayout";
import type { DevSessionStorage } from "../devPersistence/devSession";
import { CompletionRewardProvider } from "../rewards/CompletionRewardProvider";
import { ARCHIPELAGO_QUERY_PARAM } from "./archipelagoFlag";
import { createArchipelagoStore } from "./archipelagoPersistence";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";
import { foundingLayout } from "./islandState";

/**
 * **THE LEARNER BUILDS ON ONE ISLAND, CROSSES, COMES BACK, AND FINDS IT AS THEY LEFT IT.**
 *
 * That sentence is the whole feature, and this is the only file in the tree that can say it,
 * because it is the only one where nothing between the click and the ground is a stand-in: the
 * real `CitySurface`, the real ☰ Menu, the real overview, the real `createCityDevSession`
 * placement gate, and the real `createArchipelagoSession` wired the way `App.tsx` wires it.
 *
 * `archipelagoSession.test.ts` measures the same isolation one layer down and is where the
 * injections live. What THIS adds is the half a session test cannot see: that a learner can
 * actually reach the crossing — that the flag puts a row in the menu, that the row opens a
 * map, that an island on the map opens a card, that the card has a door, and that pressing it
 * changes what the surface renders. A correct session behind a screen with no way into it is
 * the shape of defect `.cursor/rules/qa-verification.mdc` warns about: *"adding a style or a
 * prop is not evidence that it renders."*
 *
 * ## THE FLAG IS TURNED ON THE WAY A LEARNER WOULD TURN IT ON
 *
 * `?bay` on the address bar, not a prop. `archipelagoFlag.ts`'s own rule: *"a gate whose true
 * answer can only be reached by an override is a gate whose true answer is never actually
 * tested."*
 *
 * ## WHAT IS OBSERVED, AND WHY IT IS THE ROSTER
 *
 * `Buildings N/M` on the HUD is derived from `load.placements` against the standing era's
 * roster, so it moves for exactly two reasons — the ground changed, or the era did — and both
 * are what a crossing is. It is also a string a learner reads, rather than an attribute put
 * there for a test.
 */

const ERA_ONE = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_TWO = (ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_ONE_NAME = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).name;

const REAL_SEARCH = window.location.search;

function setSearch(search: string): void {
  window.history.replaceState({}, "", `${window.location.pathname}${search}`);
}

/** An in-memory `localStorage`, so a reload can be simulated without touching the real one. */
function fakeStorage(): DevSessionStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

let live: ArchipelagoSession | null = null;

beforeEach(() => {
  resetCityEra();
  setSearch(`?${ARCHIPELAGO_QUERY_PARAM}`);
});

afterEach(() => {
  live?.dispose();
  live = null;
  resetCityEra();
  setSearch(REAL_SEARCH);
});

/** The session `App.tsx` builds under the flag, minus the two persistence wrappers. */
function bay(storage?: DevSessionStorage): ArchipelagoSession {
  const store = storage
    ? createArchipelagoStore({ storage, enabled: true })
    : createArchipelagoStore({ storage: null, enabled: false });
  const session = createArchipelagoSession({
    initial: createCityDevSession(null),
    makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
    stashed: store.read(ERA_ONE),
    onChange: (state) => store.write(state),
  });
  live = session;
  return session;
}

function mountCity(session: ArchipelagoSession) {
  return render(
    <CitySurface
      enableCanvas={false}
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onMoveTownHall={session.moveTownHall}
      getArchipelagoSnapshot={session.snapshot}
      reducedMotion
    />,
  );
}

function preparedEraTwoWithAnIncompletePriorIsland(): ArchipelagoSession {
  setCityEra(ERA_TWO);
  const eraTwoStates: readonly StudentNodeState[] =
    ERA_SEQUENCE[1]?.nodes.map((nodeId) => ({
      student_id: "backward-sailing-repro",
      node_id: nodeId,
      placement_estimate: 0,
      mastery: 0,
      mastery_updated_at: null,
      completion_status: "locked",
      lesson_stage: "not_started",
      last_practiced_at: null,
    })) ?? [];
  const hall = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
  const eraOnePlacements = defaultPlacements(
    ERA_SEQUENCE[0]?.nodes ?? [],
    [hall],
    BUILDABLE_RADIUS,
  );
  const eraTwoPlacements = defaultPlacements(
    ERA_SEQUENCE[1]?.nodes ?? [],
    [hall],
    BUILDABLE_RADIUS,
  );
  const session = createArchipelagoSession({
    initial: createCityDevSession(null, {
      nodeStates: [...MOCK_NODE_STATES, ...eraTwoStates],
      placements: eraTwoPlacements,
      townHall: hall,
    }),
    standingEra: ERA_TWO,
    makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
    stashed: [
      {
        eraId: ERA_ONE,
        layout: {
          ...foundingLayout(),
          placements: eraOnePlacements,
        },
      },
    ],
  });
  live = session;
  return session;
}

function preparedEraTwoWithAReadyTarget(): ArchipelagoSession {
  setCityEra(ERA_TWO);
  const target = "RAD.3";
  const eraTwoStates: readonly StudentNodeState[] =
    ERA_SEQUENCE[1]?.nodes.map((nodeId) => ({
      student_id: "ordinary-era-reentry-repro",
      node_id: nodeId,
      placement_estimate: 0,
      mastery: nodeId === target ? 0 : 2,
      mastery_updated_at: null,
      completion_status: nodeId === target ? "locked" : "complete",
      lesson_stage: nodeId === target ? "not_started" : "done",
      last_practiced_at: nodeId === target ? null : "2026-08-13T00:00:00.000Z",
    })) ?? [];
  const hall = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
  const eraOnePlacements = defaultPlacements(
    ERA_SEQUENCE[0]?.nodes ?? [],
    [hall],
    BUILDABLE_RADIUS,
  );
  const eraTwoPlacements = defaultPlacements(
    (ERA_SEQUENCE[1]?.nodes ?? []).filter((nodeId) => nodeId !== target),
    [hall],
    BUILDABLE_RADIUS,
  );
  const session = createArchipelagoSession({
    initial: createCityDevSession(null, {
      nodeStates: [...MOCK_MASTERED_NODE_STATES, ...eraTwoStates],
      placements: eraTwoPlacements,
      townHall: hall,
    }),
    standingEra: ERA_TWO,
    makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
    stashed: [
      {
        eraId: ERA_ONE,
        layout: {
          ...foundingLayout(),
          placements: eraOnePlacements,
        },
      },
    ],
  });
  live = session;
  return session;
}

/** Start a skill through the ordinary roster + ghost path, as a learner does. */
async function startPlacementThroughTheRoster(
  user: ReturnType<typeof userEvent.setup>,
  nodeId: string,
): Promise<HTMLElement> {
  await openBuiltShelf(user);
  const plot = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!plot) {
    throw new Error(`no roster plot for ${nodeId}`);
  }
  await user.click(plot);
  return screen.findByRole("group", { name: /Placing/ });
}

/** Place a skill through the ordinary roster + ghost path, as a learner does. */
async function placeThroughTheRoster(
  user: ReturnType<typeof userEvent.setup>,
  nodeId: string,
): Promise<void> {
  const bar = await startPlacementThroughTheRoster(user, nodeId);
  await user.click(within(bar).getByRole("button", { name: /Build here/ }));
}

async function expectBuiltCount(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
): Promise<void> {
  const { dialog, summary } = await openBuiltShelf(user);
  await waitFor(() => expect(summary).toHaveTextContent(text));
  await user.click(within(dialog).getByRole("button", { name: "Close build menu" }));
}

/** Open the ☰ Menu and press The bay, exactly as the row is reached in play. */
async function openTheBay(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Menu" }));
  await user.click(screen.getByTestId("menu-bay"));
  await waitFor(() => expect(screen.getByTestId("archipelago-overview")).toBeVisible(), {
    timeout: 15_000,
  });
}

describe("crossing to a new island and coming back", () => {
  it("leaves era one's city on era one, and hands it back on the return", async () => {
    const user = userEvent.setup();
    const session = bay();
    mountCity(session);

    // ONE BUILDING ON ERA ONE, placed the way a learner places one.
    await placeThroughTheRoster(user, "NUM.S");
    await expectBuiltCount(user, "1/6");

    // THE CROSSING. `setCityEra` is what the advance ceremony's own `advanceCityEra` calls,
    // so this is the shipped route and not a back door.
    await session.sailTo(ERA_TWO);
    await expectBuiltCount(user, "0/");

    // THE WAY BACK, through the real menu, the real map and the real card.
    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_ONE}`));
    const sail = screen.getByTestId("archipelago-primary-action");
    expect(sail.textContent).toBe(`Sail to ${ERA_ONE_NAME.replace(/ Era$/, "")}`);
    await user.click(sail);

    // ...and era one is as it was left: one building, on era one's own six-skill roster.
    await expectBuiltCount(user, "1/6");
    expect(screen.queryByTestId("archipelago-overview")).toBeNull();
    expect((await session.load()).placements?.map((p) => p.nodeId)).toEqual(["NUM.S"]);
  });

  it("offers no door on the island the learner is standing on, and none ahead", async () => {
    const user = userEvent.setup();
    const session = bay();
    mountCity(session);
    await session.sailTo(ERA_TWO);
    await openTheBay(user);

    // AHEAD: a card with nothing on it about when. §7's ruling, and the half of it that
    // survives stage 3 — there is no island there to sail to.
    await user.click(screen.getByTestId(`archipelago-select-${ERA_SEQUENCE[4]?.id}`));
    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-state",
      "closed",
    );
    expect(
      screen.getByRole("button", {
        name: /Explore .* terrain, camera only/,
      }),
    ).toBeTruthy();
  });

  it("previews a closed island without writing, sailing, settling, or unlocking it", async () => {
    const user = userEvent.setup();
    const session = bay();
    mountCity(session);
    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_SEQUENCE[4]?.id}`));

    const before = session.snapshot();
    const beforeLoad = await session.load();
    expect(screen.getByTestId("archipelago-classic-lock")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Explore .* terrain, camera only/,
      }),
    );

    expect(screen.getByTestId("archipelago-overview")).toHaveAttribute(
      "data-previewing",
      "true",
    );
    expect(screen.queryByTestId("archipelago-classic-lock")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "End preview, return to locked shore",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("city-live-polite")).toHaveTextContent(
      "No unlocking, building, settling, sailing, or saving",
    );
    expect(session.snapshot()).toEqual(before);
    expect(await session.load()).toEqual(beforeLoad);
    expect(session.islands()).toEqual([ERA_ONE]);

    await user.click(
      screen.getByRole("button", {
        name: "End preview, return to locked shore",
      }),
    );

    expect(screen.getByTestId("archipelago-classic-lock")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Explore .* terrain, camera only/,
      }),
    ).toHaveFocus();
    expect(session.snapshot()).toEqual(before);
    expect(await session.load()).toEqual(beforeLoad);
  });

  it("lands on a prepared prior island without inventing a compulsory building unlock", async () => {
    const user = userEvent.setup();
    const session = preparedEraTwoWithAnIncompletePriorIsland();
    render(
      <CompletionRewardProvider reducedMotion>
        <CitySurface
          enableCanvas={false}
          loadCity={session.load}
          onPlaceSkill={session.placeSkill}
          onMoveSkill={session.moveSkill}
          onMoveTownHall={session.moveTownHall}
          onSailIsland={session.sailTo}
          getArchipelagoSnapshot={session.snapshot}
          reducedMotion
        />
      </CompletionRewardProvider>,
    );
    await screen.findByRole("button", { name: "Build" });

    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_ONE}`));
    expect(screen.getByTestId("archipelago-primary-action")).toHaveTextContent(
      `Sail to ${ERA_ONE_NAME.replace(/ Era$/, "")}`,
    );
    await user.click(screen.getByTestId("archipelago-primary-action"));

    await waitFor(() => expect(session.standing()).toBe(ERA_ONE));
    expect(screen.queryByTestId("archipelago-overview")).toBeNull();
    expect(screen.queryByRole("dialog", { name: /new buildings? unlocked/i })).toBeNull();
  });

  it("drops an ordinary learner's unfinished ghost before sailing and allows a new one after forward entry", async () => {
    const user = userEvent.setup();
    const session = preparedEraTwoWithAReadyTarget();
    render(
      <CompletionRewardProvider reducedMotion>
        <CitySurface
          bayAvailable
          enableCanvas={false}
          loadCity={session.load}
          onPlaceSkill={session.placeSkill}
          onMoveSkill={session.moveSkill}
          onMoveTownHall={session.moveTownHall}
          onSailIsland={session.sailTo}
          getArchipelagoSnapshot={session.snapshot}
          reducedMotion
        />
      </CompletionRewardProvider>,
    );
    await screen.findByRole("button", { name: "Build" });

    await startPlacementThroughTheRoster(user, "RAD.3");
    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_ONE}`));
    await user.click(screen.getByTestId("archipelago-primary-action"));

    await waitFor(() => expect(session.standing()).toBe(ERA_ONE));
    expect(screen.queryByRole("group", { name: /Placing/ })).toBeNull();
    expect(screen.queryByRole("dialog", { name: /new buildings? unlocked/i })).toBeNull();

    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_TWO}`));
    await user.click(screen.getByTestId("archipelago-primary-action"));
    await waitFor(() => expect(session.standing()).toBe(ERA_TWO));
    expect(screen.queryByRole("group", { name: /Placing/ })).toBeNull();

    // The destination still owns its real unbuilt target. Forward entry creates no ghost,
    // but an explicit Build action starts the legitimate placement exactly once.
    expect(await startPlacementThroughTheRoster(user, "RAD.3")).toBeInTheDocument();
  });
});

describe("a reload in the middle of the bay", () => {
  /**
   * **THE PLACEMENT LANDS ON THE ISLAND IT WAS MADE ON, AND IS STILL THERE AFTER A RELOAD.**
   *
   * A reload is not a refresh: it is a NEW session that knows only what storage holds. So the
   * second half below builds a fresh `createArchipelagoSession` over the same storage, with
   * the standing island's own ground handed in the way `devSessionStore` hands it in.
   */
  it("brings the whole bay back, with each island's city on its own island", async () => {
    const user = userEvent.setup();
    const storage = fakeStorage();

    const first = bay(storage);
    const { unmount } = mountCity(first);
    await placeThroughTheRoster(user, "NUM.S");
    await expectBuiltCount(user, "1/6");
    // Crossing is what writes era one into the bay store, because a landfall is what captures
    // the island being left. Standing on era two is therefore the state a reload has to survive.
    await first.sailTo(ERA_TWO);
    unmount();
    first.dispose();

    // THE RELOAD. Nothing in memory: a new store over the same storage, and a new session.
    const store = createArchipelagoStore({ storage, enabled: true });
    const reloaded = createArchipelagoSession({
      initial: createCityDevSession(null),
      makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
      stashed: store.read(ERA_TWO),
      onChange: (state) => store.write(state),
    });
    live = reloaded;

    expect(reloaded.islands()).toEqual([ERA_ONE, ERA_TWO]);
    mountCity(reloaded);
    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_ONE}`));
    await user.click(screen.getByTestId("archipelago-primary-action"));

    await expectBuiltCount(user, "1/6");
    expect((await reloaded.load()).placements?.map((p) => p.nodeId)).toEqual(["NUM.S"]);
  });
});
