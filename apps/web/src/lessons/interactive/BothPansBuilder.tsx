/**
 * LIN.1 slide 2: gathering the variable terms, then finishing.
 *
 * Two answers, judged separately, because they are separately winnable: how many ingots are
 * left once the smaller pile has come off both pans is one subtraction, and what one of them
 * weighs is two further moves on top of it. A learner who gathers correctly and then slips on
 * the arithmetic has done the thing this slide teaches, and one verdict covering both boxes
 * would tell them otherwise.
 *
 * The gathered count is asked for before the solution and is not derivable from it, so the
 * board cannot be finished from the answer backwards: on the first board five ingots are left
 * and one weighs three, and neither number is a function of the other without the equation.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, SOFT } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { partName, WidgetPartNote, WidgetPartVerdict } from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  given: string;
  /** Ingots on each pan, and the plain numbers beside them. */
  leftCount: number;
  rightCount: number;
  leftLoose: number;
  rightLoose: number;
  /** Ingots left once the smaller pile comes off both pans. */
  gathered: number;
  /** What one ingot weighs. */
  answer: number;
}

function board(
  given: string,
  leftCount: number,
  leftLoose: number,
  rightCount: number,
  rightLoose: number,
): Board {
  const gathered = leftCount - rightCount;
  return {
    given,
    leftCount,
    rightCount,
    leftLoose,
    rightLoose,
    gathered,
    answer: (rightLoose - leftLoose) / gathered,
  };
}

/**
 * Neither board is the paragraph's $5x - 3 = 2x + 12$ nor the CFU's $4x - 5 = x + 16$, and on
 * neither one does the gathered count equal the solution, so a learner cannot fill the second
 * box by copying the first.
 */
const BOARDS: readonly Board[] = [
  board("7x - 4 = 2x + 11", 7, -4, 2, 11),
  board("6x + 5 = 2x + 29", 6, 5, 2, 29),
];

type Verdict = "right" | "wrong";

export function BothPansBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const current = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <BothPansBuilderBody
      key={variant.nonce}
      board={current}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function BothPansBuilderBody({
  board: current,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [gatheredEntry, setGatheredEntry] = useState("");
  const [answerEntry, setAnswerEntry] = useState("");
  const [gatheredVerdict, setGatheredVerdict] = useState<Verdict | null>(null);
  const [answerVerdict, setAnswerVerdict] = useState<Verdict | null>(null);
  const [gatheredDone, setGatheredDone] = useState(false);
  const [answerDone, setAnswerDone] = useState(false);
  const [revealed, setRevealed] = useState<"gathered" | "answer" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const settled = gatheredDone && answerDone;

  /**
   * Which row's explanation is on offer, and so which row a reveal is about.
   *
   * Both rows are on screen from the start, and the shared fill flag carries no row with it,
   * so a row that spreads the fill unconditionally takes it whichever row was explained. Both
   * of them did, and a learner revealing how the ingots GATHER was handed the finished weight
   * in the row underneath as well: the answer they were one step from producing.
   *
   * The two expressions below are the two reveals' own `available` conditions, written once
   * so that the row the passage is about and the row the board fills cannot come apart. The
   * order matters and is the reveals' own: the second is only ever offered once the first is
   * settled.
   */
  const openRow: "gathered" | "answer" | null =
    gatheredVerdict !== null && !gatheredDone
      ? "gathered"
      : gatheredDone && answerVerdict !== null && !answerDone
        ? "answer"
        : null;
  const givenRow = fill.given ? openRow : null;

  /**
   * Whether anything on this board was got wrong or handed over.
   *
   * A part latches on the verdict it FINISHES with, so a learner who slipped and then corrected
   * it leaves `right` behind and is not carrying a miss; a part finished by its reveal latches
   * `wrong`, which is how a handed-over answer stays visible here. This used to read
   * `settled && !called`, with `called` meaning both parts have a verdict — which `settled`
   * already implies on every path, so the solved state was unreachable and a perfect board
   * printed its conclusion in the prompt colour. `perfectBoardStatus.browser.test.tsx` plays
   * both sides of it.
   */
  const missed = gatheredVerdict === "wrong" || answerVerdict === "wrong";
  const stripped = `${current.gathered}x ${current.leftLoose < 0 ? "-" : "+"} ${Math.abs(current.leftLoose)} = ${current.rightLoose}`;
  const isolated = `${current.gathered}x = ${current.rightLoose - current.leftLoose}`;

  /** Both parts CALLED opens the gate, whether or not both were right first time (R29). */
  function maybeOpen(nextGathered: boolean, nextAnswer: boolean) {
    if (nextGathered && nextAnswer && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function checkGathered() {
    if (gatheredDone) {
      return;
    }
    const typed = gatheredEntry.trim();
    if (typed === "") {
      setGatheredVerdict("wrong");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss: the note under the row
    // says so rather than lecturing about the pans, which would answer a question the
    // learner did not ask.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setGatheredVerdict("wrong");
      return;
    }
    if (read.value === current.gathered) {
      setGatheredVerdict("right");
      setGatheredDone(true);
      success();
      maybeOpen(true, answerDone);
      return;
    }
    setGatheredVerdict("wrong");
  }

  function checkAnswer() {
    if (answerDone) {
      return;
    }
    const typed = answerEntry.trim();
    if (typed === "") {
      setAnswerVerdict("wrong");
      return;
    }
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setAnswerVerdict("wrong");
      return;
    }
    if (read.value === current.answer) {
      setAnswerVerdict("right");
      setAnswerDone(true);
      success();
      maybeOpen(gatheredDone, true);
      return;
    }
    setAnswerVerdict("wrong");
  }

  function revealGathered() {
    setGatheredEntry(String(current.gathered));
    setRevealed("gathered");
    setGatheredVerdict("wrong");
    setGatheredDone(true);
    maybeOpen(true, answerDone);
  }

  function revealAnswer() {
    setAnswerEntry(String(current.answer));
    setRevealed("answer");
    setAnswerVerdict("wrong");
    setAnswerDone(true);
    maybeOpen(gatheredDone, true);
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: gather the ingots onto one pan and finish the weighing. Enter how many ingots
        are left on that pan, then what one of them weighs.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={current.given} color={LABEL} />
      </p>

      <div className="lesson-equation">
        {/* `data-part-row` names each part for the shared part-verdict guard, and wraps the row
            together with the note under it, which is what makes that note the part's own rather
            than the board's. */}
        <div data-part-row="ingots left">
          <div className="lesson-equation__row" data-state={gatheredDone ? "done" : "open"}>
            <span className="lesson-equation__stage">ingots left</span>
            <span className="lesson-equation__body">
              <input
                className="lesson-equation__slot"
                {...numericEntryProps("integer")}
                value={gatheredEntry}
                readOnly={gatheredDone}
                aria-label={partName("Ingots left on one pan", gatheredVerdict)}
                onChange={(event) => setGatheredEntry(event.target.value)}
                {...(givenRow === "gathered" ? fill.entry(current.gathered) : {})}
              />
              <InlineMath latex="x" color={gatheredDone ? CIVIC : LABEL} />
            </span>
            <span className="lesson-equation__aside">
              {gatheredVerdict ? <WidgetPartVerdict verdict={gatheredVerdict} /> : null}
              {gatheredDone ? null : (
                <button
                  type="button"
                  className="lesson-interactive__check lesson-interactive__check--part"
                  onClick={checkGathered}
                >
                  Check
                </button>
              )}
            </span>
          </div>
          {gatheredVerdict === "wrong" && !fill.given ? (
            <WidgetPartNote>
              {readNumericEntry(gatheredEntry, "integer").ok ? (
                <>
                  Both pans carry ingots, so take the smaller pile off each of them. The
                  left pan started with <InlineMath latex={String(current.leftCount)} /> and
                  the right with <InlineMath latex={String(current.rightCount)} />.
                </>
              ) : (
                WHOLE_NUMBER_MISS
              )}
            </WidgetPartNote>
          ) : null}
        </div>

        <div data-part-row="one ingot">
          <div className="lesson-equation__row" data-state={answerDone ? "done" : "open"}>
            <span className="lesson-equation__stage">one ingot</span>
            <span className="lesson-equation__body">
              <InlineMath latex="x =" color={answerDone ? CIVIC : LABEL} />
              <input
                className="lesson-equation__slot"
                {...numericEntryProps("integer")}
                value={answerEntry}
                readOnly={answerDone}
                aria-label={partName("What one ingot weighs", answerVerdict)}
                onChange={(event) => setAnswerEntry(event.target.value)}
                {...(givenRow === "answer" ? fill.entry(current.answer) : {})}
              />
            </span>
            <span className="lesson-equation__aside">
              {answerVerdict ? <WidgetPartVerdict verdict={answerVerdict} /> : null}
              {answerDone ? null : (
                <button
                  type="button"
                  className="lesson-interactive__check lesson-interactive__check--part"
                  onClick={checkAnswer}
                >
                  Check
                </button>
              )}
            </span>
          </div>
          {answerVerdict === "wrong" && !fill.given ? (
            <WidgetPartNote>
              {readNumericEntry(answerEntry, "integer").ok ? (
                <>
                  With the ingots gathered the equation reads{" "}
                  <InlineMath latex={stripped} />. The plain number beside them comes off
                  both pans next, and the coefficient is divided away after that.
                </>
              ) : (
                WHOLE_NUMBER_MISS
              )}
            </WidgetPartNote>
          ) : null}
        </div>
      </div>

      {settled ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different weighing
        </button>
      ) : null}

      <WidgetReveal
        available={gatheredVerdict !== null && !gatheredDone}
        revealed={revealed === "gathered"}
        answer={<InlineMath latex={`${current.gathered}x`} />}
        why={
          <>
            Lifting <InlineMath latex={String(current.rightCount)} /> ingots off both pans
            clears the right pan of them completely and leaves{" "}
            <InlineMath latex={`${current.leftCount} - ${current.rightCount}`} /> on the
            left, so the equation becomes <InlineMath latex={stripped} />. The beam stays
            level because the same pile came off each side.
          </>
        }
        onReveal={revealGathered}
        othersRemain={!answerDone}
        label="Reveal the gathered count"
      />

      <WidgetReveal
        available={gatheredDone && answerVerdict !== null && !answerDone}
        revealed={revealed === "answer"}
        answer={<InlineMath latex={`x = ${current.answer}`} />}
        why={
          <>
            From <InlineMath latex={stripped} />, moving the plain number across gives{" "}
            <InlineMath latex={isolated} />. Dividing both pans by{" "}
            <InlineMath latex={String(current.gathered)} /> then splits that weight between
            the ingots and leaves <InlineMath latex={`x = ${current.answer}`} />.
          </>
        }
        onReveal={revealAnswer}
        othersRemain={!gatheredDone}
        label="Reveal the ingot weight"
      />

      <p
        className="lesson-interactive__status"
        data-state={settled && !missed ? "solved" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : settled ? (
          <>
            <InlineMath latex={current.given} /> gathers to <InlineMath latex={isolated} />{" "}
            and finishes at <InlineMath latex={`x = ${current.answer}`} />. Anything you
            missed on the way has a note under the row it belongs to, and the working is
            there if you want it.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Each row is checked on its own, so getting one of them settles it whatever
            happens to the other.
          </span>
        )}
      </p>
    </div>
  );
}
