/**
 * CG.1 interactive (slide 3): the two questions a segment invites, worked one row at a time.
 *
 * The midpoint comes first and the distance second, because they are the same two
 * differences read two ways and meeting them in that order is what makes the second one feel
 * like the first one squared rather than a new formula. The midpoint row averages; the legs
 * row measures the same two gaps as lengths; the distance row squares and adds them.
 *
 * Every blank sits where its value sits in the mathematics: the midpoint is typed into an
 * ordered pair with its own parentheses and comma, not into two captioned boxes, because the
 * answer to "where is the center" is a point.
 *
 * The right triangle is not drawn until the legs row lands, so the two lengths are produced
 * from the coordinates rather than counted off a picture that was already showing them. The
 * three boards all separate their points by legs whose hypotenuse comes out whole, so the
 * distance is a number the learner can finish rather than a radical this node never taught,
 * and they differ in the position of the center as well as in the length.
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

const X_MIN = -9;
const X_MAX = 9;
const Y_MIN = -9;
const Y_MAX = 9;
const LEFT = 70;
const RIGHT = 370;
const TOP = 12;
const BOTTOM = 312;
/** Numbered every three, and never on the border, which is where half a digit falls out. */
const TICKS = interiorTicks([-9, -6, -3, 3, 6, 9], X_MIN, X_MAX);
const GRID = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
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
  first: Point;
  second: Point;
}

/**
 * Three segments. Both coordinate sums are even in each, so the center lands on the lattice
 * and can be typed as two whole numbers, and the legs of each are a pair whose hypotenuse is
 * whole. The centers are three different places and the third segment is twice the length of
 * the other two, so a restart is a different question rather than the same one moved.
 */
const BOARDS: readonly Board[] = [
  { first: { x: -4, y: -3 }, second: { x: 2, y: 5 } },
  { first: { x: 5, y: -6 }, second: { x: -3, y: 0 } },
  { first: { x: -6, y: -8 }, second: { x: 6, y: 8 } },
];

function pairTex(p: Point): string {
  return `(${p.x},\\, ${p.y})`;
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/** The value being subtracted in a difference: a negative one keeps its parentheses. */
function sub(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
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

/** One blank, in the position of the value it holds. See `LinearSlopeWalkthrough`. */
function Slot({
  state,
  value,
  settled,
  aria,
  color,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  settled: string;
  aria: string;
  color: string;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (state === "done") {
    return (
      <span className="lesson-equation__slot lesson-equation__slot--done" style={{ color }}>
        <InlineMath latex={settled} />
      </span>
    );
  }
  if (state === "locked") {
    return <span className="lesson-equation__slot lesson-equation__slot--locked" />;
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color }}
      type="text"
      inputMode="text"
      value={value}
      aria-label={aria}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

/** One row of the walkthrough: what it produces, the expression, and its Check button. */
function Stage({
  name,
  state,
  onCheck,
  children,
}: {
  name: string;
  state: "locked" | "open" | "done";
  onCheck: () => void;
  children: ReactNode;
}) {
  return (
    <div className="lesson-equation__row" data-state={state}>
      <span className="lesson-equation__stage">{name}</span>
      <span className="lesson-equation__body">{children}</span>
      {state === "open" ? (
        <button type="button" className="lesson-interactive__check" onClick={onCheck}>
          Check
        </button>
      ) : null}
    </div>
  );
}

export function CoordinateDistanceMidpoint(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <CoordinateDistanceMidpointBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CoordinateDistanceMidpointBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { first, second } = board;
  const mid: Point = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  const legAcross = Math.abs(second.x - first.x);
  const legUp = Math.abs(second.y - first.y);
  const distance = Math.round(Math.sqrt(legAcross ** 2 + legUp ** 2));

  /** 0 the center, 1 the two legs, 2 the length, 3 done. */
  const [row, setRow] = useState(0);
  const [midEntry, setMidEntry] = useState({ x: "", y: "" });
  const [midDone, setMidDone] = useState({ x: false, y: false });
  const [legEntry, setLegEntry] = useState({ across: "", up: "" });
  const [legDone, setLegDone] = useState({ across: false, up: false });
  const [distEntry, setDistEntry] = useState("");
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = row >= 3;

  function stageState(at: number): "locked" | "open" | "done" {
    if (row > at) {
      return "done";
    }
    return row === at ? "open" : "locked";
  }

  function latch() {
    setRow(3);
    setFeedback(null);
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function checkMid() {
    if (row !== 0) {
      return;
    }
    setTried(true);
    const next = {
      x: midDone.x || parseInteger(midEntry.x) === mid.x,
      y: midDone.y || parseInteger(midEntry.y) === mid.y,
    };
    const landed = (next.x && !midDone.x) || (next.y && !midDone.y);
    setMidDone(next);
    if (landed) {
      success();
    }
    if (next.x && next.y) {
      setFeedback(null);
      setRow(1);
      return;
    }
    setFeedback(
      <>
        Not yet. Average the two ends one coordinate at a time:{" "}
        <InlineMath latex={`\\dfrac{${first.x} + ${sub(second.x)}}{2}`} /> across and{" "}
        <InlineMath latex={`\\dfrac{${first.y} + ${sub(second.y)}}{2}`} /> up.
      </>,
    );
  }

  function checkLegs() {
    if (row !== 1) {
      return;
    }
    setTried(true);
    const next = {
      across: legDone.across || parseInteger(legEntry.across) === legAcross,
      up: legDone.up || parseInteger(legEntry.up) === legUp,
    };
    const landed = (next.across && !legDone.across) || (next.up && !legDone.up);
    setLegDone(next);
    if (landed) {
      success();
    }
    if (next.across && next.up) {
      setFeedback(null);
      setRow(2);
      return;
    }
    setFeedback(
      <>
        Not yet. A leg is how far apart two coordinates are, so it is a length and never
        negative: <InlineMath latex={`${second.x} - ${sub(first.x)}`} /> across and{" "}
        <InlineMath latex={`${second.y} - ${sub(first.y)}`} /> up, each taken as a positive
        distance.
      </>,
    );
  }

  function checkDistance() {
    if (row !== 2) {
      return;
    }
    setTried(true);
    const typed = parseInteger(distEntry);
    if (typed === null) {
      setFeedback("The length comes out a whole number here.");
      return;
    }
    if (typed === distance) {
      success();
      latch();
      return;
    }
    if (typed === legAcross + legUp) {
      setFeedback(
        <>
          That is the two legs added, which is the way round the corner rather than across
          it. Square each leg first, add the squares, and take the square root of the total.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not yet. Square the legs and add:{" "}
        <InlineMath latex={`${legAcross}^{2} + ${legUp}^{2}`} />, then take the square root
        of what that comes to.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    setMidEntry({ x: String(mid.x), y: String(mid.y) });
    setMidDone({ x: true, y: true });
    setLegEntry({ across: String(legAcross), up: String(legUp) });
    setLegDone({ across: true, up: true });
    setDistEntry(String(distance));
    latch();
  }

  /* ---------------------------------------------------------------- the labels */

  const firstTex = pairTex(first);
  const secondTex = pairTex(second);
  const midTex = pairTex(mid);
  const acrossTex = `\\text{across} = ${legAcross}`;
  const upTex = `\\text{up} = ${legUp}`;

  /*
   * The two leg labels are placed first, since where they can go is dictated by the legs
   * themselves: each takes the side of its leg away from the triangle's body. The point
   * labels are then placed against them, so a point whose preferred side is blocked by the
   * plot edge cannot flip onto a leg label instead.
   */
  const acrossLabel = labelSpot({
    x: (mapX(first.x) + mapX(second.x)) / 2,
    y: mapY(first.y),
    frame: LABEL_FRAME,
    dx: 0,
    dy: second.y > first.y ? 1 : -1,
    halfW: labelHalfW(acrossTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: TICK_BOXES,
  });
  const upLabel = labelSpot({
    x: mapX(second.x),
    y: (mapY(first.y) + mapY(second.y)) / 2,
    frame: LABEL_FRAME,
    dx: second.x > first.x ? 1 : -1,
    dy: 0,
    halfW: labelHalfW(upTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: [...TICK_BOXES, acrossLabel],
  });
  const legLabels = row >= 2 ? [acrossLabel, upLabel] : [];
  const midLabel = labelSpot({
    x: mapX(mid.x),
    y: mapY(mid.y),
    frame: LABEL_FRAME,
    dx: second.x > first.x ? -1 : 1,
    dy: second.y > first.y ? -1 : 1,
    halfW: labelHalfW(midTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels],
  });
  const midLabels = row >= 1 ? [midLabel] : [];
  const firstLabel = labelSpot({
    x: mapX(first.x),
    y: mapY(first.y),
    frame: LABEL_FRAME,
    dx: second.x > first.x ? -1 : 1,
    dy: second.y > first.y ? 1 : -1,
    halfW: labelHalfW(firstTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels, ...midLabels],
  });
  const secondLabel = labelSpot({
    x: mapX(second.x),
    y: mapY(second.y),
    frame: LABEL_FRAME,
    dx: second.x > first.x ? 1 : -1,
    dy: second.y > first.y ? -1 : 1,
    halfW: labelHalfW(secondTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels, ...midLabels, firstLabel],
  });

  /* --------------------------------------------------------------------- copy */

  let status: ReactNode;
  if (revealed) {
    status = null;
  } else if (solved) {
    status = (
      <>
        Both questions answered off the same two differences: averaged they give the center,
        squared and added they give the length <InlineMath latex={String(distance)} />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (row === 2) {
    status = (
      <>
        The triangle is on the board. Its two legs are known, so the segment across them is
        the hypotenuse.
      </>
    );
  } else if (row === 1) {
    status = (
      <>
        The center is planted. Now measure the two gaps between the ends, one along the grid
        and one up it.
      </>
    );
  } else {
    status = (
      <>
        Start with the center. It averages the two ends one coordinate at a time, so it is
        two small sums rather than one.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--walkthrough">
      <WidgetTask>
        Goal: produce the center of this segment as a point, then its two legs, then how
        long the segment itself is.
      </WidgetTask>

      <svg
        viewBox="0 0 440 324"
        role="img"
        aria-label={`A segment from ${spoken(first.x)}, ${spoken(first.y)} to ${spoken(second.x)}, ${spoken(second.y)}, measured one row at a time`}
      >
        <title>Find the center and the length of a segment</title>

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
          strokeWidth={1.5}
        />
        <line
          x1={mapX(0)}
          y1={TOP}
          x2={mapX(0)}
          y2={BOTTOM}
          stroke={SOFT}
          strokeWidth={1.5}
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

        {row >= 2 && (
          <>
            <line
              x1={mapX(first.x)}
              y1={mapY(first.y)}
              x2={mapX(second.x)}
              y2={mapY(first.y)}
              stroke={CIVIC}
              strokeWidth={2.25}
              strokeDasharray="6 4"
            />
            <line
              x1={mapX(second.x)}
              y1={mapY(first.y)}
              x2={mapX(second.x)}
              y2={mapY(second.y)}
              stroke={BRICK}
              strokeWidth={2.25}
              strokeDasharray="6 4"
            />
          </>
        )}

        <line
          x1={mapX(first.x)}
          y1={mapY(first.y)}
          x2={mapX(second.x)}
          y2={mapY(second.y)}
          stroke={solved ? CIVIC : LABEL}
          strokeWidth={2.25}
        />

        {row >= 2 && (
          <>
            <PlotLabel
              box={acrossLabel}
              latex={acrossTex}
              fontSize={LABEL_SIZE}
              color={CIVIC}
            />
            <PlotLabel box={upLabel} latex={upTex} fontSize={LABEL_SIZE} color={BRICK} />
          </>
        )}

        <circle cx={mapX(first.x)} cy={mapY(first.y)} r={5.5} fill={LABEL} />
        <circle cx={mapX(second.x)} cy={mapY(second.y)} r={5.5} fill={SIGNAL} />
        <PlotLabel box={firstLabel} latex={firstTex} fontSize={LABEL_SIZE} color={LABEL} />
        <PlotLabel
          box={secondLabel}
          latex={secondTex}
          fontSize={LABEL_SIZE}
          color={SIGNAL}
        />

        {row >= 1 && (
          <g>
            <circle
              cx={mapX(mid.x)}
              cy={mapY(mid.y)}
              r={5}
              fill="none"
              stroke={CIVIC}
              strokeWidth={2.5}
            />
            <PlotLabel box={midLabel} latex={midTex} fontSize={LABEL_SIZE} color={CIVIC} />
          </g>
        )}
      </svg>

      <div className="lesson-equation">
        <Stage name="midpoint" state={stageState(0)} onCheck={checkMid}>
          <InlineMath latex="(" />
          <Slot
            state={midDone.x ? "done" : stageState(0)}
            value={midEntry.x}
            settled={String(mid.x)}
            aria="the across coordinate of the center"
            color={CIVIC}
            onChange={(next) => setMidEntry((prev) => ({ ...prev, x: next }))}
            onEnter={checkMid}
          />
          <InlineMath latex=",\," />
          <Slot
            state={midDone.y ? "done" : stageState(0)}
            value={midEntry.y}
            settled={String(mid.y)}
            aria="the up coordinate of the center"
            color={CIVIC}
            onChange={(next) => setMidEntry((prev) => ({ ...prev, y: next }))}
            onEnter={checkMid}
          />
          <InlineMath latex=")" />
        </Stage>

        <Stage name="legs" state={stageState(1)} onCheck={checkLegs}>
          <InlineMath latex="\text{across} =" />
          <Slot
            state={legDone.across ? "done" : stageState(1)}
            value={legEntry.across}
            settled={String(legAcross)}
            aria="the length of the leg along the grid"
            color={CIVIC}
            onChange={(next) => setLegEntry((prev) => ({ ...prev, across: next }))}
            onEnter={checkLegs}
          />
          <InlineMath latex="\quad \text{up} =" />
          <Slot
            state={legDone.up ? "done" : stageState(1)}
            value={legEntry.up}
            settled={String(legUp)}
            aria="the length of the leg up the grid"
            color={BRICK}
            onChange={(next) => setLegEntry((prev) => ({ ...prev, up: next }))}
            onEnter={checkLegs}
          />
        </Stage>

        <Stage name="distance" state={stageState(2)} onCheck={checkDistance}>
          <InlineMath latex="d =" />
          <Slot
            state={stageState(2)}
            value={distEntry}
            settled={String(distance)}
            aria="the length of the segment"
            color={SIGNAL}
            onChange={setDistEntry}
            onEnter={checkDistance}
          />
        </Stage>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different segment
        </button>
      )}

      <WidgetReveal
        available={!solved && tried}
        revealed={revealed}
        answer={
          row === 0 ? (
            <InlineMath latex={midTex} />
          ) : row === 1 ? (
            <InlineMath latex={`${legAcross} \\text{ and } ${legUp}`} />
          ) : (
            <InlineMath latex={String(distance)} />
          )
        }
        why={
          row === 0 ? (
            <>
              The center averages the two ends one coordinate at a time, so it is{" "}
              <InlineMath latex={`\\dfrac{${first.x} + ${sub(second.x)}}{2} = ${mid.x}`} />{" "}
              across and{" "}
              <InlineMath latex={`\\dfrac{${first.y} + ${sub(second.y)}}{2} = ${mid.y}`} />{" "}
              up.
            </>
          ) : row === 1 ? (
            <>
              Each leg is how far apart one pair of coordinates is, taken as a length:{" "}
              <InlineMath latex={`${second.x} - ${sub(first.x)}`} /> gives{" "}
              <InlineMath latex={String(legAcross)} /> across, and{" "}
              <InlineMath latex={`${second.y} - ${sub(first.y)}`} /> gives{" "}
              <InlineMath latex={String(legUp)} /> up.
            </>
          ) : (
            <>
              The legs meet at a right angle, so the segment is the hypotenuse:{" "}
              <InlineMath
                latex={`${legAcross}^{2} + ${legUp}^{2} = ${legAcross ** 2 + legUp ** 2}`}
              />
              , and <InlineMath latex={`\\sqrt{${distance ** 2}} = ${distance}`} />.
            </>
          )
        }
        onReveal={reveal}
        othersRemain={row < 2}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
