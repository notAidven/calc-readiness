import { describe, expect, it } from "vitest";

import { lessonCompleteEventId } from "./events";
import { applyGrant } from "./grant";
import {
  appendEntries,
  computeMaterialBalances,
  hasEvent,
  materialBalanceOf,
} from "./ledger";
import { applyMaterialSpend, buildEventIdFor } from "./materialSpend";
import { EMPTY_LEDGER_VIEW, type LedgerView } from "./types";

const STUDENT = "s1";
const NOW = Date.UTC(2026, 0, 1);

/**
 * **`computeBalances` AND `purchasedCosmeticIds` WERE THE OTHER HALF OF THIS FILE.** The
 * first projected the ledger's non-material rows, which since the gold-drop meant XP
 * alone; the second read ownership off the `cosmetic_id` column. Both are deleted with
 * the sunset, and the spend that drove them here — a cosmetic purchase — is now a civic
 * placement, which is the debit the game actually has.
 */

describe("computeMaterialBalances — reconstructable from the ledger (§5.3)", () => {
  it("balance == sum(grants) - sum(spends) per material, and stays >= 0", () => {
    let view: LedgerView = EMPTY_LEDGER_VIEW;
    const grant = applyGrant(view, {
      studentId: STUDENT,
      eventId: lessonCompleteEventId("seed"),
      reasonCode: "lesson_complete",
      amounts: { stone: 60 },
      nowMs: NOW,
      capped: false,
    });
    view = appendEntries(view, grant.rows);

    const spend = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: "civic:prehistoric_longhouse:0",
      material: "stone",
      cost: 20,
      nowMs: NOW,
    });
    expect(spend.status).toBe("spent");
    view = appendEntries(view, spend.rows);

    expect(materialBalanceOf(view, "stone")).toBe(40); // 60 - 20
    expect(materialBalanceOf(view, "stone")).toBeGreaterThanOrEqual(0);
    // The whole read model, so a second projection reappearing beside it fails here.
    expect(computeMaterialBalances(view)).toEqual({ stone: 40 });
  });

  it("hasEvent reflects recorded rows, for a grant and for a spend alike", () => {
    let view = EMPTY_LEDGER_VIEW;
    const grant = applyGrant(view, {
      studentId: STUDENT,
      eventId: lessonCompleteEventId("NUM.F"),
      reasonCode: "lesson_complete",
      amounts: { stone: 60 },
      nowMs: NOW,
      capped: false,
    });
    view = appendEntries(view, grant.rows);
    expect(hasEvent(view, lessonCompleteEventId("NUM.F"))).toBe(true);
    expect(hasEvent(view, "nope")).toBe(false);

    const placement = "civic:prehistoric_longhouse:1";
    const spend = applyMaterialSpend(view, {
      studentId: STUDENT,
      placementId: placement,
      material: "stone",
      cost: 20,
      nowMs: NOW,
    });
    view = appendEntries(view, spend.rows);
    expect(hasEvent(view, buildEventIdFor(placement))).toBe(true);
  });

  it("holds an untouched material at zero rather than at undefined", () => {
    const grant = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: lessonCompleteEventId("NUM.F"),
      reasonCode: "lesson_complete",
      amounts: { stone: 60 },
      nowMs: NOW,
      capped: false,
    });
    const view = appendEntries(EMPTY_LEDGER_VIEW, grant.rows);
    expect(materialBalanceOf(view, "grain")).toBe(0);
    // SPARSE by design: the absent key is what `materialBalanceOf` exists to read past.
    expect("grain" in computeMaterialBalances(view)).toBe(false);
  });
});
