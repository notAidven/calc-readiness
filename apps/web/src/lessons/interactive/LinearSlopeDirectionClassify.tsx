/**
 * LF.1 interactive (slide 2): the sign of the slope classifies the line.
 *
 * Four lines, each given by the two points it passes through. The learner picks a line,
 * sees it drawn with its rise-over-run triangle, and calls it increasing, decreasing or
 * constant. A wrong call marks that chip and explains what the sign of the rise means, and
 * the learner tries again, so the widget corrects rather than locks. All four have to be
 * called correctly before the slide passes.
 *
 * The board deliberately holds a level line and a shallow positive one, because "barely
 * rising" is the case a learner is most likely to file under constant. None of the four is
 * used by the CFU or the practice bank.
 *
 * Two sets of four rotate on "start over". A reset that deals the same four lines back asks
 * for four verdicts the learner has just given, so the second set moves every point and
 * changes every slope while keeping the two cases the board exists for: a level line, and a
 * riser shallow enough (a rise of 1 across a run of 8) to be mistaken for one.
 */

import { type ReactNode, useState } from "react";

import {
  BRICK,
  CIVIC,
  InlineMath,
  interiorTicks,
  LABEL,
  LINE,
  labelHalfW,
  PlotLabel,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import { WidgetBeside } from "../widgetBeside";
import {
  type LessonWidgetProps,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";

const X_MIN = -5;
const X_MAX = 5;
const Y_MIN = -5;
const Y_MAX = 5;
const LEFT = 96;
const RIGHT = 344;
const TOP = 20;
const BOTTOM = 268;
/** No number on the border: `±5` is the plot's edge, so the ticks stop one step inside. */
const TICKS = interiorTicks([-4, -2, 2, 4], X_MIN, X_MAX);

type Verdict = "increasing" | "decreasing" | "constant";

interface Line {
  id: string;
  /** LaTeX name, e.g. `\ell_1`. */
  latex: string;
  aria: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  verdict: Verdict;
}

const BOARD_ONE: readonly Line[] = [
  {
    id: "l1",
    latex: "\\ell_1",
    aria: "line 1 through negative 4, negative 3 and 2, 3",
    x1: -4,
    y1: -3,
    x2: 2,
    y2: 3,
    verdict: "increasing",
  },
  {
    id: "l2",
    latex: "\\ell_2",
    aria: "line 2 through negative 2, 3 and 1, negative 3",
    x1: -2,
    y1: 3,
    x2: 1,
    y2: -3,
    verdict: "decreasing",
  },
  {
    id: "l3",
    latex: "\\ell_3",
    aria: "line 3 through negative 4, 2 and 3, 2",
    x1: -4,
    y1: 2,
    x2: 3,
    y2: 2,
    verdict: "constant",
  },
  {
    id: "l4",
    latex: "\\ell_4",
    aria: "line 4 through negative 4, negative 1 and 4, 1",
    x1: -4,
    y1: -1,
    x2: 4,
    y2: 1,
    verdict: "increasing",
  },
];

/**
 * The second set. Every point differs from board one's, and so does every slope: the faller
 * is now $-1$ rather than $-2$, the level line sits below the axis rather than above it, the
 * shallow riser is $\tfrac18$ rather than $\tfrac14$, and the fourth line is steep rather
 * than gentle. The two cases the board is FOR are kept, because they are the misconception.
 */
const BOARD_TWO: readonly Line[] = [
  {
    id: "m1",
    latex: "\\ell_1",
    aria: "line 1 through negative 3, 4 and 3, negative 2",
    x1: -3,
    y1: 4,
    x2: 3,
    y2: -2,
    verdict: "decreasing",
  },
  {
    id: "m2",
    latex: "\\ell_2",
    aria: "line 2 through negative 4, negative 3 and 3, negative 3",
    x1: -4,
    y1: -3,
    x2: 3,
    y2: -3,
    verdict: "constant",
  },
  {
    id: "m3",
    latex: "\\ell_3",
    aria: "line 3 through negative 4, 0 and 4, 1",
    x1: -4,
    y1: 0,
    x2: 4,
    y2: 1,
    verdict: "increasing",
  },
  {
    id: "m4",
    latex: "\\ell_4",
    aria: "line 4 through negative 2, negative 4 and 1, 5",
    x1: -2,
    y1: -4,
    x2: 1,
    y2: 5,
    verdict: "increasing",
  },
];

const BOARDS: readonly (readonly Line[])[] = [BOARD_ONE, BOARD_TWO];

const CALLS: readonly { verdict: Verdict; label: string }[] = [
  { verdict: "increasing", label: "Increasing" },
  { verdict: "decreasing", label: "Decreasing" },
  { verdict: "constant", label: "Constant" },
];

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

/** The visible span of a line through two points, clipped to the plot frame. */
function lineEnds(line: Line): readonly [number, number, number, number] | null {
  const slope = (line.y2 - line.y1) / (line.x2 - line.x1);
  const found: { x: number; y: number }[] = [];
  const yLeft = line.y1 + slope * (X_MIN - line.x1);
  const yRight = line.y1 + slope * (X_MAX - line.x1);
  if (yLeft >= Y_MIN && yLeft <= Y_MAX) {
    found.push({ x: X_MIN, y: yLeft });
  }
  if (yRight >= Y_MIN && yRight <= Y_MAX) {
    found.push({ x: X_MAX, y: yRight });
  }
  if (slope !== 0) {
    const xLow = line.x1 + (Y_MIN - line.y1) / slope;
    const xHigh = line.x1 + (Y_MAX - line.y1) / slope;
    if (xLow > X_MIN && xLow < X_MAX) {
      found.push({ x: xLow, y: Y_MIN });
    }
    if (xHigh > X_MIN && xHigh < X_MAX) {
      found.push({ x: xHigh, y: Y_MAX });
    }
  }
  const first = found[0];
  const second = found[1];
  return first && second ? [first.x, first.y, second.x, second.y] : null;
}

export function LinearSlopeDirectionClassify(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearSlopeDirectionClassifyBody
      key={variant.nonce}
      lines={BOARDS[variant.index] ?? (BOARD_ONE as readonly Line[])}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearSlopeDirectionClassifyBody({
  lines,
  onSolved,
  onRestart,
}: {
  lines: readonly Line[];
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [called, setCalled] = useState<Record<string, boolean>>({});
  const [missed, setMissed] = useState<Verdict | null>(null);
  const success = useWidgetSuccess();

  const line = lines.find((candidate) => candidate.id === selectedId) ?? null;
  const settled = line !== null && called[line.id] === true;
  const solved = lines.every((candidate) => called[candidate.id]);

  function select(next: Line) {
    setSelectedId(next.id);
    setMissed(null);
  }

  function call(verdict: Verdict) {
    if (!line || called[line.id]) {
      return;
    }
    if (verdict !== line.verdict) {
      setMissed(verdict);
      return;
    }
    setMissed(null);
    const next = { ...called, [line.id]: true };
    setCalled(next);
    success();
    if (lines.every((candidate) => next[candidate.id])) {
      onSolved();
    }
  }

  const ends = line ? lineEnds(line) : null;
  const rise = line ? line.y2 - line.y1 : 0;
  const run = line ? line.x2 - line.x1 : 0;
  const riseRunTex = `\\text{rise} = ${rise}, \\;\\; \\text{run} = ${run}`;

  let status: ReactNode;
  if (solved) {
    status = (
      <>
        All four called. A positive slope rises, a negative slope falls, and a slope of{" "}
        <InlineMath latex="0" /> stays level, however gentle the climb looks.
      </>
    );
  } else if (missed) {
    status = (
      <>
        Not that one. Read the two points from left to right and compare their{" "}
        <InlineMath latex="y" />
        -values: the sign of the rise is the sign of the slope, and a rise of{" "}
        <InlineMath latex="0" /> is the level case.
      </>
    );
  } else if (line) {
    status = (
      <>
        Follow this line left to right. Does <InlineMath latex="y" /> climb, fall, or hold
        steady?
      </>
    );
  } else {
    status = "Tap a line to draw it, then call its behavior.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--classify">
      {/* 420, not the default 460. This board was inside the 350px band at 345.9px, by 4.1px,
        which is less than one rewrapped line anywhere on it. 420 draws the graph 292px tall
        and puts 32px between the board and the band. */}
      <WidgetBeside
        figureWidth={420}
        figure={
          <svg
            viewBox="0 0 440 306"
            role="img"
            aria-label={
              line
                ? `${line.aria}, which is ${settled ? line.verdict : "waiting to be classified"}`
                : "An empty grid; tap a line to draw it"
            }
          >
            <title>Classify a line as increasing, decreasing, or constant</title>

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
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((tick) => (
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

            {line && ends && (
              <line
                x1={mapX(ends[0])}
                y1={mapY(ends[1])}
                x2={mapX(ends[2])}
                y2={mapY(ends[3])}
                stroke={settled ? CIVIC : LABEL}
                strokeWidth={2.25}
              />
            )}
            {line && settled && rise !== 0 && (
              <line
                x1={mapX(line.x2)}
                y1={mapY(line.y1)}
                x2={mapX(line.x2)}
                y2={mapY(line.y2)}
                stroke={BRICK}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
            {line && settled && (
              <line
                x1={mapX(line.x1)}
                y1={mapY(line.y1)}
                x2={mapX(line.x2)}
                y2={mapY(line.y1)}
                stroke={SIGNAL}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            )}
            {line && (
              <>
                <circle cx={mapX(line.x1)} cy={mapY(line.y1)} r={5} fill={LABEL} />
                <circle cx={mapX(line.x2)} cy={mapY(line.y2)} r={5} fill={LABEL} />
              </>
            )}
            {/* Below the frame, in the strip the selected line's point pair uses: the two are
            mutually exclusive, and centring this in the plot laid it across the grid. */}
            {!line && (
              <text x={220} y={290} textAnchor="middle" fontSize={13} fill={SOFT}>
                tap a line below
              </text>
            )}

            {line && (
              <SvgMath
                latex={`${line.latex}: \\;\\; (${line.x1},\\, ${line.y1}) \\;\\; \\text{and} \\;\\; (${line.x2},\\, ${line.y2})`}
                x={220}
                y={290}
                fontSize={16}
                color={LABEL}
                w={400}
              />
            )}
            {/* The one readout drawn ON the grid, so it carries a plate and is placed as a
            label: centered in the plot's top strip, above every line the board can draw. */}
            {line && settled && (
              <PlotLabel
                box={{
                  x: (LEFT + RIGHT) / 2,
                  y: TOP + 14,
                  halfW: labelHalfW(riseRunTex, 14),
                  halfH: 9,
                }}
                latex={riseRunTex}
                fontSize={14}
                color={CIVIC}
              />
            )}
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          {lines.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="lesson-interactive__chip"
              style={{ color: LABEL, borderColor: LINE }}
              aria-label={candidate.aria}
              data-state={called[candidate.id] ? "solved" : undefined}
              onClick={() => select(candidate)}
            >
              <InlineMath latex={candidate.latex} />
            </button>
          ))}
        </div>

        {line && !settled && (
          <div className="lesson-interactive__controls">
            {CALLS.map((choice) => (
              <button
                key={choice.verdict}
                type="button"
                className="lesson-interactive__chip"
                style={{ color: LABEL, borderColor: LINE }}
                data-state={missed === choice.verdict ? "wrong" : undefined}
                onClick={() => call(choice.verdict)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with four different lines
          </button>
        )}

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : missed ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
