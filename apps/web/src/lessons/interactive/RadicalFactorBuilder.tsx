/**
 * RAD.1 interactive (slide 4): build a factor tree to pull a perfect square out of a root.
 * The learner taps a perfect square that divides the radicand, watches the split assemble,
 * then TYPES the coefficient that comes out front.
 *
 * ANY perfect square that divides is accepted, and the widget follows whichever one was
 * taken. That is the method: spotting the biggest factor in one go is the hard part and
 * simplifying does not need it, so a board that only accepted the largest was rewarding
 * the one skill the method exists to avoid. What is left under the radical may well hold
 * another square, and saying so is the job of the slide after this one.
 *
 * Each of the two steps fires the success signal on its own when it is answered, and each
 * can be revealed after one real attempt. Gates once both rounds are split.
 */

import { useState } from "react";

import {
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Round {
  /** The value under the root. Every square that divides it is a legal move. */
  radicand: number;
}

/**
 * Two sets of two radicands, none of them worked above. "Start over" hands out the set the
 * learner has NOT just answered, so a second pass is factored rather than recalled.
 */
const POOLS: readonly (readonly Round[])[] = [
  [{ radicand: 108 }, { radicand: 96 }],
  [{ radicand: 200 }, { radicand: 175 }],
];

/**
 * Candidate perfect-square chips the learner chooses among. One list serves both sets, so
 * it has to carry every set's answer, and the rest are squares that genuinely divide one
 * of the radicands: a wrong tap is then a plausible factor rather than an obvious miss.
 */
const SQUARES: readonly number[] = [4, 9, 16, 25, 36, 49, 100];

/** The first square on the row that goes in, which is what running down the list finds. */
function firstSquareIn(radicand: number): number {
  return SQUARES.find((s) => radicand % s === 0) ?? 4;
}

export function RadicalFactorBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const rounds = POOLS[variant.index] ?? (POOLS[0] as readonly Round[]);
  return (
    <RadicalFactorBuilderBody
      key={variant.nonce}
      rounds={rounds}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function RadicalFactorBuilderBody({
  rounds,
  onSolved,
  onRestart,
}: {
  rounds: readonly Round[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  /** The square the learner took, or null while they are still choosing. */
  const [picked, setPicked] = useState<number | null>(null);
  const [pickTried, setPickTried] = useState(false);
  const [pickRevealed, setPickRevealed] = useState(false);
  const [coeffEntry, setCoeffEntry] = useState("");
  const [coeffDone, setCoeffDone] = useState(false);
  const [coeffTried, setCoeffTried] = useState(false);
  const [coeffRevealed, setCoeffRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const lastIndex = rounds.length - 1;
  const round = rounds[roundIndex] ?? (rounds[0] as Round);
  const isLastRound = roundIndex === lastIndex;
  const solved = coeffDone;

  /** The square in play: the one taken, else the one a reveal would hand over. */
  const square = picked ?? firstSquareIn(round.radicand);
  const rem = round.radicand / square;
  const coeff = Math.round(Math.sqrt(square));
  const splitLatex = `${round.radicand} = ${square} \\cdot ${rem}`;

  function pick(chosen: number) {
    if (picked !== null) {
      return;
    }
    if (round.radicand % chosen === 0) {
      setPicked(chosen);
      setFeedback(null);
      success();
      return;
    }
    setPickTried(true);
    setFeedback(
      `Not quite. ${round.radicand} does not divide evenly by ${chosen}, so ${chosen} cannot be taken out of it. Try another one.`,
    );
  }

  /** Close the coefficient out. `earned` is false when the learner revealed it instead. */
  function finishCoeff(earned: boolean) {
    setCoeffDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkCoeff() {
    if (coeffDone) {
      return;
    }
    setCoeffTried(true);
    const read = readNumericEntry(coeffEntry, "integer");
    if (read.ok && read.value === coeff) {
      finishCoeff(true);
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about landing exactly on the square, which would answer a question
    // the learner did not ask. The attempt above still stands, so the reveal stays on offer.
    setFeedback(
      coeffEntry.trim() === ""
        ? `The box is still empty. Enter the whole number that times itself gives ${square}.`
        : read.ok
          ? `Not quite. The number you are after, multiplied by itself, has to land exactly on ${square}.`
          : WHOLE_NUMBER_MISS,
    );
  }

  function revealPick() {
    setPickRevealed(true);
    setPicked(firstSquareIn(round.radicand));
    setFeedback(null);
  }

  function revealCoeff() {
    setCoeffEntry(String(coeff));
    setCoeffRevealed(true);
    finishCoeff(false);
  }

  function nextRound() {
    if (roundIndex < lastIndex) {
      setRoundIndex(roundIndex + 1);
      setPicked(null);
      setPickTried(false);
      setPickRevealed(false);
      setCoeffEntry("");
      setCoeffDone(false);
      setCoeffTried(false);
      setCoeffRevealed(false);
      setFeedback(null);
    }
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <svg
        viewBox="0 0 440 194"
        role="img"
        aria-label={`Factor ${round.radicand} under a square root and pull out the perfect square`}
      >
        <title>Factor tree for a square root</title>

        <text x={220} y={20} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${roundIndex + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\sqrt{${round.radicand}}`}
          x={220}
          y={44}
          fontSize={24}
          color={LABEL}
        />

        {picked !== null && (
          <>
            <path
              d="M 205 58 L 150 88 M 235 58 L 290 88"
              fill="none"
              stroke={LINE}
              strokeWidth={1.5}
            />
            <rect
              x={104}
              y={90}
              width={92}
              height={40}
              rx={9}
              fill={CIVIC}
              fillOpacity={0.14}
              stroke={CIVIC}
              strokeWidth={1.5}
            />
            <SvgMath
              latex={`\\sqrt{${square}} = ${solved ? coeff : "?"}`}
              x={150}
              y={110}
              fontSize={17}
              color={CIVIC}
              w={92}
            />
            <rect
              x={244}
              y={90}
              width={92}
              height={40}
              rx={9}
              fill={SIGNAL}
              fillOpacity={0.14}
              stroke={SIGNAL}
              strokeWidth={1.5}
            />
            <SvgMath
              latex={`\\sqrt{${rem}}`}
              x={290}
              y={110}
              fontSize={17}
              color={LABEL}
              w={92}
            />

            <SvgMath
              latex={
                solved
                  ? `\\sqrt{${round.radicand}} = ${coeff}\\sqrt{${rem}}`
                  : `\\sqrt{${round.radicand}} = {?}\\,\\sqrt{${rem}}`
              }
              x={220}
              y={168}
              fontSize={22}
              color={solved ? CIVIC : SOFT}
            />
          </>
        )}

        {/* The shape the split will take, standing in until the learner picks a square.
            The instruction for the pick lives in the status line alone. */}
        {picked === null && (
          <SvgMath
            latex={`\\sqrt{${round.radicand}} = {?}\\,\\sqrt{?}`}
            x={220}
            y={112}
            fontSize={20}
            color={SOFT}
          />
        )}
      </svg>

      {picked === null ? (
        <div className="lesson-interactive__controls">
          {/* Every chip carries the same neutral token, so colour never marks the answer.
              The fill dashes whichever one the passage has just named: `square` is the
              chip the reveal hands over while nothing is picked, so this is the same
              expression its `answer` prop prints. Any square that divides is a legal move
              and the passage says so; what is marked is the one it states. */}
          {SQUARES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="lesson-interactive__chip"
              style={{
                color: LABEL,
                borderColor: candidate === square && fill.given ? SIGNAL_DEEP : LINE,
                borderStyle: candidate === square && fill.given ? "dashed" : "solid",
              }}
              onClick={() => pick(candidate)}
              {...fill.mark(candidate === square)}
            >
              {candidate}
            </button>
          ))}
        </div>
      ) : solved ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on new radicands
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new radicand
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`\\sqrt{${square}} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={coeffEntry}
              aria-label={`Whole-number square root of ${square}`}
              onChange={(e) => setCoeffEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  checkCoeff();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. `coeff` is the root of the square the learner actually took,
              // which is the value `checkCoeff` grades against and the one the second
              // reveal states.
              {...fill.entry(coeff)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkCoeff}>
            Pull it out
          </button>
        </div>
      )}

      <WidgetReveal
        available={picked === null && pickTried}
        revealed={pickRevealed}
        answer={<InlineMath latex={`${square}`} />}
        why={
          <>
            Run down the squares on offer and {square} is the first one that goes into{" "}
            {round.radicand} evenly, since <InlineMath latex={splitLatex} />. It does not
            have to be the biggest square that divides {round.radicand}. Any square that
            goes in can come out, and whatever is left behind is something you can look at
            again once it is out.
          </>
        }
        onReveal={revealPick}
        // The coefficient is the round's second question and it has not been asked yet, so
        // explaining which square comes out never spends the round.
        othersRemain={!coeffDone}
      />

      <WidgetReveal
        available={picked !== null && coeffTried && !solved}
        revealed={coeffRevealed}
        answer={<InlineMath latex={`${coeff}`} />}
        why={
          <>
            <InlineMath latex={`\\sqrt{${square}}`} /> asks for the whole number that times
            itself gives {square}, and{" "}
            <InlineMath latex={`${coeff} \\cdot ${coeff} = ${square}`} />, so {coeff} is the
            coefficient that steps out in front of the radical.
          </>
        }
        onReveal={revealCoeff}
        // The coefficient is the last thing this round asks for, so what is left after it is
        // explained is the rounds after it. False on the last one, which is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {coeffRevealed ? null : solved ? (
          <>
            <InlineMath latex={splitLatex} /> and{" "}
            <InlineMath latex={`\\sqrt{${square}} = ${coeff}`} />, so{" "}
            <InlineMath latex={`\\sqrt{${round.radicand}} = ${coeff}\\sqrt{${rem}}`} />.
            That is one perfect square out. Whether {rem} is holding another one is worth a
            second look.
          </>
        ) : feedback ? (
          feedback
        ) : picked !== null ? (
          <>
            <InlineMath latex={splitLatex} />, and {square} is a perfect square, so its root
            is a whole number. Enter that whole number to pull it out in front of the
            radical.
          </>
        ) : (
          `Tap any perfect square that divides ${round.radicand} evenly, because that is a piece whose root can step out of the radical.`
        )}
      </p>
    </div>
  );
}
