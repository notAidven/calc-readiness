/**
 * POL.7 slide 3: the moves that turn a described graph back into a polynomial.
 *
 * Everything before this slide reads a polynomial and produces a graph. This is the same
 * correspondence run backwards, and it is worth its own slide because holding one direction is
 * not holding both: a learner who can find the zeros of a factored form can still write
 * $(x - 3)$ for a zero at $-3$, since going forwards the flip is a step they perform and going
 * backwards it is a step they have to remember to perform.
 *
 * Ordering is the interaction because each move is genuinely blocked by the one before it. The
 * exponents cannot be settled before the brackets exist, and the leading coefficient cannot be
 * placed before there is a product to place it in front of.
 *
 * Built on `OrderSteps`, which owns the mechanic and the board's one reveal.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The described graph: zeros, which one it turns back off, and the leading coefficient. */
  crossed: readonly [number, number];
  touched: number;
  lead: number;
  /** Shuffled positions for the four moves. No move is dealt into its own place. */
  dealt: readonly number[];
}

/** Neither board is the check's own described graph. */
const BOARDS: readonly Board[] = [
  { crossed: [-4, 1], touched: 3, lead: 2, dealt: [3, 0, 1, 2] },
  { crossed: [-2, 5], touched: -1, lead: -3, dealt: [1, 2, 3, 0] },
];

/** `(x - 3)` / `(x + 4)`: the bracket a zero contributes, with the sign flipped. */
function bracket(zero: number): string {
  return `(x ${zero < 0 ? `+ ${-zero}` : `- ${zero}`})`;
}

function steps(board: Board): readonly OrderedStep[] {
  const { crossed, touched, lead } = board;
  const all = [crossed[0], touched, crossed[1]].sort((a, b) => a - b);
  const bare = all.map(bracket).join("");
  const withPower = all
    .map((zero) => (zero === touched ? `${bracket(zero)}^{2}` : bracket(zero)))
    .join("");
  const listed = all.map((zero) => `x = ${zero}`).join(", ");

  return [
    {
      id: "brackets",
      latex: bare,
      spoken: `the three brackets ${all.map((z) => `x ${z < 0 ? "plus" : "minus"} ${Math.abs(z)}`).join(", ")}`,
      why: (
        <>
          Each zero becomes a bracket that is zero AT that value, which means the bracket
          carries the opposite sign to the zero itself: {listed} give{" "}
          <InlineMath latex={bare} />. Nothing about the shape of the graph can be written
          down until these exist, because everything else is an exponent on one of them or a
          constant in front of all of them.
        </>
      ),
    },
    {
      id: "exponent",
      latex: withPower,
      spoken: "the same brackets with the turning one squared",
      why: (
        <>
          The graph turns back off the axis at <InlineMath latex={`x = ${touched}`} />, so
          that factor needs an EVEN number of copies, and least degree makes it two. The
          other two are passed straight through, so one copy of each is enough. This has to
          come after the brackets: an exponent needs something to sit on.
        </>
      ),
    },
    {
      id: "lead",
      latex: `${lead}${withPower}`,
      spoken: `${lead < 0 ? "negative " : ""}${Math.abs(lead)} times all of it`,
      why: (
        <>
          The leading coefficient multiplies the whole product, so it goes out in front once
          the product is complete. It changes no zero and no multiplicity, which is why it
          is last of the three writing moves: <InlineMath latex={`${lead}`} /> scales the
          graph
          {lead < 0 ? " and turns it over" : ""} without moving where it meets the axis.
        </>
      ),
    },
    {
      id: "check",
      text: "Check the degree against the description before stopping",
      spoken: "check the degree against the description",
      why: (
        <>
          The exponents sum to <InlineMath latex="4" />, so the degree is four, and an even
          degree with a{" "}
          <InlineMath latex={lead < 0 ? "\\text{negative}" : "\\text{positive}"} /> leading
          coefficient has both ends going {lead < 0 ? "down" : "up"}. That agrees with a
          graph that turns back off the axis once, and it is the check worth making: a
          learner who wrote every factor once would be at degree three, and an odd degree
          makes the two ends disagree.
        </>
      ),
    },
  ];
}

export function BuildFromGraphOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const all = [board.crossed[0], board.touched, board.crossed[1]].sort((a, b) => a - b);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={steps(board)}
      dealt={board.dealt}
      objective={
        <>
          Build the polynomial of least degree whose graph has zeros at{" "}
          <InlineMath latex={all.map((z) => `x = ${z}`).join(",\\; ")} />, turns back off
          the axis at <InlineMath latex={`x = ${board.touched}`} />, and has leading
          coefficient <InlineMath latex={`${board.lead}`} />.
        </>
      }
      prompt="Tap whichever line can be justified next. A line that needs something not yet on the board is refused."
      ariaLabel="The four moves that build a polynomial from a described graph, shuffled"
      conclusion={
        <>
          Brackets from the zeros with the signs flipped, exponents from the behavior at
          each zero, the leading coefficient in front, then a check that the degree matches
          the description. Writing every factor once is the commonest miss, and the last
          step is what catches it.
        </>
      }
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Build a different graph"
    />
  );
}
