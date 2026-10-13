import { describe, expect, it } from "vitest";

import { capMaxFor } from "./cap";
import { CAP, EARN, REASON_ERA_ADVANCE_PREFIX } from "./constants";
import { lessonCompleteEventId } from "./events";
import { applyGrant } from "./grant";
import { appendEntries } from "./ledger";
import { lessonMaterialAmount } from "./materials";
import { ECONOMY_RESOURCES, EMPTY_LEDGER_VIEW, MATERIAL_IDS } from "./types";

/** Era one's per-lesson material: the 600 era total over its 6 nodes. */
const LESSON_MATERIAL = lessonMaterialAmount("prehistoric");

const STUDENT = "s1";
const NOW = Date.UTC(2026, 0, 1);

/**
 * **THIS FILE USED TO BE ABOUT TWO RESOURCES SHARING ONE EVENT ID.** A lesson completion
 * wrote three rows while gold existed and two while XP did (`xp` + the era material), and
 * half the assertions here were that the two projections — the wallet and the stockpile —
 * could not leak into each other.
 *
 * XP is sunset (2026-08-03), so one lesson completion is ONE row and there is one
 * projection. The multi-row guarantee is still real and still worth asserting, because an
 * era-advance carry-forward writes both legs under one `era_advance:<era_id>` id, so that
 * is what exercises it here now.
 */

function lessonCompleteInput(nodeId: string) {
  return {
    studentId: STUDENT,
    eventId: lessonCompleteEventId(nodeId),
    reasonCode: "lesson_complete",
    amounts: { stone: LESSON_MATERIAL },
    nowMs: NOW,
    capped: false,
  };
}

describe("applyGrant — idempotency", () => {
  it("replaying the same event_id is a no-op (applied:false, no double-credit)", () => {
    const first = applyGrant(EMPTY_LEDGER_VIEW, lessonCompleteInput("NUM.F"));
    expect(first.applied).toBe(true);
    expect(first.rows).toHaveLength(1);

    const afterFirst = appendEntries(EMPTY_LEDGER_VIEW, first.rows);
    const replay = applyGrant(afterFirst, lessonCompleteInput("NUM.F"));

    expect(replay.applied).toBe(false);
    expect(replay.rows).toHaveLength(0);
    expect(replay.materials).toEqual(first.materials);
    expect(replay.materials).toEqual({ stone: LESSON_MATERIAL });
  });

  it("distinct event ids each apply", () => {
    const lesson = applyGrant(EMPTY_LEDGER_VIEW, lessonCompleteInput("NUM.F"));
    const withLesson = appendEntries(EMPTY_LEDGER_VIEW, lesson.rows);
    const second = applyGrant(withLesson, lessonCompleteInput("NUM.2"));
    expect(second.applied).toBe(true);
    expect(second.materials.stone).toBe(LESSON_MATERIAL * 2);
  });
});

describe("applyGrant — one atomic multi-row grant (D-R9)", () => {
  it("writes both legs of an era advance as two rows under one event_id", () => {
    // The multi-row guarantee, exercised by the one event that still needs it. A lesson
    // completion was the fixture for this while it credited xp beside its material.
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: `${REASON_ERA_ADVANCE_PREFIX}neolithic`,
      reasonCode: `${REASON_ERA_ADVANCE_PREFIX}neolithic`,
      amounts: { stone: 40, grain: 10 },
      nowMs: NOW,
      capped: false,
    });
    expect(result.rows).toHaveLength(2);
    expect(new Set(result.rows.map((r) => r.event_id)).size).toBe(1);
    expect(result.rows.map((r) => r.resource_type)).toEqual(["stone", "grain"]);
    expect(result.rows.every((r) => r.kind === "grant")).toBe(true);
  });

  it("orders rows by the declared resource order, not by the caller's key order", () => {
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: `${REASON_ERA_ADVANCE_PREFIX}bronze_age`,
      reasonCode: `${REASON_ERA_ADVANCE_PREFIX}bronze_age`,
      // Deliberately the reverse of era order, so a pass would be impossible if the loop
      // walked `Object.keys(amounts)`.
      amounts: { bronze: 5, grain: 10 },
      nowMs: NOW,
      capped: false,
    });
    expect(result.rows.map((row) => row.resource_type)).toEqual(["grain", "bronze"]);
    // And the order it walks is the whole material ladder, in era order.
    expect(ECONOMY_RESOURCES).toEqual(MATERIAL_IDS);
  });
});

describe("applyGrant — the per-set cap (D-R6: repeatable source only)", () => {
  it("clamps a capped (interleaved) grant to one set's allowance", () => {
    const overCapMaterial = CAP.maxMaterial + 50;
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "interleaved:sess-1",
      reasonCode: "interleaved",
      amounts: { stone: overCapMaterial },
      nowMs: NOW,
    });
    expect(result.applied).toBe(true);
    expect(result.grantedMaterials.stone).toBe(CAP.maxMaterial);
  });

  it("does NOT cap the one-time lesson grant, even far above the cap", () => {
    const huge = CAP.maxMaterial + 1000;
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: lessonCompleteEventId("NUM.5"),
      reasonCode: "lesson_complete",
      amounts: { stone: huge },
      nowMs: NOW,
      capped: false,
    });
    expect(result.grantedMaterials.stone).toBe(huge);
  });

  it("reads the cap off the reason code, not just off the explicit flag", () => {
    // `capped` omitted, so `isCappedReason` decides — and an over-request is still
    // clamped, which is what proves the default is live rather than decorative.
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "interleaved:sess-2",
      reasonCode: "interleaved",
      amounts: { stone: capMaxFor("stone") + 1 },
      nowMs: NOW,
    });
    expect(result.grantedMaterials.stone).toBe(capMaxFor("stone"));
    expect(capMaxFor("stone")).toBe(CAP.maxMaterial);
  });
});

describe("applyGrant — a grant that credits nothing is not applied", () => {
  it("skips zero and absent resources", () => {
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "lesson_complete:NUM.F",
      reasonCode: "lesson_complete",
      amounts: { stone: LESSON_MATERIAL, grain: 0 },
      nowMs: NOW,
      capped: false,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.resource_type).toBe("stone");
  });

  it("reports an EMPTY amounts record as unapplied, writing no row", () => {
    // A real input since the sunset: a drill set past the era's bound, and a grant in an
    // era whose material nobody has authored, both arrive here with `{}`. It used to be
    // unreachable for the drill, which always had an xp key to fall back on.
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "interleaved:spent",
      reasonCode: "interleaved",
      amounts: {},
      nowMs: NOW,
    });
    expect(result.applied).toBe(false);
    expect(result.rows).toEqual([]);
    expect(result.grantedMaterials).toEqual({});
  });
});

describe("applyGrant — the era material is the only thing a row can hold", () => {
  it("reports the material on a replay as a balance, never as a fresh credit", () => {
    const first = applyGrant(EMPTY_LEDGER_VIEW, {
      ...lessonCompleteInput("NUM.F"),
      amounts: { stone: 100 },
    });
    const view = appendEntries(EMPTY_LEDGER_VIEW, first.rows);
    const replay = applyGrant(view, {
      ...lessonCompleteInput("NUM.F"),
      amounts: { stone: 100 },
    });
    expect(replay.applied).toBe(false);
    expect(replay.grantedMaterials).toEqual({});
    expect(replay.materials).toEqual({ stone: 100 });
  });

  it("CAPS a material on a capped reason, where it used to throw", () => {
    // This asserted a fail-loud THROW until the gold-drop, and the throw was correct
    // at the time: `CAP.max` was keyed on `ResourceType`, so it had no material ceiling
    // to clamp against and admitting one would have been silently uncapped forever.
    // `capMaxFor` now authors that ceiling, and practice pays the material and nothing
    // else — so the fence would have thrown on the one recipe it was protecting.
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "interleaved:sess-1",
      reasonCode: "interleaved",
      amounts: { stone: EARN.interleaved.material },
      nowMs: NOW,
      capped: true,
    });
    expect(result.applied).toBe(true);
    expect(result.grantedMaterials.stone).toBe(EARN.interleaved.material);
  });
});
