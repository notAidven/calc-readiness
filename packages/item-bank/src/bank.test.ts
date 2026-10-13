import { createD1AnswerChecker, D1_CHECKER_VERSION } from "@cr/components";
import { createD1MultistageSpec } from "@cr/diagnostic";
import { describe, expect, it } from "vitest";

import { createItemBank, toD1ItemVersions } from "./bank";
import { D1_ITEM_PACK } from "./d1";

describe("createItemBank", () => {
  it("serves an item for every cell each form's spec stages require", () => {
    const bank = createItemBank(D1_ITEM_PACK);
    const spec = createD1MultistageSpec();

    for (const form of ["A", "B"]) {
      for (const stage of Object.values(spec.stages)) {
        for (const slot of stage.slots) {
          const item = bank.selectItem(slot, form);
          expect(item.node_id).toBe(slot.node_id);
          expect(item.difficulty).toBe(slot.difficulty);
          expect(item.item_version_id).toContain(`:${form}:`);
          expect(item.item_definition_hash).toMatch(/^[0-9a-f]{8}$/);
        }
      }
    }
  });

  it("never serves practice items and throws on an unknown cell", () => {
    const bank = createItemBank(D1_ITEM_PACK);
    expect(() => bank.selectItem({ node_id: "NUM.S", difficulty: 3 }, "A")).toThrow(
      /no item for form A node NUM.S L3/,
    );
  });
});

describe("toD1ItemVersions feeds the authoritative checker", () => {
  it("grades every served item's authored key as correct (one source of truth)", () => {
    const checker = createD1AnswerChecker({ itemVersions: toD1ItemVersions(D1_ITEM_PACK) });
    for (const entry of D1_ITEM_PACK) {
      const result = checker({
        raw_answer: entry.answer.answer_key,
        item_version_id: entry.item_version_id,
        equivalence_checker_version: D1_CHECKER_VERSION,
      });
      expect(result.status).toBe("correct");
    }
  });
});
