/**
 * POL.6 slide 3: the four moves that turn a written polynomial into a described graph.
 *
 * By this slide the learner has both halves of the reading and the risk is that they apply them
 * in the wrong order, which on this node is not a tidiness matter: a sign read off the term the
 * learner happens to see first is a sign read off the wrong term, and every conclusion after it
 * inherits the mistake. Ordering is the interaction that says so, because each move here is
 * genuinely refused by the board until the move it rests on has been placed.
 *
 * The chain is: find the term of highest degree, then read its exponent, then read its sign,
 * then describe the two ends. The middle two are separable and both are needed, and the last
 * one cannot be justified from either alone.
 *
 * Built on `OrderSteps`, which owns the mechanic and the board's one reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The polynomial the four moves are performed on, deliberately written out of order. */
  written: string;
  spoken: string;
  degree: number;
  /** The leading term, once it has been found. */
  lead: string;
  negative: boolean;
  /** The four moves, shuffled. No dealt position may equal the step's own place. */
  dealt: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    written: "6x^{2} - 3x^{5} + 4",
    spoken: "6 x squared minus 3 x to the fifth plus 4",
    degree: 5,
    lead: "-3x^{5}",
    negative: true,
    dealt: [2, 0, 3, 1],
  },
  {
    written: "10 + 2x^{4} - 7x",
    spoken: "10 plus 2 x to the fourth minus 7 x",
    degree: 4,
    lead: "2x^{4}",
    negative: false,
    dealt: [1, 3, 0, 2],
  },
];

/** The two ends, as the last step states them: left first, then right. */
function ends(degree: number, negative: boolean): { left: string; right: string } {
  const right = negative ? "down" : "up";
  const left = degree % 2 === 0 ? right : negative ? "up" : "down";
  return { left, right };
}

function steps(board: Board): readonly OrderedStep[] {
  const { left, right } = ends(board.degree, board.negative);
  return [
    {
      id: "find",
      text: "Pick out the term of highest degree, wherever it is written",
      spoken: "pick out the term of highest degree",
      why: (
        <>
          Nothing else can be read until this is settled, because every remaining move is
          about this ONE term. Here it is <InlineMath latex={board.lead} />, which is not
          the term written first.
        </>
      ),
    },
    {
      id: "degree",
      latex: `\\text{degree} = ${board.degree}`,
      spoken: `the degree is ${board.degree}`,
      why: (
        <>
          The exponent on that term is the degree of the whole polynomial, and its parity is
          what decides whether the two ends agree. Being{" "}
          {board.degree % 2 === 0 ? "even" : "odd"}, it forces the ends to{" "}
          {board.degree % 2 === 0 ? "agree" : "oppose"}.
        </>
      ),
    },
    {
      id: "sign",
      text: `Leading coefficient is ${board.negative ? "negative" : "positive"}`,
      spoken: `the leading coefficient is ${board.negative ? "negative" : "positive"}`,
      why: (
        <>
          The sign on the same term decides which way the RIGHT end goes, since for a large
          positive input the term takes the sign of its coefficient. This is a second
          reading off the same term and it is independent of the first.
        </>
      ),
    },
    {
      id: "describe",
      text: `So the graph goes ${left} on the left and ${right} on the right`,
      spoken: `so the graph goes ${left} on the left and ${right} on the right`,
      why: (
        <>
          The two readings combine and neither is enough alone: the sign gives the right end
          directly, and the parity says whether the left end matches it. Here that is {left}{" "}
          on the left and {right} on the right.
        </>
      ),
    },
  ];
}

export function EndBehaviorDescribeOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps(board)}
      dealt={board.dealt}
      objective={
        <>
          Build the description of <InlineMath latex={board.written} /> one move at a time,
          so that every line rests on the line above it.
        </>
      }
      prompt="Tap whichever line can be justified next. A line that needs something not yet on the board is refused."
      ariaLabel={`The four moves that describe the ends of ${board.spoken}, shuffled`}
      conclusion={
        <>
          Find the term, then take its degree, then take its sign, then describe. The middle
          two are the pair worth keeping apart: the parity says whether the ends agree and
          the sign says which way, so neither of them describes a graph on its own.
        </>
      }
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Order a different polynomial"
    />
  );
}
