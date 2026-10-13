// The repo ships no `@types/node`, by the decision recorded at the head of
// `packages/item-bank/src/d6.test.ts`, which makes the same source-reading check. `packages/
// economy` takes the other route open to it and excludes its fs-reading tests from tsc in its
// own `tsconfig.json`; shared-components' has no such exclusion and a test file is not the
// place to add one. The call runs under vitest's node runtime.
// @ts-expect-error - no @types/node in this tree
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * An identity decided by SAMPLING must not be decided at points an answer can be built around.
 *
 * ## The defect this file was written for (strictness report L8/L9)
 *
 * `IDENTITY_SAMPLE_POINTS` was ten hard-coded numbers, and `LOG_SAMPLE_POINTS` another ten. A
 * fixed point set is a published list of the only places an answer is ever checked, so the
 * defeat is a one-liner: add a polynomial that vanishes at exactly those ten points.
 *
 *     d2.exp.product.l1:practice:60000, key "x^5"
 *     x^5+(x-1.7)*(x-2.3)*(x-3.1)*(x+1.3)*(x+2.9)*(x-4.2)*(x-5.3)*(x+3.7)*(x-2.6)*(x-3.8)
 *     -> ACCEPTED (correct / match), 83 characters
 *
 * At `x = 0` that expression is about -9.0e4 where `x^5` is 0. It is not a simplification of
 * anything and it is not an answer to the prompt. Measured through the full submit path:
 * ACCEPTED on 34 of 34 exponent items and on 21 of 28 log items (the other 7 exceed the
 * 128-character input cap once the key is prefixed). It also worked on the two-symbol item,
 * because a polynomial vanishing in `x` alone kills every `(x, y)` tuple the strides visit.
 *
 * Dropping ONE factor made it `incorrect / value_mismatch`, which is what identifies this as a
 * fixed-point-set defeat rather than a tolerance defeat: the sampler is decisive the moment a
 * single probe survives, and the attack's whole content is knowing where the probes are.
 *
 * ## The fix, and why the seed is DERIVED rather than random
 *
 * The battery is now twenty points per call, and each is a fixed base nudged by an offset
 * derived from a 32-bit FNV-1a hash of the SUBMITTED STRING and the KEY. So the points are not
 * knowable before the answer is written, and building a product that vanishes at them requires
 * a string whose own hash names the roots it contains — a preimage problem, not an exercise.
 *
 * Determinism is not negotiable here and an RNG would have broken it: both sampler docstrings
 * record that Node and Chromium must return identical verdicts for the same submission, and a
 * checker that graded a resubmission differently would be worse than the hole it closed. The
 * hash is integer-only (`Math.imul`, `>>> 0`, `charCodeAt`), so it is bit-identical in every JS
 * engine, and the stability tests below assert one verdict over repeated calls. The
 * cross-process half of that claim cannot be made from inside one vitest worker and was
 * measured separately over the whole served cohort in two separate node processes.
 *
 * ## The population is every comparator that decides identity by sampling
 *
 * Not every comparator that IMPORTS the battery: `compareVertexForm` reaches `sameFunction`
 * too, and serves 0 items in today's pool, so a test scoped to the reachable cohort would have
 * left it out and a later POL.5 authoring wave would have shipped the defect back. The last
 * describe block derives the caller set from the source and fails if it grows.
 */

function spec(overrides: Partial<AnswerSpec>): AnswerSpec {
  return {
    answer_type: "expression",
    equivalence: "symbolic",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
    ...overrides,
  };
}

/** The ten points that used to BE the battery — the attack's entire input. */
const RETIRED_IDENTITY_POINTS: readonly number[] = [
  1.7, 2.3, 3.1, -1.3, -2.9, 4.2, 5.3, -3.7, 2.6, 3.8,
];
const RETIRED_LOG_POINTS: readonly number[] = [
  1.7, 2.3, 3.1, 4.2, 5.3, 2.6, 3.8, 6.1, 7.4, 1.9,
];

function vanishingProduct(symbol: string, points: readonly number[]): string {
  return points.map((p) => (p < 0 ? `(${symbol}+${-p})` : `(${symbol}-${p})`)).join("*");
}

const ITEMS: readonly ProductItemVersion[] = [
  {
    item_version_id: "exp:one-symbol",
    node_id: "EXP.1",
    answer: {
      answer_key: "x^5",
      allowed_symbols: ["x"],
      answer_spec: spec({ simplification: "positive_exponents" }),
    } as AnswerDefinition,
  },
  {
    item_version_id: "exp:two-symbol",
    node_id: "EXP.1",
    answer: {
      answer_key: "x^3/y^4",
      allowed_symbols: ["x", "y"],
      answer_spec: spec({ simplification: "positive_exponents" }),
    } as AnswerDefinition,
  },
  {
    item_version_id: "log:expand-product",
    node_id: "EL.5",
    answer: {
      answer_key: "log(y) + log(n)",
      allowed_symbols: ["y", "n"],
      answer_spec: spec({ required_form: "is_expanded_log" }),
    } as AnswerDefinition,
  },
  {
    item_version_id: "log:expand-power",
    node_id: "EL.5",
    answer: {
      answer_key: "5 * log(b) + log(m)",
      allowed_symbols: ["b", "m"],
      answer_spec: spec({ required_form: "is_expanded_log" }),
    } as AnswerDefinition,
  },
  {
    item_version_id: "vertex:pol5",
    node_id: "POL.5",
    answer: {
      answer_key: "2*(x-3)^2+5",
      allowed_symbols: ["x"],
      answer_spec: spec({ required_form: "is_vertex_form" }),
    } as AnswerDefinition,
  },
];

const check = createProductAnswerChecker({ itemVersions: ITEMS });

function grade(id: string, rawAnswer: unknown): string {
  const result = check({
    raw_answer: rawAnswer,
    item_version_id: id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return `${result.status}/${result.reason_code}`;
}

describe("a product vanishing at the old probe points is refused", () => {
  it("refuses the demonstrated 83-character attack on the exponent path", () => {
    const attack = `x^5+${vanishingProduct("x", RETIRED_IDENTITY_POINTS)}`;
    expect(attack.length).toBeLessThanOrEqual(128);
    expect(grade("exp:one-symbol", attack)).toBe("incorrect/value_mismatch");
  });

  it("refuses it on the two-symbol item, where the strides bought nothing", () => {
    const attack = `x^3/y^4+${vanishingProduct("x", RETIRED_IDENTITY_POINTS)}`;
    expect(grade("exp:two-symbol", attack)).toBe("incorrect/value_mismatch");
  });

  it("refuses it on the log path, in both symbols", () => {
    expect(
      grade(
        "log:expand-product",
        `log(y) + log(n)+${vanishingProduct("y", RETIRED_LOG_POINTS)}`,
      ),
    ).toBe("incorrect/value_mismatch");
    expect(
      grade(
        "log:expand-power",
        `5 * log(b) + log(m)+${vanishingProduct("b", RETIRED_LOG_POINTS)}`,
      ),
    ).toBe("incorrect/value_mismatch");
  });

  it("refuses it on the vertex-form path, which serves 0 items today", () => {
    // In the population because it exhibits the behaviour, not because a learner can reach it.
    expect(
      grade("vertex:pol5", `2*(x-3)^2+5+${vanishingProduct("x", RETIRED_IDENTITY_POINTS)}`),
    ).toBe("incorrect/value_mismatch");
  });

  it("refuses a product built around SHIFTED point sets too", () => {
    // Not just the one published list: any ten-point set an attacker might guess.
    for (const shift of [0.05, -0.05, 0.5]) {
      const points = RETIRED_IDENTITY_POINTS.map((p) => p + shift);
      const attack = `x^5+${vanishingProduct("x", points)}`;
      if (attack.length > 128) {
        continue;
      }
      expect(grade("exp:one-symbol", attack), `shift ${shift}`).toBe(
        "incorrect/value_mismatch",
      );
    }
  });
});

describe("every legitimate spelling still grades correct", () => {
  it("accepts the key and the equivalent rewrites of it", () => {
    expect(grade("exp:one-symbol", "x^5")).toBe("correct/match");
    expect(grade("exp:one-symbol", "(x^5)")).toBe("correct/match");
    expect(grade("exp:one-symbol", "x^2*x^3")).toBe("correct/match");
    expect(grade("exp:one-symbol", "x*x*x*x*x")).toBe("correct/match");
    expect(grade("exp:one-symbol", "1*(x^5)")).toBe("correct/match");
    expect(grade("exp:one-symbol", "(x^5)/1")).toBe("correct/match");
    expect(grade("exp:one-symbol", "x^6/x")).toBe("correct/match");
    expect(grade("exp:two-symbol", "x^3/y^4")).toBe("correct/match");
    expect(grade("exp:two-symbol", "x^3*y^-4")).toBe("incorrect/not_simplified");
    expect(grade("log:expand-product", "log(y) + log(n)")).toBe("correct/match");
    expect(grade("log:expand-product", "log(n) + log(y)")).toBe("correct/match");
    expect(grade("log:expand-power", "5 * log(b) + log(m)")).toBe("correct/match");
    expect(grade("log:expand-power", "log(b) * 5 + log(m)")).toBe("correct/match");
    expect(grade("vertex:pol5", "2*(x-3)^2+5")).toBe("correct/match");
  });

  it("still refuses an ordinary wrong answer on its value", () => {
    expect(grade("exp:one-symbol", "x^4")).toBe("incorrect/value_mismatch");
    expect(grade("exp:two-symbol", "x^4/y^3")).toBe("incorrect/value_mismatch");
    expect(grade("log:expand-product", "log(y) - log(n)")).toBe("incorrect/value_mismatch");
  });
});

describe("the derived point set is deterministic", () => {
  it("returns one verdict for the same submission over many calls", () => {
    // A seed that varied per call — an RNG, a clock, a counter — would show up here as more
    // than one verdict, and would make a resubmission of the same answer a coin flip.
    const probes = [
      "x^5",
      "x^2*x^3",
      "x^4",
      `x^5+${vanishingProduct("x", RETIRED_IDENTITY_POINTS)}`,
    ];
    for (const probe of probes) {
      const verdicts = new Set(
        Array.from({ length: 50 }, () => grade("exp:one-symbol", probe)),
      );
      expect(verdicts.size, `${probe} -> ${[...verdicts].join(" | ")}`).toBe(1);
    }
    const logVerdicts = new Set(
      Array.from({ length: 50 }, () => grade("log:expand-product", "ln(y) + ln(n)")),
    );
    expect(logVerdicts.size).toBe(1);
  });

  it("derives the offsets with integer-only arithmetic", () => {
    // The determinism argument rests on this: `Math.imul` and `>>> 0` are exact 32-bit integer
    // operations, identical in every JS engine, where a float accumulation would not be. If
    // the hash is ever rewritten with `*` or `%` on large floats, this fails and the
    // cross-runtime claim in the docstrings has to be re-earned.
    const source = readFileSync(
      new URL("./product-answer-checker.ts", import.meta.url),
      "utf8",
    );
    const start = source.indexOf("function stringHash32(");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("\n}", start));
    expect(body).toMatch(/Math\.imul\(/);
    expect(body).toMatch(/>>> 0/);
    expect(body).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });
});

/**
 * The population: every comparator that decides an identity by sampling.
 *
 * Derived from the source, both ways. A new caller of either sampler fails here rather than
 * inheriting a battery nobody checked, and a caller that disappears fails too, so this list
 * cannot sit here naming something that has moved. `compareVertexForm` is the reason the
 * derivation matters: it serves no items today, so a population scoped to what the pool
 * reaches would have omitted it.
 */
describe("every sampling comparator is covered above", () => {
  const COVERED: readonly string[] = [
    "compareExponentExpression",
    "compareLogIdentity",
    "compareVertexForm",
  ];

  it("is exactly the three comparators this file grades", () => {
    const source = readFileSync(
      new URL("./product-answer-checker.ts", import.meta.url),
      "utf8",
    );
    const callers = new Set<string>();
    let current: string | null = null;
    for (const line of source.split("\n")) {
      const declaration = line.match(/^function ([A-Za-z0-9_]+)\(/);
      if (declaration?.[1]) {
        current = declaration[1];
      }
      if (
        /\b(sameFunction|sameLogFunction)\(/.test(line) &&
        current &&
        current !== "sameFunction" &&
        current !== "sameLogFunction"
      ) {
        callers.add(current);
      }
    }
    expect([...callers].sort()).toEqual([...COVERED].sort());
    expect(callers.size).toBeGreaterThanOrEqual(3);
  });

  it("leaves no hard-coded probe table behind either sampler", () => {
    // Both batteries were replaced; fixing one and leaving the other is the obvious way for
    // half of this to ship.
    const source = readFileSync(
      new URL("./product-answer-checker.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/const IDENTITY_SAMPLE_POINTS/);
    expect(source).not.toMatch(/const LOG_SAMPLE_POINTS/);
    expect(source).toMatch(/derivedSamplePoints\(/);
  });
});
