/**
 * TRG.9 slide 2: join each doubling form to the single function it collapses to.
 *
 * A correspondence rather than a procedure, because the fact to learn is a matching: four
 * different-looking expressions, four single functions, and the work is deciding WHICH doubling
 * form is in front of you. Cosine has three forms and sine has one, so the right column has to
 * be read for its function as well as its angle.
 *
 * Every angle on the board is different, which is what keeps the numerals from being a shortcut
 * on their own. A learner who only doubles the multiplier and ignores the function will find
 * $\cos$ where they wanted $\sin$, and every option on the right is another pair's correct
 * answer, so a wrong join costs two pairs rather than one.
 *
 * Nothing here is a practice draw. The pool's naming slot shows the same four patterns but asks
 * for the NAME of the identity, since the checker's grammar has no trigonometric functions in it
 * and a collapsed function cannot be typed; the collapsing itself only exists inside a widget
 * like this one, where the learner joins rather than types.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

interface Board {
  pairs: readonly MatchPair[];
  /** Indices into `pairs`, never the identity, so the right column arrives shuffled. */
  rightOrder: readonly number[];
}

/** Why a doubling form collapses to what it does: the identity, and what happens to the angle. */
function why(
  form: "sine-product" | "difference-of-squares" | "sine-only" | "cosine-only",
): ReactNode {
  if (form === "sine-product") {
    return (
      <>
        <InlineMath latex="2\sin A\cos A = \sin 2A" /> is the one doubling form that
        produces a SINE, and it is the only one on the board holding a product of two
        different functions. The angle inside doubles; the <InlineMath latex="2" /> out
        front is what disappears.
      </>
    );
  }
  if (form === "difference-of-squares") {
    return (
      <>
        <InlineMath latex="\cos^{2} A - \sin^{2} A = \cos 2A" />. It is a cosine because the
        two squares are subtracted in that order, cosine first. Reversing them gives{" "}
        <InlineMath latex="-\cos 2A" />, so the order carries the sign.
      </>
    );
  }
  if (form === "sine-only") {
    return (
      <>
        <InlineMath latex="1 - 2\sin^{2} A = \cos 2A" />. Only the sine appears, and the
        answer is a cosine anyway: substituting{" "}
        <InlineMath latex="\sin^{2} A = 1 - \cos^{2} A" /> into the squares form is where it
        comes from. Use this one when the sine is what you were handed.
      </>
    );
  }
  return (
    <>
      <InlineMath latex="2\cos^{2} A - 1 = \cos 2A" />, the same identity written in the
      cosine alone. The constant is on the other side of the subtraction from the sine
      version, which is the half worth remembering: <InlineMath latex="1 - 2\sin^{2} A" />{" "}
      starts at <InlineMath latex="1" /> and <InlineMath latex="2\cos^{2} A - 1" /> ends at
      it.
    </>
  );
}

const BOARDS: readonly Board[] = [
  {
    pairs: [
      {
        id: "sine-product",
        left: "2\\sin 3\\theta\\cos 3\\theta",
        right: "\\sin 6\\theta",
        leftSpoken: "2 sine 3 theta cosine 3 theta",
        rightSpoken: "sine 6 theta",
        why: why("sine-product"),
      },
      {
        id: "squares",
        left: "\\cos^{2} 4\\theta - \\sin^{2} 4\\theta",
        right: "\\cos 8\\theta",
        leftSpoken: "cosine squared 4 theta minus sine squared 4 theta",
        rightSpoken: "cosine 8 theta",
        why: why("difference-of-squares"),
      },
      {
        id: "sine-only",
        left: "1 - 2\\sin^{2} 5\\theta",
        right: "\\cos 10\\theta",
        leftSpoken: "1 minus 2 sine squared 5 theta",
        rightSpoken: "cosine 10 theta",
        why: why("sine-only"),
      },
      {
        id: "cosine-only",
        left: "2\\cos^{2} \\theta - 1",
        right: "\\cos 2\\theta",
        leftSpoken: "2 cosine squared theta minus 1",
        rightSpoken: "cosine 2 theta",
        why: why("cosine-only"),
      },
    ],
    rightOrder: [2, 3, 0, 1],
  },
  {
    pairs: [
      {
        id: "sine-product",
        left: "2\\sin 6t\\cos 6t",
        right: "\\sin 12t",
        leftSpoken: "2 sine 6 t cosine 6 t",
        rightSpoken: "sine 12 t",
        why: why("sine-product"),
      },
      {
        id: "squares",
        left: "\\cos^{2} 2t - \\sin^{2} 2t",
        right: "\\cos 4t",
        leftSpoken: "cosine squared 2 t minus sine squared 2 t",
        rightSpoken: "cosine 4 t",
        why: why("difference-of-squares"),
      },
      {
        id: "cosine-only",
        left: "2\\cos^{2} 5t - 1",
        right: "\\cos 10t",
        leftSpoken: "2 cosine squared 5 t minus 1",
        rightSpoken: "cosine 10 t",
        why: why("cosine-only"),
      },
      {
        id: "sine-only",
        left: "1 - 2\\sin^{2} 3t",
        right: "\\cos 6t",
        leftSpoken: "1 minus 2 sine squared 3 t",
        rightSpoken: "cosine 6 t",
        why: why("sine-only"),
      },
    ],
    rightOrder: [1, 3, 0, 2],
  },
];

export function TrigDoubleMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      objective={
        <>
          Goal: join each expression to the single function it is equal to, so the board
          ends up showing four long expressions and the four short ones they can each be
          traded for.
        </>
      }
      prompt="Decide which function the form produces before you double the angle. Only one of these forms gives a sine."
      conclusion={
        <>
          Every one of these is a doubling identity, so every join doubles the angle. What
          separates them is the function they come out as: a product of a sine and a cosine
          at the same angle collapses to a sine, and all three of the others collapse to a
          cosine. Which of those three to reach for is decided by the expression in front of
          you rather than by taste, since each is written in a different function and one of
          them will be written in the function you were handed.
        </>
      }
      ariaLabel="Four doubling expressions to be joined to the single function each one equals"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four different angles"
    />
  );
}
