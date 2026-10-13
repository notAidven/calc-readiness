import type { SuccessionOutcome } from "@cr/game";
import type { ReactElement } from "react";

import { SUCCESSION_VERDICT_COPY } from "./successionView";

export function SuccessionConclusion({
  outcome,
  onLeave,
  cityBound = false,
}: {
  readonly outcome: SuccessionOutcome;
  readonly onLeave?: () => void;
  readonly cityBound?: boolean;
}): ReactElement {
  const copy = SUCCESSION_VERDICT_COPY[outcome.verdict];
  const civicTotal = outcome.civic_buildings_open + outcome.civic_buildings_closed;
  return (
    <section
      className="sx-conclusion"
      data-testid="sx-conclusion"
      data-verdict={outcome.verdict}
      role="dialog"
      aria-modal="false"
      aria-labelledby="sx-conclusion-title"
    >
      <p className="sx-conclusion__eyebrow">The civic crisis is over</p>
      <h2 id="sx-conclusion-title">{copy.headline}</h2>
      <p>{copy.line}</p>
      <dl className="sx-conclusion__facts">
        <div>
          <dt>Your wards</dt>
          <dd>{outcome.player_controlled}</dd>
        </div>
        <div>
          <dt>Rival wards</dt>
          <dd>{outcome.rival_controlled}</dd>
        </div>
        <div>
          <dt>Civics still open</dt>
          <dd>
            {outcome.civic_buildings_open}/{civicTotal}
          </dd>
        </div>
      </dl>
      <p className="sx-conclusion__consequence">
        {civicTotal === 0
          ? "Every bought civic kept working. The ward result remains visible in the city."
          : outcome.civic_buildings_closed === 0
            ? "Every bought civic building is working again."
            : `${outcome.civic_buildings_closed} civic building${outcome.civic_buildings_closed === 1 ? " remains" : "s remain"} shuttered. Their statues and claim marks stay in the city.`}
      </p>
      <p className="sx-conclusion__note">
        {cityBound
          ? "Lessons, mastery, skill-building capacity, and Town Hall capacity remain unchanged."
          : "Lessons, mastery, and progress remain unchanged."}
      </p>
      {onLeave && (
        <button
          type="button"
          className="primary-action"
          data-testid="sx-leave"
          onClick={onLeave}
        >
          Return to the city
        </button>
      )}
    </section>
  );
}
