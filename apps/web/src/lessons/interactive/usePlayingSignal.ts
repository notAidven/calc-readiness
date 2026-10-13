import { useEffect, useRef } from "react";

/**
 * Report a walkthrough's auto-play state to the lesson player, which withholds "Previous"
 * while an animation is running so a mid-flight page change cannot strand the learner.
 *
 * The callback is held in a ref rather than listed as a dependency: the lesson passes a
 * fresh inline arrow on every render, so depending on it directly would re-fire the effect
 * continuously. Only a real change of `playing` emits.
 *
 * The unmount effect always reports `false`. Without it a learner who advances the page
 * while the timer is still running would leave the player believing an animation is live,
 * and "Previous" would stay disabled for the rest of the lesson.
 */
export function usePlayingSignal(
  playing: boolean,
  onPlayingChange?: (playing: boolean) => void,
): void {
  const report = useRef(onPlayingChange);
  report.current = onPlayingChange;

  useEffect(() => {
    report.current?.(playing);
  }, [playing]);

  useEffect(() => () => report.current?.(false), []);
}
