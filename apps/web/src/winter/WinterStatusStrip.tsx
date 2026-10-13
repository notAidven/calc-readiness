import {
  type HardWinterState,
  hardWinterView,
  type WinterFire,
  winterDamageBite,
  winterFireIsBurning,
} from "@cr/game";
import type { ReactElement, ReactNode } from "react";
import { placementLabel } from "../city/townHall";
import { materialWord } from "../economy/materialWord";

/**
 * **THE SETTLEMENT, AND THE ISLAND'S KEY, ON ONE ROW.**
 *
 * The team lead, with a screenshot of the bottom of the crisis panel bleeding off the foot of
 * his window: *"same thing with this stuff - its just taking up extra space on the bottom and
 * bleeding over. move it to be on the same line as the settlement description (you can keep the
 * key with the indicators on what colros matches up to what), just make the on the same line so
 * we dont tkae up more unnecessary vertical space"*.
 *
 * ## HIS WINDOW IS ABOUT 1024x580, AND THAT IS THE WHOLE ARGUMENT FOR THIS FILE
 *
 * Vertical space is the scarcest thing on this surface, and a stacked block costs the reviewer
 * proportionally far more than it cost whoever wrote it on a tall monitor. What this replaced
 * was a bordered `.hw-panel` with a heading, up to four paragraphs and a bulleted fire list,
 * with a four-row legend stacked underneath it: nine rows for a settlement that had lost
 * nothing. The strip is one row, and it takes a second only when there is something on it
 * that a player has to act on.
 *
 * ## #328 got here first, and its ruling is carried rather than re-derived
 *
 * #328 reworked the panel this
 * replaces to *"one line while nothing is wrong, and a line per thing that is"*, on the reasoning
 * that three of its four paragraphs were negations — *"· none damaged"*, *"· none given up"* and
 * *"Nothing falls at the end of this round."* — so a player reading a panel of nothing-is-wrong had
 * to read all of it to find that out, which is the most text for the least news.
 *
 * **That is exactly right and it is the rule this file follows**: scars, ruins, given-up ground and
 * the at-risk warning each appear only once they exist. Nothing a player could act on is hidden,
 * and every bill they used to read here they still read the moment there is one, in the same words
 * and to the same digit. The lead's later instruction is what a strip adds on top of it: fewer
 * lines is a prerequisite for ONE line, and one line is what he asked for.
 *
 * ## What came out, and it is not the key
 *
 * **The key stays, in full, because it is load-bearing** — four ground states carry meaning the
 * player acts on, and the frost line is the one they read to predict the next round's damage. It
 * is laid out ACROSS rather than dropped.
 *
 * What came out is the CELL ARITHMETIC. *"Holding 88 of 88 cells"* is the model's own
 * bookkeeping: a player has a relationship with their buildings and with how well they answered,
 * and none at all with a cell count, which is the general rule D-CRISIS-30's second clause makes
 * for all ten crises. The frost's own share thaws and was never billed, so it was a running
 * total of something the surface then told the player to ignore.
 *
 * **THE GIVEN-UP-GROUND ROW HAS GONE WITH ITS ACTION**, and that is a removal rather than a
 * trim. It read *"ground given up (N stone to reclaim)"* and it stayed when the cell arithmetic
 * went, because it was damage rather than weather: it did not come back in spring and reclaiming
 * it was a bill the player chose to take on. The lead ruled the pull-back out entirely on
 * 2026-08-02 (*"the give up ground option is incredibly confusing"*), so there is no such bill
 * and `HardWinterView` no longer reports one. The remaining rows are the settlement's own state.
 *
 * **THE SCARRED ROW HAS GONE TOO, and for a different reason: `HARD_WINTER.damage.ruin_at` is 1,
 * so no standing building can carry damage.** It is not deleted from the code — it is still
 * conditional on `view.damaged`, which is now always empty — because a `ruin_at` with room in it
 * puts it straight back.
 *
 * ## What is first on the strip, and why it is not the counts
 *
 * `at_risk` leads whenever it is non-empty. It is the single most decision-relevant sentence on
 * the whole surface — it names the building that becomes a ruin at the end of this round if
 * nothing is declared for it — and it used to sit fourth, under three lines of negations.
 */

export interface WinterStatusStripProps {
  readonly winter: HardWinterState;
  /**
   * THE ISLAND'S OWN KEY, handed in rather than built here, because the two boards this surface
   * can draw wear different colours: the 2D grid's swatches are CSS and the island's are the
   * three.js ground tones. Whoever draws the board owns what its key says, exactly as
   * `renderBoard` owns the board.
   *
   * Omitted on the `?winter` route, which keeps its own fuller key under the grid, where a page
   * has the room for one.
   */
  readonly renderKey?: () => ReactNode;
}

export function WinterStatusStrip({
  winter,
  renderKey,
}: WinterStatusStripProps): ReactElement {
  const view = hardWinterView(winter);
  const scarred = view.damaged.length;
  // Read ONCE and handed to both read-outs below, so the row's condition and the sentences in it
  // cannot disagree about which fires count.
  const burning = winter.fires.filter(winterFireIsBurning);

  return (
    <section
      className="hw-strip"
      data-testid="hw-status-strip"
      aria-label="The settlement, and the island's key"
    >
      {/*
        WHAT FALLS THIS ROUND, FIRST AND ON ITS OWN ROW. The one line here that is a warning
        rather than a count, so it is allowed the row; and it appears only when there is
        something to warn about, which is what keeps the strip one row in the ordinary case.
      */}
      {view.at_risk.length > 0 && (
        <p className="hw-strip__risk">
          <span aria-hidden="true">{"\u25B2"}</span> This round&apos;s{" "}
          {winterDamageBite(winter.round)}-point bite finishes{" "}
          {view.at_risk.map(placementLabel).join(", ")}.
        </p>
      )}

      <ul className="hw-strip__counts" aria-label="The settlement">
        <li>
          <strong>{view.standing}</strong> standing
        </li>
        {/* Scars and ruins appear only once they exist. A settlement that has lost nothing
            should not have to be read to find that out, and "0 in ruins" is the most text for
            the least news. */}
        {scarred > 0 && (
          <li data-state="scarred">
            <strong>{scarred} scarred</strong> ({view.mend_cost} {materialWord(winter.era)}{" "}
            to mend)
          </li>
        )}
        {view.ruined > 0 && (
          <li data-state="ruin">
            <strong>{view.ruined} in ruins</strong>
          </li>
        )}
        {/* A FIRE'S REMAINING LIFE, and nothing else about it. The fire and the ground it holds
            are drawn on the island; its coordinates and its cell count were the same facts in
            the model's units. How long it has left is the one thing the board does not say, and
            it decides whether that ground is about to freeze again.

            GATED ON A FIRE THAT IS ACTUALLY BURNING, not on the list being non-empty, and that
            is what a spent hearth staying on the board costs this row. `fires.length > 0` was a
            fair reading of "something is holding" while the engine deleted a fire the round its
            fuel ran out; it is not now — a settlement that lit one fire in round one would carry
            this row for the rest of the winter to report that nothing is holding, which is the
            most text for the least news and exactly what the rest of this strip is built to
            avoid. */}
        {burning.length > 0 && (
          <li data-state="fire">
            {burningFires(burning)} · {roundsLeft(burning)}
          </li>
        )}
      </ul>

      {renderKey && <div className="hw-strip__key">{renderKey()}</div>}
    </section>
  );
}

/**
 * How many fires are actually holding ground, since one that never caught and one that has burnt
 * out both hold none.
 *
 * The two conditions are `winterFireIsBurning`'s rather than written out here, which is the point
 * of the predicate: this file held its own copy of them in two functions, and a copy that
 * forgot the `rounds_left` half would report a spent hearth as a fire that was still burning.
 */
function burningFires(burning: readonly WinterFire[]): string {
  return `${burning.length} fire${burning.length === 1 ? "" : "s"} burning`;
}

/** The soonest a fire goes out, which is when that ground starts freezing again. */
function roundsLeft(burning: readonly WinterFire[]): string {
  const soonest = Math.min(...burning.map((fire) => fire.rounds_left));
  return `${soonest} round${soonest === 1 ? "" : "s"} left`;
}
