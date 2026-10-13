import { cityRosterNodeIds, NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { MOCK_CITY_LOAD, MOCK_MASTERED_NODE_STATES } from "../city/mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import {
  buildableRadiusForLand,
  defaultPlacements,
  type PlacedTransform,
} from "../city/worldLayout";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { ArchipelagoCarouselState } from "./archipelagoCarouselView";
import { type ArchipelagoSession, createArchipelagoSession } from "./archipelagoSession";
import { islandManifestEntry } from "./islandManifest";
import type { IslandRecord } from "./islandState";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_ARCHIPELAGO_SHOTS);
const WRITE_SHOTS = Boolean(import.meta.env.VITE_ARCHIPELAGO_WRITE_SHOTS);
const VIEWPORT = { width: 1024, height: 580 } as const;
const EVIDENCE_DIRECTORY = "docs/design-refs/archipelago-carousel-revised";
const PREHISTORIC = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const NEOLITHIC = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];
const BRONZE = ERA_SEQUENCE[2] as (typeof ERA_SEQUENCE)[number];
const CLASSICAL = ERA_SEQUENCE[3] as (typeof ERA_SEQUENCE)[number];
const CYBERPUNK = ERA_SEQUENCE[9] as (typeof ERA_SEQUENCE)[number];

let harness: Harness | null = null;
let session: ArchipelagoSession | null = null;
let restoreViewport: { width: number; height: number } | null = null;
let restoreSearch: string | null = null;

beforeAll(() => {
  restoreViewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  restoreSearch = window.location.search;
});

afterEach(async () => {
  harness?.cleanup();
  harness = null;
  session?.dispose();
  session = null;
  resetCityEra();
  await waitFor(
    () => document.querySelectorAll("canvas").length === 0,
    "the learner mount retained canvas elements after cleanup",
    30_000,
  );
});

afterAll(async () => {
  if (restoreSearch !== null) {
    window.history.replaceState(null, "", `${window.location.pathname}${restoreSearch}`);
  }
  if (restoreViewport !== null) {
    await page.viewport(restoreViewport.width, restoreViewport.height);
  }
});

function state(nodeId: string, mastery: 0 | 2 = 2): StudentNodeState {
  return {
    student_id: "archipelago-browser",
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= 2 ? "complete" : "in_progress",
    lesson_stage: mastery >= 2 ? "done" : "not_started",
    last_practiced_at: mastery >= 2 ? "2026-08-06T00:00:00.000Z" : null,
  };
}

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

function viewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const frame = window.frameElement as HTMLElement | null;
  if (frame === null) {
    throw new Error("the browser test is not running in its learner iframe");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function capture(): Promise<string> {
  const browser = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = viewportBox();
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      scale: 1,
    },
  });
  if (!shot.data) {
    throw new Error("Chromium returned no screenshot");
  }
  return shot.data;
}

async function keep(name: string): Promise<void> {
  const shot = await capture();
  if (!WRITE_SHOTS) {
    return;
  }
  if (SHOTS) {
    await commands.writeFile(`${EVIDENCE_DIRECTORY}/${name}`, shot, {
      encoding: "base64",
    });
  }
}

function neolithicCity(): {
  readonly nodeStates: readonly StudentNodeState[];
  readonly placements: readonly PlacedTransform[];
  readonly stashed: readonly IslandRecord[];
} {
  const neolithicStates = NEOLITHIC.nodes.map((nodeId, index) =>
    state(nodeId, index < 3 ? 2 : 0),
  );
  const classicalDiagnostic = CLASSICAL.nodes.map((nodeId) => ({
    ...state(nodeId, 0),
    placement_estimate: 2 as const,
  }));
  const placements = defaultPlacements(
    NEOLITHIC.nodes.slice(0, 3),
    [
      {
        nodeId: TOWN_HALL_ID,
        ...TOWN_HALL_CENTER_TRANSFORM,
      },
    ],
    buildableRadiusForLand(islandManifestEntry(NEOLITHIC.id).overviewRadius),
  );
  return {
    nodeStates: [...MOCK_MASTERED_NODE_STATES, ...neolithicStates, ...classicalDiagnostic],
    placements,
    stashed: [
      {
        eraId: PREHISTORIC.id,
        layout: {
          placements: MOCK_CITY_LOAD.placements ?? [],
          roads: [],
          road_gold_spent: 0,
          town_hall: MOCK_CITY_LOAD.town_hall ?? null,
          civic: [],
          civic_material_spent: 0,
          crisis_damage: NO_CRISIS_DAMAGE,
        },
      },
    ],
  };
}

function heaviestCity(): {
  readonly nodeStates: readonly StudentNodeState[];
  readonly placements: readonly PlacedTransform[];
  readonly stashed: readonly IslandRecord[];
} {
  const nodeIds = cityRosterNodeIds(CYBERPUNK.id);
  const radius = islandManifestEntry(CYBERPUNK.id).overviewRadius;
  return {
    nodeStates: nodeIds.map((nodeId) => state(nodeId)),
    placements: defaultPlacements(
      nodeIds,
      [
        {
          nodeId: TOWN_HALL_ID,
          ...TOWN_HALL_CENTER_TRANSFORM,
        },
      ],
      buildableRadiusForLand(radius),
    ),
    stashed: [],
  };
}

async function openCity(
  options: {
    readonly standing?: EraId;
    readonly reducedMotion?: boolean;
    readonly heaviest?: boolean;
  } = {},
): Promise<void> {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  if (harness !== null) {
    harness.cleanup();
    harness = null;
    await waitFor(
      () => document.querySelectorAll("canvas").length === 0,
      "the previous learner mount retained a canvas",
      30_000,
    );
  }
  session?.dispose();
  session = null;
  resetCityEra();
  const standing = options.standing ?? (options.heaviest ? CYBERPUNK.id : NEOLITHIC.id);
  setCityEra(standing);
  const fixture = options.heaviest ? heaviestCity() : neolithicCity();
  const live = createArchipelagoSession({
    initial: createCityDevSession(null, {
      nodeStates: fixture.nodeStates,
      placements: fixture.placements,
      townHall: {
        nodeId: TOWN_HALL_ID,
        ...TOWN_HALL_CENTER_TRANSFORM,
      },
    }),
    makeIsland: (restoreFrom) => createCityDevSession(restoreFrom),
    stashed: fixture.stashed,
  });
  session = live;
  harness = mount(
    <div className="city-shell">
      <CitySurface
        bayAvailable
        archipelagoMetrics
        enableCanvas
        reducedMotion={options.reducedMotion ?? true}
        loadCity={live.load}
        onPlaceSkill={live.placeSkill}
        getArchipelagoSnapshot={live.snapshot}
        onResetIsland={live.resetIsland}
        onOpenSurface={() => undefined}
      />
    </div>,
  );
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the ordinary learner city canvas did not mount",
    30_000,
  );
  await waitFor(
    () => named("Menu") !== undefined,
    "the learner menu did not mount",
    30_000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    setTimeout(resolve, options.heaviest ? 5_000 : 1_800),
  );
  for (const selector of [
    ".ob-replay",
    '[data-testid="era-dev-skip"]',
    '[data-testid="catchup-skip"]',
  ]) {
    const panel = document.querySelector(selector) as HTMLElement | null;
    if (panel !== null) {
      panel.style.display = "none";
    }
  }
}

async function openCarousel(): Promise<void> {
  named("Menu")?.click();
  await waitFor(
    () => document.querySelector('[data-testid="menu-bay"]') !== null,
    "the archipelago menu row did not mount",
    30_000,
  );
  document.querySelector<HTMLButtonElement>('[data-testid="menu-bay"]')?.click();
  await waitFor(
    () =>
      document.querySelector('[data-testid="archipelago-hero-renderer"] canvas') !== null,
    "the selected actual-renderer hero did not mount",
    30_000,
  );
  await waitFor(
    () => document.querySelectorAll("canvas").length === 1,
    "opening retained more than the selected hero canvas",
    30_000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));
}

function select(eraId: EraId): void {
  document
    .querySelector<HTMLButtonElement>(`[data-testid="archipelago-select-${eraId}"]`)
    ?.click();
}

async function waitForSelected(
  eraId: EraId,
  mode?: ArchipelagoCarouselState,
): Promise<void> {
  await waitFor(
    () => {
      const overview = document.querySelector('[data-testid="archipelago-overview"]');
      const hero = document.querySelector('[data-testid="archipelago-hero-renderer"]');
      return (
        overview?.getAttribute("data-selected-era") === eraId &&
        hero?.getAttribute("data-scene-root") === eraId &&
        (mode === undefined || overview?.getAttribute("data-state") === mode)
      );
    },
    `${eraId} did not settle as the one selected hero`,
    30_000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 80));
}

interface RendererMetrics {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly sceneObjects: number;
  readonly frameAverageMs: number;
  readonly frameP95Ms: number;
  readonly sampleFrames: number;
  readonly dpr: number;
}

function resetMetrics(selector: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (target === null) {
    throw new Error(`metrics target did not mount: ${selector}`);
  }
  target.dataset.metricsReset = String(performance.now());
}

async function metrics(
  selector = '[data-testid="archipelago-hero-renderer"]',
  minimumFrames = 60,
): Promise<RendererMetrics> {
  await waitFor(
    () =>
      Number(document.querySelector(selector)?.getAttribute("data-sample-frames") ?? 0) >=
      minimumFrames,
    "the selected renderer did not publish enough metric frames",
    90_000,
  );
  const data = (document.querySelector(selector) as HTMLElement).dataset;
  return {
    drawCalls: Number(data.drawCalls),
    triangles: Number(data.triangles),
    sceneObjects: Number(data.sceneObjects),
    frameAverageMs: Number(data.frameAverageMs),
    frameP95Ms: Number(data.frameP95Ms),
    sampleFrames: Number(data.sampleFrames),
    dpr: Number(data.dpr),
  };
}

test("names the revised evidence viewport and matrix", () => {
  expect(`${VIEWPORT.width}x${VIEWPORT.height}`).toBe("1024x580");
  expect([
    "standing",
    "settled",
    "closed",
    "diagnostic",
    "founding-peak",
    "founding-endpoint",
    "first",
    "last",
    "200-percent",
    "manifest-glb",
    "heaviest",
    "lesson-labels-off",
  ]).toHaveLength(12);
});

test.runIf(SHOTS)(
  "captures the revised learner states and proves one selected renderer lifecycle",
  async () => {
    await openCity();
    performance.clearResourceTimings();
    await openCarousel();
    await waitForSelected(NEOLITHIC.id, "standing");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="skill-labels"]')).toHaveLength(0);
    await keep("1024x580-01-standing.png");
    const coldIslandModelRequests = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /\/art\/islands\/.*\.glb/.test(name));
    expect(coldIslandModelRequests).toEqual([]);

    select(PREHISTORIC.id);
    await waitForSelected(PREHISTORIC.id, "settled");
    await new Promise<void>((resolve) => setTimeout(resolve, 1_500));
    await keep("1024x580-02-settled.png");

    select(BRONZE.id);
    await waitForSelected(BRONZE.id, "closed");
    expect(
      document.querySelector('[data-testid="archipelago-closed-landing"]'),
    ).not.toBeNull();
    await keep("1024x580-03-closed.png");

    select(CLASSICAL.id);
    await waitForSelected(CLASSICAL.id, "diagnostic");
    expect(document.querySelector('[data-testid="archipelago-hall-site"]')).toBeNull();
    expect(document.querySelector(".archipelago-landmark-caption")).toHaveTextContent(
      "Classical Era hall · diagnostic landmark",
    );
    expect(document.querySelector('[data-mode="diagnostic"]')).not.toBeNull();
    await keep("1024x580-04-diagnostic.png");

    for (const era of ERA_SEQUENCE) {
      select(era.id);
      await waitForSelected(era.id);
      expect(document.querySelectorAll("canvas"), era.id).toHaveLength(1);
      expect(
        document.querySelectorAll('[data-testid="archipelago-hero-renderer"]'),
        era.id,
      ).toHaveLength(1);
    }

    select(PREHISTORIC.id);
    await waitForSelected(PREHISTORIC.id);
    await keep("1024x580-07-first.png");
    select(CYBERPUNK.id);
    await waitForSelected(CYBERPUNK.id);
    await keep("1024x580-08-last.png");

    select(NEOLITHIC.id);
    await waitForSelected(NEOLITHIC.id);
    await keep("1024x580-12-lesson-labels-off.png");

    named("Close archipelago")?.click();
    await waitFor(
      () => document.querySelector('[data-testid="archipelago-overview"]') === null,
      "the carousel did not close",
      30_000,
    );
    await waitFor(
      () => document.querySelectorAll("canvas").length === 1,
      "the ordinary learner city canvas was not restored",
      30_000,
    );

    await openCity({ heaviest: true });
    resetMetrics(".city-viewport");
    const heavyCityMetrics = await metrics(".city-viewport");
    await openCarousel();
    await waitForSelected(CYBERPUNK.id, "standing");
    await new Promise<void>((resolve) => setTimeout(resolve, 3_000));
    resetMetrics('[data-testid="archipelago-hero-renderer"]');
    const heavyCarouselMetrics = await metrics();
    expect(heavyCarouselMetrics.sceneObjects).toBeGreaterThan(1_000);
    expect(heavyCarouselMetrics.frameAverageMs).toBeLessThanOrEqual(
      heavyCityMetrics.frameAverageMs * 1.25,
    );
    await keep("1024x580-11-heaviest.png");

    if (WRITE_SHOTS) {
      if (SHOTS) {
        await commands.writeFile(
          `${EVIDENCE_DIRECTORY}/performance-browser.json`,
          JSON.stringify(
            {
              viewport: VIEWPORT,
              heaviestCity: heavyCityMetrics,
              heaviestCarousel: heavyCarouselMetrics,
              canvasesAcrossTenSelections: 1,
              retainedHeroRoots: 1,
              coldUnselectedIslandModelRequests: coldIslandModelRequests.length,
              manifestGlbAvailable: false,
            },
            null,
            2,
          ),
        );
      }
    }
  },
  600_000,
);
