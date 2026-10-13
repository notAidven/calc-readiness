import { describe, expect, it } from "vitest";
import { generateFromTemplate, type ItemTemplate } from "../../../template";

import { TRG3_TEMPLATES } from "./index";

/**
 * TRG.3's two L3 shapes have to ask two different questions, not one question twice.
 *
 * They did not. `EXACT_VALUE_PAIRS` and `COORDINATE_PAIRS` were the same comprehension
 * character for character, over the same headings with the same exclusions, and both
 * templates then took the same `sinKey` / `cosKey` off the same table. Measured at
 * `24493680`: 13 `(heading, function)` cases each, 13 shared, and the answer agreed on all
 * 13. The prompts read differently — *"Give the exact value of $\sin 210^{\circ}$"* against
 * *"give the exact vertical reach of its tip"* — and the work behind them was identical, so a
 * served set ran the same four moves twice at L3 and the tier had half the variety it
 * advertised.
 *
 * `d9.test.ts:137` cannot see this: it asserts two distinct `template_id`s at each level,
 * which two identical procedures under two names satisfy.
 *
 * ## What "different work" is asserted as
 *
 * Not as a difference in the prompt, which is what the defect already had. `coordinates.l3`
 * now runs the reading BACKWARDS: it hands over one exact coordinate and the sign of the
 * other, and asks which heading that is. So the two shapes differ in what a learner produces
 * (a heading against a value), in which direction the reference table is read, and in what a
 * wrong answer means. The assertions below are that no case reaches the same answer through
 * both, that each answer lands in the other's grammar on no draw, and that both populations
 * are still deep enough for the claim to be about a cell rather than about one instance.
 */

const DRAWS = 400;

function templateFor(id: string): ItemTemplate {
  return TRG3_TEMPLATES.find((candidate) => candidate.template_id === id) as ItemTemplate;
}

const exactValue = templateFor("d9.trg3.exact-value-circle.l3");
const coordinates = templateFor("d9.trg3.coordinates.l3");

/** The `(function, heading)` cases a template reaches, each with the answer it keys. */
function casesOf(template: ItemTemplate, seedBase: number): Map<string, string> {
  const cases = new Map<string, string>();
  for (let index = 0; index < DRAWS; index += 1) {
    const item = generateFromTemplate(template, "practice", seedBase + index);
    const { isSine, deg } = item.template_params;
    cases.set(`${isSine}:${deg}`, item.answer.answer_key ?? "");
  }
  return cases;
}

describe("TRG.3's two L3 shapes ask two different questions", () => {
  const exactCases = casesOf(exactValue, 930_000);
  const coordinateCases = casesOf(coordinates, 940_000);

  it("reaches enough cases in each for the comparison to be about the cell", () => {
    expect(exactCases.size, "exact-value-circle.l3 draws a spread of headings").toBe(13);
    expect(coordinateCases.size, "coordinates.l3 draws a spread of headings").toBe(13);
  });

  it("never reaches the same answer through both shapes for the same case", () => {
    const shared = [...exactCases.entries()].filter(
      ([caseKey, key]) => coordinateCases.get(caseKey) === key,
    );
    expect(
      shared.length,
      `${shared.length} of ${exactCases.size} (heading, function) cases reach an identical answer through both L3 shapes, e.g. case ${shared[0]?.[0]} keyed ${shared[0]?.[1]} by each`,
    ).toBe(0);
  });

  it("answers in two different grammars, so the two are not one question reworded", () => {
    for (let index = 0; index < DRAWS; index += 1) {
      const value = generateFromTemplate(exactValue, "practice", 950_000 + index);
      const heading = generateFromTemplate(coordinates, "practice", 960_000 + index);
      // The value shape answers an exact coordinate: a fraction, a root, or both.
      expect(
        /sqrt|\//.test(value.answer.answer_key ?? ""),
        `exact-value-circle.l3 answers a value: ${value.answer.answer_key}`,
      ).toBe(true);
      // The heading shape answers a whole number of degrees inside one turn.
      const degrees = Number(heading.answer.answer_key);
      expect(
        Number.isInteger(degrees) && degrees > 90 && degrees < 360,
        `coordinates.l3 answers a heading: ${heading.answer.answer_key}`,
      ).toBe(true);
    }
  });

  it("makes the heading shape state the value it is read from, and the value shape state the heading", () => {
    for (let index = 0; index < 60; index += 1) {
      const heading = generateFromTemplate(coordinates, "practice", 970_000 + index);
      const value = generateFromTemplate(exactValue, "practice", 980_000 + index);
      // The one that answers a heading prints an exact reading and no heading at all.
      expect(
        /\\dfrac|\\sqrt/.test(heading.prompt),
        `coordinates.l3 hands over the reading: ${heading.prompt}`,
      ).toBe(true);
      expect(
        new RegExp(`${heading.answer.answer_key}\\^\\{\\\\circ\\}`).test(heading.prompt),
        `coordinates.l3 does not print the heading it asks for: ${heading.prompt}`,
      ).toBe(false);
      // The one that answers a value prints the heading and none of the reading.
      expect(
        /\^\{\\circ\}/.test(value.prompt),
        `exact-value-circle.l3 hands over the heading: ${value.prompt}`,
      ).toBe(true);
    }
  });
});
