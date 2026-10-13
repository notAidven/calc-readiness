/**
 * Two labels in a worked-solution figure may not be drawn on top of each other.
 *
 * A revealed practice solution is a labelled diagram: a triangle carrying its three sides, a
 * rectangle carrying its diagonal, a bar carrying the percent it shades. The labels are placed
 * in SVG user space, and the ones placed from the GEOMETRY move with the numbers while the ones
 * placed from a CONSTANT do not. Where a figure mixes the two, some draws collide and others do
 * not, which is why this cannot be read off the source.
 *
 * The reported case is GEO.1's Pythagorean figure. Its hypotenuse label is pushed out along the
 * outward normal of the hypotenuse, so on a shallow triangle it comes to rest low and near the
 * right-angle corner — where a `<text>` reading "right angle" is nailed to `corner + (34, -22)`.
 * At 5-12-13 the two boxes share about 28px across and 10px down, and the learner reads the
 * hypotenuse's "13" through the word "angle".
 *
 * ## Why this is a browser test
 *
 * Everything above is layout. `visualsMath.test.tsx` renders the same figures in jsdom and is
 * the right place for the claims about their LaTeX; it cannot see a collision, because jsdom
 * gives every box a zero rect. The overlap is only real once Chromium has laid the KaTeX out.
 *
 * ## What a label's box is
 *
 * Not the `foreignObject`. `SvgMath` deliberately gives every label a roomy box — 220 user units
 * wide for a 60-unit equation — with the KaTeX flex-centred inside it, so that nothing needs a
 * measurement pass and nothing clips. Boxes that wide overlap constantly and correctly, and a
 * sweep over them would report about a hundred collisions on figures a learner reads fine.
 *
 * So each label is measured as the ink:
 *
 *  - ACROSS, the `.katex` box, which shrinks to the glyphs because it is a flex item.
 *  - DOWN, the `.strut`, for the reason `katexBaseline.ts` gives at length: the strut is the one
 *    box KaTeX guarantees runs from the top of the expression's height to the bottom of its
 *    depth. The `.katex` box carries `line-height: 1.2` on top of that, and measuring down it
 *    would add about 20% of a halo to every label and invent collisions between rows that are
 *    correctly spaced.
 *
 * A plain `<text>` has neither, and its own box is NOT the ink: an SVG text box is the font's
 * em box, ascent to descent, which for a glyph like the down-arrow between two reduction rows is
 * about 40% taller than anything drawn. `ExpressionReductionWorked` parks a 12-unit arrow in a
 * 12-unit gap between two rows on purpose, so measured as a box it "collides" with both of its
 * neighbours on every fraction row in D2 while a learner sees clear space. So a `<text>` is
 * measured from its own baseline (`getStartPositionOfChar`, mapped to the screen through the
 * SVG's CTM) out to the ink extents Canvas reports for that exact string in that exact font.
 *

 * ## The population is the template's variety, not the frozen pool
 *
 * The pool holds one or two instances per template; the defect lives in the SHAPE of a draw. The
 * 3-4-5 that GEO.1 froze clears its label by 20px, and nine other triples a learner reaches
 * through retries and infinite practice do not. So the sweep renders every distinct parameter
 * draw a template produces, capped per template, and `practiceSweep.ts` owns that derivation and
 * the census that keeps it honest. The floors below are what stop an empty or collapsed
 * population from reporting green: every claim here is an ABSENCE.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CFU_ONLY_TEMPLATE_LIST } from "./cfuVariants";
import { cornerMismatches } from "./drawnTriangle";
import { paintedInk } from "./katexInk";
import {
  bankDomains,
  DRAWS_PER_TEMPLATE,
  domainOf,
  everyCfuDraw,
  everyDraw,
  figureGapCensus,
  figureGapReport,
  LIVE_PRACTICE_ITEMS,
  NOT_SWEPT_HERE,
  practiceRegistryNames,
  REGISTERED_TEMPLATE_IDS,
  REGISTRY_FLOOR,
  TEMPLATE_FLOOR,
} from "./practiceSweep";
import {
  CITY_PHONE,
  DESKTOP_VIEWPORT,
  FIGURE_CONTENT_CAP,
  PHONE_VIEWPORT,
} from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { WorkedSolution } from "./WorkedSolution";
import { ROW_GAP } from "./workedKit";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

let h: Harness | null = null;

/**
 * A desktop viewport, so a figure host set to 460px really is 460px wide. The browser default
 * is a 414px phone, which would squeeze every figure and measure something else.
 */
beforeAll(async () => {
  await page.viewport(1440, 900);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * How much two labels may share before it is a collision, in px.
 *
 * Two px on BOTH axes. Labels that merely abut — a fraction's rule against the digit beside it,
 * two equation rows whose struts touch — are not the subject, and the reported defect is 28px by
 * 10px, so nothing real hides under this.
 */
const TOUCH = 2;

/**
 * Every figure is drawn in a viewBox and scaled to the width it is given, so a collision inside
 * one is scale-invariant: measuring at the figure content cap measures it everywhere. That is
 * not true of the classify boards next door, whose columns are CSS, which is why that file
 * measures at two widths and this one does not need to.
 */
const WIDTH = FIGURE_CONTENT_CAP;

/** How many figures to put on screen per mount. Purely a throughput knob. */
const BATCH = 24;

/**
 * The one glyph in these figures that is CONNECTOR rather than label.
 *
 * `ExpressionReductionWorked` writes its down-arrow as a `<text>`, but it is doing the job the
 * number line's axis and the triangle's outline do: it joins two rows rather than naming
 * anything. It is also placed in the 12-unit `ROW_GAP` between two rows' RESERVED boxes, and a
 * reserved box is not ink — KaTeX's strut runs to the mathematical height and depth of the
 * expression, which for a `\sqrt` or a `\tfrac` stands clear of the glyphs inside it. Measuring
 * an arrow's ink against a neighbour's reserved box therefore reads a few px of overlap on every
 * fraction row in D2 over space a learner sees as empty: up to 5.6 down on Windows and 6.6 on
 * Linux CI, the difference being the fallback font the arrow lands in rather than the layout.
 *
 * So it is not counted as a label — and, because "not counted" is how a real defect hides, the
 * clearance it is allowed is PINNED and asserted in both directions below.
 */
const CONNECTOR_GLYPH = "\u2193";

interface Label {
  /** What the label says, so a failure names the ink and not a node index. */
  readonly what: string;
  readonly box: DOMRect;
  /** True for the connector above: measured, reported, but not a label. */
  readonly connector: boolean;
}

interface Collision {
  readonly where: string;
  readonly one: string;
  readonly other: string;
  readonly across: number;
  readonly down: number;
  /** True when one side of the pair is the row connector rather than a label. */
  readonly connector: boolean;
}

/**
 * The ink box of one KaTeX label: the `.katex` box across, the `.strut` down.
 *
 * `null` rather than a fallback box when either is missing, so a selector that stopped matching
 * is counted as a label NOT measured (and trips the floor) instead of silently contributing a
 * rectangle that means nothing.
 */
function paintedMathBox(host: Element): DOMRect | null {
  const katex = host.querySelector<HTMLElement>(".katex");
  if (katex === null) {
    return null;
  }
  const strut = katex.querySelector<HTMLElement>(".strut");
  const across = katex.getBoundingClientRect();
  if (strut === null) {
    return null;
  }
  const down = strut.getBoundingClientRect();
  return new DOMRect(across.left, down.top, across.width, down.height);
}

let inkContext: CanvasRenderingContext2D | null = null;

function measuringContext(): CanvasRenderingContext2D {
  if (inkContext === null) {
    const context = document.createElement("canvas").getContext("2d");
    if (context === null) {
      throw new Error("no 2d context to measure text ink with");
    }
    inkContext = context;
  }
  return inkContext;
}

/**
 * The ink box of one plain `<text>`: its own box across, its baseline plus Canvas's reported
 * ink ascent and descent down.
 *
 * `getStartPositionOfChar` gives the baseline in USER units after any `dominant-baseline`
 * shift, and the SVG's screen CTM carries it to the page, which is also where the figure's
 * scale comes from — a 440-unit viewBox painted 460px wide.
 */
function paintedTextBox(node: SVGTextElement, text: string): DOMRect | null {
  const across = node.getBoundingClientRect();
  const ctm = node.getScreenCTM();
  if (ctm === null || across.width < 0.5) {
    return null;
  }
  const start = node.getStartPositionOfChar(0);
  const baseline = new DOMPoint(start.x, start.y).matrixTransform(ctm).y;
  const style = getComputedStyle(node);
  const context = measuringContext();
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const ink = context.measureText(text);
  // The scale the CTM applies down the page. Uniform here — every figure keeps its aspect
  // ratio — but read off the matrix rather than assumed.
  const scale = Math.hypot(ctm.b, ctm.d);
  const top = baseline - ink.actualBoundingBoxAscent * scale;
  const bottom = baseline + ink.actualBoundingBoxDescent * scale;
  return new DOMRect(across.left, top, across.width, bottom - top);
}

/** Every label drawn inside one figure's SVG, as the boxes a learner sees. */
function labelsIn(svg: SVGElement): Label[] {
  const labels: Label[] = [];
  for (const host of Array.from(svg.querySelectorAll("foreignObject[data-latex]"))) {
    const box = paintedMathBox(host);
    if (box === null || box.width < 0.5 || box.height < 0.5) {
      continue;
    }
    labels.push({
      what: `$${host.getAttribute("data-latex") ?? ""}$`,
      box,
      connector: false,
    });
  }
  for (const node of Array.from(svg.querySelectorAll<SVGTextElement>("text"))) {
    const text = (node.textContent ?? "").trim();
    if (text.length === 0) {
      continue;
    }
    const box = paintedTextBox(node, text);
    if (box === null || box.width < 0.5 || box.height < 0.5) {
      continue;
    }
    labels.push({ what: `"${text}"`, box, connector: text === CONNECTOR_GLYPH });
  }
  return labels;
}

/** Every pair in one figure that shares more than `TOUCH` px on both axes. */
function collisionsIn(where: string, labels: readonly Label[]): Collision[] {
  const found: Collision[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const a = labels[i] as Label;
      const b = labels[j] as Label;
      const across = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
      const down = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
      if (across > TOUCH && down > TOUCH) {
        found.push({
          where,
          one: a.what,
          other: b.what,
          across,
          down,
          connector: a.connector || b.connector,
        });
      }
    }
  }
  return found;
}

interface Sweep {
  /** Every instance that actually drew a figure, by `template_id` and params. */
  readonly figures: string[];
  readonly labels: number;
  readonly collisions: Collision[];
}

/** Render `items` in batches and measure every figure any of them draws. */
async function sweepFigures(
  items: readonly { template_id: string; template_params: Record<string, number> }[],
): Promise<Sweep> {
  const figures: string[] = [];
  const collisions: Collision[] = [];
  let labels = 0;

  for (let at = 0; at < items.length; at += BATCH) {
    const batch = items.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        // Keyed by the DRAW, never by an index: the key has to change when the params do, or
        // React reuses a figure and the second instance is measured on the first one's
        // layout. `everyDraw` deduplicates on this same string, so it is unique.
        const draw = `${item.template_id} ${JSON.stringify(item.template_params)}`;
        return (
          <div key={draw} data-instance={draw} style={{ width: `${WIDTH}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      `batch at ${at} mounts`,
      20_000,
    );
    // Every measurement below is of rendered maths, so mounting is not far enough: `useKatex`
    // typesets in an effect AFTER the box exists. Stated as "nothing is still waiting" rather
    // than "some maths has appeared", which is the stronger wait and holds out for the last
    // label rather than the first.
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      `batch at ${at} typesets its maths`,
      20_000,
    );

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const svg = wrapper.querySelector("svg");
      if (svg === null) {
        continue;
      }
      const where = wrapper.dataset.instance ?? "";
      const found = labelsIn(svg);
      figures.push(where);
      labels += found.length;
      collisions.push(...collisionsIn(where, found));
    }

    h.cleanup();
    h = null;
  }

  return { figures, labels, collisions };
}

function report(collisions: readonly Collision[]): string {
  return collisions
    .map(
      (c) =>
        `${c.where}: ${c.one} over ${c.other} by ${c.across.toFixed(1)}x${c.down.toFixed(1)}px`,
    )
    .join("; ");
}

/* -------------------------------------------------------------------------- */
/* The census: what the sweep is over                                          */
/* -------------------------------------------------------------------------- */

test("the sweep covers every registered practice template in the domains it reaches", () => {
  const swept = new Set(everyDraw().map((item) => item.template_id));
  expect(REGISTERED_TEMPLATE_IDS.length).toBeGreaterThanOrEqual(TEMPLATE_FLOOR);
  for (const id of REGISTERED_TEMPLATE_IDS) {
    expect(swept.has(id), `${id} is never swept`).toBe(true);
  }
});

/**
 * And every CHECK-only template, which is a separate claim because it is a separate registry.
 *
 * A `cfu.*` figure is a labelled diagram drawn by the same components as the practice ones, and
 * the population above cannot reach it: `REGISTERED_TEMPLATE_IDS` is the item bank's, and these
 * ids are not in the item bank. Scoped to where the mechanic is implemented, this sweep passed
 * over thirty figures it had never rendered.
 *
 * Floored under the list itself rather than under a number written here, so a filter that
 * started returning nothing fails instead of agreeing.
 */
test("the sweep covers every check-only template too", () => {
  const swept = new Set(everyCfuDraw().map((item) => item.template_id));
  expect(CFU_ONLY_TEMPLATE_LIST.length).toBeGreaterThanOrEqual(30);
  for (const template of CFU_ONLY_TEMPLATE_LIST) {
    expect(swept.has(template.template_id), `${template.template_id} is never swept`).toBe(
      true,
    );
  }
});

test("the sweep names every domain it leaves out, and leaves out no domain it names", () => {
  expect(
    practiceRegistryNames().length,
    "the registry derivation found nothing",
  ).toBeGreaterThanOrEqual(REGISTRY_FLOOR);

  const sweptDomains = new Set(REGISTERED_TEMPLATE_IDS.map(domainOf));
  expect([...bankDomains()].filter((domain) => !sweptDomains.has(domain)).sort()).toEqual(
    NOT_SWEPT_HERE.map((entry) => entry.domain).sort(),
  );
});

/**
 * And the REASON each excused domain gives, which the test above cannot see.
 *
 * The same assertion `visualsMath.test.tsx` carries, and here for the same reason the
 * membership test above is duplicated: both sweeps consume `NOT_SWEPT_HERE`, and an exemption
 * checked in one of them is an exemption the other still takes on trust.
 *
 * Every assertion over the list before this one was about MEMBERSHIP, so it could go on
 * excusing a domain whose excuse had stopped being true: `d6` is on it because no `d6.` key
 * exists in `WORKED_SOLUTION_VISUALS`, and registering one would have changed nothing anywhere.
 * `.cursor/rules/qa-verification.mdc` calls that an exception that becomes permanent by
 * neglect, and asks for a named list that fails BOTH ways. Both ways:
 *
 * - a listed domain that ACQUIRES a registered figure fails, so the entry cannot outlive its
 *   reason;
 * - a bank domain with NO registered figure that is not listed fails, so a domain cannot
 *   quietly sit outside the sweeps undeclared.
 *
 * Floored underneath, because both halves are absences: an empty bank agrees with any list of
 * exclusions, and "no figure" is trivially true of a domain with no templates, which would
 * make the exemption excuse nothing at all.
 *
 * FORCED FALSE BOTH WAYS, at this tree. Registering a `d6.` key reds the first assertion at
 * *"these declared gaps now have a registered figure"*; dropping the `d6` entry from
 * `NOT_SWEPT_HERE` reds the second at *"these bank domains have no registered figure and are
 * not declared as a gap"*. Both quoted in `docs/`.
 */
test("the sweep excuses a domain only for as long as it has no registered figure", () => {
  const census = figureGapReport();
  const rows = figureGapCensus();
  const listed = NOT_SWEPT_HERE.map((entry) => entry.domain).sort();

  expect(rows.size, `the bank derivation found nothing: ${census}`).toBeGreaterThanOrEqual(
    REGISTRY_FLOOR,
  );
  expect(
    [...rows.values()].filter((row) => row.figures > 0).length,
    `no domain in the bank has a registered figure, so this census is measuring nothing: ${census}`,
  ).toBeGreaterThanOrEqual(8);

  const withoutFigures = [...rows]
    .filter(([, row]) => row.figures === 0)
    .map(([domain]) => domain)
    .sort();

  expect(
    listed.filter((domain) => !withoutFigures.includes(domain)),
    `these declared gaps now have a registered figure, so the reason they are excused has stopped being true: ${census}`,
  ).toEqual([]);
  expect(
    withoutFigures.filter((domain) => !listed.includes(domain)),
    `these bank domains have no registered figure and are not declared as a gap: ${census}`,
  ).toEqual([]);

  // An exemption resting on an empty registry excuses nothing, so each listed domain has to be
  // a real domain with real templates that genuinely have no figure between them.
  for (const domain of listed) {
    expect(
      rows.get(domain)?.templates ?? 0,
      `${domain} is excused over an empty registry: ${census}`,
    ).toBeGreaterThanOrEqual(20);
  }
});

/**
 * A floor constrains SIZE, not SHAPE. A population of a thousand instances is satisfied by the
 * frozen pool plus a thousand redraws of one template, and this sweep exists precisely because
 * the frozen pool is the wrong shape. So the composition is asserted beside the size: the draws
 * BEYOND the pool are counted on their own, and so are the templates that contributed more than
 * one shape, which is the property that would have caught the reported defect.
 */
test("the sweep is genuinely wider than the frozen pool it starts from", () => {
  const all = everyDraw();
  const beyond = all.length - LIVE_PRACTICE_ITEMS.length;
  expect(
    beyond,
    "every instance swept came from the frozen pool, so the sweep sees one shape per template",
  ).toBeGreaterThanOrEqual(400);

  const perTemplate = new Map<string, number>();
  for (const item of all) {
    perTemplate.set(item.template_id, (perTemplate.get(item.template_id) ?? 0) + 1);
  }
  const varied = [...perTemplate.values()].filter((count) => count > 1).length;
  expect(
    varied,
    "no template contributed more than one shape, so the sweep is the pool wearing a bigger number",
  ).toBeGreaterThanOrEqual(60);
  expect(DRAWS_PER_TEMPLATE).toBeGreaterThanOrEqual(10);
});

/* -------------------------------------------------------------------------- */
/* The claim                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How far the row connector may reach into a neighbouring row's reserved box, DOWN the page, in
 * px.
 *
 * A PIN, not a tolerance, and it is what stops the connector's exemption from being a hole. The
 * arrow is excused from the label claim because it is furniture in a designed gap; that excuse is
 * only true while it stays in the gap. So the reach is measured against `ROW_GAP` itself: an
 * overlap of a whole gap's worth means the arrow has crossed the entire clearance it was given,
 * which is exactly "it has left the gap" and is true whatever the arrow is drawn in. The figure
 * is painted a shade over 1:1 (a 440-unit viewBox at 460px), so pinning the unit count as px is
 * marginally tighter than the real gap rather than looser.
 *
 * ## Why there is no ACROSS pin
 *
 * There was one, at 7px, and it failed on CI while passing on Windows. It was not measuring
 * containment at all. The arrow is drawn at `cx` with `textAnchor="middle"` and every row's math
 * is centred on that same `cx`, so the arrow's span is always wholly inside the expression's:
 * the horizontal overlap is IDENTICALLY the arrow's own advance width, whatever the layout does.
 * Measured: 6.00px on Windows and 9.9px on Linux CI, constant across all six D2 templates that
 * report here while the KaTeX boxes beside them ranged from 16.10 to 56.47px. The arrow is a
 * `<text>` with no `font-family`, so U+2193 falls out of the Nunito stack to a system font that
 * differs by OS, and the old pin had frozen the Windows glyph's width.
 *
 * There is also no horizontal claim to be made: the gap is a full-width band and the arrow is
 * centred in it by construction, so no amount of horizontal reach would mean anything has gone
 * wrong. Containment here is vertical, and only vertical.
 */
const CONNECTOR_CLEARANCE_DOWN = ROW_GAP;

test("no worked-solution figure draws two of its labels on top of each other", {
  timeout: 600_000,
}, async () => {
  const { figures, labels, collisions } = await sweepFigures([
    ...everyDraw(),
    ...everyCfuDraw(),
  ]);

  expect(
    report(collisions.filter((c) => !c.connector)),
    "these figures paint one label over another, so a learner reads them through each other",
  ).toBe("");

  // Floors under an ABSENCE. A run that mounted nothing, or one where every `.katex` lookup
  // came back null, satisfies the assertion above while measuring not one box.
  expect(figures.length, "the sweep rendered no figures").toBeGreaterThanOrEqual(500);
  expect(labels, "the figures drew no labels to measure").toBeGreaterThanOrEqual(2000);

  // A floor constrains SIZE, not SHAPE, and the total above is satisfied by the practice pools
  // alone. So the half that was missing is counted on its own: the check-only figures have to
  // have RENDERED, by id, or a `cfu.*` template whose registry entry went away would leave the
  // sweep as wide as it was the day it measured none of them.
  const renderedIds = figures.map((where) => where.split(" ")[0] ?? "");
  const cfuIds = new Set(renderedIds.filter((id) => id.startsWith("cfu.")));
  expect(
    cfuIds.size,
    "no check-only figure rendered, so this sweep is the practice pools again",
  ).toBeGreaterThanOrEqual(30);

  // The same claim for D3, for the same reason and with a sharper history behind it. D3 was a
  // NAMED entry in `practiceSweep.ts`'s `NOT_SWEPT_HERE` until this round: no sweep in the tree
  // rendered one of its figures, and a Unicode operator injected into one of them left 844 tests
  // passing. Its twenty-five are inside the derived population now, and the floors above are all
  // satisfied without a single one of them, so its presence is counted on its own rather than
  // left to the total. Printed as well as asserted, because a domain that silently stopped
  // contributing is the quietest way for this to go back to what it was.
  const perDomain = new Map<string, number>();
  for (const id of renderedIds) {
    const domain = domainOf(id);
    perDomain.set(domain, (perDomain.get(domain) ?? 0) + 1);
  }
  const census = [...perDomain]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, count]) => `${domain}=${count}`)
    .join(" ");
  console.log(
    `[workedFigureLabels] ${figures.length} figures, ${labels} labels, ${collisions.length} collisions (${census})`,
  );
  const d3Ids = new Set(renderedIds.filter((id) => id.startsWith("d3.")));
  expect(
    d3Ids.size,
    `no D3 figure rendered, so this sweep is back to the population that missed them: ${census}`,
  ).toBeGreaterThanOrEqual(25);

  // THE OTHER DIRECTION on the connector's exemption. Excusing it from the claim above is
  // only defensible while it stays inside the gap it was placed in, so the reach it is
  // allowed is asserted rather than assumed. A `ROW_GAP` that shrank, an arrow that grew, or
  // a row whose reserved height was mis-measured all land here instead of going quiet.
  const past = collisions.filter((c) => c.connector && c.down > CONNECTOR_CLEARANCE_DOWN);
  expect(
    report(past),
    "the row connector has left the gap it is excused for and is reaching into the rows themselves",
  ).toBe("");

  // And that the exemption is EXCUSING something rather than decorating the file: the arrow
  // really does read as overlapping the reserved boxes either side of it, which is the whole
  // reason it is not counted as a label. If that stops being true, this pin is dead code and
  // the connector should go back into the population.
  expect(
    collisions.filter((c) => c.connector).length,
    "no connector reading at all, so the exemption above excuses nothing and should be deleted",
  ).toBeGreaterThanOrEqual(20);
});

/* -------------------------------------------------------------------------- */
/* The same figure at the narrowest column that ships                          */
/* -------------------------------------------------------------------------- */

/**
 * EVERY FIGURE IS THE SAME FIGURE AT THE PHONE COLUMN, AND STAYS INSIDE IT.
 *
 * `WIDTH` above is the figure content cap, on the reasoning quoted there: a figure is drawn in
 * a viewBox and scaled to whatever width it is given, so a collision inside one is
 * scale-invariant and measuring at 460 measures it everywhere. That reasoning is correct. It
 * is also an ARGUMENT, and nothing in the tree measured it — while `readingWidths.ts` exists
 * precisely because the last thing this codebase believed about 460px ("the width the
 * stylesheet gives every lesson card") was false at every real container, and a fix that
 * measured itself there passed over a phone that still wrapped every figure it had touched.
 *
 * The invariance is not a law. A `@media (max-width: 720px)` rule reaching into a figure, a
 * `min-width` in px on a ledger cell, a font that resolves differently inside a `foreignObject`
 * at a small device scale: any of them breaks it, and if it breaks, every layout claim in this
 * file is being made about a width no learner has. So it is measured. Each figure is rendered
 * at the cap in a desktop viewport and again at `CITY_PHONE.column` in a 390x844 phone, and
 * every label's ink is compared as a FRACTION of its own figure's frame. Equal fractions is
 * exactly "the same figure, smaller".
 *
 * ## Containment is a second claim, and the first does not imply it
 *
 * Two renderings can agree perfectly and both hang a label off the right-hand edge. The
 * overlap sweep cannot see that either — a label alone over the edge of the frame collides
 * with nothing. `POL.4`'s closing line is checked this way already, for one template and one
 * label; this is the same check for every registered figure and every label on it, made at the
 * width where an overflowing label has the least room to be wrong in.
 *
 * ## The population is one draw per FIGURE, plus the extremes by name
 *
 * Both claims here are about the RENDERING rather than the draw: a figure that scales does so
 * for every set of numbers, and one that has stopped does so for all of them too. So the
 * population is one draw of every template with a registered visual, practice and check
 * alike, which is the whole shipped set of figures rather than a sample of one domain's.
 *
 * That is the right population for scaling and the wrong one for containment, because what
 * runs a label off the edge is a long STRING. So the widest boards the pools can deal are
 * named below and appended, the way the GEO.1 extremes are: the seeded draws reach neither.
 */
const NARROW_WIDTH = CITY_PHONE.column;

/**
 * How far a label's normalised position may move between the two widths, in px at the cap.
 *
 * Essentially zero is the correct expectation: a `foreignObject`'s contents are laid out in
 * USER units and the whole SVG is then scaled, so the same figure at two widths differs by a
 * multiplier and nothing else. What is left is sub-pixel: the frame's own origin lands on a
 * fractional pixel at one width and not the other, and `getBoundingClientRect` rounds inside
 * that. Measured over the population below, the worst reading is well under a pixel; a real
 * break in the invariance moves a label by a fraction of the figure, which is tens of px here.
 */
const NARROW_DRIFT = 1.5;

/** How far any label's ink may sit outside its own figure's frame, in px. */
const FRAME_SLACK = 0.5;

/**
 * The widest board `d6.fun1.log-function-count.l2` can deal, which its seeded draws do not.
 *
 * Its reveal prints the clashing pair against every failing log — `no: (8, 18) and (8, 15)` —
 * inside a row plate, so the longest cell it can ever print is a one-digit setting against two
 * two-digit motions, on all three of the failing logs a `count` of 1 leaves. Settings are drawn
 * from 1..9 and motions from a pool topping out at 18, so no board can print a longer cell than
 * this one; the assertion below holds that claim against the draws rather than asserting it here.
 */
const WIDEST_LEDGER: Record<string, number> = {
  count: 1,
  mask: 1,
  rep0: 0,
  one0: 0,
  two0: 0,
  rep1: 8,
  one1: 18,
  two1: 15,
  rep2: 9,
  one2: 10,
  two2: 12,
  rep3: 7,
  one3: 14,
  two3: 18,
};

/**
 * And the furthest `d6.cg1.plot-offset.l1`'s walk can reach, which its seeded draws do not
 * either: both legs at their longest and both signs flipped, so the two leg numbers are pushed
 * to the far side of an L that fills the plot into the third quadrant.
 */
const WIDEST_OFFSET_PLOT: Record<string, number> = { ax: 9, ay: 9, ex: 1, ey: 1 };

const NAMED_EXTREMES: readonly {
  template_id: string;
  template_params: Record<string, number>;
}[] = [
  { template_id: "d6.fun1.log-function-count.l2", template_params: WIDEST_LEDGER },
  { template_id: "d6.cg1.plot-offset.l1", template_params: WIDEST_OFFSET_PLOT },
];

/** The verdict string the ledger prints for one log, as the length that has to fit. */
function verdictLength(params: Record<string, number>, index: number): number {
  const mask = params.mask ?? 0;
  const repeated = params[`rep${index}`] ?? 0;
  const one = params[`one${index}`] ?? 0;
  const two = params[`two${index}`] ?? 0;
  if ((mask & (1 << index)) !== 0 || repeated === 0 || one === two) {
    return 0;
  }
  return `no: (${repeated}, ${one}) and (${repeated}, ${two})`.length;
}

const widestVerdict = (params: Record<string, number>): number =>
  Math.max(...[0, 1, 2, 3].map((index) => verdictLength(params, index)));

/** One draw of every template that draws a figure at all, practice and check alike. */
function onePerFigure(): {
  template_id: string;
  template_params: Record<string, number>;
}[] {
  const byId = new Map<
    string,
    { template_id: string; template_params: Record<string, number> }
  >();
  for (const item of [...everyDraw(), ...everyCfuDraw()]) {
    if (
      byId.has(item.template_id) ||
      getWorkedSolutionVisual(item.template_id) === undefined
    ) {
      continue;
    }
    byId.set(item.template_id, {
      template_id: item.template_id,
      template_params: item.template_params,
    });
  }
  return [...byId.values(), ...NAMED_EXTREMES];
}

interface FramedFigure {
  readonly frame: DOMRect;
  readonly labels: readonly Label[];
}

/** Render every item at one width and viewport, and keep each figure's frame and labels. */
async function readFigures(
  items: readonly { template_id: string; template_params: Record<string, number> }[],
  width: number,
  viewport: { readonly width: number; readonly height: number },
): Promise<Map<string, FramedFigure>> {
  await page.viewport(viewport.width, viewport.height);
  const read = new Map<string, FramedFigure>();

  for (let at = 0; at < items.length; at += BATCH) {
    const batch = items.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        const draw = `${item.template_id} ${JSON.stringify(item.template_params)}`;
        return (
          <div key={draw} data-instance={draw} style={{ width: `${width}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      `narrow batch at ${at} mounts`,
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      `narrow batch at ${at} typesets`,
      20_000,
    );
    // AND that the maths is typeset in the FONT it ships in. Every other sweep in this file
    // compares labels drawn in one pass, so a run that measured KaTeX's metrics before its
    // webfonts arrived measured them all the same way and reported nothing. This test
    // compares two passes, so an unloaded font in the first is a difference between them: it
    // read up to 18px of "drift" on the widest D1 rows, all of it Nunito standing in for
    // KaTeX_Main, on figures that in fact scale to five decimal places.
    await document.fonts.ready;

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const svg = wrapper.querySelector("svg");
      if (svg === null) {
        continue;
      }
      read.set(wrapper.dataset.instance ?? "", {
        frame: svg.getBoundingClientRect(),
        labels: labelsIn(svg),
      });
    }

    h.cleanup();
    h = null;
  }

  return read;
}

test("every worked figure is the same figure at the phone column, and stays inside it", {
  timeout: 900_000,
}, async () => {
  const items = onePerFigure();

  // The named extremes really are the extremes: nothing the seeded draws produce prints a
  // longer ledger cell than the board named above. Without this the "widest" board is an
  // assertion in a comment, and a pool that gained a three-digit motion would leave the
  // containment claim below measuring a case a learner no longer meets.
  const drawnWidest = Math.max(
    ...everyDraw()
      .filter((item) => item.template_id === "d6.fun1.log-function-count.l2")
      .map((item) => widestVerdict(item.template_params)),
  );
  expect(drawnWidest, "no ledger draw printed a verdict at all").toBeGreaterThan(0);
  expect(
    widestVerdict(WIDEST_LEDGER),
    "a real draw prints a wider ledger cell than the board named as the widest",
  ).toBeGreaterThanOrEqual(drawnWidest);

  const wide = await readFigures(items, WIDTH, DESKTOP_VIEWPORT);
  const narrow = await readFigures(items, NARROW_WIDTH, PHONE_VIEWPORT);

  const drifted: string[] = [];
  const escaped: string[] = [];
  let compared = 0;
  let labelsCompared = 0;

  for (const [where, big] of wide) {
    const small = narrow.get(where);
    if (small === undefined) {
      drifted.push(`${where} drew a figure at ${WIDTH}px and none at the phone column`);
      continue;
    }
    if (small.labels.length !== big.labels.length) {
      drifted.push(
        `${where} drew ${big.labels.length} labels at ${WIDTH}px and ${small.labels.length} at the phone column`,
      );
      continue;
    }
    compared += 1;

    for (let index = 0; index < big.labels.length; index += 1) {
      const a = big.labels[index] as Label;
      const b = small.labels[index] as Label;
      labelsCompared += 1;
      // Both axes are normalised by the frame's WIDTH: the scale is uniform, so one divisor
      // keeps the drift in a single unit and reports it as px at the cap.
      const at = (label: Label, figure: FramedFigure) => ({
        left: (label.box.left - figure.frame.left) / figure.frame.width,
        right: (label.box.right - figure.frame.left) / figure.frame.width,
        top: (label.box.top - figure.frame.top) / figure.frame.width,
        bottom: (label.box.bottom - figure.frame.top) / figure.frame.width,
      });
      const one = at(a, big);
      const two = at(b, small);
      const worst =
        Math.max(
          Math.abs(one.left - two.left),
          Math.abs(one.right - two.right),
          Math.abs(one.top - two.top),
          Math.abs(one.bottom - two.bottom),
        ) * big.frame.width;
      if (worst > NARROW_DRIFT) {
        drifted.push(
          `${where}: ${a.what} moves ${worst.toFixed(1)}px (as px at ${WIDTH}) between the cap and the phone column`,
        );
      }

      const frame = small.frame;
      if (
        b.box.left < frame.left - FRAME_SLACK ||
        b.box.right > frame.right + FRAME_SLACK ||
        b.box.top < frame.top - FRAME_SLACK ||
        b.box.bottom > frame.bottom + FRAME_SLACK
      ) {
        escaped.push(
          `${where}: ${b.what} runs ${b.box.left.toFixed(1)}..${b.box.right.toFixed(1)} x ${b.box.top.toFixed(1)}..${b.box.bottom.toFixed(1)} against a frame of ${frame.left.toFixed(1)}..${frame.right.toFixed(1)} x ${frame.top.toFixed(1)}..${frame.bottom.toFixed(1)}`,
        );
      }
    }
  }

  expect(
    drifted.join("; "),
    `these figures are not the same figure at ${NARROW_WIDTH}px as at ${WIDTH}px, so every layout claim in this file is being made about a width no learner has`,
  ).toBe("");
  expect(
    escaped.join("; "),
    "these labels are drawn outside their own figure's frame at the narrowest column that ships",
  ).toBe("");

  // Floors under two ABSENCES. A pass that rendered nothing, or one where every figure came
  // back with zero labels, satisfies both assertions above while measuring not one box.
  expect(compared, "no figure was compared across the two widths").toBeGreaterThanOrEqual(
    150,
  );
  expect(labelsCompared, "no label was compared").toBeGreaterThanOrEqual(800);
  // And a floor on the SHAPE rather than the size: the check-only figures are a separate
  // registry, and the sweep above them was scoped past them once already.
  const cfuCompared = [...wide.keys()].filter((where) => where.startsWith("cfu.")).length;
  expect(
    cfuCompared,
    "no check-only figure was compared, so this is the practice registries again",
  ).toBeGreaterThanOrEqual(25);

  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height);
});

/**
 * How much taller than the fraction it holds a grown delimiter may be.
 *
 * ## The numbers this used to carry were the font's, not the fraction's
 *
 * This constant was 1.5, justified by "53.0 against a fraction of 26.0" and used to reject
 * `\left(` in favour of `\bigl(`, which shipped a bracket a learner then reported as still
 * too short. Both figures came from `getBoundingClientRect` on the wrapper spans, and
 * `.mfrac`'s box is the FONT's ascent-plus-descent: it reads 21.0 units here whatever
 * fraction is inside it, so the ratio was a real delimiter over a constant. `katexInk.ts`
 * sets out the trap at length and supplies the measurement used now.
 *
 * ## What the sizes really are
 *
 * Painted ink, `d4.pol4.complete.l1` at `middle = 14`, in the figure's own user units:
 *
 *   \dfrac{14}{2} .. 37.0    \bigl size1 .. 22.0  0.60x    \Bigl size2 .. 31.6  0.85x
 *   \left / \biggl size3 .. 41.1  1.11x            \Biggl size4 .. 52.6  1.42x
 *
 * `\left(` is therefore not oversized at all: it is the smallest canned size that clears the
 * fraction, which is what `delimiterShortfall` is for. `\Biggl` is the one that is too big,
 * and it is too big for the reason this test was written — the `^{2}` after it is set from
 * the delimiter's top, and at `size4` that puts the exponent's ink at 56.8..65.4 against a
 * down-arrow whose ink ends at 58.0, i.e. 1.2 units INTO it. At `size3` the same exponent
 * runs 62.2..70.8 and clears the arrow by 4.2.
 *
 * So 1.25 sits between the largest correct reading (1.11) and the smallest incorrect one
 * (1.42), where 1.5 sat above both. There is still no LOWER bound here, deliberately: a
 * delimiter shorter than a fraction elsewhere in the same row is often correct
 * (`\bigl(x\bigr)\dfrac{1}{2}`), so the too-SHORT direction is claimed against the authored
 * string in `visualsMath.test.tsx`, where the nesting is readable, and spatially in
 * `bracketSizing.browser.test.tsx`, over every figure that draws a bracket round tall math.
 */
const DELIMITER_OVER_FRACTION = 1.25;

/**
 * Every SUPERSCRIPTED grown delimiter that holds a fraction, as a ratio of the two heights.
 *
 * ## The population is the behaviour, not the mechanic
 *
 * An oversized `\left(` on its own is not a defect and is not measured here. D1's
 * `num-f.l3b` draws `\left(\dfrac{2}{5} + \dfrac{1}{2}\right)\times\dfrac{1}{3}` and its
 * delimiter is the same 2.05x — correctly, because that is what a paper would print and
 * nothing is set from its top. What makes the D4 figure wrong is the SUPERSCRIPT: TeX sets
 * one from the top of the atom before it, so an oversized delimiter carries the exponent up
 * with it and away from the fraction it squares. Scoping to "a delimiter is big" would have
 * failed eleven correct D1 draws (measured, at the injected tree) to catch one real defect.
 *
 * So a reading is taken only where a `.msupsub` sits immediately after a delimiter: the
 * exponent's own previous sibling has to BE the grown delimiter, or contain it, which is
 * what "this superscript is attached to that bracket" looks like in KaTeX's output. A `+
 * x^{2}` further along the same row has an `mord` before it and contributes nothing.
 *
 * ## Neither side of the ratio may be a span's own box
 *
 * BOTH are painted ink, via `paintedInk`. A KaTeX span's border box is the font's
 * ascent-plus-descent, so `.mfrac`'s box is 21.0 units for every fraction in these figures
 * and a ratio taken against it divides by a constant. That is not a hypothetical: it is what
 * this function did, and it is why it read 2.05 for a correctly sized `\left(` and 1.00 for
 * the `size1` bracket a learner could see was too short.
 */
function delimiterRatios(svg: SVGElement): { ratio: number; what: string }[] {
  const found: { ratio: number; what: string }[] = [];
  for (const base of Array.from(svg.querySelectorAll(".base"))) {
    const fractions = Array.from(base.querySelectorAll(".mfrac"))
      .map((node) => paintedInk(node)?.height ?? 0)
      .filter((height) => height >= 1);
    if (fractions.length === 0) {
      continue;
    }
    const tallestFraction = Math.max(...fractions);
    for (const sup of Array.from(base.querySelectorAll(".msupsub"))) {
      const before = sup.previousElementSibling;
      if (before === null) {
        continue;
      }
      const grown = before.classList.contains("delimsizing")
        ? before
        : [...before.querySelectorAll(".delimsizing")].at(-1);
      if (grown === undefined || grown === null) {
        continue;
      }
      const ink = paintedInk(grown);
      if (ink === null || ink.height < 1) {
        continue;
      }
      found.push({
        ratio: ink.height / tallestFraction,
        what: `${grown.textContent ?? "?"}^${sup.textContent ?? "?"} in "${base.textContent ?? ""}"`,
      });
    }
  }
  return found;
}

test("no worked-solution figure grows a delimiter past the fraction it holds", {
  timeout: 600_000,
}, async () => {
  const draws = everyDraw();
  const oversized: string[] = [];
  let measured = 0;
  let figuresWithFractions = 0;

  for (let at = 0; at < draws.length; at += BATCH) {
    const batch = draws.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        const draw = `${item.template_id} ${JSON.stringify(item.template_params)}`;
        return (
          <div key={draw} data-instance={draw} style={{ width: `${WIDTH}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      `delimiter batch at ${at} mounts`,
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      `delimiter batch at ${at} typesets`,
      20_000,
    );

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const svg = wrapper.querySelector("svg");
      if (svg === null) {
        continue;
      }
      const readings = delimiterRatios(svg);
      if (readings.length > 0) {
        figuresWithFractions += 1;
      }
      measured += readings.length;
      for (const { ratio, what } of readings) {
        if (ratio > DELIMITER_OVER_FRACTION) {
          oversized.push(
            `${wrapper.dataset.instance}: ${what} is ${ratio.toFixed(2)}x its fraction`,
          );
        }
      }
    }

    h.cleanup();
    h = null;
  }

  expect(
    oversized.join("; "),
    "these delimiters are grown past what they hold, so the exponent after one is set from a top that is not the content's",
  ).toBe("");

  // Floors under an ABSENCE, again. A run where `.delimsizing` or `.mfrac` stopped matching
  // reports no oversized delimiter and no delimiter at all, and the two look identical from
  // outside this assertion.
  expect(
    measured,
    "no superscripted delimiter was measured against a fraction",
  ).toBeGreaterThanOrEqual(10);
  expect(
    figuresWithFractions,
    "one figure supplied every reading, so this is a sweep over a single draw",
  ).toBeGreaterThanOrEqual(10);
});

/**
 * A DIAGRAM SITS UNDER THE STATEMENT ABOUT IT.
 *
 * The overlap claim above cannot see this, and no amount of widening it would: nothing in
 * GEO.1's similar-triangles figure was on top of anything. It is two columns, a triangle under
 * the ratio that names it in each, and the two halves were positioned by different rules — the
 * equations centred on a column, the triangles started at a fixed left edge and grown rightwards
 * by whatever their own numbers came to. So each triangle sat left of its statement by an amount
 * that changed with the draw, up to about 47 units of a 440-unit figure, and the reader matching
 * a picture to a ratio had to work out which ratio it belonged to first.
 *
 * Measured as CENTRES, over every draw of the template, because the sizes are supposed to
 * differ — that is what a scale factor is — and only the centres are supposed to agree.
 */
test("GEO.1's similar triangles sit under the ratios that name them", async () => {
  const templateId = "d10.geo1.similar-side.l3";
  const draws = everyDraw().filter((item) => item.template_id === templateId);
  expect(draws.length, "no draw of the similar-triangles template").toBeGreaterThanOrEqual(
    8,
  );

  const drifted: string[] = [];
  let columns = 0;
  for (let at = 0; at < draws.length; at += BATCH) {
    const batch = draws.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        const draw = JSON.stringify(item.template_params);
        return (
          <div key={draw} data-instance={draw} style={{ width: `${WIDTH}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      "similar-triangle batch mounts",
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "similar-triangle batch typesets",
      20_000,
    );

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const where = wrapper.dataset.instance ?? "";
      // The two triangles and the two statements, both read off what is PAINTED rather than
      // off any marker put there for the test. A triangle is a closed outline (`fill="none"`,
      // which the arrow's solid head is not) and a statement is one of the two labels on the
      // figure's top line; both are then taken left to right, which is how the columns pair.
      const outlines = Array.from(wrapper.querySelectorAll<SVGPathElement>("svg path"))
        .filter(
          (path) =>
            (path.getAttribute("d") ?? "").endsWith("Z") &&
            path.getAttribute("fill") === "none",
        )
        .map((path) => path.getBoundingClientRect())
        .sort((a, b) => a.left - b.left);
      const labelled = Array.from(wrapper.querySelectorAll("svg foreignObject[data-latex]"))
        .map((node) => paintedMathBox(node))
        .filter((box): box is DOMRect => box !== null);
      const topLine = Math.min(...labelled.map((box) => box.top));
      const statements = labelled
        .filter((box) => box.top < topLine + 8)
        .sort((a, b) => a.left - b.left);

      expect(outlines.length, `${where} drew ${outlines.length} outlines`).toBe(2);
      expect(statements.length, `${where} drew ${statements.length} statements`).toBe(2);

      for (let side = 0; side < 2; side += 1) {
        const shape = outlines[side] as DOMRect;
        const said = statements[side] as DOMRect;
        columns += 1;
        const drift = (shape.left + shape.right) / 2 - (said.left + said.right) / 2;
        if (Math.abs(drift) > COLUMN_DRIFT) {
          drifted.push(
            `${where} triangle ${side + 1} is ${drift.toFixed(1)}px off the centre of the ratio above it`,
          );
        }
      }
    }

    h.cleanup();
    h = null;
  }

  expect(
    drifted.join("; "),
    "these triangles are not under the statements they belong to",
  ).toBe("");
  expect(columns, "no column was measured").toBeGreaterThanOrEqual(16);
});

/**
 * How far a triangle's centre may sit from its statement's, in px.
 *
 * Not zero: a statement is typeset maths whose ink is not symmetric about the point it was
 * centred on (`\tfrac{12}{8} = 1.5` hangs its `=` and its decimal to the right of the fraction),
 * so the two centres agree to within a glyph rather than exactly. The defect this catches was
 * 40-50 user units, which is about 45px at the width these are measured at.
 */
const COLUMN_DRIFT = 12;

/**
 * THE REPORTED INSTANCE, named rather than left to the sampling above.
 *
 * The sweep's population is drawn from a fixed run of seeds, so which triples it reaches is
 * stable but incidental. This one is the screenshot, so it is asserted directly: a change to the
 * seeds, the cap, or the triple list cannot take it out of the file without failing here.
 */
test("GEO.1's 5-12-13 triangle keeps its hypotenuse label clear of the words", async () => {
  const templateId = "d10.geo1.hypotenuse.l1";
  expect(
    getWorkedSolutionVisual(templateId),
    "the reported figure is no longer registered",
  ).toBeDefined();

  const { figures, labels, collisions } = await sweepFigures([
    { template_id: templateId, template_params: { a: 5, b: 12, c: 13 } },
  ]);

  expect(figures.length, "the reported figure did not render").toBe(1);
  expect(labels, "the reported figure drew no labels").toBeGreaterThanOrEqual(6);
  expect(report(collisions.filter((c) => !c.connector))).toBe("");
});

/**
 * THE TWO DEGREE LABELS ON A STRAIGHT LINE sit on one horizontal baseline.
 *
 * The overlap claim above cannot see this either: nothing was on top of anything. The known
 * angle was parked at `pivot.y - 18` and the answered one at `pivot.y - 22`, a four-unit stagger
 * that put `124°` above `56°` on every draw. Both labels name angles on the same straight line,
 * so reading them as a pair is the figure's whole point, and a vertical stagger makes them look
 * like they belong to different heights of the diagram.
 *
 * Measured as painted-ink centres rather than the authored `y` props, so a roomy foreignObject
 * that kept the same prop while sliding its glyphs cannot hide here. The population is every
 * straight-line draw of the template (`triangle !== 1`), because the stagger was constant across
 * draws rather than a one-seed accident.
 */
test("GEO.1's straight-line angles sit on one horizontal baseline", async () => {
  const templateId = "d10.geo1.angle-third.l2";
  const draws = everyDraw().filter(
    (item) =>
      item.template_id === templateId && Number(item.template_params.triangle) !== 1,
  );
  expect(
    draws.length,
    "no straight-line draw of the angle-third template",
  ).toBeGreaterThanOrEqual(4);

  const staggered: string[] = [];
  let pairs = 0;
  for (let at = 0; at < draws.length; at += BATCH) {
    const batch = draws.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        const draw = JSON.stringify(item.template_params);
        return (
          <div key={draw} data-instance={draw} style={{ width: `${WIDTH}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      "straight-line batch mounts",
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "straight-line batch typesets",
      20_000,
    );

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const where = wrapper.dataset.instance ?? "";
      // Only the two labels that ARE the angles: a lone `N^{\circ}`. The equations on the
      // right also carry degree marks, but they sit on their own rows and are not the claim.
      const angles = Array.from(wrapper.querySelectorAll("svg foreignObject[data-latex]"))
        .filter((node) => /^\d+\^\{\\circ\}$/.test(node.getAttribute("data-latex") ?? ""))
        .map((node) => paintedMathBox(node))
        .filter((box): box is DOMRect => box !== null)
        .sort((a, b) => a.left - b.left);

      expect(angles.length, `${where} drew ${angles.length} angle labels`).toBe(2);
      pairs += 1;
      const left = angles[0] as DOMRect;
      const right = angles[1] as DOMRect;
      const drift = (left.top + left.bottom) / 2 - (right.top + right.bottom) / 2;
      if (Math.abs(drift) > ANGLE_BASELINE) {
        staggered.push(
          `${where}: the two angle labels differ by ${drift.toFixed(1)}px vertically`,
        );
      }
    }

    h.cleanup();
    h = null;
  }

  expect(
    staggered.join("; "),
    "these straight-line angle labels are not on one horizontal baseline",
  ).toBe("");
  expect(pairs, "no straight-line pair was measured").toBeGreaterThanOrEqual(4);
});

/**
 * How far the two angle labels' ink centres may differ vertically, in px.
 *
 * Essentially zero: both are the same font size and the same glyph shape (`N^{\circ}`), so any
 * real stagger is the authored `y` difference. One px covers subpixel rounding from the CTM.
 */
const ANGLE_BASELINE = 1;

/**
 * POL.4's COMPLETE-SOLVE closing line says what the prompt asked for, and fits.
 *
 * Two claims, and they pull against each other, which is why they are one test.
 *
 * The CONTENT half: `SolutionLineWorked`'s `solved` slot is the figure's answer line -- drawn in
 * `CIVIC` under the number line, and its three sibling draws (`d4.pol3.square-root.l1`,
 * `d4.pol3.shifted-square.l2`, `d4.pol3.lost-root.l3`) all put the solution SET there. This one
 * put `(x + 5)^{2} = 16` and nothing else, so a template whose prompt ends *"give every
 * solution"* closed its reveal on an intermediate equation, in the place and the colour the
 * answer goes. Both parts are required here so that dropping either fails by name.
 *
 * The SPATIAL half: a `viewBox` is 440 units wide however many pixels it is painted at, and this
 * fix roughly doubled the length of a line centred in it. So the ink is measured against the
 * SVG's own frame, on both axes, over every draw -- the widest set (`\{-13, -1\}` and friends)
 * is not the seed anyone would check by hand.
 *
 * Measured at `FIGURE_CONTENT_CAP` like the rest of this file, and that is sound HERE rather
 * than by inheritance: overflow of a fixed viewBox is scale-invariant, so a line that fits in
 * 440 units fits in every column. What that does not buy is a picture, and
 * `.cursor/rules/qa-verification.mdc` is explicit that it does not, so the frame is taken at a
 * short realistic laptop and framed to show the figure inside the surface around it.
 */
test("POL.4's completed square closes on the solutions, inside its frame", async () => {
  const templateId = "d4.pol4.complete-solve.l3";
  const draws = everyDraw().filter((item) => item.template_id === templateId);
  expect(draws.length, "no draw of the complete-solve template").toBeGreaterThanOrEqual(4);

  const wrong: string[] = [];
  let closings = 0;
  for (let at = 0; at < draws.length; at += BATCH) {
    const batch = draws.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        const draw = JSON.stringify(item.template_params);
        return (
          <div key={draw} data-instance={draw} style={{ width: `${WIDTH}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      "complete-solve batch mounts",
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "complete-solve batch typesets",
      20_000,
    );

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      const where = wrapper.dataset.instance ?? "";
      const params = JSON.parse(where) as Record<string, number>;
      const svg = wrapper.querySelector("svg");
      const boxes = Array.from(wrapper.querySelectorAll("svg foreignObject[data-latex]"));
      const closing = boxes[boxes.length - 1];
      if (!svg || !closing) {
        wrong.push(`${where} drew no closing line`);
        continue;
      }
      closings += 1;
      const latex = closing.getAttribute("data-latex") ?? "";
      const set = `\\{${params.low}, ${params.high}\\}`;
      if (!latex.includes(set)) {
        wrong.push(`${where} closes on "${latex}", which never names the solutions ${set}`);
      }
      if (!latex.includes(`)^{2} = ${(params.root ?? 0) * (params.root ?? 0)}`)) {
        wrong.push(`${where} closes on "${latex}", which has lost the completed square`);
      }
      const ink = paintedMathBox(closing);
      const frame = svg.getBoundingClientRect();
      if (ink === null) {
        wrong.push(`${where}'s closing line never typeset`);
        continue;
      }
      if (ink.left < frame.left - 0.5 || ink.right > frame.right + 0.5) {
        wrong.push(
          `${where}'s closing line runs ${ink.left.toFixed(1)}..${ink.right.toFixed(1)} against a frame of ${frame.left.toFixed(1)}..${frame.right.toFixed(1)}`,
        );
      }
      if (ink.bottom > frame.bottom + 0.5) {
        wrong.push(
          `${where}'s closing line is cut off below: ${ink.bottom.toFixed(1)} past ${frame.bottom.toFixed(1)}`,
        );
      }
    }

    h.cleanup();
    h = null;
  }

  expect(wrong.join("; "), "POL.4's complete-solve closing line").toBe("");
  expect(closings, "no closing line was measured").toBeGreaterThanOrEqual(4);
});

/**
 * The frame behind the claim above, at a short realistic laptop.
 *
 * Separate from the measurement because it is answering a different question. The measurement
 * says a box fits a box; this says the reveal is legible in a column on a 580px-tall screen,
 * with the surface around it in the picture rather than a crop of the line that changed.
 */
test("POL.4's complete-solve reveal photographs at 1024x580", async () => {
  const item = everyDraw().find((draw) => draw.template_id === "d4.pol4.complete-solve.l3");
  expect(item, "no draw of the complete-solve template to photograph").toBeDefined();
  if (!item) {
    return;
  }

  await page.viewport(1024, 580);
  h = mount(
    <div style={{ padding: "24px", width: "920px", background: "var(--paper)" }}>
      <WorkedSolution
        templateId={item.template_id}
        params={item.template_params}
        steps={[]}
      />
    </div>,
  );
  const host = h.host;
  await waitFor(() => host.querySelector("svg") !== null, "the reveal mounts", 20_000);
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the reveal typesets",
    20_000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 250));

  if (CAPTURE_EVIDENCE) {
    const path = await page.screenshot({
      path: "__screenshots__/d4-stream-d/pol4-complete-solve-1024x580.png",
    });
    expect(path, "no screenshot was written").toBeTruthy();
  }
  await page.viewport(1440, 900);
});

/**
 * A TRIANGLE IS DRAWN AT THE ANGLES IT IS LABELLED WITH.
 *
 * Neither claim above can see this, and neither could: nothing overlapped and nothing was off
 * its column. `TriangleAnglesWorked` drew three hardcoded vertices measuring about 54, 46 and
 * 80 degrees and wrote whatever the draw carried onto them, so `d10.geo1.angle-third.l2` at
 * 60 / 60 / 60 rendered as a visibly scalene triangle with an 80-degree apex, and a learner
 * checking the answer against the picture was told a correct answer was wrong.
 *
 * Measured off the PAINTED OUTLINE — the `d` of the one closed path in the figure, carried to
 * the screen through its own CTM — rather than off the props, because the props are what the
 * old figure ignored. `angleAt` is a plain arccos and is not what `triangleFromAngles` builds
 * with (that is the law of sines), so this is a second opinion rather than the construction
 * agreeing with itself.
 *
 * Each label is paired with the corner it is NEAREST to, so the claim is per-corner and not
 * merely that the three numbers turn up somewhere on the figure: the reported defect had all
 * three of the right numbers on the board, in the wrong corners.
 */
test("GEO.1's worked triangle is drawn at the angles it is labelled with", async () => {
  const templateId = "d10.geo1.angle-third.l2";
  const draws = everyDraw().filter(
    (item) =>
      item.template_id === templateId && Number(item.template_params.triangle) === 1,
  );
  expect(
    draws.length,
    "no triangle draw of the angle-third template",
  ).toBeGreaterThanOrEqual(4);

  const wrong: string[] = [];
  let corners = 0;
  for (let at = 0; at < draws.length; at += BATCH) {
    const batch = draws.slice(at, at + BATCH);
    h = mount(
      batch.map((item) => {
        const draw = JSON.stringify(item.template_params);
        return (
          <div key={draw} data-instance={draw} style={{ width: `${WIDTH}px` }}>
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
      () => host.querySelectorAll("[data-instance]").length === batch.length,
      "triangle batch mounts",
      20_000,
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "triangle batch typesets",
      20_000,
    );

    for (const wrapper of Array.from(
      host.querySelectorAll<HTMLElement>("[data-instance]"),
    )) {
      wrong.push(...cornerMismatches(wrapper.dataset.instance ?? "", wrapper));
      corners += 3;
    }

    h.cleanup();
    h = null;
  }

  expect(
    wrong.join("; "),
    "these figures draw a corner at an angle other than the one printed in it",
  ).toBe("");
  // A floor under an ABSENCE: a run that paired nothing satisfies the claim above while
  // measuring not one corner.
  expect(corners, "no corner was measured").toBeGreaterThanOrEqual(12);
});

/**
 * THE EXTREMES OF THE DRAW, named rather than left to the sampling above.
 *
 * `everyDraw` runs a fixed set of seeds, so which pairs it reaches is stable but incidental,
 * and the pairs that matter here are the ones it does not reach. `d10.geo1.angle-third.l2`
 * draws each given angle anywhere in 25 to 80, so a learner meets a 20-degree apex on a
 * triangle whose base is a fifth of its height, and a 130-degree apex on one four times wider
 * than it is tall. A figure derived from its angles has to survive both, and the first of them
 * is exactly where it did not: at 80 / 80 the two base labels came out on top of each other,
 * reading as one run of digits, on a shape the seeded sweep never draws.
 *
 * Both claims are made here, because either alone passes the other's defect: two labels drawn
 * over each other are still in the right corners, and two labels drawn clear of each other can
 * still be in the wrong ones.
 */
test.each([
  [80, 80, 20, "the sharpest apex the template can deal"],
  [25, 25, 130, "the bluntest"],
  [25, 80, 75, "the most lopsided"],
])(
  "GEO.1's %i / %i / %i triangle keeps its labels apart and in their corners (%s)",
  async (first, second, answer) => {
    const params = { triangle: 1, first, second, answer };
    const { figures, labels, collisions } = await sweepFigures([
      { template_id: "d10.geo1.angle-third.l2", template_params: params },
    ]);
    expect(figures.length, "the figure did not render").toBe(1);
    expect(labels, "the figure drew no labels").toBeGreaterThanOrEqual(5);
    expect(
      report(collisions.filter((c) => !c.connector)),
      "these labels are painted over each other",
    ).toBe("");

    h = mount(
      <div data-instance="extreme" style={{ width: `${WIDTH}px` }}>
        <WorkedSolution templateId="d10.geo1.angle-third.l2" params={params} steps={[]} />
      </div>,
    );
    const host = h.host;
    // The outline first, then the maths. "nothing is still waiting to typeset" is satisfied
    // vacuously by a host that has not mounted yet, which is how this read an empty card.
    await waitFor(
      () => host.querySelector("svg path") !== null,
      "the extreme figure mounts",
    );
    await waitFor(
      () =>
        Array.from(host.querySelectorAll("[data-latex]")).every(
          (node) => node.querySelector(".katex") !== null,
        ),
      "the extreme figure typesets",
      20_000,
    );
    expect(cornerMismatches(`${first}/${second}/${answer}`, host).join("; ")).toBe("");
  },
);
