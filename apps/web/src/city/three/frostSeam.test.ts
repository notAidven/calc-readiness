import { HARD_WINTER } from "@cr/game";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { type Footprint, MAX_BUILD_HEIGHT, NODE_FOOTPRINTS } from "../worldLayout";
import { frostCrustHeight, frostShellModel, MAX_SHELL_RATIO } from "./frostStage";
import { ruinedStageModel } from "./ruinStage";
import { WINTER_GROUND_TONES } from "./winterTones";

/**
 * **THE FROST SEAM: A DAMAGED BUILDING IS STILL THE BUILDING, WEARING SOMETHING.**
 *
 * The third building appearance, and the assertions here are all about the two ways it can be
 * got wrong, which are opposite:
 *
 *  - **it can say too little** — a shell with no volume, or one that does not grow with the
 *    damage, is a state the player cannot see and the difficulty curve cannot show;
 *  - **it can say too much** — a shell that swallows the silhouette reads as a RUIN, which is
 *    the one state it has to be distinguishable from, and a shell that replaced the model
 *    would say the building is gone when the whole claim is that it is still there.
 *
 * The tones and proportions are Evan's to replace and none of it is asserted here as art. What
 * is asserted is what a replacement must not quietly break.
 *
 * ## THE POPULATION IS FOOTPRINTS **AND HEIGHTS**, AND UNTIL 2026-08-01 IT WAS ONLY FOOTPRINTS
 *
 * That is why every assertion in this file was green while the crust buried two buildings. The
 * old shell was `MAX_BUILD_HEIGHT * 0.16 * (step / stages)`, the same 2.56u at stage two for
 * every lot on the island, and the test written for constraint 3 checked it against
 * `MAX_BUILD_HEIGHT * 0.25` and against the neutral scaffold's height. Both are true statements
 * and neither is about a building: the cap is 24u and no era-one building renders past 9.769u,
 * so `2.56 < 6` says nothing at all about the 1.828u Workshop the crust was 140% of.
 *
 * **A footprint is not a height**, which is the whole lesson. Two nodes share a 2x2 and render
 * 4.821u and 9.769u; a 1x1 renders 1.828u. So the sweeps below are over footprints crossed with
 * a ladder of HEIGHTS, and the ladder starts well below anything era one ships rather than at
 * the values it happens to ship, because the invariant is not allowed to depend on which art is
 * loaded. `frostCrustSilhouette.browser.test.tsx` is the other half: it measures the crust
 * against the buildings as they actually render, with their real GLBs, in a drawn scene.
 */

const FOOTPRINTS: readonly Footprint[] = [...Object.values(NODE_FOOTPRINTS)];
const SHAPES = new Set(FOOTPRINTS.map((fp) => `${fp.w}x${fp.d}`));
const MASTERY_GOLD = 0xffb703;

/** The stages the engine actually authors, so this file holds no opinion about the ladder. */
const STAGES = HARD_WINTER.damage.stages;

/**
 * The building heights every rule here is swept over, in world units.
 *
 * From 1u, which is shorter than anything era one renders: a rule that only holds above the
 * shortest shipped building is a rule that fails the day a shorter one is authored. Up to the
 * global cap, which is the tallest a model may render and which no building reaches.
 */
const HEIGHTS: readonly number[] = Array.from(
  { length: 24 },
  (_, index) => 1 + (index * (MAX_BUILD_HEIGHT - 1)) / 23,
);

/** The two ends of the ladder, named because several rules are about the SHORT one. */
const SHORTEST = HEIGHTS[0] as number;

function materialsOf(object: THREE.Object3D): THREE.Material[] {
  const found: THREE.Material[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      found.push(m);
    }
  });
  return found;
}

function colorsOf(object: THREE.Object3D): number[] {
  return materialsOf(object).map((m) => (m as THREE.MeshStandardMaterial).color.getHex());
}

function sizeOf(object: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}

/** The crest of the whole group: the slab plus the half of the lip that stands over it. */
function crestOf(object: THREE.Object3D): number {
  return new THREE.Box3().setFromObject(object).max.y;
}

function shellOrThrow(fp: Footprint, stage: number, height: number): THREE.Object3D {
  const shell = frostShellModel(fp, stage, STAGES, height);
  if (!shell) {
    throw new Error(`no frost shell for stage ${stage} at ${height}u`);
  }
  return shell;
}

describe("the frost seam draws damage as something the building wears", () => {
  it("sweeps every authored footprint, every authored stage and a ladder of heights", () => {
    // Floors, because every sweep below is per-footprint, per-stage and per-height, and one
    // over a shortened list would pass by not looking.
    expect(FOOTPRINTS.length).toBeGreaterThanOrEqual(7);
    expect(SHAPES.size).toBeGreaterThanOrEqual(2);
    expect(STAGES).toBeGreaterThanOrEqual(2);
    expect(HEIGHTS.length).toBeGreaterThanOrEqual(20);
    // The ladder reaches below every building era one renders (the Workshop, 1.828u), so no
    // rule here is allowed to be true only of the art that happens to be loaded.
    expect(SHORTEST).toBeLessThan(1.828);
    expect(Math.max(...HEIGHTS)).toBe(MAX_BUILD_HEIGHT);
  });

  it("draws nothing at all on an unmarked building", () => {
    // The common case by a long way, and the one that has to cost nothing: an undamaged
    // building must not gain a zero-height mesh that still takes a draw call and a pointer.
    for (const fp of FOOTPRINTS) {
      expect(frostShellModel(fp, 0, STAGES, 4)).toBeNull();
      expect(frostShellModel(fp, -1, STAGES, 4)).toBeNull();
    }
  });

  /**
   * AND NOTHING ON A BUILDING NOBODY HAS MEASURED YET, which is the state every lot is in for
   * the frame or two before its GLB resolves. The alternative to answering `null` there is
   * picking a height, and picking one is the defect this parameter exists to end.
   */
  it("draws nothing until the building it is on has been measured", () => {
    for (const fp of FOOTPRINTS) {
      expect(frostShellModel(fp, STAGES, STAGES, 0)).toBeNull();
      expect(frostShellModel(fp, STAGES, STAGES, -3)).toBeNull();
    }
  });

  it.each(FOOTPRINTS)("gives a %o lot a shell with real volume at every stage", (fp) => {
    let measured = 0;
    for (const height of HEIGHTS) {
      for (let stage = 1; stage <= STAGES; stage += 1) {
        const size = sizeOf(shellOrThrow(fp, stage, height));
        expect(size.x, `stage ${stage} width`).toBeGreaterThan(0);
        expect(size.y, `stage ${stage} height at ${height}u`).toBeGreaterThan(0);
        expect(size.z, `stage ${stage} depth`).toBeGreaterThan(0);
        measured += 1;
      }
    }
    expect(measured).toBe(STAGES * HEIGHTS.length);
  });

  /**
   * THE READ, and the thing the whole state is for: how hurt a building is has to be visible
   * from how far the frost has climbed it. A shell that did not grow would be a binary "some
   * damage" flag wearing a three-step costume.
   */
  it.each(FOOTPRINTS)("climbs a %o lot strictly higher at every worse stage", (fp) => {
    for (const height of HEIGHTS) {
      const heights = Array.from(
        { length: STAGES },
        (_, index) => sizeOf(shellOrThrow(fp, index + 1, height)).y,
      );
      expect(heights).toHaveLength(STAGES);
      for (let index = 1; index < heights.length; index += 1) {
        expect(
          heights[index] as number,
          `stage ${index + 1} against ${index} at ${height}u: ${JSON.stringify(heights)}`,
        ).toBeGreaterThan(heights[index - 1] as number);
      }
      // And the climb is worth seeing: the worst stage is at least twice the first.
      expect(heights[heights.length - 1] as number).toBeGreaterThanOrEqual(
        (heights[0] as number) * 2,
      );
    }
  });

  /**
   * **AND IT MUST NOT READ AS A RUIN, WHICH IS CONSTRAINT 3 AND IS ASSERTED AGAINST THE
   * BUILDING RATHER THAN AGAINST THE CAP.**
   *
   * The two states are adjacent in meaning and opposite in consequence (one is repairable this
   * winter and one is not), so the worst damaged building has to stay visibly a building.
   *
   * Half the building is the ruling, and it is stated here rather than derived from
   * {@link MAX_SHELL_RATIO} so that raising that constant past it fails. The tighter claim
   * underneath is the wiring: the crest really is the ratio the constant declares, plus the
   * half-lip that stands over the slab.
   */
  it.each(FOOTPRINTS)("stays under half the building it is on, on a %o lot", (fp) => {
    let checked = 0;
    for (const height of HEIGHTS) {
      const crest = crestOf(shellOrThrow(fp, STAGES, height));
      expect(
        crest,
        `a ${height.toFixed(2)}u building wears a ${crest.toFixed(2)}u crust`,
      ).toBeLessThan(height / 2);
      // The wiring: the slab is the declared fraction and the lip stands over it.
      expect(crest).toBeGreaterThan(height * MAX_SHELL_RATIO);
      expect(crest).toBeLessThan(height * MAX_SHELL_RATIO * 1.15);
      checked += 1;
    }
    expect(checked).toBe(HEIGHTS.length);
  });

  /**
   * **THE CRUST IS A FRACTION OF ITS OWN BUILDING, which is the claim the cap could not make.**
   *
   * Same footprint, two heights, and the two 2x2 buildings era one ships are exactly this case:
   * the Assembly Hall renders 4.821u and the Tower 9.769u on identical plots. Sized against
   * `MAX_BUILD_HEIGHT` both wore the same 2.56u slab, which is 26% of the Tower and 53% of the
   * hall, and on the 1x1 Workshop the same slab was 140% of the building. So this is the
   * assertion that goes red the moment a constant creeps back in, whatever the constant is.
   */
  it.each(FOOTPRINTS)("gives a taller %o building a taller crust", (fp) => {
    for (let stage = 1; stage <= STAGES; stage += 1) {
      const short = sizeOf(shellOrThrow(fp, stage, 2)).y;
      const tall = sizeOf(shellOrThrow(fp, stage, 9)).y;
      expect(
        tall,
        `stage ${stage}: a 9u building's crust is ${tall.toFixed(3)}u and a 2u building's is ${short.toFixed(3)}u`,
      ).toBeGreaterThan(short);
      // And in proportion rather than merely in order: 4.5x the building, 4.5x the crust.
      expect(tall / short).toBeCloseTo(4.5, 5);
    }
  });

  it("scales with the footprint, so a small lot does not wear a big lot's crust", () => {
    const small = sizeOf(shellOrThrow({ w: 1, d: 1 }, STAGES, 4));
    const large = sizeOf(shellOrThrow({ w: 2, d: 2 }, STAGES, 4));
    expect(large.x).toBeGreaterThan(small.x);
    expect(large.z).toBeGreaterThan(small.z);
  });

  it("caches one template per footprint, stage and measured height", () => {
    expect(frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4)).toBe(
      frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4),
    );
    expect(frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4)).not.toBe(
      frostShellModel({ w: 2, d: 2 }, 2, STAGES, 4),
    );
    expect(frostShellModel({ w: 1, d: 1 }, 1, STAGES, 4)).not.toBe(
      frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4),
    );
    // The height is part of the key, or every building on a plot shape would share the first
    // one measured, which is the bug this parameter was added to fix, wearing a cache.
    expect(frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4)).not.toBe(
      frostShellModel({ w: 2, d: 2 }, 1, STAGES, 9),
    );
    // And a measurement that jitters inside the cache's own quantum is the SAME template, so a
    // live measurement cannot grow one per frame.
    expect(frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4)).toBe(
      frostShellModel({ w: 2, d: 2 }, 1, STAGES, 4.001),
    );
  });

  /** The banding, on its own, so the arithmetic is checkable without building geometry. */
  it("bands the crust at the declared fraction of the building", () => {
    expect(frostCrustHeight(10, STAGES, STAGES)).toBeCloseTo(10 * MAX_SHELL_RATIO, 6);
    expect(frostCrustHeight(10, 1, STAGES)).toBeCloseTo((10 * MAX_SHELL_RATIO) / STAGES, 6);
    // Past the last stage it saturates rather than climbing off the building.
    expect(frostCrustHeight(10, STAGES + 4, STAGES)).toBeCloseTo(10 * MAX_SHELL_RATIO, 6);
    expect(frostCrustHeight(0, STAGES, STAGES)).toBe(0);
    expect(frostCrustHeight(-2, STAGES, STAGES)).toBe(0);
    // And the ratio is inside the ruling, so the sweeps above cannot be satisfied by a
    // constant that was raised past what constraint 3 allows.
    expect(MAX_SHELL_RATIO).toBeLessThan(0.45);
    expect(MAX_SHELL_RATIO).toBeGreaterThan(0.1);
  });

  /**
   * IT IS AN OVERLAY AND NOT A SWAP, which is the difference between this seam and the ruin
   * seam and the reason both exist. Nothing here resolves to the ruin template.
   */
  it.each(FOOTPRINTS)("is not the ruin template on a %o lot", (fp) => {
    for (let stage = 1; stage <= STAGES; stage += 1) {
      expect(shellOrThrow(fp, stage, 4)).not.toBe(ruinedStageModel(fp));
    }
  });
});

describe("a frost shell reads by geometry and tone, never by lighting", () => {
  it.each(FOOTPRINTS)("adds no light and no emissive to a %o shell", (fp) => {
    const shell = shellOrThrow(fp, STAGES, 4);
    let lights = 0;
    shell.traverse((child) => {
      if ((child as THREE.Light).isLight) {
        lights += 1;
      }
    });
    expect(lights).toBe(0);

    const mats = materialsOf(shell);
    // A floor under the sweep: a template with no materials would pass the loop vacuously.
    expect(mats.length).toBeGreaterThan(0);
    for (const m of mats) {
      const standard = m as THREE.MeshStandardMaterial;
      expect(standard.emissive?.getHex() ?? 0).toBe(0);
      expect(standard.flatShading).toBe(true);
    }
  });

  /**
   * THE TONES COME OUT OF THE ISLAND'S OWN TABLE, which is what makes this cost no art: a
   * damaged building is the picture the ground already draws, one scale up. A colour invented
   * here would be a new thing to design.
   */
  it("wears the frost the ground wears, and nothing it invented", () => {
    const islandTones = new Set<number>(Object.values(WINTER_GROUND_TONES));
    let checked = 0;
    for (const fp of FOOTPRINTS) {
      for (let stage = 1; stage <= STAGES; stage += 1) {
        const colors = colorsOf(shellOrThrow(fp, stage, 4));
        expect(colors.length).toBeGreaterThan(0);
        for (const color of colors) {
          expect(
            islandTones.has(color),
            `#${color.toString(16)} is not one of the island's winter tones`,
          ).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(FOOTPRINTS.length * STAGES);
  });
});

describe("mastery gold is reserved and never appears on frost", () => {
  it("keeps it out of every rendered material at every stage", () => {
    let checked = 0;
    for (const fp of FOOTPRINTS) {
      for (let stage = 1; stage <= STAGES; stage += 1) {
        for (const color of colorsOf(shellOrThrow(fp, stage, 4))) {
          expect(color).not.toBe(MASTERY_GOLD);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
