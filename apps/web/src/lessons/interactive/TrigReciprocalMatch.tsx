/**
 * TRG.4 slide 1: each function joined to the reciprocal that produces it.
 *
 * A correspondence rather than a procedure, which is what `MatchPairs` is for, and here the
 * distractors are the whole lesson. The slide's named trap is that the co- at the front of a
 * name does not decide the pairing, so the first board puts $\dfrac{1}{\sin\theta}$ on the
 * table beside $\dfrac{1}{\csc\theta}$: a learner reaching for the item that merely LOOKS
 * like the one they are holding finds a plausible wrong partner waiting, and it is somebody
 * else's answer, so taking it costs two.
 *
 * The second board is the same three pairs carried out on numbers, because a learner can
 * recite the pairing and still not turn a reading over. Both boards close on the statement
 * the pairing rests on, a product of $1$.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  pairs: readonly MatchPair[];
  /** A derangement: no right item is dealt against the left item it belongs to. */
  rightOrder: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    pairs: [
      {
        id: "b0-p0",
        left: "\\sin\\theta",
        right: "\\dfrac{1}{\\csc\\theta}",
        leftSpoken: "sine",
        rightSpoken: "one over cosecant",
        why: (
          <>
            The sine's partner is the cosecant, so the sine is <InlineMath latex="1" /> over
            the COSECANT and not <InlineMath latex="1" /> over itself. A function and its
            reciprocal multiply to <InlineMath latex="1" />, and no function is its own
            reciprocal here.
          </>
        ),
      },
      {
        id: "b0-p1",
        left: "\\sec\\theta",
        right: "\\dfrac{1}{\\cos\\theta}",
        leftSpoken: "secant",
        rightSpoken: "one over cosine",
        why: (
          <>
            This is the pair the spelling gets wrong. The secant belongs to the COSINE, even
            though the cosine is the one carrying the co-, so{" "}
            <InlineMath latex="\sec\theta = \dfrac{1}{\cos\theta}" />. Pairing it with the
            sine instead is the single most common slip on this slide.
          </>
        ),
      },
      {
        id: "b0-p2",
        left: "\\cot\\theta",
        right: "\\dfrac{1}{\\tan\\theta}",
        leftSpoken: "cotangent",
        rightSpoken: "one over tangent",
        why: (
          <>
            Tangent and cotangent are the third pair, so{" "}
            <InlineMath latex="\cot\theta = \dfrac{1}{\tan\theta}" />. It agrees with the
            recipes as well: dividing cosine by sine is the same as turning sine over cosine
            upside down.
          </>
        ),
      },
      {
        id: "b0-p3",
        left: "\\csc\\theta",
        right: "\\dfrac{1}{\\sin\\theta}",
        leftSpoken: "cosecant",
        rightSpoken: "one over sine",
        why: (
          <>
            The cosecant is the sine turned over, which is the same statement as the first
            pair on this board read the other way round. An identity holds in both
            directions, so <InlineMath latex="\csc\theta = \dfrac{1}{\sin\theta}" /> and{" "}
            <InlineMath latex="\sin\theta = \dfrac{1}{\csc\theta}" /> are one fact.
          </>
        ),
      },
    ],
    rightOrder: [2, 3, 1, 0],
  },
  {
    pairs: [
      {
        id: "b1-p0",
        left: "\\sin\\theta = \\dfrac{5}{13}",
        right: "\\csc\\theta = \\dfrac{13}{5}",
        leftSpoken: "sine equals 5 over 13",
        rightSpoken: "cosecant equals 13 over 5",
        why: (
          <>
            Turning <InlineMath latex="\dfrac{5}{13}" /> over gives{" "}
            <InlineMath latex="\dfrac{13}{5}" />, and the sine's partner is the cosecant. A
            sine is never bigger than <InlineMath latex="1" /> and a cosecant is never
            smaller, which is a quick way to check you have not joined them the wrong way.
          </>
        ),
      },
      {
        id: "b1-p1",
        left: "\\cos\\theta = \\dfrac{12}{13}",
        right: "\\sec\\theta = \\dfrac{13}{12}",
        leftSpoken: "cosine equals 12 over 13",
        rightSpoken: "secant equals 13 over 12",
        why: (
          <>
            The cosine turned over is <InlineMath latex="\dfrac{13}{12}" />, and it is the
            SECANT that carries it. Reading the values alone would let{" "}
            <InlineMath latex="\dfrac{13}{5}" /> look plausible here, so the pairing has to
            be settled by the names before the numbers are compared.
          </>
        ),
      },
      {
        id: "b1-p2",
        left: "\\tan\\theta = \\dfrac{5}{12}",
        right: "\\cot\\theta = \\dfrac{12}{5}",
        leftSpoken: "tangent equals 5 over 12",
        rightSpoken: "cotangent equals 12 over 5",
        why: (
          <>
            The tangent at this heading is{" "}
            <InlineMath latex="\dfrac{5}{13} \div \dfrac{12}{13} = \dfrac{5}{12}" />, and
            the cotangent is that turned over. Neither of them was measured: both come out
            of the same two readings.
          </>
        ),
      },
      {
        id: "b1-p3",
        left: "\\sin\\theta \\cdot \\csc\\theta",
        right: "1",
        leftSpoken: "sine times cosecant",
        rightSpoken: "one",
        why: (
          <>
            This is what makes the other joins on this board true. A pair multiplies to{" "}
            <InlineMath latex="1" />:{" "}
            <InlineMath latex="\dfrac{5}{13} \times \dfrac{13}{5} = 1" />, and it comes out
            the same at every heading, whatever the readings happen to be.
          </>
        ),
      },
    ],
    rightOrder: [1, 3, 0, 2],
  },
];

export function TrigReciprocalMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      objective={
        <>
          Goal: join every function on the left to the reciprocal that equals it, until each
          of the three pairs has been named.
        </>
      }
      prompt="Decide which function each one is paired with before you look at what is on offer."
      conclusion={
        <>
          Every pair joined. Sine goes with cosecant, cosine with secant, and tangent with
          cotangent, so a reciprocal identity can be read in whichever direction the work
          needs. The co- at the front of a name says nothing about which two go together.
        </>
      }
      ariaLabel="Trigonometric functions on the left, the reciprocal expressions that equal them on the right, to be joined in pairs"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a board of readings"
    />
  );
}
