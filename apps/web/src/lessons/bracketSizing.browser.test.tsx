/**
 * A BRACKET IS AT LEAST AS TALL AS THE TALL MATH IT HOLDS.
 *
 * `d4.pol4.complete.l1` shipped a `size1` bracket around a display fraction — 0.60x its own
 * contents — and a learner reported it twice before anything measured it. `visualsMath.test.tsx`
 * reads the authored STRING and can say which macro was written; the delimiter sweep in
 * `workedFigureLabels.browser.test.tsx` claims the other direction, that a bracket is not too
 * BIG. Between them the reported bracket passed every run.
 *
 * ## The population is the BEHAVIOUR, not the template that was reported
 *
 * The first version of this file swept every draw of `d4.pol4.complete.l1` and nothing else,
 * which is a population scoped by who complained. The question a population has to answer is
 * "what would have to be true of a figure for this defect to be possible there", and the
 * answer is: it draws a bracket around a fraction. So every registered worked-solution
 * template is rendered, at every draw `practiceSweep` produces, and the population is whatever
 * turns out to draw one. Measured at `9e0110dd`, that is FIVE templates across FOUR domains
 * and 116 readings — where the four figures anyone had written down by hand were the wrong
 * four: `d8EL6`'s `\left(e^{x}\right)` holds no fraction and is not in it, and D5's
 * `d5.rat4.clear.l2` and `d5.rat6.rate.l2` are, which nobody had noticed. The second of those
 * was drawing a bare `\{ \}` around a display fraction at 0.48x.
 *
 * ## Why the population cannot be derived from the source
 *
 * A literal scan is what `visualsMath.test.tsx` does, and it structurally cannot see two of
 * the five. `d1.num-f.l3b` writes `\left(${frac(a, b)} + ${frac(c, d)}\right)`, so with the
 * interpolations collapsed the literal reads `\left(1 + 1\right)` and contains no fraction at
 * all; `d5.rat6.rate.l2` reaches its brace through `acceptedRow(answerTex)`, whose literal is
 * `\{1\}`. The fraction only exists once the helper has run. So the render IS the derivation
 * here, and the composition assertions below are what keep it honest.
 *
 * ## What is measured
 *
 * PAINTED INK on both sides, via `katexInk.ts`, which sets out at length why a span's own
 * `getBoundingClientRect` cannot be used: `.mfrac`'s box is the font's ascent-plus-descent and
 * reads 21.0 units for every fraction in these figures, so a ratio against it divides by a
 * constant. The first round of this fix did exactly that and shipped a bracket half the height
 * of its contents on the strength of it.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { paintedInk } from "./katexInk";
import { everyDraw } from "./practiceSweep";
import { CITY_DESKTOP } from "./readingWidths";
import { CIVIC, LABEL, SIGNAL } from "./svgKit";
import { type Harness, mount, waitFor } from "./testHarness";
import { WorkedSolution } from "./WorkedSolution";
import { signedTex } from "./worked/d4Kit";
import { ExpressionReductionWorked, numStr, type ReductionRow } from "./workedKit";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * A SHORT, REALISTIC viewport. A frame taken on a tall developer monitor says nothing about
 * anybody's screen, and the numbers under a spatial claim are the same either way.
 */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** The template a learner reported, named so the sampling above cannot drop it silently. */
const REPORTED_ID = "d4.pol4.complete.l1";

/** The draw the complaint was made against. */
const REPORTED = { middle: 14, half: 7 };

/**
 * The template the WIDENING found, named for the same reason as the one above.
 *
 * `d5.rat6.rate.l2` closed on a bare `\{\dfrac{n}{d}\}` at 0.48x, in twelve of its thirteen
 * draws. Nobody reported it and no hand-written list of figures contained it; it is in this
 * file only because the population is derived from what the tree renders.
 */
const WIDENED_ID = "d5.rat6.rate.l2";

/** How many figures to put on screen per mount. Purely a throughput knob. */
const BATCH = 24;

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

/**
 * How short a bracket may be against the ink it encloses, as a ratio.
 *
 * NOT 1.0, and the reason is TeX rather than tolerance. `\left` sizes a delimiter to the
 * content's reserved height and depth LESS `delimiterShortfall`, then rounds up to a canned
 * size — so a correct `\left` is allowed to fall a little short of the content's ink, and over
 * a text-style fraction, where the next canned size up is a long way off, it does. Measured
 * over the whole population:
 *
 *   CORRECT    d8.el1.decay-value.l2  \left( around \tfrac ......... 0.94
 *              d5.rat4.clear.l2       \left( around \tfrac ......... 0.96
 *              d1.num-f.l3b           \left( around \dfrac ......... 1.08
 *              d4.pol4.complete.l1    \left( around \dfrac ......... 1.11
 *   DEFECTIVE  d5.rat6.rate.l2        bare \{ around \dfrac ........ 0.48
 *              (injected)             \bigl( around \dfrac ......... 0.60
 *              (injected)             \Bigl( around \dfrac ......... 0.85
 *
 * Both 0.94 and 0.96 were photographed at the viewport above and read correctly; 0.48, 0.60
 * and 0.85 were photographed and do not. 0.90 is the midpoint of the only gap in the readings,
 * and both of its sides are pinned in the injection test below rather than left to this
 * comment, so a font change that closed the gap fails there instead of going quiet.
 */
const BRACKET_OVER_CONTENT = 0.9;

/**
 * The tall constructs a bracket has to reach around.
 *
 * `.sqrt` is in the selector and contributes NOTHING today: no worked figure currently draws a
 * bracket around a radical, and that is a measurement rather than an assumption. It is listed
 * so the figure that does so tomorrow is swept on the day it lands, and it is deliberately NOT
 * given a floor of its own, because a floor over an empty set is the thing this file exists to
 * avoid.
 */
const TALL = [".mfrac", ".sqrt"] as const;

/** Zero-width or spacing spans that stand between a bracket and what it encloses. */
const NOT_A_TOKEN = new Set(["nulldelimiter", "strut", "pstrut", "mspace", "vlist-s"]);

/**
 * The opener of the bracket pair that ENCLOSES `tall`, or `null` when nothing does.
 *
 * Structural, and it has to be. The obvious rule — "the nearest sized delimiter earlier in the
 * row" — mis-pairs on the two shapes this tree actually contains. `(x + 1)\dfrac{1}{2}` would
 * pair the fraction with the `(` of a group it sits OUTSIDE, and `d1.num-f.l3b`'s
 * `\left(\dfrac{2}{5} + \dfrac{1}{2}\right) \times \dfrac{1}{3}` would pair its third fraction
 * with the CLOSING `\right)` of the group before it — a reading that happens to come out at
 * 1.11 and pass, which is worse than failing.
 *
 * So the walk is over sibling TOKENS, ascending a level when one runs out, and it stops at the
 * first delimiter it meets: an `mopen` encloses the fraction, an `mclose` means the fraction is
 * outside that pair and there is nothing to measure. Operands and operators in between are
 * walked past, which is what pairs `\dfrac{1}{2}` in the example above with the `\left(` two
 * tokens before it. KaTeX renders `\left...\right` as a `.minner` whose `.mopen.delimcenter` is
 * a sibling of the body, and a fixed size as a bare `.mopen` sibling, so both shapes fall out
 * of the same walk.
 *
 * One consequence worth knowing before it looks like a bug: KaTeX will break a line at a
 * binary operator inside a FIXED-size pair, putting the operand after it in a fresh `.base`
 * where the opener is no longer reachable, while `\left...\right` suppresses the break. So
 * injecting `\bigl(` into `\left(\dfrac{a}{b} + \dfrac{c}{d}\right)` yields one short reading
 * per draw rather than two. The defect is still reported; the second fraction genuinely is
 * outside the run of tokens the bracket opens.
 */
function enclosingOpener(tall: Element): Element | null {
  let node: Element = tall;
  while (node.parentElement !== null && !node.classList.contains("katex-html")) {
    for (
      let prev = node.previousElementSibling;
      prev !== null;
      prev = prev.previousElementSibling
    ) {
      if ([...prev.classList].some((name) => NOT_A_TOKEN.has(name))) {
        continue;
      }
      if (prev.classList.contains("mopen")) {
        // A grown delimiter is a `.delimsizing` inside the `.mopen`; a bare one IS the
        // `.mopen`. Both are measured, because a bare `(` around a display fraction is the
        // same defect arriving by a different spelling — and it is how D5 shipped one.
        return prev.querySelector(".delimsizing") ?? prev;
      }
      if (prev.classList.contains("mclose")) {
        return null;
      }
    }
    node = node.parentElement;
  }
  return null;
}

interface Reading {
  /** `template_id` plus the draw's params, so a failure names an instance. */
  readonly where: string;
  readonly templateId: string;
  readonly ratio: number;
  readonly what: string;
}

/** Every bracket-around-tall-math reading in one rendered figure. */
function bracketRatios(where: string, svg: SVGElement): Reading[] {
  const templateId = where.split(" ")[0] ?? where;
  const found: Reading[] = [];
  for (const row of Array.from(svg.querySelectorAll("foreignObject[data-latex]"))) {
    for (const selector of TALL) {
      for (const tall of Array.from(row.querySelectorAll(selector))) {
        const content = paintedInk(tall);
        if (content === null || content.height < 1) {
          continue;
        }
        const open = enclosingOpener(tall);
        if (open === null) {
          continue;
        }
        const bracket = paintedInk(open);
        if (bracket === null || bracket.height < 1) {
          continue;
        }
        found.push({
          where,
          templateId,
          ratio: bracket.height / content.height,
          what: `${open.textContent ?? "?"} around ${selector} in "${row.getAttribute("data-latex") ?? ""}" is ${bracket.height.toFixed(1)}px over ${content.height.toFixed(1)}px`,
        });
      }
    }
  }
  return found;
}

async function typesetAll(host: HTMLElement, what: string): Promise<void> {
  await waitFor(() => host.querySelector("svg") !== null, `${what} mounts`, 20_000);
  await waitFor(
    () => {
      const nodes = Array.from(host.querySelectorAll("[data-latex]"));
      return (
        nodes.length > 0 && nodes.every((entry) => entry.querySelector(".katex") !== null)
      );
    },
    `${what} typesets`,
    20_000,
  );
  await document.fonts.ready;
}

interface Sweep {
  readonly readings: Reading[];
  /** Draws that produced at least one reading. */
  readonly contributing: number;
  readonly figures: number;
}

/** Render every draw and measure every bracket any of them puts round tall math. */
async function sweep(): Promise<Sweep> {
  const draws = everyDraw();
  const readings: Reading[] = [];
  let contributing = 0;
  let figures = 0;

  for (let at = 0; at < draws.length; at += BATCH) {
    const batch = draws.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        // Keyed by the DRAW: the key has to change when the params do, or React reuses a
        // figure and the second instance is measured on the first one's layout.
        const draw = `${item.template_id} ${JSON.stringify(item.template_params)}`;
        return (
          <div
            key={draw}
            data-instance={draw}
            style={{ width: `${CITY_DESKTOP.column}px` }}
          >
            <WorkedSolution
              templateId={item.template_id}
              params={item.template_params}
              steps={[]}
            />
          </div>
        );
      }),
    );
    const host = h.host;
    await typesetAll(host, `batch at ${at}`);

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const svg = wrapper.querySelector("svg");
      if (svg === null) {
        continue;
      }
      figures += 1;
      const found = bracketRatios(wrapper.dataset.instance ?? "", svg);
      if (found.length > 0) {
        contributing += 1;
      }
      readings.push(...found);
    }

    h.cleanup();
    h = null;
  }

  return { readings, contributing, figures };
}

/* -------------------------------------------------------------------------- */
/* The checker reports the sizes that are too short                            */
/* -------------------------------------------------------------------------- */

const CANDIDATES: readonly { spelling: string; open: string; close: string }[] = [
  { spelling: "bare", open: "(", close: ")" },
  { spelling: "bigl", open: "\\bigl(", close: "\\bigr)" },
  { spelling: "Bigl", open: "\\Bigl(", close: "\\Bigr)" },
  { spelling: "biggl", open: "\\biggl(", close: "\\biggr)" },
  { spelling: "left", open: "\\left(", close: "\\right)" },
];

/** The reported figure's three rows, with the bracket spelling swapped. */
function rowsWith(open: string, close: string): ReductionRow[] {
  const { middle, half } = REPORTED;
  return [
    { tokens: [{ text: `x^{2} ${signedTex(middle)}x`, color: LABEL }] },
    {
      tokens: [
        {
          text: `${open}\\dfrac{${numStr(middle)}}{2}${close}^{2} = (${numStr(half)})^{2}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `x^{2} ${signedTex(middle)}x + ${numStr(half * half)} = (x ${signedTex(half)})^{2}`,
          color: CIVIC,
        },
      ],
    },
  ];
}

/**
 * THE INJECTION, run every time rather than done once by hand.
 *
 * A guard that only ever sees correct input is a guard nobody has watched work. This renders
 * the undersized spellings — including `\bigl(`, the exact string this figure shipped, and a
 * bare pair, the shape D5 shipped — through the same measurement the claim below uses, and
 * requires it to REPORT them. If the threshold, the pairing or `paintedInk` stops
 * discriminating, this fails here instead of blessing the next too-short bracket.
 */
test("the measurement reports the sizes that are too short for a display fraction", {
  timeout: 300_000,
}, async () => {
  const readings = new Map<string, number>();
  for (const { spelling, open, close } of CANDIDATES) {
    h = mount(
      <div style={{ width: `${CITY_DESKTOP.column}px` }}>
        <figure className="lesson-visual">
          <ExpressionReductionWorked
            rows={rowsWith(open, close)}
            ariaLabel={`${spelling} probe`}
            title={`${spelling} probe`}
          />
        </figure>
      </div>,
    );
    const host = h.host;
    await typesetAll(host, spelling);
    const svg = host.querySelector("svg");
    if (svg === null) {
      throw new Error(`${spelling} drew no svg`);
    }
    const found = bracketRatios(`probe:${spelling}`, svg);
    expect(found.length, `${spelling} produced no reading`).toBe(1);
    readings.set(spelling, (found[0] as Reading).ratio);

    // The frames the ratios stand for, one per candidate and all at the same viewport, so
    // "0.60x" and "1.11x" can be looked at rather than taken on trust. The `bigl` frame is
    // the before-and-after pair's before: it is the row exactly as it shipped.
    const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
    if (figure !== null) {
      if (CAPTURE_EVIDENCE) {
        await page.screenshot({
          element: figure,
          path: `__screenshots__/bracket-sizing/${spelling}-${VIEWPORT.width}x${VIEWPORT.height}.png`,
        });
      }
    }
    h.cleanup();
    h = null;
  }

  const at = (spelling: string): number => {
    const ratio = readings.get(spelling);
    if (ratio === undefined) {
      throw new Error(`${spelling} was never measured`);
    }
    return ratio;
  };

  // REPORTED. `bigl` is the string `d4.pol4.complete.l1` shipped and a learner called too
  // short twice; `Bigl` was the other fixed size tried in the same round; `bare` is the
  // shape `d5.rat6.rate.l2` was drawing its solution set with.
  for (const spelling of ["bare", "bigl", "Bigl"]) {
    expect(at(spelling), `${spelling} is no longer reported as too short`).toBeLessThan(
      BRACKET_OVER_CONTENT,
    );
  }

  // AND NOT REPORTED, so this has not become "reject every bracket".
  expect(at("left")).toBeGreaterThanOrEqual(BRACKET_OVER_CONTENT);
  expect(at("biggl")).toBeGreaterThanOrEqual(BRACKET_OVER_CONTENT);

  // THE GAP THE THRESHOLD SITS IN, asserted rather than described. The correct readings in
  // the live population bottom out at 0.94 and the worst accepted-here is `Bigl`; if a font
  // change ever closed that gap, 0.90 would stop separating them and this fails first.
  expect(at("left") - at("Bigl")).toBeGreaterThan(0.15);
});

/* -------------------------------------------------------------------------- */
/* The claim                                                                   */
/* -------------------------------------------------------------------------- */

test("no worked figure draws a bracket shorter than the tall math inside it", {
  timeout: 900_000,
}, async () => {
  const { readings, contributing, figures } = await sweep();

  const short = readings.filter((r) => r.ratio < BRACKET_OVER_CONTENT);
  expect(
    short.map((r) => `${r.where}: ${r.what}, ${r.ratio.toFixed(2)}x`).join("; "),
    "these brackets are shorter than what they enclose, which is what a learner sees as a paren that does not reach round its fraction",
  ).toBe("");

  /* ---- Floors under an ABSENCE ---- */

  // A run where `.mfrac` or the opener walk stopped matching reports no short bracket and no
  // bracket at all, and the two look identical from outside the assertion above. Measured at
  // the tip: 1983 figures, 116 readings, 64 draws contributing at least one. The floors are
  // set below those to survive seed churn, since they are here to catch a collapse rather
  // than to pin a count.
  expect(figures, "the sweep rendered no figures").toBeGreaterThanOrEqual(1500);
  expect(
    readings.length,
    "no bracket was measured against any tall math",
  ).toBeGreaterThanOrEqual(80);
  expect(
    contributing,
    "one draw supplied every reading, so this is a sweep over a single instance",
  ).toBeGreaterThanOrEqual(40);

  /* ---- The COMPOSITION, because a floor constrains size and not shape ---- */

  const templates = new Set(readings.map((r) => r.templateId));
  expect(
    templates.size,
    "every reading came from one template, so the population is one figure repeated",
  ).toBeGreaterThanOrEqual(5);

  // THIS SWEEP IS GENUINELY WIDER THAN THE FIGURE IT STARTED FROM. A floor of five is
  // satisfied by the reported figure plus four more of anything, including four more D4
  // shapes, so the population with the reported figure's own domain removed is counted on
  // its own — which is the property that would have caught the version of this file that
  // swept `d4.pol4.complete.l1` and nothing else.
  const beyondD4 = [...templates].filter((id) => !id.startsWith("d4."));
  expect(
    beyondD4.length,
    "the population outside the reported figure's domain is too small for this to be a tree-wide claim",
  ).toBeGreaterThanOrEqual(4);
  expect(
    new Set(beyondD4.map((id) => id.split(".")[0])).size,
    "the widening reached only one other domain",
  ).toBeGreaterThanOrEqual(3);

  // AND THE REPORTED INSTANCE IS STILL IN IT, named rather than left to the sampling. A
  // change to the seeds, the cap or the pool cannot take the figure a learner complained
  // about out of this sweep without failing here.
  const reported = readings.filter((r) => r.templateId === REPORTED_ID);
  expect(
    reported.length,
    "the reported figure is no longer in the population",
  ).toBeGreaterThanOrEqual(8);
  expect(
    reported.some((r) => r.where.includes(`"middle":${REPORTED.middle}`)),
    "the draw the complaint was made against is no longer swept",
  ).toBe(true);

  // AND SO IS THE ONE THE WIDENING FOUND. Every assertion above this point constrains the
  // population's SIZE or its spread across domains, and both are satisfied by any five
  // templates over three domains — so the population is free to DRIFT. If `d5.rat6.rate.l2`
  // stopped drawing a bracket at all, while some other figure started wrapping a fraction in
  // one, the count would still be five, the spread would still be three, `short` would still
  // be empty, and the figure this file's own commit fixed would have left the guard silently.
  // That is not hypothetical: `acceptedRow` builds this bracket, five RAT.6 templates share
  // it, and only the draws that solve to a fraction put anything tall inside it.
  const foundByWidening = readings.filter((r) => r.templateId === WIDENED_ID);
  expect(
    foundByWidening.length,
    "the figure the widening found is no longer in the population, so this guard has stopped covering the defect it fixed",
  ).toBeGreaterThanOrEqual(8);
});

/* -------------------------------------------------------------------------- */
/* The frames the spatial claims owe                                           */
/* -------------------------------------------------------------------------- */

/**
 * A ratio is a claim about boxes; "does the bracket reach round the fraction" is a claim about
 * a rendered picture, so one is taken and looked at. Framed to the whole figure rather than
 * cropped to the bracket: what has to be visible is the maths the bracket is supposed to
 * enclose, not the bracket on its own.
 *
 * Both instances, because they are two different defects at two different spellings: D4's was
 * a fixed-size `\bigl(` and D5's was a bare `\{`, and only the second was found by widening
 * the population to the behaviour.
 */
test("frames of both reported rows at the named viewport", {
  timeout: 300_000,
}, async () => {
  const shots: { id: string; params: Record<string, number> }[] = [
    { id: REPORTED_ID, params: REPORTED },
    {
      id: "d5.rat6.rate.l2",
      params:
        everyDraw().find(
          (item) =>
            item.template_id === "d5.rat6.rate.l2" && Number(item.template_params.rd) !== 1,
        )?.template_params ?? {},
    },
  ];

  for (const { id, params } of shots) {
    expect(Object.keys(params).length, `${id} has no draw to photograph`).toBeGreaterThan(
      0,
    );
    h = mount(
      <div style={{ width: `${CITY_DESKTOP.column}px` }}>
        <WorkedSolution templateId={id} params={params} steps={[]} />
      </div>,
    );
    await typesetAll(h.host, id);
    const figure = h.host.querySelector<HTMLElement>("figure.lesson-visual");
    if (figure === null) {
      throw new Error(`${id}: no figure to photograph`);
    }
    if (CAPTURE_EVIDENCE) {
      const written = await page.screenshot({
        element: figure,
        path: `__screenshots__/bracket-sizing/${id.replace(/[^a-z0-9]+/gi, "-")}-${VIEWPORT.width}x${VIEWPORT.height}.png`,
      });
      expect(written, `${id}: no frame was written`).toBeTruthy();
    }
    h.cleanup();
    h = null;
  }
});
