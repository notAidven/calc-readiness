import {
  HARD_WINTER,
  type HardWinterState,
  hardWinterReducer,
  type WinterAction,
  type WinterActionTier,
  winterActionRefusal,
} from "@cr/game";

import { correctNeededFor } from "./WinterGrid";

/**
 * **SKIPPING THE QUESTIONS, NOT THE WINTER — the arithmetic, with no React in it.**
 *
 * The lead asked for *"a button to just like progress through the questions so i can skip past
 * the answering questions in dev"*, because every state worth photographing — frost advanced,
 * buildings damaged, ruins standing, the outcome screen — sits behind five rounds of three real
 * practice questions.
 *
 * ## WHY IT CHOOSES A TIER RATHER THAN JUST ADVANCING
 *
 * A round is graded on how many of three were right, and that score picks an action tier
 * (`HARD_WINTER.tiers`) which decides how far the declared action reaches: a `strong` fire wards
 * a 13-cell diamond, a `weak` one wards one cell, and a `none` tier wards nothing and still lights
 * a real fire in the log. So the states a QA pass needs are not LATER, they are DIFFERENT, and a
 * control that only advanced would hand back one path through the encounter. Naming the tier is
 * what makes all four reachable, which is what makes the frost work, the building-status work and
 * the outcome screen cheap to inspect.
 *
 * ## THE SCORE IS DERIVED FROM THE LADDER, NEVER WRITTEN DOWN
 *
 * {@link correctNeededFor} is the board's own tier badge — `ceil(min_ratio * batch_size)`, the
 * smallest score that reaches a rung — and it is reused here rather than reimplemented, so a
 * retune of `HARD_WINTER.tiers` or of `batch_size` moves this control with it. That it really is
 * the inverse of the engine's `winterTierFor` is asserted rather than assumed
 * (`devSkipTiers.test.ts`), because a control that announced "resolve as 2 of 3" and handed the
 * engine a score that graded `weak` would be worse than no control: it would misreport which
 * state the reviewer is looking at.
 *
 * ## WHAT IT DELIBERATELY DOES NOT SKIP
 *
 * The ROUND still runs. This module sends the engine the same `resolve` event the last answer
 * sends, with the score substituted, so the declared action resolves at the chosen tier, the frost
 * advances on the ordinary `end_round`, damage lands and the round counter moves. Only the three
 * questions are skipped, which is what was asked for.
 *
 * ## AND IT GRANTS NO EVIDENCE, BY CONSTRUCTION RATHER THAN BY CARE
 *
 * Nothing here builds a `LessonSession`, touches `@cr/mastery-service`, or calls
 * `submitAssessmentEvidence` — the imports are the winter engine and one tier helper, and that is
 * the whole surface area. The winter's questions were already unscored (`hardWinterItems.ts` says
 * why, at length), so a skip that recorded fifteen correct answers would be the first thing in
 * this feature to write to mastery. `winterDevSkipGrantsNoEvidence.test.tsx` plays a whole winter
 * through this module and reads the session back, on #325's precedent.
 */

/**
 * Resolve the round in hand as if the batch had scored exactly what `tier` costs.
 *
 * The engine refuses out of phase by returning the SAME STATE OBJECT, so a caller can tell
 * "nothing happened" by identity. That is why there is no phase check here: adding one would be a
 * second, weaker copy of a rule the reducer already enforces.
 */
export function skipRoundAtTier(
  winter: HardWinterState,
  tier: WinterActionTier,
): HardWinterState {
  return hardWinterReducer(winter, {
    type: "resolve",
    correct: correctNeededFor(tier),
    asked: HARD_WINTER.batch_size,
  });
}

/**
 * THE ACTION A RUN-OUT WOULD REPEAT, read off whichever phase the winter is in.
 *
 * A run-out plays the plan in hand rather than one of its own, and where that plan is recorded
 * moves with the phase — which is why this is one expression and not a guess at each call site:
 *
 *  - `declaring`: the surface's own `pending`, the action chosen but not yet committed;
 *  - `answering`: `state.declared`, the locked declaration the batch is riding on;
 *  - `resolved`: `last_resolution.action`, because `applyResolution` clears `declared` and the
 *    resolution is the only remaining record of what the round just did.
 *
 * Null means there is nothing to repeat, which is what disables the run-out rather than making
 * it pick something.
 */
export function declarationToRepeat(
  winter: HardWinterState,
  pending: WinterAction | null,
): WinterAction | null {
  return pending ?? winter.declared ?? winter.last_resolution?.action ?? null;
}

/** What {@link runOutTheWinterAtTier} managed, and why it stopped where it did. */
export interface WinterRunOut {
  readonly winter: HardWinterState;
  /** Rounds this run resolved. Zero means it could not start. */
  readonly rounds: number;
  /**
   * Why the run stopped short of the end of the winter, or null when the winter ended.
   *
   * A run-out repeats ONE declaration, and the engine may refuse the repeat — a pull-back runs
   * out of rings, a reinforced building becomes a ruin. The refusal is handed back rather than
   * worked around, because inventing a fallback action would make this control a small strategy
   * nobody asked for, and a reviewer would then be photographing a board it chose.
   */
  readonly stopped: string | null;
}

/**
 * Play every remaining round at one tier, repeating a single declaration — the press that
 * reaches the outcome screen.
 *
 * `pending` is the surface's uncommitted choice; {@link declarationToRepeat} turns it and the
 * winter's own state into the one action every remaining round declares, so the run plays out the
 * plan in hand rather than one of its own.
 *
 * The loop is bounded by the winter's own length and asserts progress: a step that fails to move
 * the phase stops the run instead of spinning, which is the one way a reducer refusal could turn
 * a dev convenience into a hung tab.
 */
export function runOutTheWinterAtTier(
  winter: HardWinterState,
  tier: WinterActionTier,
  pending: WinterAction | null,
): WinterRunOut {
  const declaration = declarationToRepeat(winter, pending);
  let state = winter;
  let rounds = 0;

  // At most one pass per remaining round, plus one, so the bound is a fact about the encounter
  // rather than a magic number: every pass either ends a round or returns.
  for (let pass = 0; pass <= state.rounds && state.phase !== "ended"; pass += 1) {
    const before = state;

    if (state.phase === "declaring") {
      if (declaration === null) {
        return {
          winter: state,
          rounds,
          stopped: "Choose an action first: a run-out repeats the declaration in hand.",
        };
      }
      const refusal = winterActionRefusal(state, declaration);
      if (refusal !== null) {
        return { winter: state, rounds, stopped: refusal };
      }
      state = hardWinterReducer(state, { type: "declare", action: declaration });
    }

    if (state.phase === "answering") {
      state = skipRoundAtTier(state, tier);
      rounds += 1;
    }

    if (state.phase === "resolved") {
      state = hardWinterReducer(state, { type: "end_round" });
    }

    if (state === before) {
      return {
        winter: state,
        rounds,
        stopped: `The round would not advance out of "${state.phase}".`,
      };
    }
  }

  return {
    winter: state,
    rounds,
    stopped: state.phase === "ended" ? null : "The winter ran out of rounds to play.",
  };
}
