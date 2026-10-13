import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../../App";
import { resetCityEra } from "../useCityEra";

import "../../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const PHASE = String(import.meta.env.VITE_BUILDING_VARIANT_EVIDENCE ?? "");
const RECORD = PHASE === "before" || PHASE === "after";
const VIEWPORT = { width: 1024, height: 580 } as const;
const OUTPUT = `output/qa/building-variant-isolation/${PHASE}`;

const ERAS = [
  {
    id: "prehistoric",
    url: "/demo?presenter=1&preset=economy-city&surface=city&era=prehistoric",
    targets: [
      { nodeId: "NUM.S", label: "assembly-hall-roundhouse" },
      { nodeId: "NUM.3", label: "workshop-tool-shelter" },
    ],
  },
  {
    id: "neolithic",
    url: "/demo?presenter=1&preset=bronze-city&surface=city&era=neolithic",
    targets: [
      { nodeId: "RAD.3", label: "assembly-hall-meeting-house" },
      { nodeId: "RAD.1", label: "workshop-potters-kiln" },
    ],
  },
  {
    id: "renaissance",
    url: "/demo?presenter=1&preset=bronze-city&surface=city&era=renaissance",
    targets: [{ nodeId: "GEO.2", label: "procedural-fallback-control" }],
  },
] as const;

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

function viewportClip(): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("building-variant evidence is not mounted in the browser frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  expect(
    box.height / window.innerHeight,
    "the evidence frame is not a true 1024x580",
  ).toBeCloseTo(1, 1);
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: Math.min(box.width, VIEWPORT.width),
    height: Math.min(box.height, VIEWPORT.height),
  };
}

async function capture(filename: string): Promise<void> {
  await document.fonts.ready;
  // The first unbuilt card is a cold GLB load; wait for its on-demand Canvas frame rather than
  // recording the already-mounted but still-empty canvas.
  await new Promise<void>((resolve) => setTimeout(resolve, 2_500));
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
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`${OUTPUT}/${filename}.png`, shot.data, {
      encoding: "base64",
    });
  }
}

async function mountPresenter(url: string): Promise<void> {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  window.history.replaceState(null, "", url);
  render(<App />);
  await screen.findByRole("button", { name: "Build" }, { timeout: 30_000 });
  await waitFor(
    () =>
      expect(
        document.querySelector(".city-viewport canvas") !== null &&
          document.querySelectorAll("[data-skill-label][data-footprint-screen-box]")
            .length >= 4,
        "the real Presenter city did not render and project its placed buildings",
      ).toBe(true),
    { timeout: 60_000 },
  );
}

async function openBuildMenu(): Promise<HTMLElement> {
  screen.getByRole<HTMLButtonElement>("button", { name: "Build" }).click();
  const shop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  await waitFor(
    () =>
      expect(
        shop.querySelectorAll<HTMLCanvasElement>(".build-card canvas").length,
        "the real 3D catalog thumbnails did not mount",
      ).toBeGreaterThanOrEqual(5),
    { timeout: 30_000 },
  );
  return shop;
}

async function frameTargetCard(
  shop: HTMLElement,
  eraId: string,
  target: { readonly nodeId: string; readonly label: string },
): Promise<void> {
  const card = shop.querySelector<HTMLElement>(
    `.build-card[data-node-id="${target.nodeId}"]`,
  );
  expect(
    card,
    `${target.nodeId} is absent from the real ${eraId} Build menu`,
  ).not.toBeNull();
  card?.scrollIntoView({ block: "nearest", inline: "center" });
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  if (!card) return;
  const cardBox = card.getBoundingClientRect();
  const shopBox = shop.getBoundingClientRect();
  expect(
    cardBox.left,
    `${target.nodeId} is left of the captured menu`,
  ).toBeGreaterThanOrEqual(shopBox.left);
  expect(
    cardBox.right,
    `${target.nodeId} is right of the captured menu`,
  ).toBeLessThanOrEqual(shopBox.right);
  await capture(`${eraId}-build-menu-${target.label}-1024x580`);
}

test.runIf(RECORD)(
  "captures fixed GLB cards and the retained procedural fallback on real Presenter surfaces",
  async () => {
    expect(ERAS).toHaveLength(3);
    expect(ERAS.reduce((total, era) => total + era.targets.length, 0)).toBe(5);

    for (const era of ERAS) {
      await mountPresenter(era.url);
      if (era.id === "neolithic") {
        expect(
          document.querySelector('[data-skill-label="RAD.1"]'),
          "the Potter's Kiln is not mounted in the city evidence frame",
        ).not.toBeNull();
        await capture("neolithic-city-potters-kiln-1024x580");
      }
      if (era.id === "renaissance") {
        expect(
          document.querySelector('[data-skill-label="GEO.1"]'),
          "no procedural Early Modern control is mounted in the city evidence frame",
        ).not.toBeNull();
        await capture("renaissance-city-procedural-fallbacks-1024x580");
      }
      const shop = await openBuildMenu();
      for (const target of era.targets) {
        await frameTargetCard(shop, era.id, target);
      }
      cleanup();
      resetCityEra();
      localStorage.clear();
    }
  },
  180_000,
);
