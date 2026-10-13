import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  type WinterBuilding,
  winterDamageStage,
} from "@cr/game";
import type { ReactElement, RefObject } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import {
  winterShieldedNodeIds,
  winterSpentShields,
  winterThreatenedNodeIds,
} from "../../winter/buildingThreat";
import { WINTER_NODE_ORDER } from "../../winter/hardWinterItems";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { resolveTownHallModel } from "../townHall";
import type { PlacedTransform } from "../worldLayout";
import { applyCameraAction, controlsDistance, type OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import { crisisDressing, type ScenePlacement, type SceneTownHall } from "./CityScene";
import { crisisLabelState } from "./SkillLabels";
import { WinterInCity } from "./WinterInCity";

import "../../styles.css";
import { eraCityLayout } from "../islandLand";

/**
 * **CAN YOU TELL A PROTECTED BUILDING FROM A SPENT ONE, ON THE ISLAND, AT THE CAMERA THE GAME
 * ACTUALLY USES?**
 *
 * `winterShield.test.ts` proves the geometry in node and
 * `winterShieldAndThreat.browser.test.tsx` proves one dressed building composes in a drawn scene.
 * Neither answers the question the feature exists for, and it is a question about a WHOLE FRAME
 * rather than about a component: five buildings stand on one island in five different conditions,
 * and a player has to read which is which **at the distance the crisis camera puts them at, with
 * the crisis panel over half the screen.**
 *
 * The evidence rule this file is written to: *a claim about what is visible AROUND an element has
 * to be framed to show the other thing.* Every frame the shield had before this one was a single
 * building fitted to the frame, which is the one part of the picture nobody doubted. So the frames
 * here are of the SURFACE — the island, the lagoon, the fog and the sidebar — and the five
 * conditions are in it together, because the confusion being ruled out is between NEIGHBOURS.
 *
 * ## THE FIVE CONDITIONS, AND WHICH PAIRS ARE THE DANGEROUS ONES
 *
 * | condition | what the renderer is told | the pair it must survive |
 * | --- | --- | --- |
 * | protected | `shield: "raised"` | vs **frosted** — a storm roof and a rimed roof are both pale masses on a pale sky, which is the check `09-building-protection-states` names |
 * | spent | nothing at all: no roof and no badge | vs **protected**, which is the pair the binary ruling creates, because a spent shield takes a whole structure off in one step |
 * | threatened, unprotected | a `threatened` badge, no roof | vs **spent** — the same building with a different thing over its head |
 * | frosted | `frostStage` above zero | vs protected and vs ruined |
 * | ruined | the ruin stage and a `lost` badge | vs frosted, which is the same building further along |
 *
 * ## THE FRAMES WERE RE-TAKEN ON 2026-08-01 WITHOUT THE `safe` HEXAGON, AND THAT IS WHY
 *
 * `#381`'s frames proved the five mutually distinguishable **with a stone hexagon over every
 * standing building**. The lead then ruled the hexagon off, in favour of the brief's *nothing
 * added*, so three of the five conditions here (protected, spent, frosted) lost a badge they had
 * when the separation was last photographed. The hexagon could have been carrying some of that
 * separation, by giving the eye a baseline "ordinary building" reading the other states departed
 * from, and a claim about a board that no longer ships is not evidence about this one. So this
 * file's frames were regenerated after the removal and read again with the labels covered.
 *
 * ## THE CONDITIONS ARE DERIVED FROM THE ENGINE, NOT LABELLED HERE
 *
 * A frame set whose captions are written by the test is a frame set that cannot be wrong about
 * what it is showing. So the winter below is a real `HardWinterState`, its board is projected
 * through `hardWinterView`, and every set the canvas is handed comes out of the same three
 * functions `WinterInCity`'s bridge uses — including {@link winterSpentShields}, which is what
 * NAMES the spent building rather than a comment claiming one.
 *
 * The always-on test is the census over those derivations. The photographs are behind
 * `VITE_WINTER_SHOTS=1` for the reason `winterCrisisShots.browser.test.tsx` records: two
 * shadow-mapped scenes with seven GLBs each, left on, starve an animation-timing assertion in
 * some other file once per run, which is worse than having no photographs because the next
 * reader cannot tell it from a regression.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own short laptop window. Named in the filename, per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

const LAYOUT = eraCityLayout("prehistoric");

/**
 * **A COMPACT CITY, ON PURPOSE, AND THE REASON IS THE CAMERA.**
 *
 * `winterFraming` dollies the view out until the whole settlement fits the strip the sidebar
 * leaves free, so a city spread over the buildable disc is photographed from further away and
 * every building in it is smaller. A cluster needs no widening at all, which puts these six
 * buildings on screen at the size the game gives them at rest — the size the read has to survive.
 *
 * Two of the six stand OUT at rim depth 1, which is inside the frost below, and that is what
 * makes their conditions facts about the board rather than flags set by hand: `(3, 2)` is the
 * THREATENED one and `(-2, 3)` is the RUIN. The other four sit at depth 3, two rings clear of
 * everything the frost holds or takes this round, so they are unthreatened and their dressing is
 * about the shield alone.
 */
const CITY: readonly PlacedTransform[] = [
  { nodeId: "NUM.S", col: -2, row: -2, rot: 0 },
  { nodeId: "NUM.F", col: 1, row: -2, rot: 0 },
  { nodeId: "NUM.3", col: -2, row: 1, rot: 0 },
  { nodeId: "NUM.5", col: 1, row: 1, rot: 0 },
  { nodeId: "NUM.4", col: -2, row: 3, rot: 0 },
  { nodeId: "NUM.2", col: 3, row: 2, rot: 0 },
];
const HALL: PlacedTransform = { nodeId: "town-hall", col: 0, row: -1, rot: 0 };

/**
 * How the six are dressed, by node. Every value is READ BACK off the engine below.
 *
 * **WHICH NODE CARRIES WHICH CONDITION IS A CHOICE, and two of them are the whole point.**
 * The protected one and the frosted one are the pair `09-building-protection-states` says to
 * watch — *"if a storm roof and a frosted roof read as the same pale mass, the oversail is not
 * deep enough"* — so both are put on TALL 2x2 buildings, `NUM.S` (the Deco Tower) and `NUM.5`
 * (the Lookout, which `worldLayout.ts` records rendering at 9.769u). That is the hard case for
 * the OVERSAIL: a storm roof and a rimed roof on two buildings of the same size and shape, which
 * is what makes the pair a comparison at all.
 *
 * It used to be argued the other way as well, that a crust on a short building was not a
 * comparison because the crust swallowed it. **That half is now fixed rather than avoided.**
 * `frostStage.ts` banded the crust at `MAX_BUILD_HEIGHT * MAX_SHELL_RATIO`, which is 2.56u at
 * stage two against a 1.828u Workshop; it is a fraction of each building's own measured height,
 * and `frostCrustSilhouette.browser.test.tsx` carries that claim with its before and after frames.
 */
const PROTECTED = "NUM.S";
const SPENT = "NUM.F";
const THREATENED = "NUM.2";
const FROSTED = "NUM.5";
const RUINED = "NUM.4";
/** The sixth is left alone, so an ordinary winter building is in the frame for comparison. */
const PLAIN = "NUM.3";

/**
 * **DAMAGE POINTS ON THE FROSTED ONE, DERIVED FROM THE TUNING RATHER THAN CHOSEN.**
 *
 * It was the literal `3`, which was "a middle appearance, well short of a ruin" while
 * `damage.ruin_at` was 6 and became **an impossible building** when `#374` landed `ruin_at: 2`:
 * `closeRound` clamps damage AT `ruin_at` and ruins anything that reaches it, so no standing
 * building can carry three points. `winterDamageStage` read it as the RUIN band, and the census
 * correctly reported a frosted building wearing a ruin's crust.
 *
 * One under `ruin_at` was the MOST damage a standing building could carry, which was both
 * engine-legal and the worst case the crust had to read at. **THE DOCBLOCK'S OWN LAST SENTENCE
 * CAME TRUE ON 2026-08-02**: it read *"at `ruin_at: 1` there would be no standing damaged state at
 * all and this file would be photographing four conditions while claiming five"*, the lead ruled
 * `ruin_at: 1`, and that is exactly where this file is.
 *
 * The condition stays and the STAGE is constructed instead. `frostStage.ts` still draws a crust for
 * a building whose stage is above zero, `HARD_WINTER.damage.stages` is deliberately left at 3 with
 * its rungs in place, and this file's subject is whether the five conditions are five different
 * INSTRUCTIONS TO THE RENDERER — which they are whether or not a board can reach one of them. What
 * changes is that the unreachability is asserted rather than assumed, below.
 */
const FROSTED_DAMAGE = HARD_WINTER.damage.ruin_at - 1;

/** The stage the frosted condition is photographed at, since no damage value produces one. */
const FROSTED_STAGE = 1;
/**
 * What the spent building carried before the round that emptied it, and what the protected one
 * still carries. Both off `reinforce.shield_by_tier`, because a shield this file invented could
 * be a magnitude no declaration can buy.
 */
const SPENT_BEFORE = HARD_WINTER.reinforce.shield_by_tier.weak;
const PROTECTED_SHIELD = HARD_WINTER.reinforce.shield_by_tier.steady;

/**
 * **THE WINTER THESE SIX STAND IN, BUILT FROM THE ENGINE'S OWN OPENING STATE.**
 *
 * Two fields are moved and nothing else: which ground is frozen, and what the frost has done to
 * each building. Both are states the reducer itself produces — `frozen` grows a band a round and
 * `damage`, `shield` and `state` are what `closeRound` writes — so nothing here is a shape the
 * engine could not reach. What it buys is REACHING ALL FIVE AT ONCE, which a played winter cannot
 * do on one board: by the round the frost has ruined a shoreline building it is also lapping at
 * the deep ones, so there is no unthreatened protected building left to photograph beside it.
 *
 * `frozen` is every cell at rim depth 1 or shallower, which is the board two rounds in. The
 * advance `hardWinterView` projects is one ring from there, so depth 2 is `frost_next` and the
 * cluster at depths 3 and 4 is untouched: exactly one of the six is threatened, and it is
 * threatened because of where it stands.
 */
function winterWithFiveConditions(): {
  readonly winter: HardWinterState;
  readonly before: readonly WinterBuilding[];
} {
  const opening = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const frozen = island.cells.filter((key) => (island.rim_depth.get(key) ?? 9) <= 1);

  const dress = (building: WinterBuilding): WinterBuilding => {
    if (building.node_id === PROTECTED) {
      return { ...building, shield: PROTECTED_SHIELD };
    }
    if (building.node_id === FROSTED) {
      // The DAMAGE is left alone and the stage is set on the board instead: see `FROSTED_STAGE`.
      // `FROSTED_DAMAGE` is zero at this tuning, so setting it would set nothing.
      return { ...building, cold_rounds: 2 };
    }
    if (building.node_id === RUINED) {
      return {
        ...building,
        state: "ruin",
        damage: HARD_WINTER.damage.ruin_at,
        cold_rounds: 3,
        ruined_in_round: 2,
        ruined_by: "cold",
      };
    }
    // The spent one and the plain one are the SAME building state, which is the ruling this
    // whole file is checking a player can live with. The difference is in the rail's words.
    return building;
  };

  return {
    /*
     * **ROUND ONE, AND IT WAS THREE UNTIL 2026-08-02.** The round decides how far the FRONT reaches,
     * because `frost_next` is the whole of the round's advance: `spread.accelerate_every` was 4, so
     * round three took one step and exactly one building was threatened. At `accelerate_every: 1`
     * round three takes three steps and the front swallows most of the island, so five buildings came
     * out threatened and the "exactly one" census below could not hold.
     *
     * Round one keeps the front one band deep at any acceleration, which is the same reason
     * `spread.base` is 1. The frozen region is unchanged, so the board these frames are taken over is
     * the same picture.
     */
    winter: { ...opening, round: 1, frozen, buildings: opening.buildings.map(dress) },
    before: opening.buildings.map((b) =>
      b.node_id === SPENT ? { ...b, shield: SPENT_BEFORE } : dress(b),
    ),
  };
}

/** The board, wired exactly the way `WinterInCity`'s bridge wires it for the canvas. */
function boardFor(winter: HardWinterState) {
  const view = hardWinterView(winter, { fire_preview: null });
  const frostStageByNodeId = new Map<string, number>();
  for (const building of winter.buildings) {
    const stage = winterDamageStage(building);
    if (building.state === "standing" && stage > 0) {
      frostStageByNodeId.set(building.node_id, stage);
    }
  }
  // AND THE ONE STAGE NO DAMAGE VALUE PRODUCES, set here so the frosted condition still has a
  // crust to be photographed and told apart from the other four. See `FROSTED_STAGE`.
  if (winter.buildings.some((b) => b.node_id === FROSTED && b.state === "standing")) {
    frostStageByNodeId.set(FROSTED, FROSTED_STAGE);
  }
  return {
    rows: view.rows,
    ruinedNodeIds: new Set(
      winter.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
    ) as ReadonlySet<string>,
    frostStageByNodeId: frostStageByNodeId as ReadonlyMap<string, number>,
    shieldedNodeIds: winterShieldedNodeIds(winter.buildings, false),
    threatenedNodeIds: winterThreatenedNodeIds(view.rows),
  };
}

/**
 * **THE CENSUS, AND IT IS THE HALF THAT RUNS IN CI.**
 *
 * The claim is that the five conditions the frames are supposed to tell apart are five DIFFERENT
 * instructions to the renderer. It is asserted as a set equality in both directions rather than
 * as five spot checks, because the failure this guards against is a collapse: a `shielded` set
 * that leaked into `threatened`, a spent building that kept its roof, a ruin that kept its
 * shield. Any of those makes two of the frames the same picture, and a frame set cannot tell.
 *
 * The population is the six buildings on the board, read off the board. It is floored at six so a
 * city that lost a building cannot make this pass by having less to check, and the DISTINCTNESS
 * is asserted over the dressings rather than over the node ids, because six ids are trivially
 * distinct and six dressings are the claim.
 *
 * `frostStage` and `ruined` are part of the tuple on purpose. `crisisDressing` alone cannot tell
 * a spent building from a frosted one (both are `{ shield: "none", status: null }`), and it is
 * right that it cannot: the frost is drawn by `frostStage.ts` on the building's own surface, so
 * the renderer separates them on a channel this function does not own. A census over
 * `crisisDressing` alone would report five conditions where the screen has four.
 */
test("the five conditions the frames must tell apart are five different dressings", () => {
  const { winter, before } = winterWithFiveConditions();
  const board = boardFor(winter);

  /*
   * **THE FIXTURE IS LEGAL AT THIS TUNING, checked before it is used.**
   *
   * `#374` landed `damage.ruin_at: 2`, and the two constants below were literals chosen against
   * the 6 it replaced. A fixture that constructs a building the engine cannot produce does not
   * merely go red, it photographs a state nobody can reach — so the two preconditions are stated
   * here where they fail loudly rather than left to be inferred from a deep-equal diff.
   *
   * The frosted building must be DAMAGED and NOT a ruin, which is only a state at all while
   * `ruin_at` is above one. The spent building must have carried a shield a declaration can
   * actually buy, and enough of one that `winterSpentShields` has something to report.
   */
  // **THE FROSTED CONDITION IS A CONSTRUCTED STAGE**, and this is where that is stated rather than
  // inferred. It read `expect(FROSTED_DAMAGE).toBeGreaterThan(0)` over a damage value the engine
  // could produce; at `damage.ruin_at: 1` it is zero and no board reaches the state. What is
  // asserted instead is that the crust the frame photographs is a real rung of the renderer's own
  // ladder — which is what `frostStage.ts` reads and what a restored `ruin_at` would reach again.
  expect(FROSTED_DAMAGE, "a standing damaged state is reachable again").toBe(0);
  expect(FROSTED_STAGE, "the frosted frame photographs no crust").toBeGreaterThan(0);
  expect(FROSTED_STAGE).toBeLessThanOrEqual(HARD_WINTER.damage.stages);
  expect(
    SPENT_BEFORE,
    "the weakest tier buys no shield, so nothing can be spent",
  ).toBeGreaterThan(0);

  // THE SPENT BUILDING IS THE ONE THE ENGINE'S OWN READING NAMES, not the one a constant says.
  expect(
    winterSpentShields(before, winter.buildings),
    "the round did not spend a shield, so nothing in these frames is the spent state",
  ).toEqual([SPENT]);

  // AND THE THREATENED ONE IS THREATENED BY WHERE IT STANDS. Exactly one, so the frames have a
  // threatened building and an unthreatened one to compare it with.
  expect([...board.threatenedNodeIds].sort()).toEqual([THREATENED]);
  expect([...board.shieldedNodeIds].sort()).toEqual([PROTECTED]);
  expect([...board.ruinedNodeIds].sort()).toEqual([RUINED]);

  /*
   * **THE `shield` FIELD IS GONE FROM THIS TUPLE AND THE `label` ONE REPLACED IT (2026-08-03).**
   * The storm roof was scrapped on the lead's ruling — *"scrap the shield youre using completely
   * ... other than an indicator over it that says shielded"* — so `crisisDressing` no longer
   * carries a shield to census. The FACT it carried has not gone anywhere: it is the building's
   * floating label, which reads SHIELDED for as long as it is one, so the condition this file
   * exists to tell apart is still measured and is measured where it is now drawn.
   */
  const dressingOf = (nodeId: string) => ({
    ...crisisDressing(nodeId, {
      winter: true,
      ruinedNodeIds: board.ruinedNodeIds,
      shieldedNodeIds: board.shieldedNodeIds,
      reinforceCandidates: new Set<string>(),
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

  const census = new Map(CITY.map((p) => [p.nodeId, dressingOf(p.nodeId)] as const));
  expect(census.size, "the board lost a building, so the census has less to compare").toBe(
    6,
  );

  /*
   * ONLY TWO OF THE SIX WEAR A BADGE AT ALL, which is the 2026-08-01 ruling counted on a real board
   * rather than argued from one call, and it is asserted FIRST because it is the claim the frames
   * below were re-taken for. Every standing building carried a `safe` hexagon until that ruling, so
   * this set was all six and the last frames of these conditions were taken that way.
   *
   * Pinned in both directions: the badged set is exactly the threatened building and the ruin, so a
   * hexagon reinstated anywhere fails at the membership, and a badge lost from either of the two
   * that owe one fails as well. The complement is counted too, because "these two are badged" is
   * satisfied by a board where four others are badged as well.
   */
  const badged = CITY.filter((p) => census.get(p.nodeId)?.status !== null).map(
    (p) => p.nodeId,
  );
  expect(badged.sort()).toEqual([RUINED, THREATENED].sort());
  expect(
    CITY.length - badged.length,
    "the crisis badged buildings it has nothing to say about",
  ).toBe(4);

  // THE FIVE REQUIRED CONDITIONS, each pinned to the building the frames caption it as. Written
  // out rather than derived, because these five ARE the requirement and a derivation of them
  // from the same source they are checked against would assert nothing.
  expect(census.get(PROTECTED)).toEqual({
    label: "shielded",
    status: null,
    frostStage: 0,
    ruined: false,
  });
  expect(census.get(SPENT)).toEqual({
    label: "safe",
    status: null,
    frostStage: 0,
    ruined: false,
  });
  expect(census.get(THREATENED)).toEqual({
    label: "threatened",
    status: "threatened",
    frostStage: 0,
    ruined: false,
  });
  /*
   * THE FROSTED ONE IS THE EXCEPTION TO "WRITE IT OUT", and the reason is that its stage NUMBER
   * is not this file's claim. It pinned `frostStage: 2`, which was the middle band at
   * `ruin_at: 6`; at `ruin_at: 2` there is one standing band and it is a different number.
   * `frostStage.ts` and its own guards own the banding, and re-deriving `winterDamageStage`'s
   * arithmetic here would be two copies of one calculation agreeing with each other.
   *
   * What this file is entitled to require is that the frost reaches the renderer as a real stage
   * on this building and on nothing else in the frame, which is the channel the crust is drawn on.
   * Bounded at both ends, so a reading that had silently collapsed to zero or run past the ladder
   * fails here, and the distinctness count below still compares the whole tuple.
   *
   * **THE UPPER BOUND IS STRICT, and that is the one place this differs from how `#389` wrote it.**
   * It landed as `<= HARD_WINTER.damage.stages`, which is satisfied by `stages` itself, and
   * `winterDamageStage` returns exactly `stages` for a RUIN. So the loose form passes on the defect
   * that took trunk red: a frosted condition wearing the ruin's own band. Strict rules the ruin band
   * out, which is what "frosted, and not the picture beside it" means in a file whose whole job is
   * telling those two apart. It is also not a hypothetical: `damage.stages` is deliberately left at
   * 3 with two of its bands unreachable (see `HARD_WINTER.damage.stages`), so a retune that
   * collapses it onto the ruin band is a live possibility, and measured at `stages: 1` the strict
   * bound fails where the loose one passes.
   */
  const frosted = census.get(FROSTED);
  expect(frosted?.label).toBe("safe");
  expect(frosted?.status).toBeNull();
  expect(frosted?.ruined).toBe(false);
  expect(
    frosted?.frostStage,
    "the damaged building reaches the renderer with no frost on it",
  ).toBeGreaterThan(0);
  expect(
    frosted?.frostStage,
    "the frosted building wears the RUIN's own band, which is the state it exists to be told from",
  ).toBeLessThan(HARD_WINTER.damage.stages);
  expect(census.get(RUINED)).toEqual({
    label: "lost",
    status: "lost",
    frostStage: 0,
    ruined: true,
  });

  /*
   * AND SPENT IS THE SAME PICTURE AS NEVER-SHIELDED, asserted rather than left implicit.
   *
   * This is the one pair the island deliberately does NOT separate — the binary ruling says a
   * spent shield reverts to the ordinary building, and the rail's spent-shield notice is the whole
   * of the difference. Pinning it here means a later change that gave spent its own treatment
   * fails a test that says why it was not supposed to, rather than passing quietly and leaving two
   * documents describing a mechanic that had moved.
   */
  expect(census.get(SPENT)).toEqual(census.get(PLAIN));

  // FIVE DISTINCT DRESSINGS OVER SIX BUILDINGS, and the arithmetic is the claim: five
  // conditions, one of which two buildings share because spent and never-shielded are the same
  // picture by ruling. Asserted as a number so a collapse anywhere in the table fails here as
  // well as at its own expectation, and so a treatment added to spent fails twice.
  const distinct = new Set([...census.values()].map((d) => JSON.stringify(d)));
  expect(distinct.size).toBe(5);
});

/* -------------------------------------------------------------------------- */
/* The frames                                                                 */
/* -------------------------------------------------------------------------- */

const SCENE_PLACED: readonly ScenePlacement[] = CITY.map((p) => ({
  nodeId: p.nodeId,
  col: p.col,
  row: p.row,
  rot: p.rot,
  model: resolveBuildingModel(p.nodeId, "built"),
  mastery: 2,
  celebrateToken: 0,
}));

const SCENE_HALL: SceneTownHall = {
  col: HALL.col,
  row: HALL.row,
  rot: HALL.rot,
  model: resolveTownHallModel("built"),
  celebrateToken: 0,
};

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

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

/**
 * The island under the five conditions, with the crisis sidebar over it.
 *
 * The sidebar is the real one — `WinterInCity` mounting the real surface — because half the claim
 * is about how much island is LEFT once it is on screen. Its own board is not what the canvas
 * draws: this scene needs a state no sequence of clicks reaches on one board, so the constructed
 * board is passed to the canvas host directly, exactly as `CitySurface` passes the published one.
 */
function IslandUnderFiveConditions({
  board,
  controlsRef,
}: {
  readonly board: ReturnType<typeof boardFor>;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
}): ReactElement {
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter="true">
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas
            layout={LAYOUT}
            placed={SCENE_PLACED}
            townHall={SCENE_HALL}
            variant="day"
            reducedMotion
            controlsRef={controlsRef}
            onSelect={() => undefined}
            eraId={CURRENT_ERA_ID}
            winterRows={board.rows}
            ruinedNodeIds={board.ruinedNodeIds}
            frostStageByNodeId={board.frostStageByNodeId}
            shieldedNodeIds={board.shieldedNodeIds}
            crisisThreatenedNodeIds={board.threatenedNodeIds}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
      <WinterInCity
        placements={CITY}
        townHall={HALL}
        canvasLive
        practisedNodeIds={WINTER_NODE_ORDER}
        onBoard={() => undefined}
        onExit={() => undefined}
      />
    </div>
  );
}

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

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/winter-protection/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
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

/**
 * How many notches of the PLAYER'S OWN zoom control the close pair is taken at.
 *
 * Not a camera of this test's invention: `applyCameraAction(controls, "zoomIn")` is the button and
 * the wheel, and `CityScene` clamps the dolly to `VILLAGE_CAMERA.minDistanceRatio` on the next
 * frame whatever this asks for. So the close frame is a view a player can reach with the controls
 * the game gives them, and asking for more notches than the clamp allows cannot manufacture one
 * they cannot.
 *
 * **TWO RATHER THAN THREE SINCE 2026-08-01, because the third notch was spending conditions.** At
 * three the ruin's own badge left the frame at the bottom-right corner and the threatened building
 * left it at the right, so the close pair showed three of the five while the whole point of getting
 * closer is the PAIRWISE reading. At two the close pair carries four of the five and the wide pair
 * carries all five. The threatened building is the corner one at rim depth 1, so no reachable zoom
 * keeps it and the storm roof in one close frame; that is a fact about where a threatened building
 * has to stand and is why the wide pair is the frame the claim rests on.
 */
const ZOOM_NOTCHES = 2;

test.runIf(SHOTS)(
  `photographs the five conditions on one island at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await page.viewport(VIEW.width, VIEW.height);
    const { winter } = winterWithFiveConditions();
    const controlsRef = { current: null as OrbitControlsLike | null };
    h = mount(
      <IslandUnderFiveConditions board={boardFor(winter)} controlsRef={controlsRef} />,
    );

    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      30000,
    );
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-shell") !== null,
      "the crisis panel never rendered",
      30000,
    );
    await document.fonts.ready;
    // The GLBs resolve behind their own Suspense boundaries, the frost course rebuilds when the
    // board arrives, and both the storm roof's lift and the badges' roofline tracking run in
    // `useFrame`. There is no renderer handle out here, so this waits on the clock and the pixel
    // floors below are what make a too-early sample fail rather than pass quietly.
    await new Promise<void>((resolve) => setTimeout(resolve, 3500));
    /*
     * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
     * device-metrics override on the page, which R3F sees as a resize and re-renders from — so
     * the first clipped capture after a mount comes back as the frame drawn before any of that
     * settled. `winterIslandVisible.browser.test.tsx` measured it coming back as flat pale sky.
     */
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    // THE REAL SCREEN FIRST: the island as a player has it, with the sidebar taking its half.
    const composite = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-in-game-five-conditions`, composite);

    // AND THE CANVAS WITH THE PANEL OUT OF THE WAY, which is where the buildings behind the
    // sidebar's own column can be read. Same camera, same frame, same instant: only the overlay
    // moves, so the pair is one picture asked two questions rather than two pictures.
    const overlay = document.querySelector<HTMLElement>(".winter-in-city");
    if (!overlay) {
      throw new Error("the winter's overlay never mounted, so there is nothing to hide");
    }
    overlay.style.visibility = "hidden";
    let island: string;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      island = await capture();
    } finally {
      overlay.style.visibility = "";
    }
    await keep(`${VIEW.width}x${VIEW.height}-island-five-conditions`, island);

    /*
     * AND THE SAME ISLAND AT THE PLAYER'S OWN ZOOM, because the two frames above answer *"is it
     * on screen"* and the pairwise question is *"can you tell these two apart"*. A crop would
     * answer the second by throwing away the first, which is the substitution the evidence rule
     * is about; a dolly keeps the ground, the drifts, the lagoon and the neighbours in frame and
     * simply gets closer to them, the way a reviewer with a mouse wheel would.
     */
    const controls = controlsRef.current;
    if (!controls) {
      throw new Error("the canvas never handed its controls out, so nothing can be zoomed");
    }
    const wide = controlsDistance(controls);
    for (let i = 0; i < ZOOM_NOTCHES; i += 1) {
      applyCameraAction(controls, "zoomIn");
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    // The scene's own clamp had a frame to pull this back, so what is left is a dolly the game
    // allows. Asserted rather than assumed: a zoom that did not take would photograph the wide
    // frame twice and the byte check below is the only other thing that could notice.
    const close = controlsDistance(controls);
    expect(close, "the player's zoom control moved the camera nowhere").toBeLessThan(wide);
    await capture();
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    const closeComposite = await capture();
    await keep(
      `${VIEW.width}x${VIEW.height}-in-game-five-conditions-zoomed`,
      closeComposite,
    );
    overlay.style.visibility = "hidden";
    let closeIsland: string;
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      closeIsland = await capture();
    } finally {
      overlay.style.visibility = "";
    }
    await keep(`${VIEW.width}x${VIEW.height}-island-five-conditions-zoomed`, closeIsland);

    const frames = [
      ["in-game", composite],
      ["island", island],
      ["in-game-zoomed", closeComposite],
      ["island-zoomed", closeIsland],
    ] as const;
    for (const [name, shot] of frames) {
      const size = pngSize(shot);
      expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
      expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
    }

    /*
     * AND NO TWO OF THE FOUR ARE THE SAME FRAME. Byte-identical captures are how a stale canvas
     * layer passes for a second witness, which is a defect this exact instrument has produced
     * before: `winterIslandVisible.browser.test.tsx` records two consecutive captures agreeing
     * with each other and disagreeing with the live scene, and
     * `winterShieldAndThreat.browser.test.tsx` records two shield states coming back bit-for-bit
     * equal because the badge was out of frame. Four frames that are supposed to show four things
     * and are pairwise equal are not four pieces of evidence, they are one.
     */
    for (const [a, aShot] of frames) {
      for (const [b, bShot] of frames) {
        if (a >= b) {
          continue;
        }
        expect(aShot === bShot, `${a} is byte-identical to ${b}`).toBe(false);
      }
    }
  },
  180000,
);
