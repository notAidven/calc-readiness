/**
 * TRG.5 slide 0 (BESPOKE): the two dials an engineer actually turns on a repeating signal,
 * and the two readings those dials produce.
 *
 * A link carries a signal that rises and falls. Two numbers describe everything about how
 * far it moves: the LEVEL it swings about, and the STRENGTH of the swing either side of that
 * level. The measurements that come back from the link are not those two numbers, though.
 * They are the highest reading and the lowest reading, and turning a pair of measurements
 * into a pair of settings is the whole of this slide.
 *
 * **The heights are unmarked while the question is open, and that is the design.** The trace
 * is drawn live and responds to both dials, because a learner has to see that one dial moves
 * the whole trace up and the other opens it out, and no still picture makes that point. But
 * numbering the vertical axis would turn the board into a matter of dragging until a peak
 * touched a line, which is a search rather than an answer, and the arithmetic this slide is
 * about would never happen. So the grid is drawn without its numbers until the round is
 * settled, and what the learner works from is the pair of readings in the heading.
 *
 * **Two rounds per board, judged as pairs.** The dials are answered together because either
 * one alone is ambiguous: a level of `5` is right for a great many signals. The second round
 * of each board pushes the level below the axis, so a learner who reached the first answer by
 * halving two positive numbers meets a subtraction that will not survive that habit.
 *
 * `othersRemain` is live off the round index: being told the first pair hands the board back
 * with the second still to work, and being told the second cannot, because the second IS the
 * gate.
 */

import { useState } from "react";

import {
  BRICK,
  CIVIC,
  fittingTicks,
  InlineMath,
  LABEL,
  LINE,
  labelHalfH,
  SIGNAL_DEEP,
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

/** One measurement pair, and the two dial settings it works out to. */
interface Round {
  high: number;
  low: number;
}

interface Board {
  /** Which link the readings came off, for the heading. */
  link: string;
  rounds: readonly [Round, Round];
}

/**
 * Two boards, four rounds. Every round's second measurement is lower than its first, and
 * three of the four put the level somewhere other than a friendly halfway point, so the pair
 * has to be computed rather than seen.
 */
const BOARDS: readonly Board[] = [
  {
    link: "the east relay",
    rounds: [
      { high: 9, low: 1 },
      { high: 4, low: -2 },
    ],
  },
  {
    link: "the harbor relay",
    rounds: [
      { high: 7, low: -3 },
      { high: 2, low: -4 },
    ],
  },
];

const STRENGTH_MIN = 1;
const STRENGTH_MAX = 6;
const LEVEL_MIN = -4;
const LEVEL_MAX = 6;

const PLOT = { left: 54, right: 404, top: 30, bottom: 202 };
const VIEW_H = 240;
const Y_MIN = -6;
const Y_MAX = 10;
const TICK_SIZE = 11;
const TURN = Math.PI * 2;

const mapX = (x: number): number => PLOT.left + (x / TURN) * (PLOT.right - PLOT.left);
const mapY = (y: number): number =>
  PLOT.top + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);

/** The strength and level a pair of readings works out to. */
function settingsFor(round: Round): { strength: number; level: number } {
  return {
    strength: (round.high - round.low) / 2,
    level: (round.high + round.low) / 2,
  };
}

export function TrigAmplitudeSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <TrigAmplitudeSliderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TrigAmplitudeSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [at, setAt] = useState(0);
  const [strength, setStrength] = useState(STRENGTH_MIN);
  const [level, setLevel] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  /**
   * Whether the round ON SCREEN has been answered. The round index only moves when the
   * learner asks for the next reading, so the sentence and the two lines drawn across the
   * grid stay about the pair that was just settled rather than jumping to the next one.
   */
  const [settled, setSettled] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const last = board.rounds.length - 1;
  const round = board.rounds[Math.min(at, last)] as Round;
  const want = settingsFor(round);
  const done = settled && at >= last;
  /** Numbers on the axis are the reward for settling the round, never an aid to guessing it. */
  const marked = settled;

  function advance(earned: boolean) {
    setSettled(true);
    setAttempted(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (at >= last) {
      onSolved();
    }
  }

  function check() {
    if (done) {
      return;
    }
    setAttempted(true);
    if (strength === want.strength && level === want.level) {
      setRevealed(false);
      advance(true);
      return;
    }
    setFeedback(
      "Not those settings. The level sits halfway between the two readings, and the strength is how far it is from that level out to either one of them.",
    );
  }

  function reveal() {
    setStrength(want.strength);
    setLevel(want.level);
    setRevealed(true);
    advance(false);
  }

  /** Move to the next round's question, clearing the axis numbers behind it. */
  function nextRound() {
    setAt((index) => Math.min(index + 1, last));
    setSettled(false);
    setRevealed(false);
    setStrength(STRENGTH_MIN);
    setLevel(0);
  }

  const gridY = [-6, -4, -2, 2, 4, 6, 8, 10];
  const numberedY = fittingTicks({
    ticks: gridY,
    place: mapY,
    half: () => labelHalfH(TICK_SIZE),
    start: PLOT.top,
    end: PLOT.bottom,
  });

  /** The live trace, clipped to the window so an extreme pair of dials cannot spill out. */
  function tracePath(): string {
    const points: string[] = [];
    const steps = 240;
    for (let step = 0; step <= steps; step += 1) {
      const x = (TURN * step) / steps;
      const y = level + strength * Math.sin(x);
      if (y < Y_MIN || y > Y_MAX) {
        continue;
      }
      points.push(`${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  }

  const heading = `\\text{high } ${round.high} \\quad \\text{low } ${round.low}`;

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: turn a pair of measured readings into the two settings that describe the
        signal, its level and its strength, and see what each dial does to the trace.
      </WidgetTask>

      {/* 360, not the default 460, and the figure is not what was over: at full width this
        board's PANEL was the taller column at 279.7px against a 250.9px trace, 8.5px past the
        350px band once its 78.8px of chrome is counted. A narrower figure column is a wider
        panel, and 460 -> 360 rewraps the trailing note to one line fewer, worth 20.6px. It is
        the only board here whose margin is thin (12.1px), and narrowing further does not help:
        measured at 320 the panel is the same 259.1px, because the note has stopped rewrapping
        and the two dials and their labels are what is left. */}
      <WidgetBeside
        figureWidth={360}
        figure={
          <svg
            viewBox={`0 0 440 ${VIEW_H}`}
            role="img"
            aria-label={
              done
                ? `A finished trace for ${board.link}, at strength ${strength} about a level of ${level}`
                : `A live trace for ${board.link} at strength ${strength} about a level of ${level}, against readings of ${round.high} at the high and ${round.low} at the low`
            }
          >
            <title>A repeating signal, its level, and the strength of its swing</title>

            <SvgMath latex={heading} x={220} y={14} fontSize={15} color={LABEL} w={320} />

            <rect
              data-plot-frame=""
              x={PLOT.left}
              y={PLOT.top}
              width={PLOT.right - PLOT.left}
              height={PLOT.bottom - PLOT.top}
              fill="var(--paper)"
              stroke={LINE}
              strokeWidth={1}
              rx={6}
            />

            {gridY.map((tick) => (
              <line
                key={`g${tick}`}
                x1={PLOT.left}
                y1={mapY(tick)}
                x2={PLOT.right}
                y2={mapY(tick)}
                stroke={LINE}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            ))}

            {/* The horizontal axis, which is a reference and not one of the two answers. */}
            <line
              x1={PLOT.left}
              y1={mapY(0)}
              x2={PLOT.right}
              y2={mapY(0)}
              stroke={SOFT}
              strokeWidth={1.25}
            />

            {/* The level the dials are currently claiming, drawn dashed under the trace. */}
            <line
              x1={PLOT.left + 1}
              y1={mapY(level)}
              x2={PLOT.right - 1}
              y2={mapY(level)}
              stroke={marked ? CIVIC : SIGNAL_DEEP}
              strokeWidth={1.6}
              strokeDasharray="6 4"
            />

            {/* The two readings the round is asking to be matched, drawn only once the round is
            settled: before that they would be the answer, laid across the grid. */}
            {marked && (
              <>
                <line
                  x1={PLOT.left + 1}
                  y1={mapY(round.high)}
                  x2={PLOT.right - 1}
                  y2={mapY(round.high)}
                  stroke={CIVIC}
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
                <line
                  x1={PLOT.left + 1}
                  y1={mapY(round.low)}
                  x2={PLOT.right - 1}
                  y2={mapY(round.low)}
                  stroke={CIVIC}
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
              </>
            )}

            <path
              d={tracePath()}
              fill="none"
              stroke={marked ? CIVIC : SIGNAL_DEEP}
              strokeWidth={2.4}
            />

            {marked &&
              numberedY.map((tick) => (
                <text
                  key={`t${tick}`}
                  x={PLOT.left - 8}
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
          </svg>
        }
      >
        <label
          className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
          htmlFor="trg5-level"
        >
          Level <InlineMath latex={`y = ${level}`} />
        </label>
        <input
          id="trg5-level"
          className="lesson-interactive__range"
          type="range"
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          step={1}
          value={level}
          disabled={settled}
          aria-valuetext={`level at y equals ${level}`}
          onChange={(e) => {
            setLevel(Number(e.target.value));
            setFeedback(null);
          }}
        />

        <label
          className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
          htmlFor="trg5-strength"
        >
          Strength <InlineMath latex={`${strength}`} /> either side
        </label>
        <input
          id="trg5-strength"
          className="lesson-interactive__range"
          type="range"
          min={STRENGTH_MIN}
          max={STRENGTH_MAX}
          step={1}
          value={strength}
          disabled={settled}
          aria-valuetext={`strength ${strength} either side of the level`}
          onChange={(e) => {
            setStrength(Number(e.target.value));
            setFeedback(null);
          }}
        />

        {done ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different link
          </button>
        ) : settled ? (
          <div className="lesson-interactive__controls">
            <button type="button" className="lesson-interactive__check" onClick={nextRound}>
              Next reading
            </button>
          </div>
        ) : (
          <div className="lesson-interactive__controls">
            <span className="lesson-interactive__field-label" style={{ color: BRICK }}>
              reading {at + 1} of {board.rounds.length}
            </span>
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          </div>
        )}

        <WidgetReveal
          available={attempted && !settled}
          revealed={revealed}
          answer={
            <>
              the level is <InlineMath latex={`y = ${want.level}`} /> and the strength is{" "}
              <InlineMath latex={`${want.strength}`} />
            </>
          }
          why={
            <>
              The level sits halfway between the two readings, which is their sum shared in
              two:{" "}
              <InlineMath
                latex={`\\dfrac{${round.high} + (${round.low})}{2} = ${want.level}`}
              />
              . The strength is how far it is from that level out to a peak, which is their
              DIFFERENCE shared in two:{" "}
              <InlineMath
                latex={`\\dfrac{${round.high} - (${round.low})}{2} = ${want.strength}`}
              />
              . Sum for the level, difference for the strength, and both halved.
            </>
          }
          onReveal={reveal}
          label="Reveal these settings"
          othersRemain={at + 1 < board.rounds.length}
        />

        <p
          className="lesson-interactive__status"
          data-state={done ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {revealed ? null : done ? (
            <>
              Both settings come out of the same two readings. Their halved sum is the level
              the signal swings about, and their halved difference is its amplitude, the
              reach from that level out to a peak. Moving the level dial carries the whole
              trace with it and changes nothing about its shape.
            </>
          ) : settled ? (
            <>
              Matched. The trace now touches <InlineMath latex={`${round.high}`} /> at the
              top and <InlineMath latex={`${round.low}`} /> at the bottom, and the dashed
              line is exactly midway between them.
            </>
          ) : (
            (feedback ??
            "The vertical heights stay unmarked until the round is settled, so work the two dials out from the readings above rather than by eye.")
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
