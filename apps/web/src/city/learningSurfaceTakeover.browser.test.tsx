import { cleanup, render, screen, waitFor as testingWaitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { d1LessonHost } from "./d1LessonHost";
import { resetCityEra, setCityEraForPreview } from "./useCityEra";
import { presenterFixtureFor } from "../demo/presenterFixtures";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEWPORTS = [
  { name: "short-laptop", width: 1024, height: 580 },
  { name: "short-phone", width: 390, height: 580 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

function rect(selector: string): DOMRect {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`nothing matched ${selector}`);
  }
  return element.getBoundingClientRect();
}

function expectViewportRect(box: DOMRect, width: number, height: number, label: string) {
  expect.soft(box.left, `${label} left edge`).toBeCloseTo(0, 0);
  expect.soft(box.top, `${label} top edge`).toBeCloseTo(0, 0);
  expect.soft(box.width, `${label} width`).toBeCloseTo(width, 0);
  expect.soft(box.height, `${label} height`).toBeCloseTo(height, 0);
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right <= b.left ||
    b.right <= a.left ||
    a.bottom <= b.top ||
    b.bottom <= a.top
  );
}

function visibleRect(element: HTMLElement): DOMRect {
  const visible = element.getBoundingClientRect().toJSON() as DOMRect;
  let parent = element.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll|hidden|clip)/.test(`${style.overflow} ${style.overflowY}`)) {
      const clip = parent.getBoundingClientRect();
      Object.assign(visible, {
        left: Math.max(visible.left, clip.left),
        top: Math.max(visible.top, clip.top),
        right: Math.min(visible.right, clip.right),
        bottom: Math.min(visible.bottom, clip.bottom),
      });
    }
    parent = parent.parentElement;
  }
  return visible;
}

async function capture(name: string): Promise<void> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the learning-surface test has no browser frame");
  }
  const box = frame.getBoundingClientRect();
  const outer = window.parent as Window;
  const browser = cdp() as unknown as {
    send: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<{ readonly data: string }>;
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
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`output/design-review/presenter-lf1/${name}`, shot.data, {
      encoding: "base64",
    });
  }
}

async function openPresenterLesson(width: number, height: number) {
  await page.viewport(width, height);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=lesson",
  );
  render(<App />);
  await screen.findByRole("button", { name: "Complete lesson" }, { timeout: 15_000 });
  await testingWaitFor(
    () => expect(document.querySelector(".city-stage-full")).not.toBeNull(),
    { timeout: 15_000 },
  );
}

test("ordinary play and presenter play receive the same immersive lesson geometry", {
  timeout: 60_000,
}, async () => {
  await page.viewport(1024, 580);
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "progress-foundation",
    surface: "lesson",
    eraId: "bronze_age",
  });
  const city = createCityDevSession(null, fixture.city.seed);
  setCityEraForPreview("bronze_age");
  const nodeId = fixture.city.focusNodeId;
  if (!nodeId) {
    throw new Error("the ordinary/presenter parity fixture has no focus lesson");
  }
  render(
    <div className="city-shell">
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo={false}
        loadCity={city.load}
        initialSelectedNodeId={nodeId}
        initialEntry={{ kind: "lesson", nodeId }}
        lessonHost={d1LessonHost}
      />
    </div>,
  );
  await screen.findByRole("button", { name: "Next" }, { timeout: 15_000 });

  expectViewportRect(rect(".world-scene"), 1024, 580, "ordinary lesson scene");
  expectViewportRect(rect(".world-scene .coc-card"), 1024, 580, "ordinary lesson canvas");
  expect(document.querySelector<HTMLElement>(".city-stage-full")?.inert).toBe(true);
});

test.each(VIEWPORTS.map(({ name, width, height }) => [name, width, height] as const))(
  "lesson is the only full-viewport application surface at %s (%sx%s)",
  async (name, width, height) => {
    const fullscreenBefore = document.fullscreenElement;
    await openPresenterLesson(width, height);

    const cityStage = document.querySelector<HTMLElement>(".city-stage-full");
    const cityViewport = document.querySelector<HTMLElement>(".city-viewport");
    const cityWorld = document.querySelector<HTMLElement>(".city-shell__world");
    if (!cityStage || !cityViewport || !cityWorld) {
      throw new Error("the presenter fixture mounted no city behind its lesson");
    }
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(cityWorld).toHaveAttribute("aria-hidden", "true");

    await document.fonts.ready;
    await capture(`lesson-${name}-${width}x${height}.png`);

    expectViewportRect(rect(".world-scene"), width, height, "lesson scene");
    expectViewportRect(rect(".world-scene .coc-card"), width, height, "lesson canvas");
    expect
      .soft(cityWorld.inert, "the covered city scene and HUD remain keyboard-operable")
      .toBe(true);
    expect
      .soft(
        getComputedStyle(cityWorld).display,
        "the covered city scene and HUD remain visible behind the lesson",
      )
      .toBe("none");
    expect
      .soft(
        document.fullscreenElement,
        "opening an in-app lesson changed browser fullscreen",
      )
      .toBe(fullscreenBefore);

    const closeControl = screen.getByRole("button", { name: "Close" });
    const backControl = screen.getByRole("button", { name: "Back to city" });
    for (const control of [closeControl, backControl]) {
      const box = control.getBoundingClientRect();
      expect
        .soft(box.width, `${control.ariaLabel ?? control.textContent} width`)
        .toBeGreaterThanOrEqual(44);
      expect
        .soft(box.height, `${control.ariaLabel ?? control.textContent} height`)
        .toBeGreaterThanOrEqual(44);
      expect
        .soft(box.left, `${control.ariaLabel ?? control.textContent} left clipping`)
        .toBeGreaterThanOrEqual(0);
      expect
        .soft(box.right, `${control.ariaLabel ?? control.textContent} right clipping`)
        .toBeLessThanOrEqual(width);
      expect
        .soft(box.top, `${control.ariaLabel ?? control.textContent} top clipping`)
        .toBeGreaterThanOrEqual(0);
      expect
        .soft(box.bottom, `${control.ariaLabel ?? control.textContent} bottom clipping`)
        .toBeLessThanOrEqual(height);
    }

    backControl.focus();
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(closeControl).toHaveFocus();
    closeControl.focus();
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
    );
    expect(backControl).toHaveFocus();

    for (
      let step = 0;
      step < 3 && !document.querySelector(".lesson-interactive");
      step += 1
    ) {
      const next = screen.queryByRole<HTMLButtonElement>("button", { name: "Next" });
      if (!next) {
        break;
      }
      next.click();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
    }
    const widget = document.querySelector<HTMLElement>(".lesson-interactive");
    expect(widget, "the real lesson never reached its nested gated visual").not.toBeNull();
    expect(
      screen.getByRole("img", { name: /with a run of .* and a rise of/i }),
    ).toBeInTheDocument();
    const widgetControls = [
      ...(widget?.querySelectorAll<HTMLElement>("button, input") ?? []),
    ].filter((control) => control.getClientRects().length > 0);
    expect(
      widgetControls.length,
      "the nested visual exposes no operable controls",
    ).toBeGreaterThan(0);
    const presenterBar = screen
      .getByRole("navigation", { name: "Presenter actions" })
      .getBoundingClientRect();
    for (const control of widgetControls) {
      const box = control.getBoundingClientRect();
      expect
        .soft(box.left, "a nested visual control is clipped on the left")
        .toBeGreaterThanOrEqual(0);
      expect
        .soft(box.right, "a nested visual control is clipped on the right")
        .toBeLessThanOrEqual(width);
      const visible = visibleRect(control);
      if (visible.right > visible.left && visible.bottom > visible.top) {
        expect
          .soft(
            overlaps(visible, presenterBar),
            "the Presenter bar covers a widget control",
          )
          .toBe(false);
      }
    }
    widget?.scrollIntoView({ block: "center" });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    for (const control of widgetControls) {
      const visible = visibleRect(control);
      if (visible.right > visible.left && visible.bottom > visible.top) {
        expect
          .soft(
            overlaps(visible, presenterBar),
            "the Presenter bar covers a widget control after the interaction is framed",
          )
          .toBe(false);
      }
    }
    await capture(`interactive-${name}-${width}x${height}.png`);

    backControl.click();
    await testingWaitFor(() => expect(document.querySelector(".world-scene")).toBeNull());

    expect(document.querySelector(".city-stage-full")).toBe(cityStage);
    expect(document.querySelector(".city-viewport")).toBe(cityViewport);
    expect(cityWorld.inert).toBe(false);
    expect(getComputedStyle(cityWorld).display).not.toBe("none");
    expect(cityViewport).toHaveFocus();
    expect(document.fullscreenElement).toBe(fullscreenBefore);
    expect(screen.queryByRole("button", { name: "Presenter" })).toBeNull();
    expect(screen.getByRole("button", { name: "Menu" })).toBeVisible();
  },
  60_000,
);

test("presenter AI work stages a local mock upload, with no ordinary backend path", {
  timeout: 180_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=progress-foundation&surface=work",
  );
  render(<App />);

  await screen.findByRole("dialog", { name: "Photo work feedback" });
  await document.fonts.ready;
  await capture("work-checker-1024x580.png");

  expect(document.querySelector(".work-checker")).toBeNull();
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  expect(screen.getByTestId("presenter-work-upload")).toHaveTextContent(
    /full solution is clear and easy to read/i,
  );
  expectViewportRect(rect(".world-scene"), 1024, 580, "work-checker scene");
  expectViewportRect(rect(".world-scene .coc-card"), 1024, 580, "work-checker canvas");

  const transfer = new DataTransfer();
  transfer.items.add(
    new File([new Uint8Array([1, 2, 3])], "solution-photo.png", { type: "image/png" }),
  );
  if (!input) {
    throw new Error("the local Presenter fixture supplied no photo input");
  }
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await screen.findByRole("status", { name: "Checking your work" });
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      path: "__screenshots__/learning-surface-layout/after-work-checker-analyzing-1024x580.png",
    });
  }

  const result = await screen.findByTestId("presenter-work-result", {}, { timeout: 3_000 });
  expect(result).toHaveTextContent("Last correct line");
  expect(result).toHaveTextContent("First incorrect line");
  expect(result).toHaveTextContent("Correct transformation");
  await testingWaitFor(
    () => expect(result.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(7),
    { timeout: 4_000 },
  );
  await document.fonts.ready;
  await capture("work-checker-fixed-result-1024x580.png");
});
