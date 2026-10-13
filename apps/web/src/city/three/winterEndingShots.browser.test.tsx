import {
  type CitizenNodeInput,
  canDeclareWinterAction,
  createHardWinter,
  deriveCitizenRoster,
  HARD_WINTER,
  type HardWinterState,
  hardWinterIsland,
  hardWinterReducer,
  hardWinterView,
  MAX_RENDERED_CITIZENS,
  type WinterAction,
  type WinterCellView,
  winterDamageBudget,
} from "@cr/game";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { winterThreatenedNodeIds } from "../../winter/buildingThreat";
import { thawWinterRows } from "../../winter/thaw";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import {
  BUILDABLE_RADIUS,
  defaultPlacements,
  footprintFor,
  GRID_CELL,
  type GroundPoint,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
  rotationYFor,
  transformCenter,
} from "../worldLayout";
import { CITIZEN_BODY_NAME, Citizens } from "./Citizens";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { type CrisisDressing, crisisDressing } from "./CityScene";
import { type CitizenPlace, citizenPlaces } from "./citizenPlaces";
import { shelterCapacityOf, shelterGround } from "./citizenShelter";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { PlacedBuilding } from "./PlacedBuilding";
import { StarterIsland } from "./StarterIsland";
import { TownHall } from "./TownHall";
import { WinterGround } from "./WinterGround";
import { WINTER_LIGHT } from "./winterTones";

/**
 * **THE LAST BEAT OF A WINTER, AT BOTH ENDS OF THE ACCURACY RANGE, PHOTOGRAPHED.**
 *
 * The whole point of the 2026-08-03 ruling is that *"the final frame must reflect how well the
 * player did"*, and that is a claim about a rendered frame. `citizensShelterInside.test.ts`
 * asserts the numbers — 44 people on the ring at 0 of 3 against 10 at 3 of 3, strictly ordered
 * across every band — and **a number is not the deliverable.** A layout test can assert that
 * thirty-four people are indoors, pass, and say nothing whatever about whether the island reads
 * as a settlement that came through or as a settlement with nobody left in it.
 *
 * So this writes the PAIR, and the pair is the evidence: two frames of the same island at the
 * same camera, differing only in how the winter was played.
 *
 * ## THE VIEWPORT IS NAMED, AND IT IS THE SHORT ONE
 *
 * Every frame is **1024x580**, the lead's own window. A comfortable developer viewport flatters
 * this change in a specific way: the crowd is the smallest thing on the island, so a tall
 * window's extra pixels are exactly the pixels that would make a doorway legible when it is not.
 *
 * ## THE PAIRS SHARE A CAMERA, WHICH IS WHAT MAKES THEM A COMPARISON
 *
 * A camera that drifted between two frames would let a crowd that had not moved pass as a crowd
 * that had. And the whole-island framing is deliberate rather than convenient: the claim is about
 * **what is visible AROUND the settlement** — the ring is the losing image, so a frame cropped to
 * the buildings would be a picture of the one thing nobody doubted.
 *
 * ## EVERY FRAME IS UNDER `reducedMotion`
 *
 * The island's gulls produce up to 0.88% whole-frame noise, which is enough to hollow out a frame
 * comparison. And the crisis posture is applied at SEATING time precisely so the reduced-motion
 * frame is already crouched, so a set of stills under the preference is the case most at risk of
 * reading as an ordinary upright crowd.
 *
 * ## IT IS OFF BY DEFAULT, AND THAT IS MEASURED RATHER THAN CAUTIOUS
 *
 * Run `VITE_WINTER_SHOTS=1 npm run test:browser` to regenerate the set.
 * `winterCrisisShots.browser.test.tsx` records what leaving a set of shadow-mapped GLB scenes
 * enabled does: it does not fail, it makes something ELSE fail, in a different file each run, by
 * starving an animation-timing assertion of frames. This file takes the same gate. What runs
 * unconditionally is the STATE the frames are of, which is the half that can go stale silently —
 * a shot list is only evidence about the board it was taken over.
 */

/** Set `VITE_WINTER_SHOTS=1` to regenerate the photographs; CI does not, see the header. */
const ENABLED = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window. Short, which is the screen this work is reviewed on. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

/**
 * A triangle floor that proves a frame photographed a SETTLEMENT rather than a blank canvas.
 *
 * **DELIBERATELY ONE LOOSE NUMBER RATHER THAN A PER-BOARD ONE, and the first version of this gate
 * is why.** The other shots files in this lane wait for `triangles > 40000`, which is the
 * settlement's GLBs having finished parsing. That is a fact about the SAVED board only: a lost
 * board draws procedural ruins from `ruinStage.ts` instead of models, and measured at `95ca0182`
 * the three lost frames came in at 34,078 / 36,748 / 37,688 triangles and failed a gate that was
 * describing the other ending. Per-board floors were the obvious fix and they are a baseline test
 * in disguise — one art change and they are all wrong.
 *
 * So the subject-specific gate is {@link CITIZEN_BODY_NAME} below: the crowd's own instanced mesh,
 * found in the scene graph, with the roster's own count on it. That is what these frames are OF,
 * and it cannot be satisfied by an island. This number stays only as the "something substantial
 * rendered" floor, low enough that both endings clear it.
 */
const TRIANGLES_AT_LEAST = 25_000;

const LAYOUT = eraCityLayout("prehistoric");
const SEED = 0x570e;

const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;
const ROLES: Readonly<Record<string, CitizenNodeInput["citizen_role"]>> = {
  "NUM.2": "residence",
  "NUM.3": "school",
};
const HUB: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 };
const CITY = defaultPlacements([...SKILL_NODES], [HUB], BUILDABLE_RADIUS);
/** The board the in-city mount plays: every skill plus the hall, which the frost can wreck too. */
const LIVE: readonly PlacedTransform[] = [...CITY, HUB];
const ROSTER = deriveCitizenRoster({
  nodes: SKILL_NODES.map((nodeId) => ({
    node_id: nodeId,
    citizen_role: ROLES[nodeId] ?? "civic",
    placed: true,
    mastery: 2,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  })),
  seed: SEED,
});

/* -------------------------------------------------------------------------- */
/* A competent player, at one accuracy, to the last beat                      */
/* -------------------------------------------------------------------------- */

function playRound(
  state: HardWinterState,
  action: WinterAction,
  correct: number,
): HardWinterState {
  let next = hardWinterReducer(state, { type: "declare", action });
  next = hardWinterReducer(next, {
    type: "resolve",
    correct,
    asked: HARD_WINTER.batch_size,
  });
  return hardWinterReducer(next, { type: "end_round" });
}

function legalActions(state: HardWinterState): WinterAction[] {
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const candidates: WinterAction[] = island.cells.map((key) => {
    const [col, row] = key.split(",").map(Number);
    return { kind: "fire", col: col as number, row: row as number };
  });
  for (const building of state.buildings) {
    candidates.push({ kind: "reinforce", node_id: building.node_id });
  }
  return candidates.filter((action) => canDeclareWinterAction(state, action));
}

function settlement(state: HardWinterState): number {
  const alive = state.buildings.filter((b) => b.state === "standing");
  const headroom = alive.reduce((total, b) => total + winterDamageBudget(b), 0);
  return alive.length * 10_000 + headroom * 100 + (88 - state.frozen.length);
}

/**
 * A winter at `correct` of `batch_size` played for `closedRounds` rounds by one-round lookahead —
 * the same policy `hard-winter-layouts.test.ts` tunes against and `citizensShelterInside.test.ts`
 * measures, so the boards in the frames are the boards in the numbers.
 *
 * Pull-backs are deliberately absent, for the reason that file gives: abandoning a rim band
 * changes which cells are frozen for reasons that have nothing to do with how well the questions
 * were answered, and these frames differ in exactly one thing.
 */
function winterAfter(correct: number, closedRounds: number): HardWinterState {
  let state = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: LIVE.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  for (let round = 0; round < closedRounds && state.phase !== "ended"; round += 1) {
    let best: WinterAction | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const action of legalActions(state)) {
      const score = settlement(playRound(state, action, correct));
      if (score > bestScore) {
        bestScore = score;
        best = action;
      }
    }
    if (!best) {
      throw new Error(`no legal action at ${correct} of ${HARD_WINTER.batch_size}`);
    }
    state = playRound(state, best, correct);
  }
  return state;
}

/**
 * **THE BOARD THE FINAL ROUND IS PLAYED ON — the last one a sheltering crowd is ever drawn on,
 * and so the board these frames have to be of.**
 *
 * One more `end_round` and the phase is `"ended"`, at which point `WinterInCity`'s bridge thaws
 * the rows, `shelterGround` reads them as an ordinary day and the crowd goes home. Frames of THAT
 * board would be frames of a thawed island — which is a real thing worth photographing, and the
 * last pair in the set is exactly that, labelled as what it is.
 */
const LAST_ROUND_OPEN = HARD_WINTER.rounds - 1;

/** Everything a frame needs, plus the numbers the frame is evidence about. */
interface Ending {
  readonly rows: readonly (readonly WinterCellView[])[];
  readonly fires: HardWinterState["fires"];
  readonly ruined: ReadonlySet<string>;
  readonly standing: readonly string[];
  readonly places: readonly CitizenPlace[];
  readonly indoors: number;
  readonly outside: number;
  readonly frozen: number;
}

/**
 * One board, staged: what is standing, who is indoors, who is on the ring.
 *
 * `thaw` runs the rows through `thawWinterRows` exactly as the bridge does once the phase ends, so
 * the last pair can photograph the island the outcome panel is really shown over.
 */
function ending(correct: number, closedRounds = LAST_ROUND_OPEN, thaw = false): Ending {
  const end = winterAfter(correct, closedRounds);
  const rows = thaw ? thawWinterRows(hardWinterView(end).rows) : hardWinterView(end).rows;
  const ruined = new Set(
    end.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
  );
  const ground = shelterGround(rows);
  if (!thaw && !ground) {
    throw new Error(`the board at ${correct} of 3 carried no frost`);
  }
  const places = citizenPlaces({
    roster: ROSTER,
    placements: CITY,
    hub: HUB,
    seed: SEED,
    shelter: ground,
    ruinedNodeIds: ruined,
  });
  let frozen = 0;
  for (const line of rows) {
    for (const cell of line) {
      if (cell.land && cell.frozen) {
        frozen += 1;
      }
    }
  }
  return {
    rows,
    fires: end.fires,
    ruined,
    standing: end.buildings.filter((b) => b.state === "standing").map((b) => b.node_id),
    places,
    indoors: places.filter((place) => place.shelteredIn !== null).length,
    outside: places.filter((place) => place.shelteredIn === null).length,
    frozen,
  };
}

/**
 * Where a group of people actually is, on the ground plane — so a camera can be AIMED at them
 * rather than at a cell somebody guessed they would use.
 *
 * `citizensInTheWinterShots.browser.test.tsx` records why this is worth computing: its first
 * close pair was aimed at a plot's geometric centre and came back with the largest knot on the
 * island cropped out of shot, and *"empty plot"* and *"cropped crowd"* look identical from
 * outside a frame.
 */
function crowdCentre(
  places: readonly { point: GroundPoint; shelteredIn: string | null }[],
  where: (place: { shelteredIn: string | null }) => boolean,
): readonly [number, number] {
  const group = places.filter(where);
  if (group.length === 0) {
    throw new Error("no crowd to aim at, so a frame of it would prove nothing");
  }
  const x = group.reduce((total, place) => total + place.point.x, 0) / group.length;
  const z = group.reduce((total, place) => total + place.point.z, 0) / group.length;
  return [x, z];
}

/**
 * The settlement's own middle, nudged SOUTH of the geometric centre.
 *
 * At the shipped ~49 degree tilt the camera looks down the +Z axis, so ground to the south of the
 * target falls toward the bottom edge and off it. `citizensInTheWinterShots.browser.test.tsx`
 * records the frame this correction is for: its first close pair aimed at a plot's geometric
 * centre and cropped the largest knot on the island out of shot, which is how a frame comes back
 * showing an empty plot over a crowd standing right there.
 */
const SETTLEMENT: readonly [number, number] = [0, 3];

/**
 * The BIGGEST KNOT out on the ring, on the lost board — the cell more of the forty-four are
 * standing in than any other.
 *
 * **The crowd's centroid is the wrong aim and the arithmetic says why: it is 11.7 units from the
 * island's centre, well inside the 22-unit buildable radius, because the knots are spread right
 * round the annulus and an average of a ring is its middle.** Aiming there would have produced a
 * third frame of the settlement and called it a frame of the ring. So this takes the densest
 * single cell instead.
 */
const RING_KNOT: readonly [number, number] = (() => {
  const outside = ending(0).places.filter((place) => place.shelteredIn === null);
  const perCell = new Map<string, number>();
  for (const place of outside) {
    const key = `${Math.floor(place.point.x / GRID_CELL)},${Math.floor(place.point.z / GRID_CELL)}`;
    perCell.set(key, (perCell.get(key) ?? 0) + 1);
  }
  const busiest = [...perCell].sort((a, b) => b[1] - a[1])[0];
  if (!busiest) {
    throw new Error("nobody was out on the ring, so a frame of it would prove nothing");
  }
  // The CELL'S CENTRE, not a person's own point: `CELL_JITTER` can put an individual a unit
  // inside the radius, which is what made a first version of the radius check below fail over a
  // knot that was plainly out on the ring.
  const [col, row] = busiest[0].split(",").map(Number);
  return [((col as number) + 0.5) * GRID_CELL, ((row as number) + 0.5) * GRID_CELL];
})();

/**
 * Where the ring pair's camera looks: BETWEEN the biggest knot and the settlement, so one frame
 * holds both — people out at the waterline in front of the buildings they lost, against the same
 * shore empty. A target on the knot itself would put the open sea behind them and answer nothing
 * about the settlement.
 *
 * Shared by both frames of the pair, and derived from the LOST board, because that is the board
 * whose crowd has to be in shot.
 */
const RING: readonly [number, number] = [RING_KNOT[0] * 0.45, RING_KNOT[1] * 0.45];

/**
 * The doorway of the largest building that COMES THROUGH at full accuracy and is a wreck at
 * zero — so the closest pair is one building, one camera, and the whole difference between the
 * two endings in one frame: people at its door, or rubble with nobody.
 *
 * Both the building and the aim are DERIVED, not named. A hardcoded node could quietly stop
 * being a survivor after a retune and leave this pair photographing two identical ruins.
 */
const DOORWAY: readonly [number, number] = (() => {
  const saved = ending(HARD_WINTER.batch_size);
  const lost = ending(0);
  const nodeId = saved.standing
    .filter((id) => lost.ruined.has(id))
    .filter((id) => saved.places.some((place) => place.shelteredIn === id))
    .sort((a, b) => shelterCapacityOf(b) - shelterCapacityOf(a))[0];
  if (!nodeId) {
    throw new Error(
      "no building both survived a flawless winter and fell in a failed one, so the closest " +
        "pair would photograph the same thing twice",
    );
  }
  const [x, z] = crowdCentre(saved.places, (place) => place.shelteredIn === nodeId);
  return [x, z + 2];
})();

interface Shot {
  readonly name: string;
  /** Right answers a round, so the pair differs in this and nothing else. */
  readonly correct: number;
  /** Camera distance as a share of the default framing. Paired shots share it. */
  readonly zoom: number;
  readonly target: readonly [number, number];
  /**
   * Photograph the board AFTER the last round closes, thawed the way the bridge thaws it — the
   * island the outcome panel is really shown over, where the crowd has come home.
   */
  readonly afterTheThaw?: true;
}

/**
 * Both ends of the accuracy range, at four framings, each pair on one camera.
 *
 * **THE NAMES ARE THE ACCURACY AND NOT THE OUTCOME, deliberately.** An earlier version called them
 * `saved-most-buildings` and `saved-nothing`, which was true of a five-round tuning and is a lie
 * about the shipped three-round one: on the last board of the crisis a 0-of-3 player still has five
 * of seven buildings, because at `rounds: 3` most of the loss lands on the final round and the
 * final round's result is only ever seen after the thaw. Naming a frame by its accuracy is true
 * under any tuning; naming it by its outcome is a claim that can go stale silently.
 */
const SHOTS: readonly Shot[] = [
  // **THE DELIVERABLE: the board the defect was rendered on.** Whole island, so the ring is in
  // shot — the difference between a settlement holding its people and a crowd out at the waterline
  // is a difference in what surrounds the buildings, and a frame that stopped at the settlement
  // could not show it. At `21ddc4d0` this pair is 2 people out against 10, where before the change
  // it was 28 against 28.
  { name: "01-answered-3-of-3-whole-island", correct: 3, zoom: 1, target: [0, 0] },
  { name: "02-answered-0-of-3-whole-island", correct: 0, zoom: 1, target: [0, 0] },
  // The same pair close enough that a doorway is a doorway rather than a smudge — which is the
  // half that answers "does the good ending read as SAFE rather than merely EMPTY". Framed on the
  // settlement rather than cropped to a figure: the question is what the surface around them looks
  // like.
  { name: "03-answered-3-of-3-settlement", correct: 3, zoom: 0.45, target: SETTLEMENT },
  { name: "04-answered-0-of-3-settlement", correct: 0, zoom: 0.45, target: SETTLEMENT },
  // **THE RING, FRAMED TO SHOW IT.** Aimed between the biggest knot on the worse board and the
  // settlement, so one frame holds the people out on the ice AND the buildings they were turned
  // away from. At the whole-island framing above a citizen is two or three pixels and this
  // difference is a change in texture; here it is people.
  { name: "05-answered-3-of-3-at-the-ring", correct: 3, zoom: 0.62, target: RING },
  { name: "06-answered-0-of-3-at-the-ring", correct: 0, zoom: 0.62, target: RING },
  // ONE BUILDING, ONE CAMERA, BOTH RUNS — the closest the set gets, and the frame that answers
  // whether a doorway crowd reads as people. Still wide enough to hold the building, the snow and
  // a neighbour, because a crop of the figures would be a picture of the one thing nobody doubted.
  { name: "07-answered-3-of-3-at-a-doorway", correct: 3, zoom: 0.3, target: DOORWAY },
  { name: "08-answered-0-of-3-at-the-same-door", correct: 0, zoom: 0.3, target: DOORWAY },
  // **AND THE ISLAND THE PLAYER IS LEFT WITH, WHICH IS A DIFFERENT PICTURE AND HAS TO BE SAID SO.**
  // Once the last round closes the phase is `"ended"`, the bridge thaws the board, and the crowd
  // comes out of the doorways and goes back to its day — which is what the ruling asked for under
  // "coming back". So this is the pair where "a run that saved most buildings and a run that saved
  // none" is literally true (five of seven against nothing at all), and where the winter shows in
  // the RUINS rather than in the crowd. It is here so nobody has to take that on trust.
  {
    name: "09-after-the-thaw-answered-3-of-3",
    correct: 3,
    zoom: 1,
    target: [0, 0],
    afterTheThaw: true,
  },
  {
    name: "10-after-the-thaw-answered-0-of-3",
    correct: 0,
    zoom: 1,
    target: [0, 0],
    afterTheThaw: true,
  },
];

/**
 * **THE ALWAYS-ON HALF: the STATE the frames are of.**
 *
 * A shot list is only evidence about the board it was taken over, and that board is a function of
 * the tuning, the placer and the allocator — all three of which move. So the two endings are
 * measured here on every run, whether or not anything is photographed, and the contrast the pair
 * is supposed to show is asserted rather than described. If a retune collapses the two, this
 * fails and the frames in `docs/design-refs/` are known to be stale instead of quietly becoming
 * a picture of a world that no longer exists.
 */
test("the two endings really are different pictures, at the window they were shot at", () => {
  const best = ending(HARD_WINTER.batch_size);
  const worst = ending(0);

  // The set is PAIRS: both ends of the range, and every frame with a twin at its own camera. A
  // camera that drifted between two frames would let a crowd that had not moved pass as a crowd
  // that had, so this is asserted per shot rather than as a count.
  expect(SHOTS).toHaveLength(10);
  const cameraOf = (shot: Shot) =>
    `${shot.zoom}@${shot.target.join(",")}${shot.afterTheThaw ? "+thawed" : ""}`;
  for (const shot of SHOTS) {
    const twins = SHOTS.filter((other) => cameraOf(other) === cameraOf(shot));
    expect(twins, `${shot.name} has no twin at its camera`).toHaveLength(2);
    expect(new Set(twins.map((t) => t.correct)).size, shot.name).toBe(2);
  }
  expect(new Set(SHOTS.map((shot) => shot.correct))).toEqual(
    new Set([0, HARD_WINTER.batch_size]),
  );
  // Four framings, each answering a different question: whether the change reads at a glance (the
  // whole island), what the settlement looks like, what the ring looks like, and what happens once
  // the winter is over. Two frames at one framing would answer one question twice.
  expect(new Set(SHOTS.map(cameraOf)).size).toBe(5);
  expect(SHOTS.some((shot) => shot.zoom >= 1)).toBe(true);
  expect(SHOTS.some((shot) => shot.zoom <= 0.3)).toBe(true);
  expect(SHOTS.filter((shot) => shot.afterTheThaw)).toHaveLength(2);
  // ...and two of the framings are aimed at people rather than at the middle of the island, on
  // ground computed from the places. `citizensInTheWinterShots.browser.test.tsx` records the
  // frame that lesson came from: a pair aimed at a plot's geometric centre cropped the largest
  // knot on the island out of shot, and "empty plot" and "cropped crowd" look identical from
  // outside a frame.
  const aimed = SHOTS.filter(
    (shot) =>
      cameraOf(shot).includes(RING.join(",")) || cameraOf(shot).includes(DOORWAY.join(",")),
  );
  expect(aimed).toHaveLength(4);
  // The knot the ring pair is framed around really is out on the ring — past the buildable
  // radius, on ground no advance can take — and the doorway aim really is in the settlement.
  // Otherwise the three framings are the same frame at three distances.
  expect(Math.hypot(RING_KNOT[0], RING_KNOT[1])).toBeGreaterThan(BUILDABLE_RADIUS);
  expect(Math.hypot(DOORWAY[0], DOORWAY[1] - 2)).toBeLessThan(BUILDABLE_RADIUS);
  // ...and the ring camera looks between the two, so one frame holds the crowd and the wrecks.
  expect(Math.hypot(RING[0], RING[1])).toBeLessThan(Math.hypot(RING_KNOT[0], RING_KNOT[1]));
  expect(Math.hypot(RING[0], RING[1])).toBeGreaterThan(0);

  // THE STATE. Both boards are the deep-frost board the final round is played on, which is where
  // the whole defect lived — a pair shot before the frost arrived would show two identical summers.
  expect(best.frozen).toBeGreaterThanOrEqual(70);
  expect(worst.frozen).toBeGreaterThanOrEqual(70);
  expect(winterAfter(0, LAST_ROUND_OPEN).phase).not.toBe("ended");

  // Fewer buildings standing on the failed board than on the flawless one...
  expect(worst.standing.length).toBeLessThan(best.standing.length);
  expect(best.standing.length).toBeGreaterThanOrEqual(LIVE.length - 2);

  // ...and therefore more people on the ring. THE CONTRAST THE PAIR IS FOR, asserted as a
  // relationship rather than as digits so a retune moves it: at `21ddc4d0` it is 10 out against 2.
  expect(worst.outside).toBeGreaterThan(best.outside);
  expect(best.outside).toBeLessThanOrEqual(worst.outside * 0.5);
  expect(best.indoors).toBeGreaterThan(ROSTER.population * 0.9);
  // And the number indoors is exactly what the survivors can hold, so the frames are a picture of
  // the capacity rule rather than of a coincidence.
  for (const board of [best, worst]) {
    expect(board.indoors).toBe(
      Math.min(
        ROSTER.population,
        board.standing.reduce((total, nodeId) => total + shelterCapacityOf(nodeId), 0),
      ),
    );
  }

  // AND THE THAWED PAIR IS A DIFFERENT PICTURE, which is why it is labelled as one: the crowd is
  // home at both ends of the range, and what still separates the two frames is the ruins. A set
  // that photographed this and called it the crowd's frame would be the wrong evidence entirely.
  for (const correct of [0, HARD_WINTER.batch_size]) {
    const after = ending(correct, HARD_WINTER.rounds, true);
    expect(after.frozen, `${correct} of 3 after the thaw`).toBe(0);
    expect(after.indoors, `${correct} of 3 after the thaw`).toBe(0);
    expect(after.outside, `${correct} of 3 after the thaw`).toBe(ROSTER.population);
    expect(
      after.places.every((place) => place.state !== "sheltering"),
      `${correct} of 3 after the thaw`,
    ).toBe(true);
  }
  expect(ending(0, HARD_WINTER.rounds, true).ruined.size).toBeGreaterThan(
    ending(HARD_WINTER.batch_size, HARD_WINTER.rounds, true).ruined.size,
  );

  // The viewport is a property of the MOUNT below rather than of the list, so it is pinned here
  // as a constant a reader can check against it.
  expect(HIS_WINDOW).toEqual({ width: 1024, height: 580 });
}, 60_000);

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

/**
 * **THE VIEWPORT IS ONLY TOUCHED WHEN THE SHOTS ARE ACTUALLY TAKEN, and the guard is not
 * defensive tidiness — it is a red another shots file caused.**
 *
 * `page.viewport` resizes the whole browser page, which is shared by every file the worker runs
 * after this one. An unconditional `afterAll` restore looks like a no-op and is not: it sets the
 * page to the test IFRAME's inner size, which is smaller, and the next file inherits it. See
 * `citizensInTheWinterShots.browser.test.tsx`, which took a reading-width assertion in another
 * lane red that way.
 */
beforeAll(() => {
  if (!ENABLED) {
    return;
  }
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * How one building is dressed, through the SCENE'S OWN function rather than by hand — because a
 * frame of a board dressed differently from the shipped one is weaker evidence than it looks. The
 * difference it buys is legible: without it a wrecked building keeps its mastery stars, where the
 * shipped crisis replaces them with a `lost` badge.
 *
 * **THE STORM ROOF IS THE ONE THING HELD BACK, and it is named rather than quietly dropped.** At
 * `95ca0182` a raised shield draws geometry that covers the whole building rather than its roof —
 * which is the defect open PR #465 exists to fix — so a frame with shields up is a frame of a
 * brown slab. Measured on this set: with `winterShieldedNodeIds` wired through, the surviving
 * settlement photographed as five featureless roofs with every doorway underneath them, which is
 * a picture of the bug rather than of the crowd. The subject here is where the people are, so the
 * shields are off and this is the one respect in which these frames are not the shipped scene.
 */
function dressingFor(nodeId: string, end: Ending): CrisisDressing {
  return crisisDressing(nodeId, {
    winter: true,
    ruinedNodeIds: end.ruined,
    shieldedNodeIds: NO_SHIELDS,
    // Nothing is being aimed at, and once the frost has taken what it is going to take nothing is
    // threatened either — both fall out of the board rather than being decided here.
    reinforceCandidates: new Set<string>(),
    crisisThreatenedNodeIds: winterThreatenedNodeIds(end.rows),
  });
}

/** See {@link dressingFor}: the storm roof is held back, and #465 is why. */
const NO_SHIELDS: ReadonlySet<string> = new Set<string>();

/** Where the village camera sits at the default heading, `distance` out. */
function cameraAt(distance: number): [number, number, number] {
  const azimuth = -Math.PI * 0.28;
  const polar = VILLAGE_CAMERA.polarAngle;
  return [
    Math.sin(polar) * Math.sin(azimuth) * distance,
    Math.cos(polar) * distance + 2,
    Math.sin(polar) * Math.cos(azimuth) * distance,
  ];
}

test.runIf(ENABLED).each(SHOTS)(
  "photographs the ending: %s",
  async (shot) => {
    // `winter` stays TRUE for the thawed pair as well, and that is the shipped behaviour rather
    // than an oversight: `CityScene` reads `winter` off `winterRows !== null`, and the bridge goes
    // on publishing thawed rows for as long as the outcome panel is up. So the island after the
    // thaw keeps the winter light and the `lost` badges and loses only the frost.
    const end = ending(
      shot.correct,
      shot.afterTheThaw ? HARD_WINTER.rounds : LAST_ROUND_OPEN,
      shot.afterTheThaw === true,
    );
    const shelter = shelterGround(end.rows);
    const env = cityEnvironment("day", true);
    const at = shot.target;
    const offset = cameraAt(LAYOUT.cameraDistance * shot.zoom);
    let gl: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);

    h = mount(
      <div style={{ width: HIS_WINDOW.width, height: HIS_WINDOW.height }}>
        <Canvas
          shadows
          dpr={1}
          camera={{
            position: [offset[0] + at[0], offset[1], offset[2] + at[1]],
            fov: 32,
            near: VILLAGE_CAMERA.nearPlane,
            far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
          }}
          gl={{ preserveDrawingBuffer: true }}
          onCreated={(state) => {
            state.gl.toneMapping = THREE.ACESFilmicToneMapping;
            state.gl.toneMappingExposure = WINTER_LIGHT.exposure;
            state.camera.lookAt(at[0], 2, at[1]);
            gl = state.gl;
            scene = state.scene;
          }}
        >
          <color attach="background" args={[env.background]} />
          <fog
            attach="fog"
            args={[
              env.fog,
              ISLAND_GRASS_RADIUS * WINTER_LIGHT.fog.nearRatio,
              ISLAND_GRASS_RADIUS * WINTER_LIGHT.fog.farRatio,
            ]}
          />
          <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter />
          <StarterIsland layout={LAYOUT} reducedMotion />
          <WinterGround rows={end.rows} fires={end.fires} reducedMotion />
          {CITY.map((p) => {
            const model = resolveBuildingModel(p.nodeId, "built");
            const dressing = dressingFor(p.nodeId, end);
            return model ? (
              <PlacedBuilding
                key={p.nodeId}
                nodeId={p.nodeId}
                center={transformCenter(p, footprintFor(p.nodeId))}
                rotationY={rotationYFor(p.rot)}
                footprint={footprintFor(p.nodeId)}
                model={model}
                mastery={2}
                reducedMotion
                celebrateToken={0}
                ruined={end.ruined.has(p.nodeId)}
                winter
                crisisStatus={dressing.status}
                onSelect={() => undefined}
              />
            ) : null;
          })}
          <TownHall
            center={transformCenter(HUB, footprintFor(TOWN_HALL_ID))}
            rotationY={rotationYFor(HUB.rot)}
            footprint={footprintFor(TOWN_HALL_ID)}
            model={resolveTownHallModel("built")}
            reducedMotion
            celebrateToken={0}
            ruined={end.ruined.has(TOWN_HALL_ID)}
            winter
            crisisStatus={dressingFor(TOWN_HALL_ID, end).status}
            onSelect={() => undefined}
          />
          <Citizens
            roster={ROSTER}
            placements={CITY}
            hub={HUB}
            seed={SEED}
            eraId={CURRENT_ERA_ID}
            shelter={shelter}
            ruinedNodeIds={end.ruined}
            reducedMotion
          />
        </Canvas>
      </div>,
    );

    await waitFor(() => gl !== null, "the canvas never created", 20000);
    const renderer = gl as unknown as THREE.WebGLRenderer;
    /**
     * **THE READINESS GATE IS STABILITY, NOT A TRIANGLE FLOOR, and the reason is the losing
     * frame.** The other shots files in this lane wait for `triangles > 40000`, which is the
     * settlement's GLBs having finished parsing behind their own Suspense boundaries. The
     * zero-accuracy board has NO GLBs on it at all — every one of the seven is a ruin, and a ruin
     * is procedural geometry from `ruinStage.ts` rather than a loaded model — so that gate can
     * never fire and the shot times out with a photograph of a half-loaded island.
     *
     * So the condition is that the scene has STOPPED CHANGING: the same triangle count twice,
     * a third of a second apart, over a scene that has drawn something. That is what "finished
     * loading" actually means, and it holds whether or not there is anything to load.
     */
    const deadline = Date.now() + 30000;
    let previous = -1;
    for (;;) {
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      const now = renderer.info.render.triangles;
      if (now > 0 && now === previous) {
        break;
      }
      previous = now;
      if (Date.now() > deadline) {
        throw new Error(`the scene never settled for ${shot.name} (${now} triangles)`);
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 900));

    if (ENABLED) {
      const written = await page.screenshot({
        path: `__screenshots__/winter-ending/${shot.name}-1024x580.png`,
      });
      expect(written, `no screenshot was written for ${shot.name}`).toBeTruthy();
    }
    // It photographed a settlement rather than a blank canvas...
    expect(
      renderer.info.render.triangles,
      `${shot.name} drew ${renderer.info.render.triangles} triangles`,
    ).toBeGreaterThan(TRIANGLES_AT_LEAST);
    // ...AND THE CROWD IS IN IT, which is what the frame is of. Read off the scene graph rather
    // than off the triangle count, because a frame of a settlement with the citizens layer failed
    // closed would satisfy every number above and be exactly the wrong evidence.
    const bodies = (scene as unknown as THREE.Scene).getObjectByName(CITIZEN_BODY_NAME);
    expect(bodies, `${shot.name} has no crowd in its scene`).toBeDefined();
    expect((bodies as THREE.InstancedMesh).count, shot.name).toBe(
      Math.min(ROSTER.population, MAX_RENDERED_CITIZENS),
    );
  },
  90_000,
);
