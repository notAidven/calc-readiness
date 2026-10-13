import {
  createHardWinter,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../city/eraDressing";
import { thawedScarCells, thawWinterRows } from "./thaw";

/**
 * **THE CRISIS HAS AN ENDING NOW: the atmosphere reverts and the damage stays.**
 *
 * The team lead: *"ensure that after the era 1 crisis is finished, the non-damaged tiles /
 * general environment revert to how they were before to signify the crisis being over."*
 *
 * THE DEFECT, and it is reproduced here before it is fixed rather than described: the reducer's
 * last `end_round` sets `phase: "ended"` and never clears `state.frozen`, so `hardWinterView`
 * of a finished winter still reports frozen cells and the island goes on wearing the crisis for
 * as long as the player is looking at the outcome. The first assertion below is that
 * reproduction — it reads the SHIPPED reducer, so it fails the day the engine starts thawing
 * its own state and this file stops being needed.
 *
 * Every fixture here is a whole winter played through the real reducer rather than a
 * hand-written view model: a thaw tested over rows somebody typed can go on passing over rows
 * the engine stopped producing.
 */

/**
 * Declare, answer `correct` of the round's three, and let the frost advance — one whole round.
 *
 * The mark is a parameter because the damage curve made it load-bearing: how well the round is
 * answered is what decides whether a building finishes hurt or ruined, so a fixture that wants
 * a ruin has to ask for one. Full marks is the default, which is what every caller that only
 * needs frost and abandoned ground wants.
 */
function playRound(
  state: HardWinterState,
  action: WinterAction,
  correct = 3,
): HardWinterState {
  const declared = hardWinterReducer(state, { type: "declare", action });
  const resolved = hardWinterReducer(declared, { type: "resolve", correct, asked: 3 });
  return hardWinterReducer(resolved, { type: "end_round" });
}

/**
 * A whole winter, played to its end, having given up a ring on the way — so the finished board
 * carries BOTH halves: frost that should thaw and abandoned ground that must not.
 */
function finishedWinter(): HardWinterState {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: [
      { node_id: "NUM.S", col: 0, row: 0 },
      { node_id: "NUM.F", col: 2, row: -2 },
      { node_id: "NUM.2", col: -2, row: 1 },
    ],
  });
  // **THE PULL-BACK WENT FROM THIS FIXTURE ON 2026-08-02.** It opened the winter, so there was
  // scarred ground on the board for the rest of it and the thaw's durable half had something to
  // keep. The action was ruled out (see `WinterAction`), so the frost is the only thing that
  // touches this island and every ground state on it is transient.
  while (winter.phase !== "ended") {
    winter = playRound(winter, { kind: "fire", col: 0, row: 1 });
  }
  return winter;
}

/**
 * The same winter played BADLY, so a building actually goes to ruin.
 *
 * `finishedWinter` answers at full marks, and at the 2026-08-02 tuning that is still not enough
 * to wreck anything on this three-building board: a top-tier fire over the middle of it holds
 * every one of them for the whole winter.
 *
 * **THE OTHER HALF OF THIS DOCBLOCK IS NOW HISTORY, and it is the sharpest single record of what
 * `damage.ruin_at: 1` did.** It read: *"at `correct: 3` of 3 the worst building finishes
 * `standing` on 4 damage of the 6 `ruin_at` takes, i.e. hurt but not ruined … answering one of
 * three ruins two of the three buildings and leaves the third standing on 4 damage, so this
 * fixture holds a ruin and a hurt survivor at once."* There is no hurt survivor now, on any
 * board at any accuracy — see `hard-winter.test.ts`'s *"a building is sound or it is a ruin"* —
 * so this fixture holds ruins and unmarked survivors and nothing in between.
 */
function badlyPlayedWinter(): HardWinterState {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: [
      { node_id: "NUM.S", col: 0, row: 0 },
      { node_id: "NUM.F", col: 2, row: -2 },
      { node_id: "NUM.2", col: -2, row: 1 },
    ],
  });
  while (winter.phase !== "ended") {
    winter = playRound(winter, { kind: "fire", col: 0, row: 1 }, 1);
  }
  return winter;
}

function rowsOf(winter: HardWinterState) {
  return hardWinterView(winter, { fire_preview: null }).rows;
}

function count(
  rows: readonly (readonly { readonly land: boolean }[])[],
  predicate: (cell: never) => boolean,
): number {
  let total = 0;
  for (const line of rows) {
    for (const cell of line) {
      if (predicate(cell as never)) {
        total += 1;
      }
    }
  }
  return total;
}

describe("the winter's end reverts the atmosphere and keeps the damage", () => {
  it("reproduces the defect: a finished winter's own state is still frozen", () => {
    const winter = finishedWinter();
    expect(winter.phase).toBe("ended");
    expect(winter.outcome).not.toBeNull();

    const rows = rowsOf(winter);
    // THE DEFECT. Frost is still on the board after the crisis is over, which is why the
    // island had no visible ending — and it is the engine's honest state rather than a bug in
    // it, because the frost is what the outcome is computed from.
    expect(count(rows, (cell: { frozen: boolean }) => cell.frozen)).toBeGreaterThan(20);
    // And the durable half is there too, so the fixture really does exercise both. **IT IS A
    // BUILDING RATHER THAN GROUND SINCE 2026-08-02**: this counted abandoned cells, and no winter
    // can scar ground any more, so what survives the thaw is the settlement's own state.
    expect(
      count(rows, (cell: { building: unknown }) => cell.building !== null),
    ).toBeGreaterThan(0);
  });

  it("thaws every transient state and leaves every durable one", () => {
    const rows = rowsOf(finishedWinter());
    const thawed = thawWinterRows(rows);

    // FLOORS FIRST, because "no cell is frozen" holds trivially over a board with no cells,
    // and every assertion below is of that shape.
    const land = count(rows, (cell: { land: boolean }) => cell.land);
    expect(land).toBeGreaterThanOrEqual(80);
    expect(count(thawed, (cell: { land: boolean }) => cell.land)).toBe(land);

    // REVERTS: the weather.
    expect(count(thawed, (cell: { frozen: boolean }) => cell.frozen)).toBe(0);
    expect(count(thawed, (cell: { frost_line: boolean }) => cell.frost_line)).toBe(0);
    expect(count(thawed, (cell: { warded: boolean }) => cell.warded)).toBe(0);
    expect(
      count(thawed, (cell: { preview_tier: unknown }) => cell.preview_tier !== null),
    ).toBe(0);
    // A FOURTH TRANSIENT STATE WAS SWEPT HERE, `preview_abandon`, and it went with the
    // give-up-ground action on 2026-08-02 along with the `abandoned` ground state below it. The
    // partition test at the foot of this file is what keeps that honest: the fields are read off
    // the view model rather than written down here, so a field that leaves has to leave both.

    // PERSISTS: the damage, and it is now BUILDINGS alone. This measured ground given up, which
    // did not come back in spring and cost material to reclaim; there is no such ground.
    // Every building on the board survives the thaw, ruined or standing: a ruin is a state on
    // something that is still there, never a removal.
    const built = count(rows, (cell: { building: unknown }) => cell.building !== null);
    expect(built).toBe(3);
    expect(count(thawed, (cell: { building: unknown }) => cell.building !== null)).toBe(
      built,
    );

    // HOW HURT a building is survives the thaw too, and it is the field this fixture actually
    // carries. Frost climbing a building is drawn in the weather's vocabulary but it is
    // DAMAGE: `damage_stage` is `winterDamageStage`'s reading of `building.damage`, which is
    // what `winterMendCost` later bills material against, so clearing it here would have the
    // view disagree with the state the player is charged for.
    const hurt = count(rows, (cell: { damage_stage: number }) => cell.damage_stage > 0);
    expect(hurt).toBeGreaterThan(0);
    expect(count(thawed, (cell: { damage_stage: number }) => cell.damage_stage > 0)).toBe(
      hurt,
    );

    // A RUIN survives it as well, measured on a winter that produced one. Playing at full
    // marks no longer does: see `badlyPlayedWinter`.
    const badRows = rowsOf(badlyPlayedWinter());
    const ruins = count(
      badRows,
      (cell: { building: { state: string } | null }) => cell.building?.state === "ruin",
    );
    expect(ruins).toBeGreaterThan(0);
    expect(
      count(
        thawWinterRows(badRows),
        (cell: { building: { state: string } | null }) => cell.building?.state === "ruin",
      ),
    ).toBe(ruins);
  });

  /**
   * **THE SEAM HANDS OVER NOTHING, AND THAT IS THE ASSERTION NOW.**
   *
   * This read *"hands the ground the settlement gave up to the city's own scar layer"*, and it
   * measured one `"col,row"` key per abandoned land cell against the count on the board. The
   * give-up-ground action was ruled out on 2026-08-02, so no winter can scar ground and the seam
   * carries nothing from any board the engine can produce.
   *
   * **The seam is KEPT rather than deleted**, and so is this test, because the scarred-ground
   * layer, the `CrisisDamage.ruined_cells` column and the city's reclaim price are all still live
   * and still crisis-generic: a city can be carrying scars saved before the ruling, and the next
   * crisis that scars ground reports through this shape. What is asserted is that the winter
   * INVENTS none — which was always half of this test — over boards that were and were not
   * played, so a `thawedScarCells` that started guessing fails here.
   */
  it("hands no scarred ground to the city, because no winter can produce any", () => {
    const rows = rowsOf(finishedWinter());
    expect(thawedScarCells(rows)).toEqual([]);
    // A floor on the fixture, so the emptiness is a measurement over a real winter rather than
    // over an island nothing happened to: the frost took ground and a building went with it.
    expect(count(rows, (cell: { frozen: boolean }) => cell.frozen)).toBeGreaterThan(20);
    expect(thawedScarCells(rowsOf(badlyPlayedWinter()))).toEqual([]);

    // AND THE KEY FORMAT SURVIVES AS A CLAIM ABOUT THE SEAM, checked on the shape rather than on
    // an instance: whatever this hands over is a list of strings, so a caller that started
    // receiving cell objects would fail here rather than at the city's parser.
    for (const key of thawedScarCells(rows)) {
      expect(key, key).toMatch(/^-?\d+,-?\d+$/);
    }

    // The thaw does not invent scars: an untouched island reverts to exactly itself.
    let clean = createHardWinter({
      era: CURRENT_ERA_ID,
      buildings: [{ node_id: "NUM.S", col: 0, row: 0 }],
    });
    while (clean.phase !== "ended") {
      clean = playRound(clean, { kind: "fire", col: 0, row: 0 });
    }
    const cleanRows = rowsOf(clean);
    expect(thawedScarCells(cleanRows)).toEqual([]);
    expect(count(cleanRows, (cell: { frozen: boolean }) => cell.frozen)).toBeGreaterThan(0);
  });

  /**
   * **A NEW WINTER STATE HAS TO BE CLASSIFIED, AND THIS IS WHERE IT FAILS UNTIL IT IS.**
   *
   * The thaw's whole correctness is a line drawn through the cell view's fields: some mean
   * *the crisis is happening* and come off, some mean *this ground is damaged* and stay, and
   * some are the cell's identity. A guard that only checked the fields that exist today would
   * go on passing while a newly-added state — a snow course, a wetted surface, anything the
   * scene-asset work lands next — stayed on the island forever after the winter ended, which
   * is exactly the defect this file exists for wearing a new field's name.
   *
   * So the population is the view model's OWN key set, read off a real projected cell, and
   * the three lists are asserted to PARTITION it. A field added to `WinterCellView` fails here
   * with nothing to do but decide which side of the line it is on.
   */
  it("partitions every field of the cell view, so a new state cannot go unclassified", () => {
    const rows = rowsOf(finishedWinter());
    const sample = rows.flat().find((cell) => cell.land);
    expect(sample).toBeDefined();

    /** The crisis happening. Cleared by the thaw. */
    // `preview_abandon` was a seventh entry until 2026-08-02 and went with the give-up-ground
    // action, as did `abandoned` from DURABLE below. The partition is what caught both: the key
    // set is read off a real projected cell, so a field that leaves the view model has to leave
    // exactly one of these lists.
    const TRANSIENT = ["frozen", "frost_line", "frost_next", "warded", "preview_tier"];
    /**
     * Damage and its owner. Kept by the thaw, and paid for later in material.
     *
     * `damage_stage` is here rather than in TRANSIENT despite being DRAWN as frost climbing a
     * building: it is `winterDamageStage`'s reading of `building.damage`, the number
     * `winterMendCost` charges to repair, so it is the same fact as the building it belongs to
     * and has to be kept for the same reason. Melting it while leaving `building.damage`
     * standing would put the view a repair-bill out of step with the state.
     */
    const DURABLE = ["building", "damage_stage"];
    /** The cell itself: where it is, whether it is land, and how far from the shore. */
    const IDENTITY = ["col", "row", "land", "rim_depth"];

    const classified = [...TRANSIENT, ...DURABLE, ...IDENTITY].sort();
    expect(new Set(classified).size, "a field is classified twice").toBe(classified.length);
    expect(
      Object.keys(sample as object).sort(),
      "every WinterCellView field must be classified as transient, durable or identity",
    ).toEqual(classified);

    // And the classification is what the thaw actually does, field by field, rather than a
    // list somebody wrote next to it: read both cells and compare.
    const thawedSample = thawWinterRows(rows)
      .flat()
      .find((cell) => cell.col === sample?.col && cell.row === sample?.row);
    expect(thawedSample).toBeDefined();
    const before = sample as unknown as Record<string, unknown>;
    const after = thawedSample as unknown as Record<string, unknown>;
    for (const field of [...DURABLE, ...IDENTITY]) {
      expect(after[field], field).toEqual(before[field]);
    }
    for (const field of TRANSIENT) {
      expect(after[field], field).toEqual(field === "preview_tier" ? null : false);
    }
  });

  it("returns already-thawed rows by identity, so nothing rebuilds twice", () => {
    const rows = rowsOf(finishedWinter());
    const once = thawWinterRows(rows);

    // It really did work the first time...
    expect(once).not.toBe(rows);
    // ...and a second pass finds nothing to change and hands back the SAME array, which is
    // what keeps the memo behind this from rebuilding the whole island on a re-render.
    expect(thawWinterRows(once)).toBe(once);

    // WHEN it runs is the caller's decision and not this function's: `WinterInCity` thaws only
    // on `phase === "ended"`, driven by the state change the player's own last action caused.
    // `winterRevert.test.tsx` is the guard on that half, over the published board.
  });
});
