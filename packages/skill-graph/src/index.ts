import registryJson from "./skill_graph.json";

// The era data model (spec `2026-07-27-era-progression-design.md` §3, O-1; the
// per-era land budget is §5.1, D-ERA25). Era membership is over NODE ids, which are
// stable under the coming domain renumber, and the sequence is `ERA_SEQUENCE`'s array
// order, never derived from `DomainId` (INV-ERA-5). See `eras.ts` for why that is
// structural rather than a convention.
//
// All ten land budgets are authored. The requirement comes from D-ET8 beat two ("the
// island expands", era-trial contract §19.1); the DERIVATION is this module's proposal
// and is open item O-16, so `ERA_LAND_DEMAND` and the `ERA_ONE_*` calibration are
// exported for the three test files that re-derive each column from its own source.
export {
  buildableCellCount,
  ERA_LAND_DEMAND,
  ERA_MAX_NODES,
  ERA_MIN_NODES,
  ERA_ONE_BUILDABLE_CELLS,
  ERA_ONE_FILL_RATIO,
  ERA_ONE_OCCUPIED_CELLS,
  ERA_SEQUENCE,
  type EraDefinition,
  type EraId,
  type EraLandBudget,
  type EraLandDemand,
  type EraLandEntry,
  type EraReleaseState,
  eraAtNumber,
  eraBuildableRadius,
  eraLandDemand,
  eraNumber,
  findLandBudgetViolations,
  getEra,
  getEraNodes,
  getEraOfNode,
  getEraOrderedNodes,
  getEraOrThrow,
  HALL_LAND_CELLS,
  isEraReleased,
  LAND_GRID_CELL,
  type LandBudgetViolation,
  landBudgetRadius,
  landBudgetRadiusFor,
  occupiedLandCells,
  releasedEras,
} from "./eras";
// The learner-facing half of the same model: what each era is ABOUT, and which era the
// city is in. A sibling of `eras.ts` rather than more fields on `EraDefinition` — see
// that module's header for why copy and curation are kept apart.
export {
  buildEraTimeline,
  ERA_SUMMARIES,
  type EraStanding,
  type EraSummary,
  type EraTimelineEntry,
  type EraTimelineView,
  eraSummary,
} from "./eraTimeline";
export {
  prereqDepth,
  teachingOrder,
  transitiveDependents,
  transitivePrereqs,
} from "./graph-analysis";

// NOTE (2026-07-24 coverage expansion): the registry gained a D10 (GEOMETRY)
// domain (GEO.1/GEO.2). The union is widened to D10 so the game/app `Record<
// DomainId, ...>` maps stay exhaustive. D10's presentation (neighborhood
// descriptor, palette hue, labels) currently ships as a MINIMAL PLACEHOLDER
// pending the Geometry island owner (Evan game/island + Anthony theme). The
// registry skill_graph.json + graph_invariants.py remain the domain source of
// truth and already validate D10.
export type DomainId = `D${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | "D10";
export type LifecycleStatus =
  | "active_mvp"
  | "active_post_mvp"
  | "secondary"
  | "backlog"
  | "retired"
  | "cut";
export type ProductScope = "mvp" | "target" | "extended" | "excluded";

export interface SkillNode {
  readonly id: string;
  readonly domain: DomainId;
  readonly status: LifecycleStatus;
  readonly prereqs: readonly string[];
  readonly product_scope: ProductScope;
  readonly lesson_shell: string | null;
  readonly item_family?: boolean;
  readonly note?: string;
}

export interface EdgeOverride {
  readonly change: "add" | "remove" | "soften" | "note";
  readonly edge: readonly [string, string];
  readonly reason: string;
}

export interface ItemFamilyDefinition {
  readonly mvp_family: string | null;
  readonly in_authoring_scope: boolean;
  readonly families: Readonly<Record<string, readonly string[]>>;
  readonly _note?: string;
}

export interface SkillGraphRegistry {
  readonly _meta: Readonly<Record<string, unknown>>;
  readonly _edge_overrides: readonly EdgeOverride[];
  readonly item_family_nodes: Readonly<Record<string, ItemFamilyDefinition>>;
  readonly nodes: readonly SkillNode[];
}

export const skillGraph = registryJson as unknown as SkillGraphRegistry;

export function getNode(nodeId: string): SkillNode | undefined {
  return skillGraph.nodes.find((node) => node.id === nodeId);
}

export function getNodeOrThrow(nodeId: string): SkillNode {
  const node = getNode(nodeId);

  if (!node) {
    throw new Error(`Unknown skill node: ${nodeId}`);
  }

  return node;
}

export function getNodesByDomain(domain: DomainId): readonly SkillNode[] {
  return skillGraph.nodes.filter((node) => node.domain === domain);
}

export function getNodesByScope(scope: ProductScope): readonly SkillNode[] {
  return skillGraph.nodes.filter((node) => node.product_scope === scope);
}

export function getProductNodes(): readonly SkillNode[] {
  return skillGraph.nodes.filter(
    (node) => node.product_scope === "mvp" || node.product_scope === "target",
  );
}

export function getLessonShells(scope: "mvp" | "product"): readonly string[] {
  const acceptedScopes: readonly ProductScope[] =
    scope === "mvp" ? ["mvp"] : ["mvp", "target"];

  return [
    ...new Set(
      skillGraph.nodes
        .filter((node) => acceptedScopes.includes(node.product_scope))
        .flatMap((node) => (node.lesson_shell ? [node.lesson_shell] : [])),
    ),
  ].sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));
}
