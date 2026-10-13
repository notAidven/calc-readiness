import { buildCityViewModel, NO_CRISIS_DAMAGE } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { type ReactElement, useMemo, useRef } from "react";
import { resolveBuildingModel } from "../city/buildingAssets";
import { citizenSeedFor, cityCitizenRoster } from "../city/citizens";
import { civicTypeOf } from "../city/civic";
import { resolveRestoredCivicModel } from "../city/civicBuildings";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import { buildStageFor } from "../city/palette";
import type { OrbitControlsLike } from "../city/three/applyOrbit";
import { CityCanvasHost } from "../city/three/CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "../city/three/CityScene";
import type { TownHallStage } from "../city/townHall";
import {
  resolveEraTownHall,
  resolveTownHallModel,
  TOWN_HALL_CENTER_TRANSFORM,
} from "../city/townHall";
import { computeCityLayout } from "../city/worldLayout";
import { ArchipelagoFallbackIsland } from "./ArchipelagoFallbackIsland";
import { islandManifestEntry } from "./islandManifest";
import type { IslandLayout } from "./islandState";

export type ArchipelagoHeroMode =
  | "standing"
  | "prior"
  | "future"
  | "diagnostic"
  | "ceremony";

export interface ArchipelagoHeroSceneInput {
  readonly placed: readonly ScenePlacement[];
  readonly townHall: SceneTownHall | null;
  readonly citizens: ReturnType<typeof cityCitizenRoster> | null;
  readonly citizenSeed: number;
  readonly roads: IslandLayout["roads"];
  readonly ruinedNodeIds: ReadonlySet<string>;
  readonly ruinedCells: readonly string[];
  readonly suspendedCivicIds: ReadonlySet<string>;
}

/**
 * Adapt durable island state to the ordinary city scene without introducing another renderer.
 *
 * Future and diagnostic modes cannot receive a write-capable session and intentionally ignore
 * any layout passed by a caller. Founding mode receives only the temporary Town Hall stage.
 */
export function archipelagoHeroSceneInput(input: {
  readonly eraId: EraId;
  readonly nodeStates: readonly StudentNodeState[];
  readonly islandLayout: IslandLayout | null;
  readonly mode: ArchipelagoHeroMode;
  readonly unlockFoundingStage?: TownHallStage | null;
}): ArchipelagoHeroSceneInput {
  const terrainOnly = input.mode === "future" || input.mode === "diagnostic";
  const ceremony = input.mode === "ceremony";
  const durable = terrainOnly || ceremony ? null : input.islandLayout;
  const viewModel = buildCityViewModel({
    node_states: input.nodeStates,
    era_id: input.eraId,
    neighborhood_state: null,
  });
  const buildingByNode = new Map(
    viewModel.buildings.map((building) => [building.node_id, building]),
  );
  const placements = durable?.placements ?? [];
  const civic = durable?.civic ?? [];
  const placed: ScenePlacement[] = [
    ...placements.map((placement): ScenePlacement => {
      const building = buildingByNode.get(placement.nodeId);
      return {
        ...placement,
        model: building
          ? resolveBuildingModel(
              placement.nodeId,
              buildStageFor(building.construction_state),
            )
          : null,
        mastery: building?.mastery ?? 0,
        celebrateToken: 0,
      };
    }),
    ...civic.map((placement): ScenePlacement => {
      const type = civicTypeOf(placement.nodeId);
      return {
        ...placement,
        model: type === null ? null : resolveRestoredCivicModel(type),
        mastery: 0,
        celebrateToken: 0,
      };
    }),
  ];
  const foundingStage = input.unlockFoundingStage ?? null;
  const hallTransform = ceremony
    ? foundingStage === null
      ? null
      : TOWN_HALL_CENTER_TRANSFORM
    : input.mode === "future"
      ? null
      : terrainOnly
        ? TOWN_HALL_CENTER_TRANSFORM
        : (durable?.town_hall ?? TOWN_HALL_CENTER_TRANSFORM);
  const landmark = input.mode === "diagnostic" || (!ceremony && durable?.town_hall == null);
  const townHall =
    hallTransform === null
      ? null
      : {
          ...hallTransform,
          model:
            ceremony && foundingStage !== null && foundingStage !== "built"
              ? resolveTownHallModel(foundingStage)
              : resolveEraTownHall(input.eraId, CURRENT_ERA_ID).model,
          celebrateToken: 0,
          landmark,
        };
  const damage = durable?.crisis_damage ?? NO_CRISIS_DAMAGE;
  const citizens =
    durable === null
      ? null
      : cityCitizenRoster({
          viewModel,
          placements,
          civic,
          seed: citizenSeedFor(input.nodeStates[0]?.student_id),
        });

  return {
    placed,
    townHall,
    citizens,
    citizenSeed: citizenSeedFor(input.nodeStates[0]?.student_id),
    roads: durable?.roads ?? [],
    ruinedNodeIds: new Set(damage.ruined_buildings.map((building) => building.node_id)),
    ruinedCells: damage.ruined_cells.map((record) => record.cell),
    suspendedCivicIds: new Set(
      damage.suspended_civic.map((building) => building.placement_id),
    ),
  };
}

export function ArchipelagoHeroRenderer({
  eraId,
  nodeStates,
  islandLayout,
  mode,
  reducedMotion,
  enableCanvas = true,
  unlockFoundingStage = null,
  collectMetrics = false,
}: {
  readonly eraId: EraId;
  readonly nodeStates: readonly StudentNodeState[];
  readonly islandLayout: IslandLayout | null;
  readonly mode: ArchipelagoHeroMode;
  readonly reducedMotion: boolean;
  readonly enableCanvas?: boolean;
  readonly unlockFoundingStage?: TownHallStage | null;
  readonly collectMetrics?: boolean;
}): ReactElement {
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const metricsTargetRef = useRef<HTMLDivElement | null>(null);
  const manifest = useMemo(() => islandManifestEntry(eraId), [eraId]);
  const scene = useMemo(
    () =>
      archipelagoHeroSceneInput({
        eraId,
        nodeStates,
        islandLayout,
        mode,
        unlockFoundingStage,
      }),
    [eraId, nodeStates, islandLayout, mode, unlockFoundingStage],
  );
  const presentationRadius = manifest.overviewRadius;
  const layout = useMemo(
    () =>
      computeCityLayout(
        presentationRadius,
        manifest.seaRadius * (presentationRadius / manifest.landRadius),
      ),
    [manifest.landRadius, manifest.seaRadius, presentationRadius],
  );

  return (
    <div
      className="archipelago-hero-renderer"
      data-testid="archipelago-hero-renderer"
      data-era={eraId}
      data-mode={mode}
      data-scene-root={eraId}
      data-island-visual={manifest.visual.format}
      aria-hidden="true"
      ref={metricsTargetRef}
    >
      <CityCanvasHost
        enableCanvas={enableCanvas}
        layout={layout}
        placed={scene.placed}
        townHall={scene.townHall}
        citizens={scene.citizens}
        citizenSeed={scene.citizenSeed}
        variant="day"
        reducedMotion={reducedMotion}
        controlsRef={controlsRef}
        onSelect={() => undefined}
        showSkillLabels={false}
        {...(collectMetrics ? { metricsTargetRef } : {})}
        roads={scene.roads}
        eraId={eraId}
        ruinedNodeIds={scene.ruinedNodeIds}
        ruinedCells={scene.ruinedCells}
        suspendedCivicIds={scene.suspendedCivicIds}
        fallback={
          <ArchipelagoFallbackIsland
            eraId={eraId}
            mode={mode}
            placedCount={scene.placed.length}
            hasTownHall={scene.townHall !== null}
          />
        }
      />
    </div>
  );
}
