/**
 * NO AUTHORED LESSON STRING DISPLAYS A COEFFICIENT OF ONE AGAINST A VARIABLE.
 *
 * The generated half of this rule lives in `packages/item-bank/src/unitCoefficient.test.ts`,
 * which sweeps every template in the bank. This is the authored half, and it is a separate file
 * because it is a separate population: a lecture, a worked example and a CFU are hand-written
 * prose that no generator touches, so nothing the item bank asserts says anything about them.
 *
 * The rule is the curriculum's own. `content/lessons/d1/NUM.4.json` teaches that a coefficient
 * of one "is written by leaving it off", and `content/lessons/d7/LF.4.json` says the same, so a
 * pack that then prints `1x` in a lecture contradicts the lesson a learner has just read.
 *
 * ## Accepted input is the opposite of the defect, so it is carved out and then held to it
 *
 * Two authored strings spell the one deliberately, and both are ACCEPTED ANSWER forms rather
 * than displayed text: `d2/RAD.2.json` accepts `1sqrt(10)` and `d4/POL.8.json` accepts
 * `x^2 - 1x - 2`. A learner reading coefficients off a synthetic-division row writes down the
 * `1` that row holds, and that must keep grading correct. So strings under an `accepted` key are
 * excluded from the swept population -- structurally, by key, rather than by naming the two
 * packs, because the reason is what kind of field it is and not which pack it is in.
 *
 * A carve-out that excuses nothing is how a real defect ships later, so it is asserted in both
 * directions below: the two packs are named, and each has to STILL hold a unit-coefficient
 * spelling. If one stops, the carve-out has outlived its reason and this file says so.
 *
 * All three claims were forced red before being trusted, rather than written green and assumed:
 * spelling `$9b + 4b^{2} + 1b$` into `d1/NUM.4.json` fails at *"d1/NUM.4.worked_examples[0]
 * .prompt"*; deleting `1sqrt(10)` from RAD.2's accepted list fails at *"RAD.2 no longer accepts
 * a unit-coefficient spelling"*, which is the carve-out expiring; and listing a node that does
 * not exist fails at *"is carved out but offers no accepted forms"*, which is the stale entry.
 *
 * ## The one deliberate display, which is out of reach rather than excused
 *
 * `apps/web/src/lessons/interactive/SyntheticLongMatch.tsx:68` displays `1x^{2}` on purpose: the
 * exercise matches a synthetic-division row against a long-division layout that writes that line
 * out. It is widget SOURCE, not authored content, so no population here reaches it and it needs
 * no entry. Sweeping `.tsx` source was measured and rejected: of 22 matches across the widget
 * directory, 21 are `1e-9` epsilons, `1rem` lengths, `$1` backreferences and element ids, and
 * the twenty-second is that deliberate line. A guard whose only true match is its own exception
 * is machinery for excluding false positives, so this file stops at the authored packs.
 */

import { describe, expect, it } from "vitest";

import { LESSON_DOMAINS } from "./domains";

/**
 * A `1` that is a printed unit coefficient. Identical to the pattern in
 * `packages/item-bank/src/unitCoefficient.test.ts`, which carries the reasoning for the
 * lookbehind, the letter class and the ordinal exclusion; keep the two in step.
 */
const UNIT_COEFFICIENT = /(?<![\d.\\])1(?=[a-zA-Z])(?!(?:st|nd|rd|th)\b)/;

/** Keys whose strings are ACCEPTED INPUT a learner may type, not text shown to one. */
const ACCEPTED_INPUT_KEYS = new Set(["accepted"]);

/** The packs that spell a unit coefficient in an accepted form, each with its reason. */
const ACCEPTS_THE_SPELLING: Readonly<Record<string, string>> = {
  "RAD.2":
    "accepts `1sqrt(10)` beside `sqrt(10)`, so a learner who writes the one is right",
  "POL.8":
    "accepts `x^2 - 1x - 2`, the row a learner reads the coefficients off in synthetic division",
};

interface Found {
  readonly where: string;
  readonly text: string;
}

/**
 * Every string in a pack, walked generically rather than field by field.
 *
 * An enumerated list of surfaces is the version of this that goes quietly out of date: a pack
 * gains a field, no one adds it here, and the sweep reports green over prose it never read.
 * Walking the object graph means a new authored field is covered the day it is added.
 */
function collect(
  value: unknown,
  path: string,
  out: Found[],
  keep: (key: string) => boolean,
): void {
  if (typeof value === "string") {
    out.push({ where: path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collect(entry, `${path}[${index}]`, out, keep);
    });
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (keep(key)) {
        collect(entry, `${path}.${key}`, out, keep);
      }
    }
  }
}

const EVERY_KEY = () => true;
const EXCEPT_ACCEPTED = (key: string) => !ACCEPTED_INPUT_KEYS.has(key);

/** Learner-visible display strings: everything except the accepted-input arrays. */
function displayed(): readonly Found[] {
  const out: Found[] = [];
  for (const domain of LESSON_DOMAINS) {
    for (const pack of domain.lessons) {
      collect(pack, `${domain.id}/${pack.node_id}`, out, EXCEPT_ACCEPTED);
    }
  }
  return out;
}

/**
 * The carved-out half: every string beneath an `accepted` key, wherever in the pack it sits.
 *
 * Found by walking rather than by reaching for `pack.cfu.accepted`, so a second accepted list
 * somewhere else in the pack is read too. Once the key is found, everything under it counts.
 */
function acceptedForms(nodeId: string): readonly Found[] {
  const out: Found[] = [];
  const descend = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        descend(entry, `${path}[${index}]`);
      });
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (ACCEPTED_INPUT_KEYS.has(key)) {
          collect(entry, `${path}.${key}`, out, EVERY_KEY);
        } else {
          descend(entry, `${path}.${key}`);
        }
      }
    }
  };
  for (const domain of LESSON_DOMAINS) {
    for (const pack of domain.lessons) {
      if (pack.node_id === nodeId) {
        descend(pack, `${domain.id}/${pack.node_id}`);
      }
    }
  }
  return out;
}

describe("no authored lesson string displays a coefficient of one against a variable", () => {
  const display = displayed();

  it("swept a real population of authored strings", () => {
    const packs = LESSON_DOMAINS.reduce((total, d) => total + d.lessons.length, 0);
    expect(packs, "no lesson packs are registered").toBeGreaterThanOrEqual(60);
    expect(display.length, "the authored sweep found nothing").toBeGreaterThanOrEqual(
      2_000,
    );
  });

  it("displays no unit coefficient anywhere a learner reads", () => {
    const bad = display
      .filter((found) => UNIT_COEFFICIENT.test(found.text))
      .map((found) => `${found.where}: ${found.text}`);
    expect(bad.join("\n")).toBe("");
  });

  it("each pack carved out for accepted input still needs the carve-out", () => {
    const wrong: string[] = [];
    for (const [nodeId, reason] of Object.entries(ACCEPTS_THE_SPELLING)) {
      const forms = acceptedForms(nodeId);
      // Direction one: a pack that has stopped existing, or stopped offering accepted forms at
      // all, cannot sit here excusing nothing.
      if (forms.length === 0) {
        wrong.push(`${nodeId} is carved out but offers no accepted forms (${reason})`);
        continue;
      }
      // Direction two: a pack that has stopped spelling the one no longer needs excusing, and
      // leaving it listed would let the carve-out outlive its reason.
      if (!forms.some((found) => UNIT_COEFFICIENT.test(found.text))) {
        wrong.push(`${nodeId} no longer accepts a unit-coefficient spelling (${reason})`);
      }
    }
    expect(wrong.join("\n")).toBe("");
  });
});
