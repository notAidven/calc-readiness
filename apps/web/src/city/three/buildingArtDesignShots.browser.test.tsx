import { ERA_SEQUENCE, type EraDefinition, type EraId } from "@cr/skill-graph";
import { Bounds, useBounds } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type RefObject, useRef } from "react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { civicPlacementId } from "../civic";
import { civicOptionsForEra } from "../civicBuildings";
import { eraCityLayout } from "../islandLand";
import { resolveEraTownHall, TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { defaultPlacements, footprintFor } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import CityScene, { type ScenePlacement, type SceneTownHall } from "./CityScene";
import { MODEL_STACK_NAME, PlacedModelStack } from "./PlacedBuilding";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const RECORD_PHASE = String(import.meta.env.VITE_BUILDING_ART_RECORD ?? "");
const RECORD = RECORD_PHASE === "before" || RECORD_PHASE === "after";
const OUTPUT = `output/design-review/building-art/${RECORD_PHASE}`;
const GAMEPLAY_VIEW = { width: 1024, height: 580 } as const;
const MATRIX_VIEW = { width: 1024, height: 580 } as const;
const STAGE_ID = "building-art-review-stage";

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function stageBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  const stage = document.getElementById(STAGE_ID);
  if (!frame || !stage) {
    throw new Error("building-art review stage is unavailable");
  }
  const frameBox = frame.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: frameBox.left + outer.scrollX + stageBox.left,
    y: frameBox.top + outer.scrollY + stageBox.top,
    width: stageBox.width,
    height: stageBox.height,
  };
}

async function capture(path: string): Promise<void> {
  const session = cdp() as unknown as {
    send: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  const clip = { ...stageBox(), scale: 1 };
  // A clipped CDP capture changes Chromium's device metrics. Let R3F consume that resize before
  // keeping the evidence frame, otherwise the first capture can contain the preceding canvas.
  await session.send("Page.captureScreenshot", { format: "png", clip });
  await new Promise<void>((resolve) => setTimeout(resolve, 180));
  const shot = await session.send("Page.captureScreenshot", { format: "png", clip });
  if (!shot.data) {
    throw new Error(`Chromium returned no screenshot for ${path}`);
  }
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`${OUTPUT}/${path}`, shot.data, { encoding: "base64" });
  }
}

function hallFor(eraId: EraId): SceneTownHall {
  return {
    ...TOWN_HALL_CENTER_TRANSFORM,
    model: resolveEraTownHall(eraId, "prehistoric").model,
    celebrateToken: 0,
  };
}

function eraPlacements(era: EraDefinition): readonly ScenePlacement[] {
  const civics = civicOptionsForEra(era.id).map((option, index) => ({
    nodeId: civicPlacementId(option.row.id, index),
    model: option.builtModel,
  }));
  const civicModelByPlacement = new Map(civics.map((entry) => [entry.nodeId, entry.model]));
  return defaultPlacements(
    [...era.nodes, ...civics.map((entry) => entry.nodeId)],
    [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
    eraCityLayout(era.id).buildableRadius,
  ).map((placement) => ({
    ...placement,
    model:
      civicModelByPlacement.get(placement.nodeId) ??
      resolveBuildingModel(placement.nodeId, "built"),
    mastery: 0,
    celebrateToken: 0,
  }));
}

function GameplayHost({
  era,
  metricsRef,
}: {
  readonly era: EraDefinition;
  readonly metricsRef: RefObject<HTMLElement | null>;
}) {
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  const placed = eraPlacements(era);
  const civicCount = placed.length - era.nodes.length;
  return (
    <div
      id={STAGE_ID}
      className="city-shell"
      style={{
        position: "fixed",
        inset: 0,
        width: GAMEPLAY_VIEW.width,
        height: GAMEPLAY_VIEW.height,
        overflow: "hidden",
      }}
    >
      <span
        ref={(node) => {
          metricsRef.current = node;
        }}
        hidden
      />
      <CityScene
        layout={eraCityLayout(era.id)}
        placed={placed}
        townHall={hallFor(era.id)}
        variant="day"
        reducedMotion
        controlsRef={controlsRef}
        metricsTargetRef={metricsRef}
        onSelect={() => undefined}
        showSkillLabels={false}
        eraId={era.id}
      />
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          zIndex: 5,
          borderRadius: 12,
          background: "rgba(19, 35, 45, 0.82)",
          color: "#fff",
          padding: "9px 12px",
          font: "600 14px/1.3 system-ui, sans-serif",
          boxShadow: "0 5px 20px rgba(0, 0, 0, 0.25)",
        }}
      >
        {era.name}
        <small style={{ display: "block", marginTop: 2, fontWeight: 500, opacity: 0.82 }}>
          {era.nodes.length} era skill buildings · {civicCount} civic buildings · Town Hall
        </small>
      </div>
    </div>
  );
}

interface PerformanceReading {
  readonly eraId: EraId;
  readonly skillBuildings: number;
  readonly civicBuildings: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly sceneObjects: number;
  readonly loadedModelMeshes: number;
}

async function photographGameplayEra(era: EraDefinition): Promise<PerformanceReading> {
  await page.viewport(GAMEPLAY_VIEW.width, GAMEPLAY_VIEW.height);
  const metricsRef: RefObject<HTMLElement | null> = { current: null };
  const placements = eraPlacements(era);
  harness?.cleanup();
  harness = mount(<GameplayHost era={era} metricsRef={metricsRef} />);
  await waitFor(
    () =>
      metricsRef.current?.dataset.compositionReady === "true" &&
      Number(metricsRef.current.dataset.sampleFrames ?? 0) >= 8,
    `${era.id} review city never reached a fully loaded composition`,
    60_000,
  );
  await capture(
    `gameplay/${String(ERA_SEQUENCE.indexOf(era) + 1).padStart(2, "0")}-${era.id}-1024x580.png`,
  );
  const target = metricsRef.current as HTMLElement;
  const reading: PerformanceReading = {
    eraId: era.id,
    skillBuildings: era.nodes.length,
    civicBuildings: placements.length - era.nodes.length,
    drawCalls: Number(target.dataset.drawCalls ?? 0),
    triangles: Number(target.dataset.triangles ?? 0),
    sceneObjects: Number(target.dataset.sceneObjects ?? 0),
    loadedModelMeshes: Number(target.dataset.loadedModelMeshes ?? 0),
  };
  harness.cleanup();
  harness = null;
  return reading;
}

function ReviewProbe({ cardId }: { readonly cardId: string }) {
  const bounds = useBounds();
  const fitted = useRef(false);
  useFrame(({ scene }) => {
    let meshes = 0;
    const stack = scene.getObjectByName(MODEL_STACK_NAME);
    stack?.traverse((object) => {
      if ("isMesh" in object && object.isMesh) meshes += 1;
    });
    const card = document.getElementById(cardId);
    if (card) card.dataset.ready = String(meshes > 0);
    if (!fitted.current && stack && meshes > 0) {
      bounds.refresh(stack).clip().fit();
      fitted.current = true;
    }
  });
  return null;
}

function EraCloseupCard({
  era,
  index,
}: {
  readonly era: EraDefinition;
  readonly index: number;
}) {
  const nodeId = era.nodes[index % era.nodes.length] as string;
  const cardId = `building-art-card-${era.id}`;
  return (
    <article
      id={cardId}
      data-ready="false"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 14,
        border: "1px solid rgba(31, 53, 66, 0.18)",
        background: "linear-gradient(160deg, #dcecf1, #f1e8d7)",
        boxShadow: "0 8px 26px rgba(26, 44, 56, 0.14)",
      }}
    >
      <header
        style={{
          position: "absolute",
          inset: "0 0 auto",
          zIndex: 3,
          padding: "9px 11px 8px",
          background: "rgba(20, 37, 48, 0.86)",
          color: "#fff",
          font: "700 13px/1.2 system-ui, sans-serif",
        }}
      >
        {String(index + 1).padStart(2, "0")} · {era.name}
        <small style={{ display: "block", marginTop: 2, fontWeight: 500, opacity: 0.78 }}>
          representative skill · {nodeId}
        </small>
      </header>
      <Canvas
        shadows
        dpr={1}
        camera={{ position: [45, 34, 45], fov: 32, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#dce7ea"]} />
        <hemisphereLight args={["#d7e7f1", "#b58d5e", 0.95]} />
        <ambientLight color="#f2eadc" intensity={0.3} />
        <directionalLight
          castShadow
          position={[-32, 48, 30]}
          intensity={1.25}
          color="#fff3df"
        />
        <directionalLight position={[28, 18, -30]} intensity={0.42} color="#bddbea" />
        <Bounds fit clip observe margin={1.25}>
          <group name={MODEL_STACK_NAME}>
            <PlacedModelStack
              model={resolveBuildingModel(nodeId, "built")}
              footprint={footprintFor(nodeId)}
              reducedMotion
            />
          </group>
          <ReviewProbe cardId={cardId} />
        </Bounds>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#9abd7a" roughness={1} />
        </mesh>
      </Canvas>
    </article>
  );
}

function CloseupMatrix({
  eras,
  start,
}: {
  readonly eras: readonly EraDefinition[];
  readonly start: number;
}) {
  return (
    <main
      id={STAGE_ID}
      style={{
        position: "fixed",
        inset: 0,
        width: MATRIX_VIEW.width,
        height: MATRIX_VIEW.height,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        padding: 12,
        boxSizing: "border-box",
        background: "#bdccd1",
      }}
    >
      {eras.map((era, index) => (
        <EraCloseupCard key={era.id} era={era} index={start + index} />
      ))}
    </main>
  );
}

async function photographCloseupMatrix(): Promise<void> {
  await page.viewport(MATRIX_VIEW.width, MATRIX_VIEW.height);
  for (const start of [0, 5]) {
    const eras = ERA_SEQUENCE.slice(start, start + 5);
    harness?.cleanup();
    harness = mount(<CloseupMatrix eras={eras} start={start} />);
    await waitFor(
      () => {
        const cards = [
          ...document.querySelectorAll<HTMLElement>('[id^="building-art-card-"]'),
        ];
        return (
          cards.length === eras.length &&
          cards.every((card) => card.dataset.ready === "true")
        );
      },
      `the era ${start + 1}-${start + eras.length} close-up matrix never loaded`,
      90_000,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    await capture(
      `closeup-matrix-${String(start + 1).padStart(2, "0")}-${String(start + eras.length).padStart(2, "0")}-${MATRIX_VIEW.width}x${MATRIX_VIEW.height}.png`,
    );
    harness.cleanup();
    harness = null;
  }
}

test.runIf(RECORD)(
  "records the canonical building-art review matrix",
  async () => {
    // Keep the multi-canvas close-up pass first. Chromium retains recently unmounted WebGL
    // contexts long enough that running ten full CityScene mounts before these cards can evict
    // the oldest card context even though React has already cleaned each city up.
    await photographCloseupMatrix();
    const readings: PerformanceReading[] = [];
    for (const era of ERA_SEQUENCE) {
      readings.push(await photographGameplayEra(era));
    }
    expect(readings).toHaveLength(10);
    expect(readings.every((reading) => reading.skillBuildings >= 5)).toBe(true);
    expect(readings.every((reading) => reading.drawCalls > 0)).toBe(true);
    if (CAPTURE_EVIDENCE) {
      await commands.writeFile(
        `${OUTPUT}/performance-${GAMEPLAY_VIEW.width}x${GAMEPLAY_VIEW.height}.json`,
        `${JSON.stringify(readings, null, 2)}\n`,
        { encoding: "utf-8" },
      );
    }
  },
  300_000,
);
