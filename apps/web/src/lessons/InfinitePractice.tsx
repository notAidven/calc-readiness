import { useMemo } from "react";

import { InfiniteDrill, nodeBestStreakKey } from "./InfiniteDrill";
import { createRandomScheduler } from "./infiniteScheduler";
import { practiceItemsById } from "./practiceChecker";

/**
 * Node-scoped infinite practice: an endless casual drill drawn at random from THIS
 * lesson's node only (`practiceItemsById` filtered by `node_id`, across that node's
 * difficulties). Nothing is scored into mastery; streak behavior matches the shared
 * drill shell. There are NO hints.
 */
export function InfinitePractice({
  nodeId,
  onExit,
}: {
  nodeId: string;
  onExit: () => void;
}) {
  const pool = useMemo(
    () => Array.from(practiceItemsById.values()).filter((item) => item.node_id === nodeId),
    [nodeId],
  );
  const scheduler = useMemo(() => createRandomScheduler(pool), [pool]);

  return (
    <InfiniteDrill
      scheduler={scheduler}
      storageKey={nodeBestStreakKey(nodeId)}
      backLabel="Back to options"
      onExit={onExit}
    />
  );
}
