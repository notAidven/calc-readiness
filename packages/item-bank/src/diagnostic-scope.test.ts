import { PRODUCT_CHECKER_VERSION } from "@cr/components";
import { ERA_SEQUENCE, getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { createItemPackWalkSource } from "./bank";
import { D1_WALK_ITEM_PACK } from "./d1";
import {
  DIAGNOSTIC_UNSERVABLE_ITEMS,
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_ITEMS_PER_FORM,
  DIAGNOSTIC_WALK_SCOPE,
  diagnosticScopeCensus,
  diagnosticWalkScope,
  isDiagnosticServableShape,
  PRACTICE_POOL_NODES,
  placementHorizon,
  prereqClosureGaps,
  unservableShapeReason,
} from "./diagnostic-scope";
import { PRACTICE_WALK_ITEM_PACK } from "./practice-walk";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition, type ItemPackEntry } from "./schema";
import { PRODUCT_CHECKER_CONFIG, validateWalkPool } from "./validate";

/**
 * THE DIAGNOSTIC'S SCOPE IS DERIVED, AND THIS IS WHERE THE DERIVATION IS HELD TO BEING
 * THE RIGHT ONE.
 *
 * Deriving a population and deriving the RIGHT population are separate questions
 * (`.cursor/rules/qa-verification.mdc`), and a derivation is at its most convincing when
 * it is one clean filter over a real source — which is also what a too-narrow filter
 * looks like. So the assertions below are about SHAPE as well as size: a floor on the
 * node count is satisfied by twenty of anything, and what the widening claims is that the
 * instrument reaches most of the authored game.
 */

const PRODUCT_IDS = getProductNodes().map((node) => node.id);
const D1_IDS = getNodesByScope("mvp").map((node) => node.id);

/**
 * EVERY IN-PRODUCT NODE IS SERVABLE NOW, so this file no longer carries an exception list.
 *
 * It used to hold one, keyed by reason, because a node excluded for having no authored content
 * and a node excluded for a drawable space its own practice pool had spent look identical from
 * outside the derivation — both simply have zero servable items — and that is how the second
 * sits unfixed. Each entry left the list by being authored rather than by being excused:
 * `POL.6` and `POL.7` were whole lessons, which took the placement horizon from the sixth era
 * to the seventh; `EL.3`, `TRG.7` and `TRG.8` each gained a shape varying something other than
 * the value, which took `EL.4` and `EL.5` out of the prerequisite pruning behind `EL.3`; and
 * `POL.5` was the last of them.
 *
 * **What replaces it is stronger rather than absent, and that is the point of retiring it here
 * instead of leaving it empty.** An exception record over an empty set is the shape
 * `.cursor/rules/qa-verification.mdc` warns about: its both-directions loop runs over nothing
 * and reads as thorough. What the derivation actually claims now is that the servable set IS
 * the in-product set, which is a set equality with no list in it, and it fails by name in both
 * directions — a node that loses its content fails, and so does one that appears from outside
 * the registry.
 *
 * Servability is still a different fact from the administered scope. A node can be servable and
 * not administered when it sits behind the placement horizon; nothing does today, and the guard
 * for that lives in its own describe below rather than here.
 */
const IN_PRODUCT_IDS: readonly string[] = [...PRODUCT_IDS].sort();

describe("the derived diagnostic scope", () => {
  it("derived something, over the whole in-product node set", () => {
    // The #193 floor. Every assertion below compares against a derived set, and a
    // derivation that quietly returns nothing satisfies most of them.
    expect(diagnosticScopeCensus().length).toBe(PRODUCT_IDS.length);
    expect(PRODUCT_IDS.length).toBeGreaterThanOrEqual(62);
    expect(DIAGNOSTIC_WALK_SCOPE.length).toBeGreaterThanOrEqual(34);
    expect(DIAGNOSTIC_WALK_ITEM_PACK.length).toBeGreaterThanOrEqual(240);
  });

  it("is genuinely wider than the D1 lane, and has not traded D1 away to get there", () => {
    // A floor constrains size, not shape: twenty nodes could be D1's six plus fourteen of
    // anything, or fourteen nodes with D1 dropped. Both halves are asserted.
    for (const nodeId of D1_IDS) {
      expect(DIAGNOSTIC_WALK_SCOPE, `${nodeId} left the scope`).toContain(nodeId);
    }
    const beyondD1 = DIAGNOSTIC_WALK_SCOPE.filter((id) => !D1_IDS.includes(id));
    expect(
      beyondD1.length,
      "the scope has collapsed back to roughly D1, so the widening is nominal",
    ).toBeGreaterThanOrEqual(26);
  });

  it("reaches every authored domain, D10 included", () => {
    const domainOf = new Map(getProductNodes().map((node) => [node.id, node.domain]));
    const domains = new Set(DIAGNOSTIC_WALK_SCOPE.map((id) => domainOf.get(id)));
    // Tightened from nine to TEN, which is what the practice-derived pack bought. D10 was the
    // only absent domain and it was absent because `GEO.1`/`GEO.2` had a lesson and a practice
    // pool and no walk items; a learner could not be placed into the geometry era at all.
    expect(domains.size).toBeGreaterThanOrEqual(10);
    for (const domain of ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]) {
      expect(domains, `no node from ${domain} is measurable`).toContain(domain);
    }
  });

  it("is in teaching order, so a results list reads foundations first", () => {
    const depthRank = new Map(DIAGNOSTIC_WALK_SCOPE.map((id, index) => [id, index]));
    for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
      const prereqs = (getProductNodes().find((n) => n.id === nodeId)?.prereqs ??
        []) as readonly string[];
      for (const prereq of prereqs) {
        const prereqRank = depthRank.get(prereq);
        if (prereqRank === undefined) {
          continue;
        }
        expect(
          prereqRank,
          `${prereq} is a prerequisite of ${nodeId} but comes after it`,
        ).toBeLessThan(depthRank.get(nodeId) as number);
      }
    }
  });

  it("is prerequisite-closed", () => {
    expect(prereqClosureGaps()).toEqual([]);
  });

  it("only contains nodes with a practice pool to place a learner into", () => {
    const practice = new Set(PRACTICE_POOL_NODES);
    for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
      expect(practice, `${nodeId} has no practice pool`).toContain(nodeId);
    }
    expect(practice.size).toBeGreaterThanOrEqual(59);
  });

  it("can serve three distinct items per form for every node it contains", () => {
    const source = createItemPackWalkSource(DIAGNOSTIC_WALK_ITEM_PACK);
    for (const nodeId of DIAGNOSTIC_WALK_SCOPE) {
      for (const form of ["A", "B"]) {
        const served = new Set<string>();
        for (let attempt = 0; attempt < DIAGNOSTIC_WALK_ITEMS_PER_FORM; attempt += 1) {
          // Throws for a pack too thin, which is the mid-administration failure this
          // criterion exists to make impossible.
          const item = source.selectProbeItem({
            node_id: nodeId,
            attempt,
            form_id: form,
          });
          expect(item.node_id).toBe(nodeId);
          served.add(item.item_version_id);
        }
        expect(served.size, `${form}:${nodeId} repeats a probe item`).toBe(
          DIAGNOSTIC_WALK_ITEMS_PER_FORM,
        );
      }
    }
  });

  it("grades every servable item correct through the checker the walk composes", () => {
    // The wedge this rules out: an item whose key the composed checker cannot parse comes
    // back `invalid_input`, which `isScorable` refuses, so the walk re-serves it forever
    // at a 0% fault rate. Measured over the whole pool rather than sampled.
    expect(PRODUCT_CHECKER_CONFIG.checkerVersion).toBe(PRODUCT_CHECKER_VERSION);
    expect(
      validateWalkPool(
        DIAGNOSTIC_WALK_ITEM_PACK,
        {
          nodes: DIAGNOSTIC_WALK_SCOPE,
          minItemsPerCell: DIAGNOSTIC_WALK_ITEMS_PER_FORM,
        },
        PRODUCT_CHECKER_CONFIG,
      ),
    ).toEqual([]);
  });

  it("keeps the D1 pack a byte-identical subset, so the D1 path is unchanged", () => {
    const inDiagnostic = new Set(
      DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => entry.item_version_id),
    );
    expect(D1_WALK_ITEM_PACK.length).toBeGreaterThan(0);
    for (const entry of D1_WALK_ITEM_PACK) {
      expect(inDiagnostic, `${entry.item_version_id} was dropped`).toContain(
        entry.item_version_id,
      );
      const widened = DIAGNOSTIC_WALK_ITEM_PACK.find(
        (candidate) => candidate.item_version_id === entry.item_version_id,
      ) as ItemPackEntry;
      expect(hashItemDefinition(widened)).toBe(hashItemDefinition(entry));
    }
  });
});

describe("which era a learner can be placed into", () => {
  /**
   * **THE CLAIM THE HORIZON RESTS ON, AND THE ONE THE DEMO IS ABOUT.**
   *
   * `eraPlacementFromSeed` (`apps/web/src/catchup/eraPlacement.ts`, on `integration`) reads a
   * placement as an era decision: an era FIRES when every one of its nodes passed, and the
   * scan stops at the first era that does not — so the era a learner is placed INTO is the
   * first one the instrument cannot clear for them, and every era behind it is unreachable.
   *
   * A node the instrument never probes is absent from `placement_by_node`, absent reads as 0,
   * and 0 is below the pass bar. So an era with an unadministered node can NEVER fire, and the
   * deepest era anyone can be placed into is the first era that is not fully administered.
   *
   * Asserted here rather than only over there because it is a fact about the SCOPE. At the
   * twenty-node scope the first incompletely-administered era was the third, so eras four
   * through ten could not be placed into at all; the practice-derived pack moved it to the
   * sixth, which is the geometry era and the one the demo is about.
   */
  const eraNumberOf = (eraId: string) =>
    ERA_SEQUENCE.findIndex((era) => era.id === eraId) + 1;

  const firstIncompleteEra = () => {
    const inScope = new Set(DIAGNOSTIC_WALK_SCOPE);
    return ERA_SEQUENCE.find((era) => !era.nodes.every((nodeId) => inScope.has(nodeId)));
  };

  it("administers every node of every era, per era and by name", () => {
    const inScope = new Set(DIAGNOSTIC_WALK_SCOPE);
    const complete = ERA_SEQUENCE.filter((era) =>
      era.nodes.every((nodeId) => inScope.has(nodeId)),
    );
    // A count and a composition, not just a count: ten complete eras could be nine real ones
    // and an empty one, so each era is also required to hold nodes and to have all of them in.
    expect(complete.length, "an era stopped being fully administered").toBe(
      ERA_SEQUENCE.length,
    );
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      expect(
        era.nodes.length,
        `era ${eraNumberOf(era.id)} (${era.id}) is empty`,
      ).toBeGreaterThan(0);
      const missing = era.nodes.filter((nodeId) => !inScope.has(nodeId));
      expect(missing, `era ${eraNumberOf(era.id)} (${era.id}) cannot fire`).toEqual([]);
    }
  });

  /**
   * THE DEPTH CLAIM, at the end of the road it was measuring.
   *
   * A learner can be placed INTO the first era the instrument cannot fully serve, and can be
   * HANDED every era before it. The boundary moved three times: the third at the twenty-node
   * scope, the sixth once the geometry pair was administered, the seventh once `POL.6` and
   * `POL.7` were authored, and there is no boundary at all now that `POL.5` is. Nothing in
   * `placementHorizon` was edited on any of those moves, which is what the derivation is for.
   *
   * **So the assertion is inverted rather than deleted, and it is the stronger direction.** The
   * old form pinned a boundary number and named the one node holding it back, which is a claim
   * about where the instrument stops; there is nowhere for it to stop now, and the claim worth
   * guarding is that the LAST era can be both placed into and handed over. Pinning `10` here
   * instead would be a fixture that goes stale the day an eleventh era is authored, where
   * "every era fires" stays right.
   */
  it("leaves no era a learner cannot be placed into or handed", () => {
    const first = firstIncompleteEra();
    expect(
      first === undefined,
      first === undefined
        ? ""
        : `era ${eraNumberOf(first.id)} (${first.id}) cannot fire: ${first.nodes
            .filter((nodeId) => !DIAGNOSTIC_WALK_SCOPE.includes(nodeId))
            .join(", ")}`,
    ).toBe(true);
    // The last era by name, because "no incomplete era" is also true of a scan that ran out of
    // eras to look at. The deepest era in the sequence has to be genuinely in the instrument.
    const last = ERA_SEQUENCE[ERA_SEQUENCE.length - 1];
    expect(last?.nodes.length, "the deepest era holds no nodes").toBeGreaterThan(0);
    for (const nodeId of last?.nodes ?? []) {
      expect(
        DIAGNOSTIC_WALK_SCOPE,
        `${nodeId} is in the deepest era and is not administered, so nobody can be placed there`,
      ).toContain(nodeId);
    }
    // And the horizon is not what admitted them: it is derived, it cuts nothing today, and this
    // is the line that says the two agree rather than that one is carrying the other.
    expect([...placementHorizon(DIAGNOSTIC_WALK_SCOPE)].sort()).toEqual(
      [...DIAGNOSTIC_WALK_SCOPE].sort(),
    );
  });

  it("administers both geometry nodes, and POL.5, which are what moved the horizon", () => {
    // The instances, not the class. D10 was entirely absent from the instrument and its era
    // could not be reached; POL.5 was the seventh era's own last unauthored node and the last
    // in the product. These three ids are what took the boundary from the sixth era to none.
    for (const nodeId of ["GEO.1", "GEO.2", "POL.5"]) {
      expect(DIAGNOSTIC_WALK_SCOPE, `${nodeId} is not administered`).toContain(nodeId);
    }
    const sixth = ERA_SEQUENCE[5];
    expect(sixth?.nodes).toContain("GEO.1");
    expect(sixth?.nodes).toContain("GEO.2");
    expect(ERA_SEQUENCE[6]?.nodes).toContain("POL.5");
  });
});

describe("the shape filter, and the exception it licenses", () => {
  it("drops something, so the filter is not passing over nothing", () => {
    expect(DIAGNOSTIC_UNSERVABLE_ITEMS.length).toBeGreaterThanOrEqual(6);
    // Compared against the PRE-FILTER union of all three packs rather than against two of
    // them. The old comparison was `pack < D1 + PRODUCT`, which was true while those were the
    // only packs and became meaningless the moment a third one was added — it would have
    // passed for a filter that dropped nothing at all.
    const authored = [
      ...D1_WALK_ITEM_PACK,
      ...PRODUCT_ITEM_PACK,
      ...PRACTICE_WALK_ITEM_PACK,
    ];
    expect(DIAGNOSTIC_WALK_ITEM_PACK.length).toBeLessThan(authored.length);
    expect(DIAGNOSTIC_WALK_ITEM_PACK.length).toBe(
      authored.length - DIAGNOSTIC_UNSERVABLE_ITEMS.length,
    );
  });

  /**
   * THE SERVABLE SET IS THE IN-PRODUCT SET, asserted as an equality rather than as a remainder
   * against an exception list.
   *
   * The old form filtered the census by `!servable`, subtracted a written-down record of excused
   * nodes, and asserted the leftover was empty. With the record empty that assertion is
   * `[] === []`, which is true of a derivation that returned nothing at all, and the loop that
   * used to check each excused node in the other direction would iterate zero times. Both halves
   * of a two-way exception check evaporate the moment the exception list does.
   *
   * A set equality does not: it names the node on either side of any disagreement, and it is
   * FLOORED by `PRODUCT_IDS.length`, so a census that came back empty fails here rather than
   * agreeing with an empty expectation.
   */
  it("can serve every in-product node, with no exception list left to keep", () => {
    const census = diagnosticScopeCensus();
    expect(IN_PRODUCT_IDS.length, "the registry returned nothing").toBeGreaterThanOrEqual(
      62,
    );
    const servable = census
      .filter((row) => row.servable)
      .map((row) => row.node_id)
      .sort();
    expect(servable).toEqual(IN_PRODUCT_IDS);
    // And servable for the RIGHT reason on every one of them, rather than by a criterion that
    // stopped requiring anything: each has a pool to be placed into and a full cell in both
    // forms. Without this the equality above would survive `servable` being hardcoded true.
    for (const row of census) {
      expect(row.has_practice_pool, `${row.node_id} has no practice pool`).toBe(true);
      expect(row.form_a_items, `${row.node_id} Form A`).toBeGreaterThanOrEqual(
        DIAGNOSTIC_WALK_ITEMS_PER_FORM,
      );
      expect(row.form_b_items, `${row.node_id} Form B`).toBeGreaterThanOrEqual(
        DIAGNOSTIC_WALK_ITEMS_PER_FORM,
      );
    }
  });

  /**
   * "Cannot serve" and "does not ask" are still two different exclusions, and BOTH are empty.
   *
   * That is a change of state rather than of claim, and the arithmetic is what keeps it honest:
   * the three cohorts have to add up to the census, so the scope cannot quietly shrink while
   * both exclusions stay at zero. The old version floored the second cohort at fifteen, which
   * was true while the horizon cut four eras and is exactly the assertion authoring was supposed
   * to falsify.
   */
  it("excludes nothing, by either exclusion, and still accounts for every node", () => {
    const census = diagnosticScopeCensus();
    const unservable = census.filter((row) => !row.servable);
    const beyondHorizon = census.filter((row) => row.servable && !row.in_scope);
    expect(unservable.map((row) => row.node_id)).toEqual([]);
    expect(
      beyondHorizon.map((row) => row.node_id),
      "the horizon is cutting nodes again, so the instrument has stopped asking about them",
    ).toEqual([]);
    expect(unservable.length + beyondHorizon.length + DIAGNOSTIC_WALK_SCOPE.length).toBe(
      census.length,
    );
    expect(DIAGNOSTIC_WALK_SCOPE.length).toBe(census.length);
  });

  it("has a load-bearing shape filter: the items it drops are really there", () => {
    // The subject here is the FILTER, not the unservable-node list, and the two came apart
    // when the practice-derived pack landed: `TRG.2`'s multipart product item is still refused,
    // but `TRG.2` is servable now from its own practice templates, so "the filter is
    // load-bearing" can no longer be shown by a node leaving the scope.
    //
    // What can still be shown, and is the whole claim, is that real authored items are being
    // refused rather than merely absent. The population is derived from the filter's own
    // record, floored, and each dropped item is confirmed to be a genuine authored item that
    // the unfiltered pool would have served.
    expect(
      DIAGNOSTIC_UNSERVABLE_ITEMS.length,
      "the filter dropped nothing, so it is a filter over an empty set",
    ).toBeGreaterThanOrEqual(6);
    const authored = new Set(
      [...D1_WALK_ITEM_PACK, ...PRODUCT_ITEM_PACK, ...PRACTICE_WALK_ITEM_PACK].map(
        (entry) => entry.item_version_id,
      ),
    );
    const servedIds = new Set(
      DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => entry.item_version_id),
    );
    for (const { entry, reason } of DIAGNOSTIC_UNSERVABLE_ITEMS) {
      expect(authored, `${entry.item_version_id} is not an authored item`).toContain(
        entry.item_version_id,
      );
      expect(servedIds, `${entry.item_version_id} was dropped and served`).not.toContain(
        entry.item_version_id,
      );
      expect(["multipart", "interactive_widget"]).toContain(reason);
    }
    // And the drop changes what a node can be served: `TRG.2`'s multipart item is refused, so
    // the product pack ALONE cannot serve it — which is exactly the state that made `TRG.2`
    // an exception before its practice templates were frozen.
    const productOnly = diagnosticWalkScope([...D1_WALK_ITEM_PACK, ...PRODUCT_ITEM_PACK]);
    expect(productOnly).not.toContain("TRG.2");
  });

  it("refuses a multipart item and a widget-scored item, by shape", () => {
    const multipart = PRODUCT_ITEM_PACK.find(
      (entry) => (entry.answer.parts?.length ?? 0) > 0,
    ) as ItemPackEntry;
    expect(
      multipart,
      "no multipart walk item exists to test the filter against",
    ).toBeDefined();
    expect(unservableShapeReason(multipart)).toBe("multipart");
    expect(isDiagnosticServableShape(multipart)).toBe(false);

    const plain = D1_WALK_ITEM_PACK[0] as ItemPackEntry;
    const asWidget: ItemPackEntry = {
      ...plain,
      answer: {
        ...plain.answer,
        answer_spec: { ...plain.answer.answer_spec, answer_type: "number_line" },
      },
    };
    expect(unservableShapeReason(asWidget)).toBe("interactive_widget");
    expect(isDiagnosticServableShape(asWidget)).toBe(false);

    // And the shape the diagnostic DOES accept beyond a bare string: RAT.1's rational
    // answer is structured too, and is deliberately not excluded — the answer row renders
    // the same two-field control lesson practice does. Excluding it would take D5 out.
    const rational = PRODUCT_ITEM_PACK.find(
      (entry) => entry.answer.answer_spec.answer_type === "rational_answer",
    ) as ItemPackEntry;
    expect(rational).toBeDefined();
    expect(isDiagnosticServableShape(rational)).toBe(true);
    expect(DIAGNOSTIC_WALK_SCOPE).toContain(rational.node_id);
  });

  it("would drop a node whose pack thins below the 2-of-3 rule", () => {
    // The criterion, injected rather than argued: take one item out of a node's Form B and
    // the node leaves the derived scope.
    const victim = "LIN.1";
    expect(DIAGNOSTIC_WALK_SCOPE).toContain(victim);
    const formB = DIAGNOSTIC_WALK_ITEM_PACK.filter(
      (entry) => entry.node_id === victim && entry.form === "B",
    );
    expect(formB.length).toBe(DIAGNOSTIC_WALK_ITEMS_PER_FORM);
    const thinned = DIAGNOSTIC_WALK_ITEM_PACK.filter(
      (entry) => entry.item_version_id !== formB[0]?.item_version_id,
    );
    expect(diagnosticWalkScope(thinned)).not.toContain(victim);
  });
});
