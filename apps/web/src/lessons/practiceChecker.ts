/**
 * The answer checker for lesson practice items (the teammate's frozen D1 practice bank,
 * the interactive number_line demo pool, the D2 pool, the D5 pool, and the D7 pool).
 *
 * Every practice instance a lesson can show — the D1 five-slot pool + reveal/retry
 * variants, the interactive demo pool, and the D2, D5 and D7 pools + variants — is registered
 * up front so any drawn instance is gradable. We build ONE VERSIONED global checker
 * (`createVersionedAnswerChecker`) that routes each request by its declared
 * `equivalence_checker_version`: v1 (`D1_CHECKER_VERSION`) to the locked D1 checker, and
 * v2 (`PRODUCT_CHECKER_VERSION`, equal to `INTERACTIVE_CHECKER_VERSION`) to the product
 * checker. The product checker is a superset of v1 that also grades EXP.1's
 * positive-exponent expression path AND dispatches interactive answer types (number_line,
 * expr_builder) to their registered modules, so both the interactive demo pool and the
 * D2 pool (text + widget items) resolve under one v2 config. It is installed as the
 * global `checkAnswer`, because the lesson engine's client-grade path (`@cr/lesson`
 * `submitAnswer`) calls the global `checkAnswer`, and the mastery service's authoritative
 * recompute reuses the same versioned checker — so client and server grades agree in this
 * in-browser dev loop. The D1 mastery path is unchanged: a v1 item still routes to exactly
 * the same D1 checker as before.
 */

import {
  type AnswerChecker,
  configureAnswerChecker,
  D1_CHECKER_VERSION,
} from "@cr/components";
import {
  checkerVersionForPracticeItem,
  type FrozenItem,
  PRACTICE_AUTHORITY_ITEMS_BY_ID,
  practiceAuthorityChecker,
} from "@cr/item-bank";

/** The version D1 practice items declare (unchanged). */
export const PRACTICE_CHECKER_VERSION = D1_CHECKER_VERSION;

/**
 * The single versioned checker over ALL pools. A request routes by its declared
 * `equivalence_checker_version`, so a mixed set never rescores a response under the
 * wrong version.
 */
export const practiceChecker: AnswerChecker = practiceAuthorityChecker;

// The engine's client grade goes through the global registry; register the versioned
// checker there so a served instance resolves whether graded client- or server-side.
configureAnswerChecker(practiceChecker);

/** Look up a served instance's prompt + difficulty + answer by its item-version id. */
export const practiceItemsById: ReadonlyMap<string, FrozenItem> = new Map(
  PRACTICE_AUTHORITY_ITEMS_BY_ID,
);

/**
 * The `equivalence_checker_version` a given item is graded at. Items the product checker
 * owns (the interactive demo pool + the full D2 pool, text and widget alike) are v2;
 * every other item (the locked D1 pool) is v1. This is the per-item lookup the engine
 * instance + mastery recompute use so each item is always scored by the matching runtime.
 */
export function checkerVersionForItem(item: FrozenItem): number {
  return checkerVersionForPracticeItem(item);
}

/** Same lookup keyed by item-version id (for the mastery recompute, which has only the id). */
export function checkerVersionForId(itemVersionId: string): number {
  const item = practiceItemsById.get(itemVersionId);
  return item ? checkerVersionForItem(item) : PRACTICE_CHECKER_VERSION;
}
