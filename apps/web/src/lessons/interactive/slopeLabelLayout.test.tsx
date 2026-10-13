/**
 * The LF.1 slope widgets draw four labels inside their plot: the two points' coordinates and
 * the triangle's rise and run. Both widgets deal a new arrangement as the learner works, so
 * every one of those labels is placed by rule, and the property that matters is emergent
 * rather than local: no two of them may land on each other, and none may leave the plot.
 *
 * That is checked here against the REAL rendered geometry rather than by re-deriving the
 * placement: every `PlotLabel` records the ink box it was placed as, so the boxes come
 * straight out of the DOM. `labelSpot`'s own unit test covers the rule; this covers the
 * widgets' use of it, which is where the ordering and the avoid-lists live, and where the
 * reported collisions actually were.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { labelHalfH, labelHalfW } from "../svgKit";
import { LinearSlopeTrianglePlay } from "./LinearSlopeTrianglePlay";
import { LinearSlopeWalkthrough } from "./LinearSlopeWalkthrough";

afterEach(cleanup);

/**
 * How much of two labels' ink may be shared before it counts as a collision, as a fraction
 * of the smaller one's own ink. Deliberately loose, so a legitimate placement that grazes
 * something by a unit or two can never trip this: the bug it guards printed a coordinate
 * pair across a leg label almost exactly on top of it.
 */
const TOLERATED_OVERLAP = 0.25;

/** Each widget's plot rectangle: the labels' hard boundary, ticks and all. */
const WALKTHROUGH_PLOT = { left: 70, right: 370, top: 12, bottom: 312 };
const TRIANGLE_PLOT = { left: 76, right: 364, top: 14, bottom: 302 };

interface Placed {
  latex: string;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

/**
 * The axis tick numbers, which are plain `<text>` rather than typeset math. They count as
 * obstacles: a coordinate printed across the "-4" on the x axis is as unreadable as one
 * printed across another label.
 */
function tickLabels(size = 10): Placed[] {
  const out: Placed[] = [];
  for (const node of Array.from(document.querySelectorAll("svg text"))) {
    const text = (node.textContent ?? "").trim();
    if (!/^-?\d+$/.test(text)) {
      continue;
    }
    const halfW = labelHalfW(text, size);
    const anchored = node.getAttribute("text-anchor") === "end";
    const x = Number(node.getAttribute("x")) - (anchored ? halfW : 0);
    // `<text>` places a baseline, so the ink's middle sits a little above it.
    const y = Number(node.getAttribute("y")) - 4;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    out.push({ latex: `tick ${text}`, x, y, halfW, halfH: labelHalfH(size) });
  }
  return out;
}

/**
 * Every label placed against the plot, read back from what the widget actually drew. The ink
 * extents come with them: `PlotLabel` records the box it was placed as, which is the ink
 * rather than `SvgMath`'s deliberately roomy transparent frame.
 */
function plotLabels(): Placed[] {
  return Array.from(document.querySelectorAll("[data-plot-label]")).map((node) => ({
    latex: node.querySelector("[data-latex]")?.getAttribute("data-latex") ?? "",
    x: Number(node.getAttribute("data-ink-x")),
    y: Number(node.getAttribute("data-ink-y")),
    halfW: Number(node.getAttribute("data-ink-half-w")),
    halfH: Number(node.getAttribute("data-ink-half-h")),
  }));
}

/** The shared area of two labels' ink, as a fraction of the smaller one's. */
function sharedFraction(a: Placed, b: Placed): number {
  const x = Math.max(0, a.halfW + b.halfW - Math.abs(a.x - b.x));
  const y = Math.max(0, a.halfH + b.halfH - Math.abs(a.y - b.y));
  const smaller = Math.min(4 * a.halfW * a.halfH, 4 * b.halfW * b.halfH);
  return smaller === 0 ? 0 : (x * y) / smaller;
}

function expectApart(a: Placed, b: Placed, where: string) {
  const shared = sharedFraction(a, b);
  expect(
    shared <= TOLERATED_OVERLAP,
    `${where}: "${a.latex}" at (${a.x}, ${a.y}) covers ${Math.round(shared * 100)}% of "${b.latex}" at (${b.x}, ${b.y})`,
  ).toBe(true);
}

function expectNoCollisions(labels: readonly Placed[], where: string) {
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i];
      const b = labels[j];
      if (a && b) {
        expectApart(a, b, where);
      }
    }
  }
}

function expectClearOfTicks(
  labels: readonly Placed[],
  ticks: readonly Placed[],
  where: string,
) {
  for (const label of labels) {
    for (const tick of ticks) {
      expectApart(label, tick, where);
    }
  }
}

function expectInsideFrame(
  labels: readonly Placed[],
  frame: { left: number; right: number; top: number; bottom: number },
  where: string,
) {
  for (const label of labels) {
    expect(
      label.x - label.halfW >= frame.left && label.x + label.halfW <= frame.right,
      `${where}: "${label.latex}" leaves the plot horizontally at x ${label.x}`,
    ).toBe(true);
    expect(
      label.y - label.halfH >= frame.top && label.y + label.halfH <= frame.bottom,
      `${where}: "${label.latex}" leaves the plot vertically at y ${label.y}`,
    ).toBe(true);
  }
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  const field = screen.getByLabelText(label, { exact: false });
  await user.clear(field);
  await user.type(field, value);
}

describe("LF.1 slope label layout", () => {
  /*
   * Either point may be taken as `(x_2, y_2)`, and the walkthrough draws its triangle from
   * whichever one the learner made point 1, so the reversed reading is a second arrangement
   * of the same four labels: the run leg moves to the other point's row and the rise leg to
   * its column. Both readings are walked over all three pairs.
   */
  it.each([
    ["as dealt", false],
    ["with the points taken the other way round", true],
  ] as const)(
    "keeps every pair's labels clear of each other, before and after the triangle, %s",
    async (reading, reversed) => {
      const user = userEvent.setup();
      render(<LinearSlopeWalkthrough />);

      // Each pass covers one of the three point pairs the widget deals.
      for (let pass = 0; pass < 3; pass++) {
        const dealt = screen.getByRole("img").getAttribute("aria-label") ?? `pass ${pass}`;
        const pair = `${dealt} [${reading}]`;

        // Before the substitution: two point labels, no triangle.
        const ticks = tickLabels();
        const before = plotLabels();
        expect(before.length).toBe(2);
        expectNoCollisions(before, `${pair} (no triangle)`);
        expectClearOfTicks(before, ticks, `${pair} (no triangle)`);
        expectInsideFrame(before, WALKTHROUGH_PLOT, `${pair} (no triangle)`);

        // Read the coordinates the widget is asking about off its own naming line, so this
        // walks the real pairs rather than a copy of them.
        const naming = Array.from(document.querySelectorAll("[data-latex]"))
          .map((node) => node.getAttribute("data-latex") ?? "")
          .filter((latex) => /^\(x_\d/.test(latex));
        // `(x_1,\, y_1) = (a,\, b)`: the two subscripts contribute the leading 1s or 2s.
        const [, , x1, y1] = (naming[0]?.match(/-?\d+/g) ?? []).map(Number);
        const [, , x2, y2] = (naming[1]?.match(/-?\d+/g) ?? []).map(Number);
        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
          throw new Error(`could not read the pair from "${naming.join(" ")}"`);
        }
        const head = reversed ? { x: x1, y: y1 } : { x: x2, y: y2 };
        const tail = reversed ? { x: x2, y: y2 } : { x: x1, y: y1 };
        const rise = head.y - tail.y;
        const run = head.x - tail.x;

        await fill(user, "y sub 2", String(head.y));
        await fill(user, "y sub 1", String(tail.y));
        await fill(user, "x sub 2", String(head.x));
        await fill(user, "x sub 1", String(tail.x));
        await user.click(screen.getByRole("button", { name: "Check" }));

        // With the triangle drawn: four labels, all of which have to coexist.
        const after = plotLabels();
        expect(after.length).toBe(4);
        expectNoCollisions(after, `${pair} (with triangle)`);
        expectClearOfTicks(after, ticks, `${pair} (with triangle)`);
        expectInsideFrame(after, WALKTHROUGH_PLOT, `${pair} (with triangle)`);

        await fill(user, "the rise", String(rise));
        await fill(user, "the run", String(run));
        await user.click(screen.getByRole("button", { name: "Check" }));
        await fill(user, "reduced to lowest terms", String(rise / run));
        await user.click(screen.getByRole("button", { name: "Check" }));
        await user.click(
          screen.getByRole("button", { name: /Start over with a different pair/ }),
        );
      }
    },
  );

  /**
   * Where to walk the mover, and how to get there from its start at `(0, 1)`. Each case gets
   * its own render and its own SHORT walk, because the widget disables its pad once both
   * target slopes have been hit; a single long walk would trip that and stop moving.
   */
  const WALKS: readonly { what: string; steps: readonly [string, number][] }[] = [
    { what: "its starting position", steps: [] },
    {
      what: "the top right corner",
      steps: [
        ["right", 6],
        ["up", 5],
      ],
    },
    {
      what: "the top left corner",
      steps: [
        ["up", 5],
        ["left", 6],
      ],
    },
    {
      what: "the bottom left corner",
      steps: [
        ["left", 6],
        ["down", 7],
      ],
    },
    {
      what: "the bottom right corner",
      steps: [
        ["right", 6],
        ["down", 7],
      ],
    },
    // The two degenerate triangles: on the anchor's row the rise is 0 and no rise label is
    // drawn, and on its column the run is 0, which drops the run label and the whole leg.
    {
      what: "the anchor's row",
      steps: [
        ["right", 6],
        ["down", 3],
      ],
    },
    { what: "the anchor's column", steps: [["left", 3]] },
  ];

  it.each(WALKS.map((walk) => [walk.what, walk.steps] as const))(
    "keeps the moving triangle's labels clear at %s",
    async (what, steps) => {
      const user = userEvent.setup();
      render(<LinearSlopeTrianglePlay />);

      for (const [direction, times] of steps) {
        const key = screen.getByRole("button", { name: `move ${direction}` });
        for (let i = 0; i < times; i++) {
          await user.click(key);
        }
      }

      const labels = plotLabels();
      // Both points always carry a label; the legs' labels come and go with the triangle.
      expect(labels.length).toBeGreaterThanOrEqual(3);
      expectNoCollisions(labels, `the triangle at ${what}`);
      expectClearOfTicks(labels, tickLabels(), `the triangle at ${what}`);
      expectInsideFrame(labels, TRIANGLE_PLOT, `the triangle at ${what}`);
    },
  );
});
