import type { ComponentType, ReactNode } from "react";

import type { AnswerType, CheckAnswerResult } from "../index";

/**
 * The reusable contract every interactive answer type implements. It is the
 * generalization of the graph path (`graph-comparator.ts` + `graph-workspace.ts`
 * + `graph-input.tsx`): an author declares a private answer spec (the answer key),
 * the server projects an answer-free {@link toWorkspace} view for the client, the
 * widget emits a structured payload, and {@link compare} scores that payload
 * against the spec deterministically.
 *
 * A module is a thin, pure adapter over an existing comparator + workspace + input
 * component; introducing it must not change how any existing answer type grades.
 *
 * @typeParam TSpec      The private, author-declared spec (holds the answer key).
 * @typeParam TWorkspace The answer-free description handed to the client widget.
 * @typeParam TPayload   The structured response the widget emits.
 */
export interface InteractiveAnswerModule<
  TSpec = unknown,
  TWorkspace = unknown,
  TPayload = unknown,
> {
  /** The {@link AnswerType} id this module grades (e.g. `"graph"`). */
  answer_type: AnswerType;
  /** The comparator version this module scores at (aligns with the checker). */
  comparator_version: number;
  /**
   * Project the answer-free workspace a client widget renders from the private
   * spec. Must strip every answer value (the client never receives the key).
   */
  toWorkspace(spec: TSpec): TWorkspace;
  /**
   * Score a widget-emitted payload against the private spec. MUST be pure and
   * MUST NOT throw on any input (malformed payloads fail closed as a result).
   */
  compare(spec: TSpec, payload: unknown): CheckAnswerResult;
  /**
   * Authoring-time validation of the spec itself. Returns a failing result when
   * the spec is not gradeable (fail closed), or `undefined` when it is valid.
   */
  validateSpec(spec: TSpec): CheckAnswerResult | undefined;
  /**
   * The canonical correct payload for a spec — the answer key projected as a widget
   * payload. Used by authoring validation to self-check an interactive item pool
   * (`canonicalCorrectAnswer` in the item bank grades this through the checker).
   * OPTIONAL: a self-checking module whose widget owns its own submission (e.g. the
   * graph module) may omit it.
   */
  canonicalPayload?(spec: TSpec): TPayload;
  /** The interactive input component (maps {@link InteractiveInputProps}). */
  Input: ComponentType<InteractiveInputProps<TWorkspace, TPayload>>;
}

/** The submission an interactive input reports once a payload has been scored. */
export interface InteractiveCheckSubmission<TPayload = unknown> {
  value: TPayload;
  result: CheckAnswerResult;
}

/**
 * The scoring seam handed to an interactive input: it holds the answer key
 * server-side and returns a verdict for a submitted payload, so the widget never
 * sees the spec. Shaped like the existing graph/text comparators.
 */
export type InteractiveComparator = (input: {
  response: unknown;
  item_version_id: string;
  equivalence_checker_version: number;
}) => CheckAnswerResult;

/** The uniform props every interactive input component accepts. */
export interface InteractiveInputProps<TWorkspace = unknown, TPayload = unknown> {
  itemVersionId: string;
  /** Answer-free description of what to elicit (from {@link InteractiveAnswerModule.toWorkspace}). */
  workspace: TWorkspace;
  /** The current payload (controlled inputs); `null` before the student answers. */
  value: TPayload | null;
  /** Report an updated payload as the student edits (controlled inputs). */
  onChange: (value: TPayload) => void;
  /**
   * The widget's own visible heading, for a host that is NOT already showing the
   * question. OPTIONAL, and a practice surface leaves it off: it renders the prompt
   * itself, typeset, so a widget that printed the same string again put the problem on
   * screen twice, the second time as raw LaTeX. Such a host passes {@link labelledBy}
   * instead, naming the element it already drew.
   */
  label?: string;
  /**
   * The id of an element OUTSIDE the widget that already names it (the host's rendered
   * prompt). A widget with no `label` points its control group's `aria-labelledby` here,
   * so the group keeps exactly one accessible name without duplicating the text.
   */
  labelledBy?: string;
  disabled?: boolean;
  /** The injected scoring seam (holds the answer key). */
  comparator?: InteractiveComparator;
  /** Report a scored submission (self-checking inputs, e.g. the graph widget). */
  onChecked?: (submission: InteractiveCheckSubmission<TPayload>) => void;
  feedbackMode?: "immediate" | "record-only";
  /**
   * Typeset a LaTeX string, supplied by the host. Optional and purely presentational:
   * a widget that shows the student the expression they are assembling can render it as
   * real notation instead of ASCII, without this package taking on a math-rendering
   * dependency (KaTeX lives in the web app, which passes its own renderer down). A
   * widget MUST still be fully usable and self-describing when it is absent, and this
   * never touches a payload, a comparator or a verdict.
   */
  renderMath?: (latex: string) => ReactNode;
}
