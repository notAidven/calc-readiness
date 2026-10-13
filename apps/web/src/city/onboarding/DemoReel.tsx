import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { OruAdvisorCharacter } from "../../lessons/OruAdvisorCharacter";
import { ReelStage } from "./ReelStage";
import { DEMO_MOOD, DEMO_NARRATION, useDemoScript } from "./useDemoScript";

/**
 * The first-run onboarding DEMO REEL — a self-contained pop-up framed like a video
 * player that plays a ~20s highlight montage of the core loop (Place -> Learn ->
 * Build -> Unlock) built from the game's OWN visuals (real building models + UI). It
 * evolves the earlier in-scene `OnboardingDemo`: it reuses `useDemoScript` (the timed
 * beat machine) + `ReelStage` (the real building model per beat) + the era's advisor
 * (`OruAdvisorCharacter`) narrating, but renders inside a bounded, letterboxed frame with
 * player chrome — title, a progress bar, and Play/Pause + Skip — instead of over the whole
 * live scene.
 *
 * It is STAGED + NON-DESTRUCTIVE: it drives only its own stage, never `citySession`.
 * On finish (last beat) OR Skip it calls `onDone`, which the host (`CitySurface`) uses
 * to mark the reel seen, unmount it to the live (empty) city, and kick off the
 * contextual coach-marks. See the design spec.
 *
 * A11y: `role="dialog"` labelled by the title; the caption is an `aria-live="polite"`
 * region; the model canvas + flourishes are `aria-hidden`. Focus lands on Skip on open
 * (the live HUD is hidden while it runs) and `Escape` skips. Under reduced motion the
 * ghost cursor/topping-out hold still; the beats still step on the timer as static
 * frames and the caption still updates.
 */
export function DemoReel({
  enableCanvas,
  reducedMotion,
  onDone,
}: {
  /** Mount the live R3F building model (off in headless tests → static silhouette). */
  enableCanvas: boolean;
  /** Hold the ghost cursor / topping-out still; beats still step on the timer. */
  reducedMotion: boolean;
  /** Called once on finish OR Skip — the host marks it seen + starts the coach-marks. */
  onDone: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const script = useDemoScript({ active: true, paused, onDone });
  const skipRef = useRef<HTMLButtonElement>(null);
  const titleId = "demo-reel-title";

  // Land focus on Skip so the reel opens operable (the HUD is hidden while it runs).
  useEffect(() => {
    skipRef.current?.focus();
  }, []);

  const progressPct = Math.round(((script.index + 1) / script.total) * 100);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      script.skip();
    }
  };

  return (
    <div
      className="demo-reel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-beat={script.beat}
      data-reduced-motion={reducedMotion}
      data-testid="demo-reel"
      onKeyDown={handleKeyDown}
    >
      <div className="demo-reel__scrim" aria-hidden="true" />

      <div className="demo-reel__frame">
        <header className="demo-reel__head">
          <span className="micro-label demo-reel__eyebrow">Welcome</span>
          <h2 id={titleId} className="demo-reel__title">
            How your city grows
          </h2>
        </header>

        {/* The montage screen: the real demo building + per-beat flourishes. */}
        <ReelStage
          beat={script.beat}
          enableCanvas={enableCanvas}
          reducedMotion={reducedMotion}
        />

        {/* Caption bar: the era's advisor + the beat line (aria-live). */}
        <div className="demo-reel__caption">
          <div className="demo-reel__advisor" aria-hidden="true">
            <OruAdvisorCharacter mood={DEMO_MOOD[script.beat]} />
          </div>
          <p className="demo-reel__line" aria-live="polite" data-testid="demo-reel-line">
            {DEMO_NARRATION[script.beat]}
          </p>
        </div>

        {/* Player chrome: progress bar + Play/Pause + Skip. */}
        <div className="demo-reel__controls">
          <div
            className="demo-reel__progress"
            aria-hidden="true"
            data-testid="demo-reel-progress"
          >
            <span
              className="demo-reel__progress-fill"
              data-testid="demo-reel-progress-fill"
              data-value={script.index + 1}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="demo-reel__buttons">
            <button
              type="button"
              className="city-action city-action-ghost demo-reel__play"
              aria-label={paused ? "Play the reel" : "Pause the reel"}
              aria-pressed={paused}
              data-testid="demo-reel-play"
              onClick={() => setPaused((current) => !current)}
            >
              {paused ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              )}
              <span>{paused ? "Play" : "Pause"}</span>
            </button>
            <button
              type="button"
              className="city-action demo-reel__skip"
              ref={skipRef}
              onClick={script.skip}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
