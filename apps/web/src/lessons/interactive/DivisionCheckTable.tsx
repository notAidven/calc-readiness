/**
 * POL.8 slide 2: fill in the column that keeps a long division lined up.
 *
 * A dividend with a power missing is where this method breaks, and it breaks silently: the
 * subtraction still runs, the columns just stop meaning what they meant, and the answer comes
 * out wrong with no step that looks wrong. Writing the missing power in as a zero coefficient
 * is the whole fix, and a table is the shape that shows why, because the empty cell is visible
 * before it is filled.
 *
 * The tray offers the term with the power simply omitted, which is what a learner writes when
 * they skip the column, so the wrong answer is on the board rather than described.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  /** The dividend is $x^{3} + 0x^{2} + bx + c$, with the squared term absent. */
  b: number;
  c: number;
}

/** Neither board is the slide's own $x^{3} - 7x + 6$. */
const BOARDS: readonly Board[] = [
  { b: -9, c: 10 },
  { b: -4, c: 12 },
];

export function DivisionCheckTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { b, c } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const sign = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);
  const given = `x^{3} ${sign(b)}x ${sign(c)}`;

  return (
    <FillTable
      key={variant.nonce}
      headings={["column", "what the dividend has there", "written for the division"]}
      rows={[
        {
          id: "cube",
          fixed: ["x^{3}", "x^{3}"],
          value: "x^{3}",
          blank: false,
          spoken: "the x cubed column",
        },
        {
          id: "square",
          fixed: ["x^{2}", "\\text{nothing}"],
          value: "0x^{2}",
          blank: true,
          spoken: "the x squared column",
          why: (
            <>
              The dividend carries no squared term, and the column still has to exist, or
              every later subtraction lines up under the wrong power. Writing{" "}
              <InlineMath latex="0x^{2}" /> changes the value of the dividend by nothing and
              keeps the columns honest, which is the only reason it is there.
            </>
          ),
        },
        {
          id: "linear",
          fixed: ["x", `${sign(b)}x`],
          value: `${sign(b)}x`,
          blank: false,
          spoken: "the x column",
        },
        {
          id: "unit",
          fixed: ["\\text{units}", `${sign(c)}`],
          value: `${sign(c)}`,
          blank: true,
          spoken: "the units column",
          why: (
            <>
              The constant travels with its own sign, so the units column holds{" "}
              <InlineMath latex={`${sign(c)}`} /> exactly as written. Nothing is dropped or
              turned over when the dividend is laid out; the turning over happens later, in
              the subtractions.
            </>
          ),
        },
      ]}
      options={[
        { id: "zero", latex: "0x^{2}", spoken: "zero x squared" },
        {
          id: "const",
          latex: `${sign(c)}`,
          spoken: `${c < 0 ? "minus" : "plus"} ${Math.abs(c)}`,
        },
        { id: "blank", latex: "\\text{leave it out}", spoken: "leave the column out" },
        {
          id: "flip",
          latex: `${sign(-c)}`,
          spoken: `${c < 0 ? "plus" : "minus"} ${Math.abs(c)}`,
        },
      ]}
      objective={
        <>
          Goal: lay <InlineMath latex={given} /> out in columns so that every power has one,
          which is what keeps the later subtractions under the terms they belong to.
        </>
      }
      prompt="Drag a value into the open row, or tap the value and then the row."
      conclusion={
        <>
          Laid out for division the dividend reads{" "}
          <InlineMath latex={`x^{3} + 0x^{2} ${sign(b)}x ${sign(c)}`} />, which is the same
          amount with one column made explicit. Leaving the column out is the commonest way
          a division comes out wrong with no step in it that looks wrong.
        </>
      }
      ariaLabel={`A table laying out ${given} in columns for long division`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different dividend"
    />
  );
}
