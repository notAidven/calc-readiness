/**
 * A board that asks for several typed answers at once verdicts EACH ONE. One press does not
 * grade all of them into a single line.
 *
 * The defect, reported off RAD.2's combine-radicals builder: two roots to simplify, four boxes,
 * and a single "Simplify" that graded the pair. A learner who had sqrt(24) = 2sqrt(6) right and
 * sqrt(54) wrong was answered with one red line about the pair — "Not quite. Keep taking perfect
 * squares out of each radicand until none are left." — which said nothing about which root it
 * meant, so the row they had already got right read as part of the miss. The state was per box
 * all along, since a correct box latches and dims, but a dim box says "unavailable", not
 * "correct", and beside a red line about the pair it says the opposite of what happened.
 *
 * Two claims, and they fail in opposite directions, so neither is asserted without the other:
 *
 *  1. THE VERDICTS ARE PER PART. On a board where one part is right and the other is wrong, the
 *     right part carries the correct treatment and the wrong part carries the wrong one, at the
 *     same time. And the answer is about WHAT WAS TYPED: the note under the missed part quotes
 *     the learner's own number back rather than restating the method.
 *  2. THE GATE DID NOT MOVE. Finer feedback is not a lower bar. A part that is right does not
 *     advance the round on its own; every part has to be right first.
 *
 * The gate claim is asserted on the ROUND advancing rather than on `onComplete`, and
 * deliberately: `onComplete` is a whole-widget latch that fires on the last round only, so on
 * the round each report was filed against it is zero either way and asserting it alone would
 * pass on a board that had thrown the round open. `completed` is checked as well, never instead.
 *
 * ## The two shapes, and why both are driven
 *
 * They are a real taxonomy, not a test convenience. RAD.2's two roots are two QUESTIONS: each
 * has its own check button, and checking one may not answer the other. RAD.3's power and index
 * are two halves of ONE conversion: they share a button, so the mixed board there is the state
 * after a SINGLE press. The second is the harder half of the claim and the first is the reported
 * request in its own words, "check both inputs one at a time instead of both at once".
 *
 * ## Why the colour assertions are all paired with non-colour ones
 *
 * `CIVIC` and `BRICK` are this app's correctness channel and a part verdict is a verdict on the
 * learner's own entry, so it belongs in them; a fourth hue for "per-part" would make the three
 * already in use harder to read. Colour alone cannot carry it, though, so each verdict also
 * names itself in a word, in a glyph, and in the accessible name of the boxes it is about.
 *
 * The accessible names are asserted OUTSIDE any reveal window on purpose. While a reveal passage
 * is up the whole widget stage carries `inert`, and Chromium drops an inert subtree out of the
 * accessibility tree: every `aria-label` inside it computes to `ignored: inertElement`. A name
 * added for that window would be unreachable text that only looked like coverage, so the carrier
 * that has to survive the freeze is the visible word, and that is what is checked.
 */

import { afterEach, expect, test } from "vitest";

import { visualsMatching } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, hasText, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** The attribute a part verdict carries. Set by `widgetPartVerdict.tsx`, and by nothing else. */
const VERDICT = "[data-verdict]";

/**
 * Every widget that verdicts its parts one at a time, READ OFF THE SOURCES.
 *
 * A written-down list is the thing the next adopter gets left off, and the count under it goes
 * green while the sweep quietly covers a subset: that is how the `SpotTheError` sweep came to
 * run over two of its five widgets. Reaching a mixed board is the one part that cannot be
 * derived — it is a different sequence of moves in every widget — so the SEQUENCES are written
 * down below and the POPULATION is not, and the last test in this file fails if the two ever
 * disagree.
 *
 * The marker is the shared component's NAME, not the attribute it renders: the attribute lives
 * in `widgetPartVerdict.tsx` and appears in no widget's own source, so matching on it would
 * derive an empty population and pass every claim below vacuously.
 */
const PART_VERDICT_VISUALS: readonly LessonVisualId[] =
  visualsMatching(/\bWidgetPartVerdict\b/);

/** Three adopters today. A floor, not a count: growth joins the sweep with no edit here. */
const ADOPTER_FLOOR = 3;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** A theme token as the browser resolves it, for comparing against rendered text. */
function token(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

/** First live button under `root` whose visible text contains `text`, or null. */
function findButton(root: ParentNode, text: string): HTMLButtonElement | null {
  return (
    all<HTMLButtonElement>(root, "button").find(
      (b) => !b.disabled && (b.textContent ?? "").includes(text),
    ) ?? null
  );
}

async function board(id: LessonVisualId, onComplete: () => void): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} onComplete={onComplete} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

function hasLatexStartingWith(root: ParentNode, latex: string): boolean {
  return all(root, "[data-latex]").some((node) =>
    (node.getAttribute("data-latex") ?? "").startsWith(latex),
  );
}

/**
 * The row of boxes labelled `key`, which is either the LaTeX its label is typeset from or the
 * plain words of that label. Both, because these boards head a part either way: RAD.2's rows are
 * headed $\sqrt{24} =$ and RAD.3's are headed "Power =".
 *
 * Falls back to the field itself where there is no row wrapper, so the red this file produces on
 * a board that grades everything at once is the verdict assertion failing by name rather than a
 * helper throwing on a missing class.
 */
function rowFor(widget: HTMLElement, key: string): HTMLElement {
  // A part container that NAMES itself, tried first. `.lesson-interactive__field` is one
  // markup family and there are others: a board laid out as `.lesson-equation__row` satisfies
  // R28 exactly as well and this locator could not see it, so a widget could verdict its parts
  // correctly and still be undrivable here. `data-part-row` is set by the widget, carries the
  // key the driver names the part by, and wraps the part AND the note underneath it, which is
  // what `note()` needs; nothing about it changes the existing family's path below.
  const named = widget.querySelector<HTMLElement>(`[data-part-row="${key}"]`);
  if (named !== null) {
    return named;
  }
  const field = all<HTMLElement>(widget, ".lesson-interactive__field").find(
    (node) =>
      hasLatexStartingWith(node, key) ||
      all(node, ".lesson-interactive__field-label").some(
        (label) =>
          label.querySelector("[data-latex]") === null &&
          (label.textContent ?? "").includes(key),
      ),
  );
  if (field === undefined) {
    throw new Error(`no field of boxes for ${key}`);
  }
  return field.closest<HTMLElement>(".lesson-interactive__row") ?? field;
}

/** Whether the part labelled `key` is still on the board at all. */
function present(widget: HTMLElement, key: string): boolean {
  try {
    rowFor(widget, key);
    return true;
  } catch {
    return false;
  }
}

function boxes(row: HTMLElement): HTMLInputElement[] {
  return all<HTMLInputElement>(row, "input");
}

/** The slot buttons of a part answered by picking, rather than by typing. */
function slots(row: HTMLElement): HTMLButtonElement[] {
  return all<HTMLButtonElement>(row, "button.lesson-equation__slot");
}

/**
 * The chips of a part answered by TAPPING ONE OF ITS CALLS, on a part that holds nothing else.
 *
 * A third shape, beside a field of boxes and a row of drop slots, and the same argument as the
 * slots: a part whose answer is a call is a legitimate part, and this file could not drive one.
 * `domain-range-slider`'s first part is three calls and nothing else — no box and no slot holds
 * its answer — so `boxes` and `slots` both came back empty and the part read as having no
 * controls at all: `fill` was a no-op on it, `latched` was false however it was answered, and
 * `names` was the empty string, which is the one value every name assertion below would fail on.
 *
 * Empty where the part HAS boxes or slots, so nothing already driven here changes behaviour.
 * That is not tidiness: several of those rows carry chips of their own — a direction, a bracket,
 * a connector — which are not what holds the part's answer, and folding them in would make
 * `answerable` true of a row that had latched.
 */
function picks(row: HTMLElement): HTMLButtonElement[] {
  if (boxes(row).length > 0 || slots(row).length > 0) {
    return [];
  }
  return all<HTMLButtonElement>(row, "button.lesson-interactive__chip");
}

/**
 * Put an answer in one part, whether the part is typed or picked.
 *
 * Two entry shapes, and the branch is on what the part HAS rather than on a flag the case has to
 * remember to set: a part with boxes is filled, and a part with slots is answered by opening each
 * slot and taking the tray chip whose typeset math matches. A build-an-expression board is a
 * legitimate way to hold two independent answers and this file could not drive one.
 */
async function fill(
  row: HTMLElement,
  values: readonly string[],
  widget?: HTMLElement,
): Promise<void> {
  const inputs = boxes(row);
  if (inputs.length > 0) {
    for (const [at, box] of inputs.entries()) {
      const value = values[at];
      if (value !== undefined && !box.disabled) {
        setInputValue(box, value);
      }
    }
    return;
  }
  const calls = picks(row);
  if (calls.length > 0) {
    for (const value of values) {
      const chip = calls.find(
        (option) => !option.disabled && (option.textContent ?? "").includes(value),
      );
      if (!chip) {
        throw new Error(`no call reading "${value}" on this part`);
      }
      chip.click();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return;
  }
  const tray = widget ?? (row.closest(".lesson-interactive") as HTMLElement | null) ?? row;
  for (const [at, slot] of slots(row).entries()) {
    const value = values[at];
    if (value === undefined || slot.disabled) {
      continue;
    }
    slot.click();
    // A tick, because opening the slot and taking the chip are two events and the widget has to
    // have committed the first before the second lands on it.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const chip = all<HTMLButtonElement>(tray, ".lesson-interactive__chip").find((option) =>
      all(option, "[data-latex]").some(
        (node) => (node.getAttribute("data-latex") ?? "") === value,
      ),
    );
    if (!chip) {
      throw new Error(`no tray chip carrying ${value}`);
    }
    chip.click();
  }
}

/**
 * Whether a part has LATCHED: answered, and no longer the learner's to change.
 *
 * Three carriers, because three shapes of part are legitimate and the claim is about the part
 * being closed rather than about which attribute closes it. `readOnly` is what a latched box
 * carries where taking it out of the tab order would cost a screen-reader user the value they
 * just produced, and asserting `disabled` alone would have pushed a widget into the worse of the
 * two for a locator's sake.
 */
function latched(row: HTMLElement): boolean {
  const inputs = boxes(row);
  if (inputs.length > 0) {
    return inputs.every((box) => box.disabled || box.readOnly);
  }
  const picked = [...slots(row), ...picks(row)];
  return picked.length > 0 && picked.every((control) => control.disabled);
}

/** Whether a part is still answerable: the missed half of a mixed board must stay so. */
function answerable(row: HTMLElement): boolean {
  return (
    row.querySelector("input:not([disabled]):not([readonly])") !== null ||
    slots(row).some((slot) => !slot.disabled) ||
    picks(row).some((call) => !call.disabled)
  );
}

/**
 * Submit one part and wait for the board to settle.
 *
 * Takes the part's own button where it has one and the board's otherwise, so the same script
 * drives both shapes. The wait is a flush rather than a wait for a verdict, because a board that
 * verdicts nothing is exactly the one this file has to produce a red against rather than hang on.
 */
async function submit(widget: HTMLElement, row: HTMLElement): Promise<void> {
  const own = row.querySelector<HTMLButtonElement>(".lesson-interactive__check");
  const button =
    own ??
    all<HTMLButtonElement>(widget, ".lesson-interactive__check").find((b) => !b.disabled);
  if (!button) {
    throw new Error("nothing to submit the part with");
  }
  button.click();
  await new Promise<void>((resolve) => setTimeout(resolve, 40));
}

/** What one part's verdict is saying, in every channel it says it in. */
function verdict(row: HTMLElement): {
  state: string;
  word: string;
  glyph: string;
  colour: string;
} | null {
  const mark = row.querySelector<HTMLElement>(VERDICT);
  if (mark === null) {
    return null;
  }
  const glyph = mark.querySelector<HTMLElement>("[aria-hidden='true']");
  return {
    state: mark.getAttribute("data-verdict") ?? "",
    // The word, with the decorative glyph taken back out of it.
    word: (mark.textContent ?? "").replace(glyph?.textContent ?? "", "").trim(),
    glyph: (glyph?.textContent ?? "").trim(),
    colour: getComputedStyle(mark).color,
  };
}

/**
 * The accessible names of a part's own controls, which have to say the verdict too.
 *
 * Boxes AND slots, because a part answered by picking names itself on its slot buttons and has no
 * input at all: reading inputs alone returned the empty string for three widgets that carry the
 * verdict in their names correctly.
 */
function names(row: HTMLElement): string {
  return [...boxes(row), ...slots(row), ...picks(row)]
    .map((control) => control.getAttribute("aria-label") ?? "")
    .join(" | ")
    .toLowerCase();
}

/** The sentence answering a missed part, under the part it is about. */
function note(row: HTMLElement): HTMLElement | null {
  return row.querySelector<HTMLElement>(".lesson-interactive__row-note");
}

/** Every piece of typeset math inside one element, as the LaTeX it was built from. */
function mathIn(root: HTMLElement): string {
  return all(root, "[data-latex]")
    .map((n) => n.getAttribute("data-latex") ?? "")
    .join("|");
}

/** One widget, and how to get a MIXED board out of it: one part right, one part wrong. */
interface MixedCase {
  id: LessonVisualId;
  /** Drive the widget to the round the report was filed against. */
  reach: (widget: HTMLElement) => Promise<HTMLElement>;
  /** True when each part is submitted on its own button rather than the board's. */
  perPartButton: boolean;
  right: { label: string; entries: readonly string[] };
  wrong: {
    label: string;
    entries: readonly string[];
    /** Math the note must quote back, proving it answered the entry rather than the method. */
    quotes: readonly string[];
    /** The entry that IS right for this part, for the half of the gate claim that must pass. */
    answer: readonly string[];
  };
  /** True once the round has moved past these parts. The gate claim is asserted on this. */
  advanced: (widget: HTMLElement) => boolean;
  /** The generic line the per-part notes replaced. It may not still be on the board. */
  retired: string;
  /**
   * What the reveal's LABEL has to carry so it says which part it is about.
   *
   * Per adopter, because what tells two parts apart is per adopter: it was the radicand on RAD.2's
   * two roots and it is the name of the rule, the branch or the ray elsewhere. It sat here as a
   * literal `"54"` inside a `test.each` over the whole population, which made a claim about one
   * board read as a claim about all of them, and the second adopter to land failed on it.
   */
  revealNames: string;
  /**
   * Whether a reveal on the missed part still leaves ANOTHER answer outstanding.
   *
   * Per adopter, and it has to be: `othersRemain` is false on the reveal that explains the LAST
   * outstanding answer, and on a two-part board the missed part IS the last one once the other has
   * latched. RAD.2's round has further steps behind its two rows, so a reveal there always has
   * something to hand back for, and asserting that shape universally made this test require the
   * opposite of what R28 says a two-part board should do.
   */
  handsBack: boolean;
  /**
   * A mixed board on the round the widget OPENS on, for the gate claim.
   *
   * The verdict claims are asserted on the round each report was filed against, which for RAD.2
   * means walking a round first. The gate claim cannot afford that: a loosened gate takes the
   * parts off the board, so the walk itself would fail and the red would be a locator throw in a
   * helper rather than the gate assertion failing by name. Omitted where the reported round IS
   * the opening one.
   */
  gate?: GateRound;
}

/** A mixed board, with only what the gate claim needs of it. */
interface GateRound {
  right: { label: string; entries: readonly string[] };
  wrong: { label: string; entries: readonly string[]; answer: readonly string[] };
}

const MIXED_CASES: readonly MixedCase[] = [
  {
    // RAD.2 slide 1, round 2: the reported screen. sqrt(24) + sqrt(54), which simplify to
    // 2sqrt(6) and 3sqrt(6). Round 1 is sqrt(45) + sqrt(20), so it has to be worked first.
    id: "combine-radicals-builder",
    reach: async (widget) => {
      const first = rowFor(widget, "\\sqrt{45}");
      await fill(first, ["3", "5"]);
      await submit(widget, first);
      const second = rowFor(widget, "\\sqrt{20}");
      await fill(second, ["2", "5"]);
      await submit(widget, second);
      // Both roots came to 3sqrt(5) and 2sqrt(5), so they are like radicals and they add.
      await waitFor(
        () => findButton(widget, "Add them into one term") !== null,
        "the decide step never opened",
      );
      (findButton(widget, "Add them into one term") as HTMLButtonElement).click();
      await waitFor(
        () => all<HTMLInputElement>(widget, "input:not([disabled])").length === 1,
        "the sum step never opened",
      );
      setInputValue(
        all<HTMLInputElement>(widget, "input:not([disabled])")[0] as HTMLInputElement,
        "5",
      );
      (findButton(widget, "Combine") as HTMLButtonElement).click();
      await waitFor(
        () => findButton(widget, "Next: a new pair") !== null,
        "the round never closed",
      );
      (findButton(widget, "Next: a new pair") as HTMLButtonElement).click();
      await waitFor(
        () => hasLatexStartingWith(widget, "\\sqrt{24}"),
        "the second pair was never dealt",
      );
      return widget;
    },
    perPartButton: true,
    right: { label: "\\sqrt{24}", entries: ["2", "6"] },
    // 2sqrt(27) is sqrt(108), so the value moved: the note has to say what it came to.
    wrong: {
      label: "\\sqrt{54}",
      entries: ["2", "27"],
      quotes: ["108", "\\sqrt{54}"],
      answer: ["3", "6"],
    },
    // Both roots simplified, so the round is on the "do these combine?" call.
    advanced: (widget) => findButton(widget, "Add them into one term") !== null,
    retired: "Keep taking perfect squares out of each radicand",
    // The radicand is the only thing telling RAD.2's two rows apart.
    revealNames: "54",
    handsBack: true,
    // Round 1, sqrt(45) + sqrt(20), reached without walking anything: 4sqrt(5) is sqrt(80).
    gate: {
      right: { label: "\\sqrt{45}", entries: ["3", "5"] },
      wrong: { label: "\\sqrt{20}", entries: ["4", "5"], answer: ["2", "5"] },
    },
  },
  {
    // RAD.3 slide 3, round 1: x^(6/5) into a root, power 6 and index 5. The miss this invites
    // is the swap, so the wrong entry is the OTHER number of the pair.
    id: "radical-form-builder",
    reach: async (widget) => widget,
    perPartButton: false,
    right: { label: "Power", entries: ["6"] },
    wrong: { label: "Index", entries: ["6"], quotes: ["6"], answer: ["5"] },
    advanced: (widget) => findButton(widget, "Next: a new fraction exponent") !== null,
    retired: "A fraction exponent splits into two different jobs",
    revealNames: "Reveal",
    handsBack: false,
  },
  {
    // LIN.1 slide 2, opening board: 7x - 4 = 2x + 11. Five ingots are left once the smaller pile
    // comes off both pans, and one of them weighs 3. The miss this invites is adding the two
    // piles instead of taking one off both sides, which gives 9.
    id: "both-pans-builder",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "one ingot", entries: ["3"] },
    wrong: { label: "ingots left", entries: ["9"], quotes: ["7", "2"], answer: ["5"] },
    advanced: (widget) =>
      findButton(widget, "Start over with a different weighing") !== null,
    retired: "Not quite",
    revealNames: "gathered count",
    handsBack: false,
  },
  {
    // LIN.3 slide 3, opening board: S = 4w - r on a floor with S = 40 and r = 8. The sound
    // rearrangement, (S + r) / 4, returns 12 and the unsound one leaves the division out and
    // returns 48, which is the whole point of the trial; the miss is answering the unsound
    // candidate with the floor's real width.
    //
    // It was P = 2l + 2w returning 6 against 12, and that board was the curb rule worked example
    // 2 rearranges in full three slides earlier, so the trial ran on a rearrangement the lesson
    // had already handed over.
    id: "formula-check-play",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "sound", entries: ["12"] },
    wrong: { label: "unsound", entries: ["12"], quotes: [], answer: ["48"] },
    advanced: (widget) => findButton(widget, "Run the trial") !== null,
    retired: "Not quite",
    revealNames: "what it returns",
    handsBack: false,
  },
  {
    // LIN.4 slide 4, opening board: 6x + 5 <= 41 gives an endpoint of 6, and -4x < 20 gives -5.
    // The miss is reading the second endpoint off the prompt without dividing, which gives 20.
    id: "interval-write-builder",
    reach: async (widget) => {
      // Both rows need their direction and bracket chips before an endpoint can be checked.
      const duty = rowFor(widget, "duty");
      (findButton(duty, "Runs downward") as HTMLButtonElement).click();
      (findButton(duty, "Endpoint in") as HTMLButtonElement).click();
      const rebate = rowFor(widget, "rebate");
      (findButton(rebate, "Runs upward") as HTMLButtonElement).click();
      (findButton(rebate, "Endpoint out") as HTMLButtonElement).click();
      return widget;
    },
    perPartButton: true,
    right: { label: "duty", entries: ["6"] },
    wrong: { label: "rebate", entries: ["20"], quotes: [], answer: ["-5"] },
    advanced: (widget) =>
      findButton(widget, "Start over with two different rules") !== null,
    retired: "Not quite",
    revealNames: "this range",
    handsBack: false,
  },
  {
    // LIN.3 slide 2, opening board: two rules to re-point, each one a fraction built from tray
    // chips. The miss is the numerator that multiplied only one term of the other side.
    id: "formula-isolate-builder",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "a", entries: ["2A - hb", "h"] },
    wrong: { label: "n", entries: ["T - c", "p"], quotes: [], answer: ["T - pc", "p"] },
    advanced: (widget) =>
      findButton(widget, "Start over with two different rules") !== null,
    retired: "Not quite",
    revealNames: "the rule for",
    handsBack: false,
  },
  {
    // LIN.5 slide 1, opening board: |w - 34| = 5 unpacks into two branches. The miss is the chip
    // that flips the sign INSIDE the bars, `w + 34 = -5`, which solves to -39 and is not a branch
    // of this equation at all.
    //
    // This used to name `-w + 34 = 5` as the miss, and that was wrong: it is `-(w - 34) = 5`,
    // which rearranges to `w - 34 = -5` and lands on the same 29 as the canonical negative
    // branch. The widget rejected it and told the learner a rule that is not one, so the widget
    // now accepts it and this guard had to stop calling a correct answer a miss. The sign-flip
    // chip is a genuine error and keeps the one-right-one-wrong shape this case exists to check.
    id: "abs-branch-builder",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "positive", entries: ["w - 34 = 5"] },
    wrong: {
      label: "negative",
      entries: ["w + 34 = -5"],
      quotes: [],
      answer: ["w - 34 = -5"],
    },
    advanced: (widget) => findButton(widget, "Start over on a different rule") !== null,
    retired: "Not quite",
    revealNames: "branch",
    handsBack: false,
  },
  {
    // LIN.6 slide 2, opening board: |w - 45| > 6 leaves two rays pointing outwards. The miss is
    // the ray that points INWARDS, which is what keeping the sign's direction produces.
    id: "abs-union-builder",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "lower", entries: ["(-\\infty, 39)"] },
    wrong: {
      label: "upper",
      entries: ["(-\\infty, 51)"],
      quotes: [],
      answer: ["(51, \\infty)"],
    },
    advanced: (widget) => findButton(widget, "Start over on a different rule") !== null,
    retired: "Not quite",
    revealNames: "ray",
    handsBack: false,
  },
  {
    // RAD.3 slide 4, round 1: the square root of x^5 back into an exponent. The p/q call comes
    // first, and 5 > 2 so the un-swapped form is the first chip on offer.
    id: "exponent-form-builder",
    reach: async (widget) => {
      (
        all<HTMLButtonElement>(widget, ".lesson-interactive__step")[0] as HTMLButtonElement
      ).click();
      await waitFor(
        () => all<HTMLInputElement>(widget, "input").length === 2,
        "the build step never opened",
      );
      return widget;
    },
    perPartButton: false,
    right: { label: "Exponent numerator", entries: ["5"] },
    wrong: { label: "Exponent denominator", entries: ["5"], quotes: ["5"], answer: ["2"] },
    advanced: (widget) => findButton(widget, "Next: a new root") !== null,
    retired: "The power sitting under the root goes on top",
    revealNames: "Reveal",
    handsBack: false,
  },
  {
    // POL.3 slide 0, opening board: x^2 = 121. Two boxes, either root in either of them, and
    // the miss the board is built around is typing the same root twice: the positive one is
    // the value a learner reaches for and the second box refuses a repeat.
    id: "square-side-solver",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "first solution", entries: ["11"] },
    wrong: { label: "second solution", entries: ["11"], quotes: [], answer: ["-11"] },
    advanced: (widget) => findButton(widget, "Start over with a different court") !== null,
    retired: "Not quite",
    revealNames: "the other solution",
    handsBack: false,
  },
  {
    // POL.1 slide 1, opening board: the two orders sorted, then each bin totalled. The plain
    // units come to 17 and the squared terms to 7, and the miss is adding the coefficients of
    // the WRONG pair, which the board's own repeated coefficients invite.
    id: "stone-pieces-sorter",
    reach: async (widget) => {
      // Every chip has to be placed before the totals open. The tray deals them mixed, so each
      // is taken by its accessible name and dropped on the bin whose name it belongs to.
      const drops: readonly (readonly [string, string])[] = [
        ["3 x squared", "x squared terms"],
        ["4 x squared", "x squared terms"],
        ["4 x", "x terms"],
        ["3 x", "x terms"],
        ["plain 8", "plain unit terms"],
        ["plain 9", "plain unit terms"],
      ];
      for (const [chip, bin] of drops) {
        const held = all<HTMLElement>(widget, ".lesson-sorter__chip").find(
          (node) => node.getAttribute("aria-label") === chip,
        );
        if (!held) {
          throw new Error(`no chip named ${chip}`);
        }
        held.click();
        const target = all<HTMLElement>(widget, ".lesson-sorter__bin").find(
          (node) => node.getAttribute("aria-label") === bin,
        );
        if (!target) {
          throw new Error(`no bin named ${bin}`);
        }
        target.click();
        await waitFor(
          () =>
            !all<HTMLElement>(widget, ".lesson-sorter__chip").some(
              (node) => node.getAttribute("aria-label") === chip,
            ),
          `${chip} never left the tray`,
        );
      }
      await waitFor(
        () => all<HTMLInputElement>(widget, "input").length === 3,
        "the totals never opened",
      );
      return widget;
    },
    perPartButton: true,
    right: { label: "plain unit terms", entries: ["17"] },
    wrong: { label: "x squared terms", entries: ["12"], quotes: [], answer: ["7"] },
    // Three bins, so "moved past THESE parts" is both named rows latching rather than the whole
    // board finishing: the third bin is still the learner's when these two are done.
    advanced: (widget) =>
      latched(rowFor(widget, "plain unit terms")) &&
      latched(rowFor(widget, "x squared terms")),
    retired: "Not quite",
    revealNames: "x squared terms",
    handsBack: true,
  },
  {
    // POL.4 slide 2, opening board: x^2 + 8x - 9 = 0. The bracket takes 4 and the right-hand
    // side takes 25, and the miss is the step this row exists for: adding the completing 16 to
    // the left only, which leaves 16 rather than 9 + 16.
    id: "complete-square-solver",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "the bracket", entries: ["4"] },
    wrong: { label: "the right side", entries: ["16"], quotes: [], answer: ["25"] },
    // Three rows, so "moved past THESE parts" is both named rows latching: the solutions row is
    // still open when these two are done.
    advanced: (widget) =>
      latched(rowFor(widget, "the bracket")) && latched(rowFor(widget, "the right side")),
    retired: "Not quite",
    revealNames: "the right side",
    handsBack: true,
  },
  {
    // POL.8 slide 1, opening board: (3x^2 + 14x + 8) / (x + 4). The first multiplier is 3x and
    // the second is 2, and the miss is carrying the first multiplier's coefficient into the
    // second step rather than reading what the subtraction left.
    id: "long-division-stepper",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "first step", entries: ["3"] },
    wrong: { label: "second step", entries: ["3"], quotes: [], answer: ["2"] },
    advanced: (widget) =>
      findButton(widget, "Start over with a different division") !== null,
    retired: "Not quite",
    revealNames: "second multiplier",
    handsBack: false,
  },
  {
    // FUN.2 slide 3, opening board: the domains of sqrt(x - 5) and 8 / sqrt(3 - x). Same
    // arithmetic on each root and opposite brackets, because the second root is on the bottom.
    // The miss is reading the boundary off the wrong side of the subtraction, which turns
    // 3 - x >= 0 into 4.
    id: "domain-interval-build",
    reach: async (widget) => {
      // A domain is three pieces and cannot be checked until all three are in, so each row's
      // direction and bracket go on before its boundary is typed.
      const root = rowFor(widget, "b0-root");
      (findButton(root, "Inputs run upward") as HTMLButtonElement).click();
      (findButton(root, "Boundary allowed") as HTMLButtonElement).click();
      const quotient = rowFor(widget, "b0-quotient");
      (findButton(quotient, "Inputs run downward") as HTMLButtonElement).click();
      (findButton(quotient, "Boundary refused") as HTMLButtonElement).click();
      return widget;
    },
    perPartButton: true,
    right: { label: "b0-root", entries: ["5"] },
    wrong: { label: "b0-quotient", entries: ["4"], quotes: [], answer: ["3"] },
    advanced: (widget) =>
      findButton(widget, "Start over with two different rules") !== null,
    retired: "Not quite",
    // The letter the rule is called by is the only thing telling the two rows apart.
    revealNames: "domain of g",
    handsBack: false,
  },
  {
    // FUN.2 slide 1, opening board: f(x) = x^2 + 3 swept from -4 to 4. The readings run upward
    // from one lowest value, and that value is 3 rather than 0: the miss is reading the
    // square's own floor off and leaving the constant sitting on top of it out.
    id: "domain-range-slider",
    reach: async (widget) => widget,
    // The way the readings run is settled by TAPPING a call, so that part has no submit button
    // of its own: the one Check on the board belongs to the limit.
    perPartButton: false,
    right: { label: "way", entries: ["Upward from a lowest reading"] },
    wrong: { label: "limit", entries: ["0"], quotes: [], answer: ["3"] },
    advanced: (widget) =>
      findButton(widget, "Start over with a different machine") !== null,
    retired: "Not quite",
    revealNames: "the limit",
    handsBack: false,
  },
  {
    // FUN.4 slide 3, opening board: a chart peaking at 8 by hour 4, with four rows to fill.
    // The last two rows are the same mark read along each scale in turn, and the miss is the
    // one the board is built around: answering the reading row with the hour.
    id: "feature-table",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "increasing on", entries: ["(0, 4)"] },
    // "maximum" is a prefix of the row below it, "hour of the maximum", and `rowFor` takes the
    // FIRST label containing the key: the extremum row is drawn above the hour row, so the key
    // resolves to the row this case is about.
    wrong: { label: "maximum", entries: ["4"], quotes: [], answer: ["8"] },
    // Four rows, so "moved past THESE parts" is the two named rows latching: the other two are
    // still the learner's when these are done.
    advanced: (widget) =>
      latched(rowFor(widget, "increasing on")) && latched(rowFor(widget, "maximum")),
    retired: "Not quite",
    revealNames: "maximum",
    handsBack: true,
  },
  {
    // FUN.4 slide 2, once the pen has swept the whole shift: four turns named local, and the
    // question is which of them carries the absolute maximum of the shift and which the
    // absolute minimum. The miss is answering the minimum with the reading the shift opened on.
    id: "feature-trace-walkthrough",
    reach: async (widget) => {
      // The two readings are only asked for once the pen has run the whole shift, and the
      // control steps one leg per press.
      for (let leg = 0; leg < 6; leg += 1) {
        findButton(widget, "Step")?.click();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      await waitFor(
        () => all<HTMLInputElement>(widget, "input").length === 2,
        "the two readings never opened",
      );
      return widget;
    },
    perPartButton: true,
    right: { label: "absolute maximum", entries: ["9"] },
    wrong: { label: "absolute minimum", entries: ["3"], quotes: [], answer: ["2"] },
    advanced: (widget) => findButton(widget, "Start over with a different shift") !== null,
    retired: "Not quite",
    revealNames: "absolute minimum",
    handsBack: false,
  },
  {
    // FUN.9 slide 0, opening board: g(x) = f(x + 3) + 1 on a trace whose peak is at (-2, 2),
    // so the peak lands at (-5, 3). The constant inside the brackets is UNDONE and the one
    // outside is not, and the miss is the board's own: reversing the one that does not reverse,
    // which gives a reading of 1.
    id: "transform-shift-slider",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "input", entries: ["-5"] },
    wrong: { label: "reading", entries: ["1"], quotes: [], answer: ["3"] },
    advanced: (widget) => findButton(widget, "Start over with a different shift") !== null,
    retired: "Not quite",
    revealNames: "the reading",
    handsBack: false,
  },
  {
    // FUN.9 slide 1, opening board: a trace reading -3 at x = 0, asked to reach 9 there, so
    // the gain is -3. A gain cannot move a crossing at all, and the miss is naming the positive
    // crossing where the board asks for the negative one.
    id: "transform-stretch-explore",
    reach: async (widget) => widget,
    perPartButton: true,
    right: { label: "a =", entries: ["-3"] },
    wrong: { label: "x =", entries: ["2"], quotes: [], answer: ["-2"] },
    advanced: (widget) => findButton(widget, "Start over with a different trace") !== null,
    retired: "Not quite",
    revealNames: "the crossing",
    handsBack: false,
  },
];

/**
 * Fill both parts and submit them. On a board with one button that is ONE press, which is the
 * state the mixed-verdict claim is about.
 *
 * The second press is skipped if the first one took the missed part off the board, rather than
 * throwing on the lookup. That is a gate that opened on one right part out of two, and it has to
 * reach the assertion that says so: a red inside this helper would name a missing locator.
 */
async function submitBoth(
  widget: HTMLElement,
  round: GateRound,
  perPartButton: boolean,
): Promise<void> {
  await fill(rowFor(widget, round.right.label), round.right.entries, widget);
  await fill(rowFor(widget, round.wrong.label), round.wrong.entries, widget);
  await submit(widget, rowFor(widget, round.right.label));
  if (perPartButton && present(widget, round.wrong.label)) {
    await submit(widget, rowFor(widget, round.wrong.label));
  }
}

test.each(MIXED_CASES.map((c) => [c.id, c] as const))(
  "%s: one part right and one part wrong carry two different treatments",
  async (id, testCase) => {
    let completed = 0;
    const widget = await testCase.reach(
      await board(id, () => {
        completed += 1;
      }),
    );

    // The floor: nothing is verdicted before anything is submitted, or a mark means nothing.
    for (const label of [testCase.right.label, testCase.wrong.label]) {
      expect(
        verdict(rowFor(widget, label)),
        `${id}: ${label} was verdicted before it was answered`,
      ).toBeNull();
    }

    await submitBoth(widget, testCase, testCase.perPartButton);

    // CLAIM ONE. Two verdicts on the board at once, and they are not the same verdict.
    const rightSaid = verdict(rowFor(widget, testCase.right.label));
    const wrongSaid = verdict(rowFor(widget, testCase.wrong.label));
    expect(
      rightSaid,
      `${id}: the part the learner got right carries no verdict of its own`,
    ).not.toBeNull();
    expect(
      wrongSaid,
      `${id}: the part the learner got wrong carries no verdict of its own`,
    ).not.toBeNull();
    const correct = rightSaid as NonNullable<typeof rightSaid>;
    const missed = wrongSaid as NonNullable<typeof wrongSaid>;
    expect(correct.state, `${id}: both parts carry the same verdict`).not.toBe(
      missed.state,
    );

    // Non-colour, so the pair survives a palette edit and a colourblind learner: a different
    // word and a different glyph on each, and the boxes say which they belong to by name.
    expect(correct.word, `${id}: the correct part's verdict is not in words`).not.toBe("");
    expect(missed.word, `${id}: the missed part's verdict is not in words`).not.toBe("");
    expect(correct.word, `${id}: both parts read the same`).not.toBe(missed.word);
    expect(correct.glyph, `${id}: the correct part shows no glyph`).not.toBe("");
    expect(missed.glyph, `${id}: the missed part shows no glyph`).not.toBe("");
    expect(correct.glyph, `${id}: both parts show the same glyph`).not.toBe(missed.glyph);
    expect(
      names(rowFor(widget, testCase.wrong.label)),
      `${id}: the missed part's boxes do not name the verdict`,
    ).toContain("not yet");
    expect(
      names(rowFor(widget, testCase.right.label)),
      `${id}: the correct part's boxes claim to be unanswered`,
    ).toContain("correct");
    expect(
      names(rowFor(widget, testCase.right.label)),
      `${id}: the correct part's boxes read as a miss`,
    ).not.toContain("not yet");

    // Colour, paired with all of the above: the correctness channel, and no fourth hue.
    expect(missed.colour, `${id}: a missed part is not marked wrong`).toBe(
      token("--brick"),
    );
    expect(correct.colour, `${id}: a correct part is marked as a mistake`).not.toBe(
      token("--brick"),
    );
    expect(correct.colour, `${id}: a correct part is not the success colour`).toBe(
      token("--civic-dark"),
    );

    // And the answer is to WHAT WAS TYPED. The generic restatement of the method is gone, and
    // what stands in its place quotes the learner's own numbers back at them.
    const explanation = note(rowFor(widget, testCase.wrong.label));
    expect(explanation, `${id}: the missed part is answered with nothing`).not.toBeNull();
    for (const quote of testCase.wrong.quotes) {
      expect(
        mathIn(explanation as HTMLElement),
        `${id}: the note does not quote ${quote} back, so it did not read the entry`,
      ).toContain(quote);
    }
    expect(
      note(rowFor(widget, testCase.right.label)),
      `${id}: a part that was right was given a correction`,
    ).toBeNull();
    expect(
      hasText(widget, testCase.retired),
      `${id}: the board still restates the whole method at every part at once`,
    ).toBe(false);

    // CLAIM TWO, on its own. A right part is not a finished round.
    expect(
      testCase.advanced(widget),
      `${id}: one right part and one wrong one advanced the round`,
    ).toBe(false);
    expect(completed, `${id}: a board with a missed part opened the gate`).toBe(0);
  },
);

test.each(MIXED_CASES.filter((c) => c.perPartButton).map((c) => [c.id, c] as const))(
  "%s: checking one part says nothing about the other",
  async (id, testCase) => {
    let completed = 0;
    const widget = await testCase.reach(
      await board(id, () => {
        completed += 1;
      }),
    );

    // Both parts filled, and only ONE of them submitted. This is the reported request: the
    // learner checks the root they have just worked without being answered about the other.
    await fill(rowFor(widget, testCase.right.label), testCase.right.entries, widget);
    await fill(rowFor(widget, testCase.wrong.label), testCase.wrong.entries, widget);
    await submit(widget, rowFor(widget, testCase.right.label));

    expect(
      verdict(rowFor(widget, testCase.right.label)),
      `${id}: the part that was checked carries no verdict`,
    ).not.toBeNull();
    expect(
      verdict(rowFor(widget, testCase.wrong.label)),
      `${id}: checking one part graded the other one too`,
    ).toBeNull();
    expect(
      note(rowFor(widget, testCase.wrong.label)),
      `${id}: a part nobody submitted was given a correction`,
    ).toBeNull();
    expect(completed, `${id}: one correct part opened the gate`).toBe(0);
  },
);

test.each(MIXED_CASES.map((c) => [c.id, c] as const))(
  "%s: the round moves on only once every part is right",
  async (id, testCase) => {
    let completed = 0;
    // The OPENING round, with no walk in front of it: see `MixedCase.gate`.
    const round: GateRound = testCase.gate ?? {
      right: testCase.right,
      wrong: testCase.wrong,
    };
    const widget =
      testCase.gate === undefined
        ? await testCase.reach(
            await board(id, () => {
              completed += 1;
            }),
          )
        : await board(id, () => {
            completed += 1;
          });

    await submitBoth(widget, round, testCase.perPartButton);
    await new Promise<void>((resolve) => setTimeout(resolve, 60));

    // One part right, one part wrong: the round is still these parts, not the step after them.
    // Asserted BEFORE anything is looked up by label, because a gate that opened here takes the
    // parts off the board and a locator throw is a red that does not name what broke.
    expect(
      testCase.advanced(widget),
      `${id}: one right part and one wrong one advanced the round`,
    ).toBe(false);
    expect(completed, `${id}: a half-right board opened the gate`).toBe(0);
    expect(
      answerable(rowFor(widget, round.wrong.label)),
      `${id}: the missed part was locked, so it cannot be corrected`,
    ).toBe(true);
    expect(
      latched(rowFor(widget, round.right.label)),
      `${id}: the part that was right did not latch`,
    ).toBe(true);

    // Now the missed part, correctly. Only now may the round advance.
    await fill(rowFor(widget, round.wrong.label), round.wrong.answer, widget);
    await submit(widget, rowFor(widget, round.wrong.label));
    await waitFor(
      () => testCase.advanced(widget),
      `${id}: every part is right and the round did not advance`,
    );
  },
);

/**
 * The reveal on one of four live boxes NAMES that box, and hands the board back.
 *
 * Two defects in one control, both of them the same mistake as the graded pair: it was scoped to
 * the widget when the work is per part. Its label read "Reveal this box" while four boxes were
 * live, naming none of them, and it passed no `othersRemain`, so taking it threw away every box
 * the learner had already earned and dealt a different pair — the shape `#184` fixed in the
 * shared layer and this widget never opted into.
 *
 * Asserted only on the shape with per-part buttons: RAD.3's two boxes are one conversion, and
 * their reveal already named which of the two it was about.
 */
test.each(MIXED_CASES.filter((c) => c.perPartButton).map((c) => [c.id, c] as const))(
  "%s: the reveal names the part it is about and spends only what it should",
  async (id, testCase) => {
    let completed = 0;
    const widget = await testCase.reach(
      await board(id, () => {
        completed += 1;
      }),
    );
    const host = h?.host as HTMLElement;

    await submitBoth(widget, testCase, testCase.perPartButton);

    const reveal = host.querySelector<HTMLButtonElement>(
      ".lesson-interactive__reveal-button",
    );
    expect(reveal, `${id}: a missed part put no reveal on offer`).not.toBeNull();
    // WHICH box. The number under the root is the only thing that tells the two rows apart, so
    // the label has to carry it: "this box" was true of four of them.
    expect(
      (reveal as HTMLButtonElement).textContent ?? "",
      `${id}: the reveal does not say which part it is about`,
    ).toContain(testCase.revealNames);

    (reveal as HTMLButtonElement).click();
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal") !== null,
      `${id}: the reveal passage never opened`,
    );
    const resume = host.querySelector<HTMLButtonElement>(
      ".lesson-interactive__resume-button",
    );

    if (!testCase.handsBack) {
      // The missed part was the LAST outstanding answer, so that answer IS the gate: R28 spends
      // the instance here rather than handing it back, and offering it back would be handing the
      // gate over with it. Three halves, because the absence of the resume control alone would
      // also be true of a widget that passed no `othersRemain` at all: the teaching is on screen,
      // the only way on is a fresh instance, and the gate did not open on the way.
      expect(
        resume,
        `${id}: the last outstanding answer was handed back, which hands over the gate`,
      ).toBeNull();
      expect(
        host.querySelector(".lesson-interactive__reask-button"),
        `${id}: the reveal offered no way on at all, so the learner is stranded`,
      ).not.toBeNull();
      expect(
        completed,
        `${id}: revealing the last outstanding answer opened the gate`,
      ).toBe(0);
      return;
    }

    expect(
      resume,
      `${id}: a reveal with other answers outstanding offered nothing but a fresh board`,
    ).not.toBeNull();

    (resume as HTMLButtonElement).click();
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal") === null,
      `${id}: the teaching was never dismissed`,
    );

    // The board is the same board: the part already earned is still earned, and the part the
    // passage explained is still the learner's to produce.
    expect(
      verdict(rowFor(widget, testCase.right.label))?.state,
      `${id}: resuming threw away the part the learner had got right`,
    ).toBe("right");
    expect(
      answerable(rowFor(widget, testCase.wrong.label)),
      `${id}: the explained part came back already answered`,
    ).toBe(true);
    expect(completed, `${id}: resuming opened the gate`).toBe(0);
  },
);

test("the sweep found the widgets that verdict their parts one at a time", () => {
  // Derived, so the next adopter is swept without an edit here. The floor is what stops the
  // whole file passing vacuously if the marker is renamed or the registry lookup misses.
  expect(
    PART_VERDICT_VISUALS.length,
    "the source sweep found fewer widgets verdicting their parts than have adopted it",
  ).toBeGreaterThanOrEqual(ADOPTER_FLOOR);
  expect(new Set(PART_VERDICT_VISUALS).size).toBe(PART_VERDICT_VISUALS.length);

  // And every one it found is actually driven above. Reaching a mixed board is a per-widget
  // sequence and cannot be derived, so this is the assertion that the human half kept up.
  const driven = new Set(MIXED_CASES.map((c) => c.id));
  for (const id of PART_VERDICT_VISUALS) {
    expect(
      driven.has(id),
      `${id} verdicts its parts and no mixed board is driven for it here`,
    ).toBe(true);
  }
});
