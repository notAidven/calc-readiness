/**
 * POL.4 slide 3: read the three coefficients off an equation, signs included.
 *
 * The formula itself is not what goes wrong; the substitution is, and it goes wrong on signs.
 * A learner reads $2x^{2} - 7x + 3 = 0$ and takes $b$ to be $7$, because that is the number
 * printed on the page. So the figure names the parts of the EQUATION rather than the parts of
 * the formula, and every board carries at least one negative coefficient, which is the only
 * case the error can appear in.
 *
 * Each label slot holds a real name rather than a description of one (R21): "the coefficient
 * $b$", not "the number in the middle".
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { LabelParts, labelPartsDeal } from "./kinds/LabelParts";

interface Board {
  a: number;
  b: number;
  c: number;
}

/** Both boards carry a negative coefficient, which is where the reading goes wrong. */
const BOARDS: readonly Board[] = [
  { a: 3, b: -8, c: 2 },
  { a: 2, b: 5, c: -6 },
];

function signed(value: number): string {
  return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
}

export function FormulaPartsLabel(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const { a, b, c } = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const discriminant = b * b - 4 * a * c;

  return (
    <LabelParts
      key={variant.nonce}
      dealt={labelPartsDeal(4, variant.index)}
      parts={[
        {
          id: "a",
          latex: `${a}`,
          name: "the coefficient a",
          spoken: `the ${a} in front of x squared`,
          why: (
            <>
              <InlineMath latex="a" /> is whatever multiplies <InlineMath latex="x^{2}" />,
              and here that is <InlineMath latex={`${a}`} />. It appears twice in the
              formula, under the bar and inside the root, so reading it wrong moves the
              answer twice over.
            </>
          ),
        },
        {
          id: "b",
          latex: b < 0 ? `-${Math.abs(b)}` : `${b}`,
          before: b < 0 ? "" : "+",
          name: "the coefficient b",
          spoken: `the ${b} in front of x`,
          why: (
            <>
              <InlineMath latex="b" /> carries its sign with it, so here it is{" "}
              <InlineMath latex={`${b}`} /> rather than{" "}
              <InlineMath latex={`${Math.abs(b)}`} />. The formula opens with{" "}
              <InlineMath latex="-b" />, which is <InlineMath latex={`${-b}`} /> on this
              equation, and that is exactly the step a dropped sign spoils.
            </>
          ),
        },
        {
          id: "c",
          latex: c < 0 ? `-${Math.abs(c)}` : `${c}`,
          before: c < 0 ? "" : "+",
          name: "the coefficient c",
          spoken: `the constant ${c}`,
          why: (
            <>
              <InlineMath latex="c" /> is the constant term with its own sign, so here it is{" "}
              <InlineMath latex={`${c}`} />. It reaches the formula only through{" "}
              <InlineMath latex="-4ac" />, where a negative <InlineMath latex="c" /> makes
              that term positive.
            </>
          ),
        },
        {
          id: "zero",
          latex: "0",
          before: "=",
          name: "the gathered side",
          spoken: "the zero on the right",
          why: (
            <>
              The three coefficients can only be read once everything is on one side,
              because a term still sitting on the right belongs in <InlineMath latex="c" />{" "}
              with its sign turned over. Checking for this zero is the first move, not the
              last.
            </>
          ),
        },
      ]}
      lead=""
      objective={
        <>
          Goal: name the three quantities the quadratic formula substitutes, and the
          condition that has to hold before any of them can be read.
        </>
      }
      prompt="Drag each name into the box under the part it belongs to, or tap a name and then its box."
      conclusion={
        <>
          On <InlineMath latex={`${a}x^{2} ${signed(b)}x ${signed(c)} = 0`} /> the
          substitution is <InlineMath latex={`a = ${a}`} />,{" "}
          <InlineMath latex={`b = ${b}`} /> and <InlineMath latex={`c = ${c}`} />, so{" "}
          <InlineMath latex={`b^{2} - 4ac = ${discriminant}`} />. Every sign travels with
          its coefficient, which is the whole of what this figure is for.
        </>
      }
      ariaLabel={`The equation ${a} x squared ${b < 0 ? "minus" : "plus"} ${Math.abs(b)} x ${c < 0 ? "minus" : "plus"} ${Math.abs(c)} equals zero, with its parts to be named`}
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different equation"
    />
  );
}
