import { ERA_SEQUENCE } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  nodeFilePrefix,
  type ResolvedBuildingModel,
  resolveBuildingModel,
  SKILL_MODEL_NODES,
} from "../buildingAssets";
import { EARLY_MODERN_BUILDING_VARIANTS } from "../earlyModernBuildingVariants";
import {
  prepareThumbModel,
  thumbBuildingIdentity,
  type ThumbSubject,
} from "./BuildingThumb";
import { ghostBuildingIdentity, prepareGhost } from "./GhostBuilding";
import { disposePreparedModel, prepareGridworkModel } from "./modelPreparation";
import { completedBuildingIdentity, prepareModel } from "./PlacedBuilding";

const CANONICAL_SKILL_NODES = ERA_SEQUENCE.flatMap((era) => era.nodes);
const BUILT_MODELS = new Map(
  CANONICAL_SKILL_NODES.map((nodeId) => [nodeId, resolveBuildingModel(nodeId, "built")]),
);
const GLB_NODES = CANONICAL_SKILL_NODES.filter(
  (nodeId) => BUILT_MODELS.get(nodeId)?.kind === "glb",
);
const PROCEDURAL_NODES = CANONICAL_SKILL_NODES.filter(
  (nodeId) => BUILT_MODELS.get(nodeId)?.kind !== "glb",
);
const FOOTPRINT = { w: 1, d: 1 } as const;
const SURFACES = ["thumb", "ghost", "placed", "placed-advanced"] as const;
type Surface = (typeof SURFACES)[number];

const FAULT = process.env.BUILDING_OVERLAY_GUARD_FAULT ?? "";
const FORCE_GLB_NODE = "NUM.S";
const SUPPRESS_PROCEDURAL_NODE = PROCEDURAL_NODES[0] as string;

function selectedModelFixture(nodeId: string): THREE.Group {
  const selected = new THREE.Group();
  selected.name = `selected-model:${nodeId}`;
  const authoredPart = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0x8c7254 }),
  );
  authoredPart.name = `authored-part:${nodeId}`;
  authoredPart.position.y = 1.5;
  selected.add(authoredPart);
  return selected;
}

function productionIdentity(
  surface: Surface,
  nodeId: string,
  model: ResolvedBuildingModel,
): string | undefined {
  switch (surface) {
    case "thumb":
      return thumbBuildingIdentity({ nodeId } satisfies ThumbSubject);
    case "ghost":
      return ghostBuildingIdentity(nodeId);
    case "placed":
      return completedBuildingIdentity(model, false);
    case "placed-advanced":
      return completedBuildingIdentity(resolveBuildingModel(nodeId, "advanced"), false);
  }
}

/**
 * Test-only fault injection used to prove the same population guard fails in both directions:
 * a GLB can be forced through the overlay seam, or one procedural fallback can be suppressed.
 */
function guardedIdentity(
  surface: Surface,
  nodeId: string,
  model: ResolvedBuildingModel,
): string | undefined {
  if (FAULT === "force-glb" && nodeId === FORCE_GLB_NODE) return nodeId;
  if (FAULT === "suppress-procedural" && nodeId === SUPPRESS_PROCEDURAL_NODE) {
    return undefined;
  }
  return productionIdentity(surface, nodeId, model);
}

function prepareSurface(
  surface: Surface,
  nodeId: string,
  model: ResolvedBuildingModel,
): THREE.Object3D {
  const source = selectedModelFixture(nodeId);
  const identity = guardedIdentity(surface, nodeId, model);
  switch (surface) {
    case "thumb":
      return prepareThumbModel(source, prepareGridworkModel, identity);
    case "ghost":
      return prepareGhost(source, FOOTPRINT, prepareGridworkModel, identity).object;
    case "placed":
    case "placed-advanced":
      return prepareModel(source, FOOTPRINT, false, prepareGridworkModel, identity);
  }
}

function structuralMeshCount(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.buildingArtStructure === true) {
      count += 1;
    }
  });
  return count;
}

function overlayBoundaryFailures(): readonly string[] {
  const failures: string[] = [];
  for (const nodeId of CANONICAL_SKILL_NODES) {
    const model = BUILT_MODELS.get(nodeId) as ResolvedBuildingModel;
    const expectsOverlay = model.kind !== "glb";
    for (const surface of SURFACES) {
      const prepared = prepareSurface(surface, nodeId, model);
      const structures = structuralMeshCount(prepared);
      if (!expectsOverlay && structures !== 0) {
        failures.push(`${surface}:${nodeId} authored GLB mounted ${structures} overlays`);
      }
      if (expectsOverlay && structures < 1) {
        failures.push(`${surface}:${nodeId} procedural fallback mounted no overlay`);
      }
      const expectedIdentity = expectsOverlay ? nodeId : undefined;
      if (prepared.userData.selectedBuildingIdentity !== expectedIdentity) {
        failures.push(
          `${surface}:${nodeId} selected identity was ${String(
            prepared.userData.selectedBuildingIdentity,
          )}, expected ${String(expectedIdentity)}`,
        );
      }
      disposePreparedModel(prepared);
    }
  }
  return failures;
}

describe("authored GLBs versus procedural building fallbacks", () => {
  it("derives two non-empty populations with floors and exact composition", () => {
    expect(CANONICAL_SKILL_NODES.length).toBeGreaterThanOrEqual(62);
    expect(new Set(CANONICAL_SKILL_NODES).size).toBe(CANONICAL_SKILL_NODES.length);

    expect(GLB_NODES.length).toBeGreaterThanOrEqual(56);
    expect(GLB_NODES).toHaveLength(56);
    expect(new Set(GLB_NODES)).toEqual(new Set(SKILL_MODEL_NODES));

    expect(PROCEDURAL_NODES.length).toBeGreaterThanOrEqual(6);
    expect(PROCEDURAL_NODES).toHaveLength(6);
    expect(new Set(PROCEDURAL_NODES)).toEqual(
      new Set(Object.keys(EARLY_MODERN_BUILDING_VARIANTS)),
    );
    expect(GLB_NODES).toContain(FORCE_GLB_NODE);
    expect(PROCEDURAL_NODES).toContain(SUPPRESS_PROCEDURAL_NODE);

    for (const era of ERA_SEQUENCE) {
      const inGlbs = GLB_NODES.filter((nodeId) => era.nodes.includes(nodeId));
      const inProcedural = PROCEDURAL_NODES.filter((nodeId) => era.nodes.includes(nodeId));
      expect(
        [...inGlbs, ...inProcedural].sort(),
        `${era.id} partition composition`,
      ).toEqual([...era.nodes].sort());
    }
    expect(GLB_NODES.length + PROCEDURAL_NODES.length).toBe(CANONICAL_SKILL_NODES.length);
  });

  it("independently selects exactly one built model or fallback variant per node", () => {
    const selectedUrls = new Set<string>();
    for (const nodeId of GLB_NODES) {
      const selected = BUILT_MODELS.get(nodeId) as ResolvedBuildingModel;
      const advanced = resolveBuildingModel(nodeId, "advanced");
      expect(selected.url, nodeId).toEqual(
        expect.stringContaining(`${nodeFilePrefix(nodeId)}-built.glb`),
      );
      expect(selected.variantId, nodeId).toBeUndefined();
      expect(advanced.kind, `${nodeId} advanced kind`).toBe("glb");
      expect(advanced.modelStage, `${nodeId} advanced model stage`).toBe("built");
      expect(advanced.url, `${nodeId} advanced url`).toBe(selected.url);
      expect(completedBuildingIdentity(advanced, false), `${nodeId} advanced overlay`).toBe(
        undefined,
      );
      expect(selectedUrls.has(selected.url as string), `${nodeId} reuses another GLB`).toBe(
        false,
      );
      selectedUrls.add(selected.url as string);
    }
    for (const nodeId of PROCEDURAL_NODES) {
      const selected = BUILT_MODELS.get(nodeId) as ResolvedBuildingModel;
      const advanced = resolveBuildingModel(nodeId, "advanced");
      expect(selected.kind, nodeId).toBe("built");
      expect(selected.url, nodeId).toBeNull();
      expect(selected.variantId, `${nodeId} selected no procedural variant`).toBeTruthy();
      expect(advanced.kind, `${nodeId} advanced kind`).toBe("built");
      expect(advanced.modelStage, `${nodeId} advanced model stage`).toBe("built");
      expect(advanced.variantId, `${nodeId} advanced variant`).toBe(selected.variantId);
      expect(completedBuildingIdentity(advanced, false), `${nodeId} advanced overlay`).toBe(
        nodeId,
      );
    }
  });

  it("keeps overlays off every GLB and on every fallback across all three surfaces", () => {
    const failures = overlayBoundaryFailures();
    expect(
      failures.slice(0, 12),
      `${failures.length} overlay-boundary failures under fault "${FAULT || "none"}"`,
    ).toEqual([]);
  });
});
