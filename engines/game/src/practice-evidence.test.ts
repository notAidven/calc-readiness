import type { StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { hasPracticeEvidence } from "./practice-evidence";

function nodeState(over: Partial<StudentNodeState> = {}): StudentNodeState {
  return {
    student_id: "s",
    node_id: "NUM.S",
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

describe("hasPracticeEvidence", () => {
  it("is exactly `last_practiced_at !== null`, the canonical signal", () => {
    expect(hasPracticeEvidence(nodeState({ last_practiced_at: null }))).toBe(false);
    expect(
      hasPracticeEvidence(nodeState({ last_practiced_at: "2026-07-01T12:00:00.000Z" })),
    ).toBe(true);
  });

  it("reads FALSE on the city's test-out pre-build (mastery 0, done, complete)", () => {
    // Both test-out write paths (`seedFromPlacement` and the `placeSkill` server-path
    // pre-build) write exactly this shape before a single item is answered, so no
    // other field can be used to tell it from a practised finish.
    expect(
      hasPracticeEvidence(
        nodeState({
          mastery: 0,
          lesson_stage: "done",
          completion_status: "complete",
          last_practiced_at: null,
        }),
      ),
    ).toBe(false);
  });

  it("treats a missing row as no evidence rather than throwing", () => {
    // The city view model asks about nodes with no `student_node_state` row at all.
    expect(hasPracticeEvidence(undefined)).toBe(false);
    expect(hasPracticeEvidence(null)).toBe(false);
  });
});
