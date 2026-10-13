/**
 * **A COMMA BELONGS TO THE INK IN FRONT OF IT, ON EVERY NAMING ROW.**
 *
 * `.lesson-equation__naming` was a flex row with `gap: var(--space-lg)`. Prose written inline
 * beside a `<InlineMath>` is not part of that math's box: it becomes its own ANONYMOUS FLEX ITEM,
 * so `, for` collected 16px on each side and the comma floated a clear space away from the formula
 * it punctuated. LIN.3's `formula-isolate-builder` is where it was reported, and it was never one
 * board's defect: five widgets write prose in that row, and every one of them shipped it.
 *
 * The fix is structural rather than five local repairs. The row is normal centred text flow now, so
 * a comma written after a formula is laid out after that formula, the way it is written. Nothing
 * about the container can put air in front of it any more.
 *
 * ## What this file measures, and why it is not a grep
 *
 * The claim is "there is too much space between two painted glyphs", which no source pattern can
 * settle: the space came from the container, not from the string. So every punctuation mark in
 * every naming row is measured with `Range.getClientRects()` against the right edge of the ink
 * before it, and compared against that row's OWN word space, probed in the row's own font rather
 * than assumed. A mark separated by more than one and a half word spaces has detached.
 *
 * A mark painted on a different line from the ink before it is the same defect at its worst, so it
 * fails too rather than being skipped as unmeasurable. It cannot happen in text flow: a comma
 * written flush against a `<span>` has no break opportunity in front of it. It could happen, and
 * did, when the two were separate flex items.
 *
 * ## The population is derived, and floored twice
 *
 * Every visual id any lesson pack places, mounted, following `mathCaseTransform.browser.test.tsx`.
 * Scoping this to the five widgets on the bug report is exactly the mistake `qa-verification`
 * warns about, and it would have missed `interval-write-builder`, whose row is drawn only after a
 * learner settles a part and so is not on any screenshot anybody had taken.
 *
 * Two floors, because the claim is an ABSENCE and it is vacuous twice over:
 *
 *  - `NAMING_ROW_FLOOR`, or a run that mounted nothing has proved nothing;
 *  - `PROSE_ROW_FLOOR`, the rows of those that carry prose at all. A row holding a single
 *    `<InlineMath>` has no punctuation outside KaTeX and can never fail this, so a population that
 *    drifted to nothing but bare formulas would read green while measuring no comma anywhere.
 *
 * `PUNCTUATION_FLOOR` is under the marks themselves, which is the population in the sharpest form.
 *
 * ## And the separation the flex gap was really carrying
 *
 * Two rows hold two INDEPENDENT facts side by side with no prose between them, and they relied on
 * that same 16px gap to keep them apart. Removing it would have collapsed both to a single word
 * space silently. They now write the separator down, and the last test derives that population the
 * same way — consecutive ink in one row with nothing but whitespace between it — so a row that
 * juxtaposes two facts tomorrow is measured without an edit here.
 *
 * ## Forced red, rather than argued
 *
 * Every claim here was watched failing on the tree it was written for, and every threshold and
 * composition floor was watched failing on an injected defect:
 *
 *  - the flex row, as shipped: five marks at 16.0px, 3.85 word spaces, on `formula-isolate-builder`
 *    (twice), `formula-check-play`, `negative-flip-play`, `abs-union-builder`, plus a comma and a
 *    full stop on the settled `interval-write-builder` row;
 *  - the container fixed and the separators not yet written: `factor-pair-stepper` at 4.2px and
 *    `linear-slope-walkthrough` at 0.0px, which is the two coordinate legends touching;
 *  - the space restored before one comma: 4.2px, 1.00 word spaces, which is what `SPACE_TOLERANCE`
 *    is set at half a space to catch;
 *  - one prose row emptied: 5 of a floor of 6, failing at `PROSE_ROW_FLOOR` while the punctuation
 *    claim itself stayed green, which is the vacuity the two floors exist for.
 *
 * Real Chromium and the real stylesheet, because every number here is a painted box.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { CITY_PHONE, FIGURE_CONTENT_CAP } from "./readingWidths";
import { findButton, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport every frame in this file is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * How many of the row's own word spaces a mark may sit behind the ink before it.
 *
 * Not a pixel constant, because the row is `0.95rem` and a word space in it measures 4.16px while
 * the flex gap it replaced was 16px, or 3.85 of them. Half a space is the threshold because it is
 * the only one that catches BOTH ways a mark detaches here, which are not the same defect:
 *
 *  - the container inserting space, at 3.85 word spaces;
 *  - a space WRITTEN before the comma, which is what all five of these widgets did (`/> , for`) and
 *    which text flow paints at exactly one word space. A tolerance of one would let that through,
 *    and a comma preceded by a space is wrong however small the number is.
 *
 * Measured against the other side: every mark in this tree that is correctly set reads 0.00px or
 * -0.02px, so half a space leaves 2.1px for a glyph's right side bearing and KaTeX's italic
 * correction against an observed worst case of nothing at all. Forced red both ways before it was
 * pinned: restoring the space at `FormulaIsolateBuilder.tsx:286` fails at 1.00 word spaces.
 */
const SPACE_TOLERANCE = 0.5;

/**
 * How far apart two independent facts in one row must stay, in word spaces.
 *
 * The flex gap put 16px between them, about four word spaces. Two is comfortably above what text
 * flow gives for free (one) and below what the separator now writes down, so this fails the day
 * somebody deletes the separator and leaves the space that was already there.
 */
const SEPARATION_MIN = 2;

/** The marks a formula can be robbed of. */
const PUNCTUATION = new Set([",", ".", ";"]);

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/** The harness holding whatever is on screen, so a thrown assertion cannot leak a mounted board. */
let mounted: { cleanup: () => void } | null = null;

function unmount(): void {
  mounted?.cleanup();
  mounted = null;
}

afterEach(() => {
  unmount();
});

async function mountVisual(id: LessonVisualId, width: number): Promise<HTMLElement> {
  const harness = mount(<LessonVisual id={id} />);
  mounted = harness;
  const host = harness.host;
  host.style.width = `${width}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  // KaTeX renders in an effect, so a row read on the mount tick holds no `.katex` at all and would
  // contribute a measurement of nothing while looking swept.
  await waitFor(() => host.querySelector(".katex") !== null, `${id} typesets`, 1500).catch(
    () => {},
  );
  // And KaTeX's own faces have to have arrived, or every width comes back about 10% narrow: see
  // the note in `mathCaseTransform.browser.test.tsx`, which measured it.
  await document.fonts.ready;
  return host;
}

/* -------------------------------------------------------------------------- */
/* Measuring one row                                                           */
/* -------------------------------------------------------------------------- */

/**
 * One word space, in this row's own font.
 *
 * Probed rather than derived from the font size, because the row inherits whatever face and size
 * the cascade gives it and a threshold in pixels would be a claim about the theme. `white-space:
 * pre` is what stops the probe's own space being collapsed away; it is absolutely positioned and
 * hidden, so it is not a flex item and reflows nothing around it.
 */
function wordSpace(row: HTMLElement): number {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  probe.style.left = "0";
  probe.style.top = "0";
  row.appendChild(probe);
  probe.textContent = "n n";
  const wide = probe.getBoundingClientRect().width;
  probe.textContent = "nn";
  const tight = probe.getBoundingClientRect().width;
  probe.remove();
  return wide - tight;
}

/**
 * The row's contents as a flat run of ATOMS, in painting order.
 *
 * A `.katex` subtree is one atom and is not descended into: its own text nodes are typeset math,
 * where a comma is KaTeX's business and correctly spaced by it. Everything else is either prose,
 * which is scanned character by character, or a wrapper, which is walked through.
 */
function atomsIn(row: HTMLElement): (Text | HTMLElement)[] {
  const out: (Text | HTMLElement)[] = [];
  const visit = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out.push(child as Text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (element.classList.contains("katex")) {
          out.push(element);
        } else {
          visit(element);
        }
      }
    }
  };
  visit(row);
  return out;
}

/** The painted box of one character, or `null` where it was collapsed away. */
function charRect(node: Text, index: number): DOMRect | null {
  const range = document.createRange();
  range.setStart(node, index);
  range.setEnd(node, index + 1);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
  range.detach();
  return rects.length === 0 ? null : (rects[rects.length - 1] as DOMRect);
}

/** The painted box of one ink element, taking its LAST fragment where it wrapped. */
function inkRect(element: HTMLElement): DOMRect | null {
  const rects = Array.from(element.getClientRects()).filter((r) => r.width > 0);
  return rects.length === 0 ? null : (rects[rects.length - 1] as DOMRect);
}

/** The last painted glyph before `index` inside `node`, or `null` if the node opens with prose. */
function inkBefore(node: Text, index: number): DOMRect | null {
  for (let at = index - 1; at >= 0; at -= 1) {
    if (!/\s/.test(node.data.charAt(at))) {
      return charRect(node, at);
    }
  }
  return null;
}

/** One punctuation mark, and how far it sits behind the ink it punctuates. */
interface Mark {
  readonly where: string;
  readonly visual: string;
  readonly mark: string;
  /** Distance from the right edge of the ink before it to the mark's left edge, in px. */
  readonly gap: number;
  /** How many of this row's word spaces that is. */
  readonly spaces: number;
  /** True when the mark was painted on a line the ink before it is not on. */
  readonly broken: boolean;
}

/** One row's readings. */
interface Row {
  readonly where: string;
  readonly visual: string;
  /** Prose the row holds outside KaTeX, normalised. Empty for a row that is only a formula. */
  readonly prose: string;
  readonly marks: Mark[];
  /** Gaps between two consecutive inks with nothing but whitespace between them, in word spaces. */
  readonly separations: {
    readonly where: string;
    readonly gap: number;
    readonly spaces: number;
  }[];
}

function readRow(row: HTMLElement, visual: string, index: number): Row {
  const space = wordSpace(row);
  const atoms = atomsIn(row);
  const where = `${visual} naming row ${index + 1}`;
  const marks: Mark[] = [];
  const separations: Row["separations"] = [];

  // Prose the row carries in its own right: what makes it a row this claim can fail on.
  const prose = atoms
    .filter((atom): atom is Text => atom instanceof Text)
    .map((text) => text.data)
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  /** The ink before atom `a`, skipping whitespace-only text nodes. */
  const inkBeforeAtom = (a: number): { rect: DOMRect | null; prose: boolean } => {
    for (let b = a - 1; b >= 0; b -= 1) {
      const previous = atoms[b];
      if (previous === undefined) {
        continue;
      }
      if (previous instanceof Text) {
        const found = inkBefore(previous, previous.data.length);
        if (found !== null) {
          return { rect: found, prose: true };
        }
        continue;
      }
      return { rect: inkRect(previous), prose: false };
    }
    return { rect: null, prose: false };
  };

  atoms.forEach((atom, a) => {
    if (atom instanceof Text) {
      const text = atom.data;
      for (let i = 0; i < text.length; i += 1) {
        const mark = text.charAt(i);
        if (!PUNCTUATION.has(mark)) {
          continue;
        }
        const here = charRect(atom, i);
        if (here === null) {
          continue;
        }
        const before = inkBefore(atom, i) ?? inkBeforeAtom(a).rect;
        if (before === null) {
          // Nothing is painted before it in this row, so nothing can have been separated from it.
          continue;
        }
        const overlapping = here.top < before.bottom - 1 && before.top < here.bottom - 1;
        const gap = here.left - before.right;
        marks.push({
          where: `${where}: "${mark}" in "${text.replace(/\s+/g, " ").trim()}"`,
          visual,
          mark,
          gap,
          spaces: space > 0 ? gap / space : gap,
          broken: !overlapping,
        });
      }
      return;
    }
    // An ink atom. If the thing before it is ink too, with nothing but whitespace between, the row
    // is holding two independent facts and owes them a separator of its own.
    const previous = inkBeforeAtom(a);
    if (previous.rect === null || previous.prose) {
      return;
    }
    const here = inkRect(atom);
    if (here === null) {
      return;
    }
    if (here.top >= previous.rect.bottom - 1 || previous.rect.top >= here.bottom - 1) {
      // Wrapped onto its own line, which separates them more than any gap would.
      return;
    }
    const gap = here.left - previous.rect.right;
    separations.push({
      where: `${where}: "${atom.parentElement?.getAttribute("data-latex") ?? "?"}" after the ink before it`,
      gap,
      spaces: space > 0 ? gap / space : gap,
    });
  });

  return { where, visual, prose, marks, separations };
}

function rowsUnder(host: HTMLElement, visual: string): Row[] {
  return Array.from(host.querySelectorAll<HTMLElement>(".lesson-equation__naming")).map(
    (row, index) => readRow(row, visual, index),
  );
}

/* -------------------------------------------------------------------------- */
/* The sweep                                                                   */
/* -------------------------------------------------------------------------- */

async function sweep(width: number): Promise<{ visuals: string[]; rows: Row[] }> {
  const visuals: string[] = [];
  const rows: Row[] = [];
  for (const id of liveVisualIds()) {
    const host = await mountVisual(id, width);
    visuals.push(id);
    rows.push(...rowsUnder(host, id));
    unmount();
  }
  return { visuals, rows };
}

let swept: Promise<{ visuals: string[]; rows: Row[] }> | null = null;
function sweepOnce(): Promise<{ visuals: string[]; rows: Row[] }> {
  swept ??= sweep(FIGURE_CONTENT_CAP);
  return swept;
}

/*
 * Every test below carries `300_000`, which is what mounting 173 visuals costs rather than
 * vitest's default.
 *
 * The default was never chosen for a sweep: this file takes about 11s alone and over 22s while
 * the rest of the browser suite is saturating the machine, so on the default whichever test
 * reaches `sweepOnce` first fails on the wall clock with its assertion unreached — and it fails
 * having already printed a clean census, which is the worst red there is to read. Not a budget
 * being loosened: every sibling sweep in this directory already carries one (`chipPressedState`
 * 300s, `answerRowChrome` and `practicePromptOnce` 240s, `matchItemFit` 180s). Written as a
 * literal because the formatter only hugs a test callback when the timeout is one.
 */

/**
 * Floors, at or just under what this tree measures: 173 placed visuals drawing 18 naming rows on
 * mount, 6 of them carrying prose, holding 6 punctuation marks between them.
 *
 * `PROSE_ROW_FLOOR` is the load-bearing one and the reason there are two. Twelve of the eighteen
 * rows hold one bare `<InlineMath>` and no prose at all; the punctuation claim is vacuously true
 * over every one of them, so a floor on rows alone is satisfied by a population that could not
 * report this defect if it were reintroduced. It sits AT the six observed rather than under them,
 * because those six ARE the population that can fail: a row that stops carrying prose has to fail
 * here rather than quietly leave the claim true over nothing but bare formulas.
 */
const VISUAL_FLOOR = 165;
const NAMING_ROW_FLOOR = 17;
const PROSE_ROW_FLOOR = 6;
const PUNCTUATION_FLOOR = 6;

test("no naming row separates a mark from the ink it punctuates", async () => {
  const { visuals, rows } = await sweepOnce();
  const marks = rows.flatMap((row) => row.marks);

  const detached = marks
    .filter((mark) => mark.broken || mark.spaces > SPACE_TOLERANCE)
    .map((mark) =>
      mark.broken
        ? `${mark.where} is painted on a different line from the ink before it`
        : `${mark.where} sits ${mark.gap.toFixed(1)}px behind the ink before it, ${mark.spaces.toFixed(1)} word spaces`,
    );
  const worst = marks.reduce((high, mark) => Math.max(high, mark.spaces), 0);
  console.log(
    `${rows.length} naming rows over ${visuals.length} placed visuals, ${rows.filter((r) => r.prose !== "").length} carrying prose, ${marks.length} marks measured, worst ${worst.toFixed(2)} word spaces`,
  );
  // The raw readings, kept beside the frames: a floor and an emptiness assertion say the sweep
  // measured something, and this says WHAT, which is what a reviewer needs to check a threshold.
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      ".qa-frames/naming-row-readings.json",
      JSON.stringify(
        {
          width: FIGURE_CONTENT_CAP,
          visuals: visuals.length,
          rows: rows.map((row) => ({
            where: row.where,
            prose: row.prose,
            marks: row.marks.map((m) => ({
              mark: m.mark,
              gap: Number(m.gap.toFixed(2)),
              spaces: Number(m.spaces.toFixed(2)),
              broken: m.broken,
            })),
            separations: row.separations.map((s) => ({
              gap: Number(s.gap.toFixed(2)),
              spaces: Number(s.spaces.toFixed(2)),
            })),
          })),
        },
        null,
        2,
      ),
      { encoding: "utf-8" },
    );
  }

  expect(
    detached.join("; "),
    "these marks have been pushed off the ink they punctuate by their container, which is what a comma written inline in a flex row collects from its gap",
  ).toBe("");

  expect(visuals.length, "no lesson placed a visual").toBeGreaterThanOrEqual(VISUAL_FLOOR);
  expect(
    rows.length,
    "no placed visual drew a naming row, so this sweep measured nothing",
  ).toBeGreaterThanOrEqual(NAMING_ROW_FLOOR);
  // Composition, not only size: a row holding one bare formula can never fail the claim above.
  expect(
    rows.filter((row) => row.prose !== "").length,
    "no naming row carries prose any more, so the claim is being made only over rows that could never fail it",
  ).toBeGreaterThanOrEqual(PROSE_ROW_FLOOR);
  expect(
    marks.length,
    "the naming rows hold no punctuation outside their maths, so nothing was measured",
  ).toBeGreaterThanOrEqual(PUNCTUATION_FLOOR);
}, 300_000);

/**
 * THE SAME CLAIM IN THE COLUMN A PHONE GIVES.
 *
 * Text flow wraps and a flex row wraps differently, so the width is part of the claim. Only the
 * rows the sweep FOUND to carry prose are re-mounted, since they are the whole of the population
 * that can fail, and mounting all 173 again would cost minutes to measure twelve bare formulas.
 */
test("a naming row's marks stay put in the column a phone gives", async () => {
  const { rows } = await sweepOnce();
  const carriers = Array.from(
    new Set(rows.filter((row) => row.prose !== "").map((row) => row.visual)),
  ) as LessonVisualId[];

  const detached: string[] = [];
  const readings: string[] = [];
  let measured = 0;
  for (const id of carriers) {
    const host = await mountVisual(id, CITY_PHONE.inside);
    for (const row of rowsUnder(host, id)) {
      for (const mark of row.marks) {
        measured += 1;
        readings.push(
          `${mark.where} ${mark.gap.toFixed(2)}px, ${mark.spaces.toFixed(2)} word spaces${mark.broken ? ", on another line" : ""}`,
        );
        if (mark.broken) {
          detached.push(
            `at ${CITY_PHONE.inside}px ${mark.where} wrapped away from its ink`,
          );
        } else if (mark.spaces > SPACE_TOLERANCE) {
          detached.push(
            `at ${CITY_PHONE.inside}px ${mark.where} sits ${mark.gap.toFixed(1)}px behind it, ${mark.spaces.toFixed(1)} word spaces`,
          );
        }
      }
    }
    unmount();
  }

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      ".qa-frames/naming-row-readings-phone.json",
      JSON.stringify({ width: CITY_PHONE.inside, readings }, null, 2),
      { encoding: "utf-8" },
    );
  }

  expect(detached.join("; "), "these marks detach in a phone column").toBe("");
  expect(
    measured,
    "no mark was measured at the phone width, so this claim is empty",
  ).toBeGreaterThanOrEqual(PUNCTUATION_FLOOR);
}, 300_000);

/**
 * THE ROW THE MOUNT SWEEP STRUCTURALLY CANNOT SEE.
 *
 * `interval-write-builder` draws its naming row only once a part is SETTLED, so it is absent from
 * every measurement above and from every screenshot anybody had looked at. It is also the worst of
 * the five, holding a comma AND a closing full stop, each of which was its own flex item.
 *
 * Answered rather than revealed: a reveal on a fresh instance holds the board and offers it back
 * instead of resolving, by `widgetFeedback`'s contract, so it never reaches this state. The opening
 * board's first rule is $6x + 5 \le 41$, whose range is $(-\infty, 6]$ — the same instance
 * `partVerdicts.browser.test.tsx` drives, which is where the answer below comes from.
 */
async function settleFirstIntervalRow(host: HTMLElement): Promise<void> {
  const row = host.querySelector<HTMLElement>('[data-part-row="duty"]');
  if (row === null) {
    throw new Error("interval-write-builder did not deal its opening board");
  }
  findButton(row, "Runs downward").click();
  findButton(row, "Endpoint in").click();
  const endpoint = row.querySelector("input");
  if (endpoint === null) {
    throw new Error("the row offers no endpoint field");
  }
  setInputValue(endpoint, "6");
  await waitFor(() => (endpoint.value as string) === "6", "the endpoint takes the answer");
  findButton(row, "Check").click();
  await waitFor(
    () => row.querySelector(".lesson-equation__naming") !== null,
    "the settled part names its answer",
  );
  await document.fonts.ready;
}

test("the naming row a learner only reaches by settling a part is measured too", async () => {
  const host = await mountVisual("interval-write-builder", FIGURE_CONTENT_CAP);
  await settleFirstIntervalRow(host);

  const rows = rowsUnder(host, "interval-write-builder");
  const marks = rows.flatMap((row) => row.marks);
  const detached = marks
    .filter((mark) => mark.broken || mark.spaces > SPACE_TOLERANCE)
    .map(
      (mark) =>
        `${mark.where} sits ${mark.gap.toFixed(1)}px behind the ink before it, ${mark.spaces.toFixed(1)} word spaces`,
    );

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      ".qa-frames/naming-row-readings-settled.json",
      JSON.stringify(
        {
          width: FIGURE_CONTENT_CAP,
          readings: marks.map(
            (mark) =>
              `${mark.where} ${mark.gap.toFixed(2)}px, ${mark.spaces.toFixed(2)} word spaces`,
          ),
        },
        null,
        2,
      ),
      { encoding: "utf-8" },
    );
  }

  expect(detached.join("; "), "the settled row's mark has detached from its formula").toBe(
    "",
  );
  expect(
    rows.filter((row) => row.prose !== "").length,
    "the settled row carries no prose, so the board was not driven into the state this measures",
  ).toBeGreaterThanOrEqual(1);
  // Two marks: the comma after the solved inequality and the full stop after the interval.
  expect(
    marks.length,
    "the settled row holds fewer marks than the two it is written with",
  ).toBeGreaterThanOrEqual(2);
});

/**
 * AND THE SEPARATION THE FLEX GAP WAS CARRYING.
 *
 * A row holding two independent facts with no prose between them had 16px from the container. In
 * text flow it gets a word space, which is not a separation at all: `linear-slope-walkthrough`'s
 * two coordinate legends would have touched, because JSX strips the newline between two elements
 * entirely, and `factor-pair-stepper`'s `{"  "}` collapses to one space. Both write the separator
 * down now, and the population here is derived from the same sweep rather than named, so a row
 * that puts two facts side by side later is measured without an edit in this file.
 */
const SEPARATED_PAIR_FLOOR = 2;

test("a naming row holding two independent facts keeps them apart", async () => {
  const { rows } = await sweepOnce();
  const separations = rows.flatMap((row) => row.separations);

  const collapsed = separations
    .filter((pair) => pair.spaces < SEPARATION_MIN)
    .map(
      (pair) =>
        `${pair.where} is ${pair.gap.toFixed(1)}px from it, ${pair.spaces.toFixed(1)} word spaces`,
    );
  console.log(
    `${separations.length} juxtaposed facts: ${separations.map((p) => `${p.spaces.toFixed(1)}`).join(", ")} word spaces`,
  );

  expect(
    collapsed.join("; "),
    `these rows put two independent facts within ${SEPARATION_MIN} word spaces of each other, which is what they read as when the container's gap goes and nothing replaces it`,
  ).toBe("");
  expect(
    separations.length,
    "no naming row juxtaposes two facts any more, so the separator this asserts may no longer be load-bearing",
  ).toBeGreaterThanOrEqual(SEPARATED_PAIR_FLOOR);
}, 300_000);

/* -------------------------------------------------------------------------- */
/* Frames                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Where this test's viewport sits inside the real browser window. Vitest scales the tester iframe
 * when the requested viewport does not match the window, so a clip written in the requested
 * viewport's pixels would land somewhere else. Copied from `d3Lin3WorkedSpacing.browser.test.tsx`,
 * which measured that failure.
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

/**
 * The pictures, at the reviewer's viewport and in the column a lesson really gives a figure.
 *
 * `formula-isolate-builder` is the reported board. The other three are the ones a measurement
 * alone would not settle: the two separator repairs, where the question is whether the two facts
 * still read as two, and the settled row, which nobody had photographed at all.
 */
const FRAMED: readonly LessonVisualId[] = [
  "formula-isolate-builder",
  "linear-slope-walkthrough",
  "factor-pair-stepper",
  "interval-write-builder",
];

test("the naming rows are photographed at the reviewer's viewport", async () => {
  for (const id of FRAMED) {
    const harness = mount(
      <div style={{ width: `${FIGURE_CONTENT_CAP}px`, margin: "8px auto" }}>
        <LessonVisual id={id} />
      </div>,
    );
    mounted = harness;
    await waitFor(
      () => harness.host.querySelector("figure.lesson-visual") !== null,
      `${id} mounts`,
    );
    await waitFor(
      () => harness.host.querySelector(".katex") !== null,
      `${id} typesets`,
      4000,
    ).catch(() => {});
    if (id === "interval-write-builder") {
      await settleFirstIntervalRow(harness.host);
    }
    await shoot(`naming-row-${id}-${VIEWPORT.width}x${VIEWPORT.height}`);
    unmount();
  }
}, 300_000);
