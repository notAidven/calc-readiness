import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import { useMemo, useRef } from "react";

import { AdvisorNpc } from "./AdvisorNpc";
import { lessonByNode } from "./domains";
import {
  type DrillAttemptEvent,
  eraBestStreakKey,
  type InfiniteCorrectEvidence,
  InfiniteDrill,
} from "./InfiniteDrill";
import { createAdaptiveInterleavedScheduler } from "./infiniteScheduler";
import { interleavedPool, type WhenEraCannotMix } from "./interleavedPool";
import { recordStruggleAttempt, struggleLevelOf, struggleTierOf } from "./struggleStore";
import {
  itemWeightsFromStruggle,
  type NodeStruggle,
  readNodeStruggle,
  weightsFromStruggle,
} from "./struggleWeights";

const BACK_LABEL = "Back to lessons";

/**
 * A server-verifiable correct answer paired with the learner's struggle level immediately
 * before that answer. The server still recomputes correctness from the raw answer; the
 * level only selects a payout within the economy-owned floor and ceiling.
 */
export interface InterleavedCorrectEvidence extends InfiniteCorrectEvidence {
  readonly struggleLevel: number;
}

/**
 * Shown when the era has no unlocked skills yet. Interleaving only teaches anything
 * once the learner has more than one skill in play, so an ungated drill would be the
 * learner's FIRST exposure to a concept with no hints and no teaching — the opposite of
 * what this activity is for. Same chrome as the drill so the back button stays put.
 *
 * **The hint names the era only when the era is what ran out.** Under
 * `whenEraCannotMix: "revisit-practiced"` this panel is reached only by a learner who has
 * practised nothing ANYWHERE, so *"in this era"* would point them at the wrong shortfall
 * — the pool already looked past the era and still found nothing.
 */
function EraPracticeLocked({
  backLabel,
  scopedToEra,
  onExit,
}: {
  backLabel: string;
  /** Whether the pool that came up empty was the era's own or the learner's whole set. */
  scopedToEra: boolean;
  onExit: () => void;
}) {
  return (
    <div className="advisor-lesson advisor-lesson--infinite">
      <button
        type="button"
        className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
        onClick={onExit}
      >
        {backLabel}
      </button>

      <AdvisorNpc
        line="This drill mixes skills you have already practiced. Finish a lesson's practice set first, then come back and I will shuffle them together."
        mood="encouraging"
      />

      <p className="advisor-lesson__gate-hint">
        {scopedToEra ? "No completed skills in this era yet." : "No completed skills yet."}{" "}
        Finish a lesson's practice set to unlock interleaved practice.
      </p>
    </div>
  );
}

/**
 * Era-scoped infinite practice: an endless drill that interleaves problems across the
 * era's COMPLETED nodes — the ones whose practice set the learner has finished
 * (`lessonProgress.completedNodeIdsFrom`). Each shuffled cycle visits every unlocked
 * skill once before any repeats. Nothing is scored into mastery; the skill name is
 * revealed only after the learner answers or skips.
 *
 * The era is the chapter a learner plays through, so it is the unit the mix is drawn
 * over. That is not the same set as a domain's: `RAT.5` interleaves with Early Modern
 * rather than with the other `RAT` nodes, and the Atomic Age mixes `LF` and `FUN` nodes
 * from two directories (`docs/Content_Authoring_Split.md` §10.3, and `interleavedPool.ts`
 * for the derivation).
 *
 * **`whenEraCannotMix` is the one thing that can move the population off the era**, and a
 * caller has to ask for it. See `interleavedPool.ts`'s header for the defect it closes and
 * why the era's own pool remains the default here.
 *
 * `skillLabelFor` reads `lessonByNode`, which is aggregated across every registered
 * domain, so it resolves a title for an era whose nodes span several directories without
 * knowing which directory any of them came from.
 */
export function EraInfinitePractice({
  eraId,
  completedNodeIds,
  whenEraCannotMix = "lock",
  backLabel = BACK_LABEL,
  rng = Math.random,
  onCorrectAnswer,
  onCorrectEvidence,
  onExit,
}: {
  eraId: EraId;
  /**
   * The node ids the drill may draw from: the era's completed skills, or `"all"` to
   * ignore the gate. `"all"` is a DEV PREVIEW escape hatch (the `?dev` page) and must
   * never be passed from a learner-facing surface.
   */
  completedNodeIds: readonly string[] | "all";
  /**
   * What to draw when the ERA's own practised skills cannot be interleaved. Defaults to
   * `"lock"`, which is this drill's original and only behaviour.
   *
   * **A host that widens its OFFER must pass the same value here**, or the entry point
   * gates on one pool and the drill opens another — the exact disagreement
   * `interleavedPool.ts` exists to prevent, and the one that lands an enabled button on
   * the locked screen. `CitySurface.interleaved.test.tsx` drives the real panel into the
   * real drill in era two rather than comparing props, because matching props is what a
   * host gets wrong.
   */
  whenEraCannotMix?: WhenEraCannotMix;
  /** Deterministic URL fixtures may inject a seeded draw; learner play keeps `Math.random`. */
  rng?: () => number;
  /** Where the drill's own back button says it returns to. */
  backLabel?: string;
  /**
   * Fired after each correct answer with the running total for this drill session. The
   * drill itself has no notion of a "session cleared" — a host that pays out for
   * interleaved work (the Town Hall) decides what a round is from this count.
   *
   * `struggleLevels[i]` is how hard the learner was finding the skill behind the
   * `(i + 1)`th correct answer, READ BEFORE that answer was folded in. The whole array is
   * handed over rather than an average, because only the host knows how many correct
   * answers make a round, and a mean over the wrong window is the wrong number. Measuring
   * before rather than after matters for the same reason the signal exists: an answer that
   * ends a run of misses should be paid for the state it came out of, not the state it
   * created.
   */
  onCorrectAnswer?: (sessionCorrect: number, struggleLevels: readonly number[]) => void;
  /**
   * Server-verifiable raw answers, paired with the pre-answer struggle reading used by
   * the economy to choose a payout inside its fixed band.
   */
  onCorrectEvidence?: (evidence: InterleavedCorrectEvidence) => void;
  onExit: () => void;
}) {
  // Fail loud on an id that is not in `ERA_SEQUENCE`, matching `eras.ts`'s own
  // discipline: an unknown era must not quietly render as an empty one, because an
  // empty era is also a legitimate state and the two would be indistinguishable.
  const era = useMemo(() => getEraOrThrow(eraId), [eraId]);

  const pool = useMemo(
    () => interleavedPool(era.id, completedNodeIds, whenEraCannotMix),
    [era, completedNodeIds, whenEraCannotMix],
  );

  /**
   * How hard the learner has been finding each skill in the mix, read once when the drill
   * opens. The SCHEDULER is built from this snapshot on purpose: a cycle whose shape
   * changed under the learner mid-session would make "every skill once per cycle" a claim
   * about no particular cycle. The payout reads the live figures below.
   */
  const struggleAtOpen = useMemo(
    () => readNodeStruggle([...new Set(pool.items.map((item) => item.node_id))]),
    [pool],
  );

  // An empty pool would throw inside the scheduler, so the gate is checked before it.
  const scheduler = useMemo(
    () =>
      pool.items.length === 0
        ? null
        : createAdaptiveInterleavedScheduler(
            pool.items,
            weightsFromStruggle(struggleAtOpen),
            rng,
            itemWeightsFromStruggle([...struggleAtOpen.keys()]),
          ),
    [pool, struggleAtOpen, rng],
  );

  /**
   * The live figures, seeded from the snapshot and moved by each attempt. Held on a ref
   * rather than in state because every read of it happens during a render the drill's own
   * phase change has already scheduled, and a second state update per answer would only
   * add a render.
   */
  const liveStruggleRef = useRef<Map<string, NodeStruggle>>(new Map());
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    liveStruggleRef.current = new Map(struggleAtOpen);
  }
  const correctLevelsRef = useRef<number[]>([]);

  function handleAttempt(event: DrillAttemptEvent) {
    const nodeId = event.item.node_id;
    const before = liveStruggleRef.current.get(nodeId)?.level ?? 0;
    if (event.outcome === "correct") {
      correctLevelsRef.current.push(before);
    }
    const record = recordStruggleAttempt({
      nodeId,
      templateId: event.item.template_id,
      difficulty: event.item.difficulty,
      correct: event.outcome === "correct",
      // The drill resolves an item in one submission, so a correct answer here is always
      // the learner's first and only attempt on it.
      firstTry: event.outcome !== "skipped",
      // A skip took the answer without attempting it; a wrong answer attempted it and
      // missed. Both put the solution on screen, and only the first is worth the most
      // struggle a single attempt can record.
      revealed: event.outcome === "skipped",
      hintsUsed: 0,
    });
    const level = struggleLevelOf(record);
    liveStruggleRef.current.set(nodeId, { level, tier: struggleTierOf(level) });
  }

  function handleCorrectAnswer(sessionCorrect: number) {
    onCorrectAnswer?.(sessionCorrect, [...correctLevelsRef.current]);
  }

  function handleCorrectEvidence(evidence: InfiniteCorrectEvidence) {
    const struggleLevel = correctLevelsRef.current[evidence.sessionCorrect - 1];
    if (struggleLevel === undefined) {
      throw new Error("correct answer evidence arrived before its struggle reading");
    }
    onCorrectEvidence?.({ ...evidence, struggleLevel });
  }

  if (!scheduler) {
    return (
      <EraPracticeLocked
        backLabel={backLabel}
        scopedToEra={whenEraCannotMix === "lock"}
        onExit={onExit}
      />
    );
  }

  return (
    <InfiniteDrill
      scheduler={scheduler}
      storageKey={eraBestStreakKey(era.id)}
      backLabel={backLabel}
      skillLabelFor={(item) => lessonByNode[item.node_id]?.title ?? item.node_id}
      onCorrectAnswer={handleCorrectAnswer}
      onAttempt={handleAttempt}
      onCorrectEvidence={handleCorrectEvidence}
      onExit={onExit}
    />
  );
}
