import {
  type ItemTemplate,
  intervalAnswer,
  type Rng,
  setBuilderAnswer,
} from "../../../template";
import { signed, unionKey } from "../_shared";

/**
 * LIN.6 practice templates: solve an absolute-value inequality. Five shapes across the locked
 * 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  `|x - c| <= k`, the at-most shape, which leaves ONE bounded band;
 *  - L2a the away-from shape, which leaves a UNION of two rays;
 *  - L2b a coefficient inside the bars on the at-most shape, so the compound inequality is
 *        divided through;
 *  - L3a a coefficient inside the bars on the away-from shape, the hardest combination;
 *  - L3b the same discrimination asked in SET-BUILDER notation, where writing the form is itself
 *        the graded skill.
 *
 * ## Answer path
 *
 * Four shapes answer as an `interval` and one as `set_builder`, both cleared at checker version 2
 * and both pinned against the real checker by `prod.golden.lin-6.*`. The checker is never asked to
 * SOLVE an absolute-value inequality: it compares the learner's interval against the authored one,
 * and the bars live only in the KaTeX prompt.
 *
 * Every draw is satisfiable and no draw is the whole line, so no shape can produce a key with no
 * interval spelling. The tolerance is always positive, which is what guarantees it.
 *
 * ## What the `<` and `>` pair is for, and why both directions appear at every tier
 *
 * The single discrimination this node exists to teach is which direction of sign gives one band and
 * which gives two, so a tier holding only one of them would leave the discrimination untested at
 * that tier. L1 and L2b are at-most shapes, L2a and L3a are away-from shapes, and the set-builder
 * shape at L3b draws BOTH directions, so a five-slot set always serves at least two of each.
 *
 * ## R30: the two strings the answer field itself advertises
 *
 * `INTERVAL_PLACEHOLDER` reads "Interval, e.g. (-inf, 2] U (7, inf)" and `SET_BUILDER_PLACEHOLDER`
 * carries its own example. Neither may answer a served item, and LIN.4 carries an explicit guard
 * for it because its ray shapes can land on either half of that example.
 *
 * **LIN.6 needs no such guard, and the reason is structural rather than a matter of the draws.**
 * The advertised union has a CLOSED lower end and an OPEN upper one, and both union shapes here
 * take their brackets from a single `closed` flag applied to both ends, so they can only ever
 * produce `(-inf, l] U [h, inf)` or `(-inf, l) U (h, inf)`. A mixed pair is out of reach by
 * construction. That is an argument rather than a measurement, so `d3.test.ts` grades all three
 * advertised strings against every served D3 item instead of taking it on trust.
 */

export const LIN6_NODE = "LIN.6";

/**
 * L1, the at-most shape with nothing inside the bars but a difference. One band, and the bracket
 * on each end comes from the one sign the rule was written with.
 */
export const d3_lin6_band_l1: ItemTemplate = {
  template_id: "d3.lin6.band.l1",
  node_id: LIN6_NODE,
  difficulty: 1,
  concept: "at-most-one-band",
  generate(rng: Rng) {
    const centre = rng.int(-8, 30);
    const tolerance = rng.int(2, 12);
    const closed = rng.int(0, 1) === 1;
    const sign = closed ? "\\le" : "<";
    const low = centre - tolerance;
    const high = centre + tolerance;
    const key = closed ? `[${low}, ${high}]` : `(${low}, ${high})`;
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $\\lvert x ${signed(-centre)} \\rvert ${sign} ${tolerance}$.`,
      answer: intervalAnswer(key),
      params: { centre, tolerance, closed: closed ? 1 : 0 },
      hints: [
        "Read the direction of the sign before solving anything, because it decides whether the answer is one stretch of the line or two.",
        "A sign pointing towards the bars says the quantity inside them is CLOSE to zero, which squeezes it between the tolerance and its negative. Then isolate the variable right across that compound inequality.",
      ],
      worked_solution: [
        `The sign points towards the bars, so the quantity inside is squeezed: $-${tolerance} ${sign} x ${signed(-centre)} ${sign} ${tolerance}$.`,
        `Add $${centre}$ right across all three parts: $${low} ${sign} x ${sign} ${high}$.`,
        closed
          ? `Both signs include their boundary, so both ends are taken in.`
          : `Both signs are strict, so neither end is taken in.`,
        `In interval notation that is $${key}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.centre ?? 0}:${params.tolerance ?? 0}:${params.closed ?? 0}`,
};

/**
 * L2a, the away-from shape. Two rays pointing outwards, joined by a union, and the whole of the
 * step up from L1 is that the answer has two pieces rather than one.
 */
export const d3_lin6_union_l2: ItemTemplate = {
  template_id: "d3.lin6.union.l2",
  node_id: LIN6_NODE,
  difficulty: 2,
  concept: "away-from-two-rays",
  generate(rng: Rng) {
    const centre = rng.pick([-6, -4, -1, 0, 3, 5, 8, 11, 14, 17, 20, 24]);
    const tolerance = rng.int(3, 13);
    const closed = rng.int(0, 1) === 1;
    const sign = closed ? "\\ge" : ">";
    const low = centre - tolerance;
    const high = centre + tolerance;
    const key = unionKey(low, closed, high, closed);
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $\\lvert x ${signed(-centre)} \\rvert ${sign} ${tolerance}$.`,
      answer: intervalAnswer(key),
      params: { centre, tolerance, closed: closed ? 1 : 0 },
      hints: [
        "Read the direction of the sign first. A sign pointing away from the bars says the quantity inside them is FAR from zero, which it can be on either side.",
        "That gives two separate statements rather than a compound inequality, so solve each one on its own. Interval notation joins the two pieces with a union symbol, and an unbounded end is typed inf in this answer field, never oo.",
      ],
      worked_solution: [
        `The sign points away from the bars, so $x ${signed(-centre)} ${sign} ${tolerance}$ or $x ${signed(-centre)} ${closed ? "\\le" : "<"} -${tolerance}$.`,
        `Adding $${centre}$ to the first gives $x ${sign} ${high}$, and to the second gives $x ${closed ? "\\le" : "<"} ${low}$.`,
        `Nothing between $${low}$ and $${high}$ satisfies either statement, so the two rays do not meet.`,
        `Joined with a union that is $${key.replace(/inf/g, "\\infty").replace(" U ", " \\cup ")}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.centre ?? 0}:${params.tolerance ?? 0}:${params.closed ?? 0}`,
};

/**
 * L2b, a coefficient inside the bars on the at-most shape. Every part of the compound inequality
 * is divided
 * through by the coefficient, which is positive, so nothing reverses: the constants are drawn as
 * multiples of it so both bounds land on whole numbers.
 */
export const d3_lin6_scaled_band_l2: ItemTemplate = {
  template_id: "d3.lin6.scaled-band.l2",
  node_id: LIN6_NODE,
  difficulty: 2,
  concept: "coefficient-inside-a-band",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const centre = rng.int(-6, 14);
    const tolerance = rng.int(1, 9);
    const closed = rng.int(0, 1) === 1;
    const sign = closed ? "\\le" : "<";
    const b = -a * centre;
    const k = a * tolerance;
    const low = centre - tolerance;
    const high = centre + tolerance;
    const key = closed ? `[${low}, ${high}]` : `(${low}, ${high})`;
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $\\lvert ${a}x ${signed(b)} \\rvert ${sign} ${k}$.`,
      answer: intervalAnswer(key),
      params: { a, b, k, centre, tolerance, closed: closed ? 1 : 0 },
      hints: [
        "The direction of the sign decides the shape, and the coefficient inside the bars decides how much work each part of that shape takes. Settle the shape first.",
        "Every move on a compound inequality applies right across all three of its parts, including the division by the coefficient. Check the sign of that coefficient before dividing, because a negative one would turn both signs over.",
      ],
      worked_solution: [
        `The sign points towards the bars, so $-${k} ${sign} ${a}x ${signed(b)} ${sign} ${k}$.`,
        `Undo the plain number right across: $${-k - b} ${sign} ${a}x ${sign} ${k - b}$.`,
        `Divide all three parts by the positive $${a}$: $${low} ${sign} x ${sign} ${high}$, with no sign reversed.`,
        `In interval notation that is $${key}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.centre ?? 0}:${params.tolerance ?? 0}`,
};

/**
 * L3a, a coefficient inside the bars on the away-from shape: both hard features at once. Two
 * branches, each of them a two-step inequality, and a union to write at the end.
 */
export const d3_lin6_scaled_union_l3: ItemTemplate = {
  template_id: "d3.lin6.scaled-union.l3",
  node_id: LIN6_NODE,
  difficulty: 3,
  concept: "coefficient-inside-a-union",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const centre = rng.pick([-5, -3, 0, 1, 4, 6, 9, 12, 15, 18]);
    const tolerance = rng.int(1, 8);
    const closed = rng.int(0, 1) === 1;
    const sign = closed ? "\\ge" : ">";
    const b = -a * centre;
    const k = a * tolerance;
    const low = centre - tolerance;
    const high = centre + tolerance;
    const key = unionKey(low, closed, high, closed);
    return {
      prompt: `Solve for $x$ and give the answer in interval notation: $\\lvert ${a}x ${signed(b)} \\rvert ${sign} ${k}$.`,
      answer: intervalAnswer(key),
      params: { a, b, k, centre, tolerance, closed: closed ? 1 : 0 },
      hints: [
        "Settle the shape from the direction of the sign before any arithmetic, because the arithmetic is identical for both directions and only the shape differs.",
        "A sign pointing away from the bars gives two separate inequalities rather than a compound inequality. Solve each of them as an ordinary two-step inequality, then write the two pieces with a union between them.",
      ],
      worked_solution: [
        `The sign points away from the bars, so $${a}x ${signed(b)} ${sign} ${k}$ or $${a}x ${signed(b)} ${closed ? "\\le" : "<"} -${k}$.`,
        `First branch: $${a}x ${sign} ${k - b}$, so $x ${sign} ${high}$.`,
        `Second branch: $${a}x ${closed ? "\\le" : "<"} ${-k - b}$, so $x ${closed ? "\\le" : "<"} ${low}$.`,
        `Both divisions were by the positive $${a}$, so neither sign reversed, and the answer is $${key.replace(/inf/g, "\\infty").replace(" U ", " \\cup ")}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.centre ?? 0}:${params.tolerance ?? 0}`,
};

/**
 * L3b, the same discrimination in set-builder notation. This is the one shape on the node where
 * WRITING the form is itself what is graded: a correct interval answer here grades
 * `wrong_notation` rather than a wrong set, exactly as `prod.golden.lin-6.set-builder` records.
 *
 * It draws BOTH directions of sign, because the notation is the graded skill and the shape it has
 * to be written in still depends on the direction.
 */
export const d3_lin6_set_builder_l3: ItemTemplate = {
  template_id: "d3.lin6.set-builder.l3",
  node_id: LIN6_NODE,
  difficulty: 3,
  concept: "set-builder-notation",
  generate(rng: Rng) {
    const away = rng.int(0, 1) === 1;
    const centre = rng.int(-7, 22);
    const tolerance = rng.int(2, 11);
    const closed = rng.int(0, 1) === 1;
    const low = centre - tolerance;
    const high = centre + tolerance;
    const sign = away ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
    const lowRel = away ? (closed ? "<=" : "<") : closed ? "<=" : "<";
    const highRel = away ? (closed ? ">=" : ">") : closed ? "<=" : "<";
    const key = away
      ? `{x | x ${lowRel} ${low} or x ${highRel} ${high}}`
      : `{x | ${low} ${lowRel} x ${highRel} ${high}}`;
    return {
      prompt: `Solve for $x$ and give the answer in set-builder notation: $\\lvert x ${signed(-centre)} \\rvert ${sign} ${tolerance}$.`,
      answer: setBuilderAnswer(key),
      params: {
        away: away ? 1 : 0,
        centre,
        tolerance,
        closed: closed ? 1 : 0,
      },
      hints: [
        "Solve it the way you would for an interval first: the direction of the sign settles whether the answer is one stretch or two, and the arithmetic is the same either way.",
        "Then write the SET rather than the interval: braces, the variable, a vertical bar, and the condition on the variable. Two pieces are joined inside the braces by the word or, not by a union symbol.",
      ],
      worked_solution: away
        ? [
            `The sign points away from the bars, so $x ${signed(-centre)} ${sign} ${tolerance}$ or $x ${signed(-centre)} ${closed ? "\\le" : "<"} -${tolerance}$.`,
            `Adding $${centre}$ gives $x ${highRel === ">=" ? "\\ge" : ">"} ${high}$ or $x ${lowRel === "<=" ? "\\le" : "<"} ${low}$.`,
            `Set-builder notation names the variable and then states the condition on it, with the two pieces joined by the word or.`,
            `That is $\\{x \\mid x ${lowRel === "<=" ? "\\le" : "<"} ${low} \\text{ or } x ${highRel === ">=" ? "\\ge" : ">"} ${high}\\}$.`,
          ]
        : [
            `The sign points towards the bars, so $-${tolerance} ${sign} x ${signed(-centre)} ${sign} ${tolerance}$.`,
            `Adding $${centre}$ right across gives $${low} ${sign} x ${sign} ${high}$.`,
            `Set-builder notation names the variable and then states the condition on it, which here is the single compound inequality.`,
            `That is $\\{x \\mid ${low} ${sign} x ${sign} ${high}\\}$.`,
          ],
    };
  },
  varietyKey: (params) =>
    `${params.away ?? 0}:${params.centre ?? 0}:${params.tolerance ?? 0}:${params.closed ?? 0}`,
};

/** LIN.6's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const LIN6_TEMPLATES: readonly ItemTemplate[] = [
  d3_lin6_band_l1,
  d3_lin6_union_l2,
  d3_lin6_scaled_band_l2,
  d3_lin6_scaled_union_l3,
  d3_lin6_set_builder_l3,
];
