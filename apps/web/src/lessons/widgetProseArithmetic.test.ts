/**
 * No learner-visible prose STATES ARITHMETIC in bare digits beside the KaTeX it is about.
 *
 * Six boards conceded a learner's working in plain text — "45 times 3 really is 135" — a
 * sentence away from the same product typeset by `InlineMath`. `visualsMath.test.tsx`'s
 * property 7 cannot see any of them: it fires on prose holding a bare digit BESIDE a typeset
 * number IN THE SAME ELEMENT, and these sentences typeset nothing at all, so there is no
 * sibling to compare against and nothing for it to catch.
 *
 * ## Why this reads SOURCE, and why turning it into a render sweep would measure nothing
 *
 * Do not "improve" this into a rendering sweep. That was measured before this file was
 * written, not assumed. Rendering all 253 live visuals at first paint and applying the
 * detector below to their text content, with every KaTeX subtree removed, reports **0
 * strict and 4 loose, and all four loose hits are accessible names** (`<title>` text) rather
 * than visible prose. It sees none of the six, because every one of them is behind a WRONG
 * interaction: five are `SpotTheError`'s `fine`, whose own doc comment reads "said only when
 * the learner taps it by mistake", and the sixth is a `setFeedback` after a wrong entry. A
 * render-based version of this guard would be green over the entire population on the day
 * the defect shipped, which is the most expensive kind of green there is.
 *
 * ## The detector, written out, because the definition drives the number
 *
 * A run of source becomes candidate PROSE when all of these hold. The test is POSITIVE — it
 * asks whether a run reads as English — and that is a correction: the first version denied a
 * list of keys (`latex`, `spoken`, `aria`) and let **34 LaTeX constants** into the count,
 * because a constant named `SUM_LATEX` or `workedLatex` or `lastLineWorking` carries LaTeX
 * under a name no denylist had heard of. A denylist has to predict every name a math string
 * can be given; the positive test only has to recognise a sentence.
 *
 *  1. it holds four or more words of three letters or more (a sentence, not a formula);
 *  2. it holds no backslash, which means LaTeX, which is the typeset path and not the subject;
 *  3. it is a string literal not introduced by a `spoken*` / `*Spoken` / `aria*` / `latex` /
 *     `*Tex` / `text` / `title` name within 40 characters and with no quote in between (the
 *     no-quote rule is what stops a `fine:` being blamed for the `spoken:` string above it),
 *     or it is JSX text following a real tag;
 *  4. it holds an even number of `$`, so a fragment of a KaTeX-carrying caption, whose math
 *     cannot be paired off, is not judged on its torn half. `$...$` spans are then removed,
 *     since a caption's `$1 + 1 = 2$` is typeset already.
 *
 * Interpolations are flattened first, because a widget's numbers come from board data:
 * `${fee} times ${at}` holds no literal digit and an unflattened scan reports zero. An
 * interpolation containing a QUOTE is flattened to a word rather than a digit — it splices
 * prose, not a number — and that distinction is load-bearing: without it `worked/d7LF1.tsx`'s
 * caption reads as "1 over 1" when the real sentence is "... miles over ... hours" with both
 * numbers already inside `$...$`.
 *
 * The RULE over that prose: no two numbers joined by an operator, either a symbol
 * (`+ − × ÷ *`, and `-` `/` `x` only with spaces on both sides, since a hyphen is usually a
 * range and `45x` is algebra) or a word (`times, plus, minus, over, ...`). The measurement
 * that scoped this work also counted a STRICTER shape, the same thing with a result claimed
 * for it ("really is 135"), which found 4 of the 6. The guard enforces the wider rule,
 * because all six were fixed and the narrow one would let the other two back.
 *
 * ## Known BLIND SPOTS. These are limits of the guard, not exceptions to it
 *
 * Named here because a limit nobody wrote down gets rediscovered as a bug:
 *
 *  - **Word operators.** "3 cubed is 27" and "Twice 6 really is 12" are the same defect with
 *    the operator spelled out, and no digit-pair pattern can see them. Four such strings in
 *    three widgets were found by extending the detector and were fixed with the six; the
 *    extension is deliberately NOT kept. Measured reason: after interpolation flattening a
 *    variable is indistinguishable from a literal, so "x squared" — ubiquitous and entirely
 *    correct — matches the same pattern as "3 cubed". The extension's own run reported 6
 *    word-operator hits of which 3 were exactly that noise (`worked/d1NUM4.tsx`'s "two x
 *    squared terms", `worked/cfuD1D2.tsx`'s aria label), so keeping it would mean an
 *    exception list that grows with the tree's algebra.
 *  - **Spelled-out numerals.** "the tangent really is eight fifteenths" carries no digit.
 *    One such string was found and fixed. The same run flagged 4 more in
 *    `TrigAsymptoteTable.tsx` that are the `spoken` POSITIONAL ARGUMENT of a helper, which
 *    no name-based rule can recognise, so this shape cannot be swept without excusing them.
 *  - **Sentences assembled across JSX element boundaries.** Prose split by a `<strong>` or an
 *    `<InlineMath/>` is read as separate runs, so an operator on one side of the boundary and
 *    its operands on the other are not joined up.
 *  - **Scope.** Lesson SOURCES only. Learner prose in `content/lessons/**` packs and in the
 *    item bank is not read here; the pack validator and `visualsMath.test.tsx` own those.
 *
 * ## Why there is no exception list
 *
 * There is none because the detector needs none: over 374 sources it reports the six real
 * defects and nothing else. Two shapes that looked like exceptions are handled by the
 * definition instead, which is the better place for a category — an SVG `<title>` is the
 * accessible name, and a string returned from a `function spoken(...)` is a screen-reader
 * string, and both are excluded by rule 3 rather than by name. If a genuine exception ever
 * is needed, the qa rule wants it named and asserted in both directions.
 *
 * Verified by injection rather than argued: restoring the bare sentence to
 * `LinearModelClaimSpot.tsx` fails this sweep naming that file.
 *
 * ## What the first merge taught it, and why an exception would have been the wrong answer
 *
 * Carried across 309 commits of integration, this guard reported one file it should not have:
 * `FactorPairStepper.tsx`, whose slider describes itself to a screen reader in an
 * `aria-valuetext` holding a ternary. The FIRST branch was excused and the SECOND reported,
 * which is the tell that the finding was about the detector rather than the widget — no
 * property of that file distinguishes its two branches. Three separate faults in `leadOf` and
 * `NOT_VISIBLE` had to be fixed for the rule to mean what it says, all documented there: a
 * branch read as a new binding, a window measured before whitespace collapsed, and a name that
 * went on binding after its tag had closed. The last of those was found only because fixing the
 * first two was measured rather than assumed: it excused 11 genuinely visible sentences, and
 * they were read one at a time before the number was believed.
 *
 * Excusing the file by name would have been one line and would have left all three in place,
 * with the eleven still to come the next time the window happened to reach.
 */

import { describe, expect, it } from "vitest";

import { stripComments } from "./lessonSourceScan";

const SOURCES = import.meta.glob(["./**/*.ts", "./**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Lesson sources, minus the tests, whose fixtures are not learner copy. */
const LESSON_SOURCES = Object.entries(SOURCES).filter(([path]) => !path.includes(".test."));

/** The layer the six defects were found in, kept only so the widening can be asserted. */
const isWidgetLayer = (path: string) => path.startsWith("./interactive/");

/* -------------------------------------------------------------------------- */
/* Reading a source the way a learner reads the screen                        */
/* -------------------------------------------------------------------------- */

/** An interpolation that splices PROSE rather than a number must not become a digit. */
const filler = (body: string) => (/["'`]/.test(body) ? " thing " : " 1 ");

/**
 * Interpolations and JSX value containers collapsed, so a sentence assembled from board data
 * reads the way it will on screen. `${...}` first and innermost-first; then a container
 * holding only a quoted string or a template gives up its contents, so `{" "}` stays a
 * space; then a container holding only a simple value expression becomes a digit. Anything
 * holding a callback, a conditional or nested JSX is left alone.
 */
function asRendered(source: string): string {
  let out = source;
  for (let pass = 0; pass < 12; pass += 1) {
    const next = out.replace(/\$\{([^{}]*)\}/g, (_, body: string) => filler(body));
    if (next === out) break;
    out = next;
  }
  out = out
    .replace(/\{\s*`([^`]*)`\s*\}/g, "$1")
    .replace(/\{\s*"([^"]*)"\s*\}/g, "$1")
    .replace(/\{\s*'([^']*)'\s*\}/g, "$1");
  for (let pass = 0; pass < 6; pass += 1) {
    const next = out.replace(
      /\{\s*[A-Za-z0-9_.]+(?:\s*[*+\-/]\s*[A-Za-z0-9_.]+)*\s*\}/g,
      " 1 ",
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * Text that genuinely follows a TAG, rather than any text after any `>`.
 *
 * Anchoring on the tag is what keeps object literals out. A looser version captured
 * everything between a `</>` and the next `<`, which is code, and read its `latex:` and
 * `spoken:` values as sentences — 13 false hits. The captured text may hold no quote, brace
 * or semicolon, so an object literal cannot be mistaken for prose. An SVG `<title>` is the
 * accessible name rather than visible prose, so it is skipped by tag name.
 */
const JSX_TEXT = /(?:<>|<([A-Za-z][A-Za-z0-9.]*)[^<>]*>|<\/[^<>]*>)([^<>{}`"';]+)/g;

/** A string already consumed, so a lead reads the CODE around it rather than its words. */
const LITERAL = "\u0001";

/**
 * The name that introduces a string: within 40 characters, with no other string in between,
 * and with the binding it opens not yet closed.
 *
 * The no-string rule is what makes this safe to apply so widely: in `spoken: \`...\`, fine:
 * \`...\`` the first string stands between `spoken` and `fine`, so `fine` is judged on its own.
 * It also catches `function spoken(chip: Chip): string { return \`` without needing a rule
 * about function declarations.
 *
 * `>` IS A BOUNDARY, and it has to be, because `asRendered` takes the quotes off a value
 * container: `latex={\`\${x}\`}` renders as `latex= 1 `, holding no string for the rule above to
 * stop at. Eleven visible sentences were excused by an `InlineMath` that had already CLOSED
 * when they were measured — `feedback ?? "Type each product, then press Check."` sitting four
 * characters past a `/>` — and every one of them is exactly the kind of sentence this file
 * exists to read. A tag that has closed is not binding anything.
 */
const NOT_VISIBLE = new RegExp(
  `\\b(?:spoken[A-Za-z]*|[a-z]+Spoken|aria[A-Za-z-]*|latex|[a-z]+Tex|tex|text|title)\\b[^\`"'\n>${LITERAL}]{0,40}$`,
);

/** A string that is a TERNARY BRANCH of the string before it, rather than a new binding. */
const SIBLING_BRANCH = new RegExp(`${LITERAL}\\s*[?:]\\s*$`);

/**
 * The code before a string, with every string already read reduced to `LITERAL`, and any
 * branch the string shares a binding with dropped.
 *
 * Both steps are one defect, found when this guard met `FactorPairStepper.tsx` across a merge.
 * Its `aria-valuetext` holds a ternary, and the FIRST branch was excused by the rule above
 * while the SECOND was reported as visible prose: with the lead taken as raw source, a window
 * measured in characters is spent on branch one's ninety-odd words, so it reaches neither the
 * attribute name nor anything else that would explain the string. Measuring the window in code
 * instead makes both branches see the attribute, and reducing the string between them to a
 * marker is what keeps `spoken: \`...\`, fine: \`...\`` intact, since that marker still blocks
 * the match. `?`/`:` and no comma is the whole difference between the two shapes: a ternary
 * branch is another spelling of one binding, and a second property is a different one.
 */
function leadOf(code: string): string {
  // COLLAPSED FIRST, then measured, which is the other half of the same defect. The window is
  // not the rule — `NOT_VISIBLE` already requires the name within 40 characters of the string
  // — so the window only has to be wide enough that the 40 is what decides. Taken off raw
  // source it was not: `aria-valuetext={` opens a ternary indented fourteen spaces a line, so
  // roughly half of a 70-character window is whitespace and it stops halfway through the
  // attribute's own name. A name cut in half matches nothing, which is why the second branch
  // of that slider read as visible prose while the first was correctly excused.
  let lead = code.slice(-400).replace(/\s+/g, " ").slice(-70);
  for (let pass = 0; pass < 4; pass += 1) {
    const next = lead.replace(SIBLING_BRANCH, "");
    if (next === lead) break;
    lead = next;
  }
  return lead;
}

/** Code that reads as English by accident: an attribute, a declaration, an arrow. */
const CODE_SHAPE = /^\s*(?:[A-Za-z-]+\s*=|\/)|=>|\?\?|===|\bconst\b|\bfunction\b/;

/** A sentence: four or more words of three letters or more. */
const wordy = (text: string) => (text.match(/\b[A-Za-z]{3,}\b/g) ?? []).length >= 4;

/** Every learner-visible sentence a source renders, string literals and JSX text alike. */
export function visibleProse(source: string): string[] {
  const rendered = asRendered(stripComments(source));
  const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;
  const runs: { text: string; lead: string }[] = [];
  let code = "";
  let i = 0;
  while (i < rendered.length) {
    const ch = rendered[i] as string;
    const opens =
      ch === "`" ||
      ((ch === '"' || ch === "'") && !IDENTIFIER_CHAR.test(rendered[i - 1] ?? " "));
    if (opens) {
      const lead = leadOf(code);
      let text = "";
      i += 1;
      while (i < rendered.length && rendered[i] !== ch) {
        text += rendered[i];
        i += 1;
      }
      i += 1;
      code += LITERAL;
      runs.push({ text, lead });
      continue;
    }
    code += ch;
    i += 1;
  }
  for (const match of rendered.matchAll(JSX_TEXT)) {
    if ((match[1] ?? "").toLowerCase() === "title") continue;
    runs.push({ text: match[2] ?? "", lead: "" });
  }
  const said: string[] = [];
  for (const run of runs) {
    if (!wordy(run.text) || run.text.includes("\\")) continue;
    if (CODE_SHAPE.test(run.text)) continue;
    if (run.lead !== "" && NOT_VISIBLE.test(run.lead)) continue;
    if (((run.text.match(/\$/g) ?? []).length & 1) === 1) continue;
    said.push(
      run.text
        .replace(/\$[^$]*\$/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  return said;
}

/* -------------------------------------------------------------------------- */
/* The rule                                                                    */
/* -------------------------------------------------------------------------- */

/** The second operand may carry a bracket or a sign, so `3 + (-5)` is not missed. */
const SECOND = "\\(?-?\\s*\\d";
const OP_SYMBOL = new RegExp(
  `\\d\\s*[+\u2212\u00d7\u00f7*]\\s*${SECOND}|\\d\\s+[-/x]\\s+${SECOND}`,
);
const OP_WORD = new RegExp(
  `\\d\\s+(?:times|plus|minus|multiplied by|divided by|over|added to|take away|less)\\s+${SECOND}`,
  "i",
);

/** Every sentence in one source that states arithmetic in bare digits. */
function arithmeticInProse(source: string): string[] {
  const hits: string[] = [];
  for (const said of visibleProse(source)) {
    for (const pattern of [OP_SYMBOL, OP_WORD]) {
      const match = said.match(pattern);
      if (match) hits.push(`"${match[0].trim()}" in: ${said}`);
    }
  }
  return hits;
}

/**
 * Genuine members of the population that do not owe the property. Empty, and the sweep is
 * green with it empty, so nothing here is being excused by neglect. The two shapes that
 * might have gone here are excluded by the detector's definition instead — see the header.
 */
const DECLARED_EXCEPTIONS: readonly { path: string; why: string }[] = [];

describe("no lesson source states arithmetic in bare prose", () => {
  it("the sweep found the lesson sources", () => {
    // The floor. A glob that stops resolving hands back an empty list, and a loop over an
    // empty list passes. 374 non-test lesson sources when this was written.
    expect(
      LESSON_SOURCES.length,
      "the source sweep found fewer lesson files than the tree is known to hold",
    ).toBeGreaterThanOrEqual(340);
  });

  it("the population is wider than the layer the defect was found in", () => {
    // A floor bounds size, not shape: 340 files is satisfied by the interactive widgets plus
    // anything. All six defects were under `interactive/`, and scoping the sweep there would
    // have been scoping it by where the defect happened to be rather than by which surfaces
    // can exhibit it. Worked-solution captions write learner prose from source too, and two
    // of them came within one detector rule of being reported.
    const beyondWidgetLayer = LESSON_SOURCES.filter(([path]) => !isWidgetLayer(path));
    expect(
      beyondWidgetLayer.length,
      "the sweep has narrowed onto the interactive-widget layer the six defects happened to sit in",
    ).toBeGreaterThanOrEqual(80);

    const workedSolutions = LESSON_SOURCES.filter(([path]) => path.startsWith("./worked/"));
    expect(
      workedSolutions.length,
      "worked-solution figures write learner prose from source and must stay in the population",
    ).toBeGreaterThanOrEqual(28);
  });

  it("the detector reports the shape it is written for, and not everything", () => {
    // The self-check. A neutered detector — one that returns nothing, or whose prose
    // extraction has stopped finding sentences — passes the sweep below over every file in
    // the tree, so the sweep alone cannot tell working from broken.
    // Written as escaped templates so the fixtures hold a literal `${...}`, which is the
    // shape the detector has to flatten and is what a board's own source looks like.
    const bareLiteral = `const b = { fine: \`The arithmetic is right: \${fee} times \${at} really is \${fee * at}.\` };`;
    expect(
      arithmeticInProse(bareLiteral),
      "the detector no longer sees arithmetic stated in a bare template literal",
    ).toHaveLength(1);

    const bareSymbol =
      'const c = { note: "Taken alone that line is fine, 7 + (-2) really is 5." };';
    expect(
      arithmeticInProse(bareSymbol),
      "the detector no longer sees a bracketed negative operand",
    ).toHaveLength(1);

    const bareJsx =
      "<p>Multiply straight across: {n} times {d} on the top of the fraction.</p>";
    expect(
      arithmeticInProse(bareJsx),
      "the detector no longer reads JSX text, where half of this prose lives",
    ).toHaveLength(1);

    // ...and the other direction, or a detector that fired on everything would also pass.
    const typeset = `const d = { fine: <>The arithmetic is right: <InlineMath latex={\`\${fee} \\\\times \${at} = \${p}\`} />.</> };`;
    expect(
      arithmeticInProse(typeset),
      "the detector fires on arithmetic that IS typeset, so the fix it asks for would not satisfy it",
    ).toEqual([]);

    const spoken = `const e = { spoken: \`\${fee} times \${at} equals \${p}\`, wrong: true };`;
    expect(
      arithmeticInProse(spoken),
      "the detector reads a screen-reader string as visible prose",
    ).toEqual([]);

    // EVERY branch of a screen-reader string, not the first one. The real shape, from
    // `FactorPairStepper.tsx`: an `aria-valuetext` whose two branches are longer than the
    // window, so the second is judged with only the first in view.
    // INDENTED, because the indentation is half the defect: written flat this fixture passes
    // against the broken lead as well as the fixed one, and asserts nothing.
    const ariaBranches = [
      "        <input",
      '          type="range"',
      "          min={0}",
      "          max={pairs.length - 1}",
      "          step={1}",
      "          value={shownIndex}",
      "          disabled={settled}",
      "          aria-valuetext={",
      "            fill.given",
      "              ? `${low} times ${high}, which adds to ${sum}, the pair the answer was given as rather than answered`",
      "              : `${low} times ${high}, which adds to ${sum}, against a target of ${middle}`",
      "          }",
      "        />",
    ].join("\n");
    expect(
      arithmeticInProse(ariaBranches),
      "the second branch of an aria string is read as visible prose, so an accessible name would be asked to typeset itself",
    ).toEqual([]);

    // A name binds until its tag closes, and no further. `asRendered` leaves `latex={...}` as
    // a bare `latex= 1 ` with no quotes, so without the boundary this sentence is four
    // characters past a name that stopped applying at the `/>`, and eleven real ones like it
    // went quiet when the lead first widened far enough to see it.
    const pastTheTag = `<p><InlineMath latex={\`\${a}\`} /> {feedback ?? "Both sides are equal, since 6 times 4 is 24."}</p>`;
    expect(
      arithmeticInProse(pastTheTag),
      "a closed tag's attribute name still excuses the visible sentence after it",
    ).toHaveLength(1);

    // ...and the discriminator that keeps that widening honest. A SECOND PROPERTY is a new
    // binding, not another branch, so the string above it must not excuse it: five of the six
    // defects this guard was written for are a `fine` sitting directly under a `spoken`.
    const afterSpoken = `const g = { spoken: \`\${fee} times \${at} equals \${p}\`, fine: \`The arithmetic is right: \${fee} times \${at} really is \${p}.\` };`;
    expect(
      arithmeticInProse(afterSpoken),
      "a screen-reader string now excuses the visible sentence that follows it, which is five of the six defects this guard was written for",
    ).toHaveLength(1);

    const notArithmetic =
      'const f = { note: "Found 2 of the 4 rules that apply to this row." };';
    expect(
      arithmeticInProse(notArithmetic),
      "the detector counts a count of things as arithmetic",
    ).toEqual([]);
  });

  it("the prose extraction still finds prose across the whole tree", () => {
    // The over-stripping control. If `asRendered` or the run splitting ate the sentences,
    // every file would yield nothing and the sweep below would be vacuously green. 4,490
    // sentences, re-derived when the lead was fixed: 4,522 before it, and the 32 the fix
    // costs are all SECOND BRANCHES of a ternary under an `aria*`, `spoken*` or `text` name
    // whose first branch this rule already excused, measured one by one rather than counted.
    // Consistency between two branches of one binding, then, and not a narrowing.
    const said = LESSON_SOURCES.flatMap(([, source]) => visibleProse(source));
    expect(
      said.length,
      "the prose extraction collapsed, so the rule below was checked over almost nothing",
    ).toBeGreaterThanOrEqual(3500);

    // Both shapes learner prose reaches a screen through, or half the population could be
    // lost without the floor above moving much.
    expect(said, "a string literal did not survive the prose extraction").toContain(
      "That is the question copied down, so there is nothing wrong with it yet.",
    );
    expect(
      said.some((s) => s.includes("One line is where it went wrong")),
      "JSX text did not survive the prose extraction",
    ).toBe(true);
  });

  it("every declared exception still exists and still needs excusing", () => {
    // Both directions, per the qa rule, and vacuous today by construction: the list is
    // empty. It is asserted anyway so that adding an entry without a reason, or leaving one
    // behind after the string it excused was fixed, fails here rather than being noticed by
    // nobody.
    for (const entry of DECLARED_EXCEPTIONS) {
      const source = SOURCES[entry.path];
      expect(source, `${entry.path} is excused here but no longer exists`).toBeDefined();
      expect(
        arithmeticInProse(source ?? ""),
        `${entry.path} is excused here but no longer states arithmetic in prose: delete the entry`,
      ).not.toEqual([]);
    }
    expect(
      DECLARED_EXCEPTIONS.length,
      "an exception was added: it needs a reason in the header and a both-ways assertion here",
    ).toBe(0);
  });

  it("no lesson source states arithmetic in bare prose", () => {
    const offenders = LESSON_SOURCES.filter(
      ([path]) => !DECLARED_EXCEPTIONS.some((entry) => entry.path === path),
    ).flatMap(([path, source]) =>
      arithmeticInProse(source).map((hit) => `${path}: ${hit}`),
    );
    expect(
      offenders,
      `arithmetic stated in bare digits in learner-visible prose. Typeset it with InlineMath, using the widget's own convention, and leave spoken/aria strings plain:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
