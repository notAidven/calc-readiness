import { type ItemTemplate, intervalAnswer, type Rng } from "../../../template";

/**
 * FUN.2 practice templates: domain and range, which inputs a rule accepts and which outputs it
 * can reach. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the domain of a bare even root, where finding the boundary is one move and writing
 *        the interval is the rest of the work;
 *  - L2a the domain of a quotient whose denominator carries a COEFFICIENT, so the excluded
 *        input has to be solved for rather than read off, and the answer is a union;
 *  - L2b the RANGE of a rule built on a square or an absolute value, which is the half of this
 *        node that has nothing to do with restrictions;
 *  - L3a an even root whose radicand has a NEGATIVE coefficient on the input, so the direction
 *        turns over, with two decoy numbers outside the root that cannot restrict anything;
 *  - L3b both restrictions at once: an even root over a linear denominator whose zero sits
 *        INSIDE the root's stretch, so the stretch is split and the answer is a union.
 *
 * ## Why every shape answers as an interval, and not as set-builder
 *
 * `setBuilderAnswer` is the other option and it is wrong for this node twice over. Its
 * comparator can conjoin only single-interval conditions, so `{x | x != 5}` grades and a domain
 * of two stretches does not: L2a and L3b would be unstatable. And writing set-builder notation
 * is the SKILL at `RAT.5`, where an equivalent interval answer is deliberately marked wrong for
 * its form. Here the skill is finding the inputs, so the notation should be the one that
 * generalises across all five shapes, which is the interval. `intervalAnswer` also separates a
 * wrong SET (`value_mismatch`) from a right set with the wrong brackets
 * (`wrong_bound_inclusivity`), and the bracket is half of what L1 and L3a are teaching.
 *
 * Three input rules come with that choice, all of them carried by `INTERVAL_PLACEHOLDER`, which
 * is why no prompt below repeats them: a union must be WHITESPACE-delimited around its `U`,
 * infinity is `inf` or `infinity` and never `oo`, and an empty set has no interval spelling at
 * all. Nothing here can produce an empty domain: every draw's boundary is finite and every
 * union's two pieces are separated by construction.
 *
 * ## Seeding
 *
 * Shapes are seeded from Lippman & Rasmussen, *Precalculus: An Investigation of Functions*
 * (opentextbookstore.com), section 1.2 "Domain and Range". Its worked Example 5 is the pair
 * this node is built on, a bare even root and a quotient with a coefficient in the bottom, and
 * its exercise ladder runs 7-10 (roots, including one whose radicand has a negative coefficient
 * and decoy constants outside the root), 11-14 (quotients, plain then with coefficients) and
 * 15-16 (a root OVER a linear denominator, which is L3b's shape). The extracted PDF text
 * flattens every radical and stacked fraction into unreadable runs, so each shape was
 * re-derived by hand and every key recomputed rather than transcribed. The diversification off
 * the seed: the seed's 1-6 read a domain and a range off a GRAPH, which this node cannot use
 * because the coordinate plane is not a prerequisite here, so the range question is asked
 * algebraically instead (L2b); the seed's quotient exercises key a plain excluded value where
 * these ask for the union it produces; and every number is re-drawn per instance.
 *
 * Every template declares a `varietyKey` over the answer it produces, so a cell never freezes
 * two instances a learner would answer the same way.
 */

export const FUN2_NODE = "FUN.2";

/**
 * The interval answer field's own example text, restated here as D6's single copy of it.
 *
 * `apps/web/src/lessons/answerFormat.ts` owns the string a learner is shown, and
 * `packages/item-bank` cannot depend on `apps/web`, so a copy is unavoidable. What IS avoidable
 * is a second, hand-maintained copy of the forms inside it, and that is what broke: the bound
 * moved from 2 to 5 in the placeholder, the transcribed list here went on reading 2, and the
 * guard below spent three templates protecting a number nothing advertises while the number
 * something does advertise was keyed. So this file holds the TEXT and nothing else transcribes
 * it: {@link ADVERTISED_INTERVAL_FORMS} is parsed out of it, and `d6.test.ts` reads
 * `answerFormat.ts` off disk and fails if the placeholder has moved away from this line. Moving
 * the example again is therefore one edit here, or one red test naming this constant.
 */
export const INTERVAL_PLACEHOLDER_TEXT = "Interval, e.g. (-inf, 5] U (7, inf)";

/**
 * Every string the interval field advertises: the whole union AND each ray on its own, because
 * a learner whose answer is a single ray copies the part that matches. R30 forbids a
 * placeholder that answers a served item, so no D6 key may be any of them.
 *
 * Derived rather than listed, so all three move together with the text above. D3 keeps its own
 * transcribed copy in `d3/nodes/_shared.ts`, and that copy still reads 2; it is out of this
 * pass's scope but it is the same defect.
 */
export const ADVERTISED_INTERVAL_FORMS: readonly string[] = advertisedFormsOf(
  INTERVAL_PLACEHOLDER_TEXT,
);

/**
 * Split a placeholder into the forms it offers.
 *
 * Throws rather than returning nothing when the text does not carry an example, because an
 * empty form list would leave every guard below vacuously satisfied — a green run measuring
 * no keys at all, which is indistinguishable from a green run measuring clean ones.
 */
function advertisedFormsOf(placeholder: string): readonly string[] {
  const marker = "e.g. ";
  const at = placeholder.indexOf(marker);
  if (at < 0) {
    throw new Error(`no "e.g." example to guard against in ${JSON.stringify(placeholder)}`);
  }
  const example = placeholder.slice(at + marker.length).trim();
  const parts = example.split(" U ").map((part) => part.trim());
  return [...new Set(parts.length > 1 ? [example, ...parts] : parts)];
}

/** A single ray, written the way the checker parses it. */
export function rayKey(bound: number, closed: boolean, upward: boolean): string {
  return upward
    ? `${closed ? "[" : "("}${bound}, inf)`
    : `(-inf, ${bound}${closed ? "]" : ")"}`;
}

/**
 * Shift a drawn bound off any value whose ray would be one of
 * {@link ADVERTISED_INTERVAL_FORMS}.
 *
 * It SHIFTS UNTIL CLEAR rather than once. The old single `+ 1` came with an argument that one
 * step was provably enough for the two triples then at risk, and the argument was sound; what
 * it could not survive was the example moving, which is the thing that actually happened. A
 * loop needs no argument and terminates on any finite list, so a future placeholder whose two
 * bounds sit next to each other cannot step one guard onto another.
 */
export function unadvertisedBound(bound: number, closed: boolean, upward: boolean): number {
  let shifted = bound;
  while (ADVERTISED_INTERVAL_FORMS.includes(rayKey(shifted, closed, upward))) {
    shifted += 1;
  }
  return shifted;
}

/** `+ 7` / `- 7`, so a drawn constant reads as an operator rather than as a signed term. */
function signed(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

/** A nonzero magnitude in `[1, max]`, signed by a fresh coin flip. */
function signedInt(rng: Rng, max: number): number {
  const magnitude = rng.int(1, max);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

/** The standing instruction for every shape here. The notation rules live in the placeholder. */
function domainPrompt(rule: string): string {
  return `Give the domain of $${rule}$ in interval notation.`;
}

/**
 * L1, the domain of a bare even root, `k\sqrt{x + c}`.
 *
 * One move finds the boundary and the rest of the tier is the notation: which end is infinite,
 * and that the boundary itself is taken in because the square root of zero is zero. The
 * multiplier in front of the root is a decoy that changes nothing, which is worth meeting on
 * the easiest shape rather than for the first time on L3a where it sits beside real work.
 */
export const d6_fun2_root_domain_l1: ItemTemplate = {
  template_id: "d6.fun2.root-domain.l1",
  node_id: FUN2_NODE,
  difficulty: 1,
  concept: "domain-of-an-even-root",
  generate(rng: Rng) {
    // The boundary IS the negated shift: `x + c >= 0` when `x >= -c`.
    const bound = unadvertisedBound(signedInt(rng, 9), true, true);
    const shift = -bound;
    const mult = rng.int(1, 4);
    const lead = mult === 1 ? "" : `${mult}`;
    const rule = `f(x) = ${lead}\\sqrt{x ${signed(shift)}}`;
    const radicand = `x ${signed(shift)}`;
    return {
      prompt: domainPrompt(rule),
      answer: intervalAnswer(rayKey(bound, true, true)),
      params: { bound, shift, mult },
      hints: [
        "A square root has no real value when the quantity under it is negative, so write down the requirement that the quantity under this root is zero or more.",
        "Solve that requirement for $x$. Only the quantity under the root can refuse an input, because everything else in the rule merely changes an output that already exists.",
        "Now turn the solved requirement into an interval, which needs a bracket at each end. An end that runs on with nothing stopping it is written as an infinity, and an infinity always takes a round bracket. A finite boundary takes a square bracket when the rule accepts that input and a round one when it does not, so test your boundary against the requirement you wrote down.",
      ],
      worked_solution: [
        `The quantity under an even root cannot be negative, so require $${radicand} \\ge 0$.`,
        `Solving it gives $x \\ge ${bound}$.`,
        mult === 1
          ? `Nothing else in the rule can refuse an input, so those are all of them.`
          : `The $${mult}$ in front of the root only scales an output that already exists, so it refuses nothing.`,
        `The boundary is included, because the root of zero is zero, and the inputs run upward with no end, so the domain is $[${bound}, \\infty)$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.bound ?? 0}`,
};

/**
 * L2a, the domain of a quotient whose denominator carries a coefficient: `c / (kx + m)`.
 *
 * The coefficient is what makes this a tier above reading `x - 6` and saying six: the excluded
 * input has to be solved for. The answer is the first UNION in the node, and both of its finite
 * brackets are round, because the excluded input belongs to neither stretch.
 */
export const d6_fun2_quotient_domain_l2: ItemTemplate = {
  template_id: "d6.fun2.quotient-domain.l2",
  node_id: FUN2_NODE,
  difficulty: 2,
  concept: "domain-of-a-quotient",
  generate(rng: Rng) {
    const root = signedInt(rng, 9);
    const k = rng.int(2, 6);
    // `kx + m = 0` at `x = root`, so `m = -k * root`.
    const m = -k * root;
    const top = rng.int(2, 12);
    const bottom = `${k}x ${signed(m)}`;
    return {
      prompt: domainPrompt(`g(x) = \\dfrac{${top}}{${bottom}}`),
      answer: intervalAnswer(`(-inf, ${root}) U (${root}, inf)`),
      params: { root, k, m, top },
      hints: [
        "A quotient has no value when its bottom is zero, so set the denominator equal to zero and solve it for $x$. Leave the numerator out of it: a zero on top is only an output of zero.",
        "That single input is thrown out and every other input is fine, so the allowed inputs fall into two stretches, one on each side of it.",
        "Write the two stretches as intervals and join them with a union. Their outer ends run on with nothing stopping them, and an infinity always takes a round bracket. Their finite ends meet at the input you solved for, so settle those two brackets with the usual endpoint test: square when the interval takes that input in, round when it leaves it out.",
      ],
      worked_solution: [
        `The bottom cannot be zero, so solve $${bottom} = 0$.`,
        `That gives $${k}x = ${-m}$, so $x = ${root}$ is the one input with no output.`,
        `Every other input gives the bottom a value that is not zero, so nothing else is refused.`,
        `The line minus that single point is two stretches, and the point is in neither, so the domain is $(-\\infty, ${root}) \\cup (${root}, \\infty)$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.root ?? 0}`,
};

/**
 * L2b, the RANGE of a rule built on a square or an absolute value.
 *
 * Every other shape in this node asks which inputs are allowed; without this one the cell would
 * teach "domain" and call it domain and range. The two cores behave identically (neither ever
 * hands back a negative) and the two directions do not, so the draw rotates both: a learner who
 * has decided the answer always runs upward meets the subtraction on the next instance.
 */
export const d6_fun2_output_range_l2: ItemTemplate = {
  template_id: "d6.fun2.output-range.l2",
  node_id: FUN2_NODE,
  difficulty: 2,
  concept: "range-of-a-squared-or-absolute-rule",
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const up = rng.int(0, 1);
    const limit = unadvertisedBound(signedInt(rng, 9), true, up === 1);
    const core = kind === 1 ? "\\left|x\\right|" : "x^{2}";
    const coreWord = kind === 1 ? "an absolute value" : "a square";
    const rule = up === 1 ? `f(x) = ${core} ${signed(limit)}` : `f(x) = ${limit} - ${core}`;
    return {
      prompt: `Give the range of $${rule}$ in interval notation.`,
      answer: intervalAnswer(rayKey(limit, true, up === 1)),
      params: { kind, up, limit },
      hints: [
        `Neither squaring nor an absolute value ever hands back a negative number, so ${coreWord} is $0$ at its smallest, and it reaches that at $x = 0$.`,
        "Put that smallest value into the rule and read off the output it produces. Every other input moves the output away from that one and never back past it, so it is the output the rule cannot get beyond.",
        "Then decide which side of it the other outputs sit on. Added on, that part pushes the outputs away upward; subtracted, it pulls them away downward. The infinite end of the interval goes on the side they run to, and the output you found is taken in, because an input really does produce it.",
      ],
      worked_solution: [
        `$${core}$ is never negative, and it is $0$ when $x = 0$.`,
        `Putting $x = 0$ into the rule gives $f(0) = ${limit}$, which is the ${
          up === 1 ? "smallest" : "largest"
        } output there is.`,
        up === 1
          ? `Every other input makes $${core}$ bigger, and it grows without bound, so the outputs climb from there with no ceiling.`
          : `Every other input makes $${core}$ bigger, and it grows without bound, so the outputs fall from there with no floor.`,
        `That output is reached, so it is taken in, and the range is $${
          up === 1 ? `[${limit}, \\infty)` : `(-\\infty, ${limit}]`
        }$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.up ?? 0}:${params.limit ?? 0}`,
};

/**
 * L3a, an even root whose radicand has a NEGATIVE coefficient on the input, with two decoy
 * numbers outside the root: `c - k\sqrt{m - nx}`.
 *
 * Three things have to go right at once, which is what puts it here. The numbers outside the
 * root look like they should matter and cannot. The requirement is the same one L1 uses. And
 * dividing by the negative coefficient turns the inequality over, so a learner who solves it as
 * though the coefficient were positive gets the right boundary pointing the wrong way, which
 * the checker reports as a wrong set rather than a wrong bracket.
 */
export const d6_fun2_root_flip_domain_l3: ItemTemplate = {
  template_id: "d6.fun2.root-flip-domain.l3",
  node_id: FUN2_NODE,
  difficulty: 3,
  concept: "domain-of-a-reversed-even-root",
  generate(rng: Rng) {
    const bound = unadvertisedBound(signedInt(rng, 9), true, false);
    const n = rng.int(2, 5);
    // `m - n x >= 0` when `x <= m / n`, so `m = n * bound` keeps the boundary an integer.
    const m = n * bound;
    const outside = rng.int(1, 12);
    const k = rng.int(1, 5);
    const lead = k === 1 ? "" : `${k}`;
    // A negative boundary makes the constant negative, and `-6 - 3x` leading with the
    // constant reads as a typo rather than as a radicand, so that draw leads with the input
    // term instead. Same quantity, and the requirement below is unchanged either way.
    const radicand = m > 0 ? `${m} - ${n}x` : `-${n}x ${signed(m)}`;
    return {
      prompt: domainPrompt(`f(x) = ${outside} - ${lead}\\sqrt{${radicand}}`),
      answer: intervalAnswer(rayKey(bound, true, false)),
      params: { bound, n, m, outside, k },
      hints: [
        "The numbers outside the root cannot make anything undefined, so set them aside and look only at the quantity underneath.",
        "That quantity has to be zero or more. Write the requirement down and solve it for $x$, and check the sign of the number multiplying $x$ before you divide, because that is the only thing here that can change the direction of an inequality.",
        "Now turn the solved inequality into an interval, and let the relation symbol you ended with choose both ends. The end that runs on with nothing stopping it is an infinity, and an infinity always takes a round bracket. The boundary takes a square bracket when that relation allows equality and a round one when it does not, so read the symbol you actually wrote, including which way it points.",
      ],
      worked_solution: [
        `Only the quantity under the root can refuse an input, so require $${radicand} \\ge 0$.`,
        `Move the input term across: $${m} \\ge ${n}x$.`,
        `Dividing by $${n}$ gives $${bound} \\ge x$, which is $x \\le ${bound}$.`,
        `Nothing outside the root can refuse an input: those numbers only change an output that already exists.`,
        `The boundary is included and the inputs run downward with no end, so the domain is $(-\\infty, ${bound}]$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.bound ?? 0}:${params.n ?? 0}`,
};

/**
 * L3b, the node's flagship shape: both restrictions at once, `\sqrt{x - a} / (x - b)` with the
 * denominator's zero drawn strictly INSIDE the root's stretch.
 *
 * A student who answers only the root's requirement gets a single ray and never notices the
 * hole; a student who answers only the denominator gets a union of two rays over the whole
 * line. Both are wrong in a visible way, and the correct answer is neither: the root fixes the
 * left end and the denominator punches the stretch in two. The guard is what makes the shape
 * live at all, since a denominator zero at or below the root's boundary would already be
 * outside the domain and the item would collapse into L1.
 */
export const d6_fun2_root_over_linear_l3: ItemTemplate = {
  template_id: "d6.fun2.root-over-linear.l3",
  node_id: FUN2_NODE,
  difficulty: 3,
  concept: "domain-with-two-restrictions",
  generate(rng: Rng) {
    const a = signedInt(rng, 8);
    // Strictly inside the root's stretch, so the exclusion always bites and always splits it.
    // Zero is redrawn only because `x + 0` reads as a rule nobody would write, not because the
    // mathematics minds: a denominator of `x` would be a perfectly good instance.
    let b = a + rng.int(1, 9);
    while (b === 0) {
      b = a + rng.int(1, 9);
    }
    const radicand = `x ${signed(-a)}`;
    const bottom = `x ${signed(-b)}`;
    return {
      prompt: domainPrompt(`h(x) = \\dfrac{\\sqrt{${radicand}}}{${bottom}}`),
      answer: intervalAnswer(`[${a}, ${b}) U (${b}, inf)`),
      params: { a, b },
      hints: [
        "Two separate things can go wrong here, so check them one at a time: the quantity under the root must not be negative, and the bottom of the quotient must not be zero.",
        "Solve the root's requirement first. It gives a stretch of inputs running upward from a boundary, and that boundary is allowed, because the root of zero is zero.",
        "Now find the input that empties the bottom, then check it against the stretch the root allows. An input the root already refuses takes nothing more out of that stretch. An input the root allows has to be cut out of it, and cutting one point out of a stretch leaves a piece on each side, written as two intervals joined with a union.",
      ],
      worked_solution: [
        `The quantity under the root cannot be negative, so require $${radicand} \\ge 0$, which gives $x \\ge ${a}$.`,
        `The bottom cannot be zero, so solve $${bottom} = 0$, which gives $x = ${b}$.`,
        `$${b}$ is above $${a}$, so it sits inside the stretch the root allows and has to be cut out of it.`,
        `That leaves the stretch from $${a}$ up to $${b}$, then everything above $${b}$, with $${a}$ taken in and $${b}$ left out of both pieces.`,
        `So the domain is $[${a}, ${b}) \\cup (${b}, \\infty)$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.b ?? 0}`,
};

/** Every FUN.2 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN2_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun2_root_domain_l1,
  d6_fun2_quotient_domain_l2,
  d6_fun2_output_range_l2,
  d6_fun2_root_flip_domain_l3,
  d6_fun2_root_over_linear_l3,
];
