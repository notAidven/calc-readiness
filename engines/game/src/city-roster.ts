import {
  ERA_SEQUENCE,
  type EraDefinition,
  type EraId,
  eraNumber,
  getEraOrThrow,
  getNode,
  getProductNodes,
  type SkillNode,
} from "@cr/skill-graph";

import {
  getBuildingArchetype,
  getNeighborhoodDescriptor,
  type ResolvedPlot,
  resolveNeighborhood,
} from "./descriptors";
import type { PlotPosition } from "./plots";

/**
 * **WHICH NODES HOLD A CITY PLOT — the era roster, and the one rule that decides it.**
 *
 * The city held exactly six buildings for as long as its roster came from a DOMAIN:
 * `resolveNeighborhood(domain)` filters `getNodesByDomain(domain)` to
 * `product_scope === "mvp"`, and the registry's only `mvp` nodes are D1's six, so eras two
 * through ten each resolved to zero plots and no lesson outside era one had any route from
 * the island. This module is the roster the era model needs instead, and the era design
 * asks for exactly this restructure in as many words: §13's `descriptors.ts` row says the
 * registry has "to express **sequence and accumulation**, not ten parallel places".
 *
 * ## THE RULE: every node of the current era and of every era before it
 *
 * `cityRosterNodeIds(eraId)` is eras one..N inclusive, in play order. Three reasons, and
 * the third is the one that settles it against the two alternatives:
 *
 *  1. **The city accumulates and a building is never torn down.** A skill building is
 *     raised once, in the era it was raised in, and is never re-dressed or removed
 *     (§6.4a, and the re-dressing ruling of 2026-07-29). A roster that dropped an earlier
 *     era's nodes would contradict the freeze it exists to serve.
 *  2. **A later era's node has no business on an earlier era's island.** Era membership is
 *     the play order (INV-ERA-5), so offering era ten's trigonometry on era two's island
 *     would put a building in front of a learner ahead of the chapter that teaches it.
 *     That is what rules out "every node full stop".
 *  3. **The land budget was authored FOR this rule, so it is the only one the budgets
 *     fit.** D-ERA25's per-era radius is derived from a demand table whose every column is
 *     a RUNNING TOTAL — `packages/skill-graph/src/eras.ts` states it directly: *"era five's
 *     island must hold everything from eras one to five, not era five's own content"*. A
 *     roster rule other than cumulative would be sized against a budget built for a
 *     different roster. `apps/web/src/city/eraCityLand.test.ts` measures the fit, because
 *     the footprint table lives in `apps/` and this package may not import it.
 *
 * That also rules out "every node in an AUTHORED era", which is not a rule about the
 * product at all: it is a rule about which art has shipped, and it would move the roster
 * under a learner every time a model landed.
 *
 * ## The node set is the ERA's, and never a `DomainId`'s
 *
 * Era and domain are not 1:1 — three domains span eras and three eras hold several
 * domains — so the roster cannot be recovered from a domain (INV-ERA-5). `interleavedPool.ts`
 * made the same swap for the drill pool and records the same reasoning. Everything here
 * reads `ERA_SEQUENCE`; nothing transcribes a node id.
 *
 * ## What is STILL resolved per domain, and why that is not a contradiction
 *
 * A plot's building archetype and citizen role are authored per NEIGHBORHOOD, keyed by
 * node id (`descriptors.ts`), and that authoring is untouched: this module reads each
 * node's OWN domain descriptor for both, so D2's `RAD.4` placeholder and D10's `GEO.*`
 * placeholders resolve exactly as their authors intended the day they are filled in. The
 * era decides WHICH nodes stand; the descriptor still decides what each one is.
 *
 * ## The MVP fence is not widened, and the diagnostic is not touched
 *
 * `getNodesByScope("mvp")` stays the six-node D1 scope the live diagnostic is sized for
 * (§14 GC1 — a product decision, not an omission), and `resolveNeighborhood` keeps its
 * `mvp` filter and its fail-loud `populated`/`architected` fences. Nothing here reads
 * `product_scope`, so lifting the city's ceiling cannot move the diagnostic's.
 */

/** How many derived plots sit on one row of the fallback layout (see `plotPositionFor`). */
const DERIVED_LAYOUT_ROW_WIDTH = 8;

/**
 * The era a city stands in when no caller says otherwise — read off `ERA_SEQUENCE`'s first
 * entry rather than written down, so it cannot disagree with the authored play order
 * (INV-ERA-5). `apps/web/src/city/eraState.ts` defaults the live store to the same era from
 * the same array.
 */
export const FIRST_ERA_ID: EraId = (ERA_SEQUENCE[0] as EraDefinition).id;

/**
 * Every node id an era's city may hold: this era's nodes and every earlier era's, in play
 * order. Fail-loud on an unknown era through `getEraOrThrow`, so a typo can never resolve
 * to a plausible-looking six-building city.
 */
export function cityRosterNodeIds(eraId: EraId): readonly string[] {
  const position = eraNumber(getEraOrThrow(eraId).id);
  return ERA_SEQUENCE.slice(0, position).flatMap((era) => era.nodes);
}

/**
 * Node id -> the position its own neighborhood descriptor AUTHORS for it, resolved
 * through `resolveNeighborhood` rather than by re-reading `layout.plot_positions` — so the
 * authored layout stays the single source of truth and the resolver's desync fence still
 * fires. Only D1's six are authored today, which is why era one's plots do not move.
 */
let authoredPositionCache: ReadonlyMap<string, PlotPosition> | null = null;

function authoredPositions(): ReadonlyMap<string, PlotPosition> {
  if (authoredPositionCache === null) {
    authoredPositionCache = new Map(
      [...new Set(getProductNodes().map((node) => node.domain))].flatMap((domain) =>
        resolveNeighborhood(domain).plots.map(
          (plot) => [plot.node_id, plot.position] as const,
        ),
      ),
    );
  }
  return authoredPositionCache;
}

/**
 * A plot's descriptive isometric coordinate: the authored one when its neighborhood
 * authors one, else derived from its index among the roster's unauthored nodes.
 *
 * Derived coordinates sit on NEGATIVE rows, so they can never collide with an authored
 * one (every authored row today is >= 0) and uniqueness is a property of the construction
 * rather than a coincidence to test for.
 *
 * A DERIVED coordinate is not a layout decision sneaking in. The city has been free-build
 * since the placement feature shipped: a building stands where the player dropped it, at a
 * `PlacedTransform` in `apps/web/src/city/worldLayout.ts`, and no renderer reads
 * `ResolvedPlot.position` at all. Authoring 56 isometric coordinates would therefore be
 * writing down a map nothing draws, which is worse than deriving one — it would look like a
 * decision. What the field still owes is being TOTAL and unique per plot, which is all this
 * gives it.
 */
function plotPositionFor(nodeId: string, derivedIndex: number): PlotPosition {
  const authored = authoredPositions().get(nodeId);
  if (authored) {
    return authored;
  }
  return {
    col: derivedIndex % DERIVED_LAYOUT_ROW_WIDTH,
    row: -1 - Math.floor(derivedIndex / DERIVED_LAYOUT_ROW_WIDTH),
  };
}

/** The era's city, resolved: one plot per roster node, in play order. */
export interface ResolvedEraCity {
  readonly era: EraId;
  /** Plots in play order — era one's first, the current era's last. */
  readonly plots: readonly ResolvedPlot[];
}

/**
 * Compose an era's city from `ERA_SEQUENCE` + the per-domain descriptors. This is the
 * accumulation path `buildCityViewModel` resolves its buildings through; the domain path
 * (`resolveNeighborhood`) still owns the neighborhood's label, storm tuning and locked
 * districts, none of which is a property of the roster.
 *
 * Fail-loud fence, carried over from `resolveNeighborhood` rather than dropped (§13: "the
 * fail-loud fences are an asset and must survive the restructure"): a roster node the
 * registry does not know is a curation defect in `ERA_SEQUENCE`, so it throws instead of
 * silently shrinking the city. `eras.test.ts` already pins the ten sets as a partition of
 * the 62 in-product nodes, so this can only fire on an edit that breaks that.
 */
export function resolveEraCity(eraId: EraId): ResolvedEraCity {
  const rosterIds = cityRosterNodeIds(eraId);
  const rosterSet = new Set(rosterIds);
  let derivedIndex = 0;

  const plots: ResolvedPlot[] = rosterIds.map((nodeId) => {
    const node: SkillNode | undefined = getNode(nodeId);

    if (!node) {
      throw new Error(
        `Era "${eraId}" rosters node ${nodeId}, which the skill-graph registry does ` +
          `not contain. ERA_SEQUENCE's ten sets must partition the in-product nodes ` +
          `(INV-ERA-2); an unknown id is a curation defect, not a caller error.`,
      );
    }

    const descriptor = getNeighborhoodDescriptor(node.domain);
    const archetypeId =
      descriptor.building_archetypes[node.id] ?? descriptor.default_archetype;
    const citizenRole =
      descriptor.citizen_roles[node.id] ?? descriptor.default_citizen_role;
    const position = plotPositionFor(node.id, derivedIndex);
    if (!authoredPositions().has(node.id)) {
      derivedIndex += 1;
    }

    return {
      node_id: node.id,
      lesson_shell: node.lesson_shell,
      position,
      // Prereqs intersected with the ROSTER, not with one domain: a road into an era-two
      // building may legitimately come from an era-one one, and the domain intersection
      // could not express that.
      road_sources: node.prereqs.filter((prereq) => rosterSet.has(prereq)),
      archetype: getBuildingArchetype(archetypeId),
      citizen_role: citizenRole,
    };
  });

  return { era: eraId, plots };
}
