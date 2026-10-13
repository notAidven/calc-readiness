/**
 * The FIRST instance's reveal, on the path the QA dev viewer actually renders.
 *
 * `widgetRevealReAsk.browser.test.tsx` sweeps every reveal widget, but it always mounts
 * `LessonVisual` WITH an `onComplete`. `DevLessonSlides` mounts it with none, and so does
 * the combined review page, so the ungated mount is a live surface that the sweep does not
 * cover. A defect reported as "only on the very first instance, only in the step-slides
 * view" would sit exactly in that gap.
 *
 * The claim under test is the one a learner cares about: on the first instance of the
 * slide, with nothing answered yet and nothing reseeded, clicking reveal must PRINT THE
 * ANSWER and must NOT deal a different question. Both halves are asserted against the
 * board as it stands at the moment of the click.
 */

import { StrictMode } from "react";
import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

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

/**
 * The typeset math on the board, which is where this instance's NUMBERS live.
 *
 * "Did not redraw" is asserted on this rather than on the math AND every accessible name,
 * because a reveal now writes the answer into the blank and names it as given. That is a
 * deliberate change to the board. What must still hold is that nothing was REPLACED: a redraw
 * deals a new parameter set and the values it was drawn on vanish, whereas a fill only adds
 * the answer or carries a chip from the tray into the slot.
 *
 * On this widget the name given up is the open row's slot, which reads "Value for the row 3 to
 * the 1" until the fill lands and "Row 3 to the 1: the value three was given, not answered"
 * after it. See `widgetRevealReAsk.browser.test.tsx`'s note on `boardMath` for why that name
 * cannot be kept under an exclusion.
 */
function boardMath(host: HTMLElement): string[] {
  return all(widget(host), "[data-latex]").map((n) => n.getAttribute("data-latex") ?? "");
}

/**
 * Which of `before`'s nodes the board can no longer account for. Empty is the pass.
 *
 * MULTISET containment, and deliberately not `expect.arrayContaining`, which both assertions
 * below used to be written with: that matcher ignores multiplicity as well as order and is
 * satisfied by a SHORTER array than the one it is given, so a board could drop one of two
 * identical nodes, or shrink outright, and still be "containing" what was measured before it.
 * "Nothing was REPLACED" is this: every node counted before is still counted, as many times.
 *
 * Sound against the fill because on this widget the fill is purely ADDITIVE: it writes the
 * open row's value into the slot and takes nothing off the board to do it.
 */
function nodesLost(after: readonly string[], before: readonly string[]): string[] {
  const remaining = [...after];
  const lost: string[] = [];
  for (const node of before) {
    const at = remaining.indexOf(node);
    if (at === -1) {
      lost.push(node);
    } else {
      remaining.splice(at, 1);
    }
  }
  return lost;
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

/**
 * One wrong answer on the table's first blank row: carry a value the row does not take.
 * The chips are shared across the whole table, so at least one of them is always wrong for
 * the row in hand, and the slot's own label says which row that is.
 */
async function missTheFirstRow(host: HTMLElement): Promise<void> {
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

const ID: LessonVisualId = "zero-exponent-table";

/**
 * The four mounts the first instance can arrive in. `StrictMode` is how the real app runs,
 * and its double-invoked first mount is the one thing that is genuinely different about a
 * FIRST instance: the bind-unbind-rebind of the widget's redraw happens once there and
 * never again, which is the shape a "first time only" report points at.
 */
const MOUNTS: readonly { name: string; strict: boolean; gated: boolean }[] = [
  { name: "ungated, plain (DevLessonSlides)", strict: false, gated: false },
  { name: "ungated, StrictMode (the real dev viewer)", strict: true, gated: false },
  { name: "gated, plain", strict: false, gated: true },
  { name: "gated, StrictMode (the real lesson player)", strict: true, gated: true },
];

test.each(MOUNTS)(
  "EXP.1 slide 5, first instance, $name: reveal teaches and does not redraw",
  async ({ strict, gated }) => {
    let completed = 0;
    const visual = gated ? (
      <LessonVisual
        id={ID}
        onComplete={() => {
          completed += 1;
        }}
        onReopen={() => {
          completed -= 1;
        }}
      />
    ) : (
      <LessonVisual id={ID} />
    );
    h = mount(strict ? <StrictMode>{visual}</StrictMode> : visual);
    const host = h.host;
    await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${ID} mounts`);

    const firstMath = boardMath(host);
    await missTheFirstRow(host);

    const offer = revealButton(host);
    expect(offer, "the reveal is on offer after one wrong value").not.toBeNull();

    // The board as it stands at the click. Anything that moves it from here is the redraw.
    const mathBefore = boardMath(host);
    (offer as HTMLButtonElement).click();

    // 1. The answer is shown at all. The reported symptom is that it never appears.
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal") !== null,
      "the reveal passage opens on the first instance",
    );
    const passage = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
    expect(hasText(passage, "Answer revealed."), "the answer is stated").toBe(true);
    expect(passage.textContent?.length ?? 0, "the reasoning came through").toBeGreaterThan(
      100,
    );

    // 2. And the question did not move under it. Give any stray redraw a chance to land
    // before measuring, so this cannot pass by reading the DOM too early.
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    // Both sets have to have something in them first. An empty measurement is contained by
    // anything, so it passes both comparisons below while proving neither, and an empty
    // measurement is exactly what a drifted selector or a widget that stopped emitting
    // `data-latex` would hand them. This board measures 15 nodes at both moments.
    expect(mathBefore.length, "no math was measured at the click").toBeGreaterThan(0);
    expect(firstMath.length, "no math was measured at the mount").toBeGreaterThan(0);
    expect(
      nodesLost(boardMath(host), mathBefore),
      "the first reveal dealt a different question",
    ).toEqual([]);
    expect(
      nodesLost(boardMath(host), firstMath),
      "the board left the instance it mounted on",
    ).toEqual([]);
    expect(completed, "the first reveal opened the gate").toBe(0);
  },
);
