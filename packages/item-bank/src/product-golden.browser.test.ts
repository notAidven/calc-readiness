import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";
import { toProductItemVersions } from "./bank";
import { PRODUCT_GOLDEN_FIXTURES } from "./product";

/**
 * §13.7 cross-runtime parity: the SAME product golden fixtures graded by the v2
 * checker in Chromium must return the identical verdict + reason code they do in
 * Node (`product-golden.test.ts`). Mirrors `product-answer-checker.browser.test.ts`.
 */
const checker = createProductAnswerChecker({
  itemVersions: toProductItemVersions(
    PRODUCT_GOLDEN_FIXTURES.map((fixture) => ({
      item_version_id: fixture.item_version_id,
      node_id: fixture.node_id,
      difficulty: 2 as const,
      form: "A" as const,
      prompt: fixture.prompt,
      answer: fixture.answer,
    })),
  ),
});

function grade(
  itemVersionId: string,
  rawAnswer: unknown,
): { status: string; reason: string } {
  const result = checker({
    raw_answer: rawAnswer,
    item_version_id: itemVersionId,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return { status: result.status, reason: result.reason_code };
}

describe("product golden fixtures (v2 checker, Chromium parity)", () => {
  for (const fixture of PRODUCT_GOLDEN_FIXTURES) {
    it(`${fixture.item_version_id} grades key + alternates correct and near-misses by reason`, () => {
      expect(grade(fixture.item_version_id, fixture.valid).status).toBe("correct");
      for (const alternate of fixture.alternate_valid) {
        expect(
          grade(fixture.item_version_id, alternate).status,
          JSON.stringify(alternate),
        ).toBe("correct");
      }
      for (const miss of fixture.near_miss) {
        const graded = grade(fixture.item_version_id, miss.answer);
        expect(graded.status, JSON.stringify(miss.answer)).toBe("incorrect");
        expect(graded.reason, JSON.stringify(miss.answer)).toBe(miss.reason);
      }
    });
  }
});
