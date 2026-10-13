import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { eraCityLayout } from "../islandLand";
import { ISLAND_GRASS_RADIUS, SEA_RADIUS } from "../worldLayout";
import { resolveLightSpec } from "./CityLighting";
import { atmosphereFogRange } from "./crisis/atmosphere";
import { INTRUSION_MARK_TONES, INTRUSION_SCENE_TONES } from "./intrusion-tones";
import { INTRUSION_LIGHT } from "./intrusionLight";
import { maxViewDistance } from "./orbitCamera";

/**
 * **THE BARRIER-TONE RULING, HELD OVER THE TABLE THE RENDERER ACTUALLY READS.**
 *
 * `test/intrusionPlateTones.test.ts` holds it over the six reference PLATES, and its own header
 * says what that leaves open: it *"guards the plates rather than a renderer"*, because when it
 * was written there was no renderer. There is one now, and these are the same two rules with the
 * same two reference points, applied to `intrusion-tones.ts`.
 *
 * **Neither reference point is written down.** Both are read off era nine's own palette, so a
 * retone moves the guard with it rather than leaving it measuring a tree that has gone.
 *
 * ## THE MEASUREMENTS THE RULING RECORDED, REPRODUCED RATHER THAN RESTATED
 *
 * The prompt sheet writes four numbers into the ruling and all four come back off the shipped
 * table, which is what makes *"honoured"* checkable: the ground family's warm end at **-15**, the
 * saturation ceiling at **0.297**, the clad post's value step off the floor at **0.229** — WIDER
 * than the rust barrier's 0.197 — and the void as the darkest thing on the paving at **0.031**
 * against the floor's **0.373**.
 *
 * ## AND THE ATMOSPHERE, WHICH IS THE HALF THAT WAS CHOSEN
 *
 * `intrusionLight.ts` is the one file in this pair whose numbers are judgements: §2.1 gives
 * directions rather than digits. The last block pins the claims those judgements make, so an
 * overrule is a red test rather than a silent drift.
 */

/** Blue minus red: the cast, the same measure the plate guard takes. */
function cast(hex: number): number {
  return (hex & 0xff) - ((hex >> 16) & 0xff);
}

/** HSL saturation, through the same library and channel the plate guard reads. */
function saturation(hex: number): number {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return hsl.s;
}

function luminance(hex: number): number {
  const colour = new THREE.Color(hex);
  return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
}

const hex = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;

/** Every tone era nine authors, derived from the two exported tables rather than listed. */
const TONES: readonly (readonly [string, number])[] = [
  ...Object.entries(INTRUSION_SCENE_TONES).map(
    ([name, value]) => [`scene.${name}`, value] as const,
  ),
  ...Object.entries(INTRUSION_MARK_TONES).map(
    ([name, value]) => [`mark.${name}`, value] as const,
  ),
];

/**
 * **THE TWO TONES THAT GENUINELY DO NOT OWE THE CHROMA RULE, NAMED WITH THEIR REASON.**
 *
 * The status panel is the crisis's whole instrument and the brief spends the frame's exposure
 * budget on making it the brightest thing there is. **Neither is a colour** — their casts are
 * `+32` and `+11`, so the warm rule holds over both — and it is only HSL saturation that a
 * near-white trips, which is a fact about the measure rather than about the picture.
 *
 * They are exactly the two `test/intrusionPlateTones.test.ts` excuses over the plates, for
 * exactly the same reason. Two independently written sweeps over two different populations
 * arriving at the same pair makes the exemption a property of era nine's design rather than of
 * either implementation.
 *
 * **Asserted as a CENSUS in both directions**, so a tone that stops needing excusing cannot sit
 * here excusing nothing, and one that starts needing it cannot be quietly absent.
 */
const OVER_THE_CHROMA_CEILING: readonly (readonly [name: string, why: string])[] = [
  [
    "mark.PANEL_FACE",
    "the status panel's lit face, which the brief makes the brightest thing in the frame",
  ],
  [
    "mark.PANEL_BAR",
    "a lit bar standing on that face, near-white, which is what trips an HSL measure",
  ],
];

describe("era nine's shipped tones are its own palette and nothing warmer", () => {
  const floorCast = cast(INTRUSION_SCENE_TONES.PAVING);
  const chromaCeiling = saturation(INTRUSION_SCENE_TONES.GLASS);

  it("sweeps a population derived from the tables, with floors under it", () => {
    expect(TONES.length).toBeGreaterThanOrEqual(28);
    expect(OVER_THE_CHROMA_CEILING.length).toBeLessThanOrEqual(3);
    expect(TONES.length - OVER_THE_CHROMA_CEILING.length).toBeGreaterThanOrEqual(25);
    for (const [name, value] of TONES) {
      expect(Number.isInteger(value), name).toBe(true);
      expect(value, name).toBeGreaterThanOrEqual(0);
      expect(value, name).toBeLessThanOrEqual(0xffffff);
    }
  });

  it("reads its two reference points off era nine's own palette", () => {
    // Both rules are relative, so if either reference point stops being what the ruling assumes,
    // the rule below it means nothing. This is where that fails rather than silently passing.
    expect(floorCast, "era nine's floor is no longer the warm end of its palette").toBe(
      -15,
    );
    expect(
      chromaCeiling,
      "era nine's accent is no longer the low-chroma ceiling",
    ).toBeCloseTo(0.297, 3);
  });

  it("has nothing warmer than the floor, and needs no exception at all", () => {
    // THE RULING'S OWN SPLIT: era nine's ground family runs -15 to -9 and everything built or
    // added runs +6 to +41. The two retired rust barriers sat at -126 and -138, which is what
    // put them outside it.
    const warmer = TONES.filter(([, value]) => cast(value) < floorCast).map(
      ([name, value]) => `${name} ${hex(value)} at ${cast(value)}`,
    );
    expect(warmer, `against a floor cast of ${floorCast}`).toEqual([]);
    expect(Math.max(...TONES.map(([, value]) => cast(value)))).toBe(41);
  });

  it("has exactly the named exceptions over the chroma ceiling, and no others", () => {
    const measured = TONES.filter(([, value]) => saturation(value) > chromaCeiling)
      .map(([name]) => name)
      .sort();
    expect(measured, `against a ceiling of ${chromaCeiling.toFixed(3)}`).toEqual(
      OVER_THE_CHROMA_CEILING.map(([name]) => name).sort(),
    );
    // The other direction: an excused name that is not in the tables excuses nothing.
    const known = new Set(TONES.map(([name]) => name));
    for (const [name, why] of OVER_THE_CHROMA_CEILING) {
      expect(known, `${name} is excused and authored nowhere`).toContain(name);
      expect(why.length).toBeGreaterThan(30);
    }
  });

  it("reproduces the measurements that made dropping the rust orange safe", () => {
    const floor = luminance(INTRUSION_SCENE_TONES.PAVING);
    // The read did not weaken: the clad post is a WIDER step off the floor on value than the
    // rust one was, 0.229 against 0.197.
    expect(floor - luminance(INTRUSION_MARK_TONES.BARRIER_POST)).toBeCloseTo(0.229, 3);
    expect(floor - luminance(INTRUSION_MARK_TONES.BARRIER_POST)).toBeGreaterThan(0.197);
    // And the void is the widest step off the floor there is on the ground.
    expect(floor).toBeCloseTo(0.373, 3);
    expect(luminance(INTRUSION_MARK_TONES.VOID)).toBeCloseTo(0.031, 3);
    expect(floor - luminance(INTRUSION_MARK_TONES.VOID)).toBeGreaterThan(
      floor - luminance(INTRUSION_MARK_TONES.BARRIER_POST),
    );
    // ...and the rail is the town's own clad panel with the posts its right face, computed the
    // way the plate generator computes `FaceRight`, so the two cannot drift apart.
    const right =
      ((Math.round(((INTRUSION_MARK_TONES.BARRIER_RAIL >> 16) & 0xff) * 0.72) & 0xff) <<
        16) |
      ((Math.round(((INTRUSION_MARK_TONES.BARRIER_RAIL >> 8) & 0xff) * 0.72) & 0xff) << 8) |
      (Math.round((INTRUSION_MARK_TONES.BARRIER_RAIL & 0xff) * 0.72) & 0xff);
    expect(INTRUSION_MARK_TONES.BARRIER_POST).toBe(right);
    expect(hex(INTRUSION_MARK_TONES.BARRIER_RAIL)).toBe("#8b959c");
    expect(hex(INTRUSION_MARK_TONES.BARRIER_POST)).toBe("#646b70");
    // And the blanking plates are the SAME material, which is the other half of the ruling.
    expect(INTRUSION_MARK_TONES.BLANKING_PANEL).toBe(INTRUSION_MARK_TONES.BARRIER_RAIL);
  });

  it("draws neither retired rust tone anywhere", () => {
    for (const retired of [0xb8593a, 0xc9663f]) {
      expect(TONES.map(([, value]) => value)).not.toContain(retired);
      // ...and each is as warm and as saturated as the ruling recorded, so this is naming the
      // tones the ruling was about rather than two arbitrary numbers.
      expect(cast(retired)).toBeLessThan(-120);
      expect(saturation(retired)).toBeGreaterThan(0.8);
    }
  });
});

describe("era nine's atmosphere is the shared table with era nine's numbers in it", () => {
  it("spends the same twenty-one values every other preset spends", () => {
    const leaves = (value: unknown, path = ""): string[] => {
      if (Array.isArray(value)) {
        return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
      }
      if (value !== null && typeof value === "object") {
        return Object.entries(value).flatMap(([key, child]) =>
          leaves(child, path === "" ? key : `${path}.${key}`),
        );
      }
      return [path];
    };
    expect(leaves(INTRUSION_LIGHT)).toHaveLength(21);
  });

  it("takes the key DOWN in elevation, which no preset had done before", () => {
    // *"Low and flat. Long soft shadows across a precise floor."* Era one raises its key to about
    // 53 degrees and era four to about 77, both ABOVE the fair-weather rig's 47. Era nine is the
    // first to go under it, so the control has now been driven both ways.
    const KEY_POS = [-1.5, 2.1, 1.25] as const;
    const elevation = (move: readonly [number, number, number]): number => {
      const x = KEY_POS[0] * move[0];
      const y = KEY_POS[1] * move[1];
      const z = KEY_POS[2] * move[2];
      return THREE.MathUtils.radToDeg(Math.atan2(y, Math.hypot(x, z)));
    };
    const fair = elevation([1, 1, 1]);
    const eraNine = elevation(INTRUSION_LIGHT.key.posRatio);
    expect(fair).toBeGreaterThan(46);
    expect(eraNine).toBeLessThan(fair);
    expect(eraNine).toBeGreaterThan(30);
    expect(eraNine).toBeLessThan(40);
  });

  it("keeps the key neutral, which is what the brief asked for in one word", () => {
    // *"Neutral grey. Era nine's palette is anodised grey-blue and warmth is foreign to it."*
    // Dead neutral is a claim a test can check, and era one's and era four's keys are both
    // tinted, so this is the first one in the registry that is not.
    const key = INTRUSION_LIGHT.key.color;
    expect((key >> 16) & 0xff).toBe((key >> 8) & 0xff);
    expect((key >> 8) & 0xff).toBe(key & 0xff);
    // ...and it is dimmer than fair weather, so the emissive panels have something to be
    // brighter than.
    expect(INTRUSION_LIGHT.key.intensity).toBeLessThan(
      resolveLightSpec("day", false).keyIntensity,
    );
  });

  it("pulls the far fog plane in without putting the island past it", () => {
    // *"Pull the far plane in a little. Era nine wants the town legible and the world beyond it
    // indistinct."* The measurement `WINTER_LIGHT.fog` records for era one, taken again: the
    // camera dollies to 2.6x and may pan the island off centre, so a far plane sized to the
    // default framing can wash the whole island out at the far end of the dolly.
    const worst = maxViewDistance(
      eraCityLayout("prehistoric").cameraDistance,
      SEA_RADIUS,
      ISLAND_GRASS_RADIUS * 0.72,
    );
    const { near, far } = atmosphereFogRange(INTRUSION_LIGHT, ISLAND_GRASS_RADIUS);
    expect(INTRUSION_LIGHT.fog.farRatio).toBeLessThan(20);
    expect(far).toBeGreaterThan(worst);
    expect(near).toBeLessThan(far);
    expect(near).toBeGreaterThan(0);
  });

  it("lights the island in the era's own sky, haze and paving rather than in new colours", () => {
    // Three of the preset's numbers are QUOTED from the palette rather than chosen, and this is
    // where that stops being a docblock claim. The hemisphere's ground is the third and the
    // least obvious: a hemisphere light's second colour is the colour the ground actually is.
    expect(INTRUSION_LIGHT.sky).toBe(INTRUSION_SCENE_TONES.SKY_LATE);
    expect(INTRUSION_LIGHT.fog.color).toBe(INTRUSION_SCENE_TONES.HAZE);
    expect(INTRUSION_LIGHT.hemi.ground).toBe(INTRUSION_SCENE_TONES.PAVING);
  });
});
