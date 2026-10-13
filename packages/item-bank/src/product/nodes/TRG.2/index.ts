import {
  exactTrigValueAnswer,
  type ItemTemplate,
  multipartAnswer,
  type Rng,
} from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/** The special-angle right-triangle values (TRG.2), each an exact canonical form. */
const TRIG_PAIRS: readonly { fn: string; deg: number; value: string }[] = [
  { fn: "sin", deg: 30, value: "1/2" },
  { fn: "sin", deg: 45, value: "sqrt(2)/2" },
  { fn: "sin", deg: 60, value: "sqrt(3)/2" },
  { fn: "cos", deg: 30, value: "sqrt(3)/2" },
  { fn: "cos", deg: 45, value: "sqrt(2)/2" },
  { fn: "cos", deg: 60, value: "1/2" },
  { fn: "tan", deg: 30, value: "sqrt(3)/3" },
  { fn: "tan", deg: 45, value: "1" },
  { fn: "tan", deg: 60, value: "sqrt(3)" },
];

// TRG.2 — exact special-angle values as a multipart angle->value table (§4
// canonical_exact_trig_value: exact, simplified radical, float value-match).
export const trg2_template: ItemTemplate = {
  template_id: "prod.trg-2.l2",
  node_id: "TRG.2",
  difficulty: 2,
  generate(rng: Rng) {
    // Draw 3 DISTINCT (function, angle) pairs from the special-angle table.
    const indexPool = TRIG_PAIRS.map((_pair, index) => index);
    const chosenIdx: number[] = [];
    while (chosenIdx.length < 3 && indexPool.length > 0) {
      const [idx] = indexPool.splice(rng.int(0, indexPool.length - 1), 1);
      if (idx !== undefined) {
        chosenIdx.push(idx);
      }
    }
    chosenIdx.sort((left, right) => left - right);
    const chosen = chosenIdx
      .map((index) => TRIG_PAIRS[index])
      .filter((pair): pair is (typeof TRIG_PAIRS)[number] => pair !== undefined);
    const prompt = `Give the exact value of each: ${chosen
      .map((pair) => `${pair.fn} ${pair.deg}°`)
      .join(", ")}.`;
    const parts = chosen.map((pair) => ({
      part_id: `${pair.fn}${pair.deg}`,
      answer: exactTrigValueAnswer(pair.value),
    }));
    return {
      prompt,
      answer: multipartAnswer(parts),
      params: { p0: chosenIdx[0] ?? 0, p1: chosenIdx[1] ?? 0, p2: chosenIdx[2] ?? 0 },
    };
  },
  // The chosen (function, angle) set is the item's structural fingerprint.
  varietyKey: (params) => `${params.p0}:${params.p1}:${params.p2}`,
};

export const trg2_golden: readonly ProductGoldenFixture[] = [
  // TRG.2 — special-angle values as a multipart angle->value table (§4
  // canonical_exact_trig_value + the existing multipart comparator).
  {
    item_version_id: "prod.golden.trg-2.special-angles",
    node_id: "TRG.2",
    prompt: "Give the exact value of each: sin 30°, cos 30°, tan 45°.",
    answer: multipartAnswer([
      { part_id: "sin30", answer: exactTrigValueAnswer("1/2") },
      { part_id: "cos30", answer: exactTrigValueAnswer("sqrt(3)/2") },
      { part_id: "tan45", answer: exactTrigValueAnswer("1") },
    ]),
    valid: { sin30: "1/2", cos30: "sqrt(3)/2", tan45: "1" },
    alternate_valid: [
      { sin30: "1/2", cos30: "nthRoot(3, 2)/2", tan45: "1" },
      { sin30: "1/2", cos30: "(1/2)*sqrt(3)", tan45: "1" },
    ],
    near_miss: [
      // A decimal part; an unsimplified radical part; a wrong part value. The
      // reason code is prefixed with the failing part id (compareMultipart).
      {
        answer: { sin30: "0.5", cos30: "sqrt(3)/2", tan45: "1" },
        reason: "sin30:wrong_representation",
      },
      {
        answer: { sin30: "1/2", cos30: "sqrt(12)/4", tan45: "1" },
        reason: "cos30:not_simplified",
      },
      {
        answer: { sin30: "1/2", cos30: "sqrt(3)/2", tan45: "2" },
        reason: "tan45:value_mismatch",
      },
    ],
  },
];
