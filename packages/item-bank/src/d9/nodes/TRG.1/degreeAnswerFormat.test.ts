import { describe, expect, it } from "vitest";
import { generateFromTemplate, type ItemTemplate } from "../../../template";

import { TRG2_TEMPLATES } from "../TRG.2";
import { TRG3_TEMPLATES } from "../TRG.3";
import { TRG4_TEMPLATES } from "../TRG.4";
import { TRG5_TEMPLATES } from "../TRG.5";
import { TRG1_TEMPLATES } from "./index";

/**
 * A prompt that wants an angle in degrees has to say the degree SIGN is not wanted.
 *
 * R30's third bullet is about the answer field and this is the same argument one step
 * earlier. These items are keyed with a bare integer, so `answerNotation` reaches no
 * notation tag for them and `MathAnswerColumn` renders neither a keypad nor a live preview:
 * the learner is shown "Your answer" over a bar, types the thing the question named, and
 * `30°` comes back `invalid_input/unknown_symbol`, which the equivalence spec scores as
 * unanswered rather than as a wrong answer. So the attempt is lost to notation on a question
 * the learner got right, and nothing on the screen said which notation was wanted.
 *
 * The wording is TRG.1's, and it is asserted as one literal rather than as a shape so the
 * five prompts cannot drift into five different phrasings of it. `rad-to-deg.l2` and
 * `coterminal-degree.l2` already carried it; the others were reworded to match rather than to
 * improve on it.
 *
 * ## The population is derived from the prompts, and its composition is asserted
 *
 * Deriving it is not enough on its own, because a derivation can derive the wrong set. So the
 * filter runs over every template in TRG.1 to TRG.5 and the set it produces is then checked
 * against a named list in BOTH directions: a template that starts answering in degrees and
 * does not carry the wording fails, and an entry that stops answering in degrees fails too
 * rather than sitting here exempting nothing. The floor under it is what stops the sweep
 * passing over an empty population.
 *
 * TRG.6 to TRG.9 answer in degrees on the same convention and are another lane's; the
 * domain-wide version of this sweep belongs in `d9.test.ts` once both halves have landed.
 */

/** The one wording, taken from `d9.trg1.rad-to-deg.l2` rather than invented. */
const NO_DEGREE_SIGN = "Enter one number, with no degree sign.";

/** How many draws each template is sampled over when the population is derived. */
const DRAWS = 60;

const EVERY_TEMPLATE: readonly ItemTemplate[] = [
  ...TRG1_TEMPLATES,
  ...TRG2_TEMPLATES,
  ...TRG3_TEMPLATES,
  ...TRG4_TEMPLATES,
  ...TRG5_TEMPLATES,
];

/**
 * Every template in TRG.1 to TRG.5 whose answer is a whole number of degrees typed into a
 * bare field: the prompt asks for the answer in degrees, the answer type is numeric, and the
 * key is an integer, which together are what leave the field with no keypad and no preview.
 */
function degreeAnswerers(): readonly ItemTemplate[] {
  return EVERY_TEMPLATE.filter((template) => {
    const draws = Array.from({ length: DRAWS }, (_unused, index) =>
      generateFromTemplate(template, "practice", 910_000 + index),
    );
    return draws.every(
      (item) =>
        item.answer.answer_spec.answer_type === "numeric" &&
        /^-?\d+$/.test(item.answer.answer_key ?? "") &&
        /in degrees/.test(item.prompt),
    );
  });
}

/** The five, each here because its answer is a heading or an angle and nothing else. */
const DEGREE_ANSWERERS: readonly string[] = [
  "d9.trg1.rad-to-deg.l2",
  "d9.trg1.coterminal-degree.l2",
  "d9.trg2.cofunction-angle.l3",
  "d9.trg3.reference-degree.l1",
  "d9.trg3.coordinates.l3",
];

describe("D9 TRG.1 to TRG.5 tell a degree answer that the sign is not wanted", () => {
  const derived = degreeAnswerers();

  it("derives the degree-answering population from the prompts, and it is the named one", () => {
    expect(
      derived.length,
      "the derived population is not empty, so the sweep below measures something",
    ).toBeGreaterThanOrEqual(5);
    expect(
      [...derived.map((template) => template.template_id)].sort(),
      "every template that answers in degrees is named, and every named one still does",
    ).toEqual([...DEGREE_ANSWERERS].sort());
    // And the filter is a filter rather than a pass-through: the radian and value shapes are
    // outside it, so a population that had swallowed the domain would fail here.
    expect(
      EVERY_TEMPLATE.length - derived.length,
      "most of these templates answer something other than a number of degrees",
    ).toBeGreaterThanOrEqual(15);
  });

  it("states the no-degree-sign wording in every draw of every one of them", () => {
    for (const template of derived) {
      for (let index = 0; index < DRAWS; index += 1) {
        const item = generateFromTemplate(template, "practice", 910_000 + index);
        expect(
          item.prompt.includes(NO_DEGREE_SIGN),
          `${template.template_id} asks for degrees behind a bare field without saying the sign is not wanted: ${item.prompt}`,
        ).toBe(true);
      }
    }
  });
});
