import type { EraId } from "@cr/skill-graph";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";

import "../styles.css";

const VIEWPORT = { width: 1024, height: 580 } as const;
const CITY_CANVAS = { width: 1024, height: 518 } as const;
const TOLERANCE = { x: 0.075, y: 0.075 } as const;

interface PixelLandmark {
  readonly x: number;
  readonly y: number;
}

interface TargetReference {
  readonly source: { readonly width: number; readonly height: number };
  readonly landmarks: Readonly<Record<string, PixelLandmark>>;
}

/**
 * Footprint-box centres read from the two source-reference rasters, not from fixture cells.
 * Normalizing them by the source dimensions makes this guard independent of the reference
 * crops' different pixel sizes while preserving their authored composition.
 */
const TARGET_REFERENCES = {
  prehistoric: {
    source: { width: 854, height: 700 },
    landmarks: {
      "NUM.S": { x: 218, y: 407.9 },
      "NUM.2": { x: 560.5, y: 380.8 },
      "NUM.3": { x: 410.4, y: 205.8 },
      "NUM.4": { x: 740.7, y: 347.5 },
      "NUM.5": { x: 547.5, y: 173.3 },
      "town-hall": { x: 437, y: 277.5 },
    },
  },
  neolithic: {
    source: { width: 927, height: 623 },
    landmarks: {
      "EXP.1": { x: 252.6, y: 205.5 },
      "RAD.1": { x: 593.6, y: 498.6 },
      "RAD.2": { x: 232.6, y: 480.9 },
      "RAD.4": { x: 814.2, y: 312.9 },
      "town-hall": { x: 512.8, y: 284.5 },
    },
  },
} as const satisfies Readonly<Partial<Record<EraId, TargetReference>>>;

interface NormalizedLandmark {
  readonly x: number;
  readonly y: number;
}

function normalizedTarget(
  reference: TargetReference,
): Readonly<Record<string, NormalizedLandmark>> {
  // Preserve the source pixels' aspect instead of stretching their taller crops into the
  // wide learner canvas. At 1024×518 the comparison is the source's centred vertical crop.
  const comparableHeight =
    reference.source.width / (CITY_CANVAS.width / CITY_CANVAS.height);
  const cropTop = (reference.source.height - comparableHeight) / 2;
  return Object.fromEntries(
    Object.entries(reference.landmarks).map(([nodeId, point]) => [
      nodeId,
      {
        x: point.x / reference.source.width,
        y: (point.y - cropTop) / comparableHeight,
      },
    ]),
  );
}

function renderedLandmarks(
  nodeIds: readonly string[],
): Readonly<Record<string, NormalizedLandmark>> {
  const host = document.querySelector<HTMLElement>(".city-canvas");
  if (!host) {
    throw new Error("the Presenter landmark guard has no city canvas");
  }
  const hostBox = host.getBoundingClientRect();
  return Object.fromEntries(
    nodeIds.map((nodeId) => {
      const label = document.querySelector<HTMLElement>(`[data-skill-label="${nodeId}"]`);
      const raw = label?.dataset.footprintScreenBox;
      if (!raw) {
        throw new Error(`${nodeId} has no projected footprint box`);
      }
      const box = JSON.parse(raw) as {
        readonly left: number;
        readonly top: number;
        readonly right: number;
        readonly bottom: number;
      };
      return [
        nodeId,
        {
          x: (box.left + box.right) / 2 / hostBox.width,
          y: (box.top + box.bottom) / 2 / hostBox.height,
        },
      ];
    }),
  );
}

function maximumMovement(
  before: Readonly<Record<string, NormalizedLandmark>>,
  after: Readonly<Record<string, NormalizedLandmark>>,
): number {
  return Math.max(
    ...Object.keys(before).map((nodeId) => {
      const first = before[nodeId];
      const second = after[nodeId];
      if (!first || !second) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.hypot(second.x - first.x, second.y - first.y);
    }),
  );
}

async function settledLandmarks(
  eraId: keyof typeof TARGET_REFERENCES,
): Promise<Readonly<Record<string, NormalizedLandmark>>> {
  const reference = TARGET_REFERENCES[eraId];
  const nodeIds = Object.keys(reference.landmarks);
  window.history.replaceState(null, "", `/demo?presenter=1&era=${eraId}`);
  render(<App />);
  await screen.findByRole("button", { name: "Build" }, { timeout: 30_000 });
  await waitFor(
    () =>
      expect(
        nodeIds.every((nodeId) =>
          document.querySelector(
            `[data-skill-label="${nodeId}"][data-footprint-screen-box]`,
          ),
        ),
        `${eraId} did not project every reference landmark`,
      ).toBe(true),
    { timeout: 60_000 },
  );
  await document.fonts.ready;

  let previous = renderedLandmarks(nodeIds);
  for (let sample = 0; sample < 12; sample += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    const current = renderedLandmarks(nodeIds);
    if (maximumMovement(previous, current) < 0.0005) {
      return current;
    }
    previous = current;
  }
  throw new Error(`${eraId} landmark projection did not settle`);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

for (const eraId of ["prehistoric", "neolithic"] as const) {
  test(`${eraId} Presenter landmarks reproduce the normalized source composition`, {
    timeout: 120_000,
  }, async () => {
    await page.viewport(VIEWPORT.width, VIEWPORT.height);
    const target = normalizedTarget(TARGET_REFERENCES[eraId]);
    const actual = await settledLandmarks(eraId);
    const expectedIds = Object.keys(target);

    expect(expectedIds.length, `${eraId} target landmark floor`).toBeGreaterThanOrEqual(5);
    expect(new Set(Object.keys(actual)), `${eraId} projected landmark population`).toEqual(
      new Set(expectedIds),
    );
    for (const nodeId of expectedIds) {
      expect(
        Math.abs((actual[nodeId]?.x ?? Number.NaN) - (target[nodeId]?.x ?? Number.NaN)),
        `${eraId}/${nodeId} horizontal target error`,
      ).toBeLessThanOrEqual(TOLERANCE.x);
      expect(
        Math.abs((actual[nodeId]?.y ?? Number.NaN) - (target[nodeId]?.y ?? Number.NaN)),
        `${eraId}/${nodeId} vertical target error`,
      ).toBeLessThanOrEqual(TOLERANCE.y);
    }

    const xValues = Object.values(actual).map(({ x }) => x);
    const targetXValues = Object.values(target).map(({ x }) => x);
    const yValues = Object.values(actual).map(({ y }) => y);
    const targetYValues = Object.values(target).map(({ y }) => y);
    expect(
      Math.max(...xValues) - Math.min(...xValues),
      `${eraId} settlement remains horizontally compressed`,
    ).toBeGreaterThanOrEqual(
      Math.max(...targetXValues) - Math.min(...targetXValues) - 0.15,
    );
    expect(
      Math.max(...yValues) - Math.min(...yValues),
      `${eraId} settlement remains vertically compressed`,
    ).toBeGreaterThanOrEqual(Math.max(...targetYValues) - Math.min(...targetYValues) - 0.1);
  });
}
