/**
 * POL.8 slide 3: match each number in a synthetic row to the line of the long division it is.
 *
 * Synthetic division is presented as a separate method and remembered as a ritual, which is
 * exactly why the sign of $r$ is the thing everybody gets wrong: a ritual has no reason inside
 * it to consult. The claim of the slide is that nothing new is happening, so the interaction is
 * a correspondence between the two layouts, and checking a join means finding the same number
 * in the long division.
 *
 * Every distractor is a real number from one layout or the other, so a wrong join is somebody
 * else's correct answer and guessing one costs two.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { MatchPairs } from "./kinds/MatchPairs";

interface Board {
  /** Dividend $= (x - r)(x^{2} + m x + n)$, divided by $x - r$. */
  r: number;
  m: number;
  n: number;
  rightOrder: readonly number[];
}

/** Neither board is the slide's own $x^{3} - 4x^{2} + 5x - 2$ divided by $x - 2$. */
const BOARDS: readonly Board[] = [
  { r: 3, m: 2, n: -1, rightOrder: [2, 0, 3, 1] },
  { r: 2, m: -5, n: 4, rightOrder: [1, 3, 0, 2] },
];

export function SyntheticLongMatch(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  const { r, m, n } = board;
  /** Dividend coefficients, expanded. */
  const c2 = m - r;
  const c1 = n - r * m;
  const c0 = -r * n;
  const sign = (v: number) => (v < 0 ? `- ${Math.abs(v)}` : `+ ${v}`);
  const dividend = `x^{3} ${sign(c2)}x^{2} ${sign(c1)}x ${sign(c0)}`;

  return (
    <MatchPairs
      key={variant.nonce}
      pairs={[
        {
          id: "r",
          left: `${r}`,
          right: `\\text{the } r \\text{ in } x - ${r}`,
          leftSpoken: `the ${r} at the left of the synthetic row`,
          rightSpoken: `the r in the divisor x minus ${r}`,
          why: (
            <>
              The number outside a synthetic row is the value that makes the divisor zero,
              so a divisor of <InlineMath latex={`x - ${r}`} /> puts{" "}
              <InlineMath latex={`${r}`} /> there. It carries the sign the divisor gives it,
              which is why <InlineMath latex={`x + ${Math.abs(r)}`} /> would put{" "}
              <InlineMath latex={`${-Math.abs(r)}`} /> outside instead.
            </>
          ),
        },
        {
          id: "carry",
          left: `${r * 1}`,
          rightProse: (
            <>
              the <InlineMath latex="1x^{2}" /> line's product
            </>
          ),
          leftSpoken: `the ${r} in the second column`,
          rightSpoken: "the product the first long-division step subtracts",
          why: (
            <>
              Bringing the leading <InlineMath latex="1" /> down and multiplying by{" "}
              <InlineMath latex={`${r}`} /> gives <InlineMath latex={`${r}`} />, and the
              long division's first step multiplies the divisor by{" "}
              <InlineMath latex="x^{2}" /> and subtracts{" "}
              <InlineMath latex={`x^{3} - ${r}x^{2}`} />. The same{" "}
              <InlineMath latex={`${r}`} /> appears in both, with the subtraction turned
              into an addition.
            </>
          ),
        },
        {
          id: "quotient",
          left: `1,\\; ${m},\\; ${n}`,
          right: `x^{2} ${sign(m)}x ${sign(n)}`,
          leftSpoken: "the first three results along the bottom row",
          rightSpoken: "the quotient",
          why: (
            <>
              The bottom row of a synthetic division is the quotient's coefficients in
              descending order, so <InlineMath latex={`1, ${m}, ${n}`} /> is{" "}
              <InlineMath latex={`x^{2} ${sign(m)}x ${sign(n)}`} />. The degree drops by one
              because the divisor has degree one, which is a fact about the division rather
              than about the layout.
            </>
          ),
        },
        {
          id: "remainder",
          left: "0",
          right: "\\text{the remainder}",
          leftSpoken: "the last number on the bottom row",
          rightSpoken: "the remainder",
          why: (
            <>
              The last entry on the bottom row is what the division could not reach, so it
              is the remainder rather than part of the quotient. Here it is{" "}
              <InlineMath latex="0" />, which says <InlineMath latex={`x - ${r}`} /> divides
              the dividend exactly.
            </>
          ),
        },
      ]}
      rightOrder={board.rightOrder}
      objective={
        <>
          Goal: find each number of the synthetic row in the long division it came from, so
          that the short layout stops being a separate method.
        </>
      }
      prompt="Drag a number onto what it is, or tap the number and then what it is."
      conclusion={
        <>
          Dividing <InlineMath latex={dividend} /> by <InlineMath latex={`x - ${r}`} />{" "}
          gives <InlineMath latex={`x^{2} ${sign(m)}x ${sign(n)}`} /> either way, and every
          number in the short layout is a number the long one produced. The value outside
          the row is the one that makes the divisor zero, which is where its sign comes
          from.
        </>
      }
      ariaLabel="Four entries of a synthetic division to be matched with what they are in the long division"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different division"
    />
  );
}
