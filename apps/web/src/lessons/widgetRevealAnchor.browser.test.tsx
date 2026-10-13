/**
 * A reveal passage points at something on the board.
 *
 * QA read the reveal on EXP.1 slide 4 and could not tell WHICH pair it was about. The
 * passage names an answer ("x to the 4, all raised to the 3 joins x to the 12") and the
 * board sat there with three pairs on it and nothing marking the one being explained, so
 * the learner had to re-derive the very thing the passage was there to tell them. A reveal
 * with no anchor is not an explanation, it is a second question.
 *
 * The mechanic is shared: `WidgetRevealAnchorContext` decides WHEN an anchor shows and
 * `styles.css` decides what it looks like, so a kind only says WHICH element the current
 * passage is about and every domain using that kind inherits the rest. Both cited kinds are
 * covered here (`MatchPairs` and `FillTable`) precisely so the sharing is measured rather
 * than asserted.
 *
 * Three things have to hold at once, and the two suppressors are the interesting part:
 *
 *   1. the anchor lands on the pair or row the passage is about, and on NOTHING else;
 *   2. it survives `inert` on the stage. `opacity` and `filter` group their subtree, so a
 *      descendant cannot opt out of them and the freeze had to ease off instead. Asserted
 *      as a measured opacity, because "the attribute is set" says nothing about whether the
 *      learner can see it;
 *   3. it survives the re-ask window. `WidgetReveal` itself stands down while a re-ask is
 *      owed, and wiring the highlight to that same flag would have hidden it over exactly
 *      the window it exists for.
 *
 * Real Chromium and the real stylesheet, `styles.css` imported LAST as `main.tsx` imports
 * it, so what is measured is what ships (see lessonVisualSurd.browser.test.tsx for why the
 * order matters). Without the outline rule, claim 2 measures `none` and fails.
 */

import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function widget(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-interactive");
  if (found === null) {
    throw new Error("no widget mounted");
  }
  return found;
}

function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

function anchored(host: HTMLElement): HTMLElement[] {
  return all<HTMLElement>(host, '[data-reveal-anchor="on"]');
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

/** `outline-width` is only meaningful once the style is actually reaching the element. */
function outlineOf(el: HTMLElement): { width: string; style: string; color: string } {
  const s = getComputedStyle(el);
  return { width: s.outlineWidth, style: s.outlineStyle, color: s.outlineColor };
}

/**
 * A wrong join on the match board: the right column is dealt in a derangement, so the first
 * live item on each side never belong together and joining them is always the wrong move.
 */
async function missOnTheMatchBoard(host: HTMLElement): Promise<void> {
  const sides = all<HTMLElement>(widget(host), ".lesson-match__side");
  if (sides.length !== 2) {
    throw new Error("the match board did not mount two sides");
  }
  const left = all<HTMLButtonElement>(sides[0] as HTMLElement, "button").filter(
    (b) => !b.disabled,
  );
  const right = all<HTMLButtonElement>(sides[1] as HTMLElement, "button").filter(
    (b) => !b.disabled,
  );
  (left[0] as HTMLButtonElement).click();
  (right[0] as HTMLButtonElement).click();
  await waitFor(() => revealButton(host) !== null, "a wrong join puts the reveal on offer");
}

/** A wrong value in the table's open row. The chips are shared, so one of them is wrong. */
async function missOnTheTable(host: HTMLElement): Promise<void> {
  const board = widget(host);
  const slot = board.querySelector<HTMLButtonElement>(".lesson-table__slot");
  const chips = all<HTMLButtonElement>(board, ".lesson-sorter__chip");
  if (slot === null || chips.length === 0) {
    throw new Error("the table did not mount with a slot and chips");
  }
  for (const chip of chips) {
    chip.click();
    slot.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    if (revealButton(host) !== null) {
      return;
    }
  }
  throw new Error("no wrong value put the reveal on offer");
}

const CASES: readonly {
  id: LessonVisualId;
  kind: string;
  miss: (host: HTMLElement) => Promise<void>;
  /** How many elements make up one anchored subject: a pair is two, a table row is one. */
  expected: number;
}[] = [
  {
    id: "power-of-power-match",
    kind: "MatchPairs (EXP.1 slide 4, the reported one)",
    miss: missOnTheMatchBoard,
    expected: 2,
  },
  {
    id: "zero-exponent-table",
    kind: "FillTable (EXP.1 slide 5)",
    miss: missOnTheTable,
    expected: 1,
  },
];

test.each(CASES)("$kind: the revealed subject is marked on the board", async (testCase) => {
  const { id, miss, expected } = testCase;
  h = mount(<LessonVisual id={id} onComplete={() => {}} />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);

  // Nothing is being explained yet, so nothing is anchored. Without this the test would
  // pass just as well against a widget that highlighted something permanently.
  expect(anchored(host), `${id}: something was anchored before any reveal`).toHaveLength(0);

  await miss(host);
  expect(
    anchored(host),
    `${id}: a wrong attempt anchored something before the reveal was asked for`,
  ).toHaveLength(0);

  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    `${id}: the reveal passage opens`,
  );

  // 1. Exactly the subject, and nothing else on the board.
  const marks = anchored(host);
  expect(marks, `${id}: the passage has no anchor on the board`).toHaveLength(expected);
  for (const mark of marks) {
    expect(widget(host).contains(mark), `${id}: the anchor is outside the widget`).toBe(
      true,
    );
  }

  // 2. It is really drawn, and it is really the dark green. A data attribute nobody styles
  // renders nothing, which is the whole failure mode this test exists for.
  for (const mark of marks) {
    const outline = outlineOf(mark);
    expect(outline.style, `${id}: the anchor draws no outline`).toBe("solid");
    expect(
      Number.parseFloat(outline.width),
      `${id}: the anchor outline has no width`,
    ).toBeGreaterThanOrEqual(2);
    // --civic-dark, resolved. Asserting the channel values rather than the token name is
    // what catches the rule being present but losing to something more specific.
    expect(outline.color, `${id}: the anchor is not the dark green`).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(outline.color, `${id}: the anchor outline is transparent`).not.toContain("0)");
  }

  // 3. `inert` is on the stage and has NOT swallowed the anchor. Ancestor opacity groups the
  // subtree, so this is the measurement that matters: the freeze has to have eased.
  expect(stage(host).hasAttribute("inert"), `${id}: the spent instance is not frozen`).toBe(
    true,
  );
  const dimmed = Number.parseFloat(getComputedStyle(stage(host)).opacity);
  expect(dimmed, `${id}: the freeze dim buried the anchor`).toBeGreaterThan(0.7);
  expect(dimmed, `${id}: the frozen instance stopped reading as spent`).toBeLessThan(1);
  expect(
    getComputedStyle(stage(host)).filter,
    `${id}: the desaturation is still washing the green out`,
  ).toBe("none");

  // 4. And the re-ask window has not suppressed it either. The reveal button standing down
  // is the proof we are inside that window.
  expect(
    revealButton(host),
    `${id}: not in the re-ask window, so claim 4 proves nothing`,
  ).toBeNull();
  expect(anchored(host), `${id}: the re-ask window suppressed the anchor`).toHaveLength(
    expected,
  );
});

test("the anchor follows the subject rather than sticking to the first one", async () => {
  // Taking the re-ask deals a new board, and nothing on it is being explained any more, so
  // the mark has to come off. A highlight that stayed would point at the wrong pair for the
  // rest of the slide.
  h = mount(<LessonVisual id="power-of-power-match" onComplete={() => {}} />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  await missOnTheMatchBoard(host);
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => anchored(host).length === 2, "the reveal anchors its pair");

  const reAsk = host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
  expect(reAsk, "no control offers the re-ask").not.toBeNull();
  (reAsk as HTMLButtonElement).click();

  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") === null,
    "the passage is dismissed",
  );
  expect(anchored(host), "the anchor outlived the passage that explained it").toHaveLength(
    0,
  );
});
