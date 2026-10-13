/**
 * EVERY board a spot-the-error widget deals is one the learner can actually finish.
 *
 * ## The defect this was written for
 *
 * `SolveSlipSpot`'s second board flagged `2x - 6 = 8` as the line that does not follow from
 * `4x - 6 = 2x + 8`, which is the correct gathering of it, and then offered the byte-identical
 * string as the line that should have been written instead. So the objective - "find the first
 * line that does not follow from the one above it" - had no answer, and the repair stage marked
 * the learner right for choosing the line already on the board.
 *
 * ## Why it shipped, and why a second guard was needed rather than a wider one
 *
 * `spotTheErrorPalette.browser.test.tsx` drives this kind on every widget built on it, and it
 * passed. It mounts each widget once, and a widget deals its FIRST board on mount:
 * `useWidgetVariants` starts at index 0 and only `restart` advances it, and `restart` is offered
 * only once a board is finished. So every board after the first was outside every guard in the
 * tree, on all fifteen widgets, and a board can only be reached by SOLVING the ones before it.
 *
 * ## What is asserted, and why one pass down the work is not enough
 *
 * Two walks per board, one from the top and one from the bottom, because a tap latches the
 * stage: the lines go dead the moment the failing one is found, so a single walk leaves every
 * line past it untested and cannot tell "exactly one line fails" from "the first of several
 * does". The two walks between them tap every line on the board, and both must land on the same
 * one.
 *
 * The repair is then read off the rendered result line rather than off the source, so a
 * correction that merely repeats a line of the work fails here whatever the flags say.
 */

import { afterEach, expect, test } from "vitest";

import { widgetsBuiltOn } from "./kindFamily";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Read off the sources, so a sixteenth widget is swept the day it is written. */
const ERROR_TARGET_VISUALS: readonly LessonVisualId[] = widgetsBuiltOn(
  "SpotTheError",
).flatMap((widget) => widget.ids);

/**
 * The floor on the family, matching `spotTheErrorPalette.browser.test.tsx`'s. Not a count to
 * maintain: it fails if the glob resolves to nothing or the registry lookup stops matching,
 * which is the only way a sweep like this reports green over nothing.
 */
const FAMILY_FLOOR = 5;

/** The floor on BOARDS, which is the population this file is actually about. */
const BOARD_FLOOR = 20;

/** The widget the defect was found on, and the number of boards it deals. */
const REAUTHORED = "solve-slip-spot";
const REAUTHORED_BOARDS = 2;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

function lines(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(".lesson-spot__line"));
}

/** The LaTeX a rendered node was typeset from, which is what a "same string" claim is about. */
function latexIn(root: ParentNode | null): string {
  return root?.querySelector("[data-latex]")?.getAttribute("data-latex") ?? "";
}

/**
 * The board itself, as the LaTeX its work was typeset from.
 *
 * Boards are told apart by their WORK rather than by the rendered heading, and waited for
 * rather than read: a heading read in the frame before KaTeX has typeset it is the empty string,
 * which matches no earlier board, so the walk counted a third board that was really the first
 * one caught mid-render. That reproduced as a flake on one widget in one run of two.
 */
async function boardKey(host: HTMLElement): Promise<string> {
  await waitFor(() => {
    const work = lines(host);
    return work.length > 0 && work.every((line) => latexIn(line) !== "");
  }, "the work is typeset");
  return lines(host)
    .map((line) => latexIn(line))
    .join(" | ");
}

interface BoardWalk {
  key: string;
  heading: string;
  /** The work, in order, as LaTeX. */
  work: string[];
  /** Which line the widget accepted as the one that fails. */
  failing: number;
  /** Every line this walk tapped, so two walks can be shown to cover the board. */
  tapped: number[];
  /** The line the widget says should have been written, as LaTeX. */
  repair: string;
}

/**
 * Walk one board: tap the lines in `order` until one is accepted, then choose replacements
 * until the work is repaired. Returns what the board said about itself.
 */
async function walkBoard(host: HTMLElement, order: "down" | "up"): Promise<BoardWalk> {
  const key = await boardKey(host);
  const heading = (host.querySelector(".lesson-spot__heading")?.textContent ?? "").trim();
  const work = lines(host).map((line) => latexIn(line));
  const indices = work.map((_, index) => index);
  const tapped: number[] = [];
  let failing = -1;
  for (const index of order === "down" ? indices : [...indices].reverse()) {
    const line = lines(host)[index] as HTMLElement;
    (line.querySelector("button") as HTMLButtonElement).click();
    await settle();
    tapped.push(index);
    const state = line.getAttribute("data-state");
    if (state === "correct" || state === "repair") {
      failing = index;
      break;
    }
    expect(
      state,
      `${heading}: tapping line ${index} was neither accepted nor refused`,
    ).toBe("wrong");
  }
  expect(failing, `${heading}: no line was accepted as the one that fails`).toBeGreaterThan(
    -1,
  );

  // Stage two: the replacements. A wrong one leaves the board live, so this reaches the right
  // one within the row rather than being told which it is.
  await waitFor(
    () => host.querySelectorAll(".lesson-interactive__step").length > 0,
    `${heading}: no replacements were offered`,
  );
  // A wrong replacement leaves the whole row standing and a right one clears it, so walking
  // the row by position finds the right one without being told which it is.
  const offered = host.querySelectorAll(".lesson-interactive__step").length;
  for (let attempt = 0; attempt < offered; attempt += 1) {
    const button = Array.from(
      host.querySelectorAll<HTMLButtonElement>(".lesson-interactive__step"),
    )[attempt];
    if (button === undefined) {
      break;
    }
    button.click();
    await settle();
    if (host.querySelector(".lesson-sorter__result") !== null) {
      break;
    }
  }
  await waitFor(
    () => host.querySelector(".lesson-sorter__result") !== null,
    `${heading}: none of the replacements finished the board`,
  );
  return {
    key,
    heading,
    work,
    failing,
    tapped,
    repair: latexIn(host.querySelector(".lesson-sorter__result")),
  };
}

/**
 * Every board the widget deals, walked in `order`. The boards after the first are reachable
 * only by finishing the ones before them, and the cycle wraps, so the walk stops when a heading
 * comes round again.
 */
async function walkBoards(id: LessonVisualId, order: "down" | "up"): Promise<BoardWalk[]> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  const walks: BoardWalk[] = [];
  for (let guard = 0; guard < 8; guard += 1) {
    const key = await boardKey(host);
    if (walks.some((walk) => walk.key === key)) {
      break;
    }
    walks.push(await walkBoard(host, order));
    const reset = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
    if (reset === null) {
      break;
    }
    reset.click();
    await settle();
  }
  h.cleanup();
  h = null;
  return walks;
}

const walked: Record<string, number> = {};

test.each(ERROR_TARGET_VISUALS)(
  "%s: every board it deals has one failing line and a repair that is not already on it",
  async (id) => {
    const down = await walkBoards(id, "down");
    const up = await walkBoards(id, "up");
    expect(down.length, `${id}: dealt no boards at all`).toBeGreaterThan(0);
    expect(
      up.map((walk) => walk.key),
      `${id}: the two walks were dealt different boards, so nothing below compares like with like`,
    ).toEqual(down.map((walk) => walk.key));
    walked[id] = down.length;

    down.forEach((board, index) => {
      const other = up[index] as BoardWalk;
      const where = `${id} board ${index + 1} ("${board.heading.slice(0, 60)}")`;

      // ONE failing line, and the same one from both directions. Between them the two walks
      // tapped every line, so a second flagged line cannot hide behind the first.
      expect(other.failing, `${where}: the two walks accepted different lines`).toBe(
        board.failing,
      );
      const covered = new Set([...board.tapped, ...other.tapped]);
      expect(
        board.work.map((_, line) => line).filter((line) => !covered.has(line)),
        `${where}: these lines were never tapped, so "one line fails" is untested on them`,
      ).toEqual([]);

      // THE DEFECT. The repair has to be a different line from the one it replaces, or the
      // learner is marked right for choosing what is already written.
      expect(
        board.repair,
        `${where}: the repair is the flagged line itself, so the board asks for a change it already has`,
      ).not.toBe(board.work[board.failing]);
      expect(
        board.work.filter((line) => line === board.repair),
        `${where}: the repair is a line the work already contains`,
      ).toEqual([]);
      expect(board.repair.length, `${where}: the repair rendered nothing`).toBeGreaterThan(
        0,
      );
    });
  },
  // Two walks of every board, and a board past the first has to be earned by finishing the
  // ones before it, so a widget dealing three boards is six boards of clicking.
  30_000,
);

test("the sweep drove every board of every widget in the family", () => {
  const boards = Object.values(walked).reduce((total, count) => total + count, 0);
  expect(
    Object.keys(walked).length,
    "fewer widgets were walked than are built on the kind",
  ).toBeGreaterThanOrEqual(FAMILY_FLOOR);
  expect(boards, `${boards} boards were walked`).toBeGreaterThanOrEqual(BOARD_FLOOR);
  // The re-authored widget by name, because "some board past the first was reached" is the
  // claim this file exists to make and a family floor is satisfied without it.
  expect(
    walked[REAUTHORED] ?? 0,
    `${REAUTHORED}: the sweep never reached its second board, which is where the defect was`,
  ).toBeGreaterThanOrEqual(REAUTHORED_BOARDS);
});
