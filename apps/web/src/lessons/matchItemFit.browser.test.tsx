/**
 * A button a learner has to READ has to hold its own label — the match family this time.
 *
 * `classifyChipFit.browser.test.tsx` is the worked example and this is its sibling over
 * `.lesson-match__*`. Read that file's header for why every claim here is font-independent and
 * why "the label fits on one line" is not the claim. What follows is only what differs.
 *
 * ## The same defect, one family over
 *
 * A match board is two columns inside `.lesson-match__grid`, which is `max-width: 420px` in two
 * equal tracks, so an item gets about 184px of content box whatever surface it is drawn on.
 * Every item's content is typeset by `InlineMath`, and `.katex { white-space: nowrap }`
 * (styles.css line 80) forbids the one thing that would rescue a long item. Nowrap text in a box
 * too small for it is not clipped by the button, it is PAINTED OUTSIDE it, centred, spilling
 * past both ends of the rounded border and onto whatever the other column is drawing beside it.
 *
 * `formula-target-match` is where it was reported, because its left column carries whole
 * questions as `\text{How many ingots did that bill cover?}`. It is not the population. Prose
 * inside `\text{}` is a thing any board may reach for, and one of them already has:
 * `synthetic-long-match` carries "the 1x^2 line's product" the same way. So the population is
 * DERIVED — every visual any lesson pack places, mounted, kept if it draws a match item — for
 * the reason the repo's QA rule gives. A guard scoped to the instance in the photograph is the
 * wrong shape, and it would leave every other board free to author the same sentence tomorrow.
 *
 * ## What is asserted
 *
 *  - FIT. Every rectangle the browser actually painted sits inside the item's content box.
 *    False exactly when text lands outside the button. This is the defect.
 *  - WRAP, NOT TRUNCATE. Nothing clips, and every item's longest UNBREAKABLE run fits its
 *    content box, so reflowing is always sufficient. A phone may make a button taller; it may
 *    not cut a word, and it may not hide one.
 *  - NO COVERING. A left-column item's painted text does not reach its right-column neighbour.
 *    This is the half of the report no width assertion catches: the button's own box is
 *    innocent — it measures 0.0px of overlap — and its text is over the other column.
 *
 * Every one of those is an ABSENCE, so each sweep carries floors underneath it. A floor on the
 * boards and the items is not enough here: the defect needs PROSE, and a sweep that reached nine
 * boards of `\log_2 8` would satisfy every claim above while measuring nothing that could ever
 * exhibit it. So the composition is asserted too, in both the ways a floor cannot reach — see
 * `PROSE_ITEM_FLOOR` and `PROSE_BOARD_FLOOR`.
 *
 * ## Why FIT is per rectangle rather than per line box
 *
 * `classifyChipFit` groups painted rects into lines by their rounded `top` and compares the
 * widest line against the available width, which is right for a chip whose label is one plain
 * text run. It cannot be reused as-is over KaTeX: a `\dfrac` puts its numerator, its rule and
 * its denominator at three different tops, so grouping by top reads ONE visual line as three
 * short ones, and the widest of those three sits comfortably inside a box the whole fraction is
 * hanging out of. Comparing every painted rect against the content box's EDGES needs no grouping
 * at all, and is strictly stronger: it also catches ink that overflows one side while the total
 * width would have fitted.
 *
 * ## The measurement that decides which fix this file is waiting for
 *
 * Relaxing `white-space` was the cheap fix, and it does not work, because the assumption under
 * it is false. **KaTeX emits U+00A0 for every space inside `\text{}`** — read character by
 * character off the shipped board, `[72, 111, 119, 160, 109, ...]` for "How many ..." — and a
 * no-break space is not a soft wrap opportunity. So the sentence is one unbreakable 254.4px run
 * whatever `white-space` says, and three progressively looser relaxations measured at
 * `formula-target-match` produced numbers identical to the shipped stylesheet, to the tenth of
 * a pixel: `white-space: normal` on `.katex`; that plus the same on `.katex .base`; that plus
 * `width: auto` on `.base`. One line, 70.4px outside a 184px box, every time.
 *
 * `overflow-wrap: anywhere` is the only CSS that does reflow it (2 lines at 184px, 3 at 113px,
 * nothing outside) and it buys that by granting break opportunities INSIDE words: "charged"
 * stops measuring as a 54.3px run, because it is being split across the line break with no
 * hyphen. The same sentence as PLAIN TEXT in the same button at the same width wraps cleanly —
 * 2 lines, 42.2px tall to 62px, nothing outside, longest word 57.4px in 184px.
 *
 * That is the plan's fallback, and the measurement chose it: prose is not math, and carrying it
 * as `\text{}` is what makes it unwrappable. Raw readings in `.qa-frames/match-reflow.json` and
 * `.qa-frames/match-spaces.json`.
 *
 * Real Chromium, because every number here is layout, and the real stylesheet, because the
 * 420px cap, the padding and the nowrap all live in `styles.css`.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { visualsBuiltOn } from "./kindFamily";
import { CITY_PHONE, FIGURE_CONTENT_CAP, LESSONS_READING } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * The reviewer's window, and the viewport the frame in this file is named for.
 *
 * One viewport for the whole file rather than a wide one for the measurements and a short one
 * for the frame: 1024 is wider than every width swept below, so a host set to 460px really is
 * 460px, which is the reason `classifyChipFit` leaves the browser's 414px phone default behind.
 */
const VIEWPORT = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * Sub-pixel slack, in px.
 *
 * Every comparison here puts a Range measurement beside a layout box that was sized from the
 * same content, so the two agree to within rounding and an exact-equality boundary is a coin
 * toss rather than a claim. It is deliberately one pixel: the defect this file exists for is
 * measured in tens of px, so nothing real hides under it.
 */
const SLACK = 1;

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/**
 * Mount one visual at `width` and wait for its maths to be typeset AND its fonts to load.
 *
 * Both waits are load-bearing where `classifyChipFit` needs neither: KaTeX renders in an effect,
 * and every width below is the width of glyphs in KaTeX_Main, so a measurement taken before
 * `document.fonts.ready` is a measurement of the fallback face.
 */
async function mountVisual(id: LessonVisualId, width: number): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${width}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  if (host.querySelector(".lesson-match__item") !== null) {
    await waitFor(
      () =>
        Array.from(host.querySelectorAll(".lesson-match__item [data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      `${id} typesets its match items`,
      20_000,
    );
    await document.fonts.ready;
  }
  return host;
}

/** The space inside the borders and padding: what the item's content actually gets. */
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

/** The same box in viewport coordinates, which is what a painted rect can be compared against. */
function contentBox(el: HTMLElement): DOMRect {
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const left =
    box.left +
    Number.parseFloat(style.borderLeftWidth) +
    Number.parseFloat(style.paddingLeft);
  const right =
    box.right -
    Number.parseFloat(style.borderRightWidth) -
    Number.parseFloat(style.paddingRight);
  return new DOMRect(left, box.top, right - left, box.height);
}

/**
 * The text nodes under `el` that are actually PAINTED.
 *
 * `InlineMath` asks KaTeX for `htmlAndMathml`, so every glyph exists twice: once in
 * `.katex-html` and once in a `.katex-mathml` the stylesheet clips to a 1x1 box. Reading the
 * element's contents wholesale therefore measures every expression twice and feeds a stray 1px
 * rectangle into the line grouping.
 */
function paintedTextNodes(el: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node as Text;
    const parent = text.parentElement;
    if (text.data.trim().length === 0 || parent === null) {
      continue;
    }
    if (parent.closest(".katex-mathml") !== null) {
      continue;
    }
    out.push(text);
  }
  return out;
}

/** Every rectangle `el`'s visible text was painted into. */
function paintedRects(el: HTMLElement): DOMRect[] {
  const rects: DOMRect[] = [];
  for (const text of paintedTextNodes(el)) {
    const range = document.createRange();
    range.selectNodeContents(text);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width > 0 && rect.height > 0) {
        rects.push(rect);
      }
    }
  }
  return rects;
}

/** Those rectangles grouped by the line they were painted on. */
function lineBoxes(el: HTMLElement): DOMRect[] {
  return groupIntoLines(paintedRects(el));
}

function groupIntoLines(rects: readonly DOMRect[]): DOMRect[] {
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

/** Where the element's text is painted, as one box around every rectangle of it. */
function paintedTextBox(el: HTMLElement): DOMRect | null {
  const rects = paintedRects(el);
  if (rects.length === 0) {
    return null;
  }
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const top = Math.min(...rects.map((r) => r.top));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

/** How many horizontal px two boxes share, counting only where they also share rows. */
function overlapPx(a: DOMRect, b: DOMRect): number {
  const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return across > 0.5 && down > 0.5 ? across : 0;
}

/** How far past the box's left or right edge any of `rects` reaches. */
function outsidePx(inside: DOMRect, rects: readonly DOMRect[]): number {
  return rects.reduce(
    (most, rect) => Math.max(most, inside.left - rect.left, rect.right - inside.right),
    0,
  );
}

/** One run of painted characters with no break opportunity inside it. */
interface Run {
  readonly text: string;
  readonly px: number;
}

/**
 * The runs in `el` that no amount of reflowing can break, and how wide each was painted.
 *
 * Cut at whitespace over the element's WHOLE painted text rather than per text node, because
 * KaTeX splits one word across several spans whenever the glyphs need different metrics, and a
 * per-node reading would report the halves and never the word. `\s` covers the U+00A0 KaTeX
 * emits for a space inside `\text{}`, so the cut is where a reflow could land if the character
 * allowed one — see the header for the measurement that it does not.
 *
 * A pure expression contains no whitespace at all, so its single run is the whole thing. That
 * is the right reading and not an accident of the cut: typeset math offers no break opportunity
 * anywhere, so the only width that can rescue it is one that fits all of it.
 */
function unbreakableRuns(el: HTMLElement): Run[] {
  const nodes = paintedTextNodes(el);
  let joined = "";
  const pieces: { node: Text; at: number }[] = [];
  for (const node of nodes) {
    pieces.push({ node, at: joined.length });
    joined += node.data;
  }
  const locate = (index: number): { node: Text; offset: number } => {
    let found = pieces[0];
    for (const piece of pieces) {
      if (piece.at <= index) {
        found = piece;
      }
    }
    if (found === undefined) {
      throw new Error("no painted text to locate a run in");
    }
    return { node: found.node, offset: index - found.at };
  };
  const runs: Run[] = [];
  for (const match of joined.matchAll(/\S+/g)) {
    const start = match.index ?? 0;
    const range = document.createRange();
    const from = locate(start);
    const to = locate(start + match[0].length - 1);
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset + 1);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
    // The run's widest LINE, not the union of its rectangles: once content reflows a run can
    // legitimately be measured on two lines, and the union of those two is not a width
    // anything has to fit inside.
    const widest = groupIntoLines(rects).reduce(
      (most, line) => Math.max(most, line.width),
      0,
    );
    runs.push({ text: match[0], px: widest });
  }
  return runs;
}

/** The widest of them, which is the width the item's box has to be able to hold. */
function widestRun(el: HTMLElement): Run {
  const runs = unbreakableRuns(el);
  return runs.reduce((most: Run, run) => (run.px > most.px ? run : most), {
    text: "",
    px: 0,
  });
}

/**
 * True when the box HIDES what does not fit instead of reflowing it.
 *
 * Stated as overflow being hidden AND the content exceeding the box, rather than as
 * `scrollWidth > clientWidth` alone, because that comparison is true of every item in the defect
 * this file exists for — where nothing is cut off at all, and the sentence is painted out over
 * the neighbouring column in full. Read the loose way it would be a second, worse-named copy of
 * the FIT claim. Read this way it is the distinct promise that no fix reaches green by cropping
 * the question instead of wrapping it.
 */
function clips(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const hides = style.overflowX !== "visible" || style.textOverflow !== "clip";
  return hides && el.scrollWidth > el.clientWidth + SLACK;
}

/** What an item was typeset from, so a failure can name the instance in the author's terms. */
function itemLatex(item: HTMLElement): string {
  const latex = Array.from(item.querySelectorAll("[data-latex]"))
    .map((node) => node.getAttribute("data-latex") ?? "")
    .join(" ")
    .trim();
  return latex.length > 0 ? latex : (item.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * True when the item's content reads as a SENTENCE rather than as an expression.
 *
 * Read off what was PAINTED, not off `\text{}` in the source, and the difference is the whole
 * point. This is the composition floor's input, and the fix the measurement above recommends is
 * to stop carrying prose as `\text{}` — so a source-shaped reading would take the population
 * this floor guards to zero at the exact moment the defect was fixed, and fail. A guard has to
 * survive its own fix, so the question it asks is "is there a sentence in this button", which is
 * a fact about the board and stays true however the sentence gets there.
 *
 * Three whole words, because plenty of an expression is alphabetic: `\log_3 x + \log_3 5 = 2`
 * reaches two, and so does `synthetic-long-match`'s `\text{the } r \text{ in } x - 3`, where the
 * words are scaffolding around a symbol rather than a sentence about it. Both fit their column
 * comfortably; the items that do not are the ones that read as a whole question.
 */
function carriesProse(item: HTMLElement): boolean {
  const words = paintedTextNodes(item)
    .map((node) => node.data)
    .join(" ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && /^[A-Za-z][A-Za-z'’?.,!-]*$/.test(word));
  return words.length >= 3;
}

interface ItemReading {
  /** Which board, which column, which button: a failure has to name the instance. */
  readonly where: string;
  readonly visual: string;
  readonly prose: boolean;
  readonly available: number;
  /** How far the painted ink reaches outside the content box, on its worse side. */
  readonly outside: number;
  /** How many line boxes the content was laid out on, so a failure says whether it reflowed. */
  readonly lines: number;
  /** The widest run with no break opportunity in it, which is what has to fit for any reflow. */
  readonly run: string;
  readonly runNeeded: number;
  readonly clipped: boolean;
}

interface Covering {
  readonly where: string;
  /** The left item's border box over the right item's. */
  readonly box: number;
  /** The left item's painted text over the right item's box. */
  readonly text: number;
}

interface Sweep {
  readonly visuals: string[];
  readonly items: ItemReading[];
  readonly coverings: Covering[];
}

/** Mount every placed visual at `width` and measure the match items any of them draw. */
async function sweep(width: number): Promise<Sweep> {
  const visuals: string[] = [];
  const items: ItemReading[] = [];
  const coverings: Covering[] = [];

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id, width);
    if (host.querySelector(".lesson-match__item") === null) {
      h?.cleanup();
      h = null;
      continue;
    }
    visuals.push(id);
    const sides = Array.from(host.querySelectorAll<HTMLElement>(".lesson-match__side"));

    sides.forEach((side, column) => {
      const buttons = Array.from(side.querySelectorAll<HTMLElement>(".lesson-match__item"));
      buttons.forEach((item, at) => {
        const run = widestRun(item);
        items.push({
          where: `${id} column ${column + 1} item ${at + 1} "${itemLatex(item)}"`,
          visual: id,
          prose: carriesProse(item),
          available: contentWidth(item),
          outside: outsidePx(contentBox(item), paintedRects(item)),
          lines: lineBoxes(item).length,
          run: run.text,
          runNeeded: run.px,
          clipped: clips(item),
        });
      });
    });

    // The left column against the right one, item by item. A match board is two independent
    // stacks rather than a grid of rows, so this pairs by position: the nth left item is the
    // one drawn beside the nth right item, and the nth is the only one it can reach.
    const left = Array.from(
      sides[0]?.querySelectorAll<HTMLElement>(".lesson-match__item") ?? [],
    );
    const right = Array.from(
      sides[1]?.querySelectorAll<HTMLElement>(".lesson-match__item") ?? [],
    );
    left.forEach((item, at) => {
      const neighbour = right[at];
      if (neighbour === undefined) {
        return;
      }
      const text = paintedTextBox(item);
      coverings.push({
        where: `${id} item ${at + 1} "${itemLatex(item)}" over its right-hand neighbour`,
        box: overlapPx(item.getBoundingClientRect(), neighbour.getBoundingClientRect()),
        text: text === null ? 0 : overlapPx(text, neighbour.getBoundingClientRect()),
      });
    });

    h?.cleanup();
    h = null;
  }

  return { visuals, items, coverings };
}

/**
 * Floors, not counts, and every one of them is load-bearing: each assertion below is an ABSENCE
 * (nothing painted outside its box, nothing clipped, nothing unwrappable, nothing covering its
 * neighbour) and an absence holds trivially over an empty sweep. A run that mounted no match
 * board at all would otherwise report green while proving the exact opposite.
 *
 * Nine placed visuals draw match items today, over nine source files: 68 buttons in 34
 * left-and-right pairs. The floors sit at or just under the observed numbers, so DELETING a
 * match board from a lesson pack is a decision somebody has to make on purpose, while adding one
 * needs no edit here.
 */
const VISUAL_FLOOR = 9;
const ITEM_FLOOR = 64;
const PAIR_FLOOR = 32;

/**
 * And a floor on the SHAPE of that population, because a floor constrains size and not shape.
 *
 * Sixty-eight buttons of `\log_2 8` would satisfy every claim in this file while measuring
 * nothing that could exhibit the defect: the overflow needs an item long enough to outgrow a
 * 184px column, and on these boards that means an item carrying a sentence. So the sweep
 * asserts it reached prose at all, and that the prose it reached is on more than one board —
 * which is where "this guard is genuinely wider than the one instance in the photograph" is put
 * somewhere it can fail.
 *
 * Five items carry a sentence today: the four questions on `formula-target-match`, which is the
 * board that was reported, and "the 1x^2 line's product" on `synthetic-long-match`, which is the
 * board that was not. Both floors were watched to fail before they were pinned here.
 */
const PROSE_ITEM_FLOOR = 5;
const PROSE_BOARD_FLOOR = 2;

/** Everything that must hold at both widths, so neither surface can regress on its own. */
const WIDTHS: readonly (readonly [string, number])[] = [
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
  [CITY_PHONE.where, CITY_PHONE.inside],
];

/** The floors every sweep owes, whatever else it is asserting. */
function expectPopulation(sweep: Sweep): void {
  const prose = sweep.items.filter((item) => item.prose);
  expect(sweep.visuals.length, "no lesson places a match board").toBeGreaterThanOrEqual(
    VISUAL_FLOOR,
  );
  expect(
    sweep.items.length,
    "the match boards drew no items to measure",
  ).toBeGreaterThanOrEqual(ITEM_FLOOR);
  expect(
    prose.length,
    "the sweep reached no match item carrying a sentence, so nothing it measured could exhibit the overflow",
  ).toBeGreaterThanOrEqual(PROSE_ITEM_FLOOR);
  expect(
    new Set(prose.map((item) => item.visual)).size,
    "every match item carrying a sentence is on one board, so this sweep has narrowed to the instance that was reported",
  ).toBeGreaterThanOrEqual(PROSE_BOARD_FLOOR);
}

/**
 * The population is read off the DOM, so a board that draws a match item is swept whether or not
 * it was built on the shared kind — which is the scoping the QA rule asks for, and needs no edit
 * here when a bespoke widget adopts the mechanic.
 *
 * The risk that leaves is the other direction: a board built on the kind that stops being
 * reached, by a renamed class, a gate, or a lesson pack dropping it, would leave the sweep
 * quietly narrower with every floor above still satisfied by the boards that remain. So the
 * widgets the kind's own sources claim are checked against the boards the sweep actually
 * measured, and a shortfall names the ones that went missing.
 */
test("every placed board built on MatchPairs is reached by the sweep", async () => {
  const placed = new Set(liveVisualIds());
  const onKind = visualsBuiltOn("MatchPairs").filter((id) => placed.has(id));
  expect(
    onKind.length,
    "no placed visual is built on MatchPairs at all, so the check below compares nothing",
  ).toBeGreaterThanOrEqual(VISUAL_FLOOR);

  const { visuals } = await sweep(FIGURE_CONTENT_CAP);
  expect(
    onKind.filter((id) => !visuals.includes(id)).join("; "),
    "these boards are built on MatchPairs and placed by a lesson, but drew no match item for the sweep to measure",
  ).toBe("");
}, 180_000);

test.each(WIDTHS)(
  "every match item holds its own content at %s",
  async (_at, width) => {
    const measured = await sweep(width);
    const { items } = measured;

    // Before the absences, and not after them the way `classifyChipFit` orders it. Everything
    // below is a claim that a list is EMPTY, and a red run stops at the first one, so floors
    // written underneath are unproven on exactly the runs where the file is doing its job.
    expectPopulation(measured);

    // THE DEFECT. Not "the content fits on one line" (see `classifyChipFit`'s header) but "every
    // rectangle the browser painted is inside the button", which is false exactly when text is
    // painted outside it.
    expect(
      items
        .filter((item) => item.outside > SLACK)
        .map(
          (item) =>
            `${item.where} paints ${item.outside.toFixed(1)}px outside its ${item.available.toFixed(1)}px content box on ${item.lines} line(s)`,
        )
        .join("; "),
      `at ${width}px these match items paint their content outside the button drawn around them`,
    ).toBe("");

    // An item may get TALLER. It may not hide what it cannot fit.
    expect(
      items
        .filter((item) => item.clipped)
        .map((item) => item.where)
        .join("; "),
      `at ${width}px these match items hide their content instead of reflowing it`,
    ).toBe("");

    // Reflowing can only rescue an item whose longest unbreakable run fits, so this is the floor
    // the column width has to respect. On a prose item that run is a word; on a typeset
    // expression it is the whole expression, which has no break opportunity anywhere.
    expect(
      items
        .filter((item) => item.runNeeded > item.available + SLACK)
        .map(
          (item) =>
            `${item.where}: "${item.run}" needs ${item.runNeeded.toFixed(1)}px in ${item.available.toFixed(1)}px`,
        )
        .join("; "),
      `at ${width}px no amount of reflowing fits these runs in the item`,
    ).toBe("");
  },
  180_000,
);

test.each(WIDTHS)(
  "no match item covers the one it is drawn beside at %s",
  async (_at, width) => {
    const measured = await sweep(width);
    const { coverings } = measured;

    expectPopulation(measured);
    // A floor under the pairs specifically, and not only under the items: a board that drew its
    // two columns as one would have items to measure and nothing to be beside.
    expect(
      coverings.length,
      "no match board drew a left item beside a right one, so the covering claim measured nothing",
    ).toBeGreaterThanOrEqual(PAIR_FLOOR);

    expect(
      coverings
        .filter((c) => c.box > 0)
        .map((c) => `${c.where} by ${c.box.toFixed(1)}px`)
        .join("; "),
      `at ${width}px a left-hand item's box sits on top of its right-hand neighbour`,
    ).toBe("");

    // THE OTHER HALF OF THE REPORT, and the half no width assertion catches. The box above is
    // innocent: the grid gives each column exactly half the track and neither ever moves. It is
    // the item's TEXT, painted outside its own border, that lands on the other column.
    expect(
      coverings
        .filter((c) => c.text > 0)
        .map((c) => `${c.where} by ${c.text.toFixed(1)}px`)
        .join("; "),
      `at ${width}px a left-hand item's painted text sits on top of its right-hand neighbour`,
    ).toBe("");
  },
  180_000,
);

/**
 * Where this test's viewport sits inside the real browser window.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in the requested viewport's pixels lands
 * somewhere else on the real screen. `winterDevSkipShots.browser.test.tsx` measured that failure
 * and this is its fix.
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

/** One frame of the whole viewport, captured over CDP and clipped to where that viewport is. */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, { encoding: "base64" });
  }
}

/**
 * THE PICTURE THE NUMBERS ARE DESCRIBING.
 *
 * A spatial claim owes a rendered frame, and specifically one framed to show the SURFACE rather
 * than the component: cropped to the button that changed, a screenshot proves nothing about what
 * its text is landing on, because the button is the one part of the picture nobody doubted. So
 * this mounts the reported board on the reading column it ships on, at the short viewport a
 * reviewer really has, with the whole figure card and both columns in shot.
 *
 * It asserts only the floors. Photographing the defect and asserting the defect are different
 * things, and a test that went red the moment somebody fixed the board would be the second.
 */
test("the reported board, photographed on the surface it ships on", async () => {
  const host = await mountVisual("formula-target-match", LESSONS_READING.column);
  host.style.margin = "24px";
  await shoot(`match-item-overflow-${VIEWPORT.width}x${VIEWPORT.height}`);

  const items = Array.from(host.querySelectorAll<HTMLElement>(".lesson-match__item"));
  expect(items.length, "the photographed board drew no match items").toBeGreaterThanOrEqual(
    8,
  );
  expect(
    items.filter(carriesProse).length,
    "the photographed board carries no sentence, so the frame is not showing the reported case",
  ).toBeGreaterThanOrEqual(4);
}, 120_000);

/**
 * THE SAME BOARD ON A PHONE'S CARD, which is the width no cap and no reflow could reach.
 *
 * Two columns of a phone's card leave an item 113.4px, and the widest content on these boards is
 * `2\log_3 x + \log_3 5 = 2` needing 136.2px of it. Typeset math offers no break opportunity
 * anywhere, so nothing about how the item wraps can help and only a wider box can: below 380px
 * of container the grid becomes ONE column. The frame is at the same viewport as the one above,
 * with the host set to the width a 390px phone's card really is.
 *
 * Read the layout off the two sides' BOXES rather than off the grid's `grid-template-columns`,
 * which on this fieldset computes to the specified `repeat(2, minmax(0px, 1fr))` rather than to
 * used track widths, and so cannot be counted. Stacked or beside each other is the claim anyway,
 * and it is what the frame shows.
 */
test("the same board at a phone's card width, photographed as one column", async () => {
  const host = await mountVisual("formula-target-match", CITY_PHONE.column);
  host.style.margin = "24px";
  await shoot(`match-one-column-phone-card-${VIEWPORT.width}x${VIEWPORT.height}`);

  const sides = Array.from(host.querySelectorAll<HTMLElement>(".lesson-match__side"));
  const [questions, answers] = sides;
  if (questions === undefined || answers === undefined) {
    throw new Error("the photographed board did not draw two sides");
  }
  expect(
    answers.getBoundingClientRect().top,
    `at ${CITY_PHONE.column}px the two columns are still side by side, so the frame is not showing the narrow layout`,
  ).toBeGreaterThanOrEqual(questions.getBoundingClientRect().bottom - SLACK);

  const items = Array.from(host.querySelectorAll<HTMLElement>(".lesson-match__item"));
  expect(items.length, "the photographed board drew no match items").toBeGreaterThanOrEqual(
    8,
  );
}, 120_000);
