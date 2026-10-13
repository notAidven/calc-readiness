/**
 * TRG.6 interactive (slide 3): pair each function with the length of one cycle.
 *
 * A correspondence rather than a procedure, and the distractors do the work: every period on
 * the right is somebody's correct answer, so a learner who reaches for $2\pi$ because it is
 * the one they remember loses the pair it really belongs to as well as their own.
 *
 * Each board holds one function that repeats every half turn, one that repeats every whole
 * turn, and two carrying a coefficient inside. That mix is deliberate. The two facts a
 * learner has to hold apart are that tangent and cotangent are the fast pair while the four
 * others are not, and that a coefficient divides whichever of the two base lengths the
 * function started with. A board of four squeezed functions would teach the division and
 * quietly hide the pair.
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

/** The reason a pair holds: which base length the function starts from, and what divides it. */
function why(base: "half" | "whole", coefficient: number, period: string): ReactNode {
  const baseTex = base === "half" ? "\\pi" : "2\\pi";
  return coefficient === 1 ? (
    base === "half" ? (
      <>
        Tangent and cotangent are ratios of two lengths, and half a turn swaps both signs at
        once, which leaves the ratio exactly where it was. So one cycle is{" "}
        <InlineMath latex={baseTex} /> rather than a whole turn.
      </>
    ) : (
      <>
        A reciprocal repeats whenever the reading underneath it repeats, and that takes a
        whole turn. So one cycle is <InlineMath latex={baseTex} />.
      </>
    )
  ) : (
    <>
      The coefficient inside runs the argument through its cycle{" "}
      <InlineMath latex={`${coefficient}`} /> times as fast, so the cycle takes{" "}
      <InlineMath latex={`\\dfrac{${baseTex}}{${coefficient}} = ${period}`} />. The base
      length is <InlineMath latex={baseTex} /> here because that is what this function
      repeats in before anything is squeezed.
    </>
  );
}

const BOARDS: readonly Board[] = [
  {
    pairs: [
      {
        id: "tan",
        left: "\\tan\\theta",
        right: "\\pi",
        leftSpoken: "tangent of theta",
        rightSpoken: "pi",
        why: why("half", 1, "\\pi"),
      },
      {
        id: "sec",
        left: "\\sec\\theta",
        right: "2\\pi",
        leftSpoken: "secant of theta",
        rightSpoken: "two pi",
        why: why("whole", 1, "2\\pi"),
      },
      {
        id: "tan2",
        left: "\\tan(2\\theta)",
        right: "\\dfrac{\\pi}{2}",
        leftSpoken: "tangent of two theta",
        rightSpoken: "pi over two",
        why: why("half", 2, "\\dfrac{\\pi}{2}"),
      },
      {
        id: "csc3",
        left: "\\csc(3\\theta)",
        right: "\\dfrac{2\\pi}{3}",
        leftSpoken: "cosecant of three theta",
        rightSpoken: "two pi over three",
        why: why("whole", 3, "\\dfrac{2\\pi}{3}"),
      },
    ],
    rightOrder: [2, 3, 0, 1],
  },
  {
    pairs: [
      {
        id: "cot",
        left: "\\cot\\theta",
        right: "\\pi",
        leftSpoken: "cotangent of theta",
        rightSpoken: "pi",
        why: why("half", 1, "\\pi"),
      },
      {
        id: "csc",
        left: "\\csc\\theta",
        right: "2\\pi",
        leftSpoken: "cosecant of theta",
        rightSpoken: "two pi",
        why: why("whole", 1, "2\\pi"),
      },
      {
        id: "sec4",
        left: "\\sec(4\\theta)",
        right: "\\dfrac{\\pi}{2}",
        leftSpoken: "secant of four theta",
        rightSpoken: "pi over two",
        why: why("whole", 4, "\\dfrac{\\pi}{2}"),
      },
      {
        id: "cot3",
        left: "\\cot(3\\theta)",
        right: "\\dfrac{\\pi}{3}",
        leftSpoken: "cotangent of three theta",
        rightSpoken: "pi over three",
        why: why("half", 3, "\\dfrac{\\pi}{3}"),
      },
    ],
    rightOrder: [1, 3, 0, 2],
  },
];

export function TrigCycleMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      objective={
        <>
          Goal: join each function to the length of one of its cycles, so the board ends up
          showing which base length each one starts from and what the coefficient inside
          does to it.
        </>
      }
      prompt="Decide the base length first, then divide it by whatever sits with theta inside."
      conclusion={
        <>
          Two base lengths and one division cover all six functions: tangent and cotangent
          start from <InlineMath latex="\pi" />, the other four start from{" "}
          <InlineMath latex="2\pi" />, and a coefficient inside divides whichever one the
          function started with.
        </>
      }
      ariaLabel="Four trigonometric functions to be joined to the length of one cycle each"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with four different functions"
    />
  );
}
