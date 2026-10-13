/**
 * The line that says WHAT the learner has been asked to do, above the controls that do it.
 *
 * ## The defect this exists for
 *
 * A widget's `.lesson-interactive__status` is the last child of the widget, because it is an
 * `aria-live` region carrying per-attempt feedback. Nearly every bespoke widget also used it
 * as the place the TASK was stated, so a learner reading top to bottom met the round counter,
 * the expression, an aside about the rule, the option chips, and only then the sentence
 * telling them what to do with any of it. Worse, the status line is spent: the first wrong
 * move replaces the task with feedback about the move, and the task never comes back.
 *
 * The three assembly kinds (`OrderSteps`, `LabelParts`, `FillTable`) already had the answer:
 * a required `objective` rendered above the board. This is that markup, extracted, so there
 * is one implementation of the slot rather than one per widget, and so a bespoke widget joins
 * in with a single line.
 *
 * ## What belongs in it
 *
 * The IMPERATIVE, and what the learner will have produced when it is done. Not the mechanic
 * ("tap a chip, then tap a slot" describes the control), and not the rule the task rests on
 * (that is teaching, and it belongs in the prose or on the status line under the task).
 *
 * It must also ask for the same KIND of thing the controls offer. "Tap the even part of 7"
 * beside four chips that are all powers of `p` is a task statement and a control set that do
 * not agree about what an answer looks like, which was the sharpest instance of this defect:
 * the even part of 7 is 6, and 6 was not on offer.
 *
 * `widgetTaskOrder.browser.test.tsx` is the guard, and it asserts DOM ORDER rather than mere
 * presence, because presence is what the status line already had.
 */

import type { ReactNode } from "react";

export function WidgetTask({ children }: { children: ReactNode }) {
  return <p className="lesson-interactive__objective">{children}</p>;
}
