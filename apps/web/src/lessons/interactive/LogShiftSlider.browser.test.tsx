import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { LogShiftSlider } from "./LogShiftSlider";

/**
 * The first board is $y = \log(x - 3)$, so the boundary is $3$ and the smallest integer the
 * domain contains is $4$. Two answers, one gate: a dial alone could be walked through its
 * thirteen positions until something looked right, and the box alone would say nothing about
 * where the wall is. The strict inequality is the thing the box catches, because $3$ is the
 * boundary and is not an input.
 */
function dial(host: HTMLElement): HTMLInputElement {
  const range = host.querySelector<HTMLInputElement>('input[type="range"]');
  if (!range) {
    throw new Error("no boundary dial");
  }
  return range;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("no answer box");
  }
  return box;
}

/** The drawn curve, which is the one path this widget renders at that stroke width. */
function curve(host: HTMLElement): Element | null {
  return host.querySelector('path[stroke-width="2.4"]');
}

/** The diagram label whose LaTeX carries `fragment`. */
function label(host: HTMLElement, fragment: string): Element {
  const found = Array.from(host.querySelectorAll("foreignObject[data-latex]")).find(
    (node) => (node.getAttribute("data-latex") ?? "").includes(fragment),
  );
  if (!found) {
    throw new Error(`no diagram label carrying "${fragment}"`);
  }
  return found;
}

/**
 * The vertical band a label's glyphs actually occupy, measured over its text nodes.
 *
 * Neither box the label comes with can answer this. The `foreignObject` is three times the
 * font size by design, so it reaches above the canvas whatever the label does, and the
 * `.katex` span reports one line height while KaTeX's own vlists overflow it. A range over
 * the text nodes measures the ink and nothing else.
 */
function inkBand(node: Element): { top: number; bottom: number; height: number } {
  const root = node.querySelector(".katex-html");
  if (!root) {
    throw new Error(`nothing typeset in "${node.getAttribute("data-latex")}"`);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
    if ((text.textContent ?? "").trim() === "") {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    const box = range.getBoundingClientRect();
    if (box.height === 0) {
      continue;
    }
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
  }
  if (!Number.isFinite(top)) {
    throw new Error(`no glyphs measured in "${node.getAttribute("data-latex")}"`);
  }
  return { top, bottom, height: bottom - top };
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogShiftSlider gates once, on the boundary and the smallest integer together", async () => {
  let completed = 0;
  h = mount(<LogShiftSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector('input[type="range"]') !== null,
    "the dial mounts",
  );

  // Nothing is drawn while the question is open, so the dial cannot be lined up with a curve.
  expect(curve(host)).toBeNull();

  // The right integer behind a dial still on its opening position is not the answer.
  setInputValue(entry(host), "4");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet"), "the wrong boundary is refused");
  expect(dial(host).disabled, "a refused pair leaves the dial live").toBe(false);
  expect(completed).toBe(0);

  // The right boundary behind the boundary VALUE, which the strict inequality excludes from
  // the domain, is not the answer either. Moving the dial clears the nudge first, so the
  // second refusal is its own rather than the first one still on screen.
  setInputValue(dial(host), "3");
  await waitFor(() => !hasText(host, "Not yet"), "moving the dial clears the nudge");
  setInputValue(entry(host), "3");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet"), "the excluded boundary is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "4");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "both answers together open the gate");
  await waitFor(() => curve(host) !== null, "the curve is drawn once the answer lands");
  expect(hasMath(host, "x > 3")).toBe(true);
  // The dial is spent and the box is gone, so nothing is left that could latch again.
  expect(dial(host).disabled).toBe(true);
  expect(host.querySelector("input.lesson-interactive__input")).toBeNull();
  expect(completed).toBe(1);
});

test("LogShiftSlider offers its reveal only after a real attempt", async () => {
  h = mount(<LogShiftSlider />);
  const { host } = h;
  await waitFor(
    () => host.querySelector('input[type="range"]') !== null,
    "the dial mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "1");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});

/**
 * The heading is the only thing on this board to reason from while the question is open,
 * since the curve is deliberately not drawn, so it has to be wholly legible. Drawn at a
 * centre of 6 with glyphs standing about 18 tall, its top edge fell above the canvas and
 * the tops of the parentheses went with it.
 *
 * A pixel floor would be an assertion about the viewport rather than the layout, because
 * the SVG is scaled to whatever width its container has. Both bounds here are edges of
 * things the same scaling moves: the canvas the equation is drawn on, and the plot frame
 * below it.
 */
test("LogShiftSlider draws its equation inside the canvas and clear of the plot", async () => {
  h = mount(<LogShiftSlider />);
  const { host } = h;
  await waitFor(
    () => host.querySelector('input[type="range"]') !== null,
    "the dial mounts",
  );
  await waitFor(
    () => label(host, "\\log(x - 3)").querySelector(".katex-html") !== null,
    "the equation is typeset",
  );

  const svg = host.querySelector("svg");
  const plot = host.querySelector("[data-plot-frame]");
  if (!svg || !plot) {
    throw new Error("the board is missing its canvas or its plot frame");
  }
  const canvas = svg.getBoundingClientRect();
  const frame = plot.getBoundingClientRect();
  const ink = inkBand(label(host, "\\log(x - 3)"));

  // A band of no height would clear every edge below by arithmetic alone.
  expect(ink.height, "the equation measured no ink").toBeGreaterThan(4);
  expect(canvas.height, "the canvas measured no height").toBeGreaterThan(0);
  expect(
    ink.top - canvas.top,
    `the equation's ink starts ${(canvas.top - ink.top).toFixed(1)}px above the top of the canvas`,
  ).toBeGreaterThanOrEqual(0);
  expect(
    frame.top - ink.bottom,
    `the equation's ink runs ${(ink.bottom - frame.top).toFixed(1)}px into the plot frame`,
  ).toBeGreaterThanOrEqual(0);
});
