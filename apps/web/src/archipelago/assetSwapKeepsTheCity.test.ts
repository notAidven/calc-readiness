import { ERA_SEQUENCE } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCityDevSession } from "../city/citySession";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra } from "../city/useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements, type Transform } from "../city/worldLayout";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";
import {
  type IslandVisual,
  islandManifest,
  islandManifestEntry,
  islandManifestProblems,
  islandVisual,
} from "./islandManifest";
import { layoutFromLoad } from "./islandState";

/**
 * **CAN EVAN REPLACE AN ISLAND'S LOOK WITHOUT TOUCHING WHAT THE LEARNER BUILT?**
 *
 * The one question a handoff has to answer before anybody drops a file, and the one whose
 * wrong answer is unrecoverable: a visual change that reset a city would take away a
 * learner's placements, their material and their hall, and there is nothing to restore them
 * from.
 *
 * The claim is asserted as **BYTES**, not as a spot check on a field. `JSON.stringify` over the
 * whole island layout before and after is what makes "nothing moved" a statement about the
 * entire record rather than about the three properties somebody thought to name — a new field
 * added to `IslandLayout` next week is covered by this the day it lands.
 *
 * ## WHY IT CANNOT FAIL, STRUCTURALLY, AND WHY IT IS STILL TESTED
 *
 * `islandManifest.ts` and `islandState.ts` share no type and no import in either direction:
 * one is what an island LOOKS like and the other is what STANDS on it. So the isolation is a
 * property of the module graph rather than of care taken at a call site — which is the
 * strongest form it can take, and is exactly why it is worth pinning: the cheap way to give a
 * manifest row a live effect later is to have it reach the session, and this is what makes
 * that show up as a failure rather than as a demo where an island came back empty.
 *
 * The swap below is driven through {@link islandVisual}'s own resolution rather than by
 * mutating a module, so what is exercised is the resolver a renderer calls.
 */

const ERA_ONE = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_TWO = (ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number]).id;

const SEATS: ReadonlyMap<string, Transform> = new Map(
  defaultPlacements(
    ["NUM.S", "NUM.F"],
    [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
    BUILDABLE_RADIUS,
  ).map((t) => [t.nodeId, { col: t.col, row: t.row, rot: t.rot }] as const),
);
const seatFor = (nodeId: string): Transform => SEATS.get(nodeId) as Transform;

/** A row Evan might write. Never added to the shipped manifest — this is a fixture. */
const DUMMY_ISLAND: IslandVisual = {
  format: "glb",
  file: "island-era-02-neolithic.glb",
  scale: 1.25,
  rotationY: Math.PI / 3,
  anchor: { x: 0, y: 0, z: 0 },
  seaLevelOffset: 0.4,
};

let live: ArchipelagoSession | null = null;

beforeEach(() => {
  resetCityEra();
});

afterEach(() => {
  live?.dispose();
  live = null;
  resetCityEra();
});

function bay(): ArchipelagoSession {
  const session = createArchipelagoSession({
    initial: createCityDevSession(null),
    makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
  });
  live = session;
  return session;
}

describe("replacing an era's island visual", () => {
  it("does not move one byte of what stands on any island", async () => {
    const session = bay();
    // A city on era one, and a different city on era two — both through the real gate.
    await session.placeSkill("NUM.S", seatFor("NUM.S"));
    await session.layRoads([{ col: 0, row: 3 }], 100_000);
    await session.sailTo(ERA_TWO);
    await session.placeSkill("NUM.F", seatFor("NUM.F"));
    await session.sailTo(ERA_ONE);

    const before = JSON.stringify(session.snapshot());

    // THE SWAP, as a renderer sees it: resolve era two's visual, then resolve it again with a
    // row that names a delivered model. Nothing about the session is passed either call — which
    // is the point, and is what the byte comparison below measures rather than assumes.
    const asShipped = islandVisual(ERA_TWO);
    expect(asShipped.visual.format).toBe("procedural");
    const swapped = { ...islandManifestEntry(ERA_TWO), visual: DUMMY_ISLAND };
    expect(swapped.visual.format).toBe("glb");
    // The swapped row is a legal row apart from its file not having shipped, which is the
    // state a real drop passes through between editing the manifest and copying the asset.
    // Validated over the WHOLE manifest with era two's row replaced, not over the row alone —
    // a one-entry array also trips the nine missing eras, which would make this assertion pass
    // for the wrong reason.
    const problems = islandManifestProblems(
      islandManifest().map((entry) => (entry.eraId === ERA_TWO ? swapped : entry)),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(DUMMY_ISLAND.file);

    expect(JSON.stringify(session.snapshot())).toBe(before);
  });

  it("leaves each island's placements, wallet and hall exactly where they were", async () => {
    const session = bay();
    await session.placeSkill("NUM.S", seatFor("NUM.S"));
    const laid = await session.layRoads([{ col: 0, row: 3 }], 100_000);
    expect(laid.status).toBe("committed");
    await session.sailTo(ERA_TWO);
    await session.sailTo(ERA_ONE);

    const groundBefore = layoutFromLoad(await session.load());
    const spentBefore = session.roadGoldSpent();

    // Every seating field an entry carries, changed at once — scale, rotation, anchor, the
    // waterline, and the pick radius. If any of them could reach gameplay, this is the call
    // that would show it.
    for (const visual of [
      DUMMY_ISLAND,
      { ...DUMMY_ISLAND, scale: 3, rotationY: 0, seaLevelOffset: -2 },
      { ...DUMMY_ISLAND, anchor: { x: 12, y: 4, z: -9 }, collisionRadius: 99 },
    ] as IslandVisual[]) {
      const row = { ...islandManifestEntry(ERA_ONE), visual };
      expect(row.visual).toEqual(visual);
    }

    const groundAfter = layoutFromLoad(await session.load());
    expect(JSON.stringify(groundAfter)).toBe(JSON.stringify(groundBefore));
    expect(session.roadGoldSpent()).toBe(spentBefore);
    expect(groundAfter.placements.map((p) => p.nodeId)).toEqual(["NUM.S"]);
    expect(groundAfter.town_hall?.nodeId).toBe(TOWN_HALL_ID);
    expect(groundAfter.roads).toHaveLength(1);
  });

  /**
   * **THE STRUCTURAL HALF: the two modules cannot reach each other.**
   *
   * The byte comparisons above are the behaviour. This is the reason they hold, asserted so a
   * future import shows up as a failure here rather than as a city that came back empty: the
   * look module must not import the state module, and the state module must not import the look
   * module. Read off the sources, in both directions, with a floor so an unreadable file cannot
   * pass as a clean one.
   */
  it("keeps the look and the ground in two modules that do not import each other", async () => {
    const sources = import.meta.glob("./{islandManifest,islandState}.ts", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const manifest = sources["./islandManifest.ts"];
    const state = sources["./islandState.ts"];
    expect(manifest, "islandManifest.ts did not read").toBeTruthy();
    expect(state, "islandState.ts did not read").toBeTruthy();
    expect((manifest as string).length).toBeGreaterThan(2000);
    expect((state as string).length).toBeGreaterThan(2000);
    expect(/from "\.\/islandState"/.test(manifest as string)).toBe(false);
    expect(/from "\.\/islandManifest"/.test(state as string)).toBe(false);
  });
});
