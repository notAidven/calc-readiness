/**
 * TRG.7 interactive (slide 0): rebuild the argument that turns one meter reading back into a
 * heading.
 *
 * Sequencing is the content, which is why this is an ordering board rather than a typing box.
 * The inverse is a true thing to write from the moment the board opens, and it is not yet a
 * legal move: until the sweep has been cut down to a stretch on which the function never
 * repeats a reading, there is no single heading for the inverse to name, and writing
 * $\theta = \arcsin(\ldots)$ over an uncut sweep is an equation with infinitely many solutions
 * wearing the notation of one. A learner who reaches for it first is refused and told exactly
 * that, which is a thing to notice rather than a thing to be told.
 *
 * The two boards use different functions, so the second cannot be finished by copying the
 * shape of the first: the sine board is cut symmetrically about zero and the tangent board is
 * cut to the OPEN stretch, where the two ends are headings the function never reaches at all.
 *
 * Neither board's reading is the value any practice template draws, and neither heading is the
 * check's answer.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The reading the meter reports, as LaTeX, for the goal line and the closing sentence. */
  reading: string;
  /** The heading it comes from, named only once the chain is finished. */
  heading: string;
  steps: readonly OrderedStep[];
  /** The order the chips are dealt in: indices into `steps`, never the identity. */
  dealt: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    reading: "\\sin\\theta = \\dfrac{\\sqrt{2}}{2}",
    heading: "45^{\\circ}",
    steps: [
      {
        id: "b0-reading",
        latex: "\\sin\\theta = \\dfrac{\\sqrt{2}}{2}",
        spoken: "sine theta equals root 2 over 2",
        why: (
          <>
            Nothing can be undone until it is settled WHAT was done. The meter is not
            reporting a heading, it is reporting the sine of one, so the first line writes
            the reading down as a statement about the unknown <InlineMath latex="\theta" />.
          </>
        ),
      },
      {
        id: "b0-restrict",
        text: "Sine is cut down to the headings from a quarter turn below zero to a quarter turn above it.",
        spoken:
          "sine is cut down to the headings from a quarter turn below zero to a quarter turn above it",
        why: (
          <>
            Every reading sine gives is given at endlessly many headings, so on the full
            sweep the reading names no single one. Cutting sine down to one stretch it never
            repeats a value on is what makes a single answer exist, and it has to happen
            before the inverse is written rather than after.
          </>
        ),
      },
      {
        id: "b0-invert",
        latex: "\\theta = \\arcsin\\left(\\dfrac{\\sqrt{2}}{2}\\right)",
        spoken: "theta equals arcsine of root 2 over 2",
        why: (
          <>
            Now that one stretch has been fixed, the inverse has something to name. Writing{" "}
            <InlineMath latex="\arcsin" /> around the reading says: the heading inside that
            stretch whose sine is this.
          </>
        ),
      },
      {
        id: "b0-value",
        latex: "\\theta = 45^{\\circ}",
        spoken: "theta equals 45 degrees",
        why: (
          <>
            Inside that stretch exactly one heading has a sine of{" "}
            <InlineMath latex="\dfrac{\sqrt{2}}{2}" />, and it is the one whose two
            coordinates are equal, so the meter was pointed at{" "}
            <InlineMath latex="45^{\circ}" />.
          </>
        ),
      },
    ],
    dealt: [2, 0, 3, 1],
  },
  {
    reading: "\\tan\\theta = \\dfrac{\\sqrt{3}}{3}",
    heading: "30^{\\circ}",
    steps: [
      {
        id: "b1-reading",
        latex: "\\tan\\theta = \\dfrac{\\sqrt{3}}{3}",
        spoken: "tangent theta equals root 3 over 3",
        why: (
          <>
            The meter is reporting a tangent rather than a heading, so the reading becomes a
            statement about the unknown <InlineMath latex="\theta" /> before anything is
            done to it. Which function was read matters, because each one is cut down
            differently.
          </>
        ),
      },
      {
        id: "b1-restrict",
        text: "Tangent is cut down to the headings strictly between a quarter turn below zero and a quarter turn above it.",
        spoken:
          "tangent is cut down to the headings strictly between a quarter turn below zero and a quarter turn above it",
        why: (
          <>
            Tangent repeats every half turn, so it too names no single heading over a full
            sweep. Its stretch excludes both ends rather than including them, because at a
            quarter turn either side of zero the tangent has no value at all and there is
            nothing for the inverse to hand back.
          </>
        ),
      },
      {
        id: "b1-invert",
        latex: "\\theta = \\arctan\\left(\\dfrac{\\sqrt{3}}{3}\\right)",
        spoken: "theta equals arctangent of root 3 over 3",
        why: (
          <>
            With the stretch fixed, <InlineMath latex="\arctan" /> names the one heading
            inside it whose tangent is the reading. The same reading also comes from a
            heading half a turn further round, and the restriction is what rules that one
            out.
          </>
        ),
      },
      {
        id: "b1-value",
        latex: "\\theta = 30^{\\circ}",
        spoken: "theta equals 30 degrees",
        why: (
          <>
            A tangent of <InlineMath latex="\dfrac{\sqrt{3}}{3}" /> is a shallow one, well
            under the <InlineMath latex="1" /> that a half-and-half heading gives, so the
            heading is the smallest of the special angles at{" "}
            <InlineMath latex="30^{\circ}" />.
          </>
        ),
      },
    ],
    dealt: [3, 2, 0, 1],
  },
];

export function TrigInverseOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={board.steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: assemble the argument that takes one meter reading back to the heading
          behind it, settling why a ratio on its own names no heading and what has to be
          fixed before an inverse may be written at all.
        </>
      }
      prompt="Place whichever line the argument is ready for next."
      conclusion={
        <>
          <InlineMath latex={`${board.reading}, \\text{ so } \\theta = ${board.heading}`} />
          . The reading came first, the restriction second, and only then could the inverse
          name one heading out of the many that produce that reading.
        </>
      }
      ariaLabel="The steps of recovering a heading from a meter reading, shuffled, to be placed in order"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different reading"
    />
  );
}
