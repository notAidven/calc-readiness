import { HARD_WINTER, type HardWinterOutcome, type HardWinterState } from "@cr/game";
import type { ReactElement } from "react";
import { placementLabel } from "../city/townHall";
import { materialWord } from "../economy/materialWord";
import { SCAR_REFUSAL_MESSAGE, type ScarResult } from "./scarLiveCity";
import { CityReturnChip } from "./WinterEntryChip";

/**
 * **THE END OF THE CRISIS, AS AN EVENT — a standalone card that says how it went.**
 *
 * The team lead: *"the final screen should be different: it should be its standalone popup that
 * says 'crisis complete!' along with the damage list. theres' too much like bookeeping on '88
 * tiles ___' it needs to just be a simple report on building status and overall accuracy. in
 * general, all of these crises need to have like concluding screens so that its not just
 * anticlimatic"*.
 *
 * The general rule is **D-CRISIS-30**, and it is in the design spec rather than only here
 * because nine more crises owe a concluding screen and none of them owes THIS one: D-CRISIS-19
 * makes *how consequences resolve* part of what differentiates the ten, so one shared card
 * across all of them would be that ruling's own failure. `§6b` of
 * `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md` is era one's instance and
 * carries the design direction; `§5.32` of the crisis design spec carries the contract.
 *
 * ## THE ONE CONSTRAINT THAT BREAKS THE NAIVE VERSION: the screen cannot be a victory card
 *
 * **D-CRISIS-26 rules that a crisis may end UNSOLVED with the damage standing**, and era one
 * can end with every building in ruins. A fixed
 * *"crisis complete!"* over that outcome is not merely tonally wrong; it is the game failing to
 * notice what happened to the player.
 *
 * So the screen has **two separate elements where the naive version has one**. The eyebrow is
 * the EVENT — the crisis is over, which is the lead's *"crisis complete"* doing its actual job
 * of punctuating the encounter — and it is the same in every outcome. The headline is the
 * VERDICT, and it is derived from the outcome by {@link winterVerdict}, so the sentence at the
 * top of the card is different at the two ends of the range rather than the same sentence over
 * a different list. His exclamation mark is deliberately not carried: it is the one piece of the
 * request that cannot survive the bottom of the range, and the register it sets is what makes
 * the rest of the screen read as a reward rather than a report.
 *
 * **This is also what keeps O-19 open.** That row asks whether an unsolved ending is a losing
 * outcome or an ending with consequences, and it is the lead's to answer. A derived verdict is
 * compatible with both: the soft reading is what this ladder already delivers, and the hard
 * reading adds one string at the bottom of it. A fixed headline would have had nowhere to put
 * either.
 *
 * ## Why the roll is tiles and not a list
 *
 * *"The difference between those should be legible at a glance rather than inferred from a
 * list"*, which a list of six sentences cannot do — comparing six rows to find out how it went
 * is the bookkeeping again in a new shape. One tile per building, each carrying a mark, a word
 * AND a tone, answers it by how many tiles carry a cross. Three channels rather than two,
 * because INV-CRISIS-16 requires two and the mark is what makes the glance work at all.
 *
 * **The tones are the ISLAND's own, taken and not invented.** A ruin is `--hw-ruin`, a scar is
 * the frost's blue, unmarked is the clear-ground green. That is what makes this card a
 * commentary on the picture behind it: `thaw.ts` has just reverted the island and left the ruins
 * standing on it, so the card and the island are reporting the same thing in the same colours.
 * No hue is new here. (A fourth tone, the abandoned grey, went with the give-up-ground action on
 * 2026-08-02 along with the ground line it captioned.)
 *
 * ## What is NOT on it, each for the same reason
 *
 * The frozen-cell tally (weather, and the panel used to spend a paragraph on a number it then
 * told the player to ignore), the held-cell count, the three-way recovery breakdown, the
 * net-material balance, and the economy seam's idempotency key. Every one of them reports that
 * the simulation is working rather than telling the player something they can act on.
 *
 * ## AND IT MAKES NO EARNINGS CLAIM, which is a different reason from that list
 *
 * The bill used to end *"You earned N XP, N gold and N material"*, off `hardWinterPayoutFor`.
 * None of it was ever credited: there is no winter reason code, no grant recipe and no ledger
 * row for a winter anywhere in `packages/economy`, so the screen promised three currencies and
 * wrote none. It also named GOLD, which the economy rework retired as a currency in favour of
 * per-era materials.
 *
 * It is CUT rather than repaired, and the ruling is the lead's. The Hard Winter is a cost event
 * and not an income one: resources come from lesson completion and practice with no passive
 * generation, and the scarcity of the economy is deliberate, so a crisis payout would be a third
 * income source nobody ruled for on an encounter that otherwise COSTS material to repair. What
 * the card reports instead is what it always reported honestly — what survived, what is scarred,
 * and what the repairs will cost.
 *
 * The engine keeps `hardWinterPayoutFor` and its tests: it is the designed economy seam, and its
 * own docblock records that this surface deliberately neither displays nor credits it.
 * `winterConclusion.test.ts` holds the positive assertion that keeps the claim off all five
 * endings.
 */

/** How the winter went, in one word for the layout and one sentence for the player. */
export type WinterGrade = "untouched" | "held" | "bought" | "mauled" | "lost";

export interface WinterVerdict {
  readonly grade: WinterGrade;
  readonly headline: string;
}

/**
 * THE VERDICT, derived worst-first so a compound outcome is named by its worst part.
 *
 * Ordered rather than scored, because the ladder's rungs are not commensurable: a building lost
 * is not some number of scars. Worst-first also makes the ordering the whole specification — a
 * settlement that lost a building AND carries a scar is reported as having lost a building, which
 * is the thing the player would say happened.
 *
 * ## TWO OF THE FIVE RUNGS ARE UNREACHABLE AT THE 2026-08-02 TUNING, AND THEY STAY
 *
 * `bought` sat between `held` and `mauled`: every building came through, and it was paid for with
 * ground that does not come back in spring, so it was not the clean outcome either. **That rung
 * has no route to it any more** — the give-up-ground action was ruled out, so no winter can end
 * with ground given up. `held` has none either, because `HARD_WINTER.damage.ruin_at` is 1 and no
 * standing building can carry a scar.
 *
 * Both are kept, and the ladder is not re-derived, because this function is the SPECIFICATION of
 * how an outcome is named rather than a switch over the outcomes one tuning happens to produce.
 * A `ruin_at` with room in it restores `held` in one edit, and `bought` is reachable by any caller
 * that has a scarred-ground count to hand — which is why `scarredCells` is a PARAMETER rather
 * than a field read off an outcome that can no longer carry one. `winterConclusion.test.ts`
 * reaches both rungs, so neither is asserted only through a play the engine can no longer perform.
 *
 * @param scarredCells Ground the run scarred for good. Always 0 from a Hard Winter at the shipped
 *   tuning; the parameter exists so the rung has a caller when a crisis scars ground again.
 */
export function winterVerdict(outcome: HardWinterOutcome, scarredCells = 0): WinterVerdict {
  const { survived, total, ruined, damaged } = outcome;

  if (survived === 0) {
    return {
      grade: "lost",
      headline: "Nothing came through the winter.",
    };
  }
  if (ruined.length > 0) {
    return {
      grade: "mauled",
      headline: `The winter took ${countWord(ruined.length)} of your ${countWord(total)} buildings.`,
    };
  }
  if (scarredCells > 0) {
    return {
      grade: "bought",
      headline:
        "Every building came through, and the settlement gave up ground to hold them.",
    };
  }
  if (damaged.length > 0) {
    return {
      grade: "held",
      headline: `The settlement held. ${capitalise(countWord(damaged.length))} of your buildings ${damaged.length === 1 ? "carries a scar" : "carry scars"}.`,
    };
  }
  return {
    grade: "untouched",
    headline: "The settlement came through the winter untouched.",
  };
}

/**
 * Small counts as words, because *"The winter took 2 of your 6 buildings"* reads like a
 * spreadsheet and this line is the one sentence on the card that has to land.
 */
function countWord(n: number): string {
  const words = [
    "no",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];
  return words[n] ?? String(n);
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * HOW WELL THEY ANSWERED, over the whole encounter — the half of the lead's *"building status
 * and overall accuracy"* that the panel this replaces never mentioned at all.
 *
 * Folded off the round log rather than added to `HardWinterOutcome`, because the outcome is the
 * engine's contract and this is a presentation figure: no mechanic reads it, and the crisis
 * writes no mastery (INV-CRISIS-7). Guarded against an empty denominator, which a winter with a
 * round that could not be served would produce.
 */
export function winterAccuracy(state: HardWinterState): {
  readonly correct: number;
  readonly asked: number;
  readonly percent: number | null;
} {
  let correct = 0;
  let asked = 0;
  for (const entry of state.log) {
    correct += entry.resolution.correct;
    asked += entry.resolution.asked;
  }
  return {
    correct,
    asked,
    percent: asked === 0 ? null : Math.round((correct / asked) * 100),
  };
}

/**
 * One building's state, as the tile says it: a mark, a word, and a tone key.
 *
 * THREE MARKS AND THEY ARE SHAPES: a tick, a triangle and a cross. The tick and the cross are the
 * surface's own, from the question verdict; the triangle is the one addition and it is the middle
 * rung. Read down the roll, the marks ALONE answer *how did it go* — which is what a tone cannot
 * do on its own (INV-CRISIS-16) and what six sentences cannot do at all.
 *
 * The words are short on purpose. Each tile is one line inside one column of a two-column card on
 * a 580px-tall window, so *"lost to the cold"* was buying a wrap where *"in ruins"* says the same
 * thing.
 *
 * **THE "given up" WORD HAS GONE WITH ITS CAUSE.** A ruin used to be captioned by
 * `ruined_by`, because the difference between a building the frost took and one the settlement
 * gave up was the price of an action the player chose. There is only one cause of a ruin now
 * (see `WinterBuilding.ruined_by`), so there is one caption.
 */
function tileFor(building: HardWinterState["buildings"][number]): {
  readonly state: string;
  readonly mark: string;
  readonly word: string;
} {
  if (building.state === "ruin") {
    return {
      state: "ruin",
      mark: "\u2715",
      word: "in ruins",
    };
  }
  if (building.damage > 0) {
    return {
      state: "scarred",
      mark: "\u25B2",
      // `3/6` rather than `3 of 6`: the tile is one line inside one column of a two-column card,
      // and the longer form put the widest building name onto a second line on its own.
      word: `scarred ${building.damage}/${HARD_WINTER.damage.ruin_at}`,
    };
  }
  return { state: "whole", mark: "\u2713", word: "unmarked" };
}

export interface WinterConclusionProps {
  readonly winter: HardWinterState;
  /**
   * Which encounter this was. Accepted and not read: it keyed the payout's event id, and the
   * card computes no payout. Kept on the props rather than dropped because removing it is an
   * edit to `HardWinterSurface.tsx`, which had a live worker in it when the claim was cut.
   */
  readonly encounter: number;
  readonly onRestart: () => void;
  /** True when the winter fell on the player's own city rather than an authored board. */
  readonly isLiveBoard: boolean;
  readonly scar: ScarResult | null;
  readonly onCarryBack: () => void;
  /**
   * **ONE MILESTONE LINE, OR NULL — and this card may never be handed more than one.**
   *
   * Decided by the CITY (`city/milestones.ts`) and handed down, because whether this is the
   * player's first crisis is a fact about their island and not about this encounter. The
   * `?winter` route passes nothing, which is right: an authored board is not anybody's city.
   *
   * It is a `string | null` rather than a list on purpose. A list here would be an aggregate
   * view, and an aggregate view is a set with a size, which is the parallel point system
   * BUILD 2 forbids. `city/milestones.test.ts` is the guard on that and this prop's type is
   * the first half of it.
   */
  readonly milestone?: string | null;
}

export function WinterConclusion({
  winter,
  onRestart,
  isLiveBoard,
  scar,
  onCarryBack,
  milestone = null,
}: WinterConclusionProps): ReactElement | null {
  const outcome = winter.outcome;
  if (!outcome) {
    return null;
  }

  const verdict = winterVerdict(outcome);
  const accuracy = winterAccuracy(winter);
  const carryable = outcome.ruined.length > 0;

  return (
    /*
      `role="dialog"` and not `alertdialog`: it interrupts nothing, and there is no urgent
      choice on it. It is labelled by the verdict rather than by the eyebrow, because the
      verdict is what a screen-reader user needs first and the eyebrow says the same thing in
      every outcome.
    */
    <section
      className="hw-conclusion"
      data-testid="hw-conclusion"
      data-verdict={verdict.grade}
      role="dialog"
      aria-modal="false"
      aria-labelledby="hw-conclusion-title"
    >
      <p className="hw-conclusion__eyebrow">The crisis is over</p>
      <h2 id="hw-conclusion-title" className="hw-conclusion__verdict">
        {verdict.headline}
      </h2>

      {/*
        TWO COLUMNS, AND IT IS A MEASUREMENT RATHER THAN A PREFERENCE.

        Stacked, this card came to 325px for a clean winter and 466px for a ruinous one against a
        290px box at 1024x580, so its own "New winter" control sat 44px below its own fold at best
        and 176px at worst. A concluding screen has no next action to scroll toward, so nothing on
        it may be below its fold, and the card spends the width it has instead: the roll on one
        side, the report on the other. That is the same trade `winter-in-city.css` makes for the
        declaring band and for the same reason, since height is the scarce thing on this window and
        the strip of island beside a bottom-anchored card is the part nobody is looking at.
      */}
      <div className="hw-conclusion__body">
        <div>
          {/* THE DAMAGE LIST AND THE GLANCE-READ, as one element. Ordered as the buildings were
              authored rather than worst-first: the roll is a picture of the settlement, and
              re-sorting it every winter would stop a player recognising their own city in it. */}
          <ul
            className="hw-roll-tiles"
            aria-label="Every building, and how it came through"
          >
            {winter.buildings.map((building) => {
              const tile = tileFor(building);
              return (
                <li key={building.node_id} data-state={tile.state}>
                  <span className="hw-roll-tiles__mark" aria-hidden="true">
                    {tile.mark}
                  </span>
                  <span className="hw-roll-tiles__name">
                    {placementLabel(building.node_id)}
                  </span>
                  <span className="hw-roll-tiles__word">{tile.word}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          {/*
            THE MILESTONE, AND IT IS NOT THE HEADLINE. That slot belongs to the derived
            verdict, and a fixed celebratory sentence up there over "Nothing came through
            the winter" is precisely the failure this file's head is about. It sits at the
            top of the REPORT column instead — the column about the player rather than
            about the settlement — where it costs the card no height in the ruinous
            outcome, which is the one with no height to spare at 1024x580.
          */}
          {milestone !== null && (
            <p className="hw-conclusion__milestone" data-testid="hw-conclusion-milestone">
              {milestone}
            </p>
          )}
          <p className="hw-conclusion__accuracy">
            You answered <strong>{accuracy.correct}</strong> of {accuracy.asked} right
            {accuracy.percent === null ? "" : `, ${accuracy.percent}%`} across the winter.
          </p>

          {/* THE ONE BILL, AND IT IS THE ONLY FIGURE ON THIS SIDE OF THE CARD. The three-way
              breakdown it replaces was the recovery cost said four times over; every tile beside
              it already carries its own building's state, and the total is the only figure a
              player decides anything with. An earnings sentence used to follow it and is gone
              for good: see the head of this file for why a crisis pays nothing. */}
          <p className="hw-conclusion__bill">
            {outcome.recovery_cost === 0 ? (
              <>There is nothing to put right.</>
            ) : (
              <>
                Putting the settlement back costs{" "}
                <strong>
                  {outcome.recovery_cost} {materialWord(outcome.era)}
                </strong>
                .
              </>
            )}
          </p>

          {/*
            WHAT CARRYING IT BACK WOULD DO, and it is also where the sandbox notice's one
            load-bearing fact now lives: that nothing here has reached the real island. Said at the
            moment of asking rather than as a standing disclaimer four scrolls up the declaring
            band, which is where a player can act on it. Offered only over the live board and only
            when there is damage to carry; a flawless winter has nothing to record and is not
            asked.
          */}
          {isLiveBoard && carryable && (
            <div className="hw-carry">
              <p className="hw-carry__note">
                Your real island is still untouched. Carrying this back marks{" "}
                <strong>
                  {outcome.ruined.length} building
                  {outcome.ruined.length === 1 ? "" : "s"}
                </strong>{" "}
                as ruins there, to repair on the island.
              </p>
              {scar !== null && (
                <p
                  className={scar.status === "recorded" ? "hw-carry__done" : "hw-refusal"}
                  role="status"
                >
                  {scar.status === "recorded"
                    ? `Marked on your city: ${scar.buildings} building${scar.buildings === 1 ? "" : "s"} in ruins and ${scar.cells} cell${scar.cells === 1 ? "" : "s"} of scarred ground. Go back to the island to repair them.`
                    : SCAR_REFUSAL_MESSAGE[scar.reason]}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EVERY WAY OUT ON ONE ROW, which is the last of the height this card had to find. The
          carry-back joins them rather than sitting inside its own box: it is one of the things a
          player may do next, and the note above is what explains it. */}
      <div className="hw-conclusion__go">
        {isLiveBoard && carryable && (
          <button
            type="button"
            className="hw-chip hw-chip--carry"
            onClick={onCarryBack}
            disabled={scar?.status === "recorded"}
          >
            Carry this damage back to my city
          </button>
        )}
        {/* The way back to the island, beside the replay rather than only after a carry-back: the
            crisis is over, so leaving is the ordinary thing to do now rather than an exit without
            deciding. Hidden in-city, where a better one is already drawn over the island. */}
        <CityReturnChip />
        <button type="button" className="primary-action" onClick={onRestart}>
          New winter
        </button>
      </div>
    </section>
  );
}
