import { getNodesByScope } from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { isNeighborhoodReady } from "./index";

function nodeState(nodeId: string, mastery: Mastery): StudentNodeState {
  return {
    student_id: "student-1",
    node_id: nodeId,
    placement_estimate: 0,
    mastery,
    mastery_updated_at: null,
    completion_status: mastery >= 2 ? "complete" : "in_progress",
    lesson_stage: "practice",
    last_practiced_at: null,
  };
}

describe("storm checkpoint eligibility", () => {
  it("requires every D1 MVP node to be mastered", () => {
    const states = getNodesByScope("mvp").map((node) => nodeState(node.id, 2));

    expect(isNeighborhoodReady("D1", states)).toBe(true);
    expect(isNeighborhoodReady("D1", states.slice(1))).toBe(false);
  });
});
