import { TRG4_HEADINGS, TRG4_IDENTITY_LINES } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkedSolution } from "../WorkedSolution";

/**
 * Two TRG.4 reveals have to show the learner the item in front of them, and each fails that
 * in its own way if nobody watches.
 *
 * The identity-naming figure took `family` and nothing else. `family` is the ANSWER, so every
 * draw keyed to the same family rendered a byte-identical picture: twelve lines reached the
 * learner as three diagrams, none of which contained their own problem. It is a worse defect
 * there than it would be on an arithmetic template, because sorting a line by its shape is a
 * claim ABOUT that line, and with the line absent the marked card is a statement about the
 * three cards in general.
 *
 * The compound figure has four moving parts — the triple, which reading was given, the
 * quadrant and the product's shape — and three of them change the SIGN of a number the figure
 * prints while leaving the picture recognisably the same. So the value it closes on is checked
 * against arithmetic done here rather than against the figure's own helper: the reveal is
 * asked what it printed, and the answer is worked out a second time from the definitions.
 *
 * Both are asserted against the rendered DOM rather than against the registry source, because
 * `WorkedSolution` renders the registered figure INSTEAD of the step array whenever one is
 * registered, and one is: a guard reading the step array would be reading a string these
 * templates never show.
 */

/** What KaTeX leaves in the text layer for each function name a line can carry. */
const SPELLED: readonly [RegExp, string][] = [
  [/\\sin/, "sin"],
  [/\\cos/, "cos"],
  [/\\tan/, "tan"],
  [/\\cot/, "cot"],
  [/\\sec/, "sec"],
  [/\\csc/, "csc"],
];

interface Figure {
  markup: string;
  text: string;
  /** Every LaTeX string the figure handed to KaTeX, which is what its rows really say. */
  latex: string[];
}

function figureOf(templateId: string, params: Record<string, number>): Figure {
  const { container } = render(
    <WorkedSolution templateId={templateId} params={params} steps={[]} />,
  );
  const figure = container.querySelector("figure.lesson-visual");
  expect(
    figure,
    `${templateId} ${JSON.stringify(params)} renders the registered figure`,
  ).not.toBeNull();
  expect(container.querySelector(".worked-solution__steps")).toBeNull();
  const svg = figure?.querySelector("svg");
  return {
    markup: svg?.innerHTML ?? "",
    text: figure?.textContent ?? "",
    latex: Array.from(svg?.querySelectorAll("[data-latex]") ?? []).map(
      (node) => node.getAttribute("data-latex") ?? "",
    ),
  };
}

describe("the TRG.4 identity-naming reveal draws the learner's own line", () => {
  const drawn = TRG4_IDENTITY_LINES.map((entry, line) => ({
    line,
    entry,
    figure: figureOf("d9.trg4.identity-name.l2", { line, family: entry.family }),
  }));

  it("sweeps the item bank's whole table, so no line is left unmeasured", () => {
    expect(
      drawn.length,
      "the identity table resolved to nothing, so the assertions below render no line at all",
    ).toBeGreaterThanOrEqual(11);
    // Composition, not just size: three families, each deep enough that a picture shared
    // across a family would be shared across several draws.
    for (const family of [0, 1, 2]) {
      expect(
        drawn.filter((item) => item.entry.family === family).length,
        `family ${family} contributes more than one line, so a family-keyed figure repeats`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("renders a different picture for every line, not one per family", () => {
    const pictures = new Set(drawn.map((item) => item.figure.markup));
    expect(
      pictures.size,
      `${drawn.length} lines render only ${pictures.size} distinct figures, so a learner is shown a diagram of somebody else's line`,
    ).toBe(drawn.length);
  });

  it("spells the functions of the learner's own line inside the figure", () => {
    for (const { line, entry, figure } of drawn) {
      const wanted = SPELLED.filter(([pattern]) => pattern.test(entry.latex)).map(
        ([, spelled]) => spelled,
      );
      expect(
        wanted.length,
        `line ${line} names at least one function`,
      ).toBeGreaterThanOrEqual(1);
      for (const spelled of wanted) {
        expect(
          figure.text,
          `the figure for ${entry.latex} never spells ${spelled}, so it is not a picture of that line`,
        ).toContain(spelled);
      }
    }
  });

  it("still marks the family the line belongs to", () => {
    for (const { entry, figure } of drawn) {
      const name = ["Pythagorean", "quotient", "reciprocal"][entry.family] as string;
      expect(figure.text, entry.latex).toContain(name);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The compound evaluation                                                     */
/* -------------------------------------------------------------------------- */

const COMPOUND_ID = "d9.trg4.compound-evaluate.l3";

/** The quadrants the template draws from: never the first, so a sign is always live. */
const QUADRANTS = [2, 3, 4] as const;

/**
 * The value each product really has, worked out from the definitions rather than from the
 * figure's own table.
 *
 * Floating point on purpose. The point of this arm is to be a SECOND opinion on the number the
 * reveal prints, and reusing the module's `reading` helper would only prove the figure agrees
 * with itself; the four expressions are short enough to write out, and a ratio compared to
 * twelve decimal places settles it either way.
 */
function compoundValue(shape: number, sine: number, cosine: number): number {
  switch (shape) {
    case 0:
      return -sine * (1 / cosine);
    case 1:
      return cosine * (1 / sine);
    case 2:
      return -(sine / cosine) * (1 / sine);
    default:
      return (1 / cosine) * sine;
  }
}

/**
 * The closing row: `<single function> = <signed fraction>`, which is the graded answer.
 *
 * Scoped to the four functions a product can COLLAPSE to, which is what keeps it off the
 * recovery row. `\cos\theta = -\dfrac{5}{13}` has the identical shape and is a different
 * claim, so a pattern spelt over all six would match two rows and read the wrong one.
 */
const CLOSING = /^(-?)\\(tan|cot|sec|csc)\\theta = (-?)\\dfrac\{(\d+)\}\{(\d+)\}$/;

function closingValue(figure: Figure, where: string): number {
  const rows = figure.latex.filter((latex) => CLOSING.test(latex));
  expect(rows.length, `${where} closes on exactly one single-function row`).toBe(1);
  const match = CLOSING.exec(rows[0] as string) as RegExpExecArray;
  const sign = match[3] === "-" ? -1 : 1;
  return (sign * Number(match[4])) / Number(match[5]);
}

interface Draw {
  where: string;
  params: { triple: number; givenSine: number; quadrant: number; shape: number };
  sine: number;
  cosine: number;
}

function drawsAt(triple: number): Draw[] {
  const entry = TRG4_HEADINGS[triple] as (typeof TRG4_HEADINGS)[number];
  const draws: Draw[] = [];
  for (const quadrant of QUADRANTS) {
    for (const givenSine of [0, 1]) {
      for (const shape of [0, 1, 2, 3]) {
        draws.push({
          where: `triple ${triple} q${quadrant} given${givenSine} shape ${shape}`,
          params: { triple, givenSine, quadrant, shape },
          sine: ((quadrant === 3 || quadrant === 4 ? -1 : 1) * entry.a) / entry.c,
          cosine: ((quadrant === 2 || quadrant === 3 ? -1 : 1) * entry.b) / entry.c,
        });
      }
    }
  }
  return draws;
}

describe("the TRG.4 compound reveal prints the value the product really has", () => {
  /**
   * The population is the full cross of the three axes that change what the figure SAYS, taken
   * at three headings, plus one draw of every heading in the table so no triple goes unrendered.
   *
   * Three headings rather than fourteen because the cross is what carries the claim and the
   * triples only change which numbers ride it: `0` is the shallow 3-4-5, `3` is the worked
   * example the shape was authored from, and `11` is the steep 9-40-41, whose point sits within
   * a label's height of the horizontal axis.
   */
  const CROSSED = [0, 3, 11];
  const crossDraws = CROSSED.flatMap(drawsAt);
  const everyTriple = TRG4_HEADINGS.map((_entry, triple) => drawsAt(triple)[0] as Draw);
  const draws = [
    ...crossDraws,
    ...everyTriple.filter((draw) => !CROSSED.includes(draw.params.triple)),
  ];
  const rendered = draws.map((draw) => ({
    ...draw,
    figure: figureOf(COMPOUND_ID, draw.params),
  }));

  /**
   * The heading table is now the item bank's own, imported rather than copied, so the class of
   * defect this originally guarded — a mirror drifting off the original — cannot arise.
   *
   * The assertions stay, and they are not vestigial: they no longer compare two tables but hold
   * the ONE table to the properties the figure relies on. Every row prints a fraction with no
   * reduction step, which is only honest while each triple is primitive; and `triple` is drawn
   * over both orientations, which is only true while each appears twice. Either could be broken
   * by an edit on the item-bank side that looked entirely reasonable there.
   */
  it("indexes a table of fourteen primitive triples, each in both orientations", () => {
    expect(TRG4_HEADINGS.length, "the heading table is not fourteen entries").toBe(14);
    for (const { a, b, c } of TRG4_HEADINGS) {
      expect(a * a + b * b, `${a}-${b}-${c} does not close`).toBe(c * c);
      expect(
        TRG4_HEADINGS.some((other) => other.a === b && other.b === a && other.c === c),
        `${a}-${b}-${c} is in the table without its other orientation`,
      ).toBe(true);
    }
    // Primitive is the item bank's own requirement, and it is what lets every row here print a
    // fraction with no reduction step: a shared factor would make the figure claim one.
    const divisor = (x: number, y: number): number => (y === 0 ? x : divisor(y, x % y));
    for (const { a, b, c } of TRG4_HEADINGS) {
      expect(divisor(divisor(a, b), c), `${a}-${b}-${c} is not primitive`).toBe(1);
    }
  });

  it("sweeps every shape, every quadrant, both givens and every heading", () => {
    // Floors under the population, so the claims below cannot pass over an empty sweep, and a
    // COMPOSITION beside them: a cross that collapsed onto one shape or one quadrant would
    // still clear a bare count while measuring none of the decisions this template is about.
    expect(rendered.length, "no compound draw rendered").toBeGreaterThanOrEqual(83);
    for (const shape of [0, 1, 2, 3]) {
      expect(
        rendered.filter((draw) => draw.params.shape === shape).length,
        `shape ${shape} is never drawn`,
      ).toBeGreaterThanOrEqual(6);
    }
    for (const quadrant of QUADRANTS) {
      expect(
        rendered.filter((draw) => draw.params.quadrant === quadrant).length,
        `Quadrant ${quadrant} is never drawn`,
      ).toBeGreaterThanOrEqual(8);
    }
    expect(
      new Set(rendered.map((draw) => draw.params.triple)).size,
      "some heading in the table is never rendered",
    ).toBe(TRG4_HEADINGS.length);
  });

  it("closes on the value the product really has, at every draw", () => {
    for (const { where, params, sine, cosine, figure } of rendered) {
      expect(closingValue(figure, where), where).toBeCloseTo(
        compoundValue(params.shape, sine, cosine),
        12,
      );
    }
  });

  it("shows the reading the learner was NOT given, signed by the quadrant", () => {
    for (const { where, params, sine, cosine, figure } of rendered) {
      const missing = params.givenSine === 1 ? cosine : sine;
      const symbol = params.givenSine === 1 ? "\\cos" : "\\sin";
      const wanted = missing < 0 ? `-\\dfrac` : "\\dfrac";
      const recovery = figure.latex.find((latex) =>
        latex.startsWith(`${symbol}\\theta = `),
      );
      expect(recovery, `${where} never states the recovered reading`).toBeDefined();
      expect(
        recovery ?? "",
        `${where} gives the recovered ${symbol} the wrong sign for its quadrant`,
      ).toContain(`= ${wanted}`);
    }
  });

  it("writes the first factor at the reversed heading, and flips it only when it is odd", () => {
    // The parity decision, read off the row that makes it. `\cos` and `\sec` come back
    // unchanged; the other four carry a minus. A figure that applied the flip to all four
    // shapes would still close on the right number for two of them, because two of these
    // products are negated twice over.
    const EVEN = ["\\cos", "\\sec"];
    for (const { where, figure } of rendered) {
      const collapse = figure.latex.find((latex) => latex.includes("(-\\theta)"));
      expect(collapse, `${where} never writes the reversed heading`).toBeDefined();
      const row = collapse ?? "";
      const first = row.slice(0, row.indexOf("(-\\theta)"));
      const flipped = (row.split(" = ")[1] ?? "").startsWith("-");
      expect(
        flipped,
        `${where} writes ${first}(-theta) and ${flipped ? "flips" : "does not flip"} it`,
      ).toBe(!EVEN.includes(first));
    }
  });

  it("draws a different picture for every shape and every quadrant", () => {
    // The three decisions again, as a claim about the PICTURE rather than about a row: a
    // figure keyed on too little of its params renders the same diagram for draws whose
    // answers differ, which is exactly what the identity-naming figure above used to do.
    for (const triple of CROSSED) {
      for (const givenSine of [0, 1]) {
        const family = rendered.filter(
          (draw) => draw.params.triple === triple && draw.params.givenSine === givenSine,
        );
        expect(family.length, `triple ${triple} given ${givenSine}`).toBe(12);
        expect(
          new Set(family.map((draw) => draw.figure.markup)).size,
          `triple ${triple} given ${givenSine} renders one picture for several shapes or quadrants`,
        ).toBe(family.length);
      }
    }
  });
});
