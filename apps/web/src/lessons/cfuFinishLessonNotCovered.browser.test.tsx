import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { AdvisorLesson } from "./AdvisorLesson";
import type { LessonContent } from "./types";
import { WorldScene } from "../city/WorldScene";
import { type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

/**
 * **THE REAL LEARNER MOUNT, PHOTOGRAPHED: exactly one "Finish lesson" control on screen once
 * the check is passed.**
 *
 * `.cursor/rules/qa-verification.mdc`: a spatial claim ("no covered duplicate") owes a
 * rendered frame someone looked at, at a named, realistic viewport, on the surface a learner
 * actually gets — not `?dev`'s `size="full"` alias, whose `.coc-card` drops the height cap a
 * learner's `size="large"` carries (`styles.css` `.world-scene--full .coc-card {
 * max-height: none }`). This mounts the real `WorldScene` at `size="large"` — the exact prop
 * `d1LessonHost` passes for every ordinary lesson — with the real `AdvisorLesson` as its
 * child, inside `.city-shell` so the panel tokens (`--glass-fill-strong` and neighbours,
 * declared on `.city-shell` rather than at `:root`) resolve instead of painting every panel
 * transparent.
 *
 * Both ruled viewports are SHORT (580px tall), which is exactly where the sticky
 * `AdvisorControls` row (`position: sticky; bottom: 0`) and the CFU card's own
 * "Finish lesson" copy (removed by this change) used to occupy the same lane at the foot of
 * the scrolling well. The lesson itself has no authored mini-lesson paragraphs (mirroring
 * `AdvisorLesson.test.tsx`'s `CFU_ONLY_LESSON`), so the surface opens straight on the check —
 * the teaching walk is a separate concern from the occlusion this file is about.
 */

const SHOTS = Boolean(import.meta.env.VITE_FINISH_LESSON_SHOTS);

const VIEWPORTS = [
  { label: "1024x580", width: 1024, height: 580 },
  { label: "390x580", width: 390, height: 580 },
] as const;

const TOUCH_TARGET = 44;

/**
 * A real lesson shape with no authored mini-lesson paragraphs, so `AdvisorLesson` opens
 * straight on the check (same shape `AdvisorLesson.test.tsx`'s `CFU_ONLY_LESSON` uses) — the
 * teaching walk is a separate concern from the occlusion this file is about.
 */
const CFU_ONLY_LESSON: LessonContent = {
  node_id: "NUM.3",
  title: "Finish lesson occlusion test lesson",
  mini_lesson: [],
  cfu: { prompt: "What is 2 + 2?", accepted: ["4"], hint: "Add them." },
};

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const measured: string[] = [];

function session() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data?: string }>;
  };
}

function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

async function capture(): Promise<string> {
  const box = testViewportBox();
  const shot = await session().send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function keep(name: string, shot: string): Promise<void> {
  await commands.writeFile(`docs/design-refs/finish-lesson/${name}.png`, shot, {
    encoding: "base64",
  });
}

async function reducedMotion(): Promise<void> {
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

function named(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (button) =>
      (button.getAttribute("aria-label") ?? button.textContent ?? "").trim() === label,
  );
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await reducedMotion();
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

afterAll(async () => {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
  if (SHOTS) {
    await commands.writeFile(
      "docs/design-refs/finish-lesson/measured.txt",
      [
        "Measured on the frames in docs/design-refs/finish-lesson by",
        "cfuFinishLessonNotCovered.browser.test.tsx, on the real learner mount",
        '(WorldScene size="large" + AdvisorLesson, inside .city-shell), under an emulated',
        "prefers-reduced-motion: reduce.",
        "",
        ...measured,
        "",
      ].join("\n"),
    );
  }
});

test("exactly one accessible, on-screen Finish lesson control once the check is passed", {
  timeout: 60_000,
}, async () => {
  for (const viewport of VIEWPORTS) {
    const user = userEvent.setup();
    await page.viewport(viewport.width, viewport.height);
    h?.cleanup();

    h = mount(
      <div className="city-shell">
        <WorldScene
          eyebrow="NUM.3 · mini-lesson"
          title={CFU_ONLY_LESSON.title}
          tone="lesson"
          size="large"
          soundToggle
          onExit={() => undefined}
        >
          <AdvisorLesson
            content={CFU_ONLY_LESSON}
            onComplete={() => undefined}
            onEnterPractice={() => undefined}
            onFinishLesson={() => undefined}
          />
        </WorldScene>
      </div>,
    );
    await waitFor(
      () => document.querySelector('input[type="text"]') !== null,
      "the check never mounted",
      15000,
    );
    await document.fonts.ready;

    const input = document.querySelector<HTMLInputElement>('input[type="text"]');
    const check = named("Check");
    if (!input || !check) {
      throw new Error("the check drew no answer field / Check button");
    }
    await user.type(input, "4");
    await user.click(check);
    await waitFor(
      () => named("Finish lesson") !== undefined,
      "Finish lesson never appeared after a correct answer",
      5000,
    );
    await document.fonts.ready;

    // EXACTLY ONE, on the accessible tree — not the CFU card's own copy shadowing the
    // sticky `AdvisorControls` row's, which is the defect this file is named for.
    const finishButtons = Array.from(document.querySelectorAll("button")).filter(
      (button) => (button.textContent ?? "").trim() === "Finish lesson",
    );
    measured.push(
      `${viewport.label}: ${finishButtons.length} "Finish lesson" control(s) in the DOM`,
    );
    expect(
      finishButtons.length,
      `expected exactly one "Finish lesson" control at ${viewport.label}, found ${finishButtons.length}`,
    ).toBe(1);

    const finish = finishButtons[0];
    if (!finish) {
      throw new Error("Finish lesson never rendered");
    }
    // It is the sticky row's, pinned at the foot of the well, not the CFU card's own copy.
    expect(finish.closest(".advisor-npc__controls")).not.toBeNull();

    const box = finish.getBoundingClientRect();
    measured.push(
      `${viewport.label}: Finish lesson at (${Math.round(box.left)}, ${Math.round(box.top)}) ` +
        `${Math.round(box.width)}x${Math.round(box.height)}px`,
    );
    // Fully inside the viewport, at least a 44px touch target — the spatial half a DOM
    // count cannot see: a duplicate hidden off-screen would still pass the count above.
    expect(box.top, "Finish lesson starts above the viewport").toBeGreaterThanOrEqual(0);
    expect(box.left, "Finish lesson starts left of the viewport").toBeGreaterThanOrEqual(0);
    expect(
      Math.round(box.bottom),
      "Finish lesson runs past the bottom of the viewport",
    ).toBeLessThanOrEqual(viewport.height);
    expect(
      Math.round(box.right),
      "Finish lesson runs past the right edge of the viewport",
    ).toBeLessThanOrEqual(viewport.width);
    expect(
      Math.round(box.height),
      `Finish lesson is a ${Math.round(box.height)}px target, under the ${TOUCH_TARGET}px floor`,
    ).toBeGreaterThanOrEqual(TOUCH_TARGET);

    // Nothing else paints over its clickable box — the ELEMENT the browser would dispatch
    // a click to at the button's own center is the button itself (or a descendant of it),
    // never some other surface's layer sitting on top of it.
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    expect(
      hit === finish || finish.contains(hit),
      `something else paints over Finish lesson's own hit-test point at ${viewport.label}`,
    ).toBe(true);

    if (SHOTS) {
      await keep(`finish-lesson-${viewport.label}`, await capture());
    }
  }
});
