/**
 * The coordinate-plane guard, swept over every live mini-lesson visual and every worked
 * solution a learner can be served (the real frozen pools, so the planes are drawn with the
 * params they actually get).
 *
 * Two properties, both about text a plane draws on itself:
 *
 *  1. Every placed label lies wholly inside its plot. A coordinate pair hanging off the
 *     grid is the bug this exists for, and it only ever appeared for a point near an edge,
 *     which is to say for one draw of one template out of a pool.
 *  2. No axis number is centered on the plot's border, where half its digits fall outside.
 *
 * Frame-agnostic on purpose: a plane joins the sweep by tagging its plot rect with
 * `data-plot-frame`, so a new widget inherits the guard rather than having to be listed.
 * The sweep is over the live registries for the same reason `visualsMath.test.tsx` is.
 */

import {
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_POOL,
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_POOL,
  D5_PRACTICE_ITEMS,
  D5_PRACTICE_POOL,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_POOL,
  D7_PRACTICE_ITEMS,
  D7_PRACTICE_POOL,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_POOL,
} from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { allLessons } from "./domains";
import { labelHalfH, labelHalfW, TICK_EDGE_CLEARANCE } from "./svgKit";
import { LessonVisual } from "./visuals";
import { WorkedSolution } from "./WorkedSolution";

const LIVE_VISUAL_IDS = Array.from(
  new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
);

/**
 * D7 is in here and not in `visualsMath`'s sweep: its worked solutions draw the planes.
 *
 * The population here is which domains DRAW A PLANE, and it is deliberately not the same list
 * as `practiceSweep`'s. D6 was added the round its figures were authored, because twenty of them
 * are coordinate planes on windows their params choose: that is the exact shape property 1 exists
 * for, and a plane whose window a seed picks is likelier to place a label near an edge than a
 * plane on a fixed one. What decides membership is the behaviour, not who imports the drawing
 * code — D6's planes tag `data-plot-frame` through `D6Chart` in `worked/d6Kit.tsx`.
 *
 * INJECTED RED BY: widening `D6Chart`'s label frame 120 units left of its plot, so `labelSpot`
 * is free to place outside the rect it is supposed to respect. Fails at
 * *"d6.fun5.chart-window.l2: expected [ Array(1) ] to deeply equal [] ... \"21\" runs off the
 * plot horizontally at x 59.87 (half width 11.28)"*, which is a D6 row, so the population
 * genuinely reaches the new figures. It reports 451 tests where it reported 396 before D6 was
 * added: the difference is fifty-five, D6's whole pool and not a sample of it.
 */
const POOLED_ITEMS = [
  ...D1_PRACTICE_POOL,
  ...D2_PRACTICE_POOL,
  ...D5_PRACTICE_POOL,
  ...D6_PRACTICE_POOL,
  ...D7_PRACTICE_POOL,
  ...D8_PRACTICE_POOL,
];

const LIVE_PRACTICE_ITEMS = (() => {
  const covered = new Set(POOLED_ITEMS.map((item) => item.template_id));
  const extra: typeof POOLED_ITEMS = [];
  for (const item of [
    ...D1_PRACTICE_ITEMS,
    ...D2_PRACTICE_ITEMS,
    ...D5_PRACTICE_ITEMS,
    ...D6_PRACTICE_ITEMS,
    ...D7_PRACTICE_ITEMS,
    ...D8_PRACTICE_ITEMS,
  ]) {
    if (!covered.has(item.template_id)) {
      covered.add(item.template_id);
      extra.push(item);
    }
  }
  return [...POOLED_ITEMS, ...extra];
})();

interface Frame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * How far outside its plot a label's ink may reach. One unit of slack, because the ink
 * extents a label is placed as are an estimate of what KaTeX will draw, and a guard that
 * fails on rounding would only teach people to widen it.
 */
const SLACK = 1;

/**
 * The bar an axis number has to clear, shared with the helpers that pick which ticks get a
 * number, so a plane that goes through them cannot be failed by a rule they do not apply.
 * What this catches is a plane that does NOT: a hand-written tick array on a fixed window.
 */
const TICK_CLEARANCE = TICK_EDGE_CLEARANCE - 1;

function frameOf(svg: Element): Frame | null {
  const rect = svg.querySelector("[data-plot-frame]");
  if (!rect) {
    return null;
  }
  const left = Number(rect.getAttribute("x"));
  const top = Number(rect.getAttribute("y"));
  const width = Number(rect.getAttribute("width"));
  const height = Number(rect.getAttribute("height"));
  if (![left, top, width, height].every((value) => Number.isFinite(value))) {
    return null;
  }
  return { left, right: left + width, top, bottom: top + height };
}

/** Reports every placed label whose ink leaves the plot it belongs to. */
function escapedLabels(svg: Element, frame: Frame): string[] {
  return Array.from(svg.querySelectorAll("[data-plot-label]")).flatMap((node) => {
    const latex = node.querySelector("[data-latex]")?.getAttribute("data-latex") ?? "?";
    const x = Number(node.getAttribute("data-ink-x"));
    const y = Number(node.getAttribute("data-ink-y"));
    const halfW = Number(node.getAttribute("data-ink-half-w"));
    const halfH = Number(node.getAttribute("data-ink-half-h"));
    const out: string[] = [];
    if (x - halfW < frame.left - SLACK || x + halfW > frame.right + SLACK) {
      out.push(`"${latex}" runs off the plot horizontally at x ${x} (half width ${halfW})`);
    }
    if (y - halfH < frame.top - SLACK || y + halfH > frame.bottom + SLACK) {
      out.push(`"${latex}" runs off the plot vertically at y ${y} (half height ${halfH})`);
    }
    return out;
  });
}

/** A bare-integer `<text>` this guard is willing to read as an axis number. */
interface TickCandidate {
  text: string;
  /** Centre of the ink, not the anchor point. */
  x: number;
  y: number;
  halfW: number;
  halfH: number;
  /**
   * `interior` numbers sit in the box, so both borders are theirs to clear. `scale` numbers
   * are the vertical scale, printed in the margin beside the row they label: they are
   * outside the box horizontally on purpose, and only the top and bottom borders apply.
   */
  kind: "interior" | "scale";
}

/**
 * Every bare-integer `<text>` that is an axis number rather than a caption.
 *
 * The vertical scale is in here, and for a long time was not: the gate asked `x >
 * frame.left`, which no right-anchored y number can satisfy, so 35 planes were swept
 * without one of them ever having its vertical scale looked at. The gate was written to
 * keep margin CAPTIONS out, and it kept the scale out with them — which is how three
 * FUN.4 planes printed a number centred on the top border while this file stayed green.
 *
 * A caption is excluded by the bare-integer test alone; what still has to be excluded is
 * the number a plane prints BELOW its box, where the x-axis `0` in the bottom-left corner
 * is outside the frame by design. That is what the row band does, and it is why a `scale`
 * candidate has to sit at the height of a row.
 */
function tickCandidates(svg: Element, frame: Frame): TickCandidate[] {
  return Array.from(svg.querySelectorAll("text")).flatMap((node) => {
    const text = (node.textContent ?? "").trim();
    if (!/^-?\d+$/.test(text)) {
      return [];
    }
    const size = Number(node.getAttribute("font-size")) || 11;
    const halfW = labelHalfW(text, size);
    const halfH = labelHalfH(size);
    const anchored = node.getAttribute("text-anchor") === "end";
    const x = Number(node.getAttribute("x")) - (anchored ? halfW : 0);
    // `<text>` places a baseline, so the ink's middle sits a little above it.
    const y = Number(node.getAttribute("y")) - size * 0.35;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return [];
    }
    const inRows = y > frame.top - halfH && y < frame.bottom + halfH;
    if (!inRows) {
      return [];
    }
    const kind = x > frame.left && x < frame.right ? "interior" : "scale";
    return [{ text, x, y, halfW, halfH, kind }];
  });
}

/**
 * Reports every axis number that is centered too near an edge of its plot.
 *
 * The two kinds are held to different bars, because they are competing with the frame for
 * different things. An interior number gets `TICK_CLEARANCE` on top of merely fitting: one
 * that only just fits still reads as stuck to the border it is printed against. A margin
 * number of the vertical scale is outside the box already and is not competing for that
 * space at all; what it owes is that it labels a ROW, so its ink has to fall within the
 * plot's height rather than sit astride the border with half of it above the plane. Held
 * to the interior bar it would fail planes whose outermost numbered row is genuinely
 * inside — `d8.el4.domain-shift.l3` numbers 4 on a 4.5 window, 11 units in with 6.5 of ink.
 */
function borderTicks(svg: Element, frame: Frame): string[] {
  return tickCandidates(svg, frame).flatMap((tick) => {
    if (tick.kind === "interior") {
      const gapX = Math.min(tick.x - frame.left, frame.right - tick.x);
      if (gapX < tick.halfW * (1 + TICK_CLEARANCE)) {
        return [
          `the tick "${tick.text}" is centered ${gapX.toFixed(1)} from a vertical edge`,
        ];
      }
    }
    const roomY = tick.kind === "interior" ? tick.halfH * (1 + TICK_CLEARANCE) : tick.halfH;
    const gapY = Math.min(tick.y - frame.top, frame.bottom - tick.y);
    if (gapY < roomY) {
      return [
        `the tick "${tick.text}" is centered ${gapY.toFixed(1)} from a horizontal edge`,
      ];
    }
    return [];
  });
}

function checkPlanes(container: HTMLElement, where: string) {
  const svgs = Array.from(container.querySelectorAll("svg")).filter(
    (svg) => svg.querySelector("[data-plot-frame]") !== null,
  );
  for (const svg of svgs) {
    const frame = frameOf(svg);
    if (!frame) {
      continue;
    }
    expect(escapedLabels(svg, frame), where).toEqual([]);
    expect(borderTicks(svg, frame), where).toEqual([]);
  }
}

describe("every coordinate plane keeps its text inside the plot", () => {
  it.each(LIVE_VISUAL_IDS)("%s", (id) => {
    const { container } = render(<LessonVisual id={id} />);
    checkPlanes(container, id);
  });
});

describe("every worked solution keeps its plane's text inside the plot", () => {
  it.each(LIVE_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const))(
    "%s",
    (templateId, item) => {
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      checkPlanes(container, templateId);
    },
  );
});

/**
 * Rendering every live visual takes longer than vitest's default budget on a loaded
 * machine, and the pass below is the one place this file does it in a single test rather
 * than one per plane. A timeout, not an assertion: what the floors measure is unchanged.
 */
const CENSUS_MS = 60_000;

/**
 * What one pass over the live visuals finds, computed once: rendering all of them is the
 * expensive part of this file, and two floors below want the same pass.
 */
const liveCensus = (() => {
  let counted: { tagged: number; scale: number; interior: number } | null = null;
  return () => {
    if (counted) {
      return counted;
    }
    counted = { tagged: 0, scale: 0, interior: 0 };
    for (const id of LIVE_VISUAL_IDS) {
      const { container } = render(<LessonVisual id={id} />);
      counted.tagged += container.querySelectorAll("[data-plot-frame]").length;
      for (const svg of Array.from(container.querySelectorAll("svg"))) {
        const frame = frameOf(svg);
        if (!frame) {
          continue;
        }
        for (const tick of tickCandidates(svg, frame)) {
          counted[tick.kind === "scale" ? "scale" : "interior"] += 1;
        }
      }
    }
    return counted;
  };
})();

describe("the sweep is actually looking at planes", () => {
  it(
    "finds a tagged plot frame among the live visuals",
    () => {
      // A guard over nothing passes silently, which is the one way this test could lie.
      expect(liveCensus().tagged).toBeGreaterThanOrEqual(8);
    },
    CENSUS_MS,
  );

  it("finds placed labels to check", () => {
    const { container } = render(<LessonVisual id="linear-slope-triangle-play" />);
    expect(container.querySelectorAll("[data-plot-label]").length).toBeGreaterThan(0);
  });

  /**
   * The vertical scale is the half of the sweep that used to be skipped entirely, and a
   * gate that quietly stopped admitting it would take this count to zero with every
   * assertion above still green. Floored separately from the interior numbers for that
   * reason: a healthy total says nothing about which kind it is made of, which is exactly
   * how a sweep over 35 planes went years without reading a y number.
   */
  it(
    "reads the vertical scale and not only the numbers inside the box",
    () => {
      expect(liveCensus().scale).toBeGreaterThanOrEqual(24);
      expect(liveCensus().interior).toBeGreaterThanOrEqual(24);
    },
    CENSUS_MS,
  );
});
