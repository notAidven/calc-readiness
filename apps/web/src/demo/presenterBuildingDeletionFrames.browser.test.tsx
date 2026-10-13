import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

async function captureViewport(): Promise<string> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter deletion frame has no browser viewport");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  const session = cdp() as unknown as {
    send: (
      method: string,
      params: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.left + outer.scrollX,
      y: box.top + outer.scrollY,
      width: box.width,
      height: box.height,
      scale: 1,
    },
  });
  return shot.data;
}

async function openPlacedSkillBuilding(): Promise<HTMLElement> {
  await waitFor(
    () => {
      const found = document.querySelector<HTMLCanvasElement>(".city-canvas canvas");
      expect(found, "the Presenter city did not start its live canvas").not.toBeNull();
      return found as HTMLCanvasElement;
    },
    { timeout: 15_000 },
  );
  const labels = await waitFor(() => {
    const found = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-skill-label][data-footprint-screen-box]",
      ),
    ];
    expect(
      found.length,
      "the Atomic city has no projected skill footprints",
    ).toBeGreaterThan(0);
    return found;
  });
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter deletion click has no browser viewport");
  }
  const frameBox = frame.getBoundingClientRect();
  const session = cdp() as unknown as {
    send: (method: string, params: Record<string, unknown>) => Promise<unknown>;
  };
  for (const label of labels) {
    const footprint = JSON.parse(label.dataset.footprintScreenBox ?? "") as {
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    };
    for (const [xRatio, yRatio] of [
      [0.5, 0.3],
      [0.5, 0.5],
      [0.35, 0.4],
      [0.65, 0.4],
      [0.35, 0.65],
      [0.65, 0.65],
    ] as const) {
      const clientX =
        frameBox.left + footprint.left + (footprint.right - footprint.left) * xRatio;
      const clientY =
        frameBox.top + footprint.top + (footprint.bottom - footprint.top) * yRatio;
      await session.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: clientX,
        y: clientY,
      });
      await session.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: clientX,
        y: clientY,
        button: "left",
        clickCount: 1,
      });
      await session.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: clientX,
        y: clientY,
        button: "left",
        clickCount: 1,
      });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const opened = document.querySelector<HTMLElement>(
        '.building-callout[role="dialog"]',
      );
      if (opened) {
        return opened;
      }
    }
  }
  return waitFor(() => {
    const callout = document.querySelector<HTMLElement>('.building-callout[role="dialog"]');
    expect(callout).not.toBeNull();
    return callout as HTMLElement;
  });
}

for (const viewport of [
  { name: "short-laptop", width: 1024, height: 580 },
  { name: "phone", width: 390, height: 580 },
] as const) {
  test(`Presenter delete stays contextual and reachable at ${viewport.width}x${viewport.height}`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(
      null,
      "",
      "/demo?presenter=1&preset=bronze-city&surface=city&era=atomic_age",
    );
    render(<App />);
    await screen.findByRole("button", { name: "Build" });
    const callout = await openPlacedSkillBuilding();
    const remove = within(callout).getByRole<HTMLButtonElement>("button", {
      name: "Delete building",
    });
    const move = within(callout).getByRole<HTMLButtonElement>("button", {
      name: "Move building",
    });
    const bar = screen.getByRole("navigation", { name: "Presenter actions" });

    expect(screen.getAllByRole("button", { name: "Delete building" })).toHaveLength(1);
    expect(remove).toBeVisible();
    await waitFor(() =>
      expect(remove.getBoundingClientRect().height).toBeGreaterThanOrEqual(44),
    );
    const removeBox = remove.getBoundingClientRect();
    expect(removeBox.width).toBeGreaterThanOrEqual(44);
    expect(removeBox.height).toBeGreaterThanOrEqual(44);
    expect(move.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const calloutBox = callout.getBoundingClientRect();
    expect(calloutBox.left).toBeGreaterThanOrEqual(0);
    expect(calloutBox.right).toBeLessThanOrEqual(viewport.width);
    expect(calloutBox.top).toBeGreaterThanOrEqual(0);
    expect(calloutBox.bottom).toBeLessThanOrEqual(bar.getBoundingClientRect().top);
    expect(document.querySelector(".city-stage-full")).not.toHaveAttribute("hidden");

    if (CAPTURE_EVIDENCE) {
      await commands.writeFile(
        `output/design-review/presenter-building-deletion/delete-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        await captureViewport(),
        { encoding: "base64" },
      );
    }
  });
}
