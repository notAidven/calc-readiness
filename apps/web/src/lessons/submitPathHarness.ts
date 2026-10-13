/**
 * The FULL Check-button path for one practice item and one submission, in process.
 *
 * Every sweep in this tree enters at `practiceChecker`. The learner does not: two
 * pre-submit guards run first, and a submission either of them refuses NEVER REACHES THE
 * GRADER. That refusal is not `incorrect` and it is not `invalid_input` — no attempt is
 * recorded at all — so a checker-only sweep cannot see it, and the whole reason this
 * module exists is to make it a value you can assert on.
 *
 * `submitGuards.ts` records the defect class in its own docstring: RAD.1 practice shipped
 * a gate demanding a plain number on items keyed `sqrt(7)/2`, so the pool refused its own
 * answer key across 83 instances while every positive sweep over those keys stayed green.
 * `{@link submitThroughPracticeSurface}` returns `blocked_by_guard` for exactly that, held
 * apart from `incorrect` in the type.
 *
 * ## Fidelity
 *
 * The pipeline below is transcribed from the two shipped surfaces rather than inferred
 * from the specs: `LessonPractice.tsx` `handleSubmit` and `InfiniteDrill.tsx`
 * `handleSubmit`. Guard order, the `isInteractive` bypass on both guards, the
 * `/\d+\s*\/\s*\d+/` pre-test in front of the lowest-terms guard, and the
 * normalize-then-check tail are all theirs.
 *
 * ## A transcription goes stale, and this one did
 *
 * The two surfaces used to disagree about how a NON-STRING payload reaches the checker.
 * `InfiniteDrill` branched on `isInteractiveAnswerType(answer_type)`, and `rational_answer`
 * is not an interactive type, so its `{ expression, excluded_values }` was read as `""` and
 * the empty string was graded — the P0 that made all four RAT nodes' drills unplayable. That
 * divergence is FIXED: both handlers now branch on `typeof value === "string"`, and this
 * module was left describing the surface that no longer exists for the length of a lane.
 *
 * A copy of somebody else's control flow is only as good as the day it was read, so the
 * fidelity is now asserted rather than dated: `submitPathHarness.test.ts` reads both
 * surfaces' sources and fails if either decides `raw_answer` from the answer TYPE again, in
 * whichever direction the drift runs. {@link PracticeSurface} stays a parameter even though
 * the two branches have converged, because it is what lets the acceptance sweep assert the
 * agreement — a harness with one surface cannot state that at all.
 *
 * This module is test-only. Nothing shipped imports it.
 */

import {
  type AnswerChecker,
  createD1AnswerChecker,
  createProductAnswerChecker,
  D1_CHECKER_VERSION,
  isInteractiveAnswerType,
  PRODUCT_CHECKER_VERSION,
} from "@cr/components";
import {
  checkerVersionForPracticeItem,
  D1_PRACTICE_TEMPLATES,
  type FrozenItem,
  PRACTICE_AUTHORITY_ITEMS_BY_ID,
  toD1ItemVersions,
} from "@cr/item-bank";

import {
  isNumericLiteral,
  isReducedFraction,
  NUMERIC_LITERAL_NOTE,
  normalizeTextSubmission,
  practicePlaceholder,
  REDUCED_FRACTION_NOTE,
} from "./answerFormat";
import { practiceChecker } from "./practiceChecker";
import { requiresNumericLiteral } from "./submitGuards";

/** Which shipped surface's submit handler to reproduce. */
export type PracticeSurface = "lesson_practice" | "infinite_drill";

/**
 * The outcome of a submission, with the refusal state held apart from the miss.
 *
 * `blocked_by_guard` is the addition. The other three are the checker's own `status`
 * collapsed to what a learner experiences: `correct`, a scored miss, or a response the
 * reader could not read (`invalid_input`, which the lesson engine does not score either,
 * but which — unlike a guard refusal — did at least reach the grader).
 */
export type SubmitOutcome = "correct" | "incorrect" | "invalid_input" | "blocked_by_guard";

/** Which pre-submit guard refused a submission. */
export type SubmitGuard = "numeric_literal" | "reduced_fraction";

export interface SubmitPathResult {
  readonly outcome: SubmitOutcome;
  /** The guard that refused, or `null` when the submission reached the grader. */
  readonly guard: SubmitGuard | null;
  /** The learner-facing line the surface printed on a refusal, else `null`. */
  readonly note: string | null;
  /** The checker's verbatim status, or `null` when nothing was graded. */
  readonly status: string | null;
  readonly reason_code: string | null;
  readonly checker_version: number | null;
  /** Exactly what was handed to `practiceChecker`; absent when blocked. */
  readonly graded: unknown;
  /** The surface whose handler produced this result. */
  readonly surface: PracticeSurface;
}

/**
 * The notation line the answer field advertises for an item — what a solver is entitled
 * to see, and the grammar their answer is expected to be written in.
 *
 * It reads the item's answer KEY, as the shipped field does, because the three
 * constant-radical shapes are told apart by the key's shape. That leaks nothing: the
 * return value is one of a fixed table of literal strings in `answerFormat.ts`, none of
 * which contains a served answer.
 */
export function advertisedNotation(item: FrozenItem): string {
  return practicePlaceholder(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    typeof item.answer.answer_key === "string" ? item.answer.answer_key : undefined,
  );
}

/**
 * Submit `submission` against `item` through the whole path the Check button runs.
 *
 * `submission` is whatever the answer control holds: a string for a text item, a widget
 * payload for an interactive one, `{ expression, excluded_values }` for a rational one.
 * Use `canonicalRawAnswer(item.answer)` to get the shape an item's own key would arrive
 * in — 217 of the served items do not have a bare-string key, and reading
 * `answer.answer_key` directly misses all of them.
 */
export function submitThroughPracticeSurface(
  item: FrozenItem,
  submission: unknown,
  options: { readonly surface?: PracticeSurface } = {},
): SubmitPathResult {
  const surface = options.surface ?? "lesson_practice";
  const answerType = item.answer.answer_spec.answer_type;
  const isInteractive = isInteractiveAnswerType(answerType);
  // Both surfaces read a non-string payload as the empty string FOR THE GUARDS, and both
  // then bypass the guards entirely for an interactive type.
  const text = typeof submission === "string" ? submission : "";

  if (!isInteractive && requiresNumericLiteral(item) && !isNumericLiteral(text)) {
    return refused("numeric_literal", NUMERIC_LITERAL_NOTE, surface);
  }
  if (
    !isInteractive &&
    item.answer.answer_spec.simplification === "reduced_fraction" &&
    isNumericLiteral(text) &&
    /\d+\s*\/\s*\d+/.test(text) &&
    !isReducedFraction(text)
  ) {
    return refused("reduced_fraction", REDUCED_FRACTION_NOTE, surface);
  }

  // Both handlers now branch on the PAYLOAD'S SHAPE. Kept as one expression under a surface
  // parameter rather than collapsed away, because the parameter is what lets the acceptance
  // sweep assert the two agree; a harness with one surface cannot state that at all.
  const graded: unknown =
    typeof submission === "string"
      ? normalizeTextSubmission(submission, answerType)
      : submission;

  const result = checkerFor(item)({
    raw_answer: graded,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItemOrDraw(item),
  });

  // `invalid_input` covers `unsupported_expression` and `scoring_error` too: all three are
  // "the reader could not read it", which `isResolvingStatus` in the lesson engine declines
  // to score. Only `incorrect` is a scored miss.
  let outcome: SubmitOutcome = "invalid_input";
  if (result.client_correct) {
    outcome = "correct";
  } else if (result.status === "incorrect") {
    outcome = "incorrect";
  }

  return {
    outcome,
    guard: null,
    note: null,
    status: result.status,
    reason_code: result.reason_code,
    checker_version: result.checker_version,
    graded,
    surface,
  };
}

/**
 * A FRESH DRAW is not a served instance, and the shipped checker cannot grade one.
 *
 * `practiceChecker` resolves an item by `item_version_id` against the frozen registry, so
 * `generateFromTemplate(template, "practice", 900001)` — the shape the prompt manifest is
 * built from — is unknown to it and grades `scoring_error` no matter what is submitted.
 * That would read as a wall of harness failures over answers that are perfectly correct.
 *
 * So an unregistered item is graded by a checker built for it alone, memoized per id. The
 * comparators are the shipped ones; only the registry differs.
 */
const D1_TEMPLATE_IDS: ReadonlySet<string> = new Set(
  D1_PRACTICE_TEMPLATES.map((template) => template.template_id),
);

const adHocCheckers = new Map<string, AnswerChecker>();

/**
 * The checker version an item is graded at, for a served instance OR a fresh draw.
 *
 * `checkerVersionForPracticeItem` answers by SET MEMBERSHIP in the frozen product pool, so
 * it returns v1 for everything it has never seen — including a fresh D9 draw, which the v1
 * checker cannot grade. For an unregistered draw the version is decided by whether its
 * template is one of D1's, which is the same distinction the frozen pools encode.
 */
export function checkerVersionForItemOrDraw(item: FrozenItem): number {
  if (PRACTICE_AUTHORITY_ITEMS_BY_ID.has(item.item_version_id)) {
    return checkerVersionForPracticeItem(item);
  }
  return D1_TEMPLATE_IDS.has(item.template_id)
    ? D1_CHECKER_VERSION
    : PRODUCT_CHECKER_VERSION;
}

function checkerFor(item: FrozenItem): AnswerChecker {
  if (PRACTICE_AUTHORITY_ITEMS_BY_ID.has(item.item_version_id)) {
    return practiceChecker;
  }
  const cached = adHocCheckers.get(item.item_version_id);
  if (cached) {
    return cached;
  }
  const built =
    checkerVersionForItemOrDraw(item) === D1_CHECKER_VERSION
      ? createD1AnswerChecker({ itemVersions: toD1ItemVersions([item]) })
      : createProductAnswerChecker({
          itemVersions: [
            {
              item_version_id: item.item_version_id,
              node_id: item.node_id,
              answer: item.answer,
            },
          ],
        });
  adHocCheckers.set(item.item_version_id, built);
  return built;
}

function refused(
  guard: SubmitGuard,
  note: string,
  surface: PracticeSurface,
): SubmitPathResult {
  return {
    outcome: "blocked_by_guard",
    guard,
    note,
    status: null,
    reason_code: null,
    checker_version: null,
    graded: undefined,
    surface,
  };
}

/** Every served practice instance, in registration order. */
export const SERVED_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...PRACTICE_AUTHORITY_ITEMS_BY_ID.values(),
];
