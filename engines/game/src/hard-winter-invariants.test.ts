import { describe, expect, it, vi } from "vitest";

import { createSeededRng } from "./citizens-rng";
import {
  canDeclareWinterAction,
  composeHardWinterBatch,
  createHardWinter,
  defaultWinterLayout,
  type HardWinterEvent,
  type HardWinterState,
  hardWinterIsland,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  wardedWinterCells,
  winterCellKey,
  winterSpreadSteps,
  winterTierFor,
  winterTierRank,
  winterWardArea,
} from "./hard-winter";
import { HARD_WINTER, WINTER_TIERS } from "./hard-winter-tuning";

/**
 * THE PROPERTIES, as distinct from the mechanics in `hard-winter.test.ts`.
 *
 * A stateful system's happy path is the least interesting thing about it. What follows
 * are the four claims the design rests on, each swept over many plays rather than
 * checked once:
 *
 *  1. **the frost is monotone** — the frozen set never shrinks, under any action, at any
 *     accuracy, ever. This is what makes a fire a decision about the FUTURE (light it
 *     ahead of the line) rather than an undo button;
 *  2. **a declared action cannot exceed its accuracy tier** — the magnitude applied is
 *     exactly the tuning table's entry for the tier the batch earned, and nothing else
 *     in the state can raise it;
 *  3. **the round count is the only thing that advances state** — the whole encounter is
 *     a pure fold over its event list, replayable, and no path reads a clock;
 *  4. **identical accuracy, different outcomes** — the design's own success test.
 */

const ERA = "prehistoric" as const;

/** Every action a sweep considers legal ground for: the buildings, and a few centres. */
function actionSpace(): WinterAction[] {
  const island = hardWinterIsland(ERA);
  const fireCells = island.cells
    .map((key) => key.split(",").map(Number))
    .filter((pair) => (pair[0] as number) % 2 === 0 && (pair[1] as number) % 2 === 0)
    .map(([col, row]) => ({ kind: "fire", col, row }) as WinterAction);

  return [
    ...fireCells,
    ...defaultWinterLayout().buildings.map(
      (b) => ({ kind: "reinforce", node_id: b.node_id }) as WinterAction,
    ),
    // A third kind was appended here until 2026-08-02, when the give-up-ground action was ruled
    // out. The space is derived from the union's members rather than written down, so the sweeps
    // over it narrowed with the board rather than going on offering something illegal.
  ];
}

/**
 * Play `rounds` random-but-deterministic winters, handing each state to `observe` after
 * every single event. The sweep is what turns "the frost is monotone" from a statement
 * about one play into a statement about the system.
 */
function sweepPlays(
  count: number,
  observe: (
    before: HardWinterState,
    after: HardWinterState,
    event: HardWinterEvent,
  ) => void,
): number {
  const space = actionSpace();
  let plays = 0;

  for (let seed = 1; seed <= count; seed += 1) {
    const rng = createSeededRng(seed);
    let state = createHardWinter({ era: ERA });
    plays += 1;

    while (state.phase !== "ended") {
      const legal = space.filter((action) => canDeclareWinterAction(state, action));
      const action = legal[Math.floor(rng() * legal.length)] as WinterAction;
      const correct = Math.floor(rng() * (HARD_WINTER.batch_size + 1));

      for (const event of [
        { type: "declare", action },
        { type: "resolve", correct, asked: HARD_WINTER.batch_size },
        { type: "end_round" },
      ] as const) {
        const before = state;
        state = hardWinterReducer(state, event);
        observe(before, state, event);
      }
    }
  }

  return plays;
}

/* ------------------------------------------------------ 1. frost is monotone */

describe("the frost is monotone", () => {
  it("never releases a cell it has taken, over 200 random plays", () => {
    let transitions = 0;
    const plays = sweepPlays(200, (before, after) => {
      transitions += 1;
      const held = new Set(after.frozen);
      for (const key of before.frozen) {
        expect(held.has(key), `${key} thawed`).toBe(true);
      }
      expect(after.frozen.length).toBeGreaterThanOrEqual(before.frozen.length);
    });

    // Floors. A containment sweep over an empty observation list holds trivially, so
    // both the number of plays and the number of transitions observed are asserted.
    expect(plays).toBe(200);
    expect(transitions).toBeGreaterThanOrEqual(200 * 3);
  });

  it("holds even where a bonfire is lit directly on frozen ground", () => {
    // One cold round on the shoreline Lookout, then the widest fire on its own cell.
    let state = hardWinterReducer(createHardWinter({ era: ERA }), {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.S" },
    });
    state = hardWinterReducer(state, { type: "resolve", correct: 0, asked: 3 });
    state = hardWinterReducer(state, { type: "end_round" });

    const key = winterCellKey(4, 0);
    expect(state.frozen).toContain(key);
    const frozenBefore = state.frozen.length;

    state = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "fire", col: 4, row: 0 },
    });
    state = hardWinterReducer(state, { type: "resolve", correct: 3, asked: 3 });
    state = hardWinterReducer(state, { type: "end_round" });

    // The ward is real, and the ground it covers is STILL frozen: warmth protects the
    // building, it does not thaw the island.
    expect(wardedWinterCells(state).has(key)).toBe(true);
    expect(state.frozen).toContain(key);
    expect(state.frozen.length).toBeGreaterThanOrEqual(frozenBefore);
  });

  /**
   * The same shape one level down, and the reason the cold rule is cumulative rather
   * than consecutive: warmth PAUSES a building's count and can never lower it. A rule
   * that reset the count on a warm round would fail here at the first fire.
   */
  it("never lowers a building's cold rounds, over 80 random plays", () => {
    let comparisons = 0;
    const plays = sweepPlays(80, (before, after) => {
      const previous = new Map(before.buildings.map((b) => [b.node_id, b.cold_rounds]));
      for (const b of after.buildings) {
        const was = previous.get(b.node_id);
        if (was === undefined) {
          throw new Error(`${b.node_id} appeared mid-winter`);
        }
        expect(b.cold_rounds, `${b.node_id} cold went backwards`).toBeGreaterThanOrEqual(
          was,
        );
        comparisons += 1;
      }
    });

    expect(plays).toBe(80);
    expect(comparisons).toBe(
      80 * HARD_WINTER.rounds * 3 * defaultWinterLayout().buildings.length,
    );
  });
});

/* --------------------------------------- 2. an action cannot exceed its tier */

describe("a declared action cannot exceed its accuracy tier", () => {
  /**
   * Swept over every reachable (correct, asked) pair rather than the shipped batch size
   * alone, so a retune of `batch_size` is covered by the same assertion.
   */
  it("applies exactly the tuning table's magnitude for the tier the batch earned", () => {
    let checked = 0;

    for (let asked = 1; asked <= 5; asked += 1) {
      for (let correct = 0; correct <= asked; correct += 1) {
        const tier = winterTierFor(correct, asked);

        // Fire: the ward is the tier's radius and no wider.
        let fire = hardWinterReducer(createHardWinter({ era: ERA }), {
          type: "declare",
          action: { kind: "fire", col: 0, row: 0 },
        });
        fire = hardWinterReducer(fire, { type: "resolve", correct, asked });
        const radius = HARD_WINTER.fire.radius_by_tier[tier];
        expect(fire.fires[0]?.radius, `fire ${correct}/${asked}`).toBe(radius);
        expect(wardedWinterCells(fire).size).toBe(winterWardArea(radius));

        // Reinforce: the extra cold rounds are the tier's and no more.
        let reinforce = hardWinterReducer(createHardWinter({ era: ERA }), {
          type: "declare",
          action: { kind: "reinforce", node_id: "NUM.S" },
        });
        reinforce = hardWinterReducer(reinforce, { type: "resolve", correct, asked });
        expect(
          reinforce.buildings.find((b) => b.node_id === "NUM.S")?.shield,
          `reinforce ${correct}/${asked}`,
        ).toBe(HARD_WINTER.reinforce.shield_by_tier[tier]);

        // A THIRD ACTION WAS SWEPT HERE UNTIL 2026-08-02: giving up the outer ring shielded
        // every building still inside it off `HARD_WINTER.abandon.shield_by_tier`, and this loop
        // asserted the same magnitude rule for it. The lead ruled that action out (see
        // `WinterAction`), so the sweep is over two kinds because there are two.

        checked += 1;
      }
    }

    // Floor: 1+2+3+4+5+6 pairs over asked 1..5.
    expect(checked).toBe(20);
  });

  it("is monotone in the score: more correct never buys less", () => {
    const asked = HARD_WINTER.batch_size;
    let previous = -1;
    for (let correct = 0; correct <= asked; correct += 1) {
      const rank = winterTierRank(winterTierFor(correct, asked));
      expect(rank).toBeGreaterThan(previous);
      previous = rank;
    }
    expect(previous).toBe(WINTER_TIERS.length - 1);
  });

  it("cannot be handed a score above the batch, at any point in a round", () => {
    const declared = hardWinterReducer(createHardWinter({ era: ERA }), {
      type: "declare",
      action: { kind: "fire", col: 0, row: 0 },
    });
    expect(() =>
      hardWinterReducer(declared, { type: "resolve", correct: 4, asked: 3 }),
    ).toThrow(/cannot score 4 of 3/);
  });

  /**
   * The other half of "cannot exceed": no accumulated state raises a magnitude. Ten
   * rounds of history in front of it, and a `weak` fire is still one cell.
   */
  it("does not let a round's history widen a later action", () => {
    let state = createHardWinter({ era: ERA });
    for (let round = 1; round < HARD_WINTER.rounds; round += 1) {
      state = hardWinterReducer(state, {
        type: "declare",
        action: { kind: "fire", col: 0, row: 0 },
      });
      state = hardWinterReducer(state, { type: "resolve", correct: 3, asked: 3 });
      state = hardWinterReducer(state, { type: "end_round" });
    }

    // Deliberately OUTSIDE every ward still burning, so the one extra cell is visible
    // as a delta rather than swallowed by an overlap.
    state = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "fire", col: -4, row: -2 },
    });
    const before = wardedWinterCells(state);
    expect(before.has(winterCellKey(-4, -2))).toBe(false);
    expect(before.size).toBeGreaterThan(0);

    state = hardWinterReducer(state, { type: "resolve", correct: 1, asked: 3 });
    const lit = state.fires[state.fires.length - 1];

    expect(lit?.radius).toBe(HARD_WINTER.fire.radius_by_tier.weak);
    expect(wardedWinterCells(state).size).toBe(before.size + 1);
  });
});

/* ------------------------------------- 3. only a round transition moves time */

describe("the round count is the only thing that advances state", () => {
  it("advances the round on `end_round` and on no other event", () => {
    let state = createHardWinter({ era: ERA });
    expect(state.round).toBe(1);

    state = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.S" },
    });
    expect(state.round).toBe(1);
    state = hardWinterReducer(state, { type: "resolve", correct: 2, asked: 3 });
    expect(state.round).toBe(1);
    state = hardWinterReducer(state, { type: "end_round" });
    expect(state.round).toBe(2);
  });

  it("is a pure fold: the same events twice give a deep-equal winter", () => {
    const events: HardWinterEvent[] = [];
    let recorded = createHardWinter({ era: ERA });
    const rng = createSeededRng(0xc01d);
    const space = actionSpace();

    while (recorded.phase !== "ended") {
      const legal = space.filter((action) => canDeclareWinterAction(recorded, action));
      const action = legal[Math.floor(rng() * legal.length)] as WinterAction;
      const correct = Math.floor(rng() * (HARD_WINTER.batch_size + 1));
      for (const event of [
        { type: "declare", action },
        { type: "resolve", correct, asked: HARD_WINTER.batch_size },
        { type: "end_round" },
      ] as HardWinterEvent[]) {
        events.push(event);
        recorded = hardWinterReducer(recorded, event);
      }
    }

    expect(events.length).toBe(HARD_WINTER.rounds * 3);
    const replayed = events.reduce(hardWinterReducer, createHardWinter({ era: ERA }));
    expect(replayed).toEqual(recorded);
    expect(hardWinterView(replayed)).toEqual(hardWinterView(recorded));
  });

  /**
   * The clock test, following `citizens-roster-invariants.test.ts`'s technique and for
   * the same reason: two folds back to back land in the same millisecond, so a
   * `Date.now` leak would sail through a deep-equal comparison. Moving the clock a day
   * between them is what makes the claim falsifiable.
   *
   * `test/hardWinterClockless.test.ts` is the other half — this proves the ENGINE does
   * not read a clock at runtime; that sweeps the engine AND the playable surface for the
   * tokens, because a `setInterval` in the React layer is exactly as farmable.
   */
  it("does not read the clock, so a day later is the same winter", () => {
    const plan: HardWinterEvent[] = [];
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      plan.push(
        { type: "declare", action: { kind: "fire", col: 0, row: 0 } },
        { type: "resolve", correct: round % 4, asked: 3 },
        { type: "end_round" },
      );
    }

    const now = vi.spyOn(Date, "now");
    const perf = vi.spyOn(performance, "now");
    const random = vi.spyOn(Math, "random");
    try {
      now.mockReturnValue(1_700_000_000_000);
      const first = plan.reduce(hardWinterReducer, createHardWinter({ era: ERA }));
      now.mockReturnValue(1_700_086_400_000);
      const second = plan.reduce(hardWinterReducer, createHardWinter({ era: ERA }));

      expect(second).toEqual(first);
      // And nothing was consulted at all, which is the stronger statement.
      expect(now).not.toHaveBeenCalled();
      expect(perf).not.toHaveBeenCalled();
      expect(random).not.toHaveBeenCalled();
    } finally {
      now.mockRestore();
      perf.mockRestore();
      random.mockRestore();
    }
  });

  it("draws a batch without touching `Math.random` when given a seed", () => {
    const random = vi.spyOn(Math, "random");
    try {
      const composition = composeHardWinterBatch(
        ["NUM.S", "NUM.F"],
        [
          { item_version_id: "a", node_id: "NUM.S", prompt: "a" },
          { item_version_id: "b", node_id: "NUM.F", prompt: "b" },
          { item_version_id: "c", node_id: "NUM.S", prompt: "c" },
        ],
        { rng: createSeededRng(11) },
      );
      expect(composition.status).toBe("ready");
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

/* ------------------------------ 4. identical accuracy, different outcomes */

describe("identical accuracy, different outcomes", () => {
  /**
   * THE DESIGN'S OWN SUCCESS TEST, and the reason the whole encounter is spatial: if two
   * learners who answer exactly the same number of questions correctly cannot reach
   * different endings, the mechanic is a quiz in a costume.
   *
   * Both plans below score 2 of 3 in every round of the winter. They differ only in
   * WHERE things were put.
   *
   * EACH IS LENGTH-CHECKED AGAINST `HARD_WINTER.rounds`, because a plan longer than the
   * winter does not fail — the reducer ignores a declaration in the `ended` phase, so the
   * extra entries are silently dead and the fixture reads as covering rounds it never
   * played. Both plans carried exactly one such entry until the round count went from six
   * to five on 2026-07-30, and the check is what caught them again on 2026-08-01, both when
   * the count went to four and when that was reversed.
   *
   * **THE WELL-PLACED PLAN HAS BEEN RE-AUTHORED TWICE, AND NEITHER TIME WAS THE ROUND
   * COUNT'S DOING ALONE.** Its `ruin_at: 6` form (`reinforce NUM.5`, `fire(-4, -2)`,
   * `fire(1, 2)`, `reinforce NUM.S`, `fire(-4, -2)`) saved five buildings then and **one** at
   * `ruin_at: 2`, the same as the idle plan, because a shield spread thin covers nothing when
   * one bite is a whole building.
   *
   * **THE 2026-08-02 PLAN IS EXHAUSTIVELY OPTIMAL rather than beam-searched**, which the
   * three-round winter makes affordable: the whole plan space is 94 actions to the power of 3,
   * so *"the best a player can do"* is a measurement here rather than an estimate. At 2 of 3 on
   * the baseline board it is **four survivors of six**, from `fire(-5, -3)`, `fire(0, 1)`,
   * `fire(-3, -3)`, and the idle plan reaches **one**. Every round goes on a fire over ground
   * the frost is about to take; there is no round to spare for a shield at this accuracy.
   */
  it("two players at 2 of 3 every round reach different survivor counts", () => {
    const wellPlaced: WinterAction[] = [
      { kind: "fire", col: -5, row: -3 },
      { kind: "fire", col: 0, row: 1 },
      { kind: "fire", col: -3, row: -3 },
    ];
    const badlyPlaced: WinterAction[] = [
      { kind: "fire", col: 0, row: 0 },
      { kind: "fire", col: 0, row: 0 },
      { kind: "fire", col: 0, row: 0 },
    ];
    expect(wellPlaced, "the well-placed plan is a whole winter").toHaveLength(
      HARD_WINTER.rounds,
    );
    expect(badlyPlaced, "and so is the badly-placed one").toHaveLength(HARD_WINTER.rounds);

    const survivors = (plan: readonly WinterAction[]): number => {
      let state = createHardWinter({ era: ERA });
      for (const action of plan) {
        state = hardWinterReducer(state, { type: "declare", action });
        state = hardWinterReducer(state, { type: "resolve", correct: 2, asked: 3 });
        state = hardWinterReducer(state, { type: "end_round" });
      }
      if (!state.outcome) {
        throw new Error("winter did not end");
      }
      return state.outcome.survived;
    };

    const good = survivors(wellPlaced);
    const bad = survivors(badlyPlaced);

    expect(good).toBeGreaterThan(bad);
    // Not a hair's breadth, either: the gap is most of the island.
    expect(good - bad).toBeGreaterThanOrEqual(3);
    expect(good).toBeGreaterThanOrEqual(4);
  });

  /**
   * The floor of the same claim, from the other end. At zero accuracy every magnitude on
   * the table is zero, so no arrangement of actions keeps anything out of harm's way —
   * accuracy is a real ceiling and not a modifier. Swept over random plays rather than one
   * plan, because the claim is about the whole action space.
   *
   * IT USED TO READ `survived === 0` and the loosening is deliberate: with damage before
   * ruin, the island's heart goes cold on the final round only, so it comes through
   * standing and half wrecked however badly the winter went. What is asserted instead is
   * that nothing is UNHARMED, which the old wording could not distinguish from a building
   * that had merely been lucky. `hard-winter-layouts.test.ts` carries the same restatement
   * across every authored board.
   *
   * **AND `ruin_at: 2` TIGHTENED IT AGAIN (2026-08-01), which is the opposite direction.** One
   * cold round is now the whole building and the frost reaches every band by the last round,
   * so a zero-accuracy winter ends with NOTHING STANDING however it is played. The loosened
   * disjunction is kept because it is the claim the design owes, and the stronger measurement
   * is asserted beside it so the sweep says what today's tuning actually does.
   *
   * A NARROWING WAS NEEDED HERE FOR ONE DAY and is recorded because it cost the most to find:
   * under the four-round count ruled and reversed the same day, the frost stopped at rim depth
   * 3 and the Assembly Hall came through untouched, so this sweep needed the heart as a named
   * exception in both directions. The reversal removed the need for it. What the exception work
   * did leave behind is worth keeping in prose: **a pull-back hands the frost ground the
   * schedule has not reached yet**, because abandoning freezes a whole ring outright, and that
   * is how seed 43 got to the heart a round early.
   */
  it("nothing comes through a zero-accuracy winter unharmed, whatever the player does", () => {
    const space = actionSpace();
    let plays = 0;
    let checked = 0;

    // The frost's whole advance covers the island, from the schedule rather than a literal.
    const reach = Array.from({ length: HARD_WINTER.rounds }, (_, i) =>
      winterSpreadSteps(i + 1),
    ).reduce((total, steps) => total + steps, 0);
    expect(reach, "the frost's total advance, in bands").toBeGreaterThan(
      hardWinterIsland(ERA).max_rim_depth,
    );

    for (let seed = 1; seed <= 60; seed += 1) {
      const rng = createSeededRng(seed);
      let state = createHardWinter({ era: ERA });
      while (state.phase !== "ended") {
        const legal = space.filter((action) => canDeclareWinterAction(state, action));
        const action = legal[Math.floor(rng() * legal.length)] as WinterAction;
        state = hardWinterReducer(state, { type: "declare", action });
        state = hardWinterReducer(state, { type: "resolve", correct: 0, asked: 3 });
        state = hardWinterReducer(state, { type: "end_round" });
      }
      for (const b of state.buildings) {
        expect(
          b.state === "ruin" || b.damage > 0,
          `seed ${seed}: ${b.node_id} came through untouched`,
        ).toBe(true);
        // AND AT `ruin_at: 2` NOTHING MERELY SURVIVES EITHER, which is the measurement the
        // line above cannot make. This one fails if a near miss ever becomes reachable at
        // zero accuracy, which is what a deeper `ruin_at` would restore.
        expect(b.state, `seed ${seed}: ${b.node_id} was only marked`).toBe("ruin");
        checked += 1;
      }
      expect(state.outcome?.survived, `seed ${seed}`).toBe(0);
      plays += 1;
    }

    expect(plays).toBe(60);
    expect(checked).toBe(60 * defaultWinterLayout().buildings.length);
  });

  /**
   * **THE CEILING, AND ON THE BASELINE BOARD IT IS NO LONGER A CLEAN SWEEP. MEASURED
   * EXHAUSTIVELY RATHER THAN SEARCHED.**
   *
   * This asserted that a hand-authored plan at full accuracy saves EVERYTHING, so the encounter
   * has no dead end. At the 2026-08-02 set that is false on `spread`, the tuning baseline, and
   * it is false as a matter of proof rather than of search: three rounds means the whole plan
   * space is 94 actions cubed, so it was walked in full.
   *
   *   | board     | best possible at 3 of 3 | best possible at 0 of 3 |
   *   |-----------|-------------------------|-------------------------|
   *   | live      |      7 of 7 saved       |       0 of 7 saved      |
   *   | `spread`  |    **5 of 6 saved**     |       0 of 6 saved      |
   *   | `packed`  |      6 of 6 saved       |       0 of 6 saved      |
   *   | `rimward` |      6 of 6 saved       |       0 of 6 saved      |
   *
   * **WHY `spread` CANNOT BE SWEPT CLEAN, which is arithmetic once the timetable is written
   * down.** Its six buildings sit in bands 0, 1, 2, 2, 2 and 4. `spread.base` is 1, so band 0
   * freezes as round one closes and band 1 and 2 as round two closes: **five of the six are cold
   * by the end of round two, in two different rounds**, and one action holds at most three of
   * them (measured, from three cells). At `ruin_at: 1` a building not held on the round it goes
   * cold is gone, so rounds one and two have to cover five buildings between two actions on a
   * board where the best cell reaches three. A `strong` shield is six points against a bite
   * ladder that totals six, so it saves exactly one building for a whole action.
   *
   * **THIS IS A CONSEQUENCE OF THE PARAMETER SET AND IT IS RECORDED RATHER THAN PAPERED OVER.**
   * It is the price of three rounds on the widest board the prototype deals, it is one building
   * of six, and the two dials that would buy it back are `spread.base` (a slower opening beat)
   * and `fire.radius_by_tier.strong` (a wider top-tier disc). Neither was touched, because the
   * lead ruled four values and asked to be left free to tune. `HARD_WINTER.rounds` carries the
   * bill this belongs to.
   *
   * **WHAT IS STILL ASSERTED IS THE PROPERTY THE CLEAN SWEEP WAS PROTECTING**: there is no dead
   * end. Full accuracy loses at most one of six here and nothing at all on the other three
   * boards, against a zero-accuracy floor of nothing standing anywhere — so accuracy is worth
   * the whole settlement and the encounter is nobody's trap. `hard-winter-layouts.test.ts`
   * carries the same claim board by board, with `spread` named there as the one exception.
   *
   * THE PLAN'S OWN HISTORY, kept because each re-authoring measured something. Under the
   * 25-cell Chebyshev square, `reinforce NUM.5, fire(-4,-2), fire(2,1), reinforce NUM.4,
   * fire(-4,-2), fire(2,1)` saved all six and saved THREE under the 13-cell disc, because two of
   * its fires were covering pairs the smaller footprint cannot reach from one cell. At
   * `ruin_at: 2` the shape that worked reinforced the shoreline Tower twice and spent three
   * rounds on fires. At three rounds there is no round to spend on a shield at all.
   */
  it("loses at most one building at 3 of 3, and one is the proven floor", () => {
    // EXHAUSTIVELY OPTIMAL on this board at this accuracy: 5 of 6, from the full walk of the
    // plan space. See the docblock for the table and for why 6 is unreachable.
    const plan: WinterAction[] = [
      { kind: "fire", col: -4, row: -4 },
      { kind: "fire", col: 1, row: 1 },
      { kind: "fire", col: -3, row: -4 },
    ];
    // The check the plan above has and this one did not, which is how a dead sixth entry sat
    // here through a round-count change.
    expect(plan, "the winning plan is a whole winter").toHaveLength(HARD_WINTER.rounds);

    let state = createHardWinter({ era: ERA });
    for (const action of plan) {
      state = hardWinterReducer(state, { type: "declare", action });
      state = hardWinterReducer(state, { type: "resolve", correct: 3, asked: 3 });
      state = hardWinterReducer(state, { type: "end_round" });
    }

    const total = defaultWinterLayout().buildings.length;
    // The measured optimum, pinned as the value rather than as a bound, so a retune that makes
    // the board winnable again fails here and the docblock above is re-read rather than left
    // describing a board that has started behaving.
    expect(state.outcome?.survived, JSON.stringify(state.outcome?.ruined)).toBe(total - 1);
    expect(state.outcome?.ruined).toHaveLength(1);
    // AND NO DEAD END, which is the property the clean sweep was protecting: full accuracy is
    // worth the whole settlement against a zero-accuracy floor of nothing standing.
    expect(state.outcome?.survived).toBeGreaterThan(0);
    // Won, and still not easy: most of the island is under ice at the end.
    expect(state.outcome?.frozen_cells).toBeGreaterThan(
      (state.outcome?.island_cells ?? 0) / 2,
    );
  });
});
