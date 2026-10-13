import { MASTERY_CORRECT_COUNT, PRACTICE_SET_SIZE } from "@cr/mastery-service";
import type {
  LessonStage,
  Mastery,
  PlacementEstimate,
  StudentNodeState,
} from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  type ConstructionState,
  deriveBlueprint,
  deriveConstructionState,
  masteryProgress,
  type NodeProgressInput,
  toBuildingProgress,
} from "./construction";

function progress(
  mastery: Mastery,
  lesson_stage: LessonStage,
  placement_estimate: PlacementEstimate = 0,
): NodeProgressInput {
  return { mastery, lesson_stage, placement_estimate };
}

describe("deriveConstructionState", () => {
  it("checks mastery before lesson_stage (mastered/gold collapses to complete)", () => {
    // The built variants collapse into a single Complete stage; mastery 2 or 3 both
    // read complete and the exact score rides on top as MasteryStars.
    expect(deriveConstructionState(progress(3, "not_started"))).toBe("complete");
    expect(deriveConstructionState(progress(2, "not_started"))).toBe("complete");
    // The "mastery>=2 but lesson_stage not done" contradiction still reads complete.
    expect(deriveConstructionState(progress(2, "teaching"))).toBe("complete");
  });

  it("maps the 3-step progression from lesson_stage when mastery < 2", () => {
    // Complete = practice set finished (`done`), regardless of the score (even 0/1).
    expect(deriveConstructionState(progress(1, "done"))).toBe("complete");
    expect(deriveConstructionState(progress(0, "done"))).toBe("complete");
    // Construction = in the practice set (CFU passed, practice begun).
    expect(deriveConstructionState(progress(1, "practice"))).toBe("practice");
    expect(deriveConstructionState(progress(0, "practice"))).toBe("practice");
    // Foundation = placed + mid-teaching, or freshly placed (both render a site).
    expect(deriveConstructionState(progress(0, "teaching"))).toBe("teaching");
    expect(deriveConstructionState(progress(0, "not_started"))).toBe("not_started");
  });

  it("degrades a not-authoring-complete node to a permanent preview", () => {
    expect(
      deriveConstructionState(progress(0, "not_started"), {
        authoring_complete: false,
      }),
    ).toBe("preview");
    // Preview wins even if a lesson has progressed: the node can never complete.
    expect(
      deriveConstructionState(progress(1, "practice"), { authoring_complete: false }),
    ).toBe("preview");
  });

  it("reaches every derived construction state (built variants collapse to complete)", () => {
    const seen = new Set<ConstructionState>([
      deriveConstructionState(progress(3, "done")), // mastered -> complete
      deriveConstructionState(progress(2, "done")), // mastered -> complete
      deriveConstructionState(progress(1, "done")), // practice finished -> complete
      deriveConstructionState(progress(0, "practice")), // Construction
      deriveConstructionState(progress(0, "teaching")), // Foundation (mid-lesson)
      deriveConstructionState(progress(0, "not_started")), // Foundation
      deriveConstructionState(progress(0, "not_started"), {
        authoring_complete: false,
      }),
    ]);

    // The legacy `gold`/`unfinished` variants are never derived now — the built
    // variants collapse into one Complete stage (mastery shows as stars on top).
    expect(seen).toEqual(
      new Set(["complete", "practice", "teaching", "not_started", "preview"]),
    );
  });
});

describe("deriveBlueprint", () => {
  it("sizes the ghost by placement, monotonic and never zero", () => {
    expect(deriveBlueprint(progress(0, "not_started", 0)).height).toBe(1);
    expect(deriveBlueprint(progress(0, "not_started", 3)).height).toBe(4);
    expect(deriveBlueprint(progress(0, "not_started", 1)).height).toBeLessThan(
      deriveBlueprint(progress(0, "not_started", 2)).height,
    );
  });

  it("test-out: placement alone never pre-builds, but a passed node pre-seeded to mastery 2 derives complete", () => {
    // Placement is orthogonal to mastery: a high placement with mastery 0 (a FAILED
    // node, 0/1) stays not_started with a full ghost — the derivation keys off
    // mastery, so placement never *directly* pre-builds.
    const failed = deriveBlueprint(progress(0, "not_started", 1));
    expect(failed.prominence).toBe("full");
    expect(failed.visible).toBe(true);
    expect(deriveConstructionState(progress(0, "not_started", 1))).toBe("not_started");

    // Under the test-out amendment (docs PR #36) the city session pre-seeds a
    // PASSED node (placement >= 2) to mastery 2, so its building derives complete
    // and the ghost hides — pre-built without a lesson. Placement + mastery move
    // together only because the session set both; the rule below is unchanged.
    const passed = deriveBlueprint(progress(2, "done", 2));
    expect(deriveConstructionState(progress(2, "done", 2))).toBe("complete");
    expect(passed.prominence).toBe("hidden");
    expect(passed.visible).toBe(false);
  });

  it("fades once construction begins and hides once complete", () => {
    expect(deriveBlueprint(progress(0, "teaching")).prominence).toBe("fading");
    expect(deriveBlueprint(progress(1, "practice")).prominence).toBe("fading");

    const complete = deriveBlueprint(progress(2, "done"));
    expect(complete.prominence).toBe("hidden");
    expect(complete.visible).toBe(false);
    expect(deriveBlueprint(progress(3, "done")).visible).toBe(false);
  });
});

describe("masteryProgress", () => {
  it("reuses the frozen 4-of-5 constants and stays legible", () => {
    const value = masteryProgress("unfinished", { mastery: 1, practiced: true });
    expect(value.required_correct).toBe(MASTERY_CORRECT_COUNT);
    expect(value.set_size).toBe(PRACTICE_SET_SIZE);
    expect(value.label).toContain("4 of 5");
  });

  it("claims 4 of 5 correct on a Complete node ONLY once the practice earned it", () => {
    // Practised to the bar: the score is real, so it is stated flatly.
    const earned = masteryProgress("complete", { mastery: 2, practiced: true });
    expect(earned.label).toBe("4 of 5 correct");

    // TESTED OUT (issue #103) — pre-built to `done` at mastery 0 with no practice
    // evidence. The learner answered zero items, so the label must not assert a
    // score; it names the diagnostic and leaves 4 of 5 as a target.
    const testedOut = masteryProgress("complete", { mastery: 0, practiced: false });
    expect(testedOut.label).toMatch(/^Tested out on the diagnostic, no practice yet/);
    expect(testedOut.label).toContain("earns its mastery stars");
    expect(testedOut.label).not.toBe("4 of 5 correct");
    expect(testedOut.label).not.toMatch(/4 of 5 correct$/);

    // A genuine BELOW-BAR finish (practised, mastery 1) is equally not 4 of 5.
    const belowBar = masteryProgress("complete", { mastery: 1, practiced: true });
    expect(belowBar.label).toMatch(/^Practice set finished/);
    expect(belowBar.label).not.toMatch(/4 of 5 correct$/);

    // Gold is only ever reached through the practice set, so it keeps its score.
    expect(masteryProgress("gold", { mastery: 3, practiced: true }).label).toBe(
      "5 of 5 correct",
    );
  });

  it("keeps the internal node id out of every label", () => {
    // The roster deliberately hides `NUM.*`; this label used to reintroduce it into
    // the announcements, and its subject was redundant with the state label that
    // precedes it there anyway.
    const states: ConstructionState[] = [
      "preview",
      "not_started",
      "teaching",
      "practice",
      "unfinished",
      "complete",
      "gold",
    ];
    for (const state of states) {
      for (const practiced of [true, false]) {
        const { label } = masteryProgress(state, { mastery: 0, practiced });
        expect(label).not.toMatch(/NUM\./);
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("toBuildingProgress (preserved contract)", () => {
  it("maps mastery to complete/gold", () => {
    const state: StudentNodeState = {
      student_id: "s",
      node_id: "NUM.S",
      placement_estimate: 1,
      mastery: 3,
      mastery_updated_at: null,
      completion_status: "complete",
      lesson_stage: "done",
      last_practiced_at: null,
    };

    expect(toBuildingProgress(state)).toEqual({
      node_id: "NUM.S",
      mastery: 3,
      complete: true,
      gold: true,
    });
  });
});
