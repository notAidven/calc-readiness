import { describe, expect, it } from "vitest";

import { createSeededRng } from "./citizens-rng";
import {
  canDeclareWinterAction,
  createHardWinter,
  defaultWinterLayout,
  type HardWinterState,
  hardWinterFirePreview,
  hardWinterIsland,
  hardWinterOutcome,
  hardWinterPayoutFor,
  hardWinterReducer,
  type WinterAction,
  winterActionRefusal,
  winterCellKey,
  winterDamageBudget,
  winterLayoutById,
  winterLayoutFor,
  winterLayouts,
  winterReclaimCost,
  winterSpreadSteps,
  winterWardArea,
} from "./hard-winter";
import { HARD_WINTER, type WinterLayout } from "./hard-winter-tuning";

/**
 * THE FIRE, MEASURED AGAINST EVERY BOARD THE PROTOTYPE DEALS.
 *
 * ## Why this file exists at all
 *
 * In the finished game the player chooses where every building goes. A fire tuned against
 * one arrangement is therefore not a conservatively-tuned fire, it is an UNTUNED one that
 * happens to be measured: the first player who builds differently meets an encounter
 * nobody looked at. So every claim here is quantified over `winterLayouts()` — the
 * population is derived from the tuning table, never written down — and the claims that
 * define "tunable" are asserted on all of them:
 *
 *   1. **no layout is won by accident** — at zero accuracy nothing on any board escapes
 *      harm, whatever the player does;
 *   2. **no layout is a dead end** — at full accuracy there is a plan that brings every
 *      building through on ground the settlement keeps;
 *   3. **no layout is free** — the route that used to win the compact board for nothing is
 *      now the worst-paying way to reach the same six buildings.
 *
 * **BOUND ONE IS A RESTATEMENT AS OF 2026-07-30 AND THE OLD WORDING IS WORTH QUOTING**, so
 * a reader can see which way it was loosened and check the loosening for themselves. It
 * used to be *"at zero accuracy NOTHING SURVIVES"* — `expect(survived).toBe(0)`. Under the
 * damage model the island's heart goes cold only on the final round, and one late cold
 * round is half a building, so the worst winter available now leaves it standing and
 * critically scarred. Asserting the old survivor count would mean either deleting the
 * damage model's whole point or lengthening the winter until the frost could finish
 * everything, which is the direction D-CRISIS-27 ruled against.
 *
 * What replaces it is stronger about the thing the bound was for. The old assertion only
 * said the bottom of the ladder was empty; the new one says **nothing escapes harm** —
 * every building on every board is a ruin or is marked — and that the zero-accuracy
 * outcome is the FLOOR of the whole accuracy sweep. `hard-winter-difficulty.test.ts` owns
 * the second half over a seven-band sweep. Both halves fail if any magnitude at the bottom
 * rung stops being nothing, which is what the bound was written to catch.
 *
 * ## What is being guarded, in one sentence
 *
 * A fire must reach a building or two, never a region. The retune shrank the top tier from
 * a 25-cell Chebyshev square (28% of era one's 88 cells) to a 13-cell Euclidean disc
 * (14.8%), and the assertions below are what would fail if it grew back. Two of them are
 * EXHAUSTIVE over the island rather than sampled, which matters: a search-based bound on
 * "the fire cannot do X" passes just as happily when the search is too weak to find X, and
 * the beam searches used to pick these numbers were measurably beam-dependent (fires-only
 * ceiling on `rimward` read 5 at width 900 and 6 at width 1600). Nothing here is a beam
 * search for that reason.
 *
 * ## The exception, and why it is named rather than filtered out
 *
 * `packed` is the city surface's own default layout, and on it one top-tier fire DOES reach
 * all six buildings — six buildings inside a four-by-four box are smaller than any ward
 * worth having, so no footprint above five cells could avoid it. Quietly excluding it from
 * the sweep would make the sweep pass and hide the finding. It is listed instead, with its
 * reason, and the list is asserted in BOTH directions: a listed layout that stops covering
 * everything fails (so a stale exemption cannot sit here excusing nothing), and an unlisted
 * one that starts covering everything fails (so the exemption cannot spread by neglect).
 *
 * WHAT THAT EXCEPTION NOW MEANS HAS CHANGED, and deliberately rather than by deletion. It
 * used to sit beside a second, unasserted belief: that the compact board was therefore a
 * walkover. It was — for a different reason, which was that abandoning an empty ring cost
 * nothing — and `the compact board is not free any more` below asserts the fix. So the
 * exemption is now narrower than it reads: **one fire still covers this cluster, and the
 * cluster is no longer cheap to keep.** The geometric coincidence is a fact about a 4x4 box
 * and is not going away; what is asserted is that it no longer buys a free winter.
 */

const ERA = "prehistoric" as const;

/**
 * Layouts on which ONE top-tier fire can reach every building at once, with the reason.
 *
 * This is a defect of the LAYOUT, not of the fire: `packed` is what
 * `defaultPlacements` produces for era one, and it puts all six anchors in a box four
 * cells across. The smallest footprint that could break the coincidence is five cells
 * (`steady`), which would leave the top tier with nothing above the middle one. So the fix
 * is a city-layout fix — buildings competing for land, or a placer that does not pack —
 * and it is recorded here rather than tuned around.
 */
const ONE_FIRE_COVERS_EVERYTHING: readonly { readonly id: string; readonly why: string }[] =
  [
    {
      id: "packed",
      why:
        "the city surface's own default: `defaultPlacements` packs all six anchors into a " +
        "four-by-four box, which no ward larger than five cells can fail to cover",
    },
  ];

/** The share of the board above which a single fire is holding a region, not a building. */
const REGION_SHARE = 0.3;

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

/** Every legal action on the board: a fire on any land cell, or any reinforce. */
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

/** Remaining headroom across the settlement, for the greedy policy to climb. */
function standing(state: HardWinterState): number {
  const alive = state.buildings.filter((b) => b.state === "standing");
  const headroom = alive.reduce((total, b) => total + winterDamageBudget(b), 0);
  return alive.length * 10_000 + headroom * 100 + (88 - state.frozen.length);
}

/**
 * A COMPETENT PLAYER, modelled as one-round lookahead: try every legal action, keep the
 * one that leaves the settlement in the best shape after the frost moves.
 *
 * Deliberately not a full search. The bound this policy is used for is "a competent player
 * is never left with nothing", and a perfect planner would prove nothing about that — the
 * whole risk of a shrunken fire is that ordinary play falls off a cliff while the optimum
 * stays reachable.
 */
function greedySurvivors(layout: WinterLayout, correct: number): number {
  let state = createHardWinter({ era: ERA, buildings: layout.buildings });
  while (state.phase !== "ended") {
    let best: WinterAction | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const action of legalActions(state)) {
      const score = standing(playRound(state, action, correct));
      if (score > bestScore) {
        bestScore = score;
        best = action;
      }
    }
    if (!best) {
      throw new Error(`no legal action on ${layout.id} in round ${state.round}`);
    }
    state = playRound(state, best, correct);
  }
  return state.outcome?.survived ?? -1;
}

/** Survivors averaged over random-but-legal plays: the floor of how the board plays. */
function randomSurvivors(
  layout: WinterLayout,
  correct: number,
  plays: number,
): { mean: number; max: number } {
  let total = 0;
  let max = -1;
  for (let seed = 1; seed <= plays; seed += 1) {
    const rng = createSeededRng(seed * 7919);
    let state = createHardWinter({ era: ERA, buildings: layout.buildings });
    while (state.phase !== "ended") {
      const legal = legalActions(state);
      state = playRound(
        state,
        legal[Math.floor(rng() * legal.length)] as WinterAction,
        correct,
      );
    }
    const survived = state.outcome?.survived ?? 0;
    total += survived;
    max = Math.max(max, survived);
  }
  return { mean: total / plays, max };
}

/**
 * Play a scripted plan at a fixed accuracy and report what came through.
 *
 * A REFUSED ACTION THROWS rather than being skipped. The reducer ignores an illegal
 * declaration by design — that is what makes a mis-click free — but in a witness plan it
 * would mean the round never advanced, and a winter that stopped short would otherwise
 * surface as a confusing assertion about the phase instead of as "this plan no longer
 * plays". Measured: with `spread.base` doubled, this reports that round six tries to
 * reinforce a building the frost has already taken.
 */
function playPlan(
  layout: WinterLayout,
  plan: readonly WinterAction[],
  correct: number,
): HardWinterState {
  let state = createHardWinter({ era: ERA, buildings: layout.buildings });
  for (const [index, action] of plan.entries()) {
    const refusal = winterActionRefusal(state, action);
    if (refusal !== null) {
      throw new Error(
        `${layout.id}'s witness plan is no longer playable: round ${index + 1} declares ` +
          `${JSON.stringify(action)} and the board refuses it — "${refusal}"`,
      );
    }
    state = playRound(state, action, correct);
  }
  return state;
}

/**
 * ONE WITNESS PER LAYOUT: a plan that brings every building through at full accuracy AND
 * gives up no ground.
 *
 * A witness, not a policy — "there is no dead end" is an existence claim, and the honest
 * evidence for an existence claim is an exhibit. Each was found by beam search (width 600,
 * stable against width 200) and then pinned, so a retune that closes the last route through
 * a board fails here rather than silently making it unwinnable. The set is asserted to be
 * exactly the layout list, so a new layout cannot join the table without one.
 *
 * ALL THREE WERE RE-AUTHORED WHEN THE COUNT WENT TO FIVE on 2026-07-30, and the old six-round
 * plans could not simply be shortened: each was length-checked against `HARD_WINTER.rounds`,
 * and each was built around a threshold the damage model removed — under
 * `cold_rounds_to_ruin: 2` every building got one cold round for free, so a witness only had
 * to cover the second. The shape that replaces them differs in a way worth naming: A SHIELD
 * RAISED IN TIME ABSORBS THE BITE OUTRIGHT, so the new witnesses open by reinforcing whatever
 * the frost reaches first and spend their fires on the round it arrives.
 *
 * **ONE OF THE THREE MOVED AGAIN FOR `ruin_at: 2` (2026-08-01), AND EXACTLY ONE.** Measured at
 * the shipped tuning, `packed`'s and `rimward`'s plans above still bring every building through
 * unmarked on ground they keep, so they are unchanged. `spread`'s loses the shoreline Tower:
 * its old closing pair spent the last two rounds on fires over the deep bands and left the
 * Tower's fourth and fifth cold rounds uncovered, which cost nothing when a bite was a third
 * of a building and costs the building at two points. What replaces it reinforces the Tower
 * twice — it is the one building cold in all five rounds — and covers the rest with three
 * fires. Found by beam search at width 400 and then pinned.
 */
const NO_DEAD_END_WITNESS: Readonly<Record<string, readonly WinterAction[]>> = {
  spread: [
    { kind: "fire", col: -4, row: -4 },
    { kind: "fire", col: 1, row: 1 },
    { kind: "fire", col: -3, row: -4 },
  ],
  packed: [
    { kind: "fire", col: -3, row: -5 },
    { kind: "fire", col: -3, row: -5 },
    { kind: "fire", col: -1, row: -1 },
  ],
  rimward: [
    { kind: "fire", col: -5, row: -2 },
    { kind: "fire", col: -3, row: 0 },
    { kind: "fire", col: -2, row: -4 },
  ],
};

/**
 * **LAYOUTS ON WHICH PERFECT PLAY CANNOT SWEEP THE BOARD CLEAN, with the reason.**
 *
 * ## THE LIST HAS BEEN EMPTY AND IS NOT ANY MORE, AND THE MEANING HAS CHANGED WITH IT
 *
 * It used to name layouts whose witness came away MARKED — every building standing, some of them
 * scarred, so the clean-sweep bonus was unpayable. `spread` was on it at `ruin_at: 6` with this
 * reason: *"six buildings across four rim bands is the widest board the prototype deals: the
 * frost is on something from round one and on the last of them by round five, and five actions
 * cannot hold four bands at once. Beam search at width 600 reaches every building standing on
 * ground it keeps and stops three damage points short of unmarked."*
 *
 * `ruin_at: 2` emptied the list, and structurally rather than by luck: a perfect plan either
 * covers a building in every cold round it has, in which case it takes nothing, or misses one, in
 * which case the building is gone. There is no scarred middle for a witness to land in.
 *
 * **AT THE 2026-08-02 SET `spread` IS BACK ON IT FOR THE OPPOSITE REASON: its witness LOSES A
 * BUILDING.** So the list's population is now "layouts where the best possible outcome at full
 * accuracy is not the whole settlement", and both directions are still asserted: a listed layout
 * must actually fall short, and an unlisted one must sweep clean.
 *
 * The claim the list protects has not changed and is asserted underneath it — **no layout is a
 * DEAD END**: full accuracy is worth the whole settlement against a zero-accuracy floor of
 * nothing standing anywhere, and a listed layout is still one building short rather than lost.
 */
const NO_UNMARKED_WINTER: readonly { readonly id: string; readonly why: string }[] = [
  {
    id: "spread",
    why:
      "the widest board the prototype deals, and at three rounds no plan holds it. Measured " +
      "EXHAUSTIVELY rather than searched, which three rounds makes affordable: the plan space " +
      "is 94 actions cubed and it was walked in full, and the best possible outcome at 3 of 3 " +
      "is FIVE of six saved. Its buildings sit in bands 0, 1, 2, 2, 2 and 4, and " +
      "`spread.accelerate_every: 1` freezes band 0 as round one closes and bands 1 and 2 as " +
      "round two closes, so five of the six are cold across the first two rounds while one " +
      "action holds at most three of them (measured, from three cells) and a `strong` shield " +
      "is six points against a bite ladder totalling six, so it saves exactly one building " +
      "for a whole action. `live`, `packed` and `rimward` are all still winnable clean. The " +
      "two dials that would buy it back are `spread.base` and " +
      "`fire.radius_by_tier.strong`, and neither was touched: the lead ruled four values on " +
      "2026-08-02 and asked to be left free to tune",
  },
];

/*
 * **TWO WITNESS PLANS LIVED HERE AND WENT WITH THE ACTION THEY PRICED (2026-08-02).**
 *
 * `SURVIVORS_ONLY_EXPLOIT` was the survivors-only optimum on the compact board, measured before
 * the ground had a cost: a greedy one-round-lookahead policy maximising survivors opened three
 * fires in an empty corner and two pull-backs, saved all six buildings and gave up 52 of the
 * island's 88 cells. `LAND_FOR_BUILDINGS` was its controlled comparison — the same plan with the
 * pull-backs swapped for fires — and it showed the action was PRICED rather than forbidden.
 *
 * Both are gone because the action is. The exploit they measured cannot be reached from any plan
 * the board now offers, which is a stronger answer to it than the price was, and the three tests
 * that used them are removed below with the same note.
 */

/**
 * What a finished winter is worth once both bills are paid, in the era's material.
 *
 * It was three bills until 2026-08-02. `reclaim_cost` went with the give-up-ground action and
 * `repair_cost` is structurally zero at `damage.ruin_at: 1`, so `owed` is rebuilds alone — and
 * `ruined_cells` is passed as the literal 0 the payout still REQUIRES, for the reason
 * `hardWinterPayoutFor` gives: the parameter is the clean-sweep ruling and not the arithmetic.
 */
function netMaterial(state: HardWinterState): {
  readonly survived: number;
  readonly damage_points: number;
  readonly flawless: boolean;
  readonly paid: number;
  readonly owed: number;
  readonly net: number;
} {
  const outcome = hardWinterOutcome(state);
  const payout = hardWinterPayoutFor({
    era: ERA,
    encounter_id: "measured",
    survived: outcome.survived,
    total: outcome.total,
    ruined_cells: 0,
    damage_points: outcome.damage_points,
  });
  return {
    survived: outcome.survived,
    damage_points: outcome.damage_points,
    flawless: payout.flawless,
    paid: payout.material,
    owed: outcome.recovery_cost,
    net: payout.material - outcome.recovery_cost,
  };
}

/* -------------------------------------------------------------------------- */
/* The population                                                             */
/* -------------------------------------------------------------------------- */

describe("every authored layout is a real city on era one's island", () => {
  it("stands six named buildings on distinct cells, on land, in every layout", () => {
    const layouts = winterLayouts();
    const island = hardWinterIsland(ERA);

    // Floor. Every assertion below is a loop over this list, and a loop over an empty list
    // passes; "vary the placements" is also a claim about there being more than one.
    expect(layouts.length, "one layout is not a range of layouts").toBeGreaterThanOrEqual(
      3,
    );

    const nodes = defaultWinterLayout().buildings.map((b) => b.node_id);
    expect(nodes).toHaveLength(6);

    let checked = 0;
    for (const layout of layouts) {
      expect(layout.id, "a layout needs an id").toMatch(/^[a-z]+$/);
      expect(layout.label.length, `${layout.id} label`).toBeGreaterThan(3);
      expect(layout.blurb.length, `${layout.id} blurb`).toBeGreaterThan(40);

      // The same six nodes everywhere, so a layout cannot quietly drop a building and read
      // as an easier winter.
      expect([...layout.buildings.map((b) => b.node_id)].sort(), layout.id).toEqual(
        [...nodes].sort(),
      );
      // On distinct cells, all on land.
      const cells = layout.buildings.map((b) => winterCellKey(b.col, b.row));
      expect(new Set(cells).size, `${layout.id} stacks two buildings`).toBe(6);
      for (const key of cells) {
        expect(island.rim_depth.has(key), `${layout.id}: ${key} is not land`).toBe(true);
      }
      // And `createHardWinter` accepts it, which is the check that would catch a placement
      // the island refuses.
      expect(
        createHardWinter({ era: ERA, buildings: layout.buildings }).buildings,
      ).toHaveLength(6);
      checked += 1;
    }
    expect(checked).toBe(layouts.length);
  });

  it("spans a real range of shapes, from two rim bands to four", () => {
    const bands = winterLayouts().map((layout) => {
      const state = createHardWinter({ era: ERA, buildings: layout.buildings });
      return {
        id: layout.id,
        bands: new Set(state.buildings.map((b) => b.rim_depth)).size,
      };
    });

    // The point of three layouts is that they are DIFFERENT. A trio that all sat across the
    // same number of bands would clear a floor of three and measure one shape.
    expect(new Set(bands.map((b) => b.bands)).size, JSON.stringify(bands)).toBeGreaterThan(
      1,
    );
    expect(Math.min(...bands.map((b) => b.bands))).toBeLessThanOrEqual(2);
    expect(Math.max(...bands.map((b) => b.bands))).toBeGreaterThanOrEqual(4);
  });

  it("names each layout in a fixed cycle that deals them all before repeating", () => {
    const layouts = winterLayouts();
    const span = layouts.length;
    const ids = layouts.map((l) => l.id);

    // Deterministic: the same encounter always deals the same city, so a tuning session is
    // reproducible from one integer.
    expect(winterLayoutFor(7)).toBe(winterLayoutFor(7));
    expect(winterLayoutFor(1).id).toBe(defaultWinterLayout().id);

    // Every block of `span` encounters is a permutation of the whole list: pressing "New
    // winter" cannot deal the same board twice before it has dealt the others.
    const orders: string[] = [];
    for (let block = 0; block < 4; block += 1) {
      const dealt: string[] = [];
      for (let slot = 0; slot < span; slot += 1) {
        dealt.push(winterLayoutFor(block * span + slot + 1).id);
      }
      expect([...dealt].sort(), `block ${block}`).toEqual([...ids].sort());
      orders.push(dealt.join(","));
    }
    // Shuffled, not fixed: at least two blocks deal them in different orders, or the
    // "seeded shuffle" is a rotation with extra steps.
    expect(new Set(orders).size, orders.join(" | ")).toBeGreaterThan(1);

    expect(() => winterLayoutFor(0)).toThrow(/whole number from 1/);
    expect(() => winterLayoutById("nope")).toThrow(/no authored hard-winter layout/);
  });
});

/* -------------------------------------------------------------------------- */
/* The fire reaches a building or two, never a region                         */
/* -------------------------------------------------------------------------- */

describe("a fire reaches a building or two, never a region", () => {
  /**
   * EXHAUSTIVE over all 88 cells, and the assertion the retune exists for. Under the
   * 25-cell square this read 46 of 88 cells on `spread`, 33 on `packed` and 39 on
   * `rimward` — 52%, 38% and 44% of the island — so a majority of the board was a
   * two-for-one. Under the 13-cell disc it is 19, 21 and 22: 22%, 24% and 25%.
   *
   * The bound is 30%, which is below every one of the old figures and above every one of
   * the new: it fails on all three layouts if the ward goes back to a square, and passes on
   * all three as shipped, with the closest layout at 25.0%.
   */
  it("leaves most of the board unable to shelter two buildings at once", () => {
    const island = hardWinterIsland(ERA);
    let measured = 0;

    for (const layout of winterLayouts()) {
      const state = createHardWinter({ era: ERA, buildings: layout.buildings });
      let twoOrMore = 0;
      for (const key of island.cells) {
        const { col, row } = {
          col: Number(key.split(",")[0]),
          row: Number(key.split(",")[1]),
        };
        const preview = hardWinterFirePreview(state, { col, row });
        const top = preview.bands[preview.bands.length - 1];
        if ((top?.buildings.length ?? 0) >= 2) {
          twoOrMore += 1;
        }
        measured += 1;
      }
      const share = twoOrMore / island.cells.length;
      expect(
        share,
        `${layout.id}: ${twoOrMore} of ${island.cells.length} cells shelter two buildings`,
      ).toBeLessThan(REGION_SHARE);
    }

    // Floor: the sweep really walked every cell of every layout.
    expect(measured).toBe(island.cells.length * winterLayouts().length);
  });

  /**
   * The exception list, asserted in both directions so it cannot rot. See
   * `ONE_FIRE_COVERS_EVERYTHING` for why `packed` is on it.
   */
  it("cannot answer the whole board from one cell, except on the layouts that say so", () => {
    const island = hardWinterIsland(ERA);
    const exempt = new Set(ONE_FIRE_COVERS_EVERYTHING.map((entry) => entry.id));

    // The list only ever names real layouts, so a rename cannot leave a dead entry
    // exempting nothing.
    for (const entry of ONE_FIRE_COVERS_EVERYTHING) {
      expect(() => winterLayoutById(entry.id), entry.id).not.toThrow();
      expect(entry.why.length, `${entry.id} needs a reason`).toBeGreaterThan(40);
    }

    const cellsCoveringEverything = (layout: WinterLayout): number => {
      const state = createHardWinter({ era: ERA, buildings: layout.buildings });
      let count = 0;
      for (const key of island.cells) {
        const [col, row] = key.split(",").map(Number);
        const preview = hardWinterFirePreview(state, {
          col: col as number,
          row: row as number,
        });
        const top = preview.bands[preview.bands.length - 1];
        if (top?.buildings.length === state.buildings.length) {
          count += 1;
        }
      }
      return count;
    };

    let guarded = 0;
    for (const layout of winterLayouts()) {
      const count = cellsCoveringEverything(layout);
      if (exempt.has(layout.id)) {
        // The other direction: a listed layout MUST still exhibit the thing it is excused
        // for, or the excuse is stale and belongs deleted.
        expect(
          count,
          `${layout.id} is a declared exception but no fire covers everything on it any more`,
        ).toBeGreaterThan(0);
        // And even the exception is a knife edge rather than a region: exactly one cell on
        // the island does it, where the 25-cell square managed it from four.
        expect(
          count,
          `${layout.id} covers everything from too many cells`,
        ).toBeLessThanOrEqual(1);
      } else {
        expect(
          count,
          `${layout.id}: ${count} cells let one fire cover every building`,
        ).toBe(0);
        guarded += 1;
      }
    }

    // Floor on the guarded population, so the exception list cannot grow until it has
    // swallowed every layout and the assertion is vacuous.
    expect(guarded).toBeGreaterThanOrEqual(2);
    expect(guarded).toBe(winterLayouts().length - ONE_FIRE_COVERS_EVERYTHING.length);
  });

  /**
   * The ladder, on the ground rather than in the table: from a cell in the island's
   * interior each tier holds strictly more than the one below, and the nested bands are
   * what the board draws. `hard-winter.test.ts` owns the open-ground cell counts; this owns
   * the claim that the preview reports them.
   */
  it("previews three nested footprints, each strictly wider than the last", () => {
    const state = createHardWinter({ era: ERA });
    const preview = hardWinterFirePreview(state, { col: 0, row: 0 });

    expect(preview.bands.map((b) => b.tier)).toEqual(["weak", "steady", "strong"]);
    expect(preview.bands.map((b) => b.cells)).toEqual([1, 5, 13]);
    expect(preview.bands.map((b) => b.cells_on_open_ground)).toEqual([1, 5, 13]);
    expect(preview.legal).toBe(true);

    // Nested: every cell in a weaker band is in every stronger one.
    for (let i = 1; i < preview.bands.length; i += 1) {
      const inner = preview.bands[i - 1];
      const outer = preview.bands[i];
      expect((outer?.cells ?? 0) > (inner?.cells ?? 0), `band ${i}`).toBe(true);
      for (const nodeId of inner?.buildings ?? []) {
        expect(outer?.buildings, `band ${i} lost ${nodeId}`).toContain(nodeId);
      }
    }

    // Each covered cell is labelled with the WEAKEST tier that reaches it, so the three
    // bands partition the footprint rather than overlapping in the read-out.
    const labelled = [...preview.tier_by_cell.values()];
    expect(labelled).toHaveLength(13);
    expect(labelled.filter((t) => t === "weak")).toHaveLength(1);
    expect(labelled.filter((t) => t === "steady")).toHaveLength(4);
    expect(labelled.filter((t) => t === "strong")).toHaveLength(8);

    // Near the shore the island clips the disc, and the preview reports the clipped truth
    // rather than the table's figure — which is the whole reason it is measured per cell.
    const onTheShore = hardWinterFirePreview(state, { col: 4, row: 0 });
    const top = onTheShore.bands[onTheShore.bands.length - 1];
    expect(top?.cells_on_open_ground).toBe(13);
    expect(top?.cells, "a fire on the shore wastes ground on water").toBeLessThan(13);
    expect(top?.cells).toBeGreaterThan(0);

    // Ground nobody holds cannot be lit, and the preview says so rather than pretending.
    const openWater = hardWinterFirePreview(state, { col: 99, row: 99 });
    expect(openWater.legal).toBe(false);
    expect(openWater.bands).toHaveLength(3);
    for (const band of openWater.bands) {
      expect(band.cells).toBe(0);
    }

    // `legal` is about the GROUND and not about the moment: mid-batch, the same cell would
    // still hold the same ground, and a preview that went illegal between the declaration
    // and the resolution would be describing the clock rather than the board.
    const midBatch = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "fire", col: 0, row: 0 },
    });
    expect(midBatch.phase).toBe("answering");
    expect(hardWinterFirePreview(midBatch, { col: 0, row: 0 }).legal).toBe(true);

    // **THE SECOND WAY A CELL COULD BE ILLEGAL IS GONE.** Ground the settlement had given up was
    // not legal in any phase, which is what this asserted; the give-up-ground action was ruled out
    // on 2026-08-02, so LAND is the whole of legality now. Asserted in that form rather than
    // dropped, so a second condition cannot creep back into `hardWinterFirePreview.legal`
    // unnoticed: every land cell is legal and every water cell is not, over the whole grid.
    const grid = hardWinterIsland(ERA);
    let land = 0;
    let water = 0;
    for (let row = grid.bounds.min_row; row <= grid.bounds.max_row; row += 1) {
      for (let col = grid.bounds.min_col; col <= grid.bounds.max_col; col += 1) {
        const onLand = grid.rim_depth.has(winterCellKey(col, row));
        expect(hardWinterFirePreview(state, { col, row }).legal, `(${col},${row})`).toBe(
          onLand,
        );
        if (onLand) {
          land += 1;
        } else {
          water += 1;
        }
      }
    }
    expect(land, "no land in the sweep").toBe(grid.cells.length);
    expect(water, "no water in the sweep, so the false case is untested").toBeGreaterThan(
      0,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The two bounds that make it tunable                                        */
/* -------------------------------------------------------------------------- */

describe("the same numbers hold on every board", () => {
  /**
   * BOUND ONE, RESTATED: accuracy is a real floor, not a modifier. At zero, every magnitude
   * on the table is zero, so no arrangement of actions on any board keeps ANYTHING out of
   * harm's way — every building ends a ruin or ends marked, on every layout, however it is
   * played. See this file's header for the survivor-count assertion this replaces and why.
   */
  it("keeps nothing out of harm's way at zero accuracy, on any layout", () => {
    let plays = 0;
    let buildingsChecked = 0;

    /*
     * **HOW DEEP A WHOLE WINTER OF FROST GETS, derived from the schedule rather than written
     * down, because for one day on 2026-08-01 it was less than the island is deep.**
     *
     * At `rounds: 5` the spread schedule is 1, 1, 1, 1, 2 and era one's island is five bands
     * deep, so the frost covers all of it and nothing is safe by position. Under the four-round
     * count ruled and reversed the same day the schedule flattened, the frost stopped at rim
     * depth 3, and the heart came through a zero-accuracy winter UNTOUCHED on every board that
     * puts a building there — which needed a named exception in both directions right here.
     * This assertion is what would say so again.
     *
     * `ruin_at: 2` pushed the other way: one cold round is the whole building, so the sweep
     * asserts every building is a RUIN rather than merely harmed, which is strictly stronger
     * than the disjunction it used to make.
     */
    const reach = Array.from({ length: HARD_WINTER.rounds }, (_, i) =>
      winterSpreadSteps(i + 1),
    ).reduce((total, steps) => total + steps, 0);
    expect(reach, "the frost's total advance, in bands").toBeGreaterThan(
      hardWinterIsland(ERA).max_rim_depth,
    );

    for (const layout of winterLayouts()) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const rng = createSeededRng(seed * 104_729);
        let state = createHardWinter({ era: ERA, buildings: layout.buildings });
        while (state.phase !== "ended") {
          const legal = legalActions(state);
          state = playRound(
            state,
            legal[Math.floor(rng() * legal.length)] as WinterAction,
            0,
          );
        }

        for (const b of state.buildings) {
          expect(
            b.state === "ruin" || b.damage > 0,
            `${layout.id} seed ${seed}: ${b.node_id} came through untouched`,
          ).toBe(true);
          // AND NOTHING IS MERELY MARKED, which is `ruin_at: 2`'s doing: a near miss at zero
          // accuracy is unreachable, so this fails the day a deeper threshold makes one.
          expect(b.state, `${layout.id} seed ${seed}: ${b.node_id} was only marked`).toBe(
            "ruin",
          );
          buildingsChecked += 1;
        }
        // Every building is gone, so "nothing escapes harm" is not doing the work of a much
        // weaker claim. This read 5 of 6 at `ruin_at: 6`, where the heart came through the
        // last cold round scarred instead of destroyed.
        expect(state.outcome?.ruined.length, `${layout.id} seed ${seed}`).toBe(6);
        plays += 1;
      }
    }
    expect(plays).toBe(winterLayouts().length * 12);
    expect(buildingsChecked).toBe(winterLayouts().length * 12 * 6);

    /*
     * **AND THE HEART GOES TO THE FROST, WHICH IS NOW THE ONLY THING THAT CAN TAKE IT.**
     *
     * This section walked a different route to the same place: every abandonable ring given up in
     * turn, on the reasoning that abandoning froze a ring outright and a settlement that kept
     * pulling back walked the front inward faster than the schedule did. It was kept from the
     * four-round exception work because it was a fact about the mechanic rather than about the
     * round count. The mechanic is gone (2026-08-02), and what replaces it is the plainer claim
     * the whole section was reaching for: at zero accuracy the frost reaches the deepest band on
     * its own schedule, so the heart is a ruin taken BY COLD on every board.
     */
    const island = hardWinterIsland(ERA);
    let hearts = 0;
    for (const layout of winterLayouts()) {
      const wasted = playPlan(
        layout,
        Array.from(
          { length: HARD_WINTER.rounds },
          () => ({ kind: "fire", col: 0, row: 0 }) as WinterAction,
        ),
        0,
      );
      const deepest = Math.max(...wasted.buildings.map((b) => b.rim_depth));
      for (const b of wasted.buildings.filter((x) => x.rim_depth === deepest)) {
        expect(
          `${b.state}/${b.ruined_by}`,
          `${layout.id}: the deepest building at zero accuracy`,
        ).toBe("ruin/cold");
        // ...and on the LAST round, which is what "the frost finishes the board on the last beat"
        // means read off a building rather than off a cell count.
        expect(b.ruined_in_round, `${layout.id}: ${b.node_id}`).toBe(HARD_WINTER.rounds);
        hearts += 1;
      }
    }
    expect(hearts, "no deepest building was measured").toBeGreaterThanOrEqual(
      winterLayouts().length,
    );
    // A floor on the fixture: era one's island really is deep enough for this to be a claim
    // about the schedule rather than about a one-band board.
    expect(island.max_rim_depth).toBeGreaterThanOrEqual(4);
  });

  /**
   * BOUND TWO: no layout is a dead end. One witnessed plan per layout brings every building
   * through at full accuracy AND gives up no ground, so every city the prototype deals can
   * be held — including the compact one, where the route that used to get there spent most
   * of the island.
   *
   * THE CLEAN SWEEP IS THE SECOND HALF and is no longer universal, which is why it has an
   * exception list rather than a softened assertion: see `NO_UNMARKED_WINTER`.
   */
  it("has a full-accuracy plan that holds everything, on every layout", () => {
    // Set equality both ways: a new layout with no witness fails here, and a witness for a
    // layout that no longer exists fails here too.
    expect(Object.keys(NO_DEAD_END_WITNESS).sort()).toEqual(
      winterLayouts()
        .map((l) => l.id)
        .sort(),
    );
    // The exception list only ever names real layouts, so a rename cannot leave a dead
    // entry excusing nothing.
    for (const entry of NO_UNMARKED_WINTER) {
      expect(() => winterLayoutById(entry.id), entry.id).not.toThrow();
      expect(entry.why.length, `${entry.id} needs a reason`).toBeGreaterThan(60);
    }
    const marked = new Set(NO_UNMARKED_WINTER.map((entry) => entry.id));

    let proven = 0;
    let unmarked = 0;
    for (const layout of winterLayouts()) {
      const plan = NO_DEAD_END_WITNESS[layout.id];
      if (!plan) {
        throw new Error(`no witness plan for ${layout.id}`);
      }
      expect(plan, `${layout.id} witness length`).toHaveLength(HARD_WINTER.rounds);

      const end = playPlan(layout, plan, HARD_WINTER.batch_size);
      expect(end.phase).toBe("ended");
      const measured = netMaterial(end);

      // **NO DEAD END, ON EVERY BOARD INCLUDING THE LISTED ONE.** Full accuracy is worth most of
      // the settlement wherever it is played, against a zero-accuracy floor of nothing standing
      // anywhere (asserted in the test above). This is the half of the claim that holds for all
      // three, and it is asserted before the split so an exception cannot excuse a wipe.
      expect(
        end.outcome?.survived ?? 0,
        `${layout.id} at full accuracy`,
      ).toBeGreaterThanOrEqual(layout.buildings.length - 1);

      if (marked.has(layout.id)) {
        /*
         * The other direction: a listed layout MUST still fall short, or its exemption is stale
         * and belongs deleted rather than sitting here excusing nothing.
         *
         * **WHAT "FALL SHORT" MEANS HAS CHANGED WITH THE TUNING.** It used to be a SCAR — every
         * building standing, some of them marked — and at `damage.ruin_at: 1` there is no scar,
         * so what a listed layout falls short by is a BUILDING. The witness is the exhaustive
         * optimum (see `NO_UNMARKED_WINTER`), so this is the best any plan can do rather than the
         * best one was found.
         */
        expect(
          end.outcome?.ruined.length,
          `${layout.id} is a declared exception but its witness now sweeps the board clean`,
        ).toBe(1);
        expect(measured.flawless, layout.id).toBe(false);
        // And it is one building rather than a rout: the bill is one rebuild exactly.
        expect(measured.owed, `${layout.id} owes more than one rebuild`).toBe(
          HARD_WINTER.rebuild_cost_per_ruin,
        );
      } else {
        expect(end.outcome?.ruined, `${layout.id} lost buildings at full accuracy`).toEqual(
          [],
        );
        expect(end.outcome?.survived, layout.id).toBe(layout.buildings.length);
        expect(
          measured.damage_points,
          `${layout.id}: perfect play still comes away marked`,
        ).toBe(0);
        expect(measured.flawless, `${layout.id} is not a clean sweep`).toBe(true);
        expect(measured.owed, `${layout.id} owes a recovery bill`).toBe(0);
        expect(measured.net, `${layout.id} net material`).toBeGreaterThan(0);
        unmarked += 1;
      }
      proven += 1;
    }
    expect(proven).toBe(winterLayouts().length);
    // Floor on the unexcused population, so the exception list cannot grow until the clean
    // sweep is unpayable everywhere and the assertion above is vacuous.
    expect(unmarked).toBeGreaterThanOrEqual(2);
    expect(unmarked).toBe(winterLayouts().length - NO_UNMARKED_WINTER.length);
  });

  /**
   * And the middle: a player who thinks one round ahead is never wiped out on any board.
   * This is the bound a shrunken fire could plausibly break — the optimum stays reachable
   * while ordinary play falls off a cliff — so it is measured with a policy rather than a
   * search.
   */
  it("leaves a competent player something on every layout, from one right answer up", () => {
    let measured = 0;
    for (const layout of winterLayouts()) {
      for (const correct of [1, 2, 3]) {
        const survived = greedySurvivors(layout, correct);
        expect(
          survived,
          `${layout.id} at ${correct} of ${HARD_WINTER.batch_size} leaves ${survived}`,
        ).toBeGreaterThanOrEqual(2);
        measured += 1;
      }
    }
    expect(measured).toBe(winterLayouts().length * 3);
  });

  /**
   * THE OUTCOME SPREAD, which is the finding the three layouts exist to produce: the same
   * policy at the same accuracy reaches materially different outcomes on different boards.
   * If it did not, one layout would have been enough and this whole file would be
   * ceremony.
   */
  it("plays differently board to board, by more than a rounding error", () => {
    const plays = 120;
    const means = winterLayouts().map((layout) => ({
      id: layout.id,
      mean: randomSurvivors(layout, HARD_WINTER.batch_size, plays).mean,
    }));

    expect(means).toHaveLength(winterLayouts().length);
    const spread =
      Math.max(...means.map((m) => m.mean)) - Math.min(...means.map((m) => m.mean));
    expect(spread, JSON.stringify(means)).toBeGreaterThan(0.75);

    /*
     * And a competent player sees the difference too, so it is not an artefact of random
     * play meeting a forgiving board.
     *
     * ## THE RUNG THIS IS READ AT HAS CLIMBED TWICE, AND EACH CLIMB IS A MEASUREMENT
     *
     * It read ONE right answer in three, where the boards used to come apart. `ruin_at: 2` closed
     * that rung: a `weak` batch buys a one-cell fire or two points of shield and neither holds
     * anything for more than a round, so every board converged on two survivors. It was moved to
     * TWO of three, where they separated 5 / 6 / 4.
     *
     * At the 2026-08-02 set two of three closes as well — measured 3 / 3 / 3 — and the boards
     * separate at FULL accuracy: **4 on `spread`, 6 on `packed`, 5 on `rimward`.** That is the
     * same finding one rung further up, and it has the same cause each time: the shorter and
     * harsher the winter, the higher the accuracy at which a board's SHAPE starts to matter to a
     * player rather than to the tuning table. Both of the closed rungs are pinned rather than left
     * as sentences, so a retune that reopens either fails here and this block can move back down.
     */
    const atWeak = winterLayouts().map((layout) => greedySurvivors(layout, 1));
    expect(
      new Set(atWeak).size,
      `${JSON.stringify(atWeak)}: the boards separate at one right answer again, so this ` +
        "block can go back to reading the lowest rung",
    ).toBe(1);
    const atSteady = winterLayouts().map((layout) => greedySurvivors(layout, 2));
    expect(
      new Set(atSteady).size,
      `${JSON.stringify(atSteady)}: the boards separate at two of three again, so this ` +
        "block can go back to reading the middle rung",
    ).toBe(1);
    const atFull = winterLayouts().map((layout) =>
      greedySurvivors(layout, HARD_WINTER.batch_size),
    );
    expect(new Set(atFull).size, JSON.stringify(atFull)).toBeGreaterThan(1);
    // And the separation is a building or more, not a rounding error: the widest board keeps two
    // fewer than the compact one under the same policy at the same accuracy.
    expect(
      Math.max(...atFull) - Math.min(...atFull),
      JSON.stringify(atFull),
    ).toBeGreaterThanOrEqual(2);
  }, 60_000);

  /*
   * **THREE TESTS LIVED HERE AND WENT WITH THE GIVE-UP-GROUND ACTION (2026-08-02).** They are
   * named rather than silently deleted, because each measured something the action was priced
   * for and a re-instatement would owe the same measurements again:
   *
   *  - ***"makes the compact board pay for the route that used to be free"***: two plans saving
   *    the same six buildings on `packed` at the same accuracy, where the survivors-only exploit
   *    spent 52 of the island's 88 cells and came out 180 material behind the honest route. It
   *    was the assertion that would have failed if the clean-sweep bonus went back to counting
   *    buildings alone.
   *  - ***"still makes trading land for buildings correct when the answers are not there"***: the
   *    same plan with its pull-backs swapped for fires, asserting that the action stayed CORRECT
   *    somewhere, because pricing a choice nobody should ever take is deleting it slowly. It also
   *    carried the floor `ruin_at: 2` created — that at one right answer in three trading was no
   *    longer the right call — which is the kind of narrowing that belongs in a test.
   *  - ***"previews exactly the ground a pull-back goes on to ruin, on every layout"***: the
   *    preview's cell count, its price and its ring against what the pull-back then did, swept
   *    band by band until the heart refused a further one.
   *
   * The exploit those first two priced is now unreachable from any plan the board offers, which
   * is a stronger answer than a price. What survives of the third is
   * `HARD_WINTER.reclaim_cost_per_cell`, asserted where it is still used: the city's
   * crisis-generic ground repair, in `crisis-damage.test.ts`.
   */

  /**
   * The tuning table quotes cell counts in its arithmetic, and a comment cannot be wrong
   * about a number the code can read. These are the two the retune's argument rests on.
   */
  it("holds the arithmetic the tuning table quotes", () => {
    const island = hardWinterIsland(ERA);
    expect(island.cells.length).toBe(88);
    expect(winterWardArea(HARD_WINTER.fire.radius_by_tier.strong)).toBe(13);
    expect(
      Math.round((13 / island.cells.length) * 1000) / 10,
      "the top tier's share of the island",
    ).toBe(14.8);
    // The square it replaced, for the comparison the table draws: 25 of 88 is 28.4%.
    expect(Math.round((25 / island.cells.length) * 1000) / 10).toBe(28.4);

    // **AND THE CELL-ROUNDS TABLE, which is the half of that docblock the round count is
    // in.** The footprint shares above are a fact about the ward alone; the shares
    // `radius_by_tier` actually argues from are per ENCOUNTER, so every one of them is a
    // function of `HARD_WINTER.rounds` and every one of them went stale on 2026-07-30
    // without anything failing. Pinned here rather than described, because the prose
    // beside them was left quoting a winter six rounds long and nothing could tell — and
    // this pin is what caught the same paragraph THREE times: on 2026-08-01 when the count went
    // to four, where 440 cell-rounds became 352 and every share below rose without a cell moving,
    // again when that was reversed, and on 2026-08-02 at three rounds, where 264 cell-rounds took
    // the top tier from 8.9% of the encounter to 14.8% of it.
    const encounter = island.cells.length * HARD_WINTER.rounds;
    expect(encounter, "the encounter, in cell-rounds").toBe(264);
    const share = (cells: number, rounds: number) =>
      Math.round((1000 * cells * rounds) / encounter) / 10;
    let quoted = 0;
    for (const [tier, cells, rounds, percent] of [
      ["weak", 1, 2, 0.8],
      ["steady", 5, 2, 3.8],
      ["strong", 13, 3, 14.8],
    ] as const) {
      expect(winterWardArea(HARD_WINTER.fire.radius_by_tier[tier]), tier).toBe(cells);
      expect(HARD_WINTER.fire.burn_rounds_by_tier[tier], tier).toBe(rounds);
      expect(share(cells, rounds), `${tier}'s share of the encounter`).toBe(percent);
      quoted += 1;
    }
    // A floor, so the loop cannot come out green by having nothing to walk.
    expect(quoted).toBe(3);
    // The two comparisons the same paragraph draws against those three.
    expect(share(25, 2), "the 5x5 square at the duration it burned").toBe(18.9);
    expect(share(13, 2), "a flat-two top tier, the rung this ladder replaced").toBe(9.8);
    // And the top tier is still under the square that was complained about, which is the
    // comparison the whole paragraph turns on. **THE MARGIN IS THE THING THAT MOVED**: 2.5 points
    // at five rounds, 3.1 while the count read four, and 4.1 at three — every one of those a
    // smaller denominator rather than a bigger ward. It is still a margin, and the docblock names
    // the two dials for a retune that needs more of one.
    expect(share(13, 3), "the shipped top tier").toBeLessThan(share(25, 2));

    // And the ground table's own anchor: twenty ruined cells cost one ruined building, so a
    // rim band costs about a building. The bands and their bills, as the table quotes them.
    expect(20 * HARD_WINTER.reclaim_cost_per_cell).toBe(HARD_WINTER.rebuild_cost_per_ruin);
    const bandSizes = [0, 1, 2, 3].map(
      (depth) => island.cells.filter((key) => island.rim_depth.get(key) === depth).length,
    );
    expect(bandSizes).toEqual([28, 24, 20, 12]);
    expect(bandSizes.map((n) => winterReclaimCost(n))).toEqual([84, 72, 60, 36]);
    // Cumulative, which is what a player who pulls back repeatedly actually owes.
    expect([28, 52, 72, 84].map((n) => winterReclaimCost(n))).toEqual([84, 156, 216, 252]);
  });
});
