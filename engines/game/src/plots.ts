import type { DomainId } from "@cr/skill-graph";

import { type ResolvedPlot, resolveNeighborhood } from "./descriptors";
import { D1_NEIGHBORHOOD_ID } from "./neighborhood";

/**
 * Fixed-plot building accessors (pure, framework-free).
 *
 * Plots are now DERIVED through the generic descriptor path
 * (`resolveNeighborhood`, see `descriptors.ts`): the node set and prerequisite
 * "roads" come from the registry (`@cr/skill-graph`), and the isometric layout +
 * building archetype come from the neighborhood descriptor. A registry change to
 * a neighborhood's node set can therefore never silently desync the map — it
 * re-derives or throws. These accessors remain as thin, backward-compatible
 * wrappers over the resolver.
 */

/** Authored isometric grid coordinate for a plot. Not pixels; the renderer maps. */
export interface PlotPosition {
  readonly col: number;
  readonly row: number;
}

/**
 * A resolved plot. Retained as the historical `@cr/game` name; identical to a
 * `ResolvedPlot` (node id, lesson shell, authored position, registry-derived
 * roads, and the resolved building archetype).
 */
export type PlotDefinition = ResolvedPlot;

/**
 * The fixed plots for a neighborhood, resolved from its descriptor + the
 * registry. Throws (via the resolver) if the registry yields more plots than the
 * authored layout supports, so a desync fails loudly instead of rendering a
 * broken map.
 */
export function getNeighborhoodPlots(
  domain: DomainId = D1_NEIGHBORHOOD_ID,
): readonly PlotDefinition[] {
  return resolveNeighborhood(domain).plots;
}

/** Convenience accessor for the MVP D1 neighborhood plots. */
export function getD1Plots(): readonly PlotDefinition[] {
  return getNeighborhoodPlots(D1_NEIGHBORHOOD_ID);
}
