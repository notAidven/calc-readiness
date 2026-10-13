import { cityRosterNodeIds } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { RefObject } from "react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { resolveEraTownHall, TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { defaultPlacements } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import CityScene, {
  type ActivePlacement,
  type ScenePlacement,
  type SceneTownHall,
} from "./CityScene";

const SHOTS = Boolean(import.meta.env.VITE_ISLAND_ART_PARITY_SHOTS);
const OUTPUT = "output/design-review/island-art-parity";
const LAPTOP = { width: 1024, height: 580 } as const;
const PHONE = { width: 390, height: 580 } as const;
const PHONE_ERAS = ["renaissance", "information_age"] as const satisfies readonly EraId[];
const FULL_CITY_ERAS = [
  "bronze_age",
  "medieval",
  "cyberpunk",
] as const satisfies readonly EraId[];
const SITING: ActivePlacement = { nodeId: "NUM.2", col: 3, row: 2, rot: 0, valid: true };

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function stageBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  const stage = document.getElementById("island-art-parity-stage");
  if (frame === null || stage === null) {
    throw new Error("the learner-mounted city frame is unavailable");
  }
  const frameBox = frame.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: frameBox.left + outer.scrollX + stageRect.left,
    y: frameBox.top + outer.scrollY + stageRect.top,
    width: stageRect.width,
    height: stageRect.height,
  };
}

async function capture(path: string): Promise<void> {
  const browser = cdp() as unknown as {
    send: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  const result = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...stageBox(), scale: 1 },
  });
  if (!result.data) {
    throw new Error(`Chromium returned no screenshot for ${path}`);
  }
  if (SHOTS) {
    await commands.writeFile(`${OUTPUT}/${path}`, result.data, { encoding: "base64" });
  }
}

function hallFor(eraId: EraId): SceneTownHall {
  return {
    ...TOWN_HALL_CENTER_TRANSFORM,
    model: resolveEraTownHall(eraId, CURRENT_ERA_ID).model,
    celebrateToken: 0,
  };
}

function fullCityFor(eraId: EraId): readonly ScenePlacement[] {
  const layout = eraCityLayout(eraId);
  const reserved = [{ nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM }];
  return defaultPlacements(cityRosterNodeIds(eraId), reserved, layout.buildableRadius).map(
    (placement) => ({
      ...placement,
      model: resolveBuildingModel(placement.nodeId, "built"),
      mastery: 0,
      celebrateToken: 0,
    }),
  );
}

function Host({
  eraId,
  viewport,
  placing,
  controlsRef,
  metricsRef,
  fullCity = false,
}: {
  readonly eraId: EraId;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly placing: boolean;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
  readonly metricsRef: RefObject<HTMLElement | null>;
  readonly fullCity?: boolean;
}) {
  return (
    <div
      id="island-art-parity-stage"
      className="city-shell"
      style={{
        position: "fixed",
        inset: 0,
        width: viewport.width,
        height: viewport.height,
        overflow: "hidden",
      }}
    >
      <span
        ref={(node) => {
          metricsRef.current = node;
        }}
        hidden
      />
      <CityScene
        layout={eraCityLayout(eraId)}
        placed={fullCity ? fullCityFor(eraId) : []}
        townHall={hallFor(eraId)}
        variant="day"
        reducedMotion
        controlsRef={controlsRef}
        metricsTargetRef={metricsRef}
        onSelect={() => undefined}
        eraId={eraId}
        placing={placing}
        placement={placing ? SITING : null}
        ghostModelUrl={
          placing ? (resolveBuildingModel(SITING.nodeId, "built")?.url ?? null) : null
        }
      />
    </div>
  );
}

interface Reading {
  readonly eraId: EraId;
  readonly viewport: string;
  readonly mode: "exploration" | "build" | "full-city";
  readonly drawCalls: number;
  readonly triangles: number;
  readonly sceneObjects: number;
  readonly frameAverageMs: number;
  readonly frameP95Ms: number;
}

async function photographFullCity(eraId: EraId): Promise<Reading> {
  await page.viewport(LAPTOP.width, LAPTOP.height);
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  const metricsRef: RefObject<HTMLElement | null> = { current: null };
  harness?.cleanup();
  harness = mount(
    <Host
      eraId={eraId}
      viewport={LAPTOP}
      placing={false}
      controlsRef={controlsRef}
      metricsRef={metricsRef}
      fullCity
    />,
  );
  await waitFor(
    () => Number(metricsRef.current?.dataset.sampleFrames ?? 0) >= 10,
    `${eraId} full city metrics`,
    30_000,
  );
  await capture(`city-1024x580-${eraId}-full-city.png`);
  const result = reading(eraId, LAPTOP, "full-city", metricsRef.current as HTMLElement);
  harness.cleanup();
  harness = null;
  return result;
}

function reading(
  eraId: EraId,
  viewport: { readonly width: number; readonly height: number },
  mode: Reading["mode"],
  target: HTMLElement,
): Reading {
  return {
    eraId,
    viewport: `${viewport.width}x${viewport.height}`,
    mode,
    drawCalls: Number(target.dataset.drawCalls ?? 0),
    triangles: Number(target.dataset.triangles ?? 0),
    sceneObjects: Number(target.dataset.sceneObjects ?? 0),
    frameAverageMs: Number(target.dataset.frameAverageMs ?? 0),
    frameP95Ms: Number(target.dataset.frameP95Ms ?? 0),
  };
}

async function photographEra(
  eraId: EraId,
  viewport: { readonly width: number; readonly height: number },
): Promise<readonly Reading[]> {
  await page.viewport(viewport.width, viewport.height);
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  const metricsRef: RefObject<HTMLElement | null> = { current: null };
  const render = (placing: boolean) => (
    <Host
      eraId={eraId}
      viewport={viewport}
      placing={placing}
      controlsRef={controlsRef}
      metricsRef={metricsRef}
    />
  );
  harness?.cleanup();
  harness = mount(render(false));
  await waitFor(() => document.querySelector("canvas") !== null, `${eraId} city canvas`);
  await waitFor(
    () => Number(metricsRef.current?.dataset.sampleFrames ?? 0) >= 10,
    `${eraId} exploration metrics`,
    20_000,
  );
  await capture(`city-${viewport.width}x${viewport.height}-${eraId}-exploration.png`);
  const exploration = reading(
    eraId,
    viewport,
    "exploration",
    metricsRef.current as HTMLElement,
  );

  metricsRef.current?.setAttribute("data-metrics-reset", `${eraId}-build`);
  harness.root.render(render(true));
  await waitFor(
    () => Number(metricsRef.current?.dataset.sampleFrames ?? 0) >= 10,
    `${eraId} build metrics`,
    20_000,
  );
  await capture(`city-${viewport.width}x${viewport.height}-${eraId}-build.png`);
  const build = reading(eraId, viewport, "build", metricsRef.current as HTMLElement);
  harness.cleanup();
  harness = null;
  return [exploration, build];
}

test.runIf(SHOTS)(
  "captures every city island in exploration and build modes",
  async () => {
    const readings: Reading[] = [];
    for (const era of ERA_SEQUENCE) {
      readings.push(...(await photographEra(era.id, LAPTOP)));
    }
    for (const eraId of PHONE_ERAS) {
      readings.push(...(await photographEra(eraId, PHONE)));
    }
    for (const eraId of FULL_CITY_ERAS) {
      readings.push(await photographFullCity(eraId));
    }
    expect(readings).toHaveLength(
      ERA_SEQUENCE.length * 2 + PHONE_ERAS.length * 2 + FULL_CITY_ERAS.length,
    );
    if (SHOTS) {
      await commands.writeFile(
        `${OUTPUT}/city-performance.json`,
        `${JSON.stringify(readings, null, 2)}\n`,
        { encoding: "utf-8" },
      );
    }
    expect(Math.min(...readings.map((entry) => entry.drawCalls))).toBeGreaterThan(0);
    const ordinaryFrames = readings.filter((entry) => entry.mode !== "full-city");
    expect(Math.max(...ordinaryFrames.map((entry) => entry.drawCalls))).toBeLessThan(2200);
    expect(readings.filter((entry) => entry.mode === "full-city")).toHaveLength(
      FULL_CITY_ERAS.length,
    );
  },
  240_000,
);
