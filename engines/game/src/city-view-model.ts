import { completionStatusForMastery } from "@cr/mastery-service";
import type { DomainId, EraId } from "@cr/skill-graph";
import type {
  CompletionStatus,
  LessonStage,
  Mastery,
  NeighborhoodState,
  PlacementEstimate,
  StudentNodeState,
} from "@cr/state-schema";
import { FIRST_ERA_ID, resolveEraCity } from "./city-roster";
import {
  type BlueprintSilhouette,
  type ConstructionState,
  deriveBlueprint,
  deriveConstructionState,
  type MasteryProgress,
  masteryProgress,
  type NodeProgressInput,
} from "./construction";
import {
  type BuildingArchetypeDescriptor,
  type CitizenRoleId,
  type NeighborhoodStatus,
  resolveNeighborhood,
} from "./descriptors";
import {
  D1_NEIGHBORHOOD_ID,
  getLockedDistricts,
  isNeighborhoodReady,
  type LockedDistrict,
} from "./neighborhood";
import type { PlotPosition } from "./plots";
import { hasPracticeEvidence } from "./practice-evidence";
import { stormRequiredCorrect } from "./storm";

/**
 * The single derived "city view model" (pure, framework-free).
 *
 * `buildCityViewModel` composes node states with the era's resolved ROSTER
 * (`resolveEraCity`, `city-roster.ts`) and the descriptor-resolved neighborhood
 * (`resolveNeighborhood`) into exactly what a renderer consumes. It derives everything
 * read-only; it performs and implies no writes.
 *
 * **THE BUILDINGS ARE THE ERA'S; EVERYTHING ELSE IS STILL THE NEIGHBORHOOD'S.** The
 * roster used to come from `neighborhood.plots`, which is a DOMAIN's `mvp` nodes and so
 * was permanently D1's six however far the player had come — eras two to ten each
 * resolved to zero plots. `era_id` is what fixes that, and it defaults to era one so a
 * caller that names no era gets exactly the city it got before. The label, status, storm
 * tuning and locked districts stay neighborhood-resolved: none of them is a property of
 * the roster, and the descriptor fences that guard them are worth keeping (era design
 * §13).
 *
 * Because the neighborhood is resolved from declarative descriptors + the
 * registry, D1 flows through the exact same generic path future neighborhoods
 * will — the view model has no hard-coded node ids, edges, or "D1" layout.
 *
 * **`cosmetic_preview` WAS A FIELD HERE, AND IT IS GONE (2026-08-03).** It projected a
 * "cosmetic rewards you WOULD earn" count off mastery, from an era when the persistent
 * cosmetic economy was a deferred Contracts §8 expansion. `cosmetic-preview.ts` noted
 * that retiring it was a contract change owed its own commit rather than a copy fix;
 * this is that commit, and the shop it was previewing is sunset too. The
 * `CosmeticPreviewDescriptor` and `ResolvedNeighborhood.cosmetic_catalog` that carried
 * it through the generic descriptor pipeline went with it.
 */

export interface CityBuildingView {
  node_id: string;
  lesson_shell: string | null;
  position: PlotPosition;
  road_sources: readonly string[];
  /** The building "type" (answer-type archetype) resolved from the descriptor. */
  archetype: BuildingArchetypeDescriptor;
  /** Social role for citizens, resolved from the descriptor (D-CIT17). */
  citizen_role: CitizenRoleId;
  mastery: Mastery;
  /** Derived from mastery (Contracts §1), never from lesson_stage. */
  completion_status: CompletionStatus;
  construction_state: ConstructionState;
  complete: boolean;
  gold: boolean;
  /**
   * The building is built, but by the DIAGNOSTIC rather than by the learner: it
   * reached the Complete stage with no practice evidence (`hasPracticeEvidence`).
   * Renderers read this so no surface claims practice performance, a read
   * mini-lesson, or a finished practice set that a tested-out learner never
   * produced (issue #103).
   */
  tested_out: boolean;
  blueprint: BlueprintSilhouette;
  progress: MasteryProgress;
}

/** A prerequisite road drawn from `from` into `to` (descriptive scenery). */
export interface CityRoad {
  from: string;
  to: string;
}

/** Stable, load-on-enter storm view (in_progress/failed are transient runtime). */
export type CityStormPhase = "locked" | "ready" | "cleared";

export interface CityStormView {
  neighborhood_id: string;
  unlocked: boolean;
  checkpoint_cleared: boolean;
  phase: CityStormPhase;
  item_count: number;
  clear_ratio: number;
  required_correct: number;
}

export interface CityViewModel {
  neighborhood_id: string;
  /** Human label resolved from the neighborhood descriptor (not hard-coded). */
  label: string;
  /** "populated" (built) vs "architected" — D1 is the only populated one at MVP. */
  status: NeighborhoodStatus;
  buildings: readonly CityBuildingView[];
  roads: readonly CityRoad[];
  locked_districts: readonly LockedDistrict[];
  storm: CityStormView;
}

export interface BuildCityViewModelInput {
  node_states: readonly StudentNodeState[];
  /**
   * The era the city is standing in. Decides the BUILDING ROSTER and nothing else: this
   * era's nodes plus every earlier era's (`cityRosterNodeIds`). Defaults to era one, so
   * omitting it is the pre-era-model six-building city rather than an empty island.
   */
  era_id?: EraId;
  neighborhood_id?: DomainId;
  neighborhood_state?: NeighborhoodState | null;
  /** Per-node authoring completeness; a missing/absent node defaults to true. */
  authoring_complete?: Readonly<Record<string, boolean>>;
}

/** A node with no state row renders as a fresh, not-started plot. */
const DEFAULT_PROGRESS_INPUT: NodeProgressInput = {
  mastery: 0 as Mastery,
  lesson_stage: "not_started" as LessonStage,
  placement_estimate: 0 as PlacementEstimate,
};

export function buildCityViewModel(input: BuildCityViewModelInput): CityViewModel {
  const neighborhoodId = input.neighborhood_id ?? D1_NEIGHBORHOOD_ID;
  const neighborhood = resolveNeighborhood(neighborhoodId);
  const eraCity = resolveEraCity(input.era_id ?? FIRST_ERA_ID);
  const stateByNode = new Map(input.node_states.map((state) => [state.node_id, state]));

  const buildings: CityBuildingView[] = eraCity.plots.map((plot) => {
    const state = stateByNode.get(plot.node_id);
    const progressInput: NodeProgressInput = state
      ? {
          mastery: state.mastery,
          lesson_stage: state.lesson_stage,
          placement_estimate: state.placement_estimate,
        }
      : DEFAULT_PROGRESS_INPUT;
    const options = {
      authoring_complete: input.authoring_complete?.[plot.node_id] ?? true,
    };
    const constructionState = deriveConstructionState(progressInput, options);
    const mastery = progressInput.mastery;
    // Practice evidence is read from the FULL row, not `NodeProgressInput` — the
    // construction rule itself must not see it (a tested-out building is genuinely
    // built, and `isNeighborhoodReady` stays on `mastery >= 2`). It only decides
    // what the copy is allowed to claim.
    const practiced = hasPracticeEvidence(state);

    return {
      node_id: plot.node_id,
      lesson_shell: plot.lesson_shell,
      position: plot.position,
      road_sources: plot.road_sources,
      archetype: plot.archetype,
      citizen_role: plot.citizen_role,
      mastery,
      completion_status: completionStatusForMastery(mastery),
      construction_state: constructionState,
      complete: mastery >= 2,
      gold: mastery === 3,
      tested_out: constructionState === "complete" && !practiced,
      blueprint: deriveBlueprint(progressInput, options),
      progress: masteryProgress(constructionState, { mastery, practiced }),
    };
  });

  const roads: CityRoad[] = eraCity.plots.flatMap((plot) =>
    plot.road_sources.map((from) => ({ from, to: plot.node_id })),
  );

  const unlocked = isNeighborhoodReady(neighborhoodId, input.node_states);
  const checkpointCleared = input.neighborhood_state?.checkpoint_cleared ?? false;
  const stormPhase: CityStormPhase = !unlocked
    ? "locked"
    : checkpointCleared
      ? "cleared"
      : "ready";

  return {
    neighborhood_id: neighborhoodId,
    label: neighborhood.label,
    status: neighborhood.status,
    buildings,
    roads,
    locked_districts: getLockedDistricts(neighborhoodId),
    storm: {
      neighborhood_id: neighborhoodId,
      unlocked,
      checkpoint_cleared: checkpointCleared,
      phase: stormPhase,
      item_count: neighborhood.storm.item_count,
      clear_ratio: neighborhood.storm.clear_ratio,
      required_correct: stormRequiredCorrect(
        neighborhood.storm.item_count,
        neighborhood.storm.clear_ratio,
      ),
    },
  };
}
