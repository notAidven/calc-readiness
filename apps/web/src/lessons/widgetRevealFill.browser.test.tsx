/**
 * A reveal FILLS THE BLANK IN, and taking the re-ask empties it again.
 *
 * The defect: "the answer is $x^{7}$" printed directly above a box still holding the
 * learner's $3$, or above an empty dashed slot with the right chip still sitting in the tray.
 * The passage and the board disagreed and the learner had to carry the answer from one to the
 * other by eye.
 *
 * Fill and clear are ONE change and are tested as a pair on every case, because they fail in
 * opposite directions and shipping either alone is worse than shipping neither:
 *
 *  - Without the FILL the passage explains an answer the board does not show.
 *  - Without the CLEAR the fresh instance opens with the previous answer already in the blank,
 *    and #141's `inert` releases at exactly that moment, so that stale value is submittable.
 *
 * The file runs that pair twice over, because the mechanic has two halves that fail for
 * different reasons.
 *
 * SHAPE_CASES is about the CONTRACT. The blanks are not one implementation: a typed box holds
 * its answer in a `value`; a drop slot renders it as children and has to take the matching
 * chip off the tray with it; a dial holds a position; a two-column board holds a JOIN; a
 * worked listing holds WHICH LINE is boxed. So it runs one widget per shape, and every shape
 * is named rather than tested through whichever one happened to be in a screenshot.
 *
 * WIRED_CASES is about the APPLICATION, which is where this can go wrong quietly. Each of
 * those widgets names its own blank and its own answer expression, and there is no shared
 * layer to get that right for it: a mis-derived expression writes a WRONG ANSWER into a
 * blank, which is worse than leaving it empty, because a learner who reveals is then actively
 * taught something false. So every case pins the exact value the blank must hold, HOW MANY
 * blanks the reveal was allowed to fill, and — where a value alone would not say it — the
 * accessible name the fill sits under, which is what identifies the blank it went into.
 *
 * The uniform half of every claim is `data-reveal-given`, which only the shared layer sets:
 * exactly the blanks a reveal filled carry it, and after the re-ask none of them do.
 *
 * What the mark may not do is print a word. A `GIVEN` badge rode along with the amber dashing
 * on all eight shapes, and it restated what the dashing and the passage overhead already say
 * about a value the learner may be handed straight back and asked for again. It is asserted
 * absent, not just deleted: it lived in generated content, which `shown` below cannot read, so
 * every test here passed with it and would pass again if it returned.
 */

import { afterEach, expect, test } from "vitest";

import { kindsMatching, visualsBuiltOn, widgetsOwningCopy } from "./kindFamily";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

/** Every blank the shared layer has filled in for the learner. */
function givens(host: HTMLElement): HTMLElement[] {
  return all<HTMLElement>(host, '[data-reveal-given="on"]');
}

function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

/**
 * What a filled blank is SHOWING. A box carries it in `value`; every other shape renders it,
 * as typeset math or as a word. Empty means the blank was marked and left blank, which is the
 * failure this returns "" for.
 */
function shown(blank: HTMLElement): string {
  if (blank instanceof HTMLInputElement) {
    return blank.value;
  }
  const latex = all(blank, "[data-latex]")
    .map((n) => n.getAttribute("data-latex") ?? "")
    .join("|");
  return latex !== "" ? latex : (blank.textContent ?? "").trim();
}

/**
 * The accessible name a filled blank is announced under: its own, or the nearest one above it.
 *
 * This is how a case pins the fill to a TARGET rather than only to a value, and on a sort
 * board nothing else can: a chip parked in the wrong bin shows exactly the same thing as one
 * parked in the right bin, so the value is no evidence at all and the bin's own name is.
 * Blanks that carry a name themselves (every typed box) return it directly.
 */
function nameAround(blank: HTMLElement): string {
  let node: HTMLElement | null = blank;
  while (node !== null) {
    const name = node.getAttribute("aria-label");
    if (name !== null) {
      return name;
    }
    if (node.classList.contains("lesson-interactive")) {
      return "";
    }
    node = node.parentElement;
  }
  return "";
}

/**
 * Any word the stylesheet prints BESIDE a filled blank, as opposed to the answer inside it.
 *
 * A `GIVEN` badge used to sit here, and it is asserted gone rather than merely deleted
 * because deleting it leaves nothing that fails if it comes back. Read off the generated
 * content, which is where it lived and where `shown` above cannot see it: pseudo-element text
 * is in neither `value` nor `textContent`, so the whole suite passed either way.
 *
 * Both places it could be printed are checked. Half these blanks are `input`s, which cannot
 * carry a `::after` at all, so anything addressed at those has to go on the wrapper instead.
 */
function wordBeside(blank: HTMLElement): string {
  const carriers: HTMLElement[] = [blank];
  const parent = blank.parentElement;
  if (blank instanceof HTMLInputElement && parent !== null) {
    carriers.push(parent);
  }
  return carriers
    .flatMap((node) => [
      getComputedStyle(node, "::after").content,
      getComputedStyle(node, "::before").content,
    ])
    .filter((content) => content !== "none" && content !== "normal" && content !== '""')
    .join("|");
}

/** One blank being filled, the widget that mounts it, and how to get a wrong attempt onto it. */
interface FillCase {
  /** What this case is called in the test name: the shape it stands for, or the step. */
  name: string;
  id: LessonVisualId;
  /** Put a wrong answer in, so the reveal comes on offer with THIS step still in hand. */
  attempt: (host: HTMLElement) => void | Promise<void>;
  /** What the filled blanks must be showing, joined in document order. "" to skip. */
  answer: string;
  /**
   * How many blanks the reveal may fill. Pins that it filled the step the passage explains
   * and not the whole board, which no assertion on a value can say.
   */
  blanks?: number;
  /** The accessible name the fill sits under. See {@link nameAround}. */
  named?: string;
}

/** Let React commit what the last click queued, so the next step reads the new board. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** The nth text box on the board, which is how the multi-box builders are driven. */
function box(host: HTMLElement, index: number): HTMLInputElement {
  const found = all<HTMLInputElement>(host, "input:not([type='range'])")[index];
  if (found === undefined) {
    throw new Error(`no box at index ${index}`);
  }
  return found;
}

/** Type into the nth box and press the first control whose label contains `label`. */
function answerWith(
  host: HTMLElement,
  entries: readonly (readonly [number, string])[],
  label: string,
): void {
  for (const [index, value] of entries) {
    setInputValue(box(host, index), value);
  }
  findButton(host, label).click();
}

/**
 * The control holding this piece of typeset math.
 *
 * Matched on the LaTeX rather than the text, because KaTeX's output is not searchable: a
 * fraction renders no slash, and the MathML half of the output repeats every glyph.
 */
function mathButton(host: HTMLElement, latex: string): HTMLElement {
  const math = all<HTMLElement>(host, "[data-latex]").find(
    (node) => node.getAttribute("data-latex") === latex,
  );
  const button = math?.closest("button");
  if (!button) {
    throw new Error(`no button holding the math ${latex}`);
  }
  return button;
}

/** The control with this accessible name. */
function namedButton(host: HTMLElement, name: string): HTMLElement {
  const found = all<HTMLElement>(host, "button").find(
    (button) => button.getAttribute("aria-label") === name,
  );
  if (!found) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}

/** The tray chip with this accessible name. */
function chipNamed(host: HTMLElement, name: string): HTMLElement {
  const found = all<HTMLElement>(host, ".lesson-sorter__chip").find(
    (chip) => chip.getAttribute("aria-label") === name,
  );
  if (!found) {
    throw new Error(`no tray chip named "${name}"`);
  }
  return found;
}

/** The drop target with this accessible name: a sorter bin, a table slot, a figure slot. */
function targetNamed(host: HTMLElement, name: string): HTMLElement {
  const found = all<HTMLElement>(
    host,
    ".lesson-sorter__bin, .lesson-table__slot, .lesson-label__slot",
  ).find((target) => (target.getAttribute("aria-label") ?? "").startsWith(name));
  if (!found) {
    throw new Error(`no drop target named "${name}"`);
  }
  return found;
}

/** Carry one chip to one target, which is a wrong drop wherever they do not belong together. */
async function carry(host: HTMLElement, chip: string, target: string): Promise<void> {
  chipNamed(host, chip).click();
  targetNamed(host, target).click();
  await settle();
}

const SHAPE_CASES: readonly FillCase[] = [
  {
    // The screenshot: EXP.1's x^3 * x^4, "Round 1 of 3", answer x^7, learner's 3 left in.
    name: "a typed box",
    id: "exponent-laws-builder",
    answer: "7",
    attempt: (host) => {
      setInputValue(host.querySelector("input") as HTMLInputElement, "3");
      findButton(host, "Check").click();
    },
  },
  {
    // The other screenshot: the 3^3 / 3^2 / 3^1 / 3^0 division table, chosen from a tray.
    name: "a table drop slot",
    id: "zero-exponent-table",
    answer: "3",
    attempt: (host) => {
      // "zero" is a distractor on every row, so carrying it anywhere is a wrong drop.
      chipNamed(host, "zero").click();
      (host.querySelector(".lesson-table__slot") as HTMLElement).click();
    },
  },
  {
    name: "a figure label slot",
    id: "power-parts-label",
    answer: "",
    attempt: (host) => {
      // The names are dealt deranged, so the first one never belongs on the first slot.
      (host.querySelector(".lesson-sorter__chip") as HTMLElement).click();
      (host.querySelector(".lesson-label__slot") as HTMLElement).click();
    },
  },
  {
    name: "a dial on a scale",
    id: "negative-exponent-estimate",
    answer: "",
    attempt: (host) => {
      const dial = host.querySelector("input[type='range']") as HTMLInputElement;
      setInputValue(dial, dial.min);
      findButton(host, "Check this spot").click();
    },
  },
  {
    name: "which line is boxed",
    id: "unlike-base-spot",
    answer: "",
    attempt: (host) => {
      // The first line of the work is the premise, so it is never the one that fails.
      (host.querySelector(".lesson-spot__line-button") as HTMLElement).click();
    },
  },
  {
    // The last placed ordering widget moved to a table on RAD.3's derivation slide, so this
    // shape is now covered by the registered-but-unplaced one. Same kind, same rung, and it
    // is the widget the `OrderSteps` sweeps in the other files already run against.
    name: "the open rung of an order",
    id: "negative-exponent-order",
    answer: "",
    attempt: (host) => {
      // Dealt out of order, so the first chip on offer is never the first step.
      (host.querySelector(".lesson-sorter__chip") as HTMLElement).click();
    },
  },
  {
    name: "a join between two columns",
    id: "power-of-power-match",
    answer: "",
    attempt: (host) => {
      const [left, right] = all<HTMLElement>(host, ".lesson-match__side");
      // The right column is dealt in an order that is never the left one's, so the first
      // live item on each side is a pair that does not belong together.
      (left as HTMLElement).querySelector("button")?.click();
      (right as HTMLElement).querySelector("button")?.click();
    },
  },
  {
    name: "a choice between two operations",
    id: "negative-exponent-play",
    answer: "",
    attempt: (host) => {
      // The first cell asked for is right of centre, so dividing is the wrong call.
      findButton(host, "\u00f7").click();
    },
  },
];

/**
 * The widgets that name their own blank, one case per blank the reveal can be taken on.
 *
 * Each entry states the answer AS THE BOARD MUST SHOW IT, which is the whole point: these are
 * hand-derived expressions, one per step, and the failure they guard against is a plausible
 * wrong value rather than a missing one. Where a widget's board holds several blanks at once
 * the count is pinned too, because filling a blank the passage says nothing about hands over
 * an answer the learner was never told.
 *
 * The variants are the ones every widget opens on (`useWidgetVariants` starts at index 0), so
 * every number below is the first parameter set of the pool named in the widget's own header.
 */
const WIRED_CASES: readonly (FillCase & { blanks: number })[] = [
  {
    // RAD.3 s1: 3 * 3 * 3 = 27.
    name: "rational-exponent-play: the number every copy holds",
    id: "rational-exponent-play",
    answer: "3",
    blanks: 1,
    named: "The number that 3 copies of multiply to 27",
    attempt: (host) => answerWith(host, [[0, "2"]], "Check"),
  },
  {
    // EXP.1 s1: (x^2)^4, so the copies add to 8. The box only exists once the animation has
    // laid every copy out, which is what the Step presses are for.
    name: "power-of-power-walkthrough: the combined exponent",
    id: "power-of-power-walkthrough",
    answer: "8",
    blanks: 1,
    named: "Combined exponent",
    attempt: async (host) => {
      for (let step = 0; step < 5; step += 1) {
        findButton(host, "Step").click();
        await settle();
      }
      answerWith(host, [[0, "6"]], "Check");
    },
  },
  {
    // NUM.S s1: 4 + (-7) lands on -3, seven hops left of the start.
    name: "signed-addition-walkthrough: where the marker landed",
    id: "signed-addition-walkthrough",
    answer: "-3",
    blanks: 1,
    named: "The number the marker landed on",
    attempt: async (host) => {
      for (let hop = 0; hop < 8; hop += 1) {
        findButton(host, "Step").click();
        await settle();
      }
      answerWith(host, [[0, "11"]], "Check");
    },
  },
  {
    // RAD.4 s1: sqrt(m^6) needs the bars, and the box takes `|m^3|` rather than LaTeX. The
    // attempt is the misconception itself: the right power with the bars left off.
    name: "root-parity-builder: the simplified form, in the box's own syntax",
    id: "root-parity-builder",
    answer: "|m^3|",
    blanks: 1,
    attempt: (host) => answerWith(host, [[0, "m^3"]], "Simplify it"),
  },
  {
    // RAD.4 s4: sqrt(50t^7). The first slot is the whole number out front, 5.
    name: "mixed-radicand-solver: the slot in hand",
    id: "mixed-radicand-solver",
    answer: "5",
    blanks: 1,
    named: "Whole number that comes out of the square root of 50",
    attempt: (host) => answerWith(host, [[0, "2"]], "Set it"),
  },
  {
    // RAD.4 s0: (-8)^2 = 64. One box carries both stages, so each stage is its own case:
    // reading the wrong one off would fill the box with the OTHER stage's answer.
    name: "magnitude-root-play: the square",
    id: "magnitude-root-play",
    answer: "64",
    blanks: 1,
    named: "-8 squared",
    attempt: (host) => answerWith(host, [[0, "16"]], "Square it"),
  },
  {
    // And sqrt(64) = 8. The attempt is the misconception: the root is not -8.
    name: "magnitude-root-play: the root, in the same box",
    id: "magnitude-root-play",
    answer: "8",
    blanks: 1,
    named: "Square root of 64",
    attempt: async (host) => {
      answerWith(host, [[0, "64"]], "Square it");
      await settle();
      answerWith(host, [[0, "-8"]], "Take the root");
    },
  },
  {
    // RAD.4 s5: p^7 splits at p^6. The chips are p^2, p^4, p^6, p^8 and p^2 is the plausible
    // miss, an even power that fits with too much left behind.
    name: "variable-radicand-builder: which even power splits off",
    id: "variable-radicand-builder",
    answer: "p^{6}",
    blanks: 1,
    attempt: (host) => {
      (host.querySelector(".lesson-interactive__chip") as HTMLElement).click();
    },
  },
  {
    // Then half of 6 comes out in front. The attempt is the misconception the widget names:
    // typing the power that STAYS under the root.
    name: "variable-radicand-builder: the exponent that leaves the root",
    id: "variable-radicand-builder",
    answer: "3",
    blanks: 1,
    named: "Exponent that comes out of the root from p to the 6",
    attempt: async (host) => {
      mathButton(host, "p^{6}").click();
      await settle();
      answerWith(host, [[0, "6"]], "Pull it out");
    },
  },
  {
    // RAD.1 s4: sqrt(108). 16 divides nothing here, and the square the passage names is the
    // first one that does go in, 4.
    name: "radical-factor-builder: which square comes out",
    id: "radical-factor-builder",
    answer: "4",
    blanks: 1,
    attempt: (host) => findButton(host, "16").click(),
  },
  {
    // And the coefficient of the square the LEARNER took, not of the one the reveal would
    // have handed them: 9 goes into 108 as well, and sqrt(9) is 3 where sqrt(4) is 2. A fill
    // read off the wrong end of that puts a 2 in the box.
    name: "radical-factor-builder: the coefficient of the square the learner took",
    id: "radical-factor-builder",
    answer: "3",
    blanks: 1,
    named: "Whole-number square root of 9",
    attempt: async (host) => {
      findButton(host, "9").click();
      await settle();
      answerWith(host, [[0, "4"]], "Pull it out");
    },
  },
  {
    // EL.6 s0: 2^(x+1) = 32, so the exponent that writes 32 on base 2 is 5. Only the OPEN
    // stage holds an input, and the reveal here hands the board back, so the fill must land in
    // the rewrite and stage two must stay dashed and empty.
    name: "equation-same-base-stepper: the exponent, with stage two still owed",
    id: "equation-same-base-stepper",
    answer: "5",
    blanks: 1,
    named: "the exponent that writes 32 on the base 2",
    attempt: (host) => answerWith(host, [[0, "4"]], "Check"),
  },
  {
    // And then x. This is the case worth having: 2^(x+1) = 2^5 gives x + 1 = 5, so x is 4,
    // one less than the exponent the stage above settled on. A fill read off the wrong stage
    // would write 5 here, which is the plausible wrong value rather than a missing one, and it
    // is also exactly what the learner's attempt below gets wrong.
    name: "equation-same-base-stepper: the value of x, one step past the exponent",
    id: "equation-same-base-stepper",
    answer: "4",
    blanks: 1,
    named: "the value of x",
    attempt: async (host) => {
      answerWith(host, [[0, "5"]], "Check");
      await settle();
      answerWith(host, [[0, "5"]], "Check");
    },
  },
  {
    // EL.2 s1: 3 * 2^x + 4. The constant is added AFTER the power, so it carries the line
    // the curve presses toward up with it and the card belongs on y = 4. The reveal parks
    // the card the learner mis-dropped on its own line, so the value is the RULE and the
    // line it landed on is what the name pins: the same card sitting on y = 0 shows exactly
    // the same thing, and y = 0 is the misconception the slide exists for.
    name: "exp-shift-drag: the rule parked on the line it levels off toward",
    id: "exp-shift-drag",
    answer: "3 \\cdot 2^{x} + 4",
    blanks: 1,
    named:
      "The line y equals 4 was given the rule 3 times 2 to the x, plus 4, not answered",
    attempt: async (host) => {
      // The sideways-shifted rule's line is y = 0, which is never where a rule with a
      // constant on the end levels off, so this is a wrong drop.
      namedButton(host, "3 times 2 to the x, plus 4").click();
      namedButton(host, "Drop slot for the line y equals 0").click();
      await settle();
    },
  },
  {
    // EL.2 s2: y = 2 * 7^x mirrored over the x-axis. A mirror over that axis negates the
    // OUTPUT, which is the whole right-hand side, so the sign lands in front of the
    // coefficient and the exponent is left alone. The reveal explains the first blank still
    // open, which is the coefficient, and the attempt is the misconception itself: the right
    // magnitude with the sign dropped, which is also what a fill read off the wrong blank
    // would write here.
    name: "exp-transform-builder: the coefficient the mirror signed",
    id: "exp-transform-builder",
    answer: "-2",
    blanks: 1,
    named: "The coefficient in front of the power, with its sign",
    attempt: (host) => answerWith(host, [[0, "2"]], "Check"),
  },
  {
    // The same board's SECOND blank, which the reveal only ever names once the first one is
    // settled: it explains whichever blank is still outstanding, so a sweep starting from an
    // untouched board can reach the coefficient and nothing else. The attempt below settles
    // the coefficient on the way past, which is a real half-answered board rather than a
    // contrivance — mirroring the input as well as the output is the miss the widget already
    // has wording for — and the exponent is then what `outstanding` names. Nothing was
    // changed in the widget to make this reachable.
    name: "exp-transform-builder: the exponent, once the coefficient is settled",
    id: "exp-transform-builder",
    answer: "x",
    blanks: 1,
    named: "The exponent, with its sign",
    attempt: (host) =>
      answerWith(
        host,
        [
          [0, "-2"],
          [1, "-x"],
        ],
        "Check",
      ),
  },
  {
    // EL.5 s2: 2 log m + log n. The open slot is the factor the FIRST term contributes, and
    // the coefficient has to go back inside as an exponent before anything gathers, so it is
    // m^2. The attempt is one of the two misses the tray is built out of: the coefficient
    // left multiplying the variable.
    name: "log-condense-builder: the factor a coefficient becomes",
    id: "log-condense-builder",
    answer: "m^{2}",
    blanks: 1,
    attempt: (host) => {
      chipNamed(host, "2 m").click();
    },
  },
  {
    // RAD.3 s3: x^(6/5). The reveal takes the first box still open, so only the power is
    // handed over and the index stays the learner's to produce.
    name: "radical-form-builder: only the box the reveal names",
    id: "radical-form-builder",
    answer: "6",
    blanks: 1,
    named: "Power under the root",
    attempt: (host) => answerWith(host, [[0, "7"]], "Build the root"),
  },
  {
    // RAD.3 s4: the square root of x^5. The two chips differ only in which number is on top,
    // so tapping the swap is the misconception this slide exists for.
    name: "exponent-form-builder: which of the two forms it is",
    id: "exponent-form-builder",
    answer: "x^{\\frac{5}{2}}",
    blanks: 1,
    attempt: (host) => mathButton(host, "x^{\\frac{2}{5}}").click(),
  },
  {
    // Then both boxes, because this reveal explains the whole exponent: 5 on top, 2 below.
    name: "exponent-form-builder: both halves of the exponent",
    id: "exponent-form-builder",
    answer: "5|2",
    blanks: 2,
    attempt: async (host) => {
      mathButton(host, "x^{\\frac{5}{2}}").click();
      await settle();
      answerWith(host, [[0, "9"]], "Build the exponent");
    },
  },
  {
    // RAD.2 s1: sqrt(45) + sqrt(20). Four boxes are live at once and the reveal explains ONE,
    // the coefficient of sqrt(45), which is 3.
    name: "combine-radicals-builder: one of four live boxes",
    id: "combine-radicals-builder",
    answer: "3",
    blanks: 1,
    named: "Coefficient of the simplified root of 45",
    attempt: (host) => answerWith(host, [[0, "9"]], "Check"),
  },
  {
    // Both roots leave sqrt(5) behind, so they DO combine, and the board's next question is
    // the call rather than a value.
    name: "combine-radicals-builder: the combine call",
    id: "combine-radicals-builder",
    answer: "Add them into one term",
    blanks: 1,
    attempt: async (host) => {
      await simplifyBothRoots(host);
      findButton(host, "They do not combine").click();
    },
  },
  {
    // And 3 + 2 = 5 coefficients, with the radical unchanged.
    name: "combine-radicals-builder: the combined coefficient",
    id: "combine-radicals-builder",
    answer: "5",
    blanks: 1,
    named: "Coefficient of the combined root of 5",
    attempt: async (host) => {
      await simplifyBothRoots(host);
      findButton(host, "Add them into one term").click();
      await settle();
      answerWith(host, [[0, "9"]], "Combine");
    },
  },
  {
    // NUM.F s4: (3/4) / (2/7). Flipping the dividend is one of the two mistakes people make,
    // and the answer is that the DIVISOR turns over.
    name: "fraction-divide-play: which fraction turns over",
    id: "fraction-divide-play",
    answer: "\\dfrac{2}{7}",
    blanks: 1,
    named: "Flip 2 over 7, the divisor",
    attempt: (host) => {
      (host.querySelector(".lesson-interactive__chip") as HTMLElement).click();
    },
  },
  {
    // Then 3*7 over 4*2, which is 21/8 and already in lowest terms.
    name: "fraction-divide-play: both halves of the product",
    id: "fraction-divide-play",
    answer: "21|8",
    blanks: 2,
    attempt: async (host) => {
      namedButton(host, "Flip 2 over 7, the divisor").click();
      await settle();
      answerWith(
        host,
        [
          [0, "9"],
          [1, "9"],
        ],
        "Check",
      );
    },
  },
  {
    // RAD.2 s0: sqrt(7) belongs in the bin nothing else shares a radicand with. The value is
    // no evidence on its own here, so the case pins the BIN through its accessible name: the
    // same chip parked in the wrong bin shows exactly the same thing.
    name: "like-radicals-sorter: the chip parked in its bin",
    id: "like-radicals-sorter",
    answer: "\\sqrt{7}",
    blanks: 1,
    named: "neither: root 7 was given, not answered",
    attempt: (host) => carry(host, "root 7", "root 2 terms"),
  },
  {
    // Then the bins. sqrt(8) + 3sqrt(2) is 2sqrt(2) + 3sqrt(2), so 5 root 2, and the reveal
    // explains the first bin that missed.
    name: "like-radicals-sorter: the first bin that missed",
    id: "like-radicals-sorter",
    answer: "5\u221a2",
    blanks: 1,
    named: "root 2 terms combined",
    attempt: async (host) => {
      await sortEverySix(host);
      findButton(host, "Check").click();
    },
  },
  {
    // And the third bin, whose answer is a CALL. Marking the chip beside it would teach the
    // node's own misconception, that sqrt(7) + sqrt(5) comes to sqrt(12).
    name: "like-radicals-sorter: the call on the bin that does not combine",
    id: "like-radicals-sorter",
    answer: "does not combine",
    blanks: 1,
    attempt: async (host) => {
      await sortEverySix(host);
      answerWith(
        host,
        [
          [0, "5\u221a2"],
          [1, "7\u221a3"],
        ],
        "Check",
      );
    },
  },
  {
    // RAD.1 s3: sqrt(5/4). Its bottom is a perfect square, so it belongs in the bin where the
    // bottom comes out whole, and the bin's name is again the only evidence of that.
    name: "radical-quotient-sorter: the chip parked in its bin",
    id: "radical-quotient-sorter",
    answer: "\\sqrt{\\tfrac{5}{4}}",
    blanks: 1,
    named: "bottom comes out whole: the square root of 5 over 4 was given, not answered",
    attempt: (host) =>
      carry(host, "the square root of 5 over 4", "a root stays on the bottom"),
  },
  {
    // TRG.6 s0: the dish hangs 12 meters up and the beam is swung to 45 degrees, where the
    // tangent is 1, so it lands one mast-height out and the answer is the height itself. The
    // attempt is the misconception the board is drawn for, reading the run off the stepper's
    // readout in mast-heights instead of converting it through the height. Three parts share
    // one box, so the value is the evidence that the reveal filled the part still in hand:
    // the two after it answer in DEGREES, and a fill read off either would put 90 or 270 in a
    // box labelled Meters.
    name: "trg-tangent-explore: the reach in meters, not the reading in mast-heights",
    id: "trg-tangent-explore",
    answer: "12",
    blanks: 1,
    named: "The distance out from the foot of the mast, in meters",
    attempt: (host) => answerWith(host, [[0, "1"]], "Check"),
  },
  {
    // POL.3 s0: x^2 = 121, two boxes, either root in either of them. The attempt is the miss
    // the board exists for, a value whose square is not the area, and the reveal fills the box
    // the passage is about and leaves the other one the learner's.
    name: "square-side-solver: one of the two roots, in the box that asked for it",
    id: "square-side-solver",
    answer: "11",
    blanks: 1,
    named: "One solution of the equation",
    attempt: (host) => answerWith(host, [[0, "10"]], "Check"),
  },
  {
    // POL.8 s1: (3x^2 + 14x + 8) / (x + 4). The first step's multiplier is 3, read off the
    // leading terms, and the miss is any other number.
    name: "long-division-stepper: the multiplier at the step in hand",
    id: "long-division-stepper",
    answer: "3",
    blanks: 1,
    named: "How many x the divisor is multiplied by",
    attempt: (host) => answerWith(host, [[0, "9"]], "Check"),
  },
  {
    // The SECOND step, reached without settling the first, which is the case worth having.
    // Both rows are live at once on this board, so a learner can miss the second one with the
    // first still untouched, and the row the passage is about is then the second. A fill
    // derived from "is the first row done" rather than from the row whose explanation is on
    // offer writes 3 into the FIRST box here: the plausible wrong value, in the wrong blank,
    // under a passage explaining neither. The name is what pins the blank, and the value is
    // what pins the step: the second multiplier is 2.
    name: "long-division-stepper: the second step, with the first still untouched",
    id: "long-division-stepper",
    answer: "2",
    blanks: 1,
    named: "What the divisor is multiplied by next",
    attempt: (host) => {
      setInputValue(box(host, 1), "9");
      const checks = all<HTMLButtonElement>(host, ".lesson-interactive__check--part");
      const second = checks[1];
      if (second === undefined) {
        throw new Error("the second step has no Check of its own");
      }
      second.click();
    },
  },
  {
    // POL.2 s2: x^2 + 13x + 36. Its constant's pairs are 1*36, 2*18, 3*12, 4*9 and 6*6, and
    // only 4 + 9 reaches 13, so the answering position is the fourth: index 3. The blank on
    // this board IS a position, so that index is the value the control has to be showing, and
    // the attempt parks it at the far end, on a pair that multiplies right and adds wrong.
    name: "factor-pair-stepper: the position on the control that answers",
    id: "factor-pair-stepper",
    answer: "3",
    blanks: 1,
    attempt: (host) => {
      const dial = host.querySelector("input[type='range']") as HTMLInputElement;
      setInputValue(dial, "0");
      findButton(host, "Use this pair").click();
    },
  },
  {
    // POL.2 s3: a square of side x with a 6 by 6 corner cut out. Placement 1 is where the
    // strip lands, and the strip is 6 by (x - 6). The square that was REMOVED is the chip the
    // board refuses, so carrying it to the landing area is the miss the slide is drawn for.
    // The name pins the placement: three targets take a drop and the other two are edges.
    name: "difference-squares-drag: the piece carried round, in the place it lands",
    id: "difference-squares-drag",
    // The two sides, stacked: the landing target is too narrow for the tray chip's one-line
    // "6 by (x - 6)", which the figure clipped to "y (x -".
    answer: "6|x - 6",
    blanks: 1,
    named: "The strip lands here, and it was given rather than placed",
    attempt: async (host) => {
      chipNamed(host, "the square 6 by 6").click();
      namedButton(
        host,
        "Placement 1 of 3, where the strip lands: drop the two sides of the moving strip here, at the right-hand end of the lower rectangle",
      ).click();
      await settle();
    },
  },
  {
    // POL.1 s1: two orders of like terms, dealt into an x squared bin, an x bin and a plain
    // bin. The coefficients repeat ACROSS the bins on purpose, so 3x^2 has a 3x waiting for
    // it one bin over and a learner reading the number rather than the variable part lands
    // there. The bin's own name is the only evidence of where the reveal parked the term: the
    // same chip sitting in the wrong bin renders exactly the same thing.
    name: "stone-pieces-sorter: the term parked in the bin that counts it",
    id: "stone-pieces-sorter",
    answer: "3x^{2}",
    blanks: 1,
    named: "x squared terms: 3 x squared was given, not answered",
    attempt: (host) => carry(host, "3 x squared", "x terms"),
  },
  {
    // POL.1 s4: (3x + 2)(x + 5) written out in standard form. The slots open one at a time,
    // highest power first, so the reveal is always about the open one, and the attempt is the
    // misconception the tray is built out of: one of the two strips on its own, offered for a
    // slot that wants their sum. Its 15x is a plausible thing to see in a slot, which is why
    // the value is worth pinning as well as the name.
    name: "standard-form-builder: the term the open slot wants",
    id: "standard-form-builder",
    answer: "3x^{2}",
    blanks: 1,
    named: "3 x squared was given, not answered",
    attempt: (host) => {
      namedButton(host, "15 x").click();
    },
  },
  {
    // POL.4 s0: x^2 + 8x, whose open corner takes a block of 16. The tray offers 8 beside it,
    // which is the whole middle coefficient rather than the square of half of it, and that is
    // the miss the figure is drawn for. The figure holds TWO targets that take a label, so
    // the name is what says the fill went into the corner and not onto the side rule.
    name: "complete-square-drag: the block that fills the open corner",
    id: "complete-square-drag",
    answer: "16",
    blanks: 1,
    named: "The corner block was given, not answered",
    attempt: async (host) => {
      chipNamed(host, "a block of 8").click();
      namedButton(host, "Drop a block into the open corner").click();
      await settle();
    },
  },
  {
    // POL.4 s2: x^2 + 8x - 9 = 0. The bracket's constant is HALF the middle coefficient, and
    // the attempt is the misconception the row's own note names, the whole 8. Three rows share
    // one board and each has its own box, so a fill read off the wrong row lands in a blank
    // the passage is not about.
    name: "complete-square-solver: the constant inside the bracket",
    id: "complete-square-solver",
    answer: "4",
    blanks: 1,
    named: "The constant inside the bracket",
    attempt: (host) => answerWith(host, [[0, "8"]], "Check"),
  },
  {
    // The same board's LAST row, reached with the two above it settled, which is the case
    // worth having twice over. It is the only row holding TWO values, so a fill that wrote
    // one would satisfy a value assertion and still be wrong; and it is the row where the
    // reveal HANDS THE BOARD BACK rather than letting the learner past, which is the path the
    // widget's own `onReveal` never runs on. The fill has to come off the board's own state
    // over that window or it does not happen at all. Both plausible wrong values, 4 and 25,
    // are already sitting on the board in the rows above.
    name: "complete-square-solver: both solutions, on the row that hands the board back",
    id: "complete-square-solver",
    answer: "-9, 1",
    blanks: 1,
    named: "Both solutions, separated by a comma",
    attempt: async (host) => {
      answerWith(host, [[0, "4"]], "Check");
      await settle();
      answerWith(host, [[1, "25"]], "Check");
      await settle();
      answerWith(host, [[2, "1"]], "Check");
    },
  },
  {
    // POL.4 s4: x^2 + 2x + 5 = 0, whose discriminant is -16. The bin a learner who has not
    // worked it out reaches for is "two real solutions", on the assumption that the formula
    // always produces a pair. Which bin the reveal parked it in is the whole answer here, and
    // the parked equation renders identically in all three, so the bin's name is the evidence.
    name: "discriminant-sorter: the equation parked in the bin its discriminant sends it to",
    id: "discriminant-sorter",
    answer: "x^{2} + 2x + 5 = 0",
    blanks: 1,
    named: "no real solution: an equation was given, not answered",
    attempt: (host) => carry(host, "the equation x^{2} + 2x + 5 = 0", "two real solutions"),
  },
  {
    // POL.8 s0: x^2 + 9x + 22 over x + 3 leaves x + 6 remainder 4, and the statement is
    // rebuilt divisor first. The attempt is the chip the board refuses outright, the dividend
    // itself, which cannot stand on both sides of its own statement. Three positions are open
    // in turn and each takes a different quantity, so the name pins which one was filled.
    name: "divide-rebuild-builder: the quantity the open position wants",
    id: "divide-rebuild-builder",
    answer: "x + 3",
    blanks: 1,
    named: "the divisor was given, not answered",
    attempt: (host) => {
      namedButton(host, "the dividend itself").click();
    },
  },
  {
    // D3 LIN.1: 7x - 4 = 2x + 11, with both rows on screen from the start. This board is not
    // D4 and it is here because of what it caught: both of its boxes took the fill
    // unconditionally, so the passage explaining how the ingots GATHER also printed x = 3 in
    // the row underneath — the answer the learner was one step from working out, handed over
    // unasked. Neither value assertion can see that, because the value in each box is the
    // right one for that box. `blanks` is the whole case.
    name: "both-pans-builder: the gathered count, with the weighing still to finish",
    id: "both-pans-builder",
    answer: "5",
    blanks: 1,
    named: "Ingots left on one pan",
    attempt: (host) => answerWith(host, [[0, "4"]], "Check"),
  },
  {
    // The same board's second row, which is the other direction of the same claim: with the
    // first row settled the offer moves down, and the fill has to move with it rather than
    // marking the box the learner has already earned. 5 is sitting in that box to be marked.
    name: "both-pans-builder: the ingot weight, once the gathering is settled",
    id: "both-pans-builder",
    answer: "3",
    blanks: 1,
    named: "What one ingot weighs",
    attempt: async (host) => {
      answerWith(host, [[0, "5"]], "Check");
      await settle();
      answerWith(host, [[1, "4"]], "Check");
    },
  },
  {
    // GEO.2 s1, the terrace: 10 along the bottom, 8 up the left, with a 4 by 3 corner out of
    // the top right, read by adding the two rectangles the cut makes. Three blanks sit in one
    // equation and the reveal explains the first still owed, so this is the lower rectangle:
    // the full width by what is left below the notch, 10 by 5. The attempt is the misconception
    // the cut exists for, reading the lower piece off the FULL height and getting 80 — which is
    // also the number a fill taken off the wrong side of the notch would write in.
    name: "geo-compose-builder: the lower rectangle the cut makes",
    id: "geo-compose-builder",
    answer: "50",
    blanks: 1,
    named: "the area of the lower rectangle, in square meters",
    attempt: (host) => answerWith(host, [[0, "80"]], "Check"),
  },
  {
    // The same board's SECOND blank, which the reveal only names once the first is settled.
    // The upper rectangle is what is left of the width beside the notch, 6 by 3, and the
    // attempt is the piece the drawing dimensions most loudly: the notch itself, 4 by 3 = 12.
    // A fill read off the notch rather than off the piece would write that 12 here.
    name: "geo-compose-builder: the upper rectangle, once the lower one is settled",
    id: "geo-compose-builder",
    answer: "18",
    blanks: 1,
    named: "the area of the upper rectangle, in square meters",
    attempt: (host) =>
      answerWith(
        host,
        [
          [0, "50"],
          [1, "12"],
        ],
        "Check",
      ),
  },
  {
    // And the total, which is the ROUTE rather than a third rectangle: 50 + 18 = 68. The
    // attempt is the miss the widget has its own wording for, stopping at the larger piece,
    // and it is what a fill read off the first blank instead of the last would write.
    name: "geo-compose-builder: the total the route comes to",
    id: "geo-compose-builder",
    answer: "68",
    blanks: 1,
    named: "the area of the whole plan, in square meters",
    attempt: (host) =>
      answerWith(
        host,
        [
          [0, "50"],
          [1, "18"],
          [2, "50"],
        ],
        "Check",
      ),
  },
  {
    // D3 LIN.3 s3, the trial board: S = 4w - r on a floor with S = 40 and r = 8. The sound
    // candidate is w = (S + r) / 4, so it returns (40 + 8) / 4 = 12, which is the floor's own
    // width. Two predictions sit on this board and the other one returns 48, so the count is
    // the case: every input took the fill unconditionally, which printed the unsound
    // candidate's 48 into a box the passage says nothing about and marked a prediction the
    // learner had already earned as handed to them.
    name: "formula-check-play: the sound candidate's return, with the other prediction untouched",
    id: "formula-check-play",
    answer: "12",
    blanks: 1,
    named: "What w equals S plus r over 4 returns for this floor, not yet correct",
    attempt: (host) => answerWith(host, [[0, "48"]], "Check"),
  },
  {
    // D3 LIN.3 s2, the mould rule: A = h(a + b) / 2 re-pointed at a. Clearing the 2 gives
    // 2A = h(a + b), dividing by h gives 2A / h = a + b, and taking b off collects the whole of
    // 2A - hb over the single h. ONE reveal explains one whole fraction, so BOTH slots are
    // filled and `blanks` is 2: a numerator handed over above a denominator the learner is
    // still owed is not the answer the passage states. The attempt is the pair of misses the
    // tray is built out of, the numerator that multiplied only one term and a denominator that
    // carried the cleared 2 into it.
    name: "formula-isolate-builder: both halves of the fraction the passage states",
    id: "formula-isolate-builder",
    answer: "2A - hb|h",
    blanks: 2,
    named: "Numerator for a was given, not answered",
    attempt: async (host) => {
      mathButton(host, "2A - b").click();
      await settle();
      mathButton(host, "2h").click();
      await settle();
      findButton(host, "Check").click();
    },
  },
  {
    // D3 LIN.4 s4, the duty rule: 6x + 5 <= 41 gives 6x <= 36, so the endpoint is 6 and the
    // attempt is the miss the row's own note names, reading it off before the division. Only
    // the ENDPOINT is a blank: the direction and the bracket are aria-pressed chips, which the
    // fill has nothing to write into, so `blanks` is 1 rather than the three parts of a range.
    // The board's other rule ends at -5 and its box used to take the fill as well.
    name: "interval-write-builder: the endpoint of the rule in hand, not of the other row",
    id: "interval-write-builder",
    answer: "6",
    blanks: 1,
    named: "Endpoint for 6 x plus 5 is at most 41, not yet correct",
    attempt: (host) => {
      const duty = host.querySelector('[data-part-row="duty"]') as HTMLElement;
      findButton(duty, "Runs downward").click();
      findButton(duty, "Endpoint in").click();
      setInputValue(box(duty, 0), "36");
      findButton(duty, "Check").click();
    },
  },
  {
    // D3 LIN.5 s1: |w - 34| = 5 unpacks into w - 34 = 5 and w - 34 = -5. The SECOND branch is
    // the one this case takes, reached with the first already settled, because it is the branch
    // learners lose and because the fill has to move with the offer: a fill anchored to the
    // first row would mark a slot the learner earned. The attempt is the miss the slide exists
    // for, the chip that flips the sign INSIDE the bars.
    name: "abs-branch-builder: the negative branch, once the positive one is settled",
    id: "abs-branch-builder",
    answer: "w - 34 = -5",
    blanks: 1,
    named: "the branch where the inside is negative was given, not answered",
    attempt: async (host) => {
      mathButton(host, "w - 34 = 5").click();
      await settle();
      findButton(host, "Check").click();
      await settle();
      mathButton(host, "w + 34 = -5").click();
      await settle();
      findButton(host, "Check").click();
    },
  },
  {
    // D3 LIN.6 s2: |w - 45| > 6, whose negated branch is w - 45 < -6 and so w < 39. The lower
    // ray therefore runs downward from 39 with a round bracket, and the attempt is the
    // misconception the tray is built out of: the same endpoint with the ray pointing INWARDS,
    // which renders (39, \infty) and is a plausible thing to see in that slot.
    name: "abs-union-builder: the lower ray, pointing away from the standard",
    id: "abs-union-builder",
    answer: "(-\\infty, 39)",
    blanks: 1,
    named: "the ray of weights well under the standard was given, not answered",
    attempt: async (host) => {
      mathButton(host, "(39, \\infty)").click();
      await settle();
      findButton(host, "Check").click();
    },
  },
  {
    // GEO.2 s2, the rectangular tank: 10 by 4 on the floor, 3 deep. The base is the cross
    // section and nothing else, so 40. The attempt is precisely the misconception named in the
    // widget's own header — "length times width times height" carried as one string of three
    // numbers — which produces the VOLUME, 120, in the box asking for the base.
    name: "geo-cistern-play: the base area, with the depth taking no part in it",
    id: "geo-cistern-play",
    answer: "40",
    blanks: 1,
    named: "the area of the floor, in square meters",
    attempt: (host) => answerWith(host, [[0, "120"]], "Check"),
  },
  {
    // Then the volume, on the stage the base opens. Only the open stage holds a box, so the
    // index is the volume's once the base is settled. 40 stacked to 3 is 120, and the attempt
    // adds the depth on instead of stacking it, which is the same 43 the status line answers.
    name: "geo-cistern-play: the volume, once the base is settled",
    id: "geo-cistern-play",
    answer: "120",
    blanks: 1,
    named: "the volume of the cistern, in cubic meters",
    attempt: async (host) => {
      answerWith(host, [[0, "40"]], "Check");
      await settle();
      answerWith(host, [[0, "43"]], "Check");
    },
  },
  // D1, the Frontier Town. Five of its boards took the fill hook on 2026-08-04, and all five
  // are driven here rather than declared below: they are this lane's own new work, and the
  // register is for gaps another pack left. Where a board's reveal can be taken at more than
  // one point it gets a case per point, because each point writes into a different blank and
  // reading the wrong stage off would fill the open one with the other stage's answer.
  {
    // NUM.5 s2: 25% of 60. The attempt is the misconception the widget's own wording answers,
    // a quarter read off the wrong whole, and the slider is left at 0 so the round is unset.
    name: "percent-slider: the amount at the target share",
    id: "percent-slider",
    answer: "15",
    blanks: 1,
    named: "25 percent of 60",
    attempt: (host) => answerWith(host, [[0, "20"]], "Check"),
  },
  {
    // NUM.5 s1: 3/4 = x/12, so the first diagonal is 3 times 12. The attempt is the plausible
    // miss of multiplying along the wrong pair. Only that diagonal is filled: the other is
    // still the learner's, which is what `othersRemain` promised them.
    name: "proportion-cross-play: the diagonal in hand, and not the other one",
    id: "proportion-cross-play",
    answer: "36",
    blanks: 1,
    named: "3 times 12",
    attempt: (host) => answerWith(host, [[0, "30"]], "Check"),
  },
  {
    // NUM.F s2: 1/3 + 1/4, so the least common denominator is 12. It is marked in BOTH
    // ladders, which is the claim the passage makes about it — a common multiple is common —
    // so the count is two here rather than one. The attempt taps the first multiple of 3,
    // which is the "first chip I see" miss.
    name: "common-denominator-multiples: the shared multiple, in both ladders",
    id: "common-denominator-multiples",
    answer: "12",
    blanks: 2,
    named: "12",
    attempt: (host) => namedButton(host, "3").click(),
  },
  {
    // Then the rewrite, which is a different blank on a later stage: 1/3 over 12 is 4/12. The
    // attempt is the copy-the-numerator-across miss the board's own wording names, and the
    // second numerator stays blank because the passage says nothing about it yet.
    name: "common-denominator-multiples: the first numerator rewritten, and only that one",
    id: "common-denominator-multiples",
    answer: "4",
    blanks: 1,
    named: "numerator of 1/3 rewritten over 12",
    attempt: async (host) => {
      namedButton(host, "12").click();
      await settle();
      answerWith(host, [[0, "1"]], "Check");
    },
  },
  {
    // NUM.3 s1, the positive round: 2(n + 5), so the variable cell is 2n. The attempt is a
    // number where a term belongs, which is the shape of the error the cell exists to catch.
    name: "distribute-builder: the variable cell",
    id: "distribute-builder",
    answer: "2n",
    blanks: 1,
    named: "2 times n",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // And the constant cell, once the variable one is settled: 2 times 5 is 10. Each cell
    // settles on its own, so this is a genuinely different blank rather than the same one
    // re-asked, and the attempt is the miss of adding the factor on instead of multiplying.
    name: "distribute-builder: the constant cell, once the variable one is settled",
    id: "distribute-builder",
    answer: "10",
    blanks: 1,
    named: "2 times 5",
    attempt: async (host) => {
      answerWith(
        host,
        [
          [0, "2n"],
          [1, "7"],
        ],
        "Check",
      );
    },
  },
  {
    // NUM.4, the sorting stage: 3x is a variable term. Two marks, because on a sort board the
    // answer is a PAIRING — the chip and the bin it belongs in — and a chip marked with no bin
    // marked says nothing about where it was meant to go. The attempt drops it in constants,
    // which is the coefficient-reading miss the widget's own feedback names.
    name: "like-terms-sorter: the open chip and the bin it belongs in",
    id: "like-terms-sorter",
    answer: "3x",
    blanks: 2,
    named: "x terms",
    attempt: (host) => pickThenDrop(host, "3x", "constants"),
  },
  {
    // And the combining stage, which is a typed box rather than a pairing: 3x + 5x is 8x. Only
    // the first open bin is filled; the squared and constant bins stay blank, so the fill is
    // pinned to the bin the passage names and not to the board. The attempt multiplies the
    // coefficients instead of adding them.
    name: "like-terms-sorter: the first open bin's combined term",
    id: "like-terms-sorter",
    answer: "8x",
    blanks: 1,
    named: "x terms combined",
    attempt: async (host) => {
      await sortEveryTerm(host);
      answerWith(host, [[0, "15x"]], "Check");
    },
  },
  {
    // FUN.2 s1: the first machine bottoms out at 3. A wrong numeric reading opens the reveal
    // for the limit without settling the separate direction call above it.
    name: "domain-range-slider: the reading the machine never gets past",
    id: "domain-range-slider",
    answer: "3",
    blanks: 1,
    named: "The reading the machine never gets past",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // FUN.2 s3: sqrt(x - 5) begins at 5. The other two parts of the interval are buttons;
    // this fill owns only the boundary box, so it must not mark the whole row as supplied.
    name: "domain-interval-build: the boundary input of the open rule",
    id: "domain-interval-build",
    answer: "5",
    blanks: 1,
    named: "Boundary input for f of x equals the square root of x minus 5",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // FUN.3 s1: x = 3 belongs to the middle piece, which returns -2. Choose that piece first,
    // then miss the arithmetic so the reveal has exactly the value box left to fill.
    name: "piecewise-evaluate-solver: the chosen piece's value at this input",
    id: "piecewise-evaluate-solver",
    answer: "-2",
    blanks: 1,
    named: "the value of f at 3",
    attempt: async (host) => {
      namedButton(
        host,
        "x equals 3 satisfies x is at least negative 2 and less than 4",
      ).click();
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.4 s1: the first report's middle line confuses hour 6 with reading 6. Flag a line
    // that really does follow, leaving the reveal to mark the one line that does not.
    name: "feature-extremum-spot: the report line that does not follow from the trace",
    id: "feature-extremum-spot",
    answer: "6",
    blanks: 1,
    named: "the highest reading of the shift is 6, the line being replaced",
    attempt: (host) =>
      namedButton(host, "Flag the line: the trace climbs from hour 0 to hour 6").click(),
  },
  {
    // FUN.4 s2: after the trace reaches its last mark, the first board's absolute maximum is
    // 9. The minimum below it is a separate call and must remain blank.
    name: "feature-trace-walkthrough: the absolute maximum, without filling the minimum",
    id: "feature-trace-walkthrough",
    answer: "9",
    blanks: 1,
    named: "the absolute maximum of the whole shift",
    attempt: async (host) => {
      for (let step = 0; step < 5; step += 1) {
        findButton(host, "Step").click();
        await settle();
      }
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.4 s3: the first open row asks for the increasing stretch, (0, 4). Four boxes are
    // visible, so the row identity matters as much as the interval itself.
    name: "feature-table: the feature row that is still open",
    id: "feature-table",
    answer: "(0, 4)",
    blanks: 1,
    named: "the stretch of hours the reading is increasing on, in interval notation",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // FUN.5 s0: readings 9 and 21 differ by 12 across 4 hours. This passage supplies both
    // parts of the fraction together, and not the still-locked quotient beneath it.
    name: "rate-average-explore: the change and span across the selected window",
    id: "rate-average-explore",
    answer: "12|4",
    blanks: 2,
    attempt: (host) =>
      answerWith(
        host,
        [
          [0, "99"],
          [1, "99"],
        ],
        "Check",
      ),
  },
  {
    // The same board's second stage: once 12 over 4 is earned, only the rate of 3 is open.
    name: "rate-average-explore: the quotient after both differences are settled",
    id: "rate-average-explore",
    answer: "3",
    blanks: 1,
    named: "the average rate of change, in units per hour",
    attempt: async (host) => {
      answerWith(
        host,
        [
          [0, "12"],
          [1, "4"],
        ],
        "Check",
      );
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.5 s1: f(5) - f(1) is 24. The walkthrough has to reach its final plotted leg before
    // the box opens, so the case drives the same route a learner takes through the animation.
    name: "rate-walkthrough: the output change after the trace lands",
    id: "rate-walkthrough",
    answer: "24",
    blanks: 1,
    named: "the change in the output between the two ends",
    attempt: async (host) => {
      for (let step = 0; step < 3; step += 1) {
        findButton(host, "Step").click();
        await settle();
      }
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // The same box carries the next stage too: 24 shared across 4 input units gives 6.
    name: "rate-walkthrough: the rate after the output change is settled",
    id: "rate-walkthrough",
    answer: "6",
    blanks: 1,
    named: "the average rate of change",
    attempt: async (host) => {
      for (let step = 0; step < 3; step += 1) {
        findButton(host, "Step").click();
        await settle();
      }
      answerWith(host, [[0, "24"]], "Check");
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.5 s3: the first window runs from (0, 4) to (3, 25), so its average rate is 7.
    name: "rate-interval-slider: the rate over the selected window",
    id: "rate-interval-slider",
    answer: "7",
    blanks: 1,
    named: "the average rate of change from hour 0 to hour 3",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // FUN.6 s0: f(x)=x^2 starts at 3 with a step of 2, so the later output f(5) is 25.
    name: "quotient-build: the later output",
    id: "quotient-build",
    answer: "25",
    blanks: 1,
    named: "the output at input 5",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // Once f(5) is settled, the same board asks for its starting output f(3)=9.
    name: "quotient-build: the starting output",
    id: "quotient-build",
    answer: "9",
    blanks: 1,
    named: "the output at input 3",
    attempt: async (host) => {
      answerWith(host, [[0, "25"]], "Check");
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // With both outputs earned, (25-9)/2 leaves the quotient 8 as the only open value.
    name: "quotient-build: the difference quotient after both outputs",
    id: "quotient-build",
    answer: "8",
    blanks: 1,
    named: "the value of the difference quotient",
    attempt: async (host) => {
      answerWith(host, [[0, "25"]], "Check");
      await settle();
      answerWith(host, [[0, "9"]], "Check");
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.6 s1: 3(x+h)^2 has two 3xh pieces, so only the middle coefficient is 6. The two
    // outer coefficients are supplied correctly to isolate the misconception this reveal teaches.
    name: "quotient-expand-walkthrough: the doubled middle coefficient",
    id: "quotient-expand-walkthrough",
    answer: "6",
    blanks: 1,
    named: "the coefficient of x h",
    attempt: async (host) => {
      for (let frame = 0; frame < 4; frame += 1) {
        findButton(host, "Step").click();
        await settle();
      }
      answerWith(
        host,
        [
          [0, "3"],
          [1, "99"],
          [2, "3"],
        ],
        "Check",
      );
    },
  },
  {
    // FUN.7 s1: g(7)=7-3=4 is the handoff into f. The outer value remains behind the next stage.
    name: "compose-evaluate-solver: the inner machine's output",
    id: "compose-evaluate-solver",
    answer: "4",
    blanks: 1,
    named: "the value of g at 7",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check the inner value"),
  },
  {
    // After earning g(7)=4, f(4)=13 is the pair's output and the only visible blank.
    name: "compose-evaluate-solver: the outer machine's output",
    id: "compose-evaluate-solver",
    answer: "13",
    blanks: 1,
    named: "the value of f at 4",
    attempt: async (host) => {
      answerWith(host, [[0, "4"]], "Check the inner value");
      await settle();
      answerWith(host, [[0, "99"]], "Check the pair's value");
    },
  },
  {
    // FUN.7 s3: the first wrong chip drops the inner function's constant. Revealing marks
    // the complete substitution chip, not either of the two partial alternatives.
    name: "compose-build: the complete substitution chip",
    id: "compose-build",
    answer: "3(5x - 1) + 2",
    blanks: 1,
    named: "substitute to give 3 times the bracket 5 x minus 1, plus 2",
    attempt: (host) => namedButton(host, "substitute to give 3 times 5 x, plus 2").click(),
  },
  {
    // Once the substitution is chosen, expanding gives 15x-1. This reveal states both
    // coefficients, so both visible boxes—and no other control—are marked as supplied.
    name: "compose-build: the coefficient and constant of the composed rule",
    id: "compose-build",
    answer: "15|-1",
    blanks: 2,
    attempt: async (host) => {
      namedButton(
        host,
        "substitute to give 3 times the bracket 5 x minus 1, plus 2",
      ).click();
      await settle();
      answerWith(
        host,
        [
          [0, "99"],
          [1, "99"],
        ],
        "Build the formula",
      );
    },
  },
  {
    // FUN.8 s0: the machine ended at 22 after adding 4, so the value handed to that last
    // arrow was 18. The original setting remains the next stage.
    name: "inverse-reverse-play: the value handed to the last arrow",
    id: "inverse-reverse-play",
    answer: "18",
    blanks: 1,
    named: "the value the last arrow was handed",
    attempt: (host) => answerWith(host, [[0, "99"]], "Check"),
  },
  {
    // After earning 18, undoing multiplication by 3 recovers the original setting, 6.
    name: "inverse-reverse-play: the original machine setting",
    id: "inverse-reverse-play",
    answer: "6",
    blanks: 1,
    named: "the setting that went into the machine",
    attempt: async (host) => {
      answerWith(host, [[0, "18"]], "Check");
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.8 s1 begins by swapping x and y, so the numerator's first symbol becomes y.
    name: "inverse-build: the variable after swapping input and output",
    id: "inverse-build",
    answer: "y",
    blanks: 1,
    named: "the variable that takes the place of x in the numerator",
    attempt: (host) => answerWith(host, [[0, "z"]], "Check"),
  },
  {
    // With the swap earned, the denominator 2 is the multiplier that clears the bar.
    name: "inverse-build: the multiplier that clears the fraction bar",
    id: "inverse-build",
    answer: "2",
    blanks: 1,
    named: "the number both sides are multiplied by",
    attempt: async (host) => {
      answerWith(host, [[0, "y"]], "Check");
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // The final isolation step turns +6 over to -6 in the inverse rule.
    name: "inverse-build: the inverse rule's signed constant",
    id: "inverse-build",
    answer: "-6",
    blanks: 1,
    named: "the constant term of the inverse, with its sign",
    attempt: async (host) => {
      answerWith(host, [[0, "y"]], "Check");
      await settle();
      answerWith(host, [[0, "2"]], "Check");
      await settle();
      answerWith(host, [[0, "99"]], "Check");
    },
  },
  {
    // FUN.8 s3: reflecting (-4, 2) across y=x exchanges its coordinates to (2, -4).
    name: "inverse-reflect-explore: both coordinates of the first reflected point",
    id: "inverse-reflect-explore",
    answer: "2|-4",
    blanks: 2,
    attempt: (host) =>
      answerWith(
        host,
        [
          [0, "99"],
          [1, "99"],
        ],
        "Check",
      ),
  },
  {
    // After the first point is earned, the second row exchanges (1, 5) to (5, 1).
    name: "inverse-reflect-explore: both coordinates of the second reflected point",
    id: "inverse-reflect-explore",
    answer: "5|1",
    blanks: 2,
    attempt: async (host) => {
      answerWith(
        host,
        [
          [0, "2"],
          [1, "-4"],
        ],
        "Check",
      );
      await settle();
      answerWith(
        host,
        [
          [0, "99"],
          [1, "99"],
        ],
        "Check",
      );
    },
  },
];

/**
 * Tap a chip, then tap a bin, with a commit in between.
 *
 * `carry` above cannot be used on NUM.4's sorter: it clicks both in one turn, and this board
 * holds the tapped chip in state rather than in a ref, so the bin's handler would read the
 * selection from the render before the tap and drop nothing at all.
 */
async function pickThenDrop(host: HTMLElement, chip: string, bin: string): Promise<void> {
  chipNamed(host, chip).click();
  await settle();
  targetNamed(host, bin).click();
  await settle();
}

/** Every term on NUM.4's board in its own bin, which opens the combining stage. */
async function sortEveryTerm(host: HTMLElement): Promise<void> {
  const home: readonly (readonly [string, string])[] = [
    ["3x", "x terms"],
    ["negative 2", "constants"],
    ["x squared", "x squared terms"],
    ["4", "constants"],
    ["5x", "x terms"],
  ];
  for (const [chip, bin] of home) {
    await pickThenDrop(host, chip, bin);
  }
  await waitFor(
    () => all(host, "input:not([type='range'])").length > 0,
    "the combining stage opens once every term is sorted",
  );
}

/** RAD.2's four simplify boxes, answered correctly, which opens the combine call. */
async function simplifyBothRoots(host: HTMLElement): Promise<void> {
  answerWith(
    host,
    [
      [0, "3"],
      [1, "5"],
    ],
    "Check",
  );
  await settle();
  answerWith(
    host,
    [
      [2, "2"],
      [3, "5"],
    ],
    "Check",
  );
  await settle();
}

/** Every chip on RAD.2's sorter dropped in its own bin, which opens the combine stage. */
async function sortEverySix(host: HTMLElement): Promise<void> {
  const bins: readonly (readonly [string, string])[] = [
    ["root 8", "root 2 terms"],
    ["3 root 2", "root 2 terms"],
    ["root 27", "root 3 terms"],
    ["4 root 3", "root 3 terms"],
    ["root 7", "neither"],
    ["root 5", "neither"],
  ];
  for (const [chip, bin] of bins) {
    await carry(host, chip, bin);
  }
  await waitFor(
    () => all(host, "input:not([type='range'])").length > 0,
    "the combine stage opens once every chip is sorted",
  );
}

/** THE FILL. The passage states the answer; the blank now shows it too. */
async function fills(testCase: FillCase): Promise<void> {
  let completed = 0;
  h = mount(
    <LessonVisual
      id={testCase.id}
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, "mounts");

  // Nothing is given before anything is revealed, or the mark means nothing.
  expect(givens(host), "a blank was marked as given before any reveal").toHaveLength(0);

  await testCase.attempt(host);
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered after a wrong attempt",
  );
  findButton(host, /Reveal/).click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    "the reveal passage opens",
  );

  const filled = givens(host);
  expect(filled.length, "the reveal filled no blank in").toBeGreaterThan(0);
  for (const blank of filled) {
    expect(shown(blank), "a blank was marked as given but left empty").not.toBe("");
  }
  if (testCase.answer !== "") {
    expect(
      filled.map(shown).join("|"),
      "the blank holds something other than the answer the passage states",
    ).toContain(testCase.answer);
  }
  if (testCase.blanks !== undefined) {
    expect(
      filled.length,
      "the reveal filled a different number of blanks than the passage explains",
    ).toBe(testCase.blanks);
  }
  if (testCase.named !== undefined) {
    expect(
      filled.map(nameAround).join("|"),
      "the answer was written into a blank other than the one named",
    ).toContain(testCase.named);
  }

  // And the blank shows the ANSWER and nothing else. The amber dashing is what says the
  // value was handed over; a word saying it as well restated the styling on a value the
  // learner may be about to be asked for again, so no blank prints one. The floor is the
  // `filled.length` assertion above: this cannot pass by matching nothing.
  for (const blank of filled) {
    expect(wordBeside(blank), "a filled blank prints a label beside the answer").toBe("");
  }

  // Display only. The stage is frozen behind the passage, so nothing here is submittable,
  // and the gate is still shut.
  expect(stage(host).hasAttribute("inert"), "the filled instance is live").toBe(true);
  expect(completed, "filling the blank in opened the gate").toBe(0);
}

/** THE CLEAR, which has to have happened by the time the freeze lifts. */
async function clears(testCase: FillCase): Promise<void> {
  let completed = 0;
  h = mount(
    <LessonVisual
      id={testCase.id}
      onComplete={() => {
        completed += 1;
      }}
    />,
  );
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, "mounts");

  await testCase.attempt(host);
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered",
  );
  findButton(host, /Reveal/).click();
  await waitFor(() => givens(host).length > 0, "the blank is filled in");

  findButton(host, "Try again with different numbers").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") === null,
    "the teaching goes with the instance it explained",
  );

  // `inert` comes off in the same commit, so anything still in a blank at this point is
  // submittable.
  expect(stage(host).hasAttribute("inert"), "the fresh instance is still frozen").toBe(
    false,
  );
  expect(
    givens(host),
    "a blank is still marked as given on the fresh instance",
  ).toHaveLength(0);
  for (const entry of all<HTMLInputElement>(widget(host), "input:not([type='range'])")) {
    expect(entry.value, "the fresh instance opened with an answer already in it").toBe("");
    expect(entry.readOnly, "the fresh instance opened read-only").toBe(false);
  }
  // The drop slots the fill wrote into are empty boxes again, and so are the sorter bins.
  // Checked on the CONTENT and not just on the mark, because a fill left in place with the
  // mark dropped would still be an answer sitting in the new instance's blank.
  for (const slot of all<HTMLElement>(
    widget(host),
    ".lesson-table__slot, .lesson-label__slot",
  )) {
    expect(shown(slot), "a drop slot opened with an answer already in it").toBe("");
  }
  for (const bin of all<HTMLElement>(widget(host), ".lesson-sorter__bin-items")) {
    expect(shown(bin), "a bin opened with a chip already parked in it").toBe("");
  }
  expect(completed, "the re-ask opened the gate").toBe(0);
}

test.each(SHAPE_CASES.map((c) => [c.name, c] as const))(
  "%s: the reveal fills it in, marked as given rather than earned",
  async (_name, testCase) => {
    await fills(testCase);
  },
);

test.each(SHAPE_CASES.map((c) => [c.name, c] as const))(
  "%s: taking the re-ask empties it again, before the freeze lifts",
  async (_name, testCase) => {
    await clears(testCase);
  },
);

test.each(WIRED_CASES.map((c) => [c.name, c] as const))(
  "%s: the reveal writes that value, and only there",
  async (_name, testCase) => {
    await fills(testCase);
  },
);

test.each(WIRED_CASES.map((c) => [c.name, c] as const))(
  "%s: taking the re-ask empties it again, before the freeze lifts",
  async (_name, testCase) => {
    await clears(testCase);
  },
);

/**
 * Which shared kinds have a blank for a reveal to fill: the ones that take the shared hook.
 *
 * `BinaryRowSort` renders `WidgetReveal` and is deliberately NOT here. Its reveal is only
 * offered on a row already locked by a wrong tap, so the marks are on the board before the
 * passage appears and there is nothing left blank to write into. That is the difference this
 * derivation has to respect, and it is why the population is "calls `useRevealFill`" rather
 * than the wider "offers a reveal".
 */
const FILLING_KINDS = kindsMatching(/\buseRevealFill\b/);

/** Every widget holding its own copy of the fill rather than inheriting one from a kind. */
const OWN_COPY = widgetsOwningCopy(/\buseRevealFill\b/);

const SWEPT: ReadonlySet<LessonVisualId> = new Set(
  [...SHAPE_CASES, ...WIRED_CASES].map((c) => c.id),
);

/**
 * Bespoke fills this file does not drive, declared rather than hidden.
 *
 * Empty after the D6 pass: every widget that owns this mechanic now has a case pinning its
 * value and target. A future widget must add a case or explicitly enter this visible debt
 * register; the two assertions below prevent stale entries in either direction.
 */
const FILL_UNDRIVEN: ReadonlySet<string> = new Set();

test("every input shape a reveal FILLS is covered here", () => {
  // The sweep is only worth what its list is worth, and the list is a human taxonomy of blank
  // shapes: a typed box, a drop slot, a dial, a join, which line is boxed. That cannot be read
  // off the sources, so what CAN be is asserted instead — every kind with a fillable blank has
  // a representative here. It was `toBe(8)`, a count of this list against itself, which a
  // seventh kind adopting the hook would have left green and uncovered.
  expect(new Set(SHAPE_CASES.map((c) => c.name)).size).toBe(SHAPE_CASES.length);
  expect(
    FILLING_KINDS.length,
    "no kind was found taking the fill hook, so the coverage claim below is vacuous",
  ).toBeGreaterThanOrEqual(6);

  for (const kind of FILLING_KINDS) {
    const instances = visualsBuiltOn(kind);
    expect(
      instances.length,
      `${kind}: takes the fill hook but no registered widget was found for it`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      instances.filter((id) => SWEPT.has(id)),
      `${kind}: has a blank a reveal fills and no instance of it is driven here`,
    ).not.toHaveLength(0);
  }
});

/** Whether any case above drives the widget at `path`, by one of the ids it is registered as. */
function drivenHere(path: string): boolean {
  const found = OWN_COPY.find((widget) => widget.path === path);
  return found?.ids.some((id) => SWEPT.has(id)) === true;
}

test("the fill population is wide enough for the sweeps below to mean anything", () => {
  // A widget built on a kind is covered by the kind's own representative above. One that
  // reimplements the mechanic is covered by nothing, which is why this population is per
  // widget rather than per archetype, and why a sweep over an empty one would prove nothing.
  expect(
    OWN_COPY.length,
    "no widget was found owning a copy of the fill, so the sweeps below are vacuous",
  ).toBeGreaterThanOrEqual(25);
  // And the register has not swallowed the population. This ratchet is the number of bespoke
  // widgets driven after the sixteen-widget D6 gap closed; deleting a case cannot be paid for
  // by quietly adding its source back to the debt register.
  expect(
    OWN_COPY.filter((widget) => !FILL_UNDRIVEN.has(widget.path)).length,
    "the undriven register has grown until almost nothing is driven",
  ).toBeGreaterThanOrEqual(60);
});

test.each(OWN_COPY.map((widget) => widget.path))(
  "%s owns a copy of the fill, so a case here drives it or the register names it",
  (path) => {
    const found = OWN_COPY.find((widget) => widget.path === path);
    expect(
      found?.ids.length ?? 0,
      `${path}: takes the fill hook but the registry renders no id for it`,
    ).toBeGreaterThanOrEqual(1);
    expect(drivenHere(path) || FILL_UNDRIVEN.has(path)).toBe(true);
  },
);

test.each([...FILL_UNDRIVEN])(
  "%s is a declared gap that still exists and still owns a copy of the fill",
  (path) => {
    // A renamed or deleted file, or one that dropped the hook, would otherwise sit on the
    // register forever excusing nothing and hiding that it excuses nothing.
    expect(OWN_COPY.map((widget) => widget.path)).toContain(path);
  },
);

test.each([...FILL_UNDRIVEN])("%s has not quietly been driven here after all", (path) => {
  // The other direction: a widget that gains a case has to leave the register, or the
  // register stops describing the tree and starts excusing it.
  expect(drivenHere(path)).toBe(false);
});

test("every per-widget case pins the value its blank must hold", () => {
  // A case with no expected value only says that SOMETHING was filled, which is exactly what
  // a wrong expression also does. The shape cases above are allowed to skip it, because what
  // they are about is the shape; these are about the answer.
  expect(new Set(WIRED_CASES.map((c) => c.name)).size).toBe(WIRED_CASES.length);
  for (const wired of WIRED_CASES) {
    expect(
      wired.answer,
      `${wired.name}: no expected value, so the case cannot tell a right fill from a wrong one`,
    ).not.toBe("");
  }
});
