import { SUCCESSION } from "@cr/game";
import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  BASIN_WATER_NAME,
  BOUNDARY_STONE_NAME,
  BOUNDARY_STONE_SPAN,
  buildBoundaryRun,
  CLAIM_POST_NAME,
  CRANE_LOAD_NAME,
  CRANE_NAME,
  CUT_MARK_NAME,
  DRIFT_BLOCK_NAME,
  FIGURE_NAME,
  HULL_NAME,
  OPENING_BAR_NAME,
  PLINTH_HEIGHT,
  QUAY_NAME,
  REMOVAL_CLEAT_NAME,
  SHEAR_LEGS_NAME,
  SHUTTER_NAME,
} from "../city/three/successionScene";
import { SUCCESSION_SCENE_TONES as S } from "../city/three/successionTones";
import { buildDistrict, buildForum, districtGroupName } from "./successionForum";
import { SUCCESSION_SCENARIOS } from "./successionScenarios";
import {
  SUCCESSION_FORUM,
  type SuccessionForum,
  successionStands,
} from "./successionStands";
import { successionView } from "./successionView";

/**
 * **THE FORUM: five different pictures, no fill, and a layout that decides nothing.**
 *
 * Three claims, and the third is the one this crisis's whole design rests on.
 */

/* -------------------------------------------------------------------------- */
/* Reading a built group                                                      */
/* -------------------------------------------------------------------------- */

/** Every object in a group, by name, in traversal order. */
function names(group: THREE.Object3D): string[] {
  const found: string[] = [];
  group.traverse((child) => found.push(child.name));
  return found;
}

function has(group: THREE.Object3D, name: string): boolean {
  return names(group).includes(name);
}

function count(group: THREE.Object3D, name: string): number {
  return names(group).filter((entry) => entry === name).length;
}

/**
 * **WHAT A DISTRICT'S FURNITURE IS, WITH EVERY PLACE STRIPPED OUT.**
 *
 * Names, mesh geometry sizes, material tones and the `userData` that carries a pose, a mark and a
 * sling — and deliberately NOT a position or a rotation. Two districts that fingerprint the same
 * are two districts drawn as the same picture, wherever they were put.
 *
 * That omission is what makes the fingerprint the right instrument for the permutation test
 * below: it is exactly the half of a scene graph a layout is allowed to change.
 */
function fingerprint(group: THREE.Object3D): string {
  const parts: string[] = [];
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const data = Object.entries(child.userData)
      .filter(([key]) => key !== "districtId")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(",");
    if (!mesh.isMesh) {
      parts.push(`group:${child.name}[${data}]`);
      return;
    }
    const position = mesh.geometry.getAttribute("position");
    const material = (
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    ) as THREE.MeshStandardMaterial[];
    parts.push(
      [
        mesh.name,
        data,
        position ? position.count : 0,
        mesh.scale
          .toArray()
          .map((n) => n.toFixed(3))
          .join("/"),
        material
          .map(
            (one) =>
              `${one.color?.getHexString?.() ?? ""}@${(one.opacity ?? 1).toFixed(2)}`,
          )
          .join("+"),
      ].join("|"),
    );
  });
  return parts.join("\n");
}

/** Every district's view, for one named scenario. */
function districtsOf(scenarioId: string) {
  const scenario = SUCCESSION_SCENARIOS.find((entry) => entry.id === scenarioId);
  if (!scenario) {
    throw new Error(`no scenario "${scenarioId}"`);
  }
  return successionView(scenario.build()).districts;
}

/* -------------------------------------------------------------------------- */
/* The census                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * **THE FIVE STATES A PLINTH AND ITS BUILDING CAN BE IN ARE FIVE DIFFERENT INSTRUCTIONS.**
 *
 * The failure this guards against is a COLLAPSE. Two states that reach the renderer as the same
 * geometry are two states a player cannot tell apart, and the crisis's whole read depends on
 * telling a bare plinth from a warned one and a warned one from a landed one. Asserted as a
 * distinctness COUNT over a floored population, rather than as five spot checks, because a spot
 * check passes on each of two identical pictures.
 */
describe("the board's states are different pictures", () => {
  it("draws bare, warned, landed, claimed and contested as five distinct instructions", () => {
    const stand = successionStands(["one"])[0];
    if (!stand) {
      throw new Error("no stand was computed, so nothing can be built");
    }

    // Each state is taken from a PLAYED board rather than hand-written, so a picture here is a
    // picture of something the reducer can reach.
    const bare = districtsOf("neutral").find((district) => district.block === null);
    const warned = districtsOf("warned").find((district) => district.block !== null);
    const closed = districtsOf("drifted").find(
      (district) => district.decided_by === "drift",
    );
    const reopened = districtsOf("secured").find(
      (district) => district.claim === "claimed",
    );
    const rallyProposed = districtsOf("planned").find(
      (district) => district.proposed_figure !== null,
    );
    const reopenProposed = districtsOf("reopen-choice").find(
      (district) => district.proposed_claim === "reopen",
    );

    const cast = { bare, warned, closed, reopened, rallyProposed, reopenProposed };
    for (const [state, district] of Object.entries(cast)) {
      expect(district, `no played board reaches the "${state}" state`).toBeDefined();
    }

    const prints = new Map<string, string>();
    for (const [state, district] of Object.entries(cast)) {
      prints.set(
        state,
        fingerprint(buildDistrict(district as NonNullable<typeof bare>, { ...stand })),
      );
    }

    expect(
      new Set(prints.values()).size,
      `six states reached the renderer as ${new Set(prints.values()).size} pictures`,
    ).toBe(6);

    // AND EACH ONE CARRIES THE OBJECT IT IS ABOUT, so the distinctness is not six ways of
    // drawing nothing.
    const built = (state: keyof typeof cast) =>
      buildDistrict(cast[state] as NonNullable<typeof bare>, { ...stand });

    // A bare plinth has no figure, no block and no shear-legs. It is finished stonework.
    expect(has(built("bare"), FIGURE_NAME)).toBe(false);
    expect(has(built("bare"), DRIFT_BLOCK_NAME)).toBe(false);
    expect(has(built("bare"), SHEAR_LEGS_NAME)).toBe(false);

    // A warned plinth has the block ON THE GROUND under a SLACK sling, and still no figure.
    const warnedGroup = built("warned");
    expect(has(warnedGroup, DRIFT_BLOCK_NAME)).toBe(true);
    expect(has(warnedGroup, FIGURE_NAME)).toBe(false);
    const slack = warnedGroup.getObjectByName(SHEAR_LEGS_NAME);
    expect(slack?.userData.sling).toBe("slack");
    const waiting = warnedGroup.getObjectByName(DRIFT_BLOCK_NAME) as THREE.Object3D;
    expect(waiting.position.y, "a waiting block is not on the ground").toBeLessThan(0.5);
    // And the block says WHOSE it is, which is what makes the drift a warning and not a surprise.
    expect([...new Set(names(waiting))]).toContain(CUT_MARK_NAME);

    // A landed drift is the SAME OBJECT, MOVED: the figure is standing on the plinth, and the
    // hoist and the block are both GONE — the block became the figure. Photographed with both,
    // the drifted board came back as timber lying over stonework rather than as a statue.
    const closedGroup = built("closed");
    expect(has(closedGroup, FIGURE_NAME)).toBe(true);
    expect(has(closedGroup, SHEAR_LEGS_NAME)).toBe(false);
    expect(has(closedGroup, DRIFT_BLOCK_NAME)).toBe(false);
    const statue = closedGroup.getObjectByName(FIGURE_NAME) as THREE.Object3D;
    expect(
      statue.position.y,
      "the figure is not standing on the plinth's top face",
    ).toBeGreaterThanOrEqual(PLINTH_HEIGHT);

    // A contested building keeps its silhouette and loses its openings, and stands a claim post
    // at its plot corner cut with the holder's own mark. It is shuttered, never sacked. The
    // WIDEST opening gets a bar instead of boards, because a frontage boarded uniformly reads as
    // one continuous hoarding and the building loses its front.
    expect(count(closedGroup, SHUTTER_NAME)).toBeGreaterThan(4);
    expect(has(closedGroup, CLAIM_POST_NAME)).toBe(true);
    expect(count(closedGroup, `${OPENING_BAR_NAME}-rail`)).toBe(4);

    // A settled claim keeps the post — it says WHOSE, and that has not changed — and loses every
    // board, because the boards say SUSPENDED and it is not any more. Two independent pieces of
    // geometry carrying the engine's own two layers, which is what deleting the corner milestone
    // into the post bought.
    const reopenedGroup = built("reopened");
    expect(count(reopenedGroup, SHUTTER_NAME)).toBe(0);
    expect(has(reopenedGroup, OPENING_BAR_NAME)).toBe(false);
    expect(has(reopenedGroup, CLAIM_POST_NAME)).toBe(true);

    // A proposal is the object itself rendered thinner, keeping its cut mark and casting nothing.
    const proposedGroup = built("rallyProposed");
    const ghost = proposedGroup.getObjectByName(FIGURE_NAME);
    expect(ghost?.userData.proposed).toBe(true);
    let sawTranslucent = false;
    ghost?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        const one = mesh.material as THREE.MeshStandardMaterial;
        expect(mesh.castShadow, "a proposal darkened the paving, so it is a fact").toBe(
          false,
        );
        if (one.transparent && one.opacity < 1) {
          sawTranslucent = true;
        }
      }
    });
    expect(sawTranslucent, "the proposal came back solid").toBe(true);

    const removalGroup = built("reopenProposed");
    expect(has(removalGroup, REMOVAL_CLEAT_NAME)).toBe(true);
    expect(count(removalGroup, SHUTTER_NAME)).toBeGreaterThan(4);
  });

  it("gives the two claimants two silhouettes and one tone", () => {
    const stand = successionStands(["one"])[0] as NonNullable<
      ReturnType<typeof successionStands>[number]
    >;
    const settled = successionView(
      SUCCESSION_SCENARIOS.find((entry) => entry.id === "mixed")?.build() ??
        (() => {
          throw new Error("no settled scenario");
        })(),
    );
    const held = settled.districts.filter((district) => district.figure !== "none");
    expect(held.length).toBeGreaterThan(0);

    // Every figure on the board is cut from ONE stone. Allegiance is carried by pose, and a
    // second tone here would be the tint the art brief forbids outright.
    for (const district of held) {
      const group = buildDistrict(district, stand);
      group.getObjectByName(FIGURE_NAME)?.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          expect((mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
            S.FIGURE,
          );
        }
      });
    }
  });
});

/* -------------------------------------------------------------------------- */
/* M5: nothing fills a district, and nothing joins two                        */
/* -------------------------------------------------------------------------- */

describe("the crisis writes on the paving with objects and never with a fill", () => {
  it("draws a boundary run as separate stones enclosing an area", () => {
    const stands = successionStands(["a", "b", "c"]);
    const first = stands[0];
    if (!first) {
      throw new Error("no stand");
    }
    const run = buildBoundaryRun(first.bounds, "chevron");

    // ONE STONE PER SPOT, each its own group with its own transform. A run that came back as a
    // single stretched mesh would be the line era four does not draw.
    expect(count(run, BOUNDARY_STONE_NAME)).toBe(first.bounds.length);
    expect(first.bounds.length).toBeGreaterThanOrEqual(8);
    const stones = run.children;
    expect(
      new Set(stones.map((stone) => `${stone.position.x},${stone.position.z}`)).size,
    ).toBe(stones.length);

    // AND THE RUN CLOSES. Four sides, so the extremes in both axes are reached — an open line of
    // stones would read as a route between two things, which is exactly what era four never draws.
    const xs = stones.map((stone) => stone.position.x);
    const zs = stones.map((stone) => stone.position.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(1);
  });

  /**
   * **NO TWO DISTRICTS' STONES STAND IN THE SAME PLACE, and this failed on the shipped layout.**
   *
   * Each enclosure is a rectangle rotated onto its own district's outward bearing, and on the
   * four-district board neighbouring bearings are 34 degrees apart — so two runs 7.9 apart, 5.4
   * across and 7.0 deep, crossed at their corners. Only `halfAcross` was capped against the spacing;
   * the depth was not, and the depth is what pushed the corners into each other.
   *
   * It was invisible for as long as every named board carried one claimant, because two stones in one
   * place with the same mark just look like one stone. On the `divided` board it is
   * **a chevron stone and a ring stone standing in the same place**, which is two districts' claims
   * occupying one spot — the one thing this crisis's ground may never say, and worse than the ruled
   * line it is careful not to draw.
   *
   * Swept over every authored board rather than the default one, because the defect is a function of
   * how many districts share the arc.
   */
  it("never stands two districts' stones in the same place, on any authored board", () => {
    let compared = 0;
    for (const board of SUCCESSION.boards) {
      const stands = successionStands(board.districts.map((district) => district.id));
      expect(stands.length, `${board.id} has no stands`).toBeGreaterThan(0);

      for (const [index, stand] of stands.entries()) {
        for (const other of stands.slice(index + 1)) {
          for (const here of stand.bounds) {
            for (const there of other.bounds) {
              const between = Math.hypot(here.x - there.x, here.z - there.z);
              expect(
                between,
                `${board.id}: ${stand.district_id} and ${other.district_id} both have a stone at ` +
                  `${here.x.toFixed(2)}, ${here.z.toFixed(2)}`,
              ).toBeGreaterThan(BOUNDARY_STONE_SPAN);
              compared += 1;
            }
          }
        }
      }
    }
    // A floor, because the sweep is vacuous over a board list with one district apiece.
    expect(compared, "no pair of stones was compared").toBeGreaterThan(500);
  });

  it("puts no mesh inside a district's enclosure that fills it", () => {
    const view = successionView(
      SUCCESSION_SCENARIOS.find((entry) => entry.id === "drifted")?.build() ??
        (() => {
          throw new Error("no drifted scenario");
        })(),
    );
    const stands = successionStands(view.districts.map((district) => district.id));

    for (const [index, district] of view.districts.entries()) {
      const stand = stands[index];
      if (!stand) {
        continue;
      }
      const group = buildDistrict(district, stand);
      const across =
        Math.max(...stand.bounds.map((spot) => spot.x)) -
        Math.min(...stand.bounds.map((spot) => spot.x));

      // Nothing a district owns is as wide as the ground its stones enclose. A fill would be
      // exactly that mesh, and it is what would make the board read as a map rather than a city.
      group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry.boundingBox) {
          mesh.geometry?.computeBoundingBox?.();
        }
        const boxSize = mesh.isMesh ? mesh.geometry.boundingBox : null;
        if (!boxSize) {
          return;
        }
        const width = (boxSize.max.x - boxSize.min.x) * mesh.scale.x;
        expect(
          width,
          `${mesh.name} in ${district.id} is as wide as the district it stands in`,
        ).toBeLessThan(across);
      });
    }
  });
});

/* -------------------------------------------------------------------------- */
/* M6: the port shuts and the basin runs                                      */
/* -------------------------------------------------------------------------- */

describe("the port has shut and the basin has not", () => {
  it("stands hulls off at anchor over a bare quay, with the basin still running", () => {
    const forum = buildForum(successionView(SUCCESSION_SCENARIOS[0]?.build() as never));

    expect(count(forum, HULL_NAME)).toBeGreaterThanOrEqual(2);
    expect(has(forum, QUAY_NAME)).toBe(true);
    // The crane is stopped MID-LIFT with its load in the air, which is the picture of a working
    // port that has stopped working rather than one that was never working.
    expect(has(forum, CRANE_NAME)).toBe(true);
    const load = forum.getObjectByName(CRANE_LOAD_NAME) as THREE.Object3D;
    expect(load, "the crane has no load, so nothing is held in the air").toBeDefined();
    // Clear of the quay deck it would be set down on, by more than its own height. Held in the
    // AIR is the whole picture: a load resting on the quay is a lift that finished.
    expect(
      load.position.y,
      "the load is on the ground rather than in the sling",
    ).toBeGreaterThan(1.6);
    // The quay carries a deck, a lip and bollards and NOTHING ELSE. There is no cargo builder in
    // the module to call, which is the point: a quay that could be drawn loaded is a quay
    // somebody draws loaded during the crisis whose whole read is that the port has shut.
    const quay = forum.getObjectByName(QUAY_NAME) as THREE.Object3D;
    for (const child of quay.children) {
      expect(child.name).toMatch(/^succession-quay-(deck|lip|bollard)$/);
    }

    // The basin's water is there, and it is a legibly different water from the harbour's.
    const water = forum.getObjectByName(BASIN_WATER_NAME) as THREE.Mesh;
    expect(water).toBeDefined();
    expect(S.WATER_BASIN).not.toBe(S.WATER_SLATE);
    const luminance = (hex: number) => {
      const channel = (value: number) => {
        const scaled = value / 255;
        return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * channel((hex >> 16) & 255) +
        0.7152 * channel((hex >> 8) & 255) +
        0.0722 * channel(hex & 255)
      );
    };
    // A step a hard noon can carry. Measured rather than eyeballed, because "the one thing that
    // has not stopped" is only worth drawing if it reads as a different thing.
    expect(luminance(S.WATER_BASIN) - luminance(S.WATER_SLATE)).toBeGreaterThan(0.1);
  });

  /**
   * **M23's PRECONDITION: the two things that may move are findable, and nothing else is.**
   *
   * The rig itself is `SuccessionAmbient`, which needs a canvas; what a headless guard can hold is
   * that the two objects it reaches for exist and are the only ones marked as movable. A rig that
   * could not find its subjects would animate nothing and look exactly like reduced motion.
   */
  it("marks only the running water and unfinished crane load as movable", () => {
    // Asserted over EVERY named board rather than one, because the claim is that era four's
    // crisis is the stillest of the nine — a board that grew a third moving object in some
    // state nobody photographed would be a cycle that appeared to turn on its own.
    for (const scenario of SUCCESSION_SCENARIOS) {
      const state = scenario.build();
      const forum = buildForum(successionView(state));

      expect(
        forum.getObjectByName(BASIN_WATER_NAME),
        `${scenario.id}: the basin has no water, so nothing is still running`,
      ).toBeDefined();

      const hoisted: THREE.Object3D[] = [];
      forum.traverse((child) => {
        if (child.userData.hoisted === true) {
          hoisted.push(child);
        }
      });
      expect(
        hoisted.map((child) => child.name),
        `${scenario.id}: the wrong things are hanging in a sling`,
      ).toEqual(state.phase === "settled" ? [] : [CRANE_LOAD_NAME]);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The layout decides nothing                                                 */
/* -------------------------------------------------------------------------- */

/**
 * **THE PERMUTATION: move the forum, and every district is drawn exactly as it was.**
 *
 * `test/successionSurfaceIsOneWay.test.ts` holds the arrow at the source level — no module both
 * decides and can see a place. This is the behavioural half, and it is the one that would catch a
 * scene that quietly indexed its furniture by position in the arc rather than by district.
 *
 * The forum below is a genuinely different one: rotated half a turn, its sweep reversed so the
 * arc reads the other way, at a different reach with a different enclosure. If any of what a
 * district is drawn AS depended on where it was put, its fingerprint would move.
 */
describe("where the forum is laid out decides nothing about what is drawn", () => {
  const MIRRORED: SuccessionForum = {
    ...SUCCESSION_FORUM,
    reach: SUCCESSION_FORUM.reach * 1.4,
    sweep: -SUCCESSION_FORUM.sweep,
    bearing: SUCCESSION_FORUM.bearing + Math.PI,
    setback: SUCCESSION_FORUM.setback * 0.6,
    halfAcross: SUCCESSION_FORUM.halfAcross * 1.3,
    stonesPerSide: SUCCESSION_FORUM.stonesPerSide,
  };

  it("draws the same picture for every district under two different forums", () => {
    // Every named state, so the invariance is not measured on an opening board where nothing is
    // drawn anyway.
    expect(SUCCESSION_SCENARIOS.length).toBeGreaterThanOrEqual(6);
    let compared = 0;

    for (const scenario of SUCCESSION_SCENARIOS) {
      const view = successionView(scenario.build());
      const here = buildForum(view, SUCCESSION_FORUM);
      const there = buildForum(view, MIRRORED);

      for (const district of view.districts) {
        const a = here.getObjectByName(districtGroupName(district.id));
        const b = there.getObjectByName(districtGroupName(district.id));
        expect(a, `${scenario.id}: ${district.id} is missing from the forum`).toBeDefined();
        expect(b).toBeDefined();
        expect(
          fingerprint(b as THREE.Object3D),
          `${scenario.id}: ${district.id} is drawn differently when the forum moves`,
        ).toBe(fingerprint(a as THREE.Object3D));
        compared += 1;
      }
    }

    // A FLOOR, because the comparison above is vacuous over an empty board list.
    expect(compared, "no district was compared under two forums").toBeGreaterThanOrEqual(
      24,
    );
  });

  it("really does put them somewhere else, so the invariance is not vacuous", () => {
    const view = successionView(SUCCESSION_SCENARIOS[0]?.build() as never);
    const here = successionStands(view.districts.map((district) => district.id));
    const there = successionStands(
      view.districts.map((district) => district.id),
      MIRRORED,
    );
    expect(here.length).toBe(there.length);
    for (const [index, stand] of here.entries()) {
      const moved = there[index] as (typeof there)[number];
      expect(
        Math.hypot(stand.plinth.x - moved.plinth.x, stand.plinth.z - moved.plinth.z),
        `${stand.district_id} did not move, so the permutation changed nothing`,
      ).toBeGreaterThan(5);
    }
  });

  /**
   * The fingerprint is sensitive to WHICH district it is drawing, which is what makes the
   * invariance above worth having. Forced red rather than argued: draw one district's state onto
   * another's stand and the picture changes, because the two are in different states.
   */
  it("changes when a different district's state is drawn", () => {
    const view = successionView(
      SUCCESSION_SCENARIOS.find((entry) => entry.id === "warned")?.build() as never,
    );
    const stands = successionStands(view.districts.map((district) => district.id));
    const stand = stands[0] as (typeof stands)[number];

    const warned = view.districts.find((district) => district.block !== null);
    const quiet = view.districts.find((district) => district.block === null);
    expect(warned, "no district is warned on this board").toBeDefined();
    expect(
      quiet,
      "every district is warned, so there is nothing to compare against",
    ).toBeDefined();

    expect(fingerprint(buildDistrict(quiet as NonNullable<typeof quiet>, stand))).not.toBe(
      fingerprint(buildDistrict(warned as NonNullable<typeof warned>, stand)),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The palette                                                                */
/* -------------------------------------------------------------------------- */

describe("the palette borrows nothing the product reserves", () => {
  it("uses no mastery gold, and no correctness hue, in the table or in the meshes", () => {
    /** Mastery gold, CIVIC green and BRICK red are reserved outright, in every era. */
    const reserved = [0xffb703, 0x2f9e44, 0xc9422a];
    for (const tone of Object.values(S) as number[]) {
      expect(reserved, `${tone.toString(16)} is a reserved hue`).not.toContain(tone);
    }

    const forum = buildForum(
      successionView(
        SUCCESSION_SCENARIOS.find((entry) => entry.id === "suspended")?.build() as never,
      ),
    );
    const table = new Set<number>(Object.values(S));
    let meshes = 0;
    forum.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      meshes += 1;
      const material = (
        Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      ) as THREE.MeshStandardMaterial[];
      for (const one of material) {
        expect(reserved).not.toContain(one.color.getHex());
      }
    });
    // The sweep is over a real forum rather than an empty group.
    expect(meshes, "the forum drew nothing, so this swept nothing").toBeGreaterThan(200);
    expect(table.size).toBeGreaterThan(10);
  });
});
