import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  winterCellKey,
  winterDamageBite,
  winterFrostAfterAdvance,
  winterSpreadSteps,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import {
  winterShieldedNodeIds,
  winterSpentShields,
  winterThreatenedNodeIds,
} from "./buildingThreat";
import { thawWinterRows } from "./thaw";

/**
 * **THE THREE READINGS THE ISLAND DRESSES ITS BUILDINGS FROM, CHECKED AGAINST THE ENGINE THAT
 * OWNS THEM.**
 *
 * The claim worth testing is not that these functions return sets. It is that the badge on a
 * building and the damage the reducer deals AGREE — that a building the island marks
 * *threatened* is exactly a building `closeRound` is about to bite, no more and no fewer. That
 * is asserted below by playing real rounds and diffing the prediction against what actually
 * happened, rather than by re-deriving the frost's timetable here and comparing two copies of
 * the same arithmetic.
 */

const BUILDINGS = [
  { node_id: "NUM.S", col: 0, row: 0 },
  { node_id: "NUM.F", col: 2, row: -2 },
  { node_id: "NUM.2", col: -2, row: 1 },
  { node_id: "NUM.3", col: 1, row: 2 },
] as const;

/**
 * The one at the island's centre, which is the deepest rim band and so the LAST ground the frost
 * takes. Named because two tests below turn on that timing rather than on which node it is.
 */
const HEART = "NUM.S";

function newWinter(): HardWinterState {
  return createHardWinter({ era: CURRENT_ERA_ID, buildings: [...BUILDINGS] });
}

function playRound(
  winter: HardWinterState,
  action: WinterAction,
  correct = 3,
): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

function rowsOf(winter: HardWinterState) {
  return hardWinterView(winter, { fire_preview: null }).rows;
}

/**
 * **A STANDING BUILDING ON GROUND THE FROST ALREADY HOLDS — three tests below need one, and it is
 * a fixture rather than two lines because reaching it got harder twice.**
 *
 * It used to be two pull-backs: giving up a ring froze it outright, so two of them put frost under
 * a building in two rounds. That action was ruled out on 2026-08-02, so the frost's own schedule is
 * the only way there — and at `HARD_WINTER.damage.ruin_at: 1` a building the frost reaches
 * unsheltered is a RUIN rather than a survivor standing on ice, which is the state these tests are
 * about. So the building has to be SHIELDED before the frost arrives.
 *
 * `NUM.F` is on rim band 2, which `spread.accelerate_every: 1` freezes as round two closes, so a
 * top-tier shield raised in round one carries it onto ice and leaves the winter in round three with
 * it standing, frozen and unwarded. The floors in each caller are what say the fixture worked.
 */
function standingOnIce(): { readonly winter: HardWinterState; readonly nodeId: string } {
  let winter = newWinter();
  winter = playRound(winter, { kind: "reinforce", node_id: "NUM.F" });
  winter = playRound(winter, { kind: "reinforce", node_id: "NUM.F" });
  return { winter, nodeId: "NUM.F" };
}

/** Which buildings `closeRound` ACTUALLY bit, read off the state it produced. */
function bittenBy(before: HardWinterState, after: HardWinterState): ReadonlySet<string> {
  const coldBefore = new Map(
    before.buildings.map((b) => [b.node_id, b.cold_rounds] as const),
  );
  const bitten = new Set<string>();
  for (const building of after.buildings) {
    if ((coldBefore.get(building.node_id) ?? 0) < building.cold_rounds) {
      bitten.add(building.node_id);
    }
  }
  return bitten;
}

describe("threatened means the frost reaches this building when the round closes", () => {
  it("predicts exactly the buildings the next round then bites, every round", () => {
    // THE IDENTITY, PLAYED RATHER THAN ARGUED. The prediction is taken from the board the
    // player is looking at, the round is then closed, and the set the reducer actually bit is
    // read back off `cold_rounds`. If the badge and the damage ever came apart — a different
    // flood fill, an off-by-one on the ward, a building on already-frozen ground quietly
    // dropped from the marked set — this is where it shows.
    let winter = newWinter();
    let roundsChecked = 0;
    let everBit = 0;

    for (let i = 0; i < HARD_WINTER.rounds; i += 1) {
      if (winter.phase === "ended") {
        break;
      }
      const predicted = winterThreatenedNodeIds(rowsOf(winter));
      const before = winter;
      winter = playRound(winter, { kind: "fire", col: 1, row: 0 });
      const bitten = bittenBy(before, winter);
      expect([...predicted].sort(), `round ${before.round}`).toEqual([...bitten].sort());
      roundsChecked += 1;
      everBit += bitten.size;
    }

    // Floors, because a prediction of nothing matches a bite of nothing perfectly. Without
    // these the identity above holds trivially over a winter where the frost never arrived.
    expect(roundsChecked).toBeGreaterThanOrEqual(3);
    expect(everBit).toBeGreaterThan(0);
  });

  it("marks a building on ground the frost ALREADY holds, not only newly-taken ground", () => {
    // The tempting shortcut is `frost_next` alone, which is *newly* taken ground. A building
    // standing unwarded on frozen ground is bitten again every round it stands there, so that
    // reading would mark it the round the frost arrived and then quietly clear it while the
    // building was being ground down — the worst possible moment to stop warning anyone.
    const { winter } = standingOnIce();

    const rows = rowsOf(winter);
    // STANDING, and that narrowing is `damage.ruin_at: 1`'s doing rather than a weakening: a
    // building the frost reaches unsheltered is a ruin, and a ruin is deliberately NOT threatened
    // (see the test below), so a filter that took every building would be asserting the opposite
    // of the next test over the same board.
    const alreadyFrozen = rows
      .flat()
      .filter((cell) => cell.building?.state === "standing" && cell.frozen && !cell.warded);
    expect(
      alreadyFrozen.length,
      "nothing is standing on ice, so this asserts nothing",
    ).toBeGreaterThan(0);

    const threatened = winterThreatenedNodeIds(rows);
    for (const cell of alreadyFrozen) {
      expect(threatened, `${cell.col},${cell.row}`).toContain(cell.building?.node_id);
    }
  });

  it("reads the board's own advance rather than running a second flood fill", () => {
    // There is one implementation of the frost's timetable in this codebase and the view is
    // projected through it. This checks the derivation is standing on that, by rebuilding the
    // post-advance set straight from the engine's own function and requiring the same answer.
    let winter = newWinter();
    winter = playRound(winter, { kind: "fire", col: 3, row: 0 });

    const view = hardWinterView(winter, { fire_preview: null });
    const warded = new Set(
      view.rows
        .flat()
        .filter((cell) => cell.warded)
        .map((cell) => winterCellKey(cell.col, cell.row)),
    );
    const reached = winterFrostAfterAdvance(
      view.island,
      new Set(winter.frozen),
      warded,
      winterSpreadSteps(winter.round),
    );
    const fromEngine = new Set(
      winter.buildings
        .filter((b) => b.state === "standing")
        .filter((b) => {
          const key = winterCellKey(b.col, b.row);
          return reached.has(key) && !warded.has(key);
        })
        .map((b) => b.node_id),
    );

    expect([...winterThreatenedNodeIds(view.rows)].sort()).toEqual([...fromEngine].sort());
  });

  it("clears a building a fire is holding on ground the frost already took", () => {
    /*
     * **THE `!cell.warded` TERM, AND WHERE IT IS THE ONLY THING DOING ANY WORK.**
     *
     * This played one round, lit a fire AHEAD of the front, and looped over every warded cell
     * with a building on it. Two things were wrong with it and the second is the interesting one.
     * It had no floor, so the containment loop was satisfied by an empty `held`. And with a floor
     * added the injection STILL passed, which is the finding: a fire lit ahead of the front stops
     * the frost arriving, so its cell is neither `frozen` nor `frost_next` and the reading
     * excludes the building on the first clause. The ward term is dead over that fixture. Measured
     * on 2026-08-01 both ways: strip `!cell.warded` out of `winterThreatenedNodeIds` and the file
     * reported **13 passed** before the floor and **14 passed** after it.
     *
     * The term is load-bearing over exactly one state — a building on ground the frost ALREADY
     * HOLDS, with a fire now standing on it — because `frozen` is monotone and never comes back
     * off. That is also the state `closeRound` reads (`frozen.has(key) && !warded.has(key)`), so
     * this is the pair the badge and the damage have to agree about. So the fixture builds it:
     * `standingOnIce` shields a band-two building onto frozen ground, then a fire is lit on that
     * building's own cell. It was two pull-backs until 2026-08-02; see that helper.
     */
    const { winter } = standingOnIce();

    const onFrozenGround = rowsOf(winter)
      .flat()
      .filter((cell) => cell.building?.state === "standing" && cell.frozen && !cell.warded);
    expect(
      onFrozenGround.length,
      "no standing building is on frozen ground, so a fire here cannot hold any",
    ).toBeGreaterThan(0);
    const target = onFrozenGround[0] as (typeof onFrozenGround)[number];
    expect(winterThreatenedNodeIds(rowsOf(winter))).toContain(target.building?.node_id);

    // Lit ON it, at the top tier so the disc certainly covers the cell it was aimed at. The round
    // is deliberately NOT closed: `warded` is read off `state.fires`, so the ward is in effect the
    // moment the batch resolves, and closing would advance the front and change the subject.
    let warmed = hardWinterReducer(winter, {
      type: "declare",
      action: { kind: "fire", col: target.col, row: target.row },
    });
    warmed = hardWinterReducer(warmed, { type: "resolve", correct: 3, asked: 3 });

    // Not asserted as "the exact same set minus one" — a fire moves the whole front. What is
    // asserted is that a building standing on frozen ground its own fire holds is not marked.
    const held = rowsOf(warmed)
      .flat()
      .filter((cell) => cell.warded && cell.frozen && cell.building?.state === "standing");
    expect(
      held.length,
      "the fire is holding no building's frozen ground, so the ward term is not under test",
    ).toBeGreaterThan(0);
    const stillThreatened = winterThreatenedNodeIds(rowsOf(warmed));
    for (const cell of held) {
      expect(stillThreatened, `${cell.col},${cell.row}`).not.toContain(
        cell.building?.node_id,
      );
    }
  });

  it("marks no RUIN, because a building already lost is not about to be hit", () => {
    /*
     * **THE POPULATION HOLE, and it is the same shape as the one above.**
     *
     * `winterThreatenedNodeIds` skips a cell whose building is not `standing`, and nothing in
     * this file exercised that: measured on 2026-08-01, widening the skip to `building === null`
     * — so a ruin is marked like anything else — left the file reporting **13 passed, 0 failed**.
     * The identity test above would have caught it if a ruin had been on the board, and at this
     * tuning none of its five rounds produces one, so the whole claim rested on a fixture.
     *
     * Constructed off REAL rows rather than played, because what is under test is the reading and
     * not the frost's timetable: two rounds put the frost among the buildings, then one of the
     * buildings the reading marks is turned into a ruin in place and must drop out. The two rounds
     * were pull-backs until 2026-08-02 and are fires now, which reaches the same board through the
     * frost's own schedule.
     */
    let winter = newWinter();
    winter = playRound(winter, { kind: "fire", col: -5, row: 0 });
    winter = playRound(winter, { kind: "fire", col: -5, row: 0 });

    const rows = rowsOf(winter);
    const marked = winterThreatenedNodeIds(rows);
    expect(marked.size, "nothing is marked, so there is nothing to ruin").toBeGreaterThan(
      0,
    );
    const lost = [...marked][0] as string;

    const withRuin = rows.map((line) =>
      line.map((cell) =>
        cell.building?.node_id === lost
          ? { ...cell, building: { ...cell.building, state: "ruin" as const } }
          : cell,
      ),
    );
    const after = winterThreatenedNodeIds(withRuin);
    expect(after).not.toContain(lost);
    // AND THE OTHERS ARE UNTOUCHED, so this is the ruin dropping out rather than the reading
    // emptying: a gate that marked nothing at all would satisfy the line above.
    expect([...after].sort()).toEqual([...marked].filter((id) => id !== lost).sort());
  });

  it("threatens nothing once the winter has ended, through the thaw and not a second gate", () => {
    /*
     * **THE FIXTURE HAS TO LEAVE ONE BUILDING STANDING ON FROZEN GROUND, and at
     * `damage.ruin_at: 2` that takes a shield.**
     *
     * The claim is unchanged and the line of play is on its second rewrite, both times because the
     * fixture stopped reaching the state rather than because the reading moved.
     *
     *  - It first played at three of three, so a top-tier disc warded the heart every round and
     *    ground the deep buildings to ruins. Nothing was marked on the UN-THAWED board either, so
     *    "the thaw empties it" and "there was nothing in it" were the same measurement. The floor
     *    below is what found that: with it, stopping `thawWinterRows` clearing `frozen` fails here,
     *    and without it the file reported 13 passed over that injection.
     *  - Zero accuracy fixed that at `ruin_at: 6`, where the heart's one late cold round left it
     *    scarred and standing. `#374` landed `ruin_at: 2` against a late bite of 3, so that same
     *    round now destroys it: every building ends the winter a ruin, `winterThreatenedNodeIds`
     *    correctly marks no ruin, and the floor went red. **The reading is right and the fixture
     *    was stale.**
     *
     * A SHIELD IS THE ONE THING THAT LEAVES A BUILDING STANDING THROUGH A COLD ROUND, because it
     * absorbs the bite before the building takes any of it. And it is not a ward — the ground is
     * still frozen and still unwarded — so the building stays MARKED, which is the state the thaw
     * has to clear. That is also the composed case the whole feature exists for: reinforced, and
     * the frost arriving anyway.
     */
    const lastBite = winterDamageBite(HARD_WINTER.rounds);
    const topShield = HARD_WINTER.reinforce.shield_by_tier.strong;
    expect(
      topShield,
      "the strongest shield cannot absorb the last round's bite, so nothing survives to be marked",
    ).toBeGreaterThanOrEqual(lastBite);

    let winter = newWinter();
    // Fires that never catch for every round but the last, so nothing is warded and the frost
    // reaches on its own timetable. A fire rather than a pull-back because the rings run out, and a
    // refused declaration leaves the round un-advanced — which would end this loop looking like a
    // finished winter without one having been played.
    for (let round = 1; round < HARD_WINTER.rounds; round += 1) {
      winter = playRound(winter, { kind: "fire", col: 1, row: 0 }, 0);
    }
    // AND THE SHIELD ROUND IS STILL AHEAD, said here rather than left to be inferred from a ruin
    // three assertions later: a loop that had consumed the whole winter would leave the reinforce
    // below acting on a finished state, and every symptom of that reads as the shield failing.
    expect(
      winter.phase,
      "the loop played the whole winter, so the shield round never happened",
    ).not.toBe("ended");
    // THE LAST ROUND SHIELDS THE HEART, which is the one building the frost reaches only as that
    // round closes, so it enters the round unmarked and leaves it standing.
    winter = playRound(winter, { kind: "reinforce", node_id: HEART }, 3);
    expect(winter.phase).toBe("ended");
    const heart = winter.buildings.find((b) => b.node_id === HEART);
    expect(heart?.state, "the shielded heart did not survive the last cold round").toBe(
      "standing",
    );
    /*
     * AND IT SURVIVED BY ABSORPTION, WHICH IS THE RULING RATHER THAN THE OUTCOME.
     *
     * `standing` is satisfied by a heart the bite never reached, and by a shield that stopped the
     * bite without being spent for it. Neither is the mechanic: `hard-winter.test.ts` puts it as
     * *"absorbs the bite instead of raising the ceiling, so timing is the whole of it"*, and a
     * shield that absorbed without depleting would be a different mechanic passing this test. So
     * the arithmetic is pinned at both ends, off the tuning rather than as digits: the shield is
     * down by exactly the bite, and none of the bite reached the building.
     */
    expect(heart?.shield, "the shield stopped the bite without being spent for it").toBe(
      topShield - lastBite,
    );
    expect(heart?.damage, "the bite got past the shield, which is not this state").toBe(0);

    /*
     * A FLOOR FIRST, because "the thaw empties it" and "there was nothing in it" are the same
     * measurement without one.
     *
     * The un-thawed rows are the ones the winter's own state still carries: `frozen` survives
     * `phase: "ended"` (the reducer never clears it, which is why `thaw.ts` exists at all), so a
     * standing building on frozen ground is still marked on them.
     */
    expect(
      winterThreatenedNodeIds(rowsOf(winter)).size,
      "the un-thawed board marks nobody, so the thaw has nothing to take off",
    ).toBeGreaterThan(0);
    // The rows the board actually publishes at that point are the THAWED ones, which is the
    // one decision about when a crisis is over. Fed those, the reading empties itself.
    expect(winterThreatenedNodeIds(thawWinterRows(rowsOf(winter))).size).toBe(0);
  });
});

describe("shielded is binary, and does not survive the crisis", () => {
  it("holds a building the moment a reinforce lands on it", () => {
    let winter = newWinter();
    expect(winterShieldedNodeIds(winter.buildings, false).size).toBe(0);

    winter = hardWinterReducer(winter, {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.S" },
    });
    winter = hardWinterReducer(winter, { type: "resolve", correct: 3, asked: 3 });
    expect([...winterShieldedNodeIds(winter.buildings, false)]).toEqual(["NUM.S"]);
  });

  it("says nothing about HOW MUCH, at either end of the tier ladder", () => {
    // The engine grants 2, 4 or 6 by tier and the island draws none of it. The set is the
    // whole vocabulary, so a weak shield and a strong one are the same picture — which is
    // exactly the ruling, written where the collapse happens.
    const tiers = Object.values(HARD_WINTER.reinforce.shield_by_tier).filter((n) => n > 0);
    expect(tiers.length).toBeGreaterThanOrEqual(2);
    expect(new Set(tiers).size).toBeGreaterThanOrEqual(2);

    const shielded = tiers.map((shield) => {
      const buildings = newWinter().buildings.map((b) =>
        b.node_id === "NUM.S" ? { ...b, shield } : b,
      );
      return [...winterShieldedNodeIds(buildings, false)];
    });
    for (const set of shielded) {
      expect(set).toEqual(shielded[0]);
    }
  });

  it("empties the moment the winter ends, whatever the engine still records", () => {
    // A shield does not persist after the crisis: a reinforced building that survived the
    // winter goes back to its ordinary look in the city. The reducer has no reason to zero
    // `shield` when the winter stops, so this gate is the whole of that ruling.
    const buildings = newWinter().buildings.map((b) =>
      b.node_id === "NUM.S" ? { ...b, shield: HARD_WINTER.damage.ruin_at } : b,
    );
    expect(winterShieldedNodeIds(buildings, false).size).toBe(1);
    expect(winterShieldedNodeIds(buildings, true).size).toBe(0);
  });

  it("never shields a ruin", () => {
    const buildings = newWinter().buildings.map((b) =>
      b.node_id === "NUM.S" ? { ...b, shield: 4, state: "ruin" as const } : b,
    );
    expect(winterShieldedNodeIds(buildings, false).size).toBe(0);
  });
});

describe("a shield that breaks is announced, because the picture cannot announce it", () => {
  it("reports a building whose shield was spent to nothing by the round", () => {
    const before = newWinter().buildings.map((b) =>
      b.node_id === "NUM.S" ? { ...b, shield: 2 } : b,
    );
    const after = before.map((b) => (b.node_id === "NUM.S" ? { ...b, shield: 0 } : b));
    expect(winterSpentShields(before, after)).toEqual(["NUM.S"]);
  });

  it("says nothing about a shield that merely got smaller", () => {
    // Depletion is invisible on the island by ruling, so a shield going 6 → 2 changes no
    // picture and owes no notice. Only reaching zero takes the storm roof off.
    const before = newWinter().buildings.map((b) =>
      b.node_id === "NUM.S" ? { ...b, shield: 6 } : b,
    );
    const after = before.map((b) => (b.node_id === "NUM.S" ? { ...b, shield: 2 } : b));
    expect(winterSpentShields(before, after)).toEqual([]);
  });

  it("says nothing about a building that was ruined in the same round", () => {
    // It did not revert to its ordinary look, it became a ruin, and the round's own report
    // already says it was lost. The smaller fact would be spending attention against the
    // larger one.
    const before = newWinter().buildings.map((b) =>
      b.node_id === "NUM.S" ? { ...b, shield: 2 } : b,
    );
    const after = before.map((b) =>
      b.node_id === "NUM.S" ? { ...b, shield: 0, state: "ruin" as const } : b,
    );
    expect(winterSpentShields(before, after)).toEqual([]);
  });

  it("fires on a real round close, with the engine spending the shield", () => {
    // The reproduction the notice exists for, played rather than constructed: a shield small
    // enough that one bite empties it, and a building the frost is certain to reach.
    let winter = newWinter();
    winter = hardWinterReducer(winter, {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.F" },
    });
    // The weakest tier that still grants a shield, so the first cold round can exhaust it.
    winter = hardWinterReducer(winter, { type: "resolve", correct: 1, asked: 3 });
    const raised = winter.buildings.find((b) => b.node_id === "NUM.F")?.shield ?? 0;
    expect(raised).toBeGreaterThan(0);

    let spent: readonly string[] = [];
    let before = winter;
    for (let i = 0; i < HARD_WINTER.rounds && spent.length === 0; i += 1) {
      if (before.phase === "ended") {
        break;
      }
      const after =
        before.phase === "declaring"
          ? playRound(before, { kind: "fire", col: -5, row: 0 }, 0)
          : hardWinterReducer(before, { type: "end_round" });
      spent = winterSpentShields(before.buildings, after.buildings);
      before = after;
    }
    expect(spent).toContain("NUM.F");
  });
});
