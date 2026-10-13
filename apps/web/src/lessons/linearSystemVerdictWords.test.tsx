/**
 * LF.4's graphing board offers the three verdicts LF.4 then asks a learner to TYPE (R22).
 *
 * The board's three options shipped as "They cross once", "No solution" and "Infinitely
 * many". Two of those report what the system HAS, which is the question the board poses
 * ("Is there a point that satisfies both equations?"); the first reported what the LINES do,
 * so the set answered two different questions. It was also the only one of the three that was
 * not the word the practice bank accepts, and `d7.lf4.classify.l2` grades its answer by exact
 * string match, so the lesson taught a phrase the practice on the same node refuses.
 *
 * The expected words are therefore DERIVED from the item bank rather than written down here:
 * the population is every key `d7.lf4.classify.l2` can serve, sampled until the set stops
 * growing. A word the template stops serving, or starts serving, fails this file rather than
 * quietly diverging from the board.
 */

import { createRng, LF4_TEMPLATES } from "@cr/item-bank";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinearSystemGraphExplore } from "./interactive/LinearSystemGraphExplore";

/** The classify shape, whose keys are the words a learner has to type on this node. */
const CLASSIFY_ID = "d7.lf4.classify.l2";

/** Every verdict word the practice bank serves, measured rather than listed. */
function servedVerdicts(): Set<string> {
  const template = LF4_TEMPLATES.find((entry) => entry.template_id === CLASSIFY_ID);
  if (!template) {
    throw new Error(`${CLASSIFY_ID} is gone; this file's premise moved`);
  }
  const words = new Set<string>();
  for (let seed = 1; seed <= 200; seed += 1) {
    const key = template.generate(createRng(seed * 104_729 + 7)).answer.answer_key;
    if (key === undefined) {
      throw new Error(`${CLASSIFY_ID} generated an item with no answer_key`);
    }
    words.add(key);
  }
  return words;
}

/** The board's three option labels, read off the rendered controls. */
function renderedOptions(container: HTMLElement): string[] {
  return [...container.querySelectorAll("button")]
    .map((button) => (button.textContent ?? "").trim())
    .filter((text) => /solution|infinitely/i.test(text));
}

describe("LF.4 graphing board: its verdicts are the words the node grades", () => {
  it("serves three verdict words from the classify template", () => {
    const words = servedVerdicts();
    // A floor under the derivation: an empty or one-word set would make the comparison below
    // pass on almost anything.
    expect(words.size, `${CLASSIFY_ID} served ${[...words].join(" / ")}`).toBe(3);
  });

  it("offers exactly those three, and phrases none of them about the lines", () => {
    const { container, unmount } = render(<LinearSystemGraphExplore />);
    try {
      // The verdict chips only exist on the second board, which is reached by working the
      // first: the point, both substitutions, then "Next pair of lines".
      const click = (name: string) => {
        const button = [...container.querySelectorAll("button")].find(
          (candidate) =>
            (candidate.getAttribute("aria-label") ?? "").includes(name) ||
            (candidate.textContent ?? "").includes(name),
        );
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error(`no control for "${name}"`);
        }
        fireEvent.click(button);
      };
      // (3, -2) is the crossing on the first board.
      for (let step = 0; step < 3; step += 1) {
        click("move right");
      }
      for (let step = 0; step < 2; step += 1) {
        click("move down");
      }
      click("Place point");
      click("check the point in 2x plus y equals 4");
      click("check the point in x minus y equals 5");
      click("Next pair of lines");

      const offered = renderedOptions(container);
      expect(offered.length, "the three verdict chips are not on screen").toBe(3);
      expect(new Set(offered.map((text) => text.toLowerCase()))).toEqual(servedVerdicts());
    } finally {
      unmount();
    }
  });
});
