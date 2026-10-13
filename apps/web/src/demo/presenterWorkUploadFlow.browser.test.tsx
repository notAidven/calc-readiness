import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const ROUTE = "/demo?presenter=1&preset=progress-construction&surface=city&era=bronze_age";

function browserSession() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  };
}

interface QuestionMeasurement {
  readonly equationRows: number;
  readonly leftOverflow: number;
  readonly questionContentWidth: number;
  readonly questionWidth: number;
  readonly rightOverflow: number;
  readonly uploadOverlapArea: number;
  readonly widestTermWidth: number;
}

interface AccessibilityNode {
  readonly childIds?: readonly string[];
  readonly description?: { readonly value?: unknown };
  readonly name?: { readonly value?: unknown };
  readonly nodeId: string;
  readonly role?: { readonly value?: unknown };
  readonly value?: { readonly value?: unknown };
}

interface BrowserFrameTree {
  readonly childFrames?: readonly BrowserFrameTree[];
  readonly frame: {
    readonly id: string;
    readonly url: string;
  };
}

const BANNED_DISCLOSURE_COPY =
  /\b(?:demo|fixture|mock|staged?|hard[- ]?coded|pre[- ]?seeded|prepared|fixed|known|local)\b|never uploaded|stays? in (?:this )?browser/i;

async function demoPhoto(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 420;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("the browser supplied no canvas context");
  }
  context.fillStyle = "#fffdf5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#10243a";
  context.font = "36px sans-serif";
  context.fillText("P = 2l + 2w", 54, 105);
  context.fillText("P - 2l = 2w", 54, 180);
  context.fillText("P - l = w", 54, 255);
  context.fillText("58 - 18 = w = 40", 54, 330);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) {
    throw new Error("the browser could not encode the controlled demo photo");
  }
  return new File([blob], "solution-photo.jpg", { type: "image/jpeg" });
}

function choose(input: HTMLInputElement, file: File): void {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function backendCalls(fetchSpy: {
  readonly mock: { readonly calls: readonly (readonly unknown[])[] };
}): unknown[] {
  return fetchSpy.mock.calls.filter((call) =>
    /\/api\/|work-upload|cognito|bedrock/i.test(String(call[0])),
  );
}

function expectInsideViewport(
  element: Element,
  viewport: { readonly width: number; readonly height: number },
  label: string,
): void {
  const box = element.getBoundingClientRect();
  expect(box.left, `${label} clips left`).toBeGreaterThanOrEqual(0);
  expect(box.top, `${label} clips above`).toBeGreaterThanOrEqual(0);
  expect(box.right, `${label} clips right`).toBeLessThanOrEqual(viewport.width);
  expect(box.bottom, `${label} clips below`).toBeLessThanOrEqual(viewport.height);
}

function expectQuestionInsidePanel(
  upload: HTMLElement,
  dropzone: HTMLElement,
  viewportName: string,
): QuestionMeasurement {
  const question = upload.querySelector<HTMLElement>(".presenter-work-photo__question");
  expect(question, `${viewportName} has no question-context panel`).not.toBeNull();
  const equations = [
    ...(question as HTMLElement).querySelectorAll<HTMLElement>(".katex-html"),
  ];
  expect(
    equations.length,
    `${viewportName} does not render all three question terms`,
  ).toBeGreaterThanOrEqual(3);

  const questionBox = (question as HTMLElement).getBoundingClientRect();
  const questionStyle = getComputedStyle(question as HTMLElement);
  const contentLeft =
    questionBox.left +
    Number.parseFloat(questionStyle.borderLeftWidth) +
    Number.parseFloat(questionStyle.paddingLeft);
  const contentRight =
    questionBox.right -
    Number.parseFloat(questionStyle.borderRightWidth) -
    Number.parseFloat(questionStyle.paddingRight);
  const equationBoxes = equations.map((equation) => equation.getBoundingClientRect());
  const dropzoneBox = dropzone.getBoundingClientRect();
  const uploadOverlapAreas = equationBoxes.map((box) => {
    const width = Math.max(
      0,
      Math.min(box.right, dropzoneBox.right) - Math.max(box.left, dropzoneBox.left),
    );
    const height = Math.max(
      0,
      Math.min(box.bottom, dropzoneBox.bottom) - Math.max(box.top, dropzoneBox.top),
    );
    return width * height;
  });
  const overflow = {
    left: Math.max(...equationBoxes.map((box) => Math.max(0, contentLeft - box.left))),
    right: Math.max(...equationBoxes.map((box) => Math.max(0, box.right - contentRight))),
    uploadOverlapArea: Math.max(...uploadOverlapAreas),
  };
  const measurement = {
    questionWidth: questionBox.width,
    questionContentWidth: contentRight - contentLeft,
    equationRows: new Set(equationBoxes.map((box) => Math.round(box.top))).size,
    widestTermWidth: Math.max(...equationBoxes.map((box) => box.width)),
    leftOverflow: overflow.left,
    rightOverflow: overflow.right,
    uploadOverlapArea: overflow.uploadOverlapArea,
  } satisfies QuestionMeasurement;
  console.info(`[presenter-work ${viewportName}]`, measurement);

  expect(
    overflow.left,
    `${viewportName} equation exceeds the question panel on the left`,
  ).toBeLessThanOrEqual(0.5);
  expect(
    overflow.right,
    `${viewportName} equation exceeds the question panel on the right`,
  ).toBeLessThanOrEqual(0.5);
  expect(
    overflow.uploadOverlapArea,
    `${viewportName} question equation overlaps the upload region`,
  ).toBeLessThanOrEqual(0.5);
  expect(
    (question as HTMLElement).scrollWidth,
    `${viewportName} question panel has horizontal overflow`,
  ).toBeLessThanOrEqual((question as HTMLElement).clientWidth);
  return measurement;
}

function expectNoHorizontalPageOverflow(viewportName: string): number {
  const pageWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  );
  expect(pageWidth, `${viewportName} page has horizontal overflow`).toBeLessThanOrEqual(
    window.innerWidth,
  );
  return pageWidth;
}

function expectTouchTargets(
  container: HTMLElement,
  viewportName: string,
): { readonly count: number; readonly minHeight: number; readonly minWidth: number } {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")].filter(
    (button) => button.getClientRects().length > 0,
  );
  expect(buttons.length, `${viewportName} fixture has no touch target`).toBeGreaterThan(0);
  for (const button of buttons) {
    const box = button.getBoundingClientRect();
    expect(
      box.width,
      `${viewportName} ${button.textContent?.trim()} target is too narrow`,
    ).toBeGreaterThanOrEqual(44);
    expect(
      box.height,
      `${viewportName} ${button.textContent?.trim()} target is too short`,
    ).toBeGreaterThanOrEqual(44);
  }
  return {
    count: buttons.length,
    minHeight: Math.min(...buttons.map((button) => button.getBoundingClientRect().height)),
    minWidth: Math.min(...buttons.map((button) => button.getBoundingClientRect().width)),
  };
}

function measuredBox(element: HTMLElement): {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
} {
  const box = element.getBoundingClientRect();
  return {
    left: box.left,
    top: box.top,
    right: box.right,
    bottom: box.bottom,
    width: box.width,
    height: box.height,
  };
}

async function keepViewportScreenshot(filename: string): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter browser test has no viewport frame");
  }
  const frameBox = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  const shot = (await browserSession().send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: frameBox.left + outer.scrollX,
      y: frameBox.top + outer.scrollY,
      width: frameBox.width,
      height: frameBox.height,
      scale: 1,
    },
  })) as { readonly data: string };
  expect(shot.data, `Chromium returned no pixels for ${filename}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/presenter-work-browser/${filename}`, shot.data, {
      encoding: "base64",
    });
  }
}

async function settleFixtureTypography(): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function frameIdForUrl(tree: BrowserFrameTree, url: string): string | null {
  if (tree.frame.url === url) {
    return tree.frame.id;
  }
  for (const child of tree.childFrames ?? []) {
    const match = frameIdForUrl(child, url);
    if (match) {
      return match;
    }
  }
  return null;
}

async function presenterAccessibilityOutput(): Promise<string> {
  const { frameTree } = (await browserSession().send("Page.getFrameTree")) as {
    readonly frameTree: BrowserFrameTree;
  };
  const frameId = frameIdForUrl(frameTree, window.location.href);
  expect(frameId, `the browser frame tree has no ${window.location.href}`).not.toBeNull();
  const { nodes } = (await browserSession().send("Accessibility.getFullAXTree", {
    frameId,
  })) as {
    readonly nodes: readonly AccessibilityNode[];
  };
  const surface = nodes.find(
    (node) => node.role?.value === "dialog" && node.name?.value === "Photo work feedback",
  );
  expect(
    surface,
    "the Presenter work dialog is absent from the accessibility tree",
  ).toBeDefined();

  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const pending = [surface as AccessibilityNode];
  const output: string[] = [];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const node = pending.pop();
    if (!node || visited.has(node.nodeId)) {
      continue;
    }
    visited.add(node.nodeId);
    for (const property of [node.name, node.description, node.value]) {
      if (typeof property?.value === "string") {
        output.push(property.value);
      }
    }
    for (const childId of node.childIds ?? []) {
      const child = byId.get(childId);
      if (child) {
        pending.push(child);
      }
    }
  }
  return output.join("\n");
}

async function expectNeutralPresenterCopy(state: string): Promise<void> {
  const surface = document.querySelector<HTMLElement>(".presenter-work-shell");
  expect(surface, `${state} has no rendered Presenter work surface`).not.toBeNull();
  expect(
    surface?.innerText ?? "",
    `${state} exposes staged-fixture language in visible text`,
  ).not.toMatch(BANNED_DISCLOSURE_COPY);
  expect(
    await presenterAccessibilityOutput(),
    `${state} exposes staged-fixture language in accessibility output`,
  ).not.toMatch(BANNED_DISCLOSURE_COPY);
}

afterEach(async () => {
  await browserSession().send("Emulation.setEmulatedMedia", { features: [] });
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

test("rendered Presenter upload, analysis, and result disclose no staged fixture language", {
  timeout: 15_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=work&era=bronze_age",
  );
  render(<App />);

  await screen.findByTestId("presenter-work-upload");
  await expectNeutralPresenterCopy("upload");
  expect(screen.getByText("Upload your work")).toBeVisible();
  expect(screen.getByText("Add a clear photo of your solution")).toBeVisible();
  const dropzone = screen.getByRole("button", { name: /Choose or drop a photo/ });
  expect(dropzone).toHaveTextContent("JPEG, PNG, HEIC, or WebP · max 10 MB");
  expect(dropzone).toHaveAccessibleName(
    /Choose or drop a photo JPEG, PNG, HEIC, or WebP · max 10 MB/,
  );

  const input = screen.getByLabelText("Choose a photo of your work") as HTMLInputElement;
  choose(input, new File(["photo"], "solution-photo.jpg", { type: "image/jpeg" }));
  expect(await screen.findByRole("status", { name: "Checking your work" })).toBeVisible();
  await expectNeutralPresenterCopy("analysis");

  expect(
    await screen.findByTestId("presenter-work-result", {}, { timeout: 4_000 }),
  ).toBeVisible();
  await expectNeutralPresenterCopy("result");
  expect(screen.getByRole("heading", { name: "The first broken move" })).toBeVisible();
  expect(
    screen.getByText("This feedback does not change your score or progress."),
  ).toBeVisible();
  expect(screen.queryByTestId("presenter-work-upload")).toBeNull();
});

test("the bottom-bar AI work action stages a local photo for two seconds before the fixed result", {
  timeout: 30_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(null, "", ROUTE);
  const fetchSpy = vi.spyOn(window, "fetch");
  render(<App />);

  const bar = await screen.findByTestId("presenter-bottom-bar");
  expect(
    [...bar.querySelectorAll("button")].map((button) => button.textContent?.trim()),
  ).toEqual(["Slides", "Lesson", "Practice", "Review", "AI work", "Bay"]);
  fireEvent.click(screen.getByRole("button", { name: "AI work" }));

  const input = await screen.findByLabelText("Choose a photo of your work");
  expect(input).toHaveAttribute("type", "file");
  expect(input).toHaveAttribute("accept", "image/*");
  expect(screen.queryByRole("button", { name: "Show fixed AI reading" })).toBeNull();
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();

  const photo = await demoPhoto();
  const started = performance.now();
  choose(input as HTMLInputElement, photo);
  expect(await screen.findByRole("status", { name: "Checking your work" })).toBeVisible();
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();

  await new Promise((resolve) => setTimeout(resolve, 1_700));
  expect(
    screen.queryByTestId("presenter-work-result"),
    "the deterministic result appeared before the two-second stage completed",
  ).toBeNull();
  const result = await screen.findByTestId("presenter-work-result", {}, { timeout: 1_000 });
  const elapsed = performance.now() - started;
  expect(elapsed, "the staged result arrived before two seconds").toBeGreaterThanOrEqual(
    1_950,
  );
  expect(
    elapsed,
    "the staged result took materially longer than a loaded browser can explain",
  ).toBeLessThan(4_500);
  expect(result).toHaveTextContent("First incorrect line");
  expect(backendCalls(fetchSpy)).toEqual([]);
});

test("the mock picker rejects non-images and oversize images without starting analysis", async () => {
  await page.viewport(390, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=work&era=bronze_age",
  );
  const fetchSpy = vi.spyOn(window, "fetch");
  render(<App />);
  const input = (await screen.findByLabelText(
    "Choose a photo of your work",
  )) as HTMLInputElement;

  choose(input, new File(["not an image"], "notes.txt", { type: "text/plain" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/choose an image/i);
  expect(screen.queryByRole("status", { name: "Checking your work" })).toBeNull();
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));
  choose(
    input,
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], "too-large.jpg", {
      type: "image/jpeg",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
  expect(screen.queryByRole("status", { name: "Checking your work" })).toBeNull();
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();
  expect(backendCalls(fetchSpy)).toEqual([]);
});

test("reset cancels an in-flight local analysis and revokes the selected preview", async () => {
  await page.viewport(1024, 580);
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=work&era=bronze_age",
  );
  render(<App />);
  await screen.findByLabelText("Choose a photo of your work");
  const transfer = new DataTransfer();
  transfer.items.add(await demoPhoto());
  screen.getByRole("button", { name: /Choose or drop a photo/ }).dispatchEvent(
    new DragEvent("drop", {
      bubbles: true,
      dataTransfer: transfer,
    }),
  );
  await screen.findByRole("status", { name: "Checking your work" });

  fireEvent.click(screen.getByRole("button", { name: "Choose a different photo" }));
  expect(screen.queryByRole("status", { name: "Checking your work" })).toBeNull();
  expect(screen.getByLabelText("Choose a photo of your work")).toBeVisible();
  await vi.waitFor(() => expect(revoke).toHaveBeenCalledTimes(1));
  await new Promise((resolve) => setTimeout(resolve, 2_100));
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();
});

test("reduced motion removes the decorative fill but preserves the two-second stage", {
  timeout: 15_000,
}, async () => {
  await page.viewport(1024, 580);
  await browserSession().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-construction&surface=work&era=bronze_age",
  );
  render(<App />);
  const input = (await screen.findByLabelText(
    "Choose a photo of your work",
  )) as HTMLInputElement;
  const photo = await demoPhoto();
  const started = performance.now();
  choose(input, photo);
  await screen.findByRole("status", { name: "Checking your work" });
  const progress = document.querySelector<HTMLElement>(
    ".presenter-work-analyzing__progress span",
  );
  expect(progress).not.toBeNull();
  expect(progress ? getComputedStyle(progress).animationName : "").toBe("none");

  await new Promise((resolve) => setTimeout(resolve, 1_700));
  expect(screen.queryByTestId("presenter-work-result")).toBeNull();
  await screen.findByTestId("presenter-work-result", {}, { timeout: 5_000 });
  expect(performance.now() - started).toBeGreaterThanOrEqual(1_950);
});

for (const viewport of [
  { width: 1920, height: 1080, name: "1920x1080" },
  { width: 1440, height: 900, name: "1440x900" },
  { width: 1024, height: 580, name: "1024x580" },
  { width: 390, height: 580, name: "390x580" },
] as const) {
  test(`the full bottom-bar upload flow fits ${viewport.name}`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(null, "", ROUTE);
    const fetchSpy = vi.spyOn(window, "fetch");
    render(<App />);
    const bar = await screen.findByTestId("presenter-bottom-bar");
    fireEvent.click(withinBar(bar, "AI work"));

    const upload = await screen.findByTestId("presenter-work-upload");
    await settleFixtureTypography();
    expect(bar).toBeVisible();
    expectInsideViewport(upload, viewport, `${viewport.name} upload`);
    expect(upload.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar.getBoundingClientRect().top,
    );
    const uploadBox = measuredBox(upload);
    const questionMeasurement = expectQuestionInsidePanel(
      upload,
      upload.querySelector<HTMLElement>(".presenter-work-upload__dropzone") as HTMLElement,
      viewport.name,
    );
    const uploadTouchTargets = expectTouchTargets(upload, `${viewport.name} upload`);
    const uploadPageWidth = expectNoHorizontalPageOverflow(`${viewport.name} upload`);
    await keepViewportScreenshot(`upload-${viewport.name}.png`);

    const input = screen.getByLabelText("Choose a photo of your work") as HTMLInputElement;
    choose(input, await demoPhoto());
    const analyzing = await screen.findByRole("status", { name: "Checking your work" });
    await settleFixtureTypography();
    expect(bar).toBeVisible();
    expectInsideViewport(analyzing, viewport, `${viewport.name} analysis`);
    expect(analyzing.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar.getBoundingClientRect().top,
    );
    const analysisBox = measuredBox(analyzing);
    const analysisTouchTargets = expectTouchTargets(analyzing, `${viewport.name} analysis`);
    const analysisPageWidth = expectNoHorizontalPageOverflow(`${viewport.name} analysis`);
    await keepViewportScreenshot(`analyzing-${viewport.name}.png`);

    const result = await screen.findByTestId(
      "presenter-work-result",
      {},
      { timeout: 4_000 },
    );
    await settleFixtureTypography();
    expect(bar).toBeVisible();
    expectInsideViewport(result, viewport, `${viewport.name} result`);
    expect(result.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar.getBoundingClientRect().top,
    );
    const resultBox = measuredBox(result);
    const resultTouchTargets = expectTouchTargets(result, `${viewport.name} result`);
    const resultPageWidth = expectNoHorizontalPageOverflow(`${viewport.name} result`);
    await keepViewportScreenshot(`result-${viewport.name}.png`);
    if (CAPTURE_EVIDENCE) {
      await commands.writeFile(
        `.qa-frames/presenter-work-browser/measurements-${viewport.name}.json`,
        `${JSON.stringify(
          {
            viewport,
            question: questionMeasurement,
            upload: {
              box: uploadBox,
              pageWidth: uploadPageWidth,
              touchTargets: uploadTouchTargets,
            },
            analysis: {
              box: analysisBox,
              pageWidth: analysisPageWidth,
              touchTargets: analysisTouchTargets,
            },
            result: {
              box: resultBox,
              pageWidth: resultPageWidth,
              touchTargets: resultTouchTargets,
            },
          },
          null,
          2,
        )}\n`,
      );
    }
    expect(backendCalls(fetchSpy), `${viewport.name} called a backend`).toEqual([]);
  });
}

function withinBar(bar: HTMLElement, name: string): HTMLButtonElement {
  const button = [...bar.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) {
    throw new Error(`Presenter bottom bar has no ${name} button`);
  }
  return button;
}
