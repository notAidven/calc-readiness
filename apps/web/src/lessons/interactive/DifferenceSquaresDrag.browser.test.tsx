/**
 * POL.2's dissection board says WHICH placement is open and WHERE it goes.
 *
 * The defect, reported off a screenshot of slide 3: three placements run in a fixed order
 * behind a single `WidgetTask` sentence covering all three at once, the three drop targets
 * are unlabelled dashed rectangles told apart only by their stroke colour, and the tray
 * carries two chips reading `x + 6` with nothing to choose between them. A learner meeting
 * that board cannot say what is being asked of them now, cannot find where the answer goes,
 * and cannot answer the tray correctly even in principle.
 *
 * Three claims, asserted apart because they fail apart:
 *
 * 1. A per-step instruction NAMES the open placement, and it survives a wrong drop. It is
 *    its own element rather than a sentence on `.lesson-interactive__status`, because the
 *    status line is the `aria-live` region and the first miss spends it on feedback: that is
 *    the whole defect `widgetTask.tsx` was extracted for, and a per-step instruction put
 *    there would leave the screen at exactly the moment the learner needs it.
 * 2. The FIGURE captions its targets, and marks the open one in words rather than in a hue.
 *    `svgKit`'s tokens reserve green and red for a verdict on the learner's action, so
 *    "this is the one to click" cannot be carried by a colour at all.
 * 3. No two chips on the tray say the same thing. A duplicate decoy is not a hard question,
 *    it is an unanswerable one: the two `x + 6` chips were graded differently by chip id,
 *    which is not a distinction on screen.
 *
 * The rest of the file is the behaviour that must NOT move while the board is clarified,
 * pinned so the clean-up beside the fix is provably a clean-up: three placements judged in
 * their fixed order, a decoy refused with its reasoning, a reveal that teaches one placement
 * and leaves the rest, and a gate that opens once.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CITY_DESKTOP } from "../readingWidths";
import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { LessonVisual } from "../visuals";
import { DifferenceSquaresDrag } from "./DifferenceSquaresDrag";

import "../../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** A short, realistic laptop: the viewport every frame below is taken at, and named with. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** Board 1 takes a $6$ by $6$ corner out of the $x$ by $x$ square. */
const CHIP = {
  strip: "the strip 6 by x minus 6",
  sum: "x plus 6",
  diff: "x minus 6",
  square: "the square 6 by 6",
} as const;

/**
 * The three placements, matched on the words that NAME them rather than on a whole label,
 * so a target can gain "and it is the one open now" without this file having to know it.
 */
const TARGET = {
  piece: "strip lands",
  long: "long edge",
  short: "short edge",
} as const;

function chip(host: HTMLElement, spoken: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${spoken}"]`);
  if (!button) {
    throw new Error(`no chip labelled "${spoken}"`);
  }
  return button;
}

function target(host: HTMLElement, words: string): HTMLButtonElement {
  const found = host.querySelectorAll<HTMLButtonElement>(
    `svg button[aria-label*="${words}"]`,
  );
  if (found.length !== 1) {
    throw new Error(`expected one target naming "${words}", found ${found.length}`);
  }
  return found[0] as HTMLButtonElement;
}

/** Tap a chip, then tap a target: what `usePickup` accepts in place of a drag. */
function put(host: HTMLElement, spoken: string, words: string): void {
  chip(host, spoken).click();
  target(host, words).click();
}

/** Tap a chip into the open target and wait for the placement to settle. */
async function place(host: HTMLElement, spoken: string, words: string): Promise<void> {
  put(host, spoken, words);
  await waitFor(() => target(host, words).disabled, `"${words}" settles`);
}

/** Every LaTeX string the tray is offering right now. */
function trayLatex(host: HTMLElement): string[] {
  return Array.from(
    host.querySelectorAll(".lesson-sorter__chip [data-latex]"),
    (node) => node.getAttribute("data-latex") ?? "",
  );
}

function instruction(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>("[data-open-placement]");
}

let h: Harness | null = null;

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function board(onComplete?: () => void): Promise<HTMLElement> {
  h = mount(<DifferenceSquaresDrag onComplete={onComplete} />);
  const { host } = h;
  await waitFor(() => host.querySelector("svg") !== null, "the board mounts");
  return host;
}

test("the open placement is named in its own line, and a miss does not spend it", async () => {
  const host = await board();

  expect(instruction(host)?.getAttribute("data-open-placement"), "placement 1").toBe(
    "piece",
  );
  expect(
    hasText(instruction(host) as HTMLElement, TARGET.piece),
    "the line names the placement it is about",
  ).toBe(true);

  // The status line is the aria-live region, and this must not be it: a per-step instruction
  // that lives there is overwritten by the first wrong drop and never comes back.
  expect(
    instruction(host)?.classList.contains("lesson-interactive__status"),
    "the instruction is not the status line",
  ).toBe(false);

  put(host, CHIP.square, TARGET.piece);
  await waitFor(() => hasText(host, "REMOVED"), "the decoy is refused with its reasoning");
  expect(
    instruction(host)?.getAttribute("data-open-placement"),
    "a wrong drop leaves the instruction standing",
  ).toBe("piece");

  await place(host, CHIP.strip, TARGET.piece);
  await waitFor(
    () => instruction(host)?.getAttribute("data-open-placement") === "long",
    "the instruction follows the board to placement 2",
  );
  expect(hasText(instruction(host) as HTMLElement, TARGET.long)).toBe(true);

  await place(host, CHIP.sum, TARGET.long);
  await waitFor(
    () => instruction(host)?.getAttribute("data-open-placement") === "short",
    "and to placement 3",
  );
  expect(hasText(instruction(host) as HTMLElement, TARGET.short)).toBe(true);

  await place(host, CHIP.diff, TARGET.short);
  await waitFor(() => instruction(host) === null, "a finished board has no open placement");
});

test("the figure captions its targets and marks the open one in words", async () => {
  const host = await board();

  const captions = () =>
    Array.from(host.querySelectorAll<SVGElement>("svg [data-target-caption]"));

  expect(captions().length, "all three targets are captioned on the figure").toBe(3);
  for (const caption of captions()) {
    expect(
      (caption.textContent ?? "").trim().length,
      `${caption.getAttribute("data-target-caption")} is captioned in words`,
    ).toBeGreaterThan(0);
  }

  const active = () => captions().filter((c) => c.getAttribute("data-active") === "true");
  expect(active().length, "exactly one caption is the open one").toBe(1);
  expect(active()[0]?.getAttribute("data-target-caption")).toBe("piece");

  // The mark is a word inside the open target, not only an outline colour: `svgKit` reserves
  // green and red for a verdict on the learner's action, so a hue cannot say "click here".
  expect(
    hasText(target(host, TARGET.piece), "drop"),
    "the open target says so inside itself",
  ).toBe(true);
  expect(
    hasText(target(host, TARGET.long), "drop"),
    "a target that is not open yet does not",
  ).toBe(false);

  await place(host, CHIP.strip, TARGET.piece);
  await waitFor(
    () => active()[0]?.getAttribute("data-target-caption") === "long",
    "the mark moves with the open placement",
  );
  expect(active().length, "and only one target is ever marked").toBe(1);
});

test("no two chips on the tray say the same thing", async () => {
  const host = await board();

  const opening = trayLatex(host);
  expect(opening.length, "the tray is dealt").toBeGreaterThanOrEqual(3);
  expect(
    new Set(opening).size,
    `two chips read alike, so one of them cannot be judged: ${opening.join(" / ")}`,
  ).toBe(opening.length);

  await place(host, CHIP.strip, TARGET.piece);
  const second = trayLatex(host);
  expect(new Set(second).size, `${second.join(" / ")}`).toBe(second.length);
});

test("the three placements are judged in their fixed order and the gate opens once", async () => {
  let completed = 0;
  const host = await board(() => completed++);

  // Out of order: the edges cannot be labelled before the rectangle they belong to exists.
  expect(target(host, TARGET.long).disabled, "the long edge is not open first").toBe(true);
  expect(target(host, TARGET.short).disabled, "nor the short edge").toBe(true);

  await place(host, CHIP.strip, TARGET.piece);
  expect(target(host, TARGET.short).disabled, "placement 3 waits for placement 2").toBe(
    true,
  );
  expect(completed, "one placement of three does not open the gate").toBe(0);

  await place(host, CHIP.sum, TARGET.long);
  expect(completed, "nor two").toBe(0);

  await place(host, CHIP.diff, TARGET.short);
  await waitFor(() => completed === 1, "a full dissection opens the gate");
  await waitFor(() => hasText(host, "The paving never changed"), "and states the identity");
  expect(completed, "exactly once").toBe(1);
  expect(findButton(host, "Start over with a different basin")).toBeTruthy();
});

/* -------------------------------------------------------------------------- */
/* The dissection is a dissection                                             */
/* -------------------------------------------------------------------------- */

/**
 * The figure's own rectangles, read off the rendered geometry.
 *
 * `getBBox` rather than the authored attributes: the subject is the shape a learner is
 * shown, and a piece drawn by a `<path>` or moved by a transform tomorrow would still be
 * measured here, where a reader of `width={...}` would report the source's intention.
 */
function tile(host: HTMLElement, name: string): DOMRect {
  const found = host.querySelectorAll<SVGGraphicsElement>(`svg [data-tile="${name}"]`);
  if (found.length !== 1) {
    throw new Error(
      `expected one "${name}" rectangle on the figure, found ${found.length}`,
    );
  }
  const box = (found[0] as SVGGraphicsElement).getBBox();
  return new DOMRect(box.x, box.y, box.width, box.height);
}

function area(box: DOMRect): number {
  return box.width * box.height;
}

/** The two ends of a tagged rule, in the figure's own user units. */
function ruleSpan(host: HTMLElement, name: string): number {
  const line = host.querySelector<SVGLineElement>(`svg [data-rule="${name}"]`);
  if (!line) {
    throw new Error(`the figure draws no "${name}" rule`);
  }
  const box = line.getBBox();
  return Math.max(box.width, box.height);
}

/**
 * THE GUARD THAT WAS MISSING. Everything else in this file is about what the board SAYS,
 * and the board said its three things over a figure that was not a dissection of the shape
 * it claimed: the piece drawn to be carried was `88 x 88` where its slot was `88 x 44`, and
 * the two drawn pieces covered 13552 of the leftover's 15488 units, leaving a `44 x 44`
 * hole in the middle of the L that nothing painted. "Carried piece" reads as nothing when
 * there is no coherent piece to carry, which is what QA reported and no assertion caught.
 *
 * So this measures the geometry rather than the copy: the pieces tile the leftover exactly,
 * the piece is congruent to the slot it is carried into, and the slot closes the fixed
 * rectangle up into one rectangle whose sides are the two lengths the board then asks for.
 */
test("the drawn pieces tile the leftover, and close up into one rectangle", async () => {
  const host = await board();

  const square = tile(host, "square");
  const cutout = tile(host, "cutout");
  const source = tile(host, "source");
  const fixed = tile(host, "fixed");
  const destination = tile(host, "destination");

  expect(square.width, "the original square is not square").toBeCloseTo(square.height, 3);
  expect(cutout.width, "the cut-out corner is not square").toBeCloseTo(cutout.height, 3);

  const leftover = area(square) - area(cutout);
  expect(
    area(source) + area(fixed),
    `the two drawn pieces cover ${area(source) + area(fixed)} units where the leftover paving is ${leftover}, so the figure is not a dissection of the shape it claims`,
  ).toBeCloseTo(leftover, 3);

  // A quarter turn, so the slot is the source's two sides the other way round.
  expect(
    [destination.width, destination.height],
    `the ${source.width}x${source.height} piece is carried into a ${destination.width}x${destination.height} slot`,
  ).toEqual([source.height, source.width]);

  // And the carry closes the paving up: the slot sits hard against the fixed rectangle's
  // right-hand end, spanning the whole of its depth, so the two make ONE rectangle.
  expect(
    destination.x,
    "the slot is not against the fixed rectangle's right end",
  ).toBeCloseTo(fixed.x + fixed.width, 3);
  expect(
    destination.y,
    "the slot does not start where the fixed rectangle does",
  ).toBeCloseTo(fixed.y, 3);
  expect(
    destination.height,
    "the slot is not as deep as the rectangle it closes up",
  ).toBeCloseTo(fixed.height, 3);

  // The two rules the lengths are dropped against measure that assembled rectangle, not
  // some longer reach of the canvas: this is the pair the chips `x + 6` and `x - 6` name.
  expect(
    ruleSpan(host, "long"),
    "the long rule does not measure the assembled rectangle",
  ).toBeCloseTo(fixed.width + destination.width, 3);
  expect(
    ruleSpan(host, "short"),
    "the short rule does not measure the assembled rectangle",
  ).toBeCloseTo(fixed.height, 3);
});

test("a reveal teaches the open placement and leaves the rest of the board", async () => {
  let completed = 0;
  const host = await board(() => completed++);

  put(host, CHIP.square, TARGET.piece);
  await waitFor(() => hasText(host, "REMOVED"), "the miss is explained");

  findButton(host, "Reveal this placement").click();
  await waitFor(() => target(host, TARGET.piece).disabled, "the placement is filled in");
  expect(completed, "a reveal on placement 1 does not open the gate").toBe(0);
  expect(
    instruction(host)?.getAttribute("data-open-placement"),
    "the board moves on to placement 2",
  ).toBe("long");
});

/* -------------------------------------------------------------------------- */
/* The frames the spatial claims owe                                          */
/* -------------------------------------------------------------------------- */

/**
 * The board as a learner meets it, at each of the three placements.
 *
 * Everything above is a measurement, and this figure's whole defect was one nobody could see
 * from a measurement: it tiled wrong, it captioned nothing, and both `x` labels floated at
 * midpoints with nothing to say which extent they belonged to. So the claims about what the
 * figure now SHOWS owe a picture, taken at a short laptop rather than a comfortable developer
 * window, and framed to the whole figure because what has to be legible is the arrangement
 * and not any one box in it.
 *
 * Nothing here compares against a baseline: the assertion is that a frame was written over a
 * figure that had really typeset, and the pictures are read by a person.
 */
async function figureBoard(): Promise<HTMLElement> {
  h = mount(<LessonVisual id="difference-squares-drag" onComplete={() => {}} />);
  const { host } = h;
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive svg") !== null,
    "the board mounts in a lesson figure",
  );
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the figure typesets its maths",
  );
  return host;
}

const SHOTS: readonly { slug: string; reach: (host: HTMLElement) => Promise<void> }[] = [
  { slug: "placement-1-the-strip-lands", reach: async () => {} },
  {
    slug: "placement-2-the-long-edge",
    reach: async (host) => {
      await place(host, CHIP.strip, TARGET.piece);
    },
  },
  {
    slug: "placement-3-the-short-edge",
    reach: async (host) => {
      await place(host, CHIP.strip, TARGET.piece);
      await place(host, CHIP.sum, TARGET.long);
    },
  },
];

test("the board photographs at each placement, at the named viewport", async () => {
  for (const shot of SHOTS) {
    const host = await figureBoard();
    await shot.reach(host);
    const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
    if (figure === null) {
      throw new Error(`${shot.slug}: no figure to photograph`);
    }
    await document.fonts.ready;
    expect(
      figure.querySelectorAll(".katex").length,
      `${shot.slug}: the figure's maths never typeset, so the frame is of an empty board`,
    ).toBeGreaterThan(0);
    if (CAPTURE_EVIDENCE) {
      const written = await page.screenshot({
        element: figure,
        path: `__screenshots__/difference-squares-drag/${shot.slug}-${VIEWPORT.width}x${VIEWPORT.height}.png`,
      });
      expect(written, `${shot.slug}: no frame was written`).toBeTruthy();
    }

    h?.cleanup();
    h = null;
  }
});
