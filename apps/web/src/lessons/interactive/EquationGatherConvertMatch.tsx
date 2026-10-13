import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { type MatchPair, MatchPairs } from "./kinds/MatchPairs";

/**
 * EL.6 slide 2: what a side full of logarithms gathers into, before anything is converted.
 *
 * A correspondence rather than a procedure, which is what `MatchPairs` is for: each left
 * side holds more than one logarithm, and exactly one single logarithm on the right is the
 * same statement. Conversion to exponential form is not on the board at all, because it is
 * not available yet, and that is the point being taught.
 *
 * Every equation on a board shares its base, its second number and its right-hand side, so
 * nothing can be matched by reading the base off or by counting digits. The only difference
 * between the four is WHICH rule gathers them, and the four results sit next to each other
 * as each other's distractors: a sum gives the product $5x$, a difference the quotient
 * $\tfrac{x}{5}$, a coefficient the power $x^{2}$, and the two rules together $5x^{2}$. A
 * learner who reads the coefficient as a factor finds $5x$ waiting for them.
 */

interface Board {
  pairs: readonly MatchPair[];
  /** A derangement: no right item is dealt against the left item it belongs to. */
  rightOrder: readonly number[];
}

const BOARDS: readonly Board[] = [
  {
    pairs: [
      {
        id: "b0-p0",
        left: "\\log_{3} x + \\log_{3} 5 = 2",
        right: "\\log_{3} (5x) = 2",
        leftSpoken: "log base 3 of x plus log base 3 of 5 equals 2",
        rightSpoken: "log base 3 of 5 x equals 2",
        why: (
          <>
            Adding two logarithms of one base is the logarithm of what you get by
            MULTIPLYING the two insides, so <InlineMath latex="\log_{3} x + \log_{3} 5" />{" "}
            is <InlineMath latex="\log_{3} (5x)" />. It is never the logarithm of a sum:{" "}
            <InlineMath latex="\log_{3} (x + 5)" /> is a different number.
          </>
        ),
      },
      {
        id: "b0-p1",
        left: "\\log_{3} x - \\log_{3} 5 = 2",
        right: "\\log_{3} \\tfrac{x}{5} = 2",
        leftSpoken: "log base 3 of x minus log base 3 of 5 equals 2",
        rightSpoken: "log base 3 of x over 5 equals 2",
        why: (
          <>
            Subtracting divides, in the order the equation is written: what is taken away
            goes underneath. So <InlineMath latex="\log_{3} x - \log_{3} 5" /> gathers to{" "}
            <InlineMath latex="\log_{3} \tfrac{x}{5}" />, and turning it over to{" "}
            <InlineMath latex="\log_{3} \tfrac{5}{x}" /> would be the other subtraction.
          </>
        ),
      },
      {
        id: "b0-p2",
        left: "2\\log_{3} x = 2",
        right: "\\log_{3} x^{2} = 2",
        leftSpoken: "2 times log base 3 of x equals 2",
        rightSpoken: "log base 3 of x squared equals 2",
        why: (
          <>
            A multiplier standing in front of a logarithm goes INSIDE as an exponent, so{" "}
            <InlineMath latex="2\log_{3} x" /> is <InlineMath latex="\log_{3} x^{2}" />. The{" "}
            <InlineMath latex="2" /> never multiplies the <InlineMath latex="x" />, which is
            what <InlineMath latex="\log_{3} (2x)" /> would say.
          </>
        ),
      },
      {
        id: "b0-p3",
        left: "2\\log_{3} x + \\log_{3} 5 = 2",
        right: "\\log_{3} (5x^{2}) = 2",
        leftSpoken: "2 times log base 3 of x plus log base 3 of 5 equals 2",
        rightSpoken: "log base 3 of 5 x squared equals 2",
        why: (
          <>
            Two rules, in that order. The coefficient goes inside first,{" "}
            <InlineMath latex="2\log_{3} x = \log_{3} x^{2}" />, and only then does the sum
            multiply the insides: <InlineMath latex="\log_{3} (5x^{2})" />. The{" "}
            <InlineMath latex="5" /> arrived by multiplying and is not raised to anything,
            so it is not <InlineMath latex="\log_{3} \left((5x)^{2}\right)" />.
          </>
        ),
      },
    ],
    rightOrder: [2, 3, 1, 0],
  },
  {
    pairs: [
      {
        id: "b1-p0",
        left: "\\log_{5} x + \\log_{5} 6 = 3",
        right: "\\log_{5} (6x) = 3",
        leftSpoken: "log base 5 of x plus log base 5 of 6 equals 3",
        rightSpoken: "log base 5 of 6 x equals 3",
        why: (
          <>
            A sum of logarithms is the logarithm of a PRODUCT, so{" "}
            <InlineMath latex="\log_{5} x + \log_{5} 6" /> gathers to{" "}
            <InlineMath latex="\log_{5} (6x)" />. Only now is there one logarithm, and only
            now is there anything to convert to exponential form.
          </>
        ),
      },
      {
        id: "b1-p1",
        left: "\\log_{5} x - \\log_{5} 6 = 3",
        right: "\\log_{5} \\tfrac{x}{6} = 3",
        leftSpoken: "log base 5 of x minus log base 5 of 6 equals 3",
        rightSpoken: "log base 5 of x over 6 equals 3",
        why: (
          <>
            A difference of logarithms is the logarithm of a QUOTIENT, with the subtracted
            one on the bottom, so <InlineMath latex="\log_{5} x - \log_{5} 6" /> gathers to{" "}
            <InlineMath latex="\log_{5} \tfrac{x}{6}" />.
          </>
        ),
      },
      {
        id: "b1-p2",
        left: "3\\log_{5} x = 3",
        right: "\\log_{5} x^{3} = 3",
        leftSpoken: "3 times log base 5 of x equals 3",
        rightSpoken: "log base 5 of x cubed equals 3",
        why: (
          <>
            The coefficient in front of a logarithm is an exponent inside it, so{" "}
            <InlineMath latex="3\log_{5} x" /> is <InlineMath latex="\log_{5} x^{3}" />.
            There is only one logarithm here already, so the power rule is the whole of the
            gathering.
          </>
        ),
      },
      {
        id: "b1-p3",
        left: "3\\log_{5} x + \\log_{5} 6 = 3",
        right: "\\log_{5} (6x^{3}) = 3",
        leftSpoken: "3 times log base 5 of x plus log base 5 of 6 equals 3",
        rightSpoken: "log base 5 of 6 x cubed equals 3",
        why: (
          <>
            The coefficient goes inside as an exponent,{" "}
            <InlineMath latex="3\log_{5} x = \log_{5} x^{3}" />, and then the sum multiplies
            the insides: <InlineMath latex="\log_{5} (6x^{3})" />. The{" "}
            <InlineMath latex="6" /> is a factor and carries no exponent of its own.
          </>
        ),
      },
    ],
    rightOrder: [1, 2, 3, 0],
  },
];

export function EquationGatherConvertMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={board.pairs}
      rightOrder={board.rightOrder}
      objective="Join each equation on the left to the single logarithm its left side gathers into. The board is done when all four are joined."
      prompt="Every equation here holds more than one logarithm, so there is nothing to convert yet. Gathering comes first, and which rule gathers it is what separates these four."
      conclusion={
        <>
          Every pair joined. Gather first, then convert: a sum of logarithms is the
          logarithm of a product, a difference is the logarithm of a quotient, and a
          coefficient in front is an exponent inside. Exponential form is only reachable
          once one logarithm is left.
        </>
      }
      ariaLabel="Equations holding more than one logarithm on the left, the single logarithm each one gathers into on the right, to be joined in pairs"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over on a different set of equations"
    />
  );
}
