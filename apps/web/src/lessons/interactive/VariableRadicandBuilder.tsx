/**
 * RAD.4 interactive (slide 5): split an ODD variable power and pull the even part out.
 *
 * The explanation runs on what a square root ASKS: which thing was multiplied by itself.
 * An even exponent answers that immediately, because it splits into two equal halves; an
 * odd one cannot, so a single copy is left behind and the rest halves. "Pairs coming out
 * of the root" was the old wording and it named a mechanism nothing on the board showed.
 *
 * Two rounds, each a genuine two-move build: the learner first TAPS the even part of the
 * exponent (three of the four chips are wrong for a real reason, and a chip that is even
 * but leaves more than one copy behind is told apart from one that does not fit at all),
 * then TYPES the power that comes out in front. Nothing assembles until both moves
 * are theirs. Rounds are `p^7` and `p^5`; the paragraph above works `x^9`, so neither
 * repeats it.
 *
 * Both moves score: the right chip and the right exponent each fire the shared success
 * signal once. Both moves also carry their own reveal, offered only after a real attempt,
 * which makes the move and explains the reasoning behind it; the second reveal also carries
 * the no-bars note, because the status line stands down once a reveal has spoken.
 *
 * ## Where the task is stated, and what it asks for
 *
 * The task is the FIRST thing in the widget, in `WidgetTask`. It used to be the last: a
 * learner read the round counter, the expression, a grey note about pairs, four chips, and
 * only then a sentence telling them what to do with the chips. The status line still holds
 * the rule and the prediction, which is teaching rather than instruction and belongs under
 * the board.
 *
 * That sentence was also doing five jobs in a sentence and a half (rule, why this instance is
 * awkward, task, definition of the task, prediction of the leftover) and it asked for the
 * wrong KIND of thing: "tap the even part of it" asks for a number, the even part of 7 is 6,
 * and 6 was not one of the four chips. Every chip is a POWER, so the task asks for a power.
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
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Round {
  /** The odd exponent under the root. */
  power: number;
  /** The largest even power that divides it. */
  evenPart: number;
  /** Half of `evenPart`: the exponent that comes out in front. */
  outside: number;
}

interface Board {
  symbol: string;
  rounds: readonly Round[];
  /** The even powers offered as split candidates, spanning both rounds. */
  chips: readonly number[];
}

/**
 * Two boards, each a variable and two odd powers, and neither works the paragraph's own
 * x^9. "Start over" hands out the board the learner has not just split.
 */
const POOLS: readonly Board[] = [
  {
    symbol: "p",
    rounds: [
      { power: 7, evenPart: 6, outside: 3 },
      { power: 5, evenPart: 4, outside: 2 },
    ],
    chips: [2, 4, 6, 8],
  },
  {
    symbol: "k",
    rounds: [
      { power: 9, evenPart: 8, outside: 4 },
      { power: 11, evenPart: 10, outside: 5 },
    ],
    chips: [6, 8, 10, 12],
  },
];

export function VariableRadicandBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  const board = POOLS[variant.index] ?? (POOLS[0] as Board);
  return (
    <VariableRadicandBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function VariableRadicandBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { symbol: SYMBOL, rounds, chips } = board;
  const [index, setIndex] = useState(0);
  const [split, setSplit] = useState(false);
  const [entry, setEntry] = useState("");
  const [outDone, setOutDone] = useState(false);
  const [chipTried, setChipTried] = useState(false);
  const [chipRevealed, setChipRevealed] = useState(false);
  const [outTried, setOutTried] = useState(false);
  const [outRevealed, setOutRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = rounds[index] ?? (rounds[0] as Round);
  const lastIndex = rounds.length - 1;
  const isLast = index === lastIndex;

  /** Make the split. `earned` is false when the learner revealed it instead. */
  function finishSplit(earned: boolean) {
    setSplit(true);
    setFeedback(null);
    if (earned) {
      success();
    }
  }

  /** Close the round out. `earned` is false when the learner revealed the exponent. */
  function finishOutside(earned: boolean) {
    setOutDone(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (isLast && !done) {
      setDone(true);
      onSolved();
    }
  }

  function pick(chip: number) {
    if (split) {
      return;
    }
    if (chip === round.evenPart) {
      finishSplit(true);
      return;
    }
    setChipTried(true);
    if (chip > round.power) {
      setFeedback(
        `There are only ${round.power} copies of ${SYMBOL} under the root, so ${chip} of them is more than you have to work with.`,
      );
      return;
    }
    setFeedback(
      "That is an even power and it does fit under the root, but a larger even power fits as well, so keep looking.",
    );
  }

  function checkOutside() {
    if (outDone) {
      return;
    }
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("The box is empty. Enter a number before you go on.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about pairing the copies up, which would answer a question the
    // learner did not ask. It still counts as an attempt, so the reveal comes on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setOutTried(true);
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === round.outside) {
      finishOutside(true);
      return;
    }
    setOutTried(true);
    setFeedback(
      read.value === round.evenPart
        ? "That is the power that stays under the root. A square root pairs those copies up and sends one copy of each pair outside, so the exponent in front is smaller."
        : "Not quite. A square root pairs the copies up and sends one copy of each pair outside, so the exponent in front is half the even power you split off.",
    );
  }

  function revealSplit() {
    setChipRevealed(true);
    finishSplit(false);
  }

  function revealOutside() {
    setEntry(String(round.outside));
    setOutRevealed(true);
    finishOutside(false);
  }

  function nextRound() {
    if (index < lastIndex) {
      setIndex(index + 1);
      setSplit(false);
      setEntry("");
      setOutDone(false);
      setChipTried(false);
      setChipRevealed(false);
      setOutTried(false);
      setOutRevealed(false);
      setFeedback(null);
    }
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Tap the largest even power of <InlineMath latex={SYMBOL} /> that fits inside{" "}
        <InlineMath latex={`${SYMBOL}^{${round.power}}`} />, then type the exponent that
        leaves the root in front.
      </WidgetTask>

      <svg
        viewBox="0 0 440 196"
        role="img"
        aria-label={`The square root of ${SYMBOL} to the ${round.power}, being split so the even part can leave the root`}
      >
        <title>Split a variable power under a square root</title>

        <text x={220} y={18} textAnchor="middle" fontSize={12} fill={SOFT}>
          {`Round ${index + 1} of ${rounds.length}`}
        </text>

        <SvgMath
          latex={`\\sqrt{${SYMBOL}^{${round.power}}}`}
          x={220}
          y={46}
          fontSize={24}
          color={LABEL}
        />

        {split ? (
          <>
            <path
              d="M 205 62 L 148 92 M 235 62 L 292 92"
              fill="none"
              stroke={LINE}
              strokeWidth={1.5}
            />
            <rect
              x={100}
              y={94}
              width={96}
              height={42}
              rx={9}
              fill={CIVIC}
              fillOpacity={0.14}
              stroke={CIVIC}
              strokeWidth={1.5}
            />
            <SvgMath
              latex={`\\sqrt{${SYMBOL}^{${round.evenPart}}}`}
              x={148}
              y={115}
              fontSize={17}
              color={LABEL}
              w={96}
            />
            <rect
              x={244}
              y={94}
              width={96}
              height={42}
              rx={9}
              fill={SIGNAL}
              fillOpacity={0.14}
              stroke={SIGNAL}
              strokeWidth={1.5}
            />
            <SvgMath
              latex={`\\sqrt{${SYMBOL}}`}
              x={292}
              y={115}
              fontSize={17}
              color={LABEL}
              w={96}
            />

            <SvgMath
              latex={
                outDone
                  ? `\\sqrt{${SYMBOL}^{${round.power}}} = ${SYMBOL}^{${round.outside}}\\sqrt{${SYMBOL}}`
                  : `\\sqrt{${SYMBOL}^{${round.power}}} = ${SYMBOL}^{?}\\,\\sqrt{${SYMBOL}}`
              }
              x={220}
              y={172}
              fontSize={22}
              color={outDone ? CIVIC : SOFT}
            />
          </>
        ) : (
          /* The rule, demoted to a note. It used to sit here at instruction weight, in the
             slot a problem statement belongs in, which left the board stating a fact where
             the learner was looking for a task. The task is now the line above the diagram
             and this is a footnote under the expression it is about. */
          <text x={220} y={112} textAnchor="middle" fontSize={12} fill={SOFT}>
            pairs are all a square root can take out
          </text>
        )}
      </svg>

      {!split ? (
        <div className="lesson-interactive__controls">
          {/* Every chip carries the same neutral token, so colour never marks the answer.
              The fill dashes the one the split reveal names, which is `round.evenPart`: the
              value `pick` accepts and the exponent its `answer` prop prints. */}
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="lesson-interactive__chip"
              style={{
                color: LABEL,
                borderColor: chip === round.evenPart && fill.given ? SIGNAL_DEEP : LINE,
                borderStyle: chip === round.evenPart && fill.given ? "dashed" : "solid",
              }}
              onClick={() => pick(chip)}
              {...fill.mark(chip === round.evenPart)}
            >
              <InlineMath latex={`${SYMBOL}^{${chip}}`} />
            </button>
          ))}
        </div>
      ) : outDone ? (
        isLast ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different variable
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: a new power
          </button>
        )
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`\\sqrt{${SYMBOL}^{${round.evenPart}}} = ${SYMBOL}`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`Exponent that comes out of the root from ${SYMBOL} to the ${round.evenPart}`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkOutside();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. This box is the round's second move and `round.outside` is the
              // value `checkOutside` grades it against.
              {...fill.entry(round.outside)}
            />
          </div>
          <button
            type="button"
            className="lesson-interactive__check"
            onClick={checkOutside}
          >
            Pull it out
          </button>
        </div>
      )}

      <WidgetReveal
        available={chipTried && !split}
        revealed={chipRevealed}
        answer={<InlineMath latex={`${SYMBOL}^{${round.evenPart}}`} />}
        why={
          <>
            A square root asks what was multiplied by itself, so the exponent under it has
            to split into two equal halves. {round.power} is odd and will not split evenly,
            but {round.evenPart} will, so peel one copy off and leave the rest:{" "}
            <InlineMath
              latex={`${SYMBOL}^{${round.power}} = ${SYMBOL}^{${round.evenPart}} \\cdot ${SYMBOL}`}
            />
            .
          </>
        }
        onReveal={revealSplit}
        label="Reveal the split"
        // What comes out in front is the round's second question, so explaining the split
        // never spends the round: `outDone` is that second answer having landed.
        othersRemain={!outDone}
      />

      <WidgetReveal
        available={split && outTried && !outDone}
        revealed={outRevealed}
        answer={<InlineMath latex={`${round.outside}`} />}
        why={
          <>
            <InlineMath
              latex={`${SYMBOL}^{${round.evenPart}} = ${SYMBOL}^{${round.outside}} \\cdot ${SYMBOL}^{${round.outside}}`}
            />
            , which is <InlineMath latex={`${SYMBOL}^{${round.outside}}`} /> multiplied by
            itself, so that is what the square root hands back: the exponent halves, from{" "}
            {round.evenPart} to {round.outside}. No bars are needed here, because a square
            root is only real when what sits under it is not negative, so{" "}
            <InlineMath latex={`${SYMBOL} \\ge 0`} /> already.
          </>
        }
        onReveal={revealOutside}
        // The exponent that steps outside closes the round, so what is left after it is
        // explained is the rounds after it. False on the last one, which is the gate.
        othersRemain={!isLast}
      />

      <p
        className="lesson-interactive__status"
        data-state={outDone ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {outRevealed ? null : outDone ? (
          <>
            <InlineMath
              latex={`\\sqrt{${SYMBOL}^{${round.power}}} = ${SYMBOL}^{${round.outside}}\\sqrt{${SYMBOL}}`}
            />
            . No bars are needed here: a square root is only real when what sits under it is
            not negative, so <InlineMath latex={`${SYMBOL} \\ge 0`} /> already, which means{" "}
            <InlineMath latex={`${SYMBOL}^{${round.outside}}`} /> cannot be negative either.
          </>
        ) : feedback ? (
          feedback
        ) : split ? (
          <>
            <InlineMath
              latex={`${SYMBOL}^{${round.power}} = ${SYMBOL}^{${round.evenPart}} \\cdot ${SYMBOL}`}
            />
            . Now halve the {round.evenPart} to see which exponent leaves the root.
          </>
        ) : (
          <>
            A square root needs an exponent that splits into two equal halves, and{" "}
            {round.power} is odd. Whatever even power comes out, one spare copy of{" "}
            <InlineMath latex={SYMBOL} /> is left behind under the root.
          </>
        )}
      </p>
    </div>
  );
}
