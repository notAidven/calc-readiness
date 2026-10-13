/**
 * Reads the ASCII a learner has typed and says what it LOOKS like and what it SOUNDS
 * like. Presentation only, in one direction.
 *
 * ## The one property that matters
 *
 * Nothing here ever touches the string that is graded. The answer surfaces call
 * {@link previewOf} with a COPY of the field's value and render the result beside the
 * field; the value itself goes to `checkAnswer` untouched, exactly as it would if this
 * module did not exist. That is the same arrangement `ExprBuilderInput` already ships,
 * where `\sqrt[4]{x^{3}}` is drawn through the host typesetter while the comparator is
 * handed `{ kind, base, exp, index }` and never sees the LaTeX. Read the direction as
 * ASCII in, LaTeX out, and note that there is deliberately no inverse: a LaTeX-to-ASCII
 * rewriter is a parser sitting in front of a versioned checker, which is a different and
 * much larger decision (`docs/Native_Math_Input_Scope.md` §8 Phase 1 steps 1-2).
 *
 * ## Why it refuses rather than guesses
 *
 * The preview is not a verdict and must never be read as one, so it says nothing at all
 * rather than saying something encouraging about input the grader cannot read.
 *
 * There is exactly ONE rule doing that, and it is worth saying which, because the first
 * version of this file had two and neither could be shown to be load-bearing: the
 * grammar below reads the checker's operators and function names and nothing else, and
 * {@link previewOf} refuses the whole string unless the grammar consumes every token of
 * it. An earlier draft also screened the input against a character allowlist, which
 * looked like the thing catching `√` and was not — deleting it changed no behaviour,
 * because an unreadable character is one the grammar cannot place and so leaves the
 * parser short of the end either way. Two guards covering for each other meant a
 * mutation of either one still passed, so the allowlist is gone and the leftover-token
 * rule is the single mechanism a test can break.
 *
 * `√` is the case that motivated the rule: the text checker has no glyph handling, so
 * `√2` grades `invalid_input / parse_error`, and a preview that drew a beautiful radical
 * over it would be actively teaching the notation that fails.
 *
 * The converse is not claimed. A preview is not a promise that the answer parses: `x^9`
 * draws fine and the checker refuses it, because `MAX_EXPONENT` is 8. The preview shows
 * how what you wrote READS; the Check button is still the only thing that grades.
 *
 * ## Why it is tolerant mid-word
 *
 * A learner types left to right, so the string is incomplete far more often than it is
 * complete. `1/` and `sqrt(` are not errors, they are the middle of a fraction and the
 * middle of a root, and a preview that blanked on them would be dark for most of the
 * typing. A missing operand becomes an explicit empty box (`\square`, spoken as "blank")
 * and an unclosed bracket closes itself at the end of the input.
 *
 * ## Four grammars, not one
 *
 * {@link previewOf} used to be a single EXPRESSION grammar, and the refusal rule above meant
 * that every answer field whose notation is not an expression got nothing at all: measured at
 * `da781d1f`, `(-inf, 5]`, `39, 51`, `{-4, 2/5}` and `(-inf, 19] U [29, inf)` all returned
 * `null`, because each leaves a token the expression grammar cannot place. So the answer
 * types that carry NOTATION — the ones whose whole graded skill is the form — were the ones
 * with no reading of their form.
 *
 * There are now four readings, tried in this order, and the order is the whole of the
 * ambiguity resolution:
 *
 *  1. the EMPTY SET, which is a spelling and not an expression (`none`, `no solution`, `{}`);
 *  2. an INTERVAL, or a union of them, recognised by an opening bracket and one comma inside
 *     it — so `[6, 20]` reads as the interval it is even when it was typed into a
 *     solution-set field, which is the reading that tells the learner why it is about to be
 *     marked wrong;
 *  3. a ROSTER, recognised by braces or by a separator at bracket depth zero, whose three
 *     separators are the ones `solutionSetForms` spells and `parseValueList` grades;
 *  4. the expression grammar, unchanged.
 *
 * Each reading REFUSES rather than falls through once it has claimed the string, so half an
 * interval is still nothing at all. `{x | x != 9}` is claimed by the roster reading (it is
 * braced) and refused by it, which is why set-builder notation still previews as nothing —
 * see {@link previewOf} for that decision, which is deliberate and not an oversight.
 */

/** A parsed shape, only ever consumed by the two renderers below. */
type Node =
  | { kind: "hole" }
  | { kind: "number"; text: string }
  | { kind: "symbol"; text: string }
  | { kind: "neg"; of: Node }
  | { kind: "sum"; op: "+" | "-"; left: Node; right: Node }
  | { kind: "product"; left: Node; right: Node; explicit: boolean }
  | { kind: "quotient"; left: Node; right: Node }
  | { kind: "power"; base: Node; exponent: Node }
  | { kind: "group"; of: Node }
  | { kind: "abs"; of: Node }
  | { kind: "root"; radicand: Node; index: Node | undefined }
  | { kind: "call"; name: string; args: Node[] }
  /**
   * An interval endpoint only. The checker reads `inf` / `infinity` / `∞` (signed) at an
   * endpoint and NOWHERE else, so neither does this: `inf` on its own is still the two-letter
   * symbol `\mathrm{inf}` it has always drawn as. `oo` is deliberately absent, because it is
   * absent from `INFINITY_TOKENS` too and grades `invalid_input / parse_error` — which is
   * exactly the notation {@link previewOf} must never draw beautifully.
   */
  | { kind: "infinity"; negative: boolean }
  /**
   * A ROSTER MEMBER only, and it exists for one cohort: a rational answer names its excluded
   * values inline, `(x + 8)/(x + 5), x = 8, x = -5`, so eight of the eight RAT check-your-
   * understanding asks are a list whose members after the first are equations. The tokenizer
   * has no reading for `=` at all, so without this the whole answer refuses and the field
   * draws the empty box this gate exists to prevent. Split before tokenizing, never inside an
   * expression: `=` is not an operator here and two of them are not a chain.
   */
  | { kind: "equation"; left: Node; right: Node };

type Token =
  | { type: "number"; text: string }
  | { type: "name"; text: string }
  | { type: "punct"; text: string };

const HOLE: Node = { kind: "hole" };

/**
 * Split into numbers, names and single characters. Anything the grammar has no reading
 * for still becomes a token, deliberately: it is the leftover token at the end that
 * makes {@link previewOf} refuse, so a character it cannot read must not be dropped here.
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index] as string;
    if (/\s/.test(char)) {
      index += 1;
    } else if (/[0-9.]/.test(char)) {
      let text = "";
      while (index < input.length && /[0-9.]/.test(input[index] as string)) {
        text += input[index];
        index += 1;
      }
      tokens.push({ type: "number", text });
    } else if (/[a-zA-Z]/.test(char)) {
      let text = "";
      while (index < input.length && /[a-zA-Z0-9]/.test(input[index] as string)) {
        text += input[index];
        index += 1;
      }
      tokens.push({ type: "name", text });
    } else {
      tokens.push({ type: "punct", text: char });
      index += 1;
    }
  }
  return tokens;
}

/**
 * The named functions the checker's radical grammar allows, with how many arguments each
 * takes. These four get real notation (a radical sign, a pair of bars); the other two names
 * the grammar admits are in {@link DRAWN_AS_CALL} and draw as upright operator names.
 */
const KNOWN_FUNCTIONS: Record<string, number> = {
  sqrt: 1,
  cbrt: 1,
  nthRoot: 2,
  abs: 1,
};

/**
 * Every name the checker can read as a FUNCTION CALL, so every name this parser must draw
 * as one. It is `GRAMMAR_FUNCTION_NAMES` in `checker-core.ts`, restated here because the
 * preview is presentation-only and deliberately imports nothing from the checker.
 *
 * `log` and `ln` are the two that get no special notation and still have to be in this set:
 * they are real calls on the EL.5 / EL.6 paths, so `log(x)` draws as `\operatorname{log}(x)`
 * and NOT as `log` times `(x)`. `pi` is deliberately absent — it is a symbol, not a
 * function, so `pi(2)` is a product on both sides.
 *
 * A name OUTSIDE this set followed by `(` is a juxtaposed product, because that is now what
 * the checker reads: `x(x + 2)` grades as `x*(x + 2)`, so drawing it as a call to a function
 * named `x` — which is what this parser used to do, and spoke aloud as "x of x plus 2" —
 * would teach the wrong reading of an answer that is about to be marked correct. The
 * preview cannot see the item's `allowed_symbols`, so it cannot apply the checker's second
 * condition (the name is a symbol this item declares) and is therefore slightly MORE
 * permissive: `f(x)` draws as a product where the checker still refuses it. That direction
 * is the safe one and the file already declares it — "a preview is not a promise that the
 * answer parses" — whereas the converse, a checker accepting what the preview cannot draw,
 * is the one this must never allow.
 */
const DRAWN_AS_CALL: ReadonlySet<string> = new Set([
  ...Object.keys(KNOWN_FUNCTIONS),
  "log",
  "ln",
]);

class Parser {
  private at = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.at];
  }

  private isPunct(text: string): boolean {
    const token = this.peek();
    return token?.type === "punct" && token.text === text;
  }

  private take(): Token | undefined {
    const token = this.tokens[this.at];
    this.at += 1;
    return token;
  }

  done(): boolean {
    return this.at >= this.tokens.length;
  }

  expression(): Node {
    let left = this.term();
    while (this.isPunct("+") || this.isPunct("-")) {
      const op = (this.take() as Token).text as "+" | "-";
      left = { kind: "sum", op, left, right: this.term() };
    }
    return left;
  }

  private term(): Node {
    let left = this.factor();
    for (;;) {
      if (this.isPunct("*")) {
        this.take();
        left = { kind: "product", left, right: this.factor(), explicit: true };
      } else if (this.isPunct("/")) {
        this.take();
        left = { kind: "quotient", left, right: this.factor() };
      } else if (this.startsAtom()) {
        // `2x`, `3sqrt(2)`: mathjs reads juxtaposition as multiplication, so the
        // preview has to as well or `2x` would draw as a lone 2.
        left = { kind: "product", left, right: this.factor(), explicit: false };
      } else {
        return left;
      }
    }
  }

  /** True when the next token could begin an operand rather than continue one. */
  private startsAtom(): boolean {
    const token = this.peek();
    if (!token) {
      return false;
    }
    return token.type === "name" || (token.type === "punct" && token.text === "(");
  }

  private factor(): Node {
    if (this.isPunct("-")) {
      this.take();
      return { kind: "neg", of: this.factor() };
    }
    if (this.isPunct("+")) {
      this.take();
      return this.factor();
    }
    const base = this.atom();
    if (this.isPunct("^")) {
      this.take();
      // Right-associative, and a `-` after `^` belongs to the exponent (`x^-2`).
      return { kind: "power", base, exponent: this.factor() };
    }
    return base;
  }

  private atom(): Node {
    const token = this.peek();
    if (!token) {
      return HOLE;
    }
    if (token.type === "number") {
      this.take();
      return { kind: "number", text: token.text };
    }
    if (token.type === "name") {
      this.take();
      if (this.isPunct("(") && DRAWN_AS_CALL.has(token.text)) {
        return this.call(token.text);
      }
      // Not a function name, so the bracket beside it opens a factor rather than an argument
      // list. Returning the bare symbol hands the `(` back to `term()`, whose `startsAtom()`
      // branch already reads juxtaposition as a product — the same branch that draws `2x`.
      return { kind: "symbol", text: token.text };
    }
    if (token.text === "(") {
      this.take();
      const inner = this.done() ? HOLE : this.expression();
      if (this.isPunct(")")) {
        this.take();
      }
      return { kind: "group", of: inner };
    }
    if (token.text === "|") {
      this.take();
      const inner = this.done() ? HOLE : this.expression();
      if (this.isPunct("|")) {
        this.take();
      }
      return { kind: "abs", of: inner };
    }
    // A stray operator or comma in operand position: an empty box, not a failure.
    return HOLE;
  }

  private call(name: string): Node {
    this.take(); // the "("
    const args: Node[] = [];
    if (!this.isPunct(")") && !this.done()) {
      args.push(this.expression());
      while (this.isPunct(",")) {
        this.take();
        args.push(this.done() ? HOLE : this.expression());
      }
    }
    if (this.isPunct(")")) {
      this.take();
    }
    const arity = KNOWN_FUNCTIONS[name];
    if (arity === undefined) {
      return { kind: "call", name, args: args.length > 0 ? args : [HOLE] };
    }
    const first = args[0] ?? HOLE;
    if (name === "abs") {
      return { kind: "abs", of: first };
    }
    if (name === "sqrt") {
      return { kind: "root", radicand: first, index: undefined };
    }
    if (name === "cbrt") {
      return { kind: "root", radicand: first, index: { kind: "number", text: "3" } };
    }
    return { kind: "root", radicand: first, index: args[1] ?? HOLE };
  }
}

/** True when a node draws as a single glyph run, so it needs no braces around it. */
function isAtomic(node: Node): boolean {
  return (
    node.kind === "number" ||
    node.kind === "symbol" ||
    node.kind === "hole" ||
    node.kind === "group" ||
    node.kind === "abs" ||
    node.kind === "root"
  );
}

/** Precedence, so only the parentheses the reader needs are drawn. */
function bindsLooserThanProduct(node: Node): boolean {
  return node.kind === "sum" || node.kind === "neg";
}

function latexOf(node: Node): string {
  switch (node.kind) {
    case "hole":
      return "\\square";
    case "number":
      return node.text;
    case "symbol":
      // `pi` is the checker's own name for the constant, so the preview draws the constant.
      // Left as `\mathrm{pi}` it reads as two italic-free letters, which is exactly the
      // reading a learner already fears is wrong — and the whole job of the preview on a
      // pi answer is to confirm that the two letters they typed ARE the glyph in the prompt.
      // Presentation only: the field's value still reaches the checker as `pi`, untouched.
      if (node.text.toLowerCase() === "pi") {
        return "\\pi";
      }
      return node.text.length === 1 ? node.text : `\\mathrm{${node.text}}`;
    case "neg":
      return `-${latexOf(node.of)}`;
    case "sum":
      return `${latexOf(node.left)} ${node.op} ${latexOf(node.right)}`;
    case "quotient":
      // The whole point of the preview: a fraction bar, stacked, per the house rule
      // that a learner never reads `a/b`.
      return `\\dfrac{${latexOf(node.left)}}{${latexOf(node.right)}}`;
    case "product": {
      const left = bindsLooserThanProduct(node.left)
        ? `\\left(${latexOf(node.left)}\\right)`
        : latexOf(node.left);
      const right = bindsLooserThanProduct(node.right)
        ? `\\left(${latexOf(node.right)}\\right)`
        : latexOf(node.right);
      // `5\,\sqrt{2}` reads as five root two; `2\,3` would read as twenty-three, so a
      // numeric right-hand side always keeps a visible dot.
      const glue = node.right.kind === "number" ? " \\cdot " : "\\,";
      return `${left}${glue}${right}`;
    }
    case "power": {
      const base = isAtomic(node.base)
        ? latexOf(node.base)
        : `\\left(${latexOf(node.base)}\\right)`;
      return `${base}^{${latexOf(node.exponent)}}`;
    }
    case "group":
      return `\\left(${latexOf(node.of)}\\right)`;
    case "abs":
      return `\\left|${latexOf(node.of)}\\right|`;
    case "root":
      return node.index === undefined
        ? `\\sqrt{${latexOf(node.radicand)}}`
        : `\\sqrt[${latexOf(node.index)}]{${latexOf(node.radicand)}}`;
    case "call":
      return `\\operatorname{${node.name}}\\left(${node.args.map(latexOf).join(", ")}\\right)`;
    case "infinity":
      return node.negative ? "-\\infty" : "\\infty";
    case "equation":
      return `${latexOf(node.left)} = ${latexOf(node.right)}`;
  }
}

function spokenOf(node: Node): string {
  switch (node.kind) {
    case "hole":
      return "blank";
    case "number":
      return node.text;
    case "symbol":
      return node.text;
    case "neg":
      return `negative ${spokenOf(node.of)}`;
    case "sum":
      return `${spokenOf(node.left)} ${node.op === "+" ? "plus" : "minus"} ${spokenOf(node.right)}`;
    case "quotient":
      return `${spokenOf(node.left)} over ${spokenOf(node.right)}`;
    case "product":
      return `${spokenOf(node.left)} times ${spokenOf(node.right)}`;
    case "power":
      return `${spokenOf(node.base)} to the ${spokenOf(node.exponent)}`;
    case "group":
      return `the quantity ${spokenOf(node.of)}`;
    case "abs":
      return `the absolute value of ${spokenOf(node.of)}`;
    case "root":
      if (node.index === undefined) {
        return `the square root of ${spokenOf(node.radicand)}`;
      }
      if (node.index.kind === "number" && node.index.text === "3") {
        return `the cube root of ${spokenOf(node.radicand)}`;
      }
      return `the root of ${spokenOf(node.radicand)}, index ${spokenOf(node.index)}`;
    case "call":
      return `${node.name} of ${node.args.map(spokenOf).join(", ")}`;
    case "infinity":
      return node.negative ? "negative infinity" : "infinity";
    case "equation":
      return `${spokenOf(node.left)} equals ${spokenOf(node.right)}`;
  }
}

export interface MathPreview {
  /** What the typesetter draws. Never reaches a checker. */
  latex: string;
  /** The same content in words, for the live region beside it. */
  spoken: string;
}

/**
 * What one reading came to: a drawing, a REFUSAL of a string it recognised and could not
 * finish (`null`), or "not my grammar" (`undefined`), which passes the string to the next
 * reading. The three are distinct on purpose — a reading that returned `null` for both of
 * the last two would let a half-typed interval fall through and be drawn as something else.
 */
type Reading = MathPreview | null | undefined;

/** One complete expression, or `null` if the grammar could not place every token of it. */
function readExpression(text: string): Node | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return HOLE;
  }
  const parser = new Parser(tokens);
  const node = parser.expression();
  // The whole refusal, in one line. A token the grammar could not place is still sitting
  // there when the parse stops — a `√`, a LaTeX backslash, a brace, or just a second
  // number with nothing joining it to the first — and half an expression drawn
  // confidently is worse than none.
  return parser.done() ? node : null;
}

/**
 * The empty solution set. It is the one answer in the bank with no expression spelling at
 * all, so it is read as a SPELLING: the five forms below are exactly what `parseValueList`
 * accepts as an empty roster, and the alternative was drawing `no solution` as a juxtaposed
 * product of two upright words, which is a word typeset as math.
 */
const EMPTY_SET_SPELLINGS = /^(no solution|none|∅|empty|\{\s*\})$/i;

function readEmptySet(text: string): Reading {
  return EMPTY_SET_SPELLINGS.test(text)
    ? { latex: "\\varnothing", spoken: "the empty set" }
    : undefined;
}

/** The separator spellings a roster's members may be joined by, at bracket depth zero. */
const AND_SEPARATOR = " and ";

/**
 * The offsets of the depth-zero separators in `text`.
 *
 * `depthOnly` is what tells the roster splitter apart from the interval one: a roster counts
 * `(` and `{` as groups and leaves `[` alone (which is `parseValueList`'s own ruling, because
 * a comma inside square brackets in an answer field is an INTERVAL's comma), while an
 * interval's body counts all three so that a call's argument list inside an endpoint is not
 * mistaken for the interval's own comma.
 */
function separatorSpans(
  text: string,
  marks: readonly string[],
  openers: string,
  closers: string,
  includeWord: boolean,
): { start: number; end: number }[] {
  const found: { start: number; end: number }[] = [];
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (openers.includes(char)) {
      depth += 1;
      continue;
    }
    if (closers.includes(char)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) {
      continue;
    }
    if (marks.includes(char)) {
      found.push({ start: index, end: index + 1 });
      continue;
    }
    if (
      includeWord &&
      text.slice(index, index + AND_SEPARATOR.length).toLowerCase() === AND_SEPARATOR
    ) {
      found.push({ start: index, end: index + AND_SEPARATOR.length });
      index += AND_SEPARATOR.length - 1;
    }
  }
  return found;
}

function sliceAt(text: string, spans: readonly { start: number; end: number }[]): string[] {
  const parts: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    parts.push(text.slice(cursor, span.start));
    cursor = span.end;
  }
  parts.push(text.slice(cursor));
  return parts.map((part) => part.trim());
}

/** `a, b and c` — a list read aloud the way a person reads one. */
function listSpoken(parts: readonly string[]): string {
  if (parts.length <= 1) {
    return parts[0] ?? "blank";
  }
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1] as string}`;
}

/** The signed infinity spellings the checker reads at an endpoint, and only those. */
const INFINITY_ENDPOINT = /^([+-])?\s*(inf|infinity|∞)$/i;

function readEndpoint(text: string): Node | null {
  const infinity = INFINITY_ENDPOINT.exec(text.trim());
  if (infinity) {
    return { kind: "infinity", negative: infinity[1] === "-" };
  }
  return readExpression(text);
}

/** Whether `body` closes no bracket it did not open — see the note in `readIntervalPiece`. */
function opensItsOwnBracket(body: string): boolean {
  let depth = 0;
  for (const char of body) {
    if ("([{".includes(char)) {
      depth += 1;
    } else if (")]}".includes(char)) {
      if (depth === 0) {
        return false;
      }
      depth -= 1;
    }
  }
  return true;
}

interface Bound {
  readonly lo: Node;
  readonly hi: Node;
  readonly loClosed: boolean;
  readonly hiClosed: boolean;
}

/**
 * One interval piece: an opening bracket, two endpoints separated by ONE depth-zero comma,
 * and a closing bracket the learner may not have reached yet.
 *
 * The comma count is what keeps this from claiming an ordinary bracketed factor. `(x + 1`
 * has none, so it stays an expression and still draws as one; `(1, 2, 3)` has two, so it is
 * refused rather than drawn as an interval over the wrong pair.
 */
function readIntervalPiece(piece: string): Bound | null | undefined {
  const opener = piece[0];
  if (opener !== "[" && opener !== "(") {
    return undefined;
  }
  let body = piece.slice(1);
  const last = body[body.length - 1];
  const closer = last === "]" || last === ")" ? last : undefined;
  if (closer !== undefined) {
    body = body.slice(0, -1);
  }
  // The leading bracket has to be the INTERVAL'S bracket, which is only true when nothing
  // inside closes it early. `(x+14)/((x-1)(x+4)); x = -4, 1` opens with one and holds exactly
  // one depth-zero comma, so on the count alone it reads as an interval whose lower end is
  // `x+14)/((x-1)(x+4)); x = -4` — unbalanced, so it refuses, and refusing here would stop
  // the roster reading below from ever seeing a RAT answer. A closer at depth zero says the
  // bracket was closed and the string went on, so this is not one interval.
  if (!opensItsOwnBracket(body)) {
    return undefined;
  }
  // A comma, and only a comma: an interval's two ends are joined by one, and `parseIntervals`
  // reads nothing else there. The roster's three interchangeable separators are a fact about
  // a LIST, so admitting them here would draw `(1 and 2]` as an interval the grader refuses.
  const spans = separatorSpans(body, [","], "([{", ")]}", false);
  if (spans.length !== 1) {
    return undefined;
  }
  const [lower, upper] = sliceAt(body, spans);
  const lo = readEndpoint(lower ?? "");
  const hi = readEndpoint(upper ?? "");
  if (lo === null || hi === null) {
    return null;
  }
  return {
    lo,
    hi,
    loClosed: opener === "[",
    // An unclosed interval mirrors its opening bracket, which is the same left-to-right
    // tolerance that closes `sqrt(` for the learner. Typing the bracket then corrects it.
    hiClosed: (closer ?? (opener === "[" ? "]" : ")")) === "]",
  };
}

function intervalLatex(bound: Bound): string {
  const open = bound.loClosed ? "[" : "(";
  const close = bound.hiClosed ? "]" : ")";
  return `\\left${open}${latexOf(bound.lo)}, ${latexOf(bound.hi)}\\right${close}`;
}

/**
 * An interval read aloud. The four bracket combinations get four different sentences rather
 * than one sentence with two qualifiers, because which endpoints are IN is the whole graded
 * skill on LIN.6 and FUN.4 (`BOUND_INCLUSIVITY_NOTE` exists for the learner who gets the
 * numbers right and the brackets wrong), and "from 3, included, to 8, excluded" is the
 * phrasing that reads as noise and is skipped.
 */
function intervalSpoken(bound: Bound): string {
  const span = `from ${spokenOf(bound.lo)} to ${spokenOf(bound.hi)}`;
  if (bound.loClosed && bound.hiClosed) {
    return `the closed interval ${span}`;
  }
  if (!bound.loClosed && !bound.hiClosed) {
    return `the open interval ${span}`;
  }
  const included = bound.loClosed ? spokenOf(bound.lo) : spokenOf(bound.hi);
  return `the interval ${span}, including ${included}`;
}

/**
 * An interval, or a union of them.
 *
 * The join is normalised the way `parseIntervals` normalises it, and for the reason recorded
 * there: a learner copying LIN.4's own pack writes it TIGHT (`(-inf, 1]∪[8, inf)`), so the
 * glyph is rewritten to the spaced letter form before the split rather than after it.
 */
function readUnion(text: string): Reading {
  const pieces = text
    .replace(/\s*[∪⋃]\s*/g, " U ")
    .replace(/([\])])\s*U\s*([[(])/gi, "$1 U $2")
    .split(/\s+U\s+|\s+or\s+/i)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
  if (pieces.length === 0) {
    return undefined;
  }
  const bounds: Bound[] = [];
  for (const piece of pieces) {
    const bound = readIntervalPiece(piece);
    if (bound === undefined) {
      // Not interval notation at all. One non-interval piece disqualifies the whole
      // string, so `x or y` is not half drawn.
      return undefined;
    }
    if (bound === null) {
      return null;
    }
    bounds.push(bound);
  }
  return {
    latex: bounds.map(intervalLatex).join(" \\cup "),
    spoken: bounds.map(intervalSpoken).join(", or "),
  };
}

/**
 * One member of a list: an expression, or the equation a rational answer names an excluded
 * value with. The `=` is found before tokenizing and only at depth zero, and exactly one is
 * allowed — `a = b = c` is not a reading this owes anybody, so it refuses rather than
 * choosing a side.
 */
function readMember(text: string): Node | null {
  // Every other relation refuses outright. `!=`, `<=`, `>=`, `<` and `>` are the set-builder
  // condition's vocabulary, which is the notation this parser does not read (see `previewOf`),
  // and reading `x != 9` as `x` equals-something would invert the answer the learner gave.
  if (/[<>!]|==/.test(text)) {
    return null;
  }
  const marks = separatorSpans(text, ["="], "([{", ")]}", false);
  if (marks.length === 0) {
    return readExpression(text);
  }
  if (marks.length > 1) {
    return null;
  }
  const [left, right] = sliceAt(text, marks);
  const lhs = readExpression(left ?? "");
  const rhs = readExpression(right ?? "");
  return lhs === null || rhs === null ? null : { kind: "equation", left: lhs, right: rhs };
}

/**
 * A roster of values: `39, 51`, `39; 51`, `39 and 51`, and any of those in braces.
 *
 * The braces are drawn only when the learner typed them. A roster IS a set and the
 * placeholder shows one braced, but adding a brace nobody typed would read as a requirement,
 * and the checker accepts the bare form — so the preview reads the notation back rather than
 * correcting it. What it does normalise is the SEPARATOR, to the comma, because all three
 * spellings are one answer to the grader and showing one canonical reading is the job.
 */
function readRoster(text: string): Reading {
  const braced = text.startsWith("{") && text.endsWith("}") && text.length >= 2;
  const inner = braced ? text.slice(1, -1).trim() : text;
  const spans = separatorSpans(inner, [",", ";"], "({", ")}", true);
  if (!braced && spans.length === 0) {
    return undefined;
  }
  const members = sliceAt(inner, spans).filter((member) => member.length > 0);
  if (members.length === 0) {
    return undefined;
  }
  const nodes: Node[] = [];
  for (const member of members) {
    const node = readMember(member);
    if (node === null) {
      return null;
    }
    nodes.push(node);
  }
  const list = nodes.map(latexOf).join(", ");
  const spoken = listSpoken(nodes.map(spokenOf));
  return braced
    ? { latex: `\\left\\{${list}\\right\\}`, spoken: `the set ${spoken}` }
    : { latex: list, spoken };
}

/**
 * The typeset and spoken readings of `value`, or `null` when there is nothing to show
 * (empty input) or nothing safe to show (a character the grader's own parser refuses).
 *
 * **Set-builder notation is deliberately NOT read here.** `{x | x != 9}` returns `null`, and
 * `mathPreviewParser.test.ts` asserts that it does. It is the one notation whose form is
 * graded as a form by a rule of its own (`SET_BUILDER_NOTATION_NOTE` marks an equivalent set
 * wrong for being written any other way), so its reading is a condition rather than a value
 * and it needs a grammar for `|`, `!=`, `<=` and a bound variable that none of the four
 * readings above has. Left out rather than half-read: `MathAnswerColumn` therefore keeps
 * the `set_builder` tag previewless, so no learner meets an empty preview box.
 */
export function previewOf(value: string): MathPreview | null {
  // An empty field tokenizes to nothing, which is the same "nothing to draw" as a field
  // holding only spaces. One check rather than an emptiness test in front of it: a second
  // guard over the same condition is a guard neither of which a test can break.
  const trimmed = value.trim();
  if (tokenize(trimmed).length === 0) {
    return null;
  }
  for (const read of [readEmptySet, readUnion, readRoster]) {
    const reading = read(trimmed);
    if (reading !== undefined) {
      return reading;
    }
  }
  const node = readExpression(trimmed);
  return node === null ? null : { latex: latexOf(node), spoken: spokenOf(node) };
}
