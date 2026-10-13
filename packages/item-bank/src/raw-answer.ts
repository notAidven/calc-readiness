import {
  canonicalInteractivePayload,
  type D1AnswerDefinition,
  isInteractiveAnswerType,
} from "@cr/components";
import { all, create } from "mathjs";

import type { ItemPackEntry } from "./schema";

/**
 * THE RAW ANSWER A LEARNER WOULD SUBMIT for an authored item — right, and wrong.
 *
 * Both halves were being re-derived at every call site, and getting either subtly wrong is
 * expensive in a specific way: `raw_answer` is `unknown` all the way through
 * `AssessmentItemSubmission`, so a payload in the wrong SHAPE does not fail to compile, it
 * grades `invalid_input`. In the walk that status is not scorable and not a fault, so the
 * engine re-serves the identical item forever while the fault rate reads 0%. A helper that
 * gets the shape right is therefore worth more than the four lines it saves.
 *
 * Three consumers, and they need the same answer to the same question:
 *
 *  - `validate.ts`, whose self-consistency probe grades every authored key;
 *  - the walk guards in `services/diagnostic-runtime`, which drive whole administrations;
 *  - `apps/web`'s diagnostic dev skip, which answers a walk for a reviewer.
 */

/**
 * The correct raw answer for an item, reconstructed from its definition — in the shape the
 * checker and the answer control both use.
 *
 * Two shapes are not the bare `answer_key`:
 *
 *  - **multipart**: an object keyed by `part_id`, recursively.
 *  - **`rational_answer`**: `{ expression, excluded_values }`. The comparator grades the
 *    simplified expression AND the values the ORIGINAL denominator forbids, and cancelling
 *    a factor hides the value it excluded, so the exclusions cannot be recovered from the
 *    expression. A bare string is rejected outright.
 *  - **an interactive type** carries no text key at all: its correct answer is the widget
 *    payload the module reconstructs from the private `interactive_spec`.
 */
export function canonicalRawAnswer(definition: D1AnswerDefinition): unknown {
  if (definition.parts?.length) {
    const parts: Record<string, unknown> = {};
    for (const part of definition.parts) {
      parts[part.part_id] = canonicalRawAnswer(part.answer);
    }
    return parts;
  }
  if (definition.answer_spec.answer_type === "rational_answer") {
    return {
      expression: definition.answer_key,
      excluded_values: definition.excluded_values ?? [],
    };
  }
  if (
    isInteractiveAnswerType(definition.answer_spec.answer_type) &&
    definition.interactive_spec !== undefined
  ) {
    return canonicalInteractivePayload(
      definition.answer_spec.answer_type,
      definition.interactive_spec,
    );
  }
  return definition.answer_key;
}

/**
 * A WELL-FORMED raw answer that grades NOT-correct.
 *
 * Well-formed is the whole requirement, and it is easy to miss why. An unparseable answer
 * grades `invalid_input`, which the walk treats as a fault: the item is re-served rather
 * than scored. So a "get it wrong" affordance built on garbage does not model a learner who
 * misses a question, it models one who is stuck on it — the walk never advances, and both a
 * dev skip and a miss-everything guard silently measure nothing. Hence a value per shape
 * that the checker can read and must reject.
 *
 * The value is deliberately far from any authored key rather than a near miss: the point is
 * an unambiguous miss, not a plausible one.
 */
export function wellFormedWrongRawAnswer(entry: ItemPackEntry): unknown {
  const definition = entry.answer;
  const key = typeof definition.answer_key === "string" ? definition.answer_key : "";
  if (definition.parts?.length) {
    const parts: Record<string, unknown> = {};
    for (const part of definition.parts) {
      parts[part.part_id] = wellFormedWrongRawAnswer({ ...entry, answer: part.answer });
    }
    return parts;
  }
  switch (definition.answer_spec.answer_type) {
    case "rational_answer":
      // The exclusions stay right, so the miss is unambiguously about the expression.
      return { expression: "123456", excluded_values: definition.excluded_values ?? [] };
    case "expression":
      // Parses, and is off by one from the key under every simplification profile — which
      // a fixed literal would not be, since an expression key may legally be any shape.
      return `(${key}) + 1`;
    case "solution_set":
      return "{123456}";
    case "point":
      return "(123456, 123457)";
    case "interval":
      return "(123456, 123457)";
    default:
      return "999999";
  }
}

/* -------------------------------------------------------------------------
 * The key-derived wrong-answer census
 * ---------------------------------------------------------------------- */

/**
 * WHAT A MUTATION IS EVIDENCE ABOUT, which is not the same question as whether it is wrong.
 *
 * A wrong answer the grader refuses because it did not PARSE proves nothing about the
 * comparator: the identical refusal would meet a correct answer written that way. Measured
 * over the served pool, `empty_string`, `whitespace_only` and `prompt_echo` are rejected
 * without any comparison 90-100% of the time — 917 of the empty-string attempts never reached
 * the grader at all, having been refused by the numeric-literal guard first. So they are held
 * in their own class, and a floor of the form "the comparator rejects wrong answers" that
 * counted them would be satisfiable by a parser.
 */
export type WrongAnswerClass = "value_wrong" | "form_violation" | "non_answer";

/** One mutation of an item's own answer key, with the reason it is not that item's answer. */
export interface KeyDerivedWrongAnswer {
  readonly family: string;
  readonly answer_class: WrongAnswerClass;
  /** In the shape the answer control holds, so it can go through the whole submit path. */
  readonly payload: unknown;
  /**
   * Why this is provably not the item's answer, established WITHOUT asking the checker.
   *
   * The distinction is load-bearing. If the checker decided which mutations counted, a
   * checker that accepts everything would report zero false positives and also zero valid
   * mutations, and the two would be indistinguishable from outside.
   */
  readonly witness: string;
}

/** A mutation that could not be shown wrong, so it is discarded rather than submitted-and-excused. */
export interface DiscardedMutation {
  readonly family: string;
  readonly reason: string;
}

export interface KeyDerivedCensus {
  readonly mutations: readonly KeyDerivedWrongAnswer[];
  readonly discarded: readonly DiscardedMutation[];
}

export interface KeyDerivedOptions {
  /**
   * Other legal options of the same multiple-choice item, for `sibling_option`. A wrong
   * option has to come from the item's own vocabulary or it is a parse test, not a choice.
   */
  readonly siblingOptions?: readonly string[];
}

// `all` is typed `FactoryFunctionMap | undefined` in mathjs's own declarations even though it
// is always defined; `checker-core.ts` imports the named factories one by one to avoid this.
// A single non-null here is cheaper than a second factory list nobody would keep in step.
const witnessMath = create(all as Parameters<typeof create>[0], { number: "number" });

/**
 * Probe points for the sampled witness: positive, non-integer, and spread, so `sqrt`, `log`
 * and a rational's denominator all stay real and finite. Fixed rather than random because a
 * census that samples differently on every run cannot be compared with the last one.
 */
const WITNESS_POINTS: readonly number[] = [1.3, 2.7, 3.1, 4.9, 6.3, 7.7, 9.1, 11.3];

function evaluateWitness(expression: string, scope: Record<string, number>): number | null {
  try {
    const value = witnessMath.evaluate(expression, { ...scope }) as unknown;
    const asNumber = typeof value === "number" ? value : Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  } catch {
    return null;
  }
}

function witnessScopes(symbols: readonly string[]): Record<string, number>[] {
  if (symbols.length === 0) {
    return [{}];
  }
  return WITNESS_POINTS.map((base, index) => {
    const scope: Record<string, number> = {};
    symbols.forEach((symbol, position) => {
      scope[symbol] =
        WITNESS_POINTS[(index + position * 3) % WITNESS_POINTS.length] ?? base;
    });
    return scope;
  });
}

/** Do two expressions take DIFFERENT values at some probe point? The `value_wrong` witness. */
function separatedAtSomePoint(
  left: string,
  right: string,
  symbols: readonly string[],
): boolean {
  return witnessScopes(symbols).some((scope) => {
    const a = evaluateWitness(left, scope);
    const b = evaluateWitness(right, scope);
    return a !== null && b !== null && Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a));
  });
}

/** Do two expressions agree everywhere they are both defined? The `form_violation` witness. */
function agreesEverywhere(
  left: string,
  right: string,
  symbols: readonly string[],
): boolean {
  let compared = 0;
  for (const scope of witnessScopes(symbols)) {
    const a = evaluateWitness(left, scope);
    const b = evaluateWitness(right, scope);
    if (a === null || b === null) {
      continue;
    }
    if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a))) {
      return false;
    }
    compared += 1;
  }
  return compared > 0;
}

interface ExactRational {
  readonly n: bigint;
  readonly d: bigint;
}

/** `-3`, `2.75`, `7/4` read EXACTLY. Anything else is `null` and takes the sampled witness. */
function readExactRational(text: string): ExactRational | null {
  const trimmed = text.trim();
  const fraction = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fraction?.[1] && fraction[2]) {
    const denominator = BigInt(fraction[2]);
    return denominator === 0n ? null : { n: BigInt(fraction[1]), d: denominator };
  }
  const decimal = trimmed.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!decimal?.[2]) {
    return null;
  }
  const places = decimal[3] ?? "";
  const scale = 10n ** BigInt(places.length);
  const magnitude = BigInt(decimal[2]) * scale + BigInt(places === "" ? "0" : places);
  return { n: decimal[1] === "-" ? -magnitude : magnitude, d: scale };
}

function rationalsEqual(a: ExactRational, b: ExactRational): boolean {
  return a.n * b.d === b.n * a.d;
}

/**
 * The key with its FIRST digit run bumped by one — `-12` becomes `-13`, `2*x + 7` becomes
 * `3*x + 7`. Deliberately a digit and not a whole term: the point is the near miss a learner
 * actually produces, not an obviously different answer.
 */
function bumpFirstDigitRun(text: string): string | null {
  const match = text.match(/\d+/);
  if (!match || match.index === undefined) {
    return null;
  }
  const digits = match[0];
  const bumped = String(BigInt(digits) + 1n);
  return text.slice(0, match.index) + bumped + text.slice(match.index + digits.length);
}

/**
 * The negation, parenthesised only where it has to be. A bare numeral gets a bare minus so
 * that `readExactRational` can still read the result — which is what lets the roster path ask
 * whether the negated member is already IN the set instead of assuming it is not.
 */
function negatedSpelling(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("-")) {
    return trimmed.slice(1).trim();
  }
  return readExactRational(trimmed) ? `-${trimmed}` : `-(${trimmed})`;
}

/** Split `{-9, 7}` / `-9, 7` / `{7; -9}` into its members, or `null` if it is not a roster. */
function readRosterMembers(key: string): string[] | null {
  const inner = key.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
  if (!inner || inner.includes("|")) {
    return null;
  }
  const members = inner
    .split(/\s*[,;]\s*|\s+and\s+/)
    .map((member) => member.trim())
    .filter((member) => member.length > 0);
  return members.length > 0 ? members : null;
}

interface ReadInterval {
  readonly open: "(" | "[";
  readonly low: string;
  readonly high: string;
  readonly close: ")" | "]";
}

function readIntervals(key: string): ReadInterval[] | null {
  const pieces = key.split(/\s*(?:U|u|∪)\s*/).map((piece) => piece.trim());
  const out: ReadInterval[] = [];
  for (const piece of pieces) {
    const match = piece.match(/^([([])\s*([^,]+?)\s*,\s*(.+?)\s*([)\]])$/);
    if (!match?.[1] || !match[2] || !match[3] || !match[4]) {
      return null;
    }
    out.push({
      open: match[1] as "(" | "[",
      low: match[2],
      high: match[3],
      close: match[4] as ")" | "]",
    });
  }
  return out.length > 0 ? out : null;
}

function renderIntervals(intervals: readonly ReadInterval[]): string {
  return intervals
    .map(({ open, low, high, close }) => `${open}${low}, ${high}${close}`)
    .join(" U ");
}

function isInfinite(bound: string): boolean {
  return /inf/i.test(bound);
}

/** `(4, -9)` read as an ordered pair, or `null`. */
function readPoint(key: string): [string, string] | null {
  const match = key.trim().match(/^\(\s*([^,]+?)\s*,\s*([^,]+?)\s*\)$/);
  return match?.[1] && match[2] ? [match[1], match[2]] : null;
}

/**
 * Every mutation of an item's own answer key that can be shown wrong without asking the
 * checker, in the shape the answer control holds.
 *
 * ## Why this is not `wellFormedWrongRawAnswer` with more cases
 *
 * {@link wellFormedWrongRawAnswer} answers a different question. It exists so a walk guard or
 * a dev skip can MISS an item on purpose, so its value is deliberately far from any key —
 * `999999` — and one per item is enough. A census asks whether the comparator can be fooled,
 * which wants the near miss and wants many per item, each with the reason it is wrong recorded
 * beside it. The two share the shape-per-answer-type knowledge and nothing else, so this reads
 * the same `answer_type` switch and returns a list instead of a value.
 *
 * ## The three classes, and why they are not one number
 *
 * See {@link WrongAnswerClass}. A caller computing "the comparator rejects wrong answers" must
 * count `value_wrong` only.
 */
export function keyDerivedWrongAnswers(
  entry: ItemPackEntry,
  options: KeyDerivedOptions = {},
): KeyDerivedCensus {
  const definition = entry.answer;
  const spec = definition.answer_spec;
  const answerType = spec.answer_type;
  const symbols = definition.allowed_symbols ?? [];
  const key = typeof definition.answer_key === "string" ? definition.answer_key.trim() : "";
  const mutations: KeyDerivedWrongAnswer[] = [];
  const discarded: DiscardedMutation[] = [];

  const keep = (
    family: string,
    answer_class: WrongAnswerClass,
    payload: unknown,
    witness: string,
  ): void => {
    mutations.push({ family, answer_class, payload, witness });
  };
  const drop = (family: string, reason: string): void => {
    discarded.push({ family, reason });
  };

  if (isInteractiveAnswerType(answerType)) {
    const canonical = canonicalRawAnswer(definition);
    keep(
      "empty_payload",
      "non_answer",
      {},
      "an empty widget payload asserts nothing and cannot be the item's answer",
    );
    const perturbed = perturbInteractivePayload(canonical);
    if (perturbed) {
      keep(
        "perturbed_payload",
        "value_wrong",
        perturbed.payload,
        `the widget payload's ${perturbed.field} differs from the canonical payload`,
      );
    } else {
      drop("perturbed_payload", "no numeric field of the payload could be perturbed");
    }
    return { mutations, discarded };
  }

  // Every text item gets the three non-answers, which are legitimately parse-refused and are
  // in the census to be COUNTED SEPARATELY rather than to prove anything about comparison.
  if (answerType !== "rational_answer") {
    keep("empty_string", "non_answer", "", "the empty string names nothing");
    keep("whitespace_only", "non_answer", "   ", "whitespace names nothing");
    keep(
      "prompt_echo",
      "non_answer",
      entry.prompt.slice(0, 120),
      "the question handed back is not an answer to it",
    );
  }

  switch (answerType) {
    case "multiple_choice": {
      const siblings = (options.siblingOptions ?? []).filter(
        (option) => option.trim().toLowerCase() !== key.toLowerCase(),
      );
      const sibling = siblings[0];
      if (sibling) {
        keep(
          "sibling_option",
          "value_wrong",
          sibling,
          `"${sibling}" is a different option of this item's own vocabulary`,
        );
      } else {
        drop("sibling_option", "the item's option vocabulary yielded no second option");
      }
      break;
    }
    case "solution_set": {
      const members = readRosterMembers(key);
      if (!members) {
        // An EMPTY roster and a SET-BUILDER condition are both legitimate keys that hold no
        // members to drop or negate, and both were silently contributing nothing until the
        // per-item floor caught them. The empty set's wrong answer is any non-empty set; a
        // set-builder's is the same condition over a different number.
        if (/^\{\s*\}$/.test(key)) {
          keep(
            "added_set_member",
            "value_wrong",
            "{123457}",
            "asserts a solution to an equation the key says has none",
          );
        } else {
          const bumped = bumpFirstDigitRun(key);
          if (bumped) {
            keep(
              "digit_bump",
              "value_wrong",
              bumped,
              "the condition's own numeral is changed, so it describes a different set",
            );
          } else {
            drop("dropped_set_member", "the key is a condition with no numeral to change");
          }
        }
        break;
      }
      if (members.length > 1) {
        const dropped = members.slice(1);
        keep(
          "dropped_set_member",
          "value_wrong",
          `{${dropped.join(", ")}}`,
          `omits the solution ${members[0]}, so it is a different set`,
        );
      } else {
        drop("dropped_set_member", "a one-member roster has nothing to drop");
      }
      keep(
        "added_set_member",
        "value_wrong",
        `{${[...members, "123457"].join(", ")}}`,
        "asserts 123457 is a solution, which it is not",
      );
      for (const member of members) {
        // ZERO IS NOT FLIPPABLE, and `sameNumericMember` alone does not say so: it compares
        // `0` with the spelling `-(0)`, which `readExactRational` cannot read, so the pair
        // came back "different" and 14 rosters holding a zero root were submitted as their
        // own key. A member has to be readable AND nonzero before negating it changes the set.
        const exact = readExactRational(member);
        if (!exact || exact.n === 0n) {
          continue;
        }
        const flipped = members.map((other) =>
          other === member ? negatedSpelling(other) : other,
        );
        const changed = !members.some((other) =>
          sameNumericMember(other, negatedSpelling(member)),
        );
        if (changed) {
          keep(
            "sign_flip",
            "value_wrong",
            `{${flipped.join(", ")}}`,
            `negating ${member} names a value the key's set does not contain`,
          );
          break;
        }
      }
      if (!mutations.some((mutation) => mutation.family === "sign_flip")) {
        drop(
          "sign_flip",
          "the roster is symmetric or zero-valued, so negating a member names the same set",
        );
      }
      break;
    }
    case "interval": {
      const intervals = readIntervals(key);
      if (!intervals) {
        // Set-builder conditions (`{x | x != -4}`, `{x | -2 < x < 18}`) are served under this
        // answer type and hold no brackets to flip. Their numeral is the whole claim, so
        // changing it names a different set without needing the interval reader.
        const bumped = bumpFirstDigitRun(key);
        if (bumped) {
          keep(
            "digit_bump",
            "value_wrong",
            bumped,
            "the condition's own numeral is changed, so it describes a different set",
          );
        } else {
          drop(
            "flipped_interval_bracket",
            "the key is neither interval notation nor numeral-bearing",
          );
        }
        break;
      }
      const flippable = intervals.findIndex(
        (interval) => !isInfinite(interval.low) || !isInfinite(interval.high),
      );
      if (flippable >= 0) {
        const target = intervals[flippable] as ReadInterval;
        const finiteLow = !isInfinite(target.low);
        const flipped = intervals.map((interval, index) =>
          index === flippable
            ? finiteLow
              ? { ...interval, open: (target.open === "(" ? "[" : "(") as "(" | "[" }
              : { ...interval, close: (target.close === ")" ? "]" : ")") as ")" | "]" }
            : interval,
        );
        keep(
          "flipped_interval_bracket",
          "value_wrong",
          renderIntervals(flipped),
          "includes or excludes an endpoint the key does not, so it is a different set",
        );
        const shifted = intervals.map((interval, index) =>
          index === flippable
            ? finiteLow
              ? { ...interval, low: shiftBound(target.low) }
              : { ...interval, high: shiftBound(target.high) }
            : interval,
        );
        keep(
          "shifted_interval_endpoint",
          "value_wrong",
          renderIntervals(shifted),
          "moves a finite endpoint by 1, so it is a different set",
        );
      } else {
        drop("flipped_interval_bracket", "every endpoint is infinite, so no bracket bites");
      }
      if (intervals.length > 1) {
        keep(
          "dropped_interval_component",
          "value_wrong",
          renderIntervals(intervals.slice(0, 1)),
          "drops one component of a union, so it is a different set",
        );
      }
      break;
    }
    case "point": {
      const point = readPoint(key);
      if (!point) {
        drop("swapped_point_coordinates", "the key is not an ordered pair");
        break;
      }
      const [abscissa, ordinate] = point;
      if (abscissa.trim() !== ordinate.trim()) {
        keep(
          "swapped_point_coordinates",
          "value_wrong",
          `(${ordinate}, ${abscissa})`,
          "the coordinates are unequal, so swapping them names a different point",
        );
      } else {
        drop(
          "swapped_point_coordinates",
          "the point is on y = x, so swapping names itself",
        );
      }
      keep(
        "shifted_point",
        "value_wrong",
        `(${shiftBound(abscissa)}, ${ordinate})`,
        "moves the abscissa by 1, so it is a different point",
      );
      break;
    }
    case "rational_answer": {
      const exclusions = definition.excluded_values ?? [];
      keep(
        "empty_string",
        "non_answer",
        { expression: "", excluded_values: exclusions },
        "the empty string names no expression",
      );
      const bumped = bumpFirstDigitRun(key);
      if (bumped && separatedAtSomePoint(key, bumped, symbols)) {
        keep(
          "digit_bump",
          "value_wrong",
          { expression: bumped, excluded_values: exclusions },
          `${bumped} and ${key} take different values at a probe point`,
        );
      } else {
        drop("digit_bump", "no witness of a changed value could be produced");
      }
      if (exclusions.length > 0) {
        keep(
          "dropped_rational_exclusion",
          "value_wrong",
          { expression: key, excluded_values: exclusions.slice(1) },
          `omits the excluded value ${exclusions[0]}, which the original denominator forbids`,
        );
        const flippable = exclusions.find(
          (value) =>
            readExactRational(value)?.n !== 0n &&
            !exclusions.includes(negatedSpelling(value)),
        );
        if (flippable) {
          keep(
            "excluded_value_sign_flip",
            "value_wrong",
            {
              expression: key,
              excluded_values: exclusions.map((value) =>
                value === flippable ? negatedSpelling(value) : value,
              ),
            },
            `${negatedSpelling(flippable)} is not a pole of the original expression`,
          );
        } else {
          drop(
            "excluded_value_sign_flip",
            "every excluded value is zero or already paired with its negation",
          );
        }
      } else {
        drop(
          "dropped_rational_exclusion",
          "the item excludes nothing, so nothing can be dropped",
        );
      }
      keep(
        "added_rational_exclusion",
        "value_wrong",
        { expression: key, excluded_values: [...exclusions, "123457"] },
        "asserts 123457 is excluded, and it is not a pole of the original expression",
      );
      break;
    }
    default: {
      // numeric and expression, which share every construction below.
      const exact = readExactRational(key);
      const bumped = bumpFirstDigitRun(key);
      if (bumped) {
        const exactBump = readExactRational(bumped);
        if (exact && exactBump && !rationalsEqual(exact, exactBump)) {
          keep(
            "digit_bump",
            "value_wrong",
            bumped,
            `${bumped} is exactly unequal to ${key}`,
          );
        } else if (separatedAtSomePoint(key, bumped, symbols)) {
          keep(
            "digit_bump",
            "value_wrong",
            bumped,
            `${bumped} and ${key} take different values at a probe point`,
          );
        } else {
          drop("digit_bump", "no witness of a changed value could be produced");
        }
      } else {
        drop("digit_bump", "the key contains no digit to bump");
      }
      const flipped = negatedSpelling(key);
      if (exact ? exact.n !== 0n : separatedAtSomePoint(key, flipped, symbols)) {
        keep(
          "sign_flip",
          "value_wrong",
          flipped,
          `${flipped} is the negation of a nonzero value`,
        );
      } else {
        drop("sign_flip", "the key is zero, so its negation is the same number");
      }
      if (exact) {
        const off = `${exact.n + exact.d}/${exact.d}`;
        keep(
          "off_by_one",
          "value_wrong",
          exact.d === 1n ? String(exact.n + 1n) : off,
          "one more than the key, which is a different number",
        );
      } else {
        drop(
          "off_by_one",
          "the key is not a bare rational, so adding one is not spellable",
        );
      }
      break;
    }
  }

  return { mutations, discarded };
}

function sameNumericMember(left: string, right: string): boolean {
  const a = readExactRational(left);
  const b = readExactRational(right);
  return a !== null && b !== null && rationalsEqual(a, b);
}

function shiftBound(bound: string): string {
  const exact = readExactRational(bound);
  if (!exact) {
    return isInfinite(bound) ? bound : `(${bound}) + 1`;
  }
  return exact.d === 1n ? String(exact.n + 1n) : `${exact.n + exact.d}/${exact.d}`;
}

function perturbInteractivePayload(
  canonical: unknown,
): { payload: unknown; field: string } | null {
  if (typeof canonical !== "object" || canonical === null) {
    return null;
  }
  const record = canonical as Record<string, unknown>;
  const points = record.points;
  if (Array.isArray(points) && points.length > 0 && typeof points[0] === "number") {
    return {
      payload: { ...record, points: [(points[0] as number) + 1, ...points.slice(1)] },
      field: "first marked point",
    };
  }
  const intervals = record.intervals;
  if (Array.isArray(intervals) && intervals.length > 0) {
    return {
      payload: { ...record, intervals: intervals.slice(1) },
      field: "interval list",
    };
  }
  for (const [field, value] of Object.entries(record)) {
    if (typeof value === "number") {
      return { payload: { ...record, [field]: value + 1 }, field };
    }
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Same-value, forbidden-shape mutations
 * ---------------------------------------------------------------------- */

/**
 * A rewrite that is the SAME NUMBER as the key in a shape the item forbids.
 *
 * This is the half of the census that the mechanical wave could not build, and it is the half
 * that matters most for a comparator that normalizes eagerly: a `value_wrong` mutation asks
 * whether the grader can tell two numbers apart, and a `form_violation` asks whether it is
 * enforcing the rule the item actually declares. 409 served items carry a simplification rule
 * that never received one, `simplified_radical` — the family `submitGuards.ts` records a
 * shipped defect in — among them.
 *
 * Each entry names the rule it violates and carries a predicate saying what makes the rewrite
 * forbidden, so a rewrite that happens to come out already-simplified is discarded rather than
 * submitted as a form violation it is not.
 */
export interface FormViolation {
  readonly family: string;
  readonly rule: string;
  readonly payload: string;
  readonly witness: string;
}

/** The simplification and required-form values a form violation can be constructed for. */
export function formViolationsFor(entry: ItemPackEntry): {
  readonly violations: readonly FormViolation[];
  readonly discarded: readonly DiscardedMutation[];
} {
  const definition = entry.answer;
  const spec = definition.answer_spec;
  const symbols = definition.allowed_symbols ?? [];
  const key = typeof definition.answer_key === "string" ? definition.answer_key.trim() : "";
  const violations: FormViolation[] = [];
  const discarded: DiscardedMutation[] = [];
  if (!key || isInteractiveAnswerType(spec.answer_type)) {
    return { violations, discarded };
  }

  const offer = (family: string, rule: string, payload: string, witness: string): void => {
    if (payload === key) {
      discarded.push({ family, reason: "the rewrite is the key itself" });
      return;
    }
    if (!agreesEverywhere(key, payload, symbols)) {
      discarded.push({ family, reason: "the rewrite could not be shown value-equal" });
      return;
    }
    violations.push({ family, rule, payload, witness });
  };

  const rule = spec.simplification;
  if (rule === "reduced_fraction") {
    const exact = readExactRational(key);
    if (exact && exact.d !== 1n) {
      offer(
        "unreduced_fraction",
        rule,
        `${exact.n * 2n}/${exact.d * 2n}`,
        "the same number with numerator and denominator doubled, so not in lowest terms",
      );
    } else {
      discarded.push({
        family: "unreduced_fraction",
        reason: "the key is not a bare fraction",
      });
    }
  }
  if (rule === "combined_polynomial" || rule === "combined_constants") {
    const split = splitTrailingConstant(key);
    // The two profiles own DIFFERENT rules and are given different families deliberately.
    // `combined_constants` runs `hasUncombinedConstants`, so an uncombined constant is a
    // refusable form miss. `combined_polynomial` runs `hasUncombinedLikeTerms`, which
    // compares by SYMBOL and says nothing about constants, so the same payload is ACCEPTED
    // there. That is a measured leniency, not a fixable slip in this round's family, and it
    // is pinned by name in `falsePositiveCensus.test.ts` rather than hidden by omission.
    const family =
      rule === "combined_constants"
        ? "uncombined_constants"
        : "uncombined_constants_on_polynomial";
    if (split) {
      offer(
        family,
        rule,
        split,
        "the same value with its constant term written as an uncombined sum",
      );
    } else {
      discarded.push({ family, reason: "the key has no constant term to split" });
    }
  }
  if (rule === "combined_polynomial") {
    const uncombined = splitLeadingSymbolTerm(key);
    if (uncombined) {
      offer(
        "uncombined_like_terms",
        rule,
        uncombined,
        "the same value with its leading term split into two like terms left uncombined",
      );
    } else {
      discarded.push({
        family: "uncombined_like_terms",
        reason: "the key has no leading coefficient-times-symbol term to split",
      });
    }
  }
  const form = spec.required_form;
  if (form === "fully_factored_over_integers") {
    const partial = partiallyFactoredSpelling(key);
    if (partial) {
      offer("partially_factored", form, partial.payload, partial.witness);
    } else {
      discarded.push({
        family: "partially_factored",
        reason: "no leading coefficient and no pair of linear factors to multiply out",
      });
    }
  }
  if (form === "is_standard_polynomial") {
    const ascending = ascendingTermOrder(key);
    if (ascending) {
      offer(
        "ascending_term_order",
        form,
        ascending,
        "the same polynomial with its terms written in ascending degree",
      );
    } else {
      discarded.push({
        family: "ascending_term_order",
        reason: "the key is a single term, so it has no order to reverse",
      });
    }
  }
  if (form === "is_expanded_log") {
    const condensed = condensedLogSpelling(key);
    if (condensed) {
      offer(
        "condensed_log",
        form,
        condensed,
        "the same value written as one logarithm, which the item asked to be expanded",
      );
    } else {
      discarded.push({
        family: "condensed_log",
        reason: "the key is not a sum of logarithms this reader can condense",
      });
    }
  }
  if (form === "is_condensed_log") {
    const expanded = expandedLogSpelling(key);
    if (expanded) {
      offer(
        "expanded_log",
        form,
        expanded,
        "the same value written as a sum of logarithms, which the item asked to be condensed",
      );
    } else {
      discarded.push({
        family: "expanded_log",
        reason: "the key is not a single logarithm of a composite this reader can expand",
      });
    }
  }
  if (rule === "simplified_radical" || rule === "canonical_exact_trig_value") {
    const unsimplified = unsimplifiedRadicalSpelling(key);
    if (unsimplified) {
      offer("unsimplified_radical", rule, unsimplified.payload, unsimplified.witness);
    } else {
      discarded.push({
        family: "unsimplified_radical",
        reason: "no perfect square could be folded into the key's radical or denominator",
      });
    }
  }
  if (rule === "positive_exponents") {
    const negative = negativeExponentSpelling(key);
    if (negative) {
      offer(
        "negative_exponent",
        rule,
        negative,
        "the same value written with a negative exponent, which the item forbids",
      );
    } else {
      discarded.push({
        family: "negative_exponent",
        reason: "the key has no power to invert",
      });
    }
  }
  return { violations, discarded };
}

/** `4x - 36` becomes `4x - 30 - 6`: the same value, like terms left uncombined. */
function splitTrailingConstant(key: string): string | null {
  const match = key.match(/^(.*[^\s([{+\-*/^])\s*([+-])\s*(\d+)$/);
  if (!match?.[1] || !match[2] || !match[3]) {
    const bare = key.match(/^(-?\d+)$/);
    return bare?.[1] ? `${BigInt(bare[1]) - 1n} + 1` : null;
  }
  const magnitude = BigInt(match[3]);
  if (magnitude < 2n) {
    return null;
  }
  const first = magnitude - 1n;
  return `${match[1]} ${match[2]} ${first} ${match[2]} 1`;
}

/**
 * `3*sqrt(2)` becomes `sqrt(18)` — the same number with a perfect square left under the root.
 * `sqrt(2)/2` becomes `1/sqrt(2)` — the same number with a radical in the denominator.
 *
 * A key with NO RADICAL gets nothing, deliberately, and an earlier draft of this reader that
 * offered the unreduced fraction `6/10` for the key `3/5` was measuring a rule the product
 * does not have. `radicalFormIssue` runs `radicalNotSimplified`, which is only ever about a
 * perfect power under a root or a radical in a denominator; it says nothing about reducing a
 * rational, and `compareConstantRadical`'s own docstring records that as a decision rather
 * than an oversight — 61 of the 152 items in this cohort have a rational key (`3/5`, `-24/7`),
 * and any shape gate over those is the `RAD.1` "refuses its own key" trap. So those items have
 * no forbidden shape to construct, and inventing one would have reported a generator's
 * assumption as a product false positive.
 */
function unsimplifiedRadicalSpelling(
  key: string,
): { payload: string; witness: string } | null {
  const coefficient = key.match(/^(-?)(\d+)\s*\*?\s*sqrt\(\s*(\d+)\s*\)$/);
  if (coefficient?.[2] && coefficient[3]) {
    const outside = BigInt(coefficient[2]);
    const inside = BigInt(coefficient[3]);
    return {
      payload: `${coefficient[1]}sqrt(${outside * outside * inside})`,
      witness: "the same number with the coefficient folded back under the root",
    };
  }
  const overInteger = key.match(/^(-?)sqrt\(\s*(\d+)\s*\)\s*\/\s*(\d+)$/);
  if (overInteger?.[2] && overInteger[3] && overInteger[2] === overInteger[3]) {
    return {
      payload: `${overInteger[1]}1/sqrt(${overInteger[2]})`,
      witness: "the same number with the radical left in the denominator",
    };
  }
  return null;
}

/**
 * `5*t + 10` becomes `6*t - t + 10`: the same value with two uncombined LIKE TERMS.
 *
 * This is the violation `combined_polynomial` actually owns — `hasUncombinedLikeTerms`
 * compares terms by symbol — as distinct from the uncombined CONSTANT that profile lets
 * through. Adding one and subtracting one back always balances, so no coefficient shape
 * (including 1, and including a negative leading coefficient) is excluded.
 */
function splitLeadingSymbolTerm(key: string): string | null {
  // The power is part of the TERM, not a reason to give up: `9x^3` and `4*n^2 + 12` are the
  // commonest `combined_polynomial` keys in D2 and an earlier reader skipped every one of them
  // because it stopped at the caret.
  const leading = key.match(
    /^(-?)(\d*)\s*\*?\s*([A-Za-z]\w*(?:\s*\^\s*\d+)?)(?!\s*[\w(^])(.*)$/,
  );
  if (!leading?.[3]) {
    return null;
  }
  const sign = leading[1] === "-" ? -1n : 1n;
  const magnitude = leading[2] ? BigInt(leading[2]) : 1n;
  const variable = leading[3];
  const rest = leading[4] ?? "";
  const bumped = sign * magnitude + 1n;
  const head =
    bumped === 1n ? variable : bumped === -1n ? `-${variable}` : `${bumped}*${variable}`;
  return `${head} - ${variable}${rest}`;
}

/** Split a string on its TOP-LEVEL occurrences of the given operators, keeping the operators. */
function topLevelSplit(text: string, operators: ReadonlySet<string>): string[] | null {
  const pieces: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] as string;
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) {
        return null;
      }
    } else if (depth === 0 && operators.has(character) && index > start) {
      const previous = text.slice(0, index).trimEnd().at(-1);
      // A `+`/`-` immediately after another operator or an exponent marker is a SIGN, not a
      // separator, and `e-4` inside a numeral is neither.
      if (previous && !"+-*/^(,".includes(previous)) {
        pieces.push(text.slice(start, index));
        start = index;
      }
    }
  }
  if (depth !== 0) {
    return null;
  }
  pieces.push(text.slice(start));
  return pieces.map((piece) => piece.trim()).filter((piece) => piece.length > 0);
}

const ADDITIVE = new Set(["+", "-"]);

/** `x^2 + 5*x + 6` becomes `6 + 5*x + x^2`: standard form's term order run backwards. */
function ascendingTermOrder(key: string): string | null {
  const terms = topLevelSplit(key, ADDITIVE);
  if (!terms || terms.length < 2) {
    return null;
  }
  const signed = terms.map((term, index) => {
    if (term.startsWith("+") || term.startsWith("-")) {
      return { sign: term[0] as "+" | "-", body: term.slice(1).trim() };
    }
    return { sign: (index === 0 ? "+" : "+") as "+" | "-", body: term.trim() };
  });
  const reversed = [...signed].reverse();
  const head = reversed[0] as { sign: "+" | "-"; body: string };
  const rest = reversed
    .slice(1)
    .map((term) => ` ${term.sign} ${term.body}`)
    .join("");
  return `${head.sign === "-" ? "-" : ""}${head.body}${rest}`;
}

/**
 * A key the item asked to be FACTORED, rewritten so it is value-equal and still not fully
 * factored over the integers. Two constructions, in order of how plausible a learner's
 * version is: distribute a leading integer coefficient into the first bracket, which leaves
 * a non-primitive factor; or multiply the first two linear factors together, which leaves a
 * reducible quadratic. Anything the readers cannot see is discarded rather than guessed at.
 */
function partiallyFactoredSpelling(
  key: string,
): { payload: string; witness: string } | null {
  const leading = key.match(/^(-?\d+)\s*\*?\s*\(\s*([^()]+?)\s*\)\s*\*?\s*((?:\(.*)?)$/);
  if (leading?.[1] && leading[2] !== undefined) {
    const coefficient = BigInt(leading[1]);
    const inner = topLevelSplit(leading[2], ADDITIVE);
    if (inner && inner.length >= 2) {
      const distributed = inner
        .map((term, index) => {
          const negative = term.startsWith("-");
          const body = term.replace(/^[+-]\s*/, "");
          const scaled = scaleTerm(body, negative ? -coefficient : coefficient);
          if (scaled === null) {
            return null;
          }
          if (index === 0) {
            return scaled;
          }
          return scaled.startsWith("-") ? ` - ${scaled.slice(1)}` : ` + ${scaled}`;
        })
        .join("");
      if (!distributed.includes("null")) {
        const tail = leading[3] ?? "";
        return {
          payload: `(${distributed})${tail ? `*${tail}` : ""}`,
          witness:
            "the leading coefficient distributed into the first factor, leaving it non-primitive",
        };
      }
    }
  }
  // A general linear pair, coefficients included: `(3x + 7)(3x - 7)` and `(4x + 1)(x + 4)` are
  // both served, and a reader that assumed a leading coefficient of 1 saw neither.
  const pair = key.match(
    /^\(\s*(\d*)\s*\*?\s*([A-Za-z]\w*)\s*([+-])\s*(\d+)\s*\)\s*\*?\s*\(\s*(\d*)\s*\*?\s*([A-Za-z]\w*)\s*([+-])\s*(\d+)\s*\)(.*)$/,
  );
  if (pair?.[2] && pair[2] === pair[6] && pair[4] && pair[8]) {
    const leftSlope = pair[1] ? BigInt(pair[1]) : 1n;
    const rightSlope = pair[5] ? BigInt(pair[5]) : 1n;
    const a = (pair[3] === "-" ? -1n : 1n) * BigInt(pair[4]);
    const b = (pair[7] === "-" ? -1n : 1n) * BigInt(pair[8]);
    const variable = pair[2];
    const quadratic = leftSlope * rightSlope;
    const linear = leftSlope * b + rightSlope * a;
    const constant = a * b;
    const head =
      quadratic === 1n
        ? `${variable}^2`
        : quadratic === -1n
          ? `-${variable}^2`
          : `${quadratic}*${variable}^2`;
    const middle =
      linear === 0n ? "" : ` ${linear < 0n ? "-" : "+"} ${abs(linear)}*${variable}`;
    const tail = constant === 0n ? "" : ` ${constant < 0n ? "-" : "+"} ${abs(constant)}`;
    return {
      payload: `(${head}${middle}${tail})${pair[9] ?? ""}`,
      witness:
        "the first two linear factors multiplied back out, leaving a reducible quadratic",
    };
  }
  return null;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/** Multiply a single polynomial term by an integer, or give up if its shape is unread. */
function scaleTerm(term: string, factor: bigint): string | null {
  const bare = term.match(/^(\d+)$/);
  if (bare?.[1]) {
    return String(BigInt(bare[1]) * factor);
  }
  const withSymbol = term.match(/^(\d*)\s*\*?\s*([A-Za-z]\w*(?:\^\d+)?)$/);
  if (withSymbol?.[2]) {
    const coefficient = (withSymbol[1] ? BigInt(withSymbol[1]) : 1n) * factor;
    if (coefficient === 1n) {
      return withSymbol[2];
    }
    if (coefficient === -1n) {
      return `-${withSymbol[2]}`;
    }
    return `${coefficient}*${withSymbol[2]}`;
  }
  return null;
}

const LOG_TERM = /^([+-]?)\s*(?:(\d+)\s*\*?\s*)?(log|ln)\s*\(\s*(.+?)\s*\)$/;

/** `log(y) + log(n)` becomes `log(y*n)`: the answer an "expand" item asked NOT to be given. */
function condensedLogSpelling(key: string): string | null {
  const terms = topLevelSplit(key, ADDITIVE);
  if (!terms || terms.length < 2) {
    return null;
  }
  const numerator: string[] = [];
  const denominator: string[] = [];
  let name = "";
  for (const term of terms) {
    const match = term.match(LOG_TERM);
    if (!match?.[3] || !match[4]) {
      return null;
    }
    if (name && name !== match[3]) {
      return null;
    }
    name = match[3];
    const power = match[2] ? `(${match[4]})^${match[2]}` : `(${match[4]})`;
    (match[1] === "-" ? denominator : numerator).push(power);
  }
  if (numerator.length === 0) {
    return null;
  }
  const top = numerator.join("*");
  return denominator.length > 0
    ? `${name}((${top})/(${denominator.join("*")}))`
    : `${name}(${top})`;
}

/** `log(m*a*q)` becomes `log(m) + log(a) + log(q)`: a "condense" item's answer left expanded. */
function expandedLogSpelling(key: string): string | null {
  const match = key.trim().match(/^(log|ln)\s*\(\s*(.+?)\s*\)$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const name = match[1];
  const factors = topLevelSplit(match[2], new Set(["*", "/"]));
  if (!factors || factors.length < 2) {
    return null;
  }
  const pieces: string[] = [];
  for (let index = 0; index < factors.length; index += 1) {
    const raw = factors[index] as string;
    const negative = raw.startsWith("/");
    const body = raw.replace(/^[*/]\s*/, "").trim();
    if (body.length === 0 || /[*/]/.test(body)) {
      return null;
    }
    const power = body.match(/^\(?\s*([A-Za-z]\w*|\d+)\s*\)?\^(\d+)$/);
    const piece = power?.[1] ? `${power[2]}*${name}(${power[1]})` : `${name}(${body})`;
    pieces.push(index === 0 ? piece : `${negative ? "-" : "+"} ${piece}`);
  }
  return pieces.join(" ");
}

/**
 * `x^5` becomes `1/x^-5`: the same value carrying the negative exponent the item forbids.
 *
 * The quotient shape is the one that matters. `positive_exponents` is EXP.1's profile and its
 * keys are overwhelmingly `x^2/y^3`-shaped, so a reader that only saw a bare power reached a
 * minority of the cohort; moving a denominator power up to the numerator with its sign flipped
 * is both the commonest learner spelling and the one the rule names.
 */
function negativeExponentSpelling(key: string): string | null {
  const quotient = key.match(/^(.+?)\s*\/\s*([A-Za-z]\w*)\s*\^\s*(\d+)$/);
  if (quotient?.[1] && quotient[2] && quotient[3]) {
    const numerator = quotient[1].trim();
    const moved = `${quotient[2]}^-${quotient[3]}`;
    return numerator === "1" ? moved : `${numerator}*${moved}`;
  }
  const overSymbol = key.match(/^(.+?)\s*\/\s*([A-Za-z]\w*)$/);
  if (overSymbol?.[1] && overSymbol[2] && !/[+\-*/^]/.test(overSymbol[1])) {
    const numerator = overSymbol[1].trim();
    const moved = `${overSymbol[2]}^-1`;
    return numerator === "1" ? moved : `${numerator}*${moved}`;
  }
  const power = key.match(/^([A-Za-z]\w*)\^(\d+)$/);
  if (power?.[1] && power[2]) {
    return `1/${power[1]}^-${power[2]}`;
  }
  const coefficientPower = key.match(/^(-?\d+)\s*\*?\s*([A-Za-z]\w*)\^(\d+)$/);
  if (coefficientPower?.[1] && coefficientPower[2] && coefficientPower[3]) {
    return `${coefficientPower[1]}/${coefficientPower[2]}^-${coefficientPower[3]}`;
  }
  return null;
}
