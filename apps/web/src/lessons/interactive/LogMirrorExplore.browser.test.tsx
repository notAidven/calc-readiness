import { afterEach, expect, test } from "vitest";

import { labelHalfH, labelHalfW } from "../svgKit";
import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { LogMirrorExplore } from "./LogMirrorExplore";

/**
 * The first board reflects points of $y = 2^{x}$ and then asks for the second coordinate of
 * the reflected point whose first coordinate is $8$, which is $3$. Two things are pinned here:
 * the question is not even PUT until the learner has reflected a pair, and the reflected curve
 * is not drawn until the answer lands, so the gate cannot be opened by tracing a line that was
 * already on the board.
 */
function chip(host: HTMLElement, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) {
    throw new Error(`no chip: ${label}`);
  }
  return found;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("nothing is being asked yet");
  }
  return box;
}

/** One placed coordinate label, read from the ink extents `PlotLabel` publishes. */
interface Ink {
  latex: string;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

/**
 * Every label the plane placed. Read from `data-ink-*` rather than measured off KaTeX,
 * because those are the numbers the placement itself worked in: a label that lands on a
 * dot did so in that coordinate space, and re-measuring the glyphs would only add the
 * scale factor of whatever width the SVG happened to be given.
 */
function placedLabels(host: HTMLElement): Ink[] {
  return Array.from(host.querySelectorAll("[data-plot-label]")).map((node) => ({
    latex: node.querySelector("[data-latex]")?.getAttribute("data-latex") ?? "?",
    x: Number(node.getAttribute("data-ink-x")),
    y: Number(node.getAttribute("data-ink-y")),
    halfW: Number(node.getAttribute("data-ink-half-w")),
    halfH: Number(node.getAttribute("data-ink-half-h")),
  }));
}

/** Every dot on the plane: the given exponential marks, and the reflections. */
function dots(host: HTMLElement): { x: number; y: number }[] {
  return Array.from(host.querySelectorAll("svg circle")).map((node) => ({
    x: Number(node.getAttribute("cx")),
    y: Number(node.getAttribute("cy")),
  }));
}

/** The two axis lines, which are the only strokes this plane draws at that width. */
function axes(host: HTMLElement): { x: number; y: number } {
  const lines = Array.from(host.querySelectorAll('line[stroke-width="1.25"]'));
  const flat = lines.find((l) => l.getAttribute("y1") === l.getAttribute("y2"));
  const upright = lines.find((l) => l.getAttribute("x1") === l.getAttribute("x2"));
  if (!flat || !upright) {
    throw new Error("the plane is missing an axis");
  }
  return { x: Number(upright.getAttribute("x1")), y: Number(flat.getAttribute("y1")) };
}

/** Every axis number the plane prints, with the ink box each one actually occupies. */
function tickInk(host: HTMLElement, anchor: "middle" | "end"): Ink[] {
  return Array.from(host.querySelectorAll("svg text"))
    .filter((node) => /^-?\d+$/.test((node.textContent ?? "").trim()))
    .filter((node) => node.getAttribute("text-anchor") === anchor)
    .map((node) => {
      const size = Number(node.getAttribute("font-size"));
      const halfW = labelHalfW((node.textContent ?? "").trim(), size);
      return {
        latex: (node.textContent ?? "").trim(),
        // `<text>` places a baseline, so the ink's middle sits a little above it, and an
        // end-anchored number runs leftwards from the x it is given.
        x: Number(node.getAttribute("x")) - (anchor === "end" ? halfW : 0),
        y: Number(node.getAttribute("y")) - size * 0.35,
        halfW,
        halfH: labelHalfH(size),
      };
    });
}

/** Reflect the pair the first board offers, then answer, so every label is on the board. */
async function reflectAndSolve(host: HTMLElement): Promise<void> {
  chip(host, "Reflect the point 0 comma 1").click();
  chip(host, "Reflect the point 1 comma 2").click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "asking",
  );
  setInputValue(entry(host), "3");
  findButton(host, "Check").click();
  await waitFor(() => hasMath(host, "(8,\\, 3)"), "the answered point joins the board");
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogMirrorExplore withholds the question until a pair has been reflected", async () => {
  h = mount(<LogMirrorExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the plane mounts",
  );

  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();
  expect(hasText(host, "Reflect at least 2")).toBe(true);

  chip(host, "Reflect the point 0 comma 1").click();
  await waitFor(() => hasMath(host, "(0,\\, 1) \\to (1,\\, 0)"), "the first pair swaps");
  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();

  chip(host, "Reflect the point 1 comma 2").click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the question is put once two pairs are on the board",
  );
});

test("LogMirrorExplore gates once, on the swapped coordinate, and refuses the input itself", async () => {
  let completed = 0;
  h = mount(<LogMirrorExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the plane mounts",
  );

  chip(host, "Reflect the point 0 comma 1").click();
  chip(host, "Reflect the point 1 comma 2").click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "asking",
  );

  // The reflected curve is not on the board yet, so nothing can be read off it.
  expect(hasMath(host, "\\log_{2} x")).toBe(false);

  // Answering with the number in the question is the misconception: the two coordinates
  // swap, so 8 is the input of the reflected point and not its output.
  setInputValue(entry(host), "8");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not that one"), "the target itself is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "3");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the swapped coordinate opens the gate");
  await waitFor(() => hasMath(host, "\\log_{2} x"), "the reflected curve is drawn");
  expect(hasMath(host, "(8,\\, 3)")).toBe(true);
  // Nothing is left to answer, so the gate cannot be opened a second time.
  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();
  expect(completed).toBe(1);
});

test("LogMirrorExplore offers its reveal only after a real attempt", async () => {
  h = mount(<LogMirrorExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the plane mounts",
  );

  chip(host, "Reflect the point 0 comma 1").click();
  chip(host, "Reflect the point 1 comma 2").click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "asking",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "8");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});

/**
 * The coordinate pairs are the reading of the slide, so a pair printed across a dot takes
 * out both: the label is unreadable over the ink, and the dot it covers is one of the very
 * points the reflection is being read from.
 *
 * The label placer only dodges what it is handed, and the dots were not in that list. On
 * this board the pair naming $(1, 0)$ was laid over the dot at $(2, 1)$, one grid step
 * away from the point it belonged to.
 *
 * Both floors below are load-bearing: "no label holds a dot" is true of a board that drew
 * no labels, and true again of one that drew no dots, so the count of each and the count of
 * pairs actually compared are asserted beside the property.
 */
test("LogMirrorExplore never prints a coordinate label over a plotted dot", async () => {
  h = mount(<LogMirrorExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the plane mounts",
  );
  await reflectAndSolve(host);

  const labels = placedLabels(host);
  const centers = dots(host);
  // Two reflections plus the answered point, against three given marks plus those same
  // three reflections.
  expect(
    labels.length,
    "the board places a pair for every reflected point",
  ).toBeGreaterThanOrEqual(3);
  expect(
    centers.length,
    "the board draws the given marks and the reflections",
  ).toBeGreaterThanOrEqual(6);
  for (const label of labels) {
    // A box of no size would clear every dot on the plane by arithmetic alone.
    expect(
      Math.min(label.halfW, label.halfH),
      `"${label.latex}" published a degenerate ink box`,
    ).toBeGreaterThan(4);
  }

  let compared = 0;
  const hits: string[] = [];
  for (const label of labels) {
    for (const dot of centers) {
      compared += 1;
      if (
        Math.abs(label.x - dot.x) <= label.halfW &&
        Math.abs(label.y - dot.y) <= label.halfH
      ) {
        hits.push(
          `"${label.latex}" at (${label.x.toFixed(1)}, ${label.y.toFixed(1)}) ` +
            `+-(${label.halfW.toFixed(1)}, ${label.halfH.toFixed(1)}) ` +
            `covers the dot at (${dot.x.toFixed(1)}, ${dot.y.toFixed(1)})`,
        );
      }
    }
  }
  expect(compared, "every label was weighed against every dot").toBeGreaterThanOrEqual(18);
  expect(hits).toEqual([]);
});

/**
 * The placer dodges the axis numbers by boxes the widget declares for them, so the numbers
 * have to be PRINTED where those boxes say they are. Nudging the glyphs without moving the
 * boxes is worse than not nudging them: the labels then steer around empty paper and onto
 * the digits they were meant to clear.
 */
const OBSTACLE_BELOW_AXIS = 14;
const OBSTACLE_LEFT_OF_AXIS = 8;
/** Room for the baseline-to-centre estimate, and for nothing else. */
const DESYNC_SLACK = 1.5;

test("LogMirrorExplore prints its axis numbers where the label placer believes they are", async () => {
  h = mount(<LogMirrorExplore />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the plane mounts",
  );

  const axis = axes(host);
  const along = tickInk(host, "middle");
  const up = tickInk(host, "end");
  expect(along.length, "the plane numbers its horizontal axis").toBeGreaterThanOrEqual(6);
  expect(up.length, "the plane numbers its vertical axis").toBeGreaterThanOrEqual(6);

  for (const tick of along) {
    expect(
      Math.abs(tick.y - (axis.y + OBSTACLE_BELOW_AXIS)),
      `the number "${tick.latex}" is drawn at y ${tick.y.toFixed(1)}, not at the ${(axis.y + OBSTACLE_BELOW_AXIS).toFixed(1)} its obstacle box claims`,
    ).toBeLessThanOrEqual(DESYNC_SLACK);
  }
  for (const tick of up) {
    const claimed = axis.x - OBSTACLE_LEFT_OF_AXIS - tick.halfW;
    expect(
      Math.abs(tick.x - claimed),
      `the number "${tick.latex}" is drawn at x ${tick.x.toFixed(1)}, not at the ${claimed.toFixed(1)} its obstacle box claims`,
    ).toBeLessThanOrEqual(DESYNC_SLACK);
  }
});
