import { describe, expect, it } from "vitest";
import { generateFromTemplate, type ItemTemplate } from "../../../template";

import { TRG5_TEMPLATES } from "./index";

/**
 * TRG.5's L3 build has to be harder than TRG.5's own L1 and L2, and it was not.
 *
 * `features.l3` asked for the amplitude, the period or the midline of a written rule. Two of
 * those three are a number COPIED out of the rule the prompt just printed: the amplitude is the
 * coefficient in front with its sign dropped, and the midline is the constant on the end. A
 * learner who retyped a number they could see scored two thirds of the cell, and the two thirds
 * they scored were `amplitude.l1` and `midline.l2` asked again at L3.
 *
 * Its docblock argued the tier rested on the $c$ distractor, and that argument does not survive
 * hint 2, which names $c$ as the number that answers nothing, and hint 3, which maps each of the
 * three features onto its slot. By the last hint the item is a lookup with the table supplied.
 *
 * So the cell now asks for a reading the rule does not contain: the highest reading, the lowest
 * reading, or the distance between them. Each needs the level and the swing COMBINED, which is
 * the mini-lesson's own closing sentence ("the highest reading a signal takes is its midline
 * plus its amplitude and the lowest is its midline minus it") and the direction opposite to
 * `midline.l2`, which hands over two readings and asks for the level between them.
 *
 * `d2.test.ts`'s `describe("EXP.1's L3 build is harder than its own L2")` is the model, and the
 * contrast is asserted the same way: not that L3 is hard in the abstract, but that the property
 * which makes the easier tier easy is measurably absent here and measurably present there.
 */

const DRAWS = 800;

function templateFor(id: string): ItemTemplate {
  return TRG5_TEMPLATES.find((candidate) => candidate.template_id === id) as ItemTemplate;
}

const features = templateFor("d9.trg5.features.l3");
const amplitude = templateFor("d9.trg5.amplitude.l1");

/** Whether the key stands in the prompt as a number of its own, not as part of a longer one. */
function keyIsPrinted(prompt: string, key: string): boolean {
  return new RegExp(`(?<!\\d)${key.replace("-", "-?")}(?!\\d)`).test(prompt);
}

const samples = Array.from({ length: DRAWS }, (_unused, index) =>
  generateFromTemplate(features, "practice", 960_000 + index),
);

describe("TRG.5's L3 build is harder than its own L1 and L2", () => {
  it("hands back no number its own rule has already printed", () => {
    const offenders = samples.filter((item) =>
      keyIsPrinted(item.prompt, item.answer.answer_key ?? ""),
    );
    const rate = ((offenders.length / DRAWS) * 100).toFixed(1);
    expect(
      offenders.length,
      `${offenders.length} of ${DRAWS} draws (${rate}%) are answered by retyping a number the rule already shows, e.g. key ${offenders[0]?.answer.answer_key} in "${offenders[0]?.prompt}"`,
    ).toBe(0);
  });

  it("keys every draw to two of the rule's numbers combined, never to one of them", () => {
    for (const item of samples) {
      const a = Number(item.template_params.a);
      const d = Number(item.template_params.d);
      const feature = Number(item.template_params.feature);
      const magnitude = Math.abs(a);
      const wanted =
        feature === 0 ? d + magnitude : feature === 1 ? d - magnitude : 2 * magnitude;
      expect(
        item.answer.answer_key,
        `the key has to be the combination the prompt asks for: ${item.prompt}`,
      ).toBe(`${wanted}`);
      // The combination is a real one: no draw where the two numbers combine to one of them.
      expect(wanted, item.prompt).not.toBe(magnitude);
      expect(wanted, item.prompt).not.toBe(d);
    }
  });

  it("still reaches all three readings, so the cell is not one question repeated", () => {
    const reached = new Set(samples.map((item) => item.template_params.feature));
    expect(
      [...reached].sort((left, right) => (left as number) - (right as number)),
      "the highest reading, the lowest reading and the distance between them are all drawn",
    ).toEqual([0, 1, 2]);
    for (const feature of [0, 1, 2]) {
      expect(
        samples.filter((item) => item.template_params.feature === feature).length,
        `reading ${feature} is drawn often enough to be part of the cell rather than a rarity`,
      ).toBeGreaterThanOrEqual(DRAWS / 6);
    }
  });

  /**
   * The floor under the comparison. Without it "L3 never hands back a printed number" could be
   * read as a claim about the metric being unable to fire, so the same metric is run over the
   * node's L1, where handing back a printed number is exactly the right behaviour for the tier.
   */
  it("measures a cell where the same metric does fire, so the L3 result is a contrast", () => {
    const l1 = Array.from({ length: 200 }, (_unused, index) =>
      generateFromTemplate(amplitude, "practice", 970_000 + index),
    );
    const printed = l1.filter((item) =>
      keyIsPrinted(item.prompt, item.answer.answer_key ?? ""),
    );
    expect(
      printed.length / l1.length,
      `amplitude.l1 hands back a printed number on ${((printed.length / l1.length) * 100).toFixed(1)}% of draws, which is what an L1 read is`,
    ).toBeGreaterThan(0.9);
  });

  it("leaves no hint mapping the features onto their slots", () => {
    for (const item of samples.slice(0, 40)) {
      const last = item.hints[item.hints.length - 1] ?? "";
      expect(
        /constant on the end is the level|coefficient in front sizes the swing/.test(last),
        `the closing hint reads the answer off the rule for the learner: ${last}`,
      ).toBe(false);
    }
  });
});
