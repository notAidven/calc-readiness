/**
 * FUN.3 slide 3: build the graph at the break, where the two pieces actually differ.
 *
 * Away from the break a piecewise graph is just two ordinary lines, so nothing is learned by
 * drawing their middles. Everything this node is about happens at the one input the two
 * conditions are written around, and that is the whole of what the learner builds here:
 *
 *  1. Where the LEFT piece's formula ends at the break, placed by stepping a marker onto the
 *     lattice point and committing to it.
 *  2. Where the RIGHT piece's formula begins there, placed the same way. Two different heights
 *     over one input, which is the jump a single formula could never produce.
 *  3. Which of those two points is actually ON the graph, so it gets the closed dot.
 *
 * The two segments are NOT drawn until all three are settled. Drawing them earlier would put
 * the answer on screen and leave the learner reading it off rather than working it out, so the
 * evidence follows the commitment.
 *
 * The plane is self-contained, because the coordinate-plane node is a sibling of this one
 * rather than a prerequisite: both axes are numbered and the marker reports its own
 * coordinates in words as it moves. It follows the shared plane rules (`data-plot-frame`,
 * `labelSpot` + `PlotLabel`, `interiorTicks`), so `plotLayout.test.tsx` covers it.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
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
  SIGNAL,
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
import { DirectionPad } from "./DirectionPad";

/* -------------------------------------------------------------------------- */
/* The plane                                                                    */
/* -------------------------------------------------------------------------- */

const X_MIN = -5;
const X_MAX = 5;
const Y_MIN = -8;
const Y_MAX = 8;
const LEFT = 40;
const RIGHT = 424;
const TOP = 10;
const BOTTOM = 234;

const X_LINES = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const Y_LINES = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
/** The window's own edges carry no number: half the digits would fall outside the plot. */
const X_TICKS = interiorTicks([-4, -2, 2, 4], X_MIN, X_MAX);
const Y_TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], Y_MIN, Y_MAX);

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
  6,
);

/** The axis numbers, as obstacles: they are drawn inside the plot, against the axes. */
const TICK_BOXES: readonly LabelBox[] = [
  ...Y_TICKS.map((tick) => ({
    x: mapX(0) - 7 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...X_TICKS.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 10,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

/* -------------------------------------------------------------------------- */
/* Content                                                                      */
/* -------------------------------------------------------------------------- */

interface Board {
  definition: string;
  spoken: string;
  /** The input the two pieces meet at. */
  breakAt: number;
  /** Each piece's formula, and the height it reaches at the break. */
  leftFormula: string;
  leftAt: number;
  rightFormula: string;
  rightAt: number;
  /** True when the LEFT piece's condition claims the break. */
  ownerIsLeft: boolean;
  /** The condition that claims it, as LaTeX. */
  ownerCondition: string;
  /** The far end of each piece, so the drawn segments stop inside the window. */
  leftFar: { x: number; y: number };
  rightFar: { x: number; y: number };
  /** The substitution behind each height, for the reveals. */
  leftWork: string;
  rightWork: string;
}

const BOARDS: readonly Board[] = [
  {
    definition: "f(x) = \\begin{cases} x + 4 & x \\le 1 \\\\ 2x - 3 & x > 1 \\end{cases}",
    spoken: "f of x equals x plus 4 when x is at most 1, and 2x minus 3 when x is above 1",
    breakAt: 1,
    leftFormula: "x + 4",
    leftAt: 5,
    rightFormula: "2x - 3",
    rightAt: -1,
    ownerIsLeft: true,
    ownerCondition: "x \\le 1",
    leftFar: { x: -5, y: -1 },
    rightFar: { x: 5, y: 7 },
    leftWork: "1 + 4",
    rightWork: "2(1) - 3",
  },
  {
    definition: "g(x) = \\begin{cases} 1 - x & x < 2 \\\\ 2x - 9 & x \\ge 2 \\end{cases}",
    spoken:
      "g of x equals 1 minus x when x is less than 2, and 2x minus 9 when x is at least 2",
    breakAt: 2,
    leftFormula: "1 - x",
    leftAt: -1,
    rightFormula: "2x - 9",
    rightAt: -5,
    ownerIsLeft: false,
    ownerCondition: "x \\ge 2",
    leftFar: { x: -5, y: 6 },
    rightFar: { x: 5, y: 1 },
    leftWork: "1 - 2",
    rightWork: "2(2) - 9",
  },
];

/** 0 = place the left height, 1 = place the right height, 2 = rule the dots, 3 = finished. */
type Stage = 0 | 1 | 2 | 3;

export function PiecewiseGraphBuild(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <PiecewiseGraphBuildBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function PiecewiseGraphBuildBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [stage, setStage] = useState<Stage>(0);
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [placeWrong, setPlaceWrong] = useState<"x" | "y" | "both" | null>(null);
  const [missedDot, setMissedDot] = useState<"left" | "right" | null>(null);
  const [leftRevealed, setLeftRevealed] = useState(false);
  const [rightRevealed, setRightRevealed] = useState(false);
  const [dotRevealed, setDotRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const finished = stage === 3;
  const wanted = stage === 0 ? board.leftAt : board.rightAt;
  const wantedFormula = stage === 0 ? board.leftFormula : board.rightFormula;
  const leftPlaced = stage >= 1;
  const rightPlaced = stage >= 2;

  function advance(next: Stage, earned: boolean) {
    setPlaceWrong(null);
    setMissedDot(null);
    setStage(next);
    setPx(0);
    setPy(0);
    if (earned) {
      success();
    }
    if (next === 3 && !done) {
      setDone(true);
      onSolved();
    }
  }

  function move(axis: "x" | "y", delta: number) {
    setPlaceWrong(null);
    if (axis === "x") {
      setPx((value) => Math.min(X_MAX, Math.max(X_MIN, value + delta)));
    } else {
      setPy((value) => Math.min(Y_MAX, Math.max(Y_MIN, value + delta)));
    }
  }

  function place() {
    if (stage > 1) {
      return;
    }
    const xRight = px === board.breakAt;
    const yRight = py === wanted;
    if (xRight && yRight) {
      advance(stage === 0 ? 1 : 2, true);
      return;
    }
    setPlaceWrong(!xRight && !yRight ? "both" : xRight ? "y" : "x");
  }

  function ruleDot(side: "left" | "right") {
    if (stage !== 2) {
      return;
    }
    if ((side === "left") === board.ownerIsLeft) {
      advance(3, true);
      return;
    }
    setMissedDot(side);
  }

  const leftPoint = { x: board.breakAt, y: board.leftAt };
  const rightPoint = { x: board.breakAt, y: board.rightAt };
  const ownerPoint = board.ownerIsLeft ? leftPoint : rightPoint;
  const otherPoint = board.ownerIsLeft ? rightPoint : leftPoint;

  const pairLatex = (p: { x: number; y: number }) => `(${p.x},\\, ${p.y})`;
  const spokenPair = (p: { x: number; y: number }) =>
    `${p.x} comma ${p.y}`.replace(/-/g, "negative ");

  /*
   * Placed rather than nudged: the two heights are dealt per board and a fixed step would
   * run a label off the plot for a point near an edge, or print it across an axis number.
   */
  const leftBox = leftPlaced
    ? labelSpot({
        x: mapX(leftPoint.x),
        y: mapY(leftPoint.y),
        frame: LABEL_FRAME,
        dx: -1,
        dy: -1,
        halfW: labelHalfW(pairLatex(leftPoint), LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: TICK_BOXES,
      })
    : null;
  const rightBox = rightPlaced
    ? labelSpot({
        x: mapX(rightPoint.x),
        y: mapY(rightPoint.y),
        frame: LABEL_FRAME,
        dx: 1,
        dy: 1,
        halfW: labelHalfW(pairLatex(rightPoint), LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: leftBox ? [...TICK_BOXES, leftBox] : TICK_BOXES,
      })
    : null;

  let status: ReactNode;
  if (finished) {
    status = (
      <>
        Built. The two pieces reach different heights over the same input, so the graph
        jumps there, and the closed dot on <InlineMath latex={pairLatex(ownerPoint)} /> is
        what says which of the two heights the function actually takes.
      </>
    );
  } else if (placeWrong === "x") {
    status = (
      <>
        The height is right, but the marker is not over the break. Both pieces are being
        asked about the same input, <InlineMath latex={`x = ${board.breakAt}`} />.
      </>
    );
  } else if (placeWrong !== null) {
    status = (
      <>
        Not there. Put the marker over <InlineMath latex={`x = ${board.breakAt}`} /> and
        lift it to the height <InlineMath latex={wantedFormula} /> reaches at that input.
      </>
    );
  } else if (missedDot !== null) {
    status = (
      <>
        That is the piece whose condition stops short of the break, so its end is drawn
        open. The closed dot belongs to <InlineMath latex={board.ownerCondition} />.
      </>
    );
  } else if (stage === 0) {
    status = (
      <>
        Work out what <InlineMath latex={board.leftFormula} /> gives at{" "}
        <InlineMath latex={`x = ${board.breakAt}`} />, then step the marker to that point.
      </>
    );
  } else if (stage === 1) {
    status = (
      <>
        Now the other piece. Work out what <InlineMath latex={board.rightFormula} /> gives
        at the same input, and place that point too.
      </>
    );
  } else {
    status = (
      <>
        Two heights over one input. Only one of them is the function's value, so choose the
        point that gets the closed dot.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: build this graph at its break point, by placing the height each piece reaches
        there and then closing the dot on the piece that owns it.
      </WidgetTask>

      <p className="lesson-equation__naming">
        <InlineMath latex={board.definition} color={LABEL} />
      </p>

      <svg viewBox="0 0 440 250" role="img" aria-label={board.spoken}>
        <title>A coordinate plane for building a piecewise graph at its break point</title>

        <rect
          data-plot-frame=""
          x={LEFT}
          y={TOP}
          width={RIGHT - LEFT}
          height={BOTTOM - TOP}
          rx={6}
          fill="var(--paper)"
          stroke={LINE}
          strokeWidth={1}
        />
        {X_LINES.map((value) => (
          <line
            key={`v${value}`}
            x1={mapX(value)}
            y1={TOP}
            x2={mapX(value)}
            y2={BOTTOM}
            stroke={LINE}
            strokeWidth={0.75}
            opacity={0.5}
          />
        ))}
        {Y_LINES.map((value) => (
          <line
            key={`h${value}`}
            x1={LEFT}
            y1={mapY(value)}
            x2={RIGHT}
            y2={mapY(value)}
            stroke={LINE}
            strokeWidth={0.75}
            opacity={0.5}
          />
        ))}
        <line
          x1={LEFT}
          y1={mapY(0)}
          x2={RIGHT}
          y2={mapY(0)}
          stroke={SOFT}
          strokeWidth={1.4}
        />
        <line
          x1={mapX(0)}
          y1={TOP}
          x2={mapX(0)}
          y2={BOTTOM}
          stroke={SOFT}
          strokeWidth={1.4}
        />

        {/* The two segments, drawn only once every ruling is in. */}
        {finished && (
          <>
            <line
              x1={mapX(board.leftFar.x)}
              y1={mapY(board.leftFar.y)}
              x2={mapX(leftPoint.x)}
              y2={mapY(leftPoint.y)}
              stroke={CIVIC}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <line
              x1={mapX(rightPoint.x)}
              y1={mapY(rightPoint.y)}
              x2={mapX(board.rightFar.x)}
              y2={mapY(board.rightFar.y)}
              stroke={SIGNAL}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </>
        )}

        {/* Each placed height, hollow until the ruling says which one is on the graph. */}
        {leftPlaced && (
          <circle
            cx={mapX(leftPoint.x)}
            cy={mapY(leftPoint.y)}
            r={5.5}
            fill={finished && board.ownerIsLeft ? CIVIC : "var(--paper)"}
            stroke={CIVIC}
            strokeWidth={2}
          />
        )}
        {rightPlaced && (
          <circle
            cx={mapX(rightPoint.x)}
            cy={mapY(rightPoint.y)}
            r={5.5}
            fill={finished && !board.ownerIsLeft ? SIGNAL : "var(--paper)"}
            stroke={SIGNAL}
            strokeWidth={2}
          />
        )}
        {leftBox && (
          <PlotLabel
            box={leftBox}
            latex={pairLatex(leftPoint)}
            fontSize={LABEL_SIZE}
            color={CIVIC}
          />
        )}
        {rightBox && (
          <PlotLabel
            box={rightBox}
            latex={pairLatex(rightPoint)}
            fontSize={LABEL_SIZE}
            color={SIGNAL}
          />
        )}

        {/* The marker the learner is steering, while there is still one to steer. */}
        {stage <= 1 && (
          <g>
            <line
              x1={mapX(px) - 9}
              y1={mapY(py)}
              x2={mapX(px) + 9}
              y2={mapY(py)}
              stroke={BRICK}
              strokeWidth={1.6}
            />
            <line
              x1={mapX(px)}
              y1={mapY(py) - 9}
              x2={mapX(px)}
              y2={mapY(py) + 9}
              stroke={BRICK}
              strokeWidth={1.6}
            />
            <circle
              cx={mapX(px)}
              cy={mapY(py)}
              r={5}
              fill="none"
              stroke={BRICK}
              strokeWidth={2}
            />
          </g>
        )}

        {X_TICKS.map((tick) => (
          <text
            key={`tx${tick}`}
            x={mapX(tick)}
            y={mapY(0) + 14}
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
            x={mapX(0) - 7}
            y={mapY(tick) + 3.5}
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

      {stage <= 1 && (
        <>
          <p className="lesson-interactive__coords" aria-live="polite">
            <InlineMath latex={`(${px},\\, ${py})`} />
          </p>
          <div className="lesson-interactive__controls">
            <DirectionPad
              onLeft={() => move("x", -1)}
              onRight={() => move("x", 1)}
              onDown={() => move("y", -1)}
              onUp={() => move("y", 1)}
            />
            <button type="button" className="lesson-interactive__check" onClick={place}>
              {stage === 0 ? "Place the first end" : "Place the second end"}
            </button>
          </div>
        </>
      )}

      {stage === 2 && (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            data-state={missedDot === "left" ? "wrong" : undefined}
            style={{ color: LABEL, borderColor: LINE }}
            aria-label={`close the dot at ${spokenPair(leftPoint)}, the end of the first piece`}
            onClick={() => ruleDot("left")}
          >
            <InlineMath latex={pairLatex(leftPoint)} />
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            data-state={missedDot === "right" ? "wrong" : undefined}
            style={{ color: LABEL, borderColor: LINE }}
            aria-label={`close the dot at ${spokenPair(rightPoint)}, the end of the second piece`}
            onClick={() => ruleDot("right")}
          >
            <InlineMath latex={pairLatex(rightPoint)} />
          </button>
        </div>
      )}

      {finished && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different pair of pieces
        </button>
      )}

      <WidgetReveal
        available={stage === 0 && placeWrong !== null}
        revealed={leftRevealed}
        answer={<InlineMath latex={pairLatex(leftPoint)} />}
        why={
          <>
            The first piece's formula is <InlineMath latex={board.leftFormula} />, and at
            the break that comes to{" "}
            <InlineMath latex={`${board.leftWork} = ${board.leftAt}`} />. Whether that point
            is drawn open or closed is a separate question from where it sits.
          </>
        }
        onReveal={() => {
          setLeftRevealed(true);
          advance(1, false);
        }}
        label="Reveal the first end"
        othersRemain={stage !== 3}
      />

      <WidgetReveal
        available={stage === 1 && placeWrong !== null}
        revealed={rightRevealed}
        answer={<InlineMath latex={pairLatex(rightPoint)} />}
        why={
          <>
            The second piece's formula is <InlineMath latex={board.rightFormula} />, and at
            the same input it comes to{" "}
            <InlineMath latex={`${board.rightWork} = ${board.rightAt}`} />. Two formulas
            over one input reach two heights, which is where the jump comes from.
          </>
        }
        onReveal={() => {
          setRightRevealed(true);
          advance(2, false);
        }}
        label="Reveal the second end"
        othersRemain={stage !== 3}
      />

      <WidgetReveal
        available={stage === 2 && missedDot !== null}
        revealed={dotRevealed}
        answer={<InlineMath latex={pairLatex(ownerPoint)} />}
        why={
          <>
            <InlineMath latex={board.ownerCondition} /> is written without the strictness,
            so that piece takes in the break and its end is on the graph. The other piece
            stops short of it, so <InlineMath latex={pairLatex(otherPoint)} /> is drawn open
            and is not a point of the graph at all.
          </>
        }
        onReveal={() => {
          setDotRevealed(true);
          advance(3, false);
        }}
        label="Reveal which end is closed"
      />

      <p
        className="lesson-interactive__status"
        data-state={
          finished
            ? "solved"
            : placeWrong !== null || missedDot !== null
              ? "wrong"
              : "prompt"
        }
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
