/**
 * TRG.9 slide 3: the order the moves run in when an expression is shortened.
 *
 * Every step here rests on the one before it, which is what makes the chain a question rather
 * than a preference. Which family of identity applies is settled by COUNTING the angles, and
 * until that is settled there is no pattern to match; the pattern is what says which sign the
 * collapsed angle carries, so the argument cannot be written before it; and the arithmetic inside
 * the argument is last because there is nothing to simplify until the argument exists.
 *
 * The tempting order is the wrong one: a learner who reads the operator first and writes
 * $\cos(4t + t)$ from a plus has done the sign the way it works for sine, and the cosine family
 * reverses it. That slip is what the second rung exists to catch, and the board refuses it
 * rather than correcting it after the fact.
 *
 * Built on `OrderSteps`, which owns the mechanic, the refusal of an out-of-order tap and the
 * reveal that hands the chain back with every rung already built still built.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The expression the chain shortens, as LaTeX. */
  expression: string;
  /** How a screen reader says it. */
  expressionSpoken: string;
  steps: readonly OrderedStep[];
  /** Indices into `steps`, in the order the chips are dealt. Never the identity. */
  dealt: readonly number[];
  /** The single function the chain arrives at, typeset. */
  shortened: string;
}

/**
 * Two boards, one from each combining family, because the sign behaves oppositely in the two and
 * a learner who has only seen the sine board carries the wrong rule into the cosine one.
 *
 * Neither expression is a practice draw. The pool's naming slot shows patterns of this kind but
 * asks for the NAME of the identity, because the checker's grammar holds no trigonometric
 * functions and a collapsed expression cannot be typed as an answer.
 */
const BOARDS: readonly Board[] = [
  {
    expression: "\\sin 5t\\cos 3t - \\cos 5t\\sin 3t",
    expressionSpoken: "sine 5 t cosine 3 t minus cosine 5 t sine 3 t",
    shortened: "\\sin 2t",
    dealt: [2, 0, 3, 1],
    steps: [
      {
        id: "count",
        text: "Two different angles appear, 5t and 3t, so one of the combining identities applies rather than a doubling one.",
        spoken:
          "two different angles appear, 5 t and 3 t, so a combining identity applies rather than a doubling one",
        why: (
          <>
            Counting the angles comes first because it decides which family to look in, and
            the two families do different things to the sign. A doubling identity needs
            every function sitting at ONE angle, which rules it out here before any pattern
            is matched.
          </>
        ),
      },
      {
        id: "pattern",
        latex: "\\sin A\\cos B - \\cos A\\sin B",
        spoken: "sine A cosine B minus cosine A sine B",
        why: (
          <>
            Each product pairs one angle's sine with the other angle's cosine, which is the
            sine family rather than the cosine one. In that family the operator between the
            products is the SAME as the one between the angles, so this minus means a
            subtraction inside the argument. Naming the pattern has to come before the
            argument is written, because the pattern is what fixes that sign.
          </>
        ),
      },
      {
        id: "argument",
        latex: "\\sin(5t - 3t)",
        spoken: "sine of 5 t minus 3 t",
        why: (
          <>
            With <InlineMath latex="A = 5t" /> and <InlineMath latex="B = 3t" />, the
            pattern is already the expanded form of this. The two angles go inside a single
            sine, and the minus travels from between the products to between the angles.
          </>
        ),
      },
      {
        id: "collapsed",
        latex: "\\sin 2t",
        spoken: "sine 2 t",
        why: (
          <>
            <InlineMath latex="5t - 3t = 2t" />, so what began as four readings and two
            products is one reading of one angle. The subtraction inside the argument is the
            last move because there was nothing to subtract until the argument existed.
          </>
        ),
      },
    ],
  },
  {
    expression: "\\cos 4t\\cos t + \\sin 4t\\sin t",
    expressionSpoken: "cosine 4 t cosine t plus sine 4 t sine t",
    shortened: "\\cos 3t",
    dealt: [1, 3, 0, 2],
    steps: [
      {
        id: "count",
        text: "Two different angles appear, 4t and t, so one of the combining identities applies rather than a doubling one.",
        spoken:
          "two different angles appear, 4 t and t, so a combining identity applies rather than a doubling one",
        why: (
          <>
            The angles are counted first because that is what rules the doubling identities
            out: those need every function at the SAME angle, and here one factor sits at{" "}
            <InlineMath latex="4t" /> and the other at <InlineMath latex="t" />.
          </>
        ),
      },
      {
        id: "pattern",
        latex: "\\cos A\\cos B + \\sin A\\sin B",
        spoken: "cosine A cosine B plus sine A sine B",
        why: (
          <>
            Both products pair like function with like, which is the cosine family. That
            family reverses the sign: the plus between these products means the angles are
            SUBTRACTED. Reading the plus as an addition and writing{" "}
            <InlineMath latex="\cos(4t + t)" /> is the slip this rung exists to catch, and
            it is why the pattern has to be named before the argument is written.
          </>
        ),
      },
      {
        id: "argument",
        latex: "\\cos(4t - t)",
        spoken: "cosine of 4 t minus t",
        why: (
          <>
            With <InlineMath latex="A = 4t" /> and <InlineMath latex="B = t" />, the
            expression is the expanded form of this, sign reversal included. The two angles
            move inside a single cosine.
          </>
        ),
      },
      {
        id: "collapsed",
        latex: "\\cos 3t",
        spoken: "cosine 3 t",
        why: (
          <>
            <InlineMath latex="4t - t = 3t" />, so one reading replaces four of them. This
            is last because the arithmetic inside the argument needs the argument, and the
            argument needed the sign.
          </>
        ),
      },
    ],
  },
];

export function TrigShortenOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={board.steps}
      dealt={board.dealt}
      objective={
        <>
          Build the argument that turns <InlineMath latex={board.expression} /> into one
          function of one angle, a move at a time, so that every line rests on the line
          above it.
        </>
      }
      prompt="Tap whichever line can be justified next. A line that needs something not yet on the board is refused."
      ariaLabel={`The four moves that shorten ${board.expressionSpoken} to a single function, shuffled`}
      conclusion={
        <>
          Count, match, substitute, simplify. Four readings, two products and one sign come
          down to <InlineMath latex={board.shortened} />: the same value every time, out of
          a fraction of the work, which is the whole reason a controller that has to
          evaluate it over and over would rather be handed the short form.
        </>
      }
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Shorten a different expression"
    />
  );
}
