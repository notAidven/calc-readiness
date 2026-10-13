import { describe, expect, it } from "vitest";

import {
  type CrisisDamage,
  clearRuinedBuilding,
  clearRuinedCell,
  clearSuspendedCivic,
  crisisDamageId,
  crisisRepairCost,
  foldCrisisDamage,
  isCrisisDamageClear,
  NO_CRISIS_DAMAGE,
  ruinedBuilding,
  ruinedCell,
} from "./crisis-damage";
import {
  createHardWinter,
  type HardWinterState,
  hardWinterDamage,
  hardWinterReducer,
  hardWinterRepairPrices,
  winterRebuildCost,
  winterReclaimCost,
} from "./hard-winter";
import { HARD_WINTER } from "./hard-winter-tuning";

/**
 * **THE FAILURE FLOOR, AS ASSERTIONS.** The lead's ruling (2026-07-30) is that a crisis may
 * damage, disable, scar or reduce capacity and may never undo mastery or permanently remove
 * an earned building. This file measures the half of that which lives in the engine: that
 * damage is a set of ids beside the placements rather than a change to them, that the
 * damage-id mint cannot repeat, and that every kind of damage the shape can hold can be
 * cleared again.
 *
 * The web half — that a ruined building is still clickable, that a ruin survives a reload,
 * that a repair actually spends — is asserted in `apps/web/src/city/`, because it needs a
 * session and a wallet this package may not import.
 */

/**
 * A winter played to its end at zero accuracy, so every building the frost reaches is a ruin.
 *
 * ## IT USED TO END WITH BOTH KINDS OF DAMAGE, AND NOW IT CANNOT
 *
 * It gave up the shoreline in round one, which scarred ground by choice alongside the buildings
 * the cold took. The lead ruled that action out on 2026-08-02 (see `WinterAction`), so **no
 * winter can scar ground** and this fixture ends with ruined buildings and nothing else.
 *
 * That is a fact about the WINTER and not about {@link CrisisDamage}, which is the distinction
 * this file exists to keep: the shape still carries `ruined_cells`, it is still persisted, still
 * repairable and still priced, and the tests below that need a scarred cell construct one
 * directly rather than asking a winter for it. A crisis that scars ground is exactly what that
 * field is for; era one's no longer does.
 *
 * The note the old fixture carried is kept because the trap is still live: a refused declaration
 * returns the same state object, so a loop that declared something illegal every round would
 * stall in `declaring` and never reach an outcome. A fire on the heart is legal in every round.
 */
function ruinedWinter(): HardWinterState {
  let state = createHardWinter({ era: "prehistoric" });
  for (let round = 1; round <= HARD_WINTER.rounds; round += 1) {
    state = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "fire", col: 0, row: 0 },
    });
    state = hardWinterReducer(state, { type: "resolve", correct: 0, asked: 3 });
    state = hardWinterReducer(state, { type: "end_round" });
  }
  if (state.phase !== "ended" || state.outcome === null) {
    throw new Error(`the fixture winter stalled in "${state.phase}"`);
  }
  return state;
}

describe("crisis damage is a SET OF IDS, never a change to what the player owns", () => {
  it("records a ruin as a node id, so the placement it names is untouched by construction", () => {
    const damage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: ["NUM.3"],
      cells: ["4,0"],
    });

    // The whole shape, enumerated: there is no field for a removed building, a lowered
    // mastery, or a relocked node, and this is the assertion that says so. A future field
    // that could carry one fails here rather than shipping quietly.
    expect(Object.keys(damage).sort()).toEqual([
      "next_damage_id",
      "overwritten_records",
      "ruined_buildings",
      "ruined_cells",
      "suspended_civic",
    ]);
    expect(damage.ruined_buildings).toEqual([{ node_id: "NUM.3", damage_id: "d1" }]);
    expect(damage.ruined_cells).toEqual([{ cell: "4,0", damage_id: "d1" }]);
  });

  it("mints one id per fold and NEVER reuses one", () => {
    let damage = foldCrisisDamage(NO_CRISIS_DAMAGE, { buildings: ["NUM.3"], cells: [] });
    expect(damage.next_damage_id).toBe(2);

    // A second crisis over a different building gets a NEW id, which is what makes the two
    // repairs two distinct spends rather than one the ledger reports as already paid.
    damage = foldCrisisDamage(damage, { buildings: ["NUM.5"], cells: [] });
    expect(ruinedBuilding(damage, "NUM.3")?.damage_id).toBe("d1");
    expect(ruinedBuilding(damage, "NUM.5")?.damage_id).toBe("d2");
    expect(new Set(damage.ruined_buildings.map((b) => b.damage_id)).size).toBe(2);
  });

  it("advances the mint even when a crisis ruined nothing, so an id is never issued twice", () => {
    const damage = foldCrisisDamage(NO_CRISIS_DAMAGE, { buildings: [], cells: [] });
    expect(damage.next_damage_id).toBe(2);
    expect(isCrisisDamageClear(damage)).toBe(true);
  });

  it("keeps an already-ruined building's ORIGINAL damage id when a second crisis hits it", () => {
    // The direction that costs the player: re-stamping would make an already-PAID repair
    // payable again, since the spend is keyed by the id.
    let damage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: ["NUM.3"],
      cells: ["4,0"],
    });
    damage = foldCrisisDamage(damage, { buildings: ["NUM.3"], cells: ["4,0"] });
    expect(damage.ruined_buildings).toHaveLength(1);
    expect(ruinedBuilding(damage, "NUM.3")?.damage_id).toBe("d1");
    expect(damage.ruined_cells).toHaveLength(1);
    expect(ruinedCell(damage, "4,0")?.damage_id).toBe("d1");
    // ...and the direction that costs them nothing but must still be right: the mint moved,
    // so the NEXT distinct ruin cannot collide with d1.
    expect(damage.next_damage_id).toBe(3);
  });

  it("keeps one record scar when a resumed Intrusion reports the same relay twice", () => {
    const report = {
      buildings: [],
      cells: [],
      overwritten_records: [{ placement_id: "relay-1", bands_dark: 4 }],
    };
    const first = foldCrisisDamage(NO_CRISIS_DAMAGE, report);
    const resumed = foldCrisisDamage(first, report);

    expect(resumed.overwritten_records).toEqual(first.overwritten_records);
    expect(resumed.overwritten_records).toHaveLength(1);
  });

  it("refuses to mint from a rewound or nonsense counter", () => {
    expect(() => crisisDamageId(0)).toThrow(/whole counter starting at 1/);
    expect(() => crisisDamageId(-1)).toThrow(/whole counter starting at 1/);
    expect(() => crisisDamageId(1.5)).toThrow(/whole counter starting at 1/);
    expect(crisisDamageId(1)).toBe("d1");
    expect(crisisDamageId(42)).toBe("d42");
  });
});

describe("every kind of damage the shape can hold can be CLEARED again", () => {
  const damaged: CrisisDamage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
    buildings: ["NUM.3", "NUM.5"],
    cells: ["4,0", "4,1"],
    suspended_civic: ["lodge-1"],
  });

  it("is not clear while anything stands unrepaired, and is clear once nothing does", () => {
    expect(isCrisisDamageClear(damaged)).toBe(false);

    let damage = damaged;
    damage = clearRuinedBuilding(damage, "NUM.3");
    damage = clearRuinedBuilding(damage, "NUM.5");
    expect(isCrisisDamageClear(damage)).toBe(false);
    damage = clearRuinedCell(damage, "4,0");
    damage = clearRuinedCell(damage, "4,1");
    expect(isCrisisDamageClear(damage)).toBe(false);
    // The third set matters: a shape that reported "clear" while a civic contribution was
    // still suspended would hide the Lost Herd's whole mechanic behind a green tick.
    damage = clearSuspendedCivic(damage, "lodge-1");
    expect(isCrisisDamageClear(damage)).toBe(true);
  });

  it("clears exactly one subject and leaves the mint alone", () => {
    const after = clearRuinedBuilding(damaged, "NUM.3");
    expect(after.ruined_buildings.map((b) => b.node_id)).toEqual(["NUM.5"]);
    expect(after.ruined_cells).toHaveLength(2);
    // The mint must not rewind on a repair: an id it re-issued would key a spend the
    // ledger has already recorded.
    expect(after.next_damage_id).toBe(damaged.next_damage_id);
  });

  it("carries the Lost Herd's locked capacity without a second migration", () => {
    // The third consumer named as out of scope, checked for CARRYING CAPACITY rather than
    // built: a crisis that suspends a civic contribution needs no new field, no new parser
    // branch and no new schema bump.
    expect(damaged.suspended_civic).toEqual([{ placement_id: "lodge-1", damage_id: "d1" }]);
    expect(clearSuspendedCivic(damaged, "lodge-1").suspended_civic).toEqual([]);
    // And it is a SUSPENSION, not a removal: nothing in this shape can delete a placement,
    // so the placement id it names must still exist somewhere for the flag to mean anything.
    expect(Object.keys(damaged.suspended_civic[0] ?? {}).sort()).toEqual([
      "damage_id",
      "placement_id",
    ]);
  });
});

describe("the repair bill is the AUTHORED prices and nothing invented", () => {
  it("reads both prices off the tuning table, and neither is re-authored", () => {
    const prices = hardWinterRepairPrices();
    expect(prices.per_building).toBe(HARD_WINTER.rebuild_cost_per_ruin);
    expect(prices.per_cell).toBe(HARD_WINTER.reclaim_cost_per_cell);
  });

  it("keeps the derivation the two numbers were chosen against: 20 cells = 1 building", () => {
    // The relationship rather than the digits, per `hard-winter-tuning.ts`'s own rule — and
    // the relationship is exactly the argument that ground must be reclaimable at all: a
    // price derived against a rebuild price only means something if both are bought.
    const prices = hardWinterRepairPrices();
    expect(prices.per_cell * 20).toBe(prices.per_building);
  });

  it("totals a damaged city at the per-item prices, with no bulk discount", () => {
    const damage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: ["NUM.3", "NUM.5"],
      cells: ["4,0", "4,1", "4,2"],
    });
    const prices = hardWinterRepairPrices();
    expect(crisisRepairCost(damage, prices)).toBe(
      2 * prices.per_building + 3 * prices.per_cell,
    );
    // The engine's own two cost helpers agree with it, so the outcome read-out and the
    // repair action cannot quote different figures for the same damage.
    expect(crisisRepairCost(damage, prices)).toBe(
      winterRebuildCost(2) + winterReclaimCost(3),
    );
  });

  it("prices an undamaged city at nothing", () => {
    expect(crisisRepairCost(NO_CRISIS_DAMAGE, hardWinterRepairPrices())).toBe(0);
  });
});

describe("hardWinterDamage projects a played winter into that shape", () => {
  const state = ruinedWinter();

  it("carries every ruined building, and no ground at all", () => {
    const report = hardWinterDamage(state);
    const outcome = state.outcome;
    if (outcome === null) {
      throw new Error("the winter did not end");
    }
    // A floor first: a projection of an undamaged winter would satisfy the equality below
    // trivially, and the whole point of this fixture is that it ruined things.
    expect(report.buildings.length).toBeGreaterThanOrEqual(1);
    expect(report.buildings).toEqual(outcome.ruined);

    /*
     * **THIS LINE READ `expect(report.cells.length).toBeGreaterThanOrEqual(1)`**, over a fixture
     * that gave up the shoreline in round one. The give-up-ground action was ruled out on
     * 2026-08-02, so a winter's ground damage is EMPTY by construction rather than by accident,
     * and it is asserted as such: an implementation that started shipping `frozen` cells across
     * fails here, which is the defect the old floor and this census both exist for.
     */
    expect(report.cells).toEqual([]);
  });

  it("does NOT carry frozen ground, because the frost thaws", () => {
    const outcome = state.outcome;
    if (outcome === null) {
      throw new Error("the winter did not end");
    }
    // The distinction this whole mechanic turns on, asserted rather than described. The fixture
    // froze real ground and carried none of it across, so an implementation that shipped
    // `frozen` fails here — and the gap between the two numbers is what makes the assertion
    // non-vacuous, since an empty report over an unfrozen island would prove nothing.
    expect(outcome.frozen_cells).toBeGreaterThan(0);
    expect(hardWinterDamage(state).cells).toEqual([]);
  });

  it("reports nothing for a winter that has not started", () => {
    const fresh = createHardWinter({ era: "prehistoric" });
    expect(hardWinterDamage(fresh)).toEqual({ buildings: [], cells: [] });
  });

  it("leaves the engine a PURE REDUCER: the projection changes no state", () => {
    // The seam's own promise. If `hardWinterDamage` ever grew a write, this is where it
    // would show: the state object it was handed is identical afterwards, by value.
    const before = structuredClone(state);
    hardWinterDamage(state);
    expect(state).toEqual(before);
  });

  it("names every ruin as a NODE ID the winter was given, never a new thing", () => {
    // The floor's other half: ruin renames nothing. Every id in the report must be one of
    // the buildings the winter opened with, so a projection cannot invent a subject the
    // city has no placement for.
    const opened = new Set(
      createHardWinter({ era: "prehistoric" }).buildings.map((b) => b.node_id),
    );
    const report = hardWinterDamage(state);
    expect(report.buildings.length).toBeGreaterThanOrEqual(1);
    for (const nodeId of report.buildings) {
      expect(opened.has(nodeId), `${nodeId} was not on the board`).toBe(true);
    }
  });
});
