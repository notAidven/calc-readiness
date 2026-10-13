/**
 * The KaTeX guard for every learner-visible diagram.
 *
 * Six properties, checked across every live mini-lesson visual and every registered
 * worked solution in the domains this file sweeps (driven by the real frozen practice pools, so
 * the params are the ones a learner actually sees). Which domains those are is not a claim made
 * in prose here: `NOT_SWEPT_HERE` in `practiceSweep.ts` names the ones left out and the census
 * below asserts the difference, because this header used to say "every registered domain" and
 * had stopped being true. The population lives there rather than here so that the browser sweep
 * in `workedFigureLabels.browser.test.tsx` measures the same instances this one reads.
 *
 *  1. The diagram typesets its math — at least one KaTeX node renders.
 *  2. No SVG `<text>` still carries hand-written arithmetic. Bare integers are allowed
 *     (axis ticks, where KaTeX buys nothing and costs a foreignObject each) and so are
 *     word labels; operators, fractions, percents and relations are not.
 *  3. The LaTeX handed to KaTeX is real LaTeX: no Unicode operator smuggled into an
 *     `EqToken`, no `3/4` where a `\dfrac` belongs. Without this, a token string that was
 *     never migrated still renders (KaTeX passes `×` through) and looks almost right.
 *  4. No `EquationRow` token glues an operator to an operand. See the `EquationRow` note
 *     in `svgKit`: KaTeX cannot space an operator that has no operand on one side, so
 *     `{ text: "a +" }` renders `a+` and the row's gap lands after the plus.
 *  5. No row or caption prints the same thing on both sides of an `=`. A diagram is
 *     written once and rendered for every param draw, so a "reduce" row can restate
 *     itself ("3/5 = 3/5") on the draws that arrived already reduced.
 *  6. A `?` standing in for an unknown is `\mathord{?}`. KaTeX defines `?` as a CLOSE
 *     atom, and TeX demotes a binary operator before a close atom to an ordinary one,
 *     which takes the space out on both sides: `... + ? = ...` paints as `+?`.
 *  7. No SENTENCE prints a bare digit beside a number it typesets. Property 2 is the same
 *     rule for an SVG `<text>`; this one is for the HTML a widget writes around its maths,
 *     where a number can sit in the prose with a typeset one inches away and look almost
 *     right. FUN.4's report shipped "The trace climbs from hour $0$ to hour 6." for exactly
 *     that reason, and no guard in the tree could see it.
 *
 * Properties 2, 3 and 4 are what catch a half-converted widget, which is otherwise
 * invisible until someone opens that one lesson.
 *
 * Property 6 is ALSO checked against the source, in the last describe below, and the reason
 * is a hole this render sweep cannot close. A figure's LaTeX is a function of its params, and
 * this sweep renders one instance per template, so a branch no frozen draw reaches is never
 * typeset here at all: `d10.geo1.angle-third.l2` picks between a triangle and a straight line
 * on its `triangle` param, the pooled instance draws the straight line, and the triangle's
 * `+ ?` — the defect this rule was written for — rendered green through this file with the
 * bug in place. Rendering is the wrong population for a claim about an authored STRING.
 */

import {
  createRng,
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_TEMPLATES,
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_TEMPLATES,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_TEMPLATES,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_TEMPLATES,
  D10_PRACTICE_ITEMS,
  D10_PRACTICE_TEMPLATES,
  hasIdentityRestatement,
} from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CFU_ONLY_TEMPLATE_LIST } from "./cfuVariants";
import { allLessons } from "./domains";
import {
  bankDomains,
  domainOf,
  figureGapCensus,
  figureGapReport,
  LIVE_PRACTICE_ITEMS,
  NOT_SWEPT_HERE,
  practiceRegistryNames,
  REGISTERED_TEMPLATE_IDS,
  REGISTRY_FLOOR,
  TEMPLATE_FLOOR,
} from "./practiceSweep";
import { LessonVisual, type LessonVisualId } from "./visuals";
import { WorkedSolution } from "./WorkedSolution";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

/** Math notation that must go through KaTeX rather than a raw `<text>` node. */
const BARE_MATH: readonly { pattern: RegExp; what: string }[] = [
  { pattern: /[\u00d7\u00f7]/, what: "a times/divide sign" },
  { pattern: /[\u221a\u221b\u221c]/, what: "a radical sign" },
  { pattern: /=/, what: "a relation" },
  { pattern: /%/, what: "a percent" },
  { pattern: /\d\s*\/\s*\d/, what: "a slash fraction" },
  { pattern: /\d\s*[+\u2212]\s*\d/, what: "an inline sum" },
];

/** Plain-text notation that must not survive inside a string handed to KaTeX. */
const NOT_LATEX: readonly { pattern: RegExp; what: string }[] = [
  { pattern: /\u00d7/, what: "\u00d7 instead of \\times" },
  { pattern: /\u00f7/, what: "\u00f7 instead of \\div" },
  { pattern: /\u00b7/, what: "a Unicode middot instead of \\cdot" },
  { pattern: /[\u221a\u221b\u221c]/, what: "a Unicode radical instead of \\sqrt" },
  { pattern: /\u2212/, what: "a Unicode minus instead of -" },
  { pattern: /\d\s*\/\s*\d/, what: "a slash fraction instead of \\dfrac" },
  { pattern: /(?<!\\)%/, what: "a bare % instead of \\%" },
  // KaTeX registers `?` as a CLOSE atom (`defineSymbol(math, main, close, "?", "?")`), and
  // TeX demotes a Bin atom that precedes a Close to an Ord, which removes the medium space
  // on BOTH sides of the operator. So `45^{\circ} + ? = 180^{\circ}` paints the plus hard up
  // against the question mark. Written to require the whitespace an author puts around a
  // binary operator, so a leading sign (`-?`, which nobody writes) is not the subject, and
  // an already-wrapped `+ \mathord{?}` cannot match because `\mathord{` sits between them.
  {
    pattern: /(?:[-+]|\\times|\\cdot|\\div|\\pm)\s*\?/,
    what: "a bare ? as the operand of a binary operator, which loses the operator's spacing; use \\mathord{?}",
  },
];

/**
 * An operator at the edge of a token. Both patterns require the whitespace an author
 * writes around a binary operator, so a sign stays exempt: `- 9` matches, `-4` does not,
 * and a token that is nothing but an operator has no whitespace to match either.
 */
const LEADING_OP = /^(\\times|\\div|\\cdot|\\pm|[-+=])\s/;
const TRAILING_OP = /\s(\\times|\\div|\\cdot|\\pm|[-+=])$/;

/* -------------------------------------------------------------------------- */
/* A bracket is as tall as what it holds                                       */
/* -------------------------------------------------------------------------- */

/**
 * A delimiter big enough to hold a DISPLAY FRACTION.
 *
 * Matched against the text BEFORE the opening delimiter, so it is the macro that opened this
 * one and not some sizing command earlier in the row. The same regex serves `(` and `\{`,
 * because a sized brace is spelled the same way as a sized paren: `\left\{` is `\left` then
 * the literal brace.
 *
 * This used to read `\\(?:left|bigl?|Bigl?|biggl?|Biggl?)$`, which asks whether a delimiter
 * was grown AT ALL and never whether it was grown ENOUGH — so it blessed a bracket a learner
 * could see was too short for the fraction inside it, twice, and the reported defect passed
 * every run. The four fixed sizes are not interchangeable. Painted ink, in the D4
 * completing-the-square figure's own user units, at `middle = 14` in Chromium (readings and
 * method in `bracketSizing.browser.test.tsx`, which measures every figure that draws one):
 *
 *   \dfrac{14}{2}   37.0
 *   \bigl   size1   22.0   0.60x its contents
 *   \Bigl   size2   31.6   0.85x
 *   \biggl  size3   41.1   1.11x
 *   \left   size3   41.1   1.11x
 *   \Biggl  size4   52.6   1.42x
 *
 * So `size3` is the first canned size that clears a display fraction, and the accepted set is
 * `\left` (which picks its own size from the content, and picks `size3` here) together with
 * the two spellings at or above `size3`. `\bigl` and `\Bigl` are REJECTED around tall math:
 * that is the tightening, and `\bigl(\dfrac{14}{2}\bigr)^{2}` is asserted below as a defect
 * this reports rather than one it blesses.
 *
 * `\sqrt` is shorter than a `\dfrac` and would clear a smaller bracket, so the bar here is
 * set by the tallest member of `TALL_MATH` rather than per-construct. Nothing is lost by
 * that: `\left(` sizes itself to whatever it holds and is accepted for both.
 */
const GROWN_OPEN = /\\(?:left|biggl?|Biggl?)$/;

/**
 * Math that stands taller than a plain `(`.
 *
 * `\dfrac` and `\sqrt` only. `\frac` and `\tfrac` are deliberately absent: these diagrams
 * typeset through `katex.render` with `displayMode` off, where `\frac` IS `\tfrac` and comes
 * out one line tall, so requiring a grown delimiter around one would be requiring a bracket
 * bigger than its contents. `\dfrac` is the one that forces display style whatever the
 * surrounding mode, and measured in Chromium at the diagrams' own font size it is 36.7 user
 * units against a bare paren's 16.1.
 */
const TALL_MATH = /\\(?:dfrac|sqrt)/;

/**
 * The delimiter pairs a figure can wrap tall math in.
 *
 * The paren is the one the reported defect used. The SET BRACE is here because scoping this
 * rule to the reported spelling is the same mistake as scoping it to the reported template:
 * `\{` and `(` are two ways of writing the identical defect, and the tree shipped both. Every
 * RAT.6 figure closes on `acceptedRow`'s solution set, and the one that solves to a fraction
 * was drawing `\{\dfrac{42}{13}\}` — a normal-size brace at 0.48x the display fraction inside
 * it — which this rule could not see, because it counted only `(` and `)`.
 *
 * `\{` and `\}` are the LITERAL braces, two characters each. LaTeX's grouping braces are the
 * bare `{` and `}` of `\dfrac{1}{2}` and are not delimiters at all, so matching the escaped
 * form keeps the two apart without any further bookkeeping.
 */
const DELIMITER_PAIRS = [
  { open: "(", close: ")" },
  { open: "\\{", close: "\\}" },
] as const;

/**
 * Every place a string wraps tall math in a delimiter pair too small to hold it.
 *
 * This is the rule the reported figure fails. `d4.pol4.complete.l1` shipped
 * `\bigl(\dfrac{n}{2}\bigr)^{2}` — a `size1` bracket around a fraction almost twice its
 * height — and this file blessed it, because the check asked only whether a sizing macro was
 * present. The height claim now lives in `GROWN_OPEN` above, taken from measurements rather
 * than from the spelling.
 *
 * Depth-tracked rather than pattern-matched, because the claim is about the pair that
 * ENCLOSES the fraction: `(x + 1)\dfrac{1}{2}` has a paren and a fraction and is correct, and
 * a regex over the flat string cannot tell the two apart. Each pair keeps its own stack, since
 * a `)` does not close a `\{`.
 */
function ungrownDelimiters(latex: string): string[] {
  const found: string[] = [];
  for (const { open, close } of DELIMITER_PAIRS) {
    const opened: { at: number; grown: boolean }[] = [];
    for (let at = 0; at < latex.length; at += 1) {
      if (latex.startsWith(open, at)) {
        opened.push({ at, grown: GROWN_OPEN.test(latex.slice(0, at)) });
        at += open.length - 1;
        continue;
      }
      if (!latex.startsWith(close, at)) {
        continue;
      }
      const closedAt = at;
      at += close.length - 1;
      const start = opened.pop();
      if (start === undefined || start.grown) {
        continue;
      }
      const inside = latex.slice(start.at + open.length, closedAt);
      if (TALL_MATH.test(inside)) {
        found.push(
          `${open} ${inside} ${close} is a pair too short to hold the tall math inside it`,
        );
      }
    }
  }
  return found;
}

/**
 * The LaTeX strings a rendered figure exposes, each read once.
 *
 * `EquationRow` puts a `data-latex` on the row's `foreignObject` holding all of its tokens
 * joined, and another on every token span inside it. Only the LEAVES are read: the joined
 * row is a concatenation rather than an authored string, so a `(` opened in one token and
 * closed in the next would pair up there and be counted as a bracket nobody wrote.
 */
function latexLeaves(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-latex]"))
    .filter((node) => node.querySelector("[data-latex]") === null)
    .map((node) => node.getAttribute("data-latex") ?? "");
}

/**
 * Every id ANY authored lesson places, across every registered domain, in first-seen
 * order. Read from the all-domains registry rather than one domain's pack, so a newly
 * registered domain is swept the moment it is wired up and cannot ship a half-converted
 * widget the way D2 did (a Unicode minus and a `·` reaching KaTeX in its exponent
 * widgets, invisible until someone opened that one lesson).
 */
const LIVE_VISUAL_IDS = Array.from(
  new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
);

/**
 * Visuals with nothing to typeset in the state this test renders (the untouched initial
 * render). The PEMDAS mnemonic is six initials of six English words ("Please Excuse My Dear
 * Aunt Sally") mapped to operation NAMES, so every glyph in it is prose. `exp-graph-play`
 * opens on an empty pair of axes and a prose question and draws no math until the learner
 * commits a call, so its initial render has nothing to typeset; the bare-math and
 * glued-operator guards below still run over it.
 */
const NO_MATH_VISUAL_IDS: ReadonlySet<string> = new Set([
  "pemdas-mnemonic-explore",
  "exp-graph-play",
]);

function svgTextNodes(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("svg text"))
    .map((node) => node.textContent ?? "")
    .filter((text) => text.trim().length > 0);
}

function bareMathIn(container: HTMLElement): string[] {
  const inText = svgTextNodes(container).flatMap((text) => {
    const hit = BARE_MATH.find(({ pattern }) => pattern.test(text));
    return hit ? [`<text> "${text}" has ${hit.what}`] : [];
  });
  const inLatex = Array.from(container.querySelectorAll("[data-latex]")).flatMap((node) => {
    const latex = node.getAttribute("data-latex") ?? "";
    const hit = NOT_LATEX.find(({ pattern }) => pattern.test(latex));
    return hit ? [`latex "${latex}" has ${hit.what}`] : [];
  });
  return [...inText, ...inLatex];
}

/**
 * Reports raw notation in a caption's PROSE, outside its `$...$` spans.
 *
 * The sweeps above read `<text>` nodes and `data-latex` attributes, and a caption is neither:
 * it is Markdown, and whatever sits outside a math span reaches the page as plain prose. So
 * `4/3 \u00d7 3/10 = 12/30` written into a caption renders, reads almost right in an unstyled
 * sentence, and was invisible to every guard in this file -- confirmed by writing exactly that
 * into `cfu.numf.multiply-reduce` and watching all twelve of its draws pass.
 *
 * Only `$...$` is stripped, not `\(...\)`: `remark-math` is configured for dollars here, so a
 * paren-delimited span is prose too and this is right to read it as such.
 */
function bareMathInCaption(caption: string): string[] {
  const prose = caption.replace(/\$[^$]*\$/g, " ");
  const hit = BARE_MATH.find(({ pattern }) => pattern.test(prose));
  return hit ? [`caption prose "${prose.trim()}" has ${hit.what}`] : [];
}

/**
 * Reports any diagram row that prints the same thing on both sides of an `=`. Applies the
 * item bank's rule to the LaTeX a diagram renders, so a caption or footer that claims a
 * reduction the params never needed is caught the same way a step is.
 */
function identityRestatementsIn(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-latex]")).flatMap((node) => {
    const latex = node.getAttribute("data-latex") ?? "";
    return hasIdentityRestatement(latex) ? [`latex "${latex}" restates itself`] : [];
  });
}

/**
 * Walks each `EquationRow` and reports tokens that carry an operator on a side where a
 * sibling token already sits. The row's own edges are exempt: a leading `=` that opens a
 * continuation row is correct, since nothing precedes it. `SvgMath` boxes hold a single
 * unattributed span and so contribute nothing here.
 */
function gluedOperatorsIn(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("foreignObject[data-latex]")).flatMap(
    (row) => {
      const spans = Array.from(row.querySelectorAll("span[data-latex]"));
      return spans.flatMap((span, index) => {
        const latex = span.getAttribute("data-latex") ?? "";
        if (index > 0 && LEADING_OP.test(latex)) {
          return [`token "${latex}" opens with an operator that belongs in its own token`];
        }
        if (index < spans.length - 1 && TRAILING_OP.test(latex)) {
          return [`token "${latex}" ends with an operator that belongs in its own token`];
        }
        return [];
      });
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Property 7: one sentence, one notation                                      */
/* -------------------------------------------------------------------------- */

/**
 * One element printing a bare digit in the same run of prose as a number it typesets.
 *
 * The subject is the SENTENCE, not the visual. A card holding a diagram below a caption is
 * not the defect; a line of words that renders one of its numbers through KaTeX and writes the
 * next one out is. So this reads DIRECT children only: a typeset number has to be an element
 * child, and the bare digit a text-node child of the same element.
 *
 * That is also what keeps the deliberate exceptions out without naming them. A bare integer
 * axis tick is an SVG `<text>` ELEMENT, never a text node inside the sentence a
 * `foreignObject[data-latex]` sits in, so the whole vertical scale of every plane in the tree
 * is outside this population by construction rather than by a list.
 *
 * What it does NOT reach is every widget STATE. This file renders the untouched first paint, so
 * a sentence written only into a reveal, a later variant or a feedback branch is unmeasured
 * here — the same sparse-branch hole that makes the `?` rule below read the source as well as a
 * render, and the reason `GraphExtremumSpot` routes its reveal answer through the same helper
 * its report lines use rather than rebuilding the sentence a second time.
 */
function numeralMixesIn(container: HTMLElement): { prose: string; typeset: string }[] {
  const found: { prose: string; typeset: string }[] = [];
  for (const host of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const typeset = Array.from(host.children).filter(
      (kid) =>
        kid.hasAttribute("data-latex") && /\d/.test(kid.getAttribute("data-latex") ?? ""),
    );
    if (typeset.length === 0) {
      continue;
    }
    const prose = Array.from(host.childNodes)
      .filter((kid) => kid.nodeType === Node.TEXT_NODE)
      .map((kid) => (kid.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((text) => /\d/.test(text));
    if (prose.length === 0) {
      continue;
    }
    found.push({
      prose: prose.join(" ~ "),
      typeset: typeset.map((kid) => kid.getAttribute("data-latex") ?? "").join(", "),
    });
  }
  return found;
}

/**
 * The digits that are not part of the mathematics, and so are not owed KaTeX.
 *
 * All four are PROGRESS COUNTERS on a status line: how far through a multi-part exercise the
 * learner is. A counter is chrome — it is not a quantity in the lesson, nothing is computed
 * from it, and typesetting it would say it were one — which is the same argument the
 * `lesson-katex` skill makes for leaving a bare integer axis tick alone.
 *
 * The last two arrived with a FIX rather than with a defect, which is worth reading before
 * adding a third of them. `widgetTaskOrder` found that both boards had advanced their task
 * slot without carrying the question into it, so D9 QA round 1 moved the question in; the
 * slot was already numbered `Part 1 of 3`, so the counter now shares an element with the
 * quantities the question typesets and reads here as a mix. The digits did not change and are
 * the same chrome they were, but note what that makes this guard sensitive to: not the counter
 * alone, which would sit in an element of its own unnoticed, but a counter that a later edit
 * has moved next to real math. That is why the entries below are readings.
 *
 * Excused by the exact reading rather than by the id, so a SECOND mix in one of these widgets
 * is reported normally. An id-wide exemption would have excused the next defect in the same
 * file, which is the difference between naming what you excuse and excusing a file.
 */
const COUNTER_NOT_MATHS: readonly {
  id: LessonVisualId;
  prose: string;
  why: string;
}[] = [
  {
    id: "absolute-value-explore",
    prose: "0 ~ of 2. Right now",
    why: "NUM.S: 'Found 0 of 2', a count of how many of the two points have been located",
  },
  {
    id: "linear-line-form-build",
    prose: "1 ~ 2",
    why: "LF.2: 'Target 1 of 2', which target of the two the learner is on",
  },
  {
    id: "trg-tangent-explore",
    prose: "1 ~ 3",
    why: "TRG.6: 'Part 1 of 3', beside the 12 meters and 45 degrees its question typesets",
  },
  {
    id: "geo-angle-explore",
    prose: "1 ~ 3",
    why: "GEO.1: 'Part 1 of 3', beside the 52 degrees its question typesets",
  },
];

/**
 * The counters are the whole list, and there was briefly a second one beside them.
 *
 * `OUT_OF_LANE` named `linear-model-claim-spot` (D7, LF.3), which opened "used their model to
 * work out 3 hours. Their answer, $\$147$, is far more than the situation allows" — the
 * model's INPUT written out and its output typeset, in one sentence, the FUN.4 defect exactly.
 * It was listed rather than left out of the population, because a member that does not owe the
 * property and a member that forgot it look identical from outside a guard.
 *
 * It is gone because the debt is paid rather than because the list was wrong, which is the
 * same way the `OUT_OF_LANE` in `d6Fun4AxisAndProse.browser.test.tsx` went. Its disjointness
 * assertion went with it: over an empty list that check holds trivially, and an assertion that
 * cannot fail is not a cheaper version of one that can.
 *
 * The fix reached four sentences, not the one entry named. Only the heading is in the first
 * paint this file renders; the same `${at} ${units}` was in the rolled-rate miss twice and in
 * the conclusion, all behind interactions no sweep here reaches.
 */
const NUMERAL_MIX_EXCUSED = COUNTER_NOT_MATHS;

/** Every numeral mix in a visual that no entry above names. */
function unexcusedNumeralMixes(container: HTMLElement, id: string): string[] {
  const excused = NUMERAL_MIX_EXCUSED.filter((entry) => entry.id === id).map(
    (entry) => entry.prose,
  );
  return numeralMixesIn(container)
    .filter((mix) => !excused.includes(mix.prose))
    .map((mix) => `"${mix.prose}" is prose beside the typeset "${mix.typeset}"`);
}

describe("mini-lesson visuals typeset their math with KaTeX", () => {
  it.each(LIVE_VISUAL_IDS)("%s", (id) => {
    const { container } = render(<LessonVisual id={id} />);
    if (!NO_MATH_VISUAL_IDS.has(id)) {
      expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0);
    }
    expect(bareMathIn(container)).toEqual([]);
    expect(gluedOperatorsIn(container)).toEqual([]);
    expect(unexcusedNumeralMixes(container, id)).toEqual([]);
  });
});

describe("no visual prints a bare digit beside a number it typesets", () => {
  it("the detector still reports the shape it is written for", () => {
    // A guard whose checker has stopped matching agrees with every sentence in the tree and
    // says nothing about any of them. This is the FUN.4 sentence, in the shape it shipped.
    const board = document.createElement("p");
    const typeset = document.createElement("span");
    typeset.setAttribute("data-latex", "0");
    typeset.textContent = "0";
    board.append("The trace climbs from hour ", typeset, " to hour 6.");
    const host = document.createElement("div");
    host.append(board);
    // Only the digit-bearing run is reported: "The trace climbs from hour " holds no numeral
    // and is not part of what the sentence got wrong.
    expect(numeralMixesIn(host)).toEqual([{ prose: "to hour 6.", typeset: "0" }]);

    // And the two shapes it must NOT report, since both are the deliberate exceptions in the
    // `lesson-katex` skill: a sentence whose only numbers are typeset, and a bare axis tick
    // drawn as a sibling ELEMENT of the maths rather than inside its sentence.
    const clean = document.createElement("p");
    const both = document.createElement("span");
    both.setAttribute("data-latex", "6");
    clean.append("The highest reading of the shift is ", both, ".");
    const plane = document.createElement("div");
    const tick = document.createElement("span");
    tick.textContent = "12";
    const label = document.createElement("span");
    label.setAttribute("data-latex", "y = 2x");
    plane.append(tick, label);
    const clear = document.createElement("div");
    clear.append(clean, plane);
    expect(numeralMixesIn(clear)).toEqual([]);
  });

  it("swept the whole tree, not a corner of it", () => {
    // A floor under the population, because the per-visual assertion above holds trivially
    // over a list that has stopped resolving. 253 live visuals when this was written.
    expect(
      LIVE_VISUAL_IDS.length,
      "the live-visual list collapsed, so property 7 was checked over nothing",
    ).toBeGreaterThanOrEqual(240);
  });

  it("keeps the excused list the handful that justified sweeping the tree", () => {
    // A ceiling, not a floor: a list that grows into the population is a different decision
    // and should be made again rather than drifted into one entry at a time. Re-derived when
    // `linear-model-claim-spot` was fixed and its entry deleted, from a measurement of 2
    // excused out of 253 rather than the 3 it was first set against, so it was 5 and is 3.
    //
    // Set a third time, back to 5, when a forward merge brought `trg-tangent-explore` and
    // `geo-angle-explore` in at 4. That is the decision this ceiling exists to force, so it
    // was made against a measurement rather than by raising the number until the file passed:
    // a keyword-anchored sweep of the widget sources for an `N of M` counter beside prose
    // finds it in three files, and all three are listed here. Treat three as a lower bound and
    // not a total — `absolute-value-explore` is listed from a counter that same sweep did not
    // match — but the shape is rare enough that the list is not tracking the population.
    expect(
      NUMERAL_MIX_EXCUSED.length,
      "the excused list has grown past the measurement that justified sweeping the tree",
    ).toBeLessThanOrEqual(5);
  });

  it("excuses only visuals a lesson actually places", () => {
    expect(
      NUMERAL_MIX_EXCUSED.filter((entry) => !LIVE_VISUAL_IDS.includes(entry.id)).map(
        (entry) => entry.id,
      ),
      "these are excused here but no lesson places them: delete the entries",
    ).toEqual([]);
  });

  // The other direction, and the one that stops an exemption becoming permanent by neglect: a
  // widget that stops mixing has to fail here, so the entry cannot sit in the list forever
  // excusing nothing while nobody can tell.
  it.each(NUMERAL_MIX_EXCUSED.map((entry) => [entry.id, entry] as const))(
    "%s still prints the reading it is excused for",
    (_id, entry) => {
      const { container } = render(<LessonVisual id={entry.id} />);
      expect(
        numeralMixesIn(container).map((mix) => mix.prose),
        `${entry.id} no longer prints "${entry.prose}" (${entry.why}): delete it from the list`,
      ).toContain(entry.prose);
    },
  );
});

/** Templates per domain in the swept population, for the printed count and the floors below. */
function templatesPerDomain(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of REGISTERED_TEMPLATE_IDS) {
    const domain = domainOf(id);
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return counts;
}

function sweepCensus(): string {
  const counts = [...templatesPerDomain()].sort(([a], [b]) => a.localeCompare(b));
  const per = counts.map(([domain, count]) => `${domain}=${count}`).join(" ");
  return `${REGISTERED_TEMPLATE_IDS.length} templates, ${LIVE_PRACTICE_ITEMS.length} instances (${per})`;
}

describe("worked-solution visuals typeset their math with KaTeX", () => {
  /**
   * The sweep is only as good as its list. This is the assertion that keeps a template
   * from slipping out of it again: it is driven by the TEMPLATE registries, so a shape
   * that never enters a canonical pool still has to be represented in `practiceSweep`.
   */
  it("covers every registered practice template in the domains it sweeps", () => {
    const swept = new Set(LIVE_PRACTICE_ITEMS.map((item) => item.template_id));
    // Printed, not merely asserted. A floor says the population is not empty; only the count
    // says which domains are actually in it, and a domain that silently stopped contributing
    // is the failure mode `NOT_SWEPT_HERE` exists for. The census below asserts the shape.
    console.log(`[visualsMath] sweep census: ${sweepCensus()}`);
    expect(REGISTERED_TEMPLATE_IDS.length).toBeGreaterThanOrEqual(TEMPLATE_FLOOR);
    for (const id of REGISTERED_TEMPLATE_IDS) {
      expect(swept.has(id), `${id} is never swept`).toBe(true);
    }
  });

  /**
   * The floor is only worth having if it sits above the sweep MINUS a registry, rather than
   * above nothing. A floor under the bare total passes just as happily when a whole domain
   * silently falls out of `SWEPT_TEMPLATES`, which is how D4 sat outside this sweep for
   * months, and the arithmetic that rules it out lives in a comment where nobody re-measures
   * it. So it is measured. D4 and D9 are named because both are large enough to hide a
   * disappearance behind another lane's growth, and a merge that keeps only one lane's number
   * re-opens the gap for the other. D3 joins them for the reason it was added at all: its
   * twenty-five figures sat outside every sweep in the tree, and a floor that merely cleared
   * the new total would let them fall back out the same silent way. D6 joins for the same
   * reason and more sharply: it is the largest registry in the sweep at fifty-five, so a floor
   * chosen to clear the new total would leave the widest hole of any domain here.
   *
   * INJECTED RED BY: dropping `...D6_PRACTICE_POOL`, `...D6_PRACTICE_ITEMS` and
   * `...D6_PRACTICE_TEMPLATES` from the three lists in `practiceSweep.ts` — the actual defect,
   * a registry quietly leaving. Fails at *"d6 contributes nothing to the sweep: 226 templates,
   * 226 instances (d1=34 d10=10 d2=27 d3=25 d4=25 d5=30 d8=30 d9=45): expected 0 to be greater
   * than 0"*, and the census in the message is the evidence that the sweep noticed the size of
   * the hole rather than merely tripping over a zero.
   */
  it("floors the sweep above D3's, D4's, D6's and D9's presence, not merely above nothing", () => {
    const counts = templatesPerDomain();
    const census = sweepCensus();
    for (const domain of ["d3", "d4", "d6", "d9"]) {
      const present = counts.get(domain) ?? 0;
      expect(
        present,
        `${domain} contributes nothing to the sweep: ${census}`,
      ).toBeGreaterThan(0);
      expect(
        REGISTERED_TEMPLATE_IDS.length - present,
        `${domain} could fall out of the sweep and still clear the floor: ${census}`,
      ).toBeLessThan(TEMPLATE_FLOOR);
    }
  });

  it("names every domain it leaves out, and leaves out no domain it names", () => {
    // Derived from the bank's own export surface, so an eighth domain shows up here the day
    // it is exported rather than the day someone remembers to widen a hand-written list.
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
   * Every assertion over `NOT_SWEPT_HERE` before this one was about membership, so the list
   * could go on excusing a domain whose excuse had stopped being true: `d6` is on it because
   * no `d6.` key exists in `WORKED_SOLUTION_VISUALS`, and registering one would have changed
   * nothing anywhere. `.cursor/rules/qa-verification.mdc` calls that an exception that becomes
   * permanent by neglect, and asks for a named list that fails BOTH ways. Both ways:
   *
   * - a listed domain that ACQUIRES a registered figure fails, so the entry cannot outlive
   *   its reason;
   * - a bank domain with NO registered figure that is not listed fails, so a domain cannot
   *   quietly sit outside the sweeps undeclared.
   *
   * Floored underneath, because both halves are absences: an empty bank agrees with any list
   * of exclusions, and "no figure" is trivially true of a domain with no templates, which
   * would make the exemption excuse nothing at all.
   *
   * FORCED FALSE BOTH WAYS, at this tree. Registering a `d6.` key reds the first assertion at
   * *"these declared gaps now have a registered figure"*; dropping the `d6` entry from
   * `NOT_SWEPT_HERE` reds the second at *"these bank domains have no registered figure and are
   * not declared as a gap"*. Both quoted in `docs/`.
   */
  it("excuses a domain only for as long as it has no registered figure", () => {
    const census = figureGapReport();
    const rows = figureGapCensus();
    const listed = NOT_SWEPT_HERE.map((entry) => entry.domain).sort();

    expect(
      rows.size,
      `the bank derivation found nothing: ${census}`,
    ).toBeGreaterThanOrEqual(REGISTRY_FLOOR);
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

    // An exemption resting on an empty registry excuses nothing, so each listed domain has to
    // be a real domain with real templates that genuinely have no figure between them.
    for (const domain of listed) {
      expect(
        rows.get(domain)?.templates ?? 0,
        `${domain} is excused over an empty registry: ${census}`,
      ).toBeGreaterThanOrEqual(20);
    }
  });

  it.each(LIVE_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const))(
    "%s",
    (_templateId, item) => {
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0);
      expect(bareMathIn(container)).toEqual([]);
      expect(gluedOperatorsIn(container)).toEqual([]);
      expect(identityRestatementsIn(container)).toEqual([]);

      // Every bracket is as tall as what it holds, read off what this instance actually
      // rendered — which is the population that catches LaTeX assembled by a helper
      // (`frac(n, d)`) rather than written out, and so is invisible to the source scan
      // below. Floored per item: a `data-latex` that stopped being emitted fails here
      // instead of reporting a clean sweep over nothing.
      const leaves = latexLeaves(container);
      expect(leaves.length, `${item.template_id} exposed no LaTeX to read`).toBeGreaterThan(
        0,
      );
      expect(
        leaves.flatMap((latex) =>
          ungrownDelimiters(latex).map((why) => `${item.template_id}: ${why}`),
        ),
      ).toEqual([]);

      // A caption's `$...$` has to survive remark-math. It is easy to break by writing a
      // literal `$` (a dollar amount) inside a math span, which closes the span early and
      // leaves the rest of the caption as prose.
      const caption = getWorkedSolutionVisual(item.template_id)?.caption(
        item.template_params,
      );
      // Captions render as prose, not through `SvgMath`, so they carry no `data-latex`
      // for the sweep above to find; check the authored string itself.
      expect(caption ? hasIdentityRestatement(caption) : false).toBe(false);
      expect(caption ? bareMathInCaption(caption) : []).toEqual([]);
      if (caption?.includes("$")) {
        const figcaption = container.querySelector("figcaption");
        expect(figcaption?.querySelectorAll(".katex").length ?? 0).toBeGreaterThan(0);
      }
    },
  );
});

/**
 * A coverage FLOOR for D1, mirroring the D2 one in `workedSolutionArithmetic.test.tsx`.
 *
 * The sweep above is not that floor, and it is worth being exact about why: it renders every
 * registered template and requires KaTeX in the output, which a template carrying NO figure
 * also satisfies. `WorkedSolution` falls back to the authored `worked_solution` steps, and
 * those are typeset through the same pipeline, so a missing figure produces a green row that
 * looks identical to a present one. Every D1 shape had a figure by convention alone, with
 * nothing failing the day the next one arrived without one.
 *
 * `getWorkedSolutionVisual` is checked first, then the render, because the two claims come
 * apart: a registry entry that throws or draws nothing would satisfy the first and fail the
 * second, and the step-list assertion is what says the figure REPLACED the fallback rather
 * than sitting beside it unrendered.
 */
describe("every D1 practice template reveals a figure, not a step list", () => {
  const byTemplate = new Map(
    D1_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D1 template", () => {
    // A floor under the population, so this cannot pass by sweeping an empty registry.
    expect(D1_PRACTICE_TEMPLATES.length).toBeGreaterThanOrEqual(34);
    for (const template of D1_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} reveals the authored steps, with no figure registered`,
      ).toBeDefined();
    }
  });

  it.each(D1_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D1 instance for ${id}`);
      }
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * The same floor for D8, and it is owed for the same reason the D1 one is.
 *
 * D8 is already in `LIVE_PRACTICE_ITEMS` and `REGISTERED_TEMPLATE_IDS` (`practiceSweep.ts`),
 * so its figures are swept for KaTeX; what that sweep cannot say is that there IS a figure.
 * It requires a `.katex` node in the output, and a template with no registered visual
 * satisfies that through the authored `worked_solution` fallback, which is typeset by the
 * same pipeline. So every D8 shape having a figure was a convention with nothing under it,
 * exactly as D1's was before its block above.
 *
 * The population is derived from `D8_PRACTICE_TEMPLATES` rather than written out, and
 * floored rather than pinned: a thirty-first template is swept the day it is registered, and
 * a registry that shrinks or resolves to nothing fails instead of reporting "every one of
 * none". The floor is a measurement (30 templates, six nodes at five each, at the SHA this
 * was written) and not a target.
 */
describe("every D8 practice template reveals a figure, not a step list", () => {
  const byTemplate = new Map(
    D8_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D8 template", () => {
    // A floor under the population, so this cannot pass by sweeping an empty registry.
    expect(
      D8_PRACTICE_TEMPLATES.length,
      "the D8 template registry is smaller than the six-node pack it is derived from",
    ).toBeGreaterThanOrEqual(30);
    for (const template of D8_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} reveals the authored steps, with no figure registered`,
      ).toBeDefined();
    }
  });

  it.each(D8_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D8 instance for ${id}`);
      }
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * The same floor for D3, owed for the reason the D1 and D8 ones are and for one more.
 *
 * D3 was a NAMED entry in `NOT_SWEPT_HERE` until this round: no sweep in the tree rendered one
 * of its twenty-five worked figures, which was measured rather than argued — a Unicode `×`
 * injected into `d3.lin1.two-step.l1` left 844 tests passing. Being inside the sweep above is
 * what fixes that; it is still not a floor, for the reason the D1 block gives at length. A D3
 * template whose registry entry went away would fall back to the authored step cards, which
 * typeset through the same pipeline and satisfy every KaTeX assertion in this file.
 *
 * Derived from `D3_PRACTICE_TEMPLATES` and floored rather than pinned, so a twenty-sixth shape
 * is swept the day it is registered and a registry that collapses fails instead of reporting
 * "every one of none". Twenty-five is the measurement at the tree this was written against:
 * five nodes (LIN.1, LIN.3, LIN.4, LIN.5, LIN.6) at five shapes each, LIN.2 being retired.
 */
describe("every D3 practice template reveals a figure, not a step list", () => {
  const byTemplate = new Map(
    D3_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D3 template", () => {
    // A floor under the population, so this cannot pass by sweeping an empty registry.
    expect(
      D3_PRACTICE_TEMPLATES.length,
      "the D3 template registry is smaller than the five-node pack it is derived from",
    ).toBeGreaterThanOrEqual(25);
    for (const template of D3_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} reveals the authored steps, with no figure registered`,
      ).toBeDefined();
    }
  });

  it.each(D3_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D3 instance for ${id}`);
      }
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * And the same floor for D6, the largest registry in the tree and the last domain to have had
 * no figures at all.
 *
 * Owed for the reason the D1, D3, D8 and D10 blocks are: being inside the sweep above buys the
 * KaTeX properties, and it does NOT buy the existence of a figure, because that sweep is
 * satisfied by the authored `worked_solution` fallback typeset through the same pipeline. Every
 * one of D6's fifty-five templates was in exactly that state until this round — `NOT_SWEPT_HERE`
 * named it as a known gap — so this file could report green over fifty-five step-card reveals
 * and did.
 *
 * Two things are asserted about the population and not only its size, because a floor
 * constrains size and not shape. Fifty-five is derived from `D6_PRACTICE_TEMPLATES` and floored,
 * so a fifty-sixth shape is required to have a figure the day it is registered. And the eleven
 * NODES are counted beside it, so a registry that collapsed to one node's five templates plus
 * fifty of something else could not clear the floor and pass: the claim is that the whole domain
 * has figures, not that fifty-five things somewhere do.
 *
 * INJECTED RED BY: renaming the `d6.fun2.output-range.l2` key in `worked/d6FUN2.tsx` to
 * `d6.fun2.output-range.l2.INJECTED`, which fails at *"d6.fun2.output-range.l2 reveals the
 * authored steps, with no figure registered: expected undefined to be defined"*, and fails the
 * template's own row at *"d6.fun2.output-range.l2: expected null not to be null"* — the reveal
 * having fallen back to the step list the row exists to forbid.
 *
 * INJECTED RED BY, for the composition and not the size: replacing `D6_PRACTICE_TEMPLATES` in
 * `packages/item-bank/src/d6/practice.ts` with `CG1_TEMPLATES` spread eleven times. That is
 * fifty-five templates, so the floor above passes; the node count fails at *"D6's templates no
 * longer span its eleven nodes, so a floor of 55 says nothing about coverage: expected 1 to be
 * greater than or equal to 11"*. Which is the whole argument for asserting shape beside size.
 *
 * That D6's figures are reached by the KaTeX properties at the top of this file, and not merely
 * counted here, is its own claim and was measured too. INJECTED RED BY: writing `${value} × 1`
 * into `D6BreakLine`'s axis `<text>` in `worked/d6Kit.tsx`, which fails
 * `d6.fun3.three-piece-eval.l2` at *"<text> \"-8 × 1\" has a times/divide sign"* and four more
 * on the same figure. Before this round that injection was unreachable from any sweep in the
 * tree, D6 having had no registered figure to render.
 */
describe("every D6 practice template reveals a figure, not a step list", () => {
  const byTemplate = new Map(
    D6_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D6 template", () => {
    expect(
      D6_PRACTICE_TEMPLATES.length,
      "the D6 template registry is smaller than the eleven-node pack it is derived from",
    ).toBeGreaterThanOrEqual(55);
    expect(
      new Set(D6_PRACTICE_TEMPLATES.map((template) => template.node_id)).size,
      "D6's templates no longer span its eleven nodes, so a floor of 55 says nothing about coverage",
    ).toBeGreaterThanOrEqual(11);
    for (const template of D6_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} reveals the authored steps, with no figure registered`,
      ).toBeDefined();
    }
  });

  it.each(D6_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D6 instance for ${id}`);
      }
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * And the same floor for D10, owed for exactly the reason the D1 and D8 ones are.
 *
 * D10 is already in `LIVE_PRACTICE_ITEMS` and `REGISTERED_TEMPLATE_IDS` (`practiceSweep.ts`),
 * so its figures go through the KaTeX sweep above; what that sweep cannot say is that there
 * IS a figure. It requires a `.katex` node, and a template with no registered visual satisfies
 * that through the authored `worked_solution` fallback, typeset by the same pipeline. So a
 * D10 shape arriving without a figure would have produced a green row indistinguishable from
 * a figured one, which is what "the KaTeX sweep passes on step-card fallback" means.
 *
 * The population is derived from `D10_PRACTICE_TEMPLATES` and floored rather than pinned:
 * an eleventh template is swept the day it is registered, and a registry that shrinks or
 * resolves to nothing fails instead of reporting "every one of none". The floor is a
 * measurement (10 templates, two nodes at five each) and not a target.
 */
describe("every D10 practice template reveals a figure, not a step list", () => {
  const byTemplate = new Map(
    D10_PRACTICE_ITEMS.map((item) => [item.template_id, item] as const),
  );

  it("registers a worked-solution visual for every D10 template", () => {
    // A floor under the population, so this cannot pass by sweeping an empty registry.
    expect(
      D10_PRACTICE_TEMPLATES.length,
      "the D10 template registry is smaller than the two-node pack it is derived from",
    ).toBeGreaterThanOrEqual(10);
    for (const template of D10_PRACTICE_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} reveals the authored steps, with no figure registered`,
      ).toBeDefined();
    }
  });

  it.each(D10_PRACTICE_TEMPLATES.map((template) => template.template_id))(
    "%s renders a figure and no step list",
    (id) => {
      const item = byTemplate.get(id);
      if (!item) {
        throw new Error(`no registered D10 instance for ${id}`);
      }
      const { container } = render(
        <WorkedSolution
          templateId={item.template_id}
          params={item.template_params}
          steps={item.worked_solution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), id).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), id).toBeNull();
      // The authored steps still exist as the fallback; they just are not the surface.
      expect(item.worked_solution.length, id).toBeGreaterThan(0);
    },
  );
});

/**
 * Property 6 again, read off the SOURCE rather than a render.
 *
 * Scoped by where the defect can be written, not by where a draw happens to go. A figure
 * chooses its LaTeX from its params, so the render sweep above only ever sees the branches
 * the frozen pool selects — and the `+ ?` that prompted this rule sat in the branch it does
 * not select, green on every run. Every string an author hands to KaTeX is in range here
 * whether or not any seed reaches it.
 *
 * Deliberately narrow about what counts as a math string: a `latex` prop or property, and a
 * `$...$` span in an authored pack. A whole-file scan cannot be used, because `-?` is the
 * commonest quantifier in the tree's own regular expressions and every one of them would
 * match this pattern.
 */
const LESSON_SOURCES = import.meta.glob(
  [
    "./*.tsx",
    "./*.ts",
    "./interactive/*.tsx",
    "./interactive/kinds/*.tsx",
    "./worked/*.tsx",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

/** Every `latex={...}` / `latex: ...` value in the lesson layer, with the file that holds it. */
function authoredLatex(): { where: string; latex: string }[] {
  return Object.entries(LESSON_SOURCES)
    .filter(([path]) => !path.includes(".test."))
    .flatMap(([path, source]) =>
      [...source.matchAll(/\blatex\s*[=:]\s*\{?\s*([`"'])([\s\S]*?)\1/g)].map((match) => ({
        where: path,
        latex: match[2] ?? "",
      })),
    );
}

/** Every `$...$` span in the authored packs, with the pack that holds it. */
function authoredSpans(): { where: string; latex: string }[] {
  return allLessons.flatMap((lesson) =>
    [...JSON.stringify(lesson).matchAll(/\$([^$]+)\$/g)].map((match) => ({
      where: lesson.node_id,
      latex: match[1] ?? "",
    })),
  );
}

/**
 * The third surface, and the one the rule was written without: the ITEM BANK's own prompts,
 * hints and worked-solution steps.
 *
 * #341's log named this as an open gap rather than implying it — "the item bank's own prompts
 * are **not** in that sweep" — and it is the same population argument as the two extractors
 * above, one package further out. A practice prompt is an authored `$...$` string handed to
 * the same KaTeX, and it is written in a template literal whose branches a frozen pool selects
 * from exactly as sparsely as it selects a figure's. Sweeping the GENERATED items would
 * therefore have re-made the mistake this rule exists because of; the source is every branch,
 * whether or not a seed reaches it.
 *
 * `.test.` files are excluded here for the reason the lesson-layer extractor excludes them:
 * `-?` is the commonest quantifier in the tree's own regular expressions, and the item bank's
 * prompt-derivation tests are full of them (`/^-?\d+$/`). Nothing outside a test file in that
 * package carries the shape at all, which is what makes the exclusion cheap rather than a
 * hole — and the injection recorded against this block goes in a real generator, not a test.
 */
const ITEM_BANK_SOURCES = import.meta.glob("../../../../packages/item-bank/src/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * A source with its `${...}` interpolations flattened to a single digit.
 *
 * Without this the span extractor cannot run over TypeScript at all: an item bank prompt is a
 * template literal, and the `$` that opens `${r}` is indistinguishable from the `$` that opens
 * a math span, so `$${r * r}\\pi \\times ${h}$` would be read as a span holding `{r * r}`.
 * Flattening first makes it the span it renders as, `1\\pi \\times 1`. Iterated because an
 * interpolation can hold braces of its own (`\\sqrt{${b}}`), innermost first.
 */
function withoutInterpolation(source: string): string {
  let flattened = source;
  for (let pass = 0; pass < 8; pass += 1) {
    const next = flattened.replace(/\$\{[^{}]*\}/g, "1");
    if (next === flattened) {
      return next;
    }
    flattened = next;
  }
  return flattened;
}

/** Every `$...$` span in the item bank's own authored strings, with the file that holds it. */
function bankSpans(): { where: string; latex: string }[] {
  return Object.entries(ITEM_BANK_SOURCES)
    .filter(([path]) => !path.includes(".test."))
    .flatMap(([path, source]) =>
      [...withoutInterpolation(source).matchAll(/\$([^$\n]+)\$/g)].map((match) => ({
        where: path,
        latex: match[1] ?? "",
      })),
    );
}

/** Read once, so the count can be named in the test title and measured on every run. */
const BANK_SPANS = bankSpans();

describe("no authored math string writes a bare ? where an operator needs an operand", () => {
  const BARE = NOT_LATEX[NOT_LATEX.length - 1];

  it("the extractors found the math they are supposed to be reading", () => {
    // Floors, so an extractor whose pattern stops matching fails here rather than reporting
    // a clean sweep over nothing. Containment over an empty set is true of everything.
    expect(Object.keys(LESSON_SOURCES).length).toBeGreaterThanOrEqual(90);
    expect(authoredLatex().length).toBeGreaterThanOrEqual(600);
    expect(authoredSpans().length).toBeGreaterThanOrEqual(600);

    // And that it reaches the branch the render sweep misses: this figure's triangle arm is
    // chosen by a param no pooled instance sets, which is how the defect hid.
    expect(
      authoredLatex().filter(({ where }) => where.includes("d10GEO1")).length,
    ).toBeGreaterThanOrEqual(8);
  });

  /**
   * The floor under the third extractor, kept separate because it is a separate claim about a
   * separate package, and because it is the one whose reach cannot be assumed: it globs across
   * a workspace boundary, and a glob that resolves to nothing is a clean green over an empty
   * set. The per-domain floor is what says the sweep reached the GENERATORS rather than only
   * the package's shared helpers, and `d10` is named because it is the domain this round is
   * about.
   */
  it(`reads ${BANK_SPANS.length} item-bank spans out of ${Object.keys(ITEM_BANK_SOURCES).length} sources`, () => {
    expect(
      Object.keys(ITEM_BANK_SOURCES).length,
      "the item-bank glob resolved to nothing, so the sweep below reads no prompt at all",
    ).toBeGreaterThanOrEqual(60);
    expect(BANK_SPANS.length).toBeGreaterThanOrEqual(1500);
    for (const domain of ["d1", "d2", "d3", "d4", "d5", "d7", "d8", "d10"]) {
      expect(
        BANK_SPANS.filter(({ where }) => where.includes(`/${domain}/`)).length,
        `no ${domain} prompt reached the sweep`,
      ).toBeGreaterThanOrEqual(20);
    }
  });

  it.each([
    ["a lesson-layer latex prop", authoredLatex],
    ["an authored pack's $...$ span", authoredSpans],
    ["an item-bank prompt, hint or worked-solution step", () => BANK_SPANS],
  ])("%s", (_what, read) => {
    expect(
      read()
        .filter(({ latex }) => BARE?.pattern.test(latex))
        .map(({ where, latex }) => `${where}: ${latex}`),
    ).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* The bracket rule again, read off the source                                 */
/* -------------------------------------------------------------------------- */

/**
 * The same reason the `?` rule is checked twice, applied to the bracket rule.
 *
 * A figure picks its LaTeX from its params, and the render sweep above draws one instance per
 * template, so a shape written for a branch no frozen draw selects is never typeset there at
 * all. That is not hypothetical in this tree: `d10.geo1.angle-third.l2`'s triangle arm carried
 * the `+ ?` defect green through the render sweep for exactly this reason.
 *
 * The population is not `authoredLatex()`, and the difference matters. That extractor reads
 * `latex` props, and a worked figure's rows are `EqToken`s whose LaTeX lives under `text:` —
 * so a reduction row's own string is invisible to it, and a reduction row is where most of
 * this domain's fractions are. What is read here instead is every STRING LITERAL in the
 * worked-figure modules that mentions a fraction or a radical, which needs no list of prop
 * names to stay complete.
 */
const WORKED_SOURCES = Object.entries(LESSON_SOURCES).filter(
  ([path]) => path.startsWith("./worked/") && !path.includes(".test."),
);

/** A quoted or backticked literal, with the usual backslash escapes inside it. */
const STRING_LITERAL =
  /`(?:[^`\\]|\\[\s\S])*`|"(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'/g;

/**
 * Source with its comments removed.
 *
 * These modules explain their LaTeX in prose, and prose quotes LaTeX: this very file's
 * neighbours carry `\dfrac` inside backticks in a comment. Left in, those would enter the
 * population as strings nobody renders, which is the sort of padding that lets a floor be
 * met by something other than what it is counting.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

/**
 * A literal as KaTeX would receive it: interpolations collapsed to a digit, and the source's
 * doubled backslashes reduced to the single ones the string actually holds.
 *
 * The interpolations have to go before the parens are counted, because they contain parens of
 * their own — `(${numStr(half)})` is one authored pair around a CALL that has another.
 */
function asLatex(literal: string): string {
  let body = literal.slice(1, -1);
  for (let pass = 0; pass < 5; pass += 1) {
    const next = body.replace(/\$\{[^{}]*\}/g, "1");
    if (next === body) {
      break;
    }
    body = next;
  }
  return body.replace(/\\\\/g, "\\");
}

/** Every authored string in the worked-figure modules that carries a fraction or a radical. */
function workedMathStrings(): { where: string; latex: string }[] {
  return WORKED_SOURCES.flatMap(([path, source]) =>
    (withoutComments(source).match(STRING_LITERAL) ?? [])
      .map((literal) => ({ where: path, latex: asLatex(literal) }))
      // The population is exactly the strings that COULD violate the rule, so the floor
      // below counts what the rule is about rather than every fraction in the tree.
      .filter(({ latex }) => TALL_MATH.test(latex)),
  );
}

describe("a worked figure's brackets are as tall as what they hold", () => {
  it("the extractor found the math it is supposed to be reading", () => {
    // Three floors, because the derivation has three ways to collapse quietly: the glob can
    // stop matching the modules, the literal scan can stop matching the strings, and the
    // fraction filter can stop matching the maths. Each is asserted on its own, so a failure
    // says which one moved. Every number here is a MEASUREMENT at the tree it was written
    // against — 30 modules, 31 strings, 8 modules holding them — set below the reading with
    // room for ordinary churn rather than picked to look demanding.
    expect(
      WORKED_SOURCES.length,
      "no worked-figure module was read",
    ).toBeGreaterThanOrEqual(24);
    expect(
      workedMathStrings().length,
      "no authored string with a fraction or a radical in it",
    ).toBeGreaterThanOrEqual(24);
    expect(
      new Set(workedMathStrings().map(({ where }) => where)).size,
      "the fractions all came from one module, so the scan is reading one file",
    ).toBeGreaterThanOrEqual(6);

    // A floor constrains SIZE, not SHAPE: thirty strings from anywhere satisfy the count
    // above while the module this rule was written for sits outside the scan. So the
    // reported figure's own module is named, and its own row is the one asserted.
    expect(
      workedMathStrings().filter(({ where }) => where.endsWith("/d4POL4.tsx")).length,
      "the completing-the-square module is no longer in the population this rule is for",
    ).toBeGreaterThanOrEqual(2);

    // And that the checker itself still reports: a rule that stopped matching would agree
    // with every string in the tree and say nothing about any of them.
    expect(ungrownDelimiters("(\\dfrac{14}{2})^{2}")).toHaveLength(1);

    // THE TWO SIZES THAT ARE GROWN BUT NOT GROWN ENOUGH, which is what this rule is for and
    // what the version before it got wrong. `\bigl(\dfrac{14}{2}\bigr)^{2}` is the string
    // `d4.pol4.complete.l1` shipped and this file used to bless outright; `\Bigl` was tried
    // in the same round. Measured (see `GROWN_OPEN`), they are 0.60x and 0.85x the fraction
    // they hold, which is the bracket a learner reported as too short, twice.
    expect(ungrownDelimiters("\\bigl(\\dfrac{14}{2}\\bigr)^{2}")).toHaveLength(1);
    expect(ungrownDelimiters("\\Bigl(\\dfrac{14}{2}\\Bigr)^{2}")).toHaveLength(1);

    // And the sizes that do clear it, so this has not simply become "reject everything".
    expect(ungrownDelimiters("\\left(\\dfrac{14}{2}\\right)^{2}")).toEqual([]);
    expect(ungrownDelimiters("\\biggl(\\dfrac{14}{2}\\biggr)^{2}")).toEqual([]);
    expect(ungrownDelimiters("\\Biggl(\\dfrac{14}{2}\\Biggr)^{2}")).toEqual([]);

    // The pair that does not enclose the fraction is not the subject.
    expect(ungrownDelimiters("(x + 1)\\dfrac{1}{2}")).toEqual([]);
    // A text-style fraction is one line tall and needs no grown bracket.
    expect(ungrownDelimiters("(\\tfrac{1}{2})")).toEqual([]);

    // THE SET BRACE, which this rule tracked no better than it tracked `\bigl`. Only `(` and
    // `)` were counted, so `\{\dfrac{42}{13}\}` — the solution-set row every RAT.6 figure
    // closes on, at 0.48x the fraction it holds — was invisible here and shipped. Found by
    // widening the SPATIAL sweep to the behaviour rather than to the reported template, and
    // pinned at this level too so the string alone is enough to report it.
    expect(ungrownDelimiters("\\{\\dfrac{42}{13}\\}")).toHaveLength(1);
    expect(ungrownDelimiters("\\left\\{\\dfrac{42}{13}\\right\\}")).toEqual([]);
    // A solution set of plain numbers holds nothing tall and owes nothing.
    expect(ungrownDelimiters("\\{x \\mid x > 3\\}")).toEqual([]);
    // The two pairs are tracked separately, so one does not close the other.
    expect(ungrownDelimiters("\\left\\{(\\dfrac{1}{2})\\right\\}")).toHaveLength(1);
  });

  it("no authored worked-figure string wraps tall math in a bare pair", () => {
    expect(
      workedMathStrings().flatMap(({ where, latex }) =>
        ungrownDelimiters(latex).map((why) => `${where}: ${why} in "${latex}"`),
      ),
    ).toEqual([]);
  });
});

/**
 * The same two claims over the CHECK-only templates, which no population above reaches.
 *
 * Every sweep in this file and in `workedSolutionArithmetic.test.tsx` derives its population
 * from the item bank's practice exports, and a lesson check's re-ask template is in none of
 * them: it lives in `cfuVariants.ts` because the pool does not hold its question. So the
 * twenty-one `cfu.*` figures were outside every KaTeX guard in the tree -- a Unicode `×` or a
 * glued operator in one of them would have rendered, looked almost right, and failed nothing.
 *
 * Drawn rather than pooled, and drawn MANY times per template, which is the difference from
 * the blocks above. A practice item arrives frozen, so one render covers what a learner sees;
 * a check's figure is re-rendered against fresh parameters on every re-ask, and a row can be
 * clean on one draw and restate itself on the next (`reduceTail` prints its tail only when
 * reducing changes something, and a draw that arrives reduced is exactly the case that used
 * to produce "3/5 = 3/5"). Twelve seeds per template is enough to cross the sign and
 * magnitude branches these generators pick between.
 */
describe("every check-only template reveals a figure that typesets", () => {
  const DRAWS_PER_TEMPLATE = 12;

  const drawn = CFU_ONLY_TEMPLATE_LIST.flatMap((template) =>
    Array.from({ length: DRAWS_PER_TEMPLATE }, (_unused, seed) => {
      const item = template.generate(createRng(seed * 7919 + 13));
      return {
        id: template.template_id,
        seed,
        params: item.params,
        steps: item.worked_solution ?? [],
      };
    }),
  );

  it("registers a worked-solution visual for every check-only template", () => {
    // A floor under the population, so this cannot pass by sweeping an empty list. Twenty-one
    // when written: one per pack whose check the practice pools do not serve.
    expect(CFU_ONLY_TEMPLATE_LIST.length).toBeGreaterThanOrEqual(21);
    for (const template of CFU_ONLY_TEMPLATE_LIST) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} reveals the authored steps, with no figure registered`,
      ).toBeDefined();
    }
  });

  it.each(drawn.map((draw) => [`${draw.id} @ seed ${draw.seed}`, draw] as const))(
    "%s",
    (_label, draw) => {
      const { container } = render(
        <WorkedSolution templateId={draw.id} params={draw.params} steps={draw.steps} />,
      );
      // The figure replaced the cards rather than sitting beside them unrendered, which is
      // what makes the KaTeX assertions below claims about the FIGURE: the steps typeset
      // through the same pipeline, so a registry miss is green on every one of them.
      expect(container.querySelector("figure.lesson-visual")).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps")).toBeNull();
      expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0);
      expect(bareMathIn(container)).toEqual([]);
      expect(gluedOperatorsIn(container)).toEqual([]);
      expect(identityRestatementsIn(container)).toEqual([]);

      const caption = getWorkedSolutionVisual(draw.id)?.caption(draw.params);
      expect(caption ? hasIdentityRestatement(caption) : false).toBe(false);
      expect(caption ? bareMathInCaption(caption) : []).toEqual([]);
      if (caption?.includes("$")) {
        const figcaption = container.querySelector("figcaption");
        expect(figcaption?.querySelectorAll(".katex").length ?? 0).toBeGreaterThan(0);
      }
    },
  );
});
