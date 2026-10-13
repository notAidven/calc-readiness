import { describe, expect, it } from "vitest";

import { GRAPH_COMPARATOR_VERSION, scoreGraphResponse } from "./graph-comparator";
import { GRAPH_GOLDEN_CASES, GRAPH_SPIKE_ITEMS } from "./graph-comparator-fixtures";
import { toGraphWorkspace } from "./graph-workspace";
import {
  type AnswerSpec,
  type AnswerType,
  createInteractiveAnswerChecker,
  createProductAnswerChecker,
  getInteractiveModule,
  graphInteractiveModule,
  INTERACTIVE_ANSWER_TYPES,
  INTERACTIVE_CHECKER_VERSION,
  type InteractiveItemVersion,
  isInteractiveAnswerType,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./index";

/**
 * The reusable interactive-answer spine (Phases 0-2). These tests pin the two hard
 * guarantees of this PR: (1) a `graph` item grades BYTE-IDENTICALLY through the new
 * module + registry + interactive-checker path as it does through the geometric
 * comparator directly, and (2) the product checker's behavior is unchanged for
 * every existing item (none set `interactive_spec`) while routing interactive items.
 */

const GRAPH_ANSWER_SPEC: AnswerSpec = {
  answer_type: "graph",
  equivalence: "structural",
  representation: "any",
  simplification: "none",
  required_form: null,
  required_notation: "none",
  precision: null,
  unit_policy: "none",
};

const TEXT_ANSWER_TYPES: readonly AnswerType[] = [
  "numeric",
  "expression",
  "solution_set",
  "interval",
  "equation_form",
  "point",
  "multiple_choice",
  "rational_answer",
  "multipart",
];

function expectedFor(itemVersionId: string) {
  const item = GRAPH_SPIKE_ITEMS.find((entry) => entry.item_version_id === itemVersionId);
  if (!item) {
    throw new Error(`fixture missing: ${itemVersionId}`);
  }
  return item.expected;
}

describe("interactive registry", () => {
  it("registers graph as an interactive answer type", () => {
    expect(isInteractiveAnswerType("graph")).toBe(true);
    expect(getInteractiveModule("graph")).toBe(graphInteractiveModule);
    expect(INTERACTIVE_ANSWER_TYPES.graph).toBe(graphInteractiveModule);
  });

  it("does not treat text answer types as interactive", () => {
    for (const type of TEXT_ANSWER_TYPES) {
      expect(isInteractiveAnswerType(type)).toBe(false);
      expect(getInteractiveModule(type)).toBeUndefined();
    }
  });

  it("exposes the graph module contract", () => {
    expect(graphInteractiveModule.answer_type).toBe("graph");
    expect(graphInteractiveModule.comparator_version).toBe(GRAPH_COMPARATOR_VERSION);
    expect(typeof graphInteractiveModule.Input).toBe("function");
  });
});

describe("graph module adapter (behavior-preserving)", () => {
  it.each(GRAPH_GOLDEN_CASES)(
    "$name grades identically through the module + registry as directly",
    ({ item_version_id, response }) => {
      const expected = expectedFor(item_version_id);
      const direct = scoreGraphResponse(expected, response);
      expect(graphInteractiveModule.compare(expected, response)).toEqual(direct);
      const fromRegistry = getInteractiveModule("graph");
      expect(fromRegistry?.compare(expected, response)).toEqual(direct);
    },
  );

  it("delegates toWorkspace to toGraphWorkspace", () => {
    const expected = expectedFor("graph:pol-5:parabola:v2");
    expect(graphInteractiveModule.toWorkspace(expected)).toEqual(
      toGraphWorkspace(expected),
    );
  });

  it("validateSpec passes a valid spec and fails closed on an empty one", () => {
    const expected = expectedFor("graph:pol-5:parabola:v2");
    expect(graphInteractiveModule.validateSpec(expected)).toBeUndefined();
    const empty = { ...expected, features: [] };
    expect(graphInteractiveModule.validateSpec(empty)).toMatchObject({
      status: "scoring_error",
      reason_code: "no_scored_features",
      checker_version: GRAPH_COMPARATOR_VERSION,
    });
  });

  it("never throws on a malformed spec", () => {
    expect(() => graphInteractiveModule.compare(undefined as never, {})).not.toThrow();
  });
});

describe("interactive answer checker", () => {
  const itemVersions: readonly InteractiveItemVersion[] = GRAPH_SPIKE_ITEMS.map((item) => ({
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    answer: { answer_spec: GRAPH_ANSWER_SPEC, interactive_spec: item.expected },
  }));
  const checker = createInteractiveAnswerChecker({ itemVersions });

  it("aligns to the shared v2 generation", () => {
    expect(INTERACTIVE_CHECKER_VERSION).toBe(2);
    expect(INTERACTIVE_CHECKER_VERSION).toBe(GRAPH_COMPARATOR_VERSION);
    expect(INTERACTIVE_CHECKER_VERSION).toBe(PRODUCT_CHECKER_VERSION);
  });

  it.each(GRAPH_GOLDEN_CASES)(
    "$name dispatches to the graph module",
    ({ item_version_id, response }) => {
      const expected = expectedFor(item_version_id);
      expect(
        checker({
          raw_answer: response,
          item_version_id,
          equivalence_checker_version: INTERACTIVE_CHECKER_VERSION,
        }),
      ).toEqual(scoreGraphResponse(expected, response));
    },
  );

  it("fails closed on a checker-version mismatch", () => {
    expect(
      checker({
        raw_answer: {},
        item_version_id: "graph:pol-5:parabola:v2",
        equivalence_checker_version: 1,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "checker_version_unsupported",
      checker_version: INTERACTIVE_CHECKER_VERSION,
    });
  });

  it("fails closed when the immutable item version is missing", () => {
    expect(
      checker({
        raw_answer: {},
        item_version_id: "graph:missing:v2",
        equivalence_checker_version: INTERACTIVE_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "item_version_not_found",
    });
  });

  it("reports unsupported when an item lacks an interactive_spec", () => {
    const bare = createInteractiveAnswerChecker({
      itemVersions: [
        {
          item_version_id: "graph:no-spec:v2",
          node_id: "POL.5",
          answer: { answer_spec: GRAPH_ANSWER_SPEC },
        },
      ],
    });
    expect(
      bare({
        raw_answer: {},
        item_version_id: "graph:no-spec:v2",
        equivalence_checker_version: INTERACTIVE_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "unsupported_expression",
      reason_code: "unsupported_answer_type",
    });
  });
});

describe("product checker interactive routing (behavior-preserving)", () => {
  it("still bails a graph item with no interactive_spec to the geometric comparator", () => {
    const checker = createProductAnswerChecker({
      itemVersions: [
        {
          item_version_id: "prod:graph:no-spec:v2",
          node_id: "POL.5",
          answer: { answer_spec: GRAPH_ANSWER_SPEC },
        },
      ],
    });
    expect(
      checker({
        raw_answer: "{}",
        item_version_id: "prod:graph:no-spec:v2",
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "unsupported_expression",
      reason_code: "graph_uses_geometric_comparator",
    });
  });

  it("routes a graph item WITH an interactive_spec through the module", () => {
    const parabola = GRAPH_GOLDEN_CASES.find(
      (entry) => entry.item_version_id === "graph:pol-5:parabola:v2",
    );
    if (!parabola) {
      throw new Error("fixture missing");
    }
    const expected = expectedFor("graph:pol-5:parabola:v2");
    const items: readonly ProductItemVersion[] = [
      {
        item_version_id: "prod:graph:spec:v2",
        node_id: "POL.5",
        answer: { answer_spec: GRAPH_ANSWER_SPEC, interactive_spec: expected },
      },
    ];
    const checker = createProductAnswerChecker({ itemVersions: items });
    expect(
      checker({
        raw_answer: parabola.response,
        item_version_id: "prod:graph:spec:v2",
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      }),
    ).toEqual(scoreGraphResponse(expected, parabola.response));
  });
});
