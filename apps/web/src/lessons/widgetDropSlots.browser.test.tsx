/**
 * The drop-slot convention, held across every interaction kind that has a slot.
 *
 * QA could not read the label-the-parts figures: one dashed box held the term AND the words
 * "drag a name here", so a single border was claiming both "this is the piece being talked
 * about" and "put something here", and the eye had no way to take the two apart. The words
 * were also printed once per slot, which is one instruction three times over (R8), and they
 * described only half of what the widget accepts, since `usePickup` takes a tap on a name
 * followed by a tap on a slot as readily as a drag.
 *
 * So the term is now plain maths with no box of its own, the slot underneath it carries the
 * whole receiving affordance, and no slot anywhere prints an instruction. This file is what
 * stops any of that quietly coming back:
 *
 *   - every slot still exposes an accessible name that says WHICH term it belongs to, which
 *     is the one thing the deleted words were load-bearing for;
 *   - no slot prints instruction copy any more, asserted as an absence;
 *   - the term and the slot are separate elements, the slot sits under the term, and only
 *     the slot has a border;
 *   - empty, dragged-over and filled are three visibly different things;
 *   - the figure can still be finished by dragging AND from the keyboard alone.
 *
 * These need real Chromium and the real stylesheet: "is the empty box big enough to read as
 * a box" and "is the slot below the term" are questions only layout can answer, and jsdom
 * has none. `styles.css` is imported LAST, as `main.tsx` imports it, so what is measured
 * here is what ships (see lessonVisualSurd.browser.test.tsx for why the order matters).
 */

import { afterEach, expect, test } from "vitest";

import { katexBaseline, readingLine } from "./katexBaseline";
import { visualsBuiltOn, visualsMatching } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Every visual that draws a slot, or that used to print words inside one. */
const SLOT_VISUALS: readonly LessonVisualId[] = [
  "power-parts-label",
  "radical-parts-label",
  "fraction-exponent-label",
  "zero-exponent-table",
  "unlike-sum-table",
  "negative-exponent-order",
  "fraction-exponent-undo-table",
  "rational-end-behavior-table",
  "linear-slope-ratio-table",
  "rational-simplify-order",
  "linear-line-convert-order",
];

/**
 * Every widget built on the labelling kind, derived from the sources rather than listed.
 *
 * It WAS a written-down three — `power-parts-label`, `radical-parts-label`,
 * `fraction-exponent-label` — and the tree had grown to five: `interval-parts-label` and
 * `exp-feature-label` build on the same kind, inherit every layout rule below, and sat
 * outside every claim in this file. That is the population defect `.cursor/rules` describes,
 * and it is why the 2.0px baseline stagger this file now measures went unseen: the one
 * figure exhibiting it was `exp-feature-label`.
 */
const LABEL_VISUALS: readonly LessonVisualId[] = visualsBuiltOn("LabelParts");

/**
 * A floor, so the sweeps below cannot pass by running over an empty or shrunken list, and
 * deliberately not a ceiling: a sixth labelling figure should join every claim here without
 * anyone editing a number.
 */
const LABEL_FLOOR = 5;

/** Subpixel slack on a KaTeX box, in px. The defects these were written for are 2px and up. */
const BAND_SLACK = 2;

const SLOT_SELECTOR = ".lesson-label__slot, .lesson-table__slot";

/**
 * The copy that used to sit inside the slots, plus the near variants an author might reach
 * for next. Asserted ABSENT, so putting an instruction back into a receptacle fails loudly
 * instead of shipping two idioms for the same thing.
 */
const PLACEHOLDER_COPY =
  /drag a (name|value|label|term|step) here|drop (a|it|the) [a-z]* ?here|(drag|drop|tap) here|goes here|place (it|one) here/i;

/** The text a sighted learner can read: `.visually-hidden` nodes do not count as visible. */
function visibleText(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  for (const hidden of Array.from(clone.querySelectorAll(".visually-hidden"))) {
    hidden.remove();
  }
  return clone.textContent ?? "";
}

function slots(root: ParentNode): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>(SLOT_SELECTOR));
}

function chip(root: ParentNode, label: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.getAttribute("aria-label") === label,
  );
  if (!found) {
    throw new Error(`no control labelled "${label}"`);
  }
  return found;
}

/**
 * This file measures at `FIGURE_CONTENT_CAP`, and that is a MID-RANGE SPOT CHECK rather
 * than a container: see `readingWidths.ts`, where the three widths a learner really gets
 * are named and measured. It stays exactly where it is, for a counter-intuitive reason —
 * at `CITY_DESKTOP` no labelling figure wraps at any slot size in range, so a family that
 * measured only at the real desktop width could not see a wrap at all.
 *
 * What it does NOT prove is anything about a phone, which is a third narrower and where
 * all three figures wrapped for as long as 460 was the only width measured.
 * `labelFigureNarrow.browser.test.tsx` is the other end of that range.
 */

async function board(id: LessonVisualId, onComplete?: () => void): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} onComplete={onComplete} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

function drop() {
  h?.cleanup();
  h = null;
}

/**
 * A labelling figure whose KaTeX has actually rendered.
 *
 * `board` returns as soon as `.lesson-interactive` exists, and `useKatex` typesets in an
 * effect after that, so every measurement below can run against empty glyph spans. It is a
 * race the machine wins most of the time and loses under a full suite: these tests passed
 * alone and failed inside `test:browser` with "a statement draws no terms", which is a
 * guard reporting on layout it never saw rather than a defect.
 */
async function labelBoard(id: LessonVisualId): Promise<HTMLElement> {
  const figure = await board(id);
  await waitFor(
    () => figure.querySelector(".lesson-label__glyph .katex") !== null,
    `${id} typesets its terms`,
  );
  return figure;
}

/** How a slot reads, as one comparable string. Two states that differ must differ here. */
function look(slot: HTMLElement): string {
  const s = getComputedStyle(slot);
  return [s.borderStyle, s.borderTopColor, s.backgroundColor].join(" | ");
}

/** True when some loaded stylesheet carries a rule `match` accepts. */
function hasRule(
  match: (selector: string, style: CSSStyleDeclaration) => boolean,
): boolean {
  return Array.from(document.styleSheets).some((sheet) => {
    try {
      return Array.from(sheet.cssRules).some((rule) => {
        const styleRule = rule as CSSStyleRule;
        return (
          typeof styleRule.selectorText === "string" &&
          match(styleRule.selectorText, styleRule.style)
        );
      });
    } catch {
      return false; // cross-origin sheet; not ours either way.
    }
  });
}

/* ------------------------------------------------------------- 1. the accessible name */

/**
 * The non-negotiable one, stated exactly rather than by pattern.
 *
 * Deleting the visible words is only safe if something else still tells a screen-reader user
 * which term each slot belongs to; three slots all reading "empty" would be worse than the
 * copy that was removed. These names come from each part's `spoken` field, so they are built
 * from the widget's own data — "the written out product" is nowhere in the rendering, and
 * KaTeX's output for `3 \cdot 3 \cdot 3 \cdot 3 \cdot 3` could not have produced it.
 */
test("power-parts-label: each slot is named after the term it sits under", async () => {
  const figure = await board("power-parts-label");
  const named = slots(figure).map((s) => s.getAttribute("aria-label"));

  expect(named).toEqual([
    "Label for the 3 on the line",
    "Label for the raised 5",
    "Label for the written out product",
  ]);
});

test("and once a name lands, the slot says which term got which name", async () => {
  const figure = await board("power-parts-label");
  chip(figure, "base").click();
  chip(figure, "Label for the 3 on the line").click();

  await waitFor(
    () => slots(figure).some((s) => s.getAttribute("data-named") === "yes"),
    "the base is named",
  );
  const filled = slots(figure).find((s) => s.getAttribute("data-named") === "yes");
  expect(filled?.getAttribute("aria-label")).toBe("the 3 on the line is labelled base");
});

/* --------------------------------------------------- 2. the copy is gone, everywhere */

test("no slot in any widget prints an instruction, and each one names its target", async () => {
  let measured = 0;

  for (const id of SLOT_VISUALS) {
    const figure = await board(id);

    expect(
      visibleText(figure),
      `${id}: placeholder instruction copy is still printed in the widget`,
    ).not.toMatch(PLACEHOLDER_COPY);

    // The single statement of the task lives on the status line, and says it once.
    const stated = (
      figure.querySelector(".lesson-interactive__status")?.textContent ?? ""
    ).trim();
    expect(stated.length, `${id}: the widget never states its task`).toBeGreaterThan(20);

    const found = slots(figure);
    const names = found.map((s) => (s.getAttribute("aria-label") ?? "").trim());
    for (const [i, name] of names.entries()) {
      expect(name.length, `${id}: slot ${i} has no accessible name`).toBeGreaterThan(8);
    }
    // One shared name across several slots would pass the length check and still leave a
    // screen-reader user unable to tell them apart, so distinctness is the real assertion.
    expect(new Set(names).size, `${id}: two slots share one accessible name`).toBe(
      names.length,
    );

    for (const slot of found.filter((s) => s.getAttribute("data-named") !== "yes")) {
      expect(visibleText(slot).trim(), `${id}: an empty slot still prints words`).toBe("");
    }

    measured += found.length;
    drop();
  }

  // Three labelling figures at three slots each, plus one open table blank in each of the
  // two tables. Without a floor this sweep would pass the day the selector stops matching.
  expect(measured, "the sweep found slots to measure").toBeGreaterThanOrEqual(11);
});

/* --------------------------------------- 3. the term and the slot are separate things */

test("the term reads on its own under its slot, and only the slot has a border", async () => {
  let measured = 0;

  for (const id of LABEL_VISUALS) {
    const figure = await labelBoard(id);
    const groups = Array.from(figure.querySelectorAll<HTMLElement>(".lesson-label__part"));
    expect(groups.length, `${id}: no labelled parts`).toBeGreaterThan(2);

    const tops: number[] = [];
    for (const group of groups) {
      const glyph = group.querySelector<HTMLElement>(".lesson-label__glyph");
      const slot = group.querySelector<HTMLButtonElement>(".lesson-label__slot");
      if (!glyph || !slot) {
        throw new Error(`${id}: a part is missing its term or its slot`);
      }

      // The defect being guarded: the term must not be a control, and must not be drawn
      // with a border, because a bordered term is a term that looks like a target.
      expect(glyph.tagName, `${id}: the term is a control again`).toBe("SPAN");
      expect(
        getComputedStyle(glyph).borderTopStyle,
        `${id}: the term has a border of its own again`,
      ).toBe("none");
      expect(
        getComputedStyle(group).borderTopStyle,
        `${id}: the old dashed box around term-plus-slot is back`,
      ).toBe("none");

      // ...and the slot is the thing that receives, drawn OVER the term it belongs to: the
      // blank sits on the line the statement is read along and the term captions it from
      // below. Measured on the term's painted maths rather than on its container, because
      // the container is a `flex: 1` band and its top is where the band starts, not where
      // anything is drawn.
      expect(getComputedStyle(slot).borderTopStyle, `${id}: the slot is not dashed`).toBe(
        "dashed",
      );
      const ink = glyph.querySelector<HTMLElement>(".katex") ?? glyph;
      const term = ink.getBoundingClientRect();
      const box = slot.getBoundingClientRect();
      expect(term.top, `${id}: the term is not underneath its slot`).toBeGreaterThanOrEqual(
        box.bottom - 1,
      );

      // Big enough to read as a receptacle with no words in it (3.5rem x 2.25rem).
      expect(
        box.width,
        `${id}: an empty slot is too narrow to read as a box`,
      ).toBeGreaterThan(50);
      expect(box.height, `${id}: an empty slot collapsed`).toBeGreaterThan(30);

      // And inside the widget: a slot pushed off the edge is a slot nobody can hit.
      const bounds = figure.getBoundingClientRect();
      expect(
        box.left,
        `${id}: a slot hangs off the left of the widget`,
      ).toBeGreaterThanOrEqual(bounds.left - 1);
      expect(
        box.right,
        `${id}: a slot hangs off the right of the widget`,
      ).toBeLessThanOrEqual(bounds.right + 1);

      tops.push(box.top);
      measured += 1;
    }

    // Empty slots form one row rather than a staircase, which is what makes the figure
    // scan as "a box over each part" instead of three unrelated boxes. At this width that
    // also means the whole figure is on one line — which is true HERE and not at every
    // width: two of them cannot hold one line on a phone, and where they reflow the
    // claim becomes "no statement's terms are split", held in labelFigureNarrow.
    expect(
      Math.max(...tops) - Math.min(...tops),
      `${id}: the empty slots do not line up`,
    ).toBeLessThanOrEqual(2);

    drop();
  }

  expect(measured, "the sweep measured terms against slots").toBeGreaterThanOrEqual(9);
  expect(
    LABEL_VISUALS.length,
    "the labelling family derived to fewer widgets than exist",
  ).toBeGreaterThanOrEqual(LABEL_FLOOR);
});

/* ------------------------------------------------------ 3b. the blanks and terms bands */

/**
 * A labelling figure is TWO ROWS: the statement with its blanks along the top, the terms
 * captioning them underneath. Nothing may be drawn across the line between them.
 *
 * The defect, measured at this width: `.lesson-label__lead` — a statement's opening maths,
 * and the connectors between groups — was `align-self: center`, centred on the whole part
 * beside it. A part is a band, a gap, and a band, so the centre of one is the BOUNDARY
 * between the two rows, and every lead was therefore drawn straddling it.
 * `power-parts-label`'s `=` was drawn 15.8px into the row of empty boxes.
 *
 * Stated as the geometry rather than as the rule that produces it, so it also holds if the
 * mechanism changes: the terms begin below where the blanks end, and a lead is READ on the
 * line its blanks are on. The second half of that used to say "centred", and centring is
 * what the stylesheet was doing, so the assertion could only ever agree with it — see the
 * comment on the baseline expectation below for the 15.8px it agreed with.
 */
test("the blanks share the statement's line and the terms sit in a band below them", async () => {
  let statements = 0;
  let leads = 0;

  for (const id of LABEL_VISUALS) {
    const figure = await labelBoard(id);
    for (const statement of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__statement"),
    )) {
      const boxes = slots(statement).map((s) => s.getBoundingClientRect());
      const terms = Array.from(
        statement.querySelectorAll<HTMLElement>(".lesson-label__glyph"),
      ).flatMap((g) => {
        const ink = g.querySelector<HTMLElement>(".katex");
        return ink === null ? [] : [ink.getBoundingClientRect()];
      });
      expect(boxes.length, `${id}: a statement draws no blanks`).toBeGreaterThan(0);
      expect(terms.length, `${id}: a statement draws no terms`).toBeGreaterThan(0);
      statements += 1;

      // Read off the rendered slots rather than from the stylesheet: a rule can be present
      // and beaten, and this is the line the learner actually sees.
      const blanksTop = Math.min(...boxes.map((b) => b.top));
      const blanksBottom = Math.max(...boxes.map((b) => b.bottom));

      // The bands are disjoint, with the terms BELOW. Without this the lead claim could be
      // satisfied by a figure that had collapsed into one row.
      const termsTop = Math.min(...terms.map((t) => t.top));
      expect(
        termsTop,
        `${id}: the terms reach ${(blanksBottom - termsTop).toFixed(1)}px up into the row of blanks`,
      ).toBeGreaterThanOrEqual(blanksBottom - BAND_SLACK);

      for (const lead of Array.from(
        statement.querySelectorAll<HTMLElement>(".lesson-label__lead"),
      )) {
        const ink = lead.querySelector<HTMLElement>(".katex") ?? lead;
        const box = ink.getBoundingClientRect();
        const blanksCentre = (blanksTop + blanksBottom) / 2;
        const said = (lead.textContent ?? "").trim().slice(0, 24);
        leads += 1;

        // ON THE BASELINE, WHICH THE BOX'S CENTRE ONLY ACCIDENTALLY IMPLIES. This compared
        // the ink's centre with the band's for as long as the stylesheet centred the ink in
        // the band, which made it the rule restated: measured over all five figures it
        // reported 0.0px everywhere, including on the figure a reader could see was wrong.
        // A KaTeX box runs from its baseline less the expression's height to its baseline
        // plus the expression's depth, and both swing with the content, so centring the box
        // puts the baseline wherever `(height - depth) / 2` lands. RAD.3's
        // `x^{\dfrac{5}{4}} \;\text{has}` is nearly all height and has no depth at all: its
        // box centre was 0.0px off the band and its baseline 15.8px below where it belonged,
        // which drew the `x` and the word `has` along the bottom edge of the dashed boxes.
        const seat = katexBaseline(lead);
        expect(seat, `${id}: the lead "${said}" has no readable baseline`).not.toBeNull();
        const want = readingLine(lead, blanksCentre);
        const off = (seat?.baseline ?? Number.NaN) - want;
        expect(
          Math.abs(off),
          `${id}: the lead "${said}" is read ${off.toFixed(1)}px off the line its blanks are on`,
        ).toBeLessThanOrEqual(BAND_SLACK);

        // And it does not reach down into the terms captioning those blanks. A lead is free
        // to reach UP over the blanks — RAD.3's superscript fraction stands 29.8px above
        // them, and `.lesson-label__figure` reserves the room for it — but the band below is
        // another row's, and nothing may be drawn across it.
        expect(
          box.bottom,
          `${id}: the lead "${said}" is drawn ${(box.bottom - termsTop).toFixed(1)}px into the row of terms`,
        ).toBeLessThanOrEqual(termsTop + BAND_SLACK);
      }
    }
    drop();
  }

  // Floors, because every assertion above is an inequality and all of them hold vacuously
  // over a figure with no leads in it.
  expect(statements, "no statement was measured").toBeGreaterThanOrEqual(LABEL_FLOOR);
  expect(
    leads,
    "no lead was measured, so nothing above was asserted",
  ).toBeGreaterThanOrEqual(6);
});

/**
 * And the terms sit ON one line, not merely in one band.
 *
 * The band assertion above is an "at or below", which two terms can satisfy while being 2px
 * out of line with each other, and that is exactly what shipped. `flex-end` aligns BOXES; a
 * KaTeX box's bottom is its baseline plus its DEPTH, and depth swings with the content
 * (6.4px under `(0,\, 7)`, 0.0px under a bare `3`), so flush boxes are staggered baselines.
 * `exp-feature-label`'s `y = 5` sat 2.0px off the two terms beside it at three of the four
 * widths measured, and nothing in this file, in `labelFigureWhole` or in `labelFigureNarrow`
 * compared one term's vertical position to another's, so all three were green over it.
 *
 * Stated on BASELINES, recovered from KaTeX's own strut (see `katexBaseline`), because that
 * is the property a reader sees and the one box bottoms only accidentally imply.
 *
 * Per STATEMENT rather than per figure: two statements in one figure are two readings and
 * are free to sit on different lines, as they do at phone width where the second wraps
 * below the first.
 */
test("the terms in a statement sit on one baseline, not merely in one band", async () => {
  let compared = 0;
  let worst = { spread: 0, where: "nothing measured" };

  for (const id of LABEL_VISUALS) {
    const figure = await labelBoard(id);
    for (const statement of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__statement"),
    )) {
      // A raised exponent is deliberately OFF this line, and the test below is what proves
      // it is still raised; including it here would assert the opposite.
      const ordinary = Array.from(
        statement.querySelectorAll<HTMLElement>(
          '.lesson-label__part[data-raised="no"] .lesson-label__glyph',
        ),
      );
      const baselines = ordinary.flatMap((el) => {
        const at = katexBaseline(el);
        return at === null ? [] : [at.baseline];
      });
      expect(
        baselines.length,
        `${id}: ${ordinary.length} ordinary terms in a statement and ${baselines.length} readable baselines, so KaTeX did not render or the strut moved`,
      ).toBe(ordinary.length);

      // A statement with one ordinary term compares nothing, and there is a real one:
      // `fraction-exponent-label`'s second reading names a single part. Skipped here and
      // counted in the floor below, rather than asserted over and silently trivial.
      if (baselines.length < 2) {
        continue;
      }
      const spread = Math.max(...baselines) - Math.min(...baselines);
      if (spread > worst.spread) {
        worst = { spread, where: id };
      }
      compared += 1;
      expect(
        spread,
        `${id}: the terms in one statement sit on baselines ${spread.toFixed(1)}px apart, so the row they caption is out of line with itself`,
      ).toBeLessThanOrEqual(BAND_SLACK / 2);
    }
    drop();
  }

  // The floor counts statements that COMPARED two terms, not statements visited: a sweep
  // over five figures whose statements all held one term each would otherwise be green
  // having measured nothing.
  expect(
    compared,
    "no statement held two ordinary terms, so nothing was compared",
  ).toBeGreaterThanOrEqual(LABEL_FLOOR);
  // The slack is tighter than BAND_SLACK on purpose, and this says so: the defect this was
  // written for measured 2.0px, which the 2px band slack would have waved through.
  expect(worst.spread, `worst spread was at ${worst.where}`).toBeLessThan(BAND_SLACK);
});

/**
 * The `[data-raised]` exception, named and proved rather than quietly left out.
 *
 * Every claim above is about terms sharing a band, and one kind of term deliberately does
 * not sit where its neighbours do: an exponent is drawn at the TOP of the terms band and
 * small, because that is what makes `3^5` read as a power rather than as two numbers side
 * by side. A part that is exempt from the shared line and a part that has fallen off it
 * look identical from outside, so the exemption is asserted in BOTH directions: a raised
 * part that stopped being raised fails here, and nothing else may drift off that line under
 * cover of the exception.
 */
test("a raised term sits above the line its neighbours share, and only a raised one does", async () => {
  const raisedBy: string[] = [];
  let ordinary = 0;

  for (const id of LABEL_VISUALS) {
    const figure = await labelBoard(id);
    for (const part of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__part"),
    )) {
      const group = part.parentElement as HTMLElement;
      const ink = part.querySelector<HTMLElement>(".lesson-label__glyph .katex");
      const others = Array.from(
        group.querySelectorAll<HTMLElement>('.lesson-label__part[data-raised="no"]'),
      ).flatMap((p) => {
        const other = p.querySelector<HTMLElement>(".lesson-label__glyph .katex");
        return other === null || p === part ? [] : [other.getBoundingClientRect().bottom];
      });
      if (ink === null || others.length === 0) {
        continue;
      }
      const bottom = ink.getBoundingClientRect().bottom;
      const neighbour = Math.max(...others);

      if (part.dataset.raised === "yes") {
        expect(
          bottom,
          `${id}: a term marked raised sits on the same line as its base, so it no longer reads as an exponent`,
        ).toBeLessThan(neighbour - 4);
        raisedBy.push(`${id}: ${(neighbour - bottom).toFixed(1)}px`);
      } else {
        ordinary += 1;
        expect(
          Math.abs(bottom - neighbour),
          `${id}: an ordinary term sits ${(bottom - neighbour).toFixed(1)}px off the line its neighbours share`,
        ).toBeLessThanOrEqual(BAND_SLACK);
      }
    }
    drop();
  }

  // Both directions need something to have been measured. Without these the pair is two
  // claims about an empty set: no raised part anywhere, and no ordinary one to compare.
  expect(
    raisedBy.length,
    "no raised term was measured, so the exception was never exercised",
  ).toBeGreaterThan(0);
  expect(ordinary, "no ordinary term was measured against a neighbour").toBeGreaterThan(0);
});

/* ------------------------------------------------------- 4. the states are tellable apart */

test("empty, dragged-over and filled slots are three different-looking things", async () => {
  const figure = await board("power-parts-label");
  const first = () => slots(figure)[0] as HTMLButtonElement;

  const empty = look(first());
  expect(getComputedStyle(first()).borderTopStyle, "an empty slot is not dashed").toBe(
    "dashed",
  );

  // Carrying a name over the slot. `:hover` does not fire during a native drag, which is
  // why this state is held in the component rather than left to CSS.
  chip(figure, "base").dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
  first().dispatchEvent(new DragEvent("dragenter", { bubbles: true }));
  await waitFor(
    () => first().getAttribute("data-over") === "yes",
    "slot marked as a target",
  );
  const over = look(first());
  expect(over, "a slot being dragged over looks the same as an untouched one").not.toBe(
    empty,
  );
  // Still dashed while it is only being offered something, so it cannot read as answered.
  expect(
    getComputedStyle(first()).borderTopStyle,
    "a dragged-over slot reads as filled",
  ).toBe("dashed");

  first().dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
  await waitFor(() => first().getAttribute("data-over") === "no", "the target released");
  expect(look(first()), "the slot kept its drag styling after the name left").toBe(empty);

  // Filled, which is a third look again: solid rather than dashed, and tinted.
  first().dispatchEvent(new DragEvent("drop", { bubbles: true }));
  await waitFor(() => first().getAttribute("data-named") === "yes", "the name landed");
  const filled = look(first());
  expect(filled, "a filled slot looks like an empty one").not.toBe(empty);
  expect(filled, "a filled slot looks like one being dragged over").not.toBe(over);
  expect(getComputedStyle(first()).borderTopStyle, "a filled slot is still dashed").toBe(
    "solid",
  );
  expect(visibleText(first()).trim(), "a filled slot does not show its name").toBe("base");
});

test("a slot can be reached and marked by keyboard alone", async () => {
  const figure = await board("power-parts-label");
  const slot = slots(figure)[0] as HTMLButtonElement;

  slot.focus();
  expect(document.activeElement, "an empty slot cannot be focused").toBe(slot);

  // What marks that focus is the global button rule. Asserting the rule is loaded keeps
  // "the focus state is distinguishable" from being a claim no test actually checks.
  expect(
    hasRule((selector, style) => {
      return (
        selector.includes("button:focus-visible") && style.cssText.includes("outline: 3px")
      );
    }),
    "no loaded stylesheet outlines a focused button",
  ).toBe(true);
});

/* ------------------------------------------------------------ 5. both paths still work */

/** The three names of board one of `power-parts-label`, against the slot each belongs to. */
const POWER_PAIRS: readonly [string, string][] = [
  ["base", "Label for the 3 on the line"],
  ["exponent", "Label for the raised 5"],
  ["five copies of the base", "Label for the written out product"],
];

test("power-parts-label: dragging every name onto its slot finishes the figure", async () => {
  let completed = 0;
  const figure = await board("power-parts-label", () => {
    completed += 1;
  });

  for (const [name, target] of POWER_PAIRS) {
    const slot = chip(figure, target);
    chip(figure, name).dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
    slot.dispatchEvent(new DragEvent("dragenter", { bubbles: true }));
    slot.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
    slot.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true }));
    await waitFor(
      () => slot.getAttribute("data-named") === "yes",
      `${name} landed by drag`,
    );
  }

  await waitFor(() => completed === 1, "the gate opened on the dragged figure");
});

test("power-parts-label: focusing each slot and pressing it finishes the figure too", async () => {
  let completed = 0;
  const figure = await board("power-parts-label", () => {
    completed += 1;
  });

  for (const [name, target] of POWER_PAIRS) {
    // Exactly what a keyboard does: tab to the name, press it, tab to the slot, press it.
    const held = chip(figure, name);
    held.focus();
    expect(document.activeElement, `${name} is not reachable by keyboard`).toBe(held);
    held.click();

    const slot = chip(figure, target);
    slot.focus();
    expect(document.activeElement, `${target} is not reachable by keyboard`).toBe(slot);
    slot.click();
    await waitFor(() => slot.getAttribute("data-named") === "yes", `${name} landed by key`);
  }

  await waitFor(() => completed === 1, "the gate opened on the keyboard-only figure");
});

/* -------------------------------------------------------- 6. the two other slot shapes */

test("zero-exponent-table: the open blank is an empty box that names its row", async () => {
  const figure = await board("zero-exponent-table");
  const slot = figure.querySelector<HTMLButtonElement>(".lesson-table__slot");
  if (!slot) {
    throw new Error("the table has no open blank");
  }

  expect(visibleText(slot).trim(), "the blank still prints words").toBe("");
  expect(slot.getAttribute("aria-label") ?? "").toMatch(/^Value for the row .+/);

  const box = slot.getBoundingClientRect();
  expect(box.width, "the blank is too narrow to aim at").toBeGreaterThan(50);
  expect(box.height, "the blank collapsed once the words came out").toBeGreaterThan(24);
  expect(getComputedStyle(slot).borderTopStyle, "the blank is not dashed").toBe("dashed");
});

/* ------------------------------------------ 7. and the third: a slot in an equation */

/**
 * A slot in an equation holds the term written in it.
 *
 * QA photographed POL.8's `divide-rebuild-builder`. Its three positions are named on the
 * board — `divisor`, `quotient`, `remainder` — and each of those words is printed inside a
 * box `3.1rem` wide, so all three ran out of their own borders and over the boxes beside
 * them: the statement read as one smear of overlapping letters rather than as three
 * receptacles. The same happens the moment a position is filled, because what lands in it is
 * `x + 3`, not a digit.
 *
 * `.lesson-equation__slot` was written for the ONE thing that box originally held: a typed
 * number, in a fixed-pitch column that must not move as the learner types. Nine other
 * widgets then reused the class for a slot that holds maths or a word, and a fixed `width`
 * is the wrong promise for those — a box that cannot grow does not clip its content, it
 * PAINTS IT OUTSIDE ITSELF, which is the same failure mode as the classify chips in
 * `classifyChipFit`.
 *
 * The population is therefore every widget that draws one of these slots, derived from the
 * sources, and NOT the D4 board it was reported on: the typed `<input>` shares the class and
 * keeps its fixed width, so this sweep is what says the two were separated by what they hold
 * rather than by which lesson they are in.
 */
const EQUATION_SLOT_VISUALS: readonly LessonVisualId[] =
  visualsMatching(/lesson-equation__slot/);

/**
 * Floors under the sweep below: the widgets it found, and the slots it actually measured.
 *
 * Both, because they fail differently. Zero widgets is a glob or a registry rename; a full
 * list of widgets whose slots are all empty at mount is a sweep that visited everything and
 * compared nothing, and containment over no ink is green.
 */
const EQUATION_SLOT_WIDGET_FLOOR = 10;
const EQUATION_SLOT_INK_FLOOR = 17;

/** What is drawn inside a slot, as one box, or null when the slot is empty. */
function contentsOf(slot: HTMLElement): DOMRect | null {
  // KaTeX's `.base` rather than its `.katex` root, which is an inline box and reports the
  // line's height instead of the expression's.
  const bases = Array.from(slot.querySelectorAll<HTMLElement>(".katex .base"));
  const painted: DOMRect[] =
    bases.length > 0
      ? bases.map((base) => base.getBoundingClientRect())
      : Array.from(slot.children).map((child) => child.getBoundingClientRect());
  if (painted.length === 0) {
    // A bare text node — the word naming an unfilled position — has no element to measure.
    const span = document.createRange();
    span.selectNodeContents(slot);
    painted.push(span.getBoundingClientRect());
  }
  const left = Math.min(...painted.map((b) => b.left));
  const right = Math.max(...painted.map((b) => b.right));
  const top = Math.min(...painted.map((b) => b.top));
  const bottom = Math.max(...painted.map((b) => b.bottom));
  return right - left < 1 ? null : new DOMRect(left, top, right - left, bottom - top);
}

test("every non-typed equation slot holds its own term inside its own border", async () => {
  let measured = 0;
  const drawn: string[] = [];

  for (const id of EQUATION_SLOT_VISUALS) {
    const figure = await board(id);
    const found = Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-equation__slot"),
    ).filter((slot) => slot.tagName !== "INPUT");
    if (found.length > 0) {
      drawn.push(id);
    }

    for (const slot of found) {
      const held = contentsOf(slot);
      if (held === null) {
        // An empty slot contains nothing, and asserting containment over it is the
        // vacuous case the ink floor below exists to rule out.
        continue;
      }
      const box = slot.getBoundingClientRect();
      const said = (slot.getAttribute("aria-label") ?? slot.textContent ?? "").trim();

      // Soft, so one red run names every slot that overflows rather than the first.
      expect
        .soft(
          held.left,
          `${id}: "${said}" is drawn ${(box.left - held.left).toFixed(1)}px out of the left of its slot`,
        )
        .toBeGreaterThanOrEqual(box.left - BAND_SLACK);
      expect
        .soft(
          held.right,
          `${id}: "${said}" is drawn ${(held.right - box.right).toFixed(1)}px out of the right of its slot`,
        )
        .toBeLessThanOrEqual(box.right + BAND_SLACK);
      expect
        .soft(
          held.top,
          `${id}: "${said}" is drawn ${(box.top - held.top).toFixed(1)}px out of the top of its slot`,
        )
        .toBeGreaterThanOrEqual(box.top - BAND_SLACK);
      expect
        .soft(
          held.bottom,
          `${id}: "${said}" is drawn ${(held.bottom - box.bottom).toFixed(1)}px out of the bottom of its slot`,
        )
        .toBeLessThanOrEqual(box.bottom + BAND_SLACK);

      measured += 1;
    }
    drop();
  }

  expect(
    drawn.length,
    `only ${drawn.length} of ${EQUATION_SLOT_VISUALS.length} widgets in the derived population drew an equation slot`,
  ).toBeGreaterThanOrEqual(EQUATION_SLOT_WIDGET_FLOOR);
  expect(
    measured,
    "no slot had anything in it, so every containment above held over an empty box",
  ).toBeGreaterThanOrEqual(EQUATION_SLOT_INK_FLOOR);
  expect(drawn, "the board this was reported on drew no slot to measure").toContain(
    "divide-rebuild-builder",
  );
});

/**
 * ...and the statement those slots are set into stays legible as they fill.
 *
 * The sweep above is one photograph per board, taken at mount, so on POL.8 it sees three
 * slots holding the WORDS `divisor`, `quotient` and `remainder`. That is where the defect
 * was reported and it is not where the defect ends: each of those positions is answered
 * with `x + 3`, `x + 6` and `4`, so the widest thing a slot is ever asked to hold arrives
 * only after the learner has placed something, and a sweep that never taps a chip cannot
 * see it. The board is therefore driven through all four of its states here.
 *
 * The second claim is the one QA actually reported, and containment does not imply it.
 * What the photograph shows is not a word leaving its box, it is the statement reading as
 * `divisor xquotient +remainder`: the `\times` and the `+` that bind the three positions
 * together are printed UNDER the words beside them. Those operators are not in anybody's
 * slot, so every containment assertion in the file can hold while the sentence is
 * unreadable. Overlap is asserted directly, over every painted thing in the row.
 */
const POL8: LessonVisualId = "divide-rebuild-builder";

/** The first variant's answers, in the order the positions open. `useWidgetVariants` starts at 0. */
const POL8_ANSWERS = ["x plus 3", "x plus 6", "the remainder 4"] as const;

/** What a slot is holding, named for a failure message. */
function heldBy(slot: HTMLElement): string {
  return (slot.getAttribute("aria-label") ?? slot.textContent ?? "").trim();
}

/**
 * Every painted thing on the statement line, as boxes, in the order they are written.
 *
 * The slots' own ink AND the operators between them, because the operators are what the
 * overflow lands on. KaTeX's `.base` again rather than `.katex`, which is an inline box
 * reporting the line's height instead of the expression's.
 */
function statementInk(row: HTMLElement): { what: string; box: DOMRect }[] {
  const painted: { what: string; box: DOMRect }[] = [];
  for (const slot of Array.from(
    row.querySelectorAll<HTMLElement>(".lesson-equation__slot"),
  )) {
    const held = contentsOf(slot);
    if (held !== null) {
      painted.push({ what: `the ${heldBy(slot)}`, box: held });
    }
  }
  // Maths written directly on the row: the dividend on the left of the equals, and the
  // `\times` and `+` between the positions. Anything inside a slot is already counted.
  for (const math of Array.from(row.querySelectorAll<HTMLElement>("[data-latex]"))) {
    if (math.closest(".lesson-equation__slot") !== null) {
      continue;
    }
    for (const base of Array.from(math.querySelectorAll<HTMLElement>(".katex .base"))) {
      const box = base.getBoundingClientRect();
      if (box.width >= 0.5) {
        painted.push({
          what: `the "${(math.textContent ?? "").trim().slice(0, 12)}"`,
          box,
        });
      }
    }
  }
  return painted.sort((a, b) => a.box.left - b.box.left);
}

/** How much two boxes share, in px, counting only pairs that share a line. */
function overlapOf(a: DOMRect, b: DOMRect): number {
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (down <= 0) {
    return 0;
  }
  return Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

test("divide-rebuild-builder: the statement stays legible as its positions fill", async () => {
  const figure = await board(POL8);
  const row = figure.querySelector<HTMLElement>(".lesson-interactive__controls");
  if (row === null) {
    throw new Error("POL.8 draws no statement row");
  }

  let contained = 0;
  let filled = 0;
  let compared = 0;
  let worst = { pair: "nothing", by: Number.NEGATIVE_INFINITY };

  // Four states: nothing placed, then one more position answered each time.
  for (let placed = 0; placed <= POL8_ANSWERS.length; placed += 1) {
    if (placed > 0) {
      const answer = POL8_ANSWERS[placed - 1] as string;
      chip(figure, answer).click();
      await waitFor(
        () =>
          figure.querySelectorAll('.lesson-equation__slot[data-state="done"]').length ===
          placed,
        `POL.8: "${answer}" settles into position ${placed}`,
      );
      await waitFor(
        () =>
          Array.from(
            figure.querySelectorAll(
              '.lesson-equation__slot[data-state="done"] [data-latex]',
            ),
          ).every((node) => node.querySelector(".katex") !== null),
        `POL.8: the term placed in position ${placed} typesets`,
      );
    }
    const where = `${placed} of 3 placed`;

    // 1. EACH POSITION HOLDS WHAT IS WRITTEN IN IT. Same claim as the sweep above, over the
    //    filled states it never reaches.
    for (const slot of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-equation__slot"),
    )) {
      const held = contentsOf(slot);
      if (held === null) {
        continue;
      }
      const box = slot.getBoundingClientRect();
      const said = heldBy(slot);
      expect
        .soft(
          held.left,
          `${where}: "${said}" is drawn ${(box.left - held.left).toFixed(1)}px out of the left of its slot`,
        )
        .toBeGreaterThanOrEqual(box.left - BAND_SLACK);
      expect
        .soft(
          held.right,
          `${where}: "${said}" is drawn ${(held.right - box.right).toFixed(1)}px out of the right of its slot`,
        )
        .toBeLessThanOrEqual(box.right + BAND_SLACK);
      contained += 1;
      if (slot.getAttribute("data-state") === "done") {
        filled += 1;
      }
    }

    // 2. AND NOTHING ON THE LINE IS PRINTED OVER ANYTHING ELSE ON IT.
    const painted = statementInk(row);
    for (let i = 0; i < painted.length; i += 1) {
      for (let j = i + 1; j < painted.length; j += 1) {
        const left = painted[i] as { what: string; box: DOMRect };
        const right = painted[j] as { what: string; box: DOMRect };
        const over = overlapOf(left.box, right.box);
        if (over > worst.by) {
          worst = { pair: `${left.what} and ${right.what} at ${where}`, by: over };
        }
        expect
          .soft(
            over,
            `${where}: ${left.what} is printed ${over.toFixed(1)}px over ${right.what}`,
          )
          .toBeLessThanOrEqual(BAND_SLACK);
        compared += 1;
      }
    }
  }
  drop();

  // FLOORS. Every assertion above is an inequality inside a loop, so all of them hold over
  // a board that never rendered. Three separate ones, because they fail differently: a
  // driver that stopped placing chips clears the first two while the filled states — the
  // states this test exists for — go unvisited, and a row whose maths stopped matching
  // `[data-latex]` clears all of them while comparing nothing to the operators.
  expect(contained, "no slot held anything in any state").toBeGreaterThanOrEqual(12);
  expect(
    filled,
    "no position was ever driven to a placed term, so no filled LaTeX was measured",
  ).toBeGreaterThanOrEqual(6);
  expect(
    compared,
    "nothing on the statement line was compared with anything else on it",
  ).toBeGreaterThanOrEqual(40);
  expect(worst.by, `the closest pair on the line was ${worst.pair}`).toBeLessThanOrEqual(
    BAND_SLACK,
  );
});

/* ------------------------- 8. and the hole sits in the middle of the row it belongs to */

/**
 * Every board that deals a table blank, derived from the sources rather than listed.
 *
 * `FillTable` is the only thing in the tree that writes this class, and the registry renders
 * it under 25 ids, so a written-down list here would be 25 chances to forget one. The defect
 * below was reported on EL.1's `exp-growth-table` and measured on all 25.
 */
const TABLE_SLOT_VISUALS: readonly LessonVisualId[] = visualsMatching(/lesson-table__slot/);

/** A floor and not a ceiling: a 26th table board joins this claim without an edit here. */
const TABLE_SLOT_FLOOR = 20;

/** How far off its row's centre a hole may sit, in px. The reported defect is 2.9px. */
const CENTRED = 1;

/** ...and how far off the maths beside it. Looser, because that compares boxes to ink. */
const LEVEL_WITH_INK = 1.5;

/**
 * A board mounted THE WAY A LEARNER MEETS IT, which for this claim is the whole test.
 *
 * Every other mount in this file puts `<LessonVisual>` straight into a bare host, and on that
 * surface this defect does not exist: measured at 1024x580 the hole is 0.00px off its row, so
 * a sweep written against `board` would have been green over all 25 boards while QA was
 * looking at a photograph of the thing it was supposed to catch.
 *
 * What is missing from the bare mount is one inherited property. `LessonBody` renders every
 * visual inside `.lesson-player__prose`, which reads at `line-height: 1.9`, and that leading
 * is what sizes the phantom strut under an empty inline blank. Put the wrapper back and the
 * same board reports -2.94px, which is the photograph. So the wrapper is not decoration on
 * this harness; it is the surface, and `linedUp` below asserts it actually arrived rather
 * than trusting that a `className` string still matches the stylesheet.
 */
async function proseBoard(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(
    <div className="lesson-player__prose">
      <LessonVisual id={id} />
    </div>,
  );
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

/** The vertical centre of the maths painted in `row`, ignoring anything inside `skip`. */
function mathBandIn(row: HTMLElement, skip: HTMLElement): number | null {
  const bases = Array.from(row.querySelectorAll<HTMLElement>(".katex .base"))
    .filter((base) => !skip.contains(base))
    .map((base) => base.getBoundingClientRect())
    .filter((box) => box.width >= 0.5);
  if (bases.length === 0) {
    return null;
  }
  const top = Math.min(...bases.map((b) => b.top));
  const bottom = Math.max(...bases.map((b) => b.bottom));
  return (top + bottom) / 2;
}

/**
 * The hole is in the middle of its row, on every board that deals one.
 *
 * QA photographed EL.1's `+6 / 2` row: 4.5px of the open row's amber above the dashed blank
 * and 10.4px below it, so the receptacle rode above the numbers it was lining up with. The
 * cause is that an EMPTY inline-flex box has no content baseline, so it aligns its bottom
 * margin edge to the text baseline of a line it is the only thing on, and the strut's
 * descender is then added underneath it. The cell centres that taller box; the hole rides up
 * by half the descender. `.lesson-table__slot` is block-level for exactly this reason.
 *
 * Stated as TWO measurements, because either alone can be satisfied while the picture is
 * still wrong. Centred in the row is what the amber band shows and it is the claim the
 * screenshot makes; level with the sibling maths is what the eye actually reads, and a row
 * whose every cell drifted together would keep the first while losing the second.
 *
 * The horizontal pair rides along because the fix changed `display`, and a slot that lost its
 * width or its centring would be a regression this file otherwise only checks on one board.
 */
test("every table blank sits in the middle of its row, level with the maths beside it", async () => {
  let measured = 0;
  let againstInk = 0;
  let linedUp = 0;
  let worst = { off: 0, where: "nothing measured" };
  const drew: LessonVisualId[] = [];

  for (const id of TABLE_SLOT_VISUALS) {
    const figure = await proseBoard(id);
    const found = Array.from(figure.querySelectorAll<HTMLElement>(".lesson-table__slot"));
    if (found.length > 0) {
      drew.push(id);
    }

    for (const slot of found) {
      const cell = slot.parentElement as HTMLElement;
      const row = slot.closest("tr");
      if (row === null) {
        throw new Error(`${id}: a table blank is not in a row`);
      }
      const box = slot.getBoundingClientRect();
      const band = row.getBoundingClientRect();
      const middle = (box.top + box.bottom) / 2;

      // THE SURFACE, asserted rather than assumed. The prose column's leading is what makes
      // this defect possible at all, so a run where the wrapper stopped reaching the table
      // is a run that measured a board no learner is given, and it must not report green.
      const leading = Number.parseFloat(getComputedStyle(cell).lineHeight);
      const type = Number.parseFloat(getComputedStyle(cell).fontSize);
      if (Number.isFinite(leading) && leading > type * 1.5) {
        linedUp += 1;
      }

      const off = middle - (band.top + band.bottom) / 2;
      if (Math.abs(off) > Math.abs(worst.off)) {
        worst = { off, where: id };
      }
      expect
        .soft(
          Math.abs(off),
          `${id}: the blank sits ${off.toFixed(2)}px ${off < 0 ? "above" : "below"} the middle of its row, with ${(box.top - band.top).toFixed(2)}px of the row above it and ${(band.bottom - box.bottom).toFixed(2)}px below`,
        )
        .toBeLessThanOrEqual(CENTRED);

      const ink = mathBandIn(row, slot);
      if (ink !== null) {
        againstInk += 1;
        expect
          .soft(
            Math.abs(middle - ink),
            `${id}: the blank is read ${(middle - ink).toFixed(2)}px off the maths in its own row`,
          )
          .toBeLessThanOrEqual(LEVEL_WITH_INK);
      }

      // Across, too: a hole nobody can aim at is no better than one in the wrong place.
      const across = cell.getBoundingClientRect();
      expect
        .soft(
          Math.abs((box.left + box.right) / 2 - (across.left + across.right) / 2),
          `${id}: the blank is off the centre of its own cell`,
        )
        .toBeLessThanOrEqual(CENTRED);
      expect
        .soft(box.width, `${id}: the blank is too narrow to aim at`)
        .toBeGreaterThan(50);

      measured += 1;
    }
    drop();
  }

  // FLOORS, three of them, because they fail differently. A population that shrank is a
  // registry rename; a population that drew nothing is a sweep that visited 25 boards and
  // compared none of them; and a sweep that never met the prose column's leading is green
  // over the one surface on which this defect cannot occur.
  expect(
    drew.length,
    `only ${drew.length} of ${TABLE_SLOT_VISUALS.length} derived boards dealt a blank to measure`,
  ).toBeGreaterThanOrEqual(TABLE_SLOT_FLOOR);
  expect(measured, "no table blank was measured").toBeGreaterThanOrEqual(TABLE_SLOT_FLOOR);
  expect(
    againstInk,
    "no blank shared its row with any maths, so nothing was levelled against ink",
  ).toBeGreaterThanOrEqual(TABLE_SLOT_FLOOR);
  expect(
    linedUp,
    "no blank was measured under the prose column's leading, so this sweep ran on a surface where the defect it guards cannot appear",
  ).toBe(measured);
  expect(drew, "the board this was reported on drew no blank").toContain(
    "exp-growth-table",
  );
  expect(worst.off, `the worst-placed blank was on ${worst.where}`).toBeLessThanOrEqual(
    CENTRED,
  );
});

test("negative-exponent-order: the open rung is a box, worded for screen readers only", async () => {
  const figure = await board("negative-exponent-order");
  const rung = figure.querySelector<HTMLElement>('.lesson-order__slot[data-state="open"]');
  if (!rung) {
    throw new Error("the chain has no open rung");
  }

  expect(visibleText(rung).trim(), "the rung still prints words").toBe("");
  const spoken = rung.querySelector<HTMLElement>(".visually-hidden");
  if (!spoken) {
    throw new Error("the rung says nothing at all, to anybody");
  }
  expect(spoken.textContent ?? "").toMatch(/next step/i);
  // If this span were visible, the `visibleText` assertion above would prove nothing.
  expect(
    spoken.getBoundingClientRect().width,
    "the rung's wording is not actually hidden",
  ).toBeLessThanOrEqual(2);

  expect(
    rung.getBoundingClientRect().height,
    "the rung collapsed to a hairline once the words came out",
  ).toBeGreaterThan(24);
  expect(getComputedStyle(rung).borderTopStyle, "the rung is not dashed").toBe("dashed");
});
