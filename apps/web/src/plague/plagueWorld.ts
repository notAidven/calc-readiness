import { PLAGUE_GRAPH, type PlagueNodeId, type PlagueRouteId } from "@cr/game";

import { placementLabel, TOWN_HALL_ID } from "../city/townHall";
import { footprintFor, type PlacedTransform, transformCenter } from "../city/worldLayout";

export interface PlagueWorldNode {
  readonly id: PlagueNodeId;
  readonly label: string;
  readonly transform: PlacedTransform;
  readonly center: { readonly x: number; readonly z: number };
}

export interface PlagueWorldRoute {
  readonly id: PlagueRouteId;
  readonly from: PlagueNodeId;
  readonly to: PlagueNodeId;
  readonly fromCenter: PlagueWorldNode["center"];
  readonly toCenter: PlagueWorldNode["center"];
}

export interface PlagueWorld {
  readonly nodes: readonly PlagueWorldNode[];
  readonly routes: readonly PlagueWorldRoute[];
}

function stablePlacements(
  placements: readonly PlacedTransform[],
): readonly PlacedTransform[] {
  return [...placements]
    .filter((placement) => placement.nodeId !== TOWN_HALL_ID)
    .sort(
      (a, b) =>
        a.nodeId.localeCompare(b.nodeId) || a.col - b.col || a.row - b.row || a.rot - b.rot,
    );
}

function spreadPlacements(
  placements: readonly PlacedTransform[],
  townHall: PlacedTransform,
): readonly PlacedTransform[] {
  const pool = [...stablePlacements(placements)];
  const chosen: PlacedTransform[] = [];
  const anchors = [townHall];
  while (chosen.length < PLAGUE_GRAPH.nodes.length - 1 && pool.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.NEGATIVE_INFINITY;
    for (const [index, candidate] of pool.entries()) {
      const center = transformCenter(candidate, footprintFor(candidate.nodeId));
      const nearest = Math.min(
        ...anchors.map((anchor) => {
          const other = transformCenter(anchor, footprintFor(anchor.nodeId));
          return Math.hypot(center.x - other.x, center.z - other.z);
        }),
      );
      if (nearest > bestDistance) {
        bestDistance = nearest;
        bestIndex = index;
      }
    }
    const [picked] = pool.splice(bestIndex, 1);
    if (picked) {
      chosen.push(picked);
      anchors.push(picked);
    }
  }
  return chosen;
}

/**
 * Maps the bounded outbreak graph to the city that is actually on screen.
 *
 * The Care House role is always the live Town Hall. The other four roles use a stable slice of
 * real skill placements, so persistence can resume without storing a second copy of city layout.
 */
export function plagueWorldFrom(
  placements: readonly PlacedTransform[],
  townHall: PlacedTransform,
): PlagueWorld {
  const real = spreadPlacements(placements, townHall);
  if (real.length < PLAGUE_GRAPH.nodes.length - 1) {
    throw new Error("The Plague needs the Town Hall and four placed buildings.");
  }
  const transforms = new Map<PlagueNodeId, PlacedTransform>([
    ["care-house", townHall],
    ["market", real[0] as PlacedTransform],
    ["printworks", real[1] as PlacedTransform],
    ["chapel", real[2] as PlacedTransform],
    ["guildhall", real[3] as PlacedTransform],
  ]);
  const nodes = PLAGUE_GRAPH.nodes.map((authored): PlagueWorldNode => {
    const transform = transforms.get(authored.id);
    if (!transform) {
      throw new Error(`The live city has no placement for "${authored.id}".`);
    }
    return {
      id: authored.id,
      label:
        authored.id === "care-house"
          ? `Care House at ${placementLabel(transform.nodeId)}`
          : placementLabel(transform.nodeId),
      transform,
      center: transformCenter(transform, footprintFor(transform.nodeId)),
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routes = PLAGUE_GRAPH.routes.map((authored): PlagueWorldRoute => {
    const from = nodeById.get(authored.from);
    const to = nodeById.get(authored.to);
    if (!from || !to) {
      throw new Error(`The live city cannot draw route "${authored.id}".`);
    }
    return {
      ...authored,
      fromCenter: from.center,
      toCenter: to.center,
    };
  });
  return { nodes, routes };
}
