/**
 * GEO.2 interactive (slide 1): a composite figure, worked out one piece at a time.
 *
 * The slide's claim is that an L-shaped plan is not a new formula but two rectangles read off
 * the same drawing, and that the cut may add two pieces together or take one piece away. So
 * the board deals the SAME family of figure under both routes: one plan is split by a cut and
 * its two parts added, the next is read as a full rectangle with a corner removed. The learner
 * types both piece areas and the total, which is what makes the route a piece of arithmetic
 * rather than a sentence they agreed with.
 *
 * Every side of the figure is dimensioned, all six of them, because the piece a route needs is
 * only obvious once the drawing states it: the lower rectangle is the bottom side by the right
 * side, and the upper one is the top side by the notch's own height. Nothing here asks the
 * learner to derive a missing length, which is GEO.1's work and not this slide's.
 *
 * The three blanks sit IN the equation rather than in a row of boxes captioned with what they
 * stand for, and each is graded on its own with credit that sticks, so a learner who has the
 * decomposition right and the multiplication wrong is told which of the two failed.
 */

import { type ReactNode, useState } from "react";

import { CIVIC, InlineMath, LABEL, SIGNAL, SIGNAL_DEEP, SOFT, SvgMath } from "../svgKit";
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

/** Pixels per meter. Every figure is drawn to the same scale, so the boards compare. */
const UNIT = 21;
/** The left edge and the ground line every figure is drawn from. */
const BASE_X = 104;
const BASE_Y = 252;
const LABEL_SIZE = 15;

/** A wash, so a piece can be tinted without borrowing the correctness palette. */
function wash(colour: string): string {
  return `color-mix(in srgb, ${colour} 13%, var(--paper))`;
}

interface Board {
  id: string;
  /** Whether the two pieces are added together or one is taken from the other. */
  route: "add" | "subtract";
  /** The full rectangle the plan is cut from, and the corner missing from its top right. */
  width: number;
  height: number;
  notchW: number;
  notchH: number;
}

/**
 * Two plans, one per route, and neither is the lesson's own terrace or the check's cistern.
 * The second is the larger figure, so the route changes and the arithmetic does not stay put.
 */
const BOARDS: readonly Board[] = [
  { id: "terrace", route: "add", width: 10, height: 8, notchW: 4, notchH: 3 },
  { id: "cloister", route: "subtract", width: 12, height: 9, notchW: 5, notchH: 4 },
];

/** One of the two pieces a route reads off the plan. */
interface Piece {
  /** The piece, named the way the task names it. */
  name: string;
  /** The two sides of the drawing it is measured by. */
  sides: readonly [number, number];
  area: number;
}

interface Reading {
  first: Piece;
  second: Piece;
  /** The area of the plan itself, once the route has been carried out. */
  total: number;
  /** The operator between the two pieces, as LaTeX. */
  op: string;
}

function readingOf(board: Board): Reading {
  const { width, height, notchW, notchH } = board;
  if (board.route === "add") {
    const first: Piece = {
      name: "the lower rectangle",
      sides: [width, height - notchH],
      area: width * (height - notchH),
    };
    const second: Piece = {
      name: "the upper rectangle",
      sides: [width - notchW, notchH],
      area: (width - notchW) * notchH,
    };
    return { first, second, total: first.area + second.area, op: "+" };
  }
  const first: Piece = {
    name: "the whole rectangle",
    sides: [width, height],
    area: width * height,
  };
  const second: Piece = {
    name: "the corner taken out",
    sides: [notchW, notchH],
    area: notchW * notchH,
  };
  return { first, second, total: first.area - second.area, op: "-" };
}

/** A piece as the arithmetic that produces it, for the status line and the reveal. */
function productTex(piece: Piece): string {
  return `${piece.sides[0]} \\times ${piece.sides[1]} = ${piece.area}`;
}

type SlotName = "first" | "second" | "total";

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

/**
 * One blank, in the position its value occupies in the equation.
 *
 * A settled blank keeps its box: the row is read back as a sentence about the plan, and the
 * boxes are what say which numbers on that row were the learner's to produce.
 */
function Slot({
  done,
  value,
  answer,
  aria,
  colour,
  given,
  onChange,
  onEnter,
}: {
  done: boolean;
  value: string;
  answer: number;
  aria: string;
  colour: string;
  /** Props from the shared reveal when this is the blank the passage just named. */
  given: RevealFilledEntry | RevealFillProps;
  onChange: (next: string) => void;
  onEnter: () => void;
}) {
  if (done) {
    return (
      <span
        className="lesson-equation__slot lesson-equation__slot--done"
        style={{ color: colour }}
      >
        <InlineMath latex={String(answer)} color={colour} />
      </span>
    );
  }
  return (
    <input
      className="lesson-equation__slot"
      style={{ color: colour }}
      type="text"
      inputMode="numeric"
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

export function GeoComposeBuilder(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <GeoComposeBuilderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoComposeBuilderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const reading = readingOf(board);
  const [entry, setEntry] = useState({ first: "", second: "", total: "" });
  const [settled, setSettled] = useState({ first: false, second: false, total: false });
  const [missed, setMissed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  const fill = useRevealFill();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = settled.first && settled.second && settled.total;
  const wanted: Record<SlotName, number> = {
    first: reading.first.area,
    second: reading.second.area,
    total: reading.total,
  };
  const outstanding = (["first", "second", "total"] as const).filter(
    (name) => !settled[name],
  );
  /** The blank a reveal would explain: the first one still owed. */
  const explaining = outstanding[0] ?? null;

  function landAll(next: typeof settled) {
    setSettled(next);
    if (next.first && next.second && next.total && !done) {
      setDone(true);
      onSolved();
    }
  }

  function check() {
    const next = {
      first: settled.first || parseWhole(entry.first) === wanted.first,
      second: settled.second || parseWhole(entry.second) === wanted.second,
      total: settled.total || parseWhole(entry.total) === wanted.total,
    };
    const landed =
      (next.first && !settled.first) ||
      (next.second && !settled.second) ||
      (next.total && !settled.total);
    if (landed) {
      success();
    }
    if (next.first && next.second && next.total) {
      setMissed(false);
      setFeedback(null);
      landAll(next);
      return;
    }
    landAll(next);
    setMissed(true);
    setFeedback(
      !next.first || !next.second ? (
        <>
          Not yet. Each piece is one rectangle of the drawing, so it is the two sides of
          that rectangle multiplied together, and both of those sides are already
          dimensioned on the plan.
        </>
      ) : (
        <>
          Both pieces are right, so the last blank is the route:{" "}
          {board.route === "add"
            ? "the two rectangles together make the whole plan."
            : "the corner is not part of the plan, so its area comes off the whole rectangle."}
        </>
      ),
    );
  }

  /** The shared reveal explains ONE blank, and this is what it fills in. */
  function resolveReveal() {
    if (explaining === null) {
      return;
    }
    setRevealed(true);
    setMissed(false);
    setFeedback(null);
    landAll({ ...settled, [explaining]: true });
  }

  const explainedPiece =
    explaining === "first"
      ? reading.first
      : explaining === "second"
        ? reading.second
        : null;

  /* ------------------------------------------------------------------ the plan itself */

  const { width, height, notchW, notchH } = board;
  const px = (x: number) => BASE_X + x * UNIT;
  const py = (y: number) => BASE_Y - y * UNIT;
  const outline = [
    [0, 0],
    [width, 0],
    [width, height - notchH],
    [width - notchW, height - notchH],
    [width - notchW, height],
    [0, height],
  ]
    .map(([x, y]) => `${px(x as number)},${py(y as number)}`)
    .join(" ");

  /** Each side, at the middle of the side and just outside the figure. */
  const dimensions: readonly {
    key: string;
    latex: string;
    x: number;
    y: number;
    inside: boolean;
  }[] = [
    { key: "bottom", latex: `${width}`, x: px(width / 2), y: py(0) + 18, inside: false },
    { key: "left", latex: `${height}`, x: px(0) - 20, y: py(height / 2), inside: false },
    {
      key: "right",
      latex: `${height - notchH}`,
      x: px(width) + 20,
      y: py((height - notchH) / 2),
      inside: false,
    },
    {
      key: "top",
      latex: `${width - notchW}`,
      x: px((width - notchW) / 2),
      y: py(height) - 18,
      inside: false,
    },
    {
      key: "notch-across",
      latex: `${notchW}`,
      x: px(width - notchW / 2),
      y: py(height - notchH) - 16,
      inside: true,
    },
    {
      key: "notch-up",
      latex: `${notchH}`,
      x: px(width - notchW) + 18,
      y: py(height - notchH / 2),
      inside: true,
    },
  ];

  const spokenRoute =
    board.route === "add"
      ? `a plan ${width} meters along the bottom and ${height} meters up the left, cut into a lower rectangle and an upper one`
      : `a plan read as a full rectangle ${width} meters by ${height} meters with a corner ${notchW} meters by ${notchH} meters taken out of it`;

  return (
    <div className="lesson-interactive lesson-interactive--builder">
      <WidgetTask>
        Goal: work out the area of this plan in square meters by{" "}
        {board.route === "add"
          ? "taking the two rectangles the cut makes and adding them"
          : "taking the whole rectangle and removing the corner that is missing from it"}
        , filling in both pieces and the total.
      </WidgetTask>

      <svg viewBox="0 0 440 300" role="img" aria-label={spokenRoute}>
        <title>A composite plan, dimensioned on every side</title>

        {board.route === "add" ? (
          <>
            <rect
              x={px(0)}
              y={py(height - notchH)}
              width={width * UNIT}
              height={(height - notchH) * UNIT}
              fill={wash(SIGNAL)}
            />
            <rect
              x={px(0)}
              y={py(height)}
              width={(width - notchW) * UNIT}
              height={notchH * UNIT}
              fill={wash(SIGNAL_DEEP)}
            />
            {/* The cut, drawn across the part of the plan the outline does not already
                divide, so the two pieces the task names are visibly two. */}
            <line
              x1={px(0)}
              y1={py(height - notchH)}
              x2={px(width - notchW)}
              y2={py(height - notchH)}
              stroke={SIGNAL_DEEP}
              strokeWidth={1.75}
              strokeDasharray="7 5"
            />
          </>
        ) : (
          <>
            <rect
              x={px(0)}
              y={py(height)}
              width={width * UNIT}
              height={height * UNIT}
              fill={wash(SIGNAL)}
            />
            <rect
              x={px(width - notchW)}
              y={py(height)}
              width={notchW * UNIT}
              height={notchH * UNIT}
              fill="var(--paper)"
              stroke={SIGNAL_DEEP}
              strokeWidth={1.75}
              strokeDasharray="7 5"
            />
            <text
              x={px(width - notchW / 2)}
              y={py(height) + 16}
              textAnchor="middle"
              fontSize={12}
              fill={SIGNAL_DEEP}
            >
              taken out
            </text>
          </>
        )}

        <polygon
          points={outline}
          fill="none"
          stroke={solved ? CIVIC : LABEL}
          strokeWidth={2.25}
          strokeLinejoin="round"
        />

        {dimensions.map((dim) => (
          <SvgMath
            key={dim.key}
            latex={dim.latex}
            x={dim.x}
            y={dim.y}
            fontSize={LABEL_SIZE}
            color={dim.inside ? SIGNAL_DEEP : LABEL}
            plate={dim.inside}
            w={80}
          />
        ))}
        <text
          x={px(width / 2)}
          y={py(0) + 38}
          textAnchor="middle"
          fontSize={12}
          fill={SOFT}
        >
          every side in meters
        </text>
      </svg>

      <div className="lesson-equation">
        <div className="lesson-equation__row" data-state={solved ? "done" : "open"}>
          <span className="lesson-equation__stage">
            {board.route === "add" ? "add the pieces" : "take the corner out"}
          </span>
          <span className="lesson-equation__body">
            <InlineMath latex="\text{area} =" />
            <Slot
              done={settled.first}
              value={entry.first}
              answer={reading.first.area}
              aria={`the area of ${reading.first.name}, in square meters`}
              colour={SIGNAL}
              given={
                explaining === "first" ? fill.entry(reading.first.area) : fill.mark(false)
              }
              onChange={(next) => setEntry((prev) => ({ ...prev, first: next }))}
              onEnter={check}
            />
            <InlineMath latex={reading.op} />
            <Slot
              done={settled.second}
              value={entry.second}
              answer={reading.second.area}
              aria={`the area of ${reading.second.name}, in square meters`}
              colour={SIGNAL_DEEP}
              given={
                explaining === "second" ? fill.entry(reading.second.area) : fill.mark(false)
              }
              onChange={(next) => setEntry((prev) => ({ ...prev, second: next }))}
              onEnter={check}
            />
            <InlineMath latex="=" />
            <Slot
              done={settled.total}
              value={entry.total}
              answer={reading.total}
              aria="the area of the whole plan, in square meters"
              colour={LABEL}
              given={explaining === "total" ? fill.entry(reading.total) : fill.mark(false)}
              onChange={(next) => setEntry((prev) => ({ ...prev, total: next }))}
              onEnter={check}
            />
          </span>
          {solved ? null : (
            <button type="button" className="lesson-interactive__check" onClick={check}>
              Check
            </button>
          )}
        </div>
      </div>

      {solved && (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different plan
        </button>
      )}

      <WidgetReveal
        available={missed && !solved}
        revealed={revealed}
        answer={
          explaining === null ? null : <InlineMath latex={String(wanted[explaining])} />
        }
        why={
          explainedPiece !== null ? (
            <>
              {explainedPiece.name.charAt(0).toUpperCase()}
              {explainedPiece.name.slice(1)} measures{" "}
              <InlineMath latex={`${explainedPiece.sides[0]}`} /> meters by{" "}
              <InlineMath latex={`${explainedPiece.sides[1]}`} /> meters, both of them read
              straight off the plan, so its area is{" "}
              <InlineMath latex={productTex(explainedPiece)} /> square meters.
            </>
          ) : board.route === "add" ? (
            <>
              The cut makes two rectangles and nothing else, so the plan is the two of them
              together:{" "}
              <InlineMath
                latex={`${reading.first.area} + ${reading.second.area} = ${reading.total}`}
              />{" "}
              square meters.
            </>
          ) : (
            <>
              The corner is not part of the plan, so it comes off the full rectangle rather
              than being added to it:{" "}
              <InlineMath
                latex={`${reading.first.area} - ${reading.second.area} = ${reading.total}`}
              />{" "}
              square meters.
            </>
          )
        }
        onReveal={resolveReveal}
        label="Reveal this piece"
        // The last blank IS the gate, so handing that one back would hand the gate over.
        othersRemain={outstanding.length > 1}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {solved ? (
          <>
            The plan covers <InlineMath latex={`${reading.total}`} /> square meters.{" "}
            {board.route === "add"
              ? "Two rectangles, added, and the cut chose itself once the sides were dimensioned."
              : "One rectangle with a corner removed, which is the same figure counted the other way round."}
          </>
        ) : feedback ? (
          feedback
        ) : board.route === "add" ? (
          <>
            The cut splits the plan into a rectangle along the bottom and a shorter one
            above it. Multiply the sides of each, then add.
          </>
        ) : (
          <>
            Read the plan as the full rectangle it sits inside, work out the corner that is
            missing from it, and subtract.
          </>
        )}
      </p>
    </div>
  );
}
