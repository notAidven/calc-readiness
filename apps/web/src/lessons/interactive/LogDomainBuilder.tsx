/**
 * EL.4 slide 3: writing the domain down, in the notation practice asks for.
 *
 * Two parts of one answer, judged together: which way the inequality points, and the value it
 * turns on. Separating them is what makes the reflected argument a real question. A learner who
 * solves `h - x > 0` by moving `x` without turning the sign round gets the boundary right and
 * the direction wrong, and a widget that graded the number alone would call that correct.
 *
 * The four direction chips include both non-strict signs, because "strictly positive" is the
 * whole of why the boundary is excluded, and a board offering only `<` and `>` would never ask
 * about it. They are dealt in an order whose FIRST chip answers neither board.
 *
 * The figure states the rule (`argument > 0`) and stops there. Printing this instance's
 * argument condition would have handed over the step the learner is here to take.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL_DEEP, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/** The directions on offer. The first one answers neither board, by construction. */
const SIGNS = [
  { latex: "\\le", spoken: "less than or equal to" },
  { latex: "<", spoken: "less than" },
  { latex: "\\ge", spoken: "greater than or equal to" },
  { latex: ">", spoken: "greater than" },
] as const;

interface Board {
  /** The function, as the learner reads it. */
  argument: string;
  token: string;
  /** The correct direction, as one of `SIGNS`. */
  sign: string;
  /** The value the inequality turns on. */
  boundary: number;
  /** The step that isolates `x`, for the reveal. */
  step: string;
}

/**
 * One reflected argument and one ordinary one, so the direction cannot be guessed from the
 * shape of the question. Neither reuses the shifted logarithm on the slide before it, and
 * neither is the CFU's.
 */
const BOARDS: readonly Board[] = [
  {
    argument: "7 - x",
    token: "\\log",
    sign: "<",
    boundary: 7,
    step: "7 > x",
  },
  {
    argument: "x + 5",
    token: "\\ln",
    sign: ">",
    boundary: -5,
    step: "x > -5",
  },
];

export function LogDomainBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LogDomainBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LogDomainBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [sign, setSign] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const equation = `y = ${board.token}(${board.argument})`;
  const answerSet = `\\{\\, x \\mid x ${board.sign} ${board.boundary} \\,\\}`;

  /** Close the round out. `earned` is false when the learner was told the answer. */
  function finish(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
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
    if (sign === null || typed === "") {
      setFeedback("Choose a direction, and enter the value the inequality turns on.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about isolating x, which would answer a question the learner did
    // not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (sign === board.sign && read.value === board.boundary) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Put the argument above zero and isolate x. Whichever side of the boundary x ends up on is the side the domain runs, and the argument has to be strictly positive, so the boundary itself is never one of the inputs.",
    );
  }

  function reveal() {
    setSign(board.sign);
    setEntry(String(board.boundary));
    setRevealed(true);
    finish(false);
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: write this logarithm's domain in set-builder notation, by choosing the
        direction of the inequality and entering the value it turns on.
      </WidgetTask>

      <svg
        viewBox="0 0 440 104"
        role="img"
        aria-label={`The function ${equation}, above the rule that a logarithm's argument has to be greater than zero`}
      >
        <title>A logarithm and the rule its argument has to satisfy</title>

        <SvgMath latex={equation} x={220} y={26} fontSize={19} color={LABEL} w={320} />
        <text x={220} y={52} textAnchor="middle" fontSize={12} fill={LINE}>
          &#8595;
        </text>
        <SvgMath
          latex="\text{argument} > 0"
          x={220}
          y={78}
          fontSize={16}
          color={SIGNAL_DEEP}
          w={320}
        />
      </svg>

      <div className="lesson-equation">
        <div className="lesson-equation__row" data-state={solved ? "done" : "open"}>
          <span className="lesson-equation__stage">domain</span>
          <span className="lesson-equation__body" style={{ color: solved ? CIVIC : LABEL }}>
            <InlineMath latex="\{\, x \mid x" />
            {solved ? (
              <span className="lesson-equation__slot lesson-equation__slot--done">
                <InlineMath latex={board.sign} />
              </span>
            ) : (
              <span
                className={
                  sign === null
                    ? "lesson-equation__slot lesson-equation__slot--locked"
                    : "lesson-equation__slot lesson-equation__slot--done"
                }
              >
                {sign === null ? null : <InlineMath latex={sign} />}
              </span>
            )}
            <input
              className="lesson-equation__slot"
              {...numericEntryProps("integer")}
              value={entry}
              readOnly={solved}
              aria-label="The value the inequality turns on"
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  check();
                }
              }}
            />
            <InlineMath latex="\,\}" />
          </span>
          {solved ? null : (
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          )}
        </div>
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different argument
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          {SIGNS.map((option) => (
            <button
              key={option.latex}
              type="button"
              className="lesson-interactive__chip"
              aria-label={`Use ${option.spoken}`}
              aria-pressed={sign === option.latex}
              // Every chip renders in one neutral token: a hue here would mark the answer. Only
              // the UNCHOSEN border is named; the chosen one is the shared
              // `.lesson-interactive__chip[aria-pressed="true"]` rule, which an inline colour
              // here would beat.
              style={{
                color: LABEL,
                borderColor: sign === option.latex ? undefined : LINE,
              }}
              onClick={() => {
                setSign(option.latex);
                setFeedback(null);
              }}
            >
              <InlineMath latex={option.latex} />
            </button>
          ))}
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={answerSet} />}
        why={
          <>
            The argument has to be strictly positive, so{" "}
            <InlineMath latex={`${board.argument} > 0`} />. Isolating{" "}
            <InlineMath latex="x" /> gives <InlineMath latex={board.step} />, which is{" "}
            <InlineMath latex={`x ${board.sign} ${board.boundary}`} /> read with{" "}
            <InlineMath latex="x" /> on the left. The inequality is strict, because a zero
            argument has no logarithm either, so the boundary is left out and the braces
            read <InlineMath latex={answerSet} />.
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            <InlineMath latex={`${board.argument} > 0`} /> isolates to{" "}
            <InlineMath latex={`x ${board.sign} ${board.boundary}`} />, so the domain is{" "}
            <InlineMath latex={answerSet} /> and the asymptote stands at{" "}
            <InlineMath latex={`x = ${board.boundary}`} />.
          </>
        ) : (
          (feedback ??
          "Require the argument to be positive, then isolate x. The direction it ends up pointing is the direction the domain runs.")
        )}
      </p>
    </div>
  );
}
