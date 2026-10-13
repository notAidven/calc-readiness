import { MASTERY_BAR } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  diagnosticUnlockedEraPrefix,
  initialIslandUnlockExamState,
  islandUnlockEligibility,
  islandUnlockExamReducer,
  islandUnlockMasteryRequirement,
  islandUnlockTarget,
} from "./island-unlock-exam";

function nodeState(nodeId: string, mastery: Mastery): StudentNodeState {
  return {
    student_id: "island-exam-test",
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= MASTERY_BAR ? "complete" : "in_progress",
    lesson_stage: mastery >= MASTERY_BAR ? "done" : "practice",
    last_practiced_at: null,
  };
}

function statesFor(eraId: EraId, mastered: number): StudentNodeState[] {
  return getEraNodes(eraId).map((nodeId, index) =>
    nodeState(nodeId, index < mastered ? MASTERY_BAR : 1),
  );
}

function diagnosticPasses(...eraIndexes: readonly number[]) {
  return eraIndexes.flatMap((index) =>
    (ERA_SEQUENCE[index]?.nodes ?? []).map((node_id) => ({
      node_id,
      placement_estimate: 2,
    })),
  );
}

const DIAGNOSTIC_PREFIX_CASES = [
  {
    name: "the first era is unmastered",
    evidence: diagnosticPasses(),
    unlocked: ERA_SEQUENCE.slice(0, 1).map((era) => era.id),
  },
  {
    name: "the first three eras are mastered and era four is the destination",
    evidence: diagnosticPasses(0, 1, 2),
    unlocked: ERA_SEQUENCE.slice(0, 4).map((era) => era.id),
  },
  {
    name: "later non-monotonic mastery does not jump the first gap",
    evidence: diagnosticPasses(0, 1, 2, 7),
    unlocked: ERA_SEQUENCE.slice(0, 4).map((era) => era.id),
  },
  {
    name: "all eras are mastered",
    evidence: diagnosticPasses(...ERA_SEQUENCE.map((_, index) => index)),
    unlocked: ERA_SEQUENCE.map((era) => era.id),
  },
  {
    name: "incomplete and unprobed evidence fails closed at era one",
    evidence: (ERA_SEQUENCE[0]?.nodes.slice(0, -1) ?? []).map((node_id) => ({
      node_id,
      placement_estimate: 2,
    })),
    unlocked: ERA_SEQUENCE.slice(0, 1).map((era) => era.id),
  },
] as const;

describe("diagnostic placement unlocks through the first unmastered era", () => {
  it.each(DIAGNOSTIC_PREFIX_CASES)("$name", ({ evidence, unlocked }) => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    const actual = diagnosticUnlockedEraPrefix(evidence);
    expect(actual).toEqual(unlocked);
    expect(actual).toEqual(ERA_SEQUENCE.slice(0, actual.length).map((era) => era.id));
    expect(actual.length).toBeGreaterThanOrEqual(1);
    expect(actual).not.toContain(ERA_SEQUENCE[actual.length]?.id);
  });
});

describe("island unlock eligibility", () => {
  it("keeps 79% locked and makes 80% ready", () => {
    expect(islandUnlockMasteryRequirement(100)).toBe(80);
    expect(79 >= islandUnlockMasteryRequirement(100)).toBe(false);
    expect(80 >= islandUnlockMasteryRequirement(100)).toBe(true);

    const fiveSkillEra = ERA_SEQUENCE.find((era) => era.nodes.length === 5);
    expect(
      fiveSkillEra,
      "the authored sequence needs a five-skill 80% boundary",
    ).toBeDefined();
    if (!fiveSkillEra) {
      return;
    }
    expect(
      islandUnlockEligibility(fiveSkillEra.id, statesFor(fiveSkillEra.id, 3)).eligible,
    ).toBe(false);
    expect(
      islandUnlockEligibility(fiveSkillEra.id, statesFor(fiveSkillEra.id, 4)).eligible,
    ).toBe(true);
  });

  it("counts only fully mastered skills on the current ERA_SEQUENCE island", () => {
    const current = ERA_SEQUENCE.find((era) => era.nodes.length === 5);
    const other = ERA_SEQUENCE.find((era) => era.id !== current?.id);
    expect(current).toBeDefined();
    expect(other).toBeDefined();
    if (!current || !other) {
      return;
    }

    const currentStates = statesFor(current.id, 3);
    const crossEra = other.nodes.map((nodeId) => nodeState(nodeId, 3));
    const eligibility = islandUnlockEligibility(current.id, [
      ...currentStates,
      ...crossEra,
    ]);

    expect(eligibility.mastered).toBe(3);
    expect(eligibility.total).toBe(current.nodes.length);
    expect(eligibility.required).toBe(4);
    expect(eligibility.eligible).toBe(false);
  });

  it("uses the repository's authoritative full-mastery bar", () => {
    expect(MASTERY_BAR).toBe(2);
    const era = ERA_SEQUENCE.find((entry) => entry.nodes.length === 5);
    expect(era).toBeDefined();
    if (!era) {
      return;
    }
    const almost = era.nodes.map((nodeId, index) =>
      nodeState(nodeId, index < 4 ? ((MASTERY_BAR - 1) as Mastery) : 3),
    );
    expect(islandUnlockEligibility(era.id, almost).mastered).toBe(1);
  });
});

describe("island unlock net-score exam", () => {
  it("sets the target to two times the island's skill count", () => {
    for (const era of ERA_SEQUENCE) {
      expect(islandUnlockTarget(era.nodes.length), era.id).toBe(2 * era.nodes.length);
      expect(initialIslandUnlockExamState(era.id).target, era.id).toBe(
        2 * era.nodes.length,
      );
    }
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
  });

  it("shows a minus one for a wrong answer at zero while the meter stays at zero", () => {
    const state = initialIslandUnlockExamState(ERA_SEQUENCE[0]?.id as EraId);
    const wrong = islandUnlockExamReducer(state, { type: "wrong" });

    expect(wrong.last_delta).toBe(-1);
    expect(wrong.score).toBe(0);
    expect(wrong.passed).toBe(false);
  });

  it("treats skip like a wrong answer and never lowers the meter below zero", () => {
    const state = initialIslandUnlockExamState(ERA_SEQUENCE[0]?.id as EraId);
    const skipped = islandUnlockExamReducer(state, { type: "skip" });

    expect(skipped.last_delta).toBe(-1);
    expect(skipped.score).toBe(0);
  });

  it("passes immediately on the answer that reaches the target", () => {
    let state = initialIslandUnlockExamState(ERA_SEQUENCE[0]?.id as EraId);
    for (let answer = 1; answer < state.target; answer += 1) {
      state = islandUnlockExamReducer(state, { type: "correct" });
      expect(state.passed, `answer ${answer} passed before target ${state.target}`).toBe(
        false,
      );
    }

    const passed = islandUnlockExamReducer(state, { type: "correct" });
    expect(passed.score).toBe(passed.target);
    expect(passed.last_delta).toBe(1);
    expect(passed.passed).toBe(true);
  });

  it("is inert after pass so a replay cannot award the unlock twice", () => {
    let state = initialIslandUnlockExamState(ERA_SEQUENCE[0]?.id as EraId);
    state = { ...state, score: state.target - 1 };
    const passed = islandUnlockExamReducer(state, { type: "correct" });

    expect(islandUnlockExamReducer(passed, { type: "correct" })).toBe(passed);
    expect(islandUnlockExamReducer(passed, { type: "wrong" })).toBe(passed);
  });
});
