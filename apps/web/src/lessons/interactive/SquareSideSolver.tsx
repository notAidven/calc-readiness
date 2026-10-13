/**
 * POL.3 slide 0: produce both solutions of a bare square, not just the one that measures ground.
 *
 * The defect this board is built around is losing the negative solution, and a widget that asks
 * for "the answer" cannot detect it: a learner who types the positive root has satisfied a
 * single field. So there are two boxes, judged separately (R28), and the second one is the
 * whole point. Getting the positive root and missing the negative is a partly right answer and
 * the board says so, which is exactly the distinction one verdict would erase.
 *
 * The boxes are order-free: either root may be typed in either of them, because insisting on an
 * order would mark a right answer wrong for a convention nobody stated.
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

/** The side length whose square the board asks about. Neither is the slide's own 13. */
const SIDES: readonly number[] = [11, 15];

type Verdict = "right" | "wrong";

export function SquareSideSolver(props: LessonWidgetProps) {
  const variant = useWidgetVariants(SIDES.length, props);
  const side = SIDES[variant.index] ?? (SIDES[0] as number);
  return (
    <SquareSideSolverBody
      key={variant.nonce}
      side={side}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function SquareSideSolverBody({
  side,
  onSolved,
  onRestart,
}: {
  side: number;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const area = side * side;
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
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
   * The part a passage on screen is about, which is the one still in hand.
   *
   * Read off the board rather than off a `revealed` flag of the widget's own: the shared layer
   * runs a widget's `onReveal` only on the reveal that lets the learner PAST, never on the one
   * that re-asks, so a flag set there is false over exactly the window the fill is shown in.
   */
  const givenRow = fill.given ? (firstDone ? "second" : "first") : null;

  /** Whichever root the OTHER box has already taken, so neither may be given twice. */
  const takenByFirst = firstDone ? Number(first.trim()) : null;
  const takenBySecond = secondDone ? Number(second.trim()) : null;

  function maybeOpen(nextFirst: boolean, nextSecond: boolean) {
    if (nextFirst && nextSecond && !gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function accepts(typed: string, taken: number | null): boolean {
    // Plain entry takes anything, so the box is read before it is squared: a non-number is a
    // miss the note under the row names, not a NaN reaching the comparison.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      return false;
    }
    return read.value * read.value === area && read.value !== taken;
  }

  function checkFirst() {
    if (firstDone) {
      return;
    }
    if (accepts(first, takenBySecond)) {
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
    if (accepts(second, takenByFirst)) {
      setSecondVerdict("right");
      setSecondDone(true);
      success();
      maybeOpen(firstDone, true);
      return;
    }
    setSecondVerdict("wrong");
  }

  /** The root a reveal supplies: whichever one the other box has not already taken. */
  const remainingFor = (taken: number | null): number => (taken === side ? -side : side);

  function revealFirst() {
    setFirst(String(remainingFor(takenBySecond)));
    setRevealed("first");
    setFirstVerdict("wrong");
    setFirstDone(true);
    maybeOpen(true, secondDone);
  }

  function revealSecond() {
    setSecond(String(remainingFor(takenByFirst)));
    setRevealed("second");
    setSecondVerdict("wrong");
    setSecondDone(true);
    maybeOpen(firstDone, true);
  }

  return (
    <div className="lesson-interactive lesson-interactive--solver">
      <WidgetTask>
        Goal: give every value of <InlineMath latex="x" /> that satisfies this equation, in
        either order, and not only the one that could measure a court.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={`x^{2} = ${area}`} color={LABEL} />
      </p>

      <div className="lesson-equation">
        <div data-part-row="first solution">
          <div className="lesson-equation__row" data-state={firstDone ? "done" : "open"}>
            <span className="lesson-equation__stage">one solution</span>
            <span className="lesson-equation__body">
              <InlineMath latex="x =" color={firstDone ? CIVIC : LABEL} />
              <input
                className="lesson-equation__slot"
                {...numericEntryProps("integer")}
                value={first}
                readOnly={firstDone}
                aria-label={partName("One solution of the equation", firstVerdict)}
                onChange={(event) => setFirst(event.target.value)}
                {...(givenRow === "first" ? fill.entry(remainingFor(takenBySecond)) : {})}
              />
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
              {readNumericEntry(first, "integer").ok ? (
                <>
                  A solution has to satisfy <InlineMath latex={`x \\cdot x = ${area}`} />,
                  and the two boxes are asking for different values.
                </>
              ) : (
                WHOLE_NUMBER_MISS
              )}
            </WidgetPartNote>
          ) : null}
        </div>

        <div data-part-row="second solution">
          <div className="lesson-equation__row" data-state={secondDone ? "done" : "open"}>
            <span className="lesson-equation__stage">the other</span>
            <span className="lesson-equation__body">
              <InlineMath latex="x =" color={secondDone ? CIVIC : LABEL} />
              <input
                className="lesson-equation__slot"
                {...numericEntryProps("integer")}
                value={second}
                readOnly={secondDone}
                aria-label={partName("The other solution of the equation", secondVerdict)}
                onChange={(event) => setSecond(event.target.value)}
                {...(givenRow === "second" ? fill.entry(remainingFor(takenByFirst)) : {})}
              />
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
              {readNumericEntry(second, "integer").ok ? (
                <>
                  A negative multiplied by itself is positive, so a negative value can
                  satisfy this equation just as a positive one can.
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
          Start over with a different court
        </button>
      ) : null}

      <WidgetReveal
        available={firstVerdict !== null && !firstDone}
        revealed={revealed === "first"}
        answer={<InlineMath latex={`x = ${remainingFor(takenBySecond)}`} />}
        why={
          <>
            Undoing a square means taking a square root, and{" "}
            <InlineMath latex={`${side} \\cdot ${side} = ${area}`} />. The equation has a
            second solution as well, because a negative multiplied by itself lands on the
            same positive number.
          </>
        }
        onReveal={revealFirst}
        othersRemain={!secondDone}
        label="Reveal one solution"
      />

      <WidgetReveal
        available={firstDone && secondVerdict !== null && !secondDone}
        revealed={revealed === "second"}
        answer={<InlineMath latex={`x = ${remainingFor(takenByFirst)}`} />}
        why={
          <>
            <InlineMath latex={`(-${side}) \\cdot (-${side}) = ${area}`} /> as well, because
            multiplying two negatives gives a positive. Keeping both signs when a square
            root is taken is the square-root property, and it is the step where half an
            answer usually goes missing.
          </>
        }
        onReveal={revealSecond}
        othersRemain={!firstDone}
        label="Reveal the other solution"
      />

      <p
        className="lesson-interactive__status"
        data-state={settled && clean ? "solved" : settled ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {fill.given ? null : settled ? (
          <>
            <InlineMath latex={`x^{2} = ${area}`} /> is satisfied by{" "}
            <InlineMath latex={`${side}`} color={CIVIC} /> and{" "}
            <InlineMath latex={`-${side}`} color={CIVIC} />. Only one of them measures a
            court, and both of them solve the equation, which are two different questions.
          </>
        ) : (
          <span style={{ color: SOFT }}>
            Each box is checked on its own, and the two are asking for different values.
          </span>
        )}
      </p>
    </div>
  );
}
