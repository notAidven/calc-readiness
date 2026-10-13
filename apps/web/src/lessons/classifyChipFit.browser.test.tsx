/**
 * A button a learner has to READ has to hold its own label.
 *
 * The `.lesson-classify__*` family draws a row per question: the thing being classified, then
 * the two or three calls on offer as chips. Every row used to be its own grid, so the only thing
 * that kept the rows aligned with each other was a HARDCODED set of rem column tracks, and six
 * widget-specific modifiers existed purely to widen those numbers when a label outgrew them.
 * The chips were `white-space: nowrap` inside those fixed tracks, which is the pair that
 * produces the defect: nowrap text in a box too small for it is not clipped by the button, it is
 * PAINTED OUTSIDE it, centred, spilling equally past both ends of the rounded border.
 *
 * On RAD.1 (`perfect-root-classify`) that put "Comes out whole" across the radical it was
 * classifying, so `\sqrt{81}` read as `\sqrt{8}` with a word on top of it: 130px of label in a
 * 62px box, 13px of it landing on the expression cell. On RAD.2 (`rationalize-explore`)
 * "Different value" needed 112.5px and had 78px, so it hung out of both ends of its chip.
 *
 * ## What is asserted, and why not "fits on one line"
 *
 * The obvious claim — the label fits the button on ONE line — is not the claim, because it is
 * not the requirement and it is not stable. A board whose expression column is genuinely wide
 * (`compound-band-sorter` carries a compound inequality) is CORRECT to wrap a long label onto a
 * second line at a 460px card, and whether any given label crosses that boundary depends on
 * which `system-ui` fallback the machine resolved: `answerPlaceholderFit.browser.test.tsx`
 * measured a 19% spread across plausible fallbacks, which is wider than the margin here.
 *
 * So every claim below is font-independent, comparing a painted quantity against a box that was
 * itself sized from that same paint:
 *
 *  - FIT. Every line the browser actually laid out fits inside the chip's content box. True
 *    whether the label takes one line or two, and false exactly when text is painted outside
 *    the button. This is the RAD.1 and RAD.2 defect.
 *  - WRAP, NOT TRUNCATE. Nothing clips, and every chip's longest WORD fits its content box, so
 *    reflowing is always sufficient. A phone may make a button taller; it may not cut a word.
 *  - NO COVERING. The expression cell is not overlapped by the first chip, as a box and as
 *    painted text. This is the half of the RAD.1 report that no width assertion catches: the
 *    chip's own box was innocent there, and its text was over the radical.
 *  - ONE GRID. Within a board, every row's Nth chip has the same left edge and the same width.
 *    This is the root cause stated directly. Rows that are separate grids can only be aligned by
 *    somebody hardcoding equal tracks, and that hardcoding is what kept clipping labels; rows
 *    that share the board's columns are aligned by construction and cannot drift.
 *  - A ROW IS A ROW. The options are drawn ACROSS the row rather than stacked down it, and at
 *    the wide width the thing being classified sits beside them. Added last, and the reason is
 *    the four claims above it: every one of them was green over `geo-paving-classify`, whose
 *    cells were all in a single narrow column. A chip alone in a column fits it perfectly. See
 *    the test for what makes that shape invisible to the rest of the file.
 *
 * The population is DERIVED — every visual any lesson pack places, mounted, kept if it draws a
 * classify row — because "widen the rem number on the widget that was reported" is exactly how
 * this defect kept coming back. Deriving it also found two boards the report never mentioned:
 * `exp-decay-classify` and `log-domain-classify`.
 *
 * ## And over the board a learner has PLAYED, not only the one they arrive at
 *
 * Deriving the population correctly still left half the surface unmeasured, because every sweep
 * mounted a board and measured it on the spot. A board is wider once its rows are answered, in
 * two ways that have nothing to do with each other: a row can write its call out where it only
 * posed it (`8 \le w \le 21` becomes `8 \le w \le 21 \rightarrow [8, 21]`), and every settled
 * option gains a tick or a cross beside its label. Neither had ever been on screen in front of
 * an assertion. Answering the boards first found four of the twelve overflowing at the phone
 * width, by 8 to 35px, three of which are fixed here and the fourth pinned below.
 *
 * This is the same population, measured in its other state, so it makes the same four claims
 * rather than a new one.
 *
 * Real Chromium, because every number here is layout, and the real stylesheet, because the
 * tracks, the padding and the font all live in `styles.css`.
 *
 * And every reading is taken behind a TYPESETTING BARRIER, which the file did without until now.
 * See `typesetIn` for what that is worth, which is less than it sounds: measured, it changes
 * nothing about today's numbers.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { allLessons } from "./domains";
import { visualsBuiltOn } from "./kindFamily";
import { CITY_PHONE, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

/**
 * A desktop viewport, so a host set to 460px really is 460px wide. The browser default is a
 * 414px phone, which would silently narrow the widest measurement in the file.
 */
beforeAll(async () => {
  await page.viewport(1440, 900);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * Sub-pixel slack, in px.
 *
 * Every comparison here puts a canvas or Range measurement beside a layout box that was sized
 * from the same content, so the two agree to within rounding and an exact-equality boundary is a
 * coin toss rather than a claim. It is deliberately one pixel: the defect this file exists for
 * was measured in tens of px, so nothing real hides under it.
 */
const SLACK = 1;

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
  await typesetIn(host, id);
  return host;
}

/**
 * Wait until every piece of math on the board has actually been set.
 *
 * WHAT THIS IS WORTH, MEASURED RATHER THAN ARGUED, because the argument for it is much better
 * than the evidence and it would be easy to leave the argument standing here. Every number in
 * this file is a measurement, and the only barrier was `figure.lesson-visual`, which is in the
 * DOM before `svgKit`'s `useEffect` has called `katex.render`. So the file could in principle
 * read a board whose expressions were still empty spans — and since every claim here is an
 * ABSENCE, of a clipped chip or an overflowing row, it would report that as green rather than
 * as flake.
 *
 * In principle. Probed at this tip over all 26 classify boards at the 460px cap, taking every
 * reading the sweep takes both before and after this call, **0 of 788 measurements move, worst
 * 0.0px**. The race is real and it is not being lost: `waitFor` polls on a timer, so its first
 * poll already lands after the effect has run, and `document.fonts.ready` has resolved before
 * the first board mounts. So this corrects no reading in the file today, and nothing here was
 * ever hiding behind it. It removes the file's reliance on a poll interval outlasting an effect,
 * which is worth having and is the whole of the claim.
 *
 * The same helper `classifyNumericCallOrder` uses: `data-latex` is on the element from first
 * render, so nothing about the DOM says which picture you are looking at, and `.katex` inside it
 * is KaTeX having run. Zero nodes is a pass, because a board with no math has nothing to wait for.
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

/** The width the browser would paint `text` at, in the font the element actually resolved. */
function paintedWidth(el: HTMLElement, text: string): number {
  const style = getComputedStyle(el);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d context to measure text with");
  }
  // Built from the resolved longhands rather than `style.font`, which some engines leave
  // empty when the shorthand was never authored.
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText(text).width;
}

/** The space inside the borders and padding: what the label actually gets. */
function contentWidth(el: HTMLElement): number {
  const style = getComputedStyle(el);
  return (
    el.getBoundingClientRect().width -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight) -
    Number.parseFloat(style.borderLeftWidth) -
    Number.parseFloat(style.borderRightWidth)
  );
}

/** The rectangles the element's text was really painted into, one entry per line box. */
function lineBoxes(el: HTMLElement): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
  // Grouped by line rather than taken as given: a run split across two boxes on one line would
  // otherwise read as two short lines and hide an overflow.
  const lines = new Map<number, DOMRect[]>();
  for (const rect of rects) {
    const key = Math.round(rect.top);
    lines.set(key, [...(lines.get(key) ?? []), rect]);
  }
  return Array.from(lines.values()).map((group) => {
    const left = Math.min(...group.map((r) => r.left));
    const right = Math.max(...group.map((r) => r.right));
    const top = Math.min(...group.map((r) => r.top));
    const bottom = Math.max(...group.map((r) => r.bottom));
    return new DOMRect(left, top, right - left, bottom - top);
  });
}

/** Where the element's text is painted, as one box around every line of it. */
function paintedTextBox(el: HTMLElement): DOMRect | null {
  const lines = lineBoxes(el);
  if (lines.length === 0) {
    return null;
  }
  const left = Math.min(...lines.map((r) => r.left));
  const right = Math.max(...lines.map((r) => r.right));
  const top = Math.min(...lines.map((r) => r.top));
  const bottom = Math.max(...lines.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

/** How many horizontal px two boxes share, counting only where they also share rows. */
function overlapPx(a: DOMRect, b: DOMRect): number {
  const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return across > 0.5 && down > 0.5 ? across : 0;
}

/** The chip's label, without the tick or cross a settled option carries. */
function chipLabel(chip: HTMLElement): string {
  const clone = chip.cloneNode(true) as HTMLElement;
  for (const mark of Array.from(clone.querySelectorAll(".lesson-classify__mark"))) {
    mark.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

interface ChipReading {
  /** Which board, which row, which button: a failure has to name the instance. */
  readonly where: string;
  readonly visual: string;
  /** Which column of the board this chip sits in. */
  readonly column: number;
  readonly available: number;
  /** The widest line the browser actually laid the label out on. */
  readonly widestLine: number;
  /** The widest single word, which is what has to fit for wrapping to be possible at all. */
  readonly word: string;
  readonly wordNeeded: number;
  /** True when the box cuts the content off rather than reflowing it. */
  readonly clipped: boolean;
  /** The chip's own border box, for the alignment claim. */
  readonly left: number;
  readonly width: number;
}

interface Spill {
  readonly where: string;
  /** How far past the figure's content edge the cell reaches. */
  readonly px: number;
}

/**
 * One row's boxes, kept whole, for the claim that a row is laid out ACROSS.
 *
 * The readings above are per chip and per board, and neither can see this: a chip alone in a
 * column of its own fits that column perfectly, spills over nothing, and lines up exactly with
 * the chip above it. Every claim in this file was true of a board whose four cells were stacked
 * vertically in one narrow column, which is what `geo-paving-classify` shipped as.
 */
interface RowGeometry {
  readonly where: string;
  readonly visual: string;
  /** The option buttons, in the order the row draws them. */
  readonly chips: DOMRect[];
  /** The thing being classified, or `null` on a row that draws none. */
  readonly eq: DOMRect | null;
}

interface Overlap {
  readonly where: string;
  /** The chip's border box over the expression cell. */
  readonly box: number;
  /** The chip's painted label over the expression cell. */
  readonly text: number;
}

interface Sweep {
  readonly visuals: string[];
  readonly chips: ChipReading[];
  readonly rows: RowGeometry[];
  readonly overlaps: Overlap[];
  readonly spills: Spill[];
  /** How many rows were actually answered, when the sweep was asked to answer them. */
  readonly settled: number;
  /** Boards that drew a row with no options on it at all, by id, once per row. */
  readonly chipless: string[];
}

/**
 * A row with nothing left to tap.
 *
 * Stated as the ABSENCE of an open option rather than as "every chip is disabled", because the
 * boards settle a row in two different ways and only one of them leaves chips behind:
 * `log-domain-classify` disables both of its options, while `like-terms-classify` REPLACES them
 * with a `.lesson-classify__outcome`. Read the disabled way, a row of the second kind is never
 * settled and never answerable either, so `like-terms-classify` and `rationalize-explore`
 * silently contributed nothing to the sweep that was meant to cover them.
 */
function isSettled(row: HTMLElement): boolean {
  return row.querySelector(".lesson-interactive__chip:not(:disabled)") === null;
}

function settledRows(host: HTMLElement): number {
  return Array.from(host.querySelectorAll<HTMLElement>(".lesson-classify__row")).filter(
    isSettled,
  ).length;
}

/**
 * Answer ONE row, trying its options in turn until one of them takes.
 *
 * The boards disagree about what a tap does, and the disagreement is the reason this tries more
 * than one: most lock the row whichever option was taken, but `rational-divide-dose-sorter` and
 * `rational-nested-dose-sorter` lock only on the RIGHT one and answer a wrong tap with a
 * sentence. Clicking only the first option therefore answered whichever of their five rows
 * happened to be right-first, which was one of them.
 */
async function answerRow(host: HTMLElement, at: number, id: string): Promise<boolean> {
  const rowAt = (): HTMLElement | undefined =>
    Array.from(host.querySelectorAll<HTMLElement>(".lesson-classify__row"))[at];
  for (let option = 0; option < 4; option += 1) {
    const row = rowAt();
    if (row === undefined) {
      return false;
    }
    if (isSettled(row)) {
      return true;
    }
    const open = Array.from(
      row.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip:not(:disabled)"),
    );
    const chip = open[option];
    if (chip === undefined) {
      return false;
    }
    chip.click();
    // Returns the moment the row locks, so the budget below is only ever spent on a tap that
    // was refused.
    await waitFor(
      () => {
        const now = rowAt();
        return now !== undefined && isSettled(now);
      },
      `${id} row ${at + 1} settles`,
      600,
    ).catch(() => {});
  }
  const last = rowAt();
  return last !== undefined && isSettled(last);
}

/**
 * Answer every row on the board, and report how many taps took.
 *
 * A settled row is a DIFFERENT WIDTH from the row that preceded it, which is the whole reason
 * this exists: a call can be written out where it was only posed (`8 \le w \le 21` becomes
 * `8 \le w \le 21 \rightarrow [8, 21]`), and it gains the tick or cross the option carries. Both
 * make the board wider, and mounting and measuring — all the sweep used to do — never saw
 * either.
 *
 * Counted as the RISE in settled rows, not as the total, so a row that had nothing to answer in
 * the first place cannot inflate the floor that says this pass did some work.
 */
async function settleBoard(host: HTMLElement, id: string): Promise<number> {
  const rows = host.querySelectorAll(".lesson-classify__row").length;
  const before = settledRows(host);
  for (let at = 0; at < rows; at += 1) {
    await answerRow(host, at, id);
  }
  return settledRows(host) - before;
}

/** The box a figure's contents have to stay inside: its border box, less its own padding. */
function figureBounds(host: HTMLElement): DOMRect {
  const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
  if (figure === null) {
    throw new Error("no figure to measure against");
  }
  const style = getComputedStyle(figure);
  const box = figure.getBoundingClientRect();
  const left = box.left + Number.parseFloat(style.paddingLeft);
  const right = box.right - Number.parseFloat(style.paddingRight);
  return new DOMRect(left, box.top, right - left, box.height);
}

/**
 * Mount every placed visual at `width` and measure the classify rows any of them draw.
 *
 * `answer` runs the same measurements over the board once every row on it has been called, which
 * is a different set of boxes and not a re-run of the same one.
 */
async function sweep(width: number, answer = false): Promise<Sweep> {
  const visuals: string[] = [];
  const chips: ChipReading[] = [];
  const rowBoxes: RowGeometry[] = [];
  const overlaps: Overlap[] = [];
  const spills: Spill[] = [];
  const chipless: string[] = [];
  let settled = 0;

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id, width);
    if (host.querySelectorAll(".lesson-classify__row").length === 0) {
      h?.cleanup();
      h = null;
      continue;
    }
    if (answer) {
      settled += await settleBoard(host, id);
      // Again after the taps, because answering a row brings NEW math onto the board that the
      // mount-time barrier above never saw: a settled row may write its call out, and the boards
      // that swap their options for a `.lesson-classify__outcome` replace one box with another.
      // Same standing as the call above — it moves no number today.
      await typesetIn(host, `${id} answered`);
    }
    const rows = Array.from(host.querySelectorAll<HTMLElement>(".lesson-classify__row"));
    if (rows.length === 0) {
      h?.cleanup();
      h = null;
      continue;
    }
    visuals.push(id);
    const bounds = figureBounds(host);

    rows.forEach((row, at) => {
      const rowChips = Array.from(
        row.querySelectorAll<HTMLElement>(".lesson-interactive__chip"),
      );
      if (rowChips.length === 0) {
        chipless.push(id);
      }
      rowChips.forEach((chip, column) => {
        const label = chipLabel(chip);
        const words = label.split(" ").filter((w) => w.length > 0);
        const widest = words.reduce(
          (longest, word) =>
            paintedWidth(chip, word) > paintedWidth(chip, longest) ? word : longest,
          words[0] ?? label,
        );
        const lines = lineBoxes(chip);
        const box = chip.getBoundingClientRect();
        chips.push({
          where: `${id} row ${at + 1} "${label}"`,
          visual: id,
          column,
          available: contentWidth(chip),
          widestLine: lines.length === 0 ? 0 : Math.max(...lines.map((r) => r.width)),
          word: widest,
          wordNeeded: paintedWidth(chip, widest),
          clipped: chip.scrollWidth > chip.clientWidth + SLACK,
          left: box.left,
          width: box.width,
        });
      });

      // Every cell of the row, so a track that cannot shrink is caught pushing the last column
      // off the card rather than being reported as a chip that fits its own box perfectly.
      for (const cell of Array.from(row.children) as HTMLElement[]) {
        const box = cell.getBoundingClientRect();
        const past = Math.max(bounds.left - box.left, box.right - bounds.right);
        if (past > SLACK) {
          spills.push({
            where: `${id} row ${at + 1} ${cell.className.split(" ").pop() ?? cell.tagName}`,
            px: past,
          });
        }
      }

      const eq = row.querySelector<HTMLElement>(".lesson-interactive__step-eq");

      rowBoxes.push({
        where: `${id} row ${at + 1}`,
        visual: id,
        chips: rowChips.map((chip) => chip.getBoundingClientRect()),
        eq: eq === null ? null : eq.getBoundingClientRect(),
      });

      const first = rowChips[0];
      if (eq && first) {
        const eqBox = eq.getBoundingClientRect();
        const text = paintedTextBox(first);
        overlaps.push({
          where: `${id} row ${at + 1}: "${chipLabel(first)}" over the expression cell`,
          box: overlapPx(eqBox, first.getBoundingClientRect()),
          text: text === null ? 0 : overlapPx(eqBox, text),
        });
      }
    });

    h?.cleanup();
    h = null;
  }

  return { visuals, chips, rows: rowBoxes, overlaps, spills, settled, chipless };
}

/**
 * Floors, not counts, and every one of them is load-bearing: each assertion below is an ABSENCE
 * (nothing painted outside its box, nothing clipped, nothing overlapping, nothing misaligned)
 * and an absence holds trivially over an empty sweep. A run that mounted no classify board at
 * all would otherwise report green while proving the exact opposite.
 *
 * Twenty-six placed visuals draw classify rows today, one per source file: 101 rows carrying 229
 * chips, 170 of which share a column with a chip above them. The floors sit at or just under the
 * observed numbers, so DELETING a classify board from a lesson pack is a decision somebody has
 * to make on purpose, while adding one needs no edit here.
 *
 * The numbers moved twice at once when LIN.5's `abs-count-classify` migrated onto the board grid
 * (+1 visual, +4 rows, +12 chips, +9 aligned pairs), and that migration is also what exposed how
 * far the rest had drifted: the D5 rational boards had joined the sweep without an edit here, as
 * intended, so the floors were already two boards and 26 chips below what was being measured. A
 * floor that low still catches a run that mounts nothing, which is what it is for, but it had
 * stopped catching a board leaving. They are set AT the observed counts rather than under them
 * for that reason — every count here is of elements rather than of paint, so none of it turns on
 * which font the machine resolved, and there is no margin to buy.
 *
 * They moved again for D9 (TRG.1-TRG.7), which builds six more boards on `BinaryRowSort`, and
 * again for D6, which builds two more on the kind and three of its own. Both blocks joined the
 * sweep with no edit here, exactly as the D5 boards did, so re-measuring the floors is what
 * keeps the numbers describing the population rather than a snapshot of it two eras ago.
 *
 * The numbers below are COUNTED on the merged tree rather than added up from the two lanes:
 * D9's branch recorded 21/180/82/134 and D6's still had the pre-D9 15/128/56/94, and neither is
 * a true statement about the tree they merged into.
 */
const VISUAL_FLOOR = 26;
const CHIP_FLOOR = 229;
const ROW_FLOOR = 101;
const ALIGNED_PAIR_FLOOR = 170;

/**
 * The boards built on the shared `BinaryRowSort` kind.
 *
 * Named only so the floors above can assert the SHAPE of the population and not just its size:
 * a floor of twenty-one is satisfied by one archetype plus twenty of anything, and the mechanic
 * here is reimplemented in bespoke widgets that share no line of layout code with the kind. So
 * the sweep asserts that the population with these removed is itself at least `BESPOKE_FLOOR`,
 * which puts "this really does reach the widgets that copied the mechanic" somewhere it can fail.
 *
 * `abs-count-classify` is the eleventh bespoke board, and it is the case the composition floor
 * was written for: it borrows the board's columns from the stylesheet without importing a line of
 * the kind, so it is exactly a widget the shared-kind sweeps cannot see.
 *
 * D9's six sorters are the reason this list is not four, and they are also why the composition
 * floor earns its keep here: they arrived as a block on ONE archetype, so a sweep reading only
 * its own size would have recorded the population growing by 40% while the share of it that is
 * bespoke stood still at eleven. D6 then added two more on the kind and three of its own, so the
 * list is twelve and `BESPOKE_FLOOR` moves to fourteen — the first time since it was written
 * that a bespoke board has joined, and the only reason it moves at all.
 */
const SHARED_KIND_BOARDS: readonly string[] = [
  "perfect-root-classify",
  "compound-band-sorter",
  "tolerance-pass-sorter",
  "perfect-square-sorter",
  // D6's two, which is what the equality below is for: they were built on the kind and would
  // otherwise have gone on being counted as bespoke, inflating the composition floor with two
  // boards that share every line of the kind's layout code.
  "function-mapping-classify",
  "inverse-one-to-one-classify",
  // D9's six, which arrived as a block on this one archetype.
  "trg-coterminal-sorter",
  "trg-quadrant-sorter",
  "trg-evenodd-sorter",
  "trg-window-sorter",
  "trg-secant-sorter",
  "trg-compose-sorter",
  // D4's Early Modern pair, built on the kind for the same reason: each is one call repeated over
  // four rows, and the calls are the same two under every row. POL.5's board joins them from the
  // Industrial era on the same reasoning, which is why the list grows without `BESPOKE_FLOOR`
  // moving: a board built on the kind adds nothing to the bespoke population the floor counts.
  "end-behavior-parity-sorter",
  "multiplicity-cross-sorter",
  "parabola-opening-sorter",
];
const BESPOKE_FLOOR = 14;

/**
 * The list above is the thing the composition floor is measured against, so the list being
 * WRONG is the one way that floor can read green over the wrong population. A floor constrains
 * size, not shape, and subtracting a written-down set from a derived one lets the shape drift in
 * both directions without a single assertion moving:
 *
 *  - a board that is deleted or renamed stays pinned here forever. Subtracting an id that no
 *    longer mounts is a no-op, so the bespoke count is unchanged and the floor still passes,
 *    while the list has quietly stopped describing anything.
 *  - a bespoke board that MIGRATES onto the kind keeps its id, keeps appearing in the sweep, and
 *    keeps being counted as bespoke because it is not in the list. The bespoke count can then
 *    rise while the population it is claiming about has shrunk, which is the failure the floor
 *    was added to rule out, passing more comfortably the more wrong it gets.
 *
 * So the list is asserted against the tree rather than trusted, as one equality that fails
 * whichever way the two come apart, in the shape `answerFormat.test.ts` uses for its census.
 * `visualsBuiltOn` reads the import from each widget's own source, so this is the same question
 * the sweep is asking, answered from the sources instead of from here.
 */
test("the shared-kind list is the set the tree actually builds on BinaryRowSort", () => {
  const derived = visualsBuiltOn("BinaryRowSort");
  expect(
    derived.length,
    "no widget is built on BinaryRowSort at all",
  ).toBeGreaterThanOrEqual(SHARED_KIND_BOARDS.length);
  expect(
    [...derived].sort(),
    "the pinned shared-kind boards and the widgets built on the kind have come apart, so the bespoke floor is measuring the wrong population",
  ).toEqual([...SHARED_KIND_BOARDS].sort());
});

/** The floors every sweep owes, whatever else it is asserting. */
function expectPopulation(visuals: readonly string[], chips: readonly unknown[]): void {
  expect(visuals.length, "no lesson places a classify board").toBeGreaterThanOrEqual(
    VISUAL_FLOOR,
  );
  expect(
    chips.length,
    "the classify boards drew no chips to measure",
  ).toBeGreaterThanOrEqual(CHIP_FLOOR);
  expect(
    visuals.filter((id) => !SHARED_KIND_BOARDS.includes(id)).length,
    "the sweep reached no classify board outside the shared BinaryRowSort kind, so it is only measuring one archetype",
  ).toBeGreaterThanOrEqual(BESPOKE_FLOOR);
}

/** Everything that must hold at both widths, so neither surface can regress on its own. */
const WIDTHS: readonly (readonly [string, number])[] = [
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
  [CITY_PHONE.where, CITY_PHONE.inside],
];

test.each(WIDTHS)(
  "every classify chip label fits its own button at %s",
  async (_at, width) => {
    const { visuals, chips, spills } = await sweep(width);

    // Making every column wide enough for its content is only half the promise: a column that
    // CANNOT shrink (the expression cell is typeset math, which does not wrap) pushes the last
    // option off the card instead, which reads as a missing button rather than a clipped one.
    expect(
      spills.map((s) => `${s.where} reaches ${s.px.toFixed(1)}px past the card`).join("; "),
      `at ${width}px these cells are outside the figure that has to hold them`,
    ).toBe("");

    // THE DEFECT. Not "the label fits on one line" (see the header) but "every line the browser
    // laid out is inside the button", which is false exactly when text is painted outside it.
    const outside = chips.filter((c) => c.widestLine > c.available + SLACK);
    expect(
      outside
        .map(
          (c) =>
            `${c.where} paints a ${c.widestLine.toFixed(1)}px line in a ${c.available.toFixed(1)}px box`,
        )
        .join("; "),
      `at ${width}px these labels are painted outside the button drawn around them`,
    ).toBe("");

    // A chip may get TALLER. It may not cut its content off.
    expect(
      chips
        .filter((c) => c.clipped)
        .map((c) => c.where)
        .join("; "),
      `at ${width}px these chips clip their content instead of reflowing it`,
    ).toBe("");

    // Wrapping can only rescue a label whose longest WORD fits, so this is the floor the track
    // sizing has to respect: `min-content` on every column is what keeps it true.
    const unwrappable = chips.filter((c) => c.wordNeeded > c.available + SLACK);
    expect(
      unwrappable
        .map(
          (c) =>
            `${c.where}: "${c.word}" needs ${c.wordNeeded.toFixed(1)}px in ${c.available.toFixed(1)}px`,
        )
        .join("; "),
      `at ${width}px no amount of wrapping fits these words in the chip`,
    ).toBe("");

    expectPopulation(visuals, chips);
  },
  30_000,
);

test.each(WIDTHS)(
  "no classify chip covers the expression it classifies at %s",
  async (_at, width) => {
    const { visuals, overlaps } = await sweep(width);

    expect(
      overlaps
        .filter((o) => o.box > 0)
        .map((o) => `${o.where} by ${o.box.toFixed(1)}px`)
        .join("; "),
      `at ${width}px the first chip's box sits on top of the expression cell`,
    ).toBe("");

    // THE RAD.1 REPORT. The box above was innocent there: it was the chip's TEXT, painted
    // outside its own border, that landed on the radical and turned `\sqrt{81}` into `\sqrt{8}`.
    expect(
      overlaps
        .filter((o) => o.text > 0)
        .map((o) => `${o.where} by ${o.text.toFixed(1)}px`)
        .join("; "),
      `at ${width}px the first chip's painted label sits on top of the expression cell`,
    ).toBe("");

    expect(
      overlaps.length,
      "no classify row drew an expression cell",
    ).toBeGreaterThanOrEqual(ROW_FLOOR);
    expect(visuals.length, "no lesson places a classify board").toBeGreaterThanOrEqual(
      VISUAL_FLOOR,
    );
    expect(
      visuals.filter((id) => !SHARED_KIND_BOARDS.includes(id)).length,
      "the sweep reached no classify board outside the shared BinaryRowSort kind, so it is only measuring one archetype",
    ).toBeGreaterThanOrEqual(BESPOKE_FLOOR);
  },
);

/** How many pixels of shared height make two boxes "on the same line". */
function sharedHeight(a: DOMRect, b: DOMRect): number {
  return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
}

/**
 * A ROW IS A ROW.
 *
 * Every claim above it is per CHIP or per BOARD, and none of them can see the defect this one
 * exists for: `geo-paving-classify` drew its four cells stacked in a single narrow column, one
 * word of "Slabs to pave the whole court" per line with the three calls underneath, and each of
 * those chips fitted its own column perfectly, spilled over nothing, covered nothing, and lined
 * up exactly with the chip above it. Four green claims over a board nobody could read.
 *
 * The cause is that `.lesson-classify__row` is `grid-template-columns: subgrid`, which resolves
 * to `none` when the element is not a grid item — so a board that never mounts the
 * `.lesson-classify` grid to borrow columns from auto-places every cell into one. That failure
 * mode leaves no trace in the DOM: the classes are all present and correct.
 */
test.each(WIDTHS)(
  "every classify row draws its options across it at %s",
  async (_at, width) => {
    const { visuals, chips, rows } = await sweep(width);

    const stacked = rows.flatMap((row) =>
      row.chips.flatMap((box, at) => {
        const before = row.chips[at - 1];
        if (before === undefined || sharedHeight(box, before) > SLACK) {
          return [];
        }
        return [
          `${row.where} option ${at + 1} sits ${(box.top - before.bottom).toFixed(1)}px below option ${at}`,
        ];
      }),
    );
    expect(
      stacked.join("; "),
      `at ${width}px these options are stacked down the board instead of drawn across the row`,
    ).toBe("");

    // Beside "on the same line", which two boxes sharing a line satisfy in either order. A row
    // that laid its calls out right to left would read as a different board.
    const reversed = rows.flatMap((row) =>
      row.chips.flatMap((box, at) => {
        const before = row.chips[at - 1];
        return before === undefined || box.left > before.left
          ? []
          : [`${row.where} option ${at + 1} starts left of option ${at}`];
      }),
    );
    expect(reversed.join("; "), `at ${width}px these options run backwards`).toBe("");

    expectPopulation(visuals, chips);
    // A floor under an ABSENCE, and specifically under the rows that COULD exhibit it: a row with
    // one option cannot be stacked, so counting rows would let the claim pass over a board that
    // had lost its options entirely.
    expect(
      rows.filter((row) => row.chips.length > 1).length,
      "no classify row drew two options to compare",
    ).toBeGreaterThanOrEqual(ROW_FLOOR);
  },
);

/**
 * And the thing being classified sits beside the calls, not above them — at the WIDE width only.
 *
 * On a card under 380px this is deliberately false: `@container widget (max-width: 380px)` in
 * `styles.css` gives the expression its own line, because a typeset expression does not wrap and
 * three calls beside it were pushing the last one off a phone. So the exclusion is asserted in
 * BOTH directions rather than written into a comment and trusted — the wide width fails if the
 * expression climbs above the calls, and the phone width fails if it does not, which is what
 * stops the container rule from silently ceasing to apply and leaving this claim excusing a
 * layout nobody chose.
 */
test(`the classified expression sits beside its options at the ${FIGURE_CONTENT_CAP}px figure content cap`, async () => {
  const { visuals, chips, rows } = await sweep(FIGURE_CONTENT_CAP);

  const above = rows.flatMap((row) => {
    const first = row.chips[0];
    if (row.eq === null || first === undefined || sharedHeight(row.eq, first) > SLACK) {
      return [];
    }
    return [
      `${row.where}: the expression ends ${(first.top - row.eq.bottom).toFixed(1)}px above its first option`,
    ];
  });
  expect(
    above.join("; "),
    `at ${FIGURE_CONTENT_CAP}px these rows push what is being classified onto its own line, which is the phone layout`,
  ).toBe("");

  expectPopulation(visuals, chips);
  expect(
    rows.filter((row) => row.eq !== null && row.chips.length > 0).length,
    "no classify row drew both an expression and an option",
  ).toBeGreaterThanOrEqual(ROW_FLOOR);
});

test(`the classified expression takes its own line at ${CITY_PHONE.where}`, async () => {
  const { rows } = await sweep(CITY_PHONE.inside);

  const beside = rows.flatMap((row) => {
    const first = row.chips[0];
    if (row.eq === null || first === undefined || sharedHeight(row.eq, first) <= SLACK) {
      return [];
    }
    return [`${row.where}: the expression shares its line with the first option`];
  });
  expect(
    beside.join("; "),
    `at ${CITY_PHONE.inside}px the container rule that gives the expression its own line has stopped applying, so the wide-width claim above is excusing a layout nobody chose`,
  ).toBe("");

  expect(
    rows.filter((row) => row.eq !== null && row.chips.length > 0).length,
    "no classify row drew both an expression and an option",
  ).toBeGreaterThanOrEqual(ROW_FLOOR);
});

/**
 * How many rows the settled pass answers across the whole sweep.
 *
 * The floor is what stops that pass from quietly becoming a second copy of the unanswered one.
 * Every assertion it makes is an ABSENCE, so a run where no tap landed — a changed lock, a
 * renamed chip class, a board that stops disabling its options — would satisfy all of them while
 * measuring the same boxes the first pass already measured. 101 rows settle today, which is
 * every row the sweep found: a board that stops answering is one this floor reports.
 */
const SETTLED_FLOOR = 101;

/**
 * NO BOARD IS EXCUSED ANY MORE, and the empty list is the record of how that happened rather
 * than a place to put the next one.
 *
 * `rational-cursed-root-classify` was pinned here: answered, it needed 288.7px of a 280.8px
 * content box, and the note said the levers left were the board's own copy or a tighter
 * `column-gap` for every classify board, neither being a call to make inside a test. The lever
 * actually taken was neither — on a card under 380px the expression now takes its own line
 * (`@container widget`, see `styles.css`), so the calls and the glyph are the only things that
 * have to fit across and the 7.9px stopped existing.
 *
 * The pin is what reported that: it asserts in both directions, so once the board fitted it
 * failed with "delete the pin, it is excusing nothing" instead of quietly going on excusing a
 * board that no longer needed it. Kept empty rather than deleted so the both-directions loop
 * below stays wired: a future pin is one entry, and it inherits the check that it still describes
 * something.
 */
const SETTLED_OVERFLOW_PINNED: readonly string[] = [];

/**
 * The boards that ANSWER a row by taking its options away, and the chip count that leaves.
 *
 * 229 buttons are on the twenty-six fresh boards and 217 on the answered ones, because these two
 * swap both of a settled row's options for a single `.lesson-classify__outcome`. The shortfall is
 * therefore expected — but a shortfall is also exactly what a settle that quietly stopped working
 * would produce, so the two are held apart by asserting WHICH boards lose their buttons rather
 * than only how many buttons are left. Derived from the sweep and compared as an equality, so it
 * fails whichever way the list and the tree come apart: a third board adopting the pattern is
 * unlisted, and one of these two abandoning it is listed and no longer describes anything.
 */
const SETTLED_CHIP_FLOOR = 217;
const SWAPS_OPTIONS_FOR_A_VERDICT: readonly string[] = [
  "like-terms-classify",
  "rationalize-explore",
];

/**
 * THE STATE A LEARNER LOOKS AT LONGEST, which until now nothing measured.
 *
 * The sweeps above mount a board and measure it, so every number they have ever produced was
 * taken from a board on which nothing had been answered. A settled row is not the same box: it
 * can write the call out where the row only posed it, and where it does that it is the WIDER of
 * the two states. `compound-band-sorter` is the clear case — `8 \le w \le 21` becomes
 * `8 \le w \le 21 \rightarrow [8, 21]` — and a fix aimed only at the unanswered board would have
 * left the state after the tap exactly as it was, with nothing in the file able to say so.
 */
test.each(WIDTHS)(
  "a classify board still fits once every row is answered at %s",
  async (_at, width) => {
    const { visuals, chips, spills, settled, chipless } = await sweep(width, true);

    // The pin only covers the phone width, because 460px is where every board fits answered.
    const pinned = width === CITY_PHONE.inside ? SETTLED_OVERFLOW_PINNED : [];
    const spilled = (id: string): boolean =>
      spills.some((s) => s.where.startsWith(`${id} `));

    expect(
      spills
        .filter((s) => !pinned.some((id) => s.where.startsWith(`${id} `)))
        .map((s) => `${s.where} reaches ${s.px.toFixed(1)}px past the card`)
        .join("; "),
      `at ${width}px these cells are outside the figure once the rows are answered`,
    ).toBe("");

    for (const id of pinned) {
      expect(
        visuals,
        `${id} is pinned as still overflowing when answered, but no lesson places it any more: delete the pin`,
      ).toContain(id);
      expect(
        spilled(id),
        `${id} is pinned as still overflowing when answered and now fits: delete the pin, it is excusing nothing`,
      ).toBe(true);
    }

    expect(
      chips
        .filter((c) => c.widestLine > c.available + SLACK)
        .map(
          (c) =>
            `${c.where} paints a ${c.widestLine.toFixed(1)}px line in a ${c.available.toFixed(1)}px box`,
        )
        .join("; "),
      `at ${width}px these labels are painted outside their button once the rows are answered`,
    ).toBe("");

    expect(
      chips
        .filter((c) => c.clipped)
        .map((c) => c.where)
        .join("; "),
      `at ${width}px these settled chips clip their content instead of reflowing it`,
    ).toBe("");

    expect(
      chips
        .filter((c) => c.wordNeeded > c.available + SLACK)
        .map(
          (c) =>
            `${c.where}: "${c.word}" needs ${c.wordNeeded.toFixed(1)}px in ${c.available.toFixed(1)}px`,
        )
        .join("; "),
      `at ${width}px no amount of wrapping fits these words in a settled chip`,
    ).toBe("");

    expect(
      settled,
      "no row was answered, so this pass measured the unanswered board a second time",
    ).toBeGreaterThanOrEqual(SETTLED_FLOOR);

    expect(visuals.length, "no lesson places a classify board").toBeGreaterThanOrEqual(
      VISUAL_FLOOR,
    );
    expect(
      visuals.filter((id) => !SHARED_KIND_BOARDS.includes(id)).length,
      "the sweep reached no classify board outside the shared BinaryRowSort kind, so it is only measuring one archetype",
    ).toBeGreaterThanOrEqual(BESPOKE_FLOOR);
    expect(
      chips.length,
      "the answered boards drew too few chips to measure",
    ).toBeGreaterThanOrEqual(SETTLED_CHIP_FLOOR);
    expect(
      Array.from(new Set(chipless)).sort(),
      "the boards that answer a row by removing its options are not the ones this file says they are, so the settled chip floor is measuring the wrong population",
    ).toEqual([...SWAPS_OPTIONS_FOR_A_VERDICT].sort());
  },
  // Answering every row on every board is a tap and a re-render per row on top of the mount
  // sweep the other tests do, which is comfortably past the default budget for one test.
  90_000,
);

/**
 * THE ROOT CAUSE, stated as a property rather than as a stylesheet mechanism.
 *
 * Rows that are separate grids can only be made to line up by somebody writing the same track
 * widths into each of them, and hardcoding a width is what kept handing labels a box smaller
 * than their text. Rows that share the board's columns line up by construction. So this asserts
 * the alignment, which no amount of widening a rem number can fake across a whole board: it
 * fails the moment a row starts sizing its own columns again.
 */
test.each(WIDTHS)(
  "every classify board keeps one column per call at %s",
  async (_at, width) => {
    const { visuals, chips } = await sweep(width);

    const drift: string[] = [];
    let compared = 0;
    for (const visual of visuals) {
      const columns = new Map<number, ChipReading[]>();
      for (const chip of chips.filter((c) => c.visual === visual)) {
        columns.set(chip.column, [...(columns.get(chip.column) ?? []), chip]);
      }
      for (const [column, members] of columns) {
        if (members.length < 2) {
          continue;
        }
        compared += members.length - 1;
        const lefts = members.map((m) => m.left);
        const widths = members.map((m) => m.width);
        const spreadLeft = Math.max(...lefts) - Math.min(...lefts);
        const spreadWidth = Math.max(...widths) - Math.min(...widths);
        if (spreadLeft > 0.5 || spreadWidth > 0.5) {
          drift.push(
            `${visual} column ${column + 1}: left varies by ${spreadLeft.toFixed(1)}px, width by ${spreadWidth.toFixed(1)}px across ${members.length} rows`,
          );
        }
      }
    }

    expect(
      drift.join("; "),
      `at ${width}px these boards are not sharing one grid, so their rows are only aligned by whatever width each one measured for itself`,
    ).toBe("");

    // Two chips in one column is the smallest thing that CAN be misaligned, so without this the
    // sweep passes by having nothing to compare. 170 such pairs exist today.
    expect(
      compared,
      "no board had two rows in the same column to compare, so the alignment claim measured nothing",
    ).toBeGreaterThanOrEqual(ALIGNED_PAIR_FLOOR);
    expectPopulation(visuals, chips);
  },
);
