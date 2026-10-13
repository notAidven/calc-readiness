import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ModelKind, ResolvedBuildingModel } from "../buildingAssets";
import { resolveBuildingModel } from "../buildingAssets";
import { isCivicPlacement } from "../civic";
import type { MasteryStars as MasteryStarsData } from "../masteryVisuals";
import { masteryStarsFor } from "../masteryVisuals";
import {
  FOOTPRINT_FILL,
  type Footprint,
  GRID_CELL,
  type GroundPoint,
  SURFACE_Y,
} from "../worldLayout";
import { BuildingFrostCrust } from "./BuildingFrostCrust";
import { type CrisisStatus, CrisisStatusMarker } from "./CrisisStatusMarker";
import {
  neutralBuiltModel,
  neutralConstructionModel,
  neutralSiteModel,
} from "./constructionStages";
import { earlyModernBuiltModel } from "./earlyModernBuildingModels";
import { batchStaticIslandGraph } from "./islandBatching";
import { MasteryStars } from "./MasteryStars";
import {
  applyFade,
  bindFadeMaterials,
  type GridworkPreparer,
  PLACED_PREPARATION,
  prepareGridworkModel,
  registerPreparedGeometry,
  registerPreparedMaterial,
  retainPreparedModel,
} from "./modelPreparation";
import { usePlacedBuildingPreload } from "./placedBuildingPreload";
import { ruinedStageModel } from "./ruinStage";
import { buildDrifts } from "./winterScene";

/**
 * One placed skill's building at a FREE grid transform (world center + quarter-turn
 * rotation), cross-fading between build stages. Every stage is the node's OWN GLB —
 * a `site` foundation, a `construction` scaffold, and the finished `built` model —
 * so a node builds up AS ITSELF. If a node is missing an early-phase GLB it falls
 * back to the SHARED neutral procedural foundation/scaffold (`constructionStages.ts`).
 *
 * Every stage (site → construction → built) is contain-fit to the node's OWN
 * footprint by ITS OWN bounding box (see `prepareModel`), so the empty lot and each
 * construction phase match the finished building's footprint — no stage ever renders
 * larger than the built building. Height is capped identically per stage. This is the
 * SAME sizing the placement ghost uses (`GhostBuilding`), so the preview and every
 * phase agree. Grounded flat on the grass, no pad, no bob. Full mastery renders the
 * normal `built` model — there is no gold-mastered stage and no gold body-tint.
 *
 * MASTERY STARS (option A, keyed to the building's mastery tier — `masteryVisuals.ts`):
 * once a building tops out, floating STARS ride above its roofline (0–3 of 3, gold +
 * celebratory at full mastery — see `MasteryStars`). That is the ONLY mastery visual a
 * building carries; there is no "comes alive" lit-windows / body-glow treatment.
 *
 * RUINED (`ruined`): a crisis wrecked this placement and nobody has repaired it, so the stack
 * draws the RUIN template (`ruinStage.ts`) in place of the build stage. It is a stage swap and
 * nothing else — the node, cell, footprint, group name and click handler are untouched, so a
 * ruin is still one click from its lesson, and a repair cross-fades back to the stage the
 * building was already at.
 *
 * DURING A CRISIS the stars step aside for `crisisStatus` (`CrisisStatusMarker`) on the
 * buildings the crisis is actually about: the ones the frost reaches this round, and the ones it
 * has already taken. A building it has not reached keeps its stars, because `crisisDressing`
 * hands `null` up for it, so the swap is scoped to the question a player has while a winter is
 * on rather than applied to the whole settlement. Mastery is not undone by a crisis: the ruling
 * stands, and a building that earned its stars is still wearing them the moment the crisis ends,
 * because the swap is on the PRESENCE of a status and the status goes away with the winter.
 *
 * SHIELDED IS NO LONGER DRAWN HERE AT ALL. It used to be geometry on the building — a storm roof
 * over the roof, with `shieldGhosted` drawing the same object see-through for the reinforce
 * preview — which is what let a shielded and threatened building say both facts on channels that
 * could not collide. The lead scrapped the roof on 2026-08-03 (*"scrap the shield youre using
 * completely - it doesnt need to have an actual shield over it other than an indicator over it
 * that says shielded"*), so the shield is a WORD one slot up now: `SkillLabels` captions the
 * building `SHIELDED`, and the overlap is resolved by ranking rather than by two channels — see
 * `crisisLabelState`, where a shield outranks a threat because a shield is spent before the
 * building is.
 *
 * Decorative pointer shortcut only — the keyboard-navigable DOM roster in
 * `CitySurface` is the semantic source of truth.
 */

const FADE_SECONDS = 0.32;

/**
 * Clone a stage model and CONTAIN-fit it to the node's OWN footprint by ITS OWN
 * ground box (so the site/construction/built stages each match the footprint and no
 * stage renders larger than the finished building), cap its height, ground it flat,
 * and revive materials.
 *
 * `frosted` puts the crisis's weather treatment on the clone (`winterFrost.ts`): every
 * material lerps toward the ice tone and up-facing faces take rime. It is applied HERE, after
 * the clone and instead of `reviveMaterial`, for two reasons — the clone is the only object
 * safe to write to (the loader caches one `gltf.scene` per URL and every instance shares its
 * materials), and the frost material subsumes what `reviveMaterial` does, so running both
 * would have the emissive lift fight the explicit "frost does not glow".
 */
export function prepareModel(
  scene: THREE.Object3D,
  footprint: Footprint,
  frosted = false,
  prepare: GridworkPreparer = prepareGridworkModel,
  buildingIdentity?: string,
): THREE.Object3D {
  return prepare(scene, footprint, {
    ...PLACED_PREPARATION,
    frosted,
    ...(buildingIdentity ? { buildingIdentity } : {}),
  });
}

/**
 * The WALL SPAN a drift banks against, in world units.
 *
 * The model is contain-fit to `FOOTPRINT_FILL` of its plot, so the wall the snow meets is the
 * fitted span rather than the plot itself. Taking the plot would float the drifts a fifth of a
 * cell off every wall — small in a number and unmissable at the shipped camera, where a gap
 * between snow and wall reads as the snow having been placed rather than fallen.
 */
function wallSpan(footprint: Footprint): { x: number; z: number } {
  return {
    x: footprint.w * GRID_CELL * FOOTPRINT_FILL,
    z: footprint.d * GRID_CELL * FOOTPRINT_FILL,
  };
}

/** Cross-fade one PREPARED stage object's opacity toward visible / hidden. */
export function FadeLayer({
  object,
  visible,
  reducedMotion,
  onHidden,
}: {
  object: THREE.Object3D;
  visible: boolean;
  reducedMotion: boolean;
  onHidden?: () => void;
}) {
  const opacityRef = useRef(visible ? 1 : 0);
  const hiddenRef = useRef(false);
  const fadeMaterials = useMemo(() => bindFadeMaterials(object), [object]);

  useEffect(() => {
    const releaseObject = retainPreparedModel(object);
    const preparedSource = object.userData.preparedSource as THREE.Object3D | undefined;
    const releaseSource =
      preparedSource === undefined ? undefined : retainPreparedModel(preparedSource);
    return () => {
      releaseObject();
      releaseSource?.();
    };
  }, [object]);

  useFrame((_, delta) => {
    const target = visible ? 1 : 0;
    if (reducedMotion) {
      opacityRef.current = target;
    } else {
      const step = Math.min(1, delta / FADE_SECONDS);
      opacityRef.current += (target - opacityRef.current) * step;
      if (Math.abs(target - opacityRef.current) < 0.01) {
        opacityRef.current = target;
      }
    }
    applyFade(fadeMaterials, opacityRef.current);
    if (!visible && opacityRef.current <= 0.02 && !hiddenRef.current) {
      hiddenRef.current = true;
      onHidden?.();
    }
  });

  return <primitive object={object} />;
}

function batchPreparedModel(prepared: THREE.Object3D): THREE.Group {
  const holder = new THREE.Group();
  holder.add(prepared);
  const batched = batchStaticIslandGraph(holder, {
    bakeSolidColors: true,
    deferIntermediateDisposal: true,
    singleShadowCaster: true,
  });
  batched.userData.preparedSource = prepared;
  batched.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    registerPreparedGeometry(batched, mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      registerPreparedMaterial(batched, material);
    }
  });
  for (const geometry of (batched.userData.deferredBatchGeometries ??
    []) as THREE.BufferGeometry[]) {
    registerPreparedGeometry(batched, geometry);
  }
  holder.remove(prepared);
  return batched;
}

/** A cross-fading GLB stage layer — the node's per-skill `built` model. */
function GlbFadeLayer({
  url,
  footprint,
  buildingIdentity,
  visible,
  reducedMotion,
  frosted,
  onHidden,
}: {
  url: string;
  footprint: Footprint;
  buildingIdentity?: string;
  visible: boolean;
  reducedMotion: boolean;
  frosted: boolean;
  onHidden?: () => void;
}) {
  const gltf = useGLTF(url);
  const object = useMemo(
    () =>
      batchPreparedModel(
        prepareModel(
          gltf.scene,
          footprint,
          frosted,
          prepareGridworkModel,
          buildingIdentity,
        ),
      ),
    [gltf.scene, footprint, frosted, buildingIdentity],
  );
  return (
    <FadeLayer
      object={object}
      visible={visible}
      reducedMotion={reducedMotion}
      onHidden={onHidden}
    />
  );
}

/**
 * A cross-fading PROCEDURAL stage layer — one of the shared, building-agnostic templates,
 * built to the node's footprint aspect and fit the same way (so a 1×2 site is rectangular, a
 * 1×1 site smaller).
 *
 * Three of the four are FALLBACKS, used when a node has no GLB for that phase: the neutral
 * foundation (`site`), the scaffold (`construction`) and the finished shell (`built`). The
 * fourth is not a fallback at all — `ruined` is how a building a crisis wrecked is drawn,
 * and it comes through here because a ruin IS just another stage of the same node
 * (`ruinStage.ts`).
 */
function ProceduralFadeLayer({
  stage,
  footprint,
  variantId,
  buildingIdentity,
  visible,
  reducedMotion,
  frosted,
  onHidden,
}: {
  stage: ProceduralStage;
  footprint: Footprint;
  variantId?: string;
  buildingIdentity?: string;
  visible: boolean;
  reducedMotion: boolean;
  frosted: boolean;
  onHidden?: () => void;
}) {
  // The RUIN is already the crisis's own asset, authored in the winter palette, so it is the
  // one template the weather treatment is withheld from — frosting it would tint snow that is
  // already snow and desaturate char that is meant to be char. The site and the scaffold are
  // warm parchment and timber and do take it.
  const frostThis = frosted && stage !== "ruined";
  const object = useMemo(
    () =>
      batchPreparedModel(
        prepareModel(
          proceduralStageModel(stage, footprint, variantId),
          footprint,
          frostThis,
          prepareGridworkModel,
          buildingIdentity,
        ),
      ),
    [stage, footprint, variantId, buildingIdentity, frostThis],
  );
  return (
    <FadeLayer
      object={object}
      visible={visible}
      reducedMotion={reducedMotion}
      onHidden={onHidden}
    />
  );
}

/**
 * **THE RUIN SELECTION SEAM.** The layer kinds a stage can be drawn as: the node's own GLB,
 * or one of the shared procedural templates. `"ruined"` joins the same union the early phases
 * are in rather than becoming a parallel axis, which is what makes going into ruins and being
 * repaired out of them ordinary stage changes — they cross-fade through `FadeLayer` exactly
 * like a build step, for free.
 */
type StageKind = ModelKind | "ruined";

/** The procedural (non-GLB) templates, and how each one is built. */
type ProceduralStage = Exclude<StageKind, "glb">;

function proceduralStageModel(
  stage: ProceduralStage,
  footprint: Footprint,
  variantId?: string,
): THREE.Object3D {
  switch (stage) {
    case "ruined":
      return ruinedStageModel(footprint);
    case "construction":
      return neutralConstructionModel(footprint);
    case "built":
      return (
        (variantId ? earlyModernBuiltModel(variantId) : null) ??
        neutralBuiltModel(footprint)
      );
    default:
      return neutralSiteModel(footprint);
  }
}

interface StageLayer {
  readonly id: number;
  readonly kind: StageKind;
  readonly url: string | null;
  readonly variantId?: string;
  readonly buildingIdentity?: string;
}

/** Only a completed procedural fallback receives the structural-overlay identity. */
export function completedBuildingIdentity(
  model: ResolvedBuildingModel,
  ruined: boolean,
): string | undefined {
  return !ruined && model.modelStage === "built" && model.kind !== "glb"
    ? model.node_id
    : undefined;
}

/**
 * The group holding ONLY the build-stage models, named so the thing every frame-placed dressing
 * is a function of can be found in a drawn scene.
 *
 * Worth a name for the reason `MASTERY_STARS_NAME` is: the storm roof, the crisis badge, the star
 * row and the damage crust are all placed off a live box, and none of them can be placed at all
 * until this group has one. `building-<nodeId>` is not a substitute — it also contains the snow
 * drifts and the shield's own banking, both of which have geometry at ground level, so it
 * measures a real box while the building inside it is still empty. A guard that waited on the
 * outer group would therefore wait for nothing, which is exactly how
 * `winterShieldAndThreat.browser.test.tsx` came to measure a storm roof that had not been placed.
 */
export const MODEL_STACK_NAME = "building-model-stack";

/** The stacked, cross-fading stage models, each contain-fit to the node's footprint. */
export function PlacedModelStack({
  model,
  footprint,
  reducedMotion,
  ruined = false,
  frosted = false,
}: {
  model: ResolvedBuildingModel;
  footprint: Footprint;
  reducedMotion: boolean;
  /**
   * A crisis has ruined this placement and nobody has repaired it yet, so it is drawn from
   * the ruin template INSTEAD of its build stage. The build stage is still what `model`
   * says — the ruin overrides how the node is drawn and never what it is — so a repair
   * cross-fades straight back to the stage the building was already at.
   */
  ruined?: boolean;
  /**
   * A hard winter is on the island, so every surface wears the crisis's frost treatment
   * (`winterFrost.ts`). WEATHER, and so unrelated to `frostStage` — that one says how hurt one
   * building is, this one says what season it is, and every building gets it at once.
   */
  frosted?: boolean;
}) {
  const [layers, setLayers] = useState<StageLayer[]>([]);
  const idRef = useRef(0);

  const kind: StageKind = ruined ? "ruined" : model.kind;
  const url = ruined ? null : model.url;
  const variantId = ruined ? undefined : model.variantId;
  const buildingIdentity = completedBuildingIdentity(model, ruined);

  useEffect(() => {
    setLayers((prev) => {
      const top = prev[prev.length - 1];
      if (
        top &&
        top.kind === kind &&
        top.url === url &&
        top.variantId === variantId &&
        top.buildingIdentity === buildingIdentity
      ) {
        return prev;
      }
      idRef.current += 1;
      const next = [...prev, { id: idRef.current, kind, url, variantId, buildingIdentity }];
      // Keep at most two layers (outgoing + incoming) for the cross-fade.
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });
  }, [kind, url, variantId, buildingIdentity]);

  const removeLayer = useCallback((id: number) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
  }, []);

  return (
    <>
      {layers.map((layer, index) => {
        const visible = index === layers.length - 1;
        const content =
          layer.kind === "glb" && layer.url ? (
            <GlbFadeLayer
              url={layer.url}
              footprint={footprint}
              buildingIdentity={layer.buildingIdentity}
              visible={visible}
              reducedMotion={reducedMotion}
              frosted={frosted}
              onHidden={() => removeLayer(layer.id)}
            />
          ) : (
            <ProceduralFadeLayer
              stage={layer.kind === "glb" ? "site" : layer.kind}
              footprint={footprint}
              variantId={layer.variantId}
              buildingIdentity={layer.buildingIdentity}
              visible={visible}
              reducedMotion={reducedMotion}
              frosted={frosted}
              onHidden={() => removeLayer(layer.id)}
            />
          );
        // Each stage layer suspends INDEPENDENTLY: an incoming stage's GLB loads
        // behind its own boundary (fallback null) while the outgoing stage — a
        // sibling layer that's already loaded — stays fully visible, so the
        // upgrade cross-fades in place instead of blanking the building. A shared
        // boundary here would hide the whole building (and, higher up, the whole
        // city) for the duration of the fetch — the old "screen refresh" flash.
        return (
          <Suspense key={layer.id} fallback={null}>
            {content}
          </Suspense>
        );
      })}
    </>
  );
}

/**
 * Whether this placement has real art to draw, which is the gate the whole component
 * hangs on: a node that is half-registered draws an EMPTY PAD rather than a stray
 * procedural block standing in for a building nobody authored.
 *
 * TWO REGISTRIES ANSWER THAT QUESTION, and for a while only one was asked. The check was
 * `resolveBuildingModel(nodeId, "built")` alone — the SKILL registry — which returns
 * `null` for every id that is not a `NUM.*` node. So when civic buildings became buyable,
 * a purchase went through, both capacity dials moved, the panel said `Content`, the
 * material was spent... and the building did not appear: the descriptor it had been handed
 * was discarded by a second lookup that could never succeed for it. Measured in the live
 * app, not reasoned about — `output/civic-standing-shot.mjs` photographed the empty grass.
 *
 * So the question is now asked of the DESCRIPTOR THIS PLACEMENT WAS GIVEN, with the skill
 * lookup kept as the answer for skill nodes. A civic building's art lives in
 * `civicBuildings.ts`, the hub's in `townHall.ts`, and a third registry would need no
 * change here.
 *
 * Exported so it is testable without a GPU: `PlacedBuilding` cannot be rendered in a
 * headless test, and the defect above was invisible to every test in the tree.
 */
export function renderableArtUrl(
  nodeId: string,
  model: ResolvedBuildingModel | null,
): string | null {
  const fromSkillRegistry = resolveBuildingModel(nodeId, "built")?.url ?? null;
  if (fromSkillRegistry !== null) {
    return fromSkillRegistry;
  }
  // Any other registry's descriptor, taken at its word — it resolved a bundled file, and
  // only a `"glb"` descriptor carries one (the procedural site/scaffold kinds do not).
  return model?.kind === "glb" ? model.url : null;
}

/**
 * Whether a placement can EARN mastery, which decides whether it gets a star rack at all.
 *
 * A bought civic building cannot: it has no lesson, no CFU, no practice set and no
 * `student_node_state` row, so there is nothing for a star to be earned by. Drawing it the
 * three empty stars a skill building carries at mastery 0 tells the learner to go and
 * practise something that does not exist — measured in the live app, where a bought
 * Smokehouse and Longhouse each stood under a full rack of grey stars
 * (`output/civic/stars/before-6-civic-closeup.png`).
 *
 * The rack is also where era one's RESERVED mastery gold lives: `MasteryStars` paints a
 * filled star `#FFB703`, which the style guide forbids on a civic building. An empty rack
 * over one is that colour a single fill rule away from the place it may not appear, so the
 * rack is refused rather than left standing and empty.
 *
 * Keyed on the id's CLASS rather than on a prop, because "can this earn mastery" is a fact
 * about what the thing is and not a decision the scene's caller should be able to get
 * wrong. The hub is the same kind of exception and already sidesteps this by having its own
 * component (`TownHall`, "no mastery stars").
 */
export function placementEarnsMastery(nodeId: string): boolean {
  return !isCivicPlacement(nodeId);
}

/**
 * THE star-rack decision for one placement, and the only one: `PlacedBuilding` renders
 * `MasteryStars` from exactly this and computes nothing of its own.
 *
 * It is a function rather than an expression inline in the component so the decision is
 * testable at all — `PlacedBuilding` needs a GPU, so nothing headless can render it, which
 * is how a rack over every bought building shipped without a single test going red. Its
 * Its two parts are separate questions: WHETHER this kind of building has mastery to show
 * ({@link placementEarnsMastery}) and, if so, WHAT its tier looks like right now
 * (`masteryStarsFor`, which withholds stars until the building has topped out).
 */
export function placementStars(
  nodeId: string,
  mastery: number,
  model: ResolvedBuildingModel | null,
): MasteryStarsData | null {
  if (!model || !placementEarnsMastery(nodeId)) {
    return null;
  }
  return masteryStarsFor(mastery, model.stage);
}

export function PlacedBuilding({
  nodeId,
  center,
  rotationY,
  footprint,
  model,
  mastery,
  reducedMotion,
  celebrateToken,
  ruined = false,
  frostStage = 0,
  frostStages = 0,
  winter = false,
  crisisStatus = null,
  onSelect,
}: {
  nodeId: string;
  center: GroundPoint;
  rotationY: number;
  footprint: Footprint;
  /** Resolved building model (its current build stage), or `null` (render nothing). */
  model: ResolvedBuildingModel | null;
  /** The building's mastery tier (0..3) — drives the floating stars. */
  mastery: number;
  reducedMotion: boolean;
  celebrateToken: number;
  /**
   * A crisis has ruined this placement (`crisis_damage.ruined_buildings`) and it has not been
   * repaired. Drawn from the ruin template instead of its build stage — and STILL this node's
   * building in every other respect: same cell, same footprint, same name on the group the
   * pointer hits, so it stays one click from its lesson.
   */
  ruined?: boolean;
  /**
   * How far the frost has climbed this building, `0` for none — `winterDamageStage`'s reading,
   * out of `frostStages`. Drawn as a shell OVER the build stage rather than instead of it
   * (`frostStage.ts`), because a damaged building is still recognisably itself and swapping its
   * geometry would say otherwise. Ignored while `ruined`, which has its own representation.
   *
   * The crust is a fraction of THIS building's rendered height, measured live off the stack by
   * `BuildingFrostCrust` rather than derived from the footprint: sized against
   * `MAX_BUILD_HEIGHT` it buried era one's two shortest buildings.
   */
  frostStage?: number;
  frostStages?: number;
  /**
   * A hard winter is on the island. WEATHER rather than damage: every building wears the frost
   * treatment and takes snow banked against its walls the moment the crisis is on, whether or
   * not the frost has reached it. `frostStage` is the orthogonal claim about THIS building.
   */
  winter?: boolean;
  /*
   * **THERE IS NO `shield` PROP, AND ITS ABSENCE IS A RULING (2026-08-03).** A reinforced
   * building wore a storm roof — an open timber frame lashed over its own — and the lead
   * scrapped it: *"scrap the shield youre using completely - it doesnt need to have an actual
   * shield over it other than an indicator over it that says shielded."* The indicator is the
   * building's floating label, which reads SHIELDED for as long as it is (`SkillLabels`), so the
   * fact is still on screen and it no longer costs the building its own silhouette. The
   * reinforce PREVIEW went with it: a ghost of a thing that is not drawn is nothing, and the
   * declare card names the building it is aimed at in words.
   */
  /**
   * About to be hit, or lost, while a crisis is on the island. Non-null REPLACES the mastery
   * stars for as long as that is true of this building; `null` leaves them exactly as they were,
   * which is every ordinary day AND every standing building the frost has not reached.
   */
  crisisStatus?: CrisisStatus | null;
  onSelect: () => void;
}) {
  const activeUrl = model?.kind === "glb" ? model.url : renderableArtUrl(nodeId, model);
  const contentRef = useRef<THREE.Group>(null);
  const stackRef = useRef<THREE.Group>(null);
  /** The dressed model, which is what the badge over it has to clear. */
  const dressedRef = useRef<THREE.Group>(null);
  const bounceRef = useRef(-1);

  // Warm only stages this placement can still reach. A restored built/advanced skill never
  // fetches obsolete site/construction bytes; a site still warms its whole forward path.
  usePlacedBuildingPreload(nodeId, model?.stage ?? "built", activeUrl, useGLTF.preload);

  // The star rack, or null for no rack at all — see `placementStars`, which owns the
  // whole decision (a bought civic building never gets one; a skill building gets one
  // once it has topped out, 0–3 filled, gold + celebratory at full mastery).
  const stars = placementStars(nodeId, mastery, model);

  // Snow banked against the four walls, plus the two corner wedges a heading between the axes
  // needs. Weather, so it lands on a ruin too — a ruin the snow had not reached would read as
  // having happened after the winter rather than during it.
  const drifts = useMemo(() => {
    if (!winter) {
      return null;
    }
    const span = wallSpan(footprint);
    return buildDrifts(span.x, span.z);
  }, [winter, footprint]);

  useEffect(() => {
    if (celebrateToken > 0 && !reducedMotion) {
      bounceRef.current = 0;
    }
  }, [celebrateToken, reducedMotion]);

  useFrame((_, delta) => {
    const group = contentRef.current;
    if (!group) {
      return;
    }
    let scale = 1;
    if (bounceRef.current >= 0) {
      bounceRef.current += delta / 0.5;
      if (bounceRef.current >= 1) {
        bounceRef.current = -1;
      } else {
        // A one-shot completion pop — scale only, never a vertical translation.
        scale = 1 + 0.16 * Math.sin(bounceRef.current * Math.PI);
      }
    }
    group.scale.setScalar(scale);
    group.position.y = 0;
  });

  /**
   * The pointer cursor is offered for EVERY placement, a bought civic building included,
   * and that is a decision rather than an oversight (2026-07-29).
   *
   * It was briefly the reverse: a civic building advertised a click whose only effect was
   * the false *"not built yet"* announcement, and a cursor promising that is worse than
   * no cursor at all. The click now selects the building and speaks what the purchase
   * bought — its livability and happiness, which no other per-building surface says, and
   * which the `aria-hidden` canvas cannot show. So the affordance is honest, and it stays.
   *
   * The alternative was to make a bought building INERT: no cursor, no handler. It was
   * rejected because a click that lands on a real object and produces nothing at all
   * reads as the app failing to register the input — the same argument the reachability
   * refusal makes in `announcements.ts` — and because the two capacities would then be
   * legible only in the City Life panel's pooled totals, where they cannot be attributed
   * to the building that provides them.
   *
   * What the click deliberately does NOT do is open a menu: `openLessonPopup` no-ops for
   * a civic id, correctly, because there is no lesson behind one.
   */
  const setCursor = (value: string) => {
    if (typeof document !== "undefined") {
      document.body.style.cursor = value;
    }
  };

  return (
    <group position={[center.x, SURFACE_Y, center.z]}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: <group> is a react-three-fiber 3D object, not a DOM element. The whole canvas is aria-hidden decoration; the keyboard-navigable DOM roster in CitySurface is the accessible control. */}
      <group
        // Named so the info-callout tracker can find this building and measure its
        // live roofline to glue the callout just above whatever stage it's at. Only
        // the model lives under this name, so its measured box excludes the stars.
        name={`building-${nodeId}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setCursor("pointer");
        }}
        onPointerOut={() => setCursor("auto")}
      >
        <group ref={contentRef} rotation={[0, rotationY, 0]}>
          {/* Gated on the RESOLVED STAGE alone. It used to also require this node's
              `built` GLB to exist, which silently drew nothing for a node with no art —
              survivable only while no such node could be placed. `resolveBuildingModel`
              now always resolves a stage (its own GLB, or the shared neutral template),
              so every placed node renders geometry and is therefore a raycast target the
              `onClick` above can fire from. */}
          <group ref={dressedRef}>
            {model && (
              <group ref={stackRef} name={MODEL_STACK_NAME}>
                <PlacedModelStack
                  model={model}
                  footprint={footprint}
                  reducedMotion={reducedMotion}
                  ruined={ruined}
                  frosted={winter}
                />
              </group>
            )}
          </group>
          {/* A SIBLING of the stack rather than a layer in it: nothing is being substituted,
              so there is nothing to cross-fade, and the building underneath stays exactly the
              stage it was at. Inside the named group, so a rimed building is as clickable as
              a clean one. It MEASURES the stack rather than being sized from the footprint,
              because how far the frost has climbed is a fraction of the building it is on and
              a fraction of the global height cap buried the two shortest ones. */}
          {!ruined && frostStage > 0 && frostStages > 0 && (
            <BuildingFrostCrust
              footprint={footprint}
              stage={frostStage}
              stages={frostStages}
              measureRef={stackRef}
            />
          )}
          {/* Drifts sit OUTSIDE the wall and the damage shell sits inside it, so the two are
              separated in plan as well as by what they mean: the shell climbs the wall, the
              drift spreads from its foot. */}
          {drifts && <primitive object={drifts} />}
        </group>
      </group>
      {/* Stars float above the roofline as a SIBLING of the named building group so
          they never inflate its measured box (the callout stays glued to the roof,
          not the stars). They billboard + camera-track on their own.

          WHERE A CRISIS HAS SOMETHING TO SAY ABOUT THIS BUILDING, the crisis badge has this slot
          instead, because one thing above a roofline reads and two never do. It measures
          `dressedRef` rather than `stackRef`, so on a shielded building it rides above the roof instead
          of through it. A winter with nothing to say about this building leaves the stars: that is
          the 2026-08-01 ruling that took the `safe` hexagon off. */}
      {crisisStatus !== null ? (
        <CrisisStatusMarker
          measureRef={dressedRef}
          status={crisisStatus}
          reducedMotion={reducedMotion}
        />
      ) : (
        model &&
        stars && (
          // MEASURED OFF THE DRESSED GROUP, exactly as the badge above is, and for a reason the
          // hexagon used to hide: a REINFORCED building keeps its stars now, and a storm roof
          // rises about 3.05u over the roofline it is bedded onto against `STAR_MARGIN`'s 2.6, so
          // stars measured off the bare model hang inside the gable. Photographed before this
          // line changed: one gold point showing through the roof of the shielded tower and the
          // rest of the row swallowed. Outside a crisis the two refs measure the same box, since
          // there is nothing dressing the building to measure.
          <MasteryStars
            measureRef={dressedRef}
            stars={stars}
            reducedMotion={reducedMotion}
          />
        )
      )}
    </group>
  );
}
