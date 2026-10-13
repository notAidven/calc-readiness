import type { CitizenRoster } from "@cr/game";
import { HARD_WINTER, type WinterCellView, type WinterFire } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import { ContactShadows, MapControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { IslandFromManifest } from "../../archipelago/IslandFromManifest";
import { islandManifestEntry } from "../../archipelago/islandManifest";
import type { ResolvedBuildingModel } from "../buildingAssets";
import { isCivicPlacement } from "../civic";
import { CURRENT_ERA_ID } from "../eraDressing";
import { islandGround } from "../islandGround";
import { ISLAND_GROWTH_CEILING } from "../islandLand";
import type { PaletteVariant } from "../palette";
import { type RoadCell, roadCellKey } from "../roads";
import { TOWN_HALL_ID } from "../townHall";
import {
  type CityLayout,
  DEFAULT_FOOTPRINT,
  type Footprint,
  footprintFor,
  GRID_CELL,
  occupiedCells,
  type PlacedTransform,
  placementRefusal,
  rotationYFor,
  SURFACE_Y,
  snapToCell,
  transformCenter,
} from "../worldLayout";
import {
  clampControlsToBounds,
  controlsDistance,
  type OrbitControlsLike,
  resistControlsPan,
  resistControlsZoom,
  settleControlsToBounds,
} from "./applyOrbit";
import { Citizens } from "./Citizens";
import { CityLighting, cityEnvironmentFor } from "./CityLighting";
import type { CrisisStatus } from "./CrisisStatusMarker";
import { shelterGround } from "./citizenShelter";
import {
  applyCityFraming,
  type CityFraming,
  islandFraming,
  presenterReferenceFraming as referencePresenterFraming,
} from "./cityFraming";
import type { CrisisAtmosphere } from "./crisis/atmosphere";
import { crisisAtmosphere, PLAYED_CRISIS_ERA } from "./crisis/registry";
import { useDisposableGraph } from "./disposeSceneGraph";
import { GhostBuilding } from "./GhostBuilding";
import { IntrusionCityLayer, type IntrusionWorldTarget } from "./IntrusionCityLayer";
import { overscrollAllowance, VILLAGE_CAMERA } from "./orbitCamera";
import { MODEL_STACK_NAME, PlacedBuilding } from "./PlacedBuilding";
import { plaguePanelReach } from "./plagueFraming";
import { RelayFixture, type RelayRenderState } from "./RelayFixture";
import { Roads } from "./Roads";
import { ScarredGround } from "./ScarredGround";
import { SkillLabels } from "./SkillLabels";
import { buildActivePlacementGrid } from "./StarterIsland";
import { TownHall } from "./TownHall";
import { Vehicles } from "./Vehicles";
import { WinterGround } from "./WinterGround";
import { settlementRadius, winterFraming } from "./winterFraming";

/**
 * The 3D React Three Fiber "starter island" surface (decorative — the DOM roster
 * in `CitySurface` is the semantic source of truth, and this whole canvas is
 * `aria-hidden`). A soft low-poly island in a teal lagoon holds a free-build grid
 * the player lays their own city onto, lit by the shared daylight rig with PCF
 * soft shadows, under a single fixed-angle camera (no rotation): drag/keys PAN,
 * wheel/pinch/+− ZOOM, clamped so the island can never be lost off-screen.
 *
 * Only mounted when WebGL is available; `CitySurface` renders a static DOM
 * backdrop otherwise (fail-closed). Default export so it can be `React.lazy`-d,
 * keeping `three` out of the jsdom unit-test graph.
 */

/** One already-placed building to render at its free grid transform. */
export interface ScenePlacement {
  readonly nodeId: string;
  readonly col: number;
  readonly row: number;
  readonly rot: number;
  /** Resolved building model, or `null` for nothing to render. */
  readonly model: ResolvedBuildingModel | null;
  /** Mastery tier (0..3) — drives the floating mastery stars above the building. */
  readonly mastery: number;
  readonly celebrateToken: number;
}

/**
 * The island HUB to render at its free grid transform — the Town Hall. Rendered by
 * the dedicated `TownHall` component (its own completion-driven stage model, no
 * mastery stars) rather than the skill `PlacedBuilding` loop. `null` when unfounded,
 * or hidden (the ghost stands in) while the hall itself is being moved.
 */
export interface SceneTownHall {
  readonly col: number;
  readonly row: number;
  readonly rot: number;
  /** The hall's current stage model (completion-driven), or `null` (render nothing). */
  readonly model: ResolvedBuildingModel | null;
  /** Bumped on a stage change to fire a one-shot completion pop. */
  readonly celebrateToken: number;
  /** Read-only preview landmark: draw the hall, but not its nameplate. */
  readonly landmark?: boolean;
}

/** The active (in-progress) placement the ghost previews. */
export interface ActivePlacement {
  readonly nodeId: string;
  readonly col: number;
  readonly row: number;
  readonly rot: number;
  readonly valid: boolean;
}

/**
 * The selected building the lesson-menu popup is anchored above: its footprint-center
 * ground position `(x, z)` plus its `nodeId` (used to find the rendered building in
 * the scene and measure its live roofline, so the popup hugs the real top of the
 * SITE / CONSTRUCTION / BUILT model at every stage). The popup DOM lives OUTSIDE the
 * (aria-hidden) canvas in `CitySurface`; the scene only projects this to screen space
 * each frame (see `CalloutTracker`).
 */
export interface CalloutAnchor {
  /**
   * The building to measure, or `null` for a ground-level anchor (a picked road
   * tile) that has no model to hug — then `anchorY` supplies the height directly.
   */
  readonly nodeId: string | null;
  readonly x: number;
  readonly z: number;
  /** Explicit world-space anchor height, used when `nodeId` is `null`. */
  readonly anchorY?: number;
}

/** Fallback roof height (world units) if the building mesh isn't measurable yet. */
const CALLOUT_FALLBACK_TOP_Y = 6;
/** Small gap (world units) between the measured roofline and the popup anchor point. */
const CALLOUT_TOP_MARGIN = 1.5;
/** Keep the popup (card) at least this far from the viewport edges (screen px). */
const CALLOUT_SCREEN_MARGIN = 12;
/** Screen-px gap between the anchor point and the card edge (room for the tail). */
const CALLOUT_TAIL_GAP = 12;
/** Hide once the anchor point drifts this far beyond the viewport (screen px). */
const CALLOUT_HIDE_MARGIN = 24;

export interface CitySceneProps {
  readonly layout: CityLayout;
  readonly placed: readonly ScenePlacement[];
  /** The island HUB (Town Hall), or `null` when unfounded / being moved. */
  readonly townHall?: SceneTownHall | null;
  /**
   * The city's population, derived by `cityCitizenRoster` in `CitySurface`. The scene
   * READS this — who exists, who lives where, who goes where by day — and computes none
   * of it (D-CIT8). `null` renders no crowd, which is the pre-view-model state.
   */
  readonly citizens?: CitizenRoster | null;
  /** The seed the crowd's places are jittered from. An input, never minted here. */
  readonly citizenSeed?: number;
  readonly variant: PaletteVariant;
  readonly reducedMotion: boolean;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
  readonly onSelect: (nodeId: string) => void;
  /** Read-only presentation surfaces may hide lesson labels while keeping real buildings. */
  readonly showSkillLabels?: boolean;
  /** Product-directed stand-down (for example Succession) removes the complete caption layer. */
  readonly skillLabelsStandDown?: boolean;
  /** Use the source-raster composition on the two Presenter reference islands. */
  readonly presenterReferenceFraming?: boolean;
  /**
   * Presenter-only building focus. Omitted in learner play; once this placement appears,
   * focus it at the ordinary closest gameplay dolly and keep its label in the collision pass.
   */
  readonly presenterBuildingFocusNodeId?: string;
  /** Optional browser-evidence sink; omitted in production play. */
  readonly metricsTargetRef?: RefObject<HTMLElement | null>;
  /** Placement (build) mode is active — show the tile grid + ghost. */
  readonly placing?: boolean;
  /** The active placement transform + validity (controlled by CitySurface). */
  readonly placement?: ActivePlacement | null;
  /** The chosen building's GLB url, rendered as the translucent blueprint ghost. */
  readonly ghostModelUrl?: string | null;
  /** Drag-to-place: report the grid cell the pointer snaps the ghost to. */
  readonly onHoverCell?: (col: number, row: number) => void;
  /** World anchor for the selected building's on-screen lesson-menu popup, or null. */
  readonly calloutAnchor?: CalloutAnchor | null;
  /** The popup DOM element (owned by CitySurface) to glue above `calloutAnchor`. */
  readonly calloutTargetRef?: RefObject<HTMLDivElement | null>;
  /**
   * A click that HIT no building (empty ground / lagoon). Clash-of-Clans "tap away
   * to dismiss": R3F only fires this for a click, never a pan/orbit drag, so dragging
   * the map keeps the popup up.
   */
  readonly onBackgroundTap?: () => void;
  /** Committed road tiles to render (connection-aware). */
  readonly roads?: readonly RoadCell[];
  /** Road paint mode is active — show the grid + capture drags as painted cells. */
  readonly roadPainting?: boolean;
  /** The draft road path being painted (rendered as a tinted preview). */
  readonly roadPreview?: readonly RoadCell[];
  /** Whether the draft is affordable — drives the preview tint (green vs rose). */
  readonly roadPreviewAffordable?: boolean;
  /** Drag/click-to-paint: report each grid cell the pointer traces while painting. */
  readonly onPaintRoadCell?: (col: number, row: number) => void;
  /** The picked road tile, drawn with the gold selection frame (`null` = none). */
  readonly selectedRoadTile?: RoadCell | null;
  /** Click-to-pick a single laid road tile (omitted = the road layer is inert). */
  readonly onSelectRoadTile?: (col: number, row: number) => void;
  /**
   * The era the city is wearing, which is what the roads are surfaced from (D-ERA30 —
   * era one wears earth paths, a later era can declare aggregate and painted markings) AND
   * what the island's ground is dressed from (D-ERA26 / D-ERA32 — `../islandGround.ts`).
   * Defaults to the era the city currently wears.
   */
  readonly eraId?: EraId;
  /**
   * **WHAT A CRISIS WRECKED AND NOBODY HAS REPAIRED — the buildings half.**
   *
   * Node ids of placements in `crisis_damage.ruined_buildings`, held APART from `placed`
   * exactly as `CitySurface` holds it apart from `placements`: a ruin is a second state on a
   * building that is still fully there, never a removal or a substitution, so the scene draws
   * every placement it was given either way and only the REPRESENTATION changes
   * (`ruinStage.ts`). Defaults to empty, so an undamaged city and every existing caller are
   * unaffected.
   */
  readonly ruinedNodeIds?: ReadonlySet<string>;
  /**
   * **…and the third state, between the two.** How far the frost has climbed each STANDING
   * building, by node id, as `winterDamageStage` reads it — absent or `0` for unmarked.
   * Drawn as a shell over the build stage rather than instead of it (`frostStage.ts`),
   * because a damaged building is still recognisably itself.
   *
   * A LIVE WINTER STATE AND NOT A DURABLE ONE, which is why it is a separate prop from
   * `ruinedNodeIds` rather than another read off `crisis_damage`: the city remembers ruins
   * and scarred ground between sessions and does not remember scarred BUILDINGS, so this is
   * only ever non-empty while a winter is being played over the island.
   */
  readonly frostStageByNodeId?: ReadonlyMap<string, number>;
  /** How many damaged appearances there are, so this file holds no opinion about the ladder. */
  readonly frostStages?: number;
  /**
   * **REINFORCED BUILDINGS, as an INDEPENDENT FLAG rather than a fourth building state.**
   *
   * A building can be shielded and threatened at once, which is the moment reinforcing pays for
   * itself and the one the two treatments most easily ruin for each other. It used to arrive here
   * as geometry ON the building — a storm roof — against {@link crisisThreatenedNodeIds}' billboard
   * above it; the roof was scrapped on 2026-08-03, so what this set feeds now is the CAPTION, where
   * `shielded` outranks `threatened` (`crisisLabelState`). It is still an independent flag because
   * the engine's sets genuinely overlap and the ranking has to be able to see both.
   *
   * Live winter state, never durable, for the same reason `frostStageByNodeId` is: the city
   * remembers ruins and scarred ground between sessions and remembers no shields at all,
   * because a shield does not survive the crisis that raised it.
   */
  readonly shieldedNodeIds?: ReadonlySet<string>;
  /**
   * Buildings a reinforce could be aimed at.
   *
   * It drew a GHOSTED storm roof, on `GhostBuilding`'s convention, until the roof was scrapped:
   * a ghost of geometry that is not drawn is nothing, and the declare card names what the reinforce
   * is aimed at in words. Kept on the prop surface because `crisisDressing` takes the whole board
   * and every caller hands it the same one.
   */
  readonly reinforceCandidates?: ReadonlySet<string>;
  /**
   * Buildings the frost reaches when this round closes. Drawn as the badge that REPLACES the
   * mastery stars while a crisis is on — see `CrisisStatusMarker`, and `winter/buildingThreat.ts`
   * for why this is read off the front's position rather than off accumulated damage.
   */
  readonly crisisThreatenedNodeIds?: ReadonlySet<string>;
  /**
   * **…and the ground half.** `"col,row"` keys from `crisis_damage.ruined_cells` — ground the
   * crisis scarred, which is unbuildable and un-roadable until it is reclaimed. Drawn by
   * `ScarredGround`, the per-cell layer.
   */
  readonly ruinedCells?: readonly string[];
  /**
   * **…and the third half, which is a set of BOUGHT buildings.** Civic placement ids from
   * `crisis_damage.suspended_civic` — buildings a crisis shuttered, still standing and still
   * owned, contributing nothing until the player pays to reopen them.
   *
   * DURABLE like the two above and unlike every other crisis prop here, so it is set in the
   * ordinary city with no board on the island. It is drawn as a caption (`SkillLabels`) and
   * not as a badge: a suspension is a state a player has to be able to READ and act on, and
   * the shape channel above a roofline is the crisis's own and belongs to the live board.
   */
  readonly suspendedCivicIds?: ReadonlySet<string>;
  /** The redesigned Intrusion fixture on its real civic placement, live or as a durable scar. */
  readonly relayState?: RelayRenderState | null;
  /**
   * **THE CRISIS, HAPPENING HERE.** The engine's projected winter board
   * (`hardWinterView(state, …).rows`) — frost, the frost line, warded ground, abandoned
   * ground, and the two provisional previews — drawn on the island by `WinterGround`. `null`
   * (the default) when no winter is running, which is every existing caller.
   *
   * Passed as the ENGINE's view rather than as anything derived here, because
   * `winterCellKey` and `roadCellKey` are the same key: a cell means the same cell on the
   * winter board and on this grid, so there is nothing to project and no second opinion about
   * what is frozen.
   */
  readonly winterRows?: readonly (readonly WinterCellView[])[] | null;
  /** Fires standing on the board (`HardWinterState.fires`). */
  readonly winterFires?: readonly WinterFire[];
  /**
   * The cell a fire is being aimed at, so `WinterGround` can stand a ghost of that fire on it
   * over the ghosted ground it would hold. `null` when nothing is being aimed.
   */
  readonly winterFirePreviewAt?: { readonly col: number; readonly row: number } | null;
  /**
   * Aim mode: the player is choosing the cell for a fire, so the scene captures a click on the
   * ground as a cell pick. Omitted, the winter layer is inert and the camera keeps the drag.
   */
  readonly onAimWinterCell?: (col: number, row: number) => void;
  /**
   * **A CRISIS'S OWN GROUND LAYER, ALREADY BUILT, TO HANG ON THE SHARED DECAL LADDER.**
   *
   * `crisis/ladder.ts` calls the ladder *"the cheapest place in the whole renderer to put new
   * art"* and names which crises take it: era one lays a course per tile, **era six lays link
   * bands, per link**, **era nine lays lifted covers and duct-marker collars**, and era four lays
   * no ground layer at all. Era one's is threaded through as eight winter-shaped props because era
   * one's layer needs the board; a layer that is already a `THREE.Object3D` needs one slot.
   *
   * **Omit it and nothing changes** — this scene draws exactly what it drew before, which is what
   * every caller on the demo route does. **Two crises take it and neither is on that route**: era
   * six's layer is built by `three/plagueIslandLayer.ts`; the redesigned Intrusion has
   * one upright relay fixture and intentionally supplies no ground layer.
   */
  readonly crisisGround?: THREE.Object3D | null;
  /**
   * The crisis preset to light, fog and expose the island by, for a crisis that is not era one's.
   *
   * `crisisAtmosphere(PLAYED_CRISIS_ERA)` is what a hard winter resolves to and it stays the
   * answer when this is omitted, so no existing caller moves. A crisis whose surface is not wired
   * into the city loop yet has no other way to be photographed under its own registered preset,
   * and photographing era six's marks under fair weather would be measuring them at a
   * `shadowIntensity` its own preset does not have — and era nine's at a key ELEVATION its own
   * preset does not have, which for era nine is the whole design, since a groove's self-shadowing
   * width and a mass's shadow reach are both functions of that angle.
   */
  readonly crisisWeather?: CrisisAtmosphere | null;
  /** Use the same settlement-to-free-strip frame as the winter's left rail. */
  readonly crisisSidePanel?: boolean;
  /** A non-winter crisis rail can reuse the projection fit on the opposite edge. */
  readonly crisisPanelSide?: "right" | null;
}

/** An undamaged city, so the two ruin props are optional for every existing caller. */
const NO_RUINED_NODES: ReadonlySet<string> = new Set<string>();

/**
 * No crisis on the island, so the three winter building sets are optional too.
 *
 * One shared identity rather than a literal per default: these are memo dependencies all the
 * way down, and a fresh `new Set()` per render would rebuild every building's dressing on
 * every frame of an ordinary, crisis-free city.
 */
const NO_NODE_IDS: ReadonlySet<string> = new Set<string>();

/** What a crisis makes one building look like: the badge over it, and nothing else. */
export interface CrisisDressing {
  readonly status: CrisisStatus | null;
}

const NO_DRESSING: CrisisDressing = { status: null };

/**
 * **HOW ONE BUILDING IS DRESSED FOR A CRISIS — and the reason it is still a function.**
 *
 * It used to return two things, a shield and a status, INDEPENDENTLY, because a building that is
 * both shielded and threatened is the exact frame the reinforce mechanic exists to produce and two
 * indicators fighting for one channel is how that frame turns to mush. The storm roof is gone
 * (the lead's 2026-08-03 QA: *"scrap the shield youre using completely"*), so the shield arm went
 * with it and what is left is the badge. `SHIELDED` is a CAPTION now, resolved one slot up in
 * `SkillLabels` from the same three sets this reads — see `crisisLabelState`, which is where the
 * shielded-and-threatened case is decided and ranked, and `crisisLabels.test.ts`, which holds the
 * caption against this badge so a building cannot be badged `lost` and captioned SHIELDED.
 *
 * It stays a named exported function so the composition is testable without a GPU, and it goes on
 * taking the WHOLE board rather than the one set it reads, because both call sites build one board
 * object and hand the same one to every reader of it — the caption included.
 *
 * **A STANDING, UNTHREATENED BUILDING GETS `null`, WHICH IS THE ORDINARY CITY'S VALUE.** It
 * returned a `safe` badge until the lead's ruling of 2026-08-01, and `null` is what that ruling
 * asks for: an unthreatened building gets nothing added and keeps whatever mastery stars it had
 * before the winter. The consequence worth naming is that a badge now MEANS something, so the
 * two callers must not reintroduce a default here for the buildings the crisis is not about. The
 * caption is the channel that does speak for them, and it says `SAFE`.
 */
export function crisisDressing(
  nodeId: string,
  board: {
    readonly winter: boolean;
    readonly ruinedNodeIds: ReadonlySet<string>;
    readonly shieldedNodeIds: ReadonlySet<string>;
    readonly reinforceCandidates: ReadonlySet<string>;
    readonly crisisThreatenedNodeIds: ReadonlySet<string>;
  },
): CrisisDressing {
  if (!board.winter) {
    return NO_DRESSING;
  }
  return {
    status: board.ruinedNodeIds.has(nodeId)
      ? "lost"
      : board.crisisThreatenedNodeIds.has(nodeId)
        ? "threatened"
        : null,
  };
}
const NO_RUINED_CELLS: readonly string[] = [];
const NO_FROST_STAGES: ReadonlyMap<string, number> = new Map<string, number>();
const NO_WINTER_FIRES: readonly WinterFire[] = [];

/**
 * Renderer tone-mapping exposure, applied REACTIVELY rather than in `onCreated`.
 *
 * `onCreated` fires once, when the canvas is made. The crisis arrives on an island whose canvas
 * already exists — the winter is played on the city's own scene, not a new one — so setting the
 * exposure there would have left the overcast preset without its exposure drop on every real
 * entry and applied it only on a reload.
 */
function SceneExposure({ value }: { readonly value: number }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

export function cityExposureForEra(
  eraId: EraId,
  atmosphere: CrisisAtmosphere | null,
): number {
  if (atmosphere !== null) {
    return atmosphere.exposure;
  }
  return eraId === "cyberpunk" ? 1.22 : 1;
}

export interface RenderedCityComposition {
  readonly expectedPlacementCount: number;
  readonly expectedSkillPlacementCount: number;
  readonly expectedCivicPlacementCount: number;
  readonly loadedPlacementIds: readonly string[];
  readonly loadedPlacementCount: number;
  readonly loadedModelMeshes: number;
  readonly loadedModelMeshesById: Readonly<Record<string, number>>;
  readonly missingPlacementIds: readonly string[];
  readonly hallExpected: boolean;
  readonly hallLoaded: boolean;
  readonly islandRenderMeshes: number;
  readonly ready: boolean;
}

function visibleMeshCount(root: THREE.Object3D | undefined): number {
  let meshes = 0;
  root?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.visible) {
      meshes += 1;
    }
  });
  return meshes;
}

/** Actual submitted population, read from the scene graph rather than React input length. */
export function renderedCityComposition(
  scene: THREE.Scene,
  expectedPlacementIds: readonly string[],
  hallExpected: boolean,
): RenderedCityComposition {
  const loadedPlacementIds: string[] = [];
  const loadedModelMeshesById: Record<string, number> = {};
  let loadedModelMeshes = 0;
  for (const id of expectedPlacementIds) {
    const building = scene.getObjectByName(`building-${id}`);
    const modelMeshes = visibleMeshCount(building?.getObjectByName(MODEL_STACK_NAME));
    if (modelMeshes > 0) {
      loadedPlacementIds.push(id);
      loadedModelMeshesById[id] = modelMeshes;
      loadedModelMeshes += modelMeshes;
    }
  }
  const hall = scene.getObjectByName(`building-${TOWN_HALL_ID}`);
  const hallMeshes = visibleMeshCount(hall?.getObjectByName(MODEL_STACK_NAME));
  if (hallMeshes > 0) {
    loadedModelMeshesById[TOWN_HALL_ID] = hallMeshes;
    loadedModelMeshes += hallMeshes;
  }
  let islandRenderMeshes = 0;
  scene.traverse((object) => {
    if (object.userData.cityIslandRenderGraph !== true) {
      return;
    }
    const batch = object.userData.batch as { readonly renderMeshes?: number } | undefined;
    islandRenderMeshes += Number(batch?.renderMeshes ?? 0);
  });
  const missingPlacementIds = expectedPlacementIds.filter(
    (id) => !loadedPlacementIds.includes(id),
  );
  const hallLoaded = !hallExpected || hallMeshes > 0;
  const expectedMeshFloor = expectedPlacementIds.length * 2 + (hallExpected ? 2 : 0);
  return {
    expectedPlacementCount: expectedPlacementIds.length,
    expectedSkillPlacementCount: expectedPlacementIds.filter((id) => !isCivicPlacement(id))
      .length,
    expectedCivicPlacementCount: expectedPlacementIds.filter(isCivicPlacement).length,
    loadedPlacementIds: loadedPlacementIds.sort(),
    loadedPlacementCount: loadedPlacementIds.length,
    loadedModelMeshes,
    loadedModelMeshesById,
    missingPlacementIds,
    hallExpected,
    hallLoaded,
    islandRenderMeshes,
    ready:
      islandRenderMeshes > 10 &&
      missingPlacementIds.length === 0 &&
      hallLoaded &&
      loadedModelMeshes >= expectedMeshFloor,
  };
}

function SceneMetrics({
  targetRef,
  expectedPlacementIds,
  hallExpected,
}: {
  readonly targetRef: RefObject<HTMLElement | null>;
  readonly expectedPlacementIds: readonly string[];
  readonly hallExpected: boolean;
}) {
  const samples = useRef<number[]>([]);
  const lastWrite = useRef(0);
  const resetToken = useRef<string | undefined>(undefined);
  useFrame(({ gl, scene }, delta) => {
    const target = targetRef.current;
    if (target === null) {
      return;
    }
    if (target.dataset.metricsReset !== resetToken.current) {
      resetToken.current = target.dataset.metricsReset;
      samples.current = [];
      lastWrite.current = 0;
      target.dataset.sampleFrames = "0";
    }
    const milliseconds = delta * 1000;
    samples.current.push(milliseconds);
    if (samples.current.length > 120) {
      samples.current.shift();
    }
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (now - lastWrite.current < 250) {
      return;
    }
    lastWrite.current = now;
    const ordered = [...samples.current].sort((a, b) => a - b);
    const average =
      ordered.reduce((total, value) => total + value, 0) / Math.max(1, ordered.length);
    const p95 =
      ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))] ?? 0;
    let objects = 0;
    scene.traverse(() => {
      objects += 1;
    });
    const composition = renderedCityComposition(scene, expectedPlacementIds, hallExpected);
    target.dataset.drawCalls = String(gl.info.render.calls);
    target.dataset.triangles = String(gl.info.render.triangles);
    target.dataset.sceneObjects = String(objects);
    target.dataset.frameAverageMs = average.toFixed(2);
    target.dataset.frameP95Ms = p95.toFixed(2);
    target.dataset.sampleFrames = String(ordered.length);
    target.dataset.dpr = String(gl.getPixelRatio());
    target.dataset.expectedPlacementCount = String(composition.expectedPlacementCount);
    target.dataset.expectedSkillPlacementCount = String(
      composition.expectedSkillPlacementCount,
    );
    target.dataset.expectedCivicPlacementCount = String(
      composition.expectedCivicPlacementCount,
    );
    target.dataset.loadedPlacementIds = composition.loadedPlacementIds.join(",");
    target.dataset.loadedPlacementCount = String(composition.loadedPlacementCount);
    target.dataset.loadedModelMeshes = String(composition.loadedModelMeshes);
    target.dataset.loadedModelMeshesById = JSON.stringify(
      composition.loadedModelMeshesById,
    );
    target.dataset.missingPlacementIds = composition.missingPlacementIds.join(",");
    target.dataset.hallLoaded = String(composition.hallLoaded);
    target.dataset.islandRenderMeshes = String(composition.islandRenderMeshes);
    target.dataset.compositionReady = String(composition.ready);
    target.dataset.metricsRevision = String(
      Number(target.dataset.metricsRevision ?? 0) + 1,
    );
  });
  return null;
}

/** Main-thread room reserved after a WebGL frame has already missed its budget. */
const SLOW_FRAME_YIELD_MS = 25;
const MISSED_FRAME_BUDGET_MS = 20;

/** Keep ambient motion alive without immediately scheduling another expensive draw. */
function CityAnimationScheduler({
  active,
  busy,
  urgentUntilRef,
}: {
  readonly active: boolean;
  readonly busy: boolean;
  readonly urgentUntilRef: RefObject<number>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const timer = useRef<number | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);

  const cancelScheduledFrame = useCallback(() => {
    generation.current += 1;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelScheduledFrame();
    };
  }, [cancelScheduledFrame]);

  useEffect(() => {
    if (!active) {
      cancelScheduledFrame();
      return;
    }
    invalidate();
  }, [active, cancelScheduledFrame, invalidate]);

  useFrame((_state, delta) => {
    if (!active) {
      return;
    }
    const missedFrameBudget = delta * 1_000 >= MISSED_FRAME_BUDGET_MS;
    const frameGeneration = generation.current + 1;
    generation.current = frameGeneration;
    queueMicrotask(() => {
      if (!mounted.current || !active || generation.current !== frameGeneration) {
        return;
      }
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      const delay =
        missedFrameBudget && !busy && performance.now() >= urgentUntilRef.current
          ? SLOW_FRAME_YIELD_MS
          : 0;
      if (delay === 0) {
        timer.current = null;
        invalidate();
        return;
      }
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (mounted.current && active && generation.current === frameGeneration) {
          invalidate();
        }
      }, delay);
    });
  });

  return null;
}

/** Keep the pan target inside this fraction of the island so the base stays framed. */
const PAN_BOUND_RATIO = 0.72;

/** Height of the invisible drag surface — just above the grass, below buildings. */
const PLACEMENT_PLANE_Y = SURFACE_Y + 0.06;

/**
 * An invisible ground plane that captures the placement drag. Only mounted while
 * placing; a pointer drag across it moves the ghost, snapped to the tile grid. It
 * is `aria-hidden` decoration — the DOM roster carries all semantics.
 */
function PlacementPlane({
  radius,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  radius: number;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  onDragMove: (event: ThreeEvent<PointerEvent>) => void;
  onDragEnd: () => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  return (
    <mesh
      position={[0, PLACEMENT_PLANE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onDragStart(event);
        invalidate();
      }}
      onPointerMove={(event) => {
        onDragMove(event);
        invalidate();
      }}
      onPointerUp={() => {
        onDragEnd();
        invalidate();
      }}
    >
      <planeGeometry args={[radius * 6, radius * 6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/**
 * An invisible ground plane that captures the ROAD paint drag. Only mounted while
 * painting; pressing and dragging across it reports every whole cell the pointer
 * crosses (a road tile is 1×1, so the containing cell is `floor(world / GRID_CELL)`),
 * which the surface accumulates into the draft path. A single click paints one cell.
 * `aria-hidden` decoration — the DOM roster + running-cost bar carry the semantics.
 */
function RoadPaintPlane({
  radius,
  onPaintCell,
}: {
  radius: number;
  onPaintCell: (col: number, row: number) => void;
}) {
  const paintingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  const paintAt = useCallback(
    (point: THREE.Vector3) => {
      const col = Math.floor(point.x / GRID_CELL);
      const row = Math.floor(point.z / GRID_CELL);
      const key = `${col},${row}`;
      if (key !== lastCellRef.current) {
        lastCellRef.current = key;
        onPaintCell(col, row);
      }
    },
    [onPaintCell],
  );

  return (
    <mesh
      position={[0, PLACEMENT_PLANE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        paintingRef.current = true;
        lastCellRef.current = null;
        paintAt(event.point);
        invalidate();
        const onWindowUp = () => {
          paintingRef.current = false;
          window.removeEventListener("pointerup", onWindowUp);
          window.removeEventListener("pointercancel", onWindowUp);
        };
        window.addEventListener("pointerup", onWindowUp);
        window.addEventListener("pointercancel", onWindowUp);
      }}
      onPointerMove={(event) => {
        if (paintingRef.current) {
          paintAt(event.point);
          invalidate();
        }
      }}
    >
      <planeGeometry args={[radius * 6, radius * 6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/**
 * An invisible ground plane that captures a WINTER cell pick — where a fire goes.
 *
 * The same shape as `RoadPaintPlane` and `PlacementPlane` deliberately, and for the same
 * reason: this is the third thing the player aims at a cell, so it uses the machinery the
 * other two already established (one plane, `floor(world / GRID_CELL)`, a stopped-propagation
 * click) rather than a fourth way of turning a pointer into a cell. A single click, not a
 * drag: a fire is one declaration, and the coverage it would buy is previewed from the picked
 * cell rather than chased under the pointer, so what is shown is the choice being considered.
 */
function WinterAimPlane({
  radius,
  onAimCell,
}: {
  radius: number;
  onAimCell: (col: number, row: number) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <mesh> is a react-three-fiber 3D object, not a DOM element. The whole canvas is aria-hidden decoration; the winter's own keyboard-operable declare panel is the accessible way to aim a fire.
    <mesh
      position={[0, PLACEMENT_PLANE_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onAimCell(
          Math.floor(event.point.x / GRID_CELL),
          Math.floor(event.point.z / GRID_CELL),
        );
        invalidate();
      }}
    >
      <planeGeometry args={[radius * 6, radius * 6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function initialCameraPosition(layout: CityLayout): [number, number, number] {
  const [tx, ty, tz] = layout.cameraTarget;
  const az = VILLAGE_CAMERA.azimuthAngle;
  const polar = VILLAGE_CAMERA.polarAngle;
  const r = layout.cameraDistance;
  const s = Math.sin(polar) * r;
  return [tx + s * Math.sin(az), ty + Math.cos(polar) * r, tz + s * Math.cos(az)];
}

/** Frames the camera home + saves it so the recenter control returns exactly here. */
function CameraRig({
  controlsRef,
  target,
}: {
  controlsRef: RefObject<OrbitControlsLike | null>;
  target: readonly [number, number, number];
}) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    controls.target.x = target[0];
    controls.target.y = target[1];
    controls.target.z = target[2];
    controls.update();
    controls.saveState?.();
  }, [controlsRef, target]);
  return null;
}

/**
 * One-shot Presenter framing after the demonstrated target is placed through the real Build menu.
 *
 * This deliberately changes no learner camera rule: the prop that mounts it exists only on the
 * Presenter adapter. It preserves the shipped azimuth and fixed tilt, moves the orbit target to
 * the building, and uses the controls' normal closest gameplay distance. Stage changes do not
 * re-run it, so foundation, construction, and completion are compared from one camera.
 */
function PresenterBuildingCamera({
  controlsRef,
  nodeId,
  target,
  distance,
}: {
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
  readonly nodeId: string;
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly distance: number;
}) {
  const appliedRef = useRef("");
  useEffect(() => {
    const controls = controlsRef.current;
    const key = `${nodeId}:${target.x}:${target.z}`;
    if (!controls || appliedRef.current === key) {
      return;
    }
    const position = controls.object.position;
    const dx = position.x - controls.target.x;
    const dy = position.y - controls.target.y;
    const dz = position.z - controls.target.z;
    const currentDistance = Math.hypot(dx, dy, dz) || 1;
    const nextDistance = Math.max(distance, controls.minDistance);
    const scale = nextDistance / currentDistance;
    controls.target.x = target.x;
    controls.target.y = target.y;
    controls.target.z = target.z;
    position.x = target.x + dx * scale;
    position.y = target.y + dy * scale;
    position.z = target.z + dz * scale;
    controls.update();
    appliedRef.current = key;
  }, [controlsRef, distance, nodeId, target.x, target.y, target.z]);
  return null;
}

/**
 * **WHICH FRAMING THE ISLAND IS DRAWN IN, and it is exactly one of two.**
 *
 * `cityFraming.ts` frames the whole island into the whole canvas, which is the DEFAULT and the
 * reason the island fits a 1024x580 window at all. `winterFraming.ts` frames the settlement into
 * the strip a crisis panel leaves free. They answer different questions, so a crisis REPLACES the
 * default rather than composing with it — see `winterFraming.ts` on why maxing the two zooms
 * hands back the picture the lead rejected. If the crisis refuses (phone width, where there is no
 * strip to frame into), the default is what is left, which is strictly better than nothing.
 *
 * The reasoning is those two modules'; what this component owns is when it applies. Three things
 * make it safe to key on nothing but the inputs below and the canvas size:
 *
 *  - it is the PROJECTION and not the camera, so `MapControls` keeps the player's target,
 *    distance and heading and there is nothing to restore beyond clearing the offset. That is
 *    what makes it obey `CityScene`'s rule that no state change may reset the player's
 *    pan/zoom/orbit: a crisis opening or closing moves no control;
 *  - it re-runs on a resize, because `fullWidth`/`fullHeight` are in the frame's own pixels and
 *    R3F's own resize handler calls `updateProjectionMatrix` with whatever offset is set;
 *  - the distance both framings read is the LAYOUT's, not the live dolly, so a player zooming
 *    changes what they see without the frame re-fitting itself under them.
 */
export const INTRUSION_PANEL_CAP = 350;
export const INTRUSION_PANEL_GUTTER = 12;

export function intrusionPanelReach(view: { readonly width: number }): number {
  return (
    Math.min(INTRUSION_PANEL_CAP, Math.max(0, view.width - INTRUSION_PANEL_GUTTER * 2)) +
    INTRUSION_PANEL_GUTTER
  );
}

export function cityFrameFor(input: {
  readonly view: { readonly width: number; readonly height: number };
  readonly layout: CityLayout;
  readonly fov: number;
  /** A crisis panel is over the island, so the settlement's fit takes the frame. */
  readonly winter: boolean;
  /** The Intrusion uses the same side fit, plus a phone-stage lift. */
  readonly intrusion?: boolean;
  /** How far the settlement reaches, which is what the crisis fit is sized by. */
  readonly winterFitRadius: number;
  readonly crisisPanel?: {
    readonly side: "left" | "right";
    readonly reach: number;
  } | null;
  readonly presenterReferenceEra?: EraId | null;
}): CityFraming | null {
  const { view, layout, fov } = input;
  if (input.intrusion && view.width <= 560) {
    return { offsetX: 0, lift: view.height * 0.3, zoom: 0.62 };
  }
  const panel =
    input.crisisPanel ??
    (input.winter || input.intrusion
      ? input.intrusion
        ? {
            side: "right" as const,
            reach: intrusionPanelReach(view),
          }
        : { side: "left" as const }
      : null);
  const crisis = panel
    ? winterFraming({
        view,
        fitRadius: input.winterFitRadius,
        distance: layout.cameraDistance,
        fov,
        panelReach: "reach" in panel ? panel.reach : undefined,
        minimumZoom: input.intrusion ? 0.62 : 1,
      })
    : null;
  if (crisis) {
    return {
      offsetX: panel?.side === "right" ? -crisis.offsetX : crisis.offsetX,
      lift: 0,
      zoom: crisis.zoom,
    };
  }
  const presenter =
    input.presenterReferenceEra === null || input.presenterReferenceEra === undefined
      ? null
      : referencePresenterFraming(input.presenterReferenceEra, view);
  if (presenter !== null) {
    return presenter;
  }
  /*
   * THE FIT FOLLOWS THE LAND AND THE DISTANCE DOES NOT, which is the whole of how a growing
   * island stays inside the frame without the camera moving. `cameraDistance` is left at the
   * layout's — the camera really is where it was — and only the radius being fitted grows, so
   * the widening is paid for entirely by the projection. That is also what makes the growth
   * VISIBLE rather than scale-invariant: a camera dollied out in proportion would frame a
   * grown island to the same picture (`cityFraming.browser.test.tsx` asserts exactly that), so
   * nothing on screen would read as more land. Held still, the buildings and the crowd keep
   * their world size while the shore travels out past them.
   */
  return islandFraming({
    view,
    layout,
    fov,
  });
}

function CityFrame({
  winter,
  crisisPanelSide,
  intrusion,
  layout,
  fov,
  winterFitRadius,
  presenterReferenceEra,
}: {
  winter: boolean;
  crisisPanelSide: "right" | null;
  intrusion: boolean;
  layout: CityLayout;
  fov: number;
  winterFitRadius: number;
  presenterReferenceEra: EraId | null;
}) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const apply = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }
    const view = { width: size.width, height: size.height };
    const crisisPanel =
      crisisPanelSide === null
        ? null
        : { side: crisisPanelSide, reach: plaguePanelReach(view) };
    applyCityFraming(
      camera,
      cityFrameFor({
        view,
        layout,
        fov,
        winter,
        intrusion,
        winterFitRadius,
        crisisPanel,
        presenterReferenceEra,
      }),
      view,
    );
  }, [
    camera,
    crisisPanelSide,
    fov,
    intrusion,
    layout,
    presenterReferenceEra,
    size.height,
    size.width,
    winter,
    winterFitRadius,
  ]);

  useEffect(() => {
    apply();
    return () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.clearViewOffset();
      }
    };
  }, [apply, camera]);

  return null;
}

/**
 * Drives the elastic return. While the pointer is down the player owns the camera,
 * so this does nothing; once they let go it eases any pan/zoom overscroll back onto
 * its bound over a few frames.
 *
 * Under reduced motion there is never any overscroll to return from (the allowances
 * are `0`, so the camera stopped dead at the bound), which makes this a no-op
 * without needing to check the preference again here.
 */
function CameraSettle({
  controlsRef,
  draggingRef,
  panBound,
  distanceLimits,
  enabled,
}: {
  controlsRef: RefObject<OrbitControlsLike | null>;
  draggingRef: RefObject<boolean>;
  panBound: number;
  distanceLimits: { min: number; max: number };
  enabled: boolean;
}) {
  useFrame((_state, delta) => {
    if (!enabled || draggingRef.current) {
      return;
    }
    const controls = controlsRef.current;
    if (controls) {
      // Clamp `delta` so a backgrounded tab that resumes with a huge frame time
      // teleports rather than overshooting the bound in one step.
      settleControlsToBounds(controls, panBound, Math.min(delta, 0.1), distanceLimits);
    }
  });
  return null;
}

/**
 * CoC-style build grid — shown only while placing. Its lines sit on the FINE
 * per-cell boundaries (`GRID_CELL` pitch), so a building snaps and reads against
 * the dense cell grid and a footprint spans however many cells it owns. A soft warm
 * accent every few cells adds depth without clutter.
 */
function BuildGrid({ layout, eraId }: { layout: CityLayout; eraId: EraId }) {
  const grid = useMemo(
    () => buildActivePlacementGrid(islandGround(eraId).tones, layout.buildableRadius),
    [eraId, layout.buildableRadius],
  );
  useDisposableGraph(grid);
  return <primitive object={grid} />;
}

/**
 * Projects the selected building's world `anchor` to screen space every frame and
 * writes the popup's CLAMPED on-screen box straight onto its element's style (no
 * React re-render per frame), so the DOM popup stays glued to the building as the
 * camera pans / orbits / zooms — the Clash-of-Clans "info bubble tracks the building"
 * feel. The popup element itself lives in `CitySurface` (outside this aria-hidden
 * canvas) so it stays in the accessible DOM and renders even with no WebGL.
 *
 * Keeps it on-screen the way the coach-mark tooltips do (see `coachmarks/Tooltip`):
 * it measures the card, centers it over the building, then clamps fully inside the
 * viewport and flips ABOVE→BELOW when there is no room up top — writing `--tail-x`
 * (so the tail keeps pointing at the building after clamping) and `data-flip`. When
 * the anchor drifts fully off-screen (or swings behind the camera) it is flagged
 * `data-offscreen` so CSS hides it instead of stranding it at an edge.
 */
function CalloutTracker({
  anchor,
  targetRef,
}: {
  anchor: CalloutAnchor;
  targetRef: RefObject<HTMLDivElement | null>;
}) {
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const projected = useRef(new THREE.Vector3());
  const viewSpace = useRef(new THREE.Vector3());
  const bounds = useRef(new THREE.Box3());

  useFrame((state) => {
    const el = targetRef.current;
    if (!el) {
      return;
    }
    const a = anchorRef.current;
    const { camera, size, scene } = state;

    // Anchor at the building's LIVE roofline: measure the rendered model's
    // world-space top so the popup hugs the site / construction / built model at
    // whatever height it currently is (heights differ per stage + per building),
    // instead of a fixed guess. Falls back to a constant until the mesh is ready.
    // A road tile has no model to measure, so it supplies its own (ground-level)
    // height and the popup floats just over the tile instead of high above it.
    let topY = a.anchorY ?? CALLOUT_FALLBACK_TOP_Y;
    const model = a.nodeId === null ? null : scene.getObjectByName(`building-${a.nodeId}`);
    if (model) {
      bounds.current.setFromObject(model);
      if (Number.isFinite(bounds.current.max.y)) {
        topY = bounds.current.max.y;
      }
    }
    const anchorY = topY + CALLOUT_TOP_MARGIN;

    // "In front of the camera" test in view space (the camera looks down -Z), so a
    // building swung behind the camera never projects to a bogus on-screen point.
    viewSpace.current.set(a.x, anchorY, a.z).applyMatrix4(camera.matrixWorldInverse);
    const inFront = viewSpace.current.z < 0;
    projected.current.set(a.x, anchorY, a.z).project(camera);
    const px = (projected.current.x * 0.5 + 0.5) * size.width;
    const py = (-projected.current.y * 0.5 + 0.5) * size.height;

    // Hide (rather than strand at an edge) when the building is behind the camera or
    // its anchor has drifted fully off-screen.
    const onScreen =
      inFront &&
      px >= -CALLOUT_HIDE_MARGIN &&
      px <= size.width + CALLOUT_HIDE_MARGIN &&
      py >= -CALLOUT_HIDE_MARGIN &&
      py <= size.height + CALLOUT_HIDE_MARGIN;
    el.dataset.tracked = "true";
    if (!onScreen) {
      el.dataset.offscreen = "true";
      return;
    }

    // Center the measured card over the building, then clamp it fully inside view.
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxLeft = Math.max(CALLOUT_SCREEN_MARGIN, size.width - w - CALLOUT_SCREEN_MARGIN);
    const left = Math.min(Math.max(CALLOUT_SCREEN_MARGIN, px - w / 2), maxLeft);

    // Sit above the anchor; flip below when there isn't room up top.
    let flip: "above" | "below" = "above";
    let top = py - CALLOUT_TAIL_GAP - h;
    if (top < CALLOUT_SCREEN_MARGIN) {
      flip = "below";
      top = py + CALLOUT_TAIL_GAP;
    }
    const maxTop = Math.max(CALLOUT_SCREEN_MARGIN, size.height - h - CALLOUT_SCREEN_MARGIN);
    top = Math.min(Math.max(CALLOUT_SCREEN_MARGIN, top), maxTop);

    // Keep the tail pointing at the building even after the card was clamped sideways.
    const tailX = Math.min(Math.max(18, px - left), Math.max(18, w - 18));

    el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    el.style.setProperty("--tail-x", `${Math.round(tailX)}px`);
    el.dataset.flip = flip;
    el.dataset.offscreen = "false";
  });

  return null;
}

export default function CityScene({
  layout,
  placed,
  townHall = null,
  citizens = null,
  citizenSeed = 0,
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
  eraId = CURRENT_ERA_ID,
  ruinedNodeIds = NO_RUINED_NODES,
  ruinedCells = NO_RUINED_CELLS,
  suspendedCivicIds = NO_RUINED_NODES,
  relayState = null,
  frostStageByNodeId = NO_FROST_STAGES,
  frostStages = HARD_WINTER.damage.stages,
  shieldedNodeIds = NO_NODE_IDS,
  reinforceCandidates = NO_NODE_IDS,
  crisisThreatenedNodeIds = NO_NODE_IDS,
  winterRows = null,
  winterFires = NO_WINTER_FIRES,
  winterFirePreviewAt = null,
  onAimWinterCell,
  crisisGround = null,
  crisisWeather = null,
  crisisSidePanel = false,
  crisisPanelSide = null,
}: CitySceneProps) {
  // A hard winter is being played ON this island, which is weather and not a variant: the sky,
  // the fog, the four lights, every building's surface and the whole ground plane change, and
  // no building HUE does. Derived from the board rather than passed, so the picture and the
  // crisis cannot disagree about whether it is winter.
  const winter = winterRows !== null;
  /** The Intrusion owns the same island when its city projection is present. */
  const intrusion = relayState?.cityView !== undefined;
  /**
   * **THE CRISIS'S WEATHER, RESOLVED THROUGH THE REGISTRY RATHER THAN OFF ERA ONE'S CONSTANT.**
   *
   * `null` when no crisis is on the island, which is also the exit: the fair-weather sky, fog and
   * exposure come back because they were never overwritten, so there is no revert path here to
   * fall out of step with the entry. See `crisis/atmosphere.ts`.
   *
   * Keyed on `PLAYED_CRISIS_ERA` and not on the learner's era, because they are different
   * questions: `resolveCrisisEra` falls a city in any era back to the earliest era whose crisis is
   * built, so from era two onward the board's era and the learner's come apart. A second crisis
   * threads its own era in here.
   *
   * An explicit `crisisWeather` wins, which is how a crisis whose surface is not in the city loop
   * yet gets photographed under its own registered preset. Every shipped caller omits it, so every
   * shipped caller resolves exactly as before.
   */
  const atmosphere =
    crisisWeather ??
    (intrusion
      ? crisisAtmosphere("information_age")
      : winter
        ? crisisAtmosphere(PLAYED_CRISIS_ERA)
        : null);
  const islandEntry = useMemo(() => islandManifestEntry(eraId), [eraId]);
  const metricsPlacementIds = useMemo(
    () => placed.map((placement) => placement.nodeId),
    [placed],
  );
  const presenterBuildingTarget = useMemo(() => {
    if (presenterBuildingFocusNodeId === undefined) {
      return null;
    }
    const placement = placed.find(
      (candidate) => candidate.nodeId === presenterBuildingFocusNodeId,
    );
    if (!placement) {
      return null;
    }
    const center = transformCenter(placement, footprintFor(placement.nodeId));
    return {
      nodeId: placement.nodeId,
      x: center.x,
      y: layout.cameraTarget[1],
      z: center.z,
    };
  }, [layout.cameraTarget, placed, presenterBuildingFocusNodeId]);
  const hallDressing = crisisDressing(TOWN_HALL_ID, {
    winter: winter || crisisSidePanel,
    ruinedNodeIds,
    shieldedNodeIds,
    reinforceCandidates,
    crisisThreatenedNodeIds,
  });
  /**
   * The three sets the floating labels read while a crisis is on, or `null` in the ordinary city.
   *
   * The SAME sets `crisisDressing` takes, handed over rather than re-derived, so the caption over
   * a building and the badge on it are two readings of one board. `null` outside a winter is what
   * puts the skill names back with no revert path to fall out of step — see `SkillLabels`.
   */
  const crisisLabelBoard = useMemo(
    () =>
      winter
        ? {
            ruinedNodeIds,
            shieldedNodeIds,
            threatenedNodeIds: crisisThreatenedNodeIds,
          }
        : null,
    [winter, ruinedNodeIds, shieldedNodeIds, crisisThreatenedNodeIds],
  );
  const env = cityEnvironmentFor(variant, atmosphere);
  const panBound = layout.islandRadius * PAN_BOUND_RATIO;
  const committedRoads = roads ?? [];

  // What the crowd has to respect: the buildings standing on the ground, the hub they
  // gather outside, and the paths they prefer. The building being MOVED is absent from
  // `placed`, and citizens may therefore walk across the cells it is leaving — which is
  // correct, because nothing is standing there while it is in the air.
  const citizenPlacements = useMemo<PlacedTransform[]>(
    () => placed.map((p) => ({ nodeId: p.nodeId, col: p.col, row: p.row, rot: p.rot })),
    [placed],
  );
  const citizenHub = useMemo<PlacedTransform | null>(
    () =>
      townHall
        ? { nodeId: TOWN_HALL_ID, col: townHall.col, row: townHall.row, rot: townHall.rot }
        : null,
    [townHall],
  );
  const citizenRoadKeys = useMemo(
    () => new Set((roads ?? []).map((cell) => roadCellKey(cell.col, cell.row))),
    [roads],
  );
  const intrusionTargets = useMemo<readonly IntrusionWorldTarget[]>(() => {
    const cityView = relayState?.cityView;
    if (!cityView) {
      return [];
    }
    const byId = new Map(
      placed.map((placement) => [
        placement.nodeId,
        {
          nodeId: placement.nodeId,
          center: transformCenter(placement, footprintFor(placement.nodeId)),
          footprint: footprintFor(placement.nodeId),
          rotationY: rotationYFor(placement.rot),
        },
      ]),
    );
    if (townHall) {
      byId.set(TOWN_HALL_ID, {
        nodeId: TOWN_HALL_ID,
        center: transformCenter(townHall, footprintFor(TOWN_HALL_ID)),
        footprint: footprintFor(TOWN_HALL_ID),
        rotationY: rotationYFor(townHall.rot),
      });
    }
    return cityView.targets
      .map((target) => byId.get(target.nodeId))
      .filter((target): target is IntrusionWorldTarget => target !== undefined);
  }, [placed, relayState?.cityView, townHall]);
  const everydayRoster = citizens;
  // The crisis, as the crowd has to read it: which ground the frost holds and which it takes
  // when the round closes. Derived from the SAME rows `WinterGround` draws, so the people and
  // the ice cannot disagree about where the frost is — and re-derived whenever the rows change,
  // which is what makes the crowd's safe region follow the advance instead of a snapshot of it.
  const citizenShelter = useMemo(() => shelterGround(winterRows), [winterRows]);

  // Every captionable building, including the hub. In ordinary play the hub earns its measured
  // Town Hall nameplate; in crisis the same one target carries its status instead. A ruined hall
  // has no ordinary nameplate, but remains captionable while a live board
  // owns the roofline and needs to say FROZEN.
  const captionableBuildings = useMemo<PlacedTransform[]>(
    () => [
      ...placed.map((p) => ({ nodeId: p.nodeId, col: p.col, row: p.row, rot: p.rot })),
      ...(townHall?.model && (winter || !ruinedNodeIds.has(TOWN_HALL_ID))
        ? [
            {
              nodeId: TOWN_HALL_ID,
              col: townHall.col,
              row: townHall.row,
              rot: townHall.rot,
            },
          ]
        : []),
    ],
    [placed, townHall, winter, ruinedNodeIds],
  );

  // How far the settlement reaches, which is what the crisis framing has to keep on screen.
  // Computed from the placements already on the island (the hall included: the winter can ruin
  // it too, so it is part of what has to stay visible) rather than from the board's own radius —
  // see `winterFraming.ts` on why the whole-board fit was measured and rejected.
  const winterFitRadius = useMemo(
    () =>
      settlementRadius(
        [
          ...placed.map((p) => ({ nodeId: p.nodeId, col: p.col, row: p.row, rot: p.rot })),
          ...(townHall ? [{ nodeId: TOWN_HALL_ID, ...townHall, rot: townHall.rot }] : []),
        ],
        layout.buildableRadius,
      ),
    [placed, townHall, layout.buildableRadius],
  );

  /*
   * THE CAMERA IS CREATED ONCE, AND ITS FAR PLANE THEREFORE HAS TO COVER EVERY ERA.
   *
   * The original note here read "`layout` is a memoized constant, so this object keeps a fixed
   * identity … feeding it a stable `camera` guarantees the camera is created ONCE and never
   * re-seeded to home". The conclusion is right and the mechanism is stronger than that, which
   * matters now that the layout DOES move — once per era advance, since `CitySurface` derives it
   * from the standing era's land. Read at `@react-three/fiber`'s own `configure`:
   *
   *     if (!state.camera || (state.camera === lastCamera && !is.equ(lastCamera, cameraOptions)))
   *
   * `state.camera` is the live `PerspectiveCamera` and `lastCamera` is the OPTIONS OBJECT last
   * passed, so for a plain-options camera the two can never be equal and the branch is dead
   * after the first configure. A changed options object cannot re-seed the camera, which is what
   * keeps the player's pan, zoom and orbit through an advance.
   *
   * The cost is that `near`/`far` are also fixed at mount, so a per-era far plane would be a
   * number the live camera never receives — a guard that measured it would be measuring
   * something the product does not do. So it is sized for the LARGEST island the game will ever
   * draw (`ISLAND_GROWTH_CEILING`), which is correct in every era, and it costs era one
   * essentially nothing: `depthPrecision.test.ts` measures that widening `far` alone moves the
   * road layer's headroom by under 1%, because `1/near` dominates `1/near - 1/far`.
   */
  const cameraConfig = useMemo(
    () => ({
      position: initialCameraPosition(layout),
      fov: 32,
      // Depth range sized to the distances this camera actually reaches, NOT left at
      // three's 0.1 default — see VILLAGE_CAMERA.nearPlane for why that default made
      // the road layer z-fight at full zoom-out, and depthPrecision.test.ts for the
      // margin these two values have to keep.
      near: VILLAGE_CAMERA.nearPlane,
      far: ISLAND_GROWTH_CEILING * VILLAGE_CAMERA.farPlaneRatio,
    }),
    [layout],
  );

  // The camera's play area is ELASTIC, not a wall: a drag past the island bound (or
  // a dolly past the zoom limits) resists and then settles back on release. Under
  // reduced motion every allowance below is 0, which collapses the elastic paths in
  // `applyOrbit` into exactly the hard clamp that shipped before — the accessibility
  // rule is expressed as "no give" rather than as a separate branch (Art Bible §11).
  const trueDistanceLimits = useMemo(
    () => ({
      min: layout.cameraDistance * VILLAGE_CAMERA.minDistanceRatio,
      max: layout.cameraDistance * VILLAGE_CAMERA.maxDistanceRatio,
    }),
    [layout],
  );
  const panOverscroll = overscrollAllowance(
    panBound,
    VILLAGE_CAMERA.panOverscrollRatio,
    reducedMotion,
  );
  const zoomOverscrollOut = overscrollAllowance(
    trueDistanceLimits.max,
    VILLAGE_CAMERA.zoomOverscrollRatio,
    reducedMotion,
  );
  const zoomOverscrollIn = overscrollAllowance(
    trueDistanceLimits.min,
    VILLAGE_CAMERA.zoomOverscrollRatio,
    reducedMotion,
  );

  const elastic = panOverscroll > 0 || zoomOverscrollOut > 0;

  // Where the camera sat at the end of the previous change, so resistance applies to
  // just this frame's outward travel rather than to accumulated pointer distance.
  const lastRef = useRef<{ x: number; z: number; distance: number } | null>(null);
  // The player owns the camera while the pointer is down; the settle only runs after.
  // (Distinct from the ghost-placement `draggingRef` further down — different drag.)
  const cameraDraggingRef = useRef(false);
  // Camera gestures and imperative controls keep native cadence until damping settles.
  const cameraUrgentUntilRef = useRef(0);

  const handleControlsStart = useCallback(() => {
    cameraDraggingRef.current = true;
    cameraUrgentUntilRef.current = Number.POSITIVE_INFINITY;
    const controls = controlsRef.current;
    if (controls) {
      lastRef.current = {
        x: controls.target.x,
        z: controls.target.z,
        distance: controlsDistance(controls),
      };
    }
  }, [controlsRef]);

  const handleControlsEnd = useCallback(() => {
    cameraDraggingRef.current = false;
    cameraUrgentUntilRef.current = performance.now() + 250;
  }, []);

  const handleControlsChange = useCallback(() => {
    if (!cameraDraggingRef.current) {
      cameraUrgentUntilRef.current = performance.now() + 250;
    }
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    if (!elastic) {
      clampControlsToBounds(controls, panBound);
      return;
    }
    const previous = lastRef.current;
    if (previous) {
      resistControlsPan(controls, previous, panBound, panOverscroll);
      resistControlsZoom(
        controls,
        previous.distance,
        trueDistanceLimits,
        // The two limits are different magnitudes, so which allowance applies
        // depends on which one is being pushed against.
        controlsDistance(controls) > trueDistanceLimits.max
          ? zoomOverscrollOut
          : zoomOverscrollIn,
      );
    } else {
      // No prior frame to measure against (first move after mount): just make sure
      // we are inside the elastic envelope, and let the settle pull us home.
      clampControlsToBounds(controls, panBound, panOverscroll);
    }
    lastRef.current = {
      x: controls.target.x,
      z: controls.target.z,
      distance: controlsDistance(controls),
    };
  }, [
    controlsRef,
    elastic,
    panBound,
    panOverscroll,
    zoomOverscrollIn,
    zoomOverscrollOut,
    trueDistanceLimits,
  ]);

  const ghostFootprint: Footprint = placement
    ? footprintFor(placement.nodeId)
    : DEFAULT_FOOTPRINT;

  // Occupancy of every already-placed building AND the Town Hall (excludes the
  // in-progress one — a moving skill is dropped from `placed`, and a moving hall is
  // passed as a null `townHall`, so the active ghost never collides with itself)
  // UNION every committed road cell. A building/hall may not drag onto a road and a
  // road may not sit under either — roads, buildings, and the hub are all mutually
  // exclusive, mirroring the surface's + session's validity.
  const occupants = useMemo(() => {
    const all = placed.map(
      (p): PlacedTransform => ({ nodeId: p.nodeId, col: p.col, row: p.row, rot: p.rot }),
    );
    if (townHall) {
      all.push({
        nodeId: TOWN_HALL_ID,
        col: townHall.col,
        row: townHall.row,
        rot: townHall.rot,
      });
    }
    return all;
  }, [placed, townHall]);
  const occupied = useMemo(() => {
    const cells = occupiedCells(occupants);
    for (const road of committedRoads) {
      cells.add(`${road.col},${road.row}`);
    }
    return cells;
  }, [occupants, committedRoads]);

  /**
   * The buildings' own ground, WITHOUT the roads — which is why it is not `occupied` above.
   *
   * `WinterGround` skips a fire's held ground on these cells and on nothing else. A road is not
   * a building and a fire holding a paved cell is exactly as worth drawing as one holding bare
   * ground, so folding the two sets together would quietly punch the tan out of the settlement's
   * whole street plan. Memoised apart for that reason rather than for the frames it saves.
   */
  const buildingGround = useMemo(() => occupiedCells(occupants), [occupants]);

  // --- Fluid drag placement (progressive enhancement over the DOM roster) ----
  // The ghost target / rotation / validity live in refs so the drag animates at
  // frame rate without re-rendering; only discrete cell changes are pushed to the
  // surface (keeping keyboard, ARIA announcements, and reduced motion intact).
  const ghostTargetRef = useRef(new THREE.Vector3());
  const ghostRotRef = useRef(0);
  const ghostValidRef = useRef(true);
  const draggingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);

  // While not dragging, mirror the controlled placement transform in 3D (snap).
  // Safe to set during render: derived purely from props, never a re-render.
  if (!draggingRef.current && placement) {
    const center = transformCenter(placement, ghostFootprint);
    ghostTargetRef.current.set(center.x, 0, center.z);
    ghostRotRef.current = rotationYFor(placement.rot);
    ghostValidRef.current = placement.valid;
    lastCellRef.current = `${placement.col},${placement.row}`;
  }

  const updateFromPoint = useCallback(
    (point: THREE.Vector3) => {
      if (!placement) {
        return;
      }
      const fp = footprintFor(placement.nodeId);
      const snapped = snapToCell(point.x, point.z, fp, placement.rot);
      const transform = { ...snapped, rot: placement.rot };
      const center = transformCenter(transform, fp);
      ghostTargetRef.current.set(center.x, 0, center.z);
      // The FULL rule, not just the fit: a drag that would seal a neighbour in has to
      // turn the ghost rose here as well, or the 3D surface would offer a drop the bar
      // and the session both refuse. A whole-set flood fill measures 0.093 ms, which is
      // affordable once per pointermove on the one snapped cell (it would NOT be for an
      // 88-cell validity heatmap — hence the ghost cursor rather than a shaded grid).
      ghostValidRef.current =
        placementRefusal({
          candidate: { nodeId: placement.nodeId, ...transform },
          others: occupants,
          blockedCells: occupied,
          // The layout's own disc, which now follows its island — so a drag over ground beat
          // two opened turns the ghost green on the same cell the bar and the session accept.
          buildableRadius: layout.buildableRadius,
        }) === null;
      const key = `${snapped.col},${snapped.row}`;
      if (key !== lastCellRef.current) {
        lastCellRef.current = key;
        onHoverCell?.(snapped.col, snapped.row);
      }
    },
    [placement, occupants, occupied, onHoverCell, layout.buildableRadius],
  );

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleDragStart = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      draggingRef.current = true;
      updateFromPoint(event.point);
      const onWindowUp = () => {
        endDrag();
        window.removeEventListener("pointerup", onWindowUp);
        window.removeEventListener("pointercancel", onWindowUp);
      };
      window.addEventListener("pointerup", onWindowUp);
      window.addEventListener("pointercancel", onWindowUp);
    },
    [updateFromPoint, endDrag],
  );

  const handleDragMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (draggingRef.current) {
        updateFromPoint(event.point);
      }
    },
    [updateFromPoint],
  );

  const interactionOwnsCadence = placing || roadPainting || onAimWinterCell !== undefined;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={!reducedMotion && interactionOwnsCadence ? "always" : "demand"}
      camera={cameraConfig}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      // R3F only fires this for a genuine click that hit no eventful object (≤2px
      // move), never for a pan/orbit drag — so tapping empty ground/lagoon dismisses
      // the building popup while dragging the map keeps it up (and selected).
      onPointerMissed={() => onBackgroundTap?.()}
    >
      <CityAnimationScheduler
        active={!reducedMotion}
        busy={interactionOwnsCadence}
        urgentUntilRef={cameraUrgentUntilRef}
      />
      <color attach="background" args={[env.background]} />
      {/* Aerial-depth fog. The far plane is pushed well out (×20) so that at the
          raised max zoom-out (see VILLAGE_CAMERA.maxDistanceRatio) the whole island
          still reads clearly instead of washing out to fog, while distant sea keeps
          a gentle haze. Near is unchanged, so the default framing looks identical.
          A hard winter pulls BOTH in (see `WINTER_LIGHT.fog`) so the haze starts
          before the shore — but never past the dolly's worst-case view distance,
          which is the constraint the ×20 exists to satisfy and the reason the
          batch's own 24→68 could not be taken literally. */}
      <fog
        attach="fog"
        args={[
          atmosphere === null ? islandEntry.fog.color : env.fog,
          atmosphere === null
            ? islandEntry.fog.near
            : layout.islandRadius * atmosphere.fog.nearRatio,
          atmosphere === null
            ? islandEntry.fog.far
            : layout.islandRadius * atmosphere.fog.farRatio,
        ]}
      />
      <SceneExposure value={cityExposureForEra(eraId, atmosphere)} />
      {metricsTargetRef && (
        <SceneMetrics
          targetRef={metricsTargetRef}
          expectedPlacementIds={metricsPlacementIds}
          hallExpected={townHall?.model !== null && townHall?.model !== undefined}
        />
      )}

      <CityLighting
        islandRadius={layout.islandRadius}
        variant={variant}
        atmosphere={atmosphere}
      />

      {/* The island is procedural (no GLB) so it never suspends — kept in its own
          boundary so it stays visible no matter what a building is loading. It takes the
          ERA, because the ground is one of the four surfaces an advance re-dresses and under
          D-ERA32 it is the one that has to carry the age (`../islandGround.ts`). */}
      <Suspense fallback={null}>
        {/* ⚑ THE ISLAND MANIFEST'S ONE CONSUMER. `IslandFromManifest` draws Evan's model for an
            era whose row names one and mounts `StarterIsland` unchanged for every era that does
            not — which is all ten today. The dispatch is there rather than here so this file
            stays the scene graph and `islandManifest.ts` stays the handoff surface: dropping a
            finished island edits one manifest row and touches no rendering code.
            See docs/Island_Asset_Handoff.md. */}
        <IslandFromManifest layout={layout} reducedMotion={reducedMotion} eraId={eraId} />
      </Suspense>
      {/* Ground a crisis scarred, one tile per cell. Drawn straight after the island because
          that is what it is — ground — and it sits on the island's own depth ladder, below
          the road stack (see `SCAR_TOP`). Procedural, so it never suspends. */}
      <ScarredGround cells={ruinedCells} />
      {/* A crisis's own ground layer, already built, on the shared decal ladder. Drawn straight
          after the island for the same reason the scars are: it is ground. `null` on every
          caller that does not have one, which is all of them on the demo route. */}
      {crisisGround === null ? null : <primitive object={crisisGround} />}
      {/* The winter, on the ground the player built on. Above the road stack, because frost
          falls on paved cells too (see `winterCourseTop`) — and, since 2026-07-30, the whole
          snow course, the frozen lagoon, the trodden paths and the falling snow, all in this
          ONE layer rather than a second weather system beside it. The roads go in because the
          course buries them and the paths are what puts them back. Procedural, so it never
          suspends. */}
      {winterRows !== null && (
        <WinterGround
          rows={winterRows}
          fires={winterFires}
          firePreviewAt={winterFirePreviewAt}
          roadCells={committedRoads}
          /* Every cell a building stands on, so a fire's held ground is not drawn under one.
             `occupants` is the placements plus the hall and excludes the one being MOVED, which
             is right: nothing is standing on those cells while it is in the air. Reused rather
             than re-derived, and the FOOTPRINT rather than the anchor, because a 2x2 whose
             origin alone was skipped would wear tan under three of its four corners. */
          buildingCells={buildingGround}
          reducedMotion={reducedMotion}
        />
      )}
      {/* Committed roads render in every mode; the draft preview only while painting.
          Tiles are click-pickable only in the IDLE mode — during placement or road
          painting the ground planes own the pointer, so the road layer goes inert. */}
      <Roads
        roads={committedRoads}
        preview={roadPainting ? roadPreview : undefined}
        previewAffordable={roadPreviewAffordable}
        selected={selectedRoadTile}
        buildingCells={buildingGround}
        onSelectTile={placing || roadPainting ? undefined : onSelectRoadTile}
        eraId={eraId}
      />
      {/* Traffic, on the roads and only on the roads. Drawn straight after the layer it
          rides so it inherits that stack's top course as its surface, and given the
          COMMITTED set rather than the union: a preview tile is not a road yet, so nothing
          rides a path the player is still drafting. Procedural, so it never suspends, and
          inert to the pointer — a vehicle is decoration and gates nothing. It stands down on
          a crisis board, for the two reasons `Vehicles`'s own `winter` prop records. */}
      <Vehicles
        roads={committedRoads}
        eraId={eraId}
        reducedMotion={reducedMotion}
        winter={winter || intrusion || crisisSidePanel}
      />
      {(placing || roadPainting) && <BuildGrid layout={layout} eraId={eraId} />}
      {placing && (
        <PlacementPlane
          radius={layout.islandRadius}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={endDrag}
        />
      )}
      {roadPainting && onPaintRoadCell && (
        <RoadPaintPlane radius={layout.islandRadius} onPaintCell={onPaintRoadCell} />
      )}
      {/* Aiming a fire owns the ground click, exactly as placing and painting do, and only
          while it is asked for — so nothing about the idle city changes. */}
      {onAimWinterCell && !placing && !roadPainting && (
        <WinterAimPlane radius={layout.islandRadius} onAimCell={onAimWinterCell} />
      )}
      {/* Each placed building gets its OWN Suspense boundary so a NEW placement's
          first GLB (or any per-building load) only delays THAT building — the rest
          of the city and the island stay fully visible. Advancing a stage/mastery
          re-renders just this node in place (stable `key`), and its internal
          per-layer boundaries keep the current stage up while the next one loads,
          so nothing else blinks. A single shared boundary here was the old bug: any
          uncached GLB hid the entire scene until it resolved (the "screen refresh"). */}
      {placed.map((p) => {
        const dressing = crisisDressing(p.nodeId, {
          winter: winter || crisisSidePanel,
          ruinedNodeIds,
          shieldedNodeIds,
          reinforceCandidates,
          crisisThreatenedNodeIds,
        });
        return (
          <Suspense key={p.nodeId} fallback={null}>
            <PlacedBuilding
              nodeId={p.nodeId}
              center={transformCenter(p, footprintFor(p.nodeId))}
              rotationY={rotationYFor(p.rot)}
              footprint={footprintFor(p.nodeId)}
              model={p.model}
              mastery={p.mastery}
              reducedMotion={reducedMotion}
              celebrateToken={p.celebrateToken}
              // Still rendered, still named, still selectable — only drawn differently.
              ruined={ruinedNodeIds.has(p.nodeId)}
              frostStage={frostStageByNodeId.get(p.nodeId) ?? 0}
              frostStages={frostStages}
              winter={winter}
              crisisStatus={dressing.status}
              onSelect={() => onSelect(p.nodeId)}
            />
          </Suspense>
        );
      })}
      {relayState !== null &&
        (() => {
          const relayPlacement = placed.find(
            (placement) => placement.nodeId === relayState.placementId,
          );
          return relayPlacement ? (
            <RelayFixture
              center={transformCenter(relayPlacement, footprintFor(relayPlacement.nodeId))}
              rotationY={rotationYFor(relayPlacement.rot)}
              footprint={footprintFor(relayPlacement.nodeId)}
              state={relayState}
            />
          ) : null;
        })()}
      {/* The island HUB — its own component (completion-driven stage, no mastery
          stars), on its own Suspense boundary so its GLB never delays the rest. */}
      {townHall && (
        <Suspense fallback={null}>
          <TownHall
            center={transformCenter(townHall, footprintFor(TOWN_HALL_ID))}
            rotationY={rotationYFor(townHall.rot)}
            footprint={footprintFor(TOWN_HALL_ID)}
            eraId={eraId}
            model={townHall.model}
            reducedMotion={reducedMotion}
            celebrateToken={townHall.celebrateToken}
            // The winter can ruin the hub too (`ruinLessonAccess.test.tsx` ruins it), and it
            // is in the same `ruined_buildings` list, so it reads the same set.
            ruined={ruinedNodeIds.has(TOWN_HALL_ID)}
            winter={winter}
            crisisStatus={hallDressing.status}
            onSelect={() => onSelect(TOWN_HALL_ID)}
          />
        </Suspense>
      )}
      {relayState?.cityView && (
        <IntrusionCityLayer
          targets={intrusionTargets}
          view={relayState.cityView}
          reducedMotion={reducedMotion}
        />
      )}
      {/* The people who live here. Procedural (no GLB) so it never suspends, and drawn
          after the buildings so the city reads as a place that is USED rather than a
          set of models with figures added. Two instanced draws, no shadow pass, and no
          contact decal — nothing here goes anywhere near the ground depth ladder.

          On a crisis board they SHELTER rather than stand down: the same people, drawn in
          the same number, in the doorways of the buildings that are still standing — and out
          on the ring when no shelter had room, which is what makes the last frame of a winter
          a picture of how well it was played. `shelter` is `null` on every ordinary day and
          the crowd is untouched; `ruinedNodeIds` is what a ruin costs, since a wreck shelters
          nobody. See `citizenShelter.ts` for the ruling and the capacity rule. */}
      <Citizens
        roster={everydayRoster}
        placements={citizenPlacements}
        hub={citizenHub}
        roadCells={citizenRoadKeys}
        seed={citizenSeed}
        eraId={eraId}
        shelter={citizenShelter}
        ruinedNodeIds={ruinedNodeIds}
        reducedMotion={reducedMotion}
      />
      {/* The skill each building teaches, plus the Town Hall's anchored nameplate, floating
          above each measured roofline in the (aria-hidden) canvas host.

          WHILE A WINTER IS ON, EVERY CAPTION IS THE BUILDING'S STATUS — FROZEN, SHIELDED,
          IN DANGER or SAFE — and the population widens to `captionableBuildings`, which is
          the placements PLUS the hall. The frost takes the hall on the same terms as
          anything else, so a status caption owes it one; the skill graph is the right
          population for a skill name and the wrong one for this. See `CRISIS_LABEL_TEXT`.

          PRODUCT-DIRECTED PRESENTATIONS CAN STAND THE COMPLETE LAYER DOWN. Succession
          owns the whole island frame while it is in the city, so `skillLabelsStandDown`
          removes both ordinary names and status captions there. That is separate from
          the learner's display preference: `showSkillLabels` reaches `namesVisible`, where
          it hides ordinary names but leaves gameplay status captions mounted and visible.

          A SUSPENDED CIVIC BUILDING IS CAPTIONED WITH NO CRISIS ON THE ISLAND, which is the
          one caption here that is not about a live board: it is durable damage the city
          carries afterwards, and `placed` already holds the bought buildings, so the widening
          is the set below and nothing else. See `skillLabelTargets`. */}
      {!skillLabelsStandDown && (
        <SkillLabels
          placed={captionableBuildings}
          crisis={crisisLabelBoard}
          suspended={suspendedCivicIds}
          controlsRef={controlsRef}
          defaultCameraDistance={layout.cameraDistance}
          reducedMotion={reducedMotion}
          namesVisible={showSkillLabels}
          priorityNodeId={presenterBuildingFocusNodeId}
        />
      )}
      {/* NOT gated on `ghostModelUrl`. A node with no `built` GLB resolves it to null, and
          gating here drew no ghost at all for the 56 unmapped nodes the era roster made
          placeable — the same invisible-thing defect the placed building had.
          `GhostBuilding` previews the shared neutral built shell in that case. */}
      {placing && placement && (
        <GhostBuilding
          url={ghostModelUrl}
          nodeId={placement.nodeId}
          footprint={ghostFootprint}
          targetRef={ghostTargetRef}
          rotationRef={ghostRotRef}
          validRef={ghostValidRef}
          reducedMotion={reducedMotion}
        />
      )}

      <ContactShadows
        position={[0, SURFACE_Y + 0.02, 0]}
        scale={layout.islandRadius * 2.2}
        blur={2.6}
        far={16}
        opacity={0.34}
        color="#1d4b46"
        frames={reducedMotion ? 1 : Infinity}
      />

      <CameraRig controlsRef={controlsRef} target={layout.cameraTarget} />
      {/* The whole island sits in the frame by default, and in the strip the crisis panel
          leaves free while a crisis is running. The projection moves no camera and no world
          scale. */}
      <CityFrame
        winter={winter || crisisSidePanel}
        crisisPanelSide={crisisPanelSide}
        intrusion={intrusion}
        layout={layout}
        fov={cameraConfig.fov}
        winterFitRadius={winterFitRadius}
        presenterReferenceEra={presenterReferenceFraming ? eraId : null}
      />
      <CameraSettle
        controlsRef={controlsRef}
        draggingRef={cameraDraggingRef}
        panBound={panBound}
        distanceLimits={trueDistanceLimits}
        enabled={elastic}
      />
      <MapControls
        ref={(instance) => {
          controlsRef.current = instance as unknown as OrbitControlsLike | null;
        }}
        makeDefault
        // Orbit is ON, but the tilt is pinned: min = max polar locks the ~49°
        // angle so drag-rotate spins the azimuth only (full 360°, unconstrained).
        enableRotate
        minPolarAngle={VILLAGE_CAMERA.polarAngle}
        maxPolarAngle={VILLAGE_CAMERA.polarAngle}
        // During placement OR road painting, ground-drag moves the ghost / traces
        // the path instead of panning the camera.
        enablePan={!placing && !roadPainting}
        enableDamping={!reducedMotion}
        dampingFactor={VILLAGE_CAMERA.dampingFactor}
        screenSpacePanning={false}
        // The controls' own dolly limits are widened by the zoom overscroll so a
        // wheel/pinch can reach INTO the elastic zone at all; `handleControlsChange`
        // then resists inside it and `CameraSettle` returns it to the true limits
        // (`trueDistanceLimits`). Under reduced motion the allowance is 0, so these
        // collapse back onto the true limits and the dolly stops dead as before.
        minDistance={trueDistanceLimits.min - zoomOverscrollIn}
        maxDistance={trueDistanceLimits.max + zoomOverscrollOut}
        onStart={handleControlsStart}
        onEnd={handleControlsEnd}
        onChange={handleControlsChange}
      />
      {presenterBuildingTarget && (
        <PresenterBuildingCamera
          controlsRef={controlsRef}
          nodeId={presenterBuildingTarget.nodeId}
          target={presenterBuildingTarget}
          distance={trueDistanceLimits.min}
        />
      )}

      {calloutAnchor && calloutTargetRef && (
        <CalloutTracker anchor={calloutAnchor} targetRef={calloutTargetRef} />
      )}
    </Canvas>
  );
}
