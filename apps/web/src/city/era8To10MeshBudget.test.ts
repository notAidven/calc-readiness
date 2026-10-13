import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { describe, expect, it } from "vitest";

const CANDIDATE_ROOT = process.env.ERA8_10_CANDIDATE_ROOT;
const METADATA = "era-08-10-gridwork-export-metadata.json";

interface CandidateAccessor {
  readonly bufferView: number;
  readonly byteOffset?: number;
  readonly componentType: number;
  readonly count: number;
  readonly type: string;
}

interface CandidateGlb {
  readonly accessors: readonly CandidateAccessor[];
  readonly bufferViews: readonly {
    readonly byteOffset?: number;
    readonly byteLength: number;
    readonly byteStride?: number;
  }[];
  readonly meshes: readonly {
    readonly primitives: readonly {
      readonly attributes: { readonly POSITION: number };
      readonly indices?: number;
      readonly mode?: number;
    }[];
  }[];
  readonly nodes: readonly {
    readonly mesh?: number;
    readonly translation?: readonly number[];
    readonly rotation?: readonly number[];
    readonly scale?: readonly number[];
    readonly matrix?: readonly number[];
  }[];
}

interface CandidateMeshRow {
  readonly file: string;
  readonly era: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly sourceMeshes: number;
  readonly shippedMeshes: number;
  readonly sourceTriangles: number;
  readonly shippedTriangles: number;
  readonly materialCount: number;
  readonly toonMaterialCount: number;
  readonly unlitMaterialCount: number;
  readonly baseMapCount: number;
  readonly textureCount: number;
  readonly embeddedImageCount: number;
  readonly sourceBounds: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
    readonly size: readonly [number, number, number];
  };
  readonly shippedBounds: CandidateMeshRow["sourceBounds"];
}

function requiredPath(root: string, file: string): string {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(`candidate output missing: ${basename(file)}`);
  return path;
}

function components(type: string): number {
  const count = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
  if (!count) throw new Error(`unsupported candidate accessor type: ${type}`);
  return count;
}

function componentBytes(componentType: number): number {
  const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[componentType];
  if (!bytes) throw new Error(`unsupported candidate component type: ${componentType}`);
  return bytes;
}

function readComponent(view: DataView, offset: number, componentType: number): number {
  if (componentType === 5121) return view.getUint8(offset);
  if (componentType === 5123) return view.getUint16(offset, true);
  if (componentType === 5125) return view.getUint32(offset, true);
  if (componentType === 5126) return view.getFloat32(offset, true);
  throw new Error(`unsupported candidate component type: ${componentType}`);
}

function requiredEntry<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`${label} index is out of range: ${index}`);
  return value;
}

function decodeAccessor(
  json: CandidateGlb,
  binary: Uint8Array,
  accessorIndex: number,
): readonly number[] {
  const accessor = requiredEntry(json.accessors, accessorIndex, "accessor");
  const bufferView = requiredEntry(json.bufferViews, accessor.bufferView, "bufferView");
  const width = components(accessor.type);
  const bytes = componentBytes(accessor.componentType);
  const stride = bufferView.byteStride ?? width * bytes;
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const values: number[] = [];
  for (let row = 0; row < accessor.count; row += 1) {
    for (let column = 0; column < width; column += 1) {
      values.push(
        readComponent(view, start + row * stride + column * bytes, accessor.componentType),
      );
    }
  }
  return values;
}

function aggregate(rows: readonly CandidateMeshRow[]) {
  type AggregateField =
    | "bytes"
    | "sourceMeshes"
    | "shippedMeshes"
    | "sourceTriangles"
    | "shippedTriangles"
    | "materialCount"
    | "toonMaterialCount"
    | "unlitMaterialCount"
    | "baseMapCount"
    | "textureCount"
    | "embeddedImageCount";
  const sum = (field: AggregateField) => rows.reduce((total, row) => total + row[field], 0);
  return {
    bytes: sum("bytes"),
    sourceMeshes: sum("sourceMeshes"),
    shippedMeshes: sum("shippedMeshes"),
    sourceTriangles: sum("sourceTriangles"),
    shippedTriangles: sum("shippedTriangles"),
    materials: sum("materialCount"),
    toonMaterials: sum("toonMaterialCount"),
    unlitMaterials: sum("unlitMaterialCount"),
    baseMaps: sum("baseMapCount"),
    textures: sum("textureCount"),
    embeddedImages: sum("embeddedImageCount"),
  };
}

describe.skipIf(!CANDIDATE_ROOT)("Task 10 candidate mesh budgets", () => {
  it("derives every mesh, triangle, and bound from the exact staged GLB bytes", async () => {
    const root = CANDIDATE_ROOT as string;
    const exporter = await import("../../../../scripts/export-era8-10-building-models.mjs");
    const metadata = JSON.parse(readFileSync(requiredPath(root, METADATA), "utf8")) as {
      readonly outputs: readonly CandidateMeshRow[];
      readonly aggregates: {
        readonly global: unknown;
        readonly byEra: Readonly<Record<string, unknown>>;
      };
    };
    expect(metadata.outputs).toHaveLength(87);

    for (const row of metadata.outputs) {
      const bytes = readFileSync(requiredPath(root, row.file));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
      const parsed = exporter.parseGlb(bytes);
      const json = parsed.json as unknown as CandidateGlb;
      expect(json.meshes.length, `${row.file} shipped mesh count`).toBe(row.shippedMeshes);
      expect(row.shippedMeshes, `${row.file} mesh nonincrease`).toBeLessThanOrEqual(
        row.sourceMeshes,
      );

      let triangles = 0;
      const minimum: [number, number, number] = [
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      ];
      const maximum: [number, number, number] = [
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ];
      for (const mesh of json.meshes) {
        expect(mesh.primitives.length, `${row.file} primitive floor`).toBeGreaterThan(0);
        for (const primitive of mesh.primitives) {
          expect(primitive.mode ?? 4, `${row.file} triangle primitive mode`).toBe(4);
          const position = requiredEntry(
            json.accessors,
            primitive.attributes.POSITION,
            "POSITION accessor",
          );
          expect(position.type, `${row.file} POSITION width`).toBe("VEC3");
          const values = decodeAccessor(json, parsed.binary, primitive.attributes.POSITION);
          expect(values).toHaveLength(position.count * 3);
          for (let offset = 0; offset < values.length; offset += 3) {
            for (let axis = 0; axis < 3; axis += 1) {
              const value = values[offset + axis];
              if (value === undefined)
                throw new Error(`${row.file} POSITION value is absent`);
              expect(Number.isFinite(value), `${row.file} finite POSITION`).toBe(true);
              minimum[axis] = Math.min(minimum[axis] as number, value);
              maximum[axis] = Math.max(maximum[axis] as number, value);
            }
          }
          const elements =
            primitive.indices === undefined
              ? position.count
              : requiredEntry(json.accessors, primitive.indices, "index accessor").count;
          expect(elements % 3, `${row.file} integral triangle count`).toBe(0);
          triangles += elements / 3;
        }
      }
      expect(triangles, `${row.file} shipped triangles`).toBe(row.shippedTriangles);
      expect(row.shippedTriangles, `${row.file} source triangle equality`).toBe(
        row.sourceTriangles,
      );
      const size: [number, number, number] = [
        maximum[0] - minimum[0],
        maximum[1] - minimum[1],
        maximum[2] - minimum[2],
      ];
      for (let axis = 0; axis < 3; axis += 1) {
        const actualMin = minimum[axis];
        const actualMax = maximum[axis];
        const actualSize = size[axis];
        const expectedMin = row.shippedBounds.min[axis];
        const expectedMax = row.shippedBounds.max[axis];
        const expectedSize = row.shippedBounds.size[axis];
        if (
          actualMin === undefined ||
          actualMax === undefined ||
          actualSize === undefined ||
          expectedMin === undefined ||
          expectedMax === undefined ||
          expectedSize === undefined
        ) {
          throw new Error(`${row.file} bound axis is absent: ${axis}`);
        }
        expect(actualMin, `${row.file} bound min ${axis}`).toBeCloseTo(expectedMin, 5);
        expect(actualMax, `${row.file} bound max ${axis}`).toBeCloseTo(expectedMax, 5);
        expect(actualSize, `${row.file} bound size ${axis}`).toBeCloseTo(expectedSize, 5);
        expect(actualSize, `${row.file} nonempty bound ${axis}`).toBeGreaterThan(0);
      }
      expect(row.sourceBounds, `${row.file} source/shipped bounds`).toEqual(
        row.shippedBounds,
      );
      for (const node of json.nodes) {
        if (node.mesh === undefined) continue;
        expect(node.translation ?? [0, 0, 0], `${row.file} baked translation`).toEqual([
          0, 0, 0,
        ]);
        expect(node.rotation ?? [0, 0, 0, 1], `${row.file} baked rotation`).toEqual([
          0, 0, 0, 1,
        ]);
        expect(node.scale ?? [1, 1, 1], `${row.file} baked scale`).toEqual([1, 1, 1]);
        expect(node.matrix, `${row.file} baked matrix`).toBeUndefined();
      }
    }

    expect(metadata.aggregates.global).toEqual(aggregate(metadata.outputs));
    for (const era of ["atomic_age", "information_age", "cyberpunk"]) {
      expect(metadata.aggregates.byEra[era]).toEqual(
        aggregate(metadata.outputs.filter((row) => row.era === era)),
      );
    }
  });
});
