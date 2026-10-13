import type { CitizenRoster, WinterCellView, WinterFire } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import { Component, lazy, type ReactNode, type RefObject, Suspense, useState } from "react";
import type * as THREE from "three";

import type { PaletteVariant } from "../palette";
import type { RoadCell } from "../roads";
import type { CityLayout } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import type { CrisisAtmosphere } from "./crisis/atmosphere";
import type {
  ActivePlacement,
  CalloutAnchor,
  ScenePlacement,
  SceneTownHall,
} from "./CityScene";
import type { RelayRenderState } from "./RelayFixture";

/**
 * Progressive-enhancement host for the R3F city. The 3D scene is `React.lazy`-d
 * so `three` never loads for headless tests or when WebGL is unavailable; the
 * caller's DOM `fallback` (the semantic mirror stays the source of truth) renders
 * instead. Suspense + an error boundary make the canvas FAIL CLOSED: a failed
 * GLB load, a lost WebGL context, or a render error all drop back to the
 * fallback with the keyboard-navigable roster fully intact.
 */

const CityScene = lazy(() => import("./CityScene"));

/** Feature-detect WebGL without throwing in headless environments (e.g. jsdom). */
function canRenderCanvas(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface CityCanvasHostProps {
  enableCanvas: boolean;
  layout: CityLayout;
  placed: readonly ScenePlacement[];
  /** The island HUB (Town Hall), or `null` when unfounded / being moved. */
  townHall?: SceneTownHall | null;
  /**
   * The population to draw, derived by `cityCitizenRoster` in `CitySurface`. `null`
   * before the view model resolves. Passed through rather than derived here: the scene
   * reads who lives where and never decides it (D-CIT8).
   */
  citizens?: CitizenRoster | null;
  /** The seed the crowd's looks and places are drawn from — an input, never minted. */
  citizenSeed?: number;
  variant: PaletteVariant;
  reducedMotion: boolean;
  controlsRef: RefObject<OrbitControlsLike | null>;
  onSelect: (nodeId: string) => void;
  /** Read-only presentation surfaces may hide lesson labels while keeping real buildings. */
  showSkillLabels?: boolean;
  /** Product-directed stand-down removes names and status captions together. */
  skillLabelsStandDown?: boolean;
  /** Presenter-only source-raster projection for the two pinned reference islands. */
  presenterReferenceFraming?: boolean;
  /** Presenter-only building to frame after its real placement lands. */
  presenterBuildingFocusNodeId?: string;
  /** Optional browser-evidence sink; omitted in production play. */
  metricsTargetRef?: RefObject<HTMLElement | null>;
  /** Build/placement mode is active — the scene shows the grid + ghost. */
  placing?: boolean;
  /** The active placement transform + validity (controlled by CitySurface). */
  placement?: ActivePlacement | null;
  /** The chosen building's GLB url, rendered as the translucent blueprint ghost. */
  ghostModelUrl?: string | null;
  /** Drag-to-place: report the grid cell the pointer snaps the ghost to. */
  onHoverCell?: (col: number, row: number) => void;
  /** World anchor for the selected building's on-screen lesson-menu popup, or null. */
  calloutAnchor?: CalloutAnchor | null;
  /** The popup DOM element (owned by CitySurface) to glue above `calloutAnchor`. */
  calloutTargetRef?: RefObject<HTMLDivElement | null>;
  /** A click that hit no building (empty ground) — dismisses the popup. */
  onBackgroundTap?: () => void;
  /** Committed road tiles to render (connection-aware). */
  roads?: readonly RoadCell[];
  /** Road paint mode is active — the scene shows the grid + captures paint drags. */
  roadPainting?: boolean;
  /** The draft road path being painted (tinted preview). */
  roadPreview?: readonly RoadCell[];
  /** Whether the draft is affordable — drives the preview tint. */
  roadPreviewAffordable?: boolean;
  /** Drag/click-to-paint: report each grid cell the pointer traces while painting. */
  onPaintRoadCell?: (col: number, row: number) => void;
  /** The picked road tile, drawn with the gold selection frame (`null` = none). */
  selectedRoadTile?: RoadCell | null;
  /** Click-to-pick a single laid road tile (its removal popup opens above it). */
  onSelectRoadTile?: (col: number, row: number) => void;
  /** The era the city wears — what its roads are surfaced from (D-ERA30). */
  eraId?: EraId;
  /**
   * WHAT A CRISIS WRECKED, reaching the canvas. Node ids of ruined placements and `"col,row"`
   * keys of scarred cells, straight from `crisis_damage`. Held apart from `placed` / `roads`
   * because a ruin is a state on something that is still there, never a removal — see
   * `CityScene`'s own note. Optional, so an undamaged city passes nothing.
   */
  ruinedNodeIds?: ReadonlySet<string>;
  ruinedCells?: readonly string[];
  /**
   * …and the civic placements a crisis SHUTTERED, from `crisis_damage.suspended_civic`.
   * Durable like the two above, so it is set in the ordinary city.
   */
  suspendedCivicIds?: ReadonlySet<string>;
  relayState?: RelayRenderState | null;
  frostStageByNodeId?: ReadonlyMap<string, number>;
  /**
   * **THE CRISIS, ON THE BUILDINGS.** Which are reinforced, which a reinforce could be aimed
   * at, and which the frost reaches when this round closes. Three sets rather than one status
   * per building, because shielded and threatened are INDEPENDENT — a building is routinely
   * both — and collapsing them here would force the renderer to pick one to draw.
   */
  shieldedNodeIds?: ReadonlySet<string>;
  reinforceCandidates?: ReadonlySet<string>;
  crisisThreatenedNodeIds?: ReadonlySet<string>;
  /**
   * **THE CRISIS, HAPPENING ON THIS ISLAND.** The engine's projected winter board and its
   * fires (`hardWinterView(...).rows`, `HardWinterState.fires`), plus the click handler that
   * turns a pick on the ground into the cell a fire goes on. All optional and all `null`/absent
   * when no winter is running, which is the ordinary city.
   */
  winterRows?: readonly (readonly WinterCellView[])[] | null;
  winterFires?: readonly WinterFire[];
  /** The cell a fire is being aimed at, so the island can ghost that fire onto it. */
  winterFirePreviewAt?: { readonly col: number; readonly row: number } | null;
  onAimWinterCell?: (col: number, row: number) => void;
  /** A non-winter crisis's procedural layer and scene-wide weather. */
  crisisGround?: THREE.Object3D | null;
  crisisWeather?: CrisisAtmosphere | null;
  /** A full-height crisis rail occupies the left side, so frame the settlement beside it. */
  crisisSidePanel?: boolean;
  crisisPanelSide?: "right" | null;
  /** Deterministic DOM backdrop shown whenever the 3D canvas cannot mount. */
  fallback: ReactNode;
}

export function CityCanvasHost({
  enableCanvas,
  layout,
  placed,
  townHall = null,
  citizens = null,
  citizenSeed,
  variant,
  reducedMotion,
  controlsRef,
  onSelect,
  showSkillLabels = true,
  skillLabelsStandDown = false,
  presenterReferenceFraming = false,
  presenterBuildingFocusNodeId,
  metricsTargetRef,
  placing = false,
  placement = null,
  ghostModelUrl = null,
  onHoverCell,
  calloutAnchor = null,
  calloutTargetRef,
  onBackgroundTap,
  roads,
  roadPainting = false,
  roadPreview,
  roadPreviewAffordable = true,
  onPaintRoadCell,
  selectedRoadTile = null,
  onSelectRoadTile,
  eraId,
  ruinedNodeIds,
  ruinedCells,
  suspendedCivicIds,
  relayState,
  frostStageByNodeId,
  shieldedNodeIds,
  reinforceCandidates,
  crisisThreatenedNodeIds,
  winterRows,
  winterFires,
  winterFirePreviewAt,
  onAimWinterCell,
  crisisGround,
  crisisWeather,
  crisisSidePanel,
  crisisPanelSide,
  fallback,
}: CityCanvasHostProps) {
  const [webglOk] = useState(canRenderCanvas);

  if (!enableCanvas || !webglOk) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      <SceneErrorBoundary fallback={fallback}>
        <CityScene
          layout={layout}
          placed={placed}
          townHall={townHall}
          citizens={citizens}
          citizenSeed={citizenSeed}
          variant={variant}
          reducedMotion={reducedMotion}
          controlsRef={controlsRef}
          onSelect={onSelect}
          showSkillLabels={showSkillLabels}
          skillLabelsStandDown={skillLabelsStandDown}
          presenterReferenceFraming={presenterReferenceFraming}
          presenterBuildingFocusNodeId={presenterBuildingFocusNodeId}
          metricsTargetRef={metricsTargetRef}
          placing={placing}
          placement={placement}
          ghostModelUrl={ghostModelUrl}
          onHoverCell={onHoverCell}
          calloutAnchor={calloutAnchor}
          calloutTargetRef={calloutTargetRef}
          onBackgroundTap={onBackgroundTap}
          roads={roads}
          roadPainting={roadPainting}
          roadPreview={roadPreview}
          roadPreviewAffordable={roadPreviewAffordable}
          onPaintRoadCell={onPaintRoadCell}
          selectedRoadTile={selectedRoadTile}
          onSelectRoadTile={onSelectRoadTile}
          eraId={eraId}
          ruinedNodeIds={ruinedNodeIds}
          ruinedCells={ruinedCells}
          suspendedCivicIds={suspendedCivicIds}
          relayState={relayState}
          frostStageByNodeId={frostStageByNodeId}
          shieldedNodeIds={shieldedNodeIds}
          reinforceCandidates={reinforceCandidates}
          crisisThreatenedNodeIds={crisisThreatenedNodeIds}
          winterRows={winterRows}
          winterFires={winterFires}
          winterFirePreviewAt={winterFirePreviewAt}
          onAimWinterCell={onAimWinterCell}
          crisisGround={crisisGround}
          crisisWeather={crisisWeather}
          crisisSidePanel={crisisSidePanel}
          crisisPanelSide={crisisPanelSide}
        />
      </SceneErrorBoundary>
    </Suspense>
  );
}
