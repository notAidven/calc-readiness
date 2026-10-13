import { PRODUCT_CHECKER_VERSION } from "@cr/components";
import {
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_ITEMS_PER_FORM,
  DIAGNOSTIC_WALK_SCOPE,
  diagnosticScopeCensus,
  hashItemDefinition,
  prereqClosureGaps,
} from "@cr/item-bank";
import { getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { DEFAULT_WALK_BLUEPRINT_VERSION, DEFAULT_WALK_VERSIONS } from "./walk-runtime";

/**
 * WHICH NODE SET EACH `blueprint_version` ADMINISTERS — the half of the D-END4 record
 * that `engines/diagnostic/src/blueprintScope.test.ts` cannot hold.
 *
 * That guard owns the hazard and the argument for it: `scope` is an argument the reader
 * supplies rather than a field on the record, so a widening that does not bump
 * `blueprint_version` silently re-denominates every baseline already collected and the
 * comparability gate reports `computed` while it happens. It can pin the registry's node
 * set and which EXPRESSION each composition point names, and it stops there for a
 * structural reason: it lives in `@cr/diagnostic`, `@cr/item-bank` depends on
 * `@cr/diagnostic`, and the scope the walk now administers is derived in the item bank.
 * Importing it there would run that edge backwards.
 *
 * This file is downstream of both, so it can resolve the set and compare it. It is also
 * where `DEFAULT_WALK_BLUEPRINT_VERSION` is declared, which is the version the record is
 * keyed on.
 *
 * ## The record, and why it is a written-down list
 *
 * Everywhere else in this change the population is derived. Here it is written down, and
 * that is the point rather than an oversight: what D-END4 needs recorded is which node
 * set the administrations stamped with a given `blueprint_version` were TAKEN against,
 * which is a historical fact about a release and not a property of tip. A derived
 * assertion would only say "the item bank agrees with itself", which is true of any pack.
 *
 * So authoring walk items for a node widens the instrument and MUST fail here until a new
 * version is registered. That is the mechanism working. Do not edit an existing entry to
 * make it pass — add the next one, and leave the old alone, because the old entry is what
 * says what the baselines in the database mean.
 */
const ADMINISTERED_BY_BLUEPRINT_VERSION: ReadonlyMap<number, readonly string[]> = new Map([
  // Version 2: the registry's six D1 nodes, `getNodesByScope("mvp")`.
  [2, ["NUM.2", "NUM.3", "NUM.4", "NUM.5", "NUM.F", "NUM.S"]],
  // Version 3: the content-derived scope — every in-product node with a practice pool and
  // >= 3 servable walk items in each form. Twenty of sixty-two, spanning nine of the ten
  // domains (D10's `GEO.1`/`GEO.2` have lessons and practice but no walk items).
  [
    3,
    [
      "CG.1",
      "EL.1",
      "EXP.1",
      "FUN.1",
      "LF.1",
      "LIN.1",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
      "NUM.F",
      "NUM.S",
      "POL.1",
      "POL.2",
      "RAD.1",
      "RAD.2",
      "RAD.3",
      "RAD.4",
      "RAT.1",
      "TRG.1",
    ],
  ],
  // Version 4: the walk forms frozen from the lesson-practice templates (`practice-walk.ts`)
  // brought 34 more nodes within reach, and the scope is now cut at the PLACEMENT HORIZON —
  // every era up to and including the first the instrument cannot fully serve, plus the nodes
  // it has always administered. Thirty-four of sixty-two, spanning all TEN domains, D10's
  // `GEO.1`/`GEO.2` included for the first time. Measured 33 / 41 / 47 / 53 items over 6,000
  // students against version 3's 23 / 29 / 32 / 35, with the 70-item ceiling binding for
  // 0.00% either way.
  [
    4,
    [
      "CG.1",
      "EL.1",
      "EXP.1",
      "FUN.1",
      "GEO.1",
      "GEO.2",
      "LF.1",
      "LIN.1",
      "LIN.3",
      "LIN.4",
      "LIN.5",
      "LIN.6",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
      "NUM.F",
      "NUM.S",
      "POL.1",
      "POL.2",
      "POL.3",
      "POL.4",
      "POL.8",
      "RAD.1",
      "RAD.2",
      "RAD.3",
      "RAD.4",
      "RAT.1",
      "RAT.2",
      "RAT.3",
      "RAT.4",
      "RAT.5",
      "RAT.6",
      "TRG.1",
    ],
  ],
  // Version 5: `POL.6` and `POL.7` were authored, which made the sixth era fully servable and
  // moved the PLACEMENT HORIZON to the seventh with no code change. Forty of sixty-two, still
  // spanning all ten domains, adding the sixth era's two graphing nodes and the four industrial
  // and atomic nodes that came in behind them. Re-measured 37 / 51 / 60 / 69 items over 6,000
  // students against version 4's 33 / 41 / 47 / 53, with the 70-item ceiling binding for 0.00%
  // either way. p90 crossing fifty is the cost and it is recorded rather than smoothed.
  [
    5,
    [
      "CG.1",
      "EL.1",
      "EXP.1",
      "FUN.1",
      "FUN.2",
      "FUN.3",
      "FUN.7",
      "FUN.8",
      "GEO.1",
      "GEO.2",
      "LF.1",
      "LIN.1",
      "LIN.3",
      "LIN.4",
      "LIN.5",
      "LIN.6",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
      "NUM.F",
      "NUM.S",
      "POL.1",
      "POL.2",
      "POL.3",
      "POL.4",
      "POL.6",
      "POL.7",
      "POL.8",
      "RAD.1",
      "RAD.2",
      "RAD.3",
      "RAD.4",
      "RAT.1",
      "RAT.2",
      "RAT.3",
      "RAT.4",
      "RAT.5",
      "RAT.6",
      "TRG.1",
    ],
  ],
  // Version 6: `POL.5` was authored, which was the last in-product node with no content of any
  // kind. That made the seventh era fully servable, and every era behind it already was, so
  // `placementHorizon` cuts nothing and the administered set IS the product: ALL SIXTY-TWO,
  // across all ten domains. Re-measured 38 / 62 / 70 / 70 items over 6,000 students against
  // version 5's 37 / 51 / 60 / 69, and the 70-item ceiling now TRUNCATES 1.43% of them where it
  // bound nobody at either of the two versions before. p99 sitting on the ceiling is the cost
  // and it is recorded rather than smoothed; the policy is untouched.
  [
    6,
    [
      "CG.1",
      "EL.1",
      "EL.2",
      "EL.3",
      "EL.4",
      "EL.5",
      "EL.6",
      "EXP.1",
      "FUN.1",
      "FUN.10",
      "FUN.2",
      "FUN.3",
      "FUN.4",
      "FUN.5",
      "FUN.6",
      "FUN.7",
      "FUN.8",
      "FUN.9",
      "GEO.1",
      "GEO.2",
      "LF.1",
      "LF.2",
      "LF.3",
      "LF.4",
      "LIN.1",
      "LIN.3",
      "LIN.4",
      "LIN.5",
      "LIN.6",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
      "NUM.F",
      "NUM.S",
      "POL.1",
      "POL.2",
      "POL.3",
      "POL.4",
      "POL.5",
      "POL.6",
      "POL.7",
      "POL.8",
      "RAD.1",
      "RAD.2",
      "RAD.3",
      "RAD.4",
      "RAT.1",
      "RAT.2",
      "RAT.3",
      "RAT.4",
      "RAT.5",
      "RAT.6",
      "TRG.1",
      "TRG.2",
      "TRG.3",
      "TRG.4",
      "TRG.5",
      "TRG.6",
      "TRG.7",
      "TRG.8",
      "TRG.9",
    ],
  ],
]);

const LIVE = [...DIAGNOSTIC_WALK_SCOPE].sort();
const D1_NODE_IDS = getNodesByScope("mvp")
  .map((node) => node.id)
  .sort();

const REGISTER_HINT =
  `Widening the instrument is legitimate and this is the record it owes (D-END4): bump ` +
  `DEFAULT_WALK_BLUEPRINT_VERSION and add an entry to ` +
  `ADMINISTERED_BY_BLUEPRINT_VERSION for the new version, leaving the old entries alone.`;

describe("the node set this blueprint_version administers (D-END4)", () => {
  it("has a recorded node set for the live version", () => {
    expect(
      ADMINISTERED_BY_BLUEPRINT_VERSION.has(DEFAULT_WALK_BLUEPRINT_VERSION),
      `blueprint_version is ${DEFAULT_WALK_BLUEPRINT_VERSION} and no administered node set is recorded for it. ${REGISTER_HINT}`,
    ).toBe(true);
  });

  it("administers exactly that set", () => {
    expect(
      LIVE,
      `the walk administers a different node set than blueprint_version ` +
        `${DEFAULT_WALK_BLUEPRINT_VERSION} records, so a pre/post pair stamped with it ` +
        `would be denominated over an instrument it was not taken on. ${REGISTER_HINT}`,
    ).toEqual([
      ...(ADMINISTERED_BY_BLUEPRINT_VERSION.get(DEFAULT_WALK_BLUEPRINT_VERSION) ?? []),
    ]);
  });

  it("is genuinely wider than the D1 lane it used to stop at, and still contains it", () => {
    // A floor on SIZE alone would be satisfied by twenty of anything, so both halves are
    // asserted: the D1 six are all still in (nothing was traded away to widen), and the
    // set minus D1 is itself substantial (the widening is not six nodes plus rounding).
    for (const nodeId of D1_NODE_IDS) {
      expect(LIVE, `${nodeId} dropped out of the instrument`).toContain(nodeId);
    }
    const beyondD1 = LIVE.filter((id) => !D1_NODE_IDS.includes(id));
    expect(
      beyondD1.length,
      "the scope is barely wider than D1, so the widening has quietly collapsed back",
    ).toBeGreaterThanOrEqual(12);
  });

  it("spans every authored domain, not one extra strand", () => {
    const domainOf = new Map(getProductNodes().map((node) => [node.id, node.domain]));
    const domains = new Set(LIVE.map((id) => domainOf.get(id)));
    const authored = new Set(getProductNodes().map((node) => node.domain));
    expect(
      domains.size,
      `the instrument reaches ${domains.size} domains; a widening that reached one or two ` +
        `would satisfy a node-count floor while leaving most of the game unmeasured`,
    ).toBeGreaterThanOrEqual(8);
    // Tightened from "most" to "all ten", which is what the practice-derived pack bought and
    // is the claim that can go false: D10 was the only absent domain, and it was absent
    // because `GEO.1`/`GEO.2` had a lesson and a practice pool and no walk items.
    for (const domain of authored) {
      expect(domains, `no node from ${domain} is measurable`).toContain(domain);
    }
    expect(authored.size).toBe(10);
  });

  it("is prerequisite-closed, so nothing resolves against an unmeasured prerequisite", () => {
    // `resolveKnowledgeState` only credits a node whose IN-SCOPE prereqs passed, so an
    // out-of-scope prerequisite silently drops out of resolution instead of being
    // measured — the coverage number would keep its shape and change its meaning.
    expect(prereqClosureGaps(DIAGNOSTIC_WALK_SCOPE)).toEqual([]);
  });

  it("can actually serve every node it administers, in both forms", () => {
    // The failure this rules out is not abstract: `createItemPackWalkSource` throws
    // mid-administration for a node whose pack is short of the requested attempt, and the
    // walk asks for a third item whenever a node is not decided 2/2.
    const distinct = new Map<string, Set<string>>();
    for (const entry of DIAGNOSTIC_WALK_ITEM_PACK) {
      const key = `${entry.form}:${entry.node_id}`;
      const hashes = distinct.get(key) ?? new Set<string>();
      hashes.add(hashItemDefinition(entry));
      distinct.set(key, hashes);
    }
    for (const nodeId of LIVE) {
      for (const form of ["A", "B"]) {
        expect(
          distinct.get(`${form}:${nodeId}`)?.size ?? 0,
          `form ${form} node ${nodeId} cannot fill the 2-of-3 rule`,
        ).toBeGreaterThanOrEqual(DIAGNOSTIC_WALK_ITEMS_PER_FORM);
      }
    }
  });

  it("stamps the checker version the composed checker actually is", () => {
    // Both checkers fail closed on a mismatch, so a client stamping 1 against a server
    // composed at 2 returns `scoring_error` on EVERY item, D1's included.
    expect(DEFAULT_WALK_VERSIONS.equivalence_checker_version).toBe(PRODUCT_CHECKER_VERSION);
  });

  it("keeps each recorded version distinct, so a bump corresponds to a change", () => {
    const recorded = [...ADMINISTERED_BY_BLUEPRINT_VERSION.values()].map((ids) =>
      JSON.stringify([...ids].sort()),
    );
    expect(
      new Set(recorded).size,
      "two blueprint_versions record the identical node set, so one bump bought nothing",
    ).toBe(recorded.length);
  });
});

describe("the census the scope is derived from", () => {
  it("covers every in-product node, so the gap to 62 is countable", () => {
    const census = diagnosticScopeCensus();
    expect(census.length).toBe(getProductNodes().length);
    expect(
      census
        .filter((row) => row.in_scope)
        .map((row) => row.node_id)
        .sort(),
    ).toEqual(LIVE);
  });

  /**
   * THERE IS NO SHORTFALL, and this assertion has reached the end of the sentence it was
   * written to track.
   *
   * It has said three different things. First that every node outside the instrument lacked
   * assessment items. Then, once the practice-derived pack gave items to all but six of them,
   * that the shortfall was MOSTLY a placement-horizon cut, pinned as a comparison between the
   * two halves rather than as a count so it would survive the horizon widening. Its own failure
   * message named what would end it: *"every in-product node is now servable, so the item gap
   * has closed and this assertion has nothing left to describe."* That is what `POL.5` did.
   *
   * **Both halves are asserted EMPTY, by name, which is strictly stronger than the comparison
   * it replaces.** The old form was satisfied by any split with more cut than gap, so a node
   * losing its items passed as long as two nodes stayed behind the horizon. This one fails on
   * the first node to leave by either route, and says which route it left by, so the two
   * exclusions still cannot hide behind each other. What it gives up is the ability to describe
   * a shortfall, and there is none to describe: the arithmetic below is what keeps that honest,
   * because it ties the two empty sets to the size of the census rather than leaving them
   * trivially true over a derivation that returned nothing.
   */
  it("has no shortfall left, by either exclusion, over the whole census", () => {
    const census = diagnosticScopeCensus();
    expect(census.length, "the census returned nothing").toBeGreaterThanOrEqual(62);
    const outside = census.filter((row) => !row.in_scope);
    const beyondHorizon = outside.filter((row) => row.servable);
    const shortOfItems = outside.filter((row) => !row.servable);
    expect(
      shortOfItems.map((row) => row.node_id),
      "these in-product nodes cannot be served, so the item gap has reopened",
    ).toEqual([]);
    expect(
      beyondHorizon.map((row) => row.node_id),
      "these nodes are servable and unasked, so the placement horizon is cutting again",
    ).toEqual([]);
    // The instrument IS the census, which is the positive form of the two empties above and
    // the half a pair of `toEqual([])` cannot state on its own.
    expect(census.filter((row) => row.in_scope).length).toBe(census.length);
    expect(LIVE.length).toBe(census.length);
    // And every node is servable for the right reason rather than by a criterion that stopped
    // requiring anything: a full cell in BOTH forms. "Servable" must not come to mean "serves
    // one form", which was the more alarming defect the old per-node loop watched for and is
    // the one claim here that does not follow from the counts.
    for (const row of census) {
      expect(row.form_a_items, `${row.node_id} Form A`).toBeGreaterThanOrEqual(3);
      expect(row.form_b_items, `${row.node_id} Form B`).toBeGreaterThanOrEqual(3);
    }
  });
});
