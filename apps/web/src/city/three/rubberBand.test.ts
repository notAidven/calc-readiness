import { describe, expect, it } from "vitest";

import {
  clampControlsToBounds,
  type OrbitControlsLike,
  resistControlsPan,
  settleControlsToBounds,
} from "./applyOrbit";
import {
  overscrollAllowance,
  overscrolledPosition,
  overscrollResistance,
  SETTLE_EPSILON,
  settledPosition,
  settleOvershoot,
  VILLAGE_CAMERA,
} from "./orbitCamera";

/**
 * The camera's elastic edges.
 *
 * The City Art Bible's locked decision asked for pan and zoom with a "gentle
 * rubber-band". What shipped was a hard clamp: the camera stopped dead at the island
 * bound. These tests pin the elasticity that replaced it, and — just as importantly —
 * pin that it VANISHES under reduced motion, which Art Bible §11 requires and names
 * the rubber-band specifically as an example of.
 *
 * Everything under test is pure arithmetic, so the feel cannot be asserted here, but
 * every property that produces the feel can: that resistance rises with overshoot,
 * that the stretch is bounded, that the return is frame-rate independent and
 * terminates exactly on the bound, and that a zero allowance is byte-for-byte the old
 * hard clamp.
 */

const MAX_OVERSCROLL = 10;

describe("overscrollResistance", () => {
  it("is the configured stiffness right at the bound and zero at full stretch", () => {
    expect(overscrollResistance(0, MAX_OVERSCROLL)).toBeCloseTo(
      VILLAGE_CAMERA.overscrollStiffness,
      10,
    );
    expect(overscrollResistance(MAX_OVERSCROLL, MAX_OVERSCROLL)).toBe(0);
    // Past the maximum it stays pinned at zero rather than going negative.
    expect(overscrollResistance(MAX_OVERSCROLL * 2, MAX_OVERSCROLL)).toBe(0);
  });

  it("falls monotonically as the band stretches, so the edge feels progressively firmer", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let overshoot = 0; overshoot <= MAX_OVERSCROLL; overshoot += 0.5) {
      const resistance = overscrollResistance(overshoot, MAX_OVERSCROLL);
      expect(resistance).toBeLessThan(previous);
      expect(resistance).toBeGreaterThanOrEqual(0);
      previous = resistance;
    }
  });

  it("is zero for a zero allowance — the single switch reduced motion flips", () => {
    expect(overscrollResistance(0, 0)).toBe(0);
    expect(overscrollResistance(5, 0)).toBe(0);
  });
});

describe("overscrolledPosition", () => {
  it("leaves movement inside the play area completely untouched", () => {
    expect(overscrolledPosition(0, 5, -20, 20, MAX_OVERSCROLL)).toBe(5);
    expect(overscrolledPosition(-19, -19.5, -20, 20, MAX_OVERSCROLL)).toBe(-19.5);
  });

  it("lets the camera travel PAST the bound, but less far than asked", () => {
    // The defining difference from the hard clamp: a drag to 30 against a bound of
    // 20 neither stops at 20 nor arrives at 30.
    const landed = overscrolledPosition(20, 30, -20, 20, MAX_OVERSCROLL);
    expect(landed).toBeGreaterThan(20);
    expect(landed).toBeLessThan(30);
  });

  it("never stretches beyond the maximum overscroll, however hard it is dragged", () => {
    let value = 20;
    for (let i = 0; i < 500; i += 1) {
      value = overscrolledPosition(value, value + 25, -20, 20, MAX_OVERSCROLL);
    }
    expect(value).toBeLessThanOrEqual(20 + MAX_OVERSCROLL + 1e-9);
    // ...and it does get close to the wall, rather than stalling early.
    expect(value).toBeGreaterThan(20 + MAX_OVERSCROLL * 0.9);
  });

  it("moves less and less for the same drag as the band stretches", () => {
    const step = 2;
    let value = 20;
    const gains: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const next = overscrolledPosition(value, value + step, -20, 20, MAX_OVERSCROLL);
      gains.push(next - value);
      value = next;
    }
    for (let i = 1; i < gains.length; i += 1) {
      expect(gains[i] as number).toBeLessThan(gains[i - 1] as number);
    }
    // The first bite of resistance is the configured stiffness.
    expect(gains[0] as number).toBeCloseTo(step * VILLAGE_CAMERA.overscrollStiffness, 10);
  });

  it("does not resist the way back in — the band releases freely", () => {
    const stretched = 26;
    expect(overscrolledPosition(stretched, 22, -20, 20, MAX_OVERSCROLL)).toBe(22);
    expect(overscrolledPosition(stretched, 10, -20, 20, MAX_OVERSCROLL)).toBe(10);
  });

  it("behaves identically at the minimum bound (mirror image)", () => {
    const high = overscrolledPosition(20, 30, -20, 20, MAX_OVERSCROLL);
    const low = overscrolledPosition(-20, -30, -20, 20, MAX_OVERSCROLL);
    expect(low).toBeCloseTo(-high, 10);
  });

  it("IS the old hard clamp when the allowance is zero (the reduced-motion path)", () => {
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    for (const proposed of [-100, -21, -20, -3, 0, 7, 20, 21, 100]) {
      expect(overscrolledPosition(0, proposed, -20, 20, 0)).toBe(clamp(proposed, -20, 20));
    }
  });
});

describe("settleOvershoot / settledPosition", () => {
  it("decays the stretch toward the bound", () => {
    const first = settleOvershoot(10, 1 / 60);
    expect(first).toBeLessThan(10);
    expect(first).toBeGreaterThan(0);
    expect(settleOvershoot(first, 1 / 60)).toBeLessThan(first);
  });

  it("is frame-rate independent: two half-steps equal one whole step", () => {
    const oneStep = settleOvershoot(10, 0.1);
    const twoHalves = settleOvershoot(settleOvershoot(10, 0.05), 0.05);
    expect(twoHalves).toBeCloseTo(oneStep, 10);
  });

  it("terminates exactly on the bound instead of decaying forever", () => {
    let overshoot = 10;
    let frames = 0;
    while (overshoot > 0 && frames < 1000) {
      overshoot = settleOvershoot(overshoot, 1 / 60);
      frames += 1;
    }
    expect(overshoot).toBe(0);
    // At ~60fps this should take a fraction of a second, not seconds.
    expect(frames).toBeLessThan(60);
  });

  it("snaps a sub-epsilon remainder straight to zero", () => {
    expect(settleOvershoot(SETTLE_EPSILON / 2, 1 / 60)).toBe(0);
  });

  it("returns a value already inside its bounds untouched", () => {
    expect(settledPosition(5, -20, 20, 1 / 60)).toBe(5);
    expect(settledPosition(-20, -20, 20, 1 / 60)).toBe(-20);
  });

  it("eases an overshoot back to the bound it exceeded, from either side", () => {
    expect(settledPosition(26, -20, 20, 1 / 60)).toBeLessThan(26);
    expect(settledPosition(26, -20, 20, 1 / 60)).toBeGreaterThan(20);
    expect(settledPosition(-26, -20, 20, 1 / 60)).toBeGreaterThan(-26);
    expect(settledPosition(-26, -20, 20, 1 / 60)).toBeLessThan(-20);
  });
});

describe("overscrollAllowance", () => {
  it("is zero under reduced motion, and proportional otherwise", () => {
    expect(overscrollAllowance(100, 0.12, true)).toBe(0);
    expect(overscrollAllowance(100, 0.12, false)).toBeCloseTo(12, 10);
  });

  it("is never negative, even for a negative limit", () => {
    expect(overscrollAllowance(-100, 0.12, false)).toBeCloseTo(12, 10);
  });
});

describe("the depth budget the overscroll has to live inside", () => {
  it("keeps both overscroll ratios small enough for depthPrecision.test.ts", () => {
    // Overscroll pushes the camera further from the scene, which costs depth
    // precision (#152). Those two tests pin the road layer's z-fight margin against
    // the OVERSCROLLED worst case, and the margin is ~4.4 steps against a bar of 4 —
    // so the ratios below are a ceiling, not a preference. See the comment on
    // `panOverscrollRatio`.
    expect(VILLAGE_CAMERA.panOverscrollRatio).toBeLessThanOrEqual(0.15);
    expect(VILLAGE_CAMERA.zoomOverscrollRatio).toBeLessThanOrEqual(0.1);
    expect(VILLAGE_CAMERA.panOverscrollRatio).toBeGreaterThan(0);
    expect(VILLAGE_CAMERA.zoomOverscrollRatio).toBeGreaterThan(0);
  });
});

function fakeControls(): OrbitControlsLike {
  return {
    object: { position: { x: 0, y: 30, z: 30 } },
    target: { x: 0, y: 0, z: 0 },
    minDistance: 6,
    maxDistance: 400,
    getAzimuthalAngle: () => 0,
    setAzimuthalAngle: () => {},
    update: () => {},
    reset: () => {},
  };
}

describe("the live camera seam", () => {
  const BOUND = 20;

  it("lets a drag past the island edge stretch, where it used to stop dead", () => {
    const controls = fakeControls();
    const before = { x: controls.target.x, z: controls.target.z };
    // The controls have just panned the target well past the bound.
    controls.target.x = 40;
    controls.object.position.x = 40;
    resistControlsPan(controls, before, BOUND, MAX_OVERSCROLL);

    expect(controls.target.x).toBeGreaterThan(BOUND);
    expect(controls.target.x).toBeLessThanOrEqual(BOUND + MAX_OVERSCROLL + 1e-9);
  });

  it("carries the camera with the target so the framing never shifts", () => {
    const controls = fakeControls();
    const before = { x: controls.target.x, z: controls.target.z };
    const offsetX = controls.object.position.x - controls.target.x;
    const offsetZ = controls.object.position.z - controls.target.z;
    controls.target.x = 40;
    controls.object.position.x = 40 + offsetX;
    resistControlsPan(controls, before, BOUND, MAX_OVERSCROLL);

    expect(controls.object.position.x - controls.target.x).toBeCloseTo(offsetX, 10);
    expect(controls.object.position.z - controls.target.z).toBeCloseTo(offsetZ, 10);
  });

  it("settles a stretched target back to exactly the bound, and then stops", () => {
    const controls = fakeControls();
    controls.target.x = BOUND + 6;
    controls.object.position.x = BOUND + 6;

    let moving = true;
    let frames = 0;
    while (moving && frames < 600) {
      moving = settleControlsToBounds(controls, BOUND, 1 / 60);
      frames += 1;
    }
    expect(controls.target.x).toBe(BOUND);
    expect(frames).toBeLessThan(60);
    // Idempotent once home: further frames report nothing left to do.
    expect(settleControlsToBounds(controls, BOUND, 1 / 60)).toBe(false);
  });

  it("REDUCED MOTION: a zero allowance stops the target dead at the bound", () => {
    const controls = fakeControls();
    const before = { x: controls.target.x, z: controls.target.z };
    controls.target.x = 40;
    controls.object.position.x = 40;
    resistControlsPan(controls, before, BOUND, 0);

    expect(controls.target.x).toBe(BOUND);
    // Nothing is ever left outside, so the settle has no work and never animates.
    expect(settleControlsToBounds(controls, BOUND, 1 / 60)).toBe(false);
  });

  /**
   * Regression: the elastic clamp once ran the resistance curve with `current` and
   * `proposed` set to the same value, which the "releasing tension" branch reads as
   * inward movement — so a target already past the envelope was returned untouched
   * and nothing was bounded at all. The guard has no delta to resist; it is a hard
   * clamp onto the envelope's outer edge.
   */
  it("pulls a target that is already outside the envelope back onto its edge", () => {
    const controls = fakeControls();
    controls.target.x = 500;
    controls.target.z = -500;
    clampControlsToBounds(controls, BOUND, MAX_OVERSCROLL);
    expect(controls.target.x).toBe(BOUND + MAX_OVERSCROLL);
    expect(controls.target.z).toBe(-(BOUND + MAX_OVERSCROLL));
  });

  it("REDUCED MOTION: the default clamp is still the hard wall it always was", () => {
    const controls = fakeControls();
    controls.target.x = 100;
    controls.target.z = -80;
    clampControlsToBounds(controls, BOUND);
    expect(controls.target.x).toBe(BOUND);
    expect(controls.target.z).toBe(-BOUND);
  });

  /**
   * The whole reduced-motion chain in one assertion, because the two halves are in
   * different modules and a regression could hide in either: the preference decides
   * the allowance (`overscrollAllowance`), and the allowance decides whether the edge
   * gives (`resistControlsPan`). `CityScene` wires exactly this, so a break anywhere
   * along it lands here rather than only in a live browser with the OS preference on.
   */
  it.each([
    { reducedMotion: true, label: "stops dead" },
    { reducedMotion: false, label: "stretches" },
  ])("REDUCED MOTION end to end: $reducedMotion -> $label", ({ reducedMotion }) => {
    const allowance = overscrollAllowance(
      BOUND,
      VILLAGE_CAMERA.panOverscrollRatio,
      reducedMotion,
    );
    const controls = fakeControls();
    const before = { x: controls.target.x, z: controls.target.z };
    controls.target.x = 40;
    controls.object.position.x = 40;
    resistControlsPan(controls, before, BOUND, allowance);

    if (reducedMotion) {
      expect(allowance).toBe(0);
      expect(controls.target.x).toBe(BOUND);
    } else {
      expect(allowance).toBeGreaterThan(0);
      expect(controls.target.x).toBeGreaterThan(BOUND);
    }
  });
});
