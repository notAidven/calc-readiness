import {
  exactRadianAnswer,
  exactTrigValueAnswer,
  type ItemTemplate,
  multipleChoiceAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";

/**
 * TRG.6 practice templates: where the last four functions have no value, and how fast each
 * of them repeats. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, as
 * `docs/D9_Domain_Plan.md` fixes them:
 *
 *  - L1  the period of $a\tan(bx)$, in exact radians;
 *  - L2a the asymptote headings of a tangent or a reciprocal over $[0, 360)$, in degrees;
 *  - L2b whether secant has a value at a named heading, as one word;
 *  - L3a the exact secant, cosecant or cotangent at a special heading, rationalized;
 *  - L3b the smallest positive asymptote of $\tan(bx)$, in exact radians.
 *
 * ## The radian / degree split, which is the plan's spike applied
 *
 * **A solution-set roster cannot hold pi.** The failure is at the KEY rather than at the
 * submission: the checker reports `scoring_error/invalid_answer_key`, which makes the item
 * unauthorable rather than the learner wrong. So the two asymptote shapes here answer in
 * different units on purpose. A SINGLE asymptote is asked in exact radians through
 * `exactRadianAnswer` (`asymptote-radian.l3`), and a ROSTER of them is asked in degrees
 * through `solutionSetAnswer` (`asymptote-degree.l2`). There is no radian roster in this
 * file and there cannot be one.
 *
 * **`exactTrigValueAnswer` rejects a radical denominator as `not_simplified`**, which is
 * exactly the rationalization TRG.2 teaches and this node reuses. Against a key of
 * `2sqrt(3)/3` the answer `2/sqrt(3)` is a FORM miss rather than a value miss, so
 * `reciprocal-exact.l3` says in as many words that it wants the rationalized form, and every
 * root it names is written `sqrt(...)` because `sqrt3` is `invalid_input/unknown_symbol`.
 *
 * **`secant-defined.l2`'s two options are byte-exact.** `multipleChoiceAnswer` matches the
 * key as a string, so the prompt prints the two words the field will take, `defined` and
 * `undefined`, with nothing else offered.
 *
 * ## Why no hint in this file carries a digit, a slash, or the letters p and i in sequence
 *
 * `hint_leaks_answer` strips whitespace from a hint and looks for the answer key inside it,
 * bounded only by digits. Three of the five keys here are short pi fractions, one is a
 * radical carrying digits, and one is the single word `undefined`, which also contains the
 * other option `defined` as a substring. So a hint naming any of those would leak on exactly
 * the draws whose answer it happened to name and pass on every other, which is a defect
 * whose discovery depends on the seed. Every hint below names the rule in words and never
 * substitutes into it, which is also what R13 asks for: no digit, no slash, no `sqrt`, and
 * neither of the two option words anywhere in this file's hints.
 *
 * ## Era framing (era 10, Cyberpunk)
 *
 * `getEraOfNode("TRG.6")` resolves to era 10, whose style guide gives this node a dish
 * tracking toward the horizon: the correction growing without limit as the beam approaches
 * the flat, and the asymptote as a physical impossibility rather than a feature of a curve.
 * The same guide **forbids framing a trig lesson as a waveform on a monitor** and names this
 * node as one of the two where the temptation is highest, so nothing here is set at a
 * display. Four of the five shapes hand the learner a rule and are left abstract, because a
 * lead-in in front of "give the period of this rule" changes nothing about the mathematics.
 * The one shape that becomes a GENUINE word problem is `secant-defined.l2`, whose question
 * is about a piece of equipment reporting a value or an error, and its story is drawn only
 * for `form === "practice"` and is not stored in `template_params`, so the assessment forms
 * stay neutral and the worked-solution figures are driven by the mathematics alone.
 *
 * ## Seeding
 *
 * The shapes are seeded from Lippman and Rasmussen, *Precalculus: An Investigation of
 * Functions* 2nd ed. (opentextbookstore.com), section 6.2 "Graphs of the Other Trig
 * Functions", whose exercise set works period, asymptotes and the reciprocal graphs off
 * $\tan$, $\sec$, $\csc$ and $\cot$ with a coefficient inside, and section 5.4 "The Other
 * Trigonometric Functions", which is where the exact reciprocal values at special angles
 * come from. The seeds set the SHAPES only. The extracted PDF text flattens the notation
 * past being readable, so every value here was re-derived by hand off the unit circle, and
 * the shapes are diversified off the source: the roster shape carries four functions rather
 * than tangent alone, the exact-value shape draws from all four quadrants rather than the
 * first, and both radian shapes state the units the answer field will take.
 *
 * Every template declares a `varietyKey` over the numbers that fix the QUESTION, so a cell
 * cannot freeze two draws that reduce to the same thing.
 */

export const TRG6_NODE = "TRG.6";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

/** The four functions this node breaks, in the order the numeric `fn` param indexes them. */
const FUNCTION_NAMES = ["tan", "cot", "sec", "csc"] as const;

type FunctionName = (typeof FUNCTION_NAMES)[number];

/** Which reading sits underneath each one, which is the reading whose zeros break it. */
const BOTTOM_READING: Record<FunctionName, "sine" | "cosine"> = {
  tan: "cosine",
  cot: "sine",
  sec: "cosine",
  csc: "sine",
};

/**
 * A multiple of pi in the ASCII the answer field reads, e.g. `pi/6`.
 *
 * Written in lowest terms because that is the tidiest spelling of the key. The checker does
 * not require lowest terms of a submission, and no prompt in this file asks for them.
 */
function radianKey(num: number, den: number): string {
  const factor = gcd(num, den);
  const n = num / factor;
  const d = den / factor;
  const head = n === 1 ? "pi" : `${n}pi`;
  return d === 1 ? head : `${head}/${d}`;
}

/** The same multiple of pi as LaTeX, for a prompt or a worked-solution step. */
function radianTex(num: number, den: number): string {
  const factor = gcd(num, den);
  const n = num / factor;
  const d = den / factor;
  const head = n === 1 ? "\\pi" : `${n}\\pi`;
  return d === 1 ? head : `\\dfrac{${head}}{${d}}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** The answer key for a roster: ascending, comma separated, braced. Order is free. */
function roster(headings: readonly number[]): string {
  return `{${[...headings].sort((a, b) => a - b).join(", ")}}`;
}

/**
 * The same roster typeset, for a worked-solution step.
 *
 * It carries the degree marks the prompt asks the learner to FIND, which the answer field
 * refuses on the way back in: `{90°, 270°}` is `invalid_input/parse_error` and
 * `{90 degrees, 270 degrees}` is `invalid_input/unknown_symbol`, both scored as a format
 * failure rather than as a wrong answer. So the closing step pairs it with {@link roster},
 * which is the spelling the field takes.
 */
function rosterTex(headings: readonly number[]): string {
  return `\\{${[...headings]
    .sort((a, b) => a - b)
    .map((h) => `${h}^{\\circ}`)
    .join(",\\; ")}\\}`;
}

/** `y = a tan(bx)` and friends as LaTeX, with a coefficient of one left unprinted. */
function ruleTex(a: number, b: number, fn: FunctionName): string {
  const inside = b === 1 ? "x" : `${b}x`;
  const head = a === 1 ? "" : `${a}`;
  return `y = ${head}\\${fn}(${inside})`;
}

/* -------------------------------------------------------------------------- */
/* L1: the period of a tan(bx), in exact radians                               */
/* -------------------------------------------------------------------------- */

/**
 * L1, half a turn shared out by the coefficient inside.
 *
 * The tier's whole content is knowing that a tangent starts from HALF a turn where a sine
 * starts from a whole one, so the coefficient in front is present on every draw as the
 * distractor a learner may divide by, and $b$ never draws $1$: a period of a bare $\pi$ is
 * reached without dividing anything.
 */
export const d9_trg6_tangent_period_l1: ItemTemplate = {
  template_id: "d9.trg6.tangent-period.l1",
  node_id: TRG6_NODE,
  difficulty: 1,
  concept: "period-of-a-squeezed-tangent",
  generate(rng: Rng) {
    const b = rng.int(2, 12);
    const a = rng.int(2, 9);
    const rule = ruleTex(a, b, "tan");

    return {
      prompt: `For $${rule}$, give the period. Give an exact answer in terms of pi, not a decimal.`,
      answer: exactRadianAnswer(radianKey(1, b)),
      params: { a, b },
      hints: [
        "One cycle of a tangent runs from one break to the next, and a plain tangent breaks twice as often as a sine does: it comes back to itself after half a turn rather than after a whole one.",
        "The coefficient sitting with $x$ inside the function runs the argument through that half turn faster, by exactly its own size. So share the half turn out by that coefficient.",
        "The coefficient standing in front of the function is not part of this. It stretches the branches up and down and leaves the horizontal spacing of the breaks alone.",
      ],
      worked_solution: [
        `The coefficient sitting with $x$ inside the function is $${b}$, so the inside reads $${b}x$.`,
        `A tangent finishes one whole cycle while its inside covers half a turn, which is $\\pi$, so a cycle ends where $${b}x = \\pi$.`,
        `Dividing both sides by $${b}$ puts that at $x = \\dfrac{\\pi}{${b}}$.`,
        `The coefficient $${a}$ out in front stretches the branches vertically and moves no break, so the period is $${radianTex(1, b)}$.`,
      ],
    };
  },
  // Keyed on the inside coefficient alone: the period does not depend on the coefficient in
  // front, so two draws sharing a `b` are the same question asked twice.
  varietyKey: (params) => `${params.b ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2a: the asymptote headings over one turn, in degrees                       */
/* -------------------------------------------------------------------------- */

/** The window every roster is listed over, printed in both the prompt and the solution. */
const WINDOW = "0^{\\circ} \\le x < 360^{\\circ}";

/**
 * Every heading in $[0, 360)$ at which `fn(b x)` breaks.
 *
 * Tangent and secant break where the cosine underneath them is zero, which is a quarter turn
 * and then every half turn after it; cotangent and cosecant break where the sine is zero,
 * which is at the start and then every half turn after that. Dividing by $b$ is what turns
 * the argument's breaks into the graph's.
 */
function breakHeadings(fn: FunctionName, b: number): number[] {
  const first = BOTTOM_READING[fn] === "cosine" ? 90 : 0;
  const out: number[] = [];
  for (let k = 0; first + 180 * k < 360 * b; k += 1) {
    out.push((first + 180 * k) / b);
  }
  return out;
}

/**
 * L2a, the roster shape, and the reason it is in DEGREES.
 *
 * A roster cannot hold pi under any builder: the plan measured `{pi/2, 3pi/2}` as
 * `scoring_error/invalid_answer_key`, so the item would be unauthorable rather than merely
 * awkward. In degrees the whole path works, so this shape asks its window and its answer in
 * degrees and `asymptote-radian.l3` carries the radians instead.
 *
 * All four functions are drawn, because "where does it break" has two different answers and
 * a shape that only ever asked tangent would teach one of them as the rule.
 */
export const d9_trg6_asymptote_degree_l2: ItemTemplate = {
  template_id: "d9.trg6.asymptote-degree.l2",
  node_id: TRG6_NODE,
  difficulty: 2,
  concept: "roster-of-asymptote-headings",
  generate(rng: Rng) {
    const fnIndex = rng.int(0, 3);
    const fn = FUNCTION_NAMES[fnIndex] ?? "tan";
    const b = rng.int(1, 2);
    const headings = breakHeadings(fn, b);
    const bottom = BOTTOM_READING[fn];
    const argument = b === 1 ? "x" : `${b}x`;
    const firstZero = bottom === "cosine" ? "90^{\\circ}" : "0^{\\circ}";
    const rule = ruleTex(1, b, fn);

    const argumentStep =
      b === 1
        ? `Here the argument is just $x$, so those are the headings themselves.`
        : `Here the argument is $${b}x$, so each of those has to be divided by $${b}$ to say where $x$ is, and dividing brings more of them inside the window.`;

    return {
      prompt: `Give every heading in $${WINDOW}$ at which $${rule}$ has a vertical asymptote. List the headings in degrees, and write the numbers only with no degree sign.`,
      answer: solutionSetAnswer(roster(headings)),
      params: { fn: fnIndex, b },
      hints: [
        "A vertical asymptote sits where the function has no value at all, and each of these four is a fraction whose bottom is either the sine or the cosine. Decide which of the two sits underneath this one before anything else.",
        "That reading is zero at two headings in a turn, half a turn apart. Set the whole argument to the first of them, not $x$ on its own.",
        "Work every solution the ARGUMENT has first, going up by half a turn each time, and only then divide by the coefficient sitting with $x$. Keep going until dividing carries you past the end of the window.",
      ],
      worked_solution: [
        `Written as a fraction, this function has the ${bottom} underneath it, so it breaks exactly where the ${bottom} of its argument is zero.`,
        `The ${bottom} is zero at $${firstZero}$ and then every half turn after that, so the argument $${argument}$ has to equal $${firstZero}$, then that plus $180^{\\circ}$, and so on.`,
        argumentStep,
        `Keeping only the headings inside $${WINDOW}$ leaves $${rosterTex(headings)}$, typed as ${roster(headings)}.`,
      ],
    };
  },
  // Keyed on the function and the inside coefficient, which are the two things that fix the
  // roster. Nothing else in the draw changes the answer.
  varietyKey: (params) => `${params.fn ?? 0}:${params.b ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2b: whether secant has a value at a named heading                          */
/* -------------------------------------------------------------------------- */

/** Headings where the cosine is not zero, so secant reports an ordinary value. */
const SECANT_WORKS = [0, 30, 45, 135, 180, 210, 240, 315, 330] as const;

/** The only two headings in a turn where the cosine is zero. */
const SECANT_BREAKS = [90, 270] as const;

/** The cosine at each heading this shape draws, as LaTeX, for the worked solution. */
const COSINE_AT: Record<number, string> = {
  0: "1",
  30: "\\dfrac{\\sqrt{3}}{2}",
  45: "\\dfrac{\\sqrt{2}}{2}",
  90: "0",
  135: "-\\dfrac{\\sqrt{2}}{2}",
  180: "-1",
  210: "-\\dfrac{\\sqrt{3}}{2}",
  240: "-\\dfrac{1}{2}",
  270: "0",
  315: "\\dfrac{\\sqrt{2}}{2}",
  330: "\\dfrac{\\sqrt{3}}{2}",
};

/**
 * L2b, one word, and the word is the equipment's own.
 *
 * Half the draws break and half do not, drawn in that order so a learner cannot answer the
 * cell by always saying the same thing. Five of the nine working headings sit in the half of
 * the circle where the cosine is NEGATIVE, which is the misconception this shape is for: a
 * negative reading turns over perfectly well, and only a zero one does not.
 *
 * `multipleChoiceAnswer` compares the key as a string, so the prompt prints the two words
 * the field takes and offers nothing else.
 *
 * This is the one shape on the node the era's framing makes a genuine word problem, because
 * the question really is what a piece of equipment does at a heading it cannot report from.
 * The story is drawn only for the practice form and after the mathematics, so the assessment
 * forms stay byte-identical and `template_params` carries no trace of it.
 */
export const d9_trg6_secant_defined_l2: ItemTemplate = {
  template_id: "d9.trg6.secant-defined.l2",
  node_id: TRG6_NODE,
  difficulty: 2,
  concept: "where-a-reciprocal-has-no-value",
  generate(rng: Rng, context) {
    const broken = rng.int(0, 1) === 1;
    const degrees = broken
      ? (SECANT_BREAKS[rng.int(0, SECANT_BREAKS.length - 1)] ?? 90)
      : (SECANT_WORKS[rng.int(0, SECANT_WORKS.length - 1)] ?? 0);
    const cosine = COSINE_AT[degrees] ?? "1";
    const themed = context?.form === "practice";

    const question = `is $\\sec ${degrees}^{\\circ}$ defined or undefined? Answer with one word: defined or undefined.`;
    const prompt = themed
      ? `A dish mount carries a meter that reports the secant at whatever heading it is pointed at, and at some headings it reports an error rather than a number. Pointed at $${degrees}^{\\circ}$, ${question}`
      : `At $${degrees}^{\\circ}$, ${question}`;

    return {
      prompt,
      answer: multipleChoiceAnswer(broken ? "undefined" : "defined"),
      params: { degrees, broken: broken ? 1 : 0 },
      hints: [
        themed
          ? "The meter is reporting one over the cosine, so the only thing that decides this is the cosine at the heading it is pointed at. Work that reading out first."
          : "Secant is one over the cosine, so the only thing that decides this is the cosine at that heading. Work that reading out first.",
        "Now ask whether that reading is zero. Nothing at all divides into zero, so a heading whose cosine is zero has no secant to report, and every other reading turns over perfectly well however small or negative it happens to be.",
      ],
      worked_solution: [
        `Secant is the reciprocal of the cosine: $\\sec\\theta = \\dfrac{1}{\\cos\\theta}$.`,
        `At $${degrees}^{\\circ}$ the cosine is $${cosine}$.`,
        broken
          ? `Nothing divides into $0$, so there is no value for $\\dfrac{1}{0}$ and the graph runs away on both sides of this heading.`
          : `That reading is not zero, so turning it over gives an ordinary number, and its sign carries straight through the reciprocal.`,
        broken
          ? `So $\\sec ${degrees}^{\\circ}$ is undefined.`
          : `So $\\sec ${degrees}^{\\circ}$ is defined.`,
      ],
    };
  },
  varietyKey: (params) => `${params.degrees ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3a: the exact reciprocal value at a special heading, rationalized          */
/* -------------------------------------------------------------------------- */

interface ExactEntry {
  fn: "sec" | "csc" | "cot";
  degrees: number;
  /** The reference angle, in degrees. */
  reference: number;
  /** The reading underneath the reciprocal, as LaTeX. */
  bottom: string;
  /** The reading ON TOP, set only for cotangent, which is a quotient of two readings. */
  top?: string;
  /** The answer key, in the ASCII the answer field reads. */
  key: string;
  /** The same value as LaTeX. */
  tex: string;
  /** The unrationalized spelling the reciprocal lands on first, or null when there is none. */
  raw: string | null;
}

/**
 * Every draw this shape can make, and every one of them carries a root.
 *
 * The integer-valued entries are deliberately absent. `\sec 60^{\circ} = 2` and
 * `\cot 45^{\circ} = 1` are correct and they are the two draws on which the prompt's
 * instruction to rationalize would describe work the item does not contain, and a key of `1`
 * would additionally forbid a standalone `1` anywhere in the hints, which are shared across
 * every draw. Dropping them costs the tier nothing and keeps the instruction honest.
 *
 * Two thirds of the entries are outside the first quadrant, because a reference angle plus a
 * sign is the whole of what makes this L3 rather than a table lookup.
 */
const EXACT_VALUES: readonly ExactEntry[] = [
  // Secant: one over the cosine.
  {
    fn: "sec",
    degrees: 30,
    reference: 30,
    bottom: "\\dfrac{\\sqrt{3}}{2}",
    key: "2sqrt(3)/3",
    tex: "\\dfrac{2\\sqrt{3}}{3}",
    raw: "\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "sec",
    degrees: 45,
    reference: 45,
    bottom: "\\dfrac{\\sqrt{2}}{2}",
    key: "sqrt(2)",
    tex: "\\sqrt{2}",
    raw: "\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "sec",
    degrees: 135,
    reference: 45,
    bottom: "-\\dfrac{\\sqrt{2}}{2}",
    key: "-sqrt(2)",
    tex: "-\\sqrt{2}",
    raw: "-\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "sec",
    degrees: 150,
    reference: 30,
    bottom: "-\\dfrac{\\sqrt{3}}{2}",
    key: "-2sqrt(3)/3",
    tex: "-\\dfrac{2\\sqrt{3}}{3}",
    raw: "-\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "sec",
    degrees: 210,
    reference: 30,
    bottom: "-\\dfrac{\\sqrt{3}}{2}",
    key: "-2sqrt(3)/3",
    tex: "-\\dfrac{2\\sqrt{3}}{3}",
    raw: "-\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "sec",
    degrees: 225,
    reference: 45,
    bottom: "-\\dfrac{\\sqrt{2}}{2}",
    key: "-sqrt(2)",
    tex: "-\\sqrt{2}",
    raw: "-\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "sec",
    degrees: 315,
    reference: 45,
    bottom: "\\dfrac{\\sqrt{2}}{2}",
    key: "sqrt(2)",
    tex: "\\sqrt{2}",
    raw: "\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "sec",
    degrees: 330,
    reference: 30,
    bottom: "\\dfrac{\\sqrt{3}}{2}",
    key: "2sqrt(3)/3",
    tex: "\\dfrac{2\\sqrt{3}}{3}",
    raw: "\\dfrac{2}{\\sqrt{3}}",
  },
  // Cosecant: one over the sine.
  {
    fn: "csc",
    degrees: 45,
    reference: 45,
    bottom: "\\dfrac{\\sqrt{2}}{2}",
    key: "sqrt(2)",
    tex: "\\sqrt{2}",
    raw: "\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "csc",
    degrees: 60,
    reference: 60,
    bottom: "\\dfrac{\\sqrt{3}}{2}",
    key: "2sqrt(3)/3",
    tex: "\\dfrac{2\\sqrt{3}}{3}",
    raw: "\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "csc",
    degrees: 120,
    reference: 60,
    bottom: "\\dfrac{\\sqrt{3}}{2}",
    key: "2sqrt(3)/3",
    tex: "\\dfrac{2\\sqrt{3}}{3}",
    raw: "\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "csc",
    degrees: 135,
    reference: 45,
    bottom: "\\dfrac{\\sqrt{2}}{2}",
    key: "sqrt(2)",
    tex: "\\sqrt{2}",
    raw: "\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "csc",
    degrees: 225,
    reference: 45,
    bottom: "-\\dfrac{\\sqrt{2}}{2}",
    key: "-sqrt(2)",
    tex: "-\\sqrt{2}",
    raw: "-\\dfrac{2}{\\sqrt{2}}",
  },
  {
    fn: "csc",
    degrees: 240,
    reference: 60,
    bottom: "-\\dfrac{\\sqrt{3}}{2}",
    key: "-2sqrt(3)/3",
    tex: "-\\dfrac{2\\sqrt{3}}{3}",
    raw: "-\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "csc",
    degrees: 300,
    reference: 60,
    bottom: "-\\dfrac{\\sqrt{3}}{2}",
    key: "-2sqrt(3)/3",
    tex: "-\\dfrac{2\\sqrt{3}}{3}",
    raw: "-\\dfrac{2}{\\sqrt{3}}",
  },
  {
    fn: "csc",
    degrees: 315,
    reference: 45,
    bottom: "-\\dfrac{\\sqrt{2}}{2}",
    key: "-sqrt(2)",
    tex: "-\\sqrt{2}",
    raw: "-\\dfrac{2}{\\sqrt{2}}",
  },
  // Cotangent: the cosine over the sine, so it is already a quotient of two readings.
  {
    fn: "cot",
    degrees: 30,
    reference: 30,
    top: "\\dfrac{\\sqrt{3}}{2}",
    bottom: "\\dfrac{1}{2}",
    key: "sqrt(3)",
    tex: "\\sqrt{3}",
    raw: null,
  },
  {
    fn: "cot",
    degrees: 60,
    reference: 60,
    top: "\\dfrac{1}{2}",
    bottom: "\\dfrac{\\sqrt{3}}{2}",
    key: "sqrt(3)/3",
    tex: "\\dfrac{\\sqrt{3}}{3}",
    raw: "\\dfrac{1}{\\sqrt{3}}",
  },
  {
    fn: "cot",
    degrees: 120,
    reference: 60,
    top: "-\\dfrac{1}{2}",
    bottom: "\\dfrac{\\sqrt{3}}{2}",
    key: "-sqrt(3)/3",
    tex: "-\\dfrac{\\sqrt{3}}{3}",
    raw: "-\\dfrac{1}{\\sqrt{3}}",
  },
  {
    fn: "cot",
    degrees: 150,
    reference: 30,
    top: "-\\dfrac{\\sqrt{3}}{2}",
    bottom: "\\dfrac{1}{2}",
    key: "-sqrt(3)",
    tex: "-\\sqrt{3}",
    raw: null,
  },
  {
    fn: "cot",
    degrees: 210,
    reference: 30,
    top: "-\\dfrac{\\sqrt{3}}{2}",
    bottom: "-\\dfrac{1}{2}",
    key: "sqrt(3)",
    tex: "\\sqrt{3}",
    raw: null,
  },
  {
    fn: "cot",
    degrees: 240,
    reference: 60,
    top: "-\\dfrac{1}{2}",
    bottom: "-\\dfrac{\\sqrt{3}}{2}",
    key: "sqrt(3)/3",
    tex: "\\dfrac{\\sqrt{3}}{3}",
    raw: "\\dfrac{1}{\\sqrt{3}}",
  },
  {
    fn: "cot",
    degrees: 300,
    reference: 60,
    top: "\\dfrac{1}{2}",
    bottom: "-\\dfrac{\\sqrt{3}}{2}",
    key: "-sqrt(3)/3",
    tex: "-\\dfrac{\\sqrt{3}}{3}",
    raw: "-\\dfrac{1}{\\sqrt{3}}",
  },
  {
    fn: "cot",
    degrees: 330,
    reference: 30,
    top: "\\dfrac{\\sqrt{3}}{2}",
    bottom: "-\\dfrac{1}{2}",
    key: "-sqrt(3)",
    tex: "-\\sqrt{3}",
    raw: null,
  },
];

/** The reading the reciprocal is built on, named in words. */
const BUILT_ON: Record<"sec" | "csc" | "cot", string> = {
  sec: "cosine",
  csc: "sine",
  cot: "cosine over the sine",
};

/** Numeric codes for the three functions, so `template_params` stays numbers only. */
const EXACT_FN_CODE: Record<"sec" | "csc" | "cot", number> = { sec: 0, csc: 1, cot: 2 };

/**
 * The answer key read back as three numbers, so `template_params` can carry the SHAPE of the
 * value and the worked-solution figure can redraw it without a table of its own.
 *
 * Every key this shape produces is $\pm\dfrac{c\sqrt{r}}{d}$ with $c$ and $d$ small, which is
 * what the pattern requires; a key that did not match would fall back to the whole value
 * being unreadable rather than silently wrong, so the defaults below are deliberately
 * impossible values rather than plausible ones.
 */
function radicalShape(key: string): { coeff: number; radicand: number; den: number } {
  const match = /^-?(\d*)sqrt\((\d)\)(?:\/(\d))?$/.exec(key);
  if (match === null) {
    return { coeff: 0, radicand: 0, den: 0 };
  }
  return {
    coeff: match[1] === "" || match[1] === undefined ? 1 : Number(match[1]),
    radicand: Number(match[2]),
    den: match[3] === undefined ? 1 : Number(match[3]),
  };
}

/**
 * L3a, the exact value, with the rationalization the checker enforces.
 *
 * `exactTrigValueAnswer` grades `2/sqrt(3)` against key `2sqrt(3)/3` as `not_simplified`
 * rather than as a value miss, so the form is part of the question and the prompt says so.
 * It also refuses a decimal outright, so nothing here invites rounding.
 *
 * The same profile requires a square-free radicand as well, and the prompt asked for the
 * rationalization without ever asking for that: `2sqrt(12)/6` is exactly equal to the key
 * `2sqrt(3)/3`, carries no root in its denominator and is not a decimal, and was still
 * refused as `not_simplified`. The prompt now names the perfect square too.
 */
export const d9_trg6_reciprocal_exact_l3: ItemTemplate = {
  template_id: "d9.trg6.reciprocal-exact.l3",
  node_id: TRG6_NODE,
  difficulty: 3,
  concept: "exact-reciprocal-value-rationalized",
  generate(rng: Rng) {
    const entry =
      EXACT_VALUES[rng.int(0, EXACT_VALUES.length - 1)] ?? (EXACT_VALUES[0] as ExactEntry);
    const { fn, degrees, reference, top, bottom, key, tex, raw } = entry;
    const negative = key.startsWith("-");

    const readingStep =
      fn === "cot"
        ? `At $${degrees}^{\\circ}$ the cosine is $${top ?? bottom}$ and the sine is $${bottom}$, the reference angle giving each size and the quadrant each sign.`
        : `At $${degrees}^{\\circ}$ the ${BUILT_ON[fn]} is $${bottom}$, the reference angle giving its size and the quadrant its sign.`;

    const rationalizeStep =
      raw === null
        ? `Nothing is left underneath that quotient, so there is no root to move and the value is already in the form the answer field wants.`
        : `That leaves $${raw}$, which carries a root underneath. Multiplying the top and the bottom by that root is multiplying by one, so the value is unchanged, and it moves the root up: the tidied form is $${tex}$.`;

    return {
      prompt: `Give the exact value of $\\${fn} ${degrees}^{\\circ}$. Give an exact answer rather than a decimal, write any root as sqrt(...) simplified so that no perfect square is left under it, and rationalize the answer so no root is left in the denominator.`,
      answer: exactTrigValueAnswer(key),
      params: {
        fn: EXACT_FN_CODE[fn],
        degrees,
        reference,
        negative: negative ? 1 : 0,
        rationalized: raw === null ? 0 : 1,
        ...radicalShape(key),
      },
      hints: [
        `This is built from the ${BUILT_ON[fn]}, so work that reading out at the heading first and leave the reciprocal until you have it.`,
        "Take the heading back to its reference angle in the first quadrant to get the size of the reading, then let the quadrant decide the sign, since the sign carries straight through a reciprocal unchanged.",
        "Turning a fraction over swaps its top and its bottom, which often leaves a root sitting underneath. Multiply the top and the bottom by that root to move it up: that is multiplying by one, so the value does not change, and it is the form the answer field will take.",
      ],
      worked_solution: [
        `Take the heading back to the first quadrant: the reference angle for $${degrees}^{\\circ}$ is $${reference}^{\\circ}$.`,
        readingStep,
        fn === "cot"
          ? `Cotangent is $\\dfrac{\\cos\\theta}{\\sin\\theta}$, so divide the first reading by the second, and the halves they share cancel.`
          : `${fn === "sec" ? "Secant" : "Cosecant"} is one over that reading, so turn it over.`,
        rationalizeStep,
        `So $\\${fn} ${degrees}^{\\circ} = ${tex}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.fn ?? 0}:${params.degrees ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3b: the smallest positive asymptote of tan(bx), in exact radians           */
/* -------------------------------------------------------------------------- */

/**
 * The coefficients this shape draws from.
 *
 * $1$ is absent because its answer is a bare quarter turn, reached without dividing
 * anything, and $3$ is absent because the lesson's own check-for-understanding is
 * $\tan(3x)$ and a practice item must not re-ask the question the learner has just been
 * walked through.
 */
const FIRST_ASYMPTOTE_COEFFICIENTS = [2, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * L3b, the single asymptote, and the reason it is in RADIANS.
 *
 * `exactRadianAnswer` grades a single multiple of pi exactly, so this is the half of the
 * split that can carry radians: `pi/8`, `1pi/8` and `2pi/16` all pass and `0.3927` is
 * `wrong_representation`, which is why the prompt asks for an exact answer and says it does
 * not want a decimal.
 *
 * It is L3 rather than a twin of `tangent-period.l1` because the two questions divide
 * different things. The period divides a HALF turn by the coefficient; this divides a
 * QUARTER turn, because the first break of a tangent comes half a cycle in rather than at
 * the end of one, and a learner who has learned the period rule and stopped will answer
 * twice the right value.
 */
export const d9_trg6_asymptote_radian_l3: ItemTemplate = {
  template_id: "d9.trg6.asymptote-radian.l3",
  node_id: TRG6_NODE,
  difficulty: 3,
  concept: "first-positive-asymptote-in-radians",
  generate(rng: Rng) {
    const b =
      FIRST_ASYMPTOTE_COEFFICIENTS[rng.int(0, FIRST_ASYMPTOTE_COEFFICIENTS.length - 1)] ??
      2;
    const a = rng.int(2, 9);
    const rule = ruleTex(a, b, "tan");

    return {
      prompt: `For $${rule}$, give the smallest positive value of $x$ at which the graph has a vertical asymptote. Give an exact answer in terms of pi, not a decimal.`,
      answer: exactRadianAnswer(radianKey(1, 2 * b)),
      params: { a, b },
      hints: [
        "A tangent has no value where the cosine underneath it is zero, and the first time that happens on the way up from nothing is a quarter turn in.",
        "The break belongs to the whole argument rather than to $x$ on its own, so set the argument equal to that quarter turn and then solve for $x$.",
        "Take care not to answer the period here. A cycle of a tangent is a half turn shared out by the coefficient, and its first break sits halfway along that, so the two answers differ by a factor of two.",
      ],
      worked_solution: [
        `A tangent breaks where the cosine of its argument is zero, and the smallest positive argument that does that is a quarter turn, which is $\\dfrac{\\pi}{2}$.`,
        `Here the argument is $${b}x$ rather than $x$, so the first break is where $${b}x = \\dfrac{\\pi}{2}$.`,
        `Dividing both sides by $${b}$ gives $x = \\dfrac{\\pi}{2} \\times \\dfrac{1}{${b}}$.`,
        `So the smallest positive asymptote sits at $x = ${radianTex(1, 2 * b)}$, which is half of this graph's period of $${radianTex(1, b)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b ?? 0}`,
};

/** TRG.6's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG6_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg6_tangent_period_l1,
  d9_trg6_asymptote_degree_l2,
  d9_trg6_secant_defined_l2,
  d9_trg6_reciprocal_exact_l3,
  d9_trg6_asymptote_radian_l3,
];
