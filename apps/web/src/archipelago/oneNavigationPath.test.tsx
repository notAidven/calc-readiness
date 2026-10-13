import { ERA_SEQUENCE } from "@cr/skill-graph";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { openBuiltShelf } from "../city/test/openBuiltShelf";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { cityEraId, resetCityEra } from "../city/useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements, type Transform } from "../city/worldLayout";
import { ARCHIPELAGO_QUERY_PARAM } from "./archipelagoFlag";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";

/**
 * **EVERY WAY OF MOVING BETWEEN ISLANDS GOES THROUGH ONE COMMAND.**
 *
 * This guard exists because of a defect measured one lane over. #660: *"the ceremony's lens lets
 * go for the camera buttons too"* — the pointer path released the camera lens and the toolbar path
 * did not, so the same intent produced two different states depending on which control expressed
 * it. That is not a camera bug, it is a **two-paths** bug, and navigation between islands has
 * exactly the same shape: a press on a card, a keyboard activation, and anything a toolbar adds
 * later are three ways to say *"take me to era N"*.
 *
 * So the property asserted here is not *"navigation works"* — `archipelagoRevisit.test.tsx`
 * already has that. It is that **there is one command and every entry point is it**, in two
 * halves:
 *
 *  1. **Behaviourally**: the pointer path and the keyboard path are driven separately through the
 *     real surface and asserted to reach the same state — the same standing era AND the same
 *     ground. A second implementation that got one of those right and not the other fails here.
 *  2. **Structurally**: the sources are swept for writers of the era store, which is the command.
 *     A second navigation mechanism is a second writer, and it fails the sweep the day it is
 *     added rather than the day somebody notices the two disagree.
 *
 * The structural half is the one that survives; the behavioural half is what makes it mean
 * something.
 */

const ERA_ONE = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_TWO = (ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number]).id;

const SEATS: ReadonlyMap<string, Transform> = new Map(
  defaultPlacements(
    ["NUM.S"],
    [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
    BUILDABLE_RADIUS,
  ).map((t) => [t.nodeId, { col: t.col, row: t.row, rot: t.rot }] as const),
);

const REAL_SEARCH = window.location.search;
let live: ArchipelagoSession | null = null;

function setSearch(search: string): void {
  window.history.replaceState({}, "", `${window.location.pathname}${search}`);
}

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

async function cityOnEraTwoWithACityBehind(): Promise<ArchipelagoSession> {
  const session = createArchipelagoSession({
    initial: createCityDevSession(null),
    makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
  });
  live = session;
  await session.placeSkill("NUM.S", SEATS.get("NUM.S") as Transform);
  await session.sailTo(ERA_TWO);
  render(
    <CitySurface
      enableCanvas={false}
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      getArchipelagoSnapshot={session.snapshot}
      reducedMotion
    />,
  );
  await screen.findByRole("button", { name: "Build" });
  return session;
}

/** Open the ☰ Menu and press The bay, as a learner does. */
async function openTheBay(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Menu" }));
  await user.click(screen.getByTestId("menu-bay"));
  await screen.findByTestId("archipelago-overview");
}

/** Where the surface says the learner is, as one comparable value. */
async function standing(session: ArchipelagoSession): Promise<string> {
  const load = await session.load();
  return JSON.stringify({
    era: cityEraId(),
    standing: session.standing(),
    placements: load.placements ?? [],
    hall: load.town_hall ?? null,
  });
}

async function expectEraOneBuiltCount(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const { dialog, summary } = await openBuiltShelf(user);
  await waitFor(() => expect(summary).toHaveTextContent("1/6"));
  await user.click(within(dialog).getByRole("button", { name: "Close build menu" }));
}

describe("the pointer path and the keyboard path are one command", () => {
  it("reaches the same island, and the same ground, whichever way the press is made", async () => {
    /* ---- POINTER ---- */
    const user = userEvent.setup();
    const byPointer = await cityOnEraTwoWithACityBehind();
    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_ONE}`));
    await user.click(screen.getByTestId("archipelago-primary-action"));
    await expectEraOneBuiltCount(user);
    const afterPointer = await standing(byPointer);
    byPointer.dispose();
    live = null;
    screen.getByRole("button", { name: "Build" }).ownerDocument.body.innerHTML = "";
    resetCityEra();

    /* ---- KEYBOARD ---- */
    // Not `user.click`: the island's control is focused and activated with Enter, which is the
    // path a learner who never touches a pointer takes. `keyboard("{Enter}")` on a focused
    // <button> is a real activation, so this exercises the same handler through the browser's own
    // keyboard semantics rather than through a synthesised click.
    const byKeyboard = await cityOnEraTwoWithACityBehind();
    await openTheBay(user);
    const island = screen.getByTestId(`archipelago-select-${ERA_ONE}`);
    island.focus();
    expect(document.activeElement).toBe(island);
    await user.keyboard("{Enter}");
    const sail = screen.getByTestId("archipelago-primary-action");
    sail.focus();
    expect(document.activeElement).toBe(sail);
    await user.keyboard("{Enter}");
    await expectEraOneBuiltCount(user);
    const afterKeyboard = await standing(byKeyboard);

    // THE TWO PATHS LAND ON THE SAME STATE, compared as one value rather than field by field.
    expect(afterKeyboard).toBe(afterPointer);
    expect(byKeyboard.standing()).toBe(ERA_ONE);
    expect(cityEraId()).toBe(ERA_ONE);
  }, 60_000);

  it("closes the bay on Escape from a selection without moving the learner", async () => {
    const user = userEvent.setup();
    const session = await cityOnEraTwoWithACityBehind();
    await openTheBay(user);
    await user.click(screen.getByTestId(`archipelago-select-${ERA_ONE}`));
    fireEvent.keyDown(screen.getByTestId("archipelago-overview"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("archipelago-overview")).toBeNull());
    expect(session.standing()).toBe(ERA_TWO);
    expect(cityEraId()).toBe(ERA_TWO);
  }, 60_000);
});

describe("there is one writer of the command, and the sweep says who", () => {
  /**
   * **THE STRUCTURAL HALF — a second navigation mechanism fails the day it is added.**
   *
   * The command is `setCityEra` (and `advanceCityEra`, which calls it): `archipelagoSession.ts`
   * subscribes to that store and swaps the ground, which is what lets the advance ceremony, the
   * catch-up landing, the bay and the dev era control all land through one mechanism.
   *
   * So the population is *"every non-test source under `apps/web/src` that writes the era
   * store"*, derived from the sources, floored, and asserted as a SET — because a floor
   * constrains size and not shape, and the claim here is composition: these files and no others.
   *
   * A LEGITIMATE-EXCEPTION LIST IN BOTH DIRECTIONS is what makes this provable rather than
   * assumed. Each writer is named with the reason it is allowed to be one; a writer that
   * disappears fails, and a new writer fails.
   */
  const ALLOWED_WRITERS: Readonly<Record<string, string>> = {
    "city/useCityEra.ts":
      "the store itself: setCityEra, advanceCityEra and resetCityEra live here",
    "city/CitySurface.tsx":
      "the explicit Sail choice and the bay's sailToIsland, both of which are this one command",
    "archipelago/archipelagoSession.ts":
      "sailTo, which is a thin call over the store so every explicit voyage is one event downstream",
    "App.tsx": "the ?era= boot hatch, written once at mount",
  };

  it("has exactly the writers it names, and no others", () => {
    const sources = import.meta.glob("../**/*.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    /**
     * Vite hands a SIBLING back as `./name.ts` and everything else as `../dir/name.ts`, so both
     * forms are normalised to a path from `apps/web/src/`. Without this the archipelago's own
     * files read as a different module than the list names them, and the set equality below fails
     * for a reason that has nothing to do with what it is measuring.
     */
    const fromSrc = (path: string): string =>
      path.startsWith("./") ? `archipelago/${path.slice(2)}` : path.replace(/^\.\.\//, "");

    const writers = new Set<string>();
    let scanned = 0;
    for (const [path, source] of Object.entries(sources)) {
      const file = fromSrc(path);
      if (/\.test\.tsx?$/.test(file)) {
        continue;
      }
      scanned += 1;
      // A CALL, not a mention: `setCityEra(` / `advanceCityEra(` with an open paren, so the
      // dozen files that discuss the store in prose are not handed to this guard as writers.
      if (/\b(setCityEra|advanceCityEra)\s*\(/.test(source)) {
        writers.add(file);
      }
    }

    // FLOORS, so neither half can hold over an empty sweep.
    expect(scanned).toBeGreaterThanOrEqual(400);
    expect(writers.size).toBeGreaterThanOrEqual(4);

    // COMPOSITION, both directions at once: a new writer is in `writers` and not in the list, and
    // a writer that stopped writing is in the list and not in `writers`. Set equality fails on
    // either, and names which.
    expect([...writers].sort()).toEqual(Object.keys(ALLOWED_WRITERS).sort());

    // ...and every exemption still describes a real file, so a renamed module cannot sit in the
    // list forever excusing nothing.
    const shipped = new Set(Object.keys(sources).map(fromSrc));
    for (const [file, reason] of Object.entries(ALLOWED_WRITERS)) {
      expect(shipped.has(file), `${file} is a named writer that no longer exists`).toBe(
        true,
      );
      expect(reason.length, file).toBeGreaterThan(20);
    }
  });
});
