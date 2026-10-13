import { useFrame } from "@react-three/fiber";
import { Fragment, type ReactElement, useMemo, useRef } from "react";
import type * as THREE from "three";

import type { RelayAnswerLock, RelayCityView } from "../../relay/relayCityView";
import { type Footprint, GRID_CELL, type GroundPoint } from "../worldLayout";
import { INTRUSION_MARK_TONES as I } from "./intrusion-tones";

export interface IntrusionWorldTarget {
  readonly nodeId: string;
  readonly center: GroundPoint;
  readonly footprint: Footprint;
  readonly rotationY: number;
}

export const INTRUSION_OBJECT_NAMES = {
  layer: "intrusion-city-layer",
  route: "intrusion-route-segment",
  probe: "intrusion-active-probe",
  evidence: "intrusion-evidence-plate",
  hatch: "intrusion-service-hatch",
  cover: "intrusion-building-cover",
  isolationMark: "intrusion-isolation-broken-trace",
  lock: "intrusion-answer-lock",
} as const;

const TONES = {
  routeQuiet: I.DUCT_MARKER,
  routeLive: I.PANEL_BAR_STALE,
  probe: I.PANEL_FACE,
  probeEdge: I.PANEL_BEZEL,
  held: 0x8fc5b5,
  gap: 0xb9473f,
  unread: I.PANEL_FACE,
  current: I.PANEL_BAR,
  stale: I.PANEL_FACE_STALE,
} as const;
const EVIDENCE_BAR_IDS = ["evidence-bar-1", "evidence-bar-2", "evidence-bar-3"] as const;
const ANSWER_LOCK_IDS = ["answer-lock-1", "answer-lock-2", "answer-lock-3"] as const;

const noRaycast = (): null => null;

function mat(
  color: number,
  options: { emissive?: number; opacity?: number } = {},
): ReactElement {
  const opacity = options.opacity ?? 1;
  return (
    <meshStandardMaterial
      color={color}
      emissive={options.emissive ? color : 0x000000}
      emissiveIntensity={options.emissive ?? 0}
      roughness={0.82}
      metalness={0}
      flatShading
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity >= 1}
    />
  );
}

function RouteSegment({
  from,
  to,
  live,
  stale,
}: {
  readonly from: GroundPoint;
  readonly to: GroundPoint;
  readonly live: boolean;
  readonly stale: boolean;
}): ReactElement {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const heading = Math.atan2(dx, dz);
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.route}
      position={[(from.x + to.x) / 2, 0.24, (from.z + to.z) / 2]}
      rotation={[0, heading, 0]}
      userData={{ live, stale }}
    >
      <mesh raycast={noRaycast} receiveShadow>
        <boxGeometry args={[0.22, 0.08, length]} />
        {mat(stale ? I.PANEL_FACE_STALE : live ? TONES.routeLive : TONES.routeQuiet)}
      </mesh>
      <mesh
        position={[0, 0.1, length * 0.16]}
        rotation={[Math.PI / 2, 0, 0]}
        raycast={noRaycast}
      >
        <coneGeometry args={[live ? 0.48 : 0.34, live ? 0.92 : 0.7, 3]} />
        {mat(live ? TONES.routeLive : I.PANEL_RIM, { emissive: live ? 0.16 : 0 })}
      </mesh>
    </group>
  );
}

function EvidencePlate({
  target,
  evidence,
  pressure,
}: {
  readonly target: IntrusionWorldTarget;
  readonly evidence: "unread" | "current" | "stale";
  readonly pressure: number;
}): ReactElement {
  const x = target.center.x + target.footprint.w * GRID_CELL * 0.43;
  const z = target.center.z + target.footprint.d * GRID_CELL * 0.43;
  const bars = evidence === "unread" ? 0 : pressure >= 7 ? 3 : pressure >= 4 ? 2 : 1;
  const face =
    evidence === "stale"
      ? I.PANEL_FACE_STALE
      : evidence === "current"
        ? I.PANEL_FACE
        : I.PANEL_BEZEL;
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.evidence}
      position={[x, 1.25, z]}
      rotation={[0, target.rotationY, 0]}
      userData={{ nodeId: target.nodeId, evidence }}
    >
      <mesh raycast={noRaycast} castShadow>
        <boxGeometry args={[1.65, 1.95, 0.24]} />
        {mat(I.PANEL_RIM)}
      </mesh>
      <mesh position={[0, 0, 0.22]} raycast={noRaycast}>
        <boxGeometry args={[1.4, 1.68, 0.14]} />
        {mat(face, { emissive: evidence === "current" ? 0.48 : 0.08 })}
      </mesh>
      {EVIDENCE_BAR_IDS.slice(0, bars).map((id, index) => (
        <mesh key={id} position={[-0.44 + index * 0.44, -0.02, 0.34]} raycast={noRaycast}>
          <boxGeometry args={[0.24, index === 1 && bars === 2 ? 0.62 : 1.18, 0.08]} />
          {mat(evidence === "stale" ? I.PANEL_BAR_STALE : TONES.current, {
            emissive: evidence === "stale" ? 0 : 0.72,
          })}
        </mesh>
      ))}
      {evidence === "stale" && (
        <mesh position={[0, 0, 0.48]} rotation={[0, 0, -0.72]} raycast={noRaycast}>
          <boxGeometry args={[1.88, 0.16, 0.08]} />
          {mat(I.PANEL_STRIKE)}
        </mesh>
      )}
      <mesh position={[0, -1.35, -0.04]} raycast={noRaycast}>
        <boxGeometry args={[0.22, 0.78, 0.22]} />
        {mat(I.PANEL_BEZEL)}
      </mesh>
    </group>
  );
}

function ServiceHatch({
  target,
  opened,
  stale,
}: {
  readonly target: IntrusionWorldTarget;
  readonly opened: boolean;
  readonly stale: boolean;
}): ReactElement {
  const x = target.center.x - target.footprint.w * GRID_CELL * 0.4;
  const z = target.center.z + target.footprint.d * GRID_CELL * 0.36;
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.hatch}
      position={[x, 0.2, z]}
      rotation={[0, target.rotationY, 0]}
      userData={{ nodeId: target.nodeId, opened, stale }}
    >
      <mesh raycast={noRaycast} receiveShadow>
        <boxGeometry args={[1.5, 0.12, 1.5]} />
        {mat(opened ? I.VOID : I.DUCT_MARKER)}
      </mesh>
      {opened && (
        <>
          <mesh
            position={[0, 0.72, -0.62]}
            rotation={[-1.04, 0, 0]}
            raycast={noRaycast}
            castShadow
          >
            <boxGeometry args={[1.48, 0.12, 1.42]} />
            {mat(stale ? I.COVER_EDGE : I.COVER)}
          </mesh>
          <mesh position={[0, 0.72, 0.92]} raycast={noRaycast}>
            <boxGeometry args={[1.8, 0.16, 0.16]} />
            {mat(I.BARRIER_RAIL)}
          </mesh>
        </>
      )}
    </group>
  );
}

function BuildingCover({
  target,
  proposed,
  strength,
}: {
  readonly target: IntrusionWorldTarget;
  readonly proposed: boolean;
  readonly strength: number;
}): ReactElement {
  const span = target.footprint.w * GRID_CELL * 0.86;
  const depth = target.footprint.d * GRID_CELL * 0.86;
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.cover}
      position={[target.center.x, 0, target.center.z]}
      rotation={[0, target.rotationY, 0]}
      userData={{ nodeId: target.nodeId, proposed }}
    >
      {[0.24, 0.55, 0.86].slice(0, proposed ? 3 : strength).map((fraction) => (
        <mesh
          key={fraction}
          position={[0, 2.4 + fraction * 8, depth / 2 + 0.16]}
          raycast={noRaycast}
          castShadow={!proposed}
        >
          <boxGeometry
            args={[span + 0.8, proposed ? 0.16 : 0.62, proposed ? 0.12 : 0.42]}
          />
          {mat(proposed ? I.PANEL_BAR_STALE : I.BLANKING_PANEL, {
            opacity: proposed ? 0.58 : 1,
          })}
        </mesh>
      ))}
      {!proposed && (
        <>
          <mesh position={[0, 5.9, depth / 2 + 0.4]} raycast={noRaycast}>
            <boxGeometry args={[0.5, 7.6, 0.44]} />
            {mat(I.ISOLATION_PLATE)}
          </mesh>
          <group
            name={INTRUSION_OBJECT_NAMES.isolationMark}
            position={[0, 5.9, depth / 2 + 0.66]}
            userData={{ glyph: "broken-trace", nodeId: target.nodeId }}
          >
            {(
              [
                [-0.31, -0.66],
                [0.31, 0.66],
              ] as const
            ).map(([x, y]) => (
              <mesh
                key={`${x}-${y}`}
                position={[x, y, 0]}
                rotation={[0, 0, -0.45]}
                raycast={noRaycast}
              >
                <boxGeometry args={[0.14, 1.15, 0.08]} />
                {mat(I.ISOLATION_TRACE, { emissive: 0.16 })}
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
}

function AnswerLock({
  state,
  index,
}: {
  readonly state: RelayAnswerLock;
  readonly index: number;
}): ReactElement {
  const angle = -0.82 + index * 0.82;
  const x = Math.sin(angle) * 2.2;
  const z = Math.cos(angle) * 2.2;
  const tone = state === "held" ? TONES.held : state === "gap" ? TONES.gap : I.PANEL_RIM;
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.lock}
      position={[x, -2.1, z]}
      rotation={[0, angle, 0]}
      userData={{ state, index }}
    >
      <mesh position={[-0.55, 0, 0]} raycast={noRaycast}>
        <boxGeometry args={[0.22, 1.1, 0.28]} />
        {mat(tone, { emissive: state === "held" ? 0.28 : 0 })}
      </mesh>
      <mesh position={[0.55, 0, 0]} raycast={noRaycast}>
        <boxGeometry args={[0.22, 1.1, 0.28]} />
        {mat(tone, { emissive: state === "held" ? 0.28 : 0 })}
      </mesh>
      {state !== "gap" ? (
        <mesh position={[0, 0.46, 0]} raycast={noRaycast}>
          <boxGeometry args={[1.28, 0.22, 0.28]} />
          {mat(tone, { emissive: state === "held" ? 0.28 : 0 })}
        </mesh>
      ) : (
        <>
          <mesh position={[-0.38, 0.46, 0]} rotation={[0, 0, -0.28]} raycast={noRaycast}>
            <boxGeometry args={[0.58, 0.2, 0.28]} />
            {mat(tone)}
          </mesh>
          <mesh position={[0.38, 0.46, 0]} rotation={[0, 0, 0.28]} raycast={noRaycast}>
            <boxGeometry args={[0.58, 0.2, 0.28]} />
            {mat(tone)}
          </mesh>
        </>
      )}
    </group>
  );
}

function ActiveProbe({
  target,
  view,
  reducedMotion,
}: {
  readonly target: IntrusionWorldTarget;
  readonly view: RelayCityView;
  readonly reducedMotion: boolean;
}): ReactElement {
  const pulseRef = useRef<THREE.Group>(null);
  const traceRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (pulseRef.current) {
      const pulse =
        reducedMotion || view.ending !== "active"
          ? 1
          : 1 + Math.sin(state.clock.elapsedTime * 4.6) * 0.08;
      pulseRef.current.scale.setScalar(pulse);
    }
    if (traceRef.current && !reducedMotion && view.proposal === "trace") {
      traceRef.current.rotation.y += delta * 1.7;
    }
  });
  const settledY = view.ending === "contained" ? 0.65 : 3.9;
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.probe}
      position={[target.center.x, settledY, target.center.z]}
      userData={{
        nodeId: target.nodeId,
        ending: view.ending,
        reducedMotion,
      }}
    >
      <group ref={pulseRef}>
        <mesh rotation={[Math.PI, 0, 0]} raycast={noRaycast} castShadow>
          <coneGeometry args={[0.82, 1.8, 3]} />
          {mat(view.ending === "contained" ? TONES.held : TONES.probe, {
            emissive: view.ending === "contained" ? 0.1 : 0.42,
          })}
        </mesh>
        <mesh position={[0, 0.58, 0]} raycast={noRaycast}>
          <octahedronGeometry args={[0.62, 0]} />
          {mat(TONES.probeEdge)}
        </mesh>
      </group>
      <group ref={traceRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[1.38, view.proposal === "trace" ? 0.2 : 0.1, 5, 24]} />
          {mat(view.proposal === "trace" ? I.PANEL_BAR : I.PANEL_RIM, {
            emissive: view.proposal === "trace" ? 0.6 : 0,
            opacity: view.proposal === "trace" ? 0.9 : 0.55,
          })}
        </mesh>
      </group>
      {view.answerLocks.map((lock, index) => (
        <AnswerLock key={ANSWER_LOCK_IDS[index]} state={lock} index={index} />
      ))}
    </group>
  );
}

/**
 * The Intrusion's state-bearing layer over the actual city.
 *
 * Every object is derived from the engine projection. The frame loop changes transforms only:
 * it cannot advance a hop, age evidence, close a cover, or resolve an answer.
 */
export function IntrusionCityLayer({
  targets,
  view,
  reducedMotion,
}: {
  readonly targets: readonly IntrusionWorldTarget[];
  readonly view: RelayCityView;
  readonly reducedMotion: boolean;
}): ReactElement | null {
  const byId = useMemo(
    () => new Map(targets.map((target) => [target.nodeId, target])),
    [targets],
  );
  const route = view.targets
    .map((target) => byId.get(target.nodeId))
    .filter((target): target is IntrusionWorldTarget => target !== undefined);
  const active = view.activeTargetId === null ? undefined : byId.get(view.activeTargetId);
  if (route.length === 0 || active === undefined) {
    return null;
  }
  return (
    <group
      name={INTRUSION_OBJECT_NAMES.layer}
      userData={{ reducedMotion, targetCount: route.length }}
    >
      {route.slice(0, -1).map((target, index) => {
        const next = route[index + 1] as IntrusionWorldTarget;
        return (
          <RouteSegment
            key={`${target.nodeId}:${next.nodeId}`}
            from={target.center}
            to={next.center}
            live={index === view.activeIndex - 1 || index === view.activeIndex}
            stale={index < view.activeIndex - 1}
          />
        );
      })}
      {view.targets.map((targetView) => {
        const target = byId.get(targetView.nodeId);
        if (!target) {
          return null;
        }
        return (
          <Fragment key={target.nodeId}>
            <EvidencePlate
              target={target}
              evidence={targetView.evidence}
              pressure={view.darkBands}
            />
            <ServiceHatch
              target={target}
              opened={targetView.evidence !== "unread"}
              stale={targetView.evidence === "stale"}
            />
            {targetView.cover !== "open" && (
              <BuildingCover
                target={target}
                proposed={targetView.cover === "proposed"}
                strength={targetView.coverStrength}
              />
            )}
          </Fragment>
        );
      })}
      <ActiveProbe target={active} view={view} reducedMotion={reducedMotion} />
    </group>
  );
}
