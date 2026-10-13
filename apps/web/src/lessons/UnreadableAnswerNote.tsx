import type { ReactElement } from "react";

/**
 * The one element every answer surface renders when the reader could not read the answer.
 *
 * It is a component rather than a per-surface paragraph for two reasons, and the second is the
 * one that matters. The first is that ten surfaces would otherwise have ten paragraphs to drift
 * apart. The second is that this is the defect's OWN shape: the swallow happened because each
 * surface reimplemented "collapse the verdict to a boolean" privately, so the answer to it has to
 * be a thing a surface IMPORTS — something `answerUnreadableEverywhere.test.tsx` can require of
 * every member of the population, and something a new surface cannot forget by writing its own.
 *
 * `role="alert"` rather than a polite live region: a refused press is the one press on these
 * surfaces with no other visible consequence. The question does not change, the field does not
 * move, and on several of them the Check button is still sitting there, so a learner who is not
 * interrupted concludes the button is broken.
 *
 * It is deliberately NOT the surfaces' own "wrong answer" treatment. Every one of them paints a
 * miss (`data-status="incorrect"`, a red cross, "Not right."), and an unreadable answer wearing
 * any of that is the surface asserting a verdict on an answer nobody graded. So it carries its
 * own class and its own quiet clay, and it says what it is.
 */
export function UnreadableAnswerNote({
  note,
}: {
  note: string | null;
}): ReactElement | null {
  if (!note) {
    return null;
  }
  return (
    <p className="cr-unreadable-note" role="alert">
      {note}
    </p>
  );
}
