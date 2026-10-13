/**
 * FUN.10 slide 0: the parent vee is the line `y = x` with its negative half folded up.
 *
 * The line is drawn dashed and three of its points are marked, two of them below the axis.
 * Nothing of the vee is on screen while the question is open, so the only thing to work from
 * is what the bars DO to each output, which is the slide's whole content. The folded point
 * appears as each value lands, and the finished vee is drawn once all three are in.
 *
 * Three judged rows rather than one, so a learner who has the positive input and not the
 * negative ones is told which half they have. A wrong call on a row leaves that row open, and
 * the reveal explains one row at a time while the others stay the learner's to produce.
 */

import { useState } from "react";

import {
  CIVIC,
  fittingTicks,
  InlineMath,
  LABEL,
  LINE,
  labelHalfH,
  labelHalfW,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/* ------------------------------------------------------------------------- the plane */

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
const PLOT = { left: 46, right: 394, top: 24, bottom: 202 };
const VIEW_H = 250;
const TICK_SIZE = 11;
const GRID = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
const TICK_VALUES = [-4, -2, 2, 4];

const mapX = (x: number): number =>
  PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
const mapY = (y: number): number =>
  PLOT.top + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);

/** Only the ticks with room for their own digits inside the frame carry a number. */
const NUMBERED_X = fittingTicks({
  ticks: TICK_VALUES,
  place: mapX,
  half: (tick) => labelHalfW(String(tick), TICK_SIZE),
  start: PLOT.left,
  end: PLOT.right,
});
const NUMBERED_Y = fittingTicks({
  ticks: TICK_VALUES,
  place: mapY,
  half: () => labelHalfH(TICK_SIZE),
  start: PLOT.top,
  end: PLOT.bottom,
});

/* ------------------------------------------------------------------------- the boards */

interface Board {
  /** The three inputs the learner folds, two of them negative. */
  inputs: readonly number[];
}

/** Two boards with visibly different inputs, so a restart is a different question. */
const BOARDS: readonly Board[] = [{ inputs: [-4, -1, 3] }, { inputs: [-5, -2, 4] }];

export function AbsValueVeeBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <AbsValueVeeBuildBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function AbsValueVeeBuildBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [entries, setEntries] = useState<string[]>(() => board.inputs.map(() => ""));
  const [settled, setSettled] = useState<readonly number[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [latched, setLatched] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const open = board.inputs
    .map((_input, index) => index)
    .filter((i) => !settled.includes(i));
  const solved = open.length === 0;
  /** The row a reveal would explain: the first one still outstanding. */
  const explaining = open[0] ?? 0;

  /** Record newly settled rows, firing one badge each and latching only on a clean board. */
  function settle(indexes: readonly number[], earned: boolean) {
    if (indexes.length === 0) {
      return;
    }
    const next = [...settled, ...indexes];
    setSettled(next);
    if (earned) {
      for (let count = 0; count < indexes.length; count += 1) {
        success();
      }
    }
    if (next.length === board.inputs.length && !latched) {
      setLatched(true);
      onSolved();
    }
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    const landed: number[] = [];
    let missed = false;
    let blank = false;
    let unreadable = false;
    for (const index of open) {
      const typed = (entries[index] ?? "").trim();
      if (typed === "") {
        blank = true;
        continue;
      }
      // Plain entry takes anything, so a non-number is its own miss rather than falling
      // through to a note about the bars, which would answer a question the learner did not
      // ask. The attempt above still stands, so the reveal stays on offer.
      const read = readNumericEntry(typed, "integer");
      if (!read.ok) {
        unreadable = true;
        continue;
      }
      if (read.value === Math.abs(board.inputs[index] as number)) {
        landed.push(index);
      } else {
        missed = true;
      }
    }
    settle(landed, true);
    if (unreadable) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (missed) {
      setFeedback(
        "Not quite. The bars report a distance from zero, so a negative input comes back as its size and never keeps its sign.",
      );
      return;
    }
    if (blank) {
      setFeedback("Fill in every output before checking.");
      return;
    }
    setFeedback(null);
  }

  /** The reveal's own fill: hand back one row, without a badge. */
  function reveal() {
    const index = explaining;
    const value = Math.abs(board.inputs[index] as number);
    setEntries((prev) => prev.map((entry, i) => (i === index ? String(value) : entry)));
    setRevealed(true);
    setFeedback(null);
    settle([index], false);
  }

  /** The vee, drawn only once the learner has produced every output. */
  function veePath(): string {
    const left = `${mapX(Y_MIN)} ${mapY(Math.abs(Y_MIN))}`;
    const corner = `${mapX(0)} ${mapY(0)}`;
    const right = `${mapX(Y_MAX)} ${mapY(Math.abs(Y_MAX))}`;
    return `M ${left} L ${corner} L ${right}`;
  }

  const explainedInput = board.inputs[explaining] as number;

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: give the folded height of each marked input, so the vee that replaces the line
        is drawn.
      </WidgetTask>

      <WidgetBeside
        figure={
          <svg
            viewBox={`0 0 440 ${VIEW_H}`}
            role="img"
            aria-label={`The line y equals x drawn dashed on a grid, with the inputs ${board.inputs.join(", ")} marked on it`}
          >
            <title>The line y equals x, and the vee its folded half produces</title>

            <rect
              data-plot-frame=""
              x={PLOT.left}
              y={PLOT.top}
              width={PLOT.right - PLOT.left}
              height={PLOT.bottom - PLOT.top}
              rx={6}
              fill="var(--paper)"
              stroke={LINE}
              strokeWidth={1}
            />

            {GRID.map((value) => (
              <line
                key={`gx${value}`}
                x1={mapX(value)}
                y1={PLOT.top}
                x2={mapX(value)}
                y2={PLOT.bottom}
                stroke={LINE}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            ))}
            {GRID.map((value) => (
              <line
                key={`gy${value}`}
                x1={PLOT.left}
                y1={mapY(value)}
                x2={PLOT.right}
                y2={mapY(value)}
                stroke={LINE}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            ))}

            <line
              x1={PLOT.left}
              y1={mapY(0)}
              x2={PLOT.right}
              y2={mapY(0)}
              stroke={SOFT}
              strokeWidth={1.3}
            />
            <line
              x1={mapX(0)}
              y1={PLOT.top}
              x2={mapX(0)}
              y2={PLOT.bottom}
              stroke={SOFT}
              strokeWidth={1.3}
            />

            {/* The line the vee is folded out of, kept dashed so the vee reads as the answer. */}
            <line
              x1={mapX(X_MIN)}
              y1={mapY(Y_MIN)}
              x2={mapX(X_MAX)}
              y2={mapY(Y_MAX)}
              stroke={SOFT}
              strokeWidth={1.8}
              strokeDasharray="6 4"
            />

            {solved && <path d={veePath()} fill="none" stroke={CIVIC} strokeWidth={2.6} />}

            {board.inputs.map((input) => (
              <circle
                key={`line${input}`}
                cx={mapX(input)}
                cy={mapY(input)}
                r={4}
                fill="none"
                stroke={SOFT}
                strokeWidth={1.8}
              />
            ))}
            {board.inputs.map((input, index) =>
              settled.includes(index) ? (
                <circle
                  key={`fold${input}`}
                  cx={mapX(input)}
                  cy={mapY(Math.abs(input))}
                  r={4.5}
                  fill={CIVIC}
                />
              ) : null,
            )}

            {NUMBERED_X.map((tick) => (
              <text
                key={`tx${tick}`}
                x={mapX(tick)}
                y={mapY(0) + 15}
                textAnchor="middle"
                fontSize={TICK_SIZE}
                fill={SOFT}
                stroke="var(--paper)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {tick}
              </text>
            ))}
            {NUMBERED_Y.map((tick) => (
              <text
                key={`ty${tick}`}
                x={mapX(0) - 8}
                y={mapY(tick) + 4}
                textAnchor="end"
                fontSize={TICK_SIZE}
                fill={SOFT}
                stroke="var(--paper)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {tick}
              </text>
            ))}

            <SvgMath latex="y = x" x={110} y={228} fontSize={15} color={SOFT} w={180} />
            <SvgMath
              latex="y = \left\lvert x \right\rvert"
              x={310}
              y={228}
              fontSize={15}
              color={solved ? CIVIC : LINE}
              w={180}
            />
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          {board.inputs.map((input, index) => (
            <div
              key={`field${input}`}
              className="lesson-interactive__field"
              style={{ color: settled.includes(index) ? CIVIC : LABEL }}
            >
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`\\left\\lvert ${input} \\right\\rvert`} />
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={entries[index] ?? ""}
                disabled={settled.includes(index)}
                aria-label={`the absolute value of ${input < 0 ? `negative ${-input}` : input}`}
                onChange={(event) =>
                  setEntries((prev) =>
                    prev.map((entry, i) => (i === index ? event.target.value : entry)),
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    check();
                  }
                }}
              />
            </div>
          ))}
          {!solved && (
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          )}
        </div>

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with different inputs
          </button>
        )}

        <WidgetReveal
          available={attempted && !solved}
          revealed={revealed}
          othersRemain={open.length > 1}
          answer={
            <InlineMath
              latex={`\\left\\lvert ${explainedInput} \\right\\rvert = ${Math.abs(explainedInput)}`}
            />
          }
          why={
            <>
              The bars hand back the distance from zero, so the sign is dropped and{" "}
              <InlineMath latex={String(explainedInput)} /> comes back as{" "}
              <InlineMath latex={String(Math.abs(explainedInput))} />. On the graph that is
              the point on the line at{" "}
              <InlineMath latex={`(${explainedInput},\\, ${explainedInput})`} /> folded
              straight up to{" "}
              <InlineMath latex={`(${explainedInput},\\, ${Math.abs(explainedInput)})`} />.
            </>
          }
          onReveal={reveal}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {solved ? (
            <>
              The right arm sat on the line already and the left arm is its mirror image, so{" "}
              <InlineMath latex="y = \left\lvert x \right\rvert" /> is one line with its
              negative half turned up, meeting in a corner at the origin.
            </>
          ) : (
            (feedback ??
            "Each marked point sits on the dashed line. The bars replace its height with the distance that height sits from zero.")
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
