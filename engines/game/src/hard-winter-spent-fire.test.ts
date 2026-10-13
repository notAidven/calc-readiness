import { describe, expect, it } from "vitest";

import {
  canDeclareWinterAction,
  createHardWinter,
  type HardWinterState,
  hardWinterDamage,
  hardWinterIsland,
  hardWinterOutcome,
  hardWinterPayoutFor,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  type WinterFire,
  wardedWinterCells,
  winterCellKey,
  winterFireIsBurning,
  winterFireState,
  winterFireWard,
  winterTierFor,
} from "./hard-winter";
import { HARD_WINTER, WINTER_TIERS } from "./hard-winter-tuning";

/**
 * **A FIRE THAT BURNS OUT IS A STATE ON THE BOARD, NOT A DELETION FROM IT.**
 *
 * The lead's ruling: *"this fire did its work and is done"* reads differently from *"no fire was
 * ever here"*, and a player deciding where to build next needs to tell those apart. The crisis
 * brief describes the state in detail — *"the same hearth with its stones gone dark, the fuel
 * spent, a thin wisp of smoke or none at all, and the held ground closed over again by pale
 * frost"* — and the batch 2 scene-asset sheet specifies FOUR fire states, of which only three
 * were reachable, because `closeRound` filtered a fire out of `state.fires` the moment its
 * `rounds_left` hit zero.
 *
 * So this file's subject is the state itself and every consumer that has to survive meeting one.
 * The ward, the counts, the outcome, the payout and the damage report are each swept HERE rather
 * than beside their own rules, because what is being asserted is not what they do — that is
 * covered where they live — but that a `rounds_left: 0` entry in the list does not change it.
 */

const ERA = "prehistoric" as const;

/** Play one whole round: declare, answer, close. */
function playRound(
  state: HardWinterState,
  action: WinterAction,
  correct: number,
  asked: number = HARD_WINTER.batch_size,
): HardWinterState {
  let next = hardWinterReducer(state, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct, asked });
  return hardWinterReducer(next, { type: "end_round" });
}

/** A round spent somewhere else entirely, so the fire under test is the only thing moving. */
function idleRound(state: HardWinterState): HardWinterState {
  return playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 0);
}

/** The cell every fire in this file is lit on, well clear of the settlement. */
const AT = { col: -4, row: -2 } as const;

/**
 * Burn a fire until its fuel is gone, with a round of winter still left to play.
 *
 * **IT IS A `steady` FIRE AND NOT A `strong` ONE, and that is forced by `HARD_WINTER.rounds: 3`
 * rather than chosen.** A `strong` fire burns for three rounds, which at three rounds is the
 * WHOLE winter: lit in round one it is still burning when the winter ends, so it never reaches
 * the spent state at all and every assertion in this file about a spent hearth would have been
 * measuring a burning one. `steady` buys two rounds, so a fire lit in round one is spent as round
 * two closes, which leaves exactly the last round to observe it in.
 *
 * **"The rest of the winter" is therefore one round here**, and that is the honest reading rather
 * than a weakening: two rounds is the shortest fire that outlives its own declaration at all
 * (see `HARD_WINTER.fire.burn_rounds_by_tier`), so round three is the earliest moment any board
 * can hold a spent hearth. At five rounds there were three such rounds.
 */
function burntOut(): HardWinterState {
  let state = playRound(createHardWinter({ era: ERA }), { kind: "fire", ...AT }, 2);
  for (let round = 1; round < HARD_WINTER.fire.burn_rounds_by_tier.steady; round += 1) {
    state = idleRound(state);
  }
  return state;
}

/**
 * A whole winter with something to report at the end of it: a spent hearth out on the rim, a
 * SECOND hearth still burning over the heart, survivors, ruins and a bill. Written as a plan
 * rather than five idle rounds because a board where the frost took everything makes every
 * comparison below a comparison of zeroes.
 */
function richWinter(): HardWinterState {
  // A `steady` fire out on the rim, so it is SPENT by the end of a three-round winter rather than
  // still burning — see `burntOut` for why `strong` cannot be used for this at `rounds: 3`.
  let state = playRound(createHardWinter({ era: ERA }), { kind: "fire", ...AT }, 2);
  // The heart, at full accuracy, so a `strong` fire is still burning when the winter ends. It is
  // also the only reason anything survives this winter, which is what keeps the comparisons below
  // from being comparisons of zeroes.
  state = playRound(state, { kind: "fire", col: 0, row: 0 }, 3);
  state = idleRound(state);
  return state;
}

describe("a spent hearth stays on the board", () => {
  /**
   * **THE DEFECT, AS AN ASSERTION.** `fires` went `[{3}] -> [{2}] -> [{1}] -> []`, so a spent
   * hearth had no state at all and its blackened stones could never be drawn.
   */
  it("keeps the hearth once its fuel runs out, with nothing left to burn", () => {
    const state = burntOut();

    const here = state.fires.filter(
      (fire) => winterCellKey(fire.col, fire.row) === winterCellKey(AT.col, AT.row),
    );
    expect(here.length, "the hearth was deleted from the board when its fuel ran out").toBe(
      1,
    );
    // Floored at zero rather than run negative: `rounds_left` is fuel, and a fire cannot owe any.
    expect(here[0]?.rounds_left).toBe(0);
    // ...and it is still a fire that CAUGHT, which is what makes it a spent hearth rather than
    // one that never lit. The two are different states with different causes.
    expect(here[0]?.radius).toBe(HARD_WINTER.fire.radius_by_tier.steady);
  });

  /**
   * The other half of the same claim, and the reason it is a separate assertion: a spent hearth
   * that stayed for one round and then vanished would satisfy the test above on a board played
   * one round further.
   */
  it("keeps it for the rest of the winter, not for one round more", () => {
    let state = burntOut();
    const spentAt = state.round;
    // A FLOOR ON THE FIXTURE rather than on the round number: what this test needs is a winter
    // with something left to play after the hearth goes out, and at three rounds that is exactly
    // one round. `expect(spentAt).toBeLessThan(HARD_WINTER.rounds)` said the same thing while
    // there were three such rounds and reads as a coincidence now; the phase says it directly.
    expect(state.phase, "the hearth went out as the winter ended").not.toBe("ended");
    expect(spentAt).toBeLessThanOrEqual(HARD_WINTER.rounds);

    while (state.phase !== "ended") {
      state = idleRound(state);
    }
    expect(state.round).toBe(HARD_WINTER.rounds);
    expect(
      state.fires.filter((fire) => fire.col === AT.col && fire.row === AT.row).length,
      "the spent hearth disappeared later in the winter",
    ).toBe(1);
    expect(state.fires.every((fire) => fire.rounds_left === 0)).toBe(true);
  });

  /**
   * **THE THREE STATES ARE THREE STATES, and this is the assertion that a spent hearth is not
   * quietly the same thing as a hearth that never caught.** They have different causes — one did
   * its work, the other bought nothing — and the brief distinguishes them, so the board must be
   * able to. A reading that asked about the fuel before the radius would collapse them, because
   * `burn_rounds_by_tier.none` is 1 and an unlit hearth is at `rounds_left: 0` from the end of
   * the round it was declared in.
   */
  it("tells a spent hearth from one that was built and never caught", () => {
    const spent = burntOut().fires[0] as WinterFire;
    // A declaration at 0 of 3, played through its own round so its `rounds_left` is at the floor
    // too: the two are then indistinguishable on the fuel and distinguishable only on the radius.
    const cold = playRound(createHardWinter({ era: ERA }), { kind: "fire", ...AT }, 0)
      .fires[0] as WinterFire;

    expect(spent.rounds_left).toBe(0);
    expect(cold.rounds_left).toBe(0);
    expect(winterFireState(spent)).toBe("spent");
    expect(winterFireState(cold)).toBe("never_caught");
    expect(winterFireState(spent)).not.toBe(winterFireState(cold));

    // And the census: every state the board can be handed is one of the three, over the whole
    // tier ladder rather than these two witnesses. `proposed` is not among them by construction —
    // nothing has been declared, so there is no fire.
    const seen = new Set<string>();
    for (const tier of WINTER_TIERS) {
      const correct = [0, 1, 2, 3].find(
        (score) => winterTierFor(score, HARD_WINTER.batch_size) === tier,
      ) as number;
      let state = playRound(
        createHardWinter({ era: ERA }),
        { kind: "fire", ...AT },
        correct,
      );
      seen.add(winterFireState(state.fires[0] as WinterFire));
      while (state.phase !== "ended") {
        state = idleRound(state);
        seen.add(winterFireState(state.fires[0] as WinterFire));
      }
    }
    expect([...seen].sort()).toEqual(["burning", "never_caught", "spent"]);
  });

  /**
   * A hearth is a PLACE, and a spent one staying on the board is what obliges the engine to say
   * so: lighting a fire where a spent hearth stands re-lights those stones rather than standing a
   * second ring of nine inside them, which the board would draw at one transform.
   */
  it("re-lights the same hearth rather than stacking a second one on the cell", () => {
    let state = burntOut();
    expect(state.fires).toHaveLength(1);
    expect(canDeclareWinterAction(state, { kind: "fire", ...AT })).toBe(true);

    // CAPTURED BEFORE THE PLAY rather than read back off the state afterwards. It read
    // `state.round - 1`, which was true only while the re-light happened in a round that was not
    // the last one: `closeRound` does not advance the counter on the final round, so at
    // `rounds: 3` a hearth re-lit in round three reports `lit_in_round: 3` beside a `round` of 3.
    const relitIn = state.round;
    state = playRound(state, { kind: "fire", ...AT }, 3);

    expect(state.fires, "a second hearth was stood inside the first one").toHaveLength(1);
    const relit = state.fires[0] as WinterFire;
    expect(winterFireState(relit)).toBe("burning");
    expect(relit.lit_in_round).toBe(relitIn);
    // The surface's resolved panel finds *the fire this round lit* by round and cell
    // (`HardWinterSurface.tsx`), so exactly one entry may answer to that, and it is the new one.
    const matches = state.fires.filter(
      (fire) =>
        fire.lit_in_round === relit.lit_in_round &&
        fire.col === AT.col &&
        fire.row === AT.row,
    );
    expect(matches).toHaveLength(1);
    expect(winterFireWard(state, matches[0] as WinterFire).length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* What every consumer of `fires` does with a spent one                       */
/* -------------------------------------------------------------------------- */

describe("a spent hearth wards no ground", () => {
  /**
   * The held ground closes over, which is the reversion the brief pairs with the darkening
   * stones. It needs no new rule: `fireWard` has guarded `rounds_left <= 0` since before a spent
   * fire could exist, so the frost's ordinary advance takes the ground back.
   */
  it("holds nothing itself, and nothing in the union either", () => {
    const state = burntOut();
    const spent = state.fires[0] as WinterFire;

    expect(winterFireState(spent)).toBe("spent");
    expect(winterFireWard(state, spent)).toEqual([]);
    expect(wardedWinterCells(state).size).toBe(0);
    expect(hardWinterView(state).warded_cells).toBe(0);
    for (const cell of hardWinterView(state).rows.flat()) {
      expect(cell.warded, `(${cell.col},${cell.row}) is still held`).toBe(false);
    }
  });

  /**
   * And the ground it WAS holding is ground the frost then takes, rather than a hole in the
   * board that stays open for the rest of the winter. Measured as the same cells, before and
   * after, so this cannot pass on a board where the fire held nothing to begin with.
   */
  it("gives its held ground back to the frost", () => {
    // A `steady` fire, for `burntOut`'s reason: a `strong` one burns the whole three-round winter
    // and hands nothing back, so this would have been asserting over a fire that never went out.
    let state = playRound(createHardWinter({ era: ERA }), { kind: "fire", ...AT }, 2);
    const held = [...wardedWinterCells(state)];
    expect(held.length).toBeGreaterThan(1);
    for (const key of held) {
      expect(state.frozen, `${key} froze under a burning fire`).not.toContain(key);
    }

    while (state.phase !== "ended") {
      state = idleRound(state);
    }
    expect(winterFireState(state.fires[0] as WinterFire)).toBe("spent");
    for (const key of held) {
      expect(state.frozen, `${key} never closed over`).toContain(key);
    }
  });

  /**
   * **A HEARTH IS NEVER REMOVED FROM THE BOARD NOW, and the one exception has gone with its
   * action.**
   *
   * A test here asserted the exception: *"The abandon path is the ONE place a hearth is still
   * removed, and this is the decision rather than an omission: a fire snuffed by a pull-back did
   * not do its work, and the ring it stood on is no longer ground the settlement holds at all. So
   * the invariant is that every hearth on the board stands on held ground."* The lead ruled the
   * pull-back out on 2026-08-02 (see `WinterAction`), so there is no ring to give up and no path
   * that removes a hearth.
   *
   * **WHAT THAT INVARIANT BECOMES IS STRONGER, AND IT IS ASSERTED RATHER THAN ASSUMED**: a fire
   * lit in a winter is on the board when the winter ends, always, whatever it did. That is the
   * whole of `state.fires`' contract now, and it is worth a line because the shape it replaces
   * had one legitimate deletion in it and this one has none.
   */
  it("keeps every hearth ever lit until the winter ends, with no path that removes one", () => {
    const island = hardWinterIsland(ERA);
    let state = createHardWinter({ era: ERA });
    const lit: string[] = [];
    // One fire per round, each on a different rim band, so the sweep covers the shore the
    // pull-back used to take as well as the heart it could never reach.
    const cells = [
      { col: -5, row: -2 },
      { col: -4, row: -2 },
      { col: 0, row: 0 },
    ] as const;
    expect(cells.length, "a hearth per round of the winter").toBe(HARD_WINTER.rounds);
    for (const cell of cells) {
      if (state.phase === "ended") {
        break;
      }
      state = playRound(state, { kind: "fire", ...cell }, 2);
      lit.push(winterCellKey(cell.col, cell.row));
    }
    expect(state.phase).toBe("ended");
    expect(lit, "no fire was lit, so the sweep asserts nothing").toHaveLength(
      HARD_WINTER.rounds,
    );

    // Every one of them is still there, and every one stands on real land.
    expect(state.fires.map((fire) => winterCellKey(fire.col, fire.row)).sort()).toEqual(
      [...lit].sort(),
    );
    for (const fire of state.fires) {
      expect(
        island.rim_depth.has(winterCellKey(fire.col, fire.row)),
        `a hearth is standing off the island (${fire.col},${fire.row})`,
      ).toBe(true);
    }
    // And at least one of them really did burn out, so this is not a sweep over three fires that
    // are all still burning.
    expect(
      state.fires.filter((fire) => winterFireState(fire) === "spent").length,
      "nothing went out, so 'kept after it went out' is untested here",
    ).toBeGreaterThan(0);
  });
});

describe("a spent hearth counts as no fire at all", () => {
  /**
   * **THE ACCURACY LADDER AND THE MAGNITUDE IT BUYS, with spent hearths standing on the board.**
   * Nothing in the winter counts fires — there is no cap on simultaneous ones and no rung reads
   * the list — and that is exactly why it is worth an assertion now that the list keeps its dead:
   * a tier is a ratio of the batch and a fire's reach is its tier's radius, whatever else is
   * standing.
   */
  it("changes no tier and no magnitude for a fire lit later", () => {
    const asked = HARD_WINTER.batch_size;
    // A board with a spent hearth on it, and the same board with none, taken to the same round.
    let withSpent = burntOut();
    let clean = createHardWinter({ era: ERA });
    for (let round = 1; round < withSpent.round; round += 1) {
      clean = idleRound(clean);
    }
    expect(clean.round).toBe(withSpent.round);
    expect(withSpent.fires.filter((f) => winterFireState(f) === "spent")).toHaveLength(1);
    expect(clean.fires).toHaveLength(0);

    // Well clear of the spent hearth, so the ward is this fire's own and not an overlap.
    const at = { col: 3, row: 1 } as const;
    withSpent = playRound(withSpent, { kind: "fire", ...at }, 2);
    clean = playRound(clean, { kind: "fire", ...at }, 2);

    expect(withSpent.last_resolution?.tier).toBe(winterTierFor(2, asked));
    expect(withSpent.last_resolution?.tier).toBe(clean.last_resolution?.tier);
    expect(withSpent.last_resolution?.magnitude).toBe(clean.last_resolution?.magnitude);
    const lit = withSpent.fires.find(
      (f) => f.col === at.col && f.row === at.row,
    ) as WinterFire;
    expect(winterFireWard(withSpent, lit).length).toBe(
      winterFireWard(clean, clean.fires[0] as WinterFire).length,
    );
    // ...and the ward the frost reads is the new fire's alone, so the spent one contributed none.
    expect(wardedWinterCells(withSpent).size).toBe(wardedWinterCells(clean).size);
  });

  /**
   * **THE CONCLUSION'S DERIVED VERDICT AND THE SCORING**, which read buildings, ground and the
   * round log and never the fires. Asserted rather than argued, because the outcome is the
   * engine's contract with the concluding screen and `winterVerdict` is derived entirely from it:
   * every field has to be identical on two boards that differ only in whether a spent hearth is
   * standing.
   */
  it("changes nothing in the outcome, the payout or the damage report", () => {
    const spentBoard = richWinter();
    const outcome = hardWinterOutcome(spentBoard);
    expect(spentBoard.fires.filter((f) => winterFireState(f) === "spent")).toHaveLength(1);
    // A burning hearth beside the spent one, so what is being removed below is the spent entry
    // and not "every fire".
    expect(spentBoard.fires.filter(winterFireIsBurning)).toHaveLength(1);

    // The same state with the spent hearth taken back out, which is what the old engine handed
    // every one of these functions.
    const asIfDeleted: HardWinterState = {
      ...spentBoard,
      fires: spentBoard.fires.filter(winterFireIsBurning),
    };
    expect(asIfDeleted.fires).toHaveLength(spentBoard.fires.length - 1);

    expect(hardWinterOutcome(asIfDeleted)).toEqual(outcome);
    expect(hardWinterDamage(asIfDeleted)).toEqual(hardWinterDamage(spentBoard));
    const payout = (state: HardWinterState) =>
      hardWinterPayoutFor({
        era: state.era,
        encounter_id: "spent-hearth",
        survived: hardWinterOutcome(state).survived,
        total: hardWinterOutcome(state).total,
        // ZERO RATHER THAN READ OFF THE OUTCOME, because the outcome no longer carries a ground
        // count: the give-up-ground action was ruled out on 2026-08-02, so the field went with it
        // and no winter can scar a cell. The PARAMETER stays required, which is the whole reason
        // it is written here explicitly rather than defaulted (see `hardWinterPayoutFor`).
        ruined_cells: 0,
        damage_points: hardWinterOutcome(state).damage_points,
      });
    expect(payout(asIfDeleted)).toEqual(payout(spentBoard));

    // Floors, so none of the three comparisons above is between two empty descriptions: this
    // winter really did happen, its verdict is derived from something on both sides of the
    // ladder, and the payout is a figure rather than a row of zeroes.
    expect(outcome.frozen_cells).toBeGreaterThan(0);
    expect(outcome.survived).toBeGreaterThan(0);
    expect(outcome.ruined.length).toBeGreaterThan(0);
    expect(outcome.recovery_cost).toBeGreaterThan(0);
    expect(payout(spentBoard).xp).toBeGreaterThan(0);
  });
});
