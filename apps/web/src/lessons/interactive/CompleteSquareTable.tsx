/**
 * POL.4 slide 1: run the halving down a column, including the row where the middle term is
 * negative.
 *
 * The rule is two moves and the second one hides the first: a learner who remembers "square
 * half of it" and meets a negative middle term often carries the minus into the constant. Four
 * rows side by side make that impossible to miss, because the row above is still on screen when
 * the odd-looking one is written.
 *
 * The negative value is on offer in the tray, because "the constant goes negative when the
 * middle term does" is the belief this board exists to displace, and a distractor nobody reaches
 * for tests nothing.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  /** Two worked rows and two blanks, given by their middle coefficients. */
  shown: readonly [number, number];
  blanks: readonly [number, number];
}

/**
 * The second blank on each board is NEGATIVE, which is the row the rule is misremembered on.
 *
 * Board 1's `shown: [6, 12]` was re-opened as a possible repeat of the slide's own worked
 * example and SETTLED as a near-miss. The slide works $x^{2} - 12x$; the board shows
 * $x^{2} + 12x$ — same magnitude, opposite sign, and the sign is the entire subject of the
 * slide. More to the point, it is a SHOWN row rather than a blank: what the learner actually
 * answers here is $8$ and $-10$, and neither appears anywhere in POL.4's five worked
 * examples. The `6` is deliberate for the same reason it is safe — it is slide 0's court,
 * standing as the familiar anchor the odd-looking row is read against.
 */
const BOARDS: readonly Board[] = [
  { shown: [6, 12], blanks: [8, -10] },
  { shown: [4, 14], blanks: [16, -6] },
];

function row(b: number, blank: boolean) {
  const half = b / 2;
  const constant = half * half;
  const sign = b < 0 ? "-" : "+";
  return {
    id: `b${b}`,
    fixed: [`x^{2} ${sign} ${Math.abs(b)}x`, `${half}`],
    value: `${constant}`,
    blank,
    spoken: `x squared ${b < 0 ? "minus" : "plus"} ${Math.abs(b)} x`,
    why: blank ? (
      <>
        Half of <InlineMath latex={`${b}`} /> is <InlineMath latex={`${half}`} />, and
        squaring it gives <InlineMath latex={`${constant}`} />.{" "}
        {b < 0 ? (
          <>
            Squaring a negative gives a positive, so the constant is{" "}
            <InlineMath latex={`${constant}`} /> and not{" "}
            <InlineMath latex={`${-constant}`} />: the finished square is{" "}
            <InlineMath latex={`(x ${sign} ${Math.abs(half)})^{2}`} />, where the minus sits
            inside the bracket rather than on the constant.
          </>
        ) : (
          <>
            The finished square is <InlineMath latex={`(x + ${half})^{2}`} />, which is what
            the two strips and the corner close up into.
          </>
        )}
      </>
    ) : undefined,
  };
}

export function CompleteSquareTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const [s1, s2] = board.shown;
  const [b1, b2] = board.blanks;
  const answer1 = (b1 / 2) ** 2;
  const answer2 = (b2 / 2) ** 2;

  return (
    <FillTable
      key={variant.nonce}
      headings={["the amount so far", "half the middle", "the constant that completes it"]}
      rows={[row(s1, false), row(s2, false), row(b1, true), row(b2, true)]}
      options={[
        { id: "a1", latex: `${answer1}`, spoken: `${answer1}` },
        { id: "a2", latex: `${answer2}`, spoken: `${answer2}` },
        { id: "neg", latex: `${-answer2}`, spoken: `minus ${answer2}` },
        { id: "half", latex: `${Math.abs(b2) / 2}`, spoken: `${Math.abs(b2) / 2}` },
      ]}
      objective={
        <>
          Goal: complete the column of constants, so that each row's amount becomes a
          perfect square and the two negative-middle rows can be read against the positive
          ones.
        </>
      }
      prompt="Drag a value into the open row, or tap the value and then the row."
      conclusion={
        <>
          The constant is always <InlineMath latex="\left(\dfrac{b}{2}\right)^{2}" />, and
          it is positive whatever the sign of the middle term, because squaring removes the
          sign. What the minus does instead is move inside the bracket:{" "}
          <InlineMath
            latex={`x^{2} - ${Math.abs(b2)}x + ${answer2} = (x - ${Math.abs(b2) / 2})^{2}`}
          />
          .
        </>
      }
      ariaLabel="A table of middle coefficients, their halves, and the constants that complete the square"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different amounts"
    />
  );
}
