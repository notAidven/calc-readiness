/**
 * TRG.9 slide 1: run the sum formula through, one product at a time.
 *
 * The formula's four values are all special-angle ones a learner already has, so what actually
 * goes wrong is never the arithmetic: it is which value pairs with which, and what the sign in
 * the middle does. A table is the right shape for that because the first product is GIVEN as the
 * pattern, so the second row is the same move applied again and the learner can see what "the
 * same move" was. The last row is where the sign is spent.
 *
 * The sign trap is on the tray rather than in the prose. On the cosine board the two chips
 * $\dfrac{\sqrt{2} - \sqrt{6}}{4}$ and $\dfrac{\sqrt{6} - \sqrt{2}}{4}$ are both there, so
 * subtracting in the wrong direction is a tap that gets refused rather than a slip nobody
 * notices.
 *
 * The cosine board IS a shape the pool can draw, which is unusual here and deliberate. $\cos
 * 75^{\circ}$ from $45^{\circ} + 30^{\circ}$ is one of the six sum draws in
 * `d9.trg9.sum-exact.l1`, and it is used anyway for two reasons: the paragraph beside this widget
 * names that split in so many words, so a learner has it whether the table uses it or not, and
 * the whole authorable exact set on this node is TWO keys, so no choice of angles makes a
 * practice answer harder to recall than a coin flip. The sine board is a split the pool never
 * draws.
 */

import type { ReactNode } from "react";

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
  /** What the finished table is evidence FOR, said once the last blank is filled. */
  payoff: ReactNode;
  /** The combined heading the board evaluates, spoken, for the objective and the label. */
  headingSpoken: string;
  /** The combined heading, as LaTeX. */
  heading: string;
}

function chip(id: string, latex: string, spoken: string) {
  return { id, latex, spoken };
}

/**
 * The cosine board: $\cos 75^{\circ}$ from $45^{\circ} + 30^{\circ}$, which is the split the
 * dialogue names.
 *
 * The sign is the whole board. A plus between the ANGLES becomes a minus between the PRODUCTS,
 * which is the one thing about the cosine formula that has to be read rather than remembered,
 * and the tray holds both orders of the subtraction so the wrong one is a refused tap.
 */
const COSINE_BOARD: Board = {
  heading: "\\cos 75^{\\circ}",
  headingSpoken: "the cosine of 75 degrees",
  rows: [
    {
      id: "cc",
      fixed: ["\\cos 45^{\\circ}\\cos 30^{\\circ}"],
      value: "\\dfrac{\\sqrt{6}}{4}",
      blank: false,
      spoken: "cosine 45 degrees times cosine 30 degrees",
    },
    {
      id: "ss",
      fixed: ["\\sin 45^{\\circ}\\sin 30^{\\circ}"],
      value: "\\dfrac{\\sqrt{2}}{4}",
      blank: true,
      spoken: "sine 45 degrees times sine 30 degrees",
      why: (
        <>
          <InlineMath latex="\sin 45^{\circ} = \dfrac{\sqrt{2}}{2}" /> and{" "}
          <InlineMath latex="\sin 30^{\circ} = \dfrac{1}{2}" />, and multiplying two
          fractions multiplies the tops and the bottoms:{" "}
          <InlineMath latex="\dfrac{\sqrt{2}}{2} \cdot \dfrac{1}{2} = \dfrac{\sqrt{2}}{4}" />
          . The row above did the same thing to the two cosines, which is why it was given.
        </>
      ),
    },
    {
      id: "combined",
      fixed: [
        "\\cos(45^{\\circ} + 30^{\\circ}) = \\cos 45^{\\circ}\\cos 30^{\\circ} - \\sin 45^{\\circ}\\sin 30^{\\circ}",
      ],
      value: "\\dfrac{\\sqrt{6} - \\sqrt{2}}{4}",
      blank: true,
      spoken: "cosine of 45 degrees plus 30 degrees",
      why: (
        <>
          The cosine formula SUBTRACTS the product of the sines from the product of the
          cosines, in that order, so this is{" "}
          <InlineMath latex="\dfrac{\sqrt{6}}{4} - \dfrac{\sqrt{2}}{4}" />, which is{" "}
          <InlineMath latex="\dfrac{\sqrt{6} - \sqrt{2}}{4}" /> over the one denominator.
          Taking them the other way round gives{" "}
          <InlineMath latex="\dfrac{\sqrt{2} - \sqrt{6}}{4}" />, a negative number, and{" "}
          <InlineMath latex="75^{\circ}" /> is short of the vertical, where the cosine is
          still positive.
        </>
      ),
    },
  ],
  options: [
    chip("r2-4", "\\dfrac{\\sqrt{2}}{4}", "root 2 over 4"),
    chip("r2-2", "\\dfrac{\\sqrt{2}}{2}", "root 2 over 2"),
    chip("r6-4", "\\dfrac{\\sqrt{6}}{4}", "root 6 over 4"),
    chip("m-6-2", "\\dfrac{\\sqrt{6} - \\sqrt{2}}{4}", "root 6 minus root 2, over 4"),
    chip("m-2-6", "\\dfrac{\\sqrt{2} - \\sqrt{6}}{4}", "root 2 minus root 6, over 4"),
    chip("p-6-2", "\\dfrac{\\sqrt{6} + \\sqrt{2}}{4}", "root 6 plus root 2, over 4"),
  ],
  payoff: (
    <>
      Four values you already knew, two products, one subtraction, and{" "}
      <InlineMath latex="75^{\circ}" /> now has an exact cosine even though it is on no
      special-angle list. The sign was the only decision in it: a plus between the angles is
      a minus between the products, and reading that off the formula rather than off the
      angles is what keeps <InlineMath latex="\dfrac{\sqrt{6} - \sqrt{2}}{4}" /> from coming
      out as <InlineMath latex="\dfrac{\sqrt{6} + \sqrt{2}}{4}" />.
    </>
  ),
};

/**
 * The sine board: $\sin(30^{\circ} + 60^{\circ})$, which lands on a value the learner already
 * knows from the quadrantal readings.
 *
 * That is the point of choosing it. The table is not telling them what $\sin 90^{\circ}$ is; it
 * is asking the formula for a number they can already check, which is evidence about the FORMULA
 * rather than about the angle.
 */
const SINE_BOARD: Board = {
  heading: "\\sin(30^{\\circ} + 60^{\\circ})",
  headingSpoken: "the sine of 30 degrees plus 60 degrees",
  rows: [
    {
      id: "sc",
      fixed: ["\\sin 30^{\\circ}\\cos 60^{\\circ}"],
      value: "\\dfrac{1}{4}",
      blank: false,
      spoken: "sine 30 degrees times cosine 60 degrees",
    },
    {
      id: "cs",
      fixed: ["\\cos 30^{\\circ}\\sin 60^{\\circ}"],
      value: "\\dfrac{3}{4}",
      blank: true,
      spoken: "cosine 30 degrees times sine 60 degrees",
      why: (
        <>
          <InlineMath latex="\cos 30^{\circ} = \dfrac{\sqrt{3}}{2}" /> and{" "}
          <InlineMath latex="\sin 60^{\circ} = \dfrac{\sqrt{3}}{2}" />, so this product is{" "}
          <InlineMath latex="\dfrac{\sqrt{3}}{2} \cdot \dfrac{\sqrt{3}}{2} = \dfrac{3}{4}" />
          : a root times itself leaves the number under it. The radical does not survive
          here, which is why the row above it was the one given.
        </>
      ),
    },
    {
      id: "combined",
      fixed: [
        "\\sin(30^{\\circ} + 60^{\\circ}) = \\sin 30^{\\circ}\\cos 60^{\\circ} + \\cos 30^{\\circ}\\sin 60^{\\circ}",
      ],
      value: "1",
      blank: true,
      spoken: "sine of 30 degrees plus 60 degrees",
      why: (
        <>
          The sine formula ADDS its two products, so this is{" "}
          <InlineMath latex="\dfrac{1}{4} + \dfrac{3}{4} = 1" />. That is a value you can
          check without the formula, because <InlineMath latex="30^{\circ} + 60^{\circ}" />{" "}
          is a quarter turn and <InlineMath latex="\sin 90^{\circ} = 1" />.
        </>
      ),
    },
  ],
  options: [
    chip("three-quarters", "\\dfrac{3}{4}", "three quarters"),
    chip("root3-4", "\\dfrac{\\sqrt{3}}{4}", "root 3 over 4"),
    chip("root3-2", "\\dfrac{\\sqrt{3}}{2}", "root 3 over 2"),
    chip("one", "1", "one"),
    chip("half", "\\dfrac{1}{2}", "one half"),
    chip("root2-2", "\\dfrac{\\sqrt{2}}{2}", "root 2 over 2"),
  ],
  payoff: (
    <>
      The formula was asked for a reading you already had, and it produced it:{" "}
      <InlineMath latex="\sin 90^{\circ} = 1" />. That is worth more than a new value,
      because it is the formula being checked rather than trusted. Notice also that adding
      the two readings would have given{" "}
      <InlineMath latex="\dfrac{1}{2} + \dfrac{\sqrt{3}}{2} \approx 1.366" />, which is not
      a reading any angle has.
    </>
  ),
};

const BOARDS: readonly Board[] = [COSINE_BOARD, SINE_BOARD];

export function TrigSumTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["what the formula asks for", "its exact value"]}
      rows={board.rows}
      options={board.options}
      objective={
        <>
          Goal: finish the table until <InlineMath latex={board.heading} /> has an exact
          value, built out of nothing but the special-angle readings and one sign.
        </>
      }
      prompt="Each row multiplies two values you already know. The last row puts them together with the sign the formula gives."
      conclusion={board.payoff}
      ariaLabel={`The two products the formula for ${board.headingSpoken} asks for, and the exact value they combine into`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different combined angle"
    />
  );
}
