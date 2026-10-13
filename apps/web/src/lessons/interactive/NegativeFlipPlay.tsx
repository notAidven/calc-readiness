/**
 * LIN.4 slide 1: call the direction, then watch a test weight decide it.
 *
 * The slide argues the reversal out from $4 < 10$, which is a demonstration; this asks the learner
 * to commit before the demonstration runs. They pick which way the solved sign points, and the
 * widget then puts a test value into the ORIGINAL inequality and into both readings, so the call
 * is settled by arithmetic on the board rather than by the widget saying so.
 *
 * The test value is chosen to satisfy exactly one of the two readings, which is what makes the
 * check decisive. A value satisfying both would prove nothing, and one satisfying neither would
 * leave the learner with two failures and no verdict.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The inequality as handed over. */
  given: string;
  spokenGiven: string;
  /** The last step, with the direction left for the learner to supply. */
  boundary: string;
  /** The two readings, correct one first. */
  right: string;
  wrong: string;
  /** A test value, and what each reading says about it. */
  test: string;
  originalTest: string;
  rightTest: string;
  wrongTest: string;
  divisor: string;
}

const BOARDS: readonly Board[] = [
  {
    given: "-3x > 12",
    spokenGiven: "negative 3 x is greater than 12",
    boundary: "-4",
    right: "x < -4",
    wrong: "x > -4",
    test: "-6",
    originalTest: "-3(-6) = 18 > 12",
    rightTest: "-6 < -4",
    wrongTest: "-6 > -4",
    divisor: "-3",
  },
  {
    given: "-5x \\le 20",
    spokenGiven: "negative 5 x is less than or equal to 20",
    boundary: "-4",
    right: "x \\ge -4",
    wrong: "x \\le -4",
    test: "0",
    originalTest: "-5(0) = 0 \\le 20",
    rightTest: "0 \\ge -4",
    wrongTest: "0 \\le -4",
    divisor: "-5",
  },
];

export function NegativeFlipPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <NegativeFlipPlayBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function NegativeFlipPlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  // Dealt so the WRONG reading is offered first on one board and second on the other, and the
  // order is a property of the board rather than of chance, so a failure reproduces.
  const options =
    board.test === "0" ? [board.right, board.wrong] : [board.wrong, board.right];

  function finish(earned: boolean) {
    setSolved(true);
    if (earned) {
      success();
    }
    onSolved();
  }

  function pick(option: string) {
    if (solved) {
      return;
    }
    setPicked(option);
    setAttempted(true);
    if (option === board.right) {
      finish(true);
    }
  }

  function reveal() {
    setPicked(board.right);
    setRevealed(true);
    finish(false);
  }

  const missed = picked !== null && picked !== board.right && !solved;

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: say which way the sign points once both sides have been divided, then test a
        weight against the original inequality to settle it.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.given} color={LABEL} />, divided through by{" "}
        <InlineMath latex={board.divisor} color={LABEL} />
      </p>

      <div className="lesson-interactive__controls">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="lesson-interactive__chip"
            aria-label={`The solution is ${option === board.right ? board.right : board.wrong}`}
            aria-pressed={picked === option}
            disabled={solved}
            // One neutral token on both chips: a hue would answer the question. Only the
            // UNPICKED border is named; the picked one is the shared
            // `.lesson-interactive__chip[aria-pressed="true"]` rule, which an inline colour beats.
            style={{ color: LABEL, borderColor: picked === option ? undefined : LINE }}
            onClick={() => pick(option)}
          >
            <InlineMath latex={option} />
          </button>
        ))}
      </div>

      {solved ? (
        <div className="lesson-equation">
          <div className="lesson-equation__row" data-state="done">
            <span className="lesson-equation__stage">test</span>
            <span className="lesson-equation__body">
              <InlineMath latex={`x = ${board.test}`} color={LABEL} />
            </span>
          </div>
          <p className="lesson-interactive__row-note" style={{ color: CIVIC }}>
            <InlineMath latex={board.originalTest} color={CIVIC} />, so{" "}
            <InlineMath latex={board.test} color={CIVIC} /> does satisfy the original. And{" "}
            <InlineMath latex={board.rightTest} color={CIVIC} /> is true while{" "}
            <InlineMath latex={board.wrongTest} color={CIVIC} /> is false, so only one of
            the two readings admits it.
          </p>
        </div>
      ) : null}

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different inequality
        </button>
      ) : null}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={board.right} />}
        why={
          <>
            Dividing by <InlineMath latex={board.divisor} /> divides by a negative, which
            reverses the direction, so the sign in <InlineMath latex={board.given} /> comes
            out the other way round. Testing <InlineMath latex={`x = ${board.test}`} />{" "}
            confirms it: <InlineMath latex={board.originalTest} /> holds in the original,
            and <InlineMath latex={board.rightTest} /> is the only one of the two readings
            that lets it in.
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath latex={board.right} /> it is. The divisor was negative, so the
            direction turned over on that step, and the test weight is what shows the other
            reading excluding a load the original accepts.
          </>
        ) : missed ? (
          <span style={{ color: BRICK }}>
            Look at the sign of the number both sides are being divided by. Dividing by a
            negative is the one move in the whole method that changes which side is larger.
          </span>
        ) : (
          "Divide both sides by the number in front of the variable, and decide what that does to the direction of the sign."
        )}
      </p>
    </div>
  );
}
