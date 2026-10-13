import {
  type FrozenItem,
  generateFromTemplate,
  type ItemTemplate,
  TRG9_TEMPLATES,
} from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkedSolution } from "../WorkedSolution";

/**
 * The TRG.9 pattern board rings the row the learner's own expression matches.
 *
 * The board prints three candidate patterns, one per option word, and rings one of them. Its
 * whole content is a near miss: the ringed row is *"the row you should have matched"*, so a
 * ring on a row the drawn expression does NOT match is not a cosmetic slip, it is the figure
 * asserting the wrong thing about the item the learner has just failed.
 *
 * `boardOptions` used to choose the row for the drawn word by matching the drawn shape's WORD
 * and FAMILY. The doubling word covers four of the eight shapes and three of those collapse to
 * a cosine, so on the two shapes written as a `1` and a square the first-of-word-and-family
 * search landed on $\cos^{2} A - \sin^{2} A$ and the board rang it above an expression reading
 * $1 - 2\sin^{2} 4t$. Two of eight shapes is about a quarter of this template's draws.
 *
 * ## Why the assertion is over the rendered DOM and not the module
 *
 * `WorkedSolution` renders the registered figure INSTEAD of the authored `worked_solution`
 * whenever one is registered, and one is here. So the steps array is not the learner's
 * surface, and the steps were right through the whole defect: a guard reading them would have
 * been green over exactly the draws that were broken. What is asserted below is the `rect` the
 * board paints and the `data-latex` beside it, which is what a learner is shown.
 *
 * ## Why this file rather than `workedSolutionArithmetic.test.tsx`
 *
 * That file's claim is arithmetic: an equation a figure STATES a result for, checked against
 * the result it has. This property is not arithmetic and its expressions have no values -- the
 * question is which of three printed patterns the drawn expression matches, and the answer is
 * a WORD. Filing a recognition claim in an arithmetic sweep would leave the population there
 * describing two different things. `d9TRG4.test.tsx` is the precedent that fits: the same
 * "the reveal has to show the learner their own item" claim, colocated with the figure it is
 * about, read off the rendered DOM through `WorkedSolution`.
 *
 * ## The population, and why every member owes the property
 *
 * The source of truth for what can be drawn is the item bank's `nameCases`, which is module
 * private, so the population is derived from the generator that indexes it: every distinct
 * `shape` the template emits, with the `m` and `n` it emitted it with. That is also the
 * behaviour-faithful population, since `shape` is exactly what the figure is handed.
 *
 * The EXPECTED pattern is read out of the same generated item's `worked_solution`, not out of
 * the figure's own copy of the table. The figure mirrors `nameCases` in `boardShapes` rather
 * than importing it, so comparing the figure to itself would prove only that a mirror agrees
 * with a mirror. Reading the pattern off the item bank's string makes the two tables drifting
 * apart a failure here.
 *
 * There are no exceptions to name: every shape a learner can draw is a shape whose pattern the
 * board is claiming to ring, so the exemption machinery would have nothing to excuse.
 */

const NAMING_ID = "d9.trg9.formula-name.l2";

/** How many seeds the population is drawn over. Every shape is reached well inside this. */
const SEEDS = 240;
const SEED_BASE = 9_390_000;

function namingTemplate(): ItemTemplate {
  const template = TRG9_TEMPLATES.find((candidate) => candidate.template_id === NAMING_ID);
  if (!template) {
    throw new Error(`no TRG.9 template ${NAMING_ID}`);
  }
  return template;
}

interface Draw {
  shape: number;
  m: number;
  n: number;
  params: Record<string, number>;
  /** The expression the PROMPT shows, which is the thing the learner had to match. */
  expressionTex: string;
  /** The pattern the ITEM BANK says that expression matches. */
  patternTex: string;
  /** What the item bank says it collapses to, which is what names the family. */
  collapsedTex: string;
  /** The graded answer: `sum`, `difference` or `double-angle`. */
  word: string;
}

/**
 * One capture out of a generated string, loud when the string stops having that shape.
 *
 * These parse the item bank's own prose, so a rewording there has to fail here rather than
 * quietly yield nothing and leave the comparison below trivially satisfied.
 */
function captured(pattern: RegExp, source: string, what: string): string {
  const match = pattern.exec(source);
  if (!match?.[1]) {
    throw new Error(`${NAMING_ID} no longer states ${what}: ${source}`);
  }
  return match[1];
}

function drawOf(item: FrozenItem): Draw {
  const params = item.template_params as Record<string, number>;
  const steps = item.worked_solution;
  // `answer_key` is optional on the shared answer type because a multipart item carries
  // `parts` instead. This template is a choose-one, so a missing key is a broken item and
  // not a shape this sweep should quietly tolerate.
  const word = item.answer.answer_key;
  if (word === undefined) {
    throw new Error(`${NAMING_ID} drew an item with no answer key: ${item.prompt}`);
  }
  return {
    shape: params.shape ?? -1,
    m: params.m ?? 0,
    n: params.n ?? 0,
    params,
    expressionTex: captured(
      /rewrites \$(.+?)\$ as a single/,
      item.prompt,
      "the expression in its prompt",
    ),
    patternTex: captured(
      /The pattern to match is \$(.+?)\$:/,
      steps[1] ?? "",
      "the pattern in its second worked step",
    ),
    collapsedTex: captured(
      /it collapses to \$(.+?)\$\./,
      steps[2] ?? "",
      "what it collapses to in its third worked step",
    ),
    word,
  };
}

/** Every distinct `shape:m:n` the generator emits over the seed window. */
function population(): Draw[] {
  const template = namingTemplate();
  const seen = new Set<string>();
  const draws: Draw[] = [];
  for (let seed = 0; seed < SEEDS; seed += 1) {
    const draw = drawOf(generateFromTemplate(template, "practice", SEED_BASE + seed));
    const key = `${draw.shape}:${draw.m}:${draw.n}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    draws.push(draw);
  }
  return draws;
}

interface BoardRow {
  /** The option word printed at the left of the row. */
  word: string;
  /** The pattern printed at the right of it. */
  patternTex: string;
  /** Whether this is the row the board RINGS. */
  ringed: boolean;
}

interface Board {
  rows: BoardRow[];
  /** Every LaTeX string the figure handed KaTeX, rows and headings alike. */
  latex: string[];
  markup: string;
}

/**
 * The board as it renders, read as the three option rows plus everything it typeset.
 *
 * A row is a `<g>` carrying both a word and a pattern; the ring is the `<rect>` the matching
 * row alone paints. Nothing else in this figure draws a rect, so the ring is unambiguous, and
 * a row is required to carry both halves so a future wrapper group cannot enter as a fourth.
 */
function boardOf(params: Record<string, number>): Board {
  const { container } = render(
    <WorkedSolution templateId={NAMING_ID} params={params} steps={[]} />,
  );
  const figure = container.querySelector("figure.lesson-visual");
  expect(
    figure,
    `${NAMING_ID} ${JSON.stringify(params)} renders the registered figure`,
  ).not.toBeNull();
  expect(container.querySelector(".worked-solution__steps")).toBeNull();
  const svg = figure?.querySelector("svg");
  const rows: BoardRow[] = [];
  for (const group of Array.from(svg?.querySelectorAll("g") ?? [])) {
    const word = group.querySelector("text")?.textContent?.trim() ?? "";
    const patternTex = group.querySelector("[data-latex]")?.getAttribute("data-latex");
    if (word === "" || patternTex === null || patternTex === undefined) {
      continue;
    }
    rows.push({ word, patternTex, ringed: group.querySelector("rect") !== null });
  }
  return {
    rows,
    latex: Array.from(svg?.querySelectorAll("[data-latex]") ?? []).map(
      (node) => node.getAttribute("data-latex") ?? "",
    ),
    markup: svg?.innerHTML ?? "",
  };
}

/**
 * The two shapes the defect lived in, named by what makes them special rather than by index.
 *
 * They are the doubling shapes written as a bare `1` beside a square -- $1 - 2\sin^{2} A$ and
 * $2\cos^{2} A - 1$ -- as against the doubling shape written as the difference of two squares,
 * which is the row the old search reached for all three. An index would be a fact about array
 * order, and array order can be rewritten without the population changing.
 */
function isBareOneAndSquare(draw: Draw): boolean {
  return (
    draw.word === "double-angle" &&
    draw.collapsedTex.startsWith("\\cos") &&
    draw.patternTex.includes("^{2}") &&
    /(?:^|[-+] )1(?:$| [-+])/.test(draw.patternTex)
  );
}

describe("the TRG.9 pattern board rings the row the drawn expression matches", () => {
  const draws = population();
  const boards = draws.map((draw) => ({ draw, board: boardOf(draw.params) }));
  const shapes = [...new Set(draws.map((draw) => draw.shape))].sort((a, b) => a - b);

  /**
   * The floor, and the two claims that stop the floor being all there is.
   *
   * Size alone is satisfied by any forty draws. Contiguity is what makes the derivation a
   * derivation: the shapes reached have to be `0..N-1` with no gap, so a shape the seed window
   * missed shows up as a hole rather than as a smaller sweep. And the length agreement below
   * is what stops the seed window silently going short if `nameCases` grows -- the figure falls
   * back to its first shape for an index it has no entry for, so an out-of-range index
   * rendering something OTHER than shape 0's board means the tables are longer than this
   * sweep believes and a real shape is going unmeasured.
   */
  it("derives every drawable shape from the generator, with no gap in it", () => {
    // 76 of the 80 possible `shape:m:n` combinations at 5bac81f0, over all eight shapes. The
    // floor sits well under that, because which of the ten multiplier pairs a seed lands on is
    // incidental to the property and only the eight shapes are the population.
    expect(draws.length, "the naming template drew nothing").toBeGreaterThanOrEqual(40);
    expect(shapes.length, "no distinct shapes were reached").toBeGreaterThanOrEqual(8);
    expect(
      shapes.join(","),
      `the shapes reached are not contiguous, so some shape between 0 and ${shapes.length - 1} went unswept`,
    ).toBe(shapes.map((_shape, index) => index).join(","));

    const beyond = boardOf({ shape: shapes.length, m: 4, n: 2 });
    const first = boardOf({ shape: 0, m: 4, n: 2 });
    expect(
      beyond.markup === first.markup,
      `shape ${shapes.length} renders a board of its own, so the figure knows a shape this sweep never drew`,
    ).toBe(true);
  });

  /**
   * Composition, because a floor constrains size and not shape.
   *
   * The defect lived in exactly the two doubling shapes written as a `1` and a square. A sweep
   * that drifted off them would clear every floor above while measuring none of the branch this
   * file exists for, so their presence is asserted on its own, together with the third member of
   * their family whose row the old search wrongly reached for. Both halves are needed: the near
   * miss is only possible where a family holds more than one shape.
   */
  it("reaches both shapes written as a 1 and a square, beside their family-mate", () => {
    const special = draws.filter(isBareOneAndSquare);
    const specialShapes = [...new Set(special.map((draw) => draw.shape))];
    const specialPatterns = [...new Set(special.map((draw) => draw.patternTex))].sort();
    expect(
      specialPatterns.join(" | "),
      "the doubling shapes written as a 1 and a square are not both reached",
    ).toBe("1 - 2\\sin^{2} A | 2\\cos^{2} A - 1");
    expect(specialShapes.length, "the two shapes collapsed onto one").toBe(2);
    for (const shape of specialShapes) {
      expect(
        special.filter((draw) => draw.shape === shape).length,
        `shape ${shape} is reached only once, so the branch is barely swept`,
      ).toBeGreaterThanOrEqual(3);
    }

    const cosineDoubling = new Set(
      draws
        .filter(
          (draw) => draw.word === "double-angle" && draw.collapsedTex.startsWith("\\cos"),
        )
        .map((draw) => draw.patternTex),
    );
    expect(
      [...cosineDoubling].sort().join(" | "),
      "the doubling shapes that collapse to a cosine are not all reached, so the near miss this figure is about cannot arise in the sweep",
    ).toBe("1 - 2\\sin^{2} A | 2\\cos^{2} A - 1 | \\cos^{2} A - \\sin^{2} A");
  });

  it("prints the learner's own expression above the three rows", () => {
    const wrong = boards
      .filter(({ draw, board }) => !board.latex.includes(draw.expressionTex))
      .map(
        ({ draw, board }) =>
          `shape ${draw.shape} (m=${draw.m}, n=${draw.n}) was asked about \`${draw.expressionTex}\`, and its board typesets ${board.latex.map((latex) => `\`${latex}\``).join(", ")}`,
      );
    expect(wrong.join("\n")).toBe("");
  });

  it("rings exactly one of the three option rows", () => {
    const wrong = boards
      .filter(
        ({ board }) =>
          board.rows.length !== 3 || board.rows.filter((row) => row.ringed).length !== 1,
      )
      .map(
        ({ draw, board }) =>
          `shape ${draw.shape} (m=${draw.m}, n=${draw.n}) draws ${board.rows.length} rows and rings ${board.rows.filter((row) => row.ringed).length} of them`,
      );
    expect(wrong.join("\n")).toBe("");
  });

  /**
   * The claim. The ringed row's pattern is the pattern the item bank says the drawn expression
   * matches, at every shape the generator can emit.
   */
  it("rings the pattern the drawn expression really matches, at every shape", () => {
    const wrong = boards
      .filter(({ draw, board }) => {
        const ringed = board.rows.find((row) => row.ringed);
        return ringed?.patternTex !== draw.patternTex;
      })
      .map(({ draw, board }) => {
        const ringed = board.rows.find((row) => row.ringed);
        return `shape ${draw.shape} (m=${draw.m}, n=${draw.n}) shows \`${draw.expressionTex}\`, whose pattern is \`${draw.patternTex}\`, and the board rings \`${ringed?.patternTex ?? "no row at all"}\` -- a row that expression does not match`;
      });
    expect(wrong.join("\n")).toBe("");
  });

  it("labels the ringed row with the word the item is keyed to", () => {
    const wrong = boards
      .filter(({ draw, board }) => board.rows.find((row) => row.ringed)?.word !== draw.word)
      .map(
        ({ draw, board }) =>
          `shape ${draw.shape} (m=${draw.m}, n=${draw.n}) is keyed \`${draw.word}\` and rings the \`${board.rows.find((row) => row.ringed)?.word ?? "missing"}\` row`,
      );
    expect(wrong.join("\n")).toBe("");
  });
});
