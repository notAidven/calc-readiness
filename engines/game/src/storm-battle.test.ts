import { describe, expect, it } from "vitest";

import { gradeStorm } from "./storm";
import {
  createStormBattle,
  currentStormPrompt,
  isStormBattleComplete,
  recordStormAnswer,
  type StormPromptCandidate,
  selectStormPrompts,
  stormBattleProgress,
  toStormSubmission,
} from "./storm-battle";

/** Deterministic mulberry32 RNG so prompt selection is reproducible in tests. */
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/** A pool of `perNode` candidates for each of the six D1 nodes. */
function samplePool(perNode = 3): StormPromptCandidate[] {
  const pool: StormPromptCandidate[] = [];
  for (const node of D1_NODES) {
    for (let i = 0; i < perNode; i += 1) {
      pool.push({
        item_version_id: `${node}-${i}`,
        node_id: node,
        prompt: `${node} prompt ${i}`,
      });
    }
  }
  return pool;
}

describe("selectStormPrompts", () => {
  it("draws the default 5 prompts spread across distinct mastered nodes", () => {
    const prompts = selectStormPrompts(samplePool(), {
      masteredNodeIds: [...D1_NODES],
      rng: seededRng(1),
    });

    expect(prompts).toHaveLength(5);
    expect(new Set(prompts.map((p) => p.node_id)).size).toBe(5);
  });

  it("is deterministic for a given seed", () => {
    const options = { masteredNodeIds: [...D1_NODES], itemCount: 4 };
    const a = selectStormPrompts(samplePool(), { ...options, rng: seededRng(42) });
    const b = selectStormPrompts(samplePool(), { ...options, rng: seededRng(42) });
    expect(a.map((p) => p.item_version_id)).toEqual(b.map((p) => p.item_version_id));
  });

  it("only samples mastered nodes and round-robins them", () => {
    const prompts = selectStormPrompts(samplePool(), {
      masteredNodeIds: ["NUM.S", "NUM.F"],
      itemCount: 5,
      rng: seededRng(7),
    });

    expect(prompts).toHaveLength(5);
    expect(prompts.every((p) => p.node_id === "NUM.S" || p.node_id === "NUM.F")).toBe(true);
    // 5 across 2 nodes round-robin -> 3 + 2.
    const fromS = prompts.filter((p) => p.node_id === "NUM.S").length;
    expect(fromS).toBe(3);
  });

  it("returns fewer than requested when the eligible pool is thin (no throw)", () => {
    const thin: StormPromptCandidate[] = [
      { item_version_id: "NUM.S-0", node_id: "NUM.S", prompt: "only one" },
      { item_version_id: "NUM.S-1", node_id: "NUM.S", prompt: "and two" },
    ];
    const prompts = selectStormPrompts(thin, {
      masteredNodeIds: ["NUM.S"],
      itemCount: 5,
      rng: seededRng(3),
    });
    expect(prompts).toHaveLength(2);
  });
});

describe("storm battle round", () => {
  const prompts = selectStormPrompts(samplePool(), {
    masteredNodeIds: [...D1_NODES],
    rng: seededRng(11),
  });

  it("walks prompt-by-prompt then reports complete", () => {
    let state = createStormBattle({
      neighborhood_id: "D1",
      prompts,
      started_at_ms: 0,
    });

    expect(currentStormPrompt(state)).toEqual(prompts[0]);
    expect(isStormBattleComplete(state)).toBe(false);

    for (let i = 0; i < prompts.length; i += 1) {
      state = recordStormAnswer(state, i < 4);
    }

    expect(isStormBattleComplete(state)).toBe(true);
    expect(currentStormPrompt(state)).toBeNull();
    const progress = stormBattleProgress(state);
    expect(progress).toEqual({ answered: 5, total: 5, correct: 4 });
  });

  it("folds into a submission that gradeStorm clears at 4/5 within time", () => {
    let state = createStormBattle({
      neighborhood_id: "D1",
      prompts,
      started_at_ms: 1_000,
      timer_budget_ms: 90_000,
    });
    for (let i = 0; i < prompts.length; i += 1) {
      state = recordStormAnswer(state, i < 4);
    }

    const submission = toStormSubmission(state, 31_000);
    expect(submission).toEqual({
      neighborhood_id: "D1",
      item_count: 5,
      correct_count: 4,
      time_remaining_ms: 60_000,
    });

    const result = gradeStorm(submission);
    expect(result.cleared).toBe(true);
    expect(result.writes_checkpoint).toBe(true);
    expect(result.speed_bonus_ratio).toBeCloseTo(60_000 / 90_000);
  });

  it("clamps an expired soft timer to zero remaining (still clears, no bonus)", () => {
    let state = createStormBattle({
      neighborhood_id: "D1",
      prompts,
      started_at_ms: 0,
      timer_budget_ms: 90_000,
    });
    for (let i = 0; i < prompts.length; i += 1) {
      state = recordStormAnswer(state, true);
    }

    const submission = toStormSubmission(state, 999_999);
    expect(submission.time_remaining_ms).toBe(0);

    const result = gradeStorm(submission);
    expect(result.cleared).toBe(true);
    expect(result.speed_bonus_ratio).toBe(0);
  });

  it("a miss below 80% does not write the checkpoint", () => {
    let state = createStormBattle({ neighborhood_id: "D1", prompts, started_at_ms: 0 });
    for (let i = 0; i < prompts.length; i += 1) {
      state = recordStormAnswer(state, i < 2);
    }
    const result = gradeStorm(toStormSubmission(state, 1_000));
    expect(result.cleared).toBe(false);
    expect(result.writes_checkpoint).toBe(false);
  });
});
