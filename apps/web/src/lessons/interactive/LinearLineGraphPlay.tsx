/**
 * LF.2 interactive (slide 1): graph a line from its equation by plotting, in order, the
 * point the equation hands you and the point the slope walks you to.
 *
 * The lattice points are real `<button>` elements hosted in `foreignObject`s ON the grid,
 * so the widget is clicked where the mathematics happens and is still tab-navigable. Every
 * candidate is a named misconception rather than noise: the intercept read as an x-value,
 * the sign of `b` flipped, the slope mistaken for the intercept, the run and the rise
 * swapped, a step right with no rise, and a step down instead of up. Each wrong click
 * answers with the specific misreading it represents, so a miss teaches.
 *
 * No candidate other than the two targets lies on the line, so a rejected click is never a
 * point the learner could argue for. Neither line is used by the CFU or the practice bank.
 *
 * Two lines rotate on "start over", because a reset that deals the same equation back asks
 * for two clicks the learner has just made. The plotting window stays a module constant and
 * the second line was chosen to FIT it rather than the window being widened per board: the
 * window is what makes one slope step square on the page, and a per-board window would have
 * to re-derive the grid, the ticks, the tick obstacle boxes and the label frame from it, all
 * to buy nothing the learner sees. `y = -2x - 1` falls where the first line rises, and its
 * intercept, its slope step and all six of its misreadings sit inside x over [-6, 6] and y
 * over [-6, 4] exactly as the first line's do.
 */

import { type ReactNode, useState } from "react";

import {
  CIVIC,
  InlineMath,
  interiorTicks,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  type LessonWidgetProps,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

/* 26 user units per grid square in both directions, so one slope step is drawn true. */
const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 4;
const LEFT = 64;
const RIGHT = 376;
const TOP = 14;
const BOTTOM = 274;
const DOT = 24;

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

/** A signed value read aloud, since KaTeX makes `textContent` unusable for a11y. */
function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

interface Lattice {
  x: number;
  y: number;
}

interface Board {
  slope: number;
  intercept: number;
  lineTex: string;
  /** The equation read aloud, for the SVG's label. */
  aria: string;
  /**
   * The rise and the run swapped: a step of `|m|` across and one up or down. Named here
   * rather than derived, because it is a misreading and not a construction.
   */
  swapped: Lattice;
  /** A step right with no rise at all. */
  flat: Lattice;
  /** The intercept, the one slope step, and six named misreadings, in click order. */
  candidates: readonly Lattice[];
}

const BOARDS: readonly Board[] = [
  {
    slope: 2,
    intercept: -3,
    lineTex: "y = 2x - 3",
    aria: "y equals 2 x minus 3",
    swapped: { x: 2, y: -2 },
    flat: { x: 2, y: -3 },
    candidates: [
      { x: 0, y: -3 },
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: -3, y: 0 },
      { x: 1, y: -1 },
      { x: 1, y: -5 },
      { x: 2, y: -3 },
      { x: 2, y: -2 },
    ],
  },
  /*
   * The second line FALLS, which turns the sign misreading over: on board one stepping down
   * is the mistake and here stepping up is, so a learner who cleared board one by always
   * going up gets caught. Every point listed is inside the shared window, none of the six
   * misreadings lies on `y = -2x - 1`, and no two of the eight coincide.
   */
  {
    slope: -2,
    intercept: -1,
    lineTex: "y = -2x - 1",
    aria: "y equals negative 2 x minus 1",
    swapped: { x: 2, y: -2 },
    flat: { x: 2, y: -1 },
    candidates: [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 0, y: -2 },
      { x: -1, y: 0 },
      { x: 1, y: -3 },
      { x: 1, y: 1 },
      { x: 2, y: -1 },
      { x: 2, y: -2 },
    ],
  },
];

const GRID_X = Array.from({ length: X_MAX - X_MIN + 1 }, (_unused, i) => X_MIN + i);
const GRID_Y = Array.from({ length: Y_MAX - Y_MIN + 1 }, (_unused, i) => Y_MIN + i);
const TICKS_X = interiorTicks([-4, -2, 2, 4], X_MIN, X_MAX);
const TICKS_Y = interiorTicks([-4, -2, 2], Y_MIN, Y_MAX);

/** Labels belong inside the plot, off its border by enough not to read as touching it. */
const LABEL_FRAME = plotLabelFrame(
  { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM },
  8,
);
const LABEL_SIZE = 14;
const TICK_SIZE = 11;

/** The axis numbers, as obstacles: they are drawn inside the plot, against the axes. */
const TICK_BOXES: readonly LabelBox[] = [
  ...TICKS_Y.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...TICKS_X.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

function pointTex(point: Lattice): string {
  return `(${point.x},\\, ${point.y})`;
}

export function LinearLineGraphPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearLineGraphPlayBody
      key={variant.nonce}
      board={BOARDS[variant.index] ?? (BOARDS[0] as Board)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearLineGraphPlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { slope: SLOPE, intercept: INTERCEPT, lineTex: LINE_TEX, candidates } = board;
  const INTERCEPT_POINT: Lattice = { x: 0, y: INTERCEPT };
  const STEP_POINT: Lattice = { x: 1, y: INTERCEPT + SLOPE };
  const rises = SLOPE > 0;

  const [picked, setPicked] = useState<readonly Lattice[]>([]);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();

  const solved = picked.length === 2;

  function interceptMiss(point: Lattice): ReactNode {
    if (point.x !== 0) {
      return (
        <>
          The <InlineMath latex="y" />
          -intercept sits on the vertical axis, so its first coordinate has to be{" "}
          <InlineMath latex="0" />.
        </>
      );
    }
    return (
      <>
        Right axis, wrong height. In <InlineMath latex={LINE_TEX} /> the constant on the end
        is the <InlineMath latex="y" />
        -coordinate of the intercept, sign included.
      </>
    );
  }

  function stepMiss(point: Lattice): ReactNode {
    if (point.x === board.swapped.x && point.y === board.swapped.y) {
      return (
        <>
          That is a run of <InlineMath latex={String(Math.abs(SLOPE))} /> and a rise of{" "}
          <InlineMath latex="1" />, the fraction upside down. A slope of{" "}
          <InlineMath latex={String(SLOPE)} /> means{" "}
          <InlineMath latex={`\\dfrac{${SLOPE}}{1}`} />.
        </>
      );
    }
    if (point.x === board.flat.x && point.y === board.flat.y) {
      return (
        <>
          You moved right but never left the height you started at. A step of the slope is a
          run of <InlineMath latex="1" /> AND a rise of <InlineMath latex={String(SLOPE)} />
          .
        </>
      );
    }
    // The step taken the wrong way up: a fall where the line climbs, or a climb where it
    // falls. One test covers both, since the sign of the slope is what decides which.
    if ((point.y - INTERCEPT) * SLOPE < 0) {
      return rises ? (
        <>
          You stepped down. This slope is positive, so the line rises as{" "}
          <InlineMath latex="x" /> increases.
        </>
      ) : (
        <>
          You stepped up. This slope is negative, so the line falls as{" "}
          <InlineMath latex="x" /> increases.
        </>
      );
    }
    return (
      <>
        Start from the intercept you just plotted and take one step: right{" "}
        <InlineMath latex="1" />, then {rises ? "up" : "down"}{" "}
        <InlineMath latex={String(Math.abs(SLOPE))} />.
      </>
    );
  }

  function choose(point: Lattice) {
    if (solved) {
      return;
    }
    const target = picked.length === 0 ? INTERCEPT_POINT : STEP_POINT;
    if (point.x !== target.x || point.y !== target.y) {
      setFeedback(picked.length === 0 ? interceptMiss(point) : stepMiss(point));
      return;
    }
    const next = [...picked, point];
    setPicked(next);
    setFeedback(null);
    success();
    if (next.length === 2) {
      onSolved();
    }
  }

  /*
   * Each plotted point's label is placed rather than nudged. The two targets are one slope
   * step apart, so a fixed offset put the second label on the first, and the intercept sits
   * on the y axis, where that offset ran the label across the axis numbers.
   *
   * Up and to the right first, since that is the empty side of a rising line, with each
   * label added to the obstacles the next one has to clear.
   */
  const pickedLabels: { point: Lattice; box: LabelBox }[] = [];
  for (const point of picked) {
    pickedLabels.push({
      point,
      box: labelSpot({
        x: mapX(point.x),
        y: mapY(point.y),
        frame: LABEL_FRAME,
        dx: 1,
        dy: -1,
        halfW: labelHalfW(pointTex(point), LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 12,
        avoid: [...TICK_BOXES, ...pickedLabels.map((entry) => entry.box)],
      }),
    });
  }

  return (
    <div className="lesson-interactive lesson-interactive--play">
      {/* No `role="img"` on this one: an `img` subtree is presentational, which would hide
          the lattice-point buttons inside it from assistive tech. The `<title>` and the
          label carry the description instead. */}
      <svg
        viewBox="0 0 440 310"
        aria-label={`A grid for graphing ${board.aria}, with lattice points to plot`}
      >
        <title>Plot the intercept, then one slope step</title>

        <rect
          data-plot-frame=""
          x={LEFT}
          y={TOP}
          width={RIGHT - LEFT}
          height={BOTTOM - TOP}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
          rx={6}
        />
        {GRID_X.map((tick) => (
          <line
            key={`gx${tick}`}
            x1={mapX(tick)}
            y1={TOP}
            x2={mapX(tick)}
            y2={BOTTOM}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
        ))}
        {GRID_Y.map((tick) => (
          <line
            key={`gy${tick}`}
            x1={LEFT}
            y1={mapY(tick)}
            x2={RIGHT}
            y2={mapY(tick)}
            stroke={LINE}
            strokeWidth={0.5}
            strokeOpacity={0.55}
          />
        ))}
        <line
          x1={LEFT}
          y1={mapY(0)}
          x2={RIGHT}
          y2={mapY(0)}
          stroke={SOFT}
          strokeWidth={1.25}
        />
        <line
          x1={mapX(0)}
          y1={TOP}
          x2={mapX(0)}
          y2={BOTTOM}
          stroke={SOFT}
          strokeWidth={1.25}
        />

        {/* The rise-over-run step, drawn once the intercept is down. */}
        {picked.length >= 1 && (
          <g>
            <line
              x1={mapX(0)}
              y1={mapY(INTERCEPT)}
              x2={mapX(1)}
              y2={mapY(INTERCEPT)}
              stroke={SOFT}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <line
              x1={mapX(1)}
              y1={mapY(INTERCEPT)}
              x2={mapX(1)}
              y2={mapY(INTERCEPT + SLOPE)}
              stroke={SOFT}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </g>
        )}

        {solved && (
          <line
            x1={mapX((Y_MIN - INTERCEPT) / SLOPE)}
            y1={mapY(Y_MIN)}
            x2={mapX((Y_MAX - INTERCEPT) / SLOPE)}
            y2={mapY(Y_MAX)}
            stroke={CIVIC}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {picked.map((point) => (
          <circle
            key={`${point.x}:${point.y}`}
            cx={mapX(point.x)}
            cy={mapY(point.y)}
            r={5}
            fill={CIVIC}
          />
        ))}

        {TICKS_X.map((tick) => (
          <text
            key={`tx${tick}`}
            x={mapX(tick)}
            y={mapY(0) + 15}
            textAnchor="middle"
            fontSize={11}
            fill={SOFT}
            stroke="var(--paper)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {tick}
          </text>
        ))}
        {TICKS_Y.map((tick) => (
          <text
            key={`ty${tick}`}
            x={mapX(0) - 8}
            y={mapY(tick) + 4}
            textAnchor="end"
            fontSize={11}
            fill={SOFT}
            stroke="var(--paper)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {tick}
          </text>
        ))}

        {/* Clickable lattice points last, so nothing painted above can swallow a click. */}
        {candidates.map((point) => {
          const taken = picked.some((p) => p.x === point.x && p.y === point.y);
          return (
            <foreignObject
              key={`c${point.x}:${point.y}`}
              x={mapX(point.x) - DOT / 2}
              y={mapY(point.y) - DOT / 2}
              width={DOT}
              height={DOT}
              style={{ overflow: "visible" }}
            >
              <button
                type="button"
                disabled={solved || taken}
                aria-label={`plot the point ${spoken(point.x)} comma ${spoken(point.y)}`}
                onClick={() => choose(point)}
                style={{
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  borderRadius: "50%",
                  border: `1.5px dashed ${taken ? CIVIC : LINE}`,
                  background: "transparent",
                  cursor: solved || taken ? "default" : "pointer",
                }}
              />
            </foreignObject>
          );
        })}

        {/* Coordinate labels last, so a candidate dot never draws over the text. They pass
            clicks through, since `SvgMath` disables pointer events on its box. */}
        {pickedLabels.map(({ point, box }) => (
          <PlotLabel
            key={`l${point.x}:${point.y}`}
            box={box}
            latex={pointTex(point)}
            fontSize={LABEL_SIZE}
            color={CIVIC}
          />
        ))}

        <SvgMath
          latex={LINE_TEX}
          x={220}
          y={296}
          fontSize={20}
          color={solved ? CIVIC : LABEL}
          w={300}
        />
      </svg>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different line
        </button>
      )}

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            Two points, one line. The equation handed you{" "}
            <InlineMath latex={pointTex(INTERCEPT_POINT)} /> and the slope walked you to{" "}
            <InlineMath latex={pointTex(STEP_POINT)} />, with no table of values anywhere.
          </>
        ) : (
          (feedback ??
          (picked.length === 0 ? (
            <>
              Graph <InlineMath latex={LINE_TEX} />. Click its <InlineMath latex="y" />
              -intercept first.
            </>
          ) : (
            <>
              Intercept plotted. Now take one step of the slope from it and click where you
              land.
            </>
          )))
        )}
      </p>
    </div>
  );
}
