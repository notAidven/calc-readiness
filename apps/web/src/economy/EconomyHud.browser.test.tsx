import { materialForEraOrThrow } from "@cr/economy";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { EconomyHud } from "./EconomyHud";
import type { UseEconomy } from "./useEconomy";

import "../styles.css";

const STONE = materialForEraOrThrow("prehistoric");
let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
  document.body.innerHTML = "";
});

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

test.each([
  { name: "1024x580", width: 1024, height: 580 },
  { name: "390x580", width: 390, height: 580 },
])(
  "the $name material readout leads the left civic column instead of floating centrally",
  async (view) => {
    await page.viewport(view.width, view.height);
    harness = mount(
      <div className="city-shell">
        <EconomyHud economy={economy} reducedMotion />
      </div>,
    );
    await waitFor(
      () => document.querySelector('[data-testid="economy-material-icon"]') !== null,
      "the keyed material glyph mounts",
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const hud = document.querySelector<HTMLElement>(".economy-hud");
    const icon = document.querySelector<HTMLElement>(
      '[data-testid="economy-material-icon"]',
    );
    if (!hud || !icon) {
      throw new Error("material readout did not mount");
    }
    const box = hud.getBoundingClientRect();
    expect(Math.round(box.left)).toBe(16);
    expect(getComputedStyle(hud).transform).toBe("none");
    expect(icon.dataset.materialId).toBe("stone");
  },
);
