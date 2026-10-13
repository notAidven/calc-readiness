/**
 * The RAT.4 "which bar divides?" widget in a real browser.
 *
 * The click target is the drawn bar itself, hosted in a `foreignObject` laid over the line.
 * That only works if the boxes are actually reachable: they sit above the KaTeX labels in
 * paint order and must not overlap each other, or one bar would answer for another. A real
 * browser is the only place that layout can be checked, so these cases click by coordinate
 * as well as by label.
 */

import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

const MAIN = "pick the long bar across the middle of the expression";
const TOP = "pick the short bar inside the top fraction";
const BOTTOM = "pick the short bar inside the bottom fraction";

function findAria(root: ParentNode, label: string): HTMLButtonElement {
  const match = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!match) {
    throw new Error(`no control labelled: ${label}`);
  }
  return match;
}

/** The bar's drawn rule, in document order: top, main, bottom. */
function barLine(host: HTMLElement, index: number): SVGLineElement {
  const line = host.querySelectorAll("svg line")[index];
  if (!line) {
    throw new Error(`no bar drawn at index ${index}`);
  }
  return line as SVGLineElement;
}

/** The highlight band under the hovered bar, if one is painted. */
function band(host: HTMLElement): SVGRectElement | null {
  return host.querySelector("svg rect");
}

/** React derives onPointerEnter/onPointerLeave from the bubbling over/out pair. */
function pointer(target: Element, type: "pointerover" | "pointerout"): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true }));
}

async function mountWidget(onComplete?: () => void): Promise<HTMLElement> {
  h = mount(<LessonVisual id="rational-nested-bar-play" onComplete={onComplete} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "widget mounts");
  return host;
}

test("the bars are the controls: no chip row, one button per bar", async () => {
  const host = await mountWidget();

  const labels = Array.from(host.querySelectorAll("button")).map((b) =>
    b.getAttribute("aria-label"),
  );
  expect(labels).toEqual([TOP, MAIN, BOTTOM]);
  expect(host.querySelectorAll(".lesson-interactive__chip").length).toBe(0);

  // Each button lives in the SVG, over its own bar, and none of the three boxes overlap.
  const boxes = [TOP, MAIN, BOTTOM].map((label) => {
    const button = findAria(host, label);
    expect(
      button.closest("foreignObject"),
      `${label} is drawn in the diagram`,
    ).not.toBeNull();
    const rect = button.getBoundingClientRect();
    expect(rect.width, `${label} has width`).toBeGreaterThan(0);
    expect(rect.height, `${label} has height`).toBeGreaterThan(0);
    return rect;
  });
  const [top, main, bottom] = boxes as [DOMRect, DOMRect, DOMRect];
  expect(top.bottom, "the top box clears the main bar").toBeLessThan(main.top);
  expect(main.bottom, "the main box clears the bottom bar").toBeLessThan(bottom.top);
});

test("clicking a short bar explains why it is only an inner measure", async () => {
  let completed = 0;
  const host = await mountWidget(() => completed++);

  findAria(host, TOP).click();
  await waitFor(
    () => hasText(host, "only divides inside the top fraction"),
    "top is refused",
  );

  findAria(host, BOTTOM).click();
  await waitFor(
    () => hasText(host, "only divides inside the bottom fraction"),
    "bottom is refused",
  );
  expect(completed, "a wrong bar does not gate the lesson").toBe(0);
});

test("clicking the main bar reveals the division reading and gates", async () => {
  let completed = 0;
  const host = await mountWidget(() => completed++);

  // Click at the center of the bar rather than on the element, so a hit box that is
  // mispositioned or covered by a label fails here.
  const rect = findAria(host, MAIN).getBoundingClientRect();
  const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  expect(hit, "the main bar's own button is the topmost element over it").toBe(
    findAria(host, MAIN),
  );
  (hit as HTMLButtonElement).click();

  await waitFor(() => completed === 1, "the main bar gates the lesson");
  expect(
    hasMath(host, "\\dfrac{2}{x - 5} \\div \\dfrac{7}{x}"),
    "the division reading posts to the figure",
  ).toBe(true);
  expect(findAria(host, TOP).disabled, "the other bars lock once solved").toBe(true);

  findButton(host, "Start over").click();
  await waitFor(() => !hasMath(host, "\\div"), "Start over clears the reading");
  expect(findAria(host, MAIN).disabled, "the bars are live again").toBe(false);
});

test("hovering a bar lights the bar and its click target", async () => {
  const host = await mountWidget();

  const main = barLine(host, 1);
  const resting = main.getAttribute("stroke");
  expect(band(host), "nothing is highlighted at rest").toBeNull();

  pointer(findAria(host, MAIN), "pointerover");
  await waitFor(() => band(host) !== null, "the hovered bar gets a band");

  const lit = band(host) as SVGRectElement;
  expect(main.getAttribute("stroke"), "the hovered rule changes color").not.toBe(resting);
  const barBox = main.getBoundingClientRect();
  const bandBox = lit.getBoundingClientRect();
  expect(bandBox.height, "the band shows the full hit box").toBeGreaterThan(barBox.height);
  expect(bandBox.width, "the band is at least as wide as the bar").toBeGreaterThan(
    barBox.width,
  );

  pointer(findAria(host, MAIN), "pointerout");
  await waitFor(() => band(host) === null, "leaving the bar clears the highlight");
  expect(main.getAttribute("stroke"), "the rule returns to its resting color").toBe(
    resting,
  );
});

test("tabbing to a bar highlights it, and solving clears the highlight", async () => {
  const host = await mountWidget();

  findAria(host, BOTTOM).focus();
  await waitFor(() => band(host) !== null, "keyboard focus highlights the same way");

  findAria(host, BOTTOM).blur();
  await waitFor(() => band(host) === null, "blur clears it");

  // The winning click disables the buttons, and a disabled button fires no leave event,
  // so the highlight has to be dropped by the solved state rather than by the pointer.
  pointer(findAria(host, MAIN), "pointerover");
  await waitFor(() => band(host) !== null, "the main bar highlights");
  findAria(host, MAIN).click();
  await waitFor(() => band(host) === null, "solving clears the stranded highlight");
});
