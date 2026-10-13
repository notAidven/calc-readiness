import { describe, expect, it } from "vitest";

import { toProductItemVersions } from "./bank";
import { D1_PRACTICE_ITEMS } from "./d1";
import * as itemBank from "./index";
import { canonicalRawAnswer } from "./raw-answer";
import type { FrozenItem } from "./template";
import { D1_CHECKER_CONFIG, PRODUCT_CHECKER_CONFIG } from "./validate";

/**
 * A PRACTICE item never refuses an unreduced spelling of its own correct answer, unless its
 * own prompt asked for lowest terms.
 *
 * D4 round 1's P0-2 established the ruling this file measures: `content/lessons/d4/POL.4.json`
 * refused `-4, 6/4` on a question whose answer is $-4$ and $\tfrac{3}{2}$, and the content
 * owner ruled that reducing to lowest terms is not what POL.4 teaches, so that refusal is a
 * correct answer graded wrong rather than a house-style question. That round fixed it on the
 * CFU population — an authored pack's `accepted` list and a re-ask's computed list — and
 * recorded as R-7 that the PRACTICE surfaces were never swept for the same defect. They are a
 * DIFFERENT GRADER: the real answer checker over each item's own `simplification` profile,
 * rather than a list of spellings somebody wrote down. This file is that measurement.
 *
 * ## Population, and why it is not "the D4 pool"
 *
 * The defect is possible on any served practice item whose answer STATES A RATIONAL NUMBER,
 * because that is the answer a learner can spell unreduced. Nothing about it is D4's: POL.4's
 * root shares no line of implementation with LF.1's slope, RAD.3's negative-exponent value or
 * TRG.2's ratio, and each of those keys a fraction. So the population is derived from every
 * served practice pool — every `*_PRACTICE_ITEMS` export of `./index`, which is the set
 * `apps/web/src/lessons/practiceChecker.ts` registers as gradable — and then filtered to the
 * items whose key holds a literal `a/b`. Adding a pool needs no edit here; losing one fails a
 * floor, and the floors below are on the COMPOSITION as well as the count, because a floor of
 * 100 candidates is satisfied by one pool's 130.
 *
 * ## Why the exemption is read off the PROMPT
 *
 * Some items legitimately owe lowest terms, and D1's NUM.F is the case round 1 named. The
 * ground for excusing them is not that their spec says `reduced_fraction` — a spec is what the
 * grader does — but that their PROMPT says *"Write your answer as a fraction in lowest
 * terms."* (`FRACTION_LOWEST_TERMS_SUFFIX`), so the learner was told before answering. Reading
 * the prompt makes the exemption a fact about what the learner was asked, and it is asserted
 * in both directions: an excused item that stops declaring the profile fails, an item that
 * declares the profile without SAYING so in its prompt fails, and an excused item that has
 * quietly started accepting unreduced answers fails as an exemption that excuses nothing.
 *
 * ## Why the fraction pattern refuses an exponent
 *
 * `3*x^2/2` (D5's RAT.1) holds the substring `2/2`, whose numerator is the SQUARE and not a
 * numerator at all. Scaling that naively spells `3*x^4/4`, a different expression, and the
 * sweep would then report a refusal it manufactured itself. So the numerator may not be
 * preceded by a caret, and the keys the naive pattern reaches while this one does not are
 * declared in {@link FRACTION_BAR_IS_NOT_A_RATIO} and asserted both ways, so the carve-out
 * cannot quietly grow into the population it was carved out of.
 */

/** Every served practice pool, derived from the barrel's own exports. */
const POOLS: readonly (readonly [string, readonly FrozenItem[]])[] = Object.entries(
  itemBank as unknown as Record<string, unknown>,
)
  .filter(([name]) => name.endsWith("_PRACTICE_ITEMS"))
  .map(([name, value]) => [name, value as readonly FrozenItem[]] as const)
  .sort(([a], [b]) => a.localeCompare(b));

/**
 * The one pool `practiceChecker.ts` routes to the LOCKED v1 checker; every other pool routes
 * to v2. Named rather than derived, because the routing is a fact about the web surface rather
 * than about the bank — and it is not taken on trust: every candidate is graded on its own
 * canonical key first, so an item sent to the wrong checker fails there instead of producing a
 * quiet false negative in the sweep that matters.
 */
const V1_POOL = "D1_PRACTICE_ITEMS";

/** A literal `a/b` in a key: a ratio, never an exponent and never a decimal's digits. */
const RATIO = /(?<![\^\d.])(\d+)\s*\/\s*(\d+)(?![\d.])/g;

/** Any `digits/digits`, exponents included. The difference is what has to be declared. */
const NAIVE_RATIO = /\d+\s*\/\s*\d+/;

/** What a prompt says when it has asked for lowest terms (`FRACTION_LOWEST_TERMS_SUFFIX`). */
const ASKS_FOR_LOWEST_TERMS = /lowest terms/i;

/** The simplification profile a grader declares when lowest terms is the question. */
const LOWEST_TERMS_PROFILE = "reduced_fraction";

/**
 * Keys whose only fraction bar sits under an exponent, so no mechanical rescaling of the
 * string spells the same number. Declared by TEMPLATE and asserted both ways below.
 */
const FRACTION_BAR_IS_NOT_A_RATIO: readonly string[] = ["d5.rat1.monomial.l1"];

/**
 * The nodes whose items are excused, each because its prompt asks for lowest terms.
 *
 *  - `NUM.F` is D1's put-a-fraction-in-lowest-terms lesson, the node round 1 examined for P0-2
 *    and deliberately left excused.
 *  - `NUM.3` is the one round 1 did not name. Its `l1b` reciprocal shape answers through
 *    `reducedFractionAnswer` as well and appends the same suffix to its prompt, so it owes the
 *    property on the same ground and belongs in the list rather than outside the population.
 */
const OWES_LOWEST_TERMS_NODES: readonly string[] = ["NUM.3", "NUM.F"];

interface Candidate {
  readonly pool: string;
  readonly item: FrozenItem;
  readonly key: string;
  readonly profile: string;
  readonly asksForLowestTerms: boolean;
}

/** `{-4, 2/5}` scaled by 3 is `{-4, 6/15}`: the same number, spelled unreduced. */
function scaleRatios(key: string, factor: number): string {
  return key.replace(
    RATIO,
    (_whole, top: string, bottom: string) =>
      `${Number(top) * factor}/${Number(bottom) * factor}`,
  );
}

const CANDIDATES: readonly Candidate[] = POOLS.flatMap(([pool, items]) =>
  items
    .filter((item) => {
      RATIO.lastIndex = 0;
      return RATIO.test(String(item.answer.answer_key ?? ""));
    })
    .map((item) => {
      const spec = item.answer.answer_spec;
      return {
        pool,
        item,
        key: String(item.answer.answer_key ?? ""),
        profile: `${spec.answer_type}|${spec.representation}|${spec.simplification}`,
        asksForLowestTerms: ASKS_FOR_LOWEST_TERMS.test(item.prompt),
      };
    }),
);

const SERVED_TOTAL = POOLS.reduce((total, [, items]) => total + items.length, 0);
const OWED = CANDIDATES.filter((candidate) => !candidate.asksForLowestTerms);
const EXCUSED = CANDIDATES.filter((candidate) => candidate.asksForLowestTerms);

/** One checker per version, built once: construction is the expensive half. */
const v2Checker = PRODUCT_CHECKER_CONFIG.checker(
  toProductItemVersions(POOLS.filter(([pool]) => pool !== V1_POOL).flatMap(([, i]) => i)),
);
const v1Checker = D1_CHECKER_CONFIG.checker(toProductItemVersions(D1_PRACTICE_ITEMS));

function gradeOf(candidate: Candidate, rawAnswer: unknown) {
  const config = candidate.pool === V1_POOL ? D1_CHECKER_CONFIG : PRODUCT_CHECKER_CONFIG;
  const checker = candidate.pool === V1_POOL ? v1Checker : v2Checker;
  return checker({
    raw_answer: rawAnswer,
    item_version_id: candidate.item.item_version_id,
    equivalence_checker_version: config.checkerVersion,
  });
}

describe("a practice item never refuses an unreduced spelling of its own answer", () => {
  it("derives its population from every served pool, floored so it cannot narrow back", () => {
    expect(POOLS.length, "served practice pools").toBeGreaterThanOrEqual(11);
    expect(SERVED_TOTAL, "served practice items").toBeGreaterThanOrEqual(2000);
    expect(CANDIDATES.length, "items keying a literal ratio").toBeGreaterThanOrEqual(100);
    expect(OWED.length, "items owing the property").toBeGreaterThanOrEqual(80);
    // Composition, not size. A floor is satisfied by one pool's items, and the claim is that
    // this sweep is wider than the D4 pool round 1 was looking at when it deferred R-7.
    const pools = new Set(OWED.map((candidate) => candidate.pool));
    expect(
      pools.size,
      `only ${[...pools].join(", ")} owes the property`,
    ).toBeGreaterThanOrEqual(4);
    const outsideD4 = OWED.filter((candidate) => candidate.pool !== "D4_PRACTICE_ITEMS");
    expect(
      outsideD4.length,
      "the sweep reaches nothing outside D4, so it is the old population again",
    ).toBeGreaterThanOrEqual(60);
  });

  it("grades every candidate's own canonical key correct, so a mis-routed item cannot pass", () => {
    const failures = CANDIDATES.filter(
      (candidate) =>
        gradeOf(candidate, canonicalRawAnswer(candidate.item.answer)).status !== "correct",
    ).map(
      (candidate) => `${candidate.item.item_version_id}: own key ${candidate.key} refused`,
    );
    expect(failures.join("\n")).toBe("");
    expect(CANDIDATES.length).toBeGreaterThanOrEqual(100);
  }, 120_000);

  it("accepts the same number spelled unreduced, wherever the prompt did not ask for lowest terms", () => {
    const refusals: string[] = [];
    let graded = 0;
    for (const candidate of OWED) {
      for (const factor of [2, 3]) {
        const spelling = scaleRatios(candidate.key, factor);
        if (spelling === candidate.key) {
          refusals.push(
            `${candidate.item.item_version_id}: nothing scaled in ${candidate.key}, so this item was measured on nothing`,
          );
          continue;
        }
        graded += 1;
        const result = gradeOf(candidate, spelling);
        if (result.status !== "correct") {
          refusals.push(
            `${candidate.item.item_version_id} (${candidate.profile}) answers ${candidate.key} and refuses ${spelling}, the same number (${result.status}/${result.reason_code})`,
          );
        }
      }
    }
    expect(refusals.slice(0, 12).join("\n")).toBe("");
    expect(graded, "unreduced spellings actually graded").toBe(OWED.length * 2);
  }, 180_000);

  /**
   * The exemption's first direction: an excused item must still REFUSE the unreduced spelling.
   * If it has quietly stopped doing so, the exemption is excusing nothing and hiding that it
   * excuses nothing, which is how a member that FORGOT the property comes to look identical to
   * one that never owed it.
   */
  it("still refuses an unreduced spelling on every item whose prompt asked for lowest terms", () => {
    const accepted: string[] = [];
    for (const candidate of EXCUSED) {
      const spelling = scaleRatios(candidate.key, 2);
      const result = gradeOf(candidate, spelling);
      if (result.status === "correct") {
        accepted.push(
          `${candidate.item.item_version_id} (${candidate.profile}) is excused from the sweep above and yet accepts ${spelling} for ${candidate.key}, so the exemption excuses nothing`,
        );
      }
    }
    expect(accepted.slice(0, 12).join("\n")).toBe("");
    expect(EXCUSED.length, "nothing is excused, so this proves nothing").toBeGreaterThan(
      30,
    );
  }, 180_000);

  /**
   * The exemption's second direction, and the one that stops it becoming permanent by neglect:
   * the excused set is exactly the nodes declared above, every one of them declares the
   * profile that makes lowest terms its question, and no item anywhere declares that profile
   * without its prompt saying so. The last of those three is the one that would catch a
   * grader demanding a form it never asked for.
   */
  it("excuses an item only where the prompt and the profile agree", () => {
    expect([...new Set(EXCUSED.map((c) => c.item.node_id))].sort()).toEqual(
      [...OWES_LOWEST_TERMS_NODES].sort(),
    );
    for (const candidate of EXCUSED) {
      expect(
        String(candidate.item.answer.answer_spec.simplification),
        `${candidate.item.item_version_id} asks for lowest terms and does not grade for it`,
      ).toBe(LOWEST_TERMS_PROFILE);
    }
    const silentlyRequired = CANDIDATES.filter(
      (candidate) =>
        String(candidate.item.answer.answer_spec.simplification) === LOWEST_TERMS_PROFILE &&
        !candidate.asksForLowestTerms,
    ).map(
      (candidate) =>
        `${candidate.item.item_version_id} grades for lowest terms and its prompt never says so: "${candidate.item.prompt}"`,
    );
    expect(silentlyRequired.join("\n")).toBe("");
    expect(EXCUSED.length).toBeGreaterThan(30);
  });

  /**
   * The exponent carve-out, both ways: every declared template still keys a bar this sweep's
   * pattern cannot read, and no undeclared template does.
   */
  it("declares every key whose fraction bar is not a ratio", () => {
    const reached = new Set(CANDIDATES.map((candidate) => candidate.item.item_version_id));
    const missed = new Set<string>();
    for (const [, items] of POOLS) {
      for (const item of items) {
        if (
          NAIVE_RATIO.test(String(item.answer.answer_key ?? "")) &&
          !reached.has(item.item_version_id)
        ) {
          missed.add(item.template_id);
        }
      }
    }
    expect([...missed].sort()).toEqual([...FRACTION_BAR_IS_NOT_A_RATIO].sort());
  });
});
