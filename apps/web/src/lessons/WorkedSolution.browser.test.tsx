/**
 * Worked-solution diagrams in a real browser.
 *
 * The jsdom guard (`visualsMath.test.tsx`) covers every registered template, but jsdom has
 * no layout: it cannot tell a typeset `\dfrac` from a collapsed `foreignObject`. These
 * cases mount the archetypes most likely to break that way — the four-row fraction
 * reduction (stacked fractions, the tallest content in any diagram) and the unit rate
 * (`\text{}` units and an escaped `\$` inside a fraction) — and check the math actually
 * occupies space inside the SVG.
 *
 * D8's three are here for the same reason and each is a different way of failing. Change of
 * base is a fraction whose numerator and denominator are both six-decimal readings, so it is
 * the widest stack in the tree and the one most likely to be squeezed flat. The exponential
 * quadratic is built out of `\left...\right` delimiters, which KaTeX SIZES to their contents
 * rather than drawing as glyphs, so a collapse there prints a bracket of no height around a
 * squared power. And the extraneous-root figure draws its rejection as an SVG rule THROUGH
 * the math, whose position is computed from an estimate of the ink: that estimate is a claim
 * about where the glyphs actually landed, it is right or wrong only in a browser, and a
 * rejection nobody can see is carried by the red alone.
 *
 * D3's two are the first cases here from a domain that, until this round, no figure sweep in the
 * tree rendered at all: `practiceSweep.ts` carried it as a named entry in `NOT_SWEPT_HERE`, and a
 * Unicode `\u00d7` injected into one of its figures left 844 tests passing. Its two are chosen the
 * same way the others were, by how they can fail rather than by which node they belong to. The
 * literal-equation column stacks a display fraction directly under a plain row, and its own module
 * records having drawn the numerator INTO the line above once already, which is a claim about ink
 * that jsdom's zero-height boxes cannot check. The number line is the other direction: `SvgMath`
 * boxes are `overflow: visible`, so a statement wider than the box it is given does not clip or
 * wrap — it paints out over the edge of the figure, and only a browser knows how wide the glyphs
 * came out.
 *
 * D10's two are that domain's notation-carrying pair, and both fail in ways that leave a
 * PLAUSIBLE picture behind rather than an obviously broken one, which is what makes them worth
 * a browser. `\sqrt` is not a glyph: KaTeX draws the hook and the bar over the radicand as one
 * stretched SVG whose width comes from the stylesheet, so a collapse leaves the radicand
 * sitting beside a tick rather than under a bar, and the text content is the same either way.
 * The exponent is worse, because a collapse there is silently FALSE: `${w}^{2}` has identical
 * `textContent` whether the 2 is raised or inline, so a flattened superscript reads as a
 * different number entirely and no text sweep anywhere can tell.
 */

import {
  D1_PRACTICE_POOL,
  D3_PRACTICE_POOL,
  D5_PRACTICE_POOL,
  D8_PRACTICE_POOL,
  D10_PRACTICE_POOL,
} from "@cr/item-bank";
import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, mount, waitFor } from "./testHarness";
import { WorkedSolution } from "./WorkedSolution";

import "../styles.css";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function itemFor(templateId: string) {
  const item = [
    ...D1_PRACTICE_POOL,
    ...D3_PRACTICE_POOL,
    ...D5_PRACTICE_POOL,
    ...D8_PRACTICE_POOL,
    ...D10_PRACTICE_POOL,
  ].find((i) => i.template_id === templateId);
  if (!item) {
    throw new Error(`no pooled item for ${templateId}`);
  }
  return item;
}

/**
 * Wait until every diagram box has TYPESET, not merely mounted.
 *
 * `useKatex` typesets in an effect, so the `<figure>` and its `<foreignObject>`s land one
 * commit BEFORE any `.katex` exists. Waiting on the figure is therefore satisfied by a
 * diagram with no maths in it at all, and every measurement in this file is of maths. That
 * is not theoretical: on a two-core runner sharing a browser with the WebGL suites the poll
 * lands in that window, and `expectLaidOut` reports
 * `d8.el5.change-base-value.l3: a foreignObject rendered no KaTeX` over a figure that was
 * about to be perfectly fine. `workedFigureLabels.browser.test.tsx` records the same defect
 * against the same component and settles it the same way.
 *
 * The count is the floor, and it is load-bearing rather than decorative: `every` is TRUE of
 * an empty list, so without it this returns immediately on a host that has not rendered a
 * single box — which is the emptiness the wait exists to rule out.
 */
async function waitForTypeset(host: HTMLElement, label: string): Promise<void> {
  await waitFor(() => {
    const boxes = Array.from(host.querySelectorAll("svg foreignObject"));
    return boxes.length > 0 && boxes.every((box) => box.querySelector(".katex") !== null);
  }, `${label}: every diagram box typesets its maths`);
}

async function mountWorked(templateId: string): Promise<HTMLElement> {
  const item = itemFor(templateId);
  h = mount(
    <WorkedSolution
      templateId={item.template_id}
      params={item.template_params}
      steps={item.worked_solution}
    />,
  );
  const { host } = h;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, "figure mounts");
  await waitForTypeset(host, templateId);
  return host;
}

/** Every KaTeX node inside the diagram renders with real width and height. */
function expectLaidOut(host: HTMLElement, label: string): void {
  const boxes = Array.from(host.querySelectorAll("svg foreignObject"));
  expect(boxes.length, `${label}: diagram has math`).toBeGreaterThan(0);
  for (const box of boxes) {
    const katex = box.querySelector<HTMLElement>(".katex");
    if (!katex) {
      throw new Error(`${label}: a foreignObject rendered no KaTeX`);
    }
    const rect = katex.getBoundingClientRect();
    expect(rect.width, `${label}: math has width`).toBeGreaterThan(0);
    expect(rect.height, `${label}: math has height`).toBeGreaterThan(0);
  }
}

test("the fraction reduction lays out its stacked fractions inside the SVG", async () => {
  const host = await mountWorked("d1.num-f.l3");
  expectLaidOut(host, "d1.num-f.l3");
  expect(hasMath(host, "\\div"), "the divide step is typeset").toBe(true);
  expect(hasMath(host, "\\dfrac"), "the fractions are stacked").toBe(true);
});

test("the unit rate lays out its \\text units and escaped dollar", async () => {
  const host = await mountWorked("d1.num-5.l3");
  expectLaidOut(host, "d1.num-5.l3");
  expect(hasMath(host, "\\text{"), "the unit words are typeset").toBe(true);
  expect(hasMath(host, "\\$"), "the dollar sign survives into KaTeX").toBe(true);
});

/**
 * `\neq` is not a glyph: KaTeX overlays a zero-width slash on an `=` using its horizontal-lap
 * spans, and the lap only collapses when the class names the renderer emits are the ones the
 * app's single KaTeX stylesheet styles. The diagram and the caption go through two different
 * KaTeX copies (`svgKit` imports `katex` directly, the caption goes through `rehype-katex`),
 * so a version split between them prints the restriction as a slash NEXT TO an equals sign.
 */
test("a rational restriction overlays its not-equals in both the diagram and the caption", async () => {
  const host = await mountWorked("d5.rat3.factorlcd.l3");
  const caption = host.querySelector<HTMLElement>("figcaption");
  if (!caption) {
    throw new Error("worked solution rendered no caption");
  }
  await waitFor(() => caption.querySelector(".katex") !== null, "caption math typesets");

  const diagramLaps = Array.from(host.querySelectorAll<HTMLElement>("svg .rlap"));
  const captionLaps = Array.from(caption.querySelectorAll<HTMLElement>(".rlap"));
  expect(diagramLaps.length, "the diagram states a restriction").toBeGreaterThan(0);
  expect(captionLaps.length, "the caption states a restriction").toBeGreaterThan(0);
  for (const lap of [...diagramLaps, ...captionLaps]) {
    expect(lap.getBoundingClientRect().width, "the slash sits ON the equals sign").toBe(0);
  }
});

/** The laid-out KaTeX of the first diagram row whose LaTeX contains `latex`. */
function mathBox(host: HTMLElement, latex: string): HTMLElement {
  const row = Array.from(host.querySelectorAll("svg [data-latex]")).find((node) =>
    (node.getAttribute("data-latex") ?? "").includes(latex),
  );
  const katex = row?.querySelector<HTMLElement>(".katex");
  if (!katex) {
    throw new Error(`no laid-out diagram row holding ${latex}`);
  }
  return katex;
}

test("change of base stacks its two readings rather than flattening them", async () => {
  const host = await mountWorked("d8.el5.change-base-value.l3");
  expectLaidOut(host, "d8.el5.change-base-value.l3");
  expect(hasMath(host, "\\dfrac"), "the two readings are stacked").toBe(true);

  // Reading the wrong one of the two as the numerator is the whole mistake this figure
  // exists to head off, and it can only do that job while they are one above the other. A
  // \dfrac that collapses is exactly as tall as an ordinary row and reads as a slash. So
  // every fraction it draws — the rule, and the substitution into it twice over — is checked
  // for a rule with room on BOTH sides of it, which is what a collapsed stack loses.
  const fractions = Array.from(host.querySelectorAll<HTMLElement>("svg .mfrac"));
  expect(
    fractions.length,
    "the diagram drew no fraction, so there is nothing stacked to measure",
  ).toBeGreaterThanOrEqual(3);
  for (const fraction of fractions) {
    const bar = fraction.querySelector<HTMLElement>(".frac-line");
    if (!bar) {
      throw new Error("a fraction rendered without its rule");
    }
    const box = fraction.getBoundingClientRect();
    const rule = bar.getBoundingClientRect();
    expect(rule.width, "the fraction's rule has no length").toBeGreaterThan(0);
    expect(
      (rule.top - box.top) / box.height,
      "nothing is sitting above the rule",
    ).toBeGreaterThan(0.25);
    expect(
      (box.bottom - rule.bottom) / box.height,
      "nothing is sitting below the rule",
    ).toBeGreaterThan(0.25);
  }
});

test("the exponential quadratic sizes the delimiters it states its answer in", async () => {
  const host = await mountWorked("d8.el6.exp-quadratic.l3");
  expectLaidOut(host, "d8.el6.exp-quadratic.l3");
  expect(hasMath(host, "\\left\\{"), "the answer is stated as a set").toBe(true);

  // `\left...\right` is not a glyph: KaTeX builds each fence to the height of what it holds,
  // out of the same stylesheet-dependent spans as the `\neq` lap above. A fence that comes
  // out with no box prints a set of two logarithms with nothing around it.
  const fences = Array.from(
    mathBox(host, "\\left\\{").querySelectorAll<HTMLElement>(".mopen, .mclose"),
  );
  expect(fences.length, "the set braces render as delimiters").toBeGreaterThanOrEqual(2);
  for (const fence of fences) {
    const rect = fence.getBoundingClientRect();
    expect(rect.width, "a delimiter has width").toBeGreaterThan(0);
    expect(rect.height, "a delimiter has height").toBeGreaterThan(0);
  }
});

test("the refused root is struck through the math it refuses", async () => {
  const host = await mountWorked("d8.el6.extraneous.l3");
  expectLaidOut(host, "d8.el6.extraneous.l3");

  const strikes = Array.from(
    host.querySelectorAll<SVGLineElement>("svg line[data-strike]"),
  );
  expect(strikes.length, "both refused arguments are struck").toBeGreaterThanOrEqual(2);
  for (const strike of strikes) {
    const rule = strike.getBoundingClientRect();
    const math = strike.parentElement?.querySelector<HTMLElement>(".katex");
    if (!math) {
      throw new Error("a rule was drawn through nothing");
    }
    const ink = math.getBoundingClientRect();
    // The rule's length is ESTIMATED from the LaTeX rather than measured, so where it lands
    // relative to the glyphs is a fact only a browser holds. It has to cross them: a rule
    // floating above the line, or reaching a third of the way across it, leaves the
    // rejection to the red, which is the one thing this figure's own header rules out.
    expect(rule.top, "the rule sits above the math it strikes").toBeGreaterThan(ink.top);
    expect(rule.bottom, "the rule sits below the math it strikes").toBeLessThan(ink.bottom);
    const covered = Math.min(rule.right, ink.right) - Math.max(rule.left, ink.left);
    expect(
      covered / ink.width,
      "the rule crosses only part of the argument it refuses",
    ).toBeGreaterThan(0.9);
  }
});

test("the literal-equation column stacks the fraction it rearranges the rule into", async () => {
  const host = await mountWorked("d3.lin3.kerb-width.l1");
  expectLaidOut(host, "d3.lin3.kerb-width.l1");
  expect(hasMath(host, "\\dfrac"), "the rearranged rule is a fraction").toBe(true);

  // The whole teaching of this figure is that the rule above the divider was re-pointed without
  // any measurement, and the re-pointed rule IS the fraction. A `\dfrac` that comes out flat
  // reads as `P - 2l/2`, which is a different and false rule, and it is exactly as tall as an
  // ordinary row, so nothing outside a browser can tell the two apart.
  const fractions = Array.from(host.querySelectorAll<HTMLElement>("svg .mfrac"));
  expect(
    fractions.length,
    "the figure drew no fraction, so there is nothing stacked to measure",
  ).toBeGreaterThanOrEqual(2);
  for (const fraction of fractions) {
    const bar = fraction.querySelector<HTMLElement>(".frac-line");
    if (!bar) {
      throw new Error("a fraction rendered without its rule");
    }
    const box = fraction.getBoundingClientRect();
    const rule = bar.getBoundingClientRect();
    expect(rule.width, "the fraction's rule has no length").toBeGreaterThan(0);
    expect(
      (rule.top - box.top) / box.height,
      "nothing is sitting above the rule",
    ).toBeGreaterThan(0.25);
    expect(
      (box.bottom - rule.bottom) / box.height,
      "nothing is sitting below the rule",
    ).toBeGreaterThan(0.25);
  }
});

/**
 * The widest statement any D3 number line carries stays inside the figure that draws it.
 *
 * `SvgMath` puts its KaTeX in a `foreignObject` with `overflow: visible` (`svgKit.tsx`), which is
 * deliberate — a roomy box that never clips means no label needs a measurement pass — and it is
 * also what makes this failure silent. A row wider than the 420 user units it is given does not
 * wrap and does not clip: it paints straight out past the edge of the SVG, over whatever the
 * reveal panel has beside it. `d3.lin6.scaled-union.l3` is the longest of the twenty-five, an
 * absolute-value inequality followed by both of the branches it splits into on one line, so it is
 * the one that reaches the edge first.
 *
 * Measured as painted ink against the SVG's own painted box, because that is the claim: not that
 * the authored `w` is big enough, which is arithmetic anyone can do from the source, but that the
 * glyphs this browser produced at this font landed inside the picture.
 */
test("the widest number-line statement stays inside the figure that draws it", async () => {
  const host = await mountWorked("d3.lin6.scaled-union.l3");
  expectLaidOut(host, "d3.lin6.scaled-union.l3");

  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("the number-line figure drew no svg");
  }
  const frame = svg.getBoundingClientRect();
  const overflowing: string[] = [];
  let measured = 0;
  for (const box of Array.from(host.querySelectorAll("svg foreignObject[data-latex]"))) {
    const katex = box.querySelector<HTMLElement>(".katex");
    if (!katex) {
      throw new Error("a foreignObject rendered no KaTeX");
    }
    const ink = katex.getBoundingClientRect();
    measured += 1;
    if (ink.left < frame.left - 0.5 || ink.right > frame.right + 0.5) {
      overflowing.push(
        `${box.getAttribute("data-latex")} paints ${(frame.left - ink.left).toFixed(1)}px left and ${(ink.right - frame.right).toFixed(1)}px right of the figure`,
      );
    }
  }

  expect(
    overflowing.join("; "),
    "these rows paint outside the figure that draws them",
  ).toBe("");
  // A floor under an ABSENCE: a selector that stopped matching reports no overflow and no row.
  expect(measured, "no typeset row was measured").toBeGreaterThanOrEqual(2);
  expect(frame.width, "the figure has no width to be inside of").toBeGreaterThan(0);
});

test("the exact diagonal draws its bar all the way across the radicand", async () => {
  const host = await mountWorked("d10.geo1.exact-diagonal.l3");
  expectLaidOut(host, "d10.geo1.exact-diagonal.l3");
  expect(hasMath(host, "\\sqrt"), "the exact length is stated as a radical").toBe(true);

  // The whole difficulty of this tier is that the answer stays under a root, so the root has
  // to be drawn as one. KaTeX builds `\sqrt` out of a stretched SVG (`.hide-tail`) laid over
  // the radicand by the app's single stylesheet: when that lap fails the hook renders at its
  // natural width and the bar stops short, leaving a number beside a tick. `textContent` is
  // the same string in both cases, which is why nothing outside a browser can see it.
  const roots = Array.from(host.querySelectorAll<HTMLElement>("svg .katex .sqrt"));
  expect(
    roots.length,
    "the figure drew no radical, so there is nothing to measure a bar across",
  ).toBeGreaterThan(0);
  for (const root of roots) {
    const tail = root.querySelector<HTMLElement>(".hide-tail");
    const radicand = root.querySelector<HTMLElement>(".vlist .mord");
    if (!tail || !radicand) {
      throw new Error("a radical rendered without its surd or without a radicand");
    }
    const bar = tail.getBoundingClientRect();
    const under = radicand.getBoundingClientRect();
    expect(bar.width, "the surd has no width, so the bar is not drawn").toBeGreaterThan(0);
    expect(bar.height, "the surd has no height").toBeGreaterThan(0);
    expect(under.width, "the radicand has no ink under the bar").toBeGreaterThan(0);
    // The bar has to reach ACROSS what it covers. A radicand poking out of the right-hand end
    // is the collapse, and it reads as a root of the first digit times the rest.
    expect(
      bar.right - under.right,
      "the bar stops short of the right-hand end of the radicand",
    ).toBeGreaterThanOrEqual(-1);
    expect(
      under.left - bar.left,
      "the radicand starts left of the bar that is supposed to cover it",
    ).toBeGreaterThanOrEqual(-1);
  }
});

test("the exact cylinder volume raises its squared radius instead of printing it inline", async () => {
  const host = await mountWorked("d10.geo2.cylinder-volume-exact.l3");
  expectLaidOut(host, "d10.geo2.cylinder-volume-exact.l3");
  expect(hasMath(host, "\\pi"), "the volume is left in terms of pi").toBe(true);

  // The area row is `\pi \times r^{2} = r^2 \pi`, and the exponent is the one piece of it that
  // can come out WRONG rather than merely ugly: KaTeX raises the 2 by positioning it inside a
  // vlist, so a collapse drops it onto the baseline and the row states a radius of seventy-two
  // where it meant seven squared. Both spellings have the same text content and the same
  // MathML, so this is a claim only a laid-out frame can settle.
  const sup = mathBox(host, "^{2}").querySelector<HTMLElement>(".msupsub");
  const base = sup?.previousElementSibling as HTMLElement | null;
  // The `.msupsub` WRAPPER is the wrong box to measure and measuring it is how this assertion
  // first got written: it is a vertical-list container that sits on the row's own baseline
  // whether or not the digit inside it was lifted, so its bottom edge is the same 88.67 in
  // both spellings. The ink is the `mtight` span the list holds.
  const ink = sup?.querySelector<HTMLElement>(".mord.mtight");
  if (!sup || !base || !ink) {
    throw new Error("the area row rendered no superscript ink over a base");
  }
  const exponent = ink.getBoundingClientRect();
  const radius = base.getBoundingClientRect();
  expect(exponent.width, "the exponent has no ink").toBeGreaterThan(0);
  expect(radius.height, "the base has no ink").toBeGreaterThan(0);
  // Raised, not merely present. Measured both ways in this browser: laid out, the 2 clears the
  // base's foot by 5.7px against its own 9.7px of height; with KaTeX's vertical lists put back
  // in normal flow the two share one line box exactly, so the lift is 0.0px and the 2 is set at
  // the base's own size. Either number alone is the false reading of seventy-two.
  expect(
    radius.bottom - exponent.bottom,
    "the exponent sits on the base's own baseline, so the row reads as one longer number",
  ).toBeGreaterThan(exponent.height * 0.4);
  expect(
    exponent.height,
    "the exponent is set at full size beside its base rather than as a power",
  ).toBeLessThan(radius.height);

  // And pi is a rendered glyph rather than the two letters the learner is asked to TYPE.
  const pi = Array.from(host.querySelectorAll<HTMLElement>("svg .katex .mord")).find(
    (node) => (node.textContent ?? "").includes("\u03c0"),
  );
  if (!pi) {
    throw new Error(
      "no typeset pi in a figure whose whole answer is written in terms of it",
    );
  }
  const glyph = pi.getBoundingClientRect();
  expect(glyph.width, "pi has no width").toBeGreaterThan(0);
  expect(glyph.height, "pi has no height").toBeGreaterThan(0);
});

test("the caption typesets its math through LessonProse", async () => {
  const host = await mountWorked("d1.num-f.l3");
  const caption = host.querySelector<HTMLElement>("figcaption");
  if (!caption) {
    throw new Error("worked solution rendered no caption");
  }
  await waitFor(() => caption.querySelector(".katex") !== null, "caption math typesets");
});

/** A theme token as the browser resolves it, for comparing against typeset math colour. */
function token(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

test("order-of-operations figures tint operators by PEMDAS tier, not the text-card override", async () => {
  h = mount(
    <WorkedSolution
      templateId="d1.num-2.l2"
      params={{ a: 6, b: 3, c: 5, e: 9, op: 1 }}
      steps={[]}
    />,
  );
  const { host } = h;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, "figure mounts");
  // This one mounts its own figure rather than going through `mountWorked`, and it reads the
  // colour off typeset `.mbin` spans, so it owes the same wait. Untypeset, its operators are
  // simply absent and it fails as "the multiply step tints its operator civic green" — a
  // colour complaint about maths that was never there.
  await waitForTypeset(host, "d1.num-2.l2");

  const civic = token("--civic");
  const brick = token("--brick");
  const ink = token("--ink");

  const civicMbins = Array.from(
    host.querySelectorAll<HTMLElement>("svg .katex .mbin"),
  ).filter((el) => getComputedStyle(el).color === civic);
  expect(
    civicMbins.length,
    "the multiply step tints its operator civic green",
  ).toBeGreaterThan(0);
  expect(
    civicMbins.some((el) => getComputedStyle(el).color !== brick),
    "muldiv operators are not forced to brick",
  ).toBe(true);

  const addRow = Array.from(host.querySelectorAll<HTMLElement>("svg foreignObject")).find(
    (row) => row.dataset.latex?.includes("6 + 15"),
  );
  if (!addRow) {
    throw new Error("add/subtract step row not found");
  }
  const inkMbins = Array.from(addRow.querySelectorAll<HTMLElement>(".katex .mbin")).filter(
    (el) => getComputedStyle(el).color === ink,
  );
  expect(
    inkMbins.length,
    "the add/subtract step leaves its operators at default ink",
  ).toBeGreaterThan(0);
  expect(
    inkMbins.every((el) => getComputedStyle(el).color !== brick),
    "add/subtract operators are not forced to brick",
  ).toBe(true);
});
