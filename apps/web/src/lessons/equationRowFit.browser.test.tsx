/**
 * AN EQUATION ROW IS A ROW, INCLUDING ONCE IT HAS BEEN ANSWERED WRONG.
 *
 * `.lesson-equation__row` is a three-column grid (`4.6rem 1fr <aside>`) and it was handed FOUR
 * children the moment a part was verdicted: the stage, the body, the `WidgetPartVerdict` mark and
 * the per-part Check. The fourth auto-placed into an IMPLICIT second grid row, in column one,
 * underneath the stage — so LIN.3's Check left the line it belonged to and sat below the rule it
 * was checking. Measured by this file at `de43b481`, the merge base, with the pin emptied: 15.0px
 * down and 334.8px to the left of the mark beside it, on 22 rows over ten boards, and 36.0px down
 * on `formula-isolate-builder`, whose stage is the taller one.
 *
 * ## The trap this file is written around
 *
 * A FRESHLY MOUNTED ROW HAS THREE CHILDREN AND CANNOT SHOW THE DEFECT. Every measurement anybody
 * would naturally take — mount the board, read the boxes — is taken in the one state where the
 * bug is absent, and comes back green over a surface with the bug on it. So the sweep DRIVES each
 * board into the wrong-verdict state first, and carries a floor counting how many rows it
 * actually got into that state, because every claim below is an ABSENCE and an absence holds
 * trivially over a board nobody answered. `classifyChipFit.browser.test.tsx` learned the same
 * lesson about its settled pass; this is that lesson applied to a different family.
 *
 * Driving it needs no per-board answer key, which is the useful accident here: every one of these
 * boards verdicts an EMPTY part `wrong` and leaves it open, so pressing Check on an untouched
 * board is exactly the reported state. Only `stone-pieces-sorter` needs a sequence, because it
 * draws no equation row at all until its pieces are in bins.
 *
 * ## The population is derived, and the boards that owe nothing are named rather than dropped
 *
 * Two populations, because they answer two different questions:
 *
 *  - The GEOMETRY sweep runs over every placed visual that draws a `.lesson-equation__row`, read
 *    off the sources. Fourteen of them can never hold four children, and they are measured anyway:
 *    they are what would report the shared fix breaking a row that was never broken.
 *  - The CENSUS is a source claim about who owes the `.lesson-equation__aside` wrap. A widget
 *    that draws the row and can show a verdict in it owes one; a widget that draws the row and
 *    verdicts nothing does not. The second group is NAMED, with its reason, and asserted in both
 *    directions, so an entry that stops qualifying fails and a listed widget that quietly adopts
 *    the wrap fails too. Leaving them silently out of the population is how a guard comes to be
 *    scoped by where the defect was photographed; see `.cursor/rules/qa-verification.mdc`.
 *
 * The plan this came from named two widgets, `FormulaIsolateBuilder` and `IntervalWriteBuilder`,
 * because those are the two the photograph showed. The sources say eleven.
 *
 * Real Chromium and the real stylesheet, because every number here is grid layout.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { visualsMatching, widgetsOwningCopy } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport every frame in this file is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * Sub-pixel slack, in px. The defect is measured in tens of px — 15px down and 335px across —
 * so nothing real hides under one pixel of rounding.
 */
const SLACK = 1;

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

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

const PLACED = new Set<string>(liveVisualIds());

/** Every placed visual whose widget draws an equation row, read off the sources. */
const ROW_VISUALS: readonly LessonVisualId[] = visualsMatching(
  /lesson-equation__row/,
).filter((id) => PLACED.has(id));

/**
 * Of those, the ones that can put a part verdict on such a row: the sub-population that can
 * reach four children, and therefore the one the driven pass has to arrive at.
 *
 * Derived by intersecting two source sweeps rather than listed, and then checked against what
 * the browser actually produced — the last test in this file fails if the driver stops reaching
 * one of them, which is the way a driven sweep silently shrinks.
 */
const VERDICT_MARKED = new Set<string>(visualsMatching(/\bWidgetPartVerdict\b/));
const VERDICT_ROW_VISUALS: readonly LessonVisualId[] = ROW_VISUALS.filter((id) =>
  VERDICT_MARKED.has(id),
);

/**
 * Reaching the state that shows the defect, where pressing Check is not enough.
 *
 * Written down because it cannot be derived — it is a different sequence in every widget — and
 * deliberately the only thing in this file that is. `stone-pieces-sorter` draws no equation row
 * until every piece is in a bin, and a piece only lands in the bin it belongs to, so each is
 * offered to every bin until one takes it.
 */
const REACH: Record<string, (host: HTMLElement) => Promise<void>> = {
  "stone-pieces-sorter": async (host) => {
    const named = (label: string): HTMLElement | undefined =>
      all<HTMLElement>(host, ".lesson-sorter__chip").find(
        (node) => node.getAttribute("aria-label") === label,
      );
    for (let piece = 0; piece < 12; piece += 1) {
      const chip = all<HTMLElement>(host, ".lesson-sorter__chip")[0];
      if (chip === undefined) {
        break;
      }
      const label = chip.getAttribute("aria-label") ?? "";
      const bins = all<HTMLElement>(host, ".lesson-sorter__bin").length;
      for (let bin = 0; bin < bins; bin += 1) {
        const held = named(label);
        if (held === undefined) {
          break;
        }
        held.click();
        all<HTMLElement>(host, ".lesson-sorter__bin")[bin]?.click();
        await pause(20);
      }
      if (named(label) !== undefined) {
        break;
      }
    }
    await waitFor(
      () => host.querySelector(".lesson-equation__row") !== null,
      "stone-pieces-sorter never opened the rows this sweep is about",
    );
  },
};

/** One child cell of an equation row, and where it was painted. */
interface CellReading {
  readonly what: string;
  readonly box: DOMRect;
}

/** One `.lesson-equation__row` as the browser laid it out. */
interface RowReading {
  readonly where: string;
  readonly visual: string;
  /** The row's own padding box: what its children have to stay inside. */
  readonly bounds: DOMRect;
  readonly cells: CellReading[];
  /** True once this row holds BOTH a verdict and a Check, which is the reported state. */
  readonly showsTheDefectState: boolean;
}

interface Sweep {
  readonly visuals: string[];
  readonly rows: RowReading[];
  /** Which boards were driven all the way into the four-child state. */
  readonly reached: string[];
}

function cellName(cell: Element): string {
  const classes = cell.className.split(" ").filter((c) => c.length > 0);
  return classes.length === 0 ? `<${cell.tagName.toLowerCase()}>` : `.${classes[0]}`;
}

/** The box inside an element's own border and padding. */
function paddingBox(el: HTMLElement): DOMRect {
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const left = box.left + Number.parseFloat(style.borderLeftWidth);
  const right = box.right - Number.parseFloat(style.borderRightWidth);
  const top = box.top + Number.parseFloat(style.borderTopWidth);
  const bottom = box.bottom - Number.parseFloat(style.borderBottomWidth);
  return new DOMRect(left, top, right - left, bottom - top);
}

/** How many px of vertical extent two boxes share: what makes them the same line. */
function sharedHeight(a: DOMRect, b: DOMRect): number {
  return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
}

/** How many px two boxes share across, counting only where they also share rows. */
function overlapPx(a: DOMRect, b: DOMRect): number {
  const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return across > SLACK && down > SLACK ? across : 0;
}

async function mountVisual(id: LessonVisualId, width: number): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${width}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  // KaTeX's own faces are not requested until something is typeset, and until they arrive every
  // width reads about 10% narrow. `mathCaseTransform.browser.test.tsx` measured that; a narrow
  // reading is the dangerous direction for a claim about a cell staying inside its row.
  await document.fonts.ready;
  return host;
}

/**
 * Press Check on every part, answering nothing.
 *
 * Every board in the verdict population verdicts an EMPTY part `wrong` and leaves it open — the
 * ten `check` functions all short-circuit on a blank entry — so this is the reported four-child
 * state without a per-board answer key. Clicked by INDEX and re-queried each time, because the
 * verdict re-renders the row and the previous element handles are stale.
 */
async function pressEveryPartCheck(host: HTMLElement): Promise<void> {
  const parts = all(host, ".lesson-interactive__check--part").length;
  for (let at = 0; at < parts; at += 1) {
    all<HTMLButtonElement>(host, ".lesson-interactive__check--part")[at]?.click();
    await pause(40);
  }
}

async function sweep(width: number, drive: boolean): Promise<Sweep> {
  const visuals: string[] = [];
  const rows: RowReading[] = [];
  const reached: string[] = [];

  for (const id of ROW_VISUALS) {
    const host = await mountVisual(id, width);
    if (drive) {
      await REACH[id]?.(host);
      await pressEveryPartCheck(host);
      await document.fonts.ready;
    }

    const found = all<HTMLElement>(host, ".lesson-equation__row");
    if (found.length > 0) {
      visuals.push(id);
    }
    found.forEach((row, at) => {
      const showsTheDefectState =
        row.querySelector("[data-verdict]") !== null &&
        row.querySelector(".lesson-interactive__check:not(:disabled)") !== null;
      if (showsTheDefectState && !reached.includes(id)) {
        reached.push(id);
      }
      rows.push({
        where: `${id} row ${at + 1}`,
        visual: id,
        bounds: paddingBox(row),
        cells: (Array.from(row.children) as HTMLElement[]).map((cell) => ({
          what: cellName(cell),
          box: cell.getBoundingClientRect(),
        })),
        showsTheDefectState,
      });
    });

    h?.cleanup();
    h = null;
  }

  return { visuals, rows, reached };
}

/**
 * One driven sweep and one fresh one, shared by every claim.
 *
 * Mounting sixteen boards and pressing every Check on each is most of a minute, and no claim
 * below drives a board into a state another one does not.
 */
const swept = new Map<string, Promise<Sweep>>();
function sweepOnce(width: number, drive: boolean): Promise<Sweep> {
  const key = `${width}:${drive}`;
  const found = swept.get(key);
  if (found !== undefined) {
    return found;
  }
  const run = sweep(width, drive);
  swept.set(key, run);
  return run;
}

/**
 * Floors, at the numbers this tree measures: fourteen placed visuals draw 28 equation rows on
 * mount, and driving the ten verdict boards puts 22 of those rows into the four-child state.
 *
 * `DEFECT_STATE_FLOOR` is the load-bearing one. Every claim below is an absence, and an absence
 * over a board nobody answered is exactly what the fresh mount already proved: this floor is
 * what makes a green driven run mean "the wrap held" rather than "the driver stopped working".
 */
const ROW_FLOOR = 28;
const VISUAL_FLOOR = 14;
const DEFECT_STATE_FLOOR = 22;

/** The two states, so neither can regress on its own. */
const STATES: readonly (readonly [string, boolean])[] = [
  ["on a freshly mounted board", false],
  ["once every part has been answered wrong", true],
];

function expectPopulation(sweptRows: Sweep, driven: boolean): void {
  expect(
    sweptRows.visuals.length,
    "no placed visual drew an equation row, so this sweep measured nothing",
  ).toBeGreaterThanOrEqual(VISUAL_FLOOR);
  expect(
    sweptRows.rows.length,
    "the boards drew too few equation rows to measure",
  ).toBeGreaterThanOrEqual(ROW_FLOOR);
  if (driven) {
    expect(
      sweptRows.rows.filter((row) => row.showsTheDefectState).length,
      "no row was driven into the state that holds both a verdict and a Check, so this pass measured the fresh board a second time",
    ).toBeGreaterThanOrEqual(DEFECT_STATE_FLOOR);
  }
}

test.each(STATES)(
  "no equation row drops a cell onto a second line %s",
  async (_state, driven) => {
    const found = await sweepOnce(FIGURE_CONTENT_CAP, driven);

    // THE DEFECT. A fourth child in a three-column grid auto-places into an implicit second row,
    // which is a line the row was never laid out to have.
    const stacked = found.rows.flatMap((row) =>
      row.cells.flatMap((cell, at) => {
        const before = row.cells[at - 1];
        if (before === undefined || sharedHeight(cell.box, before.box) > SLACK) {
          return [];
        }
        return [
          `${row.where}: ${cell.what} sits ${(cell.box.top - before.box.bottom).toFixed(1)}px below ${before.what}`,
        ];
      }),
    );
    expect(
      stacked.join("; "),
      `${_state}, these cells fell off the line the row draws`,
    ).toBe("");

    expectPopulation(found, driven);
  },
  180_000,
);

test.each(STATES)(
  "every equation row lays its cells out across it, in the order it writes them %s",
  async (_state, driven) => {
    const found = await sweepOnce(FIGURE_CONTENT_CAP, driven);

    // Beside "on the same line", which two boxes satisfy in either order: the displaced Check
    // landed in column ONE, 361px to the left of the mark that is written before it.
    const backwards = found.rows.flatMap((row) =>
      row.cells.flatMap((cell, at) => {
        const before = row.cells[at - 1];
        return before === undefined || cell.box.left > before.box.left
          ? []
          : [
              `${row.where}: ${cell.what} starts ${(before.box.left - cell.box.left).toFixed(1)}px left of ${before.what}`,
            ];
      }),
    );
    expect(
      backwards.join("; "),
      `${_state}, these rows draw their cells out of order`,
    ).toBe("");

    expectPopulation(found, driven);
  },
  180_000,
);

test.each(STATES)("no equation row cell covers another %s", async (_state, driven) => {
  const found = await sweepOnce(FIGURE_CONTENT_CAP, driven);

  const covering = found.rows.flatMap((row) =>
    row.cells.flatMap((cell, at) =>
      row.cells.slice(at + 1).flatMap((other) => {
        const over = overlapPx(cell.box, other.box);
        return over === 0
          ? []
          : [`${row.where}: ${cell.what} over ${other.what} by ${over.toFixed(1)}px`];
      }),
    ),
  );
  expect(covering.join("; "), `${_state}, these cells sit on top of each other`).toBe("");

  expectPopulation(found, driven);
});

/**
 * THE ONE ROW STILL PAINTING A CELL OUTSIDE ITSELF, and why widening the track did not reach it.
 *
 * `geo-compose-builder` is D10's compose-a-shape board. Its body is a nowrap typeset expression
 * whose min-content is 245.2px, which with the fixed first track and the two gaps leaves the last
 * track exactly its 5.2rem floor and no free space at all — so `minmax(5.2rem, auto)` cannot grow
 * it, and the board-level Check that needs 93.5px is painted 10.3px past the row's right edge.
 * Measured at 10.3px on both sides of the branch, by running this file with the pin emptied at
 * the merge base `de43b481` and again here, so it is this board's own body refusing to yield
 * rather than anything the aside did.
 *
 * Fixing it means making that expression give ground, which is a decision about a D10 board and
 * not one to take inside a test written for D3. So it is pinned, and pinned in BOTH directions:
 * an entry for a board no lesson places any more fails, and an entry for a board that has come to
 * fit fails too, rather than going on excusing something that stopped needing it.
 */
const OVERFLOW_PINNED: readonly string[] = ["geo-compose-builder"];

/**
 * AND THE WRAP MAY NOT BUY THE ROW BACK BY PUSHING A CELL OFF IT.
 *
 * The third track went from a fixed `5.2rem` to `minmax(5.2rem, auto)` so the aside can hold a
 * mark and a button at once. `auto` is the direction that can overflow: a grid whose tracks no
 * longer fit does not clip, it paints outside. This is where that shows up.
 */
test.each(STATES)(
  "no equation row cell reaches outside the row that holds it %s",
  async (_state, driven) => {
    const found = await sweepOnce(FIGURE_CONTENT_CAP, driven);

    const past = (row: RowReading, cell: CellReading): number =>
      Math.max(row.bounds.left - cell.box.left, cell.box.right - row.bounds.right);
    const outside = found.rows.flatMap((row) =>
      row.cells.flatMap((cell) =>
        past(row, cell) > SLACK
          ? [
              {
                visual: row.visual,
                said: `${row.where}: ${cell.what} reaches ${past(row, cell).toFixed(1)}px past the row`,
              },
            ]
          : [],
      ),
    );
    expect(
      outside
        .filter((o) => !OVERFLOW_PINNED.includes(o.visual))
        .map((o) => o.said)
        .join("; "),
      `${_state}, these cells are painted outside the row that is supposed to hold them`,
    ).toBe("");

    for (const id of OVERFLOW_PINNED) {
      expect(
        found.visuals,
        `${id} is pinned as still overflowing its row, and no lesson places it any more: delete the pin`,
      ).toContain(id);
      expect(
        outside.some((o) => o.visual === id),
        `${id} is pinned as still overflowing its row and now fits: delete the pin, it is excusing nothing`,
      ).toBe(true);
    }

    expectPopulation(found, driven);
  },
  180_000,
);

/**
 * THE DRIVER REACHED EVERY BOARD THAT COULD SHOW THE DEFECT.
 *
 * A derived population and a floor together still allow the driven set to be the WRONG set: the
 * floor constrains size, not composition, so twenty-two rows off nine boards satisfies it just as
 * well as twenty-two off ten. Asserted as an equality against the sources, so it fails whichever
 * way the two come apart — a board that adopts a part verdict and is never driven, and a board
 * whose `reach` sequence has rotted and silently stops arriving.
 */
test("the driven sweep reached every board that can verdict a part on an equation row", async () => {
  const found = await sweepOnce(FIGURE_CONTENT_CAP, true);

  expect(
    VERDICT_ROW_VISUALS.length,
    "no placed widget draws an equation row that can hold a part verdict, so the driven pass is asserting nothing",
  ).toBeGreaterThanOrEqual(10);
  expect(
    [...found.reached].sort(),
    "the boards this sweep drove into the four-child state and the boards whose sources can reach it have come apart",
  ).toEqual([...VERDICT_ROW_VISUALS].sort());
});

/**
 * WHO OWES THE `.lesson-equation__aside` WRAP, asserted against the sources in both directions.
 *
 * Fourteen widgets draw a `.lesson-equation__row` and owe no aside, because their row can never
 * hold four children: they put a Check on the row and no verdict beside it, so the third column is
 * the Check's own. Quietly leaving them out of the population is indistinguishable from forgetting
 * them, so they are named here with the reason and the list is asserted so that it fails BOTH
 * ways: an entry that stops qualifying (it adopts a part verdict, or the file is renamed away)
 * fails, and a listed widget that adopts the wrap anyway fails too.
 *
 * Eight of the fourteen arrived with D6, and each was read rather than assumed: `DomainIntervalBuild`
 * came with them and is NOT here, because it does verdict a part, and the geometry sweep above
 * caught its Check 15.0px below and 334.8px left of that verdict.
 */
const NO_ASIDE_OWED: readonly { readonly path: string; readonly why: string }[] = [
  {
    path: "./interactive/AverageRateExplore.tsx",
    why: "two rows, each holding a stage, a body and a board-level Check, and neither verdicts a part",
  },
  {
    path: "./interactive/CoordinateDistanceMidpoint.tsx",
    why: "its shared `Row` is the three-cell shape: a stage, a body and a board-level Check",
  },
  {
    path: "./interactive/CoordinateInterceptRead.tsx",
    why: "its shared `Row` is the three-cell shape: a stage, a body and a board-level Check",
  },
  {
    path: "./interactive/DifferenceQuotientBuild.tsx",
    why: "its `Stage` draws a board-level Check beside the body and verdicts no part",
  },
  {
    path: "./interactive/DifferenceQuotientWalkthrough.tsx",
    why: "one row, one board-level Check, no per-part verdict",
  },
  {
    path: "./interactive/EquationSameBaseStepper.tsx",
    why: "its `Stage` draws a Check and nothing else beside the body: no verdict, so no fourth cell",
  },
  {
    path: "./interactive/GeoCisternPlay.tsx",
    why: "both rows carry a board-level Check, one at a time, and neither verdicts a part",
  },
  {
    path: "./interactive/GeoComposeBuilder.tsx",
    why: "one row, one board-level Check, no per-part verdict",
  },
  {
    path: "./interactive/InverseBuild.tsx",
    why: "its shared `Row` is the three-cell shape: a stage, a body and a board-level Check",
  },
  {
    path: "./interactive/InverseReflectExplore.tsx",
    why: "the row it maps over its two points carries a board-level Check and verdicts nothing",
  },
  {
    path: "./interactive/InverseReversePlay.tsx",
    why: "both rows carry a board-level Check, one at a time, and neither verdicts a part",
  },
  {
    path: "./interactive/LinearSlopeWalkthrough.tsx",
    why: "its `Stage` is the same three-cell shape as the same-base stepper's",
  },
  {
    path: "./interactive/LogDomainBuilder.tsx",
    why: "one row, one board-level Check, no per-part verdict",
  },
  {
    path: "./interactive/NegativeFlipPlay.tsx",
    why: "its row is a settled read-out: a stage and a body, with no control on it at all",
  },
];

test("every widget drawing an equation row either wraps its aside or is a named exception", () => {
  const paths = (widgets: { path: string }[]): string[] =>
    widgets.map((w) => w.path).sort();
  const drawsRow = paths(widgetsOwningCopy(/lesson-equation__row/));
  const wrapsAside = new Set(paths(widgetsOwningCopy(/lesson-equation__aside/)));
  const verdicts = new Set(paths(widgetsOwningCopy(/\bWidgetPartVerdict\b/)));
  const excused = NO_ASIDE_OWED.map((e) => e.path);

  expect(
    drawsRow.length,
    "no widget draws an equation row, so this census is over an empty tree",
  ).toBeGreaterThanOrEqual(16);

  for (const { path, why } of NO_ASIDE_OWED) {
    // An entry that has been renamed or deleted stops describing anything, and would otherwise
    // sit here forever excusing nothing.
    expect(
      drawsRow,
      `${path} is excused from the aside wrap (${why}) and no longer draws an equation row: delete the entry`,
    ).toContain(path);
    // And an entry that stops qualifying: the day it verdicts a part, its row can hold four
    // children and the excuse is wrong.
    expect(
      verdicts.has(path),
      `${path} is excused from the aside wrap because it verdicts no part (${why}), and it now renders WidgetPartVerdict: it owes the wrap`,
    ).toBe(false);
  }

  // The equality, which fails whichever way the list and the tree come apart: a row-drawing
  // widget that is neither excused nor wrapped is missing the fix, and an excused widget that
  // wraps anyway is being excused from something it no longer needs excusing from.
  expect(
    drawsRow.filter((path) => !excused.includes(path)),
    "the widgets owing the aside wrap and the widgets carrying it have come apart",
  ).toEqual(drawsRow.filter((path) => wrapsAside.has(path)));

  expect(
    drawsRow.filter((path) => wrapsAside.has(path)).length,
    "no widget carries the aside wrap, so the exception list is excusing the whole tree",
  ).toBeGreaterThanOrEqual(10);
});

/**
 * Where this test's viewport sits inside the real browser window.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in the requested viewport's pixels lands
 * somewhere else on the real screen. Copied from `balanceCrateCentred.browser.test.tsx`, which
 * measured that failure.
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

/**
 * The frames, framed to show the surface around the row rather than cropped to it.
 *
 * A spatial claim owes a picture somebody looked at, and cropping it to the cell that moved
 * proves nothing about where that cell sits relative to everything else on the board.
 */
test.each(["formula-isolate-builder", "interval-write-builder"] as const)(
  "%s: a frame of the answered board at 1024x580",
  async (id) => {
    h = mount(
      <div style={{ width: "620px", margin: "12px auto" }}>
        <LessonVisual id={id} />
      </div>,
    );
    const host = h.host;
    await waitFor(
      () => host.querySelector("figure.lesson-visual") !== null,
      `${id} mounts`,
    );
    await document.fonts.ready;
    await pressEveryPartCheck(host);
    await document.fonts.ready;

    const marked = all(host, ".lesson-equation__row [data-verdict]").length;
    expect(
      marked,
      `${id}: the frame was taken before anything was verdicted`,
    ).toBeGreaterThan(0);
    await shoot(`${id}-answered-${VIEWPORT.width}x${VIEWPORT.height}`);
  },
);
