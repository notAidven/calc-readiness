import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";
import { presenterUnbuiltNodeId } from "./presenterFixtures";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const TARGET = "RAD.3";
const OUTPUT = "output/design-review/presenter-era2-target-selection/post-fix";
const VIEWPORTS = [
  { name: "1024x580", width: 1024, height: 580 },
  { name: "390x580", width: 390, height: 580 },
] as const;

interface CapturedFrame {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly png: string;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

async function capturedViewport(): Promise<CapturedFrame> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Era 2 progression test has no browser frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  const session = cdp() as unknown as {
    send(
      method: string,
      params: Record<string, unknown>,
    ): Promise<{ readonly data: string }>;
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
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the Era 2 progression frame did not decode"));
    image.src = `data:image/png;base64,${shot.data}`;
  });
  const sink = document.createElement("canvas");
  sink.width = image.naturalWidth;
  sink.height = image.naturalHeight;
  const context = sink.getContext("2d");
  if (!context) {
    throw new Error("the Era 2 progression frame has no 2D context");
  }
  context.drawImage(image, 0, 0);
  return {
    data: context.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
    png: shot.data,
  };
}

async function capture(viewport: string, stage: string): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  const frame = await capturedViewport();
  if (CAPTURE_EVIDENCE) {
    if (viewport === "1024x580") {
      await commands.writeFile(`${OUTPUT}/1024x580/${stage}.png`, frame.png, {
        encoding: "base64",
      });
    } else {
      await commands.writeFile(`${OUTPUT}/390x580/${stage}.png`, frame.png, {
        encoding: "base64",
      });
    }
  }
}

async function renderedGoldStarCount(nodeId: string): Promise<number> {
  const label = document.querySelector<HTMLElement>(`[data-skill-label="${nodeId}"]`);
  const rawBand = label?.dataset.masteryStarScreenBox;
  if (!rawBand) {
    throw new Error(`${nodeId} has no measurable mastery-star band`);
  }
  const band = JSON.parse(rawBand) as {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  const frame = await capturedViewport();
  const scaleX = frame.width / window.innerWidth;
  const scaleY = frame.height / window.innerHeight;
  const left = Math.max(0, Math.floor(band.left * scaleX));
  const right = Math.min(frame.width - 1, Math.ceil(band.right * scaleX));
  const top = Math.max(0, Math.floor(band.top * scaleY));
  const bottom = Math.min(frame.height - 1, Math.ceil(band.bottom * scaleY));
  const width = right - left + 1;
  const height = bottom - top + 1;
  const gold = new Uint8Array(width * height);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const pixel = (y * frame.width + x) * 4;
      const r = frame.data[pixel] ?? 0;
      const g = frame.data[pixel + 1] ?? 0;
      const b = frame.data[pixel + 2] ?? 0;
      const standardGold = r > 205 && g > 155 && b < 165 && r - b > 55 && r > g && g > b;
      const celebratoryGold = r > 230 && g > 190 && b < 220 && r - b > 25 && g - b > 10;
      if (standardGold || celebratoryGold) {
        gold[(y - top) * width + (x - left)] = 1;
      }
    }
  }

  let components = 0;
  for (let start = 0; start < gold.length; start += 1) {
    if (gold[start] !== 1) {
      continue;
    }
    let pixels = 0;
    const queue = [start];
    gold[start] = 0;
    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) {
        continue;
      }
      pixels += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (const [dx, dy] of [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ] as const) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
          continue;
        }
        const next = nextY * width + nextX;
        if (gold[next] === 1) {
          gold[next] = 0;
          queue.push(next);
        }
      }
    }
    if (pixels >= 4) {
      components += 1;
    }
  }
  return components;
}

function dismissCompletionReward(): void {
  const reward = screen.queryByRole("alertdialog");
  if (reward) {
    fireEvent.click(within(reward).getByRole("button", { name: "Continue" }));
  }
}

async function dismissCompletionRewards(): Promise<void> {
  for (let receipt = 0; receipt < 4; receipt += 1) {
    const reward = screen.queryByRole("alertdialog");
    if (!reward) {
      return;
    }
    fireEvent.click(within(reward).getByRole("button", { name: "Continue" }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  throw new Error("the Presenter completion-reward queue did not drain");
}

async function openBuildMenu() {
  dismissCompletionReward();
  fireEvent.click(await screen.findByRole("button", { name: "Build" }));
  const shop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  expect(within(shop).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  return shop;
}

function expectTargetFirstWithoutScrolling(shop: HTMLElement): void {
  const row = within(shop).getByRole("list", {
    name: /Neolithic Era skill buildings to place/i,
  });
  const cards = [...row.querySelectorAll<HTMLElement>(":scope > .build-card")];
  expect(cards.length, "the Presenter skill-building row became empty").toBeGreaterThan(0);
  expect(
    cards[0],
    "the Presenter target is not the first skill-building card",
  ).toHaveAttribute("data-node-id", TARGET);
  expect(cards[0]).toHaveTextContent("Meeting House");
  expect(row.scrollLeft, "the Presenter target row opened horizontally scrolled").toBe(0);

  const rowBox = row.getBoundingClientRect();
  const targetBox = cards[0]?.getBoundingClientRect();
  if (!targetBox) {
    throw new Error(`${TARGET} has no rendered Build-menu card`);
  }
  expect(targetBox.left).toBeGreaterThanOrEqual(rowBox.left);
  expect(targetBox.right).toBeLessThanOrEqual(rowBox.right);
}

function targetRow(shop: HTMLElement): HTMLElement {
  const row = shop.querySelector<HTMLElement>(`[data-node-id="${TARGET}"]`);
  if (!row) {
    throw new Error(`${TARGET} is absent from the Presenter Build menu`);
  }
  return row;
}

function targetIsPresenterLegible(): boolean {
  const label = document.querySelector<HTMLElement>(`[data-skill-label="${TARGET}"]`);
  const rawBox = label?.dataset.footprintScreenBox;
  if (!rawBox) {
    return false;
  }
  const box = JSON.parse(rawBox) as { readonly left: number; readonly right: number };
  return label.dataset.labelState === "shown" && box.right - box.left >= 70;
}

async function rosterState(): Promise<{ readonly state: string; readonly text: string }> {
  const shop = await openBuildMenu();
  fireEvent.click(within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ }));
  const row = targetRow(shop);
  const result = {
    state: row.dataset.state ?? "",
    text: (row.textContent ?? "").replace(/\s+/g, " ").trim(),
  };
  fireEvent.click(within(shop).getByRole("button", { name: "Close build menu" }));
  return result;
}

async function openTargetCallout(): Promise<HTMLElement> {
  const shop = await openBuildMenu();
  fireEvent.click(within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ }));
  const row = shop.querySelector<HTMLButtonElement>(
    `button.city-plot[data-node-id="${TARGET}"]`,
  );
  if (!row) {
    throw new Error(`${TARGET} has no real Built-shelf row`);
  }
  fireEvent.click(row);
  return waitFor(() => {
    const callout = document.querySelector<HTMLElement>('.building-callout[role="dialog"]');
    expect(callout).not.toBeNull();
    return callout as HTMLElement;
  });
}

async function placeTarget(): Promise<void> {
  const shop = await openBuildMenu();
  const card = shop.querySelector<HTMLElement>(`.build-card[data-node-id="${TARGET}"]`);
  expect(card, `${TARGET} has no real Build-menu card`).not.toBeNull();
  expect(card).toHaveTextContent("Ready to build");
  const action = card?.querySelector<HTMLButtonElement>("button");
  if (!action) {
    throw new Error(`${TARGET} has no Build action`);
  }
  fireEvent.click(action);
  const placement = await screen.findByRole("group", { name: /Placing/ });
  const placementState = placement.querySelector<HTMLElement>(".city-placement");
  if (!placementState) {
    throw new Error("the real placement bar has no validity state");
  }
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    if (placementState.dataset.valid === "true") {
      break;
    }
    fireEvent.keyDown(placement, { key });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  expect(placementState).toHaveAttribute("data-valid", "true");
  fireEvent.click(within(placement).getByRole("button", { name: /Build here/ }));
  await waitFor(
    () =>
      expect(
        document.querySelector(`[data-skill-label="${TARGET}"]`),
        `${TARGET} never appeared after real placement`,
      ).not.toBeNull(),
    { timeout: 30_000 },
  );
}

for (const viewport of VIEWPORTS) {
  test(`Era 2 Presenter visibly builds ${TARGET} through its native loop at ${viewport.name}`, {
    timeout: 180_000,
  }, async () => {
    expect(
      presenterUnbuiltNodeId("neolithic"),
      "the centralized Presenter target must select the reviewed Era 2 model",
    ).toBe(TARGET);

    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(
      null,
      "",
      "/demo?presenter=1&preset=bronze-city&surface=city&era=neolithic",
    );
    render(<App />);
    await screen.findByRole("button", { name: "Build" });
    await waitFor(
      () =>
        expect(
          document.querySelectorAll("[data-skill-label][data-footprint-screen-box]").length,
          "the real Presenter city did not project its placed buildings",
        ).toBeGreaterThanOrEqual(4),
      { timeout: 60_000 },
    );

    expect(document.querySelector(`[data-skill-label="${TARGET}"]`)).toBeNull();
    const initialShop = await openBuildMenu();
    expectTargetFirstWithoutScrolling(initialShop);
    await capture(viewport.name, "00-build-menu-target-first");
    fireEvent.click(within(initialShop).getByRole("button", { name: "Close build menu" }));
    await capture(viewport.name, "01-unbuilt");
    const unbuilt = await rosterState();
    expect(unbuilt.state).toBe("empty");
    expect(unbuilt.text).toMatch(/Not built.*Ready to build/);

    await placeTarget();
    const foundation = await rosterState();
    expect(foundation.state).toBe("not_started");
    expect(foundation.text).toContain("Not started");
    await waitFor(
      () =>
        expect(
          targetIsPresenterLegible(),
          `${TARGET} is not a labelled, audience-scale Presenter target at ${viewport.name}`,
        ).toBe(true),
      { timeout: 15_000 },
    );
    await capture(viewport.name, "02-foundation");

    const lessonCallout = await openTargetCallout();
    fireEvent.click(
      within(lessonCallout).getByRole("button", {
        name: /Start lesson|Review lesson/,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Fraction exponents and radical form" }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Complete lesson" }));
    await waitFor(() => expect(document.querySelector(".world-scene")).toBeNull());
    const lessonReceipt = await screen.findByRole("alertdialog");
    expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
    await dismissCompletionRewards();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const construction = await rosterState();
    expect(construction.state).toBe("practice");
    expect(construction.text).toContain("Under construction");
    await capture(viewport.name, "03-construction");

    const practiceCallout = await openTargetCallout();
    fireEvent.click(
      within(practiceCallout).getByRole("button", {
        name: /Practice set/,
      }),
    );
    const practice = await waitFor(() => {
      const mounted = document.querySelector<HTMLElement>(
        `.lesson-practice[data-node-id="${TARGET}"]`,
      );
      expect(mounted).not.toBeNull();
      return mounted as HTMLElement;
    });
    expect(practice.dataset.templateId).toMatch(/^d2\.rad3\./);
    fireEvent.click(await screen.findByRole("button", { name: "Complete practice" }));
    await waitFor(() => expect(document.querySelector(".lesson-practice")).toBeNull());
    await dismissCompletionRewards();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const complete = await rosterState();
    expect(complete.state).toBe("complete");
    expect(complete.text).toContain("Complete");
    await waitFor(async () => expect(await renderedGoldStarCount(TARGET)).toBe(3), {
      timeout: 15_000,
    });
    await capture(viewport.name, "04-complete-three-stars");
  });
}
