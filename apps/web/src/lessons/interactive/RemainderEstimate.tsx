/**
 * POL.8 slide 4: commit to a remainder before the division is run.
 *
 * The remainder theorem is cheap to state and easy to nod at, and a learner who nods at it goes
 * on doing the division anyway. Committing first is what makes the point land: a marker parked
 * on a scale is a stake in the ground, and the substitution that follows either lands on it or
 * does not, which is a different experience from being shown that the two agree.
 *
 * The scale carries a landmark at zero, because a remainder of zero is the case with a
 * consequence attached, and reading "the marker is exactly on the landmark" is how the factor
 * test is supposed to feel.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { EstimateThenCheck } from "./kinds/EstimateThenCheck";

interface Round {
  /** The dividend is $x^{2} + bx + c$ and the divisor is $x - r$. */
  b: number;
  c: number;
  r: number;
}

interface Board {
  rounds: readonly [Round, Round];
}

/** One round with a remainder of zero and one without, so the factor test is live on both boards. */
const BOARDS: readonly Board[] = [
  {
    rounds: [
      { b: -1, c: -6, r: 3 },
      { b: 2, c: -1, r: 2 },
    ],
  },
  {
    rounds: [
      { b: -2, c: -8, r: 4 },
      { b: 1, c: 3, r: 1 },
    ],
  },
];

function value({ b, c, r }: Round): number {
  return r * r + b * r + c;
}

function tex({ b, c }: Round): string {
  const sign = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);
  return `x^{2} ${sign(b)}x ${sign(c)}`;
}

export function RemainderEstimate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <EstimateThenCheck
      key={variant.nonce}
      rounds={board.rounds.map((round, index) => ({
        id: `r${index}`,
        quantity: `(${tex(round)}) \\div (x - ${round.r})`,
        spoken: `${tex(round)} divided by x minus ${round.r}`,
        value: value(round),
        tolerance: 0,
        landmark: { at: 0, latex: "0" },
        why: (
          <>
            Substituting <InlineMath latex={`x = ${round.r}`} /> into{" "}
            <InlineMath latex={tex(round)} /> gives{" "}
            <InlineMath
              latex={`${round.r}^{2} ${round.b < 0 ? "-" : "+"} ${Math.abs(round.b)}(${round.r}) ${round.c < 0 ? "-" : "+"} ${Math.abs(round.c)} = ${value(round)}`}
            />
            , and that is the remainder.{" "}
            {value(round) === 0 ? (
              <>
                A remainder of zero says <InlineMath latex={`x - ${round.r}`} /> divides the
                dividend exactly, so it is a factor of it.
              </>
            ) : (
              <>
                The remainder is not zero, so <InlineMath latex={`x - ${round.r}`} /> is not
                a factor, and the division would leave{" "}
                <InlineMath latex={`${value(round)}`} /> over.
              </>
            )}
          </>
        ),
      }))}
      min={-12}
      max={12}
      step={1}
      ticks={[-12, -8, -4, 0, 4, 8, 12]}
      objective={
        <>
          Goal: commit to the remainder each of these divisions will leave, using one
          substitution rather than the division itself.
        </>
      }
      prompt="Park the marker on the remainder you expect, then check it."
      conclusion={
        <>
          The remainder on dividing by <InlineMath latex="x - r" /> is the value of the
          dividend at <InlineMath latex="x = r" />, because the division statement makes the
          divisor's product vanish there and leaves the remainder standing alone. Landing on
          zero is the factor test, and it costs one substitution rather than a whole
          division.
        </>
      }
      ariaLabel="A scale from minus twelve to twelve, for committing to the remainder of a division"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with two different divisions"
    />
  );
}
