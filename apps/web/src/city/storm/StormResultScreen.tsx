import type { StormResult } from "@cr/game";
import type { ReactNode } from "react";

export interface StormResultScreenProps {
  readonly result: StormResult;
  readonly onRetry: () => void;
  readonly onExit: () => void;
}

/**
 * Result screen (SCAFFOLD). Reads the pure `StormResult` from `gradeStorm`. On a
 * clear the checkpoint write is the ONE game write (server-authoritative in
 * production; the in-memory `CheckpointWriter` in the demo) — this screen only
 * DISPLAYS the graded outcome and never persists anything itself. The speed bonus
 * is display-only at MVP; it has no persistent effect until Contracts section 8
 * (design section 7.4 / 5.2).
 */
export function StormResultScreen({
  result,
  onRetry,
  onExit,
}: StormResultScreenProps): ReactNode {
  const bonusPct = Math.round(result.speed_bonus_ratio * 100);

  return (
    <section className="storm-scaffold" aria-labelledby="storm-result-title">
      <span className="micro-label">Storm result</span>
      <h2 id="storm-result-title" aria-live="assertive">
        {result.cleared ? "Storm cleared!" : "Storm not cleared"}
      </h2>
      <p>
        {result.correct_count} of {result.item_count} correct (needed{" "}
        {result.required_correct}).
      </p>
      {result.cleared ? (
        <p className="storm-scaffold-note">
          Neighborhood checkpoint complete. Speed bonus: {bonusPct}% (display-only at MVP).
        </p>
      ) : (
        <p className="storm-scaffold-note">No loss — retry any time.</p>
      )}
      <div className="storm-scaffold-actions">
        {!result.cleared && (
          <button
            type="button"
            className="city-action city-action-primary"
            onClick={onRetry}
          >
            Retry storm
          </button>
        )}
        <button type="button" className="city-action" onClick={onExit}>
          {result.cleared ? "Back to city" : "Leave storm"}
        </button>
      </div>
    </section>
  );
}
