/**
 * `labelSpot` is the placement rule every graph widget's point labels go through, and the
 * properties below are the bugs the hand-written offsets it replaced kept producing: a label
 * pushed off the plot by a point near an edge, a corner point with no roomy side at all, and
 * two labels placed by the same rule landing on each other.
 *
 * The helpers around it are what make that rule apply to a real plot: the frame is the plot
 * rectangle pulled in from its border, the width is estimated from the label's own LaTeX,
 * and the ticks that can carry a number are the ones not sitting on the border.
 */

import { describe, expect, it } from "vitest";

import {
  fittingTicks,
  interiorTicks,
  type LabelBox,
  type LabelFrame,
  labelHalfH,
  labelHalfW,
  labelSpot,
  plotLabelFrame,
} from "./svgKit";

const FRAME: LabelFrame = { left: 80, right: 360, top: 20, bottom: 300 };
const HALF_W = 36;
const HALF_H = 11;
const GAP = 14;

/** Whether the label's whole box sits inside the frame. */
function inside(spot: { x: number; y: number }): boolean {
  return (
    spot.x - HALF_W >= FRAME.left &&
    spot.x + HALF_W <= FRAME.right &&
    spot.y - HALF_H >= FRAME.top &&
    spot.y + HALF_H <= FRAME.bottom
  );
}

describe("labelSpot", () => {
  it("offsets in the requested direction when there is room", () => {
    const spot = labelSpot({ x: 220, y: 160, frame: FRAME, dx: 1, dy: -1 });
    // Up and to the right: x grows, y shrinks (SVG y runs downward).
    expect(spot.x).toBe(220 + GAP + HALF_W);
    expect(spot.y).toBe(160 - (GAP + HALF_H));
  });

  it("keeps an axis centered on the point when its direction is 0", () => {
    const spot = labelSpot({ x: 220, y: 160, frame: FRAME, dx: 0, dy: 1 });
    expect(spot.x).toBe(220);
    expect(spot.y).toBe(160 + GAP + HALF_H);
  });

  it("flips to the other side rather than leaving the frame", () => {
    // A point close to the top: the requested "above" would put the box over the edge.
    const spot = labelSpot({ x: 220, y: FRAME.top + 6, frame: FRAME, dx: 0, dy: -1 });
    expect(spot.y).toBe(FRAME.top + 6 + GAP + HALF_H);
    expect(inside(spot)).toBe(true);
  });

  it("flips the horizontal axis independently of the vertical one", () => {
    const spot = labelSpot({ x: FRAME.right - 8, y: 160, frame: FRAME, dx: 1, dy: -1 });
    expect(spot.x).toBe(FRAME.right - 8 - (GAP + HALF_W));
    // The vertical direction had room, so it is untouched by the horizontal flip.
    expect(spot.y).toBe(160 - (GAP + HALF_H));
    expect(inside(spot)).toBe(true);
  });

  it("keeps a corner point's label inside the frame whichever way it is asked for", () => {
    for (const dx of [-1, 1] as const) {
      for (const dy of [-1, 1] as const) {
        const spot = labelSpot({
          x: FRAME.left + 2,
          y: FRAME.top + 2,
          frame: FRAME,
          dx,
          dy,
        });
        expect(inside(spot), `dx ${dx}, dy ${dy} escaped the frame`).toBe(true);
      }
    }
  });

  it("honours a caller's own box size", () => {
    const wide = labelSpot({
      x: 200,
      y: 160,
      frame: FRAME,
      dx: 1,
      dy: 0,
      halfW: 70,
      gap: 4,
    });
    expect(wide.x).toBe(200 + 4 + 70);
  });

  it("steps clear of a label that is already down", () => {
    const placed: LabelBox = {
      x: 220 + GAP + HALF_W,
      y: 160 - (GAP + HALF_H),
      halfW: HALF_W,
      halfH: HALF_H,
    };
    const spot = labelSpot({
      x: 220,
      y: 160,
      frame: FRAME,
      dx: 1,
      dy: -1,
      avoid: [placed],
    });
    // The first choice is taken, so it deviates by one axis and lands below instead.
    expect(spot.x).toBe(220 + GAP + HALF_W);
    expect(spot.y).toBe(160 + GAP + HALF_H);
    expect(inside(spot)).toBe(true);
  });

  it("takes the requested spot when the label already down is nowhere near it", () => {
    const faraway: LabelBox = {
      x: FRAME.left + 40,
      y: FRAME.bottom - 40,
      halfW: 36,
      halfH: 11,
    };
    const spot = labelSpot({
      x: 220,
      y: 160,
      frame: FRAME,
      dx: 1,
      dy: -1,
      avoid: [faraway],
    });
    expect(spot.x).toBe(220 + GAP + HALF_W);
    expect(spot.y).toBe(160 - (GAP + HALF_H));
  });

  it("clamps rather than overhanging when a wide label fits on neither side", () => {
    // Half the frame's width: the requested side overflows and so does the flip, so the
    // only correct answer is the nearest position that still holds the whole box.
    const spot = labelSpot({
      x: 220,
      y: 160,
      frame: FRAME,
      dx: 1,
      dy: 0,
      halfW: 70,
      gap: 4,
    });
    expect(spot.x).toBeLessThanOrEqual(FRAME.right - 70);
  });
});

describe("plotLabelFrame", () => {
  const PLOT: LabelFrame = { left: 100, right: 340, top: 30, bottom: 270 };

  it("pulls the plot rectangle in on every side", () => {
    expect(plotLabelFrame(PLOT, 10)).toEqual({
      left: 110,
      right: 330,
      top: 40,
      bottom: 260,
    });
  });

  it("keeps a label off the frame line by the inset it was given", () => {
    const frame = plotLabelFrame(PLOT, 10);
    // A point in the corner of the plot: whichever way the label is asked for, it comes
    // back far enough inside that the plot's own border is not printed through it.
    const spot = labelSpot({ x: PLOT.left, y: PLOT.top, frame, dx: -1, dy: -1, halfW: 20 });
    expect(spot.x - 20).toBeGreaterThanOrEqual(PLOT.left + 10);
    expect(spot.y - 11).toBeGreaterThanOrEqual(PLOT.top + 10);
  });
});

describe("labelHalfW", () => {
  it("grows with the number of glyphs", () => {
    expect(labelHalfW("(1,\\, 2)", 13)).toBeLessThan(labelHalfW("(-12,\\, -8)", 13));
  });

  it("grows with the font size", () => {
    expect(labelHalfW("(1,\\, 2)", 13)).toBeLessThan(labelHalfW("(1,\\, 2)", 20));
  });

  it("counts what \\text prints, not the macro spelling it", () => {
    // `\text{run}` is three glyphs wide, not ten: the macro and its braces are not ink.
    expect(labelHalfW("\\text{run} = 6", 13)).toBeLessThan(
      labelHalfW("xxxxxxxxxx = 6", 13),
    );
  });

  it("brackets the real ink of a coordinate pair at the size a plot draws one", () => {
    // Sanity rails rather than an exact figure: an estimate that drifts to either side of
    // these stops being a useful containment bound.
    const half = labelHalfW("(-3,\\, -2)", 13);
    expect(half).toBeGreaterThan(20);
    expect(half).toBeLessThan(45);
  });
});

describe("interiorTicks", () => {
  it("drops the ticks sitting on the ends of the range", () => {
    expect(interiorTicks([-6, -4, -2, 2, 4, 6], -6, 6)).toEqual([-4, -2, 2, 4]);
  });

  it("keeps every tick when none of them reaches an end", () => {
    expect(interiorTicks([-4, -2, 2, 4], -6, 6)).toEqual([-4, -2, 2, 4]);
  });

  it("drops a tick outside the range as well", () => {
    expect(interiorTicks([-8, -2, 2, 8], -6, 6)).toEqual([-2, 2]);
  });
});

describe("fittingTicks", () => {
  /** A 300-unit axis, 11 units to the tick, so `±12` lands close to either end. */
  const place = (tick: number) => 150 + tick * 11;
  const half = (tick: number) => labelHalfW(String(tick), 11);

  it("keeps a tick with room for its number on both sides", () => {
    expect(fittingTicks({ ticks: [-2, 2], place, half, start: 0, end: 300 })).toEqual([
      -2, 2,
    ]);
  });

  it("drops a tick whose number would be printed against the border", () => {
    // `-12` is centred 18 from the end of the axis and is 25 wide: inside the range, and
    // still nowhere near enough room, which is the case `interiorTicks` cannot see.
    expect(fittingTicks({ ticks: [-12, 0, 12], place, half, start: 0, end: 300 })).toEqual([
      0,
    ]);
  });

  it("measures along whichever axis it is given", () => {
    // The same ticks down a vertical axis, where what has to fit is the number's height:
    // three digits are wide but no taller than one, so these do fit.
    const tall = fittingTicks({
      ticks: [-12, 12],
      place,
      half: () => labelHalfH(11),
      start: 0,
      end: 300,
    });
    expect(tall).toEqual([-12, 12]);
  });
});
