/**
 * The three things `EstimateThenCheck` prints above its number line stay out of each other's ink.
 *
 * The board carries a static landmark label at a fixed position on the scale and a readout that
 * rides the learner's marker, and for as long as both sat in one band the two painted on top of
 * each other wherever the marker met the landmark. It was not a corner case. The marker opens at
 * the midpoint of the scale, and on two of the four boards the landmark IS the midpoint (TRG.7's
 * `45` on `0..90`, POL.8's `0` on `-12..12`), so the first thing either ever showed a learner was
 * two numbers four units apart at the same `x`, one grey and one brick, reading as a smudge. The
 * other two boards reach the same state by dragging. The quantity above them was in it too: the
 * `\dfrac` boards ran their descenders 3.6 units into the landmark's ink.
 *
 * ## What is asserted, and why in this shape
 *
 * The marker MOVES, so a fix conditional on where it is right now is a promise about the
 * positions somebody thought to check, and a test that only sampled positions would be the same
 * promise. The fix is structural instead: the three lanes are given disjoint HORIZONTAL bands, so
 * no marker position can put two of them on top of each other. That is what the first test
 * measures, per pair, at the position where they are most nearly on top of each other.
 *
 * The sampling sweep is the second test. It exists to catch the thing band arithmetic cannot:
 * a lane whose ink grows with its content (a taller expression on a later round) and eats the
 * gap. It walks the whole scale, including the exact landmark position read off the widget's own
 * `data-estimate-at`, and every round the board deals.
 *
 * ## The floor is a HORIZONTAL overlap, not a count
 *
 * Two boxes that never share an `x` are trivially non-overlapping, so a board whose marker could
 * not reach its landmark would satisfy the vertical claim while proving nothing. Each case
 * therefore first establishes that at the landmark position the readout and the landmark label DO
 * share an x span, and only then that they are clear of each other vertically. Force the lanes
 * back together and it is that second half that fails.
 *
 * The population is derived from the sources rather than listed, and floored, for the reason
 * `.cursor/rules/qa-verification.mdc` gives: this defect belongs to every widget on the kind, and
 * a list is a fact about which files a QA pass had open.
 */

import { afterEach, expect, test } from "vitest";

import { visualsBuiltOn } from "./kindFamily";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

const ESTIMATE_VISUALS: readonly LessonVisualId[] = visualsBuiltOn("EstimateThenCheck");

/** The three lanes, nearest the axis last. */
const LANES = ["quantity", "landmark", "reading"] as const;
type Lane = (typeof LANES)[number];

/**
 * How much shared ink counts as a collision, in CSS pixels.
 *
 * The same 2px `workedFigureLabels.browser.test.tsx` allows, and for the same reason: a KaTeX box
 * is a line box rather than a glyph outline, so two labels a hair apart can report a pixel of
 * shared box without a pixel of shared ink.
 */
const INK_TOLERANCE = 2;

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** The rendered ink of one lane, or `null` where the board draws none. */
function laneBox(host: HTMLElement, lane: Lane): Box | null {
  const node =
    lane === "reading"
      ? host.querySelector("text[data-estimate-lane='reading']")
      : (host.querySelector(`g[data-estimate-lane='${lane}'] .katex`) ??
        host.querySelector(`g[data-estimate-lane='${lane}']`));
  if (!node) {
    return null;
  }
  const r = node.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
}

function overlap(a: Box, b: Box, axis: "x" | "y"): number {
  return axis === "y"
    ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    : Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

function slider(host: HTMLElement): HTMLInputElement {
  const range = host.querySelector<HTMLInputElement>(".lesson-interactive__range");
  if (!range) {
    throw new Error("the board has no marker slider");
  }
  return range;
}

function park(host: HTMLElement, value: number): void {
  const range = slider(host);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(range, String(value));
  range.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Where the round's landmark sits on the scale, off the widget's own hook. */
function landmarkAt(host: HTMLElement): number | null {
  const at = host
    .querySelector("g[data-estimate-lane='landmark']")
    ?.getAttribute("data-estimate-at");
  return at === null || at === undefined ? null : Number(at);
}

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} onComplete={() => {}} />);
  const host = h.host;
  await waitFor(
    () => host.querySelector("g[data-estimate-lane='quantity'] .katex") !== null,
    `${id} typesets its quantity`,
    20_000,
  );
  await document.fonts.ready;
  return host;
}

/**
 * Land the round and move to the next one, reporting whether there was a next one.
 *
 * The true value is not in the DOM, so it is found by walking the scale and pressing Check:
 * the board disables its own slider the moment a guess lands inside the tolerance, which is
 * the signal. Deliberately not the reveal, which hands the board back on this kind and would
 * be measuring the re-ask rather than the second round.
 */
function settleAndAdvance(host: HTMLElement): boolean {
  const range = slider(host);
  const min = Number(range.min);
  const max = Number(range.max);
  const step = Number(range.step);
  const check = Array.from(host.querySelectorAll("button")).find((b) =>
    (b.textContent ?? "").includes("Check this spot"),
  );
  if (!check) {
    throw new Error("the board offers no Check control");
  }
  for (let v = min; v <= max + step / 2 && !slider(host).disabled; v += step) {
    park(host, Number(v.toFixed(6)));
    check.click();
  }
  if (!slider(host).disabled) {
    throw new Error("no position on the scale was accepted, so the round never settled");
  }
  const next = Array.from(host.querySelectorAll("button")).find((b) =>
    (b.textContent ?? "").includes("Next: another one to place"),
  );
  if (!next) {
    return false;
  }
  next.click();
  return true;
}

test("the kind has adopters at all, so the sweeps below are looking at something", () => {
  expect(
    ESTIMATE_VISUALS.length,
    "no registered widget is built on EstimateThenCheck",
  ).toBeGreaterThanOrEqual(4);
});

test.each(ESTIMATE_VISUALS)(
  "%s keeps its three lanes out of each other's ink with the marker on the landmark",
  async (id) => {
    const host = await board(id);
    const at = landmarkAt(host);
    expect(at, `${id}: the first round draws no landmark`).not.toBeNull();
    park(host, at as number);
    await new Promise<void>((r) => setTimeout(r, 60));

    const boxes = new Map<Lane, Box>();
    for (const lane of LANES) {
      const box = laneBox(host, lane);
      expect(box, `${id}: no ${lane} lane is drawn`).not.toBeNull();
      boxes.set(lane, box as Box);
    }

    // The floor. Parked on the landmark, the readout and the label really are in the same
    // column, so the vertical claim below is load-bearing rather than trivially true.
    const shareX = overlap(boxes.get("landmark") as Box, boxes.get("reading") as Box, "x");
    expect(
      shareX,
      `${id}: parked on the landmark the readout is not even in the landmark's column, so this case proves nothing`,
    ).toBeGreaterThan(0);

    for (let i = 0; i < LANES.length; i += 1) {
      for (let j = i + 1; j < LANES.length; j += 1) {
        const a = LANES[i] as Lane;
        const b = LANES[j] as Lane;
        const boxA = boxes.get(a) as Box;
        const boxB = boxes.get(b) as Box;
        if (overlap(boxA, boxB, "x") <= 0) {
          continue;
        }
        expect(
          overlap(boxA, boxB, "y"),
          `${id}: the ${a} and ${b} lanes share ${overlap(boxA, boxB, "y").toFixed(1)}px of ink in the same column`,
        ).toBeLessThanOrEqual(INK_TOLERANCE);
      }
    }
  },
);

test.each(ESTIMATE_VISUALS)(
  "%s keeps them apart at every marker position, on every round",
  async (id) => {
    const host = await board(id);
    let round = 0;
    let checked = 0;
    let more = true;
    while (more && round < 6) {
      const range = slider(host);
      const min = Number(range.min);
      const max = Number(range.max);
      const step = Number(range.step);
      const at = landmarkAt(host);
      const stops = new Set<number>();
      // Forty evenly spaced positions, plus the landmark and its immediate neighbours, which
      // is where the two labels are closest to sharing a column.
      for (let k = 0; k <= 40; k += 1) {
        stops.add(min + ((max - min) * k) / 40);
      }
      if (at !== null) {
        for (const d of [-2, -1, 0, 1, 2]) {
          const v = at + d * step;
          if (v >= min && v <= max) {
            stops.add(v);
          }
        }
      }

      for (const value of stops) {
        park(host, value);
        const reading = laneBox(host, "reading");
        if (!reading) {
          throw new Error(`${id}: the readout vanished at ${value}`);
        }
        for (const lane of ["quantity", "landmark"] as const) {
          const other = laneBox(host, lane);
          if (!other || overlap(other, reading, "x") <= 0) {
            continue;
          }
          expect(
            overlap(other, reading, "y"),
            `${id}: round ${round}, marker at ${value}: the ${lane} lane and the readout share ${overlap(other, reading, "y").toFixed(1)}px of ink`,
          ).toBeLessThanOrEqual(INK_TOLERANCE);
        }
        checked += 1;
      }
      round += 1;
      more = settleAndAdvance(host);
    }

    expect(checked, `${id}: no marker position was measured`).toBeGreaterThanOrEqual(40);
    expect(round, `${id}: only one round was reached`).toBeGreaterThanOrEqual(2);
  },
);
