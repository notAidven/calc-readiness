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

const SKILLS = [
  ["Spinning Mill", "fun-1", { w: 2, d: 2 }],
  ["Cotton Warehouse", "fun-2", { w: 2, d: 1 }],
  ["Locomotive Shop", "fun-3", { w: 2, d: 1 }],
  ["Exhibition Hall", "fun-7", { w: 2, d: 2 }],
  ["Cannon Factory", "fun-8", { w: 2, d: 2 }],
  ["Water Tower", "pol-5", { w: 2, d: 2 }],
] as const;

const SHIPPING_MODELS = [
  ...SKILLS.flatMap(([name, prefix, footprint]) =>
    ["site", "construction", "built"].map((stage) => ({
      name: `${name} ${stage}`,
      file: `${prefix}-${stage}.glb`,
      footprint,
      minimum: 0.72,
      skill: true,
    })),
  ),
  {
    name: "Food Works built",
    file: "civic-industrial-cold-store-built.glb",
    footprint: { w: 2, d: 2 },
    minimum: 0.72,
    skill: false,
  },
  {
    name: "Workers' Houses built",
    file: "civic-industrial-workers-houses-built.glb",
    footprint: { w: 2, d: 1 },
    minimum: 0.72,
    skill: false,
  },
  {
    name: "Railroad Station built",
    file: "civic-industrial-public-baths-built.glb",
    footprint: { w: 2, d: 2 },
    minimum: 0.72,
    skill: false,
  },
  {
    name: "Library built",
    file: "civic-industrial-library-built.glb",
    footprint: { w: 1, d: 1 },
    minimum: 0.72,
    skill: false,
  },
  {
    name: "Engine House built",
    file: "townhall/townhall-industrial-built.glb",
    footprint: { w: 3, d: 2 },
    minimum: 0.72,
    skill: false,
  },
] as const;

/** Bounds from the first uncomposed staged export, before runtime plot amendments. */
const PREVIOUS_UNDERFILL = [
  {
    name: "Spinning Mill built",
    footprint: { w: 2, d: 2 },
    size: { x: 34.63, z: 21.36 },
  },
  {
    name: "Exhibition Hall built",
    footprint: { w: 2, d: 2 },
    size: { x: 35.89, z: 20.84 },
  },
  {
    name: "Cotton Warehouse construction",
    footprint: { w: 2, d: 1 },
    size: { x: 31.36, z: 9.94 },
  },
  {
    name: "Locomotive Shop site",
    footprint: { w: 2, d: 1 },
    size: { x: 33.6, z: 26.05 },
  },
  {
    name: "Locomotive Shop built",
    footprint: { w: 2, d: 1 },
    size: { x: 52.35, z: 17.58 },
  },
  {
    name: "Cannon Factory built",
    footprint: { w: 2, d: 2 },
    size: { x: 40.5, z: 23.69 },
  },
  {
    name: "Water Tower built",
    footprint: { w: 2, d: 2 },
    size: { x: 11.83, z: 17.47 },
  },
  {
    name: "Food Works built",
    footprint: { w: 2, d: 2 },
    size: { x: 34, z: 21.75 },
  },
  {
    name: "Railroad Station built",
    footprint: { w: 2, d: 2 },
    size: { x: 44.42, z: 17.6 },
  },
  {
    name: "Engine House built",
    footprint: { w: 3, d: 2 },
    size: { x: 35.81, z: 41.25 },
  },
] as const;

describe("Era 7 runtime footprint fit", () => {
  it.each(PREVIOUS_UNDERFILL)(
    "$name's uncomposed bounds fail the 0.72 fit floor",
    (row) => {
      const fill = runtimeFill(row.size, row.footprint);
      expect(
        Math.min(fill.x, fill.z),
        `${row.name} old fill ${fill.x.toFixed(3)}/${fill.z.toFixed(3)}`,
      ).toBeLessThan(0.72);
    },
  );

  it("guards every one of the 18 shipping skill stages, not only the built silhouettes", () => {
    const skillRows = SHIPPING_MODELS.filter((row) => row.skill);
    expect(skillRows).toHaveLength(18);
    expect(new Set(skillRows.map((row) => row.file)).size).toBe(18);
  });

  it.each(SHIPPING_MODELS)(
    "$name fills both runtime axes without stretching or leaving its frozen plot",
    (row) => {
      const fill = runtimeFill(groundSizeOf(row.file), row.footprint);
      expect(fill.x, `${row.name} X fill`).toBeGreaterThanOrEqual(row.minimum);
      expect(fill.z, `${row.name} Z fill`).toBeGreaterThanOrEqual(row.minimum);
      expect(fill.x, `${row.name} remains contained on X`).toBeLessThanOrEqual(0.951);
      expect(fill.z, `${row.name} remains contained on Z`).toBeLessThanOrEqual(0.951);
    },
  );
});
