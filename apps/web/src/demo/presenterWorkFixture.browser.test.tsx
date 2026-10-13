import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEWPORTS = [
  { width: 1920, height: 1080, name: "1920x1080" },
  { width: 1024, height: 580, name: "1024x580" },
  { width: 390, height: 580, name: "390x580" },
] as const;

function srgb(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function rgb(value: string): [number, number, number] {
  const channels = value
    .match(/\d+(?:\.\d+)?/g)
    ?.slice(0, 3)
    .map(Number);
  if (channels?.length !== 3) {
    throw new Error(`could not read computed colour ${value}`);
  }
  return channels as [number, number, number];
}

function contrast(foreground: string, background: string): number {
  const luminance = ([red, green, blue]: [number, number, number]) =>
    0.2126 * srgb(red) + 0.7152 * srgb(green) + 0.0722 * srgb(blue);
  const light = luminance(rgb(foreground));
  const dark = luminance(rgb(background));
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

async function stageFixedResult(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error("the Presenter mock upload supplied no local file input");
  }
  const transfer = new DataTransfer();
  transfer.items.add(
    new File([new Uint8Array([1, 2, 3, 4])], "solution-photo.png", {
      type: "image/png",
    }),
  );
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await screen.findByRole("status", { name: "Checking your work" });
  await screen.findByTestId("presenter-work-result", {}, { timeout: 8_000 });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

test("the deterministic demo result is projector-legible and keeps its whole key story visible", {
  timeout: 60_000,
}, async () => {
  for (const viewport of VIEWPORTS) {
    await page.viewport(viewport.width, viewport.height);
    const fetchSpy = vi.spyOn(window, "fetch");
    window.history.replaceState(
      null,
      "",
      "/demo?presenter=1&preset=progress-construction&surface=work&era=bronze_age",
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Photo work feedback" });
    await stageFixedResult();

    const result = await screen.findByTestId("presenter-work-result");
    const title = result.querySelector<HTMLElement>(".presenter-work-result__title");
    expect(title).not.toBeNull();
    const titleSize = Number.parseFloat(getComputedStyle(title as HTMLElement).fontSize);
    expect(
      titleSize,
      `${viewport.name} result heading is too small`,
    ).toBeGreaterThanOrEqual(viewport.width <= 390 ? 24 : 30);

    const visibleEquations = () =>
      [
        ...result.querySelectorAll<HTMLElement>(".presenter-work-result__equation .katex"),
      ].filter((equation) => equation.getClientRects().length > 0);
    await waitFor(
      () =>
        expect(
          visibleEquations().length,
          `${viewport.name} did not finish typesetting the math`,
        ).toBeGreaterThanOrEqual(viewport.width <= 390 ? 5 : 7),
      { timeout: 5_000 },
    );
    const equations = visibleEquations();
    expect(
      equations.length,
      `${viewport.name} did not typeset the math`,
    ).toBeGreaterThanOrEqual(viewport.width <= 390 ? 5 : 7);
    for (const equation of equations) {
      const size = Number.parseFloat(getComputedStyle(equation).fontSize);
      expect(size, `${viewport.name} equation is too small`).toBeGreaterThanOrEqual(
        viewport.width <= 390 ? 20 : 28,
      );
      const box = equation.getBoundingClientRect();
      expect(box.left, `${viewport.name} equation is clipped left`).toBeGreaterThanOrEqual(
        0,
      );
      expect(box.right, `${viewport.name} equation is clipped right`).toBeLessThanOrEqual(
        viewport.width,
      );
    }

    for (const panel of result.querySelectorAll<HTMLElement>("[data-key-story]")) {
      const style = getComputedStyle(panel);
      expect(
        contrast(style.color, style.backgroundColor),
        `${viewport.name} ${panel.dataset.keyStory} contrast`,
      ).toBeGreaterThanOrEqual(7);
      const box = panel.getBoundingClientRect();
      expect(
        box.left,
        `${viewport.name} ${panel.dataset.keyStory} is clipped left`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box.right,
        `${viewport.name} ${panel.dataset.keyStory} is clipped right`,
      ).toBeLessThanOrEqual(viewport.width);
      expect(
        box.top,
        `${viewport.name} ${panel.dataset.keyStory} is above the frame`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box.bottom,
        `${viewport.name} ${panel.dataset.keyStory} is below the frame`,
      ).toBeLessThanOrEqual(viewport.height);
    }

    expect(result.querySelectorAll("[data-key-story]").length).toBeGreaterThanOrEqual(3);
    expect(result.textContent).toContain("Last correct line");
    expect(result.textContent).toContain("First incorrect line");
    expect(result.textContent).toContain("Correct transformation");
    const visibleEssentials = [
      title as HTMLElement,
      screen.getByRole("button", { name: "That's not what I wrote" }),
    ];
    for (const essential of visibleEssentials) {
      expect(essential).toBeVisible();
      const box = essential.getBoundingClientRect();
      expect(
        box.top,
        `${viewport.name} essential content is above the frame`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box.bottom,
        `${viewport.name} essential content is below the frame`,
      ).toBeLessThanOrEqual(viewport.height);
    }
    const backendCalls = fetchSpy.mock.calls.filter(([input]) =>
      /\/api\/|work-upload|bedrock/i.test(String(input)),
    );
    expect(backendCalls, `${viewport.name} presenter fixture called a backend`).toEqual([]);

    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        path: `__screenshots__/presenter-work-fixture/result-${viewport.name}.png`,
      });
    }
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    resetCityEra();
  }
});
