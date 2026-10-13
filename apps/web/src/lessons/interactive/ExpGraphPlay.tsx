/**
 * EL.2 interactive (slide 0): two plans that open on the same amount, and what the gap
 * between their graphs does.
 *
 * Predict, THEN check, and in that order for a reason: the whole slide is about a gap that
 * looks negligible for the first step or two, so a board that arrived with both curves
 * already drawn would answer its own question before the learner had committed to anything.
 * Nothing is plotted until the call is in.
 *
 * The call alone is not enough either. Three options is a question rather than a coin toss,
 * but it is still a call the learner can make correctly while believing the gap grows by a
 * fixed step each decade, so a correct call is followed by a value the learner has to PRODUCE:
 * the gap at the last decade on the board. The two balances at the first decade are labelled
 * once the curves appear, and the last decade's are not, so the gap has to be built from the
 * two factors rather than read off the picture and subtracted.
 *
 * The call is taken ONCE and the row then stands: all three stay on screen, disabled and
 * marked, because the teaching here is the comparison and "the gap grows by more each decade"
 * only instructs while it stands beside the call the learner actually made. The palette
 * follows the shared rule, so their own pick is a verdict in `CIVIC` or `BRICK` and the call
 * that was right on a board they missed is `SIGNAL_DEEP` and dashed rather than green, since
 * green there would credit a pick nobody made.
 *
 * A MISSED CALL DOES NOT SPEND THE BOARD. It used to: `checkGap` was gated on the call having
 * been right, so the only thing left after a wrong one was a restart, and the restart dealt a
 * board whose right call sat in the same slot as the one just given away. The learner was
 * locked out of the step the gate is actually spent on and handed the answer to the step that
 * locked them out, which is R29's shape wearing a three-option row. So the miss is marked and
 * explained, and the gap question opens all the same: what the gate takes is still a produced
 * value, and the call is now scored rather than fatal. The two boards also deal the three
 * calls in DIFFERENT orders, so the second board's call cannot be answered from the first
 * board's position.
 *
 * `othersRemain` is deliberately NOT passed, and the reason survives that change. The reveal
 * is offered only once the gap has been attempted, and the gap is the last thing on the board
 * in every state that reaches it, so there is never a second answer for a "keep going" to
 * point at.
 *
 * Axis numbers sit in the MARGIN, outside the plot rect, which is why they are not filtered
 * by `fittingTicks`: that helper exists for numbers drawn INSIDE the box against interior
 * axes, where half a digit can fall outside the frame. The two on-plane callouts do go
 * through `labelSpot` and `PlotLabel` against a `plotLabelFrame`, and the plot rect carries
 * `data-plot-frame` so the shared guard reads them.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL_DEEP,
  SOFT,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/** The three calls a learner can make about the distance between the plans. */
const CALLS = {
  steady: "Stays the same size",
  fixed: "Grows by the same amount each decade",
  widening: "Grows by more each decade",
} as const;

type CallId = keyof typeof CALLS;

/**
 * Which call the plans bear out. Two exponentials from one start always widen, so this is a
 * property of the mathematics rather than of the board; what a board is free to vary is
 * WHERE the call sits in the row, which is what `Board.calls` below does.
 */
const RIGHT_CALL: CallId = "widening";

/** What a marked option is saying, in every channel it says it in. */
const MARKS = {
  chosenRight: {
    colour: CIVIC,
    style: "solid",
    fill: `color-mix(in srgb, ${CIVIC} 15%, var(--paper))`,
    glyph: "\u2713",
    spoken: "your answer, correct",
  },
  chosenWrong: {
    colour: BRICK,
    style: "solid",
    fill: undefined,
    glyph: "\u2717",
    spoken: "your answer, wrong",
  },
  standing: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    fill: undefined,
    glyph: "\u2713",
    spoken: "the call the plans bear out, which you did not pick",
  },
} as const;

type MarkName = keyof typeof MARKS;

interface Board {
  /** The amount both plans open with. */
  start: number;
  /** The slower plan's factor per decade, then the faster plan's. */
  slow: number;
  fast: number;
  /** How many decades the plot runs. */
  steps: number;
  /** The three calls, in the order this board draws them under the plot. */
  calls: readonly [CallId, CallId, CallId];
}

/**
 * Two boards. Neither reuses the slide's own pair of plans (which grow by half again and by
 * double) or the CFU's numbers, and the two differ in the opening amount and in both factors,
 * so a restart is a genuinely different question.
 *
 * The call ORDERS differ too, and that is load-bearing rather than decorative: a learner
 * arriving at the second board has just been shown which call the first board bore out, and
 * with one fixed order that is the second board's answer as a position. Here the right call is
 * last on one board and first on the other, so it has to be read rather than counted to.
 */
const BOARDS: readonly Board[] = [
  {
    start: 200,
    slow: 2,
    fast: 3,
    steps: 2,
    calls: ["steady", "fixed", "widening"],
  },
  {
    start: 100,
    slow: 3,
    fast: 5,
    steps: 2,
    calls: ["widening", "steady", "fixed"],
  },
];

const PLOT = { left: 56, right: 416, top: 14, bottom: 168 };
const VIEW_H = 196;
const LABEL_SIZE = 13;
const TICK_SIZE = 11;
const SAMPLES = 90;

export function ExpGraphPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <ExpGraphPlayBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExpGraphPlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [call, setCall] = useState<CallId | null>(null);
  const [entry, setEntry] = useState("");
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const slowAt = (t: number): number => board.start * board.slow ** t;
  const fastAt = (t: number): number => board.start * board.fast ** t;
  const gap = fastAt(board.steps) - slowAt(board.steps);
  const firstGap = fastAt(1) - slowAt(1);

  const called = call !== null;
  const callRight = call === RIGHT_CALL;
  const callWrong = called && !callRight;

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

  function answerCall(id: CallId) {
    if (called) {
      return;
    }
    setCall(id);
    setFeedback(null);
    if (id === RIGHT_CALL) {
      success();
    }
  }

  function checkGap() {
    if (solved || !called) {
      return;
    }
    setTried(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Enter the gap between the two balances at the last decade, in dollars.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about taking each plan forward, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === gap) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Take each plan forward by multiplying by its own factor once per decade, and subtract the slower balance from the faster one at the last decade.",
    );
  }

  function reveal() {
    setRevealed(true);
    setEntry(String(gap));
    finish(false);
  }

  /* ------------------------------------------------------------------ the plane */

  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const yTop = fastAt(board.steps) * 1.08;
  const mapX = (t: number): number => PLOT.left + (t / board.steps) * plotW;
  const mapY = (y: number): number => PLOT.bottom - (y / yTop) * plotH;

  /** One curve, sampled across the decades and cut where it leaves the box. */
  function path(factor: number): string {
    const points: string[] = [];
    for (let index = 0; index <= SAMPLES; index += 1) {
      const t = (board.steps * index) / SAMPLES;
      const y = board.start * factor ** t;
      if (y <= yTop) {
        points.push(`${mapX(t).toFixed(2)},${mapY(y).toFixed(2)}`);
      }
    }
    return points.join(" ");
  }

  const yStep = niceStep(yTop / 4);
  const yTicks: number[] = [];
  for (let value = yStep; value <= yTop; value += yStep) {
    yTicks.push(value);
  }
  const xTicks = Array.from({ length: board.steps + 1 }, (_, index) => index);

  const labelFrame = plotLabelFrame(PLOT, 8);
  const placed: LabelBox[] = [];
  /** The callouts on the board: the first decade always, the last one only once solved. */
  const callouts: { latex: string; x: number; y: number; color: string }[] = called
    ? [
        { latex: String(slowAt(1)), x: 1, y: slowAt(1), color: SOFT },
        { latex: String(fastAt(1)), x: 1, y: fastAt(1), color: LABEL },
        ...(solved
          ? [
              {
                latex: String(slowAt(board.steps)),
                x: board.steps,
                y: slowAt(board.steps),
                color: SOFT,
              },
              {
                latex: String(fastAt(board.steps)),
                x: board.steps,
                y: fastAt(board.steps),
                color: LABEL,
              },
            ]
          : []),
      ]
    : [];
  const callLabels = callouts.map((callout) => {
    const box = labelSpot({
      x: mapX(callout.x),
      y: mapY(callout.y),
      frame: labelFrame,
      dx: -1,
      dy: -1,
      halfW: labelHalfW(callout.latex, LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 10,
      avoid: [...placed],
    });
    placed.push(box);
    return { ...callout, box };
  });

  /* -------------------------------------------------------------------- render */

  const neutral = { color: LABEL, borderColor: LINE };
  const markOf = (id: CallId): MarkName | null => {
    if (!called) {
      return null;
    }
    if (id === call) {
      return id === RIGHT_CALL ? "chosenRight" : "chosenWrong";
    }
    return id === RIGHT_CALL ? "standing" : null;
  };

  let status: ReactNode;
  if (revealed) {
    status = null;
  } else if (solved) {
    status = (
      <>
        At the first decade the plans are only <InlineMath latex={String(firstGap)} />{" "}
        apart, and by the last one the gap is <InlineMath latex={String(gap)} />. The faster
        plan multiplies a bigger amount every decade, so the distance between the curves
        widens instead of holding steady.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (callWrong) {
    status =
      "Both plans multiply rather than add, and the faster one is multiplying a bigger amount every decade, so the distance between them widens. The curves are on the board now. Work each plan forward decade by decade, then take the difference at the last one.";
  } else if (callRight) {
    status =
      "The curves are on the board now. Work each plan forward decade by decade, then take the difference at the last one.";
  } else {
    status =
      "Both plans open on the same amount, and the faster one multiplies by more each decade. Decide what that does to the distance between them.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Goal: say what the distance between the two plans does over the decades, and then
        give that distance in dollars at the last decade on the board.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${VIEW_H}`}
        role="img"
        aria-label={
          called
            ? `Two savings plans opening on ${board.start} dollars, one multiplying by ${board.slow} each decade and one by ${board.fast}, plotted over ${board.steps} decades`
            : `An empty pair of axes, decades across and dollars up, waiting for a call about two plans that both open on ${board.start} dollars`
        }
      >
        <title>Two plans from the same starting amount, at different factors</title>

        <rect
          data-plot-frame=""
          x={PLOT.left}
          y={PLOT.top}
          width={plotW}
          height={plotH}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
          rx={6}
        />
        {yTicks.map((tick) => (
          <line
            key={`gy${tick}`}
            x1={PLOT.left}
            y1={mapY(tick)}
            x2={PLOT.right}
            y2={mapY(tick)}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
        ))}
        {xTicks.map((tick) => (
          <line
            key={`gx${tick}`}
            x1={mapX(tick)}
            y1={PLOT.top}
            x2={mapX(tick)}
            y2={PLOT.bottom}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
        ))}

        {called && (
          <>
            <polyline
              points={path(board.slow)}
              fill="none"
              stroke={SOFT}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeDasharray="7 5"
            />
            <polyline
              points={path(board.fast)}
              fill="none"
              stroke={CIVIC}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          </>
        )}

        {/* Axis numbers live in the margin, so they are captions rather than on-plot text. */}
        {yTicks.map((tick) => (
          <text
            key={`ty${tick}`}
            x={PLOT.left - 8}
            y={mapY(tick) + 4}
            textAnchor="end"
            fontSize={TICK_SIZE}
            fill={SOFT}
          >
            {tick}
          </text>
        ))}
        {xTicks.map((tick) => (
          <text
            key={`tx${tick}`}
            x={mapX(tick)}
            y={PLOT.bottom + 16}
            textAnchor="middle"
            fontSize={TICK_SIZE}
            fill={SOFT}
          >
            {tick}
          </text>
        ))}
        <text
          x={(PLOT.left + PLOT.right) / 2}
          y={VIEW_H}
          textAnchor="middle"
          fontSize={11}
          fill={SOFT}
        >
          decades
        </text>
        <text x={PLOT.left - 8} y={PLOT.top - 2} textAnchor="end" fontSize={11} fill={SOFT}>
          dollars
        </text>

        {called &&
          callouts.map((callout) => (
            <circle
              key={`dot${callout.x}:${callout.y}`}
              cx={mapX(callout.x)}
              cy={mapY(callout.y)}
              r={4}
              fill={callout.color}
            />
          ))}
        {callLabels.map((callout) => (
          <PlotLabel
            key={`lab${callout.x}:${callout.y}`}
            box={callout.box}
            latex={callout.latex}
            fontSize={LABEL_SIZE}
            color={callout.color}
          />
        ))}
      </svg>

      {/* A wrapping row rather than the classify grid: these three labels are sentences, and
          the grid's capped nowrap tracks would push them off the card. */}
      <div className="lesson-interactive__controls">
        {board.calls.map((id) => {
          const label = CALLS[id];
          const name = markOf(id);
          const mark = name === null ? null : MARKS[name];
          return (
            <button
              key={id}
              type="button"
              className="lesson-interactive__chip"
              data-mark={name ?? undefined}
              disabled={called}
              aria-label={
                mark === null
                  ? `The gap between the plans: ${label}`
                  : `The gap between the plans: ${label}, ${mark.spoken}`
              }
              style={
                mark === null
                  ? neutral
                  : {
                      color: mark.colour,
                      borderColor: mark.colour,
                      borderStyle: mark.style,
                      background: mark.fill,
                    }
              }
              onClick={() => answerCall(id)}
            >
              {label}
              {mark === null ? null : (
                <span aria-hidden="true" className="lesson-classify__mark">
                  {mark.glyph}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {called && !solved && (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              gap at decade <InlineMath latex={String(board.steps)} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label="The gap between the two balances at the last decade, in dollars"
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkGap();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkGap}>
            Check
          </button>
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different pair of plans
        </button>
      )}

      <WidgetReveal
        available={!solved && tried}
        revealed={revealed}
        answer={<InlineMath latex={String(gap)} />}
        why={
          <>
            Each plan is its own starting amount multiplied by its own factor once per
            decade, so the slower one reaches{" "}
            <InlineMath
              latex={`${board.start} \\cdot ${board.slow}^{${board.steps}} = ${slowAt(board.steps)}`}
            />{" "}
            and the faster one reaches{" "}
            <InlineMath
              latex={`${board.start} \\cdot ${board.fast}^{${board.steps}} = ${fastAt(board.steps)}`}
            />
            . The gap is the difference between those two, which is{" "}
            <InlineMath latex={String(gap)} />. At the first decade it was only{" "}
            <InlineMath latex={String(firstGap)} />, so the distance itself is growing
            rather than holding steady.
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : callWrong || feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}

/** The nice axis step at or above `rough`: a power of ten times 1, 2 or 5. */
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  for (const multiple of [1, 2, 5, 10]) {
    const step = magnitude * multiple;
    if (step >= rough) {
      return step;
    }
  }
  return magnitude * 10;
}
