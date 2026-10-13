/**
 * Does each template's RENDERED PROMPT still ask for the answer its key holds?
 *
 * Nothing in this repository asked that question before this file. `validateTemplates` grades
 * every generated key against its own answer spec, which proves the key is well formed and
 * gradable and says nothing whatever about the sentence the learner reads: a prompt reworded from
 * "how much is left" to "how much was taken" keeps a valid key and asks for the other number.
 * `promptFormat.test.ts` reads prompts for NOTATION. Neither re-derives an answer.
 *
 * ## The one rule this file lives or dies by: derive from the PROMPT, never from the params
 *
 * `template_params` holds the very numbers the key was computed from, so a derivation that reads
 * them agrees with the key by construction and passes over the exact defect it exists to catch.
 * Every reader below therefore takes the rendered prompt STRING and nothing else — the numbers are
 * re-read out of the sentence a learner sees, and the operation is re-read out of the words. That
 * is also why the readers are wordy regexes rather than a switch on `template_id`: matching on the
 * id would be reading provenance instead of prose, and a reworded prompt would still match.
 *
 * A clean green here is exactly what a params-reading derivation would also produce, so the green
 * is worthless without a demonstrated red. The last test injects one: for each covered template it
 * takes a rendered prompt, steps the first digit of every math span, and re-runs the derivation
 * against the UNCHANGED key. A derivation that reads the prompt must now disagree; one that reads
 * the params will not notice. Every injection has to flip, and the count of injections is floored,
 * so an injector that silently stopped mutating cannot report a clean sweep.
 *
 * ## What counts as agreement, and why it is not `status === "correct"`
 *
 * The derivation reproduces the arithmetic the prompt asks for, so what it produces is the
 * UNSIMPLIFIED expression: `((1)/(2)) + ((1)/(4))` where the key is `3/4`, or `3(x + 4) + 2(x + 5)`
 * where the key is `5*x + 22`. Those are the right value in the wrong form, which is precisely the
 * `not_simplified` verdict, so agreement is `correct` OR `not_simplified` — the two codes this
 * checker returns only AFTER it has found the values equal. `wrong_representation` is deliberately
 * not in that set even though it looks similar: `representationIssue` runs BEFORE any value
 * comparison, so accepting it would let a wrong number through. The form requirements are stripped
 * off the spec the derivation is graded against for the same reason, leaving the value comparison
 * and the item's own `simplification` profile behind it.
 *
 * ## Scope, stated because it is a hole and not a boundary
 *
 * D1 and D10 only, 44 templates. The other eight domains have no prompt-derivation coverage
 * either, and extending this file to them is deferred rather than done — a reader per prompt shape
 * is the cost, and those domains carry several hundred shapes between them. This file is written
 * so adding a domain is adding readers and one line to `COVERED_TEMPLATES`.
 */

import {
  type AnswerSpec,
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "@cr/components";
import { describe, expect, it } from "vitest";

import { D1_PRACTICE_TEMPLATES } from "./d1";
import { D10_PRACTICE_TEMPLATES } from "./d10";
import { generateFromTemplate, type FrozenItem, type ItemTemplate } from "./template";

/* ------------------------------------------------------------------ reading the prompt */

/** Every `$...$` math span in a prompt, in order, with the delimiters dropped. */
function mathSpans(prompt: string): readonly string[] {
  return [...prompt.matchAll(/\$([^$]+)\$/g)].map((match) => match[1] ?? "");
}

/**
 * One KaTeX fragment as an ASCII expression the shared grammar reads.
 *
 * Deliberately small: it handles the commands the D1 and D10 prompt builders actually emit
 * (`promptFormat.ts` and `theming.ts` are the whole vocabulary) and nothing else. It does NOT
 * insert implicit product stars, because `prepareRawAnswer` inside the checker already does that
 * off the item's own declared symbols, and duplicating it here would be a second grammar to keep
 * in step with the first.
 */
function asciiFromLatex(latex: string): string {
  let out = latex;
  out = out.replace(/\\left\|/g, "abs(").replace(/\\right\|/g, ")");
  out = out.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")");
  // Innermost-first, so a nested fraction is rewritten from the inside out.
  for (let pass = 0; pass < 8; pass += 1) {
    const next = out.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))");
    if (next === out) {
      break;
    }
    out = next;
  }
  // A bare integer exponent is left UNPARENTHESIZED on purpose: `readConstantExponent` in
  // `checker-core.ts` only unwraps a parenthesized exponent when negative exponents are allowed,
  // so `(4 + 3)^(2)` is refused `unsupported_exponent` on a D1 item while `(4 + 3)^2` grades.
  out = out.replace(/\^\{([^{}]*)\}/g, (_whole, inner: string) =>
    /^\d+$/.test(inner.trim()) ? `^${inner.trim()}` : `^(${inner})`,
  );
  out = out
    .replace(/\\times/g, "*")
    .replace(/\\cdot/g, "*")
    .replace(/\\div/g, "/");
  out = out.replace(/×/g, "*").replace(/÷/g, "/");
  out = out.replace(/\\pi/g, "pi");
  out = out.replace(/\\%/g, "%");
  out = out.replace(/\\[,;!]/g, " ");
  return out.trim();
}

/**
 * `|8 + (-6)|` becomes `2`, and `sqrt((6)^2 + (8)^2)` becomes `10`.
 *
 * Not a convenience. The NUMERIC path of the checker admits no function at all — the empty
 * allowed-functions set — so `abs(8 + (-6))` and `sqrt((6)^2 + (8)^2)` are both
 * `invalid_input / unsupported_syntax` against a plain integer key, refused for their syntax before
 * a value is compared. A derivation that cannot be graded is not evidence about anything, so a call
 * over LITERALS is evaluated here.
 *
 * Two limits keep this from becoming a second grading engine. It only ever folds a call whose
 * argument is arithmetic over number literals ({@link literalValue} returns `null` the moment a
 * symbol appears), and it only folds a `sqrt` that comes out an INTEGER: an exact radical is left
 * standing as `sqrt(...)`, because those items declare radicals and want the symbolic form. And it
 * is still reading the prompt — every digit folded in came out of the sentence, so stepping one
 * moves the result.
 */
function foldLiteralCalls(expression: string): string {
  let out = expression;
  for (let pass = 0; pass < 12; pass += 1) {
    const next = foldOneLiteralCall(out);
    if (next === out) {
      return out;
    }
    out = next;
  }
  return out;
}

function foldOneLiteralCall(text: string): string {
  for (const match of text.matchAll(/(abs|sqrt)\(/g)) {
    const at = match.index ?? 0;
    const open = at + (match[1] ?? "").length;
    const close = matchingParen(text, open);
    if (close < 0) {
      continue;
    }
    const value = literalValue(text.slice(open + 1, close));
    if (value === null) {
      continue;
    }
    const folded = match[1] === "abs" ? Math.abs(value) : Math.sqrt(value);
    if (!Number.isFinite(folded) || (match[1] === "sqrt" && !Number.isInteger(folded))) {
      continue;
    }
    return `${text.slice(0, at)}${folded}${text.slice(close + 1)}`;
  }
  return text;
}

/** The index of the `)` closing the `(` at `open`, or `-1`. */
function matchingParen(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "(") {
      depth += 1;
    } else if (text[index] === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

/**
 * The value of arithmetic over number LITERALS, or `null` for anything else.
 *
 * Recursive descent rather than a regex, because it has to refuse precisely: one symbol, one
 * function call, one unbalanced paren anywhere in the text and the answer is `null`. Refusing is
 * the safe direction — an unfolded call is reported as a disagreement, and a wrongly folded one
 * would be a number invented by this file.
 */
function literalValue(text: string): number | null {
  const tokens = text.match(/\d+(?:\.\d+)?|[-+*/^()]/g);
  if (tokens === null || tokens.join("") !== text.replace(/\s+/g, "")) {
    return null;
  }
  let at = 0;
  const peek = (): string | undefined => tokens[at];
  const sum = (): number | null => {
    let left = product();
    while (left !== null && (peek() === "+" || peek() === "-")) {
      const op = tokens[at];
      at += 1;
      const right = product();
      if (right === null) {
        return null;
      }
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };
  const product = (): number | null => {
    let left = power();
    while (left !== null && (peek() === "*" || peek() === "/")) {
      const op = tokens[at];
      at += 1;
      const right = power();
      if (right === null) {
        return null;
      }
      left = op === "*" ? left * right : left / right;
    }
    return left;
  };
  const power = (): number | null => {
    const base = unary();
    if (base === null || peek() !== "^") {
      return base;
    }
    at += 1;
    const exponent = power();
    return exponent === null ? null : base ** exponent;
  };
  const unary = (): number | null => {
    if (peek() === "-" || peek() === "+") {
      const op = tokens[at];
      at += 1;
      const inner = unary();
      return inner === null ? null : op === "-" ? -inner : inner;
    }
    return primary();
  };
  const primary = (): number | null => {
    const token = peek();
    if (token === undefined) {
      return null;
    }
    if (token === "(") {
      at += 1;
      const inner = sum();
      if (inner === null || peek() !== ")") {
        return null;
      }
      at += 1;
      return inner;
    }
    if (!/^\d/.test(token)) {
      return null;
    }
    at += 1;
    return Number(token);
  };
  const value = sum();
  return value !== null && at === tokens.length && Number.isFinite(value) ? value : null;
}

/**
 * A reader turns one rendered prompt into the expression the prompt asks the learner to evaluate.
 *
 * `when` is matched against the prompt TEXT. Two readers may match the same template, because
 * several templates render two different sentences off one draw (GEO.1's angle template asks about
 * a triangle or a straight line, GEO.2's perimeter about a rectangle or an L), and a prompt shape
 * is the unit a derivation can be written for.
 */
interface PromptReader {
  id: string;
  when: RegExp;
  read: (match: RegExpMatchArray, prompt: string) => string | null;
}

/** Trailing "how to type it" instructions, which carry no arithmetic. */
const TRAILING_INSTRUCTION =
  /\s*(?:Enter one number\.|Write .*$|Give .*$|Answer .*$|Reduce .*$)/gs;

const READERS: readonly PromptReader[] = [
  /*
   * The bare instruction families: `Evaluate $...$.`, `Simplify: $...$.`, `Expand: $...$.`,
   * `Expand and combine: $...$.` -- and the same four written without KaTeX, which the walk and
   * golden templates use. The math is whatever follows the instruction, so this reader makes no
   * assumption about the operators in it at all.
   */
  {
    id: "instruction-then-math",
    when: /^(?:Evaluate|Simplify|Expand and combine|Expand)\s*:?\s*(.+)$/s,
    read: (match) => {
      const body = (match[1] ?? "").replace(TRAILING_INSTRUCTION, "").trim();
      const inner = body.replace(/\.$/, "").trim();
      const spans = mathSpans(inner);
      return asciiFromLatex(spans.length > 0 ? spans.join(" ") : inner);
    },
  },
  {
    id: "tool-bundle-expand",
    when: /Expand \$(.+?)\$ to find the total\./,
    read: (match) => asciiFromLatex(match[1] ?? ""),
  },
  {
    id: "drying-rack-add",
    when: /over \$\\dfrac\{(-?\d+)\}\{(\d+)\}\$ of a drying rack, then \$\\dfrac\{(-?\d+)\}\{(\d+)\}\$ more/,
    read: (m) => `(${m[1]})/(${m[2]}) + (${m[3]})/(${m[4]})`,
  },
  {
    id: "drying-rack-sub",
    when: /drying rack is \$\\dfrac\{(-?\d+)\}\{(\d+)\}\$ covered\. The camp takes \$\\dfrac\{(-?\d+)\}\{(\d+)\}\$/,
    read: (m) => `(${m[1]})/(${m[2]}) - (${m[3]})/(${m[4]})`,
  },
  {
    id: "percent-of-katex",
    when: /^What is \$(\d+)\\%\$ of \$(-?\d+(?:\.\d+)?)\$\?/,
    read: (m) => `(${m[1]})/100*(${m[2]})`,
  },
  {
    id: "cord-percent-of",
    when: /coil of cord measures \$\(?(-?\d+)\)?\$ paces\. How long is \$(\d+)\\%\$ of it/,
    read: (m) => `(${m[2]})/100*(${m[1]})`,
  },
  {
    id: "percent-what",
    when: /^What percent of \$(-?\d+(?:\.\d+)?)\$ is \$(-?\d+(?:\.\d+)?)\$\?/,
    read: (m) => `100*(${m[2]})/(${m[1]})`,
  },
  {
    id: "unit-rate",
    when: /^If \$\(?(-?\d+)\)?\$ (\S+) cost \\\$\$(-?[\d.]+)\$, how much do \$\(?(-?\d+)\)?\$/,
    read: (m) => `(${m[3]})/(${m[1]})*(${m[4]})`,
  },
  {
    id: "pace-span-conversion",
    when: /measures \$(\d+)\$ paces, and one pace is \$(\d+)\$ spans\. One .+? measures \$(\d+)\$ spans\./,
    read: (m) => `(${m[1]})*(${m[2]})/(${m[3]})`,
  },
  {
    id: "additive-inverse",
    when: /^What is the additive inverse of \$\(?(-?\d+)\)?\$\?/,
    read: (m) => `-(${m[1]})`,
  },
  {
    id: "reciprocal-of-fraction",
    when: /^What is the reciprocal of \$\\dfrac\{(-?\d+)\}\{(-?\d+)\}\$\?/,
    read: (m) => `(${m[2]})/(${m[1]})`,
  },
  {
    id: "geo-rect-area",
    when: /rectangular slab measures \$(\d+)\$ meters by \$(\d+)\$ meters\. What is its area/,
    read: (m) => `(${m[1]})*(${m[2]})`,
  },
  /*
   * The L and the plain rectangle are two readers because they are two sentences, and the L is the
   * one worth writing carefully: its perimeter is the FULL rectangle's, because the notch replaces
   * two pieces of the boundary with two edges exactly as long. The notch's own numbers are read
   * out of the prompt and deliberately unused, which is the derivation agreeing with the geometry
   * rather than with the key.
   */
  {
    id: "geo-perimeter-notched",
    when: /L-shaped courtyard is a rectangle \$(\d+)\$ meters by \$(\d+)\$ meters with a rectangle \$(\d+)\$ meters by \$(\d+)\$ meters removed/,
    read: (m) => `2*((${m[1]}) + (${m[2]}))`,
  },
  {
    id: "geo-perimeter-rect",
    when: /rectangular courtyard measures \$(\d+)\$ meters by \$(\d+)\$ meters\. How many meters of curb/,
    read: (m) => `2*((${m[1]}) + (${m[2]}))`,
  },
  {
    id: "geo-prism-volume",
    when: /measures \$(\d+)\$ meters long, \$(\d+)\$ meters wide and \$(\d+)\$ meters deep/,
    read: (m) => `(${m[1]})*(${m[2]})*(${m[3]})`,
  },
  {
    id: "geo-cylinder-volume",
    when: /cylindrical well shaft has a radius of \$(\d+)\$ meters and a depth of \$(\d+)\$ meters/,
    read: (m) => `(${m[1]})^2*(${m[2]})*pi`,
  },
  {
    id: "geo-prism-surface-area",
    when: /measures \$(\d+)\$ meters long, \$(\d+)\$ meters wide and \$(\d+)\$ meters high\. What is its total surface area/,
    read: (m) => `2*((${m[1]})*(${m[2]}) + (${m[1]})*(${m[3]}) + (${m[2]})*(${m[3]}))`,
  },
  {
    id: "geo-hypotenuse",
    when: /right triangle has legs of \$(\d+)\$ meters and \$(\d+)\$ meters\. How long is its hypotenuse/,
    read: (m) => `sqrt((${m[1]})^2 + (${m[2]})^2)`,
  },
  {
    id: "geo-missing-leg",
    when: /right triangle has a hypotenuse of \$(\d+)\$ meters and one leg of \$(\d+)\$ meters/,
    read: (m) => `sqrt((${m[1]})^2 - (${m[2]})^2)`,
  },
  {
    id: "geo-angle-third-of-triangle",
    when: /Two angles of a triangle measure \$(\d+)\$ degrees and \$(\d+)\$ degrees/,
    read: (m) => `180 - (${m[1]}) - (${m[2]})`,
  },
  {
    id: "geo-angle-on-a-line",
    when: /An angle of \$(\d+)\$ degrees sits on a straight line/,
    read: (m) => `180 - (${m[1]})`,
  },
  {
    id: "geo-exact-diagonal",
    when: /rectangle measures \$(\d+)\$ meters by \$(\d+)\$ meters\. Give the exact length of its diagonal/,
    read: (m) => `sqrt((${m[1]})^2 + (${m[2]})^2)`,
  },
  {
    id: "geo-similar-side",
    when: /one pair of sides measures \$([\d.]+)\$ meters and \$([\d.]+)\$ meters\. In the second triangle, the side corresponding to the \$([\d.]+)\$ meter side measures \$([\d.]+)\$ meters/,
    read: (m) => `(${m[4]})*(${m[2]})/(${m[1]})`,
  },
  /*
   * NUM.S's practice prompt is a running waterline reading: a starting reading, then a list of
   * signed changes written in words. The sign comes out of the VERB, which is the whole of what
   * this template teaches, so a reader that took the digits and ignored "rises" / "falls" would
   * agree with the key on roughly half of the draws by luck.
   */
  {
    id: "waterline-reading-sum",
    when: /the reading is \$(-?\d+)\$ notches\.(.*?)What is the reading now/s,
    read: (m) => {
      const moves = [...(m[2] ?? "").matchAll(/(rises|falls) \$(-?\d+)\$ notches/g)];
      if (moves.length === 0) {
        return null;
      }
      const terms = moves.map((move) => `${move[1] === "falls" ? "-" : "+"} (${move[2]})`);
      return `(${m[1]}) ${terms.join(" ")}`;
    },
  },
];

/**
 * The expression a prompt asks for, plus which reader read it, or `null` where none did.
 *
 * The instruction reader is tried LAST despite being listed first, because its `when` is the
 * loosest in the file: a word problem ending in "Expand $3(x + 4)$ to find the total." also opens
 * with no instruction at all, and the two D1 themed families put their instruction mid-sentence.
 * Ordering by specificity in one place beats writing every other reader's exclusion into it.
 */
function derive(prompt: string): { reader: string; expression: string } | null {
  const ordered = [...READERS.slice(1), READERS[0] as PromptReader];
  for (const reader of ordered) {
    const match = prompt.match(reader.when);
    if (!match) {
      continue;
    }
    const read = reader.read(match, prompt);
    if (read !== null && read.trim() !== "") {
      return { reader: reader.id, expression: foldLiteralCalls(read) };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ grading the derivation */

/**
 * The item's own answer definition with every FORM requirement stripped off it.
 *
 * What is left is the value comparison plus the item's `simplification` profile, which is what
 * lets `not_simplified` stand for "the prompt's arithmetic came to the key". `representation` has
 * to go: it is checked BEFORE any value comparison, so a `fraction` item would refuse the sum of
 * two fractions the prompt actually shows without ever looking at what it comes to.
 */
function valueOnlyDefinition(item: FrozenItem) {
  const spec = item.answer.answer_spec as AnswerSpec;
  return {
    ...item.answer,
    answer_spec: {
      ...spec,
      representation: "any",
      required_form: null,
      required_notation: "none",
      precision: null,
      unit_policy: "none",
    } as AnswerSpec,
  };
}

/** The two verdicts this checker returns only after finding the values equal. */
const AGREES = new Set(["correct", "not_simplified"]);

function verdictFor(item: FrozenItem, expression: string): string {
  const checker = createProductAnswerChecker({
    itemVersions: [
      {
        item_version_id: "derived",
        node_id: item.node_id,
        answer: valueOnlyDefinition(item),
      },
    ] as unknown as Parameters<typeof createProductAnswerChecker>[0]["itemVersions"],
  });
  const result = checker({
    raw_answer: expression,
    item_version_id: "derived",
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return result.status === "correct" ? "correct" : (result.reason_code ?? result.status);
}

function agrees(item: FrozenItem, expression: string): boolean {
  return AGREES.has(verdictFor(item, expression));
}

/* ------------------------------------------------------------------ the population */

const TEMPLATES: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
];

/** Draws per template. 44 templates x 60 = 2,640 derivations. */
const DRAWS = 60;
const SEED_BASE = 910_000;

/**
 * Floors and composition, read off the printed counts rather than copied from a report.
 *
 * `TEMPLATE_FLOOR` is what fails if a template list stops being imported -- a derivation sweep
 * over an empty population is the emptiest possible green. `D1_TEMPLATE_FLOOR` and
 * `D10_TEMPLATE_FLOOR` are the composition beside it: the two domains are read by disjoint sets
 * of readers (D1's arithmetic families, D10's geometry sentences), so a population that drifted
 * onto one domain would clear a total floor while leaving the other's readers running over
 * nothing.
 */
const TEMPLATE_FLOOR = 40;
const D1_TEMPLATE_FLOOR = 30;
const D10_TEMPLATE_FLOOR = 10;
const READER_FLOOR = 18;

function drawsFor(template: ItemTemplate): readonly FrozenItem[] {
  const items: FrozenItem[] = [];
  for (let index = 0; index < DRAWS; index += 1) {
    items.push(generateFromTemplate(template, "practice", SEED_BASE + index));
  }
  return items;
}

describe("every D1 and D10 prompt still asks for the answer its key holds", () => {
  it("has a population of templates, composed of both domains", () => {
    expect(
      TEMPLATES.length,
      `only ${TEMPLATES.length} templates, under the floor of ${TEMPLATE_FLOOR}: a template list stopped being imported`,
    ).toBeGreaterThanOrEqual(TEMPLATE_FLOOR);
    expect(
      D1_PRACTICE_TEMPLATES.length,
      `only ${D1_PRACTICE_TEMPLATES.length} D1 templates, under ${D1_TEMPLATE_FLOOR}`,
    ).toBeGreaterThanOrEqual(D1_TEMPLATE_FLOOR);
    expect(
      D10_PRACTICE_TEMPLATES.length,
      `only ${D10_PRACTICE_TEMPLATES.length} D10 templates, under ${D10_TEMPLATE_FLOOR}`,
    ).toBeGreaterThanOrEqual(D10_TEMPLATE_FLOOR);
  });

  it("is read by a derivation for every template, with none uncovered", () => {
    const uncovered: string[] = [];
    const readersUsed = new Set<string>();
    for (const template of TEMPLATES) {
      for (const item of drawsFor(template)) {
        const derived = derive(item.prompt);
        if (derived === null) {
          uncovered.push(`${template.template_id}: no reader matched "${item.prompt}"`);
          break;
        }
        readersUsed.add(derived.reader);
      }
    }
    expect(uncovered).toEqual([]);
    // Every reader in the file has to be used by something, so a reader whose prompt shape was
    // reworded away is deleted rather than left standing as decoration -- and the floor stops the
    // sweep resting on one loose reader that happens to match everything.
    expect(
      readersUsed.size,
      `only ${readersUsed.size} of ${READERS.length} readers matched anything, under the floor of ${READER_FLOOR}`,
    ).toBeGreaterThanOrEqual(READER_FLOOR);
    const unused = READERS.filter((reader) => !readersUsed.has(reader.id)).map(
      (reader) => reader.id,
    );
    expect(unused, "a reader matched no rendered prompt, so it is grading nothing").toEqual(
      [],
    );
  }, 120_000);

  it("agrees with the key on every draw", () => {
    const disagreed: string[] = [];
    let derivations = 0;
    for (const template of TEMPLATES) {
      for (const item of drawsFor(template)) {
        const derived = derive(item.prompt);
        if (derived === null) {
          continue;
        }
        derivations += 1;
        if (!agrees(item, derived.expression)) {
          disagreed.push(
            `${template.template_id} via ${derived.reader}: prompt "${item.prompt}" derives ${derived.expression}, which the key ${JSON.stringify(item.answer.answer_key)} reads as ${verdictFor(item, derived.expression)}`,
          );
        }
      }
    }
    expect(
      derivations,
      `only ${derivations} derivations ran, so the sweep is thinner than it claims`,
    ).toBeGreaterThanOrEqual(TEMPLATE_FLOOR * DRAWS);
    expect(disagreed.slice(0, 10)).toEqual([]);
  }, 300_000);

  /**
   * THE INJECTION. Without this the green above is indistinguishable from a derivation that reads
   * `template_params`, since that one agrees with the key by construction.
   *
   * The prompt's math is changed and the key is not, so a derivation reading the prompt must now
   * disagree. Stepping the FIRST digit of every math span is the mutation because it is the one
   * that always changes the arithmetic and never changes the shape: no span becomes empty, no
   * denominator becomes zero, and a prompt whose spans hold no digit at all is reported rather
   * than skipped.
   */
  it("and stops agreeing when the prompt's numbers are changed under it", () => {
    const inert: string[] = [];
    let injected = 0;
    for (const template of TEMPLATES) {
      const item = drawsFor(template)[0] as FrozenItem;
      const derived = derive(item.prompt);
      if (derived === null) {
        continue;
      }
      const mutated = stepFirstDigitOfEachSpan(item.prompt);
      if (mutated === item.prompt) {
        inert.push(
          `${template.template_id}: the injector changed nothing in "${item.prompt}"`,
        );
        continue;
      }
      const after = derive(mutated);
      if (after === null) {
        inert.push(
          `${template.template_id}: no reader matched the injected prompt "${mutated}"`,
        );
        continue;
      }
      injected += 1;
      if (agrees(item, after.expression)) {
        inert.push(
          `${template.template_id} via ${after.reader}: the injected prompt "${mutated}" still derives an answer the key ${JSON.stringify(item.answer.answer_key)} accepts (${after.expression}), so this derivation is not reading the prompt`,
        );
      }
    }
    expect(
      injected,
      `only ${injected} prompts were injected, under the floor of ${TEMPLATE_FLOOR}`,
    ).toBeGreaterThanOrEqual(TEMPLATE_FLOOR);
    expect(inert).toEqual([]);
  }, 120_000);
});

/** Step the first digit of every `$...$` span, leaving everything else byte-identical. */
function stepFirstDigitOfEachSpan(prompt: string): string {
  return prompt.replace(/\$([^$]+)\$/g, (whole, inner: string) => {
    const stepped = inner.replace(/\d/, (digit) =>
      String(digit === "9" ? 8 : Number(digit) + 1),
    );
    return stepped === inner ? whole : `$${stepped}$`;
  });
}
