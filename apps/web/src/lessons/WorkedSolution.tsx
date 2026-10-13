import type { ReactNode } from "react";

import { LessonProse } from "./prose";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

/**
 * A practice item's worked solution, shown only after the student reveals.
 *
 * When the item's `template_id` has a parameterized SVG worked solution
 * (`workedSolutionVisuals.tsx`), render it as a figure styled exactly like the
 * mini-lesson diagrams. Otherwise fall back to the colorful step cards: each step
 * is a card with a numbered badge whose hue rotates through the theme palette,
 * steps are joined by connectors, and the final step is emphasized as the answer.
 * Step numbering and colors live here (not in the authored content), so item-bank
 * `worked_solution` entries stay plain `$...$` text.
 *
 * A caller whose steps come from no drawn item -- a teaching slide's `worked_examples` entry
 * -- omits `templateId` and so always gets the step cards, under its own `label` and above
 * its own `intro`.
 */
export function WorkedSolution({
  templateId,
  params,
  steps,
  label = "Worked solution",
  intro,
}: {
  /** Omitted by a caller with no item behind the steps, which keeps it on the step cards. */
  templateId?: string;
  params?: Record<string, number>;
  steps: readonly string[];
  /** Overridden to "Worked example" by the teaching slide's second section. */
  label?: string;
  /**
   * The instance the steps work, said before the first move. Passed only by the teaching
   * slide, whose reader has no question on screen to attach the moves to; a practice reveal
   * needs none, because the item's own prompt is still above it.
   */
  intro?: string;
}): ReactNode {
  const visual = templateId === undefined ? undefined : getWorkedSolutionVisual(templateId);

  if (visual) {
    return (
      <div className="worked-solution worked-solution--figure">
        <span className="micro-label worked-solution__label">{label}</span>
        <figure className="lesson-visual">
          {visual.Svg(params ?? {})}
          <figcaption>
            <LessonProse markdown={visual.caption(params ?? {})} />
          </figcaption>
        </figure>
      </div>
    );
  }

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="worked-solution">
      <span className="micro-label worked-solution__label">{label}</span>
      {intro !== undefined && (
        <div className="worked-solution__intro lesson-player__prose">
          <LessonProse markdown={intro} />
        </div>
      )}
      <ol className="worked-solution__steps">
        {steps.map((step, index) => {
          const isAnswer = index === steps.length - 1;
          return (
            <li
              key={step}
              className="worked-solution__step"
              data-hue={index % 3}
              data-answer={isAnswer ? "true" : undefined}
            >
              <span className="worked-solution__badge" aria-hidden="true">
                {isAnswer ? "\u2713" : index + 1}
              </span>
              <div className="worked-solution__body lesson-player__prose">
                <LessonProse markdown={step} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
