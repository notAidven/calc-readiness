import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";
import { presenterFixtureFor } from "./presenterFixtures";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const OUTPUT = "output/design-review/presenter-final-demo-seed";

async function capture(name: string): Promise<void> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter final-demo test has no browser frame");
  }
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 1_200));
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
  expect(shot.data, `${name} screenshot bytes`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`${OUTPUT}/${name}.png`, shot.data, {
      encoding: "base64",
    });
  }
}

async function waitForCityComposition(eraId: EraId): Promise<void> {
  await screen.findByRole("button", { name: "Build" }, { timeout: 30_000 });
  const expected = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "bronze-city",
    surface: "city",
    eraId,
  }).city.seed.placements;
  await waitFor(
    () => {
      expect(document.querySelector(".city-canvas canvas")).not.toBeNull();
      expect(
        document.querySelector<HTMLElement>('[data-testid="city-viewport"]')?.dataset
          .compositionReady,
        `${eraId} did not load every skill, civic, Town Hall, and island mesh`,
      ).toBe("true");
      expect(
        expected.every((placement) =>
          document.querySelector(
            `[data-skill-label="${placement.nodeId}"][data-footprint-screen-box]`,
          ),
        ),
        `${eraId} did not project every deterministic skill placement`,
      ).toBe(true);
    },
    { timeout: 60_000 },
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

test("a fresh canonical Presenter path renders all ten founded cities and traverses them", {
  timeout: 300_000,
}, async () => {
  await page.viewport(1024, 580);
  localStorage.clear();
  expect(localStorage.length, "the final-demo browser must begin without prior state").toBe(
    0,
  );
  const fetchSpy = vi.spyOn(window, "fetch");
  window.history.replaceState(null, "", "/demo?presenter=1");
  render(<App />);

  await waitForCityComposition("neolithic");

  const presenterBar = screen.getByRole("navigation", { name: "Presenter actions" });
  within(presenterBar).getByRole<HTMLButtonElement>("button", { name: "Bay" }).click();
  const bay = await screen.findByTestId("archipelago-overview");
  expect(bay).toHaveAttribute("data-view", "focus");

  for (const era of ERA_SEQUENCE) {
    const option = screen.getByTestId(`archipelago-select-${era.id}`);
    expect(
      option.dataset.state,
      `${era.id} is not unlocked in the fresh Presenter Bay`,
    ).toMatch(/^(standing|settled)$/);
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 1_200));
  await capture("bay-all-ten-unlocked-1024x580");

  cleanup();
  resetCityEra();
  localStorage.clear();
  for (const [index, era] of ERA_SEQUENCE.entries()) {
    expect(
      localStorage.length,
      `${era.id} inherited browser storage before its clean Presenter mount`,
    ).toBe(0);
    window.history.replaceState(
      null,
      "",
      `/demo?presenter=1&era=${encodeURIComponent(era.id)}`,
    );
    render(<App />);
    await waitForCityComposition(era.id);
    await capture(`era-${String(index + 1).padStart(2, "0")}-${era.id}-city-1024x580`);
    expect(
      Object.keys(localStorage).every((key) => key.startsWith("cr.presenter.")),
      `${era.id} wrote non-Presenter browser state during its disposable mount`,
    ).toBe(true);
    cleanup();
    resetCityEra();
    localStorage.clear();
  }

  const backendCalls = fetchSpy.mock.calls
    .map(([input]) =>
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    )
    .filter((url) => /\/api\/|cognito/i.test(new URL(url, window.location.href).href));
  expect(backendCalls, "the disposable Presenter fixture called an API or Cognito").toEqual(
    [],
  );
});
