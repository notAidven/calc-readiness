/**
 * CG.1 interactive (slide 1): the quadrant a point falls in is decided by its two SIGNS, and
 * a zero coordinate is not a quadrant at all.
 *
 * The four positions are given as pairs on the chips and are NOT drawn on the grid until
 * they have been called. That ordering is the whole mechanic: a board that plotted the dot
 * first would let the learner read the answer off the picture, which is the one thing the
 * slide is not about. The plane stands there as a reference with its four regions numbered,
 * and each correct call plants its dot in the region it was ruled into, so the picture
 * confirms a judgement the learner has already made rather than supplying it.
 *
 * Every board carries one point WITH A ZERO in it, because "no quadrant" is the answer a
 * two-sign rule cannot produce and is what a learner drilled on the four regions will force
 * into the nearest one.
 *
 * A wrong call marks the option and says which sign to look at again rather than locking the
 * row. Five options is not a coin flip, so correcting teaches more here than locking, and
 * the shipped `linear-slope-direction-classify` board settles the same question the same way.
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

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 90;
const RIGHT = 350;
const TOP = 14;
const BOTTOM = 274;
/** `±6` is the plot's border, so the numbered ticks stop two steps inside it. */
const TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], X_MIN, X_MAX);
const GRID = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const LABEL_SIZE = 13;
const REGION_SIZE = 15;
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

type Verdict = "i" | "ii" | "iii" | "iv" | "axis";

/** The five calls, in the order they are drawn under the board. */
const CALLS: readonly { id: Verdict; label: string; aria: string }[] = [
  { id: "i", label: "Quadrant I", aria: "quadrant one" },
  { id: "ii", label: "Quadrant II", aria: "quadrant two" },
  { id: "iii", label: "Quadrant III", aria: "quadrant three" },
  { id: "iv", label: "Quadrant IV", aria: "quadrant four" },
  { id: "axis", label: "On an axis", aria: "on an axis, in no quadrant" },
];

/** Where a correct call plants its dot, in plane coordinates. */
const REGION_CENTER: Readonly<Record<Verdict, { x: number; y: number }>> = {
  i: { x: 3, y: 3 },
  ii: { x: -3, y: 3 },
  iii: { x: -3, y: -3 },
  iv: { x: 3, y: -3 },
  axis: { x: 0, y: 0 },
};

/** The roman numeral each region is captioned with. */
const REGION_TEX: readonly { id: Verdict; latex: string }[] = [
  { id: "i", latex: "\\text{I}" },
  { id: "ii", latex: "\\text{II}" },
  { id: "iii", latex: "\\text{III}" },
  { id: "iv", latex: "\\text{IV}" },
];

interface Spot {
  x: number;
  y: number;
  verdict: Verdict;
}

/**
 * Two boards of four. Between them every one of the five calls is the right answer at least
 * once, neither board is a tour of the four quadrants in order (which would let the last
 * call be made by elimination), and each carries exactly one point sitting on an axis.
 */
const BOARDS: readonly (readonly Spot[])[] = [
  [
    { x: -5, y: 2, verdict: "ii" },
    { x: 3, y: 4, verdict: "i" },
    { x: 0, y: -4, verdict: "axis" },
    { x: 5, y: -3, verdict: "iv" },
  ],
  [
    { x: -2, y: -5, verdict: "iii" },
    { x: 4, y: 5, verdict: "i" },
    { x: 5, y: 0, verdict: "axis" },
    { x: -3, y: 1, verdict: "ii" },
  ],
];

function pairTex(spot: { x: number; y: number }): string {
  return `(${spot.x},\\, ${spot.y})`;
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/** The sentence that explains one point's ruling, used by the miss note and the reveal. */
function reasonFor(spot: Spot): string {
  if (spot.x === 0 && spot.y === 0) {
    return "Both coordinates are zero, so the point is the origin itself and sits on both axes rather than inside any quadrant.";
  }
  if (spot.x === 0) {
    return "The across coordinate is zero, so the point sits on the vertical axis and is in no quadrant at all.";
  }
  if (spot.y === 0) {
    return "The up coordinate is zero, so the point sits on the horizontal axis and is in no quadrant at all.";
  }
  const across = spot.x > 0 ? "right" : "left";
  const up = spot.y > 0 ? "above" : "below";
  return `The across coordinate is ${spot.x > 0 ? "positive" : "negative"} and the up coordinate is ${spot.y > 0 ? "positive" : "negative"}, which puts the point to the ${across} of the vertical axis and ${up} the horizontal one.`;
}

export function CoordinateQuadrantClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as readonly Spot[]);
  return (
    <CoordinateQuadrantClassifyBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CoordinateQuadrantClassifyBody({
  board,
  onSolved,
  onRestart,
}: {
  board: readonly Spot[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [called, setCalled] = useState<readonly boolean[]>(board.map(() => false));
  const [missed, setMissed] = useState<Verdict | null>(null);
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const spot = board[selected] as Spot;
  const settled = called[selected] === true;
  const remaining = called.filter((flag) => !flag).length;

  function latch() {
    if (!done) {
      setDone(true);
      onSolved();
    }
    setSolved(true);
  }

  function select(index: number) {
    setSelected(index);
    setMissed(null);
  }

  function call(verdict: Verdict) {
    if (settled || solved) {
      return;
    }
    setTried(true);
    if (verdict !== spot.verdict) {
      setMissed(verdict);
      return;
    }
    setMissed(null);
    const next = called.map((flag, index) => (index === selected ? true : flag));
    setCalled(next);
    success();
    if (next.every(Boolean)) {
      latch();
      return;
    }
    const nextOpen = next.findIndex((flag) => !flag);
    if (nextOpen >= 0) {
      setSelected(nextOpen);
    }
  }

  function reveal() {
    setRevealed(true);
    setMissed(null);
    setCalled(board.map(() => true));
    latch();
  }

  /* ---------------------------------------------------------------- the labels */

  const placed: LabelBox[] = [];
  const regionLabels = REGION_TEX.map((region) => {
    const center = REGION_CENTER[region.id];
    const box = labelSpot({
      x: mapX(center.x),
      y: mapY(center.y),
      frame: LABEL_FRAME,
      dx: 0,
      dy: -1,
      halfW: labelHalfW(region.latex, REGION_SIZE),
      halfH: labelHalfH(REGION_SIZE),
      gap: 0,
      avoid: [...placed],
    });
    placed.push(box);
    return { ...region, box };
  });
  const dotLabels = board
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ index }) => called[index] === true)
    .map(({ candidate }) => {
      const box = labelSpot({
        x: mapX(candidate.x),
        y: mapY(candidate.y),
        frame: LABEL_FRAME,
        dx: candidate.x > 0 ? -1 : 1,
        dy: candidate.y > 0 ? 1 : -1,
        halfW: labelHalfW(pairTex(candidate), LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: [...TICK_BOXES, ...placed],
      });
      placed.push(box);
      return { candidate, box };
    });

  /* --------------------------------------------------------------------- copy */

  let status: ReactNode;
  if (revealed) {
    status = null;
  } else if (solved) {
    status = (
      <>
        All four ruled. Two signs decide a quadrant, and a coordinate of{" "}
        <InlineMath latex="0" /> puts a point on an axis instead of inside one.
      </>
    );
  } else if (missed) {
    status = <>Not that one. {reasonFor(spot)}</>;
  } else {
    status = (
      <>
        Nothing is plotted yet, so read the two signs of{" "}
        <InlineMath latex={pairTex(spot)} /> and rule on it.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      <WidgetTask>
        Goal: rule each of the four positions into a quadrant, or onto an axis, from its two
        signs alone.
      </WidgetTask>

      <svg
        viewBox="0 0 440 292"
        role="img"
        aria-label={`A coordinate plane with its four quadrants numbered, holding ${called.filter(Boolean).length} of ${board.length} ruled positions`}
      >
        <title>Rule each position into a quadrant or onto an axis</title>

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

        {regionLabels.map((region) => (
          <PlotLabel
            key={region.id}
            box={region.box}
            latex={region.latex}
            fontSize={REGION_SIZE}
            color={SOFT}
          />
        ))}

        {dotLabels.map(({ candidate, box }) => (
          <g key={`dot${candidate.x}:${candidate.y}`}>
            <circle cx={mapX(candidate.x)} cy={mapY(candidate.y)} r={5.5} fill={CIVIC} />
            <PlotLabel
              box={box}
              latex={pairTex(candidate)}
              fontSize={LABEL_SIZE}
              color={CIVIC}
            />
          </g>
        ))}
      </svg>

      <div className="lesson-interactive__controls">
        {board.map((candidate, index) => (
          <button
            key={`pick${candidate.x}:${candidate.y}`}
            type="button"
            className="lesson-interactive__chip"
            style={{ color: LABEL, borderColor: LINE }}
            aria-label={`the position ${spoken(candidate.x)}, ${spoken(candidate.y)}${
              called[index] ? ", already ruled" : ""
            }`}
            aria-pressed={index === selected}
            data-state={called[index] ? "solved" : undefined}
            onClick={() => select(index)}
          >
            <InlineMath latex={pairTex(candidate)} />
          </button>
        ))}
      </div>

      {!settled && !solved && (
        <div className="lesson-interactive__controls">
          {CALLS.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="lesson-interactive__chip"
              style={
                missed === choice.id
                  ? { color: BRICK, borderColor: BRICK }
                  : { color: LABEL, borderColor: LINE }
              }
              data-state={missed === choice.id ? "wrong" : undefined}
              aria-label={`${spoken(spot.x)}, ${spoken(spot.y)} is ${choice.aria}${
                missed === choice.id ? ", your answer, wrong" : ""
              }`}
              onClick={() => call(choice.id)}
            >
              {choice.label}
              {missed === choice.id ? (
                <span aria-hidden="true" className="lesson-classify__mark">
                  {"\u2717"}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different set of positions
        </button>
      )}

      <WidgetReveal
        available={!solved && tried}
        revealed={revealed}
        answer={CALLS.find((choice) => choice.id === spot.verdict)?.label ?? ""}
        why={
          <>
            {reasonFor(spot)} The quadrants are numbered counterclockwise from the upper
            right, so the two signs name the region on their own.
          </>
        }
        onReveal={reveal}
        othersRemain={remaining > 1}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
