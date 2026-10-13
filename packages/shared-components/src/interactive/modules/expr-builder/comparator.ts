import {
  correct,
  type InternalResult,
  incorrect,
  invalid,
  scoringError,
  withVersion,
} from "../../../checker-core";
import type { CheckAnswerResult } from "../../../index";

/**
 * The deterministic `expr_builder` comparator, the THIRD concrete interactive
 * answer type (after `graph` and `number_line`). A student assembles a symbolic
 * expression from labeled slots (e.g. a base and a positive exponent, or a
 * coefficient in front of a radical) and the widget emits a structured
 * {@link ExprBuilderPayload} that this pure comparator scores against the
 * author-declared {@link ExprBuilderSpec} (the answer key). Like the other
 * comparators it is pure + never throws, so Node and Chromium return identical
 * verdicts (Answer_Equivalence_Spec §13.15).
 *
 * The spec is a DISCRIMINATED UNION keyed by `kind`. All four shapes are now
 * gradeable:
 *  - `positive_power` (`base^exp`, exp a positive integer), the D2 EXP.1 form.
 *  - `coeff_radical` (`coeff * root_index(radicand)`), RAD.1 / RAD.2 simplified
 *    radicals (a coefficient in front of a root of a square-free radicand).
 *  - `radical_form` (`root_index(base^power)`), RAD.3 radical form of a rational
 *    power.
 *  - `rational_power` (`base^(num/den)`), RAD.3 rational-exponent form.
 *
 * Grading is a FAILS-CLOSED exact field match: every author-declared slot must be
 * filled with the exact expected value. Integer slots must match exactly; the base
 * SYMBOL is compared after normalizing whitespace and letter case on both sides,
 * because `X` and `x` name the same base and case is not the skill under test.
 * There is no numeric tolerance and no alternate-form acceptance at this layer, an
 * equivalent-but-differently-written text answer is graded by the product text
 * checker, not by the widget. This is exactly why RAD.3 form conversion is graded
 * by construction here: the widget
 * scores the FORM the student built, so a radical form and a rational-exponent
 * form of the same value are told apart (a value-equivalence check could not).
 *
 * Aligned to the shared v2 generation (`INTERACTIVE_CHECKER_VERSION`).
 */
export const EXPR_BUILDER_COMPARATOR_VERSION = 2;

/** `base^exp`, with `exp` a positive integer (the positive-exponent form). */
export interface PositivePowerSpec {
  kind: "positive_power";
  /** The symbolic base the student must build on, e.g. `"x"`. */
  base: string;
  /** The positive integer exponent (>= 1). */
  exp: number;
}

/**
 * `coeff * root_index(radicand)`, a coefficient in front of a radical, e.g.
 * `5 * sqrt(2)` (index 2) or `2 * cbrt(3)` (index 3). The radicand is the
 * square/cube-free value left under the root after simplifying; the index is the
 * root type (2 for a square root). Used by RAD.1 / RAD.2.
 */
export interface CoeffRadicalSpec {
  kind: "coeff_radical";
  /** The integer coefficient pulled out in front of the root (>= 1). */
  coeff: number;
  /** The value left under the root (>= 2, carries no perfect index-power factor). */
  radicand: number;
  /** The root index (>= 2; 2 = square root). */
  index: number;
}

/**
 * `root_index(base^power)`, the radical form of a rational power, e.g.
 * `root(x^3, 4)` for `x^(3/4)`. Used by RAD.3's radical-form conversion.
 */
export interface RadicalFormSpec {
  kind: "radical_form";
  /** The symbolic base under the root, e.g. `"x"`. */
  base: string;
  /** The power the base is raised to under the root (>= 1). */
  power: number;
  /** The root index (>= 2). */
  index: number;
}

/**
 * `base^(num/den)`, the rational-exponent form of a radical, e.g. `x^(3/4)` for
 * `root(x^3, 4)`. Used by RAD.3's rational-exponent conversion.
 */
export interface RationalPowerSpec {
  kind: "rational_power";
  /** The symbolic base, e.g. `"x"`. */
  base: string;
  /** The exponent numerator (>= 1). */
  num: number;
  /** The exponent denominator (>= 2, so the exponent is a genuine fraction). */
  den: number;
}

/**
 * The private spec (the answer key) for an expr_builder item. A discriminated
 * union so new shapes are additive: implement a new `kind`, add a `case` to
 * {@link scoreExprBuilderResponse} / {@link toExprBuilderWorkspace}, done.
 */
export type ExprBuilderSpec =
  | PositivePowerSpec
  | CoeffRadicalSpec
  | RadicalFormSpec
  | RationalPowerSpec;

/** The semantic role a workspace slot elicits (drives the widget's control kind). */
export type ExprBuilderSlotRole =
  | "base"
  | "exponent"
  | "coefficient"
  | "radicand"
  | "index"
  | "numerator"
  | "denominator";

/** One answer-free slot the widget renders (never carries an answer value). */
export interface ExprBuilderSlot {
  /** Stable slot id the payload keys on (e.g. `"base"`, `"exp"`). */
  id: string;
  /** The semantic role, so the widget can pick the right control. */
  role: ExprBuilderSlotRole;
  /** A human label for the control (no answer value). */
  label: string;
  /** Which control kind to render: a symbol picker or an integer field. */
  control: "symbol" | "integer";
}

/**
 * The answer-free description the widget renders from. It carries the layout
 * template + which slots to fill, with EVERY answer value (numbers, base symbols)
 * stripped, the client never receives the key.
 */
export interface ExprBuilderWorkspace {
  kind: ExprBuilderSpec["kind"];
  /** A readable layout template for display, e.g. `"base^exponent"`. */
  template: string;
  /** The ordered slots the student fills. */
  slots: readonly ExprBuilderSlot[];
}

/** The structured response the widget emits (never a rendered string / bitmap). */
export interface ExprBuilderPayload {
  kind?: string;
  /** positive_power / radical_form / rational_power base symbol. */
  base?: string;
  /** positive_power exponent, or radical_form power under the root. */
  exp?: number;
  /** coeff_radical leading coefficient. */
  coeff?: number;
  /** coeff_radical radicand. */
  radicand?: number;
  /** coeff_radical / radical_form root index. */
  index?: number;
  /** rational_power exponent numerator. */
  num?: number;
  /** rational_power exponent denominator. */
  den?: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** A finite integer that is at least `min`. */
function isIntegerAtLeast(value: unknown, min: number): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= min;
}

/**
 * Authoring-time validation of the spec (fail closed as `scoring_error`). Every
 * gradeable kind declares its own well-formedness; a shape that is not a known
 * `kind` is rejected as `unsupported_spec_kind`.
 */
export function validateExprBuilderSpec(spec: ExprBuilderSpec): InternalResult | undefined {
  if (!spec || typeof spec !== "object" || typeof spec.kind !== "string") {
    return scoringError("invalid_spec");
  }
  switch (spec.kind) {
    case "positive_power": {
      if (!isNonEmptyString(spec.base)) {
        return scoringError("invalid_base");
      }
      if (!isIntegerAtLeast(spec.exp, 1)) {
        return scoringError("invalid_exponent");
      }
      return undefined;
    }
    case "coeff_radical": {
      if (!isIntegerAtLeast(spec.coeff, 1)) {
        return scoringError("invalid_coefficient");
      }
      if (!isIntegerAtLeast(spec.radicand, 2)) {
        return scoringError("invalid_radicand");
      }
      if (!isIntegerAtLeast(spec.index, 2)) {
        return scoringError("invalid_index");
      }
      return undefined;
    }
    case "radical_form": {
      if (!isNonEmptyString(spec.base)) {
        return scoringError("invalid_base");
      }
      if (!isIntegerAtLeast(spec.power, 1)) {
        return scoringError("invalid_power");
      }
      if (!isIntegerAtLeast(spec.index, 2)) {
        return scoringError("invalid_index");
      }
      return undefined;
    }
    case "rational_power": {
      if (!isNonEmptyString(spec.base)) {
        return scoringError("invalid_base");
      }
      if (!isIntegerAtLeast(spec.num, 1)) {
        return scoringError("invalid_numerator");
      }
      if (!isIntegerAtLeast(spec.den, 2)) {
        return scoringError("invalid_denominator");
      }
      return undefined;
    }
    default:
      return scoringError("unsupported_spec_kind");
  }
}

/** Reject a payload whose top-level shape is not a plain object. */
function normalizePayload(response: unknown): ExprBuilderPayload | undefined {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return undefined;
  }
  return response as ExprBuilderPayload;
}

/** Coerce a payload numeric field that may arrive as a number or a numeric string. */
function readInteger(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Read one required integer slot from the payload, returning either the parsed
 * value or a fail-closed result (a `missing` incorrect or an `invalid` input).
 */
function readRequiredInteger(
  raw: unknown,
  missingReason: string,
  invalidReason: string,
): { value: number } | { result: InternalResult } {
  if (raw === undefined) {
    return { result: incorrect(missingReason) };
  }
  const value = readInteger(raw);
  if (value === undefined) {
    return { result: invalid(invalidReason) };
  }
  return { value };
}

/**
 * Canonical form of a base symbol: surrounding whitespace and letter case carry no
 * mathematical meaning, so `" X "` and `"x"` denote the same base. Applied to BOTH
 * the payload and the author's spec so the comparison is symmetric.
 */
function normalizeBase(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Read the required base symbol from the payload (a non-empty string), returning
 * either the normalized symbol or a fail-closed result.
 */
function readRequiredBase(raw: unknown): { value: string } | { result: InternalResult } {
  if (raw === undefined) {
    return { result: incorrect("base_missing") };
  }
  if (typeof raw !== "string") {
    return { result: invalid("invalid_base") };
  }
  return { value: normalizeBase(raw) };
}

/** Fails-closed exact field match for the positive_power shape. */
function comparePositivePower(
  spec: PositivePowerSpec,
  payload: ExprBuilderPayload,
): InternalResult {
  const base = readRequiredBase(payload.base);
  if ("result" in base) {
    return base.result;
  }
  const exp = readRequiredInteger(payload.exp, "exponent_missing", "invalid_exponent");
  if ("result" in exp) {
    return exp.result;
  }
  if (base.value !== normalizeBase(spec.base)) {
    return incorrect("base_mismatch");
  }
  if (exp.value !== spec.exp) {
    return incorrect("exponent_mismatch");
  }
  return correct();
}

/** Fails-closed exact field match for the coeff_radical shape. */
function compareCoeffRadical(
  spec: CoeffRadicalSpec,
  payload: ExprBuilderPayload,
): InternalResult {
  const coeff = readRequiredInteger(
    payload.coeff,
    "coefficient_missing",
    "invalid_coefficient",
  );
  if ("result" in coeff) {
    return coeff.result;
  }
  const radicand = readRequiredInteger(
    payload.radicand,
    "radicand_missing",
    "invalid_radicand",
  );
  if ("result" in radicand) {
    return radicand.result;
  }
  const index = readRequiredInteger(payload.index, "index_missing", "invalid_index");
  if ("result" in index) {
    return index.result;
  }
  if (coeff.value !== spec.coeff) {
    return incorrect("coefficient_mismatch");
  }
  if (radicand.value !== spec.radicand) {
    return incorrect("radicand_mismatch");
  }
  if (index.value !== spec.index) {
    return incorrect("index_mismatch");
  }
  return correct();
}

/** Fails-closed exact field match for the radical_form shape (`root(base^power, index)`). */
function compareRadicalForm(
  spec: RadicalFormSpec,
  payload: ExprBuilderPayload,
): InternalResult {
  const base = readRequiredBase(payload.base);
  if ("result" in base) {
    return base.result;
  }
  // The power under the root rides the shared `exp` payload field (role "exponent").
  const power = readRequiredInteger(payload.exp, "power_missing", "invalid_power");
  if ("result" in power) {
    return power.result;
  }
  const index = readRequiredInteger(payload.index, "index_missing", "invalid_index");
  if ("result" in index) {
    return index.result;
  }
  if (base.value !== normalizeBase(spec.base)) {
    return incorrect("base_mismatch");
  }
  if (power.value !== spec.power) {
    return incorrect("power_mismatch");
  }
  if (index.value !== spec.index) {
    return incorrect("index_mismatch");
  }
  return correct();
}

function integerGcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * True when the built exponent is the RIGHT VALUE written in the wrong form: it is
 * equal to the key's fraction but is not itself in lowest terms (e.g. `3/6` against a
 * key of `1/2`). That is a FORM miss, not a value miss, so it earns its own reason
 * code and a note that names the fix instead of a bare `numerator_mismatch`.
 */
function isUnreducedEquivalent(num: number, den: number, spec: RationalPowerSpec): boolean {
  if (num <= 0 || den <= 0) {
    return false;
  }
  return num * spec.den === spec.num * den && integerGcd(num, den) > 1;
}

/** Fails-closed exact field match for the rational_power shape (`base^(num/den)`). */
function compareRationalPower(
  spec: RationalPowerSpec,
  payload: ExprBuilderPayload,
): InternalResult {
  const base = readRequiredBase(payload.base);
  if ("result" in base) {
    return base.result;
  }
  const num = readRequiredInteger(payload.num, "numerator_missing", "invalid_numerator");
  if ("result" in num) {
    return num.result;
  }
  const den = readRequiredInteger(
    payload.den,
    "denominator_missing",
    "invalid_denominator",
  );
  if ("result" in den) {
    return den.result;
  }
  if (base.value !== normalizeBase(spec.base)) {
    return incorrect("base_mismatch");
  }
  if (isUnreducedEquivalent(num.value, den.value, spec)) {
    return incorrect("exponent_not_reduced");
  }
  if (num.value !== spec.num) {
    return incorrect("numerator_mismatch");
  }
  if (den.value !== spec.den) {
    return incorrect("denominator_mismatch");
  }
  return correct();
}

/**
 * Score one structured expr_builder response against the expected spec. Pure +
 * deterministic; never throws. A malformed spec fails closed as `scoring_error`;
 * a malformed payload as `invalid_input`; a wrong build as `incorrect` with a
 * reason code.
 */
export function scoreExprBuilderResponse(
  spec: ExprBuilderSpec,
  response: unknown,
): CheckAnswerResult {
  const invalidSpec = validateExprBuilderSpec(spec);
  if (invalidSpec) {
    return withVersion(invalidSpec, EXPR_BUILDER_COMPARATOR_VERSION);
  }
  const payload = normalizePayload(response);
  if (!payload) {
    return withVersion(
      invalid("invalid_expr_builder_response"),
      EXPR_BUILDER_COMPARATOR_VERSION,
    );
  }
  switch (spec.kind) {
    case "positive_power":
      return withVersion(
        comparePositivePower(spec, payload),
        EXPR_BUILDER_COMPARATOR_VERSION,
      );
    case "coeff_radical":
      return withVersion(
        compareCoeffRadical(spec, payload),
        EXPR_BUILDER_COMPARATOR_VERSION,
      );
    case "radical_form":
      return withVersion(
        compareRadicalForm(spec, payload),
        EXPR_BUILDER_COMPARATOR_VERSION,
      );
    case "rational_power":
      return withVersion(
        compareRationalPower(spec, payload),
        EXPR_BUILDER_COMPARATOR_VERSION,
      );
    default:
      // Unreachable once validateExprBuilderSpec passes; fail closed regardless.
      return withVersion(
        scoringError("unsupported_spec_kind"),
        EXPR_BUILDER_COMPARATOR_VERSION,
      );
  }
}

/**
 * Project the answer-free workspace the widget renders from. It carries the layout
 * template + which slots to elicit, with every ANSWER value stripped, the client
 * never receives the key. Every gradeable kind projects only labels + roles, so a
 * `JSON.stringify(workspace)` contains no answer digits at all.
 */
export function toExprBuilderWorkspace(spec: ExprBuilderSpec): ExprBuilderWorkspace {
  switch (spec.kind) {
    case "positive_power":
      return {
        kind: "positive_power",
        template: "base^exponent",
        slots: [
          { id: "base", role: "base", label: "Base", control: "symbol" },
          { id: "exp", role: "exponent", label: "Exponent", control: "integer" },
        ],
      };
    case "coeff_radical":
      return {
        kind: "coeff_radical",
        template: "coefficient * root(radicand, index)",
        slots: [
          {
            id: "coeff",
            role: "coefficient",
            label: "Coefficient",
            control: "integer",
          },
          { id: "radicand", role: "radicand", label: "Radicand", control: "integer" },
          {
            id: "index",
            role: "index",
            label: "Root index (2 for a square root)",
            control: "integer",
          },
        ],
      };
    case "radical_form":
      return {
        kind: "radical_form",
        template: "root(base^power, index)",
        slots: [
          { id: "base", role: "base", label: "Base", control: "symbol" },
          {
            id: "exp",
            role: "exponent",
            label: "Power (under the root)",
            control: "integer",
          },
          { id: "index", role: "index", label: "Root index", control: "integer" },
        ],
      };
    case "rational_power":
      return {
        kind: "rational_power",
        template: "base^(numerator/denominator)",
        slots: [
          { id: "base", role: "base", label: "Base", control: "symbol" },
          { id: "num", role: "numerator", label: "Exponent numerator", control: "integer" },
          {
            id: "den",
            role: "denominator",
            label: "Exponent denominator",
            control: "integer",
          },
        ],
      };
    default:
      return { kind: (spec as ExprBuilderSpec).kind, template: "", slots: [] };
  }
}

/** The canonical correct payload for a spec (the answer key as a widget payload). */
export function canonicalExprBuilderPayload(spec: ExprBuilderSpec): ExprBuilderPayload {
  switch (spec.kind) {
    case "positive_power":
      return { kind: "positive_power", base: spec.base, exp: spec.exp };
    case "coeff_radical":
      return {
        kind: "coeff_radical",
        coeff: spec.coeff,
        radicand: spec.radicand,
        index: spec.index,
      };
    case "radical_form":
      // The power under the root rides the shared `exp` field (role "exponent").
      return { kind: "radical_form", base: spec.base, exp: spec.power, index: spec.index };
    case "rational_power":
      return { kind: "rational_power", base: spec.base, num: spec.num, den: spec.den };
    default:
      return { kind: (spec as ExprBuilderSpec).kind };
  }
}
