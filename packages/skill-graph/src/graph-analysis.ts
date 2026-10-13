import { getNode, skillGraph } from "./index";

/**
 * Pure DAG analysis over the skill-graph registry — the primitives the
 * prerequisite-gated adaptive diagnostic (Contracts Amendment v2) walks and
 * scores on. Everything here reads the registry's stored `prereqs` edges (the
 * same edge set the rest of the engine uses, e.g. `engines/diagnostic`), holds no
 * external state, and memoizes against the immutable imported registry.
 */

const depthCache = new Map<string, number>();

/**
 * Longest prerequisite path from a root — a node's difficulty "tier" for the
 * coverage weight `w(n) = 1 + prereqDepth(n)`. Roots (no prereqs) are depth 0;
 * every other node is `1 + max(depth(prereq))`. Missing prereq ids are treated as
 * roots. Deterministic and memoized; the registry is a DAG (the cycle guard is
 * purely defensive so an invalid graph terminates instead of looping).
 */
export function prereqDepth(nodeId: string): number {
  return depthFrom(nodeId, new Set());
}

function depthFrom(nodeId: string, active: Set<string>): number {
  const cached = depthCache.get(nodeId);
  if (cached !== undefined) {
    return cached;
  }
  const prereqs = getNode(nodeId)?.prereqs ?? [];
  if (prereqs.length === 0 || active.has(nodeId)) {
    return 0;
  }
  active.add(nodeId);
  let deepest = 0;
  for (const prereq of prereqs) {
    deepest = Math.max(deepest, depthFrom(prereq, active) + 1);
  }
  active.delete(nodeId);
  depthCache.set(nodeId, deepest);
  return deepest;
}

/**
 * Every transitive prerequisite of `nodeId` (its downward closure, excluding
 * itself). Used for conservative test-out (a robust pass credits this set) and
 * for the downward-closed resolved knowledge state.
 */
export function transitivePrereqs(nodeId: string): Set<string> {
  const collected = new Set<string>();
  const stack = [...(getNode(nodeId)?.prereqs ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || collected.has(current)) {
      continue;
    }
    collected.add(current);
    stack.push(...(getNode(current)?.prereqs ?? []));
  }
  return collected;
}

let dependentsIndex: Map<string, string[]> | null = null;

function dependentsAdjacency(): Map<string, string[]> {
  if (dependentsIndex) {
    return dependentsIndex;
  }
  const adjacency = new Map<string, string[]>();
  for (const node of skillGraph.nodes) {
    for (const prereq of node.prereqs) {
      const list = adjacency.get(prereq);
      if (list) {
        list.push(node.id);
      } else {
        adjacency.set(prereq, [node.id]);
      }
    }
  }
  dependentsIndex = adjacency;
  return adjacency;
}

/**
 * A deterministic TEACHING ORDER for a set of nodes: a topological order over the
 * registry's prereq edges where every node appears AFTER all of its prerequisites
 * (foundational nodes first). Ordering by `prereqDepth` is itself a valid
 * topological sort — a prerequisite always has a strictly smaller depth than its
 * dependent, and two equal-depth nodes can have no edge between them — so the
 * stable input-order tie-break is always a legal sequence. The input array is not
 * mutated. This is the sequence lessons are meant to be taught (and the build menu
 * lists its buildings) so a learner meets each skill only after its groundwork.
 */
export function teachingOrder(nodeIds: readonly string[]): string[] {
  return nodeIds
    .map((id, index) => ({ id, index, depth: prereqDepth(id) }))
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
    .map((entry) => entry.id);
}

/**
 * Every transitive dependent of `nodeId` (its upward closure, excluding itself) —
 * the subtree the walk prunes when `nodeId` is a confirmed failure (INV-DIAG-6/7).
 */
export function transitiveDependents(nodeId: string): Set<string> {
  const adjacency = dependentsAdjacency();
  const collected = new Set<string>();
  const stack = [...(adjacency.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || collected.has(current)) {
      continue;
    }
    collected.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return collected;
}
