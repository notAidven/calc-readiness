import { cdp } from "vitest/browser";

/**
 * **THE PLUMBING A SPATIAL CLAIM NEEDS, IN ONE PLACE.**
 *
 * `.cursor/rules/qa-verification.mdc` decides what discharges a spatial or a contrast claim,
 * and the two things it asks for are awkward enough that every suite which needed them wrote
 * its own copy: a composited frame clipped to the tester iframe (vitest scales that iframe, so
 * `page.screenshot` and a naive `Page.captureScreenshot` both photograph the wrong rectangle),
 * and a colour read off the PAINTED pixels rather than off a declared value.
 *
 * The painted read is not a nicety. This stylesheet's palette is written in `oklch()`, a regex
 * over `getComputedStyle().color` reads those three numbers as `rgb()` and inverts the answer,
 * and half the surfaces here are translucent panels over a live 3D scene, so no declared value
 * is the background anything is actually drawn on.
 *
 * ⚑ **NOTHING HERE WRITES A FILE, deliberately.** `test/testWritesStayOutOfTheTree.test.ts`
 * scans test files for writes and records that no write reachable from a test lives outside
 * one. A `commands.writeFile` moved in here would be invisible to that sweep, so each suite
 * keeps its own `keep()` behind its own `VITE_*` shot flag and this module only ever hands back
 * bytes.
 */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface Session {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ data?: string }>;
}

function session(): Session {
  return cdp() as unknown as Session;
}

/** Where this test's viewport sits in the real window (vitest scales the tester iframe). */
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

/**
 * The composited frame, clipped to this test's viewport, as a base64 PNG.
 *
 * CDP rather than `page.screenshot`: the locator capture runs actionability checks and never
 * gets past "waiting for element to be stable" against a canvas running `frameloop="always"`.
 */
export async function captureFrame(): Promise<string> {
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

/** Emulate `prefers-reduced-motion: reduce`, so a frame is the one that learner is shown. */
export async function emulateReducedMotion(): Promise<void> {
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

export async function clearEmulatedMedia(): Promise<void> {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
}

/** The composited frame as pixels, so a colour claim is measured against what was painted. */
export async function framePixels(): Promise<(x: number, y: number) => Rgb> {
  const shot = await captureFrame();
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the captured frame did not decode"));
    image.src = `data:image/png;base64,${shot}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context, so the frame cannot be read");
  }
  context.drawImage(image, 0, 0);
  const scale = image.naturalWidth / window.innerWidth;
  return (x: number, y: number) => {
    const [r, g, b] = context.getImageData(
      Math.round(x * scale),
      Math.round(y * scale),
      1,
      1,
    ).data;
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  };
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(one: Rgb, other: Rgb): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return ((light as number) + 0.05) / ((dark as number) + 0.05);
}

/**
 * A computed colour string as sRGB bytes, resolved by PAINTING it.
 *
 * `oklch()` is what this stylesheet's palette is written in, and reading the three numbers out
 * of the returned string as if they were `rgb()` inverts the answer. A canvas fill resolves
 * every syntax the compositor does.
 */
export function toRgb(value: string): Rgb {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context, so a colour cannot be resolved");
  }
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
}

export function describeRgb({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function boxOf(element: Element): Box {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function overlapArea(one: Box, other: Box): number {
  return (
    Math.max(0, Math.min(one.right, other.right) - Math.max(one.left, other.left)) *
    Math.max(0, Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top))
  );
}

export function describeBox(box: Box): string {
  return (
    `${Math.round(box.width)}x${Math.round(box.height)}px at ` +
    `(${Math.round(box.left)}, ${Math.round(box.top)}), bottom y=${Math.round(box.bottom)}`
  );
}

/**
 * The RING a `:focus-visible` outline paints, as pixels, read just outside the control's edge.
 *
 * Sampled at the outline's own band rather than at the control's border: `outline-offset`
 * pushes the ring clear of the box, so a sample on the edge reads the border and a sample far
 * outside reads the surface. Four samples (one per side, at the midpoint) and the one furthest
 * from the surface behind it is the ring — a ring that painted nothing returns the surface, and
 * the contrast that produces is 1:1, which is the answer.
 */
export function ringSample(
  box: Box,
  pixels: (x: number, y: number) => Rgb,
  offset: number,
): readonly Rgb[] {
  const midX = box.left + box.width / 2;
  const midY = box.top + box.height / 2;
  return [
    pixels(midX, Math.max(0, box.top - offset)),
    pixels(midX, Math.min(window.innerHeight - 1, box.bottom + offset)),
    pixels(Math.max(0, box.left - offset), midY),
    pixels(Math.min(window.innerWidth - 1, box.right + offset), midY),
  ];
}

/** Every element that a real Tab press can reach, in document order, visible ones only. */
export function focusables(root: ParentNode = document): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => {
    if (element.closest("[inert]") !== null) {
      return false;
    }
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
}

/** What answered a press at one point of a probed target box. */
export interface Miss {
  readonly x: number;
  readonly y: number;
  readonly hit: string;
}

/**
 * **THE POINTS OF A `size`x`size` TARGET BOX, CENTRED ON `element`, THAT SOMETHING ELSE ANSWERS.**
 *
 * A compact affordance is allowed to grow its hit area with a pseudo-element, so
 * `getBoundingClientRect()` is the wrong instrument for it entirely: it reads the painted glyph
 * and reports 13.9px over a target a finger can hit. What decides the question is what the
 * browser hands a press to, so this presses — nine points over the box, and every one of them
 * has to come back as this control.
 *
 * That makes the COLLISION assertion fall out of the same probe rather than needing a second
 * one: an expansion that grew over a neighbouring control loses the overlapping points to it,
 * because whichever element paints later answers there.
 *
 * An empty result means the box is this control's, whole.
 */
export function probeTargetBox(element: Element, size: number): Miss[] {
  const box = element.getBoundingClientRect();
  const centreX = box.left + box.width / 2;
  const centreY = box.top + box.height / 2;
  const half = size / 2 - 1;
  const misses: Miss[] = [];
  for (const dx of [-half, 0, half]) {
    for (const dy of [-half, 0, half]) {
      const x = centreX + dx;
      const y = centreY + dy;
      const hit = document.elementFromPoint(x, y);
      if (hit === null || !(element.contains(hit) || element === hit)) {
        misses.push({
          x: Math.round(x),
          y: Math.round(y),
          hit:
            hit === null
              ? "nothing"
              : `${hit.tagName.toLowerCase()}${hit.classList.length > 0 ? `.${[...hit.classList].join(".")}` : ""}`,
        });
      }
    }
  }
  return misses;
}

/**
 * The element the browser hands a press at `box`'s centre, and whether it is `element` itself.
 *
 * This is the half a size assertion cannot make: a 44px target whose centre resolves to the
 * popover parked on top of it is 44px of nothing.
 */
export function answersOwnCentre(element: Element): { own: boolean; hit: string } {
  const box = element.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return {
    own: hit !== null && (element.contains(hit) || element === hit),
    hit:
      hit === null
        ? "nothing"
        : `${hit.tagName.toLowerCase()}.${[...hit.classList].join(".")}`,
  };
}
