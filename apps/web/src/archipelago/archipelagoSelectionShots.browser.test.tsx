import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { ArchipelagoOverview } from "./ArchipelagoOverview";
import { foundingLayout, type IslandRecord } from "./islandState";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_ARCHIPELAGO_SHOTS);
const ORIGINAL_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
const VIEWPORTS = [
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;
const EVIDENCE_DIRECTORY = ".qa-frames/archipelago-selection";

let harness: Harness | null = null;
let restoreViewport: { readonly width: number; readonly height: number } | null = null;

function island(eraId: EraId): IslandRecord {
  return { eraId, layout: foundingLayout() };
}

function disableWebGl(): void {
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown,
  ): RenderingContext | null {
    if (
      contextId === "webgl" ||
      contextId === "webgl2" ||
      contextId === "experimental-webgl"
    ) {
      return null;
    }
    return ORIGINAL_GET_CONTEXT.call(
      this,
      contextId as "2d",
      options as CanvasRenderingContext2DSettings,
    );
  } as typeof HTMLCanvasElement.prototype.getContext;
}

function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (frame === null) {
    throw new Error("the visual test is not running in its learner iframe");
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

async function capture(name: string): Promise<void> {
  const browser = cdp() as unknown as {
    send: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  const box = testViewportBox();
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...box, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("Chromium returned no screenshot");
  }
  if (SHOTS) {
    await commands.writeFile(`${EVIDENCE_DIRECTORY}/${name}`, shot.data, {
      encoding: "base64",
    });
  }
}

function mountOverview(enableCanvas = true): void {
  harness = mount(
    <div className="city-shell">
      <ArchipelagoOverview
        nodeStates={[]}
        liveEraId="neolithic"
        foundedIslands={[island("prehistoric"), island("neolithic")]}
        onEnterIsland={() => undefined}
        onSailTo={() => undefined}
        onPreviewEra={() => undefined}
        onClose={() => undefined}
        enableCanvas={enableCanvas}
        reducedMotion
      />
    </div>,
  );
}

async function cleanupMount(): Promise<void> {
  harness?.cleanup();
  harness = null;
  await waitFor(
    () => document.querySelectorAll("canvas").length === 0,
    "the previous visual state retained a canvas",
    30_000,
  );
}

function assertFit(width: number, height: number): void {
  expect(window.innerWidth).toBe(width);
  expect(window.innerHeight).toBe(height);
  const stage = document.querySelector('[data-testid="archipelago-stage"]') as HTMLElement;
  const stageBox = stage.getBoundingClientRect();
  expect(Math.round(stageBox.width)).toBe(width);
  expect(Math.round(stageBox.height)).toBe(height);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(document.body.scrollWidth).toBeLessThanOrEqual(width);

  const controls = Array.from(
    document.querySelectorAll<HTMLElement>(".archipelago-close, .archipelago-dock button"),
  ).filter((control) => control.getClientRects().length > 0);
  expect(controls.length).toBeGreaterThanOrEqual(5);
  for (const control of controls) {
    const box = control.getBoundingClientRect();
    expect(
      box.width,
      control.getAttribute("aria-label") ?? control.textContent ?? "",
    ).toBeGreaterThanOrEqual(44);
    expect(
      box.height,
      control.getAttribute("aria-label") ?? control.textContent ?? "",
    ).toBeGreaterThanOrEqual(44);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
    expect(box.bottom).toBeLessThanOrEqual(height);
  }
}

beforeAll(() => {
  restoreViewport = { width: window.innerWidth, height: window.innerHeight };
});

afterEach(async () => {
  HTMLCanvasElement.prototype.getContext = ORIGINAL_GET_CONTEXT;
  await cleanupMount();
});

afterAll(async () => {
  HTMLCanvasElement.prototype.getContext = ORIGINAL_GET_CONTEXT;
  if (restoreViewport !== null) {
    await page.viewport(restoreViewport.width, restoreViewport.height);
  }
});

test.runIf(SHOTS)(
  "captures unlocked, locked, and forced no-WebGL states at both ruled viewports",
  async () => {
    for (const viewport of VIEWPORTS) {
      await page.viewport(viewport.width, viewport.height);
      mountOverview();
      await waitFor(
        () =>
          document.querySelector('[data-testid="archipelago-hero-renderer"] canvas') !==
          null,
        "the approved WebGL hero did not mount",
        30_000,
      );
      await document.fonts.ready;
      await new Promise<void>((resolve) => setTimeout(resolve, 1_800));
      assertFit(viewport.width, viewport.height);
      expect(
        document.querySelector('[data-testid="archipelago-primary-action"]')?.textContent,
      ).toContain("Enter island");
      await capture(`${viewport.width}x${viewport.height}-unlocked-webgl.png`);

      document
        .querySelector<HTMLButtonElement>('[data-testid="archipelago-select-bronze_age"]')
        ?.click();
      await waitFor(
        () =>
          document
            .querySelector('[data-testid="archipelago-overview"]')
            ?.getAttribute("data-state") === "closed" &&
          document.querySelector('[data-testid="archipelago-hero-renderer"] canvas') !==
            null,
        "the locked WebGL island did not settle",
        30_000,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 1_500));
      assertFit(viewport.width, viewport.height);
      expect(
        document.querySelector('[data-testid="archipelago-classic-lock"]'),
      ).not.toBeNull();
      expect(
        document.querySelector('[data-testid="archipelago-primary-action"]')?.textContent,
      ).toContain("Explore Bronze Age terrain");
      await capture(`${viewport.width}x${viewport.height}-locked-webgl.png`);

      for (const era of ERA_SEQUENCE) {
        document
          .querySelector<HTMLButtonElement>(`[data-testid="archipelago-select-${era.id}"]`)
          ?.click();
        await waitFor(
          () =>
            document
              .querySelector('[data-testid="archipelago-overview"]')
              ?.getAttribute("data-selected-era") === era.id &&
            document
              .querySelector('[data-testid="archipelago-hero-renderer"]')
              ?.getAttribute("data-scene-root") === era.id,
          `${era.id} Bay focus did not settle`,
          30_000,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 450));
        assertFit(viewport.width, viewport.height);
        await capture(`bay-${viewport.width}x${viewport.height}-${era.id}-focused.png`);
      }

      await cleanupMount();
      disableWebGl();
      const probe = document.createElement("canvas");
      expect(probe.getContext("webgl")).toBeNull();
      expect(probe.getContext("webgl2")).toBeNull();
      mountOverview();
      await waitFor(
        () =>
          document.querySelector('[data-testid="archipelago-island-fallback"]') !== null,
        "the forced no-WebGL illustration did not mount",
      );
      assertFit(viewport.width, viewport.height);
      expect(
        document.querySelector('[data-testid="archipelago-hero-renderer"] canvas'),
      ).toBeNull();
      await capture(`${viewport.width}x${viewport.height}-forced-no-webgl-fallback.png`);
      await cleanupMount();
      HTMLCanvasElement.prototype.getContext = ORIGINAL_GET_CONTEXT;
    }
  },
  180_000,
);
