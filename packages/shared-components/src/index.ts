import type { StudentNodeState } from "@cr/state-schema";
import { createElement, type ReactElement } from "react";

export { canonicalizeRootGlyphInput } from "./root-glyph-input";

export type AnswerType =
  | "numeric"
  | "expression"
  | "solution_set"
  | "interval"
  | "equation_form"
  | "point"
  | "multiple_choice"
  | "rational_answer"
  | "graph"
  | "number_line"
  | "expr_builder"
  | "multipart";
export type EquivalenceMode = "exact_value" | "symbolic" | "structural" | "none";
export type Representation = "any" | "fraction" | "decimal" | "exact" | "percent";
export type RequiredNotation = "none" | "interval" | "set_builder";
export type UnitPolicy = "none" | "required_exact_unit";
export type AnswerStatus =
  | "correct"
  | "incorrect"
  | "invalid_input"
  | "unsupported_expression"
  | "scoring_error";

export interface AnswerSpec {
  answer_type: AnswerType;
  equivalence: EquivalenceMode;
  representation: Representation;
  simplification: "none" | string;
  required_form: string | null;
  required_notation: RequiredNotation;
  precision: {
    mode: "decimal_places" | "sig_figs";
    value: number;
    rounding: "half_up";
  } | null;
  unit_policy: UnitPolicy;
}

export interface CheckAnswerInput {
  raw_answer: unknown;
  item_version_id: string;
  equivalence_checker_version: number;
}

export interface CheckAnswerResult {
  status: AnswerStatus;
  reason_code: string;
  client_correct: boolean;
  checker_version: number;
}

export type AnswerChecker = (input: CheckAnswerInput) => CheckAnswerResult;

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphSpec {
  functions?: readonly {
    id: string;
    expression: string;
  }[];
  points?: readonly GraphPoint[];
  domain?: readonly [number, number];
  range?: readonly [number, number];
  gridlines?: boolean;
}

export interface GraphResponse {
  functions: readonly string[];
  points: readonly GraphPoint[];
  transformations: readonly string[];
}

export interface GraphWidgetProps {
  mode: "plot" | "read" | "manipulate";
  spec: GraphSpec;
  onInteract?: (state: GraphResponse) => void;
  onSubmit?: (response: GraphResponse) => void;
}

/** Accessible interface stub; the scored SVG implementation remains lane-owned. */
export function GraphWidget({ mode }: GraphWidgetProps): ReactElement {
  return createElement(
    "figure",
    { "data-graph-mode": mode },
    createElement(
      "svg",
      {
        role: "img",
        viewBox: "0 0 320 180",
        "aria-label": `Graph workspace in ${mode} mode`,
      },
      createElement("title", null, "Graph workspace"),
      createElement("path", {
        d: "M24 90H296M160 16V164",
        stroke: "currentColor",
        opacity: 0.35,
      }),
    ),
  );
}

export type ReadinessScope = "foundational" | "product";

export interface StateClient {
  getNodeState(nodeId: string): Promise<StudentNodeState | null>;
  getDomainStates(domain: string): Promise<readonly StudentNodeState[]>;
  isDomainReady(domain: string): Promise<boolean>;
  isReady(scope: ReadinessScope): Promise<boolean>;
}

export {
  checkAnswer,
  configureAnswerChecker,
  createVersionedAnswerChecker,
} from "./answer-checker-registry";
export type { AnswerDefinition } from "./checker-core";
/**
 * Exported for the bank-wide additivity guard in `@cr/item-bank`
 * (`implicitProductAdditive.test.ts`), which has to run this exact rewrite over every authored
 * key and every declared symbol set. `mathjs` stays behind `checker-core.ts` — the only file
 * in the repo that imports it — so the parse-level half of that guard stays in this package.
 */
export { insertImplicitProductStar } from "./checker-core";
export {
  createD1AnswerChecker,
  D1_CHECKER_VERSION,
  type D1AnswerDefinition,
  type D1CheckerOptions,
  type D1ItemVersion,
  type D1NodeId,
} from "./d1-answer-checker";
export {
  D1_GOLDEN_CASES,
  D1_SPIKE_ITEMS,
  type D1GoldenCase,
} from "./d1-checker-fixtures";
export {
  createGraphComparator,
  GRAPH_COMPARATOR_VERSION,
  type GraphCheckInput,
  type GraphCheckResult,
  type GraphComparator,
  type GraphComparatorOptions,
  type GraphCurve,
  type GraphExpected,
  type GraphFeatureKind,
  type GraphItemVersion,
  type GraphResponsePayload,
  graphSampleXs,
  type RegionMembership,
  type RegionProbe,
  type ScoredFeature,
  scoreGraphResponse,
} from "./graph-comparator";
export {
  GRAPH_FALSE_POSITIVE_CASES,
  GRAPH_GOLDEN_CASES,
  GRAPH_SPIKE_ITEMS,
  type GraphGoldenCase,
} from "./graph-comparator-fixtures";
export {
  GraphInput,
  type GraphInputProps,
  type GraphInputSubmission,
} from "./graph-input";
export {
  type GraphWorkspace,
  sampleSmoothCurve,
  seedControlXs,
  toGraphWorkspace,
} from "./graph-workspace";
export {
  createInteractiveAnswerChecker,
  INTERACTIVE_CHECKER_VERSION,
  type InteractiveCheckerOptions,
  type InteractiveItemVersion,
} from "./interactive/checker";
export { exprBuilderInteractiveModule } from "./interactive/modules/expr-builder";
export {
  type CoeffRadicalSpec,
  canonicalExprBuilderPayload,
  EXPR_BUILDER_COMPARATOR_VERSION,
  type ExprBuilderPayload,
  type ExprBuilderSlot,
  type ExprBuilderSlotRole,
  type ExprBuilderSpec,
  type ExprBuilderWorkspace,
  type PositivePowerSpec,
  type RadicalFormSpec,
  type RationalPowerSpec,
  scoreExprBuilderResponse,
  toExprBuilderWorkspace,
  validateExprBuilderSpec,
} from "./interactive/modules/expr-builder/comparator";
export { graphInteractiveModule } from "./interactive/modules/graph";
export { numberLineInteractiveModule } from "./interactive/modules/number-line";
export {
  canonicalNumberLinePayload,
  NUMBER_LINE_COMPARATOR_VERSION,
  type NumberLineExpected,
  type NumberLineInterval,
  type NumberLinePayload,
  type NumberLineWorkspace,
  scoreNumberLineResponse,
  toNumberLineWorkspace,
  validateNumberLineExpected,
} from "./interactive/modules/number-line/comparator";
export {
  canonicalInteractivePayload,
  getInteractiveModule,
  INTERACTIVE_ANSWER_TYPES,
  isInteractiveAnswerType,
} from "./interactive/registry";
export type {
  InteractiveAnswerModule,
  InteractiveCheckSubmission,
  InteractiveComparator,
  InteractiveInputProps,
} from "./interactive/types";
export {
  compareIntervalLists,
  endpointEqual,
  type Interval,
} from "./interval-helpers";
export {
  MathInput,
  type MathInputProps,
  type MathInputSubmission,
} from "./math-input";
export {
  createProductAnswerChecker,
  /**
   * Exported for the same reason as `foldRenderedMinus` below: the CFU card compares against a
   * hand-authored accepted list BEFORE any checker is reached, so a rule about punctuation that
   * lives only inside `checkProductDefinition` cannot get there, and the two surfaces would go
   * on disagreeing about the same period. One normalizer, two entry points.
   */
  foldTerminalPeriod,
  PRODUCT_CHECKER_VERSION,
  type ProductCheckerOptions,
  type ProductItemVersion,
} from "./product-answer-checker";
export {
  PRODUCT_GOLDEN_CASES,
  PRODUCT_SPIKE_ITEMS,
  type ProductGoldenCase,
} from "./product-checker-fixtures";
/**
 * Exported because the CFU card in `apps/web` has to fold the glyph BEFORE its own numeric-literal
 * gate, which answers and returns before any checker is reached, so the fold inside
 * `checkProductDefinition` cannot get there. One normalizer, two entry points.
 */
export { foldRenderedMinus, foldRenderedMinusInAnswer } from "./unicode-minus";
