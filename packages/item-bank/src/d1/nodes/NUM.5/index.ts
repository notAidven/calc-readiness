import {
  latexNum,
  percentOf,
  percentWhat,
  UNIT_RATE_OBJECTS,
  unitRateObject,
  unitRatePrompt,
} from "../../../promptFormat";
import {
  type GenerateContext,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";
import type { GoldenFixture } from "../../golden";
import { workedSolution } from "../../hints";
import { cordPercentOf } from "../../theming";
import { numStr } from "../_shared";

/** Percentages that require genuine computation — 50% (halving) and 10% (shift) excluded. */
const WALK_PERCENTS: readonly number[] = [20, 25, 40, 60, 75];

/** Diagnostic L2 (routing stage) — percent of a base amount. */
export const num5_l2: ItemTemplate = {
  template_id: "d1.num-5.l2",
  node_id: "NUM.5",
  difficulty: 2,
  concept: "percent-of",
  generate(rng: Rng, ctx?: GenerateContext) {
    const p = rng.pick([10, 20, 25, 50, 75]);
    const base = rng.int(2, 20) * 4;
    return {
      // Practice: a percent of a measured length of cord; assessment
      // keeps the neutral "What is p% of base" prompt. Same numeric answer.
      prompt: ctx?.form === "practice" ? cordPercentOf(p, base) : percentOf(p, base),
      answer: numericAnswer(numStr((p * base) / 100)),
      params: { p, base },
      hints: [
        'Percent means "out of $100$", so turn the percent into a fraction over $100$ (or a decimal) before you touch the length.',
        "Multiply that fraction by the whole length. Taking a percent of an amount is multiplication, not division.",
      ],
      worked_solution: workedSolution([
        `Convert the percent: $${p}\\% = \\dfrac{${p}}{100}$.`,
        `Multiply by the amount: $\\dfrac{${p}}{100} \\times ${base} = ${numStr((p * base) / 100)}$.`,
      ]),
    };
  },
};

/** Diagnostic L3 (up stage) — a unit-rate word problem. */
export const num5_l3: ItemTemplate = {
  template_id: "d1.num-5.l3",
  node_id: "NUM.5",
  difficulty: 3,
  concept: "unit-rate",
  generate(rng: Rng) {
    const unitPrice = rng.pick([0.5, 0.8, 1.2, 1.5, 2.0, 2.5]);
    const n = rng.int(2, 6);
    const m = rng.int(4, 10);
    const total = unitPrice * n;
    const objectIndex = rng.int(0, UNIT_RATE_OBJECTS.length - 1);
    const obj = unitRateObject(objectIndex);
    const money = (amount: number) => `\\$${`$${numStr(amount)}$`}`;
    return {
      // The neutral unit-rate prompt in EVERY form. This template is denominated in
      // dollars and stationery in its hints and worked solution below, and
      // `unitRatePrompt` is shared with the frozen assessment forms, so a prehistoric
      // re-framing needs all three changed together plus a deliberate re-freeze. A
      // half-themed prompt over money hints would be worse than the neutral one.
      prompt: unitRatePrompt(n, total, m, objectIndex),
      answer: numericAnswer(numStr(unitPrice * m)),
      params: { unitPrice, n, m, objectIndex },
      hints: [
        `Divide the total cost by the number of ${obj.plural} to get the price of a single ${obj.singular}, which is the unit rate.`,
        `Multiply that unit price by the number of ${obj.plural} the question asks about.`,
      ],
      worked_solution: workedSolution([
        `Price per ${obj.singular}: ${money(total)} ÷ ${n} = ${money(unitPrice)}.`,
        `Multiply by ${m} ${obj.plural}: ${money(unitPrice)} × ${m} = ${money(unitPrice * m)}.`,
      ]),
    };
  },
};

/** Practice-only L1 — friendly percentages of a round base. */
export const num5_l1: ItemTemplate = {
  template_id: "d1.num-5.l1",
  node_id: "NUM.5",
  difficulty: 1,
  generate(rng: Rng) {
    // Friendly percentages of a round base (widened for more variety).
    const p = rng.pick([10, 20, 50]);
    const base = rng.int(2, 12) * 10;
    return {
      prompt: percentOf(p, base),
      answer: numericAnswer(numStr((p * base) / 100)),
      params: { p, base },
      hints: [
        'Percent means "out of $100$", so divide the percent by $100$ to get a fraction or decimal first.',
        "Multiply that by the amount you are taking the percent of.",
      ],
      worked_solution: workedSolution([
        `Convert the percent: $${p}\\% = \\dfrac{${p}}{100}$.`,
        `Multiply by the amount: $\\dfrac{${p}}{100} \\times ${base} = ${numStr((p * base) / 100)}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: "What percent of X is Y?" */
export const num5_l2b: ItemTemplate = {
  template_id: "d1.num-5.l2b",
  node_id: "NUM.5",
  difficulty: 2,
  generate(rng: Rng) {
    // Pick a friendly percent and its reduced fraction, then scale so X and Y are
    // whole numbers and the answer (the percent) is a whole number.
    const choice = rng.pick([
      { p: 10, pn: 1, pd: 10 },
      { p: 20, pn: 1, pd: 5 },
      { p: 25, pn: 1, pd: 4 },
      { p: 50, pn: 1, pd: 2 },
      { p: 75, pn: 3, pd: 4 },
    ]);
    const k = rng.int(2, 6);
    const x = choice.pd * k;
    const y = choice.pn * k;
    return {
      prompt: percentWhat(x, y),
      answer: numericAnswer(numStr(choice.p)),
      params: { x, y, p: choice.p },
      hints: [
        "A percent compares the part to the whole, so write the part over the whole as a fraction.",
        "Rewrite that fraction as a value out of $100$, and the numerator is the percent.",
      ],
      worked_solution: workedSolution([
        `Write the part over the whole: $\\dfrac{${y}}{${x}}$.`,
        `Simplify: $\\dfrac{${y}}{${x}} = \\dfrac{${choice.pn}}{${choice.pd}}$.`,
        `As a percent: $\\dfrac{${choice.pn}}{${choice.pd}} = ${choice.p}\\%$.`,
      ]),
    };
  },
};

/**
 * A measuring piece a NUM.5 conversion problem is counted in, with the stretch it
 * measures. Era one has no standard length, so it measures the way the style guide
 * says it does: by pacing, by hand spans, and by a marked cord or a cut piece laid
 * end to end.
 *
 * `unit` / `units` are the SHORT words a diagram labels a conversion factor with;
 * `singular` / `plural` are what the prompt calls the piece in prose.
 */
export interface ConversionPiece {
  /** The stretch being measured, as the prompt's subject. */
  subject: string;
  singular: string;
  plural: string;
  unit: string;
  units: string;
}

/** The pieces `d1.num-5.l3b` can be about. Order is stable: `template_params.pieceIndex`
 * indexes into this list, and the worked-solution SVG decodes it back to the same words. */
export const NUM5_CONVERSION_PIECES: readonly ConversionPiece[] = [
  {
    subject: "The path worn down to the shore",
    singular: "coil of cord",
    plural: "coils of cord",
    unit: "coil",
    units: "coils",
  },
  {
    subject: "The cleared ground behind the drying racks",
    singular: "woven mat",
    plural: "woven mats",
    unit: "mat",
    units: "mats",
  },
  {
    subject: "The ridge of the shelter roof",
    singular: "lashed pole",
    plural: "lashed poles",
    unit: "pole",
    units: "poles",
  },
  {
    subject: "The windbreak along the camp",
    singular: "reed screen",
    plural: "reed screens",
    unit: "screen",
    units: "screens",
  },
];

/** Resolve a piece index to its (always defined) entry, defaulting to the cord. */
export function num5ConversionPiece(pieceIndex = 0): ConversionPiece {
  return (
    NUM5_CONVERSION_PIECES[pieceIndex] ??
    NUM5_CONVERSION_PIECES[0] ?? {
      subject: "The cleared ground",
      singular: "length",
      plural: "lengths",
      unit: "length",
      units: "lengths",
    }
  );
}

/**
 * Extra practice shape — L3: a two-factor unit conversion, done by cancelling units.
 *
 * The cell's other shape (`d1.num-5.l3`) is the unit rate: divide a total by a count
 * to price one, then scale that up. This one never forms a rate. The learner is given
 * three units and has to build a chain of factors so the two they do not want cancel,
 * which is the mini-lesson's fourth slide and is tested nowhere else in the bank.
 */
export const num5_l3b: ItemTemplate = {
  template_id: "d1.num-5.l3b",
  node_id: "NUM.5",
  difficulty: 3,
  generate(rng: Rng) {
    // Built backwards from a whole count so the answer is always friendly: one piece
    // is `t` paces long and the stretch is `count` of them, so the conversion lands
    // on `count` exactly. `t >= 2` keeps the second factor from being the first one
    // undone, and `k >= 2` keeps the pace-to-span step from being a copy.
    const count = rng.int(2, 8);
    const t = rng.int(2, 4);
    const k = rng.int(2, 5);
    const n = count * t;
    const j = k * t;
    const spans = n * k;
    // Scenario drawn last, after every math param, so a rebuild stays deterministic.
    const pieceIndex = rng.int(0, NUM5_CONVERSION_PIECES.length - 1);
    const piece = num5ConversionPiece(pieceIndex);
    return {
      prompt: `${piece.subject} measures ${latexNum(n)} paces, and one pace is ${latexNum(k)} spans. One ${piece.singular} measures ${latexNum(j)} spans. How many ${piece.plural}, laid end to end, cover that whole length? Enter one number.`,
      answer: numericAnswer(numStr(spans / j)),
      params: { n, k, j, pieceIndex },
      hints: [
        `The whole length is counted in paces and one ${piece.singular} is counted in spans, so rewrite the whole length in spans before you count anything.`,
        "To turn paces into spans, multiply by a conversion factor written with spans on top and paces underneath, so the paces cancel and spans are what is left.",
        `Once both lengths are in spans, ask how many times one ${piece.singular} fits into the whole length. That is a division.`,
      ],
      worked_solution: workedSolution([
        `Change the whole length into spans: $${n}\\ \\text{paces} \\times \\dfrac{${k}\\ \\text{spans}}{1\\ \\text{pace}} = ${spans}\\ \\text{spans}$.`,
        `The paces cancel and only spans are left, so both lengths are in the same unit now: $${spans}$ spans for the whole stretch and $${j}$ spans for one ${piece.singular}.`,
        `Divide to count them: $${spans} \\div ${j} = ${numStr(spans / j)}$ ${piece.plural}.`,
      ]),
    };
  },
};

/** Prerequisite-gated walk L2 (tightened; no 50%/10%, mixes a reverse form). */
export const num5_walk: ItemTemplate = {
  template_id: "d1w.num-5.l2",
  node_id: "NUM.5",
  difficulty: 2,
  generate(rng: Rng) {
    // A percent-of item that needs real understanding, not halving: p is never
    // 50%/10%, base is a multiple of 20 (so the part is a whole number for every
    // p) but never a round hundred (a percent of 100 is as intuitive as 50%), and
    // half the time the item is REVERSED (given the part, find the whole) so the
    // student must invert the relationship rather than just take a percent.
    const p = rng.pick(WALK_PERCENTS);
    const base = 20 * rng.pick([2, 3, 4, 6, 7, 8, 9]);
    const part = (p * base) / 100;
    const reverse = rng.int(0, 1) === 1;
    if (reverse) {
      return {
        prompt: `${part} is ${p}% of what number?`,
        answer: numericAnswer(numStr(base)),
        params: { p, base, part, reverse: 1 },
      };
    }
    return {
      prompt: `What is ${p}% of ${base}?`,
      answer: numericAnswer(numStr(part)),
      params: { p, base, part, reverse: 0 },
    };
  },
  // A cell's instances must differ in percent-or-direction (so one percent can't
  // dominate the three, e.g. three `20%` items in a row).
  varietyKey: (params) => `${params.p}:${params.reverse}`,
};

/** Golden fixtures for NUM.5 — percentages / proportions. */
export const num5_golden: readonly GoldenFixture[] = [
  {
    item_version_id: "d1.golden.num-5.1",
    node_id: "NUM.5",
    prompt: "What is 25% of 80?",
    answer: numericAnswer("20"),
    valid: "20",
    alternate_valid: [20, "20.0"],
    // 25: read the percent; 2000: forgot to divide; 5: wrong.
    near_miss: ["25", "2000", "5"],
  },
  {
    item_version_id: "d1.golden.num-5.2",
    node_id: "NUM.5",
    prompt: "If 3 pens cost $4.50, how much do 5 pens cost (in dollars)?",
    answer: numericAnswer("7.5"),
    valid: "7.5",
    alternate_valid: [7.5, "7.50", "15/2"],
    // 13.5: 4.50×3; 4.5: unchanged; 2.7: divided wrong.
    near_miss: ["13.5", "4.5", "2.7"],
  },
];
