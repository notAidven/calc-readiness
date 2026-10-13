/**
 * EL.1 interactive (slide 1): recovering the growth factor from readings that arrive with no
 * rule attached, and then spending it.
 *
 * The readings are on screen and the factor is not, which is the situation the slide is
 * about. The dial names a candidate factor and the box holds the reading that factor
 * predicts next, and the two are judged TOGETHER: a dial alone could be walked through its
 * five positions until something looked right, and a box alone would let a learner who never
 * found the factor arrive at the value by adding.
 *
 * Nothing about the prediction is drawn until it is committed. The arcs between the readings
 * carry a question mark, and only a correct pair replaces them with the factor and puts the
 * fourth reading on the board, so the evidence for the answer never precedes the answer.
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
import { WHOLE_NUMBER_MISS, numericEntryProps, readNumericEntry } from "./numericEntry";

interface Board {
  /** The readings on screen, oldest first. Three of them, so the ratio can repeat. */
  readings: readonly number[];
  /** The one factor every consecutive pair gives. */
  factor: number;
  /** What the quantity is, for the accessible name and the field label. */
  what: string;
}

/**
 * Neither board is the slide's own 6, 18, 54, and neither is the CFU's falling sample. Both
 * factors sit inside the dial's range, and the two boards differ in every reading.
 */
const BOARDS: readonly Board[] = [
  { readings: [5, 20, 80], factor: 4, what: "beetles" },
  { readings: [7, 21, 63], factor: 3, what: "grams" },
];

const DIAL_MIN = 2;
const DIAL_MAX = 6;

export function ExpFactorSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <ExpFactorSliderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function ExpFactorSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [dial, setDial] = useState(DIAL_MIN);
  const [entry, setEntry] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const last = board.readings[board.readings.length - 1] as number;
  const next = last * board.factor;

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
      setFeedback("Set the factor, and enter the reading it predicts next.");
      return;
    }
    // Plain entry takes anything, so a non-number is its own miss rather than falling
    // through to the note about dividing each reading by the one before it, which would
    // answer a question the learner did not ask. The attempt above still stands, so the
    // reveal stays on offer.
    const read = readNumericEntry(typed, "integer");
    if (!read.ok) {
      setFeedback(WHOLE_NUMBER_MISS);
      return;
    }
    if (dial === board.factor && read.value === next) {
      finish(true);
      return;
    }
    setFeedback(
      "Not yet. Divide each reading by the one before it: the factor is the number that comes back every time, and the next reading is the last one multiplied by it.",
    );
  }

  function reveal() {
    setDial(board.factor);
    setEntry(String(next));
    setRevealed(true);
    finish(false);
  }

  const slotXs = [70, 175, 280, 385];
  const rowY = 76;

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: name the one factor that carries each reading to the next one, and the reading
        it predicts after the last one on the board.
      </WidgetTask>

      <svg
        viewBox="0 0 440 132"
        role="img"
        aria-label={`Three readings in ${board.what}: ${board.readings.join(", ")}, and the reading that comes next`}
      >
        <title>Readings with one repeated factor between them</title>

        <line
          x1={30}
          y1={rowY + 22}
          x2={410}
          y2={rowY + 22}
          stroke={LINE}
          strokeWidth={1}
        />

        {slotXs.map((x, at) => {
          const known = at < board.readings.length;
          const shown = known ? String(board.readings[at]) : solved ? String(next) : "?";
          return (
            <SvgMath
              key={`slot-${x}`}
              latex={shown}
              x={x}
              y={rowY}
              fontSize={19}
              color={known ? LABEL : solved ? CIVIC : SOFT}
              w={96}
            />
          );
        })}

        {slotXs.slice(1).map((x, at) => {
          const from = slotXs[at] as number;
          const mid = (from + x) / 2;
          const tipX = x - 22;
          const tipY = rowY - 14;
          const apexY = rowY - 40;
          const dx = tipX - mid;
          const dy = tipY - apexY;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const size = 7;
          const bx = tipX - ux * size;
          const by = tipY - uy * size;
          const px = -uy * (size * 0.55);
          const py = ux * (size * 0.55);
          const stroke = solved ? CIVIC : SOFT;
          return (
            <g key={`arc-${x}`}>
              <path
                d={`M ${from + 22} ${rowY - 14} Q ${mid} ${apexY} ${tipX} ${tipY}`}
                fill="none"
                stroke={stroke}
                strokeWidth={1.4}
                strokeDasharray={solved ? undefined : "4 3"}
              />
              <path
                d={`M ${tipX} ${tipY} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`}
                fill={stroke}
              />
              <SvgMath
                latex={solved ? `\\times ${board.factor}` : "\\times \\; ?"}
                x={mid}
                y={rowY - 44}
                fontSize={14}
                color={stroke}
                w={80}
              />
            </g>
          );
        })}

        {board.readings.map((value, at) => (
          <text
            key={`tick-${value}`}
            x={slotXs[at]}
            y={rowY + 40}
            textAnchor="middle"
            fontSize={10}
            fill={SOFT}
          >
            {`reading ${at + 1}`}
          </text>
        ))}
        <text x={slotXs[3]} y={rowY + 40} textAnchor="middle" fontSize={10} fill={SOFT}>
          next
        </text>
      </svg>

      <label
        className="lesson-interactive__slider-label lesson-interactive__slider-label--mixed"
        htmlFor="el1-factor"
      >
        Growth factor <InlineMath latex={`b = ${dial}`} />
      </label>
      <input
        id="el1-factor"
        className="lesson-interactive__range"
        type="range"
        min={DIAL_MIN}
        max={DIAL_MAX}
        step={1}
        value={dial}
        disabled={solved}
        aria-valuetext={`growth factor ${dial}`}
        onChange={(e) => {
          setDial(Number(e.target.value));
          setFeedback(null);
        }}
      />

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over with different readings
        </button>
      ) : (
        <div className="lesson-interactive__controls">
          <div className="lesson-interactive__field" style={{ color: BRICK }}>
            <span className="lesson-interactive__field-label">
              <InlineMath latex={`${last} \\cdot b =`} />
            </span>
            <input
              className="lesson-interactive__input"
              {...numericEntryProps("integer")}
              value={entry}
              aria-label="The reading that comes next"
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
        revealed={revealed}
        answer={
          <>
            <InlineMath latex={`b = ${board.factor}`} />, and the next reading is{" "}
            <InlineMath latex={String(next)} />
          </>
        }
        why={
          <>
            Dividing each reading by the one before it gives{" "}
            <InlineMath
              latex={`\\tfrac{${board.readings[1]}}{${board.readings[0]}} = ${board.factor}`}
            />{" "}
            and{" "}
            <InlineMath
              latex={`\\tfrac{${last}}{${board.readings[1]}} = ${board.factor}`}
            />
            , the same number both times, so <InlineMath latex={`${board.factor}`} /> is the
            base of the exponential these readings follow. One more step is one more
            multiplication by it:{" "}
            <InlineMath latex={`${last} \\cdot ${board.factor} = ${next}`} />. The jumps
            themselves are no help here, because they run{" "}
            <InlineMath
              latex={`${(board.readings[1] as number) - (board.readings[0] as number)}`}
            />{" "}
            then <InlineMath latex={`${last - (board.readings[1] as number)}`} /> and settle
            on nothing.
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
            The same factor <InlineMath latex={`${board.factor}`} /> sits between every
            pair, so it is the base, and the reading after{" "}
            <InlineMath latex={String(last)} /> is <InlineMath latex={String(next)} />.
          </>
        ) : (
          (feedback ??
          "The readings share one factor. Set the dial to it, and enter what it predicts for the next reading.")
        )}
      </p>
    </div>
  );
}
