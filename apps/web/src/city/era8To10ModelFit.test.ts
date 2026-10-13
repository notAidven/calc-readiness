import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FOOTPRINT_FILL,
  footprintFitScale,
  GRID_CELL,
  MAX_BUILD_HEIGHT,
} from "./worldLayout";

const CANDIDATE_ROOT = process.env.ERA8_10_CANDIDATE_ROOT;
const METADATA = "era-08-10-gridwork-export-metadata.json";

interface CandidateFitRow {
  readonly file: string;
  readonly runtimeFootprint: { readonly w: number; readonly d: number };
  readonly sourceBounds: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
    readonly size: readonly [number, number, number];
  };
  readonly shippedBounds: CandidateFitRow["sourceBounds"];
}

function requiredPath(root: string, file: string): string {
  const path = join(root, file);
  if (!existsSync(path)) throw new Error(`candidate output missing: ${basename(file)}`);
  return path;
}

describe.skipIf(!CANDIDATE_ROOT)("Task 10 candidate runtime fit", () => {
  it("uniformly contain-fits all 87 exact-source bounds without activating the height cap", () => {
    const root = CANDIDATE_ROOT as string;
    const metadata = JSON.parse(readFileSync(requiredPath(root, METADATA), "utf8")) as {
      readonly outputs: readonly CandidateFitRow[];
    };
    expect(metadata.outputs).toHaveLength(87);

    for (const row of metadata.outputs) {
      expect(row.sourceBounds, `${row.file} preserves source bounds`).toEqual(
        row.shippedBounds,
      );
      const { min, max, size } = row.shippedBounds;
      expect(
        [...min, ...max, ...size].every(Number.isFinite),
        `${row.file} finite bounds`,
      ).toBe(true);
      expect(
        size.every((axis) => axis > 0),
        `${row.file} nonempty bounds`,
      ).toBe(true);
      expect(
        [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
        `${row.file} coherent size`,
      ).toEqual(size);

      const scale = footprintFitScale(size[0], size[2], row.runtimeFootprint);
      expect(Number.isFinite(scale), `${row.file} finite fit scale`).toBe(true);
      expect(scale, `${row.file} positive fit scale`).toBeGreaterThan(0);
      const fitted = {
        width: size[0] * scale,
        height: size[1] * scale,
        depth: size[2] * scale,
      };
      const plot = {
        width: row.runtimeFootprint.w * GRID_CELL * FOOTPRINT_FILL,
        depth: row.runtimeFootprint.d * GRID_CELL * FOOTPRINT_FILL,
      };
      expect(fitted.width, `${row.file} runtime X contain-fit`).toBeLessThanOrEqual(
        plot.width + 1e-8,
      );
      expect(fitted.depth, `${row.file} runtime Z contain-fit`).toBeLessThanOrEqual(
        plot.depth + 1e-8,
      );
      expect(
        Math.min(Math.abs(fitted.width - plot.width), Math.abs(fitted.depth - plot.depth)),
        `${row.file} one contain-fit axis binds`,
      ).toBeLessThan(1e-8);
      expect(
        fitted.height,
        `${row.file} does not activate MAX_BUILD_HEIGHT`,
      ).toBeLessThanOrEqual(MAX_BUILD_HEIGHT);

      const preparedMin: [number, number, number] = [
        min[0] * scale - ((min[0] + max[0]) * scale) / 2,
        min[1] * scale - min[1] * scale,
        min[2] * scale - ((min[2] + max[2]) * scale) / 2,
      ];
      const preparedMax: [number, number, number] = [
        max[0] * scale - ((min[0] + max[0]) * scale) / 2,
        max[1] * scale - min[1] * scale,
        max[2] * scale - ((min[2] + max[2]) * scale) / 2,
      ];
      expect(preparedMin[1], `${row.file} runtime grounding`).toBeCloseTo(0, 10);
      expect(
        preparedMin[0] + preparedMax[0],
        `${row.file} runtime X centering`,
      ).toBeCloseTo(0, 10);
      expect(
        preparedMin[2] + preparedMax[2],
        `${row.file} runtime Z centering`,
      ).toBeCloseTo(0, 10);
      expect([scale, scale, scale], `${row.file} uniform scale`).toEqual([
        scale,
        scale,
        scale,
      ]);
    }
  });
});
