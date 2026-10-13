import type { CitizenRoster, WinterCellView } from "@cr/game";

import {
  footprintFor,
  GRID_CELL,
  type GroundPoint,
  type PlacedTransform,
  transformCenter,
} from "../worldLayout";

/**
 * **WHERE A CROWD SHELTERS WHILE THE FROST IS TAKING THE ISLAND — AND WHO DOES NOT FIT.**
 *
 * Pure, framework-free, no `three` — the board reading the crisis crowd is built on, held
 * apart from the geometry that consumes it (`citizenPlaces.ts`) so both the safe region and
 * the allocation can be asserted without a GPU.
 *
 * The team lead, on the Hard Winter running over his city (2026-08-02): *"during the winter
 * crisis - the citizens should stay within where the frost is; they shouldnt be running
 * outside, they should be within the bounds/hiding/looking scared"*.
 *
 * ## THE RULING THIS FILE NOW IMPLEMENTS (2026-08-03): PEOPLE SHELTER INSIDE THE BUILDINGS
 *
 * *"People shelter INSIDE the buildings that survived. The thing you spent the crisis
 * protecting becomes the thing that protects you."* And the property that makes it worth
 * doing: **the final frame must reflect how well the player did.**
 *
 * ### The defect, which was a design problem rather than a bug
 *
 * The frost reaches the island's heart on the last beat at every tuning this encounter has
 * shipped — 1,1,1,1,2 over five rounds and the shipped 1,2,3 over three both cumulate past era
 * one's five rim bands — so by the last round almost every cell is frozen and the few that are
 * not are under the buildings. The first version of this feature needed standable ground that was
 * NOT under a building, found none, and fell through to its third tier: the permanently-clear
 * annulus outside the board, which existed only so that "no citizen stands on frozen ground"
 * stayed satisfiable.
 *
 * **THE BOARD IT WENT WRONG ON IS THE ONE THE FINAL ROUND IS PLAYED ON, and which board that is
 * was checked rather than assumed.** `WinterInCity`'s bridge thaws the rows the instant `phase` is
 * `"ended"`, so the state after the last `end_round` is never staged with a sheltering crowd; the
 * last board that is, is the one with `HARD_WINTER.rounds - 1` rounds closed, with the crisis
 * panel up asking the last three questions.
 *
 * Measured at `21ddc4d0` on the live seven-building board, one-round-lookahead player, people
 * standing OFF the board on each board the player is shown, before this change:
 *
 *   | closed rounds | 0 of 3 | 1 of 3 | 2 of 3 | 3 of 3 | frozen |
 *   |---------------|--------|--------|--------|--------|--------|
 *   | 0 to 1        |      0 |      0 |      0 |      0 | 0..28  |
 *   | **2 (last)**  | **28** |   20   | **28** | **28** | 70..72 |
 *
 * So on the last board of the crisis **a player who answered 3 of 3 saw the same 28 of their 44
 * people out at the waterline as one who answered 0 of 3** — and one who answered 1 of 3 saw fewer
 * out than either, so more accuracy could be worse. And after that board the phase ends and the
 * bridge thaws, where the old rule read a thawed board as a live one with nothing frozen: the
 * crowd went on huddling at the walls indefinitely, at every accuracy, while the outcome panel
 * said the frost had given the ground back.
 *
 * ### What replaces it
 *
 * A shelter is a building that is STILL STANDING, with room in it. {@link shelterPlan} deals
 * the roster into the survivors up to {@link shelterCapacityOf} each, in roster order, own
 * home first; whoever is left over goes out to the ring. So the number of people outside is a
 * direct readout of how much shelter the player failed to save — the score, rendered as a
 * picture, with no UI. Same board, same player, same measurement, after:
 *
 *   | closed rounds | 0 of 3 | 1 of 3 | 2 of 3 | 3 of 3 | standing        |
 *   |---------------|--------|--------|--------|--------|-----------------|
 *   | 0 to 1        |      0 |      0 |      0 |      0 | 7 of 7          |
 *   | **2 (last)**  | **10** |  **6** |  **2** |  **2** | 5 / 6 / 6 / 6   |
 *   | 3 (thawed)    |   — the crowd is home; the ruins are what the frame varies in —  |
 *
 * Monotone where it was not, and every figure is exactly the shelter that is missing: at 0 of 3
 * the Tower and the Commons are both gone, which is 6 plot cells and so 12 places, and 10 people
 * are outside; at 3 of 3 only the Commons is gone, which is 4 places, and 2 are. **The top two
 * bands tie, and they tie because their surviving settlements are identical** — the same six
 * buildings, so the same shelter and the same people in it. That is the picture being correct
 * rather than insensitive, and `citizensShelterInside.test.ts` asserts it in exactly that form:
 * the crowd may only tie where the surviving capacity ties, and a tie that is not a capacity tie
 * fails.
 *
 * **AND THE RING HAS STOPPED BEING REACHABLE BY WEATHER ALONE.** At the shipped three-round
 * schedule no live board is ever wholly frozen — the cumulative reach is 1, 3, 6 bands and the
 * third step lands on the `end_round` that also ends the phase — so on every board a crowd is
 * drawn on there is unfrozen ground, and the only way anybody gets to the ring is by losing a
 * building. The two boards before the first ruin have nobody out there at any accuracy.
 *
 * **WHAT THE THAW COSTS THIS, said plainly.** The strongest crowd contrast the arithmetic can
 * produce is on the board AFTER the last round — 44 / 36 / 18 / 10 out, because that is where the
 * damage lands — and nothing renders it, because the ruling asks for the crowd to come home with
 * the weather. So the crisis's crowd carries the mid-winter variation and the post-thaw frame
 * carries its variation in the RUINS, which persist. Both vary with accuracy; they vary in
 * different channels.
 *
 * ### A ruin shelters nobody, and nobody is ever inside one
 *
 * This is where the variation comes from, and it was the sharpest half of the old defect: the
 * previous rule asked only whether a building had unfrozen ground against a wall and never
 * whether the building was still there, so a settlement of ruins sheltered its whole population.
 * A ruin is now simply absent from {@link shelterPlan}'s input.
 *
 * **THE ORDERING WAS CHECKED RATHER THAN ASSUMED, because a building collapsing on the people
 * inside it is not something to ship into a learning game for teenagers.** The reducer's
 * `end_round` advances the frost, spends shields and marks ruins, and only then is the board
 * projected and published; the crowd is a pure function of that published board. So the ruin
 * and the re-staging are the same state change, there is no frame between them, and a ruined
 * building is never a shelter with anybody in it — it is a wreck whose people are now at a
 * neighbour's door or on the ring. Asserted over every board a real winter produces.
 *
 * ### The shield now has a second payoff, deliberately
 *
 * A reinforced building survives by definition, and a surviving building is shelter, so
 * `reinforce` decides where people can be as well as what is left standing. That is stated
 * here rather than left to happen: **reinforcing the largest plot on the island is now the
 * highest-value reinforce for the ending picture**, because {@link shelterCapacityOf} is
 * proportional to plot area and the hall's 3x2 is the biggest single block of shelter era one
 * has. `citizensShelterInside.test.ts` measures the difference between reinforcing the largest
 * and reinforcing the smallest.
 *
 * ## THE FROST: IT COMPUTES NOTHING ABOUT IT, AND THAT IS THE WHOLE DESIGN
 *
 * `hardWinterView` already projects every ground state a renderer needs, and `winterCellKey`
 * and `roadCellKey` are the same key — so a cell means the same cell on the winter board and
 * on the city grid, with nothing scaled and nothing offset. This reads `frozen` and
 * `frost_next` off those rows exactly as `WinterGround.tsx` does, for the reason that file
 * gives: a second flood fill over the grid would be a second timetable, checked nowhere, free
 * to send the crowd off ground the rules had not taken.
 *
 * It also means the safe region FOLLOWS THE ADVANCE rather than being decided once. The rows
 * are re-projected every round, this is derived from the rows, and the places are derived from
 * this — so when the frost takes a band, the band leaves the standable set on the same render
 * that draws the ice on it. Nothing is cached across rounds and there is no opening snapshot
 * to go stale, which matters because where the frost STARTS is a tuning decision that has
 * already moved once (`hard-winter-tuning.ts`'s `spread`, 2026-08-02) and may move again.
 *
 * ## THE THREE TIERS, AND WHAT IS LEFT FOR EACH OF THEM TO DO
 *
 * `frozen` is a REFUSAL, not a preference: {@link shelterTierOf} returns `null` for it and no
 * caller may allocate one. The tiers now bound where somebody OUTDOORS may stand, which since
 * the ruling above is the overflow and nobody else.
 *
 *  - **{@link SHELTER_TIER.interior}** — unfrozen board land the frost is not taking this
 *    round either.
 *  - **{@link SHELTER_TIER.exposed}** — unfrozen board land the round WILL take
 *    (`frost_next`). Standable, and deliberately last-but-one: a citizen standing here is
 *    standing where a wall of shove ice is about to be built (`winterFrostFront.ts` stands
 *    0.72u plates on exactly these cells), and a 1.3u figure inside that wall reads as debris.
 *  - **{@link SHELTER_TIER.fringe}** — the permanently-clear annulus OUTSIDE the board.
 *    `hardWinterIsland` is `eraBuildableRadius` (22) and a citizen may stand out to
 *    `WALKABLE_RADIUS` (25), so about 27 cells of ground exist that the winter board does not
 *    cover and the frost therefore cannot ever take.
 *
 * **THE FRINGE HAS STOPPED BEING A FALLBACK AND BECOME THE LOSING IMAGE.** It used to be
 * reached by running out of unfrozen ground, which every board does, so it was where everybody
 * ended up. It is now reached by running out of SHELTER, which is the player's own doing — and
 * `citizenPlaces.ts` sends the overflow there directly rather than letting them take unfrozen
 * board ground, because "out on the ring in the cold" is the picture the ruling asks for and a
 * knot on a spare inland tile is not. It is still the ground that makes "no citizen stands on
 * frozen ground" total rather than conditional, and it is still permanently clear.
 */

/** The board's ground, as a sheltering crowd has to read it. All keys are `"col,row"`. */
export interface ShelterGround {
  /** Cells the frost holds NOW. Nobody may stand on one and no walk may cross one. */
  readonly frozen: ReadonlySet<string>;
  /** Cells the frost takes when this round closes. Standable, but only if nothing else is. */
  readonly frostNext: ReadonlySet<string>;
  /**
   * Every LAND cell on the winter board.
   *
   * Carried so the off-board fringe is identifiable rather than assumed: a standable cell
   * that is not in here is in the annulus the frost cannot reach, and that is a fact about
   * the board's own extent rather than about a radius written down twice.
   */
  readonly land: ReadonlySet<string>;
}

/**
 * How willingly a crowd stands on a cell. Lower is better.
 *
 * **A PREFERENCE, NOT A RANK, and the difference was measured in a photograph.** The tier is
 * turned into a distance penalty by `citizenPlaces.ts` (`TIER_PENALTY`), so a citizen will
 * cross a cell or two for better footing and will not cross the settlement for it. Ranked
 * strictly instead — the first version — the preference outranks the wall a person is
 * sheltering against, and the island's largest residence photographed with an empty plot while
 * its whole crowd had migrated inland. `EXPOSED_STEP_UNITS` carries that measurement.
 *
 * The FRINGE is the exception and is effectively a rank, by arithmetic rather than by special
 * case: its penalty is wider than the island, so no board cell can lose to an off-board one.
 */
export const SHELTER_TIER = {
  interior: 0,
  exposed: 1,
  fringe: 2,
} as const;

export type ShelterTier = (typeof SHELTER_TIER)[keyof typeof SHELTER_TIER];

/**
 * The tiers in preference order. Exported so a caller cannot iterate them in another one — the
 * order is what `TIER_PENALTY` is keyed on, so it is behaviour rather than documentation.
 */
export const SHELTER_TIERS: readonly ShelterTier[] = [
  SHELTER_TIER.interior,
  SHELTER_TIER.exposed,
  SHELTER_TIER.fringe,
];

/**
 * The board's ground, or `null` when no crisis is running ON IT.
 *
 * `null` rather than three empty sets, because the two are different worlds and the geometry
 * branches on which one it is in: no board at all is an ordinary day with people commuting.
 *
 * ## `null` ALSO MEANS A THAWED BOARD, WHICH IS HOW THE CROWD COMES HOME (2026-08-03)
 *
 * *"People must return at the thaw. `WinterInCity` publishes `NO_FIRES` once the crisis ends
 * and spent hearths revert with the weather — follow that precedent."*
 *
 * The precedent is that the END of the crisis is decided once, by the phase, in
 * `WinterInCity`'s bridge — which calls `thawWinterRows` and hands the CITY a board with the
 * weather already off it. Every other crisis dressing is then derived from those thawed rows
 * rather than from the phase a second time, which is the argument `winterThreatenedNodeIds`
 * gives in as many words: one decision about when the crisis is over, not two that could
 * disagree. So the crowd comes home through the same function that takes the frost off the
 * ground, and there is no `ended` flag threaded down to the scene to fall out of step with it.
 *
 * **A LIVE BOARD ALWAYS CARRIES COLD GROUND, and that is what makes the reading total rather
 * than a heuristic.** `createHardWinter` opens with nothing frozen — but with the whole
 * 28-cell shoreline band under `frost_next`, measured on era one's board at `498a48ae` — and
 * from the first `end_round` onward `frozen` is non-empty and the reducer never clears it. The
 * widest ward era one has is 13 cells against a 28-cell opening band, so there is no legal
 * board on which the coming advance is empty while nothing is yet frozen. `thawWinterRows`
 * clears both flags on every cell, so *no cold ground anywhere* is a thawed board and nothing
 * else, and reading it here is a fact about the rows rather than a guess about the phase.
 */
export function shelterGround(
  rows: readonly (readonly WinterCellView[])[] | null | undefined,
): ShelterGround | null {
  if (!rows) {
    return null;
  }
  const frozen = new Set<string>();
  const frostNext = new Set<string>();
  const land = new Set<string>();
  for (const line of rows) {
    for (const cell of line) {
      if (!cell.land) {
        continue;
      }
      const key = `${cell.col},${cell.row}`;
      land.add(key);
      if (cell.frozen) {
        frozen.add(key);
      }
      if (cell.frost_next) {
        frostNext.add(key);
      }
    }
  }
  if (frozen.size === 0 && frostNext.size === 0) {
    return null;
  }
  return { frozen, frostNext, land };
}

/**
 * Which tier a cell falls in, or `null` when nobody may stand there.
 *
 * `null` is reserved for FROZEN ground and nothing else. A cell being off the board, under a
 * building or out past the walkable radius are all separate refusals owned by the caller;
 * folding them in here would make one `null` mean four things and hide the one that matters.
 */
export function shelterTierOf(
  ground: ShelterGround,
  col: number,
  row: number,
): ShelterTier | null {
  const key = `${col},${row}`;
  if (ground.frozen.has(key)) {
    return null;
  }
  if (!ground.land.has(key)) {
    return SHELTER_TIER.fringe;
  }
  return ground.frostNext.has(key) ? SHELTER_TIER.exposed : SHELTER_TIER.interior;
}

/**
 * People per cell in a HUDDLE, against `STANDING_PER_CELL`'s five on an ordinary day.
 *
 * The number decides whether a knot on the ring reads as a group of neighbours or as a
 * scatter, and the arithmetic is the same as its fair-weather twin's: a cell is 4x4 units, the
 * daytime ledger puts eight people at a single civic door, and eight over eight is ONE cell
 * rather than two — where five spread the same group over two cells and left it looking like
 * people standing about.
 *
 * **IT IS THE RING'S DENSITY, and since the 2026-08-03 ruling that is all it is.** The crowd
 * indoors is spread along its shelter's own wall by {@link SHELTER_PER_PLOT_CELL} and never
 * through this, because a person indoors is not allocated ground.
 */
export const SHELTER_PER_CELL = 8;

/* -------------------------------------------------------------------------- */
/* How much shelter a building is                                             */
/* -------------------------------------------------------------------------- */

/**
 * **PLACES INDOORS PER CELL OF A BUILDING'S PLOT. The capacity rule, and the whole readout
 * rests on it.**
 *
 * ## Per PLOT, which answers "per building or per building type" in the one place that cannot
 * drift
 *
 * The question was posed as a choice between a per-building table and a per-type one, and the
 * plot is the answer to both: `NODE_FOOTPRINTS` is authored per NODE, so a capacity derived
 * from it is per building; and buildings that share a plot share a capacity, so it is per type
 * wherever a type is what decides the plot. It also answers the example directly — a Roundhouse
 * is a 2x2 and a Hide Shed a 2x1, so the Roundhouse holds twice as many, on the figure that
 * era's own style guide already chose for them.
 *
 * Three reasons to derive rather than author a parallel table:
 *
 *  - **INV-ERA-1 freezes a footprint once its era's guide closes.** So this cannot drift under
 *  a retune of anything else, and a building cannot end up with a plot that says "small" and a
 *  capacity that says "large".
 *  - **It already covers all 62 nodes in all ten eras.** Thirty-eight are authored and
 *    twenty-four resolve to `DEFAULT_FOOTPRINT` by their own guides' choice, which the imagegen
 *    briefs call *"a design fact, not a placeholder"*. A new table would have to make a
 *    decision for those twenty-four that no guide has made.
 *  - **A second table would be a second place for "how big is this building" to be wrong**,
 *    which is the argument `footprintFor` itself gives for resolving civic plots through the
 *    era catalogue instead of copying them.
 *
 * ## TWO, derived against the island's own arithmetic and then measured
 *
 * Era one's fully built island is **23 plot cells** across seven buildings — three 2x2s, a 2x1,
 * a 1x2, a 1x1 and the hall's 3x2 — and its population settles at exactly **44**, because
 * `citizens-tuning.ts` sizes the homes so *"the island's totals settle exactly full"*
 * (`residence_capacity` at full mastery is 44 against a population of 44). Two constraints
 * follow, and they bracket the value:
 *
 *  - **a settlement that keeps everything has to hold everybody**, or a flawless run still
 *    photographs people out in the cold. `ceil(44 / 23)` is 2, and 23 x 2 = 46 against 44 —
 *    two places of slack, which is the smallest integer that clears it;
 *  - **a settlement that keeps half must not.** At 2 the whole island holds 46, so any real
 *    loss shows: it is under `2 x population`, which is the bound that makes a lost building
 *    cost somebody a place rather than eating slack.
 *
 * Then measured, rather than left as arithmetic. People on the ring across the four bands at
 * `21ddc4d0`, on the board the final round is played on — the last one a crowd is drawn on, see
 * the file header — and on the board after it, which nothing renders today but which a retune of
 * the round count or of the thaw would expose first:
 *
 *   | per plot cell | the last board a crowd is on | the board after it   | distinct pictures |
 *   |---------------|------------------------------|----------------------|-------------------|
 *   | 1             | 27 / 25 / 23 / 23            | 44 / 40 / 31 / 27    | 3, and see below  |
 *   | **2 (this)**  | **10 / 6 / 2 / 2**           | **44 / 36 / 18 / 10**| **3 and 4**       |
 *   | 3             | **0 / 0 / 0 / 0**            | 44 / 32 / 5 / 0      | **1** and 4       |
 *   | 4             | **0 / 0 / 0 / 0**            | 44 / 28 / **0 / 0**  | **1** and 3       |
 *
 * Three and four are out on the left-hand column, and out badly: a settlement that has lost a
 * building still holds everybody, so **the ring never fills at all on any board the player sees**
 * and the readout is dead. One is out on the other side: it fails the first bracket above — a
 * whole settlement holds 23 of 44 — so a flawless run photographs twenty-one people in the cold
 * and the ring is a default again rather than a loss. **Two is the only value that separates the
 * bands on both boards, and the only one that reads zero when nothing has been lost and non-zero
 * the moment something has.** That is the argument; the arithmetic above only bracketed where to
 * look.
 *
 * **IT IS TIGHTER THAN {@link SHELTER_PER_CELL}, AND THAT IS NOT A CONTRADICTION.** Eight is
 * people per cell of open GROUND in a huddle, which is what a knot pressed together looks like
 * for a moment; two is places per cell of PLOT, which is what a building can hold for a night.
 * A plot is not a floor plan — `FOOTPRINT_FILL` is 0.95 and the contain fit leaves the rest —
 * and this number is doing a game-design job (make the ending vary) rather than an
 * architectural one.
 *
 * ALL OF THIS IS A FIRST GUESS, in the same sense `hard-winter-tuning.ts` says every one of its
 * numbers is. What is pinned in `citizensShelterInside.test.ts` are the two RELATIONSHIPS above
 * and the strict ordering of the bands, never these digits.
 *
 * **THE FIRST BRACKET NO LONGER CLOSES, AND THAT IS AN ACCEPTED GAP RATHER THAN AN OVERSIGHT.**
 * A later founding-population rebalance moved era one's settled population from 44 to 48 without
 * moving its plot cells (still 23) or its footprints, so `23 x 2 = 46` is now two short of a
 * flawless settlement's own crowd — a perfect run still shows 2 on the ring. Neither integer
 * neighbour is better: 1 fails the SAME bracket by much more (23 of 48, not 46), and 3 gives 69,
 * which reopens the failure the table above already ruled 3 and 4 out for — a lost building costs
 * nobody a place, because the whole island's flawless slack (21) swallows it, and the readout goes
 * dead exactly the way it did at the old population. Of the three integers, 2 is still the only
 * one that separates the bands; it is no longer the one that clears the whole crowd, and between a
 * live readout with a small fixed floor and a dead one with none, the live one is worth the floor.
 * `citizensShelterInside.test.ts`'s "everything standing" case is pinned at `population - 2`
 * rather than at `population`, and says so.
 */
export const SHELTER_PER_PLOT_CELL = 2;

/**
 * How many people one standing building can take in: its plot area, at
 * {@link SHELTER_PER_PLOT_CELL}.
 *
 * The hub is a building like any other here, which is DELIBERATE and is the one place this
 * departs from the fair-weather model. `citizens-tuning.ts` makes the hall's gathering crowd
 * unbounded — *"it is ALSO the gathering place for everyone with nowhere to live, and that
 * crowd is UNBOUNDED"* — and an unbounded hall would kill this readout outright: one surviving
 * hall would shelter every population the game can produce, so nobody would ever be on the ring
 * while the hall stood and the ending would stop varying with anything except whether the hall
 * fell. It is 3x2, so it is the largest single block of shelter era one has (12 places), which
 * is the right amount of importance for it to carry without being the whole answer.
 */
export function shelterCapacityOf(nodeId: string): number {
  const { w, d } = footprintFor(nodeId);
  return w * d * SHELTER_PER_PLOT_CELL;
}

/* -------------------------------------------------------------------------- */
/* Who is inside which building, and who is left on the ring                  */
/* -------------------------------------------------------------------------- */

/** One person's answer, so a caller never has to look one up by index. */
export interface ShelterPlan {
  /**
   * Citizen id to the node id of the building they are INSIDE. A citizen absent from this map
   * is on the ring, and that absence is the readout.
   */
  readonly indoors: ReadonlyMap<string, string>;
  /**
   * Who is in each building, IN ROSTER ORDER, so the geometry can lay a crowd along a wall
   * without deriving an ordering of its own.
   */
  readonly crowdByNode: ReadonlyMap<string, readonly string[]>;
  /** Citizen ids with no place indoors, in roster order. **The score, as a list of people.** */
  readonly outside: readonly string[];
  /** Places indoors that exist on this board at all, which is what `outside` is against. */
  readonly places: number;
}

/** Nobody indoors and nobody outside: the shape an ordinary day takes. */
const NO_SHELTER_PLAN: ShelterPlan = {
  indoors: new Map(),
  crowdByNode: new Map(),
  outside: [],
  places: 0,
};

/**
 * **DEAL THE ROSTER INTO THE BUILDINGS THAT SURVIVED, AND SEND WHOEVER IS LEFT TO THE RING.**
 *
 * Three properties, each of which is a thing a guard checks rather than a thing this comment
 * asserts:
 *
 *  - **Nobody is deleted to make them fit.** Every citizen comes out either in `indoors` or in
 *    `outside`, exactly once, in roster order.
 *  - **It is deterministic and unseeded.** Roster order, own home first, then the nearest
 *    survivor with room, ties broken on node id. Two loads of the same city fill the same
 *    buildings with the same people, so a screenshot is reproducible and a bug report
 *    repeatable.
 *  - **Own home first, and that is the same inversion `citizenPlaces.ts` already makes.** A
 *    crisis is not a working day: the first thing anybody does is get to their own door, and
 *    only when it is full or gone do they crowd into a neighbour's. Their `day_node_id` is
 *    never read here.
 *
 * `standing` is the buildings the frost has NOT wrecked, the hub included. Passing a ruin would
 * shelter people in a wreck, which is the defect this replaces; `citizenPlaces.ts` filters on
 * the city's own `ruinedNodeIds` so there is one source for "what is left".
 */
export function shelterPlan(params: {
  readonly roster: CitizenRoster;
  readonly standing: readonly PlacedTransform[];
}): ShelterPlan {
  const { roster, standing } = params;
  if (standing.length === 0) {
    return {
      ...NO_SHELTER_PLAN,
      outside: roster.citizens.map((citizen) => citizen.id),
    };
  }

  // Sorted by node id so the nearest-with-room search has a stable tie-break, which is what
  // makes two loads of one city deal the same hand.
  const order = [...standing].sort((a, b) => (a.nodeId < b.nodeId ? -1 : 1));
  const room = new Map<string, number>();
  const centres = new Map<string, GroundPoint>();
  let places = 0;
  for (const placed of order) {
    const capacity = shelterCapacityOf(placed.nodeId);
    room.set(placed.nodeId, capacity);
    centres.set(placed.nodeId, transformCenter(placed, footprintFor(placed.nodeId)));
    places += capacity;
  }

  const indoors = new Map<string, string>();
  const outside: string[] = [];

  // Only `room` and `indoors` are written during allocation; `crowdByNode` is built from
  // `indoors` in a final roster-order pass below, because pass 1 seating a building's own
  // residents before pass 2's overflow reaches it would otherwise put an overflow arrival
  // ahead of a same-building resident who happens to sit later in roster order — and the
  // per-building ordering is a real contract (see the "partitions the roster" case: a crowd
  // laid along a wall inherits roster order, not assignment order).
  const seat = (citizen: (typeof roster.citizens)[number], nodeId: string): void => {
    room.set(nodeId, (room.get(nodeId) as number) - 1);
    indoors.set(citizen.id, nodeId);
  };

  // PASS 1 — EVERY CITIZEN WHOSE OWN HOME HAS ROOM TAKES IT, roster order deciding only ties
  // within one building's own residents. Split from the overflow search below (was one pass
  // over roster order) so that an early-roster-order citizen whose own home is gone or full can
  // never claim a later-roster-order citizen's OWN doorway on the way to finding a neighbour's —
  // "your own door before anybody else's" has to hold over every resident before anyone else's
  // overflow is allowed to compete for the same room.
  const homeless: (typeof roster.citizens)[number][] = [];
  for (const citizen of roster.citizens) {
    const homeId = citizen.home_node_id;
    if (homeId && (room.get(homeId) ?? 0) > 0) {
      seat(citizen, homeId);
    } else {
      homeless.push(citizen);
    }
  }

  // PASS 2 — the crowd with nowhere of their own left, nearest surviving room to where their own
  // door would have been.
  for (const citizen of homeless) {
    const homeId = citizen.home_node_id;
    // Anchored on their own home even when it is gone or full, so a settlement retreats rather
    // than reshuffles: somebody whose house the frost took crowds into the nearest neighbour's.
    const anchor = (homeId ? centres.get(homeId) : undefined) ?? { x: 0, z: 0 };
    let chosen: string | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    for (const placed of order) {
      if ((room.get(placed.nodeId) ?? 0) <= 0) {
        continue;
      }
      const at = centres.get(placed.nodeId) as GroundPoint;
      const distance = (at.x - anchor.x) ** 2 + (at.z - anchor.z) ** 2;
      if (distance < nearest) {
        nearest = distance;
        chosen = placed.nodeId;
      }
    }
    if (chosen === null) {
      outside.push(citizen.id);
      continue;
    }
    seat(citizen, chosen);
  }

  const crowdByNode = new Map<string, string[]>();
  for (const citizen of roster.citizens) {
    const nodeId = indoors.get(citizen.id);
    if (nodeId === undefined) {
      continue;
    }
    const crowd = crowdByNode.get(nodeId);
    if (crowd) {
      crowd.push(citizen.id);
    } else {
      crowdByNode.set(nodeId, [citizen.id]);
    }
  }

  return { indoors, crowdByNode, outside, places };
}

/* -------------------------------------------------------------------------- */
/* The doorway a shelter's crowd stands in                                    */
/* -------------------------------------------------------------------------- */

/**
 * A plot's LEE FACE: the wall a crowd shelters against, as a threshold rather than a bearing.
 *
 * **WHY A FACE AND NOT A RADIUS.** The fair-weather doorstep is a bearing at a radius
 * (`buildingApronPoint`), which is right when the job is to find whichever side of a building
 * is open. It cannot express a threshold: on a diagonal bearing a fixed radius lands inside the
 * plot on a 2x2 and outside it on a 1x1, so "just inside the wall" would mean a different place
 * on every building and every rotation. A ray-versus-rectangle crossing gives the actual face,
 * its actual extent and its actual inward normal, which is what a doorway needs.
 */
export interface ShelterWall {
  /** Where the lee bearing crosses the plot boundary: the middle of the threshold. */
  readonly at: GroundPoint;
  /** Unit vector ALONG the face, so a crowd lays out against the wall rather than round it. */
  readonly along: GroundPoint;
  /** Unit vector INTO the plot, so a step over the threshold is a step along this. */
  readonly inward: GroundPoint;
  /** Half the face's length in units, so a crowd can be spread without rounding a corner. */
  readonly half: number;
}

/**
 * Which wall of `placed` faces away from `bearing`, and where its threshold is.
 *
 * `bearing` is the direction the crowd is sheltering TOWARD — away from the nearest cold cell —
 * so the face it crosses is the one with the building between the people and the weather.
 */
export function shelterWall(placed: PlacedTransform, bearing: number): ShelterWall {
  const footprint = footprintFor(placed.nodeId);
  const centre = transformCenter(placed, footprint);
  // The plot as it SITS: `transformCenter` already rotates, so the half-extents must too, or a
  // quarter-turned 2x1 would be given its unrotated face and put its crowd through a wall.
  const spanX = (((placed.rot % 2) + 2) % 2 === 1 ? footprint.d : footprint.w) * GRID_CELL;
  const spanZ = (((placed.rot % 2) + 2) % 2 === 1 ? footprint.w : footprint.d) * GRID_CELL;
  const halfX = spanX / 2;
  const halfZ = spanZ / 2;
  const dirX = Math.cos(bearing);
  const dirZ = Math.sin(bearing);
  const reachX = Math.abs(dirX) > 1e-9 ? halfX / Math.abs(dirX) : Number.POSITIVE_INFINITY;
  const reachZ = Math.abs(dirZ) > 1e-9 ? halfZ / Math.abs(dirZ) : Number.POSITIVE_INFINITY;
  if (reachX <= reachZ) {
    const side = dirX >= 0 ? 1 : -1;
    return {
      at: { x: centre.x + side * halfX, z: centre.z },
      along: { x: 0, z: 1 },
      inward: { x: -side, z: 0 },
      half: halfZ,
    };
  }
  const side = dirZ >= 0 ? 1 : -1;
  return {
    at: { x: centre.x, z: centre.z + side * halfZ },
    along: { x: 1, z: 0 },
    inward: { x: 0, z: -side },
    half: halfX,
  };
}
