import { getNodesByScope } from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_STORM_ITEM_COUNT,
  gradeStorm,
  initialStormMachineState,
  isStormUnlocked,
  stormClears,
  stormReducer,
  stormRequiredCorrect,
  stormSpeedBonusRatio,
} from "./storm";

function d1States(mastery: Mastery): StudentNodeState[] {
  return getNodesByScope("mvp").map((node) => ({
    student_id: "s",
    node_id: node.id,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= 2 ? "complete" : "in_progress",
    lesson_stage: "practice",
    last_practiced_at: null,
  }));
}

describe("storm eligibility", () => {
  it("locks until every D1 node is mastered (>= 2)", () => {
    expect(isStormUnlocked("D1", d1States(2))).toBe(true);
    expect(isStormUnlocked("D1", d1States(1))).toBe(false);
    expect(isStormUnlocked("D1", d1States(2).slice(1))).toBe(false);
  });
});

describe("clear threshold", () => {
  it("needs 4 of 5 at the default size (floating-point safe)", () => {
    expect(stormRequiredCorrect(DEFAULT_STORM_ITEM_COUNT)).toBe(4);
    expect(stormRequiredCorrect(10)).toBe(8);
    expect(stormRequiredCorrect(3)).toBe(3);
  });

  it("clears at >= 80% only", () => {
    expect(stormClears(4, 5)).toBe(true);
    expect(stormClears(5, 5)).toBe(true);
    expect(stormClears(3, 5)).toBe(false);
  });

  it("rejects impossible counts", () => {
    expect(() => stormClears(6, 5)).toThrow();
  });
});

describe("soft timer bonus", () => {
  it("scales with remaining time and clamps to [0, 1]", () => {
    expect(stormSpeedBonusRatio(90_000, 90_000)).toBe(1);
    expect(stormSpeedBonusRatio(45_000, 90_000)).toBeCloseTo(0.5);
    expect(stormSpeedBonusRatio(0, 90_000)).toBe(0);
    expect(stormSpeedBonusRatio(120_000, 90_000)).toBe(1);
    expect(stormSpeedBonusRatio(5_000, 0)).toBe(0);
  });
});

describe("gradeStorm", () => {
  it("clears at 4/5 and awards a speed bonus when time remains", () => {
    const result = gradeStorm({
      neighborhood_id: "D1",
      item_count: 5,
      correct_count: 4,
      time_remaining_ms: 90_000,
    });

    expect(result.cleared).toBe(true);
    expect(result.required_correct).toBe(4);
    expect(result.speed_bonus_ratio).toBe(1);
    expect(result.writes_checkpoint).toBe(true);
    expect(result.can_retry).toBe(true);
  });

  it("still clears after the timer expires, with zero speed bonus (no loss)", () => {
    const result = gradeStorm({
      neighborhood_id: "D1",
      item_count: 5,
      correct_count: 5,
      time_remaining_ms: 0,
    });

    expect(result.cleared).toBe(true);
    expect(result.speed_bonus_ratio).toBe(0);
  });

  it("fails below 80% with no checkpoint write but allows retry", () => {
    const result = gradeStorm({
      neighborhood_id: "D1",
      item_count: 5,
      correct_count: 3,
      time_remaining_ms: 90_000,
    });

    expect(result.cleared).toBe(false);
    expect(result.writes_checkpoint).toBe(false);
    expect(result.speed_bonus_ratio).toBe(0);
    expect(result.can_retry).toBe(true);
  });

  it("fails closed on invalid input", () => {
    expect(() =>
      gradeStorm({
        neighborhood_id: "D1",
        item_count: 5,
        correct_count: 9,
        time_remaining_ms: 0,
      }),
    ).toThrow();
    expect(() =>
      gradeStorm({
        neighborhood_id: "D1",
        item_count: 0,
        correct_count: 0,
        time_remaining_ms: 0,
      }),
    ).toThrow();
    expect(() =>
      gradeStorm({
        neighborhood_id: "D1",
        item_count: 5,
        correct_count: 4,
        time_remaining_ms: -1,
      }),
    ).toThrow();
  });
});

describe("storm state machine", () => {
  it("is locked until ready, then ready, then cleared", () => {
    expect(initialStormMachineState({ node_states: d1States(1) }).phase).toBe("locked");
    expect(initialStormMachineState({ node_states: d1States(2) }).phase).toBe("ready");
    expect(
      initialStormMachineState({ node_states: d1States(2), checkpoint_cleared: true })
        .phase,
    ).toBe("cleared");
  });

  it("runs ready -> in_progress -> cleared and sets the checkpoint", () => {
    let state = initialStormMachineState({ node_states: d1States(2) });
    state = stormReducer(state, { type: "start" });
    expect(state.phase).toBe("in_progress");

    state = stormReducer(state, {
      type: "submit",
      submission: {
        neighborhood_id: "D1",
        item_count: 5,
        correct_count: 4,
        time_remaining_ms: 90_000,
      },
    });

    expect(state.phase).toBe("cleared");
    expect(state.checkpoint_cleared).toBe(true);
    expect(state.last_result?.cleared).toBe(true);
  });

  it("fails with no loss and retries immediately", () => {
    let state = initialStormMachineState({ node_states: d1States(2) });
    state = stormReducer(state, { type: "start" });
    state = stormReducer(state, {
      type: "submit",
      submission: {
        neighborhood_id: "D1",
        item_count: 5,
        correct_count: 2,
        time_remaining_ms: 90_000,
      },
    });

    expect(state.phase).toBe("failed");
    expect(state.checkpoint_cleared).toBe(false);

    state = stormReducer(state, { type: "retry" });
    expect(state.phase).toBe("ready");
  });

  it("cannot start while locked but a cleared storm can replay", () => {
    const locked = initialStormMachineState({ node_states: d1States(1) });
    expect(stormReducer(locked, { type: "start" }).phase).toBe("locked");

    const cleared = initialStormMachineState({
      node_states: d1States(2),
      checkpoint_cleared: true,
    });
    expect(stormReducer(cleared, { type: "start" }).phase).toBe("in_progress");
  });

  it("ignores a submit unless an attempt is in progress", () => {
    const ready = initialStormMachineState({ node_states: d1States(2) });
    const after = stormReducer(ready, {
      type: "submit",
      submission: {
        neighborhood_id: "D1",
        item_count: 5,
        correct_count: 5,
        time_remaining_ms: 0,
      },
    });

    expect(after).toEqual(ready);
  });
});
