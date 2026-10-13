/**
 * Every answer box a lesson widget offers is plain entry, so none of them draws a spinner.
 *
 * `MixedRadicandSolver` made the ruling for its own board first: a `type="number"` field draws
 * the browser's arrows, and where the answer space is small the arrows walk a learner to the
 * answer without doing the work the slot exists to ask for. The sweep that generalised it moved
 * 42 files and 49 boxes onto `numericEntryProps`, and this file is what keeps them there — plus
 * the boxes that were already plain, plus every board written after today.
 *
 * ## How the population is derived, and why not the obvious way
 *
 * The obvious derivation is a grep for `type="number"`, and it is wrong twice over.
 *
 * It is wrong on the tree it came from: `CompleteSquareSolver` builds its `type` with a ternary
 * (`{...(row.numeric ? numericEntryProps("integer") : { type: "text", ... })}`), so the literal
 * never appeared in its source, and the census that planned this change missed the file and its
 * three inputs on exactly that account. A defect that is one ternary away from invisible is not
 * something to key a guard on.
 *
 * And it is wrong on the tree it would guard: after the conversion the literal appears in this
 * directory twice, both times in a DOCBLOCK — `MixedRadicandSolver`'s ruling and
 * `numericEntry.ts`'s explanation of it. A population derived from that string is therefore
 * EMPTY of real inputs today, which is the vacuous green `.cursor/rules/qa-verification.mdc`
 * describes: a sweep that would report success over nothing, forever, while a widget added next
 * month reintroduced the spinner.
 *
 * So the population is derived from the BEHAVIOUR: a widget source under `interactive/` that
 * renders an `<input>` a learner types an answer into. Every `<input>` tag in the tree is
 * parsed, comments are stripped first so a docblock can neither be mistaken for a tag nor
 * swallow one, and the dials (`type="range"` and friends) are separated out because they are
 * controls rather than answer boxes. What is left is the population, and it is 76 files and 92
 * boxes rather than the 42 the shared helper touches: the sweep reaches the boxes that were
 * always plain text as well, because "was already right" and "cannot regress" are different
 * claims and only the second one is a guard.
 *
 * ## What the tag is scanned for, rather than the file
 *
 * Each assertion below reads a single `<input>` tag's attributes, never the whole file. That is
 * what lets the two surviving docblock mentions stay where they are without either being
 * excused by a loose pattern or tripping a tight one, and it is why a `step` on a slider is not
 * confused with a `step` on an answer box thirty lines further down.
 */

import { describe, expect, it } from "vitest";

const WIDGET_SOURCES = import.meta.glob("./interactive/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const HELPER_PATH = "./interactive/numericEntry.ts";

const HELPER_SOURCES = import.meta.glob("./interactive/numericEntry.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * The input types that are not answer boxes. A dial is turned, not typed into, so a spinner is
 * not a thing it can grow and `step` is its granularity rather than a leak.
 */
const NOT_AN_ANSWER_BOX = new Set([
  "range",
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "hidden",
  "file",
  "color",
]);

interface InputElement {
  path: string;
  /** The attribute region of one `<input ...>`, comments already gone. */
  tag: string;
  /** Every string literal any of the tag's `type` expressions can produce. */
  literalTypes: string[];
  /** Whether the tag takes its attributes from the shared helper. */
  usesHelper: boolean;
}

const SCANNED = Object.entries(WIDGET_SOURCES).filter(([path]) => !path.includes(".test."));

const ELEMENTS: InputElement[] = SCANNED.flatMap(([path, source]) =>
  inputTags(stripComments(source)).map((tag) => ({
    path,
    tag,
    literalTypes: typeExpressions(tag).flatMap(stringLiterals),
    usesHelper: /numericEntryProps/.test(tag),
  })),
);

const DIALS = ELEMENTS.filter((element) =>
  element.literalTypes.some((type) => NOT_AN_ANSWER_BOX.has(type)),
);

const ANSWER_BOXES = ELEMENTS.filter((element) => !DIALS.includes(element));

const POPULATION = [...new Set(ANSWER_BOXES.map((box) => box.path))].sort();

/**
 * The boards that genuinely need the browser's number input, named rather than omitted.
 *
 * **It is empty, and that is a measurement rather than an oversight.** All 92 answer boxes in
 * the population are plain entry today; not one of them has a case for the arrows, because on
 * these boards the arrows are precisely the leak — the answer space is a single digit or a
 * dozen clicks wide.
 *
 * The two surfaces in this product that DO keep `type="number"` are
 * `packages/shared-components/src/graph-input.tsx` and its number-line sibling, on the stated
 * ground that every scored coordinate should be operable from the keyboard, and
 * `graph-input.browser.test.tsx` asserts that type on purpose. Neither is in this population:
 * they are scored coordinate entry in another package, not lesson answer boxes under
 * `interactive/`, so listing them here would produce a list that excused nothing — the
 * decorative exception the QA rule warns about, indistinguishable from a real one until the day
 * it matters.
 *
 * What the empty set buys is the assertion below it. An entry cannot be added quietly: the
 * emptiness check fails the moment one appears, so a board claiming the arrows has to be argued
 * for in a diff, and the two directions after it then hold it to the claim.
 *
 * Both of those directions were proven by injection rather than argued. A path that no longer
 * exists (`./interactive/RetiredNumberBoard.tsx`) fails *"is excused but renders no answer
 * box"*, and a real board that is plain entry (`./interactive/MixedRadicandSolver.tsx`) fails
 * *"is plain entry now, so it does not need excusing"* while passing the first direction — and
 * removes its own box from the sweep, which is what makes an exemption load-bearing rather than
 * decorative.
 */
const NEEDS_NATIVE_NUMBER: ReadonlySet<string> = new Set<string>([]);

const SWEPT = ANSWER_BOXES.filter((box) => !NEEDS_NATIVE_NUMBER.has(box.path));

/**
 * Floors, not counts to maintain. Measured at `7c98592`: 273 widget sources scanned, 76 of them
 * rendering 92 answer boxes, 20 dials set aside, and 34 of the 76 never touching the shared
 * helper. Each floor sits a little under its measurement so that a board added needs no edit
 * here, while a glob that stops resolving, a tag parser that stops finding tags, or a
 * classifier that starts calling everything a dial fails instead of passing over an empty set.
 */
const SOURCES_FLOOR = 250;
const POPULATION_FLOOR = 70;
const ANSWER_BOX_FLOOR = 88;

/**
 * The composition floor, which is the one that would have caught the narrow derivation.
 *
 * A floor constrains size and not shape, and the shape is the whole claim here: a population
 * of "the files the helper touches" would clear a floor of 70 on its own while checking only
 * the boards that were converted, leaving every already-plain box free to grow a spinner. So
 * the sweep has to be measurably wider than the helper's own footprint.
 */
const HELPERLESS_FLOOR = 30;

/** Sliders keep their granularity, so the `step` sweep below has to be scoped, not blanket. */
const DIAL_STEP_FLOOR = 18;

describe("every lesson answer box is plain entry", () => {
  it("the sweep reads the widget sources rather than the ones that mention the attribute", () => {
    expect(
      SCANNED.length,
      "the source glob stopped resolving, so everything below is green over nothing",
    ).toBeGreaterThanOrEqual(SOURCES_FLOOR);
    expect(
      POPULATION.length,
      "no widget appears to render an answer box, so the tag parse has come apart",
    ).toBeGreaterThanOrEqual(POPULATION_FLOOR);
    expect(
      ANSWER_BOXES.length,
      "the answer boxes have gone missing, or the dial filter has swallowed them",
    ).toBeGreaterThanOrEqual(ANSWER_BOX_FLOOR);
    expect(
      POPULATION.filter(
        (path) => !ANSWER_BOXES.some((box) => box.path === path && box.usesHelper),
      ).length,
      "the population has narrowed to the files the shared helper touches",
    ).toBeGreaterThanOrEqual(HELPERLESS_FLOOR);
    expect(
      DIALS.filter((dial) => hasAttribute(dial.tag, "step")).length,
      "no dial carries a step, so the scoped step assertion below is a blanket ban in disguise",
    ).toBeGreaterThanOrEqual(DIAL_STEP_FLOOR);
  });

  it.each(SWEPT.map((box, index) => [`${box.path} #${index}`, box] as const))(
    "%s is plain entry rather than a native number input",
    (_name, box) => {
      // Read off the tag's own `type` expressions, so a ternary that only sometimes produces
      // `"number"` is caught as surely as the attribute written out longhand, and so the
      // docblocks that quote the old attribute are not mistaken for one.
      expect(box.literalTypes).not.toContain("number");
    },
  );

  it.each(SWEPT.map((box, index) => [`${box.path} #${index}`, box] as const))(
    "%s carries no step, which is a dial's attribute",
    (_name, box) => {
      // `step` on a text field does nothing, so this is not about the rendering: it is the
      // residue of a number input, and the residue is how the number input comes back.
      expect(hasAttribute(box.tag, "step")).toBe(false);
    },
  );

  it.each(SWEPT.map((box, index) => [`${box.path} #${index}`, box] as const))(
    "%s declares a type this sweep can read",
    (_name, box) => {
      // The completeness half. Everything above reads the tag, so a tag whose type arrives from
      // somewhere else — a locally built props object, a widget's own copy of the helper — is
      // outside the sweep while looking exactly like a member of it. A tag that spreads
      // anything therefore owes either a literal type of its own or the shared helper. A tag
      // that spreads nothing and names no type is left alone: with nowhere for a type to come
      // from, the browser gives it text, which is the thing being asked for.
      const readable =
        box.usesHelper || box.literalTypes.length > 0 || !/\{\s*\.\.\./.test(box.tag);
      expect(readable).toBe(true);
    },
  );

  it("the shared helper the boxes spread is itself plain entry", () => {
    // Forty-nine of the boxes name no type at all: they spread `numericEntryProps`, and the
    // assertions above see whatever it hands them, which is nothing. Change one word in the
    // helper and every one of those boxes grows its arrows back with this file still green, so
    // the helper is read directly. Comments are stripped first, because the helper's own
    // docblock quotes the attribute it exists to have removed.
    const helper = stripComments(HELPER_SOURCES[HELPER_PATH] ?? "");
    expect(helper, "the shared numeric entry helper has moved or gone").toContain(
      "numericEntryProps",
    );
    expect(helper).toMatch(/type:\s*"text"/);
    expect(stringLiterals(helper)).not.toContain("number");
    expect(hasAttribute(helper, "step")).toBe(false);
  });
});

describe("a board that keeps the browser's number input is named, not omitted", () => {
  it("no board claims the arrows today", () => {
    // The floor under an empty list. Containment holds trivially over nothing, so the two
    // directions below would pass an empty set without measuring anything; this is what stops
    // the set being quietly filled. An entry added here fails this line until someone deletes
    // it deliberately, and deleting it deliberately is the review the exception is owed.
    expect([...NEEDS_NATIVE_NUMBER]).toEqual([]);
  });

  it("every declared exception still exists and still renders an answer box", () => {
    // Direction one. A renamed or deleted board would otherwise sit in the list forever,
    // exempting nothing and hiding the fact that it exempts nothing.
    for (const path of NEEDS_NATIVE_NUMBER) {
      expect(POPULATION, `${path} is excused but renders no answer box`).toContain(path);
    }
  });

  it("no declared exception has quietly become plain entry", () => {
    // Direction two. A board that gives up its number input has to leave the list, or the list
    // stops describing the tree and starts excusing something that no longer happens — and the
    // next board to reintroduce a spinner inherits the excuse.
    for (const path of NEEDS_NATIVE_NUMBER) {
      const stillNative = ANSWER_BOXES.some(
        (box) => box.path === path && box.literalTypes.includes("number"),
      );
      expect(stillNative, `${path} is plain entry now, so it does not need excusing`).toBe(
        true,
      );
    }
  });
});

/**
 * The source with its comments blanked out, quotes and template literals respected.
 *
 * Block comments keep their newlines so nothing shifts line for line. This runs before anything
 * looks for a tag, which is the single thing that lets `MixedRadicandSolver`'s docblock quote
 * `type="number"` in the prose that rules it out.
 */
function stripComments(source: string): string {
  let out = "";
  let at = 0;
  let quote: string | null = null;
  while (at < source.length) {
    const ch = source[at] as string;
    const next = source[at + 1];
    if (quote !== null) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        at += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      at += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      at += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", at + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(at, stop).replace(/[^\n]/g, " ");
      at = stop;
      continue;
    }
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", at);
      at = end === -1 ? source.length : end;
      continue;
    }
    out += ch;
    at += 1;
  }
  return out;
}

/** The attribute region of every `<input ...>`, brace- and quote-aware so nested JSX survives. */
function inputTags(source: string): string[] {
  const tags: string[] = [];
  for (const match of source.matchAll(/<input(?=[\s/>])/g)) {
    const from = (match.index ?? 0) + match[0].length;
    let at = from;
    let depth = 0;
    let quote: string | null = null;
    while (at < source.length) {
      const ch = source[at];
      if (quote !== null) {
        if (ch === "\\") {
          at += 1;
        } else if (ch === quote) {
          quote = null;
        }
      } else if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
      } else if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
      } else if (ch === ">" && depth === 0) {
        break;
      }
      at += 1;
    }
    tags.push(source.slice(from, at));
  }
  return tags;
}

/**
 * Every expression a `type` is set from inside one tag: the JSX attribute (`type="text"`,
 * `type={expr}`) and the object-literal property (`type: "text"`), which is the form a spread
 * ternary writes it in and the form the old census could not see.
 *
 * `data-type`, `.type` and `inputMode` are not this, so the lookbehind keeps them out.
 */
function typeExpressions(tag: string): string[] {
  const found: string[] = [];
  for (const match of tag.matchAll(/(?<![\w$.-])type\s*[:=]\s*/g)) {
    const from = (match.index ?? 0) + match[0].length;
    const opener = tag[from];
    if (opener === '"' || opener === "'") {
      const end = tag.indexOf(opener, from + 1);
      found.push(tag.slice(from, end === -1 ? tag.length : end + 1));
      continue;
    }
    found.push(balancedFrom(tag, from));
  }
  return found;
}

/**
 * From `at`, either the body of a `{...}` container or the rest of an object-literal property
 * value, stopping at the comma or brace that closes it at depth zero. Either way it is the whole
 * expression, so a ternary is read with both of its arms.
 */
function balancedFrom(source: string, at: number): string {
  const container = source[at] === "{";
  let depth = container ? 0 : 1;
  let cursor = at;
  let quote: string | null = null;
  while (cursor < source.length) {
    const ch = source[cursor];
    if (quote !== null) {
      if (ch === "\\") {
        cursor += 1;
      } else if (ch === quote) {
        quote = null;
      }
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "{" || ch === "(" || ch === "[") {
      depth += 1;
    } else if (ch === "}" || ch === ")" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        break;
      }
    } else if (ch === "," && depth === 1 && !container) {
      break;
    }
    cursor += 1;
  }
  return source.slice(at, cursor);
}

/** The string literals an expression contains, which for a type is what it can evaluate to. */
function stringLiterals(expression: string): string[] {
  return [...expression.matchAll(/"([^"\\]*)"|'([^'\\]*)'/g)].map(
    (match) => match[1] ?? match[2] ?? "",
  );
}

/** A real attribute or property called `name`, not a word that happens to appear in the tag. */
function hasAttribute(tag: string, name: string): boolean {
  return new RegExp(`(?<![\\w$.-])${name}\\s*[:=]`).test(tag);
}
