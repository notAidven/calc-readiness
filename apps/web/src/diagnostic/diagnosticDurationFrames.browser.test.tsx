import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { LocalSessionProvider } from "../auth/LocalSessionProvider";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { TitleScreen } from "../TitleScreen";
import { DiagnosticSurface } from "./DiagnosticSurface";
import { DIAGNOSTIC_DURATION_ESTIMATE } from "./diagnosticShape";

import "../styles.css";
import "./diagnostic-answer.css";
import "./diagnostic-demo.css";
import "./diagnostic-dev-skip.css";

const VIEWPORTS = [
  { name: "1024x580", width: 1024, height: 580 },
  { name: "390x580", width: 390, height: 580 },
] as const;
const OUTPUT = ".qa-frames/diagnostic-duration";
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

let harness: Harness | null = null;
let restore: { readonly width: number; readonly height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.invalid/diagnostic");
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

function LearnerDiagnosticIntro() {
  return (
    <div className="surface-overlay surface-overlay--diagnostic">
      <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
        <header className="surface-overlay-head surface-overlay-head--diagnostic">
          <span className="surface-overlay-brand">Diagnostic</span>
          <button type="button" className="city-action">
            Back to city
          </button>
        </header>
        <div className="surface-overlay-body surface-overlay-body--diagnostic">
          <LocalSessionProvider>
            <DiagnosticSurface />
          </LocalSessionProvider>
        </div>
      </div>
    </div>
  );
}

function viewportBox(): { x: number; y: number; width: number; height: number } {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the learner viewport is not mounted in a browser tester frame");
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

async function capture(name: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    const browser = cdp() as unknown as {
      send: (
        method: string,
        params?: Record<string, unknown>,
      ) => Promise<{ readonly data: string }>;
    };
    const shot = await browser.send("Page.captureScreenshot", {
      format: "png",
      clip: { ...viewportBox(), scale: 1 },
    });
    await commands.writeFile(`${OUTPUT}/${name}.png`, shot.data, {
      encoding: "base64",
    });
  }
}

function box(selector: string) {
  const value = document.querySelector(selector)?.getBoundingClientRect();
  return value
    ? {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      }
    : null;
}

test.each(VIEWPORTS)("captures the whole initial screens at $name", async (view) => {
  await page.viewport(view.width, view.height);
  harness = mount(
    <TitleScreen
      onStart={() => undefined}
      onTakeDiagnostic={() => undefined}
      accountMode
    />,
  );
  await waitFor(
    () => document.querySelector(".title-screen__panel") !== null,
    "the title screen",
    30_000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 250));
  expect(window.innerWidth).toBe(view.width);
  expect(document.body.textContent).toContain(DIAGNOSTIC_DURATION_ESTIMATE);
  expect(
    document.querySelector(".start-choice__meta")?.getBoundingClientRect().width,
  ).toBeGreaterThan(0);
  expect(
    box(".start-choice__route--recommended .start-choice__cta")?.bottom,
  ).toBeLessThanOrEqual(view.height);
  await capture(`title-${view.name}`);
  const title = {
    panel: box(".title-screen__panel"),
    diagnosticAction: box(".start-choice__route--recommended .start-choice__cta"),
    duration: box(".start-choice__meta"),
    scrollHeight: document.documentElement.scrollHeight,
  };

  harness.cleanup();
  harness = mount(<LearnerDiagnosticIntro />);
  await waitFor(
    () => document.querySelector(".dgx-intro") !== null,
    "the diagnostic intro",
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 250));
  expect(document.body.textContent).toContain(DIAGNOSTIC_DURATION_ESTIMATE);
  expect(document.querySelector('[data-testid="dgx-dev-skip"]')).toBeNull();
  const durationSelector =
    view.width <= 900 ? ".dgx-brief__duration" : ".dgx-shape__cell--duration";
  const estimate = box(durationSelector);
  const startAction = box(".dgx-actions button");
  expect(startAction?.height).toBeGreaterThanOrEqual(44);
  expect(startAction?.bottom).toBeLessThanOrEqual(view.height);
  expect(estimate?.height).toBeGreaterThan(0);
  expect(estimate?.bottom).toBeLessThanOrEqual(view.height);
  await capture(`diagnostic-intro-${view.name}`);

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUTPUT}/measurements-${view.name}.json`,
      JSON.stringify(
        {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          title,
          diagnostic: {
            intro: box(".dgx-intro"),
            estimate,
            startAction,
            scrollHeight: document.documentElement.scrollHeight,
          },
        },
        null,
        2,
      ),
      { encoding: "utf-8" },
    );
  }
});
