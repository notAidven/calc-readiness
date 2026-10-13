/**
 * NO OPERATOR ON A LESSON VISUAL IS PAINTED WITH MORE AIR THAN KATEX GIVES IT.
 *
 * LIN.1's balance drew `4 \times 6 \;\; + \;\; 6`, and the `+` came out with three and a half
 * times the air of the `\times` beside it in the same expression. Hand-padding an operator with
 * `\;` is the cause, and the defect is a painted one rather than a source-pattern one: what a
 * learner meets is a `+` floating away from its operands. So this measures rectangles, not
 * strings, over every visual any lesson places.
 *
 * ## The signature is measured, because KaTeX already emits an `.mspace` beside every operator
 *
 * KaTeX puts a zero-width `.mspace` carrying a `margin-right` on both sides of a binary operator
 * of its own accord, and gives a hand-written `\;` an `.mspace` that is indistinguishable from
 * it: same tag, same class, same inline `margin-right`, and for a relation the same 0.2778em
 * value. "There is an `.mspace` here" and "there are two `.mspace`s here" are therefore both
 * useless as a signature, and so is the LaTeX, since the same macro is correct as a separator
 * and wrong as padding. What separates them is how much air ends up around the operator, so that
 * is what is read. Rendered in Chromium and dumped before any threshold was chosen:
 *
 * | Written | Painted either side of the operator, net |
 * | --- | --- |
 * | `x - 3`, `T - pc`, `w = P - 2l`, `f = C - np` | 0.2215em to 0.2219em |
 * | `12 \;\div\; 4`, `4 \times 6 \; + \; 6`, `3 \cdot \; 5` | 0.4996em |
 * | `4 \times 6 \;\; + \;\; 6` | 0.7772em |
 * | `\times 6`, `\cdot 3`, `\times ?` (leading operator) | 0.0000em |
 * | `\times \; ?`, `\cdot \; 3` (leading operator, one `\;`) | 0.2776em |
 *
 * Three facts had to be established by rendering before any of those readings meant anything.
 *
 * **KaTeX splits `.katex-html` into one `.base` per binary operator.** The neighbour of the last
 * atom in a base is the first atom of the NEXT base, so reading the children of a single `.base`
 * sees an expression up to its first operator and no further. On the balance's own expression
 * that means seeing the `\times` and never reaching the padded `+`.
 *
 * **A binary operator with nothing before it is DEMOTED from `.mbin` to `.mord` and given no
 * spacing at all.** That is why there are two thresholds below and not one: an operator KaTeX
 * spaces itself starts at 0.2222em, and an operator KaTeX demotes starts at zero, so a single
 * `\;` beside a demoted one lands at 0.2776em, under what is perfectly correct beside an `.mbin`.
 * `ExpTransformBuilder`'s `\cdot \; 3` and `ExpFactorSlider`'s `\times \; ?` were both this shape,
 * so a sweep scoped to `.mbin` would have had neither in its population and would have let the
 * first ship while the exception below excused nothing. It is also why `ExpTransformBuilder` is
 * fixed as `{}\cdot 3` rather than by dropping the `\;`: dropped, the dot is demoted and set flush
 * at 0.0000em, and the empty group is what buys it back its 0.2219em as an `.mbin`.
 *
 * **Italic correction is a `margin-right` on the atom BEFORE the operator**, worth up to 0.1389em
 * (`T` and `P`; `C` 0.0715em, `f` 0.1076em, `w` 0.0269em). Left in, `T - pc` reads 0.3604em and a
 * threshold that passes it is too loose to catch anything. Subtracted, every correct `.mbin` in
 * the tree reads 0.2215em to 0.2219em, which is KaTeX's medium space and nothing else. Every gap
 * here is therefore NET: the painted distance less the previous atom's own margin.
 *
 * ## Two thresholds, each between two readings that are nowhere near each other
 *
 * `SPACED_MAX_EM` 0.30 sits between the widest correct `.mbin` (0.2219em) and the cheapest
 * defective one (0.4924em). `UNSPACED_MAX_EM` 0.05 sits between a demoted operator with no
 * padding (0.0000em) and one with a single `\;` (0.2776em). Both are margin arithmetic snapped
 * to Chromium's 1/64px grid rather than font metrics, so neither margin narrows with type size.
 *
 * ## What is NOT an operator here, and why
 *
 * A LEADING `+` OR `-` IS A SIGN, not an operator, and KaTeX demotes it to `.mord` exactly as it
 * demotes a leading `\times`. Reading it as an operator makes the coordinate and list idioms into
 * defects: `(-3,\, -2)` paints 0.3325em before its second `-` and `1,\; 2,\; -1` paints 0.4439em,
 * both of them the punctuation space plus a separator the author wanted. So the demoted set is
 * `\times`, `\div` and `\cdot`, which are never signs.
 *
 * A GAP BETWEEN TWO OPERATOR GLYPHS IS A SEPARATOR, not padding. `\times \; \div` on the four
 * PEMDAS and sign-rule keys lists two symbols as vocabulary, and with no `\;` KaTeX sets them
 * flush at 0.0000em. Padding is an operator held away from an OPERAND, so a gap is only measured
 * on a side where the neighbour is not itself an operator. That is what keeps the exception list
 * below down to the one board that really is unfixed.
 *
 * ## Population, floors and the exceptions
 *
 * Every visual id any lesson pack places, mounted, as in `mathCaseTransform.browser.test.tsx`.
 * The claim is an ABSENCE and would hold over a sweep that measured nothing, so it carries three
 * floors: visuals mounted, visuals that painted an operator at all, and gaps read. The middle one
 * is the load-bearing one, since a total is satisfied by one busy board while the claim is being
 * made about the whole family.
 *
 * One board is excused, for a reason that is about that board: `exp-factor-slider` keeps
 * `\times \; ?` because `ExpFactorSlider.browser.test.tsx:49` pins that string as a literal, and
 * changing the two is one change rather than this one.
 *
 * `remainder-estimate` was listed here too, as a fourth instance the file set this guard was
 * written against did not include. Writing it down is what made it fixable: it is the same
 * `\;\div\;` as the two division boards fixed alongside it, so it was fixed and the entry went.
 * The entry's going was not a decision either — the direction below turned red on the fixed tree
 * and named it, which is the exemption list doing the job it is here for.
 *
 * The list is asserted in both directions. An id that stops being placed fails; an id that stops
 * painting a hand-padded operator fails, because its entry has become a hole in the population
 * rather than an exemption; and any board not on the list that starts hand-padding fails the
 * sweep. The list also carries a ceiling, so it cannot grow until it has swallowed the family.
 *
 * ## What this does not reach
 *
 * Operators nested inside a fraction, a radical or a script are outside the population: the atoms
 * read are the ones at `.base` level, which is where an expression's own operators sit, and a
 * `.vlist`'s children are stacked vertically so a horizontal gap between them means nothing.
 * A visual is also measured in its MOUNT state, so an operator a learner has to unlock is not
 * seen. Both are gaps rather than decisions.
 *
 * One width. Every number is a ratio to the font size, `.katex` is `white-space: nowrap`, and
 * none of this spacing reflows, so unlike a fit claim it is not width-dependent.
 *
 * Real Chromium and the real stylesheet, because every number here is a painted rectangle.
 */

import { afterAll, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { allLessons } from "./domains";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Desktop, so a host set to 460px really is 460px wide. As in `mathCaseTransform`. */
beforeAll(async () => {
  await page.viewport(1440, 900);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/** The most air an operator KaTeX spaces itself (`.mbin`) may carry, as a fraction of font size. */
const SPACED_MAX_EM = 0.3;

/** The most an operator KaTeX DEMOTES and spaces at zero may carry. See the header. */
const UNSPACED_MAX_EM = 0.05;

/**
 * The operator glyphs KaTeX may demote to `.mord`, as it PAINTS them rather than as they are
 * written: `\times` paints U+00D7, `\div` paints U+00F7, `\cdot` paints U+22C5. Deliberately no
 * `+` or `-`: leading, those are signs. See the header.
 */
const DEMOTABLE_OPERATORS = /^[\u00D7\u00F7\u22C5]$/;

/** Every glyph that counts as an operator when it is the NEIGHBOUR, including the signs. */
const OPERATOR_GLYPHS = /^[\u00D7\u00F7\u22C5+\u2212-]$/;

/** Boards allowed to hand-pad an operator, each with the reason it is not fixed here. */
const HAND_PADDED_EXCEPTIONS: Readonly<Record<string, string>> = {
  "exp-factor-slider":
    "ExpFactorSlider.tsx's `\\times \\; ?` is pinned as a literal by ExpFactorSlider.browser.test.tsx:49",
};

/**
 * A ceiling on the exceptions, one above the one written above.
 *
 * A floor keeps the population from emptying; this keeps the exemptions from filling it. Raising
 * it is the moment to ask whether the rule is worth having rather than a formality.
 */
const MAX_EXCEPTIONS = 2;

/** One operator atom, and how much air it was painted with on one side. */
interface OperatorReading {
  readonly visual: string;
  /** The LaTeX it came from, so a failure is findable in source. */
  readonly latex: string;
  readonly glyph: string;
  readonly side: "before" | "after";
  /** Painted distance to the neighbouring ink, less that atom's own margin, in em. */
  readonly gapEm: number;
  /** The most this operator may carry: which of the two thresholds applies to it. */
  readonly allowedEm: number;
}

interface Sweep {
  /** Every placed visual that mounted. */
  readonly visuals: string[];
  /** Visuals that painted at least one operator against an operand. */
  readonly operatorVisuals: string[];
  readonly readings: OperatorReading[];
}

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/** The glyph an atom paints, trimmed. */
function glyphOf(atom: HTMLElement): string {
  return (atom.textContent ?? "").trim();
}

/** An atom's own `margin-right`, which is where KaTeX puts italic correction and its spacing. */
function marginRight(atom: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(atom).marginRight) || 0;
}

/**
 * Every atom of one expression in reading order, flattened across KaTeX's `.base` spans.
 *
 * The flattening is the point: see the header. Zero-width nodes (`.strut`, `.mspace`) are
 * dropped, because an `.mspace` carries its width as a `margin-right` and would otherwise read
 * as ink sitting zero pixels from the operator it is spacing.
 */
function inkAtoms(html: HTMLElement): HTMLElement[] {
  const atoms: HTMLElement[] = [];
  for (const child of Array.from(html.children) as HTMLElement[]) {
    if (child.classList.contains("base")) {
      atoms.push(...(Array.from(child.children) as HTMLElement[]));
    } else {
      atoms.push(child);
    }
  }
  return atoms.filter((atom) => atom.getBoundingClientRect().width > 0.01);
}

/** What the LaTeX was, so a failure is findable in source. */
function sourceLatex(node: HTMLElement): string {
  const carrier = node.closest<HTMLElement>("[data-latex]");
  return carrier?.getAttribute("data-latex") ?? node.textContent?.slice(0, 24) ?? "";
}

/** Read every operator gap in one mounted visual. */
function readOperators(id: string, host: HTMLElement): OperatorReading[] {
  const readings: OperatorReading[] = [];
  // The visual layer only: `.katex-mathml` duplicates every glyph off-screen.
  for (const html of Array.from(host.querySelectorAll<HTMLElement>(".katex-html"))) {
    const fontSize = Number.parseFloat(getComputedStyle(html).fontSize);
    if (!Number.isFinite(fontSize) || fontSize <= 0) {
      continue;
    }
    const atoms = inkAtoms(html);
    atoms.forEach((atom, at) => {
      const glyph = glyphOf(atom);
      const spaced = atom.classList.contains("mbin");
      if (!spaced && !DEMOTABLE_OPERATORS.test(glyph)) {
        return;
      }
      const allowedEm = spaced ? SPACED_MAX_EM : UNSPACED_MAX_EM;
      const box = atom.getBoundingClientRect();
      const latex = sourceLatex(atom);
      const sides: { side: "before" | "after"; other: HTMLElement | undefined }[] = [
        { side: "before", other: atoms[at - 1] },
        { side: "after", other: atoms[at + 1] },
      ];
      for (const { side, other } of sides) {
        if (other === undefined || OPERATOR_GLYPHS.test(glyphOf(other))) {
          // Nothing beside it, or the neighbour is another operator: a separator, not padding.
          continue;
        }
        const neighbour = other.getBoundingClientRect();
        // Less the margin belonging to whichever atom comes first, which is where KaTeX puts
        // italic correction. A negative reading means the two wrapped; nothing does today.
        const gapPx =
          side === "before"
            ? box.left - neighbour.right - marginRight(other)
            : neighbour.left - box.right - marginRight(atom);
        if (gapPx < 0) {
          continue;
        }
        readings.push({
          visual: id,
          latex,
          glyph,
          side,
          gapEm: gapPx / fontSize,
          allowedEm,
        });
      }
    });
  }
  return readings;
}

/** The harness holding whatever is on screen, so a thrown assertion cannot leak a board. */
let mounted: { cleanup: () => void } | null = null;

function unmount(): void {
  mounted?.cleanup();
  mounted = null;
}

async function mountVisual(id: LessonVisualId, width: number): Promise<HTMLElement> {
  const harness = mount(<LessonVisual id={id} />);
  mounted = harness;
  const host = harness.host;
  host.style.width = `${width}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  // KaTeX renders in an effect, so a visual read on the mount tick has no `.katex` at all.
  await waitFor(
    () => host.querySelector(".katex") !== null,
    `${id} typesets something`,
    1500,
  ).catch(() => {});
  /*
   * And KaTeX's own faces have to have arrived. A gap is a margin rather than a glyph advance,
   * so the fallback face does not widen it, but the neighbour EDGES either side of one are glyph
   * advances and a stale face moves both. Cheap after the first mount: `fonts.ready` is already
   * resolved once nothing new is loading.
   */
  await document.fonts.ready;
  return host;
}

async function sweep(width: number): Promise<Sweep> {
  const visuals: string[] = [];
  const operatorVisuals: string[] = [];
  const readings: OperatorReading[] = [];

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id, width);
    visuals.push(id);
    const found = readOperators(id, host);
    if (found.length > 0) {
      operatorVisuals.push(id);
      readings.push(...found);
    }
    unmount();
  }

  return { visuals, operatorVisuals, readings };
}

/**
 * One sweep, shared by both claims. Mounting every placed visual is the expensive part and
 * neither claim drives a board into a state the other does not.
 */
let swept: Promise<Sweep> | null = null;

/*
 * Both tests below carry `300_000`, which is what mounting 173 visuals costs rather than
 * vitest's default.
 *
 * The default was never chosen for a sweep: this file takes about 9s alone and over 20s while
 * the rest of the browser suite is saturating the machine, so on the default whichever test
 * reaches `sweepOnce` first fails on the wall clock with its assertion unreached. Not a budget
 * being loosened — every sibling sweep in this directory already carries one (`chipPressedState`
 * 300s, `answerRowChrome` and `practicePromptOnce` 240s, `matchItemFit` 180s) and this file was
 * simply written without it. Written as a literal because the formatter only hugs a test
 * callback when the timeout is one.
 */
function sweepOnce(): Promise<Sweep> {
  swept ??= sweep(FIGURE_CONTENT_CAP);
  return swept;
}

/**
 * Floors, under the numbers measured over this tree: 173 placed visuals, 104 of them painting an
 * operator against an operand, 672 gaps read.
 */
const VISUAL_FLOOR = 165;
const OPERATOR_VISUAL_FLOOR = 100;
const OPERATOR_GAP_FLOOR = 650;

/** Every operator painted with more air than its threshold allows, one line per expression. */
function overPadded(readings: readonly OperatorReading[]): Map<string, string[]> {
  const byVisual = new Map<string, string[]>();
  for (const r of readings) {
    if (r.gapEm <= r.allowedEm) {
      continue;
    }
    const line = `"${r.latex}" paints ${r.gapEm.toFixed(4)}em ${r.side} its "${r.glyph}", over the ${r.allowedEm}em this operator may carry`;
    const lines = byVisual.get(r.visual) ?? [];
    if (!lines.includes(line)) {
      lines.push(line);
    }
    byVisual.set(r.visual, lines);
  }
  return byVisual;
}

test("no placed visual hand-pads an operator", async () => {
  const { visuals, operatorVisuals, readings } = await sweepOnce();

  // THE DEFECT.
  const unexcused = Array.from(overPadded(readings))
    .filter(([visual]) => !(visual in HAND_PADDED_EXCEPTIONS))
    .map(([visual, lines]) => `${visual}: ${lines.join(", ")}`);
  expect(
    unexcused.join("; "),
    `these operators are hand-padded: KaTeX already spaces a binary operator by 0.2222em on each side, so a \\; beside one paints it with roughly twice the air of its neighbours (census: ${visuals.length} visuals, ${operatorVisuals.length} drawing an operator, ${readings.length} gaps read)`,
  ).toBe("");

  expect(visuals.length, "no lesson places a visual").toBeGreaterThanOrEqual(VISUAL_FLOOR);
  expect(
    operatorVisuals.length,
    "too few placed visuals painted an operator for this to be a claim about the family",
  ).toBeGreaterThanOrEqual(OPERATOR_VISUAL_FLOOR);
  expect(
    readings.length,
    "too few operator gaps were read, so this sweep measured almost nothing",
  ).toBeGreaterThanOrEqual(OPERATOR_GAP_FLOOR);
}, 300_000);

/**
 * AND EVERY EXEMPTION IS STILL EXEMPTING SOMETHING.
 *
 * Both directions, so the list cannot outlive what it describes. A board that is no longer placed
 * fails, and a board that no longer hand-pads anything fails: either way the entry has stopped
 * being an exemption and has become a hole in the population above.
 */
test("every declared hand-padding exception still exists and still hand-pads", async () => {
  const { readings } = await sweepOnce();
  const placed = new Set<string>(liveVisualIds());
  const offenders = overPadded(readings);

  const stale: string[] = [];
  for (const [visual, reason] of Object.entries(HAND_PADDED_EXCEPTIONS)) {
    if (!placed.has(visual)) {
      stale.push(`${visual} is not placed by any lesson, so its exception excuses nothing`);
    } else if (!offenders.has(visual)) {
      stale.push(
        `${visual} no longer paints a hand-padded operator, so its exception ("${reason}") is decorative and the entry should go`,
      );
    }
  }
  expect(
    stale.join("; "),
    "a declared exception has to fail when it stops describing the board it names",
  ).toBe("");

  const count = Object.keys(HAND_PADDED_EXCEPTIONS).length;
  expect(
    count,
    "the exception list is empty, so this claim asserts nothing: delete it with the last entry",
  ).toBeGreaterThanOrEqual(1);
  expect(
    count,
    "the exemptions are outgrowing the rule they are exemptions from",
  ).toBeLessThanOrEqual(MAX_EXCEPTIONS);
}, 300_000);
