import { createRelay, type CrisisOverwrittenRecord } from "@cr/game";
import { lazy, type ReactElement, Suspense } from "react";

const RelaySurface = lazy(() =>
  import("../relay/RelaySurface").then((module) => ({ default: module.RelaySurface })),
);

export function RecordVerification({
  record,
  practisedNodeIds,
  onResolve,
  onClose,
}: {
  readonly record: CrisisOverwrittenRecord;
  readonly practisedNodeIds: readonly string[];
  readonly onResolve: (damageId: string, correct: number) => Promise<unknown>;
  readonly onClose: () => void;
}): ReactElement {
  const initial = {
    ...createRelay(),
    phase: "settled" as const,
    round: 3,
    dark: record.bands_dark,
    shutters_closed: 0,
    copy: "spent" as const,
    copy_spent_in_round: 2,
  };
  return (
    <Suspense fallback={<div className="relay-city-loading">Opening the record…</div>}>
      <RelaySurface
        embedded
        illustration={null}
        initialState={initial}
        practisedNodeIds={practisedNodeIds}
        onVerificationComplete={(correct) => onResolve(record.damage_id, correct)}
        onExit={onClose}
      />
    </Suspense>
  );
}
