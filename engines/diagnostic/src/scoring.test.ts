import type { ScoringStatus } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import type { ItemDifficulty, StageRole } from "./routing";
import {
  computePlacement,
  frontierScore,
  measuredPlacement,
  proportionCorrect,
  type ScoredResponse,
  type StageOutcome,
} from "./scoring";

function scored(
  node_id: string,
  difficulty: ItemDifficulty,
  correct: boolean,
  status: ScoringStatus = correct ? "correct" : "incorrect",
): ScoredResponse {
  return { node_id, difficulty, authoritative_correct: correct, scoring_status: status };
}

function outcome(
  stage_id: string,
  role: StageRole,
  responses: ScoredResponse[],
): StageOutcome {
  return { stage_id, role, responses };
}

describe("proportionCorrect", () => {
  it("scores over scorable responses only, excluding faults and invalid input", () => {
    expect(
      proportionCorrect([
        scored("NUM.S", 2, true),
        scored("NUM.S", 2, false),
        scored("NUM.S", 2, false, "scoring_error"),
        scored("NUM.S", 2, false, "invalid_input"),
      ]),
    ).toBe(0.5);
  });

  it("is 0 when nothing is scorable", () => {
    expect(proportionCorrect([])).toBe(0);
    expect(proportionCorrect([scored("NUM.S", 2, false, "unsupported_expression")])).toBe(
      0,
    );
  });
});

describe("frontierScore", () => {
  it("routed up: theta = 2 + up proportion (>= 2)", () => {
    const outcomes = [
      outcome("R", "routing", [scored("NUM.S", 2, true), scored("NUM.F", 2, true)]),
      outcome("H", "up", [scored("NUM.4", 3, true), scored("NUM.4", 3, false)]),
    ];
    expect(frontierScore(outcomes, 0.7)).toBeCloseTo(2.5, 5);
  });

  it("routed down with a solid foundation: theta = 1 + routing proportion (in [1,2))", () => {
    const outcomes = [
      outcome("R", "routing", [
        scored("NUM.S", 2, true),
        scored("NUM.F", 2, false),
        scored("NUM.2", 2, false),
      ]),
      outcome("E", "down", [scored("NUM.S", 1, true), scored("NUM.F", 1, true)]),
    ];
    // r = 1/3, e = 1.0 (>= bar) -> 1 + 1/3
    expect(frontierScore(outcomes, 0.7)).toBeCloseTo(1.333_333, 4);
  });

  it("routed down with a shaky foundation: theta = down proportion (< 1)", () => {
    const outcomes = [
      outcome("R", "routing", [scored("NUM.S", 2, false), scored("NUM.F", 2, false)]),
      outcome("E", "down", [scored("NUM.S", 1, true), scored("NUM.F", 1, false)]),
    ];
    // r = 0, e = 0.5 (< bar) -> theta = e
    expect(frontierScore(outcomes, 0.7)).toBeCloseTo(0.5, 5);
  });

  it("is path-invariant: equal proportions via different forms/nodes give the same score", () => {
    const pathA = [
      outcome("R", "routing", [scored("NUM.S", 2, true), scored("NUM.F", 2, true)]),
      outcome("H", "up", [scored("NUM.2", 3, true), scored("NUM.4", 3, false)]),
    ];
    const pathB = [
      outcome("R", "routing", [scored("NUM.3", 2, false), scored("NUM.2", 2, true)]),
      outcome("H", "up", [scored("NUM.5", 3, false), scored("NUM.4", 3, true)]),
    ];
    expect(frontierScore(pathA, 0.7)).toBeCloseTo(frontierScore(pathB, 0.7), 5);
  });
});

describe("measuredPlacement", () => {
  it("is the highest difficulty answered correctly", () => {
    expect(measuredPlacement([scored("NUM.S", 2, true), scored("NUM.S", 3, false)])).toBe(
      2,
    );
    expect(measuredPlacement([scored("NUM.S", 3, true)])).toBe(3);
    expect(
      measuredPlacement([
        scored("NUM.S", 1, true),
        scored("NUM.S", 2, true),
        scored("NUM.S", 3, false),
      ]),
    ).toBe(2);
  });

  it("is 0 when nothing correct or nothing scorable", () => {
    expect(measuredPlacement([scored("NUM.S", 3, false)])).toBe(0);
    expect(measuredPlacement([scored("NUM.S", 3, true, "scoring_error")])).toBe(0);
  });
});

describe("computePlacement (graph inference)", () => {
  const targets = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"];

  it("credits transitive prerequisites of a cleared node as inferred", () => {
    // NUM.4 <- {NUM.S, NUM.F, NUM.2, NUM.3}; clearing NUM.4 infers all of them
    const result = computePlacement([scored("NUM.4", 3, true)], targets);

    expect(result.placement_by_node).toEqual({
      "NUM.S": 3,
      "NUM.F": 3,
      "NUM.2": 3,
      "NUM.3": 3,
      "NUM.4": 3,
      "NUM.5": 0, // not a prerequisite of NUM.4, never tested
    });
    expect(result.inferred_nodes).toEqual(["NUM.2", "NUM.3", "NUM.F", "NUM.S"]);
  });

  it("lets direct measurement win over inference for the same node", () => {
    // NUM.2 is tested and wrong (measured 0); NUM.4 cleared would infer 3, but
    // the direct measurement stands.
    const result = computePlacement(
      [scored("NUM.4", 3, true), scored("NUM.2", 2, false)],
      targets,
    );

    expect(result.placement_by_node["NUM.2"]).toBe(0);
    expect(result.inferred_nodes).not.toContain("NUM.2");
    // the other prerequisites are still inferred
    expect(result.placement_by_node["NUM.S"]).toBe(3);
    expect(result.inferred_nodes).toEqual(["NUM.3", "NUM.F", "NUM.S"]);
  });
});
