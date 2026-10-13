import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { DEV_STUDENT_KEY } from "../auth/LocalSessionProvider";
import { resetCityEra } from "../city/useCityEra";
import { readReviewMistakes } from "../lessons/mistakeStore";
import { practiceItemsById } from "../lessons/practiceChecker";
import { runtimeStorage } from "../storage/runtimeStorage";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const ROUTE =
  "/demo?presenter=1&preset=progress-construction&surface=review&era=bronze_age";
const ACTIONS = ["Slides", "Lesson", "Practice", "Review", "AI work", "Bay"] as const;

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

function overlaps(a: Box, b: Box): boolean {
  return !(
    a.right <= b.left ||
    b.right <= a.left ||
    a.bottom <= b.top ||
    b.bottom <= a.top
  );
}

async function capture(name: string): Promise<void> {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    throw new Error("the Presenter review test has no browser viewport frame");
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
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`output/design-review/presenter-review/${name}`, shot.data, {
      encoding: "base64",
    });
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

for (const viewport of [
  { width: 1440, height: 900, name: "1440x900" },
  { width: 1024, height: 580, name: "1024x580" },
  { width: 390, height: 580, name: "390x580" },
] as const) {
  test(`the populated real Review session and six-action bar fit at ${viewport.name}`, {
    timeout: 60_000,
  }, async () => {
    await page.viewport(viewport.width, viewport.height);
    window.history.replaceState(null, "", ROUTE);
    render(<App />);

    expect(await screen.findByText("Review mistake · 3 remaining")).toBeInTheDocument();
    const bar = screen.getByRole("navigation", { name: "Presenter actions" });
    const buttons = within(bar).getAllByRole<HTMLButtonElement>("button");
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(ACTIONS);
    for (const button of buttons) {
      const box = button.getBoundingClientRect();
      expect(box.width, `${button.textContent} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${button.textContent} height`).toBeGreaterThanOrEqual(44);
      expect(box.left, `${button.textContent} clips left`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${button.textContent} clips right`).toBeLessThanOrEqual(
        viewport.width,
      );
      expect(box.bottom, `${button.textContent} clips below`).toBeLessThanOrEqual(
        viewport.height,
      );
    }

    const field = screen.getByRole<HTMLInputElement>("textbox");
    const check = screen.getByRole<HTMLButtonElement>("button", { name: "Check" });
    for (const [label, control] of [
      ["answer field", field],
      ["Check", check],
    ] as const) {
      const box = control.getBoundingClientRect();
      expect(box.width, `${label} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${label} height`).toBeGreaterThanOrEqual(44);
      expect(box.left, `${label} clips left`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${label} clips right`).toBeLessThanOrEqual(viewport.width);
    }
    const reviewCard = document.querySelector<HTMLElement>(".review-mistakes-card");
    if (!reviewCard) {
      throw new Error("the real Review session is missing its question card");
    }
    expect(
      reviewCard.scrollWidth,
      "the Review question or controls overflow their responsive card",
    ).toBeLessThanOrEqual(reviewCard.clientWidth);

    fireEvent.change(field, { target: { value: "999999" } });
    fireEvent.click(check);
    const feedback = await screen.findByText(/This mistake stays here/i);
    const back = document.querySelector<HTMLElement>(".advisor-lesson__back");
    const prompt = document.querySelector<HTMLElement>("#review-mistake-prompt");
    const answerRow = field.closest<HTMLElement>(".lesson-player__row");
    if (!back || !prompt || !answerRow) {
      throw new Error("the real Review session is missing a protected learning control");
    }

    const barBox = bar.getBoundingClientRect();
    for (const [label, element] of [
      ["Back action", back],
      ["prompt", prompt],
      ["answer field", answerRow],
      ["feedback", feedback],
    ] as const) {
      element.scrollIntoView({ block: "nearest" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const box = element.getBoundingClientRect();
      expect(box.top, `${label} is clipped above the viewport`).toBeGreaterThanOrEqual(0);
      expect(overlaps(box, barBox), `${label} is covered by the Presenter action bar`).toBe(
        false,
      );
      expect(box.bottom, `${label} reaches behind the Presenter bar`).toBeLessThanOrEqual(
        barBox.top,
      );
    }

    feedback.scrollIntoView({ block: "nearest" });
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await capture(`populated-${viewport.name}.png`);

    const storage = runtimeStorage();
    const learnerId = storage?.getItem(DEV_STUDENT_KEY);
    const current = learnerId
      ? readReviewMistakes(learnerId, "bronze_age", storage)[0]
      : undefined;
    const item = current ? practiceItemsById.get(current.itemVersionId) : undefined;
    if (!item || typeof item.answer.answer_key !== "string") {
      throw new Error("the Presenter review item has no canonical text answer");
    }
    fireEvent.change(field, { target: { value: item.answer.answer_key } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() =>
      expect(screen.getByText("Review mistake · 2 remaining")).toBeInTheDocument(),
    );
  });
}
