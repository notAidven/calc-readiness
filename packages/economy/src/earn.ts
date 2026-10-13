import { type EraId, getEraOfNode } from "@cr/skill-graph";

import {
  DRILL_PAID_SETS_PER_ERA,
  EARN,
  LESSON_GRANT_MASTERY_BAR,
  REASON_CIVIC_BOOTSTRAP,
  REASON_INTERLEAVED,
  REASON_ISLAND_FOUNDING,
  REASON_LESSON_COMPLETE,
} from "./constants";
import {
  civicBootstrapEventId,
  interleavedEventId,
  islandFoundingEventId,
  lessonCompleteEventId,
  practiceCompleteEventId,
} from "./events";
import type { GrantInput } from "./grant";
import { countInterleavedGrants } from "./ledger";
import {
  civicBootstrapMaterialAmount,
  eraScaledPrice,
  islandFoundingMaterialAmount,
  lessonMaterialAmountAfterFounding,
  materialForEra,
} from "./materials";
import type { LedgerView } from "./types";

/**
 * The two earn RECIPES (resource spec §6). Each turns a server-verified progression
 * event into a {@link GrantInput} for {@link applyGrant}, reading its magnitudes from
 * the one §12 constants table:
 *
 *   lessonComplete → MATERIAL   (activity: completing a lesson)
 *   interleaved    → MATERIAL   (activity: clearing an interleaved session)
 *
 * ## THERE WERE THREE, AND THE D-R3 ASYMMETRY IS WHAT THE THIRD WAS
 *
 * `starGrant` was row 3, and it paid `{ xp: EARN.star.xp }` and DELIBERATELY no
 * currency: activities paid money, depth paid XP, and that asymmetry was the reason XP
 * survived the gold-drop. XP is sunset (team lead, 2026-08-03), so row 3's entire payout
 * is gone and the recipe would return an empty `amounts` — a grant that writes no row,
 * behind an event id, fired once per star per city load. It is deleted rather than kept
 * as a paid-nothing call, and `starEventId` / `REASON_STAR` / `reportStar` go with it.
 *
 * What that costs, said plainly: a 2nd or 3rd star on an already-complete building now
 * credits nothing. The star still appears over the building — that is a mastery visual,
 * not an economy row.
 *
 * The client never invents these amounts; it reports the event and the economy
 * grants (INV-COS-4).
 */

/**
 * Row 1 — a node's lesson/building was completed. The era MATERIAL, one-time,
 * uncapped. **Gold is retired, and the material is the only currency.**
 *
 * THE MATERIAL rides on this SAME recipe rather than on a second trigger, which is
 * what makes it inherit the `#102` retiming: this grant fires on practice evidence
 * rather than on the test-out seam, so a learner who tests out of six nodes is not
 * handed six payouts for work never done. ONE row under one `event_id`, where it was
 * three while gold existed and two while XP did.
 *
 * THE AMOUNT IS NORMALISED BY THE ERA'S SIZE, which is the ruling this implements:
 * `lessonMaterialAmount` is `ERA_MATERIAL_TOTAL × multiplier ÷ node count`, so a
 * five-node era pays more per lesson than a nine-node one and both eras grant the same
 * total. It used to be a flat `100x` for everyone, which made an era's supply depend on
 * how many lessons it happened to have — the structural cause of the four insolvent
 * eras this change fixes.
 *
 * The material is resolved from the NODE's era, so it is data and not a parameter, and
 * an era whose material nobody has authored credits nothing at all rather than
 * crediting some other era's.
 */
export function lessonCompleteGrant(input: {
  studentId: string;
  nodeId: string;
  nowMs: number;
}): GrantInput {
  const era = getEraOfNode(input.nodeId);
  const material = era === undefined ? null : materialForEra(era.id);
  const payout =
    era === undefined || material === null
      ? null
      : { [material.id]: lessonMaterialAmountAfterFounding(input.nodeId) };
  return {
    studentId: input.studentId,
    eventId: lessonCompleteEventId(input.nodeId),
    reasonCode: REASON_LESSON_COMPLETE,
    amounts: payout ?? {},
    nowMs: input.nowMs,
    capped: false,
  };
}

/**
 * Found a later era's island with one lesson's material, exactly once. The deterministic event
 * id is the idempotency boundary; era one returns an empty grant because it keeps its established
 * zero-material opening.
 */
export function islandFoundingGrant(input: {
  studentId: string;
  eraId: EraId;
  nowMs: number;
}): GrantInput {
  const material = materialForEra(input.eraId);
  const amount = islandFoundingMaterialAmount(input.eraId);
  return {
    studentId: input.studentId,
    eventId: islandFoundingEventId(input.eraId),
    reasonCode: REASON_ISLAND_FOUNDING,
    amounts: material === null || amount === 0 ? {} : { [material.id]: amount },
    nowMs: input.nowMs,
    capped: false,
  };
}

/**
 * The onboarding civic-bootstrap top-up (product call, not a §6 income recipe): once
 * per island, before the tour's civic-buildings step, so the learner can place the
 * building the tour just told them about rather than being shown a purchase they
 * cannot yet afford. Sized to the era's single most expensive catalogue entry —
 * enough for ANY of that era's civic buildings, not just the cheapest — via the same
 * deterministic-event-id replay guard every other grant here uses, so a retry or a
 * second tour pass can never double-credit it.
 */
export function civicBootstrapGrant(input: {
  studentId: string;
  eraId: EraId;
  nowMs: number;
}): GrantInput {
  const material = materialForEra(input.eraId);
  const amount = civicBootstrapMaterialAmount(input.eraId);
  return {
    studentId: input.studentId,
    eventId: civicBootstrapEventId(input.eraId),
    reasonCode: REASON_CIVIC_BOOTSTRAP,
    amounts: material === null || amount === 0 ? {} : { [material.id]: amount },
    nowMs: input.nowMs,
    capped: false,
  };
}

/**
 * Row 2 — an interleaved practice session was cleared. The CURRENT era's material,
 * REPEATABLE and CAPPED (D-R6).
 *
 * **PRACTICE PAYS THE CURRENCY NOW**, per the ruling: *"lesson completion/practice
 * should give the resource, not gold."* It used to pay 10 gold, whose only sinks were
 * cosmetics and roads; it pays 10 (era-one scale) of the material that also buys civic
 * buildings. So {@link CAP} moved from bounding decoration to bounding progression —
 * flagged there, because a per-24h ceiling cannot bound a per-era budget.
 *
 * IT TAKES THE ERA AS A PARAMETER, unlike row 1, and the asymmetry is real rather than
 * an oversight. A lesson belongs to exactly one era, so row 1 resolves its material
 * from the node. An interleaved set is *"composed by the server across all completed
 * skills"* and therefore spans eras, so there is no node to resolve from — it pays in
 * the era the player is IN, which only the caller knows.
 *
 * A FLAT PAYOUT SINCE THE CONDITION CLOCK WAS SUNSET. This recipe used to take a
 * `condition` argument and pay `base + round(repairMax * repairScale(condition))`, so a
 * returning player's first session paid up to 36 where a regular player's paid 10. That
 * was the economy's last reading of wall-clock time and it is gone: nothing here can
 * distinguish a player who practised yesterday from one who practised in March, which
 * is INV-ERA-3's stance made structural rather than intended.
 *
 * An era with no authored material credits nothing at all, rather than crediting another
 * era's — the same fail-safe row 1 takes.
 *
 * **IT TAKES `priorPaidSets` AND THE ARGUMENT IS REQUIRED**, which is the drill bound
 * ({@link DRILL_PAID_SETS_PER_ERA}) arriving. Past the bound the material key is omitted,
 * and since the XP sunset there is nothing left beside it — so a set past the allowance
 * writes no row at all and `applyGrant` reports it unapplied. A learner who has spent the
 * era's drill allowance keeps practising and keeps their streak; they stop minting
 * currency. `useEconomy` reads `setsRemaining` to tell that apart from a double-reported
 * set, which are the two ways a cleared set can pay nothing and want opposite copy.
 *
 * The count is a parameter rather than a ledger read because this file is a table of
 * pure recipes and the ledger belongs to the adapter; `countInterleavedGrants` is the
 * one derivation that answers it. Required rather than defaulted so no call site can
 * silently opt out of the bound — the same discipline `EraInfinitePractice` applies to
 * its completion gate.
 */
export function interleavedGrant(input: {
  studentId: string;
  sessionId: string;
  currentEra: EraId;
  nowMs: number;
  /**
   * Drill sets ALREADY PAID in this era's material, from
   * `countInterleavedGrants(view, material)`. Zero on a fresh era.
   */
  priorPaidSets: number;
  /**
   * How hard the learner is finding the skills this round mixed, in `[0, 1]`, or `null`
   * when the caller has no reading. See {@link interleavedPayout}.
   *
   * **A NUMBER, WHICH IS THE WHOLE OF WHY INV-COS-1 IS UNDISTURBED.** The economy does not
   * import the store that derives it, does not know what a node is, and cannot tell which
   * skills were involved. Progression state stays upstream and this package stays a
   * receiver, exactly as it is for `priorPaidSets`.
   */
  struggleLevel: number | null;
}): GrantInput {
  const material = materialForEra(input.currentEra);
  const withinBound = input.priorPaidSets < DRILL_PAID_SETS_PER_ERA;
  const payout =
    material === null || !withinBound
      ? null
      : {
          [material.id]: eraScaledPrice(
            interleavedPayout(input.struggleLevel),
            input.currentEra,
          ),
        };
  return {
    studentId: input.studentId,
    eventId: interleavedEventId(input.sessionId),
    reasonCode: REASON_INTERLEAVED,
    amounts: payout ?? {},
    nowMs: input.nowMs,
    capped: true,
  };
}

/** Whether the node's one-time skill-completion material has already reached the ledger. */
export function hasLessonCompletionGrant(view: LedgerView, nodeId: string): boolean {
  const legacyEventId = lessonCompleteEventId(nodeId);
  const practiceReason = `${REASON_LESSON_COMPLETE}:${nodeId}`;
  return view.entries.some(
    (entry) =>
      entry.event_id === legacyEventId ||
      (entry.kind === "grant" && entry.reason_code === practiceReason),
  );
}

export type PracticeSetRewardKind = "skill_completion" | "repeat_practice";

export interface PracticeSetGrant {
  readonly rewardKind: PracticeSetRewardKind;
  readonly rewardEra: EraId;
  /**
   * Receipt observers use the skill event on the first qualifying set so material, city
   * vitality and mastery coalesce. Repeat sets group on their own transaction.
   */
  readonly groupKey: string;
  readonly grant: GrantInput;
}

/**
 * Select exactly one canonical economy transaction for one scored lesson-practice set.
 *
 * The first qualifying set still carries row 1's larger, uncapped skill-completion amount;
 * removing it would erase the finite lesson income the civic economy is tuned against.
 * Every later genuine set carries row 2's bounded repeat-practice amount. A below-bar first
 * set also receives the repeat amount rather than silently paying zero: completing the set is
 * real work even when the building has not crossed its competence gate.
 *
 * Both branches are keyed by the SAME mastery-evidence id. That detail is load-bearing:
 * after the first call records skill completion, replaying it would otherwise re-select the
 * repeat branch and double-award the same set. One transaction id absorbs that state change.
 *
 * The material follows the PRACTISED NODE's era, not the island currently on screen. Ordinary
 * lesson entry makes those the same. Presenter intentionally does not: its bottom-bar LF.1
 * content stays Atomic while navigation returns to an Era 2 city, so an LF.1 set credits
 * Electricity and cannot mutate or mint Grain for an unrelated visible skill.
 */
export function practiceSetGrant(
  view: LedgerView,
  input: {
    readonly studentId: string;
    readonly evidenceId: string;
    readonly nodeId: string;
    readonly mastery: number;
    readonly nowMs: number;
    readonly struggleLevel: number | null;
  },
): PracticeSetGrant {
  const transactionId = practiceCompleteEventId(input.evidenceId);
  const skillGroupKey = lessonCompleteEventId(input.nodeId);
  const skillEra = getEraOfNode(input.nodeId);
  if (skillEra === undefined) {
    throw new Error(`economy: practice node "${input.nodeId}" belongs to no era.`);
  }
  const skillReason = `${REASON_LESSON_COMPLETE}:${input.nodeId}`;
  const recordedTransaction = view.entries.find(
    (entry) => entry.event_id === transactionId,
  );
  if (
    recordedTransaction?.reason_code === skillReason ||
    (recordedTransaction === undefined &&
      input.mastery >= LESSON_GRANT_MASTERY_BAR &&
      !hasLessonCompletionGrant(view, input.nodeId))
  ) {
    const first = lessonCompleteGrant(input);
    return {
      rewardKind: "skill_completion",
      rewardEra: skillEra.id,
      groupKey: skillGroupKey,
      grant: {
        ...first,
        eventId: transactionId,
        reasonCode: skillReason,
      },
    };
  }

  const material = materialForEra(skillEra.id);
  const priorPaidSets = material === null ? 0 : countInterleavedGrants(view, material.id);
  const repeat = interleavedGrant({
    studentId: input.studentId,
    sessionId: input.evidenceId,
    currentEra: skillEra.id,
    nowMs: input.nowMs,
    priorPaidSets,
    struggleLevel: input.struggleLevel,
  });
  return {
    rewardKind: "repeat_practice",
    rewardEra: skillEra.id,
    groupKey: transactionId,
    grant: { ...repeat, eventId: transactionId },
  };
}

/**
 * **WHAT ONE CLEARED DRILL SET IS WORTH, at era-one scale, given how hard the learner is
 * finding the skills it mixed.**
 *
 * `EARN.interleaved.materialFloor` at a level of 0 up to `EARN.interleaved.material` at 1,
 * straight-line between. The two ends are the ruling: more for skills the learner
 * struggles with, less once they have shown they have a skill in hand.
 *
 * **`null` PAYS THE CEILING.** It means the caller has no reading, not that the learner has
 * mastered everything, and those must not resolve to the same amount. Every caller that
 * predates this argument therefore pays exactly what it paid before, which is why the
 * solvency and drill-bound measurements are unmoved: they are all measurements of the
 * un-tapered rate, and the un-tapered rate is still 20.
 *
 * **IT READS NO CLOCK, and cannot grow one.** The level is a scalar the caller derives from
 * a bounded ring of RECENT ATTEMPTS, where "recent" is a position in that ring; nothing
 * upstream stores an instant, which is the property `clockless.test.ts` is protecting. A
 * level derived from elapsed time would put a wall clock back in the payout by the back
 * door, and this is where that would have to be refused.
 */
export function interleavedPayout(struggleLevel: number | null): number {
  const ceiling = EARN.interleaved.material;
  if (struggleLevel === null || !Number.isFinite(struggleLevel)) {
    return ceiling;
  }
  const floor = EARN.interleaved.materialFloor;
  const level = Math.min(1, Math.max(0, struggleLevel));
  return Math.round(floor + (ceiling - floor) * level);
}

/**
 * How many more drill sets this era will pay material for. Never negative.
 *
 * Exposed so the UI can say the number BEFORE the learner reaches it: an announced
 * bound is a design constraint the lead named explicitly ("a taper is not visible to the
 * player"), and a ceiling a learner only discovers by hitting it is the same failure in
 * a different shape.
 */
export function drillSetsRemaining(priorPaidSets: number): number {
  return Math.max(0, DRILL_PAID_SETS_PER_ERA - priorPaidSets);
}
