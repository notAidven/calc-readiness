import { type MaterialBalances, materialForEra } from "@cr/economy";
import { diagnosticUnlockedEraPrefix, NEIGHBORHOOD_LABELS } from "@cr/game";
import {
  type DomainId,
  ERA_SEQUENCE,
  type EraId,
  eraNumber,
  getEraOrThrow,
  getNode,
} from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

import { eraPassedCount } from "../catchup/eraPlacement";
import { cityEraTimeline } from "../city/eraTimelineView";
import type { IslandRecord } from "./islandState";

/** The five product readings of the one selected real-island renderer. */
export type ArchipelagoCarouselState =
  | "standing"
  | "settled"
  | "closed"
  | "diagnostic"
  | "ceremony";

export interface ArchipelagoCarouselIsland {
  readonly eraId: EraId;
  readonly number: number;
  readonly name: string;
  readonly topic: string;
  readonly description: string;
  readonly state: ArchipelagoCarouselState;
  readonly masteredCount: number;
  readonly nodeCount: number;
  readonly passedCount: number;
  readonly storesLine: string | null;
  readonly chip:
    | "YOU ARE HERE"
    | "SETTLED"
    | "LANDING CLOSED"
    | "CLEARED BY DIAGNOSTIC"
    | "FOUNDING";
  readonly headline: string;
  readonly sentence: string;
  readonly action: string | null;
  readonly layout: IslandRecord["layout"] | null;
}

/** Product-owned topic: plurality domain in the era, with first appearance breaking ties. */
export function archipelagoTopic(eraId: EraId): string {
  const era = getEraOrThrow(eraId);
  const order: DomainId[] = [];
  const counts = new Map<DomainId, number>();
  for (const nodeId of era.nodes) {
    const domain = getNode(nodeId)?.domain as DomainId | undefined;
    if (domain === undefined) {
      continue;
    }
    if (!counts.has(domain)) {
      order.push(domain);
    }
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  const domain = order.reduce<DomainId | null>((best, candidate) => {
    if (best === null) {
      return candidate;
    }
    return (counts.get(candidate) ?? 0) > (counts.get(best) ?? 0) ? candidate : best;
  }, null);
  return domain === null ? era.name : NEIGHBORHOOD_LABELS[domain];
}

export interface ArchipelagoCarouselView {
  readonly selected: ArchipelagoCarouselIsland;
  readonly standingEraId: EraId;
  readonly standingNumber: number;
  readonly islands: readonly ArchipelagoCarouselIsland[];
}

function storesLine(eraId: EraId, materials: MaterialBalances): string | null {
  const material = materialForEra(eraId);
  if (material === null) {
    return null;
  }
  const amount = materials[material.id] ?? 0;
  return amount > 0 ? `${amount} ${material.display_name.toLowerCase()} here` : null;
}

function previousEraName(eraId: EraId): string {
  const previous = ERA_SEQUENCE[eraNumber(eraId) - 2];
  return previous?.name ?? "the previous era";
}

function stateFor(input: {
  readonly eraId: EraId;
  readonly standingEraId: EraId;
  readonly founded: ReadonlySet<EraId>;
  readonly diagnosticCleared: boolean;
  readonly ceremonyEraId?: EraId;
}): ArchipelagoCarouselState {
  if (input.ceremonyEraId === input.eraId) {
    return "ceremony";
  }
  if (input.eraId === input.standingEraId) {
    return "standing";
  }
  if (input.founded.has(input.eraId)) {
    return "settled";
  }
  return input.diagnosticCleared ? "diagnostic" : "closed";
}

function stateCopy(input: {
  readonly state: ArchipelagoCarouselState;
  readonly eraId: EraId;
  readonly masteredCount: number;
  readonly nodeCount: number;
  readonly passedCount: number;
  readonly storesLine: string | null;
  readonly ceremonyReady: boolean;
}): Pick<ArchipelagoCarouselIsland, "chip" | "headline" | "sentence" | "action"> {
  switch (input.state) {
    case "standing":
      return {
        chip: "YOU ARE HERE",
        headline: "Your city stands here",
        sentence: `${input.masteredCount} of ${input.nodeCount} mastered${
          input.storesLine ? ` · ${input.storesLine}` : ""
        }`,
        action: "Enter island",
      };
    case "settled":
      return {
        chip: "SETTLED",
        headline: "Built, and open to return to",
        sentence: `${input.masteredCount} of ${input.nodeCount} mastered${
          input.storesLine ? ` · ${input.storesLine}` : ""
        }`,
        action: `Sail to ${getEraOrThrow(input.eraId).name.replace(/ Era$/, "")}`,
      };
    case "diagnostic":
      return {
        chip: "CLEARED BY DIAGNOSTIC",
        headline: "Open ground, nothing built",
        sentence: `${input.passedCount} skills tested out · Nothing has been placed`,
        action: "Settle this island",
      };
    case "ceremony":
      return {
        chip: "FOUNDING",
        headline: `${getEraOrThrow(input.eraId).name.replace(/ Era$/, "")} shore is yours`,
        sentence: "The new shore is revealed · The arrival wake fades · No route remains",
        action: input.ceremonyReady ? "Continue to founding" : null,
      };
    default:
      return {
        chip: "LANDING CLOSED",
        headline: `The landing opens after island ${String(
          Math.max(1, eraNumber(input.eraId) - 1),
        ).padStart(2, "0")}`,
        sentence: `Browse now · Building opens after ${previousEraName(input.eraId)}`,
        action: "Explore terrain",
      };
  }
}

/**
 * Read the navigation state from durable founded islands plus diagnostic evidence.
 *
 * A founded set is not inferred from sequence position: the open persistence PRs both carry
 * explicit island records, and a diagnostic-cleared but unsettled island is precisely the case
 * sequence arithmetic cannot represent.
 */
export function archipelagoCarouselView(input: {
  readonly selectedEraId: EraId;
  readonly standingEraId: EraId;
  readonly nodeStates: readonly StudentNodeState[];
  readonly foundedIslands?: readonly IslandRecord[];
  readonly materials?: MaterialBalances;
  readonly ceremonyEraId?: EraId;
  readonly ceremonyReady?: boolean;
}): ArchipelagoCarouselView {
  const {
    selectedEraId,
    standingEraId,
    nodeStates,
    foundedIslands = [],
    materials = {},
    ceremonyEraId,
    ceremonyReady = false,
  } = input;
  const timeline = cityEraTimeline(nodeStates, standingEraId);
  const rowByEra = new Map(timeline.rows.map((row) => [row.era.id, row]));
  const layoutByEra = new Map(
    foundedIslands.map((island) => [island.eraId, island.layout]),
  );
  const founded = new Set(layoutByEra.keys());
  // The standing city is necessarily founded even while an async snapshot is catching up.
  founded.add(standingEraId);
  const placementByNode = Object.fromEntries(
    nodeStates.map((state) => [state.node_id, state.placement_estimate]),
  );
  const diagnosticUnlocked = new Set(
    diagnosticUnlockedEraPrefix(
      nodeStates.map((state) => ({
        node_id: state.node_id,
        placement_estimate: state.placement_estimate,
      })),
    ),
  );

  const islands = ERA_SEQUENCE.map((era): ArchipelagoCarouselIsland => {
    const row = rowByEra.get(era.id);
    if (!row) {
      throw new Error(`The carousel has no timeline row for "${era.id}".`);
    }
    const passedCount = eraPassedCount(era.id, placementByNode);
    const state = stateFor({
      eraId: era.id,
      standingEraId,
      founded,
      diagnosticCleared: diagnosticUnlocked.has(era.id),
      ...(ceremonyEraId === undefined ? {} : { ceremonyEraId }),
    });
    const ownStores =
      state === "closed" || state === "diagnostic" ? null : storesLine(era.id, materials);
    return {
      eraId: era.id,
      number: eraNumber(era.id),
      name: era.name,
      topic: archipelagoTopic(era.id),
      description: row.concept,
      state,
      masteredCount: row.masteredCount,
      nodeCount: row.nodeCount,
      passedCount,
      storesLine: ownStores,
      layout: layoutByEra.get(era.id) ?? null,
      ...stateCopy({
        state,
        eraId: era.id,
        masteredCount: row.masteredCount,
        nodeCount: row.nodeCount,
        passedCount,
        storesLine: ownStores,
        ceremonyReady,
      }),
    };
  });
  const selected = islands.find((island) => island.eraId === selectedEraId);
  if (!selected) {
    throw new Error(`The selected era "${selectedEraId}" is not in ERA_SEQUENCE.`);
  }
  return {
    selected,
    standingEraId,
    standingNumber: eraNumber(standingEraId),
    islands,
  };
}
