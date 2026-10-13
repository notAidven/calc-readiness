/**
 * §16 of the era progression design says how many decisions it records. That sentence
 * must agree with the `D-ERA` ids the document actually carries.
 *
 * ## The drift this exists to prevent
 *
 * The tally has now gone stale twice. It read "Twenty-four (D-ERA1..D-ERA24)" until
 * 2026-07-28, then "Twenty-nine", and by the evening of the same day the file held
 * **31** distinct ids: `D-ERA30` (per-era road surfacing) and `D-ERA31` (the hub /
 * `NUM.S` dressing swap) landed in `3d525dc` and `f03ace6` without anyone editing §16's
 * first line. It was one of Gabriel's original twelve review defects, was fixed once by
 * hand, and was stale again within hours -- which is the signal that a human bumping a
 * number is the wrong mechanism, not that the humans were careless.
 *
 * The document's own banner draws the same conclusion in prose: *"A range is cheap to
 * keep true; a tally is not."* It responded by dropping the total from the banner. §16
 * keeps a total because the section is the authoritative list and a reader wants to know
 * how long it is; this test is what makes that total cheap to keep true, and it is the
 * reason §16 may still carry one.
 *
 * ## What is derived and what is asserted
 *
 * The id set is derived by scanning the whole document for `D-ERA<n>`, so a decision is
 * counted by being written down rather than by being remembered. Two prose claims are
 * checked against it, both of them tallies that have drifted or could:
 *
 *  - §16's opening sentence -- the spelled-out COUNT, plus the explicit `D-ERA1..D-ERA<max>`
 *    range that follows it.
 *  - The status banner's *"numbered up to **D-ERA<max>**"*, which is the same claim about
 *    the highest id and is edited by different hands at a different moment.
 *
 * Note the count and the maximum are separate facts: they agree today only because the ids
 * happen to be contiguous, and the section promises ids are "never renumbered or reused",
 * so a future retirement could leave a gap and make them diverge legitimately. Each is
 * therefore checked against its own derived value rather than one standing in for the other.
 *
 * ## Floors
 *
 * Every assertion below would pass over an empty scan -- an empty id set, or a regex that
 * stopped matching after a rewording, both read as "nothing disagrees". So the id count has
 * a floor beneath it, both prose matches are asserted to have been found at all, and
 * `numberWord` is pinned against known values, because a word helper broken into returning
 * the input would make the count comparison compare nothing.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const SPEC_PATH = "docs/superpowers/specs/2026-07-27-era-progression-design.md";

const repoRoot = resolveRepoRoot();

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** A word out of one of the tables above, or a named failure: they stop at 99. */
function wordAt(table: readonly string[], index: number, value: number): string {
  const word = table[index];
  if (word === undefined) {
    throw new Error(`no English word for ${value}: these tables only reach ninety-nine`);
  }
  return word;
}

/** English for a whole number below 100, hyphenated as the document writes it. */
function numberWord(value: number): string {
  if (value < 20) {
    return wordAt(ONES, value, value);
  }
  const tens = wordAt(TENS, Math.floor(value / 10), value);
  const ones = value % 10;
  return ones === 0 ? tens : `${tens}-${wordAt(ONES, ones, value)}`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const spec = readFileSync(join(repoRoot, SPEC_PATH), "utf8");

/** Every distinct decision id the document carries, as numbers. */
function decisionIds(text: string): number[] {
  const ids = new Set<number>();
  for (const match of text.matchAll(/\bD-ERA(\d+)\b/g)) {
    ids.add(Number(match[1]));
  }
  return [...ids].sort((left, right) => left - right);
}

describe("the era design's decision tally agrees with its decision ids", () => {
  const ids = decisionIds(spec);

  it("counts at least as many ids as the section has ever claimed", () => {
    // The floor. Both assertions below are comparisons against `ids`, so a scan that
    // came back empty -- file moved, id spelling changed, regex broken -- would make
    // them compare a derived zero against prose and report a mismatch about the wrong
    // thing, or pass if the prose were emptied too. 31 ids when this was written; 25
    // leaves room to retire several without editing this test, and is far above the
    // count any broken scan would produce.
    expect(ids.length).toBeGreaterThanOrEqual(25);
  });

  it("opens §16 with the derived count and range", () => {
    // Anchored on the sentence that follows the tally, which is stable prose, so the
    // tally itself is free to be wrong in any way and still be found and reported.
    const match = spec.match(/^(?<tally>.+?) IDs are never renumbered or reused\.$/m);
    expect(
      match?.groups?.tally,
      `no decision tally line found in ${SPEC_PATH}`,
    ).toBeDefined();

    const count = ids.length;
    const highest = ids[ids.length - 1];
    expect(match?.groups?.tally).toBe(
      `${capitalize(numberWord(count))} (D-ERA1..D-ERA${highest}).`,
    );
  });

  it("agrees with the status banner about the highest id", () => {
    const match = spec.match(/numbered up to\s+\*\*D-ERA(\d+)\*\*/);
    expect(
      match?.[1],
      `no "numbered up to D-ERAn" claim found in ${SPEC_PATH}`,
    ).toBeDefined();
    expect(Number(match?.[1])).toBe(ids[ids.length - 1]);
  });

  it("spells numbers the way the document does", () => {
    // Pins the helper. Without this, `numberWord` degraded into returning a constant
    // would make the count assertion above pass against a frozen word.
    expect(numberWord(29)).toBe("twenty-nine");
    expect(numberWord(30)).toBe("thirty");
    expect(numberWord(31)).toBe("thirty-one");
    expect(numberWord(19)).toBe("nineteen");
    expect(capitalize(numberWord(31))).toBe("Thirty-one");
  });
});
