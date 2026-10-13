import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { eraCityLayout } from "../../islandLand";
import { ISLAND_GRASS_RADIUS, SEA_RADIUS } from "../../worldLayout";
import {
  cityEnvironment,
  cityEnvironmentFor,
  resolveCrisisLightSpec,
  resolveLightSpec,
} from "../CityLighting";
import { maxViewDistance } from "../orbitCamera";
import { WINTER_LIGHT } from "../winterTones";
import { atmosphereFogRange, atmosphereLightSpec } from "./atmosphere";
import { CRISIS_ENTRIES, crisisAtmosphere } from "./registry";
import { SUCCESSION_LIGHT } from "./succession";

/**
 * **THE ATMOSPHERE SEAM: era one unchanged by the extraction, and a second crisis through it.**
 *
 * `winterCamera.test.ts` already owns era one's own claims about the overcast rig — the key:fill
 * ratio, the daytime read, the fog against the dolly's worst case. Nothing here restates them.
 * What this file asserts is the two things that only became claims when the preset became a seam:
 * that era one resolves to exactly the digits it always did, and that the seam is general enough
 * to carry a preset era one would not recognise.
 */

/* -------------------------------------------------------------------------- */
/* Era one is unchanged                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Era one's resolved rig, written out as literals rather than derived from `WINTER_LIGHT`.
 *
 * **Deriving them would make this test tautological**, which is the trap a regression net for an
 * extraction falls into most easily: `expect(resolve(WINTER_LIGHT)).toEqual(mapOf(WINTER_LIGHT))`
 * passes whatever either side does. These are the digits as they stood at `382c6da0`, before the
 * seam existed, so the assertion is against the tree this pass promised not to move.
 */
const ERA_ONE_AT_382C6DA0 = {
  hemiSky: "#e6eaea",
  hemiGround: "#c4d1d6",
  hemiIntensity: 0.88,
  ambient: "#d8dee0",
  ambientIntensity: 0.46,
  key: "#f4f7f6",
  keyIntensity: 0.58,
  rim: "#c9d6dc",
  rimIntensity: 0.34,
} as const;

describe("era one's rig is exactly what it was before the preset became a seam", () => {
  it("resolves the same nine numbers through the boolean shorthand", () => {
    expect(resolveLightSpec("day", true)).toEqual(ERA_ONE_AT_382C6DA0);
  });

  it("resolves the same nine numbers through the general form", () => {
    expect(resolveCrisisLightSpec("day", WINTER_LIGHT)).toEqual(ERA_ONE_AT_382C6DA0);
    expect(resolveCrisisLightSpec("day", crisisAtmosphere("prehistoric"))).toEqual(
      ERA_ONE_AT_382C6DA0,
    );
  });

  it("keeps the four controls beyond the nine at their shipped values", () => {
    // The exposure, the shadow term and the two position moves: the four
    // `crisis-reference-packs/README.md` section 1a says the briefs understated the lever by.
    expect(WINTER_LIGHT.exposure).toBe(0.92);
    expect(WINTER_LIGHT.key.shadowIntensity).toBe(0.55);
    expect(WINTER_LIGHT.key.posRatio).toEqual([1.16, 1.3, 0.87]);
    expect(WINTER_LIGHT.fill.posRatio).toEqual([0.88, 1.16, 1.04]);
    expect(WINTER_LIGHT.fog).toEqual({ color: 0xd5dad8, nearRatio: 1.4, farRatio: 10 });
    expect(WINTER_LIGHT.sky).toBe(0xdce0de);
  });

  it("keeps the environment override to the two fields it always owned", () => {
    const fair = cityEnvironment("day", false);
    const winter = cityEnvironment("day", true);
    expect(winter).toEqual({
      ...fair,
      background: "#dce0de",
      fog: "#d5dad8",
    });
    // And the general form is the same call. The boolean is a shorthand, not a second path.
    expect(cityEnvironmentFor("day", WINTER_LIGHT)).toEqual(winter);
  });
});

/* -------------------------------------------------------------------------- */
/* The exit is the absence of a preset                                        */
/* -------------------------------------------------------------------------- */

describe("no crisis is the fair-weather answer untouched, in every variant", () => {
  it("hands back the variant's own rig and environment for null", () => {
    for (const variant of ["day", "night", "colorblind"] as const) {
      expect(resolveCrisisLightSpec(variant, null)).toEqual(
        resolveLightSpec(variant, false),
      );
      expect(cityEnvironmentFor(variant, null)).toEqual(cityEnvironment(variant, false));
    }
    // The claim has teeth only if a crisis actually moves these, which it does.
    expect(resolveCrisisLightSpec("day", WINTER_LIGHT)).not.toEqual(
      resolveCrisisLightSpec("day", null),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The seam is general, not a winter with a name                              */
/* -------------------------------------------------------------------------- */

describe("a second crisis resolves through the same seam", () => {
  it("carries era four's preset with no new control", () => {
    const succession = atmosphereLightSpec(SUCCESSION_LIGHT);
    const winter = atmosphereLightSpec(WINTER_LIGHT);
    // Same nine fields, all nine different. A preset that agreed with era one anywhere would be
    // era one's weather under another name.
    expect(Object.keys(succession).sort()).toEqual(Object.keys(winter).sort());
    for (const field of Object.keys(succession) as (keyof typeof succession)[]) {
      expect(succession[field], field).not.toEqual(winter[field]);
    }
  });

  it("drives three levers in the direction era one never did", () => {
    // THIS IS THE EVIDENCE THAT THE TABLE IS NOT ERA-ONE-SHAPED. A field only ever driven one way
    // is a field whose range nobody has tested, and all three of these are fields era one moves
    // down where era four's brief moves them up.
    const fair = resolveLightSpec("day", false);

    // 1. Key intensity: era one drops it hard, era four raises it.
    expect(WINTER_LIGHT.key.intensity).toBeLessThan(fair.keyIntensity);
    expect(SUCCESSION_LIGHT.key.intensity).toBeGreaterThan(fair.keyIntensity);

    // 2. Fog near plane: era one pulls the haze in past the shore, era four pushes it out for
    //    clarity, and the fair-weather rig sits between them at 3.
    expect(WINTER_LIGHT.fog.nearRatio).toBeLessThan(3);
    expect(SUCCESSION_LIGHT.fog.nearRatio).toBeGreaterThan(3);

    // 3. Key elevation: era four's single most identifying lever, "high, close to overhead".
    //    Measured off the shipped rig's own key position rather than off the ratio triple, since
    //    the ratio is a multiplier and the angle is what the brief actually specifies.
    const KEY_POS = [-1.5, 2.1, 1.25] as const;
    const elevation = (move: readonly [number, number, number]): number => {
      const x = KEY_POS[0] * move[0];
      const y = KEY_POS[1] * move[1];
      const z = KEY_POS[2] * move[2];
      return THREE.MathUtils.radToDeg(Math.atan2(y, Math.hypot(x, z)));
    };
    const fairElevation = elevation([1, 1, 1]);
    expect(elevation(SUCCESSION_LIGHT.key.posRatio)).toBeGreaterThan(70);
    expect(elevation(SUCCESSION_LIGHT.key.posRatio)).toBeGreaterThan(fairElevation);
    // Era one raises the key too, but nothing like as far: 53 degrees against 77.
    expect(elevation(WINTER_LIGHT.key.posRatio)).toBeLessThan(60);
  });

  it("keeps era four's hard shadow while era one's goes shallow", () => {
    expect(SUCCESSION_LIGHT.key.shadowIntensity).toBe(1);
    expect(WINTER_LIGHT.key.shadowIntensity).toBeLessThan(1);
  });
});

/* -------------------------------------------------------------------------- */
/* What every registered preset owes                                          */
/* -------------------------------------------------------------------------- */

/** Every leaf value of a preset, so a claim about how many controls it has can be checked. */
function leaves(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, path === "" ? key : `${path}.${key}`),
    );
  }
  return [path];
}

describe("every registered preset stays inside the renderer's boundary", () => {
  it("has at least two presets to sweep", () => {
    // The floor for every sweep below. A rule swept over one preset is a rule about that preset.
    expect(CRISIS_ENTRIES.length).toBeGreaterThanOrEqual(2);
  });

  it("spends exactly twenty-one values, and every preset spends the same twenty-one", () => {
    // A COUNT IN PROSE GOES STALE, and three of this pass's own docblocks did before this guard
    // existed; the very sentence it checks was wrong twice, first at thirteen and then at
    // seventeen, because a light position is three numbers and reads as one control. Here is the
    // count, taken off the shipped preset, plus the census that stops two presets carrying
    // different fields and both clearing it.
    const shipped = leaves(WINTER_LIGHT).sort();
    expect(shipped).toHaveLength(21);
    expect(shipped).toContain("key.posRatio[2]");
    expect(shipped).toContain("fog.farRatio");
    for (const entry of CRISIS_ENTRIES) {
      expect(leaves(entry.atmosphere).sort(), entry.eraId).toEqual(shipped);
    }
  });

  it("never puts the whole island past the fog at full zoom-out", () => {
    // The measurement `WINTER_LIGHT.fog` records for era one, generalised to the registry: the
    // camera dollies to 2.6x and may pan the island off centre, so a far plane sized to the
    // default framing can wash the island out entirely at the far end of the dolly.
    //
    // The same three arguments `winterCamera.test.ts` passes for era one, so the two agree by
    // construction rather than by two people picking the same numbers.
    const worst = maxViewDistance(
      eraCityLayout("prehistoric").cameraDistance,
      SEA_RADIUS,
      ISLAND_GRASS_RADIUS * 0.72,
    );
    expect(worst).toBeGreaterThan(250);
    for (const entry of CRISIS_ENTRIES) {
      const { near, far } = atmosphereFogRange(entry.atmosphere, ISLAND_GRASS_RADIUS);
      expect(far, `${entry.eraId} fog far`).toBeGreaterThan(worst);
      expect(near, `${entry.eraId} fog near`).toBeLessThan(far);
      expect(near, `${entry.eraId} fog near`).toBeGreaterThan(0);
    }
  });

  it("spends no reserved colour on the sky, the fog or any of the four lights", () => {
    // Mastery gold is reserved across the whole game, and the correctness palette carries the
    // learner's verdict. A crisis that lit the island in one of them would be borrowing a
    // meaning it is not making.
    const RESERVED = [0xffb703, 0x2e7d32, 0xb3261e];
    for (const entry of CRISIS_ENTRIES) {
      const a = entry.atmosphere;
      const colours = [
        a.sky,
        a.fog.color,
        a.hemi.sky,
        a.hemi.ground,
        a.ambient.color,
        a.key.color,
        a.fill.color,
      ];
      expect(colours, `${entry.eraId} colour count`).toHaveLength(7);
      for (const colour of colours) {
        expect(RESERVED, `${entry.eraId} spends a reserved colour`).not.toContain(colour);
      }
    }
  });

  it("keeps every light term positive, so no preset switches a lamp off", () => {
    // The budget is four lights scene-wide. Turning one to zero is removing a light by another
    // route, which is the one thing a preset may not do.
    for (const entry of CRISIS_ENTRIES) {
      const a = entry.atmosphere;
      for (const [name, value] of [
        ["hemi", a.hemi.intensity],
        ["ambient", a.ambient.intensity],
        ["key", a.key.intensity],
        ["fill", a.fill.intensity],
        ["exposure", a.exposure],
      ] as const) {
        expect(value, `${entry.eraId} ${name}`).toBeGreaterThan(0);
      }
    }
  });
});
