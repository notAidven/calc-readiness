/**
 * Ink dropped into an `SvgHitTarget` sits in the MIDDLE of it.
 *
 * `svgHitTarget.tsx` lays a real `<button>` over a region of a figure through a
 * `foreignObject`, and its `BARE` style rendered that button `display: block` with no
 * centering at all. So whatever the target held landed on the first baseline at the top of
 * the box: `x + 4` dropped into POL.4's rounded side slot printed hard against the slot's
 * top edge with the whole lower half of the box empty under it, which is the misalignment
 * QA photographed.
 *
 * ## Why the guard sweeps the call sites rather than the one that was reported
 *
 * Two of the five call sites already looked right, because `DifferenceSquaresDrag` wrapped
 * its own children in a local `TargetInk` that did the flex centering the primitive would
 * not do. That is the shape `.cursor/rules/qa-verification.mdc` warns about: a layout every
 * instance of a container owes, written as an opt-in, fixes the instance in front of you and
 * leaves the identical defect in every sibling. Both `CompleteSquareDrag` call sites had no
 * wrapper and were top-aligned, and nothing failed.
 *
 * So the population here is not "the slot that was reported" and not "the widgets that
 * import a wrapper". It is every `<SvgHitTarget` in the tree, derived from the sources with
 * a census that fails in BOTH directions: a file that starts using the primitive and is not
 * driven here fails, and a file listed here that stops using it fails too.
 *
 * ## What counts as the ink
 *
 * The `.katex` box across and its `.strut` down, exactly as `workedFigureLabels` and
 * `completeSquareDragViewBox` measure a typeset label, and a DOM `Range` over the contents
 * for a target holding words rather than maths. Not the child element's own box: `TargetInk`
 * was a full-size `span`, so measuring the wrapper would have reported the defect as fixed
 * in precisely the widget that had papered over it.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CITY_DESKTOP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** A short, realistic laptop, so a frame taken here is of a window somebody really has. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * How far an ink centre may sit from its button's centre, in CSS pixels.
 *
 * One pixel, which at this figure's scale is under half an SVG user unit. It is a rounding
 * budget and nothing more: a centred box is centred exactly, and the residue is sub-pixel
 * layout rounding plus KaTeX's own half-pixel struts.
 */
const TOL = 1;

/* -------------------------------------------------------------------------- */
/* The population: every call site in the tree                                */
/* -------------------------------------------------------------------------- */

const SOURCES = import.meta.glob("./**/*.tsx", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

/** Every source file that mounts the primitive, and how many times, read off the tree. */
const CALL_SITES: readonly (readonly [string, number])[] = Object.entries(SOURCES)
  .filter(([path]) => !path.endsWith(".test.tsx"))
  .map(([path, source]) => [path, (source.match(/<SvgHitTarget\b/g) ?? []).length] as const)
  .filter(([, count]) => count > 0)
  .sort(([a], [b]) => a.localeCompare(b));

/** The widgets this file drives, one per file that mounts the primitive. */
const DRIVEN: readonly { readonly file: string; readonly visual: LessonVisualId }[] = [
  { file: "./interactive/CompleteSquareDrag.tsx", visual: "complete-square-drag" },
  { file: "./interactive/DifferenceSquaresDrag.tsx", visual: "difference-squares-drag" },
];

/* -------------------------------------------------------------------------- */
/* Driving the two boards                                                     */
/* -------------------------------------------------------------------------- */

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

async function board(visual: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={visual} onComplete={() => {}} />);
  const host = h.host;
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    `${visual} mounts`,
  );
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    `${visual} typesets its maths`,
  );
  return host;
}

function chip(host: HTMLElement, spoken: string): HTMLElement {
  const found = host.querySelector<HTMLElement>(
    `.lesson-sorter__chip[aria-label="${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no tray chip named "${spoken}"`);
  }
  return found;
}

/** A hit target, matched on the words its accessible name carries in every state. */
function target(host: HTMLElement, words: string): HTMLElement {
  const found = Array.from(
    host.querySelectorAll<HTMLElement>("svg foreignObject button"),
  ).filter((button) => (button.getAttribute("aria-label") ?? "").includes(words));
  if (found.length !== 1) {
    throw new Error(`expected one target naming "${words}", found ${found.length}`);
  }
  return found[0] as HTMLElement;
}

async function carry(host: HTMLElement, spoken: string, words: string): Promise<void> {
  chip(host, spoken).click();
  target(host, words).click();
  await waitFor(() => target(host, words).hasAttribute("disabled"), `"${words}" settles`);
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the placed value typesets",
  );
}

/**
 * The states worth measuring: every one in which some target is holding something.
 *
 * A slot is empty until it is either the open one (which prints "drop here" inside itself)
 * or a settled one (which prints the value). `CompleteSquareDrag` prints nothing in an open
 * slot at all, so its ink only exists after a placement, which is exactly why its two call
 * sites went unnoticed.
 */
const STATES: readonly {
  readonly name: string;
  readonly visual: LessonVisualId;
  readonly reach: (host: HTMLElement) => Promise<void>;
}[] = [
  {
    name: "POL.2, placement 1 open",
    visual: "difference-squares-drag",
    reach: async () => {},
  },
  {
    name: "POL.2, the long edge open over a placed strip",
    visual: "difference-squares-drag",
    reach: async (host) => {
      await carry(host, "the strip 6 by x minus 6", "strip lands");
    },
  },
  {
    name: "POL.2, the long edge labeled and the short edge open",
    visual: "difference-squares-drag",
    reach: async (host) => {
      await carry(host, "the strip 6 by x minus 6", "strip lands");
      await carry(host, "x plus 6", "long edge");
    },
  },
  {
    name: "POL.2, both edges labeled",
    visual: "difference-squares-drag",
    reach: async (host) => {
      await carry(host, "the strip 6 by x minus 6", "strip lands");
      await carry(host, "x plus 6", "long edge");
      await carry(host, "x minus 6", "short edge");
    },
  },
  {
    name: "POL.4, the corner block placed",
    visual: "complete-square-drag",
    reach: async (host) => {
      await carry(host, "a block of 16", "corner");
    },
  },
  {
    name: "POL.4, the corner filled and the side labeled",
    visual: "complete-square-drag",
    reach: async (host) => {
      await carry(host, "a block of 16", "corner");
      await carry(host, "x plus 4", "side");
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Measuring the ink                                                          */
/* -------------------------------------------------------------------------- */

type Ink = "math" | "words";

interface Measured {
  readonly what: string;
  readonly ink: Ink;
  readonly dx: number;
  readonly dy: number;
}

/**
 * The painted extent of what a target is holding, or `null` when it holds nothing.
 *
 * `null` rather than a zero rect, so a selector that stopped matching counts as ink NOT
 * measured and trips the floors, instead of contributing a rectangle centred on nothing.
 */
function inkBox(button: HTMLElement): { box: DOMRect; ink: Ink } | null {
  const katex = button.querySelector<HTMLElement>(".katex");
  if (katex !== null) {
    const strut = katex.querySelector<HTMLElement>(".strut");
    if (strut === null) {
      return null;
    }
    const across = katex.getBoundingClientRect();
    const down = strut.getBoundingClientRect();
    if (across.width < 0.5 || down.height < 0.5) {
      return null;
    }
    return {
      box: new DOMRect(across.left, down.top, across.width, down.height),
      ink: "math",
    };
  }
  if ((button.textContent ?? "").trim() === "") {
    return null;
  }
  const range = document.createRange();
  range.selectNodeContents(button);
  const box = range.getBoundingClientRect();
  return box.width < 0.5 || box.height < 0.5 ? null : { box, ink: "words" };
}

function offsets(host: HTMLElement, state: string): Measured[] {
  const found: Measured[] = [];
  for (const button of Array.from(
    host.querySelectorAll<HTMLElement>("svg foreignObject button"),
  )) {
    const held = inkBox(button);
    if (held === null) {
      continue;
    }
    const slot = button.getBoundingClientRect();
    found.push({
      what: `${state}: "${button.getAttribute("aria-label") ?? ""}"`,
      ink: held.ink,
      dx: held.box.left + held.box.width / 2 - (slot.left + slot.width / 2),
      dy: held.box.top + held.box.height / 2 - (slot.top + slot.height / 2),
    });
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* The claims                                                                 */
/* -------------------------------------------------------------------------- */

test("every file that mounts SvgHitTarget is driven by this guard", () => {
  expect(
    CALL_SITES.map(([path]) => path),
    "a file mounts SvgHitTarget and is not driven here, or is driven here and no longer mounts it",
  ).toEqual(DRIVEN.map((entry) => entry.file));

  // A floor under the census: an `import.meta.glob` that stopped resolving, or a regex that
  // stopped matching, would agree with an empty declared list perfectly.
  const total = CALL_SITES.reduce((sum, [, count]) => sum + count, 0);
  expect(total, "no call site was found in the tree at all").toBeGreaterThanOrEqual(5);
});

test("ink dropped into a hit target is centred in it, on both axes", async () => {
  const measured: Measured[] = [];

  for (const state of STATES) {
    const host = await board(state.visual);
    await state.reach(host);
    measured.push(...offsets(host, state.name));
    h?.cleanup();
    h = null;
  }

  const off = measured
    .filter((item) => Math.abs(item.dx) > TOL || Math.abs(item.dy) > TOL)
    .map(
      (item) =>
        `${item.what} sits ${item.dx.toFixed(1)}px across and ${item.dy.toFixed(1)}px down from its slot's centre`,
    );
  expect(off.join("; "), "these are not centred in the target holding them").toBe("");

  // FLOORS UNDER AN ABSENCE, by composition as well as size. "Nothing was off centre" is
  // satisfied perfectly by a run that measured nothing, and a run that measured only the
  // maths would miss the "drop here" the open slot prints, which is the other kind of ink.
  expect(measured.length, "no ink was measured at all").toBeGreaterThanOrEqual(8);
  expect(
    measured.filter((item) => item.ink === "math").length,
    "no typeset value was measured",
  ).toBeGreaterThanOrEqual(4);
  expect(
    measured.filter((item) => item.ink === "words").length,
    "the words an open slot prints were not measured",
  ).toBeGreaterThanOrEqual(3);
  expect(
    new Set(measured.map((item) => (item.what.startsWith("POL.4") ? "POL.4" : "POL.2")))
      .size,
    "only one of the two widgets contributed any ink",
  ).toBe(2);
});

/**
 * THE FRAME the spatial claim owes, at the viewport it names.
 *
 * The reported defect is a picture, not a number: `x + 4` riding high in its rounded slot.
 * A passing offset assertion is a claim about boxes, so a frame is taken of the whole POL.4
 * board with both slots filled, framed to the figure rather than cropped to the slot, since
 * what has to be visible is the space around the label.
 */
test("POL.4: a frame of the finished board at the named viewport", async () => {
  const host = await board("complete-square-drag");
  await carry(host, "a block of 16", "corner");
  await carry(host, "x plus 4", "side");

  const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
  if (figure === null) {
    throw new Error("no figure to photograph");
  }
  await document.fonts.ready;
  if (CAPTURE_EVIDENCE) {
    const written = await page.screenshot({
      element: figure,
      path: `__screenshots__/svg-hit-target-centering/pol4-side-slot-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    });
    expect(written, "no frame was written").toBeTruthy();
  }
});
