/**
 * POL.1 slide 2: find the line where a subtraction stopped reaching.
 *
 * The defect this slide is about is not a slip in arithmetic, it is a slip in SCOPE: the minus
 * sign is taken to apply to the first term of what is being withdrawn and to nothing after it.
 * A learner asked to compute the difference themselves usually reproduces the error rather than
 * noticing it, so the interaction hands them somebody else's work with the error already in it
 * and asks which line stops following.
 *
 * The three replacements offered afterwards are all sign patterns rather than values, so
 * picking one is a statement about how far the minus reaches (R22).
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { SpotTheError } from "./kinds/SpotTheError";

interface Board {
  /** The two amounts, as coefficient triples in descending order. */
  first: readonly [number, number, number];
  second: readonly [number, number, number];
}

function tex(t: readonly [number, number, number]): string {
  const [a, b, c] = t;
  const sign = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);
  return `${a}x^{2} ${sign(b)}x ${sign(c)}`;
}

/**
 * Both boards carry a NEGATIVE middle term in the withdrawn amount, because that is the term
 * whose sign flips to a plus and the one a learner is least willing to believe.
 */
const BOARDS: readonly Board[] = [
  { first: [5, 2, -1], second: [2, -6, 4] },
  { first: [4, 3, -7], second: [1, -5, 2] },
];

export function SubtractSignSpot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const [a1, b1, c1] = board.first;
  const [a2, b2, c2] = board.second;

  const signed = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);
  /** The wrong line: the minus reached the first term only. */
  const wrongLine = `${a1 - a2}x^{2} ${signed(b1 + b2)}x ${signed(c1 + c2)}`;
  /** The right line: every sign inside the bracket turns over. */
  const rightLine = `${a1 - a2}x^{2} ${signed(b1 - b2)}x ${signed(c1 - c2)}`;
  const halfWay = `${a1 - a2}x^{2} ${signed(b1 - b2)}x ${signed(c1 + c2)}`;

  return (
    <SpotTheError
      key={variant.nonce}
      objective={
        <>
          Goal: find the first line of this subtraction that does not follow from the one
          above it, then choose the line that should have been written there.
        </>
      }
      heading={
        <>
          A clerk has worked out{" "}
          <InlineMath latex={`(${tex(board.first)}) - (${tex(board.second)})`} /> and
          reached an answer.
        </>
      }
      lines={[
        {
          id: "given",
          latex: `(${tex(board.first)}) - (${tex(board.second)})`,
          spoken: "the subtraction as it was written",
          fine: "This is the question as it was set, so there is nothing here that could fail to follow.",
        },
        {
          id: "expand",
          latex: `${tex(board.first)} - ${a2}x^{2} ${signed(b2)}x ${signed(c2)}`,
          wrong: true,
          spoken: "the brackets removed",
          fine: "",
        },
        {
          id: "collect",
          latex: wrongLine,
          spoken: "the terms collected",
          fine: "The collecting on this line is faithful to the line above it, so if that line were right this one would be too. The error is earlier.",
        },
      ]}
      corrections={[
        {
          id: "all",
          latex: `${tex(board.first)} - ${a2}x^{2} ${signed(-b2)}x ${signed(-c2)}`,
          spoken: "every sign inside the bracket turned over",
          correct: true,
        },
        {
          id: "middle",
          latex: `${tex(board.first)} - ${a2}x^{2} ${signed(-b2)}x ${signed(c2)}`,
          spoken: "the first two signs turned over and the last one left",
          miss: (
            <>
              The middle term is right here and the constant is not. A subtraction takes the
              whole amount away, so the <InlineMath latex={`${signed(c2)}`} /> at the end
              has to turn over as well.
            </>
          ),
        },
        {
          id: "none",
          latex: `${tex(board.first)} - ${a2}x^{2} ${signed(b2)}x ${signed(c2)}`,
          spoken: "no sign turned over at all",
          miss: (
            <>
              Nothing has changed on this line, so it is the work as the clerk wrote it. The
              minus in front of the bracket has to reach every term inside it, and here it
              reaches none of them.
            </>
          ),
        },
      ]}
      diagnosis={
        <>
          The minus was applied to <InlineMath latex={`${a2}x^{2}`} /> and then dropped.
          What is being taken away is the whole amount, so the sign of every term inside the
          bracket turns over.
        </>
      }
      remedy={
        <>
          With all three signs turned over the collecting gives{" "}
          <InlineMath latex={rightLine} />. The middle term is where the two answers differ
          most: <InlineMath latex={halfWay} /> is what a half-corrected version produces.
        </>
      }
      findPrompt="Tap the first line that does not follow from the one above it."
      fixPrompt="Now choose the line that should have been written in its place."
      conclusion={
        <>
          <InlineMath
            latex={`(${tex(board.first)}) - (${tex(board.second)}) = ${rightLine}`}
          />
          . Subtracting an amount is adding its opposite, and an opposite turns over every
          term rather than the first one.
        </>
      }
      ariaLabel={`Three lines of a polynomial subtraction, one of which does not follow`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different subtraction"
    />
  );
}
