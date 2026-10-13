/**
 * LIN.5 slide 0: the error is a distance, so it is available on both sides of the standard.
 *
 * The slide defines absolute value and then shifts it to distance from a standard. The thing a
 * learner has to see, rather than be told, is that a stated error picks out TWO weights, and there
 * is nothing to see in a definition. So the learner walks a weight along the graded scale and has
 * to land on both weights whose error is the stated one: the second landing is where "two answers"
 * stops being a rule and becomes an observation about the scale.
 *
 * Reaching a target and stepping off it again is not new progress, so only the first landing on
 * each side counts and the badge does not re-fire.
 */

import { useState } from "react";

import { CIVIC, InlineMath, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import { WidgetReveal } from "../widgetFeedback";
import {
  type LessonWidgetProps,
  useRevealReAsk,
  useWidgetSuccess,
  useWidgetVariants,
} from "../widgetMechanics";
import { WidgetTask } from "../widgetTask";

interface Board {
  /** The graded set's standard, and the error to find. */
  standard: number;
  error: number;
  /** The scale drawn. */
  min: number;
  max: number;
}

/** Neither board is the paragraph's own standard of 60 with an error of 2. */
const BOARDS: readonly Board[] = [
  { standard: 40, error: 3, min: 34, max: 46 },
  { standard: 25, error: 4, min: 18, max: 32 },
];

const LEFT = 44;
const RIGHT = 400;
const AXIS_Y = 80;

export function OffStandardStepper(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);
  return (
    <OffStandardStepperBody
      key={variant.nonce}
      board={board}
      onSolved={variant.latch}
      onRestart={variant.restart}
    />
  );
}

function OffStandardStepperBody({
  board,
  onSolved,
  onRestart,
}: {
  board: Board;
  onSolved: () => void;
  onRestart: () => void;
}) {
  const [at, setAt] = useState(board.standard);
  const [found, setFound] = useState<ReadonlySet<number>>(() => new Set());
  const [moved, setMoved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const success = useWidgetSuccess();
  useRevealReAsk({ reAsk: onRestart, release: onSolved });

  const low = board.standard - board.error;
  const high = board.standard + board.error;
  const error = Math.abs(at - board.standard);
  const onTarget = error === board.error;
  const solved = found.has(low) && found.has(high);
  const scale = (RIGHT - LEFT) / (board.max - board.min);
  const x = (value: number) => LEFT + (value - board.min) * scale;
  const reading = `\\lvert ${at} - ${board.standard} \\rvert = ${error}`;

  function open() {
    if (!gateOpen) {
      setGateOpen(true);
      onSolved();
    }
  }

  function moveTo(next: number) {
    if (solved) {
      return;
    }
    const clamped = Math.max(board.min, Math.min(board.max, next));
    setAt(clamped);
    setMoved(true);
    if (Math.abs(clamped - board.standard) !== board.error || found.has(clamped)) {
      return;
    }
    success();
    const nextFound = new Set(found);
    nextFound.add(clamped);
    setFound(nextFound);
    if (nextFound.has(low) && nextFound.has(high)) {
      open();
    }
  }

  function reveal() {
    setAt(found.has(low) ? high : low);
    setFound(new Set([low, high]));
    setRevealed(true);
    open();
  }

  const ticks: number[] = [];
  for (let value = board.min; value <= board.max; value += 1) {
    ticks.push(value);
  }

  return (
    <div className="lesson-interactive lesson-interactive--stepper">
      <WidgetTask>
        Goal: find every weight in this graded set whose error against the standard is
        exactly {board.error}, and land on each of them.
      </WidgetTask>

      <svg
        viewBox="0 0 440 130"
        role="img"
        aria-label={`A weight scale from ${board.min} to ${board.max} minas with the standard at ${board.standard}, and a weight resting at ${at}`}
      >
        <title>A weight walked along a graded scale, against a standard</title>

        <SvgMath
          latex={`\\lvert w - ${board.standard} \\rvert = ${board.error}`}
          x={220}
          y={20}
          fontSize={16}
          color={SOFT}
          w={220}
        />

        {/* The span from the standard out to where the weight rests: the error itself. */}
        {error > 0 ? (
          <rect
            x={Math.min(x(board.standard), x(at))}
            y={AXIS_Y - 11}
            width={Math.abs(x(at) - x(board.standard))}
            height={22}
            fill={onTarget ? CIVIC : SOFT}
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
              strokeWidth={value === board.standard ? 2.5 : 1.2}
            />
            <text
              x={x(value)}
              y={AXIS_Y + 22}
              textAnchor="middle"
              fontSize={10}
              fill={value === board.standard ? LABEL : SOFT}
              fontWeight={value === board.standard ? 700 : 400}
            >
              {value}
            </text>
          </g>
        ))}

        {/* A found weight keeps a standing mark, so both landings stay on screen at the end. */}
        {[...found].map((value) => (
          <circle
            key={value}
            cx={x(value)}
            cy={AXIS_Y}
            r={7}
            fill="none"
            stroke={CIVIC}
            strokeWidth={2.5}
            strokeDasharray="3 2"
          />
        ))}

        <circle
          cx={x(at)}
          cy={AXIS_Y}
          r={9}
          fill={onTarget ? CIVIC : SIGNAL}
          stroke="var(--paper)"
          strokeWidth={2}
        />
        <text
          x={x(board.standard)}
          y={AXIS_Y - 22}
          textAnchor="middle"
          fontSize={11}
          fill={LABEL}
        >
          standard
        </text>
      </svg>

      <div className="lesson-interactive__controls">
        <button
          type="button"
          className="lesson-interactive__step"
          disabled={solved || at <= board.min}
          aria-label="Take the weight one mina lighter"
          onClick={() => moveTo(at - 1)}
        >
          &#8592; <InlineMath latex="-1" />
        </button>
        <span className="lesson-interactive__step-eq">
          <InlineMath latex={reading} color={onTarget ? CIVIC : LABEL} />
        </span>
        <button
          type="button"
          className="lesson-interactive__step"
          disabled={solved || at >= board.max}
          aria-label="Take the weight one mina heavier"
          onClick={() => moveTo(at + 1)}
        >
          <InlineMath latex="+1" /> &#8594;
        </button>
      </div>

      {solved ? (
        <button type="button" className="lesson-interactive__reset" onClick={onRestart}>
          Start over on a different standard
        </button>
      ) : null}

      <WidgetReveal
        available={moved && !solved}
        revealed={revealed}
        answer={<InlineMath latex={`w = ${low} \\;\\text{ and }\\; w = ${high}`} />}
        why={
          <>
            An error of <InlineMath latex={String(board.error)} /> is a distance, and a
            distance is available on either side of the standard. Going down from{" "}
            <InlineMath latex={String(board.standard)} /> gives{" "}
            <InlineMath latex={String(low)} /> and going up gives{" "}
            <InlineMath latex={String(high)} />, and both of those report the same error
            because the bars throw the direction away.
          </>
        }
        onReveal={reveal}
        /* The passage above states BOTH weights, unconditionally, because the teaching IS the
           two-sidedness: an error is a distance, so it is available on either side of the
           standard, and a reveal that named one side would not be making that point. So
           whatever is outstanding when this is taken has just been given away, and there is
           never a further answer to hand the board back FOR.

           `found.size === 1` said the opposite in the one state where it decides anything: on
           the reveal taken with one weight already landed on, the board was offered back with
           its gate still shut, and taking it back does not resolve — so the learner stepped to
           the value they had just been read out and latched the gate on an answer they were
           given. `widgetMechanics.ts` on `othersRemain` is the rule that forbids it.
           `revealCredit.browser.test.tsx` plays it. */
        othersRemain={false}
      />

      <p
        className="lesson-interactive__status"
        data-state={solved ? "solved" : "prompt"}
        aria-live="polite"
      >
        {revealed ? null : solved ? (
          <>
            Both of them: <InlineMath latex={String(low)} /> and{" "}
            <InlineMath latex={String(high)} /> are each{" "}
            <InlineMath latex={String(board.error)} /> from the standard. One stated error,
            two weights, because the bars report the size of the gap and not its direction.
          </>
        ) : found.size === 1 ? (
          <>
            One found. There is another weight in this set with the same error, on the other
            side of the standard.
          </>
        ) : (
          <>
            Right now the weight rests <InlineMath latex={String(error)} /> from the
            standard. Move it until that error reads{" "}
            <InlineMath latex={String(board.error)} />.
          </>
        )}
      </p>
    </div>
  );
}
