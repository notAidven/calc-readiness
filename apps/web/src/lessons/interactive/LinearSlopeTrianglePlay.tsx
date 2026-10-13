/**
 * LF.1 interactive (slide 1): the rise-over-run triangle, built by hand.
 *
 * One point is nailed down and the learner walks the second one around the lattice with
 * four step buttons (real buttons rather than a pointer drag, so the widget is keyboard
 * operable and testable). The run leg, the rise leg and the line through both points
 * redraw on every step, and the slope readout reduces live.
 *
 * The gate is two REQUESTED slopes in a row, a positive whole number and a negative
 * fraction, so passing takes a deliberate construction twice rather than one lucky nudge.
 * Parking the mover directly above or below the fixed point is allowed on purpose: that is
 * where the run is zero and the slope is undefined, which slide 2 leans on.
 *
 * Two boards rotate on "start over", because a reset that deals the anchor and the targets
 * back asks the learner to walk a route they have already found. The second board moves the
 * anchor into the first quadrant and asks for a steeper fall and a shallower climb, so the
 * lattice search is genuinely a different one rather than the same one relabelled.
 *
 * The reveal names the point that builds the slope being asked for, and the walk that
 * reaches it, because the readout only ever says what the learner HAS built: nothing on the
 * board converges on a requested slope, so a learner who cannot see the route has nowhere
 * to get it from. While the other target is still outstanding it hands the board back
 * rather than spending it, so the one already built is not thrown away.
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
import { DirectionPad } from "./DirectionPad";

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 76;
const RIGHT = 364;
const TOP = 14;
const BOTTOM = 302;
/** `±6` is the plot's border, and a number centered on the border is half outside it. */
const TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], X_MIN, X_MAX);

/** Labels belong inside the plot, off its border by enough not to read as touching it. */
const LABEL_FRAME = plotLabelFrame(
  { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM },
  8,
);

/** The size every label on the plot is drawn at, and so the size they are placed as. */
const LABEL_SIZE = 13;

const TICK_SIZE = 10;

/**
 * The axis tick numbers, as obstacles. They are drawn inside the plot, against the axes, so a
 * label placed anywhere near an axis is placed on top of one unless it knows they are there.
 * Modelled one box per tick rather than as two full bands, so a label can still slot into the
 * space BETWEEN two ticks, which is usually where it wants to be, and sized to the digits
 * themselves so the ticks do not reserve more of a crowded plot than they occupy.
 */
const TICK_BOXES: readonly LabelBox[] = [
  // The y ticks are drawn right-aligned against the axis, so their ink runs left from there.
  // Each `y` is the ink's middle, which sits about 4 above the baseline the `<text>` is
  // drawn at. Getting that wrong shows up as a label parked one line off a tick.
  ...TICKS.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick) - 1,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...TICKS.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

interface Point {
  x: number;
  y: number;
}

interface Target {
  latex: string;
  aria: string;
  value: number;
  /**
   * One lattice point that builds this slope from the board's anchor.
   *
   * Authored rather than searched for, because the reveal has to name a route the learner
   * can walk, and "any point on the line" includes the ones outside the window.
   */
  at: Point;
}

interface Board {
  /** The nailed-down point. */
  anchor: Point;
  /** Where the mover starts: a slope that is neither requested target. */
  start: Point;
  targets: readonly Target[];
}

const BOARDS: readonly Board[] = [
  {
    anchor: { x: -3, y: -2 },
    start: { x: 0, y: 1 },
    targets: [
      { latex: "m = 2", aria: "slope 2", value: 2, at: { x: -1, y: 2 } },
      {
        latex: "m = -\\dfrac{1}{2}",
        aria: "slope negative one half",
        value: -0.5,
        at: { x: 1, y: -4 },
      },
    ],
  },
  {
    // The anchor moves into the first quadrant and both targets change sign class: a
    // whole-number FALL and a fractional CLIMB, where board one asks for a whole-number
    // climb and a fractional fall.
    anchor: { x: 2, y: 3 },
    start: { x: 0, y: 0 },
    targets: [
      { latex: "m = -3", aria: "slope negative 3", value: -3, at: { x: 3, y: 0 } },
      {
        latex: "m = \\dfrac{2}{3}",
        aria: "slope two thirds",
        value: 2 / 3,
        at: { x: 5, y: 5 },
      },
    ],
  },
];

function boardAt(index: number): Board {
  return BOARDS[index] ?? (BOARDS[0] as Board);
}

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** A fraction reduced with the sign carried by the numerator. */
function reduceParts(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: Math.abs(d) / g };
}

/**
 * `\dfrac{n}{d}`, followed by `= <reduced>` ONLY when reducing changes something. Written
 * unconditionally it would print the same fraction on both sides of the equals sign for
 * every already-reduced position the learner steps through.
 */
function slopeTex(n: number, d: number): string {
  const raw = `\\dfrac{${n}}{${d}}`;
  const r = reduceParts(n, d);
  if (r.n === n && r.d === d) {
    return raw;
  }
  return `${raw} = ${r.d === 1 ? `${r.n}` : `\\dfrac{${r.n}}{${r.d}}`}`;
}

/** The visible span of the line through the anchor with the given slope, in math units. */
function lineEnds(anchor: Point, slope: number): readonly [Point, Point] | null {
  const found: Point[] = [];
  const yLeft = anchor.y + slope * (X_MIN - anchor.x);
  const yRight = anchor.y + slope * (X_MAX - anchor.x);
  if (yLeft >= Y_MIN && yLeft <= Y_MAX) {
    found.push({ x: X_MIN, y: yLeft });
  }
  if (yRight >= Y_MIN && yRight <= Y_MAX) {
    found.push({ x: X_MAX, y: yRight });
  }
  if (slope !== 0) {
    const xLow = anchor.x + (Y_MIN - anchor.y) / slope;
    const xHigh = anchor.x + (Y_MAX - anchor.y) / slope;
    if (xLow > X_MIN && xLow < X_MAX) {
      found.push({ x: xLow, y: Y_MIN });
    }
    if (xHigh > X_MIN && xHigh < X_MAX) {
      found.push({ x: xHigh, y: Y_MAX });
    }
  }
  const first = found[0];
  const second = found[1];
  return first && second ? [first, second] : null;
}

function pointTex(point: Point): string {
  return `(${point.x},\\, ${point.y})`;
}

function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

export function LinearSlopeTrianglePlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearSlopeTrianglePlayBody
      key={variant.nonce}
      board={boardAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearSlopeTrianglePlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const { anchor, start, targets } = board;
  const [mover, setMover] = useState<Point>(start);
  const [moves, setMoves] = useState(0);
  const [hits, setHits] = useState<readonly number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const run = mover.x - anchor.x;
  const rise = mover.y - anchor.y;
  const vertical = run === 0;
  const solved = hits.length === targets.length;
  const targetIndex = targets.findIndex((_target, index) => !hits.includes(index));
  const target = targetIndex === -1 ? undefined : targets[targetIndex];

  function step(dx: number, dy: number) {
    let nx = mover.x + dx;
    let ny = mover.y + dy;
    // Never park the mover on top of the anchor: with both differences zero there is no
    // triangle at all, which teaches nothing.
    if (nx === anchor.x && ny === anchor.y) {
      nx += dx;
      ny += dy;
    }
    if (nx < X_MIN || nx > X_MAX || ny < Y_MIN || ny > Y_MAX) {
      return;
    }
    const next = { x: nx, y: ny };
    setMover(next);
    setMoves((count) => count + 1);

    const nextRun = next.x - anchor.x;
    if (nextRun === 0 || target === undefined) {
      return;
    }
    const slope = (next.y - anchor.y) / nextRun;
    if (Math.abs(slope - target.value) > 1e-9) {
      return;
    }
    const nextHits = [...hits, targetIndex];
    setHits(nextHits);
    success();
    if (nextHits.length === targets.length) {
      onSolved();
    }
  }

  /**
   * The reveal's own fill: park the mover where the requested slope is built and credit the
   * target, without the badge, because nothing was answered.
   *
   * Only the reveal that lets the learner past runs this, so it can safely mark the target:
   * the reveal that re-asks is about to replace the board this would have written into.
   */
  function fillIn() {
    setRevealed(true);
    if (target === undefined) {
      return;
    }
    setMover(target.at);
    setHits((current) => [...current, targetIndex]);
  }

  /**
   * The walk from the anchor to the point that builds the requested slope, in words.
   *
   * Spelled out rather than signed, because the reveal is teaching that a slope is a route:
   * "3 to the right and 2 down" is a thing to do, and `+3, -2` is a thing to read.
   */
  const legs =
    target === undefined
      ? null
      : {
          acrossWord: `${Math.abs(target.at.x - anchor.x)} ${
            target.at.x > anchor.x ? "to the right" : "to the left"
          }`,
          upWord: `${Math.abs(target.at.y - anchor.y)} ${
            target.at.y > anchor.y ? "up" : "down"
          }`,
        };

  const ends = vertical ? null : lineEnds(anchor, rise / run);
  const cornerX = mapX(mover.x);
  const cornerY = mapY(anchor.y);

  /*
   * The four in-plot labels are placed against the triangle rather than at a fixed offset,
   * because here the learner MOVES the triangle: any constant that reads well at one mover
   * position is wrong at another, and the anchor's coordinates used to be drawn on exactly
   * the line the run label sits on.
   *
   * The two leg labels go first, each on the side of its leg away from the triangle's body,
   * since those positions are the ones the geometry dictates. The point labels then step
   * away from each other and `avoid` the leg labels, which is what keeps a label whose
   * preferred side is blocked by the frame from flipping onto one of them. In the vertical
   * case there is no run label and no horizontal leg, and the same rule still separates the
   * two points.
   *
   * All of it is measured against the visible ink, not `SvgMath`'s deliberately roomy
   * 110-unit box: that box is transparent and click-through, so only the centered glyphs
   * have to clear anything.
   */
  const runTex = `\\text{run} = ${run}`;
  const riseTex = `\\text{rise} = ${rise}`;
  const anchorTex = pointTex(anchor);
  const moverTex = pointTex(mover);

  const runLabel = labelSpot({
    x: (mapX(anchor.x) + cornerX) / 2,
    y: cornerY,
    frame: LABEL_FRAME,
    dx: 0,
    dy: rise >= 0 ? 1 : -1,
    halfW: labelHalfW(runTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: TICK_BOXES,
  });
  const riseLabel = labelSpot({
    x: cornerX,
    y: (cornerY + mapY(mover.y)) / 2,
    frame: LABEL_FRAME,
    dx: run > 0 ? 1 : -1,
    dy: 0,
    halfW: labelHalfW(riseTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: vertical ? TICK_BOXES : [...TICK_BOXES, runLabel],
  });
  const legLabels = [...(vertical ? [] : [runLabel]), ...(rise !== 0 ? [riseLabel] : [])];
  const anchorLabel = labelSpot({
    x: mapX(anchor.x),
    y: mapY(anchor.y),
    frame: LABEL_FRAME,
    dx: run > 0 ? -1 : 1,
    dy: rise >= 0 ? -1 : 1,
    halfW: labelHalfW(anchorTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels],
  });
  const moverLabel = labelSpot({
    x: mapX(mover.x),
    y: mapY(mover.y),
    frame: LABEL_FRAME,
    dx: run > 0 ? 1 : -1,
    dy: rise >= 0 ? -1 : 1,
    halfW: labelHalfW(moverTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, ...legLabels, anchorLabel],
  });

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Both built. The triangle changed shape, and the slope is still just the rise divided
        by the run.
      </>
    );
  } else if (vertical) {
    status = (
      <>
        Both points sit in the same column, so the run is <InlineMath latex="0" /> and the
        slope is undefined. Step left or right, then build{" "}
        <InlineMath latex={target?.latex ?? "m"} />.
      </>
    );
  } else if (hits.length === 1) {
    status = (
      <>
        Got it. Now move the second point until the slope reads{" "}
        <InlineMath latex={target?.latex ?? "m"} />.
      </>
    );
  } else {
    status = (
      <>
        Move the second point until the slope reads{" "}
        <InlineMath latex={target?.latex ?? "m"} />. Watch the rise and the run change as
        you go.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--play lesson-interactive--slope-triangle">
      {/* 380, not the default 460: this is the board the whole layout was reported against,
        and side by side alone left it 366px, 16px past the 350px band the pinned control row
        leaves. Its 440x352 viewBox is the tallest in the corpus, so at 460 it was drawing to
        the 340px height cap and letterboxing inside the column; sized instead of capped it
        draws 304px tall with no dead margin either side. */}
      <WidgetBeside
        figureWidth={380}
        figure={
          <svg
            viewBox="0 0 440 352"
            role="img"
            aria-label={`A grid with a fixed point at ${spoken(anchor.x)}, ${spoken(anchor.y)} and a movable point at ${spoken(mover.x)}, ${spoken(mover.y)}, with a run of ${spoken(run)} and a rise of ${spoken(rise)}`}
          >
            <title>Build a slope from a rise and a run</title>

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
            {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((tick) => (
              <g key={`grid${tick}`}>
                <line
                  x1={mapX(tick)}
                  y1={TOP}
                  x2={mapX(tick)}
                  y2={BOTTOM}
                  stroke={LINE}
                  strokeWidth={0.5}
                />
                <line
                  x1={LEFT}
                  y1={mapY(tick)}
                  x2={RIGHT}
                  y2={mapY(tick)}
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
                y={mapY(0) + 15}
                textAnchor="middle"
                fontSize={10}
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
                fontSize={10}
                fill={SOFT}
              >
                {tick}
              </text>
            ))}

            {ends && (
              <line
                x1={mapX(ends[0].x)}
                y1={mapY(ends[0].y)}
                x2={mapX(ends[1].x)}
                y2={mapY(ends[1].y)}
                stroke={CIVIC}
                strokeWidth={1.75}
                strokeOpacity={0.45}
              />
            )}
            {vertical && (
              <line
                x1={mapX(mover.x)}
                y1={TOP}
                x2={mapX(mover.x)}
                y2={BOTTOM}
                stroke={CIVIC}
                strokeWidth={1.75}
                strokeOpacity={0.45}
                strokeDasharray="6 5"
              />
            )}

            {!vertical && (
              <line
                x1={mapX(anchor.x)}
                y1={cornerY}
                x2={cornerX}
                y2={cornerY}
                stroke={CIVIC}
                strokeWidth={2.5}
              />
            )}
            {rise !== 0 && (
              <line
                x1={cornerX}
                y1={cornerY}
                x2={cornerX}
                y2={mapY(mover.y)}
                stroke={BRICK}
                strokeWidth={2.5}
              />
            )}

            <circle cx={mapX(anchor.x)} cy={mapY(anchor.y)} r={5} fill={LABEL} />
            <circle cx={mapX(mover.x)} cy={mapY(mover.y)} r={6} fill={SIGNAL} />
            <PlotLabel
              box={anchorLabel}
              latex={anchorTex}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />
            <PlotLabel
              box={moverLabel}
              latex={moverTex}
              fontSize={LABEL_SIZE}
              color={SIGNAL}
            />

            {!vertical && (
              <PlotLabel
                box={runLabel}
                latex={runTex}
                fontSize={LABEL_SIZE}
                color={CIVIC}
              />
            )}
            {rise !== 0 && (
              <PlotLabel
                box={riseLabel}
                latex={riseTex}
                fontSize={LABEL_SIZE}
                color={BRICK}
              />
            )}

            <SvgMath
              latex={
                vertical
                  ? "\\text{run} = 0, \\;\\; m \\text{ is undefined}"
                  : `m = ${slopeTex(rise, run)}`
              }
              x={220}
              y={330}
              fontSize={20}
              color={vertical ? BRICK : LABEL}
              w={400}
            />
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          <DirectionPad
            onLeft={() => step(-1, 0)}
            onRight={() => step(1, 0)}
            onUp={() => step(0, 1)}
            onDown={() => step(0, -1)}
          />
        </div>

        <div className="lesson-interactive__controls">
          {targets.map((candidate, index) => (
            <span key={candidate.aria} className="lesson-interactive__step-eq">
              <InlineMath
                latex={candidate.latex}
                color={hits.includes(index) ? CIVIC : SOFT}
              />
            </span>
          ))}
        </div>

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different anchor
          </button>
        )}

        <WidgetReveal
          available={moves > 0 && !solved}
          revealed={revealed}
          answer={
            target === undefined ? (
              <InlineMath latex="m" />
            ) : (
              <>
                Put the movable point at <InlineMath latex={pointTex(target.at)} />.
              </>
            )
          }
          why={
            legs === null ? (
              <>The slope is the rise divided by the run.</>
            ) : (
              <>
                Read <InlineMath latex={target?.latex ?? "m"} /> as an instruction rather
                than a label: it is a rise over a run, so from the fixed point walk{" "}
                {legs.acrossWord} and then {legs.upWord}. The two legs you just walked are
                the rise and the run, and dividing them is what gives the slope back. Any
                other point on that same line walks a bigger version of the same pair, which
                is why the fraction does not change.
              </>
            )
          }
          onReveal={fillIn}
          label="Reveal where the point goes"
          othersRemain={hits.length + 1 < targets.length}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : vertical ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
