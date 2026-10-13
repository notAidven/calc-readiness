/**
 * TRG.9 slide 0: commit to the reading a combined rotation produces, then check it.
 *
 * The misconception on this slide is about MAGNITUDE, which is what this kind is for. Two
 * rotations compose by ADDING their angles, and a learner who has just been told that reaches
 * for the same move on the readings: $\cos 45^{\circ} + \cos 30^{\circ}$ for the cosine of the
 * combined heading. The number that produces is not close, and on every round here it is larger
 * than $1$, which no cosine or sine ever is. Committing to a spot first is what makes that land,
 * because the distance between the stake and the true mark is the lesson.
 *
 * So the dashed landmark on every round is the value ADDING THE READINGS gives, sitting where a
 * learner's instinct puts it. The board is one long argument that the instinct is wrong rather
 * than a verdict that it is, and nothing here names the formula that gets it right: that is
 * slide 1's, and a board that gave it away would leave the next slide with nothing to teach.
 *
 * Each board pairs a round whose true value comes out LOW with one that comes out HIGH from the
 * same split, so there is no correction to learn either. Adding the readings overshoots on all
 * four rounds, but by anything from a fifth of the scale to most of it, which makes it an
 * operation to abandon rather than a bias to adjust for.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { estimateStatedDecimals, EstimateThenCheck } from "./kinds/EstimateThenCheck";

interface Round {
  /** `true` for the sine of the combined heading, `false` for its cosine. */
  isSine: boolean;
  /** The two headings that compose, in degrees. */
  a: number;
  b: number;
}

interface Board {
  rounds: readonly [Round, Round];
}

/**
 * Two boards, four rounds, and no split shared between the boards. Each board takes one split
 * and asks for both functions of it, so the two rounds share every input and disagree only in
 * which reading is wanted, which is the cleanest way to show that the error is not a constant
 * offset.
 */
const BOARDS: readonly Board[] = [
  {
    rounds: [
      { isSine: false, a: 45, b: 30 },
      { isSine: true, a: 45, b: 30 },
    ],
  },
  {
    rounds: [
      { isSine: false, a: 30, b: 60 },
      { isSine: true, a: 30, b: 60 },
    ],
  },
];

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function reading(isSine: boolean, deg: number): number {
  return isSine ? Math.sin(rad(deg)) : Math.cos(rad(deg));
}

const FN_TEX = { sine: "\\sin", cosine: "\\cos" } as const;

/**
 * The scale, named here because the quantity has to be built against it: the rounding this
 * board asks for is the rounding the board will answer at, and quoting a question to three
 * decimals over an answer stated at two is the two halves of one slide disagreeing. Both
 * readings on the second split are exact ($\cos 90^{\circ}$ and $\sin 90^{\circ}$), so the
 * caption is derived rather than written, and the two cannot come apart.
 */
const STEP = 0.01;

function fnTex(isSine: boolean): string {
  return isSine ? FN_TEX.sine : FN_TEX.cosine;
}

function fnWord(isSine: boolean): string {
  return isSine ? "sine" : "cosine";
}

export function TrigCombineEstimate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <EstimateThenCheck
      key={variant.nonce}
      rounds={board.rounds.map(({ isSine, a, b }) => {
        const combined = a + b;
        const value = reading(isSine, combined);
        // What adding the two readings gives, which is where the dashed landmark sits.
        const added = reading(isSine, a) + reading(isSine, b);
        const fn = fnTex(isSine);
        const word = fnWord(isSine);
        return {
          id: `${word}-${combined}`,
          quantity: `${fn} ${combined}^{\\circ}\\ \\text{to ${estimateStatedDecimals(value, STEP)} dp}`,
          spoken: `the ${word} of ${combined} degrees`,
          value,
          // Wide enough to place by eye on a scale two units across, and far tighter than the
          // gap between the truth and the landmark on every round, which is what the board is
          // measuring. The smallest of those gaps is over four times this.
          tolerance: 0.05,
          landmark: { at: added, latex: added.toFixed(3) },
          why: (
            <>
              Turning <InlineMath latex={`${a}^{\\circ}`} /> and then{" "}
              <InlineMath latex={`${b}^{\\circ}`} /> further does leave the antenna at{" "}
              <InlineMath latex={`${combined}^{\\circ}`} />, so the ANGLES add. The readings
              do not, and the dashed tick is where adding them would land:{" "}
              <InlineMath
                latex={`${fn} ${a}^{\\circ} + ${fn} ${b}^{\\circ} \\approx ${added.toFixed(3)}`}
              />
              , against a true value of{" "}
              <InlineMath
                latex={`${fn} ${combined}^{\\circ} \\approx ${value.toFixed(3)}`}
              />
              .
              {added > 1 ? (
                <>
                  {" "}
                  The tick is past <InlineMath latex="1" /> as well, and no {word} of any
                  angle is ever bigger than that, so the sum was never a candidate.
                </>
              ) : (
                <>
                  {" "}
                  The gap is not a rounding error either: the two are nowhere near each
                  other, and a formula of its own is what closes it.
                </>
              )}
            </>
          ),
        };
      })}
      min={-0.4}
      max={1.6}
      step={STEP}
      ticks={[-0.4, 0, 0.4, 0.8, 1.2, 1.6]}
      objective={
        <>
          Goal: put a stake in the ground for each reading of the combined heading before
          working it out, and read off how far it sits from the dashed tick, which is where
          adding the two separate readings lands.
        </>
      }
      prompt="Park the marker on the reading you expect, then check it. Landing within 0.05 counts."
      conclusion={
        <>
          Two rotations compose by adding their angles, and their readings do not compose at
          all: one of these lands low, one lands high, and the dashed tick misses both.
          Adding the readings is not even close enough to be a rough answer, since it can
          exceed <InlineMath latex="1" /> or point the wrong side of{" "}
          <InlineMath latex="0" /> while every true reading stays between{" "}
          <InlineMath latex="-1" /> and <InlineMath latex="1" />. Combining two rotations
          needs a formula of its own.
        </>
      }
      ariaLabel="A scale of readings from negative 0.4 to 1.6, for committing to the sine or cosine of a combined heading"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different pair of rotations"
    />
  );
}
