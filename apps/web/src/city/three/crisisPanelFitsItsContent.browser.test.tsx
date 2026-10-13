/**
 * **THE CRISIS PANEL IS AS WIDE AS ITS CONTENT NEEDS, AND NO WIDER — RE-DERIVED, NOT PINNED.**
 *
 * `--hw-side` is `min(470px, 50vw)`, and the lead's objection to every width before it was the
 * same one: *"i dont get to see the actual changes in the island because its completely blocked
 * by the panel"*, and then, of the half-screen side panel that replaced the band, that the island
 * is still not visible enough behind it. Each answer to that has been a smaller number somebody
 * chose. This file is what makes 470 a MEASUREMENT instead.
 *
 * ## WHY A GUARD AND NOT JUST A COMMENT WITH THE ARITHMETIC IN IT
 *
 * The number is a property of a SENTENCE and a FONT, and this repository has already been bitten
 * by exactly that: `answerPlaceholderFit.browser.test.tsx` records the same string painting 19.2%
 * wider between the `system-ui` fallbacks a desktop lands on, and `styles.css` ships no
 * `@font-face`, so the crisis panel's body type is whatever the machine has. An arithmetic
 * comment would be true on the machine it was written on and quietly false on the next one.
 *
 * So nothing below is pinned to 470. Every run BINARY-SEARCHES the shipped stylesheet for the
 * narrowest column its own content lays out in, and then asks two questions about the shipped
 * width: is it above that, and is it not far above it. The second question is the one the lead
 * has been asking, and it is the one no previous guard on this surface could fail:
 * `winterInCitySheet.browser.test.tsx` floors the width and ceilings it at 60% of the viewport,
 * which `min(620px, 50vw)` satisfied while he was complaining about it.
 *
 * ## AND THE SEARCH RUNS IN THE WIDEST FAMILY, NOT IN THIS MACHINE'S
 *
 * That was the half this file got wrong first, and CI caught it: the search measured whatever
 * `system-ui` resolved to locally — Noto Sans on the machine it was written on — and reported
 * that the panel needed 455px. The runner resolves DejaVu Sans, which is 7% wider for that
 * sentence, needed 479px, and went red on a merged-looking green branch.
 *
 * `answerPlaceholderFit` had already learned this and written the technique down: measure
 * against the WIDEST family the stack can land on, not against the one the author was served.
 * So {@link widestFallback} paints the binding sentence in every family in {@link FALLBACKS}
 * that the machine actually has, takes the widest, and the bisection runs with that family
 * forced onto the three card descriptions. A local pass now predicts the runner, and the
 * failure message names the family so the next reader does not have to guess.
 *
 * ## WHAT ACTUALLY SETS THE WIDTH, MEASURED BEFORE IT WAS ASSERTED
 *
 * Almost everything in the panel is prose, and prose has no width: it trades width for height.
 * Swept at 2px steps across all four phases, the widest thing in here that cannot reflow is ONE
 * SENTENCE — the middle action card's *"Shields one building, and the frost has to break it
 * first."* at 327.5px in DejaVu Sans, plus its card's 24px of border and padding. Every other
 * candidate is narrower: the widest card LABEL is 192px, the tallest read-out's widest rung
 * 308px, and the answer field — the only element in the panel with an intrinsic width, checked
 * over all 234 items the crisis can draw — 308px. No question prompt binds; the pool's widest
 * KaTeX run is 144px.
 *
 * And that sentence is not a fussy target. The step where it wraps is the step where the DECLARE
 * panel's third action card slides under the pinned commit control at 1024x580, which is what
 * {@link cardsAreWholeAndUncovered} searches on: a player cannot choose between actions they
 * cannot see. Photographed at 414px, that is what it looks like. (It read "three actions" until
 * 2026-08-02, when the give-up-ground action was ruled out and the board became two.)
 *
 * ## THE ONE THING THAT IS NOT A SEARCH
 *
 * At 1024x507 — the lead's window less its browser chrome — the declare step scrolls at EVERY
 * width, today's included, so the card test cannot run there and is not pretended. What is
 * asserted at that height is what still holds: nothing scrolls sideways, and the controls that
 * carry the phase forward are whole and unscrolled.
 *
 * Narrowing does cost that step height, and the cost is one thing rather than a drift: at
 * 1024x580 the declare step goes from 559px to 592px, and all 33px of it is the commit
 * read-out taking its own row below about 504px of panel. Nothing else moved — the settlement
 * strip's key already wrapped at the old width. `.hw-commit` records why the alternative, which
 * keeps the read-out beside the button and those 33px with it, was photographed and rejected.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../../lessons/testHarness";
import {
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterFrozenItem,
} from "../../winter/hardWinterItems";
import { CRISIS_ACTION_ORDER } from "../crisisCall";
import type { PlacedTransform } from "../worldLayout";
import { type WinterCityBoard, WinterInCity } from "./WinterInCity";

import "../../styles.css";

let h: Harness | null = null;
let published: WinterCityBoard | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
  published = null;
});

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/** Era one's six skills on the island, so a batch is always servable. */
const CITY: readonly PlacedTransform[] = [
  placed("NUM.S", -2, -2),
  placed("NUM.F", 0, 3),
  placed("NUM.2", 3, -1),
  placed("NUM.3", -3, 1),
  placed("NUM.4", 1, 1),
  placed("NUM.5", 4, 0),
];

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function panel(): HTMLElement {
  return query<HTMLElement>(".winter-in-city .hw-shell");
}

function mountRoot(): HTMLElement {
  return query<HTMLElement>(".winter-in-city");
}

async function openCrisis(): Promise<HTMLElement> {
  h = mount(
    <WinterInCity
      placements={CITY}
      townHall={null}
      canvasLive
      practisedNodeIds={WINTER_NODE_ORDER}
      onBoard={(board) => {
        published = board;
      }}
      onExit={() => {}}
    />,
  );
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel renders",
  );
  await document.fonts.ready;
  return panel();
}

/** Arm a fire and pick a cell the way the canvas does, through the published board. */
async function aimAndPick(col: number, row: number): Promise<void> {
  findButton(panel(), /Light a fire/).click();
  await waitFor(() => panel().dataset.aiming === "true", "the panel enters aiming");
  await waitFor(() => published?.onAimCell != null, "the board takes a cell pick");
  published?.onAimCell?.(col, row);
  await waitFor(() => panel().dataset.aiming === "false", "a cell is picked");
}

/**
 * Declare a shield, aimed through the island's own `onPickBuilding` seam.
 *
 * **THIS WAS A PULL-BACK UNTIL 2026-08-02**, which needed no target and so was one click. The lead
 * ruled that action out, and the shortest declaration left needs a building — picked the way a
 * player picks one in the city, because there is no 2D grid on this mount.
 */
async function declareAShield(nodeId: string): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(() => published !== null, "the island was never handed a board");
  published?.onPickBuilding(nodeId);
}

async function reachAnswering(): Promise<void> {
  await declareAShield("NUM.S");
  await waitFor(() => !findButton(panel(), /Commit and face/).disabled, "commit arms");
  findButton(panel(), /Commit and face/).click();
  await waitFor(() => panel().dataset.phase === "answering", "the batch opens");
  await document.fonts.ready;
}

async function reachResolved(round: number): Promise<void> {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(`no batch for round ${round}`);
  }
  const keys = batch.prompts.map((prompt) => {
    const key = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    return key;
  });
  for (const [index, key] of keys.entries()) {
    setInputValue(query<HTMLInputElement>(".winter-in-city .hw-panel input"), key);
    await waitFor(
      () => !findButton(panel(), /^Check$/).disabled,
      `Check arms on question ${index + 1}`,
    );
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      `a verdict lands on question ${index + 1}`,
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase === "resolved"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      `the batch moves on from question ${index + 1}`,
    );
  }
}

/** Force the panel to a width, or hand it back to the stylesheet with `null`. */
function overrideWidth(px: number | null): void {
  const root = mountRoot();
  if (px === null) {
    root.style.removeProperty("--hw-side");
  } else {
    root.style.setProperty("--hw-side", `${px}px`);
  }
}

/**
 * THE PROPERTY THE DECLARE STEP'S WIDTH IS SEARCHED ON: every action card drawn whole,
 * inside the panel's visible box, and clear of the commit control pinned to its foot.
 *
 * Against the COMMIT ROW's top edge rather than the panel's bottom, and that is the half that
 * bites: `.hw-commit` is `position: sticky`, so it is painted over whatever has scrolled under
 * it. A card whose bottom is inside the panel but behind that bar is a card the player cannot
 * read, and "inside the panel" alone would call it visible.
 */
function cardsAreWholeAndUncovered(): boolean {
  const shell = panel().getBoundingClientRect();
  const commit = query<HTMLElement>(".winter-in-city .hw-commit").getBoundingClientRect();
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(".winter-in-city .hw-action"),
  );
  // Derived from the engine's action union rather than pinned at three: the give-up-ground action
  // was ruled out on 2026-08-02, and a hardcoded count would have made this predicate false at every
  // width and the width search below unsatisfiable.
  if (cards.length !== CRISIS_ACTION_ORDER.length) {
    return false;
  }
  const floor = Math.min(shell.bottom, commit.top);
  return cards.every((card) => {
    const box = card.getBoundingClientRect();
    return box.top >= shell.top - 1 && box.bottom <= floor + 1;
  });
}

/**
 * Every element inside the panel that has content it cannot show without scrolling sideways.
 *
 * `.katex-mathml` is skipped, and it is the one exclusion here. KaTeX renders every expression
 * twice — a painted `.katex-html` and a MathML mirror for screen readers — and the mirror is
 * deliberately squeezed into a 1px clipping box, so it is "clipped sideways" in every frame this
 * app has ever drawn and is invisible in all of them. {@link CLIPPED_POPULATION_FLOOR} is what
 * stops that exclusion from quietly becoming "measure nothing".
 */
function clippedSideways(): string[] {
  return Array.from(panel().querySelectorAll<HTMLElement>("*"))
    .filter((el) => !el.classList.contains("katex-mathml"))
    .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
    .map((el) => `${el.tagName}.${el.className}`.trim());
}

/** How many elements the sweep above must actually have looked at to have measured anything. */
const CLIPPED_POPULATION_FLOOR = 20;

/** How many elements are in range of that sweep at all. */
function clippedPopulation(): number {
  return Array.from(panel().querySelectorAll<HTMLElement>("*")).filter(
    (el) => !el.classList.contains("katex-mathml") && el.clientWidth > 0,
  ).length;
}

/**
 * Every family `--font-body`'s `system-ui` tail can land on, taken from the table
 * `answerPlaceholderFit.browser.test.tsx` measured. DejaVu Sans is what ubuntu-latest serves
 * and has been the widest of them in both measurements; the list is not ordered by width,
 * because {@link widestFallback} measures rather than assumes.
 */
const FALLBACKS = [
  "DejaVu Sans",
  "Liberation Sans",
  "Arimo",
  "Noto Sans",
  "Inter",
  "Cantarell",
  "FreeSans",
  "Nunito",
] as const;

function paint(text: string, familyList: string, size: string, weight: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d context to measure text with");
  }
  ctx.font = `normal ${weight} ${size} ${familyList}`;
  /*
   * AND THE CANVAS REALLY TOOK IT. `ctx.font` is a shorthand: it is silently DROPPED when it
   * does not parse, leaving the canvas at its 10px sans-serif default, and an unquoted family
   * with a space in it is the classic way in. That failure reports every family at the same
   * width, which reads as "this machine has one font" rather than as a broken instrument — it
   * is exactly how the too-narrow width shipped. Refusing it here is what makes the spread
   * below evidence.
   */
  if (!ctx.font.includes(size)) {
    throw new Error(`the canvas refused the font shorthand for ${familyList}`);
  }
  return ctx.measureText(text).width;
}

/** Whether the machine really has `family`, by the generic-fallback comparison. */
function isInstalled(family: string): boolean {
  const probe = "mmmiiiwwwWWWMMMlll0123";
  return (
    Math.abs(
      paint(probe, `"${family}", monospace`, "40px", "400") -
        paint(probe, "monospace", "40px", "400"),
    ) > 0.5
  );
}

/**
 * Which installed fallback is the worst case for these strings, and by how much.
 *
 * Scored on the WIDEST of the strings it is given rather than on one of them, because which
 * one binds is what the search is for and picking a family off the first `<small>` in the DOM
 * is picking it off whichever card happens to be listed first. It made no difference here —
 * DejaVu Sans is the widest family for all three descriptions — and that is a fact about this
 * copy rather than a property of the method, so the method does not rely on it.
 */
function widestFallback(
  texts: readonly string[],
  size: string,
  weight: string,
): { family: string; width: number; spread: number; measured: number } {
  const present = FALLBACKS.filter(isInstalled).map(
    (family) =>
      [
        family,
        Math.max(...texts.map((text) => paint(text, `"${family}"`, size, weight))),
      ] as const,
  );
  if (present.length === 0) {
    throw new Error(
      `none of ${FALLBACKS.join(", ")} is installed, so the worst case cannot be measured here`,
    );
  }
  const widths = present.map(([, width]) => width);
  const widest = present.reduce((a, b) => (b[1] > a[1] ? b : a));
  return {
    family: widest[0],
    width: widest[1],
    spread: (Math.max(...widths) - Math.min(...widths)) / Math.min(...widths),
    measured: present.length,
  };
}

/** Paint the three card descriptions in `family`, or hand them back to the stylesheet. */
function forceDescriptionFont(family: string | null): void {
  document.getElementById("crisis-width-font")?.remove();
  if (family === null) {
    return;
  }
  const style = document.createElement("style");
  style.id = "crisis-width-font";
  // Only the three elements the search's predicate reads, so nothing else in the panel is
  // measured in a font it does not ship in.
  style.textContent = `.winter-in-city .hw-action small { font-family: "${family}" !important }`;
  document.head.append(style);
}

/**
 * How many visual lines each action card spends on its one-sentence description, right now.
 *
 * A `Range` over the text node rather than the element's height, so this counts LINE BOXES and
 * cannot be fooled by a card that grew for some other reason.
 */
function descriptionLines(): number[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".winter-in-city .hw-action small"),
  ).map((small) => {
    const text = small.childNodes[0];
    if (!text) {
      throw new Error("an action card has no description to measure");
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    return range.getClientRects().length;
  });
}

/**
 * THE WIDTH THE PANEL IS BEING NARROWED FROM: `min(620px, 50vw)`, half the screen.
 *
 * Named because the search below is a COMPARISON and needs something to compare against. The
 * claim this file makes is not "the descriptions are short" — two of the three wrap at any width
 * the panel could plausibly have — it is that narrowing the panel to its content costs the
 * declare step NOTHING it had at half the screen. So the shape at the old width is the reference,
 * and the search finds the narrowest column that still reproduces it.
 */
const WIDTH_THIS_REPLACED = 620;

/**
 * THE NARROWEST COLUMN THE CONTENT LAYS OUT IN, found rather than stated, IN THE WIDEST FONT
 * THE STACK CAN LAND ON.
 *
 * A search and not a constant, because the answer is a property of the font: the binding
 * sentence spans about 15% between the narrowest and widest family a desktop resolves. A number
 * written down here would be an assertion about one container.
 *
 * And the search runs in the widest of them rather than in this machine's, because a search in
 * this machine's is an assertion about one container too — it just looks like a measurement.
 * That is the mistake that shipped: bisected in Noto Sans the panel needed 455px, bisected in
 * DejaVu Sans it needs 479, and the runner has DejaVu.
 *
 * Bisected to the nearest pixel on the LINE COUNTS of the three action-card descriptions, which
 * is a property of the content and holds at every viewport. It is deliberately not bisected on
 * {@link cardsAreWholeAndUncovered}, which is the CONSEQUENCE and only bites on a short window:
 * at 1440x900 there is enough height for all three cards at any width at all, so a search on
 * that predicate has no lower bracket and would return its own floor while looking like a
 * measurement. The consequence is asserted separately, at the window where it is real.
 *
 * The bracket is checked at both ends before the bisection runs, for the same reason.
 */
async function narrowestWorkingWidth(): Promise<{
  width: number;
  reference: number[];
  atShipped: number[];
  font: { family: string; width: number; spread: number; measured: number };
}> {
  const descriptions = Array.from(
    document.querySelectorAll<HTMLElement>(".winter-in-city .hw-action small"),
  );
  const first = descriptions[0];
  if (!first) {
    throw new Error("no action-card descriptions to size against");
  }
  const style = getComputedStyle(first);
  const font = widestFallback(
    descriptions.map((small) => small.textContent ?? ""),
    style.fontSize,
    style.fontWeight,
  );
  forceDescriptionFont(font.family);

  try {
    overrideWidth(WIDTH_THIS_REPLACED);
    await settle();
    // TWO CARDS since the give-up-ground action was ruled out on 2026-08-02, and the count is
    // derived from the engine's action union rather than written down: a search that measured a
    // different number of cards than the board offers would be searching for the wrong width.
    const reference = descriptionLines();
    if (reference.length !== CRISIS_ACTION_ORDER.length) {
      throw new Error(
        `expected ${CRISIS_ACTION_ORDER.length} action cards, measured ${reference.length}`,
      );
    }
    const holds = () => {
      const now = descriptionLines();
      return now.every((lines, i) => lines <= (reference[i] ?? 0));
    };

    let low = 300;
    let high = WIDTH_THIS_REPLACED;
    overrideWidth(low);
    await settle();
    if (holds()) {
      throw new Error(
        `the search bracket is broken: the descriptions still fit at ${low}px, ` +
          `so the reference ${reference.join("/")} is not one narrowing can lose`,
      );
    }
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      overrideWidth(mid);
      await settle();
      if (holds()) {
        high = mid;
      } else {
        low = mid;
      }
    }
    // And the shape the SHIPPED width gets, read while the widest font is still forced: the
    // caller's own `descriptionLines()` would be measured after the restore, in whatever the
    // machine serves, which is the comparison this file exists to stop making.
    overrideWidth(null);
    await settle();
    const atShipped = descriptionLines();
    return { width: high, reference, atShipped, font };
  } finally {
    overrideWidth(null);
    forceDescriptionFont(null);
    await settle();
  }
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 12));
}

/**
 * How far above its content the panel is allowed to sit.
 *
 * A CEILING AND NOT A TARGET, and it is the assertion this file exists for: a floor alone is
 * what every previous guard on this surface had, and `min(620px, 50vw)` cleared all of them
 * while the lead was objecting to it. 25% is narrow enough to fail the width this replaced —
 * at 1440x900 the old `620px` is 1.40x the measured requirement against the shipped `470px`'s
 * 1.06x — and wide enough that it is not tripped by the padding branch, which leaves 12px more
 * content at a short viewport and puts the same panel at 1.09x there.
 */
const OVER_ITS_CONTENT = 0.25;

/**
 * 1024x580 is the lead's own window; 1440x900 is a roomy one, where the panel's own padding is
 * 6px larger on each side and the content column is therefore 12px narrower for the same width.
 * Both are above 940px, which is where the `470px` cap binds rather than the `50vw` share, so
 * both are measuring the CAP and not the clamp.
 */
const CAP_BINDS = [
  { width: 1024, height: 580 },
  { width: 1440, height: 900 },
] as const;

for (const view of CAP_BINDS) {
  test(`the declare step is sized to its content at ${view.width}x${view.height}`, async () => {
    await page.viewport(view.width, view.height);
    await openCrisis();
    expect(panel().dataset.phase).toBe("declaring");

    const shipped = panel().getBoundingClientRect().width;
    const { width: needed, reference, atShipped, font } = await narrowestWorkingWidth();
    const sizedAgainst = `sized against ${font.family}, the widest of ${font.measured} installed fallbacks (spread ${(font.spread * 100).toFixed(1)}%)`;

    // The premise: the search really did bind on the cap rather than on `50vw`, or this is a
    // measurement of the clamp and says nothing about the number under review.
    expect(
      shipped,
      `the 50vw clamp is binding at ${view.width}px, so the cap is not what was measured`,
    ).toBeLessThan(view.width * 0.5);

    // ...and it really did compare fonts, rather than measure one family several times. The
    // instrument that reported no spread at all is how the too-narrow width shipped.
    expect(font.measured, "only one fallback family was measurable here").toBeGreaterThan(
      1,
    );
    expect(
      font.spread,
      `the fallbacks all painted alike, which no set of them does`,
    ).toBeGreaterThan(0.02);

    // WIDE ENOUGH: the shipped panel lays its own content out, in the worst font it can be
    // handed rather than in the one this machine happens to serve.
    expect(
      shipped,
      `the panel is ${Math.round(needed - shipped)}px narrower than its content needs (${sizedAgainst})`,
    ).toBeGreaterThanOrEqual(needed);
    expect(
      atShipped,
      `an action card loses a line at the shipped width (${sizedAgainst})`,
    ).toEqual(reference);

    // AND NO WIDER, which is the whole of the objection. Reported as the ratio so a failure
    // says how much of the island is being spent on nothing.
    expect(
      shipped / needed,
      `the panel is ${(shipped / needed).toFixed(2)}x the ${needed}px its content needs (${sizedAgainst})`,
    ).toBeLessThanOrEqual(1 + OVER_ITS_CONTENT);
  }, 60000);
}

/**
 * AND THE CONSEQUENCE, AT THE WINDOW WHERE IT IS REAL.
 *
 * The search above is about line counts, which is a fact about text. This is what that fact
 * costs on the lead's own screen, and it is why the line count is worth defending at all: the
 * step where the middle card's description takes a second line is the step where the THIRD card
 * slides under the commit control pinned to the panel's foot. Photographed at 414px, that is a
 * player being asked to choose between three actions with one of them behind a bar.
 *
 * Not run at 1440x900, and the omission is the point: there is enough height there for every card
 * at any width, so the assertion would pass over a panel half this wide and prove nothing.
 *
 * **THE NON-VACUITY INJECTION IS SEARCHED FOR RATHER THAN PINNED, since 2026-08-02.** It squeezed
 * the panel to 360px and required the predicate to FAIL there, which was true of three cards and is
 * not of two: the give-up-ground action was ruled out, and two cards fit above the commit bar at a
 * width three did not. A pinned width that has stopped being able to fail is exactly a non-vacuity
 * check that has stopped checking, so the search below finds a width that does fail and asserts one
 * exists — which fails loudly if the panel ever becomes unbreakable rather than passing quietly.
 */
test("every action card is readable at 1024x580", async () => {
  await page.viewport(1024, 580);
  await openCrisis();
  expect(cardsAreWholeAndUncovered(), "an action card is behind the commit control").toBe(
    true,
  );

  // ...and this window really is the one that can fail, or the assertion above is free. The width
  // is searched for rather than pinned; see the docblock.
  let broke: number | null = null;
  for (let width = 340; width >= 140 && broke === null; width -= 20) {
    overrideWidth(width);
    await settle();
    if (!cardsAreWholeAndUncovered()) {
      broke = width;
    }
  }
  overrideWidth(null);
  await settle();
  expect(
    broke,
    "no width from 340px down to 140px can fail the card test, so passing it says nothing",
  ).not.toBeNull();
  // And the window under test is genuinely roomier than the one that broke, which is the
  // comparison the assertion above is worth anything for.
  expect(broke ?? 0).toBeLessThan(panel().getBoundingClientRect().width);
});

/**
 * AND THE ISLAND GETS THE MAJORITY OF HIS SCREEN, which is the same fact read from the other
 * side and the one he is actually judging. The panel plus its gutter is the strip's left edge.
 *
 * Asserted at his window alone: at a roomier one it is true by a mile and says nothing.
 */
test("the island keeps more than half the width at 1024x580", async () => {
  await page.viewport(1024, 580);
  await openCrisis();
  const box = panel().getBoundingClientRect();
  const strip = 1024 - box.right;
  expect(
    strip / 1024,
    `the island gets ${Math.round((strip / 1024) * 100)}% of the screen`,
  ).toBeGreaterThan(0.5);
});

/**
 * NOTHING IS CLIPPED SIDEWAYS IN ANY PHASE, which is the hard floor under the search above.
 *
 * A wrap costs a line; this costs content outright, and it is the failure mode the answer field
 * brings — an `<input>` does not shrink below its intrinsic size, so below a 308px column the
 * panel scrolls horizontally rather than reflowing. Swept over every phase at both the lead's
 * window and its usable height, because that is the shortest box the panel is ever laid out in.
 */
for (const view of [
  { width: 1024, height: 580 },
  { width: 1024, height: 507 },
  { width: 1440, height: 900 },
] as const) {
  test(`no phase is clipped sideways at ${view.width}x${view.height}`, async () => {
    await page.viewport(view.width, view.height);
    await openCrisis();

    let phases = 0;
    const check = (phase: string) => {
      expect(
        clippedPopulation(),
        `${phase} put almost nothing in range of the sweep`,
      ).toBeGreaterThanOrEqual(CLIPPED_POPULATION_FLOOR);
      expect(clippedSideways(), `${phase} is clipped sideways`).toEqual([]);
      phases += 1;
    };

    check("declaring");
    await aimAndPick(-1, 0);
    check("declaring, with a cell aimed at");
    await reachAnswering();
    check("answering");
    await reachResolved(1);
    check("resolved");

    // A floor, because a sweep that skipped a phase would pass by not looking.
    expect(phases, "not every phase was measured").toBe(4);
    // ...and the control that ends the phase is still reachable at this height.
    const forward = findButton(panel(), /Let the frost advance/);
    const shell = panel().getBoundingClientRect();
    const box = forward.getBoundingClientRect();
    expect(box.top >= shell.top - 1 && box.bottom <= shell.bottom + 1).toBe(true);
  }, 90000);
}

/**
 * **THE WAY FORWARD IS STILL WHOLE AND UNSCROLLED, IN THE STATE THAT NEARLY LOST IT.**
 *
 * The commit control is the thing the narrowing was most likely to cost, and not because it
 * moved: at a panel narrower than about 504px its read-out no longer fits beside the button and
 * the button takes its own row, 33px further down a panel that already scrolls. That trade was
 * taken deliberately (`.hw-commit`'s own comment records the alternative and the frame that
 * rejected it), so what has to be checked is the thing the trade could break — that the button
 * is still wholly on screen without the player hunting for it.
 *
 * Checked with a cell AIMED AT, which is where it bites: `FirePreviewLadder` is the tallest
 * read-out the declaring panel ever carries, and this control was measured below the fold at all
 * four of the band's viewports before `position: sticky` was put on the row.
 */
for (const view of [
  { width: 1024, height: 580 },
  { width: 1024, height: 507 },
  { width: 1440, height: 900 },
] as const) {
  test(`the commit control survives the narrowing at ${view.width}x${view.height}`, async () => {
    await page.viewport(view.width, view.height);
    await openCrisis();
    const whole = (el: HTMLElement) => {
      const shell = panel().getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return box.top >= shell.top - 1 && box.bottom <= shell.bottom + 1;
    };

    expect(panel().scrollTop, "the panel is already scrolled").toBe(0);
    expect(whole(findButton(panel(), /Commit and face/)), "at rest").toBe(true);

    await aimAndPick(-1, 0);
    // The premise: the tall read-out really is on screen, or this is the same check twice.
    expect(
      document.querySelector(".winter-in-city .hw-preview"),
      "no preview, so the tallest read-out is not what this measured",
    ).not.toBeNull();
    expect(panel().scrollTop, "the panel is already scrolled").toBe(0);
    expect(whole(findButton(panel(), /Commit and face/)), "with a cell aimed at").toBe(
      true,
    );
  }, 60000);
}
