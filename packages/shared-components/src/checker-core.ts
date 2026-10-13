import {
  absDependencies,
  addDependencies,
  cbrtDependencies,
  create,
  divideDependencies,
  equalDependencies,
  type Fraction,
  type MathNode,
  type MathNumericType,
  isFraction as mathjsIsFraction,
  multiplyDependencies,
  nthRootDependencies,
  parseDependencies,
  powDependencies,
  rationalizeDependencies,
  simplifyDependencies,
  sqrtDependencies,
  subtractDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies,
} from "mathjs";

import type { AnswerSpec, CheckAnswerResult } from "./index";

export type { Fraction, MathNode, MathNumericType } from "mathjs";

/**
 * Shared primitives for the deterministic answer checkers (Answer_Equivalence_Spec
 * §11). Both the locked D1 (v1) checker and the Phase-2 product (v2) checker build
 * on this single mathjs configuration + safe-parse + numeric-evaluation layer, so
 * the two runtimes (Node + Chromium) and the two versions stay byte-for-byte
 * consistent on the arithmetic they share.
 */

/**
 * The immutable answer definition an item version carries. Shared shape across
 * checker versions; each version validates the AnswerSpec fields it supports.
 */
export interface AnswerDefinition {
  answer_spec: AnswerSpec;
  answer_key?: string;
  accepted_units?: readonly string[];
  allowed_symbols?: readonly string[];
  /**
   * Excluded domain values for a `rational_answer` key (the exclusions inherited
   * from the ORIGINAL denominator, Answer_Equivalence_Spec §3). Dropping one is
   * wrong even with a correct expression.
   */
  excluded_values?: readonly string[];
  /**
   * The private spec for an interactive answer type (e.g. a `graph` item's
   * `GraphExpected`), scored by its {@link InteractiveAnswerModule}. Optional and
   * absent on every existing text/product/graph item, so their serialization and
   * content hashes are unchanged; only newly-authored interactive items set it.
   */
  interactive_spec?: unknown;
  parts?: readonly {
    part_id: string;
    answer: AnswerDefinition;
  }[];
}

export interface ParsedAnswer {
  expression: string;
  hadPercent: boolean;
}

/** A shaped view of a mathjs AST node exposing the fields the checker inspects. */
export interface NodeShape extends MathNode {
  args?: readonly MathNode[];
  content?: MathNode;
  fn?: { name?: string };
  name?: string;
  op?: string;
  value?: unknown;
}

export type InternalResult = Omit<CheckAnswerResult, "checker_version">;

function requireDependencyMap<T>(value: T | undefined, name: string): T {
  if (!value) {
    throw new Error(`mathjs dependency map unavailable: ${name}`);
  }
  return value;
}

/** Exact-arithmetic instance: rationals/decimals/percents compare exactly. */
export const math = create(
  {
    addDependencies: requireDependencyMap(addDependencies, "add"),
    divideDependencies: requireDependencyMap(divideDependencies, "divide"),
    equalDependencies: requireDependencyMap(equalDependencies, "equal"),
    multiplyDependencies: requireDependencyMap(multiplyDependencies, "multiply"),
    parseDependencies: requireDependencyMap(parseDependencies, "parse"),
    powDependencies: requireDependencyMap(powDependencies, "pow"),
    rationalizeDependencies: requireDependencyMap(rationalizeDependencies, "rationalize"),
    simplifyDependencies: requireDependencyMap(simplifyDependencies, "simplify"),
    subtractDependencies: requireDependencyMap(subtractDependencies, "subtract"),
    unaryMinusDependencies: requireDependencyMap(unaryMinusDependencies, "unaryMinus"),
    unaryPlusDependencies: requireDependencyMap(unaryPlusDependencies, "unaryPlus"),
  },
  {
    number: "Fraction",
    predictable: true,
  },
);

/**
 * Float-arithmetic instance for irrational values (radicals/exact constants). The
 * Fraction instance throws on `sqrt(8).evaluate()`, so radical *numeric* equality
 * is judged here with a tolerance (Answer_Equivalence_Spec §6, §9 fallback).
 */
export const numMath = create(
  {
    absDependencies: requireDependencyMap(absDependencies, "abs"),
    addDependencies: requireDependencyMap(addDependencies, "add"),
    cbrtDependencies: requireDependencyMap(cbrtDependencies, "cbrt"),
    divideDependencies: requireDependencyMap(divideDependencies, "divide"),
    multiplyDependencies: requireDependencyMap(multiplyDependencies, "multiply"),
    nthRootDependencies: requireDependencyMap(nthRootDependencies, "nthRoot"),
    parseDependencies: requireDependencyMap(parseDependencies, "parse"),
    powDependencies: requireDependencyMap(powDependencies, "pow"),
    sqrtDependencies: requireDependencyMap(sqrtDependencies, "sqrt"),
    subtractDependencies: requireDependencyMap(subtractDependencies, "subtract"),
    unaryMinusDependencies: requireDependencyMap(unaryMinusDependencies, "unaryMinus"),
    unaryPlusDependencies: requireDependencyMap(unaryPlusDependencies, "unaryPlus"),
  },
  { number: "number" },
);

export const MAX_INPUT_LENGTH = 128;
export const MAX_AST_DEPTH = 16;
export const MAX_AST_NODES = 64;
/**
 * The largest integer exponent the grammar will read, and the two measurements that decide it.
 *
 * **Why it is not 8.** At 8 the archetypal mistake was outside the grammar BY CONSTRUCTION. A
 * power-of-a-power item keyed `y^8` is built from `(y^4)^2`, so multiplying the exponents where
 * you should add gives `y^16`, and that came back `invalid_input / unsupported_exponent` — which
 * `isResolvingStatus` in the lesson engine declines to score, so no attempt was recorded, no
 * misconception was logged, and the learner was re-served rather than corrected. Swept over the
 * served bank (2,265 items, every bare-string key carrying a caret, two key-derived slips each):
 * 24 of 306 slips were discarded rather than scored, all of them for this reason, and 6 of the 7
 * in the original hand probe were the doubling error specifically. The cap therefore has to
 * clear TWICE the largest exponent any served key carries, which is 8, so it has to reach 16.
 *
 * **Why it is not more than 16.** The grammar admits nesting, so a cap of `c` admits
 * `((x + 1)^c)^c`, of degree `c * c`, and degree decides which polynomial reading grades it:
 * `readExactPolynomial` in `product-answer-checker.ts` runs first and refuses anything past its
 * own `MAX_READ_DEGREE` of 256, and what it refuses falls through to `math.rationalize`, whose
 * cost is super-exponential in the degree (`(x + 1)^5` measured at 122 SECONDS,
 * `docs/Product_Checker_Poly_Coefficient_Cost.md`). 16 * 16 is 256 exactly, so a two-level nest
 * at this cap is the last one the exact reader will take: measured on this tree,
 * `((x + 1)^16)^16` reads in 71ms and grades in single-digit milliseconds, while a cap of 17
 * would put the same shape at degree 289 and hand it to `rationalize`.
 *
 * Both halves are guarded rather than left as prose: `exponentCap.test.ts` in this package
 * fails on the reader if the cap outgrows the ceiling, and `apps/web/src/lessons/exponentCap.test.ts`
 * fails if the bank grows a key whose doubling slip this cap no longer covers.
 *
 * Deeper nesting still reaches the `rationalize` fallback — `(((x + 1)^8)^8)^8` is degree 512 —
 * and that was already true at 8: measured here, the reader declines it in 93ms and the grade
 * call had not returned when it was killed at 147s. Raising the cap moves which degree lands in
 * the fallback, not whether the fallback is reachable; closing it belongs to `MAX_READ_DEGREE`.
 */
export const MAX_EXPONENT = 16;
const ALLOWED_OPERATORS = new Set(["+", "-", "*", "/", "^"]);

export const correct = (): InternalResult => ({
  status: "correct",
  reason_code: "match",
  client_correct: true,
});

export function incorrect(reasonCode: string): InternalResult {
  return { status: "incorrect", reason_code: reasonCode, client_correct: false };
}

export function invalid(reasonCode: string): InternalResult {
  return { status: "invalid_input", reason_code: reasonCode, client_correct: false };
}

export function unsupported(reasonCode: string): InternalResult {
  return {
    status: "unsupported_expression",
    reason_code: reasonCode,
    client_correct: false,
  };
}

export function scoringError(reasonCode: string): InternalResult {
  return { status: "scoring_error", reason_code: reasonCode, client_correct: false };
}

export function withVersion(
  result: InternalResult,
  checkerVersion: number,
): CheckAnswerResult {
  return { ...result, checker_version: checkerVersion };
}

export function containsSymbol(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (node.type === "SymbolNode") {
    return true;
  }
  if (shaped.content && containsSymbol(shaped.content)) {
    return true;
  }
  return shaped.args?.some(containsSymbol) ?? false;
}

function normalizeUnit(value: string): string {
  return value.toLowerCase().replaceAll(".", "").replace(/\s+/g, " ").trim();
}

function splitRequiredUnit(
  rawAnswer: string,
  acceptedUnits: readonly string[] | undefined,
): { expression?: string; result?: InternalResult } {
  if (!acceptedUnits?.length) {
    return { result: scoringError("missing_unit_configuration") };
  }

  const match = rawAnswer.trim().match(/^(.*\S)\s+([a-zA-Z][a-zA-Z.\s]*)$/);
  if (!match) {
    return { result: incorrect("wrong_unit") };
  }

  const expression = match[1];
  const submittedUnit = match[2];
  if (!expression || !submittedUnit) {
    return { result: incorrect("wrong_unit") };
  }

  const allowed = new Set(acceptedUnits.map(normalizeUnit));
  if (!allowed.has(normalizeUnit(submittedUnit))) {
    return { result: incorrect("wrong_unit") };
  }

  return { expression };
}

/**
 * Every name the parse grammar can EVER read as a function call, anywhere in either
 * checker generation. Six names, and the reason this set can be written down at all is
 * the reason {@link insertImplicitProductStar} is safe: each one is a fixed string
 * literal in this package's source, and NONE is read from an item's data.
 *
 * The union, enumerated rather than asserted, over every `allowedFunctions` the two
 * checkers pass to {@link parseSafeExpression}:
 *
 *  - `EMPTY_FUNCTIONS` (the default, so every v1 path and v2's numeric / polynomial /
 *    factoring / vertex-form / standard-form paths) admits NO function at all;
 *  - `{sqrt, nthRoot, cbrt, abs}` — {@link RADICAL_FUNCTIONS} below (`evaluateFloat`),
 *    `VARIABLE_RADICAL_PARSE_OPTIONS` (RAD.4), and `CURVE_FUNCTIONS` (the graph comparator);
 *  - `{sqrt, nthRoot, cbrt}` — the symbol-free radical path;
 *  - `{log, ln}` — the EL.5 expand/condense identities;
 *  - `{log, ln, sqrt}` — the EL.6 exact roster.
 *
 * `pi` is deliberately absent: it is a SYMBOL bound in an eval scope (TRG.1), not a
 * function, so `pi(3)` is a product and not a call. `answerNotation`'s own `pi` rule reads
 * it as a name for the same reason.
 *
 * Compared lower-cased, which is strictly the more conservative direction: it can only
 * ever DECLINE to insert a star. `nthroot(8, 3)` is not a name mathjs knows, so declining
 * leaves it `invalid_input / unsupported_syntax` exactly as before.
 */
const GRAMMAR_FUNCTION_NAMES: ReadonlySet<string> = new Set([
  "abs",
  "cbrt",
  "ln",
  "log",
  "nthroot",
  "sqrt",
]);

/**
 * The item's own spelling of each symbol it declares, keyed by the lower-cased token, or
 * `undefined` when the item declares two symbols differing only in case (in which case
 * neither {@link foldSymbolCase} nor {@link insertImplicitProductStar} does anything,
 * rather than picking one).
 *
 * ONE gate shared by both normalizations on purpose: they read the same declaration for
 * the same reason, and two copies of this precondition could disagree about whether a
 * token is a variable of this item.
 */
function canonicalSymbolSpellings(
  allowedSymbols: readonly string[] | undefined,
): Map<string, string> | undefined {
  if (!allowedSymbols?.length) {
    return undefined;
  }
  const canonical = new Map<string, string>();
  for (const symbol of allowedSymbols) {
    const folded = symbol.toLowerCase();
    if ((canonical.get(folded) ?? symbol) !== symbol) {
      return undefined;
    }
    canonical.set(folded, symbol);
  }
  return canonical;
}

/**
 * Make a JUXTAPOSED PRODUCT explicit, so `x(x + 2)` reads as the multiplication a learner
 * means rather than as a call to a function named `x`.
 *
 * mathjs already reads every OTHER shape of implicit multiplication as a product — `2x`,
 * `2(x + 1)`, `(x + 1)(x + 2)`, `2pi`, `sqrt(2)x` all parse to an `OperatorNode` with
 * `implicit: true`, and §11 of `Answer_Equivalence_Spec.md` already declares the canonical
 * reading of the ambiguous ones (`1/2x` is `(1/2)*x`). ONE shape it reads differently: a
 * bare identifier immediately before `(` is a FUNCTION CALL, so `x(x + 2)` parsed to a
 * `FunctionNode` and `inspectAst` refused it as `unsupported_syntax`. Fourteen served D5
 * items key a denominator like `(11*x + 8)/(x*(x + 2))`, whose star cannot be dropped, and
 * §12 scores `invalid_input` as UNANSWERED — so a learner writing the denominator the way
 * every textbook prints it lost the attempt and was told only "Check the format".
 *
 * ## Why a bare identifier cannot be a call here
 *
 * Every function name the grammar admits is a fixed literal in this package
 * ({@link GRAMMAR_FUNCTION_NAMES}), so there is no construct in which a name outside that
 * set is a call. Two conditions, both required, and each one alone would be too wide:
 *
 *  1. the name is NOT one of the six, so `sqrt(2)`, `abs(x)` and `log(x)` stay calls; and
 *  2. the name IS a symbol THIS ITEM DECLARES, so an identifier that is not a variable of
 *     this item — `f(x)`, `sin(x)`, `g(2)` — keeps the verdict AND the reason code it has
 *     today rather than being re-read as a product on a guess.
 *
 * Condition 2 is what makes this additive in the same way {@link foldSymbolCase} is: like
 * the case fold, it can only ever act on a token the item already names, and it fires only
 * where mathjs would have produced a `FunctionNode` — a shape `inspectAst` rejects for
 * every name outside the six. So the ONLY verdict it can move is an `invalid_input`, in
 * either checker generation.
 *
 * ## What is deliberately NOT read as a product
 *
 * `xy` is the shape this must refuse and does. mathjs lexes consecutive letters as ONE
 * identifier, so `xy` is the symbol `xy` and grades `unknown_symbol`; splitting it into
 * `x*y` would be the checker inventing a reading, and it would silently change meaning the
 * day the grammar admits a multi-character variable name. Space-separated juxtaposition
 * (`x y`) is left exactly as mathjs already reads it and is not extended either: §11
 * reserves a space between a number and a fraction for a MIXED NUMBER (`1 1/2` is `3/2`),
 * which mathjs does not implement, and `math.rationalize` does not normalize `x y` against
 * `x*y` at all. Both are recorded in `implicitProduct.test.ts`.
 *
 * ## The safety limits still bind
 *
 * This runs AFTER {@link prepareRawAnswer}'s `MAX_INPUT_LENGTH` check, so a 128-character
 * answer can leave here longer than 128 characters. That is deliberate — re-checking the
 * length afterwards would reject a submission for characters the learner did not type — and it
 * is safe because length was never what protected the CAS: {@link MAX_AST_DEPTH} and
 * {@link MAX_AST_NODES} are, and each insertion adds exactly one node (a one-argument
 * `FunctionNode` becomes a two-argument `OperatorNode`). Measured on the worst cases a
 * 128-character input can build — `"x(1)"` repeated 32 times, and 40 nested `x(` — both return
 * `invalid_input / expression_too_complex` in under a millisecond, so the widening cannot be
 * used to hang the grader. **Depth is the limit doing the work on both**, which is why the
 * assertion in `implicitProduct.test.ts` is about the verdict rather than about which limit
 * produced it.
 */
export function insertImplicitProductStar(
  expression: string,
  allowedSymbols: readonly string[] | undefined,
): string {
  const canonical = canonicalSymbolSpellings(allowedSymbols);
  if (!canonical) {
    return expression;
  }
  return expression.replace(
    /([A-Za-z][A-Za-z0-9_]*)(\s*\()/g,
    (whole: string, token: string, bracket: string) => {
      const folded = token.toLowerCase();
      return GRAMMAR_FUNCTION_NAMES.has(folded) || !canonical.has(folded)
        ? whole
        : `${token}*${bracket}`;
    },
  );
}

/**
 * Fold a submitted symbol onto the item's own spelling of it when only letter CASE
 * differs, so `X^5` grades against a key of `x^5`.
 *
 * Letter case carries no mathematical meaning in any authored key, and a mobile keyboard
 * capitalizes the first character of an empty text field by default, so this was reached
 * by accident rather than by trying: 56 of the 181 registered D2 instances rejected the
 * upper-cased spelling of their own key as `invalid_input / unknown_symbol`, which the
 * session scores as UNANSWERED and the UI explains only as "check the answer format".
 * The `expr_builder` module already normalizes its base slot this way
 * (`expr-builder/comparator.ts`), so this brings the text path level with the widget.
 *
 * It can only ever map a token ONTO a symbol the item already declares, so it cannot
 * make a wrong letter grade correct. `Y` against `allowed_symbols: ["x"]` is still
 * `unknown_symbol`; `Y` against `["x", "y"]` becomes `y`, which is a value mismatch
 * against a key in `x`, not a pass. A token already spelled exactly as declared is left
 * alone, a token immediately followed by `(` is a function name and never folded, and an
 * item declaring two symbols that differ only in case disables the fold rather than
 * picking one.
 *
 * The "immediately followed by `(` is a function name" rule stays TRUE, and now stays true
 * BECAUSE of the ordering in {@link prepareRawAnswer}: a declared symbol before a bracket
 * has already had its star inserted by {@link insertImplicitProductStar}, so whatever is
 * still sitting immediately before a `(` when the fold runs really is a function-name
 * position. That is also what lets `X(x + 2)` grade — `X` is separated from the bracket
 * first, and folded second.
 */
function foldSymbolCase(
  expression: string,
  allowedSymbols: readonly string[] | undefined,
): string {
  const canonical = canonicalSymbolSpellings(allowedSymbols);
  if (!canonical || !allowedSymbols) {
    return expression;
  }
  const declared = new Set(allowedSymbols);
  return expression.replace(
    /[A-Za-z][A-Za-z0-9_]*/g,
    (token: string, offset: number, whole: string) => {
      if (declared.has(token) || /^\s*\(/.test(whole.slice(offset + token.length))) {
        return token;
      }
      return canonical.get(token.toLowerCase()) ?? token;
    },
  );
}

export function prepareRawAnswer(
  rawAnswer: unknown,
  definition: AnswerDefinition,
): { parsed?: ParsedAnswer; result?: InternalResult } {
  if (typeof rawAnswer !== "string" && typeof rawAnswer !== "number") {
    return { result: invalid("wrong_input_type") };
  }

  if (typeof rawAnswer === "number" && !Number.isFinite(rawAnswer)) {
    return { result: invalid("parse_error") };
  }

  let expression = String(rawAnswer).trim();
  if (!expression || expression.length > MAX_INPUT_LENGTH) {
    return { result: invalid(expression ? "input_too_long" : "empty_answer") };
  }

  if (definition.answer_spec.unit_policy === "required_exact_unit") {
    const unit = splitRequiredUnit(expression, definition.accepted_units);
    if (unit.result) {
      return { result: unit.result };
    }
    expression = unit.expression ?? "";
  }

  const hadPercent = expression.endsWith("%");
  if (hadPercent) {
    expression = expression.slice(0, -1).trim();
  }

  if (!expression) {
    return { result: invalid("parse_error") };
  }

  // Both normalizations read the item's OWN `allowed_symbols` and neither can act on a
  // token the item does not declare. The star goes in FIRST, so a case-variant standing
  // before a bracket (`X(x + 2)`) is separated from it before the fold reads the position.
  const juxtaposed = insertImplicitProductStar(expression, definition.allowed_symbols);
  return {
    parsed: {
      expression: foldSymbolCase(juxtaposed, definition.allowed_symbols),
      hadPercent,
    },
  };
}

export interface ParseOptions {
  allowedSymbols?: readonly string[];
  /** Function names permitted in the AST (e.g. sqrt/nthRoot for radicals). */
  allowedFunctions?: ReadonlySet<string>;
  /** Permit a variable expression in a denominator (rational forms). */
  allowSymbolicDenominator?: boolean;
  /**
   * Permit a bounded NEGATIVE integer exponent (magnitude <= {@link MAX_EXPONENT}),
   * so a wrong-form input like `x^-2` PARSES and can be graded as a FORM miss
   * (EXP.1 `positive_exponents`, Answer_Equivalence_Spec §4) rather than
   * `invalid_input`. DEFAULTS OFF: v1 and the existing v2 radical/expression paths
   * accept only nonnegative exponents exactly as before.
   */
  allowNegativeExponent?: boolean;
}

/** Strip any wrapping parentheses from a node (`(-2)` -> `-2`). */
function unwrapParenthesis(node: MathNode): MathNode {
  let current = node as NodeShape;
  while (current.type === "ParenthesisNode" && current.content) {
    current = current.content as NodeShape;
  }
  return current;
}

/**
 * Read a `^` exponent as an integer, or `undefined` if it is not a permitted
 * constant exponent. With `allowNegative` OFF this accepts ONLY a bare
 * `ConstantNode` (v1/v2 behavior, byte-for-byte). With it ON it also accepts a
 * unary-minus of a constant (`x^-2` parses as `pow(x, unaryMinus(2))`) and a
 * parenthesized exponent (`x^(-2)`), so a negative integer exponent is a value the
 * grammar can represent (and then reject as unsimplified), not a parse error.
 */
function readConstantExponent(
  exponentNode: NodeShape | undefined,
  allowNegative: boolean,
): number | undefined {
  if (!exponentNode) {
    return undefined;
  }
  if (!allowNegative) {
    return exponentNode.type === "ConstantNode" ? Number(exponentNode.value) : undefined;
  }
  const inner = unwrapParenthesis(exponentNode) as NodeShape;
  if (inner.type === "ConstantNode") {
    return Number(inner.value);
  }
  if (inner.type === "OperatorNode" && inner.op === "-" && inner.args?.length === 1) {
    const base = unwrapParenthesis(inner.args[0] as MathNode) as NodeShape;
    if (base.type === "ConstantNode") {
      return -Number(base.value);
    }
  }
  return undefined;
}

function inspectAst(
  node: MathNode,
  options: Required<ParseOptions>,
  depth = 0,
  state = { count: 0 },
): InternalResult | undefined {
  state.count += 1;
  if (depth > MAX_AST_DEPTH || state.count > MAX_AST_NODES) {
    return invalid("expression_too_complex");
  }

  const shaped = node as NodeShape;
  switch (node.type) {
    case "ConstantNode":
      return String(shaped.value).length <= 20 ? undefined : invalid("number_too_large");
    case "SymbolNode":
      return shaped.name && options.allowedSymbols.includes(shaped.name)
        ? undefined
        : invalid("unknown_symbol");
    case "ParenthesisNode":
      return shaped.content
        ? inspectAst(shaped.content, options, depth + 1, state)
        : invalid("parse_error");
    case "FunctionNode": {
      const name = shaped.fn?.name ?? shaped.name;
      // A disallowed function is "unsupported_syntax" (v1 parity: functions used
      // to fall through to the default branch with that same reason code).
      if (!name || !options.allowedFunctions.has(name)) {
        return invalid("unsupported_syntax");
      }
      for (const child of shaped.args ?? []) {
        const issue = inspectAst(child, options, depth + 1, state);
        if (issue) {
          return issue;
        }
      }
      return undefined;
    }
    case "OperatorNode": {
      if (!shaped.op || !ALLOWED_OPERATORS.has(shaped.op) || !shaped.args) {
        return invalid("unsupported_syntax");
      }

      if (shaped.op === "^") {
        const exponentNode = shaped.args[1] as NodeShape | undefined;
        const exponent = readConstantExponent(exponentNode, options.allowNegativeExponent);
        const minExponent = options.allowNegativeExponent ? -MAX_EXPONENT : 0;
        if (
          exponent === undefined ||
          !Number.isInteger(exponent) ||
          exponent < minExponent ||
          exponent > MAX_EXPONENT
        ) {
          return invalid("unsupported_exponent");
        }
      }

      if (
        shaped.op === "/" &&
        !options.allowSymbolicDenominator &&
        shaped.args[1] &&
        containsSymbol(shaped.args[1])
      ) {
        return invalid("unsupported_symbolic_denominator");
      }

      for (const child of shaped.args) {
        const issue = inspectAst(child, options, depth + 1, state);
        if (issue) {
          return issue;
        }
      }
      return undefined;
    }
    default:
      return invalid("unsupported_syntax");
  }
}

const EMPTY_FUNCTIONS: ReadonlySet<string> = new Set();

/**
 * Parse an expression and validate it against the safety limits + the permitted
 * grammar (symbols/functions/denominators). Returns `invalid_input` for anything
 * outside the declared grammar; never throws.
 */
export function parseSafeExpression(
  expression: string,
  allowedSymbols: readonly string[] = [],
  extra: Omit<ParseOptions, "allowedSymbols"> = {},
): { node?: MathNode; result?: InternalResult } {
  try {
    const node = math.parse(expression);
    const issue = inspectAst(node, {
      allowedSymbols,
      allowedFunctions: extra.allowedFunctions ?? EMPTY_FUNCTIONS,
      allowSymbolicDenominator: extra.allowSymbolicDenominator ?? false,
      allowNegativeExponent: extra.allowNegativeExponent ?? false,
    });
    return issue ? { result: issue } : { node };
  } catch {
    return { result: invalid("parse_error") };
  }
}

export function isFraction(value: MathNumericType): value is Fraction {
  return mathjsIsFraction(value);
}

/** Exact numeric evaluation (rational/decimal/percent) via the Fraction instance. */
export function evaluateNumeric(parsed: ParsedAnswer): {
  value?: MathNumericType;
  result?: InternalResult;
} {
  const safe = parseSafeExpression(parsed.expression);
  if (safe.result || !safe.node) {
    return { result: safe.result ?? invalid("parse_error") };
  }

  try {
    let value = safe.node.evaluate() as MathNumericType;
    if (!isFraction(value) && typeof value !== "number" && typeof value !== "bigint") {
      return { result: invalid("non_numeric_answer") };
    }

    if (parsed.hadPercent) {
      value = math.divide(value, 100) as MathNumericType;
    }

    return { value };
  } catch {
    return { result: invalid("parse_error") };
  }
}

const RADICAL_FUNCTIONS: ReadonlySet<string> = new Set(["sqrt", "nthRoot", "cbrt", "abs"]);

/**
 * Float evaluation for radical/irrational expressions via the number instance.
 * Accepts the radical grammar; returns a finite JS number or `invalid_input`.
 */
export function evaluateFloat(
  expression: string,
  allowedSymbols: readonly string[] = [],
): { value?: number; result?: InternalResult } {
  const safe = parseSafeExpression(expression, allowedSymbols, {
    allowedFunctions: RADICAL_FUNCTIONS,
  });
  if (safe.result || !safe.node) {
    return { result: safe.result ?? invalid("parse_error") };
  }
  try {
    const value = numMath.parse(expression).evaluate() as unknown;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { result: invalid("non_numeric_answer") };
    }
    return { value };
  } catch {
    return { result: invalid("parse_error") };
  }
}

/** Relative-tolerance float equality for irrational comparisons (§6). */
export function floatEqual(a: number, b: number, epsilon = 1e-9): boolean {
  const diff = Math.abs(a - b);
  if (diff <= epsilon) {
    return true;
  }
  return diff <= epsilon * Math.max(Math.abs(a), Math.abs(b));
}

export function isPlainFraction(expression: string): boolean {
  return /^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(expression);
}

export function isPlainDecimal(expression: string): boolean {
  return /^[+-]?(?:\d+\.\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(expression);
}

export function representationIssue(
  parsed: ParsedAnswer,
  representation: AnswerSpec["representation"],
): InternalResult | undefined {
  switch (representation) {
    case "any":
      return undefined;
    case "fraction":
      return !parsed.hadPercent && isPlainFraction(parsed.expression)
        ? undefined
        : incorrect("wrong_representation");
    case "decimal":
      return !parsed.hadPercent && isPlainDecimal(parsed.expression)
        ? undefined
        : incorrect("wrong_representation");
    case "percent":
      return parsed.hadPercent ? undefined : incorrect("wrong_representation");
    case "exact":
      return !parsed.hadPercent && !/[.eE]/.test(parsed.expression)
        ? undefined
        : incorrect("wrong_representation");
  }
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function integerGcd(values: readonly number[]): number {
  return values.reduce((acc, value) => gcd(acc, value), 0);
}

export function isReducedFraction(expression: string): boolean {
  const match = expression.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (!match) {
    return false;
  }

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return denominator > 0 && gcd(numerator, denominator) === 1;
}

export function normalizeExpressionText(expression: string): string {
  return expression.replaceAll(/\s+/g, "").replaceAll("*", "");
}

/**
 * Is `node` a genuine binary sum or difference, rather than a unary minus?
 *
 * mathjs gives a unary minus the same `op` string as subtraction (`"-"`) and
 * distinguishes the two only by operand count, so `-2` is an OperatorNode with
 * `op === "-"` and ONE argument. Anything keying off `op` alone must apply this
 * guard, or a negated coefficient reads as an unexpanded sum: `-2x` parses as
 * `(-2) * x`, whose left operand would otherwise look like the `(x + 5)` in
 * `2 * (x + 5)`. Same test as `readConstantExponent` uses for `x^-2`.
 */
function isAdditiveOperator(candidate: NodeShape | undefined): boolean {
  return (
    candidate?.type === "OperatorNode" &&
    (candidate.op === "+" || candidate.op === "-") &&
    candidate.args?.length === 2
  );
}

export function hasExpandableProduct(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (
    node.type === "OperatorNode" &&
    shaped.op === "*" &&
    shaped.args?.some((child) => {
      const content =
        child.type === "ParenthesisNode" ? (child as NodeShape).content : child;
      return isAdditiveOperator(content as NodeShape | undefined);
    })
  ) {
    return true;
  }

  if (shaped.content && hasExpandableProduct(shaped.content)) {
    return true;
  }

  return shaped.args?.some(hasExpandableProduct) ?? false;
}

/** Does any `^` in the AST carry a negative (integer) exponent? */
export function hasNegativeExponent(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (shaped.type === "OperatorNode" && shaped.op === "^" && shaped.args?.[1]) {
    const exponent = readConstantExponent(shaped.args[1] as NodeShape, true);
    if (exponent !== undefined && exponent < 0) {
      return true;
    }
  }
  if (shaped.content && hasNegativeExponent(shaped.content)) {
    return true;
  }
  return shaped.args?.some(hasNegativeExponent) ?? false;
}

function collectSymbols(node: MathNode): Set<string> {
  const shaped = node as NodeShape;
  const symbols = new Set<string>();
  if (node.type === "SymbolNode" && shaped.name) {
    symbols.add(shaped.name);
  }
  for (const arg of shaped.args ?? []) {
    for (const name of collectSymbols(arg)) {
      symbols.add(name);
    }
  }
  if (shaped.content) {
    for (const name of collectSymbols(shaped.content)) {
      symbols.add(name);
    }
  }
  return symbols;
}

function termContainsSymbol(node: MathNode, symbol: string): boolean {
  const shaped = node as NodeShape;
  if (node.type === "SymbolNode" && shaped.name === symbol) {
    return true;
  }
  if (shaped.args?.some((arg) => termContainsSymbol(arg, symbol))) {
    return true;
  }
  if (shaped.content && termContainsSymbol(shaped.content, symbol)) {
    return true;
  }
  return false;
}

function flattenAddSub(
  node: MathNode,
  sign: 1 | -1 = 1,
): { node: MathNode; sign: 1 | -1 }[] {
  const shaped = node as NodeShape;
  if (node.type === "OperatorNode" && shaped.op === "+") {
    return (shaped.args ?? []).flatMap((arg) => flattenAddSub(arg, sign));
  }
  if (node.type === "OperatorNode" && shaped.op === "-") {
    const args = shaped.args ?? [];
    if (args.length === 2 && args[0] && args[1]) {
      return [
        ...flattenAddSub(args[0], sign),
        ...flattenAddSub(args[1], sign === 1 ? -1 : 1),
      ];
    }
  }
  if (node.type === "OperatorNode" && shaped.op === "unaryMinus") {
    const arg = shaped.args?.[0];
    return arg ? flattenAddSub(arg, sign === 1 ? -1 : 1) : [{ node, sign }];
  }
  if (node.type === "ParenthesisNode" && shaped.content) {
    return flattenAddSub(shaped.content, sign);
  }
  return [{ node, sign }];
}

/** True when multiple additive terms still share the same variable (e.g. 2x + 3x). */
function hasDuplicateSymbolTermsInChain(node: MathNode): boolean {
  const terms = flattenAddSub(node);
  const symbols = new Set<string>();
  for (const { node: term } of terms) {
    for (const name of collectSymbols(term)) {
      symbols.add(name);
    }
  }
  for (const symbol of symbols) {
    if (terms.filter(({ node: term }) => termContainsSymbol(term, symbol)).length > 1) {
      return true;
    }
  }
  return false;
}

export function hasUncombinedLikeTerms(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (
    node.type === "OperatorNode" &&
    (shaped.op === "+" || shaped.op === "-") &&
    hasDuplicateSymbolTermsInChain(node)
  ) {
    return true;
  }
  if (shaped.args?.some(hasUncombinedLikeTerms)) {
    return true;
  }
  if (shaped.content && hasUncombinedLikeTerms(shaped.content)) {
    return true;
  }
  return false;
}

/**
 * True when an additive chain still holds two or more plain-number terms (e.g. 4x + 6 + 3).
 *
 * SCOPE: the recursion descends into `shaped.args` of EVERY node type, not just
 * additive parents, so a nested sum anywhere in the tree counts — `x/(2+3)` is
 * flagged `not_simplified`. That is harmless for the linear-polynomial answers
 * `combined_constants` grades, where no such form can be correct anyway, but this
 * predicate must NOT be reused for rational/fraction answers without first
 * narrowing the recursion to additive parents.
 */
export function hasUncombinedConstants(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (node.type === "OperatorNode" && (shaped.op === "+" || shaped.op === "-")) {
    const constants = flattenAddSub(node).filter(
      ({ node: term }) => collectSymbols(term).size === 0,
    );
    if (constants.length > 1) {
      return true;
    }
  }
  if (shaped.args?.some(hasUncombinedConstants)) {
    return true;
  }
  return shaped.content ? hasUncombinedConstants(shaped.content) : false;
}

/**
 * The shared simplification profiles (Answer_Equivalence_Spec §4). Version-specific
 * profiles (radical, trig) are handled by the product checker before delegating
 * here; `positive_exponents` (EXP.1) is a pure AST predicate, so it lives here.
 */
export function simplificationIssue(
  expression: string,
  node: MathNode,
  profile: AnswerSpec["simplification"],
): InternalResult | undefined {
  if (profile === "none") {
    return undefined;
  }

  if (profile === "reduced_fraction") {
    return isReducedFraction(expression) ? undefined : incorrect("not_simplified");
  }

  // positive_exponents (EXP.1): a numerically-correct answer still written with a
  // negative exponent (e.g. `x^-2` for `1/x^2`) is a FORM miss, not simplified.
  // Only reached for EXP.1-style items, which parse with `allowNegativeExponent`.
  if (profile === "positive_exponents") {
    return hasNegativeExponent(node) ? incorrect("not_simplified") : undefined;
  }

  if (profile === "combined_polynomial") {
    try {
      if (hasExpandableProduct(node) || hasUncombinedLikeTerms(node)) {
        return incorrect("not_simplified");
      }
      return undefined;
    } catch {
      return scoringError("simplification_error");
    }
  }

  // combined_constants (NUM.3 L3): the response must be distributed with its plain
  // numbers combined, but repeated variable terms (`2x + 4x`) stay acceptable —
  // collecting like terms is NUM.4 material the learner has not reached yet.
  if (profile === "combined_constants") {
    try {
      if (hasExpandableProduct(node) || hasUncombinedConstants(node)) {
        return incorrect("not_simplified");
      }
      return undefined;
    } catch {
      return scoringError("simplification_error");
    }
  }

  return unsupported("unsupported_simplification_profile");
}
