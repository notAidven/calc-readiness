import type { RelayAction } from "@cr/game";
import { Edges } from "@react-three/drei";
import type { ReactElement } from "react";

import type { RelayCityView } from "../../relay/relayCityView";
import { type Footprint, GRID_CELL, type GroundPoint } from "../worldLayout";
import { INTRUSION_MARK_TONES as I, INTRUSION_SCENE_TONES as S } from "./intrusion-tones";
import { RELAY_GEOMETRY as G } from "./intrusionMetrics";

export interface RelayRenderState {
  readonly placementId: string;
  readonly dark: number;
  readonly shuttersClosed: number;
  readonly copy: "ready" | "spent";
  readonly proposal: RelayAction | null;
  /** Present only while the active crisis projects this relay across the city. */
  readonly cityView?: RelayCityView;
}

function material(tone: number, emissive = 0): ReactElement {
  return (
    <meshStandardMaterial
      color={tone}
      emissive={emissive > 0 ? tone : 0x000000}
      emissiveIntensity={emissive}
      roughness={0.93}
      metalness={0.03}
      flatShading
    />
  );
}

/**
 * Approved A1-A5 geometry mounted on one real civic placement.
 *
 * No local light, texture, ground mark, tint, edge layer or idle frame loop. Every state is
 * added geometry: nine record cells, nine roof fins, three intake shutters and one copy bay.
 */
export function RelayFixture({
  center,
  rotationY,
  footprint,
  state,
}: {
  readonly center: GroundPoint;
  readonly rotationY: number;
  readonly footprint: Footprint;
  readonly state: RelayRenderState;
}): ReactElement {
  const front = (footprint.d * GRID_CELL) / 2 + 0.2;
  const scale = Math.min(1, (footprint.w * GRID_CELL * 0.85) / G.record.span);
  const cells = Array.from({ length: 9 }, (_, index) => index);
  const shutters = Array.from({ length: 3 }, (_, index) => index);
  return (
    <group
      name="civic-archive-relay-fixture"
      position={[center.x, 0, center.z]}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
      userData={{
        dark: state.dark,
        shuttersClosed: state.shuttersClosed,
        copy: state.copy,
      }}
    >
      <group position={[0, 5.25, front]}>
        <mesh name="relay-record-rim" castShadow receiveShadow>
          <boxGeometry args={[G.record.span, G.record.height, G.record.rim]} />
          {material(I.PANEL_RIM)}
        </mesh>
        <mesh name="relay-record-bezel" position={[0, 0, 0.2]} castShadow>
          <boxGeometry args={[6.2, 3.6, 0.24]} />
          {material(I.PANEL_BEZEL)}
        </mesh>
        {cells.map((index) => {
          const taken = index < state.dark;
          const x = -2.72 + index * 0.68;
          return (
            <group key={index} position={[x, 0, 0.39]} name="relay-record-cell">
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.58, 3.08, 0.18]} />
                {material(taken ? I.PANEL_FACE_DARK : I.PANEL_FACE, taken ? 0 : 1)}
              </mesh>
              <mesh position={[0, taken ? 0 : -0.02, 0.16]} castShadow={false}>
                <boxGeometry args={[0.46, taken ? 0.24 : 2.85, 0.09]} />
                {material(taken ? I.PANEL_BAR_STALE : I.PANEL_BAR, taken ? 0 : 1.05)}
              </mesh>
            </group>
          );
        })}
      </group>

      <group position={[0, 8.25, front]}>
        <mesh name="relay-intake-surround" castShadow receiveShadow>
          <boxGeometry args={[G.intake.span, G.intake.height, G.intake.depth]} />
          {material(I.PANEL_BEZEL)}
        </mesh>
        {shutters.map((index) => {
          const closed = index < state.shuttersClosed;
          const proposed = state.proposal === "cut" && !closed;
          return (
            <mesh
              key={index}
              name="relay-intake-bay"
              position={[-1.85 + index * 1.85, 0, 0.24]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[G.intake.baySpan, G.intake.bayHeight, closed ? 0.18 : 0.08]}
              />
              {material(closed ? I.BLANKING_PANEL : I.VOID)}
              {proposed && <Edges color={I.PANEL_BAR} lineWidth={3} />}
            </mesh>
          );
        })}
      </group>

      <group position={[0, 1.7, front]}>
        <mesh name="relay-copy-bay" castShadow receiveShadow>
          <boxGeometry args={[G.copy.baySpan, G.copy.bayHeight, G.copy.depth]} />
          {material(I.VOID)}
          {state.proposal === "restore" && <Edges color={I.PANEL_BAR} lineWidth={3} />}
        </mesh>
        {state.copy === "spent" && (
          <mesh name="relay-copy-cartridge" position={[0, 0, 0.27]} castShadow>
            <boxGeometry args={[G.copy.cartridgeSpan, G.copy.cartridgeHeight, 0.26]} />
            {material(I.PANEL_FACE, 0.55)}
          </mesh>
        )}
      </group>

      <group position={[0, 10.15, 0]} name="relay-roof-crest">
        {cells.map((index) => {
          const folded = index < state.dark;
          return (
            <mesh
              key={index}
              name="relay-crest-fin"
              position={[
                -3.56 + index * G.crest.pitch,
                folded ? G.crest.foldedHeight / 2 : G.crest.standingHeight / 2,
                -front * 0.52,
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[
                  G.crest.width,
                  folded ? G.crest.foldedHeight : G.crest.standingHeight,
                  G.crest.thickness,
                ]}
              />
              {material(folded ? I.PANEL_RIM : I.PANEL_FACE)}
            </mesh>
          );
        })}
      </group>

      {/* A narrow podium carries the copy bay and visually belongs to the relay, not the floor. */}
      <mesh name="relay-podium" position={[0, 1.05, front - 0.24]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.8, 0.8]} />
        {material(S.BODY_CLAD)}
      </mesh>
    </group>
  );
}
