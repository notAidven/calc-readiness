import {
  exactRadianAnswer,
  gcd,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/**
 * Degree measures for TRG.1 degrees->radians. None is a multiple of 180, so the
 * exact radian answer is always a proper pi-fraction (`pi/6`, `2*pi/3`, ...) with
 * a denominator, never the trivial `pi` / `2*pi`.
 */
const RADIAN_ANGLES: readonly number[] = [
  30, 45, 60, 90, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330,
];

// TRG.1 — convert a degree measure to radians -> exact pi-multiple (§6 pi path).
export const trg1_template: ItemTemplate = {
  template_id: "prod.trg-1.l2",
  node_id: "TRG.1",
  difficulty: 2,
  generate(rng: Rng) {
    const degrees = rng.pick(RADIAN_ANGLES);
    // radians = degrees * pi / 180, reduced to (n/d) * pi.
    const divisor = gcd(degrees, 180) || 1;
    const n = degrees / divisor;
    const d = 180 / divisor;
    const key = n === 1 ? `pi/${d}` : `${n}*pi/${d}`;
    return {
      prompt: `Convert ${degrees}° to radians. Give an exact answer in terms of pi.`,
      answer: exactRadianAnswer(key),
      params: { degrees, n, d },
    };
  },
  // Distinct reduced radian value per cell.
  varietyKey: (params) => `${params.n}/${params.d}`,
};

export const trg1_golden: readonly ProductGoldenFixture[] = [
  // TRG.1 — convert degrees to radians -> exact pi-multiple (§6 pi path).
  {
    item_version_id: "prod.golden.trg-1.to-radians",
    node_id: "TRG.1",
    prompt: "Convert 60° to radians. Give an exact answer in terms of pi.",
    answer: exactRadianAnswer("pi/3"),
    valid: "pi/3",
    alternate_valid: ["2*pi/6", "60*pi/180"],
    near_miss: [
      // Decimal approximation when exact was required; wrong multiple; gave degrees.
      { answer: "1.05", reason: "wrong_representation" },
      { answer: "pi/6", reason: "value_mismatch" },
      { answer: "60", reason: "value_mismatch" },
    ],
  },
  // TRG.1 (coterminal sub-family) -> integer degrees, plain numeric.
  {
    item_version_id: "prod.golden.trg-1.coterminal",
    node_id: "TRG.1",
    prompt: "Find the angle between 0° and 360° that is coterminal with 420°.",
    answer: numericAnswer("60"),
    valid: "60",
    alternate_valid: [60, "60.0"],
    near_miss: [
      // Did not reduce past 360; a coterminal angle outside the requested range.
      { answer: "420", reason: "value_mismatch" },
      { answer: "-300", reason: "value_mismatch" },
    ],
  },
];
