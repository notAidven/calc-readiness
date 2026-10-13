import type { AnswerType } from "@cr/components";
import { D1_ITEM_PACK } from "@cr/item-bank/src/d1";
import { getNodesByDomain } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  archetypeForAnswerType,
  type BuildingArchetypeId,
  resolveNeighborhood,
} from "./descriptors";

/**
 * The pinned, known-good binding of each D1 MVP node to (a) its authored
 * `answer_type` in the item bank and (b) the building archetype it must render
 * as. This snapshot is the city's contract with the item bank: if a future bank
 * edit changes a node's answer_type, or the answer_type→archetype mapping
 * changes, or the resolver stops sourcing the bank, an assertion below fails — so
 * the city can never silently drift from the items students actually answer.
 */
const EXPECTED_D1: Readonly<
  Record<string, { answer_type: AnswerType; archetype: BuildingArchetypeId }>
> = {
  "NUM.S": { answer_type: "numeric", archetype: "numeric" },
  "NUM.F": { answer_type: "numeric", archetype: "numeric" },
  "NUM.2": { answer_type: "numeric", archetype: "numeric" },
  "NUM.3": { answer_type: "expression", archetype: "constructed_response" },
  "NUM.4": { answer_type: "expression", archetype: "constructed_response" },
  "NUM.5": { answer_type: "numeric", archetype: "numeric" },
};

/** The authored answer_type per D1 node, read straight from the item bank. */
function bankAnswerTypeByNode(): Map<string, AnswerType> {
  const byNode = new Map<string, AnswerType>();
  for (const item of D1_ITEM_PACK) {
    const answerType = item.answer.answer_spec.answer_type;
    const existing = byNode.get(item.node_id);
    // The bank must be internally consistent: one answer-type family per node.
    expect(existing === undefined || existing === answerType).toBe(true);
    byNode.set(item.node_id, answerType);
  }
  return byNode;
}

describe("D1 building archetypes are derived from the item-bank answer_type", () => {
  it("pins exactly the six D1 MVP nodes", () => {
    const mvpNodeIds = getNodesByDomain("D1")
      .filter((node) => node.product_scope === "mvp")
      .map((node) => node.id)
      .sort();
    expect(mvpNodeIds).toEqual(Object.keys(EXPECTED_D1).sort());
  });

  it("maps every authored answer_type to its expected archetype", () => {
    const bank = bankAnswerTypeByNode();
    for (const [nodeId, expected] of Object.entries(EXPECTED_D1)) {
      const answerType = bank.get(nodeId);
      expect(answerType, `bank has an authored answer_type for ${nodeId}`).toBe(
        expected.answer_type,
      );
      expect(archetypeForAnswerType(expected.answer_type)).toBe(expected.archetype);
    }
  });

  it("FAILS if the item bank and the resolved building archetype disagree", () => {
    const bank = bankAnswerTypeByNode();
    const plotsByNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot]),
    );

    for (const [nodeId, expected] of Object.entries(EXPECTED_D1)) {
      const plot = plotsByNode.get(nodeId);
      expect(plot, `resolved a plot for ${nodeId}`).toBeDefined();

      const answerType = bank.get(nodeId);
      if (answerType === undefined) {
        throw new Error(`item bank has no authored answer_type for ${nodeId}`);
      }

      // Three-way agreement: bank answer_type → mapping → resolved archetype, and
      // all three equal the pinned snapshot. Any drift fails loudly.
      expect(plot?.archetype.id).toBe(archetypeForAnswerType(answerType));
      expect(plot?.archetype.id).toBe(expected.archetype);
    }
  });

  it("puts NUM.3 and NUM.4 (authored `expression`) in the expression workshop", () => {
    const plotsByNode = new Map(
      resolveNeighborhood("D1").plots.map((plot) => [plot.node_id, plot]),
    );
    for (const nodeId of ["NUM.3", "NUM.4"]) {
      const plot = plotsByNode.get(nodeId);
      expect(plot?.archetype.id).toBe("constructed_response");
      expect(plot?.archetype.silhouette).toBe("workshop");
      expect(plot?.archetype.label).toBe("Expression workshop");
    }
  });

  it("maps unhandled answer types to the generic fallback block", () => {
    expect(archetypeForAnswerType("graph")).toBe("generic");
    expect(archetypeForAnswerType("interval")).toBe("generic");
    expect(archetypeForAnswerType("multipart")).toBe("constructed_response");
  });
});
