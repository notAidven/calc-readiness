/**
 * FUN.9 slide 1: what a multiplier outside the function does to a trace, and what it cannot do.
 *
 * ## The dial teaches; the two typed claims are the question
 *
 * The gain dial redraws $y = a f(x)$ live, across positive gains and negative ones, and it is
 * deliberately ungated: watching the heights multiply and the trace turn over is the teaching,
 * and there is no correct-or-wrong moment in sweeping a dial. What the board is judged on is
 * two claims the picture does not hand over.
 *
 * The first is the gain the loft has to set for the trace to pass through a stated target. The
 * target is stated in the task line and is NEVER DRAWN, which is the point: with nothing on the
 * paper to line the curve up against, sweeping the dial says nothing, so the gain has to be
 * worked out from the labelled reading. The second is the input at which the scaled trace reads
 * zero, and it is the concept rather than an arithmetic step: a vertical multiplier cannot move
 * a point already at height zero, because every gain leaves $a \times 0 = 0$, which is exactly
 * what the sweep shows and what a learner who thinks a stretch drags the whole picture gets
 * wrong.
 *
 * Each claim has its own check, its own mark and its own note, through the shared
 * `widgetPartVerdict` layer, so a learner who has the gain and not the crossing is told that
 * rather than being told "no" about both. Landing the gain snaps the dial onto it, so the
 * finished board draws the trace the learner asked for.
 *
 * `othersRemain` is live: a reveal explains whichever claim is still open, and while the other
 * one is open too the board comes back with the settled claim still standing.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  fittingTicks,
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
  SvgMath,
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import {
  type PartVerdict,
  partName,
  WidgetPartNote,
  WidgetPartVerdict,
} from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

/* -------------------------------------------------------------------------- */
/* The plane                                                                    */
/* -------------------------------------------------------------------------- */

const X_MIN = -6;
const X_MAX = 6;
/** Tall enough that a gain of three keeps the whole trace inside the box. */
const Y_MIN = -10;
const Y_MAX = 10;
const PLOT = { left: 48, right: 416, top: 40, bottom: 222 };
const VIEW_H = 244;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;

function mapX(x: number): number {
  return PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
}

function mapY(y: number): number {
  return PLOT.bottom - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);
}

const X_INTEGERS = Array.from({ length: X_MAX - X_MIN + 1 }, (_, at) => X_MIN + at);
/** Every second reading, so a twenty-unit scale does not close up into a solid block. */
const Y_GRID = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10];

const X_TICKS = fittingTicks({
  ticks: [-6, -4, -2, 2, 4, 6],
  place: mapX,
  half: (tick) => labelHalfW(String(tick), TICK_SIZE),
  start: PLOT.left,
  end: PLOT.right,
});
const Y_TICKS = fittingTicks({
  ticks: [-8, -4, 4, 8],
  place: mapY,
  half: () => labelHalfH(TICK_SIZE),
  start: PLOT.top,
  end: PLOT.bottom,
});

const LABEL_FRAME = plotLabelFrame(PLOT, 8);

const TICK_BOXES: readonly LabelBox[] = [
  ...X_TICKS.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...Y_TICKS.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

const DIAL_MIN = -3;
const DIAL_MAX = 3;

/* -------------------------------------------------------------------------- */
/* The two boards                                                               */
/* -------------------------------------------------------------------------- */

interface Board {
  /** The parent trace, vertex by vertex, every vertex on the lattice. */
  trace: readonly (readonly [number, number])[];
  /** The labelled reading, which is the only value the target can be worked out from. */
  reading: readonly [number, number];
  /** Where the label goes from the reading: `1` is right or up. */
  place: readonly [-1 | 0 | 1, -1 | 0 | 1];
  /** The height the target asks the trace to reach at the reading's input. */
  target: number;
  /** The two inputs where the parent reads zero, smaller first. */
  zeros: readonly [number, number];
  ariaTrace: string;
}

/**
 * Two boards, and all four answers differ between them: the gain comes out $-3$ on one and
 * $-2$ on the other, and the crossing asked for is $-2$ against $-1$. Neither board is the
 * check's numbers, and neither trace is the one on the previous slide.
 */
const BOARDS: readonly Board[] = [
  {
    trace: [
      [-4, 2],
      [-2, 0],
      [0, -3],
      [2, 0],
      [4, 3],
    ],
    reading: [0, -3],
    place: [1, 1],
    target: 9,
    zeros: [-2, 2],
    ariaTrace:
      "a trace falling from 2 at negative 4 through zero at negative 2 to negative 3 at zero, then rising through zero at 2 to 3 at 4",
  },
  {
    trace: [
      [-4, -3],
      [-1, 0],
      [1, 2],
      [3, 0],
      [5, -2],
    ],
    reading: [1, 2],
    place: [1, -1],
    target: -4,
    zeros: [-1, 3],
    ariaTrace:
      "a trace rising from negative 3 at negative 4 through zero at negative 1 to 2 at 1, then falling through zero at 3 to negative 2 at 5",
  },
];

/** A signed number read aloud, for the accessible names. */
function spoken(value: number): string {
  return value < 0 ? `negative ${Math.abs(value)}` : `${value}`;
}

/** A gain as it is written in front of the function: never a bare `1`. */
function gainTex(gain: number): string {
  if (gain === 1) {
    return "";
  }
  return gain === -1 ? "-" : `${gain}`;
}

export function TransformStretchExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <TransformStretchExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TransformStretchExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [dial, setDial] = useState(1);
  const [gainEntry, setGainEntry] = useState("");
  const [zeroEntry, setZeroEntry] = useState("");
  const [settledGain, setSettledGain] = useState(false);
  const [settledZero, setSettledZero] = useState(false);
  const [noteGain, setNoteGain] = useState<ReactNode>(null);
  const [noteZero, setNoteZero] = useState<ReactNode>(null);
  const [revealedPart, setRevealedPart] = useState<"gain" | "zero" | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const [readAt, readValue] = board.reading;
  /** The gain the target demands. Both boards are built so this comes out whole. */
  const wantedGain = board.target / readValue;
  const wantedZero = board.zeros[0];
  const solved = settledGain && settledZero;
  const openPart: "gain" | "zero" | null = !settledGain
    ? "gain"
    : !settledZero
      ? "zero"
      : null;

  function finish(nextGain: boolean, nextZero: boolean) {
    if (nextGain && nextZero && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkGain() {
    if (settledGain) {
      return;
    }
    const typed = gainEntry.trim();
    if (typed === "") {
      setNoteGain(
        <>
          Enter the gain as a number. Divide the height the target asks for by the reading
          the trace already gives at that input.
        </>,
      );
      return;
    }
    if (Number(typed) === wantedGain) {
      setNoteGain(null);
      setSettledGain(true);
      setDial(wantedGain);
      success();
      finish(true, settledZero);
      return;
    }
    setNoteGain(
      Number(typed) === -wantedGain ? (
        <>
          That is the right size and the wrong direction. The multiplier carries its sign
          into every reading, so check whether the target sits on the same side of the axis
          as the reading it comes from.
        </>
      ) : (
        <>
          Not that one. The gain multiplies the reading the trace already gives, so it is
          the height the target asks for divided by that reading.
        </>
      ),
    );
  }

  function checkZero() {
    if (settledZero) {
      return;
    }
    const typed = zeroEntry.trim();
    if (typed === "") {
      setNoteZero(
        <>
          Enter one input. Sweep the dial and watch what happens to the two places the trace
          crosses the horizontal axis.
        </>,
      );
      return;
    }
    if (Number(typed) === wantedZero) {
      setNoteZero(null);
      setSettledZero(true);
      success();
      finish(settledGain, true);
      return;
    }
    setNoteZero(
      Number(typed) === board.zeros[1] ? (
        <>
          That is the other crossing, and it is the positive one. The board asks for the
          negative input.
        </>
      ) : (
        <>
          Not that one. A gain multiplies each reading, and multiplying zero by anything
          leaves zero, so look for a crossing the parent trace already has.
        </>
      ),
    );
  }

  /**
   * Hand over whichever claim is open, and never `finish`. Where this is the last claim
   * outstanding it IS the gate, so handing it over and opening the gate in the same click
   * would let a learner past on a claim they were given. The shared layer owns the release.
   */
  function reveal() {
    if (openPart === "gain") {
      setGainEntry(String(wantedGain));
      setDial(wantedGain);
      setNoteGain(null);
      setSettledGain(true);
      setRevealedPart("gain");
      return;
    }
    if (openPart === "zero") {
      setZeroEntry(String(wantedZero));
      setNoteZero(null);
      setSettledZero(true);
      setRevealedPart("zero");
    }
  }

  const verdictGain: PartVerdict | null = settledGain
    ? "right"
    : noteGain === null
      ? null
      : "wrong";
  const verdictZero: PartVerdict | null = settledZero
    ? "right"
    : noteZero === null
      ? null
      : "wrong";

  const readingLatex = `(${readAt},\\, ${readValue})`;
  const readingBox = labelSpot({
    x: mapX(readAt),
    y: mapY(readValue),
    frame: LABEL_FRAME,
    dx: board.place[0],
    dy: board.place[1],
    halfW: labelHalfW(readingLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: TICK_BOXES,
  });

  const parentPoints = board.trace.map(([x, y]) => `${mapX(x)},${mapY(y)}`).join(" ");
  const scaledPoints = board.trace
    .map(([x, y]) => `${mapX(x)},${mapY(y * dial)}`)
    .join(" ");

  let status: ReactNode;
  if (revealedPart !== null && !solved) {
    status = null;
  } else if (solved) {
    status = (
      <>
        A multiplier outside the function reaches only the readings. Every height is scaled
        by it, a negative one turns the whole trace over, and the two crossings stay exactly
        where they were, because <InlineMath latex="a \times 0 = 0" /> whatever{" "}
        <InlineMath latex="a" /> is.
      </>
    );
  } else {
    status = (
      <>
        Sweep the dial to see what a gain does. The target is not drawn, so the gain it
        needs has to come from the labelled reading rather than from the picture.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: give the gain that would carry this trace through{" "}
        <InlineMath latex={`(${readAt},\\, ${board.target})`} />, and the negative input at
        which the scaled trace still reads zero.
      </WidgetTask>

      <svg
        viewBox={`0 0 440 ${VIEW_H}`}
        role="img"
        aria-label={`A chart recorder trace with a gain dial: ${board.ariaTrace}, with the gain currently set to ${spoken(dial)}`}
      >
        <title>A trace, and what a gain does to its readings and its crossings</title>

        <SvgMath
          latex={`y = ${gainTex(dial)}f(x)`}
          x={220}
          y={18}
          fontSize={16}
          color={solved ? CIVIC : SIGNAL_DEEP}
          w={260}
        />

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
        {X_INTEGERS.map((value) => (
          <line
            key={`gx${value}`}
            x1={mapX(value)}
            y1={PLOT.top}
            x2={mapX(value)}
            y2={PLOT.bottom}
            stroke={LINE}
            strokeWidth={0.6}
            opacity={0.5}
          />
        ))}
        {Y_GRID.map((value) => (
          <line
            key={`gy${value}`}
            x1={PLOT.left}
            y1={mapY(value)}
            x2={PLOT.right}
            y2={mapY(value)}
            stroke={LINE}
            strokeWidth={0.6}
            opacity={0.5}
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

        {/* The parent trace, always, so the scaled one has something to be read against. */}
        <polyline
          points={parentPoints}
          fill="none"
          stroke={SOFT}
          strokeWidth={1.8}
          strokeDasharray="5 4"
        />
        {/* The crossings, marked and never labelled: reading them off the grid is the work. */}
        {board.zeros.map((zero) => (
          <circle
            key={`zero${zero}`}
            cx={mapX(zero)}
            cy={mapY(0)}
            r={4.5}
            fill="none"
            stroke={LABEL}
            strokeWidth={1.8}
          />
        ))}
        <polyline
          points={scaledPoints}
          fill="none"
          stroke={solved ? CIVIC : SIGNAL_DEEP}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <circle cx={mapX(readAt)} cy={mapY(readValue)} r={5} fill={LABEL} />
        <PlotLabel
          box={readingBox}
          latex={readingLatex}
          fontSize={LABEL_SIZE}
          color={LABEL}
        />

        {X_TICKS.map((tick) => (
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
        {Y_TICKS.map((tick) => (
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
      </svg>

      <label
        className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
        htmlFor="fun9-gain"
      >
        Gain <InlineMath latex={`a = ${dial}`} />
      </label>
      <input
        id="fun9-gain"
        className="lesson-interactive__range"
        type="range"
        min={DIAL_MIN}
        max={DIAL_MAX}
        step={1}
        value={dial}
        aria-valuetext={`gain set to ${spoken(dial)}`}
        onChange={(event) => setDial(Number(event.target.value))}
      />

      <div className="lesson-interactive__rows">
        <div className="lesson-interactive__row">
          <span className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex="a =" />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={gainEntry}
              disabled={settledGain}
              aria-label={partName(
                "the gain that carries the trace through the target",
                verdictGain,
              )}
              onChange={(event) => {
                setGainEntry(event.target.value);
                setNoteGain(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkGain();
                }
              }}
            />
          </span>
          {/* The mark on EITHER verdict. `verdictGain` has said "wrong" since this board was
              written and nothing drew it: a claim that was checked and missed carried its
              sentence and no mark at all. */}
          {verdictGain !== null && <WidgetPartVerdict verdict={verdictGain} />}
          {settledGain ? null : (
            <button
              type="button"
              className="lesson-interactive__check lesson-interactive__check--part"
              onClick={checkGain}
            >
              Check the gain
            </button>
          )}
          {noteGain !== null && <WidgetPartNote>{noteGain}</WidgetPartNote>}
        </div>

        <div className="lesson-interactive__row">
          <span className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex="x =" />
            </span>
            <input
              className="lesson-interactive__input"
              type="text"
              inputMode="numeric"
              value={zeroEntry}
              disabled={settledZero}
              aria-label={partName(
                "the negative input at which the scaled trace reads zero",
                verdictZero,
              )}
              onChange={(event) => {
                setZeroEntry(event.target.value);
                setNoteZero(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkZero();
                }
              }}
            />
          </span>
          {verdictZero !== null && <WidgetPartVerdict verdict={verdictZero} />}
          {settledZero ? null : (
            <button
              type="button"
              className="lesson-interactive__check lesson-interactive__check--part"
              onClick={checkZero}
            >
              Check the crossing
            </button>
          )}
          {noteZero !== null && <WidgetPartNote>{noteZero}</WidgetPartNote>}
        </div>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different trace
        </button>
      )}

      <WidgetReveal
        available={
          openPart !== null && (openPart === "gain" ? noteGain !== null : noteZero !== null)
        }
        revealed={revealedPart !== null && revealedPart === openPart}
        answer={
          openPart === "gain" ? (
            <InlineMath latex={`a = ${wantedGain}`} />
          ) : openPart === "zero" ? (
            <InlineMath latex={`x = ${wantedZero}`} />
          ) : null
        }
        why={
          openPart === "gain" ? (
            <>
              The multiplier is applied to whatever the trace already reads, so at{" "}
              <InlineMath latex={`x = ${readAt}`} /> the scaled trace reads{" "}
              <InlineMath
                latex={`a \\times ${readValue < 0 ? `(${readValue})` : readValue}`}
              />
              . For that to be <InlineMath latex={String(board.target)} />, the gain has to
              be{" "}
              <InlineMath
                latex={`${board.target} \\div ${readValue < 0 ? `(${readValue})` : readValue} = ${wantedGain}`}
              />
              , and its sign is what turns the trace through the axis.
            </>
          ) : openPart === "zero" ? (
            <>
              A gain multiplies every reading, and a reading of zero stays zero however it
              is multiplied, so the two crossings cannot move at all. The parent trace
              crosses at <InlineMath latex={String(board.zeros[0])} /> and{" "}
              <InlineMath latex={String(board.zeros[1])} />, and the negative one is{" "}
              <InlineMath latex={String(wantedZero)} />.
            </>
          ) : null
        }
        onReveal={reveal}
        // Named by the claim it is about, the way the check buttons are: both claims are live
        // at once and "Reveal this claim" was true of either of them.
        label={openPart === "zero" ? "Reveal the crossing" : "Reveal the gain"}
        // Live, and false on the reveal that explains the last open claim, because that claim
        // IS the gate.
        othersRemain={!settledGain && !settledZero}
      />

      <p
        className="lesson-interactive__status"
        data-state={
          solved ? "solved" : noteGain !== null || noteZero !== null ? "wrong" : "prompt"
        }
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
