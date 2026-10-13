import { afterEach, expect, test } from "vitest";

import { allLessons } from "./domains";
import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

/** Every id any lesson places, across every registered domain, in first-seen order. */
const liveVisualIds = () =>
  Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  );

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("pemdas-solver-ltr forces left-to-right within a shared tier, then gates", async () => {
  let completed = 0;
  h = mount(<LessonVisual id="pemdas-solver-ltr" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "solver mounts");

  // ÷ and × share the multiply/divide tier: apply it twice, left to right.
  findButton(host, "Multiply / Divide").click();
  await waitFor(() => hasMath(host, "5 \\times 2"), "divide applied first (20 ÷ 4 = 5)");
  findButton(host, "Multiply / Divide").click();
  await waitFor(() => hasMath(host, "10 - 7"), "multiply applied next (5 × 2 = 10)");

  // + and − share the add/subtract tier: apply it twice, left to right.
  findButton(host, "Add / Subtract").click();
  await waitFor(() => hasMath(host, "3 + 1"), "subtract applied first (10 − 7 = 3)");
  findButton(host, "Add / Subtract").click();

  await waitFor(() => completed === 1, "gates once fully reduced to 4");
  expect(hasText(host, "Left to right within a tier")).toBe(true);
});

test("pemdas-solver-ltr rejects jumping to the lower tier first", async () => {
  let completed = 0;
  h = mount(<LessonVisual id="pemdas-solver-ltr" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "solver mounts");

  // Add/Subtract is still blocked while a multiply/divide remains.
  findButton(host, "Add / Subtract").click();
  await waitFor(() => hasText(host, "Not yet"), "lower tier rejected");
  expect(completed).toBe(0);
});

test("every lesson visual id resolves to a registered visual, in every domain", async () => {
  const ids = liveVisualIds();
  expect(ids).toContain("pemdas-solver-ltr");
  // A D2 id too, so the sweep provably covers more than the domain it started on.
  expect(ids).toContain("exponent-laws-builder");

  for (const id of ids) {
    const local = mount(<LessonVisual id={id} />);
    await waitFor(
      () => local.host.querySelector("figure.lesson-visual") !== null,
      `renders ${id}`,
    );
    local.cleanup();
  }
});

/**
 * The jsdom guard (`visualsMath.test.tsx`) proves each visual hands LaTeX to KaTeX; only a
 * real browser proves KaTeX's HTML actually lays out inside the SVG, which is the part
 * `foreignObject` can silently get wrong (zero-size box, clipped subtree).
 *
 * **A FLOOR, BECAUSE THE SWEEP BELOW IS A `for` OVER WHATEVER IT FINDS.** Every assertion
 * in this test is inside a loop over the boxes a widget happens to render, and a loop over
 * nothing passes. So a selector that stopped matching — `data-latex` renamed, the primitives
 * moved off `foreignObject` — would leave this test green over a suite it had stopped
 * reading, which is the shape of false green this repository keeps finding.
 *
 * MEASURED at `5d039a99`, and floored well under the measurement so that ordinary content
 * churn does not touch it: 308 boxes, across 117 of the 253 live visuals. Injected and
 * watched fail rather than argued — rename `data-latex` to `data-latexx` on `svgKit`'s two
 * `foreignObject` sites and this file reports `no in-diagram math box was measured, so every
 * assertion above looped over nothing: expected 0 to be greater than or equal to 240`, where
 * without the floor that same run is GREEN.
 *
 * A FLOOR CONSTRAINS SIZE AND NOT SHAPE, and no second number is added here for the shape,
 * because a box count and a widget count collapse together under every injection available:
 * any defect that empties the selector empties both, so a widget floor beside this one could
 * not be forced red on its own and would be decorative. The breadth of the population is
 * already somebody's claim — the sibling test above asserts `liveVisualIds()` spans more
 * than one domain by name and that every id it yields resolves to a registered visual — so
 * this is the place for the count and not for the census.
 */
const MATH_BOX_FLOOR = 240;

test("in-diagram math lays out inside its foreignObject", async () => {
  const ids = liveVisualIds();
  let boxes = 0;

  for (const id of ids) {
    const local = mount(<LessonVisual id={id} />);
    const { host } = local;
    await waitFor(
      () => host.querySelector("figure.lesson-visual") !== null,
      `renders ${id}`,
    );
    /*
     * **AND THEN WAIT FOR THE TYPESETTING, WHICH IS A LATER TASK THAN THE COMMIT.**
     *
     * `svgKit`'s `useKatex` calls `katex.render` in a `useEffect`, so the `foreignObject`
     * carrying `data-latex` is in the DOM at commit and its `.katex` child arrives when
     * React flushes passive effects — a separate scheduled task. The wait above is
     * satisfied by the commit, so reading `.katex` straight after it is a race, and the
     * loop below is the side of it that loses: it reports an empty host as
     * "rendered no KaTeX", which reads as a broken widget rather than an early read.
     *
     * MEASURED, NOT SUSPECTED. Run 30926735214 on `5d039a99` failed exactly there —
     * `exp-factor-slider: a math foreignObject rendered no KaTeX`, in `test-browser (2)`,
     * on a tree whose merge (#540) touched only era-four succession files and whose own
     * two browser tests are in shards 1 and 3, so nothing in that diff is an input to
     * this file. The same shard, run whole on the same commit, passes off the runner
     * (76 files, 653 passed), and the four trunk runs before it were green on the same
     * code. A two-core runner under software rasterisation is where a lost task shows up.
     *
     * This waits for the effect instead of racing it, and ITS OWN TIMEOUT IS SWALLOWED on
     * purpose: it is synchronization, not the assertion. Left to throw, it would report
     * every genuinely broken widget as `waitFor timed out` and the named error below would
     * become a line that can never fire — a guard that reads as load-bearing and is not.
     * Swallowed, a box that never typesets gets the same 4s every other wait in this file
     * gets and then fails in the loop, with the diagnosis this file has always given.
     * Injected and watched fail, not argued: with `useKatex` neutered so no `.katex` is
     * ever produced, this file reports
     * `absolute-value-explore: a math foreignObject rendered no KaTeX`.
     */
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("foreignObject[data-latex]")).every(
          (box) => box.querySelector(".katex") !== null,
        ),
      `${id}: in-diagram math typesets`,
    ).catch(() => undefined);
    // Iterating over whatever boxes exist, rather than asserting a count, keeps this
    // honest for the widgets that draw pure geometry until the learner acts. The floor
    // after the loop is what stops that honesty becoming vacuity.
    //
    // Scoped to `[data-latex]`, the hook both math primitives stamp on their box, and the
    // same selector the jsdom guard uses. A bare `foreignObject` is NOT always math: it is
    // also the only way to put a real focusable `<button>` inside an `<svg>`, which is how
    // a widget offers in-diagram click targets to the keyboard and to assistive tech.
    // Matching every `foreignObject` would fail those widgets for having no math in a box
    // that was never meant to hold any.
    for (const box of Array.from(host.querySelectorAll("foreignObject[data-latex]"))) {
      const katex = box.querySelector<HTMLElement>(".katex");
      if (!katex) {
        throw new Error(`${id}: a math foreignObject rendered no KaTeX`);
      }
      const rect = katex.getBoundingClientRect();
      expect(rect.width, `${id}: math has width`).toBeGreaterThan(0);
      expect(rect.height, `${id}: math has height`).toBeGreaterThan(0);
      boxes += 1;
    }
    local.cleanup();
  }

  expect(
    boxes,
    "no in-diagram math box was measured, so every assertion above looped over nothing",
  ).toBeGreaterThanOrEqual(MATH_BOX_FLOOR);
});
