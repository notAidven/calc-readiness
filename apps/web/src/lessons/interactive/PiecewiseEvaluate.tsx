/**
 * FUN.3 slide 1: evaluate in the fixed order, choose the piece and only then substitute.
 *
 * Each round is two moves and they are graded separately, because they fail separately: the
 * learner first calls the condition the input satisfies, and only after that does a box open
 * for the value. Nothing about the second move is offered until the first one lands, so a
 * learner cannot compute their way to an answer and discover afterwards which formula they
 * were using.
 *
 * Both rounds of a set share ONE definition and differ only in the input, which is the point
 * of the slide: the same function needs a different formula for a different input. Set A's
 * rounds land in the middle piece and then the first; set B's land on a CONSTANT piece, where
 * the input does not appear in the formula at all, and then on a squared piece.
 *
 * A wrong call is answered with a note and opens the reveal rather than locking the round, in
 * the shape `PositiveExponentSolver` uses: the second move is a typed number rather than a
 * choice, so the round as a whole is not guessable even though the first move is.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE } from "../svgKit";
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

interface Condition {
  latex: string;
  spoken: string;
}

interface Round {
  /** The input this round asks about, e.g. `x = 3`. */
  inputLatex: string;
  inputSpoken: string;
  /** The question, e.g. `f(3)`. */
  askLatex: string;
  /** Which of the set's conditions the input satisfies. */
  right: number;
  /** The chosen formula with the input written in, e.g. `10 - 4(3)`. */
  substitution: string;
  /** The value that comes out. */
  value: number;
  /** Why that condition is the one that holds, for the first stage's reveal. */
  whyPiece: ReactNode;
  /** Why the substitution produces that value, for the second stage's reveal. */
  whyValue: ReactNode;
}

interface Board {
  definition: string;
  spoken: string;
  conditions: readonly Condition[];
  /** The formula belonging to each condition, positionally aligned with it. */
  formulas: readonly string[];
  rounds: readonly Round[];
}

/**
 * Two sets. Neither definition is the check's freight rate, and neither reuses slide 0's
 * boards. Every value comes out a whole number, so the second stage is a plain integer box.
 */
const BOARDS: readonly Board[] = [
  {
    definition:
      "f(x) = \\begin{cases} 6x + 1 & x < -2 \\\\ 10 - 4x & -2 \\le x < 4 \\\\ 7 & x \\ge 4 \\end{cases}",
    spoken:
      "f of x equals 6x plus 1 when x is less than negative 2, 10 minus 4x when x is at least negative 2 and less than 4, and 7 when x is at least 4",
    conditions: [
      { latex: "x < -2", spoken: "x is less than negative 2" },
      { latex: "-2 \\le x < 4", spoken: "x is at least negative 2 and less than 4" },
      { latex: "x \\ge 4", spoken: "x is at least 4" },
    ],
    formulas: ["6x + 1", "10 - 4x", "7"],
    rounds: [
      {
        inputLatex: "x = 3",
        inputSpoken: "x equals 3",
        askLatex: "f(3)",
        right: 1,
        substitution: "10 - 4(3)",
        value: -2,
        whyPiece: (
          <>
            <InlineMath latex="3" /> is above <InlineMath latex="-2" /> and below{" "}
            <InlineMath latex="4" />, so it passes both halves of{" "}
            <InlineMath latex="-2 \le x < 4" />. The last stretch does not begin until{" "}
            <InlineMath latex="4" />, so it cannot reach this input.
          </>
        ),
        whyValue: (
          <>
            Substituting into that formula alone gives{" "}
            <InlineMath latex="10 - 4(3) = 10 - 12" />, and taking twelve away from ten runs
            past zero, so the value is below it.
          </>
        ),
      },
      {
        inputLatex: "x = -5",
        inputSpoken: "x equals negative 5",
        askLatex: "f(-5)",
        right: 0,
        substitution: "6(-5) + 1",
        value: -29,
        whyPiece: (
          <>
            <InlineMath latex="-5" /> is further left than <InlineMath latex="-2" />, so{" "}
            <InlineMath latex="x < -2" /> is the only condition it satisfies. The same
            function, a different input, and therefore a different formula.
          </>
        ),
        whyValue: (
          <>
            <InlineMath latex="6(-5) = -30" />, and adding <InlineMath latex="1" /> to that
            moves it one step back toward zero without reaching it.
          </>
        ),
      },
    ],
  },
  {
    definition:
      "g(n) = \\begin{cases} n^{2} & n \\le 0 \\\\ 5n - 7 & 0 < n \\le 6 \\\\ 23 & n > 6 \\end{cases}",
    spoken:
      "g of n equals n squared when n is at most 0, 5n minus 7 when n is above 0 and at most 6, and 23 when n is above 6",
    conditions: [
      { latex: "n \\le 0", spoken: "n is at most 0" },
      { latex: "0 < n \\le 6", spoken: "n is above 0 and at most 6" },
      { latex: "n > 6", spoken: "n is above 6" },
    ],
    formulas: ["n^{2}", "5n - 7", "23"],
    rounds: [
      {
        inputLatex: "n = 9",
        inputSpoken: "n equals 9",
        askLatex: "g(9)",
        right: 2,
        substitution: "23",
        value: 23,
        whyPiece: (
          <>
            <InlineMath latex="9" /> is past <InlineMath latex="6" />, so{" "}
            <InlineMath latex="n > 6" /> is the condition that holds. The middle stretch is
            capped at <InlineMath latex="6" /> and stops before this input.
          </>
        ),
        whyValue: (
          <>
            That formula is a constant, so the input does not appear in it at all. Every
            input past <InlineMath latex="6" /> is sent to the same value, which is what a
            flat piece means.
          </>
        ),
      },
      {
        inputLatex: "n = -3",
        inputSpoken: "n equals negative 3",
        askLatex: "g(-3)",
        right: 0,
        substitution: "(-3)^{2}",
        value: 9,
        whyPiece: (
          <>
            <InlineMath latex="-3" /> is below <InlineMath latex="0" />, so{" "}
            <InlineMath latex="n \le 0" /> holds and the squared formula is the one to use.
            The middle stretch does not open until above <InlineMath latex="0" />.
          </>
        ),
        whyValue: (
          <>
            A negative input squared is a product of two negatives, so the value comes out
            above zero: <InlineMath latex="(-3)(-3)" /> is positive.
          </>
        ),
      },
    ],
  },
];

export function PiecewiseEvaluate(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <PiecewiseEvaluateBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function PiecewiseEvaluateBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  /** 0 = call the condition, 1 = produce the value, 2 = the round is finished. */
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [missedCall, setMissedCall] = useState<number | null>(null);
  const [entry, setEntry] = useState("");
  const [valueWrong, setValueWrong] = useState(false);
  const [pieceRevealed, setPieceRevealed] = useState(false);
  const [valueRevealed, setValueRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const round = board.rounds[roundIndex] ?? (board.rounds[0] as Round);
  const lastIndex = board.rounds.length - 1;
  const isLastRound = roundIndex === lastIndex;
  const chosenFormula = board.formulas[round.right] ?? "";
  const chosenCondition = board.conditions[round.right];
  const finished = stage === 2;

  /** Open the next stage. `earned` is false when the learner revealed it instead. */
  function advance(next: 1 | 2, earned: boolean) {
    setMissedCall(null);
    setValueWrong(false);
    setStage(next);
    if (earned) {
      success();
    }
    if (next === 2 && isLastRound && !done) {
      setDone(true);
      onSolved();
    }
  }

  function call(at: number) {
    if (stage !== 0 || fill.given) {
      return;
    }
    if (at === round.right) {
      advance(1, true);
      return;
    }
    setMissedCall(at);
  }

  function checkValue() {
    if (stage !== 1 || fill.given) {
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss: the status line says so
    // rather than restating the formula, which would answer a question the learner did not
    // ask. `valueWrong` is still set, so the reveal stays on offer.
    const read = readNumericEntry(entry, "integer");
    if (read.ok && read.value === round.value) {
      advance(2, true);
      return;
    }
    setValueWrong(true);
  }

  function nextRound() {
    if (roundIndex >= lastIndex) {
      return;
    }
    setRoundIndex(roundIndex + 1);
    setStage(0);
    setMissedCall(null);
    setEntry("");
    setValueWrong(false);
    setPieceRevealed(false);
    setValueRevealed(false);
  }

  /** Both options render in the SAME neutral token, so colour never marks the answer. */
  const neutral = { color: LABEL, borderColor: LINE };

  let status: ReactNode;
  if (fill.given) {
    status = null;
  } else if (finished) {
    status = (
      <>
        <InlineMath latex={`${round.askLatex} = ${round.substitution} = ${round.value}`} />.
        The condition picked the formula and the formula produced the value, in that order.
      </>
    );
  } else if (missedCall !== null) {
    status = (
      <>
        That condition does not hold for <InlineMath latex={round.inputLatex} />. Test the
        input against each condition on its own, and read a break point's sign carefully:
        strict leaves the input out, <InlineMath latex="\le" /> and{" "}
        <InlineMath latex="\ge" /> take it in.
      </>
    );
  } else if (valueWrong) {
    status = readNumericEntry(entry, "integer").ok ? (
      <>
        Not that value. The formula for this input is <InlineMath latex={chosenFormula} />,
        so write the input in place of the variable and work the arithmetic out from there.
      </>
    ) : (
      WHOLE_NUMBER_MISS
    );
  } else if (stage === 0) {
    status = (
      <>
        No arithmetic yet. Decide which condition <InlineMath latex={round.inputLatex} />{" "}
        satisfies, because that is what says which formula is allowed to touch it.
      </>
    );
  } else {
    status = (
      <>
        The condition <InlineMath latex={chosenCondition?.latex ?? ""} /> holds, so the
        formula is <InlineMath latex={chosenFormula} /> and no other. Substitute the input
        into it.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--step-solver">
      <WidgetTask>
        Goal: produce <InlineMath latex={round.askLatex} /> in two moves, first the
        condition the input satisfies and then the value its formula gives.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.definition} color={LABEL} />
      </p>

      <p className="lesson-interactive__step-label" aria-live="polite">
        {`Round ${roundIndex + 1} of ${board.rounds.length}`}
      </p>

      {finished ? (
        isLastRound ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different function
          </button>
        ) : (
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next: the same function, a different input
          </button>
        )
      ) : stage === 0 ? (
        <div className="lesson-interactive__controls">
          {board.conditions.map((condition, at) => (
            <button
              key={condition.latex}
              type="button"
              className="lesson-interactive__chip"
              data-state={missedCall === at ? "wrong" : undefined}
              style={neutral}
              aria-label={`${round.inputSpoken} satisfies ${condition.spoken}`}
              onClick={() => call(at)}
            >
              <InlineMath latex={condition.latex} />
            </button>
          ))}
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: CIVIC }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${round.askLatex} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`the value of ${round.askLatex.replace("(", " at ").replace(")", "")}`}
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkValue();
                }
              }}
              // Last, so the answer overrides whatever the learner typed for as long as the
              // reveal is up. One box per round, and `round.value` is what `checkValue`
              // grades it against, so the blank the passage explains is this one.
              {...fill.entry(round.value)}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkValue}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={stage === 0 && missedCall !== null}
        revealed={pieceRevealed}
        answer={<InlineMath latex={chosenCondition?.latex ?? ""} />}
        why={round.whyPiece}
        onReveal={() => {
          setPieceRevealed(true);
          advance(1, false);
        }}
        label="Reveal which condition holds"
        // The value is the round's second move and is always still owed at this stage, but it
        // is read off the state rather than asserted, so a stage that has moved on cannot go
        // on claiming there is work left.
        othersRemain={stage !== 2}
      />

      <WidgetReveal
        available={stage === 1 && valueWrong}
        revealed={valueRevealed}
        answer={<InlineMath latex={String(round.value)} />}
        why={round.whyValue}
        onReveal={() => {
          setValueRevealed(true);
          advance(2, false);
        }}
        // The value closes the round, so what is left after it is explained is the rounds
        // after it. False on the last one, which is the gate.
        othersRemain={!isLastRound}
      />

      <p
        className="lesson-interactive__status"
        data-state={
          finished ? "solved" : missedCall !== null || valueWrong ? "wrong" : "prompt"
        }
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
