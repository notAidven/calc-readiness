import {
  type CitizenNodeInput,
  deriveCitizenRoster,
  FOUNDING_POPULATION,
  MAX_RENDERED_CITIZENS,
  WALK_SPEED_UNITS_PER_SEC,
} from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "../worldLayout";
import { buildCitizenRig, type CitizenRig, poseCitizens } from "./Citizens";
import { citizenPlaces } from "./citizenPlaces";
import { CITIZEN_DWELLING_FRACTION, DWELLINGS_RENDERED_HEIGHT } from "./personFigure";

/**
 * The instanced crowd (Tasks 4.2 and 5.2 of the citizens implementation plan).
 *
 * EVERY ASSERTION HERE CARRIES A COUNT FLOOR, and that is not ceremony. "Two instanced
 * meshes", "no citizen casts a shadow" and "the walk is not faster than the tuned
 * speed" are all satisfied by a scene containing nobody — an empty rig has two empty
 * meshes, zero shadow casters and zero motion — so a crowd that silently rendered
 * nothing would pass the whole file. The floors are read off the engine's own roster
 * rather than written down, so a retune of `citizens-tuning.ts` moves them with it.
 *
 * Tested in node against real `three`, with no GPU: `THREE.InstancedMesh` is plain
 * JavaScript over a typed-array matrix buffer, so the transforms are readable straight
 * out of `instanceMatrix.array`. That is the same trick `Roads.test.ts` uses.
 */

const SEED = 0x5eed;
const HUB = TOWN_HALL_CENTER_TRANSFORM;
const HUB_PLACEMENT: PlacedTransform = { ...HUB, nodeId: TOWN_HALL_ID };

/** The mastery accent, reserved: `masteryVisuals.ts` and `palette.ts` both own it. */
const RESERVED_GOLD = 0xffb703;

/**
 * Two more MEASURED era-one heights, from the same section 6 the citizen scale is
 * derived against: the Round House is *"the tallest roofed building"* at 4.821u and the
 * Lookout *"renders 9.769u against the Round House's 4.821u"*. Kept here rather than in
 * the source because only the guard needs them — the source needs one anchor, not three.
 */
const ROUND_HOUSE_RENDERED_HEIGHT = 4.821;
const LOOKOUT_RENDERED_HEIGHT = 9.769;

/** The six era-one skill nodes, in registry order. */
const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;

const ROLES: Readonly<Record<string, CitizenNodeInput["citizen_role"]>> = {
  "NUM.2": "residence",
  "NUM.3": "school",
};

function masteredNode(nodeId: string): CitizenNodeInput {
  return {
    node_id: nodeId,
    citizen_role: ROLES[nodeId] ?? "civic",
    placed: true,
    mastery: 2,
    lesson_stage: "done",
    placement_estimate: 0,
  };
}

/**
 * The `(x, y, z)` translation of one instance, read out of the flat 16-float matrix
 * buffer (column-major, so the translation is elements 12..14).
 */
function instanceTranslation(
  mesh: { instanceMatrix: { array: ArrayLike<number> } },
  index: number,
): [number, number, number] {
  const at = index * 16;
  return [
    mesh.instanceMatrix.array[at + 12] ?? 0,
    mesh.instanceMatrix.array[at + 13] ?? 0,
    mesh.instanceMatrix.array[at + 14] ?? 0,
  ];
}

function rigFor(
  nodes: readonly CitizenNodeInput[],
  placements: readonly PlacedTransform[] = [],
) {
  const roster = deriveCitizenRoster({ nodes, seed: SEED });
  const places = citizenPlaces({ roster, placements, hub: HUB, seed: SEED });
  const rig = buildCitizenRig({
    roster,
    places,
    placements: [...placements, HUB_PLACEMENT],
  });
  return { roster, places, rig };
}

/** A bare island: nothing placed, nobody housed — the cold open. */
function bareIsland() {
  return rigFor([]);
}

/** Every skill built and mastered, laid out by the real placement helper. */
function settledIsland() {
  const placements = defaultPlacements([...SKILL_NODES], [HUB_PLACEMENT], BUILDABLE_RADIUS);
  return rigFor(SKILL_NODES.map(masteredNode), placements);
}

/** How many instances actually hold a distinct position at time `t`. */
function movedBetween(rig: CitizenRig, from: number, to: number): number {
  poseCitizens(rig, from, false);
  const before = Array.from({ length: rig.bodies.count }, (_, i) =>
    instanceTranslation(rig.bodies, i),
  );
  poseCitizens(rig, to, false);
  let moved = 0;
  for (let i = 0; i < rig.bodies.count; i += 1) {
    const after = instanceTranslation(rig.bodies, i);
    const start = before[i] ?? [0, 0, 0];
    if (Math.hypot(after[0] - start[0], after[2] - start[2]) > 1e-6) {
      moved += 1;
    }
  }
  return moved;
}

describe("the instanced crowd (D-CIT9)", () => {
  it("draws the founding crowd, and the whole settled island, one instance each", () => {
    // The floor the rest of the file rests on: the numbers the engine derives are 8 on
    // a bare island and 44 at full mastery, and the crowd draws exactly those.
    const bare = bareIsland();
    expect(bare.roster.population).toBe(FOUNDING_POPULATION);
    expect(bare.rig.bodies.count).toBe(FOUNDING_POPULATION);
    expect(bare.rig.heads.count).toBe(FOUNDING_POPULATION);

    const settled = settledIsland();
    expect(settled.roster.population).toBe(48);
    // Sits exactly AT the render cap after the founding-population rebalance (was 44, with
    // real headroom under 48) rather than under it -- sampling only starts ABOVE the cap
    // (CityVitalityPanel.tsx's own comment on MAX_RENDERED_CITIZENS), so 48 is still every
    // citizen instanced for real, with zero headroom left for the next population increase.
    expect(settled.roster.population).toBeLessThanOrEqual(MAX_RENDERED_CITIZENS);
    expect(settled.rig.bodies.count).toBe(48);
    expect(settled.rig.heads.count).toBe(48);
  });

  it("draws the whole crowd in exactly TWO instanced meshes", () => {
    // A throng must cost roughly what a handful does. Forty-four individually-meshed,
    // individually-animated citizens would change the per-frame character of a scene
    // whose existing `useFrame` callbacks each animate single digits of objects.
    const { roster, rig } = settledIsland();
    expect(roster.population).toBe(48);
    let instanced = 0;
    let plainMeshes = 0;
    rig.root.traverse((child) => {
      const mesh = child as { isInstancedMesh?: boolean; isMesh?: boolean };
      if (mesh.isInstancedMesh === true) {
        instanced += 1;
      } else if (mesh.isMesh === true) {
        plainMeshes += 1;
      }
    });
    expect(instanced).toBe(2);
    expect(plainMeshes).toBe(0);
  });

  it("never lets a citizen into the shadow pass", () => {
    // The shadow pass is one of the three levers that actually bite on the Chromebook
    // floor (D-CIT20), and the gulls already set the precedent for staying out of it.
    // A contact decal under each citizen would also re-enter the ground depth ladder
    // that #152 fixed, which is why there is no such decal to configure here.
    const { roster, rig } = settledIsland();
    expect(roster.population).toBe(48);
    for (const mesh of [rig.bodies, rig.heads]) {
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    }
  });

  it("caps RENDERING only, and leaves the roster's count exact", () => {
    // The correct degradation: a crowd that stops getting denser while the text keeps
    // counting. Section 7 forbids losing people and section 13 forbids the crowd being
    // the only channel, so the cap may never reach back into the count.
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    const inflated = {
      ...roster,
      population: 200,
      citizens: Array.from({ length: 200 }, (_, index) => ({
        ...(roster.citizens[0] as (typeof roster.citizens)[number]),
        id: `citizen-${String(index).padStart(3, "0")}`,
      })),
    };
    const places = citizenPlaces({
      roster: inflated,
      placements: [],
      hub: HUB,
      seed: SEED,
    });
    const rig = buildCitizenRig({ roster: inflated, places, placements: [HUB_PLACEMENT] });
    expect(inflated.population).toBeGreaterThan(MAX_RENDERED_CITIZENS);
    expect(rig.bodies.count).toBe(MAX_RENDERED_CITIZENS);
    expect(rig.heads.count).toBe(MAX_RENDERED_CITIZENS);
    // The roster is untouched by the cap.
    expect(inflated.population).toBe(200);
    expect(inflated.citizens).toHaveLength(200);
  });

  it("samples a stable PREFIX at the cap, so growth never un-draws anybody", () => {
    // "People vanished" is the failure mode a cap invites. Drawing the lowest-indexed
    // citizens means the drawn set only ever grows until it saturates: nobody who was
    // on screen leaves it because somebody else arrived.
    const roster = deriveCitizenRoster({ nodes: [], seed: SEED });
    const crowdOf = (size: number) => {
      const inflated = {
        ...roster,
        population: size,
        citizens: Array.from({ length: size }, (_, index) => ({
          ...(roster.citizens[0] as (typeof roster.citizens)[number]),
          id: `citizen-${String(index).padStart(3, "0")}`,
        })),
      };
      const places = citizenPlaces({
        roster: inflated,
        placements: [],
        hub: HUB,
        seed: SEED,
      });
      return buildCitizenRig({ roster: inflated, places, placements: [HUB_PLACEMENT] });
    };
    const small = crowdOf(MAX_RENDERED_CITIZENS + 10);
    const large = crowdOf(MAX_RENDERED_CITIZENS + 90);
    expect(small.drawn).toHaveLength(MAX_RENDERED_CITIZENS);
    expect(large.drawn).toEqual(small.drawn);
  });

  it("seats every instance before the first frame", () => {
    // A crowd that flashes at the world origin on mount is the classic instancing
    // defect: the matrix buffer starts as zeros, so an implementation that waits for
    // the first `useFrame` draws everybody stacked at (0, 0, 0) for one frame.
    const { rig } = settledIsland();
    expect(rig.bodies.count).toBe(48);
    for (let i = 0; i < rig.bodies.count; i += 1) {
      const [x, , z] = instanceTranslation(rig.bodies, i);
      expect(Math.hypot(x, z), `body ${i} sits at the origin`).toBeGreaterThan(0);
    }
  });

  it("holds still under reduced motion, and is posed rather than removed", () => {
    // Posed, not frozen mid-stride, and never removed — the population is unchanged.
    // This is rung 2 of the degradation ladder, and it exists for free.
    const { rig } = settledIsland();
    poseCitizens(rig, 0, true);
    const first = Array.from(rig.bodies.instanceMatrix.array);
    poseCitizens(rig, 12.5, true);
    expect(Array.from(rig.bodies.instanceMatrix.array)).toEqual(first);
    // And the crowd is still all there.
    expect(rig.bodies.count).toBe(48);
    // Without the preference, time moves them.
    poseCitizens(rig, 12.5, false);
    expect(Array.from(rig.bodies.instanceMatrix.array)).not.toEqual(first);
  });

  it("stands a reduced-motion citizen at the END of their walk, not its start", () => {
    // If the static pose were the route's start, every citizen under the preference
    // would be standing in the middle of the island rather than at the doorstep the
    // engine assigned them.
    const { places, rig } = settledIsland();
    poseCitizens(rig, 0, true);
    for (let i = 0; i < rig.bodies.count; i += 1) {
      const [x, , z] = instanceTranslation(rig.bodies, i);
      const place = places[i];
      expect(place, `place ${i}`).toBeDefined();
      expect(Math.hypot(x - (place?.point.x ?? 0), z - (place?.point.z ?? 0))).toBeLessThan(
        1e-6,
      );
    }
  });

  it("walks, and most of the crowd is moving at any given moment", () => {
    // The assertions below about SPEED are all upper bounds, which a motionless crowd
    // satisfies perfectly. This is the floor under them.
    const { rig } = settledIsland();
    expect(rig.bodies.count).toBe(48);
    expect(movedBetween(rig, 0, 2.5)).toBeGreaterThan(rig.bodies.count / 2);
  });

  it("walks at the tuned speed, and holds the pace across a long frame gap", () => {
    // `WALK_SPEED_UNITS_PER_SEC = 1.6` — about one grid cell every 2.5s, legible at the
    // fixed ~49-degree camera without looking hurried. Distance covered must be a
    // function of ELAPSED TIME, not of how many frames happened to be drawn.
    const { rig } = settledIsland();
    poseCitizens(rig, 0, false);
    const start = Array.from({ length: rig.bodies.count }, (_, i) =>
      instanceTranslation(rig.bodies, i),
    );
    poseCitizens(rig, 1, false);
    for (let i = 0; i < rig.bodies.count; i += 1) {
      const after = instanceTranslation(rig.bodies, i);
      const before = start[i] ?? [0, 0, 0];
      const moved = Math.hypot(after[0] - before[0], after[2] - before[2]);
      expect(moved, `citizen ${i} covered ${moved}u in one second`).toBeLessThanOrEqual(
        WALK_SPEED_UNITS_PER_SEC * 1.05,
      );
    }
  });

  it("poses purely from elapsed time, so it cannot drift or accumulate", () => {
    // The defect this catches: advancing by a fixed step per CALL. Under that
    // implementation the crowd's position depends on how many frames have been drawn,
    // so a slow machine walks a slower city and returning to t=0 does not return home.
    const { rig } = settledIsland();
    poseCitizens(rig, 0, false);
    const atZero = Array.from(rig.bodies.instanceMatrix.array);
    poseCitizens(rig, 5, false);
    poseCitizens(rig, 17.25, false);
    poseCitizens(rig, 0, false);
    expect(Array.from(rig.bodies.instanceMatrix.array)).toEqual(atZero);
  });

  it("keeps every citizen in their own gait phase rather than in lockstep", () => {
    // A crowd that moves as one body reads as a machine, not a town. The phase comes
    // from the engine's seeded `look.gait_phase`, so it is stable across sessions.
    const { roster, rig } = settledIsland();
    const phases = new Set(roster.citizens.map((citizen) => citizen.look.gait_phase));
    expect(phases.size).toBeGreaterThan(1);
    poseCitizens(rig, 3.3, false);
    const positions = new Set(
      Array.from({ length: rig.bodies.count }, (_, i) =>
        instanceTranslation(rig.bodies, i).join(","),
      ),
    );
    // Nobody shares a position, which also rules out the whole crowd stacking up.
    expect(positions.size).toBe(rig.bodies.count);
  });

  it("varies stature from the seeded look, so the crowd is not a clone army", () => {
    const { roster, rig } = settledIsland();
    const heights = new Set(roster.citizens.map((citizen) => citizen.look.height_scale));
    expect(heights.size).toBeGreaterThan(1);
    // Column 5 of the matrix is the Y scale.
    const scales = new Set<number>();
    for (let i = 0; i < rig.bodies.count; i += 1) {
      scales.add(rig.bodies.instanceMatrix.array[i * 16 + 5] ?? 0);
    }
    expect(scales.size).toBeGreaterThan(1);
  });

  it("gives every citizen a colour, and never the reserved mastery gold", () => {
    // `#FFB703` is the mastery accent and may never be an era material: a body is never
    // gold (era one style guide, constraint 4).
    //
    // The reference is built through `THREE.Color` rather than compared against raw
    // channel thresholds, because three converts sRGB to linear on `setHex` — the first
    // version of this test hard-coded sRGB bounds, and a citizen dressed in literal
    // `#FFB703` sailed through it, since gold's green channel is 0.72 in sRGB and 0.46
    // once linearised. Measuring against a reference converted the same way cannot drift
    // that way.
    const gold = new THREE.Color().setHex(RESERVED_GOLD);
    const { rig } = settledIsland();
    for (const [what, mesh] of [
      ["body", rig.bodies],
      ["head", rig.heads],
    ] as const) {
      const colours = mesh.instanceColor;
      expect(colours, `${what} carries an instance colour`).not.toBeNull();
      expect(colours?.array.length).toBe(mesh.count * 3);
      for (let i = 0; i < mesh.count; i += 1) {
        const r = colours?.array[i * 3] ?? 0;
        const g = colours?.array[i * 3 + 1] ?? 0;
        const b = colours?.array[i * 3 + 2] ?? 0;
        expect(r + g + b, `${what} ${i} has no colour`).toBeGreaterThan(0);
        const fromGold = Math.hypot(r - gold.r, g - gold.g, b - gold.b);
        // Comfortably clear, not merely unequal: a near-gold hide would read as gold.
        expect(fromGold, `${what} ${i} is the reserved gold`).toBeGreaterThan(0.15);
      }
    }
  });

  it("stays clear of the near plane, so it cannot spend #152's depth-precision win", () => {
    // `depthPrecision.test.ts` justifies `NEAR < 3` with a measured claim about the
    // whole scene: nothing solid came within 3u of the camera. Citizens are new solid
    // geometry, so they fall inside that measurement — and they clear it by standing ON
    // the ground and being shorter than the terrain already swept, unlike the mastery
    // stars, which float. Pinned here so a taller citizen fails rather than the near
    // plane quietly needing to be raised.
    //
    // THE FEET-ON-THE-GROUND HALF IS THE LOAD-BEARING ONE and it is unchanged by the
    // 2026-07-29 downsize: `NEAR < 3` is satisfied with room to spare at any plausible
    // citizen height, so the assertion that actually catches the defect it was written
    // for is the y-translation, not the height bound.
    const { rig } = settledIsland();
    poseCitizens(rig, 4.5, false);
    for (let i = 0; i < rig.bodies.count; i += 1) {
      const [, y] = instanceTranslation(rig.bodies, i);
      expect(y, `citizen ${i} is off the ground`).toBeCloseTo(0, 6);
    }
    expect(rig.height).toBeLessThan(3);
  });

  it("stands half the height of the dwelling a citizen lives in", () => {
    // The scale is DERIVED, so it is pinned against the building rather than against a
    // literal. `rowhouse` renders 2.608u (era one section 6, measured) and is both the
    // island's only residence and its lowest full-plot mass, which makes it the pair a
    // figure is most at risk of competing with — the state the previous 1.78u was in, at
    // 68% of it.
    //
    // Pinned as a RATIO in both directions. Too tall and the figure competes with the
    // architecture again; too short and it drops below the size at which a head still
    // reads and becomes one of era one's notched tally posts.
    const { rig } = settledIsland();
    const fraction = rig.height / DWELLINGS_RENDERED_HEIGHT;
    expect(fraction).toBeCloseTo(CITIZEN_DWELLING_FRACTION, 2);
    // And subordinate to every other authored mass, so the hierarchy holds by
    // construction rather than by having been checked once in a screenshot.
    expect(rig.height).toBeLessThan(ROUND_HOUSE_RENDERED_HEIGHT / 2);
    expect(rig.height).toBeLessThan(LOOKOUT_RENDERED_HEIGHT / 4);
  });
});
