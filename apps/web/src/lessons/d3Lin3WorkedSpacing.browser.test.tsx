/**
 * **LIN.3'S WORKED SOLUTIONS LEAVE CLEAR SPACE BETWEEN THEIR ROWS.**
 *
 * `TwoHalvesWorked` stacked its rows on a fixed pitch of 30 user units, which is a claim that
 * every row is the same height. A `\dfrac` is about twice a one-line row's ink, and four of the
 * five figures put one directly under a plain row, so the fraction's numerator was drawn into
 * the line above it. `workedKit.tsx` had already met this and solved it — `rowInkHeight` with
 * `PLAIN_ROW_H`, `DISPLAY_FRACTION_ROW_H` and `ROW_GAP`, spacing by what a row actually inks
 * rather than by a constant — and this file is the guard for the same pattern in D3.
 *
 * ## Why this file exists rather than a widened `workedFigureLabels.browser.test.tsx`
 *
 * That sweep's population comes from `practiceSweep.ts`, whose census names `d3` as a domain no
 * figure sweep reaches. Widening it is a change to a shared census that another lane owns, so
 * the population here is derived separately and narrowly: the keys of `LIN3_WORKED_SOLUTIONS`
 * itself, matched against the live D3 templates in BOTH directions, so a figure added to that
 * file joins this guard and a figure whose template disappears fails here.
 *
 * ## What a row's ink is
 *
 * The `.katex` box across and the union of the per-`.base` `.strut` boxes down. The strut is the
 * one box KaTeX guarantees runs from the top of a base's height to the bottom of its depth, and
 * the union matters here specifically: KaTeX starts a new `.base` at every relation, so
 * `w = \dfrac{P - 2l}{2}` has a first strut belonging to the `w` alone. Measured off that strut
 * a display fraction reports about a third of the ink it draws, and every claim below would be
 * measuring the wrong box while passing.
 *
 * Frames are taken before the assertions, so a red run still leaves the pictures.
 */

import {
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_TEMPLATES,
  generateFromTemplate,
} from "@cr/item-bank";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { LESSONS_READING } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { WorkedSolution } from "./WorkedSolution";
import { LIN3_WORKED_SOLUTIONS } from "./worked/d3LIN3";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport every frame in this file is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * Clear space two consecutive rows must leave between their ink, in px.
 *
 * `ROW_GAP` is 12 user units and the figure paints a 440-unit viewBox at 460px, so the design
 * clearance between two RESERVED boxes is about 12.5px and the clearance between the ink inside
 * them is larger again. Ten is under both and far above zero, which is what the fixed pitch
 * produced: the rows it broke overlapped rather than crowded.
 */
const MIN_CLEAR = 10;

/** How far the divider rule must stay off any row's ink, in px. */
const RULE_CLEAR = 2;

/** Distinct parameter draws per template, over and above the frozen instances. */
const DRAWS_PER_TEMPLATE = 8;

/** How many seeds to try per template before giving up on finding more distinct draws. */
const SEEDS_PER_TEMPLATE = 200;

const FIGURE_IDS = Object.keys(LIN3_WORKED_SOLUTIONS).sort();
const LIN3_TEMPLATES = D3_PRACTICE_TEMPLATES.filter((template) =>
  FIGURE_IDS.includes(template.template_id),
);

interface Draw {
  readonly template_id: string;
  readonly template_params: Record<string, number>;
}

function everyLin3Draw(): Draw[] {
  const seen = new Set<string>();
  const drawn: Draw[] = [];
  const keep = (item: Draw): boolean => {
    const key = `${item.template_id}|${JSON.stringify(item.template_params)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    drawn.push(item);
    return true;
  };
  for (const item of D3_PRACTICE_ITEMS) {
    if (FIGURE_IDS.includes(item.template_id)) {
      keep(item);
    }
  }
  for (const template of LIN3_TEMPLATES) {
    let kept = 0;
    for (let seed = 1; seed <= SEEDS_PER_TEMPLATE && kept < DRAWS_PER_TEMPLATE; seed += 1) {
      if (keep(generateFromTemplate(template, "practice", seed))) {
        kept += 1;
      }
    }
  }
  return drawn;
}

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

interface Row {
  readonly latex: string;
  readonly box: DOMRect;
}

/** The ink of one row: the `.katex` box across, the union of its bases' struts down. */
function inkBox(host: Element): DOMRect | null {
  const katex = host.querySelector<HTMLElement>(".katex");
  if (katex === null) {
    return null;
  }
  const struts = Array.from(katex.querySelectorAll<HTMLElement>(".base > .strut"));
  if (struts.length === 0) {
    return null;
  }
  const across = katex.getBoundingClientRect();
  const tops = struts.map((strut) => strut.getBoundingClientRect());
  const top = Math.min(...tops.map((rect) => rect.top));
  const bottom = Math.max(...tops.map((rect) => rect.bottom));
  return new DOMRect(across.left, top, across.width, bottom - top);
}

function rowsIn(svg: SVGElement): Row[] {
  const rows: Row[] = [];
  for (const host of Array.from(svg.querySelectorAll("foreignObject[data-latex]"))) {
    const box = inkBox(host);
    if (box === null) {
      continue;
    }
    rows.push({ latex: `$${host.getAttribute("data-latex") ?? ""}$`, box });
  }
  return rows.sort((a, b) => a.box.top - b.box.top);
}

/** The dashed rule between the two halves. */
function dividerY(svg: SVGElement): number {
  const rule = svg.querySelector<SVGLineElement>("line[stroke-dasharray]");
  if (rule === null) {
    throw new Error("the figure drew no divider, so its two halves are not separated");
  }
  const box = rule.getBoundingClientRect();
  return (box.top + box.bottom) / 2;
}

interface Measured {
  readonly where: string;
  /** Ink clearances between consecutive rows, top to bottom. */
  readonly clearances: number[];
  /** Rows whose ink the divider rule is drawn through. */
  readonly cut: string[];
  /** Rows whose ink falls outside the figure's own box. */
  readonly clipped: string[];
  readonly above: number;
  readonly below: number;
  /** Unused figure height under the lowest ink, in px. */
  readonly slack: number;
  readonly rows: number;
}

/** Render `draws` and measure every figure they produce. */
async function sweep(draws: readonly Draw[], batch: number): Promise<Measured[]> {
  const measured: Measured[] = [];
  for (let at = 0; at < draws.length; at += batch) {
    const slice = draws.slice(at, at + batch);
    h = mount(
      slice.map((item) => {
        const draw = `${item.template_id} ${JSON.stringify(item.template_params)}`;
        return (
          <div
            key={draw}
            data-instance={draw}
            style={{ width: `${LESSONS_READING.column}px` }}
          >
            <WorkedSolution
              templateId={item.template_id}
              params={item.template_params}
              steps={[]}
            />
          </div>
        );
      }),
    );
    const host = h.host;
    await waitFor(
      () => host.querySelectorAll("[data-instance]").length === slice.length,
      `batch at ${at} mounts`,
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      `batch at ${at} typesets its maths`,
      20_000,
    );
    await document.fonts.ready;

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const svg = wrapper.querySelector("svg");
      if (svg === null) {
        continue;
      }
      const where = wrapper.dataset.instance ?? "";
      const rows = rowsIn(svg);
      const rule = dividerY(svg);
      const figure = svg.getBoundingClientRect();
      const clearances: number[] = [];
      for (let i = 1; i < rows.length; i += 1) {
        const over = rows[i - 1] as Row;
        const under = rows[i] as Row;
        clearances.push(under.box.top - over.box.bottom);
      }
      measured.push({
        where,
        clearances,
        cut: rows
          .filter(
            (row) => row.box.top - RULE_CLEAR < rule && rule < row.box.bottom + RULE_CLEAR,
          )
          .map((row) => row.latex),
        clipped: rows
          .filter((row) => row.box.top < figure.top || row.box.bottom > figure.bottom)
          .map((row) => row.latex),
        above: rows.filter((row) => (row.box.top + row.box.bottom) / 2 < rule).length,
        below: rows.filter((row) => (row.box.top + row.box.bottom) / 2 > rule).length,
        slack: figure.bottom - Math.max(...rows.map((row) => row.box.bottom)),
        rows: rows.length,
      });
    }

    h.cleanup();
    h = null;
  }
  return measured;
}

/* -------------------------------------------------------------------------- */
/* The census: what the sweep is over                                          */
/* -------------------------------------------------------------------------- */

test("every LIN.3 figure in the file is a live template, and every live one has a figure", () => {
  expect(FIGURE_IDS.length, "the figure registry derivation found nothing").toBe(5);
  expect(
    LIN3_TEMPLATES.map((template) => template.template_id).sort(),
    "a figure in d3LIN3.tsx names a template the bank no longer has, or the other way round",
  ).toEqual(FIGURE_IDS);
});

/* -------------------------------------------------------------------------- */
/* The frames                                                                  */
/* -------------------------------------------------------------------------- */

test("every LIN.3 worked solution is photographed on the reading surface", async () => {
  for (const templateId of FIGURE_IDS) {
    const frozen = D3_PRACTICE_ITEMS.find((item) => item.template_id === templateId);
    expect(frozen, `${templateId} has no frozen instance to photograph`).toBeDefined();
    h = mount(
      <div style={{ width: `${LESSONS_READING.column}px`, margin: "8px auto" }}>
        <WorkedSolution
          templateId={templateId}
          params={frozen?.template_params ?? {}}
          steps={[]}
        />
      </div>,
    );
    const host = h.host;
    await waitFor(() => host.querySelector("svg") !== null, `${templateId} mounts`);
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      `${templateId} typesets its maths`,
      20_000,
    );
    await shoot(
      `lin3-worked-${templateId.replace(/^d3\.lin3\./, "").replace(/\./g, "-")}-${VIEWPORT.width}x${VIEWPORT.height}`,
    );
    h.cleanup();
    h = null;
  }
});

/* -------------------------------------------------------------------------- */
/* The claim                                                                   */
/* -------------------------------------------------------------------------- */

test("no LIN.3 worked solution draws one of its rows into the next", async () => {
  const draws = everyLin3Draw();
  const measured = await sweep(draws, 12);

  const crowded = measured
    .flatMap((figure) =>
      figure.clearances
        .map((clear, index) => ({ clear, index }))
        .filter((gap) => gap.clear < MIN_CLEAR)
        .map(
          (gap) =>
            `${figure.where}: rows ${gap.index + 1} and ${gap.index + 2} leave ${gap.clear.toFixed(1)}px`,
        ),
    )
    .join("; ");
  const tightest = Math.min(...measured.flatMap((figure) => figure.clearances));
  console.log(
    `${measured.length} LIN.3 figures, tightest row clearance ${tightest.toFixed(1)}px, slack under the lowest ink ${Math.min(...measured.map((f) => f.slack)).toFixed(1)}px to ${Math.max(...measured.map((f) => f.slack)).toFixed(1)}px`,
  );

  expect(
    crowded,
    `these rows are closer than ${MIN_CLEAR}px, so their ink runs together`,
  ).toBe("");

  // The rule between the halves is the figure's whole argument, so it may not be drawn
  // through the maths it is separating.
  expect(
    measured
      .flatMap((figure) => figure.cut.map((row) => `${figure.where}: ${row}`))
      .join("; "),
    "the divider is drawn through these rows",
  ).toBe("");

  // The derived viewBox has to BOUND the content it grew for. An svg clips at its box, so a
  // height that lagged the rows would take the last line off the bottom silently.
  expect(
    measured
      .flatMap((figure) => figure.clipped.map((row) => `${figure.where}: ${row}`))
      .join("; "),
    "these rows are painted outside the figure that holds them",
  ).toBe("");

  // Floors under three absences: a run that mounted nothing, or one where every strut lookup
  // came back null, satisfies all of the above while measuring not one box.
  expect(measured.length, "the sweep rendered no figures").toBeGreaterThanOrEqual(40);
  expect(
    measured.reduce((sum, figure) => sum + figure.rows, 0),
    "the figures drew no rows to measure",
  ).toBeGreaterThanOrEqual(200);
  expect(
    Math.min(...measured.map((figure) => figure.clearances.length)),
    "some figure reported a single row, so nothing was compared in it",
  ).toBeGreaterThanOrEqual(4);

  // COMPOSITION, not just size. Three of these figures rearrange in three moves and two in
  // four, and the four-row shape is the one that stacks two display fractions in a row. A
  // population that drifted to one shape would clear every floor above.
  expect(
    [...new Set(measured.map((figure) => figure.above))].sort(),
    "the sweep no longer covers both rearrangement shapes",
  ).toEqual([3, 4]);
  expect(
    [...new Set(measured.map((figure) => figure.below))],
    "a figure substituted in something other than two rows",
  ).toEqual([2]);
});
