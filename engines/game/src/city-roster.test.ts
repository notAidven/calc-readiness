import {
  ERA_SEQUENCE,
  type EraId,
  getEraOfNode,
  getNodeOrThrow,
  getNodesByScope,
  getProductNodes,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { cityRosterNodeIds, FIRST_ERA_ID, resolveEraCity } from "./city-roster";
import { buildCityViewModel } from "./city-view-model";
import { resolveNeighborhood } from "./descriptors";

/**
 * **THE SIX-PLOT CEILING, AND THE TEST THAT FAILS IF IT COMES BACK.**
 *
 * The city's roster was permanently six buildings — era one's — because it came from a
 * DOMAIN: `resolveNeighborhood(domain)` filters to `product_scope === "mvp"`, the registry's
 * only `mvp` nodes are D1's six, and eras two to ten therefore resolved to ZERO plots each.
 * Measured before the lift, `buildCityViewModel()` returned six buildings for every era.
 *
 * Every population here is derived from `ERA_SEQUENCE`, never from a list written down in
 * this file. Era membership is authored data that has already moved once (#210 moved
 * `POL.6`, `POL.7` and `RAT.5` between eras), so a transcribed roster would be a second
 * opinion waiting to go stale — and a guard whose population is hardcoded passes while
 * covering a fraction of reality.
 */

/** The ten eras, in play order, read off the authored sequence. */
const ERA_IDS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/** How many buildings the view model actually composes for an era. */
function rosterSize(eraId: EraId): number {
  return buildCityViewModel({ node_states: [], era_id: eraId }).buildings.length;
}

describe("the era roster is cumulative — this era's nodes and every earlier era's", () => {
  it("is exactly the concatenation of eras one..N, in play order", () => {
    // Both directions: the roster is re-derived from the sequence here, and the sequence is
    // re-derived from the rosters below, so neither can drift into agreeing by accident.
    let cumulative: string[] = [];
    for (const era of ERA_SEQUENCE) {
      cumulative = [...cumulative, ...era.nodes];
      expect(cityRosterNodeIds(era.id), era.id).toEqual(cumulative);
    }
    // The other direction: era N's roster minus era N-1's is exactly era N's own nodes.
    for (let i = 1; i < ERA_SEQUENCE.length; i += 1) {
      const era = ERA_SEQUENCE[i] as (typeof ERA_SEQUENCE)[number];
      const previous = ERA_SEQUENCE[i - 1] as (typeof ERA_SEQUENCE)[number];
      const added = cityRosterNodeIds(era.id).slice(cityRosterNodeIds(previous.id).length);
      expect(added, era.id).toEqual([...era.nodes]);
    }
    expect(ERA_IDS).toHaveLength(10);
  });

  it("rosters every in-product node by era ten, dropping none and duplicating none", () => {
    const last = ERA_IDS[ERA_IDS.length - 1] as EraId;
    const roster = cityRosterNodeIds(last);
    // Set equality against the registry, not a count: a roster that dropped one node and
    // duplicated another would satisfy a length check.
    expect([...roster].sort()).toEqual(
      getProductNodes()
        .map((node) => node.id)
        .sort(),
    );
    expect(new Set(roster).size).toBe(roster.length);
  });

  it("fails loud on an era nobody authored, rather than resolving to era one's six", () => {
    expect(() => cityRosterNodeIds("atlantean" as EraId)).toThrow(/Unknown era/);
    expect(() => resolveEraCity("atlantean" as EraId)).toThrow(/Unknown era/);
  });

  it("defaults to era one, read off the sequence rather than written down", () => {
    expect(FIRST_ERA_ID).toBe((ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id);
    expect(cityRosterNodeIds(FIRST_ERA_ID)).toEqual([
      ...(ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).nodes,
    ]);
  });
});

describe("the roster does NOT collapse back to era one's six", () => {
  it("gives every era a roster the size of its own accumulation", () => {
    const derived = ERA_SEQUENCE.map((era, index) => ({
      era: era.id,
      buildings: ERA_SEQUENCE.slice(0, index + 1).reduce(
        (total, entry) => total + entry.nodes.length,
        0,
      ),
    }));

    for (const row of derived) {
      expect(rosterSize(row.era), row.era).toBe(row.buildings);
    }
    // Named per era, so the numbers are legible in the report rather than only derivable.
    // Regenerate this from the sequence if era membership moves; it is a transcript of the
    // derivation above, and the loop is what actually holds it.
    expect(derived.map((row) => row.buildings)).toEqual([
      6, 11, 16, 21, 26, 32, 38, 47, 53, 62,
    ]);
  });

  it("is strictly bigger than era one's six for all NINE later eras", () => {
    // THE COLLAPSE ASSERTION. If the roster ever resolves from a domain again — or from
    // `product_scope`, or from any other six-node source — every one of these nine goes to
    // 6 and this fails. The floor is what stops a shrunken population passing it.
    const eraOne = rosterSize(FIRST_ERA_ID);
    expect(eraOne).toBe(6);
    const later = ERA_IDS.filter((eraId) => eraId !== FIRST_ERA_ID);
    expect(later).toHaveLength(9);
    for (const eraId of later) {
      expect(rosterSize(eraId), `${eraId} collapsed to era one's roster`).toBeGreaterThan(
        eraOne,
      );
    }
    // And monotone: an era never holds fewer buildings than the era before it, because
    // nothing is ever torn down (§6.4a).
    const sizes = ERA_IDS.map((eraId) => rosterSize(eraId));
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i] as number, ERA_IDS[i]).toBeGreaterThanOrEqual(sizes[i - 1] as number);
    }
  });

  it("holds nodes from every era up to the current one, not just more of era one's", () => {
    // Composition, not size: a roster that padded era one's six with duplicates, or with
    // 56 copies of one node, would satisfy the counts above. This asks which ERAS are
    // represented, which is the claim.
    for (const [index, era] of ERA_SEQUENCE.entries()) {
      const eras = new Set(
        cityRosterNodeIds(era.id).map((nodeId) => getEraOfNode(nodeId)?.id),
      );
      expect(eras.size, era.id).toBe(index + 1);
      expect(eras.has(era.id), `${era.id} rosters its own nodes`).toBe(true);
    }
  });

  it("spans more than one domain from era two on, so it cannot be domain-derived", () => {
    // Era and domain are not 1:1 (INV-ERA-5). A roster still recoverable from a single
    // `DomainId` would be the old ceiling wearing a new name.
    const spans = ERA_IDS.filter(
      (eraId) =>
        new Set(cityRosterNodeIds(eraId).map((id) => getNodeOrThrow(id).domain)).size > 1,
    );
    expect(spans).toEqual(ERA_IDS.filter((eraId) => eraId !== FIRST_ERA_ID));
    expect(spans).toHaveLength(9);
    // Era one alone is single-domain, which is why the old defect was invisible.
    expect(
      new Set(cityRosterNodeIds(FIRST_ERA_ID).map((id) => getNodeOrThrow(id).domain)),
    ).toEqual(new Set(["D1"]));
  });

  it("draws roads across the era boundary, not only inside one domain", () => {
    // `road_sources` is prereqs intersected with the ROSTER. Under the old domain
    // intersection a prereq in another domain was silently dropped, so this is the
    // assertion that the intersection widened with the roster.
    const last = ERA_IDS[ERA_IDS.length - 1] as EraId;
    const crossing = resolveEraCity(last).plots.flatMap((plot) =>
      plot.road_sources
        .filter((from) => getEraOfNode(from)?.id !== getEraOfNode(plot.node_id)?.id)
        .map((from) => `${from}->${plot.node_id}`),
    );
    expect(crossing.length).toBeGreaterThan(10);
    // Same fact, per plot rather than in aggregate: every road source is on the roster.
    const roster = new Set(cityRosterNodeIds(last));
    for (const plot of resolveEraCity(last).plots) {
      for (const from of plot.road_sources) {
        expect(roster.has(from), `${from} -> ${plot.node_id}`).toBe(true);
      }
    }
  });
});

describe("what the lift did NOT widen", () => {
  it("leaves the MVP scope at six, which is the live diagnostic's population", () => {
    // The city and the diagnostic used to share `getNodesByScope("mvp")` as their node
    // list. The city's roster is now the era's; the diagnostic's scope is untouched, and
    // the two are no longer the same question (era design §14 GC1 — D1-only is a product
    // decision). If the city's ceiling had been lifted by widening `product_scope`
    // instead, this would be 62 and the diagnostic would have silently grown with it.
    expect(getNodesByScope("mvp")).toHaveLength(6);
    expect([...cityRosterNodeIds(FIRST_ERA_ID)].sort()).toEqual(
      getNodesByScope("mvp")
        .map((node) => node.id)
        .sort(),
    );
  });

  it("leaves the domain resolver's own fences and node set exactly as they were", () => {
    // `resolveNeighborhood` still resolves a DOMAIN's `mvp` nodes and still fails loud on
    // the populated/architected distinction. That path now feeds the label, status, storm
    // and districts rather than the roster, and none of that was the defect.
    expect(resolveNeighborhood("D1").plots).toHaveLength(6);
    expect(resolveNeighborhood("D1").status).toBe("populated");
    for (const domain of ["D2", "D5", "D10"] as const) {
      expect(resolveNeighborhood(domain).plots, domain).toHaveLength(0);
      expect(resolveNeighborhood(domain).status, domain).toBe("architected");
    }
  });

  it("keeps era one's six on the positions their descriptor authors", () => {
    // The lift moves no plot the game already had: era one's coordinates come from D1's
    // authored layout, through the resolver that owns it.
    const authored = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot.position]),
    );
    for (const plot of resolveEraCity(FIRST_ERA_ID).plots) {
      expect(plot.position, plot.node_id).toEqual(authored.get(plot.node_id));
    }
    // Every plot in the widest roster still has a unique coordinate — derived plots sit on
    // negative rows so they cannot collide with the authored ones.
    const last = ERA_IDS[ERA_IDS.length - 1] as EraId;
    const keys = resolveEraCity(last).plots.map(
      (p) => `${p.position.col},${p.position.row}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(62);
  });

  it("resolves an archetype and a citizen role for every plot in every era", () => {
    // The descriptor still decides what a building IS; the era only decides that it
    // stands. An era whose nodes fell through to no descriptor entry would surface here as
    // a missing label rather than as a silently role-less building (D-CIT12).
    for (const eraId of ERA_IDS) {
      for (const plot of resolveEraCity(eraId).plots) {
        expect(plot.archetype.label.length, `${eraId}/${plot.node_id}`).toBeGreaterThan(0);
        expect(["residence", "school", "civic"], `${eraId}/${plot.node_id}`).toContain(
          plot.citizen_role,
        );
      }
    }
  });
});
