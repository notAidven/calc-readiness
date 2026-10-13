/**
 * LIN.1 slide 1: which move can be made first, and why the other one cannot.
 *
 * The slide claims the added number comes off before the coefficient is divided away, and a
 * claim about which move is available first is a claim about a sequence, so the chain is the
 * argument rather than an illustration of it. Each rung rests on exactly the one before it,
 * and `OrderSteps` refuses a rung whose ground is not yet laid, which is what makes the
 * ordering something the learner discovers by trying it.
 *
 * The dividing line is dealt before the subtracting line on both boards, so the learner who
 * reaches for the division first is refused rather than carried past the mistake.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  given: string;
  stripped: string;
  divided: string;
  checked: string;
  spokenGiven: string;
  loose: string;
  coefficient: string;
  product: string;
  answer: string;
  dealt: readonly number[];
}

/** Neither board is the paragraph's $3x + 8 = 29$ nor the CFU's equation. */
const BOARDS: readonly Board[] = [
  {
    given: "6x + 11 = 47",
    stripped: "6x = 36",
    divided: "x = 6",
    checked: "6(6) + 11 = 47",
    spokenGiven: "6 x plus 11 equals 47",
    loose: "11",
    coefficient: "6",
    product: "36",
    answer: "6",
    dealt: [2, 0, 3, 1],
  },
  {
    given: "4x + 9 = 37",
    stripped: "4x = 28",
    divided: "x = 7",
    checked: "4(7) + 9 = 37",
    spokenGiven: "4 x plus 9 equals 37",
    loose: "9",
    coefficient: "4",
    product: "28",
    answer: "7",
    dealt: [1, 2, 0, 3],
  },
];

export function SolveStepsOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  const steps: readonly OrderedStep[] = [
    {
      id: "strip",
      latex: board.stripped,
      spoken: "the loose weight taken off both pans",
      why: (
        <>
          The <InlineMath latex={board.loose} /> was added last, so it is the outer layer
          and the only thing that can come away on its own. Taking it off both pans keeps
          the beam level and leaves the <InlineMath latex={board.coefficient} /> ingots
          against <InlineMath latex={board.product} />.
        </>
      ),
    },
    {
      id: "divide",
      latex: board.divided,
      spoken: "both pans divided by the coefficient",
      why: (
        <>
          Dividing by <InlineMath latex={board.coefficient} /> is what splits the pile into
          single ingots, and it can only happen once the pile is on its own. Divide before
          the <InlineMath latex={board.loose} /> comes off and the loose weight gets split
          as well, which is not what the beam said.
        </>
      ),
    },
    {
      id: "check",
      latex: board.checked,
      spoken: "the value put back into the original equation",
      why: (
        <>
          Last, because there is nothing to substitute until a value exists. Putting{" "}
          <InlineMath latex={board.answer} /> back into the equation the beam gave returns{" "}
          <InlineMath latex={board.given.split(" = ")[1] ?? ""} />, so the two pans really
          do come out equal.
        </>
      ),
    },
    {
      id: "state",
      latex: `\\{${board.answer}\\}`,
      spoken: "the solution set",
      why: (
        <>
          The set is written only after the check, because it claims that{" "}
          <InlineMath latex={board.answer} /> is the value that works and the check is what
          establishes it. One value in the braces, because one ingot weight levels this
          beam.
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
          Goal: build the chain that gets <InlineMath latex={board.given} /> down to a
          single ingot weight, where each line is the only one the line above it makes
          possible.
        </>
      }
      prompt="Tap the line that can come next, given only what is already on the board."
      conclusion={
        <>
          <InlineMath latex={board.given} /> came apart in that order and no other: the
          loose weight, then the coefficient, then the check, then the claim. Peeling the
          outermost operation first is what kept every line true.
        </>
      }
      ariaLabel={`Four lines solving ${board.spokenGiven}, to be put in order`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different equation"
    />
  );
}
