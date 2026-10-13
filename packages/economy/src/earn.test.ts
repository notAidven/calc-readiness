import { describe, expect, it } from "vitest";

import { CAP, DRILL_PAID_SETS_PER_ERA, EARN } from "./constants";
import {
  civicBootstrapGrant,
  drillSetsRemaining,
  interleavedGrant,
  interleavedPayout,
  lessonCompleteGrant,
} from "./earn";
import { applyGrant } from "./grant";
import { appendEntries } from "./ledger";
import { civicBootstrapMaterialAmount, lessonMaterialAmount } from "./materials";
import { EMPTY_LEDGER_VIEW } from "./types";

const STUDENT = "s1";
const NOW = Date.UTC(2026, 0, 1);

/**
 * **THE D-R3 ASYMMETRY WAS THIS FILE'S SUBJECT, AND IT NO LONGER EXISTS.**
 *
 * Three recipes paid two resources on a deliberate split: the two ACTIVITIES paid
 * currency and XP, and DEPTH — a mastery star — paid XP and no currency at all. XP was
 * sunset on 2026-08-03, which does not narrow that split, it collapses it: one side of
 * the asymmetry is the resource that is gone, so row 3's whole payout went with it and
 * `starGrant` is deleted rather than left paying an empty set.
 *
 * So the suite asserts what is left — one currency, two recipes — plus the thing the
 * deletion makes newly assertable: that no recipe credits anything but a material, over
 * the recipes derived from the module rather than a list written down here.
 */

describe("earn recipes — one currency, and every recipe pays it or nothing", () => {
  it("lesson complete credits the era material, and nothing beside it", () => {
    const input = lessonCompleteGrant({ studentId: STUDENT, nodeId: "NUM.F", nowMs: NOW });
    // Era one's 6 nodes over the 600 era total.
    expect(input.amounts.stone).toBe(lessonMaterialAmount("prehistoric"));
    // A CENSUS rather than an absence check: `not.toHaveProperty("xp")` would also pass
    // over a recipe that had grown some third key nobody thought to name.
    expect(Object.keys(input.amounts)).toEqual(["stone"]);
  });

  it("no surviving recipe credits anything that is not an era material", () => {
    // The population is the two recipes this module exports, exercised rather than
    // described: an amounts key that is not a material is the shape the sunset removed,
    // and it must not come back under another name (points, score, level).
    const amounts = [
      lessonCompleteGrant({ studentId: STUDENT, nodeId: "NUM.F", nowMs: NOW }).amounts,
      interleavedGrant({
        studentId: STUDENT,
        sessionId: "sess-1",
        currentEra: "prehistoric",
        nowMs: NOW,
        priorPaidSets: 0,
        struggleLevel: null,
      }).amounts,
    ];
    // A floor, so an empty sweep cannot read as a clean one.
    expect(amounts).toHaveLength(2);
    for (const keys of amounts.map((a) => Object.keys(a))) {
      expect(keys.length, "a recipe credits nothing at all").toBeGreaterThan(0);
      expect(keys).toEqual(["stone"]);
    }
  });
});

describe("earn recipes — interleaved (row 2) is FLAT and capped", () => {
  it("pays the table amounts, with no repair portion to add", () => {
    const input = interleavedGrant({
      studentId: STUDENT,
      sessionId: "sess-1",
      currentEra: "prehistoric",
      nowMs: NOW,
      priorPaidSets: 0,
      // No reading of how the round went, which is what every caller passed before the
      // taper existed and what pays the table amount this assertion is about.
      struggleLevel: null,
    });
    expect(input.capped).toBe(true);
    // Practice pays the CURRENCY, which is the era's material. At era one's x1 the
    // era-one-scale figure is the figure.
    expect(input.amounts.stone).toBe(EARN.interleaved.material);
  });

  it("pays the SAME whether the last session was a minute or a decade ago", () => {
    // The condition clock's whole behaviour was that these two differed — a
    // returning player's first session paid up to 36 against a regular player's 10.
    // Asserted as an equality rather than as an absence, because an absence is what
    // a re-added repair term would still satisfy.
    const justNow = interleavedGrant({
      studentId: STUDENT,
      sessionId: "a",
      currentEra: "prehistoric",
      nowMs: NOW,
      priorPaidSets: 0,
      struggleLevel: null,
    });
    const decadeLater = interleavedGrant({
      studentId: STUDENT,
      sessionId: "b",
      currentEra: "prehistoric",
      nowMs: NOW + 10 * 365 * 24 * 60 * 60 * 1000,
      priorPaidSets: 0,
      struggleLevel: null,
    });
    expect(decadeLater.amounts).toEqual(justNow.amounts);
  });

  it("carries no leftover key from the two-term payout (key CENSUS)", () => {
    // `goldBase` only meant something beside a non-base term, and `goldRepairMax` was
    // the term; both are gone, and so is the currency they were denominated in — as is
    // the `xp` key that sat beside `material` until the sunset. Equality rather than
    // `not.toHaveProperty` checks, so a third key nobody thought to name also fails.
    // `materialFloor` is row 2's second magnitude, and it is a legitimate one rather than
    // a leftover: the pair are the ends of the struggle taper, and `interleavedPayout`
    // reads both. The census stays an equality so a THIRD key still fails here.
    expect(Object.keys(EARN.interleaved).sort()).toEqual(["material", "materialFloor"]);
    // Row 1 has no magnitude of its own at all: its amount is derived per era.
    expect(Object.keys(EARN.lessonComplete)).toEqual([]);
    // And the table is two rows. `star` was the third and paid XP alone, so it had
    // nothing left to pay; a `star` key back on this table is that row returning.
    expect(Object.keys(EARN).sort()).toEqual(["interleaved", "lessonComplete"]);
  });

  it("pays NOTHING past the era's drill bound, where it used to still pay XP", () => {
    // The sunset's one behavioural change outside the shop, asserted rather than left in
    // a docblock. Past the bound the recipe omits the material key, XP is not there to
    // take its place, and `applyGrant` therefore writes no row and reports it unapplied.
    const spent = interleavedGrant({
      studentId: STUDENT,
      sessionId: "past-the-bound",
      currentEra: "prehistoric",
      nowMs: NOW,
      priorPaidSets: DRILL_PAID_SETS_PER_ERA,
      struggleLevel: null,
    });
    expect(spent.amounts).toEqual({});
    expect(drillSetsRemaining(DRILL_PAID_SETS_PER_ERA)).toBe(0);

    const result = applyGrant(EMPTY_LEDGER_VIEW, spent);
    expect(result.applied).toBe(false);
    expect(result.rows).toEqual([]);

    // The set BEFORE the bound is the contrast, so "unapplied" is a property of the
    // bound rather than of the fixture.
    const lastPaid = applyGrant(
      EMPTY_LEDGER_VIEW,
      interleavedGrant({
        studentId: STUDENT,
        sessionId: "at-the-bound",
        currentEra: "prehistoric",
        nowMs: NOW,
        priorPaidSets: DRILL_PAID_SETS_PER_ERA - 1,
        struggleLevel: null,
      }),
    );
    expect(lastPaid.applied).toBe(true);
    expect(lastPaid.grantedMaterials.stone).toBe(EARN.interleaved.material);
  });
});

/**
 * **ROW 2 PAYS MORE ON THE SKILLS THE LEARNER IS STRUGGLING WITH, AND TAPERS ON THE ONES
 * THEY HAVE.**
 *
 * The ruling: a reward should be larger on a concept the learner struggles with, and
 * *"capped or decreased after the user has demonstrated they have fully understood a
 * concept."* Both halves are one taper between `materialFloor` and `material`.
 *
 * The shape was forced by the cap. `CAP.maxMaterial` IS `EARN.interleaved.material` and
 * this grant is `capped: true`, so a bonus stacked above 20 would be clamped to 20 and
 * credit nothing at all. The bonus is therefore built downward from the existing ceiling,
 * which also means per-era drill income can only fall from the 200 `civicSolvency.test.ts`
 * measures.
 */
describe("earn recipes — the interleaved payout tapers on struggle", () => {
  function paid(struggleLevel: number | null): number {
    return (
      interleavedGrant({
        studentId: STUDENT,
        sessionId: `s-${struggleLevel}`,
        currentEra: "prehistoric",
        nowMs: NOW,
        priorPaidSets: 0,
        struggleLevel,
      }).amounts.stone ?? 0
    );
  }

  it("pays the ceiling on a round of skills the learner is still fighting", () => {
    expect(interleavedPayout(1)).toBe(EARN.interleaved.material);
    expect(paid(1)).toBe(EARN.interleaved.material);
  });

  it("pays the floor once the round is all skills in hand", () => {
    // The "decreased after they have understood it" half, and the reason the floor is not
    // zero: a learner keeping a mastered skill sharp is still doing real work.
    expect(interleavedPayout(0)).toBe(EARN.interleaved.materialFloor);
    expect(paid(0)).toBe(EARN.interleaved.materialFloor);
    expect(EARN.interleaved.materialFloor).toBeGreaterThan(0);
  });

  it("moves monotonically between the two, so the incentive never inverts", () => {
    // A non-monotonic taper would pay a learner MORE for improving on some stretch of the
    // range, which is the opposite of what any of this is for. Swept rather than sampled at
    // three points, because a fold could sit between any two samples.
    let previous = -1;
    for (let step = 0; step <= 20; step += 1) {
      const amount = interleavedPayout(step / 20);
      expect(amount).toBeGreaterThanOrEqual(previous);
      previous = amount;
    }
    // And a floor with a shape: the range really is traversed, so "monotonic" is not being
    // satisfied by a constant.
    expect(interleavedPayout(1)).toBeGreaterThan(interleavedPayout(0));
  });

  it("pays the FULL rate when the caller has no reading, not the reduced one", () => {
    // No signal is not a demonstration of mastery, and the two must not resolve to the same
    // amount. This is also why every measurement in this package that predates the taper is
    // unmoved: they all pass `null`, and `null` is still 20.
    expect(interleavedPayout(null)).toBe(EARN.interleaved.material);
    expect(paid(null)).toBe(EARN.interleaved.material);
    expect(interleavedPayout(Number.NaN)).toBe(EARN.interleaved.material);
  });

  it("clamps a level outside the range rather than paying outside the band", () => {
    expect(interleavedPayout(9)).toBe(EARN.interleaved.material);
    expect(interleavedPayout(-3)).toBe(EARN.interleaved.materialFloor);
  });

  it("stays under the per-set cap, which the struggle bonus must not be able to lift", () => {
    // The grant is `capped: true` against `CAP.maxMaterial`, so a payout above the ceiling
    // would be silently clamped and the bonus would be invisible. Asserted at the top of
    // the range, which is the only place it could go wrong.
    expect(interleavedPayout(1)).toBeLessThanOrEqual(CAP.maxMaterial);
    const granted = applyGrant(
      EMPTY_LEDGER_VIEW,
      interleavedGrant({
        studentId: STUDENT,
        sessionId: "at-the-ceiling",
        currentEra: "prehistoric",
        nowMs: NOW,
        priorPaidSets: 0,
        struggleLevel: 1,
      }),
    );
    expect(granted.grantedMaterials.stone).toBe(CAP.maxMaterial);
  });

  it("leaves the per-era bound alone: a struggling learner gets no extra SETS", () => {
    // The two mechanisms are separate and stay separate. The taper changes what a set is
    // worth; how many sets pay at all is `DRILL_PAID_SETS_PER_ERA` and reads nothing about
    // the learner.
    const spent = interleavedGrant({
      studentId: STUDENT,
      sessionId: "past-the-bound-struggling",
      currentEra: "prehistoric",
      nowMs: NOW,
      priorPaidSets: DRILL_PAID_SETS_PER_ERA,
      struggleLevel: 1,
    });
    expect(spent.amounts).toEqual({});
    expect(drillSetsRemaining(DRILL_PAID_SETS_PER_ERA)).toBe(0);
  });

  it("reads no clock: the same level pays the same however the instants are spread", () => {
    // `clockless.test.ts` owns this for the package; asserted again on the new argument
    // because a taper is exactly the shape a wall clock comes back in.
    const early = interleavedGrant({
      studentId: STUDENT,
      sessionId: "early",
      currentEra: "prehistoric",
      nowMs: NOW,
      priorPaidSets: 0,
      struggleLevel: 0.5,
    });
    const late = interleavedGrant({
      studentId: STUDENT,
      sessionId: "late",
      currentEra: "prehistoric",
      nowMs: NOW + 10 * 365 * 24 * 60 * 60 * 1000,
      priorPaidSets: 0,
      struggleLevel: 0.5,
    });
    expect(late.amounts).toEqual(early.amounts);
  });
});

/**
 * The onboarding civic-bootstrap top-up. Not one of the two §6 income recipes
 * (it is a product-onboarding grant, the same category `islandFoundingGrant` is
 * in), so it sits in its own block rather than joining the census above.
 */
describe("earn recipes — the civic-bootstrap top-up covers the era's dearest building", () => {
  it("grants a flat 120 at era-one scale", () => {
    const grant = civicBootstrapGrant({ studentId: STUDENT, eraId: "prehistoric", nowMs: NOW });
    expect(grant.amounts.stone).toBe(civicBootstrapMaterialAmount("prehistoric"));
    expect(Object.keys(grant.amounts)).toEqual(["stone"]);
  });

  it("is idempotent: a second report of the same era is a no-op", () => {
    const first = applyGrant(
      EMPTY_LEDGER_VIEW,
      civicBootstrapGrant({ studentId: STUDENT, eraId: "prehistoric", nowMs: NOW }),
    );
    expect(first.applied).toBe(true);
    const view = appendEntries(EMPTY_LEDGER_VIEW, first.rows);

    const replay = applyGrant(
      view,
      civicBootstrapGrant({ studentId: STUDENT, eraId: "prehistoric", nowMs: NOW + 1 }),
    );
    expect(replay.applied).toBe(false);
    expect(replay.rows).toEqual([]);
  });
});

describe("earn recipes — a completed lesson writes one row, not three", () => {
  it("credits the era's material once, and the ledger holds nothing else", () => {
    let view = EMPTY_LEDGER_VIEW;
    const lesson = applyGrant(
      view,
      lessonCompleteGrant({
        studentId: STUDENT,
        nodeId: "NUM.4",
        nowMs: NOW,
      }),
    );
    view = appendEntries(view, lesson.rows);

    // It was three rows while gold existed and two while XP did. The star credits that
    // used to follow a mastery-2 completion are gone with row 3, so a completed lesson's
    // whole economic footprint is this one row.
    expect(view.entries).toHaveLength(1);
    const material = view.entries
      .filter((e) => e.resource_type === "stone")
      .reduce((s, e) => s + e.amount, 0);
    expect(material).toBe(lessonMaterialAmount("prehistoric"));
    expect(view.entries.every((e) => e.resource_type === "stone")).toBe(true);
  });
});
