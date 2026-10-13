/**
 * Re-derive a D4 practice item's answer from the RENDERED PROMPT TEXT.
 *
 * Nothing in here may read `template_params`. Deriving from the params re-uses the numbers
 * the key was computed from, so it agrees with the key by construction and passes over the
 * one defect this sweep exists for: a prompt whose wording or numbers no longer ask for its
 * own answer. `validateTemplates` already grades a key against its own SPEC and says in its
 * comment that prompt-versus-key is out of scope, so this is the half nothing else covers.
 *
 * Each entry below parses the prompt's `$...$` spans, works the problem, and hands back
 * learner-typable spellings for the real checker to grade, plus `notes` for a claim the
 * prompt makes about itself that the numbers do not support (a division promised to "come
 * out exactly" that leaves a remainder, a factoring that does not multiply back).
 */

import type { FrozenItem } from "../template";

/** Each `$...$` span of a prompt, in order. */
export function mathSpans(text: string): string[] {
  return Array.from(text.matchAll(/(?<!\\)\$(.*?)(?<!\\)\$/g), (m) => m[1] ?? "");
}

/** What one prompt derives to: spellings a learner could type, and self-consistency notes. */
export interface Derivation {
  spellings: string[];
  notes: string[];
}

/** Coefficients indexed by power: `[c, b, a]` is `a x^2 + b x + c`. */
type Poly = number[];

function compact(src: string): string {
  return src
    .replace(/\\left|\\right/g, "")
    .replace(/\\times/g, "*")
    .replace(/\s+/g, "")
    .replace(/[{}]/g, "");
}

function splitTerms(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if ((char === "+" || char === "-") && index > 0) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.filter((part) => part.length > 0);
}

function parsePoly(src: string, variable = "x"): Poly {
  const coefficients: Poly = [];
  for (const term of splitTerms(compact(src))) {
    const match = /^([+-]?)(\d*)(?:([a-z])(?:\^(\d+))?)?$/.exec(term);
    if (!match) {
      throw new Error(`unparsable term "${term}" in "${src}"`);
    }
    const [, sign, digits, letter, exponent] = match;
    if (letter !== undefined && letter !== variable) {
      throw new Error(`unexpected variable "${letter}" in "${src}"`);
    }
    if (digits === "" && letter === undefined) {
      throw new Error(`empty term "${term}" in "${src}"`);
    }
    const magnitude = digits === "" ? 1 : Number(digits);
    const power = letter === undefined ? 0 : exponent === undefined ? 1 : Number(exponent);
    while (coefficients.length <= power) {
      coefficients.push(0);
    }
    coefficients[power] =
      (coefficients[power] ?? 0) + (sign === "-" ? -magnitude : magnitude);
  }
  return coefficients.map((value) => value ?? 0);
}

/** `2x + 3y` as its two coefficients, read off the rendered string. */
function parseBivariate(src: string): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const term of splitTerms(compact(src))) {
    const match = /^([+-]?)(\d*)([xy])$/.exec(term);
    if (!match) {
      throw new Error(`unparsable bivariate term "${term}" in "${src}"`);
    }
    const [, sign, digits, letter] = match;
    const value = (sign === "-" ? -1 : 1) * (digits === "" ? 1 : Number(digits));
    if (letter === "x") {
      x += value;
    } else {
      y += value;
    }
  }
  return { x, y };
}

function add(left: Poly, right: Poly): Poly {
  const out: Poly = [];
  for (let power = 0; power < Math.max(left.length, right.length); power += 1) {
    out[power] = (left[power] ?? 0) + (right[power] ?? 0);
  }
  return out;
}

function subtract(left: Poly, right: Poly): Poly {
  return add(
    left,
    right.map((value) => -value),
  );
}

function multiply(left: Poly, right: Poly): Poly {
  const out: Poly = new Array(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      out[i + j] = (out[i + j] ?? 0) + (left[i] ?? 0) * (right[j] ?? 0);
    }
  }
  return out;
}

function evaluate(poly: Poly, at: number): number {
  return poly.reduce((total, value, power) => total + value * at ** power, 0);
}

/** Split `lhs = rhs` and return `lhs - rhs`, so the equation reads `... = 0`. */
function equationToZero(src: string): Poly {
  const sides = compact(src).split("=");
  if (sides.length !== 2) {
    throw new Error(`not an equation: "${src}"`);
  }
  return subtract(parsePoly(sides[0] as string), parsePoly(sides[1] as string));
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function fractionText(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator) || 1;
  const sign = denominator < 0 ? -1 : 1;
  const top = (sign * numerator) / divisor;
  const bottom = Math.abs(denominator) / divisor;
  return bottom === 1 ? `${top}` : `${top}/${bottom}`;
}

/** Exact rational roots of `a x^2 + b x + c`, ascending. Throws when they are not rational. */
function quadraticRoots(poly: Poly): { value: number; text: string }[] {
  const a = poly[2] ?? 0;
  const b = poly[1] ?? 0;
  const c = poly[0] ?? 0;
  if (a === 0) {
    throw new Error(`not a quadratic: ${JSON.stringify(poly)}`);
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    throw new Error(`no real roots: ${JSON.stringify(poly)}`);
  }
  const root = Math.sqrt(discriminant);
  if (!Number.isInteger(root)) {
    throw new Error(`irrational roots: ${JSON.stringify(poly)}`);
  }
  const pairs = [
    { numerator: -b + root, denominator: 2 * a },
    { numerator: -b - root, denominator: 2 * a },
  ];
  return pairs
    .map(({ numerator, denominator }) => ({
      value: numerator / denominator,
      text: fractionText(numerator, denominator),
    }))
    .sort((left, right) => left.value - right.value);
}

function solutionSetText(roots: { value: number; text: string }[]): string {
  const seen = new Set<string>();
  const members: string[] = [];
  for (const root of [...roots].sort((left, right) => left.value - right.value)) {
    if (!seen.has(root.text)) {
      seen.add(root.text);
      members.push(root.text);
    }
  }
  return `{${members.join(", ")}}`;
}

/** A standard-form polynomial as a learner would type it: descending powers, `^` for a power. */
function polyText(poly: Poly): string {
  let out = "";
  for (let power = poly.length - 1; power >= 0; power -= 1) {
    const value = poly[power] ?? 0;
    if (value === 0) {
      continue;
    }
    const magnitude = Math.abs(value);
    const body =
      power === 0
        ? `${magnitude}`
        : `${magnitude === 1 ? "" : magnitude}x${power === 1 ? "" : `^${power}`}`;
    if (out === "") {
      out = value < 0 ? `-${body}` : body;
    } else {
      out += value < 0 ? ` - ${body}` : ` + ${body}`;
    }
  }
  return out === "" ? "0" : out;
}

/** `x + 5` / `x - 5` / `3x + 5`, for a factored-form spelling. */
function linearFactorText(coefficient: number, constant: number): string {
  const lead = coefficient === 1 ? "x" : coefficient === -1 ? "-x" : `${coefficient}x`;
  return constant === 0
    ? lead
    : `${lead} ${constant < 0 ? "-" : "+"} ${Math.abs(constant)}`;
}

/** Synthetic division of `poly` by `x - root`. */
function divideByRoot(poly: Poly, root: number): { quotient: Poly; remainder: number } {
  const descending = [...poly].reverse();
  const out: number[] = [];
  let carry = 0;
  for (const coefficient of descending) {
    carry = coefficient + carry * root;
    out.push(carry);
  }
  const remainder = out.pop() ?? 0;
  return { quotient: out.reverse(), remainder };
}

/** Integer divisors of `value`, positive and negative. */
function divisors(value: number): number[] {
  const magnitude = Math.abs(value);
  const out: number[] = [];
  for (let candidate = 1; candidate <= magnitude; candidate += 1) {
    if (magnitude % candidate === 0) {
      out.push(candidate, -candidate);
    }
  }
  return out;
}

function requireSpan(spans: readonly string[], pattern: RegExp, prompt: string): string {
  const found = spans.find((span) => pattern.test(compact(span)));
  if (found === undefined) {
    throw new Error(`no span matching ${pattern} in "${prompt}"`);
  }
  return found;
}

/**
 * The right-hand side of a named span: `f(x) = 4x^{4} - 7x` compacts and gives up `4x^4-7x`.
 *
 * Everything below reads a polynomial out of a span that names it, so the name has to come off
 * before the terms can be split. Splitting on the FIRST `=` is what makes `g(x)=f(-x)` give
 * back the transformation rather than half of it.
 */
function functionBody(span: string): string {
  const compacted = compact(span);
  const index = compacted.indexOf("=");
  return index === -1 ? compacted : compacted.slice(index + 1);
}

/** One bracket of a written product, with the exponent standing on it. */
interface WrittenFactor {
  /** The bracket's own polynomial, `[c, b, a]` for `a x^2 + b x + c`. */
  poly: Poly;
  /** The exponent written on the bracket, which is 1 when none is. */
  multiplicity: number;
}

/**
 * A product as it is WRITTEN: the constant standing outside, then each bracket in page order.
 *
 * `-3(3x - 4)(x - 3)^{2}` and `\left(3x^{3} - 4\right)\left(3 + 2x^{2}\right)` are the same
 * shape once {@link compact} has taken `\left`/`\right` and the braces off, so one parser reads
 * both. Nothing here multiplies the brackets out, because the two questions asked of this
 * shape (a leading term, a roster of zeros) are the two a learner answers without expanding.
 */
function parseFactored(src: string): { constant: number; factors: WrittenFactor[] } {
  const text = compact(src);
  const factors: WrittenFactor[] = [];
  let index = 0;
  // The constant out front, which may be a bare sign (`-(x - 3)^2`) or absent altogether.
  const leading = /^[+-]?\d*/.exec(text)?.[0] ?? "";
  const constant =
    leading === "" || leading === "+" ? 1 : leading === "-" ? -1 : Number(leading);
  index = leading.length;
  while (index < text.length) {
    if (text[index] === "*") {
      index += 1;
      continue;
    }
    if (text[index] !== "(") {
      throw new Error(`unparsable factor at "${text.slice(index)}" in "${src}"`);
    }
    let depth = 0;
    let end = index;
    for (; end < text.length; end += 1) {
      if (text[end] === "(") {
        depth += 1;
      } else if (text[end] === ")") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    if (depth !== 0) {
      throw new Error(`unclosed bracket in "${src}"`);
    }
    const inner = text.slice(index + 1, end);
    index = end + 1;
    const exponent = /^\^(\d+)/.exec(text.slice(index));
    if (exponent) {
      index += exponent[0].length;
    }
    factors.push({
      poly: parsePoly(inner),
      multiplicity: exponent ? Number(exponent[1]) : 1,
    });
  }
  if (factors.length === 0) {
    throw new Error(`no bracketed factor in "${src}"`);
  }
  return { constant, factors };
}

/** The highest power carrying a coefficient, and that coefficient. */
function leadingTerm(poly: Poly): { power: number; coefficient: number } {
  for (let power = poly.length - 1; power >= 0; power -= 1) {
    if ((poly[power] ?? 0) !== 0) {
      return { power, coefficient: poly[power] as number };
    }
  }
  return { power: 0, coefficient: 0 };
}

/** A monomial as a learner types it: `-9x^3`, `x^5`, `6`. */
function monomialText(coefficient: number, power: number): string {
  const term: Poly = new Array(power + 1).fill(0);
  term[power] = coefficient;
  return polyText(term);
}

/** The single root of a linear bracket, which is the only shape these nodes' factors take. */
function factorRoot(factor: WrittenFactor, src: string): number {
  const { power, coefficient } = leadingTerm(factor.poly);
  if (power !== 1) {
    throw new Error(`factor is not linear in "${src}"`);
  }
  return -(factor.poly[0] ?? 0) / coefficient;
}

/** `x + 5` for a root of `-5`: the bracket that vanishes at `root`. */
function rootFactorText(root: number, multiplicity: number): string {
  const bracket = `(${linearFactorText(1, -root)})`;
  return multiplicity === 1 ? bracket : `${bracket}^${multiplicity}`;
}

/** The clause a described graph names its repeated zero in, which splits one prompt in two. */
const TURNS_BACK_OFF_AT = "turns back off the axis at";

/** The value a span of the form `x = -5` names. */
function namedValue(span: string, prompt: string): number {
  const compacted = compact(span);
  const match = /^x=(-?\d+)$/.exec(compacted);
  if (!match) {
    throw new Error(`span "${span}" does not name a value in "${prompt}"`);
  }
  return Number(match[1]);
}

/** Where a written quadratic's vertex sits along the x-axis: `-b / 2a`, off the page. */
function vertexX(poly: Poly, prompt: string): number {
  const a = poly[2] ?? 0;
  if (a === 0) {
    throw new Error(`not a quadratic in "${prompt}"`);
  }
  return -(poly[1] ?? 0) / (2 * a);
}

/**
 * `a(x - h)^2 + k` as its three pieces, read off the rendered text.
 *
 * {@link parseFactored} cannot take this shape: it reads a product of brackets and the `+ k`
 * standing after the square is not one, so it stops at an unparsable factor. The inner bracket
 * comes back as a polynomial rather than as an `h` so the reading stays about what is WRITTEN,
 * and a bracket that is not linear in `x` is a parse failure rather than a wrong answer.
 */
function parseVertexForm(
  src: string,
  prompt: string,
): { lead: number; inner: Poly; outside: number } {
  const match = /^([+-]?\d*)\(([^)]+)\)\^2([+-]\d+)?$/.exec(compact(src));
  if (!match) {
    throw new Error(`not a vertex form: "${src}" in "${prompt}"`);
  }
  const [, front = "", body = "", tail] = match;
  const lead = front === "" || front === "+" ? 1 : front === "-" ? -1 : Number(front);
  const inner = parsePoly(body);
  if (leadingTerm(inner).power !== 1) {
    throw new Error(`the squared bracket is not linear in "${prompt}"`);
  }
  return { lead, inner, outside: tail === undefined ? 0 : Number(tail) };
}

/**
 * Whether the prompt's own "minimum" / "maximum" agrees with the way the parabola opens.
 *
 * Returned as notes rather than folded into the answer, because the two failures are different
 * facts: an arithmetic slip gives a number the checker refuses, and this gives a number the
 * checker ACCEPTS against a question that asked for the other thing. Only the second can ship
 * silently, which is why it is worth a reading of its own.
 */
function extremeWordNotes(lead: number, prompt: string): string[] {
  const named = /\b(minimum|maximum)\b/.exec(prompt)?.[1];
  if (named === undefined) {
    return [`the prompt asks for neither a minimum nor a maximum: "${prompt}"`];
  }
  const owed = lead > 0 ? "minimum" : "maximum";
  return named === owed
    ? []
    : [
        `the prompt asks for the ${named} of a parabola whose leading coefficient is ${lead}, so it ${lead > 0 ? "opens upward and has no maximum" : "opens downward and has no minimum"}`,
      ];
}

type Deriver = (spans: string[], prompt: string) => Derivation;

const DERIVERS: Readonly<Record<string, Deriver>> = {
  "d4.pol1.combine.l1": (spans) => {
    const total = add(parsePoly(spans[0] as string), parsePoly(spans[1] as string));
    return { spellings: [polyText(total)], notes: [] };
  },

  // "takes $B$ back off an order of $A$", so the difference is the SECOND span minus the first.
  "d4.pol1.subtract.l2": (spans) => {
    const difference = subtract(
      parsePoly(spans[1] as string),
      parsePoly(spans[0] as string),
    );
    return { spellings: [polyText(difference)], notes: [] };
  },

  "d4.pol1.binomial.l2": (spans) => {
    const area = multiply(parsePoly(spans[0] as string), parsePoly(spans[1] as string));
    return { spellings: [polyText(area)], notes: [] };
  },

  "d4.pol1.leading.l3": (spans) => {
    const area = multiply(parsePoly(spans[0] as string), parsePoly(spans[1] as string));
    return { spellings: [polyText(area)], notes: [] };
  },

  // The prompt asks for the coefficient of the `xy` term of the product of the two sides.
  "d4.pol1.two-variable.l3": (spans) => {
    const first = parseBivariate(spans[0] as string);
    const second = parseBivariate(spans[1] as string);
    return { spellings: [`${first.x * second.y + first.y * second.x}`], notes: [] };
  },

  "d4.pol2.gcf.l1": (spans, prompt) => {
    const binomial = parsePoly(requireSpan(spans, /x/, prompt));
    const coefficient = binomial[1] ?? 0;
    const constant = binomial[0] ?? 0;
    const common = gcd(coefficient, constant);
    return {
      spellings: [
        `${common}(${linearFactorText(coefficient / common, constant / common)})`,
      ],
      notes: [],
    };
  },

  "d4.pol2.trinomial.l2": (spans, prompt) => {
    const trinomial = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const [constant = 0, middle = 0, lead = 0] = trinomial;
    if (lead !== 1) {
      throw new Error(`expected a monic trinomial in "${prompt}"`);
    }
    const first = divisors(constant).find(
      (candidate) => candidate + constant / candidate === middle,
    );
    if (first === undefined) {
      return { spellings: [], notes: [`does not factor over the integers: "${prompt}"`] };
    }
    const second = constant / first;
    return {
      spellings: [`(${linearFactorText(1, first)})(${linearFactorText(1, second)})`],
      notes: [],
    };
  },

  "d4.pol2.difference.l2": (spans, prompt) => {
    const expression = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const [constant = 0, middle = 0, lead = 0] = expression;
    if (middle !== 0 || constant >= 0) {
      return {
        spellings: [],
        notes: [`not a difference of two squares: "${prompt}"`],
      };
    }
    const root = Math.sqrt(lead);
    const inner = Math.sqrt(-constant);
    if (!Number.isInteger(root) || !Number.isInteger(inner)) {
      return { spellings: [], notes: [`not a difference of two squares: "${prompt}"`] };
    }
    const notes =
      gcd(root, inner) === 1
        ? []
        : [`each bracket carries a common factor of ${gcd(root, inner)}: "${prompt}"`];
    return {
      spellings: [`(${linearFactorText(root, inner)})(${linearFactorText(root, -inner)})`],
      notes,
    };
  },

  "d4.pol2.leading.l3": (spans, prompt) => {
    const trinomial = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const [constant = 0, middle = 0, lead = 0] = trinomial;
    for (const second of divisors(constant)) {
      const first = constant / second;
      // `(lead x + first)(x + second)`, which is the shape the node teaches.
      if (lead * second + first === middle && gcd(lead, first) === 1) {
        return {
          spellings: [`(${linearFactorText(lead, first)})(${linearFactorText(1, second)})`],
          notes: [],
        };
      }
    }
    return { spellings: [], notes: [`no integer factoring for "${prompt}"`] };
  },

  "d4.pol2.grouping.l3": (spans, prompt) => {
    const cubic = parsePoly(requireSpan(spans, /x\^3/, prompt));
    const [constant = 0, linear = 0, square = 0, lead = 0] = cubic;
    if (lead !== 1) {
      throw new Error(`expected a monic cubic in "${prompt}"`);
    }
    const notes =
      constant === square * linear
        ? []
        : [`grouping does not close: constant ${constant} is not ${square} x ${linear}`];
    return {
      spellings: [
        `(${linearFactorText(1, square)})(x^2 ${linear < 0 ? "-" : "+"} ${Math.abs(linear)})`,
      ],
      notes,
    };
  },

  "d4.pol3.square-root.l1": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /^x\^2=/, prompt));
    return { spellings: [solutionSetText(quadraticRoots(equation))], notes: [] };
  },

  "d4.pol3.shifted-square.l2": (spans, prompt) => {
    const span = compact(requireSpan(spans, /\)\^2=/, prompt));
    const match = /^\(x([+-])(\d+)\)\^2=(\d+)$/.exec(span);
    if (!match) {
      throw new Error(`unparsable shifted square "${span}" in "${prompt}"`);
    }
    const shift = (match[1] === "-" ? -1 : 1) * Number(match[2]);
    const right = Number(match[3]);
    // `(x + shift)^2 = right`, expanded to `x^2 + 2 shift x + shift^2 - right = 0`.
    const roots = quadraticRoots([shift * shift - right, 2 * shift, 1]);
    return { spellings: [solutionSetText(roots)], notes: [] };
  },

  "d4.pol3.factor.l2": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /=0$/, prompt));
    return { spellings: [solutionSetText(quadraticRoots(equation))], notes: [] };
  },

  // "runs $x$ along and $x + g$ across, and it covers $A$ square paces".
  "d4.pol3.area.l3": (spans, prompt) => {
    const side = parsePoly(requireSpan(spans, /^x[+-]/, prompt));
    const areaSpan = spans.find((span) => /^-?\d+$/.test(compact(span)));
    if (areaSpan === undefined) {
      throw new Error(`no stated area in "${prompt}"`);
    }
    const equation = subtract(multiply([0, 1], side), [Number(compact(areaSpan))]);
    return { spellings: [solutionSetText(quadraticRoots(equation))], notes: [] };
  },

  "d4.pol3.lost-root.l3": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /x\^2=/, prompt));
    return { spellings: [solutionSetText(quadraticRoots(equation))], notes: [] };
  },

  "d4.pol4.complete.l1": (spans, prompt) => {
    const expression = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const [constant = 0, middle = 0, lead = 0] = expression;
    if (lead !== 1 || constant !== 0) {
      throw new Error(`expected a bare monic x^2 + bx in "${prompt}"`);
    }
    return { spellings: [`${(middle / 2) ** 2}`], notes: [] };
  },

  "d4.pol4.discriminant.l2": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /=0$/, prompt));
    const [c = 0, b = 0, a = 0] = equation;
    return { spellings: [`${b * b - 4 * a * c}`], notes: [] };
  },

  // "turns $x^2 + mx + c = 0$ into $(x + h)^2 = k$": k is fixed by the two spans together.
  "d4.pol4.right-side.l2": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /^x\^2.*=0$/, prompt));
    const bracket = compact(requireSpan(spans, /\)\^2=k$/, prompt));
    const match = /^\(x([+-])(\d+)\)\^2=k$/.exec(bracket);
    if (!match) {
      throw new Error(`unparsable completed square "${bracket}" in "${prompt}"`);
    }
    const half = (match[1] === "-" ? -1 : 1) * Number(match[2]);
    const [constant = 0, middle = 0] = equation;
    const notes =
      2 * half === middle
        ? []
        : [`the stated bracket (x ${match[1]} ${match[2]}) does not complete ${middle}x`];
    return { spellings: [`${half * half - constant}`], notes };
  },

  "d4.pol4.complete-solve.l3": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /=0$/, prompt));
    return { spellings: [solutionSetText(quadraticRoots(equation))], notes: [] };
  },

  "d4.pol4.formula.l3": (spans, prompt) => {
    const equation = equationToZero(requireSpan(spans, /=0$/, prompt));
    return { spellings: [solutionSetText(quadraticRoots(equation))], notes: [] };
  },

  "d4.pol8.remainder.l1": (spans, prompt) => {
    const dividend = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const divisor = parsePoly(requireSpan(spans, /^x[+-]\d+$/, prompt));
    const root = -(divisor[0] ?? 0) / (divisor[1] ?? 1);
    return { spellings: [`${evaluate(dividend, root)}`], notes: [] };
  },

  "d4.pol8.quotient-linear.l2": (spans, prompt) => {
    const dividend = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const divisor = parsePoly(requireSpan(spans, /^x[+-]\d+$/, prompt));
    const root = -(divisor[0] ?? 0) / (divisor[1] ?? 1);
    const { quotient, remainder } = divideByRoot(dividend, root);
    return {
      spellings: [polyText(quotient)],
      notes:
        remainder === 0
          ? []
          : [`the prompt promises an exact division and leaves remainder ${remainder}`],
    };
  },

  "d4.pol8.synthetic-cubic.l2": (spans, prompt) => {
    const dividend = parsePoly(requireSpan(spans, /x\^3/, prompt));
    const divisor = parsePoly(requireSpan(spans, /^x[+-]\d+$/, prompt));
    const root = -(divisor[0] ?? 0) / (divisor[1] ?? 1);
    const { quotient, remainder } = divideByRoot(dividend, root);
    return {
      spellings: [polyText(quotient)],
      notes:
        remainder === 0
          ? []
          : [`the prompt promises an exact division and leaves remainder ${remainder}`],
    };
  },

  "d4.pol8.leading-remainder.l3": (spans, prompt) => {
    const dividend = parsePoly(requireSpan(spans, /x\^2/, prompt));
    const divisor = parsePoly(requireSpan(spans, /^x[+-]\d+$/, prompt));
    const root = -(divisor[0] ?? 0) / (divisor[1] ?? 1);
    return { spellings: [`${evaluate(dividend, root)}`], notes: [] };
  },

  "d4.pol8.missing-power.l3": (spans, prompt) => {
    const dividend = parsePoly(requireSpan(spans, /x\^3/, prompt));
    const divisor = parsePoly(requireSpan(spans, /^x[+-]\d+$/, prompt));
    const root = -(divisor[0] ?? 0) / (divisor[1] ?? 1);
    const { quotient, remainder } = divideByRoot(dividend, root);
    return {
      spellings: [polyText(quotient)],
      notes:
        remainder === 0
          ? []
          : [`the prompt promises an exact division and leaves remainder ${remainder}`],
    };
  },

  // The vertex's x-coordinate, from the two coefficients the written polynomial carries. The
  // constant term is read and deliberately unused: it slides the parabola without moving the
  // line the vertex sits on, which is the reading the shape is about.
  "d4.pol5.vertex-x-standard.l1": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    return { spellings: [`${vertexX(poly, prompt)}`], notes: [] };
  },

  /**
   * The extreme value of a written quadratic: the vertex's input, then the rule evaluated there.
   *
   * The prompt NAMES which of the two it is, so the naming is re-checked rather than ignored. A
   * prompt promising a minimum for a parabola that opens downward is a claim the text makes and
   * the coefficients refuse, and it comes back as a note rather than as a plausible number.
   */
  "d4.pol5.extreme-value-standard.l2": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    const notes = extremeWordNotes(poly[2] ?? 0, prompt);
    return { spellings: [`${evaluate(poly, vertexX(poly, prompt))}`], notes };
  },

  // The y-intercept of a quadratic written in vertex form, which is the whole rule evaluated at
  // an input of zero. Nothing is expanded, because nothing has to be.
  "d4.pol5.y-intercept-vertex-form.l2": (spans, prompt) => {
    const { lead, inner, outside } = parseVertexForm(
      functionBody(requireSpan(spans, /^f\(x\)=/, prompt)),
      prompt,
    );
    const insideAtZero = evaluate(inner, 0);
    return { spellings: [`${lead * insideAtZero ** 2 + outside}`], notes: [] };
  },

  // Where an expanded quadratic meets the x-axis, which is where its output is zero. The
  // trinomial has to be factored to get there, and a draw that does not split over the integers
  // is a note rather than a roster with a surd in it.
  "d4.pol5.x-intercepts-expanded.l3": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    const discriminant = (poly[1] ?? 0) ** 2 - 4 * (poly[2] ?? 0) * (poly[0] ?? 0);
    if (discriminant <= 0 || !Number.isInteger(Math.sqrt(discriminant))) {
      return {
        spellings: [],
        notes: [
          `the quadratic does not cross the x-axis at two integer points (discriminant ${discriminant}), so its intercepts cannot be listed as numbers`,
        ],
      };
    }
    return { spellings: [solutionSetText(quadraticRoots(poly))], notes: [] };
  },

  /**
   * The extreme value of a factored quadratic, reached the way the shape teaches it: the two
   * brackets give the crossings, the vertex sits midway between them, and the rule is evaluated
   * there. Multiplying out first would reach the same number and would not be this question.
   *
   * A midpoint that is not a whole number is a note, because the shape's key is an integer, and
   * the min/max word is re-checked against the leading coefficient exactly as at L2.
   */
  "d4.pol5.extreme-from-factored.l3": (spans, prompt) => {
    const body = functionBody(requireSpan(spans, /^f\(x\)=/, prompt));
    const { constant, factors } = parseFactored(body);
    const roots = factors.map((factor) => factorRoot(factor, body));
    const [first, second] = roots;
    if (roots.length !== 2 || first === undefined || second === undefined) {
      return {
        spellings: [],
        notes: [`expected two linear brackets in "${prompt}"`],
      };
    }
    const lead = factors.reduce(
      (total, factor) => total * leadingTerm(factor.poly).coefficient,
      constant,
    );
    const midpoint = (first + second) / 2;
    if (!Number.isInteger(midpoint)) {
      return {
        spellings: [],
        notes: [
          `the two crossings are ${first} and ${second}, whose midpoint ${midpoint} is not a whole number`,
        ],
      };
    }
    return {
      spellings: [`${lead * (midpoint - first) * (midpoint - second)}`],
      notes: extremeWordNotes(lead, prompt),
    };
  },

  // The degree is the largest power PRESENT, read off the written polynomial rather than off
  // the first term, so a draw that stopped writing in descending order is still worked right.
  "d4.pol6.degree-standard.l1": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    return { spellings: [`${leadingTerm(poly).power}`], notes: [] };
  },

  // The coefficient on the term of highest degree, which is the whole point of the shape: the
  // terms are written out of order, so this is read from the POWERS and never from position 0.
  "d4.pol6.leading-coefficient-jumbled.l2": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    return { spellings: [`${leadingTerm(poly).coefficient}`], notes: [] };
  },

  // The leading term of a written product: the exponents add and the leading coefficients
  // multiply, with the constant out front carried in. Nothing is expanded, which is the step
  // the shape teaches.
  "d4.pol6.leading-term-factored.l2": (spans, prompt) => {
    const { constant, factors } = parseFactored(
      functionBody(requireSpan(spans, /^f\(x\)=/, prompt)),
    );
    let power = 0;
    let coefficient = constant;
    for (const factor of factors) {
      const lead = leadingTerm(factor.poly);
      power += lead.power * factor.multiplicity;
      coefficient *= lead.coefficient ** factor.multiplicity;
    }
    return { spellings: [monomialText(coefficient, power)], notes: [] };
  },

  // The same reading over two brackets, one of which is written with its constant first. The
  // deriver above already reads powers rather than positions, so the two share an entry body.
  "d4.pol6.product-leading-term.l3": (spans, prompt) => {
    const { constant, factors } = parseFactored(
      functionBody(requireSpan(spans, /^f\(x\)=/, prompt)),
    );
    let power = 0;
    let coefficient = constant;
    for (const factor of factors) {
      const lead = leadingTerm(factor.poly);
      power += lead.power * factor.multiplicity;
      coefficient *= lead.coefficient ** factor.multiplicity;
    }
    return { spellings: [monomialText(coefficient, power)], notes: [] };
  },

  /**
   * One end of a transformed polynomial, worked the way the prompt asks it.
   *
   * Three readings, and all three come off the page: the original's leading term settles both
   * of its ends, the second span says which transformation was applied, and the prose says
   * which end is being asked about. `-f(x)` keeps each end where it is and turns its direction
   * over; `f(-x)` keeps each direction and swaps which end carries it.
   */
  "d4.pol6.ends-after-transform.l3": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    const { power, coefficient } = leadingTerm(poly);
    const transform = functionBody(requireSpan(spans, /^g\(x\)=/, prompt));
    const side = /at its (left|right) end/.exec(prompt)?.[1];
    if (side === undefined) {
      throw new Error(`no end named in "${prompt}"`);
    }
    const right = coefficient > 0;
    const left = power % 2 === 0 ? right : !right;
    const asked = side === "right" ? right : left;
    const other = side === "right" ? left : right;
    if (transform === "-f(x)") {
      return { spellings: [asked ? "down" : "up"], notes: [] };
    }
    if (transform === "f(-x)") {
      return { spellings: [other ? "up" : "down"], notes: [] };
    }
    throw new Error(`unrecognised transformation "${transform}" in "${prompt}"`);
  },

  // A product is zero exactly where one of its brackets is, and a repeated bracket contributes
  // its value once. The constant out front is never zero and contributes nothing.
  "d4.pol7.zeros-from-factored.l1": (spans, prompt) => {
    const body = functionBody(requireSpan(spans, /^f\(x\)=/, prompt));
    const { factors } = parseFactored(body);
    const roots = factors.map((factor) => factorRoot(factor, body));
    return {
      spellings: [solutionSetText(roots.map((value) => ({ value, text: `${value}` })))],
      notes: [],
    };
  },

  /**
   * The exponent on the bracket that vanishes at the zero the prompt NAMES, which is the one
   * reading here that can be got wrong by looking at the wrong bracket.
   *
   * A named zero that no bracket reaches is a claim the prompt makes and the numbers do not
   * support, so it comes back as a note rather than as a wrong multiplicity.
   */
  "d4.pol7.multiplicity-at-zero.l2": (spans, prompt) => {
    const body = functionBody(requireSpan(spans, /^f\(x\)=/, prompt));
    const { factors } = parseFactored(body);
    const zero = namedValue(requireSpan(spans, /^x=/, prompt), prompt);
    const carrying = factors.filter((factor) => factorRoot(factor, body) === zero);
    if (carrying.length === 0) {
      return {
        spellings: [],
        notes: [`the prompt names a zero at x = ${zero} that no factor reaches`],
      };
    }
    const multiplicity = carrying.reduce((total, factor) => total + factor.multiplicity, 0);
    return { spellings: [`${multiplicity}`], notes: [] };
  },

  // One fewer than the degree, and the degree is the sum of the exponents over the brackets
  // rather than the number of brackets.
  "d4.pol7.turning-points-max.l2": (spans, prompt) => {
    const { factors } = parseFactored(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    const degree = factors.reduce(
      (total, factor) => total + leadingTerm(factor.poly).power * factor.multiplicity,
      0,
    );
    return { spellings: [`${degree - 1}`], notes: [] };
  },

  /**
   * The zeros of an EXPANDED cubic, which has to be factored before any of them can be read.
   *
   * The common factor of `x` is taken out first, exactly as the shape teaches, and the zero it
   * contributes is kept rather than divided away. What is left is a quadratic, so
   * {@link quadraticRoots} finishes it; a quadratic that does not split over the integers is
   * reported as a note, because "list the numbers only" cannot be answered with a surd.
   */
  "d4.pol7.zeros-from-expanded.l3": (spans, prompt) => {
    const poly = parsePoly(functionBody(requireSpan(spans, /^f\(x\)=/, prompt)));
    const roots: { value: number; text: string }[] = [];
    let remaining = poly;
    while (remaining.length > 1 && (remaining[0] ?? 0) === 0) {
      roots.push({ value: 0, text: "0" });
      remaining = remaining.slice(1);
    }
    if (remaining.length - 1 !== 2) {
      return {
        spellings: [],
        notes: [
          `taking the common factor out leaves degree ${remaining.length - 1}, which this shape cannot solve`,
        ],
      };
    }
    const discriminant =
      (remaining[1] ?? 0) ** 2 - 4 * (remaining[2] ?? 0) * (remaining[0] ?? 0);
    if (!Number.isInteger(Math.sqrt(discriminant))) {
      return {
        spellings: [],
        notes: [
          `the quadratic left behind does not split over the integers (discriminant ${discriminant}), so its zeros cannot be listed as numbers`,
        ],
      };
    }
    roots.push(...quadraticRoots(remaining));
    return { spellings: [solutionSetText(roots)], notes: [] };
  },

  /**
   * The polynomial built back up from a described graph, which is the reading run backwards.
   *
   * Every piece is read from the prose: the leading coefficient, the three zeros in the order
   * they are named, and which of them the graph turns back off. That zero takes the exponent
   * two and the other two take one, which is the least degree the description allows. A named
   * turning point that is not one of the three zeros is a note, since no bracket could carry it.
   */
  "d4.pol7.build-from-graph.l3": (spans, prompt) => {
    // Read by SENTENCE rather than by position in the whole prompt: the turning zero is one of
    // the three and so is named twice, and counting spans across the prompt would make the
    // answer depend on which end of it the repeat fell. The clause that states the roster and
    // the clause that states the turning zero hold their own spans.
    const [described = "", afterwards = ""] = prompt.split(TURNS_BACK_OFF_AT);
    const described_spans = mathSpans(described);
    const lead = Number(compact(described_spans[0] ?? ""));
    const roster = described_spans.slice(1).map((span) => namedValue(span, prompt));
    const turningSpan = mathSpans(afterwards)[0];
    if (!Number.isFinite(lead) || roster.length !== 3 || turningSpan === undefined) {
      throw new Error(`no leading coefficient, roster or turning zero in "${prompt}"`);
    }
    const turning = namedValue(turningSpan, prompt);
    if (!roster.includes(turning)) {
      return {
        spellings: [],
        notes: [
          `the prompt turns the graph back off the axis at x = ${turning}, which is not one of its zeros`,
        ],
      };
    }
    const written = roster
      .map((zero) => rootFactorText(zero, zero === turning ? 2 : 1))
      .join("");
    const front = lead === 1 ? "" : lead === -1 ? "-" : `${lead}`;
    return { spellings: [`${front}${written}`], notes: [] };
  },
};

/** Every template id this module can re-derive, so a sweep can floor its own coverage. */
export const DERIVABLE_TEMPLATE_IDS: readonly string[] = Object.keys(DERIVERS);

export function deriveFromPrompt(item: FrozenItem): Derivation {
  const deriver = DERIVERS[item.template_id];
  if (!deriver) {
    throw new Error(`no prompt deriver for ${item.template_id}`);
  }
  return deriver(mathSpans(item.prompt), item.prompt);
}
