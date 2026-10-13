import {
  type AnswerDefinition,
  containsSymbol,
  correct,
  evaluateFloat,
  evaluateNumeric,
  floatEqual,
  type InternalResult,
  incorrect,
  insertImplicitProductStar,
  integerGcd,
  invalid,
  type MathNode,
  type MathNumericType,
  math,
  type NodeShape,
  numMath,
  parseSafeExpression,
  prepareRawAnswer,
  representationIssue,
  scoringError,
  simplificationIssue,
  unsupported,
  withVersion,
} from "./checker-core";
import { sameFunctionOverRealDomain } from "./domain-sampling";
import type { AnswerChecker, CheckAnswerInput, CheckAnswerResult } from "./index";
import { getInteractiveModule } from "./interactive/registry";
import { compareIntervalLists, type Interval } from "./interval-helpers";
import { rewritePipeAbsolute } from "./pipe-notation";
import { foldRenderedMinusInAnswer } from "./unicode-minus";

/**
 * The Phase-2 "product" answer checker (Answer_Equivalence_Spec §2-§6, §10). It is
 * a strict SUPERSET of the locked D1 (v1) checker: it grades the same numeric /
 * expression / multiple-choice / multipart arithmetic AND the Phase-2 categories
 * that gate the 42 expansion nodes — radicals, univariate factoring structure,
 * domain-aware rational answers, solution sets, intervals, ordered pairs, target
 * equation forms, numeric precision, positive-exponent form (EXP.1), exact
 * special-angle trig values (TRG.2), and exact radian / pi-multiples (TRG.1).
 *
 * The 2026-07-23 wave clears four more deferred ALGEBRAIC categories to unblock
 * the wave-2 expansion authoring: `is_vertex_form` (POL.5), `set_builder`
 * notation (RAT.5 domain, FUN.4 feature intervals), a restricted standard-form
 * linear equation (`is_standard_form`), and the log expand/condense identities
 * `is_expanded_log` / `is_condensed_log` (EL.5). General equation/inequality
 * equivalence and general trig/log identities remain deferred (§10).
 *
 * The 2026-07-25 wave clears the VARIABLE side of the radical category (RAD.4): a
 * radicand containing free variables is graded by domain-aware numeric sampling
 * (`domain-sampling.ts`), `simplified_radical` recognizes an extractable variable
 * power, and `abs` / `|x|` pipe notation join the radical grammar. All three sit
 * behind ONE gate — the item declaring `allowed_symbols` — and no radical or
 * exact-trig item authored to date declares any, so constant-radicand grading is
 * byte-identical (see `product-answer-checker.additive.test.ts`).
 *
 * The 2026-07-30 wave clears EXACT SOLUTION ROSTERS (EL.6, solving exponential and
 * logarithmic equations): a `solution_set` member may be `log`, `ln` or `sqrt` of a
 * constant, so `{ln(2), ln(3)}` is a statable answer key. This too sits behind ONE
 * gate — the item declaring `representation: "exact"` — and `solutionSetAnswer()`
 * emits `"any"`, so every roster item authored to date grades byte-identically
 * (measured in `product-answer-checker.additive.test.ts`). Arbitrary equation
 * equivalence remains deferred: EL.6 is gradable because solving an equation submits
 * its ROOTS, not an equivalent equation (§10).
 *
 * It runs on the SAME `checker-core` mathjs configuration as v1, so Node and
 * Chromium produce identical verdicts. It is version 2; v1 items keep declaring
 * version 1 and are recomputed by the v1 checker, so this bump never rescores a
 * historical response (Answer_Equivalence_Spec §13.13).
 */
export const PRODUCT_CHECKER_VERSION = 2;

export interface ProductItemVersion {
  item_version_id: string;
  node_id: string;
  answer: AnswerDefinition;
}

export interface ProductCheckerOptions {
  checkerVersion?: number;
  itemVersions: readonly ProductItemVersion[];
}

/**
 * The functions that ARE radicals. Used for the index lookup and for the
 * "no radical left in a denominator" rule — deliberately WITHOUT `abs`, so
 * `1/abs(x)` is not mistaken for an unrationalized denominator.
 */
const RADICAL_FUNCTIONS: ReadonlySet<string> = new Set(["sqrt", "nthRoot", "cbrt"]);

/**
 * The parse grammar for a radical answer on a VARIABLE-AWARE item (one that
 * declares `allowed_symbols`).
 *
 * `abs` is admitted because the canonical simplification of an even root of an
 * even power IS an absolute value (`sqrt(x^2) = |x|`); before this, `abs(x)`
 * graded `unsupported_syntax` and an `abs(x)` answer KEY graded
 * `invalid_answer_key`, so RAD.4 could not state its own answer.
 * `allowSymbolicDenominator` lets an UNRATIONALIZED answer such as `1/sqrt(x)`
 * parse at all, so it can be graded `not_simplified` (the skill) rather than
 * `invalid_input` (unanswered).
 *
 * Both widenings are confined to this object, which is referenced ONLY from
 * {@link compareVariableRadical}; the symbol-free path keeps the narrow
 * {@link RADICAL_FUNCTIONS} grammar it has always had.
 */
const VARIABLE_RADICAL_PARSE_OPTIONS = {
  allowedFunctions: new Set([...RADICAL_FUNCTIONS, "abs"]) as ReadonlySet<string>,
  allowSymbolicDenominator: true,
} as const;

const INFINITY_TOKENS = new Set(["inf", "+inf", "infinity", "+infinity", "∞", "+∞"]);
const NEG_INFINITY_TOKENS = new Set(["-inf", "-infinity", "-∞"]);

/** Logarithm tokens accepted by the EL.5 expand/condense identity path (§ below). */
const LOG_FUNCTIONS: ReadonlySet<string> = new Set(["log", "ln"]);

/**
 * `log`/`ln` bound in the eval scope (the number instance carries no log, exactly
 * as `pi` is bound for TRG.1 — Answer_Equivalence_Spec §9 fallback). BOTH map to
 * the SAME (natural) base on purpose: the log expand/condense identities are
 * base-independent (`log_b(xy) = log_b x + log_b y` for every base b), so grading
 * the property with one fixed base is correct and deterministic across runtimes.
 *
 * **This is one of TWO opposing base policies in this file, and both are deliberate.** Here a
 * uniform `ln`-for-`log` respelling of an EL.5 answer is ACCEPTED, because no EL.5 prompt names
 * a base (measured: 0 of 28) and the identity being graded holds in all of them. Next door,
 * {@link EXACT_ROSTER_SCOPE} does the reverse for EL.6, because a roster member is a number
 * rather than an identity. Neither is an oversight; the pair is recorded in both docstrings so
 * that reading one does not make the other look like a bug.
 *
 * What this binding does NOT license is an answer that uses both tokens at once, which it
 * silently accepted on 21 of 28 served items until {@link logTokenNames} was added: base
 * independence lets a solver choose a base, not two.
 */
const LOG_SCOPE: Readonly<Record<string, (value: number) => number>> = {
  log: Math.log,
  ln: Math.log,
};

/**
 * Positive-only probe BASES: a logarithm's argument must be > 0 to be defined.
 *
 * Twenty rather than the original ten, and each is nudged per submission by
 * {@link derivedSamplePoints} — see that function for why a fixed table was unsound and why
 * the offset is derived rather than random.
 */
const LOG_SAMPLE_BASES: readonly number[] = [
  1.7, 2.3, 3.1, 4.2, 5.3, 2.6, 3.8, 6.1, 7.4, 1.9, 8.3, 9.7, 11.3, 12.9, 13.1, 14.7, 16.3,
  17.9, 19.1, 21.7,
];

/**
 * The grammar a solution-set member may use when the item asks for an EXACT roster
 * (EL.6, solving exponential and logarithmic equations). `2^x = 8` answers `{3}` and
 * needs nothing new, but `e^(2x) - 5e^x + 6 = 0` answers `{ln(2), ln(3)}`, and before
 * this a roster member had to parse as a plain rational.
 */
const EXACT_ROSTER_FUNCTIONS: ReadonlySet<string> = new Set(["log", "ln", "sqrt"]);

/**
 * The eval scope for an exact roster. **`log` is the COMMON logarithm here, and that
 * is deliberately NOT what {@link LOG_SCOPE} does.**
 *
 * `LOG_SCOPE` binds `log` and `ln` both to the natural log because EL.5 grades a base
 * INDEPENDENT identity: `log_b(xy) = log_b x + log_b y` holds in every base, so any one
 * base decides it. A roster member is not an identity, it is a NUMBER, so the base is
 * the whole content of the token: `log 2` is `0.301...` and `ln 2` is `0.693...`. Binding
 * them alike here would grade `{log(2), log(3)}` correct against `{ln(2), ln(3)}`, which
 * is exactly the mistake an EL.6 item exists to catch. Pinned from both sides, in both
 * runtimes, by the `spike:el-6:*Roster:v2` cases in `PRODUCT_GOLDEN_CASES`.
 *
 * mathjs's own `log` is the natural log, so the binding is a deliberate override rather
 * than a restatement of the default.
 *
 * The counterpart ruling is in {@link LOG_SCOPE}: EL.5 accepts a uniform base swap and refuses
 * only a MIXTURE of the two tokens. So the two scopes disagree about `log` on purpose, and the
 * reason is the difference between grading an identity and grading a number.
 */
const EXACT_ROSTER_SCOPE: Readonly<Record<string, (value: number) => number>> = {
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
};

// ---------------------------------------------------------------------------
// numeric (exact) — the v1 arithmetic path, re-expressed on the shared core.
// ---------------------------------------------------------------------------

function compareNumericExact(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = prepareRawAnswer(def.answer_key, def);
  if (expected.result || !expected.parsed) {
    return scoringError("invalid_answer_key");
  }
  const submittedValue = evaluateNumeric(submitted.parsed);
  if (submittedValue.result || submittedValue.value === undefined) {
    return submittedValue.result ?? invalid("parse_error");
  }
  const expectedValue = evaluateNumeric(expected.parsed);
  if (expectedValue.result || expectedValue.value === undefined) {
    return scoringError("invalid_answer_key");
  }
  const representation = representationIssue(
    submitted.parsed,
    def.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }
  const matches = math.equal(submittedValue.value, expectedValue.value);
  if (matches !== true) {
    const opposite = math.equal(
      submittedValue.value,
      math.unaryMinus(expectedValue.value) as MathNumericType,
    );
    return incorrect(opposite === true ? "sign_error" : "value_mismatch");
  }
  const safe = parseSafeExpression(submitted.parsed.expression, def.allowed_symbols);
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  return (
    simplificationIssue(
      submitted.parsed.expression,
      safe.node,
      def.answer_spec.simplification,
    ) ?? correct()
  );
}

// ---------------------------------------------------------------------------
// numeric precision (§6) — round both sides to the declared precision.
// ---------------------------------------------------------------------------

function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  const rounded = Math.round(scaled);
  return (Math.sign(value) || 1) * (rounded / factor);
}

function roundSigFigs(value: number, figures: number): number {
  if (value === 0) {
    return 0;
  }
  const decimals = figures - Math.ceil(Math.log10(Math.abs(value)));
  return roundHalfAwayFromZero(value, decimals);
}

function comparePrecision(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  const precision = def.answer_spec.precision;
  if (!precision || def.answer_key === undefined) {
    return scoringError("missing_precision_configuration");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const representation = representationIssue(
    submitted.parsed,
    def.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }
  const submittedValue = evaluateFloat(submitted.parsed.expression);
  if (submittedValue.result || submittedValue.value === undefined) {
    return submittedValue.result ?? invalid("parse_error");
  }
  const expectedValue = evaluateFloat(String(def.answer_key));
  if (expectedValue.result || expectedValue.value === undefined) {
    return scoringError("invalid_answer_key");
  }
  const round = (v: number): number =>
    precision.mode === "sig_figs"
      ? roundSigFigs(v, precision.value)
      : roundHalfAwayFromZero(v, precision.value);
  return floatEqual(round(submittedValue.value), round(expectedValue.value), 1e-9)
    ? correct()
    : incorrect("value_mismatch");
}

// ---------------------------------------------------------------------------
// radicals (§3, §4 simplified_radical, §9 canonical-form fallback).
// ---------------------------------------------------------------------------

/** Largest square/cube-free check: does an integer have a perfect k-th-power factor > 1? */
function hasPerfectPowerFactor(radicand: number, index: number): boolean {
  const n = Math.abs(Math.trunc(radicand));
  for (let base = 2; base ** index <= n; base += 1) {
    if (n % base ** index === 0) {
      return true;
    }
  }
  return false;
}

/**
 * The multiplicative factors of a radicand, flattening `*` and stripping
 * parentheses. `8*x^5` -> [`8`, `x^5`]; a non-product radicand is its own single
 * factor.
 */
function radicandFactors(node: MathNode, out: MathNode[] = []): MathNode[] {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type === "OperatorNode" && shaped.op === "*" && shaped.args) {
    for (const arg of shaped.args) {
      radicandFactors(arg, out);
    }
    return out;
  }
  out.push(shaped);
  return out;
}

/** The integer exponent of a `x` / `x^k` factor, or `undefined` if it is neither. */
function symbolPowerExponent(node: MathNode): number | undefined {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type === "SymbolNode") {
    return 1;
  }
  if (shaped.type === "OperatorNode" && shaped.op === "^" && shaped.args?.[0]) {
    const base = stripParens(shaped.args[0]) as NodeShape;
    const exponent = stripParens(shaped.args[1] as MathNode) as NodeShape;
    if (base.type === "SymbolNode" && exponent.type === "ConstantNode") {
      const value = Number(exponent.value);
      return Number.isInteger(value) ? value : undefined;
    }
  }
  return undefined;
}

/**
 * Does a VARIABLE-bearing radicand still hold a factor that can be pulled out of
 * an index-`index` root?
 *
 * CANONICAL SIMPLIFIED FORM enforced (Answer_Equivalence_Spec §4
 * `simplified_radical`): for a root of index n, every extractable factor lives
 * OUTSIDE the radical and the radicand is minimal — no integer factor of the
 * constant part is a perfect n-th power, and every variable factor `x^k` has
 * k < n. So `sqrt(8*x^5)` is NOT simplified; its canonical form is
 * `2*x^2*sqrt(2*x)`. (Plus the pre-existing rule that no radical may remain in a
 * denominator.)
 *
 * KNOWN LIMITATION: only a product of constants and variable powers is
 * decomposed. A radicand that is a SUM (`sqrt(x + 1)`) or a QUOTIENT
 * (`sqrt(x^3/y)`) is not analyzed and is therefore not flagged — exactly as the
 * pre-existing constant path declines to analyze what it does not recognize.
 * Value equality is still enforced independently, so an unanalyzed form can only
 * ever be too LENIENT about form, never wrong about value.
 */
function radicandHasExtractableFactor(radicand: MathNode, index: number): boolean {
  for (const factor of radicandFactors(radicand)) {
    const shaped = factor as NodeShape;
    if (
      shaped.type === "ConstantNode" &&
      hasPerfectPowerFactor(Number(shaped.value), index)
    ) {
      return true;
    }
    const exponent = symbolPowerExponent(shaped);
    if (exponent !== undefined && exponent >= index) {
      return true;
    }
  }
  return false;
}

function radicalNotSimplified(node: MathNode): InternalResult | undefined {
  const shaped = node as NodeShape;
  if (node.type === "FunctionNode") {
    const name = shaped.fn?.name ?? shaped.name;
    const index = name === "sqrt" ? 2 : name === "cbrt" ? 3 : undefined;
    const args = shaped.args ?? [];
    let radicalIndex = index;
    if (name === "nthRoot") {
      const idxNode = args[1] as NodeShape | undefined;
      radicalIndex = Number(idxNode?.value);
    }
    const radicandNode = args[0] as NodeShape | undefined;
    if (
      radicalIndex &&
      Number.isInteger(radicalIndex) &&
      radicandNode?.type === "ConstantNode" &&
      hasPerfectPowerFactor(Number(radicandNode.value), radicalIndex)
    ) {
      return incorrect("not_simplified");
    }
    // VARIABLE radicands (RAD.4). Gated on the radicand actually containing a
    // free symbol, so a constant radicand — a bare ConstantNode above, or any
    // all-numeric expression — can NEVER reach the factor decomposition and no
    // pre-existing constant verdict can move.
    if (
      radicalIndex &&
      Number.isInteger(radicalIndex) &&
      radicandNode &&
      radicandNode.type !== "ConstantNode" &&
      containsSymbol(radicandNode) &&
      radicandHasExtractableFactor(radicandNode, radicalIndex)
    ) {
      return incorrect("not_simplified");
    }
  }
  // A radical anywhere in a denominator is not rationalized.
  if (node.type === "OperatorNode" && shaped.op === "/" && shaped.args?.[1]) {
    if (containsRadical(shaped.args[1])) {
      return incorrect("not_simplified");
    }
  }
  for (const child of shaped.args ?? []) {
    const issue = radicalNotSimplified(child);
    if (issue) {
      return issue;
    }
  }
  if (shaped.content) {
    return radicalNotSimplified(shaped.content);
  }
  return undefined;
}

function containsRadical(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (node.type === "FunctionNode") {
    const name = shaped.fn?.name ?? shaped.name;
    if (name && RADICAL_FUNCTIONS.has(name)) {
      return true;
    }
  }
  if (shaped.content && containsRadical(shaped.content)) {
    return true;
  }
  return shaped.args?.some(containsRadical) ?? false;
}

/**
 * Enforce the requested radical FORM on an already value-correct answer.
 * `canonical_exact_trig_value` (TRG.2) reuses the same structural check: an exact
 * special-angle value (0, 1/2, sqrt(2)/2, sqrt(3)/3, ...) must carry no
 * perfect-power factor under a root and no radical in a denominator.
 */
function radicalFormIssue(node: MathNode, def: AnswerDefinition): InternalResult {
  if (
    def.answer_spec.simplification === "simplified_radical" ||
    def.answer_spec.simplification === "canonical_exact_trig_value"
  ) {
    const issue = radicalNotSimplified(node);
    if (issue) {
      return issue;
    }
  }
  return correct();
}

/**
 * A constant radical value held EXACTLY, as a rational combination of square roots of
 * SQUAREFREE integers: `{ 1n => a, r => b, ... }` means `a + b*sqrt(r) + ...`.
 *
 * This is the arithmetic {@link compareConstantRadical} needed and did not have. Comparing two
 * surds as doubles at a tolerance accepted a RATIONAL for an irrational — `13860/19601` for
 * `sqrt(2)/2`, which are unequal by an elementary argument and not by a digit count — on 68 of
 * 68 distinct keys a near-miss could be constructed for (strictness report L6/L7). A tolerance
 * cannot be tightened out of that: the two numbers really are that close, and the reason they
 * are unequal is structural.
 *
 * Held over the shared {@link Rational} helpers below rather than a second bigint layer. One
 * squarefree radicand per key is what makes equality decidable by comparing maps: `sqrt(18)`
 * and `3*sqrt(2)` normalize to the same `{ 2n => 3 }`, so equal values written differently stay
 * equal and the form rule — not the value rule — is what refuses the unsimplified spelling.
 *
 * Anything the reader cannot place in such a field (a nested radical, a cube root of a
 * non-cube, a denominator of three or more surd terms) returns `undefined`, and
 * {@link compareConstantRadical} falls back to the float comparison it always did. So this is
 * strictly a widening of what can be decided exactly.
 */
type SurdValue = ReadonlyMap<bigint, Rational>;

/** The radicand key of the RATIONAL part: `sqrt(1)` is 1. */
const SURD_RATIONAL_RADICAND = 1n;

/**
 * How far trial division will go to make a radicand squarefree. The served pool's radicands are
 * all below 40; a learner who writes `sqrt(99999999999)` gets `undefined` and the float
 * fallback rather than a long loop.
 */
const SQUAREFREE_TRIAL_LIMIT = 100000n;

/** `n = square^2 * free` with `free` squarefree, or `null` when that cannot be shown cheaply. */
function squarefreeSplit(value: bigint): { square: bigint; free: bigint } | null {
  if (value <= 0n) {
    return null;
  }
  let remaining = value;
  let square = 1n;
  for (let d = 2n; d * d <= remaining; d += 1n) {
    if (d > SQUAREFREE_TRIAL_LIMIT) {
      // A prime square above the limit could still divide `remaining`, so the result would
      // not be provably squarefree. Fail closed.
      return null;
    }
    while (remaining % (d * d) === 0n) {
      remaining /= d * d;
      square *= d;
    }
    while (remaining % d === 0n && (remaining / d) % d === 0n) {
      remaining /= d * d;
      square *= d;
    }
  }
  return { square, free: remaining };
}

/** The exact `index`-th root of a non-negative bigint, or `null` if it is not a perfect power. */
function exactIntegerRoot(value: bigint, index: number): bigint | null {
  if (value < 0n || index < 1) {
    return null;
  }
  if (value < 2n) {
    return value;
  }
  let low = 1n;
  let high = 1n;
  while (high ** BigInt(index) < value) {
    high *= 2n;
  }
  while (low <= high) {
    const mid = (low + high) / 2n;
    const power = mid ** BigInt(index);
    if (power === value) {
      return mid;
    }
    if (power < value) {
      low = mid + 1n;
    } else {
      high = mid - 1n;
    }
  }
  return null;
}

function rationalDivide(a: Rational, b: Rational): Rational | null {
  return b.n === 0n ? null : makeRational(a.n * b.d, a.d * b.n);
}

function surdOfRational(value: Rational): SurdValue {
  return value.n === 0n ? new Map() : new Map([[SURD_RATIONAL_RADICAND, value]]);
}

function surdTerms(value: SurdValue): [bigint, Rational][] {
  return [...value.entries()]
    .filter(([, c]) => c.n !== 0n)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

function surdAdd(a: SurdValue, b: SurdValue): SurdValue | undefined {
  const out = new Map<bigint, Rational>(a);
  for (const [radicand, coefficient] of b) {
    const existing = out.get(radicand);
    const sum = existing ? addRational(existing, coefficient) : coefficient;
    if (!sum) {
      return undefined;
    }
    out.set(radicand, sum);
  }
  return out;
}

function surdNegate(a: SurdValue): SurdValue {
  return new Map([...a.entries()].map(([r, c]) => [r, negateRational(c)]));
}

function surdMultiply(a: SurdValue, b: SurdValue): SurdValue | undefined {
  const out = new Map<bigint, Rational>();
  for (const [leftRadicand, leftCoefficient] of a) {
    for (const [rightRadicand, rightCoefficient] of b) {
      const split = squarefreeSplit(leftRadicand * rightRadicand);
      if (!split) {
        return undefined;
      }
      // sqrt(p) * sqrt(q) = sqrt(pq) = square * sqrt(free).
      const scaled = multiplyRational(leftCoefficient, rightCoefficient);
      const term = scaled ? multiplyRational(scaled, { n: split.square, d: 1n }) : null;
      if (!term) {
        return undefined;
      }
      const existing = out.get(split.free);
      const sum = existing ? addRational(existing, term) : term;
      if (!sum) {
        return undefined;
      }
      out.set(split.free, sum);
    }
  }
  return out;
}

/**
 * `1 / value`, when the reciprocal stays in a field this reader can hold.
 *
 * One term is `1/(c*sqrt(r)) = sqrt(r)/(c*r)`. Two terms are rationalized by the conjugate,
 * which is what makes `6/sqrt(2)` and `4/(sqrt(6)-sqrt(2))` decidable. Three or more surd terms
 * in a denominator are not attempted.
 */
function surdReciprocal(value: SurdValue): SurdValue | undefined {
  const terms = surdTerms(value);
  if (terms.length === 1) {
    const [radicand, coefficient] = terms[0] as [bigint, Rational];
    if (radicand === SURD_RATIONAL_RADICAND) {
      const inverse = rationalDivide(RATIONAL_ONE, coefficient);
      return inverse ? surdOfRational(inverse) : undefined;
    }
    const denominator = multiplyRational(coefficient, { n: radicand, d: 1n });
    const scale = denominator ? rationalDivide(RATIONAL_ONE, denominator) : null;
    return scale ? new Map([[radicand, scale]]) : undefined;
  }
  if (terms.length === 2) {
    const [firstRadicand, firstCoefficient] = terms[0] as [bigint, Rational];
    const [secondRadicand, secondCoefficient] = terms[1] as [bigint, Rational];
    // (a√p + b√q)(a√p - b√q) = a²p - b²q, a rational.
    const firstSquare = multiplyRational(
      multiplyRational(firstCoefficient, firstCoefficient) ?? RATIONAL_ZERO,
      { n: firstRadicand, d: 1n },
    );
    const secondSquare = multiplyRational(
      multiplyRational(secondCoefficient, secondCoefficient) ?? RATIONAL_ZERO,
      { n: secondRadicand, d: 1n },
    );
    if (!firstSquare || !secondSquare) {
      return undefined;
    }
    const norm = addRational(firstSquare, negateRational(secondSquare));
    if (!norm || norm.n === 0n) {
      return undefined;
    }
    const scale = rationalDivide(RATIONAL_ONE, norm);
    if (!scale) {
      return undefined;
    }
    const conjugate: SurdValue = new Map([
      [firstRadicand, firstCoefficient],
      [secondRadicand, negateRational(secondCoefficient)],
    ]);
    return surdMultiply(conjugate, surdOfRational(scale));
  }
  return undefined;
}

/** `sqrt(value)`, exactly, when `value` is a non-negative rational. */
function surdSqrt(value: SurdValue): SurdValue | undefined {
  const terms = surdTerms(value);
  if (terms.length === 0) {
    return new Map();
  }
  if (terms.length !== 1) {
    return undefined; // a nested radical: not in this field.
  }
  const [radicand, coefficient] = terms[0] as [bigint, Rational];
  if (radicand !== SURD_RATIONAL_RADICAND || coefficient.n < 0n) {
    return undefined; // sqrt of a surd, or a non-real even root.
  }
  // sqrt(n/d) = sqrt(n*d)/d.
  const split = squarefreeSplit(coefficient.n * coefficient.d);
  if (!split) {
    return undefined;
  }
  const scale = makeRational(split.square, coefficient.d);
  if (!scale) {
    return undefined;
  }
  return split.free === SURD_RATIONAL_RADICAND
    ? surdOfRational(scale)
    : new Map([[split.free, scale]]);
}

/** `nthRoot(value, index)`, only when the result is rational. */
function surdRoot(value: SurdValue, index: number): SurdValue | undefined {
  if (index === 2) {
    return surdSqrt(value);
  }
  const terms = surdTerms(value);
  if (terms.length === 0) {
    return new Map();
  }
  if (terms.length !== 1) {
    return undefined;
  }
  const [radicand, coefficient] = terms[0] as [bigint, Rational];
  if (radicand !== SURD_RATIONAL_RADICAND || index < 2 || index > 32) {
    return undefined;
  }
  const negative = coefficient.n < 0n;
  if (negative && index % 2 === 0) {
    return undefined; // not real
  }
  const numerator = exactIntegerRoot(bigAbs(coefficient.n), index);
  const denominator = exactIntegerRoot(coefficient.d, index);
  if (numerator === null || denominator === null) {
    return undefined;
  }
  const root = makeRational(negative ? -numerator : numerator, denominator);
  return root ? surdOfRational(root) : undefined;
}

function surdPower(base: SurdValue, exponent: number): SurdValue | undefined {
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 32) {
    return undefined;
  }
  let out: SurdValue = surdOfRational(RATIONAL_ONE);
  for (let i = 0; i < Math.abs(exponent); i += 1) {
    const next = surdMultiply(out, base);
    if (!next) {
      return undefined;
    }
    out = next;
  }
  return exponent < 0 ? surdReciprocal(out) : out;
}

/** The exact value of a symbol-free radical expression, or `undefined` if it is out of field. */
function exactSurdValue(node: MathNode): SurdValue | undefined {
  const shaped = node as NodeShape;
  switch (node.type) {
    case "ParenthesisNode":
      return shaped.content ? exactSurdValue(shaped.content) : undefined;
    case "ConstantNode": {
      const value = rationalFromConstant(shaped.value);
      return value ? surdOfRational(value) : undefined;
    }
    case "FunctionNode": {
      const name = shaped.fn?.name ?? shaped.name;
      const args = shaped.args ?? [];
      const first = args[0] ? exactSurdValue(args[0]) : undefined;
      if (!first) {
        return undefined;
      }
      if (name === "sqrt" && args.length === 1) {
        return surdSqrt(first);
      }
      if (name === "cbrt" && args.length === 1) {
        return surdRoot(first, 3);
      }
      if (name === "nthRoot" && args.length === 2 && args[1]) {
        const index = exactSurdValue(args[1]);
        const terms = index ? surdTerms(index) : [];
        const only = terms.length === 1 ? terms[0] : undefined;
        if (!only || only[0] !== SURD_RATIONAL_RADICAND || only[1].d !== 1n) {
          return undefined;
        }
        return surdRoot(first, Number(only[1].n));
      }
      return undefined;
    }
    case "OperatorNode": {
      const args = shaped.args ?? [];
      if (args.length === 1 && args[0]) {
        const inner = exactSurdValue(args[0]);
        if (!inner || (shaped.op !== "-" && shaped.op !== "+")) {
          return undefined;
        }
        return shaped.op === "-" ? surdNegate(inner) : inner;
      }
      if (args.length !== 2 || !args[0] || !args[1]) {
        return undefined;
      }
      const left = exactSurdValue(args[0]);
      if (!left) {
        return undefined;
      }
      if (shaped.op === "^") {
        const exponent = exactSurdValue(args[1]);
        const terms = exponent ? surdTerms(exponent) : [];
        const only = terms.length === 1 ? terms[0] : undefined;
        if (!only || only[0] !== SURD_RATIONAL_RADICAND || only[1].d !== 1n) {
          return undefined;
        }
        return surdPower(left, Number(only[1].n));
      }
      const right = exactSurdValue(args[1]);
      if (!right) {
        return undefined;
      }
      switch (shaped.op) {
        case "+":
          return surdAdd(left, right);
        case "-":
          return surdAdd(left, surdNegate(right));
        case "*":
          return surdMultiply(left, right);
        case "/": {
          const reciprocal = surdReciprocal(right);
          return reciprocal ? surdMultiply(left, reciprocal) : undefined;
        }
        default:
          return undefined;
      }
    }
    default:
      return undefined;
  }
}

function surdEqual(a: SurdValue, b: SurdValue): boolean {
  const left = surdTerms(a);
  const right = surdTerms(b);
  if (left.length !== right.length) {
    return false;
  }
  return left.every(([radicand, coefficient], index) => {
    const [otherRadicand, otherCoefficient] = right[index] as [bigint, Rational];
    return (
      radicand === otherRadicand &&
      coefficient.n === otherCoefficient.n &&
      coefficient.d === otherCoefficient.d
    );
  });
}

/**
 * Tolerance for the residual float comparison — the shapes {@link exactSurdValue} declines.
 *
 * 1e-12 rather than `floatEqual`'s 1e-9 default, and the number is measured rather than picked:
 * over 626 legitimate alternate spellings of all 116 distinct keys served in this cohort, the
 * worst relative disagreement between two spellings of the same value is 2.093e-16
 * (`3*sqrt(2)` against `sqrt(18)`). That leaves four orders of magnitude of headroom above
 * what double arithmetic actually loses, while the smallest perturbation demonstrated in the
 * strictness report sits at 2.5e-10 — five orders on the other side.
 */
const CONSTANT_RADICAL_TOLERANCE = 1e-12;

/**
 * The SYMBOL-FREE radical path: parse against the narrow `{sqrt, nthRoot, cbrt}` grammar,
 * decide value equality EXACTLY where {@link exactSurdValue} can read both sides, fall back to
 * a tightened float comparison where it cannot, then check form.
 *
 * Kept as a separate function so the additivity argument in {@link compareRadical} is
 * verifiable by inspection: nothing the 2026-07-25 variable wave added is reachable from here.
 *
 * **The form rule deliberately does NOT require a radical to be present.** That was the cheap
 * reading of L7 and it would refuse 61 of these 152 served items their own answer key: the
 * `canonical_exact_trig_value` half is full of angles whose exact value is a plain rational
 * (`3/5`, `-24/7`, `20/21`, and 45 more distinct values). Exactness closes the same hole from
 * the other side — a radical-free answer is refused against an irrational key because the two
 * are UNEQUAL, and accepted against a rational key because it is right — so no gate has to
 * guess what shape an answer ought to be. See `constantRadicalExact.test.ts`.
 */
function compareConstantRadical(
  expression: string,
  key: string,
  def: AnswerDefinition,
): InternalResult {
  const safe = parseSafeExpression(expression, [], {
    allowedFunctions: RADICAL_FUNCTIONS,
  });
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  const submittedValue = evaluateFloat(expression, []);
  if (submittedValue.result || submittedValue.value === undefined) {
    return submittedValue.result ?? invalid("parse_error");
  }
  const expectedValue = evaluateFloat(key, []);
  if (expectedValue.result || expectedValue.value === undefined) {
    return scoringError("invalid_answer_key");
  }
  const keySafe = parseSafeExpression(key, [], { allowedFunctions: RADICAL_FUNCTIONS });
  const submittedExact = exactSurdValue(safe.node);
  const expectedExact = keySafe.node ? exactSurdValue(keySafe.node) : undefined;
  if (submittedExact && expectedExact) {
    if (!surdEqual(submittedExact, expectedExact)) {
      return surdEqual(submittedExact, surdNegate(expectedExact))
        ? incorrect("sign_error")
        : incorrect("value_mismatch");
    }
    return radicalFormIssue(safe.node, def);
  }
  if (!floatEqual(submittedValue.value, expectedValue.value, CONSTANT_RADICAL_TOLERANCE)) {
    return floatEqual(
      submittedValue.value,
      -expectedValue.value,
      CONSTANT_RADICAL_TOLERANCE,
    )
      ? incorrect("sign_error")
      : incorrect("value_mismatch");
  }
  return radicalFormIssue(safe.node, def);
}

/**
 * The VARIABLE-AWARE radical path (RAD.4), new in the 2026-07-25 wave. Reached
 * only for an item that declares `allowed_symbols`.
 *
 * Three things differ from the symbol-free path, and all three are what RAD.4
 * needs: `|x|` is rewritten to `abs(x)` before parsing, the grammar admits `abs`
 * and a symbolic denominator (so an unrationalized `1/sqrt(x)` can be graded
 * `not_simplified` — the skill — instead of `invalid_input` — unanswered), and
 * value equality is decided by domain-aware sampling rather than by a scope-less
 * `evaluate()`, which throws on any free variable.
 */
function compareVariableRadical(
  expression: string,
  key: string,
  symbols: readonly string[],
  def: AnswerDefinition,
): InternalResult {
  // `|x|` -> `abs(x)` before parsing (mathjs cannot read a pipe at all). An
  // ambiguous or unbalanced pipe run fails closed here rather than being parsed
  // on a guessed reading (see `pipe-notation.ts`).
  const submittedPipes = rewritePipeAbsolute(expression);
  if (submittedPipes.reason || submittedPipes.expression === undefined) {
    return invalid(submittedPipes.reason ?? "parse_error");
  }
  const keyPipes = rewritePipeAbsolute(key);
  if (keyPipes.reason || keyPipes.expression === undefined) {
    return scoringError("invalid_answer_key");
  }
  const safe = parseSafeExpression(
    submittedPipes.expression,
    symbols,
    VARIABLE_RADICAL_PARSE_OPTIONS,
  );
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  const sampled = sameFunctionOverRealDomain(
    submittedPipes.expression,
    keyPipes.expression,
    symbols,
    VARIABLE_RADICAL_PARSE_OPTIONS,
  );
  if (sampled.result) {
    return sampled.result;
  }
  if (!sampled.matches) {
    return sampled.opposite ? incorrect("sign_error") : incorrect("value_mismatch");
  }
  return radicalFormIssue(safe.node, def);
}

/**
 * Radical answers (§3, §4 `simplified_radical`, §9).
 *
 * THE ADDITIVITY GATE for the 2026-07-25 variable wave is the single condition
 * below: does the ITEM declare `allowed_symbols`? Every radical and exact-trig
 * item authored to date is built by `radicalAnswer()` / `exactTrigValueAnswer()`,
 * both of which emit a `numeric` answer with NO `allowed_symbols`, so all of them
 * take {@link compareConstantRadical} — the byte-for-byte pre-existing path — and
 * cannot reach the pipe rewriter, the widened grammar, or the sampler at all.
 * The gate is a property of the ITEM, not of the submitted string, so it cannot
 * be flipped by anything a student types.
 */
function compareRadical(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  // representation:exact rejects a decimal approximation of the radical.
  const representation = representationIssue(
    submitted.parsed,
    def.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }
  const symbols = def.allowed_symbols ?? [];
  const key = String(def.answer_key);
  return symbols.length > 0
    ? compareVariableRadical(submitted.parsed.expression, key, symbols, def)
    : compareConstantRadical(submitted.parsed.expression, key, def);
}

// ---------------------------------------------------------------------------
// positive exponents (§4 positive_exponents, EXP.1) — equality by NUMERIC
// IDENTITY at fixed probe points (a prior probe showed `rationalize` does not
// reliably cancel these), then a no-negative-exponent form check. Stays checker
// version 2: there are no v2 responses in production yet, so nothing is rescored.
// ---------------------------------------------------------------------------

/**
 * Probe BASES for the multi-point numeric-identity test.
 *
 * Non-integer and mixed-sign so two DISTINCT low-degree rational functions cannot agree at all
 * of them, all nonzero so a variable base is never 0 (guards a negative exponent / division by
 * zero), and none within 0.2 of ±1 so the per-submission offset below cannot land on ±1 and
 * make `x`, `x^2` and `x^k` coincide.
 *
 * Twenty rather than the original ten, which alone puts the vanishing-product attack past the
 * 128-character input cap; the offsets are what make it unsound rather than merely expensive.
 */
const IDENTITY_SAMPLE_BASES: readonly number[] = [
  1.7, 2.3, 3.1, -1.3, -2.9, 4.2, 5.3, -3.7, 2.6, 3.8, 6.1, -4.9, 7.3, -6.3, 8.9, -7.7, 9.7,
  -8.3, 11.3, -10.9,
];

/**
 * A 32-bit FNV-1a hash of `text`, in integer arithmetic only.
 *
 * `Math.imul` and `>>> 0` are exact 32-bit integer operations and `charCodeAt` is a UTF-16 code
 * unit, so this returns the identical number in Node and in Chromium. That is the whole reason
 * it is written this way: {@link derivedSamplePoints} needs a seed that varies with the
 * submission but not with the runtime, and a float accumulation would not have guaranteed the
 * second half.
 */
function stringHash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash ^ text.charCodeAt(index)) >>> 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** How many distinct thousandths the per-submission offset can take. */
const SAMPLE_OFFSET_STEPS = 89;

/**
 * The probe points for ONE comparison: each base nudged by an offset derived from the submitted
 * string and the key.
 *
 * ## Why the points cannot be a fixed table
 *
 * A published probe list is a list of the only places an answer is ever checked, and that is
 * all an attack needs. Against the ten-point table this replaced, `x^5` plus a degree-10
 * polynomial vanishing at exactly those ten points graded CORRECT on 34 of 34 served exponent
 * items and 21 of 28 log items, in 83 characters (strictness report L8/L9). At `x = 0` the
 * accepted expression is about -9.0e4 where the key is 0. Dropping one factor was correctly
 * refused, which is the tell: the sampler was sound, its point set was public.
 *
 * ## Why the seed is DERIVED and never random
 *
 * Both samplers' contracts require identical verdicts in Node and Chromium, and a learner who
 * resubmits the same answer must get the same result. So the variation cannot come from an RNG,
 * a clock or a call counter; it comes from the only thing that distinguishes one grading from
 * another, namely what was submitted and against what. Building a product that vanishes at
 * these points now needs a string whose own hash names the roots the string contains, which is
 * a preimage problem rather than an exercise.
 *
 * The offset stays within 0.089 so every invariant the bases were chosen for survives it: the
 * sign is preserved, the value stays non-integer, and nothing reaches 0 or ±1.
 */
function derivedSamplePoints(
  bases: readonly number[],
  submitted: string,
  key: string,
): number[] {
  // A NUL separator, so `("ab", "c")` and `("a", "bc")` cannot seed the same battery.
  const seed = stringHash32(`${submitted}\u0000${key}`);
  return bases.map((base, index) => {
    const offset = ((stringHash32(`${seed}:${index}`) % SAMPLE_OFFSET_STEPS) + 1) / 1000;
    return base < 0 ? base - offset : base + offset;
  });
}

/** Grammar for EXP.1: bounded negative integer exponents + symbolic denominators. */
const EXPONENT_PARSE_OPTIONS = {
  allowNegativeExponent: true,
  allowSymbolicDenominator: true,
} as const;

/** Guard-parse then float-evaluate `expression` at `scope` (never throws). The
 * scope may bind functions (e.g. `log`/`ln`) as well as variable values. */
function evaluateFloatAtScope(
  expression: string,
  scope: Record<string, number | ((value: number) => number)>,
  symbols: readonly string[],
  extra: Parameters<typeof parseSafeExpression>[2],
): { value?: number; result?: InternalResult } {
  const safe = parseSafeExpression(expression, symbols, extra);
  if (safe.result || !safe.node) {
    return { result: safe.result ?? invalid("parse_error") };
  }
  try {
    const value = numMath.parse(expression).evaluate(scope) as unknown;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { result: invalid("non_numeric_answer") };
    }
    return { value };
  } catch {
    return { result: invalid("parse_error") };
  }
}

/**
 * Are `submitted` and `key` the SAME function of `symbols`? Compared at the probe
 * points {@link derivedSamplePoints} builds for this pair: they must agree (within
 * tolerance) wherever both are defined, and a point where only one is defined is a
 * real difference. The key must evaluate somewhere, else it is a bad key.
 */
function sameFunction(
  submitted: string,
  key: string,
  symbols: readonly string[],
  extra: Parameters<typeof parseSafeExpression>[2],
): { matches?: boolean; result?: InternalResult } {
  const keySafe = parseSafeExpression(key, symbols, extra);
  if (keySafe.result || !keySafe.node) {
    return { result: scoringError("invalid_answer_key") };
  }
  const points = derivedSamplePoints(IDENTITY_SAMPLE_BASES, submitted, key);
  let comparedFinite = 0;
  let keyFiniteAnywhere = false;
  for (let sample = 0; sample < points.length; sample += 1) {
    const scope: Record<string, number> = {};
    symbols.forEach((symbol, index) => {
      const point = points[(sample + index * 3) % points.length];
      scope[symbol] = point ?? 1;
    });
    const a = evaluateFloatAtScope(submitted, scope, symbols, extra);
    const b = evaluateFloatAtScope(key, scope, symbols, extra);
    const aOk = !a.result && a.value !== undefined;
    const bOk = !b.result && b.value !== undefined;
    if (bOk) {
      keyFiniteAnywhere = true;
    }
    if (!aOk && !bOk) {
      continue; // shared domain exclusion: not a distinguishing point.
    }
    if (aOk !== bOk) {
      return { matches: false }; // one defined, the other not => different.
    }
    comparedFinite += 1;
    if (!floatEqual(a.value as number, b.value as number)) {
      return { matches: false };
    }
  }
  if (!keyFiniteAnywhere) {
    return { result: scoringError("invalid_answer_key") };
  }
  if (comparedFinite === 0) {
    return { result: invalid("parse_error") };
  }
  return { matches: true };
}

function compareExponentExpression(
  rawAnswer: unknown,
  def: AnswerDefinition,
): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const symbols = def.allowed_symbols ?? ["x"];
  const safe = parseSafeExpression(
    submitted.parsed.expression,
    symbols,
    EXPONENT_PARSE_OPTIONS,
  );
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  const identity = sameFunction(
    submitted.parsed.expression,
    def.answer_key,
    symbols,
    EXPONENT_PARSE_OPTIONS,
  );
  if (identity.result) {
    return identity.result;
  }
  if (!identity.matches) {
    return incorrect("value_mismatch");
  }
  // Value-correct: now require positive-exponent FORM (§4). A `x^-2` that equals
  // the key is graded `not_simplified`, not `correct`.
  return (
    simplificationIssue(
      submitted.parsed.expression,
      safe.node,
      def.answer_spec.simplification,
    ) ?? correct()
  );
}

// ---------------------------------------------------------------------------
// pi / exact radian (§6, TRG.1) — `pi` is bound in the eval scope (the number
// instance has no pi constant) and allowed in the grammar; representation:exact
// rejects a decimal approximation of the radian; compared by float tolerance.
// ---------------------------------------------------------------------------

const PI_SCOPE: Readonly<Record<string, number>> = { pi: Math.PI };

function comparePiExact(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  // representation:exact rejects "1.05" for "pi/3" (an approximation, §6).
  const representation = representationIssue(
    submitted.parsed,
    def.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }
  const symbols = def.allowed_symbols ?? ["pi"];
  const submittedValue = evaluateFloatAtScope(
    submitted.parsed.expression,
    { ...PI_SCOPE },
    symbols,
    {},
  );
  if (submittedValue.result || submittedValue.value === undefined) {
    return submittedValue.result ?? invalid("parse_error");
  }
  const expectedValue = evaluateFloatAtScope(
    String(def.answer_key),
    { ...PI_SCOPE },
    symbols,
    {},
  );
  if (expectedValue.result || expectedValue.value === undefined) {
    return scoringError("invalid_answer_key");
  }
  if (!floatEqual(submittedValue.value, expectedValue.value)) {
    return floatEqual(submittedValue.value, -expectedValue.value)
      ? incorrect("sign_error")
      : incorrect("value_mismatch");
  }
  return correct();
}

// ---------------------------------------------------------------------------
// solution_set (§2) — a roster of values, order-insensitive.
// ---------------------------------------------------------------------------

/** The word form of the roster separator, spaced on both sides so `39and51` is not one. */
const AND_SEPARATOR = " and ";

/**
 * The offsets of the separators that join a roster's MEMBERS, which is only the ones at
 * bracket depth zero.
 *
 * Ported from `apps/web/src/lessons/cfuAcceptanceConvention.test.tsx`, where the same depth
 * rule was already written to rewrite one authored answer's separators without touching the
 * commas INSIDE its parts. A flat `split(/[,;]| and /)` is the mistake this exists to avoid:
 * a member of an exact roster may be a two-argument call (`nthRoot(8, 3)`, and `log` is in
 * {@link EXACT_ROSTER_FUNCTIONS}), and a flat split cuts it in half.
 *
 * `[` and `]` are deliberately NOT group delimiters here, and that is the same ruling the
 * note on {@link parseValueList} makes one layer down. A comma inside square brackets in
 * THIS field is an interval's comma, so there is no grouped list to protect — and treating
 * the bracket as a group would hand mathjs `[6, 20]` whole, as an ARRAY LITERAL, whose
 * reason code is `unsupported_syntax` where four rows of
 * `product-answer-checker.additive.test.ts` pin the `parse_error` that a split-and-fail
 * produces. Measured rather than reasoned: those rows are `[-2, 2]`, `[2, -2]`, `[-2, 8]`
 * and `[8, -2]`, and they are the interval-versus-roster guard.
 */
function memberSeparators(text: string): { start: number; end: number }[] {
  const found: { start: number; end: number }[] = [];
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (char === "(" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "}") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (char === "," || char === ";")) {
      found.push({ start: index, end: index + 1 });
    } else if (
      depth === 0 &&
      text.slice(index, index + AND_SEPARATOR.length).toLowerCase() === AND_SEPARATOR
    ) {
      found.push({ start: index, end: index + AND_SEPARATOR.length });
      index += AND_SEPARATOR.length - 1;
    }
  }
  return found;
}

/**
 * A roster's members. A roster is written BARE or in BRACES, and those are the only two
 * wrappers stripped here.
 *
 * **The three separators are interchangeable**, because the content has said so since
 * `solutionSetForms` was written: it spells every roster it generates with `", "`, `"; "`
 * and `" and "`, and the authored packs list all three. Splitting on the comma alone made
 * `39; 51` ONE unparseable member, so a learner copying the spelling their own accepted list
 * offers was graded `invalid_input` — the content and the grader disagreeing about the same
 * answer. LIN.5, POL.3 and POL.4 are the nodes that reached.
 *
 * Interval brackets are deliberately left in place, so `[6, 20]` fails the member parse
 * exactly as `(6, 20)` always has. Stripping `[` and `]` alongside the braces made an
 * interval and a roster over the same two numbers the same list, which graded `[6, 20]`
 * CORRECT for the set `{6, 20}` — and `[20, 6]`, whose ends are in the wrong order and which
 * therefore denotes nothing at all. LIN.4 sits immediately before LIN.5 and its whole second
 * slide teaches that `[a, b]` is every number BETWEEN a and b, so the accepted spelling was
 * the misreading the previous lesson exists to prevent. That ruling is what
 * {@link memberSeparators} keeps out of its depth rule.
 */
function parseValueList(raw: string): string[] {
  const inner = raw.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
  if (!inner || /^(no solution|none|∅|empty|\{\})$/i.test(raw.trim())) {
    return [];
  }
  const spans = memberSeparators(inner);
  const pieces: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    pieces.push(inner.slice(cursor, span.start));
    cursor = span.end;
  }
  pieces.push(inner.slice(cursor));
  return pieces.map((piece) => piece.trim()).filter((piece) => piece.length > 0);
}

function evalExactNumber(expression: string): { value?: number; result?: InternalResult } {
  const evaluated = evaluateNumeric({ expression, hadPercent: false });
  if (evaluated.result || evaluated.value === undefined) {
    return { result: evaluated.result ?? invalid("parse_error") };
  }
  return { value: Number(evaluated.value) };
}

/**
 * One roster member's value. `exact` widens the grammar to {@link EXACT_ROSTER_FUNCTIONS}
 * evaluated at {@link EXACT_ROSTER_SCOPE}; without it this is the rational-only path
 * every solution-set item has always taken.
 *
 * The rational branch returns the `Fraction` `evaluateNumeric` produced, NOT
 * `Number(...)` of it. That one conversion is what {@link rosterValuesEqual} needs and what
 * `evalExactNumber` (whose callers want a JS number for an interval end or a point
 * coordinate) cannot give it.
 */
function evalRosterMember(
  expression: string,
  exact: boolean,
): { value?: MathNumericType; result?: InternalResult } {
  if (!exact) {
    const evaluated = evaluateNumeric({ expression, hadPercent: false });
    if (evaluated.result || evaluated.value === undefined) {
      return { result: evaluated.result ?? invalid("parse_error") };
    }
    return { value: evaluated.value };
  }
  return evaluateFloatAtScope(expression, { ...EXACT_ROSTER_SCOPE }, [], {
    allowedFunctions: EXACT_ROSTER_FUNCTIONS,
  });
}

/**
 * Are two roster members the same value? **Two paths, and the split is the whole point.**
 *
 * The RATIONAL path compares exactly. `checker-core` configures mathjs `number: "Fraction"`,
 * so a member is already read as an exact rational on the way in and `2/5`, `0.4` and `4/10`
 * are one value; comparing at `floatEqual`'s 1e-9 threw that away and made
 * `7.0000000001` a root of an equation whose root is `7`. Worse, the same comparison drives
 * the DEDUPE in {@link toValueSet}, so a learner who asserted a third solution to a
 * two-solution equation had the wrong claim deleted rather than graded — `extra_solution`
 * could not fire (strictness report L3/L4/L5; `rosterExactValues.test.ts`).
 *
 * The EXACT path (EL.6) keeps a tolerance because it must: `ln(3)` has no rational value, and
 * `ln(9)/2` is the same number as `ln(3)` while agreeing with it only in the last bits of a
 * double. An exact comparison there would refuse a correct answer, so this is two paths and
 * not one, and `EXACT_ROSTER_SCOPE`'s own binding is what keeps `{log(3), log(5)}` wrong for
 * `{ln(3), ln(5)}` on that branch.
 */
function rosterValuesEqual(
  left: MathNumericType,
  right: MathNumericType,
  exact: boolean,
): boolean {
  if (exact) {
    return floatEqual(Number(left), Number(right));
  }
  try {
    return math.equal(left, right) === true;
  } catch {
    // A member the Fraction instance cannot relate to another (nothing in today's grammar
    // reaches this) falls back to strict identity rather than to a tolerance, so the hole
    // this function closed cannot reopen through the catch.
    return Number(left) === Number(right);
  }
}

function toValueSet(
  values: readonly string[],
  onError: (reason: string) => InternalResult,
  exact = false,
): { set?: MathNumericType[]; result?: InternalResult } {
  const out: MathNumericType[] = [];
  for (const value of values) {
    const parsed = evalRosterMember(value, exact);
    if (parsed.result || parsed.value === undefined) {
      return { result: onError(parsed.result?.reason_code ?? "parse_error") };
    }
    const member = parsed.value;
    if (!out.some((existing) => rosterValuesEqual(existing, member, exact))) {
      out.push(member);
    }
  }
  return { set: out };
}

function compareSolutionSet(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  /**
   * THE ADDITIVITY GATE for the exact-roster wave: does the ITEM ask for an exact
   * roster? Every solution-set item authored before this declares
   * `representation: "any"` (that is all `solutionSetAnswer()` emits), so all of them
   * take the rational-only path below byte-for-byte, and none can reach the widened
   * grammar. `product-answer-checker.additive.test.ts` measures that rather than
   * asserting it, which is why `PRODUCT_CHECKER_VERSION` does not bump (§13.13).
   */
  const exact = def.answer_spec.representation === "exact";
  const submittedMembers = parseValueList(rawAnswer);
  if (exact) {
    for (const member of submittedMembers) {
      // A rounded decimal for an exact root is a WRONG ANSWER rather than unparseable
      // input, and it earns the reason code that says so instead of `value_mismatch`
      // (the same call `comparePiExact` makes for `1.05` against `pi/3`).
      const representation = representationIssue(
        { expression: member, hadPercent: false },
        "exact",
      );
      if (representation) {
        return representation;
      }
    }
  }
  const submitted = toValueSet(submittedMembers, invalid, exact);
  if (submitted.result || !submitted.set) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = toValueSet(parseValueList(def.answer_key), scoringError, exact);
  if (expected.result || !expected.set) {
    return scoringError("invalid_answer_key");
  }
  const has = (set: MathNumericType[], value: MathNumericType): boolean =>
    set.some((existing) => rosterValuesEqual(existing, value, exact));
  const missing = expected.set.some(
    (value) => !has(submitted.set as MathNumericType[], value),
  );
  const extra = submitted.set.some(
    (value) => !has(expected.set as MathNumericType[], value),
  );
  if (missing && !extra) {
    return incorrect("incomplete_solution_set");
  }
  if (extra && !missing) {
    return incorrect("extra_solution");
  }
  if (missing || extra) {
    return incorrect("value_mismatch");
  }
  return correct();
}

// ---------------------------------------------------------------------------
// interval (§2) — parsed bounds + inclusivity, unions supported.
// ---------------------------------------------------------------------------

function parseEndpoint(token: string): { value?: number; result?: InternalResult } {
  const normalized = token.trim().toLowerCase();
  if (INFINITY_TOKENS.has(normalized)) {
    return { value: Number.POSITIVE_INFINITY };
  }
  if (NEG_INFINITY_TOKENS.has(normalized)) {
    return { value: Number.NEGATIVE_INFINITY };
  }
  return evalExactNumber(token);
}

function parseIntervals(
  raw: string,
  onError: (reason: string) => InternalResult,
): { intervals?: Interval[]; result?: InternalResult } {
  const pieces = raw
    // The join, normalised to the spaced form the split below wants, because a learner
    // copying the pack writes it TIGHT: `LIN.4.json` prints `(-\infty, 12) \cup (30, \infty)`
    // and the reveal figure prints `\cup`. Normalising `∪` to `U` and then demanding `\s+` on
    // both sides bought the glyph nothing, so `(-inf, 1]∪[8, inf)` was a `parse_error` while
    // the same answer with two spaces added was correct — the one shape in the checker where
    // deleting a space turned a right answer wrong. `parseSetBuilder` already split on
    // `\s*∪\s*`, so the file also disagreed with itself. A bare `U` is only a join between two
    // interval pieces, which is why the letter needs the brackets either side and the glyph
    // does not.
    .replace(/\s*∪\s*/g, " U ")
    .replace(/([\])])\s*U\s*([[(])/gi, "$1 U $2")
    .split(/\s+U\s+|\s+or\s+/i)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
  if (pieces.length === 0) {
    return { result: onError("parse_error") };
  }
  const intervals: Interval[] = [];
  for (const piece of pieces) {
    const match = piece.match(/^([[(])\s*(.+?)\s*,\s*(.+?)\s*([\])])$/);
    if (!match) {
      return { result: onError("wrong_notation") };
    }
    const loClosed = match[1] === "[";
    const hiClosed = match[4] === "]";
    const lo = parseEndpoint(match[2] ?? "");
    const hi = parseEndpoint(match[3] ?? "");
    if (lo.result || lo.value === undefined || hi.result || hi.value === undefined) {
      return { result: onError("parse_error") };
    }
    // A closed bound on an infinity is malformed.
    if (
      (!Number.isFinite(lo.value) && loClosed) ||
      (!Number.isFinite(hi.value) && hiClosed)
    ) {
      return { result: onError("wrong_notation") };
    }
    if (lo.value > hi.value) {
      return { result: onError("wrong_notation") };
    }
    intervals.push({ lo: lo.value, loClosed, hi: hi.value, hiClosed });
  }
  intervals.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  return { intervals };
}

function compareInterval(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  const submitted = parseIntervals(rawAnswer, invalid);
  if (submitted.result || !submitted.intervals) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = parseIntervals(def.answer_key, scoringError);
  if (expected.result || !expected.intervals) {
    return scoringError("invalid_answer_key");
  }
  return compareIntervalLists(submitted.intervals, expected.intervals);
}

// ---------------------------------------------------------------------------
// set_builder notation (§1 required_notation, §2) — `{x | <condition>}`. The
// condition is normalized to interval(s) and compared with the SAME interval
// machinery, so a domain / inequality-solution written in set-builder form is
// graded structurally. Unblocks RAT.5 (domain) and FUN.4 (feature intervals).
// A recognizable non-set-builder answer (e.g. interval notation) is a wrong FORM
// (`wrong_notation`, since the notation is the skill), not `invalid_input`.
// ---------------------------------------------------------------------------

const REALS_TOKENS = /^(r|reals|all reals|ℝ)$/i;

function wholeLine(): Interval {
  return {
    lo: Number.NEGATIVE_INFINITY,
    loClosed: false,
    hi: Number.POSITIVE_INFINITY,
    hiClosed: false,
  };
}

/** Build one ray from `variable OP value` (op already oriented variable-on-left). */
function rayFromComparison(op: string, value: number): Interval | null {
  switch (op) {
    case "<":
      return { lo: Number.NEGATIVE_INFINITY, loClosed: false, hi: value, hiClosed: false };
    case "<=":
      return { lo: Number.NEGATIVE_INFINITY, loClosed: false, hi: value, hiClosed: true };
    case ">":
      return { lo: value, loClosed: false, hi: Number.POSITIVE_INFINITY, hiClosed: false };
    case ">=":
      return { lo: value, loClosed: true, hi: Number.POSITIVE_INFINITY, hiClosed: false };
    case "=":
      return { lo: value, loClosed: true, hi: value, hiClosed: true };
    default:
      return null;
  }
}

const FLIP_OP: Readonly<Record<string, string>> = {
  "<": ">",
  "<=": ">=",
  ">": "<",
  ">=": "<=",
  "=": "=",
};

/** Intersect two intervals (for `and` / double bounds); null when empty. */
function intersectInterval(a: Interval, b: Interval): Interval | null {
  const lo = Math.max(a.lo, b.lo);
  const hi = Math.min(a.hi, b.hi);
  const loClosed =
    a.lo === b.lo ? a.loClosed && b.loClosed : a.lo > b.lo ? a.loClosed : b.loClosed;
  const hiClosed =
    a.hi === b.hi ? a.hiClosed && b.hiClosed : a.hi < b.hi ? a.hiClosed : b.hiClosed;
  if (lo > hi) {
    return null;
  }
  return { lo, loClosed, hi, hiClosed };
}

/** Parse a single comparison / exclusion / membership on `variable`. */
function parseSingleCondition(
  text: string,
  variable: string,
  onError: (reason: string) => InternalResult,
): { intervals?: Interval[]; result?: InternalResult } {
  const trimmed = text.trim();
  if (/\bin\b/i.test(trimmed)) {
    const rhs = trimmed.split(/\bin\b/i)[1]?.trim() ?? "";
    return REALS_TOKENS.test(rhs)
      ? { intervals: [wholeLine()] }
      : { result: onError("wrong_notation") };
  }
  const exclusion =
    trimmed.match(new RegExp(`^${variable}\\s*!=\\s*(.+)$`)) ??
    trimmed.match(new RegExp(`^(.+?)\\s*!=\\s*${variable}$`));
  if (exclusion) {
    const point = parseEndpoint(exclusion[1] ?? "");
    if (point.result || point.value === undefined || !Number.isFinite(point.value)) {
      return { result: onError("parse_error") };
    }
    return {
      intervals: [
        { lo: Number.NEGATIVE_INFINITY, loClosed: false, hi: point.value, hiClosed: false },
        { lo: point.value, loClosed: false, hi: Number.POSITIVE_INFINITY, hiClosed: false },
      ],
    };
  }
  const left = trimmed.match(new RegExp(`^${variable}\\s*(<=|>=|<|>|=)\\s*(.+)$`));
  const right = trimmed.match(new RegExp(`^(.+?)\\s*(<=|>=|<|>|=)\\s*${variable}$`));
  const match = left ?? right;
  if (!match) {
    return { result: onError("wrong_notation") };
  }
  const op = left ? (match[1] ?? "") : (FLIP_OP[match[2] ?? ""] ?? "");
  const bound = parseEndpoint((left ? match[2] : match[1]) ?? "");
  if (bound.result || bound.value === undefined) {
    return { result: onError("parse_error") };
  }
  const ray = rayFromComparison(op, bound.value);
  return ray ? { intervals: [ray] } : { result: onError("wrong_notation") };
}

/** Parse a double bound `c1 (<|<=) x (<|<=) c2` (or its reverse). */
function parseDoubleBound(
  match: RegExpMatchArray,
  onError: (reason: string) => InternalResult,
): { intervals?: Interval[]; result?: InternalResult } {
  const lowerBound = parseEndpoint(match[1] ?? "");
  const upperBound = parseEndpoint(match[4] ?? "");
  const op1 = match[2] ?? "";
  const op2 = match[3] ?? "";
  if (
    lowerBound.result ||
    lowerBound.value === undefined ||
    upperBound.result ||
    upperBound.value === undefined
  ) {
    return { result: onError("parse_error") };
  }
  const ascending = op1.startsWith("<") && op2.startsWith("<");
  const descending = op1.startsWith(">") && op2.startsWith(">");
  if (!ascending && !descending) {
    return { result: onError("wrong_notation") };
  }
  const interval: Interval = ascending
    ? {
        lo: lowerBound.value,
        loClosed: op1 === "<=",
        hi: upperBound.value,
        hiClosed: op2 === "<=",
      }
    : {
        lo: upperBound.value,
        loClosed: op2 === ">=",
        hi: lowerBound.value,
        hiClosed: op1 === ">=",
      };
  return interval.lo <= interval.hi
    ? { intervals: [interval] }
    : { result: onError("wrong_notation") };
}

/** Parse one union piece (a conjunction of comparisons) into intervals. */
function parseConjunction(
  piece: string,
  variable: string,
  onError: (reason: string) => InternalResult,
): { intervals?: Interval[]; result?: InternalResult } {
  const chained = piece
    .trim()
    .match(new RegExp(`^(.+?)\\s*(<=|>=|<|>)\\s*${variable}\\s*(<=|>=|<|>)\\s*(.+)$`));
  if (chained) {
    return parseDoubleBound(chained, onError);
  }
  const conjuncts = piece.split(/\s+and\s+/i).filter((part) => part.trim().length > 0);
  if (conjuncts.length === 0) {
    return { result: onError("wrong_notation") };
  }
  if (conjuncts.length === 1) {
    return parseSingleCondition(conjuncts[0] ?? "", variable, onError);
  }
  let accumulator: Interval | null = wholeLine();
  for (const conjunct of conjuncts) {
    const single = parseSingleCondition(conjunct, variable, onError);
    if (single.result || !single.intervals) {
      return { result: single.result ?? onError("wrong_notation") };
    }
    if (single.intervals.length !== 1 || !single.intervals[0]) {
      return { result: onError("wrong_notation") }; // e.g. `!=` cannot be `and`-combined here.
    }
    accumulator = accumulator ? intersectInterval(accumulator, single.intervals[0]) : null;
    if (!accumulator) {
      break;
    }
  }
  return accumulator ? { intervals: [accumulator] } : { result: onError("wrong_notation") };
}

function parseSetBuilder(
  raw: string,
  onError: (reason: string) => InternalResult,
): { intervals?: Interval[]; result?: InternalResult } {
  const shell = raw
    .trim()
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/∈/g, " in ")
    .match(/^\{\s*([a-zA-Z])\s*[|:]\s*(.+?)\s*\}$/);
  if (!shell) {
    return { result: onError("wrong_notation") };
  }
  const variable = shell[1] ?? "x";
  const pieces = (shell[2] ?? "")
    .split(/\s+or\s+|\s*∪\s*|\s+U\s+/i)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
  if (pieces.length === 0) {
    return { result: onError("wrong_notation") };
  }
  const intervals: Interval[] = [];
  for (const piece of pieces) {
    const parsed = parseConjunction(piece, variable, onError);
    if (parsed.result || !parsed.intervals) {
      return { result: parsed.result ?? onError("wrong_notation") };
    }
    intervals.push(...parsed.intervals);
  }
  intervals.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  return { intervals };
}

function compareSetBuilder(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  // A recognizable but non-set-builder answer is a wrong FORM; a malformed
  // set-builder body is unanswered (`invalid_input`, §12).
  const studentError = (reason: string): InternalResult =>
    reason === "wrong_notation" ? incorrect("wrong_notation") : invalid(reason);
  const submitted = parseSetBuilder(rawAnswer, studentError);
  if (submitted.result || !submitted.intervals) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = parseSetBuilder(def.answer_key, scoringError);
  if (expected.result || !expected.intervals) {
    return scoringError("invalid_answer_key");
  }
  return compareIntervalLists(submitted.intervals, expected.intervals);
}

// ---------------------------------------------------------------------------
// point (§2) — ordered pair.
// ---------------------------------------------------------------------------

function comparePoint(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  const parsePair = (
    raw: string,
    onError: (reason: string) => InternalResult,
  ): { pair?: [number, number]; result?: InternalResult } => {
    const match = raw.trim().match(/^\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
    if (!match) {
      return { result: onError("wrong_notation") };
    }
    const x = evalExactNumber(match[1] ?? "");
    const y = evalExactNumber(match[2] ?? "");
    if (x.result || x.value === undefined || y.result || y.value === undefined) {
      return { result: onError("parse_error") };
    }
    return { pair: [x.value, y.value] };
  };
  const submitted = parsePair(rawAnswer, invalid);
  if (submitted.result || !submitted.pair) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = parsePair(def.answer_key, scoringError);
  if (expected.result || !expected.pair) {
    return scoringError("invalid_answer_key");
  }
  const [sx, sy] = submitted.pair;
  const [ex, ey] = expected.pair;
  if (floatEqual(sx, ex) && floatEqual(sy, ey)) {
    return correct();
  }
  if (floatEqual(sx, ey) && floatEqual(sy, ex)) {
    return incorrect("coordinates_swapped");
  }
  return incorrect("value_mismatch");
}

// ---------------------------------------------------------------------------
// rational_answer (§3) — expression on its domain + inherited exclusions.
// ---------------------------------------------------------------------------

/**
 * The grammar a `rational_answer` is parsed under. A rational answer IS a quotient with a
 * variable denominator, so the default grammar (which rejects one as
 * `unsupported_symbolic_denominator`) cannot read the answers this category exists to
 * grade. Confined to {@link compareRationalAnswer}; the polynomial callers of
 * {@link symbolicEqual} keep the narrow default they have always had.
 */
const RATIONAL_PARSE_OPTIONS = { allowSymbolicDenominator: true } as const;

/**
 * The detailed `rationalize` result carries `numerator` and `denominator` nodes at runtime,
 * but the shipped mathjs typings omit both, so the shape is restated here.
 */
type DetailedRationalized = { numerator: { toString(): string } };

function symbolicEqual(
  left: string,
  right: string,
  symbols: readonly string[],
  extra: Parameters<typeof parseSafeExpression>[2] = {},
): { matches?: boolean; result?: InternalResult } {
  const leftNode = parseSafeExpression(left, symbols, extra);
  if (leftNode.result) {
    return { result: leftNode.result };
  }
  const rightNode = parseSafeExpression(right, symbols, extra);
  if (rightNode.result) {
    return { result: scoringError("invalid_answer_key") };
  }
  // Both sides read EXACTLY off the AST when both are single-variable polynomials. This is the
  // path that scores F3: `rationalize` throws on the difference `((x - 9)/4) - (4x - 36)`
  // (`Invalid - placing`), and the throw became `invalid_input / parse_error` — a wrong answer
  // the engine then declined to score at all. It also removes the cost cliff from this
  // comparator, which the memo below `polyCoefficients` cannot reach because nothing here is
  // read twice.
  //
  // The two readings must be polynomials IN THE SAME VARIABLE, or `x` and `y` would both read
  // as `[0, 1]` and compare equal. A symbol-free side (`symbol === null`) is comparable with
  // either.
  const leftPolynomial = leftNode.node ? readPolynomialNode(leftNode.node) : null;
  const rightPolynomial =
    leftPolynomial && rightNode.node ? readPolynomialNode(rightNode.node) : null;
  if (
    leftPolynomial &&
    rightPolynomial &&
    (leftPolynomial.symbol === null ||
      rightPolynomial.symbol === null ||
      leftPolynomial.symbol === rightPolynomial.symbol)
  ) {
    return {
      matches: exactPolynomialsEqual(
        leftPolynomial.coefficients,
        rightPolynomial.coefficients,
      ),
    };
  }
  try {
    // Read the NUMERATOR of the rationalized difference, not its printed form:
    // rationalizing a difference of fractions yields `0 / (x^4 + ...)`, which never
    // equals the string "0", so two identical rational answers compared unequal. For a
    // polynomial difference the denominator is 1 and the numerator is the whole result,
    // so the two existing callers get the verdict they always did.
    const detailed = math.rationalize(
      `(${left}) - (${right})`,
      {},
      true,
    ) as unknown as DetailedRationalized;
    return { matches: detailed.numerator.toString() === "0" };
  } catch {
    return { result: invalid("parse_error") };
  }
}

function compareRationalAnswer(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (!rawAnswer || typeof rawAnswer !== "object" || Array.isArray(rawAnswer)) {
    return invalid("invalid_rational_answer");
  }
  const record = rawAnswer as Record<string, unknown>;
  const expression = record.expression ?? record.simplified_expression;
  if (typeof expression !== "string" || !expression.trim()) {
    return invalid("empty_answer");
  }
  const symbols = def.allowed_symbols ?? ["x"];
  // The one text path that does NOT reach `prepareRawAnswer` — it reads the two-field
  // payload directly — so the juxtaposition normalization is applied here by name. This is
  // the path the 14 `rational_quotient_product` items take, whose keys are denominators
  // like `(11*x + 8)/(x*(x + 2))`; without this line the fix would not reach the cohort
  // that motivated it. Nothing else about the payload is normalized: the exclusions half is
  // a list of numbers.
  const juxtaposed = insertImplicitProductStar(expression, symbols);
  const relation = symbolicEqual(
    juxtaposed,
    def.answer_key,
    symbols,
    RATIONAL_PARSE_OPTIONS,
  );
  if (relation.result) {
    return relation.result;
  }
  if (!relation.matches) {
    return incorrect("value_mismatch");
  }

  // Compare the excluded-value set (order-insensitive); dropping one is wrong.
  const rawExclusions = record.excluded_values ?? record.exclusions;
  const submittedExclusions =
    typeof rawExclusions === "string"
      ? parseValueList(rawExclusions)
      : Array.isArray(rawExclusions)
        ? rawExclusions.map((value) => String(value))
        : [];
  const submitted = toValueSet(submittedExclusions, invalid);
  if (submitted.result || !submitted.set) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = toValueSet(def.excluded_values ?? [], scoringError);
  if (expected.result || !expected.set) {
    return scoringError("invalid_answer_key");
  }
  // An exclusion is a POLE, so it is exactly one of the finitely many numbers the original
  // denominator kills; a value 1e-10 away from one is not a pole of anything.
  const has = (set: MathNumericType[], value: MathNumericType): boolean =>
    set.some((existing) => rosterValuesEqual(existing, value, false));
  const missing = expected.set.some(
    (value) => !has(submitted.set as MathNumericType[], value),
  );
  const extra = submitted.set.some(
    (value) => !has(expected.set as MathNumericType[], value),
  );
  if (missing) {
    return incorrect("missing_exclusion");
  }
  if (extra) {
    return incorrect("extra_exclusion");
  }
  return correct();
}

// ---------------------------------------------------------------------------
// factoring (§5 fully_factored_over_integers) + is_standard_polynomial.
// ---------------------------------------------------------------------------

/**
 * A coefficient held EXACTLY as `n / d`, with `d > 0` and the pair reduced.
 *
 * The reading below is exact rather than floating-point for one reason that decides verdicts:
 * `checker-core` configures mathjs `number: "Fraction"`, so `0.333333333` parses as the
 * rational 333333333/1000000000 and is NOT 1/3. Comparing coefficients as doubles would put
 * those two inside `floatEqual`'s 1e-9 and start accepting a rounded decimal for `x/3`, which
 * `rationalize` refuses. Exact numerators keep the two readings interchangeable.
 */
interface Rational {
  readonly n: bigint;
  readonly d: bigint;
}

/** A single-variable polynomial, ascending by power. Trailing zeros are significant: see
 * {@link inRationalizeConventions}. */
type ExactPolynomial = readonly Rational[];

interface PolynomialReading {
  /** The one variable, or `null` for a symbol-free (constant) expression. */
  readonly symbol: string | null;
  readonly coefficients: ExactPolynomial;
}

const RATIONAL_ZERO: Rational = { n: 0n, d: 1n };
const RATIONAL_ONE: Rational = { n: 1n, d: 1n };

/**
 * Ceiling on the degree the exact reader will build.
 *
 * The grammar admits nested powers (`((x + 1)^8)^8` is degree 64 in seven nodes), and a
 * convolution is quadratic in the degree, so a bound is needed before the work is. 256 is far
 * above anything a learner types — `MAX_EXPONENT` is 8 — and anything past it falls through to
 * `rationalize` exactly as it did before this reader existed.
 */
const MAX_READ_DEGREE = 256;

function bigAbs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function bigGcd(a: bigint, b: bigint): bigint {
  let x = bigAbs(a);
  let y = bigAbs(b);
  while (y !== 0n) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
}

function makeRational(n: bigint, d: bigint): Rational | null {
  if (d === 0n) {
    return null;
  }
  const sign = d < 0n ? -1n : 1n;
  const numerator = n * sign;
  const denominator = d * sign;
  const divisor = bigGcd(numerator, denominator) || 1n;
  return { n: numerator / divisor, d: denominator / divisor };
}

function addRational(a: Rational, b: Rational): Rational | null {
  return makeRational(a.n * b.d + b.n * a.d, a.d * b.d);
}

function multiplyRational(a: Rational, b: Rational): Rational | null {
  return makeRational(a.n * b.n, a.d * b.d);
}

function negateRational(a: Rational): Rational {
  return { n: -a.n, d: a.d };
}

function rationalToNumber(a: Rational): number {
  return Number(a.n) / Number(a.d);
}

const DECIMAL_LITERAL = /^(-?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/** The exact value of a decimal or integer literal, however it is spelled. */
function rationalFromDecimalText(text: string): Rational | null {
  const match = DECIMAL_LITERAL.exec(text.trim());
  if (!match) {
    return null;
  }
  const [, sign, whole = "", fraction = "", exponentText] = match;
  if (!whole && !fraction) {
    return null;
  }
  const exponent = exponentText ? Number(exponentText) : 0;
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 64) {
    return null;
  }
  let numerator = BigInt(`${whole || "0"}${fraction}`);
  let denominator = 10n ** BigInt(fraction.length);
  if (exponent > 0) {
    numerator *= 10n ** BigInt(exponent);
  } else if (exponent < 0) {
    denominator *= 10n ** BigInt(-exponent);
  }
  return makeRational(sign === "-" ? -numerator : numerator, denominator);
}

function toBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? BigInt(value) : null;
  }
  return typeof value === "string" && /^-?\d+$/.test(value) ? BigInt(value) : null;
}

/**
 * The exact value of a `ConstantNode`, whatever numeric type this instance parsed it into.
 *
 * The SIGN is taken from the value's own numeric reading rather than from a `Fraction`'s `s`
 * field, because which of `s` and `n` carries the sign differs between fraction.js majors and
 * a wrong guess would silently negate a coefficient.
 */
function rationalFromConstant(value: unknown): Rational | null {
  if (typeof value === "bigint") {
    return makeRational(value, 1n);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? rationalFromDecimalText(String(value)) : null;
  }
  if (typeof value === "string") {
    return rationalFromDecimalText(value);
  }
  if (value && typeof value === "object") {
    const parts = value as { n?: unknown; d?: unknown };
    if (parts.n !== undefined && parts.d !== undefined) {
      const numerator = toBigInt(parts.n);
      const denominator = toBigInt(parts.d);
      if (numerator === null || denominator === null) {
        return null;
      }
      const magnitude = makeRational(bigAbs(numerator), bigAbs(denominator));
      if (!magnitude) {
        return null;
      }
      return Number(value) < 0 ? negateRational(magnitude) : magnitude;
    }
    return rationalFromDecimalText(String(value));
  }
  return null;
}

function polynomialAdd(a: ExactPolynomial, b: ExactPolynomial): Rational[] | null {
  const out: Rational[] = [];
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const sum = addRational(a[i] ?? RATIONAL_ZERO, b[i] ?? RATIONAL_ZERO);
    if (!sum) {
      return null;
    }
    out.push(sum);
  }
  return out;
}

function polynomialNegate(a: ExactPolynomial): Rational[] {
  return a.map(negateRational);
}

function polynomialMultiply(a: ExactPolynomial, b: ExactPolynomial): Rational[] | null {
  if (a.length === 0 || b.length === 0 || a.length + b.length - 2 > MAX_READ_DEGREE) {
    return null;
  }
  const out: Rational[] = Array.from(
    { length: a.length + b.length - 1 },
    () => RATIONAL_ZERO,
  );
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      const term = multiplyRational(a[i] as Rational, b[j] as Rational);
      const sum = term ? addRational(out[i + j] as Rational, term) : null;
      if (!sum) {
        return null;
      }
      out[i + j] = sum;
    }
  }
  return out;
}

function symbolNamesIn(node: MathNode, into: Set<string>): void {
  const shaped = node as NodeShape;
  if (node.type === "SymbolNode" && shaped.name) {
    into.add(shaped.name);
  }
  if (shaped.content) {
    symbolNamesIn(shaped.content, into);
  }
  for (const arg of shaped.args ?? []) {
    symbolNamesIn(arg, into);
  }
}

/**
 * The exponent of a `^` node as a non-negative integer, or `undefined`.
 *
 * Read through the polynomial reader itself rather than off a `ConstantNode`, so a written
 * quotient (`x^(4/2)`) and a parenthesised exponent are the same case as a bare one. A negative
 * or fractional exponent is not a polynomial and returns `undefined`.
 */
function constantExponent(node: MathNode, symbol: string | null): number | undefined {
  const read = readExactPolynomial(node, symbol);
  const only = read?.length === 1 ? read[0] : undefined;
  if (only?.d !== 1n || only.n < 0n || only.n > BigInt(MAX_READ_DEGREE)) {
    return undefined;
  }
  return Number(only.n);
}

/**
 * Coefficients of `node` as a polynomial in `symbol`, exactly, or `null` for anything that is
 * not one.
 *
 * Supported: constants, the one symbol, parentheses, binary `+ - * /`, unary `-` and `+`, and
 * `^` with a non-negative integer exponent. Division only by a SYMBOL-FREE sub-expression, so
 * `(x + 1)/3` is read and `1/(x + 1)` is not. Anything else — a function call, a second
 * variable, a symbolic denominator, a degree past {@link MAX_READ_DEGREE} — returns `null`, and
 * every caller then falls back to what it did before.
 */
function readExactPolynomial(node: MathNode, symbol: string | null): Rational[] | null {
  const shaped = node as NodeShape;
  switch (node.type) {
    case "ParenthesisNode":
      return shaped.content ? readExactPolynomial(shaped.content, symbol) : null;
    case "ConstantNode": {
      const value = rationalFromConstant(shaped.value);
      return value ? [value] : null;
    }
    case "SymbolNode":
      return shaped.name && shaped.name === symbol ? [RATIONAL_ZERO, RATIONAL_ONE] : null;
    case "OperatorNode": {
      const args = shaped.args ?? [];
      if (args.length === 1) {
        const only = args[0];
        if (!only || (shaped.op !== "-" && shaped.op !== "+")) {
          return null;
        }
        const inner = readExactPolynomial(only, symbol);
        if (!inner) {
          return null;
        }
        return shaped.op === "-" ? polynomialNegate(inner) : inner;
      }
      if (args.length !== 2 || !args[0] || !args[1]) {
        return null;
      }
      if (shaped.op === "^") {
        const base = readExactPolynomial(args[0], symbol);
        const exponent = constantExponent(args[1], symbol);
        if (!base || exponent === undefined) {
          return null;
        }
        let power: Rational[] = [RATIONAL_ONE];
        for (let i = 0; i < exponent; i += 1) {
          const next = polynomialMultiply(power, base);
          if (!next) {
            return null;
          }
          power = next;
        }
        return power;
      }
      const left = readExactPolynomial(args[0], symbol);
      if (!left) {
        return null;
      }
      const right = readExactPolynomial(args[1], symbol);
      if (!right) {
        return null;
      }
      switch (shaped.op) {
        case "+":
          return polynomialAdd(left, right);
        case "-":
          return polynomialAdd(left, polynomialNegate(right));
        case "*":
          return polynomialMultiply(left, right);
        case "/": {
          const divisor = right.length === 1 ? right[0] : undefined;
          if (!divisor || divisor.n === 0n) {
            return null; // a symbolic or zero denominator is not a polynomial coefficient
          }
          const reciprocal = makeRational(divisor.d, divisor.n);
          return reciprocal ? polynomialMultiply(left, [reciprocal]) : null;
        }
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

/** Read `node` as a single-variable polynomial, naming the variable it is one in. */
function readPolynomialNode(node: MathNode): PolynomialReading | null {
  const names = new Set<string>();
  symbolNamesIn(node, names);
  if (names.size > 1) {
    return null;
  }
  const symbol = [...names][0] ?? null;
  const coefficients = readExactPolynomial(node, symbol);
  return coefficients ? { symbol, coefficients } : null;
}

/** Do two exact readings describe the same polynomial? */
function exactPolynomialsEqual(a: ExactPolynomial, b: ExactPolynomial): boolean {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const left = a[i] ?? RATIONAL_ZERO;
    const right = b[i] ?? RATIONAL_ZERO;
    if (left.n !== right.n || left.d !== right.d) {
      return false;
    }
  }
  return true;
}

/**
 * The exact reading rendered in `rationalize`'s OWN two conventions, so the two readings are
 * interchangeable wherever a `number[]` is consumed:
 *
 *  - a CONSTANT has no coefficients at all (`rationalize("5")` is `[]`, not `[5]`);
 *  - the WRITTEN degree survives a cancelling leading term (`x - x` is `[0, 0]`, not `[0]`),
 *    so trailing zeros are kept rather than trimmed.
 *
 * Those are the only two conventions the two readings disagree about on a polynomial both can
 * read (`docs/Product_Checker_Poly_Coefficient_Cost.md`), and honouring them here is what makes
 * this a reading change rather than a verdict change.
 */
function inRationalizeConventions(coefficients: ExactPolynomial): number[] {
  return coefficients.length <= 1 ? [] : coefficients.map(rationalToNumber);
}

/**
 * The exact reading of an expression STRING, or `null` when it is not a single-variable
 * polynomial. Exported for the differential guard in `polyCoefficientAgreement.test.ts`, which
 * measures it against `rationalize` over a derived corpus; nothing shipped calls it directly.
 */
export function readPolynomialCoefficients(expression: string): number[] | null {
  let node: MathNode;
  try {
    node = math.parse(expression);
  } catch {
    return null;
  }
  const reading = readPolynomialNode(node);
  return reading ? inRationalizeConventions(reading.coefficients) : null;
}

/**
 * Coefficients of a single-variable polynomial, ascending by power, or `null`.
 *
 * ## The reading is an AST walk, and `rationalize` is the fallback
 *
 * `rationalize(expr, {}, true)` runs `simplify`'s whole rule set, and its cost is
 * SUPER-EXPONENTIAL in the degree of a written product rather than proportional to it. Measured
 * on this instance: a two-bracket quadratic 19ms, a three-bracket cubic 22ms, the degree-four
 * `-2(x + 5)(x + 4)^2(x - 4)` that `d4.pol7.build-from-graph.l3` keys **552ms**, and
 * `(x + 1)^5` **122 SECONDS**, with `(x + 1)^6` unfinished after a further minute. `MAX_EXPONENT`
 * is 8, so every one of those is inside the grammar this checker advertises to a learner: they
 * could freeze their own tab by typing a legal answer.
 *
 * It also REFUSES polynomials it should read, throwing `Invalid + placing` on `(x + 1)/3`,
 * `Invalid - placing` on `(x - 9)/4` and `Invalid ^ placing` on `-(x + 4)^2`. Every one of those
 * came back `invalid_input / parse_error`, which the lesson engine declines to score — so a
 * learner's WRONG answer was thrown away rather than marked wrong, and where they put the
 * division bar decided whether their mistake was recorded at all (swarm ledger F3: 6 of 10
 * probed misses, 3 templates across D6/D7, reproduced on 21 served instances).
 *
 * So the exact reader runs FIRST and `rationalize` is kept only for what the reader declines —
 * a radical, a second variable, a symbolic denominator, a degree past {@link MAX_READ_DEGREE}.
 * That ordering is what removes the cliff, and it is only defensible because the two readings
 * were measured against each other on the population that matters rather than argued about:
 * `polyCoefficientAgreement.test.ts` (fixtures, in-repo) and the served-bank sweep recorded in
 * the fix report agree on every expression both can read.
 *
 * The memo stays: both comparators read the SAME expression twice on a self-graded answer (the
 * submitted spelling and the key), it is a pure function of its string, and a hit returns the
 * identical array, `null` included.
 */
const POLY_COEFFICIENT_CACHE = new Map<string, number[] | null>();

/** Bound on the cache, so a long-lived process cannot grow one entry per answer submitted. */
const POLY_COEFFICIENT_CACHE_LIMIT = 512;

function polyCoefficients(expression: string): number[] | null {
  if (POLY_COEFFICIENT_CACHE.has(expression)) {
    return POLY_COEFFICIENT_CACHE.get(expression) ?? null;
  }
  let computed = readPolynomialCoefficients(expression);
  if (computed === null) {
    try {
      const detailed = math.rationalize(expression, {}, true) as {
        coefficients: unknown[];
      };
      computed = detailed.coefficients.map((coefficient) => Number(coefficient));
    } catch {
      computed = null;
    }
  }
  if (POLY_COEFFICIENT_CACHE.size >= POLY_COEFFICIENT_CACHE_LIMIT) {
    POLY_COEFFICIENT_CACHE.clear();
  }
  POLY_COEFFICIENT_CACHE.set(expression, computed);
  return computed;
}

/**
 * Coefficients of a parsed NODE, read off the AST rather than off its printed form.
 *
 * `factorIssue` used to hand `node.toString()` back to the parser, and the print is not the
 * input: this instance prints a Fraction constant as `2/1`, and mathjs binds an implicit product
 * TIGHTER than division, so `x^2(x + 9) + 13(x + 9)` reprints as `x ^ 2/1 (x + 9/1) + 13/1 (x + 9/1)`
 * and REPARSES as `x^(2/(x + 9)) + 13/(x + 9)` — a different expression, which `rationalize`
 * then read as a degree-2 polynomial with a negative discriminant. That is how an abandoned
 * grouping was certified an irreducible quadratic factor and marked `correct` on 32 of 60 draws
 * of `d4.pol2.grouping.l3`, and why writing the same answer with an explicit `*` was refused
 * instead: the round trip only misreads the juxtaposed spelling.
 */
function polyCoefficientsOfNode(node: MathNode): number[] | null {
  const reading = readPolynomialNode(node);
  return reading
    ? inRationalizeConventions(reading.coefficients)
    : polyCoefficients(node.toString());
}

function coefficientsEqual(a: number[], b: number[]): boolean {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if (!floatEqual(a[i] ?? 0, b[i] ?? 0)) {
      return false;
    }
  }
  return true;
}

function isPerfectSquare(value: number): boolean {
  if (value < 0) {
    return false;
  }
  const root = Math.round(Math.sqrt(value));
  return root * root === value;
}

function stripParens(node: MathNode): MathNode {
  let current = node as NodeShape;
  while (current.type === "ParenthesisNode" && current.content) {
    current = current.content as NodeShape;
  }
  return current;
}

function collectFactors(node: MathNode, out: MathNode[]): void {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type === "OperatorNode" && shaped.op === "*" && shaped.args) {
    for (const arg of shaped.args) {
      collectFactors(arg, out);
    }
    return;
  }
  if (shaped.type === "OperatorNode" && shaped.op === "^" && shaped.args?.[0]) {
    // A repeated factor (x+1)^2: inspect the base once (irreducibility is per-base).
    collectFactors(shaped.args[0], out);
    return;
  }
  if (shaped.type === "OperatorNode" && shaped.op === "-" && shaped.args?.length === 1) {
    // unary minus: sign is handled by expansion equality.
    collectFactors(shaped.args[0] as MathNode, out);
    return;
  }
  out.push(shaped);
}

/** Is a single polynomial factor irreducible + primitive over the integers? */
function factorIssue(node: MathNode): InternalResult | undefined {
  if (node.type === "ConstantNode") {
    return undefined; // a numeric (leading) factor is allowed.
  }
  const coefficients = polyCoefficientsOfNode(node);
  if (!coefficients || coefficients.length === 0) {
    return unsupported("unsupported_factor");
  }
  const degree = coefficients.length - 1;
  const integerCoefficients = coefficients.map((value) => Math.round(value));
  if (
    integerCoefficients.some((value, index) => !floatEqual(value, coefficients[index] ?? 0))
  ) {
    return incorrect("not_factored"); // non-integer factor: not factored over the integers.
  }
  if (degree === 0) {
    return undefined;
  }
  if (integerGcd(integerCoefficients) !== 1) {
    return incorrect("not_primitive");
  }
  if (degree === 1) {
    return undefined; // linear factors are irreducible.
  }
  if (degree === 2) {
    const c = integerCoefficients[0] ?? 0;
    const b = integerCoefficients[1] ?? 0;
    const a = integerCoefficients[2] ?? 0;
    const discriminant = b * b - 4 * a * c;
    return isPerfectSquare(discriminant) ? incorrect("reducible_factor") : undefined;
  }
  return unsupported("unsupported_factor_degree");
}

function compareFactored(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const symbols = def.allowed_symbols ?? ["x"];
  const safe = parseSafeExpression(submitted.parsed.expression, symbols);
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  const submittedCoefficients = polyCoefficients(submitted.parsed.expression);
  const expectedCoefficients = polyCoefficients(def.answer_key);
  if (!submittedCoefficients) {
    return invalid("parse_error");
  }
  if (!expectedCoefficients) {
    return scoringError("invalid_answer_key");
  }
  if (!coefficientsEqual(submittedCoefficients, expectedCoefficients)) {
    return incorrect("value_mismatch"); // does not expand to the key.
  }
  const formIssue = notFactoredIssue(safe.node, def.answer_key, symbols);
  const factors: MathNode[] = [];
  collectFactors(safe.node, factors);
  for (const factor of factors) {
    const issue = factorIssue(factor);
    if (issue) {
      // A factor-level `incorrect` is kept verbatim: it is already a scored miss and it says
      // something more specific than the form rule can (`reducible_factor` on the unfactored
      // quadratic, `not_primitive` on `15x + 20`). An `unsupported_*` is not a scored miss at
      // all, and a top-level sum is refusable on its FORM whatever its degree — which is the
      // whole of P2-b: the correctly EXPANDED cubic used to read "we couldn't read that".
      return issue.status === "incorrect" ? issue : (formIssue ?? issue);
    }
  }
  return formIssue ?? correct();
}

/**
 * Is `node`'s outermost operation an addition or a subtraction, once parentheses and a leading
 * unary minus are stripped? `-2(x + 1)(x - 3)` is a product; `x^2(x + 9) + 13(x + 9)` is a sum.
 */
function isAdditiveTopLevel(node: MathNode): boolean {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type !== "OperatorNode" || !shaped.args) {
    return false;
  }
  if (shaped.args.length === 1) {
    const inner = shaped.args[0];
    return shaped.op === "-" || shaped.op === "+"
      ? inner !== undefined && isAdditiveTopLevel(inner)
      : false;
  }
  return shaped.args.length === 2 && (shaped.op === "+" || shaped.op === "-");
}

/**
 * `incorrect("not_factored")` when a submission cannot be a complete factorisation BECAUSE OF ITS
 * FORM: an expression whose outermost operation is `+` or `-` is not a product, so it factorises
 * nothing however exactly it expands to the key.
 *
 * ## Why this is conditional on the KEY, and why the condition is not decoration
 *
 * An item whose complete factorisation over the integers is an irreducible polynomial — "factor
 * completely: x^2 + 13" — has a key that is ITSELF a top-level sum. An unconditional refusal
 * would refuse that item's own answer key, which is the RAD.1 defect (a pool that rejects the
 * notation it demands) rebuilt in the factoring comparator. So the rule fires only where the
 * key's own outermost operation is a product, and `factoredTopLevelSum.test.ts` asserts the
 * condition in both directions.
 *
 * Enumerated before the rule was written: all 42 served `fully_factored_over_integers` instances,
 * over 6 templates, have a key whose top-level operation is `*`, so nothing served is exempted
 * today and nothing served is newly refused for a form its key shares.
 *
 * A key that does not parse is left alone: an unreadable key is a scoring-error question for the
 * comparator above, not a form question here.
 */
function notFactoredIssue(
  node: MathNode,
  answerKey: string,
  symbols: readonly string[],
): InternalResult | undefined {
  if (!isAdditiveTopLevel(node)) {
    return undefined;
  }
  const key = parseSafeExpression(answerKey, symbols);
  if (!key.node) {
    return undefined;
  }
  return isAdditiveTopLevel(key.node) ? undefined : incorrect("not_factored");
}

function compareStandardPolynomial(
  rawAnswer: unknown,
  def: AnswerDefinition,
): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const symbols = def.allowed_symbols ?? ["x"];
  const safe = parseSafeExpression(submitted.parsed.expression, symbols);
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  const submittedCoefficients = polyCoefficients(submitted.parsed.expression);
  const expectedCoefficients = polyCoefficients(def.answer_key);
  if (!submittedCoefficients) {
    return invalid("parse_error");
  }
  if (!expectedCoefficients) {
    return scoringError("invalid_answer_key");
  }
  if (!coefficientsEqual(submittedCoefficients, expectedCoefficients)) {
    return incorrect("value_mismatch");
  }
  // Standard form: no parentheses (unexpanded product) and no unexpanded product.
  if (hasParenthesis(safe.node) || hasProduct(safe.node)) {
    return incorrect("not_simplified");
  }
  // §5 is_standard_polynomial also requires strictly DESCENDING degree with like
  // terms COMBINED. `polyCoefficients` (via rationalize) normalizes term order AND
  // combines like terms, so the coefficient check alone would wrongly accept
  // ascending order ("6 + 5*x + x^2") or uncombined like terms ("x^2 + 2*x + 3*x
  // + 6"); enforce the WRITTEN order on the raw AST here. This tightening stays
  // checker version 2 (never bump D1_CHECKER_VERSION): no product/v2 response
  // exists in production yet, so there is no historical verdict to rescore
  // (Answer_Equivalence_Spec §13.13).
  const degrees = orderedTermDegrees(safe.node);
  if (!isStrictlyDescending(degrees)) {
    return incorrect("not_simplified");
  }
  return correct();
}

function hasParenthesis(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (node.type === "ParenthesisNode") {
    return true;
  }
  return shaped.args?.some(hasParenthesis) ?? false;
}

function hasProduct(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (
    node.type === "OperatorNode" &&
    shaped.op === "*" &&
    shaped.args?.some((child) => containsSymbolLike(child))
  ) {
    // a product of two symbol-bearing sub-expressions is unexpanded.
    const symbolBearing = shaped.args.filter((child) => containsSymbolLike(child));
    if (symbolBearing.length >= 2) {
      return true;
    }
  }
  return shaped.args?.some(hasProduct) ?? false;
}

function containsSymbolLike(node: MathNode): boolean {
  const shaped = node as NodeShape;
  if (node.type === "SymbolNode") {
    return true;
  }
  if (shaped.content && containsSymbolLike(shaped.content)) {
    return true;
  }
  return shaped.args?.some(containsSymbolLike) ?? false;
}

/**
 * Degree (in the single variable) of ONE monomial term of a standard polynomial:
 * the sum of the exponents on symbol factors. Called only after `hasParenthesis` /
 * `hasProduct` have rejected non-monomial terms, so a term is a constant, a symbol,
 * a symbol power, or a product/quotient of those with a numeric coefficient.
 */
function termDegree(node: MathNode): number {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type === "ConstantNode") {
    return 0;
  }
  if (shaped.type === "SymbolNode") {
    return 1;
  }
  if (shaped.type === "OperatorNode") {
    if (shaped.op === "^" && shaped.args?.[0] && shaped.args[1]) {
      const exponent = Number((shaped.args[1] as NodeShape).value);
      return containsSymbolLike(shaped.args[0]) && Number.isInteger(exponent)
        ? exponent
        : 0;
    }
    if (shaped.op === "*" && shaped.args) {
      return shaped.args.reduce((sum, arg) => sum + termDegree(arg), 0);
    }
    if (shaped.op === "/" && shaped.args?.[0] && shaped.args[1]) {
      return termDegree(shaped.args[0]) - termDegree(shaped.args[1]);
    }
    if (shaped.op === "-" && shaped.args?.length === 1 && shaped.args[0]) {
      return termDegree(shaped.args[0]);
    }
  }
  return 0;
}

/**
 * Ordered per-term degrees of an additive expression, left to right as WRITTEN
 * (the raw AST, before rationalize normalizes). Splits on `+` and binary `-`
 * (additive separators); a leading unary minus is the sign of a single term.
 */
function orderedTermDegrees(node: MathNode): number[] {
  const shaped = node as NodeShape;
  if (shaped.type === "OperatorNode" && shaped.op === "+" && shaped.args) {
    return shaped.args.flatMap((arg) => orderedTermDegrees(arg));
  }
  if (
    shaped.type === "OperatorNode" &&
    shaped.op === "-" &&
    shaped.args?.length === 2 &&
    shaped.args[0] &&
    shaped.args[1]
  ) {
    return [...orderedTermDegrees(shaped.args[0]), ...orderedTermDegrees(shaped.args[1])];
  }
  return [termDegree(node)];
}

function isStrictlyDescending(degrees: readonly number[]): boolean {
  for (let i = 1; i < degrees.length; i += 1) {
    if ((degrees[i] ?? 0) >= (degrees[i - 1] ?? 0)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// is_vertex_form (§5) — `a(x-h)^2 + k`, constants combined. Unblocks the POL.5
// vertex-form algebraic slice. VALUE equality is judged by the multi-point
// numeric identity (robust: `rationalize` throws on a bare leading unary minus
// such as `-(x+2)^2`, common for downward parabolas), and the FORM by a
// structural AST check, so a value-correct STANDARD form is `not_vertex_form`.
// ---------------------------------------------------------------------------

/** Split an additive expression into its top-level signed terms (as written). */
function additiveTerms(node: MathNode, sign = 1): { node: MathNode; sign: number }[] {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type === "OperatorNode" && shaped.op === "+" && shaped.args) {
    return shaped.args.flatMap((arg) => additiveTerms(arg, sign));
  }
  if (
    shaped.type === "OperatorNode" &&
    shaped.op === "-" &&
    shaped.args?.length === 2 &&
    shaped.args[0] &&
    shaped.args[1]
  ) {
    return [
      ...additiveTerms(shaped.args[0], sign),
      ...additiveTerms(shaped.args[1], -sign),
    ];
  }
  if (
    shaped.type === "OperatorNode" &&
    shaped.op === "-" &&
    shaped.args?.length === 1 &&
    shaped.args[0]
  ) {
    return additiveTerms(shaped.args[0], -sign);
  }
  return [{ node: shaped, sign }];
}

/** The multiplicative factors of a term (flattening `*`), parentheses stripped. */
function multiplicativeFactors(node: MathNode): MathNode[] {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type === "OperatorNode" && shaped.op === "*" && shaped.args) {
    return shaped.args.flatMap(multiplicativeFactors);
  }
  return [shaped];
}

/**
 * Is `node` a MONIC squared binomial `(x - h)^2` (x-coefficient exactly 1, h a
 * constant)? The base is verified linear-with-slope-1 by finite differences, so
 * `(2x-3)^2` (a not factored out) and `(x^2-1)^2` (nonlinear base) are rejected.
 */
function isMonicSquare(node: MathNode): boolean {
  const shaped = stripParens(node) as NodeShape;
  if (shaped.type !== "OperatorNode" || shaped.op !== "^" || !shaped.args?.[0]) {
    return false;
  }
  const exponent = stripParens(shaped.args[1] as MathNode) as NodeShape;
  if (exponent.type !== "ConstantNode" || Number(exponent.value) !== 2) {
    return false;
  }
  const params = lineParameters(shaped.args[0].toString(), invalid);
  return params.m !== undefined && floatEqual(params.m, 1);
}

/** Classify a single additive term for the vertex-form structural check. */
function classifyVertexTerm(node: MathNode): "square" | "constant" | "other" {
  if (!containsSymbol(node)) {
    return "constant";
  }
  const factors = multiplicativeFactors(node);
  const squares = factors.filter(isMonicSquare);
  const rest = factors.filter((factor) => !isMonicSquare(factor));
  return squares.length === 1 && rest.every((factor) => !containsSymbol(factor))
    ? "square"
    : "other";
}

function vertexStructureIssue(node: MathNode): InternalResult | undefined {
  let squares = 0;
  let constants = 0;
  for (const term of additiveTerms(node)) {
    const kind = classifyVertexTerm(term.node);
    if (kind === "other") {
      return incorrect("not_vertex_form");
    }
    if (kind === "square") {
      squares += 1;
    } else {
      constants += 1;
    }
  }
  if (squares !== 1) {
    return incorrect("not_vertex_form"); // needs exactly one a(x-h)^2 term.
  }
  if (constants > 1) {
    return incorrect("not_simplified"); // k must be a single combined constant.
  }
  return undefined;
}

function compareVertexForm(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const symbols = def.allowed_symbols ?? ["x"];
  const safe = parseSafeExpression(submitted.parsed.expression, symbols);
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  // Value first (numeric identity), then FORM: a correct-but-standard-form answer
  // is `not_vertex_form`, not `correct`.
  const identity = sameFunction(submitted.parsed.expression, def.answer_key, symbols, {});
  if (identity.result) {
    return identity.result;
  }
  if (!identity.matches) {
    return incorrect("value_mismatch");
  }
  return vertexStructureIssue(safe.node) ?? correct();
}

// ---------------------------------------------------------------------------
// equation_form (§5 is_slope_intercept, is_standard_form) — target-form families
// only; general equation equivalence stays deferred (§10).
// ---------------------------------------------------------------------------

function evalAtX(
  expression: string,
  xValue: number,
): { value?: number; result?: InternalResult } {
  const safe = parseSafeExpression(expression, ["x"]);
  if (safe.result || !safe.node) {
    return { result: safe.result ?? invalid("parse_error") };
  }
  try {
    const value = numMath.parse(expression).evaluate({ x: xValue }) as unknown;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { result: invalid("non_numeric_answer") };
    }
    return { value };
  } catch {
    return { result: invalid("parse_error") };
  }
}

/** Extract (m, b) if `rhs` is linear in x; else a form issue. */
function lineParameters(
  rhs: string,
  onError: (reason: string) => InternalResult,
): { m?: number; b?: number; result?: InternalResult } {
  const at0 = evalAtX(rhs, 0);
  const at1 = evalAtX(rhs, 1);
  const at2 = evalAtX(rhs, 2);
  if (
    at0.result ||
    at1.result ||
    at2.result ||
    at0.value === undefined ||
    at1.value === undefined ||
    at2.value === undefined
  ) {
    return { result: at0.result ?? at1.result ?? at2.result ?? onError("parse_error") };
  }
  const m = at1.value - at0.value;
  if (!floatEqual(at2.value - at1.value, m)) {
    return { result: onError("not_linear") };
  }
  return { m, b: at0.value };
}

function compareSlopeIntercept(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  const sides = rawAnswer.split("=");
  if (sides.length !== 2) {
    return invalid("wrong_notation");
  }
  const [lhs, rhs] = sides;
  if ((lhs ?? "").trim() !== "y") {
    return incorrect("wrong_form"); // slope-intercept requires y isolated on the left.
  }
  const submitted = lineParameters(rhs ?? "", invalid);
  if (submitted.result || submitted.m === undefined || submitted.b === undefined) {
    return submitted.result ?? invalid("parse_error");
  }
  // Reject an unsimplified zero coefficient ("y = 0x + 3" -> "y = 3").
  if (floatEqual(submitted.m, 0)) {
    const safe = parseSafeExpression((rhs ?? "").replace(/%$/, ""), ["x"]);
    if (safe.node && containsSymbolLike(safe.node)) {
      return incorrect("wrong_form");
    }
  }
  const keySides = def.answer_key.split("=");
  if (keySides.length !== 2) {
    return scoringError("invalid_answer_key");
  }
  const expected = lineParameters(keySides[1] ?? "", scoringError);
  if (expected.result || expected.m === undefined || expected.b === undefined) {
    return scoringError("invalid_answer_key");
  }
  if (!floatEqual(submitted.m, expected.m) || !floatEqual(submitted.b, expected.b)) {
    return incorrect("value_mismatch");
  }
  return correct();
}

/** Evaluate a two-variable linear expression `f(x, y)` (never throws). */
function evalAtXY(
  expression: string,
  xValue: number,
  yValue: number,
): { value?: number; result?: InternalResult } {
  const safe = parseSafeExpression(expression, ["x", "y"]);
  if (safe.result || !safe.node) {
    return { result: safe.result ?? invalid("parse_error") };
  }
  try {
    const value = numMath.parse(expression).evaluate({ x: xValue, y: yValue }) as unknown;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { result: invalid("non_numeric_answer") };
    }
    return { value };
  } catch {
    return { result: invalid("parse_error") };
  }
}

interface LineStandard {
  a: number;
  b: number;
  c: number;
}

/** Extract (A, B, C) of `Ax + By = C` from an equation; requires RHS constant. */
function standardCoefficients(
  equation: string,
  onError: (reason: string) => InternalResult,
): { line?: LineStandard; result?: InternalResult } {
  const sides = equation.split("=");
  if (sides.length !== 2) {
    return { result: onError("wrong_notation") };
  }
  const [lhs, rhs] = sides;
  const rhsSafe = parseSafeExpression(rhs ?? "", ["x", "y"]);
  if (rhsSafe.result || !rhsSafe.node) {
    return { result: onError("parse_error") };
  }
  // Standard form keeps the variables on the left and a bare constant on the right.
  if (containsSymbol(rhsSafe.node)) {
    return { result: incorrect("wrong_form") };
  }
  const combined = `(${lhs}) - (${rhs})`;
  const origin = evalAtXY(combined, 0, 0);
  const atX = evalAtXY(combined, 1, 0);
  const atY = evalAtXY(combined, 0, 1);
  const atXY = evalAtXY(combined, 1, 1);
  if (
    origin.result ||
    atX.result ||
    atY.result ||
    atXY.result ||
    origin.value === undefined ||
    atX.value === undefined ||
    atY.value === undefined ||
    atXY.value === undefined
  ) {
    return {
      result:
        origin.result ?? atX.result ?? atY.result ?? atXY.result ?? onError("parse_error"),
    };
  }
  const a = atX.value - origin.value;
  const b = atY.value - origin.value;
  // A nonlinear term breaks superposition and would make the differences invalid.
  if (!floatEqual(atXY.value - origin.value, a + b)) {
    return { result: onError("not_linear") };
  }
  return { line: { a, b, c: -origin.value } };
}

/** Reduce (A, B, C) by gcd and normalize sign so the leading coefficient > 0. */
function canonicalizeLine(line: LineStandard): LineStandard | null {
  const values = [line.a, line.b, line.c];
  if (values.some((value) => !floatEqual(value, Math.round(value)))) {
    return null; // non-integer coefficients: not a standard form.
  }
  const ints = values.map((value) => Math.round(value));
  const divisor = integerGcd(ints);
  if (divisor === 0) {
    return null;
  }
  const reduced = ints.map((value) => value / divisor);
  const leading = reduced[0] !== 0 ? reduced[0] : reduced[1];
  const sign = (leading ?? 0) < 0 ? -1 : 1;
  return {
    a: (reduced[0] ?? 0) * sign,
    b: (reduced[1] ?? 0) * sign,
    c: (reduced[2] ?? 0) * sign,
  };
}

function compareStandardForm(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  const submitted = standardCoefficients(rawAnswer, invalid);
  if (submitted.result || !submitted.line) {
    return submitted.result ?? invalid("parse_error");
  }
  const expected = standardCoefficients(def.answer_key, scoringError);
  if (expected.result || !expected.line) {
    return scoringError("invalid_answer_key");
  }
  // FORM: integer coefficients, positive leading coefficient, primitive (gcd 1).
  const rawInts = [submitted.line.a, submitted.line.b, submitted.line.c];
  if (rawInts.some((value) => !floatEqual(value, Math.round(value)))) {
    return incorrect("wrong_form"); // fractional coefficients are not standard form.
  }
  const leading = !floatEqual(submitted.line.a, 0) ? submitted.line.a : submitted.line.b;
  if (leading < 0) {
    return incorrect("wrong_form"); // the leading coefficient must be positive.
  }
  const submittedCanon = canonicalizeLine(submitted.line);
  const expectedCanon = canonicalizeLine(expected.line);
  if (!submittedCanon) {
    return incorrect("wrong_form");
  }
  if (!expectedCanon) {
    return scoringError("invalid_answer_key");
  }
  if (integerGcd(rawInts.map((value) => Math.round(value))) > 1) {
    return incorrect("not_simplified"); // a scaled multiple is not reduced.
  }
  if (
    submittedCanon.a !== expectedCanon.a ||
    submittedCanon.b !== expectedCanon.b ||
    submittedCanon.c !== expectedCanon.c
  ) {
    return incorrect("value_mismatch"); // a different line.
  }
  return correct();
}

function compareEquationForm(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  switch (def.answer_spec.required_form) {
    case "is_slope_intercept":
      return compareSlopeIntercept(rawAnswer, def);
    case "is_standard_form":
      return compareStandardForm(rawAnswer, def);
    default:
      return unsupported("unsupported_required_form");
  }
}

// ---------------------------------------------------------------------------
// multiple_choice / multipart (shared with v1 semantics).
// ---------------------------------------------------------------------------

function compareMultipleChoice(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }
  return rawAnswer === def.answer_key ? correct() : incorrect("value_mismatch");
}

function compareMultipart(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (
    !rawAnswer ||
    typeof rawAnswer !== "object" ||
    Array.isArray(rawAnswer) ||
    !def.parts?.length
  ) {
    return invalid("invalid_multipart_answer");
  }
  const submittedParts = rawAnswer as Record<string, unknown>;
  for (const part of def.parts) {
    const result = checkProductDefinition(submittedParts[part.part_id], part.answer);
    if (result.status !== "correct") {
      return { ...result, reason_code: `${part.part_id}:${result.reason_code}` };
    }
  }
  return correct();
}

// ---------------------------------------------------------------------------
// log identities (EL.5) — the expand/condense slice. VALUE equality is a
// base-independent numeric identity over the positive domain (`log`/`ln` bound
// in scope), then an expanded/condensed FORM predicate on the AST. General
// logarithmic/trigonometric identities stay deferred (§10); this is only the
// restricted product/quotient/power expand-condense form EL.5 authoring needs.
// ---------------------------------------------------------------------------

/** Count the log/ln function nodes anywhere in the AST. */
function countLogNodes(node: MathNode): number {
  const shaped = node as NodeShape;
  const name = shaped.fn?.name ?? shaped.name;
  let count = node.type === "FunctionNode" && name && LOG_FUNCTIONS.has(name) ? 1 : 0;
  for (const child of shaped.args ?? []) {
    count += countLogNodes(child);
  }
  if (shaped.content) {
    count += countLogNodes(shaped.content);
  }
  return count;
}

/** Does any log take a product/quotient/power argument (i.e. not yet expanded)? */
function hasLogOfComposite(node: MathNode): boolean {
  const shaped = node as NodeShape;
  const name = shaped.fn?.name ?? shaped.name;
  if (node.type === "FunctionNode" && name && LOG_FUNCTIONS.has(name)) {
    const arg = stripParens((shaped.args?.[0] as MathNode) ?? node) as NodeShape;
    if (
      arg.type === "OperatorNode" &&
      (arg.op === "*" || arg.op === "/" || arg.op === "^")
    ) {
      return true;
    }
  }
  if (shaped.args?.some(hasLogOfComposite)) {
    return true;
  }
  return shaped.content ? hasLogOfComposite(shaped.content) : false;
}

/**
 * The distinct logarithm TOKEN NAMES an expression uses — `{}`, `{"log"}`, `{"ln"}`, or both.
 *
 * More than one is the defect this exists to catch. `LOG_SCOPE` binds `log` and `ln` to the
 * same base deliberately, because the expand/condense identities hold in every base, and that
 * policy is right: a uniform `ln`-for-`log` respelling of an EL.5 answer is accepted and
 * `logBaseMixing.test.ts` pins it. But the policy says a solver may PICK a base, not that they
 * may use two — `log₁₀(y) + ln(n)` is not `log_b(yn)` for any `b`, so it denotes nothing, and
 * 21 of the 28 served EL.5 items accepted exactly that (strictness report L1). Reading the
 * names off the submission alone, never comparing them with the key's, is what keeps the
 * uniform swap untouched.
 */
function logTokenNames(node: MathNode, out: Set<string> = new Set()): Set<string> {
  const shaped = node as NodeShape;
  const name = shaped.fn?.name ?? shaped.name;
  if (node.type === "FunctionNode" && name && LOG_FUNCTIONS.has(name)) {
    out.add(name);
  }
  for (const child of shaped.args ?? []) {
    logTokenNames(child, out);
  }
  if (shaped.content) {
    logTokenNames(shaped.content, out);
  }
  return out;
}

/** Is the whole expression a SINGLE logarithm (condensed), no external factor? */
function isCondensedLog(node: MathNode): boolean {
  const root = stripParens(node) as NodeShape;
  const name = root.fn?.name ?? root.name;
  return (
    root.type === "FunctionNode" &&
    !!name &&
    LOG_FUNCTIONS.has(name) &&
    countLogNodes(root) === 1
  );
}

/** Base-independent numeric identity of two log expressions over positive probes. */
function sameLogFunction(
  submitted: string,
  key: string,
  symbols: readonly string[],
): { matches?: boolean; result?: InternalResult } {
  const extra = {
    allowedFunctions: LOG_FUNCTIONS,
    allowSymbolicDenominator: true,
  } as const;
  const keySafe = parseSafeExpression(key, symbols, extra);
  if (keySafe.result || !keySafe.node) {
    return { result: scoringError("invalid_answer_key") };
  }
  const points = derivedSamplePoints(LOG_SAMPLE_BASES, submitted, key);
  let comparedFinite = 0;
  let keyFiniteAnywhere = false;
  for (let sample = 0; sample < points.length; sample += 1) {
    const scope: Record<string, number | ((value: number) => number)> = { ...LOG_SCOPE };
    symbols.forEach((symbol, index) => {
      scope[symbol] = points[(sample + index * 2) % points.length] ?? 2;
    });
    const a = evaluateFloatAtScope(submitted, scope, symbols, extra);
    const b = evaluateFloatAtScope(key, scope, symbols, extra);
    const aOk = !a.result && a.value !== undefined;
    const bOk = !b.result && b.value !== undefined;
    if (bOk) {
      keyFiniteAnywhere = true;
    }
    if (!aOk && !bOk) {
      continue;
    }
    if (aOk !== bOk) {
      return { matches: false };
    }
    comparedFinite += 1;
    if (!floatEqual(a.value as number, b.value as number)) {
      return { matches: false };
    }
  }
  if (!keyFiniteAnywhere) {
    return { result: scoringError("invalid_answer_key") };
  }
  if (comparedFinite === 0) {
    return { result: invalid("parse_error") };
  }
  return { matches: true };
}

function compareLogIdentity(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const symbols = def.allowed_symbols ?? ["x"];
  const safe = parseSafeExpression(submitted.parsed.expression, symbols, {
    allowedFunctions: LOG_FUNCTIONS,
    allowSymbolicDenominator: true,
  });
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  const identity = sameLogFunction(submitted.parsed.expression, def.answer_key, symbols);
  if (identity.result) {
    return identity.result;
  }
  if (!identity.matches) {
    return incorrect("value_mismatch");
  }
  // An expression in TWO bases is refused ahead of the expand/condense form, because it is the
  // more basic objection: `log(m*a) + ln(q)` is not an unexpanded logarithm, it is not a
  // logarithm of anything. A single-base answer cannot reach this line.
  if (logTokenNames(safe.node).size > 1) {
    return incorrect("mixed_log_bases");
  }
  // Value-correct: now enforce the requested expand/condense FORM (§4/§5).
  if (def.answer_spec.required_form === "is_expanded_log") {
    return hasLogOfComposite(safe.node) ? incorrect("not_expanded") : correct();
  }
  if (def.answer_spec.required_form === "is_condensed_log") {
    return isCondensedLog(safe.node) ? correct() : incorrect("not_condensed");
  }
  return unsupported("unsupported_required_form");
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

function compareExpressionSymbolic(
  rawAnswer: unknown,
  def: AnswerDefinition,
): InternalResult {
  if (def.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }
  const submitted = prepareRawAnswer(rawAnswer, def);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }
  const representation = representationIssue(
    submitted.parsed,
    def.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }
  const symbols = def.allowed_symbols ?? [];
  const relation = symbolicEqual(submitted.parsed.expression, def.answer_key, symbols);
  if (relation.result) {
    return relation.result;
  }
  if (!relation.matches) {
    const opposite = symbolicEqual(
      `-(${submitted.parsed.expression})`,
      def.answer_key,
      symbols,
    );
    return incorrect(opposite.matches ? "sign_error" : "value_mismatch");
  }
  const safe = parseSafeExpression(submitted.parsed.expression, symbols);
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }
  return (
    simplificationIssue(
      submitted.parsed.expression,
      safe.node,
      def.answer_spec.simplification,
    ) ?? correct()
  );
}

/**
 * A SENTENCE-FINAL period, dropped so terminal punctuation is not graded as mathematics.
 *
 * A learner who ends an answer the way they end a sentence writes `16.`, and what happens to
 * it today depends entirely on the SHAPE of the key rather than on any decision anybody made:
 * mathjs reads `16.` as 16, so a bare-number key takes it, while `{-9, 7}.` and `pi/2.` are
 * refused because the roster unwrapper looks for a closing brace at the end of the string and
 * the exact-representation gate reads the period as a decimal. Measured over the practice pool
 * at `3fbe5fcb`: accepted on 751 of 797 bare-number items and refused on every one of 35
 * `solution_set` items and 35 exact-trig items. That is not a product rule, it is an artifact,
 * and the CFU card refused the same punctuation on all 40 of its bare-number asks — so the two
 * surfaces disagreed with each other AND each disagreed with itself.
 *
 * One period, and only when a non-period character precedes it, so an ellipsis is left alone
 * for the parse error it already is.
 */
const TERMINAL_PERIOD = /[^.]\.$/;

export function foldTerminalPeriod(text: string): string {
  const trimmed = text.trim();
  return TERMINAL_PERIOD.test(trimmed) ? trimmed.slice(0, -1) : trimmed;
}

/** The maximum nesting the fold walks into a raw answer. Mirrors `unicode-minus.ts`. */
const MAX_ANSWER_DEPTH = 4;

/** Is there terminal punctuation anywhere in one submitted answer, whatever shape it has? */
function holdsTerminalPeriod(rawAnswer: unknown, depth = 0): boolean {
  if (typeof rawAnswer === "string") {
    return foldTerminalPeriod(rawAnswer) !== rawAnswer.trim();
  }
  if (depth >= MAX_ANSWER_DEPTH) {
    return false;
  }
  if (Array.isArray(rawAnswer)) {
    return rawAnswer.some((entry) => holdsTerminalPeriod(entry, depth + 1));
  }
  if (rawAnswer !== null && typeof rawAnswer === "object") {
    return Object.values(rawAnswer).some((value) => holdsTerminalPeriod(value, depth + 1));
  }
  return false;
}

/**
 * Fold the terminal period everywhere in one submitted answer, whatever shape it has.
 *
 * Walks the structure for the reason `foldRenderedMinusInAnswer` does: a `multipart` answer is
 * a record of one text field per part, and a learner ending the LAST part with a period is the
 * ordinary case rather than an exotic one.
 */
export function foldTerminalPeriodInAnswer(rawAnswer: unknown, depth = 0): unknown {
  if (typeof rawAnswer === "string") {
    return foldTerminalPeriod(rawAnswer);
  }
  if (depth >= MAX_ANSWER_DEPTH) {
    return rawAnswer;
  }
  if (Array.isArray(rawAnswer)) {
    return rawAnswer.map((entry) => foldTerminalPeriodInAnswer(entry, depth + 1));
  }
  if (rawAnswer !== null && typeof rawAnswer === "object") {
    return Object.fromEntries(
      Object.entries(rawAnswer).map(([key, value]) => [
        key,
        foldTerminalPeriodInAnswer(value, depth + 1),
      ]),
    );
  }
  return rawAnswer;
}

/**
 * Grade an answer, and grade it again without its terminal period if the first read refused it.
 *
 * A RETRY rather than a fold at the top, and the difference is the whole safety argument. The
 * rendered minus could be folded unconditionally because no answer carrying U+2212 grades
 * correct today, so that fold can only turn a refusal into a verdict. A period is not like
 * that: it is load-bearing for exactly one profile, `representation: "decimal"`, where
 * `isPlainDecimal` reads `16.` as a decimal and `16` as an integer — so folding it at the
 * dispatch would take a CORRECT answer on a decimal item and make it `wrong_representation`.
 * Grading the raw string first and only retrying the folded one makes that impossible by
 * construction instead of by argument, and it costs a second grade only on the answers that
 * actually end in a period.
 */
function checkProductDefinition(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  const first = gradeProductDefinition(rawAnswer, def);
  if (first.status === "correct" || !holdsTerminalPeriod(rawAnswer)) {
    return first;
  }
  const retried = gradeProductDefinition(foldTerminalPeriodInAnswer(rawAnswer), def);
  return retried.status === "correct" ? retried : first;
}

function gradeProductDefinition(rawAnswer: unknown, def: AnswerDefinition): InternalResult {
  /**
   * THE ONE PLACE the rendered minus is folded, ahead of every comparator below.
   *
   * KaTeX paints a minus as U+2212, so a coefficient copied off the rendered prompt reaches
   * the grader as a character mathjs cannot lex, and every text category refused it as
   * `invalid_input` — which §12 scores as UNANSWERED (`unicode-minus.ts`). It sits at the
   * dispatch rather than in `prepareRawAnswer` because half the categories never call that:
   * `solution_set`, `interval`, `point`, `equation_form` and `multiple_choice` read the raw
   * string themselves, and a roster or an interval is exactly where a copied minus lands.
   */
  const submitted = foldRenderedMinusInAnswer(rawAnswer);
  const spec = def.answer_spec;
  switch (spec.answer_type) {
    case "numeric":
      if (
        spec.simplification === "simplified_radical" ||
        spec.simplification === "canonical_exact_trig_value"
      ) {
        return compareRadical(submitted, def);
      }
      // A numeric answer that recognizes `pi` is an exact-radian value (TRG.1).
      if (def.allowed_symbols?.includes("pi")) {
        return comparePiExact(submitted, def);
      }
      if (spec.precision !== null) {
        return comparePrecision(submitted, def);
      }
      return compareNumericExact(submitted, def);
    case "expression":
      if (spec.required_form === "fully_factored_over_integers") {
        return compareFactored(submitted, def);
      }
      if (spec.required_form === "is_standard_polynomial") {
        return compareStandardPolynomial(submitted, def);
      }
      if (spec.required_form === "is_vertex_form") {
        return compareVertexForm(submitted, def);
      }
      if (
        spec.required_form === "is_expanded_log" ||
        spec.required_form === "is_condensed_log"
      ) {
        return compareLogIdentity(submitted, def);
      }
      if (spec.simplification === "simplified_radical") {
        return compareRadical(submitted, def);
      }
      if (spec.simplification === "positive_exponents") {
        return compareExponentExpression(submitted, def);
      }
      return compareExpressionSymbolic(submitted, def);
    case "solution_set":
      return compareSolutionSet(submitted, def);
    case "interval":
      return spec.required_notation === "set_builder"
        ? compareSetBuilder(submitted, def)
        : compareInterval(submitted, def);
    case "point":
      return comparePoint(submitted, def);
    case "equation_form":
      return compareEquationForm(submitted, def);
    case "rational_answer":
      return compareRationalAnswer(submitted, def);
    case "multiple_choice":
      return compareMultipleChoice(submitted, def);
    case "multipart":
      return compareMultipart(submitted, def);
    case "graph":
      // A graph item authored with an `interactive_spec` is scored by its
      // registered interactive module. No EXISTING graph item sets it, so every
      // current graph item still bails to the geometric comparator with the SAME
      // reason code as before (byte-identical behavior).
      if (def.interactive_spec !== undefined) {
        const graphModule = getInteractiveModule("graph");
        if (graphModule) {
          return graphModule.compare(def.interactive_spec, submitted);
        }
      }
      return unsupported("graph_uses_geometric_comparator");
    default: {
      // Other interactive answer types (e.g. number_line, a later PR) are scored
      // by their registered module over the item's private `interactive_spec`.
      // No existing item sets `interactive_spec`, so existing items are unaffected.
      const module = getInteractiveModule(spec.answer_type);
      if (module && def.interactive_spec !== undefined) {
        return module.compare(def.interactive_spec, submitted);
      }
      return unsupported("unsupported_answer_type");
    }
  }
}

export function createProductAnswerChecker({
  checkerVersion = PRODUCT_CHECKER_VERSION,
  itemVersions,
}: ProductCheckerOptions): AnswerChecker {
  const items = new Map(itemVersions.map((item) => [item.item_version_id, item]));
  return (input: CheckAnswerInput): CheckAnswerResult => {
    if (input.equivalence_checker_version !== checkerVersion) {
      return withVersion(scoringError("checker_version_unsupported"), checkerVersion);
    }
    const item = items.get(input.item_version_id);
    if (!item) {
      return withVersion(scoringError("item_version_not_found"), checkerVersion);
    }
    return withVersion(
      checkProductDefinition(input.raw_answer, item.answer),
      checkerVersion,
    );
  };
}
