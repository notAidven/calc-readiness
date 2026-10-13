import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { MASTERY_STAR_TOTAL } from "../city/masteryVisuals";
import { resetCityEra } from "../city/useCityEra";
import { DEMO_STORAGE_PREFIX } from "../storage/runtimeStorage";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const PRESENTER_BROWSER_MENU_LIMIT_MS = 500;

function presenterMenuWithinLimit(elapsedMs: number): boolean {
  return (
    Number.isFinite(elapsedMs) &&
    elapsedMs >= 0 &&
    elapsedMs < PRESENTER_BROWSER_MENU_LIMIT_MS
  );
}

function overlaps(a: Box, b: Box, padding = 0): boolean {
  return !(
    a.right + padding <= b.left ||
    b.right + padding <= a.left ||
    a.bottom + padding <= b.top ||
    b.bottom + padding <= a.top
  );
}

function parseBox(raw: string | undefined): Box {
  if (!raw) {
    throw new Error("presenter spatial metric is missing");
  }
  return JSON.parse(raw) as Box;
}

async function capturedViewport(): Promise<{
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly png: string;
}> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the presenter browser test has no viewport frame");
  }
  const frameBox = frame.getBoundingClientRect();
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
      x: frameBox.left + outer.scrollX,
      y: frameBox.top + outer.scrollY,
      width: frameBox.width,
      height: frameBox.height,
      scale: 1,
    },
  });
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the presenter frame did not decode"));
    image.src = `data:image/png;base64,${shot.data}`;
  });
  const sink = document.createElement("canvas");
  sink.width = image.naturalWidth;
  sink.height = image.naturalHeight;
  const context = sink.getContext("2d");
  if (!context) {
    throw new Error("the presenter frame has no 2D sampling context");
  }
  context.drawImage(image, 0, 0);
  return {
    data: context.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
    png: shot.data,
  };
}

async function renderedGoldStarCount(nodeId: string): Promise<number> {
  const label = document.querySelector<HTMLElement>(`[data-skill-label="${nodeId}"]`);
  const band = parseBox(label?.dataset.masteryStarScreenBox);
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

test("presenter Menu timing guard restores the 500ms boundary", () => {
  expect(PRESENTER_BROWSER_MENU_LIMIT_MS).toBe(500);
  expect(presenterMenuWithinLimit(499.9)).toBe(true);
  expect(presenterMenuWithinLimit(500.1)).toBe(false);
});

test("presenter Menu timing guard retains the 2000.1ms release-overrun injection", () => {
  expect(presenterMenuWithinLimit(2_000.1)).toBe(false);
});

test("Presenter Lesson opens LF.1 without replacing a non-Atomic target", {
  timeout: 30_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=city&era=classical",
  );
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  const bar = screen.getByRole("navigation", { name: "Presenter actions" });
  within(bar).getByRole<HTMLButtonElement>("button", { name: "Lesson" }).click();

  expect(
    await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Rise over run")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Complete lesson" })).toBeInTheDocument();
  expect(new URL(window.location.href).searchParams.get("era")).toBe("classical");

  screen.getByRole<HTMLButtonElement>("button", { name: "Complete lesson" }).click();
  await waitFor(
    () => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(document.querySelector(".world-scene")).toBeNull();
    },
    { timeout: 10_000 },
  );
  const lessonReceipt = await screen.findByRole("alertdialog");
  expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
  expect(
    within(lessonReceipt).getByRole("heading", { name: "Lesson complete!" }),
  ).toBeVisible();
  within(lessonReceipt)
    .getByRole<HTMLButtonElement>("button", { name: "Continue" })
    .click();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(within(bar).getByRole("button", { name: "Lesson" })).toBeInTheDocument();
  expect(new URL(window.location.href).searchParams.get("era")).toBe("classical");

  screen.getByRole<HTMLButtonElement>("button", { name: "Menu" }).click();
  expect(
    within(await screen.findByTestId("presenter-era-menu")).getByRole("combobox", {
      name: "Presenter target era",
    }),
  ).toHaveValue("classical");
});

test("Presenter LF.1 practice returns with its receipt and preserves the target city", {
  timeout: 60_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-mastered&surface=city&era=atomic_age",
  );
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  await waitFor(
    () =>
      expect(
        document.querySelector('[data-skill-label="LF.1"][data-mastery-star-screen-box]'),
      ).not.toBeNull(),
    { timeout: 15_000 },
  );
  expect(await renderedGoldStarCount("LF.1")).toBe(MASTERY_STAR_TOTAL);

  const bar = screen.getByRole("navigation", { name: "Presenter actions" });
  within(bar).getByRole<HTMLButtonElement>("button", { name: "Practice" }).click();
  expect(
    await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
  ).toBeInTheDocument();
  const practice = await waitFor(() => {
    const mounted = document.querySelector<HTMLElement>(
      '.lesson-practice[data-node-id="LF.1"]',
    );
    expect(mounted).not.toBeNull();
    return mounted as HTMLElement;
  });
  expect(practice.dataset.templateId).toMatch(/^d7\.lf1\./);
  (
    await screen.findByRole<HTMLButtonElement>("button", {
      name: "Complete practice",
    })
  ).click();

  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector("[data-testid='presenter-lesson-demo']")).toBeNull();
    expect(document.querySelector(".lesson-practice__result")).toBeNull();
  });
  const reward = await screen.findByRole("alertdialog");
  expect(reward).toHaveAttribute("data-context", "Practice complete");
  expect(reward).toHaveTextContent("Practice complete");
  expect(reward).not.toHaveTextContent("Skill building complete");
  const rewardFrame = await capturedViewport();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      "output/design-review/skill-building-completion/presenter-lf1-1024x580.png",
      rewardFrame.png,
      {
        encoding: "base64",
      },
    );
  }
  within(reward).getByRole<HTMLButtonElement>("button", { name: "Continue" }).click();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  await screen.findByRole("button", { name: "Build" });

  await waitFor(
    async () => expect(await renderedGoldStarCount("LF.1")).toBe(MASTERY_STAR_TOTAL),
    {
      timeout: 10_000,
    },
  );

  within(bar).getByRole<HTMLButtonElement>("button", { name: "Lesson" }).click();
  await screen.findByText("Worked example");
  expect(document.querySelector("figure.lesson-visual")).toBeNull();
  screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).click();
  await screen.findByRole("img", { name: /with a run of .* and a rise of/i });
  (
    await screen.findByRole<HTMLButtonElement>("button", {
      name: "Complete lesson",
    })
  ).click();
  await waitFor(
    () => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(document.querySelector(".world-scene")).toBeNull();
    },
    { timeout: 10_000 },
  );
  const lessonReceipt = await screen.findByRole("alertdialog");
  expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
  within(lessonReceipt)
    .getByRole<HTMLButtonElement>("button", { name: "Continue" })
    .click();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  await waitFor(
    async () => expect(await renderedGoldStarCount("LF.1")).toBe(MASTERY_STAR_TOTAL),
    {
      timeout: 10_000,
    },
  );

  within(bar).getByRole<HTMLButtonElement>("button", { name: "Slides" }).click();
  await screen.findByTestId("presenter-deck");
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
  (
    await screen.findByRole<HTMLButtonElement>("button", {
      name: "Enter live demo",
    })
  ).click();
  await waitFor(() => expect(screen.queryByTestId("presenter-deck")).toBeNull());
  await waitFor(
    async () => expect(await renderedGoldStarCount("LF.1")).toBe(MASTERY_STAR_TOTAL),
    {
      timeout: 10_000,
    },
  );
});

test("Presenter LF.1 completion receipt stays clear of the phone bar", {
  timeout: 60_000,
}, async () => {
  await page.viewport(390, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-mastered&surface=city&era=atomic_age",
  );
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  await waitFor(
    () =>
      expect(
        document.querySelector('[data-skill-label="LF.1"][data-mastery-star-screen-box]'),
      ).not.toBeNull(),
    { timeout: 15_000 },
  );
  const bar = screen.getByRole("navigation", { name: "Presenter actions" });
  within(bar).getByRole<HTMLButtonElement>("button", { name: "Practice" }).click();
  const practice = await waitFor(() => {
    const mounted = document.querySelector<HTMLElement>(
      '.lesson-practice[data-node-id="LF.1"]',
    );
    expect(mounted).not.toBeNull();
    return mounted as HTMLElement;
  });
  expect(practice.dataset.templateId).toMatch(/^d7\.lf1\./);
  (
    await screen.findByRole<HTMLButtonElement>("button", {
      name: "Complete practice",
    })
  ).click();
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector("[data-testid='presenter-lesson-demo']")).toBeNull();
    expect(document.querySelector(".lesson-practice__result")).toBeNull();
  });
  const reward = await screen.findByRole("alertdialog");
  expect(reward).toHaveAttribute("data-context", "Practice complete");
  expect(reward).toHaveTextContent("Practice complete");
  expect(reward).not.toHaveTextContent("Skill building complete");
  const rewardBox = reward.getBoundingClientRect();
  const barBox = bar.getBoundingClientRect();
  expect(rewardBox.top).toBeGreaterThanOrEqual(0);
  expect(rewardBox.bottom).toBeLessThanOrEqual(barBox.top);
  expect(overlaps(rewardBox, barBox)).toBe(false);
  const frame = await capturedViewport();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      "output/design-review/skill-building-completion/presenter-lf1-390x580.png",
      frame.png,
      { encoding: "base64" },
    );
  }
  within(reward).getByRole<HTMLButtonElement>("button", { name: "Continue" }).click();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  await screen.findByRole("button", { name: "Build" });
  await waitFor(
    async () => expect(await renderedGoldStarCount("LF.1")).toBe(MASTERY_STAR_TOTAL),
    {
      timeout: 10_000,
    },
  );
});

test("public demo practice stays local even beside a fully configured account backend", {
  timeout: 60_000,
}, async () => {
  await page.viewport(1024, 580);
  // The exact deployment adjacency this guard owes: the public demo and account app ship
  // from one artifact. A demo smoke with empty account env proves only that no endpoint
  // existed to call; these values make a mastery request possible and `/demo` must still
  // make it impossible.
  vi.stubEnv("VITE_ACCOUNT_APP_ENABLED", "true");
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test/api/diagnostic");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_demo");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "demo-client");
  vi.stubEnv("VITE_AWS_REGION", "us-east-1");
  const fetchSpy = vi.spyOn(window, "fetch");
  localStorage.setItem(`${DEMO_STORAGE_PREFIX}round-trip`, "ordinary-demo-state");
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=city",
  );
  let beforeUnload = 0;
  window.addEventListener("beforeunload", () => {
    beforeUnload += 1;
  });
  render(<App />);

  await screen.findByRole("button", { name: "Build" });
  await waitFor(
    () => expect(document.querySelector(".city-canvas canvas")).not.toBeNull(),
    { timeout: 15_000 },
  );
  const city = document.querySelector(".city-surface");
  let canvas = document.querySelector(".city-canvas canvas");
  expect(city).not.toBeNull();
  expect(canvas).not.toBeNull();
  const cityWorld = city?.closest<HTMLElement>(".city-shell__world") ?? null;
  expect(cityWorld).not.toBeNull();
  await waitFor(
    () =>
      expect(
        document.querySelectorAll("[data-skill-label][data-footprint-screen-box]").length,
      ).toBeGreaterThanOrEqual(5),
    { timeout: 15_000 },
  );
  const metrics = [
    ...document.querySelectorAll<HTMLElement>(
      "[data-skill-label][data-footprint-screen-box]",
    ),
  ];
  const footprintBoxes = metrics.map((element) => ({
    nodeId: element.dataset.skillLabel ?? "",
    box: parseBox(element.dataset.footprintScreenBox),
  }));
  for (let first = 0; first < footprintBoxes.length; first += 1) {
    for (let second = first + 1; second < footprintBoxes.length; second += 1) {
      const a = footprintBoxes[first];
      const b = footprintBoxes[second];
      if (a && b) {
        expect(overlaps(a.box, b.box), `${a.nodeId} footprint overlaps ${b.nodeId}`).toBe(
          false,
        );
      }
    }
  }
  const shownLabels = metrics.filter((element) => element.dataset.labelState === "shown");
  for (let first = 0; first < shownLabels.length; first += 1) {
    for (let second = first + 1; second < shownLabels.length; second += 1) {
      const a = shownLabels[first];
      const b = shownLabels[second];
      if (a && b) {
        expect(
          overlaps(a.getBoundingClientRect(), b.getBoundingClientRect(), 4),
          `${a.dataset.skillLabel} label overlaps ${b.dataset.skillLabel}`,
        ).toBe(false);
      }
    }
  }
  for (const label of shownLabels) {
    if (label.dataset.masteryStarScreenBox) {
      expect(
        overlaps(
          label.getBoundingClientRect(),
          parseBox(label.dataset.masteryStarScreenBox),
          2,
        ),
        `${label.dataset.skillLabel} label overlaps its mastery stars`,
      ).toBe(false);
    }
  }
  const starBoxes = metrics
    .filter((element) => element.dataset.masteryStarScreenBox)
    .map((element) => ({
      nodeId: element.dataset.skillLabel ?? "",
      box: parseBox(element.dataset.masteryStarScreenBox),
    }));
  for (let first = 0; first < starBoxes.length; first += 1) {
    for (let second = first + 1; second < starBoxes.length; second += 1) {
      const a = starBoxes[first];
      const b = starBoxes[second];
      if (a && b) {
        expect(
          overlaps(a.box, b.box, 2),
          `${a.nodeId} mastery stars overlap ${b.nodeId}`,
        ).toBe(false);
      }
    }
  }

  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Presenter target era" })).toBeNull();
  expect(screen.getByTestId("presenter-bottom-bar")).toBeVisible();

  const openPresenterMenu = async () => {
    const menuButton = screen.getByRole<HTMLButtonElement>("button", { name: "Menu" });
    if (menuButton.getAttribute("aria-expanded") !== "true") {
      menuButton.click();
    }
    return screen.findByTestId("presenter-era-menu");
  };
  const menuStarted = performance.now();
  let presenterMenu = await openPresenterMenu();
  const menuMs = performance.now() - menuStarted;
  expect(
    presenterMenuWithinLimit(menuMs),
    `presenter Menu took ${menuMs.toFixed(1)}ms`,
  ).toBe(true);
  const controls = within(presenterMenu).getAllByRole("button");
  expect(controls).toHaveLength(2);
  for (const control of controls) {
    const box = control.getBoundingClientRect();
    expect(box.width, `${control.textContent} width`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${control.textContent} height`).toBeGreaterThanOrEqual(44);
  }
  const eraSelect = within(presenterMenu).getByRole<HTMLSelectElement>("combobox", {
    name: "Presenter target era",
  });
  eraSelect.value = "classical";
  eraSelect.dispatchEvent(new Event("change", { bubbles: true }));
  within(presenterMenu)
    .getByRole<HTMLButtonElement>("button", { name: "Unlock & build era" })
    .click();
  await waitFor(() =>
    expect(new URL(window.location.href).searchParams.get("era")).toBe("classical"),
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  document.querySelector<HTMLButtonElement>(".completion-reward-continue")?.click();
  await waitFor(() => {
    expect(screen.getByTestId("presenter-era-menu")).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
  await waitFor(
    () => expect(document.querySelector('[data-skill-label="POL.1"]')).not.toBeNull(),
    { timeout: 15_000 },
  );
  canvas = document.querySelector(".city-canvas canvas");
  expect(canvas).not.toBeNull();
  expect(screen.getByTestId("presenter-era-menu")).not.toBeVisible();
  expect(
    document.querySelector(".city-surface") === city,
    "era switch remounted city",
  ).toBe(true);

  const lessonStarted = performance.now();
  within(screen.getByRole("navigation", { name: "Presenter actions" }))
    .getByRole<HTMLButtonElement>("button", { name: "Lesson" })
    .click();
  await screen.findByRole("navigation", { name: "Presenter actions" });
  await waitFor(
    () =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", {
          name: "Complete lesson",
        }),
      ).toBeVisible(),
    { timeout: 10_000 },
  );
  const lessonFastForward = screen.getByRole<HTMLButtonElement>("button", {
    name: "Complete lesson",
  });
  expect(
    await screen.findByRole("heading", { name: "Slope as a constant rate of change" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Rise over run")).toBeInTheDocument();
  const lessonMs = performance.now() - lessonStarted;
  expect(Number.isFinite(lessonMs)).toBe(true);
  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  expect(lessonFastForward).toBeVisible();
  const lessonCompleteBox = lessonFastForward.getBoundingClientRect();
  expect(lessonCompleteBox.width).toBeGreaterThanOrEqual(44);
  expect(lessonCompleteBox.height).toBeGreaterThanOrEqual(44);
  expect(lessonCompleteBox.right).toBeLessThanOrEqual(1024);
  expect(lessonCompleteBox.bottom).toBeLessThanOrEqual(580);
  expect(cityWorld?.inert, "the presenter lesson left the island interactive").toBe(true);
  expect(
    getComputedStyle(cityWorld as HTMLElement).display,
    "the presenter lesson left the island visible underneath",
  ).toBe("none");
  expect(document.querySelector(".world-scene")?.getBoundingClientRect()).toMatchObject({
    left: 0,
    top: 0,
    width: 1024,
    height: 580,
  });
  expect(
    document.querySelector(".world-scene .coc-card")?.getBoundingClientRect(),
  ).toMatchObject({
    left: 0,
    top: 0,
    width: 1024,
    height: 580,
  });
  expect(document.querySelector(".city-surface") === city, "lesson remounted city").toBe(
    true,
  );
  expect(
    document.querySelector(".city-canvas canvas") === canvas,
    "lesson remounted canvas",
  ).toBe(true);

  const lessonCompleteStarted = performance.now();
  lessonFastForward.click();
  await waitFor(
    () => {
      expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
      expect(document.querySelector(".world-scene")).toBeNull();
    },
    { timeout: 10_000 },
  );
  const lessonReceipt = await screen.findByRole("alertdialog");
  expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
  within(lessonReceipt)
    .getByRole<HTMLButtonElement>("button", { name: "Continue" })
    .click();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(
    within(screen.getByRole("navigation", { name: "Presenter actions" })).getByRole(
      "button",
      { name: "Lesson" },
    ),
  ).toBeVisible();
  expect(new URL(window.location.href).searchParams.get("era")).toBe("classical");
  expect(cityWorld?.inert).toBe(false);
  expect(getComputedStyle(cityWorld as HTMLElement).display).not.toBe("none");
  const lessonCompleteMs = performance.now() - lessonCompleteStarted;
  expect(Number.isFinite(lessonCompleteMs)).toBe(true);
  expect(
    document.querySelector(".city-surface") === city,
    "lesson completion remounted city",
  ).toBe(true);
  expect(
    document.querySelector(".city-canvas canvas") === canvas,
    "lesson completion remounted canvas",
  ).toBe(true);

  expect(
    document.querySelector(".city-surface") === city,
    "city-state action remounted city",
  ).toBe(true);
  expect(
    document.querySelector(".city-canvas canvas") === canvas,
    "city-state action remounted canvas",
  ).toBe(true);

  await screen.findByRole("button", { name: "Build" });
  within(screen.getByRole("navigation", { name: "Presenter actions" }))
    .getByRole<HTMLButtonElement>("button", { name: "Practice" })
    .click();
  await screen.findByRole("navigation", { name: "Presenter actions" });
  await waitFor(
    () =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", {
          name: "Complete practice",
        }),
      ).toBeVisible(),
    { timeout: 10_000 },
  );
  const practiceComplete = screen.getByRole<HTMLButtonElement>("button", {
    name: "Complete practice",
  });
  expect(practiceComplete).toBeVisible();
  const practiceCompleteBox = practiceComplete.getBoundingClientRect();
  expect(practiceCompleteBox.width).toBeGreaterThanOrEqual(44);
  expect(practiceCompleteBox.height).toBeGreaterThanOrEqual(44);
  expect(practiceCompleteBox.right).toBeLessThanOrEqual(1024);
  expect(practiceCompleteBox.bottom).toBeLessThanOrEqual(580);
  practiceComplete.click();
  await waitFor(() => {
    expect(new URL(window.location.href).searchParams.get("surface")).toBe("city");
    expect(document.querySelector("[data-testid='presenter-lesson-demo']")).toBeNull();
    expect(document.querySelector(".lesson-practice__result")).toBeNull();
  });
  const practiceReward = await screen.findByRole("alertdialog");
  within(practiceReward)
    .getByRole<HTMLButtonElement>("button", { name: "Continue" })
    .click();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  await screen.findByRole("button", { name: "Build" });

  const shell = document.querySelector(".city-shell");
  const politeState = screen.getByTestId("city-live-polite").textContent;
  const placementNodeIds = [...document.querySelectorAll<HTMLElement>("[data-skill-label]")]
    .map((element) => element.dataset.skillLabel)
    .sort();
  expect(shell).not.toBeNull();
  expect(placementNodeIds.length).toBeGreaterThanOrEqual(5);

  within(screen.getByRole("navigation", { name: "Presenter actions" }))
    .getByRole<HTMLButtonElement>("button", { name: "Slides" })
    .click();
  const deck = await screen.findByTestId("presenter-deck");
  expect(deck).toHaveFocus();
  expect(document.querySelector(".city-shell") === shell, "slides unmounted the app").toBe(
    true,
  );
  expect(
    document.querySelector(".city-surface") === city,
    "slides unmounted the city",
  ).toBe(true);
  expect(
    document.querySelector(".city-canvas canvas") === canvas,
    "slides replaced the canvas",
  ).toBe(true);
  expect(city?.closest("[inert]"), "the covered live app stays interactive").not.toBeNull();
  expect(
    city?.closest('[aria-hidden="true"]'),
    "the covered live app stays in the accessibility tree",
  ).not.toBeNull();

  window.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
  (
    await screen.findByRole<HTMLButtonElement>("button", {
      name: "Enter live demo",
    })
  ).click();
  await waitFor(() => expect(screen.queryByTestId("presenter-deck")).toBeNull());

  expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
  expect(
    document.querySelector(".city-shell") === shell,
    "deck exit remounted the app",
  ).toBe(true);
  expect(
    document.querySelector(".city-surface") === city,
    "deck exit remounted the city",
  ).toBe(true);
  expect(
    document.querySelector(".city-canvas canvas") === canvas,
    "deck exit replaced the canvas",
  ).toBe(true);
  presenterMenu = await openPresenterMenu();
  expect(
    within(presenterMenu).getByRole("combobox", { name: "Presenter target era" }),
  ).toHaveValue("classical");
  screen.getByRole<HTMLButtonElement>("button", { name: "Menu" }).click();
  expect(screen.getByTestId("city-live-polite").textContent).toBe(politeState);
  expect(
    [...document.querySelectorAll<HTMLElement>("[data-skill-label]")]
      .map((element) => element.dataset.skillLabel)
      .sort(),
  ).toEqual(placementNodeIds);
  expect(localStorage.getItem(`${DEMO_STORAGE_PREFIX}round-trip`)).toBe(
    "ordinary-demo-state",
  );
  const backendCalls = fetchSpy.mock.calls
    .map(([input]) =>
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    )
    .filter((url) => new URL(url, window.location.href).pathname.startsWith("/api/"));
  expect(backendCalls).toEqual([]);
  expect(beforeUnload).toBe(0);
  console.info(
    `presenter timings: menu=${menuMs.toFixed(1)}ms lesson=${lessonMs.toFixed(
      1,
    )}ms complete-lesson=${lessonCompleteMs.toFixed(1)}ms`,
  );
});

test("presenter Build opens the real skill-building catalogue in one click", {
  timeout: 30_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=economy-city&surface=city&era=prehistoric",
  );
  render(<App />);

  expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
  (await screen.findByRole<HTMLButtonElement>("button", { name: "Build" })).click();
  const shop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  expect(document.querySelector(".presenter-instrument")).toBeNull();
  const categories = within(shop).getByRole("tablist", { name: "Build categories" });
  expect(within(categories).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(within(categories).getByRole("tab", { name: "Civic" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
  const catalogue = within(shop).getByRole("list", {
    name: /skill buildings to place/i,
  });
  const cards = catalogue.querySelectorAll<HTMLButtonElement>("button.build-card-cta");
  expect(cards.length).toBeGreaterThanOrEqual(5);
  expect(cards[0]?.closest(".build-card")).toHaveAttribute("data-node-id");
});

test("ordinary demo Build still opens on Lessons", {
  timeout: 30_000,
}, async () => {
  await page.viewport(390, 580);
  window.history.replaceState(null, "", "/demo");
  render(<App />);

  screen.getByRole<HTMLButtonElement>("button", { name: "Start at Era 1" }).click();
  (await screen.findByRole<HTMLButtonElement>("button", { name: "Build" })).click();
  const shop = await screen.findByRole("dialog", {
    name: "Choose a skill to build",
  });
  const categories = within(shop).getByRole("tablist", { name: "Build categories" });
  expect(within(categories).getByRole("tab", { name: "Lessons" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(within(categories).getByRole("tab", { name: "Civic" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
});
