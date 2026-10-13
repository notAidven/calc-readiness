import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { capMaxFor, capRemaining, withinCap } from "./cap";
import { CAP, EARN } from "./constants";
import { interleavedGrant, lessonCompleteGrant } from "./earn";
import { applyGrant } from "./grant";
import { appendEntries, sumInterleavedGrants } from "./ledger";
import { eraCostMultiplier, eraOfMaterial, eraScaledPrice } from "./materials";
import { EMPTY_LEDGER_VIEW, type LedgerView, MATERIAL_IDS } from "./types";

/**
 * **THE CAP IS PER COMPLETED PRACTICE SET** (team lead, 2026-07-29: *"cap shouldn't be
 * daily - it should be per-practice"*).
 *
 * This suite was written against a rolling 24-hour window and asserted the three things
 * that window did: earnings depleting a remainder, one-time grants not touching it, and
 * old earnings ageing out. The first two survive in per-set form; the third had no
 * meaning left and is replaced by its opposite — nothing ages, because nothing
 * accumulates.
 *
 * The clocklessness half of the ruling (no wall-clock duration anywhere, no decision
 * derived from a stored instant, and the same total for K sets however their instants are
 * spread) lives in `clockless.test.ts`, extending the sweep that already existed rather
 * than starting a second one.
 */

const STUDENT = "s1";
const NOW = Date.UTC(2026, 6, 1);

/**
 * One completed practice set, through the real recipe, **with the per-era drill bound
 * deliberately held open** (`priorPaidSets: 0`).
 *
 * This file is about `CAP`, which bounds what ONE set may credit.
 * `DRILL_PAID_SETS_PER_ERA` bounds how many sets credit anything, and the two are
 * separate mechanisms on purpose — so a fixture that let the bound bite would turn every
 * assertion below into a measurement of the wrong ceiling. The bound has its own
 * coverage in `clockless.test.ts` (that it is effort-keyed) and `civicSolvency.test.ts`
 * (what it costs), both driving the real ledger count.
 */
function practise(view: LedgerView, sessionId: string, atMs: number): LedgerView {
  const result = applyGrant(
    view,
    interleavedGrant({
      studentId: STUDENT,
      sessionId,
      currentEra: "prehistoric",
      nowMs: atMs,
      priorPaidSets: 0,
      // The cap bounds ONE set's credit, so this fixture holds the payout at the ceiling
      // for the same reason it holds the drill bound open: a tapered payout would measure
      // the taper rather than the cap.
      struggleLevel: null,
    }),
  );
  return appendEntries(view, result.rows);
}

describe("the cap is a per-practice-set allowance, not a window remainder", () => {
  it("pays a full set's worth on the FIRST set and on the fiftieth alike", () => {
    // The property the window did not have, and the one the drill bound does not take
    // away: the CAP never depletes, so the fiftieth set is worth exactly what the first
    // was. What stops a fiftieth PAID set is the per-era bound, which is a count and not
    // a remainder — the fixture above holds it open so this measures the cap alone.
    let view = EMPTY_LEDGER_VIEW;
    for (let set = 0; set < 50; set += 1) {
      view = practise(view, `set-${set}`, NOW);
    }
    expect(sumInterleavedGrants(view, "stone")).toBe(50 * EARN.interleaved.material);
    // The old ceiling, for scale: 200 at era-one scale was 10 sets at the current
    // payout. The 11th through 50th paid nothing then and are clamped by nothing here.
    expect(50 * EARN.interleaved.material).toBeGreaterThan(200);
  });

  it("CLAMPS a request larger than one set's worth, which is what it is for", () => {
    // With the cap derived from the payout, the recipe can never trip it — so the guard
    // is proven against the shape it actually exists to stop: a caller (or a second
    // repeatable source on the same reason code) asking for more than a set is worth.
    const overRequest = capMaxFor("stone") * 10 + 7;
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "interleaved:inflated",
      reasonCode: "interleaved",
      amounts: { stone: overRequest },
      nowMs: NOW,
    });
    expect(result.applied).toBe(true);
    expect(result.grantedMaterials.stone).toBe(capMaxFor("stone"));
    // A floor under the clamp: the request really was bigger than the allowance, or
    // "clamped" would be indistinguishable from "granted in full".
    expect(overRequest).toBeGreaterThan(capMaxFor("stone"));
  });

  it("the one-time lesson grant is not capped at all, however large", () => {
    const huge = capMaxFor("stone") * 1000;
    const result = applyGrant(EMPTY_LEDGER_VIEW, {
      studentId: STUDENT,
      eventId: "lesson_complete:NUM.F",
      reasonCode: "lesson_complete",
      amounts: { stone: huge },
      nowMs: NOW,
      capped: false,
    });
    expect(result.grantedMaterials.stone).toBe(huge);
    // And the real row-1 recipe pays far more than a practice set's allowance, which is
    // the whole reason it must not go through the cap.
    const lesson = applyGrant(
      EMPTY_LEDGER_VIEW,
      lessonCompleteGrant({ studentId: STUDENT, nodeId: "NUM.F", nowMs: NOW }),
    );
    expect(lesson.grantedMaterials.stone ?? 0).toBeGreaterThan(capMaxFor("stone"));
  });

  it("takes no ledger and no instant, so there is nothing to wait for", () => {
    // The signature IS the ruling. `capRemaining` took a `LedgerView` and a `nowMs`
    // while the cap was per 24h; a per-set allowance can depend on neither, and the
    // arities below are what stops one being threaded back in.
    expect(capRemaining.length).toBe(1);
    expect(capMaxFor.length).toBe(1);
    expect(withinCap.length).toBe(2);
    // And no duration constant survives on the table. `max` left it with the XP sunset:
    // it was `Record<ResourceType, number>` over a union whose only member was xp, so a
    // key left there would have been a ceiling on a resource nothing credits.
    expect(Object.keys(CAP).sort()).toEqual(["maxMaterial"]);
    expect("windowMs" in CAP).toBe(false);
    expect("max" in CAP).toBe(false);
  });

  it("holds the allowance at exactly one set's payout, in all ten eras", () => {
    // The ceiling and the payout are the same era-one figure through the same scaling,
    // so they agree in every era rather than only in era one — where `x1` would have
    // hidden a mismatch. Asserted over the whole ladder for that reason.
    expect(CAP.maxMaterial).toBe(EARN.interleaved.material);
    for (const material of MATERIAL_IDS) {
      const era = eraOfMaterial(material);
      expect(capMaxFor(material), `${material} (${era})`).toBe(
        eraScaledPrice(EARN.interleaved.material, era),
      );
    }
    expect(MATERIAL_IDS).toHaveLength(10);
    // A floor with a SHAPE: the ladder really does span the ten eras, or the loop above
    // compared one multiplier against itself ten times.
    expect(new Set(ERA_SEQUENCE.map((era) => eraCostMultiplier(era.id))).size).toBe(10);
  });

  it("says no when asked for more than a set, and yes at exactly a set", () => {
    expect(withinCap("stone", capMaxFor("stone"))).toBe(true);
    expect(withinCap("stone", capMaxFor("stone") + 1)).toBe(false);
    // Over every material, not just era one's: `capMaxFor` scales by the material's own
    // era, so a one-material check would pass against a broken ladder at x1.
    for (const material of MATERIAL_IDS) {
      expect(withinCap(material, capMaxFor(material)), material).toBe(true);
      expect(withinCap(material, capMaxFor(material) + 1), material).toBe(false);
    }
  });
});
