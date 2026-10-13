import type { WinterCellView } from "@cr/game";

/**
 * **THE END OF THE CRISIS, AS A CHANGE ON SCREEN — the atmosphere reverts, the damage stays.**
 *
 * The team lead: *"ensure that after the era 1 crisis is finished, the non-damaged tiles /
 * general environment revert to how they were before to signify the crisis being over."*
 *
 * ## The defect, measured rather than described
 *
 * `hardWinterReducer`'s `end_round` on the last round sets `phase: "ended"` and computes the
 * outcome, and it does **not** clear `state.frozen`. `hardWinterView` projects that state
 * faithfully, so every frozen cell is still `frozen: true` after the winter is over — and the
 * in-city mount keeps publishing those rows to the city's canvas for as long as the outcome
 * panel is up. The island therefore stays wintered after the crisis ends, which is why the
 * crisis has no visible ending: the player finishes and nothing on screen says so.
 *
 * The state is right and the picture is wrong, which is what makes this a rendering fix. The
 * outcome panel's own copy already says the frost thaws — *"the frost took N of M cells and
 * gives them back in spring"* — and bills only the ground that was given up.
 *
 * ## The line: what reverts and what persists
 *
 * **Reverts, because it is weather:** frost, the frost line, the ground the frost was about to
 * take, the ground a fire was holding, the two provisional previews, and the fires themselves.
 * All of it is the crisis happening, and none of it survives the crisis.
 *
 * `frost_next` is the clearest case in the list: it is a claim about a round that is over, so an
 * island still wearing it would be threatening ground with a frost that has already thawed.
 * (The engine also stops projecting it once the phase is `ended`, so this is the second of two
 * independent reasons the front comes off — deliberately, because the thaw runs over ROWS and
 * must not depend on which phase produced them.)
 *
 * **Persists, because it is damage:** ruined buildings. Ruins are a second state on a building
 * that is still fully there, never a removal, and they are what the player later pays to repair.
 * They are not touched here.
 *
 * **SCARRED GROUND USED TO BE THE OTHER HALF OF THAT LIST, and it is gone from the winter
 * rather than from the thaw.** The give-up-ground action was ruled out on 2026-08-02, so the
 * only thing that touches this island is the frost and the frost thaws: `WinterCellView` no
 * longer carries an `abandoned` flag, and {@link thawedScarCells} now finds nothing on any board
 * the engine can produce. The reasoning that made ground durable is unchanged and is recorded on
 * `HARD_WINTER.reclaim_cost_per_cell`; what has no producer is the ground.
 *
 * ## Why this thaws the ROWS rather than switching a layer off
 *
 * Because the two halves of the winter's ground arrived on one prop. `CityScene` draws the
 * whole crisis layer when `winterRows` is non-null, and the scarred ground was inside those
 * rows — so publishing `null` at the end of a winter would have reverted the frost AND deleted
 * the scarred ground, which is the half the lead singled out to keep. That is no longer the
 * live reason, since there is no scarred ground in the rows; the shape stays because clearing
 * the transient flags per cell keeps one seam and one renderer, and every future piece of
 * winter atmosphere that hangs off a cell flag — a snow course, a wetted surface — reverts
 * through this function without a second decision.
 *
 * ## It is a CUT, not a thaw animation, and that is deliberate
 *
 * A fade would read better. It would also need elapsed time, and nothing in the winter's
 * surface may read a clock: `test/hardWinterClockless.test.ts` sweeps every source under
 * `apps/web/src/winter/` for `setTimeout`, `requestAnimationFrame` and four other tokens,
 * because a mechanic that advances on a wall clock is farmable by idling and untestable
 * without a fake one. The instruction was explicit that breaking that invariant is worse than
 * a hard transition, so this is a pure function of the state, the transition happens on the
 * state change the player's own last action caused, and there is no interpolation anywhere.
 */

/**
 * One era's worth of thawed ground: the same rows with every transient winter state cleared
 * and every durable one kept.
 *
 * Identity is preserved where nothing changes — a row of water cells comes back as the same
 * array — so a memo keyed on the rows does not rebuild the whole island because a winter ended
 * somewhere else on the board.
 */
export function thawWinterRows(
  rows: readonly (readonly WinterCellView[])[],
): readonly (readonly WinterCellView[])[] {
  let moved = false;
  const thawed = rows.map((line) => {
    let lineMoved = false;
    const cells = line.map((cell) => {
      if (
        !cell.frozen &&
        !cell.frost_line &&
        !cell.frost_next &&
        !cell.warded &&
        cell.preview_tier === null
      ) {
        return cell;
      }
      lineMoved = true;
      return {
        ...cell,
        frozen: false,
        frost_line: false,
        frost_next: false,
        warded: false,
        preview_tier: null,
      };
    });
    if (!lineMoved) {
      return line;
    }
    moved = true;
    return cells;
  });
  return moved ? thawed : rows;
}

/**
 * The `"col,row"` keys of ground a winter scarred, in the form the city's own scarred-ground
 * layer takes.
 *
 * ## ⚑ NO WINTER CAN SCAR GROUND SINCE 2026-08-02, SO THIS IS ALWAYS EMPTY
 *
 * It read `cell.land && cell.abandoned`, and `abandoned` was true of exactly the rings a player
 * had given up. That action was ruled out entirely (see `WinterAction` in `hard-winter.ts`), the
 * flag is gone from `WinterCellView`, and the frost is now the only thing that touches the
 * island — which thaws.
 *
 * **KEPT, and returning empty rather than deleted, because the SEAM is what it is for.** The
 * scarred-ground layer, the `CrisisDamage.ruined_cells` column and the city's reclaim price are
 * all still live and still crisis-generic: a city can be carrying scars saved by a winter played
 * before the ruling, and the next crisis that scars ground reports through this shape. Deleting
 * this would take the seam with it and leave `WinterInCity` publishing nothing at all, which is
 * indistinguishable from a scar the carry-back forgot.
 *
 * It is deliberately NOT the same thing as the city's persisted `crisis_damage.ruined_cells`:
 * that is what a carry-back wrote and survives a reload, and this is what the winter just did.
 * A player who has not pressed *carry this damage back* still sees the scars they earned for as
 * long as they are looking at the board, and still has an untouched city afterwards.
 */
export function thawedScarCells(
  rows: readonly (readonly WinterCellView[])[],
): readonly string[] {
  const cells: string[] = [];
  for (const line of rows) {
    for (const cell of line) {
      if (cell.land && winterGroundIsScarred(cell)) {
        cells.push(`${cell.col},${cell.row}`);
      }
    }
  }
  return cells;
}

/**
 * Whether this cell carries ground damage a spring thaw does not undo.
 *
 * **NOTHING DOES**, and this is the one named place that says so rather than a branch somebody
 * deleted. It read `cell.abandoned` until 2026-08-02. Keeping the question as a predicate is what
 * makes {@link thawedScarCells} a walk over a real board that finds nothing, rather than a
 * function that returns a literal and could not tell an empty board from a clean one; and it is
 * where the next durable ground state goes.
 */
function winterGroundIsScarred(_cell: WinterCellView): boolean {
  return false;
}
