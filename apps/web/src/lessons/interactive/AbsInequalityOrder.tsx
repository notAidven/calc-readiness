/**
 * LIN.6 slide 3: the direction of the sign is read FIRST, and the chain is what proves it matters.
 *
 * The slide's last sentence is that reading the sign before solving is what keeps the two shapes
 * apart. That is a claim about ORDER, so the chain is the argument: the first rung is the shape
 * decision and every later rung rests on it, and a learner who reaches for the arithmetic before
 * the shape is refused with the reason.
 *
 * The arithmetic rung and the shape rung are both dealt before the finished union, so a learner who
 * goes for the answer is refused rather than carried, and the two boards point their signs in
 * opposite directions so neither chain can be built from the other's memory.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  given: string;
  spokenGiven: string;
  /** The branch pair, the two solved branches, and the finished answer. */
  branches: string;
  solvedLower: string;
  solvedUpper: string;
  answer: string;
  /** Which way the sign points, in words the rungs can use. */
  away: boolean;
  divisor: string;
  dealt: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    given: "\\lvert 4x - 8 \\rvert > 12",
    spokenGiven: "the absolute value of 4 x minus 8 is greater than 12",
    branches: "4x - 8 > 12 \\;\\text{ or }\\; 4x - 8 < -12",
    solvedLower: "x < -1",
    solvedUpper: "x > 5",
    answer: "(-\\infty, -1) \\cup (5, \\infty)",
    away: true,
    divisor: "4",
    dealt: [2, 0, 3, 1],
  },
  {
    given: "\\lvert 2x + 4 \\rvert \\le 10",
    spokenGiven: "the absolute value of 2 x plus 4 is at most 10",
    branches: "-10 \\le 2x + 4 \\le 10",
    solvedLower: "-14 \\le 2x \\le 6",
    solvedUpper: "-7 \\le x \\le 3",
    answer: "[-7, 3]",
    away: false,
    divisor: "2",
    dealt: [1, 3, 0, 2],
  },
];

export function AbsInequalityOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const steps: readonly OrderedStep[] = [
    {
      id: "shape",
      text: board.away
        ? "The sign points away from the bars, so the answer will be two rays."
        : "The sign points towards the bars, so the answer will be one band.",
      spoken: board.away
        ? "the sign points away from the bars, so the answer will be two rays"
        : "the sign points towards the bars, so the answer will be one band",
      why: (
        <>
          First, because it is the only step that needs nothing computed: the direction of
          the sign in <InlineMath latex={board.given} /> is visible as it stands. Every line
          after this one is written in the shape this decides, so deciding it later means
          writing the wrong shape and then discovering it.
        </>
      ),
    },
    {
      id: "unpack",
      latex: board.branches,
      spoken: board.away
        ? "the two branches, joined by or"
        : "the compound inequality holding the quantity between the negative tolerance and the positive one",
      why: (
        <>
          {board.away
            ? "This is what the shape decision commits to: two separate statements joined by or, because a quantity more than the tolerance from zero is out on one side or the other."
            : "This is what the shape decision commits to: one compound inequality, because a quantity within the tolerance of zero is above the negative one and below the positive one at the same time."}{" "}
          It cannot come first, because which of the two shapes to write is exactly what the
          rung above settles.
        </>
      ),
    },
    {
      id: "solve",
      latex: board.away
        ? `${board.solvedUpper} \\;\\text{ or }\\; ${board.solvedLower}`
        : board.solvedUpper,
      spoken: "the branches solved for the variable",
      why: (
        <>
          Ordinary solving, and it needs the previous line to have something to solve.
          Dividing by <InlineMath latex={board.divisor} /> divides by a positive number, so
          no sign turns over anywhere on this step.
        </>
      ),
    },
    {
      id: "write",
      latex: board.answer,
      spoken: "the answer in interval notation",
      why: (
        <>
          Last, because the notation only records what the solving found. The brackets come
          from the sign the rule started with, and the{" "}
          {board.away
            ? "union joins the two rays it left"
            : "single pair of brackets holds the one band"}
          .
        </>
      ),
    },
  ];

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: build the chain that takes <InlineMath latex={board.given} /> to a written
          answer, where the shape of that answer is settled before any arithmetic is done.
        </>
      }
      prompt="Tap the line that can come next, given only what is already on the board."
      conclusion={
        <>
          <InlineMath latex={board.given} /> comes to <InlineMath latex={board.answer} />,
          and the shape of it was fixed by the first rung rather than discovered at the
          last. The arithmetic in the middle would have been identical for the other
          direction of sign, which is exactly why the direction has to be read first.
        </>
      }
      ariaLabel={`Four lines solving ${board.spokenGiven}, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different rule"
    />
  );
}
