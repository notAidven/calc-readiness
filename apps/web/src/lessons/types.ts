/**
 * App-local mini-lesson content shape for the runnable demo. The canonical home for
 * authored packs is `content/lessons/d1/`, which stays gated on instructional-design
 * review; this keeps just enough structure to display the teaching text in-browser.
 * Each lesson may end with a lightweight, self-contained check-your-understanding
 * question (teaching only). Practice items and mastery writes remain out of scope here.
 */

import type { AnswerSpec } from "@cr/components";

import type { LessonVisualId } from "./visuals";

export interface LessonVisualPlacement {
  /** Insert the visual after this mini_lesson paragraph index. */
  after: number;
  id: LessonVisualId;
  /**
   * When true, this visual is interactive and teaching cannot advance past its
   * paragraph until the widget reports completion (the NPC "Next" button stays
   * hidden). A paragraph may carry more than one gating visual, in which case
   * every one of them must complete before "Next" appears. Only meaningful for
   * interactive visuals that call `onComplete`.
   */
  gates?: boolean;
}

/**
 * The answer types a CFU's `check` may declare, which is exactly the types the product
 * checker can grade FROM ONE TEXT FIELD.
 *
 * It is narrower than `@cr/components`'s `AnswerType` by construction rather than by
 * choice, and the two absences are the same absence twice. `rational_answer` is graded
 * against an object payload (`{expression, excluded_values}`) and `multipart` against one
 * entry per `part_id`; a CFU card renders ONE `<input type="text">`, so neither has a
 * value the card could hand the checker. `docs/cfu-check-migration.md` records the thirteen
 * packs that stay on exact match for that reason, and names the string-to-payload adapter
 * as what they need. `multiple_choice` and the interactive types are left out for the
 * opposite reason: a choose-one answer is a word, and exact match against the pack's own
 * list is already the right grading for it.
 */
export type LessonCfuAnswerType =
  | "numeric"
  | "expression"
  | "interval"
  | "solution_set"
  | "point"
  | "equation_form";

export interface LessonCfuCheck {
  /**
   * How the shared checker compares the answer. See {@link LessonCfuAnswerType}; the
   * equivalence mode is DERIVED from this in `cfuChecker.ts` rather than authored, because
   * a type and a mode that disagree is a spec no comparator reads.
   */
  answer_type: LessonCfuAnswerType;
  /** Canonical correct answer (answer_key) handed to the shared checker. */
  answer_key: string;
  /** Numeric only: require a specific representation (default `any`). */
  representation?: AnswerSpec["representation"];
  /** Numeric / expression: simplification profile (default `none`). */
  simplification?: AnswerSpec["simplification"];
  /**
   * The structural form the answer must be WRITTEN in, for the types that grade one:
   * `is_slope_intercept` / `is_standard_form` on an `equation_form`. Default `null`.
   */
  required_form?: AnswerSpec["required_form"];
  /**
   * Notation the answer must be written in. Defaults to `interval` for an `interval`
   * answer (which is what `intervalAnswer()` emits for every practice item) and `none`
   * everywhere else; `set_builder` is the one override an interval pack would declare.
   */
  required_notation?: AnswerSpec["required_notation"];
  /** Variable symbols allowed, e.g. ["x"]. Expression and radical answers. */
  allowed_symbols?: readonly string[];
}

/**
 * Where a check's SECOND, THIRD, ... instances come from, so its re-ask can serve a question
 * the learner has to work rather than the one they were just shown the answer to.
 *
 * The pack names a generator; it does not author a second question. That is the whole of the
 * decision behind this field: an authored retry would be 26 packs of new content, each with
 * its own hand-written accepted list, and it would be that again for the 27th pack. A named
 * generator is more work once and none afterwards, and the generators are the item bank's
 * existing `ItemTemplate`s -- the same parameterized draws, with the same constraints, that
 * the practice pools are frozen from (see `cfuVariants.ts`).
 *
 * The AUTHORED `prompt` / `accepted` / `hint` stay exactly as they are and stay instance
 * zero. Nothing a reviewer has already read moves, and a learner's first sight of the check
 * is the question that was written for it; the generator supplies only what the re-ask
 * needs. That also keeps the shape checks that read `accepted[0]` (the reveal's printed
 * answer, `cfuNotation`'s dispatch, `answerKeypad.test.ts`'s typability sweep) reading the
 * same string they read before.
 */
export interface LessonCfuVariants {
  /**
   * The `template_id` of the item-bank template that draws further instances. Resolved
   * against the domain practice pools in `cfuVariants.ts`, which fails loudly on an id that
   * names nothing rather than silently serving no variants.
   */
  template_id: string;
  /**
   * How many instances the check cycles through in total, the authored one included. At least
   * 2, or the re-ask has nothing to serve and the field is a claim the surface cannot keep.
   */
  count: number;
}

export interface LessonCfuSpec {
  /** The question, Markdown + $LaTeX$ (rendered via LessonProse). */
  prompt: string;
  /**
   * Fallback exact-match answers, compared after normalization (trim, lowercase,
   * strip spaces). Used as the primary check when `check` is absent (form matters).
   */
  accepted: readonly string[];
  /** One hint, Markdown + $LaTeX$. */
  hint: string;
  /**
   * The steps that produce the authored question's answer, shown when the learner reveals.
   *
   * Same contract the practice pool's `worked_solution` is written to: one step per entry, in
   * order, and the LAST entry is the final answer. It renders through the same
   * `WorkedSolution` component the practice card uses, so a learner meets one presentation of
   * a solved problem rather than two.
   *
   * Only the AUTHORED question needs this. A computed instance carries the item bank's own
   * steps, drawn with it (see `cfuVariants.ts`), so a converted pack authors nothing here for
   * the questions its re-ask serves.
   */
  worked_solution?: readonly string[];
  /**
   * The same solution as a figure: parameters for the registered visual belonging to
   * `variants.template_id`, describing the AUTHORED question.
   *
   * `worked_solution` above and this field are one solution rendered two ways, which is why
   * they sit together. A computed instance reaches its template's diagram because it carries
   * the parameters it was drawn from; the authored question was not drawn from anything, so
   * without this it can only fall through to the step cards. Setting it makes the first
   * question explained by the same figure as the second.
   *
   * Read through `worked_solution_template` if the pack sets one and `variants.template_id`
   * otherwise, so it is meaningless without one of those, and inert unless that template owns
   * an entry in `WORKED_SOLUTION_VISUALS`. The parameters must describe the authored prompt:
   * the figure states an answer, and a figure stating a different one from the question above
   * it teaches the wrong thing. That correspondence is checked in
   * `cfuAuthoredFigure.test.tsx`, which renders each figure and looks for an accepted answer
   * in it; the pack validator can only check the shape.
   */
  worked_solution_params?: Readonly<Record<string, number>>;
  /**
   * The registered visual the AUTHORED question's figure comes from, when that is not the
   * template the re-ask draws from.
   *
   * Defaults to `variants.template_id`, which is right whenever the authored question is the
   * same shape as the drawn ones. It is not always: a pack's re-ask draws from the template
   * that best serves a rotating question, and the authored question was written first and
   * independently, so the two can be different members of one node's pool. LIN.1's check
   * weighs ingots against ingots, giving an equation with the variable on both sides, while
   * its re-ask draws the one-pile balance word problem. Both are LIN.1, and
   * `d3.lin1.both-sides.l2` explains the first where `d3.lin1.balance-word.l2` explains the
   * second.
   *
   * Pointing the figure at the sibling that fits is therefore preferred to the two
   * alternatives it replaces: rewording a question a learner reads so it matches a diagram,
   * or leaving the authored question on step cards while its re-ask gets a figure. The
   * re-ask is unaffected either way -- it keeps drawing from `variants.template_id`, and
   * carries its own parameters to its own diagram.
   *
   * `worked_solution_params` must then be in THIS template's schema rather than the variant
   * template's, which is a real trap: the two schemas can share parameter names and mean
   * different things by them.
   */
  worked_solution_template?: string;
  /**
   * When present, grade via the shared PRODUCT answer checker, which computes equivalence
   * and returns a reason code - so a near miss can be told apart from a wrong answer and
   * named to the learner (`BOUND_INCLUSIVITY_NOTE` on a right interval with the wrong
   * brackets, `COORDINATES_SWAPPED_NOTE` on a transposed point, and so on).
   *
   * Omit for a question whose graded skill IS the form. Those keep the exact `accepted`
   * match, because a `simplification` profile the checker has no branch for would have to
   * be declared `none`, and `none` accepts every equivalent spelling - which is precisely
   * what the lesson is teaching the learner not to write. `docs/cfu-check-migration.md`
   * names the ten packs that stay for that reason and the thirteen that stay because their
   * answer is compound and this card has one text field.
   */
  check?: LessonCfuCheck;
  /** Optional computed further instances for the re-ask. See {@link LessonCfuVariants}. */
  variants?: LessonCfuVariants;
}

/**
 * One slide's worked example: the instance NAMED, then walked.
 *
 * The prompt is not decoration on the steps, it is what they are a solution to. A card that
 * opens on "Read the signs first" hands the learner a solution to a question they were
 * never shown, so they reconstruct the problem backwards out of the moves -- which is the
 * one thing section 2 exists to spare them. One or two sentences, stating the instance and
 * nothing about how it comes out; the last step is where the result is allowed to appear.
 */
export interface LessonWorkedExample {
  /** The instance this example works, said before the first move. */
  prompt: string;
  /** The moves, in order, one per step, the last naming the result. */
  steps: readonly string[];
}

export interface LessonContent {
  node_id: string;
  title: string;
  /** One string per paragraph of the mini-lesson. */
  mini_lesson: readonly string[];
  /**
   * One short heading per `mini_lesson` paragraph, positionally aligned with it.
   *
   * It is a CLAIM, not a filing label: "A negative exponent means divide" tells the
   * learner where the slide lands, where "Negative exponents" only says which drawer the
   * slide is in. On a slide whose whole job is to let the learner NOTICE the rule, the
   * claim would hand it over before they looked, so those are phrased as the question the
   * slide answers instead.
   *
   * Optional, and a missing entry is a validator WARNING rather than an error: the shipped
   * D1, D5 and D7 packs predate the field and are not ours to rewrite. A shorter array
   * than `mini_lesson` is legal for the same reason; the heading is simply omitted.
   */
  slide_subtitles?: readonly string[];
  /**
   * The solved instance shown BETWEEN a slide's lecture and its activity, positionally
   * aligned with `mini_lesson`: entry `i` is slide `i`'s second section.
   *
   * Each entry is a {@link LessonWorkedExample}: the instance named, then one move per step
   * with the last step naming the result -- the same step contract the practice pool's
   * `worked_solution` is written to, and it renders through the same `WorkedSolution`
   * component under the label "Worked example".
   *
   * Optional, and a short array is legal: a slide with no entry (or a `null` one) has two
   * sections instead of three and shows no card. That is what lets the 32 unmigrated packs
   * keep their one-paragraph slides. Read it through `workedExampleFor` rather than by
   * index, so nothing decides for itself what an absent example looks like; see
   * `teachingSections.ts`.
   */
  worked_examples?: readonly (LessonWorkedExample | null)[];
  /** Optional inline diagrams, each placed after a given paragraph index. */
  visuals?: readonly LessonVisualPlacement[];
  /** Optional end-of-lesson check-your-understanding question (teaching only). */
  cfu?: LessonCfuSpec;
}
