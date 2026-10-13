import { describe, expect, it } from "vitest";

import { lessonCompleteGrant } from "./earn";
import { applyGrant } from "./grant";
import { appendEntries, computeMaterialBalances, materialBalanceOf } from "./ledger";
import {
  applyMaterialSpend,
  applyRepairSpend,
  buildEventIdFor,
  repairEventIdFor,
} from "./materialSpend";
import { EMPTY_LEDGER_VIEW, type LedgerView } from "./types";

const STUDENT = "s1";
const NOW = Date.parse("2026-07-29T12:00:00.000Z");

/** A ledger holding one era-one lesson payout: 100 stone, and nothing beside it. */
function withOneLesson(nodeId = "NUM.S"): LedgerView {
  const result = applyGrant(
    EMPTY_LEDGER_VIEW,
    lessonCompleteGrant({ studentId: STUDENT, nodeId, nowMs: NOW }),
  );
  return appendEntries(EMPTY_LEDGER_VIEW, result.rows);
}

describe("applyMaterialSpend — atomic", () => {
  it("debits the stockpile and returns the one row on a success", () => {
    const view = withOneLesson();
    const result = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "longhouse-12-7",
      material: "stone",
      cost: 80,
      nowMs: NOW,
    });
    expect(result.status).toBe("spent");
    expect(result.balance).toBe(20);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      resource_type: "stone",
      kind: "spend",
      amount: 80,
      reason_code: "build:longhouse-12-7",
    });
  });

  it("leaves the stockpile UNTOUCHED when it cannot afford the cost", () => {
    const view = withOneLesson();
    const result = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "longhouse-12-7",
      material: "stone",
      cost: 120,
      nowMs: NOW,
    });
    expect(result.status).toBe("insufficient_material");
    expect(result.balance).toBe(100);
    expect(result.rows).toEqual([]);
    // And the view itself is genuinely unchanged, not merely reported so.
    expect(materialBalanceOf(view, "stone")).toBe(100);
  });

  it("never mutates the input view, even on success", () => {
    const view = withOneLesson();
    const before = view.entries.length;
    applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "p",
      material: "stone",
      cost: 80,
      nowMs: NOW,
    });
    expect(view.entries).toHaveLength(before);
    expect(materialBalanceOf(view, "stone")).toBe(100);
  });

  it("rejects an empty stockpile without a row", () => {
    const result = applyMaterialSpend(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      placementId: "p",
      material: "stone",
      cost: 1,
      nowMs: NOW,
    });
    expect(result.status).toBe("insufficient_material");
    expect(result.balance).toBe(0);
  });

  it("spends the whole stockpile down to exactly zero", () => {
    const view = withOneLesson();
    const result = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "p",
      material: "stone",
      cost: 100,
      nowMs: NOW,
    });
    expect(result.status).toBe("spent");
    expect(result.balance).toBe(0);
  });
});

describe("applyMaterialSpend — idempotent on the placement", () => {
  it("reports already_spent on a replay and changes nothing", () => {
    let view = withOneLesson();
    const first = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "p1",
      material: "stone",
      cost: 80,
      nowMs: NOW,
    });
    view = appendEntries(view, first.rows);

    const replay = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "p1",
      material: "stone",
      cost: 80,
      nowMs: NOW + 1000,
    });
    expect(replay.status).toBe("already_spent");
    expect(replay.rows).toEqual([]);
    expect(replay.balance).toBe(20);
  });

  it("builds `build:<placement_id>` as the event id", () => {
    expect(buildEventIdFor("longhouse-12-7")).toBe("build:longhouse-12-7");
  });

  it("refuses a placement id carrying the delimiter", () => {
    expect(() => buildEventIdFor("a:b")).toThrow(/no ':'/);
  });
});

describe("applyMaterialSpend — the cost is a server seam, not a client price", () => {
  it("rejects a zero, negative, fractional or non-finite cost", () => {
    const view = withOneLesson();
    for (const cost of [0, -80, 12.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = applyMaterialSpend(view, {
        studentId: STUDENT,
        placementId: "p",
        material: "stone",
        cost,
        nowMs: NOW,
      });
      expect(result.status).toBe("invalid_cost");
      expect(result.rows).toEqual([]);
      expect(result.balance).toBe(100);
    }
  });
});

describe("a material spend touches ONE material's stockpile and no other", () => {
  it("debits the material it names and leaves every other stockpile alone", () => {
    // This asserted that a spend left the XP wallet untouched, over `computeBalances`.
    // XP is sunset and that projection is deleted, so the separation still worth
    // asserting is between the ten materials: a stone debit must not move grain.
    let view = withOneLesson();
    const before = computeMaterialBalances(view);
    const result = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "p",
      material: "stone",
      cost: 80,
      nowMs: NOW,
    });
    view = appendEntries(view, result.rows);
    const after = computeMaterialBalances(view);
    expect(after.stone).toBe(20);
    expect(before.stone).toBe(100);
    for (const key of Object.keys(after)) {
      if (key !== "stone") {
        expect(after[key as keyof typeof after], key).toBe(
          before[key as keyof typeof before],
        );
      }
    }
    expect(materialBalanceOf(view, "stone")).toBe(20);
  });

  it("keeps each material's stockpile separate", () => {
    let view = withOneLesson();
    // Only stone has been minted, so a grain spend cannot borrow against it.
    const result = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "p",
      material: "grain",
      cost: 10,
      nowMs: NOW,
    });
    expect(result.status).toBe("insufficient_material");
    view = appendEntries(view, result.rows);
    expect(materialBalanceOf(view, "stone")).toBe(100);
  });
});

/**
 * **REPAIR — the second subject, and the one whose idempotency key is not the thing repaired.**
 *
 * The failure floor (team lead, 2026-07-30) makes crisis damage recoverable, and recovery is a
 * SPEND. Every guarantee `applyMaterialSpend` carries is owed here too, and they are asserted
 * over this entry point rather than assumed from the shared `debitMaterial`: a shared helper
 * is an argument that they hold, and an assertion is why nobody has to take the argument on
 * trust.
 */
const RUIN = {
  studentId: STUDENT,
  damageId: "d1",
  subjectKind: "building",
  subject: "NUM.3",
  material: "stone",
  cost: 60,
  nowMs: NOW,
} as const;

describe("applyRepairSpend — atomic, like every other spend here", () => {
  it("debits the stockpile and writes one row naming the ruin", () => {
    const result = applyRepairSpend(withOneLesson(), RUIN);
    expect(result.status).toBe("spent");
    expect(result.balance).toBe(40);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      resource_type: "stone",
      kind: "spend",
      amount: 60,
      // The SUBJECT travels in the reason code, exactly as a build's placement does, so a
      // repair needs no new row field. And it is `repair:`, not `build:` — a repair that
      // read as a build would make the ledger claim the player bought a skill building,
      // which is what the floor forbids.
      reason_code: "repair:d1:building:NUM.3",
    });
  });

  it("leaves the stockpile UNTOUCHED when it cannot afford the repair", () => {
    const view = withOneLesson();
    const result = applyRepairSpend(view, { ...RUIN, cost: 120 });
    expect(result.status).toBe("insufficient_material");
    expect(result.balance).toBe(100);
    expect(result.rows).toEqual([]);
    expect(materialBalanceOf(view, "stone")).toBe(100);
  });

  it("refuses a broke player with nothing debited, so trying costs nothing", () => {
    // The property "a player with no material and a ruined city is never stuck" rests on
    // this: the attempt is free, so the only thing between them and a repaired city is
    // practice.
    const result = applyRepairSpend(EMPTY_LEDGER_VIEW, RUIN);
    expect(result.status).toBe("insufficient_material");
    expect(result.balance).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it("never mutates the input view", () => {
    const view = withOneLesson();
    // One row, where a lesson completion used to write two: the xp row went with the
    // 2026-08-03 sunset, so a completed lesson's whole footprint is its material.
    applyRepairSpend(view, RUIN);
    expect(view.entries).toHaveLength(1);
    expect(materialBalanceOf(view, "stone")).toBe(100);
  });

  it("rejects a nonsense price without a row", () => {
    const view = withOneLesson();
    for (const cost of [0, -60, 12.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = applyRepairSpend(view, { ...RUIN, cost });
      expect(result.status).toBe("invalid_cost");
      expect(result.rows).toEqual([]);
      expect(result.balance).toBe(100);
    }
  });

  it("debits only the material it is denominated in", () => {
    let view = withOneLesson();
    const result = applyRepairSpend(view, RUIN);
    view = appendEntries(view, result.rows);
    expect(computeMaterialBalances(view)).toEqual({ stone: 40 });
  });
});

describe("applyRepairSpend — idempotent per RUIN, not per building", () => {
  it("reports already_spent on a replay of the same ruin and changes nothing", () => {
    let view = withOneLesson();
    const first = applyRepairSpend(view, RUIN);
    view = appendEntries(view, first.rows);

    const replay = applyRepairSpend(view, { ...RUIN, nowMs: NOW + 1000 });
    expect(replay.status).toBe("already_spent");
    expect(replay.rows).toEqual([]);
    expect(replay.balance).toBe(40);
  });

  it("CHARGES AGAIN when the same building is ruined by a LATER crisis", () => {
    // The whole reason the damage id is in the key. Keyed on the building alone this second
    // repair would report `already_spent`, the state would clear for free, and a crisis
    // could never cost the same building twice.
    let view = withOneLesson();
    const first = applyRepairSpend(view, RUIN);
    view = appendEntries(view, first.rows);
    expect(materialBalanceOf(view, "stone")).toBe(40);

    const second = applyRepairSpend(view, { ...RUIN, damageId: "d2", cost: 40 });
    expect(second.status).toBe("spent");
    expect(second.balance).toBe(0);
    expect(second.rows[0]).toMatchObject({
      reason_code: "repair:d2:building:NUM.3",
    });
  });

  it("tells a building's repair apart from a ground cell's under one damage id", () => {
    // One crisis ruins a building AND the ground under it, and both are payable. Keyed on
    // the damage id alone they would be the same event and the second would be free.
    let view = withOneLesson();
    const building = applyRepairSpend(view, RUIN);
    view = appendEntries(view, building.rows);
    const ground = applyRepairSpend(view, {
      ...RUIN,
      subjectKind: "ground",
      subject: "4,0",
      cost: 3,
    });
    expect(ground.status).toBe("spent");
    expect(ground.balance).toBe(37);
    expect(ground.rows[0]).toMatchObject({ reason_code: "repair:d1:ground:4,0" });
  });

  it("builds `repair:<damage_id>:<kind>:<subject>` as the event id", () => {
    expect(
      repairEventIdFor({ damageId: "d1", subjectKind: "building", subject: "NUM.3" }),
    ).toBe("repair:d1:building:NUM.3");
    // A cell key contains a comma and no colon, so it is a legal part as written — which is
    // why the city can hand its own `"col,row"` key straight through.
    expect(
      repairEventIdFor({ damageId: "d12", subjectKind: "ground", subject: "-4,3" }),
    ).toBe("repair:d12:ground:-4,3");
  });

  it("refuses a subject or damage id carrying the delimiter", () => {
    for (const bad of [
      { damageId: "d:1", subjectKind: "building", subject: "NUM.3" },
      { damageId: "d1", subjectKind: "building", subject: "a:b" },
      { damageId: "", subjectKind: "building", subject: "NUM.3" },
    ] as const) {
      expect(() => repairEventIdFor(bad), JSON.stringify(bad)).toThrow(
        /non-empty and contain no ':'/,
      );
    }
  });

  it("keeps a repair's event id DISJOINT from a build's, whatever the subject", () => {
    // The two spends share one ledger, so a collision would make buying a placement and
    // repairing a ruin the same event — and whichever came second would be free.
    expect(
      repairEventIdFor({ damageId: "d1", subjectKind: "building", subject: "NUM.3" }),
    ).not.toBe(buildEventIdFor("NUM.3"));
    expect(buildEventIdFor("NUM.3").startsWith("build:")).toBe(true);
    expect(
      repairEventIdFor({
        damageId: "d1",
        subjectKind: "building",
        subject: "NUM.3",
      }).startsWith("repair:"),
    ).toBe(true);
  });
});
