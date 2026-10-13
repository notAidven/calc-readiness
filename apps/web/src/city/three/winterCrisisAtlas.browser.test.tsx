import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterIsland,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  type WinterBuilding,
  type WinterFire,
  winterCellKey,
  winterDamageStage,
  winterFireState,
  winterTierFor,
} from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { ReactElement, RefObject } from "react";
import type * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import {
  winterShieldedNodeIds,
  winterThreatenedNodeIds,
} from "../../winter/buildingThreat";
import { CRISIS_CONTENT_ERAS } from "../../winter/crisisEra";
import { WINTER_NODE_ORDER } from "../../winter/hardWinterItems";
import { resolveBuildingModel } from "../buildingAssets";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import {
  cellCenter,
  footprintFor,
  occupiedCells,
  type PlacedTransform,
  transformCenter,
} from "../worldLayout";
import { applyCameraAction, controlsDistance, type OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import { crisisDressing, type ScenePlacement, type SceneTownHall } from "./CityScene";
import { CRISIS_STATUSES, type CrisisStatus } from "./CrisisStatusMarker";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { crisisLabelState } from "./SkillLabels";
import { buildWinterGroundGroup } from "./WinterGround";
import { WinterInCity } from "./WinterInCity";
import { FUEL_STEPS } from "./winterFire";

import "../../styles.css";
import { eraCityLayout } from "../islandLand";

/**
 * **THE HARD WINTER, PHOTOGRAPHED WITH THE RENDERER THAT SHIPS IT.**
 *
 * Four image-generation passes were commissioned to draw reference art for era one's crisis
 * mechanics, and the lead stopped them for a reason worth restating where the replacement
 * lives: **almost every one of those subjects already renders in the game.** `winterFire.ts`,
 * `winterFireGhost.ts`, `winterShield.ts`, `CrisisStatusMarker.tsx`, `frostStage.ts`,
 * `ruinStage.ts`, `BuildingFrostCrust.tsx`, `winterFrostFront.ts` and `WinterGround.tsx` are
 * all shipped and all drawn every time a winter runs. Asking a generator for its impression of
 * them was the wrong instrument. This photographs the real thing.
 *
 * The frames land in `docs/design-refs/hard-winter-crisis/`, and its `README.md` is the index:
 * what each frame shows and what board state produced it.
 *
 * ## THE VIEWPORT IS HALF THE EVIDENCE, AND IT IS 1024x580
 *
 * `.cursor/rules/qa-verification.mdc`: a spatial claim owes a rendered frame somebody looked
 * at, taken at a short, realistic viewport and named beside it. Every frame here is
 * {@link VIEW}, and every filename says so.
 *
 * ## AND NOTHING HERE IS CROPPED TO ITS SUBJECT
 *
 * The same rule: *a claim about what is visible behind or around an element has to be framed to
 * show the other thing.* So every frame is the whole viewport of the real island — its snow,
 * its lagoon, its fog, its sky and the neighbouring buildings — and the close ones get closer
 * only through {@link applyCameraAction}, which is the player's own zoom button. A crop would
 * answer "can you tell these two apart" by throwing away "can you see it at all", which is the
 * substitution the rule is about.
 *
 * ## THE POPULATIONS ARE DERIVED, WHICH IS `#406`'S DISCIPLINE
 *
 * `advisorWardrobeShots.browser.test.tsx` derives its era list from `ERA_SEQUENCE` so an
 * eleventh era joins the set with no edit. Everything countable here is derived the same way
 * and floored:
 *
 *  - the eras photographed are {@link CRISIS_CONTENT_ERAS}, the eras whose winter exists as
 *    content, so a second era's winter landing brings its own atlas with no edit here;
 *  - the cast on the island is `cityRosterNodeIds(era)`, and which building carries which
 *    condition is decided by {@link castFor} from the roster's own plot shapes;
 *  - the badge frames are one per {@link CRISIS_STATUSES} member, asserted as a set equality in
 *    both directions, so a third badge cannot arrive unphotographed and a deleted one cannot
 *    leave a frame behind claiming to show it;
 *  - the frosted building's damage is `HARD_WINTER.damage.ruin_at - 1`, the most a standing
 *    building can carry at any tuning, and the shield is a real
 *    `HARD_WINTER.reinforce.shield_by_tier` rung.
 *
 * ## THE SUBJECT THAT WAS EXEMPT UNTIL #407, AND WHAT THE EXEMPTION COST TO CARRY
 *
 * **The fire's duration (M14)** was the one thing here the renderer could not produce: the view
 * carried `rounds_left` and no mesh read it. This file shipped with that exemption asserted
 * rather than written down — hold a fire fixed, move only `rounds_left`, require one picture —
 * precisely so it could not outlive the gap it described.
 *
 * It did not. #407 landed on
 * `integration` while this branch was open, the exemption went red on the merge with *"a mesh
 * now reads the fire's duration"*, and the frames it named as owed are the fuel rungs below. The
 * claim is now the positive one and the sweep is the coverage: **one frame per rung of
 * {@link FUEL_STEPS}, which `winterFire.ts` derives from `burn_rounds_by_tier`**, so a re-tune
 * that lengthens the top rung adds a frame here with no edit.
 *
 * ## OFF BY DEFAULT
 *
 *   VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/three/winterCrisisAtlas.browser.test.tsx
 *
 * `winterCrisisShots.browser.test.tsx`'s header records the measurement: a shadow-mapped island
 * with seven GLBs left switched on in CI does not fail here, it starves an animation-timing
 * assertion in some other file, once per run, in a different file each time. What runs in CI is
 * everything above the frames.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own short laptop window, named in every filename per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

/** Where the committed frames go. Reference only: nothing under `docs/` is reachable in-app. */
const OUT = "docs/design-refs/hard-winter-crisis";

const LAYOUT = eraCityLayout("prehistoric");

/* -------------------------------------------------------------------------- */
/* The board                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where the settlement stands. A LAYOUT rather than a population: nothing in the tree authors
 * where a player puts their buildings, so there is no source to derive these from, and the
 * cluster is chosen for the same reason `winterProtectionStates.browser.test.tsx` chooses one —
 * `winterFraming` dollies out until the whole settlement fits the strip the crisis panel
 * leaves, so a spread city is photographed from further away and every building in it is
 * smaller than the game gives it at rest.
 *
 * **FOUR ARE IN THE ISLAND'S DEEP CORE AND TWO ARE OUT AT THE RIM**, which is what makes the
 * threatened condition a fact about the board rather than a flag set by hand. Measured on era
 * one's island: rim depth runs 0..4 and only the sixteen cells of `cols -2..1, rows -2..1` are
 * at depth 3 or better, so the four inland anchors are two rings clear of everything
 * {@link FROZEN_THROUGH} holds or the round takes, and `(-4, 1)` and `(3, 2)` at depth 1 are
 * inside it.
 *
 * **IT WAS FIVE INLAND AND ONE OUT, AND THAT IS A FRAME'S FINDING RATHER THAN A PREFERENCE.**
 * Five 2x2-and-smaller footprints do fit the sixteen deep cells, and photographed at the
 * player's own zoom they stood shoulder to shoulder: the storm roof covered the frosted
 * building behind it and the five conditions could not be read apart in the frame that exists
 * to read them apart. A ruin is not standing, so `winterThreatenedNodeIds` cannot mark it — the
 * ruin can therefore take the second rim plot, which buys the four that remain the room the
 * comparison needs. `castFor` asserts the consequence rather than trusting this paragraph.
 *
 * The hub sits at the frost's edge on purpose: it is not in the winter's building list, so it
 * cannot be threatened wherever it stands, and the biggest object on the island belongs in shot
 * beside the states being photographed.
 */
const PLOTS: readonly { col: number; row: number; rot: number }[] = [
  { col: -2, row: -2, rot: 0 },
  { col: 0, row: -2, rot: 0 },
  { col: 0, row: 0, rot: 0 },
  { col: -2, row: 1, rot: 0 },
  { col: -4, row: 1, rot: 0 },
  { col: 3, row: 2, rot: 0 },
];
const HALL_PLOT = { col: 2, row: -2, rot: 0 } as const;

/** How deep into the island the frost has reached on the boards below, in rim bands. */
const FROZEN_THROUGH = 1;

/**
 * **WHICH BUILDING CARRIES WHICH CONDITION, decided by the roster rather than written down.**
 *
 * The rule, stated because a derivation is only as good as its criterion:
 *
 *  - **threatened** and **ruined** are the two buildings the BOARD puts inside the frost's
 *    reach — `winterThreatenedNodeIds` over the projected rows — with the larger plot taking
 *    the badge. Both conditions belong at the rim: a building is threatened because of where it
 *    stands, and a ruin is a building that was. It also means neither is a flag set by hand;
 *  - **protected** and **frosted** are the two remaining nodes on the largest plot shape the
 *    roster shares. Same plot means the storm roof and the frost crust are compared on
 *    buildings of the same footprint, which is what makes *"do these read as the same pale
 *    mass"* a question about the two treatments;
 *  - the rest take the remaining conditions in descending plot area, so no condition is carried
 *    by the smallest building on the island by accident.
 */
interface Cast {
  readonly era: EraId;
  readonly placements: readonly PlacedTransform[];
  readonly threatened: string;
  readonly protectedNode: string;
  readonly frosted: string;
  readonly ruined: string;
  readonly proposedShield: string;
  /** Left alone, so an ordinary winter building is in every frame for comparison. */
  readonly plain: string;
}

function plotArea(nodeId: string): number {
  const fp = footprintFor(nodeId);
  return fp.w * fp.d;
}

function plotShape(nodeId: string): string {
  const fp = footprintFor(nodeId);
  return `${fp.w}x${fp.d}`;
}

function castFor(era: EraId): Cast {
  /*
   * THE ERA'S OWN BUILDINGS, off `ERA_SEQUENCE`. Not `cityRosterNodeIds`, which accumulates
   * every earlier era's nodes as well: an atlas of era N's crisis that photographed era one's
   * buildings would be a picture of the wrong settlement, and taking a slice of the accumulated
   * roster is exactly how it would happen without anyone noticing.
   */
  const roster = (ERA_SEQUENCE.find((entry) => entry.id === era)?.nodes ?? []).slice(
    0,
    PLOTS.length,
  );
  if (roster.length < PLOTS.length) {
    throw new Error(
      `${era} authors ${roster.length} buildings, and the five conditions plus a plain ` +
        `neighbour need ${PLOTS.length}`,
    );
  }
  const placements = roster.map((nodeId, index) => ({
    nodeId,
    ...(PLOTS[index] as { col: number; row: number; rot: number }),
  }));

  // The two the frost reaches, biggest plot first: the badge goes on the larger and the ruin on
  // the other, because a ruin is not standing and so can never be marked as threatened.
  const threatened = [
    ...winterThreatenedNodeIds(
      hardWinterView(openingWinter(era, placements), { fire_preview: null }).rows,
    ),
  ].sort((a, b) => plotArea(b) - plotArea(a));
  const [front, doomed] = threatened;
  if (front === undefined || doomed === undefined || threatened.length !== 2) {
    throw new Error(
      `${era}'s plots put ${threatened.length} buildings inside the frost's reach, and the ` +
        `threatened condition and the ruin need one each`,
    );
  }

  // The largest plot shape the roster shares, among the buildings the front is not already
  // about to hit — a pair that is also threatened would be carrying two conditions at once.
  const byShape = new Map<string, string[]>();
  for (const nodeId of roster.filter((id) => !threatened.includes(id))) {
    byShape.set(plotShape(nodeId), [...(byShape.get(plotShape(nodeId)) ?? []), nodeId]);
  }
  const pair = [...byShape.values()]
    .filter((group) => group.length >= 2)
    .sort((a, b) => plotArea(b[0] as string) - plotArea(a[0] as string))[0];
  if (!pair) {
    throw new Error(`${era}'s roster shares no plot shape, so the pair cannot be compared`);
  }

  const spoken = new Set([...threatened, pair[0] as string, pair[1] as string]);
  // Descending plot area, ties broken by roster order, so no condition lands on the smallest
  // building on the island by accident and the assignment is the same on every run.
  const order = new Map(roster.map((id, index) => [id, index] as const));
  const rest = roster
    .filter((id) => !spoken.has(id))
    .sort(
      (a, b) =>
        plotArea(b) - plotArea(a) || (order.get(a) as number) - (order.get(b) as number),
    );
  if (rest.length < 2) {
    throw new Error(`${era} has no buildings left to carry the remaining conditions`);
  }

  return {
    era,
    placements,
    threatened: front,
    ruined: doomed,
    protectedNode: pair[0] as string,
    frosted: pair[1] as string,
    proposedShield: rest[0] as string,
    plain: rest[1] as string,
  };
}

function openingWinter(
  era: EraId,
  placements: readonly PlacedTransform[],
): HardWinterState {
  const opening = createHardWinter({
    era,
    buildings: placements.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  const island = hardWinterIsland(era);
  return {
    ...opening,
    /*
     * **ROUND ONE, AND IT WAS THREE UNTIL 2026-08-02.** The round decides how far the FRONT reaches,
     * because `frost_next` is the whole advance for the round: `spread.accelerate_every` was 4, so
     * round three took one step and the front was the band just inside the frozen region, which put
     * exactly the two rim buildings inside the frost's reach. At `accelerate_every: 1` round three
     * takes THREE steps and the front swallows the island's deep core as well, so all six buildings
     * came out threatened and the cast could not be derived at all.
     *
     * Round one is the value that keeps the front one band deep at any acceleration, which is the
     * same reason `spread.base` is 1. The frozen region is unchanged, so the board these frames are
     * taken over is the same picture.
     */
    round: 1,
    frozen: island.cells.filter(
      (key) => (island.rim_depth.get(key) ?? 99) <= FROZEN_THROUGH,
    ),
  };
}

/** Everything the canvas is handed for one board, wired the way `WinterInCity`'s bridge wires it. */
interface Board {
  readonly rows: ReturnType<typeof hardWinterView>["rows"];
  readonly fires: readonly WinterFire[];
  readonly firePreviewAt: { readonly col: number; readonly row: number } | null;
  readonly ruinedNodeIds: ReadonlySet<string>;
  readonly frostStageByNodeId: ReadonlyMap<string, number>;
  readonly shieldedNodeIds: ReadonlySet<string>;
  readonly reinforceCandidates: ReadonlySet<string>;
  readonly threatenedNodeIds: ReadonlySet<string>;
  /**
   * False for the city AFTER the thaw: no frost, no fires, no sidebar, and the ground the
   * crisis took drawn by `ScarredGround` instead. It is the same island one season on.
   */
  readonly winter: boolean;
  /** `crisis_damage.ruined_cells` — ground the crisis kept, drawn once the winter is over. */
  readonly ruinedCells: readonly string[];
}

function boardFor(
  winter: HardWinterState,
  options: {
    readonly firePreviewAt?: { readonly col: number; readonly row: number } | null;
    readonly reinforceCandidates?: ReadonlySet<string>;
    /** A frost stage the tuning cannot produce; see `FROSTED_STAGE`. */
    readonly frostStageFor?: readonly [string, number];
  } = {},
): Board {
  const view = hardWinterView(winter, { fire_preview: options.firePreviewAt ?? null });
  const frostStageByNodeId = new Map<string, number>();
  for (const building of winter.buildings) {
    const stage = winterDamageStage(building);
    if (building.state === "standing" && stage > 0) {
      frostStageByNodeId.set(building.node_id, stage);
    }
  }
  if (options.frostStageFor) {
    const [nodeId, stage] = options.frostStageFor;
    frostStageByNodeId.set(nodeId, stage);
  }
  return {
    rows: view.rows,
    fires: winter.fires,
    firePreviewAt: options.firePreviewAt ?? null,
    ruinedNodeIds: new Set(
      winter.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
    ),
    frostStageByNodeId,
    shieldedNodeIds: winterShieldedNodeIds(winter.buildings, false),
    reinforceCandidates: options.reinforceCandidates ?? new Set<string>(),
    threatenedNodeIds: winterThreatenedNodeIds(view.rows),
    winter: true,
    ruinedCells: [],
  };
}

/**
 * The same island one season on: the winter lifted, and the ground the city still carries a scar on.
 *
 * ## THE SCAR CELLS ARE THE CITY'S, AND SINCE 2026-08-02 THEY CANNOT BE A WINTER'S
 *
 * They were the winter's OWN abandoned ring, read off the board: `hardWinterOutcome` counted
 * exactly those as `ruined_cells` and `citySession` carried them into `crisis_damage`. The
 * give-up-ground action was ruled out, so no winter produces any and this takes a list instead.
 *
 * **THAT IS NOT A WEAKENING OF THE FRAME, and `ScarredGround.tsx`'s own header is why**: ground
 * given up during a crisis and a scar left after the thaw *"are one state at two moments — this
 * layer takes over from that one at the thaw"*. The layer is fed by `CrisisDamage.ruined_cells`,
 * which is persisted, crisis-generic, and the thing a photograph of it is a photograph of. What
 * the frame no longer shows is the winter half of the handover, because there is no winter half.
 */
function thawedCityAfter(winter: HardWinterState, scarred: readonly string[]): Board {
  const board = boardFor(winter);
  return {
    ...board,
    winter: false,
    fires: [],
    firePreviewAt: null,
    frostStageByNodeId: new Map(),
    shieldedNodeIds: new Set(),
    threatenedNodeIds: new Set(),
    ruinedCells: scarred,
  };
}

/**
 * The most damage a standing building can carry, at any tuning.
 *
 * Derived rather than chosen: `closeRound` clamps damage AT `ruin_at` and ruins anything that
 * reaches it, so one under the threshold is both the worst case the crust has to read at and
 * the only standing damage there is at the shipped `ruin_at: 2`.
 */
const FROSTED_DAMAGE = HARD_WINTER.damage.ruin_at - 1;

/**
 * **THE FROST STAGE THE FROSTED CONDITION IS PHOTOGRAPHED AT, and since 2026-08-02 it is a
 * CONSTRUCTION rather than a state a board can be in.**
 *
 * `FROSTED_DAMAGE` is `ruin_at - 1`, which was the only standing damage there was at `ruin_at: 2`
 * and is ZERO at the shipped `ruin_at: 1`: a building the frost reaches unsheltered is a ruin, so
 * there is no frosted survivor anywhere (proved over the whole shield-by-bite space in
 * `hard-winter.test.ts`).
 *
 * The condition stays in the atlas, and the reason is what this whole file is: the five frames are
 * five INSTRUCTIONS TO THE RENDERER, and `frostStage.ts` still draws a crust for a building whose
 * stage is above zero. `HARD_WINTER.damage.stages` is deliberately left at 3 with its rungs in
 * place, so the crust is a live piece of the renderer that a `ruin_at` with room in it reaches
 * again in one edit — and a frame set that stopped photographing it would leave the next reader with
 * no picture of what they were restoring.
 *
 * So the stage is set on the BOARD rather than derived from a building's damage, and the census
 * below asserts it is a real rung of the ladder. That is the honest shape: the dressing is under
 * test, and the state's unreachability is recorded rather than papered over.
 */
const FROSTED_STAGE = 1;

/** A shield magnitude a declaration can actually buy, off the tuning's own ladder. */
const SHIELD_GRANT = HARD_WINTER.reinforce.shield_by_tier.steady;

/** The winter the five protection conditions stand in, all of them at once on one island. */
function winterWithFiveConditions(cast: Cast): HardWinterState {
  const opening = openingWinter(cast.era, cast.placements);
  const dress = (building: WinterBuilding): WinterBuilding => {
    if (building.node_id === cast.protectedNode) {
      return { ...building, shield: SHIELD_GRANT };
    }
    if (building.node_id === cast.frosted) {
      // The DAMAGE is left alone and the stage is set on the board instead: see `FROSTED_STAGE`.
      // Setting `damage` to `FROSTED_DAMAGE` would be setting it to zero at this tuning.
      return { ...building, cold_rounds: 2 };
    }
    if (building.node_id === cast.ruined) {
      return {
        ...building,
        state: "ruin",
        damage: HARD_WINTER.damage.ruin_at,
        cold_rounds: 3,
        ruined_in_round: 2,
        ruined_by: "cold",
      };
    }
    return building;
  };
  return { ...opening, buildings: opening.buildings.map(dress) };
}

/** One building's dressing changed and nothing else, so an A/B pair differs by one thing. */
function winterWithOneBuilding(
  cast: Cast,
  nodeId: string,
  dressing: "shield" | "frost",
): HardWinterState {
  const opening = openingWinter(cast.era, cast.placements);
  return {
    ...opening,
    buildings: opening.buildings.map((building) =>
      building.node_id === nodeId
        ? dressing === "shield"
          ? { ...building, shield: SHIELD_GRANT }
          : { ...building, cold_rounds: 2 }
        : building,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* The fire, played through the reducer                                       */
/* -------------------------------------------------------------------------- */

/** How many of the round's questions to answer, for a tier the tuning decides. */
const ACED = HARD_WINTER.batch_size;
const MISSED = 0;

/**
 * Every score that lights a fire which CATCHES, with what the tuning gives it.
 *
 * Derived by asking `winterTierFor` rather than by naming tiers, so the fire frames below are
 * declarations a player could actually make and the rungs cannot drift from the ladder.
 */
const CATCHING_SCORES = Array.from(
  { length: HARD_WINTER.batch_size },
  (_, index) => index + 1,
).flatMap((correct) => {
  const tier = winterTierFor(correct, HARD_WINTER.batch_size);
  const radius = HARD_WINTER.fire.radius_by_tier[tier];
  return radius === null
    ? []
    : [{ correct, tier, radius, burn: HARD_WINTER.fire.burn_rounds_by_tier[tier] }];
});

/**
 * The shortest-lived fire that still catches, preferring the widest one at that length.
 *
 * **THIS IS WHAT THE BURNT-OUT FRAME IS LIT WITH, and the reason is a photograph.** At the
 * longest rung the fire outlives the encounter: taken with a `strong` fire, frame 05 came back
 * with the frost over all 88 cells and every building on the island a ruin — a true picture of
 * a lost winter and a useless one of a spent fire, because nothing in it says where the fire had
 * been. `damage.ruin_at: 2` with a first bite of 2 is why: one unsheltered cold round finishes a
 * building, so every extra round the fire burns is another ring of the settlement gone.
 */
const SHORTEST_CATCHING = ((): { correct: number; burn: number } => {
  const shortest = [...CATCHING_SCORES].sort(
    (a, b) => a.burn - b.burn || b.correct - a.correct,
  )[0];
  if (!shortest) {
    throw new Error("no score on this ladder lights a fire that catches");
  }
  return shortest;
})();

/**
 * How many rounds are played before the fire is lit.
 *
 * **ZERO SINCE 2026-08-02, and the always-on test below is what forced it.** It was ONE: the
 * earliest board with any frost on it at all, because every round after that is a ring of the
 * settlement the burnt-out frame has to photograph as a ruin. At `HARD_WINTER.rounds: 3` the
 * shortest fire that catches burns two rounds, so one lit after a prefix round goes out exactly as
 * the winter ends and the burnt-out frame would photograph a thawed board instead of a spent hearth.
 * Lit in round one it is spent as round two closes, leaving the last round to photograph it in.
 *
 * The other end is still checked rather than derived, for the same reason it always was: a number
 * derived from the round count would drift with it silently.
 */
const FIRE_PREFIX_ROUNDS = 0;

function play(
  winter: HardWinterState,
  action: WinterAction,
  correct: number,
): HardWinterState {
  const declared = hardWinterReducer(winter, { type: "declare", action });
  if (declared === winter) {
    throw new Error(`the board refused ${action.kind}, so this fixture is not reachable`);
  }
  return hardWinterReducer(declared, {
    type: "resolve",
    correct,
    asked: HARD_WINTER.batch_size,
  });
}

/** Declare, resolve and close, which is one whole round of the encounter. */
function playRound(
  winter: HardWinterState,
  action: WinterAction,
  correct: number,
): HardWinterState {
  return hardWinterReducer(play(winter, action, correct), { type: "end_round" });
}

/**
 * A round spent on nothing, so the only thing that moves is the frost.
 *
 * The target is picked FRESH EACH ROUND and is the standing building furthest from the rim,
 * because `winterActionRefusal` refuses a reinforce on a ruin: a fixed target is a fixture that
 * works until the frost happens to reach that building, and then throws four rounds in.
 */
function idleRound(winter: HardWinterState): HardWinterState {
  const island = hardWinterIsland(winter.era);
  const deepest = [...winter.buildings]
    .filter((b) => b.state === "standing")
    .sort(
      (a, b) =>
        (island.rim_depth.get(winterCellKey(b.col, b.row)) ?? -1) -
        (island.rim_depth.get(winterCellKey(a.col, a.row)) ?? -1),
    )[0];
  if (!deepest) {
    throw new Error("nothing is standing, so no round can be spent on a reinforce");
  }
  return playRound(winter, { kind: "reinforce", node_id: deepest.node_id }, MISSED);
}

/**
 * A real winter, {@link FIRE_PREFIX_ROUNDS} in, with the frost holding the shoreline band.
 *
 * Played rather than constructed: every round below goes through `declare`, `resolve` and
 * `end_round`, so the frost's reach is the reducer's own advance and the fires are the ones the
 * tuning grants for the score they were given.
 */
function playedIn(cast: Cast): HardWinterState {
  let winter = createHardWinter({
    era: cast.era,
    buildings: cast.placements.map((p) => ({
      node_id: p.nodeId,
      col: p.col,
      row: p.row,
    })),
  });
  for (let round = 0; round < FIRE_PREFIX_ROUNDS; round += 1) {
    winter = idleRound(winter);
  }
  return winter;
}

/**
 * **THE CELL THE FIRE IS LIT ON: the nearest OPEN ground to the building the frost is about to
 * take.**
 *
 * Not the building's own cell, and the reason is a frame rather than a rule. The first run of
 * this file lit it there — the obvious reading of "hold the frost off that building" — and the
 * hearth is under three world units tall on a cell an eight-unit building stands in the middle
 * of, so the fire, its ember bed and most of its held ground were inside the model. The frames
 * came back with a smoke column rising out of a rooftop and no hearth anywhere.
 *
 * Open ground beside it is also what a player would pick, and the reach is checked rather than
 * assumed: the strong fire's radius is a Manhattan disc, so a cell one step from the building
 * still holds the ground the building stands on.
 */
function fireCell(cast: Cast): { col: number; row: number } {
  const plot = cast.placements.find((p) => p.nodeId === cast.threatened);
  if (!plot) {
    throw new Error("the threatened building is not on the board");
  }
  const taken = occupiedCells([...cast.placements, { nodeId: TOWN_HALL_ID, ...HALL_PLOT }]);
  const island = hardWinterIsland(cast.era);
  const reach = HARD_WINTER.fire.radius_by_tier.strong ?? 0;
  const open = island.cells
    .map((key) => {
      const [col, row] = key.split(",").map(Number) as [number, number];
      return { col, row, key };
    })
    .filter(({ key }) => !taken.has(key))
    .filter(({ col, row }) => Math.abs(col - plot.col) + Math.abs(row - plot.row) <= reach)
    .sort(
      (a, b) =>
        Math.abs(a.col - plot.col) +
        Math.abs(a.row - plot.row) -
        (Math.abs(b.col - plot.col) + Math.abs(b.row - plot.row)),
    );
  const at = open[0];
  if (!at) {
    throw new Error(
      `${cast.era}: nothing within a strong fire's reach of ${cast.threatened} is open ground`,
    );
  }
  return { col: at.col, row: at.row };
}

/**
 * A cell where the fire's held ground meets ground the frost holds — the seam itself.
 *
 * Read off the board rather than computed from the fire's radius, because the island clips the
 * disc: a cell chosen by arithmetic can land in the lagoon or inside the frost's own sheet, and
 * this asks the projected rows which cell actually has both states on either side of it.
 */
function heldGroundSeam(board: Board): { col: number; row: number } {
  const cells = board.rows.flat().filter((cell) => cell.land);
  const frost = new Set(
    cells.filter((cell) => cell.frozen && !cell.warded).map((c) => `${c.col},${c.row}`),
  );
  const seam = cells
    .filter((cell) => cell.warded)
    .filter((cell) =>
      [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ].some(([dc, dr]) =>
        frost.has(`${cell.col + (dc as number)},${cell.row + (dr as number)}`),
      ),
    )
    .sort((a, b) => Math.hypot(a.col, a.row) - Math.hypot(b.col, b.row));
  const at = seam[0];
  if (!at) {
    throw new Error("no held ground touches the frost, so there is no seam to photograph");
  }
  return { col: at.col, row: at.row };
}

/* -------------------------------------------------------------------------- */
/* Always-on: the exemption, the population, and the census                   */
/* -------------------------------------------------------------------------- */

/**
 * Everything the renderer draws for one fire, as a string.
 *
 * Mesh names, transforms, vertex counts and material values, in traversal order. Two fires that
 * fingerprint the same are two fires that draw the same picture.
 */
function fireFingerprint(fire: WinterFire): { print: string; meshes: number } {
  const group = buildWinterGroundGroup([], [fire], { weather: false });
  const parts: string[] = [];
  let meshes = 0;
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      parts.push(`group:${child.name}`);
      return;
    }
    meshes += 1;
    const position = mesh.geometry.getAttribute("position");
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    parts.push(
      [
        mesh.name,
        mesh.position
          .toArray()
          .map((n) => n.toFixed(4))
          .join(","),
        mesh.scale
          .toArray()
          .map((n) => n.toFixed(4))
          .join(","),
        mesh.rotation
          .toArray()
          .slice(0, 3)
          .map((n) => Number(n).toFixed(4))
          .join(","),
        position ? position.count : 0,
        materials
          .map((material) => {
            const standard = material as THREE.MeshStandardMaterial;
            return [
              standard.color?.getHexString?.() ?? "",
              standard.emissive?.getHexString?.() ?? "",
              (standard.emissiveIntensity ?? 0).toFixed(3),
              (standard.opacity ?? 1).toFixed(3),
            ].join("/");
          })
          .join("+"),
      ].join("|"),
    );
  });
  return { print: parts.join("\n"), meshes };
}

/**
 * Every rung of the fire's fuel ladder, longest first, which is the order the frames read in.
 *
 * `FUEL_STEPS` is `winterFire.ts`'s own, derived from `burn_rounds_by_tier`, so a re-tune that
 * lengthens the top rung lengthens this list and the frame set with it. Nothing here is a 3.
 */
const FUEL_RUNGS: readonly number[] = Array.from(
  { length: FUEL_STEPS },
  (_, index) => FUEL_STEPS - index,
);

/**
 * **THE SUBJECT THAT WAS EXEMPT UNTIL #407, NOW ASSERTED AS COVERAGE.**
 *
 * This file shipped with the M14 gap held as an exemption rather than as a sentence: hold a fire
 * fixed, move only `rounds_left`, and require the layer to hand back one picture. It went red on
 * the merge that brought #407 in, with the message that named the frames it owed — which is the
 * shape `.cursor/rules/qa-verification.mdc` asks of an exemption, an entry that fails when it
 * stops qualifying rather than sitting there excusing nothing.
 *
 * The claim is now the positive one, and it is a claim about THIS SET rather than about the
 * renderer: `fireDuration.test.ts` owns whether the ladder is drawn correctly, and what the
 * atlas owes is a frame for each of its rungs. Asserted in both directions, so a rung added by a
 * re-tune arrives unphotographed and fails, and a frame for a rung that no longer exists fails
 * too.
 *
 * The floor under it is the one the coverage needs and nothing more: the rungs really are
 * distinct pictures, so "one frame each" is not one frame each of the same thing.
 */
test("the atlas has a frame for every rung of the fire's fuel ladder", () => {
  expect(
    FUEL_STEPS,
    "the burn ladder has one rung, so there is no duration to photograph",
  ).toBeGreaterThanOrEqual(2);
  expect(FUEL_STEPS).toBe(Math.max(...Object.values(HARD_WINTER.fire.burn_rounds_by_tier)));
  // The set of rungs the frames cover is exactly 1..FUEL_STEPS, both directions.
  expect([...FUEL_RUNGS].sort((a, b) => a - b)).toEqual(
    Array.from({ length: FUEL_STEPS }, (_, index) => index + 1),
  );

  // A real drawn fire first, so the distinctness below is over something rather than nothing.
  const reference = fireFingerprint({
    col: 0,
    row: 0,
    radius: 2,
    rounds_left: FUEL_STEPS,
    lit_in_round: 1,
  });
  expect(
    reference.meshes,
    "the layer drew no hearth at all, so this proves nothing about its fuel",
  ).toBeGreaterThan(25);

  // AND EVERY RUNG IS ITS OWN PICTURE. One variable moves: the radius, the cell and the tier's
  // ward are all held fixed, so what separates them is the duration and nothing else.
  const prints = new Set(
    FUEL_RUNGS.map(
      (rounds_left) =>
        fireFingerprint({ col: 0, row: 0, radius: 2, rounds_left, lit_in_round: 1 }).print,
    ),
  );
  expect(
    prints.size,
    "two rungs of the fuel ladder draw the same fire, so two of these frames are one",
  ).toBe(FUEL_STEPS);
});

/**
 * The frame set is DERIVED from the board it photographs, and the derivation is asserted before
 * a single pixel is taken — because a frame set whose captions are written by the test is a
 * frame set that cannot be wrong about what it is showing.
 */
test("every era whose winter exists as content is in the atlas, with a real cast", () => {
  expect(
    CRISIS_CONTENT_ERAS.length,
    "no era's winter is playable, so there is nothing to photograph",
  ).toBeGreaterThanOrEqual(1);
  expect(ERAS).toEqual([...CRISIS_CONTENT_ERAS]);

  // THE FIRE FRAMES FIT INSIDE THE ENCOUNTER. A fire lit after `FIRE_PREFIX_ROUNDS` needs its
  // own burn length in further rounds to go out, and the reducer refuses everything once the
  // last round has closed — so a tuning that made the shortest fire outlast the winter would
  // leave the burnt-out frame photographing a thawed board instead of a spent fire.
  expect(CATCHING_SCORES.length, "no score lights a fire that catches").toBeGreaterThan(0);
  expect(
    FIRE_PREFIX_ROUNDS + SHORTEST_CATCHING.burn,
    "the shortest fire the tuning can light outlives the encounter it is lit in",
  ).toBeLessThan(HARD_WINTER.rounds);

  for (const era of CRISIS_CONTENT_ERAS) {
    const cast = castFor(era);
    expect(cast.placements.length, `${era} put too few buildings on the island`).toBe(
      PLOTS.length,
    );
    // SIX DISTINCT CARRIERS. Two conditions on one building is two frames of one picture.
    const carriers = [
      cast.threatened,
      cast.protectedNode,
      cast.frosted,
      cast.ruined,
      cast.proposedShield,
      cast.plain,
    ];
    expect(new Set(carriers).size, `${era}'s cast doubles up`).toBe(carriers.length);
    // AND THE PAIR THE RULING COMPARISON IS BETWEEN SHARES A PLOT SHAPE, so the storm roof and
    // the frost crust are compared on the same footprint rather than on two different ones.
    expect(
      plotShape(cast.protectedNode),
      `${era} compares a storm roof and a frost crust on two different plot shapes`,
    ).toBe(plotShape(cast.frosted));
    // ...and the threatened one is threatened by WHERE IT STANDS.
    const board = boardFor(winterWithFiveConditions(cast));
    expect([...board.threatenedNodeIds].sort()).toEqual([cast.threatened]);
  }
});

/**
 * **THE CENSUS: the five conditions the protection frames must tell apart are five different
 * instructions to the renderer.**
 *
 * `crisisDressing` alone cannot tell a frosted building from a plain one — both are
 * `{ shield: "none", status: null }` — and it is right that it cannot, because the frost is
 * drawn by `frostStage.ts` on the building's own surface. So the tuple below carries the frost
 * stage and the ruin beside the dressing, which is the whole of what the canvas is told.
 *
 * Asserted as a distinctness count over a floored population rather than as five spot checks,
 * because the failure this guards against is a COLLAPSE: two conditions that became one picture
 * make two of the frames the same photograph, and a frame set cannot tell.
 */
test("the five protection conditions are five different dressings, on every era's board", () => {
  for (const era of CRISIS_CONTENT_ERAS) {
    const cast = castFor(era);
    const board = boardFor(winterWithFiveConditions(cast), {
      reinforceCandidates: new Set([cast.proposedShield]),
      frostStageFor: [cast.frosted, FROSTED_STAGE],
    });

    // THE FIXTURE IS LEGAL AT THIS TUNING, checked before it is used: a frosted building that
    // is really a ruin, or a shield no declaration can buy, would photograph a state nobody can
    // reach rather than merely go red.
    // **THE FROSTED CONDITION IS A CONSTRUCTED STAGE, and this is where that is stated.** It read
    // `expect(FROSTED_DAMAGE).toBeGreaterThan(0)` over a damage value the engine could produce; at
    // `damage.ruin_at: 1` `FROSTED_DAMAGE` is zero and no board reaches the state. What is asserted
    // instead is that the stage the frame photographs is a real rung of the renderer's own ladder,
    // which is what `frostStage.ts` reads. See `FROSTED_STAGE`.
    expect(FROSTED_DAMAGE, "a standing damaged state is reachable again").toBe(0);
    expect(FROSTED_STAGE, "the frosted frame photographs no crust").toBeGreaterThan(0);
    expect(FROSTED_STAGE).toBeLessThanOrEqual(HARD_WINTER.damage.stages);
    expect(SHIELD_GRANT, "this rung buys no shield at all").toBeGreaterThan(0);

    /*
     * **`shield` LEFT THIS TUPLE AND `label` TOOK ITS PLACE (2026-08-03).** The storm roof was
     * scrapped on the lead's ruling — *"scrap the shield youre using completely ... other than an
     * indicator over it that says shielded"* — so `crisisDressing` has no shield to census. The
     * condition itself is unchanged and is still told apart here: it is the building's floating
     * label, which reads SHIELDED while it is one. The `proposed` state went with the geometry,
     * since a ghost of a thing that is not drawn is nothing.
     */
    const dressingOf = (nodeId: string) => ({
      ...crisisDressing(nodeId, {
        winter: true,
        ruinedNodeIds: board.ruinedNodeIds,
        shieldedNodeIds: board.shieldedNodeIds,
        reinforceCandidates: board.reinforceCandidates,
        crisisThreatenedNodeIds: board.threatenedNodeIds,
      }),
      label: crisisLabelState(nodeId, {
        ruinedNodeIds: board.ruinedNodeIds,
        shieldedNodeIds: board.shieldedNodeIds,
        threatenedNodeIds: board.threatenedNodeIds,
      }),
      frostStage: board.frostStageByNodeId.get(nodeId) ?? 0,
      ruined: board.ruinedNodeIds.has(nodeId),
    });

    const census = new Map(
      cast.placements.map((p) => [p.nodeId, dressingOf(p.nodeId)] as const),
    );
    expect(census.size, `${era}'s board lost a building`).toBe(PLOTS.length);

    expect(census.get(cast.protectedNode)).toEqual({
      label: "shielded",
      status: null,
      frostStage: 0,
      ruined: false,
    });
    // A CANDIDATE READS AS AN ORDINARY BUILDING NOW, which is what scrapping the storm roof
    // took with it: the reinforce ghost was a see-through copy of geometry that no longer
    // exists. The declare card names what it is aimed at instead.
    expect(census.get(cast.proposedShield)).toEqual({
      label: "safe",
      status: null,
      frostStage: 0,
      ruined: false,
    });
    expect(census.get(cast.threatened)).toEqual({
      label: "threatened",
      status: "threatened",
      frostStage: 0,
      ruined: false,
    });
    expect(census.get(cast.ruined)).toEqual({
      label: "lost",
      status: "lost",
      frostStage: 0,
      ruined: true,
    });
    /*
     * The frosted one's stage NUMBER is not this file's claim — `frostStage.ts` owns the banding
     * and re-deriving `winterDamageStage` here would be two copies of one calculation agreeing.
     * What it is entitled to require is that the frost reaches the renderer as a real stage on
     * this building, and STRICTLY below the ruin's own band, which is the state it exists to be
     * told from.
     */
    const frosted = census.get(cast.frosted);
    expect(frosted?.label).toBe("safe");
    expect(frosted?.status).toBeNull();
    expect(frosted?.ruined).toBe(false);
    expect(
      frosted?.frostStage,
      `${era}'s frosted building reaches the renderer with no frost on it`,
    ).toBeGreaterThan(0);
    expect(
      frosted?.frostStage,
      `${era}'s frosted building wears the RUIN's own band`,
    ).toBeLessThan(HARD_WINTER.damage.stages);

    // AND THE PLAIN NEIGHBOUR IS THE ORDINARY WINTER BUILDING, which is the reference the other
    // five are read against and the 2026-08-01 ruling's own case: nothing added, stars kept.
    expect(census.get(cast.plain)).toEqual({
      label: "safe",
      status: null,
      frostStage: 0,
      ruined: false,
    });

    /*
     * SIX DISTINCT DRESSINGS OVER SIX BUILDINGS, and the arithmetic is the claim: the five
     * conditions the frames must tell apart, plus the plain neighbour that is none of them.
     * Asserted as a number so a collapse anywhere in the table fails here as well as at its own
     * expectation — two conditions that became one instruction make two of the frames the same
     * photograph, and a frame set cannot tell.
     */
    /*
     * **FIVE DRESSINGS OVER SIX BUILDINGS SINCE 2026-08-03, and the pair that merged is named.**
     * It was six, one per plot. Scrapping the storm roof took the reinforce PREVIEW with it — a
     * ghost of geometry that is not drawn is nothing — so `proposedShield` and `plain` are now
     * the same picture, which is the honest outcome rather than a loosened count: the frame set
     * has one fewer condition to tell apart because the renderer has one fewer to draw.
     *
     * Derived from the merge rather than repinned, and asserted with the merge itself beside it
     * so a SECOND collapse cannot hide inside the same number.
     */
    const distinct = new Set([...census.values()].map((d) => JSON.stringify(d)));
    expect(census.get(cast.proposedShield)).toEqual(census.get(cast.plain));
    expect(
      distinct.size,
      `${era}'s six buildings reach the renderer as ${distinct.size} dressings`,
    ).toBe(PLOTS.length - 1);
  }
});

/**
 * **THE BADGE SHEET COVERS EVERY BADGE THE RENDERER CAN DRAW, both directions.**
 *
 * `CRISIS_STATUSES` exists so a guard can sweep the population instead of restating it, and
 * this is that sweep. A third status added there arrives here unphotographed and fails; a
 * status deleted there leaves a frame behind claiming to show it, and fails too.
 */
test("the badge frames are exactly the crisis statuses, floored", () => {
  expect(
    CRISIS_STATUSES.length,
    "there are no badges to photograph",
  ).toBeGreaterThanOrEqual(2);
  expect([...BADGE_FRAMES.keys()].sort()).toEqual([...CRISIS_STATUSES].sort());
  for (const status of CRISIS_STATUSES) {
    expect(BADGE_FRAMES.get(status), `${status} has no frame`).toBeDefined();
  }
});

/* -------------------------------------------------------------------------- */
/* The frames                                                                 */
/* -------------------------------------------------------------------------- */

const ERAS: readonly EraId[] = [...CRISIS_CONTENT_ERAS];

/**
 * How each badge is put on the island, keyed by the status it photographs.
 *
 * The two directions are held by two different things, and both are needed. **A frame for a
 * status that no longer exists is a compile error**, because the map is keyed by
 * {@link CrisisStatus}; **a status with no frame is a red test**, which is the sweep above and
 * the direction a type cannot see. Measured rather than argued: delete the `lost` entry and the
 * sweep reports *expected [ 'threatened' ] to deeply equal [ 'lost', 'threatened' ]*.
 */
const BADGE_FRAMES: ReadonlyMap<
  CrisisStatus,
  (cast: Cast) => { readonly winter: HardWinterState; readonly what: string }
> = new Map<
  CrisisStatus,
  (cast: Cast) => { readonly winter: HardWinterState; readonly what: string }
>([
  [
    "threatened",
    (cast) => ({
      winter: openingWinter(cast.era, cast.placements),
      what: "the frost reaches this building when the round closes",
    }),
  ],
  [
    "lost",
    (cast) => {
      const opening = openingWinter(cast.era, cast.placements);
      return {
        winter: {
          ...opening,
          buildings: opening.buildings.map((building) =>
            building.node_id === cast.threatened
              ? {
                  ...building,
                  state: "ruin" as const,
                  damage: HARD_WINTER.damage.ruin_at,
                  cold_rounds: 3,
                  ruined_in_round: 2,
                  ruined_by: "cold" as const,
                }
              : building,
          ),
        },
        what: "the same building after the frost took it",
      };
    },
  ],
]);

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
/** Every frame this run wrote, so no two of them can be the same picture. */
const taken = new Map<string, string>();

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Where this test's viewport sits in the browser window, so a capture can be clipped to it. */
function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

/**
 * The composited frame, over CDP.
 *
 * `page.screenshot` is Playwright's locator capture and never gets past *"waiting for element to
 * be stable"* over a canvas running `frameloop="always"`; `winterIslandVisible.browser.test.tsx`
 * records the same finding. CDP takes the frame as it stands.
 */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

/** Width and height out of a PNG's IHDR, so a scaled capture cannot pass for the viewport. */
function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

async function keep(name: string, shot: string): Promise<void> {
  const size = pngSize(shot);
  expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
  expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
  /*
   * AND IT IS NOT A FRAME THIS RUN HAS ALREADY TAKEN. A byte-identical capture is how a stale
   * canvas layer passes for a second witness, and it is not hypothetical on this exact
   * instrument: `winterShieldAndThreat.browser.test.tsx` records two shield states coming back
   * bit-for-bit equal because the badge was out of frame, so the one photograph the design
   * exists to justify was a picture of something else.
   */
  for (const [other, bytes] of taken) {
    expect(shot === bytes, `${name} is byte-identical to ${other}`).toBe(false);
  }
  taken.set(name, shot);
  if (SHOTS) {
    await commands.writeFile(`${OUT}/${name}.png`, shot, { encoding: "base64" });
  }
}

/** The island under one board, with the real crisis sidebar over it. */
function IslandUnder({
  cast,
  board,
  controlsRef,
}: {
  readonly cast: Cast;
  readonly board: Board;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
}): ReactElement {
  const placed: readonly ScenePlacement[] = cast.placements.map((p) => ({
    nodeId: p.nodeId,
    col: p.col,
    row: p.row,
    rot: p.rot,
    model: resolveBuildingModel(p.nodeId, "built"),
    mastery: 2,
    celebrateToken: 0,
  }));
  const hall: SceneTownHall = {
    ...HALL_PLOT,
    model: resolveTownHallModel("built"),
    celebrateToken: 0,
  };
  return (
    <div className="city-shell">
      {/* `undefined` rather than `"false"` off the winter, which is exactly how `CitySurface`
          writes it: the crisis stylesheet only ever matches `[data-winter="true"]`, and a
          harness that spelt the absence differently from the app would be one more way for a
          frame to be of something the player never sees. */}
      <div className="city-surface" data-winter={board.winter ? "true" : undefined}>
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas
            layout={LAYOUT}
            placed={placed}
            townHall={hall}
            variant="day"
            reducedMotion
            controlsRef={controlsRef}
            onSelect={() => undefined}
            eraId={cast.era}
            winterRows={board.winter ? board.rows : null}
            winterFires={board.fires}
            winterFirePreviewAt={board.firePreviewAt}
            ruinedNodeIds={board.ruinedNodeIds}
            ruinedCells={board.ruinedCells}
            frostStageByNodeId={board.frostStageByNodeId}
            shieldedNodeIds={board.shieldedNodeIds}
            reinforceCandidates={board.reinforceCandidates}
            crisisThreatenedNodeIds={board.threatenedNodeIds}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
      {board.winter && (
        <WinterInCity
          placements={cast.placements}
          townHall={{ nodeId: TOWN_HALL_ID, ...HALL_PLOT }}
          canvasLive
          practisedNodeIds={WINTER_NODE_ORDER}
          onBoard={() => undefined}
          onExit={() => undefined}
        />
      )}
    </div>
  );
}

/**
 * **BRING A SUBJECT INTO FRAME WITH THE BUTTONS THE GAME GIVES THE PLAYER, AND NOTHING ELSE.**
 *
 * The crisis camera looks at the island's CENTRE and `winterFraming` then slides the projection
 * sideways so the settlement lands in the strip the panel leaves free. Anything out at the rim
 * is therefore a long way right of the middle, and zooming in pushes it further: measured on the
 * first run of this file, the fire at cell `(3, 2)` projected to about x=1100 in a 1024px frame,
 * so five frames came back with no fire in them at all and every assertion passed.
 *
 * So the camera is DRIVEN to the subject rather than left at the island's centre, and it is
 * driven through `applyCameraAction`, which is the zoom button and the arrow keys. Two things
 * follow, and both are the reason it is done this way rather than by writing to `controls`:
 *
 *  - the travel is decomposed into whole button PRESSES along the camera's own ground basis,
 *    which is exactly what `pan` moves by, so the frame is one the player can reach;
 *  - every press is clamped to `panBound`, the play area `CityScene` holds the target inside, so
 *    a subject the player could not centre is photographed as far over as they could get rather
 *    than from a camera position the game forbids.
 *
 * The tilt is untouched throughout: `VILLAGE_CAMERA.polarAngle` is the whole reason a storm roof
 * carries the shield's read, and a frame taken from a friendlier angle is not evidence about the
 * shipped one.
 */
function driveTo(
  controls: OrbitControlsLike,
  look: { readonly x: number; readonly z: number },
  zoomNotches: number,
): void {
  for (let notch = 0; notch < zoomNotches; notch += 1) {
    applyCameraAction(controls, "zoomIn");
  }
  const panBound = LAYOUT.islandRadius * PAN_BOUND_RATIO;
  // The camera's ground-projected forward and its rightward perpendicular, which is the basis
  // `pan` moves along. A pan carries the camera with the target, so the distance — and therefore
  // the step — does not change while panning.
  const eye = controls.object.position;
  const target = controls.target;
  const length = Math.hypot(target.x - eye.x, target.z - eye.z) || 1;
  const forward = { x: (target.x - eye.x) / length, z: (target.z - eye.z) / length };
  const right = { x: forward.z, z: -forward.x };
  const step = controlsDistance(controls) * VILLAGE_CAMERA.panStepRatio;
  const delta = { x: look.x - target.x, z: look.z - target.z };
  const along = Math.round((delta.x * forward.x + delta.z * forward.z) / step);
  const across = Math.round((delta.x * right.x + delta.z * right.z) / step);
  for (let press = 0; press < Math.abs(along); press += 1) {
    applyCameraAction(controls, along > 0 ? "panUp" : "panDown", panBound);
  }
  for (let press = 0; press < Math.abs(across); press += 1) {
    applyCameraAction(controls, across > 0 ? "panRight" : "panLeft", panBound);
  }
}

/** Keep the pan target inside this fraction of the island — mirrors `CityScene`. */
const PAN_BOUND_RATIO = 0.72;

/** Where a cell sits on the ground, for aiming the camera at it. */
function lookAtCell(cell: { readonly col: number; readonly row: number }): {
  x: number;
  z: number;
} {
  return cellCenter(cell.col, cell.row);
}

/** Where a node's plot sits on the ground, for aiming the camera at the building on it. */
function lookAtNode(cast: Cast, nodeId: string): { x: number; z: number } {
  const plot = cast.placements.find((p) => p.nodeId === nodeId);
  if (!plot) {
    throw new Error(`${nodeId} is not on the board, so the camera cannot be aimed at it`);
  }
  return transformCenter(plot, footprintFor(nodeId));
}

/** The middle of the settlement, for the frames whose subject is the whole board. */
function lookAtSettlement(cast: Cast): { x: number; z: number } {
  const centres = cast.placements.map((p) => transformCenter(p, footprintFor(p.nodeId)));
  return {
    x: centres.reduce((sum, c) => sum + c.x, 0) / centres.length,
    z: centres.reduce((sum, c) => sum + c.z, 0) / centres.length,
  };
}

/**
 * Mount one board, drive the camera with the PLAYER'S OWN controls, and photograph it.
 *
 * `panel: true` keeps the crisis sidebar in shot, which is the real screen; `false` hides it for
 * the instant of the capture and puts it straight back, so the island frame and the in-game
 * frame are one picture asked two questions rather than two pictures.
 */
async function photograph(
  cast: Cast,
  board: Board,
  name: string,
  options: {
    readonly panel?: boolean;
    readonly look: { readonly x: number; readonly z: number };
    readonly zoom: number;
  },
): Promise<void> {
  await page.viewport(VIEW.width, VIEW.height);
  /*
   * THE PREVIOUS MOUNT COMES DOWN FIRST, and it is not tidiness. `afterEach` cleans up whatever
   * `h` holds, so a test that photographs TWICE leaks its first harness into the page for the
   * rest of the file: measured on the first run, frames 9 onward came back with two crisis
   * sidebars stacked over two canvases, the hidden one being the stale harness's and the visible
   * one belonging to the mount actually being photographed. Every assertion passed.
   */
  h?.cleanup();
  h = null;
  const controlsRef = { current: null as OrbitControlsLike | null };
  h = mount(<IslandUnder cast={cast} board={board} controlsRef={controlsRef} />);

  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    40000,
  );
  if (board.winter) {
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-shell") !== null,
      "the crisis panel never rendered",
      40000,
    );
  }
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries, the frost course rebuilds when the
  // board arrives, and the storm roof's lift and the badges' roofline tracking both run in
  // `useFrame`. There is no renderer handle out here, so this waits on the clock and the size
  // and byte checks in `keep` are what make a too-early sample fail rather than pass quietly.
  await new Promise<void>((resolve) => setTimeout(resolve, 3500));

  const controls = controlsRef.current;
  if (!controls) {
    throw new Error("the canvas never handed its controls out, so nothing can be driven");
  }
  const wide = controlsDistance(controls);
  driveTo(controls, options.look, options.zoom);
  await new Promise<void>((resolve) => setTimeout(resolve, 1400));
  /*
   * THE CAMERA REALLY MOVED, AND IT REALLY LANDED ON THE SUBJECT. Asserted rather than assumed,
   * because a drive that did no work photographs the island's centre from the default distance
   * and looks like a perfectly good frame of the wrong thing — which is precisely what the first
   * run of this file produced. `CityScene` clamps both the dolly and the pan on the next frame
   * whatever this asks for, so what is measured here is where the game let the camera end up.
   */
  expect(
    controlsDistance(controls),
    `${name}: the player's zoom control moved the camera nowhere`,
  ).toBeLessThan(wide);
  const landed = Math.hypot(
    controls.target.x - options.look.x,
    controls.target.z - options.look.z,
  );
  expect(
    landed,
    `${name}: the camera settled ${landed.toFixed(1)}u from its subject`,
  ).toBeLessThan(LAYOUT.gridCell * 1.5);

  /*
   * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
   * device-metrics override on the page, which R3F sees as a resize and re-renders from — so
   * the first clipped capture after a mount comes back as the frame drawn before any of that
   * settled. `winterIslandVisible.browser.test.tsx` measured it coming back as flat pale sky.
   */
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 900));

  /*
   * THE DEV SKIP PANEL COMES OFF EVERY FRAME, and it is the one thing hidden that a player
   * would otherwise see nothing of. `WinterDevSkip` gates itself on `isDevPersistenceEnabled()`
   * — `VITE_DIAGNOSTIC_API_URL` unset — which is true in this harness and false for a learner,
   * so it is a control that ships to nobody and it sits over the island's top-right corner.
   * Leaving it in would put a black box over part of the surface these frames are about.
   */
  const hidden = [document.querySelector<HTMLElement>('[data-testid="hw-dev-skip"]')];
  if (board.winter && !options.panel) {
    const overlay = document.querySelector<HTMLElement>(".winter-in-city");
    if (!overlay) {
      throw new Error("the winter's overlay never mounted, so there is nothing to hide");
    }
    hidden.push(overlay);
  }
  for (const node of hidden) {
    if (node) {
      node.style.visibility = "hidden";
    }
  }
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    await keep(name, await capture());
  } finally {
    for (const node of hidden) {
      if (node) {
        node.style.visibility = "";
      }
    }
  }
}

/**
 * How many notches of the player's own zoom a frame is taken at.
 *
 * `WIDE` keeps the settlement and the ring of frost around it in one frame; `CLOSE` is where a
 * hearth, a storm roof or a badge is big enough to judge. Both are the zoom button, so both are
 * views a player has, and `CityScene` clamps either at `VILLAGE_CAMERA.minDistanceRatio`.
 */
const SPACIOUS = 1;
const WIDE = 2;
const CLOSE = 3;
/** As close as the game lets a player get: `zoomStep ** 4` is already past the dolly clamp. */
const CLOSEST = 5;

for (const era of ERAS) {
  const cast = castFor(era);
  const at = fireCell(cast);
  const suffix = `${era}-${VIEW.width}x${VIEW.height}`;

  /* ---------------------------------------------------------------------- */
  /* The fire, in the states the renderer can actually produce               */
  /* ---------------------------------------------------------------------- */

  test.runIf(SHOTS)(
    `photographs the fire being aimed: ${era}`,
    async () => {
      // A PROPOSAL: the ghosted hearth on the cell, and the ghosted held ground it would take,
      // banded by how certain each ring is (`winterFireGhost.ts`'s opacity ramp).
      const winter = playedIn(cast);
      await photograph(
        cast,
        boardFor(winter, { firePreviewAt: at }),
        `01-fire-proposed-${suffix}`,
        { look: lookAtCell(at), zoom: CLOSE },
      );
    },
    240000,
  );

  test.runIf(SHOTS)(
    `photographs a fire that never caught: ${era}`,
    async () => {
      // A DECLARATION THAT BOUGHT NOTHING: the batch was missed, so the tuning's `none` rung
      // gives a null radius and the hearth stands laid, fuelled and unlit.
      const winter = play(playedIn(cast), { kind: "fire", ...at }, MISSED);
      const lit = winter.fires.at(-1);
      expect(lit?.radius, "the fire caught, so this is not the unlit state").toBeNull();
      await photograph(cast, boardFor(winter), `02-fire-declared-never-caught-${suffix}`, {
        look: lookAtCell(at),
        zoom: CLOSE,
      });
    },
    240000,
  );

  /*
   * **THE FIRE THAT CAUGHT, AND ITS FUEL LADDER, WHICH ARE ONE SUBJECT IN `FUEL_STEPS` FRAMES.**
   *
   * The top rung IS the burning state — a fire that has just caught has its whole stack — so the
   * four-state sheet's third panel and the duration sheet's first are the same photograph, which
   * is how the reference pack sequenced it too.
   *
   * **THE BOARD IS HELD AND ONLY `rounds_left` MOVES, and that is the comparison rather than a
   * shortcut.** The design's own invariant is that duration is not width: *"a fire drawn
   * narrower as it burns down is a fire that covers less ground, which is the one reading this
   * frame exists to prevent."* Played forward instead, the frost advances between the rungs and
   * the held ground moves with the board, so three played frames could never show it. The set of
   * held cells is asserted identical across the rungs below, which is the caption's own truth
   * condition.
   */
  for (const rung of FUEL_RUNGS) {
    test.runIf(SHOTS)(
      `photographs the fire with ${rung} of ${FUEL_STEPS} rounds left: ${era}`,
      async () => {
        const lit = play(playedIn(cast), { kind: "fire", ...at }, ACED);
        expect(
          lit.fires.at(-1)?.radius,
          "the batch was aced and the fire still never caught",
        ).not.toBeNull();
        const winter: HardWinterState = {
          ...lit,
          fires: lit.fires.map((fire, index) =>
            index === lit.fires.length - 1 ? { ...fire, rounds_left: rung } : fire,
          ),
        };
        const board = boardFor(winter);
        // THE HELD GROUND IS THE SAME AT EVERY RUNG, which is what makes these three frames one
        // fire later rather than three fires. Compared against the top rung's own board.
        const heldAt = (state: HardWinterState) =>
          boardFor(state)
            .rows.flat()
            .filter((cell) => cell.warded)
            .map((cell) => `${cell.col},${cell.row}`)
            .sort()
            .join(" ");
        expect(
          heldAt(winter),
          `the fire holds different ground at ${rung} rounds left`,
        ).toBe(heldAt(lit));
        expect(board.rows.flat().filter((cell) => cell.warded).length).toBeGreaterThan(1);
        await photograph(
          cast,
          board,
          `03-fire-burning-fuel-${rung}-of-${FUEL_STEPS}-${suffix}`,
          { look: lookAtCell(at), zoom: CLOSE },
        );
      },
      240000,
    );
  }

  test.runIf(SHOTS)(
    `photographs a fire that caught, on the real screen: ${era}`,
    async () => {
      // THE SAME BOARD WITH THE PANEL OVER IT, which is how much island a player actually has.
      const winter = play(playedIn(cast), { kind: "fire", ...at }, ACED);
      await photograph(
        cast,
        boardFor(winter),
        `04-fire-burning-behind-the-panel-${suffix}`,
        {
          panel: true,
          look: lookAtCell(at),
          zoom: CLOSE,
        },
      );
    },
    240000,
  );

  test.runIf(SHOTS)(
    `photographs the ground after the fire burnt out: ${era}`,
    async () => {
      /*
       * BURNT OUT, and what the renderer produces for it is THE SAME HEARTH, LATER.
       *
       * **THIS FIXTURE WAS WRITTEN AGAINST AN ENGINE THAT NO LONGER EXISTS, AND THE FLAG IS WHY
       * NOBODY SAW IT.** It asserted `winter.fires` empties — *"`closeRound` decrements every fire
       * and drops the ones that reach zero, so a spent fire leaves `state.fires` entirely and
       * `WinterGround` draws nothing at all on its cell"* — which was true when this file merged
       * (`#420`, 12:04) and was false 82 minutes later: `#416` *"A spent hearth is a state on the
       * board, not a deletion from it"* landed at 13:26 and KEEPS the fire. This test then read
       * *"expected 1 to be 0"* on every run of the capture and CI never saw a thing, because the
       * frames are behind `VITE_WINTER_SHOTS` and the assertion is inside one.
       *
       * The frame committed as `05` is therefore a photograph of a board the engine cannot reach —
       * a bare cell where the shipped game leaves nine darkened stones and a wisp — and the state
       * `winterFire.ts` calls `spent` had no frame in this atlas at all.
       *
       * So the fixture now plays until the engine's own reading of the fire is `spent`, which is
       * `rounds_left` at zero with a radius that once caught. Played forward rather than
       * constructed, so the number of rounds is the tuning's and the ground closing over the
       * hearth is the reducer's own advance.
       */
      let winter = play(playedIn(cast), { kind: "fire", ...at }, SHORTEST_CATCHING.correct);
      const lit = winter.fires.at(-1);
      const burn = lit?.rounds_left ?? 0;
      expect(burn, "no fire was lit, so nothing can burn out").toBeGreaterThan(0);
      expect(
        lit ? winterFireState(lit) : null,
        "the declaration did not light a fire, so nothing can be spent",
      ).toBe("burning");
      winter = hardWinterReducer(winter, { type: "end_round" });
      const spentYet = (state: HardWinterState): boolean =>
        state.fires.some((f) => winterFireState(f) === "spent");
      for (let round = 0; round < burn && !spentYet(winter); round += 1) {
        winter = idleRound(winter);
      }
      // THE HEARTH IS STILL ON THE BOARD, and it is spent. Both halves, because the two failures
      // are opposite: a board that dropped the fire is the pre-`#416` engine and has nothing to
      // photograph, and a board still burning is a frame of the state before this one.
      expect(
        winter.fires.filter((f) => winterFireState(f) === "spent").length,
        "no hearth on the board is spent, so this frame is of some other state",
      ).toBe(1);
      expect(
        winter.fires.some((f) => winterFireState(f) === "burning"),
        "the fire is still burning, so it outlived the tuning's own ladder",
      ).toBe(false);
      // AND THE WINTER IS STILL RUNNING, so this is a spent fire rather than a finished
      // encounter: an ended winter thaws the board and the frame would be of something else.
      expect(
        winter.phase,
        "the fire outlasted the encounter, so this frame is of a winter that ended",
      ).not.toBe("ended");
      const key = winterCellKey(at.col, at.row);
      expect(
        hardWinterIsland(era).cells.includes(key),
        "the fire was lit off the island",
      ).toBe(true);
      await photograph(cast, boardFor(winter), `05-fire-burnt-out-${suffix}`, {
        look: lookAtCell(at),
        zoom: CLOSE,
      });
    },
    240000,
  );

  /* ---------------------------------------------------------------------- */
  /* The two kinds of ground boundary, which is the comparison               */
  /* ---------------------------------------------------------------------- */

  test.runIf(SHOTS)(
    `photographs the frost's cell edge against the fire's feathered rim: ${era}`,
    async () => {
      // THE COMPARISON THE WHOLE LAYER TURNS ON. A fire's ochre held ground pushes into the
      // frost sheet, so one frame carries both boundaries: a hard cell edge on one side of it
      // and a feathered one on the other.
      const winter = play(playedIn(cast), { kind: "fire", ...at }, ACED);
      const board = boardFor(winter);
      const warded = board.rows.flat().filter((cell) => cell.warded).length;
      const frozen = board.rows.flat().filter((cell) => cell.frozen).length;
      expect(warded, "no ground is held, so there is no feathered rim").toBeGreaterThan(1);
      expect(frozen, "nothing is frozen, so there is no cell edge").toBeGreaterThan(1);
      // Aimed at the SEAM rather than at the fire, and as close as the dolly clamp allows: the
      // two edges are a few world units of ground, and the frame that judges them has to be the
      // closest one a player can take.
      await photograph(cast, board, `06-ground-two-edges-${suffix}`, {
        look: lookAtCell(heldGroundSeam(board)),
        zoom: CLOSEST,
      });
    },
    240000,
  );

  /*
   * **FRAME `07` IS GONE WITH THE ACTION IT PHOTOGRAPHED (2026-08-02).**
   *
   * It shot *"ground the settlement gave up"*: the pull-back's churned fill on the rung above the
   * frost, with the raised-outline PREVIEW in the same frame because the proposal and the fact are
   * deliberately different treatments. It was resolved at zero accuracy on purpose, and the reason
   * is worth keeping for whoever shoots the next ground state: the ring went at every tier, but a
   * pull-back also hardened everyone left inside, so taken at full accuracy the frame came back
   * with a storm roof on every building in the settlement — a true picture of a well-answered
   * pull-back and a useless one of abandoned ground.
   *
   * The give-up-ground action was ruled out, so no board can carry that fill and there is nothing
   * to photograph. `08` below still shoots the SCAR one season on, because that is
   * `ScarredGround`'s layer and it is fed by the city's own persisted damage rather than by a
   * winter.
   */

  test.runIf(SHOTS)(
    `photographs the scar the crisis leaves in the thawed city: ${era}`,
    async () => {
      /*
       * **THE SAME GROUND ONE SEASON ON, WHICH IS A DIFFERENT LAYER.**
       *
       * `07` is the crisis board's churned abandoned terrain, drawn by `WinterGround`. This is
       * what is left of it once the frost lifts: `ScarredGround`'s ash slab under a 45-degree
       * hatch, on the island's own `worn` rung, on green grass in fair-weather light.
       *
       * **AND THE OTHER HALF OF M21 IS AN ABSENCE, SO IT IS SAID RATHER THAN SHOWN.** A cell
       * bought back leaves `ruined_cells` and the layer draws nothing at all for it, by the
       * 2026-08-01 ruling — so the reclaimed ground in this frame is the ordinary tussock beside
       * the scar, and there is no mark for a photograph to find. That is a fact about the code
       * rather than something a picture can establish, which is why it is asserted here.
       */
      const winter = playedIn(cast);
      // The island's own shoreline band, which is the ground a pull-back used to take and the band
      // a scarred city is most likely to be carrying. Read off the board rather than written down.
      const shoreline = boardFor(winter)
        .rows.flat()
        .filter((cell) => cell.land && cell.rim_depth === 0)
        .map((cell) => `${cell.col},${cell.row}`);
      const board = thawedCityAfter(winter, shoreline);
      expect(board.ruinedCells.length, "the city carries no scar").toBeGreaterThan(1);
      const held = board.rows.flat().filter((cell) => cell.land).length;
      expect(
        held,
        "the scar covers the whole island, so there is no unscarred ground to compare",
      ).toBeGreaterThan(board.ruinedCells.length);
      // A reclaimed cell simply leaves the set, so the layer has nothing to draw for it.
      const reclaimed = { ...board, ruinedCells: [] };
      expect(reclaimed.ruinedCells).toHaveLength(0);
      await photograph(cast, board, `08-ground-scar-after-the-thaw-${suffix}`, {
        look: lookAtSettlement(cast),
        zoom: SPACIOUS,
      });
    },
    240000,
  );

  /* ---------------------------------------------------------------------- */
  /* The five building protection states                                    */
  /* ---------------------------------------------------------------------- */

  test.runIf(SHOTS)(
    `photographs the five protection states on one island: ${era}`,
    async () => {
      const board = boardFor(winterWithFiveConditions(cast), {
        reinforceCandidates: new Set([cast.proposedShield]),
        frostStageFor: [cast.frosted, FROSTED_STAGE],
      });
      await photograph(cast, board, `09-protection-five-states-${suffix}`, {
        look: lookAtSettlement(cast),
        zoom: WIDE,
      });
      await photograph(cast, board, `10-protection-five-states-close-${suffix}`, {
        look: lookAtSettlement(cast),
        zoom: CLOSE,
      });
    },
    360000,
  );

  test.runIf(SHOTS)(
    `photographs the protected/frosted pair as an A/B on one building: ${era}`,
    async () => {
      /*
       * **THE PAIR TO WATCH, WITH THE BUILDING HELD FIXED.**
       *
       * Both a storm roof and a frost crust put a pale mass on a building, and side by side on
       * two buildings the comparison carries a confound: the two are different heights, so an
       * apparent difference could be the models rather than the treatments. These two frames are
       * the SAME building, the same plot, the same camera and the same instant of the same
       * board, with one thing changed. Flip between them and what moves is the treatment.
       */
      const node = cast.protectedNode;
      await photograph(
        cast,
        boardFor(winterWithOneBuilding(cast, node, "shield")),
        `11-protected-${node}-${suffix}`,
        { look: lookAtNode(cast, node), zoom: CLOSE },
      );
      await photograph(
        cast,
        boardFor(winterWithOneBuilding(cast, node, "frost")),
        `12-frosted-${node}-${suffix}`,
        { look: lookAtNode(cast, node), zoom: CLOSE },
      );
    },
    360000,
  );

  /* ---------------------------------------------------------------------- */
  /* The badges                                                             */
  /* ---------------------------------------------------------------------- */

  for (const [index, status] of CRISIS_STATUSES.entries()) {
    test.runIf(SHOTS)(
      `photographs the ${status} badge over the island: ${era}`,
      async () => {
        const build = BADGE_FRAMES.get(status);
        if (!build) {
          throw new Error(
            `${status} has no frame, which the always-on sweep should have caught`,
          );
        }
        const board = boardFor(build(cast).winter);
        await photograph(cast, board, `${13 + index}-badge-${status}-${suffix}`, {
          look: lookAtNode(cast, cast.threatened),
          zoom: CLOSE,
        });
      },
      240000,
    );
  }

  test.runIf(SHOTS)(
    `photographs a building that is shielded AND threatened: ${era}`,
    async () => {
      /*
       * THE OVERLAP, which `CrisisStatusMarker.tsx` calls *"the frame most likely to turn to
       * mush"*: two facts about one building on two channels that must not collide — the shield
       * on the building's own geometry, the threat on a billboard above everything the shield
       * added. The shield goes on the building the BOARD threatens, so the pair is a real state
       * rather than two flags set on one object.
       */
      const opening = openingWinter(cast.era, cast.placements);
      const winter = {
        ...opening,
        buildings: opening.buildings.map((building) =>
          building.node_id === cast.threatened
            ? { ...building, shield: SHIELD_GRANT }
            : building,
        ),
      };
      const board = boardFor(winter);
      expect([...board.shieldedNodeIds]).toContain(cast.threatened);
      expect([...board.threatenedNodeIds]).toContain(cast.threatened);
      await photograph(
        cast,
        board,
        `${13 + CRISIS_STATUSES.length}-badge-shielded-and-threatened-${suffix}`,
        { look: lookAtNode(cast, cast.threatened), zoom: CLOSE },
      );
    },
    240000,
  );
}
