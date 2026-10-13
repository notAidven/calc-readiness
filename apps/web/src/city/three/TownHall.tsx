import type { EraId } from "@cr/skill-graph";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";

import type { ResolvedBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { TOWN_HALL_ID } from "../townHall";
import {
  FOOTPRINT_FILL,
  type Footprint,
  GRID_CELL,
  type GroundPoint,
  SURFACE_Y,
} from "../worldLayout";
import { type CrisisStatus, CrisisStatusMarker } from "./CrisisStatusMarker";
import { useDisposableGraph } from "./disposeSceneGraph";
import { MODEL_STACK_NAME, PlacedModelStack, prepareModel } from "./PlacedBuilding";
import { buildEraTownHallFallback } from "./EraTownHallFallback";
import { useTownHallPreload } from "./townHallPreload";
import { buildDrifts } from "./winterScene";

/** Keep the hub legible as a civic landmark without overpowering the skill buildings. */
export const TOWN_HALL_VISUAL_SCALE = 0.82;

/**
 * The Town Hall — the island HUB — rendered in the 3D scene (spec §3: ONE shared
 * behaviour component, `three/TownHall.tsx`). It reuses the SAME cross-fading stage
 * stack (`PlacedModelStack`) as every skill building, so the hall builds itself
 * `site` → `construction` → `built` in place as the island's lessons complete. The
 * ONLY differences from a skill building are the DRIVER (island completion, not a
 * node's mastery) and that it carries NO mastery stars — the hall is not a node and
 * has no mastery.
 *
 * Named `building-town-hall` so the info-callout tracker (`CityScene`) can find it and
 * glue the Town Hall panel above whatever stage it is at. The whole canvas is
 * `aria-hidden` decoration; the keyboard-navigable DOM (roster entry + panel in
 * `CitySurface`) is the semantic source of truth.
 */
export function TownHall({
  center,
  rotationY,
  footprint,
  eraId = CURRENT_ERA_ID,
  model,
  reducedMotion,
  celebrateToken,
  ruined = false,
  winter = false,
  crisisStatus = null,
  onSelect,
}: {
  center: GroundPoint;
  rotationY: number;
  footprint: Footprint;
  /** Era used only to choose an intentional procedural Hall when no GLB exists. */
  eraId?: EraId;
  /** The hall's current stage model (completion-driven), or `null` (render nothing). */
  model: ResolvedBuildingModel | null;
  reducedMotion: boolean;
  /** Bumped on a stage change to fire a one-shot completion pop (reduced-motion gated). */
  celebrateToken: number;
  /**
   * A crisis has ruined the hub and nobody has repaired it. The hall shares the skill
   * buildings' stage stack, so it shares their ruin treatment for free — and, like them, it
   * stays exactly as clickable, which for the hall means its island-hub panel rather than a
   * lesson menu (it has no lesson — spec §2.2).
   */
  ruined?: boolean;
  /**
   * A hard winter is on the island, so the hub wears the crisis's frost treatment and takes
   * snow banked against its walls. The hall shares the skill buildings' stage stack, so it
   * shares their weather for free, and it MUST: an unfrosted hall in the middle of a frosted
   * settlement is the loudest possible seam.
   */
  winter?: boolean;
  /**
   * The hub is a winter building like any other — `liveCityLayout` hands it to the crisis in
   * the same list — so it can be reinforced, it can be threatened, and it wears both through
   * the same two components the skill buildings do. A hall exempted from the crisis's
   * vocabulary would be the same seam an unfrosted hall would be.
   *
   * It has no mastery stars to step aside for, so `crisisStatus` here adds a badge where there
   * was none rather than replacing one. `null` for a hall the frost has not reached, which since
   * the 2026-08-01 ruling means the hub is undressed for most of a winter rather than wearing a
   * hexagon: the badge appears when the front arrives and when the hall is lost.
   */
  crisisStatus?: CrisisStatus | null;
  onSelect: () => void;
}) {
  const contentRef = useRef<THREE.Group>(null);
  const stackRef = useRef<THREE.Group>(null);
  const dressedRef = useRef<THREE.Group>(null);
  const bounceRef = useRef(-1);
  const eraFallback = useMemo(() => {
    if (model?.kind !== "built" || model.url !== null) {
      return null;
    }
    return prepareModel(buildEraTownHallFallback(eraId, footprint), footprint, winter);
  }, [eraId, footprint, model?.kind, model?.url, winter]);
  useDisposableGraph(eraFallback);

  // Key the preload lifecycle on the stable URL, not the fresh descriptor object.
  useTownHallPreload(model?.url ?? null, useGLTF.preload);

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
        scale = 1 + 0.16 * Math.sin(bounceRef.current * Math.PI);
      }
    }
    group.scale.setScalar(scale * TOWN_HALL_VISUAL_SCALE);
    group.position.y = 0;
  });

  // The same drift group every skill building takes, sized off the hall's own plot.
  const drifts = useMemo(
    () =>
      winter
        ? buildDrifts(
            footprint.w * GRID_CELL * FOOTPRINT_FILL,
            footprint.d * GRID_CELL * FOOTPRINT_FILL,
          )
        : null,
    [winter, footprint],
  );

  const setCursor = (value: string) => {
    if (typeof document !== "undefined") {
      document.body.style.cursor = value;
    }
  };

  return (
    <group position={[center.x, SURFACE_Y, center.z]}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: <group> is a react-three-fiber 3D object, not a DOM element. The whole canvas is aria-hidden decoration; the keyboard-navigable DOM in CitySurface is the accessible control. */}
      <group
        name={`building-${TOWN_HALL_ID}`}
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
          <group ref={dressedRef}>
            {model && (
              <group ref={stackRef} name={MODEL_STACK_NAME}>
                {eraFallback !== null && !ruined ? (
                  <primitive object={eraFallback} />
                ) : (
                  <PlacedModelStack
                    model={model}
                    footprint={footprint}
                    reducedMotion={reducedMotion}
                    ruined={ruined}
                    frosted={winter}
                  />
                )}
              </group>
            )}
          </group>
          {drifts && <primitive object={drifts} />}
        </group>
      </group>
      {crisisStatus !== null && (
        <CrisisStatusMarker
          measureRef={dressedRef}
          status={crisisStatus}
          reducedMotion={reducedMotion}
        />
      )}
    </group>
  );
}
