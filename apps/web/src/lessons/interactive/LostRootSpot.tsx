/**
 * POL.3 slide 3: find the line where a solution was thrown away.
 *
 * This error is invisible from the answer: the surviving solution is genuinely a solution, so
 * checking it succeeds and the work looks sound. Nothing about a learner's own attempt would
 * show it. Handing them somebody else's work and asking which line stops following is the only
 * way to make the discarded value visible, because the line that discards it is the only place
 * it exists.
 *
 * The three replacements are all ways of dealing with a variable on both sides, so choosing one
 * is a statement about what may be divided out (R22).
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The equation is $x^{2} = k x$, whose solutions are $0$ and $k$. */
  k: number;
}

/** Neither board is the slide's own $x^{2} = 5x$. */
const BOARDS: readonly Board[] = [{ k: 7 }, { k: 9 }];

export function LostRootSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { k } = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Goal: find the first line of this solution that does not follow, then choose the
          line that should have been written there. The answer it reaches is a real
          solution, so the error is not in the arithmetic.
        </>
      }
      heading={
        <>
          A clerk has solved <InlineMath latex={`x^{2} = ${k}x`} /> and reported one answer.
        </>
      }
      lines={[
        {
          id: "given",
          latex: `x^{2} = ${k}x`,
          spoken: "the equation as it was set",
          fine: "This is the question as it was set, so there is nothing here that could fail to follow.",
        },
        {
          id: "divide",
          latex: `\\dfrac{x^{2}}{x} = \\dfrac{${k}x}{x}`,
          wrong: true,
          spoken: "both sides divided by x",
          fine: "",
        },
        {
          id: "answer",
          latex: `x = ${k}`,
          spoken: `x equals ${k}`,
          fine: `This line follows from the one above it, and ${k} really does satisfy the original equation. What is wrong is earlier, and it is what this line is missing rather than what it says.`,
        },
      ]}
      corrections={[
        {
          id: "gather",
          latex: `x^{2} - ${k}x = 0`,
          spoken: "everything gathered onto one side",
          correct: true,
        },
        {
          id: "root",
          latex: `x = \\sqrt{${k}x}`,
          spoken: "a square root taken of both sides",
          miss: (
            <>
              Rooting both sides leaves the variable under a radical on the right, so the
              equation is no easier than it started and nothing has been gathered. The two
              solutions are still not visible.
            </>
          ),
        },
        {
          id: "divideBoth",
          latex: `x = ${k} \\;\\text{ and }\\; x = 0`,
          spoken: `x equals ${k} and x equals zero, asserted directly`,
          miss: (
            <>
              Both values are correct and neither of them has been shown. A line has to
              follow from the one above it, and the line above this divides the second
              solution away, so it cannot produce it again.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          Dividing by <InlineMath latex="x" /> assumes <InlineMath latex="x" /> is not zero,
          and <InlineMath latex="x = 0" /> is a solution of this equation. The division is
          where it disappears, and no later line can bring it back.
        </>
      }
      remedy={
        <>
          Gathering instead gives <InlineMath latex={`x^{2} - ${k}x = 0`} />, so{" "}
          <InlineMath latex={`x(x - ${k}) = 0`} />, and the two conditions are{" "}
          <InlineMath latex="x = 0" /> and <InlineMath latex={`x = ${k}`} />. The factor{" "}
          <InlineMath latex="x" /> is exactly the one the division cancelled.
        </>
      }
      findPrompt="Tap the first line that does not follow from the one above it."
      fixPrompt="Now choose the line that should have been written in its place."
      conclusion={
        <>
          <InlineMath latex={`x^{2} = ${k}x`} /> has the solutions <InlineMath latex="0" />{" "}
          and <InlineMath latex={`${k}`} />. Never divide an equation through by an
          expression carrying the variable, because doing so discards every value that makes
          the expression zero.
        </>
      }
      ariaLabel="Three lines solving a quadratic, one of which discards a solution"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different equation"
    />
  );
}
