/**
 * FUN.8 interactive (slide 3): the inverse as a reflection across the line $y = x$.
 *
 * Two points of $f$ are plotted on a self-contained grid, with the mirror line drawn dashed
 * through it. The learner produces the matching point of $f^{-1}$ for each of them by typing
 * its coordinates, and only then is it drawn, so the reflection is a value the learner
 * produced rather than a picture that appeared. The dashed tie between a pair is drawn with
 * it, which is where the mirror becomes visible.
 *
 * The plane is drawn here rather than assumed: the coordinate-plane lesson is a sibling of
 * this node and not a prerequisite of it, so nothing on this slide leans on anything the
 * learner has necessarily met. Every label on the plot is placed by `labelSpot` inside
 * `plotLabelFrame` and drawn with `PlotLabel`, because three point pairs rotate through the
 * same frame and any fixed offset walks off the grid on one of them.
 *
 * None of these points appears in the check or in the practice bank.
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
} from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  type RevealFilledEntry,
  type RevealFillProps,
  useRevealFill,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

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

const LABEL_SIZE = 13;
const TICK_SIZE = 10;

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

/**
 * The axis tick numbers, as obstacles. They are drawn inside the plot against the axes, so a
 * label placed anywhere near an axis lands on one unless it knows they are there.
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
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

interface Point {
  x: number;
  y: number;
}

/**
 * Three pairs of points. None sits on the mirror line, where reflecting would change
 * nothing, and every reflection lands inside the window.
 */
const POOLS: readonly (readonly [Point, Point])[] = [
  [
    { x: -4, y: 2 },
    { x: 1, y: 5 },
  ],
  [
    { x: 3, y: -2 },
    { x: -1, y: 4 },
  ],
  [
    { x: 2, y: 5 },
    { x: -3, y: -1 },
  ],
];

function poolAt(index: number): readonly [Point, Point] {
  return (
    POOLS[index] ??
    POOLS[0] ?? [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]
  );
}

function pointTex(p: Point): string {
  return `(${p.x},\\, ${p.y})`;
}

function spoken(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

function parseInteger(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "")
    .replace(/^\+/, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/** One blank, in the position of the coordinate it holds. Only the open row is focusable. */
function Slot({
  state,
  value,
  settled,
  aria,
  given,
  onChange,
  onEnter,
}: {
  state: "locked" | "open" | "done";
  value: string;
  settled: string;
  aria: string;
  given: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (state === "done") {
    return (
      <span
        className="lesson-equation__slot lesson-equation__slot--done"
        style={{ color: CIVIC }}
      >
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
      style={{ color: CIVIC }}
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
      {...given}
    />
  );
}

export function InverseReflectExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(POOLS.length, props);
  return (
    <InverseReflectExploreBody
      key={variant.nonce}
      pair={poolAt(variant.index)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function InverseReflectExploreBody({
  pair,
  onSolved,
  onRestart,
}: {
  pair: readonly [Point, Point];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const sources = pair;

  /** 0 reflect the first point, 1 reflect the second, 2 done. */
  const [round, setRound] = useState(0);
  const [entries, setEntries] = useState([
    { x: "", y: "" },
    { x: "", y: "" },
  ]);
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = round >= 2;
  const current = sources[Math.min(round, 1)] as Point;
  const wanted: Point = { x: current.y, y: current.x };

  function rowState(which: 0 | 1): "locked" | "open" | "done" {
    if (round > which) {
      return "done";
    }
    return round === which ? "open" : "locked";
  }

  function advance(earned: boolean) {
    const next = round + 1;
    setRound(next);
    setMissed(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= 2) {
      onSolved();
    }
  }

  function check() {
    const entry = entries[round] ?? { x: "", y: "" };
    const typedX = parseInteger(entry.x);
    const typedY = parseInteger(entry.y);
    if (typedX === wanted.x && typedY === wanted.y) {
      setRevealed(false);
      advance(true);
      return;
    }
    setRevealed(false);
    setMissed(true);
    if (typedX === current.x && typedY === current.y) {
      setFeedback(
        <>
          That is the point you started from. Reflecting across <InlineMath latex="y = x" />{" "}
          trades the two coordinates over, so the one that was across becomes the one that
          is up.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        Not yet. The mirror line is <InlineMath latex="y = x" />, and a point crosses it by
        exchanging its two coordinates, so read <InlineMath latex={pointTex(current)} /> the
        other way round.
      </>,
    );
  }

  function reveal() {
    setRevealed(true);
    advance(false);
  }

  function setEntry(field: "x" | "y", next: string) {
    setEntries((prev) =>
      prev.map((item, index) => (index === round ? { ...item, [field]: next } : item)),
    );
  }

  /** The reflections already produced, in the order they were produced. */
  const images = sources.slice(0, round).map((p) => ({ x: p.y, y: p.x }));

  /*
   * Every label is placed rather than nudged, because three point pairs rotate through this
   * frame and each of them crowds a different corner of it. The mirror's own label goes down
   * first, since it has the fewest places it can sit, and everything after it avoids what is
   * already on the plot.
   */
  const mirrorTex = "y = x";
  const mirrorLabel = labelSpot({
    x: mapX(4.4),
    y: mapY(4.4),
    frame: LABEL_FRAME,
    dx: -1,
    dy: -1,
    halfW: labelHalfW(mirrorTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: TICK_BOXES,
  });

  const placed: LabelBox[] = [mirrorLabel];
  const sourceLabels = sources.map((p) => {
    const box = labelSpot({
      x: mapX(p.x),
      y: mapY(p.y),
      frame: LABEL_FRAME,
      dx: p.x >= 0 ? -1 : 1,
      dy: p.y >= 0 ? -1 : 1,
      halfW: labelHalfW(pointTex(p), LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 10,
      avoid: [...TICK_BOXES, ...placed],
    });
    placed.push(box);
    return box;
  });
  const imageLabels = images.map((p) => {
    const box = labelSpot({
      x: mapX(p.x),
      y: mapY(p.y),
      frame: LABEL_FRAME,
      dx: p.x >= 0 ? 1 : -1,
      dy: p.y >= 0 ? 1 : -1,
      halfW: labelHalfW(pointTex(p), LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 10,
      avoid: [...TICK_BOXES, ...placed],
    });
    placed.push(box);
    return box;
  });

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        Both across the mirror. Every point <InlineMath latex="(a,\, b)" /> on{" "}
        <InlineMath latex="f" /> has a point <InlineMath latex="(b,\, a)" /> on{" "}
        <InlineMath latex="f^{-1}" />, which is why the two graphs are reflections of each
        other in <InlineMath latex="y = x" />.
      </>
    );
  } else if (feedback) {
    status = feedback;
  } else if (round === 0) {
    status = (
      <>
        The dashed line is the mirror. Give the point of <InlineMath latex="f^{-1}" /> that{" "}
        <InlineMath latex={pointTex(sources[0])} /> turns into.
      </>
    );
  } else {
    status = (
      <>
        One more. The same trade applies to <InlineMath latex={pointTex(sources[1])} />.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <WidgetTask>
        Give the two points of <InlineMath latex="f^{-1}" /> that these two points of{" "}
        <InlineMath latex="f" /> become, so both pairs sit across the mirror line from each
        other.
      </WidgetTask>

      <svg
        viewBox="0 0 440 316"
        role="img"
        aria-label={`A grid with the line y equals x drawn dashed, holding the points ${spoken(sources[0].x)}, ${spoken(sources[0].y)} and ${spoken(sources[1].x)}, ${spoken(sources[1].y)} on f, with ${images.length} of their reflections placed so far`}
      >
        <title>Reflecting a graph across the line y equals x</title>

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

        <line
          x1={mapX(X_MIN)}
          y1={mapY(Y_MIN)}
          x2={mapX(X_MAX)}
          y2={mapY(Y_MAX)}
          stroke={SIGNAL}
          strokeWidth={1.75}
          strokeDasharray="7 5"
        />
        <PlotLabel
          box={mirrorLabel}
          latex={mirrorTex}
          fontSize={LABEL_SIZE}
          color={SIGNAL}
        />

        {images.map((image, index) => {
          const from = sources[index] as Point;
          return (
            <line
              key={`tie${image.x}:${image.y}`}
              x1={mapX(from.x)}
              y1={mapY(from.y)}
              x2={mapX(image.x)}
              y2={mapY(image.y)}
              stroke={CIVIC}
              strokeWidth={1.25}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
          );
        })}

        {sources.map((p, index) => (
          <g key={`src${p.x}:${p.y}`}>
            <circle cx={mapX(p.x)} cy={mapY(p.y)} r={5.5} fill={LABEL} />
            <PlotLabel
              box={sourceLabels[index] as LabelBox}
              latex={pointTex(p)}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />
          </g>
        ))}
        {images.map((p, index) => (
          <g key={`img${p.x}:${p.y}`}>
            <circle cx={mapX(p.x)} cy={mapY(p.y)} r={5.5} fill={CIVIC} />
            <PlotLabel
              box={imageLabels[index] as LabelBox}
              latex={pointTex(p)}
              fontSize={LABEL_SIZE}
              color={CIVIC}
            />
          </g>
        ))}
      </svg>

      <div className="lesson-equation">
        {[0, 1].map((which) => {
          const source = sources[which] as Point;
          const image = { x: source.y, y: source.x };
          const state = rowState(which as 0 | 1);
          const entry = entries[which] ?? { x: "", y: "" };
          return (
            <div key={`row${which}`} className="lesson-equation__row" data-state={state}>
              <span className="lesson-equation__stage">reflect</span>
              <span className="lesson-equation__body">
                <InlineMath latex={`${pointTex(source)} \\;\\longmapsto\\; (`} />
                <Slot
                  state={state}
                  value={entry.x}
                  settled={String(image.x)}
                  aria={`the first coordinate of the reflected point of ${spoken(source.x)}, ${spoken(source.y)}`}
                  given={state === "open" ? fill.entry(image.x) : {}}
                  onChange={(next) => setEntry("x", next)}
                  onEnter={check}
                />
                <InlineMath latex="," />
                <Slot
                  state={state}
                  value={entry.y}
                  settled={String(image.y)}
                  aria={`the second coordinate of the reflected point of ${spoken(source.x)}, ${spoken(source.y)}`}
                  given={state === "open" ? fill.entry(image.y) : {}}
                  onChange={(next) => setEntry("y", next)}
                  onEnter={check}
                />
                <InlineMath latex=")" />
              </span>
              {state === "open" ? (
                <button type="button" className="lesson-interactive__check" onClick={check}>
                  Check
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with different points
        </button>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealed && !solved}
        answer={<InlineMath latex={pointTex(wanted)} />}
        why={
          <>
            Reflecting across <InlineMath latex="y = x" /> exchanges the two coordinates,
            because the mirror line is exactly the set of points whose coordinates already
            match. So <InlineMath latex={pointTex(current)} /> on <InlineMath latex="f" />{" "}
            becomes <InlineMath latex={pointTex(wanted)} /> on <InlineMath latex="f^{-1}" />
            , and the same input and output have swapped roles.
          </>
        }
        onReveal={reveal}
        label="Reveal this point"
        othersRemain={round === 0}
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
