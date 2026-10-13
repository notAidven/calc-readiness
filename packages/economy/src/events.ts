import type { EraId } from "@cr/skill-graph";

import {
  REASON_CIVIC_BOOTSTRAP,
  REASON_INTERLEAVED,
  REASON_ISLAND_FOUNDING,
  REASON_LESSON_COMPLETE,
  REASON_PRACTICE_COMPLETE,
} from "./constants";

/**
 * Deterministic `event_id` builders (resource spec §6). The whole idempotency
 * scheme rests on these: replaying a grant/spend with the same inputs produces
 * the same `event_id`, and a duplicate `(student, event_id, resource)` is a no-op
 * — so a grant can never double-credit and a spend can never double-charge.
 *
 * The ids are PURE functions of stable identifiers (node id, session id, placement id)
 * — never of a timestamp or a random nonce — which is exactly what makes replay safe.
 *
 * **TWO BUILDERS LEFT WITH THE SUNSET.** `purchaseEventId` keyed a cosmetic purchase and
 * `starEventId` keyed a mastery star's XP; there is no shop to buy from and no XP to
 * credit, so an id for either would name an event nothing can raise.
 */

/** The server-verified earn transaction namespaces. */
export type EarnKind = "lesson_complete" | "interleaved" | "practice_complete";

function assertPart(part: string, label: string): void {
  if (part.length === 0 || part.includes(":")) {
    throw new Error(
      `economy event id: ${label} must be non-empty and contain no ':' (got "${part}").`,
    );
  }
}

/**
 * Generic builder: `kind:part1:part2:…`. Colons are the delimiter, so no part may
 * contain one. Kept generic so a future earn/spend kind reuses the exact scheme.
 */
export function buildEventId(kind: string, parts: readonly string[]): string {
  assertPart(kind, "kind");
  for (const part of parts) {
    assertPart(part, "part");
  }
  return [kind, ...parts].join(":");
}

/** Row 1 — `lesson_complete:{node_id}`. One-time per node (monotonic ⇒ replay no-op). */
export function lessonCompleteEventId(nodeId: string): string {
  return buildEventId(REASON_LESSON_COMPLETE, [nodeId]);
}

/** Row 2 — `interleaved:{session_id}`. Repeatable, but each session id is once-only. */
export function interleavedEventId(sessionId: string): string {
  return buildEventId(REASON_INTERLEAVED, [sessionId]);
}

/**
 * A scored lesson-practice set, once per mastery evidence id.
 *
 * Unlike `lessonCompleteEventId`, this remains unique when the learner repeats a completed
 * skill. Unlike a random receipt id, it is the mastery service's durable idempotency key, so
 * reload/retry reports the same economy event and cannot award twice.
 */
export function practiceCompleteEventId(evidenceId: string): string {
  return buildEventId(REASON_PRACTICE_COMPLETE, [evidenceId]);
}

/** `island_founding:{era_id}` — one advance per island, replay-safe. */
export function islandFoundingEventId(eraId: EraId): string {
  return buildEventId(REASON_ISLAND_FOUNDING, [eraId]);
}

/** `civic_bootstrap:{era_id}` — one onboarding top-up per island, replay-safe. */
export function civicBootstrapEventId(eraId: EraId): string {
  return buildEventId(REASON_CIVIC_BOOTSTRAP, [eraId]);
}
