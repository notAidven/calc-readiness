/**
 * A ROW OF NUMERIC CALLS COUNTS UPWARDS, LEFT TO RIGHT.
 *
 * LIN.5's `abs-count-classify` asks how many solutions each rule has and offered the three
 * answers as the words "Two", "One", "None", in that order. Read left to right that is a scale
 * running BACKWARDS, and the words hide it: nothing about "Two" beside "One" beside "None"
 * announces itself as a sequence, so the row reads as three unordered options rather than as
 * three points on a count. Written as the numerals it is the same information and the ordering
 * is suddenly a claim a reader can check, which is why the numerals are the fix and the order is
 * the fix, and neither is sufficient alone.
 *
 * ## Why the DOM order is only half of it
 *
 * `.lesson-classify__row` is `grid-template-columns: subgrid`, so where a chip is PAINTED is
 * decided by the track it lands in and not by where it sits in the source. Reordering an array
 * and asserting the array is a claim about the array. `grid-auto-flow`, an `order` property, a
 * `direction`, or a row that stops being a grid item at all (see `classifyChipFit`'s "a row is a
 * row", which exists because exactly that happened to `geo-paving-classify`) all move the paint
 * without moving the DOM. So the assertion that answers "increasing from left to right" is the
 * one about x, and it is made on the painted INK rather than on the buttons: a chip whose label
 * is painted outside its own border is the defect `classifyChipFit` was written for, and where it
 * happens the box order and the reading order are different orders.
 *
 * Both are asserted, separately, because they fail for different reasons and a failure should
 * name which: the DOM order is the order a screen reader and the tab key take, and the painted
 * order is the one a learner reads.
 *
 * ## The population, and how narrow it honestly is
 *
 * Derived rather than listed: every visual any lesson pack places is mounted, and a row joins the
 * population when EVERY call on it is a bare number. That is the property that makes the defect
 * possible — a row whose options are a numeric scale has a right order, and a row offering
 * "Endpoint in" beside "Endpoint out" does not — so it is what the population is scoped by,
 * rather than by the widget the report was written about or by the layer the mechanic lives in.
 *
 * Today exactly one placed board qualifies, and the floor below says so rather than implying a
 * sweep that is wider than it is. It is a floor and not a count so a second numeric board joins
 * without an edit here, and `abs-count-classify` is asserted to be IN the population beside it,
 * because a floor of four rows is otherwise satisfied by four rows of anything at all and the
 * named instance could drop out of the sweep without a number moving.
 *
 * Real Chromium and the real stylesheet, because the x-coordinates are grid layout.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { visualsBuiltOn } from "./kindFamily";
import {
  CITY_DESKTOP,
  CITY_PHONE,
  FIGURE_CONTENT_CAP,
  PHONE_VIEWPORT,
} from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport the frame in this file is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * Sub-pixel slack, in px. Two chips whose centres are under a pixel apart are on top of each
 * other, so this is the smallest separation that is a left-to-right order at all; the real gaps
 * here are a whole column wide.
 */
const SLACK = 1;

let h: Harness | null = null;

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

async function mountVisual(id: LessonVisualId, width: number): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${width}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  await document.fonts.ready;
  return host;
}

/**
 * Wait until every piece of math on the board has actually been set.
 *
 * A SPATIAL reading taken before this is a reading of the wrong picture, and it does not look
 * like one: `data-latex` is on the element from first render, so the string half of this file
 * was perfectly green over a board whose expressions were still zero-wide boxes. The layout
 * half was not, and its first red was that — every expression on `abs-count-classify` reading
 * `left === right === 339.0` before the press and a real box after it, which is a measurement
 * of KaTeX arriving rather than of anything a learner did.
 *
 * Zero nodes is a pass, because a widget with no typeset math has nothing to wait for; the
 * boards this file measures are floored on their expressions elsewhere.
 */
async function typesetIn(host: HTMLElement, what: string): Promise<void> {
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (entry) => entry.querySelector(".katex") !== null,
      ),
    `${what}: every expression typesets`,
    20_000,
  );
  await document.fonts.ready;
}

/**
 * The chip's label, without the tick or cross a settled option carries.
 *
 * The same reading `classifyChipFit` takes, and for the same reason: the mark is a separate
 * classed span precisely so that a measurement of the LABEL can strip it.
 */
function chipLabel(chip: HTMLElement): string {
  const clone = chip.cloneNode(true) as HTMLElement;
  for (const mark of Array.from(clone.querySelectorAll(".lesson-classify__mark"))) {
    mark.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** A bare number and nothing else: what makes a set of calls a scale. */
const NUMERAL = /^-?\d+(?:\.\d+)?$/;

/**
 * Where the element's text was really painted, as one box around every line of it.
 *
 * `Range.getClientRects()` rather than the element's own box, because the two are different
 * claims: the box is where the button is and this is where the digit is.
 */
function paintedInkBox(el: HTMLElement): DOMRect | null {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
  if (rects.length === 0) {
    return null;
  }
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const top = Math.min(...rects.map((r) => r.top));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

/** One call on a numeric row: what it says, what that is worth, and where it is drawn. */
interface Call {
  readonly label: string;
  readonly value: number;
  /** The centre of the digits as painted, which is what the learner reads. */
  readonly inkCentre: number;
}

interface NumericRow {
  readonly where: string;
  readonly visual: string;
  readonly calls: Call[];
}

/**
 * Mount every placed visual at `width` and keep the classify rows whose calls are all numbers.
 */
async function sweep(width: number): Promise<{ rows: NumericRow[]; visuals: string[] }> {
  const rows: NumericRow[] = [];
  const visuals: string[] = [];

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id, width);
    const boards = all<HTMLElement>(host, ".lesson-classify__row");
    if (boards.length === 0) {
      h?.cleanup();
      h = null;
      continue;
    }
    let contributed = false;
    boards.forEach((row, at) => {
      const chips = all<HTMLElement>(row, ".lesson-interactive__chip");
      const labels = chips.map(chipLabel);
      if (chips.length < 2 || !labels.every((label) => NUMERAL.test(label))) {
        return;
      }
      contributed = true;
      rows.push({
        where: `${id} row ${at + 1}`,
        visual: id,
        calls: chips.map((chip, column) => {
          const box = chip.getBoundingClientRect();
          const ink = paintedInkBox(chip);
          const label = labels[column] ?? "";
          return {
            label,
            value: Number(label),
            // A chip with no ink at all would otherwise read as sitting at x = 0 and satisfy the
            // order check by accident, so it falls back to the box it was drawn in.
            inkCentre: ink === null ? box.left + box.width / 2 : ink.left + ink.width / 2,
          };
        }),
      });
    });
    if (contributed) {
      visuals.push(id);
    }
    h?.cleanup();
    h = null;
  }

  return { rows, visuals };
}

/**
 * Four rows of numeric calls are placed today, all four of them LIN.5's, one variant board per
 * mount. A floor rather than a count, so a second numeric board needs no edit here, and paired
 * with the membership assertion below, which is the part that pins the SHAPE: a floor constrains
 * size only, and four rows of some future board would meet it with LIN.5 gone from the sweep.
 */
const NUMERIC_ROW_FLOOR = 4;
const NUMERIC_BOARD = "abs-count-classify";

/**
 * Every surface, so none of them can start counting backwards on its own.
 *
 * `CITY_DESKTOP` is here because the two below are not what a learner on a desktop is given, and
 * the width-stability claim underneath turns out to be sensitive to exactly that. 460 and 305 are
 * narrow enough that the board's columns are being stretched to fill their host; 894 is the width
 * at which the grid is sized by its CONTENT and a chip is as wide as what is in it. A press that
 * cannot move a stretched column can still move that one, so a guard measuring only the first two
 * is green over the state the report was about.
 */
const WIDTHS: readonly (readonly [string, number])[] = [
  [CITY_DESKTOP.where, CITY_DESKTOP.inside],
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
  [CITY_PHONE.where, CITY_PHONE.inside],
];

test.each(WIDTHS)(
  "a row of numeric calls counts upwards, in the DOM and across the screen, at %s",
  async (_at, width) => {
    const { rows, visuals } = await sweep(width);

    // The order a screen reader and the tab key take.
    const outOfSequence = rows.flatMap((row) =>
      row.calls.flatMap((call, at) => {
        const before = row.calls[at - 1];
        return before === undefined || call.value > before.value
          ? []
          : [`${row.where} offers "${before.label}" before "${call.label}"`];
      }),
    );
    expect(
      outOfSequence.join("; "),
      `at ${width}px these rows hand their numeric calls over out of sequence`,
    ).toBe("");

    // AND THE ORDER A LEARNER READS. Under a subgrid the DOM order above says nothing about
    // this, which is the whole reason the claim is measured rather than reviewed.
    const paintedBackwards = rows.flatMap((row) =>
      row.calls.flatMap((call, at) => {
        const before = row.calls[at - 1];
        return before === undefined || call.inkCentre > before.inkCentre + SLACK
          ? []
          : [
              `${row.where} paints "${call.label}" at x=${call.inkCentre.toFixed(1)}, which is not right of "${before.label}" at x=${before.inkCentre.toFixed(1)}`,
            ];
      }),
    );
    expect(
      paintedBackwards.join("; "),
      `at ${width}px these numeric calls are not painted in increasing order left to right`,
    ).toBe("");

    // A floor under two ABSENCES, both of which hold over an empty sweep.
    expect(
      rows.length,
      `at ${width}px no placed board offered a row of numeric calls, so this measured nothing`,
    ).toBeGreaterThanOrEqual(NUMERIC_ROW_FLOOR);
    expect(
      visuals,
      `${NUMERIC_BOARD} is the board this claim was written for and it is no longer in the population, so the floor above is being met by something else`,
    ).toContain(NUMERIC_BOARD);
  },
  300_000,
);

/**
 * THE NAMED INSTANCE. The sweep above is about the class and would be just as green over
 * "1", "2", "3": the report was that the counts should read the numerals 0, 1 and 2.
 *
 * The `spoken` strings are asserted with them, in the same test, because they are the reason the
 * label may be a bare digit at all: an option's accessible name still says "no solutions", so
 * nothing a screen reader reads out was traded for the numeral a sighted learner gets.
 */
test(`${NUMERIC_BOARD} offers 0, 1 and 2, and still says them in words`, async () => {
  const host = await mountVisual(NUMERIC_BOARD, FIGURE_CONTENT_CAP);
  const rows = all<HTMLElement>(host, ".lesson-classify__row");
  expect(rows.length, "the board drew no rows").toBeGreaterThanOrEqual(NUMERIC_ROW_FLOOR);

  for (const [at, row] of rows.entries()) {
    const chips = all<HTMLElement>(row, ".lesson-interactive__chip");
    expect(chips.map(chipLabel), `row ${at + 1} does not read 0, 1, 2`).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(
      chips.map((chip) =>
        (chip.getAttribute("aria-label") ?? "").replace(/^.*: /, "").trim(),
      ),
      `row ${at + 1} lost the spoken counts from its accessible names, so a screen reader now hears the digits`,
    ).toEqual(["no solutions", "one solution", "two solutions"]);
  }
});

/** The three counts as the board says them out loud. */
const SPOKEN = ["no solutions", "one solution", "two solutions"] as const;

/** Every chip on the board, keyed by row and column for a width-stability reading. */
function chipWidths(host: HTMLElement): Map<string, number> {
  const out = new Map<string, number>();
  all<HTMLElement>(host, ".lesson-classify__row").forEach((row, rowAt) => {
    all<HTMLElement>(row, ".lesson-interactive__chip").forEach((chip, colAt) => {
      out.set(`row ${rowAt + 1} col ${colAt + 1}`, chip.getBoundingClientRect().width);
    });
  });
  return out;
}

/**
 * Where each expression and chip sits, so a note that grows the expression track is visible
 * even when the call columns are already fixed at `4rem`.
 */
function rowLayout(host: HTMLElement): Map<string, number> {
  const out = new Map<string, number>();
  all<HTMLElement>(host, ".lesson-classify__row").forEach((row, rowAt) => {
    const eq = row.querySelector<HTMLElement>(".lesson-interactive__step-eq");
    if (eq !== null) {
      const box = eq.getBoundingClientRect();
      out.set(`row ${rowAt + 1} eq left`, box.left);
      out.set(`row ${rowAt + 1} eq right`, box.right);
    }
    all<HTMLElement>(row, ".lesson-interactive__chip").forEach((chip, colAt) => {
      out.set(`row ${rowAt + 1} col ${colAt + 1} left`, chip.getBoundingClientRect().left);
    });
  });
  return out;
}

/**
 * A press must not widen the column tracks.
 *
 * `.lesson-classify` sizes each column from `min-content` across every row. When the verdict mark
 * is inserted only after a tap, a one-character label and its tick fit on one flex line, the
 * column's floor rises, and every chip in that column stretches — not just the one that was
 * pressed. The fix reserves the mark's width from first paint; this claim is the measurement
 * that proves it.
 */
test.each(WIDTHS)(
  `${NUMERIC_BOARD}'s call chips keep their width after one is pressed, at %s`,
  async (_at, width) => {
    const host = await mountVisual(NUMERIC_BOARD, width);
    await typesetIn(host, NUMERIC_BOARD);
    const before = chipWidths(host);

    const firstRow = all<HTMLElement>(host, ".lesson-classify__row")[0];
    if (firstRow === undefined) {
      throw new Error("the board drew no row to answer");
    }
    // The correct call on row 1 (`two` → chip `2`), so settling does not print the long wrong
    // note beneath the row, which would widen the board for a reason this claim is not about.
    const firstChip = all<HTMLButtonElement>(firstRow, ".lesson-interactive__chip")[2];
    if (firstChip === undefined) {
      throw new Error("the first row drew no call chip");
    }
    firstChip.click();
    await waitFor(
      () => firstChip.getAttribute("aria-pressed") === "true",
      "the first call registers as pressed",
    );
    await typesetIn(host, `${NUMERIC_BOARD} with one row called`);

    const after = chipWidths(host);
    const shifted = [...before.entries()].flatMap(([where, was]) => {
      const now = after.get(where);
      if (now === undefined || Math.abs(now - was) <= SLACK) {
        return [];
      }
      return [`${where} was ${was.toFixed(1)}px and became ${now.toFixed(1)}px`];
    });
    expect(
      shifted.join("; "),
      `at ${width}px one press widened these chips via the shared column tracks`,
    ).toBe("");
    expect(before.size, "the board drew no call chips to measure").toBeGreaterThanOrEqual(
      NUMERIC_ROW_FLOOR * 3,
    );
  },
  120_000,
);

/**
 * AND A ROW ANSWERED WRONG MUST NOT MOVE THE BOARD, which is the state that actually shipped.
 *
 * The claim above presses the RIGHT call, deliberately, so that settling prints no note. That
 * made it green over the defect it was written for. A missed row prints `.lesson-classify__note`
 * under the row, the note spans `grid-column: 1 / -1`, and a spanning item contributes its
 * intrinsic width to every track it crosses.
 *
 * Fixed `4rem` call columns stopped the chips themselves from widening. They do not stop the
 * EXPRESSION track — still `minmax(min-content, max-content)` — from growing when the note
 * lands, and with a `max-content` board that growth spreads every expression and every chip
 * sideways. Chip widths alone stay green over that; the layout reading below is what catches it.
 */
test.each(WIDTHS)(
  `${NUMERIC_BOARD}'s expressions and calls keep their places after a row is MISSED, at %s`,
  async (_at, width) => {
    const host = await mountVisual(NUMERIC_BOARD, width);
    await typesetIn(host, NUMERIC_BOARD);
    const widthsBefore = chipWidths(host);
    const layoutBefore = rowLayout(host);

    const firstRow = all<HTMLElement>(host, ".lesson-classify__row")[0];
    if (firstRow === undefined) {
      throw new Error("the board drew no row to answer");
    }
    // Row 1's right call is `two`, so chip `0` is a miss and the note is printed.
    const missed = all<HTMLButtonElement>(firstRow, ".lesson-interactive__chip")[0];
    if (missed === undefined) {
      throw new Error("the first row drew no call chip");
    }
    missed.click();
    await waitFor(
      () => missed.getAttribute("aria-pressed") === "true",
      "the missed call registers as pressed",
    );
    await typesetIn(host, `${NUMERIC_BOARD} with a missed row`);

    // The precondition: this claim is about the note, so it is worth nothing if none was drawn.
    expect(
      all(host, ".lesson-classify__note").length,
      "the row was answered wrong and printed no note, so this measured the same state as the claim above",
    ).toBeGreaterThan(0);

    const widthsAfter = chipWidths(host);
    const widthShifted = [...widthsBefore.entries()].flatMap(([where, was]) => {
      const now = widthsAfter.get(where);
      if (now === undefined || Math.abs(now - was) <= SLACK) {
        return [];
      }
      return [`${where} was ${was.toFixed(1)}px and became ${now.toFixed(1)}px`];
    });
    expect(
      widthShifted.join("; "),
      `at ${width}px a missed row's note widened these chips through the shared column tracks`,
    ).toBe("");

    const layoutAfter = rowLayout(host);
    const layoutShifted = [...layoutBefore.entries()].flatMap(([where, was]) => {
      const now = layoutAfter.get(where);
      if (now === undefined || Math.abs(now - was) <= SLACK) {
        return [];
      }
      return [`${where} was ${was.toFixed(1)} and became ${now.toFixed(1)}`];
    });
    expect(
      layoutShifted.join("; "),
      `at ${width}px a missed row's note moved these expressions or call columns sideways`,
    ).toBe("");
    expect(
      widthsBefore.size,
      "the board drew no call chips to measure",
    ).toBeGreaterThanOrEqual(NUMERIC_ROW_FLOOR * 3);
    expect(
      layoutBefore.size,
      "the board drew no expressions or call columns to place",
    ).toBeGreaterThanOrEqual(NUMERIC_ROW_FLOOR * 5);
  },
  120_000,
);

/**
 * AND THE ROW GOES ON STATING THE SAME THING. A call marks the options; it does not rewrite
 * the question.
 *
 * `BinaryRowSort` used to swap the first column on the first tap: a row carried an optional
 * `settledLatex`, and `\sec 90^{\circ}` became `\sec 90^{\circ} = \dfrac{1}{0}` the moment the
 * learner answered. Two harms, and they are the two the claims above are already about, arriving
 * by a different route. The learner looking at a settled row to check the call they just made
 * no longer has the thing they made it about in front of them; and the settled reading is the
 * WIDER string wherever it says anything, so the first track grew on a press and, because
 * `.lesson-classify` sizes its columns across every row at once, dragged rows the learner had
 * not touched sideways with it. `abs-count-classify` never did this, which is the parity the
 * kind was brought to.
 *
 * ## The population is the boards that can exhibit it, not the board the report named
 *
 * The claims above measure `abs-count-classify`, which is one bespoke widget. The swap lived in
 * a SHARED kind with ten adopters, so a guard pinned to LIN.5 would have been green over every
 * one of them. `visualsBuiltOn("BinaryRowSort")` reads each widget's own import, so this is
 * derived from the sources rather than listed here, floored so an empty derivation cannot pass,
 * and `abs-count-classify` is swept beside them because it is the reference the parity is
 * against: if IT starts swapping, the thing the kind was matched to has moved.
 *
 * ## Both valences, because they settle a row by different paths
 *
 * A correct call and a wrong one are separate assertions on purpose. A wrong call is the state
 * the report was about and the one that also prints the note, and a correct call is the one a
 * "only rewrite it when they got it right" implementation would sneak through. The mark on the
 * chip that was pressed says which happened, so the two are OBSERVED rather than assumed off a
 * board's answer order, and each board is asserted to have produced one of each.
 *
 * The reading is the LaTeX each part was typeset FROM, not the painted text: KaTeX output is
 * spans of glyphs, and two different expressions can agree on a substring of that.
 *
 * ## And WHERE it is drawn, which is the other half of the same complaint
 *
 * "The expression stays put" is two claims, and the swap was only the first of them. A row that
 * goes on stating the same LaTeX 7.4px to the left of where it stated it has still moved out
 * from under the learner, so the string reading above is taken with a `rowLayout` reading beside
 * it and both are asserted after every call.
 *
 * The second half had a second cause. These boards are `--cols-3`, whose call columns are sized
 * from their content, and the tick a settled option draws joined that content on the first tap:
 * measured here before the fix, one press on `trg-window-sorter` at the 460px cap took every
 * expression 7.4px left and every second call 7.4px right, on rows the learner had not touched.
 * The fix is `abs-count-classify`'s, and it is what brought the kind the rest of the way to
 * parity: render the mark span always and empty, and let `.lesson-classify__mark:empty::after`
 * hold the slot with the hidden glyph from first paint.
 *
 * The tolerance is `SLACK`, one pixel, and it is doing real work rather than absorbing the
 * defect: 7.4px is seven times it, and the fix takes the reading to nothing at all.
 */
const BINARY_ROW_VISUALS: readonly LessonVisualId[] = visualsBuiltOn("BinaryRowSort");

/**
 * Twelve widgets are on the kind today: the six D9 sorters, D6's function-mapping and
 * one-to-one boards, and LIN.4, LIN.5's compound band, RAD.1 and D5's tolerance board. A floor
 * rather than a count, so the thirteenth adopter is swept without an edit here, and paired below
 * with a membership assertion, because a floor constrains size and not shape: twelve boards of
 * something else would meet it with every sorter gone from the sweep.
 *
 * It said ten, which was true of the tree D9 branched from and stopped being true when D6 landed
 * two more adopters. Nothing was red — a floor two under its population still catches a
 * derivation returning nothing — but a floor that no longer describes its population has stopped
 * being able to report an adopter leaving, which is the only job it has.
 */
const BINARY_ROW_FLOOR = 12;

/** The derived population, plus the bespoke board the kind was brought into parity with. */
const STABLE_EXPRESSION_BOARDS: readonly LessonVisualId[] = [
  ...BINARY_ROW_VISUALS,
  NUMERIC_BOARD as LessonVisualId,
];

/**
 * What each row STATES, in board order, as the LaTeX it was typeset from.
 *
 * As a JSON array rather than a joined string, for two reasons that are both about the red. The
 * parts stay separated by something no LaTeX can contain, so a row written as parts cannot
 * compare equal to the same pieces regrouped; and every character of it is ASCII, so the failure
 * prints the same in a console that is not speaking UTF-8 as it does here. A separator chosen for
 * being unmistakable on screen came back as `???` in the injected red that proved this claim.
 */
function statedExpressions(host: HTMLElement): string[] {
  return all<HTMLElement>(host, ".lesson-classify__item").map((item) =>
    JSON.stringify(
      all<HTMLElement>(item, ".lesson-interactive__step-eq [data-latex]").map(
        (part) => part.getAttribute("data-latex") ?? "",
      ),
    ),
  );
}

test.each(WIDTHS)(
  "a classify row states the same expression after it is called, right or wrong, at %s",
  async (_at, width) => {
    const rewritten: string[] = [];
    const moved: string[] = [];
    const unmarked: string[] = [];
    const valences = new Map<string, Set<string>>();
    let callsMade = 0;
    let placesRead = 0;

    for (const id of STABLE_EXPRESSION_BOARDS) {
      const host = await mountVisual(id, width);
      await typesetIn(host, id);
      const before = statedExpressions(host);
      const placedBefore = rowLayout(host);
      placesRead += placedBefore.size;
      // Two floors under the comparison, because "unchanged" holds over nothing at all: the
      // board has rows, and each of them states something.
      expect(before.length, `${id}: the board drew fewer than two rows`).toBeGreaterThan(1);
      for (const [at, stated] of before.entries()) {
        expect(
          stated.length,
          `${id} row ${at + 1}: states no expression, so there is nothing for a call to leave alone`,
        ).toBeGreaterThan(0);
      }

      const seen = new Set<string>();
      const items = all<HTMLElement>(host, ".lesson-classify__item");
      for (const [at, item] of items.entries()) {
        // The first option on every row, which is a right call on some rows and a wrong one on
        // others; the mark it comes back with is what says which, per board.
        const chip = all<HTMLButtonElement>(item, ".lesson-interactive__chip")[0];
        if (chip === undefined) {
          unmarked.push(`${id} row ${at + 1} offered nothing to press`);
          continue;
        }
        chip.click();
        await waitFor(
          () => item.dataset.settled === "true",
          `${id}: row ${at + 1} never settled`,
        );
        // Including whatever the note a missed row prints has in it, so the reading after the
        // press is of a settled board and not of one mid-typeset.
        await typesetIn(host, `${id} after row ${at + 1}`);
        seen.add(chip.getAttribute("data-mark") ?? "unmarked");
        callsMade += 1;

        statedExpressions(host).forEach((now, rowAt) => {
          const was = before[rowAt];
          if (now !== was) {
            rewritten.push(
              `${id}: the call on row ${at + 1} rewrote row ${rowAt + 1} from "${was}" to "${now}"`,
            );
          }
        });

        // AND WHERE IT IS DRAWN. Read after every call rather than once at the end, so the
        // failure names the press that moved the board and not merely the board.
        const placedNow = rowLayout(host);
        for (const [where, was] of placedBefore) {
          const now = placedNow.get(where);
          if (now === undefined || Math.abs(now - was) <= SLACK) {
            continue;
          }
          moved.push(
            `${id}: the call on row ${at + 1} moved ${where} from ${was.toFixed(1)} to ${now.toFixed(1)}`,
          );
        }
      }
      valences.set(id, seen);
      h?.cleanup();
      h = null;
    }

    expect(
      rewritten.join("; "),
      `at ${width}px these rows stopped stating the expression they were answered about`,
    ).toBe("");
    // Every press against every row on its board, so a board-wide reflow reports once per
    // element it moved and the list runs to hundreds. Enough of it to see the pattern, with the
    // total beside it, because a red that scrolls off the top of a terminal is not readable.
    expect(
      moved.length === 0 ? "" : `${moved.length} in all: ${moved.slice(0, 8).join("; ")}`,
      `at ${width}px a call moved expressions or call columns that were already on the board`,
    ).toBe("");
    expect(unmarked.join("; "), `at ${width}px these rows had no call to make`).toBe("");

    // Both valences, per board, so no board's contribution is one kind of call twice.
    const missingValence = [...valences.entries()].flatMap(([id, seen]) =>
      ["chosenRight", "chosenWrong"].flatMap((mark) =>
        seen.has(mark)
          ? []
          : [
              `${id} never produced a ${mark} call, so only ${[...seen].join(", ") || "nothing"} was measured`,
            ],
      ),
    );
    expect(
      missingValence.join("; "),
      `at ${width}px these boards did not exercise both a correct and a wrong call`,
    ).toBe("");

    expect(
      BINARY_ROW_VISUALS.length,
      "no widget is built on BinaryRowSort at all, so this swept only the bespoke reference board",
    ).toBeGreaterThanOrEqual(BINARY_ROW_FLOOR);
    expect(
      STABLE_EXPRESSION_BOARDS,
      `${NUMERIC_BOARD} is the board the kind was brought into parity with and it is no longer swept`,
    ).toContain(NUMERIC_BOARD);
    expect(
      callsMade,
      `at ${width}px the sweep made ${callsMade} calls, which is fewer than one per board`,
    ).toBeGreaterThanOrEqual(STABLE_EXPRESSION_BOARDS.length * 2);
    // A floor under the SPATIAL half specifically. "Nothing moved" is true of a board whose
    // expressions and chips were never located, and `rowLayout` returning an empty map is
    // exactly what a renamed class would do to it, so the emptiness has to fail here.
    expect(
      placesRead,
      `at ${width}px the sweep located ${placesRead} expressions and call columns, so "nothing moved" is holding over too little of the board`,
    ).toBeGreaterThanOrEqual(STABLE_EXPRESSION_BOARDS.length * 2 * 3);
  },
  600_000,
);

/**
 * AND THE REVEAL IS A SENTENCE, so it takes the words and not the numeral.
 *
 * The host prints "The answer is <answer>." around whatever the widget hands it, and the widget
 * used to hand it the chip's label. That was fine while the label was "None"; as a numeral it
 * reads "The answer is 0 for |x + 5| = -8", which states a count of zero without ever naming
 * what there is none of. It is the one place in the widget where relabelling the buttons changes
 * something other than the buttons, so it gets its own claim rather than a note.
 */
test(`${NUMERIC_BOARD}'s reveal names the count in words, not as a digit`, async () => {
  const host = await mountVisual(NUMERIC_BOARD, FIGURE_CONTENT_CAP);

  // One row called, so the reveal is offered and the row it will explain is the next one.
  const firstRow = all<HTMLElement>(host, ".lesson-classify__row")[0];
  if (firstRow === undefined) {
    throw new Error("the board drew no row to answer");
  }
  all<HTMLButtonElement>(firstRow, ".lesson-interactive__chip")[0]?.click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered once a row has been called",
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button")?.click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-answer") !== null,
    "the reveal prints a passage",
  );

  const said = (
    host.querySelector(".lesson-interactive__reveal-answer")?.textContent ?? ""
  ).trim();
  expect(
    SPOKEN.some((words) => said.startsWith(`${words} for`)),
    `the reveal opens with "${said.slice(0, 24)}", which is not one of the counts in words`,
  ).toBe(true);
  // Stated the other way round as well, because the defect has a shape: the chip's label is a
  // bare numeral, so a reveal that has gone back to using it opens with a digit.
  expect(
    /^\d/.test(said),
    `the reveal opens with the digit off the chip rather than with the count in words: "${said.slice(0, 24)}"`,
  ).toBe(false);

  // The whole sentence into the run log, because "it does not start with a digit" is not the
  // same as "it reads well" and only a reader can settle the second.
  console.log(
    `the reveal now reads: ${(host.querySelector(".lesson-interactive__reveal")?.textContent ?? "").replace(/\s+/g, " ").trim()}`,
  );
});

/**
 * Where this test's viewport sits inside the real browser window. Vitest scales its tester
 * iframe when the requested viewport does not match the window, so a clip written in the
 * requested viewport's pixels lands somewhere else on the real screen.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
    scale: box.height / window.innerHeight,
  };
}

/**
 * One frame of the whole viewport, captured over CDP and clipped to where that viewport is.
 *
 * `at` is the viewport the caller believes it is shooting, and it is a parameter rather than
 * this file's constant because the phone frame is not taken at the reviewer's window. It is
 * checked against the real one rather than trusted: a frame whose viewport is misstated is
 * worse than no frame, since the whole reason a spatial claim owes a picture is that the
 * numbers under it are viewport-relative.
 */
async function shoot(
  name: string,
  at: { width: number; height: number } = VIEWPORT,
): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  // THE LAYOUT VIEWPORT IS THE CLAIM, and it is asserted exactly: a frame named for a phone
  // that was laid out at some other width is the misleading thing this whole section exists to
  // avoid. The tester iframe's on-screen SCALE is a separate matter and is not asserted, because
  // it is not free: an 844px-tall phone does not fit in the runner's window, so vitest shrinks
  // the iframe to 0.853 while still laying the page out at 390x844. Refusing that would trade
  // the phone frame, which is the one worth having, for a round number.
  expect(
    `${window.innerWidth}x${window.innerHeight}`,
    `${name} is named for a ${at.width}x${at.height} viewport and is being laid out in another one`,
  ).toBe(`${at.width}x${at.height}`);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    // Clipped in the PARENT page's coordinates, where the iframe really is, and captured at the
    // reciprocal of the shrink so the PNG comes back at the viewport's own pixel count rather
    // than at a soft 85% of it.
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      scale: 1 / box.scale,
    },
  });
  console.log(
    `${name}: shot a ${at.width}x${at.height} layout viewport from a ${box.width.toFixed(0)}x${box.height.toFixed(0)} on-screen iframe (x${box.scale.toFixed(3)})`,
  );
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, {
      encoding: "base64",
    });
  }
}

/**
 * The board as a learner meets it, with the measured x-centres printed beside the frame.
 *
 * "Increasing left to right" is a claim about a picture, so the numbers above owe one: framed
 * whole rather than cropped to the chips, at the reviewer's viewport, with the four rows in it
 * so the columns can be seen to be columns.
 */
test(`${NUMERIC_BOARD}: a frame of the 0/1/2 calls, at 1024x580`, async () => {
  h = mount(
    <div style={{ width: "620px", margin: "12px auto" }}>
      <LessonVisual id={NUMERIC_BOARD} />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, "it mounts");
  await document.fonts.ready;

  const first = all<HTMLElement>(host, ".lesson-classify__row")[0];
  if (first === undefined) {
    throw new Error("the board drew no row to frame");
  }
  const widthsBefore = all<HTMLElement>(host, ".lesson-interactive__chip").map(
    (chip) => chip.getBoundingClientRect().width,
  );
  const centres = all<HTMLElement>(first, ".lesson-interactive__chip").map((chip) => {
    const ink = paintedInkBox(chip);
    const box = chip.getBoundingClientRect();
    // The button's own box goes in beside the ink centre, because a one-character label is the
    // narrowest thing `minmax(min-content, max-content)` will ever be asked to size a track
    // from, and "is that still a button" is answered by its width and height and not by x.
    return `${chipLabel(chip)} at x=${ink === null ? "no ink" : (ink.left + ink.width / 2).toFixed(1)} in a ${box.width.toFixed(1)}x${box.height.toFixed(1)} button`;
  });
  // The reading goes in the run log beside the frame, so the picture and the numbers under it
  // are recorded by the same pass rather than by two.
  console.log(
    `row 1 painted ink centres at ${VIEWPORT.width}x${VIEWPORT.height}: ${centres.join(", ")}; all chip widths before any press: ${widthsBefore.map((w) => w.toFixed(1)).join(", ")}px`,
  );

  await shoot(`lin5-abs-count-classify-numerals-${VIEWPORT.width}x${VIEWPORT.height}`);
});

/**
 * THE MARK SLOT'S OWN FRAMES.
 *
 * Holding the tick's slot open from first paint is what stops the board moving, and it buys
 * that by making every chip permanently as wide as a marked one. That is a spatial change, and
 * the risk it carries is spatial too: a wider call column leaves the expression track less, and
 * these rows carry long strings. So the assertion above is not the whole of the evidence. A
 * layout test can measure a track to a tenth of a pixel and say nothing whatever about whether
 * the expression it holds has dropped onto a second line, which is the thing a reader would
 * actually notice.
 *
 * Three widths, because the numbers are viewport-relative and resolve to different screens: the
 * 920px in-city column a learner and a `?dev` reviewer are really given, the 460px figure
 * content cap the guard above measures at, and the 330.8px column a 390px phone gives a figure,
 * which is where a wrap bites first. Each is shot at the viewport it belongs to and named for
 * it, and the phone one is a phone viewport rather than a narrow box on a desktop.
 *
 * The board is chosen by MEASUREMENT and not by eye, per width, because the widest board is not
 * the same board at every width and "the one with the long-looking strings" is a guess.
 */

/**
 * Whether this row's expression broke, and if so which of the two ways.
 *
 * COUNTING LINES IS THE OBVIOUS READING AND IT IS WRONG. The first version of this counted the
 * distinct tops in `Range.getClientRects()`, and KaTeX draws a superscript as a box with its own
 * top, so `\sin 40^{\circ}` reads as several lines and every board at every width came back
 * "WRAPPED rows 1,2,3,4". A detector that fires on all ten boards under every condition is
 * measuring the typesetter, and it would have made the frames below look like they were
 * documenting a regression.
 *
 * The two real breaks are told apart because only one of them is about width pressure:
 *
 * - `stacked` is the expression sitting on a line of its own ABOVE the calls. That is the
 *   stylesheet's designed phone degradation (`@container widget (max-width: 380px)`), which
 *   fires at the 278.8px figure box inside a phone card and nowhere near the 460px cap. It is
 *   detected geometrically, by the expression clearing the chips vertically.
 * - `wrapped` is the expression's own parts breaking across lines INSIDE its cell, which is the
 *   thing a wider chip could cause. The parts exist so the cell has somewhere to break, so an
 *   unbroken cell is as tall as its tallest part and a broken one is about twice that.
 */
function expressionBreak(row: HTMLElement): {
  stacked: boolean;
  wrapped: boolean;
} {
  const eq = row.querySelector<HTMLElement>(".lesson-interactive__step-eq");
  const chip = row.querySelector<HTMLElement>(".lesson-interactive__chip");
  if (eq === null || chip === null) {
    return { stacked: false, wrapped: false };
  }
  const eqBox = eq.getBoundingClientRect();
  const stacked = eqBox.bottom <= chip.getBoundingClientRect().top + 1;
  const partHeights = all<HTMLElement>(eq, "[data-latex]").map(
    (part) => part.getBoundingClientRect().height,
  );
  const tallest = partHeights.length === 0 ? eqBox.height : Math.max(...partHeights);
  return {
    stacked,
    wrapped: tallest > 0 && eqBox.height > tallest * 1.5,
  };
}

/** One board's claim on its width, and whether that claim is already being refused. */
interface Pressure {
  readonly id: string;
  /** What the widest row needs across, given how that row is laid out. */
  readonly needs: number;
  /** The widest single unbreakable part of any expression: what a wrap would have to break. */
  readonly floor: number;
  /** The room the row was actually given. */
  readonly has: number;
  /** Rows whose expression broke across lines inside its own cell, by number. */
  readonly wrapped: number[];
  /** Rows the stylesheet has moved onto two lines, by number. Not a wrap. */
  readonly stacked: number[];
}

/**
 * What the widest row on this board needs across, against what it is given.
 *
 * `needs` is built from the row's own floor rather than from its painted width: the expression
 * is authored as PARTS precisely so the cell can break between them, so the piece that cannot be
 * broken is the widest single part, not the whole string. Where the row is on one line that
 * floor is added to the calls, because they are competing for the same line; where the
 * stylesheet has already stacked it they are not, so the two are taken as a maximum instead.
 * Adding them regardless is what made every phone board read as needing more than it had.
 */
function boardPressure(id: string, host: HTMLElement): Pressure {
  let needs = 0;
  let widest = 0;
  let has = 0;
  const wrapped: number[] = [];
  const stacked: number[] = [];
  all<HTMLElement>(host, ".lesson-classify__row").forEach((row, at) => {
    const eq = row.querySelector<HTMLElement>(".lesson-interactive__step-eq");
    if (eq === null) {
      return;
    }
    const parts = all<HTMLElement>(eq, "[data-latex]").map(
      (part) => paintedInkBox(part)?.width ?? 0,
    );
    const floor = parts.length === 0 ? (paintedInkBox(eq)?.width ?? 0) : Math.max(...parts);
    const chips = all<HTMLElement>(row, ".lesson-interactive__chip").reduce(
      (sum, chip) => sum + chip.getBoundingClientRect().width,
      0,
    );
    const broke = expressionBreak(row);
    needs = Math.max(needs, broke.stacked ? Math.max(floor, chips) : floor + chips);
    widest = Math.max(widest, floor);
    has = Math.max(has, row.getBoundingClientRect().width);
    if (broke.wrapped) {
      wrapped.push(at + 1);
    }
    if (broke.stacked) {
      stacked.push(at + 1);
    }
  });
  return { id, needs, floor: widest, has, wrapped, stacked };
}

/**
 * The numbers behind a frame, written out beside it.
 *
 * `console.log` is where these went first and vitest keeps stdout from a PASSING test, so the
 * ranking that chose the board was only ever legible on a run that failed. The reading has to
 * survive the green run, because on a green run it is the whole of the argument for why this
 * board and not one of the other nine.
 */
async function record(name: string, lines: string[]): Promise<void> {
  const text = lines.join("\n");
  console.log(`${name}\n${text}`);
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.txt`, `${text}\n`);
  }
}

/** One board's reading in a line, for the run log the frames are read beside. */
function describe(r: Pressure): string {
  return `${r.id} needs ${r.needs.toFixed(1)} of ${r.has.toFixed(1)}, longest unbreakable piece ${r.floor.toFixed(1)}, ${
    r.wrapped.length === 0
      ? "no expression wrapped"
      : `EXPRESSION WRAPPED on rows ${r.wrapped.join(",")}`
  }${r.stacked.length === 0 ? "" : `, stacked by the phone rule on rows ${r.stacked.join(",")}`}`;
}

/** Press the first option on every row, so every mark on the board is painted. */
async function settleEveryRow(host: HTMLElement): Promise<number> {
  const items = all<HTMLElement>(host, ".lesson-classify__item");
  let settled = 0;
  for (const [at, item] of items.entries()) {
    const chip = all<HTMLButtonElement>(item, ".lesson-interactive__chip")[0];
    if (chip === undefined) {
      continue;
    }
    chip.click();
    await waitFor(() => item.dataset.settled === "true", `row ${at + 1} never settled`);
    await typesetIn(host, `row ${at + 1} settled`);
    settled += 1;
  }
  return settled;
}

/** Mount one board in a column of `width`, centred on the page as a lesson would place it. */
async function framedBoard(id: LessonVisualId, width: number): Promise<HTMLElement> {
  h = mount(
    <div style={{ width: `${width}px`, margin: "8px auto" }}>
      <LessonVisual id={id} />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  await typesetIn(host, id);
  return host;
}

/**
 * Measure every board on the kind at this width, settled, and return the one under most
 * pressure. The whole ranking goes to the log, because "I shot the widest" is a claim about the
 * other nine boards and the reader is entitled to the numbers behind it.
 */
async function widestBoardAt(width: number, slug: string): Promise<Pressure> {
  const readings: Pressure[] = [];
  for (const id of BINARY_ROW_VISUALS) {
    const host = await framedBoard(id, width);
    await settleEveryRow(host);
    readings.push(boardPressure(id, host));
    h?.cleanup();
    h = null;
  }
  // WIDEST FIRST, AND THE TIE IS NOT COSMETIC. Once the stylesheet stretches the call columns
  // to fill the host, every board on a width needs exactly what it is given and four of them
  // tie to the tenth of a pixel; at the 460px cap two do. The tie is broken on the widest
  // unbreakable piece of expression, which is the thing a wrap would have to break, so the
  // board that gets photographed is the one closest to the failure being looked for rather
  // than whichever one the glob happened to list first.
  readings.sort(
    (a, b) => b.needs - a.needs || b.floor - a.floor || a.id.localeCompare(b.id),
  );
  expect(
    readings.length,
    "no board on the kind could be measured, so nothing was ranked",
  ).toBeGreaterThanOrEqual(BINARY_ROW_FLOOR);
  await record(`${slug}-ranking`, [
    `every widget on BinaryRowSort at a ${width}px column, every row settled, widest first:`,
    ...readings.map((r, at) => `${at + 1}. ${describe(r)}`),
  ]);
  const widest = readings[0];
  if (widest === undefined) {
    throw new Error("no board to shoot");
  }
  return widest;
}

const FRAME_WIDTHS: readonly (readonly [string, number, string])[] = [
  ["the 920px in-city lesson column", CITY_DESKTOP.column, "city-920"],
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP, "cap-460"],
];

test.each(FRAME_WIDTHS)(
  "a frame of the widest board on the kind, settled, at %s in a 1024x580 window",
  async (where, width, slug) => {
    const widest = await widestBoardAt(width, slug);
    const host = await framedBoard(widest.id as LessonVisualId, width);
    const settled = await settleEveryRow(host);
    expect(
      settled,
      `${widest.id}: nothing was settled, so the frame shows no marks and proves nothing about the slot`,
    ).toBeGreaterThan(0);
    const after = boardPressure(widest.id, host);
    await record(`${slug}-${widest.id}-settled-1024x580`, [
      `${where}, in a ${VIEWPORT.width}x${VIEWPORT.height} window, ${settled} rows settled`,
      describe(after),
    ]);
    await shoot(`${slug}-${widest.id}-settled-1024x580`);
  },
  600_000,
);

/**
 * A COLUMN OF PLAIN NUMBERS IS RIGHT-ALIGNED. EVERYTHING ELSE ON THE KIND IS NOT.
 *
 * Reported on TRG.1: `-320^\circ` sat under `400^\circ` with its minus sign in the hundreds
 * column, so the four measures read as four unrelated strings rather than as four numbers.
 * Aligned from the START of the track, which is what every row on every board did, the digits
 * of a signed measure are one character right of the digits above it and the degree signs end
 * wherever each string happens to end. A number column is read down its right edge.
 *
 * ## The population is the boards that exhibit it, derived from the ROWS
 *
 * Not a prop and not a per-board list. Either would put the decision on the twelve adopters one
 * at a time, and the property is not theirs to hold: what makes a column a number column is
 * that everything in it is a number, which is a fact about the rows the kind was handed. So the
 * kind reads its own rows and marks the board, and a thirteenth adopter whose rows are plain
 * measures is right-aligned without anybody remembering to ask for it.
 *
 * That derivation is also the thing most able to be quietly wrong, so it is measured in BOTH
 * directions rather than counted. A predicate matching everything and a predicate matching
 * nothing both leave a one-sided assertion green:
 *
 *  - the boards that measure RIGHT-ALIGNED are asserted to be exactly the two whose rows really
 *    are plain measures, as a set, so a predicate that has widened to `\sec 90^\circ` or to an
 *    inequality fails by name and so does one that has stopped matching `-320^\circ`;
 *  - the boards that measure LEFT-ALIGNED carry a floor, so a predicate matching everything
 *    cannot pass by leaving nothing on the other side of the comparison.
 *
 * And "right-aligned" is read as two facts, not one: the right edges agree AND the left edges do
 * not. A board whose four rows happen to paint the same width satisfies both alignments at once,
 * so without the second half the claim would be met by a board that is not aligned at all.
 *
 * Measured at the 920px in-city column, which is the width a learner and a `?dev` reviewer are
 * really given, and where the board's tracks are sized by their content rather than stretched.
 */
const NUMERIC_EXPRESSION_BOARDS: readonly LessonVisualId[] = [
  "trg-coterminal-sorter",
  "trg-window-sorter",
] as LessonVisualId[];

/**
 * The rest of the kind: ten boards today, whose first column is a radical, an inequality, a
 * set, a rule, a weight, a trinomial or a trig expression. A floor, so the eleventh joins with
 * no edit, and load-bearing because the assertion on the other side is a set equality that a
 * predicate matching NOTHING would satisfy on one side and empty on the other.
 */
const RAGGED_BOARD_FLOOR = 10;

/** How far apart two painted edges may be and still be read as one column, in px. */
const EDGE_SLACK = 1;

/** Where each row's expression is really painted, in board order. */
function expressionInk(host: HTMLElement): DOMRect[] {
  return all<HTMLElement>(
    host,
    ".lesson-classify__row .lesson-interactive__step-eq",
  ).flatMap((eq) => {
    const ink = paintedInkBox(eq);
    return ink === null ? [] : [ink];
  });
}

function spread(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);
}

/** How one board's expression column is aligned, as measured rather than as declared. */
interface ColumnReading {
  readonly id: string;
  readonly rows: number;
  /** How far apart the leftmost and rightmost LEFT edges of the expressions are. */
  readonly left: number;
  /** The same for their RIGHT edges. */
  readonly right: number;
}

async function readColumns(width: number): Promise<ColumnReading[]> {
  const readings: ColumnReading[] = [];
  for (const id of BINARY_ROW_VISUALS) {
    const host = await framedBoard(id, width);
    const ink = expressionInk(host);
    readings.push({
      id,
      rows: ink.length,
      left: spread(ink.map((r) => r.left)),
      right: spread(ink.map((r) => r.right)),
    });
    h?.cleanup();
    h = null;
  }
  return readings;
}

test("a column of plain numbers is right-aligned and every other board on the kind is not, at the 920px in-city lesson column", async () => {
  const readings = await readColumns(CITY_DESKTOP.column);
  await record("numeric-column-alignment-city-920", [
    `every widget on BinaryRowSort in a ${CITY_DESKTOP.column}px column, unanswered, in a ${VIEWPORT.width}x${VIEWPORT.height} window:`,
    ...readings.map(
      (r) =>
        `${r.id}: ${r.rows} expressions, left edges spread ${r.left.toFixed(1)}px, right edges spread ${r.right.toFixed(1)}px`,
    ),
  ]);

  // THE POPULATION FIRST, because everything below is a claim about its shape and a claim
  // about the shape of nothing is not a claim. A spread of zero over one row is not an
  // alignment either, so each board owes a column to be aligned in.
  expect(
    readings.length,
    `only ${readings.length} boards on the kind were measured, so an adopter has left the derivation`,
  ).toBeGreaterThanOrEqual(BINARY_ROW_FLOOR);
  for (const r of readings) {
    expect(
      r.rows,
      `${r.id}: fewer than two expressions were painted, so it has no column to align`,
    ).toBeGreaterThan(1);
  }

  const rightAligned = readings
    .filter((r) => r.right <= EDGE_SLACK && r.left > EDGE_SLACK)
    .map((r) => r.id);
  const leftAligned = readings.filter((r) => r.left <= EDGE_SLACK).map((r) => r.id);

  // BOTH DIRECTIONS, as one equality. A predicate that has widened to a board whose rows are
  // not plain numbers fails here by name, and so does one that has stopped matching the
  // signed measure the report was about.
  expect(
    [...rightAligned].sort(),
    "the boards whose expression column is measured right-aligned are not the boards whose rows are plain numbers",
  ).toEqual([...NUMERIC_EXPRESSION_BOARDS].sort());

  // And the other side of it, floored, so a predicate matching EVERYTHING cannot pass by
  // leaving nothing to compare against.
  expect(
    leftAligned.length,
    `only ${leftAligned.length} boards on the kind still align their expression from the start of the track (${leftAligned.join(", ") || "none"}), so the numeric rule has spread past the columns it is for`,
  ).toBeGreaterThanOrEqual(RAGGED_BOARD_FLOOR);
  for (const id of NUMERIC_EXPRESSION_BOARDS) {
    expect(
      leftAligned,
      `${id} is a column of plain numbers and is still aligned from the start of its track`,
    ).not.toContain(id);
  }
}, 600_000);

/**
 * AND ON A PHONE IT IS NOT A COLUMN, so it is not aligned as one — asserted in both directions
 * rather than written into the stylesheet's comment and trusted.
 *
 * Under `@container widget (max-width: 380px)` the expression spans the whole row on a line of
 * its own, so there is no shared track for four measures to line up in and nothing above or below
 * to line them up with. Right-aligned there, the measure would sit at the card's right edge with
 * its two calls underneath on the left. The board keeps the start alignment every other board has
 * at this width.
 *
 * This is the same shape as `classifyChipFit`'s pair of claims about the same container rule: the
 * wide width fails if the numeric boards stop being right-aligned, and this fails if they are
 * right-aligned here, which is what the container rule silently ceasing to apply would look like.
 */
test(`a number column is not aligned as one at ${CITY_PHONE.where}, where the expression takes its own line`, async () => {
  const readings = await readColumns(CITY_PHONE.column);
  await record("numeric-column-alignment-phone", [
    `every widget on BinaryRowSort in a ${CITY_PHONE.column}px column, unanswered, in a ${VIEWPORT.width}x${VIEWPORT.height} window:`,
    ...readings.map(
      (r) =>
        `${r.id}: ${r.rows} expressions, left edges spread ${r.left.toFixed(1)}px, right edges spread ${r.right.toFixed(1)}px`,
    ),
  ]);

  const leftAligned = readings.filter((r) => r.left <= EDGE_SLACK).map((r) => r.id);
  for (const id of NUMERIC_EXPRESSION_BOARDS) {
    expect(
      leftAligned,
      `${id} is aligned as a number column at ${CITY_PHONE.column}px, where its expression spans the row and has no column to be aligned in`,
    ).toContain(id);
  }
  // A floor under a containment, and specifically under the boards the claim is about: reaching
  // none of them satisfies the loop above without measuring anything.
  expect(
    readings.filter((r) => NUMERIC_EXPRESSION_BOARDS.includes(r.id as LessonVisualId))
      .length,
    "neither board with a number column was reached at the phone column",
  ).toBe(NUMERIC_EXPRESSION_BOARDS.length);
  expect(
    readings.length,
    "no board on the kind was measured at the phone column",
  ).toBeGreaterThanOrEqual(BINARY_ROW_FLOOR);
}, 600_000);

/**
 * THE FRAME THE ALIGNMENT CLAIM OWES, and the one the report was written off.
 *
 * The numbers above are edge spreads in px, which is a claim about a picture, so the picture is
 * taken beside them: the whole board, framed rather than cropped to the column that moved, in
 * the 920px column at the reviewer's 1024x580 window, with the four measures on it so a reader
 * can see them line up rather than being told they do.
 */
test(`a frame of ${NUMERIC_EXPRESSION_BOARDS[0]}'s number column, at the 920px in-city lesson column in a 1024x580 window`, async () => {
  const id = NUMERIC_EXPRESSION_BOARDS[0] as LessonVisualId;
  const host = await framedBoard(id, CITY_DESKTOP.column);
  const ink = expressionInk(host);
  expect(ink.length, `${id}: no expression was painted to frame`).toBeGreaterThan(1);
  await record(`numeric-column-${id}-city-920-1024x580`, [
    `${id} in a ${CITY_DESKTOP.column}px column, in a ${VIEWPORT.width}x${VIEWPORT.height} window, unanswered`,
    ...ink.map(
      (r, at) =>
        `row ${at + 1}: painted from x=${r.left.toFixed(1)} to x=${r.right.toFixed(1)}`,
    ),
    `left edges spread ${spread(ink.map((r) => r.left)).toFixed(1)}px, right edges spread ${spread(ink.map((r) => r.right)).toFixed(1)}px`,
  ]);
  await shoot(`numeric-column-${id}-city-920-1024x580`);
}, 300_000);

/**
 * THE BUTTON'S CONTENT IS CENTRED IN THE BUTTON, at every width and in both states.
 *
 * This claim is here because the report asked for a change that turns out not to be owed: "align
 * text in button vertically for ALL visuals that use this template". Measured rather than read off
 * the cascade, every chip on all twelve boards is already centred to 0.0px, at the 920px in-city
 * column, at the 460px figure cap and at the 330.8px phone column, before any row is answered and
 * after every row is. So nothing was changed, and this is what makes that finding durable instead
 * of a sentence in a report: the layout is asserted where it can fail.
 *
 * ## Why the reading is of the CONTENT and not of the label
 *
 * The label alone is not symmetric in the button and is not supposed to be. The chip is
 * `flex-wrap: wrap` holding the label beside `.lesson-classify__mark`, and on a narrow card the
 * mark takes a flex line of its own: `perfect-root-classify` at the phone column has the label on
 * two lines with the tick's line under it, so there is 18.4px more room below the label than above
 * it and every one of those pixels is the tick sitting in it. Read that way the board looks 18px
 * out of centre when it is exactly centred, which is how a correct layout gets "fixed".
 *
 * ## And the glyphs are NOT asserted, deliberately
 *
 * The letters are not symmetric in their line box either: "Keep it" has a descender and sits
 * 9.5px from the top and 4.5px from the bottom, "even" is all x-height and sits 13.5/8.5, and
 * "Coterminal" has neither and sits 9.5/8.5. That is the font's ascent and descent, and centring
 * ink instead of line boxes would put the two calls on one row on two different baselines, which
 * is the defect and not the fix. The numbers are recorded beside the claim so that the thing being
 * left alone is on the record, rather than being absent from it.
 */
function paddedBox(el: HTMLElement): DOMRect {
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const top =
    box.top + Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.paddingTop);
  const bottom =
    box.bottom -
    Number.parseFloat(style.borderBottomWidth) -
    Number.parseFloat(style.paddingBottom);
  return new DOMRect(box.left, top, box.width, bottom - top);
}

/** The label's own painted line boxes: the bare text node, without the mark beside it. */
function labelLines(chip: HTMLElement): DOMRect[] {
  const range = document.createRange();
  const rects: DOMRect[] = [];
  for (const node of Array.from(chip.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim() === "") {
      continue;
    }
    range.selectNode(node);
    rects.push(
      ...Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0),
    );
  }
  const byLine = new Map<number, DOMRect[]>();
  for (const rect of rects) {
    const key = Math.round(rect.top);
    byLine.set(key, [...(byLine.get(key) ?? []), rect]);
  }
  return Array.from(byLine.values())
    .map((group) => {
      const left = Math.min(...group.map((r) => r.left));
      const right = Math.max(...group.map((r) => r.right));
      const top = Math.min(...group.map((r) => r.top));
      const bottom = Math.max(...group.map((r) => r.bottom));
      return new DOMRect(left, top, right - left, bottom - top);
    })
    .sort((a, b) => a.top - b.top);
}

/**
 * Where the GLYPHS are, inside the line box that holds them.
 *
 * A line box is not ink. It is the font's own ascent and descent plus half-leading either side,
 * so a line box centred to the tenth of a pixel still paints its letters high or low whenever
 * the font's ascent and descent are not symmetric about the middle of that box — which for a
 * label with no descenders ("Coterminal" has none below the baseline) is the ordinary case. The
 * report is about what a reader SEES, so the reading has to be of the letters.
 */
function glyphSpan(
  chip: HTMLElement,
  line: DOMRect,
  text: string,
): { top: number; bottom: number } | null {
  const style = getComputedStyle(chip);
  const ctx = document.createElement("canvas").getContext("2d");
  if (ctx === null) {
    return null;
  }
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const m = ctx.measureText(text);
  const fontBox = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  const halfLeading = (line.height - fontBox) / 2;
  const baseline = line.top + halfLeading + m.fontBoundingBoxAscent;
  return {
    top: baseline - m.actualBoundingBoxAscent,
    bottom: baseline + m.actualBoundingBoxDescent,
  };
}

/** One chip's label, and how much room is left above and below it. */
interface LabelPlacement {
  readonly where: string;
  /** Line-box gaps: what `align-items: center` is about. */
  readonly above: number;
  readonly below: number;
  /** Glyph gaps: what a reader sees. `null` on a label the canvas could not measure. */
  readonly inkAbove: number | null;
  readonly inkBelow: number | null;
  /**
   * The gaps around EVERYTHING the button holds — the label's line boxes and the mark's box
   * together — which is the reading that answers "is the button's content centred in it".
   *
   * The label gaps above cannot answer that once the mark takes a flex line of its own, because
   * the room below the label is then mostly the mark sitting in it rather than slack.
   */
  readonly contentAbove: number;
  readonly contentBelow: number;
  readonly lines: number;
}

function labelPlacements(id: string, host: HTMLElement): LabelPlacement[] {
  const out: LabelPlacement[] = [];
  all<HTMLElement>(host, ".lesson-classify__row").forEach((row, at) => {
    for (const chip of all<HTMLElement>(row, ".lesson-interactive__chip")) {
      const lines = labelLines(chip);
      const first = lines[0];
      const last = lines[lines.length - 1];
      if (first === undefined || last === undefined) {
        continue;
      }
      const inside = paddedBox(chip);
      const label = chipLabel(chip);
      const topInk = glyphSpan(chip, first, label);
      const bottomInk = glyphSpan(chip, last, label);
      const mark = chip.querySelector<HTMLElement>(".lesson-classify__mark");
      const markBox = mark?.getBoundingClientRect();
      const contentTop = Math.min(first.top, markBox?.top ?? first.top);
      const contentBottom = Math.max(last.bottom, markBox?.bottom ?? last.bottom);
      out.push({
        where: `${id} row ${at + 1} "${label}"`,
        above: first.top - inside.top,
        below: inside.bottom - last.bottom,
        inkAbove: topInk === null ? null : topInk.top - inside.top,
        inkBelow: bottomInk === null ? null : inside.bottom - bottomInk.bottom,
        contentAbove: contentTop - inside.top,
        contentBelow: inside.bottom - contentBottom,
        // A second flex line is the state `align-items: center` says nothing about, because
        // `align-content` places the lines and then centring happens inside each of them. It is
        // observed rather than inferred: the mark clearing the label vertically is what it looks
        // like from outside.
        lines: markBox !== undefined && markBox.top >= last.bottom - 0.5 ? 2 : 1,
      });
    }
  });
  return out;
}

function describePlacement(p: LabelPlacement): string {
  const ink =
    p.inkAbove === null || p.inkBelow === null
      ? "glyphs unmeasured"
      : `glyphs ${p.inkAbove.toFixed(1)}px / ${p.inkBelow.toFixed(1)}px, off by ${(p.inkAbove - p.inkBelow).toFixed(1)}px`;
  return `${p.where}: CONTENT ${p.contentAbove.toFixed(1)}px above / ${p.contentBelow.toFixed(1)}px below, off by ${(p.contentAbove - p.contentBelow).toFixed(1)}px; label line box ${p.above.toFixed(1)}/${p.below.toFixed(1)}; ${ink}; ${p.lines} flex line(s)`;
}

/**
 * Every width, and both states, because the two things that could put a label off centre are
 * both invisible at the widest one: a label wrapping and the tick taking a flex line of its own
 * only happen on a narrow card, and the tick only has a glyph in it once the row is answered.
 */
const PLACEMENT_WIDTHS: readonly (readonly [string, number])[] = [
  [`${CITY_DESKTOP.column}px in-city column`, CITY_DESKTOP.column],
  [`${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
  [`${CITY_PHONE.column}px phone column`, CITY_PHONE.column],
];

/**
 * How many chips have to reach TWO flex lines for the claim to be worth making.
 *
 * The absence below holds trivially over a board whose every chip is one flex line, because one
 * line is centred by `align-items` alone and nothing about `align-content` is being tested. The
 * wrapped chip is the only state that can be off centre, so if none of them is in the sweep the
 * assertion is green over the case it exists for. Eighty of the six hundred chips measured reach
 * two lines today, at the 460px cap and the phone column; the floor is well under that, so a
 * board that stops wrapping one chip is not a failure, and it is high enough that the wrapped
 * state has to be genuinely present rather than represented by a single chip.
 */
const WRAPPED_CHIP_FLOOR = 60;

test("the chip's content is centred in the button, across every board on the kind, at every width and in both states", async () => {
  const lines: string[] = [];
  const offCentre: string[] = [];
  let measured = 0;
  let wrapped = 0;
  let worstOffset = 0;
  for (const [where, width] of PLACEMENT_WIDTHS) {
    for (const settle of [false, true]) {
      const worst: string[] = [];
      for (const id of BINARY_ROW_VISUALS) {
        const host = await framedBoard(id, width);
        if (settle) {
          await settleEveryRow(host);
        }
        const placements = labelPlacements(id, host);
        measured += placements.length;
        wrapped += placements.filter((p) => p.lines > 1).length;
        for (const p of placements) {
          if (Math.abs(p.contentAbove - p.contentBelow) > EDGE_SLACK) {
            offCentre.push(
              `at ${where}, ${settle ? "answered" : "unanswered"}: ${describePlacement(p)}`,
            );
          }
        }
        const off = [...placements].sort(
          (a, b) =>
            Math.abs(b.contentAbove - b.contentBelow) -
            Math.abs(a.contentAbove - a.contentBelow),
        )[0];
        if (off !== undefined) {
          worstOffset = Math.max(
            worstOffset,
            Math.abs(off.contentAbove - off.contentBelow),
          );
          worst.push(describePlacement(off));
        }
        h?.cleanup();
        h = null;
      }
      lines.push(
        `--- ${where}, ${settle ? "every row answered" : "unanswered"} ---`,
        ...worst,
      );
    }
  }
  await record("chip-label-vertical-placement", [
    `the worst-centred label on each widget on BinaryRowSort, in a ${VIEWPORT.width}x${VIEWPORT.height} window:`,
    ...lines,
    `worst content offset anywhere: ${worstOffset.toFixed(1)}px, over ${measured} chips of which ${wrapped} wrapped onto two flex lines`,
  ]);

  expect(
    offCentre.length === 0
      ? ""
      : `${offCentre.length} in all: ${offCentre.slice(0, 6).join("; ")}`,
    "these buttons hold their content off centre vertically",
  ).toBe("");
  expect(
    measured,
    "no chip was located, so nothing about where its content sits was measured",
  ).toBeGreaterThanOrEqual(BINARY_ROW_FLOOR * 4);
  expect(
    wrapped,
    `only ${wrapped} chips reached two flex lines, so the one state that CAN be off centre is barely in the sweep`,
  ).toBeGreaterThanOrEqual(WRAPPED_CHIP_FLOOR);
}, 900_000);

/**
 * THE FRAME THE NEGATIVE FINDING OWES.
 *
 * "It is already centred" is as spatial a claim as "it is not", so it owes a picture too, and at
 * the surface where the reading is least obviously symmetric: the phone column, where the label
 * wraps and the tick drops onto a line of its own, answered so the ticks are painted. Framed whole
 * rather than cropped to a button, because the thing to look at is the button against the rows
 * around it.
 */
test(`a frame of the wrapped chips, answered, at ${CITY_PHONE.where}`, async () => {
  await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
  try {
    const id = "perfect-root-classify" as LessonVisualId;
    const host = await framedBoard(id, CITY_PHONE.column);
    const settled = await settleEveryRow(host);
    expect(settled, `${id}: nothing settled, so no tick is painted`).toBeGreaterThan(0);
    const placements = labelPlacements(id, host);
    await record(`chip-content-centred-${id}-phone-390x844`, [
      `${id}, a ${CITY_PHONE.column}px column in a ${PHONE_VIEWPORT.width}x${PHONE_VIEWPORT.height} viewport, ${settled} rows answered`,
      ...placements.map(describePlacement),
    ]);
    await shoot(`chip-content-centred-${id}-phone-390x844`, PHONE_VIEWPORT);
  } finally {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
  }
}, 600_000);

test("a frame of the widest board on the kind, settled, on a 390x844 phone", async () => {
  await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
  try {
    const widest = await widestBoardAt(CITY_PHONE.column, "phone");
    const host = await framedBoard(widest.id as LessonVisualId, CITY_PHONE.column);
    const settled = await settleEveryRow(host);
    expect(
      settled,
      `${widest.id}: nothing was settled, so the frame shows no marks`,
    ).toBeGreaterThan(0);
    const after = boardPressure(widest.id, host);
    await record(`phone-${widest.id}-settled-390x844`, [
      `${CITY_PHONE.where}, a ${CITY_PHONE.column}px column in a ${PHONE_VIEWPORT.width}x${PHONE_VIEWPORT.height} viewport, ${settled} rows settled`,
      describe(after),
    ]);
    await shoot(`phone-${widest.id}-settled-390x844`, PHONE_VIEWPORT);
  } finally {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
  }
}, 600_000);
