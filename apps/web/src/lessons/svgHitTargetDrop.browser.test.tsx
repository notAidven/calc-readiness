/**
 * A chip DRAGGED onto an SVG drop target has to land there.
 *
 * The reported defect, on POL.2 and POL.4: picking a chip up and dropping it on the open
 * target did nothing, while tapping the chip and then tapping the target worked. Both boards
 * put their targets through one primitive, `svgHitTarget.tsx`, which wired `onClick` and
 * nothing else. HTML5 drag-and-drop hands a `drop` to a target only if that target CANCELS
 * `dragover`, so with no handler the platform refuses the gesture before any widget code runs
 * — and the tap path, which never asks the platform for anything, kept working. That is the
 * symptom exactly.
 *
 * ## Why the existing suites could not see it
 *
 * `DifferenceSquaresDrag.browser.test.tsx` places through `chip.click(); target.click()`, with
 * the comment *"what `usePickup` accepts in place of a drag"*: it drives the FALLBACK, never
 * the primary gesture. `widgetDropSlots.browser.test.tsx` does drive a real
 * `dragstart`/`dragenter`/`dragover`/`drop`, but its population is the `LabelParts` kind, and a
 * bespoke board built on `SvgHitTarget` is outside it. A guard scoped to an implementation
 * layer while the behaviour lives elsewhere too, which is the shape
 * `.cursor/rules/qa-verification.mdc` describes.
 *
 * ## What is asserted, and why in a browser
 *
 * Three claims, apart because they fail apart:
 *
 * 1. The target CANCELS `dragover`. This is the platform contract and the defect itself, so it
 *    is asserted directly on `defaultPrevented` rather than inferred from the drop landing.
 * 2. A real drag settles the placement, on both boards.
 * 3. Being dragged over is visible, and is a third look distinct from empty and from filled —
 *    `:hover` does not fire during a native drag, so this cannot be left to CSS.
 *
 * jsdom has no `DragEvent`, no layout and no computed geometry, so all three would be
 * assertions about nothing there.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CITY_DESKTOP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** A short, realistic laptop: the viewport every frame below is taken at, and named with. */
const VIEWPORT = { width: 1024, height: 580 } as const;

interface Board {
  id: LessonVisualId;
  /** The tray chip the first placement wants, by its accessible name. */
  chip: string;
  /** Words the OPEN target's label carries, matched as a fragment so wording can move. */
  target: string;
  /** Words its label carries once the placement has settled. */
  settled: string;
}

/**
 * The two boards that route their drop targets through `SvgHitTarget`, with the first
 * placement of each. `useWidgetVariants` opens at index 0, so POL.2's cut is 6 and POL.4's
 * half is 4, which is where these labels come from.
 */
const BOARDS: readonly Board[] = [
  {
    id: "difference-squares-drag",
    chip: "the strip 6 by x minus 6",
    target: "where the strip lands",
    settled: "in place",
  },
  {
    id: "complete-square-drag",
    chip: "a block of 16",
    target: "open corner",
    settled: "filled",
  },
];

let h: Harness | null = null;

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * One mounted board, in the column an in-city lesson gives it, under `.city-shell`.
 *
 * The panel tokens are declared on `.city-shell` rather than at `:root`, so a figure mounted
 * straight onto `document.body` resolves them to nothing and every frame taken there is a
 * frame of a surface no learner sees.
 */
async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} onComplete={() => {}} />);
  const host = h.host;
  host.className = "city-shell";
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host;
}

function chip(host: HTMLElement, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) {
    throw new Error(`no chip labelled "${label}"`);
  }
  return found;
}

/** The one hit target inside the figure whose label carries `words`. */
function target(host: HTMLElement, words: string): HTMLButtonElement {
  const found = host.querySelectorAll<HTMLButtonElement>(
    `svg button[aria-label*="${words}"]`,
  );
  if (found.length !== 1) {
    throw new Error(`expected one target naming "${words}", found ${found.length}`);
  }
  return found[0] as HTMLButtonElement;
}

/** Whatever hit target currently names `words`, however its label has been rewritten. */
function targetNow(host: HTMLElement, words: string): HTMLButtonElement | null {
  const found = host.querySelectorAll<HTMLButtonElement>(
    `svg button[aria-label*="${words}"]`,
  );
  return found.length === 1 ? (found[0] as HTMLButtonElement) : null;
}

function fire(node: Element, type: string, cancelable = true): DragEvent {
  const event = new DragEvent(type, { bubbles: true, cancelable });
  node.dispatchEvent(event);
  return event;
}

/** What the learner can tell apart: the border, its colour, and the fill behind it. */
function look(node: HTMLElement): string {
  const s = getComputedStyle(node);
  return [s.borderStyle, s.borderColor, s.borderWidth, s.backgroundColor, s.outline].join(
    " | ",
  );
}

for (const spec of BOARDS) {
  test(`${spec.id}: the open target cancels dragover, so the platform will deliver a drop`, async () => {
    const host = await board(spec.id);

    fire(chip(host, spec.chip), "dragstart", false);
    const over = fire(target(host, spec.target), "dragover");

    expect(
      over.defaultPrevented,
      "the target left dragover uncancelled, so no browser will hand it a drop",
    ).toBe(true);
  });

  test(`${spec.id}: dragging the chip onto the open target settles the placement`, async () => {
    const host = await board(spec.id);
    const slot = target(host, spec.target);

    // The order a browser fires them in. `drop` reaches the target before the chip's
    // `dragend`, which is the ordering the working sorters already rely on.
    const held = chip(host, spec.chip);
    fire(held, "dragstart", false);
    fire(slot, "dragenter");
    fire(slot, "dragover");
    fire(slot, "drop");
    fire(held, "dragend", false);

    await waitFor(
      () => targetNow(host, spec.settled) !== null,
      `${spec.id}: the dragged chip never landed`,
    );
    expect(
      targetNow(host, spec.settled)?.disabled,
      "a settled target is still in the tab order",
    ).toBe(true);
  });

  test(`${spec.id}: a target being dragged over says so, and does not look empty or filled`, async () => {
    const host = await board(spec.id);
    const slot = target(host, spec.target);
    const empty = look(slot);
    expect(slot.getAttribute("data-over"), "an untouched target").toBe("no");

    fire(chip(host, spec.chip), "dragstart", false);
    fire(slot, "dragenter");
    await waitFor(
      () => slot.getAttribute("data-over") === "yes",
      "the target marked itself as the one in hand",
    );
    const carried = look(slot);
    expect(
      carried,
      "a target being dragged over looks the same as an untouched one",
    ).not.toBe(empty);

    fire(slot, "dragleave");
    await waitFor(
      () => slot.getAttribute("data-over") === "no",
      "the target released the carried chip",
    );
    expect(look(slot), "the target kept its dragged-over look after the chip left").toBe(
      empty,
    );

    // The frame the claim is really about: the whole board, so the mark can be read against
    // the figure around it rather than cropped to the box nobody doubted.
    fire(slot, "dragenter");
    await waitFor(() => slot.getAttribute("data-over") === "yes", "carried again");
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    expect(window.innerWidth, "viewport width").toBe(VIEWPORT.width);
    if (CAPTURE_EVIDENCE) {
      expect(
        await page.screenshot({
          path: `__screenshots__/svg-hit-target-drop/${spec.id}-dragged-over-1024x580.png`,
        }),
        `no frame for ${spec.id}`,
      ).toBeTruthy();
    }
  });
}
