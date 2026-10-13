import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";
import { afterEach, expect, test } from "vitest";
import { commands } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { EVAN_ISLAND_DESIGNS } from "../islandDesign";
import { islandGround } from "../islandGround";
import { eraCityLayout, eraLandRadius } from "../islandLand";
import { CityLighting } from "./CityLighting";
import { disposeSceneGraph } from "./disposeSceneGraph";
import { evanIslandGeometryStats } from "./evanIslandGeometry";
import { batchStaticIslandGraph } from "./islandBatching";
import { StarterIsland, buildIslandGroup } from "./StarterIsland";

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

const MAX_REAL_CALLS = 120;
const MAX_REAL_TRIANGLES = 75_000;
const RECORD_PERFORMANCE = Boolean(import.meta.env.VITE_EVAN_ISLAND_SHOTS);

test("all ten authored islands keep signatures inside real renderer budgets", async () => {
  const readings: Array<{
    eraId: keyof typeof EVAN_ISLAND_DESIGNS;
    authoredMeshes: number;
    renderMeshes: number;
    calls: number;
    triangles: number;
  }> = [];

  for (const eraId of Object.keys(EVAN_ISLAND_DESIGNS) as Array<
    keyof typeof EVAN_ISLAND_DESIGNS
  >) {
    const layout = eraCityLayout(eraId);
    const authored = buildIslandGroup(layout, islandGround(eraId), eraLandRadius(eraId));
    const stats = evanIslandGeometryStats(authored);
    expect(stats.signatures, `${eraId} signature art disappeared before rendering`).toEqual(
      [...EVAN_ISLAND_DESIGNS[eraId].signatures].sort(),
    );
    const batched = batchStaticIslandGraph(authored);
    const renderMeshes = Number(
      (batched.userData.batch as { readonly renderMeshes?: number } | undefined)
        ?.renderMeshes ?? 0,
    );
    expect(renderMeshes, `${eraId} batched mesh population`).toBeGreaterThan(10);
    disposeSceneGraph(batched);
    disposeSceneGraph(authored);

    let renderer: THREE.WebGLRenderer | null = null;
    harness?.cleanup();
    harness = mount(
      <div style={{ width: 1024, height: 580 }}>
        <Canvas
          shadows
          dpr={1}
          camera={{ position: [0, 82, 82], fov: 40 }}
          onCreated={(state) => {
            renderer = state.gl;
          }}
        >
          <CityLighting islandRadius={layout.islandRadius} variant="day" />
          <StarterIsland layout={layout} reducedMotion eraId={eraId} />
        </Canvas>
      </div>,
    );
    await waitFor(() => renderer !== null, `${eraId} renderer did not mount`, 20_000);
    await waitFor(
      () => (renderer as unknown as THREE.WebGLRenderer).info.render.triangles >= 2_500,
      `${eraId} rendered too little geometry to prove the island was present`,
      20_000,
    );
    const info = (renderer as unknown as THREE.WebGLRenderer).info.render;
    expect(info.calls, `${eraId} submitted ${info.calls} real calls`).toBeLessThanOrEqual(
      MAX_REAL_CALLS,
    );
    expect(
      info.triangles,
      `${eraId} submitted ${info.triangles} real triangles`,
    ).toBeLessThanOrEqual(MAX_REAL_TRIANGLES);
    readings.push({
      eraId,
      authoredMeshes: stats.meshes,
      renderMeshes,
      calls: info.calls,
      triangles: info.triangles,
    });
  }

  expect(readings).toHaveLength(10);
  if (RECORD_PERFORMANCE) {
    if (RECORD_PERFORMANCE) {
      await commands.writeFile(
        "output/design-review/evan-islands/renderer-performance.json",
        `${JSON.stringify(readings, null, 2)}\n`,
        { encoding: "utf-8" },
      );
    }
  }
}, 180_000);
