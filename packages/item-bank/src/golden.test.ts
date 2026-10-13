import { createD1AnswerChecker, D1_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { D1_GOLDEN_FIXTURES } from "./d1";

const checker = createD1AnswerChecker({
  itemVersions: D1_GOLDEN_FIXTURES.map((fixture) => ({
    item_version_id: fixture.item_version_id,
    node_id: fixture.node_id,
    answer: fixture.answer,
  })),
});

function grade(itemVersionId: string, rawAnswer: unknown): string {
  return checker({
    raw_answer: rawAnswer,
    item_version_id: itemVersionId,
    equivalence_checker_version: D1_CHECKER_VERSION,
  }).status;
}

describe("D1 golden fixtures", () => {
  it("has unique ids and covers all six D1 nodes", () => {
    const ids = D1_GOLDEN_FIXTURES.map((fixture) => fixture.item_version_id);
    expect(new Set(ids).size).toBe(D1_GOLDEN_FIXTURES.length);

    const nodes = new Set(D1_GOLDEN_FIXTURES.map((fixture) => fixture.node_id));
    expect(nodes).toEqual(new Set(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"]));
  });

  for (const fixture of D1_GOLDEN_FIXTURES) {
    describe(`${fixture.item_version_id} — "${fixture.prompt}"`, () => {
      it("grades the key and every alternate-valid form correct", () => {
        expect(grade(fixture.item_version_id, fixture.valid)).toBe("correct");
        for (const alternate of fixture.alternate_valid) {
          expect(grade(fixture.item_version_id, alternate), String(alternate)).toBe(
            "correct",
          );
        }
      });

      it("grades every near-miss incorrect", () => {
        for (const miss of fixture.near_miss) {
          expect(grade(fixture.item_version_id, miss), String(miss)).toBe("incorrect");
        }
      });
    });
  }
});
