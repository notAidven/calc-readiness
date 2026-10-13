/**
 * The demo reel's decorative ghost pointer. It glides to the plot on the Place beat
 * and pulses a "tap" ring on the Learn beat — all driven by CSS keyed off the parent
 * `.demo-reel__screen[data-beat]`, so this stays pure, static markup. It is
 * `aria-hidden` (the reel caption's aria-live region carries the meaning) and is NOT
 * rendered under reduced motion (see `ReelStage`).
 */
export function GhostCursor() {
  return (
    <div className="demo-reel__cursor" aria-hidden="true" data-testid="demo-reel-cursor">
      <span className="demo-reel__cursor-ring" />
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 3l14 7-6 2-2 6-6-15z" />
      </svg>
    </div>
  );
}
