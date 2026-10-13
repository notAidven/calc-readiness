import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type CheckAnswerResult,
} from "@cr/components";
import {
  canonicalRawAnswer,
  D2_PRACTICE_TEMPLATES,
  D4_PRACTICE_TEMPLATES,
  type FrozenItem,
  generateFromTemplate,
  type ItemTemplate,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { SERVED_PRACTICE_ITEMS, submitThroughPracticeSurface } from "./submitPathHarness";
import { unreadableAnswer } from "./unreadableAnswer";

/**
 * THE EXPONENT A LEARNER REACHES BY MAKING THE MISTAKE THE ITEM IS FOR MUST BE READABLE.
 *
 * A power-of-a-power item keyed `y^8` is built from `(y^4)^2`, so the single most predictable
 * error on it — multiplying the exponents where you should add, or adding where you should
 * multiply — lands on `y^16`. With the parse grammar capped at 8 that came back
 * `invalid_input / unsupported_exponent`, and `invalid_input` is NOT a miss: `isResolvingStatus`
 * in the lesson engine declines to score it, so no attempt is recorded, no misconception is
 * logged, and the learner is re-served rather than corrected. The boundary sat one exponent
 * above the key, which put the archetypal slip outside the grammar BY CONSTRUCTION.
 *
 * Measured over the served bank before the change (2,265 items, every bare-string key carrying
 * a caret, two key-derived slips each): 306 slips, of which **24 were discarded** rather than
 * scored, every one of them `unsupported_exponent`, and 0 were wrongly accepted.
 *
 * ## What decides the number
 *
 * Not a round figure. The cap has to clear TWICE the largest exponent any served key carries,
 * because doubling is the slip, and {@link theCapClearsTheDoublingSlip} asserts exactly that
 * relation against the bank rather than against a literal — so a newly authored key with a
 * bigger exponent fails here instead of quietly putting its own doubling slip out of range
 * again. The ceiling on the other side is measured in
 * `packages/shared-components/src/exponentCap.test.ts`: the cap squared is the degree a
 * two-level nest reaches, and it has to stay inside the exact polynomial reader or the
 * `rationalize` performance cliff comes back.
 *
 * ## The population, and why it is the whole bank
 *
 * Scoped to the three templates the original probe found, this sweep would have measured the
 * implementation of one item family instead of the behaviour. Any item whose key carries an
 * exponent can receive a key-derived exponent slip, so the population is every served item with
 * one, derived here and floored, with no exception list — a `rational_answer` item is submitted
 * in its own `{ expression, excluded_values }` payload ({@link submissionFor}) so that the
 * exponent is the only thing that varies across a row.
 */

const TEMPLATES = new Map<string, ItemTemplate>(
  [...D2_PRACTICE_TEMPLATES, ...D4_PRACTICE_TEMPLATES].map((template) => [
    template.template_id,
    template,
  ]),
);

/** The finding's own probes, by template and seed, with the strings it submitted. */
const REPORTED_PROBES: readonly {
  readonly template_id: string;
  readonly seed: number;
  readonly key: string;
  readonly slips: readonly string[];
}[] = [
  {
    template_id: "d2.exp.power.l2",
    seed: 903600,
    key: "y^8",
    slips: ["y^7", "y^9", "y^16"],
  },
  {
    template_id: "d2.exp.power.l2",
    seed: 903601,
    key: "x^6",
    slips: ["x^5", "x^9", "x^12"],
  },
  { template_id: "d2.exp.quotient.l2", seed: 903900, key: "y^3", slips: ["y^11"] },
  { template_id: "d2.rad4.magnitude.l1", seed: 905600, key: "abs(n^3)", slips: ["n^12"] },
  {
    template_id: "d4.pol6.product-leading-term.l3",
    seed: 911500,
    key: "-10x^6",
    slips: ["-10x^9"],
  },
];

function drawOf(templateId: string, seed: number): FrozenItem {
  const template = TEMPLATES.get(templateId);
  if (!template) {
    throw new Error(`${templateId} is no longer a D2/D4 practice template`);
  }
  return generateFromTemplate(template, "practice", seed);
}

/**
 * `text` in the payload shape this item's own answer control submits.
 *
 * A `rational_answer` is graded from `{ expression, excluded_values }`, so a bare string
 * reaches it malformed and comes back `invalid_rational_answer` whatever exponent is in it —
 * a fact about the payload and not about the cap. The exclusions are carried over from the
 * item's canonical answer and only the expression is replaced.
 */
function submissionFor(item: FrozenItem, text: string): unknown {
  const canonical = canonicalRawAnswer(item.answer);
  if (canonical && typeof canonical === "object" && "expression" in canonical) {
    return { ...(canonical as Record<string, unknown>), expression: text };
  }
  return text;
}

/** Rewrite the first `^n` in a key, which is what a learner's arithmetic slip does to it. */
function rewriteExponent(
  key: string,
  transform: (value: number) => number,
): string | undefined {
  const match = /\^(\d+)/.exec(key);
  return match ? key.replace(/\^(\d+)/, `^${transform(Number(match[1]))}`) : undefined;
}

/** Every exponent written in a key, so the bank's own ceiling can be read off it. */
function exponentsIn(key: string): number[] {
  return [...key.matchAll(/\^(\d+)/g)].map((match) => Number(match[1]));
}

interface Slip {
  readonly item: FrozenItem;
  readonly key: string;
  readonly slip: string;
  readonly kind: "bump" | "double";
}

/**
 * The population: every served item whose key is a bare string carrying an exponent, with the
 * two slips built from the key itself. `bump` (+1) is the smallest possible arithmetic slip;
 * `double` (x2) is what multiplying instead of adding gives, which is the misconception the
 * power items exist to catch.
 */
const KEY_DERIVED_SLIPS: readonly Slip[] = SERVED_PRACTICE_ITEMS.flatMap((item) => {
  const key = item.answer.answer_key;
  if (typeof key !== "string" || !key.includes("^")) {
    return [];
  }
  const bump = rewriteExponent(key, (value) => value + 1);
  const double = rewriteExponent(key, (value) => value * 2);
  return [
    ...(bump ? [{ item, key, slip: bump, kind: "bump" as const }] : []),
    ...(double ? [{ item, key, slip: double, kind: "double" as const }] : []),
  ];
});

/** The largest exponent anything in the served bank is keyed on. */
const LARGEST_SERVED_EXPONENT = Math.max(
  ...SERVED_PRACTICE_ITEMS.flatMap((item) =>
    typeof item.answer.answer_key === "string" ? exponentsIn(item.answer.answer_key) : [],
  ),
);

/**
 * The cap the GRAMMAR enforces, read off the grader rather than off the constant.
 *
 * The learner-facing line has to name the number the parser actually applies, and importing
 * `MAX_EXPONENT` would only prove the copy agrees with a constant. Scanning finds the largest
 * exponent the real product comparator will read, so the two halves of the claim — what the
 * grammar admits and what the field says it admits — are measured independently.
 */
const GRAMMAR_EXPONENT_CAP = (() => {
  const checker = createProductAnswerChecker({
    itemVersions: [
      {
        item_version_id: "cap:probe:v2",
        node_id: "POL.1",
        answer: {
          answer_key: "x^2",
          allowed_symbols: ["x"],
          answer_spec: {
            answer_type: "expression",
            equivalence: "symbolic",
            representation: "any",
            simplification: "none",
            required_form: null,
            required_notation: "none",
            precision: null,
            unit_policy: "none",
          },
        },
      },
    ] as unknown as Parameters<typeof createProductAnswerChecker>[0]["itemVersions"],
  });
  let highest = 0;
  for (let exponent = 1; exponent <= 64; exponent += 1) {
    const result: CheckAnswerResult = checker({
      raw_answer: `x^${exponent}`,
      item_version_id: "cap:probe:v2",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    if (result.reason_code !== "unsupported_exponent") {
      highest = exponent;
    }
  }
  return highest;
})();

describe("the mistake the item is for is inside the grammar", () => {
  it.each(REPORTED_PROBES)(
    "$template_id:$seed still grades its own key $key",
    ({ template_id, seed, key }) => {
      const item = drawOf(template_id, seed);
      expect(
        item.answer.answer_key,
        `${template_id}:${seed} is no longer keyed ${key}`,
      ).toBe(key);
      const result = submitThroughPracticeSurface(item, canonicalRawAnswer(item.answer));
      expect(result.outcome, `${key} -> ${result.status}/${result.reason_code}`).toBe(
        "correct",
      );
    },
  );

  it.each(
    REPORTED_PROBES.flatMap(({ template_id, seed, key, slips }) =>
      slips.map((slip) => ({ template_id, seed, key, slip })),
    ),
  )("$template_id:$seed scores $slip against $key", ({ template_id, seed, key, slip }) => {
    const item = drawOf(template_id, seed);
    const result = submitThroughPracticeSurface(item, submissionFor(item, slip));
    // A scored miss is the whole point: `invalid_input` records no attempt and logs no
    // misconception, so the learner is re-served the item instead of being corrected.
    expect(
      result.outcome,
      `${slip} against ${key} -> ${result.outcome}/${result.reason_code}`,
    ).toBe("incorrect");
  });
});

describe("every key-derived exponent slip in the served bank is scored", () => {
  /**
   * The floors. The size floor stops the derivation silently emptying; the second floor is
   * about the SHAPE of it — a sweep that kept only slips landing on 8 or below would pass
   * every assertion below while measuring nothing at all about the cap, so the count of slips
   * that go OVER the old cap of 8 is asserted too. Those 24 rows are the defect's population.
   */
  it("derives a population big enough to be worth sweeping", () => {
    expect(KEY_DERIVED_SLIPS.length).toBeGreaterThanOrEqual(300);
    const pastTheOldCap = KEY_DERIVED_SLIPS.filter((entry) =>
      exponentsIn(entry.slip).some((exponent) => exponent > 8),
    );
    expect(
      pastTheOldCap.length,
      "no slip in this sweep even leaves the old cap",
    ).toBeGreaterThanOrEqual(24);
  });

  it("scores all of them, and accepts none of them", () => {
    const unscored: string[] = [];
    const accepted: string[] = [];
    for (const entry of KEY_DERIVED_SLIPS) {
      const result = submitThroughPracticeSurface(
        entry.item,
        submissionFor(entry.item, entry.slip),
      );
      const line = `${entry.item.item_version_id} key=${entry.key} ${entry.kind}=${entry.slip} -> ${result.outcome}/${result.reason_code}`;
      if (result.outcome === "correct") {
        accepted.push(line);
      } else if (result.outcome !== "incorrect") {
        unscored.push(line);
      }
    }
    // Marking a right answer wrong is a worse defect than the one being fixed, so the
    // acceptance side is asserted first and separately.
    expect(accepted, `slips wrongly ACCEPTED:\n${accepted.join("\n")}`).toEqual([]);
    expect(unscored, `slips DISCARDED rather than scored:\n${unscored.join("\n")}`).toEqual(
      [],
    );
  });
});

describe("the cap, the bank, and what the field says about it", () => {
  it("the cap clears the doubling slip on every served key", () => {
    // The relation, not the number: doubling is the slip, so a bank whose largest keyed
    // exponent doubles past the grammar has put its own archetypal error out of range again.
    expect(LARGEST_SERVED_EXPONENT).toBeGreaterThanOrEqual(2);
    expect(
      GRAMMAR_EXPONENT_CAP,
      `the largest served exponent is ${LARGEST_SERVED_EXPONENT}, whose doubling slip needs ${LARGEST_SERVED_EXPONENT * 2}`,
    ).toBeGreaterThanOrEqual(LARGEST_SERVED_EXPONENT * 2);
  });

  it("the unreadable-answer line names the cap the grammar applies", () => {
    const advice = unreadableAnswer(
      { status: "invalid_input", reason_code: "unsupported_exponent" },
      `x^${GRAMMAR_EXPONENT_CAP + 1}`,
    );
    expect(advice).not.toBeNull();
    expect(
      advice?.fix,
      `the field advertises "${advice?.fix}" while the grammar admits ${GRAMMAR_EXPONENT_CAP}`,
    ).toContain(`up to ${GRAMMAR_EXPONENT_CAP}`);
    // The other direction: a line that named a number the grammar does NOT admit would send a
    // learner who followed it straight back into `invalid_input`.
    for (const wrong of [GRAMMAR_EXPONENT_CAP + 1, GRAMMAR_EXPONENT_CAP * 2]) {
      expect(
        advice?.fix,
        `the line offers ${wrong}, which the grammar refuses`,
      ).not.toContain(`up to ${wrong}`);
    }
  });
});
