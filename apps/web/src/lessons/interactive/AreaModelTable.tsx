/**
 * POL.1 slide 3: fill in the four rectangles a court divides into.
 *
 * The whole content of the slide is that every part of one side meets every part of the other
 * exactly once, and the way a learner loses that is by producing two products instead of four.
 * A table with the four row labels already drawn makes the count visible before any of the
 * areas are known, so the missing thing is the arithmetic rather than the bookkeeping.
 *
 * The two given rows are the corners a learner never gets wrong, and the two blanks are the
 * cross terms, which are the ones that go missing.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  p: number;
  q: number;
}

/** Neither court is the slide's own $(x + 3)(x + 5)$ nor the check's $(x + 6)(2x + 1)$. */
const BOARDS: readonly Board[] = [
  { p: 2, q: 7 },
  { p: 4, q: 6 },
];

export function AreaModelTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { p, q } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const middle = p + q;

  return (
    <FillTable
      key={variant.nonce}
      headings={["piece of one side", "piece of the other", "area"]}
      rows={[
        {
          id: "xx",
          fixed: ["x", "x"],
          value: "x^{2}",
          blank: false,
          spoken: "x by x",
        },
        {
          id: "xq",
          fixed: ["x", `${q}`],
          value: `${q}x`,
          blank: true,
          spoken: `x by ${q}`,
          why: (
            <>
              A rectangle <InlineMath latex="x" /> along and <InlineMath latex={`${q}`} />{" "}
              across has area <InlineMath latex={`${q}x`} />. It is one of the two strips
              that run along the edges of the square, and it carries a single{" "}
              <InlineMath latex="x" /> rather than <InlineMath latex="x^{2}" /> because only
              one of its sides is unknown.
            </>
          ),
        },
        {
          id: "px",
          fixed: [`${p}`, "x"],
          value: `${p}x`,
          blank: true,
          spoken: `${p} by x`,
          why: (
            <>
              This is the other strip, <InlineMath latex={`${p}`} /> along and{" "}
              <InlineMath latex="x" /> across, so its area is <InlineMath latex={`${p}x`} />
              . It is a separate rectangle from the one above even though both are counted
              in <InlineMath latex="x" />, which is why the court has four pieces and not
              three.
            </>
          ),
        },
        {
          id: "pq",
          fixed: [`${p}`, `${q}`],
          value: `${p * q}`,
          blank: false,
          spoken: `${p} by ${q}`,
        },
      ]}
      options={[
        { id: "qx", latex: `${q}x`, spoken: `${q} x` },
        { id: "px", latex: `${p}x`, spoken: `${p} x` },
        { id: "sum", latex: `${middle}x`, spoken: `${middle} x` },
        { id: "sq", latex: `${p * q}x^{2}`, spoken: `${p * q} x squared` },
      ]}
      objective={
        <>
          Goal: complete the four areas a court measuring <InlineMath latex={`x + ${p}`} />{" "}
          by <InlineMath latex={`x + ${q}`} /> divides into, so that the pieces can be added
          back to the whole.
        </>
      }
      prompt="Drag a value into the open row, or tap the value and then the row."
      conclusion={
        <>
          The four pieces are <InlineMath latex="x^{2}" />, <InlineMath latex={`${q}x`} />,{" "}
          <InlineMath latex={`${p}x`} /> and <InlineMath latex={`${p * q}`} />, so the court
          comes to <InlineMath latex={`x^{2} + ${middle}x + ${p * q}`} />. The two strips
          are like terms and collect into one, which is why the finished amount has three
          terms even though the court has four pieces.
        </>
      }
      ariaLabel={`A table of the four rectangles a court measuring x plus ${p} by x plus ${q} divides into`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different court"
    />
  );
}
