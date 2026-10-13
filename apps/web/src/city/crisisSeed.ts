import { CRISIS_MASTERY_GATE, midEraCrisisNodeIds } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";

import { liveBuildableRadius } from "./liveIsland";
import {
  findOpenCell,
  footprintCells,
  footprintFor,
  type PlacedTransform,
} from "./worldLayout";

/**
 * THE DEV SHORTCUT TO THE CRISIS, and the one rule it is built around: **it seeds STATE
 * and then gets out of the way.**
 *
 * It does not open the crisis, does not raise the notice, and does not speak the
 * announcement. What it does is stand up the city a learner would have if they had done
 * the lessons: the era's nodes up to and including its midpoint, placed on the island and
 * mastered. Everything after that is the production path — `midEraCrisisCall` reads the
 * new node states, `useCrisisCall` sees the crossing, `announcements.ts` speaks it and the
 * advisor explains it, exactly as they would for somebody who got here by learning.
 *
 * That distinction is the whole value of the control. A button that mounted the advisor
 * directly would demo a sequence that does not exist, and the first thing it would hide is
 * whether the trigger works at all.
 *
 * ## Which nodes, and why not three
 *
 * `midEraCrisisNodeIds` (D-CRISIS-9): the era's authored prefix of length `ceil(n / 2)`.
 * Era one has six nodes so it is three, and era eight has nine so it is five. A literal
 * three here would seed a state that does not fire in two of the ten eras, which is the
 * kind of shortcut that gets found again a month later.
 *
 * ## What it uses to place, and why that is the real path
 *
 * `placeSkill` is the session write `confirmPlacement` makes when a learner drops a ghost
 * on the island: the same function, with a transform from `findOpenCell`, which is the
 * same helper the build menu's "Build here" and the seeded Town Hall use to pick a spot.
 * The mastery step is `advanceMasteryDev`, the existing developer stand-in for the
 * practice-completion write. Nothing new writes anything.
 */

/** The two session writes the seed needs. `CitySurface` supplies its own props. */
export interface CrisisSeedPort {
  readonly placeSkill: (nodeId: string, transform: PlacedTransform) => void | Promise<void>;
  readonly advanceMastery: (nodeId: string, mastery: Mastery) => void | Promise<void>;
}

/** What the seed is about to do, computed before anything is written. */
export interface CrisisSeedPlan {
  readonly eraId: EraId;
  /** The era's nodes up to and including the trigger (D-CRISIS-9). */
  readonly nodeIds: readonly string[];
  /** Of those, the ones not yet on the island. */
  readonly toPlace: readonly string[];
  /** Of those, the ones not yet at the mastery bar the trigger counts. */
  readonly toMaster: readonly string[];
  /**
   * Trigger nodes this city has no building for. Non-empty means the seed CANNOT put the
   * city into the state that fires the crisis, and the control must say so rather than
   * half-seeding and leaving the reviewer wondering why nothing happened. Nine of the ten
   * eras are in this position today: they have node sets and no buildings.
   */
  readonly unavailable: readonly string[];
}

/**
 * Work out what standing the era's crisis up would take, from the city as it is.
 *
 * `buildableNodeIds` is what the city can actually place — `D1_NODE_IDS` today. It is a
 * parameter rather than an import so the refusal above is testable against an era whose
 * buildings do not exist, which is nine of the ten and will stay that way for a while.
 */
export function planCrisisSeed({
  eraId,
  buildableNodeIds,
  placedNodeIds,
  masteredNodeIds,
}: {
  readonly eraId: EraId;
  readonly buildableNodeIds: readonly string[];
  readonly placedNodeIds: ReadonlySet<string>;
  readonly masteredNodeIds: ReadonlySet<string>;
}): CrisisSeedPlan {
  const nodeIds = midEraCrisisNodeIds(eraId);
  const buildable = new Set(buildableNodeIds);
  return {
    eraId,
    nodeIds,
    toPlace: nodeIds.filter((id) => buildable.has(id) && !placedNodeIds.has(id)),
    toMaster: nodeIds.filter((id) => buildable.has(id) && !masteredNodeIds.has(id)),
    unavailable: nodeIds.filter((id) => !buildable.has(id)),
  };
}

/** What the seed actually managed. `placed`/`mastered` are node ids, in the order written. */
export interface CrisisSeedResult {
  readonly placed: readonly string[];
  readonly mastered: readonly string[];
  /** Nodes that could not be given a spot because the island had none left. */
  readonly noRoom: readonly string[];
}

/**
 * Run the plan: place what is missing, then master the prefix.
 *
 * PLACEMENT FIRST, then mastery, because `advanceMasteryDev` is documented as advancing a
 * PLACED skill and a session write against an unplaced node is a no-op. That ordering is
 * also why `takenCells` has to be the FULL occupancy the island enforces and not just the
 * buildings: the Town Hall is pre-seeded at the centre and is not in `placements`, so a
 * seed that only avoided other skills would hand the first node the hall's own cells,
 * `placeSkill` would refuse it as an overlap, and the mastery write behind it would no-op
 * against an unplaced node. The city would then sit one skill short of its trigger with
 * nothing on screen to say why, which reads exactly like a broken trigger. `CitySurface`
 * passes the same `occupied` set the placement ghost validates against.
 *
 * Occupancy is tracked forward through the loop rather than re-read, so two nodes seeded
 * in the same press cannot be handed the same cell.
 */
export async function runCrisisSeed(
  plan: CrisisSeedPlan,
  takenCells: ReadonlySet<string>,
  port: CrisisSeedPort,
): Promise<CrisisSeedResult> {
  const occupied = new Set(takenCells);
  const placed: string[] = [];
  const noRoom: string[] = [];

  for (const nodeId of plan.toPlace) {
    const footprint = footprintFor(nodeId);
    // The disc the island is standing on, not era one's — a crisis seeded at era six seats its
    // buildings on era six's ground, exactly as the learner's own placement would.
    const spot = findOpenCell(footprint, occupied, liveBuildableRadius());
    if (spot === null) {
      noRoom.push(nodeId);
      continue;
    }
    await port.placeSkill(nodeId, { ...spot, nodeId });
    for (const cell of footprintCells(spot, footprint)) {
      occupied.add(cell);
    }
    placed.push(nodeId);
  }

  const mastered: string[] = [];
  for (const nodeId of plan.toMaster) {
    if (noRoom.includes(nodeId)) {
      continue;
    }
    await port.advanceMastery(nodeId, CRISIS_MASTERY_GATE);
    mastered.push(nodeId);
  }

  return { placed, mastered, noRoom };
}

/**
 * What the control says it did, for the polite live region.
 *
 * It names the seed as a developer stand-in and then says what to expect next, because the
 * point of the control is that the NEXT thing is not its doing. It speaks node ids, which
 * `announcements.ts` forbids in learner-facing copy and which is right here: this is a
 * developer surface, the panel beside it already prints ids, and the reviewer needs to know
 * which nodes moved.
 */
export function crisisSeedMessage(plan: CrisisSeedPlan, result: CrisisSeedResult): string {
  if (plan.unavailable.length > 0) {
    return `This era's crisis needs a building for ${plan.unavailable.join(", ")}: ${
      plan.unavailable.length === 1 ? "it has" : "they have"
    } none on the island yet, so the city cannot reach the trigger.`;
  }
  if (result.noRoom.length > 0) {
    return `The island is full, so ${result.noRoom.join(", ")} had nowhere to stand and the crisis trigger stayed out of reach.`;
  }
  const wrote = [
    result.placed.length > 0 ? `placed ${result.placed.join(", ")}` : "",
    result.mastered.length > 0 ? `mastered ${result.mastered.join(", ")}` : "",
  ].filter((part) => part.length > 0);
  const did =
    wrote.length > 0 ? wrote.join(" and ") : "nothing to do, the city was already there";
  return `Crisis seed (developer stand-in): ${did}. The trigger, the notice and the advisor now fire on their own.`;
}
