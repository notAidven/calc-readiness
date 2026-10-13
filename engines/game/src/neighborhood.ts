import { type DomainId, getNodesByDomain, getProductNodes } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

/**
 * Neighborhood-level helpers (pure, framework-free).
 *
 * A "neighborhood" is a domain rendered as a city. The MVP ships D1 only; the
 * other domains are distant, locked districts (scenery). Nothing here writes
 * shared state: readiness is a read-only derivation of `mastery`.
 */

/** The one production neighborhood in the MVP (Real Numbers & Arithmetic). */
export const D1_NEIGHBORHOOD_ID: DomainId = "D1";

/** Human labels for the skyline. Districts other than the active one are scenery. */
export const NEIGHBORHOOD_LABELS: Readonly<Record<DomainId, string>> = {
  D1: "Real Numbers & Arithmetic",
  D2: "Exponents & Radicals",
  D3: "Linear Equations & Inequalities",
  D4: "Polynomials",
  D5: "Rational Expressions",
  D6: "Functions & Coordinate Geometry",
  D7: "Linear Functions & Rates",
  D8: "Exponential & Logarithmic",
  D9: "Trigonometry",
  // PLACEHOLDER (D10 Geometry island): needs Evan to finalize theme/hue/buildings
  D10: "Geometry",
};

/**
 * The learner-facing name for a neighborhood ("Real Numbers & Arithmetic"), or the
 * raw domain id if none is mapped. The one safe lookup into
 * {@link NEIGHBORHOOD_LABELS} for callers holding an id the type system has not
 * narrowed to a `DomainId` — `CityStormView.neighborhood_id` is a plain `string` —
 * so copy never hand-rolls the cast or the fallback. Same graceful-degradation
 * contract as the city's `buildingName`: an unmapped id reads as itself rather than
 * blanking.
 */
export function neighborhoodLabel(neighborhoodId: string): string {
  return NEIGHBORHOOD_LABELS[neighborhoodId as DomainId] ?? neighborhoodId;
}

/** A distant, non-interactive district shown on the horizon (design §2.1). */
export interface LockedDistrict {
  domain: DomainId;
  label: string;
}

/**
 * Required nodes for a neighborhood: the in-product nodes (mvp + target) of that
 * domain, read from the registry (never hardcoded). For D1 this is the six MVP
 * nodes. Preserved from the original `isNeighborhoodReady` behavior.
 */
export function getRequiredNodeIds(domain: DomainId): readonly string[] {
  return getNodesByDomain(domain)
    .filter((node) => node.product_scope === "mvp" || node.product_scope === "target")
    .map((node) => node.id);
}

/**
 * A neighborhood is storm-ready only once every required node is mastered
 * (`mastery >= 2`). A missing state row counts as mastery 0. This is the storm
 * unlock gate (design §7.1) and never writes anything.
 *
 * The `mastery >= 2` gate is CORRECT under the test-out amendment and must not be
 * relaxed to `completion_status` or the derived build stage — two readers have now
 * mistaken it for a bug on the grounds that a tested-out learner is locked out of
 * the storm. They are not locked out, they are unfinished: test-out skips the
 * LESSON only, so a tested-out node completes at mastery 0 and its stars are still
 * earned by the practice. Gating on mastery is exactly what asks "has the practice
 * happened", which is the question the storm should be asking. Progression model:
 * `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §8.2; authority for the
 * gate itself: `docs/Mastery_Scoring_Spec.md` §5.
 */
export function isNeighborhoodReady(
  domain: DomainId,
  states: readonly StudentNodeState[],
): boolean {
  const requiredNodeIds = getRequiredNodeIds(domain);
  const stateByNode = new Map(states.map((state) => [state.node_id, state]));

  return (
    requiredNodeIds.length > 0 &&
    requiredNodeIds.every((nodeId) => (stateByNode.get(nodeId)?.mastery ?? 0) >= 2)
  );
}

/**
 * The other domains as distant locked districts (roadmap scenery). Derived from
 * the registry's in-product domains, excluding the active neighborhood.
 */
export function getLockedDistricts(
  activeDomain: DomainId = D1_NEIGHBORHOOD_ID,
): readonly LockedDistrict[] {
  // Sort by the numeric domain index (D2 < … < D9 < D10), not lexicographically
  // (a plain string sort would place "D10" before "D2").
  const domains = [...new Set(getProductNodes().map((node) => node.domain))]
    .filter((domain) => domain !== activeDomain)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  return domains.map((domain) => ({ domain, label: NEIGHBORHOOD_LABELS[domain] }));
}
