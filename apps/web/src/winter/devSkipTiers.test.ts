import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  WINTER_TIERS,
  type WinterAction,
  winterLayoutFor,
  winterTierFor,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import {
  declarationToRepeat,
  runOutTheWinterAtTier,
  skipRoundAtTier,
} from "./devSkipTiers";
import { correctNeededFor } from "./WinterGrid";

/**
 * **THE DEV SKIP'S ARITHMETIC, AND THE ONE THING IT COULD LIE ABOUT.**
 *
 * The control's whole value is that it names the outcome: press *"resolve as 2 of 3"* and you are
 * looking at the `steady` tier. Everything else it does is the engine's own `resolve`, so the only
 * way it can be WRONG rather than broken is by handing the engine a score that grades a different
 * rung than the button said — which would silently misreport which state a reviewer is
 * photographing. That is what the round-trip below is for.
 */

const BOARD = winterLayoutFor(1).buildings;

function fresh(): HardWinterState {
  return createHardWinter({ era: CURRENT_ERA_ID, buildings: BOARD });
}

/** Declare `action` and stop, which is the state the per-round row is offered in. */
function answering(action: WinterAction): HardWinterState {
  return hardWinterReducer(fresh(), { type: "declare", action });
}

const FIRE: WinterAction = { kind: "fire", col: 0, row: 0 };

describe("the tier a skip asks for is the tier the engine grades", () => {
  /**
   * THE ROUND-TRIP, and it is the load-bearing assertion in this file.
   *
   * `correctNeededFor` is the board's badge (`ceil(min_ratio * batch_size)`) and `winterTierFor` is
   * the engine's grader. The skip control is only honest if the first is a right inverse of the
   * second, and nothing else in the tree asserts that — the badge is drawn beside a preview and
   * never fed back through the grader. A retune of `HARD_WINTER.tiers` or of `batch_size` that broke
   * the inverse would leave every existing test green and every button on this control mislabelled.
   */
  it("round-trips every rung through the ladder", () => {
    expect(WINTER_TIERS.length).toBeGreaterThanOrEqual(4);
    for (const tier of WINTER_TIERS) {
      const score = correctNeededFor(tier);
      expect(score, `${tier} needs a score inside the batch`).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(HARD_WINTER.batch_size);
      expect(
        winterTierFor(score, HARD_WINTER.batch_size),
        `${score} of ${HARD_WINTER.batch_size} does not grade ${tier}`,
      ).toBe(tier);
    }
  });

  /** And the four rungs are four DIFFERENT scores, so the control offers four real choices. */
  it("gives each rung its own score", () => {
    const scores = WINTER_TIERS.map(correctNeededFor);
    expect(new Set(scores).size, `scores: ${scores.join(", ")}`).toBe(WINTER_TIERS.length);
  });

  it("resolves the round at the tier it was asked for", () => {
    for (const tier of WINTER_TIERS) {
      const skipped = skipRoundAtTier(answering(FIRE), tier);
      expect(skipped.phase).toBe("resolved");
      expect(skipped.last_resolution?.tier, `asked for ${tier}`).toBe(tier);
      expect(skipped.last_resolution?.correct).toBe(correctNeededFor(tier));
      expect(skipped.last_resolution?.asked).toBe(HARD_WINTER.batch_size);
    }
  });

  /**
   * THE TIERS REACH DIFFERENT GROUND, which is the claim that makes a tier-choosing control worth
   * building rather than a plain "next". Measured on the same cell in the same round: `none` lights
   * a real fire that warms nothing, and each rung above it holds strictly more.
   */
  it("reaches strictly more ground the stronger the rung", () => {
    const held = WINTER_TIERS.map((tier) => {
      const skipped = skipRoundAtTier(answering(FIRE), tier);
      return hardWinterView(skipped, { fire_preview: null })
        .rows.flat()
        .filter((cell) => cell.land && cell.warded).length;
    });
    expect(held[0], "the none tier warmed ground").toBe(0);
    for (let rung = 1; rung < held.length; rung += 1) {
      expect(
        held[rung] as number,
        `${WINTER_TIERS[rung]} holds ${held[rung]}, ${WINTER_TIERS[rung - 1]} holds ${held[rung - 1]}`,
      ).toBeGreaterThan(held[rung - 1] as number);
    }
    // And the `none` tier still LIT a fire, which is the part of the ladder a reviewer most needs
    // to be able to see: accuracy is magnitude, never permission.
    expect(skipRoundAtTier(answering(FIRE), "none").fires).toHaveLength(1);
  });

  /** Out of phase it is the reducer's own no-op, reported by identity so a caller can tell. */
  it("does nothing at all outside the answering phase", () => {
    const declaring = fresh();
    expect(skipRoundAtTier(declaring, "strong")).toBe(declaring);
    const resolved = skipRoundAtTier(answering(FIRE), "strong");
    expect(skipRoundAtTier(resolved, "strong")).toBe(resolved);
  });
});

describe("the declaration a run-out repeats", () => {
  it("is the pending choice while declaring", () => {
    expect(declarationToRepeat(fresh(), FIRE)).toEqual(FIRE);
  });

  it("is the locked declaration while answering", () => {
    expect(declarationToRepeat(answering(FIRE), null)).toEqual(FIRE);
  });

  /**
   * And the resolution's action once resolved, which is the case a naive read of `declared` gets
   * wrong: `applyResolution` clears `declared`, so at this phase the resolution is the only record.
   */
  it("is the resolution's action once resolved", () => {
    const resolved = skipRoundAtTier(answering(FIRE), "steady");
    expect(resolved.declared, "the engine no longer holds the declaration").toBeNull();
    expect(declarationToRepeat(resolved, null)).toEqual(FIRE);
  });

  it("is nothing at all on a fresh round with no choice made", () => {
    expect(declarationToRepeat(fresh(), null)).toBeNull();
  });
});

describe("running the winter out at one tier", () => {
  it("plays every remaining round and ends the winter", () => {
    const run = runOutTheWinterAtTier(fresh(), "steady", FIRE);

    expect(run.stopped, "the run stopped short").toBeNull();
    expect(run.rounds).toBe(HARD_WINTER.rounds);
    expect(run.winter.phase).toBe("ended");
    // The ROUNDS really ran rather than the phase being set: a log line per round, each graded at
    // the tier asked for, and an outcome the engine computed at the end.
    expect(run.winter.log).toHaveLength(HARD_WINTER.rounds);
    for (const entry of run.winter.log) {
      expect(entry.resolution.tier).toBe("steady");
    }
    expect(run.winter.outcome).not.toBeNull();
  });

  /** From mid-encounter too: `resolved` and `answering` are both places a reviewer presses it. */
  it("starts from whichever phase the round is in", () => {
    const fromAnswering = runOutTheWinterAtTier(answering(FIRE), "weak", null);
    expect(fromAnswering.winter.phase).toBe("ended");
    expect(fromAnswering.rounds).toBe(HARD_WINTER.rounds);

    const resolved = skipRoundAtTier(answering(FIRE), "weak");
    const fromResolved = runOutTheWinterAtTier(resolved, "weak", null);
    expect(fromResolved.winter.phase).toBe("ended");
    // Round one was already resolved before this run started, so it plays the rest.
    expect(fromResolved.rounds).toBe(HARD_WINTER.rounds - 1);
    expect(fromResolved.winter.log).toHaveLength(HARD_WINTER.rounds);
  });

  /**
   * THE FROST AND THE DAMAGE REALLY LAND, which is the boundary the request drew: skip the
   * QUESTIONS, run the ROUND. A winter run out at the bottom rung has to end up visibly worse than
   * the same winter at the top, or the rounds were not being played.
   */
  it("advances the frost and lands the damage", () => {
    const worst = runOutTheWinterAtTier(fresh(), "none", FIRE).winter;
    const best = runOutTheWinterAtTier(fresh(), "strong", FIRE).winter;

    expect(worst.frozen.length, "no ground froze").toBeGreaterThan(0);
    const ruins = (state: HardWinterState): number =>
      state.buildings.filter((b) => b.state === "ruin").length;
    const harmed = (state: HardWinterState): number =>
      state.buildings.filter((b) => b.state === "ruin" || b.damage > 0).length;

    expect(harmed(worst), "nothing was harmed at zero accuracy").toBeGreaterThan(0);
    expect(
      ruins(worst),
      `${ruins(worst)} ruins at none against ${ruins(best)} at strong`,
    ).toBeGreaterThan(ruins(best));
  });

  /**
   * A REFUSED REPEAT STOPS THE RUN AND SAYS WHY, rather than substituting an action of its own.
   *
   * ## ⚑ THE ACTION THAT FORCED THIS TEST IS GONE, AND THE REFUSAL IT USED IS TOO
   *
   * It ran the pull-back: the ring is always the next band inward, so repeating it walked out of
   * legal moves before the winter was over and the reviewer was left in the declaring phase of the
   * round that could not be played. It carried a floor asserting the winter was longer than era
   * one's four abandonable rings, because at `rounds: 4` the chain spent its last ring on the
   * round that ended the winter and there was no round left to be refused in — a relationship that
   * was caught, asserted, and then made irrelevant when the lead ruled the action out on
   * 2026-08-02.
   *
   * **THE REFUSAL THIS PLAYS INSTEAD IS THE ONE THAT DOCBLOCK ALREADY NAMED AS THE SUCCESSOR**:
   * *"the shield on a ruin, which `HARD_WINTER.damage.ruin_at: 2` created"*. At `ruin_at: 1` it is
   * reached on the first repeat rather than the third: the shoreline Lookout stands on rim band 0,
   * `spread.base` is 1 so band 0 freezes as round one closes, and a building the frost reaches
   * unsheltered is a ruin. A ruin cannot be reinforced, so round two is refused.
   *
   * **THE TIER IS `none` AND IT IS FORCED**, which is worth a line because it looks like the
   * weakest possible fixture and is the only one that works: a reinforce is CUMULATIVE, so at any
   * tier that buys shield the repeat keeps topping the Lookout up and it never falls. At `none`
   * the declaration is a real action that buys nothing, which is exactly the rung
   * `HARD_WINTER.reinforce.shield_by_tier` puts at the bottom of the ladder for this reason.
   *
   * The floor is restated in the form the new fixture needs — the run must stop INSIDE the winter
   * rather than at the end of it — so a round count or a freeze schedule that took the refusal away
   * says so here instead of quietly changing what this test measures.
   */
  it("stops on a refusal and hands back the reason", () => {
    const run = runOutTheWinterAtTier(fresh(), "none", {
      kind: "reinforce",
      node_id: "NUM.5",
    });
    expect(
      HARD_WINTER.reinforce.shield_by_tier.none,
      "the bottom rung buys shield now, so the Lookout survives and nothing is refused",
    ).toBe(0);

    expect(run.stopped, "an unrepeatable action ran the whole winter").not.toBeNull();
    expect(run.stopped ?? "").toMatch(/ruin cannot be reinforced/i);
    expect(run.rounds).toBeGreaterThan(0);
    expect(
      run.rounds,
      "the run reached the end of the winter, so nothing was refused",
    ).toBeLessThan(HARD_WINTER.rounds);
    expect(run.winter.phase).toBe("declaring");
    // What it DID play is real and kept: the rounds before the refusal are in the log.
    expect(run.winter.log).toHaveLength(run.rounds);
    // And the board it left behind is a board: the frost has taken ground and there is still
    // island under it. (It read `held_cells`, which went off `HardWinterView` with the
    // give-up-ground action: with no ring to give up, held land is the island.)
    const view = hardWinterView(run.winter);
    expect(view.frozen_cells).toBeGreaterThan(0);
    expect(view.island.cells.length).toBeGreaterThan(view.frozen_cells);
  });

  it("refuses to start when there is nothing to repeat", () => {
    const before = fresh();
    const run = runOutTheWinterAtTier(before, "strong", null);

    expect(run.rounds).toBe(0);
    expect(run.winter, "it moved the winter with no declaration").toBe(before);
    expect(run.stopped ?? "").toMatch(/Choose an action first/i);
  });
});
