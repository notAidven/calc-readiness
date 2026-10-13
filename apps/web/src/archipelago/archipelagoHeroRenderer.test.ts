import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  hasAuthoredEraTownHall,
  resolveEraTownHall,
  TOWN_HALL_CENTER_TRANSFORM,
  TOWN_HALL_ID,
} from "../city/townHall";
import {
  type ArchipelagoHeroMode,
  archipelagoHeroSceneInput,
} from "./ArchipelagoHeroRenderer";
import type { IslandLayout } from "./islandState";

const NODE = getEraOrThrow("prehistoric").nodes[0] as string;
const STATES: readonly StudentNodeState[] = [
  {
    student_id: "hero-renderer-test",
    node_id: NODE,
    placement_estimate: 0,
    mastery: 2,
    mastery_updated_at: null,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: "2026-08-06T00:00:00.000Z",
  },
];
const LAYOUT: IslandLayout = {
  placements: [{ nodeId: NODE, col: 4, row: 3, rot: 1 }],
  roads: [{ col: 1, row: 2 }],
  road_gold_spent: 1,
  town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
  civic: [],
  civic_material_spent: 0,
  crisis_damage: NO_CRISIS_DAMAGE,
};

describe("one actual city renderer receives state appropriate to the selected product mode", () => {
  it("keeps durable/diagnostic Halls while every future island remains terrain-only", () => {
    const modes: readonly ArchipelagoHeroMode[] = [
      "standing",
      "prior",
      "future",
      "diagnostic",
    ];
    expect(modes).toHaveLength(4);

    for (const mode of modes) {
      const scene = archipelagoHeroSceneInput({
        eraId: "prehistoric",
        nodeStates: STATES,
        islandLayout: LAYOUT,
        mode,
      });
      if (mode === "standing" || mode === "prior") {
        expect(scene.placed, mode).toHaveLength(1);
        expect(scene.roads, mode).toEqual(LAYOUT.roads);
        expect(scene.townHall, mode).not.toBeNull();
        expect(scene.citizens, mode).not.toBeNull();
      } else if (mode === "diagnostic") {
        expect(scene.placed, mode).toEqual([]);
        expect(scene.roads, mode).toEqual([]);
        expect(scene.townHall, mode).not.toBeNull();
        expect(scene.townHall, mode).toMatchObject(TOWN_HALL_CENTER_TRANSFORM);
        expect(scene.townHall?.model?.node_id, mode).toBe(TOWN_HALL_ID);
        expect(scene.townHall?.landmark, mode).toBe(true);
        expect(scene.citizens, mode).toBeNull();
      } else {
        expect(scene.placed, mode).toEqual([]);
        expect(scene.roads, mode).toEqual([]);
        expect(scene.townHall, mode).toBeNull();
        expect(scene.citizens, mode).toBeNull();
      }
    }
  });

  it("censuses locked and unlocked Hall behavior across every authored era", () => {
    let lockedScenes = 0;
    let unlockedHallScenes = 0;
    for (const era of ERA_SEQUENCE) {
      const locked = archipelagoHeroSceneInput({
        eraId: era.id,
        nodeStates: STATES,
        islandLayout: LAYOUT,
        mode: "future",
      });
      const unlocked = archipelagoHeroSceneInput({
        eraId: era.id,
        nodeStates: STATES,
        islandLayout: LAYOUT,
        mode: "standing",
      });
      expect.soft(locked.townHall, `${era.id} locked Hall`).toBeNull();
      expect(locked.placed, `${era.id} locked buildings`).toEqual([]);
      expect(locked.roads, `${era.id} locked roads`).toEqual([]);
      lockedScenes += 1;
      if (unlocked.townHall !== null) {
        unlockedHallScenes += 1;
      }
    }
    expect(lockedScenes, "locked future-scene population floor").toBeGreaterThanOrEqual(10);
    expect(
      unlockedHallScenes,
      "unlocked Hall-scene population floor",
    ).toBeGreaterThanOrEqual(10);
  });

  it("shows no hall before founding and the real era hall at the ceremony endpoint", () => {
    const before = archipelagoHeroSceneInput({
      eraId: "neolithic",
      nodeStates: STATES,
      islandLayout: null,
      mode: "ceremony",
      unlockFoundingStage: null,
    });
    const founded = archipelagoHeroSceneInput({
      eraId: "neolithic",
      nodeStates: STATES,
      islandLayout: null,
      mode: "ceremony",
      unlockFoundingStage: "built",
    });

    expect(before.placed).toEqual([]);
    expect(before.roads).toEqual([]);
    expect(before.townHall).toBeNull();
    expect(founded.townHall?.model?.node_id).toBe(TOWN_HALL_ID);
    expect(founded.placed).toEqual([]);
  });

  it("keeps the explicit fallback landmark only on diagnostic-cleared ground", () => {
    expect(hasAuthoredEraTownHall("renaissance")).toBe(false);
    const fallback = resolveEraTownHall("renaissance", "prehistoric");
    expect(fallback.art).toBe("unauthored");

    const locked = archipelagoHeroSceneInput({
      eraId: "renaissance",
      nodeStates: STATES,
      islandLayout: LAYOUT,
      mode: "future",
    });
    const diagnostic = archipelagoHeroSceneInput({
      eraId: "renaissance",
      nodeStates: STATES,
      islandLayout: LAYOUT,
      mode: "diagnostic",
    });
    expect(locked.townHall).toBeNull();
    expect(diagnostic.townHall).toMatchObject(TOWN_HALL_CENTER_TRANSFORM);
    expect(diagnostic.townHall?.model?.url).toBe(fallback.model?.url);
    expect(diagnostic.townHall?.landmark).toBe(true);
    for (const scene of [locked, diagnostic]) {
      expect(scene.placed).toEqual([]);
      expect(scene.roads).toEqual([]);
      expect(scene.citizens).toBeNull();
    }
  });
});

describe("the carousel production path has no substitute-island or permanent crossing renderer", () => {
  it("keeps the forbidden directions out of every source that implements the live carousel", () => {
    const sources = import.meta.glob(
      [
        "./ArchipelagoOverview.tsx",
        "./ArchipelagoHeroRenderer.tsx",
        "./archipelagoCarouselView.ts",
      ],
      { query: "?raw", import: "default", eager: true },
    ) as Record<string, string>;
    expect(Object.keys(sources)).toHaveLength(3);

    const forbidden = [
      /PlaceholderIslandArt/,
      /\bthumbnail\b/i,
      /\bgeneric\s+island\b/i,
      /\bbridge\b/i,
      /\bcauseway\b/i,
      /#6f9e90/i,
    ];
    for (const [path, source] of Object.entries(sources)) {
      for (const pattern of forbidden) {
        expect(pattern.test(source), `${path} contains ${pattern}`).toBe(false);
      }
    }
  });

  it("mounts no permanent crossing geometry in the city scene", () => {
    const sources = import.meta.glob("../city/three/CityScene.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    expect(Object.keys(sources)).toHaveLength(1);
    expect(Object.values(sources)[0]).not.toMatch(/<Causeway\b/);
  });
});
