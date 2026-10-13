import { materialForEraOrThrow } from "@cr/economy";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { ArchipelagoOverview } from "../archipelago/ArchipelagoOverview";
import { foundingLayout } from "../archipelago/islandState";
import { EconomyHud } from "../economy/EconomyHud";
import type { UseEconomy } from "../economy/useEconomy";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { loadMockCity, MOCK_NODE_STATES } from "./mockCity";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_HUD_SHOTS);
const OUT = "/workspace/output/design-review/build-resource-townhall";
const STONE = materialForEraOrThrow("prehistoric");
let harness: Harness | null = null;

const economy: UseEconomy = {
  wallet: {
    materials: { stone: 200 },
    spendable: 200,
    spendableMaterial: STONE,
  },
  reward: null,
  message: "",
  reconcileProgress: () => {},
  reportPracticeSetComplete: async () => null,
  reportInterleavedClear: async () => {},
  reportCivicBootstrap: async () => {},
  refresh: async () => {},
};

afterEach(() => {
  harness?.cleanup();
  harness = null;
  document.querySelector("[data-hud-layer-review-style]")?.remove();
  document.body.innerHTML = "";
});

function hideDevChrome(): void {
  const style = document.createElement("style");
  style.dataset.hudLayerReviewStyle = "true";
  style.textContent =
    ".ob-replay,.catchup-skip,.achievement-note,.coach-mark,.hud-milestone{" +
    "display:none!important}";
  document.head.append(style);
}

function viewportClip(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the browser test has no tester frame to capture");
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

async function keep(name: string): Promise<void> {
  const session = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...viewportClip(), scale: 1 },
  });
  if (SHOTS) {
    await commands.writeFile(`${OUT}/${name}`, shot.data, { encoding: "base64" });
  }
}

async function settle(): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 2400));
}

test.skipIf(!SHOTS).each([
  { name: "1024x580", width: 1024, height: 580 },
  { name: "390x580", width: 390, height: 580 },
])("captures the learner city and expanded Built shelf at $name", async (view) => {
  await page.viewport(view.width, view.height);
  hideDevChrome();
  harness = mount(
    <div className="city-shell">
      <EconomyHud economy={economy} reducedMotion />
      <CitySurface
        enableCanvas
        enableOnboardingDemo={false}
        loadCity={loadMockCity}
        reducedMotion
      />
    </div>,
  );
  await waitFor(
    () =>
      document.querySelector('[data-town-hall-nameplate][data-label-state="shown"]') !==
        null && document.querySelector(".city-viewport canvas") !== null,
    "the real city, material row, and Town Hall nameplate did not render",
    40_000,
  );
  await settle();
  await keep(`city-collapsed-${view.name}.png`);

  document.querySelector<HTMLButtonElement>(".city-build-button")?.click();
  await waitFor(
    () => document.querySelector(".build-shop-built-toggle") !== null,
    "Build did not open",
  );
  document.querySelector<HTMLButtonElement>(".build-shop-built-toggle")?.click();
  await waitFor(
    () => document.querySelector('.build-shop-built-toggle[aria-expanded="true"]') !== null,
    "Built did not expand",
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const frame = document
    .querySelector<HTMLElement>(".build-shop-frame")
    ?.getBoundingClientRect();
  const summary = document
    .querySelector<HTMLElement>(".build-shop-built-toggle")
    ?.getBoundingClientRect();
  const tabs = [...document.querySelectorAll<HTMLElement>(".build-tab")];
  expect(frame?.top).toBeGreaterThanOrEqual(0);
  expect(frame?.bottom).toBeLessThanOrEqual(view.height);
  expect(summary?.height).toBeGreaterThanOrEqual(44);
  expect(tabs).toHaveLength(3);
  expect(tabs.every((tab) => tab.getBoundingClientRect().bottom <= view.height)).toBe(true);
  expect(
    document.querySelector<HTMLElement>(".build-card")?.getBoundingClientRect().top,
  ).toBeLessThan(view.height);
  await keep(`build-built-expanded-${view.name}.png`);
});

test.skipIf(!SHOTS)(
  "captures current, authored locked, generic locked, and active preview carousel frames",
  async () => {
    await page.viewport(1024, 580);
    const standing = foundingLayout();
    harness = mount(
      <ArchipelagoOverview
        nodeStates={MOCK_NODE_STATES}
        liveEraId="prehistoric"
        foundedIslands={[{ eraId: "prehistoric", layout: standing }]}
        standingIslandLayout={standing}
        onEnterIsland={() => undefined}
        onPreviewEra={() => undefined}
        onClose={() => undefined}
        enableCanvas
        reducedMotion
      />,
    );
    await waitFor(
      () => document.querySelector('[data-mode="standing"] canvas') !== null,
      "the current island did not render",
      40_000,
    );
    document.querySelector<HTMLButtonElement>(".archipelago-route-trigger")?.click();
    await waitFor(
      () =>
        document.querySelector(".archipelago-route-menu")?.getAttribute("hidden") === null,
      "the island route menu did not open",
    );
    const options = [
      ...document.querySelectorAll<HTMLElement>(".archipelago-route-option"),
    ];
    expect(options).toHaveLength(10);
    expect(
      options.every((option) => {
        const box = option.getBoundingClientRect();
        return box.width >= 44 && box.height >= 44;
      }),
    ).toBe(true);
    document.querySelector<HTMLButtonElement>(".archipelago-route-trigger")?.click();
    await settle();
    await keep("carousel-current-1024x580.png");

    document
      .querySelector<HTMLButtonElement>('[data-testid="archipelago-select-classical"]')
      ?.click();
    await waitFor(
      () => document.querySelector('[data-mode="future"][data-era="classical"]') !== null,
      "the authored locked island did not render",
    );
    await settle();
    const lock = document
      .querySelector<HTMLElement>(".archipelago-classic-lock--landing")
      ?.getBoundingClientRect();
    const caption = document
      .querySelector<HTMLElement>(".archipelago-landmark-caption")
      ?.getBoundingClientRect();
    expect(lock).toBeDefined();
    expect(caption).toBeDefined();
    if (lock && caption) {
      const overlaps =
        lock.left < caption.right &&
        caption.left < lock.right &&
        lock.top < caption.bottom &&
        caption.top < lock.bottom;
      expect(overlaps).toBe(false);
    }
    await keep("carousel-locked-future-1024x580.png");

    document
      .querySelector<HTMLButtonElement>('[data-testid="archipelago-select-renaissance"]')
      ?.click();
    await waitFor(
      () => document.querySelector('[data-mode="future"][data-era="renaissance"]') !== null,
      "the generic locked island did not render",
    );
    await settle();
    await keep("carousel-locked-generic-fallback-1024x580.png");

    document
      .querySelector<HTMLButtonElement>('[data-testid="archipelago-primary-action"]')
      ?.click();
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="archipelago-overview"]')
          ?.getAttribute("data-previewing") === "true",
      "active preview did not start",
    );
    expect(
      document.querySelector('[data-mode="future"][data-era="renaissance"]'),
    ).not.toBeNull();
    await settle();
    await keep("carousel-active-preview-1024x580.png");
  },
);
