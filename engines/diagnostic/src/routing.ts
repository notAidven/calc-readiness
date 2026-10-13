import { getNodesByScope } from "@cr/skill-graph";

/**
 * Provisional, author-assigned difficulty (L1/L2/L3). NOT IRT-calibrated at MVP;
 * a `scoring_model_version` lets historical scores be recomputed once real item
 * parameters exist (Assessment_Scoring_Spec §10, Adaptive-Diagnostic amendment §5).
 */
export type ItemDifficulty = 1 | 2 | 3;

/**
 * A stage's role in the multistage adaptive test. `routing` is served first;
 * clearing it routes `up`, missing it routes `down`. The role drives both the
 * routing decision and the frontier score (scoring.ts).
 */
export type StageRole = "routing" | "up" | "down";

export interface DiagnosticStageSlot {
  node_id: string;
  difficulty: ItemDifficulty;
}

export interface DiagnosticStage {
  stage_id: string;
  role: StageRole;
  slots: readonly DiagnosticStageSlot[];
}

/**
 * A multistage adaptive blueprint: the stages plus the routing rule between them.
 * Versioned so pre and post administrations can be held to the same structure
 * (INV-DIAG-5). Kept declarative so the full-graph post-MVP structure is a data
 * change, not a code change.
 */
export interface MultistageSpec {
  spec_version: number;
  first_stage: string;
  /** Scorable proportion-correct on the routing stage at/above which we route up. */
  routing_bar: number;
  stages: Readonly<Record<string, DiagnosticStage>>;
  /** Next stage id given the completed stage and its scorable proportion, or null when done. */
  route(completedStageId: string, proportion: number): string | null;
}

export function getStage(spec: MultistageSpec, stageId: string): DiagnosticStage {
  const stage = spec.stages[stageId];
  if (!stage) {
    throw new Error(`unknown diagnostic stage: ${stageId}`);
  }
  return stage;
}

const DEFAULT_ROUTING_BAR = 0.7;

/** One node as the spec reads it: an id plus whether anything gates it. */
export interface MultistageSpecNode {
  readonly id: string;
  readonly prereqs: readonly string[];
}

/**
 * A multistage spec over ANY node set. Stage node sets are derived from the prereq
 * graph so the shape generalizes: roots (no prereqs among the given nodes) anchor
 * the `down` stage; gated nodes anchor the `up` stage; the routing stage samples
 * every node at medium difficulty.
 *
 * Parameterised so the node set is an argument rather than a hardcoded call to
 * `getNodesByScope("mvp")`. That call used to be inside the one factory here, which
 * made "the diagnostic's blueprint" and "the six D1 nodes" the same sentence. They
 * are not: the node set the instrument administers is derived from the authored
 * content (`@cr/item-bank`'s `DIAGNOSTIC_WALK_SCOPE`), and the item bank sits
 * DOWNSTREAM of this engine, so it cannot be read from here — the caller passes it.
 *
 * Note `prereqs` is read as given, not filtered to the passed set. A caller handing
 * a subset gets every gated node in the `up` stage, which is what the roles mean:
 * "something has to come before this".
 */
export function createMultistageSpec(
  nodes: readonly MultistageSpecNode[],
  routingBar: number = DEFAULT_ROUTING_BAR,
): MultistageSpec {
  const rootNodes = nodes.filter((node) => node.prereqs.length === 0);
  const higherNodes = nodes.filter((node) => node.prereqs.length > 0);

  const routingStage: DiagnosticStage = {
    stage_id: "R",
    role: "routing",
    slots: nodes.map((node) => ({ node_id: node.id, difficulty: 2 as const })),
  };
  const upStage: DiagnosticStage = {
    stage_id: "H",
    role: "up",
    slots: higherNodes.map((node) => ({ node_id: node.id, difficulty: 3 as const })),
  };
  const downStage: DiagnosticStage = {
    stage_id: "E",
    role: "down",
    slots: rootNodes.map((node) => ({ node_id: node.id, difficulty: 1 as const })),
  };

  return {
    spec_version: 1,
    first_stage: routingStage.stage_id,
    routing_bar: routingBar,
    stages: {
      [routingStage.stage_id]: routingStage,
      [upStage.stage_id]: upStage,
      [downStage.stage_id]: downStage,
    },
    route(completedStageId, proportion) {
      if (completedStageId === routingStage.stage_id) {
        return proportion >= routingBar ? upStage.stage_id : downStage.stage_id;
      }
      return null;
    },
  };
}

/**
 * The v1 MST spec over the 6 D1 nodes — {@link createMultistageSpec} applied to
 * `getNodesByScope("mvp")`, and byte-identical to what this factory returned when the
 * scope was inlined.
 *
 * Kept as its own export because it has consumers that mean D1 specifically: the v1
 * MST engine, and `validateItemBank`'s coverage check, whose required cells are the
 * L1/L2/L3 grid only the D1 v1 forms fill. **Do not widen it to reach the walk's
 * scope** — the walk is difficulty-agnostic and its packs are L2-only, so a wider spec
 * would demand L1/L3 items no walk pack authors and fail the coverage check for every
 * node it added.
 */
export function createD1MultistageSpec(
  routingBar: number = DEFAULT_ROUTING_BAR,
): MultistageSpec {
  return createMultistageSpec(getNodesByScope("mvp"), routingBar);
}
