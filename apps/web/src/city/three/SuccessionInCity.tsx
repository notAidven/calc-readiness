import { successionDamage, type SuccessionState } from "@cr/game";
import {
  lazy,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type * as THREE from "three";

import { isDevPersistenceEnabled } from "../../devPersistence/devSession";
import type { SuccessionSession } from "../../succession/successionSession";
import {
  SUCCESSION_CITY_OVERVIEW,
  type SuccessionCityRoster,
  successionCityRoster,
} from "../../succession/successionCity";
import type {
  SuccessionSurfaceProps,
  SuccessionWorldSlot,
} from "../../succession/SuccessionSurface";
import { successionView } from "../../succession/successionView";
import type { CrisisDamageReport } from "@cr/game";
import type { PlacedTransform } from "../worldLayout";
import { buildCivicConflictLayer, CITY_WARD_MARKER_NAME } from "./CivicConflictLayer";

import "./succession-in-city.css";

const SuccessionSurface = lazy(async () => ({
  default: (await import("../../succession/SuccessionSurface")).SuccessionSurface,
}));

export interface SuccessionCityBoard {
  readonly layer: THREE.Group;
  readonly boundPlacementIds: ReadonlySet<string>;
  readonly suspendedCivicIds: ReadonlySet<string>;
  readonly focusedPlacementId: string | null;
  readonly threatenedPlacementId: string | null;
  readonly settled: boolean;
}

function boardFromSlot(
  slot: SuccessionWorldSlot,
  roster: SuccessionCityRoster,
): SuccessionCityBoard {
  const activePlacements = new Set(
    slot.state.districts.map((district) => district.civic.placement_id),
  );
  const activeBindings = roster.bindings.filter((binding) =>
    activePlacements.has(binding.placement.nodeId),
  );
  const bindingByDistrict = new Map(
    activeBindings.map((binding) => [binding.district.id, binding]),
  );
  const focusDistrict = slot.cue?.districtId ?? null;
  const focused =
    focusDistrict === null
      ? SUCCESSION_CITY_OVERVIEW
      : (bindingByDistrict.get(focusDistrict)?.placement.nodeId ?? null);
  const threatenedDistrict =
    slot.view.districts.find((district) => district.decides_next)?.id ?? null;
  return {
    layer: buildCivicConflictLayer(slot.view, activeBindings),
    boundPlacementIds: new Set(activeBindings.map((binding) => binding.placement.nodeId)),
    suspendedCivicIds: new Set(
      slot.view.districts.flatMap((district) => {
        const binding = bindingByDistrict.get(district.id);
        return district.suspended && binding?.kind === "civic"
          ? [binding.placement.nodeId]
          : [];
      }),
    ),
    focusedPlacementId: focused,
    threatenedPlacementId:
      threatenedDistrict === null
        ? null
        : (bindingByDistrict.get(threatenedDistrict)?.placement.nodeId ?? null),
    settled: slot.state.phase === "settled",
  };
}

export function successionAftermathBoard(
  state: SuccessionState,
  roster: SuccessionCityRoster,
): SuccessionCityBoard | null {
  if (state.phase !== "settled") {
    return null;
  }
  const statePlacements = new Set(
    state.districts.map((district) => district.civic.placement_id),
  );
  if (
    state.districts.some(
      (district) =>
        !roster.bindings.some(
          (binding) => binding.placement.nodeId === district.civic.placement_id,
        ),
    )
  ) {
    return null;
  }
  const settledRoster = {
    districts: roster.districts.filter((district) =>
      statePlacements.has(district.civic.placement_id),
    ),
    bindings: roster.bindings.filter((binding) =>
      statePlacements.has(binding.placement.nodeId),
    ),
  };
  return boardFromSlot(
    {
      state,
      view: successionView(state),
      cue: null,
    },
    settledRoster,
  );
}

function SuccessionBoardBridge({
  slot,
  roster,
  onBoard,
  onFocus,
  preserveOnUnmount,
}: {
  readonly slot: SuccessionWorldSlot;
  readonly roster: SuccessionCityRoster;
  readonly onBoard: (board: SuccessionCityBoard | null) => void;
  readonly onFocus: (placementId: string | null) => boolean | void;
  readonly preserveOnUnmount: RefObject<boolean>;
}) {
  const board = useMemo(() => boardFromSlot(slot, roster), [roster, slot]);
  const previousFocus = useRef<string | null>(null);

  useEffect(() => {
    onBoard(board);
  }, [board, onBoard]);

  useEffect(() => {
    if (board.focusedPlacementId !== previousFocus.current) {
      previousFocus.current = board.focusedPlacementId;
      let frame = 0;
      let attempts = 0;
      const focus = () => {
        attempts += 1;
        if (onFocus(board.focusedPlacementId) === false && attempts < 60) {
          frame = requestAnimationFrame(focus);
        }
      };
      focus();
      return () => cancelAnimationFrame(frame);
    }
    return;
  }, [board.focusedPlacementId, onFocus]);

  useEffect(
    () => () => {
      if (!preserveOnUnmount.current) {
        onBoard(null);
      }
    },
    [onBoard, preserveOnUnmount],
  );
  return null;
}

export interface SuccessionInCityProps {
  readonly session: SuccessionSession;
  readonly placements: readonly PlacedTransform[];
  readonly townHall: PlacedTransform | null;
  readonly civic: readonly PlacedTransform[];
  readonly reducedMotion: boolean;
  readonly onBoard: (board: SuccessionCityBoard | null) => void;
  readonly onFocus: (placementId: string | null) => boolean | void;
  readonly onCarryDamage?: (report: CrisisDamageReport) => Promise<unknown>;
  readonly onExit: (aftermath: SuccessionCityBoard | null) => void;
}

export function SuccessionInCity({
  session,
  placements,
  townHall,
  civic,
  reducedMotion,
  onBoard,
  onFocus,
  onCarryDamage,
  onExit,
}: SuccessionInCityProps) {
  const rosterResult = useMemo(() => {
    try {
      return { roster: successionCityRoster({ placements, townHall, civic }), error: null };
    } catch (cause) {
      return {
        roster: null,
        error:
          cause instanceof Error
            ? cause.message
            : "The Succession could not identify this city's buildings.",
      };
    }
  }, [civic, placements, townHall]);
  const latestState = useRef<SuccessionState | null>(null);
  const latestBoard = useRef<SuccessionCityBoard | null>(null);
  const carried = useRef(false);
  const preserveAfterExit = useRef(false);
  const publishBoard = useCallback(
    (board: SuccessionCityBoard | null) => {
      latestBoard.current = board;
      onBoard(board);
    },
    [onBoard],
  );

  if (rosterResult.roster === null) {
    return (
      <div className="succession-in-city succession-in-city--refused">
        <section>
          <h2>The city needs two placed buildings</h2>
          <p>{rosterResult.error}</p>
          <button type="button" onClick={() => onExit(null)}>
            Back to the city
          </button>
        </section>
      </div>
    );
  }
  const roster = rosterResult.roster;
  const renderWorld: NonNullable<SuccessionSurfaceProps["renderWorld"]> = (slot) => (
    <SuccessionBoardBridge
      slot={slot}
      roster={roster}
      onBoard={publishBoard}
      onFocus={onFocus}
      preserveOnUnmount={preserveAfterExit}
    />
  );

  return (
    <div className="succession-in-city" data-testid="succession-in-city">
      <Suspense
        fallback={<p className="succession-in-city__loading">Calling the wards…</p>}
      >
        <SuccessionSurface
          session={session}
          binding="city"
          districts={roster.districts}
          renderWorld={renderWorld}
          enableCanvas={false}
          reducedMotion={reducedMotion}
          presentation={isDevPersistenceEnabled() ? "prototype" : "learner"}
          onStateChange={(next) => {
            latestState.current = next;
          }}
          onExit={async () => {
            const state = latestState.current;
            if (state?.phase === "settled" && !carried.current) {
              const report = successionDamage(state);
              const currentCivics = new Set(
                roster.bindings.flatMap((binding) =>
                  binding.kind === "civic" ? [binding.placement.nodeId] : [],
                ),
              );
              const safeReport = {
                ...report,
                suspended_civic: (report.suspended_civic ?? []).filter((placementId) =>
                  currentCivics.has(placementId),
                ),
              };
              if (safeReport.suspended_civic.length > 0 && onCarryDamage) {
                await onCarryDamage(safeReport);
              }
              carried.current = true;
              preserveAfterExit.current = true;
              onExit(latestBoard.current);
              return;
            }
            onExit(null);
          }}
        />
      </Suspense>
    </div>
  );
}

export { CITY_WARD_MARKER_NAME };
