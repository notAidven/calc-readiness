/**
 * The verdict on ONE PART of a board that asks for several parts at once.
 *
 * ## The defect this exists for
 *
 * RAD.2's combine-radicals builder asks for two roots to be simplified, in two rows of two
 * boxes, and it graded the pair. A learner who had $\sqrt{24} = 2\sqrt{6}$ right and $\sqrt{54}$
 * wrong was answered with one red line about both of them, restating the whole method, so the
 * row they had already got right read as part of the miss. The state was per box all along — a
 * correct box latches and dims — but a dimmed box says "unavailable", not "correct", and beside
 * a red line about the pair it says the opposite of what happened.
 *
 * ## Why it is here rather than in `kinds/`
 *
 * A `kinds/` archetype owns a whole interaction: its rows, its controls, its gate. These
 * widgets do not share an interaction, they share one small thing said about one part of it,
 * and the boards it goes on are not the same shape — two roots each with their own check
 * button, or two halves of a single conversion sharing one. So this is a MARK and its
 * vocabulary, in the shape of `WidgetTask`: three lines for a widget to join in, and nothing
 * about how the board is laid out or when it is graded.
 *
 * ## The three channels, and why there are three
 *
 * `CIVIC` and `BRICK` are this app's correctness channel, and a part verdict is a verdict on
 * the learner's own entry, so it belongs in them; a fourth hue for "per-part" would make the
 * three already spoken for harder to read. Colour cannot carry it alone, so every verdict also
 * says itself in a WORD and in a GLYPH, and `verdictName` puts it in the ACCESSIBLE NAME of the
 * boxes it is about.
 *
 * The word is the channel that has to survive the reveal window. While a reveal passage is up
 * the shared layer freezes the whole widget stage with `inert`, and Chromium drops an inert
 * subtree out of the accessibility tree: every `aria-label` under it computes to
 * `ignored: inertElement`. So the name is real coverage outside that window and no coverage at
 * all inside it, and the visible word is what a learner reading a frozen board still gets.
 */

import type { ReactNode } from "react";

/** What each verdict says, in every channel it says it in. */
const VERDICTS = {
  /** This part is right, and it has latched. */
  right: { glyph: "\u2713", word: "correct", spoken: "correct" },
  /**
   * This part was submitted and is not right. Deliberately not "wrong": these boards latch
   * each part as it lands and leave the rest open, so a missed part is still the learner's to
   * produce rather than a settled miss.
   */
  wrong: { glyph: "\u2717", word: "not yet", spoken: "not yet correct" },
} as const;

export type PartVerdict = keyof typeof VERDICTS;

/**
 * One part's accessible name, with the verdict on it.
 *
 * Spend it on every box the verdict covers, so the name a screen reader lands on carries the
 * same thing the mark does. It reads `null` as "not submitted yet" and adds nothing, because a
 * box nobody has answered is not "not yet correct", it is unanswered.
 */
export function partName(base: string, verdict: PartVerdict | null): string {
  return verdict === null ? base : `${base}, ${VERDICTS[verdict].spoken}`;
}

/** The mark itself, beside the boxes it is about. */
export function WidgetPartVerdict({ verdict }: { verdict: PartVerdict }) {
  const said = VERDICTS[verdict];
  return (
    <span className="lesson-interactive__verdict" data-verdict={verdict}>
      {/* Decoration: the word beside it and the boxes' own names carry this in text. */}
      <span aria-hidden="true" className="lesson-interactive__verdict-mark">
        {said.glyph}
      </span>
      {said.word}
    </span>
  );
}

/**
 * The one sentence answering a missed part, under the part it is about.
 *
 * Not on `.lesson-interactive__status`: that line is shared by the whole board, so checking
 * the second part would overwrite the answer to the first. It is what the generic restatement
 * of the method was replaced BY, so it has to be about what the learner actually typed.
 */
export function WidgetPartNote({ children }: { children: ReactNode }) {
  return (
    <p className="lesson-interactive__row-note" role="status">
      {children}
    </p>
  );
}
