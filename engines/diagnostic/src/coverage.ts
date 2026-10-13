import { type DomainId, getProductNodes, prereqDepth } from "@cr/skill-graph";

/**
 * Depth-weighted readiness coverage — the reported metric of the prerequisite-
 * gated adaptive diagnostic (Contracts Amendment v2 §5). It replaces the frontier
 * `θ` with coverage of the in-product prereq graph, weighted by prerequisite
 * depth, computed over the RESOLVED knowledge state (measured ∪ conservatively-
 * inferred passes). Pure and deterministic: a function of the resolved state + the
 * registry + the weight rule, so it is reproducible for the gain gate and
 * path-invariant (two administrations of the same true state score identically).
 */

/** A node's outcome in one administration's resolved knowledge state. */
export type ResolutionStatus = "passed" | "failed" | "pruned" | "unknown";

/** For a `passed` node: directly measured, or credited by conservative test-out (INV-DIAG-8). */
export type EvidenceSource = "measured" | "inferred";

export interface NodeResolution {
  node_id: string;
  status: ResolutionStatus;
  /** Present (and meaningful) only when `status === "passed"`. Defaults to `measured`. */
  source?: EvidenceSource;
}

/** One administration's resolved state (expected downward-closed; the walk guarantees it). */
export type ResolvedKnowledgeState = readonly NodeResolution[];

/** Coverage weight `w(n) = 1 + prereqDepth(n)`: deeper on the prereq ladder counts for more. */
export function coverageWeight(nodeId: string): number {
  return 1 + prereqDepth(nodeId);
}

/** The default readiness denominator: the 62 in-product nodes (`mvp` + `target`). */
export function inProductScope(): string[] {
  return getProductNodes().map((node) => node.id);
}

export interface CoverageResult {
  /** Resolved coverage in [0, 1] (measured ∪ inferred passes over the scope). */
  coverage: number;
  /** Measured-only coverage in [0, 1] — the audit / fallback number (INV-DIAG-2). */
  coverage_measured: number;
  weighted_passed: number;
  weighted_passed_measured: number;
  weighted_total: number;
  scope_count: number;
}

/**
 * Coverage of `state` over `scopeNodeIds` (default: the in-product graph). Restrict
 * the scope to the 6 D1 nodes for the blueprint-matched D1 gate. Nodes outside the
 * scope (e.g. `extended`/`secondary`) are placeable but never enter the denominator.
 */
export function computeCoverage(
  state: ResolvedKnowledgeState,
  scopeNodeIds: readonly string[] = inProductScope(),
): CoverageResult {
  const scope = new Set(scopeNodeIds);

  let weighted_total = 0;
  for (const nodeId of scope) {
    weighted_total += coverageWeight(nodeId);
  }

  const passedSource = new Map<string, EvidenceSource>();
  for (const resolution of state) {
    if (resolution.status === "passed" && scope.has(resolution.node_id)) {
      passedSource.set(resolution.node_id, resolution.source ?? "measured");
    }
  }

  let weighted_passed = 0;
  let weighted_passed_measured = 0;
  for (const [nodeId, source] of passedSource) {
    const weight = coverageWeight(nodeId);
    weighted_passed += weight;
    if (source === "measured") {
      weighted_passed_measured += weight;
    }
  }

  return {
    coverage: weighted_total === 0 ? 0 : weighted_passed / weighted_total,
    coverage_measured: weighted_total === 0 ? 0 : weighted_passed_measured / weighted_total,
    weighted_passed,
    weighted_passed_measured,
    weighted_total,
    scope_count: scope.size,
  };
}

/** Resolved coverage per domain (D1–D9) over the in-product scope — the diagnostic profile. */
export function perDomainCoverage(state: ResolvedKnowledgeState): Record<string, number> {
  const idsByDomain = new Map<DomainId, string[]>();
  for (const node of getProductNodes()) {
    const list = idsByDomain.get(node.domain);
    if (list) {
      list.push(node.id);
    } else {
      idsByDomain.set(node.domain, [node.id]);
    }
  }

  const out: Record<string, number> = {};
  for (const [domain, ids] of idsByDomain) {
    out[domain] = computeCoverage(state, ids).coverage;
  }
  return out;
}

export interface CoverageMeasurement {
  coverage_pre: number;
  coverage_post: number;
  /** The reported readiness gain: `coverage_post − coverage_pre`. */
  coverage_gain: number;
  coverage_pre_measured: number;
  coverage_post_measured: number;
  coverage_gain_measured: number;
  per_domain_pre: Record<string, number>;
  per_domain_post: Record<string, number>;
}

/**
 * Paired pre/post coverage gain over a shared scope. Both sides use the identical
 * weight rule + scope, so the gain reflects real change in the resolved state
 * (INV-DIAG-5). The measured-only gain is reported alongside for audit.
 */
export function computeCoverageMeasurement(
  pre: ResolvedKnowledgeState,
  post: ResolvedKnowledgeState,
  scopeNodeIds: readonly string[] = inProductScope(),
): CoverageMeasurement {
  const preResult = computeCoverage(pre, scopeNodeIds);
  const postResult = computeCoverage(post, scopeNodeIds);
  return {
    coverage_pre: preResult.coverage,
    coverage_post: postResult.coverage,
    coverage_gain: postResult.coverage - preResult.coverage,
    coverage_pre_measured: preResult.coverage_measured,
    coverage_post_measured: postResult.coverage_measured,
    coverage_gain_measured: postResult.coverage_measured - preResult.coverage_measured,
    per_domain_pre: perDomainCoverage(pre),
    per_domain_post: perDomainCoverage(post),
  };
}
