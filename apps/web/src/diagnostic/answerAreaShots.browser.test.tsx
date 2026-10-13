import { DIAGNOSTIC_WALK_ITEM_PACK, type FrozenItem } from "@cr/item-bank";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { SessionProvider } from "../auth/SessionContext";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { DIAGNOSTIC_CHECKER_VERSION, diagnosticAnswerChecker } from "./browserRuntime";
import { DiagnosticRunner } from "./DiagnosticRunner";

import "../styles.css";
import "./diagnostic-demo.css";
import "./diagnostic-answer.css";
import "./diagnostic-dev-skip.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE ANSWER AREA, ON THE LEARNER'S OWN MOUNT, AT A SHORT REAL VIEWPORT.**
 *
 * Two claims here are spatial, and `.cursor/rules/qa-verification.mdc` says a spatial claim owes
 * a rendered frame at a short, named viewport rather than a passing measurement:
 *
 *  1. a refused submit produces a bar the learner can SEE, in the room the screen actually has;
 *  2. what is left of the answer area with the INSERT NOTATION strip removed is resolved rather
 *     than cramped — field, one quiet notation line, preview, submit.
 *
 * ## The mount is the learner's, and it is reproduced rather than approximated
 *
 * `App.tsx` reaches this surface as `.surface-overlay--diagnostic > .surface-overlay-frame--diagnostic
 * > .surface-overlay-head--diagnostic + .surface-overlay-body--diagnostic`, and those four
 * selectors are where the surface's own sizing lives: `min-height: 100dvh` on the frame, a
 * `clamp(var(--space-2xl), 5vw, var(--space-4xl))` body pad, a sticky head above it. Mounting
 * `DiagnosticRunner` bare would photograph a card with none of that around it and would
 * understate the crowding by the height of the head plus two pads. So {@link LearnerSurface}
 * carries the same wrapper elements with the same classes, and both stylesheets are imported.
 *
 * There is no `?dev` frame in this lane and none is used: the dev SKIP panel (`DiagnosticDevSkip`)
 * is a control inside this same surface rather than an alternative mount of it, and it is not
 * pressed here — every question below is reached by pressing Start and typing, which is what a
 * learner does.
 *
 * ## The fold is a real box
 *
 * These tests run inside an iframe that sizes itself to its content, so `fullPage: false` would
 * still photograph a 1900px document and caption it 1024x580. {@link Fold} is a real 1024x580
 * box with `overflow: hidden`, so what the frame cuts off is what a learner's fold cuts off —
 * the same device `widenedScopeShots.browser.test.tsx` uses and for the same reason.
 *
 * Frames land in the gitignored `__screenshots__` directory. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/diagnostic/answerAreaShots.browser.test.tsx
 */

const SHORT_LAPTOP = { width: 1024, height: 580 } as const;

let harness: Harness | null = null;
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

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

/** A real 1024x580 box, so a clipped frame is clipped by layout rather than by an option. */
function Fold({ children }: { children: ReactNode }) {
  return (
    <div
      className="shot-fold"
      style={{
        width: SHORT_LAPTOP.width,
        height: SHORT_LAPTOP.height,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/** The overlay chrome `App.tsx` puts around the runner, class for class. */
function LearnerSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="surface-overlay surface-overlay--diagnostic"
      role="dialog"
      aria-modal="true"
    >
      <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
        <header className="surface-overlay-head surface-overlay-head--diagnostic">
          <span className="surface-overlay-brand">Diagnostic</span>
          <button type="button" className="city-action">
            Back to city
          </button>
        </header>
        <div className="surface-overlay-body surface-overlay-body--diagnostic">
          {children}
        </div>
      </div>
    </div>
  );
}

async function shoot(name: string): Promise<void> {
  /*
   * THE DEV PANEL IS REMOVED BEFORE EVERY FRAME, which makes these MORE faithful rather than
   * less: `DiagnosticDevSkip` reads `VITE_DIAGNOSTIC_API_URL` itself and renders nothing at all
   * on a learner build (`docs/Deployment.md` bakes the variable in), so a frame with it in is a
   * frame of a screen no learner has. It is `position: fixed` and contributes no layout, so
   * nothing measured above or below this call moves with it.
   */
  document.querySelector('[data-testid="dgx-dev-skip"]')?.remove();
  // Re-asserted per shot rather than once in `beforeAll`: a mount can settle after the viewport
  // call, and a frame taken "at 1024x580" that was taken at the harness default says nothing.
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
  await new Promise<void>((resolve) => setTimeout(resolve, 150));
  expect(window.innerWidth, "the viewport did not take").toBe(SHORT_LAPTOP.width);
  await document.fonts.ready;
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({ path: `__screenshots__/${name}.png` }),
      `no frame for ${name}`,
    ).toBeTruthy();
  }
}

const ITEM_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

function servedItem(): FrozenItem {
  const id =
    document.querySelector(".diagnostic-item")?.getAttribute("data-item-version-id") ?? "";
  const item = ITEM_BY_ID.get(id);
  if (!item) {
    throw new Error(`the runner served an item the pack does not carry: ${id}`);
  }
  return item;
}

function verdict(item: FrozenItem, raw: unknown): string {
  return diagnosticAnswerChecker({
    raw_answer: raw,
    item_version_id: item.item_version_id,
    equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
  }).status;
}

/** The candidate keystrokes, headed by the one the report names, checked against the item. */
function unreadableInputFor(item: FrozenItem): string {
  for (const candidate of ["a", "√2", "#"]) {
    const raw =
      item.answer.answer_spec.answer_type === "rational_answer"
        ? { expression: candidate, excluded_values: candidate }
        : candidate;
    if (verdict(item, raw) === "invalid_input") {
      return candidate;
    }
  }
  throw new Error(`${item.item_version_id} reads every candidate keystroke`);
}

async function startTheDiagnostic(): Promise<void> {
  harness = mount(
    <Fold>
      <LearnerSurface>
        <SessionProvider>
          <DiagnosticRunner />
        </SessionProvider>
      </LearnerSurface>
    </Fold>,
  );
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 20_000);
  findButton(document.body, /Start the diagnostic/).click();
  await waitFor(
    () => document.querySelector(".dgx-probe") !== null,
    "the first question",
    20_000,
  );
}

function fields(): HTMLInputElement[] {
  return [
    ...(document.querySelectorAll<HTMLInputElement>(
      ".diagnostic-item input[type='text']",
    ) ?? []),
  ];
}

/**
 * THE REFUSAL BAR, framed on the surface rather than cropped to itself.
 *
 * A crop of the bar would be a picture of the one thing nobody doubted. What is being judged is
 * whether it is on the screen at all at 580px of window, with the question, the field and the
 * submit still around it — and whether it pushed any of them off.
 */
test("an unreadable answer is refused with a visible bar at 1024x580", async () => {
  await startTheDiagnostic();
  const item = servedItem();
  const typed = unreadableInputFor(item);

  // Before: no bar, and the question is on screen. The frame pair is what makes the after
  // comparable — this one says what the learner had before they pressed anything.
  expect(document.querySelector(".dgx-answer__notice")).toBeNull();
  await shoot("diagnostic-answer-before-1024x580");

  for (const input of fields()) {
    setInputValue(input, typed);
  }
  findButton(document.body, /Submit answer/).click();
  await waitFor(
    () => document.querySelector(".dgx-answer__notice") !== null,
    "the refusal bar",
  );

  const bar = document.querySelector<HTMLElement>(".dgx-answer__notice") as HTMLElement;
  expect(bar.getAttribute("role")).toBe("alert");
  expect(bar.getAttribute("data-tone")).toBe("unreadable");
  expect(bar.textContent ?? "").toMatch(/couldn't read that/i);

  /*
   * PAINTED, AND INSIDE THE FOLD — which on this screen it is not by itself. The probe card is
   * taller than 580px (measured below), so the bar renders at y=678 and the answer row scrolls
   * it into view; `.surface-overlay` is the scrollport (`overflow: auto`, 828px of content in a
   * 580px box) and `DiagnosticAnswer`'s effect moves it by the least that makes the bar visible.
   * The assertion is on the position a learner reads it at, after that, because an alert that
   * only renders is an alert nobody reads.
   */
  const box = bar.getBoundingClientRect();
  expect(box.height, "the bar has no height").toBeGreaterThan(16);
  expect(box.width, "the bar has no width").toBeGreaterThan(200);
  expect(box.top, "the bar is above the viewport").toBeGreaterThanOrEqual(0);
  expect(box.bottom, "the bar is below the fold").toBeLessThanOrEqual(SHORT_LAPTOP.height);

  // The submit is still reachable above it, which is the thing a bar can take away.
  const submit = document.querySelector<HTMLElement>(".dgx-answer__submit") as HTMLElement;
  expect(
    submit.getBoundingClientRect().bottom,
    "the refusal bar pushed the submit off the fold",
  ).toBeLessThanOrEqual(SHORT_LAPTOP.height);

  // And the question has not moved on, which is the other half of the fix.
  expect(document.querySelector(".dgx-probe__head")?.textContent ?? "").toContain(
    "Question 1",
  );

  await shoot("diagnostic-answer-unreadable-1024x580");
});

/**
 * THE RESOLVED ANSWER AREA, on a question whose answer needs notation — which is the only kind
 * that ever had the strip, so it is the only kind whose layout the removal changed.
 *
 * Reached by answering the served questions correctly until the walk serves one, which keeps
 * this on the learner's own path: no dev rung is pressed and no item is injected. The frame is
 * the whole fold, because "what is left is resolved rather than cramped" is a claim about the
 * space around the control and not about the control.
 */
test("the answer area with a notation line is resolved at 1024x580", async () => {
  await startTheDiagnostic();

  let framed = false;
  for (let asked = 0; asked < 40 && !framed; asked += 1) {
    const item = servedItem();
    const hasColumn = document.querySelector(".cr-math-answer") !== null;
    if (hasColumn) {
      const preview = document.querySelector<HTMLElement>(
        ".cr-math-preview",
      ) as HTMLElement;
      const caption = preview.querySelector<HTMLElement>(".micro-label");
      expect(
        preview.getAttribute("data-empty"),
        "preview row is not in its empty state",
      ).toBe("true");
      expect(caption?.textContent?.trim(), "empty preview row has no caption").toBe(
        "Preview",
      );
      if (!caption) {
        throw new Error("empty preview row produced no caption");
      }
      expect(getComputedStyle(caption).visibility, "empty preview caption is hidden").toBe(
        "visible",
      );
      await shoot("diagnostic-answer-preview-empty-1024x580");

      // Type the item's own answer key, so the preview has something real to read back and the
      // frame shows the column in the state a learner sees it in mid-answer.
      const key = String(item.answer.answer_key ?? "");
      const inputs = fields();
      setInputValue(
        inputs[0] as HTMLInputElement,
        key.slice(0, Math.max(1, key.length - 1)),
      );
      await waitFor(
        () => (document.querySelector(".cr-math-notation")?.textContent ?? "") !== "",
        "the notation line takes over from the placeholder",
      );

      const line = document.querySelector<HTMLElement>(".cr-math-notation") as HTMLElement;
      const submit = document.querySelector<HTMLElement>(
        ".dgx-answer__submit",
      ) as HTMLElement;

      // The strip is not back, on a surface that really has a column.
      expect(document.querySelector(".diagnostic-item fieldset")).toBeNull();
      expect(document.querySelectorAll(".cr-math-answer button")).toHaveLength(0);

      const lineBox = line.getBoundingClientRect();
      const previewBox = preview.getBoundingClientRect();
      const submitBox = submit.getBoundingClientRect();
      const rowBox = (
        document.querySelector(".dgx-answer") as HTMLElement
      ).getBoundingClientRect();

      // In order, each painted, none overlapping the next.
      expect(lineBox.height, "the notation line has no height").toBeGreaterThan(8);
      expect(
        previewBox.top,
        "the preview is above the notation line",
      ).toBeGreaterThanOrEqual(lineBox.bottom);
      expect(submitBox.top, "the submit is above the preview").toBeGreaterThanOrEqual(
        previewBox.bottom - 1,
      );

      // The field and the guidance it needs are both above the fold, which is what the strip's
      // removal bought back: the strip stood exactly where the line is, and its own retired
      // fingerprint pinned a 44px minimum key box inside `var(--space-xs)` padding under a
      // letterspaced caption, against the 18px the line takes.
      expect(
        (inputs[0] as HTMLInputElement).getBoundingClientRect().bottom,
        "the answer field is below the fold",
      ).toBeLessThanOrEqual(SHORT_LAPTOP.height);
      expect(lineBox.bottom, "the notation line is below the fold").toBeLessThanOrEqual(
        SHORT_LAPTOP.height,
      );

      /*
       * THE ANSWER ROW'S OWN BUDGET, which is the part this lane can be held to. Measured at this
       * tip: the row is 152.4px — field 44, notation line 18.4, preview 32, submit 44, plus three
       * 4px gaps.
       *
       * **THE CEILING WAS 150 AND THE PRESENTATION LANE'S FIX SPENT 2.4 OF IT, WHICH IS A TRADE
       * WORTH NAMING RATHER THAN A REGRESSION.** Written against the strip's removal alone, this
       * row was 144px: field 32, line 18, preview 38, submit 48. Three of those four moved when
       * the diagnostic's own answer CSS landed, and only one moved up.
       *
       *   field   32 -> 44   the field was the USER AGENT'S: `border: 2px inset rgb(118,118,118)`,
       *                      square corners, 21px of box. It is now dressed and is a 44px tap
       *                      target, which is the reported "the answer box looks weird again".
       *   preview 38 -> 32   `min-height: 2rem` on a short screen
       *   submit  48 -> 44   still at the 44px floor, and no lower
       *   gaps     8 ->  4   `--space-sm` to `--space-xs`, three times
       *
       * A dressed field is not a new AID, which is what this ceiling exists to refuse: the row
       * still holds exactly the field, one quiet line, the preview and the submit, and the strip
       * assertions above are what say so. So the ceiling moves to 156 — 2.4px of headroom over the
       * measurement, an eighth of the 18.4px line and a third of the 12px a restored key box would
       * cost — rather than being deleted.
       *
       * AND THE CARD NOW FITS THE FOLD, which this file could not previously assert. It used to
       * record that the submit's bottom landed at 625 on a 580px screen and that closing the 45px
       * was the presentation layer's rather than the answer row's. The presentation layer closed
       * it: `@media (max-height: 700px)` in `diagnostic-demo.css` takes the air out of the overlay
       * pad, the probe head, the card and the prompt panel, and the submit's bottom lands at 526.7
       * here. That is asserted below, because it is the claim a learner actually cares about and
       * it is strictly stronger than the row budget above it.
       *
       * **156 -> 162, AND AGAIN IT BUYS SEPARATION RATHER THAN AN AID.** The row measures 159.4px
       * at this tip. The 8px is the two vertical gaps inside the shared column: the notation line
       * went from 2px off the field to 6px, having been reported as crowding it, and the preview's
       * own margin went from 8px to 12px because `mathAnswerColumn` asserts the RELATION between
       * those two gaps rather than either number — the preview must be further from the line than
       * the line is from the field, or the three stop reading as control-then-readback. So the
       * seam could not move alone.
       *
       * The ceiling still refuses what it was written to refuse. The row holds the same four
       * things it held before, and the strip assertions above are what say so; a restored key box
       * costs 12px minimum, which reads 171.4 and fails here. The fold claim below did not move
       * with it either: 526.7 on a 580px screen leaves 53px, so the 8px came out of slack and not
       * out of the learner's sight of the control.
       */
      expect(
        rowBox.height,
        "the answer row has grown past the budget the strip's removal recovered",
      ).toBeLessThanOrEqual(162);
      expect(
        submitBox.bottom,
        "the submit button ends below a 580px fold, so a learner cannot see the control that answers the question",
      ).toBeLessThanOrEqual(SHORT_LAPTOP.height);

      await shoot("diagnostic-answer-notation-line-1024x580");
      framed = true;
      break;
    }

    // Not a notation item: answer it correctly and let the walk serve the next one.
    const key = item.answer.answer_key;
    const inputs = fields();
    if (item.answer.answer_spec.answer_type === "rational_answer") {
      setInputValue(inputs[0] as HTMLInputElement, String(key ?? ""));
      setInputValue(
        inputs[1] as HTMLInputElement,
        (item.answer.excluded_values ?? []).join(", "),
      );
    } else {
      setInputValue(inputs[0] as HTMLInputElement, String(key ?? ""));
    }
    const before =
      document.querySelector(".diagnostic-item")?.getAttribute("data-item-version-id") ??
      "";
    findButton(document.body, /Submit answer/).click();
    await waitFor(() => {
      const now =
        document.querySelector(".diagnostic-item")?.getAttribute("data-item-version-id") ??
        "";
      return now !== before || document.querySelector(".dgx-results") !== null;
    }, "the walk advances");
    if (document.querySelector(".dgx-results") !== null) {
      break;
    }
  }

  expect(framed, "the walk served no question whose answer needs notation").toBe(true);
});
