import type { CityStormView } from "@cr/game";
import type { ReactNode } from "react";

import { stormMessage } from "../announcements";

export interface StormEntryScreenProps {
  readonly storm: CityStormView;
  readonly promptCount: number;
  readonly onBegin: () => void;
  readonly onExit: () => void;
}

/**
 * Entry / trigger surface (SCAFFOLD). The pre-battle screen the student reaches
 * when they open the neighborhood checkpoint. It mirrors the design gate: the
 * storm is attemptable only once every required node is mastered (design section
 * 7.1); until then it reads locked.
 *
 * The locked / cleared lines now come from `announcements.ts`, which owns the
 * canonical storm strings — the fold-in this scaffold's comment used to defer. They
 * were duplicated byte-for-byte, so the locked line here kept saying the storm
 * waited on buildings being "complete" independently of the canonical one (#103).
 * Only the READY line stays local, because it adds this screen's prompt count.
 */
export function StormEntryScreen({
  storm,
  promptCount,
  onBegin,
  onExit,
}: StormEntryScreenProps): ReactNode {
  const locked = storm.phase === "locked";
  const cleared = storm.phase === "cleared";

  return (
    <section className="storm-scaffold" aria-labelledby="storm-entry-title">
      <span className="micro-label">Neighborhood checkpoint</span>
      <h2 id="storm-entry-title">Face the storm</h2>
      <p aria-live="polite">
        {locked || cleared
          ? stormMessage(storm)
          : `Storm ready. Answer ${promptCount} mixed-retention prompts; clear ${storm.required_correct} of ${storm.item_count} to finish the neighborhood.`}
      </p>
      <p className="storm-scaffold-note">
        A miss has no loss — retry as many times as you like. The soft timer only grows a
        bonus; it never fails the storm.
      </p>
      <div className="storm-scaffold-actions">
        <button
          type="button"
          className="city-action city-action-primary"
          disabled={locked || promptCount === 0}
          onClick={onBegin}
        >
          {cleared ? "Replay storm" : "Begin the storm"}
        </button>
        <button type="button" className="city-action" onClick={onExit}>
          Back to city
        </button>
      </div>
    </section>
  );
}
