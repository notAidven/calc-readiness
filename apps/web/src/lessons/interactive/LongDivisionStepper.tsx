/**
 * POL.8 slide 1: supply the multiplier at each step of a long division.
 *
 * Watching a long division does not teach it, because the only decision in the whole method is
 * the one a demonstration makes fastest: what does the divisor have to be multiplied by to
 * produce the leading term still standing. So the board runs the division and stops at exactly
 * that decision, twice, and does the bookkeeping either side of it.
 *
 * The two steps are judged separately (R28) and the second one is where the sign goes: a
 * learner who gets the first multiplier and then subtracts a product with its signs unchanged
 * has made the error the next slide is about, and one verdict over the board would hide which
 * of the two happened.
 *
 * Both steps are live at once rather than the second waiting on the first, because the second
 * multiplier is readable off the dividend's own constant term and a learner who has it should
 * not be held on a row they missed. Answering is what that means: the EXPLANATION is offered
 * for one row at a time, because the shared fill flag carries no row with it and a passage
 * about one step beside a filled blank of the other is the defect the fill exists to fix.
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
  /** Dividend $= (x + d)(a x + b)$, divided by $x + d$. */
  d: number;
  a: number;
  b: number;
}

/** Neither board is the slide's own $x^{2} + 7x + 10$ divided by $x + 2$. */
const BOARDS: readonly Board[] = [
  { d: 4, a: 3, b: 2 },
  { d: 3, a: 2, b: 5 },
];

type Verdict = "right" | "wrong";

export function LongDivisionStepper(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LongDivisionStepperBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LongDivisionStepperBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { d, a, b } = board;
  const middle = a * d + b;
  const dividend = `${a}x^{2} + ${middle}x + ${b * d}`;
  const divisor = `x + ${d}`;
  /** After subtracting `a x` times the divisor, what is left is `b x + b d`. */
  const afterFirst = `${b}x + ${b * d}`;

  const [firstEntry, setFirstEntry] = useState("");
  const [secondEntry, setSecondEntry] = useState("");
  const [firstVerdict, setFirstVerdict] = useState<Verdict | null>(null);
  const [secondVerdict, setSecondVerdict] = useState<Verdict | null>(null);
  const [firstDone, setFirstDone] = useState(false);
  const [secondDone, setSecondDone] = useState(false);
  const [revealed, setRevealed] = useState<"first" | "second" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const settled = firstDone && secondDone;
  const clean = firstVerdict === "right" && secondVerdict === "right";

  /**
   * The row whose explanation is on offer, and therefore the row a passage on screen is about.
   *
   * Read off the board rather than off a `revealed` flag of the widget's own: the shared layer
   * runs a widget's `onReveal` only on the reveal that lets the learner PAST, never on the one
   * that re-asks, so a flag set there is false over exactly the window the fill is shown in.
   *
   * ONE expression decides which reveal is offered and which blank the fill writes into, so
   * the two cannot disagree. Derived from `firstDone` alone they did: a learner who left the
   * first step untouched and missed the second was offered the second step's explanation and
   * handed the FIRST step's answer, because an untouched row is not a done one. That is a
   * passage teaching one multiplier over a blank filled with the other, and it hands over an
   * answer to a step the learner was never told about.
   */
  const openRow: "first" | "second" | null =
    firstVerdict !== null && !firstDone
      ? "first"
      : secondVerdict !== null && !secondDone
        ? "second"
        : null;
  const givenRow = fill.given ? openRow : null;

  function maybeOpen(nextFirst: boolean, nextSecond: boolean) {
    if (nextFirst && nextSecond && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function checkFirst() {
    if (firstDone) {
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss: the note under the row
    // says so rather than talking about clearing the leading term, which would answer a
    // question the learner did not ask.
    const read = readNumericEntry(firstEntry, "integer");
    if (read.ok && read.value === a) {
      setFirstVerdict("right");
      setFirstDone(true);
      success();
      maybeOpen(true, secondDone);
      return;
    }
    setFirstVerdict("wrong");
  }

  function checkSecond() {
    if (secondDone) {
      return;
    }
    const read = readNumericEntry(secondEntry, "integer");
    if (read.ok && read.value === b) {
      setSecondVerdict("right");
      setSecondDone(true);
      success();
      maybeOpen(firstDone, true);
      return;
    }
    setSecondVerdict("wrong");
  }

  function revealFirst() {
    setFirstEntry(String(a));
    setRevealed("first");
    setFirstVerdict("wrong");
    setFirstDone(true);
    maybeOpen(true, secondDone);
  }

  function revealSecond() {
    setSecondEntry(String(b));
    setRevealed("second");
    setSecondVerdict("wrong");
    setSecondDone(true);
    maybeOpen(firstDone, true);
  }

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: supply the multiplier at each step, so that every step clears the leading term
        that is still standing and the division runs out.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={`(${dividend}) \\div (${divisor})`} color={LABEL} />
      </p>

      <div className="lesson-equation">
        <div data-part-row="first step">
          <div className="lesson-equation__row" data-state={firstDone ? "done" : "open"}>
            <span className="lesson-equation__stage">first step</span>
            <span className="lesson-equation__body">
              <InlineMath
                latex={`(${divisor}) \\times`}
                color={firstDone ? CIVIC : LABEL}
              />
              <input
                className="lesson-equation__slot"
                {...numericEntryProps("integer")}
                value={firstEntry}
                readOnly={firstDone}
                aria-label={partName(
                  "How many x the divisor is multiplied by",
                  firstVerdict,
                )}
                onChange={(event) => setFirstEntry(event.target.value)}
                {...(givenRow === "first" ? fill.entry(a) : {})}
              />
              <InlineMath latex="x" color={firstDone ? CIVIC : LABEL} />
              {firstDone ? (
                <InlineMath latex={`= ${a}x^{2} + ${a * d}x`} color={CIVIC} />
              ) : null}
            </span>
            <span className="lesson-equation__aside">
              {firstVerdict ? <WidgetPartVerdict verdict={firstVerdict} /> : null}
              {firstDone ? null : (
                <button
                  type="button"
                  className="lesson-interactive__check lesson-interactive__check--part"
                  onClick={checkFirst}
                >
                  Check
                </button>
              )}
            </span>
          </div>
          {firstVerdict === "wrong" && !fill.given ? (
            <WidgetPartNote>
              {readNumericEntry(firstEntry, "integer").ok ? (
                <>
                  The step is chosen to clear the leading term, so the question is what{" "}
                  <InlineMath latex="x" /> has to be multiplied by to reach{" "}
                  <InlineMath latex={`${a}x^{2}`} />. Nothing else on the line is consulted.
                </>
              ) : (
                WHOLE_NUMBER_MISS
              )}
            </WidgetPartNote>
          ) : null}
        </div>

        {firstDone ? (
          <p className="lesson-equation__naming">
            <InlineMath
              latex={`(${dividend}) - (${a}x^{2} + ${a * d}x) = ${afterFirst}`}
              color={LABEL}
            />
          </p>
        ) : null}

        <div data-part-row="second step">
          <div className="lesson-equation__row" data-state={secondDone ? "done" : "open"}>
            <span className="lesson-equation__stage">second step</span>
            <span className="lesson-equation__body">
              <InlineMath
                latex={`(${divisor}) \\times`}
                color={secondDone ? CIVIC : LABEL}
              />
              <input
                className="lesson-equation__slot"
                {...numericEntryProps("integer")}
                value={secondEntry}
                readOnly={secondDone}
                aria-label={partName(
                  "What the divisor is multiplied by next",
                  secondVerdict,
                )}
                onChange={(event) => setSecondEntry(event.target.value)}
                {...(givenRow === "second" ? fill.entry(b) : {})}
              />
              {secondDone ? (
                <InlineMath latex={`= ${b}x + ${b * d}`} color={CIVIC} />
              ) : null}
            </span>
            <span className="lesson-equation__aside">
              {secondVerdict ? <WidgetPartVerdict verdict={secondVerdict} /> : null}
              {secondDone ? null : (
                <button
                  type="button"
                  className="lesson-interactive__check lesson-interactive__check--part"
                  onClick={checkSecond}
                >
                  Check
                </button>
              )}
            </span>
          </div>
          {secondVerdict === "wrong" && !fill.given ? (
            <WidgetPartNote>
              {readNumericEntry(secondEntry, "integer").ok ? (
                <>
                  What is left after the first subtraction is{" "}
                  <InlineMath latex={afterFirst} />, so the leading term to clear is now{" "}
                  <InlineMath latex={`${b}x`} /> rather than the one the division started
                  with.
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
          Start over with a different division
        </button>
      ) : null}

      <WidgetReveal
        available={openRow === "first"}
        revealed={revealed === "first"}
        answer={<InlineMath latex={`${a}x`} />}
        why={
          <>
            The leading term of the dividend is <InlineMath latex={`${a}x^{2}`} /> and the
            leading term of the divisor is <InlineMath latex="x" />, so the multiplier is{" "}
            <InlineMath latex={`${a}x`} />. Multiplying the whole divisor by it gives{" "}
            <InlineMath latex={`${a}x^{2} + ${a * d}x`} />, and subtracting that clears the
            squared term.
          </>
        }
        onReveal={revealFirst}
        othersRemain={!secondDone}
        label="Reveal the first multiplier"
      />

      <WidgetReveal
        available={openRow === "second"}
        revealed={revealed === "second"}
        answer={<InlineMath latex={`${b}`} />}
        why={
          <>
            After the first subtraction the line reads <InlineMath latex={afterFirst} />,
            whose leading term is <InlineMath latex={`${b}x`} />. Multiplying{" "}
            <InlineMath latex="x" /> by <InlineMath latex={`${b}`} /> reaches it, and{" "}
            <InlineMath latex={`(${divisor}) \\times ${b} = ${b}x + ${b * d}`} /> takes the
            line to nothing.
          </>
        }
        onReveal={revealSecond}
        othersRemain={!firstDone}
        label="Reveal the second multiplier"
      />

      <p
        className="lesson-interactive__status"
        data-state={settled && clean ? "solved" : settled ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : settled ? (
          <>
            The multipliers were <InlineMath latex={`${a}x`} color={CIVIC} /> and{" "}
            <InlineMath latex={`${b}`} color={CIVIC} />, so the quotient is{" "}
            <InlineMath latex={`${a}x + ${b}`} color={CIVIC} /> with nothing left over. Each
            step cleared exactly one leading term, which is why there were two of them and
            not more. Any row you missed has a note under it.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Each step is checked on its own, and the second one runs on what the first left
            behind.
          </span>
        )}
      </p>
    </div>
  );
}
