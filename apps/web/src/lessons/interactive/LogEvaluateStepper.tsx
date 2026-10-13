import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/**
 * EL.3 slide 2: evaluating a logarithm by climbing the base's own powers, and then reading the
 * SAME ladder the other way.
 *
 * The rungs print the running product and nothing else. That is the point: the exponent is how
 * many factors are on the ladder, so it is something the learner counts rather than something
 * the widget prints for them, and a ladder that labelled its rungs `b^{1}`, `b^{2}` would be
 * handing over both answers below.
 *
 * THE BOARD THEREFORE CARRIES NO RUNNING COUNT EITHER, and that is the same rule rather than a
 * second one. A line under the rungs reading "4 factors on the ladder" was the sentence above
 * defeated by a different means: the learner climbs until a rung reads $256$, and at that
 * moment the line prints the answer to `\log_{4} 256` an inch above the box asking for it.
 * Labelling the rungs was rejected and the count was printed anyway, which is why the rule is
 * written here as a property of the BOARD and not of the rung labels.
 *
 * Two answers, one gate. Stage one is the logarithm's value, which is the exponent. Stage two
 * hands the exponent over and asks for the ARGUMENT, which is the conversion the node's harder
 * practice turns on, and it is answered off the ladder already built rather than a fresh one.
 */

interface Board {
  base: number;
  /** The argument of the logarithm in stage one, an exact power of the base. */
  target: number;
  /** Its exponent, and so stage one's answer. */
  exponent: number;
  /** The exponent stage two hands over, always below `exponent`. */
  given: number;
  /** The argument that exponent reaches, and so stage two's answer. */
  argument: number;
}

const BOARDS: readonly Board[] = [
  { base: 4, target: 256, exponent: 4, given: 2, argument: 16 },
  { base: 3, target: 243, exponent: 5, given: 3, argument: 27 },
];

export function LogEvaluateStepper(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LogEvaluateStepperBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LogEvaluateStepperBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** How many factors of the base are on the ladder. */
  const [factors, setFactors] = useState(0);
  /** 0 asks for the exponent, 1 asks for the argument, 2 is finished. */
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage === 2;
  const wanted = stage === 0 ? board.exponent : board.argument;
  /** The running products on the ladder, one per factor applied. */
  const rungs = Array.from({ length: factors }, (_, at) => board.base ** (at + 1));
  const reached = rungs.includes(board.target);

  function advance(earned: boolean) {
    setFeedback(null);
    setEntry("");
    setAttempted(false);
    setRevealed(false);
    if (earned) {
      success();
    }
    if (stage === 0) {
      setStage(1);
      return;
    }
    setStage(2);
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Enter a number.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about counting rungs, which would answer a question the learner
    // did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === wanted) {
      advance(true);
      return;
    }
    setFeedback(
      stage === 0
        ? `Not that one. The value of the logarithm is how many factors of ${board.base} the ladder needed, so climb until a rung reads ${board.target} and count the rungs.`
        : `Not that one. The exponent given is how many factors to apply, so read off the rung that many steps up the ladder.`,
    );
  }

  function reveal() {
    setEntry(String(wanted));
    setRevealed(true);
    // Stage two is still owed, so `advance` moves on to it rather than opening the gate. The
    // reveal is not credited, which is what the `false` is for.
    advance(false);
  }

  const rowY = 92;
  const left = 46;
  const span = 66;

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: climb the powers of <InlineMath latex={String(board.base)} /> one factor at a
        time, and use the ladder to give both the value of{" "}
        <InlineMath latex={`\\log_{${board.base}} ${board.target}`} /> and the number{" "}
        <InlineMath latex={`\\log_{${board.base}} y = ${board.given}`} /> is talking about.
      </WidgetTask>

      <svg
        viewBox="0 0 440 148"
        role="img"
        aria-label={`A ladder of the powers of ${board.base}, currently reading ${
          rungs.length === 0 ? "nothing" : rungs.join(", ")
        }`}
      >
        <title>The powers of the base, one factor at a time</title>

        <SvgMath
          latex={
            stage === 0
              ? `\\log_{${board.base}} ${board.target} = \\;?`
              : `\\log_{${board.base}} y = ${board.given}`
          }
          x={220}
          y={26}
          fontSize={19}
          color={stage === 0 ? LABEL : SIGNAL}
          w={420}
        />

        <line x1={30} y1={48} x2={410} y2={48} stroke={LINE} strokeWidth={1} />

        {rungs.length === 0 ? (
          <text x={220} y={rowY} textAnchor="middle" fontSize={11} fill={SOFT}>
            no factors applied yet
          </text>
        ) : (
          rungs.map((rung, at) => (
            <SvgMath
              key={`rung-${rung}`}
              latex={String(rung)}
              x={left + at * span}
              y={rowY}
              fontSize={17}
              color={rung === board.target ? CIVIC : LABEL}
              w={span - 6}
            />
          ))
        )}

        {rungs.slice(1).map((rung, at) => {
          // Each rung after the first is REACHED by multiplying, so every gap carries an arc
          // with its head oriented along the tangent. The rise is deliberately shallow: the
          // label above the arc still has to clear the divider at y 48, and its ink at font
          // size 12 spans 14px, while the endpoints stay above the rung ink starting at 82.5.
          const from = left + at * span;
          const to = left + (at + 1) * span;
          const mid = (from + to) / 2;
          const tipX = to - 16;
          const tipY = rowY - 11;
          const apexY = rowY - 22;
          const dx = tipX - mid;
          const dy = tipY - apexY;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const size = 6;
          const bx = tipX - ux * size;
          const by = tipY - uy * size;
          const px = -uy * (size * 0.55);
          const py = ux * (size * 0.55);
          return (
            <g key={`arc-${rung}`}>
              <path
                data-ladder-arc=""
                d={`M ${from + 16} ${tipY} Q ${mid} ${apexY} ${tipX} ${tipY}`}
                fill="none"
                stroke={SOFT}
                strokeWidth={1.4}
              />
              <path
                data-ladder-arrowhead=""
                d={`M ${tipX} ${tipY} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`}
                fill={SOFT}
              />
              <SvgMath
                latex={`\\times ${board.base}`}
                x={mid}
                y={rowY - 32}
                fontSize={12}
                color={SOFT}
                w={span}
              />
            </g>
          );
        })}
      </svg>

      <div className="lesson-interactive__controls">
        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different base
          </button>
        ) : (
          <>
            <button
              type="button"
              className="lesson-interactive__step"
              aria-label={`Apply one more factor of ${board.base}`}
              onClick={() => {
                setFactors((prev) => prev + 1);
                setFeedback(null);
              }}
            >
              Apply one more factor of <InlineMath latex={String(board.base)} />
            </button>
            <button
              type="button"
              className="lesson-interactive__step"
              disabled={factors === 0}
              onClick={() => {
                setFactors(0);
                setFeedback(null);
              }}
            >
              Clear the ladder
            </button>
          </>
        )}
      </div>

      {solved ? null : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              {stage === 0 ? (
                <InlineMath latex={`\\log_{${board.base}} ${board.target} =`} />
              ) : (
                <InlineMath latex="y =" />
              )}
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={
                stage === 0
                  ? `The value of log base ${board.base} of ${board.target}`
                  : "The number y stands for"
              }
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  check();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={String(wanted)} />}
        why={
          stage === 0 ? (
            <>
              The ladder reaches <InlineMath latex={String(board.target)} /> after{" "}
              <InlineMath latex={String(board.exponent)} /> factors of{" "}
              <InlineMath latex={String(board.base)} />, so{" "}
              <InlineMath latex={`${board.base}^{${board.exponent}} = ${board.target}`} />{" "}
              and the logarithm hands that exponent back. It is the COUNT of factors that
              answers a logarithm, never the size of the rung you stopped on.
            </>
          ) : (
            <>
              <InlineMath latex={`\\log_{${board.base}} y = ${board.given}`} /> says{" "}
              <InlineMath latex={`${board.base}^{${board.given}} = y`} />, so{" "}
              <InlineMath latex="y" /> is the rung{" "}
              <InlineMath latex={String(board.given)} /> factors up:{" "}
              <InlineMath latex={String(board.argument)} />. Converting to the exponential
              form first is what turns a missing argument into a power to evaluate.
            </>
          )
        }
        onReveal={reveal}
        // Stage one still owes stage two, so the board is worth handing back; stage two is the
        // gate, and handing that back would hand the gate over.
        othersRemain={stage === 0}
        label={stage === 0 ? "Reveal the value" : "Reveal what y stands for"}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed && !solved ? null : solved ? (
          <>
            <InlineMath
              latex={`\\log_{${board.base}} ${board.target} = ${board.exponent}`}
            />{" "}
            and <InlineMath latex={`\\log_{${board.base}} y = ${board.given}`} /> gives{" "}
            <InlineMath latex={`y = ${board.argument}`} />. One ladder answered both,
            because both questions are the same statement with a different number missing.
          </>
        ) : feedback ? (
          feedback
        ) : stage === 1 ? (
          "Same ladder, other direction: the exponent is given and the number inside the logarithm is what is missing."
        ) : reached ? (
          "A rung now reads the number inside the logarithm. Count the factors it took."
        ) : (
          "Apply factors until a rung reads the number inside the logarithm."
        )}
      </p>
    </div>
  );
}
