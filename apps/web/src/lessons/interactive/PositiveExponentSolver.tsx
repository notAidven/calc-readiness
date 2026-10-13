/**
 * EXP.1 interactive (slide 3): click through the reduction of a product of like-base
 * powers to positive-exponent form. Two rounds that differ in the ONE thing that decides
 * the last move: round 1 nets a positive total, so the power stays on top; round 2 nets a
 * negative one, so the whole factor moves to the bottom as a reciprocal, which is the first
 * time EXP.1 asks the learner to produce one. The two second-stage buttons keep the same
 * labels in both rounds, so the correct one cannot be found by colour or position: the
 * learner has to read the sign of the total. Each correct move fires the success signal on
 * its own. After a wrong tap the current move can be revealed instead: the reveal explains
 * the move and advances the stage exactly as a correct tap would, but it is deliberately
 * not counted as one. Gates once both rounds land.
 */

import { useState } from "react";

import {
  CIVIC,
  type EqToken,
  EquationRow,
  InlineMath,
  LABEL,
  LINE,
  SOFT,
  SvgMath,
  stackGapMid,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

interface Round {
  a: number;
  /** Magnitude of the negative second exponent. */
  b: number;
}

/**
 * Two sets of the same two shapes on different exponents. In EVERY set round 1 must net a
 * POSITIVE exponent and round 2 a NEGATIVE one (a reciprocal), because that contrast is
 * what the second stage teaches. "Start over" hands out the set the learner has NOT just
 * answered, so a second pass is worked rather than recalled.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { a: 6, b: 2 },
    { a: 2, b: 5 },
  ],
  [
    { a: 9, b: 3 },
    { a: 3, b: 7 },
  ],
];

type Stage = 0 | 1 | 2;

export function PositiveExponentSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <PositiveExponentSolverBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function PositiveExponentSolverBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [stage, setStage] = useState<Stage>(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [addRevealed, setAddRevealed] = useState(false);
  const [placeRevealed, setPlaceRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const net = round.a - round.b;
  const netPositive = net > 0;
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;
  const solved = stage >= 2;

  const start: readonly EqToken[] = [
    { text: `x^{${round.a}} \\cdot x^{-${round.b}}`, color: LABEL },
  ];
  const added: readonly EqToken[] = [
    { text: `x^{${round.a} + (-${round.b})}`, color: LABEL },
  ];
  const final: readonly EqToken[] = [
    { text: netPositive ? `x^{${net}}` : `\\dfrac{1}{x^{${-net}}}`, color: CIVIC },
  ];

  const sumLatex = `${round.a} + (-${round.b}) = ${net}`;
  const placementAnswer = netPositive
    ? "to keep the power on top"
    : "to move the power to the bottom";

  /** Open the next stage. `earned` is false when the learner revealed it instead. */
  function advanceTo(next: Stage, earned: boolean) {
    setWrong(null);
    setAttempted(false);
    setStage(next);
    if (earned) {
      success();
    }
    if (next >= 2 && isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  /** One wrong tap on the current stage, which is what opens the reveal. */
  function missed(which: string) {
    setAttempted(true);
    setWrong(which);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setStage(0);
      setWrong(null);
      setAttempted(false);
      setAddRevealed(false);
      setPlaceRevealed(false);
    }
  }

  /** Stage 1: the sign of the total decides which of the two moves is allowed. */
  function chooseKeepOnTop() {
    if (netPositive) {
      advanceTo(2, true);
      return;
    }
    missed("top");
  }

  function chooseMoveToBottom() {
    if (netPositive) {
      missed("bottom");
      return;
    }
    advanceTo(2, true);
  }

  function revealAdd() {
    setAddRevealed(true);
    advanceTo(1, false);
  }

  function revealPlacement() {
    setPlaceRevealed(true);
    advanceTo(2, false);
  }

  const ROW0_Y = 66;
  const ROW1_Y = 108;
  const ROW2_Y = 152;

  // Both options render in the SAME neutral token, so colour never marks the answer.
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--step-solver">
      <svg
        viewBox="0 0 440 182"
        role="img"
        aria-label={`Reduce x to the ${round.a} times x to the minus ${round.b} to positive-exponent form`}
      >
        <title>Reduce to positive-exponent form</title>

        <text x={220} y={22} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <EquationRow cx={220} y={ROW0_Y} fontSize={24} tokens={start} />

        {/* Each row's `y` is the equation's CENTER, so the arrows hang off the mean of
            two rows and every glyph here is centered rather than sat on a baseline. */}
        {stage >= 1 && (
          <>
            <text
              x={220}
              y={stackGapMid(ROW0_Y, ROW1_Y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill={LINE}
            >
              &#8595;
            </text>
            <EquationRow cx={220} y={ROW1_Y} fontSize={24} tokens={added} />
          </>
        )}

        {stage >= 2 && (
          <>
            <text
              x={220}
              y={stackGapMid(ROW1_Y, ROW2_Y)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fill={LINE}
            >
              &#8595;
            </text>
            <EquationRow cx={220} y={ROW2_Y} fontSize={26} tokens={final} />
          </>
        )}

        {/* The row the first move will write, standing in as an unknown power until it
            is written. The instruction for the move lives in the status line alone. */}
        {stage === 0 && (
          <SvgMath latex="x^{?}" x={220} y={ROW1_Y} fontSize={22} color={SOFT} />
        )}
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a new product
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a total that comes out negative
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
                Add the exponents
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => missed("mul")}
              >
                Multiply the exponents
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={chooseKeepOnTop}
              >
                Total is positive: keep it on top
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={chooseMoveToBottom}
              >
                Total is negative: move it to the bottom
              </button>
            </>
          )}
        </div>
      )}

      <WidgetReveal
        available={stage === 0 && attempted && !solved}
        revealed={addRevealed}
        answer="to add the exponents"
        why={
          <>
            Multiplying two powers that share a base only sets more copies of that base in a
            row, so the two exponents add rather than multiply:{" "}
            <InlineMath
              latex={`x^{${round.a}} \\cdot x^{-${round.b}} = x^{${round.a} + (-${round.b})}`}
            />
            . Multiplying the exponents belongs to a different rule, the one for a power
            raised to another power.
          </>
        }
        onReveal={revealAdd}
        // Where the power ENDS UP is the round's second question, and `solved` is exactly
        // "that one has been answered too", so this reveal never spends the round.
        othersRemain={!solved}
      />

      <WidgetReveal
        available={stage === 1 && attempted && !solved}
        revealed={placeRevealed}
        answer={placementAnswer}
        why={
          netPositive ? (
            <>
              The two exponents add to <InlineMath latex={sumLatex} />, which is above zero.
              A positive exponent is already the form we want, so the power stays where it
              is and nothing has to move.
            </>
          ) : (
            <>
              The two exponents add to <InlineMath latex={sumLatex} />, which is below zero.
              A negative exponent is shorthand for the reciprocal, so the whole power moves
              to the bottom of a fraction and becomes{" "}
              <InlineMath latex={`\\dfrac{1}{x^{${-net}}}`} />.
            </>
          )
        }
        onReveal={revealPlacement}
        // The placement closes the round, so what is left after it is explained is the rounds
        // after it. False on the last one, which is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : wrong ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {placeRevealed ? null : solved ? (
          netPositive ? (
            <>
              <InlineMath latex={`x^{${round.a}} \\cdot x^{-${round.b}} = x^{${net}}`} />.
              The total exponent is above zero, so the power stays on top and no reciprocal
              is needed.
            </>
          ) : (
            <>
              <InlineMath
                latex={`x^{${round.a}} \\cdot x^{-${round.b}} = \\dfrac{1}{x^{${-net}}}`}
              />
              . The total exponent is below zero, so the whole power moves to the bottom of
              a fraction, which is exactly what the reciprocal says.
            </>
          )
        ) : wrong === "mul" ? (
          "Not quite. Multiplying the exponents is the rule for a power raised to another power. Here two separate powers are being multiplied together, and because they share a base we add their exponents instead."
        ) : wrong === "top" ? (
          <>
            Not quite. Check the sign: <InlineMath latex={sumLatex} />, which is below zero,
            so the power cannot stay on top and still have a positive exponent.
          </>
        ) : wrong === "bottom" ? (
          <>
            Not quite. Check the sign: <InlineMath latex={sumLatex} />, which is already
            above zero, so there is nothing to move to the bottom.
          </>
        ) : stage === 0 ? (
          "These two powers are being multiplied and they are built on the same base, so choose the move that a product calls for."
        ) : (
          "The two exponents are lined up to be added now. Work out the total and read its sign, because the sign is what decides where the power ends up."
        )}
      </p>
    </div>
  );
}
