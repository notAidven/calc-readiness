import { SUCCESSION, type SuccessionState } from "@cr/game";
import { type ReactElement, useState } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import {
  closeSuccessionBatch,
  SUCCESSION_SCENARIOS,
  successionScenario,
} from "./successionScenarios";

export function SuccessionDevSkip({
  state,
  onSkipped,
  enabled = isDevPersistenceEnabled(),
}: {
  readonly state: SuccessionState;
  readonly onSkipped: (next: SuccessionState) => void;
  readonly enabled?: boolean;
}): ReactElement | null {
  const [open, setOpen] = useState(true);
  if (!enabled) {
    return null;
  }
  return (
    <aside className="sx-skip" data-testid="sx-dev-skip">
      <button
        type="button"
        className="sx-skip__title"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Skip the questions
      </button>
      {open && (
        <>
          <div className="sx-skip__band">
            {SUCCESSION.influence_by_correct.map((earned, correct) => (
              <button
                key={`score-${earned}`}
                type="button"
                data-testid={`sx-dev-skip-close-${correct}`}
                disabled={state.phase === "settled"}
                onClick={() => onSkipped(closeSuccessionBatch(state, correct))}
              >
                {correct}/3
              </button>
            ))}
          </div>
          <div className="sx-skip__band sx-skip__band--wrap">
            {SUCCESSION_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                data-testid={`sx-dev-skip-jump-${scenario.id}`}
                onClick={() => onSkipped(successionScenario(scenario.id).build())}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
