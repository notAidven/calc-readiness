import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  inputs,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { LikeTermsSorter } from "./LikeTermsSorter";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function tray(host: HTMLElement): HTMLElement {
  const el = host.querySelector<HTMLElement>(".lesson-sorter__tray");
  if (!el) {
    throw new Error("tray not found");
  }
  return el;
}

function bins(host: HTMLElement): HTMLElement {
  const el = host.querySelector<HTMLElement>(".lesson-sorter__bins");
  if (!el) {
    throw new Error("bins not found");
  }
  return el;
}

/**
 * Chips and bins are addressed by accessible name, not visible text: their labels are
 * typeset by KaTeX, so `x^{2}` reads as "x2" (twice over, once per output layer) and
 * would never match the "x²" a reader sees.
 */
function labelled(root: ParentNode, name: string): HTMLButtonElement {
  const el = root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  if (!el) {
    throw new Error(`button not found: ${name}`);
  }
  return el;
}

function trayNames(host: HTMLElement): string[] {
  return Array.from(tray(host).querySelectorAll("button")).map(
    (b) => b.getAttribute("aria-label") ?? "",
  );
}

async function placeChip(host: HTMLElement, chip: string, bin: string): Promise<void> {
  labelled(tray(host), chip).click(); // select (tap the tray chip)
  // Wait for the selection to render so the bin's click handler sees it (React flushes
  // the state update between the two discrete events).
  await waitFor(
    () => labelled(tray(host), chip).getAttribute("aria-pressed") === "true",
    `selected ${chip}`,
  );
  labelled(bins(host), bin).click(); // drop (tap the bin)
  await waitFor(() => !trayNames(host).includes(chip), `placed ${chip}`);
}

test("LikeTermsSorter gates only after each bin's combined term is TYPED", async () => {
  let completed = 0;
  h = mount(<LikeTermsSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => tray(host).querySelectorAll("button").length === 5, "chips mount");

  await placeChip(host, "3x", "x terms");
  await placeChip(host, "5x", "x terms");
  await placeChip(host, "x squared", "x squared terms");
  await placeChip(host, "negative 2", "constants");
  await placeChip(host, "4", "constants");

  // Sorting alone must NOT gate or auto-reveal the combined expression.
  await waitFor(() => inputs(host).length === 3, "combine inputs appear");
  expect(completed).toBe(0);
  expect(hasMath(host, "x^{2} + 8x + 2")).toBe(false);

  // Type each bin's combined term (x terms, x² terms, constants).
  const [xIn, x2In, cIn] = inputs(host);
  if (!xIn || !x2In || !cIn) {
    throw new Error("expected three combine inputs");
  }
  setInputValue(xIn, "8x");
  setInputValue(x2In, "x^2");
  setInputValue(cIn, "2");
  findButton(host, "Check").click();

  await waitFor(() => completed === 1, "gates after combine is typed");
  expect(hasMath(host, "x^{2} + 8x + 2")).toBe(true);
});

test("LikeTermsSorter clears a stale drag id when a chip is dropped outside a bin", async () => {
  let completed = 0;
  h = mount(<LikeTermsSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => tray(host).querySelectorAll("button").length === 5, "chips mount");

  // Begin dragging 3x, then end the drag OUTSIDE any bin (no drop). onDragEnd must
  // clear the ref; otherwise the next bin click would consume the stale "3x".
  const threeX = labelled(tray(host), "3x");
  threeX.dispatchEvent(new Event("dragstart", { bubbles: true }));
  threeX.dispatchEvent(new Event("dragend", { bubbles: true }));

  // Now TAP x² and place it in its bin. With the fix, the tapped chip is placed and
  // 3x stays in the tray. With the stale-id bug, the bin would instead act on "3x"
  // (a mismatch → "Not a match") and x² would never land.
  await placeChip(host, "x squared", "x squared terms");
  expect(trayNames(host)).toContain("3x");
  expect(hasText(host, "Not a match")).toBe(false);
});
