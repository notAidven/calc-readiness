import { describe, expect, it } from "vitest";
import { generateFromTemplate, type ItemTemplate } from "../../../template";

import { TRG1_TEMPLATES } from "../TRG.1/index";
import { TRG2_TEMPLATES } from "../TRG.2/index";
import { TRG3_TEMPLATES } from "../TRG.3/index";
import { TRG5_TEMPLATES } from "../TRG.5/index";
import { TRG4_IDENTITY_LINES, TRG4_TEMPLATES } from "./index";

/**
 * Two properties TRG.4 shipped without: a classification whose cut is the cut it grades on,
 * and a worked solution that makes one move per step.
 *
 * ## Why `identity-name` felt hard, measured rather than guessed
 *
 * `todo.txt:28` asked what makes identity identification hard on this node. It is neither the
 * mathematics nor the answer format: all 13 lines were verified true identities at six sample
 * angles, and 28 of 28 served choose-one items grade correct when answered as authored. What
 * was left is the classification itself. The prompt asked which identity *justifies* the
 * rewriting, and a justification runs through whatever chain you like: on
 * $\tan\theta \cdot \cot\theta = 1$ and $\dfrac{1}{\cot\theta} = \tan\theta$, both keyed
 * `reciprocal`, the standard justification goes through the quotient identities
 * ($\tan\theta\cot\theta = \frac{\sin}{\cos} \cdot \frac{\cos}{\sin} = 1$), so `quotient` was
 * defensible on 16.8% of draws and graded `value_mismatch`.
 *
 * The fix is both halves the probe left open: the prompt now names the cut it grades on (which
 * family's SHAPE the line has, not what would justify it), and the two lines whose shape a
 * reader can honestly sort either way are gone from the table.
 *
 * The exclusion is asserted as a RULE rather than as a list of two strings, because the rule is
 * what generalizes: a line keyed `reciprocal` may not name the tangent or the cotangent, since
 * those two are defined as quotients of the other four and any reciprocal statement about them
 * is a quotient statement one substitution away. That fails in both directions — adding such a
 * line fails, and so does keying an existing line into the wrong family — and it is checked
 * over the table the template actually draws from rather than over a copy of it.
 *
 * ## One move per step
 *
 * `pythagorean-solve.l3`'s second step squared the reading AND subtracted it from one, in a
 * chain carrying three `=` signs, on every draw. The probe's own metric for a step doing two
 * things is exactly that count, so it is the metric asserted: a chain of two is one move shown
 * with its result, and three is two moves in one step.
 *
 * ## The naming item is keyed `.l2` now, and the sweeps above followed it
 *
 * Everything the two sections above rule on is a property of the CLASSIFICATION and of the
 * writing, neither of which the tier touches, so the demotion from `identity-name.l3` to
 * `identity-name.l2` is a rekey here and nothing more. What changed underneath it is the node's
 * hardest slot, which is now `compound-evaluate.l3`, and the third section below is that item's
 * own guard.
 */

const DRAWS = 400;

function templateFor(id: string): ItemTemplate {
  return TRG4_TEMPLATES.find((candidate) => candidate.template_id === id) as ItemTemplate;
}

const identityName = templateFor("d9.trg4.identity-name.l2");
const pythagoreanSolve = templateFor("d9.trg4.pythagorean-solve.l3");
const compoundEvaluate = templateFor("d9.trg4.compound-evaluate.l3");

describe("TRG.4 grades the cut its identity-naming prompt states", () => {
  const samples = Array.from({ length: DRAWS }, (_unused, index) =>
    generateFromTemplate(identityName, "practice", 990_000 + index),
  );

  it("keys no reciprocal line on the tangent or the cotangent, where quotient is defensible too", () => {
    const ambiguous = TRG4_IDENTITY_LINES.filter(
      (line) => line.family === 2 && /\\tan|\\cot/.test(line.latex),
    );
    expect(
      ambiguous.map((line) => line.latex),
      "a reciprocal statement about the tangent or the cotangent is also a quotient statement, so it has two defensible answers and one key",
    ).toEqual([]);
    // Both directions of the same rule: the quotient family is where those two functions
    // belong, and it still holds lines that name them.
    expect(
      TRG4_IDENTITY_LINES.filter(
        (line) => line.family === 1 && /\\tan|\\cot/.test(line.latex),
      ).length,
      "the quotient family is still the one that names the tangent and the cotangent",
    ).toBeGreaterThanOrEqual(4);
  });

  it("still offers every family, deep enough to be a classification rather than a coin flip", () => {
    for (const family of [0, 1, 2]) {
      expect(
        TRG4_IDENTITY_LINES.filter((line) => line.family === family).length,
        `family ${family} has lines to draw`,
      ).toBeGreaterThanOrEqual(3);
    }
    expect(
      TRG4_IDENTITY_LINES.length,
      "the table has not been thinned away",
    ).toBeGreaterThanOrEqual(11);
    // The census: what the template draws is exactly what the table holds, so the table cannot
    // grow a line the draws never reach or lose one they still do.
    const drawn = new Set(samples.map((item) => item.template_params.line));
    expect(
      [...drawn].sort((a, b) => (a as number) - (b as number)),
      "every line in the table is reachable and no draw reaches past it",
    ).toEqual(TRG4_IDENTITY_LINES.map((_unused, index) => index));
  });

  it("asks which family the line belongs to, and never what justifies it", () => {
    for (const item of samples) {
      expect(
        item.prompt.includes("justifies"),
        `a justification is a chain and admits more than one family: ${item.prompt}`,
      ).toBe(false);
      expect(
        item.prompt.includes("Sort it by the shape of the relation"),
        `the prompt has to state the cut it grades on: ${item.prompt}`,
      ).toBe(true);
    }
  });

  it("keeps no single answer worth guessing on half the draws", () => {
    const counts = new Map<string, number>();
    for (const item of samples) {
      const key = item.answer.answer_key ?? "";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const worst = Math.max(...counts.values());
    expect(counts.size, "all three options are keyed").toBe(3);
    expect(
      worst / DRAWS,
      `the commonest answer is keyed on ${((worst / DRAWS) * 100).toFixed(1)}% of draws`,
    ).toBeLessThan(0.42);
  });
});

/**
 * One move per step, swept across every template TRG.1 to TRG.5 own.
 *
 * The population is every practice template on the five nodes, not the one the probe named,
 * because a reveal chaining two moves is a property of the writing and nothing about the five
 * nodes makes any one of them immune.
 *
 * **The metric is a chain inside one expression, not equalities per step**, and that is a
 * correction to the probe's counter rather than a loosening of it. Counting `=` over the whole
 * step reports 4 on *"here $a = 2$, $b = 2$ and $d = -3$"*, which is three readings taken in a
 * single move and the probe says as much when it quotes the TRG.5 pair as defensible. What is
 * not defensible is $A = B = C$: two rewritings of the same quantity inside one span, which is
 * a move, its result, and then a second move performed on that result. That is exactly the
 * shape the probe's genuine instance had, and asserting the chain rather than the count is what
 * makes the guard fail on it while leaving a line-up step alone.
 */
describe("TRG.1 to TRG.5 make one move per worked-solution step", () => {
  const OWNED: readonly ItemTemplate[] = [
    ...TRG1_TEMPLATES,
    ...TRG2_TEMPLATES,
    ...TRG3_TEMPLATES,
    ...TRG4_TEMPLATES,
    ...TRG5_TEMPLATES,
  ];

  it("sweeps a population that is all five nodes, so a fix on one is not read as a fix on the rest", () => {
    expect(OWNED.length, "all five nodes contribute their shapes").toBeGreaterThanOrEqual(
      24,
    );
    expect(
      new Set(OWNED.map((template) => template.node_id)).size,
      "five nodes, none of them dropped out of the sweep",
    ).toBe(5);
  });

  it("never chains one quantity through two rewritings inside a single expression", () => {
    for (const template of OWNED) {
      for (let seed = 0; seed < 40; seed += 1) {
        const item = generateFromTemplate(template, "practice", 995_000 + seed);
        for (const [index, step] of item.worked_solution.entries()) {
          for (const span of step.match(/\$[^$]*\$/g) ?? []) {
            const equalities = (span.match(/=/g) ?? []).length;
            expect(
              equalities,
              `${template.template_id} step ${index + 1} rewrites one quantity ${equalities} times in one expression, which is a move and then another move on its result: ${span}`,
            ).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("still ends the Pythagorean reveal on the answer it was asked for", () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const item = generateFromTemplate(pythagoreanSolve, "practice", 995_000 + seed);
      const last = item.worked_solution[item.worked_solution.length - 1] ?? "";
      expect(last, item.prompt).toContain(item.answer.answer_key ?? "");
    }
  });
});

/**
 * `compound-evaluate.l3` keys a product it never evaluates as a product.
 *
 * The template reaches its key through a COLLAPSE: it looks the shape up in a four-row table
 * that says which single function the two factors come to, signs that function by the
 * quadrant, and flips it when the first factor is odd. That is three places a sign can be
 * wrong, and every one of them is silent. Nothing about a wrong row looks wrong: the prompt
 * still prints two sensible factors, the reveal still walks a coherent argument to them, and
 * the item grades a learner who worked it correctly as wrong. So the collapse is the one claim
 * on this template that cannot be left to review.
 *
 * **The check is deliberately not the collapse run again.** It reads the item's own PROMPT the
 * way a learner does, recovers the second reading from the Pythagorean identity and the
 * quadrant, evaluates each factor separately from the two readings, multiplies them, and
 * compares that number to the key. Nothing here imports the shape table, and the parity of the
 * first factor is never consulted: the reversed heading is substituted directly as
 * $(-\sin\theta, \cos\theta)$, because reflecting across the horizontal axis is what a
 * reversed sweep IS, and letting the guard reach for the same even/odd rule the template used
 * would be checking the arithmetic while agreeing about the sign. Both directions therefore
 * hold: a wrong row in the table fails here, and so does a prompt that prints factors the key
 * was not computed from.
 *
 * The second assertion is the answer FORM, which is what the prompt's "write it as a fraction"
 * promises and what keeps `exactTrigValueAnswer` on the notation tag that earns the answer
 * field its `/` key: every key is `p/q` in lowest terms with `q > 1`, so no draw can come out a
 * whole number and ask for a fraction anyway.
 */
describe("TRG.4's compound product is worth the value it keys", () => {
  const samples = Array.from({ length: DRAWS }, (_unused, index) =>
    generateFromTemplate(compoundEvaluate, "practice", 970_000 + index),
  );

  const GIVEN_READING = /\$\\(sin|cos)\\theta = (-?)\\dfrac\{(\d+)\}\{(\d+)\}\$/;
  const PRODUCT =
    /Give \$\\(sin|cos|tan|csc|sec|cot)\(-\\theta\) \\cdot \\(sin|cos|tan|csc|sec|cot)\\theta\$ exactly/;
  const QUADRANT = /lies in Quadrant (IV|III|II|I)\./;
  const NUMERALS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

  interface CompoundPrompt {
    quadrant: number;
    /** The value the prompt prints, signed as it prints it. */
    givenText: string;
    sin: number;
    cos: number;
    firstFactor: string;
    secondFactor: string;
  }

  /** Everything the check needs, taken off the prompt rather than off `template_params`. */
  function readPrompt(prompt: string): CompoundPrompt {
    const reading = GIVEN_READING.exec(prompt);
    const factors = PRODUCT.exec(prompt);
    const numeral = QUADRANT.exec(prompt);
    if (!reading || !factors || !numeral) {
      throw new Error(`the prompt is not in the shape this guard reads: ${prompt}`);
    }
    const quadrant = NUMERALS[numeral[1] ?? ""] ?? 0;
    const givenValue =
      (reading[2] === "-" ? -1 : 1) * (Number(reading[3]) / Number(reading[4]));
    // The reading the prompt withheld: the Pythagorean identity for its size, the quadrant
    // for its sign. This is the learner's route, and it never touches the template.
    const otherSize = Math.sqrt(1 - givenValue * givenValue);
    const recovered = (negative: boolean): number => (negative ? -otherSize : otherSize);
    const sinNegative = quadrant === 3 || quadrant === 4;
    const cosNegative = quadrant === 2 || quadrant === 3;
    const givenIsSine = reading[1] === "sin";
    return {
      quadrant,
      givenText: `${reading[2]}${reading[3]}/${reading[4]}`,
      sin: givenIsSine ? givenValue : recovered(sinNegative),
      cos: givenIsSine ? recovered(cosNegative) : givenValue,
      firstFactor: factors[1] ?? "",
      secondFactor: factors[2] ?? "",
    };
  }

  /** One of the six, off a signed sine and cosine and nothing else. */
  function evaluate(name: string, sin: number, cos: number): number {
    switch (name) {
      case "sin":
        return sin;
      case "cos":
        return cos;
      case "tan":
        return sin / cos;
      case "csc":
        return 1 / sin;
      case "sec":
        return 1 / cos;
      default:
        return cos / sin;
    }
  }

  function gcd(x: number, y: number): number {
    return y === 0 ? x : gcd(y, x % y);
  }

  it("draws enough instances, across every shape, quadrant and given reading, to measure", () => {
    // A floor under the sweeps below: containment and per-item checks are all satisfied by an
    // empty sample, so the population is asserted before anything is asserted over it.
    expect(samples.length, "the sweep has instances to measure").toBe(DRAWS);
    expect(
      [...new Set(samples.map((item) => item.template_params.shape))].sort(),
      "all four compound shapes are reachable and no draw reaches past them",
    ).toEqual([0, 1, 2, 3]);
    expect(
      [...new Set(samples.map((item) => item.template_params.quadrant))].sort(),
      "Quadrant I is never drawn, so a sign decision is live on every instance",
    ).toEqual([2, 3, 4]);
    expect(
      [...new Set(samples.map((item) => item.template_params.givenSine))].sort(),
      "both readings are given somewhere, so the recovery runs in both directions",
    ).toEqual([0, 1]);
  });

  it("keys the product of its two factors, each evaluated independently off the prompt", () => {
    for (const item of samples) {
      const read = readPrompt(item.prompt);
      // The first factor sits at the reversed heading, which reflects the position across the
      // horizontal axis: the vertical coordinate changes sign and the horizontal one does not.
      const product =
        evaluate(read.firstFactor, -read.sin, read.cos) *
        evaluate(read.secondFactor, read.sin, read.cos);
      const parts = /^(-?)(\d+)\/(\d+)$/.exec(item.answer.answer_key ?? "");
      if (!parts) {
        throw new Error(`the key is not a signed fraction: ${item.answer.answer_key}`);
      }
      const keyed = (parts[1] === "-" ? -1 : 1) * (Number(parts[2]) / Number(parts[3]));
      expect(
        product,
        `${item.prompt} keys ${item.answer.answer_key}, but its two factors multiply to ${product}`,
      ).toBeCloseTo(keyed, 10);
    }
  });

  it("keys a reduced fraction that is never a whole number and never the value it printed", () => {
    for (const item of samples) {
      const answerKey = item.answer.answer_key ?? "";
      const parts = /^(-?)(\d+)\/(\d+)$/.exec(answerKey);
      if (!parts) {
        throw new Error(`the key is not a signed fraction: ${answerKey}`);
      }
      const numerator = Number(parts[2]);
      const denominator = Number(parts[3]);
      expect(
        denominator,
        `${answerKey} would be a whole number, and the prompt asks for a fraction`,
      ).toBeGreaterThan(1);
      expect(gcd(numerator, denominator), `${answerKey} is not in lowest terms`).toBe(1);
      // A given reading is over the hypotenuse and every collapsed answer is over a leg, so
      // these can never coincide. Asserted rather than argued, because it is the difference
      // between an item and a learner reading their own prompt back.
      expect(
        answerKey,
        `${item.prompt} keys a value it printed, so the prompt answers itself`,
      ).not.toBe(readPrompt(item.prompt).givenText);
    }
  });

  it("keeps the parity decision live, with two even first factors and two odd", () => {
    const firstFactorOf = new Map<number, string>();
    for (const item of samples) {
      firstFactorOf.set(
        item.template_params.shape as number,
        readPrompt(item.prompt).firstFactor,
      );
    }
    const drawn = [...firstFactorOf.values()];
    const even = drawn.filter((name) => name === "cos" || name === "sec");
    expect(drawn.length, "every shape contributed a first factor").toBe(4);
    // Both directions of one rule: a table of four odd first factors turns the parity step
    // into a constant minus sign, and a table of four even ones deletes it altogether.
    expect(
      even.length,
      `the reversed sweep changes nothing on two shapes and flips the sign on two, but the drawn first factors are ${drawn.join(", ")}`,
    ).toBe(2);
  });
});
