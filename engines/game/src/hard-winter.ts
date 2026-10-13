import {
  type EraId,
  eraBuildableRadius,
  getEraOrThrow,
  LAND_GRID_CELL,
} from "@cr/skill-graph";

import { createSeededRng, mixSeed } from "./citizens-rng";
import {
  type CrisisDamageReport,
  type CrisisRepairPrices,
  NO_CRISIS_RUIN,
} from "./crisis-damage";
import {
  HARD_WINTER,
  WINTER_TIERS,
  type WinterActionTier,
  type WinterBuildingPlacement,
  type WinterLayout,
  type WinterPayoutBand,
} from "./hard-winter-tuning";

/**
 * THE HARD WINTER — era one's mid-era crisis encounter. Pure, framework-free, and
 * neither a mastery-evidence source nor a progression gate.
 *
 * Every tunable number is in `hard-winter-tuning.ts`. This file holds only rules.
 *
 * ## What this is, and why it is not the era trial
 *
 * `era-trial.ts` is the END-of-era gate: one batch, one ratio, pass or don't, and the
 * one ratified progression write in the contract. The winter is the MIDDLE of an era
 * and answers a different question — not "has this learner finished" but "what will
 * they do with what they know". So almost nothing about the trial's shape transfers:
 *
 *  - the trial is COVERAGE (every era node, `ERA_TRIAL_ITEMS_PER_NODE`), because it
 *    reports which skills were missed. The winter reports nothing about skills, so it
 *    samples cumulatively across whatever the learner has reached so far, which is what
 *    lets one mechanic scale across ten eras without a rule change;
 *  - the trial has ONE outcome bit. The winter has an island's worth of state, and two
 *    learners with identical accuracy are expected to reach different outcomes — that
 *    is the design's own success test;
 *  - the trial's accuracy decides WHETHER. The winter's accuracy decides HOW MUCH: the
 *    player commits to an action before the batch, and the batch scales it.
 *
 * What IS reused rather than re-derived: the fail-loud composition discipline
 * (`composeHardWinterBatch` refuses a short draw instead of serving a smaller
 * encounter), the "correctness arrives as the authoritative checker's verdict, supplied
 * by the caller" rule, the round-robin draw shape from `selectStormPrompts`, and the
 * era registry as the single source of truth for what land exists.
 *
 * ## Two rulings carried as types, not as prose
 *
 * `HardWinterOutcome.writes_mastery` and `.gates_progression` are the literal type
 * `false`, following `EraTrialResult.can_retry: true`. Nothing here calls
 * `submitAssessmentEvidence`, reads or writes `mastery` or `placement_estimate`, grades
 * an answer, or clears a checkpoint. A learner answering under pressure with a declared
 * action riding on it may underperform relative to calm practice, so the winter's
 * answers are graded honestly and then thrown away; feeding mastery later is a
 * deliberate decision to take once the encounter is known to be fair.
 *
 * ## There is no clock anywhere in this module
 *
 * No wall-clock read of any kind, no elapsed-time field, and no unseeded randomness. A
 * round advances on an EVENT and on nothing else, which is what makes the whole encounter
 * replayable from its event list and unfarmable by idling. The repo has ruled twice
 * against time-based mechanics — INV-ERA-3 forbids anything keyed to elapsed wall-clock
 * time, and the resource design forbids passive accrual — and
 * `test/hardWinterClockless.test.ts` sweeps this module AND the playable surface for the
 * tokens rather than trusting this paragraph.
 *
 * ## ⚑ THE ISLAND IS NO LONGER WHAT KEEPS THIS ENCOUNTER IN ERA ONE
 *
 * It used to be. `hardWinterIsland` opens with `eraBuildableRadius`, which threw for nine of
 * the ten eras while era one alone had an authored land budget, so pointing the encounter at
 * another era was a thrown error rather than an empty grid or borrowed land. **All ten budgets
 * are authored now** (D-ERA25), so this builds a real island for every era: 88 cells for era
 * one and up to 936 for era ten, each from that era's own radius.
 *
 * **That fence is therefore GONE, and nothing in this module replaces it.** What still keeps
 * the encounter era one's is content the engine cannot see: the question pool is
 * `D1_PRACTICE_ITEMS` and the roster and tuning are era one's, which is asserted where those
 * live (`apps/web/src/winter/crisisEra.test.tsx`, the census over the real item pool). Read
 * this as a warning for whoever repoints a call site: `hardWinterIsland(anyEra)` now succeeds,
 * so an era with no items will produce a board and then fail to draw a question, and the
 * failure will be further from its cause than it used to be.
 *
 * The fail-loud discipline that survives is narrower: an id that is not an era still stops,
 * through `getEraOrThrow`.
 */

/* -------------------------------------------------------------------------- */
/* Cells and the island                                                       */
/* -------------------------------------------------------------------------- */

/** A grid cell on the winter island. Integer column/row, origin at the centre. */
export interface WinterCell {
  readonly col: number;
  readonly row: number;
}

/**
 * The canonical string form of a cell, `"col,row"`. Cells travel as keys inside the
 * state so it stays plain comparable data: two states with the same frozen ground are
 * deep-equal, which is what makes the replay and monotonicity assertions possible.
 */
export type WinterCellKey = string;

export function winterCellKey(col: number, row: number): WinterCellKey {
  return `${col},${row}`;
}

export function parseWinterCellKey(key: WinterCellKey): WinterCell {
  const [col, row] = key.split(",");
  return { col: Number(col), row: Number(row) };
}

/** The ground the winter is fought over: which cells are land, and how deep each is. */
export interface WinterIsland {
  readonly era: EraId;
  readonly buildable_radius: number;
  readonly grid_cell: number;
  /** Every land cell, in a stable row-major order. */
  readonly cells: readonly WinterCellKey[];
  /**
   * Orthogonal steps from the nearest water. `0` is the shoreline — the ring the frost
   * takes first — and `max_rim_depth` is the heart of the settlement.
   */
  readonly rim_depth: ReadonlyMap<WinterCellKey, number>;
  readonly max_rim_depth: number;
  /** Inclusive bounding box of the land, for a renderer that wants a rectangle. */
  readonly bounds: {
    readonly min_col: number;
    readonly max_col: number;
    readonly min_row: number;
    readonly max_row: number;
  };
}

/** The four orthogonal neighbours of a cell. */
function orthogonalNeighbours(col: number, row: number): readonly WinterCell[] {
  return [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ];
}

const islandCache = new Map<EraId, WinterIsland>();

/**
 * Derive an era's winter island from the registry, or THROW.
 *
 * The land is exactly `isCellBuildable`'s rule (`apps/web/src/city/worldLayout.ts`) — a
 * cell counts when its CENTRE, at `(index + 0.5) * LAND_GRID_CELL`, lies within the
 * era's authored radius — so the grid the player fights on is era one's real island,
 * cell for cell: 88 cells, matching `buildableCellCount(22)` and the era design's own
 * table. It is re-derived here rather than imported because `packages/` and `engines/`
 * cannot import `apps/` (TS6059), the same forced mirror `LAND_GRID_CELL` documents.
 *
 * RIM DEPTH IS ORTHOGONAL, and that is a measured choice rather than a default. Frost
 * creeps along the ground edge to edge, and over era one's disc the orthogonal metric
 * gives five depth bands (28, 24, 20, 12 and 4 cells) against the diagonal metric's
 * four (36, 28, 20, 4). The freeze timetable the whole action economy is tuned against
 * is those bands, so losing one flattens it. Fires ward a EUCLIDEAN DISC instead
 * (`winterWardOffsets`), so the two metrics are deliberately different and each is named
 * where it is used.
 *
 * Cached per era: the island is a pure function of authored data and is walked on every
 * frost advance.
 */
export function hardWinterIsland(eraId: EraId): WinterIsland {
  const cached = islandCache.get(eraId);
  if (cached) {
    return cached;
  }

  // Every era's budget is authored now, so this no longer fences the encounter to era one;
  // see the header. It still stops an era id that is not one, before an empty grid exists.
  const radius = eraBuildableRadius(eraId);
  // Confirms the era exists at all, and is the same read `era-trial.ts` opens with.
  getEraOrThrow(eraId);

  const reach = Math.ceil(radius / LAND_GRID_CELL) + 1;
  const land = new Set<WinterCellKey>();
  const cells: WinterCellKey[] = [];
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;
  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;

  for (let row = -reach; row <= reach; row += 1) {
    for (let col = -reach; col <= reach; col += 1) {
      const x = (col + 0.5) * LAND_GRID_CELL;
      const z = (row + 0.5) * LAND_GRID_CELL;
      if (Math.hypot(x, z) > radius) {
        continue;
      }
      const key = winterCellKey(col, row);
      land.add(key);
      cells.push(key);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
    }
  }

  if (cells.length === 0) {
    throw new Error(
      `Era "${eraId}" resolves to an island with no cells at radius ${radius}. A ` +
        `zero-cell winter would freeze nothing and end flawless, which is a pass on ` +
        `an encounter that never happened.`,
    );
  }

  // Breadth-first from the shoreline inward: depth 0 is every land cell with a water
  // neighbour, and each further ring is one orthogonal step deeper.
  const rimDepth = new Map<WinterCellKey, number>();
  const queue: WinterCell[] = [];
  for (const key of cells) {
    const { col, row } = parseWinterCellKey(key);
    const onShore = orthogonalNeighbours(col, row).some(
      (n) => !land.has(winterCellKey(n.col, n.row)),
    );
    if (onShore) {
      rimDepth.set(key, 0);
      queue.push({ col, row });
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head] as WinterCell;
    const depth = rimDepth.get(winterCellKey(cell.col, cell.row)) as number;
    for (const next of orthogonalNeighbours(cell.col, cell.row)) {
      const key = winterCellKey(next.col, next.row);
      if (land.has(key) && !rimDepth.has(key)) {
        rimDepth.set(key, depth + 1);
        queue.push(next);
      }
    }
  }

  const island: WinterIsland = {
    era: eraId,
    buildable_radius: radius,
    grid_cell: LAND_GRID_CELL,
    cells,
    rim_depth: rimDepth,
    max_rim_depth: Math.max(...rimDepth.values()),
    bounds: { min_col: minCol, max_col: maxCol, min_row: minRow, max_row: maxRow },
  };
  islandCache.set(eraId, island);
  return island;
}

/* -------------------------------------------------------------------------- */
/* The accuracy ladder                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The tier a batch earned. Reads the tuning ladder strongest-first, so the table is the
 * only thing that decides a magnitude and a retune cannot be routed around here.
 *
 * Fail-loud on an impossible score: a `correct` above `asked` would resolve `strong` off
 * a ratio above 1, which is the one way a caller could hand this function a magnitude it
 * did not earn.
 */
export function winterTierFor(correct: number, asked: number): WinterActionTier {
  if (!Number.isInteger(correct) || !Number.isInteger(asked) || asked <= 0) {
    throw new Error(
      `A hard-winter batch needs whole non-negative answers over a positive count ` +
        `(got ${correct} of ${asked}).`,
    );
  }
  if (correct < 0 || correct > asked) {
    throw new Error(
      `A hard-winter batch cannot score ${correct} of ${asked}: the tier is a ratio of ` +
        `what was asked, so an out-of-range score would buy a magnitude nobody earned.`,
    );
  }

  const ratio = correct / asked;
  for (const rung of HARD_WINTER.tiers) {
    if (ratio >= rung.min_ratio) {
      return rung.tier;
    }
  }
  // Unreachable while the ladder has a rung at ratio 0, which `hard-winter.test.ts`
  // asserts. Carried as a total-function guarantee rather than as covered ground.
  return "none";
}

/**
 * The tier's rung, weakest at 0 — the number "a declared action cannot exceed its
 * accuracy tier" is expressed in.
 *
 * Read off `WINTER_TIERS` rather than off the tuning ladder's row order, so reordering
 * the ladder's rows (a plausible retune) cannot silently invert the comparison.
 */
export function winterTierRank(tier: WinterActionTier): number {
  return WINTER_TIERS.indexOf(tier);
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * **WHAT THE PLAYER COMMITS TO BEFORE THE BATCH. TWO SHAPES, AND THAT IS A RULING.**
 *
 * Hold an area, or harden a thing. The lead, 2026-08-02: *"the give up ground option is
 * incredibly confusing - just discard it completely and keep it to two options."*
 *
 * **THE UNION IS THE ENFORCEMENT, not a comment.** `CRISIS_ACTION_TERMS` in
 * `apps/web/src/city/crisisCall.ts` is a `Record<WinterActionKind, CrisisTerm>` derived from
 * this type, so an action that leaves this union fails to COMPILE until its briefing line
 * comes out, and one that joins it fails to compile until it is described. That is how the
 * mend line came out on 2026-07-31 and how the pull-back line came out on 2026-08-02; a
 * written-down list of three would have gone on describing a board with three choices on it.
 *
 * ## Two removals, both by ruling, and they are different removals
 *
 *  - **`repair` (2026-07-31)** took damage back off a building already marked. Ruled a
 *    dominated choice dressed as a decision: it spent a whole round undoing harm the frost had
 *    already done while the frost advanced anyway. Measured rather than assumed — the recovery
 *    bill at 0, 1, 2 and 3 right answers was 390, 270, 160 and 30 with or without it, identical
 *    to the digit, because a shield raised before a bite absorbs the bite outright.
 *  - **`abandon` (2026-08-02)** pulled everyone in off the outermost surviving ring, shielding
 *    everything still inside and giving that ring up for good. Ruled out on LEGIBILITY rather
 *    than on dominance, which is why there is no measurement to quote for it: it was the only
 *    action that cost the player something unconditionally, the only one whose cost was
 *    denominated in ground rather than in buildings, and the only one that could ruin a
 *    building outright with no frost involved. Its own docblock in `hard-winter-tuning.ts` had
 *    grown to a hundred lines pricing an exploit and resolving a contradiction with the failure
 *    floor, which is a fair measure of how much explaining a third option needed.
 *
 * EVERY ONE OF WHAT IS LEFT ACTS ON THE FUTURE, and that is now the whole action set rather
 * than a narrowing of it. The consequence is that `WinterBuilding.damage` is MONOTONE inside a
 * winter — see its own note, and `hard-winter-difficulty.test.ts`'s *"no action takes damage
 * back off"*, whose population is total over this union so it cannot fall behind it.
 *
 * **WHAT WENT WITH `abandon`, so a reader does not go looking for it:** `HARD_WINTER.abandon`,
 * `HardWinterState.abandoned_through`, `WinterResolution.given_up` and `.abandoned_ring`,
 * `ruined_by: "abandoned"`, `WinterCellView.abandoned` and `.preview_abandon`,
 * `hardWinterAbandonPreview`, `winterRuinedGround`, and the outcome's `ruined_cells`,
 * `held_cells` and `reclaim_cost`. **What did NOT go, because it is load-bearing elsewhere:**
 * `HARD_WINTER.reclaim_cost_per_cell` and `hardWinterRepairPrices().per_cell`, which the city's
 * ground-repair path charges for scars persisted in `CrisisDamage.ruined_cells` — including
 * scars already saved by cities that played a winter before this change. That constant carries
 * the reasoning.
 */
export type WinterAction =
  | { readonly kind: "fire"; readonly col: number; readonly row: number }
  | { readonly kind: "reinforce"; readonly node_id: string };

export type WinterActionKind = WinterAction["kind"];

/**
 * A fire on the ground. `radius` is `null` for a fire that never caught (tier `none`).
 *
 * **THREE STATES, AND A SPENT ONE IS NOT A DELETION.** `closeRound` used to filter a fire out of
 * `state.fires` the moment its `rounds_left` reached zero, so `fires` ran `[{3}] -> [{2}] ->
 * [{1}] -> []` and a hearth that had done its work was indistinguishable from ground nobody ever
 * lit anything on. The lead's ruling (2026-08-02) is that those are different states and the
 * board owes both: *"this fire did its work and is done"* against *"no fire was ever here"*, and
 * a player deciding where to light the next one needs to tell them apart. So a spent hearth stays
 * where it was laid, with `rounds_left: 0`, until the winter ends.
 *
 * Read the state through {@link winterFireState} rather than off the two fields, which is what
 * stops a consumer inventing a fourth reading of them. `rounds_left` is FUEL and is floored at
 * zero, never run negative: a spent fire cannot owe rounds.
 *
 * There is at most ONE fire per cell — see `applyResolution`'s fire case.
 */
export interface WinterFire {
  readonly col: number;
  readonly row: number;
  readonly radius: number | null;
  readonly rounds_left: number;
  readonly lit_in_round: number;
}

/**
 * **WHAT A HEARTH ON THE BOARD IS DOING**, and the whole of the vocabulary for it.
 *
 *  - `burning` — it caught and has fuel left. The only state that wards any ground.
 *  - `spent` — it caught, it did its work, and its fuel is gone. Wards nothing; the ochre ground
 *    it was holding closes over again by frost, which is the reversion the brief asks to be
 *    legible as *the same hearth in a later state*.
 *  - `never_caught` — a declaration at tier `none`: a real laid hearth that bought nothing, and
 *    it never becomes `spent`, because a fire that never lit has burnt nothing. This is why the
 *    state is read off `radius` FIRST: `burn_rounds_by_tier.none` is 1, so an unlit hearth is at
 *    `rounds_left: 0` from the end of the round it was declared in, and a reading that asked
 *    about the fuel first would report every failed declaration as a fire that had burnt out.
 *
 * The board's fourth state, `proposed`, is not a state of a `WinterFire` at all — nothing has
 * been declared yet, so there is no fire — and it lives with the preview (`hardWinterFirePreview`,
 * and the renderer's ghost hearth).
 *
 * Carried as a const array as well as a union, on `WINTER_TIERS`' precedent, so a sweep can
 * enumerate the states rather than write them down: a renderer guard that draws "every state" has
 * to fail when a fourth is added, and it can only do that if the list is readable at runtime.
 */
export const WINTER_FIRE_STATES = ["burning", "spent", "never_caught"] as const;

export type WinterFireState = (typeof WINTER_FIRE_STATES)[number];

export function winterFireState(fire: WinterFire): WinterFireState {
  if (fire.radius === null) {
    return "never_caught";
  }
  return fire.rounds_left > 0 ? "burning" : "spent";
}

/**
 * Whether this fire is holding any ground at all — the ONE question every consumer that counts
 * fires, wards cells or narrates a board is actually asking.
 *
 * It exists as a function because it was written out by hand in four places before a spent
 * hearth could exist, and the moment one could, every hand-rolled copy that had forgotten the
 * `rounds_left` half became a fire the board reported as burning while it warded nothing.
 *
 * It NARROWS, which is what lets a caller reach `radius` afterwards without a second null check —
 * the compiler is then the thing keeping the two halves of "burning" together, rather than the
 * caller remembering that one implies the other.
 */
export function winterFireIsBurning(
  fire: WinterFire,
): fire is WinterFire & { readonly radius: number } {
  return winterFireState(fire) === "burning";
}

/** One of the era's buildings, and how the winter has treated it. */
export interface WinterBuilding {
  readonly node_id: string;
  readonly col: number;
  readonly row: number;
  readonly rim_depth: number;
  readonly state: "standing" | "ruin";
  /**
   * **DAMAGE POINTS TAKEN, and the number that decides whether it stands.**
   *
   * MONOTONE INSIDE A WINTER: a cold round adds `winterDamageBite(round)` and nothing in
   * the encounter takes any away. That is stronger than it used to be — the `repair` action
   * lowered it until the lead ruled the action out — and the counter-play it removes is
   * bought back by where the harm is answered rather than lost: a shield raised before a
   * bite absorbs the bite outright, so damage is prevented in the round rather than undone
   * in the next one, and what is left standing at the end is repairable on the island for
   * `HARD_WINTER.damage.repair_cost_per_point` a point.
   *
   * At `HARD_WINTER.damage.ruin_at` the building is a ruin, and its damage stops there: ruin
   * is the end of the scale rather than a step past it, which is what makes the repair bill
   * continuous with the rebuild bill.
   */
  readonly damage: number;
  /**
   * Damage points the frost spends BEFORE it marks the building, bought by reinforcing.
   * Consumed as it absorbs; see `HARD_WINTER.reinforce` for why a shield absorbs rather than
   * raising the ruin threshold, and why at `HARD_WINTER.damage.ruin_at: 1` it is the only thing
   * between a building and a ruin.
   */
  readonly shield: number;
  /**
   * Cold rounds absorbed so far, CUMULATIVE, and NARRATION ONLY — the ruin is decided by
   * `damage`. A warm round pauses this and never lowers it: the building was cold, and
   * nothing later in the winter unmakes the winter it had.
   */
  readonly cold_rounds: number;
  /** Round it fell, or `null` while it stands. */
  readonly ruined_in_round: number | null;
  /**
   * Why it fell. **THE FROST IS THE ONLY CAUSE THERE IS**, since the give-up-ground action was
   * ruled out on 2026-08-02 (see {@link WinterAction}); the union used to carry `"abandoned"`
   * beside it. Kept as a union of one rather than folded into `ruined_in_round` so that a second
   * cause has somewhere to go, and so a consumer that switches on it stops compiling when one
   * arrives rather than silently reading every ruin as cold.
   */
  readonly ruined_by: "cold" | null;
}

/** Damage points this building can still absorb before it is a ruin, shield included. */
export function winterDamageBudget(building: WinterBuilding): number {
  return HARD_WINTER.damage.ruin_at - building.damage + building.shield;
}

/**
 * Points a STANDING building has left to mend, which is what the island's post-winter
 * repair acts on. A ruin reports zero because it is rebuilt rather than mended.
 */
export function winterMendableDamage(building: WinterBuilding): number {
  return building.state === "ruin" ? 0 : building.damage;
}

/**
 * How hard an unsheltered cold round bites in `round`, in damage points.
 *
 * Same shape as `winterSpreadSteps`, deliberately: the frost takes more GROUND late in the
 * winter and does more HARM per cold round late in the winter, and one formula written
 * twice would be two places for the back half to stop feeling different from the front.
 */
export function winterDamageBite(round: number): number {
  const { base, step, accelerate_every } = HARD_WINTER.damage.bite;
  return base + step * Math.floor((round - 1) / accelerate_every);
}

/**
 * WHICH DAMAGED APPEARANCE A BUILDING WEARS: `0` for sound, up to
 * `HARD_WINTER.damage.stages` for a building one bite from the end, and `stages` again for
 * a ruin (a ruin has its own treatment, so the stage is the ceiling rather than a fourth
 * band).
 *
 * Bands are equal slices of `ruin_at`, so a retune of either number moves the read-out with
 * it. This exists so the surface never has to divide by a tuning constant of its own — a
 * board that disagreed with the rules about how hurt something is would be worse than a
 * board that showed nothing.
 *
 * AT THE SHIPPED `ruin_at: 2` THERE IS ONE DAMAGED APPEARANCE, not `stages` of them: the
 * table is `0 -> 0`, `1 -> 2`, `2 -> stages (a ruin)`, so a standing damaged building always
 * reads the middle band and the outer two are unreachable. That is the measured cost of the
 * 2026-08-01 `ruin_at` ruling and nothing to do with the round count, it is pinned as a census
 * in `hard-winter.test.ts`, and `HARD_WINTER.damage.stages` carries the reasoning.
 */
export function winterDamageStage(building: WinterBuilding): number {
  const { ruin_at, stages } = HARD_WINTER.damage;
  if (building.state === "ruin" || building.damage >= ruin_at) {
    return stages;
  }
  if (building.damage <= 0) {
    return 0;
  }
  return Math.min(stages, Math.ceil((building.damage / ruin_at) * stages));
}

/** What mending `points` of damage would cost, in the era's material. */
export function winterMendCost(points: number): number {
  return points * HARD_WINTER.damage.repair_cost_per_point;
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The encounter's phases. `declaring` -> `answering` -> `resolved` -> the next round's
 * `declaring`, or `ended`.
 *
 * The ordering IS the design. A declaration is locked the moment it is made, because
 * committing before you know how you will do is what makes the round a gamble rather
 * than a score; `hardWinterReducer` enforces that by ignoring a `declare` in any phase
 * but `declaring`.
 */
export type WinterPhase = "declaring" | "answering" | "resolved" | "ended";

/** What a resolved batch bought, kept so the surface can narrate the round it just played. */
export interface WinterResolution {
  readonly round: number;
  readonly action: WinterAction;
  readonly correct: number;
  readonly asked: number;
  readonly tier: WinterActionTier;
  /** Ward radius for a fire, shield points for a reinforce. `null` = nothing. */
  readonly magnitude: number | null;
  /** Buildings this resolution helped, by node id. */
  readonly helped: readonly string[];
}

/** One round, start to finish, for the round log the surface shows. */
export interface WinterRoundLog {
  readonly round: number;
  readonly resolution: WinterResolution;
  /** Cells the frost took at the end of this round. */
  readonly froze: number;
  /** Buildings that became ruins during this round, by node id. */
  readonly ruined: readonly string[];
  /**
   * Buildings the frost MARKED this round without finishing, by node id — the round's
   * near misses, and the half of the report that used to have nowhere to go.
   */
  readonly damaged: readonly string[];
  /** Damage points one unsheltered cold round cost this round. */
  readonly bite: number;
  /** Spread steps the frost took this round. */
  readonly spread_steps: number;
}

export interface HardWinterState {
  readonly era: EraId;
  /** 1-based. Never advances except through an `end_round` event. */
  readonly round: number;
  readonly rounds: number;
  readonly phase: WinterPhase;
  /** Frozen ground, sorted. MONOTONE: this set only ever grows. */
  readonly frozen: readonly WinterCellKey[];
  readonly fires: readonly WinterFire[];
  readonly buildings: readonly WinterBuilding[];
  /** The locked declaration awaiting a batch, or `null`. */
  readonly declared: WinterAction | null;
  readonly last_resolution: WinterResolution | null;
  readonly log: readonly WinterRoundLog[];
  readonly outcome: HardWinterOutcome | null;
}

/* -------------------------------------------------------------------------- */
/* Which city the winter falls on                                             */
/* -------------------------------------------------------------------------- */

/** Every authored layout, in table order. The first is the tuning baseline. */
export function winterLayouts(): readonly WinterLayout[] {
  return HARD_WINTER.layouts;
}

/** The layout `createHardWinter` uses when the caller names none. */
export function defaultWinterLayout(): WinterLayout {
  const first = HARD_WINTER.layouts[0];
  if (!first) {
    throw new Error(
      "The hard winter has no authored layouts, so there is no city for it to fall on.",
    );
  }
  return first;
}

export function winterLayoutById(id: string): WinterLayout {
  const found = HARD_WINTER.layouts.find((layout) => layout.id === id);
  if (!found) {
    throw new Error(
      `There is no authored hard-winter layout "${id}". A missing layout would silently ` +
        `fall back to another city's plan, which is the one way a tuning measurement ` +
        `could describe a board nobody played.`,
    );
  }
  return found;
}

/**
 * WHICH CITY THIS ENCOUNTER IS FOUGHT OVER — a seeded shuffled cycle over the authored
 * layouts, keyed to the 1-based encounter index.
 *
 * A SHUFFLED CYCLE rather than a draw, for the reason `selectStormPrompts` round-robins:
 * an independent random pick repeats, and a lead who presses "New winter" three times and
 * meets the same board twice learns nothing about the variance. Every block of
 * `layouts.length` encounters therefore plays every layout exactly once, and the order
 * within a block is shuffled from the block index, so the sequence is neither fixed nor
 * predictable-by-eye and is perfectly reproducible.
 *
 * THE SEED IS THE ENCOUNTER INDEX AND THE CALLER CANNOT SUPPLY ONE, which is the opposite
 * of `composeHardWinterBatch`'s rule and deliberate. There, fresh questions per round are
 * the anti-memorisation requirement, so the caller owns the seed. Here there is exactly
 * one correct seed — the encounter you are on — and an RNG parameter would be an open
 * invitation to pass a timestamp, which INV-ERA-3 forbids and
 * `test/hardWinterClockless.test.ts` sweeps for.
 */
export function winterLayoutFor(encounter: number): WinterLayout {
  if (!Number.isInteger(encounter) || encounter < 1) {
    throw new Error(
      `An encounter index must be a whole number from 1 (got ${encounter}), because it ` +
        `is the seed the layout cycle is shuffled from.`,
    );
  }

  const layouts = [...HARD_WINTER.layouts];
  if (layouts.length === 0) {
    throw new Error(
      "The hard winter has no authored layouts, so there is no city for it to fall on.",
    );
  }

  const index = encounter - 1;
  const block = Math.floor(index / layouts.length);
  shuffleInPlace(layouts, createSeededRng(mixSeed(block, 0x1cec01d)));
  return layouts[index % layouts.length] as WinterLayout;
}

export interface CreateHardWinterInput {
  readonly era: EraId;
  /**
   * Which buildings stand when winter falls. Defaults to the baseline layout's
   * (`defaultWinterLayout`); a caller with a partly-built city passes its own.
   */
  readonly buildings?: readonly WinterBuildingPlacement[];
}

/**
 * Open a winter. Nothing is frozen yet: the first frost advance happens at the END of
 * round one, after the player's first action resolves, so round one is a real decision
 * and not a cutscene.
 *
 * A placement off the island THROWS. A building standing in the sea has no rim depth,
 * so it could never freeze and would survive every winter — a silent immunity is worse
 * than a loud refusal.
 */
export function createHardWinter(input: CreateHardWinterInput): HardWinterState {
  const island = hardWinterIsland(input.era);
  const placements = input.buildings ?? defaultWinterLayout().buildings;

  const buildings = placements.map((placement) => {
    const depth = island.rim_depth.get(winterCellKey(placement.col, placement.row));
    if (depth === undefined) {
      throw new Error(
        `Building "${placement.node_id}" is placed at (${placement.col}, ${placement.row}), ` +
          `which is not on era "${input.era}"'s island. A building off the island has no ` +
          `rim depth, so the frost could never reach it.`,
      );
    }
    return {
      node_id: placement.node_id,
      col: placement.col,
      row: placement.row,
      rim_depth: depth,
      state: "standing",
      damage: 0,
      shield: 0,
      cold_rounds: 0,
      ruined_in_round: null,
      ruined_by: null,
    } satisfies WinterBuilding;
  });

  return {
    era: input.era,
    round: 1,
    rounds: HARD_WINTER.rounds,
    phase: "declaring",
    frozen: [],
    fires: [],
    buildings,
    declared: null,
    last_resolution: null,
    log: [],
    outcome: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Legality                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Why an action cannot be declared, or `null` when it can.
 *
 * This exists so an illegal choice costs a round NOTHING: the surface disables the
 * button and the reducer refuses the event, rather than letting the player burn their
 * one action of the round on a fire in the sea. A refusal is never a consequence here —
 * the consequences are all supposed to come from choices that were available.
 */
export function winterActionRefusal(
  state: HardWinterState,
  action: WinterAction,
): string | null {
  if (state.phase !== "declaring") {
    return `Nothing can be declared while the round is "${state.phase}".`;
  }

  const island = hardWinterIsland(state.era);

  switch (action.kind) {
    case "fire": {
      const key = winterCellKey(action.col, action.row);
      if (!island.rim_depth.has(key)) {
        return "A fire needs dry land: that cell is open water.";
      }
      // THE SECOND REFUSAL HERE IS GONE WITH THE PULL-BACK, not merely unreachable: it read
      // *"Nobody is left out there to tend a fire, that ring has been abandoned"*, and no ring
      // can be abandoned any more. Water is the only ground a fire can be refused on.
      return null;
    }
    case "reinforce": {
      const building = state.buildings.find((b) => b.node_id === action.node_id);
      if (!building) {
        return `There is no building "${action.node_id}" on this island.`;
      }
      if (building.state === "ruin") {
        return "A ruin cannot be reinforced. It can be rebuilt after the winter.";
      }
      return null;
    }
    default:
      return "Unknown action.";
  }
}

export function canDeclareWinterAction(
  state: HardWinterState,
  action: WinterAction,
): boolean {
  return winterActionRefusal(state, action) === null;
}

/* -------------------------------------------------------------------------- */
/* The reducer                                                                */
/* -------------------------------------------------------------------------- */

export type HardWinterEvent =
  /** Lock in this round's action, before any question is asked. */
  | { readonly type: "declare"; readonly action: WinterAction }
  /**
   * The batch came back. `correct` is the count the AUTHORITATIVE checker marked right,
   * supplied by the caller — this module never grades and never infers a verdict.
   */
  | { readonly type: "resolve"; readonly correct: number; readonly asked: number }
  /** Close the round: the frost advances, buildings suffer, fires burn down. */
  | { readonly type: "end_round" };

/**
 * Deterministic transitions. Time is never an input, in any form, and an out-of-phase
 * event returns the SAME STATE OBJECT rather than a copy — so "nothing but a round
 * transition advances state" is checkable by identity and not only by value.
 */
export function hardWinterReducer(
  state: HardWinterState,
  event: HardWinterEvent,
): HardWinterState {
  switch (event.type) {
    case "declare": {
      if (state.phase !== "declaring" || !canDeclareWinterAction(state, event.action)) {
        return state;
      }
      return { ...state, phase: "answering", declared: event.action };
    }

    case "resolve": {
      if (state.phase !== "answering" || state.declared === null) {
        return state;
      }
      return applyResolution(state, state.declared, event.correct, event.asked);
    }

    case "end_round": {
      if (state.phase !== "resolved" || state.last_resolution === null) {
        return state;
      }
      return closeRound(state, state.last_resolution);
    }

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* The ward footprint                                                         */
/* -------------------------------------------------------------------------- */

const wardOffsetCache = new Map<number, readonly WinterCell[]>();

/**
 * The cells a ward of `radius` covers, as offsets from the fire — a EUCLIDEAN DISC,
 * cell centre to cell centre, and the reason the fire is tunable at all.
 *
 * ## Why a disc and not the square this used to be
 *
 * A Chebyshev square has exactly one knob and it moves in enormous jumps: 1 cell, then
 * 9, then 25. Over era one's 88-cell island that is 1%, 10% and 28% of the whole board,
 * with nothing in between, so "the top tier covers too much" had no smaller setting than
 * "the top tier is now the middle tier". The knob, not the mechanic, was the problem.
 *
 * A disc fills the gaps in — 1, 5, 9, 13, 21, 29 at radius 0, 1, 1.5, 2, 2.5, 3 — which
 * is what makes `radius_by_tier` a real tuning dial rather than a three-position switch.
 * `HARD_WINTER.fire.radius_by_tier` carries the arithmetic for the rungs that are shipped
 * and the ones that are not.
 *
 * Two things recommend it beyond the arithmetic. Warmth radiates as a disc, so the shape
 * is the physical one; and the ISLAND is already defined by a Euclidean radius over cell
 * centres (`hardWinterIsland`, mirroring `isCellBuildable`), so the board and the fire
 * now measure distance the same way. The three shipped rungs also read as three
 * different SHAPES on the grid — a dot, a cross, a diamond — where three squares only
 * read as three sizes.
 *
 * Fractional radii are supported and deliberately so: 1.5 is the rung between the cross
 * and the diamond, and a retune should not have to change this function to reach it.
 */
export function winterWardOffsets(radius: number): readonly WinterCell[] {
  const cached = wardOffsetCache.get(radius);
  if (cached) {
    return cached;
  }
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error(
      `A ward radius must be a finite non-negative number (got ${radius}). A negative ` +
        `radius would ward nothing while reading as a lit fire.`,
    );
  }

  const span = Math.floor(radius);
  const offsets: WinterCell[] = [];
  for (let row = -span; row <= span; row += 1) {
    for (let col = -span; col <= span; col += 1) {
      if (col * col + row * row <= radius * radius) {
        offsets.push({ col, row });
      }
    }
  }
  wardOffsetCache.set(radius, offsets);
  return offsets;
}

/**
 * How many cells a ward of `radius` covers on OPEN GROUND, before the island clips it.
 * `null` (a fire that never caught) covers nothing.
 *
 * This is the number the tuning table's arithmetic is quoted in and the number the
 * surface's ladder shows, so both read it from here rather than from a formula written
 * twice. A fire lit near the shore covers fewer — see `hardWinterFirePreview`, which is
 * what the player actually sees before committing.
 */
export function winterWardArea(radius: number | null): number {
  return radius === null ? 0 : winterWardOffsets(radius).length;
}

/**
 * Cells a fire keeps warm this round: its disc, clipped to the island.
 *
 * A fire that is not BURNING wards nothing, which was true of this function before a spent hearth
 * could exist — it guarded `rounds_left <= 0` alongside the null radius, and that is the shape
 * {@link winterFireState} was extracted from. A spent hearth's held ground therefore closes over
 * on the round its fuel goes, through the frost's ordinary advance and with no second rule.
 */
function fireWard(fire: WinterFire, island: WinterIsland): WinterCellKey[] {
  if (!winterFireIsBurning(fire)) {
    return [];
  }
  const warded: WinterCellKey[] = [];
  for (const offset of winterWardOffsets(fire.radius)) {
    const key = winterCellKey(fire.col + offset.col, fire.row + offset.row);
    if (island.rim_depth.has(key)) {
      warded.push(key);
    }
  }
  return warded;
}

/**
 * The cells ONE live fire is keeping warm, clipped to the island.
 *
 * Separate from `wardedWinterCells` because the union cannot answer "how big is this
 * fire": two overlapping fires ward fewer cells than the sum of their footprints, and the
 * surface reports each fire's own size in the status panel. A fire lit near the shore is
 * genuinely smaller than the tuning table's figure, and saying so is the honest reading.
 */
export function winterFireWard(
  state: HardWinterState,
  fire: WinterFire,
): readonly WinterCellKey[] {
  return fireWard(fire, hardWinterIsland(state.era));
}

/** Every cell any live fire is keeping warm. */
export function wardedWinterCells(state: HardWinterState): ReadonlySet<WinterCellKey> {
  const island = hardWinterIsland(state.era);
  const warded = new Set<WinterCellKey>();
  for (const fire of state.fires) {
    for (const key of fireWard(fire, island)) {
      warded.add(key);
    }
  }
  return warded;
}

/**
 * What reclaiming scarred ground would cost, in the era's material.
 *
 * **NO WINTER CAN PRODUCE ANY.** The give-up-ground action was ruled out on 2026-08-02 (see
 * {@link WinterAction}), so the frost is the only thing that touches the island and the frost
 * thaws. This is kept for the CITY, which holds scars from `CrisisDamage.ruined_cells` — a
 * crisis-generic, persisted set that can carry scars saved by a winter played before that
 * ruling. See `HARD_WINTER.reclaim_cost_per_cell`.
 */
export function winterReclaimCost(scarredCells: number): number {
  return scarredCells * HARD_WINTER.reclaim_cost_per_cell;
}

/** What rebuilding `ruins` ruined buildings would cost, in the era's material. */
export function winterRebuildCost(ruins: number): number {
  return ruins * HARD_WINTER.rebuild_cost_per_ruin;
}

/**
 * **THE TWO AUTHORED REPAIR PRICES, in the shape the repair action reads them.**
 *
 * Both numbers come straight from `hard-winter-tuning.ts` and neither is re-authored here:
 * they were derived AGAINST EACH OTHER (twenty ruined cells cost what one ruined building
 * costs), so a copy of either would be a second place for the exchange rate to drift.
 * `hard-winter.test.ts` asserts that derivation rather than the digits.
 */
export function hardWinterRepairPrices(): CrisisRepairPrices {
  return {
    per_building: HARD_WINTER.rebuild_cost_per_ruin,
    per_cell: HARD_WINTER.reclaim_cost_per_cell,
  };
}

/**
 * **WHAT THIS WINTER DID TO THE CITY, as durable damage.**
 *
 * The seam the two halves of the crisis meet at: the reducer stays pure and this is a
 * projection of its state, so nothing about a winter's rules changes when a city starts
 * remembering one. Whether the projection is ever WRITTEN is the surface's decision (the
 * winter is a sandbox by default — see `apps/web/src/winter/liveCitySandbox.test.tsx`);
 * whether it is ACCURATE is this function's.
 *
 * Only the ruling's permitted damage crosses. Ruined buildings travel as node ids, so the
 * city keeps the placement, the mastery and the lesson; ruined ground travels as cells.
 * FROZEN ground deliberately does NOT: the frost is a season and it thaws, which is why
 * `frozen_cells` is reported and never billed, and a winter that left the whole island
 * scarred would be pricing weather.
 *
 * No `suspended_civic` yet, and that is the crisis and not the shape: the winter has no
 * notion of a civic building. The field is on {@link CrisisDamageReport} because the Lost
 * Herd is the crisis that locks capacity, and it must not need a second migration.
 */
export function hardWinterDamage(state: HardWinterState): CrisisDamageReport {
  return {
    buildings: state.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
    // NO GROUND CROSSES, AND NOW IT IS STRUCTURAL RATHER THAN CONDITIONAL. This read
    // `winterRuinedGround(state)`, which was non-empty exactly when the player had given a ring
    // up; that action was ruled out on 2026-08-02 (see {@link WinterAction}), so the frost is
    // the only thing that touches this island and the frost thaws. `NO_CRISIS_RUIN.cells` is
    // spread rather than an empty literal for the reason that constant gives: an empty literal
    // reads like a report nobody has filled in, and a crisis that starts scarring ground should
    // have to stop borrowing a refusal rather than quietly append to a list.
    cells: NO_CRISIS_RUIN.cells,
  };
}

/* -------------------------------------------------------------------------- */
/* What a fire here WOULD cover                                               */
/* -------------------------------------------------------------------------- */

/** One tier's footprint at a candidate cell — the ground it would hold, and what stands on it. */
export interface WinterFirePreviewBand {
  readonly tier: WinterActionTier;
  readonly radius: number;
  /** Land cells it would hold HERE, after the island clips the disc. */
  readonly cells: number;
  /** The same disc on open ground: the tuning table's own number, for comparison. */
  readonly cells_on_open_ground: number;
  /** Standing buildings it would reach, in authored order. */
  readonly buildings: readonly string[];
}

/**
 * WHAT EVERY TIER WOULD COVER FROM ONE CELL, so the geometry stops being a blind bet.
 *
 * The design's premise is that you declare before you know your accuracy. It was never
 * that you declare before you know your GEOMETRY: a player picking a cell was betting on
 * two unknowns at once, and only one of them is the mechanic. This resolves the second
 * one — pick a cell and you can see the dot, the cross and the diamond nested on the
 * board, and read off which buildings each one reaches — while leaving the first exactly
 * as sharp. You still do not know what you will earn. You now know what it would be
 * worth.
 *
 * `bands` runs WEAKEST FIRST and omits `none`, which has no radius and no footprint: a
 * fire that never caught is a real lit fire warding nothing, and there is no preview to
 * draw for it.
 *
 * `tier_by_cell` maps each covered land cell to the WEAKEST tier that reaches it, which
 * is the reading a player needs ("this cell is held from two of three") rather than the
 * set-per-tier the bands already carry. The bands are cumulative, so a cell in the weak
 * band is in all three.
 */
export interface WinterFirePreview {
  readonly col: number;
  readonly row: number;
  /** Weakest tier reaching each covered land cell. */
  readonly tier_by_cell: ReadonlyMap<WinterCellKey, WinterActionTier>;
  /** One band per tier that has a radius, weakest first. */
  readonly bands: readonly WinterFirePreviewBand[];
  /**
   * True when the GROUND would take a fire: land, and not a ring the settlement has given
   * up. Deliberately not `canDeclareWinterAction`, which also asks whether the round is
   * still open to declarations — a preview is a hypothetical, and "what would a fire here
   * hold" has the same answer whether or not this is the moment to light one.
   */
  readonly legal: boolean;
}

export function hardWinterFirePreview(
  state: HardWinterState,
  cell: WinterCell,
): WinterFirePreview {
  const island = hardWinterIsland(state.era);
  const standing = state.buildings.filter((b) => b.state === "standing");

  const tierByCell = new Map<WinterCellKey, WinterActionTier>();
  const bands: WinterFirePreviewBand[] = [];

  // Weakest first, so the first tier to reach a cell is the one recorded for it.
  for (const tier of WINTER_TIERS) {
    const radius = HARD_WINTER.fire.radius_by_tier[tier];
    if (radius === null) {
      continue;
    }
    const covered: WinterCellKey[] = [];
    for (const offset of winterWardOffsets(radius)) {
      const key = winterCellKey(cell.col + offset.col, cell.row + offset.row);
      if (!island.rim_depth.has(key)) {
        continue;
      }
      covered.push(key);
      if (!tierByCell.has(key)) {
        tierByCell.set(key, tier);
      }
    }
    const reach = new Set(covered);
    bands.push({
      tier,
      radius,
      cells: covered.length,
      cells_on_open_ground: winterWardArea(radius),
      buildings: standing
        .filter((b) => reach.has(winterCellKey(b.col, b.row)))
        .map((b) => b.node_id),
    });
  }

  const depth = island.rim_depth.get(winterCellKey(cell.col, cell.row));

  return {
    col: cell.col,
    row: cell.row,
    tier_by_cell: tierByCell,
    bands,
    legal: depth !== undefined,
  };
}

/**
 * Apply the declared action at the tier the batch earned, and move to `resolved`.
 *
 * The frost does NOT move here. Splitting the action's effect from the world's reaction
 * is what lets the surface show the player what their answers bought before showing them
 * what it cost — two beats, one round, and both of them driven by an event rather than
 * by anything elapsing.
 */
function applyResolution(
  state: HardWinterState,
  action: WinterAction,
  correct: number,
  asked: number,
): HardWinterState {
  const island = hardWinterIsland(state.era);
  const tier = winterTierFor(correct, asked);

  let buildings = state.buildings;
  let fires = state.fires;
  let magnitude: number | null = null;
  let helped: readonly string[] = [];

  switch (action.kind) {
    case "fire": {
      const radius = HARD_WINTER.fire.radius_by_tier[tier];
      magnitude = radius;
      const fire: WinterFire = {
        col: action.col,
        row: action.row,
        radius,
        rounds_left: HARD_WINTER.fire.burn_rounds_by_tier[tier],
        lit_in_round: state.round,
      };
      // ONE HEARTH PER CELL, and this is what a spent hearth staying on the board obliges. A
      // hearth is a place — nine laid stones — so lighting a fire where one already stands
      // RE-LIGHTS those stones rather than building a second ring inside them. Appending
      // regardless was harmless while every fire was eventually deleted; it is not now, because
      // a spent entry would sit under the new one for the rest of the winter and the board would
      // draw two hearths at one transform. The new fire is appended LAST, so "the fire this round
      // lit" is still the end of the list.
      fires = [
        ...state.fires.filter(
          (standing) => standing.col !== action.col || standing.row !== action.row,
        ),
        fire,
      ];
      const ward = new Set(fireWard(fire, island));
      helped = state.buildings
        .filter((b) => b.state === "standing" && ward.has(winterCellKey(b.col, b.row)))
        .map((b) => b.node_id);
      break;
    }

    case "reinforce": {
      const extra = HARD_WINTER.reinforce.shield_by_tier[tier];
      magnitude = extra;
      buildings = state.buildings.map((b) =>
        b.node_id === action.node_id && b.state === "standing"
          ? { ...b, shield: b.shield + extra }
          : b,
      );
      helped = extra > 0 ? [action.node_id] : [];
      break;
    }
  }

  const resolution: WinterResolution = {
    round: state.round,
    action,
    correct,
    asked,
    tier,
    magnitude,
    helped,
  };

  // NOTHING FREEZES HERE, and that used to have an exception. Giving up a ring handed the frost
  // the whole band at once and added it in this function rather than during the advance, so the
  // player saw the ground go the moment they chose to lose it. With that action gone
  // (see {@link WinterAction}) `closeRound` is the ONLY thing in the encounter that freezes
  // ground, which is a stronger version of the split this function's docblock describes: the
  // action's effect and the world's reaction now have no overlap at all.
  return {
    ...state,
    phase: "resolved",
    fires,
    buildings,
    declared: null,
    last_resolution: resolution,
  };
}

/** How many orthogonal steps the frost takes at the end of `round`. */
export function winterSpreadSteps(round: number): number {
  const { base, step, accelerate_every } = HARD_WINTER.spread;
  return base + step * Math.floor((round - 1) / accelerate_every);
}

/**
 * **THE FROST'S WHOLE ADVANCE RULE, IN THE ONE PLACE THAT OWNS IT.**
 *
 * An orthogonal flood from the shoreline inward, `steps` passes deep. A warded cell is not
 * merely skipped, it BLOCKS: it cannot freeze AND it cannot pass the frost on, which is what
 * makes a well-placed bonfire shelter the ground behind it and not only the ground under it.
 *
 * It is a function rather than a loop inside `closeRound` because {@link hardWinterView} has to
 * answer *"what does the frost take when this round closes"* — `WinterCellView.frost_next`, the
 * state the board needs so the threat is legible BEFORE it arrives. Written twice, the picture
 * and the rules would be two claims about the same timetable and only one of them would be
 * checked; written once, a renderer showing the wrong ground is a failure of the reducer's own
 * tests. `hard-winter.test.ts` asserts the identity in that direction: the cells the view
 * predicts are exactly the cells `end_round` then freezes.
 *
 * Returns a NEW set containing everything `frozen` held plus everything the advance takes, so
 * the caller can diff it against what it started with.
 */
export function winterFrostAfterAdvance(
  island: WinterIsland,
  frozen: ReadonlySet<WinterCellKey>,
  warded: ReadonlySet<WinterCellKey>,
  steps: number,
): Set<WinterCellKey> {
  const reached = new Set(frozen);
  for (let pass = 0; pass < steps; pass += 1) {
    const next: WinterCellKey[] = [];
    for (const key of island.cells) {
      if (reached.has(key) || warded.has(key)) {
        continue;
      }
      const { col, row } = parseWinterCellKey(key);
      const exposed =
        (island.rim_depth.get(key) as number) === 0 ||
        orthogonalNeighbours(col, row).some((n) => {
          const nk = winterCellKey(n.col, n.row);
          return reached.has(nk) && !warded.has(nk);
        });
      if (exposed) {
        next.push(key);
      }
    }
    for (const key of next) {
      reached.add(key);
    }
  }
  return reached;
}

/** Deduplicated, sorted cell list — so two equal grounds are deep-equal states. */
function sortedCells(keys: Iterable<WinterCellKey>): WinterCellKey[] {
  return [...new Set(keys)].sort();
}

/**
 * Close the round: the frost advances, buildings that stood cold absorb it, ruins are
 * made, fires burn down, and the round counter moves. The one transition that changes
 * the world, and the only one that changes `round`.
 *
 * Fires burning DOWN is not fires being removed — see the `fires` line below, and
 * {@link WinterFire}'s note on why a spent hearth is a state rather than a deletion.
 */
function closeRound(state: HardWinterState, resolution: WinterResolution): HardWinterState {
  const island = hardWinterIsland(state.era);
  const warded = wardedWinterCells(state);
  const steps = winterSpreadSteps(state.round);

  const before = state.frozen.length;
  // The advance itself is `winterFrostAfterAdvance`'s, so the board's own prediction
  // (`WinterCellView.frost_next`) and what actually happens here cannot disagree.
  const frozen = winterFrostAfterAdvance(island, new Set(state.frozen), warded, steps);

  // What one unsheltered cold round costs THIS round. Read once, so every building in the
  // settlement takes the same winter.
  const bite = winterDamageBite(state.round);

  const ruinedThisRound: string[] = [];
  const damagedThisRound: string[] = [];
  const buildings = state.buildings.map((building) => {
    if (building.state === "ruin") {
      return building;
    }
    const key = winterCellKey(building.col, building.row);
    const cold = frozen.has(key) && !warded.has(key);
    if (!cold) {
      return building;
    }

    // THE SHIELD IS SPENT FIRST, and what it absorbs never reaches the building. That is
    // the whole difference between reinforcing and repairing: a shield bought in time
    // leaves nothing to mend, and one bought late leaves the scar it arrived after.
    const absorbed = Math.min(building.shield, bite);
    const struck = bite - absorbed;
    const coldRounds = building.cold_rounds + 1;
    const damage = Math.min(HARD_WINTER.damage.ruin_at, building.damage + struck);

    if (damage >= HARD_WINTER.damage.ruin_at) {
      ruinedThisRound.push(building.node_id);
      return {
        ...building,
        shield: building.shield - absorbed,
        cold_rounds: coldRounds,
        damage,
        state: "ruin" as const,
        ruined_in_round: state.round,
        ruined_by: "cold" as const,
      };
    }
    if (struck > 0) {
      damagedThisRound.push(building.node_id);
    }
    return {
      ...building,
      shield: building.shield - absorbed,
      cold_rounds: coldRounds,
      damage,
    };
  });

  // THE FUEL BURNS DOWN AND THE HEARTH STAYS. A spent fire keeps its own object identity here
  // rather than being rebuilt at the same value every round, so a state that changed nothing but
  // the round counter is still deep-equal cheaply — and `rounds_left` floors at zero instead of
  // running negative, because it is fuel and nobody owes any.
  const fires = state.fires.map((fire) =>
    fire.rounds_left > 0 ? { ...fire, rounds_left: fire.rounds_left - 1 } : fire,
  );

  const log: WinterRoundLog[] = [
    ...state.log,
    {
      round: state.round,
      resolution,
      froze: frozen.size - before,
      ruined: ruinedThisRound,
      damaged: damagedThisRound,
      bite,
      spread_steps: steps,
    },
  ];

  const isLastRound = state.round >= state.rounds;
  const nextState: HardWinterState = {
    ...state,
    round: isLastRound ? state.round : state.round + 1,
    phase: isLastRound ? "ended" : "declaring",
    frozen: sortedCells(frozen),
    fires,
    buildings,
    last_resolution: resolution,
    log,
    outcome: null,
  };

  return isLastRound ? { ...nextState, outcome: hardWinterOutcome(nextState) } : nextState;
}

/* -------------------------------------------------------------------------- */
/* Outcome and payout                                                         */
/* -------------------------------------------------------------------------- */

/**
 * What a completed winter is worth. A DESCRIPTOR, not a write: the winter never touches
 * a wallet, and `packages/economy` is untouched by this feature.
 *
 * The seam it is shaped for is the economy's own earn-recipe pattern
 * (`packages/economy/src/earn.ts`): a server-verified event becomes a `GrantInput` for
 * `applyGrant`, keyed by a deterministic `event_id` so a replay is a no-op. To wire it,
 * `packages/economy` would need a `REASON_HARD_WINTER` constant, a `hardWinterEventId`
 * builder, an `EARN.hardWinter` row, and a `hardWinterGrant()` recipe reading those —
 * plus a ruling on whether the reason joins `CAPPED_REASONS`, since a winter is
 * repeatable per encounter and row 2 (`interleaved`) is capped for exactly that reason.
 */
export interface HardWinterPayout {
  readonly survived: number;
  readonly total: number;
  readonly survival_ratio: number;
  readonly xp: number;
  readonly gold: number;
  /** In the era's material. The caller resolves WHICH material (`materialForEra`). */
  readonly material: number;
  /** Paid because nothing was harmed — no building ruined, none scarred, no ground given up. */
  readonly flawless: boolean;
  /**
   * The idempotency key a grant would carry. Built to `buildEventId`'s scheme —
   * `kind:part:part`, colons as the only delimiter — but built HERE rather than by
   * importing the economy package, so this engine takes on no dependency in the
   * direction INV-COS-1 forbids. That invariant is enforced as a string scan over the
   * learning-path trees (`packages/economy/src/one-way-invariant.test.ts`), so the
   * module specifier is deliberately not written anywhere in this file either — which
   * is why the seam below is described rather than named in import form.
   */
  readonly event_id: string;
  readonly reason_code: "hard_winter";
}

export const HARD_WINTER_REASON_CODE = "hard_winter" as const;

/**
 * Scale the payout by what survived. Per-survivor rather than a fraction of a lump, so
 * the reward reads off the board: every building still standing is worth the same, and
 * saving the lot pays a bonus on top.
 *
 * `ruined_cells` AND `damage_points` ARE BOTH REQUIRED, WITH NO DEFAULTS, and that is the
 * point of the parameters rather than an oversight. A clean sweep means the settlement lost
 * NOTHING, and each of them is a way to lose something the survivor count cannot see:
 * abandoning spent ground, and the frost scarred buildings it did not finish. A bonus that
 * only looked at survivors would be the scoreboard endorsing both — all six saved by giving
 * up most of the island, or all six saved and four of them half wrecked, would read as
 * flawless. A caller who forgot either would reintroduce exactly that, silently, so there
 * is nowhere to forget them.
 *
 * **NEITHER CAN BE NON-ZERO AT THE 2026-08-02 TUNING, and they are still required.** The
 * give-up-ground action is gone and `damage.ruin_at: 1` leaves no standing scar, so every
 * caller passes 0 and 0 and every clean sweep is "every building standing". The parameters stay
 * because they are the RULING rather than the arithmetic: the moment a crisis scars ground or a
 * `ruin_at` with room in it comes back, a defaulted parameter would pay this bonus over a
 * wrecked settlement and nothing would have changed here to notice.
 *
 * The BANDS are untouched: same per-survivor row, same bonus row, same numbers. What
 * changed is what "nothing was ruined" means now that ground and condition can be.
 *
 * ## NOTHING DISPLAYS THIS AND NOTHING CREDITS IT, and that is a ruling rather than a gap
 *
 * The concluding screen used to read the three figures out (*"You earned N XP, N gold and N
 * material"*) over a ledger that never received them, and the lead cut the claim rather than
 * wiring the grant: the Hard Winter is a COST event, not an income one. Two standing rulings
 * decide it. Resources come from lesson completion and practice with no passive generation, and
 * the scarcity of the economy is deliberate; a crisis payout would be a third income source
 * nobody ruled for, on an encounter that otherwise costs material to repair.
 *
 * So this function has no surface caller by design. It is kept, exported and tested because it
 * is the DESIGNED SEAM — the bands, the clean-sweep rule and the idempotency key are decisions,
 * and deleting them would throw the decisions away rather than an unused line. The next reader
 * should not read the missing caller as an oversight and go and wire it up.
 */
export function hardWinterPayoutFor(input: {
  readonly era: EraId;
  readonly encounter_id: string;
  readonly survived: number;
  readonly total: number;
  /** Cells the settlement gave up for good. Zero is what makes a sweep clean. */
  readonly ruined_cells: number;
  /** Damage points standing on the survivors. Zero is the other half of clean. */
  readonly damage_points: number;
}): HardWinterPayout {
  if (input.encounter_id.length === 0 || input.encounter_id.includes(":")) {
    throw new Error(
      `A hard-winter encounter id must be non-empty and contain no ":" (got ` +
        `"${input.encounter_id}"), because it is a delimiter in the event id an ` +
        `economy grant would be keyed by.`,
    );
  }
  if (!Number.isInteger(input.ruined_cells) || input.ruined_cells < 0) {
    throw new Error(
      `A hard-winter payout needs a whole non-negative count of ruined cells (got ` +
        `${input.ruined_cells}). It decides the clean-sweep bonus, so a nonsense count ` +
        `would pay one for a ruined island.`,
    );
  }
  if (!Number.isInteger(input.damage_points) || input.damage_points < 0) {
    throw new Error(
      `A hard-winter payout needs a whole non-negative count of damage points (got ` +
        `${input.damage_points}). It decides the clean-sweep bonus, so a nonsense count ` +
        `would pay one for a settlement the frost had half wrecked.`,
    );
  }

  const flawless =
    input.total > 0 &&
    input.survived === input.total &&
    input.ruined_cells === 0 &&
    input.damage_points === 0;
  const band = (pick: (b: WinterPayoutBand) => number): number =>
    pick(HARD_WINTER.payout.per_survivor) * input.survived +
    (flawless ? pick(HARD_WINTER.payout.flawless_bonus) : 0);

  return {
    survived: input.survived,
    total: input.total,
    survival_ratio: input.total === 0 ? 0 : input.survived / input.total,
    xp: band((b) => b.xp),
    gold: band((b) => b.gold),
    material: band((b) => b.material),
    flawless,
    event_id: `${HARD_WINTER_REASON_CODE}:${input.era}:${input.encounter_id}`,
    reason_code: HARD_WINTER_REASON_CODE,
  };
}

/**
 * The end of winter. There is deliberately no `lost` and no `failed`: winter ends after
 * its rounds and you see what survived. A losable encounter would be the first dead end
 * in a codebase that has carefully avoided them, and ruins are consequence enough —
 * they are a distinct state, not a deletion, so the building is still there, still
 * carries its lesson, and can be rebuilt.
 */
export interface HardWinterOutcome {
  readonly era: EraId;
  readonly rounds: number;
  /** Node ids still standing, in the order they were authored. */
  readonly standing: readonly string[];
  /** Node ids that became ruins. */
  readonly ruined: readonly string[];
  /**
   * Node ids STANDING WITH A SCAR — the outcome the old model could not express, and the
   * reason a near miss is now a different ending from a clean one. A building here is
   * whole enough to keep, marked enough to cost something, and clickable either way.
   */
  readonly damaged: readonly string[];
  /** Damage points standing on the survivors, which is what `repair_cost` is priced off. */
  readonly damage_points: number;
  readonly survived: number;
  readonly total: number;
  readonly survival_ratio: number;
  /**
   * Ground under ice at the end. REPORTED AND NEVER BILLED: the frost is weather, it
   * takes most of the island every winter, and it thaws.
   */
  readonly frozen_cells: number;
  readonly island_cells: number;
  /**
   * The material a rebuild of every ruined BUILDING would cost.
   *
   * "Reported, never spent" was true of both bills until 2026-07-30. It is now what the
   * city's repair action actually charges, per ruin — this stays the WHOLE bill, which is
   * the running total a player reads, and no transaction here spends it.
   */
  readonly rebuild_cost: number;
  /**
   * The material mending every DAMAGED SURVIVOR would cost, at
   * `HARD_WINTER.damage.repair_cost_per_point` a point.
   *
   * **ALWAYS ZERO AT `HARD_WINTER.damage.ruin_at: 1`**, because there is no standing damaged
   * building for it to bill: a building either absorbs the round's bite into its shield or is a
   * ruin. That is the 2026-08-02 ruling and not a defect, and `hard-winter.test.ts` pins it as a
   * census rather than trusting the silence — a sweep over an empty ladder holds trivially.
   *
   * The bound it used to carry still holds and is still swept: the per-point price times
   * `ruin_at` is at most `rebuild_cost_per_ruin`, so no damaged building can cost more than a
   * ruin does. It was exactly equal at `ruin_at: 6`, 20 against 60 at 2, and is 10 against 60
   * at 1 — see `repair_cost_per_point`.
   */
  readonly repair_cost: number;
  /**
   * Both bills together: what putting the settlement back would cost.
   *
   * **IT WAS THREE UNTIL 2026-08-02**, and losing the third is the clearest single measure of
   * what that day's two rulings did to the encounter. `reclaim_cost` went with the
   * give-up-ground action, which was the only thing that could take land the winter did not
   * hand back; `repair_cost` is structurally zero at `ruin_at: 1`. So this is
   * `rebuild_cost_per_ruin` times the ruin count, and the finest difference two accuracy bands
   * can have is one whole rebuild.
   */
  readonly recovery_cost: number;
  /** The winter is not a mastery-evidence source. Carried as a type, not a comment. */
  readonly writes_mastery: false;
  /** The winter is not a gate. Non-gating for the prototype, by ruling. */
  readonly gates_progression: false;
}

export function hardWinterOutcome(state: HardWinterState): HardWinterOutcome {
  const island = hardWinterIsland(state.era);
  const standing = state.buildings.filter((b) => b.state === "standing");
  const ruined = state.buildings.filter((b) => b.state === "ruin");
  const damaged = standing.filter((b) => b.damage > 0);
  const damagePoints = damaged.reduce((total, b) => total + b.damage, 0);

  const rebuildCost = winterRebuildCost(ruined.length);
  const repairCost = winterMendCost(damagePoints);

  return {
    era: state.era,
    rounds: state.rounds,
    standing: standing.map((b) => b.node_id),
    ruined: ruined.map((b) => b.node_id),
    damaged: damaged.map((b) => b.node_id),
    damage_points: damagePoints,
    survived: standing.length,
    total: state.buildings.length,
    survival_ratio:
      state.buildings.length === 0 ? 0 : standing.length / state.buildings.length,
    frozen_cells: state.frozen.length,
    island_cells: island.cells.length,
    rebuild_cost: rebuildCost,
    repair_cost: repairCost,
    recovery_cost: rebuildCost + repairCost,
    writes_mastery: false,
    gates_progression: false,
  };
}

/* -------------------------------------------------------------------------- */
/* The question batch                                                         */
/* -------------------------------------------------------------------------- */

/**
 * An item the batch may draw. Structurally a subset of the item bank's `FrozenItem`, so
 * a caller passes authored items straight in and this module never imports
 * `@cr/item-bank` — the same deliberate decoupling `era-trial.ts` and `storm-battle.ts`
 * keep. Which pool an era draws from is a content decision and belongs to the caller.
 */
export interface WinterBatchCandidate {
  readonly item_version_id: string;
  readonly node_id: string;
  readonly prompt: string;
}

/** A drawn question. Carries no answer key: nothing here grades. */
export interface WinterBatchPrompt {
  readonly index: number;
  readonly node_id: string;
  readonly item_version_id: string;
  readonly prompt: string;
}

export type WinterBatchUnavailableReason = "nothing_mastered" | "pool_too_thin";

export type WinterBatchComposition =
  | {
      readonly status: "ready";
      readonly size: number;
      readonly prompts: readonly WinterBatchPrompt[];
    }
  | {
      readonly status: "unavailable";
      readonly reason: WinterBatchUnavailableReason;
      readonly wanted: number;
      readonly available: number;
      readonly message: string;
    };

export interface ComposeWinterBatchOptions {
  /** Batch length. Defaults to `HARD_WINTER.batch_size`. */
  readonly size?: number;
  /**
   * RNG in [0, 1). REQUIRED, with no `Math.random` fallback, which is a deliberate
   * departure from `era-trial.ts` and `storm-battle.ts` — both of which default.
   *
   * A default would be the one path in the whole encounter nobody could replay, and
   * replayability is load-bearing here for two separate reasons: the winter is a stateful
   * stateful encounter of several rounds that the lead is going to want to compare across tuning
   * passes, and an unseeded draw is the natural place for somebody to reach for
   * `Date.now()` as a seed. Making the caller supply one keeps `Math.random` out of the
   * feature entirely, which is what lets `test/hardWinterClockless.test.ts` sweep for it
   * with no exemptions. Fresh draws per round are still the anti-memorisation rule; they
   * come from varying the seed, not from leaving it to chance.
   */
  readonly rng: () => number;
  /**
   * WHICH SKILLS THIS ROUND PREFERS, strongest preference first — D-CRISIS-15's no-repeat
   * rule, supplied by the caller because it is a fact about the ENCOUNTER and this
   * function only ever sees one round of it. `winterSkillOrder` computes it.
   *
   * **A PREFERENCE AND NEVER A CONSTRAINT**, which D-CRISIS-15 requires in those words
   * and for a stated reason: INV-CRISIS-9 refuses a short batch rather than serving one,
   * and INV-CRISIS-3 says no round can be unplayable, so a no-repeat rule strict enough
   * to exhaust a thin window would produce no batch at all mid-crisis. So every eligible
   * node absent from this list is APPENDED rather than excluded, and an id here that is
   * not eligible is ignored. The list can reorder the draw; it can never shrink it.
   *
   * Omitted, the order is a seeded shuffle of `masteredNodeIds`. That is weaker than the
   * cycle — it gives no cross-round coverage guarantee — but it is what makes forgetting
   * to pass this a loss of fairness rather than a silent truncation, which is the defect
   * this parameter arrived with: the order used to be `masteredNodeIds` verbatim, and a
   * round-robin that stops at `size` can only ever reach the first `size` entries of it.
   */
  readonly skill_order?: readonly string[];
}

/**
 * THE ENCOUNTER'S SKILL SEQUENCE, as the slice of it this round should ask — D-CRISIS-15.
 *
 * **The rule.** *"A crisis does not re-ask one skill while others in its window go
 * untouched."* Without it a window is a claim about eligibility rather than about what a
 * player meets: era five's window holds thirteen eligible nodes against eighteen
 * questions, so an unconstrained draw can spend a whole crisis on a handful of skills.
 *
 * **The shape is a shuffled bag, and it is deliberately the shape already in the tree.**
 * `createInterleavedScheduler` keeps a bag of node ids so *"every node in the pool appears
 * once per shuffled cycle before any node repeats"*, and swaps the first slot when a cycle
 * boundary would repeat a skill. This is that bag, and the boundary swap is here too.
 * D-CRISIS-15 names it as the one to reuse, and it is reproduced rather than imported for
 * a structural reason: that scheduler lives in `apps/web` and takes `FrozenItem`s, and the
 * dependency runs app-on-engine. Reproducing the shape in the layer that owns the rule is
 * the only direction available; three copies would not be.
 *
 * **Derived from the round rather than remembered.** The bag has to span an encounter and
 * this module is a pure reducer with nowhere to keep one, so cycle `c` is shuffled from
 * `mixSeed(encounterSeed, c)` and round `r` reads the window at `(r - 1) * size`. Two
 * properties fall out that a remembered bag would not have for free: the whole sequence is
 * a function of `(encounterSeed, round)`, so INV-CRISIS-11's end-to-end replay still holds,
 * and a round can be recomputed without replaying the rounds before it.
 */
export function winterSkillOrder(input: {
  /** Every node the crisis may draw from this encounter. */
  readonly eligible: readonly string[];
  /** Stable across the rounds of ONE encounter, and different between encounters. */
  readonly encounterSeed: number;
  /** 1-based round index. */
  readonly round: number;
  /** How many the round will ask. Defaults to `HARD_WINTER.batch_size`. */
  readonly size?: number;
}): readonly string[] {
  const size = input.size ?? HARD_WINTER.batch_size;
  const eligible = [...new Set(input.eligible)];
  if (eligible.length === 0 || size <= 0) {
    return eligible;
  }

  const from = Math.max(0, Math.trunc(input.round) - 1) * size;
  // GENERATED FROM CYCLE ZERO, not from the cycle this round lands in, and that is a
  // correctness point rather than a cost one. The boundary swap needs the previous cycle's
  // last skill AFTER its own swap, so the state chains back to the first cycle: starting
  // mid-sequence made round two behave as if nothing came before it, which the boundary
  // assertion in `hard-winter-pool.test.ts` caught. An encounter is `HARD_WINTER.rounds`
  // long, so this is a handful of shuffles over a handful of ids.
  const sequence: string[] = [];
  let previous: string | null = null;
  for (let cycle = 0; sequence.length < from + size; ) {
    const bag = [...eligible];
    shuffleInPlace(bag, createSeededRng(mixSeed(input.encounterSeed, cycle + 1)));
    // The boundary swap, exactly as `createInterleavedScheduler` does it: a cycle that
    // would open on the skill the last one closed with hands that slot to another skill,
    // so no skill lands back-to-back across a boundary.
    if (bag.length > 1 && bag[0] === previous) {
      for (let index = 1; index < bag.length; index += 1) {
        if (bag[index] !== previous) {
          const held = bag[0] as string;
          bag[0] = bag[index] as string;
          bag[index] = held;
          break;
        }
      }
    }
    previous = bag[bag.length - 1] ?? null;
    sequence.push(...bag);
    cycle += 1;
  }

  const preferred = sequence.slice(from, from + size);
  // THE FALLBACK, and it is what keeps this a preference: every eligible node the window
  // did not name is appended, so a preferred node whose items are exhausted costs a
  // reorder rather than a refused round.
  const named = new Set(preferred);
  return [...preferred, ...eligible.filter((id) => !named.has(id))];
}

/** In-place Fisher-Yates using the supplied RNG (`rng()` in [0, 1)). */
function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const held = items[index] as T;
    items[index] = items[swap] as T;
    items[swap] = held;
  }
}

/**
 * Draw one round's batch, or REFUSE. There is no third outcome.
 *
 * WHY A SHORT DRAW IS REFUSED, and it is a different reason from the era trial's. The
 * trial refuses because its pass bar is a ratio of the denominator, so a thin pool
 * lowers the bar. Nothing here passes or fails — but the TIER is a ratio too, so a
 * two-item batch would resolve `strong` at two correct instead of three, and a thin
 * item pool would quietly hand out wider bonfires. The magnitude ladder has to sit on a
 * fixed denominator for "three of three" to mean anything.
 *
 * `masteredNodeIds` is the ELIGIBLE set for this encounter. Under D-CRISIS-14 that is a
 * three-era window sampled bucket-first, and under its named era-one exception it is
 * **100% of era one's own mastered nodes** — whichever of its six the learner has actually
 * reached. Era one is the only era whose land is authored (D-ERA25) and the only one with
 * authored items, so the era-one exception is the whole of what a shipped crisis needs and
 * the bucket weights have nothing to weigh; `hard-winter-pool.test.ts` pins both halves of
 * that, including which one is not implemented and why.
 *
 * Round-robins the eligible nodes, each group shuffled, so a batch spreads across skills
 * rather than clustering on one — the shape `selectStormPrompts` uses, for the same reason.
 *
 * **THE NODE ORDER IS NEVER THE CALLER'S ARRAY ORDER, and that is a fix rather than a
 * detail.** The round-robin stops the moment it has `size`, so taking the nodes in the
 * order handed over meant only the first `size` of them could ever be drawn: with six
 * eligible nodes and a batch of three, three skills were unreachable at every seed, and the
 * advisor's promise that the questions come from lessons the learner has done was true only
 * by the coincidence that the trigger leaves exactly three. So the order is either
 * `options.skill_order` (D-CRISIS-15's cycle, which is what the surface passes) or a seeded
 * shuffle of `masteredNodeIds` when none is given.
 */
export function composeHardWinterBatch(
  masteredNodeIds: readonly string[],
  pool: readonly WinterBatchCandidate[],
  options: ComposeWinterBatchOptions,
): WinterBatchComposition {
  const size = options.size ?? HARD_WINTER.batch_size;
  const rng = options.rng;

  if (masteredNodeIds.length === 0) {
    return {
      status: "unavailable",
      reason: "nothing_mastered",
      wanted: size,
      available: 0,
      message:
        "The winter draws from every skill the learner has reached so far, and this " +
        "learner has reached none. There is nothing to ask, so there is no encounter " +
        "to run yet.",
    };
  }

  const byNode = new Map<string, WinterBatchCandidate[]>();
  for (const candidate of pool) {
    if (!masteredNodeIds.includes(candidate.node_id)) {
      continue;
    }
    const group = byNode.get(candidate.node_id);
    if (group) {
      group.push(candidate);
    } else {
      byNode.set(candidate.node_id, [candidate]);
    }
  }

  // The preference order, clipped to the nodes the pool can actually serve. An id in
  // `skill_order` that is not eligible is dropped; an eligible id the order does not name
  // is appended, so the order can reorder the draw and can never shrink it.
  const servable = masteredNodeIds.filter((id) => byNode.has(id));
  let order: string[];
  if (options.skill_order === undefined) {
    order = [...servable];
    shuffleInPlace(order, rng);
  } else {
    const eligible = new Set(servable);
    const preferred = options.skill_order.filter((id) => eligible.has(id));
    const named = new Set(preferred);
    order = [...preferred, ...servable.filter((id) => !named.has(id))];
  }
  for (const id of order) {
    shuffleInPlace(byNode.get(id) as WinterBatchCandidate[], rng);
  }

  const drawn: WinterBatchCandidate[] = [];
  let drewThisPass = true;
  while (drawn.length < size && drewThisPass) {
    drewThisPass = false;
    for (const id of order) {
      if (drawn.length >= size) {
        break;
      }
      const next = (byNode.get(id) as WinterBatchCandidate[]).pop();
      if (next) {
        drewThisPass = true;
        drawn.push(next);
      }
    }
  }

  if (drawn.length < size) {
    return {
      status: "unavailable",
      reason: "pool_too_thin",
      wanted: size,
      available: drawn.length,
      message:
        `A hard-winter round asks ${size} distinct questions and the pool can furnish ` +
        `${drawn.length} across ${order.length} mastered node(s). Serving fewer would ` +
        `not shorten the round, it would widen every bonfire: the action tier is a ` +
        `ratio of what was asked.`,
    };
  }

  return {
    status: "ready",
    size,
    prompts: drawn.map((candidate, index) => ({
      index,
      node_id: candidate.node_id,
      item_version_id: candidate.item_version_id,
      prompt: candidate.prompt,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* The render view model                                                      */
/* -------------------------------------------------------------------------- */

/** One cell as a renderer needs it. */
export interface WinterCellView {
  readonly col: number;
  readonly row: number;
  readonly land: boolean;
  readonly rim_depth: number | null;
  readonly frozen: boolean;
  readonly warded: boolean;

  /** Frozen with an unfrozen land neighbour: the visible frost line. */
  readonly frost_line: boolean;
  /**
   * **GROUND THE FROST TAKES WHEN THIS ROUND CLOSES — the state the board had no way to show,
   * and the reason a winter on load looked like nothing was happening.**
   *
   * At round one `frozen` is empty, because the first advance is part of `end_round` and round
   * one is a real decision rather than a cutscene. So the board opened with 0 of 88 cells
   * frozen and 0 on the frost line, and a renderer faithfully drew nothing: there was no
   * "faint frost", there was no frost. What a player needs before it arrives is not where the
   * frost IS, it is where it COMES FROM — and on era one's island that is the whole 28-cell
   * shoreline band, `winterSpreadSteps(1)` step in from the water.
   *
   * It is the FULL advance for this round and not one step of it, so a late round taking two
   * steps says so. Never true of a cell that is already `frozen` (the frost cannot take ground
   * it holds) and never true of a `warded` cell (a fire blocks, so a front dents visibly around
   * one). Empty once the winter has `ended`, because nothing more is coming.
   *
   * Computed through {@link winterFrostAfterAdvance}, the same function `end_round` advances
   * with, so this is a promise the reducer is obliged to keep rather than a second guess at the
   * timetable.
   */
  readonly frost_next: boolean;
  readonly building: WinterBuilding | null;
  /**
   * How hurt the building on this cell is, `0` for none or for an unmarked one and
   * `HARD_WINTER.damage.stages` for a ruin — `winterDamageStage`'s reading, carried here
   * so a renderer never divides by a tuning constant of its own.
   */
  readonly damage_stage: number;
  /**
   * The WEAKEST tier that would reach this cell from the fire being aimed, or `null`
   * when nothing is being aimed or this cell is out of reach of even the top tier.
   *
   * **THE ONE PROVISIONAL GROUND STATE**, and it used to be one of two: `frozen`, `warded` and
   * `frost_line` are facts about the board, and this is a hypothetical about a declaration
   * nobody has made yet. A renderer owes it a treatment that says so. The other one,
   * `preview_abandon`, went with the give-up-ground action on 2026-08-02, along with the
   * `abandoned` ground state it previewed.
   */
  readonly preview_tier: WinterActionTier | null;
}

/** Everything a 2D grid needs to draw one moment of the winter. */
export interface HardWinterView {
  readonly island: WinterIsland;
  readonly rows: readonly (readonly WinterCellView[])[];
  readonly frozen_cells: number;
  readonly warded_cells: number;
  readonly standing: number;
  readonly ruined: number;
  /** Standing buildings carrying damage, in authored order. */
  readonly damaged: readonly string[];
  /** Damage points standing on them, and what mending it would cost. */
  readonly damage_points: number;
  readonly mend_cost: number;
  /** Buildings that will be ruins at the end of this round unless something changes. */
  readonly at_risk: readonly string[];

  /** The fire being aimed, and what each tier would buy from there. `null` when none is. */
  readonly fire_preview: WinterFirePreview | null;
}

export interface HardWinterViewOptions {
  /** The cell a fire is being aimed at, so the board can show what each tier would hold. */
  readonly fire_preview?: WinterCell | null;
}

/**
 * Project the state into a grid. Pure and framework-free, so the interesting half of
 * "what does the player see" is testable in node — the React surface only maps this to
 * elements.
 */
export function hardWinterView(
  state: HardWinterState,
  options: HardWinterViewOptions = {},
): HardWinterView {
  const island = hardWinterIsland(state.era);
  const frozen = new Set(state.frozen);
  const warded = wardedWinterCells(state);
  const byCell = new Map(
    state.buildings.map((b) => [winterCellKey(b.col, b.row), b] as const),
  );
  const aimed = options.fire_preview ?? null;
  const preview = aimed === null ? null : hardWinterFirePreview(state, aimed);

  // WHERE THE FROST WILL BE WHEN THIS ROUND CLOSES. Read once for the whole board rather than
  // per cell, and skipped outright on an ended winter: `end_round` is the only thing that
  // advances the frost and it cannot fire again, so a front drawn after the last round would be
  // promising ground nothing is coming for.
  const reached =
    state.phase === "ended"
      ? frozen
      : winterFrostAfterAdvance(island, frozen, warded, winterSpreadSteps(state.round));

  const rows: WinterCellView[][] = [];
  for (let row = island.bounds.min_row; row <= island.bounds.max_row; row += 1) {
    const line: WinterCellView[] = [];
    for (let col = island.bounds.min_col; col <= island.bounds.max_col; col += 1) {
      const key = winterCellKey(col, row);
      const depth = island.rim_depth.get(key);
      const isLand = depth !== undefined;
      const isFrozen = frozen.has(key);
      line.push({
        col,
        row,
        land: isLand,
        rim_depth: depth ?? null,
        frozen: isFrozen,
        warded: warded.has(key),
        frost_line:
          isFrozen &&
          orthogonalNeighbours(col, row).some((n) => {
            const nk = winterCellKey(n.col, n.row);
            return island.rim_depth.has(nk) && !frozen.has(nk);
          }),
        frost_next: isLand && !isFrozen && reached.has(key),
        building: byCell.get(key) ?? null,
        damage_stage: (() => {
          const here = byCell.get(key);
          return here ? winterDamageStage(here) : 0;
        })(),
        preview_tier: preview?.tier_by_cell.get(key) ?? null,
      });
    }
    rows.push(line);
  }

  const standing = state.buildings.filter((b) => b.state === "standing");
  const damaged = standing.filter((b) => b.damage > 0);
  const damagePoints = damaged.reduce((total, b) => total + b.damage, 0);
  // What THIS round's cold round would cost, which is what "at risk" has to be measured
  // against now that a bite is worth more late in the winter than early.
  const bite = winterDamageBite(state.round);

  return {
    island,
    rows,
    frozen_cells: state.frozen.length,
    warded_cells: warded.size,
    standing: standing.length,
    ruined: state.buildings.length - standing.length,
    damaged: damaged.map((b) => b.node_id),
    damage_points: damagePoints,
    mend_cost: winterMendCost(damagePoints),
    at_risk: standing
      .filter((b) => {
        const key = winterCellKey(b.col, b.row);
        return frozen.has(key) && !warded.has(key) && winterDamageBudget(b) <= bite;
      })
      .map((b) => b.node_id),
    fire_preview: preview,
  };
}
