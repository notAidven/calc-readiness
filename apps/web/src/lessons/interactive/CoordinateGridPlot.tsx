/**
 * CG.1 interactive (slide 0): a position IS two signed measurements from the origin, and the
 * two directions of that correspondence are different skills.
 *
 * So the board asks both, in order. First the learner is given a pair and has to WALK a
 * marker to it, with no coordinate readout on screen: the readout is what would turn the
 * round into watching a number match, where counting squares out from the origin is the
 * thing slide 0 is about. Then a second rod is already standing somewhere on the grid and
 * the learner types the pair that names it, which is the same correspondence read the other
 * way and is the half that produces a value rather than a position.
 *
 * The marker starts at the origin every round, so a learner who has understood "four left,
 * three up" can execute it, and one who has read the pair backwards ends up at the reflected
 * point and is told to count across before up rather than being told which coordinate is
 * wrong.
 *
 * Neither board reuses the check's numbers, and both are stepped rather than clicked, so the
 * widget is fully keyboard-operable and no pointer position has to be resolved into plane
 * coordinates.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  interiorTicks,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
  SOFT,
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
import { DirectionPad } from "./DirectionPad";

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 70;
const RIGHT = 370;
const TOP = 12;
const BOTTOM = 312;
/** `±6` is the plot's border, and a number centered on the border is half outside it. */
const TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], X_MIN, X_MAX);
const GRID = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const LABEL_SIZE = 13;
const TICK_SIZE = 10;

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

const LABEL_FRAME = plotLabelFrame(
  { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM },
  8,
);

/**
 * The axis numbers, as obstacles. They are drawn inside the plot against the axes, so a
 * coordinate label placed near an axis lands on one unless it is told they are there.
 */
const TICK_BOXES: readonly LabelBox[] = [
  ...TICKS.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick) - 1,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...TICKS.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 10,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

interface Point {
  x: number;
  y: number;
}

interface Board {
  /** The pair the learner is given, to be walked to. */
  walk: Point;
  /** The rod already standing on the grid, to be named. */
  read: Point;
}

/**
 * Two boards. Every coordinate is signed differently across the four points, so a restart
 * is a genuinely different question rather than the same quadrant twice, and none of them
 * is a point the check or its worked solution uses.
 */
const BOARDS: readonly Board[] = [
  { walk: { x: -4, y: 3 }, read: { x: 2, y: -5 } },
  { walk: { x: 5, y: -2 }, read: { x: -3, y: -4 } },
];

function pairTex(p: Point): string {
  return `(${p.x},\\, ${p.y})`;
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/** A typed integer, or null when the entry is not one. */
function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function CoordinateGridPlot(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <CoordinateGridPlotBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CoordinateGridPlotBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  /** 0 walk the marker to the given pair, 1 name the rod already standing. */
  const [round, setRound] = useState(0);
  const [marker, setMarker] = useState<Point>({ x: 0, y: 0 });
  const [across, setAcross] = useState("");
  const [up, setUp] = useState("");
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const target = round === 0 ? board.walk : board.read;

  /** Close the board out. `earned` is false when the learner was told the answer. */
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

  function move(axis: "x" | "y", delta: number) {
    if (round !== 0 || solved) {
      return;
    }
    setFeedback(null);
    setMarker((prev) =>
      axis === "x"
        ? { ...prev, x: Math.min(X_MAX, Math.max(X_MIN, prev.x + delta)) }
        : { ...prev, y: Math.min(Y_MAX, Math.max(Y_MIN, prev.y + delta)) },
    );
  }

  function place() {
    if (round !== 0 || solved) {
      return;
    }
    setTried(true);
    if (marker.x === board.walk.x && marker.y === board.walk.y) {
      success();
      setFeedback(null);
      setRound(1);
      return;
    }
    setFeedback(
      "Not there yet. Count across from the origin first and up or down second, and let a step to the left or below the origin take the minus sign with it.",
    );
  }

  function checkName() {
    if (round !== 1 || solved) {
      return;
    }
    setTried(true);
    const typedAcross = parseInteger(across);
    const typedUp = parseInteger(up);
    if (typedAcross === null || typedUp === null) {
      setFeedback("Each coordinate is a whole number, and it may be negative.");
      return;
    }
    if (typedAcross === board.read.x && typedUp === board.read.y) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Read the rod's across coordinate off the horizontal axis and its up coordinate off the vertical one, and give each of them the sign of the side of the origin it is on.",
    );
  }

  function reveal() {
    setRevealed(true);
    if (round === 1) {
      setAcross(String(board.read.x));
      setUp(String(board.read.y));
    }
    finish(false);
  }

  /* ---------------------------------------------------------------- the labels */

  const placedRod = round === 1 || solved;
  const walkLabel = labelSpot({
    x: mapX(board.walk.x),
    y: mapY(board.walk.y),
    frame: LABEL_FRAME,
    dx: board.walk.x > 0 ? -1 : 1,
    dy: board.walk.y > 0 ? 1 : -1,
    halfW: labelHalfW(pairTex(board.walk), LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: TICK_BOXES,
  });
  const readLabel = labelSpot({
    x: mapX(board.read.x),
    y: mapY(board.read.y),
    frame: LABEL_FRAME,
    dx: board.read.x > 0 ? -1 : 1,
    dy: board.read.y > 0 ? 1 : -1,
    halfW: labelHalfW(pairTex(board.read), LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, walkLabel],
  });

  /* --------------------------------------------------------------------- copy */

  let status: ReactNode;
  if (revealed) {
    status = null;
  } else if (solved) {
    status = (
      <>
        Both ways round. A pair says how far across and then how far up, and the second rod
        stands at <InlineMath latex={pairTex(board.read)} />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (round === 1) {
    status = (
      <>
        The first rod is planted. A second rod is already standing on the grid, and it has
        no pair on it yet.
      </>
    );
  } else {
    status = (
      <>
        The marker starts at the origin. Nothing on screen counts the squares for you, so
        step it across and then up or down.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: plant a rod at the pair you are given, then name the pair of the rod that is
        already standing.
      </WidgetTask>

      {/* 360, not the default 460: the grid's 440x324 viewBox is 338.7px tall at 460, and this
        board carries 58.4px of chrome around it, so the full-width column put it 47px past the
        350px band the pinned control row leaves. 360 draws it 265px tall. */}
      <WidgetBeside
        figureWidth={360}
        figure={
          <svg
            viewBox="0 0 440 324"
            role="img"
            aria-label={
              round === 0
                ? `A survey grid with a marker at the origin, waiting to be stepped to ${spoken(board.walk.x)}, ${spoken(board.walk.y)}`
                : `A survey grid with a rod planted at ${spoken(board.walk.x)}, ${spoken(board.walk.y)} and a second rod standing at an unnamed position`
            }
          >
            <title>Step a marker to a named position on a survey grid</title>

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
            {GRID.map((value) => (
              <g key={`grid${value}`}>
                <line
                  x1={mapX(value)}
                  y1={TOP}
                  x2={mapX(value)}
                  y2={BOTTOM}
                  stroke={LINE}
                  strokeWidth={0.5}
                />
                <line
                  x1={LEFT}
                  y1={mapY(value)}
                  x2={RIGHT}
                  y2={mapY(value)}
                  stroke={LINE}
                  strokeWidth={0.5}
                />
              </g>
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
            {TICKS.map((tick) => (
              <text
                key={`xt${tick}`}
                x={mapX(tick)}
                y={mapY(0) + 14}
                textAnchor="middle"
                fontSize={TICK_SIZE}
                fill={SOFT}
              >
                {tick}
              </text>
            ))}
            {TICKS.map((tick) => (
              <text
                key={`yt${tick}`}
                x={mapX(0) - 8}
                y={mapY(tick) + 3}
                textAnchor="end"
                fontSize={TICK_SIZE}
                fill={SOFT}
              >
                {tick}
              </text>
            ))}

            {/* The origin, named once, because everything on the board is measured from it. */}
            <circle cx={mapX(0)} cy={mapY(0)} r={3.5} fill={SOFT} />

            {round === 0 && !solved && (
              <g>
                <line
                  x1={mapX(marker.x) - 9}
                  y1={mapY(marker.y)}
                  x2={mapX(marker.x) + 9}
                  y2={mapY(marker.y)}
                  stroke={BRICK}
                  strokeWidth={1.6}
                />
                <line
                  x1={mapX(marker.x)}
                  y1={mapY(marker.y) - 9}
                  x2={mapX(marker.x)}
                  y2={mapY(marker.y) + 9}
                  stroke={BRICK}
                  strokeWidth={1.6}
                />
                <circle
                  cx={mapX(marker.x)}
                  cy={mapY(marker.y)}
                  r={5}
                  fill="none"
                  stroke={BRICK}
                  strokeWidth={2}
                />
              </g>
            )}

            {placedRod && (
              <g>
                <circle
                  cx={mapX(board.walk.x)}
                  cy={mapY(board.walk.y)}
                  r={5.5}
                  fill={CIVIC}
                />
                <PlotLabel
                  box={walkLabel}
                  latex={pairTex(board.walk)}
                  fontSize={LABEL_SIZE}
                  color={CIVIC}
                />
              </g>
            )}

            {round === 1 && (
              <circle
                cx={mapX(board.read.x)}
                cy={mapY(board.read.y)}
                r={5.5}
                fill={SIGNAL}
              />
            )}
            {solved && (
              <PlotLabel
                box={readLabel}
                latex={pairTex(board.read)}
                fontSize={LABEL_SIZE}
                color={SIGNAL}
              />
            )}
          </svg>
        }
      >
        {round === 0 && !solved && (
          <>
            <p className="lesson-interactive__coords">
              Plant the rod at <InlineMath latex={pairTex(board.walk)} />
            </p>
            <div className="lesson-interactive__controls">
              <DirectionPad
                onLeft={() => move("x", -1)}
                onRight={() => move("x", 1)}
                onDown={() => move("y", -1)}
                onUp={() => move("y", 1)}
              />
              <button type="button" className="lesson-interactive__check" onClick={place}>
                Plant the rod
              </button>
            </div>
          </>
        )}

        {round === 1 && !solved && (
          <div className="lesson-interactive__controls">
            <div className="lesson-interactive__field" style={{ color: SIGNAL }}>
              <span className="lesson-interactive__field-label">across</span>
              <input
                className="lesson-interactive__input"
                type="text"
                inputMode="text"
                value={across}
                aria-label="the across coordinate of the standing rod"
                onChange={(event) => setAcross(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    checkName();
                  }
                }}
              />
            </div>
            <div className="lesson-interactive__field" style={{ color: SIGNAL }}>
              <span className="lesson-interactive__field-label">up</span>
              <input
                className="lesson-interactive__input"
                type="text"
                inputMode="text"
                value={up}
                aria-label="the up coordinate of the standing rod"
                onChange={(event) => setUp(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    checkName();
                  }
                }}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={checkName}>
              Check
            </button>
          </div>
        )}

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different pair of positions
          </button>
        )}

        <WidgetReveal
          available={!solved && tried}
          revealed={revealed}
          answer={<InlineMath latex={pairTex(target)} />}
          why={
            round === 0 ? (
              <>
                The first number is the across measurement, so step{" "}
                <InlineMath latex={String(Math.abs(board.walk.x))} /> to the{" "}
                {board.walk.x < 0 ? "left" : "right"}, and the second is the up measurement,
                so step <InlineMath latex={String(Math.abs(board.walk.y))} />{" "}
                {board.walk.y < 0 ? "down" : "up"} from there.
              </>
            ) : (
              <>
                The rod stands <InlineMath latex={String(Math.abs(board.read.x))} /> squares
                to the {board.read.x < 0 ? "left" : "right"} of the origin, which makes its
                across coordinate <InlineMath latex={String(board.read.x)} />, and{" "}
                <InlineMath latex={String(Math.abs(board.read.y))} />{" "}
                {board.read.y < 0 ? "below" : "above"} it, which makes its up coordinate{" "}
                <InlineMath latex={String(board.read.y)} />.
              </>
            )
          }
          onReveal={reveal}
          othersRemain={round === 0}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
