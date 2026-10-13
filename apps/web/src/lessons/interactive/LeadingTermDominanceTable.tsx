/**
 * POL.6 slide 0: which part of a polynomial is still deciding anything far out.
 *
 * The claim the whole node rests on is that the ends of a graph are settled by one term, and a
 * learner has no reason to believe it: every other term is right there on the page and none of
 * them looks negligible. A table is what makes the claim checkable, because the two columns
 * pull apart as the input grows and the learner fills in the row where they have pulled apart
 * so far that the second one no longer matters.
 *
 * The opening rows are deliberately the SMALL inputs, where the two columns are comparable and
 * the lower terms genuinely do most of the work. That is the pattern to read off: nothing is
 * being claimed about the middle of the graph, only about its ends, and a table that started
 * at a large input would have hidden the distinction it exists to draw.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  /** $f(x) = ax^{3} + bx^{2} + c$, chosen so the lower terms are large next to the lead. */
  a: number;
  b: number;
  c: number;
}

/** Neither board is the slide's own polynomial, and both give the lower terms a real head start. */
const BOARDS: readonly Board[] = [
  { a: 2, b: 40, c: 500 },
  { a: 3, b: 60, c: 800 },
];

/** Thousands separators would read as a list of numbers inside a table of numbers. */
function plain(value: number): string {
  return `${value}`;
}

export function LeadingTermDominanceTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { a, b, c } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const lead = (x: number) => a * x ** 3;
  const rest = (x: number) => b * x ** 2 + c;
  const written = `${a}x^{3} + ${b}x^{2} + ${c}`;

  return (
    <FillTable
      key={variant.nonce}
      headings={["the input", "the leading term", "everything else, together"]}
      rows={[
        {
          id: "x1",
          fixed: ["x = 1", plain(lead(1))],
          value: plain(rest(1)),
          blank: false,
          spoken: "at x equals 1",
        },
        {
          id: "x10",
          fixed: ["x = 10", plain(lead(10))],
          value: plain(rest(10)),
          blank: false,
          spoken: "at x equals 10",
        },
        {
          id: "x100",
          fixed: ["x = 100", plain(lead(100))],
          value: plain(rest(100)),
          blank: true,
          spoken: "at x equals 100",
          why: (
            <>
              The other terms have not stopped growing, they have simply been outgrown. At{" "}
              <InlineMath latex="x = 100" /> they come to{" "}
              <InlineMath latex={plain(rest(100))} /> while the leading term alone is{" "}
              <InlineMath latex={plain(lead(100))} />, which is more than{" "}
              <InlineMath latex={`${Math.floor(lead(100) / rest(100))}`} /> times as large.
              Every further step widens the gap, because a cube climbs faster than a square
              does and a constant does not climb at all.
            </>
          ),
        },
        {
          id: "x1000",
          fixed: ["x = 1000", plain(lead(1000))],
          value: plain(rest(1000)),
          blank: true,
          spoken: "at x equals 1000",
          why: (
            <>
              One step further out and the leading term is over{" "}
              <InlineMath latex={`${Math.floor(lead(1000) / rest(1000))}`} /> times the rest
              put together. This is why the ends of the graph can be settled from one term:
              far enough out, the sign and the size of <InlineMath latex={`${a}x^{3}`} />{" "}
              are the sign and the size of <InlineMath latex="f(x)" />.
            </>
          ),
        },
      ]}
      options={[
        {
          id: "rest100",
          latex: plain(rest(100)),
          spoken: `${rest(100)}`,
        },
        {
          id: "rest1000",
          latex: plain(rest(1000)),
          spoken: `${rest(1000)}`,
        },
        {
          id: "lead100",
          latex: plain(lead(100)),
          spoken: `${lead(100)}`,
        },
        {
          id: "sum1000",
          latex: plain(lead(1000) + rest(1000)),
          spoken: `${lead(1000) + rest(1000)}`,
        },
      ]}
      objective={
        <>
          Goal: fill the two far rows for <InlineMath latex={`f(x) = ${written}`} /> so the
          table shows which column is still deciding the size of <InlineMath latex="f(x)" />{" "}
          once the input is large.
        </>
      }
      prompt="Drag a value into the open row, or tap the value and then the row."
      conclusion={
        <>
          At <InlineMath latex="x = 1" /> the other terms are far larger than the leading
          term, and by <InlineMath latex="x = 1000" /> they are a rounding error beside it.
          So the ENDS of the graph are decided by the leading term alone, which is the one
          reading this lesson takes from a polynomial. Nothing here says anything about the
          middle, where those other terms are still doing the work.
        </>
      }
      ariaLabel={`A table comparing the leading term of ${written} against the rest of it at four inputs`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different polynomial"
    />
  );
}
