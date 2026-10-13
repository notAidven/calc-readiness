import { civicCatalogueForEra } from "@cr/economy";
import { getEraOrThrow, type EraId } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import "../../styles.css";
import { CitySurface } from "../CitySurface";
import { resolveBuildingModel } from "../buildingAssets";
import { civicPlacementId } from "../civic";
import { resolveCivicModel } from "../civicBuildings";
import { CURRENT_ERA_ID } from "../eraDressing";
import { resolveEraTownHall, TOWN_HALL_ID } from "../townHall";
import type { CityLoad } from "../types";
import { type Harness, mount, waitFor } from "../../lessons/testHarness";

const STUDENT = "00000000-0000-4000-8000-000000000810" as UUID;
const CASES = [
  ["atomic_age", "LF.4"],
  ["information_age", "EL.2"],
  ["cyberpunk", "TRG.6"],
] as const satisfies readonly (readonly [EraId, string])[];

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function state(nodeId: string): StudentNodeState {
  return {
    student_id: STUDENT,
    node_id: nodeId,
    placement_estimate: 3,
    mastery: 2,
    mastery_updated_at: null,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: null,
  };
}

test.each(CASES)(
  "%s restores and renders representative late-era skill, civic, and Hall models",
  { timeout: 60_000 },
  async (eraId, nodeId) => {
    await page.viewport(1024, 580);
    expect(getEraOrThrow(eraId).nodes).toContain(nodeId);

    const skill = resolveBuildingModel(nodeId, "built");
    const civicRow = civicCatalogueForEra(eraId)[0];
    if (!civicRow) throw new Error(`${eraId} has no civic row`);
    const civic = resolveCivicModel(civicRow.id, "built");
    const hall = resolveEraTownHall(eraId, CURRENT_ERA_ID).model;
    if (!skill.url || !civic?.url || !hall?.url) {
      throw new Error(`${eraId} representative production URLs did not resolve`);
    }
    const loader = new GLTFLoader();
    for (const [kind, url] of [
      ["skill", skill.url],
      ["civic", civic.url],
      ["hall", hall.url],
    ] as const) {
      const loaded = await loader.loadAsync(url);
      let meshes = 0;
      loaded.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) meshes += 1;
      });
      expect(meshes, `${eraId} ${kind} GLB contains renderable geometry`).toBeGreaterThan(
        0,
      );
    }

    const civicId = civicPlacementId(civicRow.id, 0);
    const city: CityLoad = {
      node_states: [state(nodeId)],
      neighborhood_state: null,
      placements: [{ nodeId, col: -5, row: -4, rot: 0 }],
      town_hall: { nodeId: TOWN_HALL_ID, col: 2, row: -1, rot: 0 },
      civic: [{ nodeId: civicId, col: 4, row: 3, rot: 0 }],
      roads: [],
      road_gold_spent: 0,
      civic_material_spent: 0,
    };

    harness = mount(
      <div className="city-shell" style={{ position: "fixed", inset: 0 }}>
        <CitySurface
          enableCanvas
          reducedMotion
          archipelagoMetrics
          eraId={eraId}
          loadCity={async () => city}
          enableOnboardingDemo={false}
        />
      </div>,
    );

    await waitFor(
      () =>
        Number(
          document
            .querySelector('[data-testid="city-viewport"]')
            ?.getAttribute("data-sample-frames") ?? 0,
        ) >= 2,
      `${eraId} city renderer publishes frames`,
      45_000,
    );
    const viewport = document.querySelector<HTMLElement>('[data-testid="city-viewport"]');
    expect(viewport).not.toBeNull();
    expect(Number(viewport?.dataset.triangles)).toBeGreaterThan(0);
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
  },
);
