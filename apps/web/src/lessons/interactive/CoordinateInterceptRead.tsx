/**
 * CG.1 interactive (slide 2): an intercept is produced by substituting a zero, and it is
 * reported as a POINT.
 *
 * Both halves are built into the shape of the answer. The blank is inside the ordered pair
 * rather than in a box beside it, so the coordinate that is already known is on screen as a
 * fixed `0` the learner cannot type over: filling `(\_,\, 0)` is being asked for a point, in
 * a way that a single box beside the row's name is not. Reporting the bare number the division
 * produced is the near miss this slide exists to stop, and here there is nowhere to put it.
 *
 * Nothing is plotted until a crossing has been produced. The grid opens empty with only the
 * equation under it, each correct entry plants its crossing, and the line itself is not
 * drawn until both are down. A board that opened with the line on it would let both answers
 * be read off the picture, which is the same defect as showing the working.
 *
 * Three lines rotate on a restart. Every coefficient is at least two in magnitude, so each
 * substitution leaves a real division rather than the answer already written out, and the
 * three differ in which intercepts come out negative.
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
  SIGNAL,
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

interface Line {
  /** `a x + b y = c`, with both coefficients at least two in magnitude. */
  a: number;
  b: number;
  c: number;
}

/** Three lines: one crossing in the first quadrant, one to the left, one below. */
const LINES: readonly Line[] = [
  { a: 5, b: 4, c: 20 },
  { a: -4, b: 3, c: 12 },
  { a: 2, b: -5, c: 10 },
];

function equationTex(line: Line): string {
  return `${line.a}x ${line.b < 0 ? "-" : "+"} ${Math.abs(line.b)}y = ${line.c}`;
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

/**
 * One blank, sitting in the ordered pair where its coordinate goes.
 *
 * Three states, and only the open one is focusable: a stage waiting its turn shows a dashed
 * box with nothing to tab into, and a settled one shows the value typeset while keeping its
 * outline, which is what lets a negative be told apart from the comma beside it.
 */
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

/** One stage: what is being found, the pair it is written into, and the button that grades it. */
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

export function CoordinateInterceptRead(props: LessonWidgetProps) {
  const variant = useWidgetVariants(LINES.length, props);
  const line = LINES[variant.index] ?? (LINES[0] as Line);
  return (
    <CoordinateInterceptReadBody
      key={variant.nonce}
      line={line}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function CoordinateInterceptReadBody({
  line,
  onSolved,
  onRestart,
}: {
  line: Line;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const xi = line.c / line.a;
  const yi = line.c / line.b;

  /** 0 the horizontal crossing, 1 the vertical crossing, 2 done. */
  const [stage, setStage] = useState(0);
  const [acrossEntry, setAcrossEntry] = useState("");
  const [upEntry, setUpEntry] = useState("");
  const [tried, setTried] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  function stageState(at: number): "locked" | "open" | "done" {
    if (stage > at) {
      return "done";
    }
    return stage === at ? "open" : "locked";
  }

  function latch() {
    setStage(2);
    setSolved(true);
    setFeedback(null);
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  function checkAcross() {
    if (stage !== 0) {
      return;
    }
    setTried(true);
    const typed = parseInteger(acrossEntry);
    if (typed === null) {
      setFeedback("The coordinate is a whole number here, and it may be negative.");
      return;
    }
    if (typed === xi) {
      success();
      setFeedback(null);
      setStage(1);
      return;
    }
    setFeedback(
      <>
        Not yet. On the horizontal axis the up coordinate is <InlineMath latex="0" />, so
        the <InlineMath latex={`${Math.abs(line.b)}y`} /> term is worth nothing and the
        equation is down to <InlineMath latex={`${line.a}x = ${line.c}`} />.
      </>,
    );
  }

  function checkUp() {
    if (stage !== 1) {
      return;
    }
    setTried(true);
    const typed = parseInteger(upEntry);
    if (typed === null) {
      setFeedback("The coordinate is a whole number here, and it may be negative.");
      return;
    }
    if (typed === yi) {
      success();
      latch();
      return;
    }
    setFeedback(
      <>
        Not yet. On the vertical axis the across coordinate is <InlineMath latex="0" />, so
        the <InlineMath latex={`${line.a}x`} /> term is worth nothing and the equation is
        down to <InlineMath latex={`${line.b}y = ${line.c}`} />.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    setAcrossEntry(String(xi));
    setUpEntry(String(yi));
    latch();
  }

  /* ---------------------------------------------------------------- the labels */

  const showAcross = stage >= 1;
  const showUp = stage >= 2;
  const acrossTex = `(${xi},\\, 0)`;
  const upTex = `(0,\\, ${yi})`;
  const acrossLabel = labelSpot({
    x: mapX(xi),
    y: mapY(0),
    frame: LABEL_FRAME,
    dx: xi > 0 ? -1 : 1,
    dy: -1,
    halfW: labelHalfW(acrossTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: TICK_BOXES,
  });
  const upLabel = labelSpot({
    x: mapX(0),
    y: mapY(yi),
    frame: LABEL_FRAME,
    dx: 1,
    dy: yi > 0 ? 1 : -1,
    halfW: labelHalfW(upTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, acrossLabel],
  });

  /* --------------------------------------------------------------------- copy */

  let status: ReactNode;
  if (revealed) {
    status = null;
  } else if (solved) {
    status = (
      <>
        Both crossings down, and two points are enough to draw the line. Each one was found
        by putting <InlineMath latex="0" /> in for the coordinate that was already known.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (stage === 1) {
    status = (
      <>
        One crossing planted. The other one sits on the vertical axis, where the across
        coordinate is <InlineMath latex="0" />.
      </>
    );
  } else {
    status = (
      <>
        The grid is empty on purpose. Substitute a <InlineMath latex="0" /> into the
        equation to produce the first crossing.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: produce both of this line's intercepts, each written as a complete point.
      </WidgetTask>

      <svg
        viewBox="0 0 440 348"
        role="img"
        aria-label={`An empty coordinate grid for the line ${line.a} x ${line.b < 0 ? "minus" : "plus"} ${Math.abs(line.b)} y equals ${line.c}, with ${(showAcross ? 1 : 0) + (showUp ? 1 : 0)} of its two crossings planted`}
      >
        <title>Find both intercepts of a line given in standard form</title>

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

        {/* Two points are what a line needs, so it is drawn only once both are produced. */}
        {showUp && (
          <line
            x1={mapX(xi)}
            y1={mapY(0)}
            x2={mapX(0)}
            y2={mapY(yi)}
            stroke={LABEL}
            strokeWidth={2.25}
            strokeLinecap="round"
          />
        )}

        {showAcross && (
          <g>
            <circle cx={mapX(xi)} cy={mapY(0)} r={5.5} fill={CIVIC} />
            <PlotLabel
              box={acrossLabel}
              latex={acrossTex}
              fontSize={LABEL_SIZE}
              color={CIVIC}
            />
          </g>
        )}
        {showUp && (
          <g>
            <circle cx={mapX(0)} cy={mapY(yi)} r={5.5} fill={SIGNAL} />
            <PlotLabel box={upLabel} latex={upTex} fontSize={LABEL_SIZE} color={SIGNAL} />
          </g>
        )}

        <SvgMath
          latex={equationTex(line)}
          x={220}
          y={334}
          fontSize={18}
          color={LABEL}
          w={400}
        />
      </svg>

      <div className="lesson-equation">
        <Stage name="x-intercept" state={stageState(0)} onCheck={checkAcross}>
          <InlineMath latex="(" />
          <Slot
            state={stageState(0)}
            value={acrossEntry}
            settled={String(xi)}
            aria="the across coordinate of the crossing on the horizontal axis"
            color={CIVIC}
            onChange={setAcrossEntry}
            onEnter={checkAcross}
          />
          <InlineMath latex=",\, 0)" />
        </Stage>

        <Stage name="y-intercept" state={stageState(1)} onCheck={checkUp}>
          <InlineMath latex="(0,\," />
          <Slot
            state={stageState(1)}
            value={upEntry}
            settled={String(yi)}
            aria="the up coordinate of the crossing on the vertical axis"
            color={SIGNAL}
            onChange={setUpEntry}
            onEnter={checkUp}
          />
          <InlineMath latex=")" />
        </Stage>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different line
        </button>
      )}

      <WidgetReveal
        available={!solved && tried}
        revealed={revealed}
        answer={<InlineMath latex={stage === 0 ? acrossTex : upTex} />}
        why={
          stage === 0 ? (
            <>
              Every point on the horizontal axis has an up coordinate of{" "}
              <InlineMath latex="0" />, so the <InlineMath latex={`${Math.abs(line.b)}y`} />{" "}
              term drops out and <InlineMath latex={`${line.a}x = ${line.c}`} /> leaves{" "}
              <InlineMath latex={`x = ${xi}`} />. The crossing is the whole point{" "}
              <InlineMath latex={acrossTex} />, zero included.
            </>
          ) : (
            <>
              Every point on the vertical axis has an across coordinate of{" "}
              <InlineMath latex="0" />, so the <InlineMath latex={`${line.a}x`} /> term
              drops out and <InlineMath latex={`${line.b}y = ${line.c}`} /> leaves{" "}
              <InlineMath latex={`y = ${yi}`} />. The crossing is the whole point{" "}
              <InlineMath latex={upTex} />, zero included.
            </>
          )
        }
        onReveal={reveal}
        othersRemain={stage === 0}
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
