/**
 * ERA REACHABILITY — the guard that an era's lessons are WIRED INTO THE CITY, not merely
 * authored somewhere in the tree.
 *
 * ## The defect, and why the existing guards could not see it
 *
 * `lessonDomains.reachability.test.ts` exists because D2 shipped fully authored with zero
 * importers. It fixed the LESSON half: every pack is registered, dispatches to its own
 * practice pool, and builds a gradable set. Era two passed every line of it while being
 * completely unreachable from the city — no building name, so `resolveBuildingModel` answered
 * `null` and the lot drew an empty pad; no dressing row, so its buildings announced as bare
 * mass handles; no roster entry, because `buildCityViewModel` drew its buildings from
 * `resolveNeighborhood`, which filters on `product_scope: "mvp"`. A learner could not click a
 * building that was not there.
 *
 * **Every suite in the tree iterated era one**, which is the emptiness this file is written
 * against. `eraTwoCivicModels.test.ts` makes the same argument for the four bought civic
 * buildings and says so in its own header; this is the SKILL half of it.
 *
 * ## The population is derived from the era model, and it is wider than era two
 *
 * The behaviour is "a lesson a learner can be taught must be reachable as a building in the
 * city". That is a fact about any era with authored content, not about era two, so the
 * population is every (era, node) pair in `ERA_SEQUENCE` — read from `getEraNodes`, never from
 * a written-down list of five ids — and the requirements are layered by what each pair
 * genuinely owes:
 *
 *  1. **Roster resolution** is owed by ALL ten eras: an era must be able to say which
 *     buildings it puts in the city. No exceptions, no list.
 *  2. **Lesson + practice reachability** is owed by every pair whose pack exists, derived by
 *     intersecting the era model with `lessonByNode`.
 *  3. **A dressing** is owed by every era whose ratified COPY has landed — nine
 *     eras now, with Early Modern still open — and **a bundled model** is owed
 *     by every era whose ART has landed, also nine. The property-specific exception lists are
 *     asserted in both directions rather than quietly filtered out. See
 *     {@link ART_UNAUTHORED_ERAS} and {@link COPY_UNAUTHORED_ERAS}, and the banner above them
 *     for the measurement that forced the split.
 *
 * Every count below is a FLOOR under a derived figure, and where the claim is about
 * composition rather than size the composition is asserted too: it is not enough that either
 * authored population be large, each has to be more than the layers it used to stop at —
 * era three is now required on both sides — or this file would be the narrow sweep it was
 * written to stop being.
 *
 * ## AND IT ASSERTS THAT NOTHING WAS PROMOTED
 *
 * The registry is a frozen cross-lane surface. Era two is reachable here through the era
 * ROSTER seam (`era_id` → `cityRosterNodeIds`, #311 — this era's nodes and every earlier
 * era's) and NOT by flipping `product_scope`, so this file also pins the MVP scope at six and
 * D2 at zero plots. It was written against the earlier `expansion_era` seam, which #311
 * replaced with the cumulative one; the assertions did not move, because "era two's buildings
 * are reachable without promoting anything" is a claim about the product rather than about
 * which of the two seams delivers it. Those assertions fail if a later change
 * takes the shortcut, which is the point: the shortcut is another lane's call to make.
 *
 * Node-only (no jsdom), collected by the root `web-reachability` project, so it proves the
 * wiring without any DOM standing in for it.
 */

import { buildCityViewModel, resolveEraPlots, resolveNeighborhood } from "@cr/game";
import {
  ERA_SEQUENCE,
  type EraId,
  getEraNodes,
  getEraOfNode,
  getEraOrderedNodes,
  getNodesByScope,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { SKILL_SOURCE_TITLES, skillDisplayName } from "../diagnostic/skillNames";
import { lessonByNode, practiceSourceForNode } from "../lessons/domains";
import {
  ADVISOR_MOODS,
  advisorNameForEra,
  advisorPose,
  advisorPosesForEra,
  ERA_ADVISOR_POSES,
  eraIdsWithRatifiedAdvisor,
} from "../lessons/eraAdvisor";
import {
  buildingName,
  MODEL_STAGES,
  nodeModelUrls,
  resolveBuildingModel,
} from "./buildingAssets";
import {
  buildingDisplayName,
  buildingSubtitle,
  continuousAdvisorName,
  ERA_ADVISORS,
  ERA_DRESSINGS,
} from "./eraDressing";
import { TOWN_HALL_ID } from "./townHall";

/** Every era id in play order, derived from the authored sequence. */
const ERA_IDS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id);

/** One (era, node) pair per building the era model places. 62 today, derived. */
const ERA_NODE_PAIRS: readonly {
  readonly era: EraId;
  readonly node: string;
}[] = ERA_SEQUENCE.flatMap((era) => era.nodes.map((node) => ({ era: era.id, node })));

/**
 * ## ⚑ REQUIREMENT 3 IS TWO REQUIREMENTS, AND ERA THREE IS WHAT PROVED IT
 *
 * There was ONE exception list here, and it excused an era from three properties at once: a
 * stable building name, a dressing subtitle, and three bundled GLBs per node. That held while
 * every mapped era had all three — eras one and two each arrived with their art — so the list
 * never had to say which property it was excusing.
 *
 * **Era three arrived with two of the three.** Its ratified subtitle row and its five stable
 * names landed on 2026-07-31; its art has not been drawn and is not owed by that change. So
 * the era belonged in neither half of the old split, and MEASURED at that tip it failed both
 * ways: left on the list, *"bronze_age now has a dressing row and must leave the exception
 * list"*; moved off it, eleven failures, five of them *"LIN.n falls back to a procedural site:
 * expected 'site' to be 'glb'"*. Neither failure was wrong. **The guard was scoped to a bundle
 * of properties rather than to a behaviour**, which is the trap `.cursor/rules/qa-verification.mdc`
 * describes, and the fix is to name the two behaviours separately rather than to pick whichever
 * failure was quieter.
 *
 * The two lists are NESTED and the nesting is asserted, because art cannot be reached without a
 * name: `resolveBuildingModel` gates its GLB lookup on the same `NODE_BUILDINGS` that
 * `buildingName` reads, so an era with drawn buildings necessarily has named ones. Era three
 * was the strict-subset witness until its art landed; the two populations now coincide, while
 * the property-specific both-way checks below keep them separate claims.
 */

/**
 * THE ERAS WITH NO EXPORTED SKILL ART — the named exception to the DRAWABLE half of requirement
 * 3, each with the reason it does not owe a bundled model.
 *
 * Early Modern genuinely does not owe it: there is not one GLB for any of its nodes in
 * the live model registry. An era that
 * does not owe the property and an era that FORGOT it look identical from outside this guard, so
 * they are named here rather than filtered away — and the list is asserted BOTH ways below:
 *
 *   - an era on this list whose nodes have acquired ANY bundled stage FAILS, so a first art drop
 *     cannot land without this declaration being updated; and
 *   - an era NOT on this list owes all three stages for every node it introduces.
 *
 * This exception remains scoped to ART: it does not excuse roster, lesson, or practice wiring.
 */
const ART_UNAUTHORED_ERAS: Readonly<Record<string, string>> = {
  renaissance: "no geo-*/cg-* GLB in art/models/; style guide art is PROPOSED",
};

/**
 * THE ERAS WHOSE BUILDINGS HAVE NO RATIFIED DRESSING — the named exception to the DRESSED
 * half of requirement 3.
 *
 * Early Modern genuinely does not owe it: its style guide's subtitle row is still marked
 * **PROPOSED** and dresses its masses as lower-case descriptive prose ("the parterre court"), so
 * wiring them would ship unratified strings into the accessible name — `eraDressing.ts`' header
 * argues that at length and it is the bar the whole table is held to. Asserted both ways:
 *
 *   - an era on this list that has acquired a dressing row or a named building FAILS, which is
 *     what fired at `bronze_age` and is how this second list came to exist; and
 *   - an era NOT on this list owes a stable name and a dressing subtitle for every node it
 *     introduces, whether or not anybody has drawn it.
 *
 * `bronze_age` is absent because both its ratified copy and its exported art have landed.
 * The lists therefore coincide today, but remain separately asserted against their own
 * behaviour so the next named-before-drawn era can separate them again.
 */
const COPY_UNAUTHORED_ERAS: Readonly<Record<string, string>> = {
  renaissance: "subtitle row is PROPOSED lower-case prose, not ratified proper nouns",
};

/** The eras held to the DRAWABLE half — everything not excused for art. */
const ART_AUTHORED_ERAS: readonly EraId[] = ERA_IDS.filter(
  (eraId) => !(eraId in ART_UNAUTHORED_ERAS),
);

/** The eras held to the NAMED AND DRESSED half — everything not excused for copy. */
const COPY_AUTHORED_ERAS: readonly EraId[] = ERA_IDS.filter(
  (eraId) => !(eraId in COPY_UNAUTHORED_ERAS),
);

/** The pairs held to the DRAWABLE half. */
const ART_AUTHORED_PAIRS = ERA_NODE_PAIRS.filter((pair) =>
  ART_AUTHORED_ERAS.includes(pair.era),
);

/** The pairs held to the NAMED AND DRESSED half. */
const COPY_AUTHORED_PAIRS = ERA_NODE_PAIRS.filter((pair) =>
  COPY_AUTHORED_ERAS.includes(pair.era),
);

/** The pairs whose lesson pack exists — requirement 2's population. */
const TAUGHT_PAIRS = ERA_NODE_PAIRS.filter((pair) => lessonByNode[pair.node] !== undefined);

/* -------------------------------------------------------------------------- */
/* 1. Every era can say which buildings it puts in the city                    */
/* -------------------------------------------------------------------------- */

describe("every era resolves its own skill roster", () => {
  it("resolves one plot per authored node, in the era's own order, for all ten eras", () => {
    // Floor AND shape: the sweep covers the whole era model, not a slice of it.
    expect(ERA_IDS.length).toBe(ERA_SEQUENCE.length);
    expect(ERA_IDS.length).toBeGreaterThanOrEqual(10);

    let resolved = 0;
    for (const eraId of ERA_IDS) {
      const plots = resolveEraPlots(eraId);
      expect(
        plots.map((plot) => plot.node_id),
        `${eraId} resolves a different roster from its authored node set`,
      ).toEqual([...getEraNodes(eraId)]);
      for (const plot of plots) {
        expect(plot.archetype.id, `${plot.node_id} has no archetype`).toBeTruthy();
        expect(plot.citizen_role, `${plot.node_id} has no citizen role`).toBeTruthy();
      }
      resolved += plots.length;
    }

    // Floor under the whole sweep: an era model that lost its nodes would pass every
    // per-era line above over ten empty rosters.
    expect(resolved).toBe(getEraOrderedNodes().length);
    expect(resolved).toBeGreaterThanOrEqual(62);
  });

  it("scopes a plot's roads-in to its OWN era, not to the whole prereq graph", () => {
    // RAD.2's only prereq is RAD.1, which era two also holds -> an in-era road.
    // EXP.1's only prereq is NUM.4, which is era ONE's -> a building already standing,
    // never a road this chapter draws. Both are read from the era model, not asserted
    // as literals about the registry.
    const plots = resolveEraPlots("neolithic");
    const byNode = new Map(plots.map((plot) => [plot.node_id, plot]));
    const eraTwo = new Set(getEraNodes("neolithic"));

    let inEra = 0;
    for (const plot of plots) {
      for (const source of plot.road_sources) {
        expect(eraTwo.has(source), `${plot.node_id} draws a road from another era`).toBe(
          true,
        );
        inEra += 1;
      }
    }
    // Floor: era two really does have in-era edges, so the containment above is not
    // holding trivially over an empty set.
    expect(inEra).toBeGreaterThanOrEqual(2);
    expect(byNode.get("EXP.1")?.road_sources).toEqual([]);
  });

  it("derives a plot position rather than reading an authored isometric layout", () => {
    // D-ERA1 retired the isometric plot grid and D2's descriptor authors none, so this
    // field is index-derived and inert. Pinned so nobody mistakes it for a layout.
    expect(resolveEraPlots("neolithic").map((plot) => plot.position)).toEqual(
      getEraNodes("neolithic").map((_node, index) => ({ col: index, row: 0 })),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Era two's buildings reach the city's ONE roster, through the shared model */
/* -------------------------------------------------------------------------- */

describe("era two's buildings join the city roster through the shared view model", () => {
  const mvpNodeIds = getNodesByScope("mvp").map((node) => node.id);
  const eraTwoNodeIds = getEraNodes("neolithic");

  it("offers the MVP roster alone when no expansion era is asked for", () => {
    const model = buildCityViewModel({ node_states: [] });
    expect(model.buildings.map((building) => building.node_id)).toEqual(mvpNodeIds);
    // Floor: the MVP roster is non-empty, so "equals the MVP roster" is a real claim.
    expect(mvpNodeIds.length).toBeGreaterThanOrEqual(6);
  });

  it("offers the MVP roster PLUS era two's when asked for era two", () => {
    const model = buildCityViewModel({ node_states: [], era_id: "neolithic" });
    expect(model.buildings.map((building) => building.node_id)).toEqual([
      ...mvpNodeIds,
      ...eraTwoNodeIds,
    ]);
    // Floor and shape: era two contributes a real, non-empty set that is DISJOINT from
    // the MVP one, so the assertion above cannot be satisfied by a no-op expansion.
    expect(eraTwoNodeIds.length).toBeGreaterThanOrEqual(5);
    expect(eraTwoNodeIds.filter((id) => mvpNodeIds.includes(id))).toEqual([]);
  });

  it("gives every era-two building a construction state and a mastery read", () => {
    const model = buildCityViewModel({ node_states: [], era_id: "neolithic" });
    const byNode = new Map(model.buildings.map((building) => [building.node_id, building]));
    for (const nodeId of eraTwoNodeIds) {
      const building = byNode.get(nodeId);
      expect(building, `${nodeId} is not in the roster`).toBeDefined();
      // The same reducer era one's buildings go through — a fresh node is untouched.
      expect(building?.construction_state).toBe("not_started");
      expect(building?.mastery).toBe(0);
      expect(building?.complete).toBe(false);
    }
  });

  it("is a no-op when the expansion era IS the MVP era (no doubled building)", () => {
    const model = buildCityViewModel({
      node_states: [],
      era_id: "prehistoric",
    });
    expect(model.buildings.map((building) => building.node_id)).toEqual(mvpNodeIds);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Nothing was promoted: the frozen registry is untouched                    */
/* -------------------------------------------------------------------------- */

describe("era two is reachable WITHOUT a registry scope change", () => {
  it("leaves the MVP scope at six", () => {
    expect(getNodesByScope("mvp")).toHaveLength(6);
  });

  it("leaves every era-two node at target scope", () => {
    const targetIds = new Set(getNodesByScope("target").map((node) => node.id));
    const eraTwoNodeIds = getEraNodes("neolithic");
    // Floor first: the loop below is vacuous over an empty era.
    expect(eraTwoNodeIds.length).toBeGreaterThanOrEqual(5);
    for (const nodeId of eraTwoNodeIds) {
      expect(targetIds.has(nodeId), `${nodeId} is no longer target scope`).toBe(true);
    }
  });

  it("leaves D2 resolving to zero plots as an architected slot", () => {
    const resolved = resolveNeighborhood("D2");
    expect(resolved.status).toBe("architected");
    expect(resolved.plots).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. A taught lesson reaches practice — over the era model's population        */
/* -------------------------------------------------------------------------- */

describe("every era's taught nodes reach a lesson and a practice pool", () => {
  it("covers more than one era's worth of taught nodes", () => {
    const taughtEras = new Set(TAUGHT_PAIRS.map((pair) => pair.era));
    // Floor on size and on SHAPE: taught content spans several eras, and removing era
    // one still leaves a real population, so this is not the era-one sweep again.
    expect(TAUGHT_PAIRS.length).toBeGreaterThanOrEqual(26);
    expect(taughtEras.size).toBeGreaterThanOrEqual(4);
    expect(
      TAUGHT_PAIRS.filter((pair) => pair.era !== "prehistoric").length,
    ).toBeGreaterThanOrEqual(20);
  });

  for (const { era, node } of TAUGHT_PAIRS) {
    it(`${era}/${node} has a paged mini-lesson and a practice pool`, () => {
      const lesson = lessonByNode[node];
      expect(lesson).toBeDefined();
      // The paged, advisor-led path needs pages to page through.
      expect(lesson?.mini_lesson.length ?? 0).toBeGreaterThan(0);
      expect(practiceSourceForNode(node).nodeId).toBe(node);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* 5. Requirement 3, and its exception list, both directions                    */
/* -------------------------------------------------------------------------- */

describe("the two unauthored exception lists fail both ways", () => {
  it("names only eras that exist in the authored sequence", () => {
    for (const list of [ART_UNAUTHORED_ERAS, COPY_UNAUTHORED_ERAS]) {
      for (const eraId of Object.keys(list)) {
        expect(
          ERA_IDS,
          `${eraId} is a declared exception for an era that is gone`,
        ).toContain(eraId);
      }
    }
  });

  it("does not excuse an era whose ART has quietly landed", () => {
    for (const [eraId, reason] of Object.entries(ART_UNAUTHORED_ERAS)) {
      expect(reason.length, `${eraId} is excused with no reason`).toBeGreaterThan(10);
      for (const nodeId of getEraNodes(eraId as EraId)) {
        // Read off the BUNDLE, not off the name map — those two came apart when era three
        // was named without being drawn, and this list is about the bundle.
        expect(
          nodeModelUrls(nodeId),
          `${eraId}'s ${nodeId} now has bundled art and must leave the art exception list`,
        ).toHaveLength(0);
        for (const stage of MODEL_STAGES) {
          expect(
            resolveBuildingModel(nodeId, stage).kind,
            `${eraId}'s ${nodeId} now resolves a GLB at ${stage}`,
          ).not.toBe("glb");
        }
      }
    }
  });

  it("does not excuse an era whose COPY has quietly landed", () => {
    for (const [eraId, reason] of Object.entries(COPY_UNAUTHORED_ERAS)) {
      expect(reason.length, `${eraId} is excused with no reason`).toBeGreaterThan(10);
      expect(
        ERA_DRESSINGS[eraId as EraId],
        `${eraId} now has a dressing row and must leave the copy exception list`,
      ).toBeUndefined();
      for (const nodeId of getEraNodes(eraId as EraId)) {
        if (buildingName(nodeId) !== nodeId) {
          expect(
            resolveBuildingModel(nodeId, "built").kind,
            `${eraId}'s ${nodeId} has a stable handle without model art`,
          ).toBe("glb");
        }
      }
    }
  });

  /**
   * THE TWO LISTS ARE GENUINELY TWO, and this is where that is proved rather than asserted in
   * prose. Nesting plus a non-empty difference: an era can be undrawn while named, but it
   * cannot be drawn while unnamed, because `resolveBuildingModel` gates the GLB lookup on the
   * same record `buildingName` reads. Collapse the two lists back into one and the difference
   * empties and this fails.
   */
  it("keeps art and copy exceptions aligned after Industrial's ratified row lands", () => {
    const namedButUndrawn = Object.keys(ART_UNAUTHORED_ERAS).filter(
      (eraId) => !(eraId in COPY_UNAUTHORED_ERAS),
    );
    expect(namedButUndrawn).toEqual([]);
    const drawnButUndressed = Object.keys(COPY_UNAUTHORED_ERAS).filter(
      (eraId) => !(eraId in ART_UNAUTHORED_ERAS),
    );
    expect(drawnButUndressed).toEqual([]);
    expect(Object.keys(COPY_UNAUTHORED_ERAS).sort()).toEqual(
      Object.keys(ART_UNAUTHORED_ERAS).sort(),
    );
  });

  it("has not grown until it swallowed the population", () => {
    // Disjointness of each list against its own authored side, then floors on BOTH the size
    // and the composition of what is left.
    expect(ART_AUTHORED_ERAS.filter((eraId) => eraId in ART_UNAUTHORED_ERAS)).toEqual([]);
    expect(COPY_AUTHORED_ERAS.filter((eraId) => eraId in COPY_UNAUTHORED_ERAS)).toEqual([]);

    const expectedAuthoredEras = ERA_IDS.filter((eraId) => eraId !== "renaissance");
    expect(ART_AUTHORED_ERAS).toEqual(expectedAuthoredEras);
    expect(ART_AUTHORED_ERAS).toHaveLength(9);
    expect(ART_AUTHORED_PAIRS).toHaveLength(56);
    // Shape as well as size: all three late-era cohorts are inside the art sweep.
    expect(
      new Set(
        ART_AUTHORED_PAIRS.filter((pair) =>
          ["atomic_age", "information_age", "cyberpunk"].includes(pair.era),
        ).map((pair) => pair.era),
      ),
    ).toEqual(new Set(["atomic_age", "information_age", "cyberpunk"]));

    expect(ART_AUTHORED_ERAS).toEqual(COPY_AUTHORED_ERAS);
    expect(COPY_AUTHORED_PAIRS).toHaveLength(56);
    expect(COPY_AUTHORED_PAIRS.map((pair) => pair.node)).toEqual(
      ART_AUTHORED_PAIRS.map((pair) => pair.node),
    );
  });

  for (const { era, node } of COPY_AUTHORED_PAIRS) {
    it(`${era}/${node} is named and dressed`, () => {
      expect(buildingName(node), `${node} has no stable name`).not.toBe(node);
      const subtitle = buildingSubtitle(node, era);
      expect(subtitle, `${node} has no dressing subtitle`).not.toBeNull();
      expect(buildingDisplayName(node, era)).toBe(`${buildingName(node)}, ${subtitle}`);
      // The defect this closes for era three: a build card headlined with the raw registry
      // id. Asserted on the composed name, which is the string a learner and a screen reader
      // actually get.
      expect(buildingDisplayName(node, era), `${node} announces its registry id`).not.toBe(
        node,
      );
    });
  }

  for (const { era, node } of ART_AUTHORED_PAIRS) {
    it(`${era}/${node} is drawable`, () => {
      for (const stage of MODEL_STAGES) {
        const model = resolveBuildingModel(node, stage);
        expect(model, `${node} resolves no model at ${stage}`).not.toBeNull();
        expect(model?.kind, `${node} falls back to a procedural ${stage}`).toBe("glb");
        expect(model?.url, `${node} has no bundled url at ${stage}`).toBeTruthy();
      }
      // Drawable implies named, which is the nesting above expressed per pair.
      expect(buildingName(node), `${node} is drawn but unnamed`).not.toBe(node);
    });
  }

  /**
   * AN UNDRAWN BUILDING STILL DRAWS SOMETHING. Scope this by the live art behaviour rather
   * than by the exception's implementation: every node with zero bundled stages must resolve
   * the shared procedural phase rather than an empty pad.
   */
  it("falls the exact six Early Modern art gaps closed to the shared procedural shell", () => {
    const undrawn = ERA_NODE_PAIRS.filter((pair) => nodeModelUrls(pair.node).length === 0);
    const earlyModern = getEraNodes("renaissance");
    // Floor, exact composition, and the exception list in both directions.
    expect(undrawn).toHaveLength(6);
    expect(undrawn.map((pair) => pair.node)).toEqual([...earlyModern]);
    expect(new Set(undrawn.map((pair) => pair.era))).toEqual(new Set(["renaissance"]));
    expect([...new Set(undrawn.map((pair) => pair.era))].sort()).toEqual(
      Object.keys(ART_UNAUTHORED_ERAS).sort(),
    );
    for (const { node } of undrawn) {
      for (const stage of MODEL_STAGES) {
        const model = resolveBuildingModel(node, stage);
        expect(model.kind, `${node} at ${stage}`).toBe(model.modelStage);
        expect(model.url, `${node} at ${stage}`).toBeNull();
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 6. A skill building's dressing is its OWN era's, in every live era           */
/* -------------------------------------------------------------------------- */

describe("a skill building keeps the dressing it was raised in", () => {
  it("announces the same name whichever era the city is wearing", () => {
    // This is the defect era two's row made live: keyed on the LIVE era, era one's six
    // lost their dressings the moment a second row existed, so `NUM.2` announced bare
    // "Dwellings" in era two and dropped "Hut Cluster".
    let checked = 0;
    // OVER THE DRESSED POPULATION, NOT THE DRAWN ONE. This swept `ART_AUTHORED_PAIRS` while
    // the two coincided; a dressing that does not move with the live era is a claim about
    // `ERA_DRESSINGS`, so its population is every era whose copy has landed — which is now
    // strictly wider, and era three's five would have sat outside a sweep scoped to art.
    for (const { node } of COPY_AUTHORED_PAIRS) {
      const own = getEraOfNode(node)?.id;
      expect(own, `${node} is in no era`).toBeDefined();
      const expected = buildingDisplayName(node, own as EraId);
      for (const liveEra of ERA_IDS) {
        expect(
          buildingDisplayName(node, liveEra),
          `${node} announces differently while the city wears ${liveEra}`,
        ).toBe(expected);
        checked += 1;
      }
    }
    // Floor: sixteen buildings across ten live eras.
    expect(checked).toBeGreaterThanOrEqual(160);
  });

  it("still re-themes the HUB, which is the one building that does", () => {
    // The exception that makes the rule above load-bearing rather than a blanket freeze.
    expect(buildingDisplayName(TOWN_HALL_ID, "prehistoric")).not.toBe(
      buildingDisplayName(TOWN_HALL_ID, "neolithic"),
    );
    expect(buildingSubtitle(TOWN_HALL_ID, "prehistoric")).toBe("Stone Circle");
    expect(buildingSubtitle(TOWN_HALL_ID, "neolithic")).toBe("the Elders' Hearth");
  });

  it("announces every standing building distinctly, hub included", () => {
    // Under the re-dressing ruling every authored era stands on the island together, so the
    // ANNOUNCED names (not the mass handles, which repeat by design) must be unique. The
    // population is the DRESSED one: era three's five stand beside eras one and two whether or
    // not anybody has drawn them, and `eraDressing.ts`' header makes cross-run uniqueness a
    // property of the announced name for exactly that reason.
    const announced = [
      ...COPY_AUTHORED_PAIRS.map((pair) => buildingDisplayName(pair.node, pair.era)),
      ...COPY_AUTHORED_ERAS.map((eraId) => buildingDisplayName(TOWN_HALL_ID, eraId)),
    ];
    expect(new Set(announced).size).toBe(announced.length);
    expect(announced.length).toBeGreaterThanOrEqual(19);
  });
});

/* -------------------------------------------------------------------------- */
/* 6b. No reachable building shows a raw registry id                            */
/* -------------------------------------------------------------------------- */

describe("a reachable building names its skill in words, not its registry id", () => {
  // `CitySurface`'s roster comment: "The raw node_id (NUM.S, NUM.F, …) is an internal
  // registry id and is kept out of the UI — it survives only as the `data-node-id` hook."
  // `skillDisplayName` falls back to the id, so a reachable era with no entries breaks that
  // in three places at once (the roster's third span, the floating 3D label, and every
  // announcement through `buildingSubject`). Measured in the live app before the fix: the
  // roster read "Store / the Seed House / EXP.1" — the dressing era two carried at the time,
  // quoted as measured; `EXP.1` has since been re-authored as the Bee House.
  for (const { era, node } of ART_AUTHORED_PAIRS) {
    it(`${era}/${node} resolves a human skill name`, () => {
      expect(skillDisplayName(node), `${node} shows its raw registry id`).not.toBe(node);
    });
  }

  it("keeps every display name honest against the pack it is taken from", () => {
    // Two-way, and derived from the packs rather than from a second transcription: a name
    // is either the pack title VERBATIM, or an edit whose original is recorded in
    // `SKILL_SOURCE_TITLES`. So an edited name cannot lose its provenance, and a recorded
    // provenance cannot drift off the pack it claims to quote.
    let verbatim = 0;
    let edited = 0;
    const verbatimEras = new Set<EraId>();
    for (const { era, node } of ART_AUTHORED_PAIRS) {
      const title = lessonByNode[node]?.title;
      if (title === undefined) {
        continue;
      }
      const shown = skillDisplayName(node);
      if (shown === title) {
        verbatim += 1;
        verbatimEras.add(era);
        continue;
      }
      expect(
        SKILL_SOURCE_TITLES[node],
        `${node}'s display name "${shown}" is an edit of no recorded title`,
      ).toBe(title);
      edited += 1;
    }
    // Floors under BOTH branches, so neither arm of the rule can go unmeasured: three of
    // era one's six are edits of their pack titles and the other three are verbatim, and
    // era two's five are all verbatim.
    expect(verbatim).toBeGreaterThanOrEqual(8);
    expect(edited).toBeGreaterThanOrEqual(3);
    // Shape, not just size: the verbatim arm spans more than one era, so era one alone
    // could not satisfy it.
    expect(verbatimEras.size).toBeGreaterThanOrEqual(2);
    for (const nodeId of getEraNodes("neolithic")) {
      expect(skillDisplayName(nodeId), `${nodeId} is not its pack title verbatim`).toBe(
        lessonByNode[nodeId]?.title,
      );
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 7. The advisor table is total, and era two's name is the ratified one         */
/* -------------------------------------------------------------------------- */

describe("every era has an advisor and every beat has a pose", () => {
  it("covers every era in the authored sequence, with a floor", () => {
    for (const eraId of ERA_IDS) {
      expect(ERA_ADVISOR_POSES[eraId], `${eraId} has no pose row`).toBeDefined();
      expect(advisorNameForEra(eraId).length).toBeGreaterThan(0);
    }
    // Both floors: a `Record` over a union only constrains the keys it knows about, so
    // the table is measured against the sequence rather than against itself.
    expect(Object.keys(ERA_ADVISOR_POSES).sort()).toEqual([...ERA_IDS].sort());
    expect(ERA_IDS.length).toBeGreaterThanOrEqual(10);
    expect(ADVISOR_MOODS.length).toBeGreaterThanOrEqual(3);
  });

  it("maps every beat to a pose the era's advisor can strike", () => {
    let mapped = 0;
    for (const eraId of ERA_IDS) {
      const poses = advisorPosesForEra(eraId);
      for (const mood of ADVISOR_MOODS) {
        const pose = advisorPose(eraId, mood);
        expect(pose, `${eraId}/${mood} maps to no pose`).toBeTruthy();
        expect(poses.moodPose[mood]).toBe(pose);
        mapped += 1;
      }
    }
    expect(mapped).toBe(ERA_IDS.length * ADVISOR_MOODS.length);
    expect(mapped).toBeGreaterThanOrEqual(30);
  });

  it("names era two's advisor from the ratified table, and draws era two's own art", () => {
    // The NAME comes from `city/eraDressing.ts`'s ratified `ERA_ADVISORS`, which the era
    // advance also reads; this module owns only the poses. Asserted through the accessor so
    // a second copy of the name cannot creep back in.
    //
    // ⚑ DERIVED, NOT WRITTEN DOWN, and that is the whole point of these three lines. This
    // line held the literal "Ket" while three records disagreed about era two's advisor;
    // Evan settled it on 2026-07-31 (*"oru redressed"*, i.e. D-ET9's answer) and a literal
    // "Oru" here would be the same defect with a different string in it — a fourth place
    // the name is written, free to drift from the table the app actually reads. So this
    // asserts the RELATION instead: the accessor answers whatever `ERA_ADVISORS` ratifies,
    // and under D-ET9 that is the one continuous name era one already carries. A rename of
    // the character stays one edit in one place and these lines follow it.
    const ratified = ERA_ADVISORS.neolithic;
    // Floor first: `?.name` against an absent row would make both lines below pass on
    // `undefined === undefined`, which is the emptiness this must not clear.
    expect(ratified, "era two has no ratified advisor row to derive from").toBeDefined();
    expect(ratified?.name.length).toBeGreaterThan(0);
    expect(advisorNameForEra("neolithic")).toBe(ratified?.name);
    // D-ET9: one advisor for the whole run, so era two's name is era one's name and only
    // the register moves. This is what fails if a second character is ever added back.
    expect(advisorNameForEra("neolithic")).toBe(continuousAdvisorName());
    expect(advisorNameForEra("neolithic")).not.toBe(ratified?.role);
    // **CHANGED 2026-07-31: era two now draws its OWN advisor.** This read `artIsOwn: false`
    // / `art: "oru"` because no drawing existed; `MakaAdvisorCharacter` is that drawing,
    // ported from the shelved source. Still exact equality in both fields — the pin moved to
    // the new fact rather than being loosened to admit either.
    const eraTwo = advisorPosesForEra("neolithic");
    expect(eraTwo.artIsOwn).toBe(true);
    expect(eraTwo.art).toBe("maka");
    expect(advisorPosesForEra("prehistoric").artIsOwn).toBe(true);
    expect(advisorPosesForEra("prehistoric").art).toBe("oru");
    // The borrow is still real for the eras that have no drawing, so `artIsOwn` is measuring
    // something rather than being true everywhere. (It WAS true everywhere until this date —
    // see `BORROWED_ORU_POSES` in `eraAdvisor.ts` for the defect that hid behind it.)
    expect(advisorPosesForEra("bronze_age").artIsOwn).toBe(false);
    // Floor on the RATIFIED set, derived: two eras name an advisor today, and an era with
    // none shows no name rather than borrowing — which is why that table is `Partial` and
    // this one is not.
    expect(eraIdsWithRatifiedAdvisor().length).toBeGreaterThanOrEqual(2);
    expect(eraIdsWithRatifiedAdvisor()).toContain("neolithic");
  });
});
