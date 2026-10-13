import { afterEach, expect, test } from "vitest";

import { cornerMismatches } from "../drawnTriangle";
import {
  findButton,
  type Harness,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { GEO_ANGLE_BOARDS, GeoAngleExplore } from "./GeoAngleExplore";

/**
 * Three relations, one gate. The board asks for the supplement, then the vertical angle,
 * then the third angle of the triangle, and only the last of those may open the gate: a
 * widget that gated on the first would let a learner past having met one relation of three.
 *
 * Progress is read off the slot chips' `data-state` rather than off the text, because every
 * answer is also a number KaTeX has drawn somewhere on the figure.
 */
function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("no answer box");
  }
  return box;
}

function settled(host: HTMLElement): number {
  return host.querySelectorAll('[data-angle-slot][data-state="solved"]').length;
}

function answer(host: HTMLElement, typed: string): void {
  setInputValue(entry(host), typed);
  findButton(host, "Check").click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoAngleExplore gates only once all three angles are found", async () => {
  let completed = 0;
  h = mount(<GeoAngleExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-angle-slot]") !== null, "the board mounts");

  expect(settled(host)).toBe(0);

  // The first board marks 52 degrees at the crossing and 43 and 61 inside the triangle, so
  // the three answers are the supplement 128, the vertical angle 52, and the third angle 76.
  answer(host, "128");
  await waitFor(() => settled(host) === 1, "the supplement lands");
  expect(completed, "one relation of three is not the board").toBe(0);

  answer(host, "52");
  await waitFor(() => settled(host) === 2, "the vertical angle lands");
  expect(completed).toBe(0);

  answer(host, "76");
  await waitFor(() => completed === 1, "gates on the third angle");
  expect(settled(host)).toBe(3);
  expect(hasText(host, "Start over with different angles")).toBe(true);
});

test("GeoAngleExplore refuses a wrong measure and offers a reveal after the attempt", async () => {
  let completed = 0;
  h = mount(<GeoAngleExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-angle-slot]") !== null, "the board mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  // 90 is what a learner reaches by assuming the two angles beside each other are equal
  // halves of the straight line rather than a supplementary pair.
  answer(host, "90");
  await waitFor(() => hasText(host, "Not that measure"), "the wrong measure is refused");
  expect(settled(host)).toBe(0);
  expect(completed).toBe(0);
  expect(hasText(host, "Reveal")).toBe(true);

  answer(host, "128");
  await waitFor(() => settled(host) === 1, "the right measure still lands afterwards");
  expect(completed).toBe(0);
});

/**
 * THE TRIANGLE IS DRAWN AT THE ANGLES IT IS LABELLED WITH, on every board.
 *
 * The board used to be three hardcoded vertices measuring about 66, 47 and 67 degrees, with
 * whichever pair the board carried written onto two of them. Both boards' labels then ran in
 * the INVERSE order of the drawing: on board one `43` sat in the widest drawn corner and `61`
 * in the narrowest, and on board two `74` sat in the 47-degree corner. A learner who
 * sanity-checked an answer against the picture, which is the move this widget exists to
 * encourage, read their correct answer back as wrong.
 *
 * The population is `GEO_ANGLE_BOARDS` itself rather than a written-down board or two: the
 * widget deals its boards in order and this walks all of them, so a third board is swept the
 * day it is added and cannot be the one nobody measured.
 *
 * Each board is finished before it is measured, because the third corner carries the symbol
 * `z` until the part is settled and there is no third angle on the figure to compare until
 * then. The crossing beside the triangle marks three more angles; `cornerMismatches` excludes
 * them by the outline's own box, and the assertion that exactly three labels were found is
 * what would report it if that stopped holding.
 */
test("GeoAngleExplore draws each board's triangle at the angles it labels", async () => {
  h = mount(<GeoAngleExplore />);
  const { host } = h;
  await waitFor(() => host.querySelector("[data-angle-slot]") !== null, "the board mounts");

  expect(GEO_ANGLE_BOARDS.length, "the widget deals no boards").toBeGreaterThanOrEqual(2);

  const wrong: string[] = [];
  let measured = 0;
  for (const board of GEO_ANGLE_BOARDS) {
    const [first, second] = board.triangle;
    // The board's three questions, in the order it asks them: the supplement of the marked
    // crossing angle, the angle vertical to it, then the triangle's third angle.
    for (const value of [180 - board.crossing, board.crossing, 180 - first - second]) {
      answer(host, `${value}`);
    }
    await waitFor(
      () => settled(host) === 3,
      `the board marked ${board.crossing} degrees is finished`,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "the finished board typesets its maths",
    );

    const where = `the board marked ${board.crossing} degrees`;
    wrong.push(...cornerMismatches(where, host));
    measured += 3;

    findButton(host, "Start over with different angles").click();
    await waitFor(() => settled(host) === 0, "the next board is dealt");
  }

  expect(
    wrong.join("; "),
    "these corners are drawn at an angle other than the one printed in them",
  ).toBe("");
  // A floor under an ABSENCE: a run that paired no corner satisfies the claim above.
  expect(measured, "no corner was measured").toBeGreaterThanOrEqual(6);
});
