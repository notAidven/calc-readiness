/**
 * EXP.1's negative-exponent slide teaches an OPPOSITION, and its widget is that opposition.
 *
 * The slide used to derive, from the product rule, that a negative exponent could not be
 * anything but a reciprocal, and it built that derivation a line at a time. The framing is now
 * the symmetric other half of what EXP.1 opened with: a positive exponent multiplies, a
 * negative one divides, and the fraction is where dividing leaves the number.
 *
 * The prose and the interaction had to move together or the slide would teach one idea and
 * practise another, so what this pins is that the widget makes MULTIPLY VERSUS DIVIDE the thing
 * the learner handles:
 *
 *  1. The same tap is right on one side of the row and wrong on the other, which is only true
 *     if the sign of the exponent is what the board is asking about.
 *  2. The cells are asked for alternately, so the choice flips every time and the board cannot
 *     be finished by pressing one button repeatedly. That is the "the pattern just continues"
 *     habit the old shape taught, and it is the specific thing this replaced.
 *  3. Dividing produces a FRACTION on the board, because that is the claim the prose makes
 *     about where fractions come from.
 */

import { afterEach, expect, test } from "vitest";
import exp1 from "../../../../content/lessons/d2/EXP.1.json";
import { findButton, type Harness, hasMath, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

function status(host: HTMLElement): string {
  return host.querySelector(".lesson-interactive__status")?.textContent ?? "";
}

async function mirror(onComplete?: () => void): Promise<HTMLElement> {
  h = mount(<LessonVisual id="negative-exponent-play" onComplete={onComplete} />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );
  return host;
}

test("the slide that teaches the opposition is the one that mounts it", () => {
  // Identified by CONTENT, not by number: the pack gained a `slide_subtitles` field and two
  // PRs landed after the defect was reported, so an index quoted from a screenshot is worth
  // nothing. This is the slide whose prose sets multiplying against dividing.
  const slide = exp1.mini_lesson.findIndex((prose: string) =>
    prose.includes("A negative exponent is that same instruction turned round"),
  );
  expect(slide, "no slide frames a negative exponent as the opposite instruction").toBe(6);

  // The old framing, and the defence it needed, are gone rather than merely moved.
  const prose = exp1.mini_lesson[slide] as string;
  expect(prose).not.toContain("could not have been anything else");
  expect(prose).not.toContain("only one number does that");
  expect(prose).toContain("divide");

  // The interaction moved with the idea. The derivation ladder is no longer on this slide.
  const mounted = exp1.visuals.find((v: { after: number }) => v.after === slide);
  expect(mounted?.id).toBe("negative-exponent-play");
  expect(exp1.visuals.map((v: { id: string }) => v.id)).not.toContain(
    "negative-exponent-order",
  );

  // And the subtitle names the new idea rather than the old one. #159 rewrote all 31 D2
  // subtitles to short question form while this branch was open, and its line for THIS slide
  // ("Why must that be?") was written against the derivation that is gone: nothing here argues
  // that anything must be so any more. A later pass took most of D2 back to plain noun-phrase
  // titles and left the question form only where a question is the natural thing to say; this
  // slide keeps it because the either/or IS the slide, and a statement would name one half.
  expect(exp1.slide_subtitles[slide]).toBe("Multiply or divide?");
  expect(exp1.slide_subtitles).not.toContain("Why must that be?");
});

test("the same tap is right on one side of the row and wrong on the other", async () => {
  const host = await mirror();

  // The first cell asked for is outward on the RIGHT, where the exponent goes up, so dividing
  // is refused and multiplying is taken.
  findButton(host, "\u00f7").click();
  await waitFor(
    () => status(host).includes("Not that one"),
    "dividing is refused on the right",
  );
  expect(status(host)).toContain("multiplying");

  findButton(host, "\u00d7").click();
  await waitFor(() => status(host).includes("dashed cell"), "multiplying is taken");

  // The next cell is outward on the LEFT, and now the very same tap is the wrong one. Nothing
  // about the board changed except the SIGN of the exponent being asked for, which is the
  // whole of what this widget teaches.
  findButton(host, "\u00d7").click();
  await waitFor(
    () => status(host).includes("Not that one"),
    "multiplying is refused on the left",
  );
  expect(status(host)).toContain("opposite");

  findButton(host, "\u00f7").click();
  await settle();

  // Dividing put a FRACTION on the board, which is where the prose says fractions come from.
  await waitFor(
    () => hasMath(host, "\\tfrac{1}{3}") || hasMath(host, "\\tfrac{1}{5}"),
    "dividing left the value under a 1",
  );
});

test("the board cannot be finished by pressing one button over and over", async () => {
  let completed = 0;
  const host = await mirror(() => {
    completed += 1;
  });

  // Four cells, and the answer alternates, so eight taps of one button gets through exactly
  // the two that happen to want it and is refused on the rest.
  for (let tap = 0; tap < 8; tap += 1) {
    findButton(host, "\u00d7").click();
    await settle();
  }
  expect(completed, "one button, pressed repeatedly, walked the whole board").toBe(0);
  expect(status(host)).toContain("Not that one");
});
