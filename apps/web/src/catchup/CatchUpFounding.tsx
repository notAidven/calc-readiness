import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { ReactElement } from "react";

import "./catchUp.css";

/**
 * Diagnostic catch-up representation after the four-beat replay was retired. Placement
 * already authorizes this skipped prefix, so this is one compatible founding reveal: the
 * island name, its Town Hall foundation, and one continue action. It asks no exam questions
 * and writes no mastery.
 */
export function CatchUpFounding({
  eraId,
  onComplete,
  waiting,
}: {
  readonly eraId: EraId;
  readonly onComplete: () => void;
  readonly waiting?: string | null;
}): ReactElement {
  const era = getEraOrThrow(eraId);
  return (
    <div
      className="catchup-founding catchup-founding--single"
      data-testid="catchup-founding"
      data-era={eraId}
      data-stage="founded"
    >
      <div className="catchup-founding__caption" role="status" aria-live="polite">
        <p className="catchup-founding__era">{era.name}</p>
        <p className="catchup-founding__beat" data-testid="catchup-founding-beat">
          Island unlocked by your diagnostic placement
        </p>
        <p>
          Town Hall foundation ready. No unlock exam is required for this skipped island.
        </p>
        {waiting ? (
          <p className="catchup-founding__waiting" data-testid="catchup-waiting">
            {waiting}
          </p>
        ) : null}
        <button
          type="button"
          className="city-action city-action-primary"
          onClick={onComplete}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
