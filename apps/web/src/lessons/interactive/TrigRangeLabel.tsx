/**
 * TRG.7 interactive (slide 1): put each function on the one stretch of headings it was cut
 * down to.
 *
 * Two of the three stretches cover the SAME headings and differ only at their two ends, which
 * is why this is a labelling board and not a recall question. Sine keeps its ends because it
 * has a value at both of them; tangent has no value at either, so its ends are excluded and
 * its stretch is written with round brackets. A learner who has memorized "a quarter turn
 * either side of zero" as one fact gets one of those two rows wrong here, and the practice
 * item that grades this answer separates a wrong bracket from a wrong number by its own
 * failure code, so the distinction is graded rather than decorative.
 *
 * The two boards ask the same three stretches from opposite ends. Board one names the INVERSE
 * that may answer on each, and board two names the FORWARD function that was cut down to it.
 * They are one fact, and a learner who has met only the first reads the second as a second
 * thing to memorize.
 *
 * Every stretch is written in degrees, which is not a style choice: the practice item that
 * asks for one of these grades an interval, and an interval written in radians is a parse
 * error at the answer key, so a learner must never be shown a spelling the answer field would
 * refuse.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type FigurePart, LabelParts, labelPartsDeal } from "./kinds/LabelParts";

const SINE_BAND = "[-90^{\\circ}, 90^{\\circ}]";
const COSINE_BAND = "[0^{\\circ}, 180^{\\circ}]";
const TANGENT_BAND = "(-90^{\\circ}, 90^{\\circ})";

const SPOKEN = {
  sine: "the closed stretch from negative 90 degrees to 90 degrees",
  cosine: "the closed stretch from 0 degrees to 180 degrees",
  tangent: "the open stretch between negative 90 degrees and 90 degrees",
} as const;

interface Board {
  /**
   * WHICH name each stretch is owed, which is the only thing separating the two boards.
   *
   * It is prose above the figure rather than the figure's own `lead`, and that placement is
   * measured rather than stylistic. A lead is LaTeX, and an English sentence inside a
   * `\text{}` is one unbreakable run: «The inverse that answers on each stretch is» came to
   * 471.7px, which is wider than the 434px a 460px card leaves and wider than the 304.8px a
   * phone leaves, and a `nowrap` run cannot reflow. So the figure was painted 18.9px outside
   * its own card on a desktop and 70.4px outside it on a phone, taking the first stretch's
   * bracket off the left edge with it. Nothing in the figure needs to be said in maths here —
   * the three stretches ARE the maths — so the sentence belongs where prose can wrap.
   */
  objective: ReactNode;
  parts: readonly FigurePart[];
  /** Read out as the whole figure's accessible name. */
  ariaLabel: string;
}

const BOARDS: readonly Board[] = [
  {
    objective:
      "Goal: put each inverse on the one stretch of headings it answers on, brackets included, since two of these stretches cover the same headings and part company only at their ends.",
    ariaLabel:
      "Three stretches of headings in degrees, each to be given the inverse function that answers on it",
    parts: [
      {
        id: "arcsin",
        latex: SINE_BAND,
        name: "arcsine",
        spoken: SPOKEN.sine,
        why: (
          <>
            Sine climbs the whole way across the quarter turn either side of zero without
            repeating a reading, so that is the stretch it is cut down to and the stretch{" "}
            <InlineMath latex="\arcsin" /> answers on. Both ends belong to it, because sine
            has a value at each of them.
          </>
        ),
      },
      {
        id: "arccos",
        latex: COSINE_BAND,
        before: "\\text{,}",
        name: "arccosine",
        spoken: SPOKEN.cosine,
        why: (
          <>
            Cosine turns around at zero, so a stretch straddling it would hand the same
            reading back twice. It is cut forward from zero through a half turn instead,
            which is why a negative reading comes back from <InlineMath latex="\arccos" />{" "}
            as a heading past the vertical rather than as one below zero.
          </>
        ),
      },
      {
        id: "arctan",
        latex: TANGENT_BAND,
        before: "\\text{,}",
        name: "arctangent",
        spoken: SPOKEN.tangent,
        why: (
          <>
            Tangent covers the same headings as sine and stops short of both ends: at a
            quarter turn either side of zero it has no value at all, so there is nothing for{" "}
            <InlineMath latex="\arctan" /> to hand back there and the brackets are round.
          </>
        ),
      },
    ],
  },
  {
    objective:
      "Goal: put each function on the one stretch of headings it was cut down to, brackets included, since two of these stretches cover the same headings and part company only at their ends.",
    ariaLabel:
      "Three stretches of headings in degrees, each to be given the function that was cut down to it",
    parts: [
      {
        id: "sine",
        latex: SINE_BAND,
        name: "sine",
        spoken: SPOKEN.sine,
        why: (
          <>
            Over a full sweep sine gives every reading endlessly often, so it has to be cut
            down before it can be undone. The quarter turn either side of zero is one climb
            with no reading repeated on it, and sine has a value at both ends, so both ends
            stay in.
          </>
        ),
      },
      {
        id: "cosine",
        latex: COSINE_BAND,
        before: "\\text{,}",
        name: "cosine",
        spoken: SPOKEN.cosine,
        why: (
          <>
            Cosine is at its largest at zero and falls away on both sides of it, so no
            stretch centered on zero can avoid repeating a reading. Running forward from
            zero through a half turn is one fall with nothing repeated, and cosine has a
            value at both of those ends.
          </>
        ),
      },
      {
        id: "tangent",
        latex: TANGENT_BAND,
        before: "\\text{,}",
        name: "tangent",
        spoken: SPOKEN.tangent,
        why: (
          <>
            Tangent runs away without limit as a heading approaches a quarter turn, so the
            stretch it is cut down to covers the same headings as sine's and leaves both
            ends out. An end a function never reaches cannot belong to the stretch it is
            being read on.
          </>
        ),
      },
    ],
  },
];

export function TrigRangeLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(board.parts.length, variant.index)}
      parts={board.parts}
      objective={board.objective}
      prompt="Drag each name into the box above the stretch it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          <InlineMath latex={`\\arcsin: ${SINE_BAND}`} />,{" "}
          <InlineMath latex={`\\arccos: ${COSINE_BAND}`} />,{" "}
          <InlineMath latex={`\\arctan: ${TANGENT_BAND}`} />. The single heading an inverse
          hands back out of that stretch is called its principal value, and it is the whole
          of what the inverse is allowed to say.
        </>
      }
      ariaLabel={board.ariaLabel}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over from the other side"
    />
  );
}
