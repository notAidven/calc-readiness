/**
 * LF.4 interactive (slide 0): what a solution of a system IS, read off the picture.
 *
 * Round one draws two lines that cross at a lattice point. The learner walks a marker to
 * that point with the coordinate steppers, places it, and then has to VERIFY it: the point
 * is only a solution once it has been substituted into both equations, so the round is not
 * finished by landing on the crossing alone. A miss says which line the point is on, so a
 * learner sitting on one line hears that they are half way rather than just wrong.
 *
 * Round two draws two parallel lines and asks the same question. Meeting the degenerate
 * case as an interaction is the point: "no solution" is a thing you rule, not a sentence
 * you read. Gating waits for that ruling.
 *
 * The steppers are the whole input, so the widget is fully keyboard-operable and no click
 * has to be resolved into plane coordinates. No system here is used by the CFU or the
 * practice bank.
 *
 * Two boards rotate on "start over", each one a crossing pair and a parallel pair. The
 * second board crosses at a different quadrant's lattice point and its parallel pair FALLS
 * where the first board's climbs, so the "same rate, different intercept" reading has to be
 * made again rather than remembered.
 *
 * A reveal is owed because the first round is a search over a 13x13 lattice and nothing on
 * the board converges: a marker one step from the crossing looks exactly like a marker six
 * steps from it. It teaches how to READ the crossing off the two equations rather than hunt
 * for it, and while the verification and the second pair are still outstanding it hands the
 * board back instead of spending it.
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

/* -------------------------------------------------------------------------- */
/* The plane                                                                    */
/* -------------------------------------------------------------------------- */

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -6;
const Y_MAX = 6;
const LEFT = 40;
const RIGHT = 424;
const TOP = 10;
const BOTTOM = 194;
/** Every integer gets a gridline, so a lattice point is something you can aim at. */
const INTEGERS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
/** `±6` is the plot's border, and a number centered on the border is half outside it. */
const TICKS = interiorTicks([-6, -4, -2, 2, 4, 6], X_MIN, X_MAX);

function mapX(x: number): number {
  return LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (RIGHT - LEFT);
}

function mapY(y: number): number {
  return BOTTOM - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
}

/** Labels belong inside the plot, off its border by enough not to read as touching it. */
const LABEL_FRAME = plotLabelFrame(
  { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM },
  6,
);
const LABEL_SIZE = 14;
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

interface Line {
  a: number;
  b: number;
  c: number;
  /** The equation as LaTeX, e.g. `2x + y = 4`. */
  latex: string;
  /** The same equation read aloud, for the aria description. */
  spoken: string;
}

/** Is the lattice point on this line? */
function onLine(line: Line, x: number, y: number): boolean {
  return line.a * x + line.b * y === line.c;
}

/**
 * The visible segment of `ax + by = c`, as its two crossings of the window border. Sampling
 * would work too, but a straight line has exactly two, so solving the four edge equations
 * and keeping the in-range hits is both shorter and exact at the corners.
 */
function segment(line: Line): { x1: number; y1: number; x2: number; y2: number } | null {
  const points: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => {
    if (x < X_MIN - 1e-6 || x > X_MAX + 1e-6 || y < Y_MIN - 1e-6 || y > Y_MAX + 1e-6) {
      return;
    }
    if (points.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6)) {
      return;
    }
    points.push({ x, y });
  };
  if (line.b !== 0) {
    push(X_MIN, (line.c - line.a * X_MIN) / line.b);
    push(X_MAX, (line.c - line.a * X_MAX) / line.b);
  }
  if (line.a !== 0) {
    push((line.c - line.b * Y_MIN) / line.a, Y_MIN);
    push((line.c - line.b * Y_MAX) / line.a, Y_MAX);
  }
  const first = points[0];
  const second = points[1];
  return first && second ? { x1: first.x, y1: first.y, x2: second.x, y2: second.y } : null;
}

/** One term of a substituted equation: `2(3)`, `(3)`, `-(3)`. */
function substTerm(coeff: number, value: number, leading: boolean): string {
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? `(${value})` : `${magnitude}(${value})`;
  if (leading) {
    return coeff < 0 ? `-${body}` : body;
  }
  return coeff < 0 ? `- ${body}` : `+ ${body}`;
}

/** The whole equation with both coordinates substituted in, e.g. `2(3) + (-2) = 4`. */
function substituted(line: Line, x: number, y: number): string {
  return `${substTerm(line.a, x, true)} ${substTerm(line.b, y, false)} = ${line.c}`;
}

/* -------------------------------------------------------------------------- */
/* The two rounds                                                               */
/* -------------------------------------------------------------------------- */

interface Stage {
  first: Line;
  second: Line;
  /** Set when the two lines actually cross at a lattice point. */
  meet?: { x: number; y: number };
  aria: string;
}

/** One instance: the crossing pair the learner walks to, then the parallel pair they rule on. */
interface Board {
  crossing: Stage;
  parallel: Stage;
}

const BOARDS: readonly Board[] = [
  {
    crossing: {
      first: { a: 2, b: 1, c: 4, latex: "2x + y = 4", spoken: "2x plus y equals 4" },
      second: { a: 1, b: -1, c: 5, latex: "x - y = 5", spoken: "x minus y equals 5" },
      meet: { x: 3, y: -2 },
      aria: "Two lines, 2x plus y equals 4 and x minus y equals 5, crossing at the point 3, negative 2",
    },
    parallel: {
      first: {
        a: 2,
        b: -1,
        c: -1,
        latex: "2x - y = -1",
        spoken: "2x minus y equals negative 1",
      },
      second: { a: 2, b: -1, c: 3, latex: "2x - y = 3", spoken: "2x minus y equals 3" },
      aria: "Two parallel lines, 2x minus y equals negative 1 and 2x minus y equals 3, which never cross",
    },
  },
  /*
   * Board two crosses in the FIRST quadrant rather than the fourth, and at (1, 2) rather
   * than (3, -2), so the walk is a different one from the marker's start at the origin. Its
   * parallel pair falls one for every three across where board one's climbs two for every
   * one, which is the same ruling made against a picture that looks nothing like it.
   * Solving 3x + y = 5 with x - 2y = -3 gives 7x = 7, so x = 1 and y = 2.
   */
  {
    crossing: {
      first: { a: 3, b: 1, c: 5, latex: "3x + y = 5", spoken: "3x plus y equals 5" },
      second: {
        a: 1,
        b: -2,
        c: -3,
        latex: "x - 2y = -3",
        spoken: "x minus 2y equals negative 3",
      },
      meet: { x: 1, y: 2 },
      aria: "Two lines, 3x plus y equals 5 and x minus 2y equals negative 3, crossing at the point 1, 2",
    },
    parallel: {
      first: { a: 1, b: 3, c: 6, latex: "x + 3y = 6", spoken: "x plus 3y equals 6" },
      second: {
        a: 1,
        b: 3,
        c: -3,
        latex: "x + 3y = -3",
        spoken: "x plus 3y equals negative 3",
      },
      aria: "Two parallel lines, x plus 3y equals 6 and x plus 3y equals negative 3, which never cross",
    },
  },
];

/**
 * The shared slope of a parallel pair, in the words the correction uses: "2 up for every 1
 * across". Written out rather than printed as a fraction, because what the learner has to
 * see is that the two lines MOVE the same way, not that they share a number.
 */
function rateWords(line: Line): string {
  const rise = -line.a;
  const run = line.b;
  const g = Math.abs(gcd(rise, run));
  const up = rise / g / (run < 0 ? -1 : 1);
  const across = Math.abs(run) / g;
  return `${Math.abs(up)} ${up < 0 ? "down" : "up"} for every ${across} across`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

type Verdict = "cross" | "none" | "many";

/**
 * All three answer the question the board asks, which is how many points satisfy both
 * equations. "They cross once" did not: it reported what the LINES do while its two siblings
 * reported what the SYSTEM has, and it is also not the word LF.4 then asks a learner to type,
 * where the three legal answers are `one solution`, `no solution` and `infinitely many`.
 */
const VERDICTS: readonly { id: Verdict; label: string; aria: string }[] = [
  { id: "cross", label: "One solution", aria: "the system has one solution" },
  { id: "none", label: "No solution", aria: "the system has no solution" },
  {
    id: "many",
    label: "Infinitely many",
    aria: "the system has infinitely many solutions",
  },
];

/* -------------------------------------------------------------------------- */
/* The widget                                                                   */
/* -------------------------------------------------------------------------- */

export function LinearSystemGraphExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  return (
    <LinearSystemGraphExploreBody
      key={variant.nonce}
      pack={BOARDS[variant.index] ?? (BOARDS[0] as Board)}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function LinearSystemGraphExploreBody({
  pack,
  onSolved,
  onRestart,
}: {
  pack: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [round, setRound] = useState(0);
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [checkedFirst, setCheckedFirst] = useState(false);
  const [checkedSecond, setCheckedSecond] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [missed, setMissed] = useState<Verdict | null>(null);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [wrong, setWrong] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const board = round === 0 ? pack.crossing : pack.parallel;
  const verified = checkedFirst && checkedSecond;
  const solved = round === 1 && verdict === "none";

  function move(axis: "x" | "y", delta: number) {
    setFeedback(null);
    setWrong(false);
    if (axis === "x") {
      setPx((value) => Math.min(X_MAX, Math.max(X_MIN, value + delta)));
    } else {
      setPy((value) => Math.min(Y_MAX, Math.max(Y_MIN, value + delta)));
    }
  }

  function place() {
    const hitFirst = onLine(board.first, px, py);
    const hitSecond = onLine(board.second, px, py);
    if (hitFirst && hitSecond) {
      if (!placed) {
        success();
      }
      setPlaced(true);
      setFeedback(null);
      setWrong(false);
      return;
    }
    setWrong(true);
    if (hitFirst) {
      setFeedback(
        <>
          That point is on <InlineMath latex={board.first.latex} /> but not on{" "}
          <InlineMath latex={board.second.latex} />. Slide along the first line until it
          reaches the second.
        </>,
      );
      return;
    }
    if (hitSecond) {
      setFeedback(
        <>
          That point is on <InlineMath latex={board.second.latex} /> but not on{" "}
          <InlineMath latex={board.first.latex} />. Slide along the second line until it
          reaches the first.
        </>,
      );
      return;
    }
    setFeedback(
      <>
        That point is on neither line, so it cannot solve either equation. Aim for the spot
        where the two lines meet.
      </>,
    );
  }

  function verify(which: 0 | 1) {
    const meet = board.meet;
    if (!meet) {
      return;
    }
    const line = which === 0 ? board.first : board.second;
    if (which === 0) {
      setCheckedFirst(true);
    } else {
      setCheckedSecond(true);
    }
    setWrong(false);
    setFeedback(
      <>
        <InlineMath latex={substituted(line, meet.x, meet.y)} /> is true, so the point
        satisfies <InlineMath latex={line.latex} />.
      </>,
    );
  }

  function nextRound() {
    setRound(1);
    setFeedback(null);
    setWrong(false);
  }

  function rule(next: Verdict) {
    if (next !== "none") {
      setMissed(next);
      setWrong(true);
      setFeedback(
        next === "cross" ? (
          <>
            Both lines move at the same rate, {rateWords(board.first)}, so the gap between
            them never closes.
          </>
        ) : (
          <>
            One line twice over would mean one equation is a multiple of the other. Here the
            left sides match but the right sides are{" "}
            <InlineMath latex={String(board.first.c)} /> and{" "}
            <InlineMath latex={String(board.second.c)} />, so no pair can satisfy both.
          </>
        ),
      );
      return;
    }
    setMissed(null);
    setWrong(false);
    setVerdict("none");
    setFeedback(null);
    success();
    onSolved();
  }

  /**
   * The reveal's own resolution: settle whichever question is on screen and move the board
   * on. Only the reveal that lets the learner past runs this, so the one that re-asks leaves
   * the marker where they parked it and the crossing still theirs to find.
   */
  function fillIn() {
    setRevealed(true);
    setWrong(false);
    setFeedback(null);
    const meet = board.meet;
    if (round === 0 && meet) {
      setPx(meet.x);
      setPy(meet.y);
      setPlaced(true);
      return;
    }
    setMissed(null);
    setVerdict("none");
  }

  const firstSegment = segment(board.first);
  const secondSegment = segment(board.second);

  /*
   * The crossing point's label, placed rather than nudged: the meet can be anywhere on the
   * lattice, and the old fixed step up and to the right ran it off the plot for a meet near
   * an edge and across the axis numbers for one near an axis.
   */
  const meetLabel = board.meet
    ? labelSpot({
        x: mapX(board.meet.x),
        y: mapY(board.meet.y),
        frame: LABEL_FRAME,
        dx: 1,
        dy: -1,
        halfW: labelHalfW(`(${board.meet.x},\\, ${board.meet.y})`, LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: TICK_BOXES,
      })
    : null;

  let status: ReactNode;
  if (feedback) {
    status = feedback;
  } else if (solved) {
    status = (
      <>
        Ruled. Parallel lines share no point, so the system has no solution. A crossing
        gives one solution, and one line drawn twice gives infinitely many.
      </>
    );
  } else if (round === 1) {
    status = (
      <>New pair. These two never meet. Is there a point that satisfies both equations?</>
    );
  } else if (verified) {
    status = (
      <>
        Both equations check out, so{" "}
        <InlineMath latex={`(${board.meet?.x ?? 0}, ${board.meet?.y ?? 0})`} /> really is
        the solution. Move on to the next pair.
      </>
    );
  } else if (placed) {
    status = (
      <>
        Placed. A crossing point is only a solution once it works in BOTH equations, so
        substitute it into each one.
      </>
    );
  } else {
    status = "Step the marker to the point where the two lines cross, then place it.";
  }

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      <WidgetBeside
        figure={
          <svg viewBox="0 0 440 244" role="img" aria-label={board.aria}>
            <title>Two lines on a coordinate plane and where they meet</title>

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

            {firstSegment && (
              <line
                x1={mapX(firstSegment.x1)}
                y1={mapY(firstSegment.y1)}
                x2={mapX(firstSegment.x2)}
                y2={mapY(firstSegment.y2)}
                stroke={CIVIC}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            )}
            {secondSegment && (
              <line
                x1={mapX(secondSegment.x1)}
                y1={mapY(secondSegment.y1)}
                x2={mapX(secondSegment.x2)}
                y2={mapY(secondSegment.y2)}
                stroke={SIGNAL}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            )}

            {round === 0 && !placed && (
              <g>
                <line
                  x1={mapX(px) - 9}
                  y1={mapY(py)}
                  x2={mapX(px) + 9}
                  y2={mapY(py)}
                  stroke={BRICK}
                  strokeWidth={1.6}
                />
                <line
                  x1={mapX(px)}
                  y1={mapY(py) - 9}
                  x2={mapX(px)}
                  y2={mapY(py) + 9}
                  stroke={BRICK}
                  strokeWidth={1.6}
                />
                <circle
                  cx={mapX(px)}
                  cy={mapY(py)}
                  r={5}
                  fill="none"
                  stroke={BRICK}
                  strokeWidth={2}
                />
              </g>
            )}
            {round === 0 && placed && board.meet && meetLabel && (
              <g>
                <circle
                  cx={mapX(board.meet.x)}
                  cy={mapY(board.meet.y)}
                  r={5.5}
                  fill={LABEL}
                />
                <PlotLabel
                  box={meetLabel}
                  latex={`(${board.meet.x},\\, ${board.meet.y})`}
                  fontSize={LABEL_SIZE}
                  color={LABEL}
                />
              </g>
            )}

            {TICKS.map((tick) => (
              <text
                key={`tx${tick}`}
                x={mapX(tick)}
                y={mapY(0) + 14}
                textAnchor="middle"
                fontSize={10}
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
                fontSize={10}
                fill={SOFT}
                stroke="var(--paper)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {tick}
              </text>
            ))}

            <SvgMath
              latex={board.first.latex}
              x={126}
              y={222}
              fontSize={16}
              color={CIVIC}
              w={190}
            />
            <SvgMath
              latex={board.second.latex}
              x={316}
              y={222}
              fontSize={16}
              color={SIGNAL}
              w={190}
            />
          </svg>
        }
      >
        {round === 0 && !placed && (
          <>
            <p className="lesson-interactive__coords" aria-live="polite">
              <InlineMath latex={`(${px}, ${py})`} />
            </p>
            <div className="lesson-interactive__controls">
              <DirectionPad
                onLeft={() => move("x", -1)}
                onRight={() => move("x", 1)}
                onDown={() => move("y", -1)}
                onUp={() => move("y", 1)}
              />
              <button type="button" className="lesson-interactive__check" onClick={place}>
                Place point
              </button>
            </div>
          </>
        )}

        {round === 0 && placed && (
          <div className="lesson-interactive__controls">
            <button
              type="button"
              className="lesson-interactive__chip"
              style={{ color: CIVIC }}
              disabled={checkedFirst}
              aria-label={`check the point in ${board.first.spoken}`}
              onClick={() => verify(0)}
            >
              Check in <InlineMath latex={board.first.latex} />
            </button>
            <button
              type="button"
              className="lesson-interactive__chip"
              style={{ color: SIGNAL }}
              disabled={checkedSecond}
              aria-label={`check the point in ${board.second.spoken}`}
              onClick={() => verify(1)}
            >
              Check in <InlineMath latex={board.second.latex} />
            </button>
            {verified && (
              <button
                type="button"
                className="lesson-interactive__check"
                onClick={nextRound}
              >
                Next pair of lines
              </button>
            )}
          </div>
        )}

        {round === 1 && !solved && (
          <div className="lesson-interactive__controls">
            {VERDICTS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="lesson-interactive__chip"
                style={{ color: LABEL, borderColor: LINE }}
                data-state={missed === option.id ? "wrong" : undefined}
                aria-label={option.aria}
                onClick={() => rule(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with two different systems
          </button>
        )}

        <WidgetReveal
          available={wrong && !solved}
          revealed={revealed}
          answer={
            round === 0 ? (
              <InlineMath latex={`(${board.meet?.x ?? 0}, ${board.meet?.y ?? 0})`} />
            ) : (
              <>No solution.</>
            )
          }
          why={
            round === 0 ? (
              <>
                The crossing is not something to hunt for on the grid: it is the one pair
                that makes BOTH equations true, so it can be read off them. Take{" "}
                <InlineMath latex={board.first.latex} />, write one letter in terms of the
                other, and put that into <InlineMath latex={board.second.latex} />; whatever
                single value comes out is one coordinate, and substituting it back gives the
                other. The picture is then a check on the arithmetic rather than the source
                of the answer.
              </>
            ) : (
              <>
                Two lines miss each other forever exactly when they move at the same rate
                and start in different places. These two move {rateWords(board.first)} and
                their left-hand sides are identical, so subtracting one equation from the
                other leaves <InlineMath latex={`0 = ${board.first.c - board.second.c}`} />,
                which nothing can satisfy. That is what "no solution" means: not that the
                answer is hard to find, but that no pair exists.
              </>
            )
          }
          onReveal={fillIn}
          label={
            round === 0 ? "Reveal how to find the crossing" : "Reveal what this pair is"
          }
          othersRemain={round === 0}
        />

        <p
          className="lesson-interactive__status"
          data-state={solved ? "solved" : wrong ? "wrong" : "prompt"}
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
