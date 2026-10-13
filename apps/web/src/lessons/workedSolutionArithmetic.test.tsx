/**
 * What a revealed worked solution actually SHOWS a learner.
 *
 * `WorkedSolution` renders the registered SVG figure INSTEAD of the authored
 * `worked_solution` steps whenever `getWorkedSolutionVisual(templateId)` returns one,
 * and every D2 template has one. So an assertion over `item.worked_solution` measures a
 * string nothing renders. That is how `d2.rad3.negeval.l3` shipped a three-row diagram
 * that jumped from `1/16^{5/4}` straight to `1/32`: the fourth root of 16 was never
 * named and `2^5` was never shown, while a test asserting the steps array said the
 * arithmetic was there. A reveal forfeits the slot, so the diagram is the learner's one
 * paid look at the work.
 *
 * These assert over the rendered DOM: the `data-latex` an `EquationRow` emits for the
 * diagram rows, and the KaTeX annotation the caption typesets. Both are the real
 * component output, so a row deleted from a diagram fails here even though the authored
 * steps still describe it.
 */

import {
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_TEMPLATES,
  D4_PRACTICE_ITEMS,
  D4_PRACTICE_TEMPLATES,
  D9_PRACTICE_TEMPLATES,
  type FrozenItem,
  generateFromTemplate,
  type ItemTemplate,
  RAD3_TEMPLATES,
} from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkedSolution } from "./WorkedSolution";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

function renderWorked(item: FrozenItem) {
  return render(
    <WorkedSolution
      templateId={item.template_id}
      params={item.template_params}
      steps={item.worked_solution}
    />,
  );
}

/**
 * The LaTeX the DIAGRAM put on screen: one `data-latex` per row, with a token's `sup`
 * folded in as `^{...}` exactly as `EquationRow` writes it, so an exponent row reads
 * `2^{5}`. Deliberately excludes the caption. A caption can assert a result the rows
 * never derive, which is the shape of the defect these guard, so the two are checked
 * separately and never pooled into one haystack.
 */
function diagramMath(container: HTMLElement): string {
  return Array.from(container.querySelectorAll("svg [data-latex]"))
    .map((node) => node.getAttribute("data-latex") ?? "")
    .join("\n");
}

/** The TeX rehype-katex typeset for the figure's caption. */
function captionMath(container: HTMLElement): string {
  const caption = container.querySelector("figcaption");
  return Array.from(
    caption?.querySelectorAll('annotation[encoding="application/x-tex"]') ?? [],
  )
    .map((node) => node.textContent ?? "")
    .join("\n");
}

function templateNamed(id: string): ItemTemplate {
  const template = RAD3_TEMPLATES.find((candidate) => candidate.template_id === id);
  if (!template) {
    throw new Error(`no RAD.3 template ${id}`);
  }
  return template;
}

describe("RAD.3's revealed evaluation diagrams state the arithmetic", () => {
  it.each(["d2.rad3.eval.l1", "d2.rad3.negeval.l3"])(
    "%s names the root's value and applies the power",
    (id) => {
      const template = templateNamed(id);
      for (let seed = 0; seed < 30; seed += 1) {
        const item = generateFromTemplate(template, "practice", 810_000 + seed);
        const { base, num, den, root, value } = item.template_params as Record<
          string,
          number
        >;
        // Re-derive the numbers rather than trusting the params they were authored as.
        expect((root as number) ** (den as number), item.item_version_id).toBe(base);
        expect((root as number) ** (num as number), item.item_version_id).toBe(value);

        const { container, unmount } = renderWorked(item);
        const rows = diagramMath(container);
        const caption = captionMath(container);
        const text = container.textContent ?? "";

        // The figure is what rendered, so this is measuring the learner's view.
        expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
        // A ROW carries the root's value with the power applied to it. The caption
        // asserting it is not enough: that is what the broken diagram already did.
        expect(rows, `${id} seed ${seed} rows: ${rows}`).toContain(`${root}^{${num}}`);
        // The caption says which root it is, in words, and lands on the value.
        expect(text, `${id} seed ${seed}`).toContain(" root of ");
        expect(caption, `${id} seed ${seed} caption: ${caption}`).toContain(`= ${value}`);
        unmount();
      }
    },
  );

  /**
   * `${den}-th` printed "the 3-th root of 27" and "the 2-th root of 4" for seven of the
   * ten evaluation cases. The caption now says square / cube / Nth.
   */
  it("says square and cube rather than 2-th and 3-th", () => {
    const seen = new Set<string>();
    for (const id of ["d2.rad3.eval.l1", "d2.rad3.negeval.l3"]) {
      const template = templateNamed(id);
      for (let seed = 0; seed < 40; seed += 1) {
        const item = generateFromTemplate(template, "practice", 810_000 + seed);
        const { container, unmount } = renderWorked(item);
        const text = container.textContent ?? "";
        expect(text, `${id} seed ${seed}`).not.toMatch(/\d+-th root/);
        const named = /(square|cube|\d+th) root of/.exec(text);
        expect(named, `${id} seed ${seed}: ${text}`).not.toBeNull();
        seen.add(named?.[1] as string);
        unmount();
      }
    }
    // The two English names are genuinely reached, so the mapping is not vacuous.
    expect(seen.has("square")).toBe(true);
    expect(seen.has("cube")).toBe(true);
  });
});

/**
 * The structural half. `worked_solution` is a real fallback for a template with no
 * registered visual, but on a template that HAS one it is unrendered, so nothing about
 * it can be evidence of what ships. Pinning that here means the next author who reads a
 * steps array and assumes a learner sees it has a failing test to read instead.
 */
describe("a D2 reveal renders the registered figure, never the authored steps", () => {
  const byTemplate = new Map(
    D2_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D2 template", () => {
    for (const template of D2_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        template.template_id,
      ).toBeDefined();
    }
  });

  it.each(D2_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D2 instance for ${id}`);
      }
      const { container } = renderWorked(item);
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * The same structural claim for D4, made when the pool was authored rather than retrofitted.
 *
 * A revealed practice slot scores zero, so the figure is the learner's one paid look at the
 * work, and a template with no registered visual falls back to a step list nobody designed the
 * reveal around. D4 ships a figure for all 40 of its templates across the three eras it now
 * spans: the product and factoring shapes as the rectangle the Classical era's own rationale is
 * about, the solving shapes as the roots drawn on a line, the Early Modern and Industrial
 * graph-reading chains as the shared reduction column, and the three shapes whose claim is
 * SPATIAL (which way an end points, where a zero sits, where a vertex sits between two
 * crossings) as pictures of an axis.
 */
describe("a D4 reveal renders the registered figure, never the authored steps", () => {
  const byTemplate = new Map(
    D4_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D4 template", () => {
    // A floor, because "every one of none" is a pass that proves the opposite of what it looks
    // like: it is what an import resolving to an empty pool produces.
    expect(D4_PRACTICE_TEMPLATES.length, "no D4 templates found").toBe(40);
    for (const template of D4_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        template.template_id,
      ).toBeDefined();
    }
  });

  it.each(D4_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D4 instance for ${id}`);
      }
      const { container } = renderWorked(item);
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * A coefficient of one printed in front of a variable: `1x`, `1x^{2}`, `1y`, `1xy`.
 *
 * Kept character for character in step with `packages/item-bank/src/unitCoefficient.test.ts`,
 * which owns the rule and carries the reasoning for each guard in it. It cannot be imported
 * from there -- it is a const inside a test file in another package -- so if one moves, move
 * both, or the two sweeps start disagreeing about what the defect is.
 */
const UNIT_COEFFICIENT = /(?<![\d.\\])1(?=[a-zA-Z])(?!(?:st|nd|rd|th)\b)/;

/**
 * Every D4 template whose PROMPT does not honour the contract yet, named with its reason.
 *
 * A template that does not owe the property and a template that forgot it look identical from
 * outside a guard, so this is a list rather than a filter, and it is asserted in both
 * directions below: an entry that stops existing fails, and an entry that starts honouring the
 * contract fails too, so it cannot sit here forever excusing nothing.
 *
 * It is EMPTY, and the second direction is what emptied it. `d4.pol1.two-variable.l3` built its
 * prompt as `${a}x + ${b}y` by hand instead of through `coeff`, so a drawn `b` of one printed
 * *"A yard measures $4x + 1y$ paces one way"* beside a figure correctly reading `4x + y`. It was
 * excused here while `packages/item-bank/src/d4/nodes/POL.1/index.ts` was another owner's file;
 * once that prompt was routed through `coeff` the entry failed with *"now honours the contract
 * and must come off this list"*, which is the excuse expiring rather than outliving the defect.
 *
 * The claim below does not weaken with the list empty: the population is floored at 200 draws
 * and the branch that can print a unit coefficient is floored at 20, so an empty exception list
 * means every D4 prompt is swept rather than that nothing is.
 */
const PROMPT_NOT_YET_CONVERTED: Readonly<Record<string, string>> = {};

/**
 * Every distinct draw of every D4 template, plus the frozen pool.
 *
 * A pool holds one instance per template and a template holds a set of shapes, so a defect
 * that only appears when a drawn coefficient comes out at one is invisible over the pool: it
 * is a branch, not a shape. The seeds are a fixed run, so a failure names an instance somebody
 * else can reproduce.
 */
function everyD4Draw(): FrozenItem[] {
  const seen = new Set<string>();
  const drawn: FrozenItem[] = [];
  for (const template of D4_PRACTICE_TEMPLATES) {
    for (let seed = 0; seed < 20; seed += 1) {
      const item = generateFromTemplate(template, "practice", 4_400_000 + seed);
      const key = `${item.template_id}|${JSON.stringify(item.template_params)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      drawn.push(item);
    }
  }
  return [...D4_PRACTICE_ITEMS, ...drawn];
}

/**
 * A D4 FIGURE prints its coefficients the way the D4 PROMPT beside it does.
 *
 * Not a style rule. A reveal's figure stands in for the question a learner has just failed, and
 * the two are on screen together: a prompt reading *"Divide $x^{3} - 4x^{2} + x + 6$"* over a
 * figure reading `(x^{3} - 4x^{2} + 1x + 6)` has stated the same cubic twice in two notations,
 * and the learner has to decide which one the grader means. It reached the answer line too --
 * the same draw keyed `x^2 - x - 2` and closed its figure on `x^{2} - 1x - 2`.
 *
 * ## What this file still owns, now that the rule is bank-wide
 *
 * The paragraph that used to stand here said the population was scoped to D4 by CONTRACT: that
 * D4's prompts are built from the `signedTerm`/`coeff` pair in
 * `packages/item-bank/src/d4/nodes/_shared.ts` and that other domains "build their prompts from
 * their own formatters and are not making this promise, so sweeping them here would be asserting
 * a rule nobody wrote". That was wrong twice over. The promise is the curriculum's, not a shared
 * module's -- `content/lessons/d1/NUM.4.json` teaches that a coefficient of one is "written by
 * leaving it off" -- and measured over every generator, six templates in five OTHER domains were
 * printing `1x` while this reasoning held they owed nothing.
 *
 * The string half of the rule is therefore no longer scoped here at all:
 * `packages/item-bank/src/unitCoefficient.test.ts` sweeps every template in the bank, prompts,
 * hints, steps and answer keys alike. What remains this file's own is the half that package
 * cannot reach: these tests RENDER the reveal and read the coefficients out of the figure, which
 * is a claim about a mounted surface rather than about a generated string. The prompt assertion
 * below is kept beside it deliberately, because the point being made is that the figure and the
 * prompt agree, and that comparison needs both halves measured in one place.
 *
 * The third test is what stops the second passing over nothing. `1x` cannot appear in a
 * population that never draws a coefficient of one, and every D4 coefficient could in principle
 * be drawn away from one by a generator change -- at which point this file would go green while
 * measuring an empty branch. So the draws that DO print a bare unit coefficient are counted, and
 * the floor is set under what the tree reaches today.
 */
describe("a D4 figure prints its coefficients the way the D4 prompt beside it does", () => {
  const draws = everyD4Draw();

  it("swept a real population of draws", () => {
    expect(draws.length, "the D4 draw sweep found nothing").toBeGreaterThanOrEqual(200);
  });

  it("no D4 prompt prints a unit coefficient as 1x, which is the contract", () => {
    const excused = new Set(Object.keys(PROMPT_NOT_YET_CONVERTED));
    const bad = draws
      .filter(
        (item) => !excused.has(item.template_id) && UNIT_COEFFICIENT.test(item.prompt),
      )
      .map((item) => `${item.template_id}: ${item.prompt}`);
    expect(bad.join("\n")).toBe("");
  });

  it("each excused template still exists and still prints the unit coefficient", () => {
    const wrong: string[] = [];
    for (const id of Object.keys(PROMPT_NOT_YET_CONVERTED)) {
      const mine = draws.filter((item) => item.template_id === id);
      // Direction one: a renamed or deleted template cannot sit in the list forever, excusing
      // nothing and hiding that it excuses nothing.
      if (mine.length === 0) {
        wrong.push(`${id} is excused but no longer draws anything`);
        continue;
      }
      // Direction two: a prompt that starts honouring the contract has to leave the list, or
      // the list stops describing the tree and starts excusing it.
      if (!mine.some((item) => UNIT_COEFFICIENT.test(item.prompt))) {
        wrong.push(`${id} now honours the contract and must come off this list`);
      }
    }
    expect(wrong.join("\n")).toBe("");
  });

  /**
   * The claim and its floor, in one render pass.
   *
   * The floor is what stops the claim passing over nothing: `1x` cannot appear in a population
   * that never draws a coefficient of one, so a generator narrowing its ranges would leave this
   * green while measuring an empty branch. 68 rows across six templates and two checks printed
   * `1x` before the fix, so the branch is well populated; the floor sits well under that,
   * because which seeds land on a coefficient of one is incidental.
   */
  it("no D4 figure prints a unit coefficient as 1x, over draws that really reach one", () => {
    const bad: string[] = [];
    let bare = 0;
    for (const item of draws) {
      const { container, unmount } = renderWorked(item);
      const rows = diagramMath(container);
      for (const latex of [rows, captionMath(container)]) {
        for (const line of latex.split("\n")) {
          if (UNIT_COEFFICIENT.test(line)) {
            bad.push(
              `${item.template_id} ${JSON.stringify(item.template_params)}: ${line}`,
            );
          }
        }
      }
      for (const line of rows.split("\n")) {
        if (/[+-] x(?![a-zA-Z^{])|\(x [+-]|[+-] x\^\{2\}/.test(line)) {
          bare += 1;
        }
      }
      unmount();
    }
    expect(bad.join("\n")).toBe("");
    expect(
      bare,
      "no D4 figure draws a unit coefficient at all, so the rule above measures nothing",
    ).toBeGreaterThanOrEqual(20);
  }, 120_000);
});

/* -------------------------------------------------------------------------- */
/* D9: the subtraction a revealed trigonometry figure prints                    */
/* -------------------------------------------------------------------------- */

/**
 * A quantity a D9 figure prints, held as an exact rational so a difference is exact.
 *
 * `kind` separates a multiple of pi from a bare number, because an equation mixing the two
 * is not one this sweep can judge and quietly comparing their magnitudes would invent a
 * verdict. A row whose three parts do not agree on a kind is skipped rather than counted.
 */
interface Quantity {
  kind: "pi" | "plain";
  n: number;
  d: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** One printed term as an exact rational, or `null` where it is not a bare quantity. */
function quantity(latex: string): Quantity | null {
  const compact = latex.replace(/\s+/g, "");
  let m = /^(-?)\\dfrac\{(-?\d*)\\pi\}\{(\d+)\}$/.exec(compact);
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    return { kind: "pi", n: sign * (m[2] === "" ? 1 : Number(m[2])), d: Number(m[3]) };
  }
  m = /^(-?)(\d*)\\pi$/.exec(compact);
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    return { kind: "pi", n: sign * (m[2] === "" ? 1 : Number(m[2])), d: 1 };
  }
  m = /^(-?)\\dfrac\{(-?\d+)\}\{(\d+)\}$/.exec(compact);
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    return { kind: "plain", n: sign * Number(m[2]), d: Number(m[3]) };
  }
  m = /^(-?\d+)\^\{\\circ\}$/.exec(compact);
  if (m) {
    return { kind: "plain", n: Number(m[1]), d: 1 };
  }
  m = /^(-?\d+)$/.exec(compact);
  if (m) {
    return { kind: "plain", n: Number(m[1]), d: 1 };
  }
  return null;
}

/** The printed LaTeX as something a failure message can be read out of. */
function ascii(latex: string): string {
  return latex
    .replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
    .replace(/\^\{\\circ\}/g, " deg")
    .replace(/\\pi/g, "pi")
    .replace(/\s+/g, " ")
    .trim();
}

function quantityText(q: Quantity): string {
  const factor = gcd(q.n, q.d);
  const n = q.n / factor;
  const d = q.d / factor;
  if (q.kind === "plain") {
    return d === 1 ? `${n}` : `${n}/${d}`;
  }
  const head = Math.abs(n) === 1 ? "pi" : `${Math.abs(n)}pi`;
  const body = d === 1 ? head : `${head}/${d}`;
  return n < 0 ? `-${body}` : body;
}

interface PrintedSubtraction {
  /** The equation exactly as the figure states it. */
  printed: string;
  /** The same subtraction with the result it actually has. */
  truth: string;
  correct: boolean;
}

/**
 * Every subtraction a rendered figure STATES a result for, with that result checked.
 *
 * Two shapes of row reach this. A figure may put the whole equation on one row
 * (`215 deg - 180 deg = 35 deg`), and it may put the result on a row of its own beginning
 * with `=`, which is how the unit-circle archetype stacks its right-hand column; a row
 * starting with `=` is therefore folded onto the one above before anything is read. A chain
 * such as `\cos^{2}\theta = 1 - \dfrac{25}{169} = \dfrac{144}{169}` names a quantity in front
 * of the arithmetic, so the part before the last-but-one `=` is dropped and the subtraction
 * behind it is what gets checked.
 */
function printedSubtractions(container: HTMLElement): PrintedSubtraction[] {
  const rows = Array.from(container.querySelectorAll("svg [data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  const lines: string[] = [];
  for (const row of rows) {
    const previous = lines[lines.length - 1];
    if (row.trimStart().startsWith("=") && previous !== undefined) {
      lines[lines.length - 1] = `${previous} ${row.trim()}`;
    } else {
      lines.push(row);
    }
  }

  const found: PrintedSubtraction[] = [];
  for (const line of lines) {
    const lastEquals = line.lastIndexOf("=");
    if (lastEquals < 0) {
      continue;
    }
    const statedTex = line.slice(lastEquals + 1).trim();
    let exprTex = line.slice(0, lastEquals).trim();
    const innerEquals = exprTex.lastIndexOf("=");
    if (innerEquals >= 0) {
      exprTex = exprTex.slice(innerEquals + 1).trim();
    }
    const minus = /^(.+?)\s-\s(.+)$/.exec(exprTex);
    if (!minus) {
      continue;
    }
    const left = quantity(minus[1] ?? "");
    const right = quantity(minus[2] ?? "");
    const stated = quantity(statedTex);
    if (!left || !right || !stated) {
      continue;
    }
    if (left.kind !== right.kind || right.kind !== stated.kind) {
      continue;
    }
    const difference: Quantity = {
      kind: left.kind,
      n: left.n * right.d - right.n * left.d,
      d: left.d * right.d,
    };
    found.push({
      printed: `${ascii(exprTex)} = ${ascii(statedTex)}`,
      truth: `${ascii(exprTex)} = ${quantityText(difference)}`,
      correct: difference.n * stated.d === stated.n * difference.d,
    });
  }
  return found;
}

function d9TemplateNamed(id: string): ItemTemplate {
  const template = D9_PRACTICE_TEMPLATES.find((candidate) => candidate.template_id === id);
  if (!template) {
    throw new Error(`no D9 template ${id}`);
  }
  return template;
}

/**
 * The first draw of `template` whose params match, named by what was looked for.
 *
 * A pinned seed would say nothing about which instance it produced, and a reshuffle of the
 * generator would silently swap the instance under the assertion. Searching for the params
 * instead means the test fails LOUDLY if the shape stops being drawable, rather than going
 * on measuring some other heading.
 */
function drawWhere(
  template: ItemTemplate,
  want: string,
  match: (params: Record<string, number>) => boolean,
): FrozenItem {
  for (let seed = 0; seed < 400; seed += 1) {
    const item = generateFromTemplate(template, "practice", 9_900_000 + seed);
    if (match(item.template_params as Record<string, number>)) {
      return item;
    }
  }
  throw new Error(`${template.template_id} never drew ${want} in 400 seeds`);
}

interface D9Sweep {
  renders: number;
  /** Every subtraction the sweep read, with the template that printed it. */
  checked: { id: string; params: string; equation: PrintedSubtraction }[];
  /** The radian reference-angle headings the sweep actually reached, as `k/d:Qn`. */
  radianHeadings: Set<string>;
}

/**
 * Every distinct draw of every D9 template, rendered once, with its figure read.
 *
 * Memoized because two assertions below need the same pass and it is a nine-hundred-figure
 * render: one of them is the claim and the other is the floor that stops the claim passing
 * over nothing, and running the sweep twice to keep them separate would cost a minute for
 * no extra coverage.
 */
let d9SweepCache: D9Sweep | undefined;

function d9Sweep(): D9Sweep {
  if (d9SweepCache) {
    return d9SweepCache;
  }
  const sweep: D9Sweep = { renders: 0, checked: [], radianHeadings: new Set() };
  for (const template of D9_PRACTICE_TEMPLATES) {
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed += 1) {
      const item = generateFromTemplate(template, "practice", 7_700_000 + seed);
      const params = JSON.stringify(item.template_params);
      if (seen.has(params)) {
        continue;
      }
      seen.add(params);
      const drawn = item.template_params as Record<string, number>;
      if (item.template_id === "d9.trg3.reference-radian.l2") {
        sweep.radianHeadings.add(`${drawn.k}/${drawn.d}:Q${drawn.quadrant}`);
      }
      const { container, unmount } = renderWorked(item);
      sweep.renders += 1;
      for (const equation of printedSubtractions(container)) {
        sweep.checked.push({ id: item.template_id, params, equation });
      }
      unmount();
    }
  }
  d9SweepCache = sweep;
  return sweep;
}

/**
 * The same claim this file makes for RAD.3, widened to D9.
 *
 * ## Why the population moved rather than a new file appearing beside it
 *
 * The defect class is this file's own: a reveal renders the registered FIGURE and not the
 * authored `worked_solution`, so a step array can state the arithmetic correctly while the
 * picture beside it states something else. That is exactly what D9's TRG.3 radian
 * reference-angle figure does. `packages/item-bank/src/d9/nodes/TRG.3/index.ts` branches its
 * `differenceTex` three ways and prints `\dfrac{7\pi}{6} - \dfrac{6\pi}{6}` for a Quadrant III
 * heading; the FIGURE at `apps/web/src/lessons/worked/d9TRG3.tsx:339` branches two ways, on
 * `quadrant === 4` alone, so Quadrant III gets Quadrant II's row with the operands the wrong
 * way round. The steps are right and unrendered, and the picture a learner is shown is wrong.
 *
 * Nothing above swept D9: the three describes are scoped to RAD.3, D2 and D4, so not one D9
 * draw entered this file and the sweep written for this defect class could not see it.
 *
 * ## What the population is, and why it is not the seven headings
 *
 * It is every distinct draw of every D9 practice template, derived from
 * `D9_PRACTICE_TEMPLATES` rather than listed, with every subtraction its figure STATES a
 * result for checked against the result it has. Scoping it to the seven Quadrant III radian
 * headings would be scoping the guard to the implementation that happens to be broken today,
 * which is how a guard ends up narrower than the behaviour it is about: any D9 figure can
 * print a subtraction, and six of them do.
 *
 * The floor and the composition assertion are separate for the reason a floor is not enough.
 * 150 subtractions across six templates is a size; that the sweep reaches all three quadrants
 * of the radian shape is a shape, and only the second rules out a green run over a population
 * that has drifted to the quadrants where the subtraction happens to be symmetrical.
 */
describe("a D9 reveal's printed subtraction states the result it really has", () => {
  /**
   * The named instance, so a fixer sees the learner's own false equation and not a count.
   *
   * `7\pi/6` is Quadrant III, where the reference angle is the heading MINUS the half turn.
   * The figure prints the half turn minus the heading and then states the positive result,
   * so the row on screen is `6pi/6 - 7pi/6 = pi/6`, whose left side is `-pi/6`.
   */
  it("prints a true subtraction for the Quadrant III radian heading 7pi/6", () => {
    const template = d9TemplateNamed("d9.trg3.reference-radian.l2");
    const item = drawWhere(
      template,
      "k = 7, d = 6 (the Quadrant III heading 7pi/6)",
      (params) => params.k === 7 && params.d === 6,
    );
    expect(item.template_params.quadrant, "7pi/6 is a Quadrant III heading").toBe(3);

    const { container } = renderWorked(item);
    const equations = printedSubtractions(container);
    expect(
      equations.length,
      `the 7pi/6 figure stated no subtraction at all, so this assertion is measuring nothing: ${diagramMath(container)}`,
    ).toBe(1);

    const equation = equations[0] as PrintedSubtraction;
    expect(
      equation.printed,
      `d9.trg3.reference-radian.l2 drew 7pi/6, which is in Quadrant III, and its revealed figure prints "${equation.printed}". That equation is false: ${equation.truth}. A learner who trusts the picture learns to subtract a Quadrant III heading FROM the half turn, which is the Quadrant II move, and the negative it really produces is never shown.`,
    ).toBe(equation.truth);
  }, 60_000);

  it("swept a real population of D9 draws and really read subtractions off them", () => {
    const sweep = d9Sweep();
    const contributing = new Set(sweep.checked.map((row) => row.id));
    const quadrants = new Set(
      [...sweep.radianHeadings].map((heading) => heading.split(":")[1]),
    );

    // Size: 925 renders and 150 stated subtractions across six templates at 5bac81f0.
    expect(sweep.renders, "the D9 draw sweep rendered nothing").toBeGreaterThanOrEqual(600);
    expect(
      sweep.checked.length,
      "no D9 figure stated a subtraction, so the rule below measures nothing",
    ).toBeGreaterThanOrEqual(100);
    expect(
      contributing.size,
      `only ${[...contributing].join(", ")} stated a subtraction, so this is one figure's guard wearing a domain's name`,
    ).toBeGreaterThanOrEqual(4);

    // Shape: a floor constrains size, not composition. The defect lives in ONE quadrant of
    // ONE shape, so a sweep that stopped reaching Quadrant III would clear every floor above
    // while measuring none of the branch this exists for.
    expect(
      [...quadrants].sort().join(","),
      `the radian reference-angle sweep reached only ${[...sweep.radianHeadings].sort().join(" ")}`,
    ).toBe("Q2,Q3,Q4");
    expect(
      [...sweep.radianHeadings].filter((heading) => heading.endsWith("Q3")).length,
      "the sweep reached too few Quadrant III radian headings to be measuring the branch",
    ).toBeGreaterThanOrEqual(5);
  }, 300_000);

  it("no D9 figure states a subtraction whose printed result is false", () => {
    const bad = d9Sweep()
      .checked.filter((row) => !row.equation.correct)
      .map(
        (row) =>
          `${row.id} ${row.params}\n    prints ${row.equation.printed}\n    truth  ${row.equation.truth}`,
      );
    expect([...new Set(bad)].join("\n")).toBe("");
  }, 300_000);
});
