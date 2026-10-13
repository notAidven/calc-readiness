/**
 * WHERE A CLASSIFY CHIP'S WORDS AND ITS VERDICT GLYPH ARE ACTUALLY DRAWN — ON BOTH AXES.
 *
 * THIS FILE PINS A KNOWN DEFECT. IT IS NOT A GUARD OVER A FIX. The words on a classify chip are
 * not centred in the button drawn round them, four candidate fixes were measured against this tree
 * and every one was rejected, and `styles.css` carries the reasoning where the rule would have
 * gone. So what is asserted here is the measured reality, tightly enough that it fails if anything
 * moves in EITHER direction: a regression fails, and so does a fix, which then has to come and
 * delete these numbers on purpose rather than quietly slipping past a guard written to be
 * satisfied.
 *
 * The 7.40px was subsequently reviewed against that arithmetic and **accepted as it stands**,
 * because the button has no free space in it — 84 of 96 beside-chips have under 0.5px — so
 * centring the label necessarily pushes the verdict glyph out of the border or draws it over the
 * words. Every remaining lever changes the DESIGN of the indicator rather than the layout. So
 * this file is not a to-do that someone forgot to finish; it is the record of a decision.
 *
 * ## The defect has two faces, and which one a chip wears is decided per chip
 *
 * A chip's children are a bare text node and the `.lesson-classify__mark` span, and
 * `justify-content: center` centres the PAIR of them. What follows depends on whether the two fit
 * on one flex line:
 *
 *  - MARK BESIDE THE LABEL: the words sit LEFT of the button's middle by half the mark's own
 *    footprint plus half the 4px gap. On this repo's Windows Chromium that reads 7.40px while the
 *    slot is empty and 7.88px once a glyph lands in it, the extra 0.48px being half the difference
 *    between `\u2717` (11.76px) and `\u2713` (10.79px); on CI's Linux Chromium both faces read
 *    8.03px, because the font it resolves gives the two glyphs the same 12.06px advance.
 *    Vertically it is fine, 0.00px.
 *
 *    WHICH IS WHY THE HORIZONTAL CLAIM IS DERIVED PER CHIP RATHER THAN PINNED TO A NUMBER. An
 *    absolute band tight enough to be worth having on one host is red on the other, and a band
 *    widened to hold both is a band asserting less than either. What does not move between hosts
 *    is the RELATION — the displacement is exactly half the mark's measured box plus half the
 *    measured gap — and that is a stronger claim than the band was, because it is checked against
 *    each chip's own mark instead of against a window drawn round every chip at once. Measured
 *    0.0000px of error on all 379 beside-chips of a four-sweep Windows pass, and consistent with
 *    every one of CI's 283 Linux readings.
 *  - MARK ON ITS OWN LINE: where the label's own max-content exceeds the chip, flex puts the label
 *    alone on line one and the mark on line two. The words are then horizontally centred, 0.01px,
 *    and instead sit HIGH by 9.20px to 15.11px, because half a line of mark hangs below them.
 *
 * Both faces are asserted, each in its own band, and a chip is sorted between them by looking at
 * where the mark's box actually is rather than by a list somebody wrote down. Fifteen boards wear
 * the second face on every host measured, one more wears it only where the font is wider, and both
 * sets are asserted against the tree in both directions, because the sorting is derived from the
 * same layout it then judges: without that, a chip could migrate into the laxer band and take a
 * real defect with it.
 *
 * ## Why this file measures the VERTICAL axis and the row heights at all
 *
 * Because the last version of it did not, and that is exactly how it went wrong. It asserted the
 * horizontal offset only, over a population and in two paint states, with floors and a composition
 * check — and it reported green over the rejected mirror while that mirror was making buttons
 * 66.0px -> 110.0px tall and pushing labels 24.4px off the vertical middle on eight boards. A
 * guard that measures one axis of a two-axis property is the same shape of failure as a guard
 * scoped to an abstraction instead of a behaviour: correct about what it looks at, silent about
 * the rest. So the vertical offset, the chip heights and the glyph's own position are all pinned
 * here now, and the mirror is kept as the named injection that reds the vertical assertions.
 *
 * ## Every assertion was watched to fail before it was believed
 *
 * The injections, all run on this tree:
 *
 *  - ADD THE REJECTED MIRROR back (`.lesson-interactive__chip:has(.lesson-classify__mark)::before
 *    { content: "\2713"; font-size: 0.9em; line-height: 1; visibility: hidden; }`) and the
 *    horizontal bands and the vertical bands both fail, quoted in the report for this change.
 *  - ADD THE REJECTED ZERO-FOOTPRINT MARK (`width: 0; min-width: 0; margin-inline-start: -4px`)
 *    and the glyph-inside-the-border assertion fails at -3.77px on 178 chips.
 *  - PUSH THE NEGATIVE MARGIN PAST WHAT THE PADDING CAN ABSORB and the same assertion fails
 *    harder, which is the injection named for it below.
 *  - BREAK ONE ROW'S HEIGHTS (`align-self: flex-start` on a chip) and the equal-height assertion
 *    fails; the mirror does NOT red that one, because `align-self: stretch` equalises a row even
 *    while every chip in it grows, and that is worth knowing about what it does and does not buy.
 *  - RAISE ANY FLOOR past the tree and it fails at the observed count.
 *
 * And the six that were run when this file was made to hold on CI's host as well as on this one,
 * each quoted in the report for that change:
 *
 *  - THE MIRROR AGAIN, against the derived horizontal claim that replaced the 7.3-to-8.0 band: it
 *    draws every beside-chip 0.00px to 0.49px from the middle where half its mark plus half its
 *    gap owes 7.40px to 7.88px, and fails.
 *  - WIDEN THE MARK (`padding-inline: 4px` on `.lesson-classify__mark`) and the loose 5px-to-10px
 *    order-of-magnitude band fails at 11.40px WHILE THE DERIVED CLAIM STAYS GREEN, which is the
 *    evidence that the two are separate claims and not the same one written twice.
 *  - STOP THE CHIPS WRAPPING (`flex-wrap: nowrap`) and every recorded wrapper fails.
 *  - SQUEEZE THE CHIPS (`max-width: 60px`) so five unrecorded boards start wrapping, and they
 *    fail by name — `function-mapping-classify` is NOT among them, which is what shows its
 *    exemption is load-bearing rather than decorative.
 *  - RENAME AN EXEMPTION so it matches no board, and it fails as exempting nothing; PARK A BOARD
 *    THAT WRAPS EVERYWHERE (`trg-compose-sorter`) in the exemption list and it fails as no longer
 *    borderline. That pair is the both-ways assertion on the list.
 *  - CLAIM ONE BOARD IN BOTH LISTS and disjointness fails; GROW THE EXEMPTION LIST TO FOUR and the
 *    ceiling fails; DROP BOARDS FROM THE POPULATION and `BESIDE_FLOOR` fails at 32 of 111.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { allLessons } from "./domains";
import { visualsBuiltOn, visualsMatching, widgetsOwningCopy } from "./kindFamily";
import { CITY_PHONE, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** The class every chip in this population draws, and the marker the population is derived by. */
const MARK = /lesson-classify__mark/;

/** How far off a "centred" claim may be, in px. The defect this file records is 7.40px. */
const SLACK = 1;

/**
 * How far a beside-chip's label may sit from where the mark's own footprint puts it, in px.
 *
 * This is the horizontal defect, stated as the relation rather than as a reading: the words are
 * displaced by half the mark's measured box plus half the measured gap, and nothing else. A fix
 * lands at 0.00 against an owed 7.40 and fails here by the whole displacement; the rejected mirror
 * centres the label on the boards where it fits and fails here the same way.
 *
 * 0.25px because 0.0000px was observed on every beside-chip of a four-sweep pass and the only
 * headroom worth buying is against subpixel rounding, not against a layout change.
 */
const OWED_SLACK = 0.25;

/**
 * And the displacement is of the RECORDED ORDER, in px, which the relation above does not say.
 *
 * Deliberately loose, because it is a second claim and not the same one twice: `dx` tracking the
 * mark exactly is satisfied by a mark of any width at all, so a slot that grew to 100px would pass
 * the relation while drawing the words 52px off the middle of their button. This is the guard on
 * the mark itself. Both hosts sit well inside it — 7.40px and 7.88px on Windows, 8.03px and 8.04px
 * on CI's Linux — so it holds wherever the suite runs while still failing a mark that has changed
 * size rather than a font that has changed metrics.
 */
const BESIDE_MIN = 5;
const BESIDE_MAX = 10;

/**
 * The band the vertical defect sits in, for a chip whose mark took its own line. Positive is the
 * label sitting HIGH. Measured 9.20px to 15.11px; the rejected mirror reached 19.06px and 24.36px,
 * which is outside this and is meant to be.
 */
const HIGH_MIN = 9.0;
const HIGH_MAX = 15.5;

/**
 * How far inside its own border the verdict glyph's ink has to stop, in px.
 *
 * The observed floor is 8.00px, which is the chip's `padding-inline` exactly: the slot the mark
 * sits in is reserved, so the glyph never eats into the padding at all. Asserted at 4.0px rather
 * than at 8.0px because the reserved slot's width is the GLYPH's width and that moves with the
 * resolved font, while the thing worth catching does not need fine resolution — the rejected
 * zero-footprint mark put this at -3.77px, drawn straight through the border.
 */
const GLYPH_INSIDE_FLOOR = 4;

/** How unequal two chips in one row may be, in px. Measured 0.00 on every row on the tree. */
const ROW_HEIGHT_SLACK = 0.5;

let h: Harness | null = null;

/** A desktop viewport, so a host set to 460px really is 460px. The browser default is a phone. */
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

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/**
 * The derived population: every placed visual whose widget draws the mark, however it got it.
 *
 * `visualsMatching` unions the widgets whose OWN source draws the mark with the adopters of every
 * kind that draws it, because half of this population shares no line of layout code with the
 * kind. A sweep scoped to the archetype would have measured half of it.
 */
const POPULATION: readonly LessonVisualId[] = (() => {
  const live = new Set(liveVisualIds());
  return visualsMatching(MARK).filter((id) => live.has(id));
})();

const VISUAL_FLOOR = 27;
const BESPOKE_FLOOR = 12;

/**
 * THE BOARDS THAT PUT THE MARK ON ITS OWN LINE ON EVERY HOST MEASURED.
 *
 * Not an exemption list — both faces of the defect are asserted, so nothing here is excused
 * anything. It is a COMPOSITION claim, and it exists because the per-chip sorting between the two
 * bands is derived from the same layout it then judges. Asserted in both directions against the
 * tree, so a board that stops wrapping fails, and a board that starts wrapping fails unless it is
 * named in the borderline list below. Either is a real change in what a learner sees, and neither
 * should be able to land without editing one of these two lines.
 *
 * What it has caught so far is D4 arriving, twice, in two forward merges: POL.6 and POL.7's
 * `end-behavior-parity-sorter` and `multiplicity-cross-sorter`, then POL.5's
 * `parabola-opening-sorter`. All three wrap at both widths and none is excused anything — they are
 * measured inside the same bands as every other wrapped board, and are listed here only because
 * this set is asserted against the tree.
 *
 * Three boards in two merges is also the honest expectation to set: this list is edited whenever
 * somebody authors a sorter, which is a cost the claim is worth, since the alternative is a chip
 * silently changing bands and taking a real defect with it.
 */
const WRAPS_THE_MARK: readonly LessonVisualId[] = [
  "compound-band-sorter",
  "domain-restriction-classify",
  "end-behavior-parity-sorter",
  "log-domain-classify",
  "multiplicity-cross-sorter",
  "parabola-opening-sorter",
  "perfect-root-classify",
  "perfect-square-sorter",
  "piecewise-piece-classify",
  "trg-compose-sorter",
  "trg-window-sorter",
] as LessonVisualId[];

/**
 * THE BOARDS WHOSE WRAPPING TURNS ON HOW WIDE THE HOST DRAWS THEIR LABEL.
 *
 * This one IS an exemption, so it is named per entry with the reading that earned it, and it is
 * asserted in both directions below rather than being a hole the set claim quietly leaves.
 *
 *  - `function-mapping-classify`: its two calls are "A function" and "Not a function", and the
 *    longer of the two plus the mark fits on one line under this repo's Windows Chromium and does
 *    not under CI's Linux Chromium. Measured, not inferred: a four-sweep Windows pass reads 8
 *    beside and 0 wrapped for this board, and CI reads its 4 "A function" chips beside at both
 *    widths while the run's set claim reports the board as wrapping. Nothing about the board
 *    changed between the two; the font did.
 *
 * A board here is still measured inside exactly the same two bands as every other board — the
 * exemption buys it out of the composition claim and out of nothing else. What it must keep doing
 * is being BORDERLINE, and that is what stops this becoming a place to park a board and forget it:
 * an entry that has stopped drawing any chip beside its mark is no longer host-dependent, it now
 * wraps everywhere, and it belongs in `WRAPS_THE_MARK` where a board that stopped wrapping would
 * red. An entry that has left the sweep altogether fails for its own reason. Both are asserted.
 */
const WRAPS_ONLY_WHERE_THE_FONT_IS_WIDER: readonly LessonVisualId[] = [
  "function-mapping-classify",
] as LessonVisualId[];

/**
 * How many boards may be excused the composition claim on font grounds.
 *
 * A named list with reasons is only worth something while it is short: the two directions asserted
 * below stop an entry going stale, and this stops the list itself growing until it has swallowed
 * the population it was carved out of.
 */
const FONT_DEPENDENT_CEILING = 3;

interface ChipReading {
  readonly where: string;
  readonly visual: LessonVisualId;
  /** Positive when the words sit LEFT of the button's middle, which is the horizontal defect. */
  readonly dx: number;
  /** Positive when the words sit ABOVE the button's middle, which is the vertical one. */
  readonly dy: number;
  /** Whether the mark shares the label's flex line, which decides which band applies. */
  readonly beside: boolean;
  /**
   * Half the mark's own box plus half the chip's own gap: where centring the PAIR leaves the
   * words. NaN if either could not be read, which reds the assertion rather than excusing a chip
   * from it — an unreadable gap is how this comparison would otherwise pass over every chip.
   */
  readonly besideOwed: number;
  readonly marked: boolean;
  /** How far inside the border's inner edge the glyph's ink stops. NaN when there is no glyph. */
  readonly glyphToBorder: number;
}

function union(rects: readonly DOMRect[]): DOMRect | null {
  if (rects.length === 0) {
    return null;
  }
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const top = Math.min(...rects.map((r) => r.top));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * WHERE THE WORDS ARE PAINTED, which is not where the chip's contents are painted.
 *
 * The mark is excluded by node, because it is the thing whose presence moves the label and a box
 * drawn round both of them is centred by construction — it would report 0.00px however far off
 * the words are. A text child is measured with a `Range`, so what is compared is ink rather than a
 * box; an element child (`InlineMath`, on the boards that classify a numeral) is measured as its
 * own box, which is the flex item the line was laid out from.
 */
function labelInk(chip: HTMLElement): DOMRect | null {
  const rects: DOMRect[] = [];
  for (const node of Array.from(chip.childNodes)) {
    if (node instanceof HTMLElement && node.classList.contains("lesson-classify__mark")) {
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node.textContent ?? "").trim() === "") {
        continue;
      }
      const range = document.createRange();
      range.selectNode(node);
      rects.push(...Array.from(range.getClientRects()).filter((r) => r.width > 0));
    } else if (node instanceof HTMLElement) {
      const box = node.getBoundingClientRect();
      if (box.width > 0) {
        rects.push(box);
      }
    }
  }
  return union(rects);
}

/** The glyph's own ink, which is not its box: a zero-width span still paints a tick. */
function glyphInk(mark: HTMLElement): DOMRect | null {
  const range = document.createRange();
  range.selectNodeContents(mark);
  return union(Array.from(range.getClientRects()).filter((r) => r.width > 0));
}

/** The chip's label as words, with the verdict glyph taken out. */
function chipLabel(chip: HTMLElement): string {
  const clone = chip.cloneNode(true) as HTMLElement;
  for (const mark of Array.from(clone.querySelectorAll(".lesson-classify__mark"))) {
    mark.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
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
 * Answer whatever the board offers, one open option at a time.
 *
 * Driven off "is there an open chip" rather than off the classify row, because several of these
 * widgets draw the same label-plus-mark chip outside one and would otherwise contribute nothing to
 * the settled pass that exists to cover them. Bounded, so a board that hands back a fresh set on
 * every tap cannot spin here.
 */
async function settleBoard(host: HTMLElement): Promise<void> {
  for (let round = 0; round < 24; round += 1) {
    const open = Array.from(
      host.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip:not(:disabled)"),
    );
    if (open.length === 0) {
      break;
    }
    open[0]?.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 80));
}

interface Sweep {
  readonly chips: readonly ChipReading[];
  /** The worst height difference between two chips in one row, and where it was. */
  readonly rowSpread: readonly { readonly where: string; readonly spread: number }[];
}

/** Mount every board in the population at `width` and read every chip holding a mark slot. */
async function sweep(width: number, answer: boolean): Promise<Sweep> {
  const chips: ChipReading[] = [];
  const rowSpread: { where: string; spread: number }[] = [];
  for (const id of POPULATION) {
    const host = await mountVisual(id, width);
    if (answer) {
      await settleBoard(host);
    }

    for (const [index, row] of Array.from(
      host.querySelectorAll<HTMLElement>(".lesson-classify__row"),
    ).entries()) {
      const heights = Array.from(
        row.querySelectorAll<HTMLElement>(".lesson-interactive__chip"),
      ).map((chip) => chip.getBoundingClientRect().height);
      if (heights.length > 1) {
        rowSpread.push({
          where: `${id} row ${index + 1}`,
          spread: Math.max(...heights) - Math.min(...heights),
        });
      }
    }

    for (const chip of Array.from(
      host.querySelectorAll<HTMLElement>(".lesson-interactive__chip"),
    )) {
      const mark = chip.querySelector<HTMLElement>(".lesson-classify__mark");
      if (mark === null) {
        continue;
      }
      const ink = labelInk(chip);
      if (ink === null) {
        continue;
      }
      const box = chip.getBoundingClientRect();
      const markBox = mark.getBoundingClientRect();
      const glyph = (mark.textContent ?? "").trim();
      const painted = glyph === "" ? null : glyphInk(mark);
      const chipStyle = getComputedStyle(chip);
      const borderWidth = Number.parseFloat(chipStyle.borderRightWidth);
      const gap = Number.parseFloat(chipStyle.columnGap);
      const markMiddle = markBox.top + markBox.height / 2;
      chips.push({
        where: `${id} "${chipLabel(chip)}"${glyph === "" ? "" : ` ${glyph}`}`,
        visual: id,
        dx: box.left + box.width / 2 - (ink.left + ink.right) / 2,
        dy: box.top + box.height / 2 - (ink.top + ink.bottom) / 2,
        // On the label's own line when the mark's middle falls within the label's ink band.
        beside: markMiddle >= ink.top && markMiddle <= ink.bottom,
        besideOwed: (markBox.width + gap) / 2,
        marked: glyph !== "",
        glyphToBorder:
          painted === null ? Number.NaN : box.right - borderWidth - painted.right,
      });
    }
    h?.cleanup();
    h = null;
  }
  return { chips, rowSpread };
}

const WIDTHS: readonly (readonly [string, number])[] = [
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
  [CITY_PHONE.where, CITY_PHONE.inside],
];

/**
 * Floors, one per category, measured on this tree.
 *
 * Every assertion below is an ABSENCE — nothing outside its band — and an absence holds trivially
 * over an empty sweep, so without these a run where nothing mounted or no tap landed would satisfy
 * the file while measuring nothing. Each floor is set AT the lowest reading rather than under it,
 * so that losing a board becomes a decision somebody makes on purpose, while adding one needs no
 * edit here.
 *
 * Re-derived over 27 boards after four forward merges, measured at both widths in one pass:
 * beside 230 at the cap and 153 at the phone, wrapped 82 and 159, 139 chips end the settled sweep
 * painting a glyph and 178 rows hold more than one chip. They rose with D4's POL.6, POL.7 and
 * POL.5 boards, which add 48 chips to the sweep between them.
 *
 * BESIDE IS PINNED AT CI'S READING AND NOT AT THIS MACHINE'S, and that is worth the paragraph,
 * because an earlier version of this comment said the opposite — that "a count of chips and rows
 * does not turn on which font the machine resolved". It does. Which chips fit beside their mark is
 * decided by how wide the host draws the label, and the two hosts disagree by a lot: the same tree
 * reads 226 beside at the cap and 153 at the phone under this repo's Windows Chromium, and 172 and
 * 111 under CI's Linux Chromium, because the wider Linux font pushes 42 more chips at the phone
 * onto a second line. Nothing left the population between the two readings — `VISUAL_FLOOR` and
 * the bespoke set-equality both hold on CI — so those chips are still measured, in the wrapped
 * band, and the floor has to be the LOWER of the hosts or it is red on the only one that gates.
 *
 * Which also means the cap is no longer worth pinning against separately: it flaps by four chips
 * between two sweeps of one run on this machine (230 then 226), and it is the phone that reads
 * lowest on both hosts anyway.
 *
 * WRAPPED, GLYPH and ROW are untouched by any of this and stay where they were measured. The
 * wrapped count only rises under a wider font, and neither the glyph count nor the row count turns
 * on the font at all — they count chips and rows, not widths. All three were green on CI.
 */
const BESIDE_FLOOR = 111;
const WRAPPED_FLOOR = 82;
const GLYPH_FLOOR = 139;
const ROW_FLOOR = 178;

function report(
  readings: readonly ChipReading[],
  value: (r: ChipReading) => string,
): string {
  return readings.map((r) => `${r.where} ${value(r)}`).join("; ");
}

test.each(WIDTHS)(
  "a chip whose mark sits beside its label draws the words half the mark left of the middle at %s",
  async (_at, width) => {
    const fresh = await sweep(width, false);
    const settled = await sweep(width, true);
    const beside = [...fresh.chips, ...settled.chips].filter((r) => r.beside);

    expect(
      report(
        beside.filter(
          (r) =>
            !Number.isFinite(r.besideOwed) || Math.abs(r.dx - r.besideOwed) > OWED_SLACK,
        ),
        (r) =>
          `is drawn ${r.dx.toFixed(2)}px from the middle of its button where half its mark plus half its gap is ${r.besideOwed.toFixed(2)}px`,
      ),
      `at ${width}px these labels are no longer displaced by exactly the half-footprint the mark beside them reserves, which is the defect this file records. If this is a FIX, delete this test and the comment in styles.css that documents it`,
    ).toBe("");

    expect(
      report(
        beside.filter((r) => r.dx < BESIDE_MIN || r.dx > BESIDE_MAX),
        (r) => `is drawn ${r.dx.toFixed(2)}px from the middle of its button`,
      ),
      `at ${width}px the displacement is no longer of the recorded order of ${BESIDE_MIN}px to ${BESIDE_MAX}px, so the mark's own footprint has changed size rather than the host's font having changed metrics`,
    ).toBe("");

    expect(
      beside.length,
      `only ${beside.length} chips drew a mark beside their label, so this pass measured nothing`,
    ).toBeGreaterThanOrEqual(BESIDE_FLOOR);
  },
  240_000,
);

test.each(WIDTHS)(
  "a chip whose mark sits beside its label keeps the words on the vertical middle at %s",
  async (_at, width) => {
    const fresh = await sweep(width, false);
    const settled = await sweep(width, true);
    const beside = [...fresh.chips, ...settled.chips].filter((r) => r.beside);

    expect(
      report(
        beside.filter((r) => Math.abs(r.dy) > SLACK),
        (r) =>
          `sits ${Math.abs(r.dy).toFixed(2)}px ${r.dy > 0 ? "above" : "below"} the middle of its button`,
      ),
      `at ${width}px these labels are off the VERTICAL middle of a button whose mark is beside them, which is what the rejected mirror did to eight boards while a horizontal-only guard reported green`,
    ).toBe("");

    expect(
      beside.length,
      `only ${beside.length} chips drew a mark beside their label, so this pass measured nothing`,
    ).toBeGreaterThanOrEqual(BESIDE_FLOOR);
  },
  240_000,
);

test.each(WIDTHS)(
  "a chip whose mark took its own line does centre the words horizontally at %s",
  async (_at, width) => {
    const fresh = await sweep(width, false);
    const settled = await sweep(width, true);
    const wrapped = [...fresh.chips, ...settled.chips].filter((r) => !r.beside);

    expect(
      report(
        wrapped.filter((r) => Math.abs(r.dx) > SLACK),
        (r) => `is drawn ${r.dx.toFixed(2)}px from the middle of its button`,
      ),
      `at ${width}px these labels are off the HORIZONTAL middle on a chip whose mark took its own line, where the label is centred alone and should be square`,
    ).toBe("");

    expect(
      wrapped.length,
      `only ${wrapped.length} chips put the mark on its own line, so this pass measured nothing`,
    ).toBeGreaterThanOrEqual(WRAPPED_FLOOR);
  },
  240_000,
);

/**
 * Its own test rather than a second assertion beside the horizontal one, so that it can be forced
 * red on its own. Sharing a test, the first `expect` throws and the second never runs — which is
 * how a vertical claim can sit in a file for a release without once being evaluated.
 */
test.each(WIDTHS)(
  "a chip whose mark took its own line lifts the words 9.20px off the middle at %s",
  async (_at, width) => {
    const fresh = await sweep(width, false);
    const settled = await sweep(width, true);
    const wrapped = [...fresh.chips, ...settled.chips].filter((r) => !r.beside);

    expect(
      report(
        wrapped.filter((r) => r.dy < HIGH_MIN || r.dy > HIGH_MAX),
        (r) => `sits ${r.dy.toFixed(2)}px above the middle of its button`,
      ),
      `at ${width}px these labels have left the recorded band of ${HIGH_MIN}px to ${HIGH_MAX}px above the middle, which is where a mark alone on a second line puts them`,
    ).toBe("");

    expect(
      wrapped.length,
      `only ${wrapped.length} chips put the mark on its own line, so this pass measured nothing`,
    ).toBeGreaterThanOrEqual(WRAPPED_FLOOR);
  },
  240_000,
);

/**
 * THE VERDICT GLYPH IS DRAWN INSIDE THE BUTTON IT BELONGS TO.
 *
 * This is the assertion that rejected the second candidate fix, and it is the one worth keeping
 * longest: any future attempt to centre the label by taking the mark's footprint away has to get
 * past it, and none can, because the glyph is 10.79px and the room available beside the label is
 * 8px of padding plus a 1.5px border.
 */
test.each(WIDTHS)(
  "the verdict glyph is drawn inside its own button at %s",
  async (_at, width) => {
    const settled = await sweep(width, true);
    const painted = settled.chips.filter((r) => !Number.isNaN(r.glyphToBorder));

    expect(
      report(
        painted.filter((r) => r.glyphToBorder < GLYPH_INSIDE_FLOOR),
        (r) =>
          `has its glyph ${r.glyphToBorder < 0 ? `${Math.abs(r.glyphToBorder).toFixed(2)}px PAST` : `only ${r.glyphToBorder.toFixed(2)}px inside`} the inner edge of its own border`,
      ),
      `at ${width}px these glyphs are drawn on or through the button's border instead of inside it`,
    ).toBe("");

    expect(
      painted.length,
      `only ${painted.length} chips painted a glyph, so this pass measured nothing`,
    ).toBeGreaterThanOrEqual(GLYPH_FLOOR);
  },
  240_000,
);

/**
 * TWO CHIPS IN ONE ROW ARE THE SAME HEIGHT.
 *
 * `align-self: stretch` is what holds this, and it is worth an assertion because it is the shape
 * of the thing the rejected mirror got wrong. It does NOT red under the mirror, and that is the
 * point of saying so here: stretch equalises a row while every chip in it grows, so this
 * assertion and the vertical one above cover different halves of "the button changed size", and
 * only the pair of them covers it.
 */
test.each(WIDTHS)(
  "two chips in one row are the same height at %s",
  async (_at, width) => {
    const fresh = await sweep(width, false);
    const settled = await sweep(width, true);
    const rows = [...fresh.rowSpread, ...settled.rowSpread];

    expect(
      rows
        .filter((r) => r.spread > ROW_HEIGHT_SLACK)
        .map(
          (r) =>
            `${r.where} spans ${r.spread.toFixed(2)}px between its shortest and tallest chip`,
        )
        .join("; "),
      `at ${width}px these rows draw chips of different heights beside each other`,
    ).toBe("");

    expect(
      rows.length,
      `only ${rows.length} rows held more than one chip, so this pass measured nothing`,
    ).toBeGreaterThanOrEqual(ROW_FLOOR);
  },
  240_000,
);

/**
 * The population is the right SET, not merely a big enough one.
 *
 * A floor of twenty-seven is satisfied by one archetype plus fifteen of anything, and half of this
 * population is bespoke widgets that share no line of layout code with the kind. So what is
 * derived from the sources is compared against what is derived from the sources a second way, as
 * an equality that fails whichever direction the two come apart.
 *
 * The two floors moved differently across the forward merges, and the difference is the point of
 * having both: the population went 24 to 27 with D4's three new sorters, while the bespoke floor
 * stays at 12, because not one of them holds its own copy of the mark — all three adopt
 * `BinaryRowSort`, checked in their sources. A board count that rises tells you nothing about
 * which half it rose in, and it is the bespoke half that a sweep scoped to the archetype loses.
 */
test("the population is every placed board that draws a mark, kind family and bespoke copies alike", () => {
  expect(
    POPULATION.length,
    `only ${POPULATION.length} placed visuals draw a classify mark, so a board has left the derivation`,
  ).toBeGreaterThanOrEqual(VISUAL_FLOOR);
  expect(new Set(POPULATION).size, "the derivation returned a board twice").toBe(
    POPULATION.length,
  );

  const family = new Set(visualsBuiltOn("BinaryRowSort"));
  expect(family.size, "no widget is built on BinaryRowSort at all").toBeGreaterThan(0);

  const live = new Set(liveVisualIds());
  const ownCopy = widgetsOwningCopy(MARK)
    .flatMap((widget) => widget.ids)
    .filter((id) => live.has(id) && !family.has(id));
  const derivedBespoke = POPULATION.filter((id) => !family.has(id));

  expect(
    derivedBespoke.length,
    `only ${derivedBespoke.length} boards outside the BinaryRowSort family are in the sweep, so it is measuring one archetype`,
  ).toBeGreaterThanOrEqual(BESPOKE_FLOOR);
  expect(
    [...derivedBespoke].sort(),
    "the boards in the sweep that are not built on the kind are not the boards holding their own copy of the mark, so the bespoke floor is measuring the wrong population",
  ).toEqual([...new Set(ownCopy)].sort());
});

/**
 * WHICH BOARDS WRAP THE MARK IS ITSELF PINNED, in both directions.
 *
 * The per-chip sorting between the two bands above is derived from the layout it then judges, so a
 * chip could move into the other band and carry a real defect with it. This is what stops that
 * being silent: a board that stops wrapping fails, and a board that starts wrapping fails unless
 * it is one of the named font-dependent ones. Both are changes to what a learner sees.
 *
 * It is two assertions rather than the set equality it used to be because the property is
 * genuinely host-dependent and a single equality cannot be true on two hosts at once: it was red
 * on CI over `function-mapping-classify` while green here. Splitting it keeps both directions over
 * the fifteen boards that wrap everywhere, and moves the one board that does not into a list that
 * has to say why and is itself asserted both ways.
 */
test("the boards that put the mark on its own line are exactly the ones recorded", async () => {
  const all = [
    ...(await sweep(FIGURE_CONTENT_CAP, false)).chips,
    ...(await sweep(FIGURE_CONTENT_CAP, true)).chips,
    ...(await sweep(CITY_PHONE.inside, false)).chips,
    ...(await sweep(CITY_PHONE.inside, true)).chips,
  ];

  const wrapped = new Set(all.filter((r) => !r.beside).map((r) => r.visual));
  const besideBoards = new Set(all.filter((r) => r.beside).map((r) => r.visual));
  const seen = new Set(all.map((r) => r.visual));

  expect(
    WRAPS_THE_MARK.filter((id) => !wrapped.has(id)).sort(),
    "these boards are recorded as drawing the mark on its own line and no longer do it anywhere in the sweep, so their chips have moved into the other band and are now measured against the other one's numbers",
  ).toEqual([]);

  const excused = new Set(WRAPS_ONLY_WHERE_THE_FONT_IS_WIDER);
  const recorded = new Set([...WRAPS_THE_MARK, ...excused]);
  expect(
    [...wrapped].filter((id) => !recorded.has(id)).sort(),
    "these boards have started drawing the mark on its own line and are recorded nowhere: add them to WRAPS_THE_MARK, or to WRAPS_ONLY_WHERE_THE_FONT_IS_WIDER with the reading that shows the wrapping turns on the host",
  ).toEqual([]);

  // THE EXEMPTION LIST FAILS BOTH WAYS TOO, or it is a hole rather than an exception.
  expect(
    [...excused].filter((id) => !seen.has(id)).sort(),
    "these boards are excused the composition claim on font grounds and draw no chip anywhere in the sweep, so the entry is exempting nothing and is hiding that it exempts nothing",
  ).toEqual([]);
  expect(
    [...excused].filter((id) => !besideBoards.has(id)).sort(),
    "these boards are excused on the grounds that whether they wrap turns on the host's font, and they now draw every chip on its own line at every width measured here: they are not borderline any more and belong in WRAPS_THE_MARK, where a board that stops wrapping reds",
  ).toEqual([]);
  expect(
    [...excused].filter((id) => WRAPS_THE_MARK.includes(id)).sort(),
    "these boards are claimed as both always-wrapping and host-dependent",
  ).toEqual([]);
  expect(
    excused.size,
    "the font-dependent list has grown until it is excusing a meaningful slice of the population rather than a named edge",
  ).toBeLessThanOrEqual(FONT_DEPENDENT_CEILING);

  // And the two faces both have to be present, or one band is being asserted over nothing.
  expect(
    all.filter((r) => r.beside).length,
    "no chip drew its mark beside the label anywhere in the sweep",
  ).toBeGreaterThanOrEqual(BESIDE_FLOOR);
  expect(
    all.filter((r) => !r.beside).length,
    "no chip drew its mark on its own line anywhere in the sweep",
  ).toBeGreaterThanOrEqual(WRAPPED_FLOOR);
}, 480_000);
