import { isInteractiveAnswerType } from "@cr/components";

import type { ItemPackEntry } from "./schema";

/**
 * WHICH AUTHORED ANSWER SHAPES THE DIAGNOSTIC'S ANSWER ROW CAN SUBMIT.
 *
 * A leaf module on purpose. The derivation in `diagnostic-scope.ts` needs this predicate,
 * and so does `practice-walk.ts`, which has to know which nodes the existing packs already
 * SERVE before it freezes forms for the ones they do not — and `diagnostic-scope.ts` imports
 * `practice-walk.ts`. Kept here, both read it and nothing imports in a circle.
 * `diagnostic-scope.ts` re-exports all three names, so every existing import still resolves.
 */

/**
 * Why an authored assessment item cannot be served by the diagnostic. Exported so a
 * guard can assert the exclusion is load-bearing rather than decorative: force a
 * reason false and the node it excuses re-enters the scope.
 */
export type UnservableShapeReason = "multipart" | "interactive_widget";

/**
 * Which authored answer shapes the diagnostic's answer row can submit.
 *
 * The diagnostic serves one probe into ONE answer control, and two authored shapes
 * cannot be answered through it:
 *
 *  - **`multipart`** wants an object keyed by `part_id`. `TRG.2`'s product walk item is
 *    the only one in the tree ("Give the exact value of each: sin 60°, cos 45°,
 *    tan 30°"), and `apps/web` has no multi-field answer input at all — the same limit
 *    `d9/practice.ts` records for why no PRACTICE item is multipart either. Served, it
 *    would grade `invalid_input`, which `isScorable` refuses, so the walk would re-serve
 *    the identical item forever at a 0% fault rate (`Diagnostic_11_Node_Scope_Measurement.md`
 *    §2(a)).
 *  - **An interactive type** (`graph`, `number_line`) carries no text answer_key at all;
 *    it is graded by `createInteractiveAnswerChecker` at its own checker version, which
 *    is not the checker the walk composes.
 *
 * Every other authored shape is submittable, and that is not an assumption: the row is the
 * same `PracticeAnswer` dispatcher lesson practice uses, so a shape a practice item is
 * keyed in is a shape the diagnostic can ask. `answerFormat.ts`'s `answerNotation` has a
 * branch for each of `interval`, `point`, `solution_set`, `multiple_choice` and
 * `rational_answer`; a choose-one item is a text field whose options are in the prompt.
 * That is what makes freezing walk forms from practice templates safe by construction
 * rather than by inspection — see `practice-walk.ts`.
 */
export function unservableShapeReason(entry: ItemPackEntry): UnservableShapeReason | null {
  if ((entry.answer.parts?.length ?? 0) > 0) {
    return "multipart";
  }
  if (isInteractiveAnswerType(entry.answer.answer_spec.answer_type)) {
    return "interactive_widget";
  }
  return null;
}

/** Whether the diagnostic's answer row can submit this item (see {@link unservableShapeReason}). */
export function isDiagnosticServableShape(entry: ItemPackEntry): boolean {
  return unservableShapeReason(entry) === null;
}
