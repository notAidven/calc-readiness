import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import type { Footprint } from "../worldLayout";
import { footprintFitScale, MAX_BUILD_HEIGHT } from "../worldLayout";
import { prepareThumbModel } from "./BuildingThumb";
import { prepareGhost } from "./GhostBuilding";
import {
  GHOST_PREPARATION,
  type GridworkPreparer,
  PLACED_PREPARATION,
  prepareGridworkModel,
  THUMB_PREPARATION,
} from "./modelPreparation";
import { prepareModel } from "./PlacedBuilding";
import { applyFrost } from "./winterFrost";

const FOOTPRINT: Footprint = { w: 1, d: 2 };

function legacyReviveMaterial(source: THREE.Material): THREE.Material {
  const mat = source.clone();
  if (mat instanceof THREE.MeshStandardMaterial) {
    mat.flatShading = true;
    const e = mat.emissive;
    if (e && e.r + e.g + e.b > 0) {
      mat.emissiveIntensity = 1.2;
    }
  }
  mat.needsUpdate = true;
  return mat;
}

/**
 * Independent baseline copied from the pre-Task-8 `prepareModel` body at reviewed
 * head 084a6b2c. It deliberately does not call the new preparation seam.
 */
function legacyPrepareUntagged(
  scene: THREE.Object3D,
  footprint: Footprint,
  frosted = false,
): THREE.Object3D {
  const root = scene.clone(true);

  // Fit THIS model's own ground box to the node's footprint (a "contain" fit), so
  // every stage occupies the same footprint regardless of its native size.
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(footprintFitScale(size.x, size.z, footprint));

  // Cap the rendered height so a slender tower filling its base can't tower so tall
  // it visually spills across extra cells. Only over-tall models are squashed.
  const sized = new THREE.Box3().setFromObject(root);
  const height = sized.max.y - sized.min.y;
  if (height > MAX_BUILD_HEIGHT) {
    root.scale.y *= MAX_BUILD_HEIGHT / height;
  }

  const grounded = new THREE.Box3().setFromObject(root);
  root.position.set(
    -(grounded.min.x + grounded.max.x) / 2,
    -grounded.min.y,
    -(grounded.min.z + grounded.max.z) / 2,
  );

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (!frosted) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => legacyReviveMaterial(m))
          : legacyReviveMaterial(mesh.material);
      }
    }
  });
  if (frosted) {
    applyFrost(root);
  }
  return root;
}

function eraOneScene(): THREE.Group {
  const root = new THREE.Group();
  const shared = new THREE.MeshStandardMaterial({
    color: 0xc98a5e,
    emissive: 0xffb56b,
    emissiveIntensity: 0.35,
    opacity: 0.82,
  });
  shared.name = "era-one-shared";
  const basic = new THREE.MeshBasicMaterial({
    color: 0x526d82,
    opacity: 0.74,
    transparent: true,
  });
  basic.name = "era-one-basic";
  const left = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1.5), shared);
  left.name = "era-one-left";
  left.position.set(-1.5, 2.25, 0.25);
  const right = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 2), shared);
  right.name = "era-one-right";
  right.position.set(1.25, 1.25, -0.5);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 2.5), [shared, basic]);
  roof.name = "era-one-roof";
  roof.position.set(0.2, 4.1, 0);
  root.add(left, right, roof);
  return root;
}

function eraSevenScene(): THREE.Group {
  const root = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: 0x697682,
    roughness: 0.28,
    metalness: 0.7,
  });
  steel.name = "era-seven-steel";
  const brick = new THREE.MeshStandardMaterial({
    color: 0x8b574a,
    emissive: 0x000000,
  });
  brick.name = "era-seven-brick";
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6, 2), [steel, brick]);
  body.name = "era-seven-body";
  body.position.set(-2.5, 1.75, 1.5);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), steel);
  chimney.name = "era-seven-chimney";
  chimney.position.set(-3.4, 6, 1.25);
  root.add(body, chimney);
  return root;
}

function overHeightUntaggedScene(): THREE.Group {
  const root = new THREE.Group();
  const shared = new THREE.MeshStandardMaterial({
    color: 0x765b50,
    emissive: 0x251008,
    emissiveIntensity: 0.2,
  });
  shared.name = "over-height-shared";
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 120, 0.8), shared);
  tower.name = "over-height-tower";
  tower.position.set(1.75, 63, -2.25);
  const annex = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.1), shared);
  annex.name = "over-height-annex";
  annex.position.set(-0.5, 4, 1.25);
  root.add(tower, annex);
  return root;
}

function taggedMaterialRecord(): Record<string, unknown> {
  return {
    schema: 1,
    kind: "toon",
    sourceMaterialKey: "over-height-tagged",
    color: [0.2, 0.4, 0.6],
    baseMap: null,
    gradient: {
      width: 3,
      height: 1,
      channels: 4,
      channelInterpretation: "RGBA8_UNORM",
      texels: [
        [0, 0, 0, 255],
        [128, 128, 128, 255],
        [255, 255, 255, 255],
      ],
      sourceObjectType: "CanvasTexture",
      runtimeObjectType: "DataTexture",
      format: "RGBAFormat",
      type: "UnsignedByteType",
      minFilter: "NearestFilter",
      magFilter: "NearestFilter",
      wrapS: "ClampToEdgeWrapping",
      wrapT: "ClampToEdgeWrapping",
      generateMipmaps: false,
      flipY: false,
      premultiplyAlpha: false,
      unpackAlignment: 1,
      colorSpace: THREE.NoColorSpace,
    },
    render: {
      opacity: 1,
      transparent: false,
      alphaTest: 0,
      side: "FrontSide",
      depthTest: true,
      depthWrite: true,
      depthFunc: "LessEqualDepth",
      colorWrite: true,
      blending: "NormalBlending",
      blendSrc: "SrcAlphaFactor",
      blendDst: "OneMinusSrcAlphaFactor",
      blendEquation: "AddEquation",
      blendSrcAlpha: null,
      blendDstAlpha: null,
      blendEquationAlpha: null,
      premultipliedAlpha: false,
      forceSinglePass: false,
      polygonOffset: false,
      polygonOffsetFactor: 0,
      polygonOffsetUnits: 0,
      toneMapped: true,
      dithering: false,
      flatShading: false,
      vertexColors: false,
      fog: true,
    },
  };
}

function overHeightTaggedScene(): THREE.Group {
  const root = new THREE.Group();
  root.userData.gridworkLateEraAsset = {
    schema: 1,
    sourceSha256: "a".repeat(64),
    era: "cyberpunk",
    sourceKey: "TRG.9",
    stage: "built",
    basename: "trg-9-built",
  };
  const transport = new THREE.MeshStandardMaterial({ color: 0xffffff });
  transport.userData.gridworkMaterial = taggedMaterialRecord();
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 120, 0.8), transport);
  tower.name = "tagged-over-height-tower";
  tower.position.y = 60;
  root.add(tower);
  return root;
}

function materialSnapshot(material: THREE.Material, identity: number) {
  const common = material as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    flatShading?: boolean;
    metalness?: number;
    roughness?: number;
    vertexColors?: boolean;
  };
  return {
    identity,
    className: material.type,
    name: material.name,
    opacity: material.opacity,
    transparent: material.transparent,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    colorWrite: material.colorWrite,
    blending: material.blending,
    side: material.side,
    color: common.color?.getHex() ?? null,
    emissive: common.emissive?.getHex() ?? null,
    emissiveIntensity: common.emissiveIntensity ?? null,
    flatShading: common.flatShading ?? null,
    metalness: common.metalness ?? null,
    roughness: common.roughness ?? null,
    vertexColors: common.vertexColors ?? null,
  };
}

function preparedState(root: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(root);
  const identities = new Map<THREE.Material, number>();
  const meshes: unknown[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    meshes.push({
      name: object.name,
      castShadow: object.castShadow,
      receiveShadow: object.receiveShadow,
      indexed: object.geometry.index !== null,
      colorAttribute:
        object.geometry.getAttribute("color") === undefined
          ? null
          : Array.from(object.geometry.getAttribute("color").array),
      materials: materials.map((material) => {
        if (!identities.has(material)) identities.set(material, identities.size);
        return materialSnapshot(material, identities.get(material) as number);
      }),
    });
  });
  return {
    scale: root.scale.toArray(),
    position: root.position.toArray(),
    bounds: {
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
    },
    meshes,
  };
}

function preparedHeight(root: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(root);
  return box.max.y - box.min.y;
}

describe("legacy untagged preparation remains exact", () => {
  it("matches the independent Era 1, Era 7, and over-height baseline snapshots", () => {
    for (const fixture of [eraOneScene, eraSevenScene, overHeightUntaggedScene]) {
      for (const frosted of [false, true]) {
        const expected = preparedState(
          legacyPrepareUntagged(fixture(), FOOTPRINT, frosted),
        );
        const actual = preparedState(
          prepareGridworkModel(fixture(), FOOTPRINT, {
            ...PLACED_PREPARATION,
            frosted,
          }),
        );
        expect(actual, `${fixture.name}/${frosted ? "frosted" : "fair"}`).toStrictEqual(
          expected,
        );
      }
    }
  });

  it("PREP001 retains the existing untagged Y-height cap", () => {
    expect(
      preparedHeight(
        prepareGridworkModel(overHeightUntaggedScene(), FOOTPRINT, PLACED_PREPARATION),
      ),
      "PREP001 final untagged height assertion",
    ).toBeCloseTo(MAX_BUILD_HEIGHT, 8);
  });

  it("PREP002 retains cap-before-ground ordering", () => {
    const expected = preparedState(
      legacyPrepareUntagged(overHeightUntaggedScene(), FOOTPRINT, false),
    );
    const actual = preparedState(
      prepareGridworkModel(overHeightUntaggedScene(), FOOTPRINT, PLACED_PREPARATION),
    );
    expect(actual, "PREP002 final cap-and-ground state equality").toStrictEqual(expected);
  });

  it("PREP003 retains the outer frosted branch without revival", () => {
    const expected = preparedState(legacyPrepareUntagged(eraOneScene(), FOOTPRINT, true));
    const actual = preparedState(
      prepareGridworkModel(eraOneScene(), FOOTPRINT, {
        ...PLACED_PREPARATION,
        frosted: true,
      }),
    );
    expect(actual, "PREP003 final frosted state equality").toStrictEqual(expected);
  });

  it("PREP004 retains fair-weather untagged revival", () => {
    const expected = preparedState(legacyPrepareUntagged(eraOneScene(), FOOTPRINT, false));
    const actual = preparedState(
      prepareGridworkModel(eraOneScene(), FOOTPRINT, PLACED_PREPARATION),
    );
    expect(actual, "PREP004 final fair state equality").toStrictEqual(expected);
  });

  it("refuses a tagged model that would activate the legacy height mutation", () => {
    expect(() =>
      prepareGridworkModel(overHeightTaggedScene(), FOOTPRINT, PLACED_PREPARATION),
    ).toThrow("late-era model would activate MAX_BUILD_HEIGHT");
  });
});

describe("the production surfaces consume the named preparation presets", () => {
  it("injects the placed preset through prepareModel", () => {
    const scene = eraOneScene();
    const prepared = new THREE.Group();
    const prepare: GridworkPreparer = vi.fn(() => prepared);

    expect(prepareModel(scene, FOOTPRINT, true, prepare)).toBe(prepared);
    expect(prepare).toHaveBeenCalledWith(scene, FOOTPRINT, {
      ...PLACED_PREPARATION,
      frosted: true,
    });
  });

  it("injects the thumbnail preset without fitting", () => {
    const scene = eraOneScene();
    const prepared = new THREE.Group();
    const prepare: GridworkPreparer = vi.fn(() => prepared);

    expect(prepareThumbModel(scene, prepare)).toBe(prepared);
    expect(prepare).toHaveBeenCalledWith(scene, null, THUMB_PREPARATION);
  });

  it("injects node-only ghost preparation before the app material override", () => {
    const source = new THREE.Group();
    source.add(
      new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()),
    );
    const prepared = source.clone(true);
    const prepare: GridworkPreparer = vi.fn(() => prepared);

    expect(prepareGhost(source, FOOTPRINT, prepare).object).toBe(prepared);
    expect(prepare).toHaveBeenCalledWith(source, FOOTPRINT, GHOST_PREPARATION);
  });
});
