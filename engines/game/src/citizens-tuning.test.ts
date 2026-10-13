import { describe, expect, it } from "vitest";

import {
  CITIZEN_NODE_CAPACITY,
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  type CitizenCapacity,
  capacityForNode,
  EMPTY_CITIZEN_CAPACITY,
  ENDGAME_SPARE_HOMES,
  FOUNDING_POPULATION,
  HUB_DAYTIME_CAPACITY,
  MAX_RENDERED_CITIZENS,
} from "./citizens-tuning";
import { resolveNeighborhood } from "./descriptors";

/** The six D1 nodes, in registry order. */
const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/**
 * Read the RAW table entry, not `capacityForNode`'s zero fallback: these assertions
 * are about what the table itself authors, and a missing row must fail loudly rather
 * than read as a legitimate all-zero building. (The repo runs
 * `noUncheckedIndexedAccess`, so an index into a `Record<string, …>` is
 * `T | undefined`; this is the throw that narrows it.)
 */
function entry(nodeId: string): CitizenCapacity {
  const capacity = CITIZEN_NODE_CAPACITY[nodeId];
  if (!capacity) {
    throw new Error(`CITIZEN_NODE_CAPACITY has no entry for ${nodeId}`);
  }
  return capacity;
}

describe("citizen tuning table (D-CIT14)", () => {
  it("gives every D1 node a capacity entry, and an unlisted node zero", () => {
    for (const nodeId of D1_NODES) {
      expect(CITIZEN_NODE_CAPACITY[nodeId], nodeId).toBeDefined();
    }
    // A future island's node is not a crash: it houses nobody until authored.
    expect(capacityForNode("EXP.1")).toEqual(EMPTY_CITIZEN_CAPACITY);
    expect(capacityForNode(undefined)).toEqual(EMPTY_CITIZEN_CAPACITY);
    expect(capacityForNode(null).residence_mastered).toBe(0);
  });

  it("houses nobody in the school or the park, built or mastered (load-bearing zero)", () => {
    // Design section 8.5: this zero is precisely what makes the mid-game crowd
    // appear. Spreading housing here is the tempting fix section 15 rejects.
    for (const nodeId of ["NUM.3", "NUM.4"] as const) {
      expect(entry(nodeId).residence_built, nodeId).toBe(0);
      expect(entry(nodeId).residence_mastered, nodeId).toBe(0);
    }
  });

  it("keeps the capacity table and the descriptor's role map in agreement", () => {
    // The two halves of a building's social identity live in different files by
    // design (role = identity, in the descriptor; capacity = number, here), so this
    // pins the one relationship that must hold across the seam: the island's main
    // housing must be the node the descriptor calls a `residence`, and a `school`
    // never houses anyone. Without this, the two files could drift silently.
    const roleByNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot.citizen_role]),
    );
    const biggest = D1_NODES.reduce((best, nodeId) =>
      entry(nodeId).residence_mastered > entry(best).residence_mastered ? nodeId : best,
    );
    expect(roleByNode.get(biggest)).toBe("residence");
    for (const [nodeId, role] of roleByNode) {
      if (role === "school") {
        expect(entry(nodeId).residence_mastered, nodeId).toBe(0);
      }
    }
  });

  it("makes mastery strictly better than building, for every housing node (D-CIT15)", () => {
    const housing = D1_NODES.filter((nodeId) => entry(nodeId).residence_built > 0);
    // Four of the six carry flats; the rowhouse carries most of them.
    expect(housing).toHaveLength(4);
    for (const nodeId of housing) {
      const capacity = entry(nodeId);
      expect(capacity.residence_mastered, nodeId).toBeGreaterThan(capacity.residence_built);
    }
  });

  it("makes the mastery population term strictly larger than the build term (D-CIT2)", () => {
    expect(CITIZENS_PER_MASTERED_SKILL).toBeGreaterThan(CITIZENS_PER_COMPLETE_BUILDING);
    // Design section 8.1: twice the build term, so the ordering is visible rather
    // than arithmetic.
    expect(CITIZENS_PER_MASTERED_SKILL).toBe(CITIZENS_PER_COMPLETE_BUILDING * 2);
  });

  it("totals the island's two capacity ledgers to the settled figures (8.2, 8.3)", () => {
    const sum = (read: (nodeId: (typeof D1_NODES)[number]) => number) =>
      D1_NODES.reduce((total, nodeId) => total + read(nodeId), 0);
    expect(sum((n) => entry(n).residence_built)).toBe(16);
    expect(sum((n) => entry(n).residence_mastered)).toBe(48);
    // Daytime includes the hub's small staff, and does not grow with mastery.
    expect(sum((n) => entry(n).daytime) + HUB_DAYTIME_CAPACITY).toBe(44);
  });

  it("opens on a crowd, ends exactly full, and caps only rendering", () => {
    expect(FOUNDING_POPULATION).toBe(12);
    // The settled ending is exactly full: an island with empty houses reads hollow.
    expect(ENDGAME_SPARE_HOMES).toBe(0);
    // D-CIT20: the cap's only job is to be unreachable on D1, where the population
    // tops out at 44. A safety net that is routinely load-bearing is a design limit
    // in disguise.
    expect(MAX_RENDERED_CITIZENS).toBeGreaterThan(44);
  });
});
