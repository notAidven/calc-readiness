import { HARD_WINTER, type WinterCellView, type WinterFire } from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { GRID_CELL } from "../worldLayout";
import { buildWinterGroundGroup, HEARTH_RADIUS, WINTER_TILE_NAMES } from "./WinterGround";
import {
  buildHearth,
  buildSmokeColumn,
  COLUMN_HEIGHT,
  columnSpanFor,
  FLAME_MESH_NAME,
  FLAME_NAME,
  FUEL_NAME,
  SMOKE_PUFF_NAME,
  updateFire,
} from "./winterFire";

/**
 * **M14: HOW LONG THE FIRE HAS LEFT, WHICH THE BOARD DID NOT SAY, AND WHICH THE HEARTH COULD NOT
 * SAY LOUD ENOUGH.**
 *
 * ## RULED 2026-08-02: THE READ MOVED TO THE SMOKE COLUMN
 *
 * Everything below the next heading is the FUEL ladder, and it is kept: the lead's ruling is that
 * the flame's pose *"is not wrong, it is just not sufficient alone."* What made it insufficient is
 * a measurement rather than a preference — photographed at 1024x580 at the shipped camera, the
 * whole difference between three rounds left and one is the flame's top edge descending **11px on a
 * 21px-wide flame**, because a three-unit hearth inside a ring of stones has nowhere to put three
 * states.
 *
 * So the duration is now also spent on the one asset in `winterFire.ts` that is 26 world units
 * tall and was built to be findable from the far rim, and the sweeps in
 * "the column's reach is how long the fire has left" are that ladder. Two files carry the claim
 * between them and the split is deliberate: this one owns the ladder in WORLD UNITS and the
 * invariants around it, and `winterCamera.test.ts` owns whether the world units survive the
 * projection, in screen pixels, at the shipped camera and at both dolly clamps. Neither is a
 * substitute for the other — a correct world-space ladder is exactly what an unreadable one looks
 * like from in here.
 *
 * `burn_rounds_by_tier` has run a ladder since it was tuned and the 3D layer read none of it:
 * `WinterFire.rounds_left` reached `WinterGround.tsx` and `addFire` spent only `radius !== null`
 * on it, so a player deciding whether to light a second fire could not see how long the first
 * one had. The mechanic inventory carries the row as an outright **GAP** for that reason.
 *
 * The design is **block 2 of `2026-08-01-winter-crisis-mechanics-scene-assets.html`**: the stack
 * loses a log a round, the flame's core falls faster than its skirt, **no radius anywhere is
 * scaled**, and the held ground is identical at every step, *"because duration is not width and a
 * player must not read a short fire as a small one"*.
 *
 * Two of the assertions below are the sheet's own, in the shape this file can measure them:
 *
 *  - *"expect(box(patchA)).toEqual(box(patchB)); // to 1e-6, all three"* is the held-ground sweep;
 *  - *"expect(tongue.scale.x).toBe(1); // every tongue, every step"* is a claim about the pose not
 *    touching X. The pose lives in the tongue GEOMETRY here rather than in its scale, so the same
 *    claim is measured as the flame's own extent IN PLAN being identical at every step — which is
 *    strictly wider, since it would also catch a base radius changed at build time.
 *
 * And one is not the sheet's line but the behaviour behind it: the sheet warns that a posed flame
 * left in `scale` *"snaps back to full height on the first frame"* once the frame loop writes that
 * scale absolutely. So the posed ORDER is asserted to survive a run of {@link updateFire}.
 *
 * ## WHICH OF THE TWO CHANNELS A PLAYER ACTUALLY SEES IS NOT WHAT THE SHEET IMPLIES
 *
 * Photographed at 1024x580 at the game's camera and at the plates' tilt
 * (`winterCrisisShots.browser.test.tsx`, `08a`-`08c` and `09a`-`09b`), **the stack is not visible
 * at either elevation** — the flame fills the ring's mouth from above and the ring stones hide it
 * from the side. So the fuel assertions below pin a MECHANISM and the flame assertions pin the
 * thing a player sees, and neither should be read as the other. `winterFire.ts` carries the
 * finding and the measured pixel figures.
 *
 * ## The two halves are asserted together, deliberately
 *
 * "The stack shrinks" and "the footprint does not" are one claim, not two, and either one alone
 * is satisfiable by doing nothing: an implementation that ignores `rounds_left` holds the
 * footprint perfectly. So the sweeps below measure the variant and the invariant in the same
 * test, which is the only shape a no-op cannot pass.
 *
 * ## The steps come off the tuning, and the floor is what stops the derivation shrinking
 *
 * {@link STEPS} is derived from `burn_rounds_by_tier`'s top rung rather than written down, so a
 * re-tune that lengthens the longest fire extends this sweep instead of leaving a step
 * undrawn. A derived population can derive the WRONG set, so {@link LONGEST} is floored at the
 * three steps the plate draws: a ladder that collapsed to one rung would otherwise satisfy
 * every monotonic assertion below over a single element.
 */

/** The longest any fire burns, off the tuning. Three at `strong`, which is plate 08's three. */
const LONGEST = Math.max(...Object.values(HARD_WINTER.fire.burn_rounds_by_tier));

/** Every `rounds_left` a drawn fire can hold, freshest first: the engine filters at zero. */
const STEPS: readonly number[] = Array.from({ length: LONGEST }, (_, i) => LONGEST - i);

const RADIUS = GRID_CELL * 0.3;

function meshesNamed(root: THREE.Object3D, name: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.name === name) {
      found.push(mesh);
    }
  });
  return found;
}

/**
 * Everything in the hearth that is neither fuel nor flame: the stone ring and the ember bed's
 * neighbours. **This is the footprint population**, and it is derived as a complement rather
 * than by name so a part added to the hearth tomorrow is held to the same invariant by
 * default rather than by somebody remembering to list it.
 */
function structureOf(hearth: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  hearth.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.name !== FUEL_NAME && mesh.name !== FLAME_MESH_NAME) {
      found.push(mesh);
    }
  });
  return found;
}

/** A mesh's own boxed volume, in world scale. The fuel's mass, summed over the stack. */
function boxVolume(mesh: THREE.Mesh): number {
  mesh.geometry.computeBoundingBox();
  const size = (mesh.geometry.boundingBox as THREE.Box3)
    .getSize(new THREE.Vector3())
    .multiply(mesh.scale);
  return size.x * size.y * size.z;
}

function worldBox(root: THREE.Object3D, meshes: readonly THREE.Mesh[]): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const mesh of meshes) {
    box.expandByObject(mesh);
  }
  return box;
}

/** How much wood is in the stack at `roundsLeft`. */
function fuelMass(roundsLeft: number): number {
  const hearth = buildHearth(RADIUS, "burning", roundsLeft);
  return meshesNamed(hearth, FUEL_NAME).reduce((sum, log) => sum + boxVolume(log), 0);
}

/** How tall the stack stands at `roundsLeft` — the stack settling as it is consumed. */
function fuelTop(roundsLeft: number): number {
  const hearth = buildHearth(RADIUS, "burning", roundsLeft);
  return worldBox(hearth, meshesNamed(hearth, FUEL_NAME)).max.y;
}

/** How tall the flame stands at `roundsLeft`. */
function flameTop(roundsLeft: number): number {
  const hearth = buildHearth(RADIUS, "burning", roundsLeft);
  return worldBox(hearth, meshesNamed(hearth, FLAME_MESH_NAME)).max.y;
}

/** The hearth's extent IN PLAN, which is the thing duration is not allowed to move. */
function footprint(roundsLeft: number): { span: number; count: number } {
  const hearth = buildHearth(RADIUS, "burning", roundsLeft);
  const structure = structureOf(hearth);
  const box = worldBox(hearth, structure);
  return {
    span: Math.max(box.max.x - box.min.x, box.max.z - box.min.z),
    count: structure.length,
  };
}

/** The extent IN PLAN of whatever `name` covers, to the precision the sheet asks for. */
function planOf(roundsLeft: number, name: string): readonly number[] {
  const hearth = buildHearth(RADIUS, "burning", roundsLeft);
  const box = worldBox(hearth, meshesNamed(hearth, name));
  return [box.min.x, box.max.x, box.min.z, box.max.z];
}

/** How many logs are in the stack at `roundsLeft`. */
function logCount(roundsLeft: number): number {
  return meshesNamed(buildHearth(RADIUS, "burning", roundsLeft), FUEL_NAME).length;
}

function cell(overrides: Partial<WinterCellView> = {}): WinterCellView {
  return {
    col: 0,
    row: 0,
    land: true,
    rim_depth: 0,
    frozen: false,
    warded: false,
    frost_line: false,
    frost_next: false,
    building: null,
    damage_stage: 0,
    preview_tier: null,
    ...overrides,
  };
}

function fire(overrides: Partial<WinterFire> = {}): WinterFire {
  return { col: 0, row: 0, radius: 2, rounds_left: LONGEST, lit_in_round: 1, ...overrides };
}

describe("M14: a fire's duration is drawn in its own mass", () => {
  it("has the plate's three steps to draw, and takes them off the tuning", () => {
    // The floor, so the monotonic sweeps below cannot be satisfied over one element.
    expect(LONGEST).toBeGreaterThanOrEqual(3);
    expect(STEPS).toHaveLength(LONGEST);
    expect(STEPS[STEPS.length - 1]).toBe(1);
  });

  it("burns the stack down as the rounds run out, and does not move the footprint", () => {
    const masses = STEPS.map(fuelMass);
    const tops = STEPS.map(fuelTop);
    const plans = STEPS.map(footprint);

    // The variant: a fresher fire has more wood in it than the same fire one round later.
    for (let i = 1; i < STEPS.length; i += 1) {
      expect(
        masses[i - 1] as number,
        `mass at ${STEPS[i - 1]} vs ${STEPS[i]} rounds`,
      ).toBeGreaterThan(masses[i] as number);
      expect(
        tops[i - 1] as number,
        `stack top at ${STEPS[i - 1]} vs ${STEPS[i]} rounds`,
      ).toBeGreaterThan(tops[i] as number);
    }

    // The invariant, in the same test because it is the same claim: duration is not width.
    const first = plans[0] as { span: number; count: number };
    expect(first.count).toBeGreaterThanOrEqual(9);
    for (const [i, plan] of plans.entries()) {
      expect(plan.count, `structure at ${STEPS[i]} rounds`).toBe(first.count);
      expect(plan.span, `footprint at ${STEPS[i]} rounds`).toBeCloseTo(first.span, 9);
    }
  });

  it("shrinks the flame with the fuel rather than leaving it at full height", () => {
    const heights = STEPS.map(flameTop);
    for (let i = 1; i < STEPS.length; i += 1) {
      expect(
        heights[i - 1] as number,
        `flame at ${STEPS[i - 1]} vs ${STEPS[i]} rounds`,
      ).toBeGreaterThan(heights[i] as number);
    }
  });

  it("spends the whole ladder in Y, and scales no radius anywhere", () => {
    // **THE SHEET'S OWN GUARD, in the shape this file can measure it.** Block 2 asks for
    // `expect(tongue.scale.x).toBe(1)` every tongue every step, which is a claim about the pose
    // not touching X. The pose is in the tongue GEOMETRY here rather than in its scale, so the
    // same claim is measured as the flame's extent IN PLAN — which also catches a base radius
    // changed at build time, where reading `scale.x` would not.
    //
    // This is the assertion the first implementation of this mechanic FAILED: it ramped the
    // tongue base radius by 0.86 as the fire burned down, which is precisely the "fire drawn
    // narrower as it burns down" the sheet says the asset exists to prevent.
    const flamePlans = STEPS.map((r) => planOf(r, FLAME_MESH_NAME));
    for (const [i, plan] of flamePlans.entries()) {
      expect(plan, `flame in plan at ${STEPS[i]} rounds`).toEqual(flamePlans[0]);
    }

    // The stack is measured PER LOG rather than as a union box, and the difference matters. The
    // logs are laid crossed — each at its own yaw and its own length — so removing the top one
    // changes the union's extent while moving nothing at all. "Nothing horizontal moves" is a
    // claim about each log, so each log is what it is asserted over: every log still present is
    // byte-identical to the one at that index in the whole stack. That is also the stronger
    // reading, because it fails on a log RESIZED as well as one shifted.
    const logBoxes = (roundsLeft: number): readonly (readonly number[])[] => {
      const hearth = buildHearth(RADIUS, "burning", roundsLeft);
      return meshesNamed(hearth, FUEL_NAME).map((log) => {
        const box = worldBox(hearth, [log]);
        return [box.min.x, box.max.x, box.min.y, box.max.y, box.min.z, box.max.z];
      });
    };
    const whole = logBoxes(LONGEST);
    expect(whole.length, "the whole stack").toBe(3);
    for (const roundsLeft of STEPS) {
      const present = logBoxes(roundsLeft);
      expect(present.length, `logs at ${roundsLeft} rounds`).toBeGreaterThan(0);
      for (const [i, box] of present.entries()) {
        expect(box, `log ${i} at ${roundsLeft} rounds`).toEqual(whole[i]);
      }
    }
  });

  it("loses a log a round, and never the last one", () => {
    // The sheet's table: three logs, two, one. One rather than zero is a state boundary and not
    // a soft floor — an empty ring of stones is already the fire that never caught, and the logs
    // are the only dark values inside the flame's own silhouette.
    const counts = STEPS.map(logCount);
    expect(counts[0], "the freshest fire's stack").toBe(3);
    expect(logCount(1), "the last round's stack").toBe(1);
    // DISTINCT, which is what catches a ladder the pose table does not cover: a step with no
    // pose of its own clamps onto its neighbour's and the two counts collide here.
    expect(new Set(counts).size, `log counts over ${JSON.stringify(counts)}`).toBe(
      STEPS.length,
    );
    for (const roundsLeft of STEPS) {
      const hearth = buildHearth(RADIUS, "burning", roundsLeft);
      const at = `at ${roundsLeft} rounds`;
      const flame = meshesNamed(hearth, FLAME_MESH_NAME);
      expect(flame.length, `flame ${at}`).toBeGreaterThan(0);
      // The stack still sits on the ember bed (the lowest flame surface) and under the tip, so
      // the wood that is left is still inside the fire rather than beside it.
      const tips = flame.map((mesh) => worldBox(hearth, [mesh]).max.y);
      const stack = worldBox(hearth, meshesNamed(hearth, FUEL_NAME));
      expect(stack.max.y, `stack over the ember bed ${at}`).toBeGreaterThan(
        Math.min(...tips),
      );
      expect(stack.max.y, `stack under the flame tip ${at}`).toBeLessThan(
        Math.max(...tips),
      );
    }
  });

  it("drops the flame's core faster than its skirt, so three fires are not one fire", () => {
    // The sheet: "a dying fire loses its peak before it loses its lap: keeping the ratio flat
    // gave three flames that looked like one flame at three zoom levels." A single ramp over all
    // seven tongues IS that flat ratio, so the split is asserted rather than left to the table.
    const hearths = STEPS.map((r) => buildHearth(RADIUS, "burning", r));
    const heightsOf = (hearth: THREE.Group): number[] => {
      const flame = hearth.getObjectByName(FLAME_NAME) as THREE.Object3D;
      return flame.children.map((tongue) => {
        const box = worldBox(hearth, [tongue as THREE.Mesh]);
        return box.max.y - box.min.y;
      });
    };
    const full = heightsOf(hearths[0] as THREE.Group);
    const last = heightsOf(hearths[hearths.length - 1] as THREE.Group);
    expect(full.length, "the flame's tongues").toBeGreaterThanOrEqual(7);
    // Index 0 is the core; every other tongue is skirt. The core keeps LESS of its height.
    const coreKept = (last[0] as number) / (full[0] as number);
    const skirtKept =
      full
        .slice(1)
        .map((h, i) => (last[i + 1] as number) / h)
        .reduce((a, b) => a + b, 0) /
      (full.length - 1);
    // **WITH A MARGIN, BECAUSE A BARE `toBeLessThan` PASSED ON FLOAT NOISE.** Measured: with the
    // pose flattened to `coreY === skirtY` — exactly the ratio the sheet says was tried and
    // rejected — this read `core=0.4799999839` against `skirt=0.4799999999`, so the core came out
    // 1.6e-8 lower and the assertion reported green over the defect it exists to catch. The
    // authored gap at one log is 0.48 - 0.38 = 0.10, so half of it is far above that noise and
    // comfortably under the real thing.
    expect(
      skirtKept - coreKept,
      `core ${coreKept} against skirt ${skirtKept}`,
    ).toBeGreaterThan(0.05);
    // ...and both actually fell, so "core below skirt" cannot be satisfied by nothing moving.
    expect(coreKept).toBeLessThan(1);
    expect(skirtKept).toBeLessThan(1);
  });

  it("holds the pose through the frame loop, which is what the sheet warned about", () => {
    // Block 2: "left as an authored scale that the frame loop overwrites, a one-log fire snaps
    // back to full height on the first frame." The pose is in the geometry here precisely so
    // that cannot happen, and this is the assertion that says so rather than the docblock.
    const full = buildHearth(RADIUS, "burning", LONGEST);
    const last = buildHearth(RADIUS, "burning", 1);
    const column = buildSmokeColumn(3, 315, HEARTH_RADIUS, LONGEST);
    const tipOf = (hearth: THREE.Group): number =>
      worldBox(hearth, meshesNamed(hearth, FLAME_MESH_NAME)).max.y;
    for (const t of [0, 0.3, 1.7, 12, 400]) {
      updateFire(full, column, t);
      updateFire(last, column, t);
      expect(tipOf(last), `posed order at t=${t}`).toBeLessThan(tipOf(full));
    }
  });

  it("keeps a hearth that never caught cold at every duration", () => {
    // `none` is a real rung: it burns for one round and wards nothing, so a cold hearth is
    // drawn with a duration like any other and must not sprout a flame at any of them.
    for (const roundsLeft of STEPS) {
      const cold = buildHearth(RADIUS, "never_caught", roundsLeft);
      expect(meshesNamed(cold, FLAME_MESH_NAME), `cold at ${roundsLeft}`).toHaveLength(0);
      expect(meshesNamed(cold, FUEL_NAME).length, `cold at ${roundsLeft}`).toBeGreaterThan(
        0,
      );
    }
  });

  it("clamps a duration off either end of the ladder onto the ladder", () => {
    // A re-tune that lengthened a fire past this file's assumption must draw the top step
    // rather than an extrapolated stack larger than the one the hearth was authored around.
    expect(fuelMass(LONGEST + 4)).toBeCloseTo(fuelMass(LONGEST), 9);
    expect(fuelMass(0)).toBeCloseTo(fuelMass(1), 9);
  });

  it("moves BOTH channels between the first rung and the last, not one of them", () => {
    // **THE ASSERTION THAT FAILS IF EITHER LADDER IS DELETED**, and the reason it is one test
    // rather than two: the 2026-08-02 ruling adds the column WITHOUT retiring the pose, so
    // "something changed" is satisfied by half the mechanic and the claim is that both halves are
    // there. Measured between the extremes only, because the per-step sweeps either side of this
    // own the monotonicity and this owns the composition.
    const flameFull = flameTop(LONGEST);
    const flameLast = flameTop(1);
    expect(flameLast, "the flame's pose no longer moves with the duration").toBeLessThan(
      flameFull,
    );

    const topOf = (roundsLeft: number): number =>
      new THREE.Box3().setFromObject(buildSmokeColumn(3, 315, HEARTH_RADIUS, roundsLeft))
        .max.y;
    expect(
      topOf(1),
      "the smoke column no longer moves with the duration, which is the 2026-08-02 ruling",
    ).toBeLessThan(topOf(LONGEST));

    // AND THE COLUMN IS THE CHANNEL WITH THE ROOM IN IT, which is why the ruling moved the read
    // there. Stated as a comparison rather than left implied: the column's travel over the whole
    // ladder has to dwarf the flame's, or the move bought nothing.
    expect(
      topOf(LONGEST) - topOf(1),
      "the column's travel is no bigger than the flame's, so the read did not move",
    ).toBeGreaterThan((flameFull - flameLast) * 4);
  });

  it("holds the ground the fire is keeping identical at every step", () => {
    // §4: "the held ground is identical in all three". Pinned at the LAYER, because the
    // warded tile is the thing a player would misread as a smaller fire.
    const rows = [[cell({ col: 0, row: 0, warded: true })]];
    const spans = STEPS.map((roundsLeft) => {
      const group = buildWinterGroundGroup(rows, [fire({ rounds_left: roundsLeft })], {
        weather: false,
      });
      const tiles = meshesNamed(group, WINTER_TILE_NAMES.warded);
      expect(tiles.length, `warded tile at ${roundsLeft} rounds`).toBeGreaterThan(0);
      const box = worldBox(group, tiles);
      return [box.min.x, box.max.x, box.min.z, box.max.z, box.max.y];
    });
    for (const [i, span] of spans.entries()) {
      expect(span, `held ground at ${STEPS[i]} rounds`).toEqual(spans[0]);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The column, which is where the read moved on 2026-08-02                    */
/* -------------------------------------------------------------------------- */

/** The column a fire with `roundsLeft` to go throws, over the shipped hearth. */
function columnAt(roundsLeft: number): THREE.Group {
  return buildSmokeColumn(3, 315, HEARTH_RADIUS, roundsLeft);
}

/** Every puff in a column, in the order it was built. */
function puffsOf(column: THREE.Object3D): THREE.Mesh[] {
  return meshesNamed(column, SMOKE_PUFF_NAME);
}

/** The rendered top of a column, puff radii included. */
function columnTop(column: THREE.Object3D): number {
  return new THREE.Box3().setFromObject(column).max.y;
}

/**
 * **THE PER-RUNG GAP THE READ NEEDS, IN WORLD UNITS, AND WHERE THE NUMBER COMES FROM.**
 *
 * `winterCamera.test.ts` measures the projection: at the shipped tilt and fov a vertical reads
 * about 25 pixels per world unit on a 1080-tall frame at the resting dolly, which is 13.4 on the
 * lead's 580-tall window, and about a third of that at full zoom-out. So 3 world units is roughly
 * 40px at rest and 13px at the worst dolly a player can reach, against the flame's own measured
 * 11px descent at rest and nothing legible at all zoomed out.
 *
 * It is deliberately a LOW floor and deliberately here rather than in the source. Low, because the
 * pixel claim belongs to the file that does the projection and this one is the guard against a
 * ladder so fine that no projection could save it — a re-tune that gave
 * `burn_rounds_by_tier` eight rungs would divide {@link COLUMN_HEIGHT}'s reach into steps under
 * 2.2u, and that should fail here rather than be discovered in a frame. Here rather than in
 * `winterFire.ts`, because a requirement asserted against a constant the same file authors is two
 * copies of one number agreeing with each other.
 */
const RUNG_GAP_MIN = 3;

describe("the column's reach is how long the fire has left", () => {
  it("shortens a rung at a time, by a gap no projection could lose", () => {
    const tops = STEPS.map((roundsLeft) => columnTop(columnAt(roundsLeft)));

    // A FLOOR ON THE LADDER ITSELF, because every sweep below is monotonic over this list and a
    // one-rung ladder satisfies every one of them by having nothing to compare.
    expect(
      STEPS.length,
      "there is one rung, so there is no duration to draw",
    ).toBeGreaterThan(1);
    for (let i = 1; i < STEPS.length; i += 1) {
      const gap = (tops[i - 1] as number) - (tops[i] as number);
      expect(
        gap,
        `the column at ${STEPS[i - 1]} rounds against ${STEPS[i]}: ${gap.toFixed(2)}u apart`,
      ).toBeGreaterThan(RUNG_GAP_MIN);
    }

    // AND THE TOP RUNG IS THE COLUMN #449 PHOTOGRAPHED, unchanged: a fire that has just caught
    // throws exactly the plume the findability argument was made about, so nothing in
    // `winterCamera.test.ts`'s findability sweep was quietly paid for out of this ladder.
    expect(columnSpanFor(LONGEST)).toBeCloseTo(COLUMN_HEIGHT, 9);
    expect(columnTop(columnAt(LONGEST))).toBeGreaterThan(COLUMN_HEIGHT);
  });

  it("keeps the foot of the column identical at every rung, because duration is not width", () => {
    // The same invariant the fuel ladder is under, carried up into the smoke. A column scaled down
    // as a whole would put a narrower, fainter plume over the hearth and say the fire covers less
    // ground — which is the one reading the whole mechanic exists to prevent. So the puff sitting
    // over the flame is measured: where it sits, how big it is, and how solid it is.
    const footOf = (roundsLeft: number): readonly number[] => {
      const column = columnAt(roundsLeft);
      const puffs = puffsOf(column);
      const foot = puffs[0] as THREE.Mesh;
      const box = new THREE.Box3().setFromObject(foot);
      const material = foot.material as THREE.MeshStandardMaterial;
      return [
        Number(box.min.x.toFixed(9)),
        Number(box.max.x.toFixed(9)),
        Number(box.min.y.toFixed(9)),
        Number(box.max.y.toFixed(9)),
        Number(box.min.z.toFixed(9)),
        Number(box.max.z.toFixed(9)),
        Number(material.opacity.toFixed(9)),
      ];
    };
    const whole = footOf(LONGEST);
    // A floor on the subject: the foot really has extent, so the equality below is over a box
    // rather than over six zeroes.
    expect((whole[1] as number) - (whole[0] as number)).toBeGreaterThan(1);
    for (const roundsLeft of STEPS) {
      expect(footOf(roundsLeft), `the column's foot at ${roundsLeft} rounds`).toEqual(
        whole,
      );
    }

    // **AND THE CROWN GROWS WITH THE REACH, which is the other way this could have been built and
    // the reason the ramps are keyed on a RISE rather than on a fraction of the column's own span.**
    // Keyed on a fraction, every rung would put the same 3.8-unit crown at the top of whatever it
    // reached, so a fire with one round left would throw a squat plume as wide as a fresh one's
    // instead of a thin one — smoke that had been compressed rather than smoke that had not had time
    // to spread. The foot assertion above cannot see that (a fraction of zero is zero either way),
    // so it is asserted here.
    // Measured off each puff's own GEOMETRY rather than off its world box, and with a margin. Every
    // puff is tumbled to its own rotation and stretched on Y, so a world box's x-extent moves with
    // both: measured, the fraction-keyed build this rules out drew a 3.8-unit crown at every rung
    // and the world boxes still came out strictly ordered, by float noise, so a bare
    // `toBeGreaterThan` reported green over the defect. The authored step is 0.74 of radius, so half
    // of it is far above that noise and well under the real thing.
    const crownOf = (roundsLeft: number): number =>
      Math.max(
        ...puffsOf(columnAt(roundsLeft)).map((puff) => {
          puff.geometry.computeBoundingSphere();
          return (puff.geometry.boundingSphere as THREE.Sphere).radius;
        }),
      );
    const crowns = STEPS.map(crownOf);
    for (let i = 1; i < STEPS.length; i += 1) {
      expect(
        (crowns[i - 1] as number) - (crowns[i] as number),
        `the crown at ${STEPS[i - 1]} rounds against ${STEPS[i]}`,
      ).toBeGreaterThan(0.37);
    }
  });

  it("stays continuous at every rung rather than thinning into separated lumps", () => {
    // **THE DEFECT #449 FIXED, MET AGAIN FROM THE OTHER DIRECTION.** Eleven puffs over 26 units
    // read as a totem of boulders because consecutive puffs did not touch. A ladder implemented by
    // holding the puff COUNT and shrinking the span would go the other way and pack them; one that
    // held the SPACING and dropped puffs keeps the density the frames were taken at. Asserted as
    // overlap, which is the property either mistake breaks.
    for (const roundsLeft of STEPS) {
      const puffs = puffsOf(columnAt(roundsLeft));
      expect(puffs.length, `puffs at ${roundsLeft} rounds`).toBeGreaterThanOrEqual(4);
      const boxes = puffs.map((puff) => new THREE.Box3().setFromObject(puff));
      for (let i = 1; i < boxes.length; i += 1) {
        const below = boxes[i - 1] as THREE.Box3;
        const above = boxes[i] as THREE.Box3;
        expect(
          below.max.y,
          `a gap between puff ${i - 1} and ${i} at ${roundsLeft} rounds`,
        ).toBeGreaterThan(above.min.y);
      }
    }
    // AND A SHORTER COLUMN REALLY HAS FEWER OF THEM, so "continuous" is not being met by the same
    // fourteen puffs at every rung, which would be the scaled-down column this file rules out.
    expect(puffsOf(columnAt(1)).length).toBeLessThan(puffsOf(columnAt(LONGEST)).length);
  });

  it("recycles inside its own reach at every rung, which is the sheet's own warning", () => {
    // Block 2 of the assets sheet warned that a pose left for the frame loop to overwrite *"snaps
    // back to full height on the first frame"*. `updateFire` recycles the puffs up a span, and a
    // span read off a module constant rather than off the group would do exactly that to a short
    // column: one frame after mounting, a fire with one round left would be throwing a full one.
    // The span is carried in `userData` for that reason, and this is the assertion that says so.
    for (const roundsLeft of STEPS) {
      const hearth = buildHearth(HEARTH_RADIUS, "burning", roundsLeft);
      const column = columnAt(roundsLeft);
      const built = columnTop(column);
      const base = new THREE.Box3().setFromObject(column).min.y;
      for (const t of [0, 0.9, 4.3, 17, 260, 1000]) {
        updateFire(hearth, column, t);
        const box = new THREE.Box3().setFromObject(column);
        expect(
          box.max.y,
          `the column at ${roundsLeft} rounds grew past its own reach at t=${t}`,
        ).toBeLessThan(built + 0.5);
        expect(
          box.min.y,
          `the column at ${roundsLeft} rounds sank below its own floor at t=${t}`,
        ).toBeGreaterThan(base - 0.5);
      }
    }
  });

  it("keeps every puff clear of the flame at every rung, at rest and over a recycle", () => {
    // `winterScene.test.ts` checks this at the WHOLE-FUEL rung, which was every rung there was.
    // The pose drops the flame as the fuel runs down and the column comes down with it, so the
    // clearance is now a claim about a pair of ladders and has to be measured on each rung of it.
    for (const roundsLeft of STEPS) {
      const hearth = buildHearth(HEARTH_RADIUS, "burning", roundsLeft);
      const flame = hearth.getObjectByName(FLAME_NAME) as THREE.Object3D;
      const column = columnAt(roundsLeft);
      const tipOf = () => new THREE.Box3().setFromObject(flame).max.y;
      const lowestOf = () =>
        Math.min(
          ...puffsOf(column).map((puff) => new THREE.Box3().setFromObject(puff).min.y),
        );
      // A FLOOR ON THE SUBJECT, and it is deliberately under the hearth's own radius: at one log
      // the core tongue reaches 0.874 of that radius, which `winterFire.ts`'s header records as a
      // consequence of the pose meeting the ring. So the floor is that a flame with real height
      // exists, not that it out-reaches the stones — the stones are what it is inside.
      expect(tipOf(), `the flame at ${roundsLeft} rounds`).toBeGreaterThan(
        HEARTH_RADIUS * 0.5,
      );
      expect(lowestOf(), `a puff inside the flame at ${roundsLeft} rounds`).toBeGreaterThan(
        tipOf(),
      );
      for (const t of [0, 1.3, 6.6, 90]) {
        updateFire(hearth, column, t);
        expect(
          lowestOf(),
          `a puff inside the flame at ${roundsLeft} rounds, t=${t}`,
        ).toBeGreaterThan(tipOf());
      }
    }
  });

  it("clamps a duration off either end of the ladder onto the ladder", () => {
    // The same requirement `poseFor` is under, for the same reason: a re-tune that lengthened the
    // top rung must draw the tallest column the findability argument covers rather than
    // extrapolating past it, and a zero must draw the last rung rather than nothing.
    expect(columnSpanFor(LONGEST + 5)).toBeCloseTo(columnSpanFor(LONGEST), 9);
    expect(columnSpanFor(0)).toBeCloseTo(columnSpanFor(1), 9);
    expect(columnSpanFor(-3)).toBeCloseTo(columnSpanFor(1), 9);
  });
});
