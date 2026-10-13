import {
  type AnswerDefinition,
  correct,
  evaluateNumeric,
  type InternalResult,
  incorrect,
  invalid,
  type MathNumericType,
  math,
  parseSafeExpression,
  prepareRawAnswer,
  representationIssue,
  scoringError,
  simplificationIssue,
  unsupported,
  withVersion,
} from "./checker-core";
import type { AnswerChecker, CheckAnswerInput, CheckAnswerResult } from "./index";

export const D1_CHECKER_VERSION = 1;

export type D1NodeId = "NUM.S" | "NUM.F" | "NUM.2" | "NUM.3" | "NUM.4" | "NUM.5";

/** The D1 answer definition is the shared {@link AnswerDefinition} shape. */
export type D1AnswerDefinition = AnswerDefinition;

export interface D1ItemVersion {
  item_version_id: string;
  node_id: D1NodeId;
  answer: D1AnswerDefinition;
}

export interface D1CheckerOptions {
  checkerVersion?: number;
  itemVersions: readonly D1ItemVersion[];
}

function compareNumeric(
  rawAnswer: unknown,
  definition: D1AnswerDefinition,
): InternalResult {
  if (definition.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }

  const submitted = prepareRawAnswer(rawAnswer, definition);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }

  const expected = prepareRawAnswer(definition.answer_key, definition);
  if (expected.result || !expected.parsed) {
    return scoringError("invalid_answer_key");
  }

  const submittedValue = evaluateNumeric(submitted.parsed);
  if (submittedValue.result || submittedValue.value === undefined) {
    return submittedValue.result ?? invalid("parse_error");
  }

  const expectedValue = evaluateNumeric(expected.parsed);
  if (expectedValue.result || expectedValue.value === undefined) {
    return scoringError("invalid_answer_key");
  }

  const representation = representationIssue(
    submitted.parsed,
    definition.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }

  const matches = math.equal(submittedValue.value, expectedValue.value);
  if (matches !== true) {
    const opposite = math.equal(
      submittedValue.value,
      math.unaryMinus(expectedValue.value) as MathNumericType,
    );
    return incorrect(opposite === true ? "sign_error" : "value_mismatch");
  }

  const safe = parseSafeExpression(submitted.parsed.expression, definition.allowed_symbols);
  if (safe.result || !safe.node) {
    return safe.result ?? invalid("parse_error");
  }

  return (
    simplificationIssue(
      submitted.parsed.expression,
      safe.node,
      definition.answer_spec.simplification,
    ) ?? correct()
  );
}

function symbolicRelation(
  left: string,
  right: string,
  allowedSymbols: readonly string[],
  operator: "-" | "+",
): { matches?: boolean; result?: InternalResult } {
  const leftNode = parseSafeExpression(left, allowedSymbols);
  if (leftNode.result) {
    return { result: leftNode.result };
  }

  const rightNode = parseSafeExpression(right, allowedSymbols);
  if (rightNode.result) {
    return { result: scoringError("invalid_answer_key") };
  }

  try {
    const normalized = math.rationalize(`(${left}) ${operator} (${right})`);
    return { matches: normalized.toString() === "0" };
  } catch {
    return { result: invalid("parse_error") };
  }
}

function compareExpression(
  rawAnswer: unknown,
  definition: D1AnswerDefinition,
): InternalResult {
  if (definition.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }

  const submitted = prepareRawAnswer(rawAnswer, definition);
  if (submitted.result || !submitted.parsed) {
    return submitted.result ?? invalid("parse_error");
  }

  const representation = representationIssue(
    submitted.parsed,
    definition.answer_spec.representation,
  );
  if (representation) {
    return representation;
  }

  const symbols = definition.allowed_symbols ?? [];
  const relation = symbolicRelation(
    submitted.parsed.expression,
    definition.answer_key,
    symbols,
    "-",
  );
  if (relation.result) {
    return relation.result;
  }

  if (!relation.matches) {
    const opposite = symbolicRelation(
      submitted.parsed.expression,
      definition.answer_key,
      symbols,
      "+",
    );
    return incorrect(opposite.matches ? "sign_error" : "value_mismatch");
  }

  const parsed = parseSafeExpression(submitted.parsed.expression, symbols);
  if (parsed.result || !parsed.node) {
    return parsed.result ?? invalid("parse_error");
  }

  return (
    simplificationIssue(
      submitted.parsed.expression,
      parsed.node,
      definition.answer_spec.simplification,
    ) ?? correct()
  );
}

function compareMultipleChoice(
  rawAnswer: unknown,
  definition: D1AnswerDefinition,
): InternalResult {
  if (definition.answer_key === undefined) {
    return scoringError("missing_answer_key");
  }

  if (typeof rawAnswer !== "string" || !rawAnswer.trim()) {
    return invalid("empty_answer");
  }

  return rawAnswer === definition.answer_key ? correct() : incorrect("value_mismatch");
}

function compareMultipart(
  rawAnswer: unknown,
  definition: D1AnswerDefinition,
): InternalResult {
  if (
    !rawAnswer ||
    typeof rawAnswer !== "object" ||
    Array.isArray(rawAnswer) ||
    !definition.parts?.length
  ) {
    return invalid("invalid_multipart_answer");
  }

  const submittedParts = rawAnswer as Record<string, unknown>;
  for (const part of definition.parts) {
    const result = checkDefinition(submittedParts[part.part_id], part.answer);
    if (result.status !== "correct") {
      return {
        ...result,
        reason_code: `${part.part_id}:${result.reason_code}`,
      };
    }
  }

  return correct();
}

function checkDefinition(
  rawAnswer: unknown,
  definition: D1AnswerDefinition,
): InternalResult {
  const spec = definition.answer_spec;
  if (
    spec.required_form !== null ||
    spec.required_notation !== "none" ||
    spec.precision !== null
  ) {
    return unsupported("unsupported_answer_constraints");
  }

  switch (spec.answer_type) {
    case "numeric":
      if (spec.equivalence !== "exact_value") {
        return unsupported("unsupported_equivalence_mode");
      }
      return compareNumeric(rawAnswer, definition);
    case "expression":
      if (spec.equivalence !== "symbolic") {
        return unsupported("unsupported_equivalence_mode");
      }
      return compareExpression(rawAnswer, definition);
    case "multiple_choice":
      if (spec.equivalence !== "none") {
        return unsupported("unsupported_equivalence_mode");
      }
      return compareMultipleChoice(rawAnswer, definition);
    case "multipart":
      if (spec.equivalence !== "none") {
        return unsupported("unsupported_equivalence_mode");
      }
      return compareMultipart(rawAnswer, definition);
    default:
      return unsupported("unsupported_answer_type");
  }
}

export function createD1AnswerChecker({
  checkerVersion = D1_CHECKER_VERSION,
  itemVersions,
}: D1CheckerOptions): AnswerChecker {
  const items = new Map(itemVersions.map((item) => [item.item_version_id, item]));

  return (input: CheckAnswerInput): CheckAnswerResult => {
    if (input.equivalence_checker_version !== checkerVersion) {
      return withVersion(scoringError("checker_version_unsupported"), checkerVersion);
    }

    const item = items.get(input.item_version_id);
    if (!item) {
      return withVersion(scoringError("item_version_not_found"), checkerVersion);
    }

    return withVersion(checkDefinition(input.raw_answer, item.answer), checkerVersion);
  };
}
