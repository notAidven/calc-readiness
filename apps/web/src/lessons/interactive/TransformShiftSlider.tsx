/**
 * FUN.9 slide 0: where one marked point of a trace lands when the rule shifts it.
 *
 * ## The transformed trace is NOT drawn while the question is open
 *
 * That is the whole design. Drawn, the two guide lines become a matter of sliding them until
 * they cross something already on the paper, and the counter-intuition this slide exists for
 * (a constant INSIDE the brackets moves the graph the opposite way to the way its sign reads)
 * never has to be faced. Undrawn, the only thing to work from is the rule in the heading. The
 * shifted trace and the landed point arrive as evidence once both coordinates are in.
 *
 * ## Two answers, judged separately, because they are two different rules
 *
 * The abscissa tests the inside constant and the ordinate tests the outside one, and a learner
 * who has one right and the other backwards is the ordinary case rather than an edge case. One
 * verdict over the pair would tell them "no" about the half they had right, so each guide has
 * its own check, its own mark and its own note, through the shared `widgetPartVerdict` layer.
 * The gate waits for both.
 *
 * A miss names the misconception where it can: the abscissa's naive answer is the one that
 * ADDS the inside constant instead of undoing it, and the ordinate's is the one that reverses
 * a constant which does not reverse. Both are computed from the board rather than listed, so
 * the note is about what the learner actually did.
 *
 * `othersRemain` is live: a reveal explains whichever coordinate is still open, and while the
 * other one is open too the board comes BACK with the settled coordinate still standing.
 */

import { type ReactNode, useState } from "react";

import {
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
import {
  type PartVerdict,
  partName,
  WidgetPartNote,
  WidgetPartVerdict,
} from "../widgetPartVerdict";
import { WidgetTask } from "../widgetTask";

/* -------------------------------------------------------------------------- */
/* The plane                                                                    */
/* -------------------------------------------------------------------------- */

const X_MIN = -8;
const X_MAX = 8;
const Y_MIN = -6;
const Y_MAX = 6;
/** The plot sits low enough to leave the rule a line of its own above it. */
const PLOT = { left: 44, right: 420, top: 40, bottom: 214 };
const VIEW_H = 236;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;

function mapX(x: number): number {
  return PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left);
}

function mapY(y: number): number {
  return PLOT.bottom - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top);
}

/** Every integer gets a gridline, so a lattice point is something a guide can be aimed at. */
const X_INTEGERS = Array.from({ length: X_MAX - X_MIN + 1 }, (_, at) => X_MIN + at);
const Y_INTEGERS = Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, at) => Y_MIN + at);

/**
 * The ticks that carry a number: measured against the plot's own edges rather than picked,
 * because a number centred on the border has half its digits outside the box.
 */
const X_TICKS = fittingTicks({
  ticks: [-8, -6, -4, -2, 2, 4, 6, 8],
  place: mapX,
  half: (tick) => labelHalfW(String(tick), TICK_SIZE),
  start: PLOT.left,
  end: PLOT.right,
});
const Y_TICKS = fittingTicks({
  ticks: [-6, -4, -2, 2, 4, 6],
  place: mapY,
  half: () => labelHalfH(TICK_SIZE),
  start: PLOT.top,
  end: PLOT.bottom,
});

const LABEL_FRAME = plotLabelFrame(PLOT, 8);

/** The axis numbers, as obstacles a placed label has to steer around. */
const TICK_BOXES: readonly LabelBox[] = [
  ...X_TICKS.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
  ...Y_TICKS.map((tick) => ({
    x: mapX(0) - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  })),
];

/**
 * The parent trace, as a run of readings off the chart. Its second vertex is the marked peak,
 * which is the point both boards ask about, and every vertex is on the lattice so the learner
 * can read the peak's coordinates off the grid without being told them.
 */
const PARENT: readonly (readonly [number, number])[] = [
  [-4, -1],
  [-2, 2],
  [0, 0],
  [2, -2],
  [4, 1],
];

/** The marked peak of the parent trace. */
const PEAK = { x: -2, y: 2 };

/* -------------------------------------------------------------------------- */
/* The two boards                                                               */
/* -------------------------------------------------------------------------- */

interface Board {
  /** The constant written inside the brackets, so `f(x + inside)`. */
  inside: number;
  /** The constant written outside them. */
  outside: number;
}

/**
 * One board shifts left and up, the other right and down, so neither the inside direction nor
 * the outside one can be carried over from the first round. Neither uses the check's numbers.
 */
const BOARDS: readonly Board[] = [
  { inside: 3, outside: 1 },
  { inside: -4, outside: -3 },
];

/** `+ 3` / `- 4`: the operator and magnitude of a signed constant, spaced for KaTeX. */
function signTerm(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** A signed number read aloud, for the accessible names. */
function spoken(value: number): string {
  return value < 0 ? `negative ${Math.abs(value)}` : `${value}`;
}

export function TransformShiftSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <TransformShiftSliderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function TransformShiftSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [guessX, setGuessX] = useState(0);
  const [guessY, setGuessY] = useState(0);
  const [settledX, setSettledX] = useState(false);
  const [settledY, setSettledY] = useState(false);
  const [noteX, setNoteX] = useState<ReactNode>(null);
  const [noteY, setNoteY] = useState<ReactNode>(null);
  const [revealedPart, setRevealedPart] = useState<"x" | "y" | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const landedX = PEAK.x - board.inside;
  const landedY = PEAK.y + board.outside;
  const rule = `g(x) = f(x ${signTerm(board.inside)}) ${signTerm(board.outside)}`;
  const solved = settledX && settledY;
  /** Which coordinate a reveal would be about: the first one still open. */
  const openPart: "x" | "y" | null = !settledX ? "x" : !settledY ? "y" : null;

  function finish(nextX: boolean, nextY: boolean) {
    if (nextX && nextY && !done) {
      setDone(true);
      onSolved();
    }
  }

  function checkX() {
    if (settledX) {
      return;
    }
    if (guessX === landedX) {
      setNoteX(null);
      setSettledX(true);
      success();
      finish(true, settledY);
      return;
    }
    setNoteX(
      guessX === PEAK.x + board.inside ? (
        <>
          That is the peak's <InlineMath latex="x" /> with{" "}
          <InlineMath latex={String(Math.abs(board.inside))} /> applied the way the sign
          reads. Inside the brackets the constant is applied to the input before{" "}
          <InlineMath latex="f" /> sees it, so it has to be undone, not repeated.
        </>
      ) : (
        <>
          Not there. Ask which input of <InlineMath latex="g" /> makes the bracket come out
          at <InlineMath latex={String(PEAK.x)} />, because that is the only input where the
          peak's value is available.
        </>
      ),
    );
  }

  function checkY() {
    if (settledY) {
      return;
    }
    if (guessY === landedY) {
      setNoteY(null);
      setSettledY(true);
      success();
      finish(settledX, true);
      return;
    }
    setNoteY(
      guessY === PEAK.y - board.outside ? (
        <>
          That reverses the constant. Only a change inside the brackets reverses, because
          only that one reaches the input. Outside, <InlineMath latex="f(x) + k" /> does
          exactly what it reads.
        </>
      ) : (
        <>
          Not there. The constant outside the brackets is applied to the peak's own reading,
          sign included, and nothing else about the peak changes.
        </>
      ),
    );
  }

  /**
   * Hand over whichever coordinate is open. Never fires the badge: it was not earned.
   *
   * And never `finish` either. Where this is the last coordinate outstanding it IS the gate,
   * so handing it over and opening the gate in the same click would let a learner past on a
   * coordinate they were given. The shared layer owns the release from here: it hands the
   * board back while the other coordinate is open, and releases on the second reveal.
   */
  function reveal() {
    if (openPart === "x") {
      setGuessX(landedX);
      setNoteX(null);
      setSettledX(true);
      setRevealedPart("x");
      return;
    }
    if (openPart === "y") {
      setGuessY(landedY);
      setNoteY(null);
      setSettledY(true);
      setRevealedPart("y");
    }
  }

  const verdictX: PartVerdict | null = settledX ? "right" : noteX === null ? null : "wrong";
  const verdictY: PartVerdict | null = settledY ? "right" : noteY === null ? null : "wrong";

  /*
   * The two labels, PLACED rather than nudged. Both boards put the peak and its landing in
   * different quadrants, so a fixed offset would print one of them off the grid; the peak's
   * finished box is fed into the landing's `avoid` list so the two cannot overlap either.
   */
  const peakLatex = `(${PEAK.x},\\, ${PEAK.y})`;
  const peakBox = labelSpot({
    x: mapX(PEAK.x),
    y: mapY(PEAK.y),
    frame: LABEL_FRAME,
    dx: -1,
    dy: -1,
    halfW: labelHalfW(peakLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: TICK_BOXES,
  });
  const landedLatex = `(${landedX},\\, ${landedY})`;
  const landedBox = labelSpot({
    x: mapX(landedX),
    y: mapY(landedY),
    frame: LABEL_FRAME,
    dx: 1,
    dy: -1,
    halfW: labelHalfW(landedLatex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [...TICK_BOXES, peakBox],
  });

  const parentPoints = PARENT.map(([x, y]) => `${mapX(x)},${mapY(y)}`).join(" ");
  const shiftedPoints = PARENT.map(
    ([x, y]) => `${mapX(x - board.inside)},${mapY(y + board.outside)}`,
  ).join(" ");

  let status: ReactNode;
  if (revealedPart !== null && !solved) {
    status = null;
  } else if (solved) {
    status = (
      <>
        The replayed trace is the same shape in a new place. The constant inside the
        brackets carried it to <InlineMath latex={`x = ${landedX}`} />, against the
        direction its sign reads, and the constant outside carried it to{" "}
        <InlineMath latex={`y = ${landedY}`} />, exactly the direction its sign reads.
      </>
    );
  } else {
    status = (
      <>
        Read the rule, not the picture: the replayed trace is not on the paper yet. Set each
        guide where you claim the marked peak lands, then check that coordinate.
      </>
    );
  }

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: say where the marked peak of <InlineMath latex="f" /> lands on{" "}
        <InlineMath latex="g" />, one coordinate at a time, so the board ends with the
        replayed trace drawn through the point you named.
      </WidgetTask>

      {/* 400, not the default 460: this board's two guides are dials, and a dial's row costs a
        second line in the panel (see the `__range` rule in styles.css) that the one-line
        arrangement did not. The wider panel is what pays for those two lines inside the 350px
        band, and it is also what takes each track from 130px to 344px. */}
      <WidgetBeside
        figureWidth={400}
        figure={
          <svg
            viewBox={`0 0 440 ${VIEW_H}`}
            role="img"
            aria-label={`A chart trace with a marked peak at ${spoken(PEAK.x)}, ${spoken(PEAK.y)}, and two movable guide lines for claiming where the peak lands under the rule g of x equals f of x ${board.inside < 0 ? "minus" : "plus"} ${Math.abs(board.inside)}, ${board.outside < 0 ? "minus" : "plus"} ${Math.abs(board.outside)}`}
          >
            <title>A trace, its marked peak, and where a shift takes that peak</title>

            {/* `y` is an ink CENTRE, so the heading clears both the canvas top and the plot. */}
            <SvgMath latex={rule} x={220} y={18} fontSize={16} color={LABEL} w={320} />

            <rect
              data-plot-frame=""
              x={PLOT.left}
              y={PLOT.top}
              width={PLOT.right - PLOT.left}
              height={PLOT.bottom - PLOT.top}
              rx={6}
              fill="var(--paper)"
              stroke={LINE}
              strokeWidth={1}
            />
            {X_INTEGERS.map((value) => (
              <line
                key={`gx${value}`}
                x1={mapX(value)}
                y1={PLOT.top}
                x2={mapX(value)}
                y2={PLOT.bottom}
                stroke={LINE}
                strokeWidth={0.6}
                opacity={0.5}
              />
            ))}
            {Y_INTEGERS.map((value) => (
              <line
                key={`gy${value}`}
                x1={PLOT.left}
                y1={mapY(value)}
                x2={PLOT.right}
                y2={mapY(value)}
                stroke={LINE}
                strokeWidth={0.6}
                opacity={0.5}
              />
            ))}
            <line
              x1={PLOT.left}
              y1={mapY(0)}
              x2={PLOT.right}
              y2={mapY(0)}
              stroke={SOFT}
              strokeWidth={1.3}
            />
            <line
              x1={mapX(0)}
              y1={PLOT.top}
              x2={mapX(0)}
              y2={PLOT.bottom}
              stroke={SOFT}
              strokeWidth={1.3}
            />

            {/* The two guides. Amber while they are claims, because they report on nothing the
            learner has been credited with yet, and green only once that coordinate lands. */}
            <line
              x1={mapX(guessX)}
              y1={PLOT.top + 1}
              x2={mapX(guessX)}
              y2={PLOT.bottom - 1}
              stroke={settledX ? CIVIC : SIGNAL_DEEP}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <line
              x1={PLOT.left + 1}
              y1={mapY(guessY)}
              x2={PLOT.right - 1}
              y2={mapY(guessY)}
              stroke={settledY ? CIVIC : SIGNAL_DEEP}
              strokeWidth={2}
              strokeDasharray="6 4"
            />

            {/* The parent trace, and its peak, always. */}
            <polyline
              points={parentPoints}
              fill="none"
              stroke={LABEL}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <circle cx={mapX(PEAK.x)} cy={mapY(PEAK.y)} r={5} fill={LABEL} />
            <PlotLabel
              box={peakBox}
              latex={peakLatex}
              fontSize={LABEL_SIZE}
              color={LABEL}
            />

            {/* The evidence, once both coordinates are in. */}
            {solved && (
              <>
                <polyline
                  points={shiftedPoints}
                  fill="none"
                  stroke={CIVIC}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
                <circle cx={mapX(landedX)} cy={mapY(landedY)} r={5} fill={CIVIC} />
                <PlotLabel
                  box={landedBox}
                  latex={landedLatex}
                  fontSize={LABEL_SIZE}
                  color={CIVIC}
                />
              </>
            )}

            {X_TICKS.map((tick) => (
              <text
                key={`tx${tick}`}
                x={mapX(tick)}
                y={mapY(0) + 15}
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
            {Y_TICKS.map((tick) => (
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
          </svg>
        }
      >
        <div className="lesson-interactive__rows">
          {/* `data-part-row` on each row, because a part answered by a DIAL has no field of
            boxes for a locator to find it by: it is what makes each coordinate addressable as
            one thing, the guide and the sentence answering it together. */}
          <div className="lesson-interactive__row" data-part-row="input">
            <label
              className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
              htmlFor="fun9-shift-x"
            >
              Vertical guide at <InlineMath latex={`x = ${guessX}`} />
            </label>
            <input
              id="fun9-shift-x"
              className="lesson-interactive__range"
              type="range"
              min={X_MIN}
              max={X_MAX}
              step={1}
              value={guessX}
              disabled={settledX}
              aria-label={partName(
                "the input where you claim the peak lands",
                settledX ? "right" : verdictX,
              )}
              aria-valuetext={`vertical guide at x equals ${spoken(guessX)}`}
              onChange={(event) => {
                setGuessX(Number(event.target.value));
                setNoteX(null);
              }}
            />
            {/* The mark on EITHER verdict. `verdictX` has said "wrong" since this board was
              written and nothing drew it: a guide that was checked and missed carried its
              sentence and no mark, so on a half-right board the only thing separating the two
              coordinates was that one of them had something to read. */}
            {verdictX !== null && <WidgetPartVerdict verdict={verdictX} />}
            {settledX ? null : (
              <button
                type="button"
                className="lesson-interactive__check lesson-interactive__check--part"
                onClick={checkX}
              >
                Check the input
              </button>
            )}
            {noteX !== null && <WidgetPartNote>{noteX}</WidgetPartNote>}
          </div>

          <div className="lesson-interactive__row" data-part-row="reading">
            <label
              className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
              htmlFor="fun9-shift-y"
            >
              Horizontal guide at <InlineMath latex={`y = ${guessY}`} />
            </label>
            <input
              id="fun9-shift-y"
              className="lesson-interactive__range"
              type="range"
              min={Y_MIN}
              max={Y_MAX}
              step={1}
              value={guessY}
              disabled={settledY}
              aria-label={partName(
                "the reading where you claim the peak lands",
                settledY ? "right" : verdictY,
              )}
              aria-valuetext={`horizontal guide at y equals ${spoken(guessY)}`}
              onChange={(event) => {
                setGuessY(Number(event.target.value));
                setNoteY(null);
              }}
            />
            {verdictY !== null && <WidgetPartVerdict verdict={verdictY} />}
            {settledY ? null : (
              <button
                type="button"
                className="lesson-interactive__check lesson-interactive__check--part"
                onClick={checkY}
              >
                Check the reading
              </button>
            )}
            {noteY !== null && <WidgetPartNote>{noteY}</WidgetPartNote>}
          </div>
        </div>

        {solved && (
          <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
            Start over with a different shift
          </button>
        )}

        <WidgetReveal
          available={
            openPart !== null && (openPart === "x" ? noteX !== null : noteY !== null)
          }
          revealed={revealedPart !== null && revealedPart === openPart}
          answer={
            openPart === "x" ? (
              <InlineMath latex={`x = ${landedX}`} />
            ) : openPart === "y" ? (
              <InlineMath latex={`y = ${landedY}`} />
            ) : null
          }
          why={
            openPart === "x" ? (
              <>
                The constant inside the brackets is applied to the input, so{" "}
                <InlineMath latex={`g(x) = f(x ${signTerm(board.inside)})`} /> hands back at{" "}
                <InlineMath latex="x" /> whatever <InlineMath latex="f" /> gave at{" "}
                <InlineMath latex={`x ${signTerm(board.inside)}`} />. The peak of{" "}
                <InlineMath latex="f" /> sits at <InlineMath latex={String(PEAK.x)} />, so
                the bracket has to read <InlineMath latex={String(PEAK.x)} />, which needs{" "}
                <InlineMath latex={`x = ${landedX}`} />.
              </>
            ) : openPart === "y" ? (
              <>
                The constant outside the brackets is applied to the output, after{" "}
                <InlineMath latex="f" /> has already answered, so it neither reverses nor
                interferes with the input. The peak reads{" "}
                <InlineMath latex={String(PEAK.y)} />, and{" "}
                <InlineMath latex={`${PEAK.y} ${signTerm(board.outside)} = ${landedY}`} />.
              </>
            ) : null
          }
          onReveal={reveal}
          // Named by the coordinate it is about, the way the check buttons are: two guides are
          // live at once and "Reveal this coordinate" was true of either of them.
          label={openPart === "y" ? "Reveal the reading" : "Reveal the input"}
          // Live, and false on the reveal that explains the last open coordinate, because that
          // one IS the gate: handing the board back there would hand the gate over with it.
          othersRemain={!settledX && !settledY}
        />

        <p
          className="lesson-interactive__status"
          data-state={
            solved ? "solved" : noteX !== null || noteY !== null ? "wrong" : "prompt"
          }
          aria-live="polite"
        >
          {status}
        </p>
      </WidgetBeside>
    </div>
  );
}
