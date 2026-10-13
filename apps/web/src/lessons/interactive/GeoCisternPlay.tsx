/**
 * GEO.2 interactive (slide 2): filling a cistern, predicted first and then watched.
 *
 * A prism's volume is one idea applied twice, and the slide's whole claim is that the cross
 * section does not have to be a rectangle for the idea to hold. So the board deals a
 * rectangular cistern and then a round one, and asks for the two numbers in the same order
 * both times: the area of the base, and then that area stacked to the depth. A learner who
 * has learnt "length times width times height" as one string of three numbers has nothing to
 * say about the round one, which is exactly what the second board is for.
 *
 * The round board is answered in terms of $\pi$, and the $\pi$ is printed beside the blank
 * rather than typed into it, so the box itself takes the coefficient alone. That is a
 * shortcut this board can afford and NOT the convention the learner is being prepared for:
 * `d10.geo2.cylinder-volume-exact.l3` grades a typed `588*pi`, star and symbol included. So
 * any copy here has to name the printed $\pi$ as this board's own arrangement and point at
 * the written form; copy that presents it as the way an exact answer is entered trains the
 * learner against the item this widget exists to prepare them for.
 *
 * PREDICT, THEN VERIFY. The fill runs only once both numbers are in: it stacks the base one
 * meter at a time and prints the running total, so the learner sees the multiplication they
 * predicted actually happening. Nothing about it can give the answer away, because it does
 * not move until the answer has been produced.
 */

import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  CIVIC,
  InlineMath,
  LABEL,
  LINE,
  SIGNAL,
  SIGNAL_DEEP,
  SOFT,
  SvgMath,
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

/** One meter of depth per tick while the cistern fills. */
const FILL_MS = 620;

function wash(colour: string, percent: number): string {
  return `color-mix(in srgb, ${colour} ${percent}%, var(--paper))`;
}

interface Board {
  id: string;
  kind: "prism" | "cylinder";
  /** The depth the cross section is stacked to. */
  depth: number;
  /** A rectangular floor, in meters. Unused by the round board. */
  length: number;
  width: number;
  /** The radius of a round floor, in meters. Unused by the rectangular board. */
  radius: number;
}

const BOARDS: readonly Board[] = [
  { id: "tank", kind: "prism", depth: 3, length: 10, width: 4, radius: 0 },
  { id: "well", kind: "cylinder", depth: 6, length: 0, width: 0, radius: 3 },
];

/** What each board asks for, and how each answer reads once it is on the page. */
interface Reading {
  /** The base area, as a plain number. The round board counts it in multiples of pi. */
  base: number;
  volume: number;
  /** True when both answers are counted in multiples of pi. */
  exact: boolean;
  /** The base area as it is worked out, for the status line and the reveal. */
  baseTex: string;
  volumeTex: string;
  baseAria: string;
  volumeAria: string;
  /** The cross section, named the way the task names it. */
  section: string;
}

function readingOf(board: Board): Reading {
  if (board.kind === "prism") {
    const base = board.length * board.width;
    return {
      base,
      volume: base * board.depth,
      exact: false,
      baseTex: `${board.length} \\times ${board.width} = ${base}`,
      volumeTex: `${base} \\times ${board.depth} = ${base * board.depth}`,
      baseAria: "the area of the floor, in square meters",
      volumeAria: "the volume of the cistern, in cubic meters",
      section: "the rectangular floor",
    };
  }
  const base = board.radius * board.radius;
  return {
    base,
    volume: base * board.depth,
    exact: true,
    baseTex: `\\pi \\times ${board.radius}^{2} = ${base}\\pi`,
    volumeTex: `${base}\\pi \\times ${board.depth} = ${base * board.depth}\\pi`,
    baseAria: "how many pi square meters the round floor covers",
    volumeAria: "how many pi cubic meters the well holds",
    section: "the round floor",
  };
}

/** A typed whole number, or null when the entry is not one. */
function parseWhole(raw: string): number | null {
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

/** A number as it is written on this board: bare, or as a multiple of pi. */
function amount(value: number, exact: boolean): string {
  return exact ? `${value}\\pi` : `${value}`;
}

export function GeoCisternPlay(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GeoCisternPlayBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoCisternPlayBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const reading = readingOf(board);
  /** 0 the base area, 1 the volume, 2 both in. */
  const [stage, setStage] = useState(0);
  const [entry, setEntry] = useState({ base: "", volume: "" });
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [filled, setFilled] = useState(0);
  const [pouring, setPouring] = useState(false);
  const done = useRef(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = stage >= 2;

  // The pour, one meter of depth per tick. Cleared on unmount, so a redraw taken part way
  // through a fill cannot leave a timer running against a board that has gone.
  useEffect(() => {
    if (!pouring) {
      return;
    }
    if (filled >= board.depth) {
      setPouring(false);
      return;
    }
    const timer = setTimeout(() => setFilled((n) => n + 1), FILL_MS);
    return () => clearTimeout(timer);
  }, [pouring, filled, board.depth]);

  function land(next: number) {
    setStage(next);
    setMissed(false);
    setFeedback(null);
    if (next >= 2 && !done.current) {
      done.current = true;
      onSolved();
    }
  }

  function check() {
    const raw = stage === 0 ? entry.base : entry.volume;
    const wanted = stage === 0 ? reading.base : reading.volume;
    const typed = parseWhole(raw);
    if (typed === null) {
      setMissed(true);
      setFeedback(
        reading.exact
          ? "The pi is already printed beside this box, so the number that multiplies it is all that goes in here. A practice question prints no pi for you: there you type the whole answer yourself, written as 3*pi."
          : "Type one whole number, with no unit after it.",
      );
      return;
    }
    if (typed !== wanted) {
      setMissed(true);
      setFeedback(
        stage === 0 ? (
          <>
            Not that. The base is the flat cross section the cistern keeps all the way down,
            so it is an area:{" "}
            {reading.exact ? (
              <>
                a circle of radius <InlineMath latex={`${board.radius}`} /> is{" "}
                <InlineMath latex="\pi r^{2}" />.
              </>
            ) : (
              <>
                a rectangle is its length times its width, and the depth takes no part in
                it.
              </>
            )}
          </>
        ) : (
          <>
            Not that. A prism holds its cross section stacked to its depth, so the volume is
            the base area multiplied by <InlineMath latex={`${board.depth}`} />, and nothing
            in that product is measured twice.
          </>
        ),
      );
      return;
    }
    success();
    setRevealed(false);
    land(stage + 1);
  }

  /** The shared reveal explains the open stage, and this is what it settles. */
  function resolveReveal() {
    setRevealed(true);
    land(stage + 1);
  }

  /* --------------------------------------------------------------------- the vessel */

  const level = board.depth === 0 ? 0 : filled / board.depth;
  const vessel: ReactNode =
    board.kind === "prism" ? (
      <PrismVessel board={board} level={level} solved={solved} />
    ) : (
      <CylinderVessel board={board} level={level} solved={solved} />
    );

  const running = reading.base * filled;

  return (
    <div className="lesson-interactive lesson-interactive--play">
      <WidgetTask>
        Goal: say what area {reading.section} covers and how much the cistern holds when
        that area is stacked to its full depth, then pour it in and watch the total build.
      </WidgetTask>

      <svg
        viewBox="0 0 440 300"
        role="img"
        aria-label={
          board.kind === "prism"
            ? `A rectangular cistern ${board.length} meters by ${board.width} meters and ${board.depth} meters deep`
            : `A round well of radius ${board.radius} meters and depth ${board.depth} meters`
        }
      >
        <title>Fill the cistern one meter of depth at a time</title>
        {vessel}
        {filled > 0 && (
          <SvgMath
            latex={`${amount(reading.base, reading.exact)} \\times ${filled} = ${amount(running, reading.exact)}`}
            x={220}
            y={276}
            fontSize={17}
            color={SIGNAL_DEEP}
            plate
          />
        )}
      </svg>

      <div className="lesson-equation">
        <div className="lesson-equation__row" data-state={stage > 0 ? "done" : "open"}>
          <span className="lesson-equation__stage">base</span>
          <span className="lesson-equation__body">
            <InlineMath
              latex={
                board.kind === "prism"
                  ? `${board.length} \\times ${board.width} =`
                  : `\\pi \\times ${board.radius}^{2} =`
              }
            />
            {stage > 0 ? (
              <span
                className="lesson-equation__slot lesson-equation__slot--done"
                style={{ color: CIVIC }}
              >
                <InlineMath latex={String(reading.base)} color={CIVIC} />
              </span>
            ) : (
              <input
                className="lesson-equation__slot"
                style={{ color: LABEL }}
                type="text"
                inputMode="numeric"
                value={entry.base}
                aria-label={reading.baseAria}
                onChange={(event) =>
                  setEntry((prev) => ({ ...prev, base: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    check();
                  }
                }}
                {...(fill.entry(reading.base) as RevealFilledEntry | RevealFillProps)}
              />
            )}
            {reading.exact ? <InlineMath latex="\pi" /> : null}
          </span>
          {stage === 0 ? (
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          ) : null}
        </div>

        <div
          className="lesson-equation__row"
          data-state={stage > 1 ? "done" : stage === 1 ? "open" : "locked"}
        >
          <span className="lesson-equation__stage">volume</span>
          <span className="lesson-equation__body">
            <InlineMath
              latex={
                stage > 0
                  ? `${amount(reading.base, reading.exact)} \\times ${board.depth} =`
                  : `\\text{base} \\times ${board.depth} =`
              }
            />
            {stage > 1 ? (
              <span
                className="lesson-equation__slot lesson-equation__slot--done"
                style={{ color: CIVIC }}
              >
                <InlineMath latex={String(reading.volume)} color={CIVIC} />
              </span>
            ) : stage === 1 ? (
              <input
                className="lesson-equation__slot"
                style={{ color: LABEL }}
                type="text"
                inputMode="numeric"
                value={entry.volume}
                aria-label={reading.volumeAria}
                onChange={(event) =>
                  setEntry((prev) => ({ ...prev, volume: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    check();
                  }
                }}
                {...(fill.entry(reading.volume) as RevealFilledEntry | RevealFillProps)}
              />
            ) : (
              <span className="lesson-equation__slot lesson-equation__slot--locked" />
            )}
            {reading.exact ? <InlineMath latex="\pi" /> : null}
          </span>
          {stage === 1 ? (
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          ) : null}
        </div>
      </div>

      {solved && (
        <div className="lesson-interactive__controls">
          <button
            type="button"
            className="lesson-interactive__check"
            onClick={() => {
              setFilled(0);
              setPouring(true);
            }}
            disabled={pouring}
          >
            {filled >= board.depth ? "Pour it again" : "Pour it in"}
          </button>
          <button
            type="button"
            className="lesson-interactive__check"
            onClick={() => {
              setPouring(false);
              setFilled((n) => (n >= board.depth ? n : n + 1));
            }}
          >
            One meter
          </button>
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over on a different cistern
          </button>
        </div>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealed}
        answer={
          <InlineMath
            latex={amount(stage === 0 ? reading.base : reading.volume, reading.exact)}
          />
        }
        why={
          stage === 0 ? (
            <>
              The base is the cross section the cistern keeps all the way down, and it is an
              area rather than a length: <InlineMath latex={reading.baseTex} />
              {reading.exact ? null : " square meters"}.
            </>
          ) : (
            <>
              Every meter of depth holds one base area, so the depth multiplies it:{" "}
              <InlineMath latex={reading.volumeTex} />. That is why a round cistern needs no
              new rule, only a different cross section.
            </>
          )
        }
        onReveal={resolveReveal}
        label={stage === 0 ? "Reveal the base" : "Reveal the volume"}
        // Revealing the base leaves the volume outstanding; revealing the volume is the gate.
        othersRemain={stage === 0}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {feedback ? (
          feedback
        ) : solved ? (
          <>
            The cistern holds <InlineMath latex={amount(reading.volume, reading.exact)} />{" "}
            cubic meters. Pour it in: each meter of depth adds one whole base area, which is
            what makes the volume a multiplication rather than a new formula.
            {reading.exact
              ? ` Where nothing prints the pi for you, that same answer is typed ${reading.volume}*pi.`
              : null}
          </>
        ) : stage === 0 ? (
          <>
            Start with the base. It is the shape of the floor, and its area is counted in
            square meters.
          </>
        ) : (
          <>
            Now stack it. The cistern keeps that same cross section for{" "}
            <InlineMath latex={`${board.depth}`} /> meters of depth.
          </>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- the vessels */

/** The rectangular cistern, drawn as a box with the water standing in its front face. */
function PrismVessel({
  board,
  level,
  solved,
}: {
  board: Board;
  level: number;
  solved: boolean;
}) {
  const kx = 17;
  const ky = 22;
  const left = 118;
  const top = 132;
  const front = board.length * kx;
  const tall = board.depth * ky;
  const bottom = top + tall;
  const right = left + front;
  /** The offset one unit of width takes into the page. */
  const dx = 7.5;
  const dy = -5;
  const ox = board.width * dx;
  const oy = board.width * dy;
  const surface = bottom - tall * level;

  return (
    <>
      <polygon
        points={`${left},${top} ${right},${top} ${right + ox},${top + oy} ${left + ox},${top + oy}`}
        fill={wash(SOFT, 8)}
        stroke={LINE}
        strokeWidth={1.25}
      />
      <polygon
        points={`${right},${top} ${right + ox},${top + oy} ${right + ox},${bottom + oy} ${right},${bottom}`}
        fill={wash(SOFT, 14)}
        stroke={LINE}
        strokeWidth={1.25}
      />
      {level > 0 && (
        <rect
          x={left}
          y={surface}
          width={front}
          height={bottom - surface}
          fill={wash(SIGNAL, 30)}
        />
      )}
      <rect
        x={left}
        y={top}
        width={front}
        height={tall}
        fill="none"
        stroke={solved ? CIVIC : LABEL}
        strokeWidth={2.25}
      />
      {level > 0 && (
        <polygon
          points={`${left},${surface} ${right},${surface} ${right + ox},${surface + oy} ${left + ox},${surface + oy}`}
          fill={wash(SIGNAL, 46)}
          stroke={SIGNAL_DEEP}
          strokeWidth={1.25}
        />
      )}
      <SvgMath
        latex={`${board.length}`}
        x={left + front / 2}
        y={bottom + 20}
        fontSize={15}
        w={90}
      />
      <SvgMath
        latex={`${board.depth}`}
        x={left - 20}
        y={(top + bottom) / 2}
        fontSize={15}
        w={90}
      />
      <SvgMath
        latex={`${board.width}`}
        x={right + ox / 2 + 14}
        y={bottom + oy / 2 + 12}
        fontSize={15}
        color={SOFT}
        w={90}
      />
    </>
  );
}

/** The round well: an ellipse for the mouth, straight sides, and the water standing inside. */
function CylinderVessel({
  board,
  level,
  solved,
}: {
  board: Board;
  level: number;
  solved: boolean;
}) {
  const rx = board.radius * 21;
  const ry = rx * 0.3;
  const cx = 220;
  const top = 128;
  const tall = board.depth * 17;
  const bottom = top + tall;
  const surface = bottom - tall * level;

  return (
    <>
      {level > 0 && (
        <>
          <rect
            x={cx - rx}
            y={surface}
            width={rx * 2}
            height={bottom - surface}
            fill={wash(SIGNAL, 30)}
          />
          <path
            d={`M ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} Z`}
            fill={wash(SIGNAL, 30)}
          />
          <ellipse
            cx={cx}
            cy={surface}
            rx={rx}
            ry={ry}
            fill={wash(SIGNAL, 46)}
            stroke={SIGNAL_DEEP}
            strokeWidth={1.25}
          />
        </>
      )}
      <path
        d={`M ${cx - rx} ${top} L ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} L ${cx + rx} ${top}`}
        fill="none"
        stroke={solved ? CIVIC : LABEL}
        strokeWidth={2.25}
      />
      <ellipse
        cx={cx}
        cy={top}
        rx={rx}
        ry={ry}
        fill={wash(SOFT, 8)}
        stroke={solved ? CIVIC : LABEL}
        strokeWidth={2.25}
      />
      <line
        x1={cx}
        y1={top}
        x2={cx + rx}
        y2={top}
        stroke={SIGNAL_DEEP}
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
      <SvgMath
        latex={`${board.radius}`}
        x={cx + rx / 2}
        y={top - 16}
        fontSize={15}
        color={SIGNAL_DEEP}
        plate
        w={90}
      />
      <line
        x1={cx + rx + 26}
        y1={top}
        x2={cx + rx + 26}
        y2={bottom}
        stroke={SOFT}
        strokeWidth={1.25}
      />
      <SvgMath
        latex={`${board.depth}`}
        x={cx + rx + 46}
        y={(top + bottom) / 2}
        fontSize={15}
        w={90}
      />
    </>
  );
}
