/**
 * LIN.4 slide 0: put the boundary on the scale, and say whether it is in the range.
 *
 * The slide's last sentence is that the boundary is easy to lose and decides real loads. A
 * learner told that still has nothing to lose it ON, so the board hands them a written rule and
 * a bare scale: they place the boundary and then decide whether the boundary weight itself is
 * accepted. Both parts are one answer and are judged together, because a marker at the right
 * number with the wrong kind of end is not a partly-right range, it is a different range.
 *
 * The shading is drawn from the marker outwards on the side the rule allows, so the learner can
 * see the whole accepted stretch rather than only the point they placed.
 */

import { useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The rule in words, as the store states it. */
  wording: string;
  /** The rule in symbols, which is what the learner is placing. */
  rule: string;
  /** Where the boundary sits. */
  boundary: number;
  /** True when the boundary weight itself is accepted. */
  closed: boolean;
  /** True when the accepted stretch runs to the RIGHT of the boundary. */
  upward: boolean;
  /** The scale the board draws. */
  min: number;
  max: number;
  step: number;
}

/** Neither board is the paragraph's own $w \ge 40$, whose answer the prose already states. */
const BOARDS: readonly Board[] = [
  {
    wording: "The store takes a load only if it weighs more than 25 minas.",
    rule: "w > 25",
    boundary: 25,
    closed: false,
    upward: true,
    min: 10,
    max: 40,
    step: 5,
  },
  {
    wording: "The bay holds a load only if it weighs 30 minas or less.",
    rule: "w \\le 30",
    boundary: 30,
    closed: true,
    upward: false,
    min: 15,
    max: 45,
    step: 5,
  },
];

const LEFT = 46;
const RIGHT = 396;
const AXIS_Y = 74;

export function InequalityEndpointDrag(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <InequalityEndpointDragBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function InequalityEndpointDragBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [at, setAt] = useState(board.min);
  const [end, setEnd] = useState<"closed" | "open" | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const scale = (RIGHT - LEFT) / (board.max - board.min);
  const x = (value: number) => LEFT + (value - board.min) * scale;
  const ticks: number[] = [];
  for (let value = board.min; value <= board.max; value += board.step) {
    ticks.push(value);
  }
  const interval = board.upward
    ? `${board.closed ? "[" : "("}${board.boundary}, \\infty)`
    : `(-\\infty, ${board.boundary}${board.closed ? "]" : ")"}`;

  function finish(earned: boolean) {
    setSolved(true);
    setFeedback(null);
    if (earned) {
      success();
    }
    onSolved();
  }

  function check() {
    if (solved) {
      return;
    }
    setAttempted(true);
    if (end === null) {
      setFeedback(
        "Place the boundary on the scale, then say whether a load of exactly that weight is one the store takes.",
      );
      return;
    }
    if (at === board.boundary && (end === "closed") === board.closed) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. The boundary is the weight the rule names, and whether it counts turns on the sign: a sign reading at least or at most takes its boundary in, while a strict one leaves it out.",
    );
  }

  function reveal() {
    setAt(board.boundary);
    setEnd(board.closed ? "closed" : "open");
    setRevealed(true);
    finish(false);
  }

  const placedClosed = end === "closed";
  const shadeFrom = board.upward ? x(at) : LEFT;
  const shadeTo = board.upward ? RIGHT : x(at);

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: mark the boundary of the loads this rule accepts, and set its end open or
        closed so the marked stretch is exactly the accepted one.
      </WidgetTask>

      <p className="lesson-equation__naming">{board.wording}</p>

      <svg
        viewBox="0 0 440 120"
        role="img"
        aria-label={`A weight scale from ${board.min} to ${board.max} minas, with a boundary marker at ${at}`}
      >
        <title>A weight scale with the accepted stretch marked</title>

        <SvgMath latex={board.rule} x={220} y={20} fontSize={17} color={SOFT} w={200} />

        {end !== null && shadeTo > shadeFrom ? (
          <rect
            x={shadeFrom}
            y={AXIS_Y - 9}
            width={shadeTo - shadeFrom}
            height={18}
            fill={solved ? CIVIC : SOFT}
            fillOpacity={0.16}
          />
        ) : null}

        <line x1={LEFT} y1={AXIS_Y} x2={RIGHT} y2={AXIS_Y} stroke={LINE} strokeWidth={2} />
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={x(value)}
              y1={AXIS_Y - 5}
              x2={x(value)}
              y2={AXIS_Y + 5}
              stroke={LINE}
              strokeWidth={1.5}
            />
            <text
              x={x(value)}
              y={AXIS_Y + 22}
              textAnchor="middle"
              fontSize={11}
              fill={SOFT}
            >
              {value}
            </text>
          </g>
        ))}

        {/* The marker. Filled for a closed end, hollow for an open one: the two states differ
            in FILL and in the widget's own words, never in hue alone. */}
        <circle
          cx={x(at)}
          cy={AXIS_Y}
          r={8}
          fill={placedClosed ? LABEL : "var(--paper)"}
          stroke={LABEL}
          strokeWidth={2.5}
        />
        <text x={x(at)} y={AXIS_Y - 16} textAnchor="middle" fontSize={12} fill={LABEL}>
          {at}
        </text>
      </svg>

      <div className="lesson-interactive__controls">
        <label className="lesson-interactive__slider-label" htmlFor="endpoint-at">
          Boundary at
        </label>
        <input
          id="endpoint-at"
          className="lesson-interactive__range"
          type="range"
          min={board.min}
          max={board.max}
          step={board.step}
          value={at}
          disabled={solved}
          aria-valuetext={`${at} minas`}
          onChange={(event) => {
            setAt(Number(event.target.value));
            setFeedback(null);
          }}
        />
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different rule
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__chip"
            aria-label="The boundary weight is accepted, so the end is closed"
            aria-pressed={end === "closed"}
            // Only the UNCHOSEN border is named here: the chosen one is the shared
            // `.lesson-interactive__chip[aria-pressed="true"]` rule, and an inline colour beats a
            // stylesheet, so naming it would restore the grey-on-grey it replaced.
            style={{ color: LABEL, borderColor: end === "closed" ? undefined : LINE }}
            onClick={() => {
              setEnd("closed");
              setFeedback(null);
            }}
          >
            Boundary accepted
          </button>
          <button
            type="button"
            className="lesson-interactive__chip"
            aria-label="The boundary weight is not accepted, so the end is open"
            aria-pressed={end === "open"}
            style={{ color: LABEL, borderColor: end === "open" ? undefined : LINE }}
            onClick={() => {
              setEnd("open");
              setFeedback(null);
            }}
          >
            Boundary refused
          </button>
          <button type="button" className="lesson-interactive__check" onClick={check}>
            Check
          </button>
        </div>
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealed}
        answer={<InlineMath latex={interval} />}
        why={
          <>
            The rule names <InlineMath latex={String(board.boundary)} />, so that is where
            the boundary sits, and the sign decides the rest.{" "}
            <InlineMath latex={board.rule} /> is{" "}
            {board.closed
              ? "a sign that takes its boundary in, so a load of exactly that weight is accepted and the end is closed"
              : "a strict sign, so a load of exactly that weight is refused and the end is open"}
            . That makes the accepted stretch <InlineMath latex={interval} />.
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
            That is the accepted stretch: <InlineMath latex={interval} />. Every weight in
            the shaded part is a load the store takes, and the boundary is{" "}
            {board.closed ? "one of them" : "not one of them"}.
          </>
        ) : feedback ? (
          <span style={{ color: BRICK }}>{feedback}</span>
        ) : (
          "Read the weight the rule names, then decide whether a load of exactly that weight is accepted."
        )}
      </p>
    </div>
  );
}
