/**
 * EXP.1 interactive (slide 5): put a negative power on a number line before you are told
 * where it goes.
 *
 * The belief this displaces is that a negative exponent makes a negative number, and it is
 * a belief about MAGNITUDE, which a verdict cannot argue with and a number line can. The
 * scale therefore runs below zero, so a learner who thinks $2^{-1}$ is negative can put it
 * there and watch the true value land on the other side of zero. Committing first is the
 * point: the gap between the two marks is the whole feedback.
 *
 * The gate turns on the committed position, so moving the slider settles nothing on its own.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type EstimateRound, EstimateThenCheck } from "./kinds/EstimateThenCheck";

interface Board {
  rounds: readonly { base: number; exponent: number; value: number }[];
}

/**
 * Two boards of two placements. Board 2 changes the base as well as the value.
 *
 * Board 1 keeps the shape the slide teaches, two steps down on ONE base, on a base the
 * worked example does not use. It used to run $2^{-1}$ then $2^{-2}$, which is the worked
 * example directly above, both rounds in its order, so the whole board was answered by the
 * text on the same slide.
 */
const BOARDS: readonly Board[] = [
  {
    rounds: [
      { base: 4, exponent: -1, value: 0.25 },
      { base: 4, exponent: -2, value: 0.0625 },
    ],
  },
  {
    rounds: [
      { base: 5, exponent: -1, value: 0.2 },
      { base: 10, exponent: -1, value: 0.1 },
    ],
  },
];

export function NegativeExponentEstimate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const rounds: EstimateRound[] = board.rounds.map(({ base, exponent, value }) => {
    const k = -exponent;
    return {
      id: `${base}^${exponent}`,
      quantity: `${base}^{${exponent}}`,
      spoken: `${base} to the minus ${k}`,
      value,
      tolerance: 0.06,
      landmark: { at: 1, latex: `${base}^{0} = 1` },
      why: (
        <>
          Coming down from <InlineMath latex={`${base}^{0} = 1`} />, one more step divides
          by <InlineMath latex={`${base}`} />
          {k > 1 ? ` and then divides by ${base} again` : ""}, so{" "}
          <InlineMath
            latex={`${base}^{${exponent}} = \\tfrac{1}{${base ** k}} = ${value}`}
          />
          . Dividing a positive number never carries it past zero, however many times you do
          it, which is why a negative exponent lands between <InlineMath latex="0" /> and{" "}
          <InlineMath latex="1" /> rather than below zero.
        </>
      ),
    };
  });

  return (
    <EstimateThenCheck
      key={variant.nonce}
      rounds={rounds}
      min={-0.5}
      max={1.5}
      step={0.05}
      ticks={[-0.5, 0, 0.5, 1, 1.5]}
      prompt="Slide the marker to where you think this value lands, then commit to it and see."
      conclusion={
        <>
          Both landed between <InlineMath latex="0" /> and <InlineMath latex="1" />, and
          neither went below zero. A minus sign in the exponent does not make the value
          negative; it says to divide instead of multiply, and dividing a positive number
          keeps it positive however small it gets. That is all{" "}
          <InlineMath latex="x^{-k} = \tfrac{1}{x^{k}}" /> is saying.
        </>
      }
      ariaLabel="A number line running below zero, for placing a negative power on"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different powers"
    />
  );
}
