/**
 * FUN.1 slide 2: the vertical-line test, on a plane the lesson has to supply itself.
 *
 * Registered as `function-vertical-line-slider`, because a native range input sweeps the
 * rule across the grid and that is the whole mechanic.
 *
 * ## Why the plane is explained here rather than assumed
 *
 * FUN.1's only registry prerequisite is `NUM.4`. `CG.1` is a SIBLING, not a prereq, so a
 * learner can reach this slide having never plotted a point. Every dot therefore carries
 * its own coordinate pair, the axes are captioned in words, and the status line says what
 * the two numbers in a pair count before it asks for anything.
 *
 * ## Two stages, and the first one is the work
 *
 * Sweeping alone proves nothing, so the learner produces a value: the GREATEST number of
 * dots one vertical rule touches. The ruling that follows is a deduction from that number
 * rather than a fresh guess, and it locks on the first tap, because with two options a
 * nudge-and-retry is not a question. The board settles either way (the gate turns on the
 * ruling being made, not on its being right), keeps both options on screen with the miss
 * marked, and offers the working.
 *
 * Board one FAILS the test and is dealt first. A board where everything is a function is
 * not asking anything, so the first thing a learner meets here is a relation that breaks.
 */

import { useState } from "react";

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
  SIGNAL_DEEP,
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
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

/* -------------------------------------------------------------------------- */
/* The plane                                                                    */
/* -------------------------------------------------------------------------- */

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 44;
const RIGHT = 420;
const TOP = 12;
const BOTTOM = 252;
/** Every integer gets a gridline, so a dot sits somewhere a learner can name. */
const INTEGERS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
/** A number centered on the plot's border is half outside it, so the ends carry none. */
const TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], X_MIN, X_MAX);

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
const LABEL_SIZE = 12;
const TICK_SIZE = 10;

/** The axis numbers, as obstacles: they are drawn inside the plot, against the axes. */
const TICK_BOXES: readonly LabelBox[] = [
  ...TICKS.map((tick) => ({
    x: mapX(0) - 7 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
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

/* -------------------------------------------------------------------------- */
/* The two boards                                                               */
/* -------------------------------------------------------------------------- */

type Point = readonly [number, number];

interface Board {
  points: readonly Point[];
  /** The greatest number of dots one vertical rule meets. */
  most: number;
  aria: string;
}

const BOARDS: readonly Board[] = [
  {
    points: [
      [-4, 3],
      [-1, -2],
      [2, 5],
      [2, -3],
      [5, 1],
    ],
    most: 2,
    aria: "Five plotted points, two of which sit one above the other at the same across value",
  },
  {
    points: [
      [-5, -4],
      [-2, 2],
      [1, 4],
      [3, -1],
      [5, 3],
    ],
    most: 1,
    aria: "Five plotted points, every one of them at a different across value",
  },
];

/** How many of a board's dots the rule at `at` passes through. */
function touching(board: Board, at: number): number {
  return board.points.filter(([x]) => x === at).length;
}

/** The across values where the rule meets more than one dot. */
function clashes(board: Board): readonly number[] {
  return INTEGERS.filter((value) => touching(board, value) > 1);
}

type Verdict = "function" | "not";

const VERDICTS: readonly { id: Verdict; label: string; aria: string }[] = [
  { id: "function", label: "A function", aria: "the relation is a function" },
  { id: "not", label: "Not a function", aria: "the relation is not a function" },
];

/**
 * What a marked option says, in every channel it says it in.
 *
 * The same three marks `BinaryRowSort` uses, and for the same reason: `CIVIC` and `BRICK`
 * report on the LEARNER'S pick, so the right call on a board they missed takes the amber
 * standing mark rather than borrowing the success end of the correctness palette. None of
 * the three is carried by colour alone.
 */
const MARKS = {
  "picked-right": {
    colour: CIVIC,
    style: "solid",
    glyph: "\u2713",
    spoken: "your answer, correct",
  },
  "picked-wrong": {
    colour: BRICK,
    style: "solid",
    glyph: "\u2717",
    spoken: "your answer, wrong",
  },
  standing: {
    colour: SIGNAL_DEEP,
    style: "dashed",
    glyph: "\u2713",
    spoken: "the right call here, which you did not pick",
  },
} as const;

/* -------------------------------------------------------------------------- */
/* The widget                                                                   */
/* -------------------------------------------------------------------------- */

export function FunctionVerticalLineTest(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <FunctionVerticalLineTestBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function FunctionVerticalLineTestBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [at, setAt] = useState(X_MIN);
  /** 0 asks for the greatest count, 1 asks for the ruling, 2 is settled. */
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealedCount, setRevealedCount] = useState(false);
  const [revealedRuling, setRevealedRuling] = useState(false);
  const [called, setCalled] = useState<Verdict | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const settled = stage === 2;
  const right: Verdict = board.most > 1 ? "not" : "function";
  const missed = called !== null && called !== right;
  const met = touching(board, at);

  function checkCount() {
    if (stage !== 0) {
      return;
    }
    setAttempted(true);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Enter a number.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about watching the count, which would answer a question the
    // learner did not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === board.most) {
      setFeedback(null);
      success();
      setStage(1);
      return;
    }
    setFeedback(
      "Not that many. Take the rule all the way across and watch the count as it passes each column of dots, then give the largest count you saw.",
    );
  }

  function revealCount() {
    setEntry(String(board.most));
    setRevealedCount(true);
    setFeedback(null);
    setStage(1);
  }

  function rule(next: Verdict) {
    if (stage !== 1) {
      return;
    }
    setCalled(next);
    setStage(2);
    if (next === right) {
      success();
    }
    // CALLED, not called correctly. The lock is what makes a two-way choice a question; it
    // is not a reason to send a learner back through a board they have already worked.
    if (!done) {
      setDone(true);
      onSolved();
    }
  }

  /** The coordinate labels, placed in turn so no two land on each other. */
  const placed: LabelBox[] = [];
  const labels = board.points.map(([x, y]) => {
    const latex = `(${x},\\, ${y})`;
    const box = labelSpot({
      x: mapX(x),
      y: mapY(y),
      frame: LABEL_FRAME,
      dx: 1,
      dy: -1,
      halfW: labelHalfW(latex, LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 9,
      avoid: [...TICK_BOXES, ...placed],
    });
    placed.push(box);
    return { latex, box, key: `${x}:${y}` };
  });

  const markOf = (option: Verdict): keyof typeof MARKS | null => {
    if (called === null) {
      return null;
    }
    if (option === called) {
      return called === right ? "picked-right" : "picked-wrong";
    }
    return option === right ? "standing" : null;
  };

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Sweep the rule across the grid, give the greatest number of dots it ever touches at
        once, and then rule on whether the relation is a function.
      </WidgetTask>

      <svg viewBox="0 0 440 292" role="img" aria-label={board.aria}>
        <title>Plotted pairs with a vertical rule sweeping across them</title>

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
        {INTEGERS.map((value) => (
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
        {INTEGERS.map((value) => (
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

        <line
          x1={mapX(at)}
          y1={TOP}
          x2={mapX(at)}
          y2={BOTTOM}
          stroke={SIGNAL}
          strokeWidth={2.4}
          strokeLinecap="round"
        />

        {board.points.map(([x, y]) => (
          <circle
            key={`p${x}:${y}`}
            cx={mapX(x)}
            cy={mapY(y)}
            r={x === at ? 6.5 : 5}
            fill={x === at ? SIGNAL : LABEL}
          />
        ))}

        {labels.map((label) => (
          <PlotLabel
            key={label.key}
            box={label.box}
            latex={label.latex}
            fontSize={LABEL_SIZE}
            color={LABEL}
          />
        ))}

        {TICKS.map((tick) => (
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
        {TICKS.map((tick) => (
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

        <text x={RIGHT} y={BOTTOM + 22} textAnchor="end" fontSize={11} fill={SOFT}>
          first number counts across
        </text>
        <text x={LEFT} y={BOTTOM + 22} textAnchor="start" fontSize={11} fill={SOFT}>
          second number counts up
        </text>
        <text x={220} y={BOTTOM + 40} textAnchor="middle" fontSize={11} fill={SOFT}>
          {met === 1 ? "the rule touches one dot" : `the rule touches ${met} dots`}
        </text>
      </svg>

      <div className="lesson-interactive__controls">
        <span className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed">
          Rule at <InlineMath latex={`x = ${at}`} />
        </span>
        <input
          className="lesson-interactive__range"
          type="range"
          min={X_MIN}
          max={X_MAX}
          step={1}
          value={at}
          aria-label="Slide the vertical rule across the grid"
          onChange={(event) => setAt(Number(event.target.value))}
        />
      </div>

      {stage === 0 && (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">Most dots at once</span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label="The greatest number of dots one vertical rule touches"
              onChange={(event) => setEntry(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  checkCount();
                }
              }}
            />
          </div>
          <button type="button" className="lesson-interactive__check" onClick={checkCount}>
            Check
          </button>
        </div>
      )}

      {stage > 0 && (
        <div className="lesson-interactive__controls">
          {VERDICTS.map((option) => {
            const name = markOf(option.id);
            const mark = name === null ? null : MARKS[name];
            return (
              <button
                key={option.id}
                type="button"
                className="lesson-interactive__chip"
                data-mark={name ?? undefined}
                disabled={called !== null}
                aria-label={mark === null ? option.aria : `${option.aria}, ${mark.spoken}`}
                style={
                  mark === null
                    ? { color: LABEL, borderColor: LINE }
                    : {
                        color: mark.colour,
                        borderColor: mark.colour,
                        borderStyle: mark.style,
                      }
                }
                onClick={() => rule(option.id)}
              >
                {option.label}
                {mark === null ? null : (
                  <span aria-hidden="true" className="lesson-classify__mark">
                    {mark.glyph}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {settled && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with a different set of dots
        </button>
      )}

      <WidgetReveal
        // On the count stage, once they have tried. On the ruling stage, only where the
        // call went wrong: a board called correctly has nothing left to explain.
        available={stage === 0 ? attempted : missed}
        revealed={stage === 0 ? revealedCount : revealedRuling}
        answer={
          stage === 0 ? (
            <InlineMath latex={String(board.most)} />
          ) : (
            (VERDICTS.find((option) => option.id === right)?.label ?? "")
          )
        }
        why={
          stage === 0 ? (
            board.most > 1 ? (
              <>
                Two dots sit one above the other at{" "}
                <InlineMath latex={`x = ${clashes(board)[0] ?? 0}`} />, so the rule there
                touches both of them at once. Everywhere else it touches one dot or none.
              </>
            ) : (
              <>
                Every dot sits at a different across value, so wherever the rule stops it
                touches one dot at most and never two.
              </>
            )
          ) : board.most > 1 ? (
            <>
              A vertical rule touching two dots means one input has been given two different
              outputs, and a function is allowed only one, so this relation fails the test.
            </>
          ) : (
            <>
              No vertical rule touches two dots, so no input carries more than one output
              and the relation passes the test.
            </>
          )
        }
        onReveal={stage === 0 ? revealCount : () => setRevealedRuling(true)}
        // The ruling is still outstanding while the count is being asked for, so the board
        // can be handed back; once it is called there is nothing left on it to produce.
        othersRemain={stage === 0}
        label={stage === 0 ? "Reveal the count" : "Show the working"}
      />

      <p
        className="lesson-interactive__status"
        data-state={settled && !missed ? "solved" : feedback || missed ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {settled ? (
          missed ? (
            <>
              The greatest count was <InlineMath latex={String(board.most)} />, and that is
              what decides it: more than one dot on a single vertical rule means one input
              with two outputs.
            </>
          ) : board.most > 1 ? (
            <>
              Ruled. One vertical rule caught two dots, so one input carries two different
              outputs and this relation is not a function.
            </>
          ) : (
            <>
              Ruled. No vertical rule catches two dots, so every input carries exactly one
              output and this relation is a function.
            </>
          )
        ) : feedback ? (
          feedback
        ) : stage === 1 ? (
          "Now rule on it. A relation is a function only when no single vertical rule can touch two dots."
        ) : (
          "Each dot is one recorded pair: the first number counts across from the center and the second counts up. Slide the rule and watch how many dots it meets."
        )}
      </p>
    </div>
  );
}
