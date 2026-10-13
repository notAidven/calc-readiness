/**
 * RAD.2 interactive (slide 2): click through clearing a root out of a denominator, over two
 * rounds. Neither is the fraction worked in the paragraph above (2/sqrt(5)): round 1 is
 * 3/sqrt(7), which does not reduce, and round 2 is 6/sqrt(3), which does, so the final
 * "reduce what is left" move is exercised rather than assumed. Every option button carries
 * the same neutral token, so the correct move is never the coloured one. Each correct move
 * fires the success signal on its own, and a learner who has already picked a wrong option
 * at a step may reveal that one step, with the reasoning behind it, and carry on; a revealed
 * step advances the round but earns no success. Gates once both rounds land.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Round {
  /** The numerator over the root. */
  c: number;
  /** The square-free radicand in the denominator. */
  p: number;
}

/**
 * Two pairs of fractions. In BOTH, round 1 leaves the coefficient alone and round 2's
 * reduces, so the final "reduce what is left" move is always exercised. "Start over" hands
 * out the pair the learner has NOT just worked.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { c: 3, p: 7 },
    { c: 6, p: 3 },
  ],
  [
    { c: 4, p: 5 },
    { c: 10, p: 2 },
  ],
];

export function RationalizeSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <RationalizeSolverBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RationalizeSolverBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [revealedFrom, setRevealedFrom] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const { c, p } = round;
  const reducible = c % p === 0;
  const reduced = c / p;
  const finalStage = reducible ? 3 : 2;
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;
  const solved = stage >= finalStage;

  /** Take the next step. `earned` is false when the learner revealed it instead. */
  function advanceTo(next: number, earned: boolean) {
    setWrong(null);
    setAttempted(false);
    setStage(next);
    if (earned) {
      setRevealedFrom(null);
      success();
    }
    if (next >= finalStage && isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function pickWrong(kind: string) {
    setWrong(kind);
    setAttempted(true);
    // A fresh attempt: the reveal steps aside so it can be offered for this step.
    setRevealedFrom(null);
  }

  function revealStep() {
    setRevealedFrom(stage);
    advanceTo(stage + 1, false);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setStage(0);
      setWrong(null);
      setAttempted(false);
      setRevealedFrom(null);
    }
  }

  /** The step the reveal is speaking about: the one just revealed, else the one in hand. */
  const revealStage = revealedFrom ?? (solved ? null : stage);

  function stageAnswer(at: number): ReactNode {
    if (at === 0) {
      return <InlineMath latex={`\\tfrac{\\sqrt{${p}}}{\\sqrt{${p}}}`} />;
    }
    if (at === 1) {
      return <InlineMath latex={`\\sqrt{${p}} \\cdot \\sqrt{${p}} = ${p}`} />;
    }
    return <InlineMath latex={`${reduced}\\sqrt{${p}}`} />;
  }

  function stageWhy(at: number): ReactNode {
    if (at === 0) {
      return (
        <>
          A radical is not allowed to stay in a denominator, and the move that clears it is
          multiplying the bottom by another copy of itself. Multiplying by{" "}
          <InlineMath latex={`\\tfrac{\\sqrt{${p}}}{\\sqrt{${p}}}`} /> does exactly that,
          and because any number over itself is 1, the fraction changes form without
          changing value.
        </>
      );
    }
    if (at === 1) {
      return (
        <>
          <InlineMath latex={`\\sqrt{${p}}`} /> is the number whose square is {p}, so
          multiplying it by itself gives {p} straight back:{" "}
          <InlineMath
            latex={`\\sqrt{${p}} \\cdot \\sqrt{${p}} = \\sqrt{${p * p}} = ${p}`}
          />
          . The radicands do multiply to {p * p}, but the principal square root of {p * p}{" "}
          is {p}, which is why the denominator comes out whole.
        </>
      );
    }
    return (
      <>
        The radical has left the denominator, but the fraction is not finished, because{" "}
        <InlineMath latex={`\\tfrac{${c}}{${p}}`} /> divides exactly and comes to {reduced}.
        Simplest form means no division is left waiting to be done, so the answer settles at{" "}
        <InlineMath latex={`${reduced}\\sqrt{${p}}`} />.
      </>
    );
  }

  /** Once the round is finished, the reveal panel is the explanation; the status stands down. */
  const revealOwnsExplanation = revealedFrom !== null && solved;

  const neutral = { color: LABEL, borderColor: LINE };
  const ROW_Y = [46, 100, 154, 202];

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <svg
        viewBox="0 0 440 224"
        role="img"
        aria-label={`Rationalize ${c} over the square root of ${p}`}
      >
        <title>Rationalize a denominator step by step</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\dfrac{${c}}{\\sqrt{${p}}}`}
          x={220}
          y={ROW_Y[0] as number}
          fontSize={20}
          color={LABEL}
          h={58}
        />

        {stage >= 1 && (
          <>
            <text x={220} y={74} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath
              latex={`\\dfrac{${c}\\sqrt{${p}}}{\\sqrt{${p}} \\cdot \\sqrt{${p}}}`}
              x={220}
              y={ROW_Y[1] as number}
              fontSize={20}
              color={LABEL}
              h={58}
            />
          </>
        )}

        {stage >= 2 && (
          <>
            <text x={220} y={128} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath
              latex={`\\dfrac{${c}\\sqrt{${p}}}{${p}}`}
              x={220}
              y={ROW_Y[2] as number}
              fontSize={20}
              color={reducible && stage < 3 ? LABEL : CIVIC}
              h={58}
            />
          </>
        )}

        {stage >= 3 && (
          <>
            <text x={220} y={180} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath
              latex={`${reduced}\\sqrt{${p}}`}
              x={220}
              y={ROW_Y[3] as number}
              fontSize={24}
              color={CIVIC}
            />
          </>
        )}
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two new fractions
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: one that reduces at the end
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          {stage === 0 ? (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => advanceTo(1, true)}
              >
                <InlineMath
                  latex={`\\text{Multiply by } \\tfrac{\\sqrt{${p}}}{\\sqrt{${p}}}`}
                />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => pickWrong("byp")}
              >
                <InlineMath latex={`\\text{Multiply by } \\tfrac{${p}}{${p}}`} />
              </button>
            </>
          ) : stage === 1 ? (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => advanceTo(2, true)}
              >
                <InlineMath latex={`\\sqrt{${p}} \\cdot \\sqrt{${p}} = ${p}`} />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => pickWrong("squared")}
              >
                <InlineMath latex={`\\sqrt{${p}} \\cdot \\sqrt{${p}} = ${p * p}`} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => advanceTo(3, true)}
              >
                <InlineMath latex={`\\text{Reduce } \\tfrac{${c}}{${p}} = ${reduced}`} />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => pickWrong("leave")}
              >
                Leave the numbers as they are
              </button>
            </>
          )}
        </div>
      )}

      {revealStage !== null && (
        <WidgetReveal
          available={attempted}
          revealed={revealedFrom !== null}
          answer={stageAnswer(revealStage)}
          why={stageWhy(revealStage)}
          onReveal={revealStep}
          label="Reveal this step"
          // The steps are taken in order, so what is left after the one in hand is every step
          // up to `finalStage`, plus the rounds after this one. False only where the step being
          // explained is the last one of the last round, which is the gate.
          othersRemain={stage + 1 < finalStage || !isLastRound}
        />
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : wrong ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealOwnsExplanation ? null : solved ? (
          <>
            <InlineMath
              latex={
                reducible
                  ? `\\dfrac{${c}}{\\sqrt{${p}}} = \\dfrac{${c}\\sqrt{${p}}}{${p}} = ${reduced}\\sqrt{${p}}`
                  : `\\dfrac{${c}}{\\sqrt{${p}}} = \\dfrac{${c}\\sqrt{${p}}}{${p}}`
              }
            />
            . Multiplying by a radical over itself is the same as multiplying by 1, so the
            form of the fraction changed but its value did not.
          </>
        ) : wrong === "byp" ? (
          <>
            Not quite. Multiplying by <InlineMath latex={`\\tfrac{${p}}{${p}}`} /> scales
            both parts of the fraction and still leaves{" "}
            <InlineMath latex={`\\sqrt{${p}}`} /> sitting in the denominator. Only a radical
            multiplied by itself turns into a whole number.
          </>
        ) : wrong === "squared" ? (
          <>
            Not quite.{" "}
            <InlineMath
              latex={`\\sqrt{${p}} \\cdot \\sqrt{${p}} = \\sqrt{${p * p}} = ${p}`}
            />
            , not {p * p}. The radicands multiply, and then the square root of that perfect
            square is a whole number again.
          </>
        ) : wrong === "leave" ? (
          <>
            Not quite. The radical is out of the denominator, but{" "}
            <InlineMath latex={`\\tfrac{${c}}{${p}}`} /> is a whole number, so there is
            still a division waiting to be done.
          </>
        ) : stage === 0 ? (
          "A radical is not allowed to stay in the denominator, so choose the form of 1 that will clear it."
        ) : stage === 1 ? (
          "Now finish the denominator, where a radical is being multiplied by itself."
        ) : (
          "The radical is out of the denominator. Now check whether the numbers that are left still reduce."
        )}
      </p>
    </div>
  );
}
