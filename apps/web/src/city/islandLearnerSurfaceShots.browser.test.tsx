import { cityRosterNodeIds } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { eraCityLayout } from "./islandLand";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { defaultPlacements } from "./worldLayout";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_EVAN_RUNTIME_REVIEW);
const OUTPUT = "output/design-review/evan-islands";
const SHOT_VARIANT = import.meta.env.VITE_EVAN_RUNTIME_REVIEW_VARIANT ?? "";
const ERA_FILTER = new Set(
  (import.meta.env.VITE_EVAN_RUNTIME_REVIEW_ERAS ?? "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean),
);
const REVIEW_ERAS =
  ERA_FILTER.size === 0
    ? ERA_SEQUENCE
    : ERA_SEQUENCE.filter((era) => ERA_FILTER.has(era.id));
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;
const PRACTICED_AT = "2026-08-10T00:00:00.000Z";

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
  document.querySelector("[data-island-review-style]")?.remove();
});

function state(nodeId: string): StudentNodeState {
  return {
    student_id: "evan-runtime-review",
    node_id: nodeId,
    placement_estimate: 2,
    mastery: 2,
    mastery_updated_at: PRACTICED_AT,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: PRACTICED_AT,
  };
}

function cityLoad(eraId: EraId, populated: boolean): CityLoad {
  const nodes = [...cityRosterNodeIds(eraId)];
  return {
    node_states: nodes.map(state),
    placements: populated
      ? defaultPlacements(
          nodes,
          [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }],
          eraCityLayout(eraId).buildableRadius,
        )
      : [],
    town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
    roads: [],
  };
}

function hideDevChrome(): void {
  const style = document.createElement("style");
  style.dataset.islandReviewStyle = "true";
  style.textContent =
    ".ob-replay,.achievement-note,.coach-mark,.hud-milestone,.demo-mode-notice{" +
    "display:none!important}";
  document.head.append(style);
}

function viewportClip(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (frame === null) {
    throw new Error("the learner-surface review is not mounted in its browser frame");
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

async function capture(filename: string): Promise<void> {
  const browser = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
  };
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...viewportClip(), scale: 1 },
  });
  expect(shot.data, filename).toBeTruthy();
  const prefix = SHOT_VARIANT === "" ? "" : `${SHOT_VARIANT}-`;
  if (SHOTS) {
    await commands.writeFile(`${OUTPUT}/${prefix}${filename}`, shot.data, {
      encoding: "base64",
    });
  }
}

async function mountCity(
  eraId: EraId,
  viewport: (typeof VIEWPORTS)[number],
  populated: boolean,
): Promise<HTMLElement> {
  await page.viewport(viewport.width, viewport.height);
  hideDevChrome();
  const load = cityLoad(eraId, populated);
  harness?.cleanup();
  harness = mount(
    <div className="city-shell">
      <CitySurface
        enableCanvas
        enableOnboardingDemo={false}
        reducedMotion
        eraId={eraId}
        archipelagoMetrics
        loadCity={() => Promise.resolve(load)}
      />
    </div>,
  );
  await waitFor(
    () =>
      document.querySelector(".city-viewport canvas") !== null &&
      (populated
        ? document.querySelector<HTMLElement>('[data-testid="city-viewport"]')?.dataset
            .compositionReady === "true"
        : Number(
            document.querySelector<HTMLElement>('[data-testid="city-viewport"]')?.dataset
              .sampleFrames ?? 0,
          ) >= 8),
    `${eraId} ${viewport.width}x${viewport.height} learner city did not settle`,
    60_000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 1_800));
  expect(
    document.querySelectorAll("canvas"),
    `${eraId} ${viewport.width}x${viewport.height} canvas population`,
  ).toHaveLength(1);
  return document.querySelector<HTMLElement>(
    '[data-testid="city-viewport"]',
  ) as HTMLElement;
}

function inFrame(element: Element, view: (typeof VIEWPORTS)[number]): boolean {
  const box = element.getBoundingClientRect();
  return (
    box.left >= 0 && box.top >= 0 && box.right <= view.width && box.bottom <= view.height
  );
}

function vitalityFit(): {
  readonly panel: { readonly left: number; readonly right: number };
  readonly readings: readonly {
    readonly id: string;
    readonly text: string;
    readonly left: number;
    readonly right: number;
    readonly overflow: number;
  }[];
} {
  const panel = document.querySelector<HTMLElement>('[data-testid="city-vitality"]');
  if (panel === null) {
    throw new Error("the production City Life panel is absent");
  }
  const box = panel.getBoundingClientRect();
  const readings = [...panel.querySelectorAll<HTMLElement>(".hud-vitality-row")].map(
    (row) => {
      const term = row.querySelector<HTMLElement>("dd");
      if (term === null) {
        throw new Error(`${row.dataset.testid ?? "vitality row"} has no reading`);
      }
      const termBox = term.getBoundingClientRect();
      const descendants = [...term.querySelectorAll<HTMLElement>("*")].map((node) =>
        node.getBoundingClientRect(),
      );
      const left = Math.min(termBox.left, ...descendants.map((box) => box.left));
      const right = Math.max(termBox.right, ...descendants.map((box) => box.right));
      return {
        id: row.dataset.testid ?? "vitality row",
        text: (term.textContent ?? "").replace(/\s+/g, " ").trim(),
        left,
        right,
        overflow: Math.max(0, right - box.right),
      };
    },
  );
  return { panel: { left: box.left, right: box.right }, readings };
}

test.runIf(SHOTS)(
  "captures every era on the production CitySurface at laptop and phone sizes",
  async () => {
    const readings: Array<{
      eraId: EraId;
      viewport: string;
      mode: "populated" | "sparse" | "build";
      buildings: number;
      drawCalls: number;
      triangles: number;
      sceneObjects: number;
      shownLabels: number;
      vitality?: ReturnType<typeof vitalityFit>;
    }> = [];
    for (const viewport of VIEWPORTS) {
      for (const era of REVIEW_ERAS) {
        const city = await mountCity(era.id, viewport, true);
        const controls = [
          ...document.querySelectorAll(
            ".hud-top-left,.hud-top-right,.hud-camera-cluster,.hud-dock",
          ),
        ];
        expect(controls.length, `${era.id} HUD region floor`).toBeGreaterThanOrEqual(4);
        expect(
          controls.every((control) => inFrame(control, viewport)),
          `${era.id} has HUD controls outside ${viewport.width}x${viewport.height}`,
        ).toBe(true);
        const shownLabels = document.querySelectorAll(
          '[data-skill-label][data-label-state="shown"]',
        ).length;
        expect(shownLabels, `${era.id} label collision budget`).toBeLessThanOrEqual(
          viewport.width <= 640 ? 4 : 8,
        );
        expect(
          document.querySelector('[data-town-hall-nameplate][data-label-state="shown"]'),
          `${era.id} Town Hall landmark label`,
        ).not.toBeNull();
        const vitality = vitalityFit();
        expect(vitality.readings).toHaveLength(3);
        for (const reading of vitality.readings) {
          expect(
            reading.overflow,
            `${era.id}/${reading.id} "${reading.text}" overflows City Life at ` +
              `${viewport.width}x${viewport.height}`,
          ).toBe(0);
          expect(
            reading.left,
            `${era.id}/${reading.id} starts before City Life`,
          ).toBeGreaterThanOrEqual(vitality.panel.left);
        }
        readings.push({
          eraId: era.id,
          viewport: `${viewport.width}x${viewport.height}`,
          mode: "populated",
          buildings: cityLoad(era.id, true).placements?.length ?? 0,
          drawCalls: Number(city.dataset.drawCalls ?? 0),
          triangles: Number(city.dataset.triangles ?? 0),
          sceneObjects: Number(city.dataset.sceneObjects ?? 0),
          shownLabels,
          vitality,
        });
        await capture(
          `runtime-city-${viewport.width}x${viewport.height}-${era.id}-populated.png`,
        );

        const buildCity = await mountCity(era.id, viewport, false);
        readings.push({
          eraId: era.id,
          viewport: `${viewport.width}x${viewport.height}`,
          mode: "sparse",
          buildings: 0,
          drawCalls: Number(buildCity.dataset.drawCalls ?? 0),
          triangles: Number(buildCity.dataset.triangles ?? 0),
          sceneObjects: Number(buildCity.dataset.sceneObjects ?? 0),
          shownLabels: document.querySelectorAll(
            '[data-skill-label][data-label-state="shown"]',
          ).length,
        });
        await capture(
          `runtime-city-${viewport.width}x${viewport.height}-${era.id}-sparse.png`,
        );

        document.querySelector<HTMLButtonElement>(".city-build-button")?.click();
        await waitFor(
          () => document.querySelector(".build-card-cta") !== null,
          `${era.id} Build menu did not open`,
        );
        document.querySelector<HTMLButtonElement>("#build-tab-roads")?.click();
        await waitFor(
          () => document.querySelector('.build-card-cta[data-node-id="roads"]') !== null,
          `${era.id} Roads build card did not open`,
        );
        document
          .querySelector<HTMLButtonElement>('.build-card-cta[data-node-id="roads"]')
          ?.click();
        await waitFor(
          () => document.querySelector(".hud-placement") !== null,
          `${era.id} did not enter build mode`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 600));
        const placementControls = [
          ...document.querySelectorAll(".city-placement-actions button"),
        ];
        expect(
          placementControls.length,
          `${era.id} build control population`,
        ).toBeGreaterThanOrEqual(3);
        expect(
          placementControls.every((control) => inFrame(control, viewport)),
          `${era.id} clips a build control at ${viewport.width}x${viewport.height}`,
        ).toBe(true);
        readings.push({
          eraId: era.id,
          viewport: `${viewport.width}x${viewport.height}`,
          mode: "build",
          buildings: 0,
          drawCalls: Number(buildCity.dataset.drawCalls ?? 0),
          triangles: Number(buildCity.dataset.triangles ?? 0),
          sceneObjects: Number(buildCity.dataset.sceneObjects ?? 0),
          shownLabels: document.querySelectorAll(
            '[data-skill-label][data-label-state="shown"]',
          ).length,
        });
        await capture(
          `runtime-city-${viewport.width}x${viewport.height}-${era.id}-build.png`,
        );
        harness?.cleanup();
        harness = null;
        document.querySelector("[data-island-review-style]")?.remove();
      }
    }
    expect(REVIEW_ERAS.length, "learner review era population").toBeGreaterThan(0);
    expect(readings).toHaveLength(REVIEW_ERAS.length * VIEWPORTS.length * 3);
    const prefix = SHOT_VARIANT === "" ? "" : `${SHOT_VARIANT}-`;
    if (SHOTS) {
      await commands.writeFile(
        `${OUTPUT}/${prefix}runtime-city-performance.json`,
        `${JSON.stringify(readings, null, 2)}\n`,
        { encoding: "utf-8" },
      );
    }
  },
  1_200_000,
);
