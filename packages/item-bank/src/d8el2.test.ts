import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { EL2_NODE, EL2_TEMPLATES, EL2_TRANSFORM_NAMES } from "./d8/nodes/EL.2";
import { createRng, expressionAnswer } from "./template";
import { PRODUCT_CHECKER_CONFIG, validateTemplates } from "./validate";

/**
 * The EL.2 (graph exponential functions and transformations) practice templates, validated
 * on their own so this node can be authored and checked before the D8 aggregators pick it up.
 * The domain-level pool guards (composition of the frozen pool, cross-pool isolation, the
 * content-hash pin) live in `d8.test.ts` and are the orchestrator's to extend.
 *
 * Four claims, and the last one is not about EL.2's templates at all: it pins the CHECKER
 * FACT that decided the shape of `d8.el2.transform-rhs.l3`. That template asks for the
 * expression sitting in the exponent rather than for the whole right-hand side, and the
 * reason is that the whole right-hand side is not gradable. Written down as an assertion
 * rather than as a comment, because the argument for scoping a shape is worth nothing once
 * the premise silently stops holding.
 */
describe("EL.2 practice templates (graph exponentials and transformations)", () => {
  it("authors five shapes under EL.2 with distinct d8.el2 ids", () => {
    expect(EL2_TEMPLATES).toHaveLength(5);
    for (const template of EL2_TEMPLATES) {
      expect(template.node_id, template.template_id).toBe(EL2_NODE);
      expect(template.template_id.startsWith("d8.el2."), template.template_id).toBe(true);
    }
    expect(new Set(EL2_TEMPLATES.map((t) => t.template_id)).size).toBe(5);
  });

  it("composes the locked 1xL1 / 2xL2 / 2xL3 mix", () => {
    for (const [difficulty, expected] of [
      [1, 1],
      [2, 2],
      [3, 2],
    ] as const) {
      const atLevel = EL2_TEMPLATES.filter((t) => t.difficulty === difficulty);
      expect(atLevel.length, `L${difficulty}`).toBe(expected);
      // Two slots at a level must be fillable by two genuinely different shapes.
      expect(new Set(atLevel.map((t) => t.template_id)).size, `L${difficulty}`).toBe(
        expected,
      );
    }
  });

  /**
   * Every template declares a `varietyKey`, and the pool freezer will not accept two
   * instances in one cell that share one. It gives up after 200 misses, so a template whose
   * parameter space is too narrow under-delivers its retry variants silently; the sweep below
   * proves each shape reaches well past the one pool item plus six variants it owes.
   */
  it("declares a varietyKey on every template, over a wide enough parameter space", () => {
    for (const template of EL2_TEMPLATES) {
      expect(typeof template.varietyKey, template.template_id).toBe("function");
      const keys = new Set<string>();
      for (let seed = 500_000; seed < 500_200; seed += 1) {
        const item = template.generate(createRng(seed), { form: "practice" });
        keys.add(template.varietyKey?.(item.params) ?? "");
      }
      // One pool item plus six retry variants is seven distinct keys owed per template; the
      // floor is set well above it so a narrowed parameter range fails here rather than
      // showing up as a silent shortfall in the frozen variant pool.
      expect(keys.size, template.template_id).toBeGreaterThanOrEqual(20);
    }
  });

  // Symbolic compares run through mathjs and cost far more per item than a numeric compare,
  // so this sweep needs more than vitest's 5s default (d5/d7/d8 budget the same way).
  it("every sampled instance self-validates through the v2 product checker", () => {
    expect(validateTemplates(EL2_TEMPLATES, 40, PRODUCT_CHECKER_CONFIG)).toEqual([]);
  }, 60_000);

  it("offers exactly the six transformation names its L3 prompt lists", () => {
    expect([...EL2_TRANSFORM_NAMES]).toEqual([
      "shift up",
      "shift down",
      "shift left",
      "shift right",
      "reflect over the x-axis",
      "reflect over the y-axis",
    ]);
  });

  /**
   * WHY `d8.el2.transform-rhs.l3` ASKS FOR THE EXPONENT, measured rather than asserted.
   *
   * The checker's expression grammar accepts `^` only over a constant integer exponent, so a
   * whole transformed right-hand side (`3 * 2^(x - 4)`) is refused before any comparison is
   * attempted. A prompt asking for it would therefore mark a learner wrong for typing exactly
   * what it asked for. The exponent on its own is an ordinary linear expression and grades
   * normally, which is the second half of this test.
   */
  /**
   * Every prompt this node can print, swept for the ungrammatical plural.
   *
   * `shifted $1$ units up` shipped on two shapes, wherever the drawn distance came out at
   * one: measured over 600 seeds, `d8.el2.anchor-point.l2` printed it on 52 draws and
   * `d8.el2.transform-rhs.l3` on 106, so about one in six of the harder template's prompts
   * was ungrammatical. A learner is not stopped by it, which is exactly why nobody would
   * report it and why it needs a sweep rather than a reading.
   *
   * Absence is the claim, so the counts under it are what stop the sweep passing over an
   * empty tray: the singular distance has to be DRAWN for the assertion to be about
   * anything, and it is floored separately from the sweep's size.
   */
  it("never prints a plural distance for a shift of one", () => {
    const prompts: string[] = [];
    for (const template of EL2_TEMPLATES) {
      for (let seed = 700_000; seed < 700_600; seed += 1) {
        prompts.push(template.generate(createRng(seed), { form: "practice" }).prompt);
      }
    }
    expect(prompts.length, "the sweep drew nothing").toBeGreaterThanOrEqual(3000);

    const measured = prompts.filter((prompt) => / units\b/.test(prompt));
    expect(
      measured.length,
      "no prompt measures a distance, so the plural rule has no subjects",
    ).toBeGreaterThanOrEqual(100);

    const plural = prompts.filter((prompt) => /\$1\$ units\b/.test(prompt));
    expect(
      plural.slice(0, 3),
      `${plural.length} of ${prompts.length} prompts say "$1$ units"`,
    ).toEqual([]);

    const singular = prompts.filter((prompt) => /\$1\$ unit\b/.test(prompt));
    expect(
      singular.length,
      "a distance of one is never drawn, so this sweep would pass on any wording",
    ).toBeGreaterThanOrEqual(20);
  });

  /**
   * The L1 hint tells the learner what to do with the constant, and half the draws subtract
   * it.
   *
   * "Read that constant off on its own" is a procedure, and on `y = 7 \cdot 2^{x} - 5` the
   * learner who follows it types `5` against a key of `-5`. Measured below rather than
   * argued: the template signs its constant with a coin flip, so a subtracted constant is
   * not an edge case. The sibling shape's third hint already carries the missing clause, so
   * the fix is the phrasing this node already uses and not a new one.
   *
   * The floor is what makes the wording assertion mean something: if the template stopped
   * drawing negatives the clause would no longer be owed, and this would say so.
   */
  it("tells the L1 learner to carry the constant's sign, because half the draws subtract it", () => {
    const asymptote = EL2_TEMPLATES.find((t) => t.template_id === "d8.el2.asymptote.l1");
    if (asymptote === undefined) {
      throw new Error("d8.el2.asymptote.l1 is not in the pool");
    }
    let negatives = 0;
    let hintCount = 0;
    for (let seed = 800_000; seed < 800_600; seed += 1) {
      const item = asymptote.generate(createRng(seed), { form: "practice" });
      hintCount += 1;
      if (!item.prompt.includes(` - ${Math.abs(Number(item.params.k))}$`)) {
        continue;
      }
      negatives += 1;
      expect(Number(item.params.k), item.prompt).toBeLessThan(0);
      // The hint is one string per draw, so the clause is asserted against the hints the
      // learner in front of this negative key actually gets.
      expect(
        (item.hints ?? []).join(" "),
        `a subtracted constant with no sign instruction: ${item.prompt}`,
      ).toMatch(/carrying the sign/);
    }
    expect(hintCount, "no draws were made").toBe(600);
    expect(
      negatives,
      "the template never subtracted its constant, so nothing above was tested",
    ).toBeGreaterThanOrEqual(150);
  });

  /**
   * The L3a hint's one concrete steer, checked against how often it points the right way.
   *
   * "A move in the opposite direction cuts into the shift already there rather than adding
   * to it" describes the minority of draws: the two shifts genuinely oppose on 264 of 600,
   * so on the other 56% the learner is steered toward subtracting where the amounts add.
   * The sentence is conditionally phrased, so it is never false, and it is still the only
   * concrete thing the hint says.
   *
   * Both counts are floored, because a hint covering both cases is only worth asserting
   * while both cases are drawn.
   */
  it("steers the L3a learner on both kinds of second shift, because both are drawn", () => {
    const shift = EL2_TEMPLATES.find((t) => t.template_id === "d8.el2.transform-rhs.l3");
    if (shift === undefined) {
      throw new Error("d8.el2.transform-rhs.l3 is not in the pool");
    }
    let oppose = 0;
    let agree = 0;
    let hints: string = "";
    for (let seed = 900_000; seed < 900_600; seed += 1) {
      const item = shift.generate(createRng(seed), { form: "practice" });
      const p = Number(item.params.p);
      const d = Number(item.params.d);
      if (p * d < 0) {
        oppose += 1;
      } else {
        agree += 1;
      }
      hints = (item.hints ?? []).join(" ");
    }
    expect(oppose, "the two shifts never opposed").toBeGreaterThanOrEqual(150);
    expect(agree, "the two shifts always opposed").toBeGreaterThanOrEqual(150);
    expect(hints, "the hint does not say what a second move the SAME way does").toMatch(
      /adds to the shift already there/,
    );
    expect(hints, "the hint does not say what a move the other way does").toMatch(
      /cuts into it/,
    );
  });

  it("cannot grade a variable exponent, which is why the L3 shape asks for the exponent", () => {
    const versions = [
      {
        item_version_id: "spike:el-2:whole-rhs",
        node_id: EL2_NODE,
        answer: expressionAnswer("3 * 2^(x - 4)", ["x"], "combined_polynomial"),
      },
      {
        item_version_id: "spike:el-2:exponent-only",
        node_id: EL2_NODE,
        answer: expressionAnswer("x - 4", ["x"], "combined_polynomial"),
      },
    ];
    const checker = createProductAnswerChecker({ itemVersions: versions });

    const wholeRhs = checker({
      raw_answer: "3 * 2^(x - 4)",
      item_version_id: "spike:el-2:whole-rhs",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(wholeRhs.status).toBe("invalid_input");
    expect(wholeRhs.reason_code).toBe("unsupported_exponent");

    const exponentOnly = checker({
      raw_answer: "x - 4",
      item_version_id: "spike:el-2:exponent-only",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(exponentOnly.status).toBe("correct");
  });
});
