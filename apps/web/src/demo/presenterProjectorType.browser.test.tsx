import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { DEV_STUDENT_KEY } from "../auth/LocalSessionProvider";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { d1LessonHost } from "../city/d1LessonHost";
import { resetCityEra, setCityEraForPreview } from "../city/useCityEra";
import { interleavedPoolItems } from "../lessons/interleavedPool";
import { seedReviewMistakes } from "../lessons/mistakeStore";
import { runtimeStorage } from "../storage/runtimeStorage";
import { presenterFixtureFor } from "./presenterFixtures";

import "../styles.css";

const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_PRESENTER_PROJECTOR_SHOTS);

interface TypeFloor {
  readonly heading: number;
  readonly dialogue: number;
  readonly body: number;
  readonly math: number;
  readonly prompt: number;
  readonly answer: number;
  readonly progress: number;
  readonly control: number;
  readonly bar: number;
}

const VIEWS: readonly {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly floor: TypeFloor;
}[] = [
  {
    name: "projector",
    width: 1920,
    height: 1080,
    floor: {
      heading: 38,
      dialogue: 25,
      body: 23,
      math: 23,
      prompt: 25,
      answer: 21,
      progress: 14,
      control: 17,
      bar: 16,
    },
  },
  {
    name: "room",
    width: 1440,
    height: 900,
    floor: {
      heading: 32,
      dialogue: 22,
      body: 21,
      math: 21,
      prompt: 22,
      answer: 19,
      progress: 13,
      control: 15,
      bar: 15,
    },
  },
  {
    name: "short-laptop",
    width: 1024,
    height: 580,
    floor: {
      heading: 28,
      dialogue: 20,
      body: 18,
      math: 18,
      prompt: 19,
      answer: 17,
      progress: 12,
      control: 14,
      bar: 14,
    },
  },
  {
    name: "phone",
    width: 390,
    height: 580,
    floor: {
      heading: 20,
      dialogue: 16,
      body: 16,
      math: 16,
      prompt: 16,
      answer: 16,
      progress: 10,
      control: 12,
      bar: 9,
    },
  },
];

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

async function eventually<T>(
  read: () => T | null | undefined,
  message: string,
  timeoutMs = 10_000,
): Promise<T> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const value = read();
    if (value !== null && value !== undefined) {
      return value;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

function presenterAction(bar: HTMLElement, label: string): HTMLButtonElement | null {
  return (
    [...bar.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.trim() === label,
    ) ?? null
  );
}

function fontFloor(
  selector: string,
  floor: number,
  label: string,
  populationFloor = 1,
): void {
  const elements = [...document.querySelectorAll<HTMLElement>(selector)].filter(
    (element) => element.getClientRects().length > 0,
  );
  if (elements.length < populationFloor) {
    throw new Error(`${label} population is empty, so its ${floor}px floor proves nothing`);
  }
  for (const element of elements) {
    const computed = Number.parseFloat(getComputedStyle(element).fontSize);
    if (computed < floor) {
      throw new Error(`${label} rendered at ${computed}px below its ${floor}px floor`);
    }
  }
}

function boxFloor(
  elements: readonly Element[],
  floor: { readonly width?: number; readonly height?: number },
  label: string,
  populationFloor = 1,
): void {
  if (elements.length < populationFloor) {
    throw new Error(
      `${label} population is empty, so its rendered-size floor proves nothing`,
    );
  }
  for (const element of elements) {
    const box = element.getBoundingClientRect();
    if (floor.width !== undefined && box.width < floor.width) {
      throw new Error(
        `${label} rendered ${box.width}px wide below its ${floor.width}px floor`,
      );
    }
    if (floor.height !== undefined && box.height < floor.height) {
      throw new Error(
        `${label} rendered ${box.height}px tall below its ${floor.height}px floor`,
      );
    }
  }
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

function assertVisiblePopulationClearOfBar(
  selector: string,
  label: string,
  populationFloor = 1,
): void {
  const bar = screen.getByRole("navigation", { name: "Presenter actions" });
  const barBox = bar.getBoundingClientRect();
  const visible = [...document.querySelectorAll<HTMLElement>(selector)]
    .map(visibleRect)
    .filter((box) => box.right > box.left && box.bottom > box.top);
  if (visible.length < populationFloor) {
    throw new Error(
      `${label} has no visible population, so its bar-clearance check proves nothing`,
    );
  }
  for (const box of visible) {
    if (box.left < 0) {
      throw new Error(`${label} clips the left viewport edge`);
    }
    if (box.right > window.innerWidth) {
      throw new Error(`${label} clips the right viewport edge`);
    }
    const overlaps = !(
      box.right <= barBox.left ||
      barBox.right <= box.left ||
      box.bottom <= barBox.top ||
      barBox.bottom <= box.top
    );
    if (overlaps) {
      throw new Error(`${label} is covered by the Presenter bottom bar`);
    }
  }
}

async function capture(name: string): Promise<void> {
  if (!CAPTURE_EVIDENCE) {
    return;
  }
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter projector test has no browser frame");
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
    await commands.writeFile(
      `output/design-review/presenter-projector/${name}.png`,
      shot.data,
      {
        encoding: "base64",
      },
    );
  }
}

for (const view of VIEWS) {
  test(`Presenter LF.1 projector hierarchy at ${view.width}x${view.height}`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(view.width, view.height);
    window.history.replaceState(
      null,
      "",
      "/demo?presenter=1&preset=progress-foundation&surface=city&era=atomic_age",
    );
    render(<App />);
    await eventually(
      () => document.querySelector<HTMLButtonElement>(".city-build-button"),
      "the Presenter city did not render Build",
    );
    const bar = await eventually(
      () => document.querySelector<HTMLElement>('[aria-label="Presenter actions"]'),
      "the Presenter action bar did not render",
    );
    presenterAction(bar, "Lesson")?.click();
    await eventually(
      () => document.querySelector<HTMLElement>(".worked-solution"),
      "the Presenter lesson did not show its rise-over-run worked example",
    );
    await eventually(
      () =>
        document.querySelector<HTMLElement>(
          '.city-shell__world[data-presenter-learning="true"]',
        ),
      "the real city did not mark its Presenter learning takeover",
    );

    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .world-scene-head h2',
      view.floor.heading,
      "lesson heading",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .advisor-npc__said p',
      view.floor.dialogue,
      "advisor dialogue",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .worked-solution',
      view.floor.body,
      "worked-example body",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .worked-solution .katex',
      view.floor.math,
      "worked-example math",
      5,
    );
    expect(document.querySelector("figure.lesson-visual")).toBeNull();
    document.querySelector<HTMLElement>(".worked-solution")?.scrollIntoView({
      block: "center",
    });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    if (view.width === 1024 && view.height === 580) {
      const exampleParts = [
        ...document.querySelectorAll<HTMLElement>(
          ".worked-solution__intro, .worked-solution__step",
        ),
      ];
      const body = document.querySelector<HTMLElement>(".coc-card__body");
      const controls = document.querySelector<HTMLElement>(
        ".advisor-lesson > .advisor-npc__controls",
      );
      if (exampleParts.length !== 4 || !body || !controls) {
        throw new Error("the short-laptop worked-example fit population is incomplete");
      }
      const bodyBox = body.getBoundingClientRect();
      const controlsBox = controls.getBoundingClientRect();
      for (const part of exampleParts) {
        const partBox = part.getBoundingClientRect();
        if (partBox.top < bodyBox.top || partBox.bottom > controlsBox.top + 4) {
          throw new Error("the short-laptop frame cannot show the complete calculation");
        }
      }
    }
    await capture(`${view.name}-worked-example-${view.width}x${view.height}`);

    screen.getByRole<HTMLButtonElement>("button", { name: "Next" }).click();
    await eventually(
      () => document.querySelector<HTMLElement>(".lesson-interactive"),
      "the Presenter lesson did not reach its rise-over-run interaction",
    );
    screen.getByRole<HTMLButtonElement>("button", { name: "move left" }).click();
    await eventually(() => {
      const plot = document.querySelector<HTMLElement>(
        '.lesson-interactive svg[aria-label*="movable point at negative 1, 1"]',
      );
      return plot;
    }, "the LF.1 mover did not finish its first step");
    screen.getByRole<HTMLButtonElement>("button", { name: "move up" }).click();
    const slopeStatus = await eventually(() => {
      const found = document.querySelector<HTMLElement>(".lesson-interactive__status");
      return found?.textContent?.includes(
        "Got it. Now move the second point until the slope reads",
      )
        ? found
        : null;
    }, "the exact LF.1 slope interaction did not advance to its second target");
    const slopeWidget = slopeStatus.closest<HTMLElement>(".lesson-interactive");
    if (!slopeWidget) {
      throw new Error("the exact LF.1 status is not inside an interactive widget");
    }
    const plot = slopeWidget.querySelector<SVGGraphicsElement>("[data-plot-frame]");
    const svg = slopeWidget.querySelector<SVGSVGElement>("svg");
    const pointLabels = [
      ...slopeWidget.querySelectorAll<HTMLElement>("[data-plot-label] .katex"),
    ];
    const points = [...slopeWidget.querySelectorAll<SVGCircleElement>("svg circle")];
    const triangleMarks = [
      ...slopeWidget.querySelectorAll<SVGLineElement>('svg line[stroke-width="2.5"]'),
    ];
    const tickLabels = [...slopeWidget.querySelectorAll<SVGTextElement>("svg text")];
    const slopeReadout = slopeWidget.querySelector<HTMLElement>(
      'svg foreignObject[data-latex^="m ="] .katex',
    );
    const directionKeys = [
      ...slopeWidget.querySelectorAll<HTMLButtonElement>(
        ".lesson-interactive__direction-key",
      ),
    ];
    const directionPad = slopeWidget.querySelector<HTMLElement>(
      ".lesson-interactive__direction-pad",
    );
    const targetMath = [
      ...slopeWidget.querySelectorAll<HTMLElement>(".lesson-interactive__step-eq .katex"),
    ];
    const reveal = screen.getByRole<HTMLButtonElement>("button", {
      name: "Reveal where the point goes, then try a new set",
    });

    expect(plot, "the exact LF.1 interaction has no plot frame").not.toBeNull();
    expect(svg, "the exact LF.1 interaction has no coordinate SVG").not.toBeNull();
    expect(pointLabels, "the LF.1 plot-label population changed").toHaveLength(4);
    expect(points, "the LF.1 point population changed").toHaveLength(2);
    expect(triangleMarks, "the LF.1 rise/run mark population changed").toHaveLength(2);
    expect(tickLabels, "the LF.1 axis-label population changed").toHaveLength(8);
    expect(directionKeys, "the LF.1 DirectionPad population changed").toHaveLength(4);
    expect(directionPad, "the LF.1 DirectionPad has no layout container").not.toBeNull();
    expect(targetMath, "the LF.1 target population changed").toHaveLength(2);

    if (view.width === 1024 && view.height === 580) {
      const plotBox = (plot as SVGGraphicsElement).getBoundingClientRect();
      expect(
        plotBox.width,
        "LF.1 projects the actual coordinate graph, not merely a larger outer card",
      ).toBeGreaterThanOrEqual(395);
      boxFloor(pointLabels, { height: 27 }, "LF.1 coordinate and rise/run labels", 4);
      boxFloor(tickLabels, { height: 13 }, "LF.1 axis labels", 8);
      boxFloor(
        slopeReadout ? [slopeReadout] : [],
        { height: 27 },
        "LF.1 live slope readout",
      );
      for (const point of points) {
        const matrix = point.getScreenCTM();
        const radius = Number(point.getAttribute("r"));
        const diameter = matrix ? 2 * radius * Math.hypot(matrix.a, matrix.b) : 0;
        expect(diameter, "an LF.1 point is too small to project").toBeGreaterThanOrEqual(
          13.5,
        );
      }
      for (const mark of triangleMarks) {
        const matrix = mark.getScreenCTM();
        const stroke = Number(mark.getAttribute("stroke-width"));
        const renderedStroke = matrix ? stroke * Math.hypot(matrix.a, matrix.b) : 0;
        expect(
          renderedStroke,
          "an LF.1 rise/run mark is too thin to project",
        ).toBeGreaterThanOrEqual(3.4);
      }
      boxFloor(directionKeys, { width: 56, height: 56 }, "LF.1 DirectionPad key", 4);
      boxFloor(targetMath, { height: 24 }, "LF.1 slope target", 2);
      boxFloor([reveal], { height: 52 }, "LF.1 reveal control");
      fontFloor(
        '.city-shell__world[data-presenter-learning="true"] .lesson-interactive__status',
        22,
        "LF.1 instructional status",
      );
      fontFloor(
        '.city-shell__world[data-presenter-learning="true"] .lesson-interactive__reveal-button',
        18,
        "LF.1 reveal control",
      );
    }
    if (view.width === 390 && view.height === 580) {
      boxFloor(directionKeys, { width: 44, height: 44 }, "phone LF.1 DirectionPad key", 4);
      const widgetBox = slopeWidget.getBoundingClientRect();
      expect(widgetBox.left, "phone LF.1 clips left").toBeGreaterThanOrEqual(0);
      expect(widgetBox.right, "phone LF.1 clips right").toBeLessThanOrEqual(view.width);
      expect(
        slopeWidget.scrollWidth,
        "phone LF.1 controls overflow their reflowed widget",
      ).toBeLessThanOrEqual(slopeWidget.clientWidth);
    }
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-interactive__status',
      view.floor.body,
      "interactive status",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-interactive .katex',
      view.floor.math,
      "rise-over-run math",
      3,
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-interactive button',
      view.floor.control,
      "interactive control",
      4,
    );
    fontFloor(".presenter-bottom-bar button", view.floor.bar, "bottom-bar action", 5);
    await capture(`${view.name}-lesson-${view.width}x${view.height}`);
    (view.width === 390 ? (directionPad as HTMLElement) : slopeWidget).scrollIntoView({
      block: "center",
    });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    assertVisiblePopulationClearOfBar(
      '.city-shell__world[data-presenter-learning="true"] .lesson-interactive button',
      "rise-over-run control",
    );
    assertVisiblePopulationClearOfBar(
      '.city-shell__world[data-presenter-learning="true"] .world-scene-actions .city-action',
      "lesson exit control",
    );
    await capture(`${view.name}-interaction-${view.width}x${view.height}`);
    if (view.width === 1024 && view.height === 580) {
      const body = document.querySelector<HTMLElement>(".coc-card__body");
      const lessonControls = document.querySelector<HTMLElement>(
        ".advisor-lesson > .advisor-npc__controls",
      );
      if (!body || !lessonControls) {
        throw new Error(
          "the short-laptop LF.1 evidence frame has no scroll well or controls",
        );
      }
      body.scrollBy({
        top: Math.max(
          0,
          slopeStatus.getBoundingClientRect().bottom -
            lessonControls.getBoundingClientRect().top +
            12,
        ),
      });
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      await capture("short-laptop-status-1024x580");
    }

    await eventually(
      () => document.querySelector<HTMLElement>('[aria-label="Presenter actions"]'),
      "the Presenter action bar disappeared during the lesson",
    );
    const completeLesson = await eventually(
      () =>
        [...document.querySelectorAll<HTMLButtonElement>("button")].find(
          (button) => button.textContent?.trim() === "Complete lesson",
        ) ?? null,
      "the lesson exposed no Presenter completion action",
    );
    completeLesson.click();
    await eventually(
      () =>
        new URL(window.location.href).searchParams.get("surface") === "city"
          ? document.querySelector<HTMLElement>(".city-surface")
          : null,
      "Presenter lesson completion did not return to the city",
    );
    const lessonReceipt = await eventually(
      () => document.querySelector<HTMLElement>(".completion-reward-dialog"),
      "Presenter lesson completion exposed no canonical receipt",
    );
    expect(lessonReceipt).toHaveAttribute("data-context", "Lesson complete");
    lessonReceipt.querySelector<HTMLButtonElement>(".completion-reward-continue")?.click();
    await eventually(
      () =>
        document.querySelector(".completion-reward-dialog") === null
          ? document.querySelector<HTMLElement>(".city-surface")
          : null,
      "Presenter lesson completion receipt did not dismiss",
    );
    const returnedBar = await eventually(
      () => document.querySelector<HTMLElement>('[aria-label="Presenter actions"]'),
      "the Presenter action bar did not return with the city",
    );
    const practiceAction = await eventually(
      () => presenterAction(returnedBar, "Practice"),
      "the city exposed no Presenter Practice action",
    );
    practiceAction.click();
    await eventually(
      () => document.querySelector<HTMLElement>('.lesson-practice[data-node-id="LF.1"]'),
      "the Presenter action did not enter LF.1 practice",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-practice__prompt',
      view.floor.prompt,
      "practice prompt",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-practice__prompt .katex',
      view.floor.math,
      "practice prompt math",
      2,
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-player__row input',
      view.floor.answer,
      "practice answer",
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-practice__head .micro-label, .city-shell__world[data-presenter-learning="true"] .difficulty-tag',
      view.floor.progress,
      "practice progress",
      2,
    );
    fontFloor(
      '.city-shell__world[data-presenter-learning="true"] .lesson-player__row button',
      view.floor.control,
      "practice primary control",
    );
    assertVisiblePopulationClearOfBar(
      '.city-shell__world[data-presenter-learning="true"] .lesson-player__row input, .city-shell__world[data-presenter-learning="true"] .lesson-player__row button',
      "practice answer control",
      2,
    );
    assertVisiblePopulationClearOfBar(
      '.city-shell__world[data-presenter-learning="true"] .world-scene-actions .city-action',
      "practice exit control",
    );
    await capture(`${view.name}-practice-${view.width}x${view.height}`);
  });
}

test("Presenter Review mistakes shares the projector prompt scale", {
  timeout: 30_000,
}, async () => {
  await page.viewport(1024, 580);
  window.history.replaceState(
    null,
    "",
    "/demo?presenter=1&preset=bronze-city&surface=interleaving&era=prehistoric",
  );
  const storage = runtimeStorage();
  if (!storage) {
    throw new Error("Presenter Review mistakes test has no runtime storage");
  }
  storage.setItem(DEV_STUDENT_KEY, "presenter-projector");
  seedReviewMistakes(
    "presenter-projector",
    "prehistoric",
    interleavedPoolItems("prehistoric", "all").slice(0, 3),
    storage,
  );
  render(<App />);
  await screen.findByText(/Review mistake · 3 remaining/);
  const reviewHeading = screen.getByRole<HTMLElement>("heading", {
    name: "Review mistakes",
  });
  const reviewAdvisor = screen.getByText(
    /This question is here because it was missed or skipped/,
  );
  const reviewPrompt = document.querySelector<HTMLElement>("#review-mistake-prompt");
  const reviewProgress = document.querySelector<HTMLElement>(
    ".review-mistakes-card > .micro-label",
  );
  const reviewField = screen.getByRole<HTMLInputElement>("textbox");
  const reviewCheck = screen.getByRole<HTMLButtonElement>("button", { name: "Check" });
  const reviewBack = document.querySelector<HTMLButtonElement>(".advisor-lesson__back");
  if (!reviewPrompt || !reviewProgress || !reviewBack) {
    throw new Error("the exact populated Review mistakes surface is incomplete");
  }
  expect(
    document.querySelectorAll(".review-mistakes-card").length,
    "the Review mistakes card population changed",
  ).toBe(1);
  fontFloor(".presenter-app-layer .world-scene-head h2", 34, "Review mistakes heading");
  fontFloor(
    ".presenter-app-layer .advisor-npc__said p",
    24,
    "Review mistakes advisor copy",
  );
  fontFloor(".presenter-app-layer #review-mistake-prompt", 24, "Review mistakes prompt");
  fontFloor(
    ".presenter-app-layer .review-mistakes-card > .micro-label",
    14,
    "Review mistakes progress heading",
  );
  fontFloor(".presenter-app-layer .lesson-player__row input", 22, "Review mistakes answer");
  fontFloor(
    ".presenter-app-layer .lesson-player__row button",
    18,
    "Review mistakes primary control",
  );
  fontFloor(
    ".presenter-app-layer .advisor-lesson__back",
    18,
    "Review mistakes return control",
  );
  boxFloor([reviewHeading], { height: 40 }, "Review mistakes heading");
  boxFloor([reviewAdvisor], { height: 34 }, "Review mistakes advisor copy");
  boxFloor([reviewPrompt], { height: 68 }, "Review mistakes prompt");
  boxFloor([reviewProgress], { height: 16 }, "Review mistakes progress heading");
  boxFloor([reviewField], { height: 56 }, "Review mistakes answer field");
  boxFloor([reviewCheck], { width: 88, height: 56 }, "Review mistakes Check control");
  boxFloor([reviewBack], { height: 52 }, "Review mistakes return control");
  reviewCheck.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  await capture("review-mistakes-1024x580");
});

test("ordinary lesson typography does not inherit the Presenter projector scale", {
  timeout: 30_000,
}, async () => {
  await page.viewport(1024, 580);
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "progress-foundation",
    surface: "city",
    eraId: "atomic_age",
  });
  const session = createCityDevSession(null, fixture.city.seed);
  setCityEraForPreview("atomic_age");
  render(
    <div className="city-shell">
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo={false}
        loadCity={session.load}
        eraId="atomic_age"
        initialEntry={{
          kind: "lesson",
          nodeId: "LF.1",
          initialTeachingStep: { index: 1, section: "activity" },
        }}
        lessonHost={d1LessonHost}
      />
    </div>,
  );
  await screen.findByRole("img", { name: /with a run of .* and a rise of/i });
  const heading = document.querySelector<HTMLElement>(".world-scene-head h2");
  const dialogue = document.querySelector<HTMLElement>(".advisor-npc__said p");
  expect(heading).not.toBeNull();
  expect(dialogue).not.toBeNull();
  expect(Number.parseFloat(getComputedStyle(heading as HTMLElement).fontSize)).toBeLessThan(
    28,
  );
  expect(
    Number.parseFloat(getComputedStyle(dialogue as HTMLElement).fontSize),
  ).toBeLessThan(20);
  expect(document.querySelector(".presenter-lesson-demo")).toBeNull();
  expect(document.querySelector('[data-presenter-learning="true"]')).toBeNull();
});
