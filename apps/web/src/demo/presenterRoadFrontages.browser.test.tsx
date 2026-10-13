import type { EraId } from "@cr/skill-graph";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { CitySurface } from "../city/CitySurface";
import { roadCellKey, type RoadCell } from "../city/roads";
import type { CityLoad } from "../city/types";
import { resetCityEra } from "../city/useCityEra";
import { presenterFixtureFor } from "./presenterFixtures";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEWPORT = { width: 1024, height: 580 } as const;
const OUTPUT = "output/design-review/presenter-road-frontages";
const VARIANT = import.meta.env.VITE_PRESENTER_ROAD_REVIEW_VARIANT ?? "after";

interface Sample {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly png: string;
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const LOWER_NEOLITHIC_BRANCHES = [
  {
    nodeId: "RAD.2",
    cells: [
      { col: -4, row: -3 },
      { col: -4, row: -2 },
      { col: -4, row: -1 },
      { col: -4, row: 0 },
      { col: -5, row: 0 },
    ],
  },
  {
    nodeId: "RAD.1",
    cells: [
      { col: -3, row: 1 },
      { col: -2, row: 1 },
      { col: -1, row: 1 },
    ],
  },
] as const satisfies readonly {
  readonly nodeId: string;
  readonly cells: readonly RoadCell[];
}[];

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

function cityLoad(eraId: EraId, roads: readonly RoadCell[]): CityLoad {
  const seed = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId,
  }).city.seed;
  return {
    node_states: seed.nodeStates,
    placements: seed.placements,
    town_hall: seed.townHall,
    civic: seed.civic,
    roads,
  };
}

async function mountIsland(eraId: EraId, roads: readonly RoadCell[]): Promise<void> {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(
    null,
    "",
    `/demo?presenter=1&era=${encodeURIComponent(eraId)}`,
  );
  render(
    <div className="city-shell">
      <CitySurface
        enableCanvas
        enableOnboardingDemo={false}
        reducedMotion
        eraId={eraId}
        archipelagoMetrics
        suppressAchievementNotes
        suppressCrisisCalls
        loadCity={() => Promise.resolve(cityLoad(eraId, roads))}
      />
    </div>,
  );
  await screen.findByRole("button", { name: "Build" }, { timeout: 30_000 });
  await waitFor(
    () =>
      expect(
        document.querySelector<HTMLElement>('[data-testid="city-viewport"]')?.dataset
          .compositionReady,
        `${eraId} Presenter learner surface did not finish its real scene composition`,
      ).toBe("true"),
    { timeout: 60_000 },
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 1_200));
}

async function capture(): Promise<Sample> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter road test has no browser frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  const browser = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
  };
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.left + outer.scrollX,
      y: box.top + outer.scrollY,
      width: box.width,
      height: box.height,
      scale: 1,
    },
  });
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the Presenter road frame did not decode"));
    image.src = `data:image/png;base64,${shot.data}`;
  });
  const sink = document.createElement("canvas");
  sink.width = image.naturalWidth;
  sink.height = image.naturalHeight;
  const context = sink.getContext("2d");
  if (!context) {
    throw new Error("the Presenter road frame has no 2D sampling context");
  }
  context.drawImage(image, 0, 0);
  return {
    data: context.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
    png: shot.data,
  };
}

function changedFrontagePixels(
  full: Sample,
  withoutBranch: Sample,
  footprint: Box,
): number {
  expect(withoutBranch.width).toBe(full.width);
  expect(withoutBranch.height).toBe(full.height);
  const scaleX = full.width / window.innerWidth;
  const scaleY = full.height / window.innerHeight;
  const footprintWidth = footprint.right - footprint.left;
  const footprintHeight = footprint.bottom - footprint.top;
  const left = Math.max(220, Math.floor((footprint.left - footprintWidth * 1.5) * scaleX));
  const right = Math.min(850, Math.ceil((footprint.right + footprintWidth * 1.5) * scaleX));
  const top = Math.max(40, Math.floor((footprint.top - footprintHeight * 1.5) * scaleY));
  const bottom = Math.min(
    500,
    Math.ceil((footprint.bottom + footprintHeight * 1.5) * scaleY),
  );
  let changed = 0;
  // The comparison is confined to the target's rendered footprint and the surrounding
  // approach. A road-count label elsewhere in the HUD cannot stand in for a visible branch.
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const at = (y * full.width + x) * 4;
      const dr = Math.abs((full.data[at] ?? 0) - (withoutBranch.data[at] ?? 0));
      const dg = Math.abs((full.data[at + 1] ?? 0) - (withoutBranch.data[at + 1] ?? 0));
      const db = Math.abs((full.data[at + 2] ?? 0) - (withoutBranch.data[at + 2] ?? 0));
      if (dr > 16 || dg > 16 || db > 16) {
        changed += 1;
      }
    }
  }
  return changed;
}

test("the two lower Neolithic skill buildings have visibly painted Presenter road branches", {
  timeout: 180_000,
}, async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  const eraId = "neolithic";
  const roads =
    presenterFixtureFor({
      enabled: true,
      legacy: false,
      preset: "bronze-city",
      surface: "city",
      eraId,
    }).city.seed.roads ?? [];

  await mountIsland(eraId, roads);
  const full = await capture();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUTPUT}/${VARIANT}-neolithic-full-${VIEWPORT.width}x${VIEWPORT.height}.png`,
      full.png,
      { encoding: "base64" },
    );
  }
  const footprintBoxes = new Map(
    LOWER_NEOLITHIC_BRANCHES.map((branch) => {
      const element = document.querySelector<HTMLElement>(
        `[data-skill-label="${branch.nodeId}"][data-footprint-screen-box]`,
      );
      expect(element, `${branch.nodeId} has no rendered footprint metric`).not.toBeNull();
      return [
        branch.nodeId,
        JSON.parse(element?.dataset.footprintScreenBox ?? "") as Box,
      ] as const;
    }),
  );

  for (const branch of LOWER_NEOLITHIC_BRANCHES) {
    const removed = new Set(branch.cells.map((cell) => roadCellKey(cell.col, cell.row)));
    await mountIsland(
      eraId,
      roads.filter((cell) => !removed.has(roadCellKey(cell.col, cell.row))),
    );
    const withoutBranch = await capture();
    const changed = changedFrontagePixels(
      full,
      withoutBranch,
      footprintBoxes.get(branch.nodeId) as Box,
    );
    expect
      .soft(
        changed,
        `${branch.nodeId} branch changes only ${changed} rendered frontage pixels at 1024x580`,
      )
      .toBeGreaterThan(1_300);
  }
});
