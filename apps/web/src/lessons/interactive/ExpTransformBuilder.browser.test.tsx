import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { LessonVisual } from "../visuals";
import { ExpTransformBuilder } from "./ExpTransformBuilder";

// The real stylesheet, because the cascade test below is an assertion about which of two
// tied single-class rules wins. On a bare host `text-transform` reads its initial `none`
// and the test would pass on the bug. Imported last, as `main.tsx` imports it, so the
// injection order here is the app's.
import "../../styles.css";

/**
 * Two blanks, one gate. The first board reflects `y = 2 * 7^x` over the x-axis, so the
 * coefficient blank holds `-2` and the exponent blank holds `x` untouched: a learner who mirrors
 * the wrong one of the two writes `2` and `-x` and gets neither.
 *
 * `Check` settles each blank that is right on its own, which is what makes a half-finished board
 * possible, so the test drives the half-right case deliberately: the exponent settles, the
 * coefficient is named as still wrong, and the gate stays shut until it is written.
 */
function field(host: HTMLElement, label: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label^="${label}"]`);
  if (!input) {
    throw new Error(`no blank labelled "${label}"`);
  }
  return input;
}

const COEFFICIENT = "The coefficient in front of the power";
const EXPONENT = "The exponent, with its sign";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpTransformBuilder refuses a mirrored exponent and gates on both blanks, exactly once", async () => {
  let completed = 0;
  h = mount(<ExpTransformBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("input").length === 2, "both blanks mount");

  // Mirroring the input instead of the output: both blanks wrong, and named as such.
  setInputValue(field(host, COEFFICIENT), "2");
  setInputValue(field(host, EXPONENT), "-x");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Neither blank is right yet"), "both are refused");
  expect(completed).toBe(0);

  // Half right: the exponent settles and the coefficient is named as the one still missing.
  setInputValue(field(host, EXPONENT), "x");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "The exponent is right."),
    "the settled blank is separated from the open one",
  );
  expect(completed, "one blank of two is not the answer").toBe(0);
  expect(field(host, EXPONENT).readOnly, "a settled blank stops taking input").toBe(true);

  setInputValue(field(host, COEFFICIENT), "-2");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the gate opens on both blanks");

  // The board is spent: the Check control is gone, so nothing can latch it again.
  expect(
    host.querySelector("button.lesson-interactive__check"),
    "the check control is gone",
  ).toBeNull();
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("ExpTransformBuilder offers its reveal only after a check, and names the open blank", async () => {
  h = mount(<ExpTransformBuilder />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("input").length === 2, "both blanks mount");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  setInputValue(field(host, COEFFICIENT), "2");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "Reveal the coefficient"),
    "the reveal names the first blank still open",
  );
});

/**
 * THE SECOND BLANK IS REACHABLE FROM OUTSIDE THE WIDGET, with no source change.
 *
 * A reveal-fill sweep in another file drives this board's COEFFICIENT blank and records the
 * EXPONENT as undriveable, on the reasoning that the reveal always explains the first blank
 * still open and so can never be pointed at the second one. The reasoning holds for a board
 * the learner has got nowhere on; it stops holding as soon as the attempt settles the
 * coefficient, because `outstanding` is then the exponent and the fill lands there.
 *
 * So this is a walk, not a fix: the attempt below writes the coefficient RIGHT and the
 * exponent WRONG, which is a real half-answered board and a miss the widget already has
 * wording for. Everything after it is the shared machinery — mount through the registry so
 * the feedback host is real, one `Check`, one reveal — which is why the recipe transplants
 * into the sweep as an `attempt`, and why nothing here is a claim about this file's source.
 *
 * What is asserted is the sweep's own property: the passage states the answer and the blank
 * it names now SHOWS that answer, marked as the shared layer's fill rather than the
 * learner's, and stating it did not open the gate.
 */
test("ExpTransformBuilder's exponent blank takes the reveal fill once the coefficient is settled", async () => {
  let completed = 0;
  // Through the registry, so the shared feedback host is really mounted: bare, the widget
  // takes the no-host path where a reveal resolves straight through the widget's own state,
  // and the fill under test here never happens at all.
  h = mount(<LessonVisual id="exp-transform-builder" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("input").length === 2, "both blanks mount");

  // Half right, deliberately: the mirror was read as acting on the input as well.
  setInputValue(field(host, COEFFICIENT), "-2");
  setInputValue(field(host, EXPONENT), "-x");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "The coefficient is right. The exponent is not"),
    "the coefficient settles and the exponent is named as the one still open",
  );

  // The reveal has followed the open blank, which is the whole of what makes this driveable.
  await waitFor(
    () => hasText(host, "Reveal the exponent"),
    "the reveal names the second blank",
  );
  findButton(host, "Reveal the exponent").click();

  const exponent = () => field(host, EXPONENT);
  await waitFor(
    () => exponent().getAttribute("data-reveal-given") === "on",
    "the blank the passage named is marked as filled by the shared layer",
  );
  expect(exponent().value, "the blank shows the answer the passage states").toBe("x");
  expect(exponent().readOnly, "a filled blank is to read, not to submit").toBe(true);
  expect(completed, "filling the blank in opened the gate").toBe(0);
  expect(
    field(host, COEFFICIENT).getAttribute("data-reveal-given"),
    "the blank the learner answered themselves is not marked",
  ).toBeNull();
});

/**
 * The board's step labels carry mathematical variables — the `x` of `y = 2 \cdot 7^{x}` — so
 * they opt out of the uppercasing every other step label gets, and the lesson prose around
 * them says `y` and `x` in lowercase. `--mixed` and the base rule are both single-class
 * selectors, so specificity ties and source order alone decides: with the modifier written
 * ABOVE the base rule it lost, and the opt-out was dead CSS.
 *
 * Read off `getComputedStyle`, not off the class list: carrying the modifier is what was
 * already true while the text rendered uppercase anyway.
 */
test("ExpTransformBuilder's mixed-case step labels really escape the uppercasing", async () => {
  h = mount(<ExpTransformBuilder />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__step-label--mixed") !== null,
    "a mixed-case step label mounts",
  );

  const mixed = Array.from(
    host.querySelectorAll<HTMLElement>(".lesson-interactive__step-label--mixed"),
  );
  // A floor, so "every label escapes" cannot be satisfied by there being no labels.
  expect(
    mixed.length,
    "the board prints at least one mixed-case step label",
  ).toBeGreaterThan(0);
  for (const label of mixed) {
    const style = getComputedStyle(label);
    expect(style.textTransform, `"${label.textContent}" is uppercased`).toBe("none");
    expect(style.letterSpacing, `"${label.textContent}" keeps the tracked spacing`).toBe(
      "normal",
    );
  }

  // The move is a reorder, not a deletion: a plain step label still uppercases, so this
  // cannot be made green by dropping the base declaration the modifier overrides.
  const plain = document.createElement("p");
  plain.className = "lesson-interactive__step-label";
  host.appendChild(plain);
  expect(
    getComputedStyle(plain).textTransform,
    "the base rule still uppercases labels that did not opt out",
  ).toBe("uppercase");
  plain.remove();
});
