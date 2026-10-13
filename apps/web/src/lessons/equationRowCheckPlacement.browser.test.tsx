/**
 * A per-part Check button stays on the row it checks, at the right-hand end of it.
 *
 * QA photographed POL.4's `complete-square-solver` after a miss: the row reads "THE BRACKET
 * $(x + \;\square\;)^{2}$   x not yet" and the Check button has dropped to a line of its own
 * UNDERNEATH, left-aligned under the stage caption, with the note about the miss printed
 * below that again. The control that submits the row no longer looks like it belongs to it.
 *
 * The cause is arithmetic in the stylesheet rather than anything in the widget.
 * `.lesson-equation__row` declares THREE columns and every one of these boards put FOUR
 * children in the row the moment a verdict appeared: the stage, the body, the verdict, the
 * check. A grid with more children than columns opens an implicit row and puts the surplus
 * there, so the button wrapped.
 *
 * What fixed it is `.lesson-equation__aside`, a single cell holding the verdict ABOVE the
 * button, so a verdicted row has three children again and the third track stays 5.2rem in
 * every state. A fourth grid track was the other branch of that merge and is NOT in the tree:
 * `styles.css` says so where the aside is declared. Nothing below may explain itself in terms
 * of one, and this file measures the shipped arrangement rather than either account of it.
 *
 * ## The population is every board that verdicts a part in an equation row
 *
 * `complete-square-solver` is where it was photographed and it is nothing to do with D4: TEN
 * widget sources put a `.lesson-interactive__check--part` inside a `.lesson-equation__row`,
 * and every one of them adds a verdict to that row on a miss. A guard scoped to the widget
 * in the photograph would have been green over the other nine while they wrapped in exactly
 * the same way, so the population is derived from the sources that exhibit the shape.
 *
 * Real Chromium and the real stylesheet, imported LAST as `main.tsx` imports it: "did the
 * button wrap" is a question only grid layout can answer.
 */

import { afterEach, expect, test } from "vitest";

import { widgetsMatching } from "./kindFamily";
import { CITY_DESKTOP } from "./readingWidths";
import { type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * Every widget that puts a per-part Check inside an equation row, read off the sources.
 *
 * Both markers, because either alone is a different shape: a board can verdict parts in
 * `.lesson-interactive__field` rows (RAD.2's) and a board can lay an equation out in a
 * `.lesson-equation__row` with no per-part check in it at all (`log-domain-builder`).
 */
const ROW_WIDGETS = widgetsMatching(
  /lesson-interactive__check--part[\s\S]*lesson-equation__row|lesson-equation__row[\s\S]*lesson-interactive__check--part/,
);

const ROW_VISUALS: readonly LessonVisualId[] = ROW_WIDGETS.flatMap((w) => w.ids);

/** A floor under the derived population, so a glob or a rename cannot empty this file. */
const WIDGET_FLOOR = 10;

/**
 * The same population read off the VERDICT instead of the check.
 *
 * The population above is derived from the CHECK, and the file's claim is about every board
 * that verdicts a part in an equation row. Those are two different readings of the tree, and
 * the test below is what makes them one: while the sets are equal, the cheap marker names
 * exactly the boards the defect is about, and the stated population is true rather than
 * approximately true.
 *
 * Neither direction is idle. A row that verdicts a part and carries no per-part Check reaches
 * the aside with something in it and is never visited here, because the driver above finds its
 * rows by the Check. A row that carries a Check and never verdicts is the opposite: it is IN
 * the driven population and cannot be driven, since the driver waits on a wrong verdict to
 * appear, so it would be a member the `measured` floor counts on and the loop cannot deliver.
 */
const VERDICT_WIDGETS = widgetsMatching(
  /WidgetPartVerdict[\s\S]*lesson-equation__row|lesson-equation__row[\s\S]*WidgetPartVerdict/,
);

/**
 * The boards in the population whose part rows CANNOT be reached by typing at mount, each
 * with the reason, and asserted in both directions below: a listed board that becomes
 * typable at mount fails here, and an unlisted board that is not typable fails too.
 *
 * They are still in the population and still owe the property; what they do not owe is
 * evidence produced by this driver, which types into a row and presses its Check.
 */
const NO_PART_ROW_AT_MOUNT: readonly {
  id: LessonVisualId;
  why: string;
}[] = [
  {
    id: "stone-pieces-sorter",
    why: "its equation rows are rendered behind `sorted &&`, so the board has to be sorted into its bins before a part row exists to check at all",
  },
];

/** Subpixel slack on a painted box, in px. */
const PAINT_SLACK = 1;

interface PartRow {
  row: HTMLElement;
  check: HTMLButtonElement;
  live: HTMLInputElement[];
}

/** The rows of a board that carry their own Check, with whatever can be typed into them. */
function partRows(figure: HTMLElement): PartRow[] {
  return Array.from(figure.querySelectorAll<HTMLElement>(".lesson-equation__row")).flatMap(
    (row) => {
      const check = row.querySelector<HTMLButtonElement>(
        ".lesson-interactive__check--part",
      );
      if (check === null) {
        return [];
      }
      const live = Array.from(row.querySelectorAll<HTMLInputElement>("input")).filter(
        (input) => !input.readOnly && !input.disabled,
      );
      return [{ row, check, live }];
    },
  );
}

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  // The width a learner is really given in the city lesson window, not the figure content
  // cap: a wrap is a width-sensitive claim and this is the widest surface that ships, so a
  // button that wraps HERE wraps everywhere.
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

function drop() {
  h?.cleanup();
  h = null;
}

/**
 * An answer no board accepts, in whichever alphabet the box takes. The lesson boxes are all
 * plain text now that the spinner arrows have gone, so `inputMode` is what still tells a
 * numeric slot from one that grades ASCII: a numeric slot is owed the wrong NUMBER, so what
 * the row rejects is the answer rather than the entry.
 */
function junk(input: HTMLInputElement): string {
  const numeric = input.inputMode === "numeric" || input.inputMode === "decimal";
  return numeric ? "999999" : "zzzz";
}

test("a missed part keeps its Check on the row, at the right-hand end of it", async () => {
  const measured: LessonVisualId[] = [];
  const undrivable: LessonVisualId[] = [];

  for (const id of ROW_VISUALS) {
    const figure = await board(id);
    const rows = partRows(figure);
    if (rows.length === 0) {
      undrivable.push(id);
      drop();
      continue;
    }

    // A miss, however the row takes an answer: junk in whatever can be typed, then Check.
    // A row answered by PICKING has nothing to type and verdicts an empty submission as a
    // miss, which is the same wrong verdict by the route that board offers.
    const { row, check, live } = rows[0] as PartRow;
    for (const input of live) {
      setInputValue(input, junk(input));
    }
    check.click();
    await waitFor(
      () =>
        row.querySelector('.lesson-interactive__verdict[data-verdict="wrong"]') !== null,
      `${id}: the miss is verdicted on the row`,
    );

    // The button is re-rendered by the verdict, so it is re-read rather than reused.
    const after = partRows(figure).find((r) => r.row === row);
    if (after === undefined) {
      throw new Error(`${id}: the row lost its Check when the verdict landed`);
    }
    const stage = row.querySelector<HTMLElement>(".lesson-equation__stage");
    if (stage === null) {
      throw new Error(`${id}: the row has no stage caption to read its first line from`);
    }

    const line = stage.getBoundingClientRect();
    const button = after.check.getBoundingClientRect();

    // 1. ON THE ROW'S FIRST LINE. Stated as an overlap with the stage caption, which is the
    //    one child that is always in the first column of the first line.
    //
    //    Soft, here and below, so a red run names EVERY board that wraps rather than the
    //    first one visited. The defect is shared by the whole population and a sweep that
    //    stopped at `both-pans-builder` would read as one widget's problem.
    expect
      .soft(
        button.top,
        `${id}: the Check has dropped ${(button.top - line.bottom).toFixed(1)}px below the line its row is on`,
      )
      .toBeLessThan(line.bottom);
    expect
      .soft(button.bottom, `${id}: the Check is drawn above the line its row is on`)
      .toBeGreaterThan(line.top);

    // 2. AND RIGHTMOST IN IT. "Same line" alone would be satisfied by a button sitting
    //    between the equation and its verdict.
    //
    //    Among the row's CELLS, which is what "beside it" means. A cell that CONTAINS the
    //    Check is not beside it and cannot be: `.lesson-equation__aside` holds the verdict
    //    above the button, so its right edge is the verdict's and `check.left >= aside.right`
    //    is unsatisfiable by construction — it reported all seven wrapped boards as wrong
    //    while every one of them drew the button in the row's last column. Skipping the
    //    ancestor takes nothing off the claim: a Check that wraps into column one still
    //    starts left of the stage and the body, and a verdict that is a DIRECT child sitting
    //    to the button's right still fails here, which is the case this was written for.
    for (const other of Array.from(row.children)) {
      if (other === after.check || other.contains(after.check)) {
        continue;
      }
      const box = other.getBoundingClientRect();
      expect
        .soft(
          button.left,
          `${id}: the Check starts ${(box.right - button.left).toFixed(1)}px left of the "${(other.textContent ?? "").trim().slice(0, 20)}" beside it, so it is not the last thing in the row`,
        )
        .toBeGreaterThanOrEqual(box.right - PAINT_SLACK);
    }

    measured.push(id);
    drop();
  }

  // The exception list, both ways. Without the second direction a board that stopped
  // showing a part row would quietly leave the sweep; without the first, a stale entry
  // would sit here excusing nothing.
  const excused = NO_PART_ROW_AT_MOUNT.map((e) => e.id);
  expect(
    undrivable.filter((id) => !excused.includes(id)),
    "a board in the population shows no part row at mount and is not a declared exception",
  ).toEqual([]);
  expect(
    excused.filter((id) => !undrivable.includes(id)),
    "a declared exception does show a part row at mount after all, so its entry excuses nothing",
  ).toEqual([]);

  // Floors. Every assertion above is inside a loop, and all of them hold over an empty one.
  expect(
    ROW_WIDGETS.length,
    "the derived population found fewer widgets than the tree has",
  ).toBeGreaterThanOrEqual(WIDGET_FLOOR);
  expect(
    measured.length,
    `no board was driven to a miss, so nothing was measured (population ${ROW_VISUALS.length}, undrivable ${undrivable.length})`,
  ).toBeGreaterThanOrEqual(ROW_VISUALS.length - NO_PART_ROW_AT_MOUNT.length);
  expect(
    measured,
    "the board the defect was photographed on was not among those measured",
  ).toContain("complete-square-solver");
});

test("no equation row can show a verdict without a Check to sit beside it", () => {
  const withCheck = ROW_WIDGETS.map((w) => w.path).sort();
  const withVerdict = VERDICT_WIDGETS.map((w) => w.path).sort();

  // Set equality, which fails whichever way the two come apart, and each way costs the test
  // above something different: coverage in the first direction, drivability in the second.
  expect(
    withVerdict.filter((path) => !withCheck.includes(path)),
    "this row verdicts a part and has no per-part Check, so the sweep above never visits it and its verdict sits in an aside nothing measures",
  ).toEqual([]);
  expect(
    withCheck.filter((path) => !withVerdict.includes(path)),
    "this row carries a per-part Check and never verdicts, so the sweep above counts it in the population and can never drive it to the state it measures",
  ).toEqual([]);

  // A floor, because two set differences over two empty lists are equal and mean nothing.
  expect(
    withVerdict.length,
    "no widget was found verdicting a part in an equation row",
  ).toBeGreaterThanOrEqual(WIDGET_FLOOR);
});
