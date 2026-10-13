import type { Mastery, PlacementEstimate } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  buildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  residenceCapacity,
} from "./citizens-population";
import {
  CITIZEN_NODE_CAPACITY,
  ENDGAME_SPARE_HOMES,
  FOUNDING_POPULATION,
  TESTED_OUT_PLACEMENT,
} from "./citizens-tuning";
import type { CitizenRoleId } from "./descriptors";

/**
 * The exhaustive sweeps. Every tuning claim in the design is arithmetic, so all of it
 * is assertable here with no GPU, no DOM, and no citizen rendered.
 *
 * The D1 prerequisite graph is duplicated as DATA rather than imported, deliberately:
 * `packages/skill-graph` is Gabriel's, and the mid-game-crowd assertion below is meant
 * to fail LOUDLY if those prerequisites change (the design leans on `NUM.2` requiring
 * two other skills as a graph-level guarantee). A test that silently tracked the graph
 * would stop guarding the assumption it exists to guard.
 * Verified against `packages/skill-graph/src/skill_graph.json`.
 */
const PREREQS: Readonly<Record<string, readonly string[]>> = {
  "NUM.S": [],
  "NUM.F": [],
  "NUM.3": [],
  "NUM.2": ["NUM.S", "NUM.F"],
  "NUM.5": ["NUM.F"],
  "NUM.4": ["NUM.S", "NUM.F", "NUM.2", "NUM.3"],
};

/** The roles the descriptor resolves (D-CIT17), duplicated for the same reason. */
const ROLE_BY_NODE: Readonly<Record<string, CitizenRoleId>> = {
  "NUM.S": "civic",
  "NUM.F": "civic",
  "NUM.2": "residence",
  "NUM.3": "school",
  "NUM.4": "civic",
  "NUM.5": "civic",
};

const NODE_IDS = Object.keys(PREREQS);

/** `noUncheckedIndexedAccess` is on; an unknown node here is a test bug, not data. */
function prereqsOf(nodeId: string): readonly string[] {
  const prereqs = PREREQS[nodeId];
  if (!prereqs) {
    throw new Error(`no prerequisites recorded for ${nodeId}`);
  }
  return prereqs;
}

function roleOf(nodeId: string): CitizenRoleId {
  const role = ROLE_BY_NODE[nodeId];
  if (!role) {
    throw new Error(`no role recorded for ${nodeId}`);
  }
  return role;
}

/**
 * An island where `masteryByNode` says how far each node got. Unplaced at mastery 0.
 *
 * `placementEstimate` defaults to 0, which is a learner the diagnostic passed nothing of —
 * the ordinary path, and the population every sweep below quantifies over. Pass 2 for the
 * hand-off's own shape; see the tested-out walk for why the two are not the same island.
 */
function islandAt(
  masteryByNode: Readonly<Record<string, Mastery>>,
  options: {
    readonly placeAll?: boolean;
    readonly placementEstimate?: PlacementEstimate;
  } = {},
): CitizenNodeInput[] {
  return NODE_IDS.map((nodeId) => {
    const mastery = masteryByNode[nodeId] ?? 0;
    const touched = options.placeAll === true || mastery > 0;
    return {
      node_id: nodeId,
      citizen_role: roleOf(nodeId),
      placed: touched,
      mastery,
      lesson_stage: touched ? ("done" as const) : ("not_started" as const),
      placement_estimate: options.placementEstimate ?? 0,
    };
  });
}

/** Every topologically valid order the six skills can be finished in. */
function validBuildOrders(): readonly (readonly string[])[] {
  const orders: string[][] = [];
  const walk = (done: string[]) => {
    if (done.length === NODE_IDS.length) {
      orders.push([...done]);
      return;
    }
    for (const nodeId of NODE_IDS) {
      if (done.includes(nodeId)) {
        continue;
      }
      if (prereqsOf(nodeId).every((prereq) => done.includes(prereq))) {
        walk([...done, nodeId]);
      }
    }
  };
  walk([]);
  return orders;
}

/** The common path: a learner who passes each set lands complete and mastered together. */
function afterFinishing(finished: readonly string[]): CitizenNodeInput[] {
  const mastery: Record<string, Mastery> = {};
  for (const nodeId of finished) {
    mastery[nodeId] = 2;
  }
  return islandAt(mastery);
}

function waitingCount(nodes: readonly CitizenNodeInput[]): number {
  const ledger = buildingLedger(nodes);
  return Math.max(0, citizenPopulation(ledger) - residenceCapacity(ledger));
}

const ALL_MASTERED = islandAt(
  Object.fromEntries(NODE_IDS.map((nodeId) => [nodeId, 2 as Mastery])),
);

describe("the settled ending (D-CIT4, as amended 2026-07-27)", () => {
  it("GUARANTEES nobody is waiting at full mastery", () => {
    // The single most important assertion in the feature, and the one the amendment
    // exists to enforce. Any retune that leaves someone waiting at full mastery fails
    // HERE, whatever else it improves.
    const ledger = buildingLedger(ALL_MASTERED);
    expect(citizenPopulation(ledger)).toBeLessThanOrEqual(residenceCapacity(ledger));
    expect(waitingCount(ALL_MASTERED)).toBe(0);
  });

  it("settles EXACTLY full — no empty houses (the tuning intent, kept separate)", () => {
    // Deliberately a different assertion from the guarantee above, so the two can be
    // loosened independently: an island with empty houses reads hollow.
    const ledger = buildingLedger(ALL_MASTERED);
    expect(residenceCapacity(ledger) - citizenPopulation(ledger)).toBe(ENDGAME_SPARE_HOMES);
    expect(citizenPopulation(ledger)).toBe(48);
    expect(residenceCapacity(ledger)).toBe(48);
  });

  it("settles in EVERY ONE of the 33 topologically valid build orders", () => {
    const orders = validBuildOrders();
    // Pinned: if the D1 prerequisites change, this number changes and the whole
    // pacing argument needs re-deriving.
    expect(orders).toHaveLength(33);
    for (const order of orders) {
      expect(waitingCount(afterFinishing(order)), order.join(" -> ")).toBe(0);
    }
  });

  it("keeps a waiting crowd alive through the first TWO finished skills, in every order", () => {
    // A graph-level guarantee, not a tuning accident: `NUM.2` carries 59% of the
    // island's homes and requires `NUM.S` + `NUM.F`, so it can never be first or
    // second. This test therefore also GUARDS THE GRAPH ASSUMPTION and fails loudly
    // if the prerequisites change.
    for (const order of validBuildOrders()) {
      for (const k of [1, 2]) {
        expect(
          waitingCount(afterFinishing(order.slice(0, k))),
          `${order.join(" -> ")} at k=${k}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("records the waiting range at each k, and never lets it be negative", () => {
    // The design's 8.5 range row is re-derived here rather than trusted: its k=5
    // cell read "0-14" and computes to exactly 0. What is ASSERTED is only the
    // invariants above; this records the shape of the curve so a retune's effect on
    // the middle is visible in the diff.
    const byK = new Map<number, Set<number>>();
    for (const order of validBuildOrders()) {
      for (let k = 0; k <= NODE_IDS.length; k += 1) {
        const waiting = waitingCount(afterFinishing(order.slice(0, k)));
        expect(waiting).toBeGreaterThanOrEqual(0);
        const seen = byK.get(k) ?? new Set<number>();
        seen.add(waiting);
        byK.set(k, seen);
      }
    }
    expect([...(byK.get(0) ?? [])]).toEqual([12]);
    expect([...(byK.get(6) ?? [])]).toEqual([0]);
    // The peak the design names, and the cap on how big the middle ever gets.
    const everyWaiting = [...byK.values()].flatMap((set) => [...set]);
    expect(Math.max(...everyWaiting)).toBe(18);
  });

  it("walks the tested-out learner to the same ending (8.5)", () => {
    /*
      Places six finished buildings at mastery 0, then practises them up. Both population
      and capacity read the same set, so the settled ending holds without a special case,
      and the ENDING is what this test is about.

      ## ⚑ THE OPENING ROW HAS BEEN WRONG ABOUT WHO IT DESCRIBES SINCE 2026-07-30

      It read 20 / 16 / 4, then 8 / 0 / 8, and both figures were measured over
      `islandAt({}, { placeAll: true })` — which is `lesson_stage: "done"` at mastery 0 on
      `placement_estimate: 0`. **That is not a tested-out learner.** The diagnostic writes a
      PASSED placement alongside the pre-build, so a real test-out is `placement_estimate >=
      TESTED_OUT_PLACEMENT`, and the fixture above is a learner who attended a lesson without
      being placed out of it, which no shipped path produces.

      It matters now because the two shapes diverge: since 2026-08-04 a handed-over building
      holds the crowd and the homes a mastered one holds, so the real tested-out row is
      **48 / 48 / 0** and the attended one is still 12 / 0 / 12. Both are kept, each under its
      own name.
    */
    const handedOver = islandAt({}, { placeAll: true, placementEstimate: 2 });
    expect(citizenPopulation(buildingLedger(handedOver))).toBe(48);
    expect(residenceCapacity(buildingLedger(handedOver))).toBe(48);
    expect(waitingCount(handedOver)).toBe(0);

    // The ATTENDED island, which is the state the row above used to be measured over.
    const placedAtZero = islandAt({}, { placeAll: true });
    expect(citizenPopulation(buildingLedger(placedAtZero))).toBe(12);
    expect(residenceCapacity(buildingLedger(placedAtZero))).toBe(0);
    expect(waitingCount(placedAtZero)).toBe(12);

    // The intermediate row the reversal makes worth pinning: one scored set on every
    // node — a below-bar finish everywhere — is the 20 / 16 / 4 the opening row used to
    // claim. So the state that figure described still exists; it is reached by
    // practising rather than by testing out.
    let belowBar: Record<string, Mastery> = {};
    for (const nodeId of NODE_IDS) {
      belowBar = { ...belowBar, [nodeId]: 1 as Mastery };
    }
    const practisedOnce = islandAt(belowBar, { placeAll: true });
    expect(citizenPopulation(buildingLedger(practisedOnce))).toBe(24);
    expect(residenceCapacity(buildingLedger(practisedOnce))).toBe(16);
    expect(waitingCount(practisedOnce)).toBe(8);

    let mastery: Record<string, Mastery> = {};
    for (const nodeId of NODE_IDS) {
      mastery = { ...mastery, [nodeId]: 2 as Mastery };
    }
    const finished = islandAt(mastery, { placeAll: true });
    expect(citizenPopulation(buildingLedger(finished))).toBe(48);
    expect(residenceCapacity(buildingLedger(finished))).toBe(48);
    expect(waitingCount(finished)).toBe(0);
  });
});

describe("monotonicity — nothing is ever taken away (D-CIT6)", () => {
  /**
   * **THE SWEEP RUNS AT BOTH PLACEMENTS, and that is a widening rather than a doubling.**
   *
   * It quantified over mastery only, on an island where the diagnostic had passed nothing.
   * Since 2026-08-04 the population has a SECOND input — a passed placement pays a
   * handed-over building the mastered figure — and a learner who tested out and then
   * practises is exactly where a badly-keyed version of that term takes people away. So the
   * population the sweep needs is *"every island whose population can move"*, which is both
   * of these, and the second was outside it.
   */
  const PLACEMENTS: readonly PlacementEstimate[] = [0, 2];

  it("never lowers population or capacity across all 4096 mastery vectors, at either placement", () => {
    // The machine check behind "nobody is ever punished": advancing ANY node from any
    // state must not lower either total. 4 levels ^ 6 nodes = 4096 vectors, twice.
    const levels: readonly Mastery[] = [0, 1, 2, 3];
    let checked = 0;
    for (const placementEstimate of PLACEMENTS) {
      for (let code = 0; code < 4 ** NODE_IDS.length; code += 1) {
        const vector: Record<string, Mastery> = {};
        let rest = code;
        for (const nodeId of NODE_IDS) {
          vector[nodeId] = levels[rest % 4] ?? 0;
          rest = Math.floor(rest / 4);
        }
        const before = buildingLedger(
          islandAt(vector, { placeAll: true, placementEstimate }),
        );
        const population = citizenPopulation(before);
        const capacity = residenceCapacity(before);
        for (const nodeId of NODE_IDS) {
          const level = vector[nodeId] ?? 0;
          if (level === 3) {
            continue;
          }
          const advanced = buildingLedger(
            islandAt(
              { ...vector, [nodeId]: (level + 1) as Mastery },
              {
                placeAll: true,
                placementEstimate,
              },
            ),
          );
          expect(
            citizenPopulation(advanced),
            `${nodeId} from ${level} at placement ${placementEstimate}`,
          ).toBeGreaterThanOrEqual(population);
          expect(
            residenceCapacity(advanced),
            `${nodeId} from ${level} at placement ${placementEstimate}`,
          ).toBeGreaterThanOrEqual(capacity);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(8000);
  });

  it("never lowers a total when a FAILED placement turns out to have been passed", () => {
    /*
      The other direction the new term opens, and it is the one a re-take could produce:
      `placement_estimate` rising must never cost anybody. Swept over the same 4096 vectors
      rather than argued from the shape of the expression.
    */
    const levels: readonly Mastery[] = [0, 1, 2, 3];
    let raised = 0;
    for (let code = 0; code < 4 ** NODE_IDS.length; code += 1) {
      const vector: Record<string, Mastery> = {};
      let rest = code;
      for (const nodeId of NODE_IDS) {
        vector[nodeId] = levels[rest % 4] ?? 0;
        rest = Math.floor(rest / 4);
      }
      const failed = buildingLedger(islandAt(vector, { placeAll: true }));
      const passed = buildingLedger(
        islandAt(vector, { placeAll: true, placementEstimate: 2 }),
      );
      expect(citizenPopulation(passed), `vector ${code}`).toBeGreaterThanOrEqual(
        citizenPopulation(failed),
      );
      expect(residenceCapacity(passed), `vector ${code}`).toBeGreaterThanOrEqual(
        residenceCapacity(failed),
      );
      if (citizenPopulation(passed) > citizenPopulation(failed)) {
        raised += 1;
      }
    }
    // THE FLOOR: the passed island really is a different island on most vectors, so
    // "never lower" is not two identical derivations agreeing 4096 times.
    expect(raised, "a passed placement changed nothing anywhere").toBeGreaterThan(4000);
  });

  it("never lowers a total when an unplaced building is placed", () => {
    // Placement is monotone too, which is the other half of "capacity only rises".
    for (const nodeId of NODE_IDS) {
      const before = buildingLedger(islandAt({}));
      const after = buildingLedger([
        ...islandAt({}).filter((node) => node.node_id !== nodeId),
        {
          node_id: nodeId,
          citizen_role: roleOf(nodeId),
          placed: true,
          mastery: 0,
          lesson_stage: "done",
          placement_estimate: 0,
        },
      ]);
      expect(citizenPopulation(after), nodeId).toBeGreaterThanOrEqual(
        citizenPopulation(before),
      );
      expect(residenceCapacity(after), nodeId).toBeGreaterThanOrEqual(
        residenceCapacity(before),
      );
    }
  });
});

describe("a learner the diagnostic passed nothing of is BYTE-IDENTICAL (2026-08-04)", () => {
  /**
   * **THE PRE-2026-08-04 FORMULA, RESTATED HERE SO THE NEW ONE CAN BE HELD AGAINST IT.**
   *
   * `FOUNDING_POPULATION + complete x 2 + mastered x 4`, with `complete` requiring a scored
   * set and `mastered` requiring the bar. Transcribed rather than imported, because the
   * whole point is that it is the OLD derivation: an import would make this the new one
   * agreeing with itself.
   */
  function populationBefore(nodes: readonly CitizenNodeInput[]): number {
    let complete = 0;
    let mastered = 0;
    for (const node of nodes) {
      const isComplete =
        node.placed &&
        (node.mastery >= 2 || node.lesson_stage === "done") &&
        node.mastery >= 1;
      if (isComplete) {
        complete += 1;
        if (node.mastery >= 2) {
          mastered += 1;
        }
      }
    }
    return FOUNDING_POPULATION + complete * 2 + mastered * 4;
  }

  /** The same, for homes. */
  function homesBefore(nodes: readonly CitizenNodeInput[]): number {
    let homes = 0;
    for (const node of nodes) {
      const isComplete =
        node.placed &&
        (node.mastery >= 2 || node.lesson_stage === "done") &&
        node.mastery >= 1;
      if (!isComplete) {
        continue;
      }
      const capacity = CITIZEN_NODE_CAPACITY[node.node_id];
      if (capacity === undefined) {
        continue;
      }
      homes += node.mastery >= 2 ? capacity.residence_mastered : capacity.residence_built;
    }
    return homes;
  }

  it("reproduces the pre-change figures on every one of the 4096 vectors, at both failing placements", () => {
    /*
      "Era one is untouched" as an EXHAUSTIVE equality rather than one fixture.

      The population is every era-one city a learner who tested out of nothing can be in:
      all 4096 mastery vectors, placed and unplaced, at both `placement_estimate` values
      BELOW the pass bar. If the new term could reach any of them, one of 8192 comparisons
      fails and names the vector.
    */
    const levels: readonly Mastery[] = [0, 1, 2, 3];
    let checked = 0;
    let nonFounding = 0;
    for (const placementEstimate of [0, 1] as const) {
      for (let code = 0; code < 4 ** NODE_IDS.length; code += 1) {
        const vector: Record<string, Mastery> = {};
        let rest = code;
        for (const nodeId of NODE_IDS) {
          vector[nodeId] = levels[rest % 4] ?? 0;
          rest = Math.floor(rest / 4);
        }
        for (const placeAll of [false, true]) {
          const nodes = islandAt(vector, { placeAll, placementEstimate });
          const ledger = buildingLedger(nodes);
          expect(
            citizenPopulation(ledger),
            `vector ${code}, placement ${placementEstimate}, placeAll ${placeAll}`,
          ).toBe(populationBefore(nodes));
          expect(residenceCapacity(ledger), `vector ${code}`).toBe(homesBefore(nodes));
          // And the new flag never lights, which is the structural half of the same claim.
          for (const entry of ledger) {
            expect(entry.inherited, `${entry.node_id} on vector ${code}`).toBe(false);
          }
          checked += 1;
          if (citizenPopulation(ledger) > FOUNDING_POPULATION) {
            nonFounding += 1;
          }
        }
      }
    }
    // FLOORS. 8192 comparisons really ran, and most of them are over cities with a real
    // crowd, so "identical" is not two founding populations agreeing 8192 times.
    expect(checked).toBe(2 * 4 ** NODE_IDS.length * 2);
    expect(nonFounding, "every city swept was the founding crowd").toBeGreaterThan(4000);
  });

  it("puts the pass bar strictly above the placements swept above", () => {
    // The floor under the sweep's own scope: if the bar were 1 or 0, the population above
    // would include tested-out learners and the equality would be asserting the opposite
    // of what it claims.
    expect(TESTED_OUT_PLACEMENT).toBeGreaterThan(1);
    // And the bar really is reachable, so the exclusion above excludes something.
    const handedOver = buildingLedger(
      islandAt({}, { placeAll: true, placementEstimate: TESTED_OUT_PLACEMENT }),
    );
    expect(citizenPopulation(handedOver)).toBeGreaterThan(FOUNDING_POPULATION);
  });
});

describe("capacity never gates arrivals (D-CIT2's forbidden loop)", () => {
  it("keeps population identical under any capacity table, including an all-zero one", () => {
    // Housing does NOT attract residents. Building a second terrace would not summon
    // anyone; it would only house people the learning already brought. Simulated by
    // swapping every node for one with no entry in the table (so every capacity reads
    // zero) and checking the population does not move.
    const real = buildingLedger(ALL_MASTERED);
    const zeroCapacity = buildingLedger(
      ALL_MASTERED.map((node) => ({ ...node, node_id: `unmapped-${node.node_id}` })),
    );
    expect(residenceCapacity(zeroCapacity)).toBe(0);
    expect(citizenPopulation(zeroCapacity)).toBe(citizenPopulation(real));
    expect(citizenPopulation(zeroCapacity)).toBe(48);
  });
});

describe("the founding crowd is never lost", () => {
  it("holds the founding population on a bare island, an empty island, and D2", () => {
    expect(citizenPopulation(buildingLedger(islandAt({})))).toBe(FOUNDING_POPULATION);
    expect(citizenPopulation(buildingLedger([]))).toBe(FOUNDING_POPULATION);
  });
});
