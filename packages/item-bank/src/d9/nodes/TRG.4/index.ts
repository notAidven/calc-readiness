import {
  exactTrigValueAnswer,
  type GenerateContext,
  type ItemTemplate,
  multipleChoiceAnswer,
  type Rng,
} from "../../../template";

/**
 * TRG.4 practice templates: six functions off two readings, parity, and the two relations.
 *
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, escalating by how many separate
 * decisions an item needs rather than by arithmetic weight:
 *
 *  - L1  turn ONE reading over, which is the reciprocal pairing and nothing else;
 *  - L2a divide one reading by another, which is the quotient identity plus a sign;
 *  - L2b name the family a shown line belongs to, which is the only slot that asks the
 *        learner to look at a relation and say what KIND of thing it is;
 *  - L3a recover the reading you were NOT given, which is the Pythagorean identity for the
 *        size and the quadrant for the sign, two decisions that fail differently;
 *  - L3b evaluate a two-factor product at a heading you are only half told about, which is
 *        L3a's recovery, then parity, then a reciprocal or a quotient identity, and only then
 *        a multiplication.
 *
 * ## Two tiers moved, and parity moved into L3b rather than being dropped
 *
 * The naming item used to be the second L3 and L2b used to be `evenodd-value.l2`, parity on
 * its own. Recognizing which family a line belongs to is a real skill and it is still asked,
 * but picking one of three printed words cannot be the hardest thing a node asks, so it sits
 * at L2 now. The mix is locked at exactly two shapes per tier by `d9.test.ts` and by
 * `validate.ts`, so that demotion had to retire an L2, and parity was the one to go BECAUSE
 * the new L3 absorbs it: all four of `compound-evaluate.l3`'s shapes reverse the sweep on
 * their first factor, and two of those factors are even while two are odd, so the parity
 * decision is live on every draw of it rather than on a slot of its own. No content left the
 * node; one tier of it did.
 *
 * ## The gate that shaped every one of these
 *
 * The domain plan's spike measured this node's residual checker gate as TOTAL rather than
 * strict: the expression grammar contains no trigonometric functions at all, so a key like
 * `cos(x)` comes back `invalid_input/unsupported_syntax` AGAINST ITS OWN KEY. There is no
 * careful spelling that gets round it. So not one item here asks for a symbolic rewriting,
 * and every slot is an EVALUATION or a NAMING: the answer a learner types is a fraction or
 * one of three words, never an expression containing `sin`, `cos` or `tan`.
 *
 * That is a change of surface and not of content. "Rewrite the tangent using sine and
 * cosine" becomes "here are the sine and the cosine, give the tangent", which needs the same
 * identity and additionally checks the learner can run it.
 *
 * ## Why every value here comes from a Pythagorean triple
 *
 * The two readings at a heading have to satisfy $\sin^2 + \cos^2 = 1$, and the only way an
 * item can hand a learner BOTH of them as clean fractions is to take them off a right
 * triangle with whole sides. A drawn pair that did not satisfy the relation would be a
 * heading that does not exist, and L3a in particular would be asking the learner to recover
 * a number from an identity the prompt has already broken.
 *
 * Every triple below is primitive, so no value is ever an integer and no fraction is ever
 * unreduced: each of the six functions is `p/q` with `q > 1` and `gcd(p, q) = 1`. That
 * matters twice over. It keeps `exactTrigValueAnswer` on the `fraction_bar` notation tag, so
 * the answer field earns the `/` key, and it keeps every prompt's stated form honest, since
 * "write it as a fraction" is never asked of a whole number.
 *
 * ## Why no hint on any of these templates contains a digit
 *
 * `hint_leaks_answer` matches the answer key as a standalone value over the hint with its
 * whitespace stripped, and the keys here are short fractions built from small numbers that a
 * hint would reach by accident. Rather than reason about it per template, every hint on all
 * four numeric templates is written without a numeral of its own, and each names the rule
 * instead of substituting into it. `$1$` is the single exception and it is safe on this node
 * for a structural reason rather than a lucky one: no key here is ever a whole number. The
 * naming item's keys are the WORDS, so its hints use none of the three.
 *
 * The policy was written for the retired parity template, where on an even draw the answer
 * came back byte-identical to the reading the prompt stated, and it is kept rather than
 * relaxed now that that template is gone. `compound-evaluate.l3` also prints a value in its
 * prompt, but there the two cannot coincide: a given reading is always over the HYPOTENUSE,
 * every one of its four collapsed answers is over a LEG, and both are in lowest terms, so no
 * draw can make them the same fraction.
 */

export const TRG4_NODE = "TRG.4";

/** How every prompt here states the form, so a decimal is never a surprise rejection. */
const FRACTION_FORM = "Write your answer as a fraction, and do not give a decimal.";

/**
 * Primitive Pythagorean triples: `a` and `b` are the two legs, `c` the hypotenuse.
 *
 * Primitive is the requirement, not a preference. `gcd(a, b, c) = 1` pairwise here, so every
 * one of the six functions comes out already in lowest terms and no step or hint anywhere in
 * this file has to claim a reduction that some draws would not require.
 */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
  [12, 35, 37],
];

/**
 * Each triple in BOTH orientations, so a heading can be steep or shallow.
 *
 * Without this the sine is always the smaller leg over the hypotenuse, and a learner could
 * answer several of these templates by reaching for whichever fraction looks smaller.
 */
export interface Heading {
  /** The leg the sine reads. */
  a: number;
  /** The leg the cosine reads. */
  b: number;
  /** The hypotenuse both of them are measured over. */
  c: number;
}

/**
 * Exported because `compound-evaluate.l3`'s `triple` param is an INDEX into this array, so a
 * reader of that param cannot resolve it without the array itself.
 *
 * The worked-solution figure in `apps/web/src/lessons/worked/d9TRG4.tsx` draws the triangle
 * that param names, and it began life holding its own copy of these fourteen entries. A copy
 * is the one arrangement that can go wrong silently here: reorder a triple on this side and
 * the figure keeps rendering, keeps passing its layout sweep, and illustrates a different
 * heading than the item asks about. Nothing downstream compares an answer to a picture, so
 * there is no gate that would catch it. Exporting the table removes the failure mode rather
 * than guarding it, which is why this is an export and not another test.
 */
export const TRG4_HEADINGS: readonly Heading[] = TRIPLES.flatMap(([p, q, c]) => [
  { a: p, b: q, c },
  { a: q, b: p, c },
]);

/** Quadrant numerals, indexed by quadrant. */
const NUMERAL: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

/** How the sine is signed in each quadrant: the vertical coordinate's sign. */
function sineNegative(quadrant: number): boolean {
  return quadrant === 3 || quadrant === 4;
}

/** How the cosine is signed in each quadrant: the horizontal coordinate's sign. */
function cosineNegative(quadrant: number): boolean {
  return quadrant === 2 || quadrant === 3;
}

/**
 * How any one of the six is signed in a quadrant, indexed the way `FUNCTIONS` indexes them.
 *
 * The other four inherit their signs from the two readings and never need a table of their
 * own: a reciprocal keeps the sign of the reading it turns over, and a quotient of the two is
 * negative exactly when the readings disagree. `compound-evaluate.l3` needs this for a
 * function its prompt never names, which is the one the product collapses to.
 */
function signNegative(fn: number, quadrant: number): boolean {
  const sinNeg = sineNegative(quadrant);
  const cosNeg = cosineNegative(quadrant);
  switch (fn) {
    // Sine and cosecant read the vertical coordinate.
    case 0:
    case 3:
      return sinNeg;
    // Cosine and secant read the horizontal one.
    case 1:
    case 4:
      return cosNeg;
    // Tangent and cotangent divide one by the other.
    default:
      return sinNeg !== cosNeg;
  }
}

/** `-3/4` or `3/4`, as the checker spells it. */
function key(n: number, d: number, negative: boolean): string {
  return `${negative ? "-" : ""}${n}/${d}`;
}

/** The same value as KaTeX, with the sign outside the fraction. */
function tex(n: number, d: number, negative: boolean): string {
  return `${negative ? "-" : ""}\\dfrac{${n}}{${d}}`;
}

interface FunctionFacts {
  /** The symbol, for KaTeX. */
  sym: string;
  /** The word, for prose. */
  name: string;
  /** True for the two built on the horizontal coordinate alone. */
  even: boolean;
}

/** The six, in the order `fn` indexes them. */
const FUNCTIONS: readonly FunctionFacts[] = [
  { sym: "\\sin", name: "sine", even: false },
  { sym: "\\cos", name: "cosine", even: true },
  { sym: "\\tan", name: "tangent", even: false },
  { sym: "\\csc", name: "cosecant", even: false },
  { sym: "\\sec", name: "secant", even: true },
  { sym: "\\cot", name: "cotangent", even: false },
];

function facts(fn: number): FunctionFacts {
  return FUNCTIONS[fn] ?? (FUNCTIONS[0] as FunctionFacts);
}

/** The magnitude of function `fn` at a heading whose legs are `a` and `b` over `c`. */
function magnitude(fn: number, a: number, b: number, c: number): [number, number] {
  switch (fn) {
    case 0:
      return [a, c];
    case 1:
      return [b, c];
    case 2:
      return [a, b];
    case 3:
      return [c, a];
    case 4:
      return [c, b];
    default:
      return [b, a];
  }
}

// ── L1: turn one reading over ────────────────────────────────────────────────

/** The three reciprocal pairs, as `[plain, reciprocal]` indices into `FUNCTIONS`. */
const RECIPROCAL_PAIRS: readonly (readonly [number, number])[] = [
  [0, 3],
  [1, 4],
  [2, 5],
];

/**
 * L1, the pairing on its own.
 *
 * Every value here is positive, which is what keeps it an L1: the only decision is which of
 * the six functions the given one is paired with, and then a turn. The sign arrives at L2a.
 *
 * The practice form is a word problem and the assessment forms are not, because the
 * translation is genuine work: the themed prompt names each meter by the WORD for its
 * function and never writes the symbol, so a learner has to know that a meter calibrated in
 * cosecant is the one reading the sine upside down before any arithmetic can start. That is
 * the node's own scenario, two instruments reading one signal and agreeing once converted.
 * The math, the params and the key are identical either way.
 */
export const d9_trg4_reciprocal_value_l1: ItemTemplate = {
  template_id: "d9.trg4.reciprocal-value.l1",
  node_id: TRG4_NODE,
  difficulty: 1,
  generate(rng: Rng, context?: GenerateContext) {
    const { a, b, c } = rng.pick(TRG4_HEADINGS);
    const pair = rng.int(0, 2);
    // 0: the plain function is given and its reciprocal is asked for. 1: the other way.
    const direction = rng.int(0, 1);
    const [plain, reciprocal] = RECIPROCAL_PAIRS[pair] as readonly [number, number];
    const givenFn = direction === 0 ? plain : reciprocal;
    const targetFn = direction === 0 ? reciprocal : plain;
    const [n, d] = magnitude(givenFn, a, b, c);
    const given = facts(givenFn);
    const target = facts(targetFn);
    // Drawn AFTER every math parameter, so the assessment forms stay byte-identical.
    const themed =
      `Two meters in the control gallery watch the same heading. One is calibrated in ` +
      `${given.name} and reads $${tex(n, d, false)}$. The other is calibrated in ` +
      `${target.name}. What does the second meter read? ${FRACTION_FORM}`;
    const neutral =
      `At one heading, $${given.sym}\\theta = ${tex(n, d, false)}$. ` +
      `Give $${target.sym}\\theta$ exactly. ${FRACTION_FORM}`;
    return {
      prompt: context?.form === "practice" ? themed : neutral,
      answer: exactTrigValueAnswer(key(d, n, false)),
      params: { pair, direction, n, d },
      hints: [
        "Six names, three pairs: sine with cosecant, cosine with secant, and tangent with cotangent. Settle which pair you are in before you touch the number, because the co- at the front of a name is not what decides the pairing.",
        "Two functions in a pair multiply to $1$, so each one is the other turned upside down. Swap the top of the reading you were given with its bottom.",
      ],
      worked_solution: [
        `The ${given.name} and the ${target.name} are a reciprocal pair, so $${target.sym}\\theta = \\dfrac{1}{${given.sym}\\theta}$ at every heading.`,
        `Dividing $1$ by a fraction turns it over, so $\\dfrac{1}{${tex(n, d, false)}} = ${tex(d, n, false)}$.`,
        `The second reading is $${target.sym}\\theta = ${tex(d, n, false)}$, typed \`${key(d, n, false)}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.pair ?? 0}:${params.direction ?? 0}:${params.n ?? 0}:${params.d ?? 0}`,
};

// ── L2a: divide one reading by the other ─────────────────────────────────────

/**
 * The one draw `quotient-value.l2` may not make: the CFU's own numbers.
 *
 * The CFU gives $\sin\theta = -\dfrac{4}{5}$ in Quadrant III and asks for the tangent, which
 * is `4/3`. This template would reach the same answer off the same triple, and a learner who
 * has just been walked through the check would be answering it again from memory.
 */
const CFU_QUOTIENT_DRAW = "4:3:3:0";

/**
 * L2a, the quotient identity with a sign attached.
 *
 * Quadrant I is never drawn, and that exclusion is doing two jobs at once. It keeps a sign
 * decision in every instance, which is what separates this from an L1; and it clears the
 * template of every quotient the lesson itself works, since all four of the slides' boards
 * are built at positive readings.
 */
export const d9_trg4_quotient_value_l2: ItemTemplate = {
  template_id: "d9.trg4.quotient-value.l2",
  node_id: TRG4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    let a = 0;
    let b = 0;
    let c = 0;
    let quadrant = 2;
    let target = 0;
    do {
      const heading = rng.pick(TRG4_HEADINGS);
      a = heading.a;
      b = heading.b;
      c = heading.c;
      quadrant = rng.int(2, 4);
      // 0 asks for the tangent, 1 for the cotangent.
      target = rng.int(0, 1);
    } while (`${a}:${b}:${quadrant}:${target}` === CFU_QUOTIENT_DRAW);

    const sinNeg = sineNegative(quadrant);
    const cosNeg = cosineNegative(quadrant);
    const answerNeg = sinNeg !== cosNeg;
    const n = target === 0 ? a : b;
    const d = target === 0 ? b : a;
    const symbol = target === 0 ? "\\tan" : "\\cot";
    const name = target === 0 ? "tangent" : "cotangent";
    const recipe =
      target === 0
        ? "\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}"
        : "\\cot\\theta = \\dfrac{\\cos\\theta}{\\sin\\theta}";
    const overTex =
      target === 0
        ? `${tex(a, c, sinNeg)} \\div ${tex(b, c, cosNeg)}`
        : `${tex(b, c, cosNeg)} \\div ${tex(a, c, sinNeg)}`;
    return {
      prompt:
        `At one heading, $\\sin\\theta = ${tex(a, c, sinNeg)}$ and ` +
        `$\\cos\\theta = ${tex(b, c, cosNeg)}$. Give $${symbol}\\theta$ exactly. ${FRACTION_FORM}`,
      answer: exactTrigValueAnswer(key(n, d, answerNeg)),
      params: { a, b, c, quadrant, target },
      hints: [
        `The ${name} is not measured on its own: it is one of the two readings you were given divided by the other. Settle which of them goes on top before you divide anything.`,
        "Both readings sit over the same denominator, so when one is divided by the other that denominator cancels and only the two numerators are left.",
        "Sign the result separately from its size. Two readings with the same sign give a positive quotient, and two with opposite signs give a negative one.",
      ],
      worked_solution: [
        `The quotient identity says $${recipe}$, so the answer comes out of the two readings rather than out of a new measurement.`,
        `Dividing gives $${overTex}$.`,
        `Both readings are over $${c}$, so that cancels and only the numerators are left: $\\dfrac{${n}}{${d}}$.`,
        answerNeg
          ? `In Quadrant ${NUMERAL[quadrant]} the two readings carry opposite signs, so their quotient is negative.`
          : `In Quadrant ${NUMERAL[quadrant]} the two readings carry the same sign, so their quotient is positive.`,
        `So $${symbol}\\theta = ${tex(n, d, answerNeg)}$, typed \`${key(n, d, answerNeg)}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.b ?? 0}:${params.quadrant ?? 0}:${params.target ?? 0}`,
};

// ── L3a: recover the reading you were not given ──────────────────────────────

/**
 * The headings `pythagorean-solve.l3` may draw: every triple except the 3-4-5.
 *
 * That one is excluded outright rather than case by case. The CFU recovers the cosine from
 * $\sin\theta = -\dfrac{4}{5}$ in Quadrant III on its way to the tangent, and slide three's
 * first board recovers it from $\sin\theta = \dfrac{3}{5}$ in Quadrant II, so between them
 * the lesson works both orientations of that triple in the two quadrants this template would
 * most like to draw. Six triples in two orientations across four quadrants and two givens
 * leaves 96 instances, which is depth to spare.
 */
const SOLVE_HEADINGS = TRG4_HEADINGS.filter((heading) => heading.c !== 5);

/**
 * L3a, the node's central question: the identity for the size, the quadrant for the sign.
 *
 * The two halves fail differently and the checker separates them, which is what makes the
 * tier diagnostic. A learner who cannot run the identity gets the wrong magnitude; one who
 * takes the positive root without reading the quadrant gets the right magnitude with the
 * wrong sign, and that is the miss the whole slide was written for.
 */
export const d9_trg4_pythagorean_solve_l3: ItemTemplate = {
  template_id: "d9.trg4.pythagorean-solve.l3",
  node_id: TRG4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const { a, b, c } = rng.pick(SOLVE_HEADINGS);
    const quadrant = rng.int(1, 4);
    // 0: the sine is given and the cosine is asked for. 1: the other way round.
    const given = rng.int(0, 1);
    const sinNeg = sineNegative(quadrant);
    const cosNeg = cosineNegative(quadrant);
    const givenSym = given === 0 ? "\\sin" : "\\cos";
    const targetSym = given === 0 ? "\\cos" : "\\sin";
    const gn = given === 0 ? a : b;
    const tn = given === 0 ? b : a;
    const givenNeg = given === 0 ? sinNeg : cosNeg;
    const targetNeg = given === 0 ? cosNeg : sinNeg;
    const coordinate = given === 0 ? "horizontal" : "vertical";
    return {
      prompt:
        `At one heading, $${givenSym}\\theta = ${tex(gn, c, givenNeg)}$, and $\\theta$ lies ` +
        `in Quadrant ${NUMERAL[quadrant]}. Give $${targetSym}\\theta$ exactly. ${FRACTION_FORM}`,
      answer: exactTrigValueAnswer(key(tn, c, targetNeg)),
      params: { a, b, c, quadrant, given },
      hints: [
        "Nothing here hands you the second reading, and one relation ties the two together at every heading: their squares add to $1$.",
        "Square the reading you were given and take that away from $1$. What is left is the SQUARE of the reading you want, so a root still has to be taken before you have an answer.",
        "A square root offers two candidates and the relation does not choose between them. The quadrant does, by saying which side of which axis the point sits on.",
      ],
      worked_solution: [
        `At every heading $\\sin^{2}\\theta + \\cos^{2}\\theta = 1$, so the missing reading can be recovered from the one you have.`,
        `Squaring the reading given: $\\left(${tex(gn, c, givenNeg)}\\right)^{2} = \\dfrac{${gn * gn}}{${c * c}}$.`,
        `Taking that away from $1$ leaves the square of the reading wanted: $${targetSym}^{2}\\theta = \\dfrac{${c * c} - ${gn * gn}}{${c * c}}$, which is $\\dfrac{${tn * tn}}{${c * c}}$.`,
        `Taking the square root leaves two candidates, $${tex(tn, c, false)}$ and $${tex(tn, c, true)}$.`,
        targetNeg
          ? `In Quadrant ${NUMERAL[quadrant]} the ${coordinate} coordinate is negative, so the negative candidate is the one.`
          : `In Quadrant ${NUMERAL[quadrant]} the ${coordinate} coordinate is positive, so the positive candidate is the one.`,
        `So $${targetSym}\\theta = ${tex(tn, c, targetNeg)}$, typed \`${key(tn, c, targetNeg)}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a ?? 0}:${params.b ?? 0}:${params.quadrant ?? 0}:${params.given ?? 0}`,
};

// ── L2b: name the family a shown line belongs to ─────────────────────────────

/**
 * The three option words, byte for byte as the checker matches them.
 *
 * **Every word here has to be lower case, including the proper noun.** The checker half of
 * a choose-one comparison is a bare `===` against the key, but `normalizeTextSubmission` in
 * `apps/web/src/lessons/answerFormat.ts` lower-cases every `multiple_choice` submission, and
 * it is the only route to the grader from all three surfaces that serve these items
 * (`LessonPractice.tsx`, `InfiniteDrill.tsx`, `EraAdvanceCeremony.tsx`). A key carrying a
 * capital therefore cannot be matched from any screen a learner can touch, whatever they
 * type. `Pythagorean` shipped that way briefly and killed four of the thirteen draws below.
 *
 * Nothing in this package reports it, which is why the rule is written down here rather than
 * left to the guard: `validateTemplates` submits the canonical key DIRECTLY, never crossing
 * the fold, so a dead item validates clean over every template.
 */
const IDENTITY_OPTIONS = ["pythagorean", "quotient", "reciprocal"] as const;

export interface IdentityLine {
  /** The rewriting the learner is asked to name, as KaTeX. */
  latex: string;
  /** Which of `IDENTITY_OPTIONS` it belongs to. */
  family: 0 | 1 | 2;
}

/**
 * Twelve lines, none of them in a form the lesson shows.
 *
 * That is deliberate and it is most of the difficulty. Every canonical statement of these
 * three families appears somewhere in the mini-lesson or in one of the four widgets, so a
 * template drawing from the canonical forms would be testing recall of a shape rather than
 * recognition of a relation. Each line here is a rearrangement: a product read against $1$,
 * a quotient read from the bottom up, a Pythagorean statement with the $1$ already moved.
 *
 * The two families that both show a PRODUCT are what keep the discrimination real. A
 * reciprocal product comes out at $1$; a quotient one multiplied through comes out at a third
 * function. Nothing about which functions are written decides it.
 *
 * **No line keyed `reciprocal` may name the tangent or the cotangent**, and two that did are
 * gone from this table: $\tan\theta \cdot \cot\theta = 1$ and $\dfrac{1}{\cot\theta} =
 * \tan\theta$. Both are true, both are conventionally filed under reciprocal, and both were
 * keyed that way here, which cost a learner the item on 16.8% of draws for an answer they
 * could defend. Those two functions are DEFINED as ratios of the other four, so every
 * reciprocal statement about either of them is a quotient statement one substitution away:
 * $\tan\theta\cot\theta = \frac{\sin}{\cos}\cdot\frac{\cos}{\sin} = 1$ is the standard
 * justification, and it runs entirely through the quotient identities. The prompt now states
 * that it grades the line's shape rather than what would justify it, which is the other half
 * of the same fix, but no wording rescues a line that a reader can sort two ways and a key
 * that admits one. `practiceShapes.test.ts` holds the rule in both directions.
 */
export const TRG4_IDENTITY_LINES: readonly IdentityLine[] = [
  { latex: "\\sin\\theta \\cdot \\csc\\theta = 1", family: 2 },
  { latex: "\\cos\\theta \\cdot \\sec\\theta = 1", family: 2 },
  { latex: "\\dfrac{1}{\\sec\\theta} = \\cos\\theta", family: 2 },
  { latex: "\\dfrac{1}{\\csc\\theta} = \\sin\\theta", family: 2 },
  { latex: "\\dfrac{\\sin\\theta}{\\cos\\theta} = \\tan\\theta", family: 1 },
  { latex: "\\dfrac{\\cos\\theta}{\\sin\\theta} = \\cot\\theta", family: 1 },
  { latex: "\\tan\\theta \\cdot \\cos\\theta = \\sin\\theta", family: 1 },
  { latex: "\\cot\\theta \\cdot \\sin\\theta = \\cos\\theta", family: 1 },
  { latex: "\\cos^{2}\\theta = 1 - \\sin^{2}\\theta", family: 0 },
  { latex: "\\sin^{2}\\theta = 1 - \\cos^{2}\\theta", family: 0 },
  { latex: "1 - \\sin^{2}\\theta = \\cos^{2}\\theta", family: 0 },
  { latex: "1 - \\cos^{2}\\theta = \\sin^{2}\\theta", family: 0 },
];

/** What gives each family away, in one sentence, for the worked solution's middle step. */
const FAMILY_TELL: readonly [string, string, string] = [
  "The line carries SQUARES and relates them to $1$. Only one family of identities has a square in it at all, and this is the one that says how far the point sits from the center of the pad.",
  "One function is written as a division of two OTHERS, or as a product of two of them that comes out at a third function rather than at $1$. That is the family built on dividing one reading by another.",
  "Two functions multiply to $1$, or one is written as $1$ over another. That is a statement about a pair being turned over, and it is the only family that makes it.",
];

/**
 * L2b, the only slot that asks what KIND of relation a line is.
 *
 * It is the one item on the node with no arithmetic in it at all, and that is a real thing to
 * ask: a learner who can evaluate every function and still cannot say which relation they
 * just used has the procedure and not the idea, and no other slot here separates those two.
 *
 * **That argument used to be filed as the reason this was an L3, and it is not one.** Having
 * no arithmetic makes an item DIFFERENT from its neighbours, not harder than them, and what
 * the learner actually does here is pick one of three words printed in the prompt: a blind
 * guess scores a third of the time, and the twelve lines are keyed so that no single word is
 * worth guessing on more than 42% of draws (`practiceShapes.test.ts`), which caps how bad a
 * guesser does rather than making the question hard. The node's hardest slot has to be one
 * where several relations are chained, and that is `compound-evaluate.l3`. The tier moved
 * deliberately, so do not read the L2 as a demotion of the SKILL: the discrimination this
 * table was rebuilt for is intact and is asserted in both directions.
 */
export const d9_trg4_identity_name_l2: ItemTemplate = {
  template_id: "d9.trg4.identity-name.l2",
  node_id: TRG4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const line = rng.int(0, TRG4_IDENTITY_LINES.length - 1);
    const entry = TRG4_IDENTITY_LINES[line] ?? (TRG4_IDENTITY_LINES[0] as IdentityLine);
    const options = IDENTITY_OPTIONS.map((option) => `\`${option}\``).join(", ");
    return {
      prompt:
        `Which family of identities is the line $${entry.latex}$ a statement of? ` +
        `Sort it by the shape of the relation itself, not by which chain of substitutions could get you there. ` +
        `Answer with exactly one of ${options}, spelled as shown.`,
      answer: multipleChoiceAnswer(IDENTITY_OPTIONS[entry.family]),
      params: { line, family: entry.family },
      hints: [
        "Which functions appear settles nothing, because all six of them turn up across all three families. What the line RELATES is what settles it.",
        "Three shapes, three families. One relates squares to $1$, one divides a reading by another reading, and one turns a single function over so that a pair multiplies to $1$.",
        "Where two functions are multiplied, look at what the product comes out AT. A product landing on $1$ and a product landing on a third function belong to different families.",
      ],
      worked_solution: [
        `The line to sort is $${entry.latex}$.`,
        FAMILY_TELL[entry.family],
        `So the line is a statement of the ${IDENTITY_OPTIONS[entry.family]} family, typed \`${IDENTITY_OPTIONS[entry.family]}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.line ?? 0}`,
};

// ── L3b: chain the relations into one value ──────────────────────────────────

interface CompoundShape {
  /** Index into `FUNCTIONS` of the factor written at the REVERSED heading. */
  first: number;
  /** Index into `FUNCTIONS` of the factor written at the heading itself. */
  second: number;
  /** Index into `FUNCTIONS` of the one function the product is, up to the parity sign. */
  collapsed: number;
  /** The product rewritten in the two readings, with the parity sign already folded in. */
  inReadings: string;
  /** Which relation turns that fraction into the collapsed function, as a clause. */
  collapseWhy: string;
}

/**
 * The four products, each two factors that collapse to a single function.
 *
 * Every one applies parity to its FIRST factor, which is where the retired `evenodd-value.l2`
 * went. Two of those four first factors are even (the cosine and the secant) and two are odd
 * (the sine and the tangent), so parity is a decision on every draw rather than a constant
 * flip a learner could stop reading. **Keep that split if the table is ever edited**, and keep
 * it on the FIRST factor: a table of four odd first factors turns "reverse the sweep" into
 * "write a minus", which is the property the retired template was retired for not having.
 *
 * The collapse itself, verified one shape at a time rather than asserted:
 *
 *  - $\sin(-\theta)\sec\theta = -\sin\theta \cdot \frac{1}{\cos\theta} = -\tan\theta$;
 *  - $\cos(-\theta)\csc\theta = \cos\theta \cdot \frac{1}{\sin\theta} = \cot\theta$;
 *  - $\tan(-\theta)\csc\theta = -\frac{\sin\theta}{\cos\theta} \cdot \frac{1}{\sin\theta}
 *    = -\sec\theta$;
 *  - $\sec(-\theta)\sin\theta = \frac{1}{\cos\theta} \cdot \sin\theta = \tan\theta$.
 *
 * Read the middle term of each and one fact does all four: the product of the UNREVERSED first
 * factor with the second is exactly the collapsed function, with no sign of its own. So the
 * leading minus is the first factor's parity and nothing else, which is why `flipped` is
 * derived from `FUNCTIONS[first].even` below instead of being a fifth field here that could
 * disagree with the other four. `practiceShapes.test.ts` checks the whole table numerically,
 * by evaluating both factors off the prompt and multiplying them, so a sign error in this
 * table fails there rather than shipping.
 */
const COMPOUND_SHAPES: readonly CompoundShape[] = [
  {
    first: 0,
    second: 4,
    collapsed: 2,
    inReadings: "-\\sin\\theta \\cdot \\dfrac{1}{\\cos\\theta}",
    collapseWhy: "One reading over the other is the quotient identity",
  },
  {
    first: 1,
    second: 3,
    collapsed: 5,
    inReadings: "\\cos\\theta \\cdot \\dfrac{1}{\\sin\\theta}",
    collapseWhy: "One reading over the other is the quotient identity",
  },
  {
    first: 2,
    second: 3,
    collapsed: 4,
    inReadings: "-\\dfrac{\\sin\\theta}{\\cos\\theta} \\cdot \\dfrac{1}{\\sin\\theta}",
    collapseWhy:
      "The sine cancels and what is left is $1$ over the cosine, which is the reciprocal identity",
  },
  {
    first: 4,
    second: 0,
    collapsed: 2,
    inReadings: "\\dfrac{1}{\\cos\\theta} \\cdot \\sin\\theta",
    collapseWhy: "One reading over the other is the quotient identity",
  },
];

/** How each collapsed function is read off the two readings, indexed by `FUNCTIONS`. */
const COLLAPSE_EVALUATION: Record<number, string> = {
  2: "Dividing the sine by the cosine",
  4: "Turning the cosine over",
  5: "Dividing the cosine by the sine",
};

/**
 * The one heading, given reading and quadrant `compound-evaluate.l3` may not draw: the CFU's.
 *
 * The CFU states $\sin\theta = -\dfrac{4}{5}$ with $\theta$ in Quadrant III and asks for the
 * tangent. Shape 3 collapses to $\tan\theta$, so on this cell it prints the check's own line,
 * runs the check's own recovery and keys `4/3`: the item IS the CFU with a wrapper round it.
 * The exclusion is keyed WITHOUT the shape, which drops the other three shapes on this cell
 * too, because the recovery half of all four of them is the check's recovery off a line the
 * learner has just been walked through, and the given line is the part they recognize. Four
 * cells out of 336, which is nothing this template can miss.
 *
 * Nothing else on the node needs excluding here, and that is a property of the QUESTION rather
 * than of the numbers: every board in the mini-lesson and every one of the four widgets asks
 * for a reading or for a family, and not one of them asks for a product of two factors, so
 * apart from this cell there is no instance below that a learner has been shown the answer to.
 */
const CFU_COMPOUND_DRAW = "4:3:1:3";

/**
 * L3b, the node's hardest slot: several relations chained into one exact value.
 *
 * A learner is told one reading and a quadrant, and asked for a two-factor product. The long
 * route is four separate decisions, each of which fails differently: recover the reading the
 * prompt withheld (the Pythagorean identity for its size, the quadrant for its sign, which is
 * L3a entire), reverse the sweep on the first factor (parity), rewrite the second factor
 * through its reciprocal or quotient identity, and only then multiply. The short route is
 * seeing that the product is a single function all along and evaluating that one instead.
 * Both land on the same key, which is what makes the shortcut a reward rather than a different
 * question, and the reveal below takes the short route because that is the thing worth
 * learning here.
 *
 * **Quadrant I is never drawn**, so a sign decision is live in every instance and neither the
 * recovered reading nor the collapsed function can be reached by taking every root positive.
 *
 * **The answer can never be a value the prompt printed**, and that is structural rather than
 * lucky, so no guard has to reroll for it. The prompt states one value, a sine or a cosine,
 * whose denominator is the HYPOTENUSE. The four shapes answer with a tangent ($a/b$, twice), a
 * cotangent ($b/a$) or a secant ($c/b$), every one of them over a LEG. A leg is strictly
 * shorter than the hypotenuse, both fractions are already in lowest terms because every triple
 * is primitive, and a reduced fraction has exactly one spelling, so the two cannot be the same
 * number let alone the same string. That also confirms the other two properties the node's
 * values owe: every denominator here is a leg or a hypotenuse of a primitive triple and so is
 * at least $3$, which keeps every answer a genuine fraction rather than a whole number, and
 * none of them is ever zero, so nothing is ever undefined.
 *
 * The prompt is neutral in every form rather than themed. The node's scenario is two meters
 * reading one signal, which L1 uses to make the reciprocal PAIRING a translation problem; a
 * product of two factors at a reversed sweep has no instrument reading behind it, and framing
 * it as one would be the decorative prefix the authoring skill rules out.
 */
export const d9_trg4_compound_evaluate_l3: ItemTemplate = {
  template_id: "d9.trg4.compound-evaluate.l3",
  node_id: TRG4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let triple = 0;
    let givenSine = 0;
    let quadrant = 2;
    let shape = 0;
    let a = 0;
    let b = 0;
    let c = 0;
    do {
      triple = rng.int(0, TRG4_HEADINGS.length - 1);
      const heading = TRG4_HEADINGS[triple] ?? (TRG4_HEADINGS[0] as Heading);
      a = heading.a;
      b = heading.b;
      c = heading.c;
      givenSine = rng.int(0, 1);
      quadrant = rng.int(2, 4);
      shape = rng.int(0, COMPOUND_SHAPES.length - 1);
    } while (`${a}:${b}:${givenSine}:${quadrant}` === CFU_COMPOUND_DRAW);

    const entry = COMPOUND_SHAPES[shape] ?? (COMPOUND_SHAPES[0] as CompoundShape);
    const first = facts(entry.first);
    const collapsed = facts(entry.collapsed);
    // The only thing that can put a minus in front of the collapsed function: see the table.
    const flipped = !first.even;

    const givenFn = givenSine === 1 ? 0 : 1;
    const targetFn = givenSine === 1 ? 1 : 0;
    const given = facts(givenFn);
    const target = facts(targetFn);
    const [gn] = magnitude(givenFn, a, b, c);
    const [tn] = magnitude(targetFn, a, b, c);
    const givenNeg = signNegative(givenFn, quadrant);
    const targetNeg = signNegative(targetFn, quadrant);
    const coordinate = targetFn === 0 ? "vertical" : "horizontal";

    const [n, d] = magnitude(entry.collapsed, a, b, c);
    const collapsedNeg = signNegative(entry.collapsed, quadrant);
    const answerNeg = collapsedNeg !== flipped;

    const product = `${first.sym}(-\\theta) \\cdot ${facts(entry.second).sym}\\theta`;
    // The secant is the one collapse built on a single reading, so a learner who has already
    // spotted it and was handed the cosine has nothing left to recover. Claiming the recovery
    // step anyway would be claiming work the draw did not require.
    const needsRecovery = !(entry.collapsed === 4 && givenSine === 0);

    return {
      prompt:
        `At one heading, $${given.sym}\\theta = ${tex(gn, c, givenNeg)}$, and $\\theta$ lies ` +
        `in Quadrant ${NUMERAL[quadrant]}. Give $${product}$ exactly. ${FRACTION_FORM}`,
      answer: exactTrigValueAnswer(key(n, d, answerNeg)),
      params: { triple, givenSine, quadrant, shape },
      hints: [
        "Rewrite each factor in terms of the sine and the cosine before you evaluate anything. Written that way the whole product is a single fraction in those two readings, which means it is one of the six functions with at most a minus in front of it.",
        "Only one of the two readings is given, and the other comes out of the relation that ties them together at every heading: their squares add to $1$. That fixes its size, and the quadrant fixes which of the two square roots it is.",
        "The reversed sweep sits on the first factor and nowhere else. Cosine and secant report the horizontal coordinate, which the reflection leaves alone, so those two come back unchanged; the other four carry the vertical coordinate and come back with the opposite sign.",
      ],
      worked_solution: [
        first.even
          ? `The ${first.name} reports the horizontal coordinate, which a reversed sweep does not touch, so $${first.sym}(-\\theta) = ${first.sym}\\theta$.`
          : `The ${first.name} carries the vertical coordinate, whose sign a reversed sweep flips, so $${first.sym}(-\\theta) = -${first.sym}\\theta$.`,
        `Writing both factors in the two readings, the product becomes $${entry.inReadings}$.`,
        `${entry.collapseWhy}, so the whole product is $${flipped ? "-" : ""}${collapsed.sym}\\theta$ and one function is all that has to be evaluated.`,
        ...(needsRecovery
          ? [
              `Only the ${given.name} was given, so the Pythagorean identity supplies the other reading: squaring what you have and taking it away from $1$ leaves $${target.sym}^{2}\\theta = \\dfrac{${tn * tn}}{${c * c}}$.`,
              `A square root offers two candidates, and in Quadrant ${NUMERAL[quadrant]} the ${coordinate} coordinate is ${targetNeg ? "negative" : "positive"}, so $${target.sym}\\theta = ${tex(tn, c, targetNeg)}$.`,
            ]
          : [
              `The ${collapsed.name} is built on the ${given.name} alone, and that is the reading you were handed, so nothing has to be recovered.`,
            ]),
        `${COLLAPSE_EVALUATION[entry.collapsed]} gives $${collapsed.sym}\\theta = ${tex(n, d, collapsedNeg)}$.`,
        flipped
          ? `The reversed sweep left a minus in front of that, so $${product}$ comes out at $${tex(n, d, answerNeg)}$, typed \`${key(n, d, answerNeg)}\`.`
          : `The ${first.name} came back from the reversed sweep unchanged, so no minus was picked up and $${product}$ comes out at $${tex(n, d, answerNeg)}$, typed \`${key(n, d, answerNeg)}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.triple ?? 0}:${params.givenSine ?? 0}:${params.quadrant ?? 0}:${params.shape ?? 0}`,
};

/** TRG.4's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const TRG4_TEMPLATES: readonly ItemTemplate[] = [
  d9_trg4_reciprocal_value_l1,
  d9_trg4_quotient_value_l2,
  d9_trg4_identity_name_l2,
  d9_trg4_pythagorean_solve_l3,
  d9_trg4_compound_evaluate_l3,
];
