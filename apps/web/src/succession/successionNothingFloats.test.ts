import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  BASIN_NAME,
  BOUNDARY_STONE_NAME,
  BOUNDARY_STONE_SUNK,
  CIVIC_NAME,
  CRANE_NAME,
  DRIFT_BLOCK_NAME,
  FIGURE_NAME,
  FLOOR_NAME,
  HULL_NAME,
  PLINTH_HEIGHT,
  PLINTH_NAME,
  QUAY_NAME,
  SHEAR_LEGS_NAME,
  TREE_NAME,
} from "../city/three/successionScene";
import {
  buildForum,
  FORUM_FURNITURE_NAME,
  PORT_NAME,
  SEA_ACROSS,
  SEA_LEVEL,
} from "./successionForum";
import { SUCCESSION_SCENARIOS } from "./successionScenarios";
import { successionView } from "./successionView";

/**
 * **NOTHING IN THE FORUM HANGS IN THE AIR.**
 *
 * The play-test frame that produced this guard had **four objects in the sky**: the three hulls
 * standing off at anchor, drawn most of a unit clear of their own harbour with two of them past
 * the edge of the drawn water entirely, and the treadwheel crane raised by the quay deck's own
 * height while standing two and a half units in FRONT of that deck, on open paving. At the
 * player's own wheel zoom they read as poles with crossbars floating at the horizon, which is
 * what the lead reported.
 *
 * Every one of those numbers was defensible where it was written. `buildHull` drew a keel 0.62
 * below its group's origin; `buildForumFurniture` seated the group at -0.2; `SuccessionIsland`
 * drew the water at -1.4. **Three files, three plausible figures, no relationship between
 * them** — which is the shape {@link SEA_LEVEL}'s docblock now names, and the shape a guard has
 * to hold, because the next person to move the water will be just as careful and just as wrong.
 *
 * ## THE SURFACE IS RAYCAST, NOT RESTATED
 *
 * What holds an object up is found by dropping a ray on it through the forum's own meshes. That
 * is the whole reason this survives a layout change: the port has since moved from the back of
 * the arc to the disc's open side and turned through 113 degrees, and nothing here needed
 * editing, because the guard never knew where the deck was — it asks the deck.
 *
 * A restated footprint would have gone stale in exactly that commit, and it would have gone
 * stale GREEN: a `surfaceUnder` still measuring against the old rectangle would put the crane
 * over open paving, find y 0, and pass a crane standing at 0.5 on a deck it was no longer on.
 */

/**
 * How much daylight is allowed under a placed object before it is airborne.
 *
 * Small, because the claim is *touching*, and generous enough to survive a facet: a lathed hull
 * or a torus kerb can round its own lowest point by a hundredth. The defect this exists for was
 * 0.95 and 0.50, so nothing about the reading depends on where in this range the line sits.
 */
const AIRBORNE = 0.06;

/**
 * **THE FOUR NODES THAT ARRANGE, as against the ones that build.**
 *
 * The population below is *everything the layout hands a world position to*, which is the set of
 * things that can be in the sky. In the graph that is the children of these four, and they are
 * named rather than derived because the structural tell — *a group with no meshes of its own* —
 * misclassifies `succession-civic`, whose children are also all groups and none of which stands
 * on the ground.
 *
 * A written list is a population that can go quietly narrow, so it is checked in the direction
 * that would actually break: {@link MUST_BE_SWEPT} names the objects that have to come out the
 * other end. That is not a theoretical risk here. Moving the port onto one spot put the crane
 * inside `succession-port`, one level below the furniture group — and until this list learned
 * about that node, the sweep silently stopped covering the crane, which is one of the four
 * objects it was written for.
 */
const ARRANGEMENTS: readonly string[] = [FORUM_FURNITURE_NAME, PORT_NAME];

/** A district's own group, whose children are its plinth, its figure and its building. */
function isDistrict(name: string): boolean {
  return name.startsWith("succession-district-");
}

/**
 * **WHAT THE SWEEP HAS TO REACH, so a nesting change cannot quietly shrink it.**
 *
 * Every free-standing thing the forum draws: what stands on the paving, what stands on the deck,
 * and what floats. Asserted as a SUBSET of the population's own names, so an object that falls
 * out of the population fails by name rather than by a count nobody reads.
 */
const MUST_BE_SWEPT: readonly string[] = [
  FLOOR_NAME,
  QUAY_NAME,
  CRANE_NAME,
  HULL_NAME,
  BASIN_NAME,
  TREE_NAME,
  PLINTH_NAME,
  FIGURE_NAME,
  CIVIC_NAME,
  DRIFT_BLOCK_NAME,
  SHEAR_LEGS_NAME,
  `${BOUNDARY_STONE_NAME}-run`,
];

interface Placed {
  readonly board: string;
  readonly name: string;
  readonly object: THREE.Object3D;
  readonly box: THREE.Box3;
  /** The spots it could be standing on, which is every foot an assembly has. */
  readonly feet: readonly THREE.Vector2[];
}

/**
 * **WHERE AN ASSEMBLY COMES DOWN, and it is several places rather than one.**
 *
 * A hoist has three feet, a crane has a mast and a wheel, and a SEATED claimant's lowest part is
 * a foot thrown out past the front of the plinth it is sitting on — deliberately, because that
 * overhang is the one feature separating the two poses. Asking one spot what is underneath would
 * send the ray down beside the plinth and report a statue floating over the paving.
 *
 * So the feet are every mesh whose own underside is within {@link FOOTING} of the assembly's,
 * plus the spot the layout placed the assembly at, and the surface is the highest thing any of
 * them finds. That is the honest reading of *standing on something* for an object with more than
 * one leg.
 */
const FOOTING = 0.7;

/**
 * **HOW FAR A SURFACE MAY BE ABOVE AN OBJECT'S OWN UNDERSIDE AND STILL BE WHAT HOLDS IT UP.**
 *
 * Not zero, because two things here genuinely sit below their own surface. A boundary stone is
 * SET INTO the paving by {@link BOUNDARY_STONE_SUNK}, which is the whole difference between a
 * marker in a pavement and a block dropped on one; and a hoist's leaning timber picks up a
 * little axis-aligned slop in its world box, so its AABB dips under the floor it stands on.
 *
 * It is a CEILING on what counts as a support rather than slack in the pass condition, and the
 * two are different: {@link AIRBORNE} is still what decides whether something floats. Without
 * it the ray at a proposed claimant's plinth reports the shear-legs' lashing overhead, and every
 * sunk stone in the forum reports no surface at all.
 */
const SET_INTO = BOUNDARY_STONE_SUNK + 0.15;

function feetOf(object: THREE.Object3D): { box: THREE.Box3; feet: THREE.Vector2[] } {
  const box = new THREE.Box3().setFromObject(object);
  const parts: THREE.Box3[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      parts.push(new THREE.Box3().setFromObject(mesh));
    }
  });
  const at = object.getWorldPosition(new THREE.Vector3());
  const feet = [new THREE.Vector2(at.x, at.z)];
  for (const part of parts) {
    if (part.min.y <= box.min.y + FOOTING) {
      const centre = new THREE.Vector3();
      part.getCenter(centre);
      feet.push(new THREE.Vector2(centre.x, centre.z));
    }
  }
  return { box, feet };
}

/** Every object the layout hands a world position to, on one board. */
function placedIn(forum: THREE.Group, board: string): Placed[] {
  forum.updateMatrixWorld(true);
  const placed: Placed[] = [];
  forum.traverse((node) => {
    if (!(ARRANGEMENTS.includes(node.name) || isDistrict(node.name))) {
      return;
    }
    for (const object of node.children) {
      const { box, feet } = feetOf(object);
      if (box.isEmpty()) {
        continue;
      }
      placed.push({ board, name: object.name, object, box, feet });
    }
  });
  return placed;
}

/**
 * **WHAT IS UNDER A PLACED OBJECT: whatever the forum draws there, found by dropping a ray.**
 *
 * Its own subtree is excluded, because a building standing on its own podium is not standing on
 * anything. So is everything ABOVE it, which is not fussiness: on the `planned` board the ray at
 * a proposed claimant's plinth passes through the shear-legs' lashing four units over its head,
 * and a support is a thing you are ON rather than the first thing a ray from the sky meets.
 *
 * Nothing hit means open water, which is a real answer for a hull at anchor and a loud one for
 * anything else.
 */
function surfaceUnder(
  item: Placed,
  everything: THREE.Object3D,
): { readonly top: number; readonly what: string } {
  const down = new THREE.Vector3(0, -1, 0);
  const ceiling = item.box.min.y + SET_INTO;
  let best: { top: number; what: string; off: number } | null = null;
  for (const foot of item.feet) {
    const ray = new THREE.Raycaster(new THREE.Vector3(foot.x, 400, foot.y), down, 0, 900);
    for (const hit of ray.intersectObject(everything, true)) {
      if (hit.point.y > ceiling || isWithin(hit.object, item.object)) {
        continue;
      }
      /*
       * THE SURFACE IS THE ONE NEAREST THE OBJECT'S OWN UNDERSIDE, which is not always the
       * highest one in the band. On the `planned` board a slack sling's bight hangs six
       * hundredths ABOVE the crown a proposed claimant is standing on, so "highest" reports a
       * statue resting on a rope.
       */
      const off = Math.abs(hit.point.y - item.box.min.y);
      if (best === null || off < best.off) {
        best = { top: hit.point.y, what: hit.object.name, off };
      }
    }
  }
  if (best) {
    return { top: best.top, what: best.what };
  }
  /*
   * NOTHING UNDER IT MEANS WATER. The forum group draws no sea — `SuccessionIsland` mounts that
   * — so an object with no mesh beneath it is over open harbour, which is the right answer for a
   * hull at anchor and for the island itself, whose own underside is cut below the waterline.
   */
  return { top: SEA_LEVEL, what: "the harbour" };
}

function isWithin(node: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let walk: THREE.Object3D | null = node;
  while (walk !== null) {
    if (walk === ancestor) {
      return true;
    }
    walk = walk.parent;
  }
  return false;
}

/** Every board's placed objects, with what each of them is standing on. */
function census(): readonly {
  readonly item: Placed;
  readonly on: { readonly top: number; readonly what: string };
  readonly daylight: number;
}[] {
  const rows: { item: Placed; on: { top: number; what: string }; daylight: number }[] = [];
  for (const scenario of SUCCESSION_SCENARIOS) {
    const forum = buildForum(successionView(scenario.build()));
    for (const item of placedIn(forum, scenario.id)) {
      const on = surfaceUnder(item, forum);
      rows.push({ item, on, daylight: item.box.min.y - on.top });
    }
  }
  return rows;
}

describe("nothing the forum places hangs in the air", () => {
  const rows = census();

  it("sweeps every free-standing object the forum draws", () => {
    /*
     * A FLOOR, because the sweep below is a containment assertion and containment holds
     * trivially over an empty collection. Nine named boards, each with a dozen pieces of
     * furniture and three to seven districts.
     */
    expect(
      rows.length,
      "the layout placed nothing, so the sweep is vacuous",
    ).toBeGreaterThan(200);

    // AND IT REACHES EVERY KIND OF OBJECT, by name. This is the direction that breaks: nesting
    // the crane inside the port took it out of the population without changing a count enough
    // for anybody to notice.
    const swept = new Set(rows.map((row) => row.item.name));
    for (const owed of MUST_BE_SWEPT) {
      expect(
        [...swept],
        `${owed} is not in the population, so nothing checks whether it floats`,
      ).toContain(owed);
    }
  });

  it("finds all three of the surfaces the forum draws under something", () => {
    /*
     * The three answers are the paving, the quay's deck and the harbour, and every one of them
     * has to be load-bearing for something. A sweep that only ever measured against the paving
     * would have passed all four of the objects that were in the sky, and would have looked
     * exactly as green as this one.
     */
    const bySurface = (what: string) =>
      rows.filter((row) => row.on.what.includes(what)).length;
    expect(bySurface(`${FLOOR_NAME}-`), "nothing stands on the paving").toBeGreaterThan(
      100,
    );
    expect(
      bySurface(`${QUAY_NAME}-deck`),
      "nothing stands on the quay's deck",
    ).toBeGreaterThan(0);
    expect(bySurface("the harbour"), "nothing is afloat").toBeGreaterThan(0);
  });

  it("stands every placed object on the surface under it", () => {
    const airborne = rows.filter((row) => row.daylight > AIRBORNE);
    expect(
      airborne.map(
        (row) =>
          `${row.item.board}: ${row.item.name} floats ${row.daylight.toFixed(2)} over ` +
          `${row.on.what}`,
      ),
      "objects are hanging in the air",
    ).toEqual([]);
  });

  /**
   * A CLAIMANT STANDS ON A PLINTH'S CROWN, which is the one surface here that is not the ground
   * — and it is asserted rather than exempted, because the raycast finds the crown just as
   * readily as it finds paving. What the sweep above would catch is a figure raised off the
   * stonework; what this catches is one that has come down onto the paving beside it.
   */
  it("stands the claimants on the plinths and not on the paving", () => {
    const figures = rows.filter((row) => row.item.name === FIGURE_NAME);
    expect(figures.length, "no board raises a figure").toBeGreaterThan(3);
    for (const row of figures) {
      expect(
        row.on.what,
        `${row.item.board}: a claimant is standing on ${row.on.what}`,
      ).toContain(PLINTH_NAME);
      /*
       * AND IT IS SEATED ON THE CROWN, measured where the layout put it rather than at its
       * lowest point. The seated claimant's whole pose is a shin and a foot thrown out past the
       * crown's front edge and hanging half a unit below it — the one feature separating the two
       * poses — so its underside finds a lower course of the same stonework, which is correct
       * and is not the claim.
       */
      const seat = row.item.object.getWorldPosition(new THREE.Vector3());
      expect(
        Math.abs(seat.y - PLINTH_HEIGHT),
        `${row.item.board}: a claimant is seated at ${seat.y.toFixed(2)} rather than on the crown`,
      ).toBeLessThan(AIRBORNE);
    }
  });

  /**
   * **THE ANCHORAGE IS INSIDE THE DRAWN WATER**, which is the other half of the same defect: a
   * hull past the edge of the sheet it floats on is drawn against bare sky and reads exactly as
   * one hanging over it. The furthest hull stood at z -41 over water that stopped at -39.
   */
  it("keeps everything afloat inside the harbour that is actually drawn", () => {
    const afloat = rows.filter((row) => row.on.what === "the harbour");
    expect(afloat.length, "nothing is afloat, so this measured nothing").toBeGreaterThan(0);
    for (const row of afloat) {
      const reach = Math.max(
        Math.abs(row.item.box.min.x),
        Math.abs(row.item.box.max.x),
        Math.abs(row.item.box.min.z),
        Math.abs(row.item.box.max.z),
      );
      expect(
        reach,
        `${row.item.board}: ${row.item.name} reaches ${reach.toFixed(1)} over water drawn to ${SEA_ACROSS}`,
      ).toBeLessThan(SEA_ACROSS);
    }
  });

  /**
   * **THE ISLAND'S OWN UNDERSIDE IS UNDER THE WATER.**
   *
   * The paved disc is a cylinder cut to a fixed depth, and at 1.1 it stopped 0.3 ABOVE a harbour
   * drawn at -1.4 — an island floating over its own sea. Nobody has seen it, because at the
   * locked tilt the disc's near wall occludes the gap, and that is the whole reason it is worth
   * an assertion rather than a shrug: it is invisible today and one camera change from not being,
   * and it is the same class of defect as the three ships, arriving on the biggest object here.
   */
  it("cuts the island below the waterline rather than floating it over the sea", () => {
    const discs = rows.filter((row) => row.item.name === FLOOR_NAME);
    expect(discs.length, "no board drew a floor").toBe(SUCCESSION_SCENARIOS.length);
    for (const row of discs) {
      expect(
        row.item.box.min.y,
        `${row.item.board}: the disc's underside is at ${row.item.box.min.y.toFixed(2)} over water at ${SEA_LEVEL}`,
      ).toBeLessThan(SEA_LEVEL);
    }
  });

  /**
   * **THE SWEEP REALLY FAILS**, forced red rather than argued. Lift one placed object and the
   * measurement that passed a moment ago names it.
   */
  it("fails when a placed object is lifted off its surface", () => {
    const forum = buildForum(successionView(SUCCESSION_SCENARIOS[0]?.build() as never));
    const before = placedIn(forum, "injected");
    const victim = before.find((item) => item.name === TREE_NAME);
    expect(victim, "no tree was placed, so nothing can be lifted").toBeDefined();
    (victim as Placed).object.position.y += 1.2;
    forum.updateMatrixWorld(true);

    const after = placedIn(forum, "injected").find(
      (item) => item.object === (victim as Placed).object,
    ) as Placed;
    const on = surfaceUnder(after, forum);
    expect(
      after.box.min.y - on.top,
      "a tree lifted 1.2 off the paving did not register as airborne, so the sweep above " +
        "is measuring nothing",
    ).toBeGreaterThan(AIRBORNE);
  });
});
