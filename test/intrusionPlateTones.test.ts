import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **ERA NINE SPENDS WARMTH ON ITS FLOOR AND ON NOTHING STANDING ON IT, AND THE INTRUSION
 * PLATES HAVE TO OBEY THAT.**
 *
 * The ruling is at `docs/superpowers/specs/2026-08-01-intrusion-crisis-art-brief.md` §3.2a,
 * dated 2026-08-01, and this file is what stops it being prose. Until then the plates drew the
 * barriers round a lifted inspection cover in a rust orange, `#b8593a` posts under a `#c9663f`
 * rail, which was the warmest and by far the most saturated thing in any intrusion plate. Three
 * documents disagreed with it and with each other: era nine's merged presentation brief lists a
 * lifted cover's colour as `none` and says warmth is foreign to the era's palette
 * (`docs/superpowers/specs/crises/era-09-intrusion.md:678` and `:142`), the art brief asks for
 * the barriers in the era's own matched-enclosure language, and the pack's constraint list says
 * *"no urgency framing, no alarm, no red"*.
 *
 * **The two rules below are the ruling, and both reference points are DERIVED from the
 * generator rather than written down here**, so a retone of era nine's palette moves the guard
 * with it instead of leaving it measuring a tree that has gone:
 *
 *  1. **Nothing is warmer than the floor.** Measured on blue-minus-red, era nine's ground family
 *     runs `-15` to `-9` and everything built or added to the town runs `+6` to `+41`. That split
 *     is the era's own ruling rather than a coincidence: its style guide keeps the paving *"warmer
 *     or darker than the body hue, not cooler"*, because era nine's wall is already cool. So in
 *     this era **warm means floor**, and the reference is `$ERA9.Floor` itself.
 *  2. **Nothing is more saturated than the era's own accent.** The crisis carries every one of its
 *     four readings on segment count, relief and value against a uniformly low-chroma field, so a
 *     saturated tone anywhere is the enforceable form of era nine's *"nothing that reads as an
 *     alarm"*. A cool alarm colour would pass rule 1, which is why there are two.
 *
 * ## Why the population is this pack and not the plates that share the primitive
 *
 * `InspectionCover` and `ShutterPlates` are cross-era primitives, so scoping this by the code
 * would be scoping it by the wrong thing. The behaviour belongs to whatever is drawn in era
 * nine's palette, and today that is exactly the intrusion directory: {@link ERA_NINE_IS_ONE_PACK}
 * asserts that `$ERA9` is read by one pack writer, so the directory IS the derivation rather than
 * an assumption. The other three packs are warm on purpose (era one's fire, era four's
 * terracotta, era six's stucco) and neither rule may be widened to them.
 */

const repoRoot = resolveRepoRoot();
const GENERATOR = "tools/generate-winter-crisis-references.ps1";
const PACK_ROOT = "docs/superpowers/specs/crisis-reference-packs";
const INTRUSION = posix.join(PACK_ROOT, "intrusion");

function source(path: string): string {
  const text = readFileSync(posix.join(repoRoot, path), "utf8");
  // A floor, because an empty read makes every `toContain` below meaningless.
  expect(text.length, `${path} read empty`).toBeGreaterThan(400);
  return text;
}

const generator = source(GENERATOR);

/** Blue minus red: the cast, exactly as `ruinSeam.test.ts` measures a neutral against a tint. */
function cast(hex: number): number {
  return (hex & 0xff) - ((hex >> 16) & 0xff);
}

/** HSL saturation, the same channel and the same library `ruinSeam.test.ts` reads it through. */
function saturation(hex: number): number {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return hsl.s;
}

/**
 * The `$ERA9` table's own text, from its opening brace to its closing one.
 *
 * Scoped rather than swept, and that is not fussiness: `$ERA4` and `$ERA6` author a `Floor` too,
 * and a whole-file regex for `Floor = "#..."` finds era four's `#ded5c0` first. That is a warmer
 * tone than any era nine authors, so the sweep below would have run against a reference point
 * from the wrong era and passed over the rust orange it exists to catch.
 */
const eraNineTable = (() => {
  const start = generator.indexOf("$ERA9 = @{");
  expect(start, "$ERA9 has been renamed or removed").toBeGreaterThan(-1);
  const end = generator.indexOf("\n}", start);
  expect(end, "$ERA9's table is unterminated").toBeGreaterThan(start);
  return generator.slice(start, end);
})();

/** One entry of era nine's authored palette, read out of `$ERA9` rather than restated. */
function eraNineTone(role: string): number {
  const found = new RegExp(`^\\s*${role}\\s*=\\s*"#([0-9a-f]{6})"`, "m").exec(eraNineTable);
  expect(found, `$ERA9 no longer authors a ${role}`).not.toBeNull();
  return Number.parseInt((found as RegExpExecArray)[1] as string, 16);
}

/** Every plate in the pack, and every distinct fill across them, derived from the directory. */
const plates = readdirSync(posix.join(repoRoot, INTRUSION))
  .filter((name) => name.endsWith(".svg"))
  .sort();

const fillsByPlate = new Map<string, Set<number>>();
for (const plate of plates) {
  const svg = source(posix.join(INTRUSION, plate));
  const found = new Set<number>();
  for (const match of svg.matchAll(/fill="#([0-9a-fA-F]{6})"/g)) {
    found.add(Number.parseInt(match[1] as string, 16));
  }
  fillsByPlate.set(plate, found);
}
const fills = [...new Set([...fillsByPlate.values()].flatMap((set) => [...set]))].sort(
  (a, b) => a - b,
);

const hex = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;

/**
 * **THE TWO PLANTING TONES THAT GENUINELY DO NOT OWE RULE 1, NAMED RATHER THAN LEFT OUT.**
 *
 * Era nine's style guide makes the planting *"the only strongly non-grey field on the island, and
 * by era nine it is the primary separator rather than an amenity"*, and living material is warm.
 * It is also not the town's palette: it comes from `EraPlanting`, a cross-era primitive with its
 * own tones, and nothing in `$ERA9` authors a green.
 *
 * **The list is asserted as a CENSUS rather than as a set of skips**, which is what makes an
 * exemption provable instead of assumed: it fails whichever way the list and the plates come
 * apart, so a tone that stops needing excusing cannot sit here excusing nothing, and a tone that
 * starts needing it cannot be quietly absent.
 *
 * That second direction has already earned its place. This was written with all four of era
 * nine's planting tones in it, and the census rejected two: the trunk `#5f6f52` (cast -13) and
 * the crown `#71906a` (-7) are both cooler than the floor's -15 on their own, so they never
 * needed excusing and are not excused.
 */
const WARMER_THAN_THE_FLOOR: readonly (readonly [tone: string, what: string])[] = [
  ["#6f8a5e", "the planting drift's own mass"],
  ["#87a071", "the grasses standing out of it"],
];

/**
 * **AND THE SIX TONES THAT GENUINELY DO NOT OWE RULE 2.** A separate list from the one above,
 * because it is a separate claim and the two do not coincide: two of era nine's four planting
 * tones are inside the warm rule and all four are over the chroma ceiling, so one blanket
 * exemption would have excused four tones from a rule two of them never broke.
 *
 * **All four plants**, because a green legible as planting cannot be as grey as anodised panel,
 * and era nine's own guide is explicit that the planting is *"the only strongly non-grey field on
 * the island"*. **Both lit faces**, because the status panel is the crisis's whole instrument and
 * the brief spends the frame's exposure budget on making it the brightest thing there is; neither
 * is a colour, their casts are `+32` and `+11`, so rule 1 holds over both, and it is only HSL
 * saturation that a near-white trips, which is a fact about the measure rather than about the
 * picture.
 *
 * Asserted as the same census, in both directions, for the same reason.
 */
const OVER_THE_CHROMA_CEILING: readonly (readonly [tone: string, what: string])[] = [
  ["#6f8a5e", "the planting drift's own mass"],
  ["#87a071", "the grasses standing out of it"],
  ["#71906a", "a tree's crown"],
  ["#5f6f52", "a multi-stem trunk"],
  ["#c3dae3", "the status panel's lit face"],
  ["#f4fdff", "a lit segment on it"],
];

const value = (tone: string): number => Number.parseInt(tone.slice(1), 16);
const listed = (
  list: readonly (readonly [tone: string, what: string])[],
): readonly string[] => list.map(([tone]) => tone).sort();

/** Which plates carry a given fill, for an error message that names the frame. */
function platesWith(tone: number): string[] {
  return plates.filter((plate) => fillsByPlate.get(plate)?.has(tone));
}

describe("the intrusion plates are drawn in era nine's palette and nothing warmer", () => {
  const floorCast = cast(eraNineTone("Floor"));
  const chromaCeiling = saturation(eraNineTone("Glass"));

  it("sweeps a population derived from the pack, with a floor under it", () => {
    // Floors, because every census below is over a derived list and a shortened one would pass by
    // not looking. Six plates is the pack's own set, and the fill count is well clear of anything
    // the two exception lists could swallow.
    expect(plates.length, `only ${plates.length} plates in ${INTRUSION}`).toBe(6);
    expect(fills.length).toBeGreaterThanOrEqual(40);
    // A ceiling on the two lists TOGETHER, so neither can grow until it has swallowed the
    // population. Six today: era nine's four planting tones and the panel's two lit faces.
    const excused = new Set([
      ...listed(WARMER_THAN_THE_FLOOR),
      ...listed(OVER_THE_CHROMA_CEILING),
    ]);
    expect(excused.size).toBeLessThanOrEqual(6);
    expect(fills.length - excused.size).toBeGreaterThanOrEqual(35);
  });

  it("reads its two reference points off era nine's own palette", () => {
    // Both rules are relative, so if either reference point stops being what the ruling assumes,
    // the rule below it means nothing. The floor is warm and the accent is low-chroma: that is
    // the premise, and this is where it fails rather than silently passing.
    expect(
      floorCast,
      "era nine's floor is no longer the warm end of its palette",
    ).toBeLessThan(0);
    expect(chromaCeiling, "era nine's accent is no longer a low-chroma tone").toBeLessThan(
      0.4,
    );
  });

  it("has exactly the named exceptions warmer than the floor, and no others", () => {
    const measured = fills
      .filter((tone) => cast(tone) < floorCast)
      .map((tone) => `${hex(tone)} in ${platesWith(tone).join(", ")}`)
      .sort();
    const declared = WARMER_THAN_THE_FLOOR.map(
      ([tone]) => `${tone} in ${platesWith(value(tone)).join(", ")}`,
    ).sort();
    // In era nine warm means floor: the paving and its covers and collars are the only warm-cast
    // tones the town has, so nothing standing on the floor may be warmer than the floor itself.
    expect(measured, `against a floor cast of ${floorCast}`).toEqual(declared);
  });

  it("has exactly the named exceptions over the chroma ceiling, and no others", () => {
    const measured = fills
      .filter((tone) => saturation(tone) > chromaCeiling)
      .map((tone) => `${hex(tone)} at ${saturation(tone).toFixed(3)}`)
      .sort();
    const declared = OVER_THE_CHROMA_CEILING.map(
      ([tone]) => `${tone} at ${saturation(value(tone)).toFixed(3)}`,
    ).sort();
    // Era nine's four readings are carried by segment count, relief and value against a uniformly
    // low-chroma field, so a saturated tone anywhere is the enforceable form of the era's own
    // "nothing that reads as an alarm". A cool alarm colour passes the rule above, which is why
    // there are two.
    expect(measured, `against a ceiling of ${chromaCeiling.toFixed(3)}`).toEqual(declared);
  });

  it("draws every tone it excuses, so no entry excuses nothing", () => {
    // The census above compares tones to tones and would be satisfied by a list of tones nothing
    // draws if the plates ever stopped drawing them together. This is the floor under that.
    for (const [tone, what] of [...WARMER_THAN_THE_FLOOR, ...OVER_THE_CHROMA_CEILING]) {
      expect(
        platesWith(value(tone)),
        `${tone} (${what}) is excused and drawn nowhere`,
      ).not.toEqual([]);
    }
  });
});

describe("the barrier is the town's own clad panel, authored once", () => {
  const clad = eraNineTone("Clad");

  it("draws the barrier in the clad panel and its right face, in the two plates with one", () => {
    // Derived from the plates rather than listed: a barrier is drawn only by a LIFTED cover, and
    // the pack lifts covers in the wide master and in the two-covers plate.
    const carrying = platesWith(clad);
    expect(carrying).toContain("01-wide-master.svg");
    expect(carrying).toContain("02-lifted-cover-and-barrier.svg");
    // The posts are the face model's right face of that same panel, computed here the way
    // `MixHex` computes it, so the plates cannot drift onto a hand-picked second tone.
    const right =
      ((Math.round(((clad >> 16) & 0xff) * 0.72) & 0xff) << 16) |
      ((Math.round(((clad >> 8) & 0xff) * 0.72) & 0xff) << 8) |
      (Math.round((clad & 0xff) * 0.72) & 0xff);
    for (const plate of ["01-wide-master.svg", "02-lifted-cover-and-barrier.svg"]) {
      expect(
        fillsByPlate.get(plate),
        `${plate} does not carry the barrier post ${hex(right)}`,
      ).toContain(right);
    }
  });

  it("leaves the void the darkest thing on the paving, so the hole is still the subject", () => {
    // The read the rust orange was buying, and the measurement that makes dropping it safe. A
    // barrier the eye reaches before the opening is the one way plate 02 fails, and the check is
    // that the void is further from the floor in value than the barrier is.
    const luminance = (tone: number): number => {
      const colour = new THREE.Color(tone);
      return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
    };
    const floor = luminance(eraNineTone("Floor"));
    const voidTone = 0x2c3236;
    expect(fillsByPlate.get("02-lifted-cover-and-barrier.svg")).toContain(voidTone);
    expect(
      floor - luminance(voidTone),
      "the void is no longer the widest step off the floor",
    ).toBeGreaterThan(floor - luminance(clad));
  });

  it("authors the clad tone once and hands it to both primitives", () => {
    // The defect this closes: the blanking plates carried the tone as a literal at their call
    // site and the barrier carried a rust orange, so one category of object had two
    // contradictory tones and neither knew about the other.
    expect(generator).toContain("-Clad $e.Clad");
    expect(generator).toContain("-Boarding $e.Clad");
    expect(
      generator.match(/-Clad \$e\.Clad/g)?.length,
      "not every InspectionCover call site reads the palette",
    ).toBe(6);
    // The barrier fills are the face model applied to the parameter, never a literal.
    expect(generator).toContain("$barrierPost = FaceRight -Hex $Clad");
    expect(generator).toContain("$barrierRail = FaceLeft -Hex $Clad");
  });

  it("has no rust orange left in any plate or as any fill the generator writes", () => {
    // The generator's own prose NAMES the retired tones, in the ruling on `InspectionCover`, so
    // the string is expected there and the assertion is about what it DRAWS. Every fill in this
    // file is written as `fill="#..."`, which is what makes that distinction checkable.
    for (const retired of ["#b8593a", "#c9663f"]) {
      expect(generator, `the generator no longer records what it retired`).toContain(
        retired,
      );
      expect(
        generator.toLowerCase(),
        `${retired} is still a fill in the generator`,
      ).not.toContain(`fill="${retired}"`);
      for (const plate of plates) {
        expect(
          source(posix.join(INTRUSION, plate)).toLowerCase(),
          `${retired} is still in ${plate}`,
        ).not.toContain(retired);
      }
    }
  });
});

/**
 * **THE POPULATION ABOVE IS A DERIVATION AND THIS IS WHAT MAKES IT ONE.**
 *
 * Every rule in this file is about era nine's palette, and it is applied to the intrusion
 * directory. Those are the same set only for as long as `$ERA9` feeds exactly one pack, which is
 * a fact about the generator rather than about the directory listing. A second pack drawn in era
 * nine's tones would be outside this sweep and inside the ruling, which is precisely how a guard
 * ends up narrower than the behaviour it was written for.
 */
describe("era nine's palette feeds one pack, which is why the directory is the population", () => {
  /**
   * Every pack writer in the generator, keyed by name, with its own body text.
   *
   * Each body ends at the first `}` in column zero, which is where a PowerShell function closes
   * in this file. Slicing to the NEXT writer's head instead would have swept up whatever sits
   * between them, and what sits between the plague writer and the intrusion one is the `$ERA9`
   * table itself: measured, that reported era nine's palette as read by two writers.
   */
  const writers = (() => {
    const found = new Map<string, string>();
    for (const head of generator.matchAll(/^function (Write-\w+Pack) \{$/gm)) {
      const from = head.index as number;
      const close = generator.indexOf("\n}\n", from);
      found.set(head[1] as string, generator.slice(from, close === -1 ? undefined : close));
    }
    return found;
  })();

  it("has a writer per pack, derived from the generator", () => {
    // A floor: four packs ship, and a sweep over a shortened list would pass by not looking.
    expect([...writers.keys()].sort()).toEqual([
      "Write-HardWinterPack",
      "Write-IntrusionPack",
      "Write-PlaguePack",
      "Write-SuccessionPack",
    ]);
  });

  it("is read by exactly one of them, and it is the intrusion pack's", () => {
    const readers = [...writers.entries()]
      .filter(([, body]) => body.includes("$ERA9"))
      .map(([name]) => name);
    expect(readers, `$ERA9 is read by ${readers.length} pack writers`).toEqual([
      "Write-IntrusionPack",
    ]);
    expect(writers.get("Write-IntrusionPack")).toContain("$e = $ERA9");
  });
});
