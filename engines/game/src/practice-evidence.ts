import type { StudentNodeState } from "@cr/state-schema";

/**
 * PRACTICE EVIDENCE — the codebase's single predicate for "has this learner
 * actually worked this node's practice set?" (pure, framework-free).
 *
 * `last_practiced_at !== null` is the canonical signal, established by issue
 * #102 / PR #131 for the economy's lesson grant and reused here so the economy
 * and the city's copy cannot drift into two different notions of "practiced":
 *   - Every write that touches practice stamps it (`citySession.ts` —
 *     `advanceMasteryDev`, `markLessonTaught`, `setStageDev`).
 *   - BOTH test-out write paths leave it null (`seedFromPlacement` and the
 *     `placeSkill` server-path pre-build), which each write
 *     `mastery: 0, lesson_stage: "done", completion_status: "complete"` before
 *     the learner has answered a single item.
 *
 * It is deliberately NOT sufficient on its own: `setStageDev` stamps it even when
 * forcing a node back to an empty site, so every caller conjoins it with a
 * finished/complete check (the economy uses its finished union; the city view
 * model uses the derived `complete` construction stage). See
 * `apps/web/src/economy/useEconomy.ts` and `city-view-model.ts`.
 */
export function hasPracticeEvidence(
  state: Pick<StudentNodeState, "last_practiced_at"> | null | undefined,
): boolean {
  return (state?.last_practiced_at ?? null) !== null;
}
