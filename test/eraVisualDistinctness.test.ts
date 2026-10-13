/**
 * **NO TWO ERAS MAY WEAR THE SAME BODY COLOUR (D-ERA36, hue axis only).**
 *
 * Evan's principle is *"we want the eras to be distinct/unique in design"*, stated after
 * he called era two too similar to era one. **This file exists because era two was not the
 * only place it failed — it was the one that had been drawn.** The measurement that follows
 * found a co-visible pair almost four times tighter than the one he objected to, in two
 * eras nobody has drawn yet.
 *
 * D-ERA36 (§5.6) names four axes. **This file guards exactly ONE of them**, the body hue,
 * and that narrowness is deliberate rather than a first instalment:
 *
 *  - **Body hue is guardable** because each guide states it as a machine-readable hex in a
 *    stable table row, so the number this file computes is the authored value and not a
 *    paraphrase of it.
 *  - **Material-set overlap is NOT**, and §5.6 records the measurement that settled it: a
 *    token-overlap metric over the same guides' §2 tables ranks `9->10` as the second-worst
 *    pair in the run where a reader ranks it the BEST of the nine, and puts `1->2` — the
 *    pair Evan actually objected to — at fourth rather than second, because era two renamed
 *    its materials while keeping the substances. It would have reported green on the defect
 *    that prompted the principle and red on the healthiest pair in the run. Two of the
 *    load-bearing admissions also live in prose outside the table it would parse (era two's
 *    *"Carried over rather than counted as a fifth material: undressed stone"*, era six's
 *    *"Terracotta roof tile continues from era four unchanged"*), so a table parser scores
 *    zero for exactly the two eras that are the problem. That axis is a review item in
 *    §5.6, not an assertion, and calling it one here would be the hollow green
 *    `.cursor/rules/qa-verification.mdc` is about.
 *
 * ## Every pair, not just the adjacent ones — and that is the point
 *
 * The obvious guard is over the nine adjacent steps. It is the wrong population, and the
 * freeze ruling (§6.4a) is why: a skill building's look is fixed at construction and a
 * civic building's at purchase, so **at era N the city holds every earlier era's buildings
 * in their original looks.** Era six does not stand next to era five. It stands next to
 * eras one through five, all at once, on one island. So the behaviour that makes a
 * collision possible is CO-VISIBILITY, which every one of the 45 unordered pairs has, and
 * a guard scoped to the 9 adjacent steps would be scoped to the implementation of an
 * advance rather than to what a player can see.
 *
 * Measured, that distinction is the whole finding. Over the ten authored hexes at `a14955c`
 * the tightest ADJACENT step is `4->5` at ΔE 11.2, and the tightest CO-VISIBLE pair is
 * **`4 vs 6` at ΔE 2.7** — Classical dressed ashlar limestone `#C4B79A` against Renaissance
 * warm stucco `#CDBB9E`, effectively one colour, and era four's buildings are still standing
 * when era six arrives. **4.1x tighter than the worst adjacent step, and a guard over the
 * nine adjacent steps reports green on it forever.**
 *
 * ## The stale direction has already fired for real, which is the evidence it works
 *
 * This file was written at `7afe712`, where `1->2` was ΔE 10.1 and was a listed exception
 * carrying Evan's objection. The era-two lane landed its palette redesign as `a14955c`
 * while this was in review, moving era two's body hue from `#B4714F` to `#D9C288`. The
 * sweep went red at *"'1 vs 2' is excused as too close but measures ΔE 25.2 … THE FIX HAS
 * LANDED: delete the entry"*, and the entry is gone. **That was not an injected
 * demonstration**: a fix landed and the guard refused to keep excusing it, unprompted,
 * which is the direction an exception list usually lacks.
 *
 * ## The thresholds are PROPOSED, so the exceptions are named rather than assumed
 *
 * {@link MIN_DELTA_E} is not ratified — Evan stated the principle and the numbers are his.
 * Nine of the 45 pairs sit under it today, so this file cannot simply assert the floor. It
 * asserts the floor **plus a named list, in both directions**, per the exception discipline
 * in `.cursor/rules/qa-verification.mdc`:
 *
 *  - an unlisted pair that falls below the floor fails, so no new squeeze can be authored
 *    quietly;
 *  - a listed pair that rises above the floor fails as a stale exemption, so a fixed pair
 *    cannot go on being excused;
 *  - a listed pair naming an era the registry no longer carries fails, so the list cannot
 *    outlive its subjects.
 *
 * The population is derived from `ERA_SEQUENCE` and the folder set is asserted against it
 * as a bijection, so **a new era cannot escape this sweep by not being written down** —
 * which is the way the guards catalogued in that rule went wrong.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ERA_SEQUENCE, type EraId, eraAtNumber, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

const ERAS_DIR = "docs/superpowers/specs/eras";
const GUIDE_FILE = "style-guide.md";

interface AuthoringSlugException {
  readonly slug: string;
  readonly why: string;
}

/**
 * Author-facing folder names normally echo the stable runtime id. Era 6 is the one
 * deliberate exception: the display/authoring name changed while persisted state keeps
 * `renaissance`. Name the exception instead of weakening the rule for every folder.
 */
const AUTHORING_SLUG_EXCEPTIONS: Partial<Record<EraId, AuthoringSlugException>> = {
  renaissance: {
    slug: "early-modern",
    why: "the learner-facing era was renamed without migrating the stable runtime id",
  },
};

function authoringSlugMatchesEra(
  folder: string,
  eraId: EraId,
  exceptions: Partial<Record<EraId, AuthoringSlugException>> = AUTHORING_SLUG_EXCEPTIONS,
): boolean {
  const folderSlug = folder.replace(/^era-\d\d-/, "");
  const [firstWord] = folderSlug.split("-");
  if (!firstWord) return false;

  const idSlug = eraId.replace(/_/g, "-");
  const exception = exceptions[eraId];
  if (exception) {
    // Both directions matter: the folder must still use the declared authoring slug,
    // and the stable id must not have quietly adopted it while the exception lingered.
    return folderSlug === exception.slug && !idSlug.includes(firstWord);
  }
  return idSlug.includes(firstWord);
}

/**
 * **The minimum ΔE between two CONSECUTIVE eras' body hues. PROPOSED for Evan, not
 * ratified.**
 *
 * 15 because an adjacent step is the moment the player experiences as *the advance*, so a
 * squeeze here does not read as two similar quarters, it reads as nothing having happened.
 * 15 is the smallest round number that calls the problem a problem without condemning
 * anything that works: at `a14955c` it flags the three steps a reader flags (`4->5`, `5->6`,
 * `8->9`) and leaves the six the run already gets right (`2->3` at 23.7 upward) untouched.
 */
const MIN_ADJACENT_DELTA_E = 15;

/**
 * **The minimum ΔE between any two CO-VISIBLE eras — every pair, per §6.4a. PROPOSED.**
 *
 * Lower than the adjacent floor on purpose, and the asymmetry is a design claim rather
 * than a convenience: two eras several steps apart occupy different quarters of the
 * island, so they may legitimately sit closer than two consecutive eras without reading as
 * a failure. What they may not do is wear the *same* colour. 10 is where two flat wall
 * fields stop being two colours at a glance.
 *
 * Measured, this floor is worth its keep precisely because it is nearly free: 35 of the 36
 * non-adjacent pairs clear it, and the one that does not is `4 vs 6` at 2.7 — the tightest
 * pair in the run.
 *
 * **One thing for Evan to decide is whether both floors move to CIEDE2000**, and the
 * era-two redesign is the reason it matters rather than a refinement. Its new `#D9C288`
 * clears everything under CIE76 (`1->2` 25.2, `2->3` 23.7, `2 vs 6` 15.5, `2 vs 4` 16.3),
 * and under CIEDE2000 `2 vs 6` is **7.7** and `2 vs 4` is **8.1** — tighter than the 8.7 it
 * was changed to escape, against two eras it is co-visible with. **CIE76 overstates distance
 * in exactly the low-chroma warms where six of the ten eras sit**, so this floor is the
 * more forgiving of the two readings and is knowingly so.
 */
const MIN_CO_VISIBLE_DELTA_E = 10;

/** The floor a pair owes, which depends only on whether the two eras are consecutive. */
const floorFor = (adjacent: boolean): number =>
  adjacent ? MIN_ADJACENT_DELTA_E : MIN_CO_VISIBLE_DELTA_E;

/** A pair of eras that sit closer than {@link MIN_DELTA_E} today, with why and whose. */
interface KnownSqueeze {
  /** 1-based play positions, low first. */
  readonly a: number;
  readonly b: number;
  readonly why: string;
}

/**
 * **The three ADJACENT steps under the floor.** Separate from
 * {@link CO_VISIBLE_SQUEEZES} because it is a different claim: an adjacent step is the one
 * a player experiences as *the advance*, so a squeeze here reads as "nothing happened"
 * rather than as two quarters looking alike.
 *
 * Every entry is a knock-on RECOMMENDATION in D-ERA36 and not a change this lane made —
 * no era's palette value moved.
 */
const ADJACENT_SQUEEZES: readonly KnownSqueeze[] = [
  // `4 vs 5` (was ΔE 11.2) and `5 vs 6` (was 12.9) were REMOVED on the 2026-07-31
  // forward-merge, because the palette-ladder pass moved five body hues and both now clear
  // the adjacent floor of 15 — 18.4 and 24.5 respectively. This guard named the removals
  // itself: its stale-entry direction failed with *"THE FIX HAS LANDED: delete the entry so
  // the list stops excusing something it no longer describes."* Leaving them would have been
  // the exact decay that direction exists to catch, so the entries go and the floors do not
  // move.
  {
    a: 8,
    b: 9,
    why:
      "ΔE 14.2, and the highest material inheritance in the run: era nine keeps era eight's " +
      "steel, glass and anodised metal, three of its four families. Undrawn.",
  },
];

/**
 * **NON-ADJACENT pairs under the co-visible floor — and there are none left.** This list held
 * exactly one entry, `4 vs 6`, and it carried D-ERA36's headline: Classical dressed ashlar
 * limestone `#C4B79A` against Renaissance warm stucco `#CDBB9E` at **ΔE 2.7**, the tightest
 * pair in the run by a factor of 3.7 and effectively one colour, visible as a pair only
 * because the freeze keeps era four's buildings standing into era six.
 *
 * **THE PALETTE-LADDER PASS FIXED IT on the 2026-07-31 forward-merge: `4 vs 6` now measures
 * ΔE 12.0, above the co-visible floor of 10.** So the entry was deleted rather than left to
 * excuse something it had stopped describing — this guard's own stale-entry direction is what
 * demanded that, and it named the pair and the figure.
 *
 * **THE LIST IS DELIBERATELY KEPT, EMPTY, RATHER THAN THE CONCEPT BEING DELETED.** It is one
 * half of an exemption asserted both ways: the sweep still requires every under-floor
 * non-adjacent pair to appear here, so a hue that regresses re-populates it and fails rather
 * than passing quietly. An empty list is the correct state of a list of excuses when there is
 * nothing left to excuse, and `MIN_CLEAR_PAIRS` plus the shape floor below are what stop that
 * emptiness from being achieved by measuring nothing.
 */
const CO_VISIBLE_SQUEEZES: readonly KnownSqueeze[] = [];

/**
 * A floor under the pairs that CLEAR their threshold, so the two lists above cannot grow
 * until they have swallowed the population. At `a14955c` 41 of 45 clear; a run that has to
 * excuse more than ten pairs has stopped being a run of distinct eras.
 */
const MIN_CLEAR_PAIRS = 35;

/**
 * A floor on the pairs involving NEITHER era one NOR era two. A floor constrains size and
 * not shape, and the shape is the claim here: this sweep must be genuinely run-wide rather
 * than an era-two guard with nine eras of padding. Today it is 28, every pair among eras
 * three to ten.
 */
const MIN_PAIRS_CLEAR_OF_ERAS_ONE_AND_TWO = 21;

// --- reading the authored hues -------------------------------------------------------

/** The `era-NN-*` folders on disk, keyed by the ordinal in the name. */
function guideFoldersByOrdinal(): Map<number, string> {
  const found = new Map<number, string>();
  for (const entry of readdirSync(ERAS_DIR, { withFileTypes: true })) {
    const match = /^era-(\d\d)-/.exec(entry.name);
    if (!entry.isDirectory() || match?.[1] === undefined) continue;
    const ordinal = Number(match[1]);
    if (found.has(ordinal)) {
      throw new Error(
        `Two era folders claim ordinal ${ordinal}: ${found.get(ordinal)}, ${entry.name}`,
      );
    }
    found.set(ordinal, entry.name);
  }
  return found;
}

/**
 * The era's authored body hue, uppercased. Two shapes are accepted because two exist: the
 * nine later guides state it in a palette table row, and era one states it in prose. It
 * THROWS rather than returning undefined — an era whose hue cannot be read must fail the
 * sweep rather than drop silently out of it, which is how a population quietly empties.
 */
function readBodyHue(folder: string): string {
  const src = readFileSync(join(ERAS_DIR, folder, GUIDE_FILE), "utf8");
  const row = /\|\s*\*\*Body hue\*\*\s*\|[^|]*\|\s*`(#[0-9A-Fa-f]{6})`/.exec(src)?.[1];
  if (row !== undefined) return row.toUpperCase();
  const prose = /body hue[^.`]*`(#[0-9A-Fa-f]{6})`/.exec(src)?.[1];
  if (prose !== undefined) return prose.toUpperCase();
  throw new Error(
    `${folder}/${GUIDE_FILE} states no body hue. Per D-ERA27 hue is an era property and ` +
      `every era owns one, so this is a missing palette rather than an era that does not ` +
      `need a colour.`,
  );
}

// --- the colour maths ----------------------------------------------------------------

function hexToLab(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const toLinear = (c: number): number => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);
  // sRGB -> XYZ (D65), then XYZ -> L*a*b* against the D65 white point.
  const X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const Z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number): number =>
    t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(hexA: string, hexB: string): number {
  const A = hexToLab(hexA);
  const B = hexToLab(hexB);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

// --- the population, derived --------------------------------------------------------

interface EraHue {
  readonly position: number;
  readonly id: EraId;
  readonly folder: string;
  readonly hex: string;
}

interface EraPair {
  readonly a: EraHue;
  readonly b: EraHue;
  readonly adjacent: boolean;
  readonly deltaE: number;
}

/** Every era in `ERA_SEQUENCE`, with the hue its own guide authors. Never written down. */
function eraHues(): readonly EraHue[] {
  const folders = guideFoldersByOrdinal();
  return ERA_SEQUENCE.map((era) => {
    const position = eraNumber(era.id);
    const folder = folders.get(position);
    if (!folder) {
      throw new Error(
        `Era ${position} ("${era.id}") is in ERA_SEQUENCE with no era-${String(position).padStart(2, "0")}-* ` +
          `folder under ${ERAS_DIR}. A new era owes a style guide, and this sweep is where ` +
          `it is noticed.`,
      );
    }
    return { position, id: era.id, folder, hex: readBodyHue(folder) };
  });
}

/** All C(n,2) unordered pairs. Every one of them is co-visible, per §6.4a. */
function eraPairs(): readonly EraPair[] {
  const hues = eraHues();
  const pairs: EraPair[] = [];
  for (const [i, a] of hues.entries()) {
    for (const b of hues.slice(i + 1)) {
      pairs.push({
        a,
        b,
        adjacent: b.position === a.position + 1,
        deltaE: deltaE76(a.hex, b.hex),
      });
    }
  }
  return pairs;
}

const key = (a: number, b: number): string => `${a} vs ${b}`;
const pairKey = (pair: EraPair): string => key(pair.a.position, pair.b.position);
const describePair = (pair: EraPair): string =>
  `era ${pair.a.position} ${pair.a.hex} vs era ${pair.b.position} ${pair.b.hex} at ΔE ${pair.deltaE.toFixed(1)}`;

// --- the sweep ----------------------------------------------------------------------

describe("the population this sweep measures is derived, complete, and run-wide", () => {
  it("has a guide for every era in ERA_SEQUENCE, and no orphan folder either way", () => {
    const folders = guideFoldersByOrdinal();
    const sequencePositions = ERA_SEQUENCE.map((era) => eraNumber(era.id)).sort(
      (x, y) => x - y,
    );
    expect([...folders.keys()].sort((x, y) => x - y)).toEqual(sequencePositions);

    // Every folder's ordinal names the era the SEQUENCE puts at that position. Most match
    // the stable id's first word; the one display-name/runtime-id split is named above.
    const seenExceptions = new Set<EraId>();
    for (const [ordinal, folder] of folders) {
      const era = eraAtNumber(ordinal);
      expect(
        era,
        `ERA_SEQUENCE has no era at position ${ordinal}, but ${folder} claims it`,
      ).toBeDefined();
      if (!era) continue;
      const [firstWord] = folder.replace(/^era-\d\d-/, "").split("-");
      expect(firstWord, `${folder} carries no slug after its ordinal`).toBeTruthy();
      expect(
        authoringSlugMatchesEra(folder, era.id),
        `${folder} should name era ${ordinal} ("${era.id}")`,
      ).toBe(true);
      if (AUTHORING_SLUG_EXCEPTIONS[era.id]) seenExceptions.add(era.id);
    }

    const declaredExceptions = Object.keys(AUTHORING_SLUG_EXCEPTIONS) as EraId[];
    expect(declaredExceptions).toEqual(["renaissance"]);
    expect([...seenExceptions]).toEqual(declaredExceptions);
    for (const eraId of declaredExceptions) {
      expect(AUTHORING_SLUG_EXCEPTIONS[eraId]?.why.trim().length).toBeGreaterThan(0);
    }

    // Mutations: removing the exception, restoring the old folder, or leaving a stale
    // exception after the stable id adopts the authoring name must all stay red.
    expect(authoringSlugMatchesEra("era-06-early-modern", "renaissance", {})).toBe(false);
    expect(authoringSlugMatchesEra("era-06-renaissance", "renaissance")).toBe(false);
    expect(
      authoringSlugMatchesEra("era-06-renaissance", "renaissance", {
        renaissance: {
          slug: "renaissance",
          why: "injected stale exception",
        },
      }),
    ).toBe(false);

    expect(folders.size).toBeGreaterThanOrEqual(10);
  });

  it("reads exactly one body hue per era, and no era opts out", () => {
    const hues = eraHues();
    expect(hues).toHaveLength(ERA_SEQUENCE.length);
    expect(hues.length).toBeGreaterThanOrEqual(10);
    for (const hue of hues) {
      expect(hue.hex, `${hue.folder} body hue`).toMatch(/^#[0-9A-F]{6}$/);
    }
    // Ten eras wearing ten colours: if two guides literally shared a hex the ΔE
    // assertions below would still fire, but this says the cruder thing outright.
    expect(new Set(hues.map((h) => h.hex)).size).toBe(hues.length);
  });

  it("measures every CO-VISIBLE pair and not only the adjacent steps", () => {
    const pairs = eraPairs();
    const n = ERA_SEQUENCE.length;
    expect(pairs).toHaveLength((n * (n - 1)) / 2);
    expect(pairs.filter((p) => p.adjacent)).toHaveLength(n - 1);

    // A floor constrains size, not shape. The shape claim is that this sweep is run-wide
    // rather than era-two-shaped, so it is asserted where it can fail.
    const clearOfEarlyEras = pairs.filter((p) => p.a.position > 2 && p.b.position > 2);
    expect(clearOfEarlyEras.length).toBeGreaterThanOrEqual(
      MIN_PAIRS_CLEAR_OF_ERAS_ONE_AND_TWO,
    );
  });
});

describe(`no era pair sits under its floor (adjacent ${MIN_ADJACENT_DELTA_E}, co-visible ${MIN_CO_VISIBLE_DELTA_E}) unless named`, () => {
  const listed = new Map<string, KnownSqueeze & { readonly adjacentClaim: boolean }>([
    ...ADJACENT_SQUEEZES.map(
      (s) => [key(s.a, s.b), { ...s, adjacentClaim: true }] as const,
    ),
    ...CO_VISIBLE_SQUEEZES.map(
      (s) => [key(s.a, s.b), { ...s, adjacentClaim: false }] as const,
    ),
  ]);

  it("declares each pair once — the two lists are two claims and cannot overlap", () => {
    const adjacentKeys = ADJACENT_SQUEEZES.map((s) => key(s.a, s.b));
    const coVisibleKeys = CO_VISIBLE_SQUEEZES.map((s) => key(s.a, s.b));
    expect(adjacentKeys.filter((k) => coVisibleKeys.includes(k))).toEqual([]);
    expect(new Set([...adjacentKeys, ...coVisibleKeys]).size).toBe(listed.size);
  });

  it("fails on any UNLISTED pair below its floor — the forward direction", () => {
    const unlisted = eraPairs()
      .filter((p) => p.deltaE < floorFor(p.adjacent) && !listed.has(pairKey(p)))
      .map(
        (p) =>
          `${describePair(p)} is below the D-ERA36 ${p.adjacent ? "adjacent" : "co-visible"} ` +
          `floor of ${floorFor(p.adjacent)} and is not a declared exception. Either separate ` +
          `the hues or record the pair here with a reason.`,
      );
    expect(unlisted).toEqual([]);
  });

  it("keeps every listed pair LOAD-BEARING — a pair that rises above its floor is stale", () => {
    const measured = new Map(eraPairs().map((p) => [pairKey(p), p]));
    const stale: string[] = [];
    for (const [k, entry] of listed) {
      const pair = measured.get(k);
      // An entry naming an era pair the registry no longer carries cannot sit here
      // excusing nothing: the lists are 1-based positions, so a shortened or reordered
      // sequence orphans them rather than silently repointing them.
      if (!pair) {
        stale.push(
          `"${k}" is a declared exception naming an era pair ERA_SEQUENCE does not have. ` +
            `Remove the entry, or restore the era.`,
        );
        continue;
      }
      if (pair.deltaE >= floorFor(pair.adjacent)) {
        stale.push(
          `"${k}" is excused as too close but measures ΔE ${pair.deltaE.toFixed(1)}, at or above ` +
            `its floor of ${floorFor(pair.adjacent)}. THE FIX HAS LANDED: delete the "${k}" entry ` +
            `from ${entry.adjacentClaim ? "ADJACENT_SQUEEZES" : "CO_VISIBLE_SQUEEZES"} so the list ` +
            `stops excusing something it no longer describes.`,
        );
      }
      if (pair.adjacent !== entry.adjacentClaim) {
        stale.push(
          `"${k}" is listed as ${entry.adjacentClaim ? "an ADJACENT step" : "a NON-ADJACENT co-visible pair"} ` +
            `and ERA_SEQUENCE makes it the other. Move it to the other list — the two carry ` +
            `different floors, so the classification is load-bearing.`,
        );
      }
      expect(entry.why.length, `"${k}" owes a reason`).toBeGreaterThan(40);
    }
    expect(stale).toEqual([]);
  });

  it("cannot swallow the population it is an exception to", () => {
    const clear = eraPairs().filter((p) => p.deltaE >= floorFor(p.adjacent));
    expect(clear.length).toBeGreaterThanOrEqual(MIN_CLEAR_PAIRS);

    // Containment holds trivially over an empty list, so floor the LIST too — and floor it
    // on SHAPE, because the shape is D-ERA36's headline. At least one excused pair must
    // involve neither era one nor era two, or the claim "era two was not the only place
    // this fails" has quietly stopped being true of what this file measures.
    const beyondTheEarlyEras = [...ADJACENT_SQUEEZES, ...CO_VISIBLE_SQUEEZES].filter(
      (s) => s.a > 2 && s.b > 2,
    );
    expect(beyondTheEarlyEras.length).toBeGreaterThanOrEqual(1);
  });
});

describe("the freeze ruling is why the population is every pair", () => {
  it("finds the tightest pair among the NON-adjacent ones, which an advance-scoped guard misses", () => {
    const pairs = [...eraPairs()].sort((x, y) => x.deltaE - y.deltaE);
    const [tightest] = pairs;
    const tightestAdjacent = pairs.find((p) => p.adjacent);
    expect(tightest, "the sweep found no pairs at all").toBeDefined();
    expect(tightestAdjacent, "the sweep found no adjacent pair at all").toBeDefined();
    if (!tightest || !tightestAdjacent) return;

    // Not a pin on WHICH pair it is — that would fail the day someone fixes it, which is
    // the wrong incentive. The claim is conditional and structural: whenever the tightest
    // pair in the run is a non-adjacent one, a guard scoped to the nine adjacent steps is
    // measuring the wrong population. This is where that stops being an argument in a
    // docblock.
    if (!tightest.adjacent) {
      // The tightest pair being non-adjacent is the whole point, and it is asserted
      // unconditionally: an adjacent-only sweep would not even have this pair in its
      // population, so it could never report the run's true minimum.
      expect(tightest.deltaE).toBeLessThan(tightestAdjacent.deltaE);

      // A DECLARATION IS OWED ONLY WHEN THE PAIR IS ACTUALLY UNDER ITS FLOOR. Requiring the
      // tightest pair to be listed come what may was wrong, and the 2026-07-31 forward-merge
      // is what exposed it: the ladder pass raised every non-adjacent pair above 10, leaving
      // era 5 vs era 8 the tightest in the run at ΔE 10.6 — which CLEARS its floor and so owes
      // no excuse. The old form demanded an entry for it, which would have meant inventing an
      // exemption for a pair that does not need one, and a list of excuses that excuses
      // nothing is exactly what the stale-entry direction above fails on. So the condition is
      // now the one the claim always meant.
      if (tightest.deltaE < MIN_CO_VISIBLE_DELTA_E) {
        expect(
          [...ADJACENT_SQUEEZES, ...CO_VISIBLE_SQUEEZES].map((s) => key(s.a, s.b)),
          `${describePair(tightest)} is the tightest pair in the whole run, is NOT an ` +
            `adjacent step, and sits UNDER the co-visible floor of ${MIN_CO_VISIBLE_DELTA_E} — it ` +
            `is visible as a pair only because §6.4a keeps era ` +
            `${tightest.a.position}'s buildings standing into era ${tightest.b.position}. A ` +
            `sweep over adjacent steps alone would report green on it forever.`,
        ).toContain(pairKey(tightest));
      }
    }
  });
});
