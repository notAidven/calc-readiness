import { useCallback, useEffect, useRef, useState } from "react";

import type { OruMood } from "../../lessons/OruAdvisorCharacter";
import { runtimeStorage } from "../../storage/runtimeStorage";

/**
 * First-run onboarding demo REEL — the timed state machine + once-only flag.
 *
 * A brand-new learner lands on an empty island; this framed, skippable "video"
 * reel plays a short highlight montage of the core loop (drop a building -> click
 * to learn -> finish to build it up -> unlock more) built from the game's OWN
 * visuals, then hands off to the live city (which kicks off the coach-marks). It
 * is STAGED and NON-DESTRUCTIVE — the machine only advances beats; the reel renders
 * its own bounded stage and never writes to `citySession`.
 * See `docs/superpowers/specs/2026-07-24-demo-reel-coachmarks-design.md`.
 */

/**
 * localStorage key: set once the reel has been played or skipped. Reused from the
 * original in-scene demo so returning learners who already saw onboarding are not
 * shown the reel.
 */
export const ONBOARDING_DEMO_SEEN_KEY = "cr.onboarding.demoSeen";

/**
 * The real D1 node whose building the reel places + builds (the Store).
 * Display only — it is rendered from `buildingAssets` for the reel stage + the
 * lesson card and is NEVER placed into the real city.
 */
export const DEMO_NODE_ID = "NUM.F";

/**
 * The real D1 node the Unlock beat reveals as "newly unlocked" (the Dwellings) —
 * a second, distinct building so the unlock beat clearly shows a NEW building, not
 * the one just built. Display only; never placed.
 */
export const DEMO_UNLOCK_NODE_ID = "NUM.2";

/** The reel beats, in play order (Place -> Learn -> Build -> Unlock). */
export type DemoBeat = "place" | "learn" | "build" | "unlock";
export const DEMO_BEATS: readonly DemoBeat[] = ["place", "learn", "build", "unlock"];

/**
 * How long each beat holds before the reel advances (ms). Sums to ~20s — the "Build"
 * beat runs longest because it carries the Foundation -> scaffold -> built transform.
 */
const BEAT_DURATION_MS: Record<DemoBeat, number> = {
  place: 4500,
  learn: 5000,
  build: 6000,
  unlock: 4500,
};

/** The advisor's caption for each beat (plain copy; rendered in an aria-live region). */
export const DEMO_NARRATION: Record<DemoBeat, string> = {
  place: "Drop a building on an open plot.",
  learn: "Click it to open the lesson and learn the skill.",
  build: "Finish the lesson, then practice to build it up.",
  unlock: "Complete it to unlock new buildings!",
};

/**
 * Oru's pose per beat: talk through the three explaining beats, then POINT at the newly
 * unlocked building.
 *
 * The unlock beat used to be CityGuide's `cheer`, and Oru has no celebration pose — no
 * `cheer` and no `wave` — so the beat is carried by the nearest thing Oru can do, which
 * is drawing the eye to what just appeared. The reward chip and the mastery star already
 * say "well done" on that beat; the advisor's job there is to point at the new building.
 *
 * `Record<DemoBeat, OruMood>` is doing real work: a beat left behind is a compile error
 * rather than a silent fallback, and a pose Oru cannot strike will not typecheck.
 */
export const DEMO_MOOD: Record<DemoBeat, OruMood> = {
  place: "talk",
  learn: "talk",
  build: "talk",
  unlock: "point",
};

/** True once the learner has seen (played or skipped) the onboarding reel. */
export function hasSeenOnboardingDemo(): boolean {
  try {
    return runtimeStorage()?.getItem(ONBOARDING_DEMO_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

/** Remember that the reel has been seen so returning learners skip it. */
export function markOnboardingDemoSeen(): void {
  try {
    runtimeStorage()?.setItem(ONBOARDING_DEMO_SEEN_KEY, "true");
  } catch {
    // Storage can be unavailable (private mode / disabled); the reel simply won't
    // be remembered. This is a nicety, not a correctness requirement.
  }
}

export interface DemoScript {
  /** The current beat. */
  readonly beat: DemoBeat;
  /** Zero-based beat index. */
  readonly index: number;
  /** Total beat count (for the progress bar + a "1 / N" hint). */
  readonly total: number;
  /** Cut the reel short (Skip) — cancels the timer and calls `onDone` once. */
  readonly skip: () => void;
}

/**
 * The reel's timed state machine. While `active` (and not `paused`), it steps
 * through `DEMO_BEATS` on a timer and calls `onDone` after the last beat. Inactive
 * means inert (no timers). `paused` holds the current beat (the Play/Pause control):
 * the timer is cleared while paused and restarts for the current beat on resume. The
 * timer is cleared on unmount and whenever it goes inactive/paused, and `onDone`
 * fires at most once per run (natural finish OR `skip`).
 */
export function useDemoScript({
  active,
  paused = false,
  onDone,
}: {
  active: boolean;
  paused?: boolean;
  onDone: () => void;
}): DemoScript {
  const [index, setIndex] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Stable so the advance effect can both call it and use it as its cleanup.
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // (Re)start from the first beat whenever a run becomes active.
  useEffect(() => {
    if (active) {
      setIndex(0);
      doneRef.current = false;
    }
  }, [active]);

  // Hold the current beat for its duration, then advance — or finish after the last.
  // Paused clears the timer (and, on resume, this re-runs to restart the beat).
  useEffect(() => {
    if (!active || paused || doneRef.current) {
      return;
    }
    const beat = DEMO_BEATS[index] ?? "unlock";
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (index < DEMO_BEATS.length - 1) {
        setIndex((current) => current + 1);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDoneRef.current();
      }
    }, BEAT_DURATION_MS[beat]);
    return clearTimer;
  }, [active, paused, index, clearTimer]);

  const skip = useCallback(() => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    clearTimer();
    onDoneRef.current();
  }, [clearTimer]);

  return {
    beat: DEMO_BEATS[index] ?? "unlock",
    index,
    total: DEMO_BEATS.length,
    skip,
  };
}
