import { PRACTICED_MASTERY } from "@cr/mastery-service";
import type { Mastery } from "@cr/state-schema";

/**
 * The ONE place the app decides a lesson has been "completed": the learner finished at
 * least one five-problem practice set on that node.
 *
 * `mastery >= 1` is exactly that, per `docs/Mastery_Scoring_Spec.md` §2 — a scored set
 * never lands below 1 (`masteryFromCorrectCount` returns 1, 2, or 3), and nothing else
 * raises mastery. Notably a diagnostic test-out leaves `mastery: 0` while marking the
 * node `complete`/`done`, so completion_status and lesson_stage are NOT usable here:
 * they would admit nodes the learner has never practiced.
 *
 * Every surface that gates on "has practiced this" reads this module so the dev page and
 * the city cannot drift apart on the rule.
 */

/**
 * The mastery a node reaches the moment its first practice set is scored.
 *
 * **RE-EXPORTED, not declared.** It moved to `@cr/mastery-service` (derived as
 * `masteryFromCorrectCount(0)`) when the city's population started reading it too:
 * `engines/game` cannot import from `apps/web`, and a second copy of "what counts as
 * practised" living in the engine is exactly the drift this module was written to
 * prevent. Every existing importer is unaffected.
 */
export { PRACTICED_MASTERY };

/** The node ids whose practice set the learner has finished, in `nodeStates` order. */
export function completedNodeIdsFrom(
  nodeStates: readonly { node_id: string; mastery: Mastery }[],
): readonly string[] {
  return nodeStates
    .filter((state) => state.mastery >= PRACTICED_MASTERY)
    .map((state) => state.node_id);
}
