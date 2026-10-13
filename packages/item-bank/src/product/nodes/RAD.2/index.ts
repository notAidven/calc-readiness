import { type ItemTemplate, type Rng, radicalAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/** Square-free radicands m: sqrt(p^2 * m) simplifies to exactly p*sqrt(m). */
const SQUARE_FREE: readonly number[] = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];

/**
 * RAD.2 — combine radicals: simplify each root, then add the LIKE radicals into one
 * simplified term. sqrt(p^2*m) + sqrt(q^2*m) = (p+q)*sqrt(m). Graded by the v2
 * checker's `simplified_radical` path (value identity + no perfect-power factor
 * under a root + no radical in a denominator). Difficulty 2, one L2 template per
 * spine node like the rest of the product walk. The distinct variety key is the
 * combined coefficient + radicand, so a served cell never holds near-twins.
 */
export const rad2_template: ItemTemplate = {
  template_id: "prod.rad-2.l2",
  node_id: "RAD.2",
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.pick(SQUARE_FREE);
    const p = rng.int(2, 4);
    let q = rng.int(2, 4);
    while (p === q) {
      q = rng.int(2, 4);
    }
    const sum = p + q;
    return {
      prompt: `Simplify: sqrt(${p * p * m}) + sqrt(${q * q * m})`,
      answer: radicalAnswer(`${sum}*sqrt(${m})`),
      params: { m, p, q, sum },
    };
  },
  varietyKey: (params) => `${params.sum}:${params.m}`,
};

export const rad2_golden: readonly ProductGoldenFixture[] = [
  // RAD.2 — simplify then combine LIKE radicals into one simplified term.
  {
    item_version_id: "prod.golden.rad-2.combine",
    node_id: "RAD.2",
    prompt: "Simplify: sqrt(12) + sqrt(27)",
    answer: radicalAnswer("5*sqrt(3)"),
    valid: "5*sqrt(3)",
    alternate_valid: ["sqrt(3)*5", "5sqrt(3)"],
    near_miss: [
      // Left both roots unsimplified; illegally merged the radicands under one root.
      { answer: "sqrt(12)+sqrt(27)", reason: "not_simplified" },
      { answer: "sqrt(39)", reason: "value_mismatch" },
    ],
  },
  // RAD.2 — UNLIKE radicals: they do NOT combine, so the simplified two-term sum is
  // the final answer. Pins that the checker accepts a legitimately uncombinable form.
  {
    item_version_id: "prod.golden.rad-2.unlike",
    node_id: "RAD.2",
    prompt: "Simplify: sqrt(8) + sqrt(45)",
    answer: radicalAnswer("2*sqrt(2)+3*sqrt(5)"),
    valid: "2*sqrt(2)+3*sqrt(5)",
    alternate_valid: ["3*sqrt(5)+2*sqrt(2)", "2sqrt(2)+3sqrt(5)"],
    near_miss: [
      // Left both roots unsimplified; illegally combined unlike radicals into one.
      { answer: "sqrt(8)+sqrt(45)", reason: "not_simplified" },
      { answer: "5*sqrt(7)", reason: "value_mismatch" },
    ],
  },
];
