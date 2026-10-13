import type { EraId } from "@cr/skill-graph";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { IslandFoundingAuthority } from "../city/islandUnlockAuthority";
import { liveBuildableRadius } from "../city/liveIsland";
import type { PlacedTransform } from "../city/worldLayout";
import { CatchUpFounding } from "./CatchUpFounding";
import { CatchUpPlacing } from "./CatchUpPlacing";
import {
  arrivedHeadline,
  stoppedHeadline,
  stoppedStanding,
  waitingLine,
} from "./catchUpStrings";
import {
  type CatchUpChoice,
  type CatchUpState,
  catchUpBuildMode,
  catchUpEra,
  catchUpPosition,
  catchUpReducer,
  eraRosterNodeIds,
  forfeitedEras,
  landingEra,
  startCatchUp,
  startCatchUpAt,
} from "./catchUpWalk";
import { CatchUpStopped, EraCatchUpPrompt } from "./EraCatchUpPrompt";
import type { EraPlacement } from "./eraPlacement";
import { ringLayout } from "./ringLayout";

import "./catchUp.css";

/**
 * THE CATCH-UP, MOUNTED — the walk, the three roads, the founding, and the landing.
 *
 * The composition root for `apps/web/src/catchup/`. Everything it decides is decided in
 * `catchUpWalk.ts`; everything it draws is drawn by the three surfaces beside it. What is left
 * here is the wiring, and the wiring is the part with the interesting failure modes:
 *
 *  - **The auto-layout writes through the host's own `onPlaceSkill`**, which is the same
 *    session write the learner's own placement uses. So a city the game laid out and a city
 *    the learner laid out are the same kind of object, and a building the layout produced can
 *    be moved afterwards exactly as D-TH9 promises. A layout that wrote placements directly
 *    would be a second placement path with its own bugs.
 *  - **It reports the city upward and never dresses it**, on `EraAdvanceCeremony`'s seam and
 *    for its stated reason. The host advances the era when a founding finishes.
 *  - **The inherited civic buildings are seeded age by age, at the beat that opens the land
 *    for them**, through the same host-write shape the auto-layout uses (`civicSeats.ts` lays
 *    them out, `onSeedCivics` writes them). Seeding them all at the diagnostic's hand-off
 *    instead put them on era one's disc, where a four-age city seated 1 of 24.
 *  - **Landing is one call at the end**, not a write per age. §10.9's prefix property is what
 *    makes that possible: there is exactly one landing age at every value of the walk, so the
 *    host is told once, which is one fewer thing to get wrong than n era writes.
 *  - **Every accepted age uses the same one-step founding representation.**
 *
 * ## WHAT THIS DOES NOT TOUCH, AND IT IS THE WHOLE OF THE CONTRACT
 *
 * **Mastery, placement and completion.** `seedFromPlacement` already handed the ages'
 * buildings over at `mastery: 0` by ratified rule (`docs/Contracts.md` §1.1), and nothing here
 * changes that: the catch-up decides WHERE those buildings stand and WHICH age the learner
 * lands in, and both are layout and progression rather than evidence. So INV-DIAG-1 is
 * untouched, the one-mastery-writer rule is untouched, and a learner who walks the whole
 * catch-up holds exactly the mastery they held when the diagnostic finished, which is none.
 *
 * **The reject is the one road that changes progression state**, and it changes exactly one
 * thing: the age the city stands in. It does not un-hand a building, because the buildings
 * were handed over by the placement rather than by the walk, and `placement_estimate` is
 * write-once at onboarding (`aurora-placement-writer.ts`: *"immutable thereafter, so this
 * inserts with `on conflict do nothing`"*). **A learner who stops in age three still owns age
 * one's and age two's buildings and still owes the practice on every one of them**, which is
 * §8.2's settled progression model rather than a compromise: test-out skips the lesson only.
 */

export interface CityCatchUpProps {
  /** What the pretest said. `eraPlacement.ts` reads it; this walks it. */
  readonly placement: EraPlacement;
  /** Everything already on the grid, so the auto-layout adds rather than overwrites. */
  readonly occupants: readonly PlacedTransform[];
  /** Which nodes already have a building standing, so hand-placing knows when it is done. */
  readonly placedNodeIds: ReadonlySet<string>;
  /** The host's own session write, the same one the learner's placement uses. */
  readonly onPlaceSkill: (
    nodeId: string,
    transform: PlacedTransform,
  ) => void | Promise<void>;
  /** Found a diagnostic-cleared island without changing the standing island. */
  readonly onUnlockIsland?: (
    eraId: EraId,
    authority?: IslandFoundingAuthority,
  ) => void | Promise<void>;
  /**
   * The age the city should stand in, reported once when the walk ends. The host owns the era
   * store, so this is a report and not a write.
   */
  readonly onLanded: (eraId: EraId) => void;
  /**
   * **BUILDINGS THE AUTO-LAYOUT HAD NOWHERE TO PUT**, reported so the shortfall is said rather
   * than silently absent.
   *
   * Measured on the bounded standing disc: rosters of one, two and three handed ages seat in
   * full, while a sufficiently deep placement can still leave buildings waiting for room.
   *
   * **It still fires, at the top of the run.** The standing island has a bounded disc: one
   * to eight handed ages now seat in full (6, 11, 16, 21, 26, 32, 38, 47) and nine seats 50 of
   * 53. Raising the ceiling is the road lane's depth-budget work, and until it lands this is
   * what says so to the learner.
   *
   * A learner is not stuck: a handed-over building is `complete` from the placement, so its
   * card stays in the build menu and they can seat it themselves whenever they like. What they
   * must not get is a city quietly missing three buildings with nothing saying so, which is
   * what this callback exists to prevent.
   */
  readonly onShortfall?: (eraId: EraId, unseated: readonly string[]) => void;
  /** The walk is over and the surface should come down. */
  readonly onClose: () => void;
  /** Dev seam: open part-way through, so a reviewer can reach any age's prompt. */
  readonly startAt?: number;
  /**
   * **Test seam: how many buildings to report as waiting for room**, so a frame can photograph
   * the notice without walking to the age where the island runs out.
   *
   * It is here for the same reason {@link foundingElapsedOverride} and
   * {@link disclosureOpen} are, and the cost of NOT having it was measured: the shortfall first
   * arises at the fourth handed age, reaching it takes three real foundings at the shipped 45 to
   * 60 seconds each, and a browser test that walked there **timed out at 300 seconds**.
   *
   * It overrides only the COUNT. The sentence, its placement and every surface it appears on are
   * the shipped ones, and `catchUpSaysWhenItCannotSeat.test.tsx` is where the count itself is
   * measured, from the real layout at the real radius with no seam in the path.
   */
  readonly waitingOverride?: number;
  /** Test seam: open the stop prompt's disclosure without a click. */
  readonly disclosureOpen?: boolean;
}

export function CityCatchUp({
  placement,
  occupants,
  placedNodeIds,
  onPlaceSkill,
  onUnlockIsland,
  onLanded,
  onShortfall,
  onClose,
  startAt,
  waitingOverride,
  disclosureOpen,
}: CityCatchUpProps): ReactElement | null {
  const [state, dispatch] = useReducer(
    catchUpReducer,
    undefined,
    (): CatchUpState =>
      startAt === undefined ? startCatchUp(placement) : startCatchUpAt(placement, startAt),
  );

  const era = catchUpEra(state);
  const position = catchUpPosition(state);
  /** So the landing is reported exactly once however many times this re-renders. */
  const landed = useRef(false);
  const landingInFlight = useRef<Promise<void> | null>(null);
  const foundingTail = useRef<Promise<void>>(Promise.resolve());
  const foundedByAuthority = useRef(new Set<EraId>());
  const [foundingError, setFoundingError] = useState<string | null>(null);
  const [foundingRetry, setFoundingRetry] = useState(0);
  /**
   * **HOW MANY BUILDINGS THE ISLAND HAD NO ROOM FOR SO FAR, so the walk can SAY it.**
   *
   * The lead reported the auto-layout road as a dead button, and it was not: measured, one press
   * per age seats 6, 5, 5, 2, 1, 0 buildings over a six-age placement, because the buildable disc
   * stays at era one's 88 cells while the drawn land grows. **What was missing was the sentence.**
   * The shortfall went out through `onShortfall`, which the host announces in a `visually-hidden`
   * `aria-live` region — correct for a screen reader and invisible to everybody else, so a sighted
   * learner pressed the button, watched nothing appear, and was told nothing.
   *
   * It ACCUMULATES rather than reporting the last age's figure, and it is never cleared while the
   * walk runs. Two reasons: the number a learner needs is how many buildings are waiting for them
   * in total, not how many the age they are leaving could not fit; and a per-age note would vanish
   * with the age that produced it, which for a 45-second founding means a learner who looked away
   * never sees it.
   */
  const [waitingCount, setWaitingCount] = useState(0);
  const waiting = waitingLine(waitingOverride ?? waitingCount);

  /**
   * *"HAVE THE GAME DO IT FOR ME"*, applied.
   *
   * ## ⚑ THE AGE'S OWN DISC, WHICH USED TO BE ERA ONE'S
   *
   * This call site read `SHIPPED_PLACEMENT_RADIUS` — `worldLayout`'s module constant, 22 — and
   * the reason was `ringLayout.ts`'s: `placeSkill` gated on `isCellBuildable`'s 22, so a
   * transform beyond it would be silently refused and the learner would watch buildings not
   * appear. Measured through this component: four handed ages seated **18 of 21**.
   *
   * The layout and the session must read the same disc, because a wider layout would offer
   * seats the write refuses. Reading `liveBuildableRadius()` directly from the session's own
   * authority makes that agreement structural.
   */
  const autoPlace = useCallback(
    (eraId: EraId): void => {
      const roster = eraRosterNodeIds(eraId).filter((nodeId) => !placedNodeIds.has(nodeId));
      const result = ringLayout({
        nodeIds: roster,
        reserved: occupants,
        buildableRadius: liveBuildableRadius(),
      });
      // FIRED IN ONE TURN RATHER THAN AWAITED ONE AT A TIME, and the reason is a correctness
      // one rather than a speed one. `ringLayout` computed every seat against a single
      // snapshot of the occupancy, so the seats do not overlap by construction and no write
      // needs to see the one before it; and `citySession` serialises layout writes anyway
      // (`serializeLayoutWrite`), so the ordering is the session's rather than this loop's.
      // Awaiting each in turn would additionally leave the city half-founded across a
      // microtask boundary, which is a state the founding could render.
      for (const seat of result.placed) {
        void onPlaceSkill(seat.nodeId, seat);
      }
      if (result.unseated.length > 0) {
        // BOTH CHANNELS. The host's announcement is what a screen reader gets, and the count
        // below is what everybody else gets; neither is a substitute for the other, which is
        // exactly the mistake this is fixing.
        setWaitingCount((count) => count + result.unseated.length);
        onShortfall?.(eraId, result.unseated);
      }
    },
    [occupants, placedNodeIds, onPlaceSkill, onShortfall],
  );

  const ensureDiagnosticFounding = useCallback(
    (eras: readonly EraId[]): Promise<void> => {
      if (onUnlockIsland === undefined) {
        return Promise.resolve();
      }
      const prior = foundingTail.current.catch(() => undefined);
      const next = prior.then(async () => {
        for (const eraId of eras) {
          if (foundedByAuthority.current.has(eraId)) {
            continue;
          }
          await onUnlockIsland(eraId, { source: "diagnostic" });
          foundedByAuthority.current.add(eraId);
        }
      });
      foundingTail.current = next;
      return next;
    },
    [onUnlockIsland],
  );

  // Recover the whole inclusive prefix early, but always observe rejection. The app's primary
  // completion path commits it atomically; this replay is the refresh/back-compat safety net.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `foundingRetry` is the explicit retry trigger.
  useEffect(() => {
    let active = true;
    void ensureDiagnosticFounding(placement.unlocked).catch((error: unknown) => {
      if (active) {
        setFoundingError(
          error instanceof Error
            ? error.message
            : "The diagnostic islands could not be founded.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [ensureDiagnosticFounding, foundingRetry, placement.unlocked]);

  const choose = useCallback(
    (choice: CatchUpChoice): void => {
      // D-ERA18 decides who seats it, and the reducer applies the same rule to the same
      // position — `catchUpBuildMode` is called in both places rather than the mode being
      // threaded, so a city that laid out an age the reducer thinks the learner is placing
      // is not a state this composition can reach.
      if (
        choice === "keep_going" &&
        era !== null &&
        catchUpBuildMode(state.at) === "city_places"
      ) {
        autoPlace(era);
      }
      dispatch({ type: "choose", choice });
    },
    [autoPlace, era, state.at],
  );

  // THE LANDING, reported once at the end of the walk. The host owns the era store, so this
  // is where the reject's progression consequence actually lands — and it is one call rather
  // than one per age, because §10.9's prefix property means there is exactly one landing age.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `foundingRetry` is the explicit retry trigger.
  useEffect(() => {
    if (
      (state.phase !== "arrived" && state.phase !== "stopped") ||
      landed.current ||
      landingInFlight.current !== null
    ) {
      return;
    }
    const destination = landingEra(state);
    const operation = ensureDiagnosticFounding(placement.unlocked);
    landingInFlight.current = operation;
    let active = true;
    void operation
      .then(
        () => {
          if (active && !landed.current) {
            landed.current = true;
            setFoundingError(null);
            onLanded(destination);
          }
        },
        (error: unknown) => {
          if (active) {
            setFoundingError(
              error instanceof Error
                ? error.message
                : "The diagnostic islands could not be founded.",
            );
          }
        },
      )
      .finally(() => {
        if (landingInFlight.current === operation) {
          landingInFlight.current = null;
        }
      });
    return () => {
      active = false;
    };
  }, [ensureDiagnosticFounding, foundingRetry, onLanded, placement.unlocked, state]);

  const foundingRetryNotice = foundingError ? (
    <div className="catch-up-founding-error" role="alert">
      <p>{foundingError}</p>
      <button
        type="button"
        onClick={() => {
          setFoundingError(null);
          setFoundingRetry((attempt) => attempt + 1);
        }}
      >
        Retry island founding
      </button>
    </div>
  ) : null;

  if (state.phase === "arrived") {
    // Nothing was handed over, or the walk finished every handed age. Either way the learner
    // is standing where the game starts and there is nothing left to say, so this closes
    // rather than adding a screen between them and the city.
    return placement.skipped.length === 0 ? null : (
      <>
        <CatchUpStopped
          eraId={landingEra(state)}
          foundedCount={state.founded.length}
          headline={arrivedHeadline(landingEra(state))}
          standing={stoppedStanding(landingEra(state), state.founded.length)}
          waiting={waiting}
          onEnter={onClose}
        />
        {foundingRetryNotice}
      </>
    );
  }

  if (state.phase === "stopped") {
    const stopped = landingEra(state);
    return (
      <>
        <CatchUpStopped
          eraId={stopped}
          foundedCount={state.founded.length}
          headline={stoppedHeadline(stopped)}
          standing={stoppedStanding(stopped, state.founded.length)}
          waiting={waiting}
          onEnter={onClose}
        />
        {foundingRetryNotice}
      </>
    );
  }

  if (era === null || position === null) {
    return null;
  }

  if (state.phase === "founding") {
    return (
      // KEYED ON THE AGE, which is load-bearing rather than a React habit: a founding holds a
      // clock and a fired-once ref, and both have to start again at the next age. A key makes
      // that a fresh mount; the alternative was an effect resetting them off an `eraId`
      // dependency it never reads, which is both harder to read and one stale frame worse.
      <CatchUpFounding
        key={era}
        eraId={era}
        onComplete={() => dispatch({ type: "founded" })}
        waiting={waiting}
      />
    );
  }

  if (state.phase === "placing") {
    return (
      <CatchUpPlacing
        eraId={era}
        position={position.position}
        total={position.total}
        placedNodeIds={placedNodeIds}
        waiting={waiting}
        onDone={() => dispatch({ type: "placed" })}
      />
    );
  }

  return (
    <EraCatchUpPrompt
      eraId={era}
      position={position.position}
      total={position.total}
      forfeited={forfeitedEras(state)}
      buildMode={catchUpBuildMode(state.at)}
      // Where the walk goes next if they keep going: the following handed age, or the age
      // they were placed in once this is the last one. Read off the plan rather than off
      // `nextEraId`, because what the sentence promises is where the WALK arrives.
      nextEra={state.plan[state.at + 1] ?? state.placedEra}
      waiting={waiting}
      onChoose={choose}
      disclosureOpen={disclosureOpen}
    />
  );
}

/** The walk's own state, for a host that needs to know whether it is running. */
export function useCatchUpPlan(placement: EraPlacement): readonly EraId[] {
  return useMemo(() => placement.skipped, [placement.skipped]);
}
