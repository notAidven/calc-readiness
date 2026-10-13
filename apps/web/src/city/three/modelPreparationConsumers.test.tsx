import { cleanup, render, waitFor } from "@testing-library/react";
import type { PropsWithChildren, ReactNode } from "react";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedBuildingModel } from "../buildingAssets";
import BuildingThumb from "./BuildingThumb";
import { GhostBuilding } from "./GhostBuilding";
import GridworkModelPreview from "./GridworkModelPreview";
import {
  GHOST_PREPARATION,
  type GridworkPreparationOptions,
  PLACED_PREPARATION,
  prepareGridworkModel,
  THUMB_PREPARATION,
} from "./modelPreparation";
import { PlacedModelStack } from "./PlacedBuilding";
import { TownHall } from "./TownHall";

const HARNESS = vi.hoisted(() => ({
  scene: null as THREE.Object3D | null,
  invalidate: vi.fn(),
  prepare: vi.fn(),
  preload: vi.fn(),
  preparedRoots: [] as THREE.Object3D[],
}));

vi.mock("./modelPreparation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./modelPreparation")>();
  HARNESS.prepare.mockImplementation(
    (...args: Parameters<typeof actual.prepareGridworkModel>) => {
      const prepared = actual.prepareGridworkModel(...args);
      HARNESS.preparedRoots.push(prepared);
      return prepared;
    },
  );
  return {
    ...actual,
    prepareGridworkModel: HARNESS.prepare,
  };
});

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: PropsWithChildren) => children,
  useFrame: () => {},
  useThree: (selector: (state: { invalidate: () => void }) => unknown) =>
    selector({ invalidate: HARNESS.invalidate }),
}));

vi.mock("@react-three/drei", () => {
  const useGLTF = Object.assign(
    () => {
      if (!HARNESS.scene) throw new Error("consumer harness scene was not installed");
      return { scene: HARNESS.scene };
    },
    { preload: HARNESS.preload },
  );
  return {
    Bounds: ({ children }: { children?: ReactNode }) => children,
    OrbitControls: () => null,
    useGLTF,
  };
});

const MODEL: ResolvedBuildingModel = {
  node_id: "NUM.S",
  stage: "built",
  modelStage: "built",
  kind: "glb",
  url: "/fixture-gridwork.glb",
};

function sceneFixture(): THREE.Group {
  const material = new THREE.MeshStandardMaterial({ color: 0x7890a8 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), material);
  mesh.position.y = 1.5;
  return new THREE.Group().add(mesh);
}

async function expectPreset(options: GridworkPreparationOptions): Promise<void> {
  await waitFor(() =>
    expect(
      HARNESS.prepare,
      "mounted surface reached the shared preparation export",
    ).toHaveBeenCalled(),
  );
  expect(HARNESS.prepare).toHaveBeenCalledTimes(1);
  expect(
    HARNESS.prepare.mock.calls[0]?.[2],
    "mounted surface used its exact named preparation preset",
  ).toStrictEqual(options);
}

function materialsIn(root: THREE.Object3D): Set<THREE.Material> {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
    }
  });
  return materials;
}

async function expectPreparedDisposalOnUnmount(view: { unmount(): void }): Promise<void> {
  expect(HARNESS.preparedRoots.length).toBeGreaterThan(0);
  const source = HARNESS.scene;
  if (!source) throw new Error("consumer source scene disappeared");
  const sourceMaterials = materialsIn(source);
  const preparedMaterials = new Set(
    HARNESS.preparedRoots.flatMap((root) => [...materialsIn(root)]),
  );
  expect(preparedMaterials.size).toBeGreaterThan(0);
  const preparedDisposals = [...preparedMaterials].map((material) =>
    vi.spyOn(material, "dispose"),
  );
  const sourceDisposals = [...sourceMaterials].map((material) =>
    vi.spyOn(material, "dispose"),
  );

  view.unmount();

  await waitFor(() => {
    for (const dispose of preparedDisposals) {
      expect(dispose).toHaveBeenCalledTimes(1);
    }
  });
  for (const dispose of sourceDisposals) {
    expect(dispose).not.toHaveBeenCalled();
  }
}

describe("mounted preparation consumers", () => {
  beforeEach(() => {
    HARNESS.scene = sceneFixture();
    HARNESS.prepare.mockClear();
    HARNESS.invalidate.mockClear();
    HARNESS.preload.mockClear();
    HARNESS.preparedRoots.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts PlacedModelStack through the placed preset", async () => {
    const view = render(
      <PlacedModelStack model={MODEL} footprint={{ w: 1, d: 1 }} reducedMotion />,
    );
    await expectPreset(PLACED_PREPARATION);
    await expectPreparedDisposalOnUnmount(view);
  });

  it("mounts the Town Hall through PlacedModelStack and the placed preset", async () => {
    const view = render(
      <TownHall
        center={{ x: 0, z: 0 }}
        rotationY={0}
        footprint={{ w: 3, d: 2 }}
        model={MODEL}
        reducedMotion
        celebrateToken={0}
        ruined
        onSelect={() => {}}
      />,
    );
    await expectPreset(PLACED_PREPARATION);
    await expectPreparedDisposalOnUnmount(view);
  });

  it("mounts BuildingThumb through the thumbnail preset", async () => {
    const view = render(<BuildingThumb nodeId="NUM.S" />);
    await expectPreset(THUMB_PREPARATION);
    await expectPreparedDisposalOnUnmount(view);
  });

  it("mounts GridworkModelPreview through prepareModel and the placed preset", async () => {
    const view = render(<GridworkModelPreview />);
    await expectPreset(PLACED_PREPARATION);
    await expectPreparedDisposalOnUnmount(view);
  });

  it("mounts GhostBuilding through the node-only ghost preset", async () => {
    const view = render(
      <GhostBuilding
        url="/fixture-gridwork.glb"
        footprint={{ w: 1, d: 1 }}
        targetRef={{ current: null as unknown as THREE.Vector3 }}
        rotationRef={{ current: 0 }}
        validRef={{ current: true }}
        reducedMotion
      />,
    );
    await expectPreset(GHOST_PREPARATION);
    await expectPreparedDisposalOnUnmount(view);
  });

  it("spies on the actual shared preparation export", () => {
    expect(prepareGridworkModel).toBe(HARNESS.prepare);
  });
});
