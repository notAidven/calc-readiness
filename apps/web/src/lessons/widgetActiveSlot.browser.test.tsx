/**
 * A multi-slot builder says WHICH of its blanks the box under it is about to fill.
 *
 * The defect, on RAD.4's mixed-radical builder: the diagram set out two target templates,
 * $\square t^{\square}$ and $\sqrt{\square t}$, and then a FOURTH $\square$ sat beside the
 * number box as a legend. Four identical glyphs, and nothing bound the box to any of them.
 * The fourth one was the worst of the four, because it is a legend for a slot: a box that
 * can never be filled, drawn in the same glyph as the three that can.
 *
 * The two halves are not separable, which is why they are asserted together here. Deleting
 * the legend alone leaves three unbound boxes and takes away the only hint there was;
 * marking the live target alone leaves four boxes with one of them marked and permanently
 * empty. So: the legend is gone, and the live target carries a mark.
 *
 * ## Why the mark is not one mark, and why none of it is a hue
 *
 * The neighbouring RAD.3 builder spends colour on slot identity, and the shared feedback
 * layer spends green, red and amber on correctness. A third meaning for the same palette
 * would make all three harder to read, so nothing here is a hue.
 *
 * It began as two typographic marks and they were both COMPARATIVE: the live box was
 * underlined, and its template was stroked 1.25px fatter than the other one. Each asked the
 * learner to notice a difference between two adjacent objects rather than to read a
 * statement about one, which is a weak signal at a glance and weakest in the learner who is
 * confident enough to be looking at the maths instead of auditing the chrome.
 *
 * On the third slot the weight was worse than weak, it was pointing at the wrong box. The
 * front template is FINISHED by then and stroked in `CIVIC`, measured at
 * `oklch(0.42 0.1 183)`; the live template is stroked in `LINE`, measured at
 * `oklch(0.78 0.025 88)`. So the idle box was the high-contrast one on the board and the
 * live box was the faint one, while this file's weight assertion passed on 2.75 > 1.5. A
 * test can pass on the arithmetic of a signal that is rendering backwards, which is why the
 * two absolute carriers below were added rather than the comparative ones being tuned.
 *
 * Four carriers now, doing four jobs, asserted separately because they fail separately:
 *
 * 1. The entry row NAMES the slot in words, ending in the caption printed under the
 *    template that holds it. Absolute, not comparative, and it is the only one that tells
 *    slots 1 and 2 apart in a way a learner can read, since both of them live in the front
 *    template and nothing template-level can distinguish them.
 * 2. The template NOT being filled is DIMMED. Absolute: the live one is at full opacity and
 *    the other is measurably under it, so there is nothing to compare.
 * 3. The live template's outline is heavier. Kept, and still asserted, but no longer alone.
 * 4. The live box is UNDERLINED. The only carrier at box granularity.
 *
 * Not one assertion below reads a hue: they read a LaTeX control word, a stroke width, an
 * opacity, and rendered text. So a palette edit cannot break this file, and it cannot
 * quietly turn the mark into a colour-only signal either. The stroke COLOUR did change with
 * the fix (the live outline is ink where the idle one is the pale rule) and that is
 * deliberately left unasserted: it is contrast reinforcing carriers 1 and 2, and pinning it
 * here would be pinning a colour.
 *
 * Measured at the lesson card's real width. The headless viewport is narrower than any
 * lesson, and this diagram is allowed to wrap below the card, so the default viewport would
 * be measuring a layout no learner ever sees.
 *
 * ## And the population was one
 *
 * Everything above is about `mixed-radicand-solver`, and for as long as this file existed that
 * one hardcoded id WAS the population: no floor, no derivation, and four carriers asserted in
 * depth over a single board. The depth is worth keeping — it is the evidence that the fix
 * landed — but on its own it scopes the guard to where the mechanic was IMPLEMENTED rather
 * than to who exhibits the behaviour, and other boards hold their own copies of it. LIN.5's
 * `AbsBranchBuilder` is one: a shared tray of chips, two branch slots, and whichever branch is
 * live is the one the next chip drops into.
 *
 * So the sweep at the foot of this file derives its population instead, in two steps, because
 * neither step alone can find it:
 *
 * 1. From SOURCE, a NECESSARY condition — a board that can draw more than one blank at once,
 *    which is a part-row board or a template board with box glyphs. Necessary, so nothing
 *    exhibiting the behaviour can be filtered out here; it exists only to keep the mount count
 *    down, and it is derived by `kindFamily`, not written out.
 * 2. From the RENDERED board, the behaviour itself: two or more slots, and every control that
 *    answers them sitting OUTSIDE all of them. That is what "one box, several slots" means as
 *    a fact about the product, and it is not visible in source at all — a per-slot input and a
 *    shared tray are the same JSX until they are laid out.
 *
 * A board answered a slot at a time cannot be answered without knowing which slot is in hand,
 * so what every member owes is that the entry area NAMES it: the words beside the shared
 * control contain the caption the board prints for exactly one of its slots. Read off the
 * board both times rather than written down here, so two copies of a caption cannot drift
 * apart and leave the assertion passing on a string nobody renders.
 */

import { afterEach, expect, test } from "vitest";

import { visualsMatching } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** The builder under QA, and the three slots it fills in order. */
const BUILDER: LessonVisualId = "mixed-radicand-solver";

/**
 * Round 1 of board 1: $\sqrt{50t^{7}} = 5t^{3}\sqrt{2t}$. Typed in slot order, so the
 * walk below is the learner's own path through the three targets.
 */
const ANSWERS = ["5", "3", "2"] as const;

/**
 * The most opacity the template that is not being filled may still be carrying.
 *
 * A threshold rather than "less than the live one", because a comparison is what this
 * carrier was brought in to replace: `0.99` is measurably less than `1` and is not a dim.
 */
const DIMMED_AT_MOST = 0.7;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

async function board(): Promise<HTMLElement> {
  h = mount(<LessonVisual id={BUILDER} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    `${BUILDER} mounts`,
  );
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

/** Every piece of LaTeX the widget has typeset, diagram and controls alike. */
function typeset(root: HTMLElement): string[] {
  return all(root, "[data-latex]").map((n) => n.getAttribute("data-latex") ?? "");
}

/** How many times `needle` occurs across all of it. Glyphs, not nodes. */
function occurrences(root: HTMLElement, needle: string): number {
  return typeset(root).reduce((total, latex) => total + latex.split(needle).length - 1, 0);
}

/** One of the two answer templates, by the job it does. */
function template(root: HTMLElement, target: "front" | "under"): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-target="${target}"]`);
  if (found === null) {
    throw new Error(`no "${target}" template on the board`);
  }
  return found;
}

/** The LaTeX inside one template. */
function templateLatex(root: HTMLElement, target: "front" | "under"): string {
  return typeset(template(root, target)).join(" ");
}

/** The weight its outline is drawn at, which is the non-typographic half of the mark. */
function outlineWeight(root: HTMLElement, target: "front" | "under"): number {
  const rect = template(root, target).querySelector("rect");
  if (rect === null) {
    throw new Error(`the "${target}" template has no outline to measure`);
  }
  return Number.parseFloat(getComputedStyle(rect).strokeWidth);
}

/**
 * How much of the template is still being painted. `1` is fully present; the template that
 * is not the question recedes below it.
 */
function presence(root: HTMLElement, target: "front" | "under"): number {
  return Number.parseFloat(getComputedStyle(template(root, target)).opacity);
}

/**
 * The caption the BOARD prints under one template ("out in front"). Read off the diagram
 * rather than written down here, so the assertion that the entry row names the live
 * template cannot be satisfied by two copies of a string that have drifted apart.
 */
function boardCaption(root: HTMLElement, target: "front" | "under"): string {
  const label = template(root, target).querySelector("text");
  if (label === null) {
    throw new Error(`the "${target}" template prints no caption`);
  }
  return (label.textContent ?? "").trim();
}

/** What the entry row says it is filling, or null when it says nothing. */
function entryRowLabel(root: HTMLElement): string | null {
  const label = root.querySelector<HTMLElement>(".lesson-interactive__step-label");
  return label === null ? null : (label.textContent ?? "").trim();
}

function entryBox(root: HTMLElement): HTMLInputElement {
  const found = root.querySelector<HTMLInputElement>(".lesson-interactive__input");
  if (found === null) {
    throw new Error("no answer box on the board");
  }
  return found;
}

/** Answer the slot in hand. */
async function fill(root: HTMLElement, value: string, expectedBoxesAfter: number) {
  setInputValue(entryBox(root), value);
  findButton(root, "Set it").click();
  await waitFor(
    () => occurrences(root, "\\square") === expectedBoxesAfter,
    `typing ${value} closed a slot`,
  );
}

/**
 * The two board-level carriers, at one slot: the live template is fully present and drawn
 * heavier, and the other one is dimmed to a stated threshold.
 *
 * Both bounds are absolute. `presence(live) > presence(idle)` would hold at 1 against 0.999
 * and that is not a signal anybody can see, which is the whole complaint this file answers.
 */
function expectBoardMarks(
  root: HTMLElement,
  where: string,
  live: "front" | "under",
  idle: "front" | "under",
) {
  expect(presence(root, live), `${where}: the live template is not fully drawn`).toBe(1);
  expect(
    presence(root, idle),
    `${where}: the "${idle}" template is not dimmed out of the way`,
  ).toBeLessThanOrEqual(DIMMED_AT_MOST);
  expect(
    outlineWeight(root, live),
    `${where}: the live template is not drawn heavier than the other one`,
  ).toBeGreaterThan(outlineWeight(root, idle));
}

/**
 * The words carrier, at one slot: the row names the slot, in a phrase that ends in the
 * caption under the LIVE template and does not mention the other one.
 *
 * `phrase` is what tells this slot from its sibling in the same template, which the board
 * cannot do: `\square t^{\square}` holds slots 1 and 2, so at template granularity the two
 * are indistinguishable and only these words separate them.
 */
function expectRowNamesSlot(
  root: HTMLElement,
  where: string,
  live: "front" | "under",
  idle: "front" | "under",
  phrase: string,
) {
  const label = entryRowLabel(root);
  expect(label, `${where}: the entry row does not say which slot it fills`).not.toBeNull();
  const said = label ?? "";

  // Non-vacuity, twice over. A `toContain` against an empty needle passes on anything, so
  // both captions have to be real strings before they can be evidence, and the row has to
  // be saying more than a stray character.
  const liveCaption = boardCaption(root, live);
  const idleCaption = boardCaption(root, idle);
  expect(
    liveCaption.length,
    `${where}: the "${live}" template prints no caption, so "contains it" proves nothing`,
  ).toBeGreaterThan(2);
  expect(
    idleCaption.length,
    `${where}: the "${idle}" template prints no caption, so "omits it" proves nothing`,
  ).toBeGreaterThan(2);
  expect(
    said.length,
    `${where}: the entry row's line is too short to be naming anything`,
  ).toBeGreaterThan(12);

  expect(
    said,
    `${where}: the entry row says "${said}", which does not name the live template ("${liveCaption}")`,
  ).toContain(liveCaption);
  expect(
    said,
    `${where}: the entry row says "${said}", which names the template it is NOT filling ("${idleCaption}")`,
  ).not.toContain(idleCaption);
  expect(
    said,
    `${where}: the entry row says "${said}", which does not distinguish this slot from its sibling ("${phrase}")`,
  ).toContain(phrase);
}

test("mixed-radicand-solver: three box glyphs, not four, and none of them is a legend", async () => {
  const root = await board();

  // The measurement is over a real board rather than an empty selector.
  expect(
    typeset(root).length,
    "no math was typeset, so the counts below prove nothing",
  ).toBeGreaterThan(2);

  // THE DEFECT, stated as a count. Two in the front template, one under the root, and no
  // fourth one standing beside the box as a legend for a slot that can never be filled.
  expect(
    occurrences(root, "\\square"),
    "the board still draws a box glyph that is not a slot",
  ).toBe(3);

  // The row that replaced the legend says its piece in WORDS. A fourth box glyph would
  // have failed the count above; a fourth glyph is not what went back in.
  expect(
    entryRowLabel(root) ?? "",
    "the entry row went back to standing beside the box saying nothing",
  ).not.toBe("");

  // And the box it sits beside is plain entry. A number spinner lets a learner arrow up to
  // a single-digit answer without doing the arithmetic the slot exists to ask for, and
  // every answer on this board is a single digit.
  const box = entryBox(root);
  expect(box.type, "the answer box is a stepper").not.toBe("number");
  expect(box.getAttribute("step"), "the answer box still carries a step").toBeNull();
  expect(box.getAttribute("aria-label") ?? "", "the box does not name its slot").not.toBe(
    "",
  );
});

test("mixed-radicand-solver: the live target is marked, the other boxes are not", async () => {
  const root = await board();

  // Slot 1 of 3: the whole number in front. Exactly one box on the whole board is marked,
  // and it is in the front template.
  expect(occurrences(root, "\\underline"), "slot 1: not exactly one box is marked").toBe(1);
  expect(templateLatex(root, "front"), "slot 1: the front template is unmarked").toContain(
    "\\underline",
  );
  expect(
    templateLatex(root, "under"),
    "slot 1: the box under the root is marked too",
  ).not.toContain("\\underline");
  expectBoardMarks(root, "slot 1", "front", "under");
  expectRowNamesSlot(root, "slot 1", "front", "under", "whole number");

  // Slot 2 of 3: the exponent, also in the front template. The mark moves inside it, and
  // the words are the only carrier that can say so.
  await fill(root, ANSWERS[0], 2);
  expect(occurrences(root, "\\underline"), "slot 2: not exactly one box is marked").toBe(1);
  expect(templateLatex(root, "front"), "slot 2: the front template is unmarked").toContain(
    "\\underline",
  );
  expect(
    templateLatex(root, "under"),
    "slot 2: the box under the root is marked too",
  ).not.toContain("\\underline");
  expectBoardMarks(root, "slot 2", "front", "under");
  expectRowNamesSlot(root, "slot 2", "front", "under", "exponent");

  // Slot 3 of 3: the number left under the root. Now the OTHER template is the live one,
  // and every carrier moves together.
  await fill(root, ANSWERS[1], 1);
  expect(occurrences(root, "\\underline"), "slot 3: not exactly one box is marked").toBe(1);
  expect(
    templateLatex(root, "under"),
    "slot 3: the box under the root is unmarked",
  ).toContain("\\underline");
  expect(
    templateLatex(root, "front"),
    "slot 3: the finished front template is still marked live",
  ).not.toContain("\\underline");
  expectBoardMarks(root, "slot 3", "under", "front");
  expectRowNamesSlot(root, "slot 3", "under", "front", "left under the root");

  // Finished: nothing is live, so nothing is marked and no box is left on the board.
  await fill(root, ANSWERS[2], 0);
  expect(occurrences(root, "\\underline"), "a finished board still marks a live slot").toBe(
    0,
  );
  expect(
    entryRowLabel(root),
    "a finished board still says it is filling a slot",
  ).toBeNull();
  // And the dimming lifts. Nothing is live, so nothing is the competition, and fading the
  // assembled answer would take the reward away at the one moment there is one to show.
  expect(presence(root, "front"), "a finished board leaves the front template dimmed").toBe(
    1,
  );
  expect(
    presence(root, "under"),
    "a finished board leaves the under-root template dimmed",
  ).toBe(1);
});

/* ------------------------------------------------------- every board that fills one slot at a time */

/**
 * Step 1 of the derivation: the NECESSARY condition, from source.
 *
 * A board cannot fill one of several slots at a time without having several slots, and a board
 * draws them one of two ways — a row per part, or box glyphs inside a template. Both are
 * necessary rather than sufficient, so this filter cannot drop a member; what it buys is that
 * the sweep mounts a handful of widgets instead of every visual in the app.
 */
const CANDIDATES: readonly LessonVisualId[] = visualsMatching(/data-part-row|\\\\square/);

/**
 * The boards found exhibiting the behaviour when this was written, named rather than counted.
 *
 * A floor constrains SIZE, not SHAPE. The floors below are 3 and 2 over a tree holding four
 * members, so one of them could leave and every count would still pass — which is not a
 * hypothesis: the class-name injection described on `entryControls` did exactly that, and the
 * file reported `3 passed` over a population it had quietly stopped covering.
 *
 * A floor and not a pin, in the one direction that matters: a board that JOINS the behaviour
 * joins the sweep with no edit here, because the population is still derived. What is pinned is
 * that these four have not silently stopped being derived.
 */
const KNOWN_MEMBERS: readonly LessonVisualId[] = [
  "abs-branch-builder",
  "abs-union-builder",
  "formula-isolate-builder",
  "mixed-radicand-solver",
];

/**
 * The controls a board carries that a learner does not ANSWER with, each with its reason.
 *
 * Named, because a control left out of a class list and a control nobody thought of look
 * identical from inside the guard, and that is precisely how the old list came to be short. The
 * two entries below are the price of enumerating by tag: `button, input` is the only population
 * a new widget cannot slip out of, and it necessarily sweeps up the blanks and the commit
 * buttons too.
 *
 * Both are asserted, in both directions, by the census test at the foot of this file: an entry
 * matching nothing is excusing nothing and fails, and an entry that has become a board's only
 * way of composing an answer fails as well, since excluding it would drop that board out of the
 * population the way the injection did.
 */
const NOT_ANSWERING: readonly { selector: string; why: string }[] = [
  {
    selector: ".lesson-equation__slot",
    why: "a blank: it is what the learner answers INTO, and counting it would make every board look like it had per-part entry",
  },
  {
    selector: ".lesson-interactive__check",
    why: "commits an answer composed on some other control, so it says nothing about WHERE the composing happens; this covers the per-part `--part` variant, which is what made a shared tray look per-part when the enumeration was first widened to every button",
  },
];

/**
 * Every operable button and input, minus a given exclusion list.
 *
 * Parameterised on the list so the census test can re-derive the population with one entry put
 * BACK and see whether anything moves. An exclusion that changes nothing is decorative, and the
 * only way to tell a load-bearing one from a decorative one is to force it false.
 */
function controlsUnder(
  root: HTMLElement,
  excluded: readonly { selector: string }[],
): HTMLElement[] {
  return all<HTMLElement>(root, "button, input").filter(
    (node) =>
      !excluded.some((entry) => node.matches(entry.selector)) &&
      !(node as HTMLButtonElement).disabled,
  );
}

/**
 * Every enabled control the learner answers WITH, as opposed to the slots they answer INTO.
 *
 * Every button and every input, minus {@link NOT_ANSWERING}, and NOT a class list. It WAS a
 * class list — `button.lesson-interactive__chip, input.lesson-interactive__input` — and that
 * list was found SHORT by injection, the same shape `widgetTaskOrder.browser.test.tsx` was found
 * short in twice. This enumeration is not merely how the entry area's words are read: a board
 * whose controls it cannot see has `controls.length === 0`, so `shared` is false, so `exhibits`
 * is false, so the board leaves the population without any assertion in the file being reached.
 *
 * MEASURED at `68c5aa9a`, not argued. Renaming `AbsUnionBuilder`'s answering chips from
 * `lesson-interactive__chip` to `lesson-interactive__token` — a board that still answers exactly
 * as it did, under a name nobody listed — dropped `abs-union-builder` out of a population of
 * four, and the file reported **3 passed**. The floors were 3 and 2 and four members satisfied
 * them with one to spare, so nothing counted the loss. Both halves of that are fixed: the
 * enumeration cannot be escaped by inventing a class name, and `KNOWN_MEMBERS` asserts the
 * composition the floors cannot.
 */
function entryControls(root: HTMLElement): HTMLElement[] {
  return controlsUnder(root, NOT_ANSWERING);
}

/** The board's parts: a row per part where it has them, otherwise its answer templates. */
function slotElements(root: HTMLElement): HTMLElement[] {
  const rows = all<HTMLElement>(root, "[data-part-row]");
  return rows.length >= 2 ? rows : all<HTMLElement>(root, "[data-target]");
}

/**
 * Step 2 of the derivation, over a mounted board: two or more slots, answered out of a cluster
 * of controls that sits outside every one of them.
 */
function exhibitsUnder(
  root: HTMLElement,
  excluded: readonly { selector: string }[],
): boolean {
  const controls = controlsUnder(root, excluded);
  const shared =
    controls.length > 0 &&
    controls.every((node) => node.closest("[data-part-row], [data-target]") === null);
  return slotElements(root).length >= 2 && shared;
}

/**
 * The blanks a learner can put in hand, and what each of them is currently called.
 *
 * A board that lets the learner choose is the case where the words can be watched MOVING,
 * which is the whole of the claim: an entry area labelled with a constant would satisfy any
 * assertion made about one moment of it.
 */
function pickableSlots(root: HTMLElement): HTMLButtonElement[] {
  return all<HTMLButtonElement>(root, "button.lesson-equation__slot").filter(
    (node) => !node.disabled,
  );
}

function liveSlots(slots: readonly HTMLButtonElement[]): HTMLButtonElement[] {
  return slots.filter((node) => node.getAttribute("aria-pressed") === "true");
}

function nameOf(node: Element): string {
  return node.getAttribute("aria-label") ?? node.textContent ?? "";
}

/**
 * Everything the entry area says: the label beside the box, and the accessible name of every
 * control in the shared cluster. Either channel can carry the slot's name — the boards in the
 * population use one each — so the claim is made about the two of them together.
 */
function entryWords(root: HTMLElement): string {
  return [entryRowLabel(root) ?? "", ...entryControls(root).map(nameOf)].join(" | ");
}

/** One board, after a look at it and (where it allows one) a move of the live slot. */
interface Inspected {
  id: LessonVisualId;
  /** Step 2: does this board answer one slot at a time, out of a shared cluster of controls? */
  exhibits: boolean;
  words: string;
  /**
   * How many blanks the learner can put in hand.
   *
   * Recorded separately from `live` and from `moved` on purpose. Deriving "boards that announce
   * a live slot" from the announcement would let a board that STOPPED announcing one drop out
   * of the population instead of failing, which is the defect this file exists about wearing a
   * different hat.
   */
  pickable: number;
  /** How many of its blanks announce themselves as the one in hand. Should be exactly one. */
  live: number;
  /** Null where nothing was watched moving, which for a pickable board is itself a failure. */
  moved: {
    live: number;
    wasNamed: string;
    nowNamed: string;
    words: string;
  } | null;
}

async function inspect(id: LessonVisualId): Promise<Inspected> {
  const harness = mount(<LessonVisual id={id} />);
  try {
    harness.host.style.width = `${FIGURE_CONTENT_CAP}px`;
    await waitFor(
      () => harness.host.querySelector(".lesson-interactive") !== null,
      `${id} mounts`,
    );
    const root = harness.host.querySelector(".lesson-interactive") as HTMLElement;
    // Shared means: not one of the controls lives inside a part. A board with its own box on
    // every row answers all of them at once and never has to say which one is in hand.
    const exhibits = exhibitsUnder(root, NOT_ANSWERING);
    if (!exhibits) {
      return { id, exhibits, words: "", pickable: 0, live: 0, moved: null };
    }

    const words = entryWords(root);
    const slots = pickableSlots(root);
    const live = liveSlots(slots);
    const idle = slots.filter((node) => node.getAttribute("aria-pressed") !== "true");
    if (live.length !== 1 || idle.length === 0) {
      return {
        id,
        exhibits,
        words,
        pickable: slots.length,
        live: live.length,
        moved: null,
      };
    }

    const wasNamed = nameOf(live[0] as HTMLButtonElement);
    (idle[0] as HTMLButtonElement).click();
    // A settle rather than a `waitFor` on the property itself: a board that never moves should
    // fail at the named assertion below, not time out inside a helper.
    await new Promise<void>((done) => setTimeout(done, 80));
    const after = liveSlots(pickableSlots(root));
    return {
      id,
      exhibits,
      words,
      pickable: slots.length,
      live: live.length,
      moved: {
        live: after.length,
        wasNamed,
        nowNamed: after.length === 0 ? "" : nameOf(after[0] as HTMLButtonElement),
        words: entryWords(root),
      },
    };
  } finally {
    harness.cleanup();
  }
}

/**
 * The exclusion list is a claim about the tree, so it is measured against the tree.
 *
 * `.cursor/rules/qa-verification.mdc`: an exemption whose members are absent excuses nothing
 * while looking like carefulness, and one that has stopped describing what it excuses is worse,
 * because it goes on excusing it. Both directions:
 *
 * - a listed selector that matches NOTHING on any candidate board fails, so a renamed or deleted
 *   control cannot leave a decorative entry behind;
 * - a listed selector that has become a board's only way of COMPOSING an answer fails, because
 *   excluding it would empty that board's controls and drop it out of the population silently —
 *   which is the exact defect the injection above produced.
 */
test("nothing a learner answers with is excluded from the control enumeration", async () => {
  const matches = new Map<string, number>(NOT_ANSWERING.map((e) => [e.selector, 0]));
  const full: LessonVisualId[] = [];
  const withoutEntry = new Map<string, LessonVisualId[]>(
    NOT_ANSWERING.map((e) => [e.selector, []]),
  );
  let mounted = 0;

  for (const id of CANDIDATES) {
    const harness = mount(<LessonVisual id={id} />);
    try {
      harness.host.style.width = `${FIGURE_CONTENT_CAP}px`;
      await waitFor(
        () => harness.host.querySelector(".lesson-interactive") !== null,
        `${id} mounts`,
      );
      const root = harness.host.querySelector(".lesson-interactive") as HTMLElement;
      const operable = all<HTMLElement>(root, "button, input").filter(
        (node) => !(node as HTMLButtonElement).disabled,
      );
      for (const entry of NOT_ANSWERING) {
        matches.set(
          entry.selector,
          (matches.get(entry.selector) ?? 0) +
            operable.filter((node) => node.matches(entry.selector)).length,
        );
        // The same derivation with this one entry PUT BACK, which is the injection mechanised.
        if (
          exhibitsUnder(
            root,
            NOT_ANSWERING.filter((other) => other.selector !== entry.selector),
          )
        ) {
          withoutEntry.get(entry.selector)?.push(id);
        }
      }
      if (exhibitsUnder(root, NOT_ANSWERING)) {
        full.push(id);
      }
      mounted += 1;
    } finally {
      harness.cleanup();
    }
  }

  expect(mounted, "no board was mounted, so this counted nothing").toBe(CANDIDATES.length);
  expect(
    full.length,
    "the derivation found no board at all, so every comparison below is between two empty sets",
  ).toBeGreaterThanOrEqual(3);

  // Direction one: an entry that matches nothing excuses nothing.
  expect(
    NOT_ANSWERING.filter((entry) => (matches.get(entry.selector) ?? 0) === 0).map(
      (entry) => entry.selector,
    ),
    `these selectors are excluded from the control enumeration and match nothing on any of the ${mounted} candidate boards, so they excuse nothing`,
  ).toEqual([]);

  // Direction two: an entry that is not LOAD-BEARING excuses nothing either. Put it back and
  // the derived population has to move; if it does not, the exclusion is decorative and the
  // reason written beside it has stopped describing the tree.
  expect(
    NOT_ANSWERING.filter(
      (entry) => (withoutEntry.get(entry.selector) ?? []).join(",") === full.join(","),
    ).map((entry) => entry.selector),
    `re-including these selectors changes the derived population by nothing, so excluding them is doing no work and their stated reason is unchecked (population: ${full.join(", ")})`,
  ).toEqual([]);
}, 120_000);

test("every board answered one slot at a time says which slot that is", async () => {
  const seen: Inspected[] = [];
  for (const id of CANDIDATES) {
    seen.push(await inspect(id));
  }
  const population = seen.filter((board) => board.exhibits);
  // Scoped by the blanks being SELECTABLE, not by an announcement having been found: a board
  // whose announcement disappeared has to fail below rather than leave this list.
  const choosable = population.filter((board) => board.pickable >= 2);

  // Printed, because a loop over nothing passes and `test.each` over nothing emits no tests at
  // all. The names go out with the count, so a population that changed SHAPE is visible too.
  console.log(
    `[widgetActiveSlot] candidates ${CANDIDATES.length}, population ${population.length} (${population
      .map((board) => board.id)
      .join(", ")}), of which ${choosable.length} let the learner choose the blank`,
  );

  expect(
    CANDIDATES.length,
    "the source filter resolved to nothing, so the sweep below mounted no boards",
  ).toBeGreaterThanOrEqual(10);
  // Floors, not pins: a board joining the behaviour joins the sweep with no number to bump
  // here. Both are under what the tree holds today, and both fail if a member stops being
  // found — which is what a hardcoded id could never do.
  expect(
    population.length,
    `no board was found filling one slot at a time, so the assertions below ran over nothing (candidates: ${CANDIDATES.join(", ")})`,
  ).toBeGreaterThanOrEqual(3);
  // Shape as well as size, because a floor of three is met by three of anything. The board
  // this file was written about has to still be in the population derived for it, and the
  // population has to be more than that board.
  expect(
    population.map((board) => board.id),
    "the board this file was written about is no longer in its own derived population",
  ).toContain(BUILDER);
  expect(
    population.filter((board) => board.id !== BUILDER).length,
    "the population narrowed back to the single board this file started as",
  ).toBeGreaterThanOrEqual(2);
  // Composition, beside the size. The floors above are met by three of anything, so a member
  // leaving is invisible to them; this is the assertion that saw the class-name injection.
  const found = population.map((board) => board.id);
  expect(
    KNOWN_MEMBERS.filter((id) => !found.includes(id)),
    `these boards were derived as filling one slot at a time when this list was written and are no longer in the population, so the sweep stopped covering them without any count falling below its floor (found: ${found.join(", ")})`,
  ).toEqual([]);
  expect(
    choosable.length,
    "no board let the learner choose a blank, so nothing below watched the words move",
  ).toBeGreaterThanOrEqual(2);

  for (const board of population) {
    // Non-vacuity: an entry area saying nothing cannot be naming a slot, and every assertion
    // about what it "does not say" would hold over it.
    expect(
      board.words.length,
      `${board.id}: the entry area says nothing, so it names no slot`,
    ).toBeGreaterThan(12);
  }

  for (const board of choosable) {
    expect(
      board.live,
      `${board.id}: ${board.live} of its ${board.pickable} blanks announce themselves as the one being filled, not one`,
    ).toBe(1);
    expect(
      board.moved,
      `${board.id}: its blanks are selectable and nothing was watched moving between them`,
    ).not.toBeNull();
    const moved = board.moved as NonNullable<Inspected["moved"]>;
    expect(
      moved.live,
      `${board.id}: choosing another blank left ${moved.live} of them announced as live`,
    ).toBe(1);
    expect(
      moved.nowNamed,
      `${board.id}: choosing another blank did not move which one is named live, both times "${moved.wasNamed}"`,
    ).not.toBe(moved.wasNamed);
    expect(
      moved.words,
      `${board.id}: the entry area says "${moved.words}" whichever blank is in hand, so it is a caption and not a statement about the live slot`,
    ).not.toBe(board.words);
  }
});
