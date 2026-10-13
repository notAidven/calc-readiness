/**
 * POL.7 slide 0: each factor, and the one value of x it is zero at.
 *
 * The sign is the whole difficulty and it is a small one that never stops costing: a factor
 * reading $(x + 5)$ is zero at $-5$, and a learner who copies the number they can see gets
 * every zero of every polynomial wrong by a sign. A table is the shape that makes the flip
 * visible, because the two columns sit beside each other and the opening rows show the flip
 * happening before the learner is asked to do it.
 *
 * The tray offers the un-flipped value as well, which is the answer a learner gives when they
 * read the bracket instead of solving it, so the wrong answer is on the board rather than
 * described. The constant factor is a row too: it is the one row with nothing in the last
 * column, and leaving it out would let a learner believe every part of a product contributes a
 * zero.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

interface Board {
  /** $f(x) = k(x - p)(x + q)^{2}$, with `q` positive so one bracket adds and one subtracts. */
  k: number;
  p: number;
  q: number;
}

/** Neither board reuses the slide's own polynomial or the check's. */
const BOARDS: readonly Board[] = [
  { k: 2, p: 3, q: 4 },
  { k: 5, p: 1, q: 6 },
];

export function ZerosFromFactorsTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { k, p, q } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const written = `${k}(x - ${p})(x + ${q})^{2}`;

  return (
    <FillTable
      key={variant.nonce}
      headings={["factor", "factor set to zero", "the zero it gives"]}
      rows={[
        {
          id: "constant",
          fixed: [`${k}`, `${k} \\ne 0`],
          value: "\\text{none}",
          blank: false,
          spoken: "the constant factor",
        },
        {
          id: "minus",
          fixed: [`(x - ${p})`, `x - ${p} = 0`],
          value: `x = ${p}`,
          blank: false,
          spoken: `the bracket x minus ${p}`,
        },
        {
          id: "plus",
          fixed: [`(x + ${q})^{2}`, `x + ${q} = 0`],
          value: `x = -${q}`,
          blank: true,
          spoken: `the bracket x plus ${q}, squared`,
          why: (
            <>
              Solving <InlineMath latex={`x + ${q} = 0`} /> takes the{" "}
              <InlineMath latex={`${q}`} /> across, so the zero is at{" "}
              <InlineMath latex={`x = -${q}`} /> and not at{" "}
              <InlineMath latex={`x = ${q}`} />. A bracket that ADDS a number is zero at the
              negative of it, which is the sign flip every one of these factors performs.
              The exponent changes nothing about WHERE the zero is; it says something else,
              which the next slide is about.
            </>
          ),
        },
      ]}
      options={[
        { id: "neg-q", latex: `x = -${q}`, spoken: `x equals negative ${q}` },
        { id: "pos-q", latex: `x = ${q}`, spoken: `x equals ${q}` },
        { id: "none", latex: "\\text{none}", spoken: "no zero at all" },
        { id: "twice", latex: `x = -${2 * q}`, spoken: `x equals negative ${2 * q}` },
      ]}
      objective={
        <>
          Goal: complete the last column for <InlineMath latex={`f(x) = ${written}`} />, so
          the table shows which factors give a zero and what each one gives.
        </>
      }
      prompt="Drag a value into the open row, or tap the value and then the row."
      conclusion={
        <>
          A product is zero exactly when one of its factors is, so each bracket is solved on
          its own and the constant out front never contributes anything. The sign flips on
          the way: <InlineMath latex={`(x + ${q})`} /> is zero at{" "}
          <InlineMath latex={`-${q}`} />. Two brackets, two zeros, whatever exponent either
          of them carries.
        </>
      }
      ariaLabel={`A table taking each factor of ${written} to the zero it gives`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different polynomial"
    />
  );
}
