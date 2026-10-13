/**
 * POL.4's completing-the-square board may not draw outside its own viewBox.
 *
 * The reported defect (photo 5): `CompleteSquareDrag` declared `viewBox="0 0 400 216"` and drew
 * the side-label drop slot at `y = ORIGIN_Y + STRIP + SIDE + 18 = 206` with `height={26}`, so
 * the rounded box ran to 232 and the root SVG clipped its bottom 16 user units. What a learner
 * met was a slot with no bottom edge: an open-topped bracket under the figure rather than a box
 * to drop the side length into.
 *
 * ## Why the assertion is containment rather than a pinned height
 *
 * A pinned `216` would have passed while the slot hung out of the frame, because 216 was the
 * number that was wrong. So nothing here pins a dimension. Every element the figure draws is
 * measured against whatever viewBox the figure declares, in every state its slots can be in,
 * which fails for a slot that moves down as much as for a viewBox that shrinks.
 *
 * ## What an element's box is
 *
 * `getBBox`, not `getBoundingClientRect`. The subject is geometry that has LEFT the viewBox, and
 * a clipped rectangle is precisely the measurement that cannot see it. The box is then carried
 * into the root's user space, so a failure reads in the coordinates the source authored, and it
 * is grown by half the stroke width, because a 1.5-unit outline is painted astride its own edge.
 *
 * A KaTeX label is the one exception, and `workedFigureLabels.browser.test.tsx` is the precedent
 * for why: `SvgMath` gives every label a deliberately roomy transparent `foreignObject` with
 * `overflow: visible` (440 user units wide for a 20-unit label), so measuring that box would
 * report every label in the tree as outside every figure in the tree. The ink is the `.katex`
 * box across and the `.strut` down, exactly as that file measures it. The hit targets' own
 * `foreignObject`s are NOT exceptions: those boxes are the controls, sized to the region a
 * learner clicks, so a box hanging out of the frame is a control hanging out of the frame.
 *
 * ## Why this is a browser test
 *
 * All of it is layout. jsdom implements neither `getBBox` nor `getScreenCTM` and gives KaTeX a
 * zero rect, so every claim below would be a comparison between empty boxes.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CITY_DESKTOP } from "./readingWidths";
import { findButton, type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const FIGURE: LessonVisualId = "complete-square-drag";

/**
 * The parameter set the board opens on. `useWidgetVariants` starts at index 0, so `half` is the
 * first entry of the widget's own `HALVES` pool and the corner block is its square.
 */
const HALF = 4;
const CORNER = HALF * HALF;
/** The decoy block: the whole middle coefficient, which is the miss the board is built around. */
const DOUBLE = 2 * HALF;

/** How far past an edge counts as a clip rather than as rounding, in SVG user units. */
const TOL = 0.5;

/**
 * The viewport every measurement and every frame here is taken at: a short, realistic laptop
 * window rather than a comfortable developer one. The figure is drawn in a viewBox and scaled to
 * the width it is given, so containment inside it is scale-invariant; the viewport matters for
 * the photograph, and the two are taken at the same one so the frame is of the layout that was
 * measured.
 */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** The geometry a figure paints directly. `foreignObject` and its ink are handled separately. */
const GEOMETRY = "rect, line, path, circle, ellipse, polygon, polyline, text";

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

/* -------------------------------------------------------------------------- */
/* Driving the board                                                          */
/* -------------------------------------------------------------------------- */

/** Let React commit what the last click queued. */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** One mounted board, in the column an in-city lesson really gives it. */
async function board(): Promise<HTMLElement> {
  h = mount(<LessonVisual id={FIGURE} onComplete={() => {}} />);
  const host = h.host;
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    `${FIGURE} mounts`,
  );
  // Every box below is a box KaTeX has laid out, and `useKatex` typesets in an effect AFTER the
  // host exists. "Nothing is still waiting" rather than "some maths has appeared".
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    `${FIGURE} typesets its maths`,
  );
  return host;
}

function chip(host: HTMLElement, spoken: string): HTMLElement {
  const found = Array.from(host.querySelectorAll<HTMLElement>(".lesson-sorter__chip")).find(
    (button) => button.getAttribute("aria-label") === spoken,
  );
  if (!found) {
    throw new Error(`no tray chip named "${spoken}"`);
  }
  return found;
}

/** A drop target on the figure, by the accessible name its state announces. */
function target(host: HTMLElement, name: string): HTMLElement {
  const found = Array.from(
    host.querySelectorAll<HTMLElement>("svg foreignObject button"),
  ).find((button) => button.getAttribute("aria-label") === name);
  if (!found) {
    throw new Error(`no drop target named "${name}"`);
  }
  return found;
}

async function carry(host: HTMLElement, spoken: string, slot: string): Promise<void> {
  chip(host, spoken).click();
  target(host, slot).click();
  await settle();
}

const CORNER_OPEN = "Drop a block into the open corner";
const SIDE_OPEN = "Say what the finished square measures along one side";

/**
 * The states the figure's two slots can be in, because the geometry is not one board: a slot
 * holds a dashed outline while it is open, the learner's own value once it is placed, and the
 * value the shared reveal layer handed over while a passage is explaining it. All three put
 * different ink in the same box, so all three are measured.
 */
const STATES: readonly {
  readonly name: string;
  readonly reach: (host: HTMLElement) => Promise<void>;
}[] = [
  {
    name: "both slots open",
    reach: async () => {},
  },
  {
    name: "the corner placed, the side still open",
    reach: async (host) => {
      await carry(host, `a block of ${CORNER}`, CORNER_OPEN);
      await waitFor(
        () => host.querySelector(`button[aria-label="${SIDE_OPEN}"]`) !== null,
        "the side placement opens once the corner is filled",
      );
    },
  },
  {
    name: "both placed, the square finished",
    reach: async (host) => {
      await carry(host, `a block of ${CORNER}`, CORNER_OPEN);
      await carry(host, `x plus ${HALF}`, SIDE_OPEN);
      await waitFor(
        () => host.querySelector(".lesson-sorter__tray-empty") !== null,
        "the board settles once both placements are made",
      );
    },
  },
  {
    name: "the corner handed over by a reveal",
    reach: async (host) => {
      // The decoy: the whole middle coefficient where the corner takes half of it squared.
      await carry(host, `a block of ${DOUBLE}`, CORNER_OPEN);
      await waitFor(
        () => host.querySelector(".lesson-interactive__reveal-button") !== null,
        "the reveal is offered after a wrong placement",
      );
      findButton(host, /Reveal/).click();
      await waitFor(
        () => host.querySelector('[data-reveal-given="on"]') !== null,
        "the reveal fills the corner in",
      );
      await waitFor(
        () =>
          Array.from(host.querySelectorAll("[data-latex]")).every(
            (node) => node.querySelector(".katex") !== null,
          ),
        "the handed-over value typesets",
      );
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Measuring what is drawn                                                    */
/* -------------------------------------------------------------------------- */

/** What kind of thing was measured, so the floors can say the population is not one-sided. */
type Kind = "shape" | "control" | "math";

interface Drawn {
  /** How a failure names it: the authored geometry, or the control's own accessible name. */
  readonly what: string;
  readonly kind: Kind;
  /** The painted box, in the ROOT figure's user units. */
  readonly box: DOMRect;
}

function figureSvg(host: HTMLElement): SVGSVGElement {
  const svg = host.querySelector<SVGSVGElement>('.lesson-interactive svg[role="img"]');
  if (svg === null) {
    throw new Error("the widget drew no figure");
  }
  return svg;
}

/** The frame the figure declares for itself, in its own user units. */
function declaredViewBox(svg: SVGSVGElement): DOMRect {
  const declared = svg.getAttribute("viewBox") ?? "";
  const parts = declared
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`the figure declares no usable viewBox: "${declared}"`);
  }
  const [minX, minY, width, height] = parts as [number, number, number, number];
  return new DOMRect(minX, minY, width, height);
}

function rootInverse(svg: SVGSVGElement): DOMMatrix {
  const ctm = svg.getScreenCTM();
  if (ctm === null) {
    throw new Error("the figure is not laid out, so nothing can be measured against it");
  }
  return ctm.inverse();
}

/** A rectangle carried through `to`, taken as the extent of its four transformed corners. */
function through(to: DOMMatrix, box: DOMRect): DOMRect {
  const corners = [
    new DOMPoint(box.left, box.top),
    new DOMPoint(box.right, box.top),
    new DOMPoint(box.left, box.bottom),
    new DOMPoint(box.right, box.bottom),
  ].map((point) => point.matrixTransform(to));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return new DOMRect(left, top, Math.max(...xs) - left, Math.max(...ys) - top);
}

/**
 * How far an outline is painted outside its own geometry: half the stroke, which is what a
 * stroke straddling its edge actually covers. Zero for an unstroked shape.
 */
function strokeReach(el: Element): number {
  const style = getComputedStyle(el);
  if (style.stroke === "none" || style.stroke === "") {
    return 0;
  }
  const width = Number.parseFloat(style.strokeWidth);
  return Number.isFinite(width) ? width / 2 : 0;
}

/** One element's own geometry, stroke included, in the root's user units. */
function geometryBox(svg: SVGSVGElement, el: SVGGraphicsElement): DOMRect | null {
  const own = el.getScreenCTM();
  if (own === null) {
    return null;
  }
  const bbox = el.getBBox();
  if (bbox.width <= 0 && bbox.height <= 0) {
    return null;
  }
  const pad = strokeReach(el);
  const grown = new DOMRect(
    bbox.x - pad,
    bbox.y - pad,
    bbox.width + 2 * pad,
    bbox.height + 2 * pad,
  );
  return through(rootInverse(svg).multiply(own), grown);
}

/**
 * The ink box of one KaTeX label: the `.katex` box across, the `.strut` down.
 *
 * `null` rather than a fallback when either is missing, so a selector that stopped matching
 * counts as a label NOT measured (and trips the floors) instead of contributing a rectangle
 * that means nothing.
 */
function paintedMathBox(host: Element): DOMRect | null {
  const katex = host.querySelector<HTMLElement>(".katex");
  const strut = katex?.querySelector<HTMLElement>(".strut");
  if (!katex || !strut) {
    return null;
  }
  const across = katex.getBoundingClientRect();
  const down = strut.getBoundingClientRect();
  if (across.width < 0.5 || down.height < 0.5) {
    return null;
  }
  return new DOMRect(across.left, down.top, across.width, down.height);
}

function round(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

/** How a shape is named in a failure: its tag, anything it says, and where the source put it. */
function describeShape(el: SVGGraphicsElement): string {
  const bbox = el.getBBox();
  const said = (el.textContent ?? "").trim();
  const where = `${round(bbox.width)}x${round(bbox.height)} at (${round(bbox.x)}, ${round(bbox.y)})`;
  return said === ""
    ? `the <${el.tagName.toLowerCase()}> ${where}`
    : `the <${el.tagName.toLowerCase()}> "${said}" ${where}`;
}

/** Everything the figure paints, each in the root's user units. */
function drawnIn(svg: SVGSVGElement): Drawn[] {
  const drawn: Drawn[] = [];
  const inverse = rootInverse(svg);

  for (const el of Array.from(svg.querySelectorAll<SVGGraphicsElement>(GEOMETRY))) {
    // Geometry KaTeX emits for a surd or a stretchy delimiter belongs to the label around it,
    // and is measured as that label's ink below.
    if (el.closest("foreignObject") !== null) {
      continue;
    }
    const box = geometryBox(svg, el);
    if (box !== null) {
      drawn.push({ what: describeShape(el), kind: "shape", box });
    }
  }

  for (const el of Array.from(
    svg.querySelectorAll<SVGGraphicsElement>("foreignObject:not([data-latex])"),
  )) {
    const box = geometryBox(svg, el);
    if (box === null) {
      continue;
    }
    const named = el.querySelector("button")?.getAttribute("aria-label") ?? "";
    drawn.push({
      what: named === "" ? describeShape(el) : `the drop slot "${named}"`,
      kind: "control",
      box,
    });
  }

  for (const host of Array.from(svg.querySelectorAll("[data-latex]"))) {
    const ink = paintedMathBox(host);
    if (ink === null) {
      continue;
    }
    drawn.push({
      what: `the label $${host.getAttribute("data-latex") ?? ""}$`,
      kind: "math",
      box: through(inverse, ink),
    });
  }

  return drawn;
}

/** Every drawn thing that reaches outside `frame`, named with the edge and the overrun. */
function outside(frame: DOMRect, drawn: readonly Drawn[]): string[] {
  const found: string[] = [];
  for (const item of drawn) {
    const past: string[] = [];
    for (const [edge, over] of [
      ["left", frame.left - item.box.left],
      ["top", frame.top - item.box.top],
      ["right", item.box.right - frame.right],
      ["bottom", item.box.bottom - frame.bottom],
    ] as const) {
      if (over > TOL) {
        past.push(`${over.toFixed(1)} user units past the ${edge} edge`);
      }
    }
    if (past.length > 0) {
      found.push(`${item.what} is ${past.join(" and ")}`);
    }
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* The claims                                                                 */
/* -------------------------------------------------------------------------- */

test("complete-square-drag: nothing it draws falls outside the viewBox it declares", async () => {
  const clipped: string[] = [];
  const counted: { name: string; total: number; kinds: Record<Kind, number> }[] = [];

  for (const state of STATES) {
    const host = await board();
    await state.reach(host);
    const svg = figureSvg(host);
    const frame = declaredViewBox(svg);
    const drawn = drawnIn(svg);

    clipped.push(
      ...outside(frame, drawn).map(
        (line) => `${state.name}: ${line} of a ${frame.width}x${frame.height} viewBox`,
      ),
    );
    counted.push({
      name: state.name,
      total: drawn.length,
      kinds: {
        shape: drawn.filter((item) => item.kind === "shape").length,
        control: drawn.filter((item) => item.kind === "control").length,
        math: drawn.filter((item) => item.kind === "math").length,
      },
    });

    h?.cleanup();
    h = null;
  }

  expect(
    clipped.join("; "),
    "the figure paints these outside its own frame, so the root SVG clips them",
  ).toBe("");

  // FLOORS UNDER AN ABSENCE. The claim above is that nothing was outside the frame, which a run
  // that measured nothing satisfies perfectly. So the population is asserted per state, and by
  // COMPOSITION as well as by size: a run whose KaTeX lookups all came back null, or whose
  // control boxes stopped matching, would clear a bare total while measuring the wrong things.
  for (const state of counted) {
    expect(state.total, `${state.name}: nothing was measured`).toBeGreaterThanOrEqual(11);
    expect(
      state.kinds.shape,
      `${state.name}: the paving's own outlines were not measured`,
    ).toBeGreaterThanOrEqual(6);
    expect(
      state.kinds.control,
      `${state.name}: the two drop slots were not both measured`,
    ).toBe(2);
    expect(
      state.kinds.math,
      `${state.name}: the typeset cell labels were not measured`,
    ).toBeGreaterThanOrEqual(3);
  }
  expect(counted.length, "no slot state was reached at all").toBe(STATES.length);
});

/**
 * Anything in a plain `<text>` that a learner would read as maths: a digit, a variable, or a
 * superscript glyph standing in for an exponent.
 */
const MATHY = /[0-9x\u00b2-\u00b9]/;

test("complete-square-drag: its cell labels are typeset, not raw SVG text", async () => {
  const host = await board();
  const svg = figureSvg(host);

  const raw = Array.from(svg.querySelectorAll("text"))
    .map((node) => (node.textContent ?? "").trim())
    .filter((said) => said !== "");
  expect(
    raw.filter((said) => MATHY.test(said)).join("; "),
    "these cell labels are drawn as plain SVG text, so KaTeX never sets them",
  ).toBe("");

  const typeset = Array.from(svg.querySelectorAll("foreignObject[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  expect(typeset, "the big square's area is not typeset").toContain("x^{2}");
  expect(
    typeset.filter((latex) => latex === `${HALF}x`).length,
    "the two strips do not both carry a typeset width",
  ).toBe(2);

  // And each one really rendered, rather than being a `data-latex` over an empty span.
  for (const node of Array.from(svg.querySelectorAll("foreignObject[data-latex]"))) {
    expect(
      node.querySelector(".katex"),
      `${node.getAttribute("data-latex")} was never typeset`,
    ).not.toBeNull();
  }
});

/**
 * The paving used to sit against the left edge of a 400-wide viewBox (`ORIGIN_X = 44`), with
 * nearly five times as much empty space on the right as on the left. The SVG element itself is
 * centered by the lesson column; the ink inside it was not. So the claim is about the authored
 * geometry, measured in the viewBox's own units rather than on the screen: the empty space on
 * either side of the paving has to match.
 */
test("complete-square-drag: the paving sits in the middle of its viewBox", async () => {
  const host = await board();
  const svg = figureSvg(host);
  const frame = declaredViewBox(svg);
  const shapes = drawnIn(svg).filter((item) => item.kind === "shape");
  expect(
    shapes.length,
    "no paving outlines were measured, so the centering claim below is vacuous",
  ).toBeGreaterThanOrEqual(6);

  const left = Math.min(...shapes.map((item) => item.box.left));
  const right = Math.max(...shapes.map((item) => item.box.right));
  const leftPad = left - frame.left;
  const rightPad = frame.right - right;

  expect(
    Math.abs(leftPad - rightPad),
    `the paving leaves ${leftPad.toFixed(1)} on the left and ${rightPad.toFixed(1)} on the right of a ${frame.width}-wide viewBox`,
  ).toBeLessThanOrEqual(1);
  // And there IS empty space on both sides: a figure that fills the frame would also clear the
  // equality above, and that is not what this claim is about.
  expect(leftPad, "the paving fills the frame to the left edge").toBeGreaterThan(20);
  expect(rightPad, "the paving fills the frame to the right edge").toBeGreaterThan(20);

  await document.fonts.ready;
  const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
  if (figure === null) {
    throw new Error("no figure to photograph");
  }
  if (CAPTURE_EVIDENCE) {
    const written = await page.screenshot({
      element: figure,
      path: `__screenshots__/complete-square-drag/centered-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    });
    expect(written, "no centering frame was written").toBeTruthy();
  }
});

/**
 * THE FRAME the spatial claim owes, taken at the viewport it names.
 *
 * A passing containment test is a claim about boxes; "can you see the bottom of the slot" is a
 * claim about a rendered picture, so one is taken and looked at. Framed to the whole figure
 * rather than cropped to the slot: the slot is the part nobody doubted, and what has to be
 * visible is the space around it.
 *
 * The file name carries the viewBox it photographed, so the frame taken before the fix and the
 * frame taken after it are two files rather than one overwriting the other.
 */
test("complete-square-drag: a frame of the whole board at the named viewport", async () => {
  for (const state of [STATES[0], STATES[2]] as const) {
    if (state === undefined) {
      throw new Error("the states this frame photographs have moved");
    }
    const host = await board();
    await state.reach(host);
    const svg = figureSvg(host);
    const frame = declaredViewBox(svg);
    const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
    if (figure === null) {
      throw new Error("no figure to photograph");
    }
    await document.fonts.ready;
    const slug = state.name.replace(/[^a-z]+/gi, "-");
    if (CAPTURE_EVIDENCE) {
      const written = await page.screenshot({
        element: figure,
        path: `__screenshots__/complete-square-drag/${slug}-${VIEWPORT.width}x${VIEWPORT.height}-viewbox-${frame.width}x${frame.height}.png`,
      });
      expect(written, `no frame was written for "${state.name}"`).toBeTruthy();
    }

    h?.cleanup();
    h = null;
  }
});
