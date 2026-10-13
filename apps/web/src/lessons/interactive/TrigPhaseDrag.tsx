/**
 * TRG.5 slide 2 (BESPOKE): the lag between two links carrying the same signal, as a distance
 * you can take hold of and move.
 *
 * The first link's trace is fixed. The second link carries the same signal over a different
 * run, so its copy arrives out of step, and the learner takes the handle on that second trace
 * and slides it until it is where the round says it belongs. The lag is stated as a FRACTION
 * OF A CYCLE, which is how it is described out loud, and the board is set in radians, so the
 * work is the conversion: a quarter of a cycle is a quarter of a whole turn.
 *
 * **Direction is half the answer and is asked both ways.** A copy that arrives LATER has slid
 * to the right, because everything it does happens further along; a copy over a shorter run
 * arrives EARLIER and has slid left. One round of each per board, so a learner cannot settle
 * into sliding one way. The sign is what the practice set's phase-shift item turns on, and it
 * is the reading most often lost.
 *
 * **The handle sits on the rising crossing, which is the point the lag is measured at.** A
 * trace draggable anywhere would be a picture being nudged about; a handle on the crossing
 * makes the answer a position of one identifiable feature, and the arrow drawn back to the
 * first link's crossing is the lag itself, drawn to scale.
 *
 * The current offset is shown while the round is open, which is deliberate: the question is
 * not where `\pi/4` is on an axis, it is what a quarter of a cycle comes to. Reading the
 * offset off the board still leaves that conversion to do.
 *
 * Keyboard reaches everything the pointer does: the handle takes focus and the arrow keys
 * move it one snap at a time, which is also the path a test drives.
 */

import { useRef, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

/** One lag to place: `part` is the denominator of the fraction of a cycle it names. */
interface Round {
  part: number;
  /** How that fraction is said, e.g. "a quarter". */
  word: string;
  /** True when the copy arrives later, so the trace slides to the right. */
  later: boolean;
  /** Why this link's copy is out of step, in one clause. */
  because: string;
}

interface Board {
  link: string;
  rounds: readonly [Round, Round];
}

const BOARDS: readonly Board[] = [
  {
    link: "the ridge link",
    rounds: [
      {
        part: 4,
        word: "a quarter",
        later: true,
        because: "its run climbs the ridge instead of cutting under it",
      },
      {
        part: 6,
        word: "a sixth",
        later: false,
        because: "its run was shortened when the second mast went up",
      },
    ],
  },
  {
    link: "the river link",
    rounds: [
      {
        part: 8,
        word: "an eighth",
        later: true,
        because: "its cable takes the long way around the bend",
      },
      {
        part: 3,
        word: "a third",
        later: false,
        because: "its repeater fires ahead of the schedule the first link keeps",
      },
    ],
  },
];

/** The board snaps in twelfths of a half turn, so every lag it asks for lands on a snap. */
const SNAP = Math.PI / 12;
const SNAP_MIN = -12;
const SNAP_MAX = 12;

const PLOT = { left: 46, right: 404, top: 34, bottom: 168 };
const VIEW_W = 440;
const VIEW_H = 214;
const X_MIN = -Math.PI;
const X_MAX = 3 * Math.PI;
const Y_MIN = -1.5;
const Y_MAX = 1.5;

const mapX = (x: number): number =>
  PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
const mapY = (y: number): number =>
  PLOT.top + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);

/** How wide one snap is in the drawing, which is what a pointer drag is measured against. */
const SNAP_WIDTH = mapX(SNAP) - mapX(0);

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A count of snaps as an unsigned multiple of a half turn. */
function snapSizeTex(steps: number): string {
  const size = Math.abs(steps);
  if (size === 0) {
    return "0";
  }
  const g = gcd(size, 12);
  const num = size / g;
  const den = 12 / g;
  const top = num === 1 ? "\\pi" : `${num}\\pi`;
  return den === 1 ? top : `\\dfrac{${top}}{${den}}`;
}

/** The same value with its direction on the front, which is how an offset is read. */
function snapTex(steps: number): string {
  if (steps === 0) {
    return "0";
  }
  return `${steps < 0 ? "-" : "+"}${snapSizeTex(steps)}`;
}

/** The same value in words, because KaTeX cannot be read back out by a screen reader. */
function snapSpoken(steps: number): string {
  if (steps === 0) {
    return "no shift";
  }
  const size = Math.abs(steps);
  const g = gcd(size, 12);
  const num = size / g;
  const den = 12 / g;
  const value = den === 1 ? (num === 1 ? "pi" : `${num} pi`) : `${num} pi over ${den}`;
  return `${steps < 0 ? "earlier by" : "later by"} ${value}`;
}

/** The snaps a lag of `1/part` of a cycle comes to, signed by its direction. */
function targetFor(round: Round): number {
  const size = 24 / round.part;
  return round.later ? size : -size;
}

export function TrigPhaseDrag(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <TrigPhaseDragBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TrigPhaseDragBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [at, setAt] = useState(0);
  const [steps, setSteps] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [settled, setSettled] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  /** Where a pointer drag began: the client x, and the snap the handle was on. */
  const from = useRef<{ x: number; steps: number } | null>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const last = board.rounds.length - 1;
  const round = board.rounds[Math.min(at, last)] as Round;
  const target = targetFor(round);
  const done = settled && at >= last;

  function clamp(value: number): number {
    return Math.max(SNAP_MIN, Math.min(SNAP_MAX, value));
  }

  /** Where a pointer drag puts the handle: an absolute position off the drag's origin. */
  function moveTo(next: number) {
    if (settled) {
      return;
    }
    setSteps(clamp(next));
    setFeedback(null);
  }

  /**
   * And one snap at a time, from a button or an arrow key.
   *
   * Off the previous value rather than off `steps`, because a learner holding an arrow key
   * or tapping a nudge twice quickly sends both events into one React batch, and the second
   * one reading a stale `steps` would silently drop a snap.
   */
  function nudge(delta: number) {
    if (settled) {
      return;
    }
    setSteps((previous) => clamp(previous + delta));
    setFeedback(null);
  }

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
    if (settled) {
      return;
    }
    setAttempted(true);
    if (steps === target) {
      setRevealed(false);
      advance(true);
      return;
    }
    setFeedback(
      steps !== 0 && steps === -target
        ? "The size is right and the direction is not. A copy that arrives later does everything further along the axis, so its trace sits to the right of the first one."
        : "Not there yet. Take the fraction of a cycle the round names and apply it to a whole turn, then slide the handle that far.",
    );
  }

  function reveal() {
    setSteps(target);
    setRevealed(true);
    advance(false);
  }

  function nextRound() {
    setAt((index) => Math.min(index + 1, last));
    setSettled(false);
    setRevealed(false);
    setSteps(0);
  }

  /** Client x to a snap index, through the viewBox scale the svg is drawn at. */
  function snapFromPointer(clientX: number): number | null {
    const start = from.current;
    const svg = svgRef.current;
    if (start === null || svg === null) {
      return null;
    }
    const box = svg.getBoundingClientRect();
    if (box.width === 0) {
      return null;
    }
    const perPixel = VIEW_W / box.width;
    const moved = (clientX - start.x) * perPixel;
    return start.steps + Math.round(moved / SNAP_WIDTH);
  }

  const shift = steps * SNAP;
  const handleX = mapX(shift);
  const handleY = mapY(0);

  function tracePath(offset: number): string {
    const points: string[] = [];
    const count = 260;
    for (let i = 0; i <= count; i += 1) {
      const x = X_MIN + ((X_MAX - X_MIN) * i) / count;
      const y = Math.sin(x - offset);
      points.push(`${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`);
    }
    return `M ${points.join(" L ")}`;
  }

  const axisMarks: readonly { at: number; latex: string }[] = [
    { at: -Math.PI, latex: "-\\pi" },
    { at: 0, latex: "0" },
    { at: Math.PI, latex: "\\pi" },
    { at: 2 * Math.PI, latex: "2\\pi" },
    { at: 3 * Math.PI, latex: "3\\pi" },
  ];

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: put the second link's trace where a copy arriving out of step with the first
        one belongs, so the gap between the two crossings IS the lag.
      </WidgetTask>

      <p className="lesson-equation__naming">
        On {board.link}, the second copy arrives {round.word} of a cycle{" "}
        {round.later ? "later" : "earlier"}, because {round.because}.
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Two traces of the same signal on ${board.link}, the second one currently ${snapSpoken(steps)}`}
        onPointerMove={(event) => {
          const next = snapFromPointer(event.clientX);
          if (next !== null) {
            moveTo(next);
          }
        }}
        onPointerUp={() => {
          from.current = null;
        }}
        onPointerLeave={() => {
          from.current = null;
        }}
      >
        <title>A signal and its later copy, with the lag between them</title>

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

        {axisMarks.map((mark) => (
          <line
            key={`g${mark.latex}`}
            x1={mapX(mark.at)}
            y1={PLOT.top}
            x2={mapX(mark.at)}
            y2={PLOT.bottom}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.6}
          />
        ))}

        <line
          x1={PLOT.left}
          y1={mapY(0)}
          x2={PLOT.right}
          y2={mapY(0)}
          stroke={SOFT}
          strokeWidth={1.25}
        />

        {/* The first link, fixed. Dashed, because it is the reference and not the answer. */}
        <path
          d={tracePath(0)}
          fill="none"
          stroke={SOFT}
          strokeWidth={2}
          strokeDasharray="7 5"
        />

        {/* The second link, carried by the handle. */}
        <path
          d={tracePath(shift)}
          fill="none"
          stroke={settled ? CIVIC : SIGNAL_DEEP}
          strokeWidth={2.4}
        />

        {/* The lag itself, from the first link's rising crossing to the second's. */}
        {steps !== 0 && (
          <line
            x1={mapX(0)}
            y1={mapY(0) - 26}
            x2={handleX}
            y2={mapY(0) - 26}
            stroke={settled ? CIVIC : SIGNAL_DEEP}
            strokeWidth={1.6}
          />
        )}

        {/* The handle, on the rising crossing of the trace it carries. */}
        <circle
          cx={handleX}
          cy={handleY}
          r={9}
          fill="var(--paper)"
          stroke={settled ? CIVIC : SIGNAL_DEEP}
          strokeWidth={3}
          tabIndex={settled ? -1 : 0}
          role="slider"
          aria-label="The second link's trace. Drag it, or use the arrow keys, to set how far out of step it arrives."
          aria-valuemin={SNAP_MIN}
          aria-valuemax={SNAP_MAX}
          aria-valuenow={steps}
          aria-valuetext={snapSpoken(steps)}
          style={{ cursor: settled ? "default" : "ew-resize" }}
          onPointerDown={(event) => {
            if (settled) {
              return;
            }
            from.current = { x: event.clientX, steps };
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            }
          }}
        />

        {/* Axis captions, in the margin under the plot: KaTeX, because every one of them is
            a multiple of a half turn rather than a bare integer. */}
        {axisMarks.map((mark) => (
          <SvgMath
            key={`m${mark.latex}`}
            latex={mark.latex}
            x={mapX(mark.at)}
            y={PLOT.bottom + 16}
            fontSize={12}
            color={SOFT}
            w={44}
          />
        ))}

        <SvgMath
          latex={`\\text{offset } ${snapTex(steps)}`}
          x={220}
          y={16}
          fontSize={13}
          color={settled ? CIVIC : LABEL}
          w={260}
        />
      </svg>

      {done ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different link
        </button>
      ) : settled ? (
        <div className="lesson-interactive__controls">
          <button type="button" className="lesson-interactive__check" onClick={nextRound}>
            Next link
          </button>
        </div>
      ) : (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            aria-label="Slide the second trace one snap earlier"
            onClick={() => nudge(-1)}
          >
            Earlier
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            aria-label="Slide the second trace one snap later"
            onClick={() => nudge(1)}
          >
            Later
          </button>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !settled}
        revealed={revealed}
        answer={<InlineMath latex={snapTex(target)} />}
        why={
          <>
            One cycle of this signal is a whole turn, <InlineMath latex="2\pi" />, so{" "}
            {round.word} of a cycle is{" "}
            <InlineMath latex={`\\dfrac{2\\pi}{${round.part}}`} />, which is{" "}
            <InlineMath latex={snapSizeTex(target)} /> once the <InlineMath latex="2" /> is
            worked through. The copy arrives {round.later ? "later" : "earlier"}, so
            everything it does happens {round.later ? "further along" : "sooner along"} the
            axis and the trace slides {round.later ? "right" : "left"}. That makes the shift{" "}
            <InlineMath latex={snapTex(target)} />.
          </>
        }
        onReveal={reveal}
        label="Reveal this lag"
        othersRemain={at + 1 < board.rounds.length}
      />

      <p
        className="lesson-interactive__status"
        data-state={done ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : done ? (
          <>
            A phase shift is a distance along the axis, not a height. Sliding the trace
            changes nothing about how strong the signal is or how often it repeats: it moves
            only WHEN each part of it turns up, and the arrow between the two crossings is
            that lag drawn to scale.
          </>
        ) : settled ? (
          <>
            That is the lag. The two crossings are <InlineMath latex={snapTex(target)} />{" "}
            apart, and every peak and trough of the second trace is that same distance from
            the first one's.
          </>
        ) : feedback ? (
          <span style={{ color: BRICK }}>{feedback}</span>
        ) : (
          "Work out what that fraction of a whole turn comes to, then drag the handle, or nudge it with the buttons, until the offset above the plot reads it."
        )}
      </p>
    </div>
  );
}
