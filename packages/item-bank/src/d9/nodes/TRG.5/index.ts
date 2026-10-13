import { latexNum } from "../../../promptFormat";
import {
  exactRadianAnswer,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * TRG.5 practice templates: the three numbers that describe a repeating signal, read off a
 * sinusoid one at a time and then all three together. Five shapes across the locked
 * 1xL1 / 2xL2 / 2xL3 mix, as `docs/D9_Domain_Plan.md` fixes them:
 *
 *  - L1  the amplitude of $a\sin(bx) + d$, which is one coefficient with its sign dropped;
 *  - L2a the period of $a\sin(bx)$, in exact radians, which is a whole turn shared out by $b$;
 *  - L2b the midline, recovered from the highest and lowest readings rather than read off a rule;
 *  - L3a the phase shift, in exact radians and signed, from either the factored or the
 *        multiplied-out inside;
 *  - L3b ONE of the amplitude, the period or the midline, named by the prompt and drawn by
 *        a param, read off a rule that carries a sideways slide none of the three answers.
 *
 * ## The two shapes the checker decided, taken from the plan's spike
 *
 * **No item here asks the learner to write the function.** The plan measured the symbolic
 * gate as total: the expression grammar has no trigonometric functions in it, and a key of
 * `2*sin(x) + 1` grades `invalid_input/unsupported_syntax` against ITSELF. So "write the
 * equation of this trace" is unauthorable rather than merely discouraged, and
 * `features.l3` is what stands in its place: the facts a written equation would have
 * carried, asked back one at a time as a number the learner reads off the rule. See that
 * template's own note for why it asks one and not three.
 *
 * **A pi answer does not have to be in lowest terms.** `14pi/12` grades correct against key
 * `7pi/6`, so no prompt below asks for a reduced answer and no hint claims a reduction is
 * required. The worked solutions do show the reduced spelling, because it is the tidier way
 * to write the same number, and they say so as a tidying rather than as a requirement.
 * **A decimal coefficient on pi is refused** (`0.5pi` is `wrong_representation` while
 * `(1/2)pi` is correct), so every radian prompt asks for an exact answer in terms of pi and
 * says it does not want a decimal.
 *
 * Every radian key in this file carries a denominator of at least $2$. That is a choice
 * about the QUESTION and not about the grader: a period or a shift that lands on a bare
 * `pi` is answerable without dividing anything, so the draw ranges below skip the
 * coefficients that produce one.
 *
 * ## Why no hint here carries a digit or the letters p and i together
 *
 * `hint_leaks_answer` strips whitespace from a hint and looks for the answer key as a
 * standalone value. Three of the five keys are one- or two-digit numbers and two are short
 * pi fractions, so a hint naming any number would leak on the draws whose answer happened
 * to be that number and pass on every other one, which is a defect whose discovery depends
 * on the seed. Every hint below names the rule and never substitutes into it, which is also
 * what R13 asks for. The pi keys need the same care one step further in: the check runs
 * over the hint with its whitespace removed, so a hint containing the word "pi" anywhere,
 * or a word ending in `p` followed by one starting with `i`, could match a key of `pi/2`.
 * No hint below contains that pair of letters in sequence.
 *
 * ## Era framing (era 10, Cyberpunk)
 *
 * `getEraOfNode("TRG.5")` resolves to era 10, whose style guide gives this node a signal's
 * strength, its repeat interval and how far it lags: the three numbers an engineer actually
 * names, which are exactly amplitude, period and phase. The same guide **forbids framing a
 * trig lesson as a waveform on a monitor**, calling it out by name as the failure that
 * teaches the graph instead of the idea, so nothing here is set at a display. Framing is
 * used on the one shape where it makes a GENUINE word problem, `midline.l2`, whose two
 * readings are readings OF something; the four shapes that hand the learner a rule are left
 * abstract, because a lead-in in front of "give the amplitude of this rule" changes nothing
 * about the mathematics. Nothing in it reaches for a material this era's closing ledger has
 * retired. The story is chosen after every numeric parameter and is not stored in
 * `template_params`, so the worked-solution figures are driven by the mathematics alone.
 *
 * ## Two deliberate widenings of the plan's stated shapes
 *
 * The plan writes `phase-shift.l3`'s shape as "the phase shift of $a\sin(b(x - c))$". Two
 * thirds of the draws are exactly that. The remaining third multiplies the inside out to
 * $a\sin(bx - bc)$ and asks the same question, because reading $c$ straight off a bracket
 * that has already been factored is an L2 move, and the L3 tier is where a learner has to
 * notice that $bx - k$ shifts by $k/b$ and not by $k$. The answer, the builder and the
 * `template_id` are the plan's; only the presentation of the inside varies.
 *
 * `features.l3` carries a sideways slide inside its rule that no draw ever asks for. That
 * is a widening of the same kind and for a sharper reason: asked as "give the amplitude of
 * $a\sin(bx) + d$" the item is word for word `amplitude.l1`, and asked as "give the period"
 * it is `period-radian.l2`, so the L3 tier would be serving its own L1 and L2 questions
 * back. The fourth number restores the tier's work, which is choosing among the numbers in
 * front of you rather than reading the one in a known position. The answers, the builders
 * and the `template_id` are the plan's; only the rule the learner is handed is wider.
 *
 * Every template declares a `varietyKey` over the numbers that fix the QUESTION, so a cell
 * cannot freeze two draws that reduce to the same thing.
 */

export const TRG5_NODE = "TRG.5";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** `sin` / `cos`, in the order the numeric `fn` param indexes them. */
const FUNCTION_NAMES = ["sin", "cos"] as const;

/**
 * A signed multiple of pi in the ASCII the answer field reads, e.g. `-5pi/6`.
 *
 * Written in lowest terms because that is the tidiest spelling of the key; the checker does
 * not require it of a submission (`14pi/12` grades against `7pi/6`), and no prompt in this
 * file asks for it.
 */
function radianKey(num: number, den: number): string {
  const factor = gcd(num, den);
  const n = num / factor;
  const d = den / factor;
  const sign = n < 0 ? "-" : "";
  const magnitude = Math.abs(n);
  const head = magnitude === 1 ? "pi" : `${magnitude}pi`;
  return d === 1 ? `${sign}${head}` : `${sign}${head}/${d}`;
}

/** The same multiple of pi as LaTeX, signed, for a prompt or a worked-solution step. */
function radianTex(num: number, den: number): string {
  const factor = gcd(num, den);
  const n = num / factor;
  const d = den / factor;
  const sign = n < 0 ? "-" : "";
  const magnitude = Math.abs(n);
  const head = magnitude === 1 ? "\\pi" : `${magnitude}\\pi`;
  return d === 1 ? `${sign}${head}` : `${sign}\\dfrac{${head}}{${d}}`;
}

/** The magnitude of a multiple of pi as LaTeX, for use after an explicit `+` or `-`. */
function radianMagTex(num: number, den: number): string {
  return radianTex(Math.abs(num), den);
}

/**
 * `y = a sin(bx) + d` as LaTeX, with the pieces that are absent left out rather than
 * printed as $1$ or $+ 0$.
 */
function ruleTex(a: number, b: number, d: number, fn: 0 | 1): string {
  const name = FUNCTION_NAMES[fn] ?? "sin";
  const inside = b === 1 ? "x" : `${b}x`;
  const head = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  const tail = d === 0 ? "" : d > 0 ? ` + ${d}` : ` - ${-d}`;
  return `y = ${head}\\${name}(${inside})${tail}`;
}

/* -------------------------------------------------------------------------- */
/* L1: the amplitude of a sin(bx) + d                                          */
/* -------------------------------------------------------------------------- */

/**
 * L1, one coefficient with its sign dropped.
 *
 * Both distractors are present in every draw and that is the point of the tier: a constant
 * on the end that a learner may add in, and a coefficient inside that a learner may divide
 * by. Neither touches the amplitude, and the item is only L1 once the learner knows which
 * of the three numbers in front of them is the one being asked for.
 *
 * $a$ is negative on about half the draws, because a negative coefficient turning the trace
 * over while leaving its reach alone is the whole of what "the size of $a$" means, and a
 * template that never drew one would be asking a strictly easier question.
 */
export const d9_trg5_amplitude_l1: ItemTemplate = {
  template_id: "d9.trg5.amplitude.l1",
  node_id: TRG5_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const magnitude = rng.int(2, 9);
    const negative = rng.int(0, 1);
    const a = negative === 1 ? -magnitude : magnitude;
    const b = rng.int(2, 6);
    // Never zero: a rule with no constant on the end has no vertical distractor in it, and
    // the worked solution's "the constant on the end" step would name a term that is absent.
    let d = rng.int(-7, 8);
    while (d === 0) {
      d = rng.int(-7, 8);
    }
    const fn = rng.int(0, 1) as 0 | 1;
    const rule = ruleTex(a, b, d, fn);

    const closing =
      a < 0
        ? `The minus sign in front turns the trace upside down and leaves the size of its swing alone, so the amplitude is the size of $a$, which is $${magnitude}$.`
        : `The amplitude is the size of $a$, so the trace reaches $${magnitude}$ above its midline and $${magnitude}$ below it.`;

    return {
      prompt: `For $${rule}$, give the amplitude. Enter one number.`,
      answer: numericAnswer(`${magnitude}`),
      params: { a, b, d, fn, magnitude },
      hints: [
        "The amplitude is how far the trace swings away from the level it sits about, so it is set by the coefficient multiplying the function and by nothing else.",
        "The coefficient inside the function changes only how quickly the trace repeats, and the constant on the end only raises or lowers the whole thing. Neither one changes how far it reaches.",
        "That leading coefficient can be negative. Its sign turns the trace over rather than shortening it, so what you want is the coefficient's size.",
      ],
      worked_solution: [
        `Line the rule up with the general form $y = a\\${FUNCTION_NAMES[fn]}(bx) + d$: here $a = ${a}$, $b = ${b}$ and $d = ${d}$.`,
        `Only $a$ sets the reach. Changing $b$ speeds the repeat up or slows it down, and changing $d$ slides the whole trace up or down.`,
        closing,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.b ?? 0}:${params.d ?? 0}:${params.fn ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2a: the period, in exact radians                                           */
/* -------------------------------------------------------------------------- */

/**
 * The coefficients this shape draws from.
 *
 * $1$ and $2$ are absent because they answer $2\pi$ and $\pi$, and a period that is a bare
 * multiple of pi is reached without dividing anything. Every entry here leaves a
 * denominator of at least $2$, and the even ones leave a fraction that tidies while the odd
 * ones do not, so the worked solution's reduction step is exercised both ways.
 */
const PERIOD_COEFFICIENTS = [3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

/**
 * L2a, a whole turn shared out by the coefficient inside.
 *
 * `exactRadianAnswer` binds `pi` and refuses a decimal, so the prompt asks for an exact
 * answer in terms of pi and says so rather than leaving the learner to discover it by
 * losing an attempt. It does not ask for lowest terms, because the checker does not require
 * them.
 */
export const d9_trg5_period_radian_l2: ItemTemplate = {
  template_id: "d9.trg5.period-radian.l2",
  node_id: TRG5_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const b = PERIOD_COEFFICIENTS[rng.int(0, PERIOD_COEFFICIENTS.length - 1)] ?? 3;
    const a = rng.int(2, 9);
    const fn = rng.int(0, 1) as 0 | 1;
    const rule = ruleTex(a, b, 0, fn);

    const tidied =
      b % 2 === 0
        ? `Two and $${b}$ share a factor of $2$, so that is more tidily written as $${radianTex(2, b)}$, and the period is $${radianTex(2, b)}$.`
        : `Nothing there shares a factor, so the period is $${radianTex(2, b)}$.`;

    return {
      prompt: `For $${rule}$, give the period. Give an exact answer in terms of pi, not a decimal.`,
      answer: exactRadianAnswer(radianKey(2, b)),
      params: { a, b, fn },
      hints: [
        "One cycle is finished when the value inside the function has run through a whole turn, so ask how far along the horizontal axis it takes to do that.",
        "The coefficient sitting with $x$ makes the inside run through that turn faster, so the length of one cycle is a whole turn shared out by that coefficient.",
      ],
      worked_solution: [
        `The coefficient sitting with $x$ inside the function is $${b}$, so the inside reads $${b}x$.`,
        `A ${FUNCTION_NAMES[fn] === "sin" ? "sine" : "cosine"} finishes one cycle while its inside covers a whole turn, which is $2\\pi$, so one cycle ends where $${b}x = 2\\pi$.`,
        `Dividing both sides by $${b}$ puts that at $x = \\dfrac{2\\pi}{${b}}$.`,
        tidied,
      ],
    };
  },
  // Keyed on the coefficient alone: the period does not depend on the leading coefficient
  // or on which of the two functions is drawn, so two draws sharing a `b` are one question.
  varietyKey: (params) => `${params.b ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2b: the midline, from the highest and lowest readings                      */
/* -------------------------------------------------------------------------- */

/**
 * L2b, the midline recovered rather than read off.
 *
 * The plan's row says "the midline value" and leaves the route open. Reading $d$ off a
 * written rule is the same move as `amplitude.l1` with a different coefficient named, so
 * this shape hands over the two readings instead and asks for the level halfway between
 * them, which is the definition the L1 shape only gestures at. It is also the direction a
 * measurement actually runs: an engineer reads a high and a low off equipment and works the
 * level out, rather than being handed the rule.
 *
 * That makes it the one shape in this file where the era's framing produces a GENUINE word
 * problem, since the two numbers are readings OF something. The scenario is a link carrying
 * a signal, which is the style guide's own framing for this node, and it is drawn after
 * every numeric parameter so the mathematics is untouched by it.
 */
export const d9_trg5_midline_l2: ItemTemplate = {
  template_id: "d9.trg5.midline.l2",
  node_id: TRG5_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    // Never zero: a midline on the axis is answerable by a learner who has read only that
    // the trace looks symmetric, and it collides with the amplitude question besides.
    let midline = rng.int(-6, 9);
    let amplitude = rng.int(2, 8);
    // The highest reading is kept above zero. A meter's scale runs below zero happily, and
    // the low is free to, but a signal whose HIGHEST strength is negative reads as a
    // mistake in the story rather than as a number the learner is meant to use.
    //
    // A low reading of zero is refused as well, for the worked solution's sake rather than
    // the story's: it turns the addition step into adding nothing, so the walkthrough shows
    // the move without the move happening.
    while (midline === 0 || midline + amplitude < 1 || midline - amplitude === 0) {
      midline = rng.int(-6, 9);
      amplitude = rng.int(2, 8);
    }
    const high = midline + amplitude;
    const low = midline - amplitude;
    const total = high + low;

    return {
      prompt: `A link carries a signal whose strength rises and falls as a sine trace. On the meter it reaches a highest reading of ${latexNum(high)} and drops to a lowest reading of ${latexNum(low)}. Give the value of the trace's midline. Enter one number.`,
      answer: numericAnswer(`${midline}`),
      params: { midline, amplitude, high, low },
      hints: [
        "The two readings are the top and the bottom of the same swing, and the midline is the level the trace sits about, exactly halfway between them.",
        "Halfway between two numbers is their average, so add the two readings together and take half of the total. Watch the signs: where the lower reading is below zero, adding it brings the total down rather than up.",
      ],
      worked_solution: [
        `The trace swings the same distance above its midline as below it, so the midline is the level halfway between the highest and the lowest readings.`,
        `Halfway between two numbers is their average, so add the readings: $${high} + ${low < 0 ? `(${low})` : low} = ${total}$.`,
        `Half of that total is the midline: $${total} \\div 2 = ${midline}$.`,
        `So the trace sits about a level of $${midline}$, swinging $${amplitude}$ either side of it.`,
      ],
    };
  },
  varietyKey: (params) => `${params.midline ?? 0}:${params.amplitude ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3a: the phase shift, in exact radians and signed                           */
/* -------------------------------------------------------------------------- */

/**
 * The shifts this shape draws from, as `[numerator, denominator]` of a multiple of pi.
 *
 * Each leaves a denominator of at least $2$, so no draw answers a bare `pi`, and each stays
 * inside one cycle of every coefficient the shape uses, so the lag the answer describes is
 * a lag a learner can picture.
 */
const PHASE_SHIFTS: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 6],
  [5, 6],
];

/**
 * L3a, how far the whole trace has slid.
 *
 * Left neutral rather than framed. The era's second framing for this node is two links
 * carrying the same signal with one arriving later, and a LAG is a physical quantity that
 * does not go negative, so a story about a late arrival would contradict the half of the
 * draws whose shift is to the left. The sign is the point of the tier, so the sign wins and
 * the story is dropped.
 *
 * Two thirds of the draws hand over the factored inside the plan names,
 * $a\sin(b(x - c))$, and the work is deciding that neither the coefficient in front nor the
 * one inside moves the trace sideways, then carrying the bracket's sign into the answer. A
 * subtraction inside the bracket is a shift to the RIGHT, which is the sign trap this tier
 * exists for, and the checker reports it separately: the plan measured `pi/3` against key
 * `-pi/3` as `sign_error` rather than a plain value miss.
 *
 * The remaining third multiplies the inside out to $a\sin(bx - bc)$, where the shift is no
 * longer sitting in the rule to be copied and the coefficient has to come out of both terms
 * first. See the header note: this widens the plan's stated shape deliberately and changes
 * nothing about the answer or the builder.
 */
export const d9_trg5_phase_shift_l3: ItemTemplate = {
  template_id: "d9.trg5.phase-shift.l3",
  node_id: TRG5_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const [rawNum, den] =
      PHASE_SHIFTS[rng.int(0, PHASE_SHIFTS.length - 1)] ?? ([1, 2] as const);
    const left = rng.int(0, 1);
    const num = left === 1 ? -rawNum : rawNum;
    const b = rng.int(2, 4);
    const a = rng.int(2, 7);
    const fn = rng.int(0, 1) as 0 | 1;
    // 0 factored, 1 multiplied out. Drawn from three so the factored form the plan names
    // stays the majority shape.
    const expanded = rng.int(0, 2) === 0 ? 1 : 0;
    const name = FUNCTION_NAMES[fn] ?? "sin";

    // A subtraction inside the bracket shifts right, an addition shifts left, so the
    // operator printed in the rule is the OPPOSITE of the answer's sign.
    const op = num > 0 ? "-" : "+";
    const shiftMag = radianMagTex(num, den);
    const shiftTex = radianTex(num, den);
    // The constant left behind when the coefficient is multiplied through.
    const insideMag = radianMagTex(b * num, den);

    const insideTex =
      expanded === 1
        ? `${b}x ${op} ${insideMag}`
        : `${b}\\left(x ${op} ${shiftMag}\\right)`;
    const rule = `y = ${a}\\${name}\\left(${insideTex}\\right)`;

    const direction = num > 0 ? "right" : "left";
    const verb = num > 0 ? "subtracted" : "added";

    const opening =
      expanded === 1
        ? [
            `The inside reads $${b}x ${op} ${insideMag}$, and the shift cannot be copied straight out of that: the coefficient of $x$ has been multiplied through the bracket.`,
            `Take $${b}$ out of both terms to put it back: $${b}x ${op} ${insideMag} = ${b}\\left(x ${op} ${shiftMag}\\right)$.`,
          ]
        : [
            `The inside is already written with the coefficient of $x$ outside a bracket holding $x$ and one constant: $${insideTex}$.`,
            `The coefficient in front of the function sets the reach and the coefficient inside sets the repeat length. Neither of them slides the trace sideways, so the shift is the constant in the bracket.`,
          ];

    return {
      prompt: `For $${rule}$, give the phase shift. Give an exact answer in terms of pi, not a decimal, and write a shift to the left as a negative value.`,
      answer: exactRadianAnswer(radianKey(num, den)),
      params: { a, b, num, den, left, expanded, fn },
      hints: [
        "A phase shift is how far the whole trace has slid along the horizontal axis. It comes from the constant inside the function, never from the coefficient out in front.",
        "Read it off the form where the coefficient of $x$ stands outside a bracket holding $x$ and one constant. Where the inside is not written that way yet, take the coefficient out of both terms first, which divides the constant by it.",
        "A constant subtracted inside the bracket slides the trace to the right and one added slides it to the left, so carry that direction into the sign of your answer.",
      ],
      worked_solution: [
        ...opening,
        `Inside the bracket the constant is ${verb}, so the whole trace has slid to the ${direction}.`,
        `A slide to the ${direction} is ${num > 0 ? "a positive" : "a negative"} shift, so the phase shift is $${shiftTex}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.b ?? 0}:${params.num ?? 0}:${params.den ?? 0}:${params.expanded ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3b: one named feature, drawn from the three                                */
/* -------------------------------------------------------------------------- */

/**
 * The coefficients `features.l3` draws from, on the same rule as {@link PERIOD_COEFFICIENTS}:
 * each leaves the period with a denominator of at least $2$.
 */
const FEATURE_COEFFICIENTS = [3, 4, 5, 6, 8, 10, 12] as const;

/**
 * The three readings, in the order the numeric `feature` param indexes them.
 *
 * None of the three is written anywhere in the rule, which is the point of them. The cell used
 * to ask for the amplitude, the period or the midline, and two of those are a number COPIED out
 * of the rule the prompt has just printed. `featuresHarder.test.ts` measured the old cell at
 * 66.3% answerable by retyping a visible number, and the two thirds it gave away were
 * `amplitude.l1` and `midline.l2` asked a second time in an L3 slot.
 *
 * Every reading here needs the level and the swing put together, which is the mini-lesson's own
 * closing sentence and the direction opposite to `midline.l2`: that shape hands over two
 * readings and asks for the level between them, and this one hands over the level and the swing
 * and asks for the readings.
 */
const READING_ASKED = [
  "the highest value the trace reaches",
  "the lowest value the trace reaches",
  "the distance from its lowest value up to its highest",
] as const;

/** The same three, named in the closing step of the reveal. */
const READING_NAMED = [
  "highest value",
  "lowest value",
  "distance from the lowest value to the highest",
] as const;

/**
 * Whether `value`'s digits stand in `rule` as a number of their own.
 *
 * The sign is deliberately ignored, because the defect being kept out is a learner retyping
 * digits they can see rather than a learner reasoning about a sign: a rule printing $-7$ hands
 * over the digit `7` just as plainly as one printing $7$, and the probe's own sweep counted it
 * that way.
 */
function rulePrintsNumber(rule: string, value: number): boolean {
  return new RegExp(`(?<!\\d)${Math.abs(value)}(?!\\d)`).test(rule);
}

/**
 * `y = a f(b(x - c)) + d`, the form this template hands over.
 *
 * Local rather than a widening of {@link ruleTex}, which three other templates print through
 * and none of them wants a bracket in.
 */
function shiftedRuleTex(
  a: number,
  b: number,
  cn: number,
  cd: number,
  d: number,
  fn: 0 | 1,
): string {
  const name = FUNCTION_NAMES[fn] ?? "sin";
  const head = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  const tail = d > 0 ? ` + ${d}` : ` - ${-d}`;
  return `y = ${head}\\${name}\\left(${b}\\left(x - ${radianTex(cn, cd)}\\right)\\right)${tail}`;
}

/**
 * L3b, the shape that replaces "write the equation of this trace".
 *
 * The plan's spike measured the identity gate as total, so a key containing `sin` does not
 * grade even against itself and the writing question is unauthorable. What survives is the
 * facts a written equation would have carried, asked back as numbers.
 *
 * ## Why it asks one reading and not three at once
 *
 * It was authored as a `multipartAnswer` over an `amplitude`, a `period` and a `midline`
 * part, which measured well against the checker and could not be ANSWERED: there is no
 * multi-field answer input in the web tree, both practice surfaces submit a plain string,
 * and `compareMultipart` refuses anything that is not an object keyed by `part_id`, so every
 * submission came back `invalid_input/invalid_multipart_answer`. Building the input is a
 * feature rather than a draft's work, so the prompt names ONE thing and `feature` decides
 * which, keeping all three in the cell across draws.
 *
 * What goes with the parts is the report of WHICH reading a learner missed inside one
 * attempt. What replaces it is that the next draw asks a different one.
 *
 * ## Why it asks for a reading rather than for a feature
 *
 * Because a feature was free. Asked for the amplitude, the period or the midline of a written
 * rule, two of the three answers are a number the prompt has already printed: the amplitude is
 * the coefficient in front with its sign dropped and the midline is the constant on the end.
 * Measured over 800 draws, **66.3% were answered correctly by retyping a visible number**, and
 * those two thirds were `amplitude.l1` and `midline.l2` served back inside an L3 slot.
 *
 * The docblock this replaces argued that the tier rested on the $c$ distractor. That argument
 * does not survive the item's own hints, where hint 2 names $c$ as the number answering nothing
 * and hint 3 maps each feature onto its slot: by the last hint the item was a lookup with the
 * table supplied. A distractor cannot carry a tier that its own scaffolding removes.
 *
 * So the question is now a reading the rule does not contain: the highest value, the lowest
 * value, or the distance between them. Each needs the level and the swing COMBINED, which is
 * the mini-lesson's closing sentence, and it runs opposite to `midline.l2`, which hands over
 * two readings and asks for the level between them. The draw is refused outright where the
 * answer's digits appear in the rule, so no draw is retypeable even by coincidence.
 *
 * ## Why the rule carries a slide the question never asks for
 *
 * $a\,f(b(x - c)) + d$ hands over four numbers, of which two ($b$ and $c$) take no part in any
 * reading, and $c$ in particular is the one a learner reaching for "the number in the last
 * position" will trip over. It leaves every answer where it is, since a sideways slide changes
 * neither the reach nor the level.
 *
 * The slide is always a subtraction. Its direction is `phase-shift.l3`'s whole subject and
 * is measured there; here it is scenery, and a scenery term with two spellings would only
 * make the hints hedge about something the answer does not depend on.
 */
export const d9_trg5_features_l3: ItemTemplate = {
  template_id: "d9.trg5.features.l3",
  node_id: TRG5_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const fn = rng.int(0, 1) as 0 | 1;
    // The slide the rule carries and no answer uses. Same list `phase-shift.l3` draws its
    // real shifts from, so the distractor is a measure a learner meets elsewhere.
    const [cn, cd] = PHASE_SHIFTS[rng.int(0, PHASE_SHIFTS.length - 1)] ?? ([1, 2] as const);
    const feature = rng.int(0, 2);

    let magnitude = 0;
    let a = 0;
    let b = 3;
    let d = 0;
    let rule = "";
    let value = 0;
    // Redrawn, rather than filtered afterwards, until the answer is a number the rule does not
    // print. Two of the four constraints are about the arithmetic and two about the story:
    //
    //  - `d === 0` puts the trace on the axis, where the highest and the lowest value are one
    //    number with two signs and a learner can answer both from the amplitude alone;
    //  - `rulePrintsNumber` is the whole finding this shape was rewritten for, and it has to be
    //    checked per draw rather than argued, since a combination can land on a printed number
    //    by coincidence ($d = 9$, $|a| = 3$ and $b = 12$ gives a highest value of $12$);
    //  - a highest value below $1$ reads as a mistake in the story rather than as a number to
    //    use, which is the rule `midline.l2` already draws under;
    //  - and the swing is asked as a distance, so a level it never uses must not change it: the
    //    third reading is $2|a|$ whatever $d$ is, and that is fine, but it must still not be a
    //    number the rule shows.
    do {
      magnitude = rng.int(2, 7);
      a = rng.int(0, 1) === 1 ? -magnitude : magnitude;
      b = FEATURE_COEFFICIENTS[rng.int(0, FEATURE_COEFFICIENTS.length - 1)] ?? 3;
      d = rng.int(-6, 9);
      rule = shiftedRuleTex(a, b, cn, cd, d, fn);
      value = feature === 0 ? d + magnitude : feature === 1 ? d - magnitude : 2 * magnitude;
    } while (d === 0 || d + magnitude < 1 || rulePrintsNumber(rule, value));

    const shiftTex = radianTex(cn, cd);

    const closing =
      feature === 0
        ? `Its highest value is that level with one full swing added on: $${d} + ${magnitude} = ${value}$.`
        : feature === 1
          ? `Its lowest value is that level with one full swing taken off: $${d} - ${magnitude} = ${value}$.`
          : `From the lowest value up to the highest is one full swing down and one full swing up, so it is twice the size of $a$: $2 \\times ${magnitude} = ${value}$.`;

    return {
      prompt: `For $${rule}$, give ${READING_ASKED[feature]}. Enter one number.`,
      answer: numericAnswer(`${value}`),
      params: { a, b, d, fn, magnitude, cn, cd, feature, value },
      hints: [
        "Set the rule beside the general form before reading anything off it. Four numbers appear in it: one multiplying the function, one sitting with $x$ inside the bracket, one taken away from $x$ inside that bracket, and one added on the end.",
        "Two of those four decide nothing about how high or how low the trace goes. The coefficient sitting with $x$ only sets how often the pattern comes back around, and the constant taken away from $x$ only slides the whole trace sideways along the axis.",
        "The other two settle it between them, and neither one settles it alone: the trace sits about a level, and it swings the same distance above that level as below it. So every value it reaches lies one full swing on one side or the other of where it sits.",
      ],
      worked_solution: [
        `Against the general form $y = a\\${FUNCTION_NAMES[fn]}(b(x - c)) + d$, this rule has $a = ${a}$, $b = ${b}$, $c = ${shiftTex}$ and $d = ${d}$.`,
        `Neither $b$ nor $c$ moves a value up or down: one sets how often the pattern repeats and the other slides the whole trace sideways.`,
        `The level the trace sits about is $d$, so $${d}$, and it swings the size of $a$ either side of that level, so $${magnitude}$ above and $${magnitude}$ below.`,
        closing,
        `So the ${READING_NAMED[feature]} is $${value}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.feature ?? 0}:${params.a ?? 0}:${params.b ?? 0}:${params.d ?? 0}:${params.fn ?? 0}`,
};

/** TRG.5's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG5_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg5_amplitude_l1,
  d9_trg5_period_radian_l2,
  d9_trg5_midline_l2,
  d9_trg5_phase_shift_l3,
  d9_trg5_features_l3,
];
