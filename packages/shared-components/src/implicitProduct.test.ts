import { describe, expect, it } from "vitest";

import {
  type AnswerDefinition,
  insertImplicitProductStar,
  math,
  type MathNode,
  type NodeShape,
} from "./checker-core";
import { createD1AnswerChecker, D1_CHECKER_VERSION } from "./d1-answer-checker";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";

/**
 * A JUXTAPOSED PRODUCT is read as multiplication, and the shapes that are deliberately
 * NOT.
 *
 * ## The defect
 *
 * Fourteen served D5 items key a denominator like `(11*x + 8)/(x*(x + 2))`, and the
 * spelling every textbook prints — `(11x + 8)/(x(x + 2))` — graded
 * `invalid_input / unsupported_syntax` on all fourteen. mathjs reads a bare identifier
 * immediately before `(` as a FUNCTION CALL, so the string parsed to a `FunctionNode` named
 * `x` and `inspectAst` refused it. §12 of `Answer_Equivalence_Spec.md` scores
 * `invalid_input` as UNANSWERED, so the learner kept their mark, lost the attempt, and was
 * told only "Check the format so the expression can be read" — with nothing on the card
 * naming the star except a key on the keypad.
 *
 * ## Why this file rules on SHAPES rather than on one string
 *
 * "Implicit multiplication" is several different readings with different risks, and mathjs
 * already implements most of them. Each row of {@link SHAPE_RULINGS} names one shape, says
 * whether it is read as a product, and says which layer decides — because for most of them
 * the answer is "mathjs already did, and this change did not touch it". The refusals are
 * pinned as hard as the acceptances: a shape this file records as refused must FAIL if a
 * later edit starts accepting it.
 *
 * ## The safety argument, and where it is checked
 *
 * The whole change rests on one claim: a bare identifier before `(` cannot be a function
 * call in this grammar, because every function name the grammar admits is a fixed literal in
 * `checker-core.ts` and none is read from item data. Two things follow, and both are checked
 * below rather than argued:
 *
 *  - *"never rewrites a name the grammar can call"* pins each of the six by name;
 *  - *"only ever moves a string the grammar already refused"* is the ADDITIVITY property in
 *    `Answer_Equivalence_Spec.md` §13.13 terms: over the whole probe corpus, every string
 *    the rewrite changes is one whose mathjs parse holds a call to a name outside those six,
 *    and `inspectAst` refuses such a call under EVERY `allowedFunctions` configuration this
 *    package passes it. So the only verdict the change can move is an `invalid_input`.
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

/** The D5 shape that motivated the change: a `rational_answer` keyed with a factored LCD. */
const RATIONAL_KEY = "(11*x + 8)/(x*(x + 2))";

const ITEMS: readonly {
  item_version_id: string;
  node_id: string;
  answer: AnswerDefinition;
}[] = [
  {
    item_version_id: "juxt:rat-3:lcd:v2",
    node_id: "RAT.3",
    answer: {
      answer_key: RATIONAL_KEY,
      allowed_symbols: ["x"],
      excluded_values: ["0", "-2"],
      answer_spec: spec({ answer_type: "rational_answer", equivalence: "symbolic" }),
    },
  },
  {
    item_version_id: "juxt:num-3:linear:v2",
    node_id: "NUM.3",
    answer: {
      answer_key: "2*x",
      allowed_symbols: ["x"],
      answer_spec: spec({
        answer_type: "expression",
        equivalence: "symbolic",
        simplification: "combined_polynomial",
      }),
    },
  },
  {
    item_version_id: "juxt:num-2:product:v2",
    node_id: "NUM.2",
    answer: {
      answer_key: "2*(x + 1)",
      allowed_symbols: ["x"],
      answer_spec: spec({ answer_type: "expression", equivalence: "symbolic" }),
    },
  },
  {
    item_version_id: "juxt:rad-4:abs:v2",
    node_id: "RAD.4",
    answer: {
      answer_key: "abs(x)",
      allowed_symbols: ["x"],
      answer_spec: spec({
        answer_type: "numeric",
        representation: "exact",
        simplification: "simplified_radical",
      }),
    },
  },
  {
    item_version_id: "juxt:el-5:log:v2",
    node_id: "EL.5",
    answer: {
      answer_key: "log(m) + log(a)",
      allowed_symbols: ["m", "a"],
      answer_spec: spec({
        answer_type: "expression",
        equivalence: "symbolic",
        required_form: "is_expanded_log",
      }),
    },
  },
  // Declares NOTHING, so both normalizations are switched off entirely.
  {
    item_version_id: "juxt:num-1:plain:v2",
    node_id: "NUM.1",
    answer: { answer_key: "12", answer_spec: spec({}) },
  },
];

const productChecker = createProductAnswerChecker({ itemVersions: ITEMS });

/**
 * The same corpus at v1, because the rewrite lives in `prepareRawAnswer` in the shared
 * `checker-core.ts` and so reaches the LOCKED D1 generation too — which is also the
 * generation the CFU card grades at (`cfuChecker.ts` builds a `createD1AnswerChecker`).
 * v1 admits NO function names at all, so if the rewrite ever fired on one, this is where a
 * call would silently become a product.
 */
const d1Checker = createD1AnswerChecker({
  itemVersions: ITEMS.map((entry) => ({
    item_version_id: `${entry.item_version_id}:v1`,
    node_id: entry.node_id as never,
    answer: entry.answer,
  })),
});

function grade(itemVersionId: string, rawAnswer: unknown): string {
  const item = ITEMS.find((entry) => entry.item_version_id === itemVersionId);
  const raw =
    item?.answer.answer_spec.answer_type === "rational_answer" &&
    typeof rawAnswer === "string"
      ? { expression: rawAnswer, excluded_values: item.answer.excluded_values ?? [] }
      : rawAnswer;
  const result = productChecker({
    raw_answer: raw,
    item_version_id: itemVersionId,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return `${result.status}/${result.reason_code}`;
}

function gradeAtV1(itemVersionId: string, rawAnswer: unknown): string {
  const result = d1Checker({
    raw_answer: rawAnswer,
    item_version_id: `${itemVersionId}:v1`,
    equivalence_checker_version: D1_CHECKER_VERSION,
  });
  return `${result.status}/${result.reason_code}`;
}

// ---------------------------------------------------------------------------
// The shape-by-shape ruling.
// ---------------------------------------------------------------------------

type Ruling = readonly [
  shape: string,
  submitted: string,
  item: string,
  verdict: string,
  note: string,
];

/**
 * Every shape of implicit multiplication, ruled on. `verdict` is what the real checker
 * returns, so a row reading `invalid_input/...` is a REFUSAL this file requires to keep
 * failing, and a row reading `correct/match` is an acceptance it requires to keep passing.
 */
const SHAPE_RULINGS: readonly Ruling[] = [
  // --- ACCEPTED, and the one shape this change is responsible for -------------
  [
    "symbol before a bracket",
    "(11x + 8)/(x(x + 2))",
    "juxt:rat-3:lcd:v2",
    "correct/match",
    "THE FIX: mathjs read `x(` as a call; the star is inserted so it is a product.",
  ],
  [
    "symbol before a bracket, with a space",
    "(11x + 8)/(x (x + 2))",
    "juxt:rat-3:lcd:v2",
    "correct/match",
    "mathjs reads `x (` as the same call, so the space is incidental and handled too.",
  ],
  [
    "symbol before a bracket, upper-cased by a phone keyboard",
    "X(2)",
    "juxt:num-3:linear:v2",
    "correct/match",
    "The star goes in BEFORE the case fold, so `X(` is separated and then folded onto `x`. Only on the paths that reach `prepareRawAnswer`; see the recorded gap on the rational path below.",
  ],
  [
    "symbol before a numeric bracket",
    "x(2)",
    "juxt:num-3:linear:v2",
    "correct/match",
    "`x(2)` is `2*x`, which is this item's key.",
  ],
  // --- ACCEPTED ALREADY, by mathjs, and untouched by this change --------------
  [
    "number before a symbol",
    "2x",
    "juxt:num-3:linear:v2",
    "correct/match",
    "mathjs parses an implicit `*`; §11 already declares the reading (`1/2x` is `(1/2)*x`).",
  ],
  [
    "number before a bracket",
    "2(x + 1)",
    "juxt:num-2:product:v2",
    "correct/match",
    "mathjs parses an implicit `*`.",
  ],
  [
    "bracket before a bracket",
    "(2)(x + 1)",
    "juxt:num-2:product:v2",
    "correct/match",
    "mathjs parses an implicit `*`.",
  ],
  [
    "call before a bracket",
    "abs(x)(1)",
    "juxt:rad-4:abs:v2",
    "correct/match",
    "The call is preserved AND the juxtaposed bracket after it is a product.",
  ],
  // --- REFUSED, deliberately -------------------------------------------------
  [
    "two symbols run together",
    "xy",
    "juxt:num-3:linear:v2",
    "invalid_input/unknown_symbol",
    "THE DANGEROUS ONE. mathjs lexes consecutive letters as ONE identifier, so `xy` is the symbol `xy`. Splitting it would be the checker inventing a reading, and would silently change meaning the day a multi-character variable name is admitted.",
  ],
  [
    "a symbol repeated without a star",
    "3xx/2",
    "juxt:num-3:linear:v2",
    "invalid_input/unknown_symbol",
    "Same lexing: `xx` is one identifier, not `x*x`.",
  ],
  [
    "an undeclared identifier before a bracket",
    "f(x)",
    "juxt:num-3:linear:v2",
    "invalid_input/unsupported_syntax",
    "`f` is not a symbol this item declares, so reading it as a product would be a guess. Verdict AND reason code are byte-identical to before the change.",
  ],
  [
    "a mathjs builtin before a bracket",
    "sin(x)",
    "juxt:num-3:linear:v2",
    "invalid_input/unsupported_syntax",
    "Not a name in the grammar and not a declared symbol, so still refused.",
  ],
  [
    "an upper-cased grammar function name",
    "SQRT(4)",
    "juxt:num-3:linear:v2",
    "invalid_input/unsupported_syntax",
    "The function-name check is case-insensitive, which can only DECLINE to insert a star.",
  ],
];

describe("juxtaposed products: the shape-by-shape ruling", () => {
  it.each(SHAPE_RULINGS)(
    "%s — `%s` grades %s => %s",
    (_shape, submitted, itemVersionId, verdict) => {
      expect(grade(itemVersionId, submitted)).toBe(verdict);
    },
  );

  /**
   * A FLOOR under each half, so the table cannot drift into being all acceptances (which
   * would make the refusals decorative) or all refusals (which would make the fix absent).
   */
  it("rules on both acceptances and refusals", () => {
    const accepted = SHAPE_RULINGS.filter(([, , , verdict]) => verdict === "correct/match");
    const refused = SHAPE_RULINGS.filter(([, , , verdict]) =>
      verdict.startsWith("invalid_input"),
    );
    expect(accepted.length, "shapes read as a product").toBeGreaterThanOrEqual(8);
    expect(refused.length, "shapes deliberately refused").toBeGreaterThanOrEqual(5);
    expect(accepted.length + refused.length).toBe(SHAPE_RULINGS.length);
  });

  /**
   * §11 reserves a space between a number and a fraction for a MIXED NUMBER (`1 1/2` is
   * `3/2`), a reading mathjs does not implement — it reads `1 * 1/2`. That disagreement is
   * PRE-EXISTING and is deliberately not touched here: extending the rewrite to
   * space-separated juxtaposition would have to pick a side of an ambiguity §11 has already
   * ruled on, and would move verdicts. Recorded so the next reader does not mistake the
   * omission for an oversight.
   */
  it("leaves space-separated juxtaposition exactly as mathjs already reads it", () => {
    for (const shape of ["x y", "1 1/2", "2 x"]) {
      expect(insertImplicitProductStar(shape, ["x", "y"]), shape).toBe(shape);
    }
    // And `math.rationalize` does not normalize a space-juxtaposed product at all, which is
    // the second reason not to build on it.
    const numerator = (
      math.rationalize("(x y) - (x*y)", {}, true) as unknown as {
        numerator: { toString(): string };
      }
    ).numerator.toString();
    expect(numerator, "rationalize cancels a space-juxtaposed product").not.toBe("0");
  });
});

// ---------------------------------------------------------------------------
// The safety property: the six names are never rewritten.
// ---------------------------------------------------------------------------

/**
 * Every function name the grammar admits, enumerated from the `allowedFunctions` sets in
 * `checker-core.ts`, `product-answer-checker.ts` and `graph-comparator.ts`. Listed here as
 * the OTHER copy of `GRAMMAR_FUNCTION_NAMES`, so a name added to the grammar without being
 * added to the rewrite's exclusion set fails at the row for it.
 */
const GRAMMAR_FUNCTIONS: readonly string[] = [
  "sqrt",
  "nthRoot",
  "cbrt",
  "abs",
  "log",
  "ln",
];

describe("juxtaposed products: what the rewrite must never touch", () => {
  it.each(GRAMMAR_FUNCTIONS)(
    "never rewrites %s, which the grammar can call",
    (name: string) => {
      // Declared as a symbol AND used as a call: the function-name check wins, so a
      // hypothetical item declaring `log` cannot turn `log(2)` into `log * (2)`.
      expect(insertImplicitProductStar(`${name}(2)`, [name, "x"])).toBe(`${name}(2)`);
      expect(insertImplicitProductStar(`2*${name}(2)`, ["x"])).toBe(`2*${name}(2)`);
    },
  );

  it("never rewrites an identifier the item does not declare", () => {
    for (const name of ["f", "g", "sin", "cos", "tan", "y", "zz"]) {
      expect(insertImplicitProductStar(`${name}(2)`, ["x"]), name).toBe(`${name}(2)`);
    }
  });

  it("does nothing at all for an item that declares no symbols", () => {
    for (const shape of ["x(x + 2)", "2x", "f(x)", "sqrt(4)"]) {
      expect(insertImplicitProductStar(shape, undefined), shape).toBe(shape);
      expect(insertImplicitProductStar(shape, []), shape).toBe(shape);
    }
    expect(grade("juxt:num-1:plain:v2", "12")).toBe("correct/match");
  });

  it("switches itself off when two declared symbols differ only in case", () => {
    // The same precondition the case fold has always had, and for the same reason: with `x`
    // and `X` both declared there is no single spelling to map a token onto.
    expect(insertImplicitProductStar("x(2)", ["x", "X"])).toBe("x(2)");
    expect(insertImplicitProductStar("x(2)", ["x"])).toBe("x*(2)");
  });

  it("inserts nothing where there is no bracket to insert it before", () => {
    for (const shape of ["x + 2", "2x", "x*x", "x^2", "xy", "abs(x)"]) {
      expect(insertImplicitProductStar(shape, ["x", "y"]), shape).toBe(shape);
    }
  });

  /**
   * The rewrite runs after `MAX_INPUT_LENGTH`, so a 128-character answer can leave it longer
   * than 128 characters. `MAX_AST_NODES` / `MAX_AST_DEPTH` are what actually protect the CAS,
   * and each insertion adds exactly one node, so the worst case a 128-character input can
   * build still fails closed rather than running: this is the assertion that says the widening
   * cannot be used to hang the grader.
   */
  it("fails closed on the worst case the length limit still admits", () => {
    const nested = `${"x(".repeat(40)}1${")".repeat(40)}`;
    const repeated = "x(1)".repeat(32);
    expect(repeated.length, "the adversarial input is under the length limit").toBe(128);
    for (const shape of [nested, repeated]) {
      const started = Date.now();
      expect(grade("juxt:num-3:linear:v2", shape)).toBe(
        "invalid_input/expression_too_complex",
      );
      expect(Date.now() - started, "the grader took a visible amount of time").toBeLessThan(
        2000,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// The additivity property (§13.13): only an invalid_input can move.
// ---------------------------------------------------------------------------

/** Does `node` hold a call to a name OUTSIDE the grammar's six? */
function callsANameTheGrammarRefuses(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (node.type === "FunctionNode") {
    const name = (shaped.fn?.name ?? shaped.name ?? "").toLowerCase();
    if (!GRAMMAR_FUNCTIONS.map((value) => value.toLowerCase()).includes(name)) {
      return true;
    }
  }
  if (shaped.content && callsANameTheGrammarRefuses(shaped.content)) {
    return true;
  }
  return shaped.args?.some(callsANameTheGrammarRefuses) ?? false;
}

/** Strings covering every shape the rewrite could conceivably touch, and many it must not. */
const PROBE_CORPUS: readonly string[] = [
  RATIONAL_KEY,
  RATIONAL_KEY.replaceAll("*", ""),
  RATIONAL_KEY.replaceAll("*", " "),
  "x(x + 2)",
  "x (x + 2)",
  "X(X + 2)",
  "x(2)",
  "x(x)",
  "1/x(x + 2)",
  "-x(x + 2)",
  "2x",
  "2(x + 1)",
  "(x + 1)(x + 2)",
  "xy",
  "x y",
  "3xx/2",
  "1 1/2",
  "f(x)",
  "g(2)",
  "sin(x)",
  "cos(0)",
  "sqrt(4)",
  "abs(-3)",
  "cbrt(8)",
  "nthRoot(8, 3)",
  "log(2)",
  "ln(2)",
  "SQRT(4)",
  "nthroot(8, 3)",
  "abs(x)(x + 1)",
  "sqrt(2)(x + 1)",
  "m(a)",
  "a(m)",
  "pi(2)",
  "2pi",
];

/**
 * Every symbol the item bank declares, anywhere, as measured by
 * `packages/item-bank/src/implicitProductAdditive.test.ts` — which asserts this alphabet by
 * SET EQUALITY, so the bank cannot grow a symbol without failing there and sending its owner
 * here. Swept as sets of one and as the multi-symbol combinations D8 and D9 actually declare,
 * because the rewrite reads the whole declaration and not one symbol at a time.
 */
const DECLARED_SYMBOL_SETS: readonly (readonly string[])[] = [
  ["a"],
  ["b"],
  ["h"],
  ["m"],
  ["n"],
  ["p"],
  ["pi"],
  ["q"],
  ["t"],
  ["u"],
  ["v"],
  ["x"],
  ["y"],
  ["m", "a", "q"],
  ["x", "y"],
  ["v", "q", "x"],
];

describe("juxtaposed products: additivity (§13.13)", () => {
  /**
   * THE WHOLE VERSIONING ARGUMENT, mechanised.
   *
   * A string the rewrite leaves alone reaches the grader byte-for-byte as it did before, so
   * its verdict cannot have moved. A string the rewrite CHANGES is therefore the only thing
   * that can move — and every one of them is a string whose mathjs parse holds a call to a
   * name outside the grammar's six, which `inspectAst` refuses as `invalid_input` under
   * every `allowedFunctions` configuration this package passes it (pinned below). So no
   * `correct` and no `incorrect` verdict can move, in either checker generation.
   */
  it("only ever changes a string the grammar already refused", () => {
    let changed = 0;
    let untouched = 0;
    const symbolSets: readonly (readonly string[] | undefined)[] = [
      ...ITEMS.map((item) => item.answer.allowed_symbols),
      ...DECLARED_SYMBOL_SETS,
    ];
    for (const symbols of symbolSets) {
      for (const probe of PROBE_CORPUS) {
        const rewritten = insertImplicitProductStar(probe, symbols);
        if (rewritten === probe) {
          untouched += 1;
          continue;
        }
        changed += 1;
        let parsed: MathNode | undefined;
        try {
          parsed = math.parse(probe);
        } catch {
          parsed = undefined;
        }
        expect(
          parsed === undefined || callsANameTheGrammarRefuses(parsed),
          `${probe} (symbols ${JSON.stringify(symbols)}) was rewritten but did NOT parse to a call the grammar refuses, so its old verdict may have been a real one`,
        ).toBe(true);
      }
    }
    // Floors under both halves: containment over an empty set is free, and "nothing was
    // ever rewritten" would satisfy the assertion above without the fix existing.
    expect(changed, "strings the rewrite acts on").toBeGreaterThanOrEqual(20);
    expect(untouched, "strings it leaves alone").toBeGreaterThanOrEqual(100);
  });

  /**
   * The other half of the argument: a call to a name outside the six really is refused,
   * under each grammar the package parses with. Without this the claim above is only about
   * the AST shape and not about the verdict.
   */
  it.each([
    ["the default grammar (v1, and v2 numeric/polynomial)", "juxt:num-3:linear:v2"],
    ["the radical grammar (RAD.4)", "juxt:rad-4:abs:v2"],
    ["the log grammar (EL.5)", "juxt:el-5:log:v2"],
    ["the rational grammar (RAT.1-RAT.4)", "juxt:rat-3:lcd:v2"],
  ])("refuses a call to an undeclared name under %s", (_label, itemVersionId) => {
    expect(grade(itemVersionId, "zzz(2)")).toBe("invalid_input/unsupported_syntax");
  });

  /** The v1 generation takes the same rewrite, so it gets the same two directions. */
  it("reaches the locked v1 generation with the same two rulings", () => {
    expect(gradeAtV1("juxt:num-3:linear:v2", "x(2)")).toBe("correct/match");
    expect(gradeAtV1("juxt:num-3:linear:v2", "f(2)")).toBe(
      "invalid_input/unsupported_syntax",
    );
    expect(gradeAtV1("juxt:num-3:linear:v2", "xy")).toBe("invalid_input/unknown_symbol");
    // v1 admits no function names at all, so a real call is still refused there.
    expect(gradeAtV1("juxt:num-3:linear:v2", "sqrt(4)")).toBe(
      "invalid_input/unsupported_syntax",
    );
  });

  /**
   * FOUND AND DELIBERATELY NOT FIXED, recorded here so it is not mistaken for this change's
   * doing: `compareRationalAnswer` reads the two-field payload directly and so has NEVER
   * reached `prepareRawAnswer`, which means the 2026-07-26 symbol CASE FOLD does not apply
   * to it either. `X*(X + 2)` on a D5 rational item is `unknown_symbol` today and was before
   * this change.
   *
   * The star IS inserted (the rewrite is wired into that path by name, which is what fixes
   * the 14 items), so the only thing missing is the fold. It is a one-line addition and is
   * not made here for the same reason `-(x + 4)^2` is not fixed here: it is a second,
   * separately-argued widening, and `PracticeAnswer.tsx` sets `autoCapitalize="off"` on both
   * rational fields, so a phone keyboard does not produce the capital in the first place.
   *
   * Asserted rather than commented, so the day someone adds the fold this row fails and
   * points at the note instead of leaving a stale claim behind.
   */
  it("records that the rational two-field path still does not fold symbol case", () => {
    expect(insertImplicitProductStar("X(X + 2)", ["x"]), "the star still goes in").toBe(
      "X*(X + 2)",
    );
    expect(grade("juxt:rat-3:lcd:v2", "(11X + 8)/(X*(X + 2))")).toBe(
      "invalid_input/unknown_symbol",
    );
    // The same answer in the case the item declares grades, so the gap really is the case
    // and not the juxtaposition.
    expect(grade("juxt:rat-3:lcd:v2", "(11x + 8)/(x(x + 2))")).toBe("correct/match");
  });

  /**
   * A wrong answer written with a juxtaposed product is still wrong. Reading `x(x + 2)` as
   * a product is what lets the checker SEE it; the value comparison is untouched, and this
   * is the row that fails if the rewrite ever starts changing an answer's meaning.
   */
  it("does not make a wrong answer right", () => {
    expect(grade("juxt:rat-3:lcd:v2", "(11x + 8)/(x(x + 3))")).toBe(
      "incorrect/value_mismatch",
    );
    expect(grade("juxt:num-3:linear:v2", "x(3)")).toBe("incorrect/value_mismatch");
    expect(grade("juxt:num-3:linear:v2", "x(x)")).toBe("incorrect/value_mismatch");
  });
});
