/**
 * TRG.3 slide 3: the four steps of taking an exact value at a heading that is not acute.
 *
 * The value at a non-acute heading is not one move, it is four, and each of them rests on the
 * one before: the quadrant has to be settled before the subtraction can be chosen, the
 * subtraction has to be done before there is an acute angle to look up, and the sign cannot
 * be attached until there is a magnitude to attach it to. That is a chain of dependencies,
 * which is exactly what `OrderSteps` is for.
 *
 * The sign step is LAST rather than first on purpose. The commonest wrong route is to reach
 * for the acute value straight away and remember the sign afterwards, which works right up
 * until the learner forgets, and the board refuses that order rather than arguing with it.
 *
 * The two boards do not agree on their final sign: one closes negative and one closes
 * positive. A pair that both flipped would teach "the answer at a non-acute heading is the
 * acute value with a minus on it", which is false in half the quadrants.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The question the chain answers, as LaTeX, for the objective and the aria label. */
  asked: string;
  spokenAsk: string;
  steps: readonly OrderedStep[];
  /** The order the chips are dealt in: indices into `steps`, never the identity. */
  dealt: readonly number[];
  conclusion: ReactNode;
}

const BOARDS: readonly Board[] = [
  {
    asked: "\\cos 210^{\\circ}",
    spokenAsk: "the cosine of 210 degrees",
    steps: [
      {
        id: "a-quadrant",
        latex: "\\text{Quadrant III, since } 180^{\\circ} < 210^{\\circ} < 270^{\\circ}",
        spoken: "quadrant three, since 210 degrees lies between 180 and 270",
        why: (
          <>
            Nothing else can be chosen until this is: the quadrant decides which subtraction
            gives the reference angle AND which sign the answer carries. It is the only step
            that needs no earlier one.
          </>
        ),
      },
      {
        id: "a-reference",
        latex: "210^{\\circ} - 180^{\\circ} = 30^{\\circ}",
        spoken: "210 degrees minus 180 degrees is 30 degrees",
        why: (
          <>
            In Quadrant III the nearer end of the horizontal axis is the{" "}
            <InlineMath latex="180^{\circ}" /> one, so the acute angle back to it is the
            heading less <InlineMath latex="180^{\circ}" />. Choosing that subtraction is
            what the quadrant was needed for.
          </>
        ),
      },
      {
        id: "a-acute",
        latex: "\\cos 30^{\\circ} = \\dfrac{\\sqrt{3}}{2}",
        spoken: "the cosine of 30 degrees is root three over two",
        why: (
          <>
            The reference angle is a special angle, so its cosine is one of the three exact
            values already known from the right triangles. This is the only step that
            supplies a magnitude, and it cannot run before there is an acute angle to run it
            on.
          </>
        ),
      },
      {
        id: "a-sign",
        latex: "\\cos 210^{\\circ} = -\\dfrac{\\sqrt{3}}{2}",
        spoken: "the cosine of 210 degrees is negative root three over two",
        why: (
          <>
            Quadrant III sits left of the vertical axis, so the point's{" "}
            <InlineMath latex="x" /> is negative and the cosine goes with it. The sign is
            attached last because there has to be a magnitude to attach it to, and it is the
            step that turns an acute value into the answer at the heading actually asked.
          </>
        ),
      },
    ],
    dealt: [2, 0, 3, 1],
    conclusion: (
      <>
        Quadrant, then reference angle, then the acute value, then the sign. Only the last
        step mentions <InlineMath latex="210^{\circ}" /> again, because the middle of the
        route is worked entirely on <InlineMath latex="30^{\circ}" />.
      </>
    ),
  },
  {
    asked: "\\sin 150^{\\circ}",
    spokenAsk: "the sine of 150 degrees",
    steps: [
      {
        id: "b-quadrant",
        latex: "\\text{Quadrant II, since } 90^{\\circ} < 150^{\\circ} < 180^{\\circ}",
        spoken: "quadrant two, since 150 degrees lies between 90 and 180",
        why: (
          <>
            The quadrant is what every later step is chosen by, so it comes first. It
            settles the subtraction below it and the sign at the end of the chain, and it
            rests on nothing but the heading itself.
          </>
        ),
      },
      {
        id: "b-reference",
        latex: "180^{\\circ} - 150^{\\circ} = 30^{\\circ}",
        spoken: "180 degrees minus 150 degrees is 30 degrees",
        why: (
          <>
            In Quadrant II the heading has passed straight up and is closing on the{" "}
            <InlineMath latex="180^{\circ}" /> end of the horizontal axis, so the acute
            angle back to that axis is <InlineMath latex="180^{\circ}" /> less the heading.
            Run the other subtraction here and the angle comes out negative.
          </>
        ),
      },
      {
        id: "b-acute",
        latex: "\\sin 30^{\\circ} = \\dfrac{1}{2}",
        spoken: "the sine of 30 degrees is one half",
        why: (
          <>
            The reference angle turned out to be a special angle, so its sine is already
            known exactly. This step needs the angle above it and supplies the magnitude to
            the step below it.
          </>
        ),
      },
      {
        id: "b-sign",
        latex: "\\sin 150^{\\circ} = \\dfrac{1}{2}",
        spoken: "the sine of 150 degrees is one half",
        why: (
          <>
            Quadrant II sits above the horizontal axis, so the point's{" "}
            <InlineMath latex="y" /> is positive and the sine keeps the magnitude unchanged.
            The sign step is not always a minus: it is a decision, and here it decides to
            leave the value alone.
          </>
        ),
      },
    ],
    dealt: [3, 1, 0, 2],
    conclusion: (
      <>
        Quadrant, then reference angle, then the acute value, then the sign. Here the last
        step changed nothing, which is what makes it a step rather than a habit: Quadrant II
        keeps a sine positive, and the same route through Quadrant III would not have.
      </>
    ),
  },
];

export function TrigReferenceOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={board.steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: build the route from the heading to <InlineMath latex={board.asked} />, in
          the order each step depends on the one before it.
        </>
      }
      prompt="Tap whichever line can be justified next, given only the lines already placed."
      conclusion={board.conclusion}
      ariaLabel={`The four steps of evaluating ${board.spokenAsk} exactly, shuffled`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different heading"
    />
  );
}
