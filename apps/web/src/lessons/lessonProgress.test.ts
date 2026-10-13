/**
 * The completion rule the domain drill gates on. The case that matters is mastery 0 with
 * everything else looking finished: a diagnostic test-out marks a node `complete`/`done`
 * without the learner ever practicing it, so anything but the mastery read would let an
 * untaught skill into an unhinted drill.
 */

import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { completedNodeIdsFrom, PRACTICED_MASTERY } from "./lessonProgress";

function nodeState(node_id: string, mastery: Mastery): StudentNodeState {
  return {
    student_id: "00000000-0000-0000-0000-000000000001",
    node_id,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    // Deliberately the "finished" shape a test-out leaves behind.
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: null,
  };
}

describe("completedNodeIdsFrom", () => {
  it("keeps every node that has scored a practice set", () => {
    expect(
      completedNodeIdsFrom([
        nodeState("NUM.1", 1),
        nodeState("NUM.2", 2),
        nodeState("NUM.3", 3),
      ]),
    ).toEqual(["NUM.1", "NUM.2", "NUM.3"]);
  });

  it("drops nodes at mastery 0 even when they look complete", () => {
    expect(completedNodeIdsFrom([nodeState("NUM.1", 0), nodeState("NUM.2", 1)])).toEqual([
      "NUM.2",
    ]);
  });

  it("returns nothing for an empty session", () => {
    expect(completedNodeIdsFrom([])).toEqual([]);
  });

  it("treats the first scored set as the unlock threshold", () => {
    expect(PRACTICED_MASTERY).toBe(1);
  });
});
