/**
 * EL.4 slide 0: the logarithm's graph met as the exponential's reflection across $y = x$.
 *
 * The exponential curve and the mirror line are GIVEN, because they are the premise the
 * slide hands over. What is not given is the reflected curve: the learner reflects the
 * exponential's marked points one at a time and watches each pair swap coordinates, and only
 * a correct final answer draws the logarithm through them. Drawing it first would have made
 * the question a matter of tracing a line that was already on the board.
 *
 * Free exploration, then one value produced. The point the question asks about is
 * deliberately NOT one of the chips: its exponential partner sits on the drawn curve and
 * nowhere in the list, so the answer is reached by swapping a pair rather than by reading a
 * row that was going to appear anyway.
 */

import { useState } from "react";

import {
  BRICK,
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
import { WidgetBeside } from "../widgetBeside";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/** One marked point of the exponential, offered for reflection. */
interface Mark {
  x: number;
  y: number;
}

interface Board {
  base: number;
  /** LaTeX for the base, so an integer base and $e$ would both read correctly. */
  baseTex: string;
  /** The exponential points on offer. The question's partner is never one of them. */
  marks: readonly Mark[];
  /** The first coordinate the question asks about, on the REFLECTED curve. */
  target: number;
  /** Its second coordinate, which is the exponent the target is reached by. */
  answer: number;
  /** Widest coordinate any drawn point uses, so the window holds the whole picture. */
  span: number;
}

/**
 * Two boards, and neither reuses the CFU's shifted logarithm or the numbers on the later
 * slides. Both reach a target whose exponential partner is on the curve and off the chips.
 */
const BOARDS: readonly Board[] = [
  {
    base: 2,
    baseTex: "2",
    marks: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ],
    target: 8,
    answer: 3,
    span: 8,
  },
  {
    base: 3,
    baseTex: "3",
    marks: [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
    ],
    target: 9,
    answer: 2,
    span: 9,
  },
];

/** How many points must be reflected before the question is put. */
const EXPLORE_FLOOR = 2;

const PLOT = { left: 100, right: 340, top: 40, bottom: 280 };
const VIEW_H = 316;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;
/** Half a dot's keep-out box: the widest dot is r 4.5, plus clearance for its edge. */
const DOT_OBSTACLE = 7;
/** Two units of margin below the axis, so the axis numbers are not printed on the border. */
const WINDOW_MIN = -2;

export function LogMirrorExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <LogMirrorExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

/** A coordinate pair, spaced the way KaTeX wants it. */
function pointTex(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

function LogMirrorExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [reflected, setReflected] = useState<readonly number[]>([]);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const asking = reflected.length >= EXPLORE_FLOOR;

  const windowMax = board.span + 1;
  const unit = (PLOT.right - PLOT.left) / (windowMax - WINDOW_MIN);
  const mapX = (x: number): number => PLOT.left + (x - WINDOW_MIN) * unit;
  const mapY = (y: number): number => PLOT.bottom - (y - WINDOW_MIN) * unit;

  /**
   * Functional, not `[...reflected, mark.x]`: two chips tapped in quick succession are two
   * updates against one render, and reading the array out of the closure loses the first.
   */
  function reflect(mark: Mark) {
    setReflected((prev) => (prev.includes(mark.x) ? prev : [...prev, mark.x]));
    setFeedback(null);
  }

  /** Close the round out. `earned` is false when the learner was told the answer. */
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

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Enter the second coordinate of the reflected point.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about swapping the coordinates, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === board.answer) {
      finish(true);
      return;
    }
    setFeedback(
      "Not that one. Reflecting swaps the two coordinates, so find the point of the drawn curve whose SECOND coordinate is the number in the question, and read its first coordinate.",
    );
  }

  function reveal() {
    setEntry(String(board.answer));
    setRevealed(true);
    finish(false);
  }

  /** A polyline through `f`, sampled across the window and clipped to it. */
  function curve(f: (x: number) => number, from: number): string {
    const steps = 240;
    const points: string[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const x = from + ((windowMax - from) * step) / steps;
      const y = f(x);
      if (!Number.isFinite(y) || y < WINDOW_MIN || y > windowMax) {
        continue;
      }
      points.push(`${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  }

  const ticks: number[] = [];
  for (let value = Math.ceil(WINDOW_MIN); value <= windowMax; value += 1) {
    if (value !== 0) {
      ticks.push(value);
    }
  }
  const numberedX = fittingTicks({
    ticks,
    place: mapX,
    half: (tick) => labelHalfW(String(tick), TICK_SIZE),
    start: PLOT.left,
    end: PLOT.right,
  });
  const numberedY = fittingTicks({
    ticks,
    place: mapY,
    half: () => labelHalfH(TICK_SIZE),
    start: PLOT.top,
    end: PLOT.bottom,
  });

  /**
   * Where the axis numbers sit, as obstacles the point labels have to clear.
   *
   * These offsets are the SAME nudge the `<text>` elements below are drawn with, minus the
   * baseline-to-centre difference of about 3.85 at this size: a baseline of `+18` is an ink
   * centre of `+14`. Move the glyphs without moving these and the labels dodge bare paper
   * and land on the digits instead, which is worse than never having dodged at all.
   */
  const tickBoxes: LabelBox[] = [
    ...numberedX.map((tick) => ({
      x: mapX(tick),
      y: mapY(0) + 14,
      halfW: labelHalfW(String(tick), TICK_SIZE),
      halfH: labelHalfH(TICK_SIZE),
    })),
    ...numberedY.map((tick) => ({
      x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
      y: mapY(tick),
      halfW: labelHalfW(String(tick), TICK_SIZE),
      halfH: labelHalfH(TICK_SIZE),
    })),
  ];

  /** The mirrored points, in the order the learner produced them, plus the answer. */
  const placed: readonly Mark[] = [
    ...board.marks
      .filter((mark) => reflected.includes(mark.x))
      .map((m) => ({
        x: m.y,
        y: m.x,
      })),
    ...(solved ? [{ x: board.target, y: board.answer }] : []),
  ];

  /**
   * Every drawn dot, as an obstacle. Without these the placer had nothing to say a pair was
   * being printed across a POINT: it dodged the axis numbers and the pairs already down,
   * and then laid $(1, 0)$ over the dot for $(2, 1)$ one grid step away. The dots are the
   * reading of the slide, so they are the last thing a label may cover.
   */
  const dotBoxes: LabelBox[] = [...board.marks, ...placed].map((mark) => ({
    x: mapX(mark.x),
    y: mapY(mark.y),
    halfW: DOT_OBSTACLE,
    halfH: DOT_OBSTACLE,
  }));

  const frame = plotLabelFrame(PLOT, 8);
  const labels: { mark: Mark; box: LabelBox }[] = [];
  for (const mark of placed) {
    const latex = pointTex(mark.x, mark.y);
    const at = { x: mapX(mark.x), y: mapY(mark.y) };
    labels.push({
      mark,
      box: labelSpot({
        ...at,
        frame,
        dx: 1,
        dy: -1,
        halfW: labelHalfW(latex, LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: [
          ...tickBoxes,
          // Its OWN dot is left out: a pair has to be allowed next to the point it names,
          // and a label told to avoid that point has nowhere left to be placed.
          ...dotBoxes.filter((dot) => dot.x !== at.x || dot.y !== at.y),
          ...labels.map((entryBox) => entryBox.box),
        ],
      }),
    });
  }

  const expPath = curve((x) => board.base ** x, WINDOW_MIN);
  const logPath = solved
    ? curve((x) => (x > 0 ? Math.log(x) / Math.log(board.base) : Number.NaN), 0.001)
    : "";

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <WidgetTask>
        Goal: reflect the marked points across <InlineMath latex="y = x" /> to build the
        logarithm's graph, then give the second coordinate of the reflected point whose
        first coordinate is <InlineMath latex={String(board.target)} />.
      </WidgetTask>

      {/* 340, not the default 460: this board's task line wraps to two lines, so it carries
        79.7px of chrome around a figure that was 330.4px tall at full width, 60px past the
        350px band. 340 draws it 244px tall. */}
      <WidgetBeside
        figureWidth={340}
        figure={
          <svg
            viewBox={`0 0 440 ${VIEW_H}`}
            role="img"
            aria-label={`The graph of ${board.base} to the x, the line y equals x, and the reflected points the learner has produced`}
          >
            <title>
              An exponential graph and its reflection across the line y equals x
            </title>

            <rect
              data-plot-frame=""
              x={PLOT.left}
              y={PLOT.top}
              width={PLOT.right - PLOT.left}
              height={PLOT.bottom - PLOT.top}
              fill="var(--paper)"
              stroke={LINE}
              strokeWidth={1}
              rx={6}
            />

            {ticks.map((tick) => (
              <line
                key={`gx${tick}`}
                x1={mapX(tick)}
                y1={PLOT.top}
                x2={mapX(tick)}
                y2={PLOT.bottom}
                stroke={LINE}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            ))}
            {ticks.map((tick) => (
              <line
                key={`gy${tick}`}
                x1={PLOT.left}
                y1={mapY(tick)}
                x2={PLOT.right}
                y2={mapY(tick)}
                stroke={LINE}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            ))}

            <line
              x1={PLOT.left}
              y1={mapY(0)}
              x2={PLOT.right}
              y2={mapY(0)}
              stroke={SOFT}
              strokeWidth={1.25}
            />
            <line
              x1={mapX(0)}
              y1={PLOT.top}
              x2={mapX(0)}
              y2={PLOT.bottom}
              stroke={SOFT}
              strokeWidth={1.25}
            />

            {/* The mirror line, dashed because it is the axis of the reflection rather than a
            graph of its own. */}
            <line
              x1={mapX(WINDOW_MIN)}
              y1={mapY(WINDOW_MIN)}
              x2={mapX(windowMax)}
              y2={mapY(windowMax)}
              stroke={SIGNAL_DEEP}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />

            {expPath !== "" && (
              <path d={expPath} fill="none" stroke={LABEL} strokeWidth={2.4} />
            )}
            {logPath !== "" && (
              <path d={logPath} fill="none" stroke={CIVIC} strokeWidth={2.4} />
            )}

            {board.marks.map((mark) => (
              <circle
                key={`m${mark.x}`}
                cx={mapX(mark.x)}
                cy={mapY(mark.y)}
                r={4}
                fill={LABEL}
              />
            ))}
            {placed.map((mark) => (
              <circle
                key={`r${mark.x}`}
                cx={mapX(mark.x)}
                cy={mapY(mark.y)}
                r={4.5}
                fill={CIVIC}
              />
            ))}

            {numberedX.map((tick) => (
              <text
                key={`tx${tick}`}
                x={mapX(tick)}
                y={mapY(0) + 18}
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
            {numberedY.map((tick) => (
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

            {labels.map(({ mark, box }) => (
              <PlotLabel
                key={`l${mark.x}`}
                box={box}
                latex={pointTex(mark.x, mark.y)}
                fontSize={LABEL_SIZE}
                color={CIVIC}
              />
            ))}

            <SvgMath
              latex={`y = ${board.baseTex}^{x}`}
              x={132}
              y={22}
              fontSize={15}
              color={LABEL}
              w={150}
            />
            <SvgMath
              latex="y = x"
              x={244}
              y={22}
              fontSize={15}
              color={SIGNAL_DEEP}
              w={110}
            />
            {solved && (
              <SvgMath
                latex={`y = \\log_{${board.baseTex}} x`}
                x={352}
                y={22}
                fontSize={15}
                color={CIVIC}
                w={150}
              />
            )}
          </svg>
        }
      >
        <div className="lesson-interactive__controls">
          {board.marks.map((mark) => (
            <button
              key={`chip${mark.x}`}
              type="button"
              className="lesson-interactive__chip"
              disabled={reflected.includes(mark.x)}
              aria-label={
                reflected.includes(mark.x)
                  ? `The point ${mark.x} comma ${mark.y} has been reflected`
                  : `Reflect the point ${mark.x} comma ${mark.y}`
              }
              style={{
                color: LABEL,
                borderColor: reflected.includes(mark.x) ? CIVIC : LINE,
              }}
              onClick={() => reflect(mark)}
            >
              <InlineMath latex={pointTex(mark.x, mark.y)} />
            </button>
          ))}
        </div>

        <ul className="lesson-explore__readings">
          {board.marks
            .filter((mark) => reflected.includes(mark.x))
            .map((mark) => (
              <li key={`read${mark.x}`}>
                <InlineMath
                  latex={`${pointTex(mark.x, mark.y)} \\to ${pointTex(mark.y, mark.x)}`}
                  color={LABEL}
                />
              </li>
            ))}
        </ul>

        {solved ? (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different base
          </button>
        ) : asking ? (
          <div className="lesson-interactive__controls">
            <div className="lesson-interactive__field" style={{ color: BRICK }}>
              <span className="lesson-interactive__field-label">
                <InlineMath latex={`(${board.target},\\, {?})`} />
              </span>
              <input
                className="lesson-interactive__input"
                {...numericEntryProps("integer")}
                value={entry}
                aria-label={`The second coordinate of the reflected point whose first coordinate is ${board.target}`}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    check();
                  }
                }}
              />
            </div>
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          </div>
        ) : null}

        <WidgetReveal
          available={attempted && !solved}
          revealed={revealed}
          answer={<InlineMath latex={String(board.answer)} />}
          why={
            <>
              The drawn curve passes through{" "}
              <InlineMath latex={pointTex(board.answer, board.target)} />, because{" "}
              <InlineMath latex={`${board.baseTex}^{${board.answer}} = ${board.target}`} />.
              Reflecting across <InlineMath latex="y = x" /> swaps the coordinates of every
              point, so the logarithm's graph passes through{" "}
              <InlineMath latex={pointTex(board.target, board.answer)} /> and the second
              coordinate is <InlineMath latex={String(board.answer)} />. The swap is what
              makes the logarithm accept only positive inputs: the exponential returned only
              positive values, and those returned values become the inputs.
            </>
          }
          onReveal={reveal}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {revealed ? null : solved ? (
            <>
              <InlineMath latex={`${board.baseTex}^{${board.answer}} = ${board.target}`} />{" "}
              puts <InlineMath latex={pointTex(board.answer, board.target)} /> on the
              exponential, so the reflection puts{" "}
              <InlineMath latex={pointTex(board.target, board.answer)} /> on the logarithm.
              The drawn curve is every one of those swaps at once.
            </>
          ) : feedback ? (
            feedback
          ) : asking ? (
            "Each reflected pair has its coordinates swapped. The point in the question is one more swap of the same kind."
          ) : (
            `Reflect at least ${EXPLORE_FLOOR} of the marked points to see what the reflection does to a pair.`
          )}
        </p>
      </WidgetBeside>
    </div>
  );
}
