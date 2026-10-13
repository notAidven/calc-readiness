/**
 * EXP.1 interactive (slide 4): finish the ledger down to the zero power.
 *
 * The argument for $b^{0} = 1$ is that nothing special happens at zero, and a learner can
 * only see that if the ordinary steps are still on screen when the odd-looking one is
 * written. So the shape is a table: two rows already worked as the pattern, two rows blank,
 * filled from the top down. A single question would have hidden the very thing that makes
 * the answer forced.
 *
 * $0$ is on offer as a value, because "a base to the power zero is zero" is the belief this
 * slide exists to displace, and a distractor that nobody reaches for tests nothing.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable } from "./kinds/FillTable";

/** Neither base is the slide's own base 2, so the values cannot be read off the prose. */
const BASES: readonly number[] = [3, 5];

export function ZeroExponentTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BASES.length, props);
  const base = BASES[variant.index] ?? (BASES[0] as number);
  const cube = base ** 3;
  const square = base ** 2;

  return (
    <FillTable
      key={variant.nonce}
      headings={["power", "one step down", "value"]}
      rows={[
        {
          id: "r3",
          fixed: [`${base}^{3}`, "\\text{the top line}"],
          value: `${cube}`,
          blank: false,
          spoken: `${base} to the 3`,
        },
        {
          id: "r2",
          fixed: [`${base}^{2}`, `${cube} \\div ${base}`],
          value: `${square}`,
          blank: false,
          spoken: `${base} to the 2`,
        },
        {
          id: "r1",
          fixed: [`${base}^{1}`, `${square} \\div ${base}`],
          value: `${base}`,
          blank: true,
          spoken: `${base} to the 1`,
          why: (
            <>
              Every step down this table divides the line above it by{" "}
              <InlineMath latex={`${base}`} />, and{" "}
              <InlineMath latex={`${square} \\div ${base} = ${base}`} />. Nothing new is
              happening in this row; it is the same step the row above took.
            </>
          ),
        },
        {
          id: "r0",
          fixed: [`${base}^{0}`, `${base} \\div ${base}`],
          value: "1",
          blank: true,
          spoken: `${base} to the 0`,
          why: (
            <>
              The step does not change just because the exponent has reached zero:{" "}
              <InlineMath latex={`${base} \\div ${base} = 1`} />. So{" "}
              <InlineMath latex={`${base}^{0} = 1`} />, and it comes out of dividing rather
              than out of a rule somebody decided. A power counts copies of the base, and
              zero copies leaves the <InlineMath latex="1" /> you were multiplying them
              into, which is why the answer is <InlineMath latex="1" /> and not{" "}
              <InlineMath latex="0" />.
            </>
          ),
        },
      ]}
      options={[
        { id: "zero", latex: "0", spoken: "zero" },
        { id: "one", latex: "1", spoken: "one" },
        { id: "base", latex: `${base}`, spoken: `${base}` },
        { id: "recip", latex: `\\tfrac{1}{${base}}`, spoken: `1 over ${base}` },
        { id: "square", latex: `${square}`, spoken: `${square}` },
      ]}
      // The value the ladder lands on is what the learner is meant to arrive at, so the goal
      // asks what the last step does rather than saying what it gives.
      objective="Goal: carry the dividing down to the bottom line and see what the exponent reaching zero does to the value."
      prompt={`Each line divides the one above it by ${base}. Put the missing value in the highlighted row, then do the next one.`}
      conclusion={
        <>
          The table walked straight down to <InlineMath latex={`${base}^{0} = 1`} /> without
          ever changing what it was doing, so no special case was needed at all! That is why{" "}
          <strong>any base to the power zero is one</strong>, and the one base it does not
          hold for is <InlineMath latex="0" /> itself, where the division would be by zero.
        </>
      }
      ariaLabel={`A table of powers of ${base} stepping down to the zero power`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different base"
    />
  );
}
