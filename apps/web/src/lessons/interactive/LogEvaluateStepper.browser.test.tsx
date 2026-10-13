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
import { LogEvaluateStepper } from "./LogEvaluateStepper";

/**
 * One ladder, two answers, one gate. Stage one reads the exponent off the climb and stage two
 * hands an exponent back and asks for the argument, so a widget that gated on stage one alone
 * would let a learner past the conversion the node's harder practice turns on.
 *
 * Nothing here waits on a printed count. It used to, and that was the tell: `1 factor on the
 * ladder` was a convenient anchor because the board announced how many rungs it was holding,
 * which on stage one is the answer. The waits below anchor on the rung VALUES instead, which
 * are what the board is allowed to say.
 */
function climb(host: HTMLElement): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Apply one more factor of 4"]',
  );
  if (!found) {
    throw new Error("no climb control");
  }
  return found;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("nothing is being asked");
  }
  return box;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogEvaluateStepper prints running products, so the exponent is counted rather than read", async () => {
  h = mount(<LogEvaluateStepper />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the ladder mounts",
  );

  expect(hasText(host, "no factors applied yet")).toBe(true);

  climb(host).click();
  await waitFor(() => ladderRungs(host).length === 1, "one factor lands");

  climb(host).click();
  climb(host).click();
  await waitFor(() => ladderRungs(host).length === 3, "the ladder grows");
  // The rungs say what each running product IS. Labelling them with their own exponents
  // would hand over the answer the learner is here to count.
  expect(hasMath(host, "64")).toBe(true);
  expect(hasMath(host, "4^{2}")).toBe(false);
  expect(hasMath(host, "4^{3}")).toBe(false);
});

/**
 * The board may not say HOW MANY rungs it is holding while stage one is asking for exactly
 * that number.
 *
 * Stage one asks for $\log_{4} 256$, the learner climbs until a rung reads $256$, and the
 * fourth rung is the one that does. A running count under the ladder therefore prints `4` in
 * the same frame as the box asking for `4`. The widget's own header already ruled that out,
 * in the sentence rejecting rung labels of `b^{1}`, `b^{2}` -- and the count shipped anyway,
 * in a plain `<text>` rather than in a rung label, which is why this asserts over the WHOLE
 * BOARD rather than over the rung labels.
 *
 * Both surfaces the board can print on are covered, because closing one alone reopens on the
 * other: the typeset spans, censused by value against what the ladder is FOR, and the plain
 * `<text>` nodes, which may hold no digit at all.
 */
function boardLatex(host: HTMLElement): string[] {
  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("no ladder svg");
  }
  return Array.from(svg.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
}

/** The svg's own `<text>` nodes: the ones this file authors, not the ones KaTeX typesets. */
function boardPlainText(host: HTMLElement): string[] {
  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("no ladder svg");
  }
  return Array.from(svg.querySelectorAll("text"))
    .filter((node) => node.closest("[data-latex]") === null)
    .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
}

test("LogEvaluateStepper's board never counts the rungs for the learner", async () => {
  h = mount(<LogEvaluateStepper />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the ladder mounts",
  );

  climb(host).click();
  climb(host).click();
  climb(host).click();
  climb(host).click();
  await waitFor(() => ladderRungs(host).length === 4, "the ladder reaches the argument");

  // The board is now in the exact state the frame at 1024x580 was taken in: the last rung
  // reads 256 and the field below asks for log base 4 of 256, whose answer is the rung count.
  const rungs = ladderRungs(host);
  expect(rungs, "the climb did not reach the argument").toEqual(["4", "16", "64", "256"]);
  const answer = String(rungs.length);

  /*
   * The census. Every typeset span on the board is one of three things the ladder is for: the
   * question, a rung, or the `\times 4` on a gap. A count would arrive as a fourth, whether it
   * is spelt `4` or `4 \text{ factors}`, and lands here.
   *
   * Derived rather than listed, and floored, so it cannot pass over an empty board.
   */
  const latex = boardLatex(host);
  expect(latex.length, "the board typeset nothing").toBeGreaterThanOrEqual(
    rungs.length + 1,
  );
  const unaccounted = latex.filter(
    (value, index) =>
      // The question is the one span naming the logarithm, and it is span zero.
      !(index === 0 && value.includes("\\log")) &&
      value !== `\\times ${rungs[0]}` &&
      !rungs.includes(value),
  );
  expect(
    unaccounted,
    `the board typesets something that is neither the question, a rung nor a factor label, while stage one asks for ${answer}`,
  ).toEqual([]);

  /*
   * The other surface. The count that shipped was a bare `<text>`, invisible to a census over
   * typeset spans, so the plain nodes carry their own rule: the board's own words may say what
   * state it is in and may not put a number on it.
   */
  for (const line of boardPlainText(host)) {
    expect(line, `the board's own words carry a number: "${line}"`).not.toMatch(/\d/);
    expect(
      line.toLowerCase(),
      `the board counts its own rungs while stage one asks for ${answer}`,
    ).not.toMatch(/factors? on the ladder/);
  }
});

/**
 * Every rung after the first is reached BY multiplying, so every gap between rungs owes a
 * drawn arrow: a floating `\times 4` with no arc leaves the direction of the climb implied.
 *
 * The rung census is derived from the svg rather than written down here, so the count cannot
 * drift out of step with the ladder. The filter is exact: a rung's label is a bare numeral,
 * while the factor labels are `\times 4` and the question carries `\log`.
 */
function ladderRungs(host: HTMLElement): string[] {
  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("no ladder svg");
  }
  return Array.from(svg.querySelectorAll("[data-latex]"))
    .map((node) => node.getAttribute("data-latex") ?? "")
    .filter((latex) => /^\d+$/.test(latex));
}

function arrowheads(host: HTMLElement): SVGPathElement[] {
  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("no ladder svg");
  }
  return Array.from(svg.querySelectorAll<SVGPathElement>("[data-ladder-arrowhead]"));
}

test("LogEvaluateStepper heads every arc between rungs, so the climb has a direction", async () => {
  h = mount(<LogEvaluateStepper />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the ladder mounts",
  );

  // One rung is not a step, so there is no gap to bridge and nothing to point.
  climb(host).click();
  await waitFor(() => ladderRungs(host).length === 1, "one factor lands");
  expect(ladderRungs(host)).toEqual(["4"]);
  expect(arrowheads(host)).toHaveLength(0);

  climb(host).click();
  climb(host).click();
  climb(host).click();
  await waitFor(() => ladderRungs(host).length === 4, "the ladder grows");

  const rungs = ladderRungs(host);
  // A floor, or `rungs - 1` is satisfied by an empty ladder pointing nothing at nothing.
  expect(rungs.length, "the ladder drew fewer rungs than the climb applied").toBe(4);
  expect(rungs).toEqual(["4", "16", "64", "256"]);

  const heads = arrowheads(host);
  expect(heads, "every gap between rungs owes exactly one arrowhead").toHaveLength(
    rungs.length - 1,
  );

  // A `<path>` counted as an arrowhead has to be one: a closed triangle whose tip sits on
  // the end of an arc, which is what makes it read as tangent to the curve it terminates.
  const arcs = Array.from(
    (host.querySelector("svg") as SVGSVGElement).querySelectorAll<SVGPathElement>(
      "[data-ladder-arc]",
    ),
  );
  expect(arcs).toHaveLength(heads.length);
  for (const head of heads) {
    const d = head.getAttribute("d") ?? "";
    const triangle = /^M ([\d.-]+) ([\d.-]+) L [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+ Z$/.exec(
      d,
    );
    expect(triangle, `arrowhead is not a closed triangle: ${d}`).not.toBeNull();
    const tip = `${triangle?.[1]} ${triangle?.[2]}`;
    const landsOnAnArc = arcs.some((arc) => (arc.getAttribute("d") ?? "").endsWith(tip));
    expect(landsOnAnArc, `arrowhead tip ${tip} sits on no arc end`).toBe(true);
  }
});

test("LogEvaluateStepper gates on the exponent and then on the argument", async () => {
  let completed = 0;
  h = mount(<LogEvaluateStepper onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the ladder mounts",
  );

  // 256 is the number inside the logarithm, and answering with it rather than with the count
  // of factors is the whole misconception the ladder is built against.
  setInputValue(entry(host), "256");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "count the rungs"),
    "the argument is refused as the value",
  );
  expect(completed).toBe(0);

  setInputValue(entry(host), "4");
  findButton(host, "Check").click();
  // Stage one answered, and the gate has NOT opened: the widget owes a second question.
  await waitFor(() => hasMath(host, "\\log_{4} y = 2"), "stage two is put");
  expect(completed, "stage one alone opened the gate").toBe(0);

  // Stage two asks for the argument, and the exponent that was just produced is not it.
  setInputValue(entry(host), "4");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "read off the rung"),
    "the exponent is refused as the argument",
  );
  expect(completed).toBe(0);

  setInputValue(entry(host), "16");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "both answers together open the gate");
  expect(hasMath(host, "\\log_{4} 256 = 4")).toBe(true);
  expect(hasMath(host, "y = 16")).toBe(true);
});

test("LogEvaluateStepper's first reveal hands the board back rather than the gate", async () => {
  let completed = 0;
  h = mount(<LogEvaluateStepper onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the ladder mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "256");
  findButton(host, "Check").click();
  // The label names what is being revealed, because "Reveal answer" is ambiguous on a widget
  // that asks two different questions off one board.
  await waitFor(() => hasText(host, "Reveal the value"), "stage one offers its own reveal");
  expect(completed).toBe(0);
});
