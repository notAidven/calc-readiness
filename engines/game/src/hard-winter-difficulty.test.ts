import { describe, expect, it } from "vitest";

import { createSeededRng } from "./citizens-rng";
import {
  canDeclareWinterAction,
  createHardWinter,
  type HardWinterState,
  hardWinterIsland,
  hardWinterOutcome,
  hardWinterReducer,
  type WinterAction,
  winterDamageBudget,
  winterLayoutById,
  winterLayouts,
} from "./hard-winter";
import { HARD_WINTER, type WinterBuildingPlacement } from "./hard-winter-tuning";

/**
 * **THE OUTCOME HAS TO VARY WITH HOW WELL THE LEARNER PLAYED, AND THIS IS WHERE THAT IS
 * MEASURED.**
 *
 * ## The defect, measured at `e3b715a` before any of this existed
 *
 * On the seven-building live board (the city the build menu's own defaults produce), ruins
 * standing after each round, four plausible lines at each uniform accuracy:
 *
 *   | line                     | 0 of 3        | 1 of 3           | 2 of 3            | 3 of 3            |
 *   |--------------------------|---------------|------------------|-------------------|-------------------|
 *   | best-covering fire       | 0,0,0,1,6,7   | 0,0,0,1,6,6      | 0,0,0,1,4,4       | 0,0,0,1,2,2       |
 *   | triage (reinforce worst) | 0,0,0,1,6,7   | 0,0,0,0,3,5      | 0,0,0,0,2,2       | 0,0,0,0,2,2       |
 *   | greedy, no pull-backs    | 0,0,0,1,6,7   | 0,0,0,0,3,4      | 0,0,0,0,3,3       | 0,0,0,0,0,0       |
 *   | random legal (mean/60)   | 0,0,0,1,6,7   | 0,0,0,.9,5,6.7   | 0,0,0,.8,3.7,5.8  | 0,0,0,.6,2.2,4.2  |
 *
 * **Every column agreed for the first four rounds**, and then the run fell off a cliff.
 * There was no band anywhere in it where the outcome varied with accuracy: the flat region
 * was flat because a ruin was the only thing the model could report, and the cliff was a
 * cliff because the deficit compounded — a fire and a shield both act on the future, so
 * neither can pay one down, and below the earn-versus-spread threshold the exact accuracy
 * underneath stopped mattering.
 *
 * ## What is asserted here, and in which currency
 *
 * **THE OUTCOME IS THE RECOVERY BILL, not the ruin count**, and that is a deliberate choice
 * rather than a convenience. Ruins alone stopped being the outcome the moment the winter
 * had three ways to lose something: a settlement can trade land for survivors (pulling
 * back), and it can come through whole and half wrecked. Measured over the seven-band
 * sweep below, a player who may pull back reaches the same 0.13 ruins at 50% accuracy and
 * at 67% — a TIE in the ruin count that is not a defect but the mid-accuracy player
 * correctly buying survivors with ground, and the two bands are 177.75 and 125.25 apart in
 * the bill.
 * `recovery_cost` is the one scalar that prices all three, it is the number the outcome
 * panel already shows, and it is denominated in the era's material, so a gap between two
 * bands can be read as practice sets.
 *
 * Four claims, each with its own instrument:
 *
 *  1. **the uniform ladder slopes** — 0, 1, 2, 3 of 3 under a competent policy, strictly
 *     decreasing in the bill and non-increasing in ruins, with the 2-of-3 band landing on
 *     the one-or-two ruins the lead set as the target;
 *  2. **a fine sweep slopes too** — seven per-question accuracy bands averaged over seeded
 *     plays, because a ladder with four rungs can be monotone by luck;
 *  3. **the early rounds carry signal** — the outcome after round four already separates
 *     every band, on a board where nothing has been ruined yet in any of them;
 *  4. **a bad opening is not a verdict** — rounds thrown away at zero accuracy cost
 *     something and doom nothing.
 *
 * Each loop carries a floor on how many plays it actually made, because every claim here is
 * a comparison across a list and a comparison across an empty list holds trivially.
 *
 * ## RE-MEASURED WITHOUT THE MEND ACTION, 2026-07-31
 *
 * The curve was tuned with four actions on the board. The lead has since ruled the fourth,
 * `repair`, out as a dominated choice, so every band above was measured again with it gone
 * from the engine and from `legalActions` below. **Every figure is identical to the digit**:
 * 390, 270, 160, 30 on the uniform ladder with gaps of 120, 110 and 130; 200, 120, 100, 30
 * at the end of round four with nothing yet ruined; `spread` 330/240/110/80, `packed`
 * 330/240/120/0, `rimward` 360/270/180/30; and both seven-band sweeps unchanged to the
 * hundredth.
 *
 * TWO OF THOSE FIGURES HAVE SINCE MOVED, and not because of the mend, so they are left as
 * the record of that comparison rather than restated: `spread`'s and `rimward`'s TOP bands
 * are 50 and 0 as of the tiered fire duration later the same day. The live board's whole
 * ladder, the round-four bands and both seven-band sweeps are still exactly as quoted.
 * `hard-winter-tuning.ts`'s `burn_rounds_by_tier` carries that measurement.
 *
 * That is not luck, and the earlier version of this file predicted it in writing: the greedy
 * policy **never declared a repair** at any accuracy on any board, because a repair's ladder
 * is the same 0/2/4/6 as a shield's and a shield raised before a bite absorbs the bite
 * outright. What makes the curve slope is that harm is GRADED, not that it was undoable.
 *
 * ## ⚑ RE-DERIVED AT THE 2026-08-02 SET, AND TWO OF THE FOUR CLAIMS ABOVE HAVE GONE
 *
 * `rounds: 3`, `damage.ruin_at: 1`, a frost that crosses the island in three rounds, and no
 * give-up-ground action. Every figure quoted above is history; what this file asserts now, and
 * what stopped being assertable, in the order the four claims are listed:
 *
 *  1. **the uniform ladder still slopes** — 420 / 300 / 240 / 60 on the live board, strictly
 *     decreasing, with survivors 0 / 2 / 3 / 6. What it no longer does is slope by a floored
 *     MAGNITUDE: the smallest gap is 60, and {@link BANDS_APART} is off by ruling;
 *  2. **the fine sweep still slopes** — seven bands, strictly ordered in the bill AND in the
 *     ruin count. There is one sweep where there were two, because the pair differed only in
 *     whether pull-backs were allowed and there is no pull-back;
 *  3. **"the early rounds carry signal" IS GONE, and it is replaced by a measurement of how
 *     much the last round decides.** At three rounds the end of round two reads 60 / 0 / 0 / 0
 *     under a re-planning policy and 60 / 60 / 60 / 60 under a fixed one. That is asserted as a
 *     census rather than quietly dropped, so a retune that gives the early rounds their signal
 *     back fails here and brings a reader to `HARD_WINTER.rounds`;
 *  4. **a bad opening still costs something and dooms nothing** — one round of three thrown
 *     away costs nothing extra, two cost one more building, and the settlement stands either
 *     way.
 *
 * **AND NOTHING IS GRADED ANY MORE**, which is the sentence the paragraph above ends on and the
 * one that inverted. `ruin_at: 1` means the only reachable damage on a standing building is
 * zero — swept and pinned as a census in *"leaves nothing standing damaged"* — so what makes
 * the curve slope is now the SHIELD and the fire's timing, both of which are bought before the
 * harm. Every bill is a whole number of 60-material rebuilds.
 */

const ERA = "prehistoric" as const;

/**
 * THE SEVEN-BUILDING LIVE BOARD — era one's six skills plus the hall, on the cells
 * `defaultPlacements` puts them.
 *
 * Written down here rather than derived because `engines/` cannot import `apps/`
 * (TS6059), the same forced mirror `LAND_GRID_CELL` documents. It is not an invention:
 * `apps/web/src/winter/liveCityLayout.test.ts`'s *"reproduces the compact board when the
 * city is built from the menu's defaults"* pins the same board through the real converter
 * over real `defaultPlacements` output, so if the city surface starts placing buildings
 * differently that test fails and this fixture is what to re-read.
 *
 * It is the board the difficulty is judged on because it is the board the game actually
 * deals: three rim bands, nothing on the shoreline, tighter than the `packed` fixture.
 */
const LIVE_BOARD: readonly WinterBuildingPlacement[] = [
  { node_id: "town-hall", col: -1, row: -1 }, // depth 4 — the heart, reached last
  { node_id: "NUM.S", col: -1, row: 1 }, // depth 3
  { node_id: "NUM.F", col: -1, row: -2 }, // depth 3
  { node_id: "NUM.2", col: 1, row: 1 }, // depth 3
  { node_id: "NUM.3", col: -2, row: -1 }, // depth 3
  { node_id: "NUM.4", col: -2, row: 0 }, // depth 3
  { node_id: "NUM.5", col: 2, row: -1 }, // depth 2 — the frost reaches it first
];

/**
 * **⚑ THE BAND-SEPARATION FLOOR IS OFF, BY RULING. IT ASSERTS NOTHING AND IS ZERO TO SAY SO.**
 *
 * ## The ruling, 2026-08-02, team lead, verbatim
 *
 * *"just relax the parameters saying there has to be ___ performance band - i need to just tune
 * it myself since whatever algo is using is making for a terrible user experience."*
 *
 * This repository's QA discipline is that a guard is not loosened without a demonstrated red,
 * and that rule is right, because it exists to stop a guard being quietly weakened to make a
 * feature fit. **This is the opposite case and it is recorded as such**: the person the guard
 * serves has ruled that it is stopping him tuning, and the loosening is the requested change
 * rather than a way round an inconvenient one.
 *
 * ## WHAT IS NO LONGER CAUGHT, precisely, because a floor of zero catches nothing
 *
 * It was a HUNDRED, derived from learner work: at ten material a practice set, a hundred
 * material of recovery is ten sets, so every step up the ladder was worth ten sets of digging
 * out. What it caught was *"a model where every band differs by a hair is monotone and no
 * better than the one it replaced"*. **That is exactly what is no longer caught.** Adjacent
 * accuracy bands may now finish a hair apart and this file will pass: measured, dropping
 * `HARD_WINTER.rebuild_cost_per_ruin` to 10 puts the live ladder on 70 / 50 / 40 / 10 with a
 * smallest gap of **10 material, one practice set**, which the hundred rejected and this
 * accepts.
 *
 * **WHAT STILL HOLDS, and it costs him nothing.** The bands must still be strictly ORDERED —
 * every step up the accuracy ladder is strictly cheaper to recover from, and the ruin count
 * never goes the wrong way. A TIE still fails, and so does an inversion. So "more accuracy is
 * never worse, and never the same" survives at full strength; only the MAGNITUDE is unpinned.
 *
 * ## IT WOULD HAVE BLOCKED THIS VERY CHANGE, which is why the relaxation is load-bearing
 *
 * At the 2026-08-02 set the live board's smallest adjacent gap is **60** against the old floor
 * of 100, so the hundred refuses the parameter set the lead asked for. Live board, competent
 * one-round-lookahead play, two actions:
 *
 *   | tuning                              | bills                | adjacent gaps     | min | 100  |
 *   |-------------------------------------|----------------------|-------------------|-----|------|
 *   | `rounds 5`, `ruin_at 6`             | 390 / 270 / 160 / 30 | 120 / 110 / 130   | 110 | pass |
 *   | `rounds 5`, `ruin_at 2`             | 420 / 300 / 190 / 60 | 120 / 110 / 130   | 110 | pass |
 *   | `rounds 4`, `ruin_at 6`             | 200 / 120 / 100 / 30 | 80 / **20** / 70  |  20 | fail |
 *   | `rounds 4`, `ruin_at 2`             | 360 / 240 / 190 / 60 | 120 / **50** / 130|  50 | fail |
 *   | **`rounds 3`, `ruin_at 1` (ships)** | 420 / 300 / 240 / 60 | 120 / **60** / 180|  60 | fail |
 *
 * **A shorter winter compresses the bands whatever the ruin threshold is**, which is the fact
 * every row of that table is evidence for: 110 at five rounds, 50 at four, 60 at three. It is
 * not payable by re-deriving anything — #362 measured that four rounds can clear a hundred by
 * setting `rebuild_cost_per_ruin` to 300, which is the same loosening with a price tag on it.
 * At `ruin_at: 1` there is no third bill to re-derive at all: every recovery bill is a whole
 * number of 60-material rebuilds, so the finest gap the model can express is 60 and a floor of
 * 100 could only ever be met by two rebuilds of separation per band.
 *
 * **The reader who wants it back should put back the number and not a smaller one**, and read
 * the row above first: 100 needs five rounds. A tuning-time floor is the wrong instrument for
 * a value the lead is iterating on by hand, which is what the ruling says.
 */
const BANDS_APART = 0;

/**
 * The same floor for the fine sweep, off under the same 2026-08-02 ruling and zero for the same
 * reason. See {@link BANDS_APART} for the ruling's words and for what a floor of zero catches.
 *
 * **THIS ONE IS NOT LOAD-BEARING FOR THE PARAMETER SET, and saying so is the honest half.** It
 * was 30, and at the shipped tuning the seven-band sweep reads 420, 362.5, 287.5, 242.5, 197.5,
 * 135 and 60, so the closest adjacent pair is **45** and the thirty would have cleared with
 * room. Relaxing it therefore catches nothing today: it is removed because the lead ruled the
 * band floors off so he can iterate, and leaving one of the pair armed would stop him at the
 * next value rather than at this one.
 *
 * WHAT IS NO LONGER CAUGHT HERE, precisely: two of the seven per-question accuracy bands may
 * average a hair apart. What still holds is the same thing the coarse ladder keeps — the seven
 * bands are strictly ordered in the bill AND strictly ordered in the ruin count, so a sweep
 * that inverted or tied anywhere still fails.
 *
 * It was also lowered to 15 and put back on 2026-08-01, for the reason recorded at
 * {@link BANDS_APART}: the four-round pair read a closest pair of 17.92, and `ruin_at: 2` alone
 * read 42.58 with pull-backs on and 38.75 with them off.
 */
const FINE_BANDS_APART = 0;

/**
 * LAYOUTS WHOSE UNIFORM LADDER HAS A STEP IT CANNOT SEPARATE, with the reason.
 *
 * See *"slopes on every authored layout too"* for the measurement, for the one-value fix that
 * would remove this entry, and for why the list is asserted in both directions.
 *
 * **`spread`'s entry is RULED rather than pending.** It was recorded on 2026-08-01 as an
 * exception with the fix costed, on the grounds that a third tuning value was the lead's to
 * take; he took it the same day and left the tie. So this is not a known defect waiting on a
 * decision, and `why` says so in the words the guard prints when it fails.
 */
const UNIFORM_LADDER_TIES: readonly { readonly id: string; readonly why: string }[] = [
  {
    id: "spread",
    why:
      "a `steady` fire's five cells over four rim bands hold the same buildings for the same " +
      "rounds as a `weak` fire's one cell does, because at `ruin_at: 1` a building the frost " +
      "reaches unsheltered is destroyed either way: one right answer in three and two of " +
      "three both finish on 240 material and four ruins of six. RULED 2026-08-01 by the team " +
      "lead that the tie stays, on a price list at five rounds, and RE-MEASURED at the " +
      "2026-08-02 set where the one-value fix has MOVED: `fire.burn_rounds_by_tier.steady: 3` " +
      "no longer removes it (a three-round winter has two later rounds for any fire to reach " +
      "into, so 2/2/2, 2/2/3, 2/3/3 and 3/3/3 are bit-identical on every board), and " +
      "`weak: 1` does, taking the smallest gap anywhere from 0 to 60. That constant's " +
      "docblock carries the new price list. Reopening this is a new ruling, not a rediscovery",
  },
];

/**
 * BOARDS ON WHICH A WRECKED OPENING LEAVES TWO BANDS INDISTINGUISHABLE, with the reason.
 *
 * See *"is still not decided once the opening rounds are thrown away"* for the measurement
 * and for why the list is asserted in both directions.
 */
const WRECKED_OPENING_TIES: readonly { readonly id: string; readonly why: string }[] = [
  {
    id: "spread",
    why:
      "the widest board the prototype deals, met after a wrecked opening: four of its " +
      "buildings go cold in the same round and one action holds at most two of them at any " +
      "tier, so answering one of three and answering two both finish on 240 material and " +
      "four ruins of six. Measured at `ruin_at: 2` at four rounds and at five, and again at " +
      "the 2026-08-02 set, so this one is the ruin threshold's doing and not the round " +
      "count's. The STEP it ties at has moved with the tuning (it was the top two bands at " +
      "four rounds and is the middle two now), which is why this list asserts that a listed " +
      "board ties SOMEWHERE rather than pinning where",
  },
];

function playRound(
  state: HardWinterState,
  action: WinterAction,
  correct: number,
): HardWinterState {
  let next = hardWinterReducer(state, { type: "declare", action });
  next = hardWinterReducer(next, {
    type: "resolve",
    correct,
    asked: HARD_WINTER.batch_size,
  });
  return hardWinterReducer(next, { type: "end_round" });
}

/**
 * Every action the board will take: a fire on any land cell, and any shield.
 *
 * **IT USED TO TAKE A `pullBacks` FLAG**, because a third action existed and half the claims
 * here were measured twice — once with the settlement allowed to trade ground for survivors and
 * once without. That action was ruled out on 2026-08-02, so there is one action space and the
 * flag is gone from every function in this file. The one place it mattered is recorded at
 * *"loses strictly fewer buildings at every accuracy"*, which was a second whole sweep and is
 * now folded into the first.
 */
function legalActions(state: HardWinterState): WinterAction[] {
  const island = hardWinterIsland(ERA);
  const candidates: WinterAction[] = island.cells.map((key) => {
    const [col, row] = key.split(",").map(Number);
    return { kind: "fire", col: col as number, row: row as number };
  });
  for (const building of state.buildings) {
    candidates.push({ kind: "reinforce", node_id: building.node_id });
  }
  return candidates.filter((action) => canDeclareWinterAction(state, action));
}

/** What putting the settlement back would cost right now: ruins, scars and ground. */
function bill(state: HardWinterState): number {
  return hardWinterOutcome(state).recovery_cost;
}

/**
 * A COMPETENT PLAYER, modelled as one-round lookahead over the recovery bill, with the
 * remaining damage budget as a tiebreak so a round that changes no bill still prefers the
 * action that leaves the settlement in better shape.
 *
 * Deliberately not a search. The claim is about what ORDINARY play reaches at each
 * accuracy, and a perfect planner would prove nothing about that — the whole failure mode
 * this file exists for is ordinary play falling off a cliff while the optimum stays
 * reachable.
 */
function competentAction(state: HardWinterState, correct: number): WinterAction {
  let best: WinterAction | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const action of legalActions(state)) {
    const after = playRound(state, action, correct);
    const headroom = after.buildings
      .filter((b) => b.state === "standing")
      .reduce((total, b) => total + winterDamageBudget(b), 0);
    const score = -bill(after) * 1000 + headroom * 10;
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  if (best === null) {
    throw new Error(`no legal action in round ${state.round}`);
  }
  return best;
}

interface Played {
  readonly bill: number;
  readonly ruins: number;
  readonly marked: number;
  /** Buildings still standing. The number the lead tunes against. */
  readonly survivors: number;
  /** The bill as it stood at the end of each round, so the early rounds can be read. */
  readonly bill_by_round: readonly number[];
  readonly ruins_by_round: readonly number[];
}

function playCompetently(
  board: readonly WinterBuildingPlacement[],
  score: (round: number) => number,
): Played {
  let state = createHardWinter({ era: ERA, buildings: board });
  const billByRound: number[] = [];
  const ruinsByRound: number[] = [];
  while (state.phase !== "ended") {
    const correct = score(state.round);
    state = playRound(state, competentAction(state, correct), correct);
    billByRound.push(bill(state));
    ruinsByRound.push(state.buildings.filter((b) => b.state === "ruin").length);
  }
  const outcome = hardWinterOutcome(state);
  return {
    bill: outcome.recovery_cost,
    ruins: outcome.ruined.length,
    marked: outcome.damaged.length,
    survivors: outcome.survived,
    bill_by_round: billByRound,
    ruins_by_round: ruinsByRound,
  };
}

/** Play at a fixed score every round: the four rungs the tier ladder is built for. */
function atUniform(board: readonly WinterBuildingPlacement[], correct: number): Played {
  return playCompetently(board, () => correct);
}

/** Every adjacent gap in a list, so "monotone" and "apart" are one measurement. */
function gaps(values: readonly number[]): number[] {
  return values.slice(1).map((value, index) => (values[index] as number) - value);
}

/* -------------------------------------------------------------------------- */
/* 1. The uniform ladder                                                      */
/* -------------------------------------------------------------------------- */

describe("the outcome slopes with accuracy on the board the game deals", () => {
  it("costs strictly less to recover from at every step up the ladder", () => {
    const bands = [0, 1, 2, 3].map((correct) => atUniform(LIVE_BOARD, correct));
    expect(bands).toHaveLength(HARD_WINTER.batch_size + 1);

    const bills = bands.map((band) => band.bill);
    const readable = JSON.stringify(
      bands.map((band, index) => ({
        correct: index,
        bill: band.bill,
        ruins: band.ruins,
        marked: band.marked,
      })),
    );

    // MONOTONE, strictly, in the scalar that prices every way the settlement can lose
    // something. Measured: 420, 300, 240, 60.
    for (const gap of gaps(bills)) {
      expect(gap, readable).toBeGreaterThan(0);
    }
    // THE MAGNITUDE FLOOR IS OFF, and this line is the tripwire on the RULING rather than on
    // the ladder. A floor of zero is not a guard, so there is no `toBeGreaterThanOrEqual` here
    // to read as one; what is asserted is that the floor is still the value the lead ruled, so
    // re-tightening it fails here and sends the reader to the constant's docblock first.
    // Measured smallest gap at the shipped set: 60, against the 100 that was.
    expect(
      BANDS_APART,
      "re-tightening the band floor is the lead's call: read the ruling",
    ).toBe(0);
    // Ruins never go the wrong way either, and here they are strictly ordered rather than
    // merely non-increasing. Measured: 7, 5, 4, 1 of 7.
    for (const gap of gaps(bands.map((band) => band.ruins))) {
      expect(gap, readable).toBeGreaterThan(0);
    }
    // AND THE NUMBER THE LEAD WILL TUNE AGAINST, pinned as a census rather than described:
    // survivors of seven at 0, 1, 2 and 3 right answers in three. This is the read-out the
    // 2026-08-02 set was chosen for, so it fails on any retune rather than drifting.
    expect(
      bands.map((band) => band.survivors),
      readable,
    ).toEqual([0, 2, 3, 6]);
  });

  /**
   * **NOTHING IS EVER LEFT STANDING AND DAMAGED, and this is the census that says so rather
   * than a silence.**
   *
   * `HARD_WINTER.damage.ruin_at` is 1 (ruled 2026-08-02: *"frost should instantly destroy
   * buildings"*), so a building absorbs the round's whole bite into its shield or it is gone.
   * Half of this file's original subject was the GRADED middle of that, and it has no values in
   * it any more.
   *
   * Asserted as a census over the reachable set and not as *"no damaged buildings appear in the
   * ladder"*, because the second is a claim about four plays and this is a claim about the model:
   * the sweep collects every damage value a standing building carries anywhere in a whole winter,
   * on every board, at every accuracy, under a line that spends every round reinforcing one
   * target — which is the line most likely to produce a survivor with a scar. There is exactly
   * one value in the set and it is zero.
   *
   * A `ruin_at` with room in it fails here, which is the point: it is the one assertion that
   * brings a reader to `HARD_WINTER.damage.ruin_at` before they conclude the mend ladder is
   * broken.
   */
  it("leaves nothing standing damaged, on any board at any accuracy", () => {
    const boards: readonly (readonly WinterBuildingPlacement[])[] = [
      LIVE_BOARD,
      ...winterLayouts().map((layout) => layout.buildings),
    ];
    expect(boards.length, "no boards to sweep").toBeGreaterThanOrEqual(4);

    const reachable = new Set<number>();
    let swept = 0;
    for (const board of boards) {
      for (const target of board) {
        for (const correct of [0, 1, 2, 3]) {
          let state = createHardWinter({ era: ERA, buildings: board });
          while (state.phase !== "ended") {
            const shield: WinterAction = { kind: "reinforce", node_id: target.node_id };
            state = playRound(
              state,
              // A ruin cannot be reinforced, so the line falls back to a fire on the shore
              // rather than declaring something the board would refuse.
              canDeclareWinterAction(state, shield)
                ? shield
                : { kind: "fire", col: 4, row: 0 },
              correct,
            );
          }
          for (const building of state.buildings) {
            if (building.state === "standing") {
              reachable.add(building.damage);
            }
          }
          swept += 1;
        }
      }
    }
    // A floor, because a census over an empty sweep is a census of nothing.
    expect(swept).toBe(boards.reduce((total, board) => total + board.length, 0) * 4);
    expect(reachable.size, "nothing survived anywhere in the sweep").toBeGreaterThan(0);

    // THE CENSUS. Zero is the only damage a standing building can carry.
    expect([...reachable].sort((a, b) => a - b)).toEqual([0]);
    // And the same fact read off the outcome, which is what the surface renders.
    for (const board of boards) {
      for (const correct of [0, 1, 2, 3]) {
        expect(atUniform(board, correct).marked).toBe(0);
      }
    }
  });

  /**
   * **WHERE A STEADY TWO-OF-THREE LEARNER ENDS UP. THIS IS THE NUMBER THE LEAD TUNES AGAINST,
   * and it is now the harshest it has been.**
   *
   * The history of the target, because it has moved three times and each move was a ruling:
   *
   *  - **the original**, the lead's own words: *"one or two ruins on the seven-building board, a
   *    real scar, clearly better than playing badly, and fully recoverable"*;
   *  - **`ruin_at: 2` (2026-08-01)** put that learner on three of seven and a bill of 190, over
   *    the three-rebuild bound this test used to read. Superseded rather than missed;
   *  - **the 2026-08-02 set** puts them on **four ruins of seven, three survivors, and a bill of
   *    240** — four whole rebuilds, and no scar anywhere, because at `ruin_at: 1` there is no
   *    such thing. The ruin count barely moved and the bill rose, which is what losing the scar
   *    costs: a scar was 10 material and a rebuild is 60.
   *
   * What is asserted is everything the original target was protecting that is still true at
   * three rounds: **the settlement is not routed, the bill is recoverable, and the band sits
   * strictly between playing badly and playing perfectly in both currencies.** Each bound is
   * placed against the measured value rather than left where it was, so a retune that made this
   * band materially worse fails here.
   *
   * The two comparisons at the bottom are denominated in REBUILDS rather than in
   * {@link BANDS_APART}, and that is deliberate: they were written against a floor that is now
   * off by ruling, and a bound of zero would have made them assert nothing. A rebuild is the
   * finest unit the model can express at `ruin_at: 1`, so it is the right denomination for a
   * claim about how far apart two bands are.
   */
  it("leaves a steady two-of-three learner half a settlement and a recoverable bill", () => {
    const steady = atUniform(LIVE_BOARD, 2);

    // Measured: 4 ruins of 7, 3 standing, and a 240 bill.
    expect(steady.ruins, JSON.stringify(steady)).toBeGreaterThanOrEqual(1);
    expect(steady.ruins, JSON.stringify(steady)).toBeLessThanOrEqual(4);
    // **THE SETTLEMENT IS NOT ROUTED**, which is the half of the target that separates a
    // setback from a wipe. It was "most of it comes through" at five rounds and is now "some of
    // it does": three of seven stand, so the bound is a real floor rather than a majority.
    expect(steady.survivors, JSON.stringify(steady)).toBeGreaterThanOrEqual(3);
    expect(steady.survivors + steady.ruins).toBe(LIVE_BOARD.length);
    // And it is recoverable: the bill is at most four rebuilds, which at ten material a practice
    // set is inside what remains of an era's work (D-CRISIS-12). It was under three at
    // `ruin_at: 6`, 190 at `ruin_at: 2`, and is exactly four rebuilds now.
    expect(steady.bill).toBeLessThanOrEqual(HARD_WINTER.rebuild_cost_per_ruin * 4);

    // Clearly better than playing badly, and clearly worse than playing perfectly. This is
    // the pair of comparisons the old model could not make: at `e3b715a` a steady 2-of-3
    // learner and a learner answering everything wrong both finished on seven ruins.
    // Measured: 7 ruins and 420 against 1 ruin and 60.
    const hopeless = atUniform(LIVE_BOARD, 0);
    const perfect = atUniform(LIVE_BOARD, 3);
    expect(hopeless.ruins - steady.ruins).toBeGreaterThanOrEqual(3);
    expect(hopeless.bill - steady.bill).toBeGreaterThanOrEqual(
      HARD_WINTER.rebuild_cost_per_ruin * 3,
    );
    // PERFECT PLAY DOES NOT MEAN A CLEAN BOARD ON THE LIVE ONE UNDER ORDINARY PLAY, and that is
    // `ruin_at`'s doing: five of its seven buildings go cold in the same round and every one of
    // them dies on the round it is left uncovered, so the one-round-lookahead policy loses one.
    // It is not a ceiling — a hand-authored plan brings the board through, and
    // `hard-winter-layouts.test.ts`'s witnesses do it on every authored layout. Measured at
    // three, four and five rounds: one ruin at each.
    expect(perfect.ruins, JSON.stringify(perfect)).toBeLessThanOrEqual(1);
    expect(steady.ruins - perfect.ruins).toBeGreaterThan(0);
    expect(steady.bill - perfect.bill).toBeGreaterThanOrEqual(
      HARD_WINTER.rebuild_cost_per_ruin * 3,
    );
  });

  /**
   * The same ladder on the three authored layouts, so the slope is a property of the model
   * rather than of one board. The population is derived from the tuning table.
   *
   * ## ONE BOARD DOES NOT SEPARATE, AND IT IS NAMED RATHER THAN ABSORBED
   *
   * Measured at the 2026-08-02 set: `packed` 360/240/180/0 and `rimward` 360/240/180/60 both
   * slope strictly, and **`spread` reads 360 / 240 / **240** / 120** — one right answer in
   * three and two of three reach the same bill and the same four ruins of six. The reason is
   * `ruin_at: 1` rather than the board: a `steady` fire covers five cells for two rounds, which
   * on four rim bands holds exactly the same buildings for exactly as long as a `weak` one holds
   * its single cell for, once every building the frost reaches unsheltered is destroyed rather
   * than scarred. It has survived every round count since: at `rounds: 4` this board separated
   * at every step (300/240/120/70), at five it tied, and at three it ties.
   *
   * **THERE IS A ONE-VALUE FIX, IT HAS MOVED, AND IT IS COSTED AT BOTH ADDRESSES.** At five
   * rounds it was `fire.burn_rounds_by_tier.steady: 3`. At three rounds that value changes
   * nothing on any board — a three-round winter has two later rounds for any fire to reach into,
   * so 2/2/2, 2/2/3, 2/3/3 and a flat 3 are bit-identical — and the value that removes the tie
   * is **`weak: 1`**, which takes the smallest gap anywhere from 0 to 60. That is the exact
   * inverse of the five-round finding, where `weak: 1` broke a floor of 100. The new price list
   * is in that constant's docblock. It is declined for the reason `steady: 3` was declined on
   * 2026-08-01: the lead ruled four values on 2026-08-02 and a fifth would ride along unruled,
   * and he asked in the same message to be left free to tune this himself.
   *
   * **So this tie is priced and accepted, not missed**, and that distinction is the whole
   * reason the ruling is written down: the next person to measure this board will find a step
   * that does not separate, and what they need to know first is that somebody already did.
   *
   * The list is asserted in BOTH directions, so it cannot rot: a listed layout that starts
   * separating strictly fails (the exemption is stale and belongs deleted, which is how it
   * would be noticed if `steady: 3` ever lands after a later ruling), and an unlisted layout
   * that ties fails.
   */
  it("slopes on every authored layout too, not only on the live one", () => {
    const layouts = winterLayouts();
    expect(layouts.length, "one layout is not a range of layouts").toBeGreaterThanOrEqual(
      3,
    );
    // The exception list only ever names real layouts, so a rename cannot leave a dead entry
    // excusing nothing.
    for (const entry of UNIFORM_LADDER_TIES) {
      expect(() => winterLayoutById(entry.id), entry.id).not.toThrow();
      expect(entry.why.length, `${entry.id} needs a reason`).toBeGreaterThan(60);
    }
    const ties = new Set(UNIFORM_LADDER_TIES.map((entry) => entry.id));

    let measured = 0;
    let separating = 0;
    for (const layout of layouts) {
      const bills = [0, 1, 2, 3].map(
        (correct) => atUniform(layout.buildings, correct).bill,
      );
      const readable = `${layout.id}: ${JSON.stringify(bills)}`;
      if (ties.has(layout.id)) {
        // The other direction: a listed layout MUST still have a step it cannot separate.
        expect(
          gaps(bills).filter((gap) => gap <= 0).length,
          `${readable} — a declared exception that now slopes strictly at every step`,
        ).toBeGreaterThan(0);
        // And it is a TIE and never an inversion: more accuracy is never worse.
        for (const gap of gaps(bills)) {
          expect(gap, readable).toBeGreaterThanOrEqual(0);
        }
      } else {
        for (const gap of gaps(bills)) {
          expect(gap, readable).toBeGreaterThan(0);
        }
        separating += 1;
      }
      // The end-to-end drop is most of a settlement on every board, so no layout is
      // monotone by a hair. **THIS IS THE ONE MAGNITUDE BOUND IN THE FILE THAT SURVIVED THE
      // 2026-08-02 RULING**, because it is denominated in rebuilds rather than in
      // `BANDS_APART`: the lead ruled the per-STEP floor off, not the end-to-end span, and a
      // ladder whose two ends are four rebuilds apart is a ladder. Measured: 240 on `spread`,
      // 360 on `packed`, 300 on `rimward`. It read 290/360/360 at five rounds and 280/330/360
      // at `ruin_at: 6`, so the bound comes down from four rebuilds to four, held.
      expect(
        (bills[0] as number) - (bills[bills.length - 1] as number),
        readable,
      ).toBeGreaterThanOrEqual(HARD_WINTER.rebuild_cost_per_ruin * 4);
      measured += 1;
    }
    expect(measured).toBe(layouts.length);
    // Floors on the unexcused population, so the exception list cannot grow until no board
    // is required to slope at all.
    expect(separating, "every layout is excused, so this sweep asserts nothing").toBe(
      layouts.length - UNIFORM_LADDER_TIES.length,
    );
    expect(separating).toBeGreaterThanOrEqual(2);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. The fine sweep                                                          */
/* -------------------------------------------------------------------------- */

describe("the slope survives a finer sweep than the tier ladder", () => {
  /**
   * SEVEN BANDS RATHER THAN FOUR, because a four-rung ladder can come out monotone by
   * luck, and because a real learner is not a fixed score — they answer each question with
   * some probability and meet a mixture of tiers. Each band is the mean over seeded plays
   * of a per-question coin at that accuracy.
   *
   * ## ONE SWEEP WHERE THERE WERE TWO, and the pair is worth an explanation
   *
   * There used to be two of these, differing only in whether the policy was allowed to trade
   * ground for survivors: one with pull-backs ON asserting the BILL, and one with them OFF
   * asserting the RUIN COUNT. The pair existed because the bill absorbed one honest inversion —
   * measured over the seven bands, a player who may pull back reached the same 0.13 ruins at 50%
   * accuracy and at 67%, which was the mid-accuracy player correctly buying survivors with
   * ground rather than the model misbehaving.
   *
   * **The give-up-ground action was ruled out on 2026-08-02, so there is one action space and
   * the two sweeps became the same sweep.** They are merged rather than one being deleted,
   * because both instruments still matter and both now hold on the same run: the bill is the
   * outcome, and the ruin count is the evidence that nothing about it is absorbing an inversion.
   */
  it("costs strictly less and loses strictly fewer buildings at every one of seven accuracies", () => {
    const accuracies = [0, 1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6, 1];
    const seeds = 24;
    let plays = 0;

    const bands = accuracies.map((p) => {
      let total = 0;
      let ruins = 0;
      for (let seed = 1; seed <= seeds; seed += 1) {
        const rng = createSeededRng(seed * 104_729);
        const played = playCompetently(LIVE_BOARD, () => {
          let correct = 0;
          for (let question = 0; question < HARD_WINTER.batch_size; question += 1) {
            if (rng() < p) {
              correct += 1;
            }
          }
          return correct;
        });
        total += played.bill;
        ruins += played.ruins;
        plays += 1;
      }
      return {
        accuracy: Math.round(p * 100),
        bill: Math.round((total / seeds) * 100) / 100,
        ruins: Math.round((ruins / seeds) * 100) / 100,
      };
    });

    // Floor: the sweep really played 168 winters and not zero.
    expect(plays).toBe(accuracies.length * seeds);
    expect(bands).toHaveLength(7);

    const readable = JSON.stringify(bands);
    // THE BILL, strictly down at every step. Measured: 420, 362.5, 287.5, 242.5, 197.5, 135, 60.
    for (const gap of gaps(bands.map((band) => band.bill))) {
      expect(gap, readable).toBeGreaterThan(0);
    }
    // AND THE RUIN COUNT, strictly down at every step too, which is the half that used to need
    // its own sweep. Measured: 7, 6.04, 4.79, 4.04, 3.29, 2.25, 1 on average.
    for (const gap of gaps(bands.map((band) => band.ruins))) {
      expect(gap, readable).toBeGreaterThan(0);
    }
    // THE MAGNITUDE FLOOR IS OFF HERE TOO, and this is the tripwire on that ruling rather than
    // on the sweep. Unlike `BANDS_APART`, relaxing this one catches nothing at the shipped set:
    // the closest adjacent pair is 45 against the 30 that was, so the floor would have cleared.
    // See the constant for why it is relaxed anyway.
    expect(
      FINE_BANDS_APART,
      "re-tightening the fine-sweep floor is the lead's call: read the ruling",
    ).toBe(0);
    // End to end, the sweep spans six rebuilds of separation. Measured: 420 down to 60, which
    // is 360, and denominated in rebuilds because that is the finest unit the model has.
    expect(
      (bands[0] as { bill: number }).bill -
        (bands[bands.length - 1] as { bill: number }).bill,
      readable,
    ).toBeGreaterThanOrEqual(HARD_WINTER.rebuild_cost_per_ruin * 5);
    // And every band is genuinely apart in BUILDINGS, not only in material. Measured span: 6, from
    // 7 average ruins to 1. It read 6 at five rounds by a different route (7 to 1) and 6 at
    // `ruin_at: 6` (6 to 0), so the span has been the same six across all three tunings.
    expect(
      (bands[0] as { ruins: number }).ruins -
        (bands[bands.length - 1] as { ruins: number }).ruins,
      readable,
    ).toBeGreaterThanOrEqual(LIVE_BOARD.length - 1);
  }, 120_000);

  /**
   * **IS IT STILL A CURVE, OR IS IT A COIN FLIP? THE ANSWER IS BOTH, AND WHICH ONE DEPENDS ON
   * WHETHER YOU ARE ASKING ABOUT A LEARNER OR ABOUT A RUN.**
   *
   * The lead asked for `rounds: 3` and will tune again, so this is the read-out to tune against.
   * The sweeps above are MEANS, and a mean is compatible with a great many distributions — at
   * three rounds one wrong batch is a third of the encounter, so the question of how wide a band
   * is has an answer that only spread can give.
   *
   * Measured, survivors of seven over 40 seeded plays a band, competent play, two actions:
   *
   *   | accuracy | mean | sd   | min | max |
   *   |----------|------|------|-----|-----|
   *   |    0%    | 0.00 | 0.00 |  0  |  0  |
   *   |   33%    | 2.17 | 1.05 |  0  |  4  |
   *   |   50%    | 3.05 | 1.30 |  0  |  6  |
   *   |   67%    | 3.73 | 1.36 |  1  |  6  |
   *   |  100%    | 6.00 | 0.00 |  6  |  6  |
   *
   * **THE MEANS ARE A CURVE AND THE ENDS ARE CERTAIN.** Nobody at 0% keeps a building and nobody
   * at 100% loses more than the one the policy cannot save, in 40 plays each, with zero variance
   * at both ends. So accuracy decides the encounter.
   *
   * **AND A SINGLE MIDDLE RUN IS NOT A READ-OUT OF ACCURACY**, which is the honest other half: at
   * 50% the range is the whole board, 0 to 6, and adjacent middle bands overlap heavily (33% tops
   * out at 4 where 50% bottoms out at 0). A learner at 50% cannot predict what they will finish
   * with. That is three rounds rather than a defect — the same coin at five rounds had more beats
   * to average over — and it is asserted in BOTH directions so it cannot drift unnoticed: the
   * means must separate, and the overlap must still be there. A retune that removes the overlap
   * fails here, which is the failure the next person tuning this wants.
   */
  it("separates the bands in the mean while a single middle run stays a lottery", () => {
    const seeds = 40;
    const bands = [0, 1 / 3, 1 / 2, 2 / 3, 1].map((p) => {
      const survivors: number[] = [];
      for (let seed = 1; seed <= seeds; seed += 1) {
        const rng = createSeededRng(seed * 104_729);
        survivors.push(
          playCompetently(LIVE_BOARD, () => {
            let correct = 0;
            for (let question = 0; question < HARD_WINTER.batch_size; question += 1) {
              if (rng() < p) {
                correct += 1;
              }
            }
            return correct;
          }).survivors,
        );
      }
      const mean = survivors.reduce((a, b) => a + b, 0) / survivors.length;
      return {
        accuracy: Math.round(p * 100),
        mean: Math.round(mean * 100) / 100,
        sd:
          Math.round(
            Math.sqrt(survivors.reduce((t, v) => t + (v - mean) ** 2, 0) / seeds) * 100,
          ) / 100,
        min: Math.min(...survivors),
        max: Math.max(...survivors),
      };
    });
    // Floors, because every comparison below is across this list.
    expect(bands).toHaveLength(5);
    expect(seeds).toBeGreaterThanOrEqual(24);

    const readable = JSON.stringify(bands);
    // 1. THE MEANS SEPARATE, by more than half a building at every step. Measured smallest step:
    //    0.88, between 33% and 50%. Negated through `gaps`, which is written for the BILL and so
    //    reads a falling series; survivors rise.
    for (const gap of gaps(bands.map((band) => -band.mean))) {
      expect(gap, readable).toBeGreaterThan(0.5);
    }
    // 2. THE ENDS ARE CERTAIN, in both currencies: no spread at all, and the values are the ones
    //    the ladder above pins. This is what makes "accuracy decides it" a fact about every run
    //    and not about the average of forty.
    expect(bands[0], readable).toMatchObject({ mean: 0, sd: 0, min: 0, max: 0 });
    expect(bands[4], readable).toMatchObject({ mean: 6, sd: 0, min: 6, max: 6 });
    // 3. AND THE MIDDLE OVERLAPS, pinned as a fact rather than left as a silence. Every middle
    //    band's range must still reach into its neighbour's, so the sentence "one run is not a
    //    read-out of a learner" stays true or this fails and says so.
    for (const index of [1, 2]) {
      const lower = bands[index] as { max: number; accuracy: number };
      const upper = bands[index + 1] as { min: number };
      expect(
        upper.min,
        `${readable} — the ${lower.accuracy}% and next bands no longer overlap, so a single run now reads a learner's accuracy`,
      ).toBeLessThanOrEqual(lower.max);
    }
    // ...and the spread is real rather than one unlucky seed: a whole building of standard
    // deviation in every middle band. Measured: 1.05, 1.30, 1.36.
    for (const index of [1, 2, 3]) {
      expect((bands[index] as { sd: number }).sd, readable).toBeGreaterThan(0.9);
    }
  }, 120_000);
});

/* -------------------------------------------------------------------------- */
/* 3. The last round decides most of it                                       */
/* -------------------------------------------------------------------------- */

/**
 * **THE EARLY ROUNDS NO LONGER CARRY SIGNAL, AND THIS SECTION MEASURES HOW MUCH THEY LOST.**
 *
 * It was titled *"the early rounds carry signal, and half of what they carried is gone"*, and it
 * asserted that the end of round four separated all four accuracy bands one round before the
 * winter ended. Both halves are gone at the 2026-08-02 set, for two independent reasons that
 * compound:
 *
 *  - **`rounds: 3` leaves one round before the last one.** There is no round four to read;
 *  - **the frost reaches nothing but the shore in round one.** `spread.base` is 1, so round one
 *    freezes the 28-cell rim band, and era one's buildings are placed nearest-the-centre-first,
 *    which puts every one of them in band 2 or deeper. So on the live board the FIRST round in
 *    which any building can be lost is round two, and only one can be.
 *
 * Measured, the recovery bill at the end of round two across 0, 1, 2 and 3 right answers:
 * **60 / 0 / 0 / 0** under a policy that re-plans every round, and **60 / 60 / 60 / 60** under a
 * fixed line. Three of the four bands are indistinguishable until the final beat, and under a
 * line that does not adapt all four are.
 *
 * **THIS IS ASSERTED AS A CENSUS RATHER THAN DROPPED**, which is the whole reason the section
 * still exists: a retune that gives the early rounds their signal back FAILS here, and the
 * failure is what brings a reader to `HARD_WINTER.rounds` — where the price of three rounds is
 * itemised and this is item two of four — instead of to a test that quietly stopped checking.
 */
describe("the last round decides most of the winter, and that is measured rather than assumed", () => {
  /**
   * The round before the last one, under the competent policy. One band separates and three do
   * not, and the pinned census is which.
   */
  it("separates only the band that answers nothing, one round before the end", () => {
    const bands = [0, 1, 2, 3].map((correct) => atUniform(LIVE_BOARD, correct));
    const round = HARD_WINTER.rounds - 1;
    expect(round, "a winter of one round has none before its last").toBeGreaterThanOrEqual(
      1,
    );

    const penultimate = bands.map((band) => band.bill_by_round[round - 1] as number);
    const ruinsThen = bands.map((band) => band.ruins_by_round[round - 1] as number);
    const readable = JSON.stringify({ bill: penultimate, ruins: ruinsThen });

    // THE CENSUS. This line read `expect(new Set(atFour).size).toBe(4)` at five rounds, over
    // bills of 360 / 240 / 190 / 60. Pinned as values rather than as a count, so a retune that
    // separates two of the top three fails here rather than passing a loosened cardinality.
    expect(penultimate, readable).toEqual([60, 0, 0, 0]);
    expect(ruinsThen, readable).toEqual([1, 0, 0, 0]);

    // What survives of the original claim, and it is worth keeping on its own: the band that
    // answers nothing is ALREADY distinguishable before the last round, so a player who is
    // wrecked finds out with a round left to spend rather than at the end.
    expect(penultimate[0] as number, readable).toBeGreaterThan(0);
    expect(penultimate[3] as number, readable).toBe(0);

    // And nothing is cold at all in round one, on this board, at any accuracy — so there is
    // nothing for a difficulty model of any shape to report from it. The frost takes the rim in
    // round one and this board's nearest building is two bands in.
    const first = bands.map((band) => band.bill_by_round[0] as number);
    expect(first, JSON.stringify(first)).toEqual([0, 0, 0, 0]);
  });

  /**
   * The same claim under a line that does not adapt, because the one above is measured with a
   * policy that re-plans every round and a signal only a planner can see is not a signal a player
   * gets. **Under a fixed line the penultimate round separates NOTHING**, and the ladder arrives
   * entirely on the last beat.
   *
   * That is the sharper half of the finding and it is asserted in both directions: nothing
   * separates at the end of round two, and every band separates by the end. A fixed line still
   * reaches four distinct bills, which is what stops this reading as "the encounter is a coin
   * flip" — the accuracy is worth 300 material to a player who never re-plans at all.
   */
  it("separates every band by the END under a fixed line, and none of them before it", () => {
    const island = hardWinterIsland(ERA);

    const bestCoveringFire = (state: HardWinterState): WinterAction => {
      let best: WinterAction = { kind: "fire", col: 0, row: 0 };
      let bestCovered = -1;
      for (const key of island.cells) {
        const [col, row] = key.split(",").map(Number);
        const action: WinterAction = {
          kind: "fire",
          col: col as number,
          row: row as number,
        };
        if (!canDeclareWinterAction(state, action)) {
          continue;
        }
        const radius = HARD_WINTER.fire.radius_by_tier.strong as number;
        const covered = state.buildings.filter(
          (b) =>
            b.state === "standing" &&
            (b.col - (col as number)) ** 2 + (b.row - (row as number)) ** 2 <=
              radius * radius,
        ).length;
        if (covered > bestCovered) {
          bestCovered = covered;
          best = action;
        }
      }
      return best;
    };

    let played = 0;
    const penultimate: number[] = [];
    const final: number[] = [];
    for (const correct of [0, 1, 2, 3]) {
      let state = createHardWinter({ era: ERA, buildings: LIVE_BOARD });
      const byRound: number[] = [];
      while (state.phase !== "ended") {
        state = playRound(state, bestCoveringFire(state), correct);
        byRound.push(bill(state));
      }
      expect(byRound).toHaveLength(HARD_WINTER.rounds);
      penultimate.push(byRound[HARD_WINTER.rounds - 2] as number);
      final.push(byRound[HARD_WINTER.rounds - 1] as number);
      played += 1;
    }
    expect(played).toBe(4);

    // NOTHING SEPARATES BEFORE THE LAST ROUND. A census, so a retune that gives a fixed line
    // early signal fails here. Measured: 60 at all four accuracies. It read 200/200/140/80 at
    // `ruin_at: 6` and 360/360/240/120 at five rounds with `ruin_at: 2`.
    expect(new Set(penultimate).size, JSON.stringify(penultimate)).toBe(1);
    expect(penultimate, JSON.stringify(penultimate)).toEqual([60, 60, 60, 60]);

    // AND EVERY BAND SEPARATES BY THE END, which is the half that says the encounter is not a
    // coin flip for a player who never re-plans. Measured: 420, 360, 240, 120 — four distinct
    // values, strictly ordered, five rebuilds end to end.
    const readable = JSON.stringify(final);
    expect(new Set(final).size, readable).toBe(4);
    for (const gap of gaps(final)) {
      expect(gap, readable).toBeGreaterThan(0);
    }
    expect((final[0] as number) - (final[3] as number), readable).toBeGreaterThanOrEqual(
      HARD_WINTER.rebuild_cost_per_ruin * 5,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 4. No dead ends                                                            */
/* -------------------------------------------------------------------------- */

describe("a bad opening costs something and dooms nothing", () => {
  /**
   * THE OTHER HALF OF THE COMPOUNDING FIX, and the one the brief was most worried about: a
   * poor start must not compound into the same failure by a new route.
   *
   * What carries it is that harm is GRADED and that a shield absorbs a whole bite, so a
   * round played well after a round played badly buys a proportional reduction rather than
   * failing to clear a threshold. Rounds thrown away at zero accuracy therefore cost a scar
   * and not the settlement.
   */
  it("lets a learner who starts badly and then plays well come through", () => {
    /*
     * **THE POPULATION IS EVERY OPENING THAT IS STILL AN OPENING, DERIVED FROM THE ROUND
     * COUNT.** It read `[0, 1, 2, 3]` against a winter of five rounds. At three rounds, three wasted
     * rounds is the WHOLE winter answered at zero accuracy — not a bad opening — and asserting
     * that it leaves the settlement standing would be asserting the opposite of what
     * `HARD_WINTER.rounds` records. So the range is derived: every count strictly below the round
     * count, which is 0, 1 and 2 here and would be 0..4 at five rounds.
     */
    const openings = Array.from({ length: HARD_WINTER.rounds }, (_, wasted) => wasted);
    expect(openings, "a winter of one round has no opening to waste").toHaveLength(
      HARD_WINTER.rounds,
    );
    expect(openings[openings.length - 1]).toBeLessThan(HARD_WINTER.rounds);

    let measured = 0;
    const results = openings.map((wasted) => {
      const played = playCompetently(LIVE_BOARD, (round) =>
        round <= wasted ? 0 : HARD_WINTER.batch_size,
      );
      measured += 1;
      return { wasted, bill: played.bill, ruins: played.ruins };
    });
    expect(measured).toBe(openings.length);

    const readable = JSON.stringify(results);
    /*
     * **A WASTED ROUND COSTS WHATEVER THE FROST REACHES DURING IT, and the assertion has moved
     * twice.**
     *
     * It read `expect(result.ruins).toBe(0)` over every line, and that was true at
     * `ruin_at: 6`: a thrown-away round left a scar the rest of the winter could out-earn,
     * measured at 30, 30, 30, 80 material owed and no ruin anywhere. `ruin_at: 2` ended that —
     * a round thrown away while the frost is on a building IS that building — and read 60, 60,
     * 60, 120 over five rounds with one ruin, one, one and two.
     *
     * At the 2026-08-02 set it reads **60, 60, 120** with one ruin, one and two. The shape is
     * identical to the five-round measurement with the two longest lines removed, which is the
     * finding worth keeping: **the first wasted round costs NOTHING extra**, because ordinary
     * play loses the shoreline building on this board anyway, and the second costs one more.
     *
     * The claim the block is titled for is asserted in the currency that carries it: a bad
     * opening costs a building or two out of seven, never the settlement, and the worst opening
     * available is still far cheaper than a whole winter answered badly.
     */
    for (const result of results) {
      expect(result.ruins, readable).toBeLessThanOrEqual(2);
      expect(LIVE_BOARD.length - result.ruins, readable).toBeGreaterThanOrEqual(5);
    }
    // A wasted round is never an improvement.
    for (const gap of gaps(results.map((result) => result.bill))) {
      expect(gap, readable).toBeLessThanOrEqual(0);
    }
    const worst = results[results.length - 1] as { bill: number };
    const weakAllThrough = atUniform(LIVE_BOARD, 1);
    expect(
      worst.bill,
      `${readable} against ${weakAllThrough.bill} for a whole winter at 1 of 3`,
    ).toBeLessThan(weakAllThrough.bill);
    // And the whole spread of openings is worth one rebuild of difference, so "answerable" is a
    // measurement rather than a hope. Measured: 60 against 120.
    expect(
      worst.bill - (results[0] as { bill: number }).bill,
      readable,
    ).toBeLessThanOrEqual(HARD_WINTER.rebuild_cost_per_ruin);
  });

  /**
   * **THE WINTER IS STILL NOT DECIDED ONCE THE OPENING ROUNDS ARE THROWN AWAY, and this is
   * the claim the removed mend action makes the encounter owe.**
   *
   * With a repair on the board, an early deficit was payable: a bad round could be undone by
   * a later good one. With it gone, `damage` only ever accumulates, so the worry the lead
   * raised is that two poor rounds settle the outcome and everything after them is theatre.
   *
   * ## The instrument, and why the obvious one is not it
   *
   * The obvious measurement is "a wasted opening costs little", which the test above already
   * makes. It is the wrong instrument for THIS question, because a cost is not a verdict: a
   * board can be dearer to recover and still be entirely in the player's hands. The claim
   * here is the one that actually means "not decided" — hold the first two rounds at ZERO
   * accuracy, so the player arrives at round three in the worst state the winter can put them
   * in, and then ask whether the remaining rounds still separate.
   *
   * They did, strictly, on every board. Measured with repair removed, at `rounds: 5` and
   * `ruin_at: 6`, with the first TWO rounds thrown away:
   *
   *   | board     | 0 of 3 | 1 of 3 | 2 of 3 | 3 of 3 | span |
   *   |-----------|--------|--------|--------|--------|------|
   *   | live      |    390 |    300 |    160 |     30 |  360 |
   *   | `spread`  |    330 |    250 |    180 |    150 |  180 |
   *   | `packed`  |    330 |    250 |    120 |      0 |  330 |
   *   | `rimward` |    360 |    260 |    160 |    110 |  250 |
   *
   * ## HOW MANY ROUNDS A "WRECKED OPENING" IS, DERIVED RATHER THAN PINNED
   *
   * It threw away the first TWO of five, which is 40% of the winter. At three rounds two is 67%
   * of it and leaves a single round, and measured there the sweep degenerates: `spread` reads
   * 360 / 300 / 300 / 300 and `rimward` 360 / 300 / 300 / 240, so three of the four boards would
   * need excusing and the claim would be excused into nothing. **So the waste is one round of
   * three**, derived as `floor(rounds / 3)`, which is the same one-round-in-three of the winter
   * the five-round version spent two rounds on. The degenerate measurement is recorded here
   * rather than dropped, because it is the honest statement of what a three-round winter costs
   * this claim: **there is no room in it for a wrecked opening AND a legible ladder, and the line
   * is drawn at one round.**
   *
   * ## AT THE SHIPPED SET ONE BOARD STOPS SEPARATING, AND IT IS NAMED RATHER THAN HIDDEN
   *
   * Re-measured at `rounds: 3` and `ruin_at: 1`, one round thrown away:
   *
   *   | board     | 0 of 3 | 1 of 3 | 2 of 3 | 3 of 3 | span |
   *   |-----------|--------|--------|--------|--------|------|
   *   | live      |    420 |    300 |    240 |     60 |  360 |
   *   | `spread`  |    360 |    240 |  *240* |    180 |  180 |
   *   | `packed`  |    360 |    300 |    180 |      0 |  360 |
   *   | `rimward` |    360 |    240 |    180 |    120 |  240 |
   *
   * **On `spread` the MIDDLE two bands are identical**: from a wrecked opening, answering one of
   * three and answering two reach the same 240 and the same four ruins of six. Two rounds are
   * left, `spread` puts four buildings into danger in them, and one action holds at most two of
   * those however well the batch went — so the extra accuracy has nowhere to land. The tie was on
   * the TOP two bands at four rounds and on these two at three, which is why the exception list
   * asserts that a listed board ties somewhere rather than pinning where.
   *
   * It is a named exception asserted in BOTH directions rather than a softened bound: the
   * listed board must actually have a step it cannot separate (so a retune that fixes it fails
   * here and the entry belongs deleted), and every unlisted board must separate strictly
   * everywhere (so the exception cannot spread by neglect). The population is the tuning
   * table's layouts plus the board the game deals, derived rather than written down, with a
   * floor under it and a floor under the unexcused part of it.
   */
  it("is still not decided once the opening rounds are thrown away", () => {
    const boards: readonly (readonly [string, readonly WinterBuildingPlacement[]])[] = [
      ["live", LIVE_BOARD],
      ...winterLayouts().map(
        (layout) =>
          [layout.id, layout.buildings] as readonly [
            string,
            readonly WinterBuildingPlacement[],
          ],
      ),
    ];
    // A floor, because every assertion below is a comparison across a list.
    expect(boards.length, "no boards to measure").toBeGreaterThanOrEqual(4);
    // The exception list only ever names boards this sweep actually measures, so a rename
    // cannot leave a dead entry excusing nothing.
    for (const entry of WRECKED_OPENING_TIES) {
      expect(
        boards.map(([id]) => id),
        `${entry.id} is excused from a sweep that does not measure it`,
      ).toContain(entry.id);
      expect(entry.why.length, `${entry.id} needs a reason`).toBeGreaterThan(60);
    }
    const ties = new Set(WRECKED_OPENING_TIES.map((entry) => entry.id));

    // HOW WRECKED, derived from the round count rather than pinned. See the docblock: two of
    // three leaves one round and degenerates on three of the four boards.
    const wasted = Math.floor(HARD_WINTER.rounds / 3);
    expect(wasted, "a wrecked opening has to waste a round").toBeGreaterThanOrEqual(1);
    expect(wasted, "a wrecked opening is not the whole winter").toBeLessThan(
      HARD_WINTER.rounds,
    );

    let measured = 0;
    let separating = 0;
    for (const [id, board] of boards) {
      const bands = [0, 1, 2, 3].map((correct) =>
        playCompetently(board, (round) => (round <= wasted ? 0 : correct)),
      );
      const bills = bands.map((band) => band.bill);
      const readable = `${id}: bills=${JSON.stringify(bills)} ruins=${JSON.stringify(
        bands.map((band) => band.ruins),
      )}`;

      if (ties.has(id)) {
        // The other direction: a listed board MUST still fail to separate somewhere, or its
        // exemption is stale and belongs deleted rather than sitting here excusing a board
        // that has started behaving.
        expect(
          gaps(bills).filter((gap) => gap <= 0).length,
          `${readable} — a declared exception that now separates strictly at every step`,
        ).toBeGreaterThan(0);
        // And it is a TIE rather than an inversion: more accuracy is never worse.
        for (const gap of gaps(bills)) {
          expect(gap, readable).toBeGreaterThanOrEqual(0);
        }
      } else {
        // STRICTLY BETTER at every step up the ladder, from the same wrecked opening. This is
        // the assertion that fails if an early deficit ever becomes a verdict.
        for (const gap of gaps(bills)) {
          expect(gap, readable).toBeGreaterThan(0);
        }
        separating += 1;
      }
      // And ruins never go the wrong way either, on any board.
      for (const gap of gaps(bands.map((band) => band.ruins))) {
        expect(gap, readable).toBeGreaterThanOrEqual(0);
      }
      // The span is worth real rebuilds, so "separates" is not a hair. Measured at the shipped
      // set: 360, 180, 360 and 240 material across the four boards, so the weakest is three
      // rebuilds. The bound is left at two rather than raised to three, deliberately: it is
      // a claim about the encounter being answerable from a bad start, and tightening it to the
      // measured minimum would make the widest board's exception load-bearing twice over.
      expect(
        (bills[0] as number) - (bills[bills.length - 1] as number),
        readable,
      ).toBeGreaterThanOrEqual(HARD_WINTER.rebuild_cost_per_ruin * 2);
      measured += 1;
    }
    expect(measured).toBe(boards.length);
    // Floors on the unexcused population, so the exception list cannot grow until no board is
    // required to separate at all.
    expect(separating, "every board is excused, so this sweep asserts nothing").toBe(
      boards.length - WRECKED_OPENING_TIES.length,
    );
    expect(separating).toBeGreaterThanOrEqual(3);
  });

  /**
   * **AND NO ACTION TAKES DAMAGE BACK OFF A BUILDING**, which is the inverse of what this
   * file used to assert and the property the removal creates.
   *
   * It used to read *"repair is the only action that lowers a building's damage"*, and it
   * carried an exemption: the greedy policy above could ignore repair without changing the
   * curve, and that exemption was only safe while repair was the sole undo. Both halves are
   * gone. The exemption is not needed, because there is nothing to exempt, and what is left
   * to guard is that no action grows an undo later on — which would put back the dominated
   * choice the lead ruled out, wearing a different name.
   *
   * The population is a total record over `WinterAction["kind"]`, so a new kind does not
   * compile until it is listed, and it is floored so a sweep over an empty set cannot pass.
   */
  it("has no action that takes damage back off a building", () => {
    let hurt = createHardWinter({ era: ERA, buildings: LIVE_BOARD });
    for (let round = 1; round < HARD_WINTER.rounds; round += 1) {
      hurt = playRound(hurt, { kind: "reinforce", node_id: "town-hall" }, 0);
    }
    const before = new Map(hurt.buildings.map((b) => [b.node_id, b.damage] as const));
    /*
     * **THE FIXTURE CANNOT BE HURT ANY MORE, and this line is where that is said.**
     *
     * It asserted `some(damage > 0)`, and that was the point: the sweep needed a settlement
     * carrying damage before it could show that nothing took any off. At
     * `HARD_WINTER.damage.ruin_at: 1` no standing building can carry a point (swept as a census
     * in *"leaves nothing standing damaged"*), so the strongest true statement about the fixture
     * is that the frost has DONE something to it — buildings have been ruined — and that no
     * survivor carries damage for an action to lower.
     *
     * The guard below is kept at full strength anyway, and that is deliberate rather than
     * ceremonial: what it stops is a future action GROWING an undo, which would put back the
     * dominated choice the lead ruled out on 2026-07-31 wearing a different name. It is also the
     * assertion a `ruin_at` above 1 needs first, and it would be the one nobody thought to write.
     */
    expect(
      hurt.buildings.filter((b) => b.state === "ruin").length,
      "the fixture is untouched, so the sweep below has nothing to measure",
    ).toBeGreaterThan(0);
    expect(
      [...before.values()].every((damage) => damage <= HARD_WINTER.damage.ruin_at),
    ).toBe(true);

    // The shield is aimed at the hall because it is the only building the frost has not
    // finished by the last round of a wasted winter — at `ruin_at: 1` a building the frost
    // reaches unsheltered is a ruin, and a ruin cannot be reinforced, so any other target
    // would have this sweep measuring a refusal. `hard-winter.test.ts`'s copy of this guard
    // carries the same note and the un-ruin half.
    //
    // TWO ENTRIES, and the record is TOTAL over `WinterAction["kind"]`, so a new action does not
    // compile until it is listed here. That is what caught `abandon` when the lead ruled it out
    // on 2026-08-02: its entry had to come out, which is the same enforcement in reverse.
    const oneOfEachKind: Readonly<Record<WinterAction["kind"], WinterAction>> = {
      fire: { kind: "fire", col: 2, row: -1 },
      reinforce: { kind: "reinforce", node_id: "town-hall" },
    };
    const kinds = Object.keys(oneOfEachKind) as WinterAction["kind"][];
    expect(kinds.length, "the action set is empty").toBeGreaterThanOrEqual(2);

    let checked = 0;
    for (const kind of kinds) {
      const action = oneOfEachKind[kind];
      if (winterActionRefusalIsBlocking(hurt, action)) {
        throw new Error(`${kind} is not declarable in the fixture`);
      }
      // Resolve only — the round is not closed, so nothing the FROST does is in the way.
      const applied = hardWinterReducer(
        hardWinterReducer(hurt, { type: "declare", action }),
        { type: "resolve", correct: HARD_WINTER.batch_size, asked: HARD_WINTER.batch_size },
      );
      const lowered = applied.buildings.filter(
        (b) => b.state === "standing" && b.damage < (before.get(b.node_id) as number),
      );
      expect(
        lowered.map((b) => b.node_id),
        `${kind} lowered damage`,
      ).toEqual([]);
      checked += 1;
    }
    expect(checked).toBe(kinds.length);
  });
});

/** True when the board would refuse this action outright, so a fixture cannot rot silently. */
function winterActionRefusalIsBlocking(
  state: HardWinterState,
  action: WinterAction,
): boolean {
  return !canDeclareWinterAction(state, action);
}
