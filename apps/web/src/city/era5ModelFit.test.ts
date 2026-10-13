import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

const MODELS = join(process.cwd(), "apps/web/src/city/art/models");
const GRID_CELL = 4;
const FOOTPRINT_FILL = 0.95;

interface GlbJson {
  readonly scenes?: readonly { readonly nodes?: readonly number[] }[];
  readonly nodes?: readonly {
    readonly matrix?: readonly number[];
    readonly translation?: readonly number[];
    readonly rotation?: readonly number[];
    readonly scale?: readonly number[];
    readonly mesh?: number;
    readonly children?: readonly number[];
  }[];
  readonly meshes?: readonly {
    readonly primitives?: readonly {
      readonly attributes?: Readonly<Record<string, number>>;
    }[];
  }[];
  readonly accessors?: readonly {
    readonly min?: readonly number[];
    readonly max?: readonly number[];
  }[];
}

function jsonOf(bytes: Buffer): GlbJson {
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  return JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength).trim()) as GlbJson;
}

function localMatrix(node: NonNullable<GlbJson["nodes"]>[number]): Matrix4 {
  if (node.matrix) return new Matrix4().fromArray(node.matrix);
  return new Matrix4().compose(
    new Vector3(...(node.translation ?? [0, 0, 0])),
    new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
    new Vector3(...(node.scale ?? [1, 1, 1])),
  );
}

function groundSizeOf(file: string): { readonly x: number; readonly z: number } {
  const json = jsonOf(readFileSync(join(MODELS, file)));
  const bounds = new Box3();
  let positions = 0;

  function visit(index: number, parent: Matrix4): void {
    const node = json.nodes?.[index];
    if (!node) return;
    const world = parent.clone().multiply(localMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
        const positionIndex = primitive.attributes?.POSITION;
        const accessor =
          positionIndex === undefined ? undefined : json.accessors?.[positionIndex];
        if (!accessor?.min || !accessor.max) continue;
        bounds.union(
          new Box3(new Vector3(...accessor.min), new Vector3(...accessor.max)).applyMatrix4(
            world,
          ),
        );
        positions += 1;
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }

  for (const scene of json.scenes ?? []) {
    for (const root of scene.nodes ?? []) visit(root, new Matrix4());
  }
  expect(positions, `${file} has POSITION bounds`).toBeGreaterThan(0);
  const size = bounds.getSize(new Vector3());
  expect(size.x, `${file} width`).toBeGreaterThan(0);
  expect(size.z, `${file} depth`).toBeGreaterThan(0);
  return { x: size.x, z: size.z };
}

function runtimeFill(
  size: { readonly x: number; readonly z: number },
  footprint: { readonly w: number; readonly d: number },
): { readonly x: number; readonly z: number } {
  const scale = Math.min(
    (footprint.w * GRID_CELL * FOOTPRINT_FILL) / size.x,
    (footprint.d * GRID_CELL * FOOTPRINT_FILL) / size.z,
  );
  return {
    x: (size.x * scale) / (footprint.w * GRID_CELL),
    z: (size.z * scale) / (footprint.d * GRID_CELL),
  };
}

const CASES = [
  {
    name: "Great Barn",
    file: "civic-medieval-great-barn-built.glb",
    footprint: { w: 2, d: 2 },
    minimum: 0.8,
    previous: { x: 18.6, z: 38.538 },
  },
  {
    name: "Guild Hall",
    file: "rat-3-built.glb",
    footprint: { w: 2, d: 2 },
    minimum: 0.85,
    previous: { x: 32.248, z: 23.702 },
  },
] as const;

describe("Era 5 square-plot composition", () => {
  it.each(CASES)("$name's previous binary fails the current fit floor", (row) => {
    const previous = runtimeFill(row.previous, row.footprint);
    expect(
      Math.min(previous.x, previous.z),
      `${row.name} old fill ${previous.x.toFixed(3)}/${previous.z.toFixed(3)}`,
    ).toBeLessThan(row.minimum);
  });

  it.each(CASES)("$name fills both axes without leaving its frozen plot", (row) => {
    const fill = runtimeFill(groundSizeOf(row.file), row.footprint);
    expect(fill.x, `${row.name} X fill`).toBeGreaterThanOrEqual(row.minimum);
    expect(fill.z, `${row.name} Z fill`).toBeGreaterThanOrEqual(row.minimum);
    expect(fill.x, `${row.name} remains contained on X`).toBeLessThanOrEqual(0.951);
    expect(fill.z, `${row.name} remains contained on Z`).toBeLessThanOrEqual(0.951);
  });
});
