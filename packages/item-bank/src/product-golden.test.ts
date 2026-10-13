import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";
import { toProductItemVersions } from "./bank";
import { PRODUCT_GOLDEN_FIXTURES } from "./product";

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

/**
 * The nodes that carry a frozen walk template AND golden anchors. Every node in
 * `PRODUCT_NODES` must appear here, which is what stops a spine node being authored
 * with a template and no hand-reviewed prompt<->answer anchor.
 */
const SPINE_GOLDEN_NODES: readonly string[] = [
  "LIN.1",
  "POL.1",
  "POL.2",
  "RAT.1",
  "CG.1",
  "FUN.1",
  "LF.1",
  "RAD.1",
  "EL.1",
  "EXP.1",
  "TRG.1",
  "TRG.2",
  "RAD.2",
  "RAD.3",
  "RAD.4",
];

/**
 * Nodes whose fixtures are GATE-CLEARANCE evidence rather than walk anchors: post-MVP
 * `target` nodes the frozen pre/post walk never serves, authored here so their answer
 * shapes are proven gradable by the real v2 checker in both runtimes before anyone
 * authors their item packs (`Content_Authoring_Split.md` §4.4). They deliberately have
 * NO entry in `PRODUCT_TEMPLATES`, so no frozen form or pinned hash moves.
 */
const GATE_EVIDENCE_NODES: readonly string[] = ["LIN.5", "LIN.6", "EL.6"];

describe("product golden fixtures (v2 checker, Node)", () => {
  it("covers all authored spine nodes, plus the gate-evidence nodes", () => {
    const nodes = new Set(PRODUCT_GOLDEN_FIXTURES.map((fixture) => fixture.node_id));
    expect(nodes).toEqual(new Set([...SPINE_GOLDEN_NODES, ...GATE_EVIDENCE_NODES]));
  });

  it("has unique fixture ids", () => {
    const ids = PRODUCT_GOLDEN_FIXTURES.map((fixture) => fixture.item_version_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const fixture of PRODUCT_GOLDEN_FIXTURES) {
    describe(`${fixture.item_version_id} — "${fixture.prompt}"`, () => {
      it("grades the key and every alternate-valid form correct", () => {
        expect(grade(fixture.item_version_id, fixture.valid).status).toBe("correct");
        for (const alternate of fixture.alternate_valid) {
          expect(
            grade(fixture.item_version_id, alternate).status,
            JSON.stringify(alternate),
          ).toBe("correct");
        }
      });

      it("grades every near-miss incorrect with its noted reason code", () => {
        for (const miss of fixture.near_miss) {
          const graded = grade(fixture.item_version_id, miss.answer);
          expect(graded.status, JSON.stringify(miss.answer)).toBe("incorrect");
          expect(graded.reason, JSON.stringify(miss.answer)).toBe(miss.reason);
        }
      });
    });
  }

  it("§13.5 — every non-MCQ fixture has >=2 alternate-valid forms", () => {
    for (const fixture of PRODUCT_GOLDEN_FIXTURES) {
      if (fixture.answer.answer_spec.answer_type === "multiple_choice") {
        continue;
      }
      expect(
        fixture.alternate_valid.length,
        `${fixture.item_version_id} needs >=2 alternate-valid`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("§13.6 — every fixture has >=1 near-miss", () => {
    for (const fixture of PRODUCT_GOLDEN_FIXTURES) {
      expect(
        fixture.near_miss.length,
        `${fixture.item_version_id} needs >=1 near-miss`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("§13.9 — every rational_answer fixture has a drop-exclusion missing_exclusion near-miss", () => {
    const rationals = PRODUCT_GOLDEN_FIXTURES.filter(
      (fixture) => fixture.answer.answer_spec.answer_type === "rational_answer",
    );
    expect(rationals.length).toBeGreaterThan(0);
    for (const fixture of rationals) {
      const dropped = fixture.near_miss.find((miss) => miss.reason === "missing_exclusion");
      expect(
        dropped,
        `${fixture.item_version_id} needs a missing_exclusion near-miss`,
      ).toBeDefined();
      if (dropped) {
        const graded = grade(fixture.item_version_id, dropped.answer);
        expect(graded.status).toBe("incorrect");
        expect(graded.reason).toBe("missing_exclusion");
      }
    }
  });
});
