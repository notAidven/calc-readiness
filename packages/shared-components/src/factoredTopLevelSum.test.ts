import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";
import { PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

/**
 * "Factor completely" is an instruction about the FORM of the answer, so an expression whose
 * outermost operation is `+` cannot satisfy it, however right its value is.
 *
 * ## The defect (swarm ledger F4, adjudicated key-blind in
 * `practice-solve-scratch/adjudication/factoring-adjudication.md`)
 *
 * `d4.pol2.grouping.l3` keys `(x + 9)(x^2 + 13)` and accepted `x^2(x + 9) + 13(x + 9)` as
 * `correct` on 32 of 60 draws. That string is the grouping step abandoned one line early: the
 * common `(x + 9)` has been exposed and not pulled out. It is exactly the move the item exists
 * to assess, so accepting it certifies as mastered the one step the learner did not take. The
 * referee rejected the equivalence-only defence on a reductio — under equivalence-only grading
 * a learner could resubmit the prompt verbatim and be marked correct, so an equivalence-only
 * grader on a factoring item tests nothing.
 *
 * ## The mechanism, which is a `toString` round trip and not a rule about sums
 *
 * `collectFactors` cannot split a top-level `+`, so it pushes the whole sum as one "factor",
 * and `factorIssue` then re-read that node by PRINTING it and handing the string back to
 * `math.rationalize`. The print is not the input: this mathjs instance is configured
 * `number: "Fraction"`, so `x^2(x + 9) + 13(x + 9)` prints as
 * `x ^ 2/1 (x + 9/1) + 13/1 (x + 9/1)` — and mathjs binds an implicit product TIGHTER than
 * division, so the reprint parses as `x^(2/(x + 9)) + 13/(x + 9)`, a different expression
 * entirely. `rationalize` read that as a degree-2 polynomial, `factorIssue` found the
 * discriminant negative, called the whole sum an irreducible quadratic factor, and returned no
 * issue. Written with an explicit `*` the reprint keeps its meaning, the degree comes back 3,
 * and the same submission was refused `unsupported_factor_degree` — which is why one character
 * flipped the verdict. Both readings are now taken off the AST, so neither can happen.
 *
 * ## The trap this rule has to survive
 *
 * An item whose complete factorisation over the integers IS an irreducible polynomial has a KEY
 * that is itself a top-level sum: "factor completely: x^2 + 13" is answered `x^2 + 13`. A flat
 * refusal of a top-level sum would refuse that item's own key, which is the RAD.1 defect
 * (a pool that rejects the answer it asks for) in a new place. So the rule is conditional on the
 * KEY's own top-level operation, and both halves of that condition are asserted below:
 * a sum-keyed item still takes its key, and a product-keyed item refuses a sum.
 *
 * The served population was enumerated before the rule was written, out of process (the frozen
 * bank is not importable from this package): all 42 served
 * `required_form: fully_factored_over_integers` instances have a key whose top-level operation
 * is `*`, over 6 templates — `d4.pol2.gcf.l1`, `d4.pol2.trinomial.l2`, `d4.pol2.difference.l2`,
 * `d4.pol2.leading.l3`, `d4.pol2.grouping.l3`, `d4.pol7.build-from-graph.l3`. So no served item
 * is exempted by the condition today, and the exemption exists for the cohort the docstrings
 * warn about rather than for a cohort that ships. `f4:prime:v2` below is the exemption's
 * standing witness: delete the condition and it fails.
 */

function spec(overrides: Partial<AnswerSpec>): AnswerSpec {
  return {
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
    ...overrides,
  };
}

const factoredItem = (item_version_id: string, answer_key: string): ProductItemVersion => ({
  item_version_id,
  node_id: "POL.2",
  answer: {
    answer_key,
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "fully_factored_over_integers",
    }),
  } satisfies AnswerDefinition,
});

/**
 * One item per key SHAPE the served bank holds, keyed with the bank's own spelling
 * (juxtaposed, `^` for a repeated factor), plus the sum-keyed exemption witness.
 */
const F4_ITEMS: readonly ProductItemVersion[] = [
  factoredItem("f4:grouping:v2", "(x + 9)(x^2 + 13)"),
  factoredItem("f4:grouping:star:v2", "(x + 9)*(x^2 + 13)"),
  factoredItem("f4:gcf:v2", "5(3x + 4)"),
  factoredItem("f4:trinomial:v2", "(x + 9)(x + 5)"),
  factoredItem("f4:difference:v2", "(3x + 7)(3x - 7)"),
  factoredItem("f4:leading:v2", "(4x + 1)(x + 4)"),
  factoredItem("f4:graph:v2", "-2(x + 1)^2(x - 3)(x - 5)"),
  factoredItem("f4:graphLead:v2", "-3(x - 1)(x - 4)(x - 5)^2"),
  // The exemption: a complete factorisation that IS a top-level sum.
  factoredItem("f4:prime:v2", "x^2 + 13"),
  factoredItem("f4:primeCubic:v2", "x^3 + 3x + 1"),
];

const FIXTURE_FACTORED_ITEMS = PRODUCT_SPIKE_ITEMS.filter(
  (version) =>
    version.answer.answer_spec.required_form === "fully_factored_over_integers" &&
    typeof version.answer.answer_key === "string",
);

const ALL_FACTORED_ITEMS: readonly ProductItemVersion[] = [
  ...F4_ITEMS,
  ...FIXTURE_FACTORED_ITEMS,
];

const checker = createProductAnswerChecker({
  itemVersions: [...ALL_FACTORED_ITEMS, ...PRODUCT_SPIKE_ITEMS],
});

function grade(item_version_id: string, raw_answer: unknown) {
  return checker({
    raw_answer,
    item_version_id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
}

// ---------------------------------------------------------------------------
// the derived spelling sweep
// ---------------------------------------------------------------------------

/** A key read as an optional leading integer factor and a list of bracketed factors. */
interface KeyShape {
  readonly lead: string | null;
  readonly factors: readonly { readonly body: string; readonly power: number }[];
}

const BRACKET_FACTOR = /\(([^()]+)\)(?:\^(\d+))?/g;

/**
 * Read a factored key into its parts, or `null` when the key is not of that shape (a key that
 * is a bare sum, notably). Reconstruction is checked against the input with spaces and `*`
 * removed, so a key this cannot fully account for is reported rather than silently half-read.
 */
function readKeyShape(key: string): KeyShape | null {
  const leadMatch = /^\s*(-?\d+)\s*\*?\s*(?=\()/.exec(key);
  const lead = leadMatch?.[1] ?? null;
  const rest = key.slice(leadMatch?.[0].length ?? 0);
  const factors: { body: string; power: number }[] = [];
  BRACKET_FACTOR.lastIndex = 0;
  let match = BRACKET_FACTOR.exec(rest);
  while (match) {
    factors.push({ body: match[1] ?? "", power: Number(match[2] ?? "1") });
    match = BRACKET_FACTOR.exec(rest);
  }
  if (factors.length === 0) {
    return null;
  }
  const shape: KeyShape = { lead, factors };
  const strip = (text: string): string => text.replace(/[\s*]/g, "");
  return strip(render(shape, { star: false })) === strip(key) ? shape : null;
}

function render(
  shape: KeyShape,
  options: { star: boolean; expandPowers?: boolean; reverse?: boolean },
): string {
  const factors = options.reverse ? [...shape.factors].reverse() : shape.factors;
  const parts: string[] = [];
  for (const factor of factors) {
    if (options.expandPowers) {
      for (let i = 0; i < factor.power; i += 1) {
        parts.push(`(${factor.body})`);
      }
    } else {
      parts.push(
        factor.power === 1 ? `(${factor.body})` : `(${factor.body})^${factor.power}`,
      );
    }
  }
  const join = options.star ? "*" : "";
  const body = parts.join(join);
  if (shape.lead === null) {
    return body;
  }
  return `${shape.lead}${options.star ? "*" : ""}${body}`;
}

/**
 * The spellings that MUST stay `correct`. Every one is a transformation of the item's own key,
 * so this sweep is about the key the bank holds and not about hand-typed strings.
 */
const ACCEPTED_SPELLINGS: readonly {
  readonly name: string;
  readonly spell: (shape: KeyShape) => string;
}[] = [
  { name: "as authored", spell: (shape) => render(shape, { star: false }) },
  { name: "explicit *", spell: (shape) => render(shape, { star: true }) },
  {
    name: "repeated factor written out",
    spell: (shape) => render(shape, { star: true, expandPowers: true }),
  },
  {
    name: "repeated factor written out, juxtaposed",
    spell: (shape) => render(shape, { star: false, expandPowers: true }),
  },
  {
    name: "factors reordered",
    spell: (shape) => render(shape, { star: true, reverse: true }),
  },
  {
    name: "factors reordered, juxtaposed",
    spell: (shape) => render(shape, { star: false, reverse: true }),
  },
];

const SUM_KEYED_IDS = new Set(["f4:prime:v2", "f4:primeCubic:v2"]);

const PRODUCT_KEYED_ITEMS = ALL_FACTORED_ITEMS.filter(
  (version) => !SUM_KEYED_IDS.has(version.item_version_id),
);

const SPELLING_CASES = PRODUCT_KEYED_ITEMS.flatMap((version) => {
  const shape = readKeyShape(version.answer.answer_key ?? "");
  if (!shape) {
    return [];
  }
  return ACCEPTED_SPELLINGS.map((spelling) => ({
    name: `${version.item_version_id} :: ${spelling.name}`,
    item_version_id: version.item_version_id,
    raw_answer: spelling.spell(shape),
  }));
});

describe("the accepted spellings of a factored key are still accepted", () => {
  it("every product-keyed item was read into factors (nothing silently skipped)", () => {
    expect(PRODUCT_KEYED_ITEMS.length).toBeGreaterThanOrEqual(9);
    const unread = PRODUCT_KEYED_ITEMS.filter(
      (version) => readKeyShape(version.answer.answer_key ?? "") === null,
    );
    expect(unread.map((version) => version.item_version_id)).toEqual([]);
    expect(SPELLING_CASES.length).toBe(
      PRODUCT_KEYED_ITEMS.length * ACCEPTED_SPELLINGS.length,
    );
    // The sweep has to contain a repeated factor written out both ways and a leading
    // constant, or it stops covering the spellings the referee cleared.
    expect(
      SPELLING_CASES.filter((testCase) => /\(x \+ 1\)\(x \+ 1\)/.test(testCase.raw_answer))
        .length,
      "the written-out repeated factor left the sweep",
    ).toBeGreaterThanOrEqual(1);
    expect(
      PRODUCT_KEYED_ITEMS.filter(
        (version) => readKeyShape(version.answer.answer_key ?? "")?.lead !== null,
      ).length,
      "no leading-constant key left in the sweep",
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(SPELLING_CASES)("accepts $name", ({ item_version_id, raw_answer }) => {
    const result = grade(item_version_id, raw_answer);
    expect(result, `${raw_answer} -> ${result.status}/${result.reason_code}`).toMatchObject(
      {
        status: "correct",
        client_correct: true,
      },
    );
  });

  it("accepts the referee's cleared control verbatim", () => {
    // `-2*(x + 1)*(x + 1)*(x - 3)*(x - 5)` against `-2(x + 1)^2(x - 3)(x - 5)`: the
    // adjudication cleared this explicitly, and it MUST stay accepted.
    expect(grade("f4:graph:v2", "-2*(x + 1)*(x + 1)*(x - 3)*(x - 5)")).toMatchObject({
      status: "correct",
    });
  });
});

// ---------------------------------------------------------------------------
// the refusal
// ---------------------------------------------------------------------------

/**
 * A top-level sum on a product-keyed item, in every spelling that matters. Each expands to its
 * key exactly, so `value_mismatch` cannot be what refuses them: the only thing wrong with any of
 * these is the FORM.
 *
 * `reason` is asserted per case rather than pinned to `not_factored` throughout, because the
 * factor-level checks that ALREADY scored some of these are left saying what they said. On a
 * sum the reader can read, `reducible_factor` ("what you wrote can still be factored") and
 * `not_primitive` ("its coefficients share a factor") are true, specific and already `incorrect`;
 * the form rule takes over exactly where the old reading produced a verdict a learner cannot act
 * on — `correct`, or an `unsupported_*` that reads as "we couldn't read that". Keeping the
 * scored codes is also what leaves every shipped fixture expectation untouched.
 */
const NOT_FACTORED_CASES: readonly {
  readonly item_version_id: string;
  readonly raw_answer: string;
  readonly reason: string;
  readonly was: string;
  readonly note: string;
}[] = [
  {
    item_version_id: "f4:grouping:v2",
    raw_answer: "x^2(x + 9) + 13(x + 9)",
    reason: "not_factored",
    was: "correct / match",
    note: "the abandoned grouping, juxtaposed (the measured false positive)",
  },
  {
    item_version_id: "f4:grouping:v2",
    raw_answer: "x^2*(x + 9) + 13*(x + 9)",
    reason: "not_factored",
    was: "unsupported_expression / unsupported_factor_degree",
    note: "the same answer with an explicit *, which used to differ",
  },
  {
    item_version_id: "f4:grouping:star:v2",
    raw_answer: "x^2(x + 9) + 13(x + 9)",
    reason: "not_factored",
    was: "correct / match",
    note: "the abandoned grouping against a star-spelled key",
  },
  {
    item_version_id: "f4:grouping:v2",
    raw_answer: "x^3 + 9x^2 + 13x + 117",
    reason: "not_factored",
    was: "unsupported_expression / unsupported_factor_degree",
    note: "the prompt handed back verbatim (the referee's reductio)",
  },
  {
    item_version_id: "f4:graphLead:v2",
    raw_answer: "-3x^4 + 45x^3 - 237x^2 + 495x - 300",
    reason: "not_primitive",
    was: "unsupported_expression / unsupported_factor_degree",
    note: "expanded quartic (P2-b, degree 4): now scored, on the -3 it never divided out",
  },
  {
    item_version_id: "f4:trinomial:v2",
    raw_answer: "x^2 + 14x + 45",
    reason: "reducible_factor",
    was: "incorrect / reducible_factor",
    note: "expanded quadratic: already scored, and still scored",
  },
  {
    item_version_id: "f4:gcf:v2",
    raw_answer: "15x + 20",
    reason: "not_primitive",
    was: "incorrect / not_primitive",
    note: "expanded linear: already scored, and still scored",
  },
  {
    item_version_id: "f4:difference:v2",
    raw_answer: "9x^2 - 49",
    reason: "reducible_factor",
    was: "incorrect / reducible_factor",
    note: "expanded difference of squares: already scored",
  },
];

describe("a top-level sum is not a factorisation (F4, P2-b)", () => {
  it.each(NOT_FACTORED_CASES)(
    "$item_version_id :: $raw_answer is $reason ($note)",
    ({ item_version_id, raw_answer, reason }) => {
      const result = grade(item_version_id, raw_answer);
      expect(
        result,
        `${raw_answer} -> ${result.status}/${result.reason_code}`,
      ).toMatchObject({
        status: "incorrect",
        reason_code: reason,
        client_correct: false,
      });
    },
  );

  it("no top-level sum on a product-keyed item is accepted or called unreadable", () => {
    // The load-bearing claim, stated once over the whole set: whatever the reason code, every
    // one of these is a SCORED miss. `correct` was the false positive and `unsupported_*` is
    // the verdict the engine declines to score, so both are ruled out here.
    expect(NOT_FACTORED_CASES.length).toBeGreaterThanOrEqual(8);
    expect(
      NOT_FACTORED_CASES.filter((testCase) => testCase.was.startsWith("correct")).length,
      "the measured false positive left the set",
    ).toBeGreaterThanOrEqual(2);
    const notScored = NOT_FACTORED_CASES.filter(
      (testCase) =>
        grade(testCase.item_version_id, testCase.raw_answer).status !== "incorrect",
    );
    expect(notScored.map((testCase) => testCase.raw_answer)).toEqual([]);
  });

  it("a negated product is still a product", () => {
    // The refusal strips a leading unary minus before it looks, so a learner who brackets the
    // whole factorisation and negates it is not caught by a rule about sums.
    expect(grade("f4:graph:v2", "-(2*(x + 1)^2*(x - 3)*(x - 5))")).toMatchObject({
      status: "correct",
    });
    expect(grade("f4:graph:v2", "-(2(x + 1)^2(x - 3)(x - 5))")).toMatchObject({
      status: "correct",
    });
  });
});

describe("the sum-keyed exemption, asserted both ways", () => {
  it("no sum-keyed item is refused for the form its own key has", () => {
    expect(SUM_KEYED_IDS.size).toBeGreaterThanOrEqual(2);
    for (const id of SUM_KEYED_IDS) {
      const version = ALL_FACTORED_ITEMS.find((entry) => entry.item_version_id === id);
      expect(version, id).toBeDefined();
      const key = version?.answer.answer_key ?? "";
      const result = grade(id, key);
      expect(
        result.reason_code,
        `${id} :: ${key} -> ${result.status}/${result.reason_code}`,
      ).not.toBe("not_factored");
    }
  });

  it("a prime QUADRATIC key still self-passes", () => {
    // The shippable half of the exempted cohort, and the one the rule exists to protect: an
    // item keyed `x^2 + 13` accepts its own key.
    const result = grade("f4:prime:v2", "x^2 + 13");
    expect(result, `x^2 + 13 -> ${result.status}/${result.reason_code}`).toMatchObject({
      status: "correct",
    });
  });

  it("a prime CUBIC key is unsupported for a reason that predates this rule", () => {
    // `factorIssue` supports irreducibility to degree 2 only, so a degree-3 factor is
    // `unsupported_factor_degree` however it is written — which is why no such item can ship
    // (`validateTemplates` grades every key against the real checker). Pinned so that whoever
    // lifts the degree limit is told to re-read the exemption above rather than discovering
    // this by surprise.
    const result = grade("f4:primeCubic:v2", "x^3 + 3x + 1");
    expect(result).toMatchObject({
      status: "unsupported_expression",
      reason_code: "unsupported_factor_degree",
    });
  });

  it("every exempted key really is a top-level sum, and no other key is", () => {
    // The list cannot go on excusing something that has stopped describing it: an entry whose
    // key becomes a product fails here, and a product-keyed item whose key becomes a sum fails
    // here too.
    for (const version of ALL_FACTORED_ITEMS) {
      const key = version.answer.answer_key ?? "";
      const isSum = readKeyShape(key) === null;
      expect(isSum, `${version.item_version_id} :: ${key}`).toBe(
        SUM_KEYED_IDS.has(version.item_version_id),
      );
    }
  });

  it("a sum-keyed item still refuses a sum that is not its value", () => {
    const result = grade("f4:prime:v2", "x^2 + 14");
    expect(result).toMatchObject({ status: "incorrect", reason_code: "value_mismatch" });
  });
});
