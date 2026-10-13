/**
 * RAD.1 interactive (slide 5): simplify a root by taking out perfect squares until none
 * are left.
 *
 * This is the node's method, so the widget has to BE the method rather than a quiz about
 * it. The learner taps a perfect square, watches it leave the radical and multiply into
 * the coefficient out front, and then looks at what is left and decides whether to go
 * again. There is no single right route: taking a small square just means one more pass,
 * which is exactly the claim the slide makes, so the widget accepts every square that
 * divides and follows whichever one was taken.
 *
 * What it does NOT accept is stopping early. Saying "nothing left" while a perfect square
 * is still inside is the one wrong answer here, because "look again" is the half of the
 * method a learner drops first.
 *
 * The gate opens when both roots are finished. A revealed step advances exactly as a
 * correct tap would, without being counted as one.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

/** The squares on offer. Small ones first, so the cheap route is the visible one. */
const SQUARES: readonly number[] = [4, 9, 16, 25, 36];

/**
 * Two sets of two radicands. Every one of them can be finished by more than one route, so
 * no board can be walked by memorising a single factor, and "start over" hands out the set
 * the learner has NOT just worked.
 */
const POOLS: readonly (readonly number[])[] = [
  [180, 162],
  [288, 300],
];

/** The first square on the row that divides `inside`, or null when it is finished. */
function squareIn(inside: number): number | null {
  return SQUARES.find((s) => inside % s === 0) ?? null;
}

export function SimplifyRadicalSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly number[]);
  return (
    <SimplifyRadicalSolverBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function SimplifyRadicalSolverBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly number[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  /** What is out in front of the radical so far. Starts at 1, before anything came out. */
  const [coefficient, setCoefficient] = useState(1);
  /** What is still under it. */
  const [inside, setInside] = useState(rounds[0] ?? 0);
  /** Every square taken so far, in the order they came out. */
  const [taken, setTaken] = useState<readonly number[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const radicand = rounds[roundIndex] ?? (rounds[0] as number);
  const lastIndex = rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;
  const hiding = squareIn(inside);

  /** Take one square out. Shared by the honest tap and the reveal. */
  function extract(square: number, earned: boolean) {
    setCoefficient(coefficient * Math.round(Math.sqrt(square)));
    setInside(inside / square);
    setTaken([...taken, square]);
    setAttempted(false);
    setRevealed(false);
    setFeedback(null);
    if (earned) {
      success();
    }
  }

  /** Call it finished. `earned` is false when the learner revealed it instead. */
  function finish(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function take(square: number) {
    if (solved) {
      return;
    }
    if (inside % square === 0) {
      extract(square, true);
      return;
    }
    setAttempted(true);
    setFeedback(
      `Not quite. ${inside} does not divide evenly by ${square}, so ${square} cannot come out of it. Try another one.`,
    );
  }

  function callItFinished() {
    if (solved) {
      return;
    }
    if (hiding === null) {
      finish(true);
      return;
    }
    setAttempted(true);
    setFeedback(
      `Not yet. ${inside} still divides by ${hiding}, and ${hiding} is a perfect square, so there is one more to take out.`,
    );
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      const next = rounds[roundIndex + 1] ?? 0;
      setRoundIndex(roundIndex + 1);
      setCoefficient(1);
      setInside(next);
      setTaken([]);
      setAttempted(false);
      setRevealed(false);
      setFeedback(null);
      setSolved(false);
    }
  }

  /** What the expression reads as right now. */
  const current =
    coefficient === 1 ? `\\sqrt{${inside}}` : `${coefficient}\\sqrt{${inside}}`;
  const trail =
    taken.length === 0 ? "nothing taken out yet" : `taken out so far: ${taken.join(", ")}`;
  const neutral = { color: LABEL, borderColor: LINE };

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <svg
        viewBox="0 0 440 152"
        role="img"
        aria-label={`Simplifying the square root of ${radicand}, currently reading ${coefficient} times the square root of ${inside}`}
      >
        <title>Take perfect squares out of a root until none are left</title>

        <text x={220} y={20} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Root ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\sqrt{${radicand}}`}
          x={220}
          y={48}
          fontSize={22}
          color={taken.length > 0 ? SOFT : LABEL}
        />

        {taken.length > 0 && (
          <text x={220} y={68} textAnchor="middle" fontSize={12} fill={LINE}>
            &#8595;
          </text>
        )}

        <SvgMath
          latex={current}
          x={220}
          y={98}
          fontSize={28}
          color={solved ? CIVIC : taken.length > 0 ? LABEL : SOFT}
        />

        <text x={220} y={130} textAnchor="middle" fontSize={12} fill={SOFT}>
          {trail}
        </text>

        {!solved && hiding !== null && taken.length > 0 && (
          <text x={220} y={146} textAnchor="middle" fontSize={11} fill={BRICK}>
            {`look at the ${inside} again`}
          </text>
        )}
      </svg>

      {solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on new roots
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new root
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          {SQUARES.map((square) => (
            <button
              key={square}
              type="button"
              className="lesson-interactive__chip"
              style={neutral}
              aria-label={`Take ${square} out of ${inside}`}
              onClick={() => take(square)}
            >
              {square}
            </button>
          ))}
          <button
            type="button"
            className="lesson-interactive__step"
            style={neutral}
            onClick={callItFinished}
          >
            Nothing left to take out
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={
          hiding === null ? "nothing left to take out" : <InlineMath latex={`${hiding}`} />
        }
        why={
          hiding === null ? (
            <>
              Every square on the board has been tried against{" "}
              <InlineMath latex={`${inside}`} /> and none of them divides it, so nothing
              more can leave the radical. That is what <strong>simplified</strong> means:
              not that the number inside is small, but that no perfect square is left in it.
            </>
          ) : (
            <>
              <InlineMath latex={`${inside} = ${hiding} \\cdot ${inside / hiding}`} />, and{" "}
              <InlineMath latex={`${hiding}`} /> is a perfect square, so its root is the
              whole number <InlineMath latex={`${Math.round(Math.sqrt(hiding))}`} /> and it
              can step outside. It multiplies into the{" "}
              <InlineMath latex={`${coefficient}`} /> already in front rather than replacing
              it, because both of them are now factors of the same answer.
            </>
          )
        }
        onReveal={() => {
          setRevealed(true);
          if (hiding === null) {
            finish(false);
            return;
          }
          extract(hiding, false);
        }}
        label={hiding === null ? "Reveal whether it is finished" : "Reveal the next square"}
        // A round takes as many squares as the radicand is hiding and then the call that
        // nothing is left, so explaining one square always leaves that call outstanding at the
        // very least. The reveal that makes the CALL is the one that ends the round, and after
        // it only the rounds behind it remain.
        othersRemain={hiding !== null || !isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            <InlineMath latex={`\\sqrt{${radicand}} = ${current}`} />. Nothing inside{" "}
            <InlineMath latex={`${inside}`} /> divides by a perfect square, so this root is
            simplified. Taking the squares out in a different order would have landed on
            exactly the same answer! Only the number of passes would have changed.
          </>
        ) : feedback ? (
          feedback
        ) : taken.length === 0 ? (
          `Tap any perfect square that divides ${inside} evenly. It does not have to be the biggest one.`
        ) : (
          `That one is out and it went in front. Now look at the ${inside}: take out another square, or say there is nothing left.`
        )}
      </p>
    </div>
  );
}
