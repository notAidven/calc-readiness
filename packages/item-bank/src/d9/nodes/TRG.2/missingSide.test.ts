import { describe, expect, it } from "vitest";
import { generateFromTemplate, type ItemTemplate } from "../../../template";

import { TRG2_TEMPLATES } from "./index";

/**
 * `missing-side.l2` may not key the length its own prompt handed over.
 *
 * The cell shipped a fifth shape at $45^{\circ}$ pairing the mast with the deck run through
 * the tangent. The mathematics is right — $\tan 45^{\circ} = 1$, so the two legs are equal —
 * and that is the defect: the item asks for a length it has already printed, so a learner who
 * reads no further than the numbers and applies no ratio is graded correct. Measured at
 * `24493680` over the 800 draws below, the answer was a standalone integer already in its own
 * prompt on 162 of them.
 *
 * The assertion is stronger than "the answer is not the given", because the angle is printed
 * too: no draw's key may appear anywhere in its prompt as a standalone number. That holds by
 * construction over the four shapes that remain, and it is worth asserting rather than
 * reasoning about, since the draw ranges are what make it true.
 *
 * A count alone would also pass on a template that had lost four of its five shapes, so the
 * shapes actually reached are censused beside it.
 */

const DRAWS = 800;

const template = TRG2_TEMPLATES.find(
  (candidate) => candidate.template_id === "d9.trg2.missing-side.l2",
) as ItemTemplate;

const samples = Array.from({ length: DRAWS }, (_unused, index) =>
  generateFromTemplate(template, "practice", 920_000 + index),
);

describe("TRG.2's whole-number missing side is never the length it was given", () => {
  it("keys no draw with a number its own prompt has already printed", () => {
    const offenders = samples.filter((item) => {
      const key = item.answer.answer_key ?? "";
      return new RegExp(`(?<!\\d)${key}(?!\\d)`).test(item.prompt);
    });
    const rate = ((offenders.length / DRAWS) * 100).toFixed(1);
    expect(
      offenders.length,
      `${offenders.length} of ${DRAWS} draws (${rate}%) are answered by retyping a number already in the prompt, e.g. key ${offenders[0]?.answer.answer_key} in "${offenders[0]?.prompt}"`,
    ).toBe(0);
  });

  it("still reaches every shape it declares, in both directions", () => {
    const shapes = new Set(samples.map((item) => item.template_params.shape));
    expect(
      [...shapes].sort((a, b) => (a as number) - (b as number)),
      "the four whole-number pairings are all reachable, and no fifth shape has appeared unmeasured",
    ).toEqual([0, 1, 2, 3]);
    // Both directions of the ratio are drawn: two shapes hand over the wire and halve it, two
    // hand over a leg and double it, so neither "always halve" nor "always double" passes.
    for (const shape of [0, 1, 2, 3]) {
      expect(
        samples.filter((item) => item.template_params.shape === shape).length,
        `shape ${shape} is drawn`,
      ).toBeGreaterThan(100);
    }
  });

  it("hands over a length that is not the answer, on every draw", () => {
    for (const item of samples) {
      const { given, answer } = item.template_params;
      expect(given, item.prompt).not.toBe(answer);
      expect(Number.isInteger(given as number), item.prompt).toBe(true);
      expect(Number.isInteger(answer as number), item.prompt).toBe(true);
    }
  });
});
