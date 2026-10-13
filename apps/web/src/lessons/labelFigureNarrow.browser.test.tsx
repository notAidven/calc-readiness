/**
 * The labelling figures, measured at the width a PHONE gives them.
 *
 * ## Why this file exists at all
 *
 * A fix aimed at exactly this defect shipped and missed it. The three labelling figures
 * wrapped, slots were shrunk to `3.5rem` to stop them, and the test written alongside
 * measured at 460px — where the new sizing did fit. The width a learner on a phone actually
 * gets is a third narrower, all three still wrapped there, and nothing measured it.
 *
 * The first version of THIS file then made a smaller version of the same mistake: it pinned
 * `power-parts-label` to one line at 304.8px, which is true in the font my machine resolves
 * and false in the one CI resolves, where the words "five copies of the base" are 147.0px
 * and the slot is wider than the expression above it. It passed locally and failed on CI.
 * That is why the line counts here are ceilings and the shape assertions are separate.
 *
 * The reason 460 was chosen is instructive rather than careless: ten files pinned it,
 * every one of them calling it "the width the stylesheet gives every lesson card". No
 * lesson card is 460px wide. `readingWidths.ts` holds the containers that do exist, with
 * the evidence, and this file is the second measurement that family needed — NOT a
 * replacement for the first. Widening the pinned width would make things strictly worse:
 * at `CITY_DESKTOP` nothing wraps at any slot size in range, so the defect would leave the
 * tests altogether.
 *
 * ## What is being claimed
 *
 * Not "the figures fit on one line", because none of them can be relied on to and two
 * cannot at all; the arithmetic saying so is in `LabelParts.tsx`. The claim is that every
 * break lands where an author put a break opportunity. There are exactly three of those —
 * between statements, between a statement's lead and its terms, and between two groups of
 * terms — so what is measured is that nothing divides anywhere else:
 *
 *   - no GROUP is split, since a group is a connector with the term it introduces and a
 *     break inside one is the only break nobody authored;
 *   - nothing is pushed outside the board, since a group is `nowrap` and a group too wide
 *     for its line hangs off the edge instead of dividing.
 *
 * The first of those is held by a rule rather than by luck, so the rule is asserted too:
 * `groupsAreIndivisible` reads the computed `flex-wrap` off a real group. The second is
 * what actually sizes the groups, and it is the one that fires when they get too wide.
 *
 * Both are held twice: on the empty figure, and on the ANSWERED one. That is not
 * belt-and-braces — it is the only place in the suite where a labelling figure is measured
 * with names in its slots, at any width, and two of the three are wider then, because
 * "exponent" and "radicand" outrun the empty box's minimum. A name wide enough to push a
 * group off the board passes the empty sweep and fails the answered one.
 *
 * The population is derived from the lessons, never listed, so a fourth labelling figure is
 * swept the day it lands. Both measurements would pass over an empty sweep, so each
 * carries a floor.
 */

import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { WorldScene } from "../city/WorldScene";
import { AdvisorLesson } from "./AdvisorLesson";
import { allLessons } from "./domains";
import { katexBaseline, readingLine } from "./katexBaseline";
import { LessonBody } from "./LessonBody";
import {
  CITY_DESKTOP,
  CITY_PHONE,
  DESKTOP_VIEWPORT,
  LESSONS_READING,
  PHONE_VIEWPORT,
  type ReadingWidth,
} from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

/** Unmount whatever is up. A function, so a `h = null` above does not narrow `h` away. */
function release(): void {
  h?.cleanup();
  h = null;
}

afterEach(release);

/** Pixel slack allowed on any single measurement: sub-pixel layout, not a budget. */
const EPSILON = 1;

/**
 * Slack on where a piece of maths is READ, in px, and looser than `EPSILON` for one reason.
 * The stylesheet seats a lead a quarter-em under the centre of its blanks and this measures
 * half an x-height, which agree exactly only in a font whose x-height is half its em. That
 * is the font on this machine and not the one CI resolves, where the two differ by around
 * 0.6px — a font fact, not a layout defect. The defects here are 15.8px and up.
 */
const READING_SLACK = 2;

function width(el: Element): number {
  return el.getBoundingClientRect().width;
}

/**
 * A figure's CONTENT box: `ReadingWidth.inside`, taken from the figure itself.
 *
 * This is the width the widget inside actually has to lay out in — the number every
 * measurement in this family compares against, and the one 26px away from the number a
 * test host sets. Subtracted off the rect rather than read from `clientWidth`, which is
 * rounded to an integer and would report `CITY_PHONE.inside` as 305.
 */
function insideOf(figure: HTMLElement): number {
  const style = getComputedStyle(figure);
  const off = (["Left", "Right"] as const).reduce(
    (total, side) =>
      total +
      Number.parseFloat(style[`padding${side}` as const]) +
      Number.parseFloat(style[`border${side}Width` as const]),
    0,
  );
  return width(figure) - off;
}

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/**
 * Mount one visual in a host of exactly `at.column`, and hand back its labelling figure.
 *
 * Null for every visual that is not a labelling figure, which is most of them: the
 * population is derived rather than listed, so the sweep has to skip rather than assume.
 */
async function labelFigure(
  id: LessonVisualId,
  at: ReadingWidth,
): Promise<HTMLElement | null> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${at.column}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  // COLD FONTS READ NARROW, and every number in this file is a width. KaTeX typesets in
  // its own webfonts; the first mount on a fresh page gets fallback metrics, and measured
  // there `power-parts-label` comes out 303.9px wide and fits a phone line — which it does
  // not, at 306.5. Nothing here may be measured before the fonts the app ships with are in.
  await document.fonts.ready;
  const figure = host.querySelector<HTMLElement>(".lesson-label__figure");
  if (figure === null) {
    return null;
  }
  // The two widths in `readingWidths.ts` are 26px apart, and mixing them is how one number
  // came to mean three things. Setting the outer one has to land the inner one.
  const board = figure.closest(".lesson-interactive") as HTMLElement;
  expect(
    width(board),
    `${id}: a ${at.column}px column left ${width(board)}px inside, not ${at.inside}`,
  ).toBeCloseTo(at.inside, 1);
  return figure;
}

function slots(root: ParentNode): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>(".lesson-label__slot"));
}

function termGroups(figure: HTMLElement): HTMLElement[] {
  return Array.from(figure.querySelectorAll<HTMLElement>(".lesson-label__group"));
}

/** How far apart the tops of these slots are: 0 on one line, a row's height on two. */
function spread(root: ParentNode): number {
  const tops = slots(root).map((s) => s.getBoundingClientRect().top);
  return tops.length === 0 ? 0 : Math.max(...tops) - Math.min(...tops);
}

/** How many lines the figure's slots are spread over. */
function slotLines(figure: HTMLElement): number {
  return new Set(slots(figure).map((s) => Math.round(s.getBoundingClientRect().top))).size;
}

/**
 * Answer every slot, the way a learner does: hold a name, then press slots until one takes
 * it. A wrong drop is refused and costs nothing, so trying them in turn is safe.
 */
async function answerEveryPart(figure: HTMLElement): Promise<void> {
  const board = figure.closest(".lesson-interactive") as HTMLElement;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const chip = board.querySelector<HTMLButtonElement>(".lesson-sorter__chip");
    if (chip === null) {
      return;
    }
    chip.click();
    for (const slot of slots(figure).filter(
      (s) => s.getAttribute("data-named") !== "yes",
    )) {
      slot.click();
      if (slot.getAttribute("data-named") === "yes") {
        break;
      }
      chip.click();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("could not answer every part");
}

/* ------------------------------------------- 1. the widths are measured, not asserted */

/**
 * Waits until nothing above the figure is still scaled, so no width below is a fraction of
 * itself.
 *
 * **A FIXED SLEEP WAS NOT A WAIT FOR THE ANIMATION, IT WAS A BET ON WHEN IT WOULD START.**
 * `.coc-card` runs `coc-card-in` for 200ms with `animation-fill-mode: both`, and `both` is the
 * word that matters: until the animation actually begins the element is HELD at the 0%
 * keyframe, which is `transform: scale(0.86)`. A transformed box measures 86% of itself, and
 * `getBoundingClientRect` reports that reduced box without complaint. Sleeping 400ms for a
 * 200ms animation looks like double the headroom needed and is nothing of the kind, because
 * the quantity it has to cover is the delay before the first keyframe is applied, which on a
 * loaded two-core runner is unbounded.
 *
 * It lost twice on CI, at exactly 0.86 of the number expected each time and never near it:
 * `791.2000732421875` against 920 (run `30764876140`), and `284.4853210449219` against 330.8
 * (run `30765649544`). 791.2/920 and 284.4853/330.8 are both 0.86000 — the 0% keyframe, not a
 * layout disagreement, and not the phone and desktop cases failing for two reasons.
 *
 * So this waits for the property the measurement actually needs, on a poll rather than a
 * clock: an identity transform the whole way up. It returns as soon as the pop-in lands, and
 * if the pop-in never lands it says that instead of quietly reporting 86% of every width.
 */
async function popInSettled(): Promise<void> {
  await waitFor(
    () => untransformed(document.querySelector("figure.lesson-visual")),
    "the card's pop-in never finished, so every width here would be a fraction of itself",
    5000,
  );
}

/** Is `node` and everything above it drawn at its own size, rather than under a transform? */
function untransformed(node: Element | null): boolean {
  if (node === null) {
    return false;
  }
  for (let at: Element | null = node; at !== null; at = at.parentElement) {
    const transform = getComputedStyle(at).transform;
    if (transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)") {
      return false;
    }
  }
  return true;
}

/**
 * THE PRECONDITION. Every number in `readingWidths.ts` is a claim about the shipped app,
 * so it is taken from the shipped app: the real `WorldScene` lesson frame at a real phone
 * viewport, and the real `.lesson-player` article.
 *
 * Without this, `CITY_PHONE.inside` is a comment, and a comment is exactly what 460 was.
 */
/**
 * Walk the advisor forward until it puts a figure on screen.
 *
 * A teaching slide is several SECTIONS (`teachingSections.ts`) and only the last of them
 * renders the slide's visuals, so the player no longer opens on one. How many clicks that
 * costs is a property of the pack — a slide with an authored worked example is one more
 * than a slide without — so this is driven by the figure appearing rather than by a count,
 * which is also what keeps it off the content the D1 packs are being reshaped into.
 *
 * This changes nothing about what is MEASURED: the figure is measured in the same frame at
 * the same viewport, once the section that renders it is the one on screen.
 */
async function advanceToTheFirstFigure(): Promise<void> {
  const nextControl = (): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent ?? "").trim() === "Next",
    );

  for (let step = 0; step < 24; step += 1) {
    // Each pass waits for the advisor to have re-rendered: the first one is waiting on the
    // mount itself, which is why this cannot simply read the DOM and throw.
    await waitFor(
      () =>
        document.querySelector("figure.lesson-visual") !== null ||
        nextControl() !== undefined,
      "the advisor shows a figure or a way forward",
    );
    if (document.querySelector("figure.lesson-visual") !== null) {
      return;
    }
    nextControl()?.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("the advisor never reached a figure");
}

test("the named reading widths are what the app really hands a lesson figure", async () => {
  const lesson = allLessons.find((l) => (l.visuals ?? []).length > 0);
  if (lesson === undefined) {
    throw new Error("no lesson places a visual");
  }
  const content = lesson;

  async function cityAt(viewport: { width: number; height: number }): Promise<void> {
    await page.viewport(viewport.width, viewport.height);
    h = mount(
      <WorldScene eyebrow="e" title={content.title} size="large" onExit={() => {}}>
        <AdvisorLesson content={content} />
      </WorldScene>,
    );
    await advanceToTheFirstFigure();
    await waitFor(
      () => document.querySelector("figure.lesson-visual") !== null,
      "the lesson mounts a visual",
    );
    await document.fonts.ready;
    await popInSettled();
  }

  function check(at: ReadingWidth): void {
    const figure = document.querySelector("figure.lesson-visual") as HTMLElement;
    expect(width(figure), `${at.where}: the column a lesson figure fills`).toBeCloseTo(
      at.column,
      1,
    );
    expect(insideOf(figure), `${at.where}: the width inside that figure`).toBeCloseTo(
      at.inside,
      1,
    );
  }

  await cityAt(PHONE_VIEWPORT);
  check(CITY_PHONE);
  release();

  await cityAt(DESKTOP_VIEWPORT);
  check(CITY_DESKTOP);
  release();

  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height);
  h = mount(
    <article className="lesson-player">
      <LessonBody content={content} />
    </article>,
  );
  await waitFor(
    () => document.querySelector("figure.lesson-visual") !== null,
    "the reading surface mounts a visual",
  );
  await document.fonts.ready;
  check(LESSONS_READING);
});

/* --------------------------------------------- 2. no break the author did not put there */

/**
 * Both measurements, over every labelling figure, in one state.
 *
 * Returns how many figures and how many slots it looked at, so the caller can floor them:
 * "no row was split" and "nothing overflowed" are both absences, and both hold over a
 * sweep that found nothing.
 */
async function sweepAt(
  at: ReadingWidth,
  answer: boolean,
): Promise<{ figures: number; slots: number; groups: number; connectors: number }> {
  let figures = 0;
  let counted = 0;
  let groups = 0;
  let connectors = 0;

  for (const id of liveVisualIds()) {
    const figure = await labelFigure(id, at);
    if (figure === null) {
      release();
      continue;
    }
    figures += 1;
    if (answer) {
      await answerEveryPart(figure);
    }

    const board = figure.closest(".lesson-interactive") as HTMLElement;
    const bounds = board.getBoundingClientRect();

    for (const group of termGroups(figure)) {
      groups += 1;
      // THE DEFECT, in the place it is now confined to. A group is a connector with the
      // term it introduces, and a break inside one is what put "root of 49 = 7 has, radical
      // sign, comma" on one line and "49, comma, 7" on the next.
      expect(
        spread(group),
        `${id} at ${at.inside}px${answer ? ", answered" : ""}: a connector was split from the term it introduces`,
      ).toBeLessThanOrEqual(2);

      // And the connector is READ on the line of the blanks it is indivisible from. This is
      // the one reading-line claim that can be made at a narrow width: a statement's opening
      // maths is free to sit on a line of its own here, and does, so nothing may compare it
      // to a band it is no longer beside — but a group is `nowrap`, which is exactly the
      // guarantee that a connector still shares its line with the blank next to it.
      // `widgetDropSlots` and `labelFigureWhole` hold the same claim over every lead, and
      // both measure at the 460px cap alone, so without this the lift that put RAD.3's
      // superscript over its blanks was unmeasured at the width a phone gives it.
      const boxes = slots(group).map((s) => s.getBoundingClientRect());
      for (const lead of Array.from(
        group.querySelectorAll<HTMLElement>(".lesson-label__lead"),
      )) {
        if (boxes.length === 0) {
          throw new Error(`${id}: a group carries a connector and no blank`);
        }
        const centre =
          (Math.min(...boxes.map((b) => b.top)) + Math.max(...boxes.map((b) => b.bottom))) /
          2;
        const seat = katexBaseline(lead);
        const said = (lead.textContent ?? "").trim().slice(0, 16);
        expect(
          seat,
          `${id}: the connector "${said}" has no readable baseline`,
        ).not.toBeNull();
        const off = (seat?.baseline ?? Number.NaN) - readingLine(lead, centre);
        connectors += 1;
        expect(
          Math.abs(off),
          `${id} at ${at.inside}px${answer ? ", answered" : ""}: the connector "${said}" is read ${off.toFixed(1)}px off the line its blank is on`,
        ).toBeLessThanOrEqual(READING_SLACK);
      }
    }

    // Nothing may leave the board. A group is `nowrap`, so a group too wide for the line
    // hangs off the edge rather than breaking — a slot nobody can reach. THIS is the
    // measurement that sizes the groups; the assertion above only holds the rule that makes
    // them indivisible (see BREAK 2 in the work log: force the row to `nowrap` and it is
    // this pair that fires, not that one).
    for (const box of [
      ...termGroups(figure),
      ...Array.from(figure.querySelectorAll<HTMLElement>(".lesson-label__lead")),
      ...slots(figure),
    ]) {
      const rect = box.getBoundingClientRect();
      expect(
        rect.left,
        `${id} at ${at.inside}px${answer ? ", answered" : ""}: "${(box.textContent ?? "").trim()}" hangs off the left`,
      ).toBeGreaterThanOrEqual(bounds.left - EPSILON);
      expect(
        rect.right,
        `${id} at ${at.inside}px${answer ? ", answered" : ""}: "${(box.textContent ?? "").trim()}" hangs off the right`,
      ).toBeLessThanOrEqual(bounds.right + EPSILON);
    }

    // And each slot still belongs to the term under it, which is the whole point of the
    // kind: reflowing must move a slot and its term together or not at all. The blank sits
    // on the statement's own line and the term captions it from below, so this reads the
    // term's painted maths against the bottom of the box above it — the term's container is
    // a `flex: 1` band whose top is where the band starts, not where anything is drawn.
    for (const part of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__part"),
    )) {
      const term = part.querySelector<HTMLElement>(".lesson-label__glyph");
      const slot = part.querySelector<HTMLElement>(".lesson-label__slot");
      if (term === null || slot === null) {
        throw new Error(`${id}: a part is missing its term or its slot`);
      }
      const ink = term.querySelector<HTMLElement>(".katex") ?? term;
      counted += 1;
      expect(
        ink.getBoundingClientRect().top,
        `${id} at ${at.inside}px: a term left the slot that names it`,
      ).toBeGreaterThanOrEqual(slot.getBoundingClientRect().bottom - EPSILON);
    }

    release();
  }

  return { figures, slots: counted, groups, connectors };
}

/**
 * The `nowrap` that makes a group indivisible, asserted as its own precondition.
 *
 * Everything above turns on it, and a rule nobody checks is an assumption. Asserted on the
 * computed style of a real group rather than on the stylesheet text, so it also covers
 * anything later in the cascade overriding it.
 */
function groupsAreIndivisible(figure: HTMLElement): void {
  const group = termGroups(figure)[0];
  if (group === undefined) {
    throw new Error("the figure drew no term groups");
  }
  expect(
    getComputedStyle(group).flexWrap,
    "a term group may wrap, so a connector can be split from its term",
  ).toBe("nowrap");
}

test("at the width a phone gives it, no labelling figure breaks anywhere unauthored", async () => {
  const swept = await sweepAt(CITY_PHONE, false);
  expect(swept.figures, "no lesson places a labelling figure").toBeGreaterThanOrEqual(3);
  expect(swept.slots, "the figures drew no slots to measure").toBeGreaterThanOrEqual(9);
  expect(swept.groups, "the figures drew no term groups to measure").toBeGreaterThanOrEqual(
    7,
  );
  // Most groups carry no connector at all, so the reading-line claim above is an inequality
  // over a population that could empty without anything else here changing.
  expect(
    swept.connectors,
    "no group carried a connector, so nothing was read against its blank",
  ).toBeGreaterThanOrEqual(4);
});

test("...and still not once every part has been named, which widens two of the three", async () => {
  const swept = await sweepAt(CITY_PHONE, true);
  expect(swept.figures, "no lesson places a labelling figure").toBeGreaterThanOrEqual(3);
  expect(swept.slots, "the figures drew no slots to measure").toBeGreaterThanOrEqual(9);
  expect(swept.groups, "the figures drew no term groups to measure").toBeGreaterThanOrEqual(
    7,
  );
  expect(
    swept.connectors,
    "no group carried a connector, so nothing was read against its blank",
  ).toBeGreaterThanOrEqual(4);
});

/* ------------------------------------------------------- 3. the desktop did not regress */

/**
 * The other end of the range, which is the half a narrow guard could quietly cost.
 *
 * At `CITY_DESKTOP` every one of these figures has always been one row of slots, and it has
 * to stay that way: a reflow policy that made the phone read correctly by splitting the
 * desktop too would be a worse figure everywhere it is not needed.
 */
test("at the width a desktop gives it, every labelling figure is still one row of slots", async () => {
  let figures = 0;
  let counted = 0;

  for (const id of liveVisualIds()) {
    const figure = await labelFigure(id, CITY_DESKTOP);
    if (figure === null) {
      release();
      continue;
    }
    figures += 1;
    counted += slots(figure).length;
    expect(
      slotLines(figure),
      `${id}: broke onto ${slotLines(figure)} lines at ${CITY_DESKTOP.inside}px, where it has always been one`,
    ).toBe(1);
    release();
  }

  expect(figures, "no lesson places a labelling figure").toBeGreaterThanOrEqual(3);
  expect(counted, "the figures drew no slots to measure").toBeGreaterThanOrEqual(9);
});

/* --------------------------------------------------------------- 4. the three instances */

/**
 * What each of the three figures does at `CITY_PHONE`, named rather than swept.
 *
 * The sweeps above hold for a figure that reflowed into six tidy lines. These say which
 * reflow each figure was measured into, in two parts: the SHAPE it is authored as, which is
 * font-independent, and a CEILING on the lines its slots may take.
 *
 * The ceiling is a ceiling rather than an equality, and that is not slack — it is the one
 * part of this that is genuinely font-dependent, and pinning it to an equality is how the
 * first version of this file passed on my machine and failed on CI:
 *
 *   - `radical-parts-label` puts its lead above its terms and keeps all three slots in one
 *     row. Its terms row is 208.4px in the widest fallback against 304.8 available, so this
 *     is a ~96px margin and holds in any font.
 *   - `fraction-exponent-label` is genuinely two readings and takes one line each, two slots
 *     then one. Both statements fit any line that ships, and the two together need 363.8px,
 *     so two lines is forced rather than chosen.
 *   - `power-parts-label` is the font-dependent one. It comes to 291.0px in the font that
 *     ships and 305.2px in DejaVu Sans — where "five copies of the base" measures 147.0px
 *     and the slot is wider than the expression it labels — against 304.8 available. So one
 *     line on some machines, two on others, and the claim that matters is that BOTH are
 *     correct: two lines means the `=` group went below, which is where a display equation
 *     divides. What must never happen is three lines, or a divided group, and the sweeps
 *     above hold the second of those.
 */
interface PhoneReflow {
  /** How the figure reads: one entry per statement, holding its group count. */
  readonly statements: readonly number[];
  /** The most lines its slots may occupy at `CITY_PHONE`. */
  readonly atMost: number;
}

const AT_PHONE: readonly [LessonVisualId, string, PhoneReflow][] = [
  [
    "radical-parts-label",
    "moves its lead above its terms, keeping the slots in one row",
    { statements: [3], atMost: 1 },
  ],
  [
    "fraction-exponent-label",
    "takes one line per statement",
    { statements: [1, 1], atMost: 2 },
  ],
  [
    "power-parts-label",
    "holds one line, or divides at its equals sign and no lower",
    { statements: [2], atMost: 2 },
  ],
];

test.each(AT_PHONE)("%s, at a phone width, %s", async (id, what, reflow) => {
  const figure = await labelFigure(id, CITY_PHONE);
  if (figure === null) {
    throw new Error(`${id} draws no labelling figure`);
  }
  expect(slots(figure).length, `${id}: the figure has no slots`).toBeGreaterThan(1);
  groupsAreIndivisible(figure);

  // The SHAPE, which is the authoring rather than the layout: how many readings this figure
  // is, and how many indivisible groups each is cut into. It is asserted because the line
  // counts below cannot see it — un-author `fraction-exponent-label`'s second statement back
  // into a connector and it still reflows onto two lines, with its separation back in the
  // LaTeX as a `\quad` that indents the wrapped line.
  const shape = Array.from(
    figure.querySelectorAll<HTMLElement>(".lesson-label__statement"),
  ).map((statement) => statement.querySelectorAll(".lesson-label__group").length);
  expect(shape, `${id}: the figure is not ${reflow.statements.length} reading(s)`).toEqual([
    ...reflow.statements,
  ]);

  expect(
    slotLines(figure),
    `${id}: it ${what}, so its slots belong on at most ${reflow.atMost} line(s)`,
  ).toBeLessThanOrEqual(reflow.atMost);

  // Answering widens the two figures whose names outrun the empty box, so the ceiling has
  // to survive it — and so does the shape, which a re-render must not restructure.
  await answerEveryPart(figure);
  expect(
    slotLines(figure),
    `${id}: answering it moved the slots onto ${slotLines(figure)} line(s)`,
  ).toBeLessThanOrEqual(reflow.atMost);
  expect(
    Array.from(figure.querySelectorAll<HTMLElement>(".lesson-label__statement")).map(
      (statement) => statement.querySelectorAll(".lesson-label__group").length,
    ),
    `${id}: answering it restructured the figure`,
  ).toEqual([...reflow.statements]);
});

/**
 * WHERE `power-parts-label` divides when it is too wide for its line — which on a phone
 * depends on the font, so the mechanism has to be exercised rather than waited for.
 *
 * The figure comes to 291.0px of 304.8 in the font that ships and 305.2px in DejaVu Sans,
 * where "five copies of the base" measures 147.0px and the slot is then wider than the
 * expression above it. So one line on some machines and two on others, and pinning the line
 * count to an equality is exactly how the first version of this file passed locally and
 * failed on CI. What must hold on every machine is that the two-line case divides at the
 * `=` — the one place a display equation may — and not between the base and its exponent.
 *
 * The widening is the figure's own `font-size`, which is deliberate and is not a font
 * simulation: it grows the terms by a known factor with no dependence on which families the
 * machine has installed, and it drives the figure through the same "row too wide" path that
 * a wide UI font drives it through.
 */
test("too wide for its line, power-parts-label divides at its equals sign and nowhere else", async () => {
  const figure = await labelFigure("power-parts-label", CITY_PHONE);
  if (figure === null) {
    throw new Error("power-parts-label draws no labelling figure");
  }
  const board = figure.closest(".lesson-interactive") as HTMLElement;
  const groups = () => termGroups(figure);

  // Two groups, and the second is the one the `=` opens. Stated on the connector rather
  // than on a position, so the assertion below says WHY that group is the one that moves.
  expect(groups().length, "the equation is not in two groups").toBe(2);
  expect(
    groups()[1]?.querySelector("[data-latex]")?.getAttribute("data-latex"),
    "the second group is not the one opened by the equals sign",
  ).toBe("=");
  expect(slotLines(figure), "the figure does not start on one line").toBe(1);

  figure.style.fontSize = "2.4rem";
  await document.fonts.ready;

  expect(slotLines(figure), "widened past its line, the figure did not divide at all").toBe(
    2,
  );
  for (const group of groups()) {
    expect(
      spread(group),
      "widened past its line, a group divided instead of moving whole",
    ).toBeLessThanOrEqual(2);
    expect(
      group.getBoundingClientRect().right,
      "widened past its line, a group hung off the right of the board",
    ).toBeLessThanOrEqual(board.getBoundingClientRect().right + EPSILON);
  }
  expect(
    (groups()[1] as HTMLElement).getBoundingClientRect().top,
    "the group carrying the equals sign is not the one that went below",
  ).toBeGreaterThan((groups()[0] as HTMLElement).getBoundingClientRect().top);
});
