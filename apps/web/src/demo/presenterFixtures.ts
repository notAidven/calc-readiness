import { type CivicBuildingId, civicCatalogueForEra } from "@cr/economy";
import { GOLD_MASTERY } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId, getEraOrThrow, getNodeOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

import {
  type ArchipelagoState,
  foundingLayout,
  type IslandLayout,
  type IslandRecord,
} from "../archipelago/islandState";
import { civicPlacementId, parseCivicPlacementId } from "../city/civic";
import { eraIslandBuildableRadius } from "../city/islandLand";
import { parseRoadCellKey, type RoadCell, roadCellKey } from "../city/roads";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import {
  defaultPlacements,
  findOpenCell,
  footprintCells,
  footprintFor,
  isCellBuildable,
  isFootprintInBounds,
  type PlacedTransform,
  transformCenter,
  unreachableNodeIds,
} from "../city/worldLayout";
import type { PresenterRequest } from "./presenterMode";
import type { ShowcaseCityFixture, ShowcaseCitySeed } from "./showcaseFixtures";

const STUDENT_ID = "presenter-v1";
const PRACTICED_AT = "2026-08-10T00:00:00.000Z";
const PRESENTER_CIVIC_COUNT = 4;
const CARDINAL_STEPS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

function hall(): PlacedTransform {
  return { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
}

/**
 * Civic model identities visible in the two superseding Presenter references, in placement-id
 * sequence order. Repeated types are intentional repeated structures, not substitutions for a
 * different catalogue row: Island 1 shows two Smokehouses and two Springs, and Island 2 shows
 * two Granaries and two Village Houses.
 */
const PRESENTER_REFERENCE_CIVIC_TYPES: Readonly<
  Partial<Record<EraId, readonly CivicBuildingId[]>>
> = {
  prehistoric: [
    "prehistoric_smokehouse",
    "prehistoric_longhouse",
    "prehistoric_storage_pit",
    "prehistoric_storage_pit",
    "prehistoric_smokehouse",
  ],
  neolithic: [
    "neolithic_granary",
    "neolithic_village_houses",
    "neolithic_bread_oven",
    "neolithic_village_well",
    "neolithic_village_houses",
    "neolithic_granary",
  ],
};

/** Deterministic placement identities for the literal references or the canonical four-type set. */
export function presenterCivicPlacementIds(eraId: EraId): readonly string[] {
  const rows = civicCatalogueForEra(eraId);
  if (
    rows.length !== PRESENTER_CIVIC_COUNT ||
    new Set(rows.map((row) => row.role)).size !== PRESENTER_CIVIC_COUNT
  ) {
    throw new Error(`Presenter needs four distinct canonical civic types for ${eraId}.`);
  }
  const canonical = new Set(rows.map((row) => row.id));
  const types = PRESENTER_REFERENCE_CIVIC_TYPES[eraId] ?? rows.map((row) => row.id);
  return types.map((catalogueId, sequence) => {
    if (!canonical.has(catalogueId)) {
      throw new Error(
        `Presenter reference civic ${catalogueId} is not canonical for ${eraId}.`,
      );
    }
    const placementId = civicPlacementId(catalogueId, sequence);
    const parsed = parseCivicPlacementId(placementId);
    if (parsed?.catalogueId !== catalogueId || parsed.row.era !== eraId) {
      throw new Error(
        `Presenter minted a non-canonical civic placement for ${catalogueId}.`,
      );
    }
    return placementId;
  });
}

function buildableRoadCells(eraId: EraId): readonly RoadCell[] {
  const radius = eraIslandBuildableRadius(eraId);
  const reach = Math.ceil(radius / 4) + 1;
  const cells: RoadCell[] = [];
  for (let row = -reach; row <= reach; row += 1) {
    for (let col = -reach; col <= reach; col += 1) {
      if (isCellBuildable(col, row, radius)) {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

export interface PresenterRoadBounds {
  readonly floor: number;
  readonly ceiling: number;
}

/**
 * A scale-aware road budget. The square root tracks the island's diameter rather than its
 * area: enough cells to connect every visible building, while the ceiling prevents paving
 * a fixed share of every available plot. Different own-era land budgets produce different
 * limits, so no era inherits a count chosen for another island.
 */
export function presenterRoadBounds(eraId: EraId): PresenterRoadBounds {
  const scale = Math.sqrt(buildableRoadCells(eraId).length);
  const floor = Math.max(8, Math.ceil(scale));
  return {
    floor,
    ceiling: Math.max(floor + 8, Math.floor(scale * 3)),
  };
}

function freeAccessCells(
  placement: PlacedTransform,
  free: ReadonlySet<string>,
): readonly RoadCell[] {
  const access = new Map<string, RoadCell>();
  for (const footprintKey of footprintCells(placement, footprintFor(placement.nodeId))) {
    const footprintCell = parseRoadCellKey(footprintKey);
    for (const [dc, dr] of CARDINAL_STEPS) {
      const cell = { col: footprintCell.col + dc, row: footprintCell.row + dr };
      const key = roadCellKey(cell.col, cell.row);
      if (free.has(key)) {
        access.set(key, cell);
      }
    }
  }
  return [...access.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

/**
 * Shortest free-ground connection from the existing road tree to one candidate access cell.
 * Returned in road-outward order, excluding cells already in the network.
 */
function roadConnection(
  roadKeys: ReadonlySet<string>,
  goal: RoadCell,
  free: ReadonlySet<string>,
): readonly RoadCell[] | null {
  const goalKey = roadCellKey(goal.col, goal.row);
  if (roadKeys.has(goalKey)) {
    return [];
  }
  const queue = [goal];
  const parent = new Map<string, string | null>([[goalKey, null]]);
  for (let at = 0; at < queue.length; at += 1) {
    const current = queue[at];
    if (!current) {
      continue;
    }
    const currentKey = roadCellKey(current.col, current.row);
    for (const [dc, dr] of CARDINAL_STEPS) {
      const next = { col: current.col + dc, row: current.row + dr };
      const nextKey = roadCellKey(next.col, next.row);
      if (!free.has(nextKey) || parent.has(nextKey)) {
        continue;
      }
      parent.set(nextKey, currentKey);
      if (roadKeys.has(nextKey)) {
        const path: RoadCell[] = [];
        let key = parent.get(nextKey);
        while (key !== null && key !== undefined) {
          path.push(parseRoadCellKey(key));
          key = parent.get(key);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

function sharedBuildingRoadRoot(
  placements: readonly PlacedTransform[],
  freeCells: readonly RoadCell[],
  free: ReadonlySet<string>,
): RoadCell | null {
  const buildings = placements.filter((placement) => placement.nodeId !== TOWN_HALL_ID);
  const componentByKey = new Map<string, number>();
  let nextComponent = 0;
  for (const start of freeCells) {
    const startKey = roadCellKey(start.col, start.row);
    if (componentByKey.has(startKey)) {
      continue;
    }
    const component = nextComponent;
    nextComponent += 1;
    componentByKey.set(startKey, component);
    const queue = [start];
    for (let at = 0; at < queue.length; at += 1) {
      const current = queue[at];
      if (!current) {
        continue;
      }
      for (const [dc, dr] of CARDINAL_STEPS) {
        const neighbor = { col: current.col + dc, row: current.row + dr };
        const key = roadCellKey(neighbor.col, neighbor.row);
        if (free.has(key) && !componentByKey.has(key)) {
          componentByKey.set(key, component);
          queue.push(neighbor);
        }
      }
    }
  }
  const hallAccess = freeAccessCells(
    placements.find((placement) => placement.nodeId === TOWN_HALL_ID) ?? hall(),
    free,
  );
  return (
    hallAccess
      .map((candidate) => {
        const component = componentByKey.get(roadCellKey(candidate.col, candidate.row));
        const buildingAccess = buildings.map((building) =>
          freeAccessCells(building, free).filter(
            (cell) => componentByKey.get(roadCellKey(cell.col, cell.row)) === component,
          ),
        );
        return {
          candidate,
          reachable: buildingAccess.filter((access) => access.length > 0).length,
          distance: buildingAccess.reduce(
            (total, access) =>
              total +
              Math.min(
                ...access.map(
                  (cell) =>
                    Math.abs(cell.col - candidate.col) + Math.abs(cell.row - candidate.row),
                ),
              ),
            0,
          ),
        };
      })
      .filter((choice) => choice.reachable === buildings.length)
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          a.candidate.row - b.candidate.row ||
          a.candidate.col - b.candidate.col,
      )[0]?.candidate ?? null
  );
}

function buildingsShareRoadComponent(
  eraId: EraId,
  placements: readonly PlacedTransform[],
): boolean {
  const blocked = new Set(
    placements.flatMap((placement) =>
      footprintCells(placement, footprintFor(placement.nodeId)),
    ),
  );
  const freeCells = buildableRoadCells(eraId).filter(
    (cell) => !blocked.has(roadCellKey(cell.col, cell.row)),
  );
  const free = new Set(freeCells.map((cell) => roadCellKey(cell.col, cell.row)));
  return sharedBuildingRoadRoot(placements, freeCells, free) !== null;
}

function roadNetworkConnected(roads: readonly RoadCell[]): boolean {
  const keys = new Set(roads.map((cell) => roadCellKey(cell.col, cell.row)));
  const first = roads[0];
  if (!first) {
    return false;
  }
  const visited = new Set([roadCellKey(first.col, first.row)]);
  const queue = [first];
  for (let at = 0; at < queue.length; at += 1) {
    const current = queue[at];
    if (!current) {
      continue;
    }
    for (const [dc, dr] of CARDINAL_STEPS) {
      const next = { col: current.col + dc, row: current.row + dr };
      const key = roadCellKey(next.col, next.row);
      if (keys.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push(next);
      }
    }
  }
  return visited.size === roads.length;
}

/**
 * Connect every civic and skill footprint to one hall-rooted tree. Every candidate comes
 * from real buildable cells after removing every real footprint; no string/radius
 * approximation can admit an invalid tile.
 */
export function presenterRoads(
  eraId: EraId,
  placements: readonly PlacedTransform[],
): readonly RoadCell[] {
  const blocked = new Set(
    placements.flatMap((placement) =>
      footprintCells(placement, footprintFor(placement.nodeId)),
    ),
  );
  const freeCells = buildableRoadCells(eraId).filter(
    (cell) => !blocked.has(roadCellKey(cell.col, cell.row)),
  );
  const free = new Set(freeCells.map((cell) => roadCellKey(cell.col, cell.row)));
  const requiredPlacements = placements.filter(
    (placement) => placement.nodeId !== TOWN_HALL_ID,
  );
  const root = sharedBuildingRoadRoot(placements, freeCells, free);
  if (!root) {
    throw new Error(`Presenter cannot start a road network on ${eraId}.`);
  }

  const bounds = presenterRoadBounds(eraId);
  const target = Math.min(
    bounds.ceiling,
    bounds.floor + Math.max(2, Math.ceil(placements.length / 3)),
  );
  const roads: RoadCell[] = [root];
  const roadKeys = new Set([roadCellKey(root.col, root.row)]);
  const connectClosest = (remaining: PlacedTransform[], required: boolean): boolean => {
    let selectedIndex = -1;
    let selectedPath: readonly RoadCell[] | null = null;
    for (let index = 0; index < remaining.length; index += 1) {
      const placement = remaining[index];
      if (!placement) {
        continue;
      }
      for (const goal of freeAccessCells(placement, free)) {
        const path = roadConnection(roadKeys, goal, free);
        if (
          path !== null &&
          (selectedPath === null ||
            path.length < selectedPath.length ||
            (path.length === selectedPath.length && index < selectedIndex))
        ) {
          selectedIndex = index;
          selectedPath = path;
        }
      }
    }
    if (selectedIndex < 0 || selectedPath === null) {
      if (required) {
        throw new Error(`Presenter cannot connect every building on ${eraId}.`);
      }
      return false;
    }
    remaining.splice(selectedIndex, 1);
    const room = bounds.ceiling - roads.length;
    if (selectedPath.length > room) {
      if (required) {
        throw new Error(`Presenter building roads exceed the ${eraId} road budget.`);
      }
      return false;
    }
    for (const cell of selectedPath) {
      const key = roadCellKey(cell.col, cell.row);
      if (!roadKeys.has(key)) {
        roads.push(cell);
        roadKeys.add(key);
      }
    }
    return true;
  };

  const remainingBuildings = [...requiredPlacements];
  while (remainingBuildings.length > 0) {
    connectClosest(remainingBuildings, true);
  }

  while (roads.length < target) {
    const frontier = freeCells
      .filter((cell) => {
        const key = roadCellKey(cell.col, cell.row);
        return (
          !roadKeys.has(key) &&
          CARDINAL_STEPS.some(([dc, dr]) =>
            roadKeys.has(roadCellKey(cell.col + dc, cell.row + dr)),
          )
        );
      })
      .map((cell) => ({
        cell,
        neighbors: CARDINAL_STEPS.filter(([dc, dr]) =>
          roadKeys.has(roadCellKey(cell.col + dc, cell.row + dr)),
        ).length,
      }))
      .sort(
        (a, b) =>
          a.neighbors - b.neighbors ||
          b.cell.col * b.cell.col +
            b.cell.row * b.cell.row -
            (a.cell.col * a.cell.col + a.cell.row * a.cell.row) ||
          a.cell.row - b.cell.row ||
          a.cell.col - b.cell.col,
      )[0]?.cell;
    if (!frontier) {
      break;
    }
    roads.push(frontier);
    roadKeys.add(roadCellKey(frontier.col, frontier.row));
  }
  return roads;
}

/**
 * Hand-pinned from the two approved final-demo references. These are intentionally literal:
 * Islands 1 and 2 must not move when the generic distribution or road algorithms evolve.
 */
const PREHISTORIC_PRESENTER_REFERENCE_LAYOUT: IslandLayout = {
  ...foundingLayout(),
  town_hall: { nodeId: TOWN_HALL_ID, col: -1, row: -2, rot: 0 },
  placements: [
    { nodeId: "NUM.S", col: -5, row: -3, rot: 0 },
    { nodeId: "NUM.2", col: -1, row: 1, rot: 0 },
    { nodeId: "NUM.3", col: 1, row: -3, rot: 0 },
    { nodeId: "NUM.4", col: 2, row: 3, rot: 0 },
    { nodeId: "NUM.5", col: 3, row: -2, rot: 0 },
  ],
  civic: [
    { nodeId: "civic:prehistoric_smokehouse:0", col: -2, row: -4, rot: 0 },
    { nodeId: "civic:prehistoric_longhouse:1", col: -5, row: -1, rot: 0 },
    { nodeId: "civic:prehistoric_storage_pit:2", col: -2, row: -2, rot: 0 },
    { nodeId: "civic:prehistoric_storage_pit:3", col: -2, row: -1, rot: 0 },
    { nodeId: "civic:prehistoric_smokehouse:4", col: -3, row: 1, rot: 0 },
  ],
  roads: [
    { col: 0, row: -4 },
    { col: -3, row: -3 },
    { col: -2, row: -3 },
    { col: -1, row: -3 },
    { col: 0, row: -3 },
    { col: -3, row: -2 },
    { col: 2, row: -2 },
    { col: -3, row: -1 },
    { col: 2, row: -1 },
    { col: -3, row: 0 },
    { col: -2, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: -5, row: 1 },
    { col: -4, row: 1 },
    { col: 1, row: 1 },
    { col: -4, row: 2 },
    { col: -3, row: 2 },
    { col: -2, row: 2 },
    { col: 1, row: 2 },
    { col: -2, row: 3 },
    { col: -1, row: 3 },
    { col: 0, row: 3 },
    { col: 1, row: 3 },
  ],
};

const NEOLITHIC_PRESENTER_REFERENCE_LAYOUT: IslandLayout = {
  ...foundingLayout(),
  town_hall: { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 },
  placements: [
    { nodeId: "EXP.1", col: -2, row: -5, rot: 0 },
    { nodeId: "RAD.1", col: -3, row: 2, rot: 0 },
    { nodeId: "RAD.2", col: -6, row: -2, rot: 0 },
    { nodeId: "RAD.4", col: 2, row: 3, rot: 0 },
  ],
  civic: [
    { nodeId: "civic:neolithic_granary:0", col: 3, row: -4, rot: 0 },
    { nodeId: "civic:neolithic_village_houses:1", col: 3, row: -1, rot: 0 },
    { nodeId: "civic:neolithic_bread_oven:2", col: -3, row: -3, rot: 0 },
    { nodeId: "civic:neolithic_village_well:3", col: -1, row: 2, rot: 0 },
    { nodeId: "civic:neolithic_village_houses:4", col: -3, row: -1, rot: 0 },
    { nodeId: "civic:neolithic_granary:5", col: 0, row: 1, rot: 0 },
  ],
  roads: [
    { col: -4, row: -4 },
    { col: -4, row: -3 },
    { col: -3, row: -4 },
    { col: -2, row: -4 },
    { col: -1, row: -4 },
    { col: 0, row: -4 },
    { col: 1, row: -4 },
    { col: 2, row: -4 },
    { col: -1, row: -3 },
    { col: 2, row: -3 },
    { col: -4, row: -2 },
    { col: -1, row: -2 },
    { col: 2, row: -2 },
    { col: 3, row: -2 },
    { col: -4, row: -1 },
    { col: 2, row: -1 },
    { col: -5, row: 0 },
    { col: -4, row: 0 },
    { col: 2, row: 0 },
    { col: -4, row: 1 },
    { col: -3, row: 1 },
    { col: -2, row: 1 },
    { col: -1, row: 1 },
    { col: 2, row: 1 },
    { col: 0, row: 2 },
    { col: 1, row: 2 },
    { col: 2, row: 2 },
  ],
};

function presenterReferenceLayout(eraId: EraId): IslandLayout | null {
  if (eraId === "prehistoric") {
    return PREHISTORIC_PRESENTER_REFERENCE_LAYOUT;
  }
  if (eraId === "neolithic") {
    return NEOLITHIC_PRESENTER_REFERENCE_LAYOUT;
  }
  return null;
}

function state(
  nodeId: string,
  stage: "foundation" | "construction" | "complete",
): StudentNodeState {
  return {
    student_id: STUDENT_ID,
    node_id: nodeId,
    placement_estimate: 0,
    mastery: stage === "complete" ? GOLD_MASTERY : 0,
    mastery_updated_at: stage === "complete" ? PRACTICED_AT : null,
    completion_status:
      stage === "complete"
        ? "complete"
        : stage === "construction"
          ? "in_progress"
          : "locked",
    lesson_stage:
      stage === "complete" ? "done" : stage === "construction" ? "practice" : "not_started",
    last_practiced_at: stage === "complete" ? PRACTICED_AT : null,
  };
}

export function distributedPlacements(
  eraId: EraId,
  nodeIds: readonly string[],
): readonly PlacedTransform[] {
  const townHall = hall();
  const radius = eraIslandBuildableRadius(eraId);
  const reach = Math.ceil(radius / 4) + 1;
  const placed: PlacedTransform[] = [];
  const occupied = new Set(footprintCells(townHall, footprintFor(townHall.nodeId)));

  for (const nodeId of nodeIds) {
    const footprint = footprintFor(nodeId);
    const candidates: Array<{
      placement: PlacedTransform;
      score: number;
      radial: number;
    }> = [];
    for (let col = -reach; col <= reach; col += 1) {
      for (let row = -reach; row <= reach; row += 1) {
        const placement = { nodeId, col, row, rot: 0 };
        if (!isFootprintInBounds(placement, footprint, radius)) {
          continue;
        }
        const cells = footprintCells(placement, footprint);
        if (cells.some((cell) => occupied.has(cell))) {
          continue;
        }
        if (unreachableNodeIds([townHall, ...placed, placement], radius).length > 0) {
          continue;
        }
        if (!buildingsShareRoadComponent(eraId, [townHall, ...placed, placement])) {
          continue;
        }
        const center = transformCenter(placement, footprint);
        const radial = Math.hypot(center.x, center.z);
        if (radial < 8) {
          continue;
        }
        const neighbors = [townHall, ...placed].map((existing) =>
          transformCenter(existing, footprintFor(existing.nodeId)),
        );
        const separation = Math.min(
          ...neighbors.map((neighbor) =>
            Math.hypot(center.x - neighbor.x, center.z - neighbor.z),
          ),
        );
        // Middle density: separation matters most, but a small inward cost keeps the city
        // reading as one settlement rather than five outposts on the coast.
        candidates.push({
          placement,
          score: separation - radial * 0.16,
          radial,
        });
      }
    }
    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        a.radial - b.radial ||
        Math.atan2(a.placement.row, a.placement.col) -
          Math.atan2(b.placement.row, b.placement.col),
    );
    const selected =
      candidates[0]?.placement ??
      (() => {
        // Keep the spacious showcase layout while it fits. A later era can legitimately
        // need extra prerequisite buildings to make its unbuilt target available; when the
        // middle-density pass runs out, fall back to the product's own nearest valid cell
        // rather than dropping a required building or making the target lie about readiness.
        const open = findOpenCell(footprint, occupied, radius, 0, {
          nodeId,
          others: [townHall, ...placed],
        });
        return open ? { nodeId, ...open } : null;
      })();
    if (!selected) {
      const compact = defaultPlacements(nodeIds, [townHall], radius);
      if (compact.length === nodeIds.length) {
        return compact;
      }
      throw new Error(`Presenter layout could not distribute ${nodeId}.`);
    }
    placed.push(selected);
    for (const cell of footprintCells(selected, footprint)) {
      occupied.add(cell);
    }
  }
  return placed;
}

export function presenterFocusNodeId(eraId: EraId): string {
  const era = getEraOrThrow(eraId);
  const focus = era.nodes.includes("LF.1") ? "LF.1" : era.nodes[0];
  if (!focus) {
    throw new Error(`Presenter cannot choose a focus for the empty ${era.name} registry.`);
  }
  return focus;
}

/**
 * Reviewed Presenter progression targets that intentionally differ from the generic selector.
 *
 * Era 2's five authored models were compared in full Presenter-city frames at 1024×580 and
 * 390×580. RAD.3 has the clearest site → framed Meeting House → red-roofed completion read;
 * EXP.1 and the smaller round/tower candidates lose that change at gameplay zoom. This is a
 * Presenter-only adapter: the canonical era roster and prerequisite graph remain untouched.
 */
export const PRESENTER_PROGRESSION_TARGETS: Readonly<Partial<Record<EraId, string>>> = {
  neolithic: "RAD.3",
  // The generic choice is CG.1, but Atomic's live FUN.4 target directly requires CG.1.
  // Learning state is shared across the archipelago, so leaving CG.1 untouched would make
  // another era's target truthfully locked. GEO.2 keeps Renaissance's live loop separate
  // while its own GEO.1 prerequisite is completed and standing.
  renaissance: "GEO.2",
};

/**
 * Pick a separate skill for the complete unbuilt → placement → learning demonstration.
 * A visually reviewed Presenter override wins; otherwise prefer one whose direct gate does
 * not depend on the retained lesson-shortcut focus.
 */
export function presenterUnbuiltNodeId(eraId: EraId): string {
  const era = getEraOrThrow(eraId);
  const focusNodeId = presenterFocusNodeId(eraId);
  const reviewed = PRESENTER_PROGRESSION_TARGETS[eraId];
  if (reviewed !== undefined) {
    if (!era.nodes.includes(reviewed) || reviewed === focusNodeId) {
      throw new Error(
        `Presenter progression target "${reviewed}" is not a separate skill in ${era.name}.`,
      );
    }
    return reviewed;
  }
  const independent = era.nodes.find(
    (nodeId) =>
      nodeId !== focusNodeId && !getNodeOrThrow(nodeId).prereqs.includes(focusNodeId),
  );
  const target = independent ?? era.nodes.find((nodeId) => nodeId !== focusNodeId);
  if (!target) {
    throw new Error(`Presenter cannot choose a separate unbuilt skill for ${era.name}.`);
  }
  return target;
}

/** Buildings that must be complete AND standing for the real Build menu to offer the target. */
export function presenterUnbuiltPrerequisiteIds(eraId: EraId): readonly string[] {
  const unbuiltNodeId = presenterUnbuiltNodeId(eraId);
  const eraIndex = ERA_SEQUENCE.findIndex((entry) => entry.id === eraId);
  const roster = new Set(
    ERA_SEQUENCE.slice(0, eraIndex + 1).flatMap((entry) => entry.nodes),
  );
  return getNodeOrThrow(unbuiltNodeId).prereqs.filter((nodeId) => roster.has(nodeId));
}

function requirePresenterSeed(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Presenter seed: ${message}`);
  }
}

export function validatePresenterCivicCensus(
  eraId: EraId,
  canonicalTypes: readonly string[],
  civicTypes: readonly string[],
): void {
  const rows = civicCatalogueForEra(eraId);
  const canonicalAtTip = new Set<string>(rows.map((row) => row.id));
  requirePresenterSeed(
    canonicalTypes.length >= PRESENTER_CIVIC_COUNT,
    `${eraId} canonical civic population fell below four`,
  );
  requirePresenterSeed(
    new Set(canonicalTypes).size === canonicalTypes.length,
    `${eraId} canonical civic population repeats a type`,
  );
  for (const catalogueId of canonicalTypes) {
    requirePresenterSeed(
      canonicalAtTip.has(catalogueId),
      `${eraId} canonical civic ${catalogueId} is stale`,
    );
  }
  const requiredCivicTypes = presenterCivicPlacementIds(eraId).map((placementId) => {
    const parsed = parseCivicPlacementId(placementId);
    if (parsed === null) {
      throw new Error(`Presenter seed: ${placementId} is not a civic placement.`);
    }
    return parsed.catalogueId;
  });
  requirePresenterSeed(
    civicTypes.length === requiredCivicTypes.length,
    `${eraId} must place exactly ${requiredCivicTypes.length} reference civics`,
  );
  for (const required of new Set(requiredCivicTypes)) {
    requirePresenterSeed(
      civicTypes.filter((catalogueId) => catalogueId === required).length ===
        requiredCivicTypes.filter((catalogueId) => catalogueId === required).length,
      `${eraId} has the wrong reference count for civic ${required}`,
    );
  }
}

/**
 * Executable fixture boundary. The constructor below cannot emit missing or duplicate
 * civics, disconnected/invalid roads, overlapping footprints, or a second missing own-era
 * skill without failing before the Presenter app mounts.
 */
export function validatePresenterEraLayout(eraId: EraId, layout: IslandLayout): void {
  const era = getEraOrThrow(eraId);
  const target = presenterUnbuiltNodeId(eraId);
  const ownPlaced = new Set(
    layout.placements
      .filter((placement) => era.nodes.includes(placement.nodeId))
      .map((placement) => placement.nodeId),
  );
  requirePresenterSeed(
    era.nodes.filter((nodeId) => !ownPlaced.has(nodeId)).join(",") === target,
    `${eraId} must leave only ${target} unbuilt`,
  );

  requirePresenterSeed(
    new Set(layout.civic.map((placement) => placement.nodeId)).size === layout.civic.length,
    `${eraId} repeats a civic placement identity`,
  );
  const civicTypes = layout.civic.map((placement) => {
    const parsed = parseCivicPlacementId(placement.nodeId);
    requirePresenterSeed(
      parsed !== null && parsed.row.era === eraId,
      `${eraId} has non-canonical civic ${placement.nodeId}`,
    );
    return parsed?.catalogueId ?? "";
  });
  const canonicalTypes = civicCatalogueForEra(eraId).map((row) => row.id);
  validatePresenterCivicCensus(eraId, canonicalTypes, civicTypes);

  const radius = eraIslandBuildableRadius(eraId);
  const allOccupants = [layout.town_hall ?? hall(), ...layout.placements, ...layout.civic];
  const occupied = new Set<string>();
  for (const placement of allOccupants) {
    requirePresenterSeed(
      isFootprintInBounds(placement, footprintFor(placement.nodeId), radius),
      `${eraId}/${placement.nodeId} is outside the buildable island`,
    );
    for (const cell of footprintCells(placement, footprintFor(placement.nodeId))) {
      requirePresenterSeed(!occupied.has(cell), `${eraId} overlaps footprint ${cell}`);
      occupied.add(cell);
    }
  }
  requirePresenterSeed(
    unreachableNodeIds(allOccupants, radius).length === 0,
    `${eraId} contains an unreachable building`,
  );

  const bounds = presenterRoadBounds(eraId);
  requirePresenterSeed(
    layout.roads.length >= bounds.floor,
    `${eraId} roads fall below floor ${bounds.floor}`,
  );
  requirePresenterSeed(
    layout.roads.length <= bounds.ceiling,
    `${eraId} roads exceed ceiling ${bounds.ceiling}`,
  );
  const roadKeys = new Set<string>();
  for (const road of layout.roads) {
    const key = roadCellKey(road.col, road.row);
    requirePresenterSeed(!roadKeys.has(key), `${eraId} repeats road ${key}`);
    requirePresenterSeed(
      isCellBuildable(road.col, road.row, radius),
      `${eraId} road ${key} is off-island`,
    );
    requirePresenterSeed(!occupied.has(key), `${eraId} road ${key} overlaps a footprint`);
    roadKeys.add(key);
  }
  requirePresenterSeed(
    roadNetworkConnected(layout.roads),
    `${eraId} roads are not one coherent network`,
  );
  const touchesRoad = (placement: PlacedTransform): boolean =>
    footprintCells(placement, footprintFor(placement.nodeId)).some((footprintKey) => {
      const footprintCell = parseRoadCellKey(footprintKey);
      return CARDINAL_STEPS.some(([dc, dr]) =>
        roadKeys.has(roadCellKey(footprintCell.col + dc, footprintCell.row + dr)),
      );
    });
  requirePresenterSeed(
    touchesRoad(layout.town_hall ?? hall()),
    `${eraId} road network does not reach Town Hall`,
  );
  for (const civic of layout.civic) {
    requirePresenterSeed(
      touchesRoad(civic),
      `${eraId} civic ${civic.nodeId} is disconnected from the road network`,
    );
  }
  for (const skill of layout.placements) {
    requirePresenterSeed(
      touchesRoad(skill),
      `${eraId} skill ${skill.nodeId} is disconnected from the road network`,
    );
  }
}

const PRESENTER_ISLAND_CACHE = new Map<EraId, IslandRecord>();

function clonePresenterIsland(island: IslandRecord): IslandRecord {
  return {
    eraId: island.eraId,
    layout: {
      ...island.layout,
      town_hall: island.layout.town_hall ? { ...island.layout.town_hall } : null,
      placements: island.layout.placements.map((placement) => ({ ...placement })),
      civic: island.layout.civic.map((placement) => ({ ...placement })),
      roads: island.layout.roads.map((road) => ({ ...road })),
    },
  };
}

export function presenterIsland(eraId: EraId): IslandRecord {
  const cached = PRESENTER_ISLAND_CACHE.get(eraId);
  if (cached) {
    return clonePresenterIsland(cached);
  }
  const referenceLayout = presenterReferenceLayout(eraId);
  if (referenceLayout !== null) {
    validatePresenterEraLayout(eraId, referenceLayout);
    const island = { eraId, layout: referenceLayout };
    PRESENTER_ISLAND_CACHE.set(eraId, island);
    return clonePresenterIsland(island);
  }
  const era = getEraOrThrow(eraId);
  const unbuiltNodeId = presenterUnbuiltNodeId(eraId);
  const supportNodeIds = presenterUnbuiltPrerequisiteIds(eraId).filter(
    (nodeId) => !era.nodes.includes(nodeId),
  );
  const distributed = distributedPlacements(eraId, [
    ...era.nodes.filter((nodeId) => nodeId !== unbuiltNodeId),
    ...supportNodeIds,
    ...presenterCivicPlacementIds(eraId),
  ]);
  const layout: IslandLayout = {
    ...foundingLayout(),
    placements: distributed.filter(
      (placement) => parseCivicPlacementId(placement.nodeId) === null,
    ),
    civic: distributed.filter(
      (placement) => parseCivicPlacementId(placement.nodeId) !== null,
    ),
    roads: presenterRoads(eraId, [hall(), ...distributed]),
  };
  validatePresenterEraLayout(eraId, layout);
  const island = { eraId, layout };
  PRESENTER_ISLAND_CACHE.set(eraId, island);
  return clonePresenterIsland(island);
}

function currentStages(
  nodes: readonly string[],
  unbuiltNodeId: string,
): readonly StudentNodeState[] {
  return nodes.map((nodeId) =>
    state(nodeId, nodeId === unbuiltNodeId ? "foundation" : "complete"),
  );
}

export interface PresenterFixture {
  readonly city: ShowcaseCityFixture;
  readonly archipelago: ArchipelagoState;
}

export function presenterFixtureFor(request: PresenterRequest): PresenterFixture {
  const era = getEraOrThrow(request.eraId);
  const focusNodeId = presenterFocusNodeId(era.id);
  const nodeStates = ERA_SEQUENCE.flatMap((entry) =>
    currentStages(entry.nodes, presenterUnbuiltNodeId(entry.id)),
  );
  const islands = ERA_SEQUENCE.map((entry) => presenterIsland(entry.id));
  const current = islands.find((island) => island.eraId === era.id);
  if (!current?.layout.town_hall) {
    throw new Error(`Presenter cannot find the seeded ${era.name} island.`);
  }
  const seed: ShowcaseCitySeed = {
    nodeStates,
    placements: current.layout.placements,
    townHall: current.layout.town_hall,
    civic: current.layout.civic,
    roads: current.layout.roads,
  };
  return {
    city: {
      eraId: era.id,
      focusNodeId,
      seed,
    },
    archipelago: {
      standing: era.id,
      islands,
    },
  };
}
