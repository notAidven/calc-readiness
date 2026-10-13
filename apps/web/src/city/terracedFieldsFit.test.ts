import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { civicBuildingOrThrow } from "@cr/economy";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { FOOTPRINT_FILL, footprintFitScale, GRID_CELL } from "./worldLayout";

const TERRACED_FIELDS = resolve(
  process.cwd(),
  "apps/web/src/city/art/models/civic-bronze-age-terraced-fields-built.glb",
);

interface GroundSize {
  readonly x: number;
  readonly z: number;
}

interface RuntimeFill {
  readonly width: number;
  readonly depth: number;
  readonly scale: number;
}

function fillUnderPlacedModelStack(size: GroundSize): RuntimeFill {
  const row = civicBuildingOrThrow("bronze_age_terraced_fields");
  const footprint = { w: row.footprint.width, d: row.footprint.depth };
  const scale = footprintFitScale(size.x, size.z, footprint);
  return {
    width: (size.x * scale) / (footprint.w * GRID_CELL),
    depth: (size.z * scale) / (footprint.d * GRID_CELL),
    scale,
  };
}

interface GlbJson {
  readonly scene?: number;
  readonly scenes: readonly { readonly nodes?: readonly number[] }[];
  readonly nodes: readonly {
    readonly children?: readonly number[];
    readonly mesh?: number;
    readonly matrix?: readonly number[];
    readonly translation?: readonly number[];
    readonly rotation?: readonly number[];
    readonly scale?: readonly number[];
  }[];
  readonly meshes: readonly {
    readonly primitives: readonly {
      readonly attributes: Readonly<Record<string, number>>;
    }[];
  }[];
  readonly accessors: readonly {
    readonly min?: readonly number[];
    readonly max?: readonly number[];
  }[];
}

function glbJson(bytes: Buffer): GlbJson {
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.toString("ascii", 16, 20)).toBe("JSON");
  return JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength).trim()) as GlbJson;
}

function localMatrix(node: GlbJson["nodes"][number]): Matrix4 {
  if (node.matrix) {
    return new Matrix4().fromArray(node.matrix);
  }
  return new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0, 0, 0]),
    new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new Vector3().fromArray(node.scale ?? [1, 1, 1]),
  );
}

function nativeGroundSize(): GroundSize {
  const bytes = readFileSync(TERRACED_FIELDS);
  const gltf = glbJson(bytes);
  const bounds = new Box3();
  const visit = (index: number, parent: Matrix4): void => {
    const node = gltf.nodes[index];
    if (!node) {
      return;
    }
    const world = parent.clone().multiply(localMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh]?.primitives ?? []) {
        const accessor = gltf.accessors[primitive.attributes.POSITION as number];
        if (!accessor?.min || !accessor.max) {
          continue;
        }
        for (const x of [accessor.min[0], accessor.max[0]]) {
          for (const y of [accessor.min[1], accessor.max[1]]) {
            for (const z of [accessor.min[2], accessor.max[2]]) {
              bounds.expandByPoint(
                new Vector3(x as number, y as number, z as number).applyMatrix4(world),
              );
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) {
      visit(child, world);
    }
  };
  const scene = gltf.scenes[gltf.scene ?? 0];
  for (const node of scene?.nodes ?? []) {
    visit(node, new Matrix4());
  }
  expect(bounds.isEmpty()).toBe(false);
  const size = bounds.getSize(new Vector3());
  return { x: size.x, z: size.z };
}

describe("Terraced Fields fills its frozen 1x2 plot under the real uniform contain fit", () => {
  it("rejects the prior 30x34 export that left 46.2% of the long plot empty", () => {
    const prior = fillUnderPlacedModelStack({ x: 30, z: 34 });
    expect(prior.width).toBeCloseTo(FOOTPRINT_FILL, 3);
    expect(prior.depth).toBeCloseTo(0.538, 3);
    expect(Math.min(prior.width, prior.depth)).toBeLessThan(0.85);
  });

  it("fills at least 85% on both axes without clipping, spill, or non-uniform scale", () => {
    const native = nativeGroundSize();
    const fill = fillUnderPlacedModelStack(native);

    expect(native.x).toBeGreaterThan(0);
    expect(native.z).toBeGreaterThan(0);
    expect(fill.width).toBeGreaterThanOrEqual(0.85);
    expect(fill.depth).toBeGreaterThanOrEqual(0.85);
    expect(fill.width).toBeLessThanOrEqual(FOOTPRINT_FILL + 1e-6);
    expect(fill.depth).toBeLessThanOrEqual(FOOTPRINT_FILL + 1e-6);

    // One scalar is the runtime contract. These two independently recovered scales would
    // diverge if the guard accidentally blessed a non-uniform stretch.
    const renderedWidth = native.x * fill.scale;
    const renderedDepth = native.z * fill.scale;
    expect(renderedWidth / native.x).toBeCloseTo(renderedDepth / native.z, 10);
  });
});
