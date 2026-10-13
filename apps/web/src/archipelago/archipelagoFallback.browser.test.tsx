import type { EraId } from "@cr/skill-graph";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { ArchipelagoOverview } from "./ArchipelagoOverview";
import { foundingLayout, type IslandRecord } from "./islandState";

import "../styles.css";

const ORIGINAL_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
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

afterEach(async () => {
  harness?.cleanup();
  harness = null;
  HTMLCanvasElement.prototype.getContext = ORIGINAL_GET_CONTEXT;
  vi.restoreAllMocks();
  if (restoreViewport !== null) {
    await page.viewport(restoreViewport.width, restoreViewport.height);
    restoreViewport = null;
  }
});

test("a no-WebGL device keeps a real, navigable selected island instead of an empty ocean", async () => {
  restoreViewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(1024, 580);
  disableWebGl();

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const onError = (event: ErrorEvent) => pageErrors.push(event.message);
  window.addEventListener("error", onError);
  vi.spyOn(console, "error").mockImplementation((...values: unknown[]) => {
    consoleErrors.push(values.map(String).join(" "));
  });
  performance.clearResourceTimings();
  const onEnter = vi.fn();

  try {
    const probe = document.createElement("canvas");
    expect(probe.getContext("webgl")).toBeNull();
    expect(probe.getContext("webgl2")).toBeNull();

    harness = mount(
      <div className="city-shell">
        <ArchipelagoOverview
          nodeStates={[]}
          liveEraId="neolithic"
          foundedIslands={[island("prehistoric"), island("neolithic")]}
          onEnterIsland={onEnter}
          onSailTo={() => undefined}
          onPreviewEra={() => undefined}
          onClose={() => undefined}
          enableCanvas
          reducedMotion
        />
      </div>,
    );

    await waitFor(
      () => document.querySelector('[data-testid="archipelago-island-fallback"]') !== null,
      "the selected island fallback did not replace the unavailable renderer",
    );

    const fallback = document.querySelector(
      '[data-testid="archipelago-island-fallback"]',
    ) as HTMLElement;
    expect(
      document.querySelector('[data-testid="archipelago-hero-renderer"] canvas'),
    ).toBeNull();
    expect(fallback.dataset.era).toBe("neolithic");
    expect(fallback.querySelector("svg")).not.toBeNull();
    expect(fallback.textContent).not.toContain(
      "The island renderer is unavailable on this device.",
    );
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(
      performance
        .getEntriesByType("resource")
        .some((entry) => /\/art\/(?:islands|models)\/.*\.glb/.test(entry.name)),
    ).toBe(false);

    document.querySelector<HTMLButtonElement>('[aria-label^="Next island"]')?.click();
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="archipelago-island-fallback"]')
          ?.getAttribute("data-era") === "bronze_age",
      "the fallback did not follow next-island navigation",
    );

    document.querySelector<HTMLButtonElement>('[aria-label^="Previous island"]')?.click();
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="archipelago-island-fallback"]')
          ?.getAttribute("data-era") === "neolithic",
      "the fallback did not follow previous-island navigation",
    );
    document
      .querySelector<HTMLButtonElement>('[data-testid="archipelago-primary-action"]')
      ?.click();
    expect(onEnter).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener("error", onError);
  }
});
