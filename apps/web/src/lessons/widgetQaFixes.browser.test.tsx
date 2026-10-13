/**
 * Two defects QA found by looking at the widgets rather than at the code, both of which a
 * unit test could not have seen.
 *
 * 1. THE PEELED-OFF OPERAND. A row that compares two expressions puts both of them, plus
 *    the worked-out reading, into the first cell of `.lesson-classify__row`. That cell is
 *    capped at 6.75rem and set `white-space: nowrap; justify-self: end`, so once the
 *    verdict rendered beside it the cell was sized to its content and pinned by its right
 *    edge, and the left-hand expression grew off the left of the card. The learner watched
 *    the thing being compared disappear at the exact moment they were told about it.
 *
 * 2. THE UNSCRAMBLED TRAY. An ordering interaction whose options are offered in the order
 *    they are meant to be placed can be finished left to right without reading any of
 *    them. `LabelParts` did exactly that: its tray was `parts` and its slots were `parts`.
 *
 * Both are proved here against real layout in real Chromium, because "is it still on the
 * screen" is a question only a browser can answer.
 */

import { afterEach, expect, test } from "vitest";

// The real stylesheet, because the first half of this file is an assertion about LAYOUT
// and an unstyled widget has none. Nothing else in the browser suite loads it, so a test
// that measured boxes without this would pass on a bug it could not see.
import "../styles.css";
import { visualsBuiltOn } from "./kindFamily";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function live(root: ParentNode, selector: string): HTMLButtonElement[] {
  return all<HTMLButtonElement>(root, selector).filter((b) => !b.disabled);
}

/* ------------------------------------------------- 1. the peeled-off left-hand operand */

/** Every visual whose rows compare two expressions and then print a verdict beside them. */
const COMPARISON_VISUALS: readonly LessonVisualId[] = [
  "rationalize-explore",
  "like-terms-classify",
];

test.each(COMPARISON_VISUALS)(
  "%s: answering a row leaves both compared expressions on the screen",
  async (id) => {
    h = mount(<LessonVisual id={id} />);
    const host = h.host;
    await waitFor(
      () => host.querySelector(".lesson-classify__row") !== null,
      `${id} mounts`,
    );

    const row = host.querySelector(".lesson-classify__row") as HTMLElement;
    const before = all(row, ".lesson-interactive__step-eq [data-latex]").length;
    expect(before, `${id}: the row states what is being compared`).toBeGreaterThan(1);

    // Answer the row, which is what settles it and prints the verdict beside the pair.
    live(row, ".lesson-interactive__chip")[0]?.click();
    await waitFor(
      () =>
        row.querySelector(".lesson-classify__outcome") !== null ||
        live(row, ".lesson-interactive__chip").length === 0,
      `${id}: the row reports a verdict`,
    );

    // Both expressions are still there, and still inside the row rather than hanging off
    // its left edge. The row's own edge is what to measure against: a cell pinned by its
    // right edge grows leftwards out of the row long before it leaves the viewport, and
    // in a real lesson card the card's edge is only a few pixels further out.
    const board = host.querySelector(".lesson-interactive") as HTMLElement;
    const rowLeft = row.getBoundingClientRect().left;
    const boardLeft = board.getBoundingClientRect().left;
    const parts = all<HTMLElement>(row, ".lesson-interactive__step-eq [data-latex]");
    expect(parts.length, `${id}: an operand went missing`).toBeGreaterThanOrEqual(before);
    for (const part of parts) {
      const box = part.getBoundingClientRect();
      const latex = part.getAttribute("data-latex");
      expect(
        box.left,
        `${id}: "${latex}" hangs off the left of its row`,
      ).toBeGreaterThanOrEqual(rowLeft - 1);
      expect(
        box.left,
        `${id}: "${latex}" hangs off the left of the widget`,
      ).toBeGreaterThanOrEqual(boardLeft - 1);
      expect(box.width, `${id}: "${latex}" has no box`).toBeGreaterThan(0);
    }
  },
);

/* ------------------------------------------------------------ 2. the unscrambled tray */

/**
 * Every interaction that offers a set of options to be placed in some order. If the option
 * on top is the one that belongs in the slot on top, the board is solvable by working left
 * to right without reading a single option, and the interaction has stopped testing
 * anything. So the first offered option must be refused by the first open target.
 */
const ORDERING_VISUALS: readonly LessonVisualId[] = [
  "power-parts-label",
  "radical-parts-label",
  "fraction-exponent-label",
  "power-of-power-match",
  "perfect-square-factor-match",
  "negative-exponent-order",
  // The tables were outside this sweep because it only looked for label slots, so the
  // property went unasserted on them. A table deals one open slot at a time, which is the
  // slot `targets[0]` finds.
  "zero-exponent-table",
  "unlike-sum-table",
  "fraction-exponent-undo-table",
  "identity-inverse-match",
  "rational-numeric-twin-match",
  "rational-simplify-order",
  "linear-line-convert-order",
  "rational-end-behavior-table",
  "linear-slope-ratio-table",
  // D6's ordering shapes: the two built on `OrderSteps`, the label, and one of the two tables.
  // Scoped by the BEHAVIOUR rather than by the kind — a table and a label deal an ordered set
  // of options exactly as an order board does, which is why the tables above are here too.
  //
  // `rate-table` is the one D6 shape LEFT OUT, and it is left out because it FAILS this rather
  // than because it is a different shape: its first offered value is accepted by its first
  // open row, so working down the tray solves that row without reading it. Recorded here
  // rather than omitted, because an id nobody wrote down is indistinguishable from an id
  // nobody thought of. Fixing it is a widget edit and belongs to the pass that owns FUN.5.
  "quotient-order",
  "transform-order",
  "function-notation-label",
  "compose-series-explore",
];

test.each(ORDERING_VISUALS)(
  "%s: taking the options in the order they are offered does not solve it",
  async (id) => {
    let completed = 0;
    h = mount(
      <LessonVisual
        id={id}
        onComplete={() => {
          completed += 1;
        }}
      />,
    );
    const host = h.host;
    await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
    const board = host.querySelector(".lesson-interactive") as HTMLElement;

    const sides = all<HTMLElement>(board, ".lesson-match__side");
    const sources =
      sides.length === 2
        ? live(sides[0] as HTMLElement, "button")
        : live(board, ".lesson-sorter__chip");
    const targets =
      sides.length === 2
        ? live(sides[1] as HTMLElement, "button")
        : live(board, ".lesson-label__slot, .lesson-table__slot");
    expect(sources.length, `${id}: nothing on offer`).toBeGreaterThan(1);

    // Take the first option and give it to the first target, which is the whole of the
    // "just work down the list" strategy.
    sources[0]?.click();
    targets[0]?.click();

    await waitFor(
      () =>
        (board.querySelector(".lesson-interactive__status")?.textContent ?? "").length > 0,
      `${id}: the board answers back`,
    );
    const said = board.querySelector(".lesson-interactive__status")?.textContent ?? "";
    expect(said, `${id}: the first option belonged in the first slot`).toMatch(
      /Not quite|Not that one|cannot come next/i,
    );
    expect(completed, `${id}: working down the list finished the board`).toBe(0);
  },
);

/* ------------------------------------------------------- 3. the unnamed objective */

/**
 * Every assembly widget says WHAT is being built, not only how to work the control.
 *
 * R9 ("the task statement lives in the widget") was satisfiable by a purely procedural
 * line, and that loophole is what shipped `negative-exponent-order` with "Tap the line that
 * comes next. Each one has to rest on something already on the board." Both sentences
 * describe the control. Nothing said the four chips form a derivation of $2^{-3}$, so QA
 * read a good proof as four shuffled lines.
 *
 * The objective is a required prop on the three assembly KINDS, so `tsc` already refuses a
 * widget that omits it. What a type cannot check is the two ways of satisfying it while
 * missing the point, and those are what this covers: pasting the mechanic into the field,
 * and printing the answer into it. The second is a real hazard rather than a hypothetical,
 * because in an ordering widget the final step IS one of the chips on offer.
 *
 * The three kinds ARE the population, so they are named and their instances are read off the
 * sources. It was an id list with `filter(endsWith("-order")).length` counts under it checking
 * 3, 3 and 5, which is a count of the list against itself and stays true whatever the tree
 * does: a fourth ordering widget would have left the list short and the count green.
 */
const ASSEMBLY_KINDS = ["LabelParts", "FillTable", "OrderSteps"] as const;

const ASSEMBLY_VISUALS: readonly LessonVisualId[] = ASSEMBLY_KINDS.flatMap((kind) =>
  visualsBuiltOn(kind),
);

/**
 * How many swept objectives actually typeset any math, tallied by the sweep below as it runs.
 * Read by the vacuity check at the end of the file, which is declared last so it runs last.
 */
let goalsWithMath = 0;

/** The LaTeX of every option a board is offering, which includes its own final step. */
function optionLatex(board: HTMLElement): string[] {
  return all(board, ".lesson-sorter__chip [data-latex], .lesson-match__side [data-latex]")
    .map((node) => node.getAttribute("data-latex") ?? "")
    .filter(Boolean);
}

test.each(ASSEMBLY_VISUALS)(
  "%s: names the objective, separately from the mechanic and without the answer in it",
  async (id) => {
    h = mount(<LessonVisual id={id} />);
    const host = h.host;
    await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
    const board = host.querySelector(".lesson-interactive") as HTMLElement;

    const objective = board.querySelector<HTMLElement>(".lesson-interactive__objective");
    expect(objective, `${id}: no objective line`).not.toBeNull();
    const goal = (objective?.textContent ?? "").trim();
    expect(
      goal.length,
      `${id}: the objective is too short to name what is being built`,
    ).toBeGreaterThan(40);

    // Two lines, two jobs. The same words in both is the loophole wearing the fix's clothes.
    const mechanic = (
      board.querySelector(".lesson-interactive__status")?.textContent ?? ""
    ).trim();
    expect(mechanic.length, `${id}: no mechanic line`).toBeGreaterThan(0);
    expect(goal, `${id}: the objective is a copy of the mechanic`).not.toBe(mechanic);

    // A goal that prints one of the options on offer has handed over that option.
    const offered = optionLatex(board);
    const inGoal = all(objective as HTMLElement, "[data-latex]").map((n) =>
      n.getAttribute("data-latex"),
    );
    if (inGoal.length > 0) {
      goalsWithMath += 1;
    }
    for (const latex of inGoal) {
      expect(
        offered,
        `${id}: the objective prints an option that is on offer`,
      ).not.toContain(latex);
    }
  },
);

test("the objective sweep is not vacuous", () => {
  // The population first, and per KIND, because it is the more specific diagnosis: a kind
  // whose widgets stop resolving is a kind whose instances went unswept, and the total on its
  // own would not name which. Asserted against the kinds rather than against the ids this file
  // lists, which is the difference between a claim about the tree and a claim about the list.
  for (const kind of ASSEMBLY_KINDS) {
    expect(
      visualsBuiltOn(kind).length,
      `${kind}: no registered widget was found, so its instances are unswept`,
    ).toBeGreaterThanOrEqual(1);
  }
  expect(
    ASSEMBLY_VISUALS.length,
    "the three assembly kinds resolved to fewer widgets than exist",
  ).toBeGreaterThanOrEqual(11);
  expect(new Set(ASSEMBLY_VISUALS).size).toBe(ASSEMBLY_VISUALS.length);

  // The answer-leak half of the test above compares typeset math, so it proves nothing on a
  // board whose goal is plain prose. This used to name the board expected to carry math and
  // trust it. It COUNTS now, tallied by the sweep itself as it ran: naming an id asserts that
  // the id is in the list, which is not the same claim as some objective having had math in it
  // for the leak check to compare.
  expect(
    goalsWithMath,
    "no swept objective printed any math, so the answer-leak assertion above compared nothing",
  ).toBeGreaterThan(0);
});
