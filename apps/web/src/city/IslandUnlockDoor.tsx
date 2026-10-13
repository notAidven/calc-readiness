import { islandUnlockEligibility, islandUnlockTarget } from "@cr/game";
import { ERA_SEQUENCE, type EraId, eraNumber, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

import { nextEraId } from "./eraState";

import "./eraAdvanceDoor.css";

/** Kept as a presentation-only prop while old screenshot callers are migrated. */
export type EraDoorVariant = "threshold" | "sequence" | "handover";

export interface IslandUnlockDoorProps {
  readonly eraId: EraId;
  readonly nodeStates: readonly StudentNodeState[];
  readonly destinationUnlocked?: boolean;
  /** Persisted net score for an exam that can be resumed from this door. */
  readonly inProgressScore?: number;
  readonly onOpen: () => void;
  readonly variant?: EraDoorVariant;
}

export function IslandUnlockDoor({
  eraId,
  nodeStates,
  destinationUnlocked = false,
  inProgressScore = 0,
  onOpen,
  variant = "threshold",
}: IslandUnlockDoorProps) {
  const era = getEraOrThrow(eraId);
  const next = nextEraId(eraId);
  const destination = next === null ? null : getEraOrThrow(next);
  const eligibility = islandUnlockEligibility(eraId, nodeStates);
  const target = islandUnlockTarget(eligibility.total);
  const finalReady = eligibility.mastered === eligibility.total;
  const available =
    destination === null ? finalReady : destinationUnlocked || eligibility.eligible;
  const resumable =
    destination !== null &&
    !destinationUnlocked &&
    eligibility.eligible &&
    inProgressScore > 0;
  const action =
    destination === null
      ? finalReady
        ? "Celebrate completion"
        : "Master every skill to complete"
      : destinationUnlocked
        ? "Choose where to continue"
        : resumable
          ? `Resume unlock exam · ${inProgressScore}/${target}`
          : eligibility.eligible
            ? "Begin unlock exam"
            : "Keep mastering skills";
  const accessibleName =
    destination === null
      ? `${action}: ${eligibility.mastered} of ${eligibility.total} skills mastered`
      : `${action}: unlock the ${destination.name} from the ${era.name}; ${eligibility.mastered} of ${eligibility.total} skills mastered; ${eligibility.required} required; exam target ${target} net points`;

  return (
    <div className="era-door-slot">
      <button
        type="button"
        data-testid="menu-island-unlock"
        className="era-door island-unlock-door"
        data-variant={variant}
        data-ready={available ? "true" : "false"}
        data-locked={available ? undefined : "true"}
        data-final={destination === null ? "true" : "false"}
        aria-disabled={available ? undefined : true}
        aria-label={accessibleName}
        onClick={() => {
          if (available) {
            onOpen();
          }
        }}
      >
        <span className="era-door__eyebrow">
          {destination === null
            ? `Final island · ${eraNumber(eraId)} of ${ERA_SEQUENCE.length}`
            : destinationUnlocked
              ? "Destination unlocked"
              : "Next island"}
        </span>
        <span className="era-door__from">{era.name}</span>
        <span className="era-door__seam" aria-hidden="true">
          <span className="era-door__seam-built" />
          <span className="era-door__seam-mark" />
          <span className="era-door__seam-ahead" />
        </span>
        <span className="era-door__to">{destination?.name ?? "Civilization complete"}</span>
        <span className="era-door__note" data-testid="island-unlock-mastery">
          {eligibility.mastered} of {eligibility.total} skills mastered
        </span>
        <span className="era-door__note" data-testid="island-unlock-requirement">
          {destination === null
            ? `Completion reward at ${eligibility.total} of ${eligibility.total}`
            : `${eligibility.required} required (80%) · Exam target ${target} net points`}
        </span>
        <span className="era-door__action">{action}</span>
      </button>
    </div>
  );
}
