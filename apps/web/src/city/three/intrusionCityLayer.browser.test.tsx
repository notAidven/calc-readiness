import { createRelay, relayReducer } from "@cr/game";
import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { relayCityView } from "../../relay/relayCityView";
import type { Footprint } from "../worldLayout";
import {
  INTRUSION_OBJECT_NAMES,
  IntrusionCityLayer,
  type IntrusionWorldTarget,
} from "./IntrusionCityLayer";

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

const FOOTPRINT: Footprint = { w: 2, d: 2 };
const TARGETS: readonly IntrusionWorldTarget[] = [
  { nodeId: "relay", center: { x: -8, z: 0 }, footprint: FOOTPRINT, rotationY: 0 },
  { nodeId: "library", center: { x: 0, z: -6 }, footprint: FOOTPRINT, rotationY: 0 },
  { nodeId: "hall", center: { x: 7, z: 1 }, footprint: FOOTPRINT, rotationY: 0 },
  { nodeId: "market", center: { x: 1, z: 8 }, footprint: FOOTPRINT, rotationY: 0 },
  { nodeId: "school", center: { x: -7, z: 7 }, footprint: FOOTPRINT, rotationY: 0 },
  { nodeId: "works", center: { x: 9, z: 8 }, footprint: FOOTPRINT, rotationY: 0 },
];

function count(scene: THREE.Object3D, name: string): number {
  let total = 0;
  scene.traverse((object) => {
    if (object.name === name) {
      total += 1;
    }
  });
  return total;
}

test("the route, probe, evidence, covers and answer locks reach the live renderer", async () => {
  const armed = relayReducer(createRelay(), { type: "arm", action: "cut" });
  const answering = relayReducer(armed, { type: "start_questions" });
  const isolated = relayReducer(answering, { type: "resolve_round", correct: 1, asked: 3 });
  const view = relayCityView(
    isolated,
    TARGETS.map((target) => target.nodeId),
    { answered: 2, verdicts: [true, false] },
  );
  let scene: THREE.Scene | null = null;
  let gl: THREE.WebGLRenderer | null = null;

  harness = mount(
    <div style={{ width: 480, height: 480 }}>
      <Canvas
        camera={{ position: [32, 38, 34], fov: 38 }}
        onCreated={(state) => {
          scene = state.scene;
          gl = state.gl;
        }}
      >
        <ambientLight intensity={1.2} />
        <IntrusionCityLayer targets={TARGETS} view={view} reducedMotion={false} />
      </Canvas>
    </div>,
  );

  await waitFor(() => scene !== null && gl !== null, "the canvas never created", 15_000);
  const liveScene = scene as unknown as THREE.Scene;
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => count(liveScene, INTRUSION_OBJECT_NAMES.probe) === 1,
    "the active probe never reached the scene",
    15_000,
  );

  expect(count(liveScene, INTRUSION_OBJECT_NAMES.route)).toBe(TARGETS.length - 1);
  expect(count(liveScene, INTRUSION_OBJECT_NAMES.evidence)).toBe(TARGETS.length);
  expect(count(liveScene, INTRUSION_OBJECT_NAMES.hatch)).toBe(TARGETS.length);
  expect(count(liveScene, INTRUSION_OBJECT_NAMES.cover)).toBe(1);
  expect(count(liveScene, INTRUSION_OBJECT_NAMES.isolationMark)).toBe(1);
  expect(count(liveScene, INTRUSION_OBJECT_NAMES.lock)).toBe(3);
  const isolationMark = liveScene.getObjectByName(INTRUSION_OBJECT_NAMES.isolationMark);
  expect(isolationMark?.userData).toMatchObject({ glyph: "broken-trace" });
  expect(isolationMark?.children).toHaveLength(2);
  expect(isolationMark?.children.map((segment) => segment.rotation.z)).toEqual([
    -0.45, -0.45,
  ]);
  expect(isolationMark?.children.map((segment) => Math.sign(segment.position.y))).toEqual([
    -1, 1,
  ]);
  await waitFor(
    () => renderer.info.render.triangles > 100,
    "the renderer never submitted the Intrusion geometry",
    15_000,
  );
  expect(renderer.info.render.calls).toBeGreaterThan(0);
  expect(renderer.info.render.calls).toBeLessThanOrEqual(90);
  expect(renderer.info.render.triangles).toBeGreaterThan(100);
  const layer = liveScene.getObjectByName(INTRUSION_OBJECT_NAMES.layer);
  let layerObjects = 0;
  layer?.traverse(() => {
    layerObjects += 1;
  });
  expect(layerObjects).toBeGreaterThan(20);
  expect(layerObjects).toBeLessThanOrEqual(100);
});

test("reduced motion keeps the same probe and evidence carriers in a posed frame", async () => {
  const view = relayCityView(
    createRelay(),
    TARGETS.map((target) => target.nodeId),
  );
  let scene: THREE.Scene | null = null;

  harness = mount(
    <div style={{ width: 320, height: 320 }}>
      <Canvas
        camera={{ position: [30, 36, 30], fov: 40 }}
        onCreated={(state) => {
          scene = state.scene;
        }}
      >
        <ambientLight intensity={1.2} />
        <IntrusionCityLayer targets={TARGETS} view={view} reducedMotion />
      </Canvas>
    </div>,
  );

  await waitFor(() => scene !== null, "the reduced-motion scene never created", 15_000);
  const liveScene = scene as unknown as THREE.Scene;
  await waitFor(
    () => count(liveScene, INTRUSION_OBJECT_NAMES.probe) === 1,
    "the reduced-motion probe disappeared",
    15_000,
  );
  expect(count(liveScene, INTRUSION_OBJECT_NAMES.evidence)).toBe(TARGETS.length);
  expect(
    liveScene.getObjectByName(INTRUSION_OBJECT_NAMES.layer)?.userData.reducedMotion,
  ).toBe(true);
});
