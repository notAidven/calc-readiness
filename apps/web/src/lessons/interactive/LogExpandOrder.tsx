/**
 * EL.5 interactive (slide 1): expanding a quotient that holds a power, in the order the
 * rules will actually allow.
 *
 * Sequencing is the whole content here, which is why this is an ordering board and not a
 * typing box. The power rule is a true statement about $\log(x^{n})$ from the moment the
 * board opens, and it is still useless until the quotient has been split, because until then
 * there is no $\log(x^{n})$ anywhere in the expression to apply it to. A learner who reaches
 * for it first is refused and told exactly that, which is a thing to notice rather than a
 * thing to be told.
 *
 * The two boards put the exponent on opposite sides of the fraction bar, so the second one
 * cannot be finished by copying the shape of the first: with the power in the denominator the
 * coefficient lands on the SUBTRACTED logarithm, and the sign is what a learner running on
 * pattern recognition loses.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type OrderedStep, OrderSteps } from "./kinds/OrderSteps";

interface Board {
  /** The expression being expanded, as LaTeX, for the goal line and the closing sentence. */
  source: string;
  /** What it comes to, named only once the chain is finished. */
  result: string;
  steps: readonly OrderedStep[];
  /** The order the chips are dealt in: indices into `steps`, never the identity. */
  dealt: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    source: "\\log \\dfrac{x^{3}}{y}",
    result: "3 \\log x - \\log y",
    steps: [
      {
        id: "b0-read",
        text: "The division is the outermost operation inside the logarithm.",
        spoken: "the division is the outermost operation inside the logarithm",
        why: (
          <>
            Nothing can be split until it is settled WHAT is being split. The argument{" "}
            <InlineMath latex="\dfrac{x^{3}}{y}" /> is a quotient whose numerator happens to
            be a power, so the division is the operation on the outside and the exponent is
            buried one level in.
          </>
        ),
      },
      {
        id: "b0-quotient",
        latex: "\\log \\dfrac{x^{3}}{y} = \\log(x^{3}) - \\log y",
        spoken: "log of x cubed over y equals log of x cubed minus log y",
        why: (
          <>
            The quotient rule acts on the outermost operation, so it goes first: a division
            inside the logarithm becomes a subtraction of two logarithms. Doing this first
            is also what CREATES the piece <InlineMath latex="\log(x^{3})" />, which did not
            exist as a separate term before.
          </>
        ),
      },
      {
        id: "b0-power",
        latex: "\\log(x^{3}) = 3 \\log x",
        spoken: "log of x cubed equals 3 log x",
        why: (
          <>
            Now that <InlineMath latex="\log(x^{3})" /> is a term of its own, the power rule
            has something to act on: three factors of <InlineMath latex="x" /> multiplied
            together give three copies of <InlineMath latex="\log x" /> added together, so
            the exponent comes out in front as a multiplier.
          </>
        ),
      },
      {
        id: "b0-finish",
        latex: "\\log \\dfrac{x^{3}}{y} = 3 \\log x - \\log y",
        spoken: "log of x cubed over y equals 3 log x minus log y",
        why: (
          <>
            Putting the rewritten piece back into the subtraction finishes the expansion.
            Every logarithm left holds a single variable and no exponent, which is what
            expanding COMPLETELY asks for.
          </>
        ),
      },
    ],
    dealt: [2, 0, 3, 1],
  },
  {
    source: "\\log \\dfrac{p}{q^{4}}",
    result: "\\log p - 4 \\log q",
    steps: [
      {
        id: "b1-read",
        text: "The division is the outermost operation inside the logarithm.",
        spoken: "the division is the outermost operation inside the logarithm",
        why: (
          <>
            The exponent sits on <InlineMath latex="q" /> alone and not on the fraction, so
            the division is still the operation on the outside. Where the power happens to
            live does not change which rule is allowed to go first.
          </>
        ),
      },
      {
        id: "b1-quotient",
        latex: "\\log \\dfrac{p}{q^{4}} = \\log p - \\log(q^{4})",
        spoken: "log of p over q to the fourth equals log p minus log of q to the fourth",
        why: (
          <>
            The quotient rule turns the division into a subtraction, and the denominator is
            the part being subtracted. The whole of <InlineMath latex="\log(q^{4})" /> is
            what comes off, exponent included.
          </>
        ),
      },
      {
        id: "b1-power",
        latex: "\\log(q^{4}) = 4 \\log q",
        spoken: "log of q to the fourth equals 4 log q",
        why: (
          <>
            Four factors of <InlineMath latex="q" /> multiplied together are four copies of{" "}
            <InlineMath latex="\log q" /> added together, so the exponent comes down in
            front. This is a statement about <InlineMath latex="\log(q^{4})" /> by itself,
            which is why it had to wait until that term existed.
          </>
        ),
      },
      {
        id: "b1-finish",
        latex: "\\log \\dfrac{p}{q^{4}} = \\log p - 4 \\log q",
        spoken: "log of p over q to the fourth equals log p minus 4 log q",
        why: (
          <>
            The <InlineMath latex="4" /> belongs to the term being SUBTRACTED, so it stays
            behind the minus sign and multiplies <InlineMath latex="\log q" /> only. Reading
            it as <InlineMath latex="4(\log p - \log q)" /> would spread the exponent over a
            variable that never had one.
          </>
        ),
      },
    ],
    dealt: [3, 1, 2, 0],
  },
];

export function LogExpandOrder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <OrderSteps
      key={variant.nonce}
      steps={board.steps}
      dealt={board.dealt}
      objective={
        <>
          Goal: assemble the argument that takes <InlineMath latex={board.source} /> apart
          one rule at a time, settling which of the quotient rule and the power rule is
          allowed to go first and why the other one has to wait.
        </>
      }
      prompt="Place whichever line the argument is ready for next."
      conclusion={
        <>
          <InlineMath latex={`${board.source} = ${board.result}`} />. The quotient rule went
          first because the division was on the outside, and the power rule could only act
          once the split had produced a term with the exponent in it.
        </>
      }
      ariaLabel="The steps of expanding a logarithm of a quotient containing a power, shuffled, to be placed in order"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different quotient"
    />
  );
}
