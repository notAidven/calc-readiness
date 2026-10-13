import type { EraId } from "@cr/skill-graph";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { ArchipelagoOverview } from "../archipelago/ArchipelagoOverview";
import { foundingLayout, type IslandRecord } from "../archipelago/islandState";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_HUD_CIVIC_SHOTS);
const OUTPUT = "output/design-review/hud-civic-instrument";
const VIEWPORTS = [
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
  document.querySelector("[data-hud-review-style]")?.remove();
});

function viewportClip(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the review frame is not running in its learner iframe");
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

async function capture(name: string, keep = true): Promise<void> {
  const browser = cdp() as unknown as {
    send: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  const shot = await browser.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...viewportClip(), scale: 1 },
  });
  expect(shot.data, `Chromium returned no pixels for ${name}`).toBeTruthy();
  if (keep) {
    if (SHOTS) {
      await commands.writeFile(`${OUTPUT}/${name}.png`, shot.data, { encoding: "base64" });
    }
  }
}

function hideDevChrome(): void {
  const style = document.createElement("style");
  style.dataset.hudReviewStyle = "true";
  style.textContent =
    ".ob-replay, .achievement-note, .coach-mark, .hud-milestone { display: none !important; }";
  document.head.append(style);
}

async function settleCity(): Promise<void> {
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the learner city canvas did not mount",
    30_000,
  );
  await waitFor(
    () => document.querySelector('[data-testid="city-vitality"]') !== null,
    "the civic instrument did not mount",
    30_000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 2_500));
  // The first clipped CDP frame can carry a stale WebGL layer while metrics settle.
  await capture("00-throwaway", false);
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
}

async function mountCity(width: number, height: number): Promise<void> {
  await page.viewport(width, height);
  hideDevChrome();
  h = mount(
    <div className="city-shell">
      <CitySurface reducedMotion enableOnboardingDemo={false} />
    </div>,
  );
  await settleCity();
}

function island(eraId: EraId): IslandRecord {
  return { eraId, layout: foundingLayout() };
}

test.runIf(SHOTS)(
  "captures the learner city, Environment Menu, and reversible bay preview",
  async () => {
    for (const viewport of VIEWPORTS) {
      await mountCity(viewport.width, viewport.height);
      const suffix = `${viewport.width}x${viewport.height}`;
      const vitality = document.querySelector<HTMLElement>('[data-testid="city-vitality"]');
      const capsule = document.querySelector<HTMLElement>('[data-testid="town-capsule"]');
      expect(vitality).not.toBeNull();
      expect(capsule).not.toBeNull();
      expect(vitality?.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.height);
      expect(capsule?.getBoundingClientRect().right).toBeLessThanOrEqual(viewport.width);
      await capture(`city-ordinary-${suffix}`);

      document.querySelector<HTMLButtonElement>(".hud-menu-toggle")?.click();
      await waitFor(
        () => document.querySelector('[data-testid="menu-environment"]') !== null,
        "Menu did not reveal Environment",
      );
      const menu = document.querySelector<HTMLElement>(".city-menu-popover");
      const environment = document.querySelector<HTMLElement>(
        '[data-testid="menu-environment"]',
      );
      expect(menu).not.toBeNull();
      expect(environment).not.toBeNull();
      expect(menu?.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.height);
      expect(environment?.textContent).toMatch(/Environment.*Lighting.*Day.*Sound.*On/s);
      const sound = environment?.querySelector<HTMLButtonElement>(
        '[data-testid="audio-settings-toggle"]',
      );
      sound?.focus();
      expect(document.activeElement).toBe(sound);
      await capture(`city-menu-environment-${suffix}`);

      h?.cleanup();
      h = null;
      await waitFor(
        () => document.querySelectorAll("canvas").length === 0,
        "the previous city canvas remained mounted",
        30_000,
      );
      document.querySelector("[data-hud-review-style]")?.remove();
    }

    await page.viewport(1024, 580);
    h = mount(
      <div className="city-shell">
        <ArchipelagoOverview
          nodeStates={[]}
          liveEraId="neolithic"
          foundedIslands={[island("prehistoric"), island("neolithic")]}
          onEnterIsland={() => undefined}
          onSailTo={() => undefined}
          onPreviewEra={() => undefined}
          onClose={() => undefined}
          enableCanvas
          reducedMotion
        />
      </div>,
    );
    await waitFor(
      () => document.querySelector(".archipelago-hero-renderer canvas") !== null,
      "the bay canvas did not mount",
      30_000,
    );
    document
      .querySelector<HTMLButtonElement>('[data-testid="archipelago-select-bronze_age"]')
      ?.click();
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="archipelago-overview"]')
          ?.getAttribute("data-state") === "closed",
      "the closed island did not settle",
      30_000,
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
    await capture("00-throwaway", false);
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    expect(
      document.querySelector('[data-testid="archipelago-classic-lock"]'),
    ).not.toBeNull();
    await capture("bay-closed-before-preview-1024x580");

    document
      .querySelector<HTMLButtonElement>('[data-testid="archipelago-primary-action"]')
      ?.click();
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="archipelago-overview"]')
          ?.getAttribute("data-previewing") === "true",
      "the camera-only preview did not activate",
    );
    expect(document.querySelector('[data-testid="archipelago-classic-lock"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="archipelago-primary-action"]')?.textContent,
    ).toContain("End preview");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await capture("bay-active-camera-preview-1024x580");
  },
  180_000,
);
