/**
 * GEO.1 interactive (slide 2): the three angle relations, asked one at a time off one board.
 *
 * All three questions sit on figures that stay on screen together, because the relations are
 * about each other: the pair on a straight line is what MAKES the opposite pair equal, and a
 * learner who met the two on separate boards would have no way to see that. Each answered
 * part is written onto the figure in its place, so the board fills in as the learner works
 * and the third question is read against the first two rather than against nothing.
 *
 * The parts are judged separately and each one fires its own success, so the last part is
 * not the only moment that counts. A reveal on a part that still has parts after it explains
 * that part and hands the board back; on the last part it does not, because that part is the
 * gate.
 *
 * ## Why the PART's question is in the task slot and not the status line
 *
 * It used to be the other way around. `WidgetTask` carried a standing goal about filling in all
 * three angles, and `open.question` — the sentence naming WHICH unmarked angle is being asked
 * for and what it stands beside — rendered in `.lesson-interactive__status` below the figure and
 * the box, as `feedback ?? open?.question`. `setFeedback(null)` happens only in `advance()` and
 * typing does not clear it, so one wrong answer replaced the question and nothing put it back:
 * the learner was left a figure of bare symbols, an empty box, and a sentence about totals in
 * general. The only exit was the reveal, which costs them the part.
 *
 * So the question leads, and the status line keeps the one job it can keep across an overwrite:
 * the standing note that nothing here is measured, which the same wrong attempt is free to
 * replace. Do not restate the question down there; two copies of a task is the fix wearing the
 * defect's clothes. `widgetTaskOrder.browser.test.tsx` is the guard, and it holds this board to
 * it in both directions — a right answer has to move the slot on, and a miss must not.
 */

import { type ReactNode, useState } from "react";

import { BRICK, CIVIC, InlineMath, LABEL, LINE, SOFT, SvgMath } from "../svgKit";
import { triangleFromAngles } from "../triangleFromAngles";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

export interface Board {
  /** The angle marked where the two lines cross, in degrees. */
  crossing: number;
  /** Two of the triangle's angles, in degrees; the third is what is asked for. */
  triangle: readonly [number, number];
}

/**
 * Neither board repeats a number from the dialogue, and the two differ in every angle. The
 * crossing angle is acute on one board and obtuse on the other, so "the supplement is the
 * bigger one" is not a rule the widget quietly teaches.
 */
export const GEO_ANGLE_BOARDS: readonly Board[] = [
  { crossing: 52, triangle: [43, 61] },
  { crossing: 116, triangle: [58, 74] },
];

/**
 * What the status line says while a part is being worked out. A strategy line and not the task:
 * the task is in the slot above the figure, where a wrong attempt cannot overwrite it, and this
 * is what the same wrong attempt is free to replace.
 */
const ALREADY_ON_THE_FIGURE =
  "Each angle you settle is written onto the figure in its own place, so everything already found stays on the board and is there to be read while you work out the one above.";

interface Part {
  key: string;
  /** The symbol standing for the unknown on the figure. */
  symbol: string;
  question: ReactNode;
  answer: number;
  why: ReactNode;
}

function partsOf(board: Board): readonly Part[] {
  const [first, second] = board.triangle;
  return [
    {
      key: "supplement",
      symbol: "x",
      question: (
        <>
          The angle marked <InlineMath latex="x" /> lies beside the marked{" "}
          <InlineMath latex={`${board.crossing}^{\\circ}`} /> on a straight line. How many
          degrees is it?
        </>
      ),
      answer: 180 - board.crossing,
      why: (
        <>
          The two angles together make a straight line, so they are supplementary and their
          measures add to <InlineMath latex="180^{\circ}" />. That makes the missing one{" "}
          <InlineMath
            latex={`180^{\\circ} - ${board.crossing}^{\\circ} = ${180 - board.crossing}^{\\circ}`}
          />
          .
        </>
      ),
    },
    {
      key: "vertical",
      symbol: "y",
      question: (
        <>
          The angle marked <InlineMath latex="y" /> is directly opposite the marked{" "}
          <InlineMath latex={`${board.crossing}^{\\circ}`} /> where the two lines cross. How
          many degrees is it?
        </>
      ),
      answer: board.crossing,
      why: (
        <>
          Opposite angles at a crossing are vertical angles. Each of them is supplementary
          to the very same neighbour, so both are{" "}
          <InlineMath latex={`180^{\\circ} - ${180 - board.crossing}^{\\circ}`} />, which is
          why a vertical pair is always equal.
        </>
      ),
    },
    {
      key: "third",
      symbol: "z",
      question: (
        <>
          The triangle carries angles of <InlineMath latex={`${first}^{\\circ}`} /> and{" "}
          <InlineMath latex={`${second}^{\\circ}`} />. How many degrees is its third angle,
          marked <InlineMath latex="z" />?
        </>
      ),
      answer: 180 - first - second,
      why: (
        <>
          The three angles inside any triangle add to <InlineMath latex="180^{\circ}" />, so
          the two given ones leave{" "}
          <InlineMath
            latex={`180^{\\circ} - ${first}^{\\circ} - ${second}^{\\circ} = ${180 - first - second}^{\\circ}`}
          />{" "}
          for the third. Nothing about the triangle has to be measured to know it.
        </>
      ),
    },
  ];
}

export function GeoAngleExplore(props: LessonWidgetProps) {
  const variant = useWidgetVariants(GEO_ANGLE_BOARDS.length, props);
  const board = GEO_ANGLE_BOARDS[variant.index] ?? (GEO_ANGLE_BOARDS[0] as Board);
  return (
    <GeoAngleExploreBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function GeoAngleExploreBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const parts = partsOf(board);
  const [at, setAt] = useState(0);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealedAt, setRevealedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const solved = at >= parts.length;
  const open = parts[at] ?? null;

  function advance(earned: boolean) {
    const next = at + 1;
    setAt(next);
    setEntry("");
    setAttempted(false);
    setFeedback(null);
    if (earned) {
      success();
    }
    if (next >= parts.length) {
      onSolved();
    }
  }

  function check() {
    if (open === null) {
      return;
    }
    setAttempted(true);
    // A fresh attempt steps the reveal aside, so it can be offered again for the part in
    // hand rather than staying spent on the one it already explained.
    setRevealedAt(null);
    const typed = entry.trim();
    if (typed === "") {
      setFeedback("Enter the measure in degrees, as a plain number.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about fixed totals, which would answer a question the learner did
    // not ask. The attempt above still stands, so the reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (read.value === open.answer) {
      advance(true);
      return;
    }
    setFeedback(
      "Not that measure. Every relation here is a fixed total with one piece missing, so find the total the marked angles belong to and take away what is already known.",
    );
  }

  /** What a slot shows: its value once the part is settled, its symbol before that. */
  function slot(index: number): { latex: string; color: string } {
    const part = parts[index] as Part;
    if (index < at) {
      return { latex: `${part.answer}^{\\circ}`, color: CIVIC };
    }
    return { latex: part.symbol, color: index === at ? BRICK : SOFT };
  }

  // The crossing is drawn at the angle it claims: the wedge on the right is the marked one,
  // so each line leaves the centre at half that angle either side of the horizontal.
  const centre = { x: 108, y: 104 };
  const reach = 82;
  const half = ((board.crossing / 2) * Math.PI) / 180;
  const ray = (dx: number, dy: number) => ({
    x: centre.x + dx * reach * Math.cos(half),
    y: centre.y + dy * reach * Math.sin(half),
  });
  const upRight = ray(1, -1);
  const downRight = ray(1, 1);
  const downLeft = ray(-1, 1);
  const upLeft = ray(-1, -1);

  const [firstAngle, secondAngle] = board.triangle;
  // The triangle is DRAWN AT THE ANGLES IT IS LABELLED WITH, on every board, because it is
  // built from them. Three constants here drew one outline of about 66, 47 and 67 degrees
  // for both boards, and both boards' labels ran in the inverse order of it, so a learner
  // checking an answer against the picture read a correct answer back as wrong. The box is
  // the right-hand half of the canvas: the crossing of two lines and its own three labels
  // own everything left of about 190.
  const triangle = triangleFromAngles(firstAngle, secondAngle, {
    x: 218,
    y: 34,
    width: 206,
    height: 136,
  });
  const { left, right: rightFoot, apex } = triangle;

  const supplement = slot(0);
  const vertical = slot(1);
  const third = slot(2);

  return (
    <div className="lesson-interactive lesson-interactive--explore">
      {/* The question for the part in hand, not a board-level goal: what a learner has to work
          out right now is the first thing on the widget, and feedback cannot take it away. */}
      <WidgetTask>
        {solved ? (
          <>
            All three unmarked angles are filled in, each one from the marked angles alone
            and with no protractor anywhere on the board.
          </>
        ) : (
          <>
            Part {at + 1} of {parts.length}. {open?.question} Get all three and the figure
            will carry every unmarked angle in its own place.
          </>
        )}
      </WidgetTask>

      <svg
        viewBox="0 0 440 200"
        role="img"
        aria-label={`Two straight lines crossing at an angle of ${board.crossing} degrees, and a triangle with angles of ${firstAngle} and ${secondAngle} degrees`}
      >
        <title>A crossing of two lines, and a triangle with one angle unknown</title>

        <line
          x1={downLeft.x}
          y1={downLeft.y}
          x2={upRight.x}
          y2={upRight.y}
          stroke={LINE}
          strokeWidth={1.6}
        />
        <line
          x1={upLeft.x}
          y1={upLeft.y}
          x2={downRight.x}
          y2={downRight.y}
          stroke={LINE}
          strokeWidth={1.6}
        />

        <SvgMath
          latex={`${board.crossing}^{\\circ}`}
          x={centre.x + 46}
          y={centre.y}
          fontSize={14}
          color={LABEL}
          w={56}
        />
        <SvgMath
          latex={supplement.latex}
          x={centre.x}
          y={centre.y - 44}
          fontSize={14}
          color={supplement.color}
          w={56}
        />
        <SvgMath
          latex={vertical.latex}
          x={centre.x - 46}
          y={centre.y}
          fontSize={14}
          color={vertical.color}
          w={56}
        />

        <path
          d={`M ${left.x} ${left.y} L ${apex.x} ${apex.y} L ${rightFoot.x} ${rightFoot.y} Z`}
          fill="none"
          stroke={LINE}
          strokeWidth={1.6}
        />
        {/* Each label on the bisector of the corner it names, which is where
            `triangleFromAngles` puts them. A fixed offset cannot follow vertices that move
            with the board: the same nudge that sits inside a 61-degree corner is outside a
            48-degree one, and both boards draw both. */}
        <SvgMath
          latex={`${firstAngle}^{\\circ}`}
          x={triangle.leftLabel.x}
          y={triangle.leftLabel.y}
          fontSize={14}
          color={LABEL}
          w={56}
        />
        <SvgMath
          latex={`${secondAngle}^{\\circ}`}
          x={triangle.rightLabel.x}
          y={triangle.rightLabel.y}
          fontSize={14}
          color={LABEL}
          w={56}
        />
        <SvgMath
          latex={third.latex}
          x={triangle.apexLabel.x}
          y={triangle.apexLabel.y}
          fontSize={14}
          color={third.color}
          w={56}
        />
      </svg>

      <div className="lesson-interactive__row">
        {parts.map((part, index) => (
          <span
            key={part.key}
            data-angle-slot={part.key}
            data-state={index < at ? "solved" : "waiting"}
            data-open={index === at ? "yes" : "no"}
            className="lesson-interactive__chip"
          >
            <InlineMath
              latex={index < at ? `${part.symbol} = ${part.answer}^{\\circ}` : part.symbol}
              color={index < at ? CIVIC : SOFT}
            />
          </span>
        ))}
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with different angles
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field">
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${open?.symbol ?? "x"} =`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label={`The measure of ${open?.symbol ?? "x"} in degrees`}
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
      )}

      <WidgetReveal
        available={attempted && !solved}
        revealed={revealedAt !== null}
        answer={
          open ? <InlineMath latex={`${open.symbol} = ${open.answer}^{\\circ}`} /> : null
        }
        why={open?.why ?? null}
        onReveal={() => {
          setRevealedAt(at);
          advance(false);
        }}
        label="Reveal this angle"
        othersRemain={at + 1 < parts.length}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : feedback ? "wrong" : "prompt"}
        aria-live="polite"
      >
        {revealedAt !== null && !solved ? null : solved ? (
          <>
            Every one of the three came from a total rather than a measurement:{" "}
            <InlineMath latex="180^{\circ}" /> along the straight line, the same{" "}
            <InlineMath latex="180^{\circ}" /> for the two angles a crossing shares, and{" "}
            <InlineMath latex="180^{\circ}" /> again inside the triangle.
          </>
        ) : (
          (feedback ?? ALREADY_ON_THE_FIGURE)
        )}
      </p>
    </div>
  );
}
