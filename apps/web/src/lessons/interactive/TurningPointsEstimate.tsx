/**
 * POL.7 slide 2: commit to how many times the graph can turn, before the bound is stated.
 *
 * The misconception here is one of magnitude, which is what this interaction is for. A learner
 * meeting a polynomial written as a product of brackets counts the BRACKETS, and on a factored
 * form that count is smaller than the degree every time an exponent is above one, so the
 * estimate lands low and lands low consistently. Committing a number first is what makes that
 * visible: the marker has to be put somewhere before the degree is worked out, and a learner
 * who has counted brackets sees their own answer sitting well short of the mark.
 *
 * Every round is a factored form whose exponents sum to more than the number of brackets, so no
 * round can be answered by counting them. The landmark on the scale is the number of brackets on
 * that round, which is the wrong answer made visible rather than hidden.
 *
 * No two rounds anywhere here bound at the same number, and that is a constraint rather than an
 * accident of the draw. Board zero's second round used to be degree five like its first, so the
 * marker was already sitting on the answer when the round opened and a learner cleared it without
 * adding anything up — on a kind whose whole claim is that the learner commits a number they
 * derived. `estimateRoundsDiffer.test.ts` holds it across every adopter of the kind: it settles
 * each round by bisection and then offers that mark to every later round, which has to refuse it.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { EstimateThenCheck } from "./kinds/EstimateThenCheck";

interface Round {
  id: string;
  /** The polynomial in factored form. */
  latex: string;
  spoken: string;
  /** The exponents on its factors, in the order written. */
  exponents: readonly number[];
}

interface Board {
  rounds: readonly Round[];
}

const BOARDS: readonly Board[] = [
  {
    rounds: [
      {
        id: "b0-r1",
        latex: "(x - 1)^{2}(x + 4)^{3}",
        spoken: "x minus 1 squared, times x plus 4 cubed",
        exponents: [2, 3],
      },
      {
        id: "b0-r2",
        latex: "2(x + 2)^{6}(x - 5)",
        spoken: "2 times x plus 2 to the sixth, times x minus 5",
        exponents: [6, 1],
      },
    ],
  },
  {
    rounds: [
      {
        id: "b1-r1",
        latex: "-(x - 3)^{3}(x + 1)^{3}",
        spoken: "minus, x minus 3 cubed, times x plus 1 cubed",
        exponents: [3, 3],
      },
      {
        id: "b1-r2",
        latex: "4(x + 5)^{2}(x - 2)^{2}",
        spoken: "4 times x plus 5 squared, times x minus 2 squared",
        exponents: [2, 2],
      },
    ],
  },
];

export function TurningPointsEstimate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <EstimateThenCheck
      key={variant.nonce}
      rounds={board.rounds.map((round) => {
        const degree = round.exponents.reduce((total, e) => total + e, 0);
        const brackets = round.exponents.length;
        const sum = round.exponents.join(" + ");
        return {
          id: round.id,
          quantity: `\\text{turning points of }${round.latex}\\text{, at most}`,
          spoken: `the greatest number of turning points of ${round.spoken}`,
          value: degree - 1,
          // A whole count, so the marker has to land on it exactly. There is nothing to be
          // approximately right about: the bound is an integer the degree fixes.
          tolerance: 0,
          landmark: { at: brackets, latex: `${brackets}\\text{ brackets}` },
          why: (
            <>
              The degree is not the number of brackets, it is the sum of their exponents:{" "}
              <InlineMath latex={`${sum} = ${degree}`} />. A polynomial graph changes
              direction at most one time fewer than its degree, so the bound here is{" "}
              <InlineMath latex={`${degree} - 1 = ${degree - 1}`} />. Counting the{" "}
              <InlineMath latex={`${brackets}`} /> brackets instead is the marker left on
              the scale, and it is short by{" "}
              <InlineMath latex={`${degree - 1 - brackets}`} /> because an exponent above
              one contributes its whole size to the degree.
            </>
          ),
        };
      })}
      min={0}
      max={12}
      step={1}
      ticks={[0, 3, 6, 9, 12]}
      objective={
        <>
          Put the marker on how many times each of these graphs can turn, before working the
          degree out.
        </>
      }
      prompt="Move the marker to your estimate, then check it."
      conclusion={
        <>
          The bound is one fewer than the DEGREE, and on a factored form the degree is the
          sum of the exponents rather than the count of brackets. That gap is the whole
          trap: every exponent above one puts the real degree above what the brackets
          suggest.
        </>
      }
      ariaLabel="A scale for estimating how many turning points each factored polynomial's graph can have"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with different polynomials"
    />
  );
}
