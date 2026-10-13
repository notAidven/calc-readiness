/**
 * LIN.1 slide 0: the solution is the one value that levels the beam.
 *
 * The slide names three words at once (equation, variable, solution) and only one of them is
 * hard to believe: that a single number, out of the whole scale, is the one the balance is
 * reporting. So the learner sets an assumed ingot weight and watches the beam answer, and the
 * beam is the judge rather than the widget. Searching for it is the point at this stage; the
 * method that finds it without searching arrives on the next slide, and the reveal is where
 * that method is stated for a learner who cannot find the value by hand.
 *
 * No arithmetic is printed while the search runs. Showing the right pan's running total would
 * turn the tilt into decoration, because the learner would compare two numbers instead of
 * reading the beam, and the tilt is the only thing on screen that says what an equation IS.
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
  /** How many equal ingots sit on the right pan. */
  ingots: number;
  /** The loose weight beside them. */
  loose: number;
  /** The sealed crate's marked weight, on the left pan. */
  crate: number;
  /** The ingot weight that levels the beam. */
  answer: number;
}

/** Neither board is the CFU's $4x - 5 = x + 16$, and neither repeats the paragraph's numbers. */
const BOARDS: readonly Board[] = [
  { ingots: 4, loose: 6, crate: 30, answer: 6 },
  { ingots: 3, loose: 5, crate: 32, answer: 9 },
];

const MIN = 1;
const MAX = 12;

/** Where the beam's ends sit, and how far it swings. */
const PIVOT_X = 220;
/** High enough that at ±MAX_TILT the raised tip's round cap stays inside the viewBox. */
const PIVOT_Y = 42;
const ARM = 150;
const DROP = 46;
const MAX_TILT = 13;

export function BalanceBeamSlider(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <BalanceBeamSliderBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function BalanceBeamSliderBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [guess, setGuess] = useState(MIN);
  const [moved, setMoved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const right = board.ingots * guess + board.loose;
  const gap = right - board.crate;
  const level = gap === 0;
  const equation = `${board.ingots}x + ${board.loose} = ${board.crate}`;
  const stripped = `${board.ingots}x = ${board.crate - board.loose}`;

  /** Close the round out. `earned` is false when the learner was told the answer. */
  function finish(earned: boolean) {
    if (earned) {
      success();
    }
    if (!solved) {
      setSolved(true);
      onSolved();
    }
  }

  function moveTo(next: number) {
    if (solved) {
      return;
    }
    const clamped = Math.max(MIN, Math.min(MAX, next));
    setGuess(clamped);
    setMoved(true);
    if (board.ingots * clamped + board.loose === board.crate) {
      finish(true);
    }
  }

  function reveal() {
    setGuess(board.answer);
    setRevealed(true);
    finish(false);
  }

  // Clamped so a wild guess still draws a beam rather than a windmill.
  const tilt = level ? 0 : Math.max(-MAX_TILT, Math.min(MAX_TILT, gap * 1.6));
  const leftY = PIVOT_Y + (ARM * Math.sin((tilt * Math.PI) / 180) || 0);
  const rightY = PIVOT_Y - (ARM * Math.sin((tilt * Math.PI) / 180) || 0);
  const beamColour = level ? CIVIC : LINE;
  const valueText = level
    ? `${guess} minas an ingot, and the beam hangs level`
    : `${guess} minas an ingot, and the ${gap > 0 ? "ingot" : "crate"} side hangs low`;

  return (
    <div className="lesson-interactive lesson-interactive--slider">
      <WidgetTask>
        Goal: find the one ingot weight that leaves the beam hanging level, which is the
        weight the balance has already measured without anybody opening the crate.
      </WidgetTask>

      <svg
        viewBox="0 0 440 156"
        role="img"
        aria-label={`A balance with a crate of ${board.crate} minas on the left pan and ${board.ingots} ingots with a loose ${board.loose} mina weight on the right`}
      >
        <title>A balance weighing a sealed crate against ingots</title>

        <SvgMath latex={equation} x={220} y={14} fontSize={16} color={SOFT} w={300} />

        {/* the beam */}
        <line
          x1={PIVOT_X - ARM}
          y1={leftY}
          x2={PIVOT_X + ARM}
          y2={rightY}
          stroke={beamColour}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* the stand */}
        <path
          d={`M ${PIVOT_X} ${PIVOT_Y} L ${PIVOT_X - 16} ${PIVOT_Y + 62} L ${PIVOT_X + 16} ${PIVOT_Y + 62} Z`}
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />

        {/* left pan: the sealed crate */}
        <line
          x1={PIVOT_X - ARM}
          y1={leftY}
          x2={PIVOT_X - ARM}
          y2={leftY + DROP}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <rect
          x={PIVOT_X - ARM - 34}
          y={leftY + DROP}
          width={68}
          height={26}
          rx={3}
          fill="none"
          stroke={LABEL}
          strokeWidth={2}
        />
        {/* `SvgMath`'s y is the label's CENTRE, so it is the rect's centre and not a baseline
            offset: at +18 the digits sat 5 units low in a box 26 tall. */}
        <SvgMath
          latex={String(board.crate)}
          x={PIVOT_X - ARM}
          y={leftY + DROP + 13}
          fontSize={15}
          color={LABEL}
          w={60}
        />

        {/* right pan: the ingots and the loose weight */}
        <line
          x1={PIVOT_X + ARM}
          y1={rightY}
          x2={PIVOT_X + ARM}
          y2={rightY + DROP}
          stroke={LINE}
          strokeWidth={1.5}
        />
        <SvgMath
          latex={`${board.ingots} \\times ${guess} + ${board.loose}`}
          x={PIVOT_X + ARM}
          y={rightY + DROP + 18}
          fontSize={15}
          color={LABEL}
          w={130}
        />
      </svg>

      <div className="lesson-interactive__controls">
        <label className="lesson-interactive__slider-label" htmlFor="balance-beam-guess">
          One ingot weighs
        </label>
        <input
          id="balance-beam-guess"
          className="lesson-interactive__range"
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={guess}
          disabled={solved}
          aria-valuetext={valueText}
          onChange={(event) => moveTo(Number(event.target.value))}
        />
        <span className="lesson-interactive__step-eq">
          <InlineMath latex={`x = ${guess}`} color={level ? CIVIC : LABEL} />
        </span>
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different weighing
        </button>
      ) : null}

      <WidgetReveal
        available={moved && !solved}
        revealed={revealed}
        answer={<InlineMath latex={`x = ${board.answer}`} />}
        why={
          <>
            The beam says <InlineMath latex={equation} />. Taking the loose{" "}
            <InlineMath latex={String(board.loose)} /> off both pans leaves{" "}
            <InlineMath latex={stripped} />, so the{" "}
            <InlineMath latex={String(board.ingots)} /> ingots weigh{" "}
            <InlineMath latex={String(board.crate - board.loose)} /> between them and one of
            them weighs <InlineMath latex={String(board.answer)} />. That is the value the
            search was looking for, reached without any searching.
          </>
        }
        onReveal={reveal}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            Level. <InlineMath latex={`x = ${board.answer}`} /> is the only weight on the
            scale that makes both pans hold the same amount, which is what it means to be
            this equation's solution.
          </>
        ) : gap > 0 ? (
          <span style={{ color: BRICK }}>
            The ingot side hangs low, so an ingot of{" "}
            <InlineMath latex={String(guess)} color={BRICK} /> weighs more than the crate
            allows.
          </span>
        ) : gap < 0 ? (
          <span style={{ color: BRICK }}>
            The crate side hangs low, so an ingot of{" "}
            <InlineMath latex={String(guess)} color={BRICK} /> weighs less than the crate
            allows.
          </span>
        ) : null}
      </p>
    </div>
  );
}
