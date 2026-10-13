/**
 * RAD.3 interactive (slide 3): evaluate a rational power, choosing your own order. Both
 * first moves are ALLOWED, because (q-th root of b)^p = q-th root of (b^p), so the widget
 * accepts either and then shows what each one costs: rooting first keeps the numbers small,
 * powering first sends the learner through a four-digit intermediate. The only wrong first
 * move is treating the exponent as a multiplier, and the only wrong finish is expecting the
 * root to undo the power and hand the base back. Set A is 16^(3/4) then 32^(2/5), set B is
 * 81^(3/4) then 64^(2/3), so no round repeats the 27^(2/3) worked in the paragraph above or
 * the CFU's 25^(3/2). Every option button carries the same neutral token. Both distractors
 * are whole numbers in every round, so no option ever prints a repeating decimal. Gates once
 * both rounds land.
 *
 * Both stages score: choosing a legal first move and then finishing the arithmetic each fire
 * the shared success signal once. Each stage also carries its own reveal, offered only after
 * a wrong choice, which fills the step in and explains the reasoning that produces it, so a
 * stuck learner reaches the gate by reading rather than by guessing.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Round {
  base: number;
  /** Exponent numerator (the power) and denominator (the root index). */
  num: number;
  den: number;
  /** The den-th root of base. */
  root: number;
  /** The final value, root^num. */
  value: number;
}

/**
 * Two sets of two powers. Every round keeps the root small and the powered-up form large,
 * so the cost of each order stays visible. "Start over" hands out the set the learner has
 * NOT just evaluated.
 */
const POOLS: readonly (readonly Round[])[] = [
  [
    { base: 16, num: 3, den: 4, root: 2, value: 8 },
    { base: 32, num: 2, den: 5, root: 2, value: 4 },
  ],
  [
    { base: 81, num: 3, den: 4, root: 3, value: 27 },
    { base: 64, num: 2, den: 3, root: 4, value: 16 },
  ],
];

type Order = "root" | "power";

export function RationalPowerSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <RationalPowerSolverBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RationalPowerSolverBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [orderTried, setOrderTried] = useState(false);
  const [orderRevealed, setOrderRevealed] = useState(false);
  const [valueTried, setValueTried] = useState(false);
  const [valueRevealed, setValueRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const { base, num, den, root, value } = round;
  const powered = base ** num;
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;

  /** Take a legal first move. `earned` is false when the learner revealed it instead. */
  function takeOrder(next: Order, earned: boolean) {
    setWrong(null);
    setOrder(next);
    if (earned) {
      success();
    }
  }

  /** Close the round out. `earned` is false when the learner revealed the value. */
  function finish(earned: boolean) {
    setWrong(null);
    setSolved(true);
    if (earned) {
      success();
    }
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function revealOrder() {
    setOrderRevealed(true);
    takeOrder("root", false);
  }

  function revealValue() {
    setValueRevealed(true);
    finish(false);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setOrder(null);
      setSolved(false);
      setWrong(null);
      setOrderTried(false);
      setOrderRevealed(false);
      setValueTried(false);
      setValueRevealed(false);
    }
  }

  const neutral = { color: LABEL, borderColor: LINE };
  const middleLatex =
    order === "root"
      ? `\\left(\\sqrt[${den}]{${base}}\\right)^{${num}} = ${root}^{${num}}`
      : `\\sqrt[${den}]{${base}^{${num}}} = \\sqrt[${den}]{${powered}}`;

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <WidgetTask>
        Evaluate this fraction power down to a whole number. Either job may go first, so
        pick the order you want and then carry it out.
      </WidgetTask>

      <svg
        viewBox="0 0 440 186"
        role="img"
        aria-label={`${base} raised to the fraction ${num} over ${den}, worked down to a single value`}
      >
        <title>Evaluate a rational power step by step</title>

        <text x={220} y={20} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`${base}^{\\frac{${num}}{${den}}}`}
          x={220}
          y={58}
          fontSize={24}
          color={LABEL}
          h={72}
        />

        {order && (
          <>
            <text x={220} y={86} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath
              latex={middleLatex}
              x={220}
              y={118}
              fontSize={20}
              color={LABEL}
              h={68}
            />
          </>
        )}

        {solved && (
          <>
            <text x={220} y={146} textAnchor="middle" fontSize={12} fill={LINE}>
              &#8595;
            </text>
            <SvgMath latex={`${value}`} x={220} y={168} fontSize={26} color={CIVIC} />
          </>
        )}
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two new powers
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new fraction exponent
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          {!order ? (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => takeOrder("root", true)}
              >
                <InlineMath latex={`\\text{Root first: } \\sqrt[${den}]{${base}}`} />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => takeOrder("power", true)}
              >
                <InlineMath latex={`\\text{Power first: } ${base}^{${num}}`} />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => {
                  setOrderTried(true);
                  setWrong("mult");
                }}
              >
                <InlineMath
                  latex={`\\text{Multiply } ${base} \\text{ by } \\tfrac{${num}}{${den}}`}
                />
              </button>
            </>
          ) : order === "root" ? (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => finish(true)}
              >
                <InlineMath latex={`${root}^{${num}} = ${value}`} />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => {
                  setValueTried(true);
                  setWrong("double");
                }}
              >
                <InlineMath latex={`${root}^{${num}} = ${root * num}`} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => finish(true)}
              >
                <InlineMath latex={`\\sqrt[${den}]{${powered}} = ${value}`} />
              </button>
              <button
                type="button"
                className="lesson-interactive__step"
                style={neutral}
                onClick={() => {
                  setValueTried(true);
                  setWrong("bigroot");
                }}
              >
                <InlineMath latex={`\\sqrt[${den}]{${powered}} = ${base}`} />
              </button>
            </>
          )}
        </div>
      )}

      <WidgetReveal
        available={orderTried && !order}
        revealed={orderRevealed}
        answer={<InlineMath latex={`\\left(\\sqrt[${den}]{${base}}\\right)^{${num}}`} />}
        why={
          <>
            The bottom number {den} is the index of the root and the top number {num} is the
            power, so the fraction exponent asks for a root and a power, never for a
            multiplication. Either one may go first, and taking the root first keeps the
            numbers small, because{" "}
            <InlineMath latex={`\\sqrt[${den}]{${base}} = ${root}`} /> while{" "}
            <InlineMath latex={`${base}^{${num}} = ${powered}`} />.
          </>
        }
        onReveal={revealOrder}
        label="Reveal the first move"
        // The VALUE is the round's second question, and `solved` is exactly "that one has been
        // answered too", so explaining which move goes first never spends the round.
        othersRemain={!solved}
      />

      <WidgetReveal
        available={valueTried && order !== null && !solved}
        revealed={valueRevealed}
        answer={<InlineMath latex={`${value}`} />}
        why={
          order === "power" ? (
            <>
              Raising to the power first gives{" "}
              <InlineMath latex={`${base}^{${num}} = ${powered}`} />, and the index {den}{" "}
              asks for the number that gives {powered} when it is multiplied by itself {den}{" "}
              times. That number is {value}, which is exactly where the other order lands as
              well.
            </>
          ) : (
            <>
              You already have <InlineMath latex={`\\sqrt[${den}]{${base}} = ${root}`} />,
              and the top number {num} is the power that root is raised to. An exponent
              counts how many copies of the base are multiplied together, so{" "}
              <InlineMath latex={`${root}^{${num}} = ${value}`} />, which is exactly where
              the other order lands as well.
            </>
          )
        }
        onReveal={revealValue}
        // The value closes the round, so what is left after it is explained is the rounds after
        // it. False on the last one, which is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : wrong ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {valueRevealed ? null : solved ? (
          <>
            <InlineMath
              latex={`${base}^{\\frac{${num}}{${den}}} = \\left(\\sqrt[${den}]{${base}}\\right)^{${num}} = \\sqrt[${den}]{${base}^{${num}}} = ${value}`}
            />
            .{" "}
            {order === "root"
              ? `Both orders reach ${value}, and taking the root first kept you working with ${root} rather than ${powered}.`
              : `Both orders reach ${value}, but taking the power first dragged you through ${powered} on the way there!`}
          </>
        ) : wrong === "mult" ? (
          <>
            Not quite. A fraction exponent is not a multiplier. The bottom number {den} is
            the index of the root and the top number {num} is the power, so{" "}
            <InlineMath latex={`${base}^{\\frac{${num}}{${den}}}`} /> asks for a root of{" "}
            {base} raised to the power {num}.
          </>
        ) : wrong === "double" ? (
          <>
            Not quite. <InlineMath latex={`${root}^{${num}}`} /> means {root} multiplied by
            itself {num} times, because an exponent counts copies of the base rather than
            multiplying it.
          </>
        ) : wrong === "bigroot" ? (
          <>
            Not quite. The root does not simply undo the power and hand {base} back, because
            the index {den} and the power {num} are different numbers. You are looking for
            the number that gives {powered} when it is multiplied by itself {den} times.
          </>
        ) : !order ? (
          `The bottom number ${den} is the index of the root and the top number ${num} is the power. Either order is allowed here, so choose the first move you want to make.`
        ) : order === "root" ? (
          <>
            Taking the root first keeps the numbers small, and you are now working with{" "}
            <InlineMath latex={`${root}^{${num}}`} />. Raise {root} to the power {num} to
            finish.
          </>
        ) : (
          <>
            Raising to the power first makes the number under the root large, and you are
            now working with <InlineMath latex={`\\sqrt[${den}]{${powered}}`} />. Take that
            root to finish.
          </>
        )}
      </p>
    </div>
  );
}
