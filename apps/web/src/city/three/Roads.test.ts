import type * as THREE from "three";
import { describe, expect, it } from "vitest";

import type { RoadSurfacing } from "../roadSurfacing";
import { type RoadCell, roadCellKey } from "../roads";
import { cellCenter } from "../worldLayout";
import { buildRoadsGroup, ROAD_HIGHLIGHT_NAME } from "./Roads";

/**
 * The rendered road layer's SELECTION highlight — the visible half of "clicking a
 * road piece selects it and shows you which one". The auto-tiling itself is proven
 * over the pure mask logic in `roads.test.ts`; what matters here is that exactly one
 * cell is ever framed, and that it is the picked one.
 */

const RUN: RoadCell[] = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 0 },
];

const FRONTAGE_TEST_SURFACING: RoadSurfacing = {
  courses: [
    {
      kind: "slab",
      id: "frontage-test",
      color: 0x765432,
      roughness: 1,
      widthFactor: 0.5,
      ragged: false,
    },
  ],
};

/** Every highlight object in a built road group (there should never be two). */
function highlights(group: THREE.Group): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  group.traverse((child) => {
    if (child.name === ROAD_HIGHLIGHT_NAME) {
      found.push(child);
    }
  });
  return found;
}

describe("Roads (3D) — the selected tile is highlighted, and only it", () => {
  it("draws no highlight when nothing is selected", () => {
    expect(highlights(buildRoadsGroup(RUN, [], true, null))).toHaveLength(0);
  });

  it("frames exactly one tile, centred on the selected cell", () => {
    const group = buildRoadsGroup(RUN, [], true, { col: 1, row: 0 });
    const found = highlights(group);
    expect(found).toHaveLength(1);

    const center = cellCenter(1, 0);
    expect(found[0]?.position.x).toBeCloseTo(center.x);
    expect(found[0]?.position.z).toBeCloseTo(center.z);
  });

  it("moves the frame when the selection moves, never leaving the old one behind", () => {
    const moved = highlights(buildRoadsGroup(RUN, [], true, { col: 2, row: 0 }));
    expect(moved).toHaveLength(1);
    const center = cellCenter(2, 0);
    expect(moved[0]?.position.x).toBeCloseTo(center.x);
    expect(moved[0]?.position.z).toBeCloseTo(center.z);
  });

  it("ignores a selection that is not a laid road (a stale or bogus cell)", () => {
    // Nothing was ever paved at (9,9), and a tile removed out from under the
    // selection lands in the same state — the frame simply stops drawing.
    expect(highlights(buildRoadsGroup(RUN, [], true, { col: 9, row: 9 }))).toHaveLength(0);
    const afterRemoval = buildRoadsGroup(
      RUN.filter((cell) => cell.col !== 1),
      [],
      true,
      { col: 1, row: 0 },
    );
    expect(highlights(afterRemoval)).toHaveLength(0);
  });

  it("sits above the asphalt so it reads at the fixed camera tilt", () => {
    const group = buildRoadsGroup(RUN, [], true, { col: 0, row: 0 });
    const frame = highlights(group)[0];
    expect(frame).toBeDefined();
    // Every bar of the frame is lifted clear of the road surface it outlines.
    for (const child of frame?.children ?? []) {
      expect(child.position.y).toBeGreaterThan(0.15);
    }
  });
});

describe("Roads (3D) — a road visibly meets an adjacent building plot", () => {
  it("extends to the shared edge without drawing beneath the building cell", () => {
    const road = [{ col: 0, row: 0 }] as const;
    const bare = buildRoadsGroup(road, [], true, null, FRONTAGE_TEST_SURFACING);
    const frontage = buildRoadsGroup(
      road,
      [],
      true,
      null,
      FRONTAGE_TEST_SURFACING,
      new Set([roadCellKey(1, 0)]),
    );
    const bareMeshes = bare.children.filter(
      (child): child is THREE.Mesh => (child as THREE.Mesh).isMesh === true,
    );
    const frontageMeshes = frontage.children.filter(
      (child): child is THREE.Mesh => (child as THREE.Mesh).isMesh === true,
    );

    expect(bareMeshes, "a lone tile has only its central patch").toHaveLength(1);
    expect(frontageMeshes, "the adjacent plot adds exactly one painted arm").toHaveLength(
      2,
    );

    const centerX = cellCenter(0, 0).x;
    const arm = frontageMeshes.find((mesh) => mesh.position.x > centerX);
    expect(arm, "the road did not paint east toward the adjacent plot").toBeDefined();
    if (!arm) {
      throw new Error("the road did not paint east toward the adjacent plot");
    }
    const width = (arm.geometry as THREE.BoxGeometry).parameters.width;
    const sharedEdge = cellCenter(0, 0).x + 2;
    expect(arm.position.x + width / 2).toBeCloseTo(sharedEdge);
    expect(
      arm.position.x + width / 2,
      "the frontage arm crossed into the occupied building cell",
    ).toBeLessThanOrEqual(sharedEdge);
  });
});
