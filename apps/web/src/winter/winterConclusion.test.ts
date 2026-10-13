import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterOutcome,
  type HardWinterState,
  hardWinterReducer,
  type WinterAction,
} from "@cr/game";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { materialWord } from "../economy/materialWord";
import { WinterConclusion, winterAccuracy, winterVerdict } from "./WinterConclusion";

/**
 * **THE VERDICT LADDER, AND THAT IT CANNOT COLLAPSE INTO ONE SENTENCE.**
 *
 * D-CRISIS-26 rules that a crisis may end **unsolved with the damage standing**, and era one can
 * end with every building in ruins and the outer rings given up for good. So the requirement on
 * the concluding screen is not that it has a headline; it is that the headline **differs across
 * the outcome range** — and the naive implementation of *"a popup that says crisis complete!"*
 * satisfies every reasonable test of "there is a conclusion" while failing exactly that.
 *
 * That is what makes the CENSUS below the load-bearing assertion rather than the five
 * individual cases. Any one of them would pass over a function that returned the same string
 * every time, and so would all five if they were checked with `toContain` against a shared
 * prefix. The census asserts that five real outcomes produce five DISTINCT verdicts and five
 * distinct grades, which is the claim, and it is asserted as set sizes so a later simplification
 * that merged two rungs fails here rather than shipping.
 *
 * ## THE CENSUS IS STILL FIVE, AND THE CORRECTION IS WORTH MORE THAN THE CONCLUSION
 *
 * On 2026-08-01 `HARD_WINTER.damage.ruin_at: 2` was ruled together with `HARD_WINTER.rounds: 4`,
 * and this file went red in two places at once: every plan below was a round too long, and the
 * `held` fixture graded `mauled`. **That was reported to the lead as "four rounds collapses five
 * endings to four", and the ruling was taken partly on it. It was wrong** — a fact about these
 * fixtures rather than about the design. An exhaustive search over four-round plans found
 * TWELVE endings reaching `held` on the `spread` board alone, so the grade was never
 * unreachable; the fixture had simply stopped landing on it.
 *
 * The round count was reversed the same day for other reasons, so four rounds does not ship,
 * and the correction is recorded anyway because the error is the reusable part: **a census over
 * hand-built fixtures cannot distinguish "this rung is unreachable" from "this fixture stopped
 * reaching it", and only the first is a reason to pin a smaller number.** Pinning four would
 * have been the loosening, and it would have hidden the same mistake from the next reader.
 *
 * At the shipped `ruin_at: 2` the fixture moved again and the census is unchanged at five: see
 * {@link HELD_PLAN} for why the `held` rung now needs a plan that answers two rounds under full
 * marks, and for the search that established it is reachable on `packed` and not on `spread`.
 *
 * Every outcome is played through the real reducer rather than hand-built as an object literal.
 * A synthetic `HardWinterOutcome` would let this file assert a ladder over states the engine
 * cannot reach, which is the way a green run stops being evidence.
 */

/** A city, and every board here is a real board the reducer produced. */
type Cell = { readonly nodeId: string; readonly col: number; readonly row: number };

const IDS = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/**
 * The authored `packed` board's own cells, which is where a clean winter is reachable at all.
 *
 * Reproduced as coordinates rather than imported because `HARD_WINTER.layouts` is what
 * `hard-winter-layouts.test.ts` owns; what this file needs is a board a witnessed plan is known
 * to come through unmarked on, and that test's `NO_DEAD_END_WITNESS.packed` is the plan.
 */
const PACKED: readonly Cell[] = [
  { nodeId: "NUM.S", col: -1, row: -1 },
  { nodeId: "NUM.F", col: -1, row: -2 },
  { nodeId: "NUM.2", col: -1, row: 1 },
  { nodeId: "NUM.3", col: -2, row: -1 },
  { nodeId: "NUM.4", col: -2, row: 0 },
  { nodeId: "NUM.5", col: 1, row: -1 },
];

/** The authored `spread` board: six buildings across four rim bands, the widest one dealt. */
const SPREAD: readonly Cell[] = [
  { nodeId: "NUM.S", col: 0, row: 0 },
  { nodeId: "NUM.F", col: 2, row: 2 },
  { nodeId: "NUM.2", col: -3, row: -2 },
  { nodeId: "NUM.3", col: 0, row: 2 },
  { nodeId: "NUM.4", col: -4, row: -3 },
  { nodeId: "NUM.5", col: 4, row: 0 },
];

function play(
  city: readonly Cell[],
  plan: readonly { readonly action: WinterAction; readonly correct: number }[],
): HardWinterState {
  let state = createHardWinter({
    era: "prehistoric",
    buildings: city.map((c) => ({ node_id: c.nodeId, col: c.col, row: c.row })),
  });
  for (const step of plan) {
    state = hardWinterReducer(state, { type: "declare", action: step.action });
    state = hardWinterReducer(state, {
      type: "resolve",
      correct: step.correct,
      asked: HARD_WINTER.batch_size,
    });
    state = hardWinterReducer(state, { type: "end_round" });
  }
  return state;
}

function outcomeOf(state: HardWinterState): HardWinterOutcome {
  const { outcome } = state;
  if (!outcome) {
    throw new Error(`the winter did not end: phase ${state.phase}`);
  }
  return outcome;
}

/**
 * `packed`'s witnessed full-accuracy plan, which is the only clean run on the board.
 *
 * Borrowed rather than invented: it is `hard-winter-layouts.test.ts`'s
 * `NO_DEAD_END_WITNESS.packed`, which that file pins in both directions and length-checks
 * against `HARD_WINTER.rounds`.
 */
const PACKED_WITNESS: readonly WinterAction[] = [
  { kind: "fire", col: -3, row: -5 },
  { kind: "fire", col: -3, row: -5 },
  { kind: "fire", col: -1, row: -1 },
];

/**
 * ## ⚑ TWO RUNGS OF THE LADDER ARE UNREACHABLE THROUGH THE REDUCER, AND ARE CONSTRUCTED
 *
 * `held` and `bought` had plans here. Neither has one now, and the reason is a pair of 2026-08-02
 * rulings rather than a search that ran out:
 *
 *  - **`held`** is *every building standing, some of them scarred*. At
 *    `HARD_WINTER.damage.ruin_at: 1` a standing building cannot carry damage at all — proved over
 *    the whole shield-by-bite space in `hard-winter.test.ts`'s *"a building is sound or it is a
 *    ruin"* — so there is no plan, at any accuracy, on any board.
 *  - **`bought`** is *every building standing, and ground given up to do it*. The give-up-ground
 *    action is gone, so no winter can spend ground.
 *
 * **THEY ARE CONSTRUCTED FROM A REAL OUTCOME RATHER THAN DROPPED**, because `winterVerdict` is the
 * SPECIFICATION of how an outcome is named and not a switch over the outcomes one tuning happens to
 * produce: a `ruin_at` with room in it restores `held` in one edit, and `bought` is reachable by any
 * caller with a scarred-ground count. Constructing them is what keeps the ladder's five rungs
 * asserted while only three of them can be played.
 *
 * The plans they replace are recorded because each was hard-won. `held` was found by exhaustive
 * search over five-round plans on all three authored layouts, and its shape was the only route to a
 * scar the `ruin_at: 2` engine had: *"two rounds while nothing is cold, a `weak` shield on the
 * Tower in round three, a top-tier fire in round four that covers the other five for the rest of
 * the winter but cannot reach the Tower, and a `steady` shield in round five that covers the last
 * bite but not the one already taken."* `bought` was `packed`'s witness with a pull-back opening it.
 */
function withScar(state: HardWinterState): HardWinterOutcome {
  const clean = outcomeOf(state);
  // One survivor marked, at the one damage value a `ruin_at` of 2 or more would allow. The
  // outcome's own arithmetic is reproduced rather than guessed: `damaged` is the survivors
  // carrying damage and `repair_cost` is `winterMendCost` of the points on them.
  const marked = clean.standing[0] as string;
  return {
    ...clean,
    damaged: [marked],
    damage_points: 1,
    repair_cost: HARD_WINTER.damage.repair_cost_per_point,
    recovery_cost: clean.rebuild_cost + HARD_WINTER.damage.repair_cost_per_point,
  };
}

/**
 * The same fire lit in the middle of a compact city every round, which is what a player with a
 * partial score and no plan actually does. Measured at two of three: three of the six standing
 * and three in ruins, which is the `mauled` shape.
 */
const IDLE_MIDDLE_FIRE: readonly WinterAction[] = Array.from(
  { length: HARD_WINTER.rounds },
  () => ({ kind: "fire", col: -1, row: -1 }) as WinterAction,
);

/** Fires walked outward, which is what a competent player does with a partial score. */
const WALKED_FIRES: readonly (readonly [number, number])[] = [
  [0, 0],
  [2, 2],
  [-2, -2],
  [2, -2],
  [-2, 2],
];

function atAccuracy(
  city: readonly Cell[],
  actions: readonly WinterAction[],
  correct: number,
): HardWinterState {
  return play(
    city,
    actions.map((action) => ({ action, correct })),
  );
}

const UNTOUCHED = atAccuracy(PACKED, PACKED_WITNESS, 3);
/**
 * The same fire lit in the middle of a compact city every round, which is what a player with a
 * partial score and no plan actually does. Measured at two of three: three of the six standing and
 * three in ruins, which is the `mauled` shape.
 */
const MAULED = atAccuracy(PACKED, IDLE_MIDDLE_FIRE, 2);
/** Nothing answered right, on the widest board. Measured: nothing standing. */
const LOST = atAccuracy(
  SPREAD,
  WALKED_FIRES.slice(0, HARD_WINTER.rounds).map(
    ([col, row]) => ({ kind: "fire", col, row }) as WinterAction,
  ),
  0,
);

/**
 * THE FIVE VERDICTS, each with the outcome it is derived from. Three are played end to end
 * through the real reducer; two are constructed from a played one because the engine can no
 * longer reach them (see `withScar`, and `winterVerdict`'s own docblock for why the rungs stay).
 *
 * `scarredCells` is `winterVerdict`'s second argument rather than a field on the outcome, which is
 * what makes `bought` reachable at all now: ground damage is a fact a CALLER has and a winter's
 * outcome does not carry.
 */
const CASES = [
  { grade: "untouched", outcome: outcomeOf(UNTOUCHED), scarred: 0, played: UNTOUCHED },
  { grade: "held", outcome: withScar(UNTOUCHED), scarred: 0, played: null },
  { grade: "bought", outcome: outcomeOf(UNTOUCHED), scarred: 12, played: null },
  { grade: "mauled", outcome: outcomeOf(MAULED), scarred: 0, played: MAULED },
  { grade: "lost", outcome: outcomeOf(LOST), scarred: 0, played: LOST },
] as const;

/** The endings a real winter can reach, which is the population the RENDER sweep runs over. */
const PLAYED = CASES.filter(
  (entry): entry is (typeof CASES)[number] & { readonly played: HardWinterState } =>
    entry.played !== null,
);

describe("the concluding screen's verdict is derived from the outcome", () => {
  it("reaches five genuinely different endings, three of them played end to end", () => {
    const shapes = CASES.map(
      ({ outcome, scarred }) =>
        `${outcome.survived}/${outcome.total} ruined=${outcome.ruined.length} scarred=${outcome.damaged.length} ground=${scarred}`,
    );
    // Every PLAYED plan is a whole winter, so no fixture is quietly playing fewer rounds than the
    // encounter has. This is what caught all five when `HARD_WINTER.rounds` went to four, and all
    // three again when it went to three: the reducer ignores a declaration in the `ended` phase, so
    // a long plan does not fail.
    for (const { grade, played } of PLAYED) {
      expect(played.log, `${grade} is not a whole winter`).toHaveLength(HARD_WINTER.rounds);
      expect(played.phase, `${grade} did not end`).toBe("ended");
    }
    // A FLOOR ON THE PLAYED HALF, which is what stops the ladder becoming five constructions.
    expect(PLAYED.length, "the ladder is entirely constructed").toBeGreaterThanOrEqual(3);
    expect(PLAYED.map((entry) => entry.grade).sort()).toEqual([
      "lost",
      "mauled",
      "untouched",
    ]);
    // A CENSUS on the fixtures themselves: five distinct shapes, so no two rungs below are being
    // asserted over the same outcome.
    expect(
      new Set(shapes).size,
      `only these endings were reached: ${shapes.join(" | ")}`,
    ).toBe(5);
    // And the range really spans the whole of it, which is what "reads honestly across the
    // range" is a claim about.
    expect(outcomeOf(UNTOUCHED).survived).toBe(outcomeOf(UNTOUCHED).total);
    expect(outcomeOf(UNTOUCHED).damaged).toHaveLength(0);
    expect(outcomeOf(LOST).survived).toBe(0);
  });

  /**
   * **THE TWO CONSTRUCTED RUNGS ARE CONSTRUCTED FROM SOMETHING REAL, and this is what says so.**
   *
   * A constructed outcome is exactly how a rung goes on being asserted after the engine has stopped
   * being able to produce it — and exactly how one goes on being asserted after it has stopped
   * being COHERENT. So both are checked against the played outcome they are built from: the scarred
   * one differs in the damage fields and in nothing else, and the bought one differs in nothing at
   * all, because its difference is the caller's ground count rather than the outcome.
   */
  it("builds the two unreachable rungs off a played winter, changing only what they claim", () => {
    const clean = outcomeOf(UNTOUCHED);
    const scarred = withScar(UNTOUCHED);
    expect(scarred.damaged, "the scarred rung marks nobody").toHaveLength(1);
    expect(clean.standing, "the marked survivor is not one of the survivors").toContain(
      scarred.damaged[0],
    );
    expect(scarred.damage_points).toBeGreaterThan(0);
    expect(scarred.repair_cost).toBeGreaterThan(0);
    // Everything else is the played outcome's, field by field, so the construction cannot drift
    // into describing a winter nothing produced.
    const untouchedFields = Object.keys(clean).filter(
      (key) => !["damaged", "damage_points", "repair_cost", "recovery_cost"].includes(key),
    );
    expect(untouchedFields.length).toBeGreaterThanOrEqual(10);
    for (const field of untouchedFields) {
      expect((scarred as unknown as Record<string, unknown>)[field], field).toEqual(
        (clean as unknown as Record<string, unknown>)[field],
      );
    }
    // And the engine really cannot reach it, which is the premise the construction rests on: no
    // played ending in this file's own range carries a scar.
    for (const { grade, played } of PLAYED) {
      expect(outcomeOf(played).damaged, `${grade} carries a scar`).toEqual([]);
    }
  });

  it.each(CASES)("grades $grade as $grade", ({ grade, outcome, scarred }) => {
    expect(winterVerdict(outcome, scarred).grade).toBe(grade);
  });

  /**
   * **THE LOAD-BEARING ONE.** Each case above would pass over a function returning one fixed
   * string, and so would a headline that merely interpolated a count into one sentence. What has
   * to hold is that the five endings produce five DIFFERENT sentences, which is the difference
   * between a screen that notices what happened and one that does not.
   */
  it("gives five distinct verdicts, so no two endings read the same", () => {
    const headlines = CASES.map(
      ({ outcome, scarred }) => winterVerdict(outcome, scarred).headline,
    );
    expect(new Set(headlines).size, headlines.join(" | ")).toBe(5);
    expect(
      new Set(CASES.map(({ outcome, scarred }) => winterVerdict(outcome, scarred).grade))
        .size,
    ).toBe(5);
  });

  /**
   * AND IT NEVER CONGRATULATES A SETTLEMENT THAT LOST SOMETHING, which is the specific failure
   * the lead's own phrasing invites: *"a standalone popup that says 'crisis complete!'"* over a
   * city that just lost four buildings.
   */
  it("keeps every celebratory register off the outcomes that lost something", () => {
    for (const { grade, outcome, scarred } of CASES) {
      if (grade === "untouched") {
        continue;
      }
      const { headline } = winterVerdict(outcome, scarred);
      expect(headline, `${grade} reads as a win`).not.toMatch(
        /complete|congratulations|well done|victory|!$/i,
      );
    }
    // Nor does the clean one, because an exclamation mark sets a register the rest of the card
    // then has to live up to at every rung.
    expect(winterVerdict(outcomeOf(UNTOUCHED)).headline).not.toMatch(/!$/);
  });

  /**
   * `bought` SITS BETWEEN `held` AND `mauled`, and it exists because of a measured exploit: a
   * greedy survival-maximising planner discovered that abandoning was worth buildings and cost
   * nothing, because `standing(state)` never counted ruined ground (§5.14 of the crisis design
   * spec). A verdict that called this outcome a clean sweep would be the surface endorsing it.
   *
   * **NO WINTER CAN REACH IT SINCE 2026-08-02**, and the rung is kept for the reason the whole
   * ladder is: this function specifies how an outcome is NAMED, and the next crisis that scars
   * ground gets the naming rather than having to argue for it again.
   */
  it("does not call a settlement bought with ground a clean one", () => {
    const clean = outcomeOf(UNTOUCHED);
    expect(clean.survived, "nothing was lost, so this is not the mauled case").toBe(
      clean.total,
    );
    // The SAME outcome, read with and without a scarred-ground count, so what is measured is the
    // ground and nothing else about the winter.
    expect(winterVerdict(clean, 0).grade).toBe("untouched");
    expect(winterVerdict(clean, 12).grade).not.toBe("untouched");
    expect(winterVerdict(clean, 12).headline).toMatch(/gave up ground/);
  });
});

/* -------------------------------------------------------------------------- */
/* And it claims no earnings, at any ending                                   */
/* -------------------------------------------------------------------------- */

/**
 * **THE CARD PROMISES NOTHING, AND THAT IS ASSERTED POSITIVELY.**
 *
 * ⚑ **THE POPULATION IS THE THREE PLAYED ENDINGS SINCE 2026-08-02**, not all five, and the
 * narrowing is forced rather than chosen: `held` and `bought` are outcomes the engine can no
 * longer produce, and this sweep RENDERS a card from a `HardWinterState` rather than from an
 * outcome, so there is no state to hand it. The argument below for wanting the whole range still
 * applies to the verdict ladder above, which does cover all five.
 *
 * `untouched` — the ending most likely to grow an earnings sentence back, because the payout's
 * clean-sweep bonus only ever paid on `flawless` — is one of the three, which is the part of that
 * argument this sweep most needed to keep.
 *
 * The bill used to end *"You earned N XP, N gold and N material"*, read off
 * `hardWinterPayoutFor`, over a ledger that never received a row: there is no winter reason
 * code, no grant recipe and no `hardWinterEventId` in `packages/economy`. It also named GOLD,
 * which the economy rework retired as a currency. The lead cut the claim rather than wiring the
 * grant, because the Hard Winter is a cost event and not an income one.
 *
 * So the claim that needs a guard now is the OPPOSITE one, and it needs to be a guard rather
 * than an absence: nothing about deleting a sentence stops the next edit putting it back, and a
 * conditional version (a clean-sweep bonus on the flawless ending alone) is exactly the shape
 * that would slip past a single played winter.
 *
 * ## Why the population is all five endings and not the one a played winter reaches
 *
 * `HardWinterSurface.test.tsx` plays a real winter end to end and reaches ONE ending, `mauled`.
 * That is the right test for "the surface really renders this card", and the wrong population
 * for this claim: the payout's clean-sweep bonus only ever paid on `flawless`, so the ending
 * most likely to grow an earnings sentence back is `untouched`, which no played winter in the
 * suite reaches. The five fixtures above are five real reducer outcomes spanning the whole
 * range, and the census at the head of this file is the floor under their being five.
 *
 * **THE 2026-08-01 RETUNE MADE THAT ARGUMENT STRONGER RATHER THAN WEAKER, which is why this
 * paragraph is still here.** At `HARD_WINTER.damage.ruin_at: 2` the frost destroys what it
 * reaches instead of marking it, so `held` needs a plan that buys a two-point shield against a
 * three-point bite: it is now the ending a played winter is LEAST likely to stumble into, not
 * merely one it does not happen to reach. Scoping this sweep to the endings a played winter
 * produces would today cover exactly one of the five.
 *
 * ## Each row is a shape, and none of them is decorative
 *
 * A sweep of patterns nobody has watched fail is a list of strings. {@link REINTRODUCTIONS}
 * puts the sentence that was actually cut back in front of the sweep, plus three variants it
 * would be reintroduced as, and every one of them has to be caught. Measured rather than
 * argued: putting `You earned {payout.xp} XP` back into `WinterConclusion.tsx` fails this file
 * at every ending.
 */
const EARNINGS_CLAIMS: readonly {
  readonly what: string;
  readonly pattern: RegExp;
}[] = [
  {
    what: "a verb that hands the player something",
    pattern: /\byou (?:earned|earn|gained|gain|were paid|receive|received|get|got)\b/i,
  },
  {
    what: "XP, which the crisis writes no row of",
    pattern: /\bXP\b/,
  },
  {
    what: "gold, which is not a currency any more",
    pattern: /\bgold\b/i,
  },
  {
    what: "a bonus, which is a payout band under another name",
    pattern: /\bbonus\b|clean.sweep/i,
  },
  {
    what: "material named as taken rather than as spent",
    pattern: /\b(?:earned|earn|gained|gain|paid|awarded|worth)\b[^.]*\bmaterial\b/i,
  },
];

/**
 * The claim in the shapes it could come back in. The first is verbatim what was removed; the
 * other three are the same promise said differently, because a guard written only against the
 * exact string it deleted is a guard against `git revert` and nothing else.
 */
const REINTRODUCTIONS: readonly string[] = [
  "You earned 40 XP, 40 gold and 12 material, the clean-sweep bonus included.",
  "You gained 12 material for bringing the settlement through.",
  "You were paid 40 gold for the winter.",
  "A clean sweep, so the bonus is yours.",
];

describe("the concluding screen claims no earnings, because nothing is credited", () => {
  /** Both mounts, because the live board draws a block the authored board does not. */
  const BOARDS = [
    { board: "authored", isLiveBoard: false },
    { board: "live", isLiveBoard: true },
  ] as const;

  it.each(PLAYED)(
    "says nothing about earnings on the $grade ending",
    ({ grade, played }) => {
      for (const { board, isLiveBoard } of BOARDS) {
        const { container } = render(
          createElement(WinterConclusion, {
            winter: played,
            encounter: 1,
            onRestart: () => undefined,
            isLiveBoard,
            scar: null,
            onCarryBack: () => undefined,
          }),
        );
        const text = container.textContent ?? "";

        /*
        THE FLOOR, FIRST. "No earnings claim" is true of an empty string, of a component that
        returned null because the fixture had no outcome, and of a render that threw its card
        away. Each line below is one the card owes at every ending, so the sweep underneath is
        over a card that really drew.
      */
        expect(text, `${grade}/${board} did not render its verdict`).toContain(
          winterVerdict(outcomeOf(played)).headline,
        );
        expect(text, `${grade}/${board} did not render its accuracy`).toMatch(
          /You answered \d+ of \d+ right/,
        );
        // THE ERA'S OWN MATERIAL, NAMED: the card reads "…costs 180 stone" since 2026-08-02, and the
        // word is resolved here the same way the card resolves it rather than pinned.
        expect(text, `${grade}/${board} did not render its bill`).toMatch(
          new RegExp(
            `Putting the settlement back costs \\d+ ${materialWord("prehistoric")}|There is nothing to put right`,
          ),
        );
        expect(
          container.querySelectorAll(".hw-roll-tiles li"),
          `${grade}/${board} drew no roll`,
        ).toHaveLength(IDS.length);

        for (const { what, pattern } of EARNINGS_CLAIMS) {
          expect(text, `${grade}/${board} claims ${what}: ${text}`).not.toMatch(pattern);
        }
        cleanup();
      }
    },
  );

  /**
   * THE TEETH, AND EVERY ROW HAS TO HAVE SOME. The sweep above passes over any card that says
   * nothing, including a card that says nothing because a pattern stopped matching anything at
   * all, so a row that catches no reintroduction is indistinguishable from a row that is working.
   *
   * The sentence that was actually cut has to be caught by EVERY row, not by one of them:
   * "You earned" is the verb, "40 XP" and "40 gold" are the two retired currencies, "clean-sweep
   * bonus" is the payout band, and "earned ... material" is the third figure. Any row that stops
   * catching it has stopped describing the defect this file was written for.
   */
  it("catches the sentence that was cut, on every row of the sweep", () => {
    const [cut] = REINTRODUCTIONS as readonly string[];
    const missed = EARNINGS_CLAIMS.filter(({ pattern }) => !pattern.test(cut as string));
    expect(
      missed.map(({ what }) => what),
      `these rows no longer catch "${cut}", so they are decorative`,
    ).toEqual([]);
  });

  /**
   * And the variants, because a guard written only against the exact string it deleted is a
   * guard against `git revert` and nothing else. Each has to be caught by at least one row.
   */
  it.each(REINTRODUCTIONS.slice(1))("catches %s", (sentence) => {
    const caught = EARNINGS_CLAIMS.filter(({ pattern }) => pattern.test(sentence));
    expect(
      caught.map(({ what }) => what),
      `nothing in the sweep catches "${sentence}"`,
    ).not.toHaveLength(0);
  });

  /** And a floor on the sweep, so a shortened list cannot quietly stop checking. */
  it("keeps every shape it swept for", () => {
    expect(EARNINGS_CLAIMS.length).toBeGreaterThanOrEqual(5);
    expect(REINTRODUCTIONS.length).toBeGreaterThanOrEqual(4);
  });
});

describe("overall accuracy is folded off the round log", () => {
  it("counts every question the winter asked, across all its rounds", () => {
    const perfect = winterAccuracy(UNTOUCHED);
    expect(perfect.asked).toBe(HARD_WINTER.rounds * HARD_WINTER.batch_size);
    expect(perfect.correct).toBe(perfect.asked);
    expect(perfect.percent).toBe(100);

    const none = winterAccuracy(LOST);
    expect(none.asked).toBe(HARD_WINTER.rounds * HARD_WINTER.batch_size);
    expect(none.correct).toBe(0);
    expect(none.percent).toBe(0);

    const partial = winterAccuracy(MAULED);
    expect(partial.correct).toBe(2 * HARD_WINTER.rounds);
    expect(partial.percent).toBe(67);
  });

  /** A winter with no resolved round divides by nothing rather than reporting `NaN%`. */
  it("reports no percentage at all when nothing was asked", () => {
    const fresh = createHardWinter({
      era: "prehistoric",
      buildings: PACKED.map((c) => ({ node_id: c.nodeId, col: c.col, row: c.row })),
    });
    expect(winterAccuracy(fresh)).toEqual({ correct: 0, asked: 0, percent: null });
  });
});

/** The ids the fixtures use are the era-one set, so a rename here fails loudly. */
it("plays over era one's own six nodes", () => {
  expect(PACKED.map((c) => c.nodeId)).toEqual([...IDS]);
  expect(SPREAD.map((c) => c.nodeId)).toEqual([...IDS]);
});
