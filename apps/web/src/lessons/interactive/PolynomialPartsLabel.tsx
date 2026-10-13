/**
 * POL.1 slide 0: name the pieces a written amount is built from.
 *
 * The vocabulary the whole era leans on arrives on this slide -- term, coefficient, constant
 * term, degree -- and a list of four definitions is the one shape a learner reads past. Naming
 * is a correspondence, so the interaction is labelling: each name has to land on the piece of
 * the expression it belongs to, and the piece that is hardest to place is the constant term,
 * which looks like every other plain number until it is asked for by name.
 *
 * Every label slot holds a real term rather than a description of one (R21): "coefficient",
 * not "the number in front".
 *
 * Starting over deals a different amount, so a second pass is worked rather than recalled.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Variant {
  /** The leading coefficient, the middle coefficient and the constant. */
  a: number;
  b: number;
  c: number;
}

/** Neither amount is the slide's own $x^{2} + 5x$ nor the check's court. */
const VARIANTS: readonly Variant[] = [
  { a: 3, b: 5, c: 8 },
  { a: 4, b: 9, c: 6 },
];

export function PolynomialPartsLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(VARIANTS.length, props);
  const { a, b, c } = VARIANTS[variant.index] ?? (VARIANTS[0] as Variant);
  const whole = `${a}x^{2} + ${b}x + ${c}`;

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(4, variant.index)}
      parts={[
        {
          id: "coefficient",
          latex: `${a}`,
          name: "coefficient",
          spoken: `the ${a} in front of x squared`,
          why: (
            <>
              A coefficient is the number multiplying a term's variable part, and this{" "}
              <InlineMath latex={`${a}`} /> multiplies <InlineMath latex="x^{2}" />. It says
              how many of that piece the amount carries, so the order holds {a} square
              courts rather than one.
            </>
          ),
        },
        {
          id: "exponent",
          latex: "2",
          name: "exponent",
          raised: true,
          spoken: "the raised 2",
          why: (
            <>
              The exponent counts how many copies of the variable are multiplied together,
              so <InlineMath latex="x^{2}" /> is <InlineMath latex="x \cdot x" />. It is
              also what keeps this term apart from the <InlineMath latex={`${b}x`} /> beside
              it, since the two are not like terms.
            </>
          ),
        },
        {
          id: "term",
          latex: `${b}x`,
          before: "+",
          name: "term",
          spoken: `the ${b} x`,
          why: (
            <>
              A term is one of the separate pieces the amount is added out of, and{" "}
              <InlineMath latex={`${b}x`} /> is the whole of the second piece. The
              coefficient and the variable travel together: splitting them would leave two
              things neither of which is a term.
            </>
          ),
        },
        {
          id: "constant",
          latex: `${c}`,
          before: "+",
          name: "constant term",
          spoken: `the ${c} at the end`,
          why: (
            <>
              A constant term carries no variable at all, so its value never moves when{" "}
              <InlineMath latex="x" /> does. That is exactly why it can never combine with{" "}
              <InlineMath latex={`${b}x`} />: one of them changes with the side length and
              the other does not.
            </>
          ),
        },
      ]}
      lead=""
      objective={
        <>
          Goal: put a name to each of the four things <InlineMath latex={whole} /> is built
          from, so that the rest of the era can ask for them by name.
        </>
      }
      prompt="Drag each name into the box under the part it belongs to, or tap a name and then tap its box."
      conclusion={
        <>
          <InlineMath latex={whole} /> is a <strong>polynomial</strong> of three terms, and
          its highest exponent is 2. Two terms combine only when their variable part is
          identical, so nothing here combines with anything else and the amount is already
          as short as it goes.
        </>
      }
      ariaLabel={`The polynomial ${a} x squared plus ${b} x plus ${c}, with its parts to be named`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different amount"
    />
  );
}
