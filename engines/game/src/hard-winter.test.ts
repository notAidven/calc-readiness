import {
  buildableCellCount,
  ERA_SEQUENCE,
  type EraId,
  eraBuildableRadius,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  canDeclareWinterAction,
  composeHardWinterBatch,
  createHardWinter,
  defaultWinterLayout,
  HARD_WINTER_REASON_CODE,
  type HardWinterState,
  hardWinterIsland,
  hardWinterOutcome,
  hardWinterPayoutFor,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  type WinterBatchCandidate,
  type WinterFire,
  wardedWinterCells,
  winterActionRefusal,
  winterCellKey,
  winterDamageBite,
  winterDamageBudget,
  winterDamageStage,
  winterFireIsBurning,
  winterFireState,
  winterFrostAfterAdvance,
  winterMendCost,
  winterSpreadSteps,
  winterTierFor,
  winterTierRank,
  winterWardArea,
  winterWardOffsets,
} from "./hard-winter";
import { HARD_WINTER, WINTER_TIERS, type WinterActionTier } from "./hard-winter-tuning";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

/** Play a whole winter from a plan of (action, correct) pairs. */
function playWinter(
  plan: readonly { readonly action: WinterAction; readonly correct: number }[],
): HardWinterState {
  let state = createHardWinter({ era: ERA });
  for (const entry of plan) {
    state = playRound(state, entry.action, entry.correct);
  }
  return state;
}

/** The same action and accuracy every round, for a baseline sweep. */
function uniformPlan(
  action: WinterAction,
  correct: number,
): { action: WinterAction; correct: number }[] {
  return Array.from({ length: HARD_WINTER.rounds }, () => ({ action, correct }));
}

function building(state: HardWinterState, nodeId: string) {
  const found = state.buildings.find((b) => b.node_id === nodeId);
  if (!found) {
    throw new Error(`no building ${nodeId}`);
  }
  return found;
}

const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

function poolFor(nodeIds: readonly string[], perNode: number): WinterBatchCandidate[] {
  return nodeIds.flatMap((nodeId) =>
    Array.from({ length: perNode }, (_, index) => ({
      item_version_id: `${nodeId}-${index}`,
      node_id: nodeId,
      prompt: `${nodeId} prompt ${index}`,
    })),
  );
}

/** A deterministic RNG, so a draw is reproducible without touching `Math.random`. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* The island                                                                 */
/* -------------------------------------------------------------------------- */

describe("the island is era one's real island, and only era one has one", () => {
  it("holds exactly the cells the era's authored radius makes buildable", () => {
    const island = hardWinterIsland(ERA);

    // Not a number written here: the registry's own count function over the era's own
    // authored radius. A radius edit moves both sides together, and a change to the
    // buildable rule fails this.
    expect(island.cells.length).toBe(buildableCellCount(island.buildable_radius));
    expect(island.buildable_radius).toBe(22);
    expect(island.cells.length).toBe(88);
    // A 10x10 bounding box with the twelve corner cells missing.
    expect(island.bounds).toEqual({ min_col: -5, max_col: 4, min_row: -5, max_row: 4 });
  });

  it("measures rim depth from the shoreline inward, five bands deep", () => {
    const island = hardWinterIsland(ERA);
    const bands = new Map<number, number>();
    for (const depth of island.rim_depth.values()) {
      bands.set(depth, (bands.get(depth) ?? 0) + 1);
    }

    expect(island.max_rim_depth).toBe(4);
    expect([...bands.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [0, 28],
      [1, 24],
      [2, 20],
      [3, 12],
      [4, 4],
    ]);
    // Every band is populated and every cell is in one, so the flood can reach the heart.
    expect([...bands.values()].reduce((a, b) => a + b, 0)).toBe(island.cells.length);
  });

  /**
   * **⚑ THE FENCE THIS TEST GUARDED IS GONE, and the replacement says so rather than being
   * quietly narrower.**
   *
   * It read *"throws for all nine eras with no authored land, rather than inventing any"*,
   * and that was the load-bearing consequence of D-ERA25 while era one alone had an authored
   * radius: pointing the encounter at another era was a thrown error rather than an empty
   * grid or borrowed land. All ten budgets are authored now, so the throw is gone and this
   * builds a real island for every era.
   *
   * So the assertion is inverted rather than deleted, because the fact worth pinning has
   * inverted: each era gets ITS OWN ground, derived from its own radius, and no era borrows
   * another's. What keeps the encounter era one's is the item pool, which this package cannot
   * see and `apps/web/src/winter/crisisEra.test.tsx` asserts over the real pool.
   */
  it("builds each era's own island from its own radius, and never borrows another's", () => {
    const islands = ERA_SEQUENCE.map((era) => {
      const island = hardWinterIsland(era.id);
      return {
        era: era.id,
        radius: island.buildable_radius,
        cells: island.cells.length,
      };
    });

    for (const row of islands) {
      // Derived on both sides rather than pinned: the era's own authored radius, and the
      // registry's own count function over it.
      expect(row.radius, row.era).toBe(eraBuildableRadius(row.era));
      expect(row.cells, row.era).toBe(buildableCellCount(row.radius));
    }
    // Strictly growing, so no era is handed a smaller board than the era before it and none
    // is silently handed era one's.
    for (let index = 1; index < islands.length; index += 1) {
      expect(islands[index]?.cells, islands[index]?.era).toBeGreaterThan(
        islands[index - 1]?.cells ?? 0,
      );
    }
    expect(islands).toHaveLength(10);
    expect(islands[0]?.cells).toBe(88);
    expect(islands.at(-1)?.cells).toBe(936);
    // The fail-loud discipline that survives: an id that is not an era still stops rather
    // than resolving to an empty grid.
    expect(() => hardWinterIsland("atlantean" as EraId)).toThrow(/Unknown era/);
  });

  it("refuses a building placed off the island rather than making it immortal", () => {
    expect(() =>
      createHardWinter({
        era: ERA,
        buildings: [{ node_id: "NUM.S", col: 99, row: 99 }],
      }),
    ).toThrow(/not on era "prehistoric"'s island/);
  });

  it("stands the six authored buildings across four rim bands", () => {
    const state = createHardWinter({ era: ERA });

    expect(state.buildings.map((b) => b.node_id)).toEqual([...D1_NODES]);
    const depths = state.buildings.map((b) => b.rim_depth);
    expect(depths).toEqual([4, 2, 2, 2, 1, 0]);
    // The property the layout exists for: the frost cannot reach them all at once.
    expect(new Set(depths).size).toBeGreaterThanOrEqual(3);
    expect(Math.min(...depths)).toBe(0);
    expect(Math.max(...depths)).toBe(hardWinterIsland(ERA).max_rim_depth);
  });
});

/* -------------------------------------------------------------------------- */
/* The accuracy ladder                                                        */
/* -------------------------------------------------------------------------- */

describe("the accuracy ladder", () => {
  it("gives a batch of three exactly one tier per possible score", () => {
    const asked = HARD_WINTER.batch_size;
    expect(asked).toBe(3);
    expect([0, 1, 2, 3].map((correct) => winterTierFor(correct, asked))).toEqual([
      "none",
      "weak",
      "steady",
      "strong",
    ]);
  });

  it("is total: every ratio in [0, 1] lands on a rung", () => {
    // The rung at ratio 0 is what makes the table total; without it `winterTierFor`
    // would fall through its loop.
    expect(HARD_WINTER.tiers.some((rung) => rung.min_ratio === 0)).toBe(true);
    expect(HARD_WINTER.tiers.map((rung) => rung.tier).sort()).toEqual(
      [...WINTER_TIERS].sort(),
    );
    for (let asked = 1; asked <= 8; asked += 1) {
      for (let correct = 0; correct <= asked; correct += 1) {
        expect(WINTER_TIERS).toContain(winterTierFor(correct, asked));
      }
    }
  });

  it("never lets a score buy a magnitude it did not earn", () => {
    expect(() => winterTierFor(4, 3)).toThrow(/cannot score 4 of 3/);
    expect(() => winterTierFor(-1, 3)).toThrow();
    expect(() => winterTierFor(1, 0)).toThrow(/positive count/);
    expect(() => winterTierFor(1.5, 3)).toThrow(/whole non-negative/);
  });

  it("ranks the tiers weakest-first, independent of the tuning table's row order", () => {
    expect(WINTER_TIERS.map(winterTierRank)).toEqual([0, 1, 2, 3]);
  });

  /**
   * The relationship, not the digits: each action's magnitude must be non-decreasing up
   * the ladder and must reach something at the top. A retune that made `steady` buy more
   * than `strong` is the defect this catches.
   */
  it("has a strictly useful, non-decreasing magnitude for every action", () => {
    const radii = WINTER_TIERS.map((t) => HARD_WINTER.fire.radius_by_tier[t]);
    expect(radii[0], "a fire that never caught wards nothing").toBeNull();
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i] as number, `fire radius at ${WINTER_TIERS[i]}`).toBeGreaterThan(
        (radii[i - 1] ?? -1) as number,
      );
    }

    // ONE SHIELD TABLE WHERE THERE WERE TWO. `HARD_WINTER.abandon.shield_by_tier` was swept
    // beside this one until the give-up-ground action was ruled out on 2026-08-02. The loop is
    // kept over a list of one rather than inlined, because the property is a property of a
    // TABLE and the next action that buys a magnitude by tier belongs in it.
    for (const table of [HARD_WINTER.reinforce.shield_by_tier]) {
      expect(table.none, "the bottom rung buys nothing").toBe(0);
      const values = WINTER_TIERS.map((t) => table[t]);
      for (let i = 1; i < values.length; i += 1) {
        expect(values[i] as number).toBeGreaterThan(values[i - 1] as number);
      }
    }

    /*
     * THE FIRE'S DURATION IS A LADDER TOO as of 2026-07-31, and it is the one ladder here
     * that is NON-DECREASING rather than strictly increasing. That is deliberate and is
     * worth saying, because a weaker assertion sitting beside three strict ones reads like
     * an oversight: a fire's magnitude is the disc AND how long it holds, the disc above is
     * already strictly increasing, so the pair is strictly increasing whichever rungs share
     * a duration. Ties are what let the duration be spent where it is earned instead of
     * being handed to every rung at once.
     */
    const burns = WINTER_TIERS.map((t) => HARD_WINTER.fire.burn_rounds_by_tier[t]);
    for (let i = 1; i < burns.length; i += 1) {
      expect(
        burns[i] as number,
        `fire duration at ${WINTER_TIERS[i]}: ${JSON.stringify(burns)}`,
      ).toBeGreaterThanOrEqual(burns[i - 1] as number);
    }
    // Every rung is a real number of rounds. Zero would be a fire that was never lit, which
    // contradicts the bottom rung being a lit fire that wards nothing.
    for (const [index, rounds] of burns.entries()) {
      expect(rounds, `${WINTER_TIERS[index]} burns for no rounds`).toBeGreaterThanOrEqual(
        1,
      );
      expect(Number.isInteger(rounds), `${WINTER_TIERS[index]} is a whole round`).toBe(
        true,
      );
    }

    /*
     * AND THE SCALAR A PRE-BATCH SENTENCE MAY QUOTE IS PINNED TO THE LADDER'S FLOOR, so a
     * number shown before the player knows their accuracy cannot drift into promising
     * something a fire might not deliver. The declare card quoted it until 2026-07-31 and now
     * describes the ladder qualitatively instead, so nothing reads it today: this assertion is
     * what keeps it the right number for anything that quotes one again. See `burn_rounds`'
     * own docblock for why the scalar still exists at all.
     */
    expect(
      HARD_WINTER.fire.burn_rounds,
      "the card's number is not the ladder's floor",
    ).toBe(
      Math.min(
        ...WINTER_TIERS.filter((t) => t !== "none").map(
          (t) => HARD_WINTER.fire.burn_rounds_by_tier[t],
        ),
      ),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Declaring, and the ordering that is the whole design                       */
/* -------------------------------------------------------------------------- */

describe("declare before you earn", () => {
  it("locks the declaration: a second declare in the same round is ignored", () => {
    const start = createHardWinter({ era: ERA });
    const first: WinterAction = { kind: "reinforce", node_id: "NUM.5" };
    const declared = hardWinterReducer(start, { type: "declare", action: first });

    expect(declared.phase).toBe("answering");
    expect(declared.declared).toEqual(first);

    const secondThoughts = hardWinterReducer(declared, {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.S" },
    });
    // Same object, not merely an equal one: committing is what makes the round a gamble.
    expect(secondThoughts).toBe(declared);
    expect(secondThoughts.declared).toEqual(first);
  });

  it("cannot resolve a round nobody declared", () => {
    const start = createHardWinter({ era: ERA });
    const resolved = hardWinterReducer(start, { type: "resolve", correct: 3, asked: 3 });
    expect(resolved).toBe(start);
  });

  it("cannot close a round that has not resolved", () => {
    const start = createHardWinter({ era: ERA });
    expect(hardWinterReducer(start, { type: "end_round" })).toBe(start);

    const declared = hardWinterReducer(start, {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.S" },
    });
    expect(hardWinterReducer(declared, { type: "end_round" })).toBe(declared);
  });

  it("refuses an illegal declaration for free rather than eating the round", () => {
    const start = createHardWinter({ era: ERA });

    // Open water.
    expect(winterActionRefusal(start, { kind: "fire", col: 99, row: 99 })).toMatch(
      /open water/,
    );
    // A building nobody built.
    expect(winterActionRefusal(start, { kind: "reinforce", node_id: "NOPE.1" })).toMatch(
      /no building/,
    );

    const attempted = hardWinterReducer(start, {
      type: "declare",
      action: { kind: "fire", col: 99, row: 99 },
    });
    expect(attempted).toBe(start);
    expect(attempted.phase).toBe("declaring");
  });

  it("will not reinforce a ruin, and says it can be rebuilt instead", () => {
    // Zero-accuracy rounds take the shoreline Lookout in the FIRST round: it stands on rim band
    // 0, which is exactly what round one's frost takes, and at `ruin_at: 1` one unabsorbed point
    // is the whole building. It took three rounds at `ruin_at: 6`.
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    expect(building(end, "NUM.5").state).toBe("ruin");

    // MID-WINTER rather than at the end, because the refusal a surface has to render is the one
    // it gets while the winter is still taking declarations. One round is enough now; it was
    // three while a building absorbed six points.
    const midWinter = playRound(
      createHardWinter({ era: ERA }),
      { kind: "fire", col: 0, row: 0 },
      0,
    );
    expect(
      midWinter.phase,
      "the winter ended, so the refusal below is a phase refusal",
    ).toBe("declaring");
    expect(building(midWinter, "NUM.5").state).toBe("ruin");
    expect(winterActionRefusal(midWinter, { kind: "reinforce", node_id: "NUM.5" })).toMatch(
      /rebuilt after the winter/,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Fire                                                                       */
/* -------------------------------------------------------------------------- */

describe("a fire holds the frost off a patch", () => {
  it("wards a disc whose size is the tier's, and nothing at the bottom", () => {
    const expected: Readonly<Record<WinterActionTier, number>> = {
      // The shipped ladder, as CELL COUNTS rather than radii: 0% / 1.1% / 5.7% / 14.8%
      // of era one's 88-cell island. Written out here rather than derived from
      // `winterWardArea`, because this is the assertion that would catch the ward's
      // metric changing back to a square (which would read 0, 1, 9, 25).
      none: 0,
      weak: 1,
      steady: 5,
      strong: 13,
    };

    for (const [correct, tier] of [
      [0, "none"],
      [1, "weak"],
      [2, "steady"],
      [3, "strong"],
    ] as const) {
      let state = createHardWinter({ era: ERA });
      state = hardWinterReducer(state, {
        type: "declare",
        // Deep enough that a radius-2 disc is entirely on land.
        action: { kind: "fire", col: 0, row: 0 },
      });
      state = hardWinterReducer(state, { type: "resolve", correct, asked: 3 });

      expect(state.last_resolution?.tier).toBe(tier);
      expect(wardedWinterCells(state).size, `${tier} ward`).toBe(expected[tier]);
      // The same numbers off the tuning table's own radii, so the table and the board
      // cannot disagree about what a tier buys.
      expect(winterWardArea(HARD_WINTER.fire.radius_by_tier[tier]), tier).toBe(
        expected[tier],
      );
    }
  });

  /**
   * THE RETUNE, pinned as the thing that was actually wrong: the top tier held 28% of the
   * island in one action. The share is what the complaint was about, so the share is what
   * is asserted — against the island's own cell count, so a change to the era's radius
   * moves both sides together.
   *
   * The ceiling is a real bound and not a restatement of the table: a fifth of the board
   * is 17.6 cells, and the strong disc is 13.
   */
  it("never lets one action hold more than a fifth of the island, at any tier", () => {
    const island = hardWinterIsland(ERA);
    expect(island.cells.length).toBe(88);

    const shares = WINTER_TIERS.map((tier) => ({
      tier,
      cells: winterWardArea(HARD_WINTER.fire.radius_by_tier[tier]),
    }));
    expect(shares.map((s) => s.cells)).toEqual([0, 1, 5, 13]);

    for (const { tier, cells } of shares) {
      expect(cells / island.cells.length, `${tier} holds too much board`).toBeLessThan(0.2);
    }

    // And the ladder is still legible: every step at least doubles the ground held, so
    // "accuracy buys visibly more" survives the shrink.
    const rungs = shares.filter((s) => s.cells > 0).map((s) => s.cells);
    expect(rungs).toEqual([1, 5, 13]);
    for (let i = 1; i < rungs.length; i += 1) {
      expect((rungs[i] as number) / (rungs[i - 1] as number), `step ${i}`).toBeGreaterThan(
        2,
      );
    }
  });

  /**
   * The disc is what makes the radius a tuning dial instead of a three-position switch,
   * so the rungs BETWEEN the shipped ones are asserted too: a retune to 1.5 or 2.5 must
   * not need a code change, and the tuning table quotes these counts.
   */
  it("offers rungs between the shipped ones, so the top tier can be shrunk again", () => {
    expect([0, 1, 1.5, 2, 2.5, 3].map(winterWardArea)).toEqual([1, 5, 9, 13, 21, 29]);
    // A square would give 1, -, 9, 25, -, 49: nothing between 9 and 25, which is why
    // "cover less than a 5x5" had no setting before this.
    expect(winterWardArea(null)).toBe(0);
    expect(() => winterWardOffsets(-1)).toThrow(/non-negative/);

    // Every offset really is inside the disc, and the disc really is symmetric.
    for (const radius of [1, 1.5, 2, 2.5]) {
      const offsets = winterWardOffsets(radius);
      for (const { col, row } of offsets) {
        expect(col * col + row * row, `(${col},${row}) at r=${radius}`).toBeLessThanOrEqual(
          radius * radius,
        );
        expect(
          offsets.some((o) => o.col === -col && o.row === -row),
          `(${col},${row}) has no opposite at r=${radius}`,
        ).toBe(true);
      }
    }
  });

  it("still lights the fire at the bottom rung — accuracy is magnitude, not permission", () => {
    let state = createHardWinter({ era: ERA });
    state = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "fire", col: 0, row: 0 },
    });
    state = hardWinterReducer(state, { type: "resolve", correct: 0, asked: 3 });

    // The declaration was honoured: there IS a fire, and its log entry says so.
    expect(state.fires).toHaveLength(1);
    expect(state.fires[0]?.radius).toBeNull();
    expect(state.last_resolution?.magnitude).toBeNull();
    expect(state.last_resolution?.helped).toEqual([]);
  });

  it("blocks the frost rather than only sheltering the ground under it", () => {
    // A radius-2 bonfire on the western shore, lit before the frost has moved at all.
    const covered = playRound(
      createHardWinter({ era: ERA }),
      { kind: "fire", col: -4, row: -2 },
      3,
    );
    const bare = playRound(
      createHardWinter({ era: ERA }),
      { kind: "fire", col: 3, row: 3 },
      0,
    );

    expect(covered.frozen.length).toBeLessThan(bare.frozen.length);
    // Nothing inside the ward froze, including the shoreline cells that would have.
    const warded = wardedWinterCells(
      playRound(createHardWinter({ era: ERA }), { kind: "fire", col: -4, row: -2 }, 3),
    );
    expect(warded.size).toBeGreaterThan(0);
    for (const key of covered.frozen) {
      expect(warded.has(key), `${key} froze inside the ward`).toBe(false);
    }
  });

  /**
   * SHAPE CHANGE 2026-07-31, not a value change: `burn_rounds` became
   * `burn_rounds_by_tier`, so the duration this reads is the one the tier it lights at
   * earned. The fire here is lit at 3 of 3, which is `strong`, and the property proved is
   * the same one as before — a fire lit this round has its tier's duration less the round
   * it was lit in, and stops holding ground once that many rounds have closed.
   *
   * **WHAT "GONE" MEANS CHANGED 2026-08-02, and the claim did not.** This used to end at
   * `fires` being empty, which was the engine DELETING a spent hearth; a spent hearth is a
   * state now (see `WinterFire`), so the fire is still on the board and holds nothing. The
   * defect this guards against is a fire that never stops warding, and that is the line
   * below rather than the length — `wardedWinterCells` is what the frost reads.
   */
  it("burns out after its rounds, and the frost comes back through", () => {
    const burn = HARD_WINTER.fire.burn_rounds_by_tier.strong;
    let state = playRound(
      createHardWinter({ era: ERA }),
      { kind: "fire", col: -4, row: -2 },
      3,
    );
    expect(state.fires).toHaveLength(1);
    expect(state.fires[0]?.rounds_left).toBe(burn - 1);
    expect(wardedWinterCells(state).size).toBeGreaterThan(0);

    for (let round = 1; round < burn; round += 1) {
      state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 0);
    }
    expect(state.fires).toHaveLength(1);
    expect(winterFireState(state.fires[0] as WinterFire)).toBe("spent");
    expect(wardedWinterCells(state).size).toBe(0);
  });

  /**
   * **AND HOW LONG IT BURNS IS BOUGHT WITH ACCURACY TOO**, which is the half of the fire's
   * magnitude that used to be a flat constant. Quantified over the whole tier ladder rather
   * than spot-checked at the top, so a rung that stopped reading the table would fail here.
   */
  it("burns for the number of rounds the batch earned, rung by rung", () => {
    let measured = 0;
    for (const tier of WINTER_TIERS) {
      // The score that resolves this rung, found through the real ladder rather than
      // assumed, so a retune of `tiers` cannot quietly aim this at the wrong rung.
      const correct = [0, 1, 2, 3].find(
        (score) => winterTierFor(score, HARD_WINTER.batch_size) === tier,
      );
      expect(correct, `no score in a batch of 3 resolves ${tier}`).toBeTypeOf("number");

      const state = playRound(
        createHardWinter({ era: ERA }),
        { kind: "fire", col: -4, row: -2 },
        correct as number,
      );
      const lit = state.fires[0] as WinterFire;
      // A fire is lit at every rung, `none` included: accuracy is magnitude, not permission.
      // One round of the fire's life is already spent, because the count includes the round
      // it was lit in, so a rung of exactly one round has nothing left at the end of it.
      const rung = HARD_WINTER.fire.burn_rounds_by_tier[tier];
      expect(state.fires, `${tier} fire`).toHaveLength(1);
      expect(lit.rounds_left, `${tier} fire`).toBe(rung - 1);
      // AND THE STATE THE BOARD READS OFF THAT, which is the half a bare count cannot carry:
      // the bottom rung is a hearth that never caught rather than one that has burnt out, at
      // the same `rounds_left: 0`. (This branch used to assert `fires` was EMPTY at rung 1,
      // which was the engine deleting the hearth; see `WinterFire`.)
      expect(winterFireState(lit), `${tier} fire`).toBe(
        rung > 1 ? "burning" : "never_caught",
      );
      measured += 1;
    }
    // Floor: the sweep really walked every rung, and there is more than one rung to walk.
    expect(measured).toBe(WINTER_TIERS.length);
    expect(measured).toBeGreaterThanOrEqual(4);

    // AND THE RUNGS ARE NOT ALL THE SAME, or "by tier" is a table with one value in it
    // wearing four names. This is the assertion that fails if the ladder is flattened back
    // to a scalar in everything but shape.
    const rungs = WINTER_TIERS.map((t) => HARD_WINTER.fire.burn_rounds_by_tier[t]);
    expect(new Set(rungs).size, JSON.stringify(rungs)).toBeGreaterThan(1);
  });

  it("keeps a building on frozen ground warm, so a fire is a real rescue", () => {
    // The Lookout is on the shoreline: it is cold from the end of round one.
    let state = playRound(
      createHardWinter({ era: ERA }),
      { kind: "reinforce", node_id: "NUM.S" },
      0,
    );
    const lookout = building(state, "NUM.5");
    expect(state.frozen).toContain(winterCellKey(lookout.col, lookout.row));
    expect(lookout.cold_rounds).toBe(1);

    // A fire on its own frozen cell: the ground stays frozen, the building stops taking cold.
    state = playRound(state, { kind: "fire", col: 4, row: 0 }, 3);
    expect(state.frozen).toContain(winterCellKey(lookout.col, lookout.row));
    expect(building(state, "NUM.5").cold_rounds).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Reinforce                                                                  */
/* -------------------------------------------------------------------------- */

describe("reinforcing shields one building", () => {
  it("adds the tier's shield points, and only to the named building", () => {
    for (const [correct, extra] of [
      [0, 0],
      [1, 2],
      [2, 4],
      [3, 6],
    ] as const) {
      let state = createHardWinter({ era: ERA });
      state = hardWinterReducer(state, {
        type: "declare",
        action: { kind: "reinforce", node_id: "NUM.S" },
      });
      state = hardWinterReducer(state, { type: "resolve", correct, asked: 3 });

      expect(building(state, "NUM.S").shield, `at ${correct} of 3`).toBe(extra);
      for (const other of state.buildings.filter((b) => b.node_id !== "NUM.S")) {
        expect(other.shield).toBe(0);
      }
    }
  });

  it("stacks, and raises the damage budget by exactly what it added", () => {
    let state = createHardWinter({ era: ERA });
    expect(winterDamageBudget(building(state, "NUM.S"))).toBe(HARD_WINTER.damage.ruin_at);

    state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 3);
    state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 1);
    expect(building(state, "NUM.S").shield).toBe(8);
    expect(winterDamageBudget(building(state, "NUM.S"))).toBe(
      HARD_WINTER.damage.ruin_at + 8,
    );
  });

  /**
   * THE DIFFERENCE BETWEEN A SHIELD AND A MEND, which is the only reason both actions
   * exist. Under a headroom rule they would be the same number in different clothes.
   *
   * The Lookout stands on the shoreline, so it is cold from the end of round one. Shielded
   * in round one it comes through UNMARKED; shielded in round two it is already gone.
   *
   * **RESTATED FOR `ruin_at: 2` (2026-08-01), AND THE OLD WORDING IS THE POINT.** It read
   * *"shielded in round two it survives exactly as long and still carries the scar the first
   * round gave it"*, and the second half was measured at `ruin_at: 6`, where one early bite
   * was a third of a building. Two points is one bite now, so the building the shield
   * arrives a round late for is not scarred, it is a ruin, and this test says so. The claim
   * the assertion carries is unchanged and is now sharper: a shield acts on the FUTURE, so
   * WHEN it is bought is the whole of it, and the price of buying it late went from a mend
   * bill to the building. (Measured at four rounds and at five alike: this is the ruin
   * threshold's doing and nothing to do with the length of the winter.)
   */
  it("absorbs the bite instead of raising the ceiling, so timing is the whole of it", () => {
    const inTime = playRound(
      createHardWinter({ era: ERA }),
      { kind: "reinforce", node_id: "NUM.5" },
      3,
    );
    expect(building(inTime, "NUM.5").damage).toBe(0);
    expect(building(inTime, "NUM.5").cold_rounds).toBe(1);
    expect(building(inTime, "NUM.5").state).toBe("standing");
    // The shield paid for it, and is that much thinner for having done so.
    expect(building(inTime, "NUM.5").shield).toBe(
      HARD_WINTER.reinforce.shield_by_tier.strong - winterDamageBite(1),
    );

    expect(hardWinterOutcome(inTime).recovery_cost).toBe(0);

    // THE WINDOW IS ONE ROUND WIDE, and that is what "too late" means now. One bite is the
    // whole of `ruin_at`, so a round spent elsewhere does not leave a scar for a shield to
    // arrive after: it leaves a ruin, and the second declaration is refused outright.
    const elsewhere = playRound(
      createHardWinter({ era: ERA }),
      { kind: "reinforce", node_id: "NUM.S" },
      3,
    );
    expect(winterDamageBite(1)).toBeGreaterThanOrEqual(HARD_WINTER.damage.ruin_at);
    expect(building(elsewhere, "NUM.5").state).toBe("ruin");
    expect(building(elsewhere, "NUM.5").ruined_in_round).toBe(1);
    expect(building(elsewhere, "NUM.5").damage).toBe(HARD_WINTER.damage.ruin_at);
    expect(winterActionRefusal(elsewhere, { kind: "reinforce", node_id: "NUM.5" })).toMatch(
      /ruin cannot be reinforced/,
    );

    // The same board one round apart, in the currency the outcome reports: nothing owed
    // against a whole rebuild.
    expect(hardWinterOutcome(elsewhere).recovery_cost).toBe(
      HARD_WINTER.rebuild_cost_per_ruin,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Damage, and the repair that undoes it                                      */
/* -------------------------------------------------------------------------- */

describe("a building is sound or it is a ruin, and there is nothing in between", () => {
  /**
   * **THE PROPERTY THE 2026-08-02 RULING CREATED, AND IT IS THE INVERSE OF THE ONE THIS BLOCK WAS
   * WRITTEN FOR.**
   *
   * The block was titled *"a building takes damage before it is lost"*, and its first test was
   * *"marks a building the frost reaches without finishing it"* — the property the whole graded
   * retune existed for, at its smallest: a building the frost had reached and not finished, on the
   * outcome, with a price on it.
   *
   * **`HARD_WINTER.damage.ruin_at: 1` makes that unreachable**, and the lead ruled it so in those
   * words: *"frost should instantly destroy buildings."* So the claim inverts, and it is asserted
   * as a PROOF over the whole space rather than as one fixture that fails to produce a scar:
   * every shield a player can raise, against every bite the winter can deal, either absorbs the
   * bite whole or leaves the building a ruin. Nothing lands in between, at any accuracy, in any
   * round.
   *
   * The route the old fixture used is worth recording, because it is what a `ruin_at` of 2 or more
   * brings back: two points of shield meeting a deep bite of three, on the shoreline Lookout,
   * warded for the three rounds a top-tier fire burns and then met by round four with a `weak`
   * shield on it. There is no round four now and no bite a `weak` shield fails to cover by exactly
   * one point.
   */
  it("absorbs a bite whole or loses the building, over every shield and every round", () => {
    const shields = WINTER_TIERS.map((tier) => HARD_WINTER.reinforce.shield_by_tier[tier]);
    const rounds = Array.from({ length: HARD_WINTER.rounds }, (_, i) => i + 1);
    expect(shields, "no shield rungs to sweep").not.toEqual([]);
    expect(rounds, "no rounds to sweep").not.toEqual([]);

    let swept = 0;
    const outcomes = new Set<string>();
    for (const shield of shields) {
      for (const round of rounds) {
        // The rule `closeRound` applies, written out: the shield is spent first and whatever is
        // left over strikes the building.
        const bite = winterDamageBite(round);
        const absorbed = Math.min(shield, bite);
        const struck = bite - absorbed;
        const damage = Math.min(HARD_WINTER.damage.ruin_at, struck);
        outcomes.add(damage >= HARD_WINTER.damage.ruin_at ? "ruin" : `standing:${damage}`);
        swept += 1;
      }
    }
    expect(swept).toBe(shields.length * rounds.length);

    // THE CENSUS. Two outcomes, and the only standing one is undamaged.
    expect([...outcomes].sort()).toEqual(["ruin", "standing:0"]);

    // AND THE SAME FACT THROUGH THE REDUCER, so this is not only arithmetic about a formula: a
    // whole winter's log, at every accuracy, never reports a building as damaged-not-ruined.
    let reported = 0;
    for (const correct of [0, 1, 2, 3]) {
      let state = createHardWinter({ era: ERA });
      while (state.phase !== "ended") {
        state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, correct);
      }
      for (const round of state.log) {
        expect(round.damaged, `round ${round.round} at ${correct} of 3`).toEqual([]);
        reported += 1;
      }
      expect(hardWinterOutcome(state).damaged).toEqual([]);
      expect(hardWinterOutcome(state).repair_cost).toBe(0);
    }
    expect(reported).toBe(4 * HARD_WINTER.rounds);
    // A floor: the frost really did reach something, so the silence above is a measurement of
    // the damage model rather than of an untouched island.
    expect(
      hardWinterOutcome(playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0))).ruined
        .length,
    ).toBeGreaterThan(0);
  });

  it("bites harder as the winter deepens, on the frost's own shape", () => {
    const schedule = Array.from({ length: HARD_WINTER.rounds }, (_, i) =>
      winterDamageBite(i + 1),
    );
    // Measured at the 2026-08-02 set. It read [2, 2, 2, 3, 3] at five rounds.
    expect(schedule).toEqual([1, 2, 3]);
    // The relationship, not the digits: never eases, and ends harder than it began.
    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i] as number).toBeGreaterThanOrEqual(schedule[i - 1] as number);
    }
    expect(schedule[schedule.length - 1] as number).toBeGreaterThan(schedule[0] as number);
    // **WHAT A BITE DECIDES, RESTATED AGAIN FOR `ruin_at: 1`.** It read
    // `expect(schedule[0]).toBeLessThan(ruin_at / 2)` — *"two early bites is a third of a
    // building"* — while a building absorbed six points, and was restated at `ruin_at: 2` to say
    // that every rung is at or over the threshold. At one point that is trivially true of any
    // positive bite, so what is asserted instead is the only thing the ladder can still decide:
    // **how much of a SHIELD one cold round eats.**
    for (const bite of schedule) {
      expect(bite, `a bite of ${bite}`).toBeGreaterThanOrEqual(HARD_WINTER.damage.ruin_at);
    }
    // A `weak` shield covers the opening round and no more, a `steady` one covers two, and a
    // `strong` one covers the whole winter exactly. That is the whole shield ladder read off this
    // schedule, pinned as three equalities so a retune of either table fails here — see
    // `HARD_WINTER.damage.bite`, where a flat bite is measured making `steady` an immunity.
    const cumulative = schedule.map((_, index) =>
      schedule.slice(0, index + 1).reduce((total, bite) => total + bite, 0),
    );
    expect(cumulative, "the running cost of standing cold all winter").toEqual([1, 3, 6]);
    const covers = (shield: number): number =>
      cumulative.filter((spent) => spent <= shield).length;
    expect(covers(HARD_WINTER.reinforce.shield_by_tier.weak), "a weak shield").toBe(1);
    expect(covers(HARD_WINTER.reinforce.shield_by_tier.steady), "a steady shield").toBe(2);
    expect(
      covers(HARD_WINTER.reinforce.shield_by_tier.strong),
      "a strong shield covers the whole winter and nothing is left over",
    ).toBe(HARD_WINTER.rounds);
    expect(
      cumulative[cumulative.length - 1],
      "a top-tier shield covers every round exactly, with nothing spare",
    ).toBe(HARD_WINTER.reinforce.shield_by_tier.strong);
  });

  /**
   * **THE STAGE READ-OUT, AND THE CENSUS THAT PINS HOW MUCH OF IT IS REACHABLE.**
   *
   * The structural claims are unchanged and still hold: sound reads 0, a ruin reads
   * `stages`, everything between is monotone and inside the range, and a marked building
   * never draws as sound. What is restated is the pair of band assertions that named
   * SPECIFIC rungs (`stageAt(1) === 1` and `stageAt(ruin_at - 1) === stages`), because at
   * `ruin_at: 2` there is one damage value a standing building can carry and it lands on the
   * middle band: the table is 0, 2, 3.
   *
   * So the reachable appearances are pinned as a CENSUS of exactly one, both as the literal
   * and as the relationship it comes from. Restoring `ruin_at` to a value with room in it
   * fails the literal and sends the reader to `HARD_WINTER.damage.stages`, which is where
   * the two dead CSS rules are recorded.
   */
  it("reads as a stage a renderer can draw, and never past the ruin", () => {
    const sound = building(createHardWinter({ era: ERA }), "NUM.5");
    expect(winterDamageStage(sound)).toBe(0);

    const stages = HARD_WINTER.damage.stages;
    const stageAt = (damage: number): number =>
      winterDamageStage({ ...sound, damage } as typeof sound);

    // Every point below the ruin lands on a stage, the stages never go backwards, and a
    // building the frost has marked never draws as a sound one.
    let previous = 0;
    for (let damage = 1; damage < HARD_WINTER.damage.ruin_at; damage += 1) {
      const stage = stageAt(damage);
      expect(stage, `damage ${damage} draws as sound`).toBeGreaterThanOrEqual(1);
      expect(stage, `damage ${damage}`).toBeGreaterThanOrEqual(previous);
      expect(stage, `damage ${damage}`).toBeLessThanOrEqual(stages);
      previous = stage;
    }

    // **THE CENSUS, AND AT `ruin_at: 1` IT IS EMPTY.** A standing building can carry `ruin_at - 1`
    // damage values, which is zero of them, so there is no damaged appearance for a renderer to
    // draw and every one of `hw-cell--hurt`, `hw-cell--hurt-1`, `-2` and `-3` in
    // `hard-winter.css` is a dead rule. It read `[2]` at `ruin_at: 2` (one appearance, the middle
    // one) and would read `[1, 2, 3]` at 6.
    //
    // ASSERTED AS AN EQUALITY AGAINST A DERIVED SIZE rather than as `toEqual([])`, because an
    // empty set is exactly what a broken sweep produces: the derivation is what says the emptiness
    // was measured rather than defaulted, and `HARD_WINTER.damage.ruin_at` carries the reasoning.
    const reachable = new Set<number>();
    for (let damage = 1; damage < HARD_WINTER.damage.ruin_at; damage += 1) {
      reachable.add(stageAt(damage));
    }
    expect(
      [...reachable].sort(),
      "the damaged appearances a standing building can wear",
    ).toEqual([]);
    expect(reachable.size).toBe(Math.min(stages, HARD_WINTER.damage.ruin_at - 1));
    expect(
      reachable.size,
      "all three hurt rules in hard-winter.css are dead, and so is the rime overlay",
    ).toBe(0);

    // A ruin is the ceiling rather than a fourth band: it has its own treatment.
    expect(stageAt(HARD_WINTER.damage.ruin_at)).toBe(stages);
    expect(winterDamageStage({ ...sound, state: "ruin", damage: 99 } as typeof sound)).toBe(
      stages,
    );
  });

  /**
   * **THE MEND BILL, AND THE BOUND THAT REPLACED AN EQUALITY.**
   *
   * This read `repair_cost_per_point * ruin_at === rebuild_cost_per_ruin` and
   * `winterMendCost(ruin_at / 2) === rebuild_cost_per_ruin / 2` — the tuning table's
   * "half-wrecked is half-price" as arithmetic. `ruin_at: 2` falsified it: ten times two is
   * 20 against 60, and `HARD_WINTER.damage.repair_cost_per_point` measures what restoring
   * the equality would cost the accuracy ladder (the weakest gap goes from 50 to 30) and
   * records the ruling not to.
   *
   * What is asserted instead is the half D-CRISIS-12 needs — a mend is never dearer than the
   * rebuild it replaces, so a third bill cannot push recovery out of reach — plus the whole
   * mend ladder as a CENSUS.
   *
   * ## ⚑ THE LADDER HAS ONE RUNG AND IT IS ZERO, WHICH IS WHY THE CENSUS IS THE ASSERTION
   *
   * At `ruin_at: 1` (ruled 2026-08-02) no standing building can carry a point, so the bound below
   * is swept over a ladder with nothing payable on it and would hold over ANY price. That is
   * exactly the shape a guard fails silently in, so the census is what carries this test: the
   * whole ladder is `[0]`, pinned, and it is `[0, 10]` at `ruin_at: 2` and six rungs long at 6.
   * A retune upward fails here and lands on `HARD_WINTER.damage.repair_cost_per_point`, which is
   * where the price's own unreachability is recorded.
   */
  it("prices a mend under the rebuild it replaces, on every rung of the ladder", () => {
    // The ladder, pinned. There is one entry and it is the sound building's zero: mending is still
    // 10 material a point, and there is no point a standing building can owe.
    const ladder = Array.from({ length: HARD_WINTER.damage.ruin_at }, (_, damage) =>
      winterMendCost(damage),
    );
    expect(ladder, "the whole mend ladder").toEqual([0]);
    expect(
      HARD_WINTER.damage.repair_cost_per_point * HARD_WINTER.damage.ruin_at,
      "the identity this replaced: 60 while `ruin_at` was 6, 20 at 2, 10 now",
    ).toBe(10);
    // AND THE PER-POINT PRICE IS STILL AUTHORED AND STILL CORRECT, which is the half the empty
    // ladder could hide: the function that prices a point has not quietly become a no-op.
    expect(winterMendCost(1)).toBe(HARD_WINTER.damage.repair_cost_per_point);
    expect(winterMendCost(3)).toBe(HARD_WINTER.damage.repair_cost_per_point * 3);

    // THE BOUND, swept over every damage a standing building can carry, and floored so the
    // sweep cannot pass by having nothing to walk. The floor is now 1 rather than 2, and it is
    // what makes the emptiness above deliberate: the sweep really did walk the whole ladder.
    let swept = 0;
    for (let damage = 0; damage < HARD_WINTER.damage.ruin_at; damage += 1) {
      expect(winterMendCost(damage), `${damage} points`).toBeLessThan(
        HARD_WINTER.rebuild_cost_per_ruin,
      );
      swept += 1;
    }
    expect(swept).toBe(HARD_WINTER.damage.ruin_at);
    expect(swept).toBeGreaterThanOrEqual(1);

    // And the PRICE is monotone, so a deeper scar always costs more than a shallower one. Swept
    // over the price function rather than over the reachable ladder, because at `ruin_at: 1` the
    // reachable ladder has one entry and a monotonicity claim over one value is no claim. That is
    // what stops the price becoming a flat fee wearing a per-point name.
    for (let damage = 1; damage <= 6; damage += 1) {
      expect(winterMendCost(damage), `${damage} points`).toBeGreaterThan(
        winterMendCost(damage - 1),
      );
    }
  });

  it("caps damage at the ruin, so the scale never runs past the end of it", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    for (const b of end.buildings.filter((x) => x.state === "ruin")) {
      expect(b.damage, b.node_id).toBe(HARD_WINTER.damage.ruin_at);
    }
  });
});

/**
 * **DAMAGE THE FROST HAS DONE STAYS DONE, and that is now a rule rather than a gap.**
 *
 * There used to be a `repair` action here, and this block used to be its ladder, its
 * refusals and its preview. The lead ruled it out on 2026-07-31 as a dominated choice: it
 * spent a whole round undoing harm the frost had already done, while the frost advanced
 * anyway, and the same damage is repairable on the island afterwards for material.
 *
 * The assertions did not simply come out with it. What replaces them is the property the
 * removal CREATES — `WinterBuilding.damage` is monotone inside a winter — plus the two
 * claims the old block was really carrying, restated against the mechanic that now carries
 * them: a bad opening is still answerable, and the winter is still not decided early.
 */
describe("damage the frost has done stays done", () => {
  /**
   * NO ACTION LOWERS DAMAGE OR TAKES A RUIN BACK, swept over the action set rather than
   * argued from the fact that one member was deleted. `repair` was the only kind that could,
   * so this is the inverse of the assertion that used to say so, and it is the guard that
   * would fail if some later action quietly grew an undo — which is the shape the lead's
   * ruling forbids.
   *
   * The population is derived from `WinterActionKind` through a total record, so a new kind
   * does not compile until it is listed here, and it is floored at three so a sweep over an
   * empty list cannot pass.
   *
   * ## WHY THE SECOND HALF WAS ADDED, and it is a fact about `ruin_at: 2` rather than a
   * belt-and-braces flourish
   *
   * Mid-winter, at the shipped tuning, **no standing building can be carrying damage at
   * all**: one bite is the whole of `ruin_at`, and the only bite a shield can leave a point
   * of is the last round's, whose close ends the winter. So a sweep asking only "did damage
   * go down" is asking it of ruins and of undamaged survivors, and an undo action aimed at
   * standing buildings would walk straight past it. The un-ruin half is what carries the
   * claim on this board; the standing-damage half is carried by the whole-winter sweep below
   * and by *"marks a building the frost reaches without finishing it"*, which reaches the one
   * state that has a scar in it.
   */
  it("has no declarable action that takes damage back off a building, or a ruin back", () => {
    let hurt = createHardWinter({ era: ERA });
    for (let round = 1; round < HARD_WINTER.rounds; round += 1) {
      hurt = playRound(hurt, { kind: "reinforce", node_id: "NUM.S" }, 0);
    }
    const before = new Map(hurt.buildings.map((b) => [b.node_id, b.damage] as const));
    const ruinsBefore = hurt.buildings
      .filter((b) => b.state === "ruin")
      .map((b) => b.node_id);
    // **THE DAMAGED-FIXTURE FLOOR IS GONE, and the ruin floor is what replaces it.** It read
    // `some(damage > 0)`, and at `HARD_WINTER.damage.ruin_at: 1` no standing building can carry a
    // point (see *"a building is sound or it is a ruin"*), so there is no damage for an action to
    // lower and the honest floor is that the frost has DONE something. The sweep below is kept at
    // full strength anyway: what it guards against is a future action growing an undo, which is
    // the dominated choice the lead ruled out on 2026-07-31 wearing a new name.
    expect(
      ruinsBefore.length,
      "the fixture has no ruins, so this sweep would prove nothing",
    ).toBeGreaterThanOrEqual(4);

    // Keyed on the union so the set cannot fall behind the engine: one representative
    // declaration per kind, at the top tier, which is the most an action could ever undo.
    // The shield is aimed at the heart because it is the only building the frost has not
    // finished by the last round of a wasted winter, and a ruin cannot be reinforced, so any
    // other target would have the sweep measuring a refusal.
    //
    // TWO ENTRIES. `abandon` was the third until 2026-08-02, and it is the exhaustive keying that
    // required its removal here rather than leaving a dead declaration the reducer ignored.
    const oneOfEachKind: Readonly<Record<WinterAction["kind"], WinterAction>> = {
      fire: { kind: "fire", col: 2, row: -1 },
      reinforce: { kind: "reinforce", node_id: "NUM.S" },
    };
    const kinds = Object.keys(oneOfEachKind) as WinterAction["kind"][];
    expect(kinds.length, "the action set is empty").toBeGreaterThanOrEqual(2);

    let checked = 0;
    for (const kind of kinds) {
      const action = oneOfEachKind[kind];
      expect(canDeclareWinterAction(hurt, action), `${kind} is not declarable`).toBe(true);
      // Resolve only, so nothing the FROST does is in the way of reading the action's effect.
      const applied = hardWinterReducer(
        hardWinterReducer(hurt, { type: "declare", action }),
        { type: "resolve", correct: HARD_WINTER.batch_size, asked: HARD_WINTER.batch_size },
      );
      for (const b of applied.buildings) {
        expect(b.damage, `${kind} lowered ${b.node_id}`).toBeGreaterThanOrEqual(
          before.get(b.node_id) as number,
        );
      }
      // AND NOTHING COMES BACK OFF THE ROLL. Abandoning ADDS ruins, so this is a subset
      // claim in one direction only, with the count under it.
      const ruinsAfter = applied.buildings
        .filter((b) => b.state === "ruin")
        .map((b) => b.node_id);
      for (const nodeId of ruinsBefore) {
        expect(ruinsAfter, `${kind} un-ruined ${nodeId}`).toContain(nodeId);
      }
      expect(ruinsAfter.length, `${kind} shortened the roll`).toBeGreaterThanOrEqual(
        ruinsBefore.length,
      );
      checked += 1;
    }
    expect(checked).toBe(kinds.length);
  });

  it("never lowers damage over a whole winter either, at any accuracy", () => {
    for (const correct of [0, 1, 2, 3]) {
      let state = createHardWinter({ era: ERA });
      let seen = new Map(state.buildings.map((b) => [b.node_id, b.damage] as const));
      let rounds = 0;
      while (state.phase !== "ended") {
        state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, correct);
        for (const b of state.buildings) {
          expect(b.damage, `${b.node_id} at ${correct} of 3`).toBeGreaterThanOrEqual(
            seen.get(b.node_id) as number,
          );
        }
        seen = new Map(state.buildings.map((b) => [b.node_id, b.damage] as const));
        rounds += 1;
      }
      expect(rounds, `at ${correct} of 3`).toBe(HARD_WINTER.rounds);
    }
  });

  /**
   * A BAD OPENING IS STILL ANSWERABLE, and this is the comparison the old mend ladder used
   * to make. It is the same shape with the counter-play moved earlier in the round: a shield
   * absorbs a whole bite BEFORE it is taken, so a round played well after a round thrown
   * away still buys something. Nothing pays a deficit down any more, and the claim is
   * deliberately the weaker one that survives: it does not compound.
   *
   * ## RESTATED FOR `ruin_at: 2`, AND THE SUBJECT MOVED ONE BUILDING ALONG
   *
   * It used to hold the shield over the building the frost had already MARKED and assert
   * that its damage stopped moving. At two points there is no marked building to hold it
   * over: the shoreline Tower is a ruin at the end of round one, and a ruin cannot be
   * reinforced. So "the deficit does not compound" is now a claim about the NEXT building in
   * the frost's path, which is what compounding was ever about — the frost works inward, and
   * the question is whether a round thrown away at the shore costs the settlement the band
   * behind it. It does not: one round of full accuracy, spent on the Commons before the
   * frost arrives, is the whole difference between it standing and falling.
   */
  it("lets a shield stop a deficit growing, which is what makes a bad opening survivable", () => {
    const island = hardWinterIsland(ERA);
    expect(island.max_rim_depth).toBe(4);

    const wasted = playRound(
      createHardWinter({ era: ERA }),
      { kind: "reinforce", node_id: "NUM.S" },
      0,
    );
    // The round is genuinely thrown away: the shoreline Tower is gone and nothing was bought.
    expect(building(wasted, "NUM.5").state).toBe("ruin");
    expect(building(wasted, "NUM.4").state, "the Commons is next, and still standing").toBe(
      "standing",
    );
    expect(building(wasted, "NUM.4").damage).toBe(0);

    // A shield on the next building the frost reaches, at full accuracy: the bite that
    // arrives at the end of this round is absorbed whole and it comes through unmarked.
    const shielded = playRound(wasted, { kind: "reinforce", node_id: "NUM.4" }, 3);
    expect(building(shielded, "NUM.4").state).toBe("standing");
    expect(building(shielded, "NUM.4").damage).toBe(0);
    expect(building(shielded, "NUM.4").cold_rounds, "it was cold, and it was covered").toBe(
      1,
    );

    // And the same round spent elsewhere loses it, which is what makes the line above a
    // choice rather than an accident of the schedule.
    const ignored = playRound(wasted, { kind: "reinforce", node_id: "NUM.S" }, 3);
    expect(building(ignored, "NUM.4").state).toBe("ruin");
    expect(hardWinterOutcome(ignored).recovery_cost).toBeGreaterThan(
      hardWinterOutcome(shielded).recovery_cost,
    );
  });

  /**
   * The whole-OUTCOME half of this — that a winter with no in-round undo is still not decided
   * by its opening rounds — is `hard-winter-difficulty.test.ts`'s *"is still not decided once
   * the opening rounds are thrown away"*. It belongs there because the claim is about the
   * recovery bill over every authored board, and that file's whole subject is the bill.
   */
});

/* -------------------------------------------------------------------------- */
/* Abandon: REMOVED 2026-08-02                                                */
/* -------------------------------------------------------------------------- */

/*
 * **A WHOLE `describe` BLOCK LIVED HERE, and the action it measured is gone by ruling.**
 *
 * The team lead, 2026-08-02: *"the give up ground option is incredibly confusing - just discard
 * it completely and keep it to two options."* `WinterAction` carries the removal and the reasons;
 * this note is the marker so a reader of THIS file's shape does not conclude the mechanic was
 * never tested.
 *
 * The seven claims that were asserted here, each named so that a future re-instatement has its
 * specification rather than having to be re-derived: that a pull-back took the next band inward
 * and never a chosen one, froze it whole in the resolution rather than at the advance, and ruined
 * whatever stood on it; that the ring went at EVERY tier including the one that bought nothing;
 * that it shielded every building still inside and none of those given up; that it put out any
 * fire standing in ground nobody held any more, which was the one path that removed a hearth from
 * the board; that a fire could not then be declared on that ground; that the heart of the
 * settlement was never abandonable; and that the held-cell count fell to the heart's four cells
 * once every other ring had gone.
 *
 * Nothing has replaced them, because there is nothing left to assert: the two remaining actions
 * are swept where they live, and *"every hearth ever lit is still on the board when the winter
 * ends"* in `hard-winter-spent-fire.test.ts` is the stronger invariant the removal created.
 */

/* -------------------------------------------------------------------------- */
/* Ruins                                                                      */
/* -------------------------------------------------------------------------- */

describe("a ruin is a state, not a deletion", () => {
  /**
   * **THE ZERO-ACCURACY BOUND, AND `ruin_at: 2` MADE IT ABSOLUTE AGAIN.**
   *
   * This read *"nothing escapes a zero-accuracy winter, but not everything is destroyed by
   * one: the heart of the settlement goes cold only on the final round, so it ends marked
   * rather than gone"*. At `ruin_at: 2` one cold round is the whole building, so the heart is
   * destroyed by that final round like everything else and **a winter played at zero accuracy
   * now ends with nothing standing.** That is the "answer nothing and lose everything" cliff
   * the damage model was introduced to remove, handed back by the ruin threshold, and
   * `HARD_WINTER.damage.ruin_at` records it as a cost of the 2026-08-01 ruling.
   *
   * So the bound is asserted in the strong form again — every building is a RUIN, not merely
   * harmed — with the softer disjunction kept underneath it, because that one is the claim the
   * design owes and the strong one is a measurement of today's tuning.
   */
  it("keeps the building, its node, its place and its history", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    const island = hardWinterIsland(ERA);

    expect(end.buildings).toHaveLength(defaultWinterLayout().buildings.length);
    expect(end.buildings.map((b) => b.node_id)).toEqual([...D1_NODES]);

    // The frost's whole advance covers the island, derived from the schedule rather than
    // written down. Under the four-round count ruled and reversed on 2026-08-01 it did not,
    // and the heart came through untouched.
    const reach = Array.from({ length: HARD_WINTER.rounds }, (_, i) =>
      winterSpreadSteps(i + 1),
    ).reduce((total, steps) => total + steps, 0);
    expect(reach, "the frost's total advance, in bands").toBeGreaterThan(
      island.max_rim_depth,
    );

    for (const b of end.buildings) {
      expect(b.state === "ruin" || b.damage > 0, b.node_id).toBe(true);
      expect(b.state, `${b.node_id} came through a wasted winter standing`).toBe("ruin");
      // Still on its cell, so the surface can still draw it and still open its lesson.
      expect(island.rim_depth.has(winterCellKey(b.col, b.row))).toBe(true);
      expect(b.ruined_in_round).not.toBeNull();
      expect(b.ruined_by).toBe("cold");
    }
    expect(hardWinterOutcome(end).survived, "nothing came through").toBe(0);
  });

  it("falls at the tier the tuning says, and reports the round it fell", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    // The freeze timetable, read off the outcome rather than asserted from the rule: the
    // shoreline Lookout in round ONE, and then everything in bands 1 and 2 in round TWO, and the
    // heart on the last round. This list read 5/5/5/4/3 with the heart at `null` while `ruin_at`
    // was 6, because a building then needed two or three cold rounds; since `ruin_at: 2` the round
    // the frost arrives IS the round the building falls, so the list is the freeze schedule
    // itself — and at `spread.accelerate_every: 1` that schedule is 1, 2, 3 rather than 1, 1, 1,
    // 1, 2, which is why the four middle buildings now share round two.
    expect(end.buildings.map((b) => [b.node_id, b.ruined_in_round] as const)).toEqual([
      ["NUM.S", 3],
      ["NUM.F", 2],
      ["NUM.2", 2],
      ["NUM.3", 2],
      ["NUM.4", 2],
      ["NUM.5", 1],
    ]);
    /*
     * Each fell on the round its own band froze, which is the relationship the list above is one
     * instance of: position decides the round, and nothing survives its own.
     *
     * **IT IS DERIVED FROM THE ADVANCE RATHER THAN FROM THE DEPTH.** It read
     * `toBe(b.rim_depth + 1)`, which was true while the frost took exactly one band a round. At
     * `spread.accelerate_every: 1` it takes one, then two, then three, so the round a band freezes
     * is the first round whose CUMULATIVE reach covers it — and pinning `depth + 1` again would be
     * pinning the old schedule under a new one.
     */
    const freezesIn = (depth: number): number => {
      let reached = 0;
      for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
        reached += winterSpreadSteps(round);
        if (reached >= depth + 1) {
          return round;
        }
      }
      throw new Error(`band ${depth} never freezes, so this winter cannot ruin everything`);
    };
    // The derivation is non-trivial at this tuning: three of the five bands share a round.
    expect([0, 1, 2, 3, 4].map(freezesIn)).toEqual([1, 2, 2, 3, 3]);
    for (const b of end.buildings) {
      expect(b.ruined_in_round, b.node_id).toBe(freezesIn(b.rim_depth));
      expect(b.cold_rounds, `${b.node_id} took one cold round and no more`).toBe(1);
    }
    // Nothing is safe by position: the deepest building is the last to fall and it still
    // falls, which is the half of this test `ruin_at: 2` inverted. It falls in round three
    // rather than round five, and it is still the LAST — `spread.accelerate_every: 1` reaches the
    // heart on the final beat, exactly as the five-round schedule did.
    expect(building(end, "NUM.S").ruined_in_round).toBe(HARD_WINTER.rounds);
    expect(
      Math.max(...end.buildings.map((b) => b.ruined_in_round ?? 0)),
      "the heart is the last thing the frost takes",
    ).toBe(building(end, "NUM.S").ruined_in_round);
    expect(winterDamageStage(building(end, "NUM.S"))).toBe(HARD_WINTER.damage.stages);
  });

  it("stops taking damage once it is a ruin, at exactly the ruin threshold", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    const ruins = end.buildings.filter((x) => x.state === "ruin");
    expect(ruins.length, "no ruins to check").toBeGreaterThanOrEqual(5);
    for (const b of ruins) {
      expect(b.damage, b.node_id).toBe(HARD_WINTER.damage.ruin_at);
    }
    // The Lookout was cold for one round and a ruin after it, so its cold count stops there
    // rather than running on to the end of the winter — it stood on frozen ground for three
    // more rounds and the counter did not move.
    expect(building(end, "NUM.5").cold_rounds).toBe(1);
    expect(building(end, "NUM.5").ruined_in_round).toBe(1);
    expect(end.log).toHaveLength(HARD_WINTER.rounds);
  });
});

/* -------------------------------------------------------------------------- */
/* The end of winter                                                          */
/* -------------------------------------------------------------------------- */

describe("winter ends, and there is nothing to lose", () => {
  it("runs exactly its rounds and then ends, with an outcome attached", () => {
    let state = createHardWinter({ era: ERA });
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      expect(state.round).toBe(round);
      expect(state.phase).toBe("declaring");
      expect(state.outcome).toBeNull();
      state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 3);
    }

    expect(state.phase).toBe("ended");
    expect(state.round).toBe(HARD_WINTER.rounds);
    expect(state.outcome).not.toBeNull();
    expect(state.log).toHaveLength(HARD_WINTER.rounds);
  });

  it("accepts nothing once it has ended", () => {
    let state = createHardWinter({ era: ERA });
    for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
      state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 3);
    }

    for (const event of [
      { type: "declare", action: { kind: "reinforce", node_id: "NUM.S" } },
      { type: "resolve", correct: 3, asked: 3 },
      { type: "end_round" },
    ] as const) {
      expect(hardWinterReducer(state, event)).toBe(state);
    }
  });

  /**
   * The two rulings, carried as literal `false` types rather than as prose, following
   * `EraTrialResult.can_retry: true`. Changing either is a type edit somebody has to
   * make on purpose.
   */
  it("writes no mastery and gates no progression", () => {
    const end = playWinter(uniformPlan({ kind: "reinforce", node_id: "NUM.S" }, 3));
    const outcome = end.outcome;
    if (!outcome) {
      throw new Error("winter did not end");
    }
    expect(outcome.writes_mastery).toBe(false);
    expect(outcome.gates_progression).toBe(false);
    // And the state carries no mastery-shaped field at all to write through.
    expect(Object.keys(end).sort()).toEqual(
      [
        "buildings",
        "declared",
        "era",
        "fires",
        "frozen",
        "last_resolution",
        "log",
        "outcome",
        "phase",
        "round",
        "rounds",
      ].sort(),
    );
  });

  it("reports what survived, what the ground looked like, and the rebuild bill", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    const outcome = hardWinterOutcome(end);

    // NOTHING SURVIVES, which is `ruin_at: 2`'s doing: these lines read `survived: 1` and
    // `ruined` of length 5 while the heart came through the last cold round scarred.
    expect(outcome.survived).toBe(0);
    expect(outcome.total).toBe(6);
    expect(outcome.ruined).toHaveLength(6);
    expect(outcome.island_cells).toBe(88);
    expect(outcome.frozen_cells).toBe(88);
    expect(outcome.rebuild_cost).toBe(6 * HARD_WINTER.rebuild_cost_per_ruin);

    // And there is no scar left to bill, because a scar needs a survivor. The third bill is
    // demonstrated by *"marks a building the frost reaches without finishing it"*, which
    // reaches the one state at this tuning that has one in it.
    expect(outcome.damaged).toEqual([]);
    expect(outcome.damage_points).toBe(0);
    expect(outcome.repair_cost).toBe(0);
    expect(outcome.recovery_cost).toBe(outcome.rebuild_cost + outcome.repair_cost);
    expect(outcome.recovery_cost).toBe(360);
  });

  /**
   * **THE FROST IS WEATHER, AND SINCE 2026-08-02 IT IS THE ONLY THING THAT TOUCHES THE ISLAND.**
   *
   * Two tests lived here. One asserted that a winter which froze all 88 cells and gave up none of
   * them owed nothing for ground, because the frost takes ground for a season and it thaws. The
   * other asserted the opposite half — that a pull-back's ground was billed cumulatively, band by
   * band, 28 then 52 then 72 cells at three material each — and that abandoning was the only way
   * the settlement could lose land.
   *
   * The give-up-ground action was ruled out (see `WinterAction`), so the second has no subject and
   * the first has no contrast. What is left is the property both were protecting, and it is now
   * structural rather than conditional: **`HardWinterOutcome` has no ground bill at all.**
   * `ruined_cells`, `held_cells` and `reclaim_cost` came off it with the action, so a winter cannot
   * bill for land by any route, and `recovery_cost` is buildings alone.
   *
   * `HARD_WINTER.reclaim_cost_per_cell` survives and is asserted where it is now used — the city's
   * crisis-generic ground repair, in `crisis-damage.test.ts` — because scars persisted by a winter
   * played before this ruling are still reclaimable.
   */
  it("has no ground bill at all, for a winter that froze the whole island", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    const outcome = hardWinterOutcome(end);

    // The island really did go entirely under ice, which is what makes the absence below a
    // measurement rather than a claim about an untouched board.
    expect(outcome.frozen_cells).toBe(88);
    expect(outcome.island_cells).toBe(88);

    // THE CENSUS. Every field the outcome has, so a ground bill cannot come back unnoticed and
    // `reclaim_cost` cannot reappear beside a mechanic nobody re-ruled.
    expect(Object.keys(outcome).sort()).toEqual([
      "damage_points",
      "damaged",
      "era",
      "frozen_cells",
      "gates_progression",
      "island_cells",
      "rebuild_cost",
      "recovery_cost",
      "repair_cost",
      "rounds",
      "ruined",
      "standing",
      "survival_ratio",
      "survived",
      "total",
      "writes_mastery",
    ]);
    // And the bill is buildings alone. Two bills where there were three: `reclaim_cost` went with
    // the action and `repair_cost` is structurally zero at `damage.ruin_at: 1`.
    expect(outcome.recovery_cost).toBe(outcome.rebuild_cost + outcome.repair_cost);
    expect(outcome.repair_cost).toBe(0);
    expect(outcome.recovery_cost).toBe(
      outcome.ruined.length * HARD_WINTER.rebuild_cost_per_ruin,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The payout seam                                                            */
/* -------------------------------------------------------------------------- */

describe("the payout is a descriptor, scaled by what survived", () => {
  it("pays per survivor and adds a bonus only for a clean sweep", () => {
    const per = HARD_WINTER.payout.per_survivor;
    const bonus = HARD_WINTER.payout.flawless_bonus;

    const none = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "e1",
      survived: 0,
      total: 6,
      ruined_cells: 0,
      damage_points: 0,
    });
    expect(none).toMatchObject({ xp: 0, gold: 0, material: 0, flawless: false });

    const some = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "e1",
      survived: 4,
      total: 6,
      ruined_cells: 0,
      damage_points: 0,
    });
    expect(some.xp).toBe(per.xp * 4);
    expect(some.material).toBe(per.material * 4);
    expect(some.flawless).toBe(false);

    const all = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "e1",
      survived: 6,
      total: 6,
      ruined_cells: 0,
      damage_points: 0,
    });
    expect(all.xp).toBe(per.xp * 6 + bonus.xp);
    expect(all.gold).toBe(per.gold * 6 + bonus.gold);
    expect(all.material).toBe(per.material * 6 + bonus.material);
    expect(all.flawless).toBe(true);
    // Monotone in survivors, so a worse winter can never pay better.
    expect(all.xp).toBeGreaterThan(some.xp);
    expect(some.xp).toBeGreaterThan(none.xp);
  });

  /**
   * A CLEAN SWEEP MEANS THE SETTLEMENT LOST NOTHING, GROUND INCLUDED — the payout half of
   * the ground cost, and the reason the parameter is required rather than defaulted.
   *
   * Saving every building by giving up most of the island is not a clean winter, and a
   * bonus that said it was would be the scoreboard endorsing the exact play
   * `reclaim_cost_per_cell` exists to price. The BANDS are untouched: same rows, same
   * numbers, and the per-survivor pay is identical either way.
   */
  it("withholds the clean-sweep bonus from a settlement that gave up ground", () => {
    const per = HARD_WINTER.payout.per_survivor;
    const bonus = HARD_WINTER.payout.flawless_bonus;

    const clean = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "e1",
      survived: 6,
      total: 6,
      ruined_cells: 0,
      damage_points: 0,
    });
    const bought = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "e1",
      survived: 6,
      total: 6,
      ruined_cells: 72,
      damage_points: 0,
    });

    expect(clean.flawless).toBe(true);
    expect(bought.flawless).toBe(false);
    // Same six buildings, so the per-survivor pay is the same to the point. Only the
    // bonus differs, which is the whole claim.
    expect(bought.material).toBe(per.material * 6);
    expect(clean.material).toBe(per.material * 6 + bonus.material);
    expect(clean.material - bought.material).toBe(bonus.material);

    // A single ruined cell is enough. The bonus is for a clean winter, not a tidy one.
    expect(
      hardWinterPayoutFor({
        era: ERA,
        encounter_id: "e1",
        survived: 6,
        total: 6,
        ruined_cells: 1,
        damage_points: 0,
      }).flawless,
    ).toBe(false);

    // And a nonsense count is refused rather than quietly paying the bonus.
    expect(() =>
      hardWinterPayoutFor({
        era: ERA,
        encounter_id: "e1",
        survived: 6,
        total: 6,
        ruined_cells: -1,
        damage_points: 0,
      }),
    ).toThrow(/whole non-negative count of ruined cells/);
    expect(() =>
      hardWinterPayoutFor({
        era: ERA,
        encounter_id: "e1",
        survived: 6,
        total: 6,
        ruined_cells: 1.5,
        damage_points: 0,
      }),
    ).toThrow(/whole non-negative/);
  });

  it("keys the grant to a replay-safe event id, and refuses one that would break it", () => {
    const payout = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "winter-1",
      survived: 3,
      total: 6,
      ruined_cells: 0,
      damage_points: 0,
    });
    // The economy's own `buildEventId` scheme: `kind:part:part`, colons as delimiter.
    expect(payout.event_id).toBe("hard_winter:prehistoric:winter-1");
    expect(payout.reason_code).toBe(HARD_WINTER_REASON_CODE);
    expect(payout.event_id.split(":")).toHaveLength(3);

    expect(() =>
      hardWinterPayoutFor({
        era: ERA,
        encounter_id: "a:b",
        survived: 1,
        total: 6,
        ruined_cells: 0,
        damage_points: 0,
      }),
    ).toThrow(/contain no ":"/);
    expect(() =>
      hardWinterPayoutFor({
        era: ERA,
        encounter_id: "",
        survived: 1,
        total: 6,
        ruined_cells: 0,
        damage_points: 0,
      }),
    ).toThrow(/non-empty/);
  });

  it("never pays a flawless bonus for surviving an empty island", () => {
    const payout = hardWinterPayoutFor({
      era: ERA,
      encounter_id: "e",
      survived: 0,
      total: 0,
      ruined_cells: 0,
      damage_points: 0,
    });
    expect(payout.flawless).toBe(false);
    expect(payout.xp).toBe(0);
    expect(payout.survival_ratio).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The batch                                                                  */
/* -------------------------------------------------------------------------- */

describe("the batch draws cumulatively from what the learner has reached", () => {
  it("asks the tuned number of questions, spread across the mastered nodes", () => {
    const composition = composeHardWinterBatch(
      ["NUM.S", "NUM.F", "NUM.2"],
      poolFor(D1_NODES, 4),
      { rng: seededRng(7) },
    );
    if (composition.status !== "ready") {
      throw new Error(composition.message);
    }

    expect(composition.prompts).toHaveLength(HARD_WINTER.batch_size);
    expect(composition.prompts.map((p) => p.index)).toEqual([0, 1, 2]);
    // Round-robin: three slots over three mastered nodes is one each, never three of one.
    expect(new Set(composition.prompts.map((p) => p.node_id)).size).toBe(3);
    // Nothing unmastered leaks in.
    for (const prompt of composition.prompts) {
      expect(["NUM.S", "NUM.F", "NUM.2"]).toContain(prompt.node_id);
    }
    // No item is asked twice.
    expect(new Set(composition.prompts.map((p) => p.item_version_id)).size).toBe(3);
  });

  it("grows with the learner: one mastered node still fills the batch", () => {
    const composition = composeHardWinterBatch(["NUM.S"], poolFor(D1_NODES, 4), {
      rng: seededRng(3),
    });
    if (composition.status !== "ready") {
      throw new Error(composition.message);
    }
    expect(composition.prompts).toHaveLength(HARD_WINTER.batch_size);
    expect(new Set(composition.prompts.map((p) => p.node_id))).toEqual(new Set(["NUM.S"]));
  });

  it("refuses when the learner has reached nothing", () => {
    const composition = composeHardWinterBatch([], poolFor(D1_NODES, 4), {
      rng: seededRng(5),
    });
    expect(composition.status).toBe("unavailable");
    if (composition.status !== "unavailable") {
      throw new Error("expected a refusal");
    }
    expect(composition.reason).toBe("nothing_mastered");
    expect(composition.available).toBe(0);
  });

  /**
   * The fixed-denominator rule, and its reason here is NOT the era trial's. Nothing in
   * the winter passes or fails, so a short batch does not lower a pass bar — it widens
   * every bonfire, because the tier is a ratio of what was asked. Two of two would
   * resolve `strong`.
   */
  it("refuses a short draw rather than making every action cheaper", () => {
    const composition = composeHardWinterBatch(["NUM.S"], poolFor(["NUM.S"], 2), {
      rng: seededRng(9),
    });
    expect(composition.status).toBe("unavailable");
    if (composition.status !== "unavailable") {
      throw new Error("expected a refusal");
    }
    expect(composition.reason).toBe("pool_too_thin");
    expect(composition.wanted).toBe(3);
    expect(composition.available).toBe(2);

    // The thing the refusal prevents, stated as arithmetic: the short batch's own
    // top score buys the widest bonfire on the board.
    expect(winterTierFor(2, 2)).toBe("strong");
    expect(winterTierFor(2, 3)).toBe("steady");
    expect(HARD_WINTER.fire.radius_by_tier.strong).toBeGreaterThan(
      HARD_WINTER.fire.radius_by_tier.steady as number,
    );
  });

  it("draws a different batch each round from the same pool", () => {
    const pool = poolFor(D1_NODES, 6);
    const first = composeHardWinterBatch(D1_NODES, pool, { rng: seededRng(1) });
    const second = composeHardWinterBatch(D1_NODES, pool, { rng: seededRng(2) });
    if (first.status !== "ready" || second.status !== "ready") {
      throw new Error("expected two ready batches");
    }
    expect(first.prompts.map((p) => p.item_version_id)).not.toEqual(
      second.prompts.map((p) => p.item_version_id),
    );
  });

  it("is reproducible from its seed, so a tuning session can replay a round", () => {
    const pool = poolFor(D1_NODES, 6);
    const a = composeHardWinterBatch(D1_NODES, pool, { rng: seededRng(42) });
    const b = composeHardWinterBatch(D1_NODES, pool, { rng: seededRng(42) });
    expect(b).toEqual(a);
  });
});

/* -------------------------------------------------------------------------- */
/* The view model                                                             */
/* -------------------------------------------------------------------------- */

describe("the render view model", () => {
  it("lays the island out as a rectangle with the water marked", () => {
    const view = hardWinterView(createHardWinter({ era: ERA }));

    expect(view.rows).toHaveLength(10);
    for (const row of view.rows) {
      expect(row).toHaveLength(10);
    }
    const cells = view.rows.flat();
    expect(cells.filter((c) => c.land)).toHaveLength(88);
    expect(cells.filter((c) => !c.land)).toHaveLength(12);
    // Water carries no rim depth, so nothing can freeze it or build on it.
    for (const cell of cells.filter((c) => !c.land)) {
      expect(cell.rim_depth).toBeNull();
      expect(cell.frozen).toBe(false);
      expect(cell.building).toBeNull();
    }
  });

  it("puts every building on its own cell", () => {
    const view = hardWinterView(createHardWinter({ era: ERA }));
    const withBuildings = view.rows.flat().filter((c) => c.building !== null);
    expect(withBuildings).toHaveLength(6);
    expect(withBuildings.map((c) => c.building?.node_id).sort()).toEqual(
      [...D1_NODES].sort(),
    );
  });

  it("marks the frost line only where frozen ground meets clear ground", () => {
    const state = playRound(
      createHardWinter({ era: ERA }),
      { kind: "reinforce", node_id: "NUM.S" },
      0,
    );
    const view = hardWinterView(state);
    const cells = view.rows.flat();

    const line = cells.filter((c) => c.frost_line);
    expect(line.length).toBeGreaterThan(0);
    for (const cell of line) {
      expect(cell.frozen).toBe(true);
    }
    // After one round exactly the shoreline is frozen, so the whole of it is the line.
    expect(line.length).toBe(28);
    expect(view.frozen_cells).toBe(28);

    // And with nothing frozen there is no line to draw.
    expect(
      hardWinterView(createHardWinter({ era: ERA }))
        .rows.flat()
        .filter((c) => c.frost_line),
    ).toEqual([]);
  });

  /**
   * **THE FRONT IS A PROMISE, AND THIS IS THE ASSERTION THAT MAKES IT ONE.**
   *
   * `frost_next` exists because a board at round one has nothing on it: `frozen` is empty until
   * `end_round` runs, so a renderer drawing only what the frost HOLDS drew a blank island under
   * a panel reading *"0 of 88 cells frozen"*. What the player needs first is where it starts.
   *
   * The danger a predicted state carries is that the prediction drifts from the rules and the
   * board starts threatening ground nothing comes for. So this is asserted as an IDENTITY over
   * whole rounds rather than as a spot check: the cells the view named, and the cells `end_round`
   * then froze, set against set, every round of a winter — with a fire on the board so the
   * warded-cells branch of the advance is exercised on both sides of the comparison rather than
   * only the open-ground one.
   */
  it("promises exactly the ground `end_round` then freezes, every round", () => {
    const island = hardWinterIsland(ERA);
    let state = createHardWinter({ era: ERA });
    // At round one it is the whole shoreline and nothing else, which is the case the change is
    // for: the frost has taken nothing, so the front is entirely a claim about the future.
    const opening = hardWinterView(state)
      .rows.flat()
      .filter((c) => c.frost_next);
    expect(state.frozen).toEqual([]);
    expect(opening).toHaveLength(28);
    expect(new Set(opening.map((c) => c.rim_depth))).toEqual(new Set([0]));

    /*
     * THE SCHEDULE IS CHOSEN AND NOT ARBITRARY, and both fires are load-bearing. Two ways of
     * getting the prediction wrong are invisible on an ordinary board, and each was measured
     * escaping an earlier version of this test by injecting the defect and watching it stay
     * green:
     *
     *  - **A ONE-PASS PREDICTION** on a round the frost takes two steps in. Rounds two and three
     *    take two and three steps at `spread.accelerate_every: 1`, so the front is genuinely
     *    deeper than one pass on both of them.
     *  - **A FRONT PROMISED AFTER THE WINTER IS OVER.** Checking that needs a board that ends
     *    with land the frost has neither taken nor been kept off, and warded ground does not
     *    count — the advance skips it, so it can never be `frost_next` and a floor met by it
     *    proves nothing. The fire shelters ground through the last advance and then expires WITH
     *    the winter, so that ground is open at the end and the guard has something to be wrong
     *    about.
     *
     * ## ⚑ ONE FIRE WHERE THERE WERE TWO, AND THE ROUND IT IS LIT IN IS FORCED
     *
     * The plan is DERIVED against the tuning table rather than chosen once and left, and at
     * `rounds: 3` the derivation leaves exactly one option. A `strong` fire burns three rounds, so
     * one lit in round one is spent as the winter ends and one lit in round two or three is still
     * burning afterwards — which breaks the *"nothing is still warding"* floor this test's last
     * section depends on. So the fire is in round one, and there is only one round one.
     *
     * That is the third time this plan has been invalidated by a tuning change, each time in the
     * only assertion that could tell: `burn_rounds_by_tier` made a fire's duration a ladder and
     * put a round-four `strong` fire past the end of the winter; the four-round count did the same
     * one round earlier; and the three-round count leaves one legal slot.
     */
    const plan: readonly WinterAction[] = [
      { kind: "fire", col: -3, row: -5 },
      { kind: "reinforce", node_id: "NUM.S" },
      { kind: "reinforce", node_id: "NUM.S" },
    ];

    const front = (at: HardWinterState): Set<string> =>
      new Set(
        hardWinterView(at)
          .rows.flat()
          .filter((c) => c.frost_next)
          .map((c) => winterCellKey(c.col, c.row)),
      );

    let rounds = 0;
    let deepRound = false;
    let firesChangedTheFront = 0;
    while (state.phase !== "ended") {
      const steps = winterSpreadSteps(state.round);
      const action = plan[rounds] as WinterAction;
      // What the board shows while the player is DECIDING: the advance as the ground stands, so
      // it is the thing the declaration is made against.
      const beforeDeclaring = front(state);

      let mid = hardWinterReducer(state, { type: "declare", action });
      mid = hardWinterReducer(mid, { type: "resolve", correct: 3, asked: 3 });
      expect(mid.phase, `round ${rounds + 1} did not resolve`).toBe("resolved");

      // Does THIS round actually distinguish one pass of frost from all of them? Establishing
      // that about the SCENARIO, not asserting it about the view: the assertion below is the view
      // against the reducer, and this only says the comparison has teeth on at least one round.
      const warded = wardedWinterCells(mid);
      if (
        steps > 1 &&
        winterFrostAfterAdvance(island, new Set(mid.frozen), warded, steps).size >
          winterFrostAfterAdvance(island, new Set(mid.frozen), warded, 1).size
      ) {
        deepRound = true;
      }

      /*
       * THE PROMISE, read at the moment it is a promise. The action has landed and the frost has
       * not moved, so the board's front and what `end_round` does next are the same claim about
       * the same ground.
       *
       * Sampled HERE and not while declaring, and the difference is the mechanic rather than a
       * detail: measured on round three of this very plan, the declaring board named nineteen
       * cells and `end_round` took seventeen, because the fire the player then lit held two of
       * them. A test that compared the declaring board would have been asserting that a
       * declaration changes nothing.
       */
      const predicted = front(mid);
      const before = new Set(mid.frozen);
      state = hardWinterReducer(mid, { type: "end_round" });
      const took = new Set(state.frozen.filter((key) => !before.has(key)));
      expect(took, `round ${rounds + 1}`).toEqual(predicted);

      // ...and the other half of that: a fire the player lights TAKES GROUND OFF the front, so
      // the board answers the declaration rather than showing the same threat regardless.
      if (action.kind === "fire") {
        expect(
          [...beforeDeclaring].filter((key) => !predicted.has(key)).length,
          `the fire in round ${rounds + 1} changed nothing on the front`,
        ).toBeGreaterThan(0);
        firesChangedTheFront += 1;
      }
      rounds += 1;
    }
    // Floors, so the loop cannot pass by not running: a whole winter, at least one round where a
    // second step of frost genuinely reached ground the first did not, and both fires observed.
    expect(rounds).toBe(HARD_WINTER.rounds);
    expect(deepRound, "no round distinguished one step of frost from two").toBe(true);
    // ONE, and see the plan's own note for why the round it is lit in is forced at `rounds: 3`.
    expect(firesChangedTheFront).toBe(1);
    // ...and the front never named ground the frost already held, or ground a fire was keeping
    // warm, on any board in that winter.
    for (const cell of hardWinterView(state).rows.flat()) {
      expect(cell.frost_next && cell.frozen, `(${cell.col},${cell.row})`).toBe(false);
      expect(cell.frost_next && cell.warded, `(${cell.col},${cell.row})`).toBe(false);
    }
    // An ENDED winter promises nothing: `end_round` is the only thing that advances the frost
    // and it cannot fire again, so a front drawn here would threaten ground with a frost that is
    // over. The floor counts land that is neither frozen NOR warded, which is the only land a
    // front could be drawn on at all.
    const ended = hardWinterView(state).rows.flat();
    // Read as "nothing is still WARDING", which is what the `!c.warded` filter below depends
    // on. It used to be `fires` deep-equal `[]`, and a spent hearth stays on the board now
    // (see `WinterFire`), so the empty list has moved to the ward: the hearths are still
    // standing and every one of them is holding nothing.
    expect(state.fires.length, "this plan lit no fires at all").toBeGreaterThan(0);
    expect(
      state.fires.filter(winterFireIsBurning),
      "a fire is still burning after the winter ended",
    ).toEqual([]);
    expect(wardedWinterCells(state).size).toBe(0);
    const openAtTheEnd = ended.filter((c) => c.land && !c.frozen && !c.warded);
    expect(
      openAtTheEnd.length,
      "the winter ended with nothing left for a front to be wrong about",
    ).toBeGreaterThan(0);
    // AND THE OPEN LAND IS THE FIRE'S. The frost covers the whole island in three rounds, so
    // every open cell here is one this plan's fire sheltered, which is what makes it
    // load-bearing rather than decoration. Under the four-round count ruled and reversed on
    // 2026-08-01 the heart's four cells were open for free and met the floor above with no
    // fire involved, which is why this is written per band rather than as a total.
    expect(
      openAtTheEnd.filter((c) => c.rim_depth !== null && c.rim_depth < island.max_rim_depth)
        .length,
      "the only open land left is a band the frost never reached",
    ).toBeGreaterThan(0);
    expect(ended.filter((c) => c.frost_next)).toEqual([]);
  });

  /**
   * **RE-FIXTURED FOR `ruin_at: 2`, AND THE FIXTURE IS THE INTERESTING PART.**
   *
   * This used to open on a wasted round and read the Lookout as *"marked and not yet in
   * danger"*, then in danger a round later. Neither state exists now: a building the frost
   * reaches unsheltered is a ruin, not a mark, so a building can only be AT RISK if a shield
   * carried it through earlier cold rounds and has just run out. That is the one state the
   * read-out is for, and it is what this plays to.
   *
   * ## ⚑ THE SHIELD RUNG IS FORCED AT THE 2026-08-02 SET, and it is not the top one
   *
   * The bite ladder is 1, 2, 3 and it totals six, which is exactly `shield_by_tier.strong`. So a
   * TOP-TIER shield covers every round of the winter with nothing spare and is never at risk at
   * all — the rung this test used to play. A `steady` shield of four covers rounds one and two and
   * runs down to one point, which meets round three's bite of three over a budget of two: **not at
   * risk in round two, at risk in round three.** That is the only rung on the table that produces
   * both readings inside one winter, so it is the rung, and `HARD_WINTER.damage.bite` carries the
   * arithmetic.
   *
   * **THE `damaged` HALF OF THIS TEST IS GONE**, and it is quoted rather than deleted quietly. It
   * read: *"AND THE `damaged` READ-OUT, through the one route that reaches it: a WEAK shield on
   * the same board is two points against a bite of three, so the Tower comes through this round
   * marked instead of gone, and the board prices the mend while the winter is still running."*
   * At `damage.ruin_at: 1` there is no such route and no such reading — see *"a building is sound
   * or it is a ruin"*, where the unreachability is proved over the whole shield-by-bite space, and
   * `hard-winter-difficulty.test.ts`'s *"leaves nothing standing damaged"*, where it is swept over
   * every board at every accuracy.
   *
   * THE ROUND IT IS READ IN IS THE LAST ONE, which is a loss and is stated as one: the board is
   * still `declaring`, so the read-out is legible to a player who can still act on it, but there
   * is no round after it. At five rounds this landed on round four with a round to spare.
   */
  it("names the buildings that will fall this round unless something changes", () => {
    // Round one: a `steady` shield on the shoreline Tower, which the frost reaches at the end of
    // this round. It absorbs the bite and the ground under it freezes anyway.
    let state = playRound(
      createHardWinter({ era: ERA }),
      { kind: "reinforce", node_id: "NUM.5" },
      2,
    );
    expect(building(state, "NUM.5").state).toBe("standing");
    expect(building(state, "NUM.5").damage).toBe(0);
    expect(state.frozen).toContain(winterCellKey(4, 0));
    expect(building(state, "NUM.5").shield).toBe(
      HARD_WINTER.reinforce.shield_by_tier.steady - winterDamageBite(1),
    );
    // Not yet at risk: the shield still has more in it than the next bite.
    expect(state.round).toBe(2);
    expect(hardWinterView(state).at_risk).toEqual([]);

    // One round spent elsewhere spends the shield down instead.
    state = playRound(state, { kind: "reinforce", node_id: "NUM.S" }, 0);
    expect(building(state, "NUM.5").damage).toBe(0);
    // The first round whose bite outreaches what is left of the budget. It is the LAST round of
    // this winter, which is a real loss against the five-round version and is why the docblock
    // says so; the board is still taking declarations, so the read-out still reaches a player who
    // can act on it.
    expect(state.round).toBe(HARD_WINTER.rounds);
    expect(state.phase, "the read-out is on a board that still takes actions").toBe(
      "declaring",
    );

    // NOW it is named, and the naming is the read-out: nothing is left between it and the
    // bite that closes this round.
    expect(hardWinterView(state).at_risk).toEqual(["NUM.5"]);
    expect(winterDamageBudget(building(state, "NUM.5"))).toBeLessThanOrEqual(
      winterDamageBite(state.round),
    );

    // A fire over it takes it back off the list without unfreezing the ground.
    const sheltered = hardWinterReducer(
      hardWinterReducer(state, {
        type: "declare",
        action: { kind: "fire", col: 4, row: 0 },
      }),
      { type: "resolve", correct: 3, asked: 3 },
    );
    expect(hardWinterView(sheltered).at_risk).toEqual([]);
    expect(sheltered.frozen).toContain(winterCellKey(4, 0));

    // AND SO DOES A SHIELD, which since the mend action was ruled out is the only other way
    // off this list. It is a different way off it, and the difference is the whole reason the
    // shield is the crisis's answer to damage: the fire above leaves the frost on the ground
    // and merely holds it, where the shield leaves the building cold and pays the bite for it.
    const shielded = hardWinterReducer(
      hardWinterReducer(state, {
        type: "declare",
        action: { kind: "reinforce", node_id: "NUM.5" },
      }),
      { type: "resolve", correct: 3, asked: 3 },
    );
    expect(hardWinterView(shielded).at_risk).toEqual([]);

    // AND THE `damaged` READ-OUT IS EMPTY, WHATEVER THE PLAYER DOES, which is the inverse of the
    // section this replaces (quoted in the docblock). A `weak` shield was the one route to a scar
    // at `ruin_at: 2`: two points against a deep bite of three left a point behind. At 1 it either
    // covers the bite or the building is gone, so the board has no mend to price. Asserted at the
    // weak rung specifically, because that is the route that used to exist.
    const weakest = hardWinterReducer(
      hardWinterReducer(
        hardWinterReducer(state, {
          type: "declare",
          action: { kind: "reinforce", node_id: "NUM.5" },
        }),
        { type: "resolve", correct: 1, asked: 3 },
      ),
      { type: "end_round" },
    );
    expect(hardWinterView(weakest).damaged).toEqual([]);
    expect(hardWinterView(weakest).mend_cost).toBe(0);
    // Floors: the round really did close, the frost really was on the Tower's cell, and the Tower
    // came through with no damage on it rather than with a scar the read-out failed to mention.
    // (It SURVIVES here, because a `weak` reinforce adds two points to the one the earlier shield
    // had left and three exactly covers the closing bite. Either ending is the claim: the two
    // reachable states are unmarked and ruined.)
    expect(weakest.log).toHaveLength(HARD_WINTER.rounds);
    expect(weakest.frozen).toContain(winterCellKey(4, 0));
    expect(building(weakest, "NUM.5").damage).toBe(0);
  });

  it("counts the warded ground and the standing buildings", () => {
    const state = hardWinterReducer(
      hardWinterReducer(createHardWinter({ era: ERA }), {
        type: "declare",
        action: { kind: "fire", col: 0, row: 0 },
      }),
      { type: "resolve", correct: 3, asked: 3 },
    );
    const view = hardWinterView(state);
    expect(view.warded_cells).toBe(13);
    expect(view.standing).toBe(6);
    expect(view.ruined).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The spread schedule                                                        */
/* -------------------------------------------------------------------------- */

/**
 * **THE FROST ACCELERATES INSIDE THE WINTER, which is a fact about the round count.**
 *
 * `spread.accelerate_every` is 1 as of 2026-08-02, so the frost takes one step, then two, then
 * three, and an untouched island is wholly frozen exactly as the last round closes. It was 4 at
 * five rounds, where the second step landed in round five and the winter had one.
 *
 * **THIS IS THE VALUE THAT MADE `rounds: 3` PLAYABLE, and the failure it fixed is worth the
 * sentence: at `accelerate_every: 4` a three-round winter's schedule flattens to 1, 1, 1, the
 * frost reaches rim band 2 and stops, and every era-one building sits in band 2 or deeper. So the
 * live board's accuracy ladder read 60 / 0 / 0 / 0 and `packed`'s read 0 / 0 / 0 / 0.
 * `HARD_WINTER.spread` carries the table and the three candidates that were rejected.**
 */
describe("the frost accelerates", () => {
  it("takes more steps in the back half than the front half", () => {
    const schedule = Array.from({ length: HARD_WINTER.rounds }, (_, i) =>
      winterSpreadSteps(i + 1),
    );
    // Measured at the 2026-08-02 set. It read [1, 1, 1, 1, 2] at five rounds.
    expect(schedule).toEqual([1, 2, 3]);
    // The relationship, not the digits: never slows, and ends faster than it began.
    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i] as number).toBeGreaterThanOrEqual(schedule[i - 1] as number);
    }
    expect(schedule[schedule.length - 1] as number).toBeGreaterThan(schedule[0] as number);
    // AND THE ACCELERATION IS INSIDE THE WINTER, which is what a shorter one took away: the
    // rule accelerates from round `accelerate_every + 1` and the winter has to be longer than
    // that for any round to see it.
    expect(HARD_WINTER.rounds).toBeGreaterThan(HARD_WINTER.spread.accelerate_every);
  });

  it("logs the steps it took and the ground it took, round by round", () => {
    const end = playWinter(uniformPlan({ kind: "fire", col: 0, row: 0 }, 0));
    expect(end.log.map((entry) => entry.spread_steps)).toEqual([1, 2, 3]);
    // Every band of the island, taken in order, and nothing left over. **ROUND ONE IS THE RIM AND
    // NOTHING ELSE**, which is the lead's own requirement (*"the frost ring … start[s] on the edge
    // of the island"*): 28 cells is exactly the shoreline band, so `spread.base: 1` is what keeps
    // the opening front one band deep. Rounds two and three then take two bands and two, and the
    // heart goes as the winter ends. It read 28/24/20/12/4 at five rounds.
    expect(end.log.map((entry) => entry.froze)).toEqual([28, 44, 16]);
    expect(end.log[0]?.froze, "round one's front is the shoreline band, exactly").toBe(28);
    expect(end.log.reduce((total, entry) => total + entry.froze, 0)).toBe(88);
  });
});
