import type { EraId } from "@cr/skill-graph";
import { useEffect, useSyncExternalStore } from "react";

/**
 * **IS A CRISIS RUNNING, AND WHOSE: the smallest thing that can answer it.**
 *
 * `eraState.ts` is the precedent and the model: a stored `EraId`, a default and a setter,
 * and *"deliberately the smallest thing that can be one"*. This is the same shape for the
 * other axis of the city's mood. It holds **one era id or null**, and nothing else: no
 * round, no phase, no board, no result. Anything richer is derived at its own call site
 * from state that already exists (`HardWinterSurface` owns the winter, `useCrisisCall`
 * owns the call), and a field added here is a field every reader has to agree about.
 *
 * ## What it is for, and the one thing that reads it today
 *
 * The soundtrack. `audio/eraMusic.ts` selects a track from the era AND from whether a
 * crisis is running, on the lead's ruling that *"each era has its own track, and crises
 * also have their own track"*, so the audio layer needs an answer to the second half that
 * does not involve it knowing anything about winters.
 *
 * ## NOT PERSISTED, deliberately
 *
 * A crisis is a mount, not a saved position. `eraState` persists because the era survives
 * a reload and the city must come back wearing it; a crisis does not survive a reload,
 * because the encounter it belongs to does not. Writing it to storage would create exactly
 * one new failure: a tab that crashed mid-winter reopens playing crisis music over a city
 * with no crisis in it.
 *
 * ## IT GATES NOTHING (`INV-COS-1`)
 *
 * A declaration, not a permission. Nothing consults it to decide whether a crisis may
 * start, whether a lesson may be entered, or what anything costs. The crisis tells this
 * module it is running; this module never tells the crisis anything.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** The era whose crisis is running, or null. Module state, mirroring `useCityEra`. */
let running: EraId | null = null;

function publish(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Declare that a crisis is running, or that none is.
 *
 * Idempotent: setting the value it already holds publishes nothing, so a component that
 * re-renders cannot make the soundtrack reconcile on every frame.
 */
export function setActiveCrisis(eraId: EraId | null): void {
  if (running === eraId) {
    return;
  }
  running = eraId;
  publish();
}

/** The era whose crisis is running, read outside React. */
export function activeCrisisEraId(): EraId | null {
  return running;
}

/** Run `listener` whenever a crisis starts or ends. Returns the remover. */
export function subscribeActiveCrisis(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The era whose crisis is running, re-rendering the caller when that changes. */
export function useActiveCrisis(): EraId | null {
  return useSyncExternalStore(subscribeActiveCrisis, activeCrisisEraId, () => null);
}

/**
 * **THE DECLARATION. A crisis surface calls this, and its MOUNT is the crisis.**
 *
 * Tying it to the mount rather than to a start/stop pair is what stops the two coming
 * apart: there is no path out of a React tree that skips the cleanup, so a crisis that is
 * closed, abandoned, navigated away from or unmounted by an error boundary all clear the
 * flag the same way. A pair of imperative calls would need every one of those exits to
 * remember, and the one that forgot would leave crisis music playing over a city with no
 * crisis in it.
 *
 * `HardWinterSurface` is the single caller, and that is not an accident of layering: both
 * doors into the winter mount it (`WinterRoute` for `?winter`, `three/WinterInCity` for
 * the in-city crisis), so declaring it there covers both by construction rather than by
 * two call sites agreeing. **A future crisis with a surface of its own owes its own call**,
 * because it will not go through this component, and `eraMusic.test.ts` holds the census that
 * fires when a second crisis becomes enterable.
 */
export function useDeclareActiveCrisis(eraId: EraId): void {
  useEffect(() => {
    setActiveCrisis(eraId);
    return () => {
      setActiveCrisis(null);
    };
  }, [eraId]);
}
