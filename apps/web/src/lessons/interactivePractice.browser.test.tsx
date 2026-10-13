import type { NumberLinePayload } from "@cr/components";
import { canonicalInteractivePayload } from "@cr/components";
import type { FrozenItem } from "@cr/item-bank";
import { MASTERY_CORRECT_COUNT, PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { describe, expect, it } from "vitest";

import {
  checkerVersionForItem,
  practiceChecker,
  practiceItemsById,
} from "./practiceChecker";
import { interactivePracticeSource } from "./practiceSession";

/**
 * The interactive practice INTEGRATION proof: a full number_line practice set driven
 * through the REAL lesson engine + mastery service (same `submitAnswer` → global
 * `checkAnswer` → recompute → 4/5 rule as text practice), asserting that widget
 * answers earn mastery identically — 4/5 → mastery 2, 5/5 → 3, and a revealed slot
 * earns no credit. Because the interactive items declare `equivalence_checker_version`
 * 2, this also proves the versioned checker routes widget payloads correctly without
 * disturbing the D1 (v1) mastery path. (Runs in Chromium via the browser project so it
 * is covered by `npm run check`.)
 */

function frozenFor(itemVersionId: string): FrozenItem {
  const frozen = practiceItemsById.get(itemVersionId);
  if (!frozen) {
    throw new Error(`no frozen item for ${itemVersionId}`);
  }
  return frozen;
}

/** The canonical CORRECT widget payload for an item (from its private interactive_spec). */
function correctPayload(frozen: FrozenItem): NumberLinePayload {
  const spec = frozen.answer.interactive_spec;
  const payload = canonicalInteractivePayload(frozen.answer.answer_spec.answer_type, spec);
  if (!payload) {
    throw new Error(`no canonical payload for ${frozen.item_version_id}`);
  }
  return payload as NumberLinePayload;
}

/** A shape-valid but WRONG payload (shifted values), so it grades incorrect (not invalid). */
function wrongPayload(frozen: FrozenItem): NumberLinePayload {
  const right = correctPayload(frozen);
  const wrong: NumberLinePayload = {};
  if (right.points) {
    wrong.points = right.points.map((p) => p + 5);
  }
  if (right.intervals) {
    wrong.intervals = right.intervals.map((iv) => ({
      ...iv,
      lo: iv.lo + 5,
      hi: iv.hi + 5,
    }));
  }
  return wrong;
}

type SlotPlan = "correct" | "wrong" | "reveal";

/** Play a five-slot interactive set with a per-slot plan; return the evidenced mastery. */
async function playSet(plans: readonly SlotPlan[]): Promise<number> {
  const source = interactivePracticeSource();
  const { session } = source.createSession();

  for (let i = 0; i < PRACTICE_SET_SIZE; i += 1) {
    const slot = session.getCurrentSlot();
    expect(slot, `slot ${i} exists`).not.toBeNull();
    if (!slot) {
      throw new Error("missing slot");
    }
    const frozen = frozenFor(slot.instance.item_version_id);
    const plan = plans[i] ?? "correct";

    if (plan === "reveal") {
      session.reveal();
      session.skipRevealedSlot(10);
      continue;
    }

    const payload = plan === "correct" ? correctPayload(frozen) : wrongPayload(frozen);
    const outcome = session.submitAnswer({ raw_answer: payload, time_on_item_ms: 10 });
    expect(outcome.resolved, `slot ${i} (${plan}) resolves`).toBe(true);
    expect(outcome.client_correct, `slot ${i} client grade`).toBe(plan === "correct");
    session.advanceSlot();
  }

  expect(session.isPracticeComplete()).toBe(true);
  const evidence = await session.submitPractice(`ev-${plans.join("-")}`);
  return evidence.mastery;
}

describe("interactive practice mastery path (unchanged 4/5 rule)", () => {
  it("grades a canonical widget payload as correct through the versioned checker", () => {
    const source = interactivePracticeSource();
    const { initialInstanceIds } = source.createSession();
    for (const id of initialInstanceIds) {
      const frozen = frozenFor(id);
      const result = practiceChecker({
        raw_answer: correctPayload(frozen),
        item_version_id: id,
        equivalence_checker_version: checkerVersionForItem(frozen),
      });
      expect(result.client_correct, id).toBe(true);
    }
  });

  it("5 of 5 correct → gold mastery (3)", async () => {
    const mastery = await playSet(["correct", "correct", "correct", "correct", "correct"]);
    expect(mastery).toBe(3);
  });

  it("4 of 5 correct → mastered (2)", async () => {
    const mastery = await playSet(["correct", "correct", "correct", "correct", "wrong"]);
    expect(MASTERY_CORRECT_COUNT).toBe(4);
    expect(mastery).toBe(2);
  });

  it("a revealed slot earns no credit (4 correct + 1 revealed → mastery 2, not 3)", async () => {
    const mastery = await playSet(["correct", "correct", "correct", "correct", "reveal"]);
    expect(mastery).toBe(2);
  });

  it("3 of 5 correct → not mastered (below the 4/5 bar)", async () => {
    const mastery = await playSet(["correct", "correct", "correct", "wrong", "wrong"]);
    expect(mastery).toBeLessThan(2);
  });
});
