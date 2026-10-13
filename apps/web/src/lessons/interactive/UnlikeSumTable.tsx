/**
 * RAD.2 interactive (slide 2): work out an unlike sum and the single root it is supposed
 * to equal, exactly, and read off that they are different numbers.
 *
 * $\sqrt{2} + \sqrt{3} = \sqrt{5}$ is the belief this node exists to break, and it survives
 * being contradicted: a learner told "that is not allowed" has been given a rule rather
 * than a reason. The reason is arithmetic, so the board is built entirely out of PERFECT
 * SQUARES. $\sqrt{9} + \sqrt{16}$ is $3 + 4$, which is $7$, and $\sqrt{9 + 16}$ is
 * $\sqrt{25}$, which is $5$. Nobody has to estimate anything, nobody needs a decimal, and
 * the two answers are plainly not the same.
 *
 * That is why this replaced a number line the learner dragged a marker along. Placing
 * $\sqrt{2} + \sqrt{3}$ by eye asks for square-root approximation, which is a skill this
 * node does not teach and does not need, and it made the point look like a matter of
 * roughly where things land rather than a matter of two different numbers.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  /** Two perfect squares, added as roots and then added inside one root. */
  a: number;
  b: number;
  /** A third perfect square, used for the worked row that opens the table. */
  given: readonly [number, number];
  /** Values on offer besides the two answers. */
  distractors: readonly number[];
}

/**
 * Both boards use a pair whose radicands add to a perfect square as well, so the right
 * hand side is a whole number too and neither column needs a decimal to be read.
 */
const BOARDS: readonly Board[] = [
  { a: 9, b: 16, given: [4, 9], distractors: [12, 25, 13] },
  { a: 25, b: 144, given: [9, 16], distractors: [169, 60, 12] },
];

const root = (n: number) => Math.round(Math.sqrt(n));

export function UnlikeSumTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { a, b } = board;
  const [g1, g2] = board.given;
  const sum = root(a) + root(b);
  const merged = root(a + b);

  return (
    <FillTable
      key={variant.nonce}
      headings={["expression", "worked out", "value"]}
      rows={[
        {
          id: "given",
          fixed: [`\\sqrt{${g1}} + \\sqrt{${g2}}`, `${root(g1)} + ${root(g2)}`],
          value: `${root(g1) + root(g2)}`,
          blank: false,
          spoken: `the square root of ${g1} plus the square root of ${g2}`,
        },
        {
          id: "sum",
          fixed: [`\\sqrt{${a}} + \\sqrt{${b}}`, `${root(a)} + ${root(b)}`],
          value: `${sum}`,
          blank: true,
          spoken: `the square root of ${a} plus the square root of ${b}`,
          why: (
            <>
              Both roots come out whole, so there is nothing to estimate:{" "}
              <InlineMath latex={`\\sqrt{${a}} = ${root(a)}`} /> and{" "}
              <InlineMath latex={`\\sqrt{${b}} = ${root(b)}`} />, and{" "}
              <InlineMath latex={`${root(a)} + ${root(b)} = ${sum}`} />. Each root is worked
              out first and only then are the two answers added.
            </>
          ),
        },
        {
          id: "merged",
          fixed: [`\\sqrt{${a} + ${b}}`, `\\sqrt{${a + b}}`],
          value: `${merged}`,
          blank: true,
          spoken: `the square root of ${a} plus ${b}, all under one root`,
          why: (
            <>
              This time the adding happens first, inside the radical:{" "}
              <InlineMath latex={`${a} + ${b} = ${a + b}`} />. Then one root is taken, and{" "}
              <InlineMath latex={`${merged} \\cdot ${merged} = ${a + b}`} />, so{" "}
              <InlineMath latex={`\\sqrt{${a + b}} = ${merged}`} />.
            </>
          ),
        },
      ]}
      // The two answers sit second and fourth rather than first and second, so the row of
      // values cannot be worked left to right without reading any of them.
      options={[
        { id: "d0", latex: `${board.distractors[0]}`, spoken: `${board.distractors[0]}` },
        { id: "sum", latex: `${sum}`, spoken: `${sum}` },
        { id: "d1", latex: `${board.distractors[1]}`, spoken: `${board.distractors[1]}` },
        { id: "merged", latex: `${merged}`, spoken: `${merged}` },
        { id: "d2", latex: `${board.distractors[2]}`, spoken: `${board.distractors[2]}` },
      ]}
      // The table exists to settle a comparison, so the goal is the comparison. Saying which
      // way it comes out would leave the learner filling in a table whose answer they had.
      objective="Goal: work out whether adding the numbers inside the roots gives the same value as adding the roots themselves."
      prompt="The middle column shows the working. Put the missing value in the highlighted row, then do the next one."
      conclusion={
        <>
          <InlineMath latex={`\\sqrt{${a}} + \\sqrt{${b}} = ${sum}`} /> and{" "}
          <InlineMath latex={`\\sqrt{${a} + ${b}} = ${merged}`} />, and those are not the
          same number at all! Adding the radicands is not a rough version of adding the
          roots. It is a different calculation that lands somewhere else, and that is why{" "}
          <InlineMath latex="\sqrt{2} + \sqrt{3}" /> is already the finished answer rather
          than <InlineMath latex="\sqrt{5}" />.
        </>
      }
      ariaLabel={`A table comparing the square root of ${a} plus the square root of ${b} with the square root of ${a + b}`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with two new roots"
    />
  );
}
