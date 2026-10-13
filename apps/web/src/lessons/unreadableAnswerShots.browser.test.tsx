import type { FrozenItem } from "@cr/item-bank";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { LessonCfu } from "./cfu";
import { gradeCfuAnswer } from "./cfuChecker";
import { allLessons } from "./domains";
import { LessonPractice } from "./LessonPractice";
import {
  checkerVersionForItem,
  practiceChecker,
  practiceItemsById,
} from "./practiceChecker";
import { fixedSource } from "./practiceSurfaceFixture";
import { UNREADABLE_LEAD } from "./unreadableAnswer";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE REFUSAL, ON THE LESSON SURFACES, AT A SHORT REAL VIEWPORT.**
 *
 * The diagnostic's frames are in `apps/web/src/diagnostic/answerAreaShots.browser.test.tsx`. These
 * are the other two surfaces the report named — graded practice and the end-of-lesson check — and
 * they are framed because the claim is spatial twice over: the note has to be ON the screen at
 * 580px of window, and it has to be readable as a refusal rather than as the miss treatment
 * sitting a few pixels away from it.
 *
 * 1024x580 per `.cursor/rules/qa-verification.mdc`. The lesson surfaces mount inside the lesson
 * player rather than an overlay, so {@link Fold} is a real 1024x580 box with `overflow: hidden`:
 * these tests run in an iframe that sizes itself to its content, so `fullPage: false` would
 * photograph the whole document and caption it 1024x580.
 *
 * There is no `?dev` frame here and none is used. `?dev` is the LESSON STEPPER's route, and it
 * gives `WorldScene` `size="full"`, which sets `max-height: none` on the card and hides real
 * overflow (`styles.css`); the mounts below are the components as the player renders them.
 *
 * Frames land in the gitignored `__screenshots__` directory. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/lessons/unreadableAnswerShots.browser.test.tsx
 */

const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const CANDIDATES = ["a", "√2", "#"] as const;

let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(cleanup);

function Fold({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="shot-fold"
      style={{
        width: SHORT_LAPTOP.width,
        height: SHORT_LAPTOP.height,
        overflow: "hidden",
        background: "var(--paper, #fff)",
      }}
    >
      <div className="lesson-player" style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

async function shoot(name: string): Promise<void> {
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
  expect(window.innerWidth, "the viewport did not take").toBe(SHORT_LAPTOP.width);
  await document.fonts.ready;
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({ path: `__screenshots__/${name}.png` }),
      `no frame for ${name}`,
    ).toBeTruthy();
  }
}

function verdictFor(item: FrozenItem, typed: string): string {
  return practiceChecker({
    raw_answer: typed,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
  }).status;
}

/**
 * An item whose own field carries a notation LINE, so the frame shows the advice quoting the
 * grammar rather than falling back to the generic sentence. That is the interesting case: it is
 * where the notation strip used to stand, and the note is what carries its rule now.
 */
function unreadablePair(): { item: FrozenItem; typed: string } {
  for (const item of practiceItemsById.values()) {
    if (item.answer.answer_spec.answer_type !== "expression") {
      continue;
    }
    if (!/\^/.test(item.answer.answer_key ?? "")) {
      continue;
    }
    for (const candidate of CANDIDATES) {
      if (verdictFor(item, candidate) === "invalid_input") {
        return { item, typed: candidate };
      }
    }
  }
  throw new Error("no served expression item with a caret refuses any candidate");
}

function note(): HTMLElement {
  const found = document.querySelector<HTMLElement>(".cr-unreadable-note");
  if (!found) {
    throw new Error("no unreadable note rendered");
  }
  return found;
}

test("graded practice: the refusal is on screen with its advice at 1024x580", async () => {
  const { item, typed } = unreadablePair();
  render(
    <Fold>
      <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />
    </Fold>,
  );

  const field = screen.getAllByRole("textbox")[0] as HTMLElement;
  fireEvent.change(field, { target: { value: typed } });
  await shoot("unreadable-practice-before-1024x580");
  fireEvent.click(screen.getByRole("button", { name: /^check$/i }));

  const bar = note();
  expect(bar.getAttribute("role")).toBe("alert");
  expect(bar.textContent ?? "").toContain(UNREADABLE_LEAD);
  // THE FIX IS IN THE FRAME, not just the complaint: the note quotes the field's own notation.
  expect(bar.textContent ?? "", "the note does not say how to write it").toMatch(
    /Write it like this:|Use \^|Put \* between|sqrt\(/,
  );

  // PAINTED, and inside the fold. A note below a 580px fold is a note nobody reads.
  const box = bar.getBoundingClientRect();
  expect(box.height, "the note has no height").toBeGreaterThan(16);
  expect(box.width, "the note has no width").toBeGreaterThan(200);
  expect(box.top).toBeGreaterThanOrEqual(0);
  expect(box.bottom, "the note is below the fold").toBeLessThanOrEqual(SHORT_LAPTOP.height);

  // AND IT IS NOT THE MISS TREATMENT. This is the claim a crop of the note could not make: the
  // surface's own wrong-answer paint is absent from the whole screen.
  expect(document.querySelectorAll('[data-status="incorrect"]')).toHaveLength(0);
  const clay = getComputedStyle(bar).color;
  expect(clay, "the note has no ink").toMatch(/\S/);

  await shoot("unreadable-practice-1024x580");
});

test("the check for understanding: the refusal replaces 'Not quite' at 1024x580", async () => {
  const found = allLessons.find((lesson) => {
    const cfu = lesson.cfu;
    if (!cfu?.check) {
      return false;
    }
    return CANDIDATES.some(
      (candidate) =>
        gradeCfuAnswer({ nodeId: lesson.node_id, cfu, index: 0, value: candidate })
          .unreadable !== null,
    );
  });
  if (!found?.cfu) {
    throw new Error("no authored CFU refuses any candidate keystroke");
  }
  const cfu = found.cfu;
  const typed = CANDIDATES.find(
    (candidate) =>
      gradeCfuAnswer({ nodeId: found.node_id, cfu, index: 0, value: candidate })
        .unreadable !== null,
  ) as string;

  render(
    <Fold>
      <LessonCfu cfu={cfu} nodeId={found.node_id} />
    </Fold>,
  );

  const field = screen.getAllByRole("textbox")[0] as HTMLElement;
  fireEvent.change(field, { target: { value: typed } });
  fireEvent.click(screen.getByRole("button", { name: /^check$/i }));

  const bar = note();
  expect(bar.textContent ?? "").toContain(UNREADABLE_LEAD);
  const box = bar.getBoundingClientRect();
  expect(box.height).toBeGreaterThan(16);
  expect(box.bottom, "the note is below the fold").toBeLessThanOrEqual(SHORT_LAPTOP.height);

  // The card's own verdict is absent: this used to read "Not quite. Try again, or reveal the
  // hint." over an answer the checker had refused to parse.
  expect(document.body.textContent ?? "").not.toMatch(/not quite/i);
  expect(document.querySelectorAll('[data-status="incorrect"]')).toHaveLength(0);

  await shoot("unreadable-cfu-1024x580");
});
