/**
 * A box the learner already got right is not asked for again.
 *
 * These four boards each grade SEVERAL independently-correct entries behind ONE Check button.
 * That shape is fine in itself, and it is exactly why this property needs asserting: with one
 * button and several answers, the tempting implementation joins them (`aOk && bOk`) and reports
 * a single verdict, which discards the fact that one of them was right. The learner is then
 * re-asked a box they had already answered, with nothing on screen saying which half to change.
 *
 * The property asserted is deliberately weaker than "show a per-box tick": it requires only that
 * a box which LANDED stops being asked. Both idioms already in the tree satisfy it, and both are
 * in the sweep as controls for that reason -- `distribute-builder` disables the landed input in
 * place, while `linear-slope-walkthrough` swaps the slot for the settled value, so an assertion
 * written against either one alone would encode that widget's idiom instead of the rule.
 *
 * ## Why the count is pinned before the attempt
 *
 * "One fewer box is being asked" is satisfied trivially by a board that renders no boxes at all,
 * and one of these withholds its boxes until something else is done
 * (`common-denominator-multiples` wants its LCD tapped first). So each board states how many
 * boxes it should be asking, that all of them are live, and that there is more than one --
 * partial credit is not a meaningful claim about a single box -- and the latch assertion is made
 * only against that floor.
 *
 * ## Why the wrong answer is the same string everywhere
 *
 * `WRONG` is checked against every board's key below, under BOTH readings where a board admits
 * two (`linear-slope-walkthrough` grades the substitution either way round). A "wrong" value that
 * happened to be right somewhere would turn that board's case into an all-correct check, which
 * passes for the wrong reason.
 */

import { afterEach, expect, test } from "vitest";

import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

/** Wrong in every box on every board here, under every reading each board accepts. */
const WRONG = "99";

interface PartialCreditBoard {
  readonly id: LessonVisualId;
  /** How many boxes the board asks for once reached. The floor for everything else. */
  readonly boxes: number;
  /** The box that will be answered correctly, by `aria-label`, and the value that lands it. */
  readonly right: { readonly aria: string; readonly value: string };
  /** Drive the board to the state where its boxes are live, where that takes a step. */
  readonly reach?: (widget: HTMLElement) => void;
}

/**
 * The two boards under repair, then the two that already hold the property.
 *
 * A control that passes both before and after the repair is what shows these assertions track
 * the rule rather than something incidental to the edit.
 */
const PARTIAL_CREDIT_BOARDS: readonly PartialCreditBoard[] = [
  {
    id: "proportion-cross-play",
    boxes: 2,
    // Its own cross products, 3 x 12 and 4 x x.
    right: { aria: "3 times 12", value: "36" },
  },
  {
    id: "common-denominator-multiples",
    boxes: 2,
    // 1/3 over the LCD of 12 is 4/12.
    right: { aria: "numerator of 1/3 rewritten over 12", value: "4" },
    reach: (widget) => {
      // The rewrite boxes appear only once the LCD itself is picked. Both multiple rows
      // offer 12; either chip pins it.
      const lcd = widget.querySelector<HTMLButtonElement>('button[aria-label="12"]');
      if (lcd === null) {
        throw new Error("common-denominator-multiples: no chip for the LCD of 12");
      }
      lcd.click();
    },
  },
  {
    id: "distribute-builder",
    boxes: 2,
    // Round 1 is 2(n + 5), so the variable term is 2n and the constant term is 10.
    right: { aria: "2 times n", value: "2n" },
  },
  {
    id: "linear-slope-walkthrough",
    boxes: 4,
    // `useWidgetVariants` opens at index 0 on a fresh mount, which deals
    // (-2, 5) and (4, -4). Nothing has pinned a reading yet, so the row grades as dealt
    // and y sub 2 is the second point's y.
    right: {
      aria: "y sub 2, the y coordinate of the point you take as point 2",
      value: "-4",
    },
  },
];

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

/**
 * The boxes the board is still asking the learner to answer.
 *
 * A landed box may either stay in the DOM disabled or stop being an input at all, and both
 * count as no longer asked, which is the whole point of measuring it this way.
 */
function asking(widget: HTMLElement): HTMLInputElement[] {
  return Array.from(widget.querySelectorAll<HTMLInputElement>("input")).filter(
    (input) => !input.disabled,
  );
}

function ariaOf(input: HTMLInputElement): string {
  return input.getAttribute("aria-label") ?? "";
}

/** Let the click's state update commit before measuring the board again. */
function settle(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 80));
}

test.each(PARTIAL_CREDIT_BOARDS)(
  "$id: a box answered correctly is not asked for again when another box is wrong",
  async ({ id, boxes, right, reach }) => {
    const widget = await board(id);
    reach?.(widget);

    await waitFor(
      () => asking(widget).length === boxes,
      `${id}: expected ${boxes} boxes to be asked for`,
    );

    // The floors. Every claim below is about these boxes, so they have to be there, live,
    // and more than one.
    const offered = asking(widget);
    expect(
      offered.length,
      `${id}: the board asks for fewer than two boxes`,
    ).toBeGreaterThan(1);
    const target = offered.find((input) => ariaOf(input) === right.aria);
    expect(
      target,
      `${id}: no box labelled "${right.aria}" was being asked for`,
    ).toBeDefined();

    // One right, the rest wrong. This is the state the rule is about.
    for (const input of offered) {
      setInputValue(input, input === target ? right.value : WRONG);
    }
    await waitFor(
      () => (target as HTMLInputElement).value === right.value,
      `${id}: the correct value never reached its box`,
    );

    findButton(widget, "Check").click();
    await settle();

    const stillAsked = asking(widget);
    expect(
      stillAsked.map(ariaOf),
      `${id}: "${right.aria}" was answered correctly and is still being asked for, so the learner has to answer it again`,
    ).not.toContain(right.aria);
    expect(
      stillAsked.length,
      `${id}: expected exactly one box to settle, leaving ${boxes - 1} asked`,
    ).toBe(boxes - 1);
  },
);

test("the sweep names both boards under repair and both controls", () => {
  const ids = PARTIAL_CREDIT_BOARDS.map((entry) => entry.id);
  expect(ids).toContain("proportion-cross-play");
  expect(ids).toContain("common-denominator-multiples");
  expect(ids).toContain("distribute-builder");
  expect(ids).toContain("linear-slope-walkthrough");
  expect(new Set(ids).size).toBe(ids.length);
  // Partial credit says nothing about a board with one box, so there are no one-box entries
  // for an assertion above to pass over silently.
  for (const entry of PARTIAL_CREDIT_BOARDS) {
    expect(
      entry.boxes,
      `${entry.id}: a one-box board cannot show partial credit`,
    ).toBeGreaterThan(1);
  }
});
