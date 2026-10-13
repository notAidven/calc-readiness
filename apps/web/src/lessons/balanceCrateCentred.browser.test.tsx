/**
 * **LIN.1 DRAWS THE CRATE'S WEIGHT IN THE MIDDLE OF THE CRATE.**
 *
 * The number on the left pan is placed by `SvgMath`, whose `y` is the label's vertical CENTRE
 * rather than a baseline, and it was given `rect.y + 18` against a rect 26 tall — a baseline
 * offset left over from a `<text>`, which puts the digits five user units below the box they
 * name. Nothing about that is visible in the source: both the rect and the label are placed
 * from the same expression, so the only thing that decides it is a measurement of what was
 * painted.
 *
 * So both axes are measured and both are reported, whichever way they come out. The horizontal
 * placement was NOT assumed to be wrong: `anchor` defaults to `middle` and the label shares the
 * rect's `x`, so the expectation was that across is already correct and only down is broken. An
 * assertion that reports one number and not the other could not tell the difference.
 *
 * ## What the digits' box is
 *
 * Not the `foreignObject`, which `SvgMath` makes deliberately roomy (60 user units for a
 * two-digit number) with the KaTeX flex-centred inside it. The ink is the `.katex` box across,
 * which shrinks to the glyphs because it is a flex item, and the `.strut` down, which is the one
 * box KaTeX guarantees runs from the top of the expression's height to the bottom of its depth.
 * `workedFigureLabels.browser.test.tsx` gives the longer version of both reasons.
 *
 * ## The raised tip stays inside the frame
 *
 * At the default dial the left tip climbs to about `PIVOT_Y - ARM·sin(MAX_TILT)`. With the old
 * pivot at 34 and viewBox height 140 that tip's round cap crossed y = 0 and was clipped, so the
 * hang string read as a flat cut. The second test measures the painted beam against the SVG box
 * at that default dial and requires top clearance inside the frame. (The round-cap overhang past
 * the hang string is not asserted from `getBoundingClientRect`: Chromium's box for this `<line>`
 * matches the geometric endpoints and does not include `stroke-linecap`.)
 *
 * The frame is written before the assertions run, so a red run still leaves the picture that
 * shows what the numbers are describing.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { LESSONS_READING } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window: short, and the viewport every frame in this file is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * How far the digits' ink centre may sit from the crate's centre, in px.
 *
 * The figure paints a 440-unit viewBox at 460px, so a user unit is 1.045px and the defect is
 * 5 units, about 5.2px. Two px leaves room for the KaTeX line box being a fraction of a pixel
 * taller above the baseline than below it, and for the CTM's subpixel rounding, while staying
 * well under anything a reader would see as off-centre.
 */
const OFF_CENTRE = 2;

/**
 * How far inside the SVG the raised beam tip's ink must sit, in px.
 *
 * A user unit is about 1.045px on the reading column. The old pivot left the round cap about
 * 1.7 units above y = 0, so a clipped tip sits flush with the SVG top (clearance ≈ 0). Two px
 * is enough that a flush clip fails while a tip with a few units of headroom still passes.
 * Measured against the old geometry: clearance was 0.27px.
 */
const TIP_CLEARANCE = 2;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * Where this test's viewport sits inside the real browser window.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in the requested viewport's pixels lands
 * somewhere else on the real screen. `winterDevSkipShots.browser.test.tsx` measured that failure
 * and this is its fix.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
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
    scale: box.height / window.innerHeight,
  };
}

/** One frame of the whole viewport, captured over CDP and clipped to where that viewport is. */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, { encoding: "base64" });
  }
}

/** The ink of one typeset label: the `.katex` box across, the `.strut` down. */
function paintedMathBox(host: Element): DOMRect {
  const katex = host.querySelector<HTMLElement>(".katex");
  const strut = katex?.querySelector<HTMLElement>(".strut");
  if (katex === null || katex === undefined || strut === null || strut === undefined) {
    throw new Error("the crate's number was never typeset, so there is no ink to measure");
  }
  const across = katex.getBoundingClientRect();
  const down = strut.getBoundingClientRect();
  return new DOMRect(across.left, down.top, across.width, down.height);
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/** The board on the reading surface it ships on, with its maths typeset. */
async function mountBoard(): Promise<HTMLElement> {
  h = mount(
    <div style={{ width: `${LESSONS_READING.column}px`, margin: "20px auto" }}>
      <LessonVisual id="balance-beam-slider" />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector("svg[role='img']") !== null, "the board mounts");
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the board typesets its maths",
    20_000,
  );
  await document.fonts.ready;
  return host;
}

test("LIN.1 draws the crate's weight in the middle of the crate", async () => {
  const host = await mountBoard();
  await shoot(`lin1-crate-${VIEWPORT.width}x${VIEWPORT.height}`);

  const svg = query<SVGSVGElement>(host, "svg[aria-label^='A balance']");
  // The crate is the board's only rect, and the weight marked on it is its only label that is
  // a bare number: the equation above carries an `=` and the right pan carries a `\times`.
  const crate = query<SVGRectElement>(svg, "rect").getBoundingClientRect();
  const marked = Array.from(svg.querySelectorAll("foreignObject[data-latex]")).filter(
    (node) => /^\d+$/.test(node.getAttribute("data-latex") ?? ""),
  );
  expect(marked.length, "the crate's marked weight is not one label").toBe(1);
  const digits = paintedMathBox(marked[0] as Element);

  const across = (digits.left + digits.right) / 2 - (crate.left + crate.right) / 2;
  const down = (digits.top + digits.bottom) / 2 - (crate.top + crate.bottom) / 2;
  const measured = `the crate's ${marked[0]?.getAttribute("data-latex")} is ${across.toFixed(2)}px across and ${down.toFixed(2)}px down from the centre of its box (box ${crate.width.toFixed(1)}x${crate.height.toFixed(1)}px, digits ${digits.width.toFixed(1)}x${digits.height.toFixed(1)}px)`;
  console.log(measured);

  expect(Math.abs(across), measured).toBeLessThanOrEqual(OFF_CENTRE);
  expect(Math.abs(down), measured).toBeLessThanOrEqual(OFF_CENTRE);

  // A floor under a measurement of an absence: a zero-sized box or a zero-sized label centres
  // perfectly on anything.
  expect(crate.width, "the crate drew no box").toBeGreaterThan(40);
  expect(digits.width, "the crate's weight painted no ink").toBeGreaterThan(6);
  expect(digits.height, "the crate's weight painted no ink").toBeGreaterThan(6);
});

test("LIN.1 keeps the raised beam tip inside the frame at the default dial", async () => {
  const host = await mountBoard();
  await shoot(`lin1-beam-tip-${VIEWPORT.width}x${VIEWPORT.height}`);

  const svg = query<SVGSVGElement>(host, "svg[aria-label^='A balance']");
  const frame = svg.getBoundingClientRect();
  // Three lines: the thick beam, then the two hang strings. The beam is the widest stroke.
  const lines = Array.from(svg.querySelectorAll("line"));
  expect(lines.length, "the balance did not draw its beam and two hang strings").toBe(3);
  const beam = lines.reduce((widest, line) => {
    const width = Number(line.getAttribute("stroke-width") ?? 0);
    const best = Number(widest.getAttribute("stroke-width") ?? 0);
    return width > best ? line : widest;
  });
  expect(
    Number(beam.getAttribute("stroke-width")),
    "the beam is not the thick stroke",
  ).toBe(4);
  expect(
    beam.getAttribute("stroke-linecap"),
    "the tip needs a round cap to read as finished",
  ).toBe("round");

  const tip = beam.getBoundingClientRect();
  const topClearance = tip.top - frame.top;
  const measured = `at the default dial the beam tip clears the SVG top by ${topClearance.toFixed(2)}px (frame ${frame.width.toFixed(1)}x${frame.height.toFixed(1)}px, tip ${tip.width.toFixed(1)}x${tip.height.toFixed(1)}px)`;
  console.log(measured);

  expect(topClearance, measured).toBeGreaterThanOrEqual(TIP_CLEARANCE);
  // Floors under a measurement of an absence: a zero-sized beam clears anything.
  expect(tip.width, "the beam drew no stroke").toBeGreaterThan(100);
  expect(tip.height, "the beam drew no stroke").toBeGreaterThan(2);
});
