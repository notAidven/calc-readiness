import type { EraId } from "@cr/skill-graph";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { presenterFixtureFor } from "../demo/presenterFixtures";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import type { CityLoad } from "./types";

import "../styles.css";

const CAPTURE = Boolean(import.meta.env.VITE_ECONOMY_SCALING_REVIEW);
const VARIANT = import.meta.env.VITE_ECONOMY_SCALING_VARIANT ?? "review";
const OUTPUT = "output/economy-scaling";
const ERAS: readonly EraId[] = ["prehistoric", "medieval", "atomic_age"];
const VIEWPORTS = [
  { width: 1024, height: 580 },
  { width: 390, height: 580 },
] as const;

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

function presenterLoad(eraId: EraId): CityLoad {
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "progress-mastered",
    surface: "city",
    eraId,
  });
  return {
    node_states: fixture.city.seed.nodeStates,
    placements: fixture.city.seed.placements,
    town_hall: fixture.city.seed.townHall,
    roads: fixture.city.seed.roads ?? [],
    civic: fixture.city.seed.civic ?? [],
  };
}

function viewportClip(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (frame === null) {
    throw new Error("the City Life review is not mounted in its browser frame");
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
  if (CAPTURE) {
    await commands.writeFile(`${OUTPUT}/${filename}`, shot.data, { encoding: "base64" });
  }
}

test.runIf(CAPTURE)(
  "captures representative Presenter City Life frames on learner-faithful mounts",
  async () => {
    for (const viewport of VIEWPORTS) {
      await page.viewport(viewport.width, viewport.height);
      for (const eraId of ERAS) {
        const load = presenterLoad(eraId);
        harness = mount(
          <div className="city-shell">
            <CitySurface
              archipelagoMetrics
              enableCanvas
              enableOnboardingDemo={false}
              reducedMotion
              eraId={eraId}
              loadCity={() => Promise.resolve(load)}
            />
          </div>,
        );
        await waitFor(
          () => {
            const city = document.querySelector<HTMLElement>(
              '[data-testid="city-viewport"]',
            );
            return (
              document.querySelector(".city-viewport canvas") !== null &&
              (city?.dataset.compositionReady === "true" ||
                Number(city?.dataset.sampleFrames ?? 0) >= 8)
            );
          },
          `${eraId} ${viewport.width}x${viewport.height} City Life frame did not settle`,
          60_000,
        );
        await document.fonts.ready;
        await new Promise<void>((resolve) => setTimeout(resolve, 1_800));

        const panel = document.querySelector<HTMLElement>('[data-testid="city-vitality"]');
        expect(panel, `${eraId} City Life panel`).not.toBeNull();
        const panelBox = panel?.getBoundingClientRect();
        expect(
          panelBox?.left ?? -1,
          `${eraId} City Life starts outside the frame`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          panelBox?.right ?? Number.POSITIVE_INFINITY,
          `${eraId} City Life ends outside ${viewport.width}x${viewport.height}`,
        ).toBeLessThanOrEqual(viewport.width);
        expect(panel?.querySelectorAll(".hud-vitality-row")).toHaveLength(3);

        await capture(`${VARIANT}-${eraId}-${viewport.width}x${viewport.height}.png`);
        harness.cleanup();
        harness = null;
      }
    }
  },
  480_000,
);
