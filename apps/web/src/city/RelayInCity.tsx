import type { RelayState } from "@cr/game";
import { lazy, type ReactElement, Suspense, useState } from "react";

import type { RelayAnswerFeedback } from "../relay/relayCityView";
import type { RelaySession } from "../relay/relayPersistence";

const RelaySurface = lazy(() =>
  import("../relay/RelaySurface").then((module) => ({ default: module.RelaySurface })),
);

export interface RelayInCityProps {
  readonly session?: RelaySession | null;
  readonly practisedNodeIds: readonly string[];
  readonly cityTargetIds: readonly string[];
  readonly initialState?: RelayState;
  readonly onStateChange: (state: RelayState) => void;
  readonly onFeedbackChange: (feedback: RelayAnswerFeedback) => void;
  readonly onCarryRecord: (bandsDark: number) => Promise<unknown>;
  readonly onExit: () => void;
}

/** The production crisis rail over the actual city canvas. */
export function RelayInCity({
  session = null,
  initialState,
  onStateChange,
  onExit,
  ...props
}: RelayInCityProps): ReactElement {
  const [openingState] = useState<RelayState | undefined>(() =>
    session ? session.start(initialState) : initialState,
  );
  return (
    <Suspense
      fallback={<div className="relay-city-loading">Opening the public record…</div>}
    >
      <RelaySurface
        embedded
        illustration={null}
        {...(openingState ? { initialState: openingState } : {})}
        practisedNodeIds={props.practisedNodeIds}
        cityTargetIds={props.cityTargetIds}
        onStateChange={(state) => {
          session?.save(state);
          onStateChange(state);
        }}
        onFeedbackChange={props.onFeedbackChange}
        onCarryRecord={props.onCarryRecord}
        onExit={() => {
          session?.clear();
          onExit();
        }}
      />
    </Suspense>
  );
}
