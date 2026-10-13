import { type EraId, getEraOrThrow } from "@cr/skill-graph";

import type { EraPlacement } from "./eraPlacement";

/**
 * THE CATCH-UP WALK — the learner walks each age the diagnostic handed them, in order,
 * choosing at each one, and arrives in the age they were actually placed in.
 *
 * Authority: **§10.14** of
 * `docs/superpowers/specs/2026-08-01-test-out-experience-review.md`, which is the lead's
 * amended shape: the run walks each skipped age in order, shows one founding representation,
 * lets the learner stop, and names the age's skills. Over **§10.9** (the stopping point) and
 * **§10.10** (the build mode).
 *
 * ## TWO ROADS AT EACH AGE, AND THE BUILD MODE IS NOT ONE OF THEM
 *
 * **⚑ THIS REPLACES A THREE-ROAD PROMPT, AND THE THREE-ROAD PROMPT WAS THE DEPARTURE.** The
 * lead, off a running build: *"this UI looks terrible; clean it up. it makes no sense to the
 * user"*, and the first of his observations is that *"the three roads are not three"*. They
 * were not, and the record says why.
 *
 * The three came from **§10.7**, which the review stamps *"SUPERSEDED BY §10.12 AND KEPT
 * UNEDITED … what goes is the three-option list and the per-era card."* What supersedes it is
 * **§10.10**, whose opening line is *"the steer was to make it one, for the reason the lead
 * gave, and it is right"*: the build mode is **one** decision, **age one is hand-placed by
 * D-ERA18 regardless and is not part of it**, and the ruled default for every later age is
 * the city. **§10.19 and §10.25's ruled prompt is two buttons**, `Keep going` and `Stop here
 * and learn this age`, at every one of their four worked examples. So the surface that
 * shipped was reading a section its own document had retired, and this is the ruled shape
 * restored rather than a new design.
 *
 * **What the learner loses is nothing they had, which is the part worth checking.** D-ERA18
 * gives its own reason for putting the hand-placing at age one and nowhere else: *"the agency
 * and the teaching both land the first time; repeating them is repetition rather than
 * learning."* It means the learner still seats a settlement by
 * hand — the first one — and is never asked to re-answer a question whose answer will not
 * change. §10.10 also measures the cost of the shape being replaced: a per-age build toggle
 * is `2^n` coherent states, **16** at four ages and **512** at nine, *"and there is nothing
 * to collapse it with except a decision."*
 *
 * **What is unchanged is the reject.** Stopping still ends the walk (§10.9), so the skipped
 * set is still a prefix and there is still exactly one landing age.
 *
 * ## WHAT "PLACE THE COSMETICS AND ROADS YOURSELF" TURNS OUT TO MEAN, MEASURED
 *
 * The lead's second option says *"place all the buildings / cosmetics / roads yourself"*.
 * Buildings are free — `placeSkill` is an in-app layout write and nothing charges for it —
 * but roads and civic decoration are material-gated, and **§7.2 measured that this learner
 * arrives broke by ruled design**: the earn table pays only a node carrying practice
 * evidence, so a learner who tested out of an age forgoes that age's whole lesson channel.
 * So the option cannot hand over roads and cosmetics, because there is nothing to buy them
 * with, and pretending otherwise would put a disabled shop in front of the one learner the
 * feature exists for. **What it hands over is the buildings**, which is what §10.12's own
 * string promises (*"You place them yourself"*), and the roads stay where INV-COS-1 leaves
 * them: available, gating nothing, and paid for out of ordinary play. **O-TX3 is the open
 * item that owns the earn question and this does not close it.**
 *
 * ## NOTHING HERE READS A CLOCK, GRADES ANYTHING, OR WRITES ANYTHING
 *
 * Given a state and an event this returns the same state twice. The founding representation,
 * auto-layout geometry and city writes all sit outside it.
 */

/** What the learner picked at one age. §10.19 and §10.25's two roads. */
export type CatchUpChoice =
  /**
   * *"reject the pre-seed completely and allow the user to start at that era as if they'd
   * been placed in it."* Ends the walk here: this age becomes the landing age, and **every
   * later skip is forfeited** (§10.9 — *"if they decide to stop in era 3, then its as if
   * they were placed into 3 and dont get to skip 4"*).
   */
  | "stop_here"
  /**
   * §10.19's *"Keep going"*: take the age as the diagnostic placed it and walk on.
   *
   * **Phrased as the walk rather than as an assessment**, which is that section's own note:
   * *"Not 'I know this', which would be a claim, and not 'Skip', which would name what is
   * being given up."*
   */
  | "keep_going";

/**
 * Who seats an accepted age's buildings.
 *
 * **Derived from the age's position and never chosen**, which is D-ERA18 and §10.10's
 * *"one choice … with age one always placed by hand"*. `EraPlacement.skipped` is a prefix of
 * `ERA_SEQUENCE`, so the walk's first age IS era one whenever the walk has anything in it,
 * and {@link catchUpBuildMode} needs no era literal to say so.
 */
export type CatchUpBuildMode = "learner_places" | "city_places";

/** D-ERA18, as a function of where the walk is: the first age by hand, the rest by the city. */
export function catchUpBuildMode(at: number): CatchUpBuildMode {
  return at === 0 ? "learner_places" : "city_places";
}

/**
 * Where the walk is. Five phases, as a closed union so a new phase is a compile error until
 * every renderer decides how to draw it.
 */
export type CatchUpPhase =
  /** The stop-or-continue prompt for the age in hand (§10.25's strings). */
  | "choosing"
  /** The learner is seating this age's buildings by hand. */
  | "placing"
  /** The one-step Town Hall founding representation for this diagnostic-cleared age. */
  | "founding"
  /** The walk finished every handed age and ordinary play begins in `placedEra`. */
  | "arrived"
  /** The learner stopped. `stoppedAt` is the landing age. */
  | "stopped";

export interface CatchUpState {
  /**
   * The ages to walk, in play order — `EraPlacement.skipped`, held so the walk cannot
   * disagree with the placement it came from. **A prefix of `ERA_SEQUENCE`** (§10.9).
   */
  readonly plan: readonly EraId[];
  /** Where ordinary play begins if the learner never stops. `EraPlacement.placedEra`. */
  readonly placedEra: EraId;
  /** Position in {@link plan}; equals its length once every age is founded. */
  readonly at: number;
  readonly phase: CatchUpPhase;
  /** The choice standing for the age in hand, or `null` while it is still being asked. */
  readonly mode: CatchUpBuildMode | null;
  /** The ages whose founding representation has run, in order. */
  readonly founded: readonly EraId[];
  /** The age the learner stopped in, or `null`. Set once and never cleared. */
  readonly stoppedAt: EraId | null;
}

/**
 * Open the walk on a completed placement.
 *
 * **A learner the diagnostic handed nothing opens `arrived`**, which is the ordinary case
 * at today's D1-only scope and is not a degenerate one: there is no age to walk, so the
 * walk is over before it starts and the surface renders nothing. Handling it here rather
 * than at the mount is what keeps the caller from needing a second predicate.
 */
export function startCatchUp(placement: EraPlacement): CatchUpState {
  return {
    plan: placement.skipped,
    placedEra: placement.placedEra,
    at: 0,
    phase: placement.skipped.length === 0 ? "arrived" : "choosing",
    mode: null,
    founded: [],
    stoppedAt: null,
  };
}

/**
 * Open the walk part-way through, as if the ages before `at` had already been founded.
 *
 * **The dev affordance's seam** (`CatchUpDevSkip.tsx`), and the reason it is here rather
 * than in the control: a dev jump that built its own state object could drift from the one
 * the reducer produces, and then the state a reviewer photographs is not the state a
 * learner reaches. This walks the reducer's own transitions, so it cannot.
 */
export function startCatchUpAt(placement: EraPlacement, at: number): CatchUpState {
  const target = Math.min(Math.max(0, Math.trunc(at)), placement.skipped.length);
  let state = startCatchUp(placement);
  for (let index = 0; index < target; index += 1) {
    state = catchUpReducer(state, { type: "choose", choice: "keep_going" });
    // Age one lands in `placing` by D-ERA18, so a jump past it has to walk that transition
    // too. Sending `placed` unconditionally is safe rather than lazy: the reducer ignores an
    // event that does not belong to the phase in hand.
    state = catchUpReducer(state, { type: "placed" });
    state = catchUpReducer(state, { type: "founded" });
  }
  return state;
}

export type CatchUpEvent =
  | { readonly type: "choose"; readonly choice: CatchUpChoice }
  /** This age's buildings are seated. Only meaningful while hand-placing. */
  | { readonly type: "placed" }
  /** This age's founding representation finished. */
  | { readonly type: "founded" };

/** The age the walk is asking about or working on, or `null` once it is over. */
export function catchUpEra(state: CatchUpState): EraId | null {
  return state.plan[state.at] ?? null;
}

/**
 * The age ordinary play begins in: where they stopped, or the age they were placed in.
 *
 * **This is the whole of the reject's progression consequence**, and it is one expression
 * rather than a second notion of era state, because `useCityEra` already owns which age the
 * city is wearing and a second opinion about it is the defect §10 warns of.
 */
export function landingEra(state: CatchUpState): EraId {
  return state.stoppedAt ?? state.placedEra;
}

/**
 * The ages a stop at the current prompt would forfeit — §10.9's *"dont get to skip 4"*.
 *
 * Empty at the last handed age, which is why §10.25 puts the forfeit line behind a
 * non-empty check: a learner at the end of the walk has nothing left to give up and must
 * not be shown a sentence saying they do.
 */
export function forfeitedEras(state: CatchUpState): readonly EraId[] {
  return state.plan.slice(state.at + 1);
}

/** Whether the walk has finished, either by arriving or by stopping. */
export function isCatchUpDone(state: CatchUpState): boolean {
  return state.phase === "arrived" || state.phase === "stopped";
}

/** `Age N of M`, 1-based, for §10.25's ordinal. `null` once the walk is over. */
export function catchUpPosition(
  state: CatchUpState,
): { readonly position: number; readonly total: number } | null {
  return state.at >= state.plan.length
    ? null
    : { position: state.at + 1, total: state.plan.length };
}

/**
 * Advance the walk. Deterministic; time is never an input.
 *
 * An event that does not belong to the phase in hand returns the state unchanged rather
 * than throwing: the surface does not offer the action,
 * so an event arriving anyway is a bug, and acting on it would hide the bug behind a walk
 * that ran slightly fast.
 */
export function catchUpReducer(state: CatchUpState, event: CatchUpEvent): CatchUpState {
  switch (event.type) {
    case "choose": {
      if (state.phase !== "choosing") {
        return state;
      }
      const era = catchUpEra(state);
      if (era === null) {
        return state;
      }
      if (event.choice === "stop_here") {
        // §10.9's prefix property, in one assignment: the walk ends, so every age after
        // this one is played rather than handed over. There is deliberately no
        // representation of "skipped again later" for anything to get wrong.
        return { ...state, phase: "stopped", mode: null, stoppedAt: era };
      }
      // D-ERA18 decides who seats it, off the position rather than off the press. The
      // learner's placement stops for them first; the city's needs no learner action, so
      // it goes straight to the beats.
      const mode = catchUpBuildMode(state.at);
      return mode === "learner_places"
        ? { ...state, phase: "placing", mode }
        : { ...state, phase: "founding", mode };
    }

    case "placed": {
      return state.phase === "placing" ? { ...state, phase: "founding" } : state;
    }

    case "founded": {
      if (state.phase !== "founding") {
        return state;
      }
      const era = catchUpEra(state);
      if (era === null) {
        return state;
      }
      const at = state.at + 1;
      return {
        ...state,
        at,
        phase: at >= state.plan.length ? "arrived" : "choosing",
        mode: null,
        founded: [...state.founded, era],
      };
    }

    default:
      return state;
  }
}

/**
 * The node ids this age hands over — every node of the age, because an age only reaches
 * the walk when the whole conjunction fired (`eraPlacement.ts`).
 *
 * Read off the era rather than off the placement, so a node the era gained after the
 * placement was written is still seated rather than silently missing a building.
 */
export function eraRosterNodeIds(eraId: EraId): readonly string[] {
  return getEraOrThrow(eraId).nodes;
}
