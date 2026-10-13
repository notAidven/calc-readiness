import {
  exactRadianAnswer,
  type GenerateContext,
  type ItemTemplate,
  intervalAnswer,
  numericAnswer,
  precisionAnswer,
  type Rng,
} from "../../../template";

/**
 * TRG.7 practice templates: recovering an ANGLE from a ratio, and living with the fact that
 * only one angle can come back. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the arcsine of a special value, answered in degrees (the inverse run forwards);
 *  - L2a the arccosine of a special value, answered as an exact multiple of pi;
 *  - L2b the restricted range itself, as an interval in degrees, asked from either end
 *        (what the inverse returns, and what the forward function was cut down to);
 *  - L3a a composition whose inner angle sits OUTSIDE the outer inverse's range, so the
 *        composition hands back something other than what went in;
 *  - L3b a bearing from two offsets, which is not a special angle and so is rounded.
 *
 * ## Why every range in this file is written in degrees
 *
 * Measured against the real v2 checker before any of this was written:
 * `intervalAnswer("[-pi/2, pi/2]")` is `invalid_input/parse_error` ON THE KEY, with or
 * without `allowed_symbols: ["pi"]`, and so is `[0, pi]`. In degrees the whole path works:
 * `[-90, 90]` accepts itself, rejects `(-90, 90)` as `wrong_bound_inclusivity` and
 * `[-90, 180]` as `value_mismatch`. So `range-interval.l2` is in degrees, and the lesson's
 * prose and these worked solutions stay in degrees with it, because a learner must never be
 * shown a spelling the answer field would refuse.
 *
 * The one exception is deliberate and is not a range: `arccos-radian.l2` answers with a
 * SINGLE angle, which `exactRadianAnswer` grades exactly (`2pi/3`, `2*pi/3`, `(2/3)pi` and
 * `4pi/6` all pass; `2.094` is `wrong_representation`). Its worked solution still finds the
 * angle in degrees first and converts at the end, so the restricted-range reasoning the node
 * teaches is done in the units the rest of the node uses.
 *
 * ## Why the three degree shapes say the field takes no degree sign
 *
 * A degree measure is asked for in a BARE numeric field, which carries no keypad and no live
 * preview, so nothing on the surface tells a learner what the field will read. A learner
 * asked for an angle "in degrees" and shown nothing types `30°`, and that is
 * `invalid_input/parse_error` — scored as a format failure rather than as a wrong answer, so
 * the attempt is lost to a message about typing. The four shapes here that answer with a
 * degree measure therefore close on "Enter one number, with no degree sign.", which is
 * TRG.1's wording for the same field rather than a fifth phrasing of one rule.
 *
 * The two interval and roster shapes elsewhere in the domain state the same thing in their
 * own grammar, and `d9.test.ts` derives the population that owes this from the served items
 * rather than from this list, so a new degree shape cannot ship without it.
 *
 * ## Why no hint in this file contains a digit
 *
 * `hint_leaks_answer` matches an answer key as a standalone value, and nearly every key here
 * is a one- or two-digit degree measure. A hint reading "the band runs from $-90$ to $90$"
 * leaks on exactly the draws whose answer is ninety and passes on every other, which is a
 * leak whose discovery depends on the seed. So the hints name the rule in words ("a quarter
 * turn either side of zero") and never substitute into it, which is also what R13 asks for.
 *
 * ## No item asks for an expression containing a trigonometric function
 *
 * The expression grammar has none: a key of `cos(x)` does not grade against ITSELF
 * (`invalid_input/unsupported_syntax`). `docs/Content_Authoring_Split.md` gates this node
 * only if its items are authored in solved or identity form, and none of these five are.
 * Every one is an evaluation, so the conditional gate does not bind.
 */

export const TRG7_NODE = "TRG.7";

/** Whether this draw should speak the era's scenario rather than the neutral triangle. */
function isPractice(context?: GenerateContext): boolean {
  return context?.form === "practice";
}

/* -------------------------------------------------------------------------- */
/* L1: the arcsine of a special value, in degrees                              */
/* -------------------------------------------------------------------------- */

/** The magnitude of the sine at each special angle, as LaTeX. */
const SINE_MAGNITUDE: Record<number, string> = {
  0: "0",
  30: "\\dfrac{1}{2}",
  45: "\\dfrac{\\sqrt{2}}{2}",
  60: "\\dfrac{\\sqrt{3}}{2}",
  90: "1",
};

/** The sine of a signed special angle, as LaTeX. */
function sineTex(deg: number): string {
  const magnitude = SINE_MAGNITUDE[Math.abs(deg)] ?? "0";
  return deg < 0 ? `-${magnitude}` : magnitude;
}

/**
 * Every degree measure arcsine can return at a special value.
 *
 * The negatives are half the list on purpose. A learner who has only met the inverse on
 * positive readings takes "arcsine gives an acute angle" away from it, and the first negative
 * ratio then comes back as a heading past a half turn instead of as an angle below zero. The
 * two endpoints are in for the same reason at the other end of the band.
 */
const ARCSIN_DEGREES: readonly number[] = [-90, -60, -45, -30, 0, 30, 45, 60, 90];

export const d9_trg7_arcsin_degree_l1: ItemTemplate = {
  template_id: "d9.trg7.arcsin-degree.l1",
  node_id: TRG7_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const deg = ARCSIN_DEGREES[rng.int(0, ARCSIN_DEGREES.length - 1)] ?? 30;
    const value = sineTex(deg);
    const magnitude = SINE_MAGNITUDE[Math.abs(deg)] ?? "0";
    return {
      prompt: `Evaluate $\\arcsin\\left(${value}\\right)$. Give the angle in degrees. Enter one number, with no degree sign.`,
      answer: numericAnswer(`${deg}`),
      params: { deg },
      hints: [
        "Arcsine answers one question: which angle has this sine? What goes in is a ratio and what comes back is an angle.",
        "Sine is cut down before it is inverted, so arcsine may only answer with an angle in the closed band a quarter turn either side of zero. A negative ratio therefore comes back as an angle below zero rather than as a heading past a half turn.",
        "Recognize the special angle whose sine has that size, then carry the sign of the ratio onto it.",
      ],
      worked_solution:
        deg === 0
          ? [
              `Arcsine asks for the angle whose sine is $${value}$, and it may only answer inside the restricted range $[-90^{\\circ}, 90^{\\circ}]$.`,
              "Sine is zero at the start of a sweep and again at a half turn, and only the first of those two sits inside that range.",
              `So $\\arcsin\\left(${value}\\right) = 0^{\\circ}$.`,
            ]
          : [
              `Arcsine asks for the angle whose sine is $${value}$, and it may only answer inside the restricted range $[-90^{\\circ}, 90^{\\circ}]$.`,
              `The special angle whose sine has size $${magnitude}$ is $${Math.abs(deg)}^{\\circ}$.`,
              deg < 0
                ? "The ratio is negative, and inside that range only the angles below zero have a negative sine, so the sign carries onto the angle."
                : "The ratio is positive, and inside that range only the angles above zero have a positive sine, so the angle keeps its sign.",
              `So $\\arcsin\\left(${value}\\right) = ${deg}^{\\circ}$.`,
            ],
    };
  },
  varietyKey: (params) => `${params.deg ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2a: the arccosine of a special value, in exact radians                     */
/* -------------------------------------------------------------------------- */

/**
 * The seven special cosine readings arccosine answers with a fraction of pi, as
 * `[degrees, cosine as LaTeX, numerator of pi, denominator]`.
 *
 * `\arccos(1) = 0` and `\arccos(-1) = \pi` are deliberately absent: one answers with a bare
 * zero and the other with a bare `pi`, and neither exercises the fraction the prompt asks
 * for. Every row here therefore has a genuine denominator under it, and four of the seven
 * are negative readings, which are the ones that land in the second quadrant.
 */
const ARCCOS_ROWS: readonly (readonly [number, string, number, number])[] = [
  [30, "\\dfrac{\\sqrt{3}}{2}", 1, 6],
  [45, "\\dfrac{\\sqrt{2}}{2}", 1, 4],
  [60, "\\dfrac{1}{2}", 1, 3],
  [90, "0", 1, 2],
  [120, "-\\dfrac{1}{2}", 2, 3],
  [135, "-\\dfrac{\\sqrt{2}}{2}", 3, 4],
  [150, "-\\dfrac{\\sqrt{3}}{2}", 5, 6],
];

/** `pi/6`, `2pi/3`: the spelling the answer field takes. */
function radianKey(num: number, den: number): string {
  return num === 1 ? `pi/${den}` : `${num}pi/${den}`;
}

/** The same multiple of pi, typeset. */
function radianTex(num: number, den: number): string {
  return num === 1 ? `\\dfrac{\\pi}{${den}}` : `\\dfrac{${num}\\pi}{${den}}`;
}

export const d9_trg7_arccos_radian_l2: ItemTemplate = {
  template_id: "d9.trg7.arccos-radian.l2",
  node_id: TRG7_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [deg, cosine, num, den] = ARCCOS_ROWS[rng.int(0, ARCCOS_ROWS.length - 1)] ?? [
      60,
      "\\dfrac{1}{2}",
      1,
      3,
    ];
    const key = radianKey(num, den);
    const tex = radianTex(num, den);
    return {
      // `pi/5` is the example on purpose: it is not the answer to any row above, so the
      // format can be shown without any draw becoming answerable from the prompt alone.
      prompt: `Evaluate $\\arccos\\left(${cosine}\\right)$. Give the angle in exact radians as a fraction of $\\pi$, written with pi for $\\pi$, for example pi/5.`,
      answer: exactRadianAnswer(key),
      params: { deg, num, den },
      hints: [
        "Arccosine answers one question: which angle has this cosine? Find that angle in degrees first, since the special readings are easiest to recognize there.",
        "Cosine turns around at the start of a sweep, so it cannot be cut symmetrically the way sine is. It is cut forward instead, across the half turn from zero, and a negative reading therefore comes back in the second quadrant.",
        "Then convert: a degree measure becomes radians when it is multiplied by $\\pi$ and divided by the number of degrees in a half turn.",
      ],
      worked_solution: [
        `Arccosine asks for the angle whose cosine is $${cosine}$, and it may only answer inside the restricted range $[0^{\\circ}, 180^{\\circ}]$.`,
        `The angle in that range with that cosine is $${deg}^{\\circ}$.`,
        `Convert to radians by multiplying by $\\dfrac{\\pi}{180^{\\circ}}$: $${deg}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = ${tex}$.`,
        `So $\\arccos\\left(${cosine}\\right) = ${tex}$, typed as ${key}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.deg ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2b: the restricted range, as an interval in degrees                        */
/* -------------------------------------------------------------------------- */

interface InverseBand {
  /** The inverse, as LaTeX. */
  inverse: string;
  /** The inverse, said aloud in prose. */
  inverseWord: string;
  /** The forward function it undoes. */
  forwardWord: string;
  lo: number;
  hi: number;
  /** Tangent runs off at both ends, so its interval is the open one. */
  closed: boolean;
}

const ARCSIN_BAND: InverseBand = {
  inverse: "\\arcsin",
  inverseWord: "Arcsine",
  forwardWord: "sine",
  lo: -90,
  hi: 90,
  closed: true,
};

const INVERSE_BANDS: readonly InverseBand[] = [
  ARCSIN_BAND,
  {
    inverse: "\\arccos",
    inverseWord: "Arccosine",
    forwardWord: "cosine",
    lo: 0,
    hi: 180,
    closed: true,
  },
  {
    inverse: "\\arctan",
    inverseWord: "Arctangent",
    forwardWord: "tangent",
    lo: -90,
    hi: 90,
    closed: false,
  },
];

export const d9_trg7_range_interval_l2: ItemTemplate = {
  template_id: "d9.trg7.range-interval.l2",
  node_id: TRG7_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const index = rng.int(0, INVERSE_BANDS.length - 1);
    const band = INVERSE_BANDS[index] ?? ARCSIN_BAND;
    // The two directions are one fact asked from its two ends, and both are worth asking:
    // the interval an inverse can RETURN and the interval its forward function was cut down
    // TO are the same interval, and a learner who has only met one of them reads the other
    // as a second thing to memorize.
    const asked = rng.int(0, 1);
    const { inverse, inverseWord, forwardWord, lo, hi, closed } = band;
    const key = closed ? `[${lo}, ${hi}]` : `(${lo}, ${hi})`;
    const tex = closed
      ? `[${lo}^{\\circ}, ${hi}^{\\circ}]`
      : `(${lo}^{\\circ}, ${hi}^{\\circ})`;
    // `[10, 20]` is no row's answer, so the format can be stated without giving one away.
    const format =
      "Write your answer as an interval of plain numbers, using square brackets for an end that is included and round brackets for one that is not, for example [10, 20].";
    return {
      prompt:
        asked === 0
          ? `Over what interval of degrees can $${inverse}$ hand back an angle? ${format}`
          : `Before it can be inverted, ${forwardWord} is cut down to one interval of degrees over which it never repeats a value. Which interval is that? ${format}`,
      answer: intervalAnswer(key),
      params: { fn: index, asked, lo, hi, closed: closed ? 1 : 0 },
      hints: [
        "A function can only be undone where it never sends two angles to the same value, so the full sweep is cut down to one stretch on which no value is reached twice.",
        "Sine and tangent both climb the whole way across the quarter turn either side of zero, so their stretch is centered there. Cosine turns around at zero and cannot straddle it, so its stretch runs forward from zero through a half turn instead.",
        "Then settle the ends: an end belongs to the interval when the function has a value there, and is left out when it runs off instead.",
      ],
      worked_solution: [
        `${inverseWord} has to answer with exactly one angle for every value it is handed, so ${forwardWord} is first cut down to a stretch over which it never repeats a value.`,
        `That stretch runs from $${lo}^{\\circ}$ to $${hi}^{\\circ}$.`,
        closed
          ? `${forwardWord} has a value at both of those ends, so both ends belong to the interval and the brackets are square.`
          : `${forwardWord} runs off without limit at both of those ends and has no value there, so neither end belongs to the interval and the brackets are round.`,
        asked === 0
          ? `So the angles $${inverse}$ can return make the interval $${tex}$, typed as ${key}.`
          : `So the interval ${forwardWord} is cut down to is $${tex}$, typed as ${key}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.fn ?? 0}:${params.asked ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3a: a composition the restricted range changes                             */
/* -------------------------------------------------------------------------- */

interface SpecialRow {
  sin: string;
  cos: string;
  tan: string;
}

/** The three special reference angles, and each function's magnitude at them. */
const SPECIAL_AT_REFERENCE: Record<number, SpecialRow> = {
  30: { sin: "\\dfrac{1}{2}", cos: "\\dfrac{\\sqrt{3}}{2}", tan: "\\dfrac{\\sqrt{3}}{3}" },
  45: { sin: "\\dfrac{\\sqrt{2}}{2}", cos: "\\dfrac{\\sqrt{2}}{2}", tan: "1" },
  60: { sin: "\\dfrac{\\sqrt{3}}{2}", cos: "\\dfrac{1}{2}", tan: "\\sqrt{3}" },
};

const COMPOSITION_FUNCTIONS = [
  {
    inner: "\\sin",
    outer: "\\arcsin",
    word: "sine",
    key: "sin" as const,
    range: "[-90^{\\circ}, 90^{\\circ}]",
  },
  {
    inner: "\\cos",
    outer: "\\arccos",
    word: "cosine",
    key: "cos" as const,
    range: "[0^{\\circ}, 180^{\\circ}]",
  },
  {
    inner: "\\tan",
    outer: "\\arctan",
    word: "tangent",
    key: "tan" as const,
    range: "(-90^{\\circ}, 90^{\\circ})",
  },
] as const;

/**
 * Every composition worth asking, as `[function index, inner angle, principal value,
 * reference angle]`.
 *
 * EVERY ROW CHANGES THE ANSWER. A row whose inner angle already sat inside the outer
 * inverse's range would be answered correctly by a learner who believed the composition
 * always hands the input back, which is exactly the belief this tier exists to break; the
 * "hands it back" case is taught on the lesson's own sorter instead, where both calls are on
 * offer and getting one wrong costs nothing.
 *
 * EVERY ROW ALSO CHANGES THE QUADRANT, which is a second condition and not the same one. A
 * COTERMINAL pair such as `\arcsin(\sin 300^{\circ}) = -60^{\circ}` also changes the answer,
 * but it changes it by subtracting a full turn rather than by reflecting, so the third hint
 * ("its reference angle is the same and only the quadrant differs") would be false on exactly
 * those draws and true on the rest. The six coterminal rows are dropped rather than the hint
 * weakened, since the reflection is the beat this tier is for and the full-turn case is
 * TRG.1's. It also keeps the figure honest: coterminal headings share one terminal ray, so
 * the two rays the diagram draws would land on top of each other.
 *
 * `\arccos(\cos 300^{\circ})` is absent for a different reason: it is the check's own question.
 */
const COMPOSITIONS: readonly (readonly [number, number, number, number])[] = [
  [0, 120, 60, 60],
  [0, 135, 45, 45],
  [0, 150, 30, 30],
  [0, 210, -30, 30],
  [0, 225, -45, 45],
  [0, 240, -60, 60],
  [1, 210, 150, 30],
  [1, 225, 135, 45],
  [1, 240, 120, 60],
  [1, 315, 45, 45],
  [1, 330, 30, 30],
  [1, -30, 30, 30],
  [1, -45, 45, 45],
  [1, -60, 60, 60],
  [1, -120, 120, 60],
  [2, 120, -60, 60],
  [2, 135, -45, 45],
  [2, 150, -30, 30],
  [2, 210, 30, 30],
  [2, 225, 45, 45],
  [2, 240, 60, 60],
];

/** A signed angle, parenthesized where the sign would otherwise run into the function name. */
function angleTex(deg: number): string {
  return deg < 0 ? `\\left(${deg}^{\\circ}\\right)` : `${deg}^{\\circ}`;
}

/**
 * The value of the inner function at the inner angle.
 *
 * Cosine is the one whose sign is not read off the answer: it is positive on the first half
 * of its own range and negative on the second, where sine and tangent simply carry the sign
 * of the angle they come back with.
 */
function innerValueTex(
  spec: (typeof COMPOSITION_FUNCTIONS)[number],
  principal: number,
  reference: number,
): string {
  const row: SpecialRow = SPECIAL_AT_REFERENCE[reference] ?? {
    sin: "\\dfrac{1}{2}",
    cos: "\\dfrac{\\sqrt{3}}{2}",
    tan: "\\dfrac{\\sqrt{3}}{3}",
  };
  const magnitude = row[spec.key];
  const negative = spec.key === "cos" ? principal > 90 : principal < 0;
  return negative ? `-${magnitude}` : magnitude;
}

export const d9_trg7_compose_principal_l3: ItemTemplate = {
  template_id: "d9.trg7.compose-principal.l3",
  node_id: TRG7_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const [fn, inner, principal, reference] = COMPOSITIONS[
      rng.int(0, COMPOSITIONS.length - 1)
    ] ?? [0, 150, 30, 30];
    const spec = COMPOSITION_FUNCTIONS[fn] ?? COMPOSITION_FUNCTIONS[0];
    const value = innerValueTex(spec, principal, reference);
    const composition = `${spec.outer}\\left(${spec.inner} ${angleTex(inner)}\\right)`;
    return {
      prompt: `Evaluate $${composition}$. Give the angle in degrees. Enter one number, with no degree sign.`,
      answer: numericAnswer(`${principal}`),
      params: { fn, inner, principal, reference },
      hints: [
        "Work from the inside out. The inner function turns the angle into a ratio, and the outer inverse turns that ratio back into an angle.",
        "The inverse cannot hand back every angle with that ratio: it hands back the one inside its own restricted range. So the question to settle is whether the angle you started from is inside that range.",
        "Where it is not, the answer is the other angle carrying the same ratio, the one that does lie inside the range. Its reference angle is the same and only the quadrant differs.",
      ],
      worked_solution: [
        `Start inside. $${spec.inner} ${angleTex(inner)}$ has reference angle $${reference}^{\\circ}$, and its value is $${value}$.`,
        `$${spec.outer}$ may only answer inside $${spec.range}$, and $${inner}^{\\circ}$ is outside it, so the composition cannot simply hand the angle back.`,
        `The angle inside that range whose ${spec.word} is $${value}$ is $${principal}^{\\circ}$.`,
        `So $${composition} = ${principal}^{\\circ}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.fn ?? 0}:${params.inner ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L3b: a bearing from two offsets, rounded                                    */
/* -------------------------------------------------------------------------- */

/**
 * Offset pairs as `[across, along]`, chosen so the angle is nowhere near a rounding boundary.
 *
 * `precisionAnswer` is a FLOOR rather than a format: a learner carrying more digits is
 * accepted and one who rounds too early is not. That makes the parameters load-bearing.
 * Every pair below lands within `0.0015` of its own two-place value, so the nearest boundary
 * is at least `0.0035` away and no draw can turn on the fourth decimal place. The pairs that
 * were computed and REJECTED for sitting closer are `[15, 8]`, `[8, 15]`, `[9, 4]`, `[4, 9]`,
 * `[20, 21]`, `[21, 20]` and `[13, 9]`, each within `0.0026` of a boundary and `[13, 9]` within
 * `0.0002`; the first four of those carry the lesson's own estimate widget instead, where a
 * tolerance rather than a rounding rule decides.
 */
const OFFSET_PAIRS: readonly (readonly [number, number])[] = [
  [4, 3],
  [3, 4],
  [12, 5],
  [5, 12],
  [24, 7],
  [7, 24],
  [11, 6],
  [6, 11],
  [5, 2],
  [2, 5],
  [7, 3],
  [3, 7],
];

export const d9_trg7_arctan_round_l3: ItemTemplate = {
  template_id: "d9.trg7.arctan-round.l3",
  node_id: TRG7_NODE,
  difficulty: 3,
  generate(rng: Rng, context?: GenerateContext) {
    const [across, along] = OFFSET_PAIRS[rng.int(0, OFFSET_PAIRS.length - 1)] ?? [4, 3];
    const exact = (Math.atan2(along, across) * 180) / Math.PI;
    const key = exact.toFixed(2);
    const themed = isPractice(context);
    return {
      prompt: themed
        ? `A repeater stands on the deck $${across}$ meters across from the mast and $${along}$ meters further along. The two offsets are the legs of a right triangle and the sight line from the mast is its hypotenuse. What angle does the sight line make with the across offset, in degrees, rounded to $2$ decimal places? Enter one number, with no degree sign.`
        : `In a right triangle, the side adjacent to an angle measures $${across}$ and the side opposite it measures $${along}$. What does that angle measure, in degrees, rounded to $2$ decimal places? Enter one number, with no degree sign.`,
      answer: precisionAnswer(key, {
        mode: "decimal_places",
        value: 2,
        rounding: "half_up",
      }),
      params: { across, along, deg: Number(key) },
      hints: [
        themed
          ? "The offset running along the deck faces the angle at the mast, and the offset running across sits beside it, so one is the opposite side and the other the adjacent side of the triangle."
          : "The side facing the angle is the opposite side and the side beside it is the adjacent side.",
        "Tangent is the ratio of those two sides, so it is the tangent that this pair of measurements gives you. Read the angle back out of that ratio with the inverse tangent, working in degrees rather than radians.",
        "Carry the full reading through and round only at the very end, since rounding the ratio first can move the second decimal place of the angle.",
      ],
      worked_solution: [
        themed
          ? `The offset along the deck is opposite the angle and the offset across it is adjacent, so $\\tan\\theta = \\dfrac{${along}}{${across}}$.`
          : `The opposite side over the adjacent side is the tangent of the angle, so $\\tan\\theta = \\dfrac{${along}}{${across}}$.`,
        `Undo the tangent: $\\theta = \\arctan\\left(\\dfrac{${along}}{${across}}\\right)$.`,
        `Worked in degrees, that comes to $\\theta = ${exact.toFixed(4)}^{\\circ}$.`,
        `Rounded to two decimal places, the angle is $${key}^{\\circ}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.across ?? 0}:${params.along ?? 0}`,
};

/* -------------------------------------------------------------------------- */
/* L2c and L2d: the two inverses L1 and L2a never evaluate                     */
/* -------------------------------------------------------------------------- */

/**
 * Every special reading `\arccos` and `\arctan` answer with, as
 * `[is arctan, the ratio as LaTeX, the degree measure]`.
 *
 * SIXTEEN rows, and the two halves are chosen to be complementary rather than similar.
 * Arccosine's nine run from zero through a half turn and never come out negative, which is what
 * its restricted range means; arctangent's seven straddle zero and never reach a quarter turn,
 * because tangent runs off there. So the pair between them exercises the one thing a learner who
 * has met only {@link d9_trg7_arcsin_degree_l1} does not have: that the three inverses answer
 * inside three DIFFERENT bands, and the band decides the sign.
 *
 * `\arccos(1) = 0` and `\arccos(-1) = 180` are here where {@link ARCCOS_ROWS} excludes them,
 * for the opposite reason: that list needs a genuine fraction of pi and these two answer with a
 * bare number, which is exactly what a degree answer wants.
 */
const PRINCIPAL_DEGREE_ROWS: readonly (readonly [boolean, string, number])[] = [
  [false, "1", 0],
  [false, "\\dfrac{\\sqrt{3}}{2}", 30],
  [false, "\\dfrac{\\sqrt{2}}{2}", 45],
  [false, "\\dfrac{1}{2}", 60],
  [false, "0", 90],
  [false, "-\\dfrac{1}{2}", 120],
  [false, "-\\dfrac{\\sqrt{2}}{2}", 135],
  [false, "-\\dfrac{\\sqrt{3}}{2}", 150],
  [false, "-1", 180],
  [true, "-\\sqrt{3}", -60],
  [true, "-1", -45],
  [true, "-\\dfrac{\\sqrt{3}}{3}", -30],
  [true, "0", 0],
  [true, "\\dfrac{\\sqrt{3}}{3}", 30],
  [true, "1", 45],
  [true, "\\sqrt{3}", 60],
];

/**
 * L2c, the principal value of arccosine or arctangent, in degrees.
 *
 * The node's L1 evaluates ARCSINE in degrees and its L2a evaluates arccosine in radians, so
 * until this shape existed no item asked for arctangent's principal value at all and no item
 * asked for a degree measure outside arcsine's band. Both gaps matter and they are the same
 * gap: a learner who has only met arcsine takes "an inverse answers between a quarter turn
 * either side of zero" away from it, and then reads arccosine's second-quadrant answers as
 * negative and arctangent's negative answers as headings past a half turn.
 *
 * The two functions are drawn together rather than split into two templates because the
 * COMPARISON is the content. Asked one at a time a learner can carry a rule per function;
 * asked alternately they have to read which function it is first, which is the move.
 */
export const d9_trg7_principal_degree_l2: ItemTemplate = {
  template_id: "d9.trg7.principal-degree.l2",
  node_id: TRG7_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [isArctan, value, deg] = PRINCIPAL_DEGREE_ROWS[
      rng.int(0, PRINCIPAL_DEGREE_ROWS.length - 1)
    ] ?? [false, "\\dfrac{1}{2}", 60];
    const inverse = isArctan ? "\\arctan" : "\\arccos";
    const range = isArctan ? "(-90^{\\circ}, 90^{\\circ})" : "[0^{\\circ}, 180^{\\circ}]";
    return {
      prompt: `Evaluate $${inverse}\\left(${value}\\right)$. Give the angle in degrees. Enter one number, with no degree sign.`,
      answer: numericAnswer(`${deg}`),
      params: { fn: isArctan ? 1 : 0, deg },
      hints: [
        // Digit-free, as everywhere in this file: nearly every key here is a one- or two-digit
        // degree measure, so a hint naming one would leak on exactly the draws that used it.
        "Read which inverse it is before anything else, because the three inverses do not answer inside the same band and the band is what decides the sign of the answer.",
        "Arccosine is cut forward from zero across a half turn, so it never answers with a negative angle and a negative ratio comes back in the second quadrant. Arctangent is cut across the quarter turn either side of zero, so it answers negatively for a negative ratio and can never reach a quarter turn itself.",
        "Then recognize the special angle whose ratio has that size, and place it in the half of the band the sign allows.",
      ],
      worked_solution: [
        `$${inverse}$ asks for the angle whose ${isArctan ? "tangent" : "cosine"} is $${value}$, and it may only answer inside $${range}$.`,
        isArctan
          ? `Inside that band a negative tangent belongs to a negative angle and a positive one to a positive angle, so the sign of the ratio carries straight onto the angle.`
          : `Inside that band the first quarter turn has a positive cosine and the second a negative one, so the sign of the ratio decides which half of the band the angle is in.`,
        `The angle in that band with that ${isArctan ? "tangent" : "cosine"} is $${deg}^{\\circ}$.`,
        `So $${inverse}\\left(${value}\\right) = ${deg}^{\\circ}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.fn ?? 0}:${params.deg ?? 0}`,
};

/**
 * Every special reading `\arcsin` and `\arctan` answer with as a signed fraction of pi, as
 * `[is arctan, the ratio as LaTeX, numerator, denominator, negative]`.
 *
 * FOURTEEN rows, and the point of the list is the eight that are negative. Nothing in the bank
 * produced a negative exact-radian answer before it: {@link d9_trg7_arccos_radian_l2} is the
 * only radian shape and arccosine's range is `[0, pi]`, so its answers cannot be negative
 * however the ratio is signed. A learner who has practised radians only there has practised the
 * one inverse for which the sign never travels.
 *
 * Both quarter-turn endpoints are in for arcsine and neither is for arctangent, which is the
 * difference between a closed band and an open one showing up in the drawable set itself.
 */
const SIGNED_RADIAN_ROWS: readonly (readonly [boolean, string, number, number, boolean])[] =
  [
    [false, "\\dfrac{1}{2}", 1, 6, false],
    [false, "-\\dfrac{1}{2}", 1, 6, true],
    [false, "\\dfrac{\\sqrt{2}}{2}", 1, 4, false],
    [false, "-\\dfrac{\\sqrt{2}}{2}", 1, 4, true],
    [false, "\\dfrac{\\sqrt{3}}{2}", 1, 3, false],
    [false, "-\\dfrac{\\sqrt{3}}{2}", 1, 3, true],
    [false, "1", 1, 2, false],
    [false, "-1", 1, 2, true],
    [true, "\\dfrac{\\sqrt{3}}{3}", 1, 6, false],
    [true, "-\\dfrac{\\sqrt{3}}{3}", 1, 6, true],
    [true, "1", 1, 4, false],
    [true, "-1", 1, 4, true],
    [true, "\\sqrt{3}", 1, 3, false],
    [true, "-\\sqrt{3}", 1, 3, true],
  ];

/**
 * L2d, a principal value in exact radians whose sign can be negative.
 *
 * Measured against the real v2 checker before this was written: `exactRadianAnswer("-pi/6")`
 * grades itself, and grades `-1pi/6` and `-(1/6)pi` too, while an unsigned `pi/6` comes back
 * `sign_error` rather than `wrong_representation`. So the sign is a thing the grader
 * distinguishes here, which is what makes the shape worth asking.
 */
export const d9_trg7_signed_radian_l2: ItemTemplate = {
  template_id: "d9.trg7.signed-radian.l2",
  node_id: TRG7_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [isArctan, value, num, den, negative] = SIGNED_RADIAN_ROWS[
      rng.int(0, SIGNED_RADIAN_ROWS.length - 1)
    ] ?? [false, "\\dfrac{1}{2}", 1, 6, false];
    const inverse = isArctan ? "\\arctan" : "\\arcsin";
    const key = negative ? `-${radianKey(num, den)}` : radianKey(num, den);
    const tex = negative ? `-${radianTex(num, den)}` : radianTex(num, den);
    const deg = (negative ? -180 : 180) * (num / den);
    return {
      // `pi/5` again, for the reason `arccos-radian.l2` gives: it answers no row here, so the
      // format can be shown without any draw becoming answerable from the prompt alone.
      prompt: `Evaluate $${inverse}\\left(${value}\\right)$. Give the angle in exact radians as a fraction of $\\pi$, written with pi for $\\pi$ and with a leading minus sign where the angle is below zero, for example pi/5.`,
      answer: exactRadianAnswer(key),
      params: { fn: isArctan ? 1 : 0, num, den, neg: negative ? 1 : 0 },
      hints: [
        "Both of these inverses answer inside the quarter turn either side of zero, so a negative ratio comes back as an angle below zero rather than as a heading past a half turn. Find the angle in degrees first, since the special readings are easiest to recognize there.",
        "Then convert, and carry the sign through the conversion: a degree measure becomes radians when it is multiplied by $\\pi$ and divided by the number of degrees in a half turn, and multiplying a negative measure leaves it negative.",
      ],
      worked_solution: [
        `$${inverse}$ asks for the angle whose ${isArctan ? "tangent" : "sine"} is $${value}$, and it answers inside the quarter turn either side of zero.`,
        negative
          ? `The ratio is negative, and in that band only the angles below zero have a negative ${isArctan ? "tangent" : "sine"}, so the angle is $${deg}^{\\circ}$.`
          : `The ratio is positive, and in that band only the angles above zero have a positive ${isArctan ? "tangent" : "sine"}, so the angle is $${deg}^{\\circ}$.`,
        `Convert to radians by multiplying by $\\dfrac{\\pi}{180^{\\circ}}$: $${deg}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = ${tex}$.`,
        `So $${inverse}\\left(${value}\\right) = ${tex}$, typed as ${key}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.fn ?? 0}:${params.den ?? 0}:${params.neg ?? 0}`,
};

/**
 * The two shapes that share the L2 cell with the locked-mix pair, held separately so the mix
 * stays exactly two frozen slots and no already-frozen retry variant is re-seeded. See
 * `D9_EXTRA_PRACTICE_TEMPLATES` in `d9/practice.ts` for why the position in the aggregate is
 * load-bearing; `EL3_EXTRA_TEMPLATES` is the same arrangement in D8.
 */
export const TRG7_EXTRA_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg7_principal_degree_l2,
  d9_trg7_signed_radian_l2,
];

/** TRG.7's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG7_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg7_arcsin_degree_l1,
  d9_trg7_arccos_radian_l2,
  d9_trg7_range_interval_l2,
  d9_trg7_compose_principal_l3,
  d9_trg7_arctan_round_l3,
];
